import type { PlantStage, PlantGenetics } from '../components/PlantComponent.js';

export type PlantCategory =
  | 'crop'
  | 'herb'
  | 'tree'
  | 'flower'
  | 'fungus'
  | 'magical_herb'
  | 'grass'
  | 'weed'
  | 'vine'
  | 'aquatic'
  | 'succulent'
  | 'lichen'
  | 'moss'
  | 'carnivorous'
  | 'reed'
  | 'shrub'
  | 'grain'
  | 'fern'
  | 'cactus';

// ============================================
// Taste Profile
// ============================================

export interface TasteProfile {
  sweet: number;      // 0-1
  bitter: number;     // 0-1
  sour: number;       // 0-1
  savory: number;     // 0-1 (umami)
  spicy: number;      // 0-1
  aromatic: number;   // 0-1
}

// ============================================
// Medicinal Properties
// ============================================

export type Ailment =
  | 'wound'           // Physical damage
  | 'illness'         // General sickness
  | 'poison'          // Toxic exposure
  | 'fatigue'         // Energy depletion
  | 'pain'            // Pain relief
  | 'fever'           // Temperature
  | 'infection'       // Bacterial/viral
  | 'inflammation'    // Swelling
  | 'anxiety'         // Mental state
  | 'insomnia'        // Sleep issues
  | 'nausea'          // Digestive
  | 'headache'        // Head pain
  | 'cold'            // Common cold
  | 'allergy';        // Allergic reactions

export type PreparationType =
  | 'raw'             // Eat directly
  | 'tea'             // Steep in water
  | 'poultice'        // Apply to skin
  | 'tincture'        // Alcohol extract
  | 'salve'           // Oil-based
  | 'smoke'           // Inhale
  | 'compress'        // Wet application
  | 'powder'          // Ground/dried
  | 'oil';            // Pressed oil

export interface SideEffect {
  type: string;
  chance: number;     // 0-1
  severity?: 'mild' | 'moderate' | 'severe';
}

/** Active compound in a medicinal plant */
export interface ActiveCompound {
  name: string;
  concentration: number;  // 0-1
  effect: string;
}

/** Medicinal effect */
export interface MedicinalEffect {
  /** Type of medicinal effect (optional, can be inferred from condition) */
  type?: string;
  strength?: number;  // 0-1 (legacy)
  /** Efficacy of the treatment (0-1) */
  efficacy?: number;  // 0-1
  duration?: number; // Hours
  /** Condition this effect treats */
  condition?: string;
  /** Preparation method for this effect */
  preparation?: PreparationType;
}

export interface MedicinalProperties {
  /** What ailments this plant treats */
  treats?: Ailment[];
  /** Effectiveness (0-1) */
  effectiveness?: number;
  /** How the plant must be prepared to use */
  preparation?: PreparationType[];
  /** Dosage size */
  dosage?: 'small' | 'medium' | 'large';
  /** Potential side effects */
  sideEffects?: SideEffect[];
  /** Whether overuse is toxic */
  toxicIfOverused?: boolean;
  /** Doses per day before toxicity */
  toxicityThreshold?: number;
  /** Plants that enhance effects when combined */
  synergiesWith?: string[];
  /** Plants that conflict/cancel effects */
  conflictsWith?: string[];
  /** Active chemical compounds (can be detailed objects or simple strings) */
  activeCompounds?: (ActiveCompound | string)[];
  /** Medicinal effects */
  effects?: MedicinalEffect[];
  /** Toxicity level (0-1 for numeric, or description string) */
  toxicity?: number | string;
  /** Usage warnings (single string or array) */
  warnings?: string | string[];
}

// ============================================
// Magical Properties
// ============================================

