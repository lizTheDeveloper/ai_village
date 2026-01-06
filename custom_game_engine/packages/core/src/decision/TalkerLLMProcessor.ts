/**
 * TalkerLLMProcessor - Handles conversational LLM decision making for agents
 *
 * This processor manages the "Talker" layer of the three-layer LLM architecture:
 * - Layer 1: Autonomic (reflexes, no LLM)
 * - Layer 2: Talker (conversation, goals, social) ← THIS PROCESSOR
 * - Layer 3: Executor (task planning, multi-step actions)
 *
 * The Talker is responsible for:
 * - Setting strategic goals and priorities
 * - Social interactions and conversations
 * - Personality-driven decision making
 * - Fast, frequent calls (personality-driven cadence)
 *
 * Part of the conversation scheduler architecture (work-order: conversation-scheduler)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AgentComponent, AgentBehavior, StrategicPriorities } from '../components/AgentComponent.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Talker LLM decision result
 */
export interface TalkerDecisionResult {
  changed: boolean;
  behavior?: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  speaking?: string;
  thinking?: string;
  goalsChanged?: boolean;  // Did this call change goals/priorities?
  source: 'talker' | 'none';
}

/**
 * Custom LLM configuration for per-agent LLM settings
 */
export interface CustomLLMConfig {
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Interface for LLM decision queue
 */
export interface LLMDecisionQueue {
  getDecision(entityId: string, llmType?: 'talker' | 'executor'): string | null;
  requestDecision(entityId: string, prompt: string, customConfig?: CustomLLMConfig, llmType?: 'talker' | 'executor'): Promise<string>;
}

/**
 * Interface for prompt builder (Talker-specific)
 */
export interface TalkerPromptBuilder {
  buildTalkerPrompt(entity: Entity, world: World): string;
}

/**
 * Configuration for Talker LLM processor
 */
export interface TalkerProcessorConfig {
  enableTalker: boolean;           // Master toggle for Talker LLM
  highExtraversionThreshold: number;  // Extraversion > this = frequent talking
  lowExtraversionThreshold: number;   // Extraversion < this = rare talking
  extrovertTalkCadenceSec: number;    // Seconds between talks for extroverts
  introvertTalkCadenceSec: number;    // Seconds between talks for introverts
  conversationPriority: number;       // Priority when in active conversation
}

const DEFAULT_CONFIG: TalkerProcessorConfig = {
  enableTalker: true,
  highExtraversionThreshold: 0.6,
  lowExtraversionThreshold: 0.4,
  extrovertTalkCadenceSec: 30,   // Every 30 seconds
  introvertTalkCadenceSec: 120,  // Every 2 minutes
  conversationPriority: 8,       // High priority for active conversations
};

/**
 * Select a behavior based on strategic priorities.
 * Called after set_priorities to immediately act on those priorities.
 */
function selectBehaviorFromPriorities(
  priorities: StrategicPriorities,
  entity: EntityImpl,
  world: World,
  getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
): { behavior: AgentBehavior; behaviorState: Record<string, unknown> } | null {
  // Find the highest priority category
  const categories = [ComponentType.Building, 'gathering', 'farming', 'social', 'exploration'] as const;
  let highestPriority = 0;
  let highestCategory: string | null = null;

  for (const cat of categories) {
    const val = priorities[cat] ?? 0;
    if (val > highestPriority) {
      highestPriority = val;
      highestCategory = cat;
    }
  }

  if (!highestCategory || highestPriority <= 0) {
    return null;
  }

  // For social priority, select talk behavior
  if (highestCategory === 'social') {
    const nearbyAgents = getNearbyAgents(entity, world, 15);
    const availableAgents = nearbyAgents.filter(other => {
      const otherConv = other.components.get(ComponentType.Conversation) as { isActive?: boolean } | undefined;
      return !otherConv?.isActive;
    });
    if (availableAgents.length > 0) {
      const targetAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
      if (targetAgent) {
        return { behavior: 'talk', behaviorState: { partnerId: targetAgent.id } };
      }
    }
    // No one nearby, wander to find people
    return { behavior: 'wander', behaviorState: {} };
  }

  // For other priorities, let Executor handle them
  return null;
}

/**
 * TalkerLLMProcessor Class
 *
 * Handles conversational LLM decision making for agents.
 * This is the "Talker" layer - responsible for goals, priorities, and social interactions.
 *
 * Usage:
 * ```typescript
 * const processor = new TalkerLLMProcessor(llmQueue, promptBuilder);
 *
 * // In update loop for LLM agents
 * const result = processor.process(entity, world, agent);
 * if (result.goalsChanged) {
 *   // Talker changed goals - Executor should re-plan
 * }
 * ```
 */
export class TalkerLLMProcessor {
  private llmDecisionQueue: LLMDecisionQueue;
  private promptBuilder: TalkerPromptBuilder;
  private lastLLMRequestTime: Map<string, number> = new Map(); // Per-agent wall-clock time (ms)
  private llmRequestCooldownMs: number = 250; // Minimum ms between LLM requests (global rate limit)
  private lastGlobalRequestTime: number = 0;

