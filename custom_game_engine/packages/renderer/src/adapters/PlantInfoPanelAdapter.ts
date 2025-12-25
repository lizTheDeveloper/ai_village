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
    return 400;
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

    // Call original render - tileInspectorOpen is managed separately
    this.panel.render(ctx, width, height, world, false);

    ctx.restore();
  }

  /**
   * Get the underlying PlantInfoPanel instance for direct access.
   */
  getPanel(): PlantInfoPanel {
    return this.panel;
  }
}
