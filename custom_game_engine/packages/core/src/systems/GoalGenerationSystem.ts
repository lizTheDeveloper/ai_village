import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { GoalCategory, PersonalGoal } from '../components/GoalsComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';
import { GoalsComponent } from '../components/GoalsComponent.js';
import { SkillsComponent } from '../components/SkillsComponent.js';

/**
 * GoalGenerationSystem handles automatic goal generation during reflection
 * and goal progress tracking based on agent actions.
 */
export class GoalGenerationSystem implements System {
  public readonly id: SystemId = 'goal_generation';
  public readonly priority: number = 115; // After reflection system
  public readonly requiredComponents = [] as const;

  private eventBus: EventBus;
  private nextGoalId = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Generate goals after reflection
    this.eventBus.subscribe('reflection:completed', (event) => {
      const { agentId } = event.data;
      const entity = (this.eventBus as any).world?.getEntity(agentId);
      if (!entity) return;

      const goalsComp = entity.getComponent('goals') as GoalsComponent | null;
      const personalityComp = entity.getComponent('personality') as PersonalityComponent | null;

      if (!goalsComp || !personalityComp) return;

      // 50% chance to form a new goal if < 3 goals
      if (goalsComp.getActiveGoalCount() < 3 && Math.random() < 0.5) {
        const goal = this._generateGoal(agentId, personalityComp, entity);
        if (goal) {
          goalsComp.addGoal(goal);
          this.eventBus.emit({
            type: 'agent:goal_formed',
            source: this.id,
            data: {
              agentId,
              goalId: goal.id,
              category: goal.category,
              description: goal.description,
            },
          });
        }
      }
    });

