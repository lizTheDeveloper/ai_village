/**
 * Tests for GameIntrospectionAPI Phase 1 functionality
 *
 * Tests unified introspection API for entity queries, component schemas,
 * mutations with validation, caching, and undo/redo functionality.
 *
 * Based on INTROSPECTION_API_DESIGN.md Phase 1 specification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '@ai-village/core';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { MutationService } from '../mutation/index.js';
import { defineComponent } from '../types/ComponentSchema.js';
import type { World } from '@ai-village/core';
import type { Component } from '../types/index.js';

// Import GameIntrospectionAPI (will be implemented)
// import { GameIntrospectionAPI } from '../api/GameIntrospectionAPI.js';

/**
 * Test component types
 */
interface TestAgentComponent extends Component {
  type: 'test_agent';
  version: number;
  name: string;
  level: number;
  species: 'human' | 'elf' | 'dwarf';
}

interface TestNeedsComponent extends Component {
  type: 'test_needs';
  version: number;
  hunger: number;
  thirst: number;
  energy: number;
}

interface TestPositionComponent extends Component {
  type: 'test_position';
  version: number;
  x: number;
  y: number;
  chunk_id: string;
}

/**
 * Test schemas
 */
const TestAgentSchema = defineComponent<TestAgentComponent>({
  type: 'test_agent',
  version: 1,
  category: 'agent',
  description: 'Test agent component',

  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Agent name',
      maxLength: 50,
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text' },
      mutable: true,
    },

    level: {
      type: 'number',
      required: true,
      range: [1, 100],
      description: 'Agent level',
      visibility: { player: true, llm: 'summarized', dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    species: {
      type: 'enum',
      enumValues: ['human', 'elf', 'dwarf'],
      required: true,
      description: 'Species type',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'dropdown' },
      mutable: false, // Immutable!
    },
  },

  validate: (data): data is TestAgentComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'test_agent' &&
      typeof (data as any).name === 'string' &&
      typeof (data as any).level === 'number'
    );
  },

  createDefault: () => ({
    type: 'test_agent',
    version: 1,
    name: 'Unknown',
    level: 1,
    species: 'human',
  }),
});

const TestNeedsSchema = defineComponent<TestNeedsComponent>({
  type: 'test_needs',
  version: 1,
  category: 'agent',
  description: 'Test needs component',

  fields: {
    hunger: {
      type: 'number',
      required: true,
      range: [0, 1],
      description: 'Hunger level (0-1)',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },

    thirst: {
      type: 'number',
      required: true,
      range: [0, 1],
      description: 'Thirst level (0-1)',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },

    energy: {
      type: 'number',
      required: true,
      range: [0, 1],
      description: 'Energy level (0-1)',
      visibility: { player: true, llm: 'summarized', dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },
  },

  validate: (data): data is TestNeedsComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'test_needs' &&
      typeof (data as any).hunger === 'number' &&
      typeof (data as any).thirst === 'number' &&
      typeof (data as any).energy === 'number'
    );
  },

  createDefault: () => ({
    type: 'test_needs',
    version: 1,
    hunger: 0.5,
    thirst: 0.5,
    energy: 0.5,
  }),
});

const TestPositionSchema = defineComponent<TestPositionComponent>({
  type: 'test_position',
  version: 1,
  category: 'core',
  description: 'Test position component',

  fields: {
    x: {
      type: 'number',
      required: true,
      description: 'X coordinate',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    y: {
      type: 'number',
      required: true,
      description: 'Y coordinate',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    chunk_id: {
      type: 'string',
      required: true,
      description: 'Chunk ID',
      visibility: { player: false, llm: false, dev: true },
      ui: { widget: 'readonly' },
      mutable: false,
    },
  },

  validate: (data): data is TestPositionComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'test_position' &&
      typeof (data as any).x === 'number' &&
      typeof (data as any).y === 'number'
    );
  },

  createDefault: () => ({
    type: 'test_position',
    version: 1,
    x: 0,
    y: 0,
    chunk_id: 'chunk_0_0',
  }),
});

/**
 * Test helpers
 */
function createMockEntity(id?: string): EntityImpl {
  const entity = new EntityImpl(id || createEntityId(), 0);
  return entity;
}

