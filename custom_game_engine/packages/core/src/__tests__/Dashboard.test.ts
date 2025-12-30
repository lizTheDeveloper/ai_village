/**
 * Dashboard Module Tests
 *
 * Tests for the unified dashboard system: ViewRegistry, views, and theme utilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ViewRegistry,
  viewRegistry,
  ResourcesView,
  PopulationView,
  WeatherView,
  builtInViews,
  registerBuiltInViews,
  defaultTheme,
  getResourceColor,
  getResourceIcon,
  getStatusColor,
  formatNumber,
  createProgressBar,
  hasTextFormatter,
  hasCanvasRenderer,
  type DashboardView,
  type ViewData,
  type ViewContext,
} from '../dashboard/index.js';
import { World } from '../ecs/World.js';

// =============================================================================
// ViewRegistry Tests
// =============================================================================

describe('ViewRegistry', () => {
  let registry: ViewRegistry;

  beforeEach(() => {
    registry = new ViewRegistry();
  });

  describe('register', () => {
    it('should register a valid view', () => {
      const view: DashboardView = {
        id: 'test-view',
        title: 'Test View',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      expect(registry.has('test-view')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw on duplicate registration', () => {
      const view: DashboardView = {
        id: 'duplicate',
        title: 'Duplicate View',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      expect(() => registry.register(view)).toThrow("View with id 'duplicate' already registered");
    });

    it('should throw if view is missing', () => {
      expect(() => registry.register(null as any)).toThrow('View is required');
    });

    it('should throw if view.id is missing', () => {
      const view = {
        title: 'No ID',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      } as any;

      expect(() => registry.register(view)).toThrow('View must have an id');
    });

    it('should throw if view.id is empty string', () => {
      const view = {
        id: '  ',
        title: 'Empty ID',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      } as any;

      expect(() => registry.register(view)).toThrow('View id must be a non-empty string');
    });

    it('should throw if view.title is missing', () => {
      const view = {
        id: 'no-title',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      } as any;

      expect(() => registry.register(view)).toThrow("View 'no-title' must have a title");
    });

    it('should throw if view.category is missing', () => {
      const view = {
        id: 'no-category',
        title: 'No Category',
        getData: () => ({ timestamp: Date.now(), available: true }),
      } as any;

      expect(() => registry.register(view)).toThrow("View 'no-category' must have a category");
    });

    it('should throw if view.getData is not a function', () => {
      const view = {
        id: 'no-getData',
        title: 'No getData',
        category: 'info',
      } as any;

      expect(() => registry.register(view)).toThrow("View 'no-getData' must have a getData function");
    });

    it('should warn if view has no renderers', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const view: DashboardView = {
        id: 'no-renderers',
        title: 'No Renderers',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("View 'no-renderers' has no textFormatter or canvasRenderer")
      );

      warnSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('should return registered view', () => {
      const view: DashboardView = {
        id: 'get-test',
        title: 'Get Test',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      const retrieved = registry.get('get-test');
      expect(retrieved).toBe(view);
    });

    it('should throw on non-existent view', () => {
      expect(() => registry.get('non-existent')).toThrow("View 'non-existent' not found");
    });

    it('should list available views in error message', () => {
      const view: DashboardView = {
        id: 'available-view',
        title: 'Available',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      expect(() => registry.get('missing')).toThrow('Available views: available-view');
    });
  });

  describe('tryGet', () => {
    it('should return undefined for non-existent view', () => {
      expect(registry.tryGet('non-existent')).toBeUndefined();
    });

    it('should return view if exists', () => {
      const view: DashboardView = {
        id: 'try-get',
        title: 'Try Get',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      expect(registry.tryGet('try-get')).toBe(view);
    });
  });

  describe('unregister', () => {
    it('should remove a registered view', () => {
      const view: DashboardView = {
        id: 'to-remove',
        title: 'To Remove',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);
      expect(registry.has('to-remove')).toBe(true);

      const result = registry.unregister('to-remove');
      expect(result).toBe(true);
      expect(registry.has('to-remove')).toBe(false);
    });

    it('should return false for non-existent view', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all views', () => {
      registry.register({
        id: 'view1',
        title: 'View 1',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });
      registry.register({
        id: 'view2',
        title: 'View 2',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });

      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
    });
  });

  describe('getByCategory', () => {
    beforeEach(() => {
      registry.register({
        id: 'economy1',
        title: 'Economy 1',
        category: 'economy',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });
      registry.register({
        id: 'economy2',
        title: 'Economy 2',
        category: 'economy',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });
      registry.register({
        id: 'info1',
        title: 'Info 1',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });
    });

    it('should return views in specified category', () => {
      const economyViews = registry.getByCategory('economy');
      expect(economyViews).toHaveLength(2);
      expect(economyViews.map(v => v.id)).toContain('economy1');
      expect(economyViews.map(v => v.id)).toContain('economy2');
    });

    it('should return empty array for empty category', () => {
      const magicViews = registry.getByCategory('magic');
      expect(magicViews).toHaveLength(0);
    });
  });

  describe('getTextViews', () => {
    it('should return only views with textFormatter', () => {
      registry.register({
        id: 'text-view',
        title: 'Text View',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        textFormatter: () => 'text',
      });
      registry.register({
        id: 'canvas-only',
        title: 'Canvas Only',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        canvasRenderer: () => {},
      });

      const textViews = registry.getTextViews();
      expect(textViews).toHaveLength(1);
      expect(textViews[0].id).toBe('text-view');
    });
  });

  describe('getCanvasViews', () => {
    it('should return only views with canvasRenderer', () => {
      registry.register({
        id: 'canvas-view',
        title: 'Canvas View',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        canvasRenderer: () => {},
      });
      registry.register({
        id: 'text-only',
        title: 'Text Only',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        textFormatter: () => 'text',
      });

      const canvasViews = registry.getCanvasViews();
      expect(canvasViews).toHaveLength(1);
      expect(canvasViews[0].id).toBe('canvas-view');
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on registration', () => {
      const listener = vi.fn();
      registry.subscribe(listener);

      registry.register({
        id: 'notify-test',
        title: 'Notify Test',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify listeners on unregister', () => {
      const view: DashboardView = {
        id: 'unregister-notify',
        title: 'Unregister Notify',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      registry.register(view);

      const listener = vi.fn();
      registry.subscribe(listener);

      registry.unregister('unregister-notify');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = registry.subscribe(listener);

      unsubscribe();

      registry.register({
        id: 'no-notify',
        title: 'No Notify',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Built-in Views Tests
// =============================================================================

describe('Built-in Views', () => {
  describe('builtInViews', () => {
    it('should contain ResourcesView', () => {
      expect(builtInViews).toContain(ResourcesView);
    });

    it('should contain PopulationView', () => {
      expect(builtInViews).toContain(PopulationView);
    });

    it('should contain WeatherView', () => {
      expect(builtInViews).toContain(WeatherView);
    });
  });

  describe('ResourcesView', () => {
    it('should have correct metadata', () => {
      expect(ResourcesView.id).toBe('resources');
      expect(ResourcesView.title).toBe('Village Stockpile');
      expect(ResourcesView.category).toBe('economy');
      expect(ResourcesView.keyboardShortcut).toBe('R');
    });

    it('should have textFormatter', () => {
      expect(hasTextFormatter(ResourcesView)).toBe(true);
    });

    it('should have canvasRenderer', () => {
      expect(hasCanvasRenderer(ResourcesView)).toBe(true);
    });

    it('should return unavailable when no world', () => {
      const context: ViewContext = {};
      const data = ResourcesView.getData(context);

      expect(data.available).toBe(false);
      expect(data.unavailableReason).toBe('Game world not available');
    });

    it('should format text when data unavailable', () => {
      const data = {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Test error',
        resources: {},
        storageInfo: null,
      };

      const text = ResourcesView.textFormatter!(data);

      expect(text).toContain('VILLAGE STOCKPILE');
      expect(text).toContain('Test error');
    });

    it('should format resources in text output', () => {
      const data = {
        timestamp: Date.now(),
        available: true,
        resources: { wood: 50, stone: 30 },
        storageInfo: { buildingCount: 1, usedSlots: 2, totalSlots: 10 },
      };

      const text = ResourcesView.textFormatter!(data);

      expect(text).toContain('wood: 50');
      expect(text).toContain('stone: 30');
      expect(text).toContain('1 building(s)');
      expect(text).toContain('2/10 slots');
    });
  });

  describe('PopulationView', () => {
    it('should have correct metadata', () => {
      expect(PopulationView.id).toBe('population');
      expect(PopulationView.title).toBe('Population Summary');
      expect(PopulationView.category).toBe('info');
    });

    it('should return unavailable when no world', () => {
      const context: ViewContext = {};
      const data = PopulationView.getData(context);

      expect(data.available).toBe(false);
    });

    it('should format health stats in text', () => {
      const data = {
        timestamp: Date.now(),
        available: true,
        alive: 10,
        dead: 2,
        births: 3,
        avgAge: 5.5,
        behaviorBreakdown: { idle: 5, gathering: 3, building: 2 },
        healthStats: { healthy: 7, struggling: 2, critical: 1 },
      };

      const text = PopulationView.textFormatter!(data);

      expect(text).toContain('Living Agents: 10');
      expect(text).toContain('Healthy:    7');
      expect(text).toContain('Struggling: 2');
      expect(text).toContain('Critical:   1');
    });
  });

  describe('WeatherView', () => {
    it('should have correct metadata', () => {
      expect(WeatherView.id).toBe('weather');
      expect(WeatherView.title).toBe('Weather & Time');
      expect(WeatherView.category).toBe('info');
    });

    it('should return unavailable when no world', () => {
      const context: ViewContext = {};
      const data = WeatherView.getData(context);

      expect(data.available).toBe(false);
    });

    it('should format weather in text', () => {
      const data = {
        timestamp: Date.now(),
        available: true,
        weatherType: 'rain',
        intensity: 0.5,
        durationRemaining: 2.5,
        temperature: 15,
        timeOfDay: 14.5,
        phase: 'day',
        day: 3,
        lightLevel: 0.9,
      };

      const text = WeatherView.textFormatter!(data);

      expect(text).toContain('WEATHER & TIME');
      expect(text).toContain('Day 3');
      expect(text).toContain('rain');
      expect(text).toContain('15.0°C');
    });
  });
});

// =============================================================================
// Theme Utilities Tests
// =============================================================================

describe('Theme Utilities', () => {
  describe('defaultTheme', () => {
    it('should have required color properties', () => {
      expect(defaultTheme.colors.background).toBeDefined();
      expect(defaultTheme.colors.text).toBeDefined();
      expect(defaultTheme.colors.accent).toBeDefined();
      expect(defaultTheme.colors.error).toBeDefined();
    });

    it('should have required font properties', () => {
      expect(defaultTheme.fonts.normal).toBeDefined();
      expect(defaultTheme.fonts.bold).toBeDefined();
    });

    it('should have required spacing properties', () => {
      expect(defaultTheme.spacing.padding).toBeGreaterThan(0);
      expect(defaultTheme.spacing.lineHeight).toBeGreaterThan(0);
    });
  });

  describe('getResourceColor', () => {
    it('should return wood color for wood', () => {
      expect(getResourceColor('wood')).toBe('#8B4513');
    });

    it('should return stone color for stone', () => {
      expect(getResourceColor('stone')).toBe('#808080');
    });

    it('should return default for unknown resource', () => {
      expect(getResourceColor('unknown-item')).toBe('#FFFFFF');
    });

    it('should match partial names', () => {
      expect(getResourceColor('oak_wood')).toBe('#8B4513');
      expect(getResourceColor('plant_fiber')).toBe('#DEB887'); // fiber color
    });
  });

  describe('getResourceIcon', () => {
    it('should return wood icon for wood', () => {
      expect(getResourceIcon('wood')).toBe('🪵');
    });

    it('should return food icon for food', () => {
      expect(getResourceIcon('food')).toBe('🍎');
    });

    it('should return default for unknown resource', () => {
      expect(getResourceIcon('unknown')).toBe('📦');
    });
  });

  describe('getStatusColor', () => {
    it('should return error for critical values', () => {
      expect(getStatusColor(10)).toBe('#FF4444');
    });

    it('should return warning for low values', () => {
      expect(getStatusColor(30)).toBe('#FFA500');
    });

    it('should return success for healthy values', () => {
      expect(getStatusColor(75)).toBe('#44FF44');
    });

    it('should respect custom thresholds', () => {
      expect(getStatusColor(15, 10, 20)).toBe('#FFA500');
      expect(getStatusColor(5, 10, 20)).toBe('#FF4444');
      expect(getStatusColor(25, 10, 20)).toBe('#44FF44');
    });
  });

  describe('formatNumber', () => {
    it('should format integers without decimals', () => {
      expect(formatNumber(42)).toBe('42');
    });

    it('should format decimals with one decimal place', () => {
      expect(formatNumber(3.14159)).toBe('3.1');
    });

    it('should respect explicit decimal places', () => {
      expect(formatNumber(3.14159, 2)).toBe('3.14');
      expect(formatNumber(42, 2)).toBe('42.00');
    });
  });

  describe('createProgressBar', () => {
    it('should create full bar at 100%', () => {
      const bar = createProgressBar(100, 10);
      expect(bar).toBe('██████████');
    });

    it('should create empty bar at 0%', () => {
      const bar = createProgressBar(0, 10);
      expect(bar).toBe('░░░░░░░░░░');
    });

    it('should create partial bar', () => {
      const bar = createProgressBar(50, 10);
      expect(bar).toBe('█████░░░░░');
    });
  });
});

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  describe('hasTextFormatter', () => {
    it('should return true for views with textFormatter', () => {
      const view: DashboardView = {
        id: 'text',
        title: 'Text',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        textFormatter: () => 'text',
      };

      expect(hasTextFormatter(view)).toBe(true);
    });

    it('should return false for views without textFormatter', () => {
      const view: DashboardView = {
        id: 'no-text',
        title: 'No Text',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      expect(hasTextFormatter(view)).toBe(false);
    });
  });

  describe('hasCanvasRenderer', () => {
    it('should return true for views with canvasRenderer', () => {
      const view: DashboardView = {
        id: 'canvas',
        title: 'Canvas',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
        canvasRenderer: () => {},
      };

      expect(hasCanvasRenderer(view)).toBe(true);
    });

    it('should return false for views without canvasRenderer', () => {
      const view: DashboardView = {
        id: 'no-canvas',
        title: 'No Canvas',
        category: 'info',
        getData: () => ({ timestamp: Date.now(), available: true }),
      };

      expect(hasCanvasRenderer(view)).toBe(false);
    });
  });
});

// =============================================================================
// Global Registry Tests
// =============================================================================

describe('Global viewRegistry', () => {
  it('should be an instance of ViewRegistry', () => {
    expect(viewRegistry).toBeInstanceOf(ViewRegistry);
  });

  it('should have built-in views auto-registered', () => {
    // Views are auto-registered on import
    expect(viewRegistry.has('resources')).toBe(true);
    expect(viewRegistry.has('population')).toBe(true);
    expect(viewRegistry.has('weather')).toBe(true);
  });

  it('should allow re-calling registerBuiltInViews without error', () => {
    // Should be idempotent
    expect(() => registerBuiltInViews()).not.toThrow();
    expect(viewRegistry.has('resources')).toBe(true);
  });
});
