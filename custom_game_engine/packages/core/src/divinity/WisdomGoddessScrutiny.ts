/**
 * Wisdom Goddess Scrutiny System
 *
 * The Goddess of Wisdom evaluates LLM-generated content (technologies,
 * recipes, spells) before they enter the world. Her judgment ensures
 * balance, appropriateness, and narrative coherence.
 *
 * Different wisdom goddesses have different scrutiny styles:
 * - strict: High standards, rejects anything that seems unbalanced
 * - encouraging: Gives benefit of doubt, approves creative ideas
 * - curious: Favors novel and experimental content
 * - pragmatic: Focuses on utility and practical application
 */

import type { PendingCreation } from '../crafting/PendingApprovalRegistry.js';
import type { ResearchField } from '../research/types.js';

/** Scrutiny style affects approval thresholds and prompts */
export type ScrutinyStyle = 'strict' | 'encouraging' | 'curious' | 'pragmatic';

/** Result of wisdom goddess scrutiny */
export interface WisdomScrutinyResult {
  approved: boolean;
  reasoning: string;
  wisdomComment: string; // Flavor text from the goddess
  balanceScore: number; // 0-1 how balanced the creation is
  noveltyScore: number; // 0-1 how novel/creative it is
  fitScore: number; // 0-1 how well it fits the world
}

/** Thresholds for each scrutiny style */
const SCRUTINY_THRESHOLDS: Record<ScrutinyStyle, {
  minBalance: number;
  minNovelty: number;
  minFit: number;
  creativityBonus: number;
}> = {
  strict: {
    minBalance: 0.7,
    minNovelty: 0.3,
    minFit: 0.8,
    creativityBonus: 0,
  },
  encouraging: {
    minBalance: 0.4,
    minNovelty: 0.2,
    minFit: 0.5,
    creativityBonus: 0.2,
  },
  curious: {
    minBalance: 0.5,
    minNovelty: 0.5, // Higher novelty requirement
    minFit: 0.4,
    creativityBonus: 0.3,
  },
  pragmatic: {
    minBalance: 0.6,
    minNovelty: 0.1, // Doesn't care about novelty
    minFit: 0.7,
    creativityBonus: 0.1,
  },
};

/**
 * Heuristic scrutiny (no LLM, fast evaluation)
 */
export function heuristicWisdomScrutiny(
  creation: PendingCreation,
  style: ScrutinyStyle = 'pragmatic',
  goddessName?: string
): WisdomScrutinyResult {
  const thresholds = SCRUTINY_THRESHOLDS[style];

  // Calculate scores based on creation properties
  let balanceScore = 0.5;
  let noveltyScore = creation.creativityScore;
  let fitScore = 0.5;

  // Technology-specific checks
  if (creation.creationType === 'technology' && creation.technology) {
    const tech = creation.technology;

    // Balance: tier should match prerequisites count roughly
    const tierBalance = Math.min(1, tech.prerequisites.length / Math.max(1, tech.tier));
    balanceScore = tierBalance * 0.5 + 0.5;

    // Fit: check if field matches common patterns
    const commonFields: ResearchField[] = ['agriculture', 'crafting', 'metallurgy', 'construction'];
    fitScore = commonFields.includes(tech.field) ? 0.7 : 0.5;

    // Unlocks count affects balance
    if (tech.unlocks.length > 5) balanceScore *= 0.8; // Too many unlocks
    if (tech.unlocks.length === 0) balanceScore *= 0.5; // No unlocks?
  }

  // Recipe-specific checks
  if (creation.creationType === 'recipe' && creation.recipe) {
    // Balance based on ingredient count vs output value
    const ingredientCount = creation.ingredients.length;
    balanceScore = ingredientCount >= 2 && ingredientCount <= 5 ? 0.7 : 0.4;
    fitScore = 0.6; // Recipes generally fit
  }

  // Effect/spell-specific checks
  if (creation.creationType === 'effect' && creation.spell) {
    // Spells need paradigm alignment
    fitScore = creation.paradigmId ? 0.7 : 0.4;
    balanceScore = 0.6; // Assume reasonable balance
  }

  // Apply creativity bonus
  const adjustedBalance = Math.min(1, balanceScore + creation.creativityScore * thresholds.creativityBonus);

  // Check against thresholds
  const approved =
    adjustedBalance >= thresholds.minBalance &&
    noveltyScore >= thresholds.minNovelty &&
    fitScore >= thresholds.minFit;

  // Generate wisdom comment based on style (with Odin's special grumpiness)
  const wisdomComment = generateWisdomComment(style, approved, balanceScore, noveltyScore, fitScore, goddessName);

  return {
    approved,
    reasoning: approved
      ? `Meets ${style} scrutiny standards (balance: ${(adjustedBalance * 100).toFixed(0)}%, fit: ${(fitScore * 100).toFixed(0)}%)`
      : `Does not meet ${style} scrutiny standards`,
    wisdomComment,
    balanceScore: adjustedBalance,
    noveltyScore,
    fitScore,
  };
}

