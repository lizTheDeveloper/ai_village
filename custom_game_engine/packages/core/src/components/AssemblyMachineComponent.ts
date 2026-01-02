import type { Component } from '../ecs/Component.js';

/**
 * Module type for machine enhancement
 */
export type ModuleType = 'speed' | 'efficiency' | 'productivity';

/**
 * Module instance installed in a machine
 */
export interface ModuleInstance {
  /** Module type */
  moduleType: ModuleType;

  /** Module level (1-3) */
  level: 1 | 2 | 3;

  /** Bonus multiplier (e.g., 0.2 = +20%) */
  bonus: number;
}

/**
 * AssemblyMachineComponent - Automated crafting machine
 *
 * Assembly machines automatically craft recipes when powered and
 * supplied with ingredients via machine connections or belts.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 4)
 */
export interface AssemblyMachineComponent extends Component {
  readonly type: 'assembly_machine';

  /** Machine type identifier */
  machineType: string;

  /** Current recipe being crafted (undefined = idle) */
  currentRecipe?: string;

  /** Crafting progress (0-100) */
  progress: number;

  /** Speed multiplier (base 1.0) */
  speed: number;

  /** Max ingredient slots */
  ingredientSlots: number;

  /** Max module slots */
  moduleSlots: number;

  /** Modules installed */
  modules: ModuleInstance[];
}

/**
 * Factory function to create AssemblyMachineComponent
 */
export function createAssemblyMachineComponent(
  machineType: string,
  params: {
    speed?: number;
    ingredientSlots?: number;
    moduleSlots?: number;
  } = {}
): AssemblyMachineComponent {
  return {
    type: 'assembly_machine',
    version: 1,
    machineType,
    currentRecipe: undefined,
    progress: 0,
    speed: params.speed ?? 1.0,
    ingredientSlots: params.ingredientSlots ?? 4,
    moduleSlots: params.moduleSlots ?? 0,
    modules: [],
  };
}

/**
 * Install module in assembly machine
 */
export function installModule(
  machine: AssemblyMachineComponent,
  module: ModuleInstance
): boolean {
  if (machine.modules.length >= machine.moduleSlots) {
    return false;
  }

  machine.modules.push(module);
  return true;
}

/**
 * Calculate effective speed with modules
 */
export function calculateEffectiveSpeed(machine: AssemblyMachineComponent): number {
  let speed = machine.speed;

  for (const module of machine.modules) {
    if (module.moduleType === 'speed') {
      speed *= (1 + module.bonus);
    }
  }

  return speed;
}

/**
 * Calculate effective power consumption with modules
 */
export function calculatePowerConsumption(
  basePower: number,
  machine: AssemblyMachineComponent
): number {
  let consumption = basePower;

  for (const module of machine.modules) {
    if (module.moduleType === 'efficiency') {
      consumption *= (1 - module.bonus);
    } else if (module.moduleType === 'speed') {
      // Speed modules increase power consumption
      consumption *= (1 + module.bonus * 0.5);
    }
  }

  return consumption;
}
