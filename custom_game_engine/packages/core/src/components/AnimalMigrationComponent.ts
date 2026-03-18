import type { Component } from '../ecs/Component.js';

/**
 * AnimalMigrationComponent - Tracks active migration state for an animal.
 *
 * Added to animals that are currently migrating between biomes.
 * Removed when migration is complete (animal reaches destination).
 * Conservation of Game Matter: never delete, just remove this component when done.
 */
export interface AnimalMigrationComponent extends Component {
  readonly type: 'animal_migration';
  /** Target biome the animal is migrating to */
  readonly targetBiome: string;
  /** World-space destination X coordinate */
  readonly targetX: number;
  /** World-space destination Y coordinate */
  readonly targetY: number;
  /** Season when migration started */
  readonly season: string;
  /** Day when migration started */
  readonly startedAtDay: number;
  /** Migration progress 0-1 (0=just started, 1=arrived) */
  progress: number;
}

/**
 * Creates an AnimalMigrationComponent with validation.
 * Per CLAUDE.md: NO SILENT FALLBACKS - all required fields must be present.
 */
export function createAnimalMigrationComponent(
  targetBiome: string,
  targetX: number,
  targetY: number,
  season: string,
  startedAtDay: number,
): AnimalMigrationComponent {
  if (!targetBiome) throw new Error('AnimalMigrationComponent requires targetBiome');
  if (targetX === undefined || targetX === null) throw new Error('AnimalMigrationComponent requires targetX');
  if (targetY === undefined || targetY === null) throw new Error('AnimalMigrationComponent requires targetY');
  if (!season) throw new Error('AnimalMigrationComponent requires season');
  if (startedAtDay === undefined || startedAtDay === null) throw new Error('AnimalMigrationComponent requires startedAtDay');

  return {
    type: 'animal_migration',
    version: 1,
    targetBiome,
    targetX,
    targetY,
    season,
    startedAtDay,
    progress: 0,
  };
}
