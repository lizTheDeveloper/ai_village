/**
 * Centralized behavior-related type definitions
 */

export type IdleBehaviorType =
  | 'reflect'
  | 'chat_idle'
  | 'amuse_self'
  | 'observe'
  | 'sit_quietly'
  | 'practice_skill'
  | 'wander_aimlessly';

export type SteeringBehavior = 'seek' | 'arrive' | 'obstacle_avoidance' | 'wander' | 'combined' | 'none';

export type CraftPhase = 'find_station' | 'move_to_station' | 'crafting' | 'complete';

export type TradePhase = 'find_shop' | 'move_to_shop' | 'trading' | 'complete';

export type ExplorationMode = 'frontier' | 'spiral' | 'none';

export type SpiralDirection = 'right' | 'down' | 'left' | 'up';

export type DecisionSource = 'autonomic' | 'llm' | 'scripted' | 'queue' | 'fallback' | 'none';
