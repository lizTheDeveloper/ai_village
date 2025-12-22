import type { Component } from '../ecs/Component.js';

export interface NeedsComponent extends Component {
  type: 'needs';
  hunger: number; // 0-100, 0 = starving, 100 = full
  energy: number; // 0-100, 0 = exhausted, 100 = energized
  health: number; // 0-100, 0 = dead, 100 = healthy
  hungerDecayRate: number; // Points per second
  energyDecayRate: number; // Points per second
}

export function createNeedsComponent(
  hunger: number = 100,
  energy: number = 100,
  health: number = 100,
  hungerDecayRate: number = 2.0, // Lose 2 hunger per second
  energyDecayRate: number = 1.0 // Lose 1 energy per second
): NeedsComponent {
  return {
    type: 'needs',
    version: 1,
    hunger: Math.max(0, Math.min(100, hunger)),
    energy: Math.max(0, Math.min(100, energy)),
    health: Math.max(0, Math.min(100, health)),
    hungerDecayRate,
    energyDecayRate,
  };
}

/**
 * Check if agent is hungry (below 40%)
 */
export function isHungry(needs: NeedsComponent): boolean {
  return needs.hunger < 40;
}

/**
 * Check if agent is starving (below 10%)
 */
export function isStarving(needs: NeedsComponent): boolean {
  return needs.hunger < 10;
}

/**
 * Check if agent is tired (below 30%)
 */
export function isTired(needs: NeedsComponent): boolean {
  return needs.energy < 30;
}

/**
 * Check if agent's health is critical (below 20%)
 */
export function isHealthCritical(needs: NeedsComponent): boolean {
  return needs.health < 20;
}

/**
 * Check if agent is dying (below 5%)
 */
export function isDying(needs: NeedsComponent): boolean {
  return needs.health < 5;
}
