/**
 * ChatRoomSystem - Manages all chat rooms in the game
 *
 * Handles:
 * - Divine chat (gods)
 * - Family chats
 * - Guild/faction chats
 * - DMs (private 1:1)
 * - Group DMs
 * - Sub-groups/threads
 *
 * Criteria-based membership automatically adds/removes members
 * based on entity tags, family, guild, etc.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { TagsComponent } from '../components/TagsComponent.js';
import {
  type ChatRoomComponent,
  type ChatRoomConfig,
  type ChatMessage,
  createChatRoomComponent,
  createChatMessage,
  createJoinNotification,
  createLeaveNotification,
  formatNotification,
  DIVINE_CHAT_CONFIG,
} from './ChatRoom.js';

// ============================================================================
// DIVINE CHAT PERSISTENCE
// ============================================================================

const DIVINE_CHAT_STORAGE_KEY = 'multiverse_divine_chat_messages';
const MAX_STORED_MESSAGES = 100; // Limit stored messages to prevent localStorage bloat

/**
 * Load divine chat messages from localStorage (browser only)
 */
function loadDivineChatMessages(): ChatMessage[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const stored = localStorage.getItem(DIVINE_CHAT_STORAGE_KEY);
    if (!stored) return [];

    const messages = JSON.parse(stored) as ChatMessage[];
    console.log(`[ChatRoomSystem] Loaded ${messages.length} divine chat messages from localStorage`);
    return messages;
  } catch (e) {
    console.warn('[ChatRoomSystem] Failed to load divine chat from localStorage:', e);
    return [];
  }
}

/**
 * Save divine chat messages to localStorage (browser only)
 */
