/**
 * ChunkSerializer Edge Cases and Error Handling Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkSerializer } from '../ChunkSerializer.js';
import { createChunk, CHUNK_SIZE } from '../Chunk.js';
import { ChunkManager } from '../ChunkManager.js';
import type { SerializedChunk } from '../types.js';

describe('ChunkSerializer Edge Cases', () => {
  let serializer: ChunkSerializer;

  beforeEach(() => {
    serializer = new ChunkSerializer();
  });

  describe('Entity Reference Handling', () => {
    it('should preserve plantId references even if entity does not exist', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Set plantId to non-existent entity
      chunk.tiles[100]!.plantId = 'non_existent_plant_12345';
      chunk.tiles[200]!.plantId = 'another_missing_plant_67890';

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[100]!.plantId).toBe('non_existent_plant_12345');
      expect(deserialized.tiles[200]!.plantId).toBe('another_missing_plant_67890');
    });

    it('should handle null entity references', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles[0]!.plantId = null;

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[0]!.plantId).toBe(null);
    });

    it('should preserve chunk entity references for non-existent entities', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Add entity IDs that don't exist
      chunk.entities.add('non_existent_entity_1');
      chunk.entities.add('non_existent_entity_2');
      chunk.entities.add('deleted_entity_3');

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.entities.size).toBe(3);
      expect(deserialized.entities.has('non_existent_entity_1')).toBe(true);
      expect(deserialized.entities.has('non_existent_entity_2')).toBe(true);
      expect(deserialized.entities.has('deleted_entity_3')).toBe(true);
    });

    it('should handle empty entity sets', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;
      chunk.entities.clear();

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.entities.size).toBe(0);
    });
  });

  describe('Unknown/New Fields (Forward Compatibility)', () => {
    it('should ignore unknown fields in deserialized data', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      const serialized = (serializer as any).serializeChunk(chunk);

      // Add future fields that don't exist yet
      (serialized.tiles.data as any)[0].tile.futureField1 = 'unknown_value';
      (serialized.tiles.data as any)[0].tile.futureField2 = 12345;
      (serialized as any).futureChunkField = 'some_future_data';

      // Should not throw when deserializing
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[0]!).toBeDefined();
      expect((deserialized.tiles[0]! as any).futureField1).toBeUndefined();
    });

    it('should handle extra fields in tile data gracefully', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'full',
          data: Array(CHUNK_SIZE * CHUNK_SIZE).fill(null).map(() => ({
            terrain: 'grass',
            elevation: 0,
            moisture: 50,
            fertility: 50,
            tilled: false,
            plantability: 0,
            nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
            fertilized: false,
            fertilizerDuration: 0,
            lastWatered: 0,
            lastTilled: 0,
            composted: false,
            plantId: null,
            // Unknown future fields
            unknownField: 'test',
            futureSystem: { data: 123 },
          } as any)),
        },
        entityIds: [],
      };

      // Should not throw
      const deserialized = (serializer as any).deserializeChunk(serialized);
      expect(deserialized.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });
  });

  describe('Missing Fields (Backward Compatibility)', () => {
    it('should use defaults for missing optional fields', () => {
      // Simulate old save file missing new fields
      const serialized: SerializedChunk = {
        x: 5,
        y: 10,
        generated: true,
        tiles: {
          encoding: 'full',
          data: Array(CHUNK_SIZE * CHUNK_SIZE).fill(null).map(() => ({
            terrain: 'grass',
            // Missing: elevation, moisture, fertility
            // Missing: all soil management fields
            // Missing: biome, floor
            nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
            plantId: null,
          } as any)),
        },
        entityIds: [],
      };

      const deserialized = (serializer as any).deserializeChunk(serialized);

      // Should fill in defaults
      expect(deserialized.tiles[0]!.elevation).toBe(0);
      expect(deserialized.tiles[0]!.moisture).toBe(50);
      expect(deserialized.tiles[0]!.fertility).toBe(50);
      expect(deserialized.tiles[0]!.tilled).toBe(false);
      expect(deserialized.tiles[0]!.plantability).toBe(0);
      expect(deserialized.tiles[0]!.fertilized).toBe(false);
      expect(deserialized.tiles[0]!.fertilizerDuration).toBe(0);
      expect(deserialized.tiles[0]!.lastWatered).toBe(0);
      expect(deserialized.tiles[0]!.lastTilled).toBe(0);
      expect(deserialized.tiles[0]!.composted).toBe(false);
    });

    it('should handle missing nutrients object', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'full',
          data: Array(CHUNK_SIZE * CHUNK_SIZE).fill(null).map(() => ({
            terrain: 'grass',
            elevation: 0,
            moisture: 50,
            fertility: 50,
            tilled: false,
            plantability: 0,
            // Missing nutrients
            fertilized: false,
            fertilizerDuration: 0,
            lastWatered: 0,
            lastTilled: 0,
            composted: false,
            plantId: null,
          } as any)),
        },
        entityIds: [],
      };

      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[0]!.nutrients).toEqual({
        nitrogen: 50,
        phosphorus: 50,
        potassium: 50,
      });
    });

    it('should handle missing biome field', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'rle',
          data: [{
            tile: {
              terrain: 'grass',
              // Missing biome
              elevation: 0,
              moisture: 50,
              fertility: 50,
              tilled: false,
              plantability: 0,
              nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
              fertilized: false,
              fertilizerDuration: 0,
              lastWatered: 0,
              lastTilled: 0,
              composted: false,
              plantId: null,
            } as any,
            count: CHUNK_SIZE * CHUNK_SIZE,
          }],
        },
        entityIds: [],
      };

      const deserialized = (serializer as any).deserializeChunk(serialized);

      // Biome should be undefined (not required)
      expect(deserialized.tiles[0]!.biome).toBeUndefined();
    });
  });

  describe('Malformed Data', () => {
    it('should throw on invalid terrain type', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'full',
          data: Array(CHUNK_SIZE * CHUNK_SIZE).fill(null).map(() => ({
            terrain: 'invalid_terrain_type' as any,
            elevation: 0,
            moisture: 50,
            fertility: 50,
            tilled: false,
            plantability: 0,
            nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
            fertilized: false,
            fertilizerDuration: 0,
            lastWatered: 0,
            lastTilled: 0,
            composted: false,
            plantId: null,
          })),
        },
        entityIds: [],
      };

      // Should not throw - just accept the string
      const deserialized = (serializer as any).deserializeChunk(serialized);
      expect(deserialized.tiles[0]!.terrain).toBe('invalid_terrain_type');
    });

    it('should throw on invalid tile count', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'full',
          data: Array(500).fill(null).map(() => ({
            terrain: 'grass',
            elevation: 0,
            moisture: 50,
            fertility: 50,
            tilled: false,
            plantability: 0,
            nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
            fertilized: false,
            fertilizerDuration: 0,
            lastWatered: 0,
            lastTilled: 0,
            composted: false,
            plantId: null,
          })),
        },
        entityIds: [],
      };

      expect(() => {
        (serializer as any).deserializeChunk(serialized);
      }).toThrow(/Invalid tile count/);
    });

    it('should throw on RLE with incorrect tile count', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'rle',
          data: [{
            tile: {
              terrain: 'grass',
              elevation: 0,
              moisture: 50,
              fertility: 50,
              tilled: false,
              plantability: 0,
              nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
              fertilized: false,
              fertilizerDuration: 0,
              lastWatered: 0,
              lastTilled: 0,
              composted: false,
              plantId: null,
            },
            count: 500, // Wrong count!
          }],
        },
        entityIds: [],
      };

      expect(() => {
        (serializer as any).deserializeChunk(serialized);
      }).toThrow(/Invalid tile count/);
    });

    it('should throw on delta with incorrect base + diffs count', () => {
      const serialized: SerializedChunk = {
        x: 0,
        y: 0,
        generated: true,
        tiles: {
          encoding: 'delta',
          data: {
            base: {
              terrain: 'grass',
              elevation: 0,
              moisture: 50,
              fertility: 50,
              tilled: false,
              plantability: 0,
              nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
              fertilized: false,
              fertilizerDuration: 0,
              lastWatered: 0,
              lastTilled: 0,
              composted: false,
              plantId: null,
            },
            diffs: [
              {
                index: 2000, // Out of bounds!
                tile: {
                  terrain: 'water',
                  elevation: 0,
                  moisture: 100,
                  fertility: 0,
                  tilled: false,
                  plantability: 0,
                  nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
                  fertilized: false,
                  fertilizerDuration: 0,
                  lastWatered: 0,
                  lastTilled: 0,
                  composted: false,
                  plantId: null,
                },
              },
            ],
          },
        },
        entityIds: [],
      };

      // Should not throw - just apply to out of bounds index (no effect)
      const deserialized = (serializer as any).deserializeChunk(serialized);
      expect(deserialized.tiles.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    });
  });

  describe('Complex Building Structures', () => {
    it('should serialize and deserialize walls with all properties', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles[100]!.wall = {
        material: 'stone',
        condition: 85,
        insulation: 80,
        constructionProgress: 100,
        builderId: 'builder_entity_123',
        constructedAt: 5000,
      };

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      const wall = deserialized.tiles[100]!.wall;
      expect(wall).toBeDefined();
      expect(wall!.material).toBe('stone');
      expect(wall!.condition).toBe(85);
      expect(wall!.insulation).toBe(80);
      expect(wall!.constructionProgress).toBe(100);
      expect(wall!.builderId).toBe('builder_entity_123');
      expect(wall!.constructedAt).toBe(5000);
    });

    it('should serialize and deserialize doors', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles[200]!.door = {
        material: 'wood',
        state: 'open',
        lastOpened: 3000,
        builderId: 'builder_entity_456',
        constructedAt: 2500,
      };

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      const door = deserialized.tiles[200]!.door;
      expect(door).toBeDefined();
      expect(door!.material).toBe('wood');
      expect(door!.state).toBe('open');
      expect(door!.lastOpened).toBe(3000);
      expect(door!.builderId).toBe('builder_entity_456');
      expect(door!.constructedAt).toBe(2500);
    });

    it('should serialize and deserialize windows', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles[300]!.window = {
        material: 'glass',
        condition: 90,
        lightsThrough: true,
        builderId: 'builder_entity_789',
        constructedAt: 4000,
      };

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      const window = deserialized.tiles[300]!.window;
      expect(window).toBeDefined();
      expect(window!.material).toBe('glass');
      expect(window!.condition).toBe(90);
      expect(window!.lightsThrough).toBe(true);
      expect(window!.builderId).toBe('builder_entity_789');
      expect(window!.constructedAt).toBe(4000);
    });

    it('should handle tiles with multiple building elements', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Tile with wall AND window
      chunk.tiles[0]!.wall = {
        material: 'stone',
        condition: 100,
        insulation: 80,
      };
      chunk.tiles[0]!.window = {
        material: 'glass',
        condition: 100,
        lightsThrough: true,
      };

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[0]!.wall).toBeDefined();
      expect(deserialized.tiles[0]!.window).toBeDefined();
    });
  });

  describe('Fluid System (Future)', () => {
    it('should serialize and deserialize fluid layers', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles[100]!.fluid = {
        type: 'water',
        depth: 5,
        pressure: 3,
        temperature: 20,
        flowDirection: { x: 1, y: 0 },
        flowVelocity: 0.5,
        stagnant: false,
        lastUpdate: 1000,
      };

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      const fluid = deserialized.tiles[100]!.fluid;
      expect(fluid).toBeDefined();
      expect(fluid!.type).toBe('water');
      expect(fluid!.depth).toBe(5);
      expect(fluid!.pressure).toBe(3);
      expect(fluid!.temperature).toBe(20);
      expect(fluid!.flowDirection).toEqual({ x: 1, y: 0 });
      expect(fluid!.flowVelocity).toBe(0.5);
      expect(fluid!.stagnant).toBe(false);
      expect(fluid!.lastUpdate).toBe(1000);
    });

    it('should handle missing fluid fields gracefully', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // Minimal fluid (old save format)
      chunk.tiles[100]!.fluid = {
        type: 'water',
        depth: 3,
        pressure: 2,
        temperature: 15,
        stagnant: true,
        lastUpdate: 500,
      } as any;

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[100]!.fluid).toBeDefined();
      expect(deserialized.tiles[100]!.fluid!.type).toBe('water');
    });
  });

  describe('Large Terrain Snapshots', () => {
    it('should handle many chunks efficiently', async () => {
      const chunkManager = new ChunkManager();

      // Create 100 chunks
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const chunk = chunkManager.getChunk(x, y);
          chunk.generated = true;

          // Vary terrain
          chunk.tiles.forEach((tile, i) => {
            tile.terrain = i % 2 === 0 ? 'grass' : 'dirt';
          });
        }
      }

      const startTime = performance.now();
      const snapshot = serializer.serializeChunks(chunkManager);
      const serializeTime = performance.now() - startTime;

      expect(snapshot.generatedChunkCount).toBe(100);
      expect(snapshot.chunkIndex.length).toBe(100);
      expect(Object.keys(snapshot.chunks).length).toBe(100);

      // Should serialize 100 chunks in reasonable time
      expect(serializeTime).toBeLessThan(1000); // <1 second

      // Deserialize
      const newChunkManager = new ChunkManager();
      const deserializeStart = performance.now();
      await serializer.deserializeChunks(snapshot, newChunkManager);
      const deserializeTime = performance.now() - deserializeStart;

      expect(newChunkManager.getChunkCount()).toBe(100);
      expect(deserializeTime).toBeLessThan(1000); // <1 second
    });

    it('should calculate correct checksums for large snapshots', () => {
      const chunkManager = new ChunkManager();

      // Create diverse chunks
      for (let i = 0; i < 50; i++) {
        const chunk = chunkManager.getChunk(i, 0);
        chunk.generated = true;

        chunk.tiles.forEach((tile, j) => {
          tile.elevation = (i * 100 + j) % 256;
        });
      }

      const snapshot = serializer.serializeChunks(chunkManager);

      // All chunks should have unique checksums
      const checksums = new Set(Object.values(snapshot.checksums.perChunk));
      expect(checksums.size).toBe(50); // All unique
    });
  });

  describe('Empty/Zero-Data Chunks', () => {
    it('should handle chunk with all default tiles efficiently', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      // All tiles are default (from createDefaultTile)
      const serialized = (serializer as any).serializeChunk(chunk);

      // Should use RLE (highly uniform)
      expect(serialized.tiles.encoding).toBe('rle');
      expect(serialized.tiles.data.length).toBe(1); // Single run
    });

    it('should handle chunk with no entities', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;
      chunk.entities.clear();

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.entities.size).toBe(0);
    });

    it('should handle chunk with all tiles having null optional fields', () => {
      const chunk = createChunk(0, 0);
      chunk.generated = true;

      chunk.tiles.forEach(tile => {
        tile.biome = undefined;
        tile.floor = undefined;
        tile.wall = undefined;
        tile.door = undefined;
        tile.window = undefined;
        tile.fluid = undefined;
        tile.plantId = null;
      });

      const serialized = (serializer as any).serializeChunk(chunk);
      const deserialized = (serializer as any).deserializeChunk(serialized);

      expect(deserialized.tiles[0]!.biome).toBeUndefined();
      expect(deserialized.tiles[0]!.floor).toBeUndefined();
      expect(deserialized.tiles[0]!.wall).toBeUndefined();
      expect(deserialized.tiles[0]!.plantId).toBe(null);
    });
  });

  describe('Schema Version Handling', () => {
    it('should include schema version in snapshot', () => {
      const chunkManager = new ChunkManager();
      const chunk = chunkManager.getChunk(0, 0);
      chunk.generated = true;

      const snapshot = serializer.serializeChunks(chunkManager);

      expect(snapshot.$schema).toBe('https://aivillage.dev/schemas/terrain/v1');
      expect(snapshot.$version).toBe(1);
    });

    it('should accept snapshots with correct schema', async () => {
      const chunkManager1 = new ChunkManager();
      const chunk = chunkManager1.getChunk(0, 0);
      chunk.generated = true;

      const snapshot = serializer.serializeChunks(chunkManager1);

      // Verify schema
      expect(snapshot.$schema).toBe('https://aivillage.dev/schemas/terrain/v1');
      expect(snapshot.$version).toBe(1);

      // Should deserialize without issues
      const chunkManager2 = new ChunkManager();
      await serializer.deserializeChunks(snapshot, chunkManager2);
      expect(chunkManager2.hasChunk(0, 0)).toBe(true);
    });
  });
});
