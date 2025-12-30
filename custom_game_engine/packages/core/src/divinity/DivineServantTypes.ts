/**
 * DivineServantTypes - Emergent divine servant hierarchies
 *
 * Each deity invents their own servant types. There is no universal "angel"
 * template - a harvest god might have grain spirits, a war god might have
 * valkyries, a cosmic horror might have incomprehensible servitors.
 *
 * Players can design servant types, LLM gods generate their own.
 */

import type { DivineDomain } from './DeityTypes.js';
import type { DivinePowerType } from './DivinePowerTypes.js';

// ============================================================================
// Servant Template System
// ============================================================================

/** A template for a type of divine servant (deity-specific) */
export interface ServantTemplate {
  id: string;

  /** Which deity this template belongs to */
  deityId: string;

  /** Name for this type of servant */
  typeName: string;

  /** Plural form */
  typeNamePlural: string;

  /** Description of what these servants are */
  description: string;

  /** Rank in the deity's hierarchy (0 = lowest) */
  hierarchyRank: number;

  /** What this rank is called */
  rankTitle: string;

  /** Form definition */
  form: ServantFormTemplate;

  /** Personality template */
  personality: ServantPersonalityTemplate;

  /** Available abilities */
  abilities: ServantAbilityTemplate[];

  /** Base stats (can be modified per-instance) */
  baseStats: ServantStats;

  /** Creation cost (belief) */
  creationCost: number;

  /** Maintenance cost per hour */
  maintenanceCost: number;

  /** Maximum of this type */
  maximumCount: number;

  /** Prerequisites (other servant types that must exist) */
  prerequisites: string[];

  /** When template was created */
  createdAt: number;

  /** LLM-generated or player-created? */
  origin: 'player' | 'llm' | 'emergent';

  /** The prompt/concept that generated this (for consistency) */
  generationContext?: string;
}

// ============================================================================
// Servant Form
// ============================================================================

/** Template for servant physical form */
export interface ServantFormTemplate {
  /** Primary appearance category */
  category: ServantFormCategory;

  /** Detailed description (LLM-generated or player-written) */
  description: string;

  /** Size relative to humans */
  size: 'microscopic' | 'tiny' | 'small' | 'human' | 'large' | 'huge' | 'colossal' | 'variable';

  /** Physical composition */
  composition: ServantComposition[];

  /** Movement types */
  movement: ServantMovement[];

  /** Sensory organs/capabilities */
  senses: string[];

  /** Limbs/appendages */
  appendages: ServantAppendage[];

  /** Voice/communication method */
  communication: ServantCommunication;

  /** Special features */
  specialFeatures: string[];

  /** Variations allowed (for individual instances) */
  variationsAllowed: boolean;

  /** If variations allowed, what can vary */
  variableAspects: string[];
}

/** Primary form categories */
export type ServantFormCategory =
  | 'humanoid'           // Human-like
  | 'animal'             // Animal form
  | 'hybrid'             // Human-animal mix
  | 'elemental'          // Made of element
  | 'geometric'          // Abstract shapes
  | 'spectral'           // Ghost-like
  | 'swarm'              // Many small entities
  | 'cosmic'             // Stars, void, impossible
  | 'plant'              // Botanical
  | 'construct'          // Made object
  | 'formless'           // No fixed form
  | 'other';             // Unique/undefined

/** What servants are made of */
export type ServantComposition =
  | 'flesh'
  | 'spirit'
  | 'light'
  | 'shadow'
  | 'fire'
  | 'water'
  | 'air'
  | 'earth'
  | 'metal'
  | 'crystal'
  | 'void'
  | 'living_plants'
  | 'bone'
  | 'mist'
  | 'lightning'
  | 'sound'
  | 'concepts'          // Made of ideas
  | 'memories'          // Made of memories
  | 'other';

/** Movement capabilities */
export type ServantMovement =
  | 'walk'
  | 'run'
  | 'crawl'
  | 'slither'
  | 'fly'
  | 'hover'
  | 'swim'
  | 'burrow'
  | 'teleport'
  | 'phase'             // Through solid matter
  | 'dimensional'       // Between dimensions
  | 'instant'           // Everywhere at once
  | 'roll'
  | 'bounce'
  | 'flow'
  | 'none';             // Stationary

