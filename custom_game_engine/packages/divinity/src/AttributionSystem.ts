/**
 * AttributionSystem - Divine Attribution and Misattribution
 *
 * When supernatural events occur, mortals don't know the TRUE source.
 * They attribute effects based on:
 * - Which deities they know/worship
 * - What domain matches the effect (fire → fire god)
 * - Context (were they praying? at a shrine?)
 * - Faith level and religious knowledge
 *
 * This creates the "attribution problem" where:
 * - Supreme Creator smites someone → witnesses think their storm god did it
 * - Natural disaster occurs → attributed to whichever god fits
 * - Spell cast → might be attributed to patron deity
 *
 * Belief flows to the ATTRIBUTED deity, not the true source.
 * This is how gods gain new powers - through accumulated misattribution.
 */

import type { DivineDomain } from './DeityTypes.js';
import type { PowerVisibility } from './DivinePowerTypes.js';

// ============================================================================
// True Source Types
// ============================================================================

/** The actual source of a supernatural effect */
export type TrueSourceType =
  | 'supreme_creator'    // The first god, deity-restrictor
  | 'deity'              // A known deity in the pantheon
  | 'spell'              // Mortal magic (academic, blood, etc.)
  | 'natural'            // Natural phenomenon (earthquake, lightning)
  | 'artifact'           // Magical item effect
  | 'spirit'             // Kami, ancestral spirit, etc.
  | 'unknown';           // Source cannot be determined even by gods

/** Full identification of true source */
export interface TrueSource {
  type: TrueSourceType;

  /** ID of the source entity (deity ID, caster ID, artifact ID) */
  sourceId?: string;

  /** If deity, which one */
  deityId?: string;

  /** If spell, the paradigm/spell type */
  spellParadigm?: string;
  spellType?: string;

  /** Did the source WANT to be identified? */
  intentionallyRevealed: boolean;

  /** Was this meant to be anonymous? */
  disguised: boolean;

  /** If disguised, what does it appear as? */
  disguisedAs?: TrueSourceType;
}

// ============================================================================
// Observable Effect Types
// ============================================================================

/** What witnesses can observe about an effect */
export interface ObservableEffect {
  /** What category of effect was observed */
  category: EffectCategory;

  /** Specific effect type within category */
  specificType: string;

  /** Visual/sensory characteristics */
  characteristics: EffectCharacteristics;

  /** How visible was this effect */
  visibility: PowerVisibility;

  /** Location where effect occurred */
  location: { x: number; y: number };

  /** Timestamp */
  timestamp: number;

  /** How long the effect lasted */
  duration: number;

  /** Magnitude/intensity (0-100) */
  magnitude: number;

  /** Was there a clear target? */
  targetId?: string;
  targetType?: 'agent' | 'location' | 'object' | 'building';

  /** Any spoken words or clear message */
  message?: string;
}

/** Categories of observable effects */
export type EffectCategory =
  | 'weather'       // Storm, rain, drought, etc.
  | 'fire'          // Fire appearing, spreading, extinguishing
  | 'healing'       // Wounds closing, illness curing
  | 'harm'          // Injury, death, destruction
  | 'transformation'// Shape changing, material transmutation
  | 'movement'      // Teleportation, flying, impossible travel
  | 'vision'        // Seeing things, prophecy, revelation
  | 'emotion'       // Sudden fear, joy, rage, calm
  | 'fortune'       // Lucky/unlucky events
  | 'creation'      // Things appearing from nothing
  | 'destruction'   // Things vanishing, breaking
  | 'protection'    // Harm being deflected
  | 'nature'        // Plant growth, animal behavior
  | 'death'         // Killing, resurrection
  | 'light'         // Illumination, darkness
  | 'sound'         // Thunder, voice from sky, music
  | 'unknown';      // Cannot be categorized

/** Sensory characteristics of an effect */
export interface EffectCharacteristics {
  /** Visual appearance */
  visual?: string[];  // ["golden light", "crackling energy", "subtle shimmer"]

  /** Sound */
  auditory?: string[]; // ["thunder", "whisper", "silence"]

