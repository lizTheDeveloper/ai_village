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
  private lastMessageCount: number = 0; // Track message count for auto-scroll reset

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
    // Gradient background
    const bg = ctx.createLinearGradient(x, y, x, y + height);
    bg.addColorStop(0, 'rgba(14, 12, 28, 0.97)');
    bg.addColorStop(1, 'rgba(8, 7, 18, 0.97)');
    ctx.fillStyle = bg;
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
    // Gradient background
    const bg = ctx.createLinearGradient(x, y, x, y + height);
    bg.addColorStop(0, 'rgba(10, 8, 22, 0.6)');
    bg.addColorStop(1, 'rgba(5, 4, 14, 0.6)');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, width, height);
    // Subtle top border accent
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Get messages
    const messages = this.chatNetwork.getAllMessages(this.currentRoomId);

    if (messages.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No messages yet', x + width / 2, y + height / 2);
      this.lastMessageCount = 0;
      return;
    }

    // Reset auto-scroll when new messages arrive (this is the key fix!)
    // Even if user scrolled up, new messages will snap back to bottom
    if (messages.length > this.lastMessageCount) {
      this.autoScroll = true;
    }
    this.lastMessageCount = messages.length;

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

    // Message background — subtle stripe for non-system messages
    if (message.type === 'system') {
      ctx.fillStyle = 'rgba(255, 200, 80, 0.04)';
      ctx.fillRect(x, y, width, this.MESSAGE_HEIGHT);
      // Thin left accent for system messages
      ctx.fillStyle = 'rgba(255, 200, 80, 0.35)';
      ctx.fillRect(x, y + 4, 2, this.MESSAGE_HEIGHT - 8);
    } else if (message.type === 'emote') {
      ctx.fillStyle = 'rgba(255, 158, 255, 0.05)';
      ctx.fillRect(x, y, width, this.MESSAGE_HEIGHT);
      ctx.fillStyle = 'rgba(220, 120, 255, 0.35)';
      ctx.fillRect(x, y + 4, 2, this.MESSAGE_HEIGHT - 8);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(x, y, width, this.MESSAGE_HEIGHT);
    }
    // Subtle separator between messages
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + padding, y + this.MESSAGE_HEIGHT - 1);
    ctx.lineTo(x + width - padding, y + this.MESSAGE_HEIGHT - 1);
    ctx.stroke();

    // Timestamp
    const time = new Date(message.timestamp);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    ctx.fillStyle = 'rgba(120, 120, 150, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(timeStr, x + padding + 4, y + padding);

    // Display name + type glyph
    let nameColor = '#6abaff';
    let glyph = '';
    if (message.type === 'system') {
      nameColor = 'rgba(255, 200, 80, 0.75)';
      glyph = '⚙ ';
    } else if (message.type === 'emote') {
      nameColor = '#dc7eff';
      glyph = '✦ ';
    }

    ctx.fillStyle = nameColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      glyph + message.displayName,
      x + padding + 50,
      y + padding
    );

    // Message content
    ctx.fillStyle = message.type === 'system'
      ? 'rgba(200, 185, 120, 0.8)'
      : message.type === 'emote'
        ? 'rgba(220, 190, 255, 0.85)'
        : 'rgba(210, 210, 220, 0.9)';
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
    // Background — slightly lighter than messages area to visually separate
    const bg = ctx.createLinearGradient(x, y, x + width, y);
    bg.addColorStop(0, 'rgba(18, 14, 36, 0.7)');
    bg.addColorStop(1, 'rgba(12, 10, 26, 0.7)');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, width, height);
    // Left border separator
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();

    // Header gradient
    const headerGrad = ctx.createLinearGradient(x, y, x, y + 26);
    headerGrad.addColorStop(0, 'rgba(40, 30, 70, 0.9)');
    headerGrad.addColorStop(1, 'rgba(25, 18, 50, 0.9)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(x, y, width, 26);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 26);
    ctx.lineTo(x + width, y + 26);
    ctx.stroke();

    ctx.fillStyle = '#6abaff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MEMBERS', x + width / 2, y + 13);

    // Get members
    const members = this.chatNetwork.getActiveMembers(this.currentRoomId);

    if (members.length === 0) {
      ctx.fillStyle = 'rgba(130, 130, 160, 0.5)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No members', x + width / 2, y + 60);
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
    const dotX = x + padding + 7;
    const dotY = y + 15;

    // Subtle row bg on hover effect (every other row)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(x, y, width, 30);

    // Status indicator — softer palette with outer glow ring
    let statusColor: string;
    let glowColor: string;
    switch (member.status) {
      case 'online':
        statusColor = '#4de89a';
        glowColor = 'rgba(40, 220, 130, 0.3)';
        break;
      case 'away':
        statusColor = '#f0c040';
        glowColor = 'rgba(240, 180, 40, 0.3)';
        break;
      default: // offline
        statusColor = 'rgba(120, 100, 120, 0.6)';
        glowColor = 'rgba(0, 0, 0, 0)';
        break;
    }

    // Glow halo for online/away
    if (member.status !== 'offline') {
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Status dot
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Dark inner dot for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(dotX - 1, dotY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Display name
    ctx.fillStyle = member.status === 'offline'
      ? 'rgba(150, 140, 160, 0.55)'
      : 'rgba(210, 205, 225, 0.9)';
    ctx.font = member.status === 'online' ? '11px monospace' : '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const maxNameWidth = width - padding * 2 - 20;
    let displayName = member.displayName;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (
        ctx.measureText(displayName + '…').width > maxNameWidth &&
        displayName.length > 0
      ) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '…';
    }

    ctx.fillText(displayName, x + padding + 18, dotY);
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
    const radius = 6;
    const innerX = x + 6;
    const innerW = width - 12;
    const innerY = y + 5;
    const innerH = height - 10;

    // Outer separator line
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    // Input box with rounded corners
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, radius);

    if (this.inputFocused) {
      // Glowing background when focused
      const bg = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerH);
      bg.addColorStop(0, 'rgba(40, 30, 70, 0.85)');
      bg.addColorStop(1, 'rgba(25, 18, 50, 0.85)');
      ctx.fillStyle = bg;
      ctx.fill();
      // Glow border
      ctx.shadowColor = 'rgba(74, 158, 255, 0.4)';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = 'rgba(100, 168, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(20, 16, 40, 0.6)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(80, 70, 110, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Input text / placeholder
    const displayText = this.messageInput || 'Type a message...';
    ctx.fillStyle = this.messageInput
      ? 'rgba(220, 215, 235, 0.95)'
      : 'rgba(120, 110, 150, 0.55)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Clip text to input area
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(innerX + 2, innerY, innerW - 50, innerH, radius);
    ctx.clip();
    ctx.fillText(displayText, innerX + 10, innerY + innerH / 2);
    ctx.restore();

    // Blinking cursor — 1 Hz blink via sine wave
    if (this.inputFocused) {
      const cursorVisible = Math.sin(performance.now() / 500) > 0;
      if (cursorVisible) {
        const textWidth = ctx.measureText(this.messageInput).width;
        const cursorX = innerX + 10 + textWidth;
        if (cursorX < innerX + innerW - 50) {
          ctx.strokeStyle = 'rgba(160, 200, 255, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cursorX + 1, innerY + 5);
          ctx.lineTo(cursorX + 1, innerY + innerH - 5);
          ctx.stroke();
        }
      }
    }

    // Character count pill
    const charCount = `${this.messageInput.length}/500`;
    const countColor = this.messageInput.length > 450
      ? 'rgba(255, 120, 100, 0.7)'
      : 'rgba(100, 95, 130, 0.6)';
    ctx.fillStyle = countColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(charCount, innerX + innerW - 6, innerY + innerH / 2);
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
    // Track — subtle rounded
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, width / 2);
    ctx.fill();

    // Thumb
    const thumbHeight = Math.max(20, (height / contentHeight) * height);
    const maxScroll = contentHeight - height;
    const thumbY = maxScroll > 0
      ? y + (this.scrollY / maxScroll) * (height - thumbHeight)
      : y;

    const thumbGrad = ctx.createLinearGradient(x, thumbY, x + width, thumbY);
    thumbGrad.addColorStop(0, 'rgba(100, 168, 255, 0.55)');
    thumbGrad.addColorStop(1, 'rgba(74, 120, 220, 0.45)');
    ctx.fillStyle = thumbGrad;
    ctx.beginPath();
    ctx.roundRect(x, thumbY, width, thumbHeight, width / 2);
    ctx.fill();
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

    // Re-enable auto-scroll when near bottom (generous threshold of 50px)
    // This allows auto-scroll to kick back in when user scrolls close to bottom
    const isNearBottom = this.scrollY >= contentHeight - viewHeight - 50;
    this.autoScroll = isNearBottom;
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
