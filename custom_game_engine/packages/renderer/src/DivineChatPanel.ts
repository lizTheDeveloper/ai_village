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
import { gameBridge } from '@ai-village/shared-worker';

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

  // Player ID (constant for human players chatting with angels)
  private readonly playerId = 'player';

  // Chat state (refreshed from World)
  private chatRoomComponent: ChatRoomComponent | null = null;

  // Track input area bounds for click detection
  private inputBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Track last render bounds for click handling
  private lastRenderBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Screen name input state
  private nameInputText = '';
  private nameInputActive = false;
  private nameInputBounds: { x: number; y: number; width: number; height: number } | null = null;
  private readonly PLAYER_NAME_KEY = 'divine-chat-player-name';

  // Auto-scroll tracking
  private lastMessageCount = 0;
  private autoScrollEnabled = true; // When true, scroll to bottom on new messages

  // Local cache of messages for immediate display
  // Used in both SharedWorker mode (forwarded messages) and direct mode (event subscription)
  private localMessageCache: ChatMessage[] = [];
  private chatMessageUnsubscribe: (() => void) | null = null;
  private eventBusUnsubscribe: (() => void) | null = null;

  // Hidden HTML input for speech-to-text support
  // Canvas-rendered inputs don't work with speech-to-text tools, so we use a real input
  private hiddenInput: HTMLInputElement | null = null;

  constructor() {
    // Subscribe to chat messages from the GameBridge
    // These are forwarded from the SharedWorker when path prediction is enabled
    this.chatMessageUnsubscribe = gameBridge.onChatMessage((msg) => {
      console.log('[DivineChatPanel] Received chat message from gameBridge:', {
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content?.substring(0, 50),
      });
      // Only add divine_chat messages to this panel
      if (msg.roomId === 'divine_chat') {
        this.addMessageToCache({
          id: msg.messageId,
          roomId: msg.roomId,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          timestamp: msg.timestamp,
          tick: msg.tick,
          type: 'message',
        });
      }
    });
  }

  /**
   * Add a message to the local cache for immediate display
   */
  private addMessageToCache(msg: ChatMessage): void {
    // Check if message already exists
    const exists = this.localMessageCache.some(m => m.id === msg.id);
    if (!exists) {
      console.log('[DivineChatPanel] Adding message to cache:', {
        id: msg.id,
        senderName: msg.senderName,
        content: msg.content?.substring(0, 50),
        cacheSize: this.localMessageCache.length + 1,
      });
      this.localMessageCache.push(msg);
      // Keep messages sorted by timestamp
      this.localMessageCache.sort((a, b) => a.timestamp - b.timestamp);
      // Limit cache size to prevent memory issues
      if (this.localMessageCache.length > 200) {
        this.localMessageCache = this.localMessageCache.slice(-100);
      }
      // Messages will be rendered on next tick (render happens at 20 TPS = 50ms)
    }
  }

  /**
   * Subscribe to eventBus for direct GameLoop mode
   * This ensures messages appear immediately when sent
   */
  private subscribeToEventBus(world: World): void {
    // Only subscribe once
    if (this.eventBusUnsubscribe) return;

    this.eventBusUnsubscribe = world.eventBus.on('chat:message_sent', (event) => {
      const data = event.data as {
        roomId: string;
        messageId: string;
        senderId: string;
        senderName: string;
        content: string;
      };

      // Only add messages for divine_chat room
      if (data.roomId === 'divine_chat') {
        this.addMessageToCache({
          id: data.messageId,
          roomId: data.roomId,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          timestamp: Date.now(),
          tick: world.tick,
          type: 'message',
        });
      }
    });
  }

  /**
   * Cleanup subscriptions and hidden input
   */
  destroy(): void {
    if (this.chatMessageUnsubscribe) {
      this.chatMessageUnsubscribe();
      this.chatMessageUnsubscribe = null;
    }
    if (this.eventBusUnsubscribe) {
      this.eventBusUnsubscribe();
      this.eventBusUnsubscribe = null;
    }
    if (this.hiddenInput && this.hiddenInput.parentNode) {
      this.hiddenInput.parentNode.removeChild(this.hiddenInput);
      this.hiddenInput = null;
    }
  }

  /**
   * Refresh chat state from the World
   * PERFORMANCE: Uses ECS query to get divine chat room
   */
  private refreshFromWorld(world: World): void {
    this.world = world;
    this.chatRoomComponent = null;

    // Subscribe to eventBus for direct GameLoop mode (immediate message updates)
    this.subscribeToEventBus(world);

    // Find divine chat entity (new chat_room component)
    const chatEntity = this.findChatEntity(world);
    if (chatEntity) {
      const chatComp = chatEntity.components.get('chat_room') as ChatRoomComponent | undefined;
      if (chatComp && chatComp.config.id === 'divine_chat') {
        this.chatRoomComponent = chatComp;
      }
    }
  }

  /**
   * Find the divine chat singleton entity
   * PERFORMANCE: Uses ECS query instead of scanning all entities
   */
  private findChatEntity(world: World): any {
    const chatEntities = world.query().with(CT.ChatRoom).executeEntities();
    for (const entity of chatEntities) {
      const chatComp = entity.components.get('chat_room') as unknown as ChatRoomComponent;
      if (chatComp.config.id === 'divine_chat') {
        return entity;
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
   * Get stored player name from localStorage
   */
  private getPlayerName(): string {
    return localStorage.getItem(this.PLAYER_NAME_KEY) || '';
  }

  /**
   * Set player name in localStorage (can only be done once)
   */
  private setPlayerName(name: string): void {
    if (!this.getPlayerName()) {
      localStorage.setItem(this.PLAYER_NAME_KEY, name);
    }
  }

  /**
   * Check if player has set their name
   */
  private hasPlayerName(): boolean {
    return !!this.getPlayerName();
  }

  /**
   * Get deity name by ID (or player name for the human player)
   */
  private getDeityName(world: World, deityId: string): string {
    // Handle human player ID
    if (deityId === this.playerId) {
      const playerName = this.getPlayerName();
      // Don't show fallback - name input is shown until player enters name
      return playerName || '(enter name above)';
    }

    // Handle deity entities
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

    // Draw name input if player hasn't set their name yet
    if (!this.hasPlayerName()) {
      currentY = this.renderNameInput(ctx, panelX, currentY, panelWidth);
    }

    // Draw deity list (who's present)
    if (this.chatRoomComponent && this.chatRoomComponent.isActive && world) {
      currentY = this.renderDeityList(ctx, panelX, currentY, panelWidth, world);
    }

    // Draw messages and notifications
    // Always render messages - this includes localMessageCache even if chatRoomComponent is null
    // Reserve space for input area at bottom: inputHeight + extra padding to prevent overlap
    if (world) {
      // Ensure minimum message area height of 50px to prevent layout issues with negative values
      // Reserve extra padding (SIZES.padding * 3) to create clear visual separation from input
      const messageAreaMaxHeight = Math.max(50, panelHeight - (currentY - panelY) - SIZES.inputHeight - SIZES.padding * 3);
      currentY = this.renderMessages(ctx, panelX, currentY, panelWidth, messageAreaMaxHeight, world);
    }

    // Draw input area at the bottom
    const inputY = panelY + panelHeight - SIZES.inputHeight - SIZES.padding;

    // Always render input - chat always available via optimistic updates
    this.renderInput(ctx, panelX, inputY, panelWidth);
    // Store input bounds for click detection
    this.inputBounds = {
      x: panelX + SIZES.padding,
      y: inputY,
      width: panelWidth - SIZES.padding * 2,
      height: SIZES.inputHeight
    };
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
   * Constrained to SIZES.deityListHeight maximum to prevent layout overflow
   */
  private renderDeityList(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, world: World): number {
    const startY = y;
    const maxHeight = SIZES.deityListHeight; // Maximum height for deity list

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `${SIZES.fontSize}px monospace`;
    ctx.fillText('Present:', x + SIZES.padding, y);

    y += SIZES.lineHeight + 4;

    const memberIds = this.getPresentMemberIds();
    const deityNames = memberIds.map(id => {
      const name = this.getDeityName(world, id);
      const isPlayer = id === this.playerId;
      return { name, isPlayer };
    });

    const maxNameWidth = width - SIZES.padding * 3 - SIZES.scrollbarWidth;
    let truncated = false;

    for (let i = 0; i < deityNames.length; i++) {
      const { name, isPlayer } = deityNames[i]!;
      ctx.fillStyle = isPlayer ? COLORS.playerName : COLORS.deityName;
      const displayName = `• ${name}${isPlayer ? ' (You)' : ''}`;
      // Wrap text instead of truncating
      const lines = this.wrapTextToLines(ctx, displayName, maxNameWidth);
      for (const line of lines) {
        // Check if we've exceeded max height (with padding for "..." indicator)
        if (y - startY >= maxHeight - SIZES.lineHeight) {
          truncated = true;
          break;
        }
        ctx.fillText(line, x + SIZES.padding * 2, y);
        y += SIZES.lineHeight;
      }
      if (truncated) break;
    }

    // Show truncation indicator if we couldn't fit all deities
    if (truncated) {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(`... +${deityNames.length - memberIds.indexOf(deityNames.find(d => d.name)?.name ?? '') - 1} more`, x + SIZES.padding * 2, y);
      y += SIZES.lineHeight;
    }

    return startY + Math.min(y - startY, maxHeight) + SIZES.padding;
  }

  /**
   * Render messages and notifications
   */
  private renderMessages(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, maxHeight: number, _world: World): number {
    const messageAreaHeight = maxHeight;

    // Merge messages from component and local cache, deduplicating by ID
    // The local cache receives messages immediately via eventBus subscription
    // The component messages are the authoritative source (loaded from localStorage)
    // IMPORTANT: Show cached messages even if chatRoomComponent is null
    const componentMessages = this.chatRoomComponent?.messages ?? [];
    const seenIds = new Set<string>();
    const allMessages: ChatMessage[] = [];

    // Add component messages first (authoritative)
    for (const msg of componentMessages) {
      if (!seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        allMessages.push(msg);
      }
    }

    // Add cached messages (may include messages not yet in component due to timing)
    for (const msg of this.localMessageCache) {
      if (!seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        allMessages.push(msg);
      }
    }

    // Early return only if there are no messages at all (neither cached nor from component)
    if (allMessages.length === 0 && (!this.chatRoomComponent || this.chatRoomComponent.pendingNotifications.length === 0)) {
      return y;
    }

    // Combine messages and notifications, sorted by timestamp
    const pendingNotifications = this.chatRoomComponent?.pendingNotifications ?? [];
    const items: Array<{ type: 'message' | 'notification', data: ChatMessage | ChatNotification }> = [
      ...allMessages.map(m => ({ type: 'message' as const, data: m })),
      ...pendingNotifications.map(n => ({ type: 'notification' as const, data: n })),
    ].sort((a, b) => {
      const aTime = a.data.timestamp;
      const bTime = b.data.timestamp;
      return aTime - bTime;
    });

    // Calculate total content height by measuring actual wrapped heights
    let totalContentHeight = 0;
    const contentWidth = width - SIZES.padding * 2 - SIZES.scrollbarWidth;
    const maxTextWidth = contentWidth - SIZES.padding * 2;

    for (const item of items) {
      if (item.type === 'message') {
        const msg = item.data as ChatMessage;
        ctx.font = `bold ${SIZES.nameSize}px monospace`;
        const nameLines = this.wrapTextToLines(ctx, msg.senderName, maxTextWidth);
        ctx.font = `${SIZES.fontSize}px monospace`;
        const contentLines = this.wrapTextToLines(ctx, msg.content, maxTextWidth);
        const nameHeight = nameLines.length * SIZES.lineHeight;
        const contentHeight = contentLines.length * SIZES.lineHeight;
        totalContentHeight += Math.max(SIZES.messageHeight, nameHeight + contentHeight + SIZES.padding * 2) + 4;
      } else {
        const notif = item.data as ChatNotification;
        const text = this.formatNotification(notif);
        ctx.font = `italic ${SIZES.fontSize}px monospace`;
        const lines = this.wrapTextToLines(ctx, text, maxTextWidth);
        totalContentHeight += Math.max(SIZES.notificationHeight, lines.length * SIZES.lineHeight + SIZES.padding) + 4;
      }
    }

    // Add bottom padding to ensure the last message isn't cut off when scrolled to bottom
    this.contentHeight = totalContentHeight + SIZES.padding;
    this.visibleHeight = messageAreaHeight;

    // Auto-scroll to bottom when new messages arrive (if auto-scroll is enabled)
    const currentMessageCount = items.length;
    const maxScroll = Math.max(0, this.contentHeight - messageAreaHeight);

    // Re-enable auto-scroll when new messages arrive
    if (currentMessageCount > this.lastMessageCount) {
      this.autoScrollEnabled = true;
    }

    // Apply auto-scroll if enabled
    if (this.autoScrollEnabled) {
      this.scrollOffset = maxScroll;
    }

    this.lastMessageCount = currentMessageCount;

    // Render scrollable messages
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, messageAreaHeight);
    ctx.clip();

    let itemY = y - this.scrollOffset;

    for (const item of items) {
      // Early exit if we're past the visible area
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
    const isPlayer = message.senderId === this.playerId;
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
    // Guard against undefined/null text
    if (!text) {
      return [''];
    }
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
   * Render name input (only shown if player hasn't set their name)
   */
  private renderNameInput(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    const sectionHeight = 90;
    const inputHeight = 35;

    // Background for the section
    ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
    ctx.fillRect(x + SIZES.padding, y, width - SIZES.padding * 2, sectionHeight);

    // Border around section
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + SIZES.padding, y, width - SIZES.padding * 2, sectionHeight);

    // Instruction text
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${SIZES.fontSize}px monospace`;
    ctx.fillText('Enter your name (cannot be changed):', x + SIZES.padding * 2, y + 20);

    // Input box
    const inputY = y + 30;
    ctx.fillStyle = this.nameInputActive ? 'rgba(30, 30, 50, 0.95)' : COLORS.inputBg;
    ctx.fillRect(x + SIZES.padding * 2, inputY, width - SIZES.padding * 4, inputHeight);

    // Border - highlight when active
    ctx.strokeStyle = this.nameInputActive ? '#FFD700' : COLORS.inputBorder;
    ctx.lineWidth = this.nameInputActive ? 2 : 1;
    ctx.strokeRect(x + SIZES.padding * 2, inputY, width - SIZES.padding * 4, inputHeight);

    // Placeholder or input text
    ctx.fillStyle = this.nameInputText ? COLORS.text : COLORS.textDim;
    ctx.font = `${SIZES.fontSize}px monospace`;
    const placeholder = this.nameInputActive ? 'Type your name...' : 'Click here to enter name';
    const text = this.nameInputText || placeholder;
    ctx.fillText(text, x + SIZES.padding * 3, inputY + inputHeight / 2 + 4);

    // Cursor if active
    if (this.nameInputActive && Math.floor(Date.now() / 500) % 2 === 0) {
      const textWidth = ctx.measureText(this.nameInputText).width;
      ctx.fillStyle = COLORS.text;
      ctx.fillRect(x + SIZES.padding * 3 + textWidth + 2, inputY + 10, 2, 20);
    }

    // Help text
    ctx.fillStyle = COLORS.textDim;
    ctx.font = `${SIZES.fontSize - 2}px monospace`;
    ctx.fillText('Press Enter to confirm', x + SIZES.padding * 2, inputY + inputHeight + 15);

    // Store bounds for click detection
    this.nameInputBounds = {
      x: x + SIZES.padding * 2,
      y: inputY,
      width: width - SIZES.padding * 4,
      height: inputHeight
    };

    return y + sectionHeight + SIZES.padding;
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

    // Thumb - ensure it never extends past the track
    const thumbHeight = Math.max(30, height * (height / this.contentHeight));
    // Calculate thumb position, but cap it so thumb doesn't extend past track bottom
    const maxThumbY = y + height - thumbHeight;
    const calculatedThumbY = y + (this.scrollOffset / this.contentHeight) * height;
    const thumbY = Math.min(maxThumbY, calculatedThumbY);

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

    // Check if click is on name input area (only if name not set)
    if (!this.hasPlayerName() && this.nameInputBounds) {
      if (x >= this.nameInputBounds.x && x <= this.nameInputBounds.x + this.nameInputBounds.width &&
          y >= this.nameInputBounds.y && y <= this.nameInputBounds.y + this.nameInputBounds.height) {
        this.nameInputActive = true;
        this.inputActive = false; // Deactivate chat input
        return true;
      }
    }

    // Check if click is on chat input area
    if (this.inputBounds) {
      if (x >= this.inputBounds.x && x <= this.inputBounds.x + this.inputBounds.width &&
          y >= this.inputBounds.y && y <= this.inputBounds.y + this.inputBounds.height) {
        this.inputActive = true;
        this.nameInputActive = false; // Deactivate name input
        this.focusHiddenInput(); // Focus hidden input for speech-to-text
        return true;
      } else {
        // Clicked elsewhere in panel - deactivate both inputs
        this.inputActive = false;
        this.nameInputActive = false;
        this.blurHiddenInput();
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

    const maxScroll = Math.max(0, this.contentHeight - this.visibleHeight);

    this.scrollOffset = Math.max(0, Math.min(
      maxScroll,
      this.scrollOffset + deltaY
    ));

    // If user scrolls up, disable auto-scroll so they can read history
    if (deltaY < 0) {
      this.autoScrollEnabled = false;
    }

    // Re-enable auto-scroll when scrolled near the bottom (within 50px)
    if (this.scrollOffset >= maxScroll - 50) {
      this.autoScrollEnabled = true;
    }
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(key: string): void {
    if (!this.visible) return;

    // Handle name input field
    if (this.nameInputActive && !this.hasPlayerName()) {
      if (key === 'Enter') {
        // Confirm name
        const trimmedName = this.nameInputText.trim();
        if (trimmedName.length > 0) {
          this.setPlayerName(trimmedName);
          this.nameInputActive = false;
          this.nameInputText = '';
        }
      } else if (key === 'Backspace') {
        this.nameInputText = this.nameInputText.slice(0, -1);
      } else if (key.length === 1 && this.nameInputText.length < 20) {
        // Limit name to 20 characters
        this.nameInputText += key;
      }
      return;
    }

    // Handle chat input field
    if (this.inputActive) {
      if (key === 'Enter') {
        this.sendMessage();
      } else if (key === 'Backspace') {
        this.inputText = this.inputText.slice(0, -1);
      } else if (key.length === 1) {
        this.inputText += key;
      }
    }
  }

  /**
   * Send a message to the chat
   */
  private sendMessage(): void {
    if (!this.world || !this.inputText.trim()) return;

    // Require player name before sending messages
    if (!this.hasPlayerName()) {
      console.warn('[DivineChatPanel] Cannot send message without entering name first');
      return;
    }

    const messageContent = this.inputText.trim();
    const senderName = this.getPlayerName();

    // NOTE: We do NOT add an optimistic update here. The message will be added
    // via the chat:message_sent event from ChatRoomSystem. Adding an optimistic
    // update with a different ID causes duplicates since deduplication is by ID.

    const event = {
      type: 'chat:send_message' as const,
      source: 'divine_chat_panel',
      data: {
        roomId: 'divine_chat',
        senderId: this.playerId,
        senderName: senderName,
        message: messageContent,
      },
    };

    // Also send to ChatRoomSystem for persistence and routing to other systems
    if (gameBridge.isConnected()) {
      gameBridge.emitEvent(event);
    } else {
      // Direct mode: emit to local eventBus
      this.world.eventBus.emitImmediate(event);
    }

    this.inputText = '';
    // Also clear hidden input
    if (this.hiddenInput) {
      this.hiddenInput.value = '';
    }
  }

  /**
   * Check if input is currently active (focused)
   */
  isInputActive(): boolean {
    return this.inputActive || this.nameInputActive;
  }

  /**
   * Activate input
   */
  activateInput(): void {
    this.inputActive = true;
    this.nameInputActive = false;
    this.focusHiddenInput();
  }

  /**
   * Deactivate input
   */
  deactivateInput(): void {
    this.inputActive = false;
    this.nameInputActive = false;
    this.blurHiddenInput();
  }

  /**
   * Create or get the hidden HTML input element for speech-to-text support
   */
  private getOrCreateHiddenInput(): HTMLInputElement | null {
    // Only works in browser environment
    if (typeof document === 'undefined') return null;

    if (!this.hiddenInput) {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'divine-chat-hidden-input';
      input.autocomplete = 'off';
      input.style.cssText = `
        position: fixed;
        opacity: 0;
        pointer-events: none;
        width: 1px;
        height: 1px;
        border: none;
        padding: 0;
        margin: 0;
        z-index: -1;
      `;

      // Sync input changes to our state (for speech-to-text)
      input.addEventListener('input', () => {
        this.inputText = input.value;
      });

      // Handle Enter to send
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
          input.value = '';
        }
      });

      // Handle blur to deactivate
      input.addEventListener('blur', () => {
        // Small delay to allow click handling to process first
        setTimeout(() => {
          if (this.inputActive && document.activeElement !== input) {
            this.inputActive = false;
          }
        }, 100);
      });

      document.body.appendChild(input);
      this.hiddenInput = input;
    }

    return this.hiddenInput;
  }

  /**
   * Focus the hidden input for speech-to-text/keyboard input
   */
  private focusHiddenInput(): void {
    const input = this.getOrCreateHiddenInput();
    if (input) {
      input.value = this.inputText;
      input.focus();
    }
  }

  /**
   * Blur the hidden input
   */
  private blurHiddenInput(): void {
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
  }
}
