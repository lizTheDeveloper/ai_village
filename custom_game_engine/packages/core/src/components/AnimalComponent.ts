import type { Component } from '../ecs/Component.js';
import type { Position } from '../types.js';
import type { AnimalLifeStage, AnimalState } from '../types/AnimalTypes.js';

// Re-export for backwards compatibility
export type { AnimalLifeStage, AnimalState };

export interface AnimalComponentData {
  id: string;
  speciesId: string;
  name: string;
  position: Position;
  age: number; // Age in days
  lifeStage: AnimalLifeStage;
  health: number; // 0-100
  size: number; // Multiplier for rendering and collision
  state: AnimalState;
  hunger: number; // 0-100, 0 = full, 100 = starving
  thirst: number; // 0-100, 0 = hydrated, 100 = dehydrated
  energy: number; // 0-100, 0 = exhausted, 100 = energized
  stress: number; // 0-100, 0 = calm, 100 = panicked
  mood: number; // 0-100, 0 = miserable, 100 = happy
  wild: boolean; // true = wild, false = tamed
  ownerId?: string; // Entity ID of owner (if tamed)
  bondLevel: number; // 0-100, bond with owner
  trustLevel: number; // 0-100, trust in humans
  housingBuildingId?: string; // Entity ID of housing building (if housed)
}

export interface AnimalComponent extends Component {
  readonly type: 'animal';
  readonly id: string;
  readonly speciesId: string;
  name: string;
  position: Position;
  age: number;
  lifeStage: AnimalLifeStage;
  health: number;
  size: number;
  state: AnimalState;
  hunger: number;
  thirst: number;
  energy: number;
  stress: number;
  mood: number;
  wild: boolean;
  ownerId?: string;
  bondLevel: number;
  trustLevel: number;
  housingBuildingId?: string;
}

/**
 * Validates and creates an AnimalComponent.
 * Per CLAUDE.md: NO SILENT FALLBACKS - all required fields must be present.
 */
export class AnimalComponent implements Component {
  public readonly type = 'animal' as const;
  public readonly version = 1;

  public readonly id!: string;
  public readonly speciesId!: string;
  public name: string;
  public position: Position;
  public age: number;
  public lifeStage: AnimalLifeStage;
  public health: number;
  public size: number;
  public state: AnimalState;
  public hunger: number;
  public thirst: number;
  public energy: number;
  public stress: number;
  public mood: number;
  public wild: boolean;
  public ownerId?: string;
  public bondLevel: number;
  public trustLevel: number;
  public housingBuildingId?: string;

  constructor(data: AnimalComponentData) {
    // Validate all required fields - NO FALLBACKS
    if (data.id === undefined || data.id === null) {
      throw new Error('AnimalComponent requires "id" field');
    }
    if (data.speciesId === undefined || data.speciesId === null) {
      throw new Error('AnimalComponent requires "speciesId" field');
    }
    if (data.name === undefined || data.name === null) {
      throw new Error('AnimalComponent requires "name" field');
    }
    if (data.position === undefined || data.position === null) {
      throw new Error('AnimalComponent requires "position" field');
    }
    if (data.age === undefined || data.age === null) {
      throw new Error('AnimalComponent requires "age" field');
    }
    if (data.lifeStage === undefined || data.lifeStage === null) {
      throw new Error('AnimalComponent requires "lifeStage" field');
    }
    if (data.health === undefined || data.health === null) {
      throw new Error('AnimalComponent requires "health" field');
    }
    if (data.size === undefined || data.size === null) {
      throw new Error('AnimalComponent requires "size" field');
    }
    if (data.state === undefined || data.state === null) {
      throw new Error('AnimalComponent requires "state" field');
    }
    if (data.hunger === undefined || data.hunger === null) {
      throw new Error('AnimalComponent requires "hunger" field');
    }
    if (data.thirst === undefined || data.thirst === null) {
      throw new Error('AnimalComponent requires "thirst" field');
    }
    if (data.energy === undefined || data.energy === null) {
      throw new Error('AnimalComponent requires "energy" field');
    }
    if (data.stress === undefined || data.stress === null) {
      throw new Error('AnimalComponent requires "stress" field');
    }
    if (data.mood === undefined || data.mood === null) {
      throw new Error('AnimalComponent requires "mood" field');
    }
    if (data.wild === undefined || data.wild === null) {
      throw new Error('AnimalComponent requires "wild" field');
    }
    if (data.bondLevel === undefined || data.bondLevel === null) {
      throw new Error('AnimalComponent requires "bondLevel" field');
    }
    if (data.trustLevel === undefined || data.trustLevel === null) {
      throw new Error('AnimalComponent requires "trustLevel" field');
    }

    // Assign all fields
    // Use Object.assign to bypass readonly restriction for initialization
    Object.assign(this, { id: data.id, speciesId: data.speciesId });
    this.name = data.name;
    this.position = data.position;
    this.age = data.age;
    this.lifeStage = data.lifeStage;
    this.health = data.health;
    this.size = data.size;
    this.state = data.state;
    this.hunger = data.hunger;
    this.thirst = data.thirst;
    this.energy = data.energy;
    this.stress = data.stress;
    this.mood = data.mood;
    this.wild = data.wild;
    this.ownerId = data.ownerId; // Optional field
    this.bondLevel = data.bondLevel;
    this.trustLevel = data.trustLevel;
    this.housingBuildingId = data.housingBuildingId; // Optional field
  }
}

/**
 * Helper to check if animal is hungry (hunger > 60)
 */
export function isAnimalHungry(animal: AnimalComponent): boolean {
  return animal.hunger > 60;
}

/**
 * Helper to check if animal is thirsty (thirst > 60)
 */
export function isAnimalThirsty(animal: AnimalComponent): boolean {
  return animal.thirst > 60;
}

/**
 * Helper to check if animal is tired (energy < 30)
 */
export function isAnimalTired(animal: AnimalComponent): boolean {
  return animal.energy < 30;
}

/**
 * Helper to check if animal is stressed (stress > 70)
 */
export function isAnimalStressed(animal: AnimalComponent): boolean {
  return animal.stress > 70;
}
