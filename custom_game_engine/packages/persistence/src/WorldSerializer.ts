/**
 * WorldSerializer - Serializes/deserializes entire World instances
 */

import type { World, WorldImpl } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { Component } from '@ai-village/core';
import type { UniverseDivineConfig } from '@ai-village/divinity';
import type {
  UniverseSnapshot,
  VersionedEntity,
  WorldSnapshot,
} from './types.js';
import { componentSerializerRegistry } from './serializers/index.js';
import { computeChecksumSync } from './utils.js';
import { chunkSerializer } from '@ai-village/world';
import { getZoneManager } from '@ai-village/core';

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
    const worldState = this.serializeWorldState(world);

    // Compute checksums
    const entitiesChecksum = computeChecksumSync(entities);
    const componentsChecksum = computeChecksumSync(
      entities.flatMap(e => e.components)
    );
    const worldStateChecksum = computeChecksumSync(worldState);

    // Get time component if it exists
    const timeEntities = world.query().with('time').execute();
    const timeEntityId = timeEntities[0];
    const timeComponent = timeEntityId
      ? world.getComponent(timeEntityId, 'time') as any
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
        universeTick: '0',  // Will be set by MultiverseCoordinator
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
    // Note: WorldImpl doesn't have addEntity in its interface, so we need to access internal API
    for (const entity of deserializedEntities) {
      (worldImpl as any)._entities.set(entity.id, entity);
    }

    // Deserialize world state (terrain, weather, etc.)
    if (snapshot.worldState.terrain) {
      const chunkManager = worldImpl.getChunkManager();
      if (chunkManager) {
        // Cast to any to avoid type conflicts between core's IChunkManager and world's ChunkManager
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

    // TODO: Deserialize weather, buildings

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
    const { EntityImpl } = await import('@ai-village/core');

    // Create entity with ID and createdAt (0 for now, will be set by world)
    const entity = new EntityImpl(data.id, 0);

    // Deserialize all components
    for (const componentData of data.components) {
      try {
        const component = componentSerializerRegistry.deserialize(componentData) as Component;
        (entity as any).addComponent(component);
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
  private serializeWorldState(world: World): WorldSnapshot {
    // Serialize terrain using ChunkSerializer
    const worldImpl = world as WorldImpl;
    const chunkManager = worldImpl.getChunkManager();

    // Cast to any to avoid type conflicts between core's IChunkManager and world's ChunkManager
    const terrain = chunkManager
      ? chunkSerializer.serializeChunks(chunkManager as any)
      : null;

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
