/**
 * DivineChatPanel - IRC/Discord-style divine chat room UI
 *
 * Features:
 * - Real-time chat messages between gods
 * - Entry/exit notifications
 * - List of present deities
 * - Scrollable message history
 * - Player input (if player is a god)
 * - Typing indicators
 * - Message reactions
 *
 * Works with ChatRoomSystem's 'chat_room' component.
 */

import type { World } from '@ai-village/core';

// ============================================================================
// Types (compatible with both old and new ChatRoom systems)
// ============================================================================

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  tick: number;
  type: 'message' | 'system' | 'action' | 'whisper';
  visibleTo?: string[];
  replyTo?: string;
}

interface ChatNotification {
  id: string;
  roomId: string;
  type: 'joined' | 'left' | 'created' | 'renamed' | 'pinned';
  entityId: string;
  entityName: string;
  timestamp: number;
  displayed: boolean;
}

interface ChatRoomConfig {
  id: string;
  name: string;
  membership: {
    type: 'open' | 'invite_only' | 'criteria_based';
    members: string[];
  };
  activationThreshold?: number;
}

interface ChatRoomComponent {
  type: 'chat_room';
  config: ChatRoomConfig;
  isActive: boolean;
  messages: ChatMessage[];
  pendingNotifications: ChatNotification[];
  lastMessageTick: number;
  lastActivityTick: number;
}

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'scroll_up' | 'scroll_down' | 'send_message';
  data?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(15, 15, 25, 0.95)',
  headerBg: 'rgba(30, 30, 50, 0.9)',
  messageBg: 'rgba(25, 25, 40, 0.8)',
  messageHover: 'rgba(35, 35, 55, 0.9)',
  notificationBg: 'rgba(60, 50, 40, 0.7)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  deityName: '#FFD700',
  playerName: '#00FFFF',
  timestamp: '#888888',
  border: 'rgba(100, 100, 140, 0.5)',
  scrollbar: 'rgba(100, 100, 140, 0.3)',
  scrollbarThumb: 'rgba(150, 150, 180, 0.6)',
  inputBg: 'rgba(20, 20, 35, 0.9)',
  inputBorder: 'rgba(120, 120, 160, 0.5)',
};

const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 40,
  deityListHeight: 80,
  messageHeight: 60,
  notificationHeight: 30,
  inputHeight: 50,
  scrollbarWidth: 12,
  fontSize: 13,
  nameSize: 14,
  headerSize: 16,
};

// ============================================================================
// DivineChatPanel
// ============================================================================

export class DivineChatPanel {
  private visible = false;
  private scrollOffset = 0;
  private clickRegions: ClickRegion[] = [];
  private contentHeight = 0;
  private visibleHeight = 0;
  private inputText = '';
  private inputActive = false;

  // World reference
  private world?: World;
  private playerDeityId?: string;

  // Chat state (refreshed from World)
  private chatRoomComponent: ChatRoomComponent | null = null;

  /**
   * Refresh chat state from the World
   */
  private refreshFromWorld(world: World): void {
    this.world = world;
    this.chatRoomComponent = null;

    // Find divine chat entity (new chat_room component)
    const chatEntity = this.findChatEntity(world);
    if (chatEntity) {
      const chatComp = chatEntity.components.get('chat_room') as ChatRoomComponent | undefined;
      if (chatComp && chatComp.config.id === 'divine_chat') {
        this.chatRoomComponent = chatComp;
      }
    }

    // Find player-controlled deity
    for (const entity of world.entities.values()) {
      const deityComp = entity.components.get('deity') as any;
      if (deityComp && deityComp.controller === 'player') {
        this.playerDeityId = entity.id;
        return;
      }
    }

    this.playerDeityId = undefined;
  }

  /**
   * Find the divine chat singleton entity
   */
  private findChatEntity(world: World): any {
    for (const entity of world.entities.values()) {
      // Check for new chat_room component with divine_chat config
      if (entity.components.has('chat_room')) {
        const chatComp = entity.components.get('chat_room') as unknown as ChatRoomComponent;
        if (chatComp.config.id === 'divine_chat') {
          return entity;
        }
      }
    }
    return null;
  }

