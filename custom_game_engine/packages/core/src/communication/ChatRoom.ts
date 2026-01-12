/**
 * ChatRoom - General chat room abstraction
 *
 * Supports:
 * - Group chats (divine chat, guild chat, family chat)
 * - DMs (private 1:1)
 * - Sub-groups (side conversations within a larger group)
 * - Criteria-based membership (all deities, all miners, etc.)
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// TYPES
// ============================================================================

export type MembershipType = 'open' | 'invite_only' | 'criteria_based';
export type MessageType = 'message' | 'system' | 'action' | 'whisper';
export type RetentionPolicy = 'none' | 'session' | 'permanent';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  tick: number;
  type: MessageType;

  /** For whispers - who can see this */
  visibleTo?: string[];

  /** Reply to another message */
  replyTo?: string;

  /** Reactions (emoji -> sender IDs) */
  reactions?: Map<string, string[]>;
}

export interface ChatNotification {
  id: string;
  roomId: string;
  type: 'joined' | 'left' | 'created' | 'renamed' | 'pinned';
  entityId: string;
  entityName: string;
  timestamp: number;
  displayed: boolean;
}

export interface MembershipConfig {
  type: MembershipType;

  /** For criteria_based: e.g., 'tag:deity', 'guild:miners', 'family:smith' */
  criteria?: string;

  /** Current members */
  members: string[];

  /** Max members (undefined = unlimited) */
  maxMembers?: number;

  /** For invite_only: who can invite */
  admins?: string[];
}

// ============================================================================
// CHAT ROOM CONFIG
// ============================================================================

export interface ChatRoomConfig {
  id: string;
  name: string;

  /** Parent room (for sub-groups/threads) */
  parentRoomId?: string;

  /** Membership rules */
  membership: MembershipConfig;

  /** Minimum members for room to be "active" */
  activationThreshold?: number;

  /** How long to keep messages */
  retention: RetentionPolicy;

  /** Room metadata */
  description?: string;
  icon?: string;

  /** Permissions */
  permissions?: {
    canInvite: 'anyone' | 'admins' | 'none';
    canPin: 'anyone' | 'admins';
    canDelete: 'own' | 'admins';
  };
}

// ============================================================================
// CHAT ROOM COMPONENT
// ============================================================================

export interface ChatRoomComponent extends Component {
  type: 'chat_room';

  /** Room configuration */
  config: ChatRoomConfig;

  /** Current state */
  isActive: boolean;
  createdAt: number;

  /** Messages */
  messages: ChatMessage[];
  pinnedMessages: string[]; // message IDs

  /** Notifications */
  pendingNotifications: ChatNotification[];

  /** Tracking */
  lastMessageTick: number;
  lastActivityTick: number;

