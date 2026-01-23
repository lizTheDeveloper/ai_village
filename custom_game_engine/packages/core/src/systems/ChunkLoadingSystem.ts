import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { PositionComponent } from '../components/index.js';
import type { ChunkManager, TerrainGenerator } from '@ai-village/world';
import { CHUNK_SIZE } from '@ai-village/world';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

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

  // Throttle to every 50 ticks (2.5s at 20 TPS) - chunk loading is background work
  // Camera scrolling and agent movement are slow enough that this is sufficient
  protected readonly throttleInterval = THROTTLE.MEDIUM;

  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  private viewportProvider: (() => { x: number; y: number; width: number; height: number } | null) | null = null;
  private tileSize = 16;

  /** Additional throttling for headless mode - agents don't move fast enough to need every-tick checks */
  private lastHeadlessUpdateTick = 0;
  private readonly HEADLESS_UPDATE_INTERVAL = 100; // 5 seconds at 20 TPS - agents move slowly

  // Zero-allocation reusable working objects
  private readonly workingChunkCoords = { chunkX: 0, chunkY: 0 };

  // Cache for deduplication (avoids repeated queueChunk calls for same chunks)
  private readonly queuedChunksCache = new Set<string>();
  private lastCacheClearTick = 0;
  private readonly CACHE_CLEAR_INTERVAL = 200; // Clear cache every 10 seconds

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
    // Periodic cache cleanup to prevent unbounded growth
    if (ctx.tick - this.lastCacheClearTick >= this.CACHE_CLEAR_INTERVAL) {
      this.queuedChunksCache.clear();
      this.lastCacheClearTick = ctx.tick;
    }

    const viewport = this.viewportProvider?.();

    if (viewport) {
      // Visual mode: load chunks in viewport
      this.loadChunksInViewport(ctx.world, viewport, ctx.tick);
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
    viewport: { x: number; y: number; width: number; height: number },
    currentTick: number
  ): void {
    const cameraTileX = viewport.x / this.tileSize;
    const cameraTileY = viewport.y / this.tileSize;

    const { loaded } = this.chunkManager.updateLoadedChunks(cameraTileX, cameraTileY);

    // Early exit: no chunks to load
    if (loaded.length === 0) {
      return;
    }

    const generator = world.getBackgroundChunkGenerator();

    for (const chunk of loaded) {
      if (!chunk.generated) {
        // Deduplication: skip if already queued this cache period
        const chunkKey = this.getChunkKey(chunk.x, chunk.y);
        if (this.queuedChunksCache.has(chunkKey)) {
          continue;
        }

        if (generator) {
          // Background generation (LOW priority for camera scroll)
          // Smooth, lag-free experience when chunks are ready in advance
          generator.queueChunk({
            chunkX: chunk.x,
            chunkY: chunk.y,
            priority: 'LOW',
            requestedBy: 'camera_scroll'
          });

          // Mark as queued to avoid duplicate requests
          this.queuedChunksCache.add(chunkKey);
        } else {
          // Fallback: Generate immediately if no background generator
          // This ensures terrain always appears, even without BackgroundChunkGenerator
          this.terrainGenerator.generateChunk(chunk, world as WorldMutator);
          // Emit event so persistence systems can mark chunk dirty
          world.eventBus.emit({
            type: 'chunk_background_generated',
            source: 'ChunkLoadingSystem',
            data: { chunkX: chunk.x, chunkY: chunk.y, priority: 'IMMEDIATE', requestedBy: 'camera_scroll_fallback', tick: currentTick },
          });
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

    // Early exit: no agents to process
    if (agents.length === 0) {
      return;
    }

    const generator = ctx.world.getBackgroundChunkGenerator();

    for (const agent of agents) {
      const pos = agent.getComponent<PositionComponent>('position');
      if (!pos) continue;

      // Use reusable working object to avoid allocation
      this.workingChunkCoords.chunkX = Math.floor(pos.x / CHUNK_SIZE);
      this.workingChunkCoords.chunkY = Math.floor(pos.y / CHUNK_SIZE);

      // Load 3x3 grid around agent
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cx = this.workingChunkCoords.chunkX + dx;
          const cy = this.workingChunkCoords.chunkY + dy;

          // Early exit: chunk already exists
          if (this.chunkManager.hasChunk(cx, cy)) {
            const chunk = this.chunkManager.getChunk(cx, cy);
            if (chunk.generated) {
              continue;
            }

            // Chunk exists but not generated - queue it
            const chunkKey = this.getChunkKey(cx, cy);
            if (this.queuedChunksCache.has(chunkKey)) {
              continue; // Already queued
            }

            if (generator) {
              generator.queueChunk({
                chunkX: cx,
                chunkY: cy,
                priority: 'LOW',
                requestedBy: 'headless_agent'
              });
              this.queuedChunksCache.add(chunkKey);
            } else {
              this.terrainGenerator.generateChunk(chunk, ctx.world as WorldMutator);
              ctx.world.eventBus.emit({
                type: 'chunk_background_generated',
                source: 'ChunkLoadingSystem',
                data: { chunkX: cx, chunkY: cy, priority: 'IMMEDIATE', requestedBy: 'headless_agent_fallback', tick: ctx.tick },
              });
            }
          } else {
            // Chunk doesn't exist - create and queue
            const chunk = this.chunkManager.getChunk(cx, cy);
            if (chunk && !chunk.generated) {
              const chunkKey = this.getChunkKey(cx, cy);
              if (this.queuedChunksCache.has(chunkKey)) {
                continue; // Already queued
              }

              if (generator) {
                generator.queueChunk({
                  chunkX: cx,
                  chunkY: cy,
                  priority: 'LOW',
                  requestedBy: 'headless_agent'
                });
                this.queuedChunksCache.add(chunkKey);
              } else {
                this.terrainGenerator.generateChunk(chunk, ctx.world as WorldMutator);
                ctx.world.eventBus.emit({
                  type: 'chunk_background_generated',
                  source: 'ChunkLoadingSystem',
                  data: { chunkX: cx, chunkY: cy, priority: 'IMMEDIATE', requestedBy: 'headless_agent_fallback', tick: ctx.tick },
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get chunk key for deduplication cache.
   * Reuses string template to minimize allocations.
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }
}
