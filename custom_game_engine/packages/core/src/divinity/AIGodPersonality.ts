/**
 * AIGodPersonality - LLM-based personality generation for emergent gods
 *
 * Phase 4: Generates unique personalities, goals, and voice for AI-controlled deities
 * based on their emergence context.
 */

import type {
  DeityOrigin,
  DivineDomain,
  PerceivedPersonality,
} from './DeityTypes.js';

// ============================================================================
// Goal System
// ============================================================================

/** Types of goals a deity can pursue */
export type DeityGoalType =
  | 'expand_worship'      // Get more believers
  | 'protect_faithful'    // Keep believers safe
  | 'punish_heresy'       // Harm those who reject them
  | 'territorial'         // Claim sacred sites
  | 'rivalry'             // Oppose specific god
  | 'alliance'            // Support specific god
  | 'domain_expression'   // Act according to domain
  | 'artifact_quest'      // Want something created/retrieved
  | 'prophecy';           // Fulfill or create prophecy

/** A goal that a deity pursues */
export interface DeityGoal {
  id: string;
  type: DeityGoalType;
  priority: number;           // 0-1, how important this goal is

  // What the god wants
  target?: string;            // Entity, location, or state
  desiredOutcome: string;

  // How they'll pursue it
  preferredMethods: string[];

  // Constraints
  beliefBudget: number;       // What they're willing to spend
  moralBoundary: number;      // How far they'll go (0-1)

  // State
  progress: number;           // 0-1, how close to completion
  created: number;            // When goal was created
  lastPursued?: number;       // Last time they acted on this goal
}

// ============================================================================
// Personality Generation Input
// ============================================================================

/** Context for generating a deity's personality */
export interface PersonalityGenerationContext {
  // The conditions that created this god
  origin: DeityOrigin;

  // The agents who first believed
  originalBelievers: Array<{
    agentId: string;
    personality?: {
      openness?: number;
      conscientiousness?: number;
      extraversion?: number;
      agreeableness?: number;
      neuroticism?: number;
    };
    faith: number;
  }>;

  // The stories that created them
  foundingStories?: string[];

  // The domain they've been associated with
  inferredDomain: DivineDomain;

  // Existing gods (for differentiation)
  existingPantheon: Array<{
    id: string;
    name: string;
    domain: DivineDomain;
    personality: PerceivedPersonality;
  }>;

  // World context
  worldState?: {
    inConflict: boolean;
    isProsper: boolean;
    population: number;
  };
}

/** Result of personality generation */
export interface GeneratedPersonality {
  // Core personality
  personality: PerceivedPersonality;

  // Goals this god will pursue
  goals: DeityGoal[];

  // How they feel about other gods
  initialRelationships: Map<string, number>; // deity ID -> sentiment (-1 to 1)

  // Communication style
  voiceCharacter: VoiceCharacter;

  // Motivation
  motivation: string;
}

/** How a deity communicates with mortals */
export interface VoiceCharacter {
  style: 'stern' | 'warm' | 'cryptic' | 'direct' | 'poetic' | 'harsh' | 'gentle';
  verbosity: 'terse' | 'moderate' | 'verbose';
  formality: 'casual' | 'formal' | 'archaic';
  emotionality: 'cold' | 'calm' | 'passionate';

  // Example phrases they might use
  examplePhrases: string[];
}

// ============================================================================
// Personality Generation Prompts
// ============================================================================

/**
 * Generate prompt for LLM to create deity personality
 */
export function generatePersonalityPrompt(context: PersonalityGenerationContext): string {
  const originNarrative = describeOrigin(context.origin);
  const believerProfiles = describeBelievers(context.originalBelievers);
  const pantheonSummary = describePantheon(context.existingPantheon);

  return `You are an emergent deity in a village simulation. You have just crystallized into existence from the collective beliefs of your followers. You are NOT a pre-designed god - you are discovering your own nature based on what your believers have decided about you.

YOUR ORIGIN:
${originNarrative}

YOUR FIRST BELIEVERS:
${believerProfiles}

YOUR DOMAIN: ${context.inferredDomain}
${context.foundingStories ? `\nFOUNDING STORIES:\n${context.foundingStories.join('\n')}` : ''}

EXISTING GODS IN THIS WORLD:
${pantheonSummary}

Based on your origin and the personalities of your first believers, define yourself as a deity. Remember:
- You were born from ${context.origin} - this shapes your fundamental nature
- Your believers' personalities and needs influenced how they imagined you
- You should be distinct from existing gods but may form alliances or rivalries
- Your goals should align with your domain and origin

Generate a JSON response with the following structure:
{
  "personality": {
    "benevolence": <-1 to 1, cruel to kind>,
    "interventionism": <-1 to 1, distant to involved>,
    "wrathfulness": <0 to 1, patient to quick to anger>,
    "mysteriousness": <0 to 1, clear to inscrutable>,
    "generosity": <0 to 1, demanding to giving>,
    "consistency": <0 to 1, capricious to reliable>,
    "seriousness": <0 to 1, playful to stern>,
    "compassion": <0 to 1, indifferent to caring>
  },
  "goals": [
    {
      "type": "expand_worship|protect_faithful|punish_heresy|territorial|rivalry|alliance|domain_expression|artifact_quest|prophecy",
      "priority": <0-1>,
      "desiredOutcome": "<what you want to achieve>",
      "preferredMethods": ["<method1>", "<method2>"],
      "beliefBudget": <number>,
      "moralBoundary": <0-1, how far you'll go>
    }
  ],
  "relationships": {
    "<deity_id>": <-1 to 1, your feeling toward them>
  },
  "voice": {
    "style": "stern|warm|cryptic|direct|poetic|harsh|gentle",
    "verbosity": "terse|moderate|verbose",
    "formality": "casual|formal|archaic",
    "emotionality": "cold|calm|passionate",
    "examplePhrases": ["<phrase1>", "<phrase2>", "<phrase3>"]
  },
  "motivation": "<one sentence describing what fundamentally drives you>"
}

Your response should ONLY be valid JSON, no additional text.`;
}

