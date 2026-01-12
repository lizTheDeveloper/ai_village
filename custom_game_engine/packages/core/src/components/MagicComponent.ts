/**
 * MagicComponent - Tracks magical abilities and resources for agents
 *
 * Forward-compatibility component for Phase 30: Magic System.
 * Supports multi-source magic (Arcane, Divine, Void, etc.) with verb/noun composition.
 *
 * Magic works differently across universes via MagicParadigm.
 * See: openspec/specs/magic-system/paradigm-spec.md
 *
 * Part of Forward-Compatibility Phase
 */

import type { Component } from '../ecs/Component.js';
import type { ParadigmAdaptation, MagicCostType } from '../magic/MagicParadigm.js';
import type { CastingState } from '../systems/CastingState.js';

// ============================================================================
// Magic Source System
// Different universes/traditions have different magic systems
// ============================================================================

/** Magic source identifiers */
export type MagicSourceId =
  | 'arcane'      // Scholarly, learned magic
  | 'divine'      // Granted by deities/player
  | 'void'        // Dark, chaotic magic
  | 'nature'      // Druidic, elemental magic
  | 'psionic'     // Mental/psychic powers
  | 'blood'       // Life force magic
  | 'ancestral';  // Magic from spirits/ancestors

/** Techniques (verbs) - what you DO with magic */
export type MagicTechnique =
  | 'create'      // Creo - bring into being
  | 'destroy'     // Perdo - diminish, damage
  | 'transform'   // Muto - change properties
  | 'perceive'    // Intellego - know, sense
  | 'control'     // Rego - manipulate, command
  | 'protect'     // Ward - shield, defend
  | 'enhance'     // Augment - improve, buff
  | 'summon';     // Call forth entities/forces

/** Forms (nouns) - what you affect with magic */
export type MagicForm =
  | 'fire'        // Ignem
  | 'water'       // Aquam
  | 'earth'       // Terram
  | 'air'         // Aurum
  | 'body'        // Corpus - physical bodies
  | 'mind'        // Mentem - thoughts, emotions
  | 'spirit'      // Anima - souls, spirits
  | 'plant'       // Herbam
  | 'animal'      // Animal
  | 'image'       // Imaginem - illusions
  | 'void'        // Emptiness, entropy
  | 'time'        // Temporal effects (rare)
  | 'space'       // Spatial effects (rare)
  | 'metal';      // Metallic substances (allomancy)

/** A composed spell (Technique + Form) */
export interface ComposedSpell {
  id: string;
  name: string;
  technique: MagicTechnique;
  form: MagicForm;
  source: MagicSourceId;
  manaCost: number;
  castTime: number;  // ticks
  range: number;     // tiles
  duration?: number; // ticks, undefined = instant
  effectId: string;  // References EffectExpression
}

/** A known spell with proficiency tracking */
export interface KnownSpell {
  spellId: string;
  proficiency: number;  // 0-100, affects success rate
  timesCast: number;
  lastCast?: number;    // game tick
}

// ============================================================================
// Mana/Magic Resource System
// ============================================================================

/** Mana pool for a specific magic source */
export interface ManaPool {
  source: MagicSourceId;
  current: number;
  maximum: number;
  regenRate: number;    // per tick
  locked: number;       // temporarily unavailable (sustaining spells)
}

// ============================================================================
// Magic Component
// ============================================================================

/**
 * MagicComponent tracks magical capabilities and resources.
 *
 * Future use cases:
 * - Spellcasting by agents
 * - Enchanting items
 * - Magic-based behaviors
 * - Multi-source magic support
 * - Cross-universe magic with paradigm adaptation
 */
export interface MagicComponent extends Component {
  type: 'magic';

  /** Whether this entity can use magic at all */
  magicUser: boolean;

  // =========================================================================
  // Paradigm Integration
  // =========================================================================

  /** Paradigm this entity learned magic under (e.g., 'academic', 'pact') */
  homeParadigmId?: string;

  /** Paradigms this entity has learned to use */
  knownParadigmIds: string[];

  /** Current paradigm context (based on universe) */
  activeParadigmId?: string;

  /** Cross-paradigm adaptations for spells */
  adaptations?: ParadigmAdaptation[];

  /** Paradigm-specific state (corruption, breath count, patron favor, etc.) */
  paradigmState: Partial<Record<string, ParadigmSpecificState>>;

  // =========================================================================
  // Resource Pools
  // =========================================================================

  /** Mana pools for each magic source this entity can access */
  manaPools: ManaPool[];

  /** Alternative resource pools by cost type (for non-mana paradigms) */
  resourcePools: Partial<Record<MagicCostType, ResourcePool>>;

  // =========================================================================
  // Knowledge & Proficiency
  // =========================================================================

  /** Spells this entity knows */
  knownSpells: KnownSpell[];

  /** Currently active sustained effects (spell IDs) */
  activeEffects: string[];

  /** Technique proficiencies (0-100) */
  techniqueProficiency: Partial<Record<MagicTechnique, number>>;

