import type { IWindowPanel } from '../types/WindowTypes.js';
import type { CraftingPanelUI } from '../CraftingPanelUI.js';

/**
 * Adapter to make CraftingPanelUI compatible with IWindowPanel interface.
 */
export class CraftingPanelUIAdapter implements IWindowPanel {
  private panel: CraftingPanelUI;
  private visible: boolean = false;

  constructor(panel: CraftingPanelUI) {
    if (!panel) {
      throw new Error('CraftingPanelUI cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'crafting';
  }

  getTitle(): string {
    return 'Crafting';
  }

  getDefaultWidth(): number {
    return 800;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.panel.show();
    } else {
      this.panel.hide();
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
    if (!this.visible) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.translate(x, y);
    this.panel.render(ctx);
    ctx.restore();
  }

  getPanel(): CraftingPanelUI {
    return this.panel;
  }
}
