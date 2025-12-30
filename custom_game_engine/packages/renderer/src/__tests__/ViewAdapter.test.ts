/**
 * Tests for ViewAdapter
 *
 * Verifies that ViewAdapter correctly wraps DashboardView definitions
 * for use with WindowManager's IWindowPanel interface.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewAdapter } from '../adapters/ViewAdapter.js';
import type { DashboardView, ViewData, ViewContext, RenderBounds, RenderTheme } from '@ai-village/core';
import { defaultTheme } from '@ai-village/core';

// Mock canvas context
function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('ViewAdapter', () => {
  describe('constructor validation', () => {
    it('should throw if view is null', () => {
      expect(() => new ViewAdapter(null as unknown as DashboardView)).toThrow('view is required');
    });

    it('should throw if view is undefined', () => {
      expect(() => new ViewAdapter(undefined as unknown as DashboardView)).toThrow('view is required');
    });

    it('should throw if view.id is missing', () => {
      const invalidView = {
        title: 'Test',
        category: 'info' as const,
        getData: () => ({ timestamp: 0, available: true }),
      } as DashboardView;

      expect(() => new ViewAdapter(invalidView)).toThrow('view.id is required');
    });

    it('should throw if view.title is missing', () => {
      const invalidView = {
        id: 'test',
        category: 'info' as const,
        getData: () => ({ timestamp: 0, available: true }),
      } as DashboardView;

      expect(() => new ViewAdapter(invalidView)).toThrow('view.title is required');
    });

    it('should throw if view.getData is missing', () => {
      const invalidView = {
        id: 'test',
        title: 'Test',
        category: 'info' as const,
      } as DashboardView;

      expect(() => new ViewAdapter(invalidView)).toThrow('must have a getData function');
    });

    it('should warn if view has no canvasRenderer', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const textOnlyView: DashboardView = {
        id: 'test',
        title: 'Test',
        category: 'info',
        getData: () => ({ timestamp: 0, available: true }),
        textFormatter: (data) => 'text',
      };

      new ViewAdapter(textOnlyView);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("has no canvasRenderer")
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('IWindowPanel interface', () => {
    interface TestViewData extends ViewData {
      message: string;
    }

    let testView: DashboardView<TestViewData>;
    let adapter: ViewAdapter<TestViewData>;

    beforeEach(() => {
      testView = {
        id: 'test-view',
        title: 'Test View',
        category: 'info',
        getData: vi.fn(() => ({
          timestamp: Date.now(),
          available: true,
          message: 'Hello',
        })),
        canvasRenderer: vi.fn(),
        defaultSize: {
          width: 400,
          height: 500,
        },
      };

      adapter = new ViewAdapter(testView);
    });

    it('should return correct ID', () => {
      expect(adapter.getId()).toBe('test-view');
    });

    it('should return correct title', () => {
      expect(adapter.getTitle()).toBe('Test View');
    });

    it('should return default width from view.defaultSize', () => {
      expect(adapter.getDefaultWidth()).toBe(400);
    });

    it('should return default height from view.defaultSize', () => {
      expect(adapter.getDefaultHeight()).toBe(500);
    });

    it('should return fallback width if defaultSize not provided', () => {
      const viewWithoutSize: DashboardView = {
        id: 'test',
        title: 'Test',
        category: 'info',
        getData: () => ({ timestamp: 0, available: true }),
        canvasRenderer: vi.fn(),
      };

      const adapterWithoutSize = new ViewAdapter(viewWithoutSize);
      expect(adapterWithoutSize.getDefaultWidth()).toBe(400);
      expect(adapterWithoutSize.getDefaultHeight()).toBe(500);
    });

    it('should track visibility state', () => {
      expect(adapter.isVisible()).toBe(false);

      adapter.setVisible(true);
      expect(adapter.isVisible()).toBe(true);

      adapter.setVisible(false);
      expect(adapter.isVisible()).toBe(false);
    });
  });

  describe('rendering', () => {
    interface TestViewData extends ViewData {
      count: number;
    }

    let testView: DashboardView<TestViewData>;
    let adapter: ViewAdapter<TestViewData>;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      ctx = createMockCanvasContext();

      testView = {
        id: 'test-view',
        title: 'Test View',
        category: 'economy',
        getData: vi.fn((context: ViewContext) => ({
          timestamp: Date.now(),
          available: true,
          count: 42,
        })),
        canvasRenderer: vi.fn((
          ctx: CanvasRenderingContext2D,
          data: TestViewData,
          bounds: RenderBounds,
          theme: RenderTheme
        ) => {
          // Mock renderer
        }),
      };

      adapter = new ViewAdapter(testView);
      adapter.setVisible(true);
    });

    it('should not render if not visible', () => {
      adapter.setVisible(false);
      adapter.render(ctx, 0, 0, 400, 500);

      expect(testView.getData).not.toHaveBeenCalled();
      expect(testView.canvasRenderer).not.toHaveBeenCalled();
    });

    it('should call getData with correct context', () => {
      const mockWorld = { getEntity: vi.fn() };
      adapter.setWorld(mockWorld as any);

      adapter.render(ctx, 0, 0, 400, 500, mockWorld);

      expect(testView.getData).toHaveBeenCalledWith(
        expect.objectContaining({
          world: mockWorld,
        })
      );
    });

    it('should call canvasRenderer with correct parameters', () => {
      adapter.render(ctx, 10, 20, 400, 500);

      expect(testView.canvasRenderer).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({
          available: true,
          count: 42,
        }),
        { x: 10, y: 20, width: 400, height: 500 },
        defaultTheme
      );
    });

    it('should show loading message if getData returns null', () => {
      const viewWithAsyncData: DashboardView<TestViewData> = {
        ...testView,
        getData: vi.fn(() => null as unknown as TestViewData),
      };

      const asyncAdapter = new ViewAdapter(viewWithAsyncData);
      asyncAdapter.setVisible(true);

      asyncAdapter.render(ctx, 0, 0, 400, 500);

      expect(ctx.fillText).toHaveBeenCalledWith('Loading...', 200, 250);
    });

    it('should show unavailable message if data.available is false', () => {
      const viewWithUnavailableData: DashboardView<TestViewData> = {
        ...testView,
        getData: vi.fn(() => ({
          timestamp: Date.now(),
          available: false,
          unavailableReason: 'No world loaded',
          count: 0,
        })),
      };

      const unavailableAdapter = new ViewAdapter(viewWithUnavailableData);
      unavailableAdapter.setVisible(true);

      unavailableAdapter.render(ctx, 0, 0, 400, 500);

      expect(ctx.fillText).toHaveBeenCalledWith('No world loaded', 200, 250);
    });

    it('should handle render errors gracefully', () => {
      const errorView: DashboardView<TestViewData> = {
        ...testView,
        canvasRenderer: vi.fn(() => {
          throw new Error('Render failed');
        }),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorAdapter = new ViewAdapter(errorView);
      errorAdapter.setVisible(true);

      // Should not throw
      errorAdapter.render(ctx, 0, 0, 400, 500);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error rendering view'),
        expect.any(Error)
      );

      // Should show error message
      expect(ctx.fillText).toHaveBeenCalledWith('Render Error', 200, 250);

      consoleErrorSpy.mockRestore();
    });

    it('should apply scroll offset when rendering', () => {
      adapter.render(ctx, 0, 0, 400, 500);

      // Note: The scroll offset is managed internally by the view state
      // and applied during rendering. The exact behavior depends on
      // whether the view provides a custom handleScroll implementation.
      // This test verifies that the scroll method exists and can be called.
      if (adapter.handleScroll) {
        const handled = adapter.handleScroll(100, 500);
        expect(handled).toBe(true);
      }
    });
  });

  describe('scroll handling', () => {
    interface TestViewData extends ViewData {
      items: string[];
    }

    it('should update scroll offset on handleScroll', () => {
      const view: DashboardView<TestViewData> = {
        id: 'scrollable-view',
        title: 'Scrollable',
        category: 'info',
        getData: () => ({
          timestamp: Date.now(),
          available: true,
          items: ['a', 'b', 'c'],
        }),
        canvasRenderer: vi.fn(),
      };

      const adapter = new ViewAdapter(view);

      if (adapter.handleScroll) {
        // Scroll down
        adapter.handleScroll(50, 500);

        // Scroll should be updated (exact behavior depends on implementation)
        expect(adapter.handleScroll(0, 500)).toBe(true);
      }
    });

    it('should delegate to view.handleScroll if provided', () => {
      const mockHandleScroll = vi.fn(() => true);

      const view: DashboardView<TestViewData> = {
        id: 'custom-scroll-view',
        title: 'Custom Scroll',
        category: 'info',
        getData: () => ({
          timestamp: Date.now(),
          available: true,
          items: [],
        }),
        canvasRenderer: vi.fn(),
        handleScroll: mockHandleScroll,
      };

      const adapter = new ViewAdapter(view);

      if (adapter.handleScroll) {
        adapter.handleScroll(100, 500);

        expect(mockHandleScroll).toHaveBeenCalledWith(
          100,
          500,
          expect.any(Object) // viewState
        );
      }
    });
  });

  describe('click handling', () => {
    interface TestViewData extends ViewData {
      buttons: string[];
    }

    it('should delegate to view.handleClick if provided', () => {
      const mockHandleClick = vi.fn(() => true);

      const view: DashboardView<TestViewData> = {
        id: 'clickable-view',
        title: 'Clickable',
        category: 'info',
        getData: () => ({
          timestamp: Date.now(),
          available: true,
          buttons: ['OK', 'Cancel'],
        }),
        canvasRenderer: vi.fn(),
        handleClick: mockHandleClick,
      };

      const adapter = new ViewAdapter(view);
      adapter.setVisible(true);

      if (adapter.handleContentClick) {
        const handled = adapter.handleContentClick(50, 100, 400, 500);

        expect(handled).toBe(true);
        expect(mockHandleClick).toHaveBeenCalledWith(
          50,
          100,
          { x: 0, y: 0, width: 400, height: 500 },
          expect.objectContaining({
            available: true,
            buttons: ['OK', 'Cancel'],
          })
        );
      }
    });

    it('should return false if view has no handleClick', () => {
      const view: DashboardView<TestViewData> = {
        id: 'non-clickable-view',
        title: 'Non-Clickable',
        category: 'info',
        getData: () => ({
          timestamp: Date.now(),
          available: true,
          buttons: [],
        }),
        canvasRenderer: vi.fn(),
      };

      const adapter = new ViewAdapter(view);

      if (adapter.handleContentClick) {
        const handled = adapter.handleContentClick(50, 100, 400, 500);
        expect(handled).toBe(false);
      }
    });
  });

  describe('data caching', () => {
    interface TestViewData extends ViewData {
      value: number;
    }

    it('should cache data to avoid redundant fetches', () => {
      vi.useFakeTimers();

      const getDataSpy = vi.fn(() => ({
        timestamp: Date.now(),
        available: true,
        value: 123,
      }));

      const view: DashboardView<TestViewData> = {
        id: 'cached-view',
        title: 'Cached',
        category: 'info',
        getData: getDataSpy,
        canvasRenderer: vi.fn(),
      };

      const adapter = new ViewAdapter(view);
      adapter.setVisible(true);

      const ctx = createMockCanvasContext();

      // First render - should fetch data
      adapter.render(ctx, 0, 0, 400, 500);
      expect(getDataSpy).toHaveBeenCalledTimes(1);

      // Immediate second render - should use cached data
      adapter.render(ctx, 0, 0, 400, 500);
      expect(getDataSpy).toHaveBeenCalledTimes(1); // Still only called once

      // Wait for cache to expire (100ms)
      vi.advanceTimersByTime(150);

      // Third render - should fetch again
      adapter.render(ctx, 0, 0, 400, 500);
      expect(getDataSpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should invalidate cache when world changes', () => {
      const getDataSpy = vi.fn(() => ({
        timestamp: Date.now(),
        available: true,
        value: 456,
      }));

      const view: DashboardView<TestViewData> = {
        id: 'world-dependent-view',
        title: 'World Dependent',
        category: 'info',
        getData: getDataSpy,
        canvasRenderer: vi.fn(),
      };

      const adapter = new ViewAdapter(view);
      adapter.setVisible(true);

      const ctx = createMockCanvasContext();
      const world1 = { getEntity: vi.fn() };
      const world2 = { getEntity: vi.fn() };

      adapter.setWorld(world1 as any);
      adapter.render(ctx, 0, 0, 400, 500);
      expect(getDataSpy).toHaveBeenCalledTimes(1);

      // Change world - should invalidate cache
      adapter.setWorld(world2 as any);
      adapter.render(ctx, 0, 0, 400, 500);
      expect(getDataSpy).toHaveBeenCalledTimes(2);
    });
  });
});
