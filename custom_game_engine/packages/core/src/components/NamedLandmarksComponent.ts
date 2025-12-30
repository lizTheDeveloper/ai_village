import { ComponentBase } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

/**
 * Named Landmark
 *
 * Represents a terrain feature that has been discovered and named by an agent.
 * Names are personal and cultural - different agents may know different names for the same place.
 */
export interface NamedLandmark {
  /** Unique identifier for this landmark (based on position) */
  readonly id: string;

  /** World coordinates */
  readonly x: number;
  readonly y: number;

  /** Terrain feature type (peak, cliff, lake, ridge, valley) */
  readonly featureType: string;

  /** Name given by the discoverer */
  readonly name: string;

  /** Agent who first named this landmark */
  readonly namedBy: EntityId;

  /** When it was named */
  readonly namedAt: Tick;

  /** Feature metadata (elevation, size, etc.) */
  readonly metadata?: {
    elevation?: number;
    size?: number;
    description?: string;
  };
}

/**
 * NamedLandmarksComponent
 *
 * World-level registry of all named landmarks.
 * Tracks which terrain features have been discovered and named by agents.
 *
 * This is a singleton component attached to the world entity.
 */
export class NamedLandmarksComponent extends ComponentBase {
  public readonly type = 'named_landmarks';

  /** Map of landmark ID -> named landmark */
  private landmarks = new Map<string, NamedLandmark>();

  /**
   * Generate a unique ID for a landmark based on its position.
   * Rounds to nearest tile to handle slight position variations.
   */
  static getLandmarkId(x: number, y: number): string {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    return `landmark_${tileX}_${tileY}`;
  }

  /**
   * Check if a landmark at this position has been named.
   */
  isNamed(x: number, y: number): boolean {
    const id = NamedLandmarksComponent.getLandmarkId(x, y);
    return this.landmarks.has(id);
  }

  /**
   * Get the named landmark at this position, if it exists.
   */
  getLandmark(x: number, y: number): NamedLandmark | undefined {
    const id = NamedLandmarksComponent.getLandmarkId(x, y);
    return this.landmarks.get(id);
  }

  /**
   * Register a newly named landmark.
   */
  nameLandmark(
    x: number,
    y: number,
    featureType: string,
    name: string,
    namedBy: EntityId,
    namedAt: Tick,
    metadata?: { elevation?: number; size?: number; description?: string }
  ): NamedLandmark {
    const id = NamedLandmarksComponent.getLandmarkId(x, y);

    const landmark: NamedLandmark = {
      id,
      x,
      y,
      featureType,
      name,
      namedBy,
      namedAt,
      metadata,
    };

    this.landmarks.set(id, landmark);
    return landmark;
  }

  /**
   * Get all named landmarks.
   */
  getAllLandmarks(): NamedLandmark[] {
    return Array.from(this.landmarks.values());
  }

  /**
   * Get all landmarks named by a specific agent.
   */
  getLandmarksNamedBy(agentId: EntityId): NamedLandmark[] {
    return this.getAllLandmarks().filter(l => l.namedBy === agentId);
  }

  /**
   * Find landmarks near a position.
   */
  getNearbyLandmarks(x: number, y: number, radius: number): NamedLandmark[] {
    return this.getAllLandmarks().filter(l => {
      const dx = l.x - x;
      const dy = l.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= radius;
    });
  }
}

/**
 * Create a NamedLandmarksComponent.
 */
export function createNamedLandmarksComponent(): NamedLandmarksComponent {
  return new NamedLandmarksComponent();
}
