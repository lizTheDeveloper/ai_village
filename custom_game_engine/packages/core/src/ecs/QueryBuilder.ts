import type { EntityId, ComponentType } from '../types.js';
import type { Entity } from './Entity.js';
import type { World } from './World.js';

/**
 * Query builder for finding entities.
 */
export interface IQueryBuilder {
  /** Filter by required components */
  with(...components: ComponentType[]): IQueryBuilder;

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

  execute(): ReadonlyArray<EntityId> {
    return this.executeEntities().map((e) => e.id);
  }

  executeEntities(): ReadonlyArray<Entity> {
    let entities = Array.from(this.world.entities.values());

    for (const filter of this.filters) {
      entities = this.applyFilter(entities, filter);
    }

    return entities;
  }

  private applyFilter(entities: Entity[], filter: QueryFilter): Entity[] {
    switch (filter.type) {
      case 'components': {
        const components = filter.data as ComponentType[];
        return entities.filter((e) =>
          components.every((c) => e.components.has(c))
        );
      }

      case 'tags': {
        const tags = filter.data as string[];
        return entities.filter((e) => {
          const tagsComp = e.components.get('tags') as
            | { tags: string[] }
            | undefined;
          if (!tagsComp) return false;
          return tags.some((t) => tagsComp.tags.includes(t));
        });
      }

      case 'rect': {
        const { x, y, width, height } = filter.data as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        return entities.filter((e) => {
          const pos = e.components.get('position') as
            | { x: number; y: number }
            | undefined;
          if (!pos) return false;
          return (
            pos.x >= x &&
            pos.x < x + width &&
            pos.y >= y &&
            pos.y < y + height
          );
        });
      }

      case 'chunk': {
        const { chunkX, chunkY } = filter.data as {
          chunkX: number;
          chunkY: number;
        };
        return entities.filter((e) => {
          const pos = e.components.get('position') as
            | { chunkX: number; chunkY: number }
            | undefined;
          if (!pos) return false;
          return pos.chunkX === chunkX && pos.chunkY === chunkY;
        });
      }

      case 'near': {
        const { entityId, radius } = filter.data as {
          entityId: EntityId;
          radius: number;
        };
        const targetEntity = this.world.getEntity(entityId);
        if (!targetEntity) return [];

        const targetPos = targetEntity.components.get('position') as
          | { x: number; y: number }
          | undefined;
        if (!targetPos) return [];

        return entities.filter((e) => {
          if (e.id === entityId) return false;
          const pos = e.components.get('position') as
            | { x: number; y: number }
            | undefined;
          if (!pos) return false;

          const dx = pos.x - targetPos.x;
          const dy = pos.y - targetPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= radius;
        });
      }

      default:
        return entities;
    }
  }
}
