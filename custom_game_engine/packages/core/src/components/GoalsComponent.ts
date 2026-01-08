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
  | 'connection'   // Deep bonds with specific individuals
  | 'recognition'; // Status, reputation, being valued

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

  /**
   * Completion ratio estimated by the Executor (0.0 to 1.0)
   * The Executor LLM should update this based on its assessment of progress
   * toward the goal. This is displayed in prompts to help the agent track
   * how close they are to completing their goals.
   */
  completion_ratio?: number;

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
    const validCategories: GoalCategory[] = ['mastery', 'social', 'creative', 'exploration', 'security', 'connection', 'recognition'];
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

    // Clamp progress to 0-1 range
    goal.progress = Math.max(0, Math.min(1, progress));

    // Mark as completed if progress reaches 1.0
    if (goal.progress >= 1.0 && !goal.completed) {
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

    // Clamp progress to 0-1 range
    goal.milestones[milestoneIndex]!.progress = Math.max(0, Math.min(1, progress));

    // Auto-complete milestone if progress reaches 1.0
    if (goal.milestones[milestoneIndex]!.progress >= 1.0) {
      goal.milestones[milestoneIndex]!.completed = true;
    }
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
 * Format goals for LLM prompt (legacy, simple format).
 * Returns empty string if no active goals (section will be omitted to save tokens).
 * Uses completion_ratio if available (set by Executor), otherwise falls back to progress field.
 */
export function formatGoalsForPrompt(goalsComponent: GoalsComponent): string {
  const goals = goalsComponent.goals;

  if (goals.length === 0) {
    return ''; // Empty = section omitted (saves tokens)
  }

  const activeGoals = goals.filter(g => !g.completed);
  if (activeGoals.length === 0) {
    return ''; // All completed = section omitted (saves tokens)
  }

  return activeGoals.map(goal => {
    // Prefer completion_ratio (set by Executor) over progress
    const completionValue = goal.completion_ratio !== undefined ? goal.completion_ratio : goal.progress;
    const completionPercent = Math.round(completionValue * 100);
    const completedMilestones = goal.milestones.filter(m => m.completed).length;
    const totalMilestones = goal.milestones.length;

    return `${goal.description} (${completionPercent}% complete, ${completedMilestones}/${totalMilestones} milestones)`;
  }).join(', ');
}

/**
 * Format goals as a dedicated section for prominent display in LLM prompts.
 * Groups goals by type (personal, medium_term, group) and shows completion %.
 * Returns null if no active goals.
 */
export function formatGoalsSectionForPrompt(goalsComponent: GoalsComponent): string | null {
  const goals = goalsComponent.goals;

  if (goals.length === 0) {
    return null;
  }

  const activeGoals = goals.filter(g => !g.completed);
  if (activeGoals.length === 0) {
    return null;
  }

  // Note: The original GoalsComponent doesn't have a 'type' field yet
  // We'll format all goals together for now, but structure it for future type support
  const lines: string[] = [];

  for (const goal of activeGoals) {
    // Prefer completion_ratio (set by Executor) over progress
    const completionValue = goal.completion_ratio !== undefined ? goal.completion_ratio : goal.progress;
    const completionPercent = Math.round(completionValue * 100);

    // Format: [Category] Description (completion%)
    const categoryLabel = goal.category.charAt(0).toUpperCase() + goal.category.slice(1);
    lines.push(`[${categoryLabel}] ${goal.description} (${completionPercent}% complete)`);
  }

  if (lines.length === 0) {
    return 'No goals set yet - consider what you want to achieve';
  }

  return lines.join('\n');
}
