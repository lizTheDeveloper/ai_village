/**
 * WorldSerializer - Serializes/deserializes entire World instances
 */

import type { World, WorldImpl } from '../ecs/World.js';
import type { UniverseDivineConfig } from '../divinity/UniverseConfig.js';
import type { Entity } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type {
  UniverseSnapshot,
  VersionedEntity,
  WorldSnapshot,
} from './types.js';
import { componentSerializerRegistry } from './serializers/index.js';
import { computeChecksumSync } from './utils.js';
// Note: chunkSerializer is imported dynamically to break circular dependency: core -> world -> reproduction -> core
import { getZoneManager } from '../navigation/ZoneManager.js';

export class WorldSerializer {
  /**
   * Serialize entire world to snapshot.
   */
  async serializeWorld(
    world: World,
    universeId: string,
    universeName: string
  ): Promise<UniverseSnapshot> {

    const allEntities = Array.from(world.entities.values());

    // Log entity census
    const census = this.generateEntityCensus(allEntities);
    for (const [_entityType, count] of Array.from(census.entries()).sort((a, b) => b[1] - a[1])) {
      if (count > 0) {
      }
    }

    // Serialize all entities
    const entities = await this.serializeEntities(allEntities);

    // Serialize world state
    const worldState = await this.serializeWorldState(world);

    // Compute checksums
    const entitiesChecksum = computeChecksumSync(entities);
    const componentsChecksum = computeChecksumSync(
      entities.flatMap(e => e.components)
    );
    const worldStateChecksum = computeChecksumSync(worldState);

    // Get time component if it exists
    const timeEntities = world.query().with('time').execute();
    const timeEntityId = timeEntities[0];

    interface TimeComponentData {
      day?: number;
      timeOfDay?: number;
      phase?: 'dawn' | 'day' | 'dusk' | 'night';
    }

    const timeComponent = timeEntityId
      ? world.getComponent(timeEntityId, 'time') as TimeComponentData | undefined
      : undefined;

    const snapshot: UniverseSnapshot = {
      $schema: 'https://aivillage.dev/schemas/universe/v1',
      $version: 1,

      identity: {
        id: universeId,
        name: universeName,
        createdAt: Date.now(),
        schemaVersion: 1,
      },

      time: {
        universeId,
        universeTick: world.tick.toString(),  // Persist actual tick for time continuity
        timeScale: 1.0,
        day: timeComponent?.day ?? 1,
        timeOfDay: timeComponent?.timeOfDay ?? 6,
        phase: timeComponent?.phase ?? 'dawn',
        paused: false,
        pausedDuration: 0,
      },

      config: world.divineConfig ?? {},  // UniverseDivineConfig

      entities,

      worldState,

      checksums: {
        entities: entitiesChecksum,
        components: componentsChecksum,
        worldState: worldStateChecksum,
      },
    };


    return snapshot;
  }

