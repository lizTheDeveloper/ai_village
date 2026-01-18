import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { PositionComponent } from '../components/index.js';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';
import { CHUNK_SIZE } from '@ai-village/world';

/**
 * System that handles chunk loading and terrain generation.
 *
 * In visual mode: loads chunks around camera viewport
 * In headless mode: loads chunks around agents
 *
 * This was extracted from Renderer.ts to enable headless game execution.
 */
export class ChunkLoadingSystem extends BaseSystem {
  readonly id = 'chunk_loading';
  readonly priority = 5; // Run early, after TimeSystem
  readonly requiredComponents: string[] = [];

  // Throttle to every 10 ticks (500ms at 20 TPS) for visual mode
  // Camera scrolling doesn't need every-tick updates
  protected readonly throttleInterval = 10;

  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  private viewportProvider: (() => { x: number; y: number; width: number; height: number } | null) | null = null;
  private tileSize = 16;

  /** Additional throttling for headless mode - agents don't move fast enough to need every-tick checks */
  private lastHeadlessUpdateTick = 0;
  private readonly HEADLESS_UPDATE_INTERVAL = 20; // 1 second at 20 TPS

  constructor(
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator
  ) {
    super();
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

  protected onUpdate(ctx: SystemContext): void {
    const viewport = this.viewportProvider?.();

    if (viewport) {
      // Visual mode: load chunks in viewport
      this.loadChunksInViewport(ctx.world, viewport);
    } else {
      // Headless mode: load chunks around agents
      this.loadChunksAroundAgents(ctx);
    }
  }

  /**
   * Load chunks in viewport (visual mode).
   *
   * Strategy: Queue chunks for background generation (LOW priority).
   * This allows smooth camera scrolling without lag spikes.
   * Falls back to immediate generation if BackgroundChunkGenerator is unavailable.
   */
  private loadChunksInViewport(
    world: World,
    viewport: { x: number; y: number; width: number; height: number }
  ): void {
    const cameraTileX = viewport.x / this.tileSize;
    const cameraTileY = viewport.y / this.tileSize;

    const { loaded } = this.chunkManager.updateLoadedChunks(cameraTileX, cameraTileY);

    const generator = world.getBackgroundChunkGenerator();

    for (const chunk of loaded) {
      if (!chunk.generated) {
        if (generator) {
          // Background generation (LOW priority for camera scroll)
          // Smooth, lag-free experience when chunks are ready in advance
          generator.queueChunk({
            chunkX: chunk.x,
            chunkY: chunk.y,
            priority: 'LOW',
            requestedBy: 'camera_scroll'
          });
        } else {
          // Fallback: Generate immediately if no background generator
          // This ensures terrain always appears, even without BackgroundChunkGenerator
          this.terrainGenerator.generateChunk(chunk, world as WorldMutator);
        }
      }
    }
  }

  /**
   * Load chunks around agents (headless mode).
   *
   * Strategy: Queue chunks for background generation (LOW priority).
   * Headless mode doesn't need immediate generation since there's no visual feedback.
   * Falls back to immediate generation if BackgroundChunkGenerator is unavailable.
   */
  private loadChunksAroundAgents(ctx: SystemContext): void {
    // Throttle headless chunk loading - agents don't move fast enough to need every tick
    if (ctx.tick - this.lastHeadlessUpdateTick < this.HEADLESS_UPDATE_INTERVAL) {
      return;
    }
    this.lastHeadlessUpdateTick = ctx.tick;

    // For headless: ensure chunks exist around all agents
    const agents = ctx.world.query().with('agent', 'position').executeEntities();
    const generator = ctx.world.getBackgroundChunkGenerator();

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
              if (generator) {
                // Background generation (LOW priority for headless mode)
                generator.queueChunk({
                  chunkX: cx,
                  chunkY: cy,
                  priority: 'LOW',
                  requestedBy: 'headless_agent'
                });
              } else {
                // Fallback: Generate immediately if no background generator
                this.terrainGenerator.generateChunk(chunk, ctx.world as WorldMutator);
              }
            }
          }
        }
      }
    }
  }
}
