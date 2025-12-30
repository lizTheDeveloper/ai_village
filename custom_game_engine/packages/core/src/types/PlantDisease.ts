/**
 * Plant Disease and Pest Types
 *
 * Defines diseases, pests, and their effects on plants
 */

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
 * Default diseases
 */
export const DEFAULT_DISEASES: PlantDisease[] = [
  {
    id: 'early_blight',
    name: 'Early Blight',
    type: 'blight',
    description: 'Fungal disease causing dark spots with concentric rings',
    transmission: ['airborne', 'soilborne'],
    susceptibleCategories: ['crop'],
    spreadRadius: 3,
    spreadChance: 0.15,
    incubationDays: 3,
    healthDrainPerDay: 5,
    growthPenalty: 0.7,
    yieldPenalty: 0.6,
    lethalHealthThreshold: 10,
    favoredConditions: {
      minMoisture: 60,
      minTemperature: 15,
      maxTemperature: 30
    },
    treatments: [
      { itemId: 'fungicide', effectiveness: 0.8 },
      { actionType: 'remove_infected_leaves', effectiveness: 0.5 }
    ],
    visualEffect: 'dark_spots'
  },
  {
    id: 'powdery_mildew',
    name: 'Powdery Mildew',
    type: 'powdery_mildew',
    description: 'White powdery fungal growth on leaves',
    transmission: ['airborne'],
    susceptibleCategories: ['crop', 'vine', 'flower'],
    spreadRadius: 4,
    spreadChance: 0.2,
    incubationDays: 2,
    healthDrainPerDay: 3,
    growthPenalty: 0.8,
    yieldPenalty: 0.7,
    lethalHealthThreshold: 15,
    favoredConditions: {
      minMoisture: 40,
      maxMoisture: 70,
      minTemperature: 18,
      maxTemperature: 28
    },
    treatments: [
      { itemId: 'fungicide', effectiveness: 0.85 },
      { itemId: 'neem_oil', effectiveness: 0.6 }
    ],
    visualEffect: 'white_powder'
  },
  {
    id: 'root_rot',
    name: 'Root Rot',
    type: 'rot',
    description: 'Fungal infection of roots causing wilting and death',
    transmission: ['soilborne', 'waterborne'],
    susceptibleCategories: ['crop', 'herb', 'flower'],
    spreadRadius: 2,
    spreadChance: 0.1,
    incubationDays: 5,
    healthDrainPerDay: 8,
    growthPenalty: 0.5,
    yieldPenalty: 0.4,
    lethalHealthThreshold: 20,
    favoredConditions: {
      minMoisture: 80
    },
    treatments: [
      { actionType: 'improve_drainage', effectiveness: 0.6 },
      { itemId: 'fungicide', effectiveness: 0.5 }
    ],
    visualEffect: 'wilting'
  },
  {
    id: 'bacterial_wilt',
    name: 'Bacterial Wilt',
    type: 'wilt',
    description: 'Bacteria blocks water transport, causing rapid wilting',
    transmission: ['vector', 'soilborne'],
    susceptibleCategories: ['crop'],
    spreadRadius: 2,
    spreadChance: 0.1,
    incubationDays: 4,
    healthDrainPerDay: 10,
    growthPenalty: 0.3,
    yieldPenalty: 0.2,
    lethalHealthThreshold: 25,
    favoredConditions: {
      minTemperature: 20,
      maxTemperature: 35
    },
    treatments: [
      { actionType: 'remove_plant', effectiveness: 1.0 } // Only cure is removal
    ],
    visualEffect: 'severe_wilt'
  },
  {
    id: 'mosaic_virus',
    name: 'Mosaic Virus',
    type: 'mosaic',
    description: 'Viral infection causing mottled leaf patterns',
    transmission: ['vector', 'contact'],
    susceptibleCategories: ['crop', 'herb'],
    spreadRadius: 5,
    spreadChance: 0.25,
    incubationDays: 7,
    healthDrainPerDay: 2,
    growthPenalty: 0.6,
    yieldPenalty: 0.5,
    lethalHealthThreshold: 5,
    favoredConditions: {},
    treatments: [
      { actionType: 'remove_plant', effectiveness: 1.0 } // No cure for viruses
    ],
    visualEffect: 'mottled_leaves'
  }
];

