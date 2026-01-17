import { ComponentBase } from '../ecs/Component.js';

/**
 * Discovery methods for plant properties
 */
export type DiscoveryMethod =
  | 'experimentation'  // Agent tried it themselves
  | 'taught'           // Another agent taught them
  | 'observation'      // Watched another agent/animal
  | 'accident'         // Discovered by accident
  | 'innate';          // Starting knowledge

/**
 * Confidence level in knowledge (increases with repeated use/observation)
 */
export type ConfidenceLevel = 'uncertain' | 'likely' | 'confident' | 'certain';

/**
 * What an agent knows about a specific plant's medicinal properties
 */
export interface KnownMedicinalProperties {
  /** Known ailments it treats (may be partial) */
  knownTreats?: string[];
  /** Estimated effectiveness */
  estimatedEffectiveness?: number;
  /** Known preparation methods */
  knownPreparations?: string[];
  /** Known side effects */
  knownSideEffects?: string[];
  /** Whether agent knows it's toxic if overused */
  knowsToxicity?: boolean;
}

/**
 * What an agent knows about a specific plant's magical properties
 */
export interface KnownMagicalProperties {
  /** Known magic type */
  knownMagicType?: string;
  /** Estimated potency */
  estimatedPotency?: number;
  /** Known effects */
  knownEffects?: string[];
  /** Known harvest conditions */
  knownHarvestConditions?: string[];
}

/**
 * What an agent knows about a specific plant's crafting uses
 */
export interface KnownCraftingProperties {
  /** Known dye color */
  knownDyeColor?: string;
  /** Known fiber uses */
  knowsFiber?: boolean;
  /** Known oil uses */
  knowsOil?: boolean;
  /** Known scent profile */
  knownScent?: string;
  /** Known poison properties */
  knowsPoison?: boolean;
  /** Known structural uses */
  knowsStructural?: boolean;
}

/**
 * Complete knowledge about a single plant species
 */
export interface PlantKnowledgeEntry {
  plantId: string;

  /** Basic properties */
  knowsEdible: boolean | 'unknown';
  knowsToxic: boolean | 'unknown';

  /** Complex property knowledge */
  medicinal: KnownMedicinalProperties | 'unknown';
  magical: KnownMagicalProperties | 'unknown';
  crafting: KnownCraftingProperties | 'unknown';

  /** How the agent learned this */
  discoveryMethod: DiscoveryMethod;
  discoveredAt: number;  // Game time
  taughtBy?: string;     // Agent ID if taught

  /** Confidence in knowledge */
  confidence: ConfidenceLevel;
  usageCount: number;    // How many times used successfully

  /** Misconceptions the agent holds */
  misconceptions?: string[];
}

/**
 * Data structure for PlantKnowledgeComponent
 */
export interface PlantKnowledgeData {
  /** Knowledge entries keyed by plant species ID */
  knowledge?: Record<string, PlantKnowledgeEntry>;
  /** Plants the agent has never encountered */
  encounteredPlants?: string[];
  /** Skill in discovering plant properties */
  herbalistSkill?: number;
}

/**
 * Component tracking an agent's knowledge about plants and their properties
 * Agents must discover properties through experimentation, teaching, or observation
 */
export class PlantKnowledgeComponent extends ComponentBase {
  public readonly type = 'plant_knowledge' as const;

  /** Knowledge entries keyed by plant species ID */
  private _knowledge: Map<string, PlantKnowledgeEntry>;

  /** Plants the agent has encountered but not studied */
  private _encounteredPlants: Set<string>;

  /** Skill in discovering plant properties (0-100) */
  public herbalistSkill: number;

  constructor(data: PlantKnowledgeData = {}) {
    super();
    this._knowledge = new Map();
    this._encounteredPlants = new Set(data.encounteredPlants || []);
    this.herbalistSkill = data.herbalistSkill ?? 10;

    // Load existing knowledge
    if (data.knowledge) {
      for (const [plantId, entry] of Object.entries(data.knowledge)) {
        this._knowledge.set(plantId, entry);
      }
    }
  }

  /**
   * Check if agent has any knowledge about a plant
   */
  public hasKnowledge(plantId: string): boolean {
    return this._knowledge.has(plantId);
  }

  /**
   * Get knowledge about a specific plant
   */
  public getKnowledge(plantId: string): PlantKnowledgeEntry | undefined {
    return this._knowledge.get(plantId);
  }

  /**
   * Get all plant knowledge
   */
  public getAllKnowledge(): Map<string, PlantKnowledgeEntry> {
    return new Map(this._knowledge);
  }

  /**
   * Get plants with known medicinal properties
   */
  public getKnownMedicinalPlants(): PlantKnowledgeEntry[] {
    return Array.from(this._knowledge.values())
      .filter(entry => entry.medicinal !== 'unknown');
  }

  /**
   * Get plants with known magical properties
   */
  public getKnownMagicalPlants(): PlantKnowledgeEntry[] {
    return Array.from(this._knowledge.values())
      .filter(entry => entry.magical !== 'unknown');
  }

  /**
   * Record that the agent has encountered a plant
   */
  public recordEncounter(plantId: string): void {
    this._encounteredPlants.add(plantId);
  }

  /**
   * Check if agent has encountered a plant before
   */
  public hasEncountered(plantId: string): boolean {
    return this._encounteredPlants.has(plantId) || this._knowledge.has(plantId);
  }

