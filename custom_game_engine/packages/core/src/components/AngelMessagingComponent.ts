/**
 * AngelMessagingComponent - God's Phone System
 *
 * Phase 28.6: Angel Communication
 *
 * Enables direct conversation between the player (god) and angels.
 * Angels don't constantly monitor messages - they have a phone checking
 * frequency that rate-limits interaction.
 *
 * Features:
 * - Group chat with all angels
 * - 1:1 DMs with individual angels
 * - Custom sub-groups
 * - Conversation memory integration
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Chat Types
// ============================================================================

/**
 * A chat message in the angel phone system
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'player' | 'angel';
  senderName: string;
  content: string;
  timestamp: number;
  readBy: string[];
  replyToId?: string;
}

/**
 * A chat room in the angel phone system
 */
export interface ChatRoom {
  id: string;
  type: 'group' | 'dm' | 'custom';
  name: string;
  participants: string[];
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  icon?: string;
}

/**
 * Reference to a conversation memory created from chat
 */
export interface ConversationMemoryRef {
  memoryId: string;
  messageId: string;
  chatId: string;
  createdAt: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AngelMessagingComponent - Tracks an angel's chat state
 */
export class AngelMessagingComponent extends ComponentBase {
  public readonly type = 'angel_messaging';

  // Chat room membership
  public groupChatId: string;
  public dmChatId: string;
  public customChatIds: string[];

  // Phone checking behavior
  public lastCheckedPhone: number;
  public phoneCheckFrequency: number;
  public unreadMessages: number;

  // Memory integration
  public conversationMemories: ConversationMemoryRef[];

  // Rate limiting
  public messagesReceivedToday: number;
  public messagesSentToday: number;
  public dayStartTick: number;

  // Online status
  public isOnline: boolean;
  public lastSeenTick: number;

  constructor(options: {
    groupChatId: string;
    dmChatId: string;
    phoneCheckFrequency?: number;
    currentTick?: number;
  }) {
    super();

    this.groupChatId = options.groupChatId;
    this.dmChatId = options.dmChatId;
    this.customChatIds = [];

    // Default: check phone every ~30 seconds (600 ticks at 20 TPS)
    this.phoneCheckFrequency = options.phoneCheckFrequency ?? 600;
    this.lastCheckedPhone = options.currentTick ?? 0;
    this.unreadMessages = 0;

    this.conversationMemories = [];

    this.messagesReceivedToday = 0;
    this.messagesSentToday = 0;
    this.dayStartTick = options.currentTick ?? 0;

    this.isOnline = true;
    this.lastSeenTick = options.currentTick ?? 0;
  }

  /**
   * Check if it's time to check the phone
   */
  shouldCheckPhone(currentTick: number): boolean {
    return currentTick - this.lastCheckedPhone >= this.phoneCheckFrequency;
  }

  /**
   * Mark phone as checked
   */
  markPhoneChecked(currentTick: number): void {
    this.lastCheckedPhone = currentTick;
    this.lastSeenTick = currentTick;
    this.isOnline = true;
  }

  /**
   * Add unread messages
   */
  addUnreadMessages(count: number): void {
    this.unreadMessages += count;
  }

  /**
   * Clear unread messages
   */
  clearUnreadMessages(): void {
    this.unreadMessages = 0;
  }

  /**
   * Record a sent message
   */
  recordSentMessage(): void {
    this.messagesSentToday++;
  }

  /**
   * Record a received message
   */
  recordReceivedMessage(): void {
    this.messagesReceivedToday++;
    this.unreadMessages++;
  }

  /**
   * Reset daily counters
   */
  resetDailyCounters(currentTick: number): void {
    this.messagesReceivedToday = 0;
    this.messagesSentToday = 0;
    this.dayStartTick = currentTick;
  }

  /**
   * Join a custom chat room
   */
  joinCustomChat(chatId: string): void {
    if (!this.customChatIds.includes(chatId)) {
      this.customChatIds.push(chatId);
    }
  }

  /**
   * Leave a custom chat room
   */
  leaveCustomChat(chatId: string): void {
    const index = this.customChatIds.indexOf(chatId);
    if (index >= 0) {
      this.customChatIds.splice(index, 1);
    }
  }

  /**
   * Record a conversation memory
   */
  addConversationMemory(memoryRef: ConversationMemoryRef): void {
    this.conversationMemories.push(memoryRef);
  }

  /**
   * Get all chat IDs this angel is part of
   */
  getAllChatIds(): string[] {
    return [this.groupChatId, this.dmChatId, ...this.customChatIds];
  }

  /**
   * Set phone check frequency (for upgrades)
   */
  setPhoneCheckFrequency(frequency: number): void {
    this.phoneCheckFrequency = Math.max(100, frequency); // Min 5 seconds
  }

  /**
   * Mark as offline
   */
  goOffline(): void {
    this.isOnline = false;
  }
}

/**
 * Create a new angel messaging component
 */
export function createAngelMessagingComponent(options: {
  groupChatId: string;
  dmChatId: string;
  phoneCheckFrequency?: number;
  currentTick?: number;
}): AngelMessagingComponent {
  return new AngelMessagingComponent(options);
}

// ============================================================================
// Chat Room Management (stored on World or singleton)
// ============================================================================

/**
 * Create a new chat room
 */
export function createChatRoom(options: {
  id: string;
  type: ChatRoom['type'];
  name: string;
  participants: string[];
  currentTick: number;
}): ChatRoom {
  return {
    id: options.id,
    type: options.type,
    name: options.name,
    participants: options.participants,
    createdAt: options.currentTick,
    lastMessageAt: options.currentTick,
    messageCount: 0,
  };
}

/**
 * Create a new chat message
 */
export function createChatMessage(options: {
  id: string;
  chatId: string;
  senderId: string;
  senderType: ChatMessage['senderType'];
  senderName: string;
  content: string;
  currentTick: number;
  replyToId?: string;
}): ChatMessage {
  return {
    id: options.id,
    chatId: options.chatId,
    senderId: options.senderId,
    senderType: options.senderType,
    senderName: options.senderName,
    content: options.content,
    timestamp: options.currentTick,
    readBy: [options.senderId],
    replyToId: options.replyToId,
  };
}

/**
 * Generate unique ID for chat room
 */
export function generateChatRoomId(type: ChatRoom['type'], deityId: string, angelId?: string): string {
  if (type === 'group') {
    return `chat:group:${deityId}`;
  } else if (type === 'dm' && angelId) {
    return `chat:dm:${deityId}:${angelId}`;
  } else {
    return `chat:custom:${deityId}:${Date.now()}`;
  }
}

/**
 * Generate unique ID for message
 */
export function generateMessageId(chatId: string): string {
  return `msg:${chatId}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
}