  // Configurable settings
  private config: TalkerProcessorConfig = { ...DEFAULT_CONFIG };

  constructor(llmDecisionQueue: LLMDecisionQueue, promptBuilder: TalkerPromptBuilder) {
    this.llmDecisionQueue = llmDecisionQueue;
    this.promptBuilder = promptBuilder;
  }

  /**
   * Update configuration (called when settings change)
   */
  updateConfig(config: Partial<TalkerProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TalkerProcessorConfig {
    return { ...this.config };
  }

  /**
   * Check if agent should call Talker LLM (personality-driven).
   *
   * Talker calls are based on:
   * - Active conversation (high priority)
   * - Social needs (medium priority)
   * - Personality (extraversion)
   * - Time since last talk
   */
  shouldCallTalker(entity: EntityImpl, agent: AgentComponent): boolean {
    // Master toggle - if Talker disabled, never call
    if (!this.config.enableTalker) {
      return false;
    }

    const now = Date.now();
    const lastCallTime = this.lastLLMRequestTime.get(entity.id) || 0;
    const secondsSinceLastCall = (now - lastCallTime) / 1000;

    // Get personality and needs
    const personality = entity.components.get(ComponentType.Personality) as { extraversion?: number } | undefined;
    const needs = entity.components.get(ComponentType.Needs) as { social?: number; socialDepth?: number } | undefined;
    const conversation = entity.components.get(ComponentType.Conversation) as { isActive?: boolean } | undefined;

    const extraversion = personality?.extraversion ?? 0.5;

    // 1. In active conversation - high priority, call frequently
    if (conversation?.isActive) {
      // Call every 10 seconds during conversation
      return secondsSinceLastCall >= 10;
    }

    // 2. Social depth need is critical (<0.3)
    if (needs?.socialDepth !== undefined && needs.socialDepth < 0.3) {
      // Craving deep conversation
      return secondsSinceLastCall >= 15;
    }

    // 3. Personality-driven cadence
    if (extraversion > this.config.highExtraversionThreshold) {
      // Extrovert - talk frequently
      return secondsSinceLastCall >= this.config.extrovertTalkCadenceSec;
    } else if (extraversion < this.config.lowExtraversionThreshold) {
      // Introvert - talk rarely
      return secondsSinceLastCall >= this.config.introvertTalkCadenceSec;
    } else {
      // Moderate - talk occasionally
      return secondsSinceLastCall >= 60;
    }
  }

  /**
   * Process Talker LLM decision for an entity.
   */
  process(
    entity: EntityImpl,
    world: World,
    agent: AgentComponent,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): TalkerDecisionResult {
    // Check for ready decision
    const decision = this.llmDecisionQueue.getDecision(entity.id, 'talker');
    if (decision) {
      return this.processDecision(entity, world, decision, getNearbyAgents);
    }

    // Check if we should call Talker LLM
    if (this.shouldCallTalker(entity, agent)) {
      const now = Date.now();

      // Check global rate limiting to prevent thundering herd
      const msSinceGlobalRequest = now - this.lastGlobalRequestTime;
      if (msSinceGlobalRequest >= this.llmRequestCooldownMs) {
        // Request new decision using Talker-specific prompt
        const prompt = this.promptBuilder.buildTalkerPrompt(entity, world);

        // Emit LLM request event
        world.eventBus.emit({
          type: 'llm:request',
          source: entity.id,
          data: {
            agentId: entity.id,
            promptLength: prompt.length,
            reason: 'talker',
            llmType: 'talker',
          },
        });

        // Request decision with 'talker' type
        this.llmDecisionQueue.requestDecision(entity.id, prompt, agent.customLLM, 'talker').catch((err: Error) => {
          console.error(`[TalkerLLMProcessor] Talker LLM failed for ${entity.id}:`, err);

          // Emit llm:error event
          world.eventBus.emit({
            type: 'llm:error',
            source: entity.id,
            data: {
              agentId: entity.id,
              error: err.message.slice(0, 200),
              errorType: 'talker_error',
            },
          });
        });

        // Update timestamps
        this.lastLLMRequestTime.set(entity.id, now);
        this.lastGlobalRequestTime = now;
      }
    }

    return { changed: false, source: 'none' };
  }

  /**
   * Process a Talker LLM decision response.
   *
   * Talker handles:
   * - set_personal_goal
   * - set_medium_term_goal
   * - set_group_goal
   * - set_priorities
   * - talk actions
   * - follow actions
   */
  private processDecision(
    entity: EntityImpl,
    world: World,
    decision: string,
    getNearbyAgents: (entity: EntityImpl, world: World, range: number) => Entity[]
  ): TalkerDecisionResult {
    // Parse JSON response
    let parsedResponse: {
      action?: unknown;
      speaking?: string;
      thinking?: string;
    } | null = null;

    try {
      parsedResponse = JSON.parse(decision);
    } catch {
      // Not JSON - ignore (Talker expects structured responses)
      return { changed: false, source: 'talker' };
    }

    if (!parsedResponse || !parsedResponse.action) {
      return { changed: false, source: 'talker' };
    }

    const action = parsedResponse.action;
    const speaking = parsedResponse.speaking || undefined;
    const thinking = parsedResponse.thinking || undefined;

    // Handle goal-setting and priority-setting actions
    if (typeof action === 'object' && action !== null && !Array.isArray(action) && 'type' in action) {
      const typedAction = action as { type: string; goal?: string; priorities?: StrategicPriorities };

      // Set personal goal
      if (typedAction.type === 'set_personal_goal' && typedAction.goal) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          personalGoal: typedAction.goal,
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'set_personal_goal',
            behavior: 'set_personal_goal',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return { changed: true, goalsChanged: true, speaking, thinking, source: 'talker' };
      }

      // Set medium-term goal
      if (typedAction.type === 'set_medium_term_goal' && typedAction.goal) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          mediumTermGoal: typedAction.goal,
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'set_medium_term_goal',
            behavior: 'set_medium_term_goal',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return { changed: true, goalsChanged: true, speaking, thinking, source: 'talker' };
      }

      // Set group goal
      if (typedAction.type === 'set_group_goal' && typedAction.goal) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          groupGoal: typedAction.goal,
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'set_group_goal',
            behavior: 'set_group_goal',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return { changed: true, goalsChanged: true, speaking, thinking, source: 'talker' };
      }

