import type { IWindowPanel } from '../types/WindowTypes.js';
import type { ResourcesPanel } from '../ResourcesPanel.js';

/**
 * Adapter to make ResourcesPanel compatible with IWindowPanel interface.
 */
export class ResourcesPanelAdapter implements IWindowPanel {
  private panel: ResourcesPanel;
  private visible: boolean = false;

  constructor(panel: ResourcesPanel) {
    if (!panel) {
      throw new Error('ResourcesPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'resources';
  }

  getTitle(): string {
    return 'Resources';
  }

  getDefaultWidth(): number {
    return 250;
  }

  getDefaultHeight(): number {
    return 200;
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.translate(x, y);
    this.panel.render(ctx, width, height, world);
    ctx.restore();
  }

  getPanel(): ResourcesPanel {
    return this.panel;
  }
}
