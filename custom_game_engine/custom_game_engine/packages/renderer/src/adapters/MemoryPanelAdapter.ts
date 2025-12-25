import type { IWindowPanel } from '../types/WindowTypes.js';
import type { MemoryPanel } from '../MemoryPanel.js';

/**
 * Adapter to make MemoryPanel compatible with IWindowPanel interface.
 */
export class MemoryPanelAdapter implements IWindowPanel {
  private panel: MemoryPanel;
  private visible: boolean = false;

  constructor(panel: MemoryPanel) {
    if (!panel) {
      throw new Error('MemoryPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'memory';
  }

  getTitle(): string {
    return 'Memory';
  }

  getDefaultWidth(): number {
    return 400;
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
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.translate(x, y);
    this.panel.render(ctx, width, height, world);
    ctx.restore();
  }

  getPanel(): MemoryPanel {
    return this.panel;
  }
}