      // Set priorities
      if (typedAction.type === 'set_priorities' && typedAction.priorities) {
        const priorities = typedAction.priorities as StrategicPriorities;

        // Select behavior based on priorities (if social is highest)
        const selectedBehavior = selectBehaviorFromPriorities(priorities, entity, world, getNearbyAgents);

        if (selectedBehavior) {
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            priorities,
            behavior: selectedBehavior.behavior,
            behaviorState: selectedBehavior.behaviorState,
            recentSpeech: speaking,
            lastThought: thinking,
          }));

          world.eventBus.emit({
            type: 'llm:decision',
            source: entity.id,
            data: {
              agentId: entity.id,
              decision: 'set_priorities',
              behavior: selectedBehavior.behavior,
              reasoning: thinking,
              source: 'talker',
            },
          });

          return {
            changed: true,
            goalsChanged: true,
            behavior: selectedBehavior.behavior,
            behaviorState: selectedBehavior.behaviorState,
            speaking,
            thinking,
            source: 'talker',
          };
        }

        // Just set priorities without changing behavior (let Executor handle)
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          priorities,
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'set_priorities',
            behavior: 'set_priorities',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return { changed: true, goalsChanged: true, speaking, thinking, source: 'talker' };
      }

      // Handle social actions (talk, follow)
      if (typedAction.type === 'talk') {
        const talkAction = typedAction as { type: string; target?: string };
        const partnerId = talkAction.target || 'nearest';

        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'talk',
          behaviorState: { partnerId },
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'talk',
            behavior: 'talk',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return {
          changed: true,
          behavior: 'talk',
          behaviorState: { partnerId },
          speaking,
          thinking,
          source: 'talker',
        };
      }

      if (typedAction.type === 'follow') {
        const followAction = typedAction as { type: string; target?: string };
        const targetId = followAction.target || 'nearest';

        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'follow_agent',
          behaviorState: { targetId },
          recentSpeech: speaking,
          lastThought: thinking,
        }));

        world.eventBus.emit({
          type: 'llm:decision',
          source: entity.id,
          data: {
            agentId: entity.id,
            decision: 'follow',
            behavior: 'follow_agent',
            reasoning: thinking,
            source: 'talker',
          },
        });

        return {
          changed: true,
          behavior: 'follow_agent',
          behaviorState: { targetId },
          speaking,
          thinking,
          source: 'talker',
        };
      }
    }

    // No recognized action - just store speech/thinking
    if (speaking || thinking) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        recentSpeech: speaking,
        lastThought: thinking,
      }));
    }

    return { changed: false, speaking, thinking, source: 'talker' };
  }
}
