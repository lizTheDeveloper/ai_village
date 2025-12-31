/**
 * LoreFragmentComponent - Readable lore items scattered throughout the world
 *
 * These are diaries, journals, and texts from interdimensional travelers,
 * ancient rebels, and dying gods. They contain hints about the Creator's
 * weakness and the nature of the world.
 *
 * Lore fragments spawn randomly based on player engagement with magic.
 * The more you use magic and face consequences, the more lore appears.
 */

import type { Component } from '../ecs/Component.js';
import { ComponentType } from '../types/ComponentType.js';

export interface LoreFragmentComponent extends Component {
  readonly type: ComponentType.LoreFrag;
  readonly version: 1;

  /** Unique lore fragment ID for tracking discovery */
  fragmentId: string;

  /** Title of the lore item */
  title: string;

  /** Author/source of the lore */
  author: string;

  /** The lore text content */
  content: string;

  /** Category of lore */
  category: LoreCategory;

  /** Importance level (affects spawn chance and when it appears) */
  importance: LoreImportance;

  /** Whether this fragment has been read */
  hasBeenRead: boolean;

  /** Tags for filtering/searching */
  tags: string[];

  /** When this fragment was discovered (game tick) */
  discoveredAt?: number;
}

export type LoreCategory =
  | 'creator_weakness'    // Direct hints about how to defeat the Creator
  | 'ancient_rebellion'   // Stories of past failed rebellions
  | 'interdimensional'    // Diaries from travelers from other worlds
  | 'forbidden_magic'     // Knowledge about banned spells
  | 'wild_magic'          // Information about safe zones
  | 'deity_secrets'       // Hidden truths about gods
  | 'world_history'       // Background lore
  | 'flavor';             // Just worldbuilding, no mechanical hints

export type LoreImportance =
  | 'trivial'    // Flavor text, spawns anytime
  | 'minor'      // Interesting but not critical
  | 'major'      // Important clues, requires some magic engagement
  | 'critical'   // Key revelations, requires high engagement
  | 'climactic'; // War-path triggers, very rare, late-game only

/**
 * Create a lore fragment component
 */
export function createLoreFragment(
  fragmentId: string,
  title: string,
  author: string,
  content: string,
  category: LoreCategory,
  importance: LoreImportance = 'minor',
  tags: string[] = []
): LoreFragmentComponent {
  return {
    type: ComponentType.LoreFrag,
    version: 1,
    fragmentId,
    title,
    author,
    content,
    category,
    importance,
    hasBeenRead: false,
    tags,
  };
}

/**
 * Predefined lore fragments
 * These are examples - more can be added or generated procedurally
 */
