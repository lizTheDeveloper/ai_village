import type { IWindowPanel } from '../types/WindowTypes.js';
import { EconomyPanel } from '../EconomyPanel.js';

/**
 * Adapter to make EconomyPanel compatible with WindowManager's IWindowPanel interface.
 */
export class EconomyPanelAdapter implements IWindowPanel {
  private panel: EconomyPanel;

  constructor(panel: EconomyPanel) {
    if (!panel) {
      throw new Error('EconomyPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'economy';
  }

  getTitle(): string {
    return 'Economy Dashboard';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.panel.isVisible();
  }

  setVisible(visible: boolean): void {
    if (visible) {
      if (!this.panel.isVisible()) {
        this.panel.toggle();
      }
    } else {
      if (this.panel.isVisible()) {
        this.panel.toggle();
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    // WindowManager handles positioning via translate, panel renders at (0, 0)
    this.panel.render(ctx, width, height, world);
  }

  /**
   * Get the underlying EconomyPanel instance for direct access.
   */
  getPanel(): EconomyPanel {
    return this.panel;
  }
}