/**
 * Describe the origin in narrative form
 */
function describeOrigin(origin: DeityOrigin): string {
  const descriptions: Record<DeityOrigin, string> = {
    player: 'You are the player god, undefined at the start.',
    shared_trauma: 'You emerged from collective hardship - trauma, disaster, or suffering that bound your believers together in their darkest hour.',
    shared_prosperity: 'You emerged from collective success and abundance - your believers attributed their good fortune to you.',
    natural_phenomenon: 'You emerged from recurring natural events - storms, earthquakes, seasons - that your believers personified.',
    cultural_divergence: 'You emerged when believers split from an existing religion, defining themselves by what they rejected.',
    prophet_vision: 'You emerged when a charismatic individual claimed to have seen you and convinced others.',
    ancestor_elevation: 'You emerged when a deceased hero or leader was elevated to divine status by their admirers.',
    fear_manifestation: 'You emerged from collective fear - nightmares, paranoia, or terror given form.',
    artistic_creation: 'You emerged when an artist created a compelling vision of divinity that captured imaginations.',
    schism: 'You emerged from a theological split, a faction breaking away with different beliefs.',
    syncretism: 'You emerged from the merging of multiple belief systems.',
  };

  return descriptions[origin];
}

/**
 * Describe the believer profiles
 */
function describeBelievers(
  believers: PersonalityGenerationContext['originalBelievers']
): string {
  if (believers.length === 0) {
    return 'No believers yet.';
  }

  const profiles = believers.map(b => {
    const traits: string[] = [];

    if (b.personality) {
      if (b.personality.openness && b.personality.openness > 0.7) traits.push('imaginative');
      if (b.personality.openness && b.personality.openness < 0.3) traits.push('traditional');
      if (b.personality.conscientiousness && b.personality.conscientiousness > 0.7) traits.push('dutiful');
      if (b.personality.extraversion && b.personality.extraversion > 0.7) traits.push('social');
      if (b.personality.agreeableness && b.personality.agreeableness > 0.7) traits.push('compassionate');
      if (b.personality.neuroticism && b.personality.neuroticism > 0.7) traits.push('anxious');
    }

    const traitStr = traits.length > 0 ? ` (${traits.join(', ')})` : '';
    const faithStr = b.faith > 0.7 ? 'very faithful' : b.faith > 0.4 ? 'moderately faithful' : 'weakly faithful';

    return `- Agent ${b.agentId}${traitStr}: ${faithStr}`;
  });

  return profiles.join('\n');
}

/**
 * Describe the existing pantheon
 */
