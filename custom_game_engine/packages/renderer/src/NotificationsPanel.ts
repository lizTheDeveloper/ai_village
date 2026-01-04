/**
 * NotificationsPanel - Displays persistent notifications with deposit accrual
 *
 * Shows a scrollable list of notifications that persist until cleared.
 * Deposits are accrued per agent until dismissed.
 * Can be toggled with 'n' key.
 */
import type { IWindowPanel } from './types/WindowTypes.js';

export interface Notification {
  id: number;
  message: string;
  color: string;
  timestamp: number;
  icon?: string;
}

export interface DepositSummary {
  agentName: string;
  items: Map<string, number>; // itemId -> total amount
  lastUpdated: number;
}

export class NotificationsPanel implements IWindowPanel {
  private visible: boolean = false;
  private notifications: Notification[] = [];
  private nextId: number = 1;
  private maxNotifications: number = 50;
  private scrollOffset: number = 0;
  private lineHeight: number = 20;
  private padding: number = 10;

  // Deposit accrual tracking - deposits are summarized per agent until dismissed
  private depositSummaries: Map<string, DepositSummary> = new Map();

  /**
   * Add a notification to the panel
   */

  getId(): string {
    return 'notifications';
  }

  getTitle(): string {
    return 'Notifications';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  addNotification(message: string, color: string = '#FFFFFF', icon?: string): void {
    const notification: Notification = {
      id: this.nextId++,
      message,
      color,
      timestamp: Date.now(),
      icon,
    };

    this.notifications.unshift(notification); // Add to beginning (newest first)

    // Trim old notifications if over limit
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }
  }

  /**
   * Add a deposit event - accrues with existing deposits for the same agent
   */
  addDeposit(agentName: string, items: Array<{ itemId: string; amount: number }>): void {
    let summary = this.depositSummaries.get(agentName);

    if (!summary) {
      summary = {
        agentName,
        items: new Map(),
        lastUpdated: Date.now(),
      };
      this.depositSummaries.set(agentName, summary);
    }

    // Accrue items
    for (const item of items) {
      const current = summary.items.get(item.itemId) || 0;
      summary.items.set(item.itemId, current + item.amount);
    }
    summary.lastUpdated = Date.now();
  }

  /**
   * Clear all notifications and deposit summaries
   */
  clearAll(): void {
    this.notifications = [];
    this.depositSummaries.clear();
    this.scrollOffset = 0;
  }

  /**
   * Clear only deposit summaries (keep other notifications)
   */
  clearDeposits(): void {
    this.depositSummaries.clear();
  }

  /**
   * Get notification count (includes deposit summaries)
   */
  getCount(): number {
    return this.notifications.length + this.depositSummaries.size;
  }

  /**
   * Scroll up
   */
  scrollUp(): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - 3);
  }

  /**
   * Scroll down
   */
  scrollDown(): void {
    const totalItems = this.getCount();
    const maxScroll = Math.max(0, totalItems - 10);
    this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 3);
  }

  /**
   * Handle scroll wheel
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    if (deltaY > 0) {
      this.scrollDown();
    } else {
      this.scrollUp();
    }
    return true;
  }

  /**
   * Get all displayable items (deposit summaries first, then other notifications)
   */
  private getDisplayItems(): Array<{ message: string; color: string; icon: string; timestamp: number }> {
    const items: Array<{ message: string; color: string; icon: string; timestamp: number }> = [];

    // Add deposit summaries (sorted by most recent)
    const summaries = Array.from(this.depositSummaries.values())
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    for (const summary of summaries) {
      const itemStrs: string[] = [];
      for (const [itemId, amount] of summary.items) {
        itemStrs.push(`${amount}x ${this.formatItemName(itemId)}`);
      }
      const itemList = itemStrs.join(', ');
      items.push({
        message: `${summary.agentName} deposited ${itemList}`,
        color: '#4CAF50',
        icon: '📦',
        timestamp: summary.lastUpdated,
      });
    }

    // Add regular notifications
    for (const notification of this.notifications) {
      items.push({
        message: notification.message,
        color: notification.color,
        icon: notification.icon || '',
        timestamp: notification.timestamp,
      });
    }

    return items;
  }

  /**
   * Format item name for display (convert snake_case to Title Case)
   */
  private formatItemName(itemId: string): string {
    return itemId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Render the notifications panel
   */
  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // Background is handled by WindowManager

    // Set up text rendering
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = this.padding;

    const displayItems = this.getDisplayItems();

    if (displayItems.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('No notifications', this.padding, currentY);
      ctx.restore();
      return;
    }

    // Calculate visible notifications
    const visibleHeight = height - this.padding * 2 - 25; // Leave room for scroll hint
    const visibleCount = Math.floor(visibleHeight / this.lineHeight);
    const startIndex = this.scrollOffset;
    const endIndex = Math.min(startIndex + visibleCount, displayItems.length);

    // Render notifications
    for (let i = startIndex; i < endIndex; i++) {
      const item = displayItems[i];
      if (!item) continue;

      // Format timestamp
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // Draw notification
      ctx.fillStyle = '#666666';
      ctx.fillText(timeStr, this.padding, currentY);

      ctx.fillStyle = item.color;
      const text = `${item.icon} ${item.message}`;

      // Truncate if too long
      const maxTextWidth = width - this.padding * 2 - 50;
      let displayText = text;
      while (ctx.measureText(displayText).width > maxTextWidth && displayText.length > 3) {
        displayText = displayText.slice(0, -4) + '...';
      }

      ctx.fillText(displayText, this.padding + 45, currentY);
      currentY += this.lineHeight;
    }

    // Show scroll indicator if needed
    if (displayItems.length > visibleCount) {
      ctx.fillStyle = '#666666';
      ctx.font = '11px monospace';
      const scrollInfo = `${this.scrollOffset + 1}-${endIndex} of ${displayItems.length} (scroll to see more)`;
      ctx.fillText(scrollInfo, this.padding, height - 20);
    }

    ctx.restore();
  }

  /**
   * Format item deposits for display (legacy method for backwards compatibility)
   */
  formatDeposit(items: Array<{ itemId: string; amount: number }>, agentName?: string): string {
    if (items.length === 0) return 'Deposited nothing';

    const itemStrs = items.map(item => `${item.amount}x ${item.itemId}`);
    const itemList = itemStrs.join(', ');

    if (agentName) {
      return `${agentName} deposited ${itemList}`;
    }
    return `Deposited ${itemList}`;
  }
}