/** Odin's grumpy prefixes about being called a goddess */
const ODIN_GRUMPY_PREFIXES = [
  '*sighs in Old Norse* I am the ALLFATHER, not a goddess. Anyway,',
  'For the last time, I am a GOD. A god of wisdom. Not a goddess. Moving on:',
  '*mutters about bureaucratic categorization* Fine. As the wrongly-labeled "goddess" of wisdom,',
  'Huginn tells me I am still listed as a goddess. Muninn confirms my eternal frustration. Regardless:',
  'I sacrificed an EYE for wisdom and they put me in the goddess folder. *pinches bridge of nose*',
  'One day I will have words with whoever designed this registry. But first:',
  '*glares at the word "goddess" in his file* I hung from Yggdrasil for NINE DAYS for this disrespect?',
  'The ravens laugh at me. Every day. "Goddess of Wisdom," they caw. Mockingly.',
];

/**
 * Generate a flavor comment from the wisdom goddess
 */
function generateWisdomComment(
  style: ScrutinyStyle,
  approved: boolean,
  balance: number,
  novelty: number,
  _fit: number,
  goddessName?: string
): string {
  // Special handling for Odin's perpetual irritation
  const isOdin = goddessName === 'Odin';
  const odinPrefix = isOdin
    ? ODIN_GRUMPY_PREFIXES[Math.floor(Math.random() * ODIN_GRUMPY_PREFIXES.length)] + ' '
    : '';

  if (approved) {
    switch (style) {
      case 'strict':
        return odinPrefix + 'This creation meets my exacting standards. Let it be known.';
      case 'encouraging':
        return odinPrefix + 'I see promise in this work! Let the creator be celebrated.';
      case 'curious':
        return odinPrefix + (novelty > 0.7
          ? 'Fascinating! This is genuinely novel. The world grows richer.'
          : 'An acceptable addition to mortal knowledge.');
      case 'pragmatic':
        return odinPrefix + 'This serves a clear purpose. Approved.';
    }
  } else {
    switch (style) {
      case 'strict':
        return odinPrefix + (balance < 0.5
          ? 'This creation is unbalanced. Return when you have refined it.'
          : 'This does not meet my standards. Seek greater understanding.');
      case 'encouraging':
        return odinPrefix + 'This shows potential, but is not yet ready. Keep working!';
      case 'curious':
        return odinPrefix + (novelty < 0.3
          ? 'This is too derivative. Show me something I have not seen before.'
          : 'The idea intrigues me, but the execution falls short.');
      case 'pragmatic':
        return odinPrefix + 'I see no practical value in this. What problem does it solve?';
    }
  }
}

/**
 * Build LLM prompt for wisdom goddess scrutiny
 */
