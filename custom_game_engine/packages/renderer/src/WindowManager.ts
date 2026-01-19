/**
 * WindowManager - Manages multiple UI windows/panels with:
 * - Non-overlapping window placement
 * - Draggable windows with title bars
 * - LRU (Least Recently Used) auto-close when out of space
 * - localStorage persistence
 * - Z-index layering
 */

import type {
  IWindowPanel,
  WindowConfig,
  ManagedWindow,
  SavedLayout,
  WindowAutoCloseEvent,
  LayoutMode,
  TitleBarButton,
} from './types/WindowTypes';

const STORAGE_KEY = 'ai-village-window-layout';
const LAYOUT_VERSION = 1;
const TITLE_BAR_HEIGHT = 30;
const MENU_BAR_HEIGHT = 30; // Windows cannot spawn above this Y coordinate
const BUTTON_SIZE = 20;
const BUTTON_PADDING = 10;
const SPIRAL_SEARCH_STEP = 50;
const MAX_SPIRAL_ITERATIONS = 100;
const RESIZE_HANDLE_SIZE = 16; // Size of the resize handle in the lower right corner

/**
 * Type guard to check if an object has a setScreenPosition method
 */
function hasSetScreenPosition(obj: unknown): obj is { setScreenPosition(x: number, y: number): void } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'setScreenPosition' in obj &&
    typeof (obj as Record<string, unknown>).setScreenPosition === 'function'
  );
}