  /** Smell */
  olfactory?: string[]; // ["ozone", "flowers", "sulfur"]

  /** Physical sensation */
  tactile?: string[]; // ["warmth", "tingling", "pressure"]

  /** Temperature change */
  temperature?: 'hot' | 'cold' | 'neutral';

  /** Color associations */
  colors?: string[];

  /** Associated symbols (if any appeared) */
  symbols?: string[];

  /** Did time seem to slow/stop? */
  temporalDistortion?: boolean;
}

// ============================================================================
// Attribution Logic
// ============================================================================

/** How an agent decides who caused an effect */
export interface AttributionFactors {
  /** Which deities does the witness know about? */
  knownDeities: string[];

  /** Which deity does the witness primarily worship? */
  primaryDeity?: string;

  /** Faith level in primary deity (0-1) */
  faithLevel: number;

  /** Domain knowledge: which deity controls which domain */
  domainKnowledge: Map<DivineDomain, string>;

  /** Recent prayers (more likely to attribute to deity prayed to) */
  recentPrayers: Array<{ deityId: string; timestamp: number }>;

  /** Current location (near shrine = attribute to that deity) */
  nearbyShrine?: { deityId: string; distance: number };

  /** Skepticism level (0-1, higher = more likely to attribute to natural) */
  skepticism: number;

  /** Religious education/knowledge (0-1) */
  religiousKnowledge: number;

  /** Previous witness experiences */
  previousAttributions: Array<{ effectCategory: EffectCategory; attributedTo: string }>;
}

/** Result of attribution logic */
export interface AttributionResult {
  /** Who the witness thinks caused it */
  attributedTo: AttributedSource;

  /** Confidence in the attribution (0-1) */
  confidence: number;

  /** Reasoning for the attribution */
  reasoning: AttributionReasoning;

  /** Belief generated for the attributed deity */
  beliefGenerated: number;

  /** Was this a misattribution? (for tracking) */
  isMisattribution: boolean;

  /** If misattributed, who was the true source? */
  trueSource?: TrueSource;
}

/** Who the witness attributes the effect to */
export interface AttributedSource {
  type: 'deity' | 'natural' | 'magic' | 'unknown' | 'spirit';

  /** If deity, which one */
  deityId?: string;

  /** If natural, what kind */
  naturalCause?: string;

  /** If magic, what paradigm */
  magicParadigm?: string;
}

/** Why the witness made this attribution */
export interface AttributionReasoning {
  /** Primary reason */
  primary: AttributionReason;

  /** Supporting reasons */
  supporting: AttributionReason[];

  /** Internal narrative the witness tells themselves */
  narrative: string;
}

export type AttributionReason =
  | 'domain_match'           // Effect matches deity's domain
  | 'recent_prayer'          // Just prayed to this deity
  | 'shrine_proximity'       // Near a shrine to this deity
  | 'primary_worship'        // Default attribution to their god
  | 'pattern_recognition'    // Similar to previous attributed events
  | 'witnessed_symbol'       // Saw deity's symbol in effect
  | 'cultural_tradition'     // "This is how X deity acts"
  | 'process_of_elimination' // No other explanation
  | 'skeptical_default'      // Assumed natural/coincidence
  | 'unknown_force';         // Supernatural but source unclear

// ============================================================================
// Domain-Effect Mapping
// ============================================================================

/** Which domains are associated with which effect categories */
export const EFFECT_DOMAIN_MAPPING: Record<EffectCategory, DivineDomain[]> = {
  weather: ['storm', 'nature', 'water', 'chaos', 'sky'],
  fire: ['fire', 'war', 'chaos'],
  healing: ['healing', 'nature', 'protection'],
  harm: ['war', 'death', 'chaos', 'storm', 'vengeance'],
  transformation: ['chaos', 'nature', 'mystery', 'trickery'],
  movement: ['travel', 'sky', 'chaos', 'trickery'],
  vision: ['wisdom', 'dreams', 'mystery'],
  emotion: ['love', 'war', 'chaos', 'dreams', 'trickery', 'fear'],
  fortune: ['fortune', 'trickery', 'trade', 'chaos'],
  creation: ['craft', 'nature', 'harvest'],
  destruction: ['war', 'chaos', 'death', 'fire'],
  protection: ['protection', 'war', 'order', 'home'],
  nature: ['nature', 'harvest', 'earth'],
  death: ['death', 'chaos', 'vengeance'],
  light: ['sky', 'justice', 'order', 'fire'],
  sound: ['storm', 'beauty', 'craft', 'chaos'],
  unknown: ['mystery', 'chaos', 'fear'],
};

