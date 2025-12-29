import type { IWindowPanel } from '../types/WindowTypes.js';
import { AgentInfoPanel } from '../AgentInfoPanel.js';

/**
 * Adapter to make AgentInfoPanel compatible with WindowManager's IWindowPanel interface.
 */
export class AgentInfoPanelAdapter implements IWindowPanel {
  private panel: AgentInfoPanel;
  private visible: boolean = false;
  private world: any = null;
  // Track the actual window screen position for HTML overlay elements
  private screenX: number = 0;
  private screenY: number = 0;

  constructor(panel: AgentInfoPanel) {
    if (!panel) {
      throw new Error('AgentInfoPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  /**
   * Update the screen position of the window (called by WindowManager before render).
   * This is needed for HTML overlay elements like the LLM context textarea.
   */
  setScreenPosition(x: number, y: number): void {
    this.screenX = x;
    this.screenY = y;
  }

  /**
   * Set the world reference for rendering.
   * Must be called before render() will display content.
   */
  setWorld(world: any): void {
    this.world = world;
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
    return 530;
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
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    // Use provided world or fall back to stored world
    const worldToUse = world || this.world;

    if (!this.isVisible() || !worldToUse) {
      return;
    }

    // WindowManager handles positioning via translate
    // Panel renders at (0, 0) relative to content area
    // Pass screen position for HTML overlay elements (like textarea)
    this.panel.renderAt(ctx, 0, 0, width, height, worldToUse, this.screenX, this.screenY);
  }

  /**
   * Handle clicks on the panel content area.
   * Forwards to the AgentInfoPanel's tab handling.
   */
  handleContentClick(x: number, y: number, width: number, _height: number): boolean {
    // The panel's handleClick expects absolute panel coordinates
    // Since WindowManager translates for us, we pass (0,0) as the panel origin
    // Pass width so tab hit detection uses actual window dimensions
    return this.panel.handleClick(x, y, 0, 0, width);
  }

  /**
   * Handle scroll events for the inventory tab.
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.panel.handleScroll(deltaY);
    return true;
  }

  /**
   * Get the underlying AgentInfoPanel instance for direct access.
   */
  getPanel(): AgentInfoPanel {
    return this.panel;
  }
}
