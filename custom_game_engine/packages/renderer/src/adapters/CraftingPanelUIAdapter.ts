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
   * Handle content clicks - delegates to the CraftingPanelUI.
   */
  handleContentClick(x: number, y: number, _width: number, _height: number): boolean {
    // The panel renders at its bounds position (bounds.x, bounds.y) after ctx.translate.
    // WindowManager gives us coordinates relative to window content area, which already
    // match the panel's internal coordinate system since render uses the same translation.
    // Pass coordinates directly without additional offset.
    return this.panel.handleClick(x, y);
  }

  /**
   * Get the underlying CraftingPanelUI instance for direct access.
   */
  getPanel(): CraftingPanelUI {
    return this.panel;
  }
}
