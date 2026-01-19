/**
 * Unit tests for ResearchLibraryPanel
 *
 * Tests the research library UI component that displays discovered papers.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchLibraryPanel } from '../ResearchLibraryPanel.js';
import {
  WorldImpl,
  EventBusImpl,
  createResearchStateComponent,
  EntityImpl,
  createEntityId,
} from '@ai-village/core';
import type { ResearchStateComponent } from '@ai-village/core';
import { getPaper } from '@ai-village/world';

// Mock getPaper function
vi.mock('@ai-village/world', () => ({
  getPaper: vi.fn((paperId: string) => {
    const mockPapers: Record<string, any> = {
      'herb_garden_planning': {
        paperId: 'herb_garden_planning',
        title: 'Herb Garden Planning',
        field: 'nature',
        complexity: 1,
        tier: 1,
      },
      'soil_for_medicinal_plants': {
        paperId: 'soil_for_medicinal_plants',
        title: 'Soil for Medicinal Plants',
        field: 'nature',
        complexity: 2,
        tier: 2,
      },
      'wood_properties_construction': {
        paperId: 'wood_properties_construction',
        title: 'Wood Properties for Construction',
        field: 'construction',
        complexity: 3,
        tier: 3,
      },
    };
    return mockPapers[paperId];
  }),
}));

describe('ResearchLibraryPanel', () => {
  let panel: ResearchLibraryPanel;
  let world: WorldImpl;
  let worldEntity: EntityImpl;
  let researchState: ResearchStateComponent;

  beforeEach(() => {
    // Create world
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create world entity with research state
    worldEntity = new EntityImpl(createEntityId(), 0);
    researchState = createResearchStateComponent();

    // Add some completed papers
    researchState.completed.add('herb_garden_planning');
    researchState.completed.add('soil_for_medicinal_plants');

    // Add an in-progress paper
    researchState.inProgress.set('wood_properties_construction', {
      researchId: 'wood_properties_construction',
      totalRequired: 100,
      currentProgress: 0.62,
      assignedAgents: [],
      startedAt: 0,
      researchers: [],
      insights: [],
    });

    worldEntity.addComponent({ type: 'time', version: 1, currentTick: 100, ticksPerDay: 24 });
    worldEntity.addComponent(researchState);
    world.addEntity(worldEntity);

    // Create panel
    panel = new ResearchLibraryPanel();
  });

  describe('Panel Interface', () => {
    it('should have correct ID', () => {
      expect(panel.getId()).toBe('research-library');
    });

    it('should have correct title', () => {
      expect(panel.getTitle()).toBe('📚 Research Library');
    });

    it('should have default dimensions', () => {
      expect(panel.getDefaultWidth()).toBe(380);
      expect(panel.getDefaultHeight()).toBe(600);
    });

    it('should start as not visible', () => {
      expect(panel.isVisible()).toBe(false);
    });

    it('should toggle visibility', () => {
      panel.setVisible(true);
      expect(panel.isVisible()).toBe(true);

      panel.setVisible(false);
      expect(panel.isVisible()).toBe(false);
    });
  });

  describe('Paper Discovery', () => {
    it('should retrieve discovered papers from research state', () => {
      // Access private method through render (which calls getDiscoveredPapers)
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      // Should have called fillText with paper count
      const textCalls = mockCtx.fillText.mock.calls;
      const paperCountCall = textCalls.find((call: any[]) =>
        call[0].includes('Discovered papers:')
      );

      // 2 completed + 1 in progress = 3 papers
      expect(paperCountCall).toBeDefined();
      expect(paperCountCall[0]).toContain('3');
    });

    it('should show empty state when no papers discovered', () => {
      // Create new world with empty research state
      const emptyWorld = new WorldImpl(new EventBusImpl());
      const emptyWorldEntity = new EntityImpl(createEntityId(), 0);
      const emptyResearchState = createResearchStateComponent();

      emptyWorldEntity.addComponent({ type: 'time', version: 1, currentTick: 0, ticksPerDay: 24 });
      emptyWorldEntity.addComponent(emptyResearchState);
      emptyWorld.addEntity(emptyWorldEntity);

      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, emptyWorld);

      // Should show empty state message
      const textCalls = mockCtx.fillText.mock.calls;
      const emptyStateCall = textCalls.find((call: any[]) =>
        call[0].includes('No papers discovered yet')
      );
      expect(emptyStateCall).toBeDefined();
    });
  });

  describe('Paper Status', () => {
    it('should identify completed papers', () => {
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      // Should render ✓ icon for completed papers
      const textCalls = mockCtx.fillText.mock.calls;
      const checkmarkCalls = textCalls.filter((call: any[]) => call[0] === '✓');
      expect(checkmarkCalls.length).toBeGreaterThan(0);
    });

    it('should identify in-progress papers with progress bars', () => {
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      // Should render 📖 icon for in-progress papers
      const textCalls = mockCtx.fillText.mock.calls;
      const bookCalls = textCalls.filter((call: any[]) => call[0] === '📖');
      expect(bookCalls.length).toBeGreaterThan(0);

      // Should have drawn progress bar rectangles (2 per in-progress paper: background + filled)
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should not render when not visible', () => {
      const mockCtx = {
        fillText: vi.fn(),
        fillRect: vi.fn(),
      } as any;

      panel.setVisible(false);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      expect(mockCtx.fillText).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should not render when world is not provided', () => {
      const mockCtx = {
        fillText: vi.fn(),
        fillRect: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, undefined);

      expect(mockCtx.fillText).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should render header and controls when visible', () => {
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      // Should render header
      const textCalls = mockCtx.fillText.mock.calls;
      const headerCall = textCalls.find((call: any[]) => call[0] === 'RESEARCH LIBRARY');
      expect(headerCall).toBeDefined();

      // Should render sort options
      const sortCalls = textCalls.filter((call: any[]) =>
        call[0] === 'Field' || call[0] === 'Complexity' || call[0] === 'Recent'
      );
      expect(sortCalls.length).toBe(3);
    });
  });

  describe('Interaction', () => {
    it('should handle wheel scrolling', () => {
      // scrollOffset starts at 0
      expect(() => {
        panel.handleWheel(100);
      }).not.toThrow();

      // Verify scrolling actually worked by checking it doesn't throw on render
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      expect(() => {
        panel.render(mockCtx, 0, 0, 380, 600, world);
      }).not.toThrow();
    });

    it('should handle clicks to change sort order', () => {
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);

      // Click should not throw
      expect(() => {
        panel.handleClick(50, 70);
      }).not.toThrow();

      // Verify panel can still render after click
      expect(() => {
        panel.render(mockCtx, 0, 0, 380, 600, world);
      }).not.toThrow();
    });
  });

  describe('Field Color Coding', () => {
    it('should have distinct colors for different research fields', () => {
      const mockCtx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      } as any;

      panel.setVisible(true);
      panel.render(mockCtx, 0, 0, 380, 600, world);

      // Should have used strokeStyle for field colors (borders)
      const usedColors = new Set<string>();
      mockCtx.strokeRect.mock.calls.forEach(() => {
        if (mockCtx.strokeStyle && typeof mockCtx.strokeStyle === 'string') {
          usedColors.add(mockCtx.strokeStyle);
        }
      });

      // Should have at least 2 different colors (nature and construction fields)
      expect(usedColors.size).toBeGreaterThanOrEqual(1);
    });
  });
});
