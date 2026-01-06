/**
 * Myth Mutation System
 *
 * Handles how myths change as they're retold across agents and time.
 * Mutations include attribution (crediting different deities), dramatization,
 * simplification, and other transformations that create theological diversity.
 */

import type { Myth, TraitImplication } from '../components/MythComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

/**
 * Types of mutations that can occur when myths are retold
 */
export type MutationType =
  | 'dramatization'      // Events become more dramatic/exaggerated
  | 'simplification'     // Details lost, story becomes simpler
  | 'moralization'       // Moral lesson added or emphasized
  | 'personalization'    // Narrator inserts themselves or local context
  | 'merger'             // Combined with another similar story
  | 'inversion'          // Good becomes bad or vice versa
  | 'attribution'        // Credit moved to different deity ⭐
  | 'localization';      // Settings changed to local places

/**
 * Result of applying a mutation to a myth
 */
export interface MutationResult {
  /** New version of the myth */
  mutatedMyth: Myth;

  /** Which mutation was applied */
  mutationType: MutationType;

  /** Description of what changed */
  changeDescription: string;

  /** Did the deity attribution change? */
  attributionChanged: boolean;

  /** New deity ID if attribution changed */
  newDeityId?: string;
}

/**
 * Context for mutation decisions
 */
export interface MutationContext {
  /** Who is retelling the story */
  narratorId: string;
  narratorPersonality?: PersonalityComponent;

  /** Who are they telling it to */
  audienceIds: string[];

  /** Current tick */
  currentTick: number;

  /** Time since original creation */
  timeSinceOriginal: number;

  /** How many times has this been told */
  retellingCount: number;

  /** Available deities in the pantheon */
  availableDeities: Array<{
    id: string;
    name: string;
    domain: string;
    popularity: number;
  }>;

  /** Narrator's faith/beliefs */
  narratorBeliefs?: {
    believedDeity?: string;
    faithLevel: number;
  };
}

/**
 * Calculate probability of each mutation type occurring
 */
export function calculateMutationProbabilities(
  myth: Myth,
  context: MutationContext
): Map<MutationType, number> {
  const probabilities = new Map<MutationType, number>();

  // Base probabilities
  probabilities.set('dramatization', 0.15);
  probabilities.set('simplification', 0.2);
  probabilities.set('moralization', 0.1);
  probabilities.set('personalization', 0.08);
  probabilities.set('merger', 0.02);
  probabilities.set('inversion', 0.01);
  probabilities.set('attribution', 0.05); // Base attribution chance
  probabilities.set('localization', 0.12);

  // Adjust based on time
  const yearsSinceOriginal = context.timeSinceOriginal / (1200 * 365); // Assuming 1200 ticks/day

  // Attribution becomes more likely over time
  if (yearsSinceOriginal > 1) {
    probabilities.set('attribution', 0.05 + Math.min(0.15, yearsSinceOriginal * 0.05));
  }

  // Simplification increases with retelling count
  if (context.retellingCount > 5) {
    const current = probabilities.get('simplification')!;
    probabilities.set('simplification', current + Math.min(0.2, context.retellingCount * 0.02));
  }

  // Dramatization increases with personality traits
  if (context.narratorPersonality) {
    const openness = context.narratorPersonality.openness || 0.5;
    if (openness > 0.7) {
      const current = probabilities.get('dramatization')!;
      probabilities.set('dramatization', current + 0.1);
    }
  }

  // Attribution MUCH more likely if narrator believes in a different god
  if (context.narratorBeliefs?.believedDeity &&
      context.narratorBeliefs.believedDeity !== myth.deityId) {
    // Strong believer in different god = high attribution chance
    const faithStrength = context.narratorBeliefs.faithLevel;
    probabilities.set('attribution', 0.3 + (faithStrength * 0.4)); // Up to 70%!
  }

  // Moralization more likely for spiritual narrators
  if (context.narratorPersonality?.spirituality &&
      context.narratorPersonality.spirituality > 0.6) {
    const current = probabilities.get('moralization')!;
    probabilities.set('moralization', current + 0.15);
  }

  return probabilities;
}

/**
 * Select which mutation to apply (if any)
 */
