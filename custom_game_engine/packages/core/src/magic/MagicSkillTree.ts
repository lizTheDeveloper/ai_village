/**
 * MagicSkillTree - Paradigm-specific skill progression system
 *
 * Each magic paradigm has its own unique skill tree with custom unlock conditions.
 * Trees can require:
 * - Bloodline/innate ability (Allomancy)
 * - Discovery (runes, songs, metals, kami)
 * - Relationships (kami favor, deity standing)
 * - Events (trauma/snapping, rituals)
 * - Skill progression (traditional XP)
 * - State conditions (purity, corruption, time of day)
 *
 * Integrates with:
 * - SkillsComponent (extends with magicProgress)
 * - PresenceSpectrum (attention-based unlocks)
 * - MagicComponent (paradigm state)
 */

import type { MagicTechnique, MagicForm } from '../components/MagicComponent.js';
import type { MagicCostType } from './MagicParadigm.js';

// ============================================================================
// Unlock Condition Types
// ============================================================================

/** What can unlock a magic skill node */
export type UnlockConditionType =
  // Inherent conditions (birth/nature)
  | 'bloodline'          // Must have specific lineage (Allomancy)
  | 'snapping'           // Must have experienced awakening trauma (Allomancy)
  | 'daemon_settled'     // Daemon must have settled form
  | 'witch_birth'        // Born into witch clan
  | 'innate_talent'      // Born with specific talent

  // Discovery conditions (finding/learning)
  | 'kami_met'           // Must have encountered a specific kami
  | 'kami_favor'         // Must have favor level with kami type
  | 'metal_consumed'     // Must have consumed and survived the metal
  | 'rune_discovered'    // Must have discovered the rune
  | 'song_learned'       // Must have heard/learned the song
  | 'name_learned'       // Must know the true name
  | 'dream_visited'      // Must have visited a dream location
  | 'secret_revealed'    // Must have learned a magical secret

  // Attention/Divinity conditions
  | 'attention_given'    // Spirit/presence received attention from agent
  | 'presence_level'     // Presence must be at certain spectrum position
  | 'deity_favor'        // Must have deity favor level
  | 'pact_signed'        // Must have signed pact with entity
  | 'patron_granted'     // Patron must grant the ability

  // Skill/XP conditions
  | 'skill_level'        // Must have mundane skill at level X
  | 'magic_proficiency'  // Must have technique/form proficiency
  | 'node_unlocked'      // Must have unlocked prerequisite node
  | 'xp_accumulated'     // Must have earned X total XP in this tree
  | 'xp_spent'           // Must have spent X XP in this tree
  | 'nodes_unlocked'     // Must have unlocked X nodes total
  | 'resource_accumulated' // Must have accumulated X of a specific resource (Breath, mana, etc.)

  // Event conditions
  | 'ritual_performed'   // Must have performed specific ritual
  | 'trauma_experienced' // Must have experienced specific trauma
  | 'teacher_found'      // Must have found a teacher
  | 'artifact_bonded'    // Must have bonded with magical artifact
  | 'location_visited'   // Must have visited sacred location
  | 'creature_defeated'  // Must have defeated magical creature
  | 'vision_received'    // Must have received divine/magical vision

  // State conditions (ongoing requirements)
  | 'purity_level'       // Must maintain purity level (Shinto)
  | 'corruption_level'   // Must have corruption in range
  | 'time_of_day'        // Only available at certain times
  | 'moon_phase'         // Only available during certain moon phases
  | 'season'             // Only available during certain seasons
  | 'weather'            // Only available during certain weather
  | 'emotion_state'      // Must be in emotional state (Emotional paradigm)
  | 'health_threshold'   // Health must be above/below threshold
  | 'resource_level'     // Magic resource must be at level

  // Daemon-specific conditions
  | 'age_range'          // Must be within age range (pre-settling)
  | 'gift_innate'        // Must have innate gift (intuitive reading)
  | 'node_level'         // Must have node at specific level
  | 'form_category'      // Daemon must have form in category
  | 'intercision';       // Has been severed (negative condition)

