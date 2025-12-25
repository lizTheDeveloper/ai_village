import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';

/**
 * ExplorationSystem manages frontier and spiral exploration algorithms
 * Updates ExplorationState and sets steering targets for agents
 */
export class ExplorationSystem implements System {
  public readonly id: SystemId = 'exploration';
  public readonly priority: number = 25; // After AISystem, before Steering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus?: EventBus;
  private lastCoverageMilestone: Map<string, number> = new Map();

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get entities with ExplorationState
    const explorers = entities.filter(e => e.components.has('ExplorationState'));

    for (const entity of explorers) {
      try {
        this._updateExploration(entity, world, deltaTime);
      } catch (error) {
        // Per CLAUDE.md, re-throw with context
        throw new Error(`ExplorationSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateExploration(entity: Entity, _world: World, currentTick: number): void {
    const impl = entity as EntityImpl;
    if (!impl.hasComponent('ExplorationState')) {
      throw new Error('ExplorationSystem requires ExplorationState component');
    }

    if (!impl.hasComponent('Position')) {
      // Position needed for exploration
      return;
    }

    const explorationState = impl.getComponent('ExplorationState') as any;
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const position = impl.getComponent('Position') as any as { x: number; y: number };
    if (!position) {
      throw new Error('Position component missing');
    }

    // Mark current sector as explored
    const currentSector = this.worldToSector(position);
    impl.updateComponent('ExplorationState', (state: any) => {
      const key = `${currentSector.x},${currentSector.y}`;
      if (!state.exploredSectors) {
        state.exploredSectors = new Set();
      }
      if (!state.sectorExplorationTimes) {
        state.sectorExplorationTimes = new Map();
      }

      state.exploredSectors.add(key);
      state.sectorExplorationTimes.set(key, currentTick);
      return state;
    });

    // Update exploration radius based on settlement size - removed getGlobalState (doesn't exist)
    // This can be added later if needed via a proper global state system

    // Check for coverage milestones
    this._checkCoverageMilestones(entity, _world);

    // Execute exploration mode - validate if present
    const mode = explorationState.mode;

    // If mode is explicitly set, validate it (no fallbacks per CLAUDE.md)
    if (mode !== undefined && mode !== null) {
      const validModes = ['frontier', 'spiral', 'none'];
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid exploration mode: "${mode}". Must be one of: ${validModes.join(', ')}`);
      }

      if (mode === 'frontier') {
        this._frontierExploration(entity, currentTick);
      } else if (mode === 'spiral') {
        this._spiralExploration(entity, currentTick);
      }
      // mode === 'none' does nothing
    }
    // If mode not set, skip exploration (entity just tracks sectors)
  }

  /**
   * Frontier exploration - explore edges of known territory
   */
  private _frontierExploration(entity: Entity, _currentTick: number): void {
    const impl = entity as EntityImpl;
    const explorationState = impl.getComponent('ExplorationState') as any;
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const position = impl.getComponent('Position') as any as { x: number; y: number };
    if (!position) {
      throw new Error('Position component missing');
    }

    // Check if current target reached
    const currentTarget = explorationState.currentTarget;
    if (currentTarget) {
      const distance = this._distance(position, currentTarget);
      if (distance < 5) {
        // Target reached, clear it
        impl.updateComponent('ExplorationState', (state: any) => ({
          ...state,
          currentTarget: undefined,
        }));
      }
    }

    // If no target, find new frontier sector
    if (!currentTarget) {
      const frontier = this._identifyFrontier(explorationState);

      if (frontier.length > 0) {
        // Find closest frontier sector
        const closest = frontier.reduce((prev, curr) => {
          const prevWorld = this.sectorToWorld(prev);
          const currWorld = this.sectorToWorld(curr);
          const prevDist = this._distance(position, prevWorld);
          const currDist = this._distance(position, currWorld);
          return currDist < prevDist ? curr : prev;
        });

        // Set as target
        const targetWorld = this.sectorToWorld(closest);
        impl.updateComponent('ExplorationState', (state: any) => ({
          ...state,
          currentTarget: targetWorld,
          frontierSectors: frontier,
        }));

        // Update steering if component exists
        if (impl.hasComponent('Steering')) {
          impl.updateComponent('Steering', (state: any) => ({
            ...state,
            behavior: 'arrive',
            target: targetWorld,
          }));
        }
      }
    }
  }

  /**
   * Spiral exploration - spiral outward from home base
   */
  private _spiralExploration(entity: Entity, _currentTick: number): void {
    const impl = entity as EntityImpl;
    const explorationState = impl.getComponent('ExplorationState') as any;
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const position = impl.getComponent('Position') as any as { x: number; y: number };
    if (!position) {
      throw new Error('Position component missing');
    }

    // Validate home base
    if (!explorationState.homeBase) {
      throw new Error('Spiral exploration mode requires homeBase in ExplorationState');
    }

    // Check if current target reached
    const currentTarget = explorationState.currentTarget;
    if (currentTarget) {
      const distance = this._distance(position, currentTarget);
      if (distance < 5) {
        // Target reached, get next spiral position
        const currentStep = explorationState.spiralStep ?? 0;
        const nextStep = currentStep + 1;

        // Update state with new step first, then calculate next position
        impl.updateComponent('ExplorationState', (state: any) => ({
          ...state,
          spiralStep: nextStep,
        }));

        // Re-fetch to get updated state
        const updatedState = impl.getComponent('ExplorationState') as any;
        const nextPos = this._getNextSpiralPosition(updatedState);

        impl.updateComponent('ExplorationState', (state: any) => ({
          ...state,
          currentTarget: nextPos,
        }));

        if (impl.hasComponent('Steering')) {
          impl.updateComponent('Steering', (state: any) => ({
            ...state,
            behavior: 'arrive',
            target: nextPos,
          }));
        }
      }
    } else {
      // Initialize spiral - set first target
      const firstPos = this._getNextSpiralPosition(explorationState);
      const initialStep = explorationState.spiralStep ?? 0;

      impl.updateComponent('ExplorationState', (state: any) => ({
        ...state,
        currentTarget: firstPos,
        spiralStep: initialStep + 1, // Increment after setting first target
      }));

      if (impl.hasComponent('Steering')) {
        impl.updateComponent('Steering', (state: any) => ({
          ...state,
          behavior: 'arrive',
          target: firstPos,
        }));
      }
    }
  }

  /**
   * Identify frontier sectors (unexplored adjacent to explored)
   */
  private _identifyFrontier(explorationState: any): Array<{ x: number; y: number }> {
    const frontier: Array<{ x: number; y: number }> = [];
    const explored = explorationState.exploredSectors ?? new Set();
    const checked = new Set<string>();

    for (const key of explored) {
      const [x, y] = key.split(',').map(Number);

      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
        { x: x - 1, y: y - 1 },
        { x: x + 1, y: y - 1 },
        { x: x - 1, y: y + 1 },
        { x: x + 1, y: y + 1 },
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.y < 0) continue;

        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!explored.has(neighborKey) && !checked.has(neighborKey)) {
          checked.add(neighborKey);
          frontier.push(neighbor);
        }
      }
    }

    return frontier;
  }

  /**
   * Get next position in spiral pattern
   */
  private _getNextSpiralPosition(explorationState: any): { x: number; y: number } {
    const homeBase = explorationState.homeBase;
    const step = explorationState.spiralStep ?? 0;

    // Spiral pattern: moves in squares outward
    // Calculate which "ring" and position in ring
    const ring = Math.floor((Math.sqrt(step) + 1) / 2);
    const posInRing = step - (ring - 1) * (ring - 1);

    // Calculate offset based on position in ring
    let offsetX = 0;
    let offsetY = 0;

    const sideLength = ring * 2;
    if (posInRing < sideLength) {
      // East side
      offsetX = ring * 16;
      offsetY = (-ring + posInRing) * 16;
    } else if (posInRing < sideLength * 2) {
      // North side
      offsetX = (ring - (posInRing - sideLength)) * 16;
      offsetY = ring * 16;
    } else if (posInRing < sideLength * 3) {
      // West side
      offsetX = -ring * 16;
      offsetY = (ring - (posInRing - sideLength * 2)) * 16;
    } else {
      // South side
      offsetX = (-ring + (posInRing - sideLength * 3)) * 16;
      offsetY = -ring * 16;
    }

    return {
      x: homeBase.x + offsetX,
      y: homeBase.y + offsetY,
    };
  }

  /**
   * Check and emit coverage milestone events
   */
  private _checkCoverageMilestones(entity: Entity, _world: World): void {
    if (!this.eventBus) return;

    const coverage = this.calculateCoverage(entity);
    const lastMilestone = this.lastCoverageMilestone.get(entity.id) ?? 0;

    const milestones = [0.25, 0.5, 0.75, 0.9];
    for (const milestone of milestones) {
      if (coverage >= milestone && lastMilestone < milestone) {
        // Use emitImmediate for testing and immediate feedback
        this.eventBus.emitImmediate({
          type: 'exploration:milestone',
          source: 'exploration',
          data: {
            entityId: entity.id,
            coverage,
            milestone,
          },
        });
        this.lastCoverageMilestone.set(entity.id, milestone);
      }
    }
  }

  /**
   * Calculate exploration coverage (0-1)
   */
  calculateCoverage(entity: Entity): number {
    const impl = entity as EntityImpl;
    const explorationState = impl.getComponent('ExplorationState') as any;
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const explored = explorationState.exploredSectors ?? new Set();
    const radius = explorationState.explorationRadius ?? 64;

    const radiusInSectors = Math.ceil(radius / 16);
    const totalSectors = (radiusInSectors * 2 + 1) ** 2;

    return Math.min(1.0, explored.size / totalSectors);
  }

  /**
   * Convert world position to sector coordinates
   */
  worldToSector(worldPos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x / 16),
      y: Math.floor(worldPos.y / 16),
    };
  }

  /**
   * Convert sector coordinates to world position (corner)
   */
  sectorToWorld(sector: { x: number; y: number }): { x: number; y: number } {
    return {
      x: sector.x * 16,
      y: sector.y * 16,
    };
  }

  /**
   * Calculate distance between two points
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
