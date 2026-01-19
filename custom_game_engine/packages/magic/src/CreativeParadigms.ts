/**
 * Creative Magic Paradigms
 *
 * Unique and unconventional magic systems from fiction and creative concepts.
 * Each paradigm has distinct mechanics, costs, and thematic coherence.
 *
 * Categories:
 * - Fiction-inspired: Sympathy, Allomancy, Dream, Song, Rune (shared with Animist)
 * - Conceptually weird: Debt, Bureaucratic, Luck, Threshold, Belief, Consumption,
 *                      Silence, Paradox, Echo, Game, Craft, Commerce
 * - Seasonal/Cyclical: Lunar, Seasonal, Age
 * - Spiritual: Shinto (shared with Animist)
 *
 * Note: 6 paradigms (sympathy, allomancy, dream, song, rune, shinto) are shared
 * with AnimistParadigms and re-exported from there. The remaining 15 are unique
 * to Creative and loaded from creative-paradigms.json.
 */

import type { MagicParadigm } from './MagicParadigm.js';
import { loadCreativeParadigms } from './data-loader.js';

// Re-export shared paradigms from Animist
import {
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  SHINTO_PARADIGM,
} from './AnimistParadigms.js';

// Load unique Creative paradigms from JSON
const _loadedCreativeParadigms = loadCreativeParadigms();

// Re-export shared paradigms
export {
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  SHINTO_PARADIGM,
};

// ============================================================================
// FICTION-INSPIRED PARADIGMS
// ============================================================================


// ============================================================================
// FICTION-INSPIRED PARADIGMS (shared with Animist)
// ============================================================================
// SYMPATHY_PARADIGM, ALLOMANCY_PARADIGM, DREAM_PARADIGM, SONG_PARADIGM, RUNE_PARADIGM
// are imported from AnimistParadigms.ts above

// ============================================================================
// CONCEPTUALLY WEIRD PARADIGMS
// ============================================================================

/**
 * DEBT MAGIC PARADIGM (Fae-style)
 *
 * Being owed creates power; debts are magical currency.
 * The greater the debt, the greater the power.
 *
 * Core Mechanic: Favors and obligations = power source
 * Cost: Social capital, binding oaths
 * Danger: Debt collectors, oath violations, bankruptcy
 */
export const DEBT_PARADIGM: MagicParadigm = _loadedCreativeParadigms.debt!;

/**
 * BUREAUCRATIC MAGIC PARADIGM
 *
 * Paperwork, forms, stamps, and red tape have literal magical power.
 * Proper filing can alter reality.
 *
 * Core Mechanic: Correct forms = reality changes
 * Cost: Time, ink, patience, sanity
 * Danger: Lost in paperwork, form errors, audit failures
 */
export const BUREAUCRATIC_PARADIGM: MagicParadigm = _loadedCreativeParadigms.bureaucratic!;

/**
 * LUCK MAGIC PARADIGM
 *
 * Borrow luck from your future self.
 * Eventually it runs out catastrophically.
 *
 * Core Mechanic: Temporal luck redistribution
 * Cost: Future misfortune, karma debt
 * Danger: Catastrophic bad luck, fate backlash
 */
export const LUCK_PARADIGM: MagicParadigm = _loadedCreativeParadigms.luck!;

/**
 * THRESHOLD MAGIC PARADIGM
 *
 * Doorways, crossroads, and boundaries are sources of power.
 * Liminal spaces hold magic.
 *
 * Core Mechanic: Power in transitions and boundaries
 * Cost: Must be at thresholds, requires passage
 * Danger: Stuck between, lost in transition
 */
export const THRESHOLD_PARADIGM: MagicParadigm = _loadedCreativeParadigms.threshold!;

/**
 * BELIEF MAGIC PARADIGM
 *
 * If enough people believe something, it becomes true.
 * Collective faith shapes reality.
 *
 * Core Mechanic: Believers = power source
 * Cost: Requires followers, faith management
 * Danger: Loss of belief, heresy, disillusionment
 */
export const BELIEF_PARADIGM: MagicParadigm = _loadedCreativeParadigms.belief!;

/**
 * CONSUMPTION MAGIC PARADIGM
 *
 * Eat something to temporarily gain its properties.
 * You are what you eat, literally.
 *
 * Core Mechanic: Ingestion = temporary transformation
 * Cost: Digestion, transformation strain
 * Danger: Incomplete digestion, permanent changes
 */
export const CONSUMPTION_PARADIGM: MagicParadigm = _loadedCreativeParadigms.consumption!;