/** Parameters for unlock conditions */
export interface UnlockConditionParams {
  // Bloodline parameters
  bloodlineId?: string;
  bloodlineStrength?: number;  // 0-1, e.g., misting (0.1-0.3) vs mistborn (1.0)

  // Kami/spirit parameters
  kamiId?: string;
  kamiType?: string;          // 'nature', 'place', 'ancestor', etc.
  favorLevel?: number;        // Required favor level

  // Discovery parameters
  runeId?: string;
  songId?: string;
  metalId?: string;
  nameId?: string;
  dreamLocationId?: string;
  secretId?: string;

  // Divinity parameters
  presenceId?: string;
  attentionThreshold?: number;
  deityId?: string;
  pactId?: string;
  patronId?: string;

  // Skill parameters
  skillId?: string;
  skillLevel?: number;
  techniqueId?: MagicTechnique;
  formId?: MagicForm;
  proficiencyLevel?: number;
  nodeId?: string;
  nodeIds?: string[];         // For multiple node requirements
  xpRequired?: number;
  nodesRequired?: number;
  resourceAmountRequired?: number;  // For resource_accumulated condition

  // Event parameters
  ritualId?: string;
  traumaType?: string;
  teacherParadigm?: string;
  artifactId?: string;
  locationId?: string;
  creatureType?: string;
  visionType?: string;

  // State parameters
  purityMin?: number;
  purityMax?: number;
  corruptionMin?: number;
  corruptionMax?: number;
  timeRange?: { start: number; end: number };  // 0-24 hours
  moonPhases?: Array<'new' | 'waxing' | 'full' | 'waning'>;
  seasons?: Array<'spring' | 'summer' | 'autumn' | 'winter'>;
  weatherTypes?: string[];
  emotionRequired?: string;
  emotionIntensity?: number;
  healthMin?: number;
  healthMax?: number;
  resourceType?: MagicCostType;
  resourceMin?: number;
  resourceMax?: number;

  // Comparison operators for numeric conditions
  comparison?: 'gte' | 'lte' | 'eq' | 'gt' | 'lt' | 'between';

  // Daemon-specific parameters
  teacherType?: string;     // Type of teacher required
  artifactType?: string;    // Type of artifact required
  level?: number;           // Level requirement for node_level condition
  category?: string;        // Form category for form_category condition
  maxAge?: number;          // Maximum age for age_range condition
  minAge?: number;          // Minimum age for age_range condition
  giftId?: string;          // Innate gift ID for gift_innate condition

  // Additional paradigm-specific parameters
  minimumStrength?: number; // Minimum strength requirement for Blood magic
  deityDomain?: string;     // Required deity domain for Divine magic
  minimumFavor?: number;    // Minimum favor requirement for Divine magic
  realmId?: string;         // Realm ID for Dream magic
  resourceId?: string;      // Resource ID for various magic systems
}

/** A single unlock condition */
export interface UnlockCondition {
  /** Type of condition */
  type: UnlockConditionType;

  /** Parameters for this condition */
  params: UnlockConditionParams;

  /** Human-readable description */
  description: string;

  /** Is this condition hidden until met? (discovery mechanic) */
  hidden?: boolean;

  /** Can this be bypassed? (e.g., with enough XP or divine intervention) */
  bypassable?: boolean;

  /** XP cost to bypass (if bypassable) */
  bypassCost?: number;

  /** Is this a soft requirement? (warns but allows) */
  soft?: boolean;
}

// ============================================================================
// Skill Node Types
// ============================================================================

/** Category of magic skill */
export type MagicSkillCategory =
  | 'foundation'       // Basic understanding/attunement to paradigm
  | 'technique'        // How to do magic (verbs - create, destroy, etc.)
  | 'form'             // What to affect (nouns - fire, water, etc.)
  | 'specialization'   // Paradigm-specific abilities
  | 'mastery'          // Advanced/capstone techniques
  | 'discovery'        // Discovered/unlocked elements (runes, songs, kami)
  | 'relationship'     // Relationships with entities (kami favor, daemon bond)
  | 'resource'         // Expand resource pools (mana, breath, etc.)
  | 'efficiency'       // Reduce costs, improve regeneration
  | 'ritual'           // Learned rituals and ceremonies
  | 'channeling'       // Improve channeling methods
  | 'hybrid'           // Cross-paradigm abilities
  // Daemon-specific categories
  | 'dust'             // Dust perception/interaction (Daemon paradigm)
  | 'separation';      // Daemon separation abilities (witch path)

