import { ComponentBase } from '../ecs/Component.js';

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  workEthic?: number;
  creativity?: number;
  generosity?: number;
  leadership?: number;
  spirituality?: number;
}

/**
 * Personality component based on Big Five + game-specific traits.
 * All traits are on 0-1.0 scale (0 = low, 1 = high)
 */
export class PersonalityComponent extends ComponentBase {
  public readonly type = 'personality';

  /** Openness: 0 = cautious/traditional, 1 = curious/adventurous */
  public openness: number;

  /** Conscientiousness: 0 = spontaneous/flexible, 1 = organized/disciplined */
  public conscientiousness: number;

  /** Extraversion: 0 = quiet/introspective, 1 = outgoing/social */
  public extraversion: number;

  /** Agreeableness: 0 = independent/competitive, 1 = helpful/cooperative */
  public agreeableness: number;

  /** Neuroticism: 0 = resilient, 1 = sensitive */
  public neuroticism: number;

  /** Work ethic: 0 = relaxed/carefree, 1 = hardworking/dedicated */
  public workEthic: number;

  /** Creativity: 0 = conventional, 1 = innovative */
  public creativity: number;

  /** Generosity: 0 = self-focused, 1 = sharing/helping */
  public generosity: number;

  /** Leadership: 0 = prefers to follow, 1 = natural leader */
  public leadership: number;

  /** Spirituality: 0 = skeptical/rational, 1 = deeply spiritual/divine connection */
  public spirituality: number;

  constructor(traits: PersonalityTraits) {
    super();

    // Validate required Big Five traits
    if (traits.openness === undefined) {
      throw new Error('PersonalityComponent requires openness trait');
    }
    if (traits.conscientiousness === undefined) {
      throw new Error('PersonalityComponent requires conscientiousness trait');
    }
    if (traits.extraversion === undefined) {
      throw new Error('PersonalityComponent requires extraversion trait');
    }
    if (traits.agreeableness === undefined) {
      throw new Error('PersonalityComponent requires agreeableness trait');
    }
    if (traits.neuroticism === undefined) {
      throw new Error('PersonalityComponent requires neuroticism trait');
    }

    // Validate trait ranges
    const validateRange = (value: number, name: string) => {
      if (value < 0 || value > 1) {
        throw new Error(`${name} must be in range 0-1, got ${value}`);
      }
    };

    validateRange(traits.openness, 'openness');
    validateRange(traits.conscientiousness, 'conscientiousness');
    validateRange(traits.extraversion, 'extraversion');
    validateRange(traits.agreeableness, 'agreeableness');
    validateRange(traits.neuroticism, 'neuroticism');

    this.openness = traits.openness;
    this.conscientiousness = traits.conscientiousness;
    this.extraversion = traits.extraversion;
    this.agreeableness = traits.agreeableness;
    this.neuroticism = traits.neuroticism;

    // Derive game-specific traits from Big Five if not provided
    this.workEthic = traits.workEthic ?? traits.conscientiousness;
    this.creativity = traits.creativity ?? traits.openness;
    this.generosity = traits.generosity ?? traits.agreeableness;
    this.leadership =
      traits.leadership ?? traits.extraversion * 0.6 + traits.conscientiousness * 0.4;
    this.spirituality =
      traits.spirituality ?? traits.openness * 0.5 + (1 - traits.neuroticism) * 0.3;

    // Validate derived traits if provided
    if (traits.workEthic !== undefined) validateRange(traits.workEthic, 'workEthic');
    if (traits.creativity !== undefined) validateRange(traits.creativity, 'creativity');
    if (traits.generosity !== undefined) validateRange(traits.generosity, 'generosity');
    if (traits.leadership !== undefined) validateRange(traits.leadership, 'leadership');
    if (traits.spirituality !== undefined) validateRange(traits.spirituality, 'spirituality');
  }

  /** Clone this component */
  clone(): PersonalityComponent {
    return new PersonalityComponent({ ...this });
  }
}

/**
 * Get personality description for prompts.
 * Uses 0-1 scale with 0.7 threshold for high traits and 0.3 for low traits
 */
export function getPersonalityDescription(personality: PersonalityComponent): string {
  if (!personality) {
    throw new Error('getPersonalityDescription: personality parameter is required');
  }

  const traits: string[] = [];

  // Openness
  if (personality.openness > 0.7) {
    traits.push('curious and adventurous');
  } else if (personality.openness < 0.3) {
    traits.push('cautious and traditional');
  }

  // Extraversion
  if (personality.extraversion > 0.7) {
    traits.push('outgoing and social');
  } else if (personality.extraversion < 0.3) {
    traits.push('quiet and introspective');
  }

  // Agreeableness
  if (personality.agreeableness > 0.7) {
    traits.push('helpful and cooperative');
  } else if (personality.agreeableness < 0.3) {
    traits.push('independent and competitive');
  }

  // Conscientiousness
  if (personality.conscientiousness > 0.7) {
    traits.push('organized and disciplined');
  } else if (personality.conscientiousness < 0.3) {
    traits.push('spontaneous and flexible');
  }

  // Work ethic
  if (personality.workEthic > 0.7) {
    traits.push('hardworking and dedicated');
  } else if (personality.workEthic < 0.3) {
    traits.push('relaxed and carefree');
  }

  // Leadership
  if (personality.leadership > 0.7) {
    traits.push('natural leader who takes initiative');
  } else if (personality.leadership < 0.3) {
    traits.push('prefers to follow others');
  }

  // Spirituality
  if (personality.spirituality > 0.7) {
    traits.push('deeply spiritual with divine connection');
  } else if (personality.spirituality < 0.3) {
    traits.push('skeptical and rational-minded');
  }

  return traits.length > 0 ? traits.join(', ') : 'balanced temperament';
}
