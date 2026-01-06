/**
 * GodChatRoomNetwork - Distributed chat system for networked multiverse
 *
 * Allows players (gods) to communicate across connected universes.
 * Features presence awareness, message synchronization, and room management.
 */

import type { PeerId } from './NetworkProtocol.js';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  roomId: string;
  peerId: PeerId;
  displayName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'emote';
}

export interface ChatMember {
  peerId: PeerId;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
  status: 'online' | 'away' | 'offline';
}

export interface ChatRoom {
  id: string;
  name: string;
  members: Map<PeerId, ChatMember>;
  messages: ChatMessage[];
  createdAt: number;
  maxMessages: number;
}

// ============================================================================
// Network Messages
// ============================================================================

interface ChatJoinMessage {
  type: 'chat_join';
  roomId: string;
  peerId: PeerId;
  displayName: string;
  timestamp: number;
}

interface ChatLeaveMessage {
  type: 'chat_leave';
  roomId: string;
  peerId: PeerId;
  timestamp: number;
}

interface ChatMessageBroadcast {
  type: 'chat_message';
  message: ChatMessage;
}

interface ChatMemberListRequest {
  type: 'chat_member_list_request';
  roomId: string;
}

interface ChatMemberListResponse {
  type: 'chat_member_list_response';
  roomId: string;
  members: ChatMember[];
}

interface ChatPresenceUpdate {
  type: 'chat_presence';
  roomId: string;
  peerId: PeerId;
  status: 'online' | 'away' | 'offline';
  timestamp: number;
}

type ChatNetworkMessage =
  | ChatJoinMessage
  | ChatLeaveMessage
  | ChatMessageBroadcast
  | ChatMemberListRequest
  | ChatMemberListResponse
  | ChatPresenceUpdate;

// ============================================================================
// GodChatRoomNetwork
// ============================================================================

export class GodChatRoomNetwork {
  private chatRooms: Map<string, ChatRoom> = new Map();
  private myPeerId: PeerId;
  private myDisplayName: string;

  // Connection to network manager (for sending messages)
  private sendMessage: (peerId: PeerId, message: any) => void;
  private broadcastToRoom: (roomId: string, message: any) => void;

  // Presence tracking
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MEMBER_TIMEOUT = 60000; // 1 minute

  constructor(
    myPeerId: PeerId,
    myDisplayName: string,
    sendMessage: (peerId: PeerId, message: any) => void,
    broadcastToRoom: (roomId: string, message: any) => void
  ) {
    this.myPeerId = myPeerId;
    this.myDisplayName = myDisplayName;
    this.sendMessage = sendMessage;
    this.broadcastToRoom = broadcastToRoom;

    // Start presence updates
    this.startPresenceUpdates();
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Join a chat room (creates if doesn't exist)
   */
  joinChatRoom(roomId: string, roomName?: string): void {
    let room = this.chatRooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        name: roomName || roomId,
        members: new Map(),
        messages: [],
        createdAt: Date.now(),
        maxMessages: 100,
      };
      this.chatRooms.set(roomId, room);
    }

    // Add self to room
    room.members.set(this.myPeerId, {
      peerId: this.myPeerId,
      displayName: this.myDisplayName,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'online',
    });

    // Broadcast join to other members
    const joinMessage: ChatJoinMessage = {
      type: 'chat_join',
      roomId,
      peerId: this.myPeerId,
      displayName: this.myDisplayName,
      timestamp: Date.now(),
    };

    this.broadcastToRoom(roomId, joinMessage);

    // Request member list from others
    this.requestMemberList(roomId);

    // Add system message
    this.addSystemMessage(roomId, `${this.myDisplayName} joined the room`);
  }

