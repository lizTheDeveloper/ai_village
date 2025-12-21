import type { Component } from '../ecs/Component.js';

export type AgentBehavior = 'wander' | 'idle' | 'follow' | 'flee' | 'seek_food';

export interface AgentComponent extends Component {
  type: 'agent';
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number; // How often to reconsider behavior (in ticks)
  lastThinkTick: number;
}

export function createAgentComponent(
  behavior: AgentBehavior = 'wander',
  thinkInterval: number = 20 // Think once per second at 20 TPS
): AgentComponent {
  return {
    type: 'agent',
    version: 1,
    behavior,
    behaviorState: {},
    thinkInterval,
    lastThinkTick: 0,
  };
}
