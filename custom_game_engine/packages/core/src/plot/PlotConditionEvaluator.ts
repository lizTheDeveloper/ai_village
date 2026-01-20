/**
 * PlotConditionEvaluator - Evaluates plot conditions against game state
 *
 * This module handles all condition types defined in PlotTypes, including:
 * - Core conditions (items, location, skills, time)
 * - Emotional conditions (mood, stress, trauma, breakdown)
 * - Relationship conditions (with role binding)
 * - Structural conditions (NOT, AND, OR)
 */

import type { World } from '../ecs/World.js';
import type {
  PlotCondition,
  PlotConditionContext,
  PlotLineInstance,
} from './PlotTypes.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import { hasItem } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

/**
 * Evaluate a single plot condition
 */
export function evaluatePlotCondition(
  condition: PlotCondition,
  context: PlotConditionContext
): boolean {
  const world = context.world as World;

  switch (condition.type) {
    // ========================================================================
    // Core Conditions
    // ========================================================================
    case 'personal_tick_elapsed': {
      const ticksInStage = context.personalTick - context.plot.stage_entered_at;
      return ticksInStage >= condition.ticks;
    }

    case 'universe_tick_elapsed': {
      const ticksInStage = context.universeTick - context.plot.stage_entered_at;
      return ticksInStage >= condition.ticks;
    }

    case 'wisdom_threshold': {
      const soul = getSoulIdentityComponent(context.entityId, world);
      if (!soul) return false;
      return soul.wisdom_level >= condition.min_wisdom;
    }

    case 'lesson_learned': {
      const soul = getSoulIdentityComponent(context.entityId, world);
      if (!soul) return false;
      return soul.lessons_learned.some((l) => l.lesson_id === condition.lesson_id);
    }

    case 'has_item': {
      const inventory = getInventoryComponent(context.entityId, world);
      if (!inventory) return false;
      // has_item just checks if item exists (quantity 1)
      return hasItem(inventory, condition.item_id, 1);
    }

    case 'at_location': {
      const position = getPositionComponent(context.entityId, world);
      if (!position) return false;
      const dx = position.x - condition.location.x;
      const dy = position.y - condition.location.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= condition.radius;
    }

    case 'has_relationship': {
      return evaluateHasRelationship(context.entityId, condition.agent_id, condition.min_trust, world);
    }

    case 'has_skill': {
      const skills = getSkillsComponent(context.entityId, world);
      if (!skills) return false;
      const skillId = condition.skill as SkillId;
      const level = skills.levels[skillId] ?? 0;
      return level >= condition.min_level;
    }

    case 'choice_made': {
      // Check episodic memory for a choice event matching the choice_id
      const episodicMemory = getEpisodicMemoryComponent(context.entityId, world);
      if (!episodicMemory) return false;

      // Look for any memory where the eventType matches the choice_id
      // Choices are stored as episodic memories with eventType = 'choice:{choice_id}'
      const choiceEventType = `choice:${condition.choice_id}`;
      return episodicMemory.episodicMemories.some(
        (memory) => memory.eventType === choiceEventType
      );
    }

    case 'custom': {
      return condition.check(context);
    }

    // ========================================================================
    // Emotional Conditions
    // ========================================================================
    case 'emotional_state': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood) return false;

      if (mood.emotionalState !== condition.state) return false;

      // If duration specified, check how long they've been in this state
      if (condition.duration_ticks !== undefined) {
        // Check mood history for duration
        const history = mood.moodHistory;
        let consecutiveTicks = 0;

        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i]?.emotionalState === condition.state) {
            consecutiveTicks++;
          } else {
            break;
          }
        }

        return consecutiveTicks >= condition.duration_ticks;
      }

      return true;
    }

    case 'mood_threshold': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood) return false;

      if (condition.min !== undefined && mood.currentMood < condition.min) return false;
      if (condition.max !== undefined && mood.currentMood > condition.max) return false;
      return true;
    }

    case 'mood_factor': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood) return false;

      const factorValue = mood.factors[condition.factor];
      if (condition.min !== undefined && factorValue < condition.min) return false;
      if (condition.max !== undefined && factorValue > condition.max) return false;
      return true;
    }

    case 'has_trauma': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood?.stress) return false;

      const matchingTraumas = mood.stress.recentTraumas.filter(
        (t) => t.type === condition.trauma_type && !t.resolved
      );

      if (matchingTraumas.length === 0) return false;

      // If recency specified, check timestamp
      if (condition.recency_ticks !== undefined) {
        const recentEnough = matchingTraumas.some(
          (t) => context.personalTick - t.timestamp <= condition.recency_ticks!
        );
        return recentEnough;
      }

      return true;
    }

    case 'stress_threshold': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood?.stress) return false;

      if (condition.min !== undefined && mood.stress.level < condition.min) return false;
      if (condition.max !== undefined && mood.stress.level > condition.max) return false;
      return true;
    }

    case 'in_breakdown': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood?.stress) return false;

      if (!mood.stress.inBreakdown) return false;

      // If specific breakdown type required
      if (condition.breakdown_type !== undefined) {
        return mood.stress.breakdownType === condition.breakdown_type;
      }

      return true;
    }

    case 'breakdown_recovered': {
      const mood = getMoodComponent(context.entityId, world);
      if (!mood?.stress) return false;

      // Not in breakdown currently
      if (mood.stress.inBreakdown) return false;

      // Has had breakdowns before
      if (mood.stress.totalBreakdowns === 0) return false;

      // If recency specified, need to track when breakdown ended
      // (would need additional field for this)
      return true;
    }

    // ========================================================================
    // Relationship Conditions with Role Binding
    // ========================================================================
    case 'has_relationship_with_role': {
      const targetId = context.boundAgents[condition.role];
      if (!targetId) {
        console.warn(`[PlotCondition] Role '${condition.role}' not bound`);
        return false;
      }

      const relationship = getRelationshipComponent(context.entityId, world);
      if (!relationship) return false;

      const rel = relationship.relationships.get(targetId);
      if (!rel) return false;

      if (condition.min_trust !== undefined && rel.trust < condition.min_trust) return false;
      if (condition.max_trust !== undefined && rel.trust > condition.max_trust) return false;
      if (condition.min_affinity !== undefined && rel.affinity < condition.min_affinity) return false;
      if (condition.max_affinity !== undefined && rel.affinity > condition.max_affinity) return false;

      return true;
    }

    case 'relationship_changed': {
      const targetId = context.boundAgents[condition.role];
      if (!targetId) {
        console.warn(`[PlotCondition] Role '${condition.role}' not bound`);
        return false;
      }

      // Get current relationship
      const relationship = getRelationshipComponent(context.entityId, world);
      if (!relationship) return false;

      const currentRel = relationship.relationships.get(targetId);
      if (!currentRel) return false;

      // Get snapshot from when plot was assigned
      const snapshot = context.plot.relationship_snapshots?.[condition.role];
      if (!snapshot) {
        console.warn(`[PlotCondition] No snapshot for role '${condition.role}'`);
        return false;
      }

      // Check recency
      if (condition.recency_ticks !== undefined) {
        const ticksSinceSnapshot = context.personalTick - snapshot.captured_at_tick;
        if (ticksSinceSnapshot > condition.recency_ticks) {
          return false;
        }
      }

      // Check trust delta
      if (condition.trust_delta !== undefined) {
        const trustChange = currentRel.trust - snapshot.trust;
        // If positive delta required, trust must have increased by at least that amount
        // If negative delta required, trust must have decreased by at least that amount
        if (condition.trust_delta > 0 && trustChange < condition.trust_delta) return false;
        if (condition.trust_delta < 0 && trustChange > condition.trust_delta) return false;
      }

      // Check affinity delta
      if (condition.affinity_delta !== undefined) {
        const affinityChange = currentRel.affinity - snapshot.affinity;
        if (condition.affinity_delta > 0 && affinityChange < condition.affinity_delta) return false;
        if (condition.affinity_delta < 0 && affinityChange > condition.affinity_delta) return false;
      }

      return true;
    }

    case 'social_isolation': {
      const relationship = getRelationshipComponent(context.entityId, world);
      if (!relationship) return true; // No relationships = isolated

      // Check if any relationship has recent interaction
      for (const rel of relationship.relationships.values()) {
        const ticksSinceInteraction = context.personalTick - rel.lastInteraction;
        if (ticksSinceInteraction < condition.min_ticks) {
          return false; // Had recent interaction, not isolated
        }
      }

      return true;
    }

    case 'any_relationship': {
      const relationship = getRelationshipComponent(context.entityId, world);
      if (!relationship) return false;

      for (const rel of relationship.relationships.values()) {
        let matches = true;
        if (condition.min_trust !== undefined && rel.trust < condition.min_trust) matches = false;
        if (condition.max_trust !== undefined && rel.trust > condition.max_trust) matches = false;
        if (condition.min_affinity !== undefined && rel.affinity < condition.min_affinity) matches = false;
        if (condition.max_affinity !== undefined && rel.affinity > condition.max_affinity) matches = false;

        if (matches) return true;
      }

      return false;
    }

    // ========================================================================
    // Structural Conditions
    // ========================================================================
    case 'not': {
      return !evaluatePlotCondition(condition.condition, context);
    }

    case 'all': {
      return condition.conditions.every((c) => evaluatePlotCondition(c, context));
    }

    case 'any': {
      return condition.conditions.some((c) => evaluatePlotCondition(c, context));
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = condition;
      console.warn(`[PlotCondition] Unknown condition type: ${(_exhaustive as PlotCondition).type}`);
      return false;
    }
  }
}