/**
 * SILENCE MAGIC PARADIGM
 *
 * Power in the absence of sound.
 * The louder the environment, the weaker the magic.
 *
 * Core Mechanic: Silence = power source
 * Cost: Requires quiet, forbids speech
 * Danger: Deafness, eternal silence, sound sickness
 */
export const SILENCE_PARADIGM: MagicParadigm = _loadedCreativeParadigms.silence!;

/**
 * PARADOX MAGIC PARADIGM
 *
 * Exploit logical contradictions to break reality.
 * Dangerous and unpredictable.
 *
 * Core Mechanic: Contradictions = power source
 * Cost: Sanity, reality stability
 * Danger: Paradox collapse, reality tears, madness
 */
export const PARADOX_PARADIGM: MagicParadigm = _loadedCreativeParadigms.paradox!;

/**
 * ECHO MAGIC PARADIGM
 *
 * Use memories and residual impressions of past events.
 * History echoes and can be replayed.
 *
 * Core Mechanic: Past events leave magical imprints
 * Cost: Memory loss, temporal confusion
 * Danger: Lost in the past, echo loops
 */
export const ECHO_PARADIGM: MagicParadigm = _loadedCreativeParadigms.echo!;

/**
 * GAME MAGIC PARADIGM
 *
 * Challenges and wagers have binding magical power.
 * Win the game, win the power.
 *
 * Core Mechanic: Stakes and rules create binding contracts
 * Cost: Must honor bets, must play fair
 * Danger: Cheaters destroyed, eternal games, losing everything
 */
export const GAME_PARADIGM: MagicParadigm = _loadedCreativeParadigms.game!;

/**
 * CRAFT MAGIC PARADIGM
 *
 * The act of making things imbues them with intent and power.
 * Creation is inherently magical.
 *
 * Core Mechanic: Crafting process = enchantment
 * Cost: Time, materials, skill
 * Danger: Flawed creations, cursed items, obsession
 */
export const CRAFT_PARADIGM: MagicParadigm = _loadedCreativeParadigms.craft!;

/**
 * COMMERCE MAGIC PARADIGM
 *
 * Fair trade, haggling, and currency have magical power.
 * Economics is literally magic.
 *
 * Core Mechanic: Trade agreements create power
 * Cost: Must honor deals, market forces
 * Danger: Market crash, unfair trades, bankruptcy
 */
export const COMMERCE_PARADIGM: MagicParadigm = _loadedCreativeParadigms.commerce!;

// ============================================================================
// SEASONAL/CYCLICAL PARADIGMS
// ============================================================================

/**
 * LUNAR MAGIC PARADIGM
 *
 * Power waxes and wanes with the moon phases.
 * New moon = weakest, full moon = strongest.
 *
 * Core Mechanic: Moon phase determines power
 * Cost: Cyclical availability
 * Danger: Moon madness, werewolf transformation
 */
export const LUNAR_PARADIGM: MagicParadigm = _loadedCreativeParadigms.lunar!;

/**
 * SEASONAL MAGIC PARADIGM
 *
 * Different abilities in different seasons.
 * Spring, Summer, Fall, Winter each grant unique powers.
 *
 * Core Mechanic: Season determines available magic
 * Cost: Cyclical limitations
 * Danger: Seasonal lock, eternal winter
 */
export const SEASONAL_PARADIGM: MagicParadigm = _loadedCreativeParadigms.seasonal!;

/**
 * AGE MAGIC PARADIGM
 *
 * Youth and age as spendable resources.
 * Trade years of life for power.
 *
 * Core Mechanic: Lifespan is currency
 * Cost: Aging, shortened life
 * Danger: Rapid aging, death, eternal youth curse
 */
export const AGE_PARADIGM: MagicParadigm = _loadedCreativeParadigms.age!;


// ============================================================================
// SPIRITUAL PARADIGM - SHINTO (shared with Animist)
// ============================================================================
// SHINTO_PARADIGM is imported from AnimistParadigms.ts above

// ============================================================================
// EXPORTS
// ============================================================================

export const ALL_CREATIVE_PARADIGMS = [
  // Fiction
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  // Conceptually Weird
  DEBT_PARADIGM,
  BUREAUCRATIC_PARADIGM,
  LUCK_PARADIGM,
  THRESHOLD_PARADIGM,
  BELIEF_PARADIGM,
  CONSUMPTION_PARADIGM,
  SILENCE_PARADIGM,
  PARADOX_PARADIGM,
  ECHO_PARADIGM,
  GAME_PARADIGM,
  CRAFT_PARADIGM,
  COMMERCE_PARADIGM,
  // Seasonal/Cyclical
  LUNAR_PARADIGM,
  SEASONAL_PARADIGM,
  AGE_PARADIGM,
  // Spiritual
  SHINTO_PARADIGM,
];
