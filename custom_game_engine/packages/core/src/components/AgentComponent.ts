import type { Component } from '../ecs/Component.js';

export type AgentBehavior = 'wander' | 'idle' | 'follow' | 'flee' | 'seek_food' | 'follow_agent' | 'talk';

export interface AgentComponent extends Component {
  type: 'agent';
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number; // How often to reconsider behavior (in ticks)
  lastThinkTick: number;
  useLLM: boolean; // Whether to use LLM for decision making
  llmCooldown: number; // Ticks remaining before next LLM call
}

export function createAgentComponent(
  behavior: AgentBehavior = 'wander',
  thinkInterval: number = 20, // Think once per second at 20 TPS
  useLLM: boolean = false // Whether to use LLM for decisions
): AgentComponent {
  return {
    type: 'agent',
    version: 1,
    behavior,
    behaviorState: {},
    thinkInterval,
    lastThinkTick: 0,
    useLLM,
    llmCooldown: 0,
  };
}
