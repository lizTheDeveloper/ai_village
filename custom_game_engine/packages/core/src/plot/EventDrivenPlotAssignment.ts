/**
 * EventDrivenPlotAssignment - Automatically assigns plots based on game state
 *
 * Phase 2 of the Plot System: Makes plots trigger automatically when
 * entities experience trauma, relationship changes, breakdowns, etc.
 *
 * Uses condition-based checking with cooldowns instead of per-tick snapshots.
 * Runs infrequently (every ~10 real seconds) since emotional changes are slow.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type {
  PlotTrigger,
  PlotTriggerEvent,
  TriggerAgentBinding,
  PlotLineTemplate,
  PlotLineInstance,
  PlotLinesComponent,
} from './PlotTypes.js';
import { plotLineRegistry } from './PlotLineRegistry.js';
import type { MoodComponent, Trauma } from '../components/MoodComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';

/**
 * Track cooldowns per trigger condition per soul
 */
interface ConditionCooldown {
  condition_key: string; // e.g., "on_breakdown:tantrum:soul_123"
  last_triggered_tick: number;
}

/**
 * Lightweight relationship baseline for change detection
 * Only stores agent IDs and trust - not full relationship data
 */
interface RelationshipBaseline {
  /** Map of known agent IDs to their trust value at last check */
  knownAgents: Map<string, number>;
  /** Tick when baseline was captured */
  capturedAt: number;
}

/**
 * Recent death event for on_death_nearby trigger
 */
interface RecentDeath {
  deceasedId: string;
  deceasedSoulId?: string;
  position: { x: number; y: number };
  tick: number;
}

/**
 * EventDrivenPlotAssignmentSystem
 *
 * Checks entity conditions and assigns plots when triggers match.
 * Uses cooldowns to prevent re-triggering the same condition.
 */
export class EventDrivenPlotAssignmentSystem extends BaseSystem {
  public readonly id: SystemId = 'event_driven_plot_assignment';
  public readonly priority: number = 150; // After mood/relationship systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  /** Run every 200 ticks = 10 seconds real time at 20 TPS */
  protected readonly throttleInterval = 200;

  /** Default cooldown between same trigger = 1000 ticks (50 sec) */
  private static readonly DEFAULT_COOLDOWN = 1000;

  /** How long to keep death events for nearby death detection */
  private static readonly DEATH_RETENTION_TICKS = 400;

  /** Distance in tiles for "nearby" death detection */
  private static readonly NEARBY_DEATH_DISTANCE = 10;

  private conditionCooldowns: Map<string, ConditionCooldown> = new Map();

  /** Relationship baselines by entity ID for change detection */
  private relationshipBaselines: Map<string, RelationshipBaseline> = new Map();

