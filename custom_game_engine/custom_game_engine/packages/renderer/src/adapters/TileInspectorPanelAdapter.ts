import type { IWindowPanel } from '../types/WindowTypes.js';
import type { TileInspectorPanel } from '../TileInspectorPanel.js';

/**
 * Adapter to make TileInspectorPanel compatible with IWindowPanel interface.
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
    this.panel.render(ctx, width, height);
    ctx.restore();
  }

  getPanel(): TileInspectorPanel {
    return this.panel;
  }
}
