/**
 * GameIntrospectionAPI - Runtime introspection and entity queries
 *
 * Provides schema-aware entity queries with caching and filtering.
 * Builds on ComponentRegistry to provide runtime access to entity data
 * with schema validation and visibility filtering.
 *
 * Features:
 * - Entity queries with component filtering
 * - Schema-aware serialization
 * - Visibility level filtering
 * - Tick-based result caching
 * - SimulationScheduler integration
 * - Bounds-based spatial queries
 */

import type { Entity, World } from '@ai-village/core';
import type { ComponentType } from '@ai-village/core';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import type { ComponentSchema, Component } from '../types/index.js';
import type { Visibility } from '../types/VisibilityTypes.js';
import { SimulationScheduler } from '@ai-village/core';

/**
 * Cache entry for query results
 */
interface CacheEntry<T> {
  data: T;
  tick: number;
  expiresAt: number;
}

/**
 * Query options for filtering entities
 */
export interface EntityQueryOptions {
  /** Component types to filter by (AND logic) */
  withComponents?: ComponentType[];

  /** Bounding box for spatial filtering */
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  /** Only return entities in active simulation (uses SimulationScheduler) */
  activeOnly?: boolean;

  /** Pagination offset */
  offset?: number;

  /** Pagination limit */
  limit?: number;
}

/**
 * Options for entity retrieval
 */
export interface GetEntityOptions {
  /** Visibility level to filter components by */
  visibilityLevel?: keyof Visibility;

  /** Include components without schemas (default: false) */
  includeUnregistered?: boolean;
}

/**
 * Options for schema listing
 */
export interface ListSchemasOptions {
  /** Filter by category */
  category?: string;

  /** Filter by mutability level */
  mutability?: 'readonly' | 'mutable';
}

/**
 * Entity data with metadata
 */
export interface EnrichedEntity {
  id: string;
  components: Record<string, unknown>;
  metadata: {
    simulationMode?: string;
    lastUpdate?: number;
    cacheHit: boolean;
  };
}

/**
 * Query result with pagination metadata
 */
export interface QueryResult {
  entities: EnrichedEntity[];
  total: number;
  offset: number;
  limit: number;
  cacheHit: boolean;
}

/**
 * GameIntrospectionAPI provides runtime entity introspection
 */
