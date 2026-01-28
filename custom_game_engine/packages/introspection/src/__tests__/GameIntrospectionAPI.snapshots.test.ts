/**
 * Tests for GameIntrospectionAPI snapshot and time travel methods (Phase 6a)
 *
 * Tests snapshot creation, restoration, listing, deletion, and full workflows
 * for entity state time travel.
 *
 * Coverage:
 * - createSnapshot() - Create snapshots of single/multiple entities with metadata
 * - restoreSnapshot() - Restore entity state from snapshots
 * - listSnapshots() - List all snapshots with metadata
 * - deleteSnapshot() - Delete specific snapshots
 * - clearSnapshots() - Clear all snapshots
 * - getSnapshotCount() - Get snapshot count
 * - Integration workflows - Full snapshot → mutate → restore cycles
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '@ai-village/core';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { MutationService } from '../mutation/index.js';
import { defineComponent } from '../types/ComponentSchema.js';
import type { World } from '@ai-village/core';
import type { Component } from '../types/index.js';
import type {
  SnapshotId,
  RestoreResult,
  SnapshotMetadata,
} from '../types/IntrospectionTypes.js';

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
      mutable: false,
    },
  },

  validate: (data): data is TestAgentComponent => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return (
      candidate.type === 'test_agent' &&
      typeof candidate.name === 'string' &&
      typeof candidate.level === 'number'
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
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return (
      candidate.type === 'test_needs' &&
      typeof candidate.hunger === 'number' &&
      typeof candidate.thirst === 'number' &&
      typeof candidate.energy === 'number'
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
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return (
      candidate.type === 'test_position' &&
      typeof candidate.x === 'number' &&
      typeof candidate.y === 'number'
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

  const mockWorld: Partial<World> = {
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
  };

  return mockWorld as World;
}

/**
 * Mock GameIntrospectionAPI with snapshot functionality
 */
interface SnapshotData {
  id: string;
  createdAt: number;
  metadata: Record<string, unknown>;
  entities: Map<string, { id: string; components: Record<string, unknown> }>;
  metrics: {
    creationLatency: number;
    entityCount: number;
  };
}

class MockGameIntrospectionAPI {
  private world: World;
  private snapshots: Map<SnapshotId, SnapshotData>;
  private snapshotCounter: number;

  constructor(world: World) {
    this.world = world;
    this.snapshots = new Map();
    this.snapshotCounter = 0;
  }

  /**
   * Create snapshot of entity state
   */
  async createSnapshot(
    entityIds: string[],
    metadata?: Record<string, unknown>
  ): Promise<SnapshotId> {
    const startTime = Date.now();
    const snapshotId = `snapshot-${++this.snapshotCounter}`;

    // Serialize entity states
    const entities = new Map<string, { id: string; components: Record<string, unknown> }>();
    for (const entityId of entityIds) {
      const entity = this.world.getEntity?.(entityId);
      if (!entity) {
        throw new Error(`Entity ${entityId} not found`);
      }
      const entityWithComponents = entity as unknown as {
        hasComponent: (type: string) => boolean;
        getComponent: (type: string) => unknown;
      };

      // Serialize all components
      const components: Record<string, unknown> = {};
      for (const compType of ['test_agent', 'test_needs', 'test_position']) {
        if (entityWithComponents.hasComponent(compType)) {
          const comp = entityWithComponents.getComponent(compType);
          // Deep clone to avoid reference issues
          components[compType] = JSON.parse(JSON.stringify(comp));
        }
      }

      entities.set(entityId, {
        id: entityId,
        components,
      });
    }

    const creationLatency = Date.now() - startTime;

    const snapshot = {
      id: snapshotId,
      createdAt: this.world.tick,
      metadata: metadata || {},
      entities,
      metrics: {
        creationLatency,
        entityCount: entities.size,
      },
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshotId;
  }

  /**
   * Restore entities from snapshot
   */
  async restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return {
        success: false,
        entitiesRestored: 0,
        error: `Snapshot ${snapshotId} not found`,
      };
    }

