/**
 * AutonomicSystem - Fast survival reflexes that override executive decisions
 *
 * This processor handles critical physical needs that interrupt LLM/scripted
 * decisions. Based on needs.md spec - Tier 1 (survival) needs can interrupt
 * almost anything.
 *
 * Part of Phase 4 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { AgentBehavior, AgentComponent } from '../components/AgentComponent.js';
import type { World } from '../ecs/World.js';
import { ComponentType } from '../types/ComponentType.js';

/** Ticks of idleness before boredom triggers wander (~5 game minutes at 20 TPS) */
const BOREDOM_THRESHOLD_TICKS = 100;

/**
 * Result of autonomic check
 */
export interface AutonomicResult {
  behavior: AgentBehavior;
  priority: number;
  reason: string;
}

/**
 * AutonomicSystem Class
 *
 * Handles survival reflexes that override executive (LLM) decisions.
 * Priority scale:
 * - 100+: Critical survival (collapse, flee)
 * - 80-99: Danger (dangerously cold/hot, critical hunger)
 * - 50-79: Important tasks
 * - 20-49: Moderate needs
 *
 * Usage:
 * ```typescript
 * const autonomic = new AutonomicSystem();
 *
 * // Check if autonomic override is needed
 * const result = autonomic.check(entity);
 * if (result) {
 *   // Apply autonomic behavior
 *   entity.updateComponent(ComponentType.Agent, c => ({ ...c, behavior: result.behavior }));
 * }
 * ```
 */
export class AutonomicSystem {
  /**
   * Check if autonomic override is needed for an entity.
   * Returns null if no override is needed.
   */
  check(entity: EntityImpl, world?: World): AutonomicResult | null {
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
    if (!needs) return null;

    const circadian = entity.getComponent<CircadianComponent>(ComponentType.Circadian);
    const temperature = entity.getComponent<TemperatureComponent>(ComponentType.Temperature);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    // First check survival needs
    const needsResult = this.checkNeeds(needs, circadian || undefined, temperature || undefined);
    if (needsResult) return needsResult;

    // Then check boredom (lower priority than survival)
    if (agent && world) {
      const boredomResult = this.checkBoredom(agent, world.tick);
      if (boredomResult) return boredomResult;
    }

    return null;
  }

