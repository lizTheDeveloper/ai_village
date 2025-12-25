import type { IWindowPanel } from '../types/WindowTypes.js';
import { AnimalInfoPanel } from '../AnimalInfoPanel.js';

/**
 * Adapter to make AnimalInfoPanel compatible with WindowManager's IWindowPanel interface.
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
    return 450;
  }

  isVisible(): boolean {
    return this.visible && this.panel.getSelectedEntityId() !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // AnimalInfoPanel visibility is controlled by selection state
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

    // Call original render with world parameter
    this.panel.render(ctx, width, height, world);

    ctx.restore();
  }

  /**
   * Get the underlying AnimalInfoPanel instance for direct access.
   */
  getPanel(): AnimalInfoPanel {
    return this.panel;
  }
}