/** Types of effects a skill node can grant */
export type MagicSkillEffectType =
  // Proficiency bonuses
  | 'technique_proficiency'    // +X to technique (create, destroy, etc.)
  | 'form_proficiency'         // +X to form (fire, water, etc.)
  | 'spell_proficiency'        // +X to specific spell
  | 'paradigm_proficiency'     // +X to overall paradigm skill

  // Resource bonuses
  | 'resource_max'             // +X to max resource pool
  | 'resource_regen'           // +X to regeneration rate
  | 'resource_efficiency'      // -X% to all costs
  | 'cost_reduction'           // -X% to specific cost type

  // Unlock abilities
  | 'unlock_technique'         // Can now use this technique
  | 'unlock_form'              // Can now affect this form
  | 'unlock_spell'             // Learn specific spell
  | 'unlock_ritual'            // Learn ritual
  | 'unlock_ability'           // Unlock paradigm-specific ability

  // Discovery unlocks
  | 'unlock_metal'             // Can burn this metal (Allomancy)
  | 'unlock_rune'              // Know this rune (Rune magic)
  | 'unlock_song'              // Know this song (Song magic)
  | 'unlock_kami_type'         // Can interact with this kami type (Shinto)
  | 'unlock_dream_realm'       // Can access this dream realm
  | 'unlock_name_category'     // Can learn names of this category

  // Relationship bonuses
  | 'kami_favor_bonus'         // +X to kami favor gains
  | 'kami_favor_decay'         // -X% to favor decay
  | 'daemon_range'             // +X to daemon separation range
  | 'daemon_communication'     // Improved daemon communication
  | 'pact_leverage'            // Better pact terms
  | 'deity_favor_bonus'        // +X to deity favor gains

  // Paradigm-specific (Sympathy)
  | 'alar_strength'            // Mental focus strength
  | 'alar_split'               // Can split focus X additional ways
  | 'link_strength'            // Sympathetic link power
  | 'slippage_reduction'       // -X% energy lost in transfers

  // Paradigm-specific (Allomancy)
  | 'burn_rate_control'        // Control burn rate (slow/fast)
  | 'flare_control'            // Can flare safely
  | 'metal_sense'              // Sense nearby metals
  | 'reserve_efficiency'       // Metal lasts longer

  // Paradigm-specific (Dream)
  | 'lucidity'                 // Lucid dreaming control
  | 'dream_stability'          // Dreams don't collapse as easily
  | 'nightmare_resistance'     // Resist nightmare effects
  | 'shared_dreaming'          // Can share dreams with others

  // Paradigm-specific (Shinto)
  | 'purity_maintenance'       // Slower purity decay
  | 'offering_effectiveness'   // Offerings grant more favor
  | 'pollution_resistance'     // Resist pollution effects
  | 'spirit_sight'             // See normally invisible spirits

  // Paradigm-specific (Rune)
  | 'rune_precision'           // Carving quality bonus
  | 'bindrune_slots'           // Can combine more runes
  | 'material_affinity'        // Bonus with specific materials
  | 'rune_duration'            // Runes last longer

  // Paradigm-specific (Song)
  | 'harmony_bonus'            // Harmony power bonus
  | 'discord_resistance'       // Resist discord effects
  | 'voice_range'              // Voice carries farther
  | 'instrument_mastery'       // Bonus with instruments
  | 'choir_coordination'       // Better group casting

  // Paradigm-specific (Daemon)
  | 'dust_sensitivity'         // Can sense/read Dust
  | 'form_flexibility'         // More daemon form options (pre-settling)
  | 'alethiometer_reading'     // Can read alethiometer
  | 'intercision_resistance'   // Resist severance attempts
  | 'bond_strength'            // Daemon bond strength
  | 'dust_affinity'            // Attract/interact with Dust
  | 'form_bonus'               // Bonus from daemon form
  | 'separation_distance'      // Max distance from daemon
  | 'lifespan'                 // Extended lifespan (witch blood)

  // General combat/stat effects
  | 'defense'                  // Defensive bonus
  | 'intimidation'             // Intimidation bonus
  | 'perception'               // Perception bonus
  | 'combat'                   // Combat effectiveness
  | 'wisdom';                  // Wisdom/insight bonus