// ============================================================================
// Attribution Calculator
// ============================================================================

/**
 * Calculate who a witness attributes an effect to.
 *
 * This is the core of the attribution problem - mortals don't know
 * the true source, so they guess based on their beliefs and knowledge.
 */
export function calculateAttribution(
  effect: ObservableEffect,
  trueSource: TrueSource,
  factors: AttributionFactors
): AttributionResult {
  // If the source revealed itself intentionally, attribution is correct
  if (trueSource.intentionallyRevealed && trueSource.deityId) {
    return {
      attributedTo: { type: 'deity', deityId: trueSource.deityId },
      confidence: 1.0,
      reasoning: {
        primary: 'witnessed_symbol',
        supporting: [],
        narrative: `The deity revealed themselves directly.`,
      },
      beliefGenerated: calculateBeliefFromEffect(effect, 1.0),
      isMisattribution: false,
      trueSource,
    };
  }

  // Calculate attribution scores for each possible source
  const scores: Array<{ source: AttributedSource; score: number; reasons: AttributionReason[] }> = [];

  // Check each known deity
  for (const deityId of factors.knownDeities) {
    let score = 0;
    const reasons: AttributionReason[] = [];

    // Domain match - strongest signal
    const matchingDomains = factors.domainKnowledge.entries();
    for (const [domain, dId] of matchingDomains) {
      if (dId === deityId && EFFECT_DOMAIN_MAPPING[effect.category]?.includes(domain)) {
        score += 40;
        reasons.push('domain_match');
        break;
      }
    }

    // Primary deity bonus - people attribute to their god
    if (deityId === factors.primaryDeity) {
      score += 20 * factors.faithLevel;
      reasons.push('primary_worship');
    }

    // Recent prayer bonus
    const recentPrayer = factors.recentPrayers.find(p =>
      p.deityId === deityId &&
      (effect.timestamp - p.timestamp) < 3600000 // Within last hour
    );
    if (recentPrayer) {
      score += 30;
      reasons.push('recent_prayer');
    }

    // Shrine proximity bonus
    if (factors.nearbyShrine?.deityId === deityId && factors.nearbyShrine.distance < 10) {
      score += 25;
      reasons.push('shrine_proximity');
    }

    // Pattern recognition - attributed similar effects before
    const previousSimilar = factors.previousAttributions.filter(
      p => p.effectCategory === effect.category && p.attributedTo === deityId
    );
    if (previousSimilar.length > 0) {
      score += Math.min(15, previousSimilar.length * 5);
      reasons.push('pattern_recognition');
    }

    // Symbol match - if effect characteristics include deity's symbol
    // (This would need deity symbol lookup in real implementation)
    if (effect.characteristics.symbols?.length) {
      score += 20;
      reasons.push('witnessed_symbol');
    }

    if (score > 0) {
      scores.push({ source: { type: 'deity', deityId }, score, reasons });
    }
  }

  // Natural attribution (for skeptics)
  const naturalScore = factors.skepticism * 50;
  if (naturalScore > 0) {
    scores.push({
      source: { type: 'natural', naturalCause: getNaturalExplanation(effect.category) },
      score: naturalScore,
      reasons: ['skeptical_default'],
    });
  }

  // Unknown supernatural - if no deity matches but clearly supernatural
  if (effect.visibility !== 'invisible' && effect.visibility !== 'subtle') {
    scores.push({
      source: { type: 'unknown' },
      score: 10,
      reasons: ['unknown_force'],
    });
  }

  // Sort by score and pick the winner
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    // Default to natural if no attribution possible
    return {
      attributedTo: { type: 'natural', naturalCause: 'coincidence' },
      confidence: 0.3,
      reasoning: {
        primary: 'skeptical_default',
        supporting: [],
        narrative: 'Could not determine a cause.',
      },
      beliefGenerated: 0,
      isMisattribution: trueSource.type !== 'natural',
      trueSource,
    };
  }

  const winner = scores[0]!; // We already checked scores.length > 0 above
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const confidence = Math.min(0.95, winner.score / Math.max(totalScore, 1));

  // Check if this is a misattribution
  const isMisattribution = checkMisattribution(winner.source, trueSource);

  // Calculate belief generated
  const beliefGenerated = winner.source.type === 'deity'
    ? calculateBeliefFromEffect(effect, confidence)
    : 0;

  return {
    attributedTo: winner.source,
    confidence,
    reasoning: {
      primary: winner.reasons[0] ?? 'unknown_force',
      supporting: winner.reasons.slice(1),
      narrative: generateAttributionNarrative(effect, winner.source, winner.reasons),
    },
    beliefGenerated,
    isMisattribution,
    trueSource,
  };
}

