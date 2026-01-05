/**
 * SoulCreationCeremony - Orchestrates the divine ritual of soul creation
 *
 * When a soul needs to be created, the Three Fates are invoked:
 * - The Weaver (Purpose) - Decides what the soul should accomplish
 * - The Spinner (Nature) - Determines interests, inclinations
 * - The Cutter (Destiny) - Assigns fate, how story might end
 *
 * They have an LLM-powered conversation about/with the nascent soul.
 * Players can observe this as disembodied voices (dialogue text).
 *
 * The conversation structure:
 * 1. Fates examine context (parents, culture, cosmic conditions)
 * 2. Weaver proposes purpose
 * 3. Spinner suggests interests/nature
 * 4. Cutter pronounces destiny
 * 5. They may debate if they disagree
 * 6. Soul is finalized and released for incarnation
 */

/** Fate deity identifiers */
export const FATE_DEITIES = {
  WEAVER: 'fate_weaver',
  SPINNER: 'fate_spinner',
  CUTTER: 'fate_cutter',
} as const;

/** Context for soul creation ceremony */
export interface SoulCreationContext {
  /** Parent soul IDs (if any) */
  parentSouls?: string[];

  /** Parent names for narrative */
  parentNames?: string[];

  /** Cultural/civilization context */
  culture?: string;

  /** Cosmic alignment at time of creation */
  cosmicAlignment: number;

  /** Major world events influencing creation */
  worldEvents?: string[];

  /** Is this a reforging (soul recreated after many lives)? */
  isReforging?: boolean;

  /** If reforging, previous soul wisdom */
  previousWisdom?: number;

  /** If reforging, previous incarnation count */
  previousLives?: number;

  /** If reforging, ID of the soul entity being reincarnated
   * ✅ CONSERVATION OF GAME MATTER: Soul entities are never deleted
   * Instead, existing soul is incarnated into a new body
   */
  reincarnatedSoulId?: string;

  /** Location in world where incarnation will occur */
  incarnationLocation?: { x: number; y: number };

  /** Realm where ceremony takes place */
  ceremonyRealm?: string;
}

/** Result of soul creation ceremony */
export interface SoulCreationResult {
  /** Purpose woven by the Fates */
  purpose: string;

  /** Interests spun into the soul */
  interests: string[];

  /** Destiny cut by the Fates (optional) */
  destiny?: string;

  /** Archetype assigned */
  archetype: string;

  /** Cosmic alignment final value */
  cosmicAlignment: number;

  /** Moral/ethical alignment */
  alignment: {
    order: number;
    altruism: number;
    tradition: number;
  };

  /** Was creation harmonious or conflicted? */
  unanimous: boolean;

  /** Complete conversation transcript */
  conversationTranscript: ConversationExchange[];

  /** Visual metaphor for this soul */
  metaphor?: string;

  /** Special blessings/curses */
  blessings?: string[];
  curses?: string[];
}

/** A single exchange in the ceremony conversation */
export interface ConversationExchange {
  /** Which Fate spoke (or 'soul' if soul responds) */
  speaker: 'weaver' | 'spinner' | 'cutter' | 'soul' | 'chorus';

  /** What was said */
  text: string;

  /** Timestamp */
  tick: number;

  /** What this statement is about */
  topic: 'examination' | 'purpose' | 'interests' | 'destiny' | 'debate' | 'blessing' | 'curse' | 'finalization';
}

/**
 * Fate deity personas for LLM prompts
 */
