/**
 * AngelPhonePanel - "God's Phone"
 *
 * Phase 28.6: Divine communication interface for deity-angel messaging.
 *
 * Features:
 * - Group chat with all angels
 * - 1:1 DMs with individual angels
 * - Message history with timestamps
 * - Unread message indicators
 * - Angel typing indicators
 *
 * Design:
 * - Left panel: Chat room list (group, DMs)
 * - Right panel: Message history and input
 * - Bottom: Message input bar
 */

import type { IWindowPanel } from '../IWindowPanel.js';
import { DIVINE_COLORS } from './DivineUITypes.js';

// ============================================================================
// Types
// ============================================================================

export interface PhoneChatRoom {
  id: string;
  type: 'group' | 'dm' | 'custom';
  name: string;
  participants: string[];
  lastMessageAt: number;
  unreadCount: number;
  lastMessagePreview?: string;
}

export interface PhoneChatMessage {
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

export interface PhoneAngelInfo {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  status: 'active' | 'resting' | 'disrupted';
  isTyping: boolean;
  lastPhoneCheck: number;
}

export interface AngelPhoneState {
  chatRooms: PhoneChatRoom[];
  selectedChatId: string | null;
  messages: PhoneChatMessage[];
  angels: PhoneAngelInfo[];
  inputText: string;
  playerName: string;
  playerId: string;
  currentTick: number;
}

export interface AngelPhoneCallbacks {
  onSelectChat: (chatId: string) => void;
  onSendMessage: (chatId: string, content: string) => void;
  onInputChange: (text: string) => void;
  onMarkAsRead: (chatId: string) => void;
}

// ============================================================================
// Panel Implementation
// ============================================================================

export class AngelPhonePanel implements IWindowPanel {
  private visible: boolean = false;
  private state: AngelPhoneState;
  private callbacks: AngelPhoneCallbacks;

  // Layout
  private readonly chatListWidth: number = 180;
  private readonly inputHeight: number = 40;
  private readonly padding: number = 8;
  private readonly messageHeight: number = 60;

  // Scroll state
  private chatListScrollOffset: number = 0;
  private messagesScrollOffset: number = 0;

  constructor(
    initialState: AngelPhoneState,
    callbacks: AngelPhoneCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return 'divine-phone';
  }

  getTitle(): string {
    const totalUnread = this.state.chatRooms.reduce((sum, r) => sum + r.unreadCount, 0);
    const unreadBadge = totalUnread > 0 ? ` (${totalUnread})` : '';
    return `\u{1F4F1} God's Phone${unreadBadge}`;
  }

  getDefaultWidth(): number {
    return 550;
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

  // ============================================================================
  // State Management
  // ============================================================================

  updateState(newState: Partial<AngelPhoneState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): AngelPhoneState {
    return this.state;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: unknown
  ): void {
    ctx.save();

    // Background
    ctx.fillStyle = DIVINE_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Left panel: Chat list
    this.renderChatList(ctx, 0, 0, this.chatListWidth, height);

    // Divider
    ctx.strokeStyle = DIVINE_COLORS.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.chatListWidth, 0);
    ctx.lineTo(this.chatListWidth, height);
    ctx.stroke();

    // Right panel: Messages
    const messagesX = this.chatListWidth + 1;
    const messagesWidth = width - this.chatListWidth - 1;
    const messagesHeight = height - this.inputHeight;
    this.renderMessages(ctx, messagesX, 0, messagesWidth, messagesHeight);

    // Input bar at bottom
    this.renderInputBar(ctx, messagesX, messagesHeight, messagesWidth, this.inputHeight);

    ctx.restore();
  }

  // ============================================================================
  // Chat List Rendering
  // ============================================================================

  private renderChatList(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Header
    ctx.fillStyle = DIVINE_COLORS.headerBackground;
    ctx.fillRect(x, y, width, 30);
    ctx.fillStyle = DIVINE_COLORS.textBright;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Chats', x + this.padding, y + 20);

    // Chat list
    const listY = y + 30;
    const itemHeight = 50;

    this.state.chatRooms.forEach((room, index) => {
      const itemY = listY + index * itemHeight - this.chatListScrollOffset;
      if (itemY < listY || itemY > height) return;

      const isSelected = room.id === this.state.selectedChatId;

      // Background
      ctx.fillStyle = isSelected
        ? DIVINE_COLORS.selectedBackground
        : (index % 2 === 0 ? DIVINE_COLORS.rowEven : DIVINE_COLORS.rowOdd);
      ctx.fillRect(x, itemY, width, itemHeight);

      // Icon based on type
      const icon = room.type === 'group' ? '\u{1F47C}\u{1F47C}' : '\u{1F47C}';
      ctx.font = '14px monospace';
      ctx.fillStyle = DIVINE_COLORS.textBright;
      ctx.fillText(icon, x + this.padding, itemY + 18);

      // Name
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = DIVINE_COLORS.textBright;
      const name = this.truncateText(ctx, room.name, width - 60);
      ctx.fillText(name, x + 35, itemY + 18);

      // Last message preview
      if (room.lastMessagePreview) {
        ctx.font = '10px monospace';
        ctx.fillStyle = DIVINE_COLORS.textDim;
        const preview = this.truncateText(ctx, room.lastMessagePreview, width - 20);
        ctx.fillText(preview, x + this.padding, itemY + 35);
      }

      // Unread badge
      if (room.unreadCount > 0) {
        ctx.fillStyle = DIVINE_COLORS.warning;
        ctx.beginPath();
        ctx.arc(x + width - 15, itemY + 15, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(room.unreadCount), x + width - 15, itemY + 19);
        ctx.textAlign = 'left';
      }

      // Typing indicator
      const typingAngels = this.getTypingAngels(room.id);
      if (typingAngels.length > 0) {
        ctx.fillStyle = DIVINE_COLORS.accent;
        ctx.font = 'italic 9px monospace';
        ctx.fillText('typing...', x + this.padding, itemY + 45);
      }
    });
  }

