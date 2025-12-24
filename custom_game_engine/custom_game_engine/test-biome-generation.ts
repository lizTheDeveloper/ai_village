import { TerrainGenerator } from './packages/world/src/terrain/TerrainGenerator.js';
import { Chunk } from './packages/world/src/chunks/Chunk.js';

const generator = new TerrainGenerator('test');
const chunk: Chunk = {
  x: 0,
  y: 0,
  tiles: new Array(32 * 32),
  generated: false,
};

generator.generateChunk(chunk);

// Check first few tiles
for (let i = 0; i < 5; i++) {
  const tile = chunk.tiles[i];
  console.log(`Tile ${i}:`, {
    terrain: tile.terrain,
    biome: tile.biome,
    fertility: tile.fertility,
  });
}
