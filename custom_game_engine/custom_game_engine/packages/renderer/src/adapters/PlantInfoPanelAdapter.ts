import type { IWindowPanel } from '../types/WindowTypes.js';
import type { PlantInfoPanel } from '../PlantInfoPanel.js';

/**
 * Adapter to make PlantInfoPanel compatible with IWindowPanel interface.
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
    return 300;
  }

  getDefaultHeight(): number {
    return 350;
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
    world?: any
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.translate(x, y);
    this.panel.render(ctx, width, height, world);
    ctx.restore();
  }

  getPanel(): PlantInfoPanel {
    return this.panel;
  }
}
