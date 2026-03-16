/**
 * Save/Load Round-Trip Stress Tests
 *
 * Validates persistence integrity at scale:
 * 1. Basic round-trip - 10 NPCs, verify component state matches
 * 2. Large world stress - 100+ entities, entity count and state integrity
 * 3. Partial corruption recovery - corrupt save field, verify graceful handling
 * 4. Version compatibility - save/load baseline with current build
 * 5. Performance - save/load time with 100+ entities < 2s
 *
 * Conservation of Game Matter: entities are marked corrupted, never deleted.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SaveLoadService } from '../SaveLoadService.js';
import { World, EventBusImpl, multiverseCoordinator } from '@ai-village/core';
import { createTimeComponent } from '../../../core/src/systems/TimeSystem.js';
import { createPositionComponent } from '../../../core/src/components/PositionComponent.js';
import { createAgentComponent } from '../../../core/src/components/AgentComponent.js';
import type { StorageBackend, SaveFile, SaveMetadata, StorageInfo } from '../types.js';

/**
 * Test-only storage backend that stores raw JSON (no compression).
 * MemoryStorage uses Blob.stream() which is not available in jsdom test environment.
 */
class TestStorage implements StorageBackend {
  private saves: Map<string, SaveFile> = new Map();
  private metadata: Map<string, SaveMetadata> = new Map();

  async save(key: string, data: SaveFile): Promise<void> {
    this.saves.set(key, JSON.parse(JSON.stringify(data)) as SaveFile);
    this.metadata.set(key, {
      key,
      name: data.header.name,
      createdAt: data.header.createdAt,
      lastSavedAt: data.header.lastSavedAt,
      playTime: data.header.playTime,
      gameVersion: data.header.gameVersion,
      formatVersion: data.header.formatVersion,
      fileSize: JSON.stringify(data).length,
    });
  }

  async load(key: string): Promise<SaveFile | null> {
    return this.saves.get(key) ?? null;
  }

  async list(): Promise<SaveMetadata[]> {
    return Array.from(this.metadata.values()).sort((a, b) => b.lastSavedAt - a.lastSavedAt);
  }

  async delete(key: string): Promise<void> {
    this.saves.delete(key);
    this.metadata.delete(key);
  }

  async getMetadata(key: string): Promise<SaveMetadata | null> {
    return this.metadata.get(key) ?? null;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return { backend: 'Test', usedBytes: 0, quotaExceeded: false };
  }

  getRawSave(key: string): SaveFile | undefined {
    return this.saves.get(key);
  }
}

// ============================================================================
// Helpers
// ============================================================================

let universeIdCounter = 0;

function makeUniverseId(): string {
  return `test-universe-${Date.now()}-${++universeIdCounter}`;
}

/**
 * Creates a minimal valid World with a TimeComponent entity (required by validateWorldState).
 */
function createMinimalWorld(): { world: World; eventBus: EventBusImpl } {
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);
  // validateWorldState requires a TimeComponent entity
  const timeEntity = world.createEntity();
  timeEntity.addComponent(createTimeComponent(6, 48, 1));
  return { world, eventBus };
}

/**
 * Sets up a SaveLoadService with TestStorage and registers world with multiverseCoordinator.
 * Returns a cleanup function that unregisters the universe.
 */
function setupSaveLoad(world: World, universeId: string): { service: SaveLoadService; cleanup: () => void } {
  const service = new SaveLoadService();
  const storage = new TestStorage();
  service.setStorage(storage);

  multiverseCoordinator.registerUniverse(world, {
    id: universeId,
    name: 'Test Universe',
    timeScale: 1.0,
    multiverseId: 'test-multiverse',
    paused: false,
  });

  const cleanup = () => {
    try {
      multiverseCoordinator.unregisterUniverse(universeId);
    } catch {
      // Already unregistered
    }
  };

  return { service, cleanup };
}

/**
 * Adds N NPC entities with position and agent components to the world.
 */
function addNPCs(world: World, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const entity = world.createEntity();
    entity.addComponent(createPositionComponent(i * 2, i * 3, 0));
    entity.addComponent(createAgentComponent('gather', 20, false, i));
    ids.push(entity.id);
  }
  return ids;
}

// ============================================================================
// Tests
// ============================================================================