/** Effect granted by a skill node */
export interface MagicSkillEffect {
  /** Type of effect */
  type: MagicSkillEffectType;

  /** Base value at level 1 */
  baseValue: number;

  /** Additional value per level beyond 1 */
  perLevelValue?: number;

  /** Target parameters (what this effect applies to) */
  target?: {
    techniqueId?: MagicTechnique;
    formId?: MagicForm;
    spellId?: string;
    resourceType?: MagicCostType;
    kamiType?: string;
    metalId?: string;
    runeId?: string;
    ritualId?: string;
    songId?: string;
    materialId?: string;
    abilityId?: string;
    realmId?: string;
    category?: string;
  };

  /** Flavor description */
  description?: string;
}

/** A single node in the skill tree */
export interface MagicSkillNode {
  /** Unique identifier for this node */
  id: string;

  /** Display name */
  name: string;

  /** Description of what this node does */
  description: string;

  /** Longer lore/flavor text */
  lore?: string;

  /** Which paradigm this belongs to */
  paradigmId: string;

  /** Category of skill */
  category: MagicSkillCategory;

  /** All conditions that must/can be met to unlock */
  unlockConditions: UnlockCondition[];

  /** Are all conditions required, or just one? */
  conditionMode: 'all' | 'any';

  /** XP cost to purchase (after conditions are met) */
  xpCost: number;

  /** Can be leveled up? (1 = single purchase, 5 = can level 5 times) */
  maxLevel: number;

  /** XP cost multiplier per level (e.g., 1.5 = 50% more each level) */
  levelCostMultiplier?: number;

  /** Effects when this node is unlocked/leveled */
  effects: MagicSkillEffect[];

  /** Visual tier in tree (0 = entry, higher = deeper) */
  tier: number;

  /** Visual position in tree (for UI) */
  position?: { x: number; y: number };

  /** Icon/glyph for display */
  icon?: string;

  /** Tags for filtering/searching */
  tags?: string[];

  /** Is this a hidden node? (discovered through gameplay) */
  hidden?: boolean;

  /** Prerequisite node IDs (convenience for simple trees) */
  prerequisites?: string[];
}

// ============================================================================
// Skill Tree Definition
// ============================================================================

/** How XP is earned in this tree */
export interface MagicXPSource {
  /** Event type that grants XP */
  eventType: string;

  /** Base XP amount */
  xpAmount: number;

  /** Description for UI */
  description: string;

  /** Additional conditions for this XP source */
  conditions?: UnlockCondition[];

  /** XP multiplier based on action quality */
  qualityMultiplier?: boolean;

  /** Maximum XP from this source per tick */
  maxPerTick?: number;
}

/** Special rules for tree progression */
export interface MagicTreeRules {
  /** Can XP be refunded/respent? */
  allowRespec: boolean;

  /** Cost to respec (XP lost as percentage, 0-1) */
  respecPenalty?: number;

  /** Is progression permanent or can be lost? */
  permanentProgress: boolean;

  /** What can cause progress loss? */
  progressLossConditions?: UnlockCondition[];

  /** Can this tree be learned from scratch or requires innate ability? */
  requiresInnateAbility: boolean;

  /** Innate ability condition (if required) */
  innateCondition?: UnlockCondition;

  /** Maximum total nodes that can be unlocked */
  maxNodes?: number;

  /** Can multiple trees be active? */
  exclusiveWith?: string[];  // paradigmIds that conflict

  /** Minimum time between node purchases (ticks) */
  purchaseCooldown?: number;
}