  /**
   * Leave a chat room
   */
  leaveChatRoom(roomId: string): void {
    const room = this.chatRooms.get(roomId);
    if (!room) return;

    // Broadcast leave
    const leaveMessage: ChatLeaveMessage = {
      type: 'chat_leave',
      roomId,
      peerId: this.myPeerId,
      timestamp: Date.now(),
    };

    this.broadcastToRoom(roomId, leaveMessage);

    // Add system message
    this.addSystemMessage(roomId, `${this.myDisplayName} left the room`);

    // Remove from local room
    room.members.delete(this.myPeerId);

    // Remove room if empty
    if (room.members.size === 0) {
      this.chatRooms.delete(roomId);
    }
  }

  /**
   * Get a chat room
   */
  getChatRoom(roomId: string): ChatRoom | undefined {
    return this.chatRooms.get(roomId);
  }

  /**
   * Get all chat rooms
   */
  getAllChatRooms(): ChatRoom[] {
    return Array.from(this.chatRooms.values());
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send a chat message to a room
   */
  sendChatMessage(roomId: string, content: string, type: 'text' | 'emote' = 'text'): void {
    const room = this.chatRooms.get(roomId);
    if (!room) {
      throw new Error(`Not in chat room ${roomId}`);
    }

    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      peerId: this.myPeerId,
      displayName: this.myDisplayName,
      content,
      timestamp: Date.now(),
      type,
    };

    // Add to local history
    this.addMessageToRoom(roomId, message);

    // Broadcast to all members
    const broadcast: ChatMessageBroadcast = {
      type: 'chat_message',
      message,
    };

    this.broadcastToRoom(roomId, broadcast);
  }

  /**
   * Get recent messages from a room
   */
  getRecentMessages(roomId: string, limit: number = 50): ChatMessage[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    return room.messages.slice(-limit);
  }

  /**
   * Get all messages from a room
   */
  getAllMessages(roomId: string): ChatMessage[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    return [...room.messages];
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  /**
   * Get active members in a room
   */
  getActiveMembers(roomId: string): ChatMember[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    const now = Date.now();
    const members = Array.from(room.members.values());

    return members.map(member => {
      // Update status based on last seen
      const timeSinceLastSeen = now - member.lastSeen;

      let status: 'online' | 'away' | 'offline' = 'online';
      if (timeSinceLastSeen > this.MEMBER_TIMEOUT) {
        status = 'offline';
      } else if (timeSinceLastSeen > 30000) {
        status = 'away';
      }

      return { ...member, status };
    });
  }

  /**
   * Get online member count
   */
  getOnlineMemberCount(roomId: string): number {
    return this.getActiveMembers(roomId).filter(m => m.status === 'online').length;
  }

  // ============================================================================
  // Network Message Handling
  // ============================================================================

  /**
   * Handle incoming chat message from network
   */
  handleNetworkMessage(peerId: PeerId, message: ChatNetworkMessage): void {
    switch (message.type) {
      case 'chat_join':
        this.handleChatJoin(peerId, message);
        break;

      case 'chat_leave':
        this.handleChatLeave(message);
        break;

      case 'chat_message':
        this.handleChatMessage(message);
        break;

      case 'chat_member_list_request':
        this.handleMemberListRequest(peerId, message);
        break;

      case 'chat_member_list_response':
        this.handleMemberListResponse(message);
        break;

      case 'chat_presence':
        this.handlePresenceUpdate(message);
        break;
    }
  }

  /**
   * Handle chat join
   */
  private handleChatJoin(peerId: PeerId, message: ChatJoinMessage): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    // Add member to room
    room.members.set(message.peerId, {
      peerId: message.peerId,
      displayName: message.displayName,
      joinedAt: message.timestamp,
      lastSeen: message.timestamp,
      status: 'online',
    });

    // Add system message
    this.addSystemMessage(message.roomId, `${message.displayName} joined the room`);

    // Send our member info back
    this.sendMemberInfo(peerId, message.roomId);
  }

