/**
 * ParadigmStateComponent - Tracks paradigm-specific state and adaptations
 *
 * Split from MagicComponent Phase 2 - focused component for paradigm mechanics.
 *
 * Handles:
 * - Home paradigm (where magic was learned)
 * - Active paradigm (current universe context)
 * - Cross-paradigm adaptations
 * - Paradigm-specific state (breath count, patron favor, etc.)
 */

import type { Component } from '../ecs/Component.js';
import type { ParadigmAdaptation } from '../magic/MagicParadigm.js';

/**
 * State specific to a particular magic paradigm.
 * Different paradigms track different things.
 */
export interface ParadigmSpecificState {
  /** For breath magic: number of breaths held */
  breathCount?: number;

  /** For breath magic: pneumantic tier achieved */
  pneumanticTier?: number;

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

  // Shinto/Animist paradigm state
  /** For Shinto magic: currently active kami ID */
  activeKamiId?: string;

  /** For Shinto magic: accumulated spiritual pollution */
  pollution?: number;

  /** For Shinto magic: sources of pollution */
  pollutionSources?: string[];

  /** For Shinto magic: when was the last purification ritual */
  lastPurificationRitual?: number;

  // Dream paradigm state
  /** For dream magic: is the caster currently sleeping/dreaming */
  sleeping?: boolean;

  /** For dream magic: is the caster in a nightmare */
  inNightmare?: boolean;

  /** For dream magic: current depth in dream layers */
  currentDreamDepth?: number;

  /** For dream magic: when did the caster start sleeping */
  lastSleepStart?: number;

  // Song/Bardic paradigm state
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

  // Rune paradigm state
  /** For rune magic: array of prepared rune/spell IDs */
  preparedRunes?: string[];

  /** For rune magic: number of active bindrunes */
  activeBindrunes?: number;

  /** For rune magic: array of known rune symbols */
  knownRunes?: string[];

  /** For rune magic: preferred carving material */
  preferredMaterial?: string;

  // Tethermancy paradigm state (resonance_realms Chronicle)
  /** For tethermancy magic: quality of sympathetic link (0-1) */
  linkQuality?: number;

  /** For tethermancy magic: current attunement split count */
  alarSplits?: number;

  /** For tethermancy magic: temperature differential for heat transfer */
  temperatureDifferential?: number;

  /** For tethermancy magic: currently active bindings */
  activeBindings?: number;

  /** For tethermancy magic: current link IDs */
  currentLinks?: string[];

  // Ferromancy paradigm state (CrucibleBorn)
  /** For ferromancy: current burn rate */
  burnRate?: 'gentle' | 'normal' | 'flared' | 'amplium_boosted';

  /** For ferromancy: is savant (addicted to specific metal) */
  isSavant?: boolean;

  /** For ferromancy: which metal is savant for */
  savantMetal?: string;

  /** For ferromancy: metal reserves (type -> amount) */
  metalReserves?: Record<string, number>;

  /** For ferromancy: type of ore_attuned (single metal ferromancer) */
  ore_attunedType?: string;

  /** For ferromancy: savant level per metal (addiction level) */
  savantLevels?: Record<string, number>;

  // Animus paradigm state (spirit-bond tradition)
  /** For animus magic: animus entity ID */
  animusId?: string;

  /** For animus magic: has animus settled (fixed form) */
  animusSettled?: boolean;

  /** For animus magic: distance from animus */
  animusDistance?: number;

  /** For animus magic: is witch (can separate from animus) */
  isWitch?: boolean;

  /** For animus magic: animus's name */
  animusName?: string;

  /** For animus magic: animus's current form */
  animusForm?: string;

  /** For animus magic: settlement status */
  settlementStatus?: 'unsettled' | 'settling' | 'settled' | 'severed';

  /** Generic key-value storage */
  custom?: Record<string, unknown>;
}

/**
 * Tracks paradigm-specific state and cross-paradigm adaptations.
 *
 * Magic works differently across universes via MagicParadigm.
 * This component tracks which paradigms an entity knows and their state.
 */
export interface ParadigmStateComponent extends Component {
  type: 'paradigm_state';

  /** Paradigm this entity learned magic under (e.g., 'academic', 'pact') */
  homeParadigmId?: string;

  /** Current paradigm context (based on universe) */
  activeParadigmId?: string;

  /** Cross-paradigm adaptations for spells */
  adaptations?: ParadigmAdaptation[];

  /** Paradigm-specific state (corruption, breath count, patron favor, etc.) */
  paradigmState: Partial<Record<string, ParadigmSpecificState>>;

  /** Corruption level from void/blood magic (0-100) */
  corruption?: number;

  /** Accumulated magical attention from entities (0-100) */
  attentionLevel?: number;

  /** Patron/deity favor level (-100 to 100) */
  favorLevel?: number;

  /** Addiction level to magic use (0-100) */
  addictionLevel?: number;
}

/**
 * Create a default ParadigmStateComponent with no paradigms.
 */
export function createParadigmStateComponent(): ParadigmStateComponent {
  return {
    type: 'paradigm_state',
    version: 1,
    paradigmState: {},
  };
}

/**
 * Create a ParadigmStateComponent with a specific paradigm.
 */
export function createParadigmStateComponentWithParadigm(
  paradigmId: string
): ParadigmStateComponent {
  return {
    type: 'paradigm_state',
    version: 1,
    homeParadigmId: paradigmId,
    activeParadigmId: paradigmId,
    paradigmState: {},
  };
}

/**
 * Get paradigm-specific state for a paradigm from a component.
 */
export function getComponentParadigmState(
  component: ParadigmStateComponent,
  paradigmId: string
): ParadigmSpecificState | undefined {
  return component.paradigmState[paradigmId];
}

/**
 * Check if entity has a specific paradigm.
 */
export function hasParadigm(component: ParadigmStateComponent, paradigmId: string): boolean {
  return component.paradigmState[paradigmId] !== undefined;
}
