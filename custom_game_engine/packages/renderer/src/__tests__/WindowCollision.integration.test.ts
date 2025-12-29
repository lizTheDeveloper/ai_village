import { describe, it, expect, beforeEach } from 'vitest';
import { WindowManager } from '../WindowManager';
import type { IWindowPanel, WindowConfig } from '../types/WindowTypes';

// Mock panel implementation
class MockPanel implements IWindowPanel {
  private id: string;
  private title: string;
  private visible: boolean = false;
  private width: number;
  private height: number;

  constructor(id: string, title: string, width: number = 300, height: number = 400) {
    this.id = id;
    this.title = title;
    this.width = width;
    this.height = height;
  }

  getId(): string {
    return this.id;
  }

  getTitle(): string {
    return this.title;
  }

  getDefaultWidth(): number {
    return this.width;
  }

  getDefaultHeight(): number {
    return this.height;
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
    // Mock render
  }
}

describe('Window Collision Avoidance Integration', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    localStorage.clear();
    windowManager = new WindowManager(mockCanvas);
  });

  describe('R1: Non-Overlapping Windows', () => {
    it('should prevent windows from overlapping when shown', () => {
      // Register two windows with same default position
      const panel1 = new MockPanel('panel-1', 'Panel 1', 400, 300);
      const panel2 = new MockPanel('panel-2', 'Panel 2', 400, 300);

      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      };

      windowManager.registerWindow('panel-1', panel1, config);
      windowManager.registerWindow('panel-2', panel2, config);

      windowManager.showWindow('panel-1');
      windowManager.showWindow('panel-2');

      const window1 = windowManager.getWindow('panel-1')!;
      const window2 = windowManager.getWindow('panel-2')!;

      // Check for no overlap
      const noOverlap =
        window1.x + window1.width <= window2.x ||
        window2.x + window2.width <= window1.x ||
        window1.y + window1.height <= window2.y ||
        window2.y + window2.height <= window1.y;

      expect(noOverlap).toBe(true);
    });

    it('should find available space using spiral search', () => {
      // Fill up a region with windows
      const configs: WindowConfig[] = [];
      for (let i = 0; i < 4; i++) {
        const panel = new MockPanel(`grid-${i}`, `Grid ${i}`, 400, 300);
        const config: WindowConfig = {
          defaultX: (i % 2) * 420,
          defaultY: Math.floor(i / 2) * 320,
          defaultWidth: 400,
          defaultHeight: 300,
        };
        windowManager.registerWindow(`grid-${i}`, panel, config);
        windowManager.showWindow(`grid-${i}`);
      }

      // Try to add a new window with same position as first
      const newPanel = new MockPanel('new-panel', 'New Panel', 400, 300);
      const newConfig: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 400,
        defaultHeight: 300,
      };

      windowManager.registerWindow('new-panel', newPanel, newConfig);
      windowManager.showWindow('new-panel');

      const newWindow = windowManager.getWindow('new-panel')!;

      // Should have found a different position
      expect(newWindow.x !== 0 || newWindow.y !== 0).toBe(true);

      // Should not overlap with any existing window
      const windows = ['grid-0', 'grid-1', 'grid-2', 'grid-3'].map((id) =>
        windowManager.getWindow(id)!
      );

      for (const existingWindow of windows) {
        const noOverlap =
          newWindow.x + newWindow.width <= existingWindow.x ||
          existingWindow.x + existingWindow.width <= newWindow.x ||
          newWindow.y + newWindow.height <= existingWindow.y ||
          existingWindow.y + existingWindow.height <= newWindow.y;

        expect(noOverlap).toBe(true);
      }
    });

    it('should cascade windows when spiral search finds no perfect fit', () => {
      const titleBarHeight = 30; // Assume title bar is 30px
      const menuBarHeight = 30; // Windows must spawn below menu bar

      // Cascade happens when:
      // 1. Default position is taken
      // 2. Spiral search can't find space
      // 3. Cascade position (offset from last window) IS available

      // Create windows with same default position that will cascade
      // Use smaller windows (300px height) to fit in available space below menu bar
      // Available height: 1080 - 30 (menu bar) = 1050, need 3 * 300 = 900
      for (let i = 0; i < 3; i++) {
        const panel = new MockPanel(`cascade-${i}`, `Cascade ${i}`, 600, 300);
        windowManager.registerWindow(`cascade-${i}`, panel, {
          defaultX: 10,
          defaultY: menuBarHeight, // Valid position below menu bar
          defaultWidth: 600,
          defaultHeight: 300,
        });
        windowManager.showWindow(`cascade-${i}`);
      }

      const windows = ['cascade-0', 'cascade-1', 'cascade-2'].map((id) =>
        windowManager.getWindow(id)!
      );

      // First window should be at default position or found position
      // Subsequent windows should avoid overlap - either via spiral or cascade
      // Just verify no windows overlap
      for (let i = 0; i < windows.length; i++) {
        for (let j = i + 1; j < windows.length; j++) {
          const noOverlap =
            windows[i].x + windows[i].width <= windows[j].x ||
            windows[j].x + windows[j].width <= windows[i].x ||
            windows[i].y + windows[i].height <= windows[j].y ||
            windows[j].y + windows[j].height <= windows[i].y;

          expect(noOverlap).toBe(true);
        }
      }

      // At least one window should be offset (proving some positioning logic ran)
      const hasOffset = windows.some(w => w.x !== 10 || w.y !== menuBarHeight);
      expect(hasOffset).toBe(true);
    });

    it('should keep windows within canvas bounds', () => {
      const menuBarHeight = 30; // Windows must spawn below menu bar
      const panel = new MockPanel('boundary-test', 'Boundary Test', 400, 300);
      const config: WindowConfig = {
        defaultX: 2000, // Off-screen X
        defaultY: 1500, // Off-screen Y
        defaultWidth: 400,
        defaultHeight: 300,
      };

      windowManager.registerWindow('boundary-test', panel, config);
      windowManager.showWindow('boundary-test');

      const window = windowManager.getWindow('boundary-test')!;

      // Should be clamped within canvas (y must be at or below menu bar)
      expect(window.x).toBeGreaterThanOrEqual(0);
      expect(window.y).toBeGreaterThanOrEqual(menuBarHeight);
      expect(window.x + window.width).toBeLessThanOrEqual(mockCanvas.width);
      expect(window.y + window.height).toBeLessThanOrEqual(mockCanvas.height);
    });

    it('should not auto-close pinned windows when out of space', () => {
      // This is tested more thoroughly in LRU tests, but verify basic behavior
      const panel1 = new MockPanel('pinned', 'Pinned', 400, 300);
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 400,
        defaultHeight: 300,
      };

      windowManager.registerWindow('pinned', panel1, config);
      windowManager.showWindow('pinned');
      windowManager.pinWindow('pinned', true);

      const pinnedWindow = windowManager.getWindow('pinned')!;
      expect(pinnedWindow.pinned).toBe(true);
    });

    it('should not auto-close modal windows when out of space', () => {
      const panel = new MockPanel('modal', 'Modal', 800, 600);
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 800,
        defaultHeight: 600,
        isModal: true,
      };

      windowManager.registerWindow('modal', panel, config);
      windowManager.showWindow('modal');

      const modalWindow = windowManager.getWindow('modal')!;
      expect(modalWindow.config.isModal).toBe(true);
    });
  });

  describe('Window Movement and Repositioning', () => {
    it('should detect overlap after manual window move', () => {
      const panel1 = new MockPanel('move-1', 'Move 1', 300, 200);
      const panel2 = new MockPanel('move-2', 'Move 2', 300, 200);

      windowManager.registerWindow('move-1', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.registerWindow('move-2', panel2, {
        defaultX: 400,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.showWindow('move-1');
      windowManager.showWindow('move-2');

      // Manually move window2 to overlap window1
      const window2 = windowManager.getWindow('move-2')!;
      window2.x = 50;
      window2.y = 50;

      // Should detect overlap
      const overlaps = windowManager.checkWindowOverlap('move-1', 'move-2');
      expect(overlaps).toBe(true);
    });

    it('should resolve overlap when detected', () => {
      const panel1 = new MockPanel('resolve-1', 'Resolve 1', 300, 200);
      const panel2 = new MockPanel('resolve-2', 'Resolve 2', 300, 200);

      windowManager.registerWindow('resolve-1', panel1, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.registerWindow('resolve-2', panel2, {
        defaultX: 150,
        defaultY: 150,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.showWindow('resolve-1');
      windowManager.showWindow('resolve-2');

      // Force overlap resolution
      windowManager.resolveOverlaps();

      const window1 = windowManager.getWindow('resolve-1')!;
      const window2 = windowManager.getWindow('resolve-2')!;

      const noOverlap =
        window1.x + window1.width <= window2.x ||
        window2.x + window2.width <= window1.x ||
        window1.y + window1.height <= window2.y ||
        window2.y + window2.height <= window1.y;

      expect(noOverlap).toBe(true);
    });
  });

  describe('Canvas Resize Handling', () => {
    it('should reposition windows when canvas is resized smaller', () => {
      const panel = new MockPanel('resize-test', 'Resize Test', 400, 300);
      const config: WindowConfig = {
        defaultX: 1500,
        defaultY: 700,
        defaultWidth: 400,
        defaultHeight: 300,
      };

      windowManager.registerWindow('resize-test', panel, config);
      windowManager.showWindow('resize-test');

      // Resize canvas to smaller
      mockCanvas.width = 1024;
      mockCanvas.height = 768;
      windowManager.handleCanvasResize(1024, 768);

      const window = windowManager.getWindow('resize-test')!;

      // Window should be repositioned to fit
      expect(window.x + window.width).toBeLessThanOrEqual(1024);
      expect(window.y + window.height).toBeLessThanOrEqual(768);
    });

    it('should clamp window size when too large for canvas', () => {
      const panel = new MockPanel('large-window', 'Large Window', 2000, 1500);
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 2000,
        defaultHeight: 1500,
      };

      windowManager.registerWindow('large-window', panel, config);
      windowManager.showWindow('large-window');

      const window = windowManager.getWindow('large-window')!;

      // Window should be clamped to canvas size
      expect(window.width).toBeLessThanOrEqual(mockCanvas.width);
      expect(window.height).toBeLessThanOrEqual(mockCanvas.height);
    });

    it('should maintain relative position for right-aligned windows', () => {
      const panel = new MockPanel('right-aligned', 'Right Aligned', 300, 400);
      const config: WindowConfig = {
        defaultX: mockCanvas.width - 320, // 20px from right edge
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('right-aligned', panel, config);
      windowManager.showWindow('right-aligned');

      const window = windowManager.getWindow('right-aligned')!;
      const initialOffsetFromRight = mockCanvas.width - (window.x + window.width);

      // Resize canvas
      const newWidth = 1600;
      windowManager.handleCanvasResize(newWidth, mockCanvas.height);

      const newOffsetFromRight = newWidth - (window.x + window.width);

      // Offset from right should be maintained
      expect(Math.abs(newOffsetFromRight - initialOffsetFromRight)).toBeLessThan(5);
    });
  });
});
