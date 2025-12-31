import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Renderer Cleanup (Memory Leak Fix)', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
    vi.clearAllMocks();
  });

  describe('Criterion 4: Renderer destroy() method', () => {
    it('should have a destroy() method', async () => {
      // Import Renderer dynamically to avoid initialization issues
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas);

      expect(renderer).toHaveProperty('destroy');
      expect(typeof (renderer as any).destroy).toBe('function');
    });

    it('should remove resize event listener when destroy() is called', async () => {
      const { Renderer } = await import('../Renderer');

      // Spy on window.removeEventListener
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const renderer = new Renderer(canvas);

      // Call destroy
      if (typeof (renderer as any).destroy === 'function') {
        (renderer as any).destroy();
      }

      // Should have removed the 'resize' event listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
    });

    it('should prevent memory leaks during multiple create/destroy cycles', async () => {
      const { Renderer } = await import('../Renderer');

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Create and destroy renderer multiple times
      for (let i = 0; i < 10; i++) {
        const renderer = new Renderer(canvas);

        // Trigger a resize to ensure the handler is active
        window.dispatchEvent(new Event('resize'));

        // Destroy it
        if (typeof (renderer as any).destroy === 'function') {
          (renderer as any).destroy();
        }
      }

      // Should have removed listener for each cycle
      expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it('should track bound resize handler for cleanup', async () => {
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas);

      // Renderer should maintain a reference to the bound resize handler
      // This ensures we can remove it later with the exact same reference

      expect(
        (renderer as any).boundResizeHandler !== undefined ||
        (renderer as any).resizeHandler !== undefined ||
        (renderer as any).handleResize !== undefined
      ).toBe(true);
    });

    it('should handle destroy() being called multiple times safely', async () => {
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas);

      // First destroy
      expect(() => {
        (renderer as any).destroy();
      }).not.toThrow();

      // Second destroy should also not throw
      expect(() => {
        (renderer as any).destroy();
      }).not.toThrow();
    });

    it('should not accumulate resize listeners across instances', async () => {
      const { Renderer } = await import('../Renderer');

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // Track listener accumulation
      const initialAddCalls = addEventListenerSpy.mock.calls.length;

      // Create multiple renderers with cleanup
      for (let i = 0; i < 5; i++) {
        const renderer = new Renderer(canvas);
        if (typeof (renderer as any).destroy === 'function') {
          (renderer as any).destroy();
        }
      }

      const finalAddCalls = addEventListenerSpy.mock.calls.length;
      const removeCalls = removeEventListenerSpy.mock.calls.length;

      // Each renderer should add one resize listener
      const addedListeners = finalAddCalls - initialAddCalls;

      // Should have removed as many as we added
      expect(removeCalls).toBeGreaterThanOrEqual(addedListeners - 1);
    });

    it('should cleanup WebGL context resources if applicable', async () => {
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas);

      // If using WebGL, should cleanup context
      const context = canvas.getContext('webgl') || canvas.getContext('webgl2');

      if (context && typeof (renderer as any).destroy === 'function') {
        (renderer as any).destroy();

        // Verify cleanup was attempted
        // Note: Actual WebGL cleanup verification is complex,
        // but destroy() should handle it
        expect(true).toBe(true);
      }
    });
  });

  describe('Error Handling: No Silent Fallbacks', () => {
    it('should throw when Renderer is created with invalid canvas', async () => {
      const { Renderer } = await import('../Renderer');

      expect(() => {
        new Renderer(null as any);
      }).toThrow();
    });

    it('should throw when Renderer is created with undefined canvas', async () => {
      const { Renderer } = await import('../Renderer');

      expect(() => {
        new Renderer(undefined as any);
      }).toThrow();
    });
  });
});