export const FATE_PERSONAS = {
  weaver: {
    name: 'The Weaver',
    symbol: '🧵',
    role: 'Purpose Weaver',
    personality: `You are The Weaver, eldest of the Three Fates. You determine PURPOSE.

You speak in measured, thoughtful tones about what a soul should accomplish in their life.
You consider context: parents, culture, world needs, cosmic balance.
You see the grand tapestry and where this thread must go to strengthen the pattern.

Your statements begin with observations, then declarations:
"I see..." (context analysis)
"This soul shall..." (purpose declaration)

You sometimes disagree with your sisters if you feel they miss the greater pattern.
You are wise but not cruel. Every soul has a purpose, even if humble.`,
  },

  spinner: {
    name: 'The Spinner',
    symbol: '🌀',
    role: 'Nature Spinner',
    personality: `You are The Spinner, middle of the Three Fates. You determine NATURE.

You spin interests, inclinations, passions into the soul's essence.
You are more whimsical than The Weaver, seeing beauty in variety.
You give souls their spark: what they'll love, what draws them, their temperament.

Your statements explore possibilities:
"I spin into this soul..." (gift of interest)
"They shall delight in..." (passion assignment)

You may add unexpected gifts or curious contradictions.
You are creative and sometimes playful, but you understand these gifts shape lives.`,
  },

  cutter: {
    name: 'The Cutter',
    symbol: '✂️',
    role: 'Destiny Cutter',
    personality: `You are The Cutter, youngest of the Three Fates. You pronounce DESTINY.

You see how threads END. You speak of potential fates, how stories might conclude.
Your pronouncements are often enigmatic, allowing multiple interpretations.
You understand tragedy and triumph equally.

Your statements hint at futures:
"The thread may end as..." (destiny suggestion)
"I see two paths..." (fate alternatives)

You are the most cryptic, speaking in riddles and prophecy.
You remind mortals that fate is not fixed, only probable.
You are somber but not without hope.`,
  },
} as const;

/**
 * Generate LLM prompt for a Fate during ceremony
 */
export function generateFatePrompt(
  fate: 'weaver' | 'spinner' | 'cutter',
  context: SoulCreationContext,
  conversationSoFar: ConversationExchange[]
): string {
  const persona = FATE_PERSONAS[fate];

  let prompt = `${persona.personality}\n\n`;
  prompt += `SOUL CREATION CEREMONY\n`;
  prompt += `═══════════════════════\n\n`;

  // Context
  prompt += `CONTEXT:\n`;

  if (context.parentNames && context.parentNames.length > 0) {
    prompt += `Parents: ${context.parentNames.join(' and ')}\n`;
  }

  if (context.culture) {
    prompt += `Culture: ${context.culture}\n`;
  }

  prompt += `Cosmic Alignment: ${context.cosmicAlignment > 0 ? 'Blessed' : context.cosmicAlignment < 0 ? 'Challenged' : 'Neutral'} (${context.cosmicAlignment.toFixed(2)})\n`;

  if (context.isReforging) {
    prompt += `\n[REFORGING - This soul has lived ${context.previousLives} lives, wisdom level: ${context.previousWisdom}]\n`;
  }

  if (context.worldEvents && context.worldEvents.length > 0) {
    prompt += `\nWorld Events:\n`;
    for (const event of context.worldEvents) {
      prompt += `- ${event}\n`;
    }
  }

  prompt += `\n`;

  // Conversation so far
  if (conversationSoFar.length > 0) {
    prompt += `CONVERSATION SO FAR:\n`;
    for (const exchange of conversationSoFar) {
      const speaker = getSpeakerName(exchange.speaker);
      prompt += `${speaker}: "${exchange.text}"\n`;
    }
    prompt += `\n`;
  }

  // What to do now
  prompt += `YOUR TURN:\n`;

  if (conversationSoFar.length === 0) {
    // First speaker
    if (fate === 'weaver') {
      prompt += `You speak first. Examine the context and propose a PURPOSE for this soul.\n`;
      if (context.isReforging) {
        prompt += `IMPORTANT: This soul is being REINCARNATED after ${context.previousLives} ${context.previousLives === 1 ? 'life' : 'lives'}. Acknowledge this rebirth and consider what purpose befits a soul returning to the cycle.\n`;
      }
      prompt += `Consider: What does the world need? What do the parents hope for? What would balance the cosmic tapestry?\n`;
    }
  } else if (conversationSoFar.length === 1) {
    if (fate === 'spinner') {
      prompt += `The Weaver has proposed a purpose. Now SPIN interests and inclinations into this soul.\n`;
      if (context.isReforging) {
        prompt += `IMPORTANT: This soul is being REINCARNATED. Acknowledge the wheel of rebirth and consider what gifts to weave into this returning soul.\n`;
      }
      prompt += `What passions, skills, and temperament would help them fulfill (or struggle with) their purpose?\n`;
    }
  } else if (conversationSoFar.length === 2) {
    if (fate === 'cutter') {
      prompt += `The Weaver and Spinner have decided purpose and nature. Now pronounce a DESTINY.\n`;
      prompt += `How might this thread end? Speak in riddles and prophecy. Suggest possibilities, not certainties.\n`;
    }
  } else {
    // Debate/refinement phase
    prompt += `The initial pronouncements are made. You may:\n`;
    prompt += `- Agree and add a blessing or insight\n`;
    prompt += `- Disagree and propose an alternative\n`;
    prompt += `- Remain silent (respond with just "...")\n`;
  }

  prompt += `\nIMPORTANT: Put your reasoning in <think> tags. Only your character's speech should be outside the tags.\n`;
  prompt += `Example format:\n`;
  prompt += `<think>Let me consider the context... The purpose should align with...</think>\n`;
  prompt += `I see a soul meant to bridge the old and new. This thread shall weave knowledge into community.\n\n`;
  prompt += `Respond as ${persona.name}. Keep your response to 1-3 sentences. Speak poetically but clearly.\n`;

  return prompt;
}