/** Appendages */
export interface ServantAppendage {
  type: string;         // "wing", "tentacle", "arm", "tail", etc.
  count: number | 'variable';
  description: string;
  functional: boolean;  // Can it interact with world?
}

/** Communication methods */
export interface ServantCommunication {
  canSpeak: boolean;
  languages: 'all' | 'divine_only' | 'believer_languages' | 'specific' | 'none';
  specificLanguages?: string[];
  voiceDescription?: string;
  alternativeMethods: string[];  // Telepathy, sign, pheromones, etc.
}

// ============================================================================
// Servant Personality
// ============================================================================

/** Personality template for servants */
export interface ServantPersonalityTemplate {
  /** Base obedience level */
  obedience: 'absolute' | 'loyal' | 'willing' | 'questioning' | 'independent' | 'chaotic';

  /** Attitude toward mortals */
  mortalAttitude: ServantMortalAttitude;

  /** General temperament */
  temperament: string[];

  /** Core motivations beyond obedience */
  motivations: string[];

  /** Can develop individual personality? */
  canDevelopPersonality: boolean;

  /** How much personality can drift from template */
  personalityDriftAmount: number;

  /** Default emotional state */
  defaultEmotionalState: string;

  /** Communication style */
  communicationStyle: string[];

  /** Self-awareness level */
  selfAwareness: 'none' | 'minimal' | 'basic' | 'moderate' | 'high' | 'full';

  /** Can feel pain/pleasure? */
  sentience: 'none' | 'limited' | 'full';
}

/** How servants view mortals */
export type ServantMortalAttitude =
  | 'loving'            // Genuinely cares
  | 'protective'        // Guards them
  | 'nurturing'         // Helps them grow
  | 'neutral'           // Indifferent
  | 'cold'              // Distant
  | 'disdainful'        // Looks down on them
  | 'curious'           // Fascinated by them
  | 'fearful'           // Afraid of them
  | 'hungry'            // Wants something from them
  | 'playful'           // Toys with them
  | 'jealous'           // Envies them
  | 'incomprehensible'; // Beyond mortal understanding

// ============================================================================
// Servant Abilities
// ============================================================================

/** Template for an ability */
export interface ServantAbilityTemplate {
  id: string;

  /** Ability name */
  name: string;

  /** Description */
  description: string;

  /** Ability category */
  category: ServantAbilityCategory;

  /** Power level (0-1) relative to this servant type */
  powerLevel: number;

  /** Base cost (draws from deity's belief) */
  baseCost: number;

  /** Cooldown in game hours */
  cooldown: number;

  /** Range (0 = self, -1 = unlimited) */
  range: number;

  /** Duration of effect (-1 = permanent, 0 = instant) */
  duration: number;

  /** Does it reveal the servant's nature? */
  revealsNature: boolean;

  /** Domain alignment (if any) */
  domainAlignment?: DivineDomain;

  /** Custom parameters for this ability */
  parameters: Record<string, unknown>;

  /** LLM prompt for executing this ability */
  executionPrompt?: string;
}

/** Categories of servant abilities */
export type ServantAbilityCategory =
  | 'combat'
  | 'defense'
  | 'healing'
  | 'blessing'
  | 'curse'
  | 'communication'
  | 'perception'
  | 'movement'
  | 'creation'
  | 'destruction'
  | 'transformation'
  | 'illusion'
  | 'control'
  | 'knowledge'
  | 'utility'
  | 'unique';

// ============================================================================
// Servant Stats
// ============================================================================

/** Stats for a servant (flexible, not fixed) */
export interface ServantStats {
  /** Core stats (all optional, undefined = not applicable) */
  health?: number;
  maxHealth?: number;
  power?: number;
  speed?: number;
  perception?: number;
  influence?: number;
  resistance?: number;
  stealth?: number;

  /** Custom stats specific to this servant type */
  customStats: Record<string, number>;
}

// ============================================================================
// Servant Instance
// ============================================================================

/** An actual servant entity (instance of a template) */
export interface DivineServant {
  id: string;

  /** Template this is based on */
  templateId: string;

  /** Entity ID in the world */
  entityId: string;

  /** Owning deity */
  deityId: string;

  /** Individual name (if any) */
  name?: string;

  /** Current stats (may differ from template) */
  currentStats: ServantStats;

  /** Individual personality (if developed) */
  individualPersonality?: ServantPersonalityInstance;

