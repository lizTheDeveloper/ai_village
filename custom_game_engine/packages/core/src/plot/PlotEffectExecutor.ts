/**
 * PlotEffectExecutor - Applies plot effects to game state
 *
 * This module handles all effect types defined in PlotTypes, including:
 * - Core effects (items, skills, relationships)
 * - Emotional effects (mood, stress, trauma, breakdown)
 * - Relationship effects with role binding
 */

import type { World, WorldMutator } from '../ecs/World.js';
import type {
  PlotEffect,
  PlotEffectContext,
  PlotLineInstance,
  PlotLinesComponent,
} from './PlotTypes.js';
import { queueDreamHint } from './PlotTypes.js';
import { ComponentType } from '../types/ComponentType.js';
import {
  type MoodComponent,
  type StressState,
  type Trauma,
  applyMoodChange,
  updateMoodFactor,
  createStressState,
} from '../components/MoodComponent.js';
import {
  type RelationshipComponent,
  updateTrust,
  updateAffinity,
} from '../components/RelationshipComponent.js';
import {
  type SkillsComponent,
  type SkillId,
  addSkillXP,
} from '../components/SkillsComponent.js';
import {
  type SoulIdentityComponent,
  addLessonToSoul,
} from '../soul/SoulIdentityComponent.js';
import {
  type InventoryComponent,
  addToInventory,
} from '../components/InventoryComponent.js';
import { getNarrativePressureSystem } from '../narrative/NarrativePressureSystem.js';
import { createOutcomeAttractor } from '../narrative/NarrativePressureTypes.js';

/**
 * Execute a single plot effect
 */