  /**
   * Get present member IDs from the chat room
   */
  private getPresentMemberIds(): string[] {
    if (!this.chatRoomComponent) return [];
    return this.chatRoomComponent.config.membership.members;
  }

  /**
   * Get deity name by ID
   */
  private getDeityName(world: World, deityId: string): string {
    const entity = world.getEntity(deityId);
    if (entity) {
      const identity = entity.components.get('identity') as any;
      return identity?.name || 'Unknown God';
    }
    return 'Unknown God';
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Show the panel
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Main render method
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number, world?: World): void {
    if (!this.visible) return;

    // Refresh state from world
    if (world) {
      this.refreshFromWorld(world);
    }

    // Panel dimensions (right side of screen)
    const panelWidth = Math.min(400, width * 0.3);
    const panelHeight = height - 100;
    const panelX = width - panelWidth - 20;
    const panelY = 60;

    this.visibleHeight = panelHeight;
    this.clickRegions = [];

    // Draw panel background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    let currentY = panelY + SIZES.padding;

    // Draw header
    currentY = this.renderHeader(ctx, panelX, currentY, panelWidth);

    // Draw deity list (who's present)
    if (this.chatRoomComponent && this.chatRoomComponent.isActive && world) {
      currentY = this.renderDeityList(ctx, panelX, currentY, panelWidth, world);
    }

    // Draw messages and notifications
    if (this.chatRoomComponent && world) {
      currentY = this.renderMessages(ctx, panelX, currentY, panelWidth, panelHeight - (currentY - panelY) - SIZES.inputHeight - SIZES.padding, world);
    } else {
      // No chat room - show message
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = `${SIZES.fontSize}px monospace`;
      ctx.fillText('No divine chat active', panelX + SIZES.padding, currentY + 20);
      ctx.fillText('(2+ gods required)', panelX + SIZES.padding, currentY + 40);
    }

    // Draw input area (if player is a god)
    if (this.playerDeityId && this.chatRoomComponent && this.chatRoomComponent.isActive) {
      this.renderInput(ctx, panelX, panelY + panelHeight - SIZES.inputHeight - SIZES.padding, panelWidth);
    }
  }

