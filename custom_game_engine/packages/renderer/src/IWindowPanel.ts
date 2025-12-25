/**
 * Interface that all window panels must implement to be managed by WindowManager.
 * This ensures consistent behavior across all UI panels.
 */
export interface IWindowPanel {
  /**
   * Get unique identifier for this panel.
   * @returns Panel ID (e.g., "agent-info", "resources", "memory")
   */
  getId(): string;

  /**
   * Get display title for the window.
   * @returns Title text shown in window title bar
   */
  getTitle(): string;

  /**
   * Get default width of the panel in pixels.
   * @returns Default width
   */
  getDefaultWidth(): number;

  /**
   * Get default height of the panel in pixels.
   * @returns Default height
   */
  getDefaultHeight(): number;

  /**
   * Check if panel is currently visible.
   * @returns True if visible
   */
  isVisible(): boolean;

  /**
   * Set panel visibility.
   * @param visible True to show, false to hide
   */
  setVisible(visible: boolean): void;

  /**
   * Render the panel content.
   * WindowManager will handle title bar and window chrome.
   * @param ctx Canvas rendering context
   * @param x Content area x position (excluding title bar)
   * @param y Content area y position (excluding title bar)
   * @param width Content area width
   * @param height Content area height
   * @param world Optional world instance for querying game data
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
   * Optional: Render custom controls in the window header.
   * @param ctx Canvas rendering context
   * @param x Header x position
   * @param y Header y position
   * @param width Header width
   */
  renderHeader?(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number
  ): void;

  /**
   * Optional: Handle click events on the panel content.
   * Return true if click was handled, false otherwise.
   * @param x Click x position relative to panel content area
   * @param y Click y position relative to panel content area
   * @param world Optional world instance
   * @returns True if click was handled
   */
  handleClick?(x: number, y: number, world?: any): boolean;
}

/**
 * Configuration for a managed window.
 */
export interface WindowConfig {
  /** Default X position in pixels */
  defaultX: number;
  /** Default Y position in pixels */
  defaultY: number;
  /** Default width in pixels */
  defaultWidth: number;
  /** Default height in pixels */
  defaultHeight: number;
  /** Minimum width in pixels (optional) */
  minWidth?: number;
  /** Minimum height in pixels (optional) */
  minHeight?: number;
  /** Maximum width in pixels (optional) */
  maxWidth?: number;
  /** Maximum height in pixels (optional) */
  maxHeight?: number;
  /** Whether this is a modal window (dims background, centers) */
  isModal?: boolean;
  /** Whether window can be resized */
  isResizable?: boolean;
  /** Whether window can be dragged */
  isDraggable?: boolean;
  /** Whether to show in windows menu */
  showInWindowList?: boolean;
  /** Keyboard shortcut key (e.g., "KeyM" for memory panel) */
  keyboardShortcut?: string;
}

/**
 * Internal state of a managed window.
 */
export interface ManagedWindow {
  /** Unique window ID */
  id: string;
  /** Panel instance implementing IWindowPanel */
  panel: IWindowPanel;
  /** Window configuration */
  config: WindowConfig;

  // Current state
  /** Current X position in pixels */
  x: number;
  /** Current Y position in pixels */
  y: number;
  /** Current width in pixels */
  width: number;
  /** Current height in pixels */
  height: number;
  /** Whether window is visible */
  visible: boolean;
  /** Whether window is minimized */
  minimized: boolean;
  /** Z-index for rendering order */
  zIndex: number;
  /** Whether window is pinned (prevents auto-close) */
  pinned: boolean;

  // Dragging state
  /** Whether window is currently being dragged */
  isDragging: boolean;
  /** Drag offset X (distance from window origin to click point) */
  dragOffsetX: number;
  /** Drag offset Y (distance from window origin to click point) */
  dragOffsetY: number;

  // LRU tracking
  /** Timestamp of last user interaction (click, drag, focus) */
  lastInteractionTime: number;
  /** Timestamp when window was first opened */
  openedTime: number;
}

/**
 * Saved layout data for localStorage persistence.
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
  /** Timestamp when layout was last saved */
  lastSaved: number;
}