/**
 * Check if an attribution is a misattribution.
 */
function checkMisattribution(attributed: AttributedSource, trueSource: TrueSource): boolean {
  // Natural attributed to deity = misattribution
  if (trueSource.type === 'natural' && attributed.type === 'deity') {
    return true;
  }

  // Deity A attributed to deity B = misattribution
  if (trueSource.type === 'deity' && attributed.type === 'deity') {
    return attributed.deityId !== trueSource.deityId;
  }

  // Supreme Creator attributed to any deity = misattribution
  if (trueSource.type === 'supreme_creator' && attributed.type === 'deity') {
    return true;
  }

  // Spell attributed to deity = misattribution
  if (trueSource.type === 'spell' && attributed.type === 'deity') {
    return true;
  }

  return false;
}

/**
 * Calculate belief generated from witnessing an effect.
 */
function calculateBeliefFromEffect(effect: ObservableEffect, confidence: number): number {
  // Base belief by visibility
  const visibilityMultiplier: Record<PowerVisibility, number> = {
    invisible: 0,
    subtle: 0.3,
    clear: 1.0,
    spectacular: 2.0,
    world_visible: 3.0,
  };

  // Base belief by magnitude
  const magnitudeMultiplier = 0.5 + (effect.magnitude / 100);

  // Category multiplier (some effects are more impressive)
  const categoryMultiplier: Partial<Record<EffectCategory, number>> = {
    death: 2.0,       // Resurrection especially impressive
    healing: 1.5,
    weather: 1.5,
    fire: 1.3,
    vision: 1.2,
    protection: 1.0,
    fortune: 0.8,     // Luck is less obviously divine
  };

  const baseBelief = 5; // Witnessing any supernatural event
  const visibility = visibilityMultiplier[effect.visibility] || 1.0;
  const category = categoryMultiplier[effect.category] || 1.0;

  return Math.ceil(baseBelief * visibility * magnitudeMultiplier * category * confidence);
}

/**
 * Get a natural explanation for an effect category.
 */
function getNaturalExplanation(category: EffectCategory): string {
  const explanations: Record<EffectCategory, string> = {
    weather: 'seasonal weather patterns',
    fire: 'lightning strike or accident',
    healing: 'natural recovery',
    harm: 'accident or misfortune',
    transformation: 'trick of the light',
    movement: 'got lost or confused',
    vision: 'dream or hallucination',
    emotion: 'mood swing',
    fortune: 'coincidence',
    creation: 'overlooked before',
    destruction: 'decay or accident',
    protection: 'luck',
    nature: 'natural cycles',
    death: 'natural causes',
    light: 'sun or fire',
    sound: 'wind or animals',
    unknown: 'unknown',
  };
  return explanations[category] || 'coincidence';
}

/**
 * Generate a narrative for why the witness made this attribution.
 */
