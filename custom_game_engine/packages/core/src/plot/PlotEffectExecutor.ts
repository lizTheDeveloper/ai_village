/**
 * PlotEffectExecutor - Applies plot effects to game state
 *
 * This module handles all effect types defined in PlotTypes, including:
 * - Core effects (items, skills, relationships)
 * - Emotional effects (mood, stress, trauma, breakdown)
 * - Relationship effects with role binding
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type {
  PlotEffect,
  PlotEffectContext,
  PlotLineInstance,
} from './PlotTypes.js';
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

/**
 * Execute a single plot effect
 */
export function executeEffect(
  effect: PlotEffect,
  context: PlotEffectContext
): void {
  const world = context.world as World;

  switch (effect.type) {
    // ========================================================================
    // Core Effects
    // ========================================================================
    case 'grant_item': {
      // TODO: Hook into InventoryComponent
      console.log(`[PlotEffect] Would grant ${effect.quantity}x ${effect.item_id}`);
      break;
    }

    case 'grant_skill_xp': {
      // TODO: Hook into SkillsComponent
      console.log(`[PlotEffect] Would grant ${effect.xp} XP to ${effect.skill}`);
      break;
    }

    case 'modify_relationship': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const relationship = entity.getComponent('relationship') as RelationshipComponent | undefined;
      if (!relationship) break;

      const updated = updateTrust(relationship, effect.agent_id, effect.trust_delta);
      entity.addComponent(updated);
      break;
    }

    case 'learn_lesson': {
      // TODO: Hook into SoulIdentityComponent
      console.log(`[PlotEffect] Would learn lesson: ${effect.lesson_id}`);
      break;
    }

    case 'spawn_attractor': {
      // TODO: Hook into AttractorSystem
      console.log(`[PlotEffect] Would spawn attractor: ${effect.attractor_id}`);
      break;
    }

    case 'queue_event': {
      // TODO: Hook into EventQueue
      console.log(`[PlotEffect] Would queue event: ${effect.event_type}`);
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

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
      if (!mood) break;

      const updated = applyMoodChange(mood, effect.delta, context.personalTick);
      entity.addComponent(updated);
      break;
    }

    case 'modify_mood_factor': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
      if (!mood) break;

      const currentValue = mood.factors[effect.factor];
      const newValue = Math.max(-100, Math.min(100, currentValue + effect.delta));
      const updated = updateMoodFactor(mood, effect.factor, newValue);
      entity.addComponent(updated);
      break;
    }

    case 'add_trauma': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
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

      entity.addComponent(updatedMood);
      break;
    }

    case 'modify_stress': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
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

      entity.addComponent(updatedMood);
      break;
    }

    case 'trigger_breakdown': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
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

      entity.addComponent(updatedMood);
      break;
    }

    case 'set_emotional_state': {
      const entity = world.getEntity(context.entityId);
      if (!entity) break;

      const mood = entity.getComponent('mood') as MoodComponent | undefined;
      if (!mood) break;

      // Note: duration_ticks would need to be tracked separately
      // For now, just set the state immediately
      const updatedMood: MoodComponent = {
        ...mood,
        emotionalState: effect.state,
      };

      entity.addComponent(updatedMood);

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

      let relationship = entity.getComponent('relationship') as RelationshipComponent | undefined;
      if (!relationship) break;

      if (effect.trust_delta !== undefined) {
        relationship = updateTrust(relationship, targetId, effect.trust_delta);
      }

      if (effect.affinity_delta !== undefined) {
        relationship = updateAffinity(relationship, targetId, effect.affinity_delta);
      }

      entity.addComponent(relationship);
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

        let relationship = entity.getComponent('relationship') as RelationshipComponent | undefined;
        if (!relationship) break;

        if (effect.initial_trust !== undefined) {
          relationship = updateTrust(relationship, effect.agent_id, effect.initial_trust);
        }
        if (effect.initial_affinity !== undefined) {
          relationship = updateAffinity(relationship, effect.agent_id, effect.initial_affinity);
        }

        entity.addComponent(relationship);
      }
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

  const relationship = entity.getComponent('relationship') as RelationshipComponent | undefined;
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