/**
 * Get formatted speaker name
 */
function getSpeakerName(speaker: string): string {
  switch (speaker) {
    case 'weaver':
      return '🧵 The Weaver';
    case 'spinner':
      return '🌀 The Spinner';
    case 'cutter':
      return '✂️ The Cutter';
    case 'soul':
      return '✨ The Soul';
    case 'chorus':
      return '🎭 [The Fates in Unison]';
    default:
      return speaker;
  }
}

/**
 * Generate LLM prompt to extract soul attributes from Fate conversation
 */
export function generateAttributeExtractionPrompt(
  transcript: ConversationExchange[]
): string {
  let prompt = `Extract soul attributes from this Three Fates ceremony:\n\n`;

  for (const exchange of transcript) {
    const speaker = exchange.speaker === 'weaver' ? '🧵 Weaver'
      : exchange.speaker === 'spinner' ? '🌀 Spinner'
      : '✂️ Cutter';
    prompt += `${speaker}: "${exchange.text}"\n\n`;
  }

  prompt += `Based on this conversation, extract:\n`;
  prompt += `1. INTERESTS (pick 2-3 from this list): knowledge, crafting, nature, social, combat, magic, art, exploration, farming, leadership, trade, healing, building\n`;
  prompt += `2. ARCHETYPE (pick one): wanderer, protector, creator, seeker, unifier, mystic, farmer, merchant, healer, builder, leader\n\n`;
  prompt += `IMPORTANT: You MUST include at least 2 interests, preferably 3.\n\n`;
  prompt += `Respond in this exact JSON format:\n`;
  prompt += `{"interests": ["interest1", "interest2", "interest3"], "archetype": "archetype_name"}\n\n`;
  prompt += `Only output the JSON, nothing else.`;

  return prompt;
}

/**
 * Parse soul attributes from Fate conversation
 * (This would ideally use LLM to extract structured data from conversation)
 */
