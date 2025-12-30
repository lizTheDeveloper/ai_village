import { ComponentBase } from '../ecs/Component.js';
import type { PlantGenetics } from './PlantComponent.js';

export interface HarvestMetadata {
  fromPlantId?: string;
  byAgentId?: string;
  timestamp?: number;
}

export interface DormancyRequirements {
  requiresColdStratification?: boolean;
  coldDaysRequired?: number;
  requiresLight?: boolean;
  requiresScarification?: boolean;
}

export interface SeedComponentData {
  speciesId: string;
  genetics: PlantGenetics;
  generation?: number;
  parentPlantIds?: string[];
  viability?: number;
  vigor?: number;
  quality?: number;
  ageInDays?: number;
  dormant?: boolean;
  dormancyRequirements?: DormancyRequirements;
  sourceType?: 'wild' | 'cultivated' | 'traded' | 'generated';
  harvestMetadata?: HarvestMetadata;
  /** Whether this seed is from cross-breeding */
  isHybrid?: boolean;
  /** Parent species IDs if hybrid */
  hybridParentSpecies?: [string, string];
}

/**
 * SeedComponent represents a seed entity that can germinate into a plant
 */
export class SeedComponent extends ComponentBase {
  public readonly type = 'seed' as const;
  public id: string;
  public speciesId: string;

  // Genetics
  public genetics: PlantGenetics;
  public generation: number;
  public parentPlantIds: string[];

  // Quality
  public viability: number;  // 0-1 chance to germinate
  public vigor: number;      // Growth speed modifier (0-100)
  public quality: number;    // Affects offspring quality (0-1)

  // State
  public ageInDays: number;  // Days since produced
  public dormant: boolean;   // Needs conditions to break
  public dormancyRequirements?: DormancyRequirements;

  // Origin tracking
  public sourceType: 'wild' | 'cultivated' | 'traded' | 'generated';
  public harvestMetadata?: HarvestMetadata;

  // Hybridization
  public isHybrid: boolean;
  public hybridParentSpecies?: [string, string];

  constructor(data: SeedComponentData) {
    super();

    // REQUIRED: speciesId
    if (!data.speciesId) {
      throw new Error('SeedComponent requires speciesId');
    }
    this.speciesId = data.speciesId;

    // REQUIRED: genetics
    if (!data.genetics) {
      throw new Error('SeedComponent requires genetics');
    }
    this.genetics = { ...data.genetics };

    // REQUIRED: viability
    if (data.viability === undefined) {
      throw new Error('SeedComponent requires viability');
    }
    if (data.viability < 0 || data.viability > 1) {
      throw new Error(`SeedComponent viability must be 0-1, got ${data.viability}`);
    }
    this.viability = data.viability;

    // Validate genetics ranges (0-1 for most traits)
    this.validateGenetics(data.genetics);

    // Generate unique ID
    this.id = `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.generation = data.generation ?? 0;
    this.parentPlantIds = data.parentPlantIds ?? [];

    // Quality values
    this.vigor = data.vigor ?? 1.0;
    this.quality = data.quality ?? 0.75;

    // State
    this.ageInDays = data.ageInDays ?? 0;
    this.dormant = data.dormant ?? false;
    this.dormancyRequirements = data.dormancyRequirements;

    // Origin
    this.sourceType = data.sourceType ?? 'generated';
    this.harvestMetadata = data.harvestMetadata;

    // Hybridization
    this.isHybrid = data.isHybrid ?? false;
    this.hybridParentSpecies = data.hybridParentSpecies;
  }

  /**
   * Validate genetics values are in correct ranges
   */
  private validateGenetics(genetics: PlantGenetics): void {
    // growthRate and yieldAmount can be up to 3.5 for hybrids
    const maxGrowthYield = 3.5;
    if (genetics.growthRate < 0 || genetics.growthRate > maxGrowthYield) {
      throw new Error(`SeedComponent genetics.growthRate must be 0-${maxGrowthYield}, got ${genetics.growthRate}`);
    }
    if (genetics.yieldAmount < 0 || genetics.yieldAmount > maxGrowthYield) {
      throw new Error(`SeedComponent genetics.yieldAmount must be 0-${maxGrowthYield}, got ${genetics.yieldAmount}`);
    }

    // Resistance traits are 0-100
    const resistanceTraits = [
      { name: 'diseaseResistance', value: genetics.diseaseResistance },
      { name: 'droughtTolerance', value: genetics.droughtTolerance },
      { name: 'coldTolerance', value: genetics.coldTolerance },
      { name: 'flavorProfile', value: genetics.flavorProfile }
    ];

    for (const trait of resistanceTraits) {
      if (trait.value < 0 || trait.value > 100) {
        throw new Error(`SeedComponent genetics.${trait.name} must be 0-100, got ${trait.value}`);
      }
    }
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): any {
    return {
      id: this.id,
      speciesId: this.speciesId,
      genetics: this.genetics,
      generation: this.generation,
      parentPlantIds: this.parentPlantIds,
      viability: this.viability,
      vigor: this.vigor,
      quality: this.quality,
      ageInDays: this.ageInDays,
      dormant: this.dormant,
      dormancyRequirements: this.dormancyRequirements,
      sourceType: this.sourceType,
      harvestMetadata: this.harvestMetadata,
      isHybrid: this.isHybrid,
      hybridParentSpecies: this.hybridParentSpecies
    };
  }

  /**
   * Deserialize from JSON
   */
  public static fromJSON(data: any): SeedComponent {
    return new SeedComponent(data);
  }
}