  // ============================================================================
  // Messages Rendering
  // ============================================================================

  private renderMessages(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!this.state.selectedChatId) {
      // No chat selected
      ctx.fillStyle = DIVINE_COLORS.textDim;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select a chat to view messages', x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Header with chat info
    const selectedRoom = this.state.chatRooms.find(r => r.id === this.state.selectedChatId);
    ctx.fillStyle = DIVINE_COLORS.headerBackground;
    ctx.fillRect(x, y, width, 35);

    if (selectedRoom) {
      ctx.fillStyle = DIVINE_COLORS.textBright;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(selectedRoom.name, x + this.padding, y + 22);

      // Participant count for group
      if (selectedRoom.type === 'group') {
        ctx.font = '10px monospace';
        ctx.fillStyle = DIVINE_COLORS.textDim;
        ctx.fillText(
          `${selectedRoom.participants.length} participants`,
          x + this.padding + ctx.measureText(selectedRoom.name).width + 10,
          y + 22
        );
      }
    }

    // Messages area
    const messagesY = y + 35;
    const messagesHeight = height - 35;

    // Filter messages for selected chat
    const chatMessages = this.state.messages.filter(m => m.chatId === this.state.selectedChatId);

    // Render messages from bottom
    let currentY = messagesY + messagesHeight - this.padding;

    for (let i = chatMessages.length - 1; i >= 0; i--) {
      const message = chatMessages[i];
      if (!message) continue;

      const msgHeight = this.renderMessage(ctx, message, x + this.padding, currentY, width - this.padding * 2);
      currentY -= msgHeight + 8;

      if (currentY < messagesY) break;
    }

    // Typing indicators at bottom
    const typingAngels = this.getTypingAngels(this.state.selectedChatId);
    if (typingAngels.length > 0) {
      ctx.fillStyle = DIVINE_COLORS.accent;
      ctx.font = 'italic 11px monospace';
      const typingText = typingAngels.map(a => a.name).join(', ') + ' typing...';
      ctx.fillText(typingText, x + this.padding, messagesY + messagesHeight - this.padding);
    }
  }