export type MagicType =
  | 'elemental'       // Fire, water, earth, air
  | 'life'            // Healing, growth
  | 'mind'            // Perception, memory
  | 'spirit'          // Soul, ethereal
  | 'transformation'  // Change, mutation
  | 'divination'      // Seeing, knowing
  | 'protection'      // Warding, shielding
  | 'entropy'         // Decay, chaos
  | 'nature'          // Plants, animals
  | 'shadow'          // Darkness, stealth
  | 'light'           // Illumination, truth
  // Extended magic types for exotic plants
  | 'purity'          // Cleansing, purification
  | 'timing'          // Temporal manipulation
  | 'adhesion'        // Binding, sticking
  | 'clarity'         // Mental clarity, focus
  | 'preservation'    // Keeping things unchanged
  | 'endurance'       // Stamina, persistence
  | 'sound'           // Audio, resonance
  | 'binding'         // Connecting, constraining
  | 'movement'        // Motion, speed
  | 'poison'          // Toxins, venom
  | 'dream'           // Sleep, visions
  | 'purification'    // Cleansing (synonym)
  | 'consumption'     // Absorbing, devouring
  | 'reflex'          // Quick reactions
  | 'cooling'         // Temperature reduction
  | 'illusion'        // Deception, misdirection
  | 'memory';         // Recollection, recording

export type MoonPhase = 'new' | 'waxing' | 'full' | 'waning';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
// Plant-specific harvest weather conditions (superset of game WeatherType)
export type HarvestWeatherCondition = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'any';

export interface MagicalEffect {
  type: string;
  magnitude: number;    // 0-1
  duration: number;     // Game hours
  trigger: string;      // 'consume' | 'touch' | 'proximity' | 'ritual' | custom
  description: string;  // For LLM context
}

export interface MagicalHarvestConditions {
  moonPhase?: MoonPhase;
  timeOfDay?: TimeOfDay;
  weather?: HarvestWeatherCondition;
  ritual?: string;
  /** Custom harvest conditions for exotic plants */
  [key: string]: unknown;
}

export interface MagicalProperties {
  /** Universe types where magic is active */
  universeTypes: string[];
  /** Type of magic */
  magicType: MagicType;
  /** Power level (0-1) */
  potency: number;
  /** How predictable the effects are (0-1) */
  stability: number;
  /** Magical effects when used */
  effects: MagicalEffect[];
  /** Special harvest conditions for max potency */
  harvestConditions?: MagicalHarvestConditions;
  /** Days after harvest before magic decays */
  magicDecaysAfter?: number;
  /** How to preserve magical properties */
  preservationMethod?: string;
}

// ============================================
// Crafting Properties
// ============================================

export interface DyeProperties {
  color: string;        // Color name/hex
  intensity: number;    // 0-1
  permanence: number;   // 0-1 (how long it lasts)
}

export interface FiberProperties {
  strength: number;         // 0-1
  flexibility: number;      // 0-1
  waterResistance: number;  // 0-1
}

export interface OilProperties {
  type: 'cooking' | 'fuel' | 'lubricant' | 'medicinal' | 'cosmetic';
  burnTime?: number;        // Minutes for fuel type
  smokePoint?: number;      // Temperature for cooking
  yield?: number;           // Oil per plant unit
}

export interface ScentProperties {
  profile: string;          // Description of smell
  intensity: number;        // 0-1
  persistence: number;      // Hours the scent lasts
}

export interface PoisonProperties {
  type: 'paralytic' | 'soporific' | 'lethal' | 'hallucinogenic' | 'irritant';
  potency: number;          // 0-1
  targetCreatures?: string[]; // Specific creatures affected
  onsetTime?: number;       // Minutes until effect
  duration?: number;        // Minutes effect lasts
}

export interface StructuralProperties {
  hardness: number;         // 0-1
  flexibility: number;      // 0-1
  waterResistance: number;  // 0-1
  weight?: number;          // Relative weight
}

export interface CraftingProperties {
  /** Dye production */
  dye?: DyeProperties;
  /** Fiber/textile production */
  fiber?: FiberProperties;
  /** Oil production */
  oil?: OilProperties;
  /** Scent for perfumes/incense */
  scent?: ScentProperties;
  /** Poison for hunting/defense */
  poison?: PoisonProperties;
  /** Building material properties */
  structural?: StructuralProperties;
}

