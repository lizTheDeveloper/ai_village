import type { Component } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

export interface ConversationMessage {
  speakerId: EntityId;
  message: string;
  tick: Tick;
}

export interface ConversationComponent extends Component {
  type: 'conversation';
  partnerId: EntityId | null; // Who they're talking to
  messages: ConversationMessage[]; // Recent conversation history
  maxMessages: number; // Keep last N messages
  startedAt: Tick;
  lastMessageAt: Tick;
  isActive: boolean;
}

export function createConversationComponent(
  maxMessages: number = 20  // Keep more history for rolling chat log
): ConversationComponent {
  return {
    type: 'conversation',
    version: 1,
    partnerId: null,
    messages: [],
    maxMessages,
    startedAt: 0,
    lastMessageAt: 0,
    isActive: false,
  };
}

export function startConversation(
  component: ConversationComponent,
  partnerId: EntityId,
  currentTick: Tick
): ConversationComponent {
  return {
    ...component,
    partnerId,
    messages: [],
    startedAt: currentTick,
    lastMessageAt: currentTick,
    isActive: true,
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
    isActive: false,
  };
}

export function isInConversation(
  component: ConversationComponent
): boolean {
  return component.isActive && component.partnerId !== null;
}

export function getConversationDuration(
  component: ConversationComponent,
  currentTick: Tick
): number {
  if (!component.isActive) return 0;
  return currentTick - component.startedAt;
}