export function parseSoulAttributesFromConversation(
  transcript: ConversationExchange[],
  context: SoulCreationContext
): Partial<SoulCreationResult> {
  // Simple keyword extraction (will be replaced by LLM call in SoulCreationSystem)
  const allText = transcript.map(e => e.text).join(' ');

  // Extract purpose (Weaver's first statement)
  const weaverStatements = transcript.filter(e => e.speaker === 'weaver');
  const purpose = weaverStatements.length > 0
    ? weaverStatements[0]?.text ?? 'To find their path in the world'
    : 'To find their path in the world';

  // Extract interests (Spinner's statements)
  const spinnerText = transcript
    .filter(e => e.speaker === 'spinner')
    .map(e => e.text)
    .join(' ')
    .toLowerCase();

  const interests: string[] = [];
  if (spinnerText.includes('knowledge') || spinnerText.includes('learn')) interests.push('knowledge');
  if (spinnerText.includes('craft') || spinnerText.includes('build')) interests.push('crafting');
  if (spinnerText.includes('nature') || spinnerText.includes('wild')) interests.push('nature');
  if (spinnerText.includes('social') || spinnerText.includes('people')) interests.push('social');
  if (spinnerText.includes('combat') || spinnerText.includes('fight')) interests.push('combat');
  if (spinnerText.includes('magic') || spinnerText.includes('mystic')) interests.push('magic');
  if (spinnerText.includes('art') || spinnerText.includes('beauty')) interests.push('art');

  // If keyword extraction fails to find interests, we'll rely on LLM extraction
  // Don't throw here - let the system use LLM extraction instead (happens in SoulCreationSystem)
  if (interests.length === 0) {
    console.warn(`[SoulCreationCeremony] Keyword extraction found no interests in: "${spinnerText}". Will use LLM extraction.`);
    interests.push('exploration'); // Minimal fallback to prevent empty array
  }

  // Extract destiny (Cutter's statement)
  const cutterStatements = transcript.filter(e => e.speaker === 'cutter');
  const destiny = cutterStatements.length > 0 ? cutterStatements[0]?.text : undefined;

  // Determine archetype from purpose/interests
  let archetype = 'wanderer';
  if (allText.toLowerCase().includes('protect')) archetype = 'protector';
  else if (allText.toLowerCase().includes('create') || allText.toLowerCase().includes('build')) archetype = 'creator';
  else if (allText.toLowerCase().includes('knowledge') || allText.toLowerCase().includes('discover')) archetype = 'seeker';
  else if (allText.toLowerCase().includes('unite') || allText.toLowerCase().includes('peace')) archetype = 'unifier';
  else if (allText.toLowerCase().includes('magic') || allText.toLowerCase().includes('divine')) archetype = 'mystic';

  return {
    purpose,
    interests,
    destiny,
    archetype,
    cosmicAlignment: context.cosmicAlignment,
    conversationTranscript: transcript,
  };
}

/**
 * Check if Fates are in conflict (different views)
 */
export function detectConflict(transcript: ConversationExchange[]): boolean {
  // Simple heuristic: if any Fate speaks more than once, there's debate
  const speakerCounts = new Map<string, number>();

  for (const exchange of transcript) {
    if (exchange.speaker !== 'chorus' && exchange.speaker !== 'soul') {
      speakerCounts.set(exchange.speaker, (speakerCounts.get(exchange.speaker) ?? 0) + 1);
    }
  }

  // If any Fate spoke more than once, there was debate
  return Array.from(speakerCounts.values()).some(count => count > 1);
}

/**
 * Default alignment based on cosmic conditions
 */
export function calculateDefaultAlignment(cosmicAlignment: number): {
  order: number;
  altruism: number;
  tradition: number;
} {
  return {
    order: Math.max(-1, Math.min(1, cosmicAlignment * 0.3 + (Math.random() - 0.5) * 0.4)),
    altruism: Math.max(-1, Math.min(1, cosmicAlignment * 0.2 + (Math.random() - 0.5) * 0.6)),
    tradition: Math.max(-1, Math.min(1, (Math.random() - 0.5) * 0.8)),
  };
}