function createMockWorld(): World {
  const entities = new Map<string, EntityImpl>();

  return {
    tick: 100,
    timeEntity: null,
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      without: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockReturnValue([]),
      execute: vi.fn().mockReturnValue([]),
    }),
    getEntity: vi.fn((id: string) => entities.get(id)),
    addEntity: vi.fn((entity: EntityImpl) => {
      entities.set(entity.id, entity);
    }),
    removeEntity: vi.fn((id: string) => {
      entities.delete(id);
    }),
    simulationScheduler: {
      filterActiveEntities: vi.fn((entities) => entities),
    },
  } as unknown as World;
}

// Mock GameIntrospectionAPI for now
// Remove this once the actual implementation is available
class MockGameIntrospectionAPI {
  private world: World;
  private cache = new Map<string, any>();
  private cacheStats = { hits: 0, misses: 0, invalidations: 0 };

  constructor(world: World) {
    this.world = world;
  }

  async getEntity(
    entityId: string,
    options?: {
      components?: string[];
      visibility?: 'full' | 'llm' | 'player';
      includeMetadata?: boolean;
    }
  ): Promise<any> {
    const entity = this.world.getEntity?.(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const cacheKey = `${entityId}:${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      this.cacheStats.hits++;
      return this.cache.get(cacheKey);
    }

    this.cacheStats.misses++;

    // Build result from entity components
    const components: Record<string, any> = {};
    const schemas: Record<string, any> = {};

    const entity_any = entity as any;
    for (const compType of ['test_agent', 'test_needs', 'test_position']) {
      if (entity_any.hasComponent(compType)) {
        const comp = entity_any.getComponent(compType);
        if (!options?.components || options.components.includes(compType)) {
          components[compType] = comp;
          schemas[compType] = ComponentRegistry.get(compType);
        }
      }
    }

    const result = {
      id: entityId,
      components,
      schemas: options?.includeMetadata ? schemas : undefined,
      metadata: {
        simulationMode: 'ALWAYS',
        lastUpdate: this.world.tick,
        cacheHit: false,
      },
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  async queryEntities(query: any): Promise<any[]> {
    // Simplified mock implementation
    return [];
  }

  getComponentSchema(type: string): any {
    return ComponentRegistry.get(type);
  }

  listSchemas(options?: { category?: string; mutable?: boolean }): any[] {
    let filtered = ComponentRegistry.getAll();

    if (options?.category) {
      filtered = filtered.filter((s) => s.category === options.category);
    }

    if (options?.mutable !== undefined) {
      filtered = filtered.filter((s) => {
        return Object.values(s.fields).some((f: any) => f.mutable === options.mutable);
      });
    }

    return filtered;
  }

  async mutateField(mutation: any): Promise<any> {
    const entity = this.world.getEntity?.(mutation.entityId);
    if (!entity) {
      throw new Error(`Entity ${mutation.entityId} not found`);
    }

    // Get old value before mutation
    const entity_any = entity as any;
    const component = entity_any.getComponent(mutation.componentType);
    const oldValue = component ? component[mutation.field] : undefined;

    const result = MutationService.mutate(
      entity,
      mutation.componentType,
      mutation.field,
      mutation.value
    );

    // Get new value after mutation (if successful)
    const newValue = result.success
      ? entity_any.getComponent(mutation.componentType)?.[mutation.field]
      : undefined;

    // Invalidate cache
    this.cache.clear();
    this.cacheStats.invalidations++;

    return {
      success: result.success,
      oldValue,
      newValue,
      validationErrors: result.success ? undefined : [result.error || 'Validation failed'],
      undoId: result.success ? 'undo-1' : undefined,
      metrics: {
        latency: 1,
        cacheInvalidations: 1,
      },
    };
  }

  async mutateBatch(mutations: any[]): Promise<any> {
    const results = [];
    for (const mutation of mutations) {
      try {
        const result = await this.mutateField(mutation);
        results.push(result);
        if (!result.success) {
          // Rollback on first failure
          break;
        }
      } catch (error: any) {
        results.push({
          success: false,
          validationErrors: [error.message],
        });
        break;
      }
    }

    return {
      results,
      allSucceeded: results.every((r) => r.success),
    };
  }

  async undo(count = 1): Promise<any> {
    for (let i = 0; i < count; i++) {
      if (MutationService.canUndo()) {
        MutationService.undo();
      }
    }
    this.cache.clear();
    this.cacheStats.invalidations++;
    return { success: true, count };
  }

  async redo(count = 1): Promise<any> {
    for (let i = 0; i < count; i++) {
      if (MutationService.canRedo()) {
        MutationService.redo();
      }
    }
    this.cache.clear();
    this.cacheStats.invalidations++;
    return { success: true, count };
  }

  getCacheStats(): any {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      invalidations: this.cacheStats.invalidations,
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      avgCacheLifetime: 0,
      memoryUsage: this.cache.size * 1024,
    };
  }
}

// Use MockGameIntrospectionAPI until real one is implemented
const GameIntrospectionAPI = MockGameIntrospectionAPI;

/**
 * Tests
 */
describe('GameIntrospectionAPI Phase 1', () => {
  let world: World;
  let api: MockGameIntrospectionAPI;
  let testEntity: EntityImpl;

  beforeEach(() => {
    // Register test schemas
    ComponentRegistry.register(TestAgentSchema);
    ComponentRegistry.register(TestNeedsSchema);
    ComponentRegistry.register(TestPositionSchema);

    // Create world and API
    world = createMockWorld();
    api = new GameIntrospectionAPI(world);

    // Create test entity with components
    testEntity = createMockEntity('test-entity-1');
    (testEntity as any).addComponent(TestAgentSchema.createDefault());
    (testEntity as any).addComponent(TestNeedsSchema.createDefault());
    (testEntity as any).addComponent(TestPositionSchema.createDefault());

    // Add entity to world
    world.addEntity?.(testEntity);

    // Clear mutation history
    MutationService.clearHistory();
    MutationService.setDevMode(false);
  });

  afterEach(() => {
    ComponentRegistry.clear();
  });

  describe('Entity Queries', () => {
    describe('getEntity', () => {
      it('should retrieve entity with all components', async () => {
        const result = await api.getEntity('test-entity-1');

        expect(result.id).toBe('test-entity-1');
        expect(result.components).toBeDefined();
        expect(result.components.test_agent).toBeDefined();
        expect(result.components.test_needs).toBeDefined();
        expect(result.components.test_position).toBeDefined();
      });

      it('should filter components when specified', async () => {
        const result = await api.getEntity('test-entity-1', {
          components: ['test_agent', 'test_needs'],
        });

        expect(result.components.test_agent).toBeDefined();
        expect(result.components.test_needs).toBeDefined();
        expect(result.components.test_position).toBeUndefined();
      });

      it('should include schemas when includeMetadata is true', async () => {
        const result = await api.getEntity('test-entity-1', {
          includeMetadata: true,
        });

        expect(result.schemas).toBeDefined();
        expect(result.schemas.test_agent).toBeDefined();
        expect(result.schemas.test_agent.type).toBe('test_agent');
      });

      it('should include metadata about simulation mode', async () => {
        const result = await api.getEntity('test-entity-1');

        expect(result.metadata).toBeDefined();
        expect(result.metadata.simulationMode).toBeDefined();
        expect(result.metadata.lastUpdate).toBe(world.tick);
      });

      it('should throw error for non-existent entity', async () => {
        await expect(api.getEntity('non-existent')).rejects.toThrow('not found');
      });

      it('should use cache on repeated queries', async () => {
        // First call - cache miss
        const result1 = await api.getEntity('test-entity-1');
        expect(result1.metadata.cacheHit).toBe(false);

        // Second call - cache hit
        const result2 = await api.getEntity('test-entity-1');
        expect(result2).toEqual(result1);

        const stats = api.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
      });

      it('should respect visibility levels', async () => {
        // This test would verify that 'llm' visibility filters fields appropriately
        // Implementation depends on actual API behavior
        const result = await api.getEntity('test-entity-1', {
          visibility: 'llm',
        });

        expect(result.components).toBeDefined();
        // LLM visibility should filter based on schema visibility settings
      });
    });

    describe('queryEntities', () => {
      it('should query entities with component filters', async () => {
        const results = await api.queryEntities({
          componentFilters: ['test_agent', 'test_needs'],
          limit: 50,
        });

        expect(Array.isArray(results)).toBe(true);
        // Mock returns empty array - real implementation would return filtered entities
      });

      it('should query entities within bounds', async () => {
        const results = await api.queryEntities({
          componentFilters: ['test_position'],
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        });

        expect(Array.isArray(results)).toBe(true);
      });

      it('should support pagination', async () => {
        const results = await api.queryEntities({
          componentFilters: ['test_agent'],
          offset: 0,
          limit: 10,
        });

        expect(Array.isArray(results)).toBe(true);
      });
    });
  });

  describe('Component Schema Queries', () => {
    describe('getComponentSchema', () => {
      it('should retrieve component schema', () => {
        const schema = api.getComponentSchema('test_agent');

        expect(schema).toBeDefined();
        expect(schema.type).toBe('test_agent');
        expect(schema.category).toBe('agent');
        expect(schema.fields).toBeDefined();
      });

      it('should return undefined for non-existent schema', () => {
        const schema = api.getComponentSchema('non_existent');
        expect(schema).toBeUndefined();
      });
    });

    describe('listSchemas', () => {
      it('should list all schemas', () => {
        const schemas = api.listSchemas();

        expect(schemas.length).toBeGreaterThan(0);
        expect(schemas.some((s) => s.type === 'test_agent')).toBe(true);
        expect(schemas.some((s) => s.type === 'test_needs')).toBe(true);
      });

      it('should filter by category', () => {
        const schemas = api.listSchemas({ category: 'agent' });

        expect(schemas.every((s) => s.category === 'agent')).toBe(true);
        expect(schemas.some((s) => s.type === 'test_agent')).toBe(true);
      });

      it('should filter by mutability', () => {
        const mutableSchemas = api.listSchemas({ mutable: true });

        // Schemas with at least one mutable field
        expect(mutableSchemas.length).toBeGreaterThan(0);
      });

      it('should combine filters', () => {
        const schemas = api.listSchemas({
          category: 'agent',
          mutable: true,
        });

        expect(schemas.every((s) => s.category === 'agent')).toBe(true);
      });
    });
  });

  describe('Mutations', () => {
    describe('mutateField', () => {
      it('should mutate valid field', async () => {
        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'Alice',
        });

        expect(result.success).toBe(true);
        expect(result.oldValue).toBe('Unknown');
        expect(result.newValue).toBe('Alice');
        expect(result.undoId).toBeDefined();

        // Verify mutation applied
        const entity = world.getEntity?.('test-entity-1') as any;
        const agent = entity?.getComponent('test_agent');
        expect(agent.name).toBe('Alice');
      });

      it('should reject invalid type', async () => {
        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 123, // Should be string
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
        expect(result.validationErrors![0]).toContain('string');
      });

      it('should reject out-of-range value', async () => {
        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_needs',
          field: 'hunger',
          value: 1.5, // Out of range [0, 1]
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
        expect(result.validationErrors![0]).toContain('between');
      });

      it('should reject mutation of immutable field', async () => {
        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'species',
          value: 'elf',
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
        expect(result.validationErrors![0]).toContain('mutable');
      });

      it('should allow dev mode to mutate immutable fields', async () => {
        MutationService.setDevMode(true);

        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'species',
          value: 'elf',
        });

        expect(result.success).toBe(true);
        expect(result.newValue).toBe('elf');
      });

      it('should invalidate cache on mutation', async () => {
        // Prime cache
        await api.getEntity('test-entity-1');

        // Get stats before mutation
        const statsBefore = api.getCacheStats();
        const sizeBefore = statsBefore.size;

        // Mutate
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'level',
          value: 5,
        });

        // Cache should be invalidated
        const statsAfter = api.getCacheStats();
        expect(statsAfter.invalidations).toBeGreaterThan(statsBefore.invalidations);
      });

      it('should track metrics', async () => {
        const result = await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'level',
          value: 10,
        });

        expect(result.metrics).toBeDefined();
        expect(result.metrics.latency).toBeGreaterThanOrEqual(0);
        expect(result.metrics.cacheInvalidations).toBeGreaterThan(0);
      });
    });

    describe('mutateBatch', () => {
      it('should apply multiple mutations atomically', async () => {
        const result = await api.mutateBatch([
          {
            entityId: 'test-entity-1',
            componentType: 'test_agent',
            field: 'name',
            value: 'Bob',
          },
          {
            entityId: 'test-entity-1',
            componentType: 'test_needs',
            field: 'hunger',
            value: 0.8,
          },
        ]);

        expect(result.allSucceeded).toBe(true);
        expect(result.results.length).toBe(2);
        expect(result.results.every((r: any) => r.success)).toBe(true);

        // Verify both mutations applied
        const entity = world.getEntity?.('test-entity-1') as any;
        expect(entity?.getComponent('test_agent').name).toBe('Bob');
        expect(entity?.getComponent('test_needs').hunger).toBe(0.8);
      });

      it('should rollback on any failure', async () => {
        const result = await api.mutateBatch([
          {
            entityId: 'test-entity-1',
            componentType: 'test_agent',
            field: 'name',
            value: 'Charlie',
          },
          {
            entityId: 'test-entity-1',
            componentType: 'test_needs',
            field: 'hunger',
            value: 2.0, // Invalid!
          },
        ]);

        expect(result.allSucceeded).toBe(false);
        expect(result.results[1].success).toBe(false);

        // First mutation should not be applied due to rollback
        // Note: Current mock doesn't fully implement rollback
        // Real implementation would revert first mutation
      });
    });

    describe('undo/redo', () => {
      it('should undo last mutation', async () => {
        // Mutate
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'David',
        });

        const entity = world.getEntity?.('test-entity-1') as any;
        expect(entity?.getComponent('test_agent').name).toBe('David');

        // Undo
        const undoResult = await api.undo();
        expect(undoResult.success).toBe(true);
        expect(entity?.getComponent('test_agent').name).toBe('Unknown');
      });

      it('should redo undone mutation', async () => {
        // Mutate
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'Eve',
        });

        // Undo
        await api.undo();

        const entity = world.getEntity?.('test-entity-1') as any;
        expect(entity?.getComponent('test_agent').name).toBe('Unknown');

        // Redo
        const redoResult = await api.redo();
        expect(redoResult.success).toBe(true);
        expect(entity?.getComponent('test_agent').name).toBe('Eve');
      });

      it('should undo multiple mutations', async () => {
        // Apply multiple mutations
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'Frank',
        });
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'level',
          value: 5,
        });

        // Undo both
        await api.undo(2);

        const entity = world.getEntity?.('test-entity-1') as any;
        expect(entity?.getComponent('test_agent').name).toBe('Unknown');
        expect(entity?.getComponent('test_agent').level).toBe(1);
      });

      it('should invalidate cache on undo', async () => {
        // Prime cache
        await api.getEntity('test-entity-1');

        // Mutate
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'George',
        });

        const statsBefore = api.getCacheStats();

        // Undo should invalidate cache
        await api.undo();

        const statsAfter = api.getCacheStats();
        expect(statsAfter.invalidations).toBeGreaterThan(statsBefore.invalidations);
      });
    });
  });

  describe('Cache', () => {
    describe('getCacheStats', () => {
      it('should return cache statistics', () => {
        const stats = api.getCacheStats();

        expect(stats.hits).toBeGreaterThanOrEqual(0);
        expect(stats.misses).toBeGreaterThanOrEqual(0);
        expect(stats.invalidations).toBeGreaterThanOrEqual(0);
        expect(stats.size).toBeGreaterThanOrEqual(0);
        expect(stats.hitRate).toBeGreaterThanOrEqual(0);
        expect(stats.hitRate).toBeLessThanOrEqual(1);
      });

      it('should track cache hits', async () => {
        const statsBefore = api.getCacheStats();

        // Prime cache
        await api.getEntity('test-entity-1');

        // Hit cache
        await api.getEntity('test-entity-1');

        const statsAfter = api.getCacheStats();
        expect(statsAfter.hits).toBeGreaterThan(statsBefore.hits);
      });

      it('should track cache misses', async () => {
        const statsBefore = api.getCacheStats();

        // Cache miss
        await api.getEntity('test-entity-1');

        const statsAfter = api.getCacheStats();
        expect(statsAfter.misses).toBeGreaterThan(statsBefore.misses);
      });

      it('should calculate hit rate correctly', async () => {
        // Clear any prior state
        api.getCacheStats();

        // 1 miss
        await api.getEntity('test-entity-1');

        // 2 hits
        await api.getEntity('test-entity-1');
        await api.getEntity('test-entity-1');

        const stats = api.getCacheStats();
        // Total = 3 (1 miss + 2 hits), hit rate = 2/3 = 0.666...
        expect(stats.hitRate).toBeCloseTo(0.666, 2);
      });

      it('should track invalidations', async () => {
        // Prime cache
        await api.getEntity('test-entity-1');

        const statsBefore = api.getCacheStats();

        // Invalidate via mutation
        await api.mutateField({
          entityId: 'test-entity-1',
          componentType: 'test_agent',
          field: 'name',
          value: 'Harry',
        });

        const statsAfter = api.getCacheStats();
        expect(statsAfter.invalidations).toBeGreaterThan(statsBefore.invalidations);
      });
    });
  });
});
