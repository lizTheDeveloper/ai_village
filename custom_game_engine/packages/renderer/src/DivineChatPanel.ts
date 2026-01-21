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

import type { World, DeityComponent, IdentityComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

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
  notificationHeight: 36,  // Increased to allow for text wrapping
  inputHeight: 50,
  scrollbarWidth: 12,
  fontSize: 13,
  nameSize: 14,
  headerSize: 16,
};

// ============================================================================
// DivineChatPanel
// ============================================================================

export class DivineChatPanel implements IWindowPanel {
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

  // Track input area bounds for click detection
  private inputBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Track last render bounds for click handling
  private lastRenderBounds: { x: number; y: number; width: number; height: number } | null = null;

  /**
   * Refresh chat state from the World
   * PERFORMANCE: Uses ECS query to get only deity entities (avoids full scan)
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
    const deityEntities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deityEntities) {
      const deityComp = entity.components.get('deity') as DeityComponent | undefined;
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
      const identity = entity.components.get('identity') as IdentityComponent | undefined;
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

  getId(): string {
    return 'divine-chat';
  }

  getTitle(): string {
    return 'Divine Chat';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 600;
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Main render method
   */
  render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, world?: any): void {
    if (!this.visible) {
      return;
    }

    // Refresh state from world
    if (world) {
      this.refreshFromWorld(world);
    }

    // Use the provided window bounds - panel fills the window content area
    const panelX = x;
    const panelY = y;
    const panelWidth = width;
    const panelHeight = height;

    // Store render bounds for click handling
    this.lastRenderBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };

    this.visibleHeight = panelHeight;
    this.clickRegions = [];
    this.inputBounds = null;

    // Draw a visible background so we can see the panel
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Background is handled by window frame, just draw content
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
      ctx.fillText('(waiting for deities)', panelX + SIZES.padding, currentY + 40);
    }

    // Draw input area - always show it but indicate status
    const inputY = panelY + panelHeight - SIZES.inputHeight - SIZES.padding;

    const canChat = this.playerDeityId && this.chatRoomComponent && this.chatRoomComponent.isActive;

    if (canChat) {
      this.renderInput(ctx, panelX, inputY, panelWidth);
      // Store input bounds for click detection
      this.inputBounds = {
        x: panelX + SIZES.padding,
        y: inputY,
        width: panelWidth - SIZES.padding * 2,
        height: SIZES.inputHeight
      };
    } else {
      // Show disabled input with explanation
      ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
      ctx.fillRect(panelX + SIZES.padding, inputY, panelWidth - SIZES.padding * 2, SIZES.inputHeight);

      ctx.strokeStyle = 'rgba(80, 80, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX + SIZES.padding, inputY, panelWidth - SIZES.padding * 2, SIZES.inputHeight);

      ctx.fillStyle = COLORS.textDim;
      ctx.font = `${SIZES.fontSize}px monospace`;

      // Show specific reason why chat is disabled
      let reason = 'Chat unavailable';
      if (!this.playerDeityId) {
        reason = 'You must be a deity to chat';
      } else if (!this.chatRoomComponent) {
        reason = 'No divine chat room exists';
      } else if (!this.chatRoomComponent.isActive) {
        reason = 'Chat inactive (waiting for gods)';
      }
      ctx.fillText(reason, panelX + SIZES.padding * 2, inputY + SIZES.inputHeight / 2 + 4);
    }
  }

  /**
   * Render header
   */
  renderHeader(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
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
  private renderDeityList(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, world: World): number {
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

    const maxNameWidth = width - SIZES.padding * 3 - SIZES.scrollbarWidth;

    for (let i = 0; i < deityNames.length; i++) {
      const { name, isPlayer } = deityNames[i]!;
      ctx.fillStyle = isPlayer ? COLORS.playerName : COLORS.deityName;
      const displayName = `• ${name}${isPlayer ? ' (You)' : ''}`;
      // Wrap text instead of truncating
      const lines = this.wrapTextToLines(ctx, displayName, maxNameWidth);
      for (const line of lines) {
        ctx.fillText(line, x + SIZES.padding * 2, y);
        y += SIZES.lineHeight;
      }
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
    const contentWidth = width - SIZES.padding * 2 - SIZES.scrollbarWidth;
    const maxTextWidth = contentWidth - SIZES.padding * 2;

    // Calculate heights for wrapped text
    const isPlayer = message.senderId === this.playerDeityId;
    ctx.font = `bold ${SIZES.nameSize}px monospace`;
    const nameLines = this.wrapTextToLines(ctx, message.senderName, maxTextWidth);

    ctx.font = `${SIZES.fontSize}px monospace`;
    const contentLines = this.wrapTextToLines(ctx, message.content, maxTextWidth);

    // Calculate total height needed
    const nameHeight = nameLines.length * SIZES.lineHeight;
    const contentHeight = contentLines.length * SIZES.lineHeight;
    const totalHeight = Math.max(SIZES.messageHeight, nameHeight + contentHeight + SIZES.padding * 2);

    // Background
    ctx.fillStyle = COLORS.messageBg;
    ctx.fillRect(x + SIZES.padding, y, contentWidth, totalHeight);

    // Sender name with wrapping
    ctx.fillStyle = isPlayer ? COLORS.playerName : COLORS.deityName;
    ctx.font = `bold ${SIZES.nameSize}px monospace`;
    let textY = y + SIZES.lineHeight;
    for (const line of nameLines) {
      ctx.fillText(line, x + SIZES.padding * 2, textY);
      textY += SIZES.lineHeight;
    }

    // Message content with wrapping
    ctx.fillStyle = COLORS.text;
    ctx.font = `${SIZES.fontSize}px monospace`;
    for (const line of contentLines) {
      ctx.fillText(line, x + SIZES.padding * 2, textY);
      textY += SIZES.lineHeight;
    }

    return y + totalHeight;
  }

  /**
   * Render a notification
   */
  private renderNotification(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, notification: ChatNotification): number {
    // Notification text with wrapping
    const text = this.formatNotification(notification);
    ctx.font = `italic ${SIZES.fontSize}px monospace`;

    const contentWidth = width - SIZES.padding * 2 - SIZES.scrollbarWidth;
    const maxTextWidth = contentWidth - SIZES.padding * 2;

    // Calculate wrapped lines to determine height
    const lines = this.wrapTextToLines(ctx, text, maxTextWidth);
    const notificationHeight = Math.max(SIZES.notificationHeight, lines.length * SIZES.lineHeight + SIZES.padding);

    // Background
    ctx.fillStyle = COLORS.notificationBg;
    ctx.fillRect(x + SIZES.padding, y, contentWidth, notificationHeight);

    // Render wrapped text
    ctx.fillStyle = COLORS.textMuted;
    let textY = y + SIZES.lineHeight;
    for (const line of lines) {
      ctx.fillText(line, x + SIZES.padding * 2, textY);
      textY += SIZES.lineHeight;
    }

    return y + notificationHeight;
  }

  /**
   * Wrap text to fit within maxWidth, returning array of lines
   */
  private wrapTextToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
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
    ctx.fillStyle = this.inputActive ? 'rgba(30, 30, 50, 0.95)' : COLORS.inputBg;
    ctx.fillRect(x + SIZES.padding, y, width - SIZES.padding * 2, SIZES.inputHeight);

    // Border - highlight when active
    ctx.strokeStyle = this.inputActive ? '#FFD700' : COLORS.inputBorder;
    ctx.lineWidth = this.inputActive ? 2 : 1;
    ctx.strokeRect(x + SIZES.padding, y, width - SIZES.padding * 2, SIZES.inputHeight);

    // Placeholder or input text
    ctx.fillStyle = this.inputText ? COLORS.text : COLORS.textDim;
    ctx.font = `${SIZES.fontSize}px monospace`;
    const placeholder = this.inputActive ? 'Type and press Enter to send...' : 'Click here to type...';
    const text = this.inputText || placeholder;
    ctx.fillText(text, x + SIZES.padding * 2, y + SIZES.inputHeight / 2 + 4);

    // Cursor if active
    if (this.inputActive && Math.floor(Date.now() / 500) % 2 === 0) {
      const textWidth = ctx.measureText(this.inputText).width;
      ctx.fillStyle = COLORS.text;
      ctx.fillRect(x + SIZES.padding * 2 + textWidth + 2, y + 15, 2, 20);
    }

    // Help text when not active
    if (!this.inputActive && !this.inputText) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = `${SIZES.fontSize - 2}px monospace`;
      ctx.fillText('(press G to toggle chat)', x + SIZES.padding * 2, y + SIZES.inputHeight - 8);
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
   * Handle mouse click (x, y are in panel-local coordinates)
   */
  handleClick(localX: number, localY: number, _width: number, _height: number): boolean {
    if (!this.visible) return false;

    // Use stored render bounds for accurate click detection
    if (!this.lastRenderBounds) return false;

    const bounds = this.lastRenderBounds;

    // Convert to absolute coordinates (local coords are relative to panel origin)
    const x = bounds.x + localX;
    const y = bounds.y + localY;

    // Check if click is on input area
    if (this.inputBounds) {
      if (x >= this.inputBounds.x && x <= this.inputBounds.x + this.inputBounds.width &&
          y >= this.inputBounds.y && y <= this.inputBounds.y + this.inputBounds.height) {
        this.inputActive = true;
        return true;
      } else {
        // Clicked elsewhere in panel - deactivate input
        this.inputActive = false;
      }
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
        message: this.inputText.trim(),
      },
    });

    this.inputText = '';
  }

  /**
   * Check if input is currently active (focused)
   */
  isInputActive(): boolean {
    return this.inputActive;
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