  /**
   * Deserialize world from snapshot.
   */
  async deserializeWorld(snapshot: UniverseSnapshot, world: World): Promise<void> {

    // Verify checksums
    const entitiesChecksum = computeChecksumSync(snapshot.entities);
    if (entitiesChecksum !== snapshot.checksums.entities) {
      console.warn(
        `[WorldSerializer] Entity checksum mismatch! ` +
        `Expected ${snapshot.checksums.entities}, got ${entitiesChecksum}. ` +
        `Save file may be corrupted.`
      );
    }

    // Restore divine config if present
    const worldImpl = world as WorldImpl;
    if (snapshot.config && Object.keys(snapshot.config as object).length > 0) {
      worldImpl.setDivineConfig(snapshot.config as Partial<UniverseDivineConfig>);
    }

    // Deserialize entities
    const deserializedEntities = await this.deserializeEntities(snapshot.entities);

    // Add entities to world
    // CRITICAL: Use addEntity instead of _entities.set() to properly update the spatial chunk index
    // Without this, findNearestResources() returns empty arrays and NPCs can't find food/resources
    for (const entity of deserializedEntities) {
      world.addEntity(entity);
    }

    // Deserialize world state (terrain, weather, etc.)
    if (snapshot.worldState.terrain) {
      const chunkManager = worldImpl.getChunkManager();
      if (chunkManager) {
        // Dynamic import to break circular dependency: core -> world -> reproduction -> core
        // Type assertion: We trust the serialized terrain data structure matches what chunkSerializer expects
        const { chunkSerializer } = await import('@ai-village/world');
        await chunkSerializer.deserializeChunks(snapshot.worldState.terrain as any, chunkManager as any);
      } else {
        console.warn('[WorldSerializer] No ChunkManager available - terrain not restored');
      }
    }

    // Deserialize zones
    if (snapshot.worldState.zones && snapshot.worldState.zones.length > 0) {
      const zoneManager = getZoneManager();
      zoneManager.deserializeZones(snapshot.worldState.zones);
    }

    // Restore tick state for time continuity
    // This is critical: without this, world.tick resets to 0 but entities have old createdAt values,
    // breaking all time-delta calculations (pregnancies, cooldowns, behavior states, caches)
    const universeTick = parseInt(snapshot.time.universeTick || '0', 10);
    if (!isNaN(universeTick) && universeTick > 0) {
      worldImpl.setTick(universeTick);
    }

    // Emit world:loaded event for systems to invalidate their caches
    worldImpl.eventBus.emit({
      type: 'world:loaded',
      source: 'world_serializer',
      data: { tick: universeTick, entityCount: snapshot.entities.length },
    });

  }

  /**
   * Serialize all entities.
   */
  private async serializeEntities(entities: ReadonlyArray<Entity>): Promise<VersionedEntity[]> {
    const serialized: VersionedEntity[] = [];

    for (const entity of entities) {
      try {
        const versionedEntity = await this.serializeEntity(entity);
        serialized.push(versionedEntity);
      } catch (error) {
        console.error(
          `[WorldSerializer] Failed to serialize entity ${entity.id}:`,
          error
        );
        throw error;
      }
    }

    return serialized;
  }

  /**
   * Serialize a single entity.
   */
  private async serializeEntity(entity: Entity): Promise<VersionedEntity> {
    const components = [];

    // Get all components
    const componentTypes = Array.from(entity.components.keys());

    for (const type of componentTypes) {
      const component = entity.components.get(type);

      if (!component) continue;

      try {
        const serialized = componentSerializerRegistry.serialize(component);
        components.push(serialized);
      } catch (error) {
        console.error(
          `[WorldSerializer] Failed to serialize component ${type} ` +
          `for entity ${entity.id}:`,
          error
        );
        throw error;
      }
    }

    return {
      $schema: 'https://aivillage.dev/schemas/entity/v1',
      $version: 1,
      id: entity.id,
      createdAt: entity.createdAt,  // Preserve creation tick for time-delta calculations
      components,
    };
  }

  /**
   * Deserialize entities.
   */
  private async deserializeEntities(
    entities: VersionedEntity[]
  ): Promise<Entity[]> {
    const deserialized: Entity[] = [];

    for (const entityData of entities) {
      try {
        const entity = await this.deserializeEntity(entityData);
        deserialized.push(entity);
      } catch (error) {
        console.error(
          `[WorldSerializer] Failed to deserialize entity ${entityData.id}:`,
          error
        );
        throw error;
      }
    }

    return deserialized;
  }

