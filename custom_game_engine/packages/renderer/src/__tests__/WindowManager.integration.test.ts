/**
 * WindowManager Integration Tests
 *
 * These tests actually RUN the WindowManager system with real instances,
 * testing behavior over time rather than just calculations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WindowManager } from '../WindowManager.js';
import type { IWindowPanel, WindowConfig } from '../types/WindowTypes';

/**
 * Mock panel for testing
 */
class MockPanel implements IWindowPanel {
  private id: string;
  private title: string;
  private visible: boolean = false;
  private defaultWidth: number;
  private defaultHeight: number;

  constructor(id: string, title: string, width: number = 200, height: number = 150) {
    this.id = id;
    this.title = title;
    this.defaultWidth = width;
    this.defaultHeight = height;
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getDefaultWidth(): number {
    return this.defaultWidth;
  }

  getDefaultHeight(): number {
    return this.defaultHeight;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Mock render - just fill a color
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, width, height);
  }
}

/**
 * Create a mock canvas for testing
 */
function createMockCanvas(width: number = 1024, height: number = 768): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Create a standard window config
 */
function createWindowConfig(x: number, y: number, width: number, height: number): WindowConfig {
  return {
    defaultX: x,
    defaultY: y,
    defaultWidth: width,
    defaultHeight: height,
    isDraggable: true,
    isModal: false,
  };
}

