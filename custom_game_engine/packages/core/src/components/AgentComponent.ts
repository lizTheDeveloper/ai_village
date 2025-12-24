import type { Component } from '../ecs/Component.js';

export type AgentBehavior =
  | 'wander'
  | 'idle'
  | 'follow'
  | 'flee'
  | 'seek_food'
  | 'follow_agent'
  | 'talk'
  | 'gather'
  | 'explore'
  | 'approach'
  | 'observe'
  | 'rest'
  | 'work'
  | 'help'
  | 'build'
  | 'eat'
  | 'seek_sleep'
  | 'forced_sleep'
  | 'flee_danger'
  | 'seek_water'
  | 'seek_shelter'
  | 'deposit_items'
  | 'seek_warmth'
  | 'call_meeting'
  | 'attend_meeting';

export interface SpeechHistoryEntry {
  text: string;
  tick: number;
}

export interface AgentComponent extends Component {
  type: 'agent';
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number; // How often to reconsider behavior (in ticks)
  lastThinkTick: number;
  useLLM: boolean; // Whether to use LLM for decision making
  llmCooldown: number; // Ticks remaining before next LLM call
  recentSpeech?: string; // What the agent recently said (for nearby agents to hear)
  lastThought?: string; // The agent's most recent internal thought/reasoning
  speechHistory?: SpeechHistoryEntry[]; // History of what the agent has said
}

export function createAgentComponent(
  behavior: AgentBehavior = 'wander',
  thinkInterval: number = 20, // Think once per second at 20 TPS
  useLLM: boolean = false, // Whether to use LLM for decisions
  thinkOffset: number = 0 // Initial offset to stagger agent thinking (prevents thundering herd)
): AgentComponent {
  return {
    type: 'agent',
    version: 1,
    behavior,
    behaviorState: {},
    thinkInterval,
    lastThinkTick: -thinkOffset, // Negative offset means they'll think at different times
    useLLM,
    llmCooldown: 0,
  };
}
