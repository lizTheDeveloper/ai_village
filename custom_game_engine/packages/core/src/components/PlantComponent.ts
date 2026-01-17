import { ComponentBase } from '../ecs/Component';
import type { PlantDiseaseState, PlantPestState } from '../types/PlantDisease.js';

/**
 * PlantStage represents the 11 distinct lifecycle stages of a plant
 */
export type PlantStage =
  | 'seed'
  | 'germinating'
  | 'sprout'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'mature'
  | 'seeding'
  | 'senescence'
  | 'decay'
  | 'dead';

/**
 * PlantGenetics defines inheritable traits that affect plant behavior
 */
export interface PlantGenetics {
  growthRate: number;         // Speed modifier (0.5 - 2.0)
  yieldAmount: number;        // Production multiplier (0.5 - 2.0)
  diseaseResistance: number;  // 0-100
  droughtTolerance: number;   // 0-100
  coldTolerance: number;      // 0-100
  flavorProfile: number;      // Affects food quality (0-100)
  matureHeight?: number;      // Height in voxels when mature (sampled from species heightRange, normal distribution)
  mutations?: GeneticMutation[];  // Optional - new plants start without mutations
}

export interface GeneticMutation {
  trait: string;              // Which trait was mutated
  delta: number;              // How much it changed
  generation: number;         // When it occurred
}

export interface PlantComponentData {
  speciesId: string;
  position: { x: number; y: number };
  stage?: PlantStage;
  age?: number;
  generation?: number;
  stageProgress?: number;
  growthStage?: number;
  health?: number;
  hydration?: number;
  nutrition?: number;
  genetics?: PlantGenetics;
  flowerCount?: number;
  fruitCount?: number;
  seedsProduced?: number;
  seedsDropped?: Array<{ x: number; y: number }>;
  geneticQuality?: number;
  careQuality?: number;
  environmentMatch?: number;
  visualVariant?: number;
  currentSprite?: string;
  isIndoors?: boolean;
  planted?: boolean; // True if planted by agent, false if wild/natural
  // Harvest behavior (copied from species at creation)
  harvestDestroysPlant?: boolean;
  harvestResetStage?: 'flowering' | 'fruiting' | 'vegetative';
  // Shade properties (trees provide shade when tall/mature)
  providesShade?: boolean;
  shadeRadius?: number;
  // Disease and pest state
  diseases?: PlantDiseaseState[];
  pests?: PlantPestState[];
}

/**
 * PlantComponent represents a living plant entity with full lifecycle tracking
 */
export class PlantComponent extends ComponentBase {
  public readonly type = 'plant' as const;

  // Identity
  public speciesId: string;
  private _position: { x: number; y: number };

  // Life cycle
  public stage: PlantStage;
  public stageProgress: number;
  public age: number;
  public generation: number;
  public growthStage?: number; // 0-1, overall growth progress (computed from stage + stageProgress)

  // Health (0-100, clamped)
  private _health: number;
  private _hydration: number;
  private _nutrition: number;

  // Reproduction
  public flowerCount: number;
  public fruitCount: number;
  public seedsProduced: number;
  public seedsDropped: Array<{ x: number; y: number }>;

  // Quality factors
  public geneticQuality: number;
  public careQuality: number;
  public environmentMatch: number;

  // Genetics
  public genetics: PlantGenetics;

  // Visual
  public visualVariant: number;
  public currentSprite: string;

  // Environment
  public isIndoors: boolean;

  // Origin (agent-planted vs natural/wild)
  public planted: boolean;

  // Harvest behavior
  public harvestDestroysPlant: boolean;
  public harvestResetStage: 'flowering' | 'fruiting' | 'vegetative';

  // Shade properties (trees provide shade when tall/mature)
  public providesShade: boolean;
  public shadeRadius: number;

  // Disease and pest state
  public diseases: PlantDiseaseState[];
  public pests: PlantPestState[];

