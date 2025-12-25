import type { IWindowPanel } from '../types/WindowTypes.js';
import type { AgentInfoPanel } from '../AgentInfoPanel.js';

/**
 * Adapter to make AgentInfoPanel compatible with IWindowPanel interface.
 * Wraps the existing panel and provides the required methods for WindowManager.
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
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Render the panel content.
   * The WindowManager provides the content area dimensions.
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    // AgentInfoPanel.render expects (ctx, canvasWidth, canvasHeight, world)
    // We need to translate the WindowManager's content area coords to panel rendering

    // Save context state
    ctx.save();

    // Clip to content area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Render panel - it will draw at its own position
    // We translate the context so the panel renders in the right place
    ctx.translate(x, y);

    // Call original render with adjusted canvas dimensions
    this.panel.render(ctx, width, height, world);

    // Restore context
    ctx.restore();
  }

  /**
   * Expose the original panel for external access.
   */
  getPanel(): AgentInfoPanel {
    return this.panel;
  }
}
