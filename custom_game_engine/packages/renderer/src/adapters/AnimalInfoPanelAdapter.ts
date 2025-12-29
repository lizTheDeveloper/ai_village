import type { IWindowPanel } from '../types/WindowTypes.js';
import { AnimalInfoPanel } from '../AnimalInfoPanel.js';

/**
 * Adapter to make AnimalInfoPanel compatible with WindowManager's IWindowPanel interface.
 */
export class AnimalInfoPanelAdapter implements IWindowPanel {
  private panel: AnimalInfoPanel;
  private visible: boolean = false;
  private world: any = null;

  constructor(panel: AnimalInfoPanel) {
    if (!panel) {
      throw new Error('AnimalInfoPanel cannot be null or undefined');
    }
    this.panel = panel;
  }

  getId(): string {
    return 'animal-info';
  }

  getTitle(): string {
    return 'Animal Info';
  }

  getDefaultWidth(): number {
    return 300;
  }

  getDefaultHeight(): number {
    return 450;
  }

  isVisible(): boolean {
    return this.visible && this.panel.getSelectedEntityId() !== null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    // AnimalInfoPanel visibility is controlled by selection state
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    world?: any
  ): void {
    if (!this.isVisible() || !world) {
      return;
    }

    // Store world reference for click handling
    this.world = world;

    // Use renderAt which renders at (0,0) without background/border/close button
    // WindowManager handles positioning via translate before calling render
    this.panel.renderAt(ctx, 0, 0, width, height, world);
  }

  /**
   * Handle clicks on the panel content area.
   * Forwards to the AnimalInfoPanel's button handling.
   */
  handleContentClick(x: number, y: number, width: number, height: number): boolean {
    // Need world for handleClickAt, but we don't have it here
    // Store world reference for click handling
    return this.panel.handleClickAt(x, y, width, height, this.world);
  }

  /**
   * Handle scroll events for the panel.
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    this.panel.handleScroll(deltaY);
    return true;
  }

  /**
   * Set the world reference for click handling.
   */
  setWorld(world: any): void {
    this.world = world;
  }

  /**
   * Get the underlying AnimalInfoPanel instance for direct access.
   */
  getPanel(): AnimalInfoPanel {
    return this.panel;
  }
}
