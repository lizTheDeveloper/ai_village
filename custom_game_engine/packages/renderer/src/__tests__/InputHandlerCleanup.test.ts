import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputHandler } from '../InputHandler';

describe('InputHandler Cleanup (Memory Leak Fix)', () => {
  let canvas: HTMLCanvasElement;
  let inputHandler: InputHandler;

  beforeEach(() => {
    // Create a mock canvas element
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    // Cleanup
    if (inputHandler && typeof (inputHandler as any).destroy === 'function') {
      (inputHandler as any).destroy();
    }
    document.body.removeChild(canvas);
    vi.clearAllMocks();
  });

  describe('Criterion 4: InputHandler destroy() method', () => {
    it('should have a destroy() method', () => {
      inputHandler = new InputHandler(canvas);

      expect(inputHandler).toHaveProperty('destroy');
      expect(typeof (inputHandler as any).destroy).toBe('function');
    });

    it('should remove all event listeners when destroy() is called', () => {
      inputHandler = new InputHandler(canvas);

      // Spy on removeEventListener
      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener');

      // Call destroy
      (inputHandler as any).destroy();

      // Should have called removeEventListener for each registered handler
      // InputHandler typically listens to: mousedown, mouseup, mousemove, contextmenu, wheel
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should prevent memory leaks during multiple create/destroy cycles', () => {
      // Simulate creating and destroying InputHandler multiple times
      // This would accumulate listeners if destroy() doesn't work properly

      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener');

      for (let i = 0; i < 10; i++) {
        const handler = new InputHandler(canvas);

        // Use the handler briefly
        // Trigger some events to ensure handlers are registered
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }));

        // Destroy it
        if (typeof (handler as any).destroy === 'function') {
          (handler as any).destroy();
        }
      }

      // Should have removed listeners for each cycle
      expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should track all bound handlers for cleanup', () => {
      inputHandler = new InputHandler(canvas);

      // InputHandler should maintain a list of bound handlers
      // This ensures we can remove them later with the exact same reference

      expect(inputHandler).toHaveProperty('boundHandlers');

      const boundHandlers = (inputHandler as any).boundHandlers;
      expect(Array.isArray(boundHandlers) || typeof boundHandlers === 'object').toBe(true);
    });

    it('should handle destroy() being called multiple times safely', () => {
      inputHandler = new InputHandler(canvas);

      // First destroy
      expect(() => {
        (inputHandler as any).destroy();
      }).not.toThrow();

      // Second destroy should also not throw
      expect(() => {
        (inputHandler as any).destroy();
      }).not.toThrow();
    });

    it('should not leak listeners when InputHandler is recreated', () => {
      // Count initial listeners
      const getListenerCount = () => {
        // This is tricky to test directly, but we can verify removeEventListener calls
        return 0;
      };

      const removeListenerSpy = vi.spyOn(canvas, 'removeEventListener');

      // Create and destroy multiple times
      for (let i = 0; i < 5; i++) {
        const handler = new InputHandler(canvas);
        if (typeof (handler as any).destroy === 'function') {
          (handler as any).destroy();
        }
      }

      // Should have removed listeners each time
      expect(removeListenerSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling: No Silent Fallbacks', () => {
    it('should throw when InputHandler is created with invalid canvas', () => {
      expect(() => {
        new InputHandler(null as any);
      }).toThrow();
    });

    it('should throw when InputHandler is created with undefined canvas', () => {
      expect(() => {
        new InputHandler(undefined as any);
      }).toThrow();
    });
  });
});
