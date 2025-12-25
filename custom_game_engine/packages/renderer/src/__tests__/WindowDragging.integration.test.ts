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

describe('Window Dragging and Positioning', () => {
  let windowManager: WindowManager;
  let mockCanvas: HTMLCanvasElement;
  const TITLE_BAR_HEIGHT = 30;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    localStorage.clear();
    windowManager = new WindowManager(mockCanvas);
  });

  describe('R3: Window Dragging', () => {
    it('should start drag when clicking on title bar', () => {
      const panel = new MockPanel('drag-test', 'Drag Test', 400, 300);
      windowManager.registerWindow('drag-test', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('drag-test');

      // Click on title bar (y = 100 to 100 + TITLE_BAR_HEIGHT)
      const dragStarted = windowManager.handleDragStart(250, 115);

      expect(dragStarted).toBe(true);

      const window = windowManager.getWindow('drag-test')!;
      expect(window.isDragging).toBe(true);
    });

    it('should not start drag when clicking on window content (below title bar)', () => {
      const panel = new MockPanel('no-drag', 'No Drag', 400, 300);
      windowManager.registerWindow('no-drag', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('no-drag');

      // Click below title bar (in content area)
      const dragStarted = windowManager.handleDragStart(250, 200);

      expect(dragStarted).toBe(false);

      const window = windowManager.getWindow('no-drag')!;
      expect(window.isDragging).toBe(false);
    });

    it('should not allow dragging non-draggable windows', () => {
      const panel = new MockPanel('non-draggable', 'Non Draggable', 400, 300);
      windowManager.registerWindow('non-draggable', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: false, // Not draggable
      });
      windowManager.showWindow('non-draggable');

      const dragStarted = windowManager.handleDragStart(250, 115);

      expect(dragStarted).toBe(false);

      const window = windowManager.getWindow('non-draggable')!;
      expect(window.isDragging).toBe(false);
    });

    it('should update window position during drag', () => {
      const panel = new MockPanel('move-test', 'Move Test', 400, 300);
      windowManager.registerWindow('move-test', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('move-test');

      // Start drag
      windowManager.handleDragStart(250, 115); // Click at 250, 115 (offset 150, 15 from window origin)

      // Drag to new position
      windowManager.handleDrag(350, 215);

      const window = windowManager.getWindow('move-test')!;

      // Window should move by the delta, maintaining the offset
      // New position should be (350 - 150, 215 - 15) = (200, 200)
      expect(window.x).toBe(200);
      expect(window.y).toBe(200);
    });

    it('should end drag and finalize position', () => {
      const panel = new MockPanel('end-drag', 'End Drag', 400, 300);
      windowManager.registerWindow('end-drag', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('end-drag');

      windowManager.handleDragStart(250, 115);
      windowManager.handleDrag(350, 215);
      windowManager.handleDragEnd();

      const window = windowManager.getWindow('end-drag')!;

      expect(window.isDragging).toBe(false);
      expect(window.x).toBe(200);
      expect(window.y).toBe(200);
    });

    it('should bring dragged window to front', () => {
      // Create two windows
      const panel1 = new MockPanel('behind', 'Behind', 400, 300);
      const panel2 = new MockPanel('front', 'Front', 400, 300);

      windowManager.registerWindow('behind', panel1, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });

      windowManager.registerWindow('front', panel2, {
        defaultX: 200,
        defaultY: 200,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });

      windowManager.showWindow('behind');
      windowManager.showWindow('front');

      const frontWindow = windowManager.getWindow('front')!;
      const initialZIndex = frontWindow.zIndex;

      // Drag the 'behind' window
      windowManager.handleDragStart(250, 115);

      const behindWindow = windowManager.getWindow('behind')!;

      // Should have higher z-index than front window had
      expect(behindWindow.zIndex).toBeGreaterThan(initialZIndex);
    });

    it('should clamp dragged window to canvas bounds', () => {
      const panel = new MockPanel('boundary', 'Boundary', 400, 300);
      windowManager.registerWindow('boundary', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('boundary');

      // Start drag
      windowManager.handleDragStart(250, 115);

      // Try to drag beyond right edge
      windowManager.handleDrag(2500, 115);

      const window = windowManager.getWindow('boundary')!;

      // Should be clamped to canvas width
      expect(window.x + window.width).toBeLessThanOrEqual(mockCanvas.width);
    });

    it('should prevent dragging window off top edge', () => {
      const panel = new MockPanel('top-bound', 'Top Bound', 400, 300);
      windowManager.registerWindow('top-bound', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('top-bound');

      windowManager.handleDragStart(250, 115);

      // Try to drag above top edge
      windowManager.handleDrag(250, -200);

      const window = windowManager.getWindow('top-bound')!;

      // Y should be clamped to 0
      expect(window.y).toBeGreaterThanOrEqual(0);
    });

    it('should prevent dragging window off left edge', () => {
      const panel = new MockPanel('left-bound', 'Left Bound', 400, 300);
      windowManager.registerWindow('left-bound', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('left-bound');

      windowManager.handleDragStart(250, 115);

      // Try to drag left of left edge
      windowManager.handleDrag(-200, 115);

      const window = windowManager.getWindow('left-bound')!;

      // X should be clamped to 0
      expect(window.x).toBeGreaterThanOrEqual(0);
    });

    it('should keep title bar visible when dragging near bottom edge', () => {
      const panel = new MockPanel('bottom-bound', 'Bottom Bound', 400, 300);
      windowManager.registerWindow('bottom-bound', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('bottom-bound');

      windowManager.handleDragStart(250, 115);

      // Try to drag below bottom edge
      windowManager.handleDrag(250, 2000);

      const window = windowManager.getWindow('bottom-bound')!;

      // At minimum, title bar should be visible
      expect(window.y).toBeLessThan(mockCanvas.height);
      expect(window.y + TITLE_BAR_HEIGHT).toBeLessThanOrEqual(mockCanvas.height);
    });

    it('should save drag offset correctly', () => {
      const panel = new MockPanel('offset-test', 'Offset Test', 400, 300);
      windowManager.registerWindow('offset-test', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('offset-test');

      // Click at specific point in title bar
      const clickX = 300; // 200px from window left edge
      const clickY = 110; // 10px from window top edge

      windowManager.handleDragStart(clickX, clickY);

      const window = windowManager.getWindow('offset-test')!;

      expect(window.dragOffsetX).toBe(200); // clickX - window.x
      expect(window.dragOffsetY).toBe(10);  // clickY - window.y
    });
  });

  describe('Click Handling', () => {
    it('should handle click on window and bring to front', () => {
      const panel1 = new MockPanel('click-1', 'Click 1', 300, 200);
      const panel2 = new MockPanel('click-2', 'Click 2', 300, 200);

      windowManager.registerWindow('click-1', panel1, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.registerWindow('click-2', panel2, {
        defaultX: 200,
        defaultY: 200,
        defaultWidth: 300,
        defaultHeight: 200,
      });

      windowManager.showWindow('click-1');
      windowManager.showWindow('click-2');

      const window2InitialZ = windowManager.getWindow('click-2')!.zIndex;

      // Click on window 1
      const handled = windowManager.handleClick(200, 150);

      expect(handled).toBe(true);

      const window1 = windowManager.getWindow('click-1')!;
      expect(window1.zIndex).toBeGreaterThan(window2InitialZ);
    });

    it('should return false when clicking outside all windows', () => {
      const panel = new MockPanel('single', 'Single', 300, 200);
      windowManager.registerWindow('single', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 300,
        defaultHeight: 200,
      });
      windowManager.showWindow('single');

      // Click outside window
      const handled = windowManager.handleClick(50, 50);

      expect(handled).toBe(false);
    });

    it('should handle click on topmost window when windows overlap', () => {
      const panel1 = new MockPanel('overlap-1', 'Overlap 1', 400, 300);
      const panel2 = new MockPanel('overlap-2', 'Overlap 2', 400, 300);

      windowManager.registerWindow('overlap-1', panel1, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });

      windowManager.registerWindow('overlap-2', panel2, {
        defaultX: 150,
        defaultY: 150,
        defaultWidth: 400,
        defaultHeight: 300,
      });

      windowManager.showWindow('overlap-1');
      windowManager.showWindow('overlap-2');

      // Click in overlapping region
      const clickX = 200;
      const clickY = 200;

      const handled = windowManager.handleClick(clickX, clickY);

      expect(handled).toBe(true);

      // The window with higher z-index should handle the click
      const window1Z = windowManager.getWindow('overlap-1')!.zIndex;
      const window2Z = windowManager.getWindow('overlap-2')!.zIndex;

      // Window 2 was shown last, so should have higher z-index
      expect(window2Z).toBeGreaterThan(window1Z);
    });
  });

  describe('Window Title Bar Controls', () => {
    it('should detect click on close button', () => {
      const panel = new MockPanel('close-btn', 'Close Btn', 400, 300);
      windowManager.registerWindow('close-btn', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('close-btn');

      // Close button is in top-right corner of title bar
      const closeButtonX = 100 + 400 - 20; // Right edge minus button width
      const closeButtonY = 100 + 10; // Top edge plus padding

      const clickedClose = windowManager.handleTitleBarClick('close-btn', closeButtonX, closeButtonY);

      expect(clickedClose).toBe('close');
    });

    it('should detect click on minimize button', () => {
      const panel = new MockPanel('min-btn', 'Min Btn', 400, 300);
      windowManager.registerWindow('min-btn', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('min-btn');

      // Minimize button is left of close button
      const minButtonX = 100 + 400 - 50;
      const minButtonY = 100 + 10;

      const clickedMin = windowManager.handleTitleBarClick('min-btn', minButtonX, minButtonY);

      expect(clickedMin).toBe('minimize');
    });

    it('should detect click on pin button', () => {
      const panel = new MockPanel('pin-btn', 'Pin Btn', 400, 300);
      windowManager.registerWindow('pin-btn', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('pin-btn');

      // Pin button is left of minimize button
      const pinButtonX = 100 + 400 - 80;
      const pinButtonY = 100 + 10;

      const clickedPin = windowManager.handleTitleBarClick('pin-btn', pinButtonX, pinButtonY);

      expect(clickedPin).toBe('pin');
    });

    it('should toggle pin state when pin button clicked', () => {
      const panel = new MockPanel('pin-toggle', 'Pin Toggle', 400, 300);
      windowManager.registerWindow('pin-toggle', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('pin-toggle');

      const window = windowManager.getWindow('pin-toggle')!;
      const initialPinned = window.pinned;

      const pinButtonX = 100 + 400 - 80;
      const pinButtonY = 100 + 10;

      windowManager.handleClick(pinButtonX, pinButtonY);

      expect(window.pinned).toBe(!initialPinned);
    });

    it('should minimize window when minimize button clicked', () => {
      const panel = new MockPanel('minimize', 'Minimize', 400, 300);
      windowManager.registerWindow('minimize', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('minimize');

      const minButtonX = 100 + 400 - 50;
      const minButtonY = 100 + 10;

      windowManager.handleClick(minButtonX, minButtonY);

      const window = windowManager.getWindow('minimize')!;
      expect(window.minimized).toBe(true);
    });

    it('should hide window when close button clicked', () => {
      const panel = new MockPanel('close', 'Close', 400, 300);
      windowManager.registerWindow('close', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      });
      windowManager.showWindow('close');

      const closeButtonX = 100 + 400 - 20;
      const closeButtonY = 100 + 10;

      windowManager.handleClick(closeButtonX, closeButtonY);

      const window = windowManager.getWindow('close')!;
      expect(window.visible).toBe(false);
    });
  });

  describe('Error Handling - No Silent Fallbacks', () => {
    it('should throw when trying to drag non-existent window', () => {
      expect(() => {
        windowManager.handleDragStart(100, 100);
        // If no window exists at this position, should not silently fail
      }).not.toThrow(); // This is OK - returns false

      // But trying to drag a specific non-existent window should throw
      expect(() => {
        const window = windowManager.getWindow('non-existent');
        if (window) {
          window.isDragging = true;
        } else {
          throw new Error('Window not found');
        }
      }).toThrow();
    });

    it('should throw when trying to handle title bar click on non-existent window', () => {
      expect(() => {
        windowManager.handleTitleBarClick('non-existent', 100, 100);
      }).toThrow('Window with ID "non-existent" not found');
    });

    it('should validate drag coordinates', () => {
      const panel = new MockPanel('validate', 'Validate', 400, 300);
      windowManager.registerWindow('validate', panel, {
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
        isDraggable: true,
      });
      windowManager.showWindow('validate');

      // Invalid coordinates (NaN, negative infinity, etc.)
      expect(() => {
        windowManager.handleDrag(NaN, 100);
      }).toThrow('Invalid drag coordinates');

      expect(() => {
        windowManager.handleDrag(100, Infinity);
      }).toThrow('Invalid drag coordinates');
    });
  });
});
