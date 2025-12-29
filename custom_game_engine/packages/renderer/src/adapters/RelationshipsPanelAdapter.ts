import type { IWindowPanel } from '../types/WindowTypes.js';
import { RelationshipsPanel } from '../RelationshipsPanel.js';

/**
 * Adapter to make RelationshipsPanel compatible with WindowManager's IWindowPanel interface.
 */
export class RelationshipsPanelAdapter implements IWindowPanel {
  private panel: RelationshipsPanel;

  constructor(panel: RelationshipsPanel) {
    if (!panel) {
      throw new Error('RelationshipsPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'relationships';
  }

  getTitle(): string {
    return 'Relationships';
  }

  getDefaultWidth(): number {
    return 380;
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

  handleScroll(deltaY: number, contentHeight: number): boolean {
    return this.panel.handleScroll(deltaY, contentHeight);
  }

  /**
   * Get the underlying RelationshipsPanel instance for direct access.
   */
  getPanel(): RelationshipsPanel {
    return this.panel;
  }
}
