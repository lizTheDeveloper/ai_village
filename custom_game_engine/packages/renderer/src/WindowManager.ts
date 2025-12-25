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
const BUTTON_SIZE = 20;
const BUTTON_PADDING = 10;
const SPIRAL_SEARCH_STEP = 50;
const MAX_SPIRAL_ITERATIONS = 100;

export class WindowManager {
  private windows: Map<string, ManagedWindow> = new Map();
  private canvas: HTMLCanvasElement;
  private nextZIndex: number = 1;
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    if (!canvas) {
      throw new Error('Canvas cannot be null or undefined');
    }
    this.canvas = canvas;
  }

  /**
   * Register a window with the manager
   */
  public registerWindow(id: string, panel: IWindowPanel, config: WindowConfig): void {
    // Validate inputs - NO SILENT FALLBACKS
    if (!panel) {
      throw new Error('Panel cannot be null or undefined');
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
   * Show a window
   */
  public showWindow(id: string): void {
    const window = this.windows.get(id);
    if (!window) {
      throw new Error(`Window with ID "${id}" not found`);
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
    if (window.width > this.canvas.width) {
      window.width = this.canvas.width;
    }
    if (window.height > this.canvas.height) {
      window.height = this.canvas.height;
    }

    // Check for space and handle collision avoidance
    const position = this.findAvailablePosition(window);

    if (position) {
      window.x = position.x;
      window.y = position.y;
    } else {
      // No space found - try LRU eviction
      const lruWindowId = this.findLeastRecentlyUsedWindow();

      if (lruWindowId === null) {
        // All windows are pinned or modal
        throw new Error('Cannot open window - unpin a window to make space');
      }

      // Close the LRU window
      const lruWindow = this.windows.get(lruWindowId);
      if (lruWindow) {
        console.log(`Auto-closed "${lruWindowId}" (last used: ${new Date(lruWindow.lastInteractionTime).toISOString()})`);

        this.hideWindow(lruWindowId);

        // Emit notification
        this.emit('window:auto-closed', {
          windowId: lruWindowId,
          windowTitle: lruWindow.panel.getTitle(),
          reason: 'out-of-space',
        } as WindowAutoCloseEvent);

        // Try to find position again
        const newPosition = this.findAvailablePosition(window);
        if (newPosition) {
          window.x = newPosition.x;
          window.y = newPosition.y;
        }
      }
    }

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
    window.panel.setVisible(false);
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
   * Returns true if drag started successfully
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

    // Check if click is in title bar and window is draggable
    if (window.config.isDraggable === false) {
      return false;
    }

    const inTitleBar = y >= window.y && y < window.y + TITLE_BAR_HEIGHT;

    if (!inTitleBar) {
      return false;
    }

    // Start dragging
    window.isDragging = true;
    window.dragOffsetX = x - window.x;
    window.dragOffsetY = y - window.y;

    this.bringToFront(clickedWindow);

    return true;
  }

  /**
   * Handle drag movement
   */
  public handleDrag(x: number, y: number): void {
    // Validate coordinates
    if (!isFinite(x) || !isFinite(y)) {
      throw new Error('Invalid drag coordinates: x and y must be finite numbers');
    }

    // Find the dragging window
    const draggingWindow = Array.from(this.windows.values()).find(w => w.isDragging);

    if (!draggingWindow) {
      return;
    }

    // Calculate new position
    let newX = x - draggingWindow.dragOffsetX;
    let newY = y - draggingWindow.dragOffsetY;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(newX, this.canvas.width - draggingWindow.width));
    newY = Math.max(0, Math.min(newY, this.canvas.height - TITLE_BAR_HEIGHT));

    draggingWindow.x = newX;
    draggingWindow.y = newY;
  }

  /**
   * Handle drag end
   */
  public handleDragEnd(): void {
    // Find the dragging window
    const draggingWindow = Array.from(this.windows.values()).find(w => w.isDragging);

    if (draggingWindow) {
      draggingWindow.isDragging = false;
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

    // Check if cascade position is within bounds (allow overlap for cascading)
    if (cascadeX + window.width <= this.canvas.width &&
        cascadeY + window.height <= this.canvas.height) {
      return { x: cascadeX, y: cascadeY };
    }

    // Cascade would go off-screen - try default position
    if (window.config.defaultX + window.width <= this.canvas.width &&
        window.config.defaultY + window.height <= this.canvas.height) {
      return { x: window.config.defaultX, y: window.config.defaultY };
    }

    // No valid cascade position found
    return null;
  }

  /**
   * Check if a position is available (no overlap with other windows)
   */
  private isPositionAvailable(x: number, y: number, width: number, height: number, excludeId?: string): boolean {
    // Check canvas bounds
    if (x < 0 || y < 0 || x + width > this.canvas.width || y + height > this.canvas.height) {
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
   * Handle canvas resize
   */
  public handleCanvasResize(width: number, height: number): void {
    // Save old dimensions BEFORE updating canvas
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;

    this.canvas.width = width;
    this.canvas.height = height;

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
        window.y = Math.max(0, Math.min(newY, height - window.height));
      } else {
        // Clamp position for top-aligned windows
        if (window.y + window.height > height) {
          window.y = Math.max(0, height - window.height);
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
        window.y = savedWindow.y;
        window.width = savedWindow.width;
        window.height = savedWindow.height;
        window.visible = savedWindow.visible ?? false;
        window.minimized = savedWindow.minimized ?? false;
        window.pinned = savedWindow.pinned ?? false;

        // Sync panel visibility
        window.panel.setVisible(window.visible);
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
      let offsetY = 50;

      for (const window of visibleWindows) {
        window.x = offsetX;
        window.y = offsetY;
        offsetX += TITLE_BAR_HEIGHT;
        offsetY += TITLE_BAR_HEIGHT;
      }
    } else if (mode === 'tile') {
      // Simple tile layout
      const count = visibleWindows.length;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const tileWidth = this.canvas.width / cols;
      const tileHeight = this.canvas.height / rows;

      visibleWindows.forEach((window, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        window.x = col * tileWidth;
        window.y = row * tileHeight;
        window.width = tileWidth - 10;
        window.height = tileHeight - 10;
      });
    }

    this.saveLayout();
  }

  /**
   * Render all windows
   */
  public render(ctx: CanvasRenderingContext2D): void {
    // Sort windows by z-index
    const sortedWindows = Array.from(this.windows.values())
      .filter(w => w.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const window of sortedWindows) {
      // Render window
      this.renderWindow(ctx, window);
    }
  }

  /**
   * Render a single window
   */
  private renderWindow(ctx: CanvasRenderingContext2D, window: ManagedWindow): void {
    // Draw window background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(window.x, window.y, window.width, window.height);

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

      window.panel.render(ctx, window.x, contentY, window.width, contentHeight);

      ctx.restore();
    }

    // Draw border
    ctx.strokeStyle = window.isDragging ? '#0078d4' : '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(window.x, window.y, window.width, window.minimized ? TITLE_BAR_HEIGHT : window.height);
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
  }

  /**
   * Event emitter - emit an event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Event emitter - register a listener
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
}
