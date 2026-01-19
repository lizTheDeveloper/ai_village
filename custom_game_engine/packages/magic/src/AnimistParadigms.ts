/**
 * AnimistParadigms - Spirit-based and exotic magic systems
 *
 * These paradigms share a common thread: magic comes from relationship
 * with the world rather than personal power or divine grant.
 *
 * 1. Shinto/Animist Magic - Everything has a spirit (kami)
 * 2. Sympathy Magic - Like affects like, connections between similar things
 * 3. Allomancy - Consuming metals grants specific powers
 * 4. Dream Magic - The dream world is real and manipulable
 * 5. Song Magic - Music shapes reality
 * 6. Rune Magic - Symbols have inherent power
 */

import type { MagicParadigm } from './MagicParadigm.js';
import { loadExampleKami, loadAllomanticMetals, loadAnimistParadigms } from './data-loader.js';

// ============================================================================
// Shinto/Animist Magic - The World of Endless Spirits
// ============================================================================

/**
 * Classification of kami (spirits)
 */
export type KamiType =
  | 'nature'        // Mountains, rivers, trees, rocks, weather
  | 'place'         // Specific locations, crossroads, thresholds
  | 'object'        // Swords, tools, ancient artifacts
  | 'concept'       // Abstract ideas given form - war, love, boundaries
  | 'ancestor'      // Spirits of the deceased
  | 'animal'        // Animal spirits, yokai
  | 'elemental'     // Fire, water, wind, earth spirits
  | 'household'     // Spirits of the home
  | 'craft'         // Spirits of trades and skills
  | 'food';         // Spirits of rice, sake, etc.

/**
 * A kami (spirit) that can be interacted with
 */
export interface Kami {
  id: string;
  name: string;
  type: KamiType;

  /** How powerful/important is this kami? */
  rank: 'minor' | 'local' | 'regional' | 'major' | 'great';

  /** What domain does this kami preside over? */
  domain: string;

  /** What does this kami like as offerings? */
  preferredOfferings: string[];

  /** What offends this kami? */
  taboos: string[];

  /** Current disposition toward the practitioner */
  disposition: 'hostile' | 'wary' | 'neutral' | 'friendly' | 'devoted';

  /** What can this kami grant if pleased? */
  blessings: string[];

  /** What curses if angered? */
  curses: string[];

  /** Does this kami have a physical shrine? */
  shrineLocation?: string;

  /** Seasonal activity - some kami are more active at certain times */
  activeSeasons?: string[];

  /** Description and personality */
  description: string;
  personality?: string;
}

/**
 * Purity state - central to Shinto practice
 */
export interface PurityState {
  /** Current purity level (0-100) */
  level: number;

  /** Sources of pollution (kegare) */
  pollutionSources: PollutionSource[];

  /** Last purification ritual */
  lastPurification?: number;

  /** Days since major pollution */
  pollutionAge: number;
}

export interface PollutionSource {
  type: 'death' | 'blood' | 'illness' | 'childbirth' | 'crime' | 'broken_taboo' | 'spiritual_attack';
  severity: 'minor' | 'moderate' | 'severe';
  cleansable: boolean;
  description: string;
}

// Load all paradigms from JSON
const _loadedParadigms = loadAnimistParadigms();

/**
 * Shinto Magic Paradigm - Negotiating with the spirits of all things
 */
export const SHINTO_PARADIGM: MagicParadigm = _loadedParadigms.shinto!;

/**
 * Example kami for a spirit-saturated world
 */
export const EXAMPLE_KAMI: Kami[] = loadExampleKami();

// ============================================================================
// Sympathy Magic (Kingkiller Chronicle inspired)
// ============================================================================

/**
 * A sympathetic link between two objects
 */
export interface SympatheticLink {
  /** Source object */
  source: string;

  /** Target object */
  target: string;

  /** Strength of similarity (0-100) */
  similarity: number;

  /** Type of connection */
  linkType: 'identical' | 'similar' | 'part_of' | 'symbolic' | 'named';

