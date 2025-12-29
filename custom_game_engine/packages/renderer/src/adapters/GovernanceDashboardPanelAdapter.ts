import type { IWindowPanel } from '../types/WindowTypes.js';
import { GovernanceDashboardPanel } from '../GovernanceDashboardPanel.js';

/**
 * Adapter to make GovernanceDashboardPanel compatible with WindowManager's IWindowPanel interface.
 */
export class GovernanceDashboardPanelAdapter implements IWindowPanel {
  private panel: GovernanceDashboardPanel;
  private visible: boolean = false;

  constructor(panel: GovernanceDashboardPanel) {
    if (!panel) {
      throw new Error('GovernanceDashboardPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'governance';
  }

  getTitle(): string {
    return 'Governance Dashboard';
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

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    _height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    // WindowManager handles positioning via translate, panel renders at (0, 0)
    this.panel.render(ctx, width, world);
  }

  /**
   * Get the underlying GovernanceDashboardPanel instance for direct access.
   */
  getPanel(): GovernanceDashboardPanel {
    return this.panel;
  }
}