  /**
   * Deserialize a single entity.
   */
  private async deserializeEntity(data: VersionedEntity): Promise<Entity> {
    // Import Entity implementation
    const { EntityImpl } = await import('../ecs/Entity.js');

    // Create entity with ID and restored createdAt (fallback to 0 for old saves without createdAt)
    const createdAt = data.createdAt ?? 0;
    const entity = new EntityImpl(data.id, createdAt);

    // Deserialize all components
    for (const componentData of data.components) {
      try {
        const component = componentSerializerRegistry.deserialize(componentData) as Component;

        // Type assertion: EntityImpl has addComponent as an internal method
        interface EntityImplInternal {
          addComponent(component: Component): void;
        }

        (entity as unknown as EntityImplInternal).addComponent(component);
      } catch (error) {
        console.error(
          `[WorldSerializer] Failed to deserialize component ${componentData.type} ` +
          `for entity ${data.id}:`,
          error
        );
        throw error;
      }
    }

    return entity;
  }

  /**
   * Serialize world state (terrain, weather, etc.).
   */
  private async serializeWorldState(world: World): Promise<WorldSnapshot> {
    // Serialize terrain using ChunkSerializer
    const worldImpl = world as WorldImpl;
    const chunkManager = worldImpl.getChunkManager();

    // Dynamic import to break circular dependency: core -> world -> reproduction -> core
    let terrain = null;
    if (chunkManager) {
      const { chunkSerializer } = await import('@ai-village/world');
      terrain = chunkSerializer.serializeChunks(chunkManager as any);
    }

    // Serialize zones using ZoneManager
    const zoneManager = getZoneManager();
    const zones = zoneManager.serializeZones();

    // NOTE: Weather is stored as WeatherComponent on the world entity (already serialized with entities)
    // NOTE: Buildings are stored in tiles and BuildingComponent entities (already serialized)

    return {
      terrain,
      zones,
    };
  }

  /**
   * Generate census of entity types for debugging
   */
  private generateEntityCensus(entities: readonly Entity[]): Map<string, number> {
    const census = new Map<string, number>();

    for (const entity of entities) {
      // Categorize entity by primary component type
      let entityType = 'unknown';

      if (entity.components.has('agent')) {
        entityType = 'agent';
      } else if (entity.components.has('plant')) {
        entityType = 'plant';
      } else if (entity.components.has('animal')) {
        entityType = 'animal';
      } else if (entity.components.has('building')) {
        entityType = 'building';
      } else if (entity.components.has('resource')) {
        entityType = 'resource';
      } else if (entity.components.has('item')) {
        entityType = 'item';
      } else if (entity.components.has('deity')) {
        entityType = 'deity';
      } else if (entity.components.has('realm')) {
        entityType = 'realm';
      } else if (entity.components.has('weather')) {
        entityType = 'weather';
      } else if (entity.components.has('time')) {
        entityType = 'time';
      }

      census.set(entityType, (census.get(entityType) ?? 0) + 1);
    }

    return census;
  }

  /**
   * Clone a world by serializing and deserializing.
   * Used for universe forking to create independent timelines.
   */
  async cloneWorld(
    sourceWorld: World,
    targetWorld: World,
    universeId: string,
    universeName: string
  ): Promise<void> {

    // Serialize the source world
    const snapshot = await this.serializeWorld(sourceWorld, universeId, universeName);

    // Deserialize into the target world
    await this.deserializeWorld(snapshot, targetWorld);
  }

  /**
   * Create a lightweight snapshot for timeline storage.
   * Returns the serialized snapshot without writing to disk.
   */
  async createTimelineSnapshot(
    world: World,
    universeId: string,
    tick: bigint
  ): Promise<TimelineSnapshot> {
    const snapshot = await this.serializeWorld(
      world,
      universeId,
      `Tick ${tick}`
    );

    return {
      tick: tick.toString(),
      createdAt: Date.now(),
      entityCount: snapshot.entities.length,
      snapshot,
    };
  }
}

/**
 * Lightweight snapshot for timeline storage.
 */
export interface TimelineSnapshot {
  tick: string;
  createdAt: number;
  entityCount: number;
  snapshot: UniverseSnapshot;
}

// Global singleton
export const worldSerializer = new WorldSerializer();
