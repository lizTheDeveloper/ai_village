import type { IWindowPanel } from '../types/WindowTypes.js';
import { NotificationsPanel } from '../NotificationsPanel.js';

/**
 * Adapter to make NotificationsPanel compatible with WindowManager's IWindowPanel interface.
 */
export class NotificationsPanelAdapter implements IWindowPanel {
  private panel: NotificationsPanel;
  private visible: boolean = false;

  constructor(panel: NotificationsPanel) {
    if (!panel) {
      throw new Error('NotificationsPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'notifications';
  }

  getTitle(): string {
    const count = this.panel.getCount();
    return count > 0 ? `Notifications (${count})` : 'Notifications';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 300;
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
    _world?: any
  ): void {
    if (!this.isVisible()) {
      return;
    }

    // WindowManager handles positioning via translate, panel renders at (0, 0)
    this.panel.render(ctx, x, y, width, height);
  }

  /**
   * Handle scroll events for the notifications list
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.panel.handleScroll(deltaY);
    return true;
  }

  /**
   * Get the underlying NotificationsPanel instance for direct access.
   */
  getPanel(): NotificationsPanel {
    return this.panel;
  }
}