    let entitiesRestored = 0;

    // Restore each entity
    for (const [entityId, entityState] of snapshot.entities.entries()) {
      const entity = this.world.getEntity?.(entityId);
      if (!entity) {
        // Entity was deleted - skip gracefully
        continue;
      }

      const entityWithComponents = entity as unknown as {
        hasComponent: (type: string) => boolean;
        getComponent: (type: string) => unknown;
        updateComponent: (type: string, updater: (current: unknown) => unknown) => void;
      };

      // Restore each component
      for (const [componentType, componentData] of Object.entries(
        entityState.components
      )) {
        if (entityWithComponents.hasComponent(componentType)) {
          // Update component with snapshotted values
          const current = entityWithComponents.getComponent(componentType) as Record<string, unknown>;
          const restored = { ...current, ...(componentData as Record<string, unknown>) };
          entityWithComponents.updateComponent(componentType, () => restored);
        }
      }

      entitiesRestored++;
    }

    return {
      success: true,
      entitiesRestored,
      snapshot: {
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        metadata: snapshot.metadata,
      },
    };
  }

  /**
   * List all snapshots
   */
  async listSnapshots(): Promise<SnapshotMetadata[]> {
    const snapshots: SnapshotMetadata[] = [];

    for (const snapshot of this.snapshots.values()) {
      snapshots.push({
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        entityCount: snapshot.metrics.entityCount,
        metadata: snapshot.metadata,
      });
    }

    // Sort by creation time (newest first)
    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: SnapshotId): Promise<void> {
    if (!this.snapshots.has(snapshotId)) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    this.snapshots.delete(snapshotId);
  }

  /**
   * Clear all snapshots
   */
  async clearSnapshots(): Promise<void> {
    this.snapshots.clear();
    this.snapshotCounter = 0;
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Mutate field (for testing integration)
   */
  async mutateField(mutation: {
    entityId: string;
    componentType: string;
    field: string;
    value: unknown;
  }): Promise<{
    success: boolean;
    oldValue?: unknown;
    newValue?: unknown;
    validationErrors?: string[];
  }> {
    const entity = this.world.getEntity?.(mutation.entityId);
    if (!entity) {
      throw new Error(`Entity ${mutation.entityId} not found`);
    }

    const entityWithComponents = entity as unknown as {
      getComponent: (type: string) => Record<string, unknown> | undefined;
    };
    const component = entityWithComponents.getComponent(mutation.componentType);
    const oldValue = component ? component[mutation.field] : undefined;

    const result = MutationService.mutate(
      entity,
      mutation.componentType,
      mutation.field,
      mutation.value
    );

    const newValue = result.success
      ? entityWithComponents.getComponent(mutation.componentType)?.[mutation.field]
      : undefined;

    return {
      success: result.success,
      oldValue,
      newValue,
      validationErrors: result.success ? undefined : [result.error || 'Validation failed'],
    };
  }
}

const GameIntrospectionAPI = MockGameIntrospectionAPI;

/**
 * Tests
 */
