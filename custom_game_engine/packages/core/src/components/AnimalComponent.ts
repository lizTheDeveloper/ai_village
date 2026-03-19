import type { Component } from '../ecs/Component.js';
import type { Position } from '../types.js';
import type { AnimalLifeStage, AnimalState } from '../types/AnimalTypes.js';

// ============================================================================
// Animal Genetics
// ============================================================================

export interface AnimalGeneTrait {
  allele1: number;    // 0–100
  allele2: number;    // 0–100
  expression: number; // mean of allele1 and allele2, 0–100
}

export interface AnimalGenetics {
  size: AnimalGeneTrait;
  strength: AnimalGeneTrait;
  speed: AnimalGeneTrait;
  health: AnimalGeneTrait;
  lifespan: AnimalGeneTrait;
  temperament: AnimalGeneTrait;
  intelligence: AnimalGeneTrait;
  trainability: AnimalGeneTrait;
  colorVariant: AnimalGeneTrait;
}

export interface AnimalMutation {
  traitAffected: keyof AnimalGenetics;
  effect: number;         // Numeric delta applied to expression
  beneficial: boolean;
  inheritChance: number;  // 0–1
}

const ANIMAL_TRAIT_KEYS: (keyof AnimalGenetics)[] = [
  'size', 'strength', 'speed', 'health', 'lifespan',
  'temperament', 'intelligence', 'trainability', 'colorVariant',
];

const BASE_VALUE = 50;
const ALLELE_VARIANCE = 20;

/**
 * Generate random animal genetics.
 * Each allele is BASE_VALUE ± ALLELE_VARIANCE, clamped to [0, 100].
 * Expression = mean(allele1, allele2).
 *
 * @param rng - Optional random number generator (defaults to Math.random).
 */
export function generateAnimalGenetics(rng: () => number = Math.random): AnimalGenetics {
  function makeTrait(): AnimalGeneTrait {
    const allele1 = Math.min(100, Math.max(0, BASE_VALUE + (rng() * 2 - 1) * ALLELE_VARIANCE));
    const allele2 = Math.min(100, Math.max(0, BASE_VALUE + (rng() * 2 - 1) * ALLELE_VARIANCE));
    return { allele1, allele2, expression: (allele1 + allele2) / 2 };
  }

  return {
    size:         makeTrait(),
    strength:     makeTrait(),
    speed:        makeTrait(),
    health:       makeTrait(),
    lifespan:     makeTrait(),
    temperament:  makeTrait(),
    intelligence: makeTrait(),
    trainability: makeTrait(),
    colorVariant: makeTrait(),
  };
}

/**
 * Inherit genetics from two parents using Mendelian allele selection.
 * Each offspring allele is drawn randomly from one of the two parental alleles.
 * Inherited mutations are applied to expression and clamped to [0, 100].
 *
 * @param parent1Genetics - First parent's genetics.
 * @param parent2Genetics - Second parent's genetics.
 * @param parent1Mutations - First parent's mutations eligible for inheritance.
 * @param parent2Mutations - Second parent's mutations eligible for inheritance.
 * @param rng - Random number generator.
 * @param mutationChance - Per-trait probability of a new spontaneous mutation (0–1).
 */