/**
 * Evaluate all conditions for a transition (AND logic)
 */
export function evaluatePlotTransitionConditions(
  conditions: PlotCondition[],
  context: PlotConditionContext
): boolean {
  return conditions.every((condition) => evaluatePlotCondition(condition, context));
}

/**
 * Create a condition context for evaluation
 */
export function createPlotConditionContext(
  entityId: string,
  plot: PlotLineInstance,
  personalTick: number,
  universeTick: number,
  world: World
): PlotConditionContext {
  return {
    entityId,
    personalTick,
    universeTick,
    boundAgents: plot.bound_agents,
    plot,
    world,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMoodComponent(entityId: string, world: World): MoodComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('mood') as MoodComponent | undefined;
}

function getRelationshipComponent(entityId: string, world: World): RelationshipComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('relationship') as RelationshipComponent | undefined;
}

function evaluateHasRelationship(
  entityId: string,
  targetId: string,
  minTrust: number,
  world: World
): boolean {
  const relationship = getRelationshipComponent(entityId, world);
  if (!relationship) return false;

  const rel = relationship.relationships.get(targetId);
  if (!rel) return false;

  return rel.trust >= minTrust;
}

function getSoulIdentityComponent(entityId: string, world: World): SoulIdentityComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('soul_identity') as SoulIdentityComponent | undefined;
}

function getInventoryComponent(entityId: string, world: World): InventoryComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('inventory') as InventoryComponent | undefined;
}

function getPositionComponent(entityId: string, world: World): PositionComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('position') as PositionComponent | undefined;
}

function getSkillsComponent(entityId: string, world: World): SkillsComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('skills') as SkillsComponent | undefined;
}

function getEpisodicMemoryComponent(entityId: string, world: World): EpisodicMemoryComponent | undefined {
  const entity = world.getEntity(entityId);
  if (!entity) return undefined;

  return entity.getComponent('episodic_memory') as EpisodicMemoryComponent | undefined;
}