  /** Current state */
  state: ServantState;

  /** Current orders */
  orders?: ServantOrders;

  /** Notable deeds */
  notableDeedIds: string[];

  /** When created */
  createdAt: number;

  /** Total existence time */
  totalExistenceTime: number;

  /** Mortals who know of this servant */
  knownToAgentIds: string[];

  /** Has developed unique traits? */
  hasEvolvedTraits: boolean;

  /** Evolved traits */
  evolvedTraits: EvolvedTrait[];
}

/** Individual personality (when developed) */
export interface ServantPersonalityInstance {
  /** Traits that have developed */
  developedTraits: string[];

  /** Relationship with deity */
  deityRelationship: number; // -1 to 1

  /** Notable experiences */
  formativeExperiences: string[];

  /** Personal goals (if any) */
  personalGoals?: string[];

  /** Quirks */
  quirks: string[];
}

/** Current state of a servant */
export interface ServantState {
  active: boolean;
  position?: { x: number; y: number };
  currentActivity: string;
  visible: boolean;
  inMortalRealm: boolean;
  currentDrainRate: number;
  statusEffects: ServantStatusEffect[];
  respawnAt?: number;
}

/** Status effect on servant */
export interface ServantStatusEffect {
  type: string;
  source: string;
  duration: number;
  magnitude: number;
}

/** Orders for a servant */
export interface ServantOrders {
  type: string;
  targetId?: string;
  parameters: Record<string, unknown>;
  givenAt: number;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

/** A trait that has evolved in this servant */
export interface EvolvedTrait {
  traitId: string;
  name: string;
  description: string;
  developedAt: number;
  triggeringEvent?: string;
  mechanicalEffect?: Record<string, number>;
}

// ============================================================================
// Power Granting System
// ============================================================================

/**
 * Power budget allocation by servant rank.
 * Higher ranked servants receive more power budget to distribute.
 */
export const POWER_BUDGET_BY_RANK: Record<number, number> = {
  0: 10,    // Basic servants: 1-2 minor powers
  1: 25,    // Intermediate: 2-3 moderate powers
  2: 50,    // Advanced: 3-4 significant powers
  3: 100,   // Supreme: 5+ powers including major ones
  4: 200,   // Legendary: exceptional power allocation
};

/** Power granting configuration for a servant template */
export interface ServantPowerGrant {
  /** Which servant template this applies to */
  servantTemplateId: string;

  /** Total power budget (based on rank) */
  powerBudget: number;

  /** Remaining unspent budget */
  remainingBudget: number;

  /** Powers granted from deity's portfolio */
  grantedPowers: GrantedPower[];

  /** Can the deity modify these grants later? */
  modifiable: boolean;

  /** Which deity granted these powers */
  sourceDeityId: string;

  /** When powers were last modified */
  lastModifiedAt: number;
}

/** A specific power granted from a deity to a servant type */
export interface GrantedPower {
  /** Unique ID for this grant */
  id: string;

  /** The base divine power type from deity's portfolio */
  basePowerType: DivinePowerType;

  /** How this power manifests for the servant */
  manifestation: PowerManifestation;

  /**
   * Power level relative to deity's version (0.1-1.0)
   * 0.1 = 10% of deity's power, 1.0 = full deity power
   */
  powerLevel: number;

  /** Budget cost for this power grant */
  budgetCost: number;

  /** Belief cost per use (drawn from deity's reserves) */
  costToServant: number;

  /** Cooldown between uses (in game hours) */
  cooldown: number;

  /** Maximum uses per day (-1 = unlimited) */
  maxUsesPerDay: number;

  /** When this power was granted */
  grantedAt: number;

  /** Restrictions on usage */
  usageRestrictions: PowerRestriction[];

  /** Has the servant mastered this power? */
  mastery: number; // 0-1, affects success rate
}

/** How a deity power manifests through a servant */
export interface PowerManifestation {
  /** Servant-specific name (e.g., "Ember Touch" vs "Divine Fire") */
  name: string;

  /** Description of how the servant uses this power */
  description: string;

  /** Visual effect when power is used */
  visualEffect: string;

  /** Sound effect (if any) */
  soundEffect?: string;

  /** Does it look obviously divine? */
  obviouslyDivine: boolean;

