import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChunkManager, TerrainGenerator } from '@ai-village/world';
import type { Renderer } from '../Renderer';

/**
 * Internal Renderer properties accessed by tests.
 * These are private properties that tests check for memory leak prevention.
 */
interface RendererInternal extends Renderer {
  boundResizeHandler?: (() => void) | null;
  resizeHandler?: (() => void) | null;
  handleResize?: (() => void) | null;
  renderer3D?: unknown | null;
  was3DActive?: boolean;
  current3DWorld?: unknown | null;
}

describe('Renderer Cleanup (Memory Leak Fix)', () => {
  let canvas: HTMLCanvasElement;
  let chunkManager: ChunkManager;
  let terrainGenerator: TerrainGenerator;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    chunkManager = new ChunkManager(3);
    terrainGenerator = new TerrainGenerator('test');
  });

  afterEach(() => {
    document.body.removeChild(canvas);
    vi.clearAllMocks();
  });

  describe('Criterion 4: Renderer destroy() method', () => {
    it('should have a destroy() method', async () => {
      // Import Renderer dynamically to avoid initialization issues
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

      expect(renderer).toHaveProperty('destroy');
      expect(typeof renderer.destroy).toBe('function');
    });

    it('should remove resize event listener when destroy() is called', async () => {
      const { Renderer } = await import('../Renderer');

      // Spy on window.removeEventListener
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

      // Call destroy
      if (typeof renderer.destroy === 'function') {
        renderer.destroy();
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
        const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

        // Trigger a resize to ensure the handler is active
        window.dispatchEvent(new Event('resize'));

        // Destroy it
        if (typeof renderer.destroy === 'function') {
          renderer.destroy();
        }
      }

      // Should have removed listener for each cycle
      expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThanOrEqual(10);
    });

    it('should track bound resize handler for cleanup', async () => {
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

      // Renderer should maintain a reference to the bound resize handler
      // This ensures we can remove it later with the exact same reference
      const internal = renderer as RendererInternal;

      expect(
        internal.boundResizeHandler !== undefined ||
        internal.resizeHandler !== undefined ||
        internal.handleResize !== undefined
      ).toBe(true);
    });

    it('should handle destroy() being called multiple times safely', async () => {
      const { Renderer } = await import('../Renderer');

      const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

      // First destroy
      expect(() => {
        renderer.destroy();
      }).not.toThrow();

      // Second destroy should also not throw
      expect(() => {
        renderer.destroy();
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
        const renderer = new Renderer(canvas, chunkManager, terrainGenerator);
        if (typeof renderer.destroy === 'function') {
          renderer.destroy();
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

      const renderer = new Renderer(canvas, chunkManager, terrainGenerator);

      // Renderer uses 2D context, but has a 3D renderer instance that may be created
      // The destroy() method should clean up the 3D renderer if it exists
      expect(() => {
        renderer.destroy();
      }).not.toThrow();

      // Verify renderer3D is cleaned up
      const internal = renderer as RendererInternal;
      expect(internal.renderer3D).toBeNull();
      expect(internal.was3DActive).toBe(false);
      expect(internal.current3DWorld).toBeNull();
    });
  });

  describe('Error Handling: No Silent Fallbacks', () => {
    it('should throw when Renderer is created with invalid canvas', async () => {
      const { Renderer } = await import('../Renderer');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Renderer(null as any, chunkManager, terrainGenerator);
      }).toThrow();
    });

    it('should throw when Renderer is created with undefined canvas', async () => {
      const { Renderer } = await import('../Renderer');

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Renderer(undefined as any, chunkManager, terrainGenerator);
      }).toThrow();
    });
  });
});
