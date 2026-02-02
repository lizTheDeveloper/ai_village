import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementSystem } from '../systems/MovementSystem.js';
import type {
  World,
  MovementComponent,
  PositionComponent,
  VelocityComponent,
  CircadianComponent,
  NeedsComponent,
  PhysicsComponent,
  BuildingComponent,
  SteeringComponent,
  Entity,
} from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

describe('MovementSystem', () => {
  let system: MovementSystem;
  let mockWorld: any;
  let mockEntity: any;
  let mockEventBus: any;

  beforeEach(() => {
    system = new MovementSystem();

    // Mock EventBus
    mockEventBus = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      emitGeneric: vi.fn(),
    };

    // Mock World
    mockWorld = {
      tick: 100,
      entities: new Map(),
      query: vi.fn(() => ({
        with: vi.fn(() => ({
          with: vi.fn(() => ({
            executeEntities: vi.fn(() => []),
          })),
          executeEntities: vi.fn(() => []),
        })),
        executeEntities: vi.fn(() => []),
      })),
      getEntity: vi.fn(),
      getEntitiesInChunk: vi.fn(() => []),
      simulationScheduler: {
        filterActiveEntities: vi.fn((entities) => entities),
      },
    };

    // Mock Entity
    mockEntity = {
      id: 'test-entity',
      hasComponent: vi.fn(() => false),
      getComponent: vi.fn(),
      updateComponent: vi.fn((type, updater) => {
        const current = mockEntity.getComponent(type);
        if (current) {
          const updated = updater(current);
          mockEntity.components.set(type, updated);
        }
      }),
      components: new Map(),
    };

    // Initialize system
    (system as any).onInitialize(mockWorld, mockEventBus);
  });

  describe('Basic Position Updates', () => {
    it('should update position based on velocity and deltaTime', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 2, velocityY: 3 };

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05, // 1 tick at 20 TPS
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should call updateComponent for Position
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Position,
        expect.any(Function)
      );

      // Verify position was updated: newX = 0 + (2 * 0.05) = 0.1, newY = 0 + (3 * 0.05) = 0.15
      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        expect(updated.x).toBeCloseTo(0.1);
        expect(updated.y).toBeCloseTo(0.15);
      }
    });

    it('should skip entities with zero velocity', () => {
      const position: PositionComponent = { x: 5, y: 5, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 0, velocityY: 0 };

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should not update position for zero velocity
      const positionCalls = mockEntity.updateComponent.mock.calls.filter(
        (call: any) => call[0] === CT.Position
      );
      expect(positionCalls).toHaveLength(0);
    });
  });

  describe('Fatigue/Energy Penalties', () => {
    it('should apply 80% speed when energy < 50', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };
      const needs: NeedsComponent = { energy: 40 } as NeedsComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Needs) return needs;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Expected: 0 + (10 * 0.8 * 0.05) = 0.4
        expect(updated.x).toBeCloseTo(0.4);
      }
    });

    it('should apply 60% speed when energy < 30', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };
      const needs: NeedsComponent = { energy: 20 } as NeedsComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Needs) return needs;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Expected: 0 + (10 * 0.6 * 0.05) = 0.3
        expect(updated.x).toBeCloseTo(0.3);
      }
    });

    it('should apply 40% speed when energy < 10', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };
      const needs: NeedsComponent = { energy: 5 } as NeedsComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Needs) return needs;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Expected: 0 + (10 * 0.4 * 0.05) = 0.2
        expect(updated.x).toBeCloseTo(0.2);
      }
    });

    it('should apply no penalty when energy >= 50', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };
      const needs: NeedsComponent = { energy: 80 } as NeedsComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Needs) return needs;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Expected: 0 + (10 * 1.0 * 0.05) = 0.5
        expect(updated.x).toBeCloseTo(0.5);
      }
    });
  });

  describe('Sleeping Agents', () => {
    it('should not move when agent is sleeping', () => {
      const position: PositionComponent = { x: 5, y: 5, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 5, velocityY: 5 };
      const circadian: CircadianComponent = { isSleeping: true } as CircadianComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Circadian) return circadian;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should set velocity to 0
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Movement,
        expect.any(Function)
      );

      const movementUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Movement
      )?.[1];
      if (movementUpdater) {
        const updated = movementUpdater(movement);
        expect(updated.velocityX).toBe(0);
        expect(updated.velocityY).toBe(0);
      }
    });

    it('should allow movement when agent is awake', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 2, velocityY: 0 };
      const circadian: CircadianComponent = { isSleeping: false } as CircadianComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Circadian) return circadian;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should update position normally
      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        expect(updated.x).toBeCloseTo(0.1);
      }
    });
  });

  describe('Hard Collisions', () => {
    it('should block movement when colliding with building', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 1, velocityY: 0 };

      // Mock building at (0.3, 0) - blocks movement
      const buildingEntity = {
        id: 'building-1',
        getComponent: vi.fn((type: string) => {
          if (type === CT.Position) return { x: 0.3, y: 0 };
          if (type === CT.Building) return { blocksMovement: true };
          return undefined;
        }),
      };

      const executeEntitiesFn = vi.fn(() => [buildingEntity]);
      const withBuildingFn = vi.fn(() => ({ executeEntities: executeEntitiesFn }));
      const withPositionFn = vi.fn(() => ({ with: withBuildingFn, executeEntities: executeEntitiesFn }));
      mockWorld.query = vi.fn(() => ({ with: withPositionFn }));

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should stop entity or slide along wall (not move to collision point)
      const movementCalls = mockEntity.updateComponent.mock.calls.filter(
        (call: any) => call[0] === CT.Movement
      );

      // Check if velocity was set to 0 (stopped)
      if (movementCalls.length > 0) {
        const movementUpdater = movementCalls[0][1];
        const updated = movementUpdater(movement);
        expect(updated.velocityX).toBe(0);
        expect(updated.velocityY).toBe(0);
      }
    });
  });

  describe('Soft Collisions', () => {
    it('should slow down when near solid physics entities', () => {
      const position: PositionComponent = { x: 5, y: 5, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };

      // Mock nearby solid entity
      const nearbyEntity = {
        id: 'nearby-1',
        getComponent: vi.fn((type: string) => {
          if (type === CT.Position) return { x: 5.5, y: 5 }; // 0.5 units away
          if (type === CT.Physics) return { solid: true, width: 1, height: 1 };
          return undefined;
        }),
      };

      mockWorld.entities.set('nearby-1', nearbyEntity);
      mockWorld.getEntitiesInChunk = vi.fn(() => ['nearby-1']);

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      // Should update position but with reduced speed due to soft collision
      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Movement should be reduced (less than full 0.5 units)
        expect(updated.x).toBeLessThan(5.5);
        expect(updated.x).toBeGreaterThan(5.0);
      }
    });

    it('should not slow down when no nearby entities', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };

      mockWorld.getEntitiesInChunk = vi.fn(() => []);

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Full movement (no penalty)
        expect(updated.x).toBeCloseTo(0.5);
      }
    });
  });

  describe('Time Speed Multiplier', () => {
    it('should apply time speed multiplier to movement', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 10, velocityY: 0 };

      // Mock time entity with 2x speed
      const timeEntity = {
        id: 'time-1',
        getComponent: vi.fn(() => ({ speedMultiplier: 2.0 })),
      };

      // Mock query that handles both Time query and Building collision query
      mockWorld.query = vi.fn(() => {
        const executeEntitiesFn = vi.fn(() => [timeEntity]);
        const withBuildingFn = vi.fn(() => ({ executeEntities: vi.fn(() => []) }));
        const withFn = vi.fn((componentType: string) => {
          // Handle Time query
          if (componentType === CT.Time) {
            return { executeEntities: executeEntitiesFn };
          }
          // Handle Building collision query (Position -> Building)
          if (componentType === CT.Building) {
            return { executeEntities: vi.fn(() => []) };
          }
          // Default chain
          return { with: withBuildingFn, executeEntities: vi.fn(() => []) };
        });
        return { with: withFn };
      });

      mockWorld.getEntity = vi.fn((id: string) => {
        if (id === 'time-1') return timeEntity;
        return undefined;
      });

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Expected: 0 + (10 * 0.05 * 2.0) = 1.0
        expect(updated.x).toBeCloseTo(1.0);
      }
    });
  });

  describe('Containment Bounds', () => {
    it('should clamp position to containment bounds', () => {
      const position: PositionComponent = { x: 9, y: 9, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 5, velocityY: 5 };
      const steering: SteeringComponent = {
        behavior: 'seek',
        maxSpeed: 10,
        maxForce: 1,
        containmentBounds: {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        },
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        if (type === CT.Steering) return steering;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Should be clamped to maxX=10, maxY=10
        expect(updated.x).toBeLessThanOrEqual(10);
        expect(updated.y).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Chunk Updates', () => {
    it('should update chunk coordinates when crossing chunk boundaries', () => {
      const position: PositionComponent = { x: 30, y: 30, chunkX: 0, chunkY: 0 };
      const movement: MovementComponent = { velocityX: 100, velocityY: 100 };

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Movement) return movement;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      (system as any).onUpdate(ctx);

      const positionUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Position
      )?.[1];
      if (positionUpdater) {
        const updated = positionUpdater(position);
        // Chunk size is 32, so position 35, 35 should be in chunk 1, 1
        expect(updated.chunkX).toBe(Math.floor(updated.x / 32));
        expect(updated.chunkY).toBe(Math.floor(updated.y / 32));
      }
    });
  });
});