  /**
   * Handle chat leave
   */
  private handleChatLeave(message: ChatLeaveMessage): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    const member = room.members.get(message.peerId);
    if (member) {
      // Add system message
      this.addSystemMessage(message.roomId, `${member.displayName} left the room`);

      // Remove member
      room.members.delete(message.peerId);
    }
  }

  /**
   * Handle incoming chat message
   */
  private handleChatMessage(message: ChatMessageBroadcast): void {
    const chatMessage = message.message;
    const room = this.chatRooms.get(chatMessage.roomId);
    if (!room) return;

    // Add message to history (if not duplicate)
    if (!room.messages.find(m => m.id === chatMessage.id)) {
      this.addMessageToRoom(chatMessage.roomId, chatMessage);

      // Update member last seen
      const member = room.members.get(chatMessage.peerId);
      if (member) {
        member.lastSeen = chatMessage.timestamp;
        member.status = 'online';
      }
    }
  }

  /**
   * Handle member list request
   */
  private handleMemberListRequest(peerId: PeerId, message: ChatMemberListRequest): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    // Send our member list to requester
    const response: ChatMemberListResponse = {
      type: 'chat_member_list_response',
      roomId: message.roomId,
      members: Array.from(room.members.values()),
    };

    this.sendMessage(peerId, response);
  }

  /**
   * Handle member list response
   */
  private handleMemberListResponse(message: ChatMemberListResponse): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    // Merge members
    for (const member of message.members) {
      if (!room.members.has(member.peerId)) {
        room.members.set(member.peerId, member);
      }
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(message: ChatPresenceUpdate): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    const member = room.members.get(message.peerId);
    if (member) {
      member.status = message.status;
      member.lastSeen = message.timestamp;
    }
  }

  // ============================================================================
  // Presence Management
  // ============================================================================

  /**
   * Start presence updates
   */
  private startPresenceUpdates(): void {
    if (this.presenceInterval) return;

    this.presenceInterval = setInterval(() => {
      this.updatePresence();
    }, this.PRESENCE_UPDATE_INTERVAL);
  }

  /**
   * Stop presence updates
   */
  private stopPresenceUpdates(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  /**
   * Update presence for all rooms
   */
  private updatePresence(): void {
    const now = Date.now();

    for (const room of this.chatRooms.values()) {
      // Update our own last seen
      const self = room.members.get(this.myPeerId);
      if (self) {
        self.lastSeen = now;
      }

      // Broadcast presence
      const update: ChatPresenceUpdate = {
        type: 'chat_presence',
        roomId: room.id,
        peerId: this.myPeerId,
        status: 'online',
        timestamp: now,
      };

      this.broadcastToRoom(room.id, update);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Request member list from room
   */
  private requestMemberList(roomId: string): void {
    const request: ChatMemberListRequest = {
      type: 'chat_member_list_request',
      roomId,
    };

    this.broadcastToRoom(roomId, request);
  }

  /**
   * Send member info to specific peer
   */
  private sendMemberInfo(peerId: PeerId, roomId: string): void {
    const room = this.chatRooms.get(roomId);
    if (!room) return;

    const response: ChatMemberListResponse = {
      type: 'chat_member_list_response',
      roomId,
      members: Array.from(room.members.values()),
    };

    this.sendMessage(peerId, response);
  }

  /**
   * Add message to room history
   */
  private addMessageToRoom(roomId: string, message: ChatMessage): void {
    const room = this.chatRooms.get(roomId);
    if (!room) return;

    room.messages.push(message);

    // Trim old messages
    if (room.messages.length > room.maxMessages) {
      room.messages = room.messages.slice(-room.maxMessages);
    }
  }

  /**
   * Add system message to room
   */
  private addSystemMessage(roomId: string, content: string): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      peerId: 'system',
      displayName: 'System',
      content,
      timestamp: Date.now(),
      type: 'system',
    };

    this.addMessageToRoom(roomId, message);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPresenceUpdates();

    // Leave all rooms
    for (const roomId of this.chatRooms.keys()) {
      this.leaveChatRoom(roomId);
    }

    this.chatRooms.clear();
  }
}