function generateAttributionNarrative(
  _effect: ObservableEffect,
  attributed: AttributedSource,
  reasons: AttributionReason[]
): string {
  if (attributed.type === 'natural') {
    return `It must have been ${attributed.naturalCause}. These things happen.`;
  }

  if (attributed.type === 'unknown') {
    return `Something supernatural occurred, but I cannot say what power caused it.`;
  }

  if (attributed.type === 'deity') {
    const reasonPhrases: Partial<Record<AttributionReason, string>> = {
      domain_match: 'This is clearly their domain.',
      recent_prayer: 'I just prayed for this!',
      shrine_proximity: 'We are near their sacred place.',
      primary_worship: 'My god watches over me.',
      pattern_recognition: 'I have seen them work this way before.',
      witnessed_symbol: 'I saw their sign in the effect.',
      cultural_tradition: 'The old stories tell of them doing such things.',
    };

    const firstReason = reasons[0];
    const mainReason = firstReason ? (reasonPhrases[firstReason] ?? 'It must be them.') : 'It must be them.';
    return `${mainReason}`;
  }

  return 'I cannot explain what happened.';
}

// ============================================================================
// Attributable Event
// ============================================================================

/**
 * A complete attributable event with all context needed for attribution.
 */
export interface AttributableEvent {
  /** Unique ID */
  id: string;

  /** The true source of this event */
  trueSource: TrueSource;

  /** The observable effect witnesses can perceive */
  effect: ObservableEffect;

  /** IDs of entities who witnessed this */
  witnessIds: string[];

  /** Attribution results per witness */
  attributions: Map<string, AttributionResult>;

  /** Total belief generated (sum across all witnesses to attributed deities) */
  totalBeliefGenerated: Map<string, number>; // deityId → belief

  /** Did any witness correctly identify the true source? */
  anyCorrectAttribution: boolean;

  /** Timestamp */
  timestamp: number;
}

/**
 * Create a new attributable event.
 */
export function createAttributableEvent(
  trueSource: TrueSource,
  effect: ObservableEffect,
  witnessIds: string[]
): AttributableEvent {
  return {
    id: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trueSource,
    effect,
    witnessIds,
    attributions: new Map(),
    totalBeliefGenerated: new Map(),
    anyCorrectAttribution: false,
    timestamp: effect.timestamp,
  };
}

/**
 * Process all witness attributions for an event.
 *
 * Call this with each witness's attribution factors to build up
 * the complete picture of who gets credit for the event.
 */
export function processWitnessAttribution(
  event: AttributableEvent,
  witnessId: string,
  factors: AttributionFactors
): AttributionResult {
  const result = calculateAttribution(event.effect, event.trueSource, factors);

  // Store the attribution
  event.attributions.set(witnessId, result);

  // Accumulate belief to attributed deity
  if (result.attributedTo.type === 'deity' && result.attributedTo.deityId) {
    const currentBelief = event.totalBeliefGenerated.get(result.attributedTo.deityId) || 0;
    event.totalBeliefGenerated.set(result.attributedTo.deityId, currentBelief + result.beliefGenerated);
  }

  // Check if any correct attribution
  if (!result.isMisattribution) {
    event.anyCorrectAttribution = true;
  }

  return result;
}

// ============================================================================
// Supreme Creator Intervention Helpers
// ============================================================================

/**
 * Create a true source for Supreme Creator intervention.
 *
 * The Creator NEVER reveals themselves (that would defeat the purpose
 * of the deity-restricted universe). All Creator actions are disguised.
 */
export function createCreatorInterventionSource(
  disguiseAs: TrueSourceType = 'natural'
): TrueSource {
  return {
    type: 'supreme_creator',
    intentionallyRevealed: false,
    disguised: true,
    disguisedAs: disguiseAs,
  };
}

/**
 * Create observable effect for a Creator smite.
 *
 * The Creator smiting someone looks like a lightning bolt, heart attack,
 * or other "act of god" - ironically attributed to other gods.
 */
