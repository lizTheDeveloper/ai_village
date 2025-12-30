/**
 * FloatingPrayerNotifications - Mini-cards showing recent prayers
 *
 * Features:
 * - Mini prayer cards on left side of screen
 * - Click to open Prayer Inbox
 * - Urgency indicated by color/pulsing
 * - Auto-dismiss after timeout
 * - Fade in animation
 *
 * See: specs/divine-systems-ui.md
 */

import { Prayer, DIVINE_COLORS, URGENCY_COLORS } from './DivineUITypes.js';

export interface PrayerNotification {
  prayer: Prayer;
  timestamp: number;
  fadeProgress: number; // 0-1, used for fade in/out
  isPulsing: boolean;
}

export interface FloatingPrayerNotificationsCallbacks {
  onNotificationClick: (prayerId: string) => void;
  onDismiss: (prayerId: string) => void;
  onOpenInbox: () => void;
}

export interface FloatingPrayerNotificationsState {
  notifications: PrayerNotification[];
  maxVisible: number;
  autoDismissMs: number;
  enabled: boolean;
}

const SIZES = {
  cardWidth: 220,
  cardHeight: 80,
  cardMargin: 8,
  padding: 12,
  iconSize: 24,
  leftMargin: 16,
  topOffset: 100,
};

/**
 * FloatingPrayerNotifications - Renders floating prayer notification cards
 */
export class FloatingPrayerNotifications {
  private state: FloatingPrayerNotificationsState;
  private callbacks: FloatingPrayerNotificationsCallbacks;
  private visible: boolean = true;
  private hoveredNotification: string | null = null;
  private animationFrame: number = 0;

  constructor(
    initialState: FloatingPrayerNotificationsState,
    callbacks: FloatingPrayerNotificationsCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  /**
   * Show notifications
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Hide notifications
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Update state
   */
  updateState(newState: Partial<FloatingPrayerNotificationsState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): FloatingPrayerNotificationsState {
    return { ...this.state };
  }

  /**
   * Add a new prayer notification
   */
  addNotification(prayer: Prayer): void {
    // Check if prayer is already in notifications
    const exists = this.state.notifications.some(n => n.prayer.id === prayer.id);
    if (exists) return;

    const notification: PrayerNotification = {
      prayer,
      timestamp: Date.now(),
      fadeProgress: 0,
      isPulsing: prayer.urgency === 'urgent' || prayer.urgency === 'critical',
    };

    // Add to beginning
    this.state.notifications.unshift(notification);

    // Trim to max visible
    if (this.state.notifications.length > this.state.maxVisible) {
      this.state.notifications = this.state.notifications.slice(0, this.state.maxVisible);
    }
  }

  /**
   * Remove a notification
   */
  removeNotification(prayerId: string): void {
    this.state.notifications = this.state.notifications.filter(n => n.prayer.id !== prayerId);
  }

  /**
   * Update animation state (call this on each frame)
   */
  update(deltaTime: number): void {
    if (!this.state.enabled) return;

    this.animationFrame += deltaTime * 0.003; // Slow pulse

    const now = Date.now();

    for (const notification of this.state.notifications) {
      // Fade in
      if (notification.fadeProgress < 1) {
        notification.fadeProgress = Math.min(1, notification.fadeProgress + deltaTime * 0.005);
      }

      // Auto-dismiss after timeout
      if (this.state.autoDismissMs > 0) {
        const age = now - notification.timestamp;
        if (age > this.state.autoDismissMs) {
          // Start fade out
          notification.fadeProgress = Math.max(0, notification.fadeProgress - deltaTime * 0.003);
          if (notification.fadeProgress <= 0) {
            this.callbacks.onDismiss(notification.prayer.id);
          }
        }
      }
    }

    // Remove fully faded notifications
    this.state.notifications = this.state.notifications.filter(n => n.fadeProgress > 0);
  }

  /**
   * Render the floating notifications
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || !this.state.enabled) return;

    const notifications = this.state.notifications.slice(0, this.state.maxVisible);

    notifications.forEach((notification, index) => {
      const y = SIZES.topOffset + index * (SIZES.cardHeight + SIZES.cardMargin);
      this.renderNotificationCard(ctx, notification, SIZES.leftMargin, y);
    });

    // Render "View All" button if there are notifications
    if (notifications.length > 0) {
      const buttonY = SIZES.topOffset + notifications.length * (SIZES.cardHeight + SIZES.cardMargin);
      this.renderViewAllButton(ctx, SIZES.leftMargin, buttonY);
    }
  }

  /**
   * Render a single notification card
   */
  private renderNotificationCard(
    ctx: CanvasRenderingContext2D,
    notification: PrayerNotification,
    x: number,
    y: number
  ): void {
    const { prayer, fadeProgress, isPulsing } = notification;
    const isHovered = this.hoveredNotification === prayer.id;
    const urgencyColor = URGENCY_COLORS[prayer.urgency];

    // Apply fade
    ctx.globalAlpha = fadeProgress;

    // Calculate pulse effect
    let glowIntensity = 0;
    if (isPulsing) {
      glowIntensity = Math.sin(this.animationFrame * 2) * 0.3 + 0.7;
    }

    // Card background with gradient
    const gradient = ctx.createLinearGradient(x, y, x + SIZES.cardWidth, y);
    gradient.addColorStop(0, urgencyColor + '40'); // 25% opacity
    gradient.addColorStop(1, 'rgba(30, 30, 40, 0.95)');

    // Glow effect for pulsing notifications
    if (isPulsing && glowIntensity > 0.5) {
      ctx.shadowColor = urgencyColor;
      ctx.shadowBlur = 10 * glowIntensity;
    }

    // Card shape
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, SIZES.cardWidth, SIZES.cardHeight, 8);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Left border (urgency indicator)
    ctx.fillStyle = urgencyColor;
    ctx.fillRect(x, y + 8, 4, SIZES.cardHeight - 16);

    // Hover effect
    if (isHovered) {
      ctx.strokeStyle = DIVINE_COLORS.primary;
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, SIZES.cardWidth, SIZES.cardHeight, 8);
      ctx.stroke();
    }