  /** Flavor text for observers */
  witnessDescription?: string;
}

/** Restrictions on how a servant can use a granted power */
export interface PowerRestriction {
  type: 'target' | 'location' | 'time' | 'condition' | 'permission';
  description: string;
  parameters: Record<string, unknown>;
}

/** Request to grant a power to a servant template */
export interface GrantPowerRequest {
  /** Target servant template */
  servantTemplateId: string;

  /** Power type to grant */
  powerType: DivinePowerType;

  /** Desired power level */
  powerLevel: number;

  /** Custom manifestation (optional, LLM can generate) */
  customManifestation?: Partial<PowerManifestation>;

  /** Restrictions to apply */
  restrictions?: PowerRestriction[];
}

/** Result of a power grant attempt */
export interface GrantPowerResult {
  success: boolean;
  grantedPower?: GrantedPower;
  failure?: GrantPowerFailure;
}

/** Reasons a power grant might fail */
export interface GrantPowerFailure {
  reason: 'insufficient_budget' | 'power_not_in_portfolio' | 'duplicate_power' |
          'rank_too_low' | 'incompatible_domain' | 'servant_limit_reached';
  message: string;
  requiredBudget?: number;
  availableBudget?: number;
}

/** Calculate budget cost for a power grant */
export function calculatePowerBudgetCost(
  powerType: DivinePowerType,
  powerLevel: number
): number {
  // Base costs by power type category
  const baseCosts: Partial<Record<DivinePowerType, number>> = {
    // Minor powers (low cost)
    whisper: 2,
    subtle_sign: 2,
    dream_hint: 3,
    minor_luck: 3,
    sense_prayer: 2,
    observe_faithful: 2,

    // Moderate powers
    clear_vision: 8,
    voice_of_god: 10,
    minor_miracle: 5,
    bless_individual: 6,
    curse_individual: 6,
    heal_wound: 8,
    reveal_truth: 12,
    inspire_emotion: 8,
    guide_path: 5,
    sacred_mark: 7,
    prophetic_dream: 10,

    // Major powers
    mass_vision: 15,
    major_miracle: 20,
    heal_mortal_wound: 18,
    resurrect_recent: 25,
    storm_calling: 20,
    bless_harvest: 15,
    curse_land: 15,
    smite: 30,
    sanctify_site: 18,
    create_relic: 25,
    mass_blessing: 20,
    mass_curse: 20,
    divine_protection: 15,
    compel_truth: 12,
    divine_judgment: 25,

    // Supreme powers
    create_angel: 40,
    manifest_avatar: 50,
    resurrect_old: 50,
    terraform_local: 45,
    mass_miracle: 35,
    divine_champion: 40,
    holy_artifact: 45,
    establish_domain: 50,
    divine_edict: 35,
    banish_spirit: 30,
    grant_magic: 45,

    // World-shaping powers
    terraform_region: 60,
    create_species: 70,
    divine_cataclysm: 80,
    ascend_mortal: 100,
    devour_deity: 100,
    reality_warp: 80,
    planar_bridge: 60,
    eternal_blessing: 70,
    eternal_curse: 70,
  };

  const baseCost = baseCosts[powerType];
  // Default cost for unlisted powers
  const effectiveCost = baseCost !== undefined ? baseCost : 10;
  return Math.ceil(effectiveCost * powerLevel);
}

/** Get power budget for a servant rank */
export function getPowerBudgetForRank(rank: number): number {
  const budget = POWER_BUDGET_BY_RANK[rank];
  if (budget !== undefined) {
    return budget;
  }
  // For ranks beyond defined, extrapolate
  return 200 + (rank - 4) * 100;
}

/** Create initial power grant configuration for a servant template */
export function createServantPowerGrant(
  servantTemplateId: string,
  deityId: string,
  rank: number
): ServantPowerGrant {
  const budget = getPowerBudgetForRank(rank);
  return {
    servantTemplateId,
    powerBudget: budget,
    remainingBudget: budget,
    grantedPowers: [],
    modifiable: true,
    sourceDeityId: deityId,
    lastModifiedAt: Date.now(),
  };
}

/** Create a power manifestation (simplified, for player use) */
export function createPowerManifestation(
  name: string,
  description: string,
  visualEffect: string
): PowerManifestation {
  return {
    name,
    description,
    visualEffect,
    obviouslyDivine: true,
  };
}

// ============================================================================
// Hierarchy Definition
// ============================================================================

/** A deity's complete servant hierarchy */
export interface DivineHierarchy {
  id: string;

