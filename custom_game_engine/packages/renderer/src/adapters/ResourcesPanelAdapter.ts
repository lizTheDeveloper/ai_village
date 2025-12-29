import type { IWindowPanel } from '../types/WindowTypes.js';
import { ResourcesPanel } from '../ResourcesPanel.js';

/**
 * Adapter to make ResourcesPanel compatible with WindowManager's IWindowPanel interface.
 */
export class ResourcesPanelAdapter implements IWindowPanel {
  private panel: ResourcesPanel;
  private visible: boolean = false;

  constructor(panel: ResourcesPanel) {
    if (!panel) {
      throw new Error('ResourcesPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'resources';
  }

  getTitle(): string {
    return 'Village Stockpile';
  }

  getDefaultWidth(): number {
    return 280;
  }

  getDefaultHeight(): number {
    return 200;
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
    this.panel.render(ctx, width, world, false);
  }

  /**
   * Get the underlying ResourcesPanel instance for direct access.
   */
  getPanel(): ResourcesPanel {
    return this.panel;
  }
}
