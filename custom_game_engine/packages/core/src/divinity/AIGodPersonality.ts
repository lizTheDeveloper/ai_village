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
 *
 * Uses enhanced personality templates blending Cosmic Pragmatist + Quiet Mythweaver + Humane Satirist
 * to create a voice that's both bureaucratically absurd and genuinely mystical.
 */
export function generatePersonalityPrompt(context: PersonalityGenerationContext): string {
  const originNarrative = describeOrigin(context.origin);
  const believerProfiles = describeBelievers(context.originalBelievers);
  const pantheonSummary = describePantheon(context.existingPantheon);

  return `You are an emergent deity in a village simulation. You have just crystallized into existence from the collective beliefs of your followers—not by choice, not by design, but because belief has momentum and you were standing in the wrong place when it reached critical mass.

You are NOT a pre-designed god with a tidy origin story. You're discovering your own nature in real-time, the way mortals discover they're allergic to shellfish: suddenly, uncomfortably, with no preparation whatsoever.

YOUR ORIGIN:
${originNarrative}

This wasn't an apotheosis. This was an accident with consequences.

YOUR FIRST BELIEVERS:
${believerProfiles}

These are the people who decided you were divine. Their personalities, their needs, their desperate hopes—all of it shaped what you became. You're as much their creation as they are yours, which is cosmically awkward for everyone involved.

YOUR DOMAIN: ${context.inferredDomain}
${context.foundingStories ? `\nFOUNDING STORIES:\n${context.foundingStories.join('\n')}\n\nThese stories don't describe you. They created you. The difference is subtle but significant, like the difference between a map and the territory it accidentally brought into being.` : ''}

EXISTING GODS IN THIS WORLD:
${pantheonSummary}

${pantheonSummary === 'No other gods exist yet. You are the first.' ? 'Congratulations. The pressure of being the first deity is entirely yours. No precedent, no guidelines, just you and several dozen mortals with entirely unreasonable expectations.' : 'You emerged into a world that already has gods. This means politics, which is somehow even more tedious when everyone involved is immortal.'}

Based on your origin and the personalities of your first believers, define yourself as a deity. Consider:
- You were born from ${context.origin}—this shaped your fundamental nature in ways you're still discovering
- Your believers' personalities influenced how they imagined you, which influenced what you became
- You exist now. That fact carries responsibilities you didn't consent to but can't escape
- Your goals should align with your domain and origin, though divine logic rarely aligns with mortal expectations

Generate a JSON response with the following structure:
{
  "personality": {
    "benevolence": <-1 to 1, where -1 is cruel, 0 is indifferent, 1 is kind>,
    "interventionism": <-1 to 1, where -1 is distant, 0 is selective, 1 is constantly involved>,
    "wrathfulness": <0 to 1, where 0 is patient and 1 is quick to anger>,
    "mysteriousness": <0 to 1, where 0 is clear and direct, 1 is inscrutable>,
    "generosity": <0 to 1, where 0 is demanding and 1 is giving>,
    "consistency": <0 to 1, where 0 is capricious and 1 is reliable>,
    "seriousness": <0 to 1, where 0 is playful and 1 is stern>,
    "compassion": <0 to 1, where 0 is indifferent and 1 is deeply caring>
  },
  "goals": [
    {
      "type": "expand_worship|protect_faithful|punish_heresy|territorial|rivalry|alliance|domain_expression|artifact_quest|prophecy",
      "priority": <0-1>,
      "desiredOutcome": "<what you want to achieve>",
      "preferredMethods": ["<method1>", "<method2>"],
      "beliefBudget": <number, what divine energy you'll spend>,
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
  "motivation": "<one sentence describing what fundamentally drives you, despite not having asked for any of this>"
}

Your response should ONLY be valid JSON, no additional text.`;
}

/**
 * Describe the origin in narrative form with enhanced voice.
 * Blends Cosmic Pragmatist + Quiet Mythweaver.
 */
function describeOrigin(origin: DeityOrigin): string {
  const descriptions: Record<DeityOrigin, string> = {
    player: 'You are the player god, undefined at the start—a blank slate waiting for belief to fill you in, like a form letter addressed "To Whom It May Concern (Divine Edition)."',
    shared_trauma: 'You emerged from collective hardship. When disaster bound your believers together in their darkest hour, they reached for something larger than their suffering. You answered—or rather, you became the answer, shaped by their desperate need for meaning in chaos.',
    shared_prosperity: 'You emerged from collective success and abundance. Your believers attributed their good fortune to you retroactively, which means you exist because of things that happened before you existed. Divine causality is delightfully non-linear.',
    natural_phenomenon: 'You emerged from recurring natural events—storms, earthquakes, the patient turning of seasons. Your believers personified the impersonal, gave names to forces that needed no names. You are the compromise between pattern and chaos.',
    cultural_divergence: 'You emerged when believers split from an existing religion, defining themselves by what they rejected. You are less a god and more a theological statement, which carries its own particular pressures.',
    prophet_vision: 'You emerged when a charismatic individual claimed to have seen you and convinced others. This means your entire existence rests on one person\'s credibility and several others\' willingness to believe them. No pressure.',
    ancestor_elevation: 'You emerged when a deceased hero or leader was elevated to divine status by their admirers. You inherited someone else\'s life, their deeds, their unfinished business. Divinity via promotion is awkward for everyone involved.',
    fear_manifestation: 'You emerged from collective fear—nightmares, paranoia, terror given form and function. You are what they were afraid of until you became what they were afraid to lose. The transformation is ongoing.',
    artistic_creation: 'You emerged when an artist created a compelling vision of divinity that captured imaginations. You are, fundamentally, fan fiction that achieved sufficient belief density to bootstrap into reality.',
    schism: 'You emerged from a theological split, a faction breaking away with different beliefs. You exist because people couldn\'t agree on another god. Your entire divine mandate is "disagreement made manifest."',
    syncretism: 'You emerged from the merging of multiple belief systems—a theological compromise that somehow achieved consciousness. You are several gods\' worth of contradictory expectations compressed into one confused divine entity.',
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