  /** Deity this belongs to */
  deityId: string;

  /** Name for this hierarchy (e.g., "The Celestial Host", "The Swarm") */
  hierarchyName: string;

  /** Description of the hierarchy */
  description: string;

  /** Templates ordered by rank (lowest to highest) */
  templatesByRank: ServantTemplate[];

  /** Total servants currently active */
  totalActiveServants: number;

  /** When this hierarchy was established */
  establishedAt: number;

  /** Has the hierarchy been revealed to mortals? */
  knownToMortals: boolean;

  /** How mortals perceive the hierarchy */
  mortalPerception?: string;

  /** Collective name for all servants */
  collectiveName?: string;

  /** Origin story of the hierarchy */
  originMyth?: string;
}

// ============================================================================
// Generation Request
// ============================================================================

/** Request for LLM to generate a servant template */
export interface GenerateServantTemplateRequest {
  /** Requesting deity */
  deityId: string;

  /** Deity identity for context */
  deityContext: {
    name: string;
    domain: DivineDomain;
    secondaryDomains: DivineDomain[];
    personality: Record<string, number>;
    existingEpithets: string[];
  };

  /** Desired rank in hierarchy */
  targetRank: number;

  /** Existing templates (for hierarchy coherence) */
  existingTemplates: ServantTemplate[];

  /** Purpose of this servant type */
  intendedPurpose: string;

  /** Style hints */
  styleHints?: {
    aesthetic?: string;        // "ethereal", "terrifying", "natural"
    culturalInfluence?: string; // "norse", "egyptian", "cosmic horror"
    formPreference?: ServantFormCategory;
    complexityLevel?: 'simple' | 'moderate' | 'elaborate';
  };

  /** Constraints */
  constraints?: {
    maxCreationCost?: number;
    maxMaintenanceCost?: number;
    mustBeVisible?: boolean;
    mustBeIntimidating?: boolean;
    mustBeBeautiful?: boolean;
  };
}

/** Result of generation */
export interface GenerateServantTemplateResult {
  template: ServantTemplate;
  llmReasoning?: string;
}

// ============================================================================
// Player Creation Interface
// ============================================================================

/** Simplified input for player-created servant types */
export interface PlayerServantDesign {
  /** Name for this servant type */
  typeName: string;

  /** Brief description */
  description: string;

  /** Key appearance traits */
  appearanceTraits: string[];

  /** Size */
  size: ServantFormTemplate['size'];

  /** Made of what */
  composition: ServantComposition[];

  /** How does it move */
  movement: ServantMovement[];

  /** Can it speak */
  canSpeak: boolean;

  /** Personality keywords */
  personalityKeywords: string[];

  /** Three main abilities */
  primaryAbilities: {
    name: string;
    description: string;
    category: ServantAbilityCategory;
  }[];

  /** Rank in hierarchy */
  hierarchyRank: number;