    // Track goal progress from action completion
    this.eventBus.subscribe('agent:action:completed', (event) => {
      const { actionType } = event.data;

      // The agentId is in event.source (set to action.actorId by ActionQueue)
      const agentId = event.source;
      if (!agentId) return;

      const entity = (this.eventBus as any).world?.getEntity(agentId);
      if (!entity) return;

      const goalsComp = entity.getComponent('goals') as GoalsComponent | null;
      if (!goalsComp) return;

      this._updateGoalProgress(agentId, goalsComp, actionType);
    });
  }

  update(_world: World): void {
    // This system is event-driven, no per-frame updates needed
    this.eventBus.flush();
  }

  /**
   * Generate a personal goal based on personality traits
   */
  private _generateGoal(
    agentId: string,
    personality: PersonalityComponent,
    entity: any
  ): PersonalGoal | null {
    // Select category based on personality weights
    const category = this._selectGoalCategory(personality);

    // Get skills if available
    const skillsComp = entity.getComponent('skills') as SkillsComponent | null;

    // Generate goal based on category
    const goal = this._createGoalForCategory(category, personality, skillsComp);

    if (!goal) return null;

    return {
      id: `goal-${agentId}-${this.nextGoalId++}`,
      category,
      description: goal.description,
      motivation: goal.motivation,
      progress: 0,
      milestones: goal.milestones || [],
      createdAt: Date.now(),
      targetCompletionDays: goal.targetDays || 7,
    };
  }

  /**
   * Select goal category weighted by personality traits
   */
  private _selectGoalCategory(personality: PersonalityComponent): GoalCategory {
    const weights = {
      mastery: personality.conscientiousness * 5 + (personality.workEthic || 0.5),
      social: personality.extraversion * 5 + personality.agreeableness * 2,
      creative: (personality.creativity || 0.5) * 4 + personality.openness * 4,
      exploration: personality.openness * 5,
      security: personality.conscientiousness * 2 + (1 - (personality.neuroticism || 0.5)) * 2,
      connection: personality.agreeableness * 1.5 + Math.max(0, (1 - personality.extraversion) - 0.3) * 2,
      recognition: Math.max(0, (personality.neuroticism || 0.5) - 0.3) * 3 + (personality.leadership || 0.5) * 1.5,
    };

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [category, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return category as GoalCategory;
      }
    }

    return 'mastery'; // Fallback
  }

  /**
   * Create goal details for a specific category
   */
  private _createGoalForCategory(
    category: GoalCategory,
    personality: PersonalityComponent,
    skills: SkillsComponent | null
  ): {
    description: string;
    motivation: string;
    milestones?: Array<{ description: string; completed: boolean; progress: number }>;
    targetDays?: number;
  } | null {
    switch (category) {
      case 'mastery':
        return this._createMasteryGoal(personality, skills);
      case 'social':
        return this._createSocialGoal(personality);
      case 'creative':
        return this._createCreativeGoal(personality);
      case 'exploration':
        return this._createExplorationGoal(personality);
      case 'security':
        return this._createSecurityGoal(personality);
      case 'connection':
        return this._createConnectionGoal(personality);
      case 'recognition':
        return this._createRecognitionGoal(personality);
      default:
        return null;
    }
  }

  private _createMasteryGoal(
    _personality: PersonalityComponent,
    _skills: SkillsComponent | null
  ): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    const skillTypes = ['building', 'farming', 'gathering', 'crafting'];
    const chosenSkill = skillTypes[Math.floor(Math.random() * skillTypes.length)];

    return {
      description: `Become a skilled ${chosenSkill === 'building' ? 'builder' : chosenSkill === 'farming' ? 'farmer' : chosenSkill === 'gathering' ? 'gatherer' : 'crafter'}`,
      motivation: `I want to master the art of ${chosenSkill}`,
      milestones: [
        { description: `Practice ${chosenSkill} regularly`, completed: false, progress: 0 },
        { description: `Complete 10 ${chosenSkill} tasks`, completed: false, progress: 0 },
        { description: `Achieve excellence in ${chosenSkill}`, completed: false, progress: 0 },
      ],
    };
  }

  private _createSocialGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Build strong friendships in the village',
      motivation: 'I value deep connections with others',
      milestones: [
        { description: 'Have meaningful conversations', completed: false, progress: 0 },
        { description: 'Help neighbors with their tasks', completed: false, progress: 0 },
        { description: 'Become a trusted member of the community', completed: false, progress: 0 },
      ],
    };
  }

  private _createCreativeGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Create something unique and beautiful',
      motivation: 'I want to express my creativity',
      milestones: [
        { description: 'Experiment with new designs', completed: false, progress: 0 },
        { description: 'Build an artistic structure', completed: false, progress: 0 },
        { description: 'Leave a creative mark on the village', completed: false, progress: 0 },
      ],
    };
  }

  private _createExplorationGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Discover new places and resources',
      motivation: 'I love exploring the unknown',
      milestones: [
        { description: 'Explore unexplored areas', completed: false, progress: 0 },
        { description: 'Find rare resources', completed: false, progress: 0 },
        { description: 'Map the entire region', completed: false, progress: 0 },
      ],
    };
  }

  private _createSecurityGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Ensure safety and resource security',
      motivation: 'I want to feel secure and prepared',
      milestones: [
        { description: 'Build a safe shelter', completed: false, progress: 0 },
        { description: 'Stockpile essential resources', completed: false, progress: 0 },
        { description: 'Create emergency reserves', completed: false, progress: 0 },
      ],
    };
  }

  private _createConnectionGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Form a deep bond with someone special',
      motivation: 'I want meaningful connections with people I trust',
      milestones: [
        { description: 'Find someone I connect with', completed: false, progress: 0 },
        { description: 'Share personal thoughts and feelings', completed: false, progress: 0 },
        { description: 'Build a lasting friendship or partnership', completed: false, progress: 0 },
      ],
    };
  }

  private _createRecognitionGoal(_personality: PersonalityComponent): {
    description: string;
    motivation: string;
    milestones: Array<{ description: string; completed: boolean; progress: number }>;
  } {
    return {
      description: 'Earn respect and recognition from others',
      motivation: 'I want to be valued for my contributions',
      milestones: [
        { description: 'Complete important tasks', completed: false, progress: 0 },
        { description: 'Help the community in visible ways', completed: false, progress: 0 },
        { description: 'Be known as someone reliable and skilled', completed: false, progress: 0 },
      ],
    };
  }

  /**
   * Update goal progress based on completed action
   */
  private _updateGoalProgress(
    agentId: string,
    goalsComp: GoalsComponent,
    actionType: string
  ): void {
    const activeGoals = goalsComp.getActiveGoals();

    for (const goal of activeGoals) {
      let progressDelta = 0;

      // Map action types to goal categories
      switch (goal.category) {
        case 'mastery':
          if (this._isMasteryAction(actionType)) {
            progressDelta = 0.05; // 5% progress per relevant action
          }
          break;
        case 'social':
          if (this._isSocialAction(actionType)) {
            progressDelta = 0.1; // Social actions progress faster
          }
          break;
        case 'creative':
          if (this._isCreativeAction(actionType)) {
            progressDelta = 0.08;
          }
          break;
        case 'exploration':
          if (this._isExplorationAction(actionType)) {
            progressDelta = 0.07;
          }
          break;
        case 'security':
          if (this._isSecurityAction(actionType)) {
            progressDelta = 0.06;
          }
          break;
        case 'connection':
          if (this._isConnectionAction(actionType)) {
            progressDelta = 0.08;
          }
          break;
        case 'recognition':
          if (this._isRecognitionAction(actionType)) {
            progressDelta = 0.08;
          }
          break;
      }

      if (progressDelta > 0) {
        const newProgress = Math.min(1.0, goal.progress + progressDelta);

        // Check if goal will be completed BEFORE updating progress
        const willComplete = newProgress >= 1.0 && !goal.completed;

        goalsComp.updateGoalProgress(goal.id, newProgress);

        // Check milestones
        this._checkMilestones(agentId, goal, goalsComp);

        // Emit goal completion event if just completed
        if (willComplete) {
          this.eventBus.emit({
            type: 'agent:goal_completed',
            source: this.id,
            data: {
              agentId,
              goalId: goal.id,
              category: goal.category,
              description: goal.description,
            },
          });
        }
      }
    }
  }

  /**
   * Check and update milestones
   */
  private _checkMilestones(
    agentId: string,
    goal: PersonalGoal,
    goalsComp: GoalsComponent
  ): void {
    for (let i = 0; i < goal.milestones.length; i++) {
      const milestone = goal.milestones[i];
      if (!milestone) continue;

      // Auto-complete milestones based on overall progress
      const milestoneThreshold = (i + 1) / goal.milestones.length;
      if (goal.progress >= milestoneThreshold && !milestone.completed) {
        goalsComp.completeMilestone(goal.id, i);

        this.eventBus.emit({
          type: 'agent:goal_milestone',
          source: this.id,
          data: {
            agentId,
            goalId: goal.id,
            milestoneIndex: i,
            description: milestone.description,
          },
        });
      }
    }
  }

  // Action type checkers
  private _isMasteryAction(actionType: string): boolean {
    return ['build', 'craft', 'till', 'plant', 'harvest', 'gather'].includes(actionType);
  }

  private _isSocialAction(actionType: string): boolean {
    return ['chat_idle', 'talk', 'help'].includes(actionType);
  }

  private _isCreativeAction(actionType: string): boolean {
    return ['build', 'craft'].includes(actionType);
  }

  private _isExplorationAction(actionType: string): boolean {
    return ['wander_aimlessly', 'observe', 'gather'].includes(actionType);
  }

  private _isSecurityAction(actionType: string): boolean {
    return ['build', 'gather', 'harvest'].includes(actionType);
  }

  private _isConnectionAction(actionType: string): boolean {
    return ['chat_idle', 'help', 'socialize'].includes(actionType);
  }

  private _isRecognitionAction(actionType: string): boolean {
    return ['build', 'teach', 'craft', 'help'].includes(actionType);
  }
}

