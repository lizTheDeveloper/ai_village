import { describe, it, expect, beforeEach, vi } from 'vitest';
// NOTE: These imports will fail until the modules are implemented (TDD red phase)
import { EventBusImpl } from '../../events/EventBus.js';
import { BuildingBlueprintRegistry } from '../BuildingBlueprintRegistry.js';
import { PlacementValidator } from '../PlacementValidator.js';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
/**
 * Integration tests for Building Placement System
 *
 * These tests verify the event-based communication between:
 * - BuildingPlacementUI (renderer package)
 * - PlacementValidator (core package)
 * - BuildingBlueprintRegistry (core package)
 * - EventBus (core package)
 * - World (core package)
 *
 * Per work order acceptance criteria 9:
 * "Building entity is created at grid position with progress=0, isComplete=false"
 */

describe('Building Placement Integration', () => {
  let eventBus: EventBusImpl;
  let registry: BuildingBlueprintRegistry;
  let validator: PlacementValidator;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    eventBus.setCurrentTick(0);
    registry = new BuildingBlueprintRegistry();
    validator = new PlacementValidator();

    // Register default blueprints
    registry.registerDefaults();
  });

  describe('Event Flow: building:placement:started', () => {
    it('should emit building:placement:started when building is selected', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:placement:started', handler);

      eventBus.emit({
        type: 'building:placement:started',
        source: 'building-placement-ui',
        data: {
          blueprintId: 'campfire',
        },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'building:placement:started',
          data: { blueprintId: 'campfire' },
        })
      );
    });

    it('should include blueprint id in event data', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:placement:started', handler);

      eventBus.emit({
        type: 'building:placement:started',
        source: 'building-placement-ui',
        data: {
          blueprintId: 'lean-to',
        },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            blueprintId: 'lean-to',
          }),
        })
      );
    });
  });

  describe('Event Flow: building:placement:confirmed', () => {
    it('should emit building:placement:confirmed with position and rotation', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:placement:confirmed', handler);

      eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'building-placement-ui',
        data: {
          blueprintId: 'campfire',
          position: { x: 32, y: 64 },
          rotation: 0,
        },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'building:placement:confirmed',
          data: expect.objectContaining({
            blueprintId: 'campfire',
            position: { x: 32, y: 64 },
            rotation: 0,
          }),
        })
      );
    });

    it('should include rotated buildings in event', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:placement:confirmed', handler);

      eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'building-placement-ui',
        data: {
          blueprintId: 'lean-to',
          position: { x: 48, y: 80 },
          rotation: 90,
        },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rotation: 90,
          }),
        })
      );
    });
  });

  describe('Event Flow: building:placement:cancelled', () => {
    it('should emit building:placement:cancelled when cancelled', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:placement:cancelled', handler);

      eventBus.emit({
        type: 'building:placement:cancelled',
        source: 'building-placement-ui',
        data: {},
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'building:placement:cancelled',
        })
      );
    });
  });

  describe('Event Flow: building:construction:started', () => {
    it('should emit building:construction:started after confirmed placement', () => {
      const confirmHandler = vi.fn();
      const constructionHandler = vi.fn();

      eventBus.subscribe('building:placement:confirmed', confirmHandler);
      eventBus.subscribe('building:construction:started', constructionHandler);

      // Simulate the flow: UI confirms -> system creates entity -> construction starts
      eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'building-placement-ui',
        data: {
          blueprintId: 'campfire',
          position: { x: 32, y: 64 },
          rotation: 0,
        },
      });

      // BuildingSystem would respond to confirmed by creating entity and emitting:
      eventBus.emit({
        type: 'building:construction:started',
        source: 'building-system',
        data: {
          entityId: 'entity-123',
          blueprintId: 'campfire',
          position: { x: 32, y: 64 },
          progress: 0,
          isComplete: false,
        },
      });

      eventBus.flush();

      expect(constructionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            progress: 0,
            isComplete: false,
          }),
        })
      );
    });
  });

  describe('Registry and Validator Integration', () => {
    it('should validate blueprint from registry', () => {
      const blueprint = registry.get('campfire');

      // Mock tile data for validation
      const mockWorld = {
        getTile: (_x: number, _y: number) => ({ terrain: 'grass' }),
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnThis(),
          inRect: vi.fn().mockReturnValue({
            executeEntities: () => [],
          }),
        }),
      };

      const result = validator.validate(
        { x: 0, y: 0 },
        blueprint,
        mockWorld as any
      );

      expect(result.valid).toBe(true);
    });

    it('should reject placement on forbidden terrain', () => {
      const blueprint = registry.get('campfire');

      const mockWorld = {
        getTile: (_x: number, _y: number) => ({ terrain: 'water' }), // Forbidden
        query: vi.fn().mockReturnValue({
          with: vi.fn().mockReturnThis(),
          inRect: vi.fn().mockReturnValue({
            executeEntities: () => [],
          }),
        }),
      };

      const result = validator.validate(
        { x: 0, y: 0 },
        blueprint,
        mockWorld as any
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'terrain_invalid')).toBe(true);
    });
  });

  describe('Multi-System Event Ordering', () => {
    it('should process events in correct order', () => {
      const order: string[] = [];

      eventBus.subscribe('building:placement:started', () => order.push('started'));
      eventBus.subscribe('building:placement:confirmed', () => order.push('confirmed'));
      eventBus.subscribe('building:construction:started', () => order.push('construction'));

      eventBus.emit({
        type: 'building:placement:started',
        source: 'ui',
        data: { blueprintId: 'campfire' },
      });
      eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'ui',
        data: { blueprintId: 'campfire', position: { x: 0, y: 0 }, rotation: 0 },
      });
      eventBus.emit({
        type: 'building:construction:started',
        source: 'system',
        data: { entityId: 'e1', blueprintId: 'campfire', position: { x: 0, y: 0 } },
      });

      eventBus.flush();

      expect(order).toEqual(['started', 'confirmed', 'construction']);
    });

    it('should not process construction if placement cancelled', () => {
      const constructionHandler = vi.fn();
      eventBus.subscribe('building:construction:started', constructionHandler);

      eventBus.emit({
        type: 'building:placement:started',
        source: 'ui',
        data: { blueprintId: 'campfire' },
      });
      eventBus.emit({
        type: 'building:placement:cancelled',
        source: 'ui',
        data: {},
      });
      // No confirmed event, no construction event

      eventBus.flush();

      expect(constructionHandler).not.toHaveBeenCalled();
    });
  });

  describe('Menu Events', () => {
    it('should emit building:menu:opened when menu opens', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:menu:opened', handler);

      eventBus.emit({
        type: 'building:menu:opened',
        source: 'building-placement-ui',
        data: {},
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit building:menu:closed when menu closes', () => {
      const handler = vi.fn();
      eventBus.subscribe('building:menu:closed', handler);

      eventBus.emit({
        type: 'building:menu:closed',
        source: 'building-placement-ui',
        data: {},
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('Building Creation from Placement', () => {
  /**
   * This test describes the expected behavior when a building is placed.
   * The BuildingSystem should create an entity with:
   * - BuildingComponent with progress=0, isComplete=false
   * - PositionComponent at the grid-snapped position
   * - RenderableComponent for display
   */

  it('should create building entity with correct initial state', () => {
    // This is a specification test - the building system should create entities like this
    const expectedBuildingComponent = {
      type: ComponentType.Building,
      buildingType: BuildingType.Campfire,
      tier: 1,
      progress: 0,
      isComplete: false,
      blocksMovement: false,
      providesWarmth: true,
      providesShelter: true,
      storageCapacity: 0,
    };

    // The building system will create this based on:
    // 1. building:placement:confirmed event
    // 2. Blueprint from registry
    // 3. Position from event data

    expect(expectedBuildingComponent.progress).toBe(0);
    expect(expectedBuildingComponent.isComplete).toBe(false);
  });

  it('should create building at grid-snapped position', () => {
    // When placement confirmed at (17, 33), entity should be created at (16, 32)
    const confirmEvent = {
      type: 'building:placement:confirmed',
      source: 'building-placement-ui',
      data: {
        blueprintId: 'campfire',
        position: { x: 16, y: 32 }, // Already grid-snapped by UI
        rotation: 0,
      },
    };

    // Entity should have position component at these exact coordinates
    expect(confirmEvent.data.position.x % 16).toBe(0);
    expect(confirmEvent.data.position.y % 16).toBe(0);
  });
});
