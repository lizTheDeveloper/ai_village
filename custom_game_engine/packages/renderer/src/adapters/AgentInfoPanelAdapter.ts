import type { IWindowPanel } from '../types/WindowTypes.js';
import { AgentInfoPanel } from '../AgentInfoPanel.js';

/**
 * Adapter to make AgentInfoPanel compatible with WindowManager's IWindowPanel interface.
 */
export class AgentInfoPanelAdapter implements IWindowPanel {
  private panel: AgentInfoPanel;
  private visible: boolean = false;

  constructor(panel: AgentInfoPanel) {
    if (!panel) {
      throw new Error('AgentInfoPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'agent-info';
  }

  getTitle(): string {
    return 'Agent Info';
  }

  getDefaultWidth(): number {
    return 300;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible && this.panel.getSelectedEntityId() !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // AgentInfoPanel visibility is controlled by selection state
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    // AgentInfoPanel renders at its own position, so we need to translate context
    ctx.save();
    ctx.translate(x, y);

    // Call original render with world parameter
    // Note: AgentInfoPanel expects canvasWidth/canvasHeight, not x/y position
    this.panel.render(ctx, width, height, world);

    ctx.restore();
  }

  /**
   * Get the underlying AgentInfoPanel instance for direct access.
   */
  getPanel(): AgentInfoPanel {
    return this.panel;
  }
}
