import type { PlantStage, PlantGenetics } from '../components/PlantComponent.js';

export type PlantCategory =
  | 'crop'
  | 'herb'
  | 'tree'
  | 'flower'
  | 'fungus'
  | 'magical_herb'
  | 'grass'
  | 'weed';

export interface TransitionConditions {
  // Environmental
  minTemperature?: number;
  maxTemperature?: number;
  minHydration?: number;
  minNutrition?: number;
  minLight?: number;
  season?: string[];

  // Health
  minHealth?: number;

  // Special
  requiresPollination?: boolean;
  requiresFrost?: boolean;
}

export interface TransitionEffect {
  type: string;
  params?: any;
}

export interface StageTransition {
  from: PlantStage;
  to: PlantStage;
  baseDuration: number;  // Days in ideal conditions
  conditions: TransitionConditions;
  onTransition: TransitionEffect[];
}

export interface PlantSprites {
  seed: string;
  sprout: string;
  vegetative: string;
  flowering: string;
  fruiting: string;
  mature: string;
  seeding: string;
  withered: string;
}

export interface PlantProperties {
  edible?: boolean;
  medicinal?: boolean;
  magical?: boolean;
  toxic?: boolean;
  fiber?: boolean;
  dye?: boolean;
}

export interface PlantSpecies {
  id: string;
  name: string;
  category: PlantCategory;

  // Where it grows naturally
  biomes: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

  // Lifecycle configuration
  stageTransitions: StageTransition[];

  // Base genetics
  baseGenetics: PlantGenetics;

  // Seed production
  seedsPerPlant: number;
  seedDispersalRadius: number;
  requiresDormancy: boolean;

  // Environmental preferences
  optimalTemperatureRange: [number, number];
  optimalMoistureRange: [number, number];
  preferredSeasons: string[];

  // Properties
  properties: PlantProperties;

  // Visual
  sprites: PlantSprites;
}
