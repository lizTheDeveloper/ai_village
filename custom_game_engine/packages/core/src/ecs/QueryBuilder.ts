import type { EntityId, ComponentType } from '../types.js';
import type { Entity } from './Entity.js';
import type { World } from './World.js';
import { generateQuerySignature } from './QuerySignature.js';

/**
 * Query builder for finding entities.
 */
export interface IQueryBuilder {
  /** Filter by required components */
  with(...components: ComponentType[]): IQueryBuilder;

  /** Filter by components that should NOT be present */
  without(...components: ComponentType[]): IQueryBuilder;

  /** Filter by tags (requires TagsComponent) */
  withTags(...tags: string[]): IQueryBuilder;

  /** Filter by spatial bounds */
  inRect(x: number, y: number, width: number, height: number): IQueryBuilder;

  /** Filter by chunk */
  inChunk(chunkX: number, chunkY: number): IQueryBuilder;

  /** Filter by proximity to entity */
  near(entityId: EntityId, radius: number): IQueryBuilder;

  /** Execute and return entity IDs */
  execute(): ReadonlyArray<EntityId>;

  /** Execute and return entities */
  executeEntities(): ReadonlyArray<Entity>;
}

interface QueryFilter {
  type:
    | 'components'
    | 'without_components'
    | 'tags'
    | 'rect'
    | 'chunk'
    | 'near';
  data: unknown;
}

/**
 * Implementation of QueryBuilder.
 */
export class QueryBuilder implements IQueryBuilder {
  private filters: QueryFilter[] = [];

  constructor(private world: World) {}

  with(...components: ComponentType[]): IQueryBuilder {
    this.filters.push({ type: 'components', data: components });
    return this;
  }

  without(...components: ComponentType[]): IQueryBuilder {
    this.filters.push({ type: 'without_components', data: components });
    return this;
  }

  withTags(...tags: string[]): IQueryBuilder {
    this.filters.push({ type: 'tags', data: tags });
    return this;
  }

  inRect(x: number, y: number, width: number, height: number): IQueryBuilder {
    this.filters.push({ type: 'rect', data: { x, y, width, height } });
    return this;
  }

  inChunk(chunkX: number, chunkY: number): IQueryBuilder {
    this.filters.push({ type: 'chunk', data: { chunkX, chunkY } });
    return this;
  }

  near(entityId: EntityId, radius: number): IQueryBuilder {
    this.filters.push({ type: 'near', data: { entityId, radius } });
    return this;
  }

  // Reusable result arrays to reduce GC pressure
  private resultEntities: Entity[] = [];
  private resultIds: EntityId[] = [];

  execute(): ReadonlyArray<EntityId> {
    // Reuse ID array - single pass without intermediate entity array
    this.resultIds.length = 0;

    for (const entity of this.world.entities.values()) {
      if (this.matchesAllFilters(entity)) {
        this.resultIds.push(entity.id);
      }
    }

    return this.resultIds;
  }

  executeEntities(): ReadonlyArray<Entity> {
    // Try cache for component-only queries (no spatial filters)
    // Spatial filters are not cacheable because they depend on runtime parameters
    if (this.isCacheable()) {
      const signature = this.generateSignature();
      const currentVersion = this.world.archetypeVersion;
      const cached = this.world.queryCache.get(signature, currentVersion);

      if (cached !== null) {
        // Cache hit - return cached results
        return cached;
      }

      // Cache miss - execute query and cache results
      const results = this.executeEntitiesUncached();
      this.world.queryCache.set(signature, results, currentVersion, this.world.tick);
      return results;
    }

    // Non-cacheable query (has spatial filters) - execute directly
    return this.executeEntitiesUncached();
  }

  /**
   * Execute query without cache (original implementation).
   * Used for cache misses and non-cacheable queries.
   */
  private executeEntitiesUncached(): ReadonlyArray<Entity> {
    // Reuse entity array - WARNING: Result array is reused on next query
    this.resultEntities.length = 0;

    for (const entity of this.world.entities.values()) {
      if (this.matchesAllFilters(entity)) {
        this.resultEntities.push(entity);
      }
    }

    return this.resultEntities;
  }

  /**
   * Check if this query can be cached.
   * Only queries with component filters (with/without) are cacheable.
   * Spatial filters (rect, chunk, near) are not cacheable.
   */
  private isCacheable(): boolean {
    for (const filter of this.filters) {
      if (
        filter.type === 'rect' ||
        filter.type === 'chunk' ||
        filter.type === 'near' ||
        filter.type === 'tags'
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate cache signature for this query.
   * Only called for cacheable queries.
   */
  private generateSignature(): string {
    const withComponents: ComponentType[] = [];
    const withoutComponents: ComponentType[] = [];

    for (const filter of this.filters) {
      if (filter.type === 'components') {
        withComponents.push(...(filter.data as ComponentType[]));
      } else if (filter.type === 'without_components') {
        withoutComponents.push(...(filter.data as ComponentType[]));
      }
    }

    return generateQuerySignature(withComponents, withoutComponents);
  }

  private matchesAllFilters(entity: Entity): boolean {
    for (const filter of this.filters) {
      if (!this.matchesFilter(entity, filter)) {
        return false;
      }
    }
    return true;
  }

  private matchesFilter(entity: Entity, filter: QueryFilter): boolean {
    switch (filter.type) {
      case 'components': {
        const components = filter.data as ComponentType[];
        return components.every((c) => entity.components.has(c));
      }

      case 'without_components': {
        const components = filter.data as ComponentType[];
        return components.every((c) => !entity.components.has(c));
      }

      case 'tags': {
        const tags = filter.data as string[];
        const tagsCompRaw = entity.components.get('tags');
        const tagsComp = tagsCompRaw as unknown as
          | { tags: string[] }
          | undefined;
        if (!tagsComp) return false;
        return tags.some((t) => tagsComp.tags.includes(t));
      }

      case 'rect': {
        const { x, y, width, height } = filter.data as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        const posRaw = entity.components.get('position');
        const pos = posRaw as unknown as
          | { x: number; y: number }
          | undefined;
        if (!pos) return false;
        return (
          pos.x >= x &&
          pos.x < x + width &&
          pos.y >= y &&
          pos.y < y + height
        );
      }

      case 'chunk': {
        const { chunkX, chunkY } = filter.data as {
          chunkX: number;
          chunkY: number;
        };
        const posRaw = entity.components.get('position');
        const pos = posRaw as unknown as
          | { chunkX: number; chunkY: number }
          | undefined;
        if (!pos) return false;
        return pos.chunkX === chunkX && pos.chunkY === chunkY;
      }

      case 'near': {
        const { entityId, radius } = filter.data as {
          entityId: EntityId;
          radius: number;
        };
        if (entity.id === entityId) return false;

        const targetEntity = this.world.getEntity(entityId);
        if (!targetEntity) return false;

        const targetPosRaw = targetEntity.components.get('position');
        const targetPos = targetPosRaw as unknown as
          | { x: number; y: number }
          | undefined;
        if (!targetPos) return false;

        const posRaw = entity.components.get('position');
        const pos = posRaw as unknown as
          | { x: number; y: number }
          | undefined;
        if (!pos) return false;

        const dx = pos.x - targetPos.x;
        const dy = pos.y - targetPos.y;
        const distanceSquared = dx * dx + dy * dy;
        return distanceSquared <= radius * radius;
      }

      default:
        return true;
    }
  }

}
