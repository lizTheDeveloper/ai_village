/**
 * BehaviorPriority - Priority calculations for agent behaviors
 *
 * Determines the priority of behaviors to decide what can interrupt what.
 *
 * Priority scale:
 * - 100+: Critical survival (collapse, flee from predator)
 * - 80-99: Danger (dangerously cold/hot, critical hunger)
 * - 50-79: Important tasks (deposit_items, build)
 * - 20-49: Moderate needs (cold, hungry, tired)
 * - 0-19: Low priority (wander, idle, social)
 *
 * Part of Phase 4 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { AgentBehavior } from '../components/AgentComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

/**
 * Priority configuration for a behavior
 */
export interface BehaviorPriorityConfig {
  base: number;
  canBeInterrupted: boolean;
  interruptsOthers: boolean;
}

/**
 * Default priority configuration for all behaviors
 */
const BEHAVIOR_PRIORITIES: Record<string, BehaviorPriorityConfig> = {
  // Critical survival (100+)
  forced_sleep: { base: 100, canBeInterrupted: false, interruptsOthers: true },
  flee_danger: { base: 95, canBeInterrupted: false, interruptsOthers: true },
  flee: { base: 95, canBeInterrupted: false, interruptsOthers: true },

  // Danger level (80-99)
  seek_warmth: { base: 35, canBeInterrupted: true, interruptsOthers: true }, // Base is moderate, elevated by temperature
  seek_cooling: { base: 35, canBeInterrupted: true, interruptsOthers: true }, // Base is moderate, elevated by temperature
  seek_food: { base: 40, canBeInterrupted: true, interruptsOthers: true },
  seek_water: { base: 38, canBeInterrupted: true, interruptsOthers: true },
  seek_shelter: { base: 36, canBeInterrupted: true, interruptsOthers: true },

  // Important tasks (50-79)
  deposit_items: { base: 60, canBeInterrupted: true, interruptsOthers: true },
  build: { base: 55, canBeInterrupted: true, interruptsOthers: true },
  farm: { base: 50, canBeInterrupted: true, interruptsOthers: true },
  till: { base: 50, canBeInterrupted: true, interruptsOthers: true },
  plant: { base: 50, canBeInterrupted: true, interruptsOthers: true },
  harvest: { base: 50, canBeInterrupted: true, interruptsOthers: true },

  // Moderate priority (20-49)
  seek_sleep: { base: 30, canBeInterrupted: true, interruptsOthers: true },
  attend_meeting: { base: 25, canBeInterrupted: true, interruptsOthers: true },
  call_meeting: { base: 25, canBeInterrupted: true, interruptsOthers: true },

  // Low priority (0-19)
  gather: { base: 15, canBeInterrupted: true, interruptsOthers: false },
  gather_seeds: { base: 15, canBeInterrupted: true, interruptsOthers: false },
  work: { base: 15, canBeInterrupted: true, interruptsOthers: false },
  talk: { base: 18, canBeInterrupted: true, interruptsOthers: false }, // Raised to prioritize social
  follow_agent: { base: 10, canBeInterrupted: true, interruptsOthers: false },
  navigate_to: { base: 10, canBeInterrupted: true, interruptsOthers: false },
  explore: { base: 8, canBeInterrupted: true, interruptsOthers: false },
  wander: { base: 5, canBeInterrupted: true, interruptsOthers: false },
  rest: { base: 0, canBeInterrupted: true, interruptsOthers: false },
  idle: { base: 0, canBeInterrupted: true, interruptsOthers: false },
};

/**
 * Get the priority for a behavior.
 *
 * @param behavior - The behavior to get priority for
 * @param temperature - Optional temperature component for context-aware priority
 * @param needs - Optional needs component for context-aware priority
 * @returns The priority value
 */
export function getBehaviorPriority(
  behavior: AgentBehavior,
  temperature?: TemperatureComponent,
  needs?: NeedsComponent
): number {
  const config = BEHAVIOR_PRIORITIES[behavior];

  if (!config) {
    // Default for unknown behaviors
    return 10;
  }

  let priority = config.base;

  // Context-aware adjustments
  if (behavior === 'seek_warmth' && temperature) {
    // Elevate priority when dangerously cold
    if (temperature.state === 'dangerously_cold') {
      priority = 90;
    }
  }

  if (behavior === 'seek_cooling' && temperature) {
    // Elevate priority when dangerously hot (e.g., standing in campfire)
    if (temperature.state === 'dangerously_hot') {
      priority = 90;
    }
  }

  if (behavior === 'seek_food' && needs) {
    // Elevate priority when starving (critical survival)
    if (needs.hunger < 0.1) {
      priority = 90; // Critical survival - overrides most tasks
    }
  }

  if (behavior === 'seek_water' && needs) {
    // Elevate priority when critically dehydrated
    if (needs.thirst < 0.1) {
      priority = 90; // Critical survival
    }
  }

  return priority;
}

/**
 * Get the full priority configuration for a behavior.
 */
export function getBehaviorPriorityConfig(behavior: AgentBehavior): BehaviorPriorityConfig {
  return (
    BEHAVIOR_PRIORITIES[behavior] || {
      base: 10,
      canBeInterrupted: true,
      interruptsOthers: false,
    }
  );
}

/**
 * Check if behavior A can interrupt behavior B.
 *
 * @param interrupter - The behavior trying to interrupt
 * @param current - The current behavior
 * @param temperature - Optional temperature for context
 * @param needs - Optional needs for context
 * @returns true if interrupter can interrupt current
 */
export function canInterrupt(
  interrupter: AgentBehavior,
  current: AgentBehavior,
  temperature?: TemperatureComponent,
  needs?: NeedsComponent
): boolean {
  const currentConfig = getBehaviorPriorityConfig(current);
  const interrupterConfig = getBehaviorPriorityConfig(interrupter);

  // Cannot interrupt uninterruptible behaviors
  if (!currentConfig.canBeInterrupted) {
    return false;
  }

  // Can only interrupt if the interrupter has interruptsOthers=true
  if (!interrupterConfig.interruptsOthers) {
    return false;
  }

  // Priority comparison
  const currentPriority = getBehaviorPriority(current, temperature, needs);
  const interrupterPriority = getBehaviorPriority(interrupter, temperature, needs);

  return interrupterPriority > currentPriority;
}

/**
 * Check if a behavior is a critical survival behavior.
 */
export function isCriticalSurvivalBehavior(behavior: AgentBehavior): boolean {
  const config = BEHAVIOR_PRIORITIES[behavior];
  return config ? !config.canBeInterrupted : false;
}

/**
 * Get all behaviors sorted by priority (highest first).
 */
export function getSortedBehaviors(): AgentBehavior[] {
  return Object.entries(BEHAVIOR_PRIORITIES)
    .sort((a, b) => b[1].base - a[1].base)
    .map(([behavior]) => behavior as AgentBehavior);
}
