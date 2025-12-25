import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WindowManager } from '../WindowManager';
import type { IWindowPanel, WindowConfig, ManagedWindow } from '../WindowManager';

// Mock panel implementation for testing
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
    // Mock render implementation
  }
}

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    mockCtx = mockCanvas.getContext('2d')!;

    windowManager = new WindowManager(mockCanvas);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Window Registration (R1, R2)', () => {
    it('should register a window with valid config', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);

      // Should be able to show the window after registration
      windowManager.showWindow('test-panel');
      expect(panel.isVisible()).toBe(true);
    });

    it('should throw when registering window without required config fields', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const invalidConfig = {
        defaultX: 100,
        // Missing required fields
      } as any;

      expect(() => {
        windowManager.registerWindow('test-panel', panel, invalidConfig);
      }).toThrow('missing required field');
    });

    it('should throw when registering duplicate window ID', () => {
      const panel1 = new MockPanel('duplicate', 'Panel 1');
      const panel2 = new MockPanel('duplicate', 'Panel 2');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('duplicate', panel1, config);

      expect(() => {
        windowManager.registerWindow('duplicate', panel2, config);
      }).toThrow('already registered');
    });

    it('should show and hide windows', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);

      windowManager.showWindow('test-panel');
      expect(panel.isVisible()).toBe(true);

      windowManager.hideWindow('test-panel');
      expect(panel.isVisible()).toBe(false);
    });

    it('should toggle window visibility', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);

      windowManager.toggleWindow('test-panel');
      expect(panel.isVisible()).toBe(true);

      windowManager.toggleWindow('test-panel');
      expect(panel.isVisible()).toBe(false);
    });

    it('should throw when showing unregistered window', () => {
      expect(() => {
        windowManager.showWindow('nonexistent');
      }).toThrow('not registered');
    });
  });

  describe('Window Positioning and Non-Overlap (R1)', () => {
    it('should position window at default location when space is available', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);
      windowManager.showWindow('test-panel');

      const windowState = windowManager.getWindowState('test-panel');
      expect(windowState.x).toBe(100);
      expect(windowState.y).toBe(100);
    });

    it('should not overlap existing windows', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config1: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      const config2: WindowConfig = {
        defaultX: 100, // Same position as panel1
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      const state1 = windowManager.getWindowState('panel1');
      const state2 = windowManager.getWindowState('panel2');

      // Check that windows don't overlap
      const overlap = !(
        state1.x + state1.width <= state2.x ||
        state2.x + state2.width <= state1.x ||
        state1.y + state1.height <= state2.y ||
        state2.y + state2.height <= state1.y
      );

      expect(overlap).toBe(false);
    });

    it('should find nearest available space using spiral search', () => {
      // Fill up space around default position
      const panels: MockPanel[] = [];
      for (let i = 0; i < 5; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`);
        panels.push(panel);

        const config: WindowConfig = {
          defaultX: 100,
          defaultY: 100,
          defaultWidth: 300,
          defaultHeight: 400,
        };

        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);
      }

      // All panels should be positioned without overlap
      const states = panels.map((_, i) =>
        windowManager.getWindowState(`panel${i}`)
      );

      // Check no overlaps
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const overlap = !(
            states[i].x + states[i].width <= states[j].x ||
            states[j].x + states[j].width <= states[i].x ||
            states[i].y + states[i].height <= states[j].y ||
            states[j].y + states[j].height <= states[i].y
          );
          expect(overlap).toBe(false);
        }
      }
    });
  });

  describe('LRU Auto-Close (R1)', () => {
    it('should track window interaction time', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);
      windowManager.showWindow('test-panel');

      const timeBefore = Date.now();
      windowManager.markWindowInteraction('test-panel');
      const timeAfter = Date.now();

      const state = windowManager.getWindowState('test-panel');
      expect(state.lastInteractionTime).toBeGreaterThanOrEqual(timeBefore);
      expect(state.lastInteractionTime).toBeLessThanOrEqual(timeAfter);
    });

    it('should find least recently used window', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');
      const panel3 = new MockPanel('panel3', 'Panel 3');

      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);
      windowManager.registerWindow('panel3', panel3, config);

      windowManager.showWindow('panel1');
      vi.advanceTimersByTime(100);
      windowManager.showWindow('panel2');
      vi.advanceTimersByTime(100);
      windowManager.showWindow('panel3');

      // Mark panel2 and panel3 as interacted
      windowManager.markWindowInteraction('panel3');
      vi.advanceTimersByTime(100);
      windowManager.markWindowInteraction('panel2');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('panel1');
    });

    it('should not return pinned windows as LRU', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      windowManager.pinWindow('panel1', true);
      windowManager.markWindowInteraction('panel2');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('panel2'); // panel1 is pinned
    });

    it('should not return modal windows as LRU', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config1: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
        isModal: true,
      };

      const config2: WindowConfig = {
        defaultX: 400,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      const lruWindow = windowManager.findLeastRecentlyUsedWindow();
      expect(lruWindow).toBe('panel2'); // panel1 is modal
    });

    it('should close oldest window when out of space', () => {
      // Create many windows to fill the screen
      const panels: MockPanel[] = [];
      const windowCount = 20; // Enough to fill a 1920x1080 canvas

      for (let i = 0; i < windowCount; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`, 400, 400);
        panels.push(panel);

        const config: WindowConfig = {
          defaultX: 100,
          defaultY: 100,
          defaultWidth: 400,
          defaultHeight: 400,
        };

        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);

        // Space out interaction times
        if (i > 0) {
          vi.advanceTimersByTime(10);
        }
      }

      // First window should be closed (LRU)
      expect(panels[0].isVisible()).toBe(false);
    });

    it('should throw when all windows are pinned and no space available', () => {
      // Create windows and pin them all
      const panels: MockPanel[] = [];
      const windowCount = 20;

      for (let i = 0; i < windowCount; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`, 400, 400);
        panels.push(panel);

        const config: WindowConfig = {
          defaultX: 100,
          defaultY: 100,
          defaultWidth: 400,
          defaultHeight: 400,
        };

        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);
        windowManager.pinWindow(`panel${i}`, true);
      }

      // Try to open one more window
      const extraPanel = new MockPanel('extra', 'Extra', 400, 400);
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 400,
      };

      windowManager.registerWindow('extra', extraPanel, config);

      expect(() => {
        windowManager.showWindow('extra');
      }).toThrow('Cannot open window');
    });

    it('should pin and unpin windows', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      windowManager.pinWindow('panel1', true);
      let state = windowManager.getWindowState('panel1');
      expect(state.pinned).toBe(true);

      windowManager.pinWindow('panel1', false);
      state = windowManager.getWindowState('panel1');
      expect(state.pinned).toBe(false);
    });
  });

  describe('Window Dragging (R3)', () => {
    it('should update window position on drag', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      windowManager.handleDrag('panel1', 100, 100, 200, 150);

      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBe(200);
      expect(state.y).toBe(150);
    });

    it('should not allow dragging non-draggable windows', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: false,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      expect(() => {
        windowManager.handleDrag('panel1', 100, 100, 200, 150);
      }).toThrow('not draggable');
    });

    it('should constrain window within canvas bounds', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      // Try to drag beyond canvas bounds
      windowManager.handleDrag('panel1', 100, 100, 3000, 3000);

      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBeLessThanOrEqual(mockCanvas.width - state.width);
      expect(state.y).toBeLessThanOrEqual(mockCanvas.height - state.height);
    });

    it('should update lastInteractionTime on drag', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      const timeBefore = Date.now();
      windowManager.handleDrag('panel1', 100, 100, 200, 150);
      const timeAfter = Date.now();

      const state = windowManager.getWindowState('panel1');
      expect(state.lastInteractionTime).toBeGreaterThanOrEqual(timeBefore);
      expect(state.lastInteractionTime).toBeLessThanOrEqual(timeAfter);
    });
  });

  describe('Z-Index and Bring to Front (R2)', () => {
    it('should bring window to front when shown', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      const state1 = windowManager.getWindowState('panel1');
      const state2 = windowManager.getWindowState('panel2');

      expect(state2.zIndex).toBeGreaterThan(state1.zIndex);
    });

    it('should bring window to front on interaction', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      windowManager.bringToFront('panel1');

      const state1 = windowManager.getWindowState('panel1');
      const state2 = windowManager.getWindowState('panel2');

      expect(state1.zIndex).toBeGreaterThan(state2.zIndex);
    });
  });

  describe('Position Persistence (R4)', () => {
    it('should save window layout to localStorage', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      // Move window
      windowManager.handleDrag('panel1', 100, 100, 200, 150);

      // Save layout
      windowManager.saveLayout();

      const saved = localStorage.getItem('ai-village-window-layout');
      expect(saved).toBeTruthy();

      const layout = JSON.parse(saved!);
      expect(layout.windows['panel1']).toBeDefined();
      expect(layout.windows['panel1'].x).toBe(200);
      expect(layout.windows['panel1'].y).toBe(150);
    });

    it('should load window layout from localStorage', () => {
      // Save a layout
      const savedLayout = {
        version: 1,
        windows: {
          'panel1': {
            x: 250,
            y: 300,
            width: 400,
            height: 500,
            visible: true,
            minimized: false,
            pinned: true,
          },
        },
        lastSaved: Date.now(),
      };

      localStorage.setItem('ai-village-window-layout', JSON.stringify(savedLayout));

      // Create new window manager
      const newWindowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      newWindowManager.registerWindow('panel1', panel, config);
      newWindowManager.loadLayout();

      const state = newWindowManager.getWindowState('panel1');
      expect(state.x).toBe(250);
      expect(state.y).toBe(300);
      expect(state.pinned).toBe(true);
    });

    it('should use default positions if localStorage is empty', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.loadLayout(); // No saved layout
      windowManager.showWindow('panel1');

      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBe(100);
      expect(state.y).toBe(100);
    });

    it('should reset to default layout', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      // Move window
      windowManager.handleDrag('panel1', 100, 100, 500, 500);
      windowManager.saveLayout();

      // Reset layout
      windowManager.resetLayout();

      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBe(100);
      expect(state.y).toBe(100);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('ai-village-window-layout', 'invalid json{');

      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);

      // Should not throw, should use defaults
      expect(() => {
        windowManager.loadLayout();
      }).not.toThrow();

      windowManager.showWindow('panel1');
      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBe(100);
      expect(state.y).toBe(100);
    });
  });

  describe('Canvas Resize Edge Cases', () => {
    it('should reposition windows that are off-screen after canvas resize', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 1500,
        defaultY: 900,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      // Resize canvas to smaller size
      mockCanvas.width = 1024;
      mockCanvas.height = 768;

      windowManager.handleCanvasResize(1024, 768);

      const state = windowManager.getWindowState('panel1');

      // Window should be within new bounds
      expect(state.x + state.width).toBeLessThanOrEqual(1024);
      expect(state.y + state.height).toBeLessThanOrEqual(768);
    });

    it('should clamp window size if larger than canvas', () => {
      const panel = new MockPanel('panel1', 'Panel 1', 2000, 1500);
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 2000,
        defaultHeight: 1500,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      const state = windowManager.getWindowState('panel1');

      expect(state.width).toBeLessThanOrEqual(mockCanvas.width);
      expect(state.height).toBeLessThanOrEqual(mockCanvas.height);
    });
  });

  describe('Window Arrangement (R5)', () => {
    it('should arrange windows in cascade layout', () => {
      const panels: MockPanel[] = [];
      for (let i = 0; i < 3; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`);
        panels.push(panel);

        const config: WindowConfig = {
          defaultX: 100,
          defaultY: 100,
          defaultWidth: 300,
          defaultHeight: 400,
        };

        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);
      }

      windowManager.arrangeWindows('cascade');

      const states = panels.map((_, i) => windowManager.getWindowState(`panel${i}`));

      // Each window should be offset from the previous
      for (let i = 1; i < states.length; i++) {
        expect(states[i].x).toBeGreaterThan(states[i - 1].x);
        expect(states[i].y).toBeGreaterThan(states[i - 1].y);
      }
    });

    it('should arrange windows in tile layout', () => {
      const panels: MockPanel[] = [];
      for (let i = 0; i < 4; i++) {
        const panel = new MockPanel(`panel${i}`, `Panel ${i}`);
        panels.push(panel);

        const config: WindowConfig = {
          defaultX: 0,
          defaultY: 0,
          defaultWidth: 300,
          defaultHeight: 400,
        };

        windowManager.registerWindow(`panel${i}`, panel, config);
        windowManager.showWindow(`panel${i}`);
      }

      windowManager.arrangeWindows('tile');

      const states = panels.map((_, i) => windowManager.getWindowState(`panel${i}`));

      // Windows should be tiled without overlap
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const overlap = !(
            states[i].x + states[i].width <= states[j].x ||
            states[j].x + states[j].width <= states[i].x ||
            states[i].y + states[i].height <= states[j].y ||
            states[j].y + states[j].height <= states[i].y
          );
          expect(overlap).toBe(false);
        }
      }
    });

    it('should restore saved layout', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      windowManager.handleDrag('panel1', 100, 100, 500, 500);
      windowManager.saveLayout();

      // Move window again
      windowManager.handleDrag('panel1', 500, 500, 200, 200);

      // Restore to saved layout
      windowManager.arrangeWindows('restore');

      const state = windowManager.getWindowState('panel1');
      expect(state.x).toBe(500);
      expect(state.y).toBe(500);
    });
  });

  describe('Rendering', () => {
    it('should render windows in z-index order', () => {
      const renderOrder: string[] = [];

      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');
      const panel3 = new MockPanel('panel3', 'Panel 3');

      // Override render to track order
      panel1.render = () => renderOrder.push('panel1');
      panel2.render = () => renderOrder.push('panel2');
      panel3.render = () => renderOrder.push('panel3');

      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);
      windowManager.registerWindow('panel3', panel3, config);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');
      windowManager.showWindow('panel3');

      windowManager.bringToFront('panel1');

      windowManager.render(mockCtx, mockCanvas.width, mockCanvas.height);

      // panel1 should render last (highest z-index)
      expect(renderOrder[renderOrder.length - 1]).toBe('panel1');
    });

    it('should not render hidden windows', () => {
      const renderCalls: string[] = [];

      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      panel1.render = () => renderCalls.push('panel1');
      panel2.render = () => renderCalls.push('panel2');

      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config);
      windowManager.registerWindow('panel2', panel2, config);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');
      windowManager.hideWindow('panel2');

      windowManager.render(mockCtx, mockCanvas.width, mockCanvas.height);

      expect(renderCalls).toContain('panel1');
      expect(renderCalls).not.toContain('panel2');
    });
  });

  describe('Click Handling', () => {
    it('should handle click on window title bar', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      // Click on title bar (assuming 30px height)
      const handled = windowManager.handleClick(150, 110);

      expect(handled).toBe(true);
    });

    it('should return false if click is outside all windows', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel, config);
      windowManager.showWindow('panel1');

      const handled = windowManager.handleClick(50, 50);

      expect(handled).toBe(false);
    });

    it('should bring clicked window to front', () => {
      const panel1 = new MockPanel('panel1', 'Panel 1');
      const panel2 = new MockPanel('panel2', 'Panel 2');

      const config1: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      const config2: WindowConfig = {
        defaultX: 200,
        defaultY: 200,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('panel1', panel1, config1);
      windowManager.registerWindow('panel2', panel2, config2);

      windowManager.showWindow('panel1');
      windowManager.showWindow('panel2');

      // Click on panel1
      windowManager.handleClick(150, 150);

      const state1 = windowManager.getWindowState('panel1');
      const state2 = windowManager.getWindowState('panel2');

      expect(state1.zIndex).toBeGreaterThan(state2.zIndex);
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should throw when getting state of unregistered window', () => {
      expect(() => {
        windowManager.getWindowState('nonexistent');
      }).toThrow('not registered');
    });

    it('should throw when marking interaction on unregistered window', () => {
      expect(() => {
        windowManager.markWindowInteraction('nonexistent');
      }).toThrow('not registered');
    });

    it('should throw when pinning unregistered window', () => {
      expect(() => {
        windowManager.pinWindow('nonexistent', true);
      }).toThrow('not registered');
    });

    it('should throw when bringing unregistered window to front', () => {
      expect(() => {
        windowManager.bringToFront('nonexistent');
      }).toThrow('not registered');
    });

    it('should throw when config missing defaultX', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const invalidConfig = {
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      } as any;

      expect(() => {
        windowManager.registerWindow('panel1', panel, invalidConfig);
      }).toThrow('missing required field');
    });

    it('should throw when config missing defaultY', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const invalidConfig = {
        defaultX: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      } as any;

      expect(() => {
        windowManager.registerWindow('panel1', panel, invalidConfig);
      }).toThrow('missing required field');
    });

    it('should throw when config missing defaultWidth', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const invalidConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultHeight: 400,
      } as any;

      expect(() => {
        windowManager.registerWindow('panel1', panel, invalidConfig);
      }).toThrow('missing required field');
    });

    it('should throw when config missing defaultHeight', () => {
      const panel = new MockPanel('panel1', 'Panel 1');
      const invalidConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
      } as any;

      expect(() => {
        windowManager.registerWindow('panel1', panel, invalidConfig);
      }).toThrow('missing required field');
    });
  });
});
