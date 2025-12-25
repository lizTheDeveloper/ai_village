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
    return 320;
  }

  getDefaultHeight(): number {
    return 420;
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
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: any
  ): void {
    if (!this.isVisible()) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);

    // Call original render with canvas dimensions (it doesn't use world)
    this.panel.render(ctx, width, height);

    ctx.restore();
  }

  /**
   * Get the underlying TileInspectorPanel instance for direct access.
   */
  getPanel(): TileInspectorPanel {
    return this.panel;
  }
}
