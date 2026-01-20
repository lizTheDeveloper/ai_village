/**
 * Agent-related events.
 * Covers agent state, actions, needs, body modifications, and behaviors.
 */
import type { EntityId } from '../../types.js';

/**
 * Agent events.
 */
export interface AgentEvents {
  // === Agent Action Events ===
  'agent:action:started': {
    actionId: string;
    actionType: string;
  };
  'agent:action:completed': {
    actionId: string;
    actionType: string;
    agentId?: string;
    success?: boolean;
    result?: unknown;
    reason?: string;
  };
  'agent:action:failed': {
    actionId: string;
    actionType: string;
    reason: string;
  };
  'agent:queue:completed': {
    agentId: EntityId;
  };
  'agent:queue:interrupted': {
    agentId: EntityId;
    reason: string;
    interruptedBy?: string;
  };
  'agent:queue:resumed': {
    agentId: EntityId;
    resumedAt?: number;
  };

  // === Agent State Events ===
  'agent:idle': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
    location?: { x: number; y: number };
  };
  'agent:sleeping': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
    location?: { x: number; y: number };
  };
  'agent:sleep_start': {
    agentId: EntityId;
    entityId?: EntityId;
    timestamp?: number;
  };
  'agent:woke': {
    agentId: EntityId;
    timestamp?: number;
  };
  'agent:dreamed': {
    agentId: EntityId;
    dreamContent?: string;
    entityId?: EntityId;
  };
  'agent:ate': {
    agentId: EntityId;
    foodType: string;
    hungerRestored: number;
    amount?: number;
    storageId?: EntityId;
    fromStorage?: boolean;
    fromPlant?: EntityId;
    /** Food quality for mood system (0-100) */
    quality?: number;
    /** Flavor profile for preference system */
    flavors?: ('sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami')[];
  };
  'agent:collapsed': {
    agentId: EntityId;
    reason: 'exhaustion' | 'starvation' | 'temperature';
    entityId?: EntityId;
  };
  'agent:starved': {
    agentId: EntityId;
    survivalRelevance?: number;
  };
  'agent:health_critical': {
    agentId: EntityId;
    health: number;
    entityId?: EntityId;
  };
  'agent:unconscious': {
    entityId: EntityId;
  };
  'agent:regained_consciousness': {
    entityId: EntityId;
  };
  'agent:harvested': {
    agentId: EntityId;
    plantId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    harvested: Array<{ itemId: string; amount: number }>;
    resourceId?: EntityId;
  };
  'agent:broadcast': {
    agentId: EntityId;
    message: string;
    recipients?: EntityId[];
    tick?: number;
  };
  'agent:tamed_animal': {
    agentId: EntityId;
    animalId: EntityId;
    speciesId: string;
    method: string;
  };
  'agent:reached_home': {
    agentId: EntityId;
    bedId: EntityId;
    timestamp: number;
  };
  'agent:housed_animal': {
    agentId: EntityId;
    animalId: EntityId;
    speciesId: string;
    housingId: EntityId;
    housingType: string;
  };
  'agent:birth': {
    agentId: EntityId;
    name: string;
    useLLM: boolean;
    generation: number;
    parents: [string, string] | null;
    initialStats: {
      health: number;
      hunger: number;
      energy: number;
    };
  };
  'agent:llm_context': {
    agentId: EntityId;
    agentName?: string;
    context: string;
    tick: number;
    // Live state snapshot
    behavior?: string;
    behaviorState?: Record<string, unknown>;
    priorities?: Record<string, number>;
    plannedBuilds?: Array<{ buildingType: string; position?: { x: number; y: number } }>;
    position?: { x: number; y: number };
    needs?: { hunger?: number; energy?: number; social?: number };
    inventory?: Array<{ item: string; qty: number }>;
    // Skills snapshot
    skills?: Record<string, number>;  // e.g. { building: 2, farming: 1, gathering: 3 }
    personalGoal?: string;
    mediumTermGoal?: string;
    groupGoal?: string;
    lastThought?: string;
    recentSpeech?: string;
    llmLayer?: 'executor' | 'talker';
  };
  'agent:goal_formed': {
    agentId: EntityId;
    goalId: string;
    category: string;
    description: string;
  };
  'agent:goal_milestone': {
    agentId: EntityId;
    goalId: string;
    milestoneIndex: number;
    description: string;
  };
  'agent:goal_completed': {
    agentId: EntityId;
    goalId: string;
    category: string;
    description: string;
  };
  'agent:internal_monologue': {
    agentId: EntityId;
    behaviorType: string;
    monologue: string;
    timestamp: number;
  };
  'agent:speak': {
    agentId: string;
    text: string;
    category: 'prayer' | 'conversation' | 'monologue' | 'announcement';
    tick: number;
  };
  'agent:meditation_started': {
    agentId: EntityId;
    position?: { x: number; y: number };
  };
  'agent:meditation_complete': {
    agentId: EntityId;
    visionReceived: boolean;
    duration: number;
  };
  'agent:died': {
    entityId: string;
    name: string;
    causeOfDeath: string;
    /** Which realm the soul was routed to */
    destinationRealm: string;
    /** Why this realm was chosen (deity_afterlife, no_deity, etc.) */
    routingReason: string;
    /** Deity ID if routing was based on deity worship */
    routingDeity?: string;
  };
  'agent:resurrected': {
    entityId: string;
    psychopompName: string;
    conditions?: unknown;
  };
  'agent:born': {
    agentId: string;
    agentName?: string;
    parentIds?: string[];
  };
  'agent:death': {
    agentId: EntityId;
    agentName?: string;
    cause?: string;
    position?: { x: number; y: number };
    tick?: number;
  };
  'agent:xp_gained': {
    agentId: string;
    skill: string;
    xp: number;
    source?: string;
  };
  'agent:emotion_peak': {
    agentId: string;
    emotion: string;
    intensity: number;
  };
  'agent:age_milestone': {
    agentId: string;
    oldCategory?: 'child' | 'teen' | 'adult' | 'elder';
    newCategory: 'child' | 'teen' | 'adult' | 'elder';
    ageYears: number;
    tick: number;
  };

  // === Agent Behavior Events ===
  'behavior:change': {
    agentId: EntityId;
    from: string;
    to: string;
    reason?: string;
    layer?: string; // Which LLM layer made this decision (autonomic, talker, executor)
  };
  'behavior:goal_achieved': {
    agentId: EntityId;
    behavior: string;
    goalType?: string;
    summary?: string;
    resourcesGathered?: Record<string, number>;
    itemsCrafted?: Array<{ itemId: string; amount: number }>;
  };

  // === Need Events ===
  'need:critical': {
    agentId: EntityId;
    entityId?: EntityId;
    needType: 'hunger' | 'energy' | 'health';
    value: number;
    survivalRelevance?: number;
  };
  'need:starvation_day': {
    agentId: EntityId;
    dayNumber: number;
    survivalRelevance?: number;
  };

  // === Body Modification Events ===
  'body:modifications_expired': {
    entityId: EntityId;
    modificationIds: string[];
  };
}

export type AgentEventType = keyof AgentEvents;
export type AgentEventData = AgentEvents[AgentEventType];
