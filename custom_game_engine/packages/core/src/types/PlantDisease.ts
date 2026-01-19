/**
 * Plant Disease and Pest Types
 *
 * Defines diseases, pests, and their effects on plants
 */

// Import disease and pest data from botany package
// Note: These are loaded from JSON to allow easier data management
import diseasesData from '@ai-village/botany/src/data/diseases.json';
import pestsData from '@ai-village/botany/src/data/pests.json';

/**
 * Disease severity levels
 */
export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'terminal';

/**
 * Pest types that can attack plants
 */
export type PestType =
  | 'aphids'           // Sap-sucking insects
  | 'caterpillars'     // Leaf-eating larvae
  | 'beetles'          // Chewing insects
  | 'slugs'            // Soft-bodied mollusks
  | 'mites'            // Tiny arachnids
  | 'whiteflies'       // Flying sap-suckers
  | 'thrips'           // Tiny insects that rasp leaves
  | 'nematodes'        // Root parasites
  | 'borers'           // Stem/trunk burrowers
  | 'birds'            // Seed/fruit eaters
  | 'rodents'          // Root/stem gnawers
  | 'deer';            // Browse damage

/**
 * Disease types that can affect plants
 */
export type DiseaseType =
  | 'blight'           // Rapid tissue death (bacterial/fungal)
  | 'rust'             // Orange/brown pustules (fungal)
  | 'powdery_mildew'   // White powdery coating (fungal)
  | 'downy_mildew'     // Yellow/gray patches (fungal)
  | 'rot'              // Decay (bacterial/fungal)
  | 'wilt'             // Vascular blockage (bacterial/fungal)
  | 'mosaic'           // Mottled leaves (viral)
  | 'leaf_spot'        // Circular spots (fungal/bacterial)
  | 'canker'           // Bark lesions (fungal/bacterial)
  | 'damping_off'      // Seedling collapse (fungal)
  | 'scab'             // Crusty lesions (fungal)
  | 'anthracnose';     // Dark sunken lesions (fungal)

/**
 * Transmission method for diseases
 */
export type TransmissionMethod =
  | 'airborne'         // Wind-carried spores
  | 'soilborne'        // Lives in soil
  | 'waterborne'       // Spreads via water
  | 'vector'           // Carried by insects
  | 'contact'          // Direct plant-to-plant
  | 'seed';            // Transmitted via seeds

/**
 * Definition of a plant disease
 */
export interface PlantDisease {
  id: string;
  name: string;
  type: DiseaseType;
  description: string;

  /** How the disease spreads */
  transmission: TransmissionMethod[];

  /** Plant categories susceptible */
  susceptibleCategories: string[];

  /** Specific species immune to this disease */
  immuneSpecies?: string[];

  /** Spread parameters */
  spreadRadius: number;              // Tiles
  spreadChance: number;              // 0-1 per tick
  incubationDays: number;            // Days before symptoms

  /** Effects on plant */
  healthDrainPerDay: number;         // Health lost per day
  growthPenalty: number;             // 0-1 growth multiplier
  yieldPenalty: number;              // 0-1 yield multiplier
  lethalHealthThreshold: number;     // Health at which plant dies

  /** Environmental factors */
  favoredConditions: {
    minMoisture?: number;            // 0-100
    maxMoisture?: number;
    minTemperature?: number;
    maxTemperature?: number;
    requiresRain?: boolean;
  };

  /** Treatment options */
  treatments: DiseaseTreatment[];

  /** Visual indicator */
  visualEffect: string;
}

/**
 * Disease treatment definition
 */
export interface DiseaseTreatment {
  /** What cures this */
  itemId?: string;                   // Item to apply
  actionType?: string;               // Action to perform
  effectiveness: number;             // 0-1 chance to cure
  costMultiplier?: number;           // Cost modifier
  preventionOnly?: boolean;          // Only works before infection
}

/**
 * Definition of a pest
 */
export interface PlantPest {
  id: string;
  name: string;
  type: PestType;
  description: string;

  /** Plant categories targeted */
  targetCategories: string[];

  /** Specific species preferred (if any) */
  preferredSpecies?: string[];

  /** Species this pest avoids */
  repelledBy?: string[];

  /** Spawn parameters */
  spawnChance: number;               // Per-plant per-day chance
  minPopulation: number;             // Min pests before damage
  maxPopulation: number;             // Max pests per plant
  breedingRate: number;              // Population growth per day

  /** Movement */
  migrationRadius: number;           // How far they travel
  migrationChance: number;           // 0-1 per tick

  /** Damage effects */
  damagePerPestPerDay: number;       // Health damage per pest
  consumesYield: boolean;            // Eats fruit/produce
  yieldDamagePercent: number;        // 0-1 yield lost per day
  targetPlantPart: 'leaves' | 'roots' | 'stem' | 'fruit' | 'flowers' | 'all';

  /** Environmental factors */
  seasonalActivity: string[];        // Seasons when active
  favoredConditions: {
    minTemperature?: number;
    maxTemperature?: number;
    rain?: boolean;                  // Active during rain?
    nightActive?: boolean;           // More active at night?
  };

  /** Control methods */
  controls: PestControl[];

  /** Visual indicator */
  visualEffect: string;
}

/**
 * Pest control method
 */
export interface PestControl {
  /** What kills/repels this pest */
  itemId?: string;                   // Item to apply
  buildingId?: string;               // Building that deters (e.g., scarecrow)
  companionPlant?: string;           // Plant that repels
  predator?: string;                 // Animal that eats pest
  actionType?: string;               // Manual action (e.g., handpick)

  /** Effectiveness */
  killEffectiveness: number;         // 0-1 kills pests
  repelEffectiveness: number;        // 0-1 prevents new pests
  radius?: number;                   // Area of effect (tiles)
  durationDays?: number;             // How long effect lasts
}

/**
 * Active disease state on a plant
 */
export interface PlantDiseaseState {
  diseaseId: string;
  infectionDay: number;              // Game day infected
  severity: DiseaseSeverity;
  incubating: boolean;               // Still in incubation period
  daysActive: number;
  spreading: boolean;                // Currently spreading to others
  treated: boolean;                  // Has been treated
  treatmentDay?: number;
}

/**
 * Active pest infestation on a plant
 */
export interface PlantPestState {
  pestId: string;
  population: number;
  arrivalDay: number;
  daysPresent: number;
  controlled: boolean;               // Under control measures
  controlMethod?: string;
}

/**
 * Summary of plant health issues
 */
export interface PlantHealthStatus {
  diseases: PlantDiseaseState[];
  pests: PlantPestState[];
  overallHealthModifier: number;     // Combined effect on health
  overallGrowthModifier: number;     // Combined effect on growth
  overallYieldModifier: number;      // Combined effect on yield
  needsAttention: boolean;           // Requires intervention
}

/**
 * Default diseases (loaded from JSON)
 */
export const DEFAULT_DISEASES: PlantDisease[] = diseasesData as PlantDisease[];

/**
 * Default pests (loaded from JSON)
 */
export const DEFAULT_PESTS: PlantPest[] = pestsData as PlantPest[];