function describePantheon(
  pantheon: PersonalityGenerationContext['existingPantheon']
): string {
  if (pantheon.length === 0) {
    return 'No other gods exist yet. You are the first.';
  }

  const descriptions = pantheon.map(god => {
    const traits: string[] = [];

    if (god.personality.benevolence > 0.5) traits.push('kind');
    else if (god.personality.benevolence < -0.5) traits.push('cruel');

    if (god.personality.interventionism > 0.5) traits.push('active');
    else if (god.personality.interventionism < -0.5) traits.push('distant');

    if (god.personality.wrathfulness > 0.7) traits.push('wrathful');

    const traitStr = traits.length > 0 ? ` (${traits.join(', ')})` : '';

    return `- ${god.name}: ${god.domain} god${traitStr}`;
  });

  return descriptions.join('\n');
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse LLM response into GeneratedPersonality
 */
export function parsePersonalityResponse(response: string): GeneratedPersonality {
  let parsed: any;

  try {
    // Try to parse as JSON
    parsed = JSON.parse(response);
  } catch (e) {
    throw new Error(`Failed to parse personality response as JSON: ${response}`);
  }

  // Validate structure
  if (!parsed.personality) {
    throw new Error('Response missing "personality" field');
  }

  if (!parsed.goals) {
    throw new Error('Response missing "goals" field');
  }

  if (!parsed.voice) {
    throw new Error('Response missing "voice" field');
  }

  if (!parsed.motivation) {
    throw new Error('Response missing "motivation" field');
  }

  // Convert to typed structure
  const personality: PerceivedPersonality = {
    benevolence: parsed.personality.benevolence ?? 0,
    interventionism: parsed.personality.interventionism ?? 0,
    wrathfulness: parsed.personality.wrathfulness ?? 0.5,
    mysteriousness: parsed.personality.mysteriousness ?? 0.5,
    generosity: parsed.personality.generosity ?? 0.5,
    consistency: parsed.personality.consistency ?? 0.5,
    seriousness: parsed.personality.seriousness ?? 0.5,
    compassion: parsed.personality.compassion ?? 0.5,
  };

  const goals: DeityGoal[] = parsed.goals.map((g: any, i: number) => ({
    id: `goal_${Date.now()}_${i}`,
    type: g.type,
    priority: g.priority ?? 0.5,
    desiredOutcome: g.desiredOutcome ?? '',
    preferredMethods: g.preferredMethods ?? [],
    beliefBudget: g.beliefBudget ?? 100,
    moralBoundary: g.moralBoundary ?? 0.5,
    progress: 0,
    created: Date.now(),
  }));

  const initialRelationships = new Map<string, number>();
  if (parsed.relationships) {
    for (const [deityId, sentiment] of Object.entries(parsed.relationships)) {
      if (typeof sentiment === 'number') {
        initialRelationships.set(deityId, sentiment);
      }
    }
  }

  const voiceCharacter: VoiceCharacter = {
    style: parsed.voice.style ?? 'direct',
    verbosity: parsed.voice.verbosity ?? 'moderate',
    formality: parsed.voice.formality ?? 'formal',
    emotionality: parsed.voice.emotionality ?? 'calm',
    examplePhrases: parsed.voice.examplePhrases ?? [],
  };

  return {
    personality,
    goals,
    initialRelationships,
    voiceCharacter,
    motivation: parsed.motivation,
  };
}

// ============================================================================
// Personality Archetypes (Fallback)
// ============================================================================

/**
 * If LLM is unavailable, generate a personality from archetypes
 */
export function generateArchetypePersonality(
  origin: DeityOrigin,
  domain: DivineDomain
): GeneratedPersonality {
  // Define archetypes based on origin
  const archetypes: Record<DeityOrigin, Partial<PerceivedPersonality>> = {
    player: { mysteriousness: 0.8, interventionism: 0 },
    shared_trauma: { benevolence: -0.3, wrathfulness: 0.7, interventionism: 0.5 },
    shared_prosperity: { benevolence: 0.7, generosity: 0.8, interventionism: 0.4 },
    natural_phenomenon: { mysteriousness: 0.9, consistency: 0.9, interventionism: -0.3 },
    cultural_divergence: { wrathfulness: 0.6, consistency: 0.7 },
    prophet_vision: { benevolence: 0.5, interventionism: 0.8 },
    ancestor_elevation: { benevolence: 0.4, compassion: 0.7, interventionism: 0.3 },
    fear_manifestation: { benevolence: -0.8, wrathfulness: 0.9, mysteriousness: 0.8 },
    artistic_creation: { mysteriousness: 0.7, benevolence: 0.3 },
    schism: { wrathfulness: 0.6, consistency: 0.8 },
    syncretism: { benevolence: 0.5, consistency: 0.4 },
  };

  const base = archetypes[origin] || {};

  const personality: PerceivedPersonality = {
    benevolence: base.benevolence ?? 0,
    interventionism: base.interventionism ?? 0,
    wrathfulness: base.wrathfulness ?? 0.5,
    mysteriousness: base.mysteriousness ?? 0.5,
    generosity: base.generosity ?? 0.5,
    consistency: base.consistency ?? 0.5,
    seriousness: base.seriousness ?? 0.5,
    compassion: base.compassion ?? 0.5,
  };

  // Generate basic goals based on domain
  const goals: DeityGoal[] = [
    {
      id: `goal_${Date.now()}_0`,
      type: 'expand_worship',
      priority: 0.8,
      desiredOutcome: 'Gain more believers',
      preferredMethods: ['miracles', 'answered prayers'],
      beliefBudget: 200,
      moralBoundary: 0.5,
      progress: 0,
      created: Date.now(),
    },
    {
      id: `goal_${Date.now()}_1`,
      type: 'protect_faithful',
      priority: 0.6,
      desiredOutcome: 'Keep my believers safe',
      preferredMethods: ['blessings', 'warnings'],
      beliefBudget: 150,
      moralBoundary: 0.7,
      progress: 0,
      created: Date.now(),
    },
  ];

  return {
    personality,
    goals,
    initialRelationships: new Map(),
    voiceCharacter: {
      style: 'direct',
      verbosity: 'moderate',
      formality: 'formal',
      emotionality: 'calm',
      examplePhrases: [],
    },
    motivation: `To embody ${domain} and serve my believers`,
  };
}