export class WindowManager {
  private windows: Map<string, ManagedWindow> = new Map();
  private nextZIndex: number = 1;
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();
  // Store logical (CSS) dimensions separately from physical canvas buffer
  private logicalWidth: number = 0;
  private logicalHeight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    if (!canvas) {
      throw new Error('Canvas cannot be null or undefined');
    }
    // Initialize with canvas dimensions (will be updated by handleCanvasResize)
    this.logicalWidth = canvas.width;
    this.logicalHeight = canvas.height;
  }

  /**
   * Register a window with the manager
   */
  public registerWindow(id: string, panel: IWindowPanel | null, config: WindowConfig): void {
    // Validate inputs - NO SILENT FALLBACKS
    if (!panel && !config.factory) {
      throw new Error('Either panel or factory must be provided');
    }

    if (panel && config.factory) {
      throw new Error('Cannot provide both panel and factory - choose one');
    }

    if (this.windows.has(id)) {
      throw new Error(`Window with ID "${id}" already registered`);
    }

    // Validate required config fields
    if (config.defaultX === undefined || config.defaultY === undefined ||
        config.defaultWidth === undefined || config.defaultHeight === undefined) {
      throw new Error('WindowConfig missing required field: defaultX, defaultY, defaultWidth, or defaultHeight');
    }

    // Validate dimensions
    if (config.defaultWidth <= 0 || config.defaultHeight <= 0) {
      throw new Error('Invalid window dimensions: width and height must be positive');
    }

    const now = Date.now();

    const managedWindow: ManagedWindow = {
      id,
      panel,
      config,
      x: config.defaultX,
      y: config.defaultY,
      width: config.defaultWidth,
      height: config.defaultHeight,
      visible: false,
      minimized: false,
      zIndex: this.nextZIndex++,
      pinned: false,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      isResizing: false,
      resizeStartWidth: 0,
      resizeStartHeight: 0,
      resizeStartMouseX: 0,
      resizeStartMouseY: 0,
      lastInteractionTime: now,
      openedTime: 0, // Will be set when first shown
    };

    this.windows.set(id, managedWindow);
  }

  /**
   * Get a window by ID (returns undefined if not found)
   */
  public getWindow(id: string): ManagedWindow | undefined {
    return this.windows.get(id);
  }

  /**
   * Get all registered windows
   */
  public getAllWindows(): ManagedWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Show a window
   */
  public showWindow(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    // Create panel lazily if using factory
    if (!window.panel && window.config.factory) {
      window.panel = window.config.factory();
      if (!window.panel) {
        throw new Error(`Factory for window "${id}" returned null or undefined`);
      }
    }

    // At this point panel must exist
    if (!window.panel) {
      throw new Error(`Window "${id}" has no panel and no factory`);
    }

    // Track if this is the first time showing (openedTime will be 0)
    const wasNeverShown = window.openedTime === 0;

    // If already visible, just bring to front
    if (window.visible) {
      this.bringToFront(id);
      this.markWindowInteraction(id);
      return;
    }

    // Clamp window size to canvas if too large
    if (window.width > this.logicalWidth) {
      window.width = this.logicalWidth;
    }
    if (window.height > this.logicalHeight) {
      window.height = this.logicalHeight;
    }

    // Try to use the window's current position first (may have been restored from localStorage)
    // Only find a new position if the current spot is occupied by another visible window
    let position: { x: number; y: number } | null = null;
    if (this.isPositionAvailable(window.x, window.y, window.width, window.height, window.id)) {
      position = { x: window.x, y: window.y };
    } else {
      // Current position is occupied, find a new one
      position = this.findAvailablePosition(window);
    }

    // Keep closing LRU windows until we find space
    while (!position) {
      // No space found - try LRU eviction
      const lruWindowId = this.findLeastRecentlyUsedWindow();

      if (lruWindowId === null) {
        // All windows are pinned or modal
        throw new Error('Cannot open window - unpin a window to make space');
      }

      // Close the LRU window
      const lruWindow = this.windows.get(lruWindowId);
      if (lruWindow) {

        this.hideWindow(lruWindowId);

        // Emit notification
        this.emit('window:auto-closed', {
          windowId: lruWindowId,
          windowTitle: lruWindow.panel.getTitle(),
          reason: 'out-of-space',
        } as WindowAutoCloseEvent);

        // Try to find position again
        position = this.findAvailablePosition(window);
      }
    }

    window.x = position.x;
    window.y = position.y;

    window.visible = true;
    window.panel.setVisible(true);

    // Set openedTime only on first show
    if (wasNeverShown) {
      window.openedTime = Date.now();
    }

    this.bringToFront(id);

    // Update lastInteractionTime
    window.lastInteractionTime = Date.now();
  }

  /**
   * Hide a window
   */
  public hideWindow(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    window.visible = false;
    // Only update panel if it exists (may not exist if never shown with lazy factory)
    if (window.panel) {
      window.panel.setVisible(false);
    }
    this.saveLayout();
  }

  /**
   * Toggle window visibility
   */
  public toggleWindow(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    if (window.visible) {
      this.hideWindow(id);
    } else {
      this.showWindow(id);
    }
  }

  /**
   * Bring window to front (update z-index)
   */
  public bringToFront(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    window.zIndex = this.nextZIndex++;
    this.markWindowInteraction(id);
  }

  /**
   * Pin/unpin a window (pinned windows won't be auto-closed)
   */
  public pinWindow(id: string, pinned: boolean): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    window.pinned = pinned;
  }

  /**
   * Mark a window as interacted with (updates lastInteractionTime)
   */
  public markWindowInteraction(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }

    window.lastInteractionTime = Date.now();
  }

  /**
   * Find the least recently used window (eligible for auto-close)
   * Returns null if no eligible windows exist
   */
  public findLeastRecentlyUsedWindow(): string | null {
    let oldestWindow: ManagedWindow | null = null;
    let oldestId: string | null = null;

    for (const [id, window] of this.windows) {
      // Exclude pinned, modal, and hidden windows
      if (window.pinned || window.config.isModal || !window.visible) {
        continue;
      }

      if (!oldestWindow || window.lastInteractionTime < oldestWindow.lastInteractionTime) {
        oldestWindow = window;
        oldestId = id;
      }
    }

    return oldestId;
  }

  /**
   * Handle drag start
   * Returns true if drag or resize started successfully
   */
  public handleDragStart(x: number, y: number): boolean {
    // Find the topmost window at this position
    const clickedWindow = this.getWindowAtPosition(x, y);

    if (!clickedWindow) {
      return false;
    }

    const window = this.windows.get(clickedWindow);
    if (!window) {
      return false;
    }

    // Check if click is on resize handle
    if (this.isOnResizeHandle(window, x, y)) {
      // Start resizing
      window.isResizing = true;
      window.resizeStartWidth = window.width;
      window.resizeStartHeight = window.height;
      window.resizeStartMouseX = x;
      window.resizeStartMouseY = y;

      this.bringToFront(clickedWindow);
      return true;
    }

    // Check if click is in title bar and window is draggable
    if (window.config.isDraggable === false) {
      return false;
    }

    const inTitleBar = y >= window.y && y < window.y + TITLE_BAR_HEIGHT;

    if (!inTitleBar) {
      return false;
    }

    // Don't start drag if clicking on a title bar button
    const button = this.detectTitleBarButton(window, x, y);
    if (button) {
      return false; // Let handleClick handle the button
    }

    // Start dragging
    window.isDragging = true;
    window.dragOffsetX = x - window.x;
    window.dragOffsetY = y - window.y;

    this.bringToFront(clickedWindow);

    return true;
  }

  /**
   * Handle drag movement (for both dragging and resizing)
   */
  public handleDrag(x: number, y: number): void {
    // Validate coordinates
    if (!isFinite(x) || !isFinite(y)) {
      throw new Error('Invalid drag coordinates: x and y must be finite numbers');
    }

    // Find the dragging or resizing window
    const draggingWindow = Array.from(this.windows.values()).find(w => w.isDragging);
    const resizingWindow = Array.from(this.windows.values()).find(w => w.isResizing);

    if (draggingWindow) {
      // Calculate new position
      let newX = x - draggingWindow.dragOffsetX;
      let newY = y - draggingWindow.dragOffsetY;

      // Clamp to canvas bounds (Y must stay below menu bar)
      newX = Math.max(0, Math.min(newX, this.logicalWidth - draggingWindow.width));
      newY = Math.max(MENU_BAR_HEIGHT, Math.min(newY, this.logicalHeight - TITLE_BAR_HEIGHT));

      draggingWindow.x = newX;
      draggingWindow.y = newY;
    } else if (resizingWindow) {
      // Calculate new size
      const deltaX = x - resizingWindow.resizeStartMouseX;
      const deltaY = y - resizingWindow.resizeStartMouseY;

      let newWidth = resizingWindow.resizeStartWidth + deltaX;
      let newHeight = resizingWindow.resizeStartHeight + deltaY;

      // Apply min/max constraints
      const minWidth = resizingWindow.config.minWidth ?? 100;
      const minHeight = resizingWindow.config.minHeight ?? 100;
      const maxWidth = resizingWindow.config.maxWidth ?? this.logicalWidth;
      const maxHeight = resizingWindow.config.maxHeight ?? this.logicalHeight;

      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

      // Don't resize beyond canvas bounds
      newWidth = Math.min(newWidth, this.logicalWidth - resizingWindow.x);
      newHeight = Math.min(newHeight, this.logicalHeight - resizingWindow.y);

      resizingWindow.width = newWidth;
      resizingWindow.height = newHeight;
    }
  }

  /**
   * Handle drag end (for both dragging and resizing)
   */
  public handleDragEnd(): void {
    // Find the dragging or resizing window
    const draggingWindow = Array.from(this.windows.values()).find(w => w.isDragging);
    const resizingWindow = Array.from(this.windows.values()).find(w => w.isResizing);

    if (draggingWindow) {
      draggingWindow.isDragging = false;
      this.saveLayout();
    }

    if (resizingWindow) {
      resizingWindow.isResizing = false;
      this.saveLayout();
    }
  }

  /**
   * Handle click on a window
   * Returns true if click was handled by a window
   */
  public handleClick(x: number, y: number): boolean {
    const clickedWindowId = this.getWindowAtPosition(x, y);

    if (!clickedWindowId) {
      return false;
    }

    const window = this.windows.get(clickedWindowId);
    if (!window) {
      return false;
    }

    // Check if click is on a title bar button
    const inTitleBar = y >= window.y && y < window.y + TITLE_BAR_HEIGHT;

    if (inTitleBar) {
      const button = this.detectTitleBarButton(window, x, y);

      if (button === 'close') {
        this.hideWindow(clickedWindowId);
        return true;
      } else if (button === 'minimize') {
        window.minimized = !window.minimized;
        this.markWindowInteraction(clickedWindowId);
        return true;
      } else if (button === 'pin') {
        this.pinWindow(clickedWindowId, !window.pinned);
        this.markWindowInteraction(clickedWindowId);
        return true;
      }
    } else if (!window.minimized) {
      // Click is in content area - forward to panel if it handles clicks
      const contentY = window.y + TITLE_BAR_HEIGHT;
      const contentHeight = window.height - TITLE_BAR_HEIGHT;

      if (window.panel.handleContentClick) {
        const relativeX = x - window.x;
        const relativeY = y - contentY;
        window.panel.handleContentClick(relativeX, relativeY, window.width, contentHeight);
      }
    }

    // Bring to front and update interaction time
    this.bringToFront(clickedWindowId);
    this.markWindowInteraction(clickedWindowId);
    return true;
  }

  /**
   * Detect which title bar button was clicked
   */
  public handleTitleBarClick(windowId: string, x: number, y: number): TitleBarButton {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window with ID "${windowId}" not found`);
    }

    return this.detectTitleBarButton(window, x, y);
  }

  /**
   * Internal method to detect title bar button
   */
  private detectTitleBarButton(window: ManagedWindow, x: number, y: number): TitleBarButton {
    const closeButtonX = window.x + window.width - BUTTON_SIZE - BUTTON_PADDING;
    const minButtonX = closeButtonX - BUTTON_SIZE - 10;
    const pinButtonX = minButtonX - BUTTON_SIZE - 10;
    const buttonY = window.y + (TITLE_BAR_HEIGHT - BUTTON_SIZE) / 2;

    // Check close button
    if (x >= closeButtonX && x <= closeButtonX + BUTTON_SIZE &&
        y >= buttonY && y <= buttonY + BUTTON_SIZE) {
      return 'close';
    }

    // Check minimize button
    if (x >= minButtonX && x <= minButtonX + BUTTON_SIZE &&
        y >= buttonY && y <= buttonY + BUTTON_SIZE) {
      return 'minimize';
    }

    // Check pin button
    if (x >= pinButtonX && x <= pinButtonX + BUTTON_SIZE &&
        y >= buttonY && y <= buttonY + BUTTON_SIZE) {
      return 'pin';
    }

    return null;
  }

  /**
   * Check if a click is on the resize handle (lower right corner)
   */
  private isOnResizeHandle(window: ManagedWindow, x: number, y: number): boolean {
    if (!window.config.isResizable || window.minimized) {
      return false;
    }

    const handleX = window.x + window.width - RESIZE_HANDLE_SIZE;
    const handleY = window.y + window.height - RESIZE_HANDLE_SIZE;

    return x >= handleX && x < window.x + window.width &&
           y >= handleY && y < window.y + window.height;
  }

  /**
   * Handle mouse wheel scroll over a window
   * Forwards to the panel's handleScroll method if implemented
   */
  public handleWheel(x: number, y: number, deltaY: number): boolean {
    const windowId = this.getWindowAtPosition(x, y);
    if (!windowId) {
      return false;
    }

    const window = this.windows.get(windowId);
    if (!window || window.minimized) {
      return false;
    }

    // Check if mouse is in content area (not title bar)
    const inTitleBar = y >= window.y && y < window.y + TITLE_BAR_HEIGHT;
    if (inTitleBar) {
      return false;
    }

    // Forward to panel's handleScroll if implemented
    if (window.panel.handleScroll) {
      const contentHeight = window.height - TITLE_BAR_HEIGHT;
      return window.panel.handleScroll(deltaY, contentHeight);
    }

    return false;
  }

  /**
   * Get the topmost window at a given position
   */
  private getWindowAtPosition(x: number, y: number): string | null {
    let topWindow: ManagedWindow | null = null;
    let topWindowId: string | null = null;

    for (const [id, window] of this.windows) {
      if (!window.visible) {
        continue;
      }

      const inWindow = x >= window.x && x < window.x + window.width &&
                      y >= window.y && y < window.y + window.height;

      if (inWindow) {
        if (!topWindow || window.zIndex > topWindow.zIndex) {
          topWindow = window;
          topWindowId = id;
        }
      }
    }

    return topWindowId;
  }

  /**
   * Check if two windows overlap
   */
  public checkWindowOverlap(id1: string, id2: string): boolean {
    const window1 = this.windows.get(id1);
    const window2 = this.windows.get(id2);

    if (!window1 || !window2) {
      return false;
    }

    return this.rectanglesOverlap(
      window1.x, window1.y, window1.width, window1.height,
      window2.x, window2.y, window2.width, window2.height
    );
  }

  /**
   * Check if two rectangles overlap
   */
  private rectanglesOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  }

  /**
   * Resolve all window overlaps
   */
  public resolveOverlaps(): void {
    const visibleWindows = Array.from(this.windows.values())
      .filter(w => w.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (let i = 0; i < visibleWindows.length; i++) {
      const window = visibleWindows[i];
      if (!window) continue;

      // Check if this window overlaps with any other
      let hasOverlap = false;
      for (let j = 0; j < visibleWindows.length; j++) {
        if (i === j) continue;

        const other = visibleWindows[j];
        if (!other) continue;

        if (this.rectanglesOverlap(
          window.x, window.y, window.width, window.height,
          other.x, other.y, other.width, other.height
        )) {
          hasOverlap = true;
          break;
        }
      }

      if (hasOverlap) {
        // Find new position for this window
        const position = this.findAvailablePosition(window);
        if (position) {
          window.x = position.x;
          window.y = position.y;
        }
      }
    }
  }

  /**
   * Find an available position for a window
   */
  private findAvailablePosition(window: ManagedWindow): { x: number; y: number } | null {
    // First, try the default position
    if (this.isPositionAvailable(window.config.defaultX, window.config.defaultY, window.width, window.height, window.id)) {
      return { x: window.config.defaultX, y: window.config.defaultY };
    }

    // Spiral search from default position
    const startX = window.config.defaultX;
    const startY = window.config.defaultY;

    for (let i = 1; i <= MAX_SPIRAL_ITERATIONS; i++) {
      const radius = i * SPIRAL_SEARCH_STEP;

      // Try positions in a spiral pattern
      const positions = [
        { x: startX + radius, y: startY },
        { x: startX - radius, y: startY },
        { x: startX, y: startY + radius },
        { x: startX, y: startY - radius },
        { x: startX + radius, y: startY + radius },
        { x: startX - radius, y: startY - radius },
        { x: startX + radius, y: startY - radius },
        { x: startX - radius, y: startY + radius },
      ];

      for (const pos of positions) {
        if (this.isPositionAvailable(pos.x, pos.y, window.width, window.height, window.id)) {
          return { x: pos.x, y: pos.y };
        }
      }
    }

    // Spiral search failed - try cascade
    return this.findCascadePosition(window);
  }

  /**
   * Find a cascade position (offset by title bar height)
   */
  private findCascadePosition(window: ManagedWindow): { x: number; y: number } | null {
    const visibleWindows = Array.from(this.windows.values())
      .filter(w => w.visible && w.id !== window.id)
      .sort((a, b) => a.zIndex - b.zIndex); // Sort by z-index to get correct cascade order

    if (visibleWindows.length === 0) {
      return { x: window.config.defaultX, y: window.config.defaultY };
    }

    // Find the last shown window (highest z-index)
    const lastWindow = visibleWindows[visibleWindows.length - 1];
    if (!lastWindow) {
      return { x: window.config.defaultX, y: window.config.defaultY };
    }

    const cascadeX = lastWindow.x + TITLE_BAR_HEIGHT;
    const cascadeY = lastWindow.y + TITLE_BAR_HEIGHT;

    // Check if cascade position is within bounds and doesn't overlap
    if (cascadeX + window.width <= this.logicalWidth &&
        cascadeY + window.height <= this.logicalHeight &&
        this.isPositionAvailable(cascadeX, cascadeY, window.width, window.height, window.id)) {
      return { x: cascadeX, y: cascadeY };
    }

    // No valid cascade position found
    return null;
  }

  /**
   * Check if a position is available (no overlap with other windows)
   */
  private isPositionAvailable(x: number, y: number, width: number, height: number, excludeId?: string): boolean {
    // Check canvas bounds (Y must be at or below menu bar)
    if (x < 0 || y < MENU_BAR_HEIGHT || x + width > this.logicalWidth || y + height > this.logicalHeight) {
      return false;
    }

    // Check overlap with other windows
    for (const [id, window] of this.windows) {
      if (id === excludeId || !window.visible) {
        continue;
      }

      if (this.rectanglesOverlap(x, y, width, height, window.x, window.y, window.width, window.height)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle canvas resize (receives logical/CSS dimensions, not physical pixels)
   */
  public handleCanvasResize(width: number, height: number): void {
    // Save old dimensions BEFORE updating
    const oldWidth = this.logicalWidth;
    const oldHeight = this.logicalHeight;

    // Store logical dimensions (don't modify canvas.width which is the physical buffer)
    this.logicalWidth = width;
    this.logicalHeight = height;

    // Track windows positioned relative to right/bottom edges
    const rightAlignedThreshold = oldWidth * 0.6; // Windows in right 40%
    const bottomAlignedThreshold = oldHeight * 0.6; // Windows in bottom 40%

    // Reposition windows that are out of bounds
    for (const window of this.windows.values()) {
      const wasRightAligned = window.x > rightAlignedThreshold;
      const wasBottomAligned = window.y > bottomAlignedThreshold;

      const oldOffsetFromRight = oldWidth - (window.x + window.width);
      const oldOffsetFromBottom = oldHeight - (window.y + window.height);

      // Clamp window size
      if (window.width > width) {
        window.width = width;
      }
      if (window.height > height) {
        window.height = height;
      }

      // Maintain relative position for right-aligned windows
      if (wasRightAligned) {
        const newX = width - window.width - oldOffsetFromRight;
        window.x = Math.max(0, Math.min(newX, width - window.width));
      } else {
        // Clamp position for left-aligned windows
        if (window.x + window.width > width) {
          window.x = Math.max(0, width - window.width);
        }
      }

      // Maintain relative position for bottom-aligned windows
      if (wasBottomAligned) {
        const newY = height - window.height - oldOffsetFromBottom;
        window.y = Math.max(MENU_BAR_HEIGHT, Math.min(newY, height - window.height));
      } else {
        // Clamp position for top-aligned windows (stay below menu bar)
        if (window.y + window.height > height) {
          window.y = Math.max(MENU_BAR_HEIGHT, height - window.height);
        }
        // Ensure window is below menu bar
        if (window.y < MENU_BAR_HEIGHT) {
          window.y = MENU_BAR_HEIGHT;
        }
      }
    }
  }

  /**
   * Save layout to localStorage
   */
  public saveLayout(): void {
    const layout: SavedLayout = {
      version: LAYOUT_VERSION,
      windows: {},
      lastSaved: Date.now(),
    };

    for (const [id, window] of this.windows) {
      layout.windows[id] = {
        x: window.x,
        y: window.y,
        width: window.width,
        height: window.height,
        visible: window.visible,
        minimized: window.minimized,
        pinned: window.pinned,
      };
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Failed to save window layout: storage quota exceeded');
      }
      throw new Error(`Failed to save window layout: ${error}`);
    }
  }

  /**
   * Load layout from localStorage
   */
  public loadLayout(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return; // No saved layout, use defaults
      }

      const layout: SavedLayout = JSON.parse(saved);

      // Check version
      if (layout.version !== LAYOUT_VERSION) {
        console.warn(`Window layout version mismatch: expected ${LAYOUT_VERSION}, got ${layout.version}`);
      }

      // Restore window states
      for (const [id, savedWindow] of Object.entries(layout.windows)) {
        const window = this.windows.get(id);

        if (!window) {
          continue; // Window no longer exists
        }

        // Validate saved data - NO SILENT FALLBACKS
        if (savedWindow.x === undefined || savedWindow.y === undefined ||
            savedWindow.width === undefined || savedWindow.height === undefined) {
          console.error(`Saved window "${id}" missing required field, using defaults`);
          continue;
        }

        window.x = savedWindow.x;
        // Ensure restored windows are below menu bar
        window.y = Math.max(MENU_BAR_HEIGHT, savedWindow.y);
        window.width = savedWindow.width;
        window.height = savedWindow.height;
        window.visible = savedWindow.visible ?? false;
        window.minimized = savedWindow.minimized ?? false;
        window.pinned = savedWindow.pinned ?? false;

        // Sync panel visibility (only if panel exists - may be lazy)
        if (window.panel) {
          window.panel.setVisible(window.visible);
        }
      }
    } catch (error) {
      console.error('Failed to load window layout, using defaults:', error);
      // Use defaults (current state)
    }
  }

  /**
   * Reset layout to defaults
   */
  public resetLayout(): void {
    for (const window of this.windows.values()) {
      window.x = window.config.defaultX;
      window.y = window.config.defaultY;
      window.width = window.config.defaultWidth;
      window.height = window.config.defaultHeight;
      window.pinned = false;
      window.minimized = false;
    }

    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Arrange windows in a specific layout
   */
  public arrangeWindows(mode: LayoutMode): void {
    const visibleWindows = Array.from(this.windows.values()).filter(w => w.visible);

    if (mode === 'restore') {
      this.loadLayout();
    } else if (mode === 'cascade') {
      let offsetX = 50;
      let offsetY = MENU_BAR_HEIGHT + 20; // Start below menu bar

      for (const window of visibleWindows) {
        window.x = offsetX;
        window.y = offsetY;
        offsetX += TITLE_BAR_HEIGHT;
        offsetY += TITLE_BAR_HEIGHT;
      }
    } else if (mode === 'tile') {
      // Simple tile layout (account for menu bar height)
      const count = visibleWindows.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const tileWidth = this.logicalWidth / cols;
      const availableHeight = this.logicalHeight - MENU_BAR_HEIGHT;
      const tileHeight = availableHeight / rows;

      visibleWindows.forEach((window, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        window.x = col * tileWidth;
        window.y = MENU_BAR_HEIGHT + row * tileHeight;
        window.width = tileWidth - 10;
        window.height = tileHeight - 10;
      });
    }

    this.saveLayout();
  }

  /**
   * Render all windows
   * @param ctx Canvas rendering context
   * @param world Optional world instance to pass to panels that need it
   */
  public render(ctx: CanvasRenderingContext2D, world?: unknown): void {
    // Sort windows by z-index
    const sortedWindows = Array.from(this.windows.values())
      .filter(w => w.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const window of sortedWindows) {
      // Render window
      this.renderWindow(ctx, window, world);
    }
  }

  /**
   * Render a single window
   */
  private renderWindow(ctx: CanvasRenderingContext2D, window: ManagedWindow, world?: unknown): void {
    // Skip rendering if panel doesn't exist yet (shouldn't happen for visible windows)
    if (!window.panel) {
      console.warn(`[WindowManager] Cannot render window "${window.id}" - panel not created`);
      return;
    }

    // Draw window background (only title bar height when minimized)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(window.x, window.y, window.width, window.minimized ? TITLE_BAR_HEIGHT : window.height);

    // Draw title bar
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(window.x, window.y, window.width, TITLE_BAR_HEIGHT);

    // Draw title text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(window.panel.getTitle(), window.x + 10, window.y + TITLE_BAR_HEIGHT / 2);

    // Draw title bar buttons
    this.renderTitleBarButtons(ctx, window);

    // Draw window content (if not minimized)
    if (!window.minimized) {
      const contentY = window.y + TITLE_BAR_HEIGHT;
      const contentHeight = window.height - TITLE_BAR_HEIGHT;

      ctx.save();
      ctx.beginPath();
      ctx.rect(window.x, contentY, window.width, contentHeight);
      ctx.clip();

      // Translate so panels can render at (0, 0) relative to content area
      ctx.translate(window.x, contentY);

      // Notify panel of its screen position (for HTML overlay elements)
      if (hasSetScreenPosition(window.panel)) {
        window.panel.setScreenPosition(window.x, contentY);
      }

      // Pass (0, 0) as position since we've already translated
      window.panel.render(ctx, 0, 0, window.width, contentHeight, world);

      ctx.restore();
    }

    // Draw border
    ctx.strokeStyle = window.isDragging || window.isResizing ? '#0078d4' : '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(window.x, window.y, window.width, window.minimized ? TITLE_BAR_HEIGHT : window.height);

    // Draw resize handle if window is resizable and not minimized
    if (window.config.isResizable && !window.minimized) {
      const handleX = window.x + window.width - RESIZE_HANDLE_SIZE;
      const handleY = window.y + window.height - RESIZE_HANDLE_SIZE;

      // Draw resize handle background
      ctx.fillStyle = window.isResizing ? '#0078d4' : '#555555';
      ctx.fillRect(handleX, handleY, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE);

      // Draw resize grip lines (three diagonal lines)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const offset = i * 4 + 4;
        ctx.beginPath();
        ctx.moveTo(handleX + offset, handleY + RESIZE_HANDLE_SIZE);
        ctx.lineTo(handleX + RESIZE_HANDLE_SIZE, handleY + offset);
        ctx.stroke();
      }
    }
  }

  /**
   * Render title bar buttons
   */
  private renderTitleBarButtons(ctx: CanvasRenderingContext2D, window: ManagedWindow): void {
    const buttonY = window.y + (TITLE_BAR_HEIGHT - BUTTON_SIZE) / 2;

    // Close button (X)
    const closeX = window.x + window.width - BUTTON_SIZE - BUTTON_PADDING;
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(closeX, buttonY, BUTTON_SIZE, BUTTON_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', closeX + BUTTON_SIZE / 2, buttonY + BUTTON_SIZE / 2);

    // Minimize button (-)
    const minX = closeX - BUTTON_SIZE - 10;
    ctx.fillStyle = '#555555';
    ctx.fillRect(minX, buttonY, BUTTON_SIZE, BUTTON_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('−', minX + BUTTON_SIZE / 2, buttonY + BUTTON_SIZE / 2);

    // Pin button
    const pinX = minX - BUTTON_SIZE - 10;
    ctx.fillStyle = window.pinned ? '#ffaa00' : '#555555';
    ctx.fillRect(pinX, buttonY, BUTTON_SIZE, BUTTON_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('📌', pinX + BUTTON_SIZE / 2, buttonY + BUTTON_SIZE / 2);

    // Reset text alignment to default for subsequent rendering
    ctx.textAlign = 'left';
  }

  /**
   * Event emitter - emit an event
   */
  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Event emitter - register a listener
   */
  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // ============================================================================
  // View-Based Panel Registration
  // ============================================================================

  /**
   * Register panels from the DashboardView registry.
   * This enables automatic panel creation from unified view definitions.
   *
   * @param viewPanels - Array of panels and their configs from ViewPanelFactory
   */
  public registerViewPanels(viewPanels: Array<{ panel: IWindowPanel; config: WindowConfig }>): void {
    for (const { panel, config } of viewPanels) {
      const id = panel.getId();

      // Skip if already registered
      if (this.windows.has(id)) {
        console.warn(`[WindowManager] Panel '${id}' already registered, skipping`);
        continue;
      }

      this.registerWindow(id, panel, config);
    }
  }

  /**
   * Subscribe to view registry changes to auto-add new views.
   * When new views are registered, they are automatically added to the window system.
   *
   * @param createPanelsCallback - Function that creates panels from the registry
   * @returns Unsubscribe function
   */
  public subscribeToViewRegistry(
    createPanelsCallback: () => Array<{ panel: IWindowPanel; config: WindowConfig }>
  ): () => void {
    // Import viewRegistry only when needed to avoid circular dependencies
    const onViewRegistryChange = (): void => {
      const newPanels = createPanelsCallback();
      this.registerViewPanels(newPanels);
    };

    // Call immediately to register existing views
    onViewRegistryChange();

    // Subscribe to future changes (if viewRegistry has subscribe method)
    // For now, we only register once on setup
    // TODO: Wire up viewRegistry.subscribe() when needed

    return () => {
      // Unsubscribe logic would go here
    };
  }

  /**
   * Get the panel instance for a window (may be null if using lazy factory and not yet shown)
   */
  public getPanel(id: string): IWindowPanel | null {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
    }
    return window.panel;
  }
}
