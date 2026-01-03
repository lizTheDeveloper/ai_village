import type { Component } from '../ecs/Component.js';

/**
 * Research fields available in the game
 */
export type ResearchField =
  | 'agriculture'
  | 'metallurgy'
  | 'alchemy'
  | 'textiles'
  | 'cuisine'
  | 'construction'
  | 'nature'
  | 'arcane'
  | 'machinery'
  | 'society';

/**
 * BiographyComponent - A documented life story that inspires career paths
 *
 * Unlocked by: biography_books technology (Tier 0e+)
 * Requires: 2 of 3 papers from biography_publishing set
 *
 * Biographies document the achievements and career progression of notable agents,
 * providing blueprints that inspire others to pursue similar paths. Young agents
 * who read biographies receive 2x inspiration bonus.
 */

export interface Achievement {
  /** Unique achievement ID */
  achievementId: string;
  /** Achievement name */
  name: string;
  /** Description */
  description: string;
  /** When achieved (tick) */
  tick: number;
  /** Age when achieved */
  age: number;
  /** Skills involved */
  skillsUsed: string[];
  /** Impact/significance (1-10) */
  significance: number;
}

export interface CareerMilestone {
  /** Milestone name */
  name: string;
  /** Description */
  description: string;
  /** Required skills and levels */
  requiredSkills: Record<string, number>;
  /** Approximate age to achieve */
  typicalAge: number;
  /** What this unlocks */
  unlocks?: string[];
}

export interface CareerBlueprint {
  /** Career field */
  field: ResearchField;
  /** Recommended starting skills */
  recommendedSkills: string[];
  /** Career milestones in order */
  milestones: CareerMilestone[];
  /** Peak skill level achieved by subject */
  peakSkill: number;
  /** Estimated years to mastery */
  yearsToMastery: number;
}

export interface BiographyComponent extends Component {
  type: 'biography';

  /** Unique biography ID */
  biographyId: string;

  /** Book title */
  title: string;

  /** Subject entity ID */
  subjectId: string;

  /** Subject's name */
  subjectName: string;

  /** Major achievements documented */
  achievements: Achievement[];

  /** Primary career field */
  field: ResearchField;

  /** Peak skill level in primary field */
  peakSkill: number;

  /** Author entity ID */
  authorId: string;

  /** Published by (printing company ID) */
  publishedBy: string;

  /** When published */
  publicationTick: number;

  /** Number of copies printed */
  copiesPrinted: number;

  /** How many agents have read this */
  readersCount: number;

  /** Inspiration bonus for readers (multiplier) */
  inspirationBonus: number;

  /** Career blueprint extracted from subject's life */
  careerPath: CareerBlueprint;

  /** Notable quotes from the subject */
  quotes: string[];

  /** Summary of life story */
  summary: string;
}

export function createBiographyComponent(
  biographyId: string,
  title: string,
  subjectId: string,
  subjectName: string,
  field: ResearchField,
  peakSkill: number,
  authorId: string,
  publishedBy: string,
  publicationTick: number
): BiographyComponent {
  if (!biographyId) {
    throw new Error('Biography requires biographyId');
  }
  if (!title) {
    throw new Error('Biography requires title');
  }
  if (!subjectId) {
    throw new Error('Biography requires subjectId');
  }
  if (!authorId) {
    throw new Error('Biography requires authorId');
  }
  if (!publishedBy) {
    throw new Error('Biography requires publishedBy (publisher ID)');
  }
  if (peakSkill < 0 || peakSkill > 100) {
    throw new RangeError(`Peak skill must be 0-100, got ${peakSkill}`);
  }

  return {
    type: 'biography',
    version: 1,
    biographyId,
    title,
    subjectId,
    subjectName,
    achievements: [],
    field,
    peakSkill,
    authorId,
    publishedBy,
    publicationTick,
    copiesPrinted: 0,
    readersCount: 0,
    inspirationBonus: 1.5, // 50% bonus by default
    careerPath: {
      field,
      recommendedSkills: [],
      milestones: [],
      peakSkill,
      yearsToMastery: 0,
    },
    quotes: [],
    summary: '',
  };
}

/**
 * Add an achievement to the biography
 */