export function selectMutation(
  myth: Myth,
  context: MutationContext
): MutationType | null {
  const probabilities = calculateMutationProbabilities(myth, context);

  // Roll for mutation
  const mutationChance = Math.random();
  const totalProbability = Array.from(probabilities.values()).reduce((sum, p) => sum + p, 0);

  // No mutation this time
  if (mutationChance > totalProbability) {
    return null;
  }

  // Select weighted random mutation
  let cumulative = 0;
  const roll = Math.random() * totalProbability;

  for (const [type, prob] of probabilities.entries()) {
    cumulative += prob;
    if (roll <= cumulative) {
      return type;
    }
  }

  return null;
}

/**
 * Apply a mutation to a myth
 */
export function applyMutation(
  myth: Myth,
  mutationType: MutationType,
  context: MutationContext
): MutationResult {
  switch (mutationType) {
    case 'attribution':
      return applyAttributionMutation(myth, context);
    case 'dramatization':
      return applyDramatizationMutation(myth, context);
    case 'simplification':
      return applySimplificationMutation(myth, context);
    case 'moralization':
      return applyMoralizationMutation(myth, context);
    case 'personalization':
      return applyPersonalizationMutation(myth, context);
    case 'localization':
      return applyLocalizationMutation(myth, context);
    case 'inversion':
      return applyInversionMutation(myth, context);
    case 'merger':
      return applyMergerMutation(myth, context);
    default:
      // Fallback: no change
      return {
        mutatedMyth: { ...myth, currentVersion: myth.currentVersion + 1 },
        mutationType,
        changeDescription: 'No change occurred',
        attributionChanged: false,
      };
  }
}

/**
 * Attribution Mutation - Credit moved to different deity
 */
function applyAttributionMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // Select a deity to attribute to
  let newDeityId: string | undefined;

  // Prefer narrator's believed deity
  if (context.narratorBeliefs?.believedDeity) {
    newDeityId = context.narratorBeliefs.believedDeity;
  } else {
    // Otherwise pick a random popular deity
    const popularDeities = context.availableDeities
      .filter(d => d.id !== myth.deityId)
      .sort((a, b) => b.popularity - a.popularity);

    if (popularDeities.length > 0) {
      newDeityId = popularDeities[0]!.id;
    }
  }

  if (!newDeityId) {
    // No alternative deity available
    return {
      mutatedMyth: { ...myth, currentVersion: myth.currentVersion + 1 },
      mutationType: 'attribution',
      changeDescription: 'Attribution attempted but no alternative deity available',
      attributionChanged: false,
    };
  }

  const newDeity = context.availableDeities.find(d => d.id === newDeityId);
  const newDeityName = newDeity?.name || 'the divine';

  // Modify the story to credit the new deity
  let modifiedText = myth.fullText;

  // Simple find-replace (in real implementation, use LLM for better rewriting)
  // This is a basic heuristic version
  const originalDeityEntity = context.availableDeities.find(d => d.id === myth.deityId);
  if (originalDeityEntity) {
    const regex = new RegExp(originalDeityEntity.name, 'gi');
    modifiedText = modifiedText.replace(regex, newDeityName);
  }

  return {
    mutatedMyth: {
      ...myth,
      deityId: newDeityId,
      fullText: modifiedText,
      title: myth.title.replace(originalDeityEntity?.name || '', newDeityName),
      currentVersion: myth.currentVersion + 1,
      status: myth.status === 'canonical' ? 'disputed' : myth.status,
    },
    mutationType: 'attribution',
    changeDescription: `Story re-attributed from ${originalDeityEntity?.name || 'unknown'} to ${newDeityName}`,
    attributionChanged: true,
    newDeityId,
  };
}

/**
 * Dramatization Mutation - Events become more dramatic
 */
function applyDramatizationMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // Add dramatic language
  const dramaticPhrases = [
    ' with tremendous power',
    ' in a blinding flash of light',
    ' that shook the very earth',
    ' unlike anything ever seen before',
    ' to the amazement of all who witnessed',
  ];

  const randomPhrase = dramaticPhrases[Math.floor(Math.random() * dramaticPhrases.length)]!;
  const modifiedText = myth.fullText + randomPhrase;

  // Boost trait implications
  const boostedTraits: TraitImplication[] = myth.traitImplications.map(t => ({
    ...t,
    strength: Math.min(1.0, t.strength * 1.3), // 30% stronger
  }));

  return {
    mutatedMyth: {
      ...myth,
      fullText: modifiedText,
      traitImplications: boostedTraits,
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'dramatization',
    changeDescription: 'Story became more dramatic and exaggerated',
    attributionChanged: false,
  };
}

/**
 * Simplification Mutation - Details lost
 */
function applySimplificationMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // Reduce text length (simple truncation for now)
  const sentences = myth.fullText.split(/[.!?]\s+/);
  const simplified = sentences.slice(0, Math.max(2, Math.floor(sentences.length * 0.7))).join('. ') + '.';

  // Weaken trait implications
  const weakenedTraits: TraitImplication[] = myth.traitImplications.map(t => ({
    ...t,
    strength: t.strength * 0.7, // 30% weaker
  }));

  return {
    mutatedMyth: {
      ...myth,
      fullText: simplified,
      summary: myth.summary.split('.')[0] + '.',
      traitImplications: weakenedTraits,
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'simplification',
    changeDescription: 'Story simplified, details lost',
    attributionChanged: false,
  };
}

/**
 * Moralization Mutation - Moral lesson added
 */
function applyMoralizationMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  const moralLessons = [
    '\n\nAnd so we learn that faith is rewarded.',
    '\n\nThis teaches us to always trust in the divine.',
    '\n\nFrom this we know that devotion brings blessings.',
    '\n\nThus we see the importance of prayer.',
  ];

  const moral = moralLessons[Math.floor(Math.random() * moralLessons.length)]!;

  return {
    mutatedMyth: {
      ...myth,
      fullText: myth.fullText + moral,
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'moralization',
    changeDescription: 'Moral lesson added to story',
    attributionChanged: false,
  };
}

/**
 * Personalization Mutation - Narrator inserts themselves
 */
function applyPersonalizationMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  const personalizations = [
    '\n\nI myself have witnessed similar signs.',
    '\n\nMy grandmother told me this very tale.',
    '\n\nI was there when this happened, or so I\'ve been told.',
  ];

  const personal = personalizations[Math.floor(Math.random() * personalizations.length)]!;

  return {
    mutatedMyth: {
      ...myth,
      fullText: myth.fullText + personal,
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'personalization',
    changeDescription: 'Narrator added personal connection',
    attributionChanged: false,
  };
}

/**
 * Localization Mutation - Settings changed to local places
 */
function applyLocalizationMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // In a real implementation, this would use world location data
  // For now, just add a localization note
  const localNote = '\n\n(This happened right here in our village.)';

  return {
    mutatedMyth: {
      ...myth,
      fullText: myth.fullText + localNote,
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'localization',
    changeDescription: 'Story localized to current area',
    attributionChanged: false,
  };
}

/**
 * Inversion Mutation - Good becomes bad or vice versa
 */
function applyInversionMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // Flip trait implications
  const invertedTraits: TraitImplication[] = myth.traitImplications.map(t => ({
    ...t,
    direction: t.direction === 'positive' ? 'negative' : 'positive',
    extractedFrom: `Inverted interpretation: ${t.extractedFrom}`,
  }));

  return {
    mutatedMyth: {
      ...myth,
      traitImplications: invertedTraits,
      currentVersion: myth.currentVersion + 1,
      status: 'disputed', // Inverted myths are always disputed
    },
    mutationType: 'inversion',
    changeDescription: 'Story interpretation inverted (good→bad or bad→good)',
    attributionChanged: false,
  };
}

/**
 * Merger Mutation - Combined with another story
 */
function applyMergerMutation(
  myth: Myth,
  context: MutationContext
): MutationResult {
  // In a real implementation, would find a similar myth and merge
  // For now, just note the merger potential
  return {
    mutatedMyth: {
      ...myth,
      fullText: myth.fullText + '\n\n(This story has been combined with other tales.)',
      currentVersion: myth.currentVersion + 1,
    },
    mutationType: 'merger',
    changeDescription: 'Story merged with another myth',
    attributionChanged: false,
  };
}
