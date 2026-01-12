import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { AgentComponent } from '@ai-village/core';

/**
 * AgentSchema - Introspection schema for AgentComponent
 *
 * Central agent component tracking behavior, state, and decision-making.
 * Core to all agent AI systems.
 */
export const AgentSchema = autoRegister(
  defineComponent<AgentComponent>({
    type: 'agent',
    version: 1,
    category: 'agent',

    fields: {
      behavior: {
        type: 'enum',
        enumValues: [
          'wander', 'idle', 'follow', 'flee', 'talk', 'pick', 'explore',
          'approach', 'observe', 'rest', 'work', 'help', 'build', 'craft',
          'eat', 'seek_sleep', 'forced_sleep', 'flee_danger', 'seek_water',
          'seek_shelter', 'deposit_items', 'farm', 'plant', 'water',
          'navigate', 'tame_animal', 'trade', 'cast_spell', 'pray',
          'player_controlled'
        ] as const,
        required: true,
        default: 'wander',
        description: 'Current behavior being executed',
        displayName: 'Behavior',
        visibility: {
          player: true,  // Show what the agent is doing
          llm: true,     // LLM needs to know current behavior
          agent: true,   // Agent knows what they're doing
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'state',
          order: 1,
        },
        mutable: true,
      },

      behaviorState: {
        type: 'object',
        required: true,
        default: {},
        description: 'Behavior-specific state data',
        visibility: {
          player: false,
          llm: false,  // Too low-level for LLM
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'debug',
          order: 20,
        },
      },

      useLLM: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Whether agent uses LLM for decision making',
        displayName: 'AI-Powered',
        visibility: {
          player: true,  // Players want to know if agent is AI-powered
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'config',
          order: 2,
        },
        mutable: true,
      },

      tier: {
        type: 'enum',
        enumValues: ['full', 'reduced', 'autonomic'] as const,
        required: false,
        description: 'Agent thinking tier (full/reduced/autonomic)',
        displayName: 'AI Tier',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'dropdown',
          group: 'config',
          order: 3,
        },
        mutable: true,
      },

      lastThought: {
        type: 'string',
        required: false,
        description: 'Most recent internal thought/reasoning',
        displayName: 'Last Thought',
        visibility: {
          player: true,  // Show agent's thoughts to player
          llm: false,    // NEVER show to LLM - causes metacognitive pollution
          agent: false,  // Don't reflect on previous AI's chain-of-thought
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'thoughts',
          order: 4,
        },
      },

      personalGoal: {
        type: 'string',
        required: false,
        description: 'Short-term personal goal',
        displayName: 'Personal Goal',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'goals',
          order: 5,
        },
        mutable: true,
      },

      mediumTermGoal: {
        type: 'string',
        required: false,
        description: 'Medium-term personal goal',
        displayName: 'Medium Goal',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'goals',
          order: 6,
        },
        mutable: true,
      },

      priorities: {
        type: 'object',
        required: false,
        description: 'Strategic priorities for behavior selection',
        visibility: {
          player: false,
          llm: true,  // LLM should know agent's priorities
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'priorities',
          order: 7,
        },
        mutable: true,
      },

      assignedBed: {
        type: 'string',
        required: false,
        description: 'Entity ID of assigned bed',
        displayName: 'Assigned Bed',
        visibility: {
          player: true,
          llm: false,  // Not needed in LLM context
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'assignments',
          order: 8,
        },
      },

      // Behavior Queue System - exposed for dev tools
      behaviorQueue: {
        type: 'array',
        itemType: 'object',
        required: false,
        description: 'Queue of behaviors to execute sequentially',
        displayName: 'Behavior Queue',
        visibility: {
          player: true,  // Players can see queued actions
          llm: true,     // LLM should know what's queued
          agent: true,   // Agent knows their queue
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'queue',
          order: 10,
        },
        mutable: true,
      },

      currentQueueIndex: {
        type: 'number',
        required: false,
        description: 'Index of currently executing queued behavior',
        displayName: 'Queue Index',
        visibility: {
          player: false,
          llm: false,
          agent: false,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'number',
          group: 'queue',
          order: 11,
        },
      },

      queuePaused: {
        type: 'boolean',
        required: false,
        description: 'Whether queue processing is paused',
        displayName: 'Queue Paused',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'queue',
          order: 12,
        },
        mutable: true,
      },

      queueInterruptedBy: {
        type: 'string',
        required: false,
        description: 'Behavior that interrupted the queue',
        displayName: 'Interrupted By',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'queue',
          order: 13,
        },
      },

      // Planned Builds
      plannedBuilds: {
        type: 'array',
        itemType: 'object',
        required: false,
        description: 'Buildings the agent intends to construct',
        displayName: 'Planned Builds',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'planning',
          order: 14,
        },
        mutable: true,
      },

      // Governance & Social Hierarchy
      titles: {
        type: 'array',
        itemType: 'string',
        required: false,
        description: 'Noble/leadership titles this agent holds',
        displayName: 'Titles',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'governance',
          order: 15,
        },
        mutable: true,
      },

      allegiance: {
        type: 'string',
        required: false,
        description: 'Entity ID of noble/leader this agent serves',
        displayName: 'Allegiance',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'text',
          group: 'governance',
          order: 16,
        },
        mutable: true,
      },

      guilds: {
        type: 'array',
        itemType: 'string',
        required: false,
        description: 'Guild memberships',
        displayName: 'Guilds',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'governance',
          order: 17,
        },
        mutable: true,
      },

      activeMandates: {
        type: 'array',
        itemType: 'object',
        required: false,
        description: 'Active mandates this agent must fulfill',
        displayName: 'Active Mandates',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: false,
          dev: true,
        },
        ui: {
          widget: 'json',
          group: 'governance',
          order: 18,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '🤖',
      color: '#FF9800',
      priority: 1,  // Highest priority - core component
    },

    llm: {
      promptSection: 'Agent State',
      summarize: (data: AgentComponent) => {
        const parts: string[] = [];

        // Current activity (behavior)
        parts.push(`Behavior: ${data.behavior}`);

        // Goals
        if (data.personalGoal) {
          parts.push(`Personal goal: ${data.personalGoal}`);
        }
        if (data.mediumTermGoal) {
          parts.push(`Medium-term goal: ${data.mediumTermGoal}`);
        }

        // NOTE: lastThought is NOT included - it causes metacognitive pollution
        // (previous AI's chain-of-thought leaking into next AI call)

        return parts.join('. ');
      },
      priority: 1,  // Include early in LLM context
    },

    validate: (data: unknown): data is AgentComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const comp = data as any;
      return (
        comp.type === 'agent' &&
        typeof comp.behavior === 'string' &&
        typeof comp.behaviorState === 'object' &&
        typeof comp.thinkInterval === 'number' &&
        typeof comp.lastThinkTick === 'number' &&
        typeof comp.useLLM === 'boolean' &&
        typeof comp.llmCooldown === 'number'
      );
    },

    createDefault: () => ({
      type: 'agent',
      version: 1,
      behavior: 'wander',
      behaviorState: {},
      thinkInterval: 20,
      lastThinkTick: 0,
      useLLM: false,
      llmCooldown: 0,
    } as AgentComponent),
  })
);
