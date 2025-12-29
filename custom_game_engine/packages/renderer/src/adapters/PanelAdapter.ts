import type { IWindowPanel } from '../types/WindowTypes.js';

/**
 * Configuration for a generic panel adapter.
 *
 * This config defines how to map a panel's methods to the IWindowPanel interface.
 * It handles variations in visibility patterns, render signatures, and optional methods.
 */
export interface PanelConfig<T> {
  /** Unique identifier for the panel */
  id: string;

  /** Display title shown in the window title bar */
  title: string;

  /** Default width of the panel */
  defaultWidth: number;

  /** Default height of the panel */
  defaultHeight: number;

  /**
   * How to check if the panel is visible.
   * If not provided, uses internal _visible state.
   */
  getVisible?: (panel: T) => boolean;

  /**
   * How to set the panel's visibility.
   * If not provided, uses internal _visible state.
   */
  setVisible?: (panel: T, visible: boolean) => void;

  /**
   * How to render the panel.
   * If not provided, calls panel.render(ctx, x, y, width, height, world).
   */
  renderMethod?: (
    panel: T,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ) => void;

  /**
   * Optional scroll handling delegation.
   * If provided, the adapter will have a handleScroll method.
   */
  handleScroll?: (panel: T, deltaY: number, contentHeight: number) => boolean;

  /**
   * Optional click handling delegation.
   * If provided, the adapter will have a handleContentClick method.
   */
  handleContentClick?: (panel: T, x: number, y: number, width: number, height: number) => boolean;
}

/**
 * Generic adapter to make any panel compatible with WindowManager's IWindowPanel interface.
 *
 * This replaces 14 nearly-identical adapter classes with a single configurable implementation.
 * Different panels have different visibility patterns and render signatures, which are
 * handled through the PanelConfig.
 *
 * Example usage:
 * ```typescript
 * const config: PanelConfig<ResourcesPanel> = {
 *   id: 'resources',
 *   title: 'Village Stockpile',
 *   defaultWidth: 280,
 *   defaultHeight: 200,
 *   renderMethod: (panel, ctx, _x, _y, width, _height, world) => {
 *     panel.render(ctx, width, world, false);
 *   },
 * };
 * const adapter = new PanelAdapter(resourcesPanel, config);
 * ```
 */
export class PanelAdapter<T> implements IWindowPanel {
  private panel: T;
  private config: PanelConfig<T>;
  private _visible: boolean = false;

  constructor(panel: T, config: PanelConfig<T>) {
    // Validate panel parameter (no silent fallbacks)
    if (panel === null || panel === undefined) {
      throw new Error('Panel is required and cannot be null or undefined');
    }

    // Validate config parameter (no silent fallbacks)
    if (config === null || config === undefined) {
      throw new Error('Config is required and cannot be null or undefined');
    }

    // Validate required config fields (no silent fallbacks)
    if (!config.id) {
      throw new Error('Config.id is required');
    }
    if (!config.title) {
      throw new Error('Config.title is required');
    }
    if (config.defaultWidth === undefined || config.defaultWidth === null) {
      throw new Error('Config.defaultWidth is required');
    }
    if (config.defaultHeight === undefined || config.defaultHeight === null) {
      throw new Error('Config.defaultHeight is required');
    }

    this.panel = panel;
    this.config = config;

    // Conditionally add optional methods
    if (config.handleScroll) {
      this.handleScroll = (deltaY: number, contentHeight: number) => {
        return config.handleScroll!(this.panel, deltaY, contentHeight);
      };
    }

    if (config.handleContentClick) {
      this.handleContentClick = (x: number, y: number, width: number, height: number) => {
        return config.handleContentClick!(this.panel, x, y, width, height);
      };
    }
  }

  getId(): string {
    return this.config.id;
  }

  getTitle(): string {
    return this.config.title;
  }

  getDefaultWidth(): number {
    return this.config.defaultWidth;
  }

  getDefaultHeight(): number {
    return this.config.defaultHeight;
  }

  isVisible(): boolean {
    if (this.config.getVisible) {
      return this.config.getVisible(this.panel);
    }
    return this._visible;
  }

  setVisible(visible: boolean): void {
    if (this.config.setVisible) {
      this.config.setVisible(this.panel, visible);
    }
    this._visible = visible;
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

    if (this.config.renderMethod) {
      this.config.renderMethod(this.panel, ctx, x, y, width, height, world);
    } else {
      // Default: assume panel has a render method with standard signature
      (this.panel as any).render(ctx, x, y, width, height, world);
    }
  }

  /**
   * Optional scroll handling - only exists if config provides handleScroll
   */
  handleScroll?: (deltaY: number, contentHeight: number) => boolean;

  /**
   * Optional click handling - only exists if config provides handleContentClick
   */
  handleContentClick?: (x: number, y: number, width: number, height: number) => boolean;

  /**
   * Get the underlying panel instance for direct access.
   */
  getPanel(): T {
    return this.panel;
  }
}