/**
 * Default pests
 */
export const DEFAULT_PESTS: PlantPest[] = [
  {
    id: 'aphids',
    name: 'Aphids',
    type: 'aphids',
    description: 'Small sap-sucking insects that cluster on new growth',
    targetCategories: ['crop', 'herb', 'flower'],
    repelledBy: ['garlic', 'chives', 'marigold'],
    spawnChance: 0.05,
    minPopulation: 5,
    maxPopulation: 100,
    breedingRate: 1.5,
    migrationRadius: 3,
    migrationChance: 0.2,
    damagePerPestPerDay: 0.1,
    consumesYield: false,
    yieldDamagePercent: 0.02,
    targetPlantPart: 'leaves',
    seasonalActivity: ['spring', 'summer'],
    favoredConditions: {
      minTemperature: 15,
      maxTemperature: 30
    },
    controls: [
      { itemId: 'insecticidal_soap', killEffectiveness: 0.9, repelEffectiveness: 0.3 },
      { itemId: 'neem_oil', killEffectiveness: 0.7, repelEffectiveness: 0.5 },
      { companionPlant: 'marigold', killEffectiveness: 0, repelEffectiveness: 0.6, radius: 2 },
      { predator: 'ladybug', killEffectiveness: 0.8, repelEffectiveness: 0 }
    ],
    visualEffect: 'aphid_clusters'
  },
  {
    id: 'caterpillars',
    name: 'Caterpillars',
    type: 'caterpillars',
    description: 'Leaf-eating larvae that can defoliate plants',
    targetCategories: ['crop', 'tree', 'herb'],
    repelledBy: ['dill', 'fennel', 'basil'],
    spawnChance: 0.03,
    minPopulation: 2,
    maxPopulation: 20,
    breedingRate: 0.5,
    migrationRadius: 2,
    migrationChance: 0.1,
    damagePerPestPerDay: 0.5,
    consumesYield: true,
    yieldDamagePercent: 0.1,
    targetPlantPart: 'leaves',
    seasonalActivity: ['spring', 'summer', 'fall'],
    favoredConditions: {
      minTemperature: 10,
      maxTemperature: 35
    },
    controls: [
      { itemId: 'bt_spray', killEffectiveness: 0.95, repelEffectiveness: 0 },
      { actionType: 'handpick', killEffectiveness: 0.8, repelEffectiveness: 0 },
      { predator: 'bird', killEffectiveness: 0.6, repelEffectiveness: 0 }
    ],
    visualEffect: 'chewed_leaves'
  },
  {
    id: 'slugs',
    name: 'Slugs',
    type: 'slugs',
    description: 'Soft-bodied mollusks that feed at night',
    targetCategories: ['crop', 'herb', 'flower'],
    repelledBy: ['rosemary', 'sage', 'thyme'],
    spawnChance: 0.04,
    minPopulation: 3,
    maxPopulation: 30,
    breedingRate: 0.3,
    migrationRadius: 4,
    migrationChance: 0.15,
    damagePerPestPerDay: 0.4,
    consumesYield: true,
    yieldDamagePercent: 0.08,
    targetPlantPart: 'all',
    seasonalActivity: ['spring', 'summer', 'fall'],
    favoredConditions: {
      minTemperature: 5,
      maxTemperature: 25,
      rain: true,
      nightActive: true
    },
    controls: [
      { itemId: 'slug_bait', killEffectiveness: 0.85, repelEffectiveness: 0.2 },
      { itemId: 'copper_barrier', killEffectiveness: 0, repelEffectiveness: 0.9, radius: 1 },
      { actionType: 'handpick', killEffectiveness: 0.7, repelEffectiveness: 0 },
      { predator: 'duck', killEffectiveness: 0.7, repelEffectiveness: 0 }
    ],
    visualEffect: 'slime_trails'
  },
  {
    id: 'beetles',
    name: 'Beetles',
    type: 'beetles',
    description: 'Hard-shelled insects that chew leaves and roots',
    targetCategories: ['crop', 'tree'],
    preferredSpecies: ['potato', 'tomato', 'eggplant'],
    repelledBy: ['catnip', 'tansy'],
    spawnChance: 0.03,
    minPopulation: 3,
    maxPopulation: 40,
    breedingRate: 0.4,
    migrationRadius: 5,
    migrationChance: 0.2,
    damagePerPestPerDay: 0.3,
    consumesYield: false,
    yieldDamagePercent: 0.05,
    targetPlantPart: 'leaves',
    seasonalActivity: ['summer'],
    favoredConditions: {
      minTemperature: 20,
      maxTemperature: 35
    },
    controls: [
      { itemId: 'pyrethrin', killEffectiveness: 0.75, repelEffectiveness: 0.4 },
      { actionType: 'handpick', killEffectiveness: 0.6, repelEffectiveness: 0 },
      { buildingId: 'beetle_trap', killEffectiveness: 0.5, repelEffectiveness: 0, radius: 3 }
    ],
    visualEffect: 'beetle_damage'
  },
  {
    id: 'birds',
    name: 'Birds',
    type: 'birds',
    description: 'Birds that eat seeds and ripe fruits',
    targetCategories: ['crop', 'tree'],
    preferredSpecies: ['berry', 'grape', 'cherry', 'sunflower'],
    spawnChance: 0.08,
    minPopulation: 1,
    maxPopulation: 10,
    breedingRate: 0,
    migrationRadius: 20,
    migrationChance: 0.5,
    damagePerPestPerDay: 0,
    consumesYield: true,
    yieldDamagePercent: 0.15,
    targetPlantPart: 'fruit',
    seasonalActivity: ['spring', 'summer', 'fall'],
    favoredConditions: {
      nightActive: false
    },
    controls: [
      { buildingId: 'scarecrow', killEffectiveness: 0, repelEffectiveness: 0.7, radius: 5 },
      { itemId: 'bird_netting', killEffectiveness: 0, repelEffectiveness: 0.95, radius: 0 },
      { itemId: 'reflective_tape', killEffectiveness: 0, repelEffectiveness: 0.5, radius: 3 }
    ],
    visualEffect: 'pecked_fruit'
  },
  {
    id: 'rodents',
    name: 'Rodents',
    type: 'rodents',
    description: 'Mice and rats that gnaw roots and eat seeds',
    targetCategories: ['crop'],
    preferredSpecies: ['corn', 'wheat', 'carrot', 'potato'],
    repelledBy: ['mint', 'lavender'],
    spawnChance: 0.02,
    minPopulation: 2,
    maxPopulation: 15,
    breedingRate: 0.6,
    migrationRadius: 8,
    migrationChance: 0.3,
    damagePerPestPerDay: 0.6,
    consumesYield: true,
    yieldDamagePercent: 0.2,
    targetPlantPart: 'roots',
    seasonalActivity: ['spring', 'summer', 'fall', 'winter'],
    favoredConditions: {
      nightActive: true
    },
    controls: [
      { predator: 'cat', killEffectiveness: 0.8, repelEffectiveness: 0.5 },
      { predator: 'owl', killEffectiveness: 0.7, repelEffectiveness: 0.3 },
      { buildingId: 'rodent_trap', killEffectiveness: 0.6, repelEffectiveness: 0, radius: 2 },
      { companionPlant: 'mint', killEffectiveness: 0, repelEffectiveness: 0.4, radius: 2 }
    ],
    visualEffect: 'gnaw_marks'
  }
];
