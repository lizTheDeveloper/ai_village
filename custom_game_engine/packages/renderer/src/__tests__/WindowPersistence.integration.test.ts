import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('Window Persistence (localStorage)', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;
  const STORAGE_KEY = 'ai-village-window-layout';

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('R4: Position Persistence', () => {
    it('should save window positions to localStorage', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('save-test', 'Save Test');
      windowManager.registerWindow('save-test', panel, {
        defaultX: 100,
        defaultY: 150,
        defaultWidth: 400,
        defaultHeight: 500,
      });
      windowManager.showWindow('save-test');

      // Move window
      const window = windowManager.getWindow('save-test')!;
      window.x = 200;
      window.y = 250;

      // Save layout
      windowManager.saveLayout();

      // Check localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();

      const layout = JSON.parse(saved!);
      expect(layout.windows['save-test']).toEqual({
        x: 200,
        y: 250,
        width: 400,
        height: 500,
        visible: true,
        minimized: false,
        pinned: false,
      });
    });

    it('should save layout with schema version', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('version-test', 'Version Test');
      windowManager.registerWindow('version-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      windowManager.saveLayout();

      const saved = localStorage.getItem(STORAGE_KEY);
      const layout = JSON.parse(saved!);

      expect(layout.version).toBeDefined();
      expect(typeof layout.version).toBe('number');
      expect(layout.version).toBeGreaterThan(0);
    });

    it('should save timestamp when layout is saved', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('timestamp-test', 'Timestamp Test');
      windowManager.registerWindow('timestamp-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      const beforeSave = Date.now();
      windowManager.saveLayout();
      const afterSave = Date.now();

      const saved = localStorage.getItem(STORAGE_KEY);
      const layout = JSON.parse(saved!);

      expect(layout.lastSaved).toBeGreaterThanOrEqual(beforeSave);
      expect(layout.lastSaved).toBeLessThanOrEqual(afterSave);
    });

    it('should restore window positions from localStorage', () => {
      // Set up saved layout
      const savedLayout = {
        version: 1,
        windows: {
          'restore-test': {
            x: 300,
            y: 400,
            width: 500,
            height: 600,
            visible: true,
            minimized: false,
            pinned: true,
          },
        },
        lastSaved: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayout));

      // Create new WindowManager and register window
      windowManager = new WindowManager(mockCanvas);
      const panel = new MockPanel('restore-test', 'Restore Test');
      windowManager.registerWindow('restore-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      // Load layout
      windowManager.loadLayout();

      const window = windowManager.getWindow('restore-test')!;
      expect(window.x).toBe(300);
      expect(window.y).toBe(400);
      expect(window.width).toBe(500);
      expect(window.height).toBe(600);
      expect(window.pinned).toBe(true);
    });

    it('should fallback to default positions if localStorage is empty', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('default-test', 'Default Test');
      const config: WindowConfig = {
        defaultX: 50,
        defaultY: 75,
        defaultWidth: 350,
        defaultHeight: 450,
      };

      windowManager.registerWindow('default-test', panel, config);
      windowManager.loadLayout();

      const window = windowManager.getWindow('default-test')!;
      expect(window.x).toBe(50);
      expect(window.y).toBe(75);
      expect(window.width).toBe(350);
      expect(window.height).toBe(450);
    });

    it('should fallback to default positions if localStorage is corrupted', () => {
      // Set corrupted data
      localStorage.setItem(STORAGE_KEY, 'invalid json {{{');

      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('corrupted-test', 'Corrupted Test');
      const config: WindowConfig = {
        defaultX: 100,
        defaultY: 200,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('corrupted-test', panel, config);

      // Should not throw, should use defaults
      expect(() => windowManager.loadLayout()).not.toThrow();

      const window = windowManager.getWindow('corrupted-test')!;
      expect(window.x).toBe(100);
      expect(window.y).toBe(200);
    });

    it('should handle version mismatch gracefully', () => {
      // Set up saved layout with future version
      const savedLayout = {
        version: 999,
        windows: {
          'version-mismatch': {
            x: 300,
            y: 400,
            width: 500,
            height: 600,
            visible: true,
            minimized: false,
            pinned: false,
            newField: 'future feature', // Unknown field
          },
        },
        lastSaved: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayout));

      windowManager = new WindowManager(mockCanvas);
      const panel = new MockPanel('version-mismatch', 'Version Mismatch');
      windowManager.registerWindow('version-mismatch', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      // Should warn about version mismatch but still load compatible fields
      const consoleSpy = vi.spyOn(console, 'warn');
      windowManager.loadLayout();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('version mismatch')
      );

      consoleSpy.mockRestore();
    });

    it('should save layout on window drag end', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('drag-save', 'Drag Save');
      windowManager.registerWindow('drag-save', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 400,
        isDraggable: true,
      });
      windowManager.showWindow('drag-save');

      // Clear any existing save
      localStorage.removeItem(STORAGE_KEY);

      // Simulate drag
      windowManager.handleDragStart(200, 120); // On title bar
      windowManager.handleDrag(300, 200);
      windowManager.handleDragEnd();

      // Should have saved to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();
    });

    it('should save layout on window close', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('close-save', 'Close Save');
      windowManager.registerWindow('close-save', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('close-save');

      localStorage.removeItem(STORAGE_KEY);

      windowManager.hideWindow('close-save');

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();

      const layout = JSON.parse(saved!);
      expect(layout.windows['close-save'].visible).toBe(false);
    });

    it('should save pinned state to localStorage', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('pin-save', 'Pin Save');
      windowManager.registerWindow('pin-save', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('pin-save');
      windowManager.pinWindow('pin-save', true);

      windowManager.saveLayout();

      const saved = localStorage.getItem(STORAGE_KEY);
      const layout = JSON.parse(saved!);

      expect(layout.windows['pin-save'].pinned).toBe(true);
    });

    it('should restore pinned state from localStorage', () => {
      const savedLayout = {
        version: 1,
        windows: {
          'restore-pinned': {
            x: 0,
            y: 0,
            width: 300,
            height: 400,
            visible: false,
            minimized: false,
            pinned: true,
          },
        },
        lastSaved: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayout));

      windowManager = new WindowManager(mockCanvas);
      const panel = new MockPanel('restore-pinned', 'Restore Pinned');
      windowManager.registerWindow('restore-pinned', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      windowManager.loadLayout();

      const window = windowManager.getWindow('restore-pinned')!;
      expect(window.pinned).toBe(true);
    });
  });

  describe('Reset Layout', () => {
    it('should reset all windows to default positions', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('reset-test', 'Reset Test');
      const config: WindowConfig = {
        defaultX: 50,
        defaultY: 75,
        defaultWidth: 300,
        defaultHeight: 400,
      };

      windowManager.registerWindow('reset-test', panel, config);
      windowManager.showWindow('reset-test');

      // Move window
      const window = windowManager.getWindow('reset-test')!;
      window.x = 500;
      window.y = 600;
      windowManager.saveLayout();

      // Reset
      windowManager.resetLayout();

      expect(window.x).toBe(50);
      expect(window.y).toBe(75);
    });

    it('should clear localStorage when resetting', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('clear-test', 'Clear Test');
      windowManager.registerWindow('clear-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      windowManager.saveLayout();
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      windowManager.resetLayout();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should unpin all windows when resetting', () => {
      windowManager = new WindowManager(mockCanvas);

      const panel = new MockPanel('unpin-test', 'Unpin Test');
      windowManager.registerWindow('unpin-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });
      windowManager.showWindow('unpin-test');
      windowManager.pinWindow('unpin-test', true);

      windowManager.resetLayout();

      const window = windowManager.getWindow('unpin-test')!;
      expect(window.pinned).toBe(false);
    });
  });

  describe('Multiple Windows Persistence', () => {
    it('should save and restore multiple windows correctly', () => {
      windowManager = new WindowManager(mockCanvas);

      const panels = [
        { id: 'panel-1', x: 100, y: 100, width: 300, height: 400 },
        { id: 'panel-2', x: 450, y: 150, width: 350, height: 450 },
        { id: 'panel-3', x: 850, y: 200, width: 400, height: 500 },
      ];

      panels.forEach((p) => {
        const panel = new MockPanel(p.id, p.id.toUpperCase());
        windowManager.registerWindow(p.id, panel, {
          defaultX: 0,
          defaultY: 0,
          defaultWidth: p.width,
          defaultHeight: p.height,
        });
        windowManager.showWindow(p.id);

        const window = windowManager.getWindow(p.id)!;
        window.x = p.x;
        window.y = p.y;
      });

      windowManager.saveLayout();

      // Create new WindowManager
      windowManager = new WindowManager(mockCanvas);

      panels.forEach((p) => {
        const panel = new MockPanel(p.id, p.id.toUpperCase());
        windowManager.registerWindow(p.id, panel, {
          defaultX: 0,
          defaultY: 0,
          defaultWidth: p.width,
          defaultHeight: p.height,
        });
      });

      windowManager.loadLayout();

      panels.forEach((p) => {
        const window = windowManager.getWindow(p.id)!;
        expect(window.x).toBe(p.x);
        expect(window.y).toBe(p.y);
        expect(window.width).toBe(p.width);
        expect(window.height).toBe(p.height);
      });
    });

    it('should handle partial window restoration when some windows no longer exist', () => {
      // Save layout with 3 windows
      const savedLayout = {
        version: 1,
        windows: {
          'exists-1': { x: 100, y: 100, width: 300, height: 400, visible: true, minimized: false, pinned: false },
          'removed': { x: 500, y: 500, width: 300, height: 400, visible: true, minimized: false, pinned: false },
          'exists-2': { x: 200, y: 200, width: 350, height: 450, visible: true, minimized: false, pinned: false },
        },
        lastSaved: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLayout));

      windowManager = new WindowManager(mockCanvas);

      // Only register 2 of the 3 windows
      const panel1 = new MockPanel('exists-1', 'Exists 1');
      const panel2 = new MockPanel('exists-2', 'Exists 2');

      windowManager.registerWindow('exists-1', panel1, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      windowManager.registerWindow('exists-2', panel2, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 350,
        defaultHeight: 450,
      });

      // Should load without error
      expect(() => windowManager.loadLayout()).not.toThrow();

      // Registered windows should restore
      expect(windowManager.getWindow('exists-1')!.x).toBe(100);
      expect(windowManager.getWindow('exists-2')!.x).toBe(200);
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should throw when localStorage quota is exceeded', () => {
      windowManager = new WindowManager(mockCanvas);

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException('QuotaExceededError');
      };

      const panel = new MockPanel('quota-test', 'Quota Test');
      windowManager.registerWindow('quota-test', panel, {
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      expect(() => {
        windowManager.saveLayout();
      }).toThrow('Failed to save window layout');

      Storage.prototype.setItem = originalSetItem;
    });

    it('should not use default values when required fields are missing in saved data', () => {
      const invalidLayout = {
        version: 1,
        windows: {
          'invalid-window': {
            x: 100,
            // Missing y, width, height
          },
        },
        lastSaved: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invalidLayout));

      windowManager = new WindowManager(mockCanvas);
      const panel = new MockPanel('invalid-window', 'Invalid Window');
      windowManager.registerWindow('invalid-window', panel, {
        defaultX: 50,
        defaultY: 50,
        defaultWidth: 300,
        defaultHeight: 400,
      });

      const consoleSpy = vi.spyOn(console, 'error');

      windowManager.loadLayout();

      // Should log error about missing fields
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required field')
      );

      consoleSpy.mockRestore();
    });
  });
});