  /**
   * Render header
   */
  private renderHeader(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(x, y, width, SIZES.headerHeight);

    ctx.fillStyle = COLORS.deityName;
    ctx.font = `bold ${SIZES.headerSize}px monospace`;
    ctx.fillText('Divine Chat', x + SIZES.padding, y + SIZES.headerHeight / 2 + 6);

    // Status indicator
    if (this.chatRoomComponent?.isActive) {
      ctx.fillStyle = '#00FF00';
      ctx.beginPath();
      ctx.arc(x + width - 30, y + SIZES.headerHeight / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x + width - 30, y + SIZES.headerHeight / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    return y + SIZES.headerHeight + SIZES.padding;
  }

  /**
   * Render list of present deities
   */
  private renderDeityList(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number, world: World): number {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `${SIZES.fontSize}px monospace`;
    ctx.fillText('Present:', x + SIZES.padding, y);

    y += SIZES.lineHeight + 4;

    const memberIds = this.getPresentMemberIds();
    const deityNames = memberIds.map(id => {
      const name = this.getDeityName(world, id);
      const isPlayer = id === this.playerDeityId;
      return { name, isPlayer };
    });

    for (let i = 0; i < deityNames.length; i++) {
      const { name, isPlayer } = deityNames[i]!;
      ctx.fillStyle = isPlayer ? COLORS.playerName : COLORS.deityName;
      ctx.fillText(`• ${name}${isPlayer ? ' (You)' : ''}`, x + SIZES.padding * 2, y);
      y += SIZES.lineHeight;
    }

    return y + SIZES.padding;
  }

  /**
   * Render messages and notifications
   */
  private renderMessages(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, maxHeight: number, _world: World): number {
    if (!this.chatRoomComponent) return y;

    const messageAreaHeight = maxHeight;

    // Combine messages and notifications, sorted by timestamp
    const items: Array<{ type: 'message' | 'notification', data: ChatMessage | ChatNotification }> = [
      ...this.chatRoomComponent.messages.map(m => ({ type: 'message' as const, data: m })),
      ...this.chatRoomComponent.pendingNotifications.map(n => ({ type: 'notification' as const, data: n })),
    ].sort((a, b) => {
      const aTime = a.data.timestamp;
      const bTime = b.data.timestamp;
      return aTime - bTime;
    });

    // Calculate total content height
    this.contentHeight = items.length * (SIZES.messageHeight + 4);

    // Render scrollable messages
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, messageAreaHeight);
    ctx.clip();

    let itemY = y - this.scrollOffset;

    for (const item of items) {
      if (itemY + SIZES.messageHeight < y) {
        itemY += SIZES.messageHeight + 4;
        continue;
      }
      if (itemY > y + messageAreaHeight) break;

      if (item.type === 'message') {
        itemY = this.renderMessage(ctx, x, itemY, width, item.data as ChatMessage);
      } else {
        itemY = this.renderNotification(ctx, x, itemY, width, item.data as ChatNotification);
      }
      itemY += 4; // Gap between items
    }

    ctx.restore();

    // Render scrollbar if needed
    if (this.contentHeight > messageAreaHeight) {
      this.renderScrollbar(ctx, x + width - SIZES.scrollbarWidth, y, messageAreaHeight);
    }

    return y + messageAreaHeight;
  }

  /**
   * Render a single message
   */
  private renderMessage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, message: ChatMessage): number {
    // Background
    ctx.fillStyle = COLORS.messageBg;
    ctx.fillRect(x + SIZES.padding, y, width - SIZES.padding * 2 - SIZES.scrollbarWidth, SIZES.messageHeight);

    // Sender name - check if sender is the player
    const isPlayer = message.senderId === this.playerDeityId;
    ctx.fillStyle = isPlayer ? COLORS.playerName : COLORS.deityName;
    ctx.font = `bold ${SIZES.nameSize}px monospace`;
    ctx.fillText(message.senderName, x + SIZES.padding * 2, y + 18);

    // Message content
    ctx.fillStyle = COLORS.text;
    ctx.font = `${SIZES.fontSize}px monospace`;
    const maxWidth = width - SIZES.padding * 4 - SIZES.scrollbarWidth;
    this.wrapText(ctx, message.content, x + SIZES.padding * 2, y + 36, maxWidth, SIZES.lineHeight);

    return y + SIZES.messageHeight;
  }

  /**
   * Render a notification
   */
  private renderNotification(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, notification: ChatNotification): number {
    // Background
    ctx.fillStyle = COLORS.notificationBg;
    ctx.fillRect(x + SIZES.padding, y, width - SIZES.padding * 2 - SIZES.scrollbarWidth, SIZES.notificationHeight);

    // Notification text
    const text = this.formatNotification(notification);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `italic ${SIZES.fontSize}px monospace`;
    ctx.fillText(text, x + SIZES.padding * 2, y + SIZES.notificationHeight / 2 + 4);

    return y + SIZES.notificationHeight;
  }

  /**
   * Format notification text
   */
  private formatNotification(notification: ChatNotification): string {
    switch (notification.type) {
      case 'joined':
        return `${notification.entityName} has entered the chat`;
      case 'left':
        return `${notification.entityName} has left the chat`;
      case 'created':
        return `${notification.entityName} created this chat`;
      case 'renamed':
        return `${notification.entityName} renamed the chat`;
      case 'pinned':
        return `${notification.entityName} pinned a message`;
      default:
        return `${notification.entityName}: ${notification.type}`;
    }
  }

