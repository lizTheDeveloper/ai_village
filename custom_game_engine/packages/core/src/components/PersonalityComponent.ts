import { ComponentBase } from '../ecs/Component.js';

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  workEthic: number;
  creativity: number;
  generosity: number;
  leadership: number;
}

/**
 * Class-based PersonalityComponent for tests and new systems
 * Traits are 0-1.0 scale
 */
export class PersonalityComponent extends ComponentBase {
  public readonly type = 'personality';
  public openness: number;
  public conscientiousness: number;
  public extraversion: number;
  public agreeableness: number;
  public neuroticism: number;
  public workEthic: number;
  public creativity: number;
  public generosity: number;
  public leadership: number;

  constructor(traits: PersonalityTraits) {
    super();
    this.openness = traits.openness;
    this.conscientiousness = traits.conscientiousness;
    this.extraversion = traits.extraversion;
    this.agreeableness = traits.agreeableness;
    this.neuroticism = traits.neuroticism;
    this.workEthic = traits.workEthic;
    this.creativity = traits.creativity;
    this.generosity = traits.generosity;
    this.leadership = traits.leadership;
  }
}

/**
 * Legacy interface-based personality component
 * Personality traits based on Big Five + game-specific traits.
 * From agent-system/spec.md
 */
export interface PersonalityComponentLegacy {
  type: 'personality';
  version: number;

  // Big Five traits (0-100)
  openness: number;          // curious vs cautious
  conscientiousness: number; // organized vs spontaneous
  extraversion: number;      // social vs solitary
  agreeableness: number;     // cooperative vs competitive
  neuroticism: number;       // sensitive vs resilient

  // Game-specific traits (0-100)
  workEthic: number;         // prioritizes tasks
  creativity: number;        // tries new things
  generosity: number;        // shares/helps
  leadership: number;        // takes initiative, organizes others
}

/**
 * Generate random personality traits.
 */
export function generateRandomPersonality(): PersonalityComponentLegacy {
  const random = () => Math.floor(Math.random() * 100);

  return {
    type: 'personality',
    version: 1,
    openness: random(),
    conscientiousness: random(),
    extraversion: random(),
    agreeableness: random(),
    neuroticism: random(),
    workEthic: random(),
    creativity: random(),
    generosity: random(),
    leadership: random(),
  };
}

/**
 * Create personality with specific traits.
 */
export function createPersonalityComponent(traits: Partial<Omit<PersonalityComponentLegacy, 'type' | 'version'>>): PersonalityComponentLegacy {
  return {
    type: 'personality',
    version: 1,
    openness: traits.openness ?? 50,
    conscientiousness: traits.conscientiousness ?? 50,
    extraversion: traits.extraversion ?? 50,
    agreeableness: traits.agreeableness ?? 50,
    neuroticism: traits.neuroticism ?? 50,
    workEthic: traits.workEthic ?? 50,
    creativity: traits.creativity ?? 50,
    generosity: traits.generosity ?? 50,
    leadership: traits.leadership ?? 50,
  };
}

/**
 * Get personality description for prompts.
 */
export function getPersonalityDescription(personality: PersonalityComponentLegacy | PersonalityComponent): string {
  const traits: string[] = [];

  // Openness
  if (personality.openness > 70) {
    traits.push('curious and adventurous');
  } else if (personality.openness < 30) {
    traits.push('cautious and traditional');
  }

  // Extraversion
  if (personality.extraversion > 70) {
    traits.push('outgoing and social');
  } else if (personality.extraversion < 30) {
    traits.push('quiet and introspective');
  }

  // Agreeableness
  if (personality.agreeableness > 70) {
    traits.push('helpful and cooperative');
  } else if (personality.agreeableness < 30) {
    traits.push('independent and competitive');
  }

  // Conscientiousness
  if (personality.conscientiousness > 70) {
    traits.push('organized and disciplined');
  } else if (personality.conscientiousness < 30) {
    traits.push('spontaneous and flexible');
  }

  // Work ethic
  if (personality.workEthic > 70) {
    traits.push('hardworking and dedicated');
  } else if (personality.workEthic < 30) {
    traits.push('relaxed and carefree');
  }

  // Leadership
  if (personality.leadership > 70) {
    traits.push('natural leader who takes initiative');
  } else if (personality.leadership < 30) {
    traits.push('prefers to follow others');
  }

  return traits.length > 0 ? traits.join(', ') : 'balanced temperament';
}
