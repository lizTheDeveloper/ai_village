import type { IWindowPanel } from '../types/WindowTypes.js';
import type { SettingsPanel } from '../SettingsPanel.js';

/**
 * Adapter to make SettingsPanel compatible with IWindowPanel interface.
 */
export class SettingsPanelAdapter implements IWindowPanel {
  private panel: SettingsPanel;
  private visible: boolean = false;

  constructor(panel: SettingsPanel) {
    if (!panel) {
      throw new Error('SettingsPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'settings';
  }

  getTitle(): string {
    return 'Settings';
  }

  getDefaultWidth(): number {
    return 400;
  }

  getDefaultHeight(): number {
    return 300;
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
    this.panel.render(ctx, width, height);
    ctx.restore();
  }

  getPanel(): SettingsPanel {
    return this.panel;
  }
}