export class GameIntrospectionAPI {
  private world: World;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTTL: number = 20; // Cache for 20 ticks (1 second at 20 TPS)

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Get a single entity with schema-validated components
   *
   * @param entityId - Entity ID to retrieve
   * @param options - Retrieval options
   * @returns Enriched entity data or null if not found
   */
  getEntity(entityId: string, options: GetEntityOptions = {}): EnrichedEntity | null {
    const cacheKey = `entity:${entityId}:${options.visibilityLevel || 'all'}`;
    const cached = this.checkCache<EnrichedEntity>(cacheKey);

    if (cached) {
      return { ...cached, metadata: { ...cached.metadata, cacheHit: true } };
    }

    const entity = this.world.getEntity(entityId);
    if (!entity) {
      return null;
    }

    // Get simulation mode if available
    const simulationMode = this.getEntitySimulationMode(entity);
    const lastUpdate = this.getEntityLastUpdate(entity);

    // Serialize components with schema awareness
    const components: Record<string, unknown> = {};
    const visibilityLevel = options.visibilityLevel;

    for (const [componentType, componentData] of entity.components.entries()) {
      const schema = ComponentRegistry.get(componentType);

      // Skip unregistered components unless explicitly requested
      if (!schema && !options.includeUnregistered) {
        continue;
      }

      // Filter by visibility level if specified
      if (visibilityLevel && schema) {
        if (!this.isComponentVisible(schema, visibilityLevel)) {
          continue;
        }
      }

      // Serialize the component
      components[componentType] = this.serializeComponent(componentData, schema);
    }

    const result: EnrichedEntity = {
      id: entityId,
      components,
      metadata: {
        simulationMode,
        lastUpdate,
        cacheHit: false,
      },
    };

    // Cache the result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Query entities with filters
   *
   * @param query - Query options
   * @returns Query result with pagination metadata
   */
  queryEntities(query: EntityQueryOptions = {}): QueryResult {
    const cacheKey = `query:${JSON.stringify(query)}`;
    const cached = this.checkCache<QueryResult>(cacheKey);

    if (cached) {
      return { ...cached, cacheHit: true };
    }

    // Build entity query
    let entityQuery = this.world.query();

    // Add component filters
    if (query.withComponents && query.withComponents.length > 0) {
      for (const componentType of query.withComponents) {
        entityQuery = entityQuery.with(componentType);
      }
    }

    // Execute query
    let entities = entityQuery.executeEntities();

    // Apply bounds filtering if specified
    if (query.bounds) {
      entities = entities.filter((entity) => {
        const position = entity.components.get('position') as
          | { x: number; y: number }
          | undefined;
        if (!position) return false;

        return (
          position.x >= query.bounds!.minX &&
          position.x <= query.bounds!.maxX &&
          position.y >= query.bounds!.minY &&
          position.y <= query.bounds!.maxY
        );
      });
    }

    // Apply SimulationScheduler filtering if requested
    if (query.activeOnly) {
      const scheduler = (this.world as any).simulationScheduler as
        | SimulationScheduler
        | undefined;
      if (scheduler) {
        entities = scheduler.filterActiveEntities(Array.from(entities), this.world.tick);
      }
    }

    const total = entities.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEntities = entities.slice(offset, offset + limit);

    // Enrich entities
    const enrichedEntities: EnrichedEntity[] = paginatedEntities
      .map((entity) => this.getEntity(entity.id, {}))
      .filter((e): e is EnrichedEntity => e !== null);

    const result: QueryResult = {
      entities: enrichedEntities,
      total,
      offset,
      limit,
      cacheHit: false,
    };

    // Cache the result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Get component schema
   *
   * @param type - Component type
   * @returns Component schema or undefined if not registered
   */
  getComponentSchema(type: string): ComponentSchema | undefined {
    return ComponentRegistry.get(type);
  }

  /**
   * List all registered schemas
   *
   * @param options - Filtering options
   * @returns Array of matching schemas
   */
  listSchemas(options: ListSchemasOptions = {}): ComponentSchema[] {
    let schemas = ComponentRegistry.getAll();

    // Filter by category if specified
    if (options.category) {
      schemas = schemas.filter((schema) => schema.category === options.category);
    }

    // Filter by mutability if specified
    if (options.mutability) {
      schemas = schemas.filter((schema) => {
        // Check if any field has the specified mutability
        for (const field of Object.values(schema.fields)) {
          if (options.mutability === 'readonly' && !field.mutable) {
            return true;
          }
          if (options.mutability === 'mutable' && field.mutable) {
            return true;
          }
        }
        return false;
      });
    }

    return schemas;
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
  } {
    // Simple stats - would need to track hits/misses separately for real metrics
    return {
      size: this.cache.size,
      hits: 0, // TODO: Track separately
      misses: 0, // TODO: Track separately
    };
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  /**
   * Check if a cached result is still valid
   */
  private checkCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.world.tick >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store a result in the cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      tick: this.world.tick,
      expiresAt: this.world.tick + this.cacheTTL,
    });
  }

  /**
   * Get entity simulation mode
   */
  private getEntitySimulationMode(entity: Entity): string | undefined {
    // Check if entity has simulation mode metadata
    // This would come from SimulationScheduler
    const scheduler = (this.world as any).simulationScheduler as
      | SimulationScheduler
      | undefined;
    if (!scheduler) {
      return undefined;
    }

    // Determine mode based on components
    for (const [componentType] of entity.components.entries()) {
      const config = (SimulationScheduler as any).getSimulationConfig?.(componentType);
      if (config) {
        return config.mode;
      }
    }

    return undefined;
  }

  /**
   * Get entity last update tick
   */
  private getEntityLastUpdate(entity: Entity): number | undefined {
    // This would come from SimulationScheduler's lastUpdateTick map
    // For now, return undefined as we don't have direct access
    return undefined;
  }

  /**
   * Check if a component is visible at a given level
   */
  private isComponentVisible(
    schema: ComponentSchema,
    level: keyof Visibility
  ): boolean {
    // Check if any field is visible at this level
    for (const field of Object.values(schema.fields)) {
      if (field.visibility?.[level]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Serialize a component with schema awareness
   */
  private serializeComponent(
    component: unknown,
    schema?: ComponentSchema
  ): unknown {
    if (component === null || component === undefined) {
      return component;
    }

    if (typeof component !== 'object') {
      return component;
    }

    // Handle arrays
    if (Array.isArray(component)) {
      return component.map((item) => this.serializeComponent(item, undefined));
    }

    // Handle Maps
    if (component instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of component.entries()) {
        obj[String(k)] = this.serializeComponent(v, undefined);
      }
      return obj;
    }

    // Handle Sets
    if (component instanceof Set) {
      return Array.from(component).map((item) =>
        this.serializeComponent(item, undefined)
      );
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      component as Record<string, unknown>
    )) {
      // Skip functions
      if (typeof value === 'function') continue;

      // Use schema to guide serialization if available
      if (schema && schema.fields[key]) {
        const fieldSchema = schema.fields[key];
        // Could apply field-specific serialization here
        result[key] = this.serializeComponent(value, undefined);
      } else {
        result[key] = this.serializeComponent(value, undefined);
      }
    }
    return result;
  }
}
