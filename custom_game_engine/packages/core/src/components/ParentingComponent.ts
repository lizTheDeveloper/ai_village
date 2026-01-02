/**
 * ParentingComponent - Tracks an agent's parenting responsibilities and drives
 *
 * This component creates a biological/psychological drive to care for offspring,
 * but leaves the HOW to the LLM - agents can parent well or poorly based on their
 * personality, skills, and decisions.
 *
 * Child health and wellbeing impacts parent social standing.
 */

import { ComponentBase } from '../ecs/Component';
import type { EntityId, Tick } from '../types';
import type { ParentalCareType, CareProvider } from '../reproduction/MatingParadigm';

/**
 * A child that this agent is responsible for
 */
export interface ParentingResponsibility {
  /** ID of the child entity */
  childId: EntityId;

  /** Is this agent the primary caregiver? */
  isPrimaryCaregiver: boolean;

  /** Other parent(s) of this child */
  otherParents: EntityId[];

  /** When this parenting responsibility started */
  startedAt: Tick;

  /** When parenting duty ends (based on species paradigm) */
  endsAt: Tick | null; // null = lifetime

  /** Type of care this paradigm requires */
  careType: ParentalCareType;

  /** Last time agent checked on this child */
  lastCheckIn: Tick;

  /** Current assessment of child's wellbeing (0-1) */
  childWellbeingAssessment: number;

  /** Has agent neglected this child? */
  neglectWarnings: number;

  /** Notes/flavor text about this parenting relationship */
  notes?: string;
}

/**
 * Parenting drive state
 */
export type ParentingDriveLevel =
  | 'none'       // No active parenting responsibilities
  | 'low'        // Child is independent, minimal care needed
  | 'moderate'   // Normal parenting drive
  | 'high'       // Child needs attention
  | 'urgent';    // Child in danger or severe need

/**
 * Social reputation impact from parenting
 */
export interface ParentingReputation {
  /** Overall parenting skill assessment (0-1) */
  parentingSkill: number;

  /** Reputation modifier from child outcomes */
  reputationModifier: number; // -1 to +1

  /** Notable parenting achievements or failures */
  notableEvents: Array<{
    type: 'achievement' | 'failure';
    description: string;
    tick: Tick;
    socialImpact: number;
  }>;
}

/**
 * Component for tracking parenting responsibilities and drives
 */
export class ParentingComponent extends ComponentBase {
  public readonly type = 'parenting' as const;

  /** Active parenting responsibilities */
  public responsibilities: ParentingResponsibility[];

  /** How strongly does this agent feel the parenting drive? (0-1) */
  public parentingDrive: number;

  /** Current parenting drive level */
  public driveLevel: ParentingDriveLevel;

  /** Time since last parenting check (for drive calculation) */
  public timeSinceLastCare: number;

  /** Parenting skill (improved through practice) */
  public parentingSkill: number;

  /** Social reputation from parenting */
  public reputation: ParentingReputation;

  /** Does this agent want children? (distinct from having them) */
  public desiresChildren: boolean;

  /** Ideal number of children this agent wants */
  public desiredChildCount: number;

  /** Parenting style preferences */
  public parentingStyle: {
    /** How protective is this parent? (0=hands-off, 1=helicopter) */
    protectiveness: number;

    /** How much does this parent teach vs let child learn? (0=laissez-faire, 1=didactic) */
    teachingOrientation: number;

    /** How emotionally expressive with children? (0=stoic, 1=demonstrative) */
    emotionalExpressiveness: number;

    /** How strict with discipline? (0=permissive, 1=authoritarian) */
    discipline: number;
  };

  /** Species-specific parenting paradigm */
  public careProvider: CareProvider;

  /** Notes about parenting approach and philosophy */
  public notes?: string;

