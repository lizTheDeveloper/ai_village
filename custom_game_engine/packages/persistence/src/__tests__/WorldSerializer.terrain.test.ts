/**
 * Integration tests for WorldSerializer terrain serialization
 *
 * Tests the full save/load cycle for terrain data including:
 * - Chunk serialization through WorldSerializer
 * - TerrainSnapshot integration with UniverseSnapshot
 * - Round-trip data integrity
 * - Compression metadata preservation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldSerializer } from '../WorldSerializer.js';
import { World } from '@ai-village/core';
import { EventBusImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import { ChunkManager } from '@ai-village/world';
import type { UniverseSnapshot } from '../types.js';

// Helper: Create test world with ChunkManager
function createTestWorld(): World {
  const eventBus = new EventBusImpl();
  const chunkManager = new ChunkManager(2); // loadRadius = 2
  const world = new World(eventBus, chunkManager);
  return world;
}

// Helper: Generate test terrain in chunks
function generateTestTerrain(chunkManager: ChunkManager, numChunks: number = 5) {
  for (let i = 0; i < numChunks; i++) {
    const chunk = chunkManager.getChunk(i, 0);

    // Mark as generated and fill with test data
    chunk.generated = true;

    // Create varied tile data to test different compression strategies
    for (let j = 0; j < chunk.tiles.length; j++) {
      const tile = chunk.tiles[j];
      if (!tile) continue;

      // Vary terrain based on chunk to test different compressions
      if (i === 0) {
        // Chunk 0: Uniform (will use RLE)
        (tile as any).terrain = 'grass';
        (tile as any).biome = 'plains';
      } else if (i === 1) {
        // Chunk 1: Mostly uniform (will use delta)
        (tile as any).terrain = j < 900 ? 'grass' : 'dirt';
        (tile as any).biome = 'plains';
      } else {
        // Other chunks: Varied (will use full)
        (tile as any).terrain = j % 2 === 0 ? 'grass' : 'dirt';
        (tile as any).biome = j % 3 === 0 ? 'plains' : 'forest';
        (tile as any).elevation = j % 5;
      }

      // Add some test data to verify preservation
      (tile as any).moisture = 50 + (j % 10);
      (tile as any).fertility = 60 + (i * 5);
    }
  }
}

describe('WorldSerializer terrain integration', () => {
  let serializer: WorldSerializer;

  beforeEach(() => {
    serializer = new WorldSerializer();
  });

  it('should serialize terrain when ChunkManager is present', async () => {
    // Setup: Create world with terrain
    const world = createTestWorld();
    const chunkManager = world.getChunkManager()!;
    generateTestTerrain(chunkManager, 3);

    // Act: Serialize world
    const snapshot = await serializer.serializeWorld(
      world as unknown as World,
      'test-universe-id',
      'Test Universe'
    );

    // Assert: Terrain data should be present
    expect(snapshot.worldState.terrain).not.toBeNull();
    expect(snapshot.worldState.terrain?.generatedChunkCount).toBe(3);
    expect(snapshot.worldState.terrain?.chunkIndex).toHaveLength(3);

    // Verify compression strategies were applied
    const chunks = snapshot.worldState.terrain?.chunks;
    expect(chunks).toBeDefined();
    expect(chunks!['0,0']).toBeDefined();
  });

  it('should serialize terrain as null when ChunkManager not set', async () => {
    // Setup: World without ChunkManager
    const eventBus = new EventBusImpl();
    const world = new World(eventBus); // No ChunkManager

    // Act: Serialize world
    const snapshot = await serializer.serializeWorld(
      world as unknown as World,
      'test-universe-id',
      'Test Universe'
    );

    // Assert: Terrain should be null
    expect(snapshot.worldState.terrain).toBeNull();
  });

  it('should restore terrain through full save/load cycle', async () => {
    // Setup: Create world with test terrain
    const sourceWorld = createTestWorld();
    const sourceChunkManager = sourceWorld.getChunkManager()!;
    generateTestTerrain(sourceChunkManager, 5);

    // Remember original data for comparison
    const originalChunk0 = sourceChunkManager.getChunk(0, 0);
    const originalTile0 = originalChunk0.tiles[0];
    const originalTerrain = (originalTile0 as any).terrain;
    const originalMoisture = (originalTile0 as any).moisture;

    // Act 1: Serialize
    const snapshot = await serializer.serializeWorld(
      sourceWorld as unknown as World,
      'test-universe-id',
      'Test Universe'
    );

    // Act 2: Deserialize into new world
    const targetWorld = createTestWorld();
    await serializer.deserializeWorld(snapshot, targetWorld as unknown as World);

    // Assert: Terrain should match original
    const targetChunkManager = targetWorld.getChunkManager()!;
    const restoredChunk0 = targetChunkManager.getChunk(0, 0);
    const restoredTile0 = restoredChunk0.tiles[0];

    expect(restoredChunk0.generated).toBe(true);
    expect((restoredTile0 as any).terrain).toBe(originalTerrain);
    expect((restoredTile0 as any).moisture).toBe(originalMoisture);
  });

  it('should preserve all tile properties through save/load', async () => {
    // Setup: Create chunk with specific tile data
    const world = createTestWorld();
    const chunkManager = world.getChunkManager()!;
    const chunk = chunkManager.getChunk(0, 0);
    chunk.generated = true;

    // Set specific values on first tile
    const tile = chunk.tiles[0] as any;
    tile.terrain = 'dirt';
    tile.biome = 'desert';
    tile.elevation = 5;
    tile.moisture = 25;
    tile.fertility = 75;
    tile.tilled = true;
    tile.plantability = 80;
    tile.fertilized = true;

    // Serialize and deserialize
    const snapshot = await serializer.serializeWorld(world as unknown as World, 'test-id', 'Test');
    const newWorld = createTestWorld();
    await serializer.deserializeWorld(snapshot, newWorld as unknown as World);

    // Assert: All properties preserved
    const restoredTile = newWorld.getChunkManager()!.getChunk(0, 0).tiles[0] as any;
    expect(restoredTile.terrain).toBe('dirt');
    expect(restoredTile.biome).toBe('desert');
    expect(restoredTile.elevation).toBe(5);
    expect(restoredTile.moisture).toBe(25);
    expect(restoredTile.fertility).toBe(75);
    expect(restoredTile.tilled).toBe(true);
    expect(restoredTile.plantability).toBe(80);
    expect(restoredTile.fertilized).toBe(true);
  });

  it('should preserve chunk count and indices', async () => {
    // Setup: Generate specific number of chunks
    const world = createTestWorld();
    const chunkManager = world.getChunkManager()!;
    generateTestTerrain(chunkManager, 7);

    // Serialize
    const snapshot = await serializer.serializeWorld(world as unknown as World, 'test-id', 'Test');

    // Assert: Metadata matches
    expect(snapshot.worldState.terrain?.generatedChunkCount).toBe(7);
    expect(snapshot.worldState.terrain?.chunkIndex).toHaveLength(7);

    // Verify each chunk is indexed correctly
    const indices = snapshot.worldState.terrain?.chunkIndex!;
    expect(indices.find(idx => idx.key === '0,0')).toBeDefined();
    expect(indices.find(idx => idx.key === '6,0')).toBeDefined();
  });

  it('should handle empty ChunkManager gracefully', async () => {
    // Setup: World with ChunkManager but no generated chunks
    const world = createTestWorld();

    // Act: Serialize
    const snapshot = await serializer.serializeWorld(world as unknown as World, 'test-id', 'Test');

    // Assert: Terrain data should exist but be empty
    expect(snapshot.worldState.terrain).not.toBeNull();
    expect(snapshot.worldState.terrain?.generatedChunkCount).toBe(0);
    expect(snapshot.worldState.terrain?.chunkIndex).toHaveLength(0);
  });

  it('should not interfere with entity serialization', async () => {
    // Setup: World with both terrain and entities
    const world = createTestWorld();
    const chunkManager = world.getChunkManager()!;
    generateTestTerrain(chunkManager, 2);

    // Add a test entity
    const entity = world.createEntity();

    // Serialize
    const snapshot = await serializer.serializeWorld(world as unknown as World, 'test-id', 'Test');

    // Assert: Both terrain and entities present
    expect(snapshot.worldState.terrain).not.toBeNull();
    expect(snapshot.entities.length).toBe(1);
    expect(snapshot.entities[0]!.id).toBe(entity.id);
  });

  it('should include terrain checksums in snapshot', async () => {
    // Setup
    const world = createTestWorld();
    const chunkManager = world.getChunkManager()!;
    generateTestTerrain(chunkManager, 3);

    // Serialize
    const snapshot = await serializer.serializeWorld(world as unknown as World, 'test-id', 'Test');

    // Assert: Checksums present
    expect(snapshot.worldState.terrain?.checksums).toBeDefined();
    expect(snapshot.worldState.terrain?.checksums.overall).toBeDefined();
    expect(snapshot.worldState.terrain?.checksums.perChunk).toBeDefined();
    expect(Object.keys(snapshot.worldState.terrain?.checksums.perChunk!)).toHaveLength(3);
  });
});