function saveDivineChatMessages(messages: ChatMessage[]): void {
  if (typeof localStorage === 'undefined') return;

  try {
    // Only keep the most recent messages
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(DIVINE_CHAT_STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('[ChatRoomSystem] Failed to save divine chat to localStorage:', e);
  }
}

export class ChatRoomSystem extends BaseSystem {
  readonly id = 'chat_room' as const;
  readonly priority: number = 50;
  readonly requiredComponents = [] as const;
  // Only run when chat room components exist (O(1) activation check)
  readonly activationComponents = [ComponentType.ChatRoom] as const;

  /** Room ID -> Entity ID mapping */
  private roomEntities: Map<string, string> = new Map();

  /** Track known members per room for change detection */
  private knownMembers: Map<string, Set<string>> = new Map();

  /** Track if we've initialized permanent rooms */
  private initialized: boolean = false;

  // Performance: Throttle membership updates - don't need to check every tick
  protected readonly throttleInterval = 100; // Check every 5 seconds (100 ticks at 20 TPS)
  private lastMembershipUpdate = 0;

  protected onUpdate(ctx: SystemContext): void {
    // Performance: Throttle membership updates to avoid expensive queries every tick
    const shouldUpdateMembership = (ctx.tick - this.lastMembershipUpdate) >= this.throttleInterval;

    // Update all criteria-based rooms
    for (const [roomId, entityId] of this.roomEntities) {
      const entity = ctx.world.getEntity(entityId);
      if (!entity) {
        this.roomEntities.delete(roomId);
        continue;
      }

      const room = entity.components.get(ComponentType.ChatRoom) as ChatRoomComponent | undefined;
      if (!room) continue;

      // Only auto-update criteria-based rooms (and only when interval has passed)
      if (room.config.membership.type === 'criteria_based' && shouldUpdateMembership) {
        this.updateCriteriaMembership(ctx.world, room);
      }

      // Update active state
      const threshold = room.config.activationThreshold ?? 1;
      const wasActive = room.isActive;
      room.isActive = room.config.membership.members.length >= threshold;

      if (room.isActive && !wasActive) {
        console.log(`[ChatRoomSystem] ${room.config.name} activated with ${room.config.membership.members.length} members`);
      } else if (!room.isActive && wasActive) {
        console.log(`[ChatRoomSystem] ${room.config.name} deactivated - not enough members`);
      }

      room.lastActivityTick = ctx.tick;
    }

    // Update last membership update tick
    if (shouldUpdateMembership) {
      this.lastMembershipUpdate = ctx.tick;
    }
  }

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  /**
   * Initialize permanent/well-known rooms (called on first update)
   */
  private initializePermanentRooms(world: World): void {
    // Auto-initialize divine chat room (permanent, criteria-based)
    const divineChat = this.getOrCreateRoom(world, DIVINE_CHAT_CONFIG);

    // Load persisted messages from localStorage
    const savedMessages = loadDivineChatMessages();
    if (savedMessages.length > 0) {
      divineChat.messages = savedMessages;
      console.log(`[ChatRoomSystem] Restored ${savedMessages.length} divine chat messages`);
    }
  }

  /**
   * Get or create a chat room
   */
  getOrCreateRoom(world: World, config: ChatRoomConfig): ChatRoomComponent {
    // Check if room already exists in our runtime map
    const existingEntityId = this.roomEntities.get(config.id);
    if (existingEntityId) {
      const entity = world.getEntity(existingEntityId);
      if (entity) {
        const room = entity.components.get(ComponentType.ChatRoom) as ChatRoomComponent;
        if (room) return room;
      }
    }

    // Check if room exists in the world (e.g., from a loaded save)
    // This handles the case where roomEntities map is empty after load
    const chatEntities = world.query().with(ComponentType.ChatRoom).executeEntities();
    for (const existingEntity of chatEntities) {
      const existingRoom = existingEntity.components.get(ComponentType.ChatRoom) as ChatRoomComponent;
      if (existingRoom && existingRoom.config.id === config.id) {
        // Found existing room from save - register it in our map and return
        this.roomEntities.set(config.id, existingEntity.id);
        this.knownMembers.set(config.id, new Set(existingRoom.config.membership.members));
        console.log(`[ChatRoomSystem] Found existing room from save: ${config.name} (${existingRoom.messages.length} messages)`);
        return existingRoom;
      }
    }

    // Create new room (no existing one found)
    const entity = world.createEntity();
    const room = createChatRoomComponent(config, world.tick);
    // Cast required: world.createEntity() returns Entity interface,
    // but internally creates EntityImpl with addComponent method
    (entity as EntityImpl).addComponent(room);

    this.roomEntities.set(config.id, entity.id);
    this.knownMembers.set(config.id, new Set());

    console.log(`[ChatRoomSystem] Created room: ${config.name}`);

    return room;
  }

  /**
   * Get the divine chat room (convenience method)
   */
  getDivineChat(world: World): ChatRoomComponent {
    return this.getOrCreateRoom(world, DIVINE_CHAT_CONFIG);
  }

  /**
   * Get a room by ID
   */
  getRoom(world: World, roomId: string): ChatRoomComponent | null {
    const entityId = this.roomEntities.get(roomId);
    if (!entityId) return null;

    const entity = world.getEntity(entityId);
    if (!entity) return null;

    return entity.components.get(ComponentType.ChatRoom) as ChatRoomComponent | undefined ?? null;
  }

  /**
   * Get all rooms an entity is a member of
   */
  getRoomsForEntity(world: World, entityId: string): ChatRoomComponent[] {
    const rooms: ChatRoomComponent[] = [];

    for (const [roomId] of this.roomEntities) {
      const room = this.getRoom(world, roomId);
      if (room && room.config.membership.members.includes(entityId)) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  // ============================================================================
  // MEMBERSHIP
  // ============================================================================

  /**
   * Update membership for criteria-based rooms
   */
  private updateCriteriaMembership(world: World, room: ChatRoomComponent): void {
    const criteria = room.config.membership.criteria;
    if (!criteria) return;

    const matchingEntities = this.findEntitiesMatchingCriteria(world, criteria);
    const currentIds = new Set(matchingEntities.map(e => e.id));
    const knownIds = this.knownMembers.get(room.config.id) ?? new Set();

    // Check for new members
    for (const entity of matchingEntities) {
      if (!knownIds.has(entity.id)) {
        this.handleMemberJoin(world, room, entity);
      }
    }

    // Check for departed members
    for (const oldId of knownIds) {
      if (!currentIds.has(oldId)) {
        this.handleMemberLeave(world, room, oldId);
      }
    }

    // Update tracking
    room.config.membership.members = [...currentIds];
    this.knownMembers.set(room.config.id, currentIds);
  }

  /**
   * Find entities matching a criteria string
   */
  private findEntitiesMatchingCriteria(world: World, criteria: string): Entity[] {
    const parts = criteria.split(':');
    const type = parts[0];
    const value = parts[1];

    if (!value) {
      console.error(`[ChatRoomSystem] Invalid criteria format: ${criteria}`);
      return [];
    }

    if (type === 'tag') {
      // Find entities with specific tag
      return world.query()
        .with(ComponentType.Tags)
        .executeEntities()
        .filter(entity => {
          const tags = entity.getComponent<TagsComponent>(ComponentType.Tags);
          return tags?.tags?.includes(value) ?? false;
        });
    }

    // Note: family and guild criteria are not yet implemented in AgentComponent
    // These would require adding familyId/guildId fields to AgentComponent
    // For now, these criteria return empty arrays
    if (type === 'family' || type === 'guild') {
      console.error(`[ChatRoomSystem] ${type} criteria not yet implemented - requires ${type}Id field in AgentComponent`);
      return [];
    }

    return [];
  }

  /**
   * Handle a member joining
   */
  private handleMemberJoin(_world: World, room: ChatRoomComponent, entity: Entity): void {
    const identity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
    const name = identity?.name ?? 'Unknown';

    // Don't duplicate
    if (room.config.membership.members.includes(entity.id)) {
      return;
    }

    room.config.membership.members.push(entity.id);

    // Update active state immediately when member joins
    const threshold = room.config.activationThreshold ?? 1;
    const wasActive = room.isActive;
    room.isActive = room.config.membership.members.length >= threshold;

    // Create notification
    const notification = createJoinNotification(room.config.id, entity.id, name);
    room.pendingNotifications.push(notification);

    console.log(`[ChatRoomSystem] ${formatNotification(notification)} (${room.config.name})`);

    // Log activation state change
    if (room.isActive && !wasActive) {
      console.log(`[ChatRoomSystem] ${room.config.name} activated with ${room.config.membership.members.length} members`);
    }
  }

  /**
   * Handle a member leaving
   */
  private handleMemberLeave(world: World, room: ChatRoomComponent, entityId: string): void {
    const index = room.config.membership.members.indexOf(entityId);
    if (index !== -1) {
      room.config.membership.members.splice(index, 1);

      // Update active state immediately when member leaves
      const threshold = room.config.activationThreshold ?? 1;
      const wasActive = room.isActive;
      room.isActive = room.config.membership.members.length >= threshold;

      // Try to get name from world (entity might be gone)
      const entity = world.getEntity(entityId);
      const identity = entity?.getComponent<IdentityComponent>(ComponentType.Identity);
      const name = identity?.name ?? 'Unknown';

      // Create notification
      const notification = createLeaveNotification(room.config.id, entityId, name);
      room.pendingNotifications.push(notification);

      console.log(`[ChatRoomSystem] ${formatNotification(notification)} (${room.config.name})`);

      // Log activation state change
      if (!room.isActive && wasActive) {
        console.log(`[ChatRoomSystem] ${room.config.name} deactivated - not enough members`);
      }
    }
  }

  /**
   * Manually add a member to an invite-only room
   */
  addMember(world: World, roomId: string, entityId: string, inviterId?: string): boolean {
    const room = this.getRoom(world, roomId);
    if (!room) return false;

    // Check if invite-only and inviter has permission
    if (room.config.membership.type === 'invite_only') {
      if (inviterId && room.config.permissions?.canInvite === 'admins') {
        if (!room.config.membership.admins?.includes(inviterId)) {
          return false;
        }
      }
    }

    // Check max members
    if (room.config.membership.maxMembers !== undefined) {
      if (room.config.membership.members.length >= room.config.membership.maxMembers) {
        return false;
      }
    }

    const entity = world.getEntity(entityId);
    if (entity) {
      this.handleMemberJoin(world, room, entity);
    }

    return true;
  }

  /**
   * Remove a member from a room
   */
  removeMember(world: World, roomId: string, entityId: string): boolean {
    const room = this.getRoom(world, roomId);
    if (!room) return false;

    this.handleMemberLeave(world, room, entityId);
    return true;
  }

  // ============================================================================
  // MESSAGING
  // ============================================================================

  /**
   * Send a message to a room
   */
  sendMessage(
    world: World,
    roomId: string,
    senderId: string,
    content: string,
    options?: {
      type?: ChatMessage['type'];
      replyTo?: string;
      whisperTo?: string[];
      senderName?: string; // Optional override for sender name
    }
  ): ChatMessage | null {
    const room = this.getRoom(world, roomId);
    if (!room) {
      console.error(`[ChatRoomSystem] Room not found: ${roomId}`);
      return null;
    }

    // Get sender name - use provided name if available
    let senderName = options?.senderName || 'Unknown';
    if (!options?.senderName) {
      if (senderId === 'player') {
        // Fallback for player without name (should have name in browser)
        senderName = 'Player';
      } else {
        const sender = world.getEntity(senderId);
        if (!sender) {
          console.error(`[ChatRoomSystem] Sender not found: ${senderId}`);
          return null;
        }

        const identity = sender.getComponent<IdentityComponent>(ComponentType.Identity);
        senderName = identity?.name ?? 'Unknown';
      }
    }

    // Create message
    const message = createChatMessage(
      roomId,
      senderId,
      senderName,
      content,
      world.tick,
      options?.type ?? 'message'
    );

    if (options?.replyTo) {
      message.replyTo = options.replyTo;
    }

    if (options?.whisperTo) {
      message.visibleTo = [senderId, ...options.whisperTo];
      message.type = 'whisper';
    }

    // Add to room
    room.messages.push(message);
    room.lastMessageTick = world.tick;
    room.lastActivityTick = world.tick;

    // Persist divine chat messages to localStorage
    if (roomId === 'divine_chat') {
      saveDivineChatMessages(room.messages);
    }

    console.log(`[ChatRoomSystem] [${room.config.name}] ${senderName}: ${content}`);

    // Emit event for UI and other systems (e.g., AdminAngelSystem)
    // Must use world.eventBus so other systems can receive it
    // Use emitImmediate() for chat messages so they're broadcast to windows without tick delay
    world.eventBus.emitImmediate({
      type: 'chat:message_sent',
      source: 'chat_room_system',
      data: {
        roomId,
        messageId: message.id,
        senderId,
        senderName,
        content,
      },
    });

    return message;
  }

  /**
   * Send a system message to a room
   */
  sendSystemMessage(world: World, roomId: string, content: string): ChatMessage | null {
    const room = this.getRoom(world, roomId);
    if (!room) return null;

    const message = createChatMessage(roomId, 'system', 'System', content, world.tick, 'system');
    room.messages.push(message);
    room.lastMessageTick = world.tick;

    return message;
  }

  /**
   * Pin a message
   */
  pinMessage(world: World, roomId: string, messageId: string, pinnerId: string): boolean {
    const room = this.getRoom(world, roomId);
    if (!room) return false;

    // Check permission
    if (room.config.permissions?.canPin === 'admins') {
      if (!room.config.membership.admins?.includes(pinnerId)) {
        return false;
      }
    }

    if (!room.pinnedMessages.includes(messageId)) {
      room.pinnedMessages.push(messageId);

      const pinner = world.getEntity(pinnerId);
      const identity = pinner?.getComponent<IdentityComponent>(ComponentType.Identity);
      const name = identity?.name ?? 'Unknown';

      room.pendingNotifications.push({
        id: `notif_${Date.now()}`,
        roomId,
        type: 'pinned',
        entityId: pinnerId,
        entityName: name,
        timestamp: Date.now(),
        displayed: false,
      });
    }

    return true;
  }

  /**
   * Add reaction to a message
   */
  addReaction(world: World, roomId: string, messageId: string, reactorId: string, emoji: string): boolean {
    const room = this.getRoom(world, roomId);
    if (!room) return false;

    const message = room.messages.find(m => m.id === messageId);
    if (!message) return false;

    if (!message.reactions) {
      message.reactions = new Map();
    }

    const reactors = message.reactions.get(emoji) ?? [];
    if (!reactors.includes(reactorId)) {
      reactors.push(reactorId);
      message.reactions.set(emoji, reactors);
    }

    return true;
  }

  // ============================================================================
  // SUB-ROOMS (Threads/Side conversations)
  // ============================================================================

  /**
   * Create a sub-room (thread/side conversation) within a parent room
   */
  createSubRoom(
    world: World,
    parentRoomId: string,
    name: string,
    creatorId: string,
    memberIds: string[]
  ): ChatRoomComponent | null {
    const parentRoom = this.getRoom(world, parentRoomId);
    if (!parentRoom) return null;

    // Verify creator is in parent room
    if (!parentRoom.config.membership.members.includes(creatorId)) {
      return null;
    }

    // Filter members to only those in parent room
    const validMembers = memberIds.filter(id =>
      parentRoom.config.membership.members.includes(id)
    );

    const config: ChatRoomConfig = {
      id: `sub_${parentRoomId}_${Date.now()}`,
      name,
      parentRoomId,
      membership: {
        type: 'invite_only',
        members: [creatorId, ...validMembers],
        admins: [creatorId],
      },
      activationThreshold: 2,
      retention: 'session',
    };

    const subRoom = this.getOrCreateRoom(world, config);

    // Track in parent
    parentRoom.subRoomIds.push(config.id);

    return subRoom;
  }

  /**
   * Get sub-rooms for a room
   */
  getSubRooms(world: World, parentRoomId: string): ChatRoomComponent[] {
    const parentRoom = this.getRoom(world, parentRoomId);
    if (!parentRoom) return [];

    return parentRoom.subRoomIds
      .map(id => this.getRoom(world, id))
      .filter((r): r is ChatRoomComponent => r !== null);
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Check if an entity is in a specific room
   */
  isInRoom(world: World, roomId: string, entityId: string): boolean {
    const room = this.getRoom(world, roomId);
    if (!room) return false;
    return room.config.membership.members.includes(entityId);
  }

  /**
   * Get all members of a room with their names
   */
  getRoomMembers(world: World, roomId: string): Array<{ id: string; name: string }> {
    const room = this.getRoom(world, roomId);
    if (!room) return [];

    return room.config.membership.members.map(id => {
      const entity = world.getEntity(id);
      const identity = entity?.getComponent<IdentityComponent>(ComponentType.Identity);
      return {
        id,
        name: identity?.name ?? 'Unknown',
      };
    });
  }

  /**
   * Get recent messages from a room
   */
  getRecentMessages(world: World, roomId: string, count: number = 50): ChatMessage[] {
    const room = this.getRoom(world, roomId);
    if (!room) return [];

    return room.messages.slice(-count);
  }

  /**
   * Mark notifications as displayed
   */
  markNotificationsDisplayed(world: World, roomId: string): void {
    const room = this.getRoom(world, roomId);
    if (!room) return;

    for (const notification of room.pendingNotifications) {
      notification.displayed = true;
    }
  }

  /**
   * Initialize event listeners and permanent rooms
   */
  protected onInitialize(world: World): void {
    // Create permanent rooms (divine_chat, etc.)
    this.initializePermanentRooms(world);
    this.initialized = true;

    // Listen for send_message events from UI panels
    world.eventBus.on('chat:send_message', (event) => {
      const data = event.data as {
        roomId: string;
        senderId: string;
        senderName?: string; // Optional name from UI (persisted in localStorage)
        message: string;
        type?: 'message' | 'action' | 'whisper';
        replyTo?: string;
        whisperTo?: string[];
      };

      this.sendMessage(world, data.roomId, data.senderId, data.message, {
        type: data.type,
        replyTo: data.replyTo,
        whisperTo: data.whisperTo,
        senderName: data.senderName,
      });
    });

    // Listen for join_room events
    world.eventBus.on('chat:join_room', (event) => {
      const data = event.data as { roomId: string; entityId: string };
      this.addMember(world, data.roomId, data.entityId);
    });

    // Listen for leave_room events
    world.eventBus.on('chat:leave_room', (event) => {
      const data = event.data as { roomId: string; entityId: string };
      this.removeMember(world, data.roomId, data.entityId);
    });
  }

  protected onCleanup(): void {
    this.roomEntities.clear();
    this.knownMembers.clear();
    this.initialized = false;
  }
}