  private renderMessage(
    ctx: CanvasRenderingContext2D,
    message: PhoneChatMessage,
    x: number,
    bottomY: number,
    maxWidth: number
  ): number {
    const isPlayer = message.senderType === 'player';
    const bubblePadding = 8;
    const maxBubbleWidth = maxWidth * 0.75;

    // Measure text
    ctx.font = '11px monospace';
    const lines = this.wrapText(ctx, message.content, maxBubbleWidth - bubblePadding * 2);
    const textHeight = lines.length * 14;
    const bubbleHeight = textHeight + bubblePadding * 2 + 15; // Extra for name

    // Position - player messages on right, angel on left
    const bubbleWidth = Math.min(maxBubbleWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + bubblePadding * 2);
    const bubbleX = isPlayer ? x + maxWidth - bubbleWidth : x;
    const bubbleY = bottomY - bubbleHeight;

    // Bubble background
    ctx.fillStyle = isPlayer
      ? DIVINE_COLORS.playerMessageBg || '#1a4a6e'
      : DIVINE_COLORS.angelMessageBg || '#3a2a4a';
    this.roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    ctx.fill();

    // Sender name
    ctx.fillStyle = isPlayer ? DIVINE_COLORS.textBright : DIVINE_COLORS.accent;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(message.senderName, bubbleX + bubblePadding, bubbleY + 12);

    // Message text
    ctx.fillStyle = DIVINE_COLORS.textBright;
    ctx.font = '11px monospace';
    lines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + bubblePadding, bubbleY + 26 + i * 14);
    });

    // Timestamp
    ctx.fillStyle = DIVINE_COLORS.textDim;
    ctx.font = '8px monospace';
    const timeText = this.formatTimestamp(message.timestamp);
    ctx.fillText(timeText, bubbleX + bubblePadding, bubbleY + bubbleHeight - 4);

    return bubbleHeight;
  }

  // ============================================================================
  // Input Bar Rendering
  // ============================================================================

  private renderInputBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background
    ctx.fillStyle = DIVINE_COLORS.headerBackground;
    ctx.fillRect(x, y, width, height);

    // Input field background
    const inputX = x + this.padding;
    const inputY = y + 5;
    const inputWidth = width - 70;
    const inputFieldHeight = height - 10;

    ctx.fillStyle = '#2a2a3a';
    this.roundRect(ctx, inputX, inputY, inputWidth, inputFieldHeight, 5);
    ctx.fill();

    // Input text or placeholder
    ctx.font = '11px monospace';
    if (this.state.inputText) {
      ctx.fillStyle = DIVINE_COLORS.textBright;
      ctx.fillText(this.state.inputText, inputX + 8, inputY + inputFieldHeight / 2 + 4);
    } else {
      ctx.fillStyle = DIVINE_COLORS.textDim;
      ctx.fillText(
        this.state.selectedChatId ? 'Type a divine message...' : 'Select a chat first',
        inputX + 8,
        inputY + inputFieldHeight / 2 + 4
      );
    }

    // Send button
    const sendX = x + width - 55;
    const sendY = y + 5;
    const canSend = this.state.selectedChatId && this.state.inputText.trim();

    ctx.fillStyle = canSend ? DIVINE_COLORS.accent : DIVINE_COLORS.textDim;
    this.roundRect(ctx, sendX, sendY, 45, inputFieldHeight, 5);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Send', sendX + 22.5, sendY + inputFieldHeight / 2 + 4);
    ctx.textAlign = 'left';
  }

  // ============================================================================
  // Input Handling
  // ============================================================================

  handleClick(localX: number, localY: number, width: number, height: number): boolean {
    // Chat list click
    if (localX < this.chatListWidth) {
      const listY = 30;
      const itemHeight = 50;
      const clickedIndex = Math.floor((localY - listY + this.chatListScrollOffset) / itemHeight);

      if (clickedIndex >= 0 && clickedIndex < this.state.chatRooms.length) {
        const room = this.state.chatRooms[clickedIndex];
        if (room) {
          this.callbacks.onSelectChat(room.id);
          if (room.unreadCount > 0) {
            this.callbacks.onMarkAsRead(room.id);
          }
        }
        return true;
      }
    }

    // Send button click
    const messagesX = this.chatListWidth + 1;
    const inputY = height - this.inputHeight;
    const sendX = messagesX + (width - this.chatListWidth - 1) - 55;

    if (
      localX >= sendX && localX <= sendX + 45 &&
      localY >= inputY + 5 && localY <= inputY + this.inputHeight - 5
    ) {
      if (this.state.selectedChatId && this.state.inputText.trim()) {
        this.callbacks.onSendMessage(this.state.selectedChatId, this.state.inputText.trim());
        this.callbacks.onInputChange('');
        return true;
      }
    }

    return false;
  }

  handleScroll(deltaY: number, localX: number): void {
    if (localX < this.chatListWidth) {
      this.chatListScrollOffset = Math.max(0, this.chatListScrollOffset + deltaY);
    } else {
      this.messagesScrollOffset = Math.max(0, this.messagesScrollOffset + deltaY);
    }
  }

  handleKeyPress(key: string): void {
    if (key === 'Enter' && this.state.selectedChatId && this.state.inputText.trim()) {
      this.callbacks.onSendMessage(this.state.selectedChatId, this.state.inputText.trim());
      this.callbacks.onInputChange('');
    } else if (key === 'Backspace') {
      this.callbacks.onInputChange(this.state.inputText.slice(0, -1));
    } else if (key.length === 1) {
      this.callbacks.onInputChange(this.state.inputText + key);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private getTypingAngels(chatId: string): PhoneAngelInfo[] {
    const room = this.state.chatRooms.find(r => r.id === chatId);
    if (!room) return [];

    return this.state.angels.filter(
      a => room.participants.includes(a.id) && a.isTyping
    );
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    let width = ctx.measureText(text).width;
    if (width <= maxWidth) return text;

    while (width > maxWidth && text.length > 3) {
      text = text.slice(0, -4) + '...';
      width = ctx.measureText(text).width;
    }
    return text;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private formatTimestamp(tick: number): string {
    const ticksElapsed = this.state.currentTick - tick;
    const seconds = Math.floor(ticksElapsed / 20);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    if (seconds > 0) return `${seconds}s ago`;
    return 'now';
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// ============================================================================
// Default State Factory
// ============================================================================

export function createDefaultAngelPhoneState(): AngelPhoneState {
  return {
    chatRooms: [],
    selectedChatId: null,
    messages: [],
    angels: [],
    inputText: '',
    playerName: 'The Divine',
    playerId: 'deity',
    currentTick: 0,
  };
}
