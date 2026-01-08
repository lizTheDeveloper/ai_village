import type { Component } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

export interface ConversationMessage {
  speakerId: EntityId;
  message: string;
  tick: Tick;
}

export interface ConversationComponent extends Component {
  type: 'conversation';
  partnerId: EntityId | null; // DEPRECATED: for backward compat, use participantIds instead
  participantIds: EntityId[]; // All agents in this conversation (including self)
  conversationCenterX?: number; // Center point for spatial stickiness
  conversationCenterY?: number; // Center point for spatial stickiness
  messages: ConversationMessage[]; // Recent conversation history
  maxMessages: number; // Keep last N messages
  startedAt: Tick;
  lastMessageAt: Tick;
  isActive: boolean;

  // Social fatigue tracking
  socialFatigue: number; // 0-100, current fatigue level
  fatigueThreshold: number; // When fatigue exceeds this, agent wants to leave
}

export function createConversationComponent(
  maxMessages: number = 20  // Keep more history for rolling chat log
): ConversationComponent {
  return {
    type: 'conversation',
    version: 1,
    partnerId: null,
    participantIds: [],
    conversationCenterX: undefined,
    conversationCenterY: undefined,
    messages: [],
    maxMessages,
    startedAt: 0,
    lastMessageAt: 0,
    isActive: false,
    socialFatigue: 0,
    fatigueThreshold: 70, // Default threshold (will be adjusted by personality)
  };
}

export function startConversation(
  component: ConversationComponent,
  partnerId: EntityId,
  currentTick: Tick,
  selfId?: EntityId,
  centerX?: number,
  centerY?: number
): ConversationComponent {
  // For multi-agent conversations, participantIds should include both self and partner
  const participantIds = selfId ? [selfId, partnerId] : [partnerId];

  return {
    ...component,
    partnerId,
    participantIds,
    conversationCenterX: centerX,
    conversationCenterY: centerY,
    messages: [],
    startedAt: currentTick,
    lastMessageAt: currentTick,
    isActive: true,
    socialFatigue: 0, // Reset fatigue when starting new conversation
  };
}

export function addMessage(
  component: ConversationComponent,
  speakerId: EntityId,
  message: string,
  currentTick: Tick
): ConversationComponent {
  const newMessage: ConversationMessage = {
    speakerId,
    message,
    tick: currentTick,
  };

  const messages = [...component.messages, newMessage];

  // Keep only the most recent maxMessages
  const trimmedMessages = messages.slice(-component.maxMessages);

  return {
    ...component,
    messages: trimmedMessages,
    lastMessageAt: currentTick,
  };
}

export function endConversation(
  component: ConversationComponent
): ConversationComponent {
  return {
    ...component,
    partnerId: null,
    participantIds: [],
    conversationCenterX: undefined,
    conversationCenterY: undefined,
    isActive: false,
  };
}

export function isInConversation(
  component: ConversationComponent
): boolean {
  return component.isActive && (component.partnerId !== null || component.participantIds.length > 0);
}

/**
 * Join an existing conversation by adding a participant.
 */
export function joinConversation(
  component: ConversationComponent,
  participantId: EntityId
): ConversationComponent {
  if (component.participantIds.includes(participantId)) {
    return component; // Already in conversation
  }

  return {
    ...component,
    participantIds: [...component.participantIds, participantId],
  };
}

/**
 * Leave a conversation by removing a participant.
 * If no participants remain, ends the conversation.
 */
export function leaveConversation(
  component: ConversationComponent,
  participantId: EntityId
): ConversationComponent {
  const participantIds = component.participantIds.filter(id => id !== participantId);

  // If this was the primary partner, clear partnerId
  const partnerId = component.partnerId === participantId ? null : component.partnerId;

  // If no one left, end the conversation
  if (participantIds.length === 0 && partnerId === null) {
    return endConversation(component);
  }

  return {
    ...component,
    partnerId,
    participantIds,
  };
}

export function getConversationDuration(
  component: ConversationComponent,
  currentTick: Tick
): number {
  if (!component.isActive) return 0;
  return currentTick - component.startedAt;
}
