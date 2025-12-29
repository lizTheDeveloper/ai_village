import type { IWindowPanel } from '../types/WindowTypes.js';
import { PlantInfoPanel } from '../PlantInfoPanel.js';

/**
 * Adapter to make PlantInfoPanel compatible with WindowManager's IWindowPanel interface.
 */
export class PlantInfoPanelAdapter implements IWindowPanel {
  private panel: PlantInfoPanel;
  private visible: boolean = false;

  constructor(panel: PlantInfoPanel) {
    if (!panel) {
      throw new Error('PlantInfoPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'plant-info';
  }

  getTitle(): string {
    return 'Plant Info';
  }

  getDefaultWidth(): number {
    return 320;
  }

  getDefaultHeight(): number {
    return 480; // Taller to fit all content
  }

  isVisible(): boolean {
    return this.visible && this.panel.getSelectedEntityId() !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // PlantInfoPanel visibility is controlled by selection state
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
    this.panel.render(ctx, width, height, world, false);
  }

  /**
   * Handle scroll events for scrollable content.
   */
  handleScroll(deltaY: number, contentHeight: number): boolean {
    return this.panel.handleScroll(deltaY, contentHeight);
  }

  /**
   * Get the underlying PlantInfoPanel instance for direct access.
   */
  getPanel(): PlantInfoPanel {
    return this.panel;
  }
}
