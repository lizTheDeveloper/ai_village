import { ComponentBase } from '../ecs/Component.js';

// Class-based component for use in tests and new systems
export class NeedsComponent extends ComponentBase {
  public readonly type = 'needs';
  public hunger: number;
  public energy: number;
  public health: number;
  public thirst: number;       // 0-1.0, hydration level
  public temperature: number;  // Current body temperature in Celsius
  public social: number;       // 0-1.0, social need satisfaction
  public stimulation: number;  // 0-1.0, need for mental stimulation

  constructor() {
    super();
    this.hunger = 1.0;
    this.energy = 1.0;
    this.health = 1.0;
    this.thirst = 1.0;
    this.temperature = 37; // Normal body temp
    this.social = 0.5;
    this.stimulation = 0.5;
  }
}

// Legacy interface-based component for existing systems
export interface NeedsComponentLegacy {
  type: 'needs';
  version: number;
  hunger: number; // 0-100, 0 = starving, 100 = full
  energy: number; // 0-100, 0 = exhausted, 100 = energized
  health: number; // 0-100, 0 = dead, 100 = healthy
  thirst: number; // 0-100, 0 = hydrated, 100 = dehydrated
  temperature: number; // Current body temperature in Celsius
  hungerDecayRate: number; // Points per second
  energyDecayRate: number; // Points per second
}

export function createNeedsComponent(
  hunger: number = 100,
  energy: number = 100,
  health: number = 100,
  thirst: number = 100,
  temperature: number = 37,
  hungerDecayRate: number = 2.0, // Lose 2 hunger per second
  energyDecayRate: number = 1.0 // Lose 1 energy per second
): NeedsComponentLegacy {
  return {
    type: 'needs',
    version: 1,
    hunger: Math.max(0, Math.min(100, hunger)),
    energy: Math.max(0, Math.min(100, energy)),
    health: Math.max(0, Math.min(100, health)),
    thirst: Math.max(0, Math.min(100, thirst)),
    temperature,
    hungerDecayRate,
    energyDecayRate,
  };
}

/**
 * Check if agent is hungry (below 40%)
 */
export function isHungry(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.hunger < 40 || needs.hunger < 0.4;
}

/**
 * Check if agent is starving (below 10%)
 */
export function isStarving(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.hunger < 10 || needs.hunger < 0.1;
}

/**
 * Check if agent is tired (below 30%)
 */
export function isTired(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.energy < 30 || needs.energy < 0.3;
}

/**
 * Check if agent's health is critical (below 20%)
 */
export function isHealthCritical(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.health < 20 || needs.health < 0.2;
}

/**
 * Check if agent is dying (below 5%)
 */
export function isDying(needs: NeedsComponentLegacy | NeedsComponent): boolean {
  return needs.health < 5 || needs.health < 0.05;
}