  /**
   * Add or update knowledge about a plant through discovery
   */
  public discoverProperty(
    plantId: string,
    property: 'edible' | 'toxic' | 'medicinal' | 'magical' | 'crafting',
    value: unknown,
    method: DiscoveryMethod,
    gameTime: number,
    taughtBy?: string
  ): void {
    let entry = this._knowledge.get(plantId);

    if (!entry) {
      // Create new entry
      entry = {
        plantId,
        knowsEdible: 'unknown',
        knowsToxic: 'unknown',
        medicinal: 'unknown',
        magical: 'unknown',
        crafting: 'unknown',
        discoveryMethod: method,
        discoveredAt: gameTime,
        taughtBy,
        confidence: method === 'taught' ? 'likely' : 'uncertain',
        usageCount: 0
      };
      this._knowledge.set(plantId, entry);
    }

    // Update the specific property with type-safe operations
    switch (property) {
      case 'edible': {
        // Type guard: edible accepts boolean or objects with edible info
        // Convert objects to boolean (presence of edible properties = true)
        let isEdible: boolean;
        if (typeof value === 'boolean') {
          isEdible = value;
        } else if (typeof value === 'object' && value !== null) {
          // EdibleProperties object - treat as edible=true
          isEdible = true;
        } else {
          throw new Error(`Expected boolean or EdibleProperties object for 'edible' property, got ${typeof value}`);
        }
        entry.knowsEdible = isEdible;
        break;
      }
      case 'toxic': {
        // Type guard: toxic properties expect boolean values
        if (typeof value !== 'boolean') {
          throw new Error(`Expected boolean value for 'toxic' property, got ${typeof value}`);
        }
        entry.knowsToxic = value;
        break;
      }
      case 'medicinal': {
        // Type guard: medicinal expects object with medicinal properties
        if (typeof value !== 'object' || value === null) {
          throw new Error(`Expected KnownMedicinalProperties object for 'medicinal' property, got ${typeof value}`);
        }
        if (entry.medicinal === 'unknown') {
          entry.medicinal = {};
        }
        // Safe: value is an object, entry.medicinal is now an object
        Object.assign(entry.medicinal, value as Record<string, unknown>);
        break;
      }
      case 'magical': {
        // Type guard: magical expects object with magical properties
        if (typeof value !== 'object' || value === null) {
          throw new Error(`Expected KnownMagicalProperties object for 'magical' property, got ${typeof value}`);
        }
        if (entry.magical === 'unknown') {
          entry.magical = {};
        }
        // Safe: value is an object, entry.magical is now an object
        Object.assign(entry.magical, value as Record<string, unknown>);
        break;
      }
      case 'crafting': {
        // Type guard: crafting expects object with crafting properties
        if (typeof value !== 'object' || value === null) {
          throw new Error(`Expected KnownCraftingProperties object for 'crafting' property, got ${typeof value}`);
        }
        if (entry.crafting === 'unknown') {
          entry.crafting = {};
        }
        // Safe: value is an object, entry.crafting is now an object
        Object.assign(entry.crafting, value as Record<string, unknown>);
        break;
      }
    }

    // Remove from encountered if we now have knowledge
    this._encounteredPlants.delete(plantId);
  }

  /**
   * Increase confidence through successful use
   */
  public recordSuccessfulUse(plantId: string): void {
    const entry = this._knowledge.get(plantId);
    if (!entry) return;

    entry.usageCount++;

    // Increase confidence based on usage
    if (entry.usageCount >= 10 && entry.confidence !== 'certain') {
      entry.confidence = 'certain';
    } else if (entry.usageCount >= 5 && entry.confidence === 'uncertain') {
      entry.confidence = 'likely';
    } else if (entry.usageCount >= 3 && entry.confidence === 'likely') {
      entry.confidence = 'confident';
    }
  }

  /**
   * Add a misconception about a plant
   */
  public addMisconception(plantId: string, misconception: string): void {
    const entry = this._knowledge.get(plantId);
    if (!entry) return;

    if (!entry.misconceptions) {
      entry.misconceptions = [];
    }
    if (!entry.misconceptions.includes(misconception)) {
      entry.misconceptions.push(misconception);
    }
  }

  /**
   * Remove a misconception (when corrected)
   */
  public removeMisconception(plantId: string, misconception: string): void {
    const entry = this._knowledge.get(plantId);
    if (!entry?.misconceptions) return;

    entry.misconceptions = entry.misconceptions.filter(m => m !== misconception);
  }

  /**
   * Transfer knowledge from another agent (teaching)
   */
  public learnFrom(
    otherKnowledge: PlantKnowledgeComponent,
    plantId: string,
    gameTime: number,
    teacherId: string
  ): boolean {
    const theirEntry = otherKnowledge.getKnowledge(plantId);
    if (!theirEntry) return false;

    // Can only learn if they're confident
    if (theirEntry.confidence === 'uncertain') return false;

    // Copy their knowledge with reduced confidence
    const newEntry: PlantKnowledgeEntry = {
      ...theirEntry,
      discoveryMethod: 'taught',
      discoveredAt: gameTime,
      taughtBy: teacherId,
      confidence: theirEntry.confidence === 'certain' ? 'confident' : 'likely',
      usageCount: 0,
      misconceptions: undefined  // Don't inherit misconceptions
    };

    this._knowledge.set(plantId, newEntry);
    this._encounteredPlants.delete(plantId);

    return true;
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): PlantKnowledgeData {
    const knowledge: Record<string, PlantKnowledgeEntry> = {};
    for (const [plantId, entry] of this._knowledge) {
      knowledge[plantId] = entry;
    }

    return {
      knowledge,
      encounteredPlants: Array.from(this._encounteredPlants),
      herbalistSkill: this.herbalistSkill
    };
  }

  /**
   * Deserialize from JSON
   * Safe: PlantKnowledgeData is validated by the constructor
   */
  public static fromJSON(data: PlantKnowledgeData): PlantKnowledgeComponent {
    return new PlantKnowledgeComponent(data);
  }
}
