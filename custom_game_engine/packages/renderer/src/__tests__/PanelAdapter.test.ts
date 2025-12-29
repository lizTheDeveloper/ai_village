import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IWindowPanel } from '../types/WindowTypes.js';
import { PanelAdapter, type PanelConfig } from '../adapters/PanelAdapter.js';

/**
 * Tests for generic PanelAdapter class.
 *
 * This test suite verifies that the PanelAdapter can replace all 14 individual
 * adapter classes while maintaining full compatibility with the IWindowPanel interface.
 */

// Mock panel types to simulate different panel variations
interface MockPanelBase {
  getId(): string;
  getTitle(): string;
  getWidth(): number;
  getHeight(): number;
  render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, world?: any): void;
}

interface MockPanelWithBooleanVisibility extends MockPanelBase {
  isVisible(): boolean;
  setVisible(visible: boolean): void;
}

interface MockPanelWithDelegateVisibility extends MockPanelBase {
  getIsVisible(): boolean;
  toggle(): void;
}

interface MockPanelWithConditionalVisibility extends MockPanelBase {
  getSelectedEntityId(): () => string | null;
}

interface MockPanelWithCloseMethod extends MockPanelBase {
  isVisible(): boolean;
  close(): void;
}

// Type alias for convenience
type PanelAdapterConfig<T> = PanelConfig<T>;

