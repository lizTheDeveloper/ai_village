import type { IWindowPanel } from '../types/WindowTypes.js';
import { TileInspectorPanel } from '../TileInspectorPanel.js';

/**
 * Adapter to make TileInspectorPanel compatible with WindowManager's IWindowPanel interface.
 */
export class TileInspectorPanelAdapter implements IWindowPanel {
  private panel: TileInspectorPanel;
  private visible: boolean = false;

  constructor(panel: TileInspectorPanel) {
    if (!panel) {
      throw new Error('TileInspectorPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'tile-inspector';
  }

  getTitle(): string {
    return 'Tile Inspector';
  }

  getDefaultWidth(): number {
    return 384;  // 20% larger than original 320
  }

  getDefaultHeight(): number {
    return 504;  // 20% larger than original 420
  }

  isVisible(): boolean {
    return this.visible && this.panel.getSelectedTile() !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // TileInspectorPanel visibility is controlled by selection state
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: any
  ): void {
    if (!this.isVisible()) {
      return;
    }

    // Use renderAt which renders at (0,0) without background/border/close button
    // WindowManager handles positioning via translate before calling render
    this.panel.renderAt(ctx, 0, 0, width, height);
  }

  /**
   * Handle clicks on the panel content area.
   * Forwards to the TileInspectorPanel's button handling.
   */
  handleContentClick(x: number, y: number, width: number, height: number): boolean {
    // The panel's handleClickAt expects coordinates relative to panel origin
    return this.panel.handleClickAt(x, y, width, height);
  }

  /**
   * Handle scroll events for the panel.
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.panel.handleScroll(deltaY);
    return true;
  }

  /**
   * Get the underlying TileInspectorPanel instance for direct access.
   */
  getPanel(): TileInspectorPanel {
    return this.panel;
  }
}
