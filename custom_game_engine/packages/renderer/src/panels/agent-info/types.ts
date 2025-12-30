/**
 * Shared types and interfaces for AgentInfoPanel sections.
 */

import type {
  Entity,
  IdentityComponent,
  EpisodicMemoryComponent,
  SemanticMemoryComponent,
  SocialMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  GoalsComponent,
} from '@ai-village/core';

export type AgentInfoTab = 'info' | 'stats' | 'skills' | 'inventory' | 'memories' | 'context' | 'priorities';

/**
 * Render context passed to each section.
 */
export interface SectionRenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
  lineHeight: number;
}

/**
 * Agent component type used in the panel.
 */
export interface AgentComponentData {
  behavior: string;
  useLLM: boolean;
  customLLM?: {
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    customHeaders?: Record<string, string>;
  };
  recentSpeech?: string;
  lastThought?: string;
  speechHistory?: Array<{ text: string; tick: number }>;
  personalGoal?: string;
  mediumTermGoal?: string;
  groupGoal?: string;
  behaviorQueue?: Array<{
    behavior: string;
    priority: string;
    repeats?: number;
    currentRepeat?: number;
    label?: string;
  }>;
  currentQueueIndex?: number;
  queuePaused?: boolean;
  queueInterruptedBy?: string;
  priorities?: {
    gathering?: number;
    building?: number;
    farming?: number;
    social?: number;
    exploration?: number;
    rest?: number;
  };
  plannedBuilds?: Array<{
    buildingType: string;
    position: { x: number; y: number };
    priority: 'low' | 'normal' | 'high';
    createdAt: number;
    reason?: string;
  }>;
}

/**
 * Inventory component type used in the panel.
 */
export interface InventoryComponentData {
  slots: Array<{ itemId: string | null; quantity: number }>;
  maxSlots: number;
  maxWeight: number;
  currentWeight: number;
}

/**
 * Position component type.
 */
export interface PositionComponentData {
  x: number;
  y: number;
}

/**
 * Temperature component type.
 */
export interface TemperatureComponentData {
  currentTemp: number;
  state: string;
}

/**
 * Movement component type.
 */
export interface MovementComponentData {
  velocityX: number;
  velocityY: number;
  speed: number;
}

/**
 * Needs component type.
 */
export interface NeedsComponentData {
  hunger: number;
  energy: number;
  health: number;
}

/**
 * Gathering stats component type.
 */
export interface GatheringStatsComponentData {
  today: Record<string, number>;
  allTime: Record<string, number>;
  depositedToday: Record<string, number>;
  depositedAllTime: Record<string, number>;
}

/**
 * Skills component type.
 */
export interface SkillsComponentData {
  levels: Record<string, number>;
  experience: Record<string, number>;
  totalExperience: Record<string, number>;
  affinities: Record<string, number>;
}

/**
 * Personality component type.
 */
export interface PersonalityComponentData {
  // Big Five traits (0-100)
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  // Game-specific traits (0-100)
  workEthic: number;
  creativity: number;
  generosity: number;
  leadership: number;
}

// Re-export core types for convenience
export type {
  Entity,
  IdentityComponent,
  EpisodicMemoryComponent,
  SemanticMemoryComponent,
  SocialMemoryComponent,
  ReflectionComponent,
  JournalComponent,
  GoalsComponent,
};