  /**
   * Check if agent is bored from being idle or wandering too long.
   * - Idle -> wander after BOREDOM_THRESHOLD_TICKS
   * - Wander -> explore after 2x BOREDOM_THRESHOLD_TICKS (to break wander loops)
   */
  checkBoredom(agent: AgentComponent, currentTick: number): AutonomicResult | null {
    // Check if agent is idle
    if (agent.behavior === 'idle' && agent.idleStartTick !== undefined) {
      const idleDuration = currentTick - agent.idleStartTick;
      if (idleDuration >= BOREDOM_THRESHOLD_TICKS) {
        return {
          behavior: 'wander',
          priority: 10, // Low priority - can be interrupted by any need
          reason: `Bored (idle for ${idleDuration} ticks)`,
        };
      }
    }

    // Check if agent is stuck wandering too long (break the wander loop)
    if (agent.behavior === 'wander') {
      const wanderStartTick = agent.behaviorState?.wanderStartTick as number | undefined;
      if (wanderStartTick !== undefined) {
        const wanderDuration = currentTick - wanderStartTick;
        // After wandering for 2x boredom threshold, switch to explore to find something useful
        if (wanderDuration >= BOREDOM_THRESHOLD_TICKS * 2) {
          return {
            behavior: 'explore',
            priority: 15, // Slightly higher than wander
            reason: `Wandering too long (${wanderDuration} ticks), exploring for activities`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check needs components and determine if autonomic override is needed.
   */
  checkNeeds(
    needs: NeedsComponent,
    circadian?: CircadianComponent,
    temperature?: TemperatureComponent
  ): AutonomicResult | null {
    // Critical physical needs interrupt with high priority (spec: interruptPriority 0.85-0.95)

    // SLEEP TAKES PRIORITY OVER FOOD when critically exhausted
    // Per CLAUDE.md: agents need to recover energy to survive, can't work or eat without energy

    // Critical exhaustion threshold: 0 energy = forced sleep (collapse)
    // Agents will collapse and sleep immediately when energy is depleted
    if (needs.energy <= 0) {
      return {
        behavior: 'forced_sleep',
        priority: 100,
        reason: `Critical exhaustion (energy: ${(needs.energy * 100).toFixed(0)}%)`,
      };
    }

    // Low energy threshold: < 0.3 (30%) energy = seek sleep
    // Increased from 0.1 to give agents time to find bed before collapsing
    // At working rate of 4.8 energy/hour, this gives ~4 hours buffer before collapse
    if (needs.energy < 0.3) {
      return {
        behavior: 'seek_sleep',
        priority: 85,
        reason: `Low energy (energy: ${(needs.energy * 100).toFixed(0)}%)`,
      };
    }

    // Critical sleep drive: > 85 = forced micro-sleep (can fall asleep mid-action)
    if (circadian && circadian.sleepDrive > 85) {
      return {
        behavior: 'forced_sleep',
        priority: 100,
        reason: `Critical sleep drive (sleepDrive: ${circadian.sleepDrive.toFixed(1)})`,
      };
    }

    // Dangerously cold/hot: seek warmth/shelter urgently (high priority survival need)
    if (temperature) {
      if (temperature.state === 'dangerously_cold') {
        return {
          behavior: 'seek_warmth',
          priority: 90,
          reason: `Dangerously cold (temp: ${temperature.currentTemp.toFixed(1)}°C)`,
        };
      }
      // For 'cold' state, only seek warmth if agent has been cold for a while
      // This provides hysteresis so agents can leave fire to gather berries
      if (temperature.state === 'cold' && temperature.currentTemp < temperature.comfortMin - 3) {
        return {
          behavior: 'seek_warmth',
          priority: 35,
          reason: `Cold (temp: ${temperature.currentTemp.toFixed(1)}°C)`,
        };
      }
    }

    // Hunger critical threshold: 0.1 (10%) (very hungry, but can still function)
    // Only interrupt if NOT critically exhausted (energy > 0)
    if (needs.hunger < 0.1 && needs.energy > 0) {
      return {
        behavior: 'seek_food',
        priority: 80,
        reason: `Critical hunger (hunger: ${(needs.hunger * 100).toFixed(0)}%)`,
      };
    }

    // High sleep drive: seek sleep only at high threshold (95+)
    // This ensures agents only sleep when truly tired, not prematurely
    if (circadian && circadian.sleepDrive >= 95) {
      return {
        behavior: 'seek_sleep',
        priority: 30,
        reason: `High sleep drive (sleepDrive: ${circadian.sleepDrive.toFixed(1)})`,
      };
    }

    // Moderate hunger: seek food (but not urgent enough to interrupt sleep)
    // TEMP: Lower threshold to 0.6 (60%) for testing berry gathering
    if (needs.hunger < 0.6) {
      return {
        behavior: 'seek_food',
        priority: 40,
        reason: `Hungry (hunger: ${(needs.hunger * 100).toFixed(0)}%)`,
      };
    }

    // No autonomic override needed - executive system can decide
    return null;
  }

  /**
   * Check if a behavior is critical and cannot be interrupted.
   */
  isCriticalBehavior(behavior: AgentBehavior): boolean {
    const criticalBehaviors: AgentBehavior[] = [
      'forced_sleep',
      'flee_danger',
      'flee',
    ];
    return criticalBehaviors.includes(behavior);
  }

  /**
   * Check if autonomic override should interrupt current behavior.
   */
  shouldInterrupt(
    currentBehavior: AgentBehavior,
    autonomicResult: AutonomicResult,
    currentPriority: number
  ): boolean {
    // Critical behaviors cannot be interrupted
    if (this.isCriticalBehavior(currentBehavior)) {
      return false;
    }

    // Autonomic override if higher priority
    return autonomicResult.priority > currentPriority;
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const autonomicSystem = new AutonomicSystem();

/**
 * Check if autonomic override is needed for an entity.
 */
export function checkAutonomicNeeds(entity: EntityImpl): AutonomicResult | null {
  return autonomicSystem.check(entity);
}

/**
 * Check if a behavior is critical and cannot be interrupted.
 */
export function isCriticalBehavior(behavior: AgentBehavior): boolean {
  return autonomicSystem.isCriticalBehavior(behavior);
}
