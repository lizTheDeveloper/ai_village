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
}
export type SocialEventType = keyof SocialEvents;
export type SocialEventData = SocialEvents[SocialEventType];