export function inheritAnimalGenetics(
  parent1Genetics: AnimalGenetics,
  parent2Genetics: AnimalGenetics,
  parent1Mutations: AnimalMutation[],
  parent2Mutations: AnimalMutation[],
  rng: () => number,
  mutationChance: number,
): { genetics: AnimalGenetics; mutations: AnimalMutation[] } {
  const offspringGenetics = {} as AnimalGenetics;

  for (const key of ANIMAL_TRAIT_KEYS) {
    const p1 = parent1Genetics[key];
    const p2 = parent2Genetics[key];

    // Mendelian: pick one allele from each parent randomly
    const allele1 = rng() < 0.5 ? p1.allele1 : p1.allele2;
    const allele2 = rng() < 0.5 ? p2.allele1 : p2.allele2;
    const baseExpression = (allele1 + allele2) / 2;

    offspringGenetics[key] = { allele1, allele2, expression: baseExpression };
  }

  // Collect inherited mutations from both parents
  const inheritedMutations: AnimalMutation[] = [];
  for (const mutation of [...parent1Mutations, ...parent2Mutations]) {
    if (rng() < mutation.inheritChance) {
      inheritedMutations.push({ ...mutation });
    }
  }

  // Apply inherited mutations to expression values
  for (const mutation of inheritedMutations) {
    const trait = offspringGenetics[mutation.traitAffected];
    trait.expression = Math.min(100, Math.max(0, trait.expression + mutation.effect));
  }

  // Spontaneous new mutations (if mutationChance > 0)
  if (mutationChance > 0) {
    for (const key of ANIMAL_TRAIT_KEYS) {
      if (rng() < mutationChance) {
        const effect = (rng() < 0.5 ? 1 : -1) * (5 + Math.floor(rng() * 16));
        const beneficial = effect > 0;
        inheritedMutations.push({ traitAffected: key, effect, beneficial, inheritChance: 0.5 });
        const trait = offspringGenetics[key];
        trait.expression = Math.min(100, Math.max(0, trait.expression + effect));
      }
    }
  }

  return { genetics: offspringGenetics, mutations: inheritedMutations };
}

// ============================================================================
// Animal Personality
// ============================================================================

export type AnimalPersonalityType = 'neutral' | 'skittish' | 'aggressive' | 'friendly';

export interface AnimalPersonality {
  fearfulness: number;    // 0–1, how easily frightened
  aggressiveness: number; // 0–1, tendency to attack
  curiosity: number;      // 0–1, interest in novelty
  sociability: number;    // 0–1, desire for company
}

/** Base trait values per personality type (all in [0, 1]) */
const PERSONALITY_BASES: Record<AnimalPersonalityType, AnimalPersonality> = {
  neutral:    { fearfulness: 0.5, aggressiveness: 0.3, curiosity: 0.5, sociability: 0.5 },
  skittish:   { fearfulness: 0.8, aggressiveness: 0.1, curiosity: 0.3, sociability: 0.4 },
  aggressive: { fearfulness: 0.3, aggressiveness: 0.8, curiosity: 0.4, sociability: 0.2 },
  friendly:   { fearfulness: 0.2, aggressiveness: 0.1, curiosity: 0.6, sociability: 0.85 },
};

/** Max random variance applied to each trait (±PERSONALITY_VARIANCE / 2) */
const PERSONALITY_VARIANCE = 0.2;

/**
 * Generate an AnimalPersonality for the given type, with optional random variance.
 * All trait values are clamped to [0, 1].
 *
 * @param type - Personality archetype to base traits on.
 * @param rng  - Optional RNG (defaults to Math.random). Accepts any () => number.
 */
export function generateAnimalPersonality(
  type: AnimalPersonalityType,
  rng: () => number = Math.random,
): AnimalPersonality {
  const base = PERSONALITY_BASES[type];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const vary = (base: number) => clamp(base + (rng() - 0.5) * PERSONALITY_VARIANCE);
  return {
    fearfulness:    vary(base.fearfulness),
    aggressiveness: vary(base.aggressiveness),
    curiosity:      vary(base.curiosity),
    sociability:    vary(base.sociability),
  };
}

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
  personality?: AnimalPersonality; // Optional personality traits
  groupId?: string; // Entity ID of herd/flock group (if grouped)
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
  personality?: AnimalPersonality;
  groupId?: string;
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
  public personality?: AnimalPersonality;
  public groupId?: string;

  /** Convenience getter: inverse of `wild`. Domesticated animals have wild=false. */
  get isDomesticated(): boolean {
    return !this.wild;
  }

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
    this.personality = data.personality; // Optional field
    this.groupId = data.groupId; // Optional field
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
