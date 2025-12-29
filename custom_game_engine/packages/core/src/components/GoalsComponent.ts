/**
 * GoalsComponent - Tracks an agent's personal goals
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * Goals are generated during reflection based on personality traits
 * and give agents persistent aspirations that guide their decisions.
 */

import { ComponentBase } from '../ecs/Component.js';

/**
 * Categories of personal goals.
 * Each category maps to different personality traits.
 */
export type GoalCategory =
  | 'mastery'      // Skill improvement, becoming expert (conscientiousness, work ethic)
  | 'social'       // Friendship, community building (extraversion, agreeableness)
  | 'creative'     // Innovation, expression (creativity, openness)
  | 'exploration'  // Discovery, adventure (openness)
  | 'security'     // Safety, resources, shelter (conscientiousness, neuroticism)
  | 'legacy';      // Teaching, mentoring, leaving a mark (leadership, generosity)

/**
 * A milestone within a goal
 */
export interface GoalMilestone {
  description: string;
  completed: boolean;
  progress: number;
}

/**
 * A single personal goal.
 */
export interface PersonalGoal {
  /** Unique identifier for this goal */
  id: string;

  /** Goal category */
  category: GoalCategory;

  /** Human-readable description (e.g., "Become a skilled builder") */
  description: string;

  /** Why this goal matters to the agent */
  motivation: string;

  /** Progress toward goal (0-1.0) */
  progress: number;

  /** Milestones for this goal */
  milestones: GoalMilestone[];

  /** When this goal was formed */
  createdAt: number;

  /** Target completion time in days */
  targetCompletionDays: number;

  /** Whether this goal is complete */
  completed?: boolean;

  /** When goal was completed (if complete) */
  completedAt?: number;
}

/**
 * GoalsComponent tracks an agent's personal goals.
 */
export class GoalsComponent extends ComponentBase {
  public readonly type = 'goals';
  public goals: PersonalGoal[] = [];
  private readonly MAX_GOALS = 5;

  constructor() {
    super();
  }

  /**
   * Add a new goal
   */
  addGoal(goal: PersonalGoal): void {
    // Validate required fields - NO FALLBACKS per CLAUDE.md
    if (!goal.id || !goal.category || !goal.description || !goal.motivation) {
      throw new Error('Goal missing required field: id, category, description, or motivation');
    }

    // Validate category
    const validCategories: GoalCategory[] = ['mastery', 'social', 'creative', 'exploration', 'security', 'legacy'];
    if (!validCategories.includes(goal.category)) {
      throw new Error(`Invalid goal category: ${goal.category}. Valid: ${validCategories.join(', ')}`);
    }

    // Check goal limit
    if (this.goals.length >= this.MAX_GOALS) {
      throw new Error('Cannot add more than 5 goals');
    }

    this.goals.push({ ...goal });
  }

  /**
   * Get a goal by ID
   */
  getGoal(id: string): PersonalGoal | undefined {
    return this.goals.find(g => g.id === id);
  }

  /**
   * Get goals by category
   */
  getGoalsByCategory(category: GoalCategory): PersonalGoal[] {
    return this.goals.filter(g => g.category === category);
  }

  /**
   * Get active (non-completed) goals
   */
  getActiveGoals(): PersonalGoal[] {
    return this.goals.filter(g => !g.completed);
  }

  /**
   * Count active goals
   */
  getActiveGoalCount(): number {
    return this.getActiveGoals().length;
  }

  /**
   * Check if can add more goals
   */
  canAddGoal(): boolean {
    return this.goals.length < this.MAX_GOALS;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(id: string, progress: number): void {
    const goal = this.getGoal(id);
    if (!goal) {
      throw new Error(`Goal not found: ${id}`);
    }

    goal.progress = progress;

    // Mark as completed if progress reaches 1.0
    if (progress >= 1.0 && !goal.completed) {
      goal.completed = true;
      goal.completedAt = Date.now();
    }
  }

  /**
   * Update milestone progress
   */
  updateMilestoneProgress(goalId: string, milestoneIndex: number, progress: number): void {
    const goal = this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    if (milestoneIndex < 0 || milestoneIndex >= goal.milestones.length) {
      throw new Error(`Invalid milestone index: ${milestoneIndex}`);
    }

    goal.milestones[milestoneIndex]!.progress = progress;
  }

  /**
   * Complete a milestone
   */
  completeMilestone(goalId: string, milestoneIndex: number): void {
    const goal = this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    if (milestoneIndex < 0 || milestoneIndex >= goal.milestones.length) {
      throw new Error(`Invalid milestone index: ${milestoneIndex}`);
    }

    goal.milestones[milestoneIndex]!.completed = true;
    goal.milestones[milestoneIndex]!.progress = 1.0;
  }

  /**
   * Remove a goal
   */
  removeGoal(id: string): void {
    const index = this.goals.findIndex(g => g.id === id);
    if (index >= 0) {
      this.goals.splice(index, 1);
    }
  }

  /**
   * Serialize to JSON
   */
  toJSON(): { goals: PersonalGoal[] } {
    return {
      goals: this.goals.map(g => ({ ...g }))
    };
  }

  /**
   * Restore from JSON
   */
  fromJSON(data: { goals: PersonalGoal[] }): void {
    this.goals = data.goals.map(g => ({ ...g }));
  }
}

/**
 * Create a goals component
 */
export function createGoalsComponent(): GoalsComponent {
  return new GoalsComponent();
}

/**
 * Check if an agent can form a new goal
 */
export function canFormNewGoal(component: GoalsComponent): boolean {
  return component.canAddGoal();
}

/**
 * Add a goal to an agent's goals component
 */
export function addGoal(component: GoalsComponent, goal: PersonalGoal): void {
  component.addGoal(goal);
}

/**
 * Format goals for LLM prompt
 */
export function formatGoalsForPrompt(goalsComponent: GoalsComponent): string {
  const goals = goalsComponent.goals;

  if (goals.length === 0) {
    return 'No personal goals yet.';
  }

  const activeGoals = goals.filter(g => !g.completed);
  if (activeGoals.length === 0) {
    return 'All goals completed.';
  }

  return activeGoals.map(goal => {
    const progressPercent = Math.round(goal.progress * 100);
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    const totalMilestones = goal.milestones.length;

    return `${goal.description} (${progressPercent}% complete, ${completedMilestones}/${totalMilestones} milestones)`;
  }).join(', ');
}