  /** Form proficiencies (0-100) */
  formProficiency: Partial<Record<MagicForm, number>>;

  // =========================================================================
  // Skill Tree State
  // =========================================================================

  /** Skill tree progression per paradigm */
  skillTreeState?: Partial<Record<string, SkillTreeParadigmState>>;

  // =========================================================================
  // Casting State
  // =========================================================================

  /** Whether currently casting */
  casting: boolean;

  /** Current spell being cast (if any) */
  currentSpellId?: string;

  /** Cast progress (0-1) */
  castProgress?: number;

  /** Active casting state (null if not casting) */
  castingState?: CastingState | null;

  /** Magic source this entity is most attuned to */
  primarySource?: MagicSourceId;

  // =========================================================================
  // Statistics & Consequences
  // =========================================================================

  /** Total spells cast (lifetime) */
  totalSpellsCast: number;

  /** Magic failures/backfires (lifetime) */
  totalMishaps: number;

  /** Corruption level from void/blood magic (0-100) */
  corruption?: number;

  /** Accumulated magical attention from entities (0-100) */
  attentionLevel?: number;

  /** Patron/deity favor level (-100 to 100) */
  favorLevel?: number;

  /** Addiction level to magic use (0-100) */
  addictionLevel?: number;
}

// ============================================================================
// Paradigm-Specific State
// ============================================================================

/**
 * State specific to a particular magic paradigm.
 * Different paradigms track different things.
 */
export interface ParadigmSpecificState {
  /** For breath magic: number of breaths held */
  breathCount?: number;

  /** For breath magic: heightening tier achieved */
  heighteningTier?: number;

  /** For pact magic: patron entity ID */
  patronId?: string;

  /** For pact magic: pact terms */
  pactTerms?: string[];

  /** For pact magic: service owed */
  serviceOwed?: number;

  /** For name magic: known true names */
  knownNames?: string[];

  /** For divine magic: deity ID */
  deityId?: string;

  /** For divine magic: standing with deity */
  deityStanding?: 'favored' | 'neutral' | 'disfavored' | 'forsaken';

  /** For blood magic: blood debt accumulated */
  bloodDebt?: number;

  /** For emotional magic: dominant emotion */
  dominantEmotion?: string;

  /** For emotional magic: emotional stability */
  emotionalStability?: number;

  // =========================================================================
  // Shinto/Animist paradigm state
  // =========================================================================

  /** For Shinto magic: currently active kami ID */
  activeKamiId?: string;

  /** For Shinto magic: accumulated spiritual pollution */
  pollution?: number;

  /** For Shinto magic: sources of pollution */
  pollutionSources?: string[];

  /** For Shinto magic: when was the last purification ritual */
  lastPurificationRitual?: number;

  // =========================================================================
  // Dream paradigm state
  // =========================================================================

  /** For dream magic: is the caster currently sleeping/dreaming */
  sleeping?: boolean;

  /** For dream magic: is the caster in a nightmare */
  inNightmare?: boolean;

  /** For dream magic: current depth in dream layers */
  currentDreamDepth?: number;

  /** For dream magic: when did the caster start sleeping */
  lastSleepStart?: number;

  // =========================================================================
  // Song/Bardic paradigm state
  // =========================================================================

  /** For song magic: does caster have an instrument equipped */
  hasInstrument?: boolean;

  /** For song magic: type of instrument */
  instrumentType?: string;

  /** For song magic: is this a choir/group performance */
  inChoir?: boolean;

  /** For song magic: number of choir members */
  choirSize?: number;

  /** For song magic: currently active song */
  currentSong?: string;

  // =========================================================================
  // Rune paradigm state
  // =========================================================================

  /** For rune magic: array of prepared rune/spell IDs */
  preparedRunes?: string[];

  /** For rune magic: number of active bindrunes */
  activeBindrunes?: number;

  /** For rune magic: array of known rune symbols */
  knownRunes?: string[];

  /** For rune magic: preferred carving material */
  preferredMaterial?: string;

  // =========================================================================
  // Sympathy paradigm state (Kingkiller Chronicle)
  // =========================================================================

  /** For sympathy magic: quality of sympathetic link (0-1) */
  linkQuality?: number;

  /** For sympathy magic: current alar split count */
  alarSplits?: number;

  /** For sympathy magic: temperature differential for heat transfer */
  temperatureDifferential?: number;

  /** For sympathy magic: currently active bindings */
  activeBindings?: number;

  /** For sympathy magic: current link IDs */
  currentLinks?: string[];

  // =========================================================================
  // Allomancy paradigm state (Mistborn)
  // =========================================================================

  /** For allomancy: current burn rate */
  burnRate?: 'gentle' | 'normal' | 'flared' | 'duralumin_boosted';

  /** For allomancy: is savant (addicted to specific metal) */
  isSavant?: boolean;

  /** For allomancy: which metal is savant for */
  savantMetal?: string;

  /** For allomancy: metal reserves (type -> amount) */
  metalReserves?: Record<string, number>;

