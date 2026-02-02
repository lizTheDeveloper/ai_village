import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SteeringSystem } from '../systems/SteeringSystem.js';
import type {
  World,
  SteeringComponent,
  PositionComponent,
  VelocityComponent,
  PhysicsComponent,
  BuildingComponent,
  Entity,
} from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

describe('SteeringSystem', () => {
  let system: SteeringSystem;
  let mockWorld: any;
  let mockEntity: any;
  let mockEventBus: any;

  beforeEach(() => {
    system = new SteeringSystem();

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
          executeEntities: vi.fn(() => []),
        })),
        executeEntities: vi.fn(() => []),
      })),
      getEntity: vi.fn(),
      getEntitiesInChunk: vi.fn(() => []),
      simulationScheduler: {
        updateAgentPositions: vi.fn(),
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
  });

  describe('Seek Behavior', () => {
    it('should move toward target position', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'seek',
        target: { x: 10, y: 0 },
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should update velocity toward target
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Velocity,
        expect.any(Function)
      );

      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should accelerate in positive X direction
        expect(updated.vx).toBeGreaterThan(0);
        expect(updated.vy).toBeCloseTo(0);
      }
    });

    it('should throw error when seek behavior has no target', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'seek',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      expect(() => {
        (system as any).onUpdate(ctx);
      }).toThrow(/Seek behavior requires target position/);
    });
  });

  describe('Arrive Behavior', () => {
    it('should slow down when approaching target', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 5, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'arrive',
        target: { x: 3, y: 0 }, // Within slowing radius (default 5.0)
        maxSpeed: 5,
        maxForce: 2,
        slowingRadius: 5.0,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply braking force
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should slow down (velocity should be less than before)
        expect(Math.abs(updated.vx)).toBeLessThan(Math.abs(velocity.vx));
      }
    });

    it('should stop within dead zone', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 1, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'arrive',
        target: { x: 0.3, y: 0 }, // Within deadZone (default 0.5)
        maxSpeed: 5,
        maxForce: 2,
        deadZone: 0.5,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply strong braking force
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should apply damping force (negative direction)
        expect(updated.vx).toBeLessThan(velocity.vx);
      }
    });

    it('should use stuck detection after no progress', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'arrive',
        target: { x: 10, y: 0 },
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Run multiple times to trigger stuck detection
      // Note: stuck detection uses Date.now() so we can't easily test timeout,
      // but we can verify the system doesn't crash
      for (let i = 0; i < 5; i++) {
        (system as any).onUpdate(ctx);
      }

      // Should still be applying steering force
      expect(mockEntity.updateComponent).toHaveBeenCalled();
    });

    it('should throw error when arrive behavior has no target', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'arrive',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      expect(() => {
        (system as any).onUpdate(ctx);
      }).toThrow(/Arrive behavior requires target position/);
    });
  });

  describe('Wander Behavior', () => {
    it('should initialize wander angle on first update', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 1, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'wander',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // wanderAngle should be set (we can't check the value directly but system should not crash)
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Velocity,
        expect.any(Function)
      );
    });

    it('should produce coherent movement with wanderAngle', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 1, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'wander',
        maxSpeed: 5,
        maxForce: 2,
        wanderAngle: Math.PI / 4, // 45 degrees
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should update velocity (actual direction depends on wander circle)
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Velocity,
        expect.any(Function)
      );
    });
  });

  describe('Obstacle Avoidance', () => {
    it('should steer around obstacles in path', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 5, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'obstacle_avoidance',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      // Mock obstacle in path
      const obstacleEntity = {
        id: 'obstacle-1',
        getComponent: vi.fn((type: string) => {
          if (type === CT.Position) return { x: 2, y: 0 }; // Directly ahead
          if (type === CT.Physics) return { solid: true, width: 1, height: 1 };
          return undefined;
        }),
      };

      mockWorld.entities.set('obstacle-1', obstacleEntity);
      mockWorld.getEntitiesInChunk = vi.fn(() => ['obstacle-1']);

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply steering force to avoid obstacle
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should steer perpendicular (Y direction should be non-zero)
        expect(Math.abs(updated.vy)).toBeGreaterThan(0);
      }
    });

    it('should not steer when no obstacles detected', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 5, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'obstacle_avoidance',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockWorld.getEntitiesInChunk = vi.fn(() => []);

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply minimal/no force (velocity mostly unchanged)
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Without obstacles, velocity should be similar
        expect(updated.vx).toBeCloseTo(velocity.vx, 0);
      }
    });
  });

  describe('Combined Behaviors', () => {
    it('should blend multiple behaviors with weights', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'combined',
        maxSpeed: 5,
        maxForce: 2,
        behaviors: [
          { type: 'seek', target: { x: 10, y: 0 }, weight: 1.0 },
          { type: 'wander', weight: 0.5 },
        ],
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply combined force
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Velocity,
        expect.any(Function)
      );

      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should have some velocity (combined behaviors)
        const speed = Math.sqrt(updated.vx * updated.vx + updated.vy * updated.vy);
        expect(speed).toBeGreaterThan(0);
      }
    });

    it('should return zero force when no behaviors provided', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 5, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'combined',
        maxSpeed: 5,
        maxForce: 2,
        behaviors: [],
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply minimal force (velocity should stay similar)
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        expect(updated.vx).toBeCloseTo(velocity.vx, 0);
      }
    });
  });

  describe('Containment Bounds', () => {
    it('should apply force when near edge of containment bounds', () => {
      const position: PositionComponent = { x: 1, y: 5, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: -1, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'seek',
        target: { x: 5, y: 5 },
        maxSpeed: 5,
        maxForce: 2,
        containmentBounds: {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        },
        containmentMargin: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should apply containment force (pushing away from left edge)
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should push right (positive X)
        expect(updated.vx).toBeGreaterThan(velocity.vx);
      }
    });

    it('should seek center when outside bounds', () => {
      const position: PositionComponent = { x: -5, y: 5, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'wander',
        maxSpeed: 5,
        maxForce: 2,
        containmentBounds: {
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        },
        containmentMargin: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should seek toward center (5, 5)
      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        // Should move toward positive X (toward center)
        expect(updated.vx).toBeGreaterThan(0);
      }
    });
  });

  describe('Invalid Behaviors', () => {
    it('should throw error for invalid behavior type', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 0, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'invalid_behavior' as any,
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      expect(() => {
        (system as any).onUpdate(ctx);
      }).toThrow(/Invalid steering behavior/);
    });

    it('should do nothing for none behavior', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 5, vy: 0 };
      const steering: SteeringComponent = {
        behavior: 'none',
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      // Should not update velocity (no steering applied)
      const velocityCalls = mockEntity.updateComponent.mock.calls.filter(
        (call: any) => call[0] === CT.Velocity
      );
      expect(velocityCalls).toHaveLength(0);
    });

    it('should throw error when required component is missing', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const steering: SteeringComponent = {
        behavior: 'seek',
        target: { x: 10, y: 0 },
        maxSpeed: 5,
        maxForce: 2,
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Steering) return steering;
        // Missing Velocity component
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      expect(() => {
        (system as any).onUpdate(ctx);
      }).toThrow(/Velocity component missing/);
    });
  });

  describe('Speed Limiting', () => {
    it('should limit velocity to maxSpeed', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const velocity: VelocityComponent = { vx: 8, vy: 8 }; // Speed > maxSpeed
      const steering: SteeringComponent = {
        behavior: 'seek',
        target: { x: 100, y: 100 },
        maxSpeed: 5,
        maxForce: 10, // High force to test limiting
      } as SteeringComponent;

      mockEntity.hasComponent.mockReturnValue(true);
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
        if (type === CT.Velocity) return velocity;
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

      const velocityUpdater = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Velocity
      )?.[1];
      if (velocityUpdater) {
        const updated = velocityUpdater(velocity);
        const speed = Math.sqrt(updated.vx * updated.vx + updated.vy * updated.vy);
        // Speed should be clamped to maxSpeed
        expect(speed).toBeLessThanOrEqual(steering.maxSpeed + 0.01); // Small tolerance for floating point
      }
    });
  });
});
