/**
 * ChatPanel - UI for GodChatRoomNetwork
 *
 * Provides chat interface for god/player communication across universes.
 */

import type { IWindowPanel } from './IWindowPanel.js';
import type { World, GodChatRoomNetwork } from '@ai-village/core';

// Use inline types to avoid conflict with communication/ChatRoom's ChatMessage
interface GodChatMessage {
  id: string;
  roomId: string;
  peerId: string;
  displayName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'emote';
}

interface GodChatMember {
  peerId: string;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
  status: 'online' | 'away' | 'offline';
}

export class ChatPanel implements IWindowPanel {
  private visible: boolean = false;
  private chatNetwork: GodChatRoomNetwork;
  private currentRoomId: string = 'main';

  // UI state
  private messageInput: string = '';
  private inputFocused: boolean = false;
  private scrollY: number = 0;
  private autoScroll: boolean = true;

  // Display settings
  private readonly MESSAGE_HEIGHT = 50;
  private readonly INPUT_HEIGHT = 40;
  private readonly MEMBER_LIST_WIDTH = 150;

  constructor(chatNetwork: GodChatRoomNetwork, defaultRoomId: string = 'main') {
    this.chatNetwork = chatNetwork;
    this.currentRoomId = defaultRoomId;

    // Join default room
    this.chatNetwork.joinChatRoom(this.currentRoomId, 'Main Chat');
  }

  // ============================================================================
  // IWindowPanel Interface
  // ============================================================================

  getId(): string {
    return 'chat-panel';
  }

  getTitle(): string {
    const room = this.chatNetwork.getChatRoom(this.currentRoomId);
    const onlineCount = this.chatNetwork.getOnlineMemberCount(this.currentRoomId);
    return `Chat: ${room?.name || 'Unknown'} (${onlineCount} online)`;
  }

  getDefaultWidth(): number {
    return 600;
  }

  getDefaultHeight(): number {
    return 400;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: World
  ): void {
    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Calculate layout areas
    const chatAreaWidth = width - this.MEMBER_LIST_WIDTH - 10;
    const chatAreaHeight = height - this.INPUT_HEIGHT - 10;

    // Render messages area
    this.renderMessages(ctx, x, y, chatAreaWidth, chatAreaHeight);

    // Render member list
    this.renderMemberList(
      ctx,
      x + chatAreaWidth + 10,
      y,
      this.MEMBER_LIST_WIDTH,
      chatAreaHeight
    );

    // Render input area
    this.renderInput(
      ctx,
      x,
      y + chatAreaHeight + 5,
      width,
      this.INPUT_HEIGHT
    );
  }

  handleClick(x: number, y: number, _world?: World): boolean {
    const chatAreaHeight = this.getDefaultHeight() - this.INPUT_HEIGHT - 10;
    const inputY = chatAreaHeight + 5;

    // Check if clicking input area
    if (
      y >= inputY &&
      y <= inputY + this.INPUT_HEIGHT
    ) {
      this.inputFocused = true;
      return true;
    } else {
      this.inputFocused = false;
    }

    return false;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  /**
   * Render messages area
   */
  private renderMessages(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, width, height);

    // Get messages
    const messages = this.chatNetwork.getAllMessages(this.currentRoomId);

    if (messages.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No messages yet', x + width / 2, y + height / 2);
      return;
    }

    // Auto-scroll to bottom
    if (this.autoScroll) {
      const contentHeight = messages.length * this.MESSAGE_HEIGHT;
      this.scrollY = Math.max(0, contentHeight - height);
    }

    // Render messages
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let messageY = y - this.scrollY;

    for (const message of messages) {
      // Skip messages outside viewport
      if (messageY + this.MESSAGE_HEIGHT < y) {
        messageY += this.MESSAGE_HEIGHT;
        continue;
      }
      if (messageY > y + height) {
        break;
      }

      this.renderMessage(ctx, message, x, messageY, width);
      messageY += this.MESSAGE_HEIGHT;
    }

    ctx.restore();

    // Render scroll indicator
    const contentHeight = messages.length * this.MESSAGE_HEIGHT;
    if (contentHeight > height) {
      this.renderScrollbar(ctx, x + width - 10, y, 8, height, contentHeight);
    }
  }