  /** Sub-rooms (for threads/sub-groups) */
  subRoomIds: string[];
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let messageIdCounter = 0;
let notificationIdCounter = 0;

export function createChatRoomComponent(config: ChatRoomConfig, tick: number): ChatRoomComponent {
  return {
    type: 'chat_room',
    config,
    isActive: false,
    createdAt: tick,
    messages: [],
    pinnedMessages: [],
    pendingNotifications: [],
    lastMessageTick: 0,
    lastActivityTick: tick,
    subRoomIds: [],
    version: 1,
  };
}

export function createChatMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  content: string,
  tick: number,
  type: MessageType = 'message'
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${++messageIdCounter}`,
    roomId,
    senderId,
    senderName,
    content,
    timestamp: Date.now(),
    tick,
    type,
  };
}

export function createSystemMessage(
  roomId: string,
  content: string,
  tick: number
): ChatMessage {
  return createChatMessage(roomId, 'system', 'System', content, tick, 'system');
}

export function createJoinNotification(
  roomId: string,
  entityId: string,
  entityName: string
): ChatNotification {
  return {
    id: `notif_${Date.now()}_${++notificationIdCounter}`,
    roomId,
    type: 'joined',
    entityId,
    entityName,
    timestamp: Date.now(),
    displayed: false,
  };
}

export function createLeaveNotification(
  roomId: string,
  entityId: string,
  entityName: string
): ChatNotification {
  return {
    id: `notif_${Date.now()}_${++notificationIdCounter}`,
    roomId,
    type: 'left',
    entityId,
    entityName,
    timestamp: Date.now(),
    displayed: false,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatNotification(notification: ChatNotification): string {
  switch (notification.type) {
    case 'joined':
      return `${notification.entityName} has entered the chat`;
    case 'left':
      return `${notification.entityName} has left the chat`;
    case 'created':
      return `${notification.entityName} created this chat`;
    case 'renamed':
      return `${notification.entityName} renamed this chat`;
    case 'pinned':
      return `${notification.entityName} pinned a message`;
    default:
      return `${notification.entityName} did something`;
  }
}

export function getMemberCount(room: ChatRoomComponent): number {
  return room.config.membership.members.length;
}

export function isMember(room: ChatRoomComponent, entityId: string): boolean {
  return room.config.membership.members.includes(entityId);
}

export function isAdmin(room: ChatRoomComponent, entityId: string): boolean {
  return room.config.membership.admins?.includes(entityId) ?? false;
}

// ============================================================================
// PRESET ROOM CONFIGS
// ============================================================================

export const DIVINE_CHAT_CONFIG: ChatRoomConfig = {
  id: 'divine_chat',
  name: 'Divine Realm',
  membership: {
    type: 'criteria_based',
    criteria: 'tag:deity',
    members: [],
  },
  activationThreshold: 1, // Allow chat when any deity exists (e.g., Death)
  retention: 'permanent',
  description: 'Where gods discuss the fate of mortals',
  permissions: {
    canInvite: 'none', // auto-membership based on criteria
    canPin: 'anyone',
    canDelete: 'own',
  },
};

export function createFamilyChatConfig(familyId: string, familyName: string): ChatRoomConfig {
  return {
    id: `family_${familyId}`,
    name: `${familyName} Family`,
    membership: {
      type: 'criteria_based',
      criteria: `family:${familyId}`,
      members: [],
    },
    activationThreshold: 2,
    retention: 'session',
    description: `Private chat for the ${familyName} family`,
  };
}

export function createGuildChatConfig(guildId: string, guildName: string): ChatRoomConfig {
  return {
    id: `guild_${guildId}`,
    name: `${guildName} Guild`,
    membership: {
      type: 'criteria_based',
      criteria: `guild:${guildId}`,
      members: [],
    },
    activationThreshold: 1,
    retention: 'permanent',
    description: `Coordination channel for ${guildName}`,
  };
}

export function createDMConfig(entity1Id: string, entity2Id: string, entity1Name: string, entity2Name: string): ChatRoomConfig {
  // Consistent ID regardless of who initiates
  const sortedIds = [entity1Id, entity2Id].sort();
  return {
    id: `dm_${sortedIds[0]}_${sortedIds[1]}`,
    name: `${entity1Name} & ${entity2Name}`,
    membership: {
      type: 'invite_only',
      members: [entity1Id, entity2Id],
      maxMembers: 2,
      admins: [entity1Id, entity2Id],
    },
    activationThreshold: 1,
    retention: 'session',
  };
}

export function createGroupDMConfig(creatorId: string, memberIds: string[], name?: string): ChatRoomConfig {
  const allMembers = [creatorId, ...memberIds.filter(id => id !== creatorId)];
  return {
    id: `gdm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name ?? 'Group Chat',
    membership: {
      type: 'invite_only',
      members: allMembers,
      admins: [creatorId],
    },
    activationThreshold: 2,
    retention: 'session',
    permissions: {
      canInvite: 'admins',
      canPin: 'anyone',
      canDelete: 'own',
    },
  };
}

export function createSubRoomConfig(
  parentRoomId: string,
  name: string,
  memberIds: string[],
  creatorId: string
): ChatRoomConfig {
  return {
    id: `sub_${parentRoomId}_${Date.now()}`,
    name,
    parentRoomId,
    membership: {
      type: 'invite_only',
      members: memberIds,
      admins: [creatorId],
    },
    activationThreshold: 2,
    retention: 'session',
    description: `Sub-group of ${parentRoomId}`,
    permissions: {
      canInvite: 'admins',
      canPin: 'anyone',
      canDelete: 'own',
    },
  };
}
