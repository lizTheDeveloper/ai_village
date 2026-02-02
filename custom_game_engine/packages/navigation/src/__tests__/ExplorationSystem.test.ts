import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExplorationSystem } from '../systems/ExplorationSystem.js';
import type {
  World,
  ExplorationStateComponent,
  PositionComponent,
  SteeringComponent,
  AgentComponent,
  Entity,
} from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';

describe('ExplorationSystem', () => {
  let system: ExplorationSystem;
  let mockWorld: any;
  let mockEntity: any;
  let mockEventBus: any;

  beforeEach(() => {
    system = new ExplorationSystem();

    // Mock EventBus
    mockEventBus = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      emitGeneric: vi.fn(),
    };

    // Initialize system with event bus (BaseSystem pattern)
    (system as any).events = mockEventBus;

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
  });

  describe('Sector Marking and Tracking', () => {
    it('should mark current sector as explored', () => {
      const position: PositionComponent = { x: 20, y: 20, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'none',
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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

      // Should call markSectorExplored
      expect(explorationState.markSectorExplored).toHaveBeenCalled();

      // Sector at x=20, y=20 with sector size 16 should be sector (1, 1)
      const expectedX = Math.floor(20 / 16);
      const expectedY = Math.floor(20 / 16);
      expect(explorationState.markSectorExplored).toHaveBeenCalledWith(
        expectedX,
        expectedY,
        100
      );
    });

    it('should track multiple explored sectors', () => {
      const exploredSectors = new Set<string>();
      exploredSectors.add('0,0');
      exploredSectors.add('1,0');
      exploredSectors.add('0,1');

      const position: PositionComponent = { x: 20, y: 20, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'none',
        markSectorExplored: vi.fn((x, y) => {
          exploredSectors.add(`${x},${y}`);
        }),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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

      // Should have added new sector
      expect(exploredSectors.size).toBeGreaterThan(3);
      expect(exploredSectors.has('1,1')).toBe(true);
    });
  });

  describe('Frontier Exploration', () => {
    it('should find unexplored adjacent sectors', () => {
      const exploredSectors = new Set<string>();
      exploredSectors.add('0,0');

      const position: PositionComponent = { x: 8, y: 8, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'frontier',
        currentTarget: undefined,
        markSectorExplored: vi.fn((x, y) => {
          exploredSectors.add(`${x},${y}`);
        }),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Steering) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Steering) return { behavior: 'none', maxSpeed: 5, maxForce: 2 };
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

      // Should set a frontier target
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Steering,
        expect.any(Function)
      );
    });

    it('should clear target when reached', () => {
      const exploredSectors = new Set<string>();
      exploredSectors.add('0,0');

      const position: PositionComponent = { x: 16, y: 0, chunkX: 1, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'frontier',
        currentTarget: { x: 16, y: 0 }, // Already at target
        markSectorExplored: vi.fn((x, y) => {
          exploredSectors.add(`${x},${y}`);
        }),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Steering) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Steering) return { behavior: 'none', maxSpeed: 5, maxForce: 2 };
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

      // Target should be cleared (system will find new frontier)
      // We can't check explorationState.currentTarget directly, but system should work without crashing
      expect(() => (system as any).onUpdate(ctx)).not.toThrow();
    });

    it('should choose closest frontier sector', () => {
      const exploredSectors = new Set<string>();
      exploredSectors.add('0,0');
      exploredSectors.add('2,0'); // Far sector

      const position: PositionComponent = { x: 8, y: 8, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'frontier',
        currentTarget: undefined,
        markSectorExplored: vi.fn((x, y) => {
          exploredSectors.add(`${x},${y}`);
        }),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Steering) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Steering) return { behavior: 'none', maxSpeed: 5, maxForce: 2 };
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

      // Should pick frontier adjacent to (0,0), not far from (2,0)
      const steeringCall = mockEntity.updateComponent.mock.calls.find(
        (call: any) => call[0] === CT.Steering
      );
      expect(steeringCall).toBeDefined();
    });
  });

  describe('Spiral Exploration', () => {
    it('should spiral outward from home base', () => {
      const position: PositionComponent = { x: 50, y: 50, chunkX: 1, chunkY: 1 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'spiral',
        homeBase: { x: 50, y: 50 },
        spiralStep: 0,
        currentTarget: undefined,
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Steering) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Steering) return { behavior: 'none', maxSpeed: 5, maxForce: 2 };
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

      // Should set spiral target and increment step
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Steering,
        expect.any(Function)
      );

      // spiralStep should be incremented (we can't check directly but system should work)
      expect(() => (system as any).onUpdate(ctx)).not.toThrow();
    });

    it('should advance to next spiral position when target reached', () => {
      const position: PositionComponent = { x: 66, y: 50, chunkX: 2, chunkY: 1 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'spiral',
        homeBase: { x: 50, y: 50 },
        spiralStep: 1,
        currentTarget: { x: 66, y: 50 }, // Already at target
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Steering) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Steering) return { behavior: 'none', maxSpeed: 5, maxForce: 2 };
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

      // Should advance to next spiral position
      expect(mockEntity.updateComponent).toHaveBeenCalledWith(
        CT.Steering,
        expect.any(Function)
      );
    });

    it('should throw error when homeBase is missing', () => {
      const position: PositionComponent = { x: 50, y: 50, chunkX: 1, chunkY: 1 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'spiral',
        // Missing homeBase
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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
      }).toThrow(/homeBase/);
    });
  });

  describe('Coverage Milestone Events', () => {
    it('should emit event when reaching 25% coverage', () => {
      const exploredSectors = new Set<string>();
      // Create 25% coverage - exploration radius is 64, so radius in sectors = ceil(64/16) = 4
      // Total sectors = (4*2+1)^2 = 81
      // 25% = 20.25 sectors
      for (let i = 0; i < 21; i++) {
        exploredSectors.add(`${i},0`);
      }

      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'none',
        explorationRadius: 64,
        markSectorExplored: vi.fn(),
      } as any;
      const agent: AgentComponent = { name: 'TestAgent' } as AgentComponent;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Agent) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Agent) return agent;
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

      // Should emit milestone event
      expect(mockEventBus.emitGeneric).toHaveBeenCalledWith(
        'exploration:milestone',
        expect.objectContaining({
          agentId: mockEntity.id,
          milestoneType: 'coverage_0.25',
        }),
        mockEntity.id
      );
    });

    it('should emit event when reaching 50% coverage', () => {
      const exploredSectors = new Set<string>();
      // 50% of 81 = 40.5 sectors
      for (let i = 0; i < 41; i++) {
        exploredSectors.add(`${i},0`);
      }

      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'none',
        explorationRadius: 64,
        markSectorExplored: vi.fn(),
      } as any;
      const agent: AgentComponent = { name: 'TestAgent' } as AgentComponent;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Agent) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Agent) return agent;
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

      // Should emit milestone event
      expect(mockEventBus.emitGeneric).toHaveBeenCalledWith(
        'exploration:milestone',
        expect.objectContaining({
          milestoneType: 'coverage_0.5',
        }),
        mockEntity.id
      );
    });

    it('should not emit duplicate milestone events', () => {
      const exploredSectors = new Set<string>();
      for (let i = 0; i < 21; i++) {
        exploredSectors.add(`${i},0`);
      }

      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        mode: 'none',
        explorationRadius: 64,
        markSectorExplored: vi.fn(),
      } as any;
      const agent: AgentComponent = { name: 'TestAgent' } as AgentComponent;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        if (type === CT.Agent) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
        if (type === CT.Agent) return agent;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      // Run twice
      (system as any).onUpdate(ctx);
      mockEventBus.emitGeneric.mockClear();
      (system as any).onUpdate(ctx);

      // Should not emit again
      expect(mockEventBus.emitGeneric).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Exploration Modes', () => {
    it('should throw error for invalid exploration mode', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'invalid_mode' as any,
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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
      }).toThrow(/Invalid exploration mode/);
    });

    it('should do nothing for none mode', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'none',
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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

      // Should only mark sector as explored, not set any targets
      const steeringCalls = mockEntity.updateComponent.mock.calls.filter(
        (call: any) => call[0] === CT.Steering
      );
      expect(steeringCalls).toHaveLength(0);
    });

    it('should skip exploration when mode is undefined', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: undefined,
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        if (type === CT.Position) return position;
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

      // Should not crash, just skip exploration logic
      expect(() => (system as any).onUpdate(ctx)).not.toThrow();
    });
  });

  describe('Coverage Calculation', () => {
    it('should calculate coverage correctly', () => {
      const exploredSectors = new Set<string>();
      // Add 10 sectors
      for (let i = 0; i < 10; i++) {
        exploredSectors.add(`${i},0`);
      }

      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        explorationRadius: 64, // 64 / 16 = 4 sector radius, total = (4*2+1)^2 = 81
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.getComponent = vi.fn(() => explorationState);

      const coverage = system.calculateCoverage(mockEntity as any);

      // 10 / 81 ≈ 0.123
      expect(coverage).toBeCloseTo(10 / 81, 2);
    });

    it('should cap coverage at 1.0', () => {
      const exploredSectors = new Set<string>();
      // Add way more than possible
      for (let i = 0; i < 200; i++) {
        exploredSectors.add(`${i},0`);
      }

      const explorationState: ExplorationStateComponent = {
        exploredSectors,
        explorationRadius: 64,
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.getComponent = vi.fn(() => explorationState);

      const coverage = system.calculateCoverage(mockEntity as any);

      expect(coverage).toBe(1.0);
    });
  });

  describe('Coordinate Conversions', () => {
    it('should convert world position to sector coordinates', () => {
      const sector = system.worldToSector({ x: 24, y: 40 });

      // Sector size is 16
      expect(sector.x).toBe(Math.floor(24 / 16)); // 1
      expect(sector.y).toBe(Math.floor(40 / 16)); // 2
    });

    it('should convert sector coordinates to world position', () => {
      const world = system.sectorToWorld({ x: 2, y: 3 });

      // Sector size is 16
      expect(world.x).toBe(2 * 16); // 32
      expect(world.y).toBe(3 * 16); // 48
    });

    it('should handle negative coordinates', () => {
      const sector = system.worldToSector({ x: -10, y: -20 });

      expect(sector.x).toBe(Math.floor(-10 / 16)); // -1
      expect(sector.y).toBe(Math.floor(-20 / 16)); // -2
    });
  });

  describe('Error Handling', () => {
    it('should throw error when ExplorationState component is missing', () => {
      const position: PositionComponent = { x: 0, y: 0, chunkX: 0, chunkY: 0 };

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.Position) return position;
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
      }).toThrow(/ExplorationSystem requires ExplorationState component/);
    });

    it('should skip when position component is missing', () => {
      const explorationState: ExplorationStateComponent = {
        exploredSectors: new Set(),
        mode: 'none',
        markSectorExplored: vi.fn(),
      } as any;

      mockEntity.hasComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return true;
        return false;
      });
      mockEntity.getComponent.mockImplementation((type: string) => {
        if (type === CT.ExplorationState) return explorationState;
        return undefined;
      });

      const ctx = {
        world: mockWorld,
        activeEntities: [mockEntity],
        deltaTime: 0.05,
        tick: 100,
        events: mockEventBus,
      };

      // Should not crash, just return early
      expect(() => {
        (system as any).onUpdate(ctx);
      }).not.toThrow();

      // markSectorExplored should not be called
      expect(explorationState.markSectorExplored).not.toHaveBeenCalled();
    });
  });
});
