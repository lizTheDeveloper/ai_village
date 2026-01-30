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
import type { ThreatDetectionComponent } from '../components/ThreatDetectionComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import { ComponentType } from '../types/ComponentType.js';
import { isCriticalThreat } from '../components/ThreatDetectionComponent.js';
import { HUNGER_THRESHOLD_SEEK_FOOD, ENERGY_THRESHOLD_SEEK_SLEEP } from '../constants/NeedsConstants.js';

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
    const threatDetection = entity.getComponent<ThreatDetectionComponent>(ComponentType.ThreatDetection);
    const mood = entity.getComponent<MoodComponent>(ComponentType.Mood);

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
    const needsResult = this.checkNeeds(
      needs,
      circadian || undefined,
      temperature || undefined,
      currentTimeOfDay,
      agent || undefined,
      threatDetection || undefined,
      mood || undefined
    );
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
    agent?: AgentComponent,
    threatDetection?: ThreatDetectionComponent,
    mood?: MoodComponent
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

    // Low energy threshold: energy = seek sleep (hysteresis start threshold)
    // Uses ENERGY_THRESHOLD_SEEK_SLEEP constant for consistent behavior
    // Most sleep will be triggered by circadian bedtime logic instead
    if (needs.energy < ENERGY_THRESHOLD_SEEK_SLEEP) {
      return {
        behavior: 'seek_sleep',
        priority: 85,
        reason: `Low energy (energy: ${(needs.energy * 100).toFixed(0)}%)`,
      };
    }

    // Note: Removed sleepDrive-based triggers - sleep is now purely energy-based
    // Energy decays while awake, and low energy triggers sleep

    // Dangerously cold/hot: seek warmth/cooling urgently (high priority survival need)
    if (temperature) {
      // CRITICAL: Dangerously hot (e.g. standing in campfire) - immediate response
      if (temperature.state === 'dangerously_hot') {
        return {
          behavior: 'seek_cooling',
          priority: 90,
          reason: `Dangerously hot (temp: ${temperature.currentTemp.toFixed(1)}°C)`,
        };
      }
      if (temperature.state === 'dangerously_cold') {
        return {
          behavior: 'seek_warmth',
          priority: 90,
          reason: `Dangerously cold (temp: ${temperature.currentTemp.toFixed(1)}°C)`,
        };
      }
      // For 'hot' state, seek cooling if significantly above comfort max
      // This prevents agents from gathering resources near campfires
      if (temperature.state === 'hot' && temperature.currentTemp > temperature.comfortMax + 3) {
        return {
          behavior: 'seek_cooling',
          priority: 35,
          reason: `Hot (temp: ${temperature.currentTemp.toFixed(1)}°C)`,
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

      // Return home when frightened/threatened
      if (agent.homePreferences.returnWhenFrightened) {
        const frightenedState = this.checkFrightenedState(threatDetection, mood);
        if (frightenedState) {
          return {
            behavior: 'flee_to_home',
            priority: 85,
            reason: frightenedState.reason,
          };
        }
      }
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
    // Uses HUNGER_THRESHOLD_SEEK_FOOD constant (hysteresis start threshold)
    // Agents will continue seeking food until they reach HUNGER_THRESHOLD_WELL_FED
    if (needs.hunger < HUNGER_THRESHOLD_SEEK_FOOD) {
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
   * Check if entity is in a frightened/threatened state.
   * Returns reason string if frightened, null otherwise.
   */
  private checkFrightenedState(
    threatDetection?: ThreatDetectionComponent,
    mood?: MoodComponent
  ): { reason: string } | null {
    // Check 1: Mood-based fear (terrified emotional state)
    if (mood && mood.emotionalState === 'terrified') {
      return { reason: 'Terrified, fleeing to home for safety' };
    }

    // Check 2: Active critical threats nearby
    if (threatDetection && threatDetection.threats.length > 0) {
      // Find the most dangerous threat
      const maxThreatPower = Math.max(...threatDetection.threats.map(t => t.powerLevel));
      const powerDifferential = threatDetection.ownPowerLevel - maxThreatPower;

      // Critical threat: enemy is 30+ power levels stronger
      if (isCriticalThreat(powerDifferential)) {
        const threatCount = threatDetection.threats.length;
        return {
          reason: `Critical threat detected (${threatCount} ${threatCount === 1 ? 'enemy' : 'enemies'}, power diff: ${powerDifferential}), fleeing to home`,
        };
      }

      // Multiple threats, even if not individually critical
      if (threatDetection.threats.length >= 3) {
        return {
          reason: `Outnumbered by ${threatDetection.threats.length} threats, fleeing to home`,
        };
      }

      // Surrounded by threats from multiple directions
      if (threatDetection.threats.length >= 2) {
        const directions = threatDetection.threats.map(t => Math.atan2(t.direction.y, t.direction.x));
        const maxAngleDiff = Math.max(...directions) - Math.min(...directions);
        // If threats are 180+ degrees apart (surrounded from opposite sides)
        if (maxAngleDiff > Math.PI) {
          return {
            reason: `Surrounded by threats from multiple directions, fleeing to home`,
          };
        }
      }
    }

    // Check 3: Current threat response is to flee
    if (threatDetection?.currentResponse?.action === 'flee') {
      return {
        reason: `Active flee response from threat, heading to home for safety`,
      };
    }

    // Check 4: Stress-induced breakdown (panic attack)
    if (mood?.stress?.inBreakdown && mood.stress.breakdownType === 'panic_attack') {
      return {
        reason: `Panic attack in progress, seeking safety of home`,
      };
    }

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
