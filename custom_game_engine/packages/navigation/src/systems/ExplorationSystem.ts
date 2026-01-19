import type {
  SystemId,
  ComponentType,
  Entity,
  ExplorationStateComponent,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType as CT,
  EntityImpl,
  getAgent,
  getPosition,
} from '@ai-village/core';
import explorationConfig from '../../data/exploration-config.json';

/**
 * ExplorationSystem manages frontier and spiral exploration algorithms
 * Updates ExplorationState and sets steering targets for agents
 */
export class ExplorationSystem extends BaseSystem {
  public readonly id: SystemId = 'exploration';
  public readonly priority: number = 25; // After AISystem, before Steering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.ExplorationState] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private lastCoverageMilestone: Map<string, number> = new Map();

  // Configuration constants from JSON
  private readonly SECTOR_SIZE = explorationConfig.sectors.size;
  private readonly TARGET_REACHED_DISTANCE = explorationConfig.targetReached.distance;
  private readonly MILESTONES = explorationConfig.milestones;
  private readonly SPIRAL_OFFSET_MULTIPLIER = explorationConfig.spiral.offsetMultiplier;

  /**
   * Helper to get typed exploration state from entity
   */
  private getExplorationState(entity: EntityImpl): ExplorationStateComponent | null {
    return entity.getComponent<ExplorationStateComponent>(CT.ExplorationState) ?? null;
  }

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      try {
        this._updateExploration(entity, ctx.world, ctx.tick);
      } catch (error) {
        // Per CLAUDE.md, re-throw with context
        throw new Error(`ExplorationSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateExploration(entity: Entity, world: SystemContext['world'], currentTick: number): void {
    const impl = entity as EntityImpl;
    if (!impl.hasComponent(CT.ExplorationState)) {
      throw new Error('ExplorationSystem requires ExplorationState component');
    }

    const position = getPosition(entity);
    if (!position) {
      // position needed for exploration
      return;
    }

    const explorationState = this.getExplorationState(impl);
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }

    // Mark current sector as explored using the component's method
    const currentSector = this.worldToSector(position);
    explorationState.markSectorExplored(currentSector.x, currentSector.y, currentTick);

    // Update exploration radius based on settlement size - removed getGlobalState (doesn't exist)
    // This can be added later if needed via a proper global state system

    // Check for coverage milestones
    this._checkCoverageMilestones(entity, world);

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
    const explorationState = this.getExplorationState(impl);
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const position = getPosition(entity);
    if (!position) {
      throw new Error('position component missing');
    }

    // Check if current target reached
    const currentTarget = explorationState.currentTarget;
    if (currentTarget) {
      const distance = this._distance(position, currentTarget);
      if (distance < this.TARGET_REACHED_DISTANCE) {
        // Target reached, clear it
        explorationState.currentTarget = undefined;
      }
    }

    // If no target, find new frontier sector
    if (!explorationState.currentTarget) {
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
        explorationState.currentTarget = targetWorld;

        // Update steering if component exists
        if (impl.hasComponent(CT.Steering)) {
          impl.updateComponent(CT.Steering, (state) => ({
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
    const explorationState = this.getExplorationState(impl);
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const position = getPosition(entity);
    if (!position) {
      throw new Error('position component missing');
    }

    // Validate home base
    if (!explorationState.homeBase) {
      throw new Error('Spiral exploration mode requires homeBase in ExplorationState');
    }

    // Check if current target reached
    const currentTarget = explorationState.currentTarget;
    if (currentTarget) {
      const distance = this._distance(position, currentTarget);
      if (distance < this.TARGET_REACHED_DISTANCE) {
        // Target reached, get next spiral position
        explorationState.spiralStep = (explorationState.spiralStep ?? 0) + 1;
        const nextPos = this._getNextSpiralPosition(explorationState);
        explorationState.currentTarget = nextPos;

        if (impl.hasComponent(CT.Steering)) {
          impl.updateComponent(CT.Steering, (state) => ({
            ...state,
            behavior: 'arrive',
            target: nextPos,
          }));
        }
      }
    } else {
      // Initialize spiral - set first target
      const firstPos = this._getNextSpiralPosition(explorationState);
      explorationState.spiralStep = (explorationState.spiralStep ?? 0) + 1;
      explorationState.currentTarget = firstPos;

      if (impl.hasComponent(CT.Steering)) {
        impl.updateComponent(CT.Steering, (state) => ({
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
  private _identifyFrontier(explorationState: ExplorationStateComponent): Array<{ x: number; y: number }> {
    const frontier: Array<{ x: number; y: number }> = [];
    const explored = explorationState.exploredSectors ?? new Set();
    const checked = new Set<string>();

    for (const key of explored) {
      const parts = key.split(',').map(Number);
      const x = parts[0];
      const y = parts[1];
      if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
        continue; // Skip invalid sector keys
      }

      const neighbors = [
        { x: x - 1, y: y },
        { x: x + 1, y: y },
        { x: x, y: y - 1 },
        { x: x, y: y + 1 },
        { x: x - 1, y: y - 1 },
        { x: x + 1, y: y - 1 },
        { x: x - 1, y: y + 1 },
        { x: x + 1, y: y + 1 },
      ];

      for (const neighbor of neighbors) {
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
  private _getNextSpiralPosition(explorationState: ExplorationStateComponent): { x: number; y: number } {
    const homeBase = explorationState.homeBase;
    if (!homeBase) {
      throw new Error('homeBase required for spiral exploration');
    }
    const step = explorationState.spiralStep ?? 0;

    // Spiral pattern: moves in squares outward
    // Calculate which "ring" and position in ring
    const ring = Math.floor((Math.sqrt(step) + 1) / 2);
    const posInRing = step - (ring - 1) * (ring - 1);

    // Calculate offset based on position in ring
    let offsetX = 0;
    let offsetY = 0;

    const sideLength = ring * 2;
    const mult = this.SPIRAL_OFFSET_MULTIPLIER;
    if (posInRing < sideLength) {
      // East side
      offsetX = ring * mult;
      offsetY = (-ring + posInRing) * mult;
    } else if (posInRing < sideLength * 2) {
      // North side
      offsetX = (ring - (posInRing - sideLength)) * mult;
      offsetY = ring * mult;
    } else if (posInRing < sideLength * 3) {
      // West side
      offsetX = -ring * mult;
      offsetY = (ring - (posInRing - sideLength * 2)) * mult;
    } else {
      // South side
      offsetX = (-ring + (posInRing - sideLength * 3)) * mult;
      offsetY = -ring * mult;
    }

    return {
      x: homeBase.x + offsetX,
      y: homeBase.y + offsetY,
    };
  }

  /**
   * Check and emit coverage milestone events
   */
  private _checkCoverageMilestones(entity: Entity, _world: SystemContext['world']): void {
    const coverage = this.calculateCoverage(entity);
    const lastMilestone = this.lastCoverageMilestone.get(entity.id) ?? 0;

    for (const milestone of this.MILESTONES) {
      if (coverage >= milestone && lastMilestone < milestone) {
        // Use emitImmediate for testing and immediate feedback
        const agentComp = getAgent(entity);
        const posComp = getPosition(entity);
        if (!agentComp || !posComp) {
          throw new Error(`ExplorationSystem: Entity ${entity.id} missing required components for milestone event`);
        }
        this.events.emitGeneric({
          type: 'exploration:milestone',
          source: 'exploration',
          data: {
            agentId: entity.id, // Use entity id as agent id
            entityId: entity.id,
            milestoneType: `coverage_${milestone}`,
            location: { x: posComp.x, y: posComp.y },
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
    const explorationState = this.getExplorationState(impl);
    if (!explorationState) {
      throw new Error('ExplorationState component missing');
    }
    const explored = explorationState.exploredSectors ?? new Set();
    const radius = explorationState.explorationRadius ?? explorationConfig.sectors.defaultExplorationRadius;

    const radiusInSectors = Math.ceil(radius / this.SECTOR_SIZE);
    const totalSectors = (radiusInSectors * 2 + 1) ** 2;

    return Math.min(1.0, explored.size / totalSectors);
  }

  /**
   * Convert world position to sector coordinates
   */
  worldToSector(worldPos: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.floor(worldPos.x / this.SECTOR_SIZE),
      y: Math.floor(worldPos.y / this.SECTOR_SIZE),
    };
  }

  /**
   * Convert sector coordinates to world position (corner)
   */
  sectorToWorld(sector: { x: number; y: number }): { x: number; y: number } {
    return {
      x: sector.x * this.SECTOR_SIZE,
      y: sector.y * this.SECTOR_SIZE,
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
