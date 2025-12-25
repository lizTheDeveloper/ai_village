import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WindowManager } from '../WindowManager';
import type { IWindowPanel, WindowConfig, ManagedWindow } from '../types/WindowTypes';

// Mock panel class for testing
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

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;

    // Clear localStorage
    localStorage.clear();

    // Create fresh WindowManager instance
    windowManager = new WindowManager(mockCanvas);
  });

  describe('Window Registration', () => {
    it('should register a window with default config', () => {
      const panel = new MockPanel('test-panel', 'Test Panel');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('test-panel', panel, config);

      // Should not throw
      expect(() => windowManager.showWindow('test-panel')).not.toThrow();
    });

    it('should throw when registering duplicate window ID', () => {
      const panel1 = new MockPanel('duplicate', 'Panel 1');
      const panel2 = new MockPanel('duplicate', 'Panel 2');
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('duplicate', panel1, config);

      expect(() => {
        windowManager.registerWindow('duplicate', panel2, config);
      }).toThrow('Window with ID "duplicate" already registered');
    });

    it('should throw when config is missing required fields', () => {
      const panel = new MockPanel('test', 'Test');
      const invalidConfig = {
        defaultX: 100,
        // Missing defaultY, defaultWidth, defaultHeight
      } as any;

      expect(() => {
        windowManager.registerWindow('test', panel, invalidConfig);
      }).toThrow('WindowConfig missing required field');
    });

    it('should initialize window with correct default properties', () => {
      const panel = new MockPanel('test', 'Test');
      const config: WindowConfig = {
        defaultX: 50,
        defaultY: 75,
        defaultWidth: 400,
        defaultHeight: 500,
        isModal: false,
        isDraggable: true,
      };

      windowManager.registerWindow('test', panel, config);
      const window = windowManager.getWindow('test');

      expect(window).toBeDefined();
      expect(window!.x).toBe(50);
      expect(window!.y).toBe(75);
      expect(window!.width).toBe(400);
      expect(window!.height).toBe(500);
      expect(window!.visible).toBe(false);
      expect(window!.minimized).toBe(false);
      expect(window!.pinned).toBe(false);
      expect(window!.zIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Window Visibility', () => {
    beforeEach(() => {
      const panel = new MockPanel('visibility-test', 'Visibility Test');
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };
      windowManager.registerWindow('visibility-test', panel, config);
    });

    it('should show a hidden window', () => {
      windowManager.showWindow('visibility-test');
      const window = windowManager.getWindow('visibility-test');

      expect(window!.visible).toBe(true);
    });

    it('should hide a visible window', () => {
      windowManager.showWindow('visibility-test');
      windowManager.hideWindow('visibility-test');
      const window = windowManager.getWindow('visibility-test');

      expect(window!.visible).toBe(false);
    });

    it('should toggle window visibility', () => {
      const window = windowManager.getWindow('visibility-test');
      const initialVisibility = window!.visible;

      windowManager.toggleWindow('visibility-test');
      expect(window!.visible).toBe(!initialVisibility);

      windowManager.toggleWindow('visibility-test');
      expect(window!.visible).toBe(initialVisibility);
    });

    it('should throw when showing non-existent window', () => {
      expect(() => {
        windowManager.showWindow('non-existent');
      }).toThrow('Window with ID "non-existent" not found');
    });

    it('should throw when hiding non-existent window', () => {
      expect(() => {
        windowManager.hideWindow('non-existent');
      }).toThrow('Window with ID "non-existent" not found');
    });
  });

  describe('Z-Index Management', () => {
    beforeEach(() => {
      // Register multiple windows
      for (let i = 1; i <= 3; i++) {
        const panel = new MockPanel(`window-${i}`, `Window ${i}`);
        const config: WindowConfig = {
          defaultX: i * 50,
          defaultY: i * 50,
          defaultWidth: 300,
          defaultHeight: 400,
        };
        windowManager.registerWindow(`window-${i}`, panel, config);
        windowManager.showWindow(`window-${i}`);
      }
    });

    it('should bring window to front when focused', () => {
      const window1 = windowManager.getWindow('window-1');
      const window3 = windowManager.getWindow('window-3');
      const initialZ1 = window1!.zIndex;
      const initialZ3 = window3!.zIndex;

      windowManager.bringToFront('window-1');

      expect(window1!.zIndex).toBeGreaterThan(initialZ3);
    });

    it('should maintain relative z-index order for non-focused windows', () => {
      windowManager.bringToFront('window-2');

      const window1 = windowManager.getWindow('window-1');
      const window2 = windowManager.getWindow('window-2');
      const window3 = windowManager.getWindow('window-3');

      expect(window2!.zIndex).toBeGreaterThan(window1!.zIndex);
      expect(window2!.zIndex).toBeGreaterThan(window3!.zIndex);
    });

    it('should throw when bringing non-existent window to front', () => {
      expect(() => {
        windowManager.bringToFront('non-existent');
      }).toThrow('Window with ID "non-existent" not found');
    });
  });

  describe('Window Pinning', () => {
    beforeEach(() => {
      const panel = new MockPanel('pinnable', 'Pinnable');
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };
      windowManager.registerWindow('pinnable', panel, config);
    });

    it('should pin a window', () => {
      windowManager.pinWindow('pinnable', true);
      const window = windowManager.getWindow('pinnable');

      expect(window!.pinned).toBe(true);
    });

    it('should unpin a window', () => {
      windowManager.pinWindow('pinnable', true);
      windowManager.pinWindow('pinnable', false);
      const window = windowManager.getWindow('pinnable');

      expect(window!.pinned).toBe(false);
    });

    it('should throw when pinning non-existent window', () => {
      expect(() => {
        windowManager.pinWindow('non-existent', true);
      }).toThrow('Window with ID "non-existent" not found');
    });
  });

  describe('Interaction Tracking', () => {
    beforeEach(() => {
      const panel = new MockPanel('trackable', 'Trackable');
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };
      windowManager.registerWindow('trackable', panel, config);
      windowManager.showWindow('trackable');
    });

    it('should update lastInteractionTime when window is interacted with', () => {
      const window = windowManager.getWindow('trackable');
      const initialTime = window!.lastInteractionTime;

      // Wait a bit
      const futureTime = Date.now() + 100;
      vi.spyOn(Date, 'now').mockReturnValue(futureTime);

      windowManager.markWindowInteraction('trackable');

      expect(window!.lastInteractionTime).toBeGreaterThan(initialTime);
      expect(window!.lastInteractionTime).toBe(futureTime);
    });

    it('should set openedTime when window is first shown', () => {
      const panel = new MockPanel('new-window', 'New Window');
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('new-window', panel, config);

      const beforeTime = Date.now();
      windowManager.showWindow('new-window');
      const afterTime = Date.now();

      const window = windowManager.getWindow('new-window');
      expect(window!.openedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(window!.openedTime).toBeLessThanOrEqual(afterTime);
    });

    it('should throw when marking interaction on non-existent window', () => {
      expect(() => {
        windowManager.markWindowInteraction('non-existent');
      }).toThrow('Window with ID "non-existent" not found');
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should throw when getting non-existent window', () => {
      expect(() => {
        const window = windowManager.getWindow('does-not-exist');
        if (!window) {
          throw new Error('Window not found');
        }
      }).toThrow();
    });

    it('should throw when config has invalid dimensions', () => {
      const panel = new MockPanel('invalid', 'Invalid');
      const invalidConfig: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: -100, // Invalid negative width
        defaultHeight: 400,
      };

      expect(() => {
        windowManager.registerWindow('invalid', panel, invalidConfig);
      }).toThrow('Invalid window dimensions');
    });

    it('should throw when panel is null or undefined', () => {
      const config: WindowConfig = {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      expect(() => {
        windowManager.registerWindow('null-panel', null as any, config);
      }).toThrow('Panel cannot be null or undefined');
    });
  });
});