  /** Max count */
  maximumCount: number;
}

/** Convert player design to full template */
export function playerDesignToTemplate(
  design: PlayerServantDesign,
  deityId: string
): ServantTemplate {
  return {
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    deityId,
    typeName: design.typeName,
    typeNamePlural: design.typeName + 's', // Player can override
    description: design.description,
    hierarchyRank: design.hierarchyRank,
    rankTitle: `Rank ${design.hierarchyRank}`,
    form: {
      category: inferFormCategory(design.composition, design.appearanceTraits),
      description: design.appearanceTraits.join('. '),
      size: design.size,
      composition: design.composition,
      movement: design.movement,
      senses: ['sight', 'hearing'],
      appendages: [],
      communication: {
        canSpeak: design.canSpeak,
        languages: design.canSpeak ? 'believer_languages' : 'none',
        alternativeMethods: [],
      },
      specialFeatures: design.appearanceTraits,
      variationsAllowed: true,
      variableAspects: ['coloration', 'size_variation'],
    },
    personality: {
      obedience: 'loyal',
      mortalAttitude: 'neutral',
      temperament: design.personalityKeywords,
      motivations: ['serve_deity'],
      canDevelopPersonality: true,
      personalityDriftAmount: 0.2,
      defaultEmotionalState: 'calm',
      communicationStyle: design.canSpeak ? ['formal'] : ['silent'],
      selfAwareness: 'basic',
      sentience: 'limited',
    },
    abilities: design.primaryAbilities.map((ab, i) => ({
      id: `ability_${i}`,
      name: ab.name,
      description: ab.description,
      category: ab.category,
      powerLevel: 0.5,
      baseCost: 10,
      cooldown: 1,
      range: 10,
      duration: 1,
      revealsNature: false,
      parameters: {},
    })),
    baseStats: {
      health: 50,
      maxHealth: 50,
      power: 20,
      speed: 1.0,
      perception: 1.0,
      influence: 0.5,
      resistance: 0.3,
      stealth: 0.5,
      customStats: {},
    },
    creationCost: 100 * (design.hierarchyRank + 1),
    maintenanceCost: 1 * (design.hierarchyRank + 1),
    maximumCount: design.maximumCount,
    prerequisites: [],
    createdAt: Date.now(),
    origin: 'player',
  };
}

/** Infer form category from composition and traits */
function inferFormCategory(
  composition: ServantComposition[],
  traits: string[]
): ServantFormCategory {
  const traitString = traits.join(' ').toLowerCase();

  if (composition.includes('void') || composition.includes('concepts')) return 'cosmic';
  if (composition.includes('light') || composition.includes('spirit')) return 'spectral';
  if (composition.includes('fire') || composition.includes('water') || composition.includes('lightning')) return 'elemental';
  if (composition.includes('living_plants')) return 'plant';
  if (composition.includes('metal') || composition.includes('crystal')) return 'construct';

  if (traitString.includes('human') || traitString.includes('person')) return 'humanoid';
  if (traitString.includes('animal') || traitString.includes('beast')) return 'animal';
  if (traitString.includes('swarm') || traitString.includes('many')) return 'swarm';
  if (traitString.includes('geometric') || traitString.includes('shape')) return 'geometric';

  return 'other';
}

// ============================================================================
// Example Hierarchies
// ============================================================================

/** Example: War god's hierarchy */
export const EXAMPLE_WAR_GOD_HIERARCHY: Partial<DivineHierarchy> = {
  hierarchyName: 'The Crimson Host',
  description: 'Battle-spirits that serve the god of war',
  collectiveName: 'The Host',
};

/** Example: Nature deity's hierarchy */
export const EXAMPLE_NATURE_DEITY_HIERARCHY: Partial<DivineHierarchy> = {
  hierarchyName: 'The Wild Court',
  description: 'Spirits of forest, field, and stream',
  collectiveName: 'The Court',
};

/** Example: Cosmic horror hierarchy */
export const EXAMPLE_COSMIC_HORROR_HIERARCHY: Partial<DivineHierarchy> = {
  hierarchyName: 'The Congregation of the Void',
  description: 'Entities from beyond the veil of reality',
  collectiveName: 'The Congregation',
};

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new divine hierarchy for a deity */
export function createDivineHierarchy(
  deityId: string,
  hierarchyName: string,
  description: string
): DivineHierarchy {
  return {
    id: `hierarchy_${deityId}`,
    deityId,
    hierarchyName,
    description,
    templatesByRank: [],
    totalActiveServants: 0,
    establishedAt: Date.now(),
    knownToMortals: false,
  };
}

/** Create a servant instance from a template */
export function createServantFromTemplate(
  template: ServantTemplate,
  entityId: string,
  name?: string
): DivineServant {
  return {
    id: `servant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    templateId: template.id,
    entityId,
    deityId: template.deityId,
    name,
    currentStats: { ...template.baseStats },
    state: {
      active: true,
      visible: false,
      inMortalRealm: false,
      currentDrainRate: template.maintenanceCost,
      currentActivity: 'idle',
      statusEffects: [],
    },
    notableDeedIds: [],
    createdAt: Date.now(),
    totalExistenceTime: 0,
    knownToAgentIds: [],
    hasEvolvedTraits: false,
    evolvedTraits: [],
  };
}

/** Calculate hierarchy maintenance cost */
export function calculateHierarchyMaintenance(
  _hierarchy: DivineHierarchy,
  activeServants: DivineServant[]
): number {
  return activeServants.reduce((total, servant) => {
    return total + servant.state.currentDrainRate;
  }, 0);
}