  /**
   * Render single message
   */
  private renderMessage(
    ctx: CanvasRenderingContext2D,
    message: GodChatMessage,
    x: number,
    y: number,
    width: number
  ): void {
    const padding = 10;

    // Message background (alternating)
    if (message.type !== 'system') {
      ctx.fillStyle = '#111';
      ctx.fillRect(x, y, width, this.MESSAGE_HEIGHT);
    }

    // Timestamp
    const time = new Date(message.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(timeStr, x + padding, y + padding);

    // Display name
    let nameColor = '#4a9eff';
    if (message.type === 'system') {
      nameColor = '#888';
    } else if (message.type === 'emote') {
      nameColor = '#ff9eff';
    }

    ctx.fillStyle = nameColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      message.displayName,
      x + padding + 50,
      y + padding
    );

    // Message content
    ctx.fillStyle = message.type === 'system' ? '#888' : '#ccc';
    ctx.font = '12px monospace';

    // Word wrap message
    const maxWidth = width - padding * 2 - 50;
    const words = message.content.split(' ');
    let line = '';
    let lineY = y + padding + 16;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x + padding + 50, lineY);
        line = word + ' ';
        lineY += 14;
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      ctx.fillText(line, x + padding + 50, lineY);
    }
  }

  /**
   * Render member list
   */
  private renderMemberList(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, width, height);

    // Header
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, width, 25);

    ctx.fillStyle = '#4a9eff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Members', x + width / 2, y + 12);

    // Get members
    const members = this.chatNetwork.getActiveMembers(this.currentRoomId);

    if (members.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No members', x + width / 2, y + 50);
      return;
    }

    // Render members
    let memberY = y + 30;
    const memberHeight = 30;

    for (const member of members) {
      if (memberY + memberHeight > y + height) break;

      this.renderMember(ctx, member, x, memberY, width);
      memberY += memberHeight;
    }
  }

  /**
   * Render single member
   */
  private renderMember(
    ctx: CanvasRenderingContext2D,
    member: GodChatMember,
    x: number,
    y: number,
    width: number
  ): void {
    const padding = 5;

    // Status indicator
    let statusColor = '#888';
    switch (member.status) {
      case 'online':
        statusColor = '#0f0';
        break;
      case 'away':
        statusColor = '#ff0';
        break;
      case 'offline':
        statusColor = '#f00';
        break;
    }

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(x + padding + 6, y + 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Display name
    ctx.fillStyle = '#ccc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const maxNameWidth = width - padding * 2 - 20;
    let displayName = member.displayName;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (
        ctx.measureText(displayName + '...').width > maxNameWidth &&
        displayName.length > 0
      ) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '...';
    }

    ctx.fillText(displayName, x + padding + 16, y + 15);
  }

  /**
   * Render input area
   */
  private renderInput(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = this.inputFocused ? '#2a2a2a' : '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = this.inputFocused ? '#4a9eff' : '#444';
    ctx.lineWidth = this.inputFocused ? 2 : 1;
    ctx.strokeRect(x, y, width, height);

    // Input text
    const displayText = this.messageInput || 'Type a message...';
    ctx.fillStyle = this.messageInput ? '#fff' : '#666';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, x + 10, y + height / 2);

    // Cursor
    if (this.inputFocused) {
      const cursorX = x + 10 + ctx.measureText(this.messageInput).width;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorX, y + 8);
      ctx.lineTo(cursorX, y + height - 8);
      ctx.stroke();
    }

    // Character count
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${this.messageInput.length}/500`,
      x + width - 10,
      y + height / 2
    );
  }

  /**
   * Render scrollbar
   */
  private renderScrollbar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    contentHeight: number
  ): void {
    // Track
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, width, height);

    // Thumb
    const thumbHeight = Math.max(20, (height / contentHeight) * height);
    const thumbY = y + (this.scrollY / (contentHeight - height)) * (height - thumbHeight);

    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(x, thumbY, width, thumbHeight);
  }

  // ============================================================================
  // Input Handling
  // ============================================================================

  /**
   * Handle keyboard input
   */
  handleKeyPress(key: string): void {
    if (!this.inputFocused) return;

    if (key === 'Enter') {
      this.sendMessage();
    } else if (key === 'Backspace') {
      this.messageInput = this.messageInput.slice(0, -1);
    } else if (key.length === 1 && this.messageInput.length < 500) {
      this.messageInput += key;
      this.autoScroll = true;
    }
  }

  /**
   * Send chat message
   */
  private sendMessage(): void {
    const message = this.messageInput.trim();
    if (!message) return;

    // Check for emote command (/me)
    if (message.startsWith('/me ')) {
      const emoteText = message.substring(4);
      this.chatNetwork.sendChatMessage(this.currentRoomId, emoteText, 'emote');
    } else {
      this.chatNetwork.sendChatMessage(this.currentRoomId, message, 'text');
    }

    this.messageInput = '';
    this.autoScroll = true;
  }

  /**
   * Handle mouse wheel
   */
  handleWheel(deltaY: number): void {
    const messages = this.chatNetwork.getAllMessages(this.currentRoomId);
    const contentHeight = messages.length * this.MESSAGE_HEIGHT;
    const viewHeight = this.getDefaultHeight() - this.INPUT_HEIGHT - 10;

    this.scrollY = Math.max(
      0,
      Math.min(contentHeight - viewHeight, this.scrollY + deltaY * 0.5)
    );

    // Disable auto-scroll when manually scrolling
    const isAtBottom = this.scrollY >= contentHeight - viewHeight - 5;
    this.autoScroll = isAtBottom;
  }

  // ============================================================================
  // Chat Room Management
  // ============================================================================

  /**
   * Switch to a different chat room
   */
  switchRoom(roomId: string, roomName?: string): void {
    this.currentRoomId = roomId;

    // Join room if not already in it
    const room = this.chatNetwork.getChatRoom(roomId);
    if (!room) {
      this.chatNetwork.joinChatRoom(roomId, roomName);
    }

    this.scrollY = 0;
    this.autoScroll = true;
  }

  /**
   * Leave current room
   */
  leaveCurrentRoom(): void {
    this.chatNetwork.leaveChatRoom(this.currentRoomId);
  }
}
