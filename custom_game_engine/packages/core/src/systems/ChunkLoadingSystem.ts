import type { System, World, WorldMutator, Entity } from '../index.js';
import type { PositionComponent } from '../components/index.js';
import type { ChunkManager, TerrainGenerator, Chunk } from '@ai-village/world';
import { CHUNK_SIZE } from '@ai-village/world';

/**
 * System that handles chunk loading and terrain generation.
 *
 * In visual mode: loads chunks around camera viewport
 * In headless mode: loads chunks around agents
 *
 * This was extracted from Renderer.ts to enable headless game execution.
 */
export class ChunkLoadingSystem implements System {
  id = 'chunk_loading';
  priority = 5; // Run early, after TimeSystem
  requiredComponents: string[] = [];

  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  private viewportProvider: (() => { x: number; y: number; width: number; height: number } | null) | null = null;
  private tileSize = 16;

  constructor(
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator
  ) {
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
  }

  /**
   * Set the viewport provider for visual mode.
   * If not set or returns null, system operates in headless mode.
   */
  setViewportProvider(provider: () => { x: number; y: number; width: number; height: number } | null): void {
    this.viewportProvider = provider;
  }

  update(world: World): void {
    const viewport = this.viewportProvider?.();

    if (viewport) {
      // Visual mode: load chunks in viewport
      this.loadChunksInViewport(world, viewport);
    } else {
      // Headless mode: load chunks around agents
      this.loadChunksAroundAgents(world);
    }
  }

  private loadChunksInViewport(
    world: World,
    viewport: { x: number; y: number; width: number; height: number }
  ): void {
    const cameraTileX = viewport.x / this.tileSize;
    const cameraTileY = viewport.y / this.tileSize;

    const { loaded } = this.chunkManager.updateLoadedChunks(cameraTileX, cameraTileY);

    for (const chunk of loaded) {
      this.terrainGenerator.generateChunk(chunk, world as WorldMutator);
    }
  }

  private loadChunksAroundAgents(world: World): void {
    // For headless: ensure chunks exist around all agents
    const agents = world.query().with('agent', 'position').executeEntities();

    for (const agent of agents) {
      const pos = agent.getComponent<PositionComponent>('position');
      if (!pos) continue;

      const chunkX = Math.floor(pos.x / CHUNK_SIZE);
      const chunkY = Math.floor(pos.y / CHUNK_SIZE);

      // Load 3x3 grid around agent
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cx = chunkX + dx;
          const cy = chunkY + dy;

          if (!this.chunkManager.hasChunk(cx, cy)) {
            const chunk = this.chunkManager.getChunk(cx, cy);
            if (chunk && !chunk.generated) {
              this.terrainGenerator.generateChunk(chunk, world as WorldMutator);
            }
          }
        }
      }
    }
  }
}
