import type { IWindowPanel } from '../types/WindowTypes.js';
import { CraftingPanelUI } from '../CraftingPanelUI.js';

/**
 * Adapter to make CraftingPanelUI compatible with WindowManager's IWindowPanel interface.
 */
export class CraftingPanelUIAdapter implements IWindowPanel {
  private panel: CraftingPanelUI;

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
    return this.panel.isVisible;
  }

  setVisible(visible: boolean): void {
    this.panel.isVisible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    _width: number,
    _height: number,
    _world?: any
  ): void {
    if (!this.isVisible()) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Call original render
    this.panel.render(ctx);

    ctx.restore();
  }

  /**
   * Get the underlying CraftingPanelUI instance for direct access.
   */
  getPanel(): CraftingPanelUI {
    return this.panel;
  }
}