export function executeEffect(
  effect: PlotEffect,
  context: PlotEffectContext
): void {
  const world = context.world as WorldMutator;

  switch (effect.type) {
    // ========================================================================
    // Core Effects
    // ========================================================================
    case 'grant_item': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const inventory = entity.getComponent<InventoryComponent>('inventory');
      if (!inventory) {
        console.warn(`[PlotEffect] Entity ${context.entityId} has no inventory`);
        break;
      }

      try {
        const { inventory: updated } = addToInventory(inventory, effect.item_id, effect.quantity ?? 1);
        world.addComponent(context.entityId, updated);
      } catch (err) {
        console.warn(`[PlotEffect] Failed to grant item: ${(err as Error).message}`);
      }
      break;
    }

    case 'grant_skill_xp': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const skills = entity.getComponent<SkillsComponent>('skills');
      if (!skills) {
        console.warn(`[PlotEffect] Entity ${context.entityId} has no skills`);
        break;
      }

      const skillId = effect.skill as SkillId;
      const { component: updated } = addSkillXP(skills, skillId, effect.xp);
      world.addComponent(context.entityId, updated);

      break;
    }

    case 'modify_relationship': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const relationship = entity.getComponent<RelationshipComponent>('relationship');
      if (!relationship) break;

      const updated = updateTrust(relationship, effect.agent_id, effect.trust_delta);
      world.addComponent(context.entityId, updated);
      break;
    }

    case 'learn_lesson': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const soul = entity.getComponent<SoulIdentityComponent>('soul_identity');
      if (!soul) {
        console.warn(`[PlotEffect] Entity ${context.entityId} has no soul_identity`);
        break;
      }

      // Add the lesson to the soul's permanent record
      // Note: learn_lesson only has lesson_id - defaults used for other fields
      addLessonToSoul(soul, {
        lesson_id: effect.lesson_id,
        personal_tick: context.personalTick,
        universe_id: context.universeId,
        incarnation: 0, // Would need to be retrieved from SoulLink
        wisdom_gained: 1, // Default wisdom gain
        domain: 'self', // Default domain
        insight: `Learned: ${effect.lesson_id}`,
        plot_source: context.plot.template_id,
      });

      // Note: addLessonToSoul mutates in place, so we need to update the component
      world.addComponent(context.entityId, soul);
      break;
    }

    case 'spawn_attractor': {
      // Get the narrative pressure system
      const narrativePressure = getNarrativePressureSystem();

      // Extract attractor parameters from effect.details
      const {
        goal,
        strength = 0.5,
        urgency = 0.5,
        scope,
        decay,
        description,
      } = effect.details;

      if (!goal || !goal.type) {
        console.warn('[PlotEffect] spawn_attractor missing required goal parameter');
        break;
      }

      // Create the attractor with plot source
      const attractor = createOutcomeAttractor({
        id: effect.attractor_id,
        source: {
          type: 'plot',
          plotInstanceId: context.plot.instance_id,
          stageId: context.plot.current_stage,
        },
        goal: goal,
        strength: strength,
        urgency: urgency,
        scope: scope ?? { type: 'entity', entityId: context.entityId },
        decay: decay ?? { type: 'stage_exit' },
        description: description,
        createdAt: context.personalTick,
      });

      // Add to narrative pressure system
      narrativePressure.addAttractor(attractor);

      break;
    }

    case 'queue_event': {
      // Event queueing - log for now until EventQueue system is implemented
      // TODO: Hook into EventQueue when available
      // eventQueue.enqueue({ type: effect.event_type, data: effect.event_data, delay: effect.delay_ticks });
      break;
    }

    case 'custom': {
      effect.apply(context);
      break;
    }

    // ========================================================================
    // Emotional Effects
    // ========================================================================
    case 'modify_mood': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      const updated = applyMoodChange(mood, effect.delta, context.personalTick);
      world.addComponent(context.entityId, updated);
      break;
    }

    case 'modify_mood_factor': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      const currentValue = mood.factors[effect.factor];
      const newValue = Math.max(-100, Math.min(100, currentValue + effect.delta));
      const updated = updateMoodFactor(mood, effect.factor, newValue);
      world.addComponent(context.entityId, updated);
      break;
    }

    case 'add_trauma': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      // Ensure stress state exists
      const stress: StressState = mood.stress ?? createStressState();

      // Create trauma
      const trauma: Trauma = {
        id: `trauma_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: effect.trauma_type,
        severity: effect.severity ?? 0.5,
        timestamp: context.personalTick,
        resolved: false,
        description: effect.description,
      };

      // Add trauma and increase stress
      const stressIncrease = trauma.severity * 20; // Severity 1.0 = +20 stress
      const updatedStress: StressState = {
        ...stress,
        recentTraumas: [...stress.recentTraumas, trauma],
        level: Math.min(100, stress.level + stressIncrease),
      };

      const updatedMood: MoodComponent = {
        ...mood,
        stress: updatedStress,
      };

      world.addComponent(context.entityId, updatedMood);
      break;
    }

    case 'modify_stress': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      const stress: StressState = mood.stress ?? createStressState();
      const updatedStress: StressState = {
        ...stress,
        level: Math.max(0, Math.min(100, stress.level + effect.delta)),
      };

      const updatedMood: MoodComponent = {
        ...mood,
        stress: updatedStress,
      };

      world.addComponent(context.entityId, updatedMood);
      break;
    }

    case 'trigger_breakdown': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      const stress: StressState = mood.stress ?? createStressState();
      const updatedStress: StressState = {
        ...stress,
        inBreakdown: true,
        breakdownType: effect.breakdown_type,
        breakdownStartedAt: context.personalTick,
        totalBreakdowns: stress.totalBreakdowns + 1,
      };

      // Map breakdown type to emotional state
      const breakdownEmotions: Record<string, MoodComponent['emotionalState']> = {
        tantrum: 'enraged',
        berserk: 'enraged',
        catatonic: 'despairing',
        depression: 'despairing',
        strange_mood: 'obsessed',
        panic_attack: 'terrified',
      };

      const updatedMood: MoodComponent = {
        ...mood,
        stress: updatedStress,
        emotionalState: breakdownEmotions[effect.breakdown_type] ?? 'despairing',
      };

      world.addComponent(context.entityId, updatedMood);
      break;
    }

    case 'set_emotional_state': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent<MoodComponent>('mood');
      if (!mood) break;

      // Note: duration_ticks would need to be tracked separately
      // For now, just set the state immediately
      const updatedMood: MoodComponent = {
        ...mood,
        emotionalState: effect.state,
      };

      world.addComponent(context.entityId, updatedMood);

      // TODO: Store duration and reset after duration_ticks
      // This would require a separate system to track temporary states
      break;
    }

    // ========================================================================
    // Relationship Effects with Role Binding
    // ========================================================================
    case 'modify_relationship_by_role': {
      const targetId = context.boundAgents[effect.role];
      if (!targetId) {
        console.warn(`[PlotEffect] Role '${effect.role}' not bound`);
        break;
      }

      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      let relationship = entity.getComponent<RelationshipComponent>('relationship');
      if (!relationship) break;

      if (effect.trust_delta !== undefined) {
        relationship = updateTrust(relationship, targetId, effect.trust_delta);
      }

      if (effect.affinity_delta !== undefined) {
        relationship = updateAffinity(relationship, targetId, effect.affinity_delta);
      }

      world.addComponent(context.entityId, relationship);
      break;
    }

    case 'bind_relationship': {
      // Bind a new agent to a role in the plot instance
      // This modifies the plot instance, not the entity
      context.plot.bound_agents[effect.role] = effect.agent_id;

      // Optionally create/update relationship
      if (effect.initial_trust !== undefined || effect.initial_affinity !== undefined) {
        const entity = world.getEntity(context.entityId);
        if (!entity) break;

        let relationship = entity.getComponent<RelationshipComponent>('relationship');
        if (!relationship) break;

        if (effect.initial_trust !== undefined) {
          relationship = updateTrust(relationship, effect.agent_id, effect.initial_trust);
        }
        if (effect.initial_affinity !== undefined) {
          relationship = updateAffinity(relationship, effect.agent_id, effect.initial_affinity);
        }

        world.addComponent(context.entityId, relationship);
      }
      break;
    }

    // ========================================================================
    // Dream Effects (Phase 5)
    // ========================================================================
    case 'queue_dream_hint': {
      // Get the soul entity that owns the plot
      // The plot is on the soul, so we need to find the soul by soul_id
      const soulEntity = world.getEntity(context.plot.soul_id);
      if (!soulEntity) {
        console.warn(`[PlotEffect] Soul ${context.plot.soul_id} not found for dream hint`);
        break;
      }

      const plotLines = soulEntity.getComponent<PlotLinesComponent>(ComponentType.PlotLines);
      if (!plotLines) {
        console.warn(`[PlotEffect] Soul ${context.plot.soul_id} has no PlotLines component`);
        break;
      }

      queueDreamHint(plotLines, {
        plot_instance_id: context.plot.instance_id,
        from_stage_id: context.plot.current_stage,
        dream_type: effect.dream_type,
        content_hint: effect.content_hint,
        intensity: effect.intensity ?? 0.5,
        queued_at: context.personalTick,
        imagery: effect.imagery,
        emotional_tone: effect.emotional_tone,
      });
      break;
    }

    case 'prophetic_dream': {
      // High-priority dream - queue with high intensity based on urgency
      const soulEntity = world.getEntity(context.plot.soul_id);
      if (!soulEntity) {
        console.warn(`[PlotEffect] Soul ${context.plot.soul_id} not found for prophetic dream`);
        break;
      }

      const plotLines = soulEntity.getComponent<PlotLinesComponent>(ComponentType.PlotLines);
      if (!plotLines) {
        console.warn(`[PlotEffect] Soul ${context.plot.soul_id} has no PlotLines component`);
        break;
      }

      // Map urgency to intensity
      const urgencyIntensity: Record<string, number> = {
        low: 0.4,
        medium: 0.6,
        high: 0.8,
        critical: 1.0,
      };

      queueDreamHint(plotLines, {
        plot_instance_id: context.plot.instance_id,
        from_stage_id: context.plot.current_stage,
        dream_type: 'prophetic_vision',
        content_hint: effect.vision_content,
        intensity: urgencyIntensity[effect.urgency] ?? 0.6,
        queued_at: context.personalTick,
        imagery: effect.imagery,
        emotional_tone: effect.urgency === 'critical' ? 'ominous' : 'mysterious',
      });

      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = effect;
      console.warn(`[PlotEffect] Unknown effect type: ${(_exhaustive as PlotEffect).type}`);
    }
  }
}

/**
 * Execute all effects in order
 */
export function executeEffects(
  effects: PlotEffect[],
  context: PlotEffectContext
): void {
  for (const effect of effects) {
    try {
      executeEffect(effect, context);
    } catch (error) {
      console.error(`[PlotEffect] Error executing effect:`, effect, error);
    }
  }
}

/**
 * Create an effect context for execution
 */
export function createEffectContext(
  entityId: string,
  plot: PlotLineInstance,
  personalTick: number,
  universeId: string,
  world: World
): PlotEffectContext {
  return {
    entityId,
    personalTick,
    universeId,
    boundAgents: plot.bound_agents,
    plot,
    world,
  };
}

/**
 * Capture relationship snapshot for change detection
 */
export function captureRelationshipSnapshot(
  plot: PlotLineInstance,
  entityId: string,
  role: string,
  personalTick: number,
  world: World
): void {
  const targetId = plot.bound_agents[role];
  if (!targetId) return;

  const entity = world.getEntity(entityId);
  if (!entity) return;

  const relationship = entity.getComponent<RelationshipComponent>('relationship');
  if (!relationship) return;

  const rel = relationship.relationships.get(targetId);
  if (!rel) return;

  // Initialize snapshots if needed
  if (!plot.relationship_snapshots) {
    plot.relationship_snapshots = {};
  }

  plot.relationship_snapshots[role] = {
    trust: rel.trust,
    affinity: rel.affinity,
    captured_at_tick: personalTick,
  };
}

/**
 * Capture all bound agent relationships
 */
export function captureAllRelationshipSnapshots(
  plot: PlotLineInstance,
  entityId: string,
  personalTick: number,
  world: World
): void {
  for (const role of Object.keys(plot.bound_agents)) {
    captureRelationshipSnapshot(plot, entityId, role, personalTick, world);
  }
}
