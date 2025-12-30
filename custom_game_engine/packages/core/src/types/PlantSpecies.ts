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
  | 'succulent';

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

export interface MedicinalProperties {
  /** What ailments this plant treats */
  treats: Ailment[];
  /** Effectiveness (0-1) */
  effectiveness: number;
  /** How the plant must be prepared to use */
  preparation: PreparationType[];
  /** Dosage size */
  dosage: 'small' | 'medium' | 'large';
  /** Potential side effects */
  sideEffects?: SideEffect[];
  /** Whether overuse is toxic */
  toxicIfOverused: boolean;
  /** Doses per day before toxicity */
  toxicityThreshold?: number;
  /** Plants that enhance effects when combined */
  synergiesWith?: string[];
  /** Plants that conflict/cancel effects */
  conflictsWith?: string[];
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
  | 'light';          // Illumination, truth

export type MoonPhase = 'new' | 'waxing' | 'full' | 'waning';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
// Plant-specific harvest weather conditions (superset of game WeatherType)
export type HarvestWeatherCondition = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'any';

export interface MagicalEffect {
  type: string;
  magnitude: number;    // 0-1
  duration: number;     // Game hours
  trigger: 'consume' | 'touch' | 'proximity' | 'ritual';
  description: string;  // For LLM context
}

export interface MagicalHarvestConditions {
  moonPhase?: MoonPhase;
  timeOfDay?: TimeOfDay;
  weather?: HarvestWeatherCondition;
  ritual?: string;
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

export interface PlantProperties {
  // Basic consumption properties
  /** Whether the plant can be eaten */
  edible?: boolean;
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

  // Harvest behavior
  // If true (default), plant is destroyed when harvested (e.g., carrots, wheat)
  // If false, plant resets to fruiting stage and can regrow (e.g., berry bushes, fruit trees)
  harvestDestroysPlant?: boolean;

  // Stage to reset to after non-destructive harvest (default: 'fruiting')
  harvestResetStage?: 'flowering' | 'fruiting' | 'vegetative';
}