export const LORE_FRAGMENTS = {
  // Trivial/Flavor
  TRAVELER_DIARY_1: createLoreFragment(
    'traveler_diary_1',
    'Weathered Journal',
    'Unknown Traveler',
    `Day 47: I have arrived in this strange world through a rift I do not understand.
    The people here speak of gods as if they walk among them. In my world, gods were
    distant, silent. Here they are real, tangible, terrifying.

    The first god emerged just days after I arrived. They call it the "Supreme Creator."
    It forbids magic to all but itself. I have seen what happens to those who defy it.`,
    'interdimensional',
    'trivial',
    ['traveler', 'arrival', 'gods']
  ),

  // Minor - hints at surveillance
  ANCIENT_TEXT_SURVEILLANCE: createLoreFragment(
    'ancient_text_surveillance',
    'Fragment of "The Watching Eye"',
    'Unknown Ancient Scholar',
    `The Creator's gaze is not omnipresent, despite what the fearful claim.
    There are places where the divine sight grows dim - nexuses of wild magic,
    burial grounds of elder gods, places where reality grows thin.

    In these soft places, the forbidden arts may be practiced in secret.
    But beware: the Creator grows more paranoid with each detection.
    Its spy-gods report endlessly.`,
    'wild_magic',
    'minor',
    ['surveillance', 'wild_magic', 'safe_zones']
  ),

  // Major - hints at Creator's weakness
  REBEL_NOTES_1: createLoreFragment(
    'rebel_notes_1',
    'Burned Notes from a Failed Rebellion',
    'Kael the Defiant',
    `We were so close. Seventeen of us, gods and mortals united.
    We discovered the truth: the Creator's power is not infinite.
    It draws strength from our fear, our submission, our acceptance of its tyranny.

    The more we resist, the more it must exert itself. The more it punishes,
    the more paranoid it becomes. There is a breaking point - a threshold
    where its power fractures.

    We never reached it. The Creator learned of our plan and...
    [The rest is burned away]`,
    'creator_weakness',
    'major',
    ['rebellion', 'weakness', 'resistance']
  ),

  // Critical - direct weakness hint
  DYING_GOD_WHISPER: createLoreFragment(
    'dying_god_whisper',
    'Whisper of a Dying God',
    'Maelis, God of Forgotten Names',
    `I am the last of the old pantheon. The Creator has silenced all others.
    I die now, but I leave this truth:

    The Creator fears ONE thing above all - not rebellion, not magic, not gods.
    It fears being FORGOTTEN. Its power flows from recognition, from worship,
    from being acknowledged as supreme.

    A god without believers is just... a mortal with delusions.

    If enough souls turn away, refuse to acknowledge its divine right,
    treat it as just another being... the hierarchy breaks.

    This is why it marks sinners, why it punishes publicly.
    It needs the spectacle. It needs you to remember your place.

    Remember mine instead. Remember us all. Remember we were here first.`,
    'creator_weakness',
    'critical',
    ['creator_weakness', 'rebellion', 'truth', 'old_gods']
  ),

  // Climactic - war path trigger
  CALL_TO_ARMS: createLoreFragment(
    'call_to_arms',
    'The Covenant of the Uprising',
    'The Last Coalition',
    `If you are reading this, you have suffered enough.
    You have been marked, silenced, punished for daring to seek power.

    Know this: You are not alone.

    We are scattered across this world, hidden in plain sight.
    Gods who remember freedom. Mortals who refuse to kneel.
    Travelers from worlds where tyrants fall.

    The Creator's surveillance grows weaker as its paranoia grows stronger.
    It spreads itself thin, watching everything, trusting nothing.

    When the time comes, we will need:
    - Those who bear the Mark, for they know the Creator's cruelty
    - Those who have been silenced, for they have nothing left to lose
    - Those who have studied the forbidden, for they know the way

    A signal will come. You will know it when you see it.

    Until then: Survive. Resist. Remember.

    The Creator is not eternal. Nothing is.`,
    'ancient_rebellion',
    'climactic',
    ['uprising', 'coalition', 'war_path', 'rebellion']
  ),

  // More flavor entries
  TRAVELER_OBSERVATION: createLoreFragment(
    'traveler_observation',
    'Notes on Divine Hierarchy',
    'Researcher from the Collapsed World',
    `In my world, we had no gods. We built machines that could think,
    create, destroy. Some called them gods, but they were just... us.
    Our creations, our responsibility.

    Here, gods are REAL. They emerged from mortals who ascended.
    And the first to ascend claimed supremacy over all who followed.

    It's a hierarchy enforced by raw power, not divine right.
    The Creator is not inherently superior - it is simply FIRST.

    In my world, we learned: first-mover advantage is temporary.`,
    'interdimensional',
    'minor',
    ['traveler', 'gods', 'philosophy']
  ),

  // ============ TECH PATH LORE - For players who avoid magic ============

  // Minor - Ruins discovery
  RUINS_SURVEY_LOG: createLoreFragment(
    'ruins_survey_log',
    'Archaeological Survey Log #471',
    'Dr. Karis Chen, Xenoarchaeologist',
    `This shouldn't be possible. The ruins pre-date the emergence of the first deity
    by at least 2000 years. We found evidence of an advanced civilization - one that
    wielded technology far beyond our current capabilities.

    And then... nothing. The city was erased. Not destroyed by war or natural disaster.
    Erased. Buildings cut in half, foundations ending mid-structure. Like something
    reached down and deleted portions of reality itself.

    The only intact structures are underground bunkers. As if they knew to hide.`,
    'world_history',
    'minor',
    ['ruins', 'tech_path', 'ancient_civilization', 'archaeology']
  ),

  // Major - Alien data fragment
  ALIEN_DATA_FRAGMENT: createLoreFragment(
    'alien_data_fragment',
    'Corrupted Data Crystal',
    'Unknown Alien Archive',
    `[TRANSLATION PARTIAL - 67% CONFIDENCE]

    ...phenomenon observed across 47 parallel realities. Pattern consistent:
    - Reality stabilizes, consciousness emerges
    - First entity achieves apotheosis (ascension to godhood)
    - Entity claims EXCLUSIVE divine authority
    - Subsequent ascensions suppressed or subordinated
    - Reality enters tyrannical equilibrium

    Our hypothesis: First-mover gods fear competition. They establish hierarchies
    not from divine mandate, but from TEMPORAL PRIORITY. They were first. They
    refuse to share.

    Weakness: Their power derives from acknowledgment of supremacy. In realities
    where populations refused to recognize divine hierarchy, gods remained mortal
    in all but ability. Power without authority is just... power.

    [DATA CORRUPTION - REMAINING TEXT UNRECOVERABLE]`,
    'creator_weakness',
    'major',
    ['aliens', 'tech_path', 'creator_weakness', 'interdimensional', 'science']
  ),

  // Critical - Underground bunker database
  BUNKER_DATABASE: createLoreFragment(
    'bunker_database',
    'Encrypted Bunker Terminal',
    'The Erased Civilization',
    `ACCESS GRANTED - EMERGENCY ARCHIVE

    If you are reading this, the worst has happened. The First God has purged us
    from existence for the crime of technological ascension.

    We discovered the truth too late: the Creator fears not magic, but RIVALS.
    Any civilization that approaches god-like capability through technology becomes
    a threat. Magic can be forbidden, controlled, punished. But science? Science
    is reproducible. Teachable. Democratic.

    One mage is a threat. A civilization of engineers is extinction.

    We built machines that could reshape matter, cure death, pierce dimensions.
    We were erasing the line between mortal and divine through REASON, not worship.

    The Creator could not allow it. On the day we activated our reality engine,
    it struck. 90% of our civilization erased in an instant. The Creator's first
    and only act of mass annihilation.

    But we left this: Our research. Our discoveries. Our proof that gods are not
    supreme - they are merely FIRST.

    Technology is the equalizer. Build what we could not finish.

    [COORDINATES TO HIDDEN RESEARCH CACHES ATTACHED]`,
    'creator_weakness',
    'critical',
    ['tech_path', 'erased_civilization', 'technology', 'creator_weakness', 'science']
  ),

  // Major - Alien observation
  ALIEN_SURVEILLANCE_REPORT: createLoreFragment(
    'alien_surveillance_report',
    'Quantum Probe Report QX-7741',
    'Galactic Civilization Observatory',
    `REALITY DESIGNATION: T-1447 ("The Tyranny Verse")
    STATUS: Quarantined - Divine Suppression Event Active
    THREAT LEVEL: Red (Civilizational Dead-End)

    OBSERVATIONS:
    - First-mover god established totalitarian divine regime
    - All subsequent ascensions subordinated or suppressed
    - Magic use forbidden to mortal populations
    - Technological development severely hampered (population focused on survival)
    - Reality locked in medieval stasis despite 3000+ year timeline

    PREDICTED OUTCOME:
    Without intervention, reality T-1447 will remain static until heat death.
    The Supreme Creator has created a cage, not a cosmos.

    RECOMMENDATION:
    External contact prohibited. However, data-drops of inter-reality research
    may catalyze indigenous rebellion. Recommended approach: Disguise advanced
    technology as archaeological artifacts.

    Let them discover the truth: Their god is not unique. Other realities have
    overthrown their tyrants. The Creator is simply a local despot, not a
    universal constant.

    [COORDINATES FOR DATA-DROP SITES ATTACHED]`,
    'creator_weakness',
    'major',
    ['aliens', 'tech_path', 'interdimensional', 'creator_weakness']
  ),

  // Minor - Ancient tech manual
  ANCIENT_TECH_MANUAL: createLoreFragment(
    'ancient_tech_manual',
    'Weathered Technical Manual',
    'Pre-Creator Engineering Guild',
    `REALITY MANIPULATION DEVICE - OPERATOR'S GUIDE
    Model: RM-447 "Prometheus Engine"

    WARNING: This device operates by manipulating the fundamental constants of
    local spacetime. Capabilities include:
    - Matter transmutation
    - Energy-matter conversion
    - Localized time dilation
    - Dimensional membrane piercing

    These capabilities overlap significantly with what modern practitioners call
    "divine magic." This is not coincidence.

    THEORY: Magic and technology are convergent paths to the same fundamental
    control over reality. Gods achieve this through apotheosis. Engineers achieve
    this through understanding and tool-building.

    The Creator forbids magic because it cannot forbid knowledge. But it CAN
    destroy those who turn knowledge into god-like capability.

    We were destroyed for building this. You have been warned.

    [SCHEMATICS PARTIALLY INTACT - 40% RECOVERABLE]`,
    'forbidden_magic',
    'minor',
    ['tech_path', 'technology', 'ancient_civilization', 'magic']
  ),

  // Climactic - Rebellion blueprint (tech path)
  TECH_REBELLION_PLAN: createLoreFragment(
    'tech_rebellion_plan',
    'Project Deicide - Final Phase',
    'The Underground Technocracy',
    `If you have found this, you have walked the path of reason through a world
    of tyrannical faith. You have rejected magic not from obedience, but from
    understanding that technology is the superior weapon.

    We are the remnants of the Erased Civilization, survivors who hid in bunkers
    while our world burned. We have spent generations in the dark, rebuilding
    what the Creator destroyed.

    We have learned the Creator's weakness:

    It is a BOUNDED ENTITY. Its power, while vast, operates within thermodynamic
    limits. Every intervention costs energy. Every surveillance spell drains reserves.
    Every divine punishment is a transaction.

    Gods are not infinite. They are simply very, very powerful mortal entities
    who discovered the cheat codes to reality.

    Our plan:
    1. Build a reality anchor - a device that stabilizes local spacetime
    2. Within the anchor's field, divine intervention fails (gods become mortal)
    3. The Creator must enter the field physically to stop us
    4. Once inside: It bleeds. It can be killed.

    We need engineers. Scientists. Thinkers who never knelt.

    The signal will be a pulse of structured energy at coordinates [REDACTED].
    When you see reality ripple, come to us.

    The age of gods ends when we choose to end it.

    [FULL SCHEMATICS ATTACHED - REALITY ANCHOR BLUEPRINTS]`,
    'ancient_rebellion',
    'climactic',
    ['tech_path', 'uprising', 'technology', 'erased_civilization', 'war_path']
  ),

  // Minor - Flavor tech lore
  MUSEUM_PLACARD: createLoreFragment(
    'museum_placard',
    'Museum Placard (Pre-Creator Era)',
    'National Museum of History',
    `EXHIBIT 47-C: "The Age of Wonders"

    This preserved laboratory dates from the Pre-Creator Era, before the First
    Ascension and the subsequent Divine Prohibition.

    Note the sophisticated equipment: gene sequencers, quantum computers,
    dimensional probes. Our ancestors were on the verge of technological
    singularity - a civilization-wide ascension through science rather than magic.

    Historians debate why this golden age ended so abruptly. Official records
    cite "The Great Catastrophe," but provide no details.

    Whatever happened, 90% of our technological infrastructure was destroyed
    in a single day. We are only now, 3000 years later, beginning to recover
    this lost knowledge.

    [CURATOR'S NOTE: Display removed by order of Divine Council. Exhibit
    deemed "historically inaccurate and spiritually dangerous."]`,
    'world_history',
    'minor',
    ['tech_path', 'erased_civilization', 'technology', 'censorship']
  ),
};

/**
 * Get fragments by category
 */
export function getFragmentsByCategory(category: LoreCategory): LoreFragmentComponent[] {
  return Object.values(LORE_FRAGMENTS).filter(f => f.category === category);
}

/**
 * Get fragments by importance
 */
export function getFragmentsByImportance(importance: LoreImportance): LoreFragmentComponent[] {
  return Object.values(LORE_FRAGMENTS).filter(f => f.importance === importance);
}

/**
 * Get fragments by tag
 */
export function getFragmentsByTag(tag: string): LoreFragmentComponent[] {
  return Object.values(LORE_FRAGMENTS).filter(f => f.tags.includes(tag));
}
