/**
 * Factory Blueprint Generator
 *
 * Generates complete factories from blueprints, spawning all entities:
 * - Power plants
 * - Assembly machines
 * - Belt networks
 * - Resource inputs/outputs
 *
 * Can generate everything from small workshops to Dyson Swarm factory cities.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createAssemblyMachineComponent } from '../components/AssemblyMachineComponent.js';
import { createMachineConnectionComponent } from '../components/MachineConnectionComponent.js';
import { createPowerProducer, createPowerConsumer } from '../components/PowerComponent.js';
import { createBeltComponent, addItemsToBelt } from '../components/BeltComponent.js';
import type { BeltDirection } from '../components/BeltComponent.js';

/**
 * Machine placement in a blueprint
 */
export interface MachinePlacement {
  machineItemId: string;
  offset: { x: number; y: number };
  recipe?: string;
  inputDirection?: { x: number; y: number };
  outputDirection?: { x: number; y: number };
}

/**
 * Belt placement in a blueprint
 */
export interface BeltPlacement {
  offset: { x: number; y: number };
  direction: BeltDirection;
  tier: 1 | 2 | 3;
  preloadItemId?: string;
  preloadCount?: number;
}

/**
 * Power producer placement
 */
export interface PowerPlacement {
  offset: { x: number; y: number };
  powerType: 'mechanical' | 'electrical' | 'arcane';
  generation: number;
}

/**
 * Factory blueprint definition
 */
export interface FactoryBlueprint {
  id: string;
  name: string;
  size: { width: number; height: number };

  // Entities to spawn
  machines?: MachinePlacement[];
  belts?: BeltPlacement[];
  power?: PowerPlacement[];

  // Production info
  productionGoal?: {
    outputItemId: string;
    targetRate: number; // items per minute
    targetTotal?: number; // total items to produce
  };

  // Power requirements
  powerRequired?: number;
  powerGeneration?: number;

  // Agent requirements
  agentRequirements?: {
    agentType?: 'ground' | 'flying';
    minAgents?: number;
  };

  // For mega-factories
  districts?: {
    name: string;
    blueprint?: FactoryBlueprint;
    offset: { x: number; y: number };
  }[];
}

/**
 * Result of factory generation
 */
export interface FactoryGenerationResult {
  entities: Entity[];
  powerEntities: Entity[];
  machineEntities: Entity[];
  beltEntities: Entity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  stats: {
    totalMachines: number;
    totalBelts: number;
    totalPowerGeneration: number;
    totalPowerConsumption: number;
  };
}

/**
 * Generates factory entities from blueprints
 */
export class FactoryBlueprintGenerator {
  /**
   * Generate a factory from a blueprint at the specified position
   */
  generateFactory(
    world: World,
    blueprint: FactoryBlueprint,
    position: { x: number; y: number }
  ): FactoryGenerationResult {
    const entities: Entity[] = [];
    const powerEntities: Entity[] = [];
    const machineEntities: Entity[] = [];
    const beltEntities: Entity[] = [];

    let totalPowerGeneration = 0;
    let totalPowerConsumption = 0;

    // Generate power plants
    if (blueprint.power) {
      for (const powerPlacement of blueprint.power) {
        const entity = this.createPowerPlant(
          world,
          position.x + powerPlacement.offset.x,
          position.y + powerPlacement.offset.y,
          powerPlacement.powerType,
          powerPlacement.generation
        );
        entities.push(entity);
        powerEntities.push(entity);
        totalPowerGeneration += powerPlacement.generation;
      }
    }

    // Generate machines
    if (blueprint.machines) {
      for (const machinePlacement of blueprint.machines) {
        const entity = this.createMachine(
          world,
          position.x + machinePlacement.offset.x,
          position.y + machinePlacement.offset.y,
          machinePlacement
        );
        entities.push(entity);
        machineEntities.push(entity);
        totalPowerConsumption += this.estimateMachinePower(machinePlacement.machineItemId);
      }
    }

    // Generate belts
    if (blueprint.belts) {
      for (const beltPlacement of blueprint.belts) {
        const entity = this.createBelt(
          world,
          position.x + beltPlacement.offset.x,
          position.y + beltPlacement.offset.y,
          beltPlacement
        );
        entities.push(entity);
        beltEntities.push(entity);
      }
    }

    // Generate districts recursively
    if (blueprint.districts) {
      for (const district of blueprint.districts) {
        if (district.blueprint) {
          const districtResult = this.generateFactory(
            world,
            district.blueprint,
            {
              x: position.x + district.offset.x,
              y: position.y + district.offset.y,
            }
          );
          entities.push(...districtResult.entities);
          powerEntities.push(...districtResult.powerEntities);
          machineEntities.push(...districtResult.machineEntities);
          beltEntities.push(...districtResult.beltEntities);
          totalPowerGeneration += districtResult.stats.totalPowerGeneration;
          totalPowerConsumption += districtResult.stats.totalPowerConsumption;
        }
      }
    }

    return {
      entities,
      powerEntities,
      machineEntities,
      beltEntities,
      bounds: {
        minX: position.x,
        minY: position.y,
        maxX: position.x + blueprint.size.width,
        maxY: position.y + blueprint.size.height,
      },
      stats: {
        totalMachines: machineEntities.length,
        totalBelts: beltEntities.length,
        totalPowerGeneration,
        totalPowerConsumption,
      },
    };
  }

