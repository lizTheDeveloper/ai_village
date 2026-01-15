/**
 * HearingProcessor - Handles auditory perception for agents
 *
 * This processor detects speech from nearby agents within hearing range
 * and updates the VisionComponent with heard speech.
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Heard speech entry
 */
export interface HeardSpeech {
  speaker: string;
  text: string;
  speakerId?: string;
  distance?: number;
}

/**
 * Hearing processing result
 */
export interface HearingResult {
  heardSpeech: HeardSpeech[];
}

/** Default hearing range in tiles */
const DEFAULT_HEARING_RANGE = 50;

/**
 * Chunk spatial query service injected at runtime from @ai-village/world.
 * Used for efficient spatial entity queries.
 */
let chunkSpatialQuery: any | null = null; // ChunkSpatialQuery from @ai-village/world

/**
 * Inject chunk spatial query service from @ai-village/world.
 * Called by the application bootstrap.
 */
export function injectChunkSpatialQueryForHearing(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
}

/**
 * HearingProcessor Class
 *
 * Usage:
 * ```typescript
 * const hearingProcessor = new HearingProcessor();
 *
 * // In system update loop
 * const result = hearingProcessor.process(entity, world);
 * if (result.heardSpeech.length > 0) {
 * }
 * ```
 */
export class HearingProcessor {
  private hearingRange: number;

  constructor(hearingRange: number = DEFAULT_HEARING_RANGE) {
    this.hearingRange = hearingRange;
  }

  /**
   * Process hearing for an entity, collecting nearby speech.
   * Sleeping agents cannot hear anything.
   */
  process(entity: EntityImpl, world: World): HearingResult {
    // Sleeping agents cannot hear speech
    const circadian = entity.getComponent<CircadianComponent>(ComponentType.Circadian);
    if (circadian?.isSleeping) {
      // Clear any existing heard speech when asleep
      const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
      if (vision && vision.heardSpeech && vision.heardSpeech.length > 0) {
        entity.updateComponent<VisionComponent>(ComponentType.Vision, (current) => ({
          ...current,
          heardSpeech: [],
        }));
      }
      return { heardSpeech: [] };
    }

    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
    if (!vision) {
      return { heardSpeech: [] };
    }

    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) {
      return { heardSpeech: [] };
    }

    const heardSpeech = this.collectNearbySpeech(entity, world, position);

    // Update vision component with heard speech
    entity.updateComponent<VisionComponent>(ComponentType.Vision, (current) => ({
      ...current,
      heardSpeech,
    }));

    return { heardSpeech };
  }

  /**
   * Collect speech from nearby agents within hearing range.
   * Skips sleeping agents (they shouldn't be speaking).
   */
  private collectNearbySpeech(
    entity: EntityImpl,
    world: World,
    position: PositionComponent
  ): HeardSpeech[] {
    const heardSpeech: HeardSpeech[] = [];

    // Use chunk spatial query if available for efficient spatial filtering
    if (chunkSpatialQuery) {
      const agentsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        this.hearingRange,
        [ComponentType.Agent],
        {
          excludeIds: new Set([entity.id]), // Exclude self
        }
      );

      for (const { entity: otherAgent, distance } of agentsInRadius) {
        const otherImpl = otherAgent as EntityImpl;
        const otherAgentComp = otherImpl.getComponent<AgentComponent>(ComponentType.Agent);

        if (!otherAgentComp) continue;

        // Skip sleeping agents - they shouldn't be speaking
        const otherCircadian = otherImpl.getComponent<CircadianComponent>(ComponentType.Circadian);
        if (otherCircadian?.isSleeping) continue;

        // Check if agent has recent speech
        if (otherAgentComp.recentSpeech) {
          const identity = otherImpl.getComponent(ComponentType.Identity) as any;
          const speakerName = identity?.name || 'Someone';

          heardSpeech.push({
            speaker: speakerName,
            text: otherAgentComp.recentSpeech,
            speakerId: otherAgent.id,
            distance,
          });
        }
      }
    } else {
      // Fallback to global query (slower, used in tests or when chunk query not available)
      const agents = world.query().with(ComponentType.Agent).with(ComponentType.Position).executeEntities();

      for (const otherAgent of agents) {
        if (otherAgent.id === entity.id) continue;

        const otherImpl = otherAgent as EntityImpl;
        const otherPos = otherImpl.getComponent<PositionComponent>(ComponentType.Position);
        const otherAgentComp = otherImpl.getComponent<AgentComponent>(ComponentType.Agent);

        if (!otherPos || !otherAgentComp) continue;

        // Skip sleeping agents - they shouldn't be speaking
        const otherCircadian = otherImpl.getComponent<CircadianComponent>(ComponentType.Circadian);
        if (otherCircadian?.isSleeping) continue;

        const distance = this.distance(position, otherPos);

        // Within hearing range and has recent speech
        if (distance <= this.hearingRange && otherAgentComp.recentSpeech) {
          const identity = otherImpl.getComponent(ComponentType.Identity) as any;
          const speakerName = identity?.name || 'Someone';

          heardSpeech.push({
            speaker: speakerName,
            text: otherAgentComp.recentSpeech,
            speakerId: otherAgent.id,
            distance,
          });
        }
      }
    }

    return heardSpeech;
  }

  /**
   * Check if entity can hear a specific other entity.
   */
  canHear(entity: EntityImpl, target: EntityImpl): boolean {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    const targetPos = target.getComponent<PositionComponent>(ComponentType.Position);

    if (!position || !targetPos) return false;

    const distance = this.distance(position, targetPos);
    return distance <= this.hearingRange;
  }

  /**
   * Get all agents within hearing range.
   */
  getAgentsInHearingRange(entity: EntityImpl, world: World): Entity[] {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return [];

    // Use chunk spatial query if available
    if (chunkSpatialQuery) {
      const agentsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        this.hearingRange,
        [ComponentType.Agent],
        {
          excludeIds: new Set([entity.id]), // Exclude self
        }
      );

      return agentsInRadius.map(({ entity }: any) => entity);
    } else {
      // Fallback to global query
      const agents = world.query().with(ComponentType.Agent).with(ComponentType.Position).executeEntities();

      return agents.filter((other) => {
        if (other.id === entity.id) return false;

        const otherPos = (other as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
        if (!otherPos) return false;

        const distance = this.distance(position, otherPos);
        return distance <= this.hearingRange;
      });
    }
  }

  /**
   * Calculate distance between two positions.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const hearingProcessor = new HearingProcessor();

/**
 * Process hearing for an entity.
 */
export function processHearing(entity: Entity, world: World): HearingResult {
  return hearingProcessor.process(entity as EntityImpl, world);
}

/**
 * Check if entity can hear target.
 */
export function canHear(entity: Entity, target: Entity): boolean {
  return hearingProcessor.canHear(entity as EntityImpl, target as EntityImpl);
}

/**
 * Get all agents within hearing range.
 */
export function getAgentsInHearingRange(entity: Entity, world: World): Entity[] {
  return hearingProcessor.getAgentsInHearingRange(entity as EntityImpl, world);
}