/** Complete skill tree for a paradigm */
export interface MagicSkillTree {
  /** Unique identifier */
  id: string;

  /** Which paradigm this tree is for */
  paradigmId: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Detailed lore */
  lore?: string;

  /** All nodes in this tree */
  nodes: MagicSkillNode[];

  /** Entry node IDs (no prerequisites) */
  entryNodes: string[];

  /** Connections for visual display */
  connections: Array<{ from: string; to: string }>;

  /** XP sources for this tree */
  xpSources: MagicXPSource[];

  /** Special rules for this tree */
  rules: MagicTreeRules;

  /** Total XP required to fully unlock tree */
  totalXpRequired?: number;

  /** Version for save compatibility */
  version: number;
}

// ============================================================================
// Agent Progress Tracking
// ============================================================================

/** Discovery state for paradigm-specific discoveries */
export interface MagicDiscoveries {
  /** Kami IDs encountered */
  kami?: string[];

  /** Metals discovered (Allomancy) */
  metals?: string[];

  /** Runes discovered */
  runes?: string[];

  /** Songs learned */
  songs?: string[];

  /** True names learned */
  names?: string[];

  /** Dream locations visited */
  dreamLocations?: string[];

  /** Rituals learned */
  rituals?: string[];

  /** Secrets revealed */
  secrets?: string[];

  /** Artifacts bonded */
  artifacts?: string[];

  /** Sacred locations visited */
  locations?: string[];
}

/** Tracks an agent's progress in a magic skill tree */
export interface MagicSkillProgress {
  /** Which paradigm this progress is for */
  paradigmId: string;

  /** Which tree version this progress was made with */
  treeVersion: number;

  /** Nodes unlocked and their levels */
  unlockedNodes: Record<string, number>;

  /** Total XP earned in this tree (lifetime) */
  totalXpEarned: number;

  /** XP available to spend */
  availableXp: number;

  /** Discovery state */
  discoveries: MagicDiscoveries;

  /** Relationship levels with entities */
  relationships: Record<string, number>;

  /** Timestamp when each milestone was achieved */
  milestones: Record<string, number>;

  /** Pending unlock conditions that are partially met */
  pendingConditions?: Record<string, {
    conditionsMet: number;
    conditionsTotal: number;
    details: string[];
  }>;

  /** Last XP gain timestamp */
  lastXpGain?: number;

  /** Last node purchase timestamp */
  lastPurchase?: number;