// ============================================
// Environmental Properties
// ============================================

export interface AuraEffect {
  radius: number;           // Tiles
  effect: string;           // Effect description
  magnitude: number;        // 0-1
}

export interface CompanionEffects {
  /** Plant species that grow better nearby */
  benefitsNearby?: string[];
  /** Plant species that grow worse nearby */
  harmsNearby?: string[];
  /** Creatures attracted to this plant */
  attracts?: string[];
  /** Creatures repelled by this plant */
  repels?: string[];
}

export interface SoilEffects {
  /** Fixes nitrogen in soil */
  nitrogenFixer?: boolean;
  /** Makes soil more acidic */
  acidifying?: boolean;
  /** Makes soil more alkaline */
  alkalizing?: boolean;
  /** Nutrients accumulated by roots */
  nutrientAccumulator?: string[];
  /** Fertility added to soil when plant decays */
  fertilityOnDecay?: number;
}

export interface WeatherInteraction {
  glowsInRain?: boolean;
  bloomsInStorm?: boolean;
  wiltsInDrought?: boolean;
  spreadsByWind?: boolean;
  needsFrost?: boolean;
}

export interface EnvironmentalProperties {
  /** Area effect around the plant */
  aura?: AuraEffect;
  /** Effects on nearby plants/creatures */
  companionEffects?: CompanionEffects;
  /** Effects on soil */
  soilEffects?: SoilEffects;
  /** Weather interactions */
  weatherInteraction?: WeatherInteraction;
}

// ============================================
// Special Properties
// ============================================

export type SpecialProperty =
  | { type: 'luminescent'; color: string; intensity: number }
  | { type: 'responsive'; trigger: string; response: string }
  | { type: 'symbiotic'; partner: string; benefit: string }
  | { type: 'carnivorous'; prey: string[]; method: string }
  | { type: 'mimic'; mimics: string; purpose: string }
  | { type: 'temporal'; effect: string }
  | { type: 'sentient'; intelligence: number; communication: string }
  | { type: 'interdimensional'; connection: string }
  | { type: 'ancestral'; memories: string }
  | { type: 'musical'; sound: string; trigger: string }
  | { type: 'phase_shifting'; phases: string[] }
  | { type: 'regenerating'; rate: number };

// ============================================
// Combined Plant Properties
// ============================================

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

/** Extended edible information */
export interface EdibleProperties {
  nutrition: number;
  taste: string;
  cookingRequired: boolean;
  shelfLife?: number;  // Days
}

export interface PlantProperties {
  // Basic consumption properties
  /** Whether the plant can be eaten (boolean or detailed object) */
  edible?: boolean | EdibleProperties;
  /** Nutrition value when eaten (0-100) */
  nutritionValue?: number;
  /** Taste profile for cooking/eating */
  taste?: TasteProfile;
  /** Whether the plant is toxic (can still be edible in small amounts) */
  toxic?: boolean;
  /** Toxicity level if toxic (0-1) */
  toxicityLevel?: number;

  // Complex property objects
  /** Medicinal properties (detailed ailments, preparation, etc.) */
  medicinal?: MedicinalProperties;
  /** Magical properties (universe-dependent, effects, harvest conditions) */
  magical?: MagicalProperties;
  /** Crafting properties (dye, fiber, oil, scent, poison, structural) */
  crafting?: CraftingProperties;
  /** Environmental effects (companion planting, soil effects, aura) */
  environmental?: EnvironmentalProperties;
  /** Special unique properties (luminescent, sentient, etc.) */
  special?: SpecialProperty[];
  /** Utility/crafting uses for this plant */
  utility?: Record<string, unknown>;
}

/** Harvest yield range */
export interface HarvestYield {
  min: number;
  max: number;
}

