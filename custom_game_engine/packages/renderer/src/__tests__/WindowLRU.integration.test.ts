import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

describe('LRU (Least Recently Used) Eviction System', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    localStorage.clear();
    windowManager = new WindowManager(mockCanvas);

    // Mock Date.now for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('LRU Tracking', () => {
    it('should track lastInteractionTime when window is interacted with', () => {
      const panel = new MockPanel('lru-test', 'LRU Test');
      windowManager.registerWindow('lru-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('lru-test');

      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      windowManager.markWindowInteraction('lru-test');
      const window1 = windowManager.getWindow('lru-test')!;
      expect(window1.lastInteractionTime).toBe(initialTime);

      // Advance time and interact again
      vi.advanceTimersByTime(5000);
      windowManager.markWindowInteraction('lru-test');
      const window2 = windowManager.getWindow('lru-test')!;
      expect(window2.lastInteractionTime).toBe(initialTime + 5000);
    });

    it('should track openedTime when window is first shown', () => {
      const panel = new MockPanel('opened-test', 'Opened Test');
      windowManager.registerWindow('opened-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      const openTime = Date.now();
      vi.setSystemTime(openTime);

      windowManager.showWindow('opened-test');

      const window = windowManager.getWindow('opened-test')!;
      expect(window.openedTime).toBe(openTime);

      // Showing again should not update openedTime
      vi.advanceTimersByTime(1000);
      windowManager.hideWindow('opened-test');
      windowManager.showWindow('opened-test');

      expect(window.openedTime).toBe(openTime); // Should remain the same
    });

    it('should update lastInteractionTime on window click', () => {
      const panel = new MockPanel('click-test', 'Click Test');
      windowManager.registerWindow('click-test', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      });
      windowManager.showWindow('click-test');

      const initialTime = Date.now();
      vi.setSystemTime(initialTime);

      // Simulate click on window
      windowManager.handleClick(200, 200);

      vi.advanceTimersByTime(1000);
      const laterTime = initialTime + 1000;
      vi.setSystemTime(laterTime);

      windowManager.handleClick(200, 200);

      const window = windowManager.getWindow('click-test')!;
      expect(window.lastInteractionTime).toBe(laterTime);
    });

    it('should update lastInteractionTime when window is dragged', () => {
      const panel = new MockPanel('drag-test', 'Drag Test');
      windowManager.registerWindow('drag-test', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      });
      windowManager.showWindow('drag-test');

      const dragTime = Date.now();
      vi.setSystemTime(dragTime);

      // Simulate drag operation
      windowManager.handleDragStart(200, 120); // Click on title bar
      windowManager.handleDrag(250, 150);
      windowManager.handleDragEnd();

      const window = windowManager.getWindow('drag-test')!;
      expect(window.lastInteractionTime).toBe(dragTime);
    });

    it('should update lastInteractionTime when window is brought to front', () => {
      const panel1 = new MockPanel('front-1', 'Front 1');
      const panel2 = new MockPanel('front-2', 'Front 2');

      windowManager.registerWindow('front-1', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      windowManager.registerWindow('front-2', panel2, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      const time1 = Date.now();
      vi.setSystemTime(time1);
      windowManager.showWindow('front-1');

      vi.advanceTimersByTime(1000);
      const time2 = time1 + 1000;
      vi.setSystemTime(time2);
      windowManager.showWindow('front-2');

      vi.advanceTimersByTime(1000);
      const time3 = time2 + 1000;
      vi.setSystemTime(time3);
      windowManager.bringToFront('front-1');

      const window1 = windowManager.getWindow('front-1')!;
      expect(window1.lastInteractionTime).toBe(time3);
    });
  });

  describe('Finding Least Recently Used Window', () => {
    it('should identify the oldest non-pinned window', () => {
      const panels = ['oldest', 'middle', 'newest'].map(
        (id) => new MockPanel(id, id.toUpperCase())
      );

      panels.forEach((panel, i) => {
        vi.setSystemTime(Date.now() + i * 1000);
        windowManager.registerWindow(panel.getId(), panel, {
          defaultX: i * 50,
          defaultY: i * 50,
          defaultWidth: 300,
          defaultHeight: 400,
        });
        windowManager.showWindow(panel.getId());
      });

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('oldest');
    });

    it('should exclude pinned windows from LRU selection', () => {
      const panels = ['pinned-old', 'unpinned-newer'].map(
        (id) => new MockPanel(id, id)
      );

      // Create oldest window and pin it
      vi.setSystemTime(1000);
      windowManager.registerWindow('pinned-old', panels[0], {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('pinned-old');
      windowManager.pinWindow('pinned-old', true);

      // Create newer window
      vi.setSystemTime(2000);
      windowManager.registerWindow('unpinned-newer', panels[1], {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('unpinned-newer');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('unpinned-newer'); // Pinned window is excluded
    });

    it('should exclude modal windows from LRU selection', () => {
      const modalPanel = new MockPanel('modal-old', 'Modal Old');
      const normalPanel = new MockPanel('normal-newer', 'Normal Newer');

      // Create oldest modal window
      vi.setSystemTime(1000);
      windowManager.registerWindow('modal-old', modalPanel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 800,
        defaultHeight: 600,
        isModal: true,
      });
      windowManager.showWindow('modal-old');

      // Create newer normal window
      vi.setSystemTime(2000);
      windowManager.registerWindow('normal-newer', normalPanel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('normal-newer');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('normal-newer'); // Modal window is excluded
    });

    it('should exclude hidden windows from LRU selection', () => {
      const hiddenPanel = new MockPanel('hidden-old', 'Hidden Old');
      const visiblePanel = new MockPanel('visible-newer', 'Visible Newer');

      vi.setSystemTime(1000);
      windowManager.registerWindow('hidden-old', hiddenPanel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('hidden-old');
      windowManager.hideWindow('hidden-old');

      vi.setSystemTime(2000);
      windowManager.registerWindow('visible-newer', visiblePanel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('visible-newer');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('visible-newer'); // Hidden window is excluded
    });

    it('should return null when no eligible windows exist', () => {
      const pinnedPanel = new MockPanel('all-pinned', 'All Pinned');

      windowManager.registerWindow('all-pinned', pinnedPanel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('all-pinned');
      windowManager.pinWindow('all-pinned', true);

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBeNull();
    });
  });

  describe('Auto-Closing Oldest Window', () => {
    it('should close the least recently used window when out of space', () => {
      // Fill canvas with windows
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 800;
      smallCanvas.height = 600;
      windowManager = new WindowManager(smallCanvas);

      // Create 4 windows that fill the canvas
      for (let i = 0; i < 4; i++) {
        const panel = new MockPanel(`window-${i}`, `Window ${i}`, 400, 300);
        vi.setSystemTime(1000 + i * 1000);
        windowManager.registerWindow(`window-${i}`, panel, {
          defaultX: (i % 2) * 400,
          defaultY: Math.floor(i / 2) * 300,
          defaultWidth: 400,
          defaultHeight: 300,
        });
        windowManager.showWindow(`window-${i}`);
      }

      // Try to add a 5th window - should trigger LRU eviction
      const newPanel = new MockPanel('window-5', 'Window 5', 400, 300);
      vi.setSystemTime(6000);
      windowManager.registerWindow('window-5', newPanel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('window-5');

      // Oldest window (window-0) should be closed
      const oldestWindow = windowManager.getWindow('window-0')!;
      expect(oldestWindow.visible).toBe(false);

      // New window should be visible
      const newWindow = windowManager.getWindow('window-5')!;
      expect(newWindow.visible).toBe(true);
    });

    it('should emit notification when auto-closing window', () => {
      const notificationSpy = vi.fn();
      windowManager.on('window:auto-closed', notificationSpy);

      // Create two windows
      const panel1 = new MockPanel('to-close', 'To Close', 1000, 600);
      const panel2 = new MockPanel('new-window', 'New Window', 1000, 600);

      vi.setSystemTime(1000);
      windowManager.registerWindow('to-close', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 1000,
        defaultHeight: 600,
      });
      windowManager.showWindow('to-close');

      // Force canvas to be full
      mockCanvas.width = 1000;
      mockCanvas.height = 600;
      windowManager.handleCanvasResize(1000, 600);

      vi.setSystemTime(2000);
      windowManager.registerWindow('new-window', panel2, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 1000,
        defaultHeight: 600,
      });
      windowManager.showWindow('new-window');

      expect(notificationSpy).toHaveBeenCalledWith({
        windowId: 'to-close',
        windowTitle: 'To Close',
        reason: 'out-of-space',
      });
    });

    it('should not auto-close when all windows are pinned', () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 600;
      smallCanvas.height = 400;
      windowManager = new WindowManager(smallCanvas);

      // Create and pin two windows that fill canvas
      const panel1 = new MockPanel('pinned-1', 'Pinned 1', 600, 400);
      windowManager.registerWindow('pinned-1', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      windowManager.showWindow('pinned-1');
      windowManager.pinWindow('pinned-1', true);

      // Try to add another window - should throw error
      const panel2 = new MockPanel('cannot-open', 'Cannot Open', 600, 400);
      windowManager.registerWindow('cannot-open', panel2, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 600,
        defaultHeight: 400,
      });

      expect(() => {
        windowManager.showWindow('cannot-open');
      }).toThrow('Cannot open window - unpin a window to make space');
    });

    it('should prefer closing unpinned window over pinned window', () => {
      const menuBarHeight = 30;
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 800;
      smallCanvas.height = 400 + menuBarHeight; // Account for menu bar
      windowManager = new WindowManager(smallCanvas);

      // Create two windows
      const panel1 = new MockPanel('older-pinned', 'Older Pinned', 400, 400);
      const panel2 = new MockPanel('newer-unpinned', 'Newer Unpinned', 400, 400);

      vi.setSystemTime(1000);
      windowManager.registerWindow('older-pinned', panel1, {
        defaultX: 0,
        defaultY: menuBarHeight,
        defaultWidth: 400,
        defaultHeight: 400,
      });
      windowManager.showWindow('older-pinned');
      windowManager.pinWindow('older-pinned', true);

      vi.setSystemTime(2000);
      windowManager.registerWindow('newer-unpinned', panel2, {
        defaultX: 400,
        defaultY: menuBarHeight,
        defaultWidth: 400,
        defaultHeight: 400,
      });
      windowManager.showWindow('newer-unpinned');

      // Add third window - should close unpinned one
      const panel3 = new MockPanel('third', 'Third', 400, 400);
      vi.setSystemTime(3000);
      windowManager.registerWindow('third', panel3, {
        defaultX: 0,
        defaultY: menuBarHeight,
        defaultWidth: 400,
        defaultHeight: 400,
      });
      windowManager.showWindow('third');

      // Pinned window should still be visible
      expect(windowManager.getWindow('older-pinned')!.visible).toBe(true);

      // Unpinned window should be closed
      expect(windowManager.getWindow('newer-unpinned')!.visible).toBe(false);

      // New window should be visible
      expect(windowManager.getWindow('third')!.visible).toBe(true);
    });

    it('should emit auto-close event when closing window to make space', () => {
      const menuBarHeight = 30;
      const autoCloseSpy = vi.fn();

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 600;
      smallCanvas.height = 400 + menuBarHeight; // Account for menu bar
      windowManager = new WindowManager(smallCanvas);
      windowManager.on('window:auto-closed', autoCloseSpy);

      const panel1 = new MockPanel('old', 'Old Window', 600, 400);
      vi.setSystemTime(1000);
      windowManager.registerWindow('old', panel1, {
        defaultX: 0,
        defaultY: menuBarHeight,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      windowManager.showWindow('old');

      const panel2 = new MockPanel('new', 'New Window', 600, 400);
      vi.setSystemTime(2000);
      windowManager.registerWindow('new', panel2, {
        defaultX: 0,
        defaultY: menuBarHeight,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      windowManager.showWindow('new');

      expect(autoCloseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          windowId: 'old',
          windowTitle: 'Old Window',
          reason: 'out-of-space',
        })
      );
    });
  });

  describe('Manual Close vs Auto-Close', () => {
    it('should allow manually re-opening an auto-closed window', () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 600;
      smallCanvas.height = 400;
      windowManager = new WindowManager(smallCanvas);

      // Create first window
      const panel1 = new MockPanel('auto-closed', 'Auto Closed', 600, 400);
      windowManager.registerWindow('auto-closed', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      vi.setSystemTime(1000);
      windowManager.showWindow('auto-closed');

      // Create second window, triggering auto-close
      const panel2 = new MockPanel('trigger', 'Trigger', 600, 400);
      windowManager.registerWindow('trigger', panel2, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      vi.setSystemTime(2000);
      windowManager.showWindow('trigger');

      // First window should be auto-closed
      expect(windowManager.getWindow('auto-closed')!.visible).toBe(false);

      // Manually re-open should work (will auto-close the other)
      vi.setSystemTime(3000);
      windowManager.showWindow('auto-closed');

      expect(windowManager.getWindow('auto-closed')!.visible).toBe(true);
    });

    it('should preserve window state when auto-closed', () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 600;
      smallCanvas.height = 400;
      windowManager = new WindowManager(smallCanvas);

      const panel1 = new MockPanel('preserve', 'Preserve', 600, 400);
      windowManager.registerWindow('preserve', panel1, {
        defaultX: 50,
        defaultY: 75,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      vi.setSystemTime(1000);
      windowManager.showWindow('preserve');

      // Manually move window
      const window1 = windowManager.getWindow('preserve')!;
      window1.x = 100;
      window1.y = 150;

      // Trigger auto-close
      const panel2 = new MockPanel('trigger', 'Trigger', 600, 400);
      windowManager.registerWindow('trigger', panel2, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 600,
        defaultHeight: 400,
      });
      vi.setSystemTime(2000);
      windowManager.showWindow('trigger');

      // Window should be closed but preserve position
      expect(window1.visible).toBe(false);
      expect(window1.x).toBe(100);
      expect(window1.y).toBe(150);
    });
  });
});