  /** Custom paradigm-specific state */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty MagicSkillProgress for a paradigm.
 */
export function createMagicSkillProgress(paradigmId: string, treeVersion: number = 1): MagicSkillProgress {
  return {
    paradigmId,
    treeVersion,
    unlockedNodes: {},
    totalXpEarned: 0,
    availableXp: 0,
    discoveries: {},
    relationships: {},
    milestones: {},
  };
}

/**
 * Create an unlock condition with defaults.
 */
export function createUnlockCondition(
  type: UnlockConditionType,
  params: UnlockConditionParams,
  description: string,
  options?: { hidden?: boolean; bypassable?: boolean; bypassCost?: number; soft?: boolean }
): UnlockCondition {
  return {
    type,
    params,
    description,
    ...options,
  };
}

/**
 * Create a skill node with defaults.
 */
export function createSkillNode(
  id: string,
  name: string,
  paradigmId: string,
  category: MagicSkillCategory,
  tier: number,
  xpCost: number,
  effects: MagicSkillEffect[],
  options?: Partial<MagicSkillNode>
): MagicSkillNode {
  return {
    id,
    name,
    description: options?.description ?? name,
    paradigmId,
    category,
    tier,
    xpCost,
    maxLevel: options?.maxLevel ?? 1,
    effects,
    unlockConditions: options?.unlockConditions ?? [],
    conditionMode: options?.conditionMode ?? 'all',
    ...options,
  };
}

/**
 * Create a skill effect with defaults.
 */
export function createSkillEffect(
  type: MagicSkillEffectType,
  baseValue: number,
  options?: {
    perLevelValue?: number;
    target?: MagicSkillEffect['target'];
    description?: string;
    resourceId?: string;
  }
): MagicSkillEffect {
  return {
    type,
    baseValue,
    ...options,
  };
}

/**
 * Create default tree rules.
 */
export function createDefaultTreeRules(requiresInnate: boolean = false): MagicTreeRules {
  return {
    allowRespec: false,
    permanentProgress: true,
    requiresInnateAbility: requiresInnate,
  };
}

/**
 * Create a skill tree with defaults.
 */
export function createSkillTree(
  id: string,
  paradigmId: string,
  name: string,
  description: string,
  nodes: MagicSkillNode[],
  xpSources: MagicXPSource[],
  options?: Partial<MagicSkillTree>
): MagicSkillTree {
  // Auto-detect entry nodes (tier 0 or no prerequisites)
  const entryNodes = nodes
    .filter(n => n.tier === 0 || (n.prerequisites?.length ?? 0) === 0)
    .map(n => n.id);

  // Auto-generate connections from prerequisites
  const connections: Array<{ from: string; to: string }> = [];
  for (const node of nodes) {
    if (node.prerequisites) {
      for (const prereq of node.prerequisites) {
        connections.push({ from: prereq, to: node.id });
      }
    }
  }

  // Calculate total XP required
  const totalXpRequired = nodes.reduce((sum, node) => {
    const baseCost = node.xpCost;
    const multiplier = node.levelCostMultiplier ?? 1;
    let nodeCost = 0;
    for (let level = 1; level <= node.maxLevel; level++) {
      nodeCost += baseCost * Math.pow(multiplier, level - 1);
    }
    return sum + nodeCost;
  }, 0);

  return {
    id,
    paradigmId,
    name,
    description,
    nodes,
    entryNodes,
    connections: options?.connections ?? connections,
    xpSources,
    rules: options?.rules ?? createDefaultTreeRules(),
    totalXpRequired,
    version: options?.version ?? 1,
    ...options,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a node by ID from a tree.
 */
export function getNodeById(tree: MagicSkillTree, nodeId: string): MagicSkillNode | undefined {
  return tree.nodes.find(n => n.id === nodeId);
}

/**
 * Get all nodes at a specific tier.
 */
export function getNodesByTier(tree: MagicSkillTree, tier: number): MagicSkillNode[] {
  return tree.nodes.filter(n => n.tier === tier);
}

/**
 * Get all nodes in a category.
 */
export function getNodesByCategory(tree: MagicSkillTree, category: MagicSkillCategory): MagicSkillNode[] {
  return tree.nodes.filter(n => n.category === category);
}

/**
 * Calculate XP cost for next level of a node.
 */
export function getNodeLevelCost(node: MagicSkillNode, currentLevel: number): number {
  if (currentLevel >= node.maxLevel) return Infinity;
  const multiplier = node.levelCostMultiplier ?? 1;
  return Math.floor(node.xpCost * Math.pow(multiplier, currentLevel));
}

/**
 * Get total effect value for a node at a given level.
 */
export function getEffectValue(effect: MagicSkillEffect, level: number): number {
  if (level <= 0) return 0;
  const perLevel = effect.perLevelValue ?? 0;
  return effect.baseValue + perLevel * (level - 1);
}

/**
 * Check if progress has a node unlocked.
 */
export function hasNodeUnlocked(progress: MagicSkillProgress, nodeId: string): boolean {
  return (progress.unlockedNodes[nodeId] ?? 0) > 0;
}

/**
 * Get the level of a node in progress.
 */
export function getNodeLevel(progress: MagicSkillProgress, nodeId: string): number {
  return progress.unlockedNodes[nodeId] ?? 0;
}

/**
 * Count total nodes unlocked in progress.
 */
export function countUnlockedNodes(progress: MagicSkillProgress): number {
  return Object.keys(progress.unlockedNodes).length;
}

/**
 * Calculate total XP spent in progress.
 */
export function calculateSpentXp(progress: MagicSkillProgress): number {
  return progress.totalXpEarned - progress.availableXp;
}
