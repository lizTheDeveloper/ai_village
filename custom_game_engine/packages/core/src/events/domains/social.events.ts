/**
 * Social interaction events.
 * Covers conversations, relationships, courtship, parenting.
 */
import type { EntityId } from '../../types.js';

export interface SocialEvents {
  'relationship:improved': {
    targetAgent: string;
    reason: string;
    amount: number;
  };
  'friendship:formed': {
    agent1: EntityId;
    agent2: EntityId;
    agent1Name: string;
    agent2Name: string;
  };

  'conversation:started': {
    participants: EntityId[];
    initiator: EntityId;
    agent1?: EntityId;
    agent2?: EntityId;
  };
  'conversation:utterance': {
    conversationId: string;
    speaker: EntityId;
    speakerId?: EntityId;
    listenerId?: EntityId;
    message: string;
    /** Alien translation of the message (if speaker has a native language) */
    alienMessage?: string;
  };
  'conversation:ended': {
    conversationId: string;
    participants: EntityId[];
    duration: number;
    agent1?: EntityId;
    agent2?: EntityId;
    /** Topics discussed in this conversation (Deep Conversation System) */
    topics?: string[];
    /** Conversation depth 0-1 (Deep Conversation System) */
    depth?: number;
    /** Message count in this conversation */
    messageCount?: number;
    /** Overall quality score 0-1 (Deep Conversation System) */
    quality?: number;
  };
  /** An agent joined an ongoing conversation */
  'conversation:joined': {
    conversationId: string;
    joinerId: EntityId;
    participants: EntityId[];
  };
  /** A topic was shared during conversation (Deep Conversation System) */
  'conversation:topic_shared': {
    speakerId: EntityId;
    listenerId: EntityId;
    topic: string;
    conversationId?: string;
  };
  /** Social fatigue threshold exceeded - agent wants to leave conversation */
  'conversation:fatigue_threshold_exceeded': {
    agentId: EntityId;
    fatigue: number;
    threshold: number;
    extraversion: number;
  };

  'trust:verified': {
    trusterId: EntityId;
    trusteeId: EntityId;
    informationType: string;
    claimantId?: EntityId;
    verifierId?: EntityId;
    result?: string;
  };
  'trust:violated': {
    trusterId: EntityId;
    trusteeId: EntityId;
    informationType: string;
    claimantId?: EntityId;
    verifierId?: EntityId;
    result?: string;
  };

  'courtship:interested': {
    agentId: string;
    targetId: string;
    tick: number;
  };

  'courtship:initiated': {
    initiatorId: string;
    targetId: string;
    tick: number;
  };

  'courtship:rejected': {
    rejecterId: string;
    initiatorId: string;
    tick: number;
  };

  'courtship:consent': {
    agent1: string;
    agent2: string;
    tick: number;
    agent1Id?: string;
    agent2Id?: string;
    matingBehavior?: string;
  };

  'parenting:assigned': {
    parentId: string;
    childId: string;
    isPrimaryCaregiver: boolean;
    careType: string;
  };

  'parenting:action': {
    parentId: string;
    childId: string;
    quality: number;
    skill: number;
  };

  'parenting:neglect': {
    parentId: string;
    childId: string;
    wellbeing: number;
    warnings: number;
  };

  'parenting:concern': {
    parentId: string;
    childId: string;
    wellbeing: number;
  };

  'parenting:success': {
    parentId: string;
    childId: string;
    wellbeing: number;
  };

  'parenting:ended': {
    parentId: string;
    childId: string;
  };

  /** Dominance challenge issued */
  'dominance:challenge': {
    challengerId: string;
    challengedId: string;
    method: string;
  };

  /** Dominance challenge resolved */
  'dominance:resolved': {
    challengerId: string;
    challengedId: string;
    winner: string;
    hierarchyChanged: boolean;
  };

  /** Dominance cascade effect triggered */
  'dominance:cascade': {
    triggeredBy: string;
    affectedAgents: string[];
  };

  // === Communication Device Events ===

  /** Chat message sent */
  'chat:message_sent': {
    roomId: string;
    messageId?: string;
    senderId: string;
    senderName?: string;
    message?: string;
    content?: string;
    timestamp?: number;
  };

  /** Walkie talkie device issued to agent */
  'walkie_talkie_issued': {
    deviceId: string;
    agentId: string;
    model: string;
  };

  /** Walkie talkie transmission sent */
  'walkie_talkie_transmission': {
    transmissionId: string;
    senderId: string;
    channel: number;
    message: string;
    receiverCount: number;
  };

  /** Cell phone issued to agent */
  'cell_phone_issued': {
    phoneId: string;
    phoneNumber: string;
    agentId: string;
    generation: string;
  };

  /** Cell phone call started */
  'cell_phone_call_started': {
    callId: string;
    caller: string;
    receiver: string;
  };

  /** Cell phone text message sent */
  'cell_phone_text_sent': {
    messageId: string;
    sender: string;
    receiverNumber: string;
    hasMedia: boolean;
  };

  /** Cell network technology upgraded */
  'cell_network_upgraded': {
    generation: string;
  };

  // === Interest Evolution Events (Deep Conversation System) ===

  /** Interest mutated due to conversation or experience */
  'interest:mutated': {
    agentId: EntityId;
    topic: string;
    oldStrength: number;
    newStrength: number;
    mutationType: 'strengthened' | 'weakened' | 'created' | 'abandoned';
    source: 'conversation' | 'experience' | 'reflection' | 'hearsay';
    influencerId?: EntityId;
  };

  /** Interest shared during conversation */
  'interest:shared': {
    sharerId: EntityId;
    receiverId: EntityId;
    topic: string;
    conversationId?: string;
    depth: number;
  };
}
export type SocialEventType = keyof SocialEvents;
export type SocialEventData = SocialEvents[SocialEventType];