    // Prayer icon
    ctx.font = `${SIZES.iconSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = urgencyColor;
    ctx.fillText('\u{1F64F}', x + SIZES.padding, y + SIZES.padding);

    // Agent name
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      prayer.agentName ?? 'Unknown',
      x + SIZES.padding + SIZES.iconSize + 8,
      y + SIZES.padding
    );

    // Prayer preview (truncated)
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#CCCCCC';
    const previewText = this.truncateText(ctx, prayer.text, SIZES.cardWidth - SIZES.padding * 2 - 8);
    ctx.fillText(previewText, x + SIZES.padding, y + SIZES.padding + 20);

    // Time ago
    const timeAgo = this.formatTimeAgo(prayer.timestamp);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'right';
    ctx.fillText(timeAgo, x + SIZES.cardWidth - SIZES.padding, y + SIZES.cardHeight - SIZES.padding);

    // Domain badge
    if (prayer.domain) {
      ctx.textAlign = 'left';
      ctx.font = '10px sans-serif';
      ctx.fillStyle = DIVINE_COLORS.secondary;
      ctx.fillText(prayer.domain.toUpperCase(), x + SIZES.padding, y + SIZES.cardHeight - SIZES.padding);
    }

    // Reset text alignment and alpha
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  /**
   * Render "View All" button
   */
  private renderViewAllButton(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const buttonWidth = SIZES.cardWidth;
    const buttonHeight = 32;

    // Button background
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    this.roundRect(ctx, x, y, buttonWidth, buttonHeight, 6);
    ctx.fill();

    // Button border
    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, buttonWidth, buttonHeight, 6);
    ctx.stroke();

    // Button text
    ctx.font = '12px sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F4E5} Open Prayer Inbox', x + buttonWidth / 2, y + buttonHeight / 2);

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Helper to draw rounded rectangle
   */
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

  /**
   * Truncate text to fit width
   */
  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;

    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  /**
   * Format timestamp as time ago
   */
  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Handle mouse move for hover effects
   */
  handleMouseMove(x: number, y: number): void {
    if (!this.visible || !this.state.enabled) {
      this.hoveredNotification = null;
      return;
    }

    // Check each notification card
    const notifications = this.state.notifications.slice(0, this.state.maxVisible);

    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      if (!notification) continue;

      const cardY = SIZES.topOffset + i * (SIZES.cardHeight + SIZES.cardMargin);

      if (
        x >= SIZES.leftMargin &&
        x <= SIZES.leftMargin + SIZES.cardWidth &&
        y >= cardY &&
        y <= cardY + SIZES.cardHeight
      ) {
        this.hoveredNotification = notification.prayer.id;
        return;
      }
    }

    this.hoveredNotification = null;
  }

  /**
   * Handle click on notifications
   * Returns true if click was handled
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible || !this.state.enabled) return false;

    const notifications = this.state.notifications.slice(0, this.state.maxVisible);

    // Check notification cards
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      if (!notification) continue;

      const cardY = SIZES.topOffset + i * (SIZES.cardHeight + SIZES.cardMargin);

      if (
        x >= SIZES.leftMargin &&
        x <= SIZES.leftMargin + SIZES.cardWidth &&
        y >= cardY &&
        y <= cardY + SIZES.cardHeight
      ) {
        this.callbacks.onNotificationClick(notification.prayer.id);
        return true;
      }
    }

    // Check "View All" button
    if (notifications.length > 0) {
      const buttonY = SIZES.topOffset + notifications.length * (SIZES.cardHeight + SIZES.cardMargin);
      const buttonHeight = 32;

      if (
        x >= SIZES.leftMargin &&
        x <= SIZES.leftMargin + SIZES.cardWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.callbacks.onOpenInbox();
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a point is within the notifications area
   */
  isPointInArea(x: number, y: number): boolean {
    if (!this.visible || !this.state.enabled) return false;

    const notifications = this.state.notifications.slice(0, this.state.maxVisible);
    const totalHeight = (notifications.length + 1) * (SIZES.cardHeight + SIZES.cardMargin);

    return (
      x >= SIZES.leftMargin &&
      x <= SIZES.leftMargin + SIZES.cardWidth &&
      y >= SIZES.topOffset &&
      y <= SIZES.topOffset + totalHeight
    );
  }
}