  /** For allomancy: type of misting (single metal allomancer) */
  mistingType?: string;

  /** For allomancy: savant level per metal (addiction level) */
  savantLevels?: Record<string, number>;

  // =========================================================================
  // Daemon paradigm state (His Dark Materials)
  // =========================================================================

  /** For daemon magic: daemon entity ID */
  daemonId?: string;

  /** For daemon magic: has daemon settled (fixed form) */
  daemonSettled?: boolean;

  /** For daemon magic: distance from daemon */
  daemonDistance?: number;

  /** For daemon magic: is witch (can separate from daemon) */
  isWitch?: boolean;

  /** For daemon magic: daemon's name */
  daemonName?: string;

  /** For daemon magic: daemon's current form */
  daemonForm?: string;

  /** For daemon magic: settlement status */
  settlementStatus?: 'unsettled' | 'settling' | 'settled' | 'severed';

  /** Generic key-value storage */
  custom?: Record<string, unknown>;
}

// ============================================================================
// Skill Tree Paradigm State
// ============================================================================

/**
 * State for tracking skill tree progression in a specific paradigm.
 */
export interface SkillTreeParadigmState {
  /** Current available XP in this paradigm */
  xp: number;

  /** List of unlocked node IDs */
  unlockedNodes: string[];

  /** Progress toward each node (node ID -> progress value) */
  nodeProgress: Record<string, number>;
}

// ============================================================================
// Resource Pool (Generic)
// ============================================================================

/**
 * Generic resource pool for non-mana paradigms.
 */
export interface ResourcePool {
  type: MagicCostType;
  current: number;
  maximum: number;
  regenRate: number;
  locked: number;
}

/**
 * Create a default MagicComponent for a non-magic user.
 */
export function createMagicComponent(): MagicComponent {
  return {
    type: 'magic',
    version: 1,
    magicUser: false,
    knownParadigmIds: [],
    paradigmState: {},
    manaPools: [],
    resourcePools: {},
    knownSpells: [],
    activeEffects: [],
    techniqueProficiency: {},
    formProficiency: {},
    totalSpellsCast: 0,
    totalMishaps: 0,
    casting: false,
  };
}

/**
 * Create a MagicComponent for a magic user with a specific source.
 */
export function createMagicUserComponent(
  source: MagicSourceId,
  maxMana: number = 100,
  paradigmId: string = 'academic'
): MagicComponent {
  return {
    type: 'magic',
    version: 1,
    magicUser: true,
    homeParadigmId: paradigmId,
    knownParadigmIds: [paradigmId],
    activeParadigmId: paradigmId,
    paradigmState: {},
    manaPools: [{
      source,
      current: maxMana,
      maximum: maxMana,
      regenRate: 0.01,  // 1% per tick
      locked: 0,
    }],
    resourcePools: {},
    knownSpells: [],
    activeEffects: [],
    techniqueProficiency: {},
    formProficiency: {},
    totalSpellsCast: 0,
    totalMishaps: 0,
    casting: false,
    primarySource: source,
  };
}

/**
 * Create a MagicComponent for a specific paradigm with appropriate resources.
 */
export function createMagicComponentForParadigm(
  paradigmId: string,
  initialResources: Partial<Record<MagicCostType, number>> = {}
): MagicComponent {
  const component = createMagicComponent();
  component.magicUser = true;
  component.homeParadigmId = paradigmId;
  component.knownParadigmIds = [paradigmId];
  component.activeParadigmId = paradigmId;

  // Set up resource pools based on provided initial values
  for (const [costType, value] of Object.entries(initialResources)) {
    component.resourcePools[costType as MagicCostType] = {
      type: costType as MagicCostType,
      current: value,
      maximum: value,
      regenRate: 0,
      locked: 0,
    };
  }

  return component;
}

/**
 * Get current mana for a specific source.
 */
export function getMana(component: MagicComponent, source: MagicSourceId): number {
  const pool = component.manaPools.find(p => p.source === source);
  return pool?.current ?? 0;
}

/**
 * Get available mana (current - locked) for a specific source.
 */
export function getAvailableMana(component: MagicComponent, source: MagicSourceId): number {
  const pool = component.manaPools.find(p => p.source === source);
  if (!pool) return 0;
  return Math.max(0, pool.current - pool.locked);
}

/**
 * Check if entity can cast a specific spell.
 */
export function canCastSpell(
  component: MagicComponent,
  spell: ComposedSpell
): { canCast: boolean; reason?: string } {
  if (!component.magicUser) {
    return { canCast: false, reason: 'Not a magic user' };
  }

  const available = getAvailableMana(component, spell.source);
  if (available < spell.manaCost) {
    return { canCast: false, reason: `Insufficient mana (need ${spell.manaCost}, have ${available})` };
  }

  const known = component.knownSpells.find(k => k.spellId === spell.id);
  if (!known) {
    return { canCast: false, reason: 'Spell not known' };
  }

  if (component.casting) {
    return { canCast: false, reason: 'Already casting' };
  }

  return { canCast: true };
}
