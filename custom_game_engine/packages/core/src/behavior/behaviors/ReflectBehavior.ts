/**
 * ReflectBehavior - Agent reflects on experiences and may form goals
 *
 * Part of the Idle Behaviors & Personal Goals system.
 * Agents review recent memories, generate internal monologue,
 * and potentially form personal goals based on personality.
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import type { PersonalityComponent } from '../../components/PersonalityComponent.js';
import type { GoalsComponent, GoalCategory, PersonalGoal } from '../../components/GoalsComponent.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * ReflectBehavior - Introspection and goal formation
 */
export class ReflectBehavior extends BaseBehavior {
  readonly name = 'idle' as const; // Maps to 'idle' for now, will be 'reflect' later

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Initialize reflection state
    if (!state.reflectionStarted) {
      this.updateState(entity, {
        reflectionStarted: true,
        reflectionStartTick: currentTick,
      });

      // Generate initial internal monologue
      const monologue = this.generateReflectionMonologue(entity, world);
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: monologue,
        behaviorState: {
          ...current.behaviorState,
          lastReflectionTick: currentTick,
        },
      }));

      // Emit internal monologue event
      world.eventBus.emit({
        type: 'agent:internal_monologue',
        source: 'reflect_behavior',
        data: {
          agentId: entity.id,
          behaviorType: 'reflect',
          monologue,
          timestamp: currentTick,
        },
      });

      // Attempt goal formation
      this.attemptGoalFormation(entity, world, currentTick);
    }

    // Reflect for ~10 seconds (200 ticks)
    const reflectionStartTick = state.reflectionStartTick as number;
    const ticksReflecting = currentTick - reflectionStartTick;

    if (ticksReflecting > 200) {
      // Reflection complete
      this.complete(entity);
      return { complete: true, reason: 'reflection_complete' };
    }
  }

  /**
   * Generate reflection monologue based on recent memories.
   */
  private generateReflectionMonologue(entity: EntityImpl, _world: World): string {
    const memory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

    if (!memory || memory.memories.length === 0) {
      return this.getDefaultReflection();
    }

    // Get strongest recent memories
    const recentMemories = memory.memories
      .filter(m => m.strength > 30)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3);

    if (recentMemories.length === 0) {
      return this.getDefaultReflection();
    }

    // Generate monologue based on memory types
    const memoryTypes = recentMemories.map(m => m.type);

    if (memoryTypes.includes('success')) {
      return 'Reflecting on recent accomplishments... I\'ve been making good progress.';
    }

    if (memoryTypes.includes('failure')) {
      return 'Thinking about what went wrong... How can I do better next time?';
    }

    if (memoryTypes.includes('knowledge')) {
      return 'Considering what I\'ve learned from others... There\'s so much to discover.';
    }

    if (memoryTypes.includes('resource_location')) {
      return 'Thinking about the resources I\'ve found... Planning where to go next.';
    }

    return 'Taking time to reflect on recent experiences...';
  }

  /**
   * Get default reflection when no memories available.
   */
  private getDefaultReflection(): string {
    const reflections = [
      'Taking a moment to think about my goals...',
      'Reflecting on what matters most to me.',
      'Considering what I want to achieve.',
      'Thinking about my purpose here.',
      'What do I want to accomplish?',
    ];

    return reflections[Math.floor(Math.random() * reflections.length)]!;
  }

  /**
   * Attempt to form a new personal goal (30% chance).
   */
  private attemptGoalFormation(entity: EntityImpl, world: World, currentTick: number): void {
    // Check if agent has goals component
    if (!entity.hasComponent(ComponentType.Goals)) {
      return; // No goals component - skip
    }

    const goals = entity.getComponent<GoalsComponent>(ComponentType.Goals);
    if (!goals) {
      return;
    }

    // Check if can form new goal
    if (!goals.canAddGoal()) {
      return; // At max goals
    }

    // 50% chance to form a goal during reflection
    if (Math.random() > 0.5) {
      return;
    }

    // Get personality
    const personality = entity.getComponent<PersonalityComponent>(ComponentType.Personality);
    if (!personality) {
      return; // Need personality to form goals
    }

    // Generate goal based on personality
    const goalTemplate = this.generatePersonalGoal(personality);

    // Create full goal with required fields
    const goal: PersonalGoal = {
      id: `goal_${currentTick}_${Math.random().toString(36).substring(7)}`,
      ...goalTemplate,
      progress: 0,
      milestones: [],
      createdAt: currentTick,
    };

    // Add goal to component
    try {
      goals.addGoal(goal);

      // Emit event for goal formation
      world.eventBus.emit({
        type: 'agent:goal_formed',
        source: entity.id,
        data: {
          agentId: entity.id,
          goalId: goal.id,
          category: goal.category,
          description: goal.description,
        },
      });
    } catch (error) {
      // Failed to add goal (likely at max) - that's OK
    }
  }

  /**
   * Generate a personal goal based on personality traits.
   */
  private generatePersonalGoal(personality: PersonalityComponent): Omit<import('../../components/GoalsComponent.js').PersonalGoal, 'id' | 'progress' | 'milestones' | 'createdAt' | 'lastProgress' | 'complete'> {
    // Calculate weights for each goal category based on personality
    const weights: Record<GoalCategory, number> = {
      mastery: 0,
      social: 0,
      creative: 0,
      exploration: 0,
      security: 0,
      connection: 0,
      recognition: 0,
    };

    // Mastery: conscientiousness + work ethic
    weights.mastery = personality.conscientiousness + personality.workEthic;

    // Social: extraversion + agreeableness
    weights.social = personality.extraversion + personality.agreeableness;

    // Creative: creativity + openness
    weights.creative = personality.creativity + personality.openness;

    // Exploration: openness + (100 - neuroticism)
    weights.exploration = personality.openness + (100 - personality.neuroticism);

    // Security: conscientiousness + neuroticism
    weights.security = personality.conscientiousness + personality.neuroticism;

    // Connection: agreeableness + generosity (deep bonds with specific individuals)
    weights.connection = personality.agreeableness + personality.generosity;

    // Recognition: leadership + extraversion (status, being valued)
    weights.recognition = personality.leadership + personality.extraversion;

    // Select category by weighted random
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    let selectedCategory: GoalCategory = 'mastery';

    for (const [category, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        selectedCategory = category as GoalCategory;
        break;
      }
    }

    // Generate goal for category
    return this.generateGoalForCategory(selectedCategory);
  }

  /**
   * Generate specific goal description for a category.
   */
  private generateGoalForCategory(category: GoalCategory): Omit<import('../../components/GoalsComponent.js').PersonalGoal, 'id' | 'progress' | 'milestones' | 'createdAt' | 'lastProgress' | 'complete'> {
    const goalTemplates: Record<GoalCategory, Array<{ description: string; motivation: string }>> = {
      mastery: [
        { description: 'Become a skilled builder', motivation: 'I want to create lasting structures for the community.' },
        { description: 'Master the art of farming', motivation: 'Growing food well will help everyone thrive.' },
        { description: 'Perfect my gathering skills', motivation: 'The better I am, the more I can provide.' },
        { description: 'Learn advanced crafting techniques', motivation: 'There\'s always more to learn and improve.' },
      ],
      social: [
        { description: 'Build strong friendships', motivation: 'Life is better when shared with others.' },
        { description: 'Help my neighbors regularly', motivation: 'We all need support sometimes.' },
        { description: 'Organize community gatherings', motivation: 'Bringing people together makes us stronger.' },
        { description: 'Be someone others can rely on', motivation: 'I want to be there when people need me.' },
      ],
      creative: [
        { description: 'Create something unique', motivation: 'I want to express myself in new ways.' },
        { description: 'Try new approaches to old problems', motivation: 'Innovation keeps life interesting.' },
        { description: 'Experiment with different crafts', motivation: 'There\'s beauty in discovering new techniques.' },
        { description: 'Design beautiful structures', motivation: 'Function and form should work together.' },
      ],
      exploration: [
        { description: 'Discover new areas', motivation: 'There\'s so much world left to see.' },
        { description: 'Map the surrounding region', motivation: 'Knowledge of the land helps everyone.' },
        { description: 'Find rare resources', motivation: 'Who knows what valuable things are out there?' },
        { description: 'Learn about the world\'s secrets', motivation: 'Every place has stories to tell.' },
      ],
      security: [
        { description: 'Build a safe home', motivation: 'Everyone needs a place to feel secure.' },
        { description: 'Stockpile essential resources', motivation: 'Being prepared prevents suffering.' },
        { description: 'Ensure reliable food supply', motivation: 'No one should go hungry.' },
        { description: 'Create shelter for others', motivation: 'Everyone deserves protection from the elements.' },
      ],
      connection: [
        { description: 'Form a deep bond with someone special', motivation: 'Meaningful relationships make life worth living.' },
        { description: 'Support a friend through hard times', motivation: 'True friends are there when it matters.' },
        { description: 'Spend quality time with loved ones', motivation: 'The best moments are shared with those we care about.' },
        { description: 'Build trust with a community member', motivation: 'Trust is the foundation of real connection.' },
      ],
      recognition: [
        { description: 'Become known for a valuable skill', motivation: 'I want my contributions to be recognized.' },
        { description: 'Lead a community initiative', motivation: 'Leadership is how I can make the biggest impact.' },
        { description: 'Earn respect from peers', motivation: 'Being valued by others gives my work meaning.' },
        { description: 'Establish a reputation for excellence', motivation: 'I want to be remembered for doing things well.' },
      ],
    };

    const templates = goalTemplates[category];
    const template = templates[Math.floor(Math.random() * templates.length)]!;

    return {
      category,
      description: template.description,
      motivation: template.motivation,
      targetCompletionDays: 30, // Default 30-day goal
    };
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 * @deprecated Use reflectBehaviorWithContext instead
 */
export function reflectBehavior(entity: EntityImpl, world: World): void {
  const behavior = new ReflectBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('reflect', reflectBehaviorWithContext);
 */
export function reflectBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  // Stop all movement
  ctx.stopMovement();

  const reflectionStarted = ctx.getState<boolean>('reflectionStarted');

  // Initialize reflection state
  if (!reflectionStarted) {
    ctx.updateState({
      reflectionStarted: true,
      reflectionStartTick: ctx.tick,
    });

    // Generate initial internal monologue
    const monologue = generateReflectionMonologue(ctx);
    ctx.setThought(monologue);
    ctx.updateState({ lastReflectionTick: ctx.tick });

    // Emit internal monologue event
    ctx.emit({
      type: 'agent:internal_monologue',
      source: 'reflect_behavior',
      data: {
        agentId: ctx.entity.id,
        behaviorType: 'reflect',
        monologue,
        timestamp: ctx.tick,
      },
    });

    // Attempt goal formation
    attemptGoalFormation(ctx);
  }

  // Reflect for ~10 seconds (200 ticks)
  const reflectionStartTick = ctx.getState<number>('reflectionStartTick')!;
  const ticksReflecting = ctx.tick - reflectionStartTick;

  if (ticksReflecting > 200) {
    // Reflection complete
    return ctx.complete('reflection_complete');
  }
}

/**
 * Generate reflection monologue based on recent memories.
 * Helper function for reflectBehaviorWithContext.
 */
function generateReflectionMonologue(ctx: import('../BehaviorContext.js').BehaviorContext): string {
  const memory = ctx.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

  if (!memory || memory.memories.length === 0) {
    return getDefaultReflection();
  }

  // Get strongest recent memories
  const recentMemories = memory.memories
    .filter(m => m.strength > 30)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  if (recentMemories.length === 0) {
    return getDefaultReflection();
  }

  // Generate monologue based on memory types
  const memoryTypes = recentMemories.map(m => m.type);

  if (memoryTypes.includes('success')) {
    return 'Reflecting on recent accomplishments... I\'ve been making good progress.';
  }

  if (memoryTypes.includes('failure')) {
    return 'Thinking about what went wrong... How can I do better next time?';
  }

  if (memoryTypes.includes('knowledge')) {
    return 'Considering what I\'ve learned from others... There\'s so much to discover.';
  }

  if (memoryTypes.includes('resource_location')) {
    return 'Thinking about the resources I\'ve found... Planning where to go next.';
  }

  return 'Taking time to reflect on recent experiences...';
}

/**
 * Get default reflection when no memories available.
 * Helper function for reflectBehaviorWithContext.
 */
function getDefaultReflection(): string {
  const reflections = [
    'Taking a moment to think about my goals...',
    'Reflecting on what matters most to me.',
    'Considering what I want to achieve.',
    'Thinking about my purpose here.',
    'What do I want to accomplish?',
  ];

  return reflections[Math.floor(Math.random() * reflections.length)]!;
}

/**
 * Attempt to form a new personal goal (30% chance).
 * Helper function for reflectBehaviorWithContext.
 */
function attemptGoalFormation(ctx: import('../BehaviorContext.js').BehaviorContext): void {
  // Check if agent has goals component
  if (!ctx.hasComponent(ComponentType.Goals)) {
    return; // No goals component - skip
  }

  const goals = ctx.getComponent<GoalsComponent>(ComponentType.Goals);
  if (!goals) {
    return;
  }

  // Check if can form new goal
  if (!goals.canAddGoal()) {
    return; // At max goals
  }

  // 50% chance to form a goal during reflection
  if (Math.random() > 0.5) {
    return;
  }

  // Get personality
  const personality = ctx.getComponent<PersonalityComponent>(ComponentType.Personality);
  if (!personality) {
    return; // Need personality to form goals
  }

  // Generate goal based on personality
  const goalTemplate = generatePersonalGoal(personality);

  // Create full goal with required fields
  const goal: PersonalGoal = {
    id: `goal_${ctx.tick}_${Math.random().toString(36).substring(7)}`,
    ...goalTemplate,
    progress: 0,
    milestones: [],
    createdAt: ctx.tick,
  };

  // Add goal to component
  try {
    goals.addGoal(goal);

    // Emit event for goal formation
    ctx.emit({
      type: 'agent:goal_formed',
      data: {
        agentId: ctx.entity.id,
        goalId: goal.id,
        category: goal.category,
        description: goal.description,
      },
    });
  } catch (error) {
    // Failed to add goal (likely at max) - that's OK
  }
}

/**
 * Generate a personal goal based on personality traits.
 * Helper function for reflectBehaviorWithContext.
 */
function generatePersonalGoal(personality: PersonalityComponent): Omit<PersonalGoal, 'id' | 'progress' | 'milestones' | 'createdAt' | 'lastProgress' | 'complete'> {
  // Calculate weights for each goal category based on personality
  const weights: Record<GoalCategory, number> = {
    mastery: 0,
    social: 0,
    creative: 0,
    exploration: 0,
    security: 0,
    connection: 0,
    recognition: 0,
  };

  // Mastery: conscientiousness + work ethic
  weights.mastery = personality.conscientiousness + personality.workEthic;

  // Social: extraversion + agreeableness
  weights.social = personality.extraversion + personality.agreeableness;

  // Creative: creativity + openness
  weights.creative = personality.creativity + personality.openness;

  // Exploration: openness + (100 - neuroticism)
  weights.exploration = personality.openness + (100 - personality.neuroticism);

  // Security: conscientiousness + neuroticism
  weights.security = personality.conscientiousness + personality.neuroticism;

  // Connection: agreeableness + generosity (deep bonds with specific individuals)
  weights.connection = personality.agreeableness + personality.generosity;

  // Recognition: leadership + extraversion (status, being valued)
  weights.recognition = personality.leadership + personality.extraversion;

  // Select category by weighted random
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  let selectedCategory: GoalCategory = 'mastery';

  for (const [category, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      selectedCategory = category as GoalCategory;
      break;
    }
  }

  // Generate goal for category
  return generateGoalForCategory(selectedCategory);
}

/**
 * Generate specific goal description for a category.
 * Helper function for reflectBehaviorWithContext.
 */
function generateGoalForCategory(category: GoalCategory): Omit<PersonalGoal, 'id' | 'progress' | 'milestones' | 'createdAt' | 'lastProgress' | 'complete'> {
  const goalTemplates: Record<GoalCategory, Array<{ description: string; motivation: string }>> = {
    mastery: [
      { description: 'Become a skilled builder', motivation: 'I want to create lasting structures for the community.' },
      { description: 'Master the art of farming', motivation: 'Growing food well will help everyone thrive.' },
      { description: 'Perfect my gathering skills', motivation: 'The better I am, the more I can provide.' },
      { description: 'Learn advanced crafting techniques', motivation: 'There\'s always more to learn and improve.' },
    ],
    social: [
      { description: 'Build strong friendships', motivation: 'Life is better when shared with others.' },
      { description: 'Help my neighbors regularly', motivation: 'We all need support sometimes.' },
      { description: 'Organize community gatherings', motivation: 'Bringing people together makes us stronger.' },
      { description: 'Be someone others can rely on', motivation: 'I want to be there when people need me.' },
    ],
    creative: [
      { description: 'Create something unique', motivation: 'I want to express myself in new ways.' },
      { description: 'Try new approaches to old problems', motivation: 'Innovation keeps life interesting.' },
      { description: 'Experiment with different crafts', motivation: 'There\'s beauty in discovering new techniques.' },
      { description: 'Design beautiful structures', motivation: 'Function and form should work together.' },
    ],
    exploration: [
      { description: 'Discover new areas', motivation: 'There\'s so much world left to see.' },
      { description: 'Map the surrounding region', motivation: 'Knowledge of the land helps everyone.' },
      { description: 'Find rare resources', motivation: 'Who knows what valuable things are out there?' },
      { description: 'Learn about the world\'s secrets', motivation: 'Every place has stories to tell.' },
    ],
    security: [
      { description: 'Build a safe home', motivation: 'Everyone needs a place to feel secure.' },
      { description: 'Stockpile essential resources', motivation: 'Being prepared prevents suffering.' },
      { description: 'Ensure reliable food supply', motivation: 'No one should go hungry.' },
      { description: 'Create shelter for others', motivation: 'Everyone deserves protection from the elements.' },
    ],
    connection: [
      { description: 'Form a deep bond with someone special', motivation: 'Meaningful relationships make life worth living.' },
      { description: 'Support a friend through hard times', motivation: 'True friends are there when it matters.' },
      { description: 'Spend quality time with loved ones', motivation: 'The best moments are shared with those we care about.' },
      { description: 'Build trust with a community member', motivation: 'Trust is the foundation of real connection.' },
    ],
    recognition: [
      { description: 'Become known for a valuable skill', motivation: 'I want my contributions to be recognized.' },
      { description: 'Lead a community initiative', motivation: 'Leadership is how I can make the biggest impact.' },
      { description: 'Earn respect from peers', motivation: 'Being valued by others gives my work meaning.' },
      { description: 'Establish a reputation for excellence', motivation: 'I want to be remembered for doing things well.' },
    ],
  };

  const templates = goalTemplates[category];
  const template = templates[Math.floor(Math.random() * templates.length)]!;

  return {
    category,
    description: template.description,
    motivation: template.motivation,
    targetCompletionDays: 30, // Default 30-day goal
  };
}