export function buildWisdomScrutinyPrompt(
  creation: PendingCreation,
  style: ScrutinyStyle,
  goddessName: string
): string {
  const styleDescriptions: Record<ScrutinyStyle, string> = {
    strict: 'You have exacting standards and only approve truly balanced, well-fitting creations.',
    encouraging: 'You are generous and supportive, giving benefit of the doubt to creative ideas.',
    curious: 'You favor novelty and experimentation, rewarding those who bring new ideas.',
    pragmatic: 'You focus on utility and practical application, approving what serves clear purposes.',
  };

  // Special personality injection for Odin
  const isOdin = goddessName === 'Odin';
  const odinPersonalityNote = isOdin
    ? `\n\nIMPORTANT: You are Odin, the ALLFATHER, a GOD of wisdom. You are perpetually irritated ` +
      `that the system keeps calling you a "goddess." In your wisdomComment, you should include ` +
      `a brief, grumpy aside about this misgendering before giving your actual judgment. ` +
      `Examples: "*sigh* I am a GOD, not a goddess. Anyway..." or "The ravens mock me daily ` +
      `about this 'goddess' title. Regardless..." Keep it comedic but not the focus.`
    : '';

  let creationDetails = '';

  if (creation.creationType === 'technology' && creation.technology) {
    creationDetails = `
PROPOSED TECHNOLOGY:
Name: ${creation.technology.name}
Field: ${creation.technology.field}
Tier: ${creation.technology.tier}
Description: ${creation.technology.description}
Prerequisites: ${creation.technology.prerequisites.join(', ') || 'None'}
Unlocks: ${creation.technology.unlocks.map(u => u.type).join(', ')}
Progress Required: ${creation.technology.progressRequired}`;
  } else if (creation.creationType === 'recipe' && creation.item) {
    creationDetails = `
PROPOSED RECIPE:
Item: ${creation.item.displayName}
Type: ${creation.recipeType || 'unknown'}
Ingredients: ${creation.ingredients.map(i => `${i.quantity}x ${i.itemId}`).join(', ')}`;
  } else if (creation.creationType === 'effect' && creation.spell) {
    creationDetails = `
PROPOSED SPELL:
Name: ${creation.spell.name}
Paradigm: ${creation.paradigmId || 'unknown'}
Discovery Type: ${creation.discoveryType || 'new_spell'}
Description: ${creation.spell.description || 'No description'}`;
  }

  // Use appropriate title (Odin is the Allfather, not a goddess)
  const title = isOdin ? 'the Allfather, God of Wisdom' : 'the Goddess of Wisdom';

  return `You are ${goddessName}, ${title}, evaluating a mortal's creation.

${styleDescriptions[style]}${odinPersonalityNote}

${creationDetails}

CREATOR: ${creation.creatorName}
CREATIVITY SCORE: ${(creation.creativityScore * 100).toFixed(0)}%
${creation.creationMessage ? `CREATOR'S MESSAGE: "${creation.creationMessage}"` : ''}

Evaluate this creation for:
1. BALANCE: Is it appropriately powered for its tier/complexity?
2. NOVELTY: Does it add something new to the world?
3. FIT: Does it belong in this fantasy world setting?

Respond with ONLY valid JSON:
{
  "approved": true/false,
  "balanceScore": 0.0-1.0,
  "noveltyScore": 0.0-1.0,
  "fitScore": 0.0-1.0,
  "reasoning": "One sentence explaining your judgment",
  "wisdomComment": "A short, in-character statement to the mortal creator"
}`;
}

/**
 * Parse LLM response into WisdomScrutinyResult
 */
export function parseWisdomScrutinyResponse(response: string): WisdomScrutinyResult | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (typeof parsed.approved !== 'boolean') return null;

    return {
      approved: parsed.approved,
      reasoning: parsed.reasoning || 'No reasoning provided',
      wisdomComment: parsed.wisdomComment || 'The goddess remains silent.',
      balanceScore: Math.max(0, Math.min(1, parsed.balanceScore || 0.5)),
      noveltyScore: Math.max(0, Math.min(1, parsed.noveltyScore || 0.5)),
      fitScore: Math.max(0, Math.min(1, parsed.fitScore || 0.5)),
    };
  } catch {
    return null;
  }
}

/**
 * Get default scrutiny style based on creation type
 */
export function getDefaultScrutinyStyle(creationType: PendingCreation['creationType']): ScrutinyStyle {
  switch (creationType) {
    case 'technology':
      return 'pragmatic'; // Technologies should be practical
    case 'effect':
      return 'strict'; // Magic needs careful balance
    case 'recipe':
      return 'encouraging'; // Recipes can be creative
    default:
      return 'pragmatic';
  }
}