  private createPowerPlant(
    world: World,
    x: number,
    y: number,
    powerType: 'mechanical' | 'electrical' | 'arcane',
    generation: number
  ): Entity {
    const entity = world.createEntity();
    const entityWithAddComponent = entity as unknown as { addComponent: (comp: unknown) => void };
    entityWithAddComponent.addComponent(createPositionComponent(x, y));
    entityWithAddComponent.addComponent(createPowerProducer(powerType, generation));
    return entity;
  }

  private createMachine(
    world: World,
    x: number,
    y: number,
    placement: MachinePlacement
  ): Entity {
    const entity = world.createEntity();
    const entityWithAddComponent = entity as unknown as { addComponent: (comp: unknown) => void };
    entityWithAddComponent.addComponent(createPositionComponent(x, y));

    // Create assembly machine component
    const assembly = createAssemblyMachineComponent(placement.machineItemId, { speed: 1 });
    if (placement.recipe) {
      assembly.currentRecipe = placement.recipe;
    }
    assembly.speed = this.getMachineSpeed(placement.machineItemId);
    entityWithAddComponent.addComponent(assembly);

    // Create machine connections
    const connection = createMachineConnectionComponent();
    if (placement.inputDirection) {
      connection.inputs[0]!.offset = placement.inputDirection;
    }
    if (placement.outputDirection) {
      connection.outputs[0]!.offset = placement.outputDirection;
    }
    entityWithAddComponent.addComponent(connection);

    // Create power component
    const powerConsumption = this.estimateMachinePower(placement.machineItemId);
    const power = createPowerConsumer('electrical', powerConsumption);
    entityWithAddComponent.addComponent(power);

    return entity;
  }

  private createBelt(
    world: World,
    x: number,
    y: number,
    placement: BeltPlacement
  ): Entity {
    const entity = world.createEntity();
    const entityWithAddComponent = entity as unknown as { addComponent: (comp: unknown) => void };
    entityWithAddComponent.addComponent(createPositionComponent(x, y));

    const belt = createBeltComponent(placement.direction, placement.tier);

    // Preload items if specified
    if (placement.preloadItemId && placement.preloadCount) {
      addItemsToBelt(belt, placement.preloadItemId, placement.preloadCount);
    }

    entityWithAddComponent.addComponent(belt);
    return entity;
  }

  private getMachineSpeed(machineId: string): number {
    // Machine speed multipliers
    const speeds: Record<string, number> = {
      'assembly_machine_i': 0.5,
      'assembly_machine_ii': 0.75,
      'assembly_machine_iii': 1.25,
      'nanofabricator': 2.0,
      'mega_assembler': 3.0,
      'stone_furnace': 0.5,
      'steel_furnace': 1.0,
      'electric_furnace': 2.0,
    };
    return speeds[machineId] ?? 1.0;
  }

  private estimateMachinePower(machineId: string): number {
    // Power consumption estimates (in kW)
    const power: Record<string, number> = {
      'assembly_machine_i': 100,
      'assembly_machine_ii': 200,
      'assembly_machine_iii': 500,
      'nanofabricator': 2000,
      'mega_assembler': 5000,
      'stone_furnace': 50,
      'steel_furnace': 100,
      'electric_furnace': 500,
    };
    return power[machineId] ?? 100;
  }
}

/**
 * Helper function to generate a factory
 */
export function generateFactory(
  world: World,
  blueprint: FactoryBlueprint,
  position: { x: number; y: number }
): FactoryGenerationResult {
  const generator = new FactoryBlueprintGenerator();
  return generator.generateFactory(world, blueprint, position);
}