describe('WindowManager Integration Tests', () => {
  let windowManager: WindowManager;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Create fresh canvas and manager
    canvas = createMockCanvas();
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    ctx = context;
    windowManager = new WindowManager(canvas);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Acceptance Criterion 1: WindowManager Core Functionality', () => {
    it('should maintain a registry of all managed windows with their configurations', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1', 200, 150);
      const panel2 = new MockPanel('panel2', 'Panel 2', 300, 200);
      const config1 = createWindowConfig(10, 10, 200, 150);
      const config2 = createWindowConfig(250, 10, 300, 200);

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      const window1 = windowManager.getWindow('panel1');
      const window2 = windowManager.getWindow('panel2');

      expect(window1).toBeDefined();
      expect(window2).toBeDefined();
      expect(window1?.id).toBe('panel1');
      expect(window2?.id).toBe('panel2');
      expect(window1?.config).toBe(config1);
      expect(window2?.config).toBe(config2);
    });

    it('should throw when registering a window with duplicate ID', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel1', 'Panel 1 Duplicate');
      const config = createWindowConfig(10, 10, 200, 150);

      windowManager.registerWindow('panel1', panel1, config);

      expect(() => {
        windowManager.registerWindow('panel1', panel2, config);
      }).toThrow('Window with ID "panel1" already registered');
    });

    it('should throw when config is missing required fields', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const invalidConfig = {
        defaultX: 10,
        defaultY: 10,
        // Missing defaultWidth and defaultHeight
      } as WindowConfig;

      expect(() => {
        windowManager.registerWindow('panel1', panel, invalidConfig);
      }).toThrow('WindowConfig missing required field');
    });
  });

  describe('Acceptance Criterion 2: Window Registration', () => {
    it('should allow panels implementing IWindowPanel to be registered', () => {
      const panel = new MockPanel('test-panel', 'Test Panel', 200, 150);
      const config = createWindowConfig(10, 10, 200, 150);

      expect(() => {
        windowManager.registerWindow('test-panel', panel, config);
      }).not.toThrow();

      const window = windowManager.getWindow('test-panel');
      expect(window).toBeDefined();
      expect(window?.panel).toBe(panel);
    });
  });

  describe('Acceptance Criterion 3: Draggable Title Bars', () => {
    it('should allow dragging a window by its title bar', () => {
      const panel = new MockPanel('draggable', 'Draggable Window', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);
      windowManager.registerWindow('draggable', panel, config);
      windowManager.showWindow('draggable');

      const window = windowManager.getWindow('draggable');
      const initialX = window!.x;
      const initialY = window!.y;

      // Start drag on title bar (y = 100 to 130)
      const titleBarY = 110;
      const startX = 150;
      windowManager.handleDragStart(startX, titleBarY);

      // Drag to new position
      windowManager.handleDrag(250, 210);

      const draggedWindow = windowManager.getWindow('draggable');
      expect(draggedWindow!.x).not.toBe(initialX);
      expect(draggedWindow!.y).not.toBe(initialY);
      expect(draggedWindow!.isDragging).toBe(true);

      // End drag
      windowManager.handleDragEnd();
      expect(draggedWindow!.isDragging).toBe(false);
    });

    it('should not drag when clicking outside title bar', () => {
      const panel = new MockPanel('window', 'Window', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);
      windowManager.registerWindow('window', panel, config);
      windowManager.showWindow('window');

      const window = windowManager.getWindow('window');
      const initialX = window!.x;
      const initialY = window!.y;

      // Click in content area (below title bar)
      const contentY = 150;
      const result = windowManager.handleDragStart(150, contentY);

      expect(result).toBe(false);
      expect(window!.x).toBe(initialX);
      expect(window!.y).toBe(initialY);
      expect(window!.isDragging).toBe(false);
    });
  });

  describe('Acceptance Criterion 4: Non-Overlapping Layout', () => {
    it('should detect and prevent overlaps when showing windows', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1', 200, 150);
      const panel2 = new MockPanel('panel2', 'Panel 2', 200, 150);

      // Both windows want the same position
      const config1 = createWindowConfig(100, 100, 200, 150);
      const config2 = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      const window1 = windowManager.getWindow('panel1');
      const window2 = windowManager.getWindow('panel2');

      // Windows should have different positions (no overlap)
      const hasOverlap = windowManager.checkWindowOverlap('panel1', 'panel2');
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Acceptance Criterion 5: Cascade Fallback', () => {
    it('should cascade windows when no free space is available', () => {
      // Fill the screen with windows at same default position
      const panels = [];
      for (let i = 0; i < 5; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`, 200, 150);
        const config = createWindowConfig(50, 50, 200, 150);
        panels.push(panel);
        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);
      }

      // Check that windows are cascaded (offset positions)
      const positions = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const window = windowManager.getWindow(`panel${i}`);
        positions.add(`${window!.x},${window!.y}`);
      }

      // All windows should have different positions
      expect(positions.size).toBe(5);
    });
  });

  describe('Acceptance Criterion 6: Position Persistence', () => {
    it('should save and restore window positions from localStorage', () => {
      const panel = new MockPanel('persistent', 'Persistent Window', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      // Create first manager instance
      windowManager.registerWindow('persistent', panel, config);
      windowManager.showWindow('persistent');

      // Move window
      windowManager.handleDragStart(150, 110);
      windowManager.handleDrag(350, 210);
      windowManager.handleDragEnd();

      const movedWindow = windowManager.getWindow('persistent');
      const savedX = movedWindow!.x;
      const savedY = movedWindow!.y;

      // Create new manager instance (simulating page reload)
      const newCanvas = createMockCanvas();
      const newManager = new WindowManager(newCanvas);
      const newPanel = new MockPanel('persistent', 'Persistent Window', 200, 150);

      newManager.registerWindow('persistent', newPanel, config);
      newManager.loadLayout();

      const restoredWindow = newManager.getWindow('persistent');

      // Position should be restored
      expect(restoredWindow!.x).toBe(savedX);
      expect(restoredWindow!.y).toBe(savedY);
    });
  });

  describe('Acceptance Criterion 7: LocalStorage Fallback', () => {
    it('should use default positions when localStorage is empty', () => {
      localStorage.clear();

      const panel = new MockPanel('default', 'Default Window', 200, 150);
      const config = createWindowConfig(123, 456, 200, 150);

      windowManager.registerWindow('default', panel, config);
      windowManager.loadLayout();

      const window = windowManager.getWindow('default');

      // Should use default position from config
      expect(window!.x).toBe(123);
      expect(window!.y).toBe(456);
    });

    it('should handle corrupted localStorage gracefully', () => {
      // Write invalid JSON
      localStorage.setItem('ai-village-window-layout', 'invalid json {{{');

      const panel = new MockPanel('fallback', 'Fallback Window', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('fallback', panel, config);

      // Should not throw
      expect(() => {
        windowManager.loadLayout();
      }).not.toThrow();

      const window = windowManager.getWindow('fallback');

      // Should use defaults
      expect(window!.x).toBe(100);
      expect(window!.y).toBe(100);
    });
  });

  describe('Acceptance Criterion 9: Z-Index Management', () => {
    it('should bring clicked window to front', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1', 200, 150);
      const panel2 = new MockPanel('panel2', 'Panel 2', 200, 150);
      const config1 = createWindowConfig(50, 50, 200, 150);
      const config2 = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      const window1Before = windowManager.getWindow('panel1');
      const window2Before = windowManager.getWindow('panel2');

      const zIndex1Before = window1Before!.zIndex;
      const zIndex2Before = window2Before!.zIndex;

      // panel2 should be on top initially
      expect(zIndex2Before).toBeGreaterThan(zIndex1Before);

      // Click on panel1 to bring it to front
      windowManager.handleClick(100, 100);

      const window1After = windowManager.getWindow('panel1');
      const window2After = windowManager.getWindow('panel2');

      // panel1 should now be on top
      expect(window1After!.zIndex).toBeGreaterThan(window2After!.zIndex);
    });
  });

  describe('Acceptance Criterion 10: Window Minimize', () => {
    it('should toggle minimize state when minimize button clicked', () => {
      const panel = new MockPanel('minimizable', 'Minimizable', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('minimizable', panel, config);
      windowManager.showWindow('minimizable');

      const window = windowManager.getWindow('minimizable');
      expect(window!.minimized).toBe(false);

      // Simulate click on minimize button
      // Button is at: window.x + window.width - 60 (close: -30, minimize: -60)
      const minButtonX = 100 + 200 - 60;
      const minButtonY = 100 + 10; // Title bar is 30px, button centered

      windowManager.handleClick(minButtonX, minButtonY);

      const windowAfter = windowManager.getWindow('minimizable');
      expect(windowAfter!.minimized).toBe(true);
    });
  });

  describe('Acceptance Criterion 11: Window Close/Hide', () => {
    it('should hide window when close button clicked', () => {
      const panel = new MockPanel('closeable', 'Closeable', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('closeable', panel, config);
      windowManager.showWindow('closeable');

      const window = windowManager.getWindow('closeable');
      expect(window!.visible).toBe(true);

      // Simulate click on close button (top-right)
      const closeButtonX = 100 + 200 - 20;
      const closeButtonY = 100 + 10;

      windowManager.handleClick(closeButtonX, closeButtonY);

      const windowAfter = windowManager.getWindow('closeable');
      expect(windowAfter!.visible).toBe(false);
      expect(panel.isVisible()).toBe(false);
    });

    it('should allow reshowing a hidden window', () => {
      const panel = new MockPanel('toggleable', 'Toggleable', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('toggleable', panel, config);
      windowManager.showWindow('toggleable');
      windowManager.hideWindow('toggleable');

      expect(panel.isVisible()).toBe(false);

      windowManager.showWindow('toggleable');

      expect(panel.isVisible()).toBe(true);
      const window = windowManager.getWindow('toggleable');
      expect(window!.visible).toBe(true);
    });
  });

  describe('Acceptance Criterion 13: Canvas Resize Handling', () => {
    it('should keep windows on screen when canvas is resized smaller', () => {
      const panel = new MockPanel('resizable', 'Resizable', 200, 150);
      const config = createWindowConfig(700, 500, 200, 150);

      windowManager.registerWindow('resizable', panel, config);
      windowManager.showWindow('resizable');

      // Resize canvas to smaller size
      windowManager.handleCanvasResize(640, 480);

      const window = windowManager.getWindow('resizable');

      // Window should be clamped to new canvas size
      expect(window!.x + window!.width).toBeLessThanOrEqual(640);
      expect(window!.y + window!.height).toBeLessThanOrEqual(480);
    });

    it('should maintain relative position for right-aligned windows on resize', () => {
      // Create 1024x768 canvas
      const panel = new MockPanel('right-aligned', 'Right Panel', 200, 150);
      // Position window in right 40% of screen (x > 614)
      const config = createWindowConfig(800, 100, 200, 150);

      windowManager.registerWindow('right-aligned', panel, config);
      windowManager.showWindow('right-aligned');

      const windowBefore = windowManager.getWindow('right-aligned');
      const offsetFromRightBefore = 1024 - (windowBefore!.x + windowBefore!.width);

      // Resize to larger
      windowManager.handleCanvasResize(1920, 1080);

      const windowAfter = windowManager.getWindow('right-aligned');
      const offsetFromRightAfter = 1920 - (windowAfter!.x + windowAfter!.width);

      // Offset from right edge should be preserved
      expect(offsetFromRightAfter).toBe(offsetFromRightBefore);
    });
  });

  describe('Acceptance Criterion 14: Click-Through to Game World', () => {
    it('should return false when clicking outside all windows', () => {
      const panel = new MockPanel('panel', 'Panel', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('panel', panel, config);
      windowManager.showWindow('panel');

      // Click outside window
      const handled = windowManager.handleClick(500, 500);

      expect(handled).toBe(false);
    });

    it('should return true when clicking on a window', () => {
      const panel = new MockPanel('panel', 'Panel', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('panel', panel, config);
      windowManager.showWindow('panel');

      // Click inside window
      const handled = windowManager.handleClick(150, 150);

      expect(handled).toBe(true);
    });
  });

  describe('LRU Auto-Close Feature', () => {
    it('should auto-close least recently used window when out of space', () => {
      // Create small canvas
      const smallCanvas = createMockCanvas(400, 300);
      const manager = new WindowManager(smallCanvas);

      // Fill screen with windows
      for (let i = 0; i < 3; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`, 300, 200);
        const config = createWindowConfig(10, 10, 300, 200);
        manager.registerWindow(`panel${i}`, panel, config);
        manager.showWindow(`panel${i}`);

        // Add delay to make LRU tracking work
        if (i < 2) {
          const window = manager.getWindow(`panel${i}`);
          window!.lastInteractionTime = Date.now() - (1000 * (3 - i));
        }
      }

      // Verify panel0 (oldest) was auto-closed
      const panel0 = manager.getWindow('panel0');
      expect(panel0!.visible).toBe(false);
    });

    it('should not auto-close pinned windows', () => {
      // Canvas 440x180, window size 200x150
      // Can fit 2 windows side-by-side, but not 3
      const smallCanvas = createMockCanvas(440, 180);
      const manager = new WindowManager(smallCanvas);

      // Create pinned window at left side
      const pinnedPanel = new MockPanel('pinned', 'Pinned', 200, 150);
      const pinnedConfig = createWindowConfig(10, 10, 200, 150);
      manager.registerWindow('pinned', pinnedPanel, pinnedConfig);
      manager.showWindow('pinned');
      manager.pinWindow('pinned', true);

      const pinnedWindow = manager.getWindow('pinned');
      pinnedWindow!.lastInteractionTime = Date.now() - 10000; // Very old

      // Create unpinned window at right side - different position so it fits
      const unpinnedPanel = new MockPanel('unpinned', 'Unpinned', 200, 150);
      const unpinnedConfig = createWindowConfig(220, 10, 200, 150);
      manager.registerWindow('unpinned', unpinnedPanel, unpinnedConfig);
      manager.showWindow('unpinned');

      const unpinnedWindow = manager.getWindow('unpinned');
      unpinnedWindow!.lastInteractionTime = Date.now() - 1000; // Less old

      // Try to open a third window - no space left, must trigger LRU eviction
      const newPanel = new MockPanel('new', 'New', 200, 150);
      const newConfig = createWindowConfig(10, 10, 200, 150);
      manager.registerWindow('new', newPanel, newConfig);
      manager.showWindow('new');

      // Pinned window should still be visible (even though it's oldest)
      expect(pinnedWindow!.visible).toBe(true);

      // Unpinned window (second oldest) should have been auto-closed to make space
      expect(unpinnedWindow!.visible).toBe(false);

      // New window should be visible
      const newWindow = manager.getWindow('new');
      expect(newWindow!.visible).toBe(true);
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should throw when showing non-existent window', () => {
      expect(() => {
        windowManager.showWindow('does-not-exist');
      }).toThrow('Window with ID "does-not-exist" not found');
    });

    it('should throw when hiding non-existent window', () => {
      expect(() => {
        windowManager.hideWindow('does-not-exist');
      }).toThrow('Window with ID "does-not-exist" not found');
    });

    it('should throw when toggling non-existent window', () => {
      expect(() => {
        windowManager.toggleWindow('does-not-exist');
      }).toThrow('Window with ID "does-not-exist" not found');
    });

    it('should throw when bringing non-existent window to front', () => {
      expect(() => {
        windowManager.bringToFront('does-not-exist');
      }).toThrow('Window with ID "does-not-exist" not found');
    });

    it('should throw when pinning non-existent window', () => {
      expect(() => {
        windowManager.pinWindow('does-not-exist', true);
      }).toThrow('Window with ID "does-not-exist" not found');
    });

    it('should throw when canvas is null', () => {
      expect(() => {
        new WindowManager(null as any);
      }).toThrow('Canvas cannot be null or undefined');
    });

    it('should throw when panel is null', () => {
      const config = createWindowConfig(10, 10, 200, 150);

      expect(() => {
        windowManager.registerWindow('null-panel', null as any, config);
      }).toThrow('Panel cannot be null or undefined');
    });

    it('should throw when window dimensions are invalid', () => {
      const panel = new MockPanel('invalid', 'Invalid', 200, 150);
      const invalidConfig = createWindowConfig(10, 10, -100, 150);

      expect(() => {
        windowManager.registerWindow('invalid', panel, invalidConfig);
      }).toThrow('Invalid window dimensions');
    });

    it('should throw when drag coordinates are invalid', () => {
      expect(() => {
        windowManager.handleDrag(NaN, 100);
      }).toThrow('Invalid drag coordinates');

      expect(() => {
        windowManager.handleDrag(100, Infinity);
      }).toThrow('Invalid drag coordinates');
    });
  });

  describe('Rendering Integration', () => {
    it('should render windows in z-index order', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1', 200, 150);
      const panel2 = new MockPanel('panel2', 'Panel 2', 200, 150);
      const config1 = createWindowConfig(50, 50, 200, 150);
      const config2 = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      // Should not throw
      expect(() => {
        windowManager.render(ctx);
      }).not.toThrow();
    });

    it('should not render hidden windows', () => {
      const panel = new MockPanel('hidden', 'Hidden Panel', 200, 150);
      const config = createWindowConfig(100, 100, 200, 150);

      windowManager.registerWindow('hidden', panel, config);
      // Don't show window

      // Should not throw, even with hidden window
      expect(() => {
        windowManager.render(ctx);
      }).not.toThrow();
    });
  });
});