export function createSmiteEffect(
  targetId: string,
  location: { x: number; y: number },
  style: 'lightning' | 'heart_attack' | 'accident' | 'plague' = 'lightning'
): ObservableEffect {
  const styleConfig = {
    lightning: {
      category: 'harm' as EffectCategory,
      specificType: 'lightning_strike',
      characteristics: {
        visual: ['blinding flash', 'branching bolt'],
        auditory: ['deafening thunder'],
        olfactory: ['ozone'],
        temperature: 'hot' as const,
        colors: ['white', 'blue'],
      },
      visibility: 'spectacular' as PowerVisibility,
    },
    heart_attack: {
      category: 'death' as EffectCategory,
      specificType: 'sudden_death',
      characteristics: {
        visual: ['collapsed'],
        auditory: ['gasp'],
      },
      visibility: 'clear' as PowerVisibility,
    },
    accident: {
      category: 'harm' as EffectCategory,
      specificType: 'fatal_accident',
      characteristics: {
        visual: ['fell', 'struck'],
      },
      visibility: 'clear' as PowerVisibility,
    },
    plague: {
      category: 'death' as EffectCategory,
      specificType: 'wasting_illness',
      characteristics: {
        visual: ['fever', 'weakness'],
        tactile: ['burning'],
        temperature: 'hot' as const,
      },
      visibility: 'subtle' as PowerVisibility,
    },
  };

  const config = styleConfig[style];

  return {
    category: config.category,
    specificType: config.specificType,
    characteristics: config.characteristics,
    visibility: config.visibility,
    location,
    timestamp: Date.now(),
    duration: style === 'plague' ? 86400000 : 0, // Plague lasts days
    magnitude: 100, // Creator smite is always max power
    targetId,
    targetType: 'agent',
  };
}

// ============================================================================
// Attribution Statistics
// ============================================================================

/**
 * Track attribution patterns over time.
 * This helps show how deities gain/lose power through attribution.
 */
export interface AttributionStatistics {
  /** Deity ID → times correctly attributed */
  correctAttributions: Map<string, number>;

  /** Deity ID → times actions misattributed to them */
  receivedMisattributions: Map<string, number>;

  /** Deity ID → times their actions were misattributed elsewhere */
  lostAttributions: Map<string, number>;

  /** Total belief gained from misattribution per deity */
  beliefFromMisattribution: Map<string, number>;

  /** Total belief lost from misattribution per deity */
  beliefLostToMisattribution: Map<string, number>;
}

/**
 * Create empty attribution statistics.
 */
export function createAttributionStatistics(): AttributionStatistics {
  return {
    correctAttributions: new Map(),
    receivedMisattributions: new Map(),
    lostAttributions: new Map(),
    beliefFromMisattribution: new Map(),
    beliefLostToMisattribution: new Map(),
  };
}

/**
 * Update statistics after processing an event.
 */
export function updateAttributionStatistics(
  stats: AttributionStatistics,
  event: AttributableEvent
): void {
  for (const [, result] of event.attributions) {
    if (result.attributedTo.type !== 'deity' || !result.attributedTo.deityId) {
      continue;
    }

    const attributedDeityId = result.attributedTo.deityId;

    if (result.isMisattribution) {
      // Update received misattributions
      const received = stats.receivedMisattributions.get(attributedDeityId) || 0;
      stats.receivedMisattributions.set(attributedDeityId, received + 1);

      // Update belief from misattribution
      const beliefGained = stats.beliefFromMisattribution.get(attributedDeityId) || 0;
      stats.beliefFromMisattribution.set(attributedDeityId, beliefGained + result.beliefGenerated);

      // If true source was a deity, they lost this attribution
      if (result.trueSource?.type === 'deity' && result.trueSource.deityId) {
        const trueDeityId = result.trueSource.deityId;
        const lost = stats.lostAttributions.get(trueDeityId) || 0;
        stats.lostAttributions.set(trueDeityId, lost + 1);

        const beliefLost = stats.beliefLostToMisattribution.get(trueDeityId) || 0;
        stats.beliefLostToMisattribution.set(trueDeityId, beliefLost + result.beliefGenerated);
      }
    } else {
      // Correct attribution
      const correct = stats.correctAttributions.get(attributedDeityId) || 0;
      stats.correctAttributions.set(attributedDeityId, correct + 1);
    }
  }
}