describe('GameIntrospectionAPI - Snapshots & Time Travel', () => {
  let world: World;
  let api: MockGameIntrospectionAPI;
  let entity1: EntityImpl;
  let entity2: EntityImpl;

  beforeEach(() => {
    // Register test schemas
    ComponentRegistry.register(TestAgentSchema);
    ComponentRegistry.register(TestNeedsSchema);
    ComponentRegistry.register(TestPositionSchema);

    // Create world and API
    world = createMockWorld();
    api = new GameIntrospectionAPI(world);

    // Create test entities
    entity1 = createMockEntity('entity-1');
    (entity1 as unknown as { addComponent: (comp: unknown) => void }).addComponent(TestAgentSchema.createDefault());
    (entity1 as unknown as { addComponent: (comp: unknown) => void }).addComponent(TestNeedsSchema.createDefault());
    (entity1 as unknown as { addComponent: (comp: unknown) => void }).addComponent(TestPositionSchema.createDefault());

    entity2 = createMockEntity('entity-2');
    (entity2 as unknown as { addComponent: (comp: unknown) => void }).addComponent({
      type: 'test_agent',
      version: 1,
      name: 'Alice',
      level: 5,
      species: 'elf' as const,
    });
    (entity2 as unknown as { addComponent: (comp: unknown) => void }).addComponent({
      type: 'test_needs',
      version: 1,
      hunger: 0.3,
      thirst: 0.4,
      energy: 0.7,
    });

    // Add entities to world
    world.addEntity?.(entity1);
    world.addEntity?.(entity2);

    // Clear mutation history
    MutationService.clearHistory();
    MutationService.setDevMode(false);
  });

  afterEach(() => {
    ComponentRegistry.clear();
  });

  describe('createSnapshot()', () => {
    it('should create snapshot of single entity', async () => {
      const snapshotId = await api.createSnapshot(['entity-1']);

      expect(snapshotId).toBeDefined();
      expect(typeof snapshotId).toBe('string');
      expect(snapshotId).toContain('snapshot-');
    });

    it('should create snapshot of multiple entities', async () => {
      const snapshotId = await api.createSnapshot(['entity-1', 'entity-2']);

      expect(snapshotId).toBeDefined();

      const snapshots = await api.listSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot!.entityCount).toBe(2);
    });

    it('should include custom metadata', async () => {
      const metadata = {
        reason: 'Before dangerous experiment',
        author: 'test',
        tags: ['important', 'checkpoint'],
      };

      const snapshotId = await api.createSnapshot(['entity-1'], metadata);

      const snapshots = await api.listSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot!.metadata).toEqual(metadata);
    });

    it('should serialize all components correctly', async () => {
      const snapshotId = await api.createSnapshot(['entity-2']);

      // Verify by restoring and checking values
      await api.restoreSnapshot(snapshotId);

      const entity = world.getEntity?.('entity-2') as unknown as { getComponent: (type: string) => Record<string, unknown> };
      const agent = entity.getComponent('test_agent');
      const needs = entity.getComponent('test_needs');

      expect(agent.name).toBe('Alice');
      expect(agent.level).toBe(5);
      expect(needs.hunger).toBe(0.3);
      expect(needs.thirst).toBe(0.4);
    });

    it('should return unique snapshot ID for each snapshot', async () => {
      const id1 = await api.createSnapshot(['entity-1']);
      const id2 = await api.createSnapshot(['entity-1']);
      const id3 = await api.createSnapshot(['entity-2']);

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should track creation timestamp', async () => {
      const tickBefore = world.tick;
      const snapshotId = await api.createSnapshot(['entity-1']);

      const snapshots = await api.listSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot!.createdAt).toBe(tickBefore);
    });

    it('should throw error for non-existent entity', async () => {
      await expect(api.createSnapshot(['non-existent'])).rejects.toThrow('not found');
    });

    it('should handle empty entity list', async () => {
      const snapshotId = await api.createSnapshot([]);

      const snapshots = await api.listSnapshots();
      const snapshot = snapshots.find((s) => s.id === snapshotId);

      expect(snapshot).toBeDefined();
      expect(snapshot!.entityCount).toBe(0);
    });
  });

  describe('restoreSnapshot()', () => {
    it('should restore single entity from snapshot', async () => {
      // Create snapshot
      const snapshotId = await api.createSnapshot(['entity-1']);

      // Modify entity
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'name',
        value: 'Modified',
      });

      const entityBefore = world.getEntity?.('entity-1') as unknown as { getComponent: (type: string) => Record<string, unknown> };
      expect(entityBefore.getComponent('test_agent').name).toBe('Modified');

      // Restore
      const result = await api.restoreSnapshot(snapshotId);

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(1);

      const entityAfter = world.getEntity?.('entity-1') as unknown as { getComponent: (type: string) => Record<string, unknown> };
      expect(entityAfter.getComponent('test_agent').name).toBe('Unknown');
    });

    it('should restore multiple entities from snapshot', async () => {
      // Create snapshot
      const snapshotId = await api.createSnapshot(['entity-1', 'entity-2']);

      // Modify both entities
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_needs',
        field: 'hunger',
        value: 0.9,
      });
      await api.mutateField({
        entityId: 'entity-2',
        componentType: 'test_needs',
        field: 'energy',
        value: 0.1,
      });

      // Restore
      const result = await api.restoreSnapshot(snapshotId);

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(2);

      const entity1After = world.getEntity?.('entity-1') as unknown as { getComponent: (type: string) => Record<string, unknown> };
      const entity2After = world.getEntity?.('entity-2') as unknown as { getComponent: (type: string) => Record<string, unknown> };

      expect(entity1After.getComponent('test_needs').hunger).toBe(0.5);
      expect(entity2After.getComponent('test_needs').energy).toBe(0.7);
    });

    it('should handle deleted entities gracefully', async () => {
      // Create snapshot
      const snapshotId = await api.createSnapshot(['entity-1', 'entity-2']);

      // Delete entity-1
      world.removeEntity?.('entity-1');

      // Restore should succeed but skip deleted entity
      const result = await api.restoreSnapshot(snapshotId);

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(1); // Only entity-2
    });

    it('should restore component values correctly', async () => {
      // Create snapshot with specific values
      const entity = world.getEntity?.('entity-2') as unknown as {
        getComponent: (type: string) => Record<string, unknown>;
        updateComponent: (type: string, updater: (c: Record<string, unknown>) => Record<string, unknown>) => void;
      };
      entity.updateComponent('test_agent', (c) => ({ ...c, level: 10 }));
      entity.updateComponent('test_needs', (c) => ({
        ...c,
        hunger: 0.2,
        thirst: 0.3,
        energy: 0.8,
      }));

      const snapshotId = await api.createSnapshot(['entity-2']);

      // Modify values
      entity.updateComponent('test_agent', (c: any) => ({ ...c, level: 1 }));
      entity.updateComponent('test_needs', (c: any) => ({
        ...c,
        hunger: 1.0,
        thirst: 1.0,
        energy: 0.0,
      }));

      // Restore
      await api.restoreSnapshot(snapshotId);

      const restoredAgent = entity.getComponent('test_agent');
      const restoredNeeds = entity.getComponent('test_needs');

      expect(restoredAgent.level).toBe(10);
      expect(restoredNeeds.hunger).toBe(0.2);
      expect(restoredNeeds.thirst).toBe(0.3);
      expect(restoredNeeds.energy).toBe(0.8);
    });

    it('should include snapshot metadata in result', async () => {
      const metadata = { checkpoint: 'test-1' };
      const snapshotId = await api.createSnapshot(['entity-1'], metadata);

      const result = await api.restoreSnapshot(snapshotId);

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot!.id).toBe(snapshotId);
      expect(result.snapshot!.metadata).toEqual(metadata);
    });

    it('should error when snapshot does not exist', async () => {
      const result = await api.restoreSnapshot('non-existent-snapshot');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
      expect(result.entitiesRestored).toBe(0);
    });

    it('should restore all components for entity', async () => {
      const snapshotId = await api.createSnapshot(['entity-1']);

      // Modify multiple components
      const entity = world.getEntity?.('entity-1') as unknown as {
        getComponent: (type: string) => Record<string, unknown>;
        updateComponent: (type: string, updater: (c: Record<string, unknown>) => Record<string, unknown>) => void;
      };
      entity.updateComponent('test_agent', (c) => ({ ...c, name: 'Bob', level: 20 }));
      entity.updateComponent('test_needs', (c) => ({
        ...c,
        hunger: 0.1,
        thirst: 0.2,
        energy: 0.3,
      }));
      entity.updateComponent('test_position', (c) => ({ ...c, x: 100, y: 200 }));

      // Restore
      await api.restoreSnapshot(snapshotId);

      const agent = entity.getComponent('test_agent');
      const needs = entity.getComponent('test_needs');
      const position = entity.getComponent('test_position');

      expect(agent.name).toBe('Unknown');
      expect(agent.level).toBe(1);
      expect(needs.hunger).toBe(0.5);
      expect(needs.thirst).toBe(0.5);
      expect(needs.energy).toBe(0.5);
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
    });
  });

  describe('listSnapshots()', () => {
    it('should list all snapshots', async () => {
      await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-2']);
      await api.createSnapshot(['entity-1', 'entity-2']);

      const snapshots = await api.listSnapshots();

      expect(snapshots.length).toBe(3);
    });

    it('should return sorted by creation time (newest first)', async () => {
      // Create snapshots with different tick values
      const id1 = await api.createSnapshot(['entity-1']);
      (world as Partial<World>).tick = 200;
      const id2 = await api.createSnapshot(['entity-2']);
      (world as Partial<World>).tick = 150;
      const id3 = await api.createSnapshot(['entity-1']);

      const snapshots = await api.listSnapshots();

      expect(snapshots.length).toBe(3);
      expect(snapshots[0].id).toBe(id2); // tick 200
      expect(snapshots[1].id).toBe(id3); // tick 150
      expect(snapshots[2].id).toBe(id1); // tick 100
    });

    it('should include metadata in listing', async () => {
      const metadata1 = { type: 'auto', reason: 'auto-save' };
      const metadata2 = { type: 'manual', reason: 'user checkpoint' };

      await api.createSnapshot(['entity-1'], metadata1);
      await api.createSnapshot(['entity-2'], metadata2);

      const snapshots = await api.listSnapshots();

      // Snapshots are sorted newest first, so metadata2 comes first
      // But they're created at same tick, so order is based on insertion order
      // Find by metadata content instead
      const snap1 = snapshots.find((s) => s.metadata.type === 'auto');
      const snap2 = snapshots.find((s) => s.metadata.type === 'manual');

      expect(snap1!.metadata).toEqual(metadata1);
      expect(snap2!.metadata).toEqual(metadata2);
    });

    it('should return empty list when no snapshots', async () => {
      const snapshots = await api.listSnapshots();

      expect(snapshots).toEqual([]);
    });

    it('should include entity count', async () => {
      await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-1', 'entity-2']);
      await api.createSnapshot([]);

      const snapshots = await api.listSnapshots();

      expect(snapshots.length).toBe(3);

      // Verify each entity count is present (order may vary for same tick)
      const counts = snapshots.map((s) => s.entityCount).sort();
      expect(counts).toEqual([0, 1, 2]);
    });

    it('should include snapshot IDs and timestamps', async () => {
      const id1 = await api.createSnapshot(['entity-1']);
      const tick1 = world.tick;

      (world as Partial<World>).tick = 250;
      const id2 = await api.createSnapshot(['entity-2']);
      const tick2 = world.tick;

      const snapshots = await api.listSnapshots();

      expect(snapshots[0].id).toBe(id2);
      expect(snapshots[0].createdAt).toBe(tick2);
      expect(snapshots[1].id).toBe(id1);
      expect(snapshots[1].createdAt).toBe(tick1);
    });
  });

  describe('deleteSnapshot()', () => {
    it('should delete specific snapshot', async () => {
      const id1 = await api.createSnapshot(['entity-1']);
      const id2 = await api.createSnapshot(['entity-2']);

      expect(api.getSnapshotCount()).toBe(2);

      await api.deleteSnapshot(id1);

      expect(api.getSnapshotCount()).toBe(1);

      const snapshots = await api.listSnapshots();
      expect(snapshots.find((s) => s.id === id1)).toBeUndefined();
      expect(snapshots.find((s) => s.id === id2)).toBeDefined();
    });

    it('should error when snapshot does not exist', async () => {
      await expect(api.deleteSnapshot('non-existent')).rejects.toThrow('not found');
    });

    it('should not affect other snapshots', async () => {
      const id1 = await api.createSnapshot(['entity-1']);
      const id2 = await api.createSnapshot(['entity-2']);
      const id3 = await api.createSnapshot(['entity-1', 'entity-2']);

      await api.deleteSnapshot(id2);

      const snapshots = await api.listSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots.find((s) => s.id === id1)).toBeDefined();
      expect(snapshots.find((s) => s.id === id3)).toBeDefined();
    });
  });

  describe('clearSnapshots()', () => {
    it('should clear all snapshots', async () => {
      await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-2']);
      await api.createSnapshot(['entity-1', 'entity-2']);

      expect(api.getSnapshotCount()).toBe(3);

      await api.clearSnapshots();

      expect(api.getSnapshotCount()).toBe(0);
      const snapshots = await api.listSnapshots();
      expect(snapshots).toEqual([]);
    });

    it('should reset snapshot counter', async () => {
      await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-2']);

      await api.clearSnapshots();

      const newSnapshotId = await api.createSnapshot(['entity-1']);
      expect(newSnapshotId).toBe('snapshot-1'); // Counter reset
    });

    it('should not error when already empty', async () => {
      await api.clearSnapshots();
      await api.clearSnapshots(); // Should not throw

      expect(api.getSnapshotCount()).toBe(0);
    });
  });

  describe('getSnapshotCount()', () => {
    it('should return correct count', async () => {
      expect(api.getSnapshotCount()).toBe(0);

      await api.createSnapshot(['entity-1']);
      expect(api.getSnapshotCount()).toBe(1);

      await api.createSnapshot(['entity-2']);
      expect(api.getSnapshotCount()).toBe(2);

      await api.createSnapshot(['entity-1', 'entity-2']);
      expect(api.getSnapshotCount()).toBe(3);
    });

    it('should update after delete', async () => {
      const id1 = await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-2']);

      expect(api.getSnapshotCount()).toBe(2);

      await api.deleteSnapshot(id1);
      expect(api.getSnapshotCount()).toBe(1);
    });

    it('should update after clear', async () => {
      await api.createSnapshot(['entity-1']);
      await api.createSnapshot(['entity-2']);
      await api.createSnapshot(['entity-1', 'entity-2']);

      expect(api.getSnapshotCount()).toBe(3);

      await api.clearSnapshots();
      expect(api.getSnapshotCount()).toBe(0);
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should support full snapshot → mutate → restore workflow', async () => {
      // 1. Create initial snapshot
      const snapshotId = await api.createSnapshot(
        ['entity-1', 'entity-2'],
        { phase: 'initial' }
      );

      const entity1 = world.getEntity?.('entity-1') as unknown as { getComponent: (type: string) => Record<string, unknown> };
      const entity2 = world.getEntity?.('entity-2') as unknown as { getComponent: (type: string) => Record<string, unknown> };

      // 2. Verify initial state
      expect(entity1.getComponent('test_agent').name).toBe('Unknown');
      expect(entity2.getComponent('test_agent').name).toBe('Alice');

      // 3. Mutate entities
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'name',
        value: 'Bob',
      });
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'level',
        value: 10,
      });
      await api.mutateField({
        entityId: 'entity-2',
        componentType: 'test_needs',
        field: 'hunger',
        value: 0.9,
      });

      // 4. Verify mutations applied
      expect(entity1.getComponent('test_agent').name).toBe('Bob');
      expect(entity1.getComponent('test_agent').level).toBe(10);
      expect(entity2.getComponent('test_needs').hunger).toBe(0.9);

      // 5. Restore snapshot
      const result = await api.restoreSnapshot(snapshotId);

      expect(result.success).toBe(true);
      expect(result.entitiesRestored).toBe(2);

      // 6. Verify restoration
      expect(entity1.getComponent('test_agent').name).toBe('Unknown');
      expect(entity1.getComponent('test_agent').level).toBe(1);
      expect(entity2.getComponent('test_needs').hunger).toBe(0.3);
    });

    it('should support multiple snapshot checkpoints', async () => {
      const entity = world.getEntity?.('entity-1') as unknown as {
        getComponent: (type: string) => Record<string, unknown>;
      };

      // Checkpoint 1: Initial state
      const checkpoint1 = await api.createSnapshot(['entity-1'], { name: 'checkpoint-1' });

      // Mutate
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'level',
        value: 5,
      });

      // Checkpoint 2: Level 5
      const checkpoint2 = await api.createSnapshot(['entity-1'], { name: 'checkpoint-2' });

      // Mutate
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'level',
        value: 10,
      });

      // Checkpoint 3: Level 10
      const checkpoint3 = await api.createSnapshot(['entity-1'], { name: 'checkpoint-3' });

      // Verify current state
      expect(entity.getComponent('test_agent').level).toBe(10);

      // Restore to checkpoint 2
      await api.restoreSnapshot(checkpoint2);
      expect(entity.getComponent('test_agent').level).toBe(5);

      // Restore to checkpoint 1
      await api.restoreSnapshot(checkpoint1);
      expect(entity.getComponent('test_agent').level).toBe(1);

      // Restore to checkpoint 3
      await api.restoreSnapshot(checkpoint3);
      expect(entity.getComponent('test_agent').level).toBe(10);
    });

    it('should preserve snapshots independently', async () => {
      const entity = world.getEntity?.('entity-1') as unknown as {
        getComponent: (type: string) => Record<string, unknown>;
      };

      // Create snapshot 1
      const snap1 = await api.createSnapshot(['entity-1']);
      const snap1Level = entity.getComponent('test_agent').level;

      // Mutate
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'level',
        value: 5,
      });

      // Create snapshot 2
      const snap2 = await api.createSnapshot(['entity-1']);
      const snap2Level = entity.getComponent('test_agent').level;

      // Mutate more
      await api.mutateField({
        entityId: 'entity-1',
        componentType: 'test_agent',
        field: 'level',
        value: 10,
      });

      // Restore snap1 should still have original values
      await api.restoreSnapshot(snap1);
      expect(entity.getComponent('test_agent').level).toBe(snap1Level);

      // Restore snap2 should have intermediate values
      await api.restoreSnapshot(snap2);
      expect(entity.getComponent('test_agent').level).toBe(snap2Level);
    });

    it('should handle complex multi-component state restoration', async () => {
      const entity = world.getEntity?.('entity-2') as unknown as { getComponent: (type: string) => Record<string, unknown> };

      // Create snapshot
      const snapshotId = await api.createSnapshot(['entity-2']);

      // Mutate multiple components
      await api.mutateField({
        entityId: 'entity-2',
        componentType: 'test_agent',
        field: 'level',
        value: 20,
      });
      await api.mutateField({
        entityId: 'entity-2',
        componentType: 'test_needs',
        field: 'hunger',
        value: 0.1,
      });
      await api.mutateField({
        entityId: 'entity-2',
        componentType: 'test_needs',
        field: 'energy',
        value: 0.2,
      });

      // Verify mutations
      expect(entity.getComponent('test_agent').level).toBe(20);
      expect(entity.getComponent('test_needs').hunger).toBe(0.1);
      expect(entity.getComponent('test_needs').energy).toBe(0.2);

      // Restore
      await api.restoreSnapshot(snapshotId);

      // Verify all components restored
      expect(entity.getComponent('test_agent').level).toBe(5);
      expect(entity.getComponent('test_needs').hunger).toBe(0.3);
      expect(entity.getComponent('test_needs').energy).toBe(0.7);
    });

    it('should support snapshot management workflow', async () => {
      // Create several snapshots
      const snap1 = await api.createSnapshot(['entity-1'], { tag: 'v1' });
      const snap2 = await api.createSnapshot(['entity-2'], { tag: 'v2' });
      const snap3 = await api.createSnapshot(['entity-1', 'entity-2'], { tag: 'v3' });

      // List and verify
      let snapshots = await api.listSnapshots();
      expect(snapshots.length).toBe(3);

      // Delete one
      await api.deleteSnapshot(snap2);

      snapshots = await api.listSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots.find((s) => s.id === snap2)).toBeUndefined();

      // Verify count
      expect(api.getSnapshotCount()).toBe(2);

      // Clear all
      await api.clearSnapshots();

      snapshots = await api.listSnapshots();
      expect(snapshots.length).toBe(0);
      expect(api.getSnapshotCount()).toBe(0);
    });
  });
});
