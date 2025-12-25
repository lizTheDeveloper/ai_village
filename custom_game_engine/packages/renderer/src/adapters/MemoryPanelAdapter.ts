import type { IWindowPanel } from '../types/WindowTypes.js';
import { MemoryPanel } from '../MemoryPanel.js';

/**
 * Adapter to make MemoryPanel compatible with WindowManager's IWindowPanel interface.
 */
export class MemoryPanelAdapter implements IWindowPanel {
  private panel: MemoryPanel;

  constructor(panel: MemoryPanel) {
    if (!panel) {
      throw new Error('MemoryPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'memory';
  }

  getTitle(): string {
    return 'Memory System';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 600;
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
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Call original render - pass canvas dimensions for layout
    this.panel.render(ctx, width, height, world);

    ctx.restore();
  }

  /**
   * Get the underlying MemoryPanel instance for direct access.
   */
  getPanel(): MemoryPanel {
    return this.panel;
  }
}
