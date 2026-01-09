/**
 * AutonomicSystem - Fast survival reflexes that override executive decisions
 *
 * This processor handles critical physical needs that interrupt LLM/scripted
 * decisions. Based on needs.md spec - Tier 1 (survival) needs can interrupt
 * almost anything.
 *
 * Removed: Boredom system (idle→wander→explore). Agents now force LLM calls
 * when no behavior is assigned instead of defaulting to idle/wander.
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

    // Get current time of day for bedtime logic
    let currentTimeOfDay: number | undefined = undefined;
    if (world) {
      const timeEntities = world.query().with(ComponentType.Time).executeEntities();
      if (timeEntities.length > 0 && timeEntities[0]) {
        const timeComp = timeEntities[0].getComponent<any>(ComponentType.Time);
        if (timeComp && timeComp.timeOfDay !== undefined) {
          currentTimeOfDay = timeComp.timeOfDay;
        }
      }
    }

    // First check survival needs
    const needsResult = this.checkNeeds(needs, circadian || undefined, temperature || undefined, currentTimeOfDay, agent || undefined);
    if (needsResult) return needsResult;

    return null;
  }

  /**
   * Check needs components and determine if autonomic override is needed.
   */
  checkNeeds(
    needs: NeedsComponent,
    circadian?: CircadianComponent,
    temperature?: TemperatureComponent,
    currentTimeOfDay?: number,
    agent?: AgentComponent
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

    // Low energy threshold: < 0.15 (15%) energy = seek sleep
    // Lowered from 0.3 to allow agents to stay awake 48-72 hours before collapse
    // At working rate of 4.8 energy/hour, this gives ~3 hours buffer before collapse
    // Most sleep will be triggered by circadian bedtime logic instead
    if (needs.energy < 0.15) {
      return {
        behavior: 'seek_sleep',
        priority: 85,
        reason: `Low energy (energy: ${(needs.energy * 100).toFixed(0)}%)`,
      };
    }

    // Note: Removed sleepDrive-based triggers - sleep is now purely energy-based
    // Energy decays while awake, and low energy triggers sleep

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

    // Flee to home when hurt or frightened (Bed-as-Home System Phase 4)
    // Priority 85: High survival priority, above hunger but below critical exhaustion
    if (agent && agent.assignedBed && agent.homePreferences) {
      // Return home when injured (health < 30%)
      if (agent.homePreferences.returnWhenHurt && needs.health < 0.3) {
        return {
          behavior: 'flee_to_home',
          priority: 85,
          reason: `Injured, fleeing to home (health: ${(needs.health * 100).toFixed(0)}%)`,
        };
      }

      // Return home when frightened
      // TODO: Add frightened/threatened state detection when implemented
      // if (agent.homePreferences.returnWhenFrightened && agent.isFrightened) {
      //   return {
      //     behavior: 'flee_to_home',
      //     priority: 85,
      //     reason: 'Frightened, fleeing to home',
      //   };
      // }
    }

    // Bedtime preference: If it's past preferred sleep time AND energy is reasonable,
    // seeking bed becomes high-utility (but not forced). Agents naturally drift towards bed
    // at their preferred sleep time, but other activities (conversations, gathering, combat)
    // can continue if already in progress. Priority 70: can be interrupted by critical needs.
    if (circadian && currentTimeOfDay !== undefined) {
      const isPastBedtime =
        currentTimeOfDay >= circadian.preferredSleepTime || currentTimeOfDay < 5;
      const hasReasonableEnergy = needs.energy >= 0.15; // Not exhausted

      if (isPastBedtime && hasReasonableEnergy) {
        return {
          behavior: 'seek_sleep',
          priority: 70,
          reason: `Bedtime (time: ${currentTimeOfDay.toFixed(1)}h, preferred: ${circadian.preferredSleepTime}h)`,
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

    // Note: Removed high sleepDrive trigger - sleep is purely energy-based now

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
