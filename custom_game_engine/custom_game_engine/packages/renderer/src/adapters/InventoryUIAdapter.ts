import type { IWindowPanel } from '../types/WindowTypes.js';
import type { InventoryUI } from '../ui/InventoryUI.js';

/**
 * Adapter to make InventoryUI compatible with IWindowPanel interface.
 */
export class InventoryUIAdapter implements IWindowPanel {
  private panel: InventoryUI;
  private visible: boolean = false;

  constructor(panel: InventoryUI) {
    if (!panel) {
      throw new Error('InventoryUI cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'inventory';
  }

  getTitle(): string {
    return 'Inventory';
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
    this.panel.setVisible(visible);
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

  getPanel(): InventoryUI {
    return this.panel;
  }
}