  constructor(data: {
    responsibilities?: ParentingResponsibility[];
    parentingDrive?: number;
    driveLevel?: ParentingDriveLevel;
    timeSinceLastCare?: number;
    parentingSkill?: number;
    reputation?: ParentingReputation;
    desiresChildren?: boolean;
    desiredChildCount?: number;
    parentingStyle?: {
      protectiveness: number;
      teachingOrientation: number;
      emotionalExpressiveness: number;
      discipline: number;
    };
    careProvider?: CareProvider;
    notes?: string;
  }) {
    super();

    this.responsibilities = data.responsibilities ?? [];
    this.parentingDrive = data.parentingDrive ?? 0;
    this.driveLevel = data.driveLevel ?? 'none';
    this.timeSinceLastCare = data.timeSinceLastCare ?? 0;
    this.parentingSkill = data.parentingSkill ?? 0.3; // Start with basic skill
    this.reputation = data.reputation ?? {
      parentingSkill: 0.3,
      reputationModifier: 0,
      notableEvents: [],
    };
    this.desiresChildren = data.desiresChildren ?? Math.random() > 0.3; // 70% want kids
    this.desiredChildCount = data.desiredChildCount ?? Math.floor(1 + Math.random() * 3); // 1-3
    this.parentingStyle = data.parentingStyle ?? {
      protectiveness: Math.random(),
      teachingOrientation: Math.random(),
      emotionalExpressiveness: Math.random(),
      discipline: Math.random(),
    };
    this.careProvider = data.careProvider ?? 'both_parents';
    this.notes = data.notes;

    // Validate parenting drive
    if (this.parentingDrive < 0 || this.parentingDrive > 1) {
      throw new Error(`parentingDrive must be 0-1, got ${this.parentingDrive}`);
    }

    // Validate parenting skill
    if (this.parentingSkill < 0 || this.parentingSkill > 1) {
      throw new Error(`parentingSkill must be 0-1, got ${this.parentingSkill}`);
    }
  }

  /**
   * Add a new parenting responsibility
   */
  public addChild(responsibility: ParentingResponsibility): void {
    this.responsibilities.push(responsibility);
    this.updateDriveLevel();
  }

  /**
   * Remove a parenting responsibility (child grown up or died)
   */
  public removeChild(childId: EntityId): void {
    this.responsibilities = this.responsibilities.filter((r) => r.childId !== childId);
    this.updateDriveLevel();
  }

  /**
   * Update parenting drive level based on children's needs
   */
  public updateDriveLevel(): void {
    if (this.responsibilities.length === 0) {
      this.driveLevel = 'none';
      this.parentingDrive = 0;
      return;
    }

    // Calculate average need level across all children
    let totalNeed = 0;
    let urgentCount = 0;

    for (const resp of this.responsibilities) {
      const wellbeing = resp.childWellbeingAssessment;
      const timeSinceCheck = this.timeSinceLastCare;

      // High need if wellbeing is low
      if (wellbeing < 0.3) {
        urgentCount++;
        totalNeed += 1.0;
      } else if (wellbeing < 0.6) {
        totalNeed += 0.7;
      } else if (timeSinceCheck > 1000) {
        // Need to check in even if child is healthy
        totalNeed += 0.4;
      } else {
        totalNeed += 0.2;
      }
    }

    const avgNeed = totalNeed / this.responsibilities.length;
    this.parentingDrive = avgNeed;

    // Set drive level
    if (urgentCount > 0) {
      this.driveLevel = 'urgent';
    } else if (avgNeed > 0.7) {
      this.driveLevel = 'high';
    } else if (avgNeed > 0.4) {
      this.driveLevel = 'moderate';
    } else {
      this.driveLevel = 'low';
    }
  }

  /**
   * Record a parenting action (improves skill over time)
   */
  public recordParentingAction(quality: number): void {
    // Skill improves slowly through practice
    const learningRate = 0.01;
    this.parentingSkill = Math.min(
      1.0,
      this.parentingSkill + learningRate * quality
    );

    this.timeSinceLastCare = 0;
    this.updateDriveLevel();
  }

  /**
   * Get the most urgent child that needs attention
   */
  public getMostUrgentChild(): ParentingResponsibility | null {
    if (this.responsibilities.length === 0) return null;

    return this.responsibilities.reduce((mostUrgent, current) => {
      if (!mostUrgent) return current;
      return current.childWellbeingAssessment < mostUrgent.childWellbeingAssessment
        ? current
        : mostUrgent;
    });
  }

  /**
   * Add a notable parenting event (for social reputation)
   */
  public addNotableEvent(
    type: 'achievement' | 'failure',
    description: string,
    tick: Tick,
    socialImpact: number
  ): void {
    this.reputation.notableEvents.push({
      type,
      description,
      tick,
      socialImpact,
    });

    // Update reputation modifier
    this.reputation.reputationModifier = Math.max(
      -1,
      Math.min(1, this.reputation.reputationModifier + socialImpact)
    );
  }
}

/**
 * Helper to create a parenting component
 */
export function createParentingComponent(
  careProvider: CareProvider = 'both_parents',
  desiresChildren: boolean = Math.random() > 0.3
): ParentingComponent {
  return new ParentingComponent({
    careProvider,
    desiresChildren,
  });
}
