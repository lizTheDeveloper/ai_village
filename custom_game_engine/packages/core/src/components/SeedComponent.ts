import { ComponentBase } from '../ecs/Component.js';
import type { PlantGenetics } from './PlantComponent.js';

export interface SeedComponentData {
  speciesId: string;
  genetics: PlantGenetics;
  generation?: number;
  parentPlants?: [string, string] | null;
  viability?: number;
  vigor?: number;
  quality?: number;
  age?: number;
  dormant?: boolean;
  dormancyRequirements?: {
    coldDays?: number;
    lightExposure?: boolean;
    scarification?: boolean;
  };
  source?: 'wild' | 'cultivated' | 'traded' | 'generated';
  harvestedFrom?: string;
  harvestedBy?: string;
  harvestedAt?: number;
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
  public parentPlants: [string, string] | null;

  // Quality
  public viability: number;  // 0-1 chance to germinate
  public vigor: number;      // Growth speed modifier
  public quality: number;    // Affects offspring quality

  // State
  public age: number;        // Days since produced
  public dormant: boolean;   // Needs conditions to break
  public dormancyRequirements?: {
    coldDays?: number;
    lightExposure?: boolean;
    scarification?: boolean;
  };

  // Origin tracking
  public source: 'wild' | 'cultivated' | 'traded' | 'generated';
  public harvestedFrom?: string;  // Plant ID
  public harvestedBy?: string;    // Agent ID
  public harvestedAt?: number;    // Game time

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

    // Generate unique ID
    this.id = `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.generation = data.generation ?? 0;
    this.parentPlants = data.parentPlants ?? null;

    // Quality values
    this.viability = data.viability ?? 0.8;
    this.vigor = data.vigor ?? 75;
    this.quality = data.quality ?? 75;

    // State
    this.age = data.age ?? 0;
    this.dormant = data.dormant ?? false;
    this.dormancyRequirements = data.dormancyRequirements;

    // Origin
    this.source = data.source ?? 'generated';
    this.harvestedFrom = data.harvestedFrom;
    this.harvestedBy = data.harvestedBy;
    this.harvestedAt = data.harvestedAt;
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
      parentPlants: this.parentPlants,
      viability: this.viability,
      vigor: this.vigor,
      quality: this.quality,
      age: this.age,
      dormant: this.dormant,
      dormancyRequirements: this.dormancyRequirements,
      source: this.source,
      harvestedFrom: this.harvestedFrom,
      harvestedBy: this.harvestedBy,
      harvestedAt: this.harvestedAt
    };
  }

  /**
   * Deserialize from JSON
   */
  public static fromJSON(data: any): SeedComponent {
    return new SeedComponent(data);
  }
}
