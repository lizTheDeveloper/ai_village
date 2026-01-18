/**
 * SpeciesCreationSystem - Phase 9: World Impact
 *
 * Allows deities to create new species or modify existing ones.
 * Creation powers include:
 * - Creating new animal species
 * - Creating new plant species
 * - Modifying existing species (divine blessing/curse)
 * - Creating sacred animals
 * - Creating mythical creatures
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

// ============================================================================
// Species Creation Types
// ============================================================================

export interface CreatedSpecies {
  id: string;

  /** Deity who created this species */
  creatorDeityId: string;

  /** Species name */
  name: string;

  /** Species type */
  type: SpeciesType;

  /** Creation method */
  creationMethod: CreationMethod;

  /** When created */
  createdAt: number;

  /** Belief cost */
  cost: number;

  /** Species traits */
  traits: CreatedSpeciesTrait[];

  /** Initial population */
  initialPopulation: number;

  /** Current population */
  currentPopulation: number;

  /** Sacred status */
  sacred: boolean;

  /** If sacred, to which deity */
  sacredTo?: string;
}

export type SpeciesType =
  | 'animal'       // Normal animal
  | 'plant'        // Normal plant
  | 'mythical'     // Mythical creature
  | 'sacred'       // Sacred animal/plant
  | 'monster';     // Hostile creature

export type CreationMethod =
  | 'divine_will'       // Created from nothing
  | 'modification'      // Modified existing species
  | 'breeding'          // Guided breeding program
  | 'transmutation'     // Changed one species to another
  | 'spontaneous';      // Emerged from belief

export interface CreatedSpeciesTrait {
  name: string;
  description: string;
  type: 'physical' | 'behavioral' | 'magical' | 'sacred';
  magnitude: number; // 0-1
}

// ============================================================================
// Creation Configuration
// ============================================================================

export interface SpeciesCreationConfig {
  /** How often to update species (ticks) */
  updateInterval: number;

  /** Base costs for creation */
  creationCosts: Record<SpeciesType, number>;

  /** Minimum belief required */
  minBeliefRequired: number;
}

export const DEFAULT_SPECIES_CREATION_CONFIG: SpeciesCreationConfig = {
  updateInterval: 600, // ~30 seconds at 20 TPS
  minBeliefRequired: 1500,
  creationCosts: {
    animal: 800,
    plant: 500,
    mythical: 3000,
    sacred: 2000,
    monster: 2500,
  },
};

// ============================================================================
// SpeciesCreationSystem
// ============================================================================

export class SpeciesCreationSystem extends BaseSystem {
  public readonly id = 'SpeciesCreationSystem';
  public readonly name = 'SpeciesCreationSystem';
  public readonly priority = 71;
  public readonly requiredComponents = [];

  private config: SpeciesCreationConfig;
  private species: Map<string, CreatedSpecies> = new Map();
  private lastUpdate: number = 0;

  constructor(config: Partial<SpeciesCreationConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_SPECIES_CREATION_CONFIG,
      ...config,
      creationCosts: { ...DEFAULT_SPECIES_CREATION_CONFIG.creationCosts, ...config.creationCosts },
    };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    if (currentTick - this.lastUpdate < this.config.updateInterval) {
      return;
    }

    this.lastUpdate = currentTick;

