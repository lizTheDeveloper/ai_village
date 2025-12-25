/**
 * Window Manager Type Definitions
 *
 * These types define the interfaces and structures used by the WindowManager system.
 */

/**
 * Interface that all panels must implement to be managed by WindowManager
 */
export interface IWindowPanel {
  /**
   * Unique identifier for the panel
   */
  getId(): string;

  /**
   * Display title shown in the window title bar
   */
  getTitle(): string;

  /**
   * Default width of the panel
   */
  getDefaultWidth(): number;

  /**
   * Default height of the panel
   */
  getDefaultHeight(): number;

  /**
   * Whether the panel is currently visible
   */
  isVisible(): boolean;

  /**
   * Set the visibility state of the panel
   */
  setVisible(visible: boolean): void;

  /**
   * Render the panel content
   *
   * @param ctx - Canvas rendering context
   * @param x - X position to render at
   * @param y - Y position to render at
   * @param width - Width of the rendering area
   * @param height - Height of the rendering area
   * @param world - Optional world data for context
   */
  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world?: any
  ): void;

  /**
   * Optional custom header rendering (for additional controls)
   *
   * @param ctx - Canvas rendering context
   * @param x - X position of the header
   * @param y - Y position of the header
   * @param width - Width of the header
   */
  renderHeader?(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void;
}

/**
 * Configuration for a managed window
 */
export interface WindowConfig {
  /** Default X position */
  defaultX: number;

  /** Default Y position */
  defaultY: number;

  /** Default width */
  defaultWidth: number;

  /** Default height */
  defaultHeight: number;

  /** Minimum width (optional) */
  minWidth?: number;

  /** Minimum height (optional) */
  minHeight?: number;

  /** Maximum width (optional) */
  maxWidth?: number;

  /** Maximum height (optional) */
  maxHeight?: number;

  /** Whether this is a modal window (dims background, centers, excluded from LRU) */
  isModal?: boolean;

  /** Whether the window can be resized */
  isResizable?: boolean;

  /** Whether the window can be dragged */
  isDraggable?: boolean;

  /** Whether to show in the windows menu */
  showInWindowList?: boolean;

  /** Keyboard shortcut to toggle window (e.g., "KeyM" for memory panel) */
  keyboardShortcut?: string;
}

/**
 * Internal managed window state
 */
export interface ManagedWindow {
  /** Unique identifier */
  id: string;

  /** The panel instance */
  panel: IWindowPanel;

  /** Configuration */
  config: WindowConfig;

  /** Current X position */
  x: number;

  /** Current Y position */
  y: number;

  /** Current width */
  width: number;

  /** Current height */
  height: number;

  /** Whether window is visible */
  visible: boolean;

  /** Whether window is minimized */
  minimized: boolean;

  /** Z-index for layering */
  zIndex: number;

  /** Whether window is pinned (won't be auto-closed) */
  pinned: boolean;

  /** Whether window is currently being dragged */
  isDragging: boolean;

  /** X offset from window origin to mouse during drag */
  dragOffsetX: number;

  /** Y offset from window origin to mouse during drag */
  dragOffsetY: number;

  /** Timestamp of last user interaction (click, drag, focus) */
  lastInteractionTime: number;

  /** Timestamp when window was first opened */
  openedTime: number;
}

/**
 * Saved layout schema for localStorage persistence
 */
export interface SavedLayout {
  /** Schema version for migration */
  version: number;

  /** Window states keyed by window ID */
  windows: {
    [windowId: string]: {
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
      minimized: boolean;
      pinned: boolean;
    };
  };

  /** Timestamp of last save */
  lastSaved: number;
}

/**
 * Event payload for window auto-close notification
 */
export interface WindowAutoCloseEvent {
  /** ID of the window that was closed */
  windowId: string;

  /** Title of the window that was closed */
  windowTitle: string;

  /** Reason for auto-close */
  reason: 'out-of-space' | 'manual';
}

/**
 * Layout arrangement mode
 */
export type LayoutMode = 'cascade' | 'tile' | 'restore';

/**
 * Title bar button that was clicked
 */
export type TitleBarButton = 'close' | 'minimize' | 'pin' | 'menu' | null;