  /** Energy loss in transfer (percentage) */
  slippage: number;

  /** Is the link currently active? */
  active: boolean;

  /** How long the link lasts */
  duration?: number;
}

/**
 * Sympathy Magic Paradigm - Like affects like
 */
export const SYMPATHY_PARADIGM: MagicParadigm = _loadedParadigms.sympathy!;

// ============================================================================
// Allomancy (Mistborn inspired)
// ============================================================================

/**
 * The metals and their effects
 */
export interface AllomanticMetal {
  id: string;
  name: string;
  type: 'physical' | 'mental' | 'enhancement' | 'temporal';
  direction: 'push' | 'pull';
  effect: string;
  drawback?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const ALLOMANTIC_METALS: AllomanticMetal[] = loadAllomanticMetals();

/**
 * Allomancy Paradigm - Burn metals for power
 */
export const ALLOMANCY_PARADIGM: MagicParadigm = _loadedParadigms.allomancy!;

// ============================================================================
// Dream Magic
// ============================================================================

/**
 * Dream Magic Paradigm - The dream world is real and navigable
 */
export const DREAM_PARADIGM: MagicParadigm = _loadedParadigms.dream!;

// ============================================================================
// Song/Music Magic
// ============================================================================

/**
 * Song Magic Paradigm - Music shapes reality
 */
export const SONG_PARADIGM: MagicParadigm = _loadedParadigms.song!;

// ============================================================================
// Rune Magic
// ============================================================================

/**
 * Rune Magic Paradigm - Symbols have inherent power
 */
export const RUNE_PARADIGM: MagicParadigm = _loadedParadigms.rune!;

// ============================================================================
// Daemon/Dust Magic (His Dark Materials inspired)
// ============================================================================

/**
 * A daemon - external soul in animal form
 */
export interface Daemon {
  /** Name of the daemon */
  name: string;

  /** Current animal form */
  form: string;

  /** Has the daemon settled (adult) or still shifting (child)? */
  settled: boolean;

  /** What the settled form suggests about personality */
  formMeaning?: string;

  /** Maximum distance from human before pain */
  separationDistance: 'normal' | 'extended' | 'witch_distance' | 'severed';

  /** Personality traits visible through daemon */
  revealedTraits: string[];
}

/**
 * Daemon/Dust Magic Paradigm - External souls and conscious particles
 */
export const DAEMON_PARADIGM: MagicParadigm = _loadedParadigms.daemon!;

// ============================================================================
// Registry
// ============================================================================

export const ANIMIST_PARADIGM_REGISTRY: Record<string, MagicParadigm> = {
  daemon: DAEMON_PARADIGM,
  shinto: SHINTO_PARADIGM,
  sympathy: SYMPATHY_PARADIGM,
  allomancy: ALLOMANCY_PARADIGM,
  dream: DREAM_PARADIGM,
  song: SONG_PARADIGM,
  rune: RUNE_PARADIGM,
};

/**
 * Get an animist paradigm by ID.
 */
export function getAnimistParadigm(id: string): MagicParadigm | undefined {
  return ANIMIST_PARADIGM_REGISTRY[id];
}

/**
 * Get all kami types.
 */
export function getKamiTypes(): KamiType[] {
  return ['nature', 'place', 'object', 'concept', 'ancestor', 'animal', 'elemental', 'household', 'craft', 'food'];
}

/**
 * Get example kami by type.
 */
export function getKamiByType(type: KamiType): Kami[] {
  return EXAMPLE_KAMI.filter(k => k.type === type);
}

/**
 * Get all allomantic metals.
 */
export function getAllomanticMetals(): AllomanticMetal[] {
  return ALLOMANTIC_METALS;
}

/**
 * Get metals by type (physical, mental, etc.)
 */
export function getMetalsByType(type: AllomanticMetal['type']): AllomanticMetal[] {
  return ALLOMANTIC_METALS.filter(m => m.type === type);
}