export function addAchievement(
  biography: BiographyComponent,
  achievement: Achievement
): void {
  // Check if achievement already exists
  if (
    biography.achievements.some((a) => a.achievementId === achievement.achievementId)
  ) {
    throw new Error(`Achievement ${achievement.achievementId} already in biography`);
  }

  biography.achievements.push(achievement);

  // Sort by tick
  biography.achievements.sort((a, b) => a.tick - b.tick);
}

/**
 * Add a milestone to the career path
 */
export function addMilestone(
  biography: BiographyComponent,
  milestone: CareerMilestone
): void {
  biography.careerPath.milestones.push(milestone);

  // Sort by typical age
  biography.careerPath.milestones.sort((a, b) => a.typicalAge - b.typicalAge);
}

/**
 * Record that an agent read this biography
 */
export function recordReading(
  biography: BiographyComponent,
  readerAge: number
): number {
  biography.readersCount++;

  // Young readers get 2x bonus
  const ageMultiplier = readerAge < 20 ? 2.0 : 1.0;

  return biography.inspirationBonus * ageMultiplier;
}

/**
 * Get recommended skills for this career path
 */
export function getRecommendedSkills(
  biography: BiographyComponent
): Record<string, number> {
  const skills: Record<string, number> = {};

  // Collect skills from all milestones
  for (const milestone of biography.careerPath.milestones) {
    for (const [skill, level] of Object.entries(milestone.requiredSkills)) {
      if (!skills[skill] || skills[skill] < level) {
        skills[skill] = level;
      }
    }
  }

  return skills;
}

/**
 * Calculate how inspirational this biography is
 * Based on achievements, peak skill, and career progression
 */
export function calculateInspirationValue(
  biography: BiographyComponent
): number {
  let value = 0;

  // Base value from peak skill
  value += biography.peakSkill / 10; // Max 10 points

  // Value from number of achievements
  value += Math.min(biography.achievements.length, 10); // Max 10 points

  // Value from achievement significance
  const totalSignificance = biography.achievements.reduce(
    (sum, ach) => sum + ach.significance,
    0
  );
  value += Math.min(totalSignificance / 5, 10); // Max 10 points

  // Value from career milestones
  value += Math.min(biography.careerPath.milestones.length * 2, 10); // Max 10 points

  return value; // Max 40 points
}

/**
 * Check if an agent would be inspired by this biography
 * @param agentField The agent's current/desired field
 * @param agentSkills The agent's current skills
 * @returns Inspiration score (0-100)
 */
export function getInspirationScore(
  biography: BiographyComponent,
  agentField: ResearchField | undefined,
  agentSkills: Record<string, number>
): number {
  let score = 0;

  // Higher score if fields match
  if (agentField === biography.field) {
    score += 50;
  } else if (agentField) {
    score += 10; // Some inspiration even from other fields
  }

  // Score based on skill gap (agent can see path to improvement)
  const agentSkillInField = agentSkills[biography.field] ?? 0;
  const skillGap = biography.peakSkill - agentSkillInField;

  if (skillGap > 0 && skillGap <= 30) {
    // Optimal gap: subject is better but not unreachably so
    score += 30;
  } else if (skillGap > 30) {
    // Too far ahead, less relatable
    score += 10;
  } else {
    // Agent already at or above subject's level
    score += 5;
  }

  // Bonus for number of achievements
  score += Math.min(biography.achievements.length * 2, 20);

  return Math.min(score, 100);
}

/**
 * Add a quote to the biography
 */
export function addQuote(biography: BiographyComponent, quote: string): void {
  if (!quote) {
    throw new Error('Quote cannot be empty');
  }
  biography.quotes.push(quote);
}

/**
 * Set the career blueprint
 */
export function setCareerBlueprint(
  biography: BiographyComponent,
  blueprint: CareerBlueprint
): void {
  biography.careerPath = blueprint;
}

/**
 * Get the next milestone an agent should aim for
 */
export function getNextMilestone(
  biography: BiographyComponent,
  agentSkills: Record<string, number>
): CareerMilestone | undefined {
  // Find first milestone where agent doesn't meet all requirements
  return biography.careerPath.milestones.find((milestone) => {
    for (const [skill, requiredLevel] of Object.entries(
      milestone.requiredSkills
    )) {
      const agentLevel = agentSkills[skill] ?? 0;
      if (agentLevel < requiredLevel) {
        return true; // This milestone is not yet achieved
      }
    }
    return false;
  });
}
