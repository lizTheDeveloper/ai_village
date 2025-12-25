import type { IWindowPanel } from '../types/WindowTypes.js';
import type { AnimalInfoPanel } from '../AnimalInfoPanel.js';

/**
 * Adapter to make AnimalInfoPanel compatible with IWindowPanel interface.
 */
export class AnimalInfoPanelAdapter implements IWindowPanel {
  private panel: AnimalInfoPanel;
  private visible: boolean = false;

  constructor(panel: AnimalInfoPanel) {
    if (!panel) {
      throw new Error('AnimalInfoPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'animal-info';
  }

  getTitle(): string {
    return 'Animal Info';
  }

  getDefaultWidth(): number {
    return 300;
  }

  getDefaultHeight(): number {
    return 400;
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

  getPanel(): AnimalInfoPanel {
    return this.panel;
  }
}
