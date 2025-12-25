import type { IWindowPanel } from '../types/WindowTypes.js';
import { SettingsPanel } from '../SettingsPanel.js';

/**
 * Adapter to make SettingsPanel compatible with WindowManager's IWindowPanel interface.
 * Note: SettingsPanel uses DOM elements, not canvas rendering.
 */
export class SettingsPanelAdapter implements IWindowPanel {
  private panel: SettingsPanel;

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
    return 600;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.panel.getIsVisible();
  }

  setVisible(visible: boolean): void {
    if (visible && !this.panel.getIsVisible()) {
      this.panel.toggle();
    } else if (!visible && this.panel.getIsVisible()) {
      this.panel.toggle();
    }
  }

  render(
    _ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    _width: number,
    _height: number,
    _world?: any
  ): void {
    // SettingsPanel uses DOM elements, not canvas rendering
    // Nothing to render on canvas
    // The panel manages its own DOM visibility
  }

  /**
   * Get the underlying SettingsPanel instance for direct access.
   */
  getPanel(): SettingsPanel {
    return this.panel;
  }
}