  constructor(data: PlantComponentData) {
    super();

    // REQUIRED: speciesId must be provided
    if (!data.speciesId) {
      throw new Error('PlantComponent requires speciesId');
    }
    this.speciesId = data.speciesId;

    // REQUIRED: position must be provided
    if (!data.position) {
      throw new Error('PlantComponent requires position');
    }
    if (isNaN(data.position.x) || isNaN(data.position.y)) {
      throw new Error('PlantComponent requires valid position coordinates');
    }
    this._position = { ...data.position };

    // Stage validation
    const validStages: PlantStage[] = [
      'seed',
      'germinating',
      'sprout',
      'vegetative',
      'flowering',
      'fruiting',
      'mature',
      'seeding',
      'senescence',
      'decay',
      'dead'
    ];

    if (data.stage !== undefined && !validStages.includes(data.stage)) {
      throw new Error(`Invalid plant stage: ${data.stage}`);
    }

    this.stage = data.stage ?? 'seed';
    this.stageProgress = data.stageProgress ?? 0;
    this.age = data.age ?? 0;
    this.generation = data.generation ?? 0;
    this.growthStage = data.growthStage;

    // Health values with more realistic defaults
    // Plants start slightly dehydrated to make health decay observable
    this._health = data.health ?? 85;
    this._hydration = data.hydration ?? 50;  // Half-full, needs watering
    this._nutrition = data.nutrition ?? 70;  // Good soil

    // Reproduction
    this.flowerCount = data.flowerCount ?? 0;
    this.fruitCount = data.fruitCount ?? 0;
    this.seedsProduced = data.seedsProduced ?? 0;
    this.seedsDropped = data.seedsDropped ?? [];

    // Quality (OK to use defaults for these)
    this.geneticQuality = data.geneticQuality ?? 75;
    this.careQuality = data.careQuality ?? 100;
    this.environmentMatch = data.environmentMatch ?? 75;

    // Genetics - use provided or create default
    if (data.genetics) {
      this.validateGenetics(data.genetics);
      this.genetics = { ...data.genetics };
    } else {
      this.genetics = this.createDefaultGenetics();
    }

    // Visual
    this.visualVariant = data.visualVariant ?? Math.floor(Math.random() * 100);
    this.currentSprite = data.currentSprite ?? '';

    // Environment
    this.isIndoors = data.isIndoors ?? false;

    // Origin (default: false for wild/natural plants)
    this.planted = data.planted ?? false;

    // Harvest behavior (default: destroy plant on harvest, reset to fruiting if not destroyed)
    this.harvestDestroysPlant = data.harvestDestroysPlant ?? true;
    this.harvestResetStage = data.harvestResetStage ?? 'fruiting';

    // Shade properties (default: no shade)
    this.providesShade = data.providesShade ?? false;
    this.shadeRadius = data.shadeRadius ?? 0;

    // Disease and pest state (default: empty arrays)
    this.diseases = data.diseases ? [...data.diseases] : [];
    this.pests = data.pests ? [...data.pests] : [];
  }

  /**
   * Validate genetics values
   */
  private validateGenetics(genetics: PlantGenetics): void {
    if (genetics.growthRate < 0) {
      throw new Error('PlantComponent genetics.growthRate must be >= 0');
    }
    if (genetics.yieldAmount < 0) {
      throw new Error('PlantComponent genetics.yieldAmount must be >= 0');
    }

    const resistanceFields = [
      'diseaseResistance',
      'droughtTolerance',
      'coldTolerance',
      'flavorProfile'
    ] as const;

    for (const field of resistanceFields) {
      const value = genetics[field];
      if (value < 0 || value > 100) {
        throw new Error(`PlantComponent genetics.${field} (resistance) must be 0-100, got ${value}`);
      }
    }
  }

  /**
   * Create default genetics for a plant
   */
  private createDefaultGenetics(): PlantGenetics {
    return {
      growthRate: 1.0,
      yieldAmount: 1.0,
      diseaseResistance: 50,
      droughtTolerance: 50,
      coldTolerance: 50,
      flavorProfile: 50,
      mutations: []
    };
  }

  // Health getters/setters with clamping
  public get health(): number {
    return this._health;
  }

  public set health(value: number) {
    this._health = Math.max(0, Math.min(100, value));
  }

  public get hydration(): number {
    return this._hydration;
  }

  public set hydration(value: number) {
    this._hydration = Math.max(0, Math.min(100, value));
  }

  public get nutrition(): number {
    return this._nutrition;
  }

  public set nutrition(value: number) {
    this._nutrition = Math.max(0, Math.min(100, value));
  }

  public get position(): { x: number; y: number } {
    return this._position;
  }

  public set position(value: { x: number; y: number }) {
    this._position = { ...value };
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): any {
    return {
      speciesId: this.speciesId,
      position: this.position,
      stage: this.stage,
      stageProgress: this.stageProgress,
      age: this.age,
      generation: this.generation,
      growthStage: this.growthStage,
      health: this.health,
      hydration: this.hydration,
      nutrition: this.nutrition,
      genetics: this.genetics,
      flowerCount: this.flowerCount,
      fruitCount: this.fruitCount,
      seedsProduced: this.seedsProduced,
      seedsDropped: this.seedsDropped,
      geneticQuality: this.geneticQuality,
      careQuality: this.careQuality,
      environmentMatch: this.environmentMatch,
      visualVariant: this.visualVariant,
      currentSprite: this.currentSprite,
      isIndoors: this.isIndoors,
      planted: this.planted,
      harvestDestroysPlant: this.harvestDestroysPlant,
      harvestResetStage: this.harvestResetStage,
      providesShade: this.providesShade,
      shadeRadius: this.shadeRadius,
      diseases: this.diseases,
      pests: this.pests
    };
  }

  /**
   * Deserialize from JSON
   */
  public static fromJSON(data: any): PlantComponent {
    return new PlantComponent(data);
  }
}