describe('PanelAdapter', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    mockCtx = mockCanvas.getContext('2d')!;
  });

  describe('Acceptance Criterion 1: Generic Adapter Works for All Panel Types', () => {
    describe('Basic adapter functionality', () => {
      it('should require panel parameter on construction', () => {
        const config: PanelAdapterConfig<any> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        expect(() => {
          new PanelAdapter(null as any, config);
        }).toThrow();

        expect(() => {
          new PanelAdapter(undefined as any, config);
        }).toThrow();
      });

      it('should require config parameter on construction', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        expect(() => {
          new PanelAdapter(mockPanel, null as any);
        }).toThrow();

        expect(() => {
          new PanelAdapter(mockPanel, undefined as any);
        }).toThrow();
      });

      it('should return correct ID from config', () => {
        const mockPanel = {
          getId: () => 'wrong-id',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'correct-id',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        expect(adapter.getId()).toBe('correct-id');
      });

      it('should return correct title from config', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Wrong Title',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Correct Title',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        expect(adapter.getTitle()).toBe('Correct Title');
      });

      it('should return correct default width from config', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 999,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 500,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        expect(adapter.getDefaultWidth()).toBe(500);
      });

      it('should return correct default height from config', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 999,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 600,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        expect(adapter.getDefaultHeight()).toBe(600);
      });

      it('should provide access to underlying panel via getPanel()', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
          customMethod: () => 'custom',
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        const panel = adapter.getPanel();

        expect(panel).toBe(mockPanel);
        expect(panel.customMethod()).toBe('custom');
      });
    });

    describe('Default visibility behavior', () => {
      it('should use internal visible state when no getVisible config provided', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Should start invisible
        expect(adapter.isVisible()).toBe(false);

        // Should become visible after setVisible(true)
        adapter.setVisible(true);
        expect(adapter.isVisible()).toBe(true);

        // Should become invisible after setVisible(false)
        adapter.setVisible(false);
        expect(adapter.isVisible()).toBe(false);
      });
    });

    describe('Default render behavior', () => {
      it('should delegate to panel render method when no renderMethod config provided', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);
        adapter.setVisible(true); // Panel must be visible to render
        const world = { entities: [] };

        adapter.render(mockCtx, 10, 20, 300, 400, world);

        expect(mockPanel.render).toHaveBeenCalledWith(mockCtx, 10, 20, 300, 400, world);
      });

      it('should not render when invisible', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Start invisible
        adapter.setVisible(false);
        adapter.render(mockCtx, 10, 20, 300, 400);

        expect(mockPanel.render).not.toHaveBeenCalled();
      });
    });
  });

  describe('Acceptance Criterion 2: Configuration Handles Variations', () => {
    describe('Boolean visibility pattern (e.g., ResourcesPanel)', () => {
      it('should use panel isVisible/setVisible when configured', () => {
        const mockPanel: MockPanelWithBooleanVisibility = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          isVisible: vi.fn(() => false),
          setVisible: vi.fn(),
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'resources',
          title: 'Resources',
          defaultWidth: 300,
          defaultHeight: 400,
          getVisible: (panel) => panel.isVisible(),
          setVisible: (panel, visible) => panel.setVisible(visible),
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Test getVisible delegation
        adapter.isVisible();
        expect(mockPanel.isVisible).toHaveBeenCalled();

        // Test setVisible delegation
        adapter.setVisible(true);
        expect(mockPanel.setVisible).toHaveBeenCalledWith(true);
      });
    });

    describe('Delegate visibility pattern (e.g., SettingsPanel)', () => {
      it('should use panel getIsVisible/toggle when configured', () => {
        let panelVisible = false;
        const mockPanel: MockPanelWithDelegateVisibility = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 600,
          getHeight: () => 500,
          getIsVisible: vi.fn(() => panelVisible),
          toggle: vi.fn(() => { panelVisible = !panelVisible; }),
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'settings',
          title: 'Settings',
          defaultWidth: 600,
          defaultHeight: 500,
          getVisible: (panel) => panel.getIsVisible(),
          setVisible: (panel, visible) => {
            if (visible !== panel.getIsVisible()) {
              panel.toggle();
            }
          },
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Should start invisible
        expect(adapter.isVisible()).toBe(false);
        expect(mockPanel.getIsVisible).toHaveBeenCalled();

        // Toggle to visible
        adapter.setVisible(true);
        expect(mockPanel.toggle).toHaveBeenCalled();
        expect(panelVisible).toBe(true);

        // Should be visible now
        expect(adapter.isVisible()).toBe(true);

        // Toggle back to invisible
        adapter.setVisible(false);
        expect(panelVisible).toBe(false);
      });
    });

    describe('Conditional visibility pattern (e.g., AgentInfoPanel)', () => {
      it('should combine visible flag with conditional logic when configured', () => {
        let selectedEntityId: string | null = null;
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 530,
          getSelectedEntityId: vi.fn(() => selectedEntityId),
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'agent-info',
          title: 'Agent Info',
          defaultWidth: 300,
          defaultHeight: 530,
          // Uses internal visible state + conditional check
          getVisible: (panel) => {
            // Internal visible state is tracked by adapter
            // This config adds the conditional check
            return panel.getSelectedEntityId() !== null;
          },
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Should be invisible when no entity selected (even if set visible)
        adapter.setVisible(true);
        expect(adapter.isVisible()).toBe(false);

        // Should become visible when entity selected
        selectedEntityId = 'entity-123';
        expect(adapter.isVisible()).toBe(true);

        // Should become invisible when entity deselected
        selectedEntityId = null;
        expect(adapter.isVisible()).toBe(false);
      });
    });

    describe('Close-only visibility pattern (e.g., ShopPanel)', () => {
      it('should support setVisible that only handles closing', () => {
        let panelVisible = true;
        const mockPanel: MockPanelWithCloseMethod = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 500,
          getHeight: () => 600,
          isVisible: vi.fn(() => panelVisible),
          close: vi.fn(() => { panelVisible = false; }),
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'shop',
          title: 'Shop',
          defaultWidth: 500,
          defaultHeight: 600,
          getVisible: (panel) => panel.isVisible(),
          setVisible: (panel, visible) => {
            if (!visible) {
              panel.close();
            }
            // Opening is handled separately (e.g., openShop method)
          },
        };

        const adapter = new PanelAdapter(mockPanel, config);

        // Should be visible initially
        expect(adapter.isVisible()).toBe(true);

        // setVisible(false) should close
        adapter.setVisible(false);
        expect(mockPanel.close).toHaveBeenCalled();
        expect(panelVisible).toBe(false);

        // setVisible(true) should not do anything (opening handled elsewhere)
        adapter.setVisible(true);
        expect(panelVisible).toBe(false); // Still closed
      });
    });
  });

  describe('Optional method delegation', () => {
    describe('handleScroll', () => {
      it('should delegate scroll handling when configured', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
          handleScroll: vi.fn(() => true),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
          handleScroll: (panel, deltaY, contentHeight) => panel.handleScroll(deltaY),
        };

        const adapter = new PanelAdapter(mockPanel, config);

        const result = adapter.handleScroll!(50, 400);

        expect(mockPanel.handleScroll).toHaveBeenCalledWith(50);
        expect(result).toBe(true);
      });

      it('should not have handleScroll method when not configured', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);

        expect(adapter.handleScroll).toBeUndefined();
      });
    });

    describe('handleContentClick', () => {
      it('should delegate click handling when configured', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
          handleClick: vi.fn(() => true),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
          handleContentClick: (panel, x, y, width, height) => panel.handleClick(x, y, 0, 0, width),
        };

        const adapter = new PanelAdapter(mockPanel, config);

        const result = adapter.handleContentClick!(10, 20, 300, 400);

        expect(mockPanel.handleClick).toHaveBeenCalledWith(10, 20, 0, 0, 300);
        expect(result).toBe(true);
      });

      it('should not have handleContentClick method when not configured', () => {
        const mockPanel = {
          getId: () => 'test',
          getTitle: () => 'Test',
          getWidth: () => 300,
          getHeight: () => 400,
          render: vi.fn(),
        };

        const config: PanelAdapterConfig<typeof mockPanel> = {
          id: 'test-panel',
          title: 'Test Panel',
          defaultWidth: 300,
          defaultHeight: 400,
        };

        const adapter = new PanelAdapter(mockPanel, config);

        expect(adapter.handleContentClick).toBeUndefined();
      });
    });
  });

  describe('Custom render method', () => {
    it('should use custom renderMethod when configured', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 600,
        getHeight: () => 500,
        render: vi.fn(), // Original render
        customRender: vi.fn(), // Custom render
      };

      const config: PanelAdapterConfig<typeof mockPanel> = {
        id: 'test-panel',
        title: 'Test Panel',
        defaultWidth: 600,
        defaultHeight: 500,
        renderMethod: (panel, ctx, x, y, width, height, world) => {
          panel.customRender(ctx, world);
        },
      };

      const adapter = new PanelAdapter(mockPanel, config);
      adapter.setVisible(true);

      const world = { entities: [] };
      adapter.render(mockCtx, 10, 20, 600, 500, world);

      // Should use custom render, not default
      expect(mockPanel.customRender).toHaveBeenCalledWith(mockCtx, world);
      expect(mockPanel.render).not.toHaveBeenCalled();
    });

    it('should pass world parameter to custom renderMethod', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      let capturedWorld: any = null;
      const config: PanelAdapterConfig<typeof mockPanel> = {
        id: 'test-panel',
        title: 'Test Panel',
        defaultWidth: 300,
        defaultHeight: 400,
        renderMethod: (panel, ctx, x, y, width, height, world) => {
          capturedWorld = world;
          panel.render(ctx, x, y, width, height, world);
        },
      };

      const adapter = new PanelAdapter(mockPanel, config);
      adapter.setVisible(true);

      const world = { entities: ['entity1', 'entity2'] };
      adapter.render(mockCtx, 0, 0, 300, 400, world);

      expect(capturedWorld).toBe(world);
    });
  });

  describe('Error handling (per CLAUDE.md - no silent fallbacks)', () => {
    it('should throw when panel is null', () => {
      const config: PanelAdapterConfig<any> = {
        id: 'test',
        title: 'Test',
        defaultWidth: 300,
        defaultHeight: 400,
      };

      expect(() => {
        new PanelAdapter(null, config);
      }).toThrow(/panel.*required|cannot be null/i);
    });

    it('should throw when panel is undefined', () => {
      const config: PanelAdapterConfig<any> = {
        id: 'test',
        title: 'Test',
        defaultWidth: 300,
        defaultHeight: 400,
      };

      expect(() => {
        new PanelAdapter(undefined as any, config);
      }).toThrow(/panel.*required|cannot be null/i);
    });

    it('should throw when config is null', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, null as any);
      }).toThrow(/config.*required|cannot be null/i);
    });

    it('should throw when config is undefined', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, undefined as any);
      }).toThrow(/config.*required|cannot be null/i);
    });

    it('should throw when config.id is missing', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, {
          title: 'Test',
          defaultWidth: 300,
          defaultHeight: 400,
        } as any);
      }).toThrow(/id.*required/i);
    });

    it('should throw when config.title is missing', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, {
          id: 'test',
          defaultWidth: 300,
          defaultHeight: 400,
        } as any);
      }).toThrow(/title.*required/i);
    });

    it('should throw when config.defaultWidth is missing', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, {
          id: 'test',
          title: 'Test',
          defaultHeight: 400,
        } as any);
      }).toThrow(/defaultWidth.*required/i);
    });

    it('should throw when config.defaultHeight is missing', () => {
      const mockPanel = {
        getId: () => 'test',
        getTitle: () => 'Test',
        getWidth: () => 300,
        getHeight: () => 400,
        render: vi.fn(),
      };

      expect(() => {
        new PanelAdapter(mockPanel, {
          id: 'test',
          title: 'Test',
          defaultWidth: 300,
        } as any);
      }).toThrow(/defaultHeight.*required/i);
    });
  });
});