  /** Recent deaths for on_death_nearby trigger */
  private recentDeaths: RecentDeath[] = [];

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Subscribe to death events for on_death_nearby trigger
    // Using onGeneric since the event data structure differs from GameEventMap
    this.events.onGeneric('agent:died', (data) => {
      const deathData = data as {
        entityId: string;
        soulId?: string;
        position?: { x: number; y: number };
        tick?: number;
      };
      if (deathData.position) {
        this.recentDeaths.push({
          deceasedId: deathData.entityId,
          deceasedSoulId: deathData.soulId,
          position: deathData.position,
          tick: deathData.tick ?? 0,
        });
      }
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const currentTick = ctx.tick;

    // Get all templates with triggers (cached if registry hasn't changed)
    const templatesWithTriggers = plotLineRegistry.getAllTemplates()
      .filter(t => t.assignment_rules?.triggers && t.assignment_rules.triggers.length > 0);

    if (templatesWithTriggers.length === 0) {
      return; // No trigger-based templates registered
    }

    // Find agents with PlotLines component
    const agentsWithPlotLines = ctx.activeEntities.filter(e =>
      e.components.has(CT.Agent) &&
      e.components.has(CT.PlotLines) &&
      e.components.has(CT.SoulIdentity)
    );

    const worldMutator = world as WorldMutator;

    // Check each agent's current conditions
    for (const entity of agentsWithPlotLines) {
      const soul = entity.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
      if (!soul) continue;

      const soulId = soul.true_name ?? entity.id;

      // Check each template's triggers against current entity state
      for (const template of templatesWithTriggers) {
        this._checkTemplateTriggersForEntity(
          worldMutator,
          entity,
          soulId,
          template,
          currentTick
        );
      }
    }

    // Periodic cleanup of old cooldowns (every 10 updates = ~100 seconds)
    if (currentTick % (this.throttleInterval * 10) === 0) {
      this._cleanupOldCooldowns(currentTick);
    }
  }

  /**
   * Check if entity currently matches any of the template's triggers
   */
  private _checkTemplateTriggersForEntity(
    world: WorldMutator,
    entity: Entity,
    soulId: string,
    template: PlotLineTemplate,
    currentTick: number
  ): void {
    const triggers = template.assignment_rules?.triggers;
    if (!triggers) return;

    const mood = entity.getComponent(CT.Mood) as MoodComponent | undefined;
    const relationship = entity.getComponent(CT.Relationship) as RelationshipComponent | undefined;
    const skills = entity.getComponent(CT.Skills) as SkillsComponent | undefined;
    const position = entity.getComponent(CT.Position) as { x: number; y: number } | undefined;

    for (const trigger of triggers) {
      const triggerEvent = this._evaluateTrigger(
        entity,
        soulId,
        trigger,
        mood,
        relationship,
        skills,
        position,
        currentTick
      );

      if (triggerEvent) {
        // Check cooldown for this specific condition
        const cooldownKey = this._buildCooldownKey(trigger, soulId, triggerEvent);
        if (this._isOnCooldown(cooldownKey, template, currentTick)) {
          continue;
        }

        // Attempt to assign the plot
        if (this._attemptAssignment(world, triggerEvent, template, currentTick)) {
          // Assignment successful - set cooldown
          this.conditionCooldowns.set(cooldownKey, {
            condition_key: cooldownKey,
            last_triggered_tick: currentTick,
          });
        }
      }
    }
  }

  /**
   * Evaluate if a trigger condition is currently met
   * Returns a trigger event if condition matches, undefined otherwise
   */
  private _evaluateTrigger(
    entity: Entity,
    soulId: string,
    trigger: PlotTrigger,
    mood: MoodComponent | undefined,
    relationship: RelationshipComponent | undefined,
    skills: SkillsComponent | undefined,
    position: { x: number; y: number } | undefined,
    currentTick: number
  ): PlotTriggerEvent | undefined {
    switch (trigger.type) {
      case 'on_breakdown': {
        if (!mood?.stress?.inBreakdown) return undefined;
        const breakdownType = mood.stress.breakdownType;
        if (trigger.breakdown_type && breakdownType !== trigger.breakdown_type) {
          return undefined;
        }
        return {
          trigger_type: 'on_breakdown',
          entity_id: entity.id,
          soul_id: soulId,
          personal_tick: currentTick,
          data: { breakdown_type: breakdownType },
        };
      }

      case 'on_trauma': {
        if (!mood?.stress?.recentTraumas) return undefined;
        // Check for traumas in the last throttleInterval * 2 ticks
        const recentWindow = this.throttleInterval * 2;
        const recentTraumas = mood.stress.recentTraumas.filter(
          (t: Trauma) => currentTick - t.timestamp < recentWindow
        );
        if (recentTraumas.length === 0) return undefined;
        // Find matching trauma type if specified
        const matchingTrauma = trigger.trauma_type
          ? recentTraumas.find((t: Trauma) => t.type === trigger.trauma_type)
          : recentTraumas[0];
        if (!matchingTrauma) return undefined;
        return {
          trigger_type: 'on_trauma',
          entity_id: entity.id,
          soul_id: soulId,
          personal_tick: currentTick,
          involved_agent_id: matchingTrauma.relatedEntityId,
          data: {
            trauma_type: matchingTrauma.type,
            severity: matchingTrauma.severity,
          },
        };
      }

      case 'on_emotional_state': {
        if (!mood?.emotionalState) return undefined;
        if (mood.emotionalState !== trigger.state) return undefined;
        // TODO: Track duration for min_duration_ticks check
        return {
          trigger_type: 'on_emotional_state',
          entity_id: entity.id,
          soul_id: soulId,
          personal_tick: currentTick,
          data: { state: mood.emotionalState },
        };
      }

      case 'on_mood_threshold': {
        if (mood?.currentMood === undefined) return undefined;
        const current = mood.currentMood;
        if (trigger.min !== undefined && current < trigger.min) return undefined;
        if (trigger.max !== undefined && current > trigger.max) return undefined;
        // At least one bound must be specified
        if (trigger.min === undefined && trigger.max === undefined) return undefined;
        return {
          trigger_type: 'on_mood_threshold',
          entity_id: entity.id,
          soul_id: soulId,
          personal_tick: currentTick,
          data: { current_mood: current },
        };
      }

      case 'on_stress_threshold': {
        if (mood?.stress?.level === undefined) return undefined;
        const current = mood.stress.level;
        if (trigger.min !== undefined && current < trigger.min) return undefined;
        if (trigger.max !== undefined && current > trigger.max) return undefined;
        if (trigger.min === undefined && trigger.max === undefined) return undefined;
        return {
          trigger_type: 'on_stress_threshold',
          entity_id: entity.id,
          soul_id: soulId,
          personal_tick: currentTick,
          data: { current_stress: current },
        };
      }

      case 'on_relationship_change': {
        if (!relationship) return undefined;
        // Get or create baseline for this entity
        let baseline = this.relationshipBaselines.get(entity.id);
        if (!baseline) {
          // First time seeing this entity - create baseline
          baseline = {
            knownAgents: new Map(),
            capturedAt: currentTick,
          };
          for (const [agentId, rel] of relationship.relationships) {
            baseline.knownAgents.set(agentId, rel.trust);
          }
          this.relationshipBaselines.set(entity.id, baseline);
          return undefined; // No change on first observation
        }
        // Check for significant trust changes
        for (const [agentId, rel] of relationship.relationships) {
          const previousTrust = baseline.knownAgents.get(agentId);
          if (previousTrust !== undefined) {
            const delta = rel.trust - previousTrust;
            if (Math.abs(delta) >= Math.abs(trigger.delta_threshold)) {
              // Direction check
              if ((trigger.delta_threshold > 0 && delta > 0) ||
                  (trigger.delta_threshold < 0 && delta < 0)) {
                // Update baseline
                baseline.knownAgents.set(agentId, rel.trust);
                baseline.capturedAt = currentTick;
                return {
                  trigger_type: 'on_relationship_change',
                  entity_id: entity.id,
                  soul_id: soulId,
                  personal_tick: currentTick,
                  involved_agent_id: agentId,
                  data: {
                    delta,
                    old_trust: previousTrust,
                    new_trust: rel.trust,
                  },
                };
              }
            }
          }
        }
        // Update baseline with current values
        for (const [agentId, rel] of relationship.relationships) {
          baseline.knownAgents.set(agentId, rel.trust);
        }
        baseline.capturedAt = currentTick;
        return undefined;
      }

      case 'on_relationship_formed': {
        if (!relationship) return undefined;
        // Get or create baseline for this entity
        let baseline = this.relationshipBaselines.get(entity.id);
        if (!baseline) {
          baseline = {
            knownAgents: new Map(),
            capturedAt: currentTick,
          };
          for (const [agentId, rel] of relationship.relationships) {
            baseline.knownAgents.set(agentId, rel.trust);
          }
          this.relationshipBaselines.set(entity.id, baseline);
          return undefined;
        }
        // Check for new relationships
        for (const [agentId, rel] of relationship.relationships) {
          if (!baseline.knownAgents.has(agentId)) {
            // New relationship found
            if (trigger.min_initial_trust === undefined ||
                rel.trust >= trigger.min_initial_trust) {
              baseline.knownAgents.set(agentId, rel.trust);
              baseline.capturedAt = currentTick;
              return {
                trigger_type: 'on_relationship_formed',
                entity_id: entity.id,
                soul_id: soulId,
                personal_tick: currentTick,
                involved_agent_id: agentId,
                data: {
                  initial_trust: rel.trust,
                  initial_affinity: rel.affinity,
                },
              };
            }
          }
        }
        return undefined;
      }

      case 'on_death_nearby': {
        if (!position) return undefined;
        if (!relationship) return undefined;
        // Clean old deaths
        this.recentDeaths = this.recentDeaths.filter(
          d => currentTick - d.tick < EventDrivenPlotAssignmentSystem.DEATH_RETENTION_TICKS
        );
        // Check for nearby deaths
        for (const death of this.recentDeaths) {
          const dx = death.position.x - position.x;
          const dy = death.position.y - position.y;
          const distSq = dx * dx + dy * dy;
          const maxDistSq = EventDrivenPlotAssignmentSystem.NEARBY_DEATH_DISTANCE ** 2;
          if (distSq <= maxDistSq) {
            // Check relationship trust if required
            if (trigger.min_relationship_trust !== undefined) {
              const rel = relationship.relationships.get(death.deceasedId);
              if (!rel || rel.trust < trigger.min_relationship_trust) {
                continue; // Didn't know them well enough
              }
            }
            return {
              trigger_type: 'on_death_nearby',
              entity_id: entity.id,
              soul_id: soulId,
              personal_tick: currentTick,
              involved_agent_id: death.deceasedId,
              involved_soul_id: death.deceasedSoulId,
              data: {
                distance: Math.sqrt(distSq),
                relationship_trust: relationship.relationships.get(death.deceasedId)?.trust,
              },
            };
          }
        }
        return undefined;
      }

      case 'on_skill_mastery': {
        if (!skills) return undefined;
        const skillId = trigger.skill as SkillId;
        const currentLevel = skills.levels[skillId];
        if (currentLevel === undefined) return undefined;
        if (currentLevel >= trigger.min_level) {
          return {
            trigger_type: 'on_skill_mastery',
            entity_id: entity.id,
            soul_id: soulId,
            personal_tick: currentTick,
            data: {
              skill: trigger.skill,
              level: currentLevel,
            },
          };
        }
        return undefined;
      }

      case 'on_social_isolation': {
        // Check if entity has no/few relationships
        if (!relationship || relationship.relationships.size === 0) {
          return {
            trigger_type: 'on_social_isolation',
            entity_id: entity.id,
            soul_id: soulId,
            personal_tick: currentTick,
            data: { relationship_count: 0 },
          };
        }
        return undefined;
      }

      default:
        return undefined;
    }
  }

  /**
   * Build a unique key for cooldown tracking
   */
  private _buildCooldownKey(
    trigger: PlotTrigger,
    soulId: string,
    event: PlotTriggerEvent
  ): string {
    // Include relevant event data to differentiate conditions
    switch (trigger.type) {
      case 'on_breakdown':
        return `breakdown:${event.data.breakdown_type}:${soulId}`;
      case 'on_trauma':
        return `trauma:${event.data.trauma_type}:${soulId}`;
      case 'on_emotional_state':
        return `emotional:${event.data.state}:${soulId}`;
      case 'on_mood_threshold':
        return `mood:${trigger.min ?? 'none'}_${trigger.max ?? 'none'}:${soulId}`;
      case 'on_stress_threshold':
        return `stress:${trigger.min ?? 'none'}_${trigger.max ?? 'none'}:${soulId}`;
      case 'on_social_isolation':
        return `isolation:${soulId}`;
      case 'on_skill_mastery':
        return `skill:${trigger.skill}:${trigger.min_level}:${soulId}`;
      case 'on_relationship_change':
        return `rel_change:${event.involved_agent_id}:${soulId}`;
      case 'on_relationship_formed':
        return `rel_formed:${event.involved_agent_id}:${soulId}`;
      case 'on_death_nearby':
        return `death_nearby:${event.involved_agent_id}:${soulId}`;
      case 'on_major_loss':
        return `major_loss:${soulId}`;
      default: {
        // Exhaustiveness check - should never reach here
        const exhaustiveCheck: never = trigger;
        throw new Error(`Unhandled trigger type: ${(exhaustiveCheck as PlotTrigger).type}`);
      }
    }
  }

  /**
   * Check if a condition is on cooldown
   */
  private _isOnCooldown(
    cooldownKey: string,
    template: PlotLineTemplate,
    currentTick: number
  ): boolean {
    const cooldown = this.conditionCooldowns.get(cooldownKey);
    if (!cooldown) return false;

    const cooldownTicks = template.assignment_rules?.cooldown_ticks
      ?? EventDrivenPlotAssignmentSystem.DEFAULT_COOLDOWN;
    return currentTick - cooldown.last_triggered_tick < cooldownTicks;
  }

  /**
   * Attempt to assign a plot based on a trigger event
   * Returns true if assignment succeeded
   */
  private _attemptAssignment(
    world: WorldMutator,
    event: PlotTriggerEvent,
    template: PlotLineTemplate,
    currentTick: number
  ): boolean {
    const entity = world.getEntity(event.entity_id);
    if (!entity) return false;

    const plotLines = entity.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;
    if (!plotLines) return false;

    // Check max concurrent
    const maxConcurrent = template.assignment_rules?.max_concurrent ?? 1;
    const activeCount = plotLines.active.filter(p => p.template_id === template.id).length;
    if (activeCount >= maxConcurrent) {
      return false;
    }

    // Check standard assignment rules
    if (!this._checkAssignmentRules(entity, template)) {
      return false;
    }

    // Build agent bindings
    const boundAgents = this._buildAgentBindings(
      world,
      event,
      template.assignment_rules?.trigger_bindings ?? []
    );

    // Create the instance
    const instance: PlotLineInstance = {
      instance_id: `plot_${template.id}_${event.soul_id}_${Date.now()}`,
      template_id: template.id,
      soul_id: event.soul_id,
      assigned_at_personal_tick: currentTick,
      status: 'active',
      current_stage: template.entry_stage,
      stage_entered_at: currentTick,
      stages_visited: [],
      parameters: { ...template.parameters },
      bound_agents: boundAgents,
      triggered_by: {
        trigger_type: event.trigger_type,
        event_tick: event.personal_tick,
        involved_agent_id: event.involved_agent_id,
        involved_soul_id: event.involved_soul_id,
      },
    };

    // Add to active plots
    const updatedPlotLines: PlotLinesComponent = {
      ...plotLines,
      active: [...plotLines.active, instance],
    };
    world.addComponent(event.entity_id, updatedPlotLines);

    return true;
  }

  /**
   * Check if entity meets template's standard assignment rules
   */
  private _checkAssignmentRules(entity: Entity, template: PlotLineTemplate): boolean {
    const rules = template.assignment_rules;
    if (!rules) return true;

    const soul = entity.getComponent(CT.SoulIdentity) as SoulIdentityComponent | undefined;
    if (!soul) return false;

    // Check wisdom requirement
    if (rules.min_wisdom !== undefined) {
      if (soul.wisdom_level < rules.min_wisdom) {
        return false;
      }
    }

    // Check archetype requirement
    if (rules.required_archetype && rules.required_archetype.length > 0) {
      if (!rules.required_archetype.includes(soul.archetype)) {
        return false;
      }
    }

    // Check interests
    if (rules.required_interests && rules.required_interests.length > 0) {
      const hasInterest = rules.required_interests.some(i =>
        soul.core_interests.includes(i)
      );
      if (!hasInterest) {
        return false;
      }
    }

    // Check forbidden lessons
    if (rules.forbidden_if_learned && rules.forbidden_if_learned.length > 0) {
      const plotLines = entity.getComponent(CT.PlotLines) as PlotLinesComponent | undefined;
      if (plotLines) {
        const learnedLessons = plotLines.completed
          .filter(p => p.lesson_learned)
          .map(p => p.template_id);
        const hasForbidden = rules.forbidden_if_learned.some(l =>
          learnedLessons.includes(l)
        );
        if (hasForbidden) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Build agent bindings based on trigger event and binding rules
   */
  private _buildAgentBindings(
    world: World,
    event: PlotTriggerEvent,
    bindings: TriggerAgentBinding[]
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const binding of bindings) {
      let agentId: string | undefined;

      switch (binding.source) {
        case 'trigger_target':
          agentId = event.involved_agent_id;
          break;

        case 'highest_trust':
          agentId = this._findRelationshipAgent(world, event.entity_id, 'highest_trust');
          break;

        case 'lowest_trust':
          agentId = this._findRelationshipAgent(world, event.entity_id, 'lowest_trust');
          break;

        case 'highest_affinity':
          agentId = this._findRelationshipAgent(world, event.entity_id, 'highest_affinity');
          break;

        case 'random_known':
          agentId = this._findRelationshipAgent(world, event.entity_id, 'random');
          break;
      }

      if (agentId) {
        result[binding.role] = agentId;
      }
    }

    return result;
  }

  /**
   * Find an agent based on relationship criteria
   */
  private _findRelationshipAgent(
    world: World,
    entityId: string,
    criteria: 'highest_trust' | 'lowest_trust' | 'highest_affinity' | 'random'
  ): string | undefined {
    const entity = world.getEntity(entityId);
    if (!entity) return undefined;

    const relationship = entity.getComponent(CT.Relationship) as RelationshipComponent | undefined;
    if (!relationship || relationship.relationships.size === 0) return undefined;

    const entries = Array.from(relationship.relationships.entries());

    switch (criteria) {
      case 'highest_trust': {
        let best = entries[0];
        for (const entry of entries) {
          if (entry[1].trust > best![1].trust) {
            best = entry;
          }
        }
        return best?.[0];
      }

      case 'lowest_trust': {
        let worst = entries[0];
        for (const entry of entries) {
          if (entry[1].trust < worst![1].trust) {
            worst = entry;
          }
        }
        return worst?.[0];
      }

      case 'highest_affinity': {
        let best = entries[0];
        for (const entry of entries) {
          if (entry[1].affinity > best![1].affinity) {
            best = entry;
          }
        }
        return best?.[0];
      }

      case 'random': {
        const index = Math.floor(Math.random() * entries.length);
        return entries[index]?.[0];
      }
    }
  }

  /**
   * Remove cooldowns older than 10x the default cooldown
   */
  private _cleanupOldCooldowns(currentTick: number): void {
    const maxAge = EventDrivenPlotAssignmentSystem.DEFAULT_COOLDOWN * 10;
    for (const [key, cooldown] of this.conditionCooldowns) {
      if (currentTick - cooldown.last_triggered_tick > maxAge) {
        this.conditionCooldowns.delete(key);
      }
    }
  }

  /**
   * Cleanup on system destruction
   */
  protected onCleanup(): void {
    this.conditionCooldowns.clear();
    this.relationshipBaselines.clear();
    this.recentDeaths = [];
  }
}

/**
 * Create a trigger event manually (for testing or external use)
 */
export function createPlotTriggerEvent(params: {
  trigger_type: PlotTrigger['type'];
  entity_id: string;
  soul_id: string;
  personal_tick: number;
  involved_agent_id?: string;
  involved_soul_id?: string;
  data: Record<string, unknown>;
}): PlotTriggerEvent {
  return params;
}

/**
 * Helper to check if a template has triggers
 */
export function templateHasTriggers(template: PlotLineTemplate): boolean {
  return (template.assignment_rules?.triggers?.length ?? 0) > 0;
}

/**
 * Get all templates that could trigger on a specific event type
 */
export function getTriggeredTemplates(
  triggerType: PlotTrigger['type']
): PlotLineTemplate[] {
  return plotLineRegistry.getAllTemplates().filter(t => {
    const triggers = t.assignment_rules?.triggers ?? [];
    return triggers.some(trigger => trigger.type === triggerType);
  });
}