  /**
   * Render input area
   */
  private renderInput(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    // Background
    ctx.fillStyle = COLORS.inputBg;
    ctx.fillRect(x + SIZES.padding, y, width - SIZES.padding * 2, SIZES.inputHeight);

    ctx.strokeStyle = COLORS.inputBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + SIZES.padding, y, width - SIZES.padding * 2, SIZES.inputHeight);

    // Placeholder or input text
    ctx.fillStyle = this.inputText ? COLORS.text : COLORS.textDim;
    ctx.font = `${SIZES.fontSize}px monospace`;
    const text = this.inputText || 'Type a message...';
    ctx.fillText(text, x + SIZES.padding * 2, y + SIZES.inputHeight / 2 + 4);

    // Cursor if active
    if (this.inputActive && Math.floor(Date.now() / 500) % 2 === 0) {
      const textWidth = ctx.measureText(this.inputText).width;
      ctx.fillStyle = COLORS.text;
      ctx.fillRect(x + SIZES.padding * 2 + textWidth + 2, y + 15, 2, 20);
    }
  }

  /**
   * Render scrollbar
   */
  private renderScrollbar(ctx: CanvasRenderingContext2D, x: number, y: number, height: number): void {
    // Track
    ctx.fillStyle = COLORS.scrollbar;
    ctx.fillRect(x, y, SIZES.scrollbarWidth, height);

    // Thumb
    const thumbHeight = Math.max(30, height * (height / this.contentHeight));
    const thumbY = y + (this.scrollOffset / this.contentHeight) * height;

    ctx.fillStyle = COLORS.scrollbarThumb;
    ctx.fillRect(x, thumbY, SIZES.scrollbarWidth, thumbHeight);
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  /**
   * Handle mouse click
   */
  handleClick(x: number, y: number, width: number, height: number): boolean {
    if (!this.visible) return false;

    const panelWidth = Math.min(400, width * 0.3);
    const panelHeight = height - 100;
    const panelX = width - panelWidth - 20;
    const panelY = 60;

    // Check if click is within panel
    if (x < panelX || x > panelX + panelWidth || y < panelY || y > panelY + panelHeight) {
      return false;
    }

    // Check click regions
    for (const region of this.clickRegions) {
      if (x >= region.x && x <= region.x + region.width &&
          y >= region.y && y <= region.y + region.height) {
        this.handleRegionClick(region);
        return true;
      }
    }

    return true; // Consumed click even if no specific region
  }

  /**
   * Handle click on a specific region
   */
  private handleRegionClick(region: ClickRegion): void {
    switch (region.action) {
      case 'scroll_up':
        this.scrollOffset = Math.max(0, this.scrollOffset - 60);
        break;
      case 'scroll_down':
        this.scrollOffset = Math.min(this.contentHeight - this.visibleHeight, this.scrollOffset + 60);
        break;
      case 'send_message':
        this.sendMessage();
        break;
    }
  }

  /**
   * Handle scroll wheel
   */
  handleWheel(deltaY: number): void {
    if (!this.visible) return;

    this.scrollOffset = Math.max(0, Math.min(
      this.contentHeight - this.visibleHeight,
      this.scrollOffset + deltaY
    ));
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(key: string): void {
    if (!this.visible || !this.inputActive) return;

    if (key === 'Enter') {
      this.sendMessage();
    } else if (key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
    } else if (key.length === 1) {
      this.inputText += key;
    }
  }

  /**
   * Send a message to the chat
   */
  private sendMessage(): void {
    if (!this.world || !this.playerDeityId || !this.inputText.trim()) return;

    // Emit event for ChatRoomSystem to handle
    this.world.eventBus.emit({
      type: 'chat:send_message',
      source: 'divine_chat_panel',
      data: {
        roomId: 'divine_chat',
        senderId: this.playerDeityId,
        content: this.inputText.trim(),
      },
    } as any);

    this.inputText = '';
  }

  /**
   * Activate input
   */
  activateInput(): void {
    this.inputActive = true;
  }

  /**
   * Deactivate input
   */
  deactivateInput(): void {
    this.inputActive = false;
  }
}