/** Lifecycle stage for extended plant format */
export interface LifecycleStage {
  name: string;
  duration: number;  // Days
  /** Flexible growth conditions (altitude, cold, uvHigh, etc.) */
  growthConditions?: Record<string, unknown>;
  /** Yield when harvested at this stage */
  harvestYield?: HarvestYield;
  /** Description of this lifecycle stage */
  description?: string;
  conditions?: TransitionConditions;
  outputs?: Record<string, unknown>;
}

/** Extended lifecycle format used by some plant files */
export interface PlantLifecycle {
  stages: LifecycleStage[];
  /** Total days to maturity */
  maturityTime?: number;
  /** Temperature range [min, max] in Celsius */
  optimalTemperatureRange?: [number, number];
  /** Moisture range [min, max] as percentage */
  optimalMoistureRange?: [number, number];
  /** Whether plant regrows each year */
  perennial?: boolean;
  /** Lifespan in years for perennials */
  lifespan?: number;
  // Special lifecycle requirements
  /** Is this a parasitic plant? */
  parasitic?: boolean;
  /** Does this plant require a host? */
  requiresHost?: boolean;
  /** Does this plant require water/wetland? */
  requiresWater?: boolean;
  /** Does this plant require decaying matter? */
  requiresDecay?: boolean;
  /** Does this plant require low nitrogen soil? */
  requiresLowNitrogen?: boolean;
}

/** Environmental interactions and planting companions */
export interface EnvironmentalInteractions {
  /** Preferred soil types */
  soilPreference?: string[];
  /** Plant species that benefit this plant when nearby */
  companions?: string[];
  /** Plant species this plant inhibits when nearby */
  inhibits?: string[];
  /** Special environmental properties */
  specialProperties?: string[];
  /** Does this plant require a host (for parasitic plants)? */
  requiresHost?: boolean;
}

/** Sprite mapping for different plant stages */
export interface SpriteMapping {
  seed?: string;
  seedling?: string;
  vegetative?: string;
  flowering?: string;
  fruiting?: string;
  mature?: string;
  harvest?: string;
  withered?: string;
}

export interface PlantSpecies {
  id: string;
  name: string;
  category: PlantCategory;

  // Extended metadata
  scientificName?: string;
  description?: string;
  lore?: string;

  // Where it grows naturally
  biomes: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';

  // Geographic constraints
  latitudeRange?: [number, number];
  elevationRange?: [number, number];

  // Lifecycle configuration (one of these is required)
  stageTransitions?: StageTransition[];
  lifecycle?: PlantLifecycle;

  // Base genetics (one of these is required)
  baseGenetics?: PlantGenetics;
  genetics?: PlantGenetics;

  // Seed production
  seedsPerPlant?: number;
  seedDispersalRadius?: number;
  requiresDormancy?: boolean;

  // Environmental preferences
  optimalTemperatureRange?: [number, number];
  optimalMoistureRange?: [number, number];
  preferredSeasons?: string[];

  // Properties
  properties: PlantProperties;

  // Visual
  sprites?: PlantSprites;
  spriteMapping?: SpriteMapping;

  // Environmental interactions
  environmentalInteractions?: EnvironmentalInteractions;

  // Harvest behavior
  // If true (default), plant is destroyed when harvested (e.g., carrots, wheat)
  // If false, plant resets to fruiting stage and can regrow (e.g., berry bushes, fruit trees)
  harvestDestroysPlant?: boolean;

  // Stage to reset to after non-destructive harvest (default: 'fruiting')
  harvestResetStage?: 'flowering' | 'fruiting' | 'vegetative';

  // Physical size properties
  // Height range in voxels when mature (used for 3D rendering)
  // Trees should typically be 3-12+ voxels (taller than 2-voxel humans)
  // Bushes/shrubs can be 1-2 voxels (at or below human height)
  // Alien plants can be any size - from tiny (0.5 voxels) to giant (50+ voxels)
  heightRange?: {
    min: number;  // Minimum height in voxels
    max: number;  // Maximum height in voxels
  };
}