/**
 * Standalone function to generate a personal goal based on personality and skills.
 * Used by tests and can be used by other systems that need to generate goals.
 */
let nextStandaloneGoalId = 0;

export function generatePersonalGoal(
  personality: PersonalityComponent | null,
  skills: Record<string, number>
): PersonalGoal {
  // CLAUDE.md compliance: No silent fallbacks
  if (!personality) {
    throw new Error('generatePersonalGoal missing required personality component');
  }

  // Select category based on personality weights
  // Higher weights ensure strong personality traits dominate goal selection
  const weights = {
    mastery: personality.conscientiousness * 5 + (personality.workEthic || 0.5),
    social: personality.extraversion * 5 + personality.agreeableness * 2,
    creative: (personality.creativity || 0.5) * 4 + personality.openness * 4,
    exploration: personality.openness * 5,
    security: personality.conscientiousness * 2 + (1 - (personality.neuroticism || 0.5)) * 2,
    connection: personality.agreeableness * 1.5 + Math.max(0, (1 - personality.extraversion) - 0.3) * 2,
    recognition: Math.max(0, (personality.neuroticism || 0.5) - 0.3) * 3 + (personality.leadership || 0.5) * 1.5,
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  let category: GoalCategory = 'mastery';
  for (const [cat, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      category = cat as GoalCategory;
      break;
    }
  }

  // Create goal based on category
  const goalData = createGoalForCategory(category, personality, skills);

  return {
    id: `goal-standalone-${nextStandaloneGoalId++}`,
    category,
    description: goalData.description,
    motivation: goalData.motivation,
    progress: 0,
    milestones: goalData.milestones || [],
    createdAt: Date.now(),
    targetCompletionDays: goalData.targetDays || 7,
  };
}

function createGoalForCategory(
  category: GoalCategory,
  personality: PersonalityComponent,
  skills: Record<string, number>
): {
  description: string;
  motivation: string;
  milestones?: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays?: number;
} {
  switch (category) {
    case 'mastery':
      return createMasteryGoal(personality, skills);
    case 'social':
      return createSocialGoal(personality);
    case 'creative':
      return createCreativeGoal(personality);
    case 'exploration':
      return createExplorationGoal(personality);
    case 'security':
      return createSecurityGoal(personality);
    case 'connection':
      return createConnectionGoal(personality);
    case 'recognition':
      return createRecognitionGoal(personality);
    default:
      return createMasteryGoal(personality, skills);
  }
}

function createMasteryGoal(
  _personality: PersonalityComponent,
  skills: Record<string, number>
): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  const skillTypes = ['building', 'farming', 'gathering', 'crafting'];

  // Choose skill based on current skill levels
  let chosenSkill = 'building';

  if (Object.keys(skills).length > 0) {
    // Find highest skill
    const sortedSkills = Object.entries(skills).sort((a, b) => b[1] - a[1]);
    const highestSkill = sortedSkills[0];

    if (highestSkill && highestSkill[1] > 0.5) {
      // Improve highest skill
      chosenSkill = highestSkill[0];
    } else {
      // Learn new skill (random low skill)
      const lowSkills = sortedSkills.filter(([_, level]) => level < 0.3);
      if (lowSkills.length > 0) {
        chosenSkill = lowSkills[Math.floor(Math.random() * lowSkills.length)]![0];
      }
    }
  } else {
    chosenSkill = skillTypes[Math.floor(Math.random() * skillTypes.length)]!;
  }

  const skillLabel = chosenSkill === 'building' ? 'builder' :
                     chosenSkill === 'farming' ? 'farmer' :
                     chosenSkill === 'gathering' ? 'gatherer' : 'crafter';

  return {
    description: `Become a skilled ${skillLabel}`,
    motivation: `I want to master the art of ${chosenSkill}`,
    milestones: [
      { description: `Practice ${chosenSkill} regularly`, completed: false, progress: 0 },
      { description: `Complete many ${chosenSkill} tasks`, completed: false, progress: 0 },
      { description: `Achieve excellence in ${chosenSkill}`, completed: false, progress: 0 },
    ],
    targetDays: Math.floor(7 + Math.random() * 14), // 7-21 days
  };
}

function createSocialGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Build strong friendships in the village',
    motivation: 'I value deep connections with others',
    milestones: [
      { description: 'Have meaningful conversations', completed: false, progress: 0 },
      { description: 'Help neighbors with their tasks', completed: false, progress: 0 },
      { description: 'Become a trusted member of the community', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(10 + Math.random() * 15), // 10-25 days
  };
}

function createCreativeGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Create something unique and beautiful',
    motivation: 'I want to express my creativity',
    milestones: [
      { description: 'Experiment with new designs', completed: false, progress: 0 },
      { description: 'Build an artistic structure', completed: false, progress: 0 },
      { description: 'Leave a creative mark on the village', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(7 + Math.random() * 14), // 7-21 days
  };
}

function createExplorationGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Discover new places and resources',
    motivation: 'I love exploring the unknown',
    milestones: [
      { description: 'Explore unexplored areas', completed: false, progress: 0 },
      { description: 'Find rare resources', completed: false, progress: 0 },
      { description: 'Map the entire region', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(5 + Math.random() * 10), // 5-15 days
  };
}

function createSecurityGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Ensure safety and resource security',
    motivation: 'I want to feel secure and prepared',
    milestones: [
      { description: 'Build a safe shelter', completed: false, progress: 0 },
      { description: 'Stockpile essential resources', completed: false, progress: 0 },
      { description: 'Create emergency reserves', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(10 + Math.random() * 20), // 10-30 days
  };
}

function createConnectionGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Form a deep bond with someone special',
    motivation: 'I want meaningful connections with people I trust',
    milestones: [
      { description: 'Find someone I connect with', completed: false, progress: 0 },
      { description: 'Share personal thoughts and feelings', completed: false, progress: 0 },
      { description: 'Build a lasting friendship or partnership', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(10 + Math.random() * 15), // 10-25 days
  };
}

function createRecognitionGoal(_personality: PersonalityComponent): {
  description: string;
  motivation: string;
  milestones: Array<{ description: string; completed: boolean; progress: number }>;
  targetDays: number;
} {
  return {
    description: 'Earn respect and recognition from others',
    motivation: 'I want to be valued for my contributions',
    milestones: [
      { description: 'Complete important tasks', completed: false, progress: 0 },
      { description: 'Help the community in visible ways', completed: false, progress: 0 },
      { description: 'Be known as someone reliable and skilled', completed: false, progress: 0 },
    ],
    targetDays: Math.floor(7 + Math.random() * 14), // 7-21 days
  };
}