    // Update species populations
    this.updateSpeciesPopulations(ctx.world);
  }

  /**
   * Create a new species
   */
  createSpecies(
    deityId: string,
    world: World,
    name: string,
    type: SpeciesType,
    traits: CreatedSpeciesTrait[],
    initialPopulation: number = 2,
    sacred: boolean = false
  ): CreatedSpecies | null {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return null;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return null;

    // Calculate cost
    const cost = this.calculateCreationCost(type, traits, initialPopulation);

    // Check if deity has enough belief
    if (!deity.spendBelief(cost)) {
      return null;
    }

    // Create species
    const species: CreatedSpecies = {
      id: `species_${Date.now()}`,
      creatorDeityId: deityId,
      name,
      type,
      creationMethod: 'divine_will',
      createdAt: world.tick,
      cost,
      traits,
      initialPopulation,
      currentPopulation: initialPopulation,
      sacred,
      sacredTo: sacred ? deityId : undefined,
    };

    this.species.set(species.id, species);

    // Spawn initial population
    this.spawnInitialPopulation(world, species);

    // If sacred, add to deity's sacred animals
    if (sacred) {
      deity.identity.sacredAnimals.push(name);
    }

    // In full implementation, would emit event
    // world.eventBus.emit({ type: 'species_created', ... });

    return species;
  }

  /**
   * Calculate creation cost
   */
  private calculateCreationCost(
    type: SpeciesType,
    traits: CreatedSpeciesTrait[],
    population: number
  ): number {
    const baseCost = this.config.creationCosts[type];

    // Scale by trait complexity
    const traitCost = traits.reduce((sum, trait) => sum + trait.magnitude * 100, 0);

    // Scale by initial population
    const populationCost = population * 50;

    return Math.floor(baseCost + traitCost + populationCost);
  }

  /**
   * Spawn initial population
   */
  private spawnInitialPopulation(_world: World, _species: CreatedSpecies): void {
    // In full implementation, would spawn actual entities
    // For now, just track the creation

    // Example of what would happen:
    // for (let i = 0; i < species.initialPopulation; i++) {
    //   const entity = world.createEntity();
    //   // Add animal component with species.name as species
    //   // Add position, behavior, etc.
    // }
  }

  /**
   * Modify an existing species
   */
  modifySpecies(
    deityId: string,
    world: World,
    targetSpeciesName: string,
    newTraits: CreatedSpeciesTrait[],
    cost: number = 500
  ): boolean {
    // Find deity
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return false;

    const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deity) return false;

    // Check belief
    if (!deity.spendBelief(cost)) {
      return false;
    }

    // Find existing species
    const targetSpecies = Array.from(this.species.values()).find(
      s => s.name === targetSpeciesName
    );

    if (targetSpecies) {
      // Modify existing tracked species
      targetSpecies.traits.push(...newTraits);
    }

    // In full implementation, would modify actual entities of this species

    // In full implementation, would emit event
    // world.eventBus.emit({ type: 'species_modified', ... });

    return true;
  }

  /**
   * Update species populations
   */
  private updateSpeciesPopulations(_world: World): void {
    // In full implementation, would count actual entities
    // For now, simulate simple population growth/decline

    for (const species of this.species.values()) {
      // Simple growth model
      const growthRate = 0.01; // 1% per update
      const randomFactor = (Math.random() - 0.5) * 0.02; // +/- 1% random

      const change = species.currentPopulation * (growthRate + randomFactor);
      species.currentPopulation = Math.max(0, species.currentPopulation + change);
    }
  }

  /**
   * Create a sacred animal for a deity
   */
  createSacredAnimal(
    deityId: string,
    world: World,
    animalName: string
  ): CreatedSpecies | null {
    const traits: CreatedSpeciesTrait[] = [
      {
        name: 'Divine Blessing',
        description: 'Blessed by deity, brings good fortune',
        type: 'sacred',
        magnitude: 1.0,
      },
      {
        name: 'Sacred Aura',
        description: 'Cannot be harmed by believers',
        type: 'magical',
        magnitude: 0.8,
      },
    ];

    return this.createSpecies(deityId, world, animalName, 'sacred', traits, 5, true);
  }

  /**
   * Create a mythical creature
   */
  createMythicalCreature(
    deityId: string,
    world: World,
    creatureName: string,
    traits: CreatedSpeciesTrait[]
  ): CreatedSpecies | null {
    return this.createSpecies(deityId, world, creatureName, 'mythical', traits, 1, true);
  }

  /**
   * Get species
   */
  getSpecies(speciesId: string): CreatedSpecies | undefined {
    return this.species.get(speciesId);
  }

  /**
   * Get all species created by a deity
   */
  getSpeciesCreatedBy(deityId: string): CreatedSpecies[] {
    return Array.from(this.species.values())
      .filter(s => s.creatorDeityId === deityId);
  }

  /**
   * Get all sacred species
   */
  getSacredSpecies(): CreatedSpecies[] {
    return Array.from(this.species.values())
      .filter(s => s.sacred);
  }
}