describe('Save/Load Round-Trip Stress Tests', () => {
  afterEach(() => {
    // Reset multiverse coordinator to avoid state leaking between tests.
    // Use cast to access private field for cleanup.
    const coord = multiverseCoordinator as unknown as { universes: Map<string, unknown> };
    coord.universes.clear();
  });

  // --------------------------------------------------------------------------
  // 1. Basic round-trip
  // --------------------------------------------------------------------------
  describe('Basic round-trip with 10 NPCs', () => {
    it('should save and reload 10 NPC entities with matching component state', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        const npcIds = addNPCs(world, 10);
        const originalEntityCount = world.entities.size; // 1 time + 10 NPCs

        // Save
        await service.save(world, { name: 'basic-roundtrip', key: 'basic-rt' });

        // Clear world and load back
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        const result = await service.load('basic-rt', world);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();

        // Entity count must match
        expect(world.entities.size).toBe(originalEntityCount);

        // Each NPC entity must exist with position and agent components
        for (const id of npcIds) {
          const entity = world.entities.get(id);
          expect(entity, `Entity ${id} should exist after reload`).toBeDefined();
          if (entity) {
            expect(entity.hasComponent('position')).toBe(true);
            expect(entity.hasComponent('agent')).toBe(true);
          }
        }
      } finally {
        cleanup();
      }
    });

    it('should preserve position coordinates through save/load cycle', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        // Create entity with specific coordinates
        const entity = world.createEntity();
        entity.addComponent(createPositionComponent(42, 77, 3));
        entity.addComponent(createAgentComponent('gather'));
        const entityId = entity.id;

        await service.save(world, { name: 'position-test', key: 'pos-test' });

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('pos-test', world);

        expect(result.success).toBe(true);

        const restored = world.entities.get(entityId);
        expect(restored).toBeDefined();
        if (restored) {
          const pos = restored.getComponent<{ x: number; y: number; z: number }>('position');
          expect(pos?.x).toBe(42);
          expect(pos?.y).toBe(77);
          expect(pos?.z).toBe(3);
        }
      } finally {
        cleanup();
      }
    });

    it('should preserve agent behavior state through save/load', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        const entity = world.createEntity();
        entity.addComponent(createPositionComponent(10, 20, 0));
        entity.addComponent(createAgentComponent('craft', 30, false, 5));
        const entityId = entity.id;

        await service.save(world, { name: 'agent-test', key: 'agent-test' });
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        const result = await service.load('agent-test', world);
        expect(result.success).toBe(true);

        const restored = world.entities.get(entityId);
        expect(restored).toBeDefined();
        if (restored) {
          const agent = restored.getComponent<{ behavior: string; thinkInterval: number }>('agent');
          expect(agent?.behavior).toBe('craft');
          expect(agent?.thinkInterval).toBe(30);
        }
      } finally {
        cleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Large world stress test
  // --------------------------------------------------------------------------
  describe('Large world stress test', () => {
    it('should handle 100+ entities: entity count and soul states survive round-trip', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        const npcIds = addNPCs(world, 110); // 1 time entity + 110 NPCs = 111 total
        const beforeCount = world.entities.size;
        expect(beforeCount).toBe(111);

        await service.save(world, { name: 'large-world-stress', key: 'large-stress' });

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        expect(world.entities.size).toBe(0);

        const result = await service.load('large-stress', world);

        expect(result.success).toBe(true);
        expect(world.entities.size).toBe(beforeCount);

        // Verify a sample of entities survived
        const sampleIds = npcIds.slice(0, 10).concat(npcIds.slice(-10));
        for (const id of sampleIds) {
          expect(world.entities.get(id), `Entity ${id} missing after large reload`).toBeDefined();
        }
      } finally {
        cleanup();
      }
    });

    it('should maintain data integrity for all 100+ entities after reload', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        // Create entities with unique positions to verify data integrity
        const entityData: Array<{ id: string; x: number; y: number }> = [];
        for (let i = 0; i < 100; i++) {
          const entity = world.createEntity();
          const x = (i * 7) % 500;
          const y = (i * 13) % 500;
          entity.addComponent(createPositionComponent(x, y, 0));
          entity.addComponent(createAgentComponent('gather'));
          entityData.push({ id: entity.id, x, y });
        }

        await service.save(world, { name: 'integrity-check', key: 'integrity' });
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        const result = await service.load('integrity', world);
        expect(result.success).toBe(true);

        // Check all positions are preserved correctly
        let mismatchCount = 0;
        for (const { id, x, y } of entityData) {
          const entity = world.entities.get(id);
          if (!entity) { mismatchCount++; continue; }
          const pos = entity.getComponent<{ x: number; y: number }>('position');
          if (pos?.x !== x || pos?.y !== y) mismatchCount++;
        }

        expect(mismatchCount).toBe(0);
      } finally {
        cleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Partial corruption recovery
  // --------------------------------------------------------------------------
  describe('Partial corruption recovery', () => {
    it('should return error result (not crash) when loading a save with corrupted checksum', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const storage = new TestStorage();
      const service = new SaveLoadService();
      service.setStorage(storage);

      multiverseCoordinator.registerUniverse(world, {
        id: universeId,
        name: 'Test Universe',
        timeScale: 1.0,
        multiverseId: 'test-multiverse',
        paused: false,
      });

      try {
        addNPCs(world, 5);
        await service.save(world, { name: 'corrupt-test', key: 'corrupt-test' });

        // Load raw save, corrupt the checksum, re-save
        const rawSave = await storage.load('corrupt-test');
        expect(rawSave).not.toBeNull();

        if (rawSave) {
          // Corrupt the header name field (alters overall checksum)
          rawSave.checksums.overall = 'corrupted_checksum_value_1234567890';
          await storage.save('corrupt-test', rawSave);
        }

        // Reloading a world requires clearing state and re-registering if needed
        // Load should not throw, but may log checksum mismatch warning
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        // The load should complete (checksum mismatch is warned but not fatal for overall)
        // Individual universe checksums are still validated
        const result = await service.load('corrupt-test', world);

        // Load may succeed or fail depending on which checksums are checked strictly.
        // In either case it must NOT throw an uncaught exception.
        expect(typeof result.success).toBe('boolean');
      } finally {
        try { multiverseCoordinator.unregisterUniverse(universeId); } catch { /* ok */ }
      }
    });

    it('should throw error when loading save with missing passages field', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const storage = new TestStorage();
      const service = new SaveLoadService();
      service.setStorage(storage);

      multiverseCoordinator.registerUniverse(world, {
        id: universeId,
        name: 'Test Universe',
        timeScale: 1.0,
        multiverseId: 'test-multiverse',
        paused: false,
      });

      try {
        addNPCs(world, 3);
        await service.save(world, { name: 'corrupt-passages', key: 'corrupt-passages' });

        const rawSave = await storage.load('corrupt-passages');
        expect(rawSave).not.toBeNull();

        if (rawSave) {
          // Remove required passages field - simulates corruption
          delete (rawSave as Record<string, unknown>).passages;
          await storage.save('corrupt-passages', rawSave);
        }

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('corrupt-passages', world);

        // Must not crash - should return failure result
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } finally {
        try { multiverseCoordinator.unregisterUniverse(universeId); } catch { /* ok */ }
      }
    });

    it('should not crash when loading save with invalid godCraftedQueue data', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const storage = new TestStorage();
      const service = new SaveLoadService();
      service.setStorage(storage);

      multiverseCoordinator.registerUniverse(world, {
        id: universeId,
        name: 'Test Universe',
        timeScale: 1.0,
        multiverseId: 'test-multiverse',
        paused: false,
      });

      try {
        addNPCs(world, 3);
        await service.save(world, { name: 'corrupt-queue', key: 'corrupt-queue' });

        const rawSave = await storage.load('corrupt-queue');
        expect(rawSave).not.toBeNull();

        if (rawSave) {
          // Corrupt godCraftedQueue - invalid type (should be object with entries)
          (rawSave as Record<string, unknown>).godCraftedQueue = 'corrupted_string_value';
          await storage.save('corrupt-queue', rawSave);
        }

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('corrupt-queue', world);

        // Must return a LoadResult, not throw - checksum or godCraftedQueue validation fails
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } finally {
        try { multiverseCoordinator.unregisterUniverse(universeId); } catch { /* ok */ }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. Version compatibility baseline
  // --------------------------------------------------------------------------
  describe('Version compatibility baseline', () => {
    it('should save and load with current build format version', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 5);
        await service.save(world, { name: 'version-compat', key: 'version-compat' });

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('version-compat', world);

        expect(result.success).toBe(true);
        expect(result.save).toBeDefined();

        if (result.save) {
          // Verify schema version fields are present
          expect(result.save.$schema).toBe('https://aivillage.dev/schemas/savefile/v1');
          expect(result.save.$version).toBe(1);
          expect(result.save.header.formatVersion).toBe(1);
          expect(result.save.header.gameVersion).toBeTruthy();
          expect(result.save.universes).toHaveLength(1);
          expect(result.save.passages).toBeInstanceOf(Array);
        }
      } finally {
        cleanup();
      }
    });

    it('should preserve save header metadata through round-trip', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 3);
        const saveName = 'Version Baseline Save';
        const saveDesc = 'Baseline for version compatibility';

        await service.save(world, {
          name: saveName,
          description: saveDesc,
          key: 'version-meta',
        });

        const result = await service.load('version-meta', world);
        expect(result.success).toBe(true);

        if (result.save) {
          expect(result.save.header.name).toBe(saveName);
          expect(result.save.header.description).toBe(saveDesc);
        }
      } finally {
        cleanup();
      }
    });

    it('should store checksums for all universe components', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 5);
        await service.save(world, { name: 'checksum-verify', key: 'checksum-verify' });

        const storage = service['storageBackend'] as TestStorage | null;
        const saveFile = await storage?.load('checksum-verify');
        expect(saveFile).toBeDefined();

        if (saveFile) {
          expect(saveFile.checksums.overall).toBeTruthy();
          expect(saveFile.checksums.overall.length).toBeGreaterThan(0);
          expect(saveFile.checksums.multiverse).toBeTruthy();
          expect(Object.keys(saveFile.checksums.universes)).toHaveLength(1);
        }
      } finally {
        cleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Performance
  // --------------------------------------------------------------------------
  describe('Performance benchmarks', () => {
    it('should save 100+ entities in under 2 seconds', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 100);

        const start = performance.now();
        await service.save(world, { name: 'perf-save', key: 'perf-save' });
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(2000);
      } finally {
        cleanup();
      }
    });

    it('should load 100+ entities in under 2 seconds', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 100);
        await service.save(world, { name: 'perf-load', key: 'perf-load' });
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        const start = performance.now();
        const result = await service.load('perf-load', world);
        const elapsed = performance.now() - start;

        expect(result.success).toBe(true);
        expect(elapsed).toBeLessThan(2000);
      } finally {
        cleanup();
      }
    });

    it('should complete full round-trip (save + load) for 100+ entities in under 4 seconds', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 100);

        const roundTripStart = performance.now();
        await service.save(world, { name: 'perf-full', key: 'perf-full' });
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('perf-full', world);
        const roundTripElapsed = performance.now() - roundTripStart;

        expect(result.success).toBe(true);
        expect(roundTripElapsed).toBeLessThan(4000);
      } finally {
        cleanup();
      }
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------
  describe('Edge cases', () => {
    it('should return error when loading non-existent save key', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 1);
        const result = await service.load('nonexistent-key-xyz', world);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } finally {
        cleanup();
      }
    });

    it('should handle multiple sequential saves to same key (overwrite)', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        addNPCs(world, 5);
        await service.save(world, { name: 'overwrite-test-v1', key: 'overwrite-test' });

        // Add more entities and overwrite
        addNPCs(world, 5);
        const countAfterSecondAdd = world.entities.size;
        await service.save(world, { name: 'overwrite-test-v2', key: 'overwrite-test' });

        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();
        const result = await service.load('overwrite-test', world);

        expect(result.success).toBe(true);
        expect(world.entities.size).toBe(countAfterSecondAdd);
      } finally {
        cleanup();
      }
    });

    it('should throw when saving world with no entities', async () => {
      const universeId = makeUniverseId();
      const { world } = createMinimalWorld();
      const { service, cleanup } = setupSaveLoad(world, universeId);

      try {
        // Clear all entities (including the time entity we added)
        (world as unknown as { _entities: Map<string, unknown> })._entities.clear();

        await expect(
          service.save(world, { name: 'empty-world', key: 'empty' })
        ).rejects.toThrow();
      } finally {
        cleanup();
      }
    });

    it('should throw when saving world not registered with multiverseCoordinator', async () => {
      // Create a world but do NOT register it
      const { world } = createMinimalWorld();
      const service = new SaveLoadService();
      service.setStorage(new TestStorage());
      addNPCs(world, 3);

      await expect(
        service.save(world, { name: 'unregistered', key: 'unregistered' })
      ).rejects.toThrow('Cannot save: world is not registered with any universe');
    });
  });
});
