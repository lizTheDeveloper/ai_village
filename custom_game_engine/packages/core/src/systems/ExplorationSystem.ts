import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { getAgent, getPosition } from '../utils/componentHelpers.js';

import { ExplorationStateComponent } from '../components/ExplorationStateComponent.js';

/**
 * ExplorationSystem manages frontier and spiral exploration algorithms
 * Updates ExplorationState and sets steering targets for agents
 */
export class ExplorationSystem extends BaseSystem {
  public readonly id: SystemId = 'exploration';
  public readonly priority: number = 25; // After AISystem, before Steering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private lastCoverageMilestone: Map<string, number> = new Map();

  /**
   * Helper to get typed exploration state from entity
   */
  private getExplorationState(entity: EntityImpl): ExplorationStateComponent | null {
    return entity.getComponent<ExplorationStateComponent>(CT.ExplorationState) ?? null;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Get entities with ExplorationState
    const explorers = ctx.activeEntities.filter(e => e.components.has(CT.ExplorationState));

    for (const entity of explorers) {
      try {
        this._updateExploration(entity, ctx);
      } catch (error) {
        // Per CLAUDE.md, re-throw with context
        throw new Error(`ExplorationSystem failed for entity ${entity.id}: ${error}`);
      }
    }
  }

  private _updateExploration(entity: Entity, ctx: SystemContext): void {
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
    explorationState.markSectorExplored(currentSector.x, currentSector.y, ctx.tick);

    // Update exploration radius based on settlement size - removed getGlobalState (doesn't exist)
    // This can be added later if needed via a proper global state system

    // Check for coverage milestones
    this._checkCoverageMilestones(entity, ctx);

    // Execute exploration mode - validate if present
    const mode = explorationState.mode;

    // If mode is explicitly set, validate it (no fallbacks per CLAUDE.md)
    if (mode !== undefined && mode !== null) {
      const validModes = ['frontier', 'spiral', 'none'];
      if (!validModes.includes(mode)) {
        throw new Error(`Invalid exploration mode: "${mode}". Must be one of: ${validModes.join(', ')}`);
      }

      if (mode === 'frontier') {
        this._frontierExploration(entity);
      } else if (mode === 'spiral') {
        this._spiralExploration(entity);
      }
      // mode === 'none' does nothing
    }
    // If mode not set, skip exploration (entity just tracks sectors)
  }

  /**
   * Frontier exploration - explore edges of known territory
   */
  private _frontierExploration(entity: Entity): void {
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
      if (distance < 5) {
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
  private _spiralExploration(entity: Entity): void {
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
      if (distance < 5) {
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
  private _checkCoverageMilestones(entity: Entity, ctx: SystemContext): void {
    const coverage = this.calculateCoverage(entity);
    const lastMilestone = this.lastCoverageMilestone.get(entity.id) ?? 0;

    const milestones = [0.25, 0.5, 0.75, 0.9];
    for (const milestone of milestones) {
      if (coverage >= milestone && lastMilestone < milestone) {
        // Use emitGeneric for custom event type
        const agentComp = getAgent(entity);
        const posComp = getPosition(entity);
        if (!agentComp || !posComp) {
          throw new Error(`ExplorationSystem: Entity ${entity.id} missing required components for milestone event`);
        }
        ctx.events.emitGeneric(
          'exploration:milestone',
          {
            agentId: entity.id, // Use entity id as agent id
            entityId: entity.id,
            milestoneType: `coverage_${milestone}`,
            location: { x: posComp.x, y: posComp.y },
          },
          'exploration'
        );
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
