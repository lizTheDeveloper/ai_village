import type {
  World,
  WorldMutator,
  Entity,
  PositionComponent,
  RenderableComponent,
  BuildingComponent,
  AgentComponent,
  AnimalComponent,
  ResourceComponent,
  CircadianComponent,
  ReflectionComponent,
  IdentityComponent,
  TemperatureComponent,
  SteeringComponent,
  CityDirectorComponent,
} from '@ai-village/core';
import type { PlantComponent } from '@ai-village/core';
import {
  ChunkManager,
  TerrainGenerator,
  CHUNK_SIZE,
  TERRAIN_COLORS,
  type Chunk,
  type Tile,
  globalHorizonCalculator,
} from '@ai-village/world';
import { Camera } from './Camera.js';
import { renderSprite } from './SpriteRenderer.js';
import { FloatingTextRenderer } from './FloatingTextRenderer.js';
import { SpeechBubbleRenderer } from './SpeechBubbleRenderer.js';
import { ParticleRenderer } from './ParticleRenderer.js';
import { BedOwnershipRenderer } from './BedOwnershipRenderer.js';
import type { ContextMenuManager } from './ContextMenuManager.js';
import { getPixelLabSpriteLoader, type PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';
import { PixelLabDirection, angleToPixelLabDirection } from './sprites/PixelLabSpriteDefs.js';
import { findSprite, type SpriteTraits } from './sprites/SpriteRegistry.js';
import { lookupSprite } from './sprites/SpriteService.js';
import type { AppearanceComponent } from '@ai-village/core';
import { Renderer3D } from './Renderer3D.js';

/**
 * 2D renderer using Canvas.
 * Renders terrain tiles and entities.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private chunkManager: ChunkManager;
  private terrainGenerator: TerrainGenerator;
  private floatingTextRenderer!: FloatingTextRenderer;
  private speechBubbleRenderer!: SpeechBubbleRenderer;
  private particleRenderer!: ParticleRenderer;
  private bedOwnershipRenderer!: BedOwnershipRenderer;
  private pixelLabLoader!: PixelLabSpriteLoader;

  // Track which sprites are loading to avoid duplicate requests
  private loadingSprites = new Set<string>();
  // Track failed sprite loads with timestamp to prevent thundering herd
  private failedSprites = new Map<string, number>(); // folderId -> timestamp of failure
  private readonly SPRITE_RETRY_DELAY_MS = 5000; // Wait 5 seconds before retrying a failed load
  // Track loaded sprite instances by entity ID
  private entitySpriteInstances = new Map<string, string>(); // entityId -> instanceId
  // Track last facing direction for each entity (persist when not moving)
  private entityLastDirections = new Map<string, PixelLabDirection>(); // entityId -> last direction
  // Track last frame time for animation updates
  private lastFrameTime: number = performance.now();

  // Parallax background state for side-view
  private parallaxCloudOffset: number = 0; // Cloud drift offset
  private parallaxLastUpdateTime: number = performance.now();

  private tileSize = 16; // Pixels per tile at zoom=1
  private hasLoggedTilledTile = false; // Debug flag to log first tilled tile rendering
  private hasLoggedWallRender = false; // Debug flag to log first wall rendering
  private showTemperatureOverlay = false; // Debug flag to show temperature on tiles

  // View toggles for labels and overlays
  public showResourceAmounts = true;
  public showBuildingLabels = true;
  public showAgentNames = true;
  public showAgentTasks = true;
  public showCityBounds = true; // Show city director boundary boxes

  // Bound handlers for cleanup
  private boundResizeHandler: (() => void) | null = null;

  // 3D renderer for side-view mode
  private renderer3D: Renderer3D | null = null;
  private was3DActive = false; // Track previous state for mode transitions
  private current3DWorld: World | null = null; // Track if world has been set

  constructor(
    canvas: HTMLCanvasElement,
    chunkManager: ChunkManager,
    terrainGenerator: TerrainGenerator
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);
    // Use the provided ChunkManager and TerrainGenerator (shared with World)
    // This ensures chunks loaded from saves are visible to the Renderer
    this.chunkManager = chunkManager;
    this.terrainGenerator = terrainGenerator;
    this.floatingTextRenderer = new FloatingTextRenderer();
    this.speechBubbleRenderer = new SpeechBubbleRenderer();
    this.particleRenderer = new ParticleRenderer();
    this.bedOwnershipRenderer = new BedOwnershipRenderer();
    this.pixelLabLoader = getPixelLabSpriteLoader('/assets/sprites/pixellab');

    // Handle resize - store bound handler for cleanup
    this.resize();
    this.boundResizeHandler = () => this.resize();
    window.addEventListener('resize', this.boundResizeHandler);
  }

  /**
   * Remove all event listeners and clean up resources.
   * Call this when the Renderer is no longer needed.
   */
  destroy(): void {
    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }

    // Clean up 3D renderer
    if (this.renderer3D) {
      this.renderer3D.dispose();
      this.renderer3D = null;
      this.was3DActive = false;
      this.current3DWorld = null;
    }
  }

  /**
   * Try to render an entity using PixelLab sprites.
   * Returns true if successfully rendered, false if fallback is needed.
   */
  private renderPixelLabEntity(
    entity: Entity,
    x: number,
    y: number,
    size: number
  ): boolean {
    // Try to get animal component first (prioritize animals over agents)
    const animal = entity.components.get('animal') as AnimalComponent | undefined;

    // Try to get appearance component if no animal (for agents/humanoids)
    const appearance = entity.components.get('appearance') as AppearanceComponent | undefined;

    if (!appearance && !animal) return false;

    // Build traits for sprite lookup - prioritize animal component
    const traits: SpriteTraits = animal ? {
      species: animal.speciesId, // Use speciesId from animal component
    } : {
      species: appearance!.species || 'human',
      gender: appearance!.gender,
      hairColor: appearance!.hairColor,
      skinTone: appearance!.skinTone,
    };

    // Find the best matching sprite folder and queue generation if missing
    const spriteResult = lookupSprite(traits);
    const spriteFolderId = spriteResult.folderId;

    // Check if sprite is loaded
    if (!this.pixelLabLoader.isLoaded(spriteFolderId)) {
      // Check if this sprite has failed recently (prevent thundering herd)
      const failedTime = this.failedSprites.get(spriteFolderId);
      if (failedTime !== undefined) {
        const timeSinceFailure = Date.now() - failedTime;
        if (timeSinceFailure < this.SPRITE_RETRY_DELAY_MS) {
          return false; // Too soon to retry, use fallback
        }
        // Enough time has passed, clear the failure and allow retry
        this.failedSprites.delete(spriteFolderId);
      }

      // Start loading if not already loading
      if (!this.loadingSprites.has(spriteFolderId)) {
        this.loadingSprites.add(spriteFolderId);
        this.pixelLabLoader.loadCharacter(spriteFolderId)
          .then(() => {
            this.loadingSprites.delete(spriteFolderId);
            // Clear any previous failure record on success
            this.failedSprites.delete(spriteFolderId);
          })
          .catch((error) => {
            this.loadingSprites.delete(spriteFolderId);
            // Mark as failed with timestamp to prevent immediate retry
            this.failedSprites.set(spriteFolderId, Date.now());
            // Log error once (not on every frame)
            console.error(`[Renderer] Failed to load sprite ${spriteFolderId}, will retry in ${this.SPRITE_RETRY_DELAY_MS}ms:`, error.message);
          });
      }
      return false; // Use fallback while loading
    }

    // Get or create instance for this entity
    let instanceId = this.entitySpriteInstances.get(entity.id);
    if (!instanceId) {
      instanceId = `entity_${entity.id}`;
      const instance = this.pixelLabLoader.createInstance(instanceId, spriteFolderId);
      if (!instance) return false;
      this.entitySpriteInstances.set(entity.id, instanceId);
    }

    // Determine direction from entity velocity or steering
    // First check steering component for desired direction (more responsive for animals)
    const steering = entity.components.get('steering') as SteeringComponent | undefined;
    const velocity = entity.components.get('velocity') as any;

    // Prefer steering target for immediate direction changes
    let vx = 0;
    let vy = 0;

    if (steering?.target) {
      // Calculate direction from steering target (immediate, no lag)
      const position = entity.components.get('position') as PositionComponent | undefined;
      if (position) {
        vx = steering.target.x - position.x;
        vy = steering.target.y - position.y;
      }
    } else if (velocity) {
      // Fallback to actual velocity
      vx = velocity.vx ?? 0;
      vy = velocity.vy ?? 0;
    }

    // Check if entity is moving
    const isMoving = Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01;

    let direction: PixelLabDirection;
    if (isMoving) {
      // Calculate direction from movement vector
      // NOTE: Negate vy because screen coordinates have Y pointing down,
      // but Math.atan2 expects standard math coordinates (Y pointing up)
      const angle = Math.atan2(-vy, vx);
      direction = angleToPixelLabDirection(angle);
      // Store this direction for when entity stops moving
      this.entityLastDirections.set(entity.id, direction);
    } else {
      // Not moving - use last known direction, or default to South
      direction = this.entityLastDirections.get(entity.id) ?? PixelLabDirection.South;
    }

    // Update sprite direction
    this.pixelLabLoader.setDirection(instanceId, direction);

    // Set appropriate animation based on movement
    if (isMoving) {
      // Play walking animation when moving
      this.pixelLabLoader.setAnimation(instanceId, 'walking-8-frames', true);
    } else {
      // Stop animation when idle (will show static rotation)
      this.pixelLabLoader.setAnimation(instanceId, 'idle', false);
    }

    // Calculate scale to fit the size
    // PixelLab sprites are 48x48, we want them to fit in `size` pixels
    const scale = size / 48;

    // Render the sprite
    return this.pixelLabLoader.render(this.ctx, instanceId, x, y, scale);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Reset transform before scaling to avoid compounding
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.camera.setViewportSize(rect.width, rect.height);
  }

  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Get the canvas context for UI rendering.
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get the floating text renderer for adding feedback messages.
   */
  getFloatingTextRenderer(): FloatingTextRenderer {
    return this.floatingTextRenderer;
  }

  /**
   * Get the speech bubble renderer for agent dialogue.
   */
  getSpeechBubbleRenderer(): SpeechBubbleRenderer {
    return this.speechBubbleRenderer;
  }

  /**
   * Get the particle renderer for visual effects.
   */
  getParticleRenderer(): ParticleRenderer {
    return this.particleRenderer;
  }

  /**
   * Set the context menu manager (called after creation).
   * NOTE: Context menu is now rendered directly in main.ts render loop,
   * not by the Renderer class. This method is kept for backwards compatibility
   * but doesn't do anything.
   */
  setContextMenuManager(_manager: ContextMenuManager): void {
    // Context menu is rendered separately in main.ts - no need to store reference
  }

  /**
   * Toggle temperature overlay display.
   */
  toggleTemperatureOverlay(): void {
    this.showTemperatureOverlay = !this.showTemperatureOverlay;
  }

  /**
   * Get current temperature overlay state.
   */
  isTemperatureOverlayEnabled(): boolean {
    return this.showTemperatureOverlay;
  }

  /**
   * Find entity at screen coordinates.
   * Returns the entity if found, or null.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param world World instance
   */
  findEntityAtScreenPosition(screenX: number, screenY: number, world: World): Entity | null {
    const entities = world.query().with('position', 'renderable').executeEntities();
    // Validate camera state
    if (!isFinite(this.camera.x) || !isFinite(this.camera.y) || !isFinite(this.camera.zoom)) {
      console.error(`[Renderer] Invalid camera state: x=${this.camera.x}, y=${this.camera.y}, zoom=${this.camera.zoom}`);
      return null;
    }
    if (!isFinite(this.camera.viewportWidth) || !isFinite(this.camera.viewportHeight)) {
      console.error(`[Renderer] Invalid viewport size: width=${this.camera.viewportWidth}, height=${this.camera.viewportHeight}`);
      return null;
    }
    if (this.camera.viewportWidth === 0 || this.camera.viewportHeight === 0) {
      console.error(`[Renderer] Zero viewport size: width=${this.camera.viewportWidth}, height=${this.camera.viewportHeight}`);
      return null;
    }

    let closestEntity: Entity | null = null;
    let closestDistance = Infinity;
    let closestAgent: Entity | null = null;
    let closestAgentDistance = Infinity;

    // Check all entities and find the closest one to the click point
    // Prioritize agents over other entities for better UX
    let agentCount = 0;
    for (const entity of entities) {
      if (!entity || !entity.components) {
        console.warn('[Renderer] Entity or entity.components is null/undefined');
        continue;
      }
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const hasAgent = entity.components.has('agent');
      const hasPlant = entity.components.has('plant');
      const hasAnimal = entity.components.has('animal');
      const hasResource = entity.components.has('resource');

      // Calculate world pixel coordinates
      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;

      // Convert to screen coordinates
      const screen = this.camera.worldToScreen(worldX, worldY);

      // Validate screen coordinates
      if (!isFinite(screen.x) || !isFinite(screen.y)) {
        if (hasAgent) {
          console.warn(`[Renderer] Agent ${agentCount + 1} has invalid screen coords: screen=(${screen.x}, ${screen.y}), world=(${worldX}, ${worldY}), pos=(${pos.x}, ${pos.y})`);
        }
        continue;
      }

      const tilePixelSize = this.tileSize * this.camera.zoom;

      // Calculate entity center on screen
      const centerX = screen.x + tilePixelSize / 2;
      const centerY = screen.y + tilePixelSize / 2;

      // Calculate distance from click to entity center
      const distance = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);

      // Determine click radius based on entity type
      // Agents need a VERY large radius to be easily clickable (16 tiles = 256 pixels at zoom 1.0)
      // Animals need a large radius to be easily clickable (8 tiles)
      // Plants and resources (trees, bushes) need a moderate radius to be clickable (3 tiles)
      // Other entities use default (0.5 tiles)
      let clickRadius = tilePixelSize / 2;
      if (hasAgent) {
        clickRadius = tilePixelSize * 16; // Increased from 8 to 16 for more forgiving clicks
      } else if (hasAnimal) {
        clickRadius = tilePixelSize * 8; // Same as original agent radius
      } else if (hasPlant || hasResource) {
        clickRadius = tilePixelSize * 3; // Trees, plants, berry bushes
      }

      if (hasAgent) {
        agentCount++;
      }

      // Check if click is within radius
      const passesDistanceCheck = distance <= clickRadius;
      const passesClosestCheck = distance < closestDistance;
      if (hasAgent) {
      }

      // Track closest agent separately (for prioritization)
      if (hasAgent && passesDistanceCheck && distance < closestAgentDistance) {
        closestAgent = entity;
        closestAgentDistance = distance;
      }

      // Track closest entity overall
      if (passesDistanceCheck && passesClosestCheck) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }


    // PRIORITY: Only prefer agent if click is actually close to the agent (within 2 tiles)
    // This prevents agents from "stealing" clicks meant for nearby plants/animals
    const tilePixelSize = this.tileSize * this.camera.zoom;
    const agentPriorityRadius = tilePixelSize * 2; // Only prioritize agent if click is very close

    if (closestAgent && closestAgentDistance <= agentPriorityRadius) {
      return closestAgent;
    }

    // Return the closest entity (whichever type is actually closest)
    if (closestEntity) {
      return closestEntity;
    }

    // If no entity within normal range but an agent is within its extended range, return agent
    if (closestAgent) {
      return closestAgent;
    }

    // If no entity found within radius, select the closest agent if it's reasonably close (within full viewport)
    // FIXED: Increased max search distance to full viewport since clicks can be anywhere on screen
    if (agentCount > 0) {
      let nearestAgent: Entity | null = null;
      let nearestDistance = Infinity;
      // Use full viewport diagonal distance as maximum
      const maxSearchDistance = Math.sqrt(this.camera.viewportWidth ** 2 + this.camera.viewportHeight ** 2);

      for (const entity of entities) {
        if (!entity || !entity.components) continue;
        if (!entity.components.has('agent')) continue;

        const pos = entity.components.get('position') as PositionComponent | undefined;
        const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

        if (!pos || !renderable || !renderable.visible) continue;

        const worldX = pos.x * this.tileSize;
        const worldY = pos.y * this.tileSize;
        const screen = this.camera.worldToScreen(worldX, worldY);

        if (!isFinite(screen.x) || !isFinite(screen.y)) continue;

        const tilePixelSize = this.tileSize * this.camera.zoom;
        const centerX = screen.x + tilePixelSize / 2;
        const centerY = screen.y + tilePixelSize / 2;
        const distance = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);


        if (distance < nearestDistance && distance < maxSearchDistance) {
          nearestAgent = entity;
          nearestDistance = distance;
        }
      }

      if (nearestAgent) {
        return nearestAgent;
      } else {
      }
    }

    return null;
  }

  /**
   * Render the world.
   * @param world World instance
   * @param selectedEntity Optional selected entity to highlight (can be full Entity or just { id: string })
   */
  render(world: World, selectedEntity?: Entity | { id: string }): void {
    // Clear
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate deltaTime for animations
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update all sprite animations
    for (const instanceId of this.entitySpriteInstances.values()) {
      this.pixelLabLoader.updateAnimation(instanceId, deltaTime);
    }

    // Update camera
    this.camera.update();

    // Update loaded chunks based on camera position (convert pixels to tiles)
    const cameraTileX = this.camera.x / this.tileSize;
    const cameraTileY = this.camera.y / this.tileSize;
    const { loaded } = this.chunkManager.updateLoadedChunks(
      cameraTileX,
      cameraTileY
    );

    // Generate newly loaded chunks
    for (const chunk of loaded) {
      this.terrainGenerator.generateChunk(chunk, world as WorldMutator);
    }

    // Get visible bounds in world coordinates
    const bounds = this.camera.getVisibleBounds();

    // Calculate chunk bounds (convert world pixels to tiles, then to chunks)
    const startChunkX = Math.floor(bounds.left / this.tileSize / CHUNK_SIZE);
    const endChunkX = Math.floor(bounds.right / this.tileSize / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / this.tileSize / CHUNK_SIZE);
    const endChunkY = Math.floor(bounds.bottom / this.tileSize / CHUNK_SIZE);

    // Render terrain or background based on view mode
    if (this.camera.isSideView()) {
      // Use 3D renderer for side-view mode
      this.render3DSideView(world);
      return; // 3D renderer handles everything
    } else {
      // Deactivate 3D renderer if switching back to 2D mode
      this.deactivate3DRenderer();

      // Top-down mode: render terrain tiles
      for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
        for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
          if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
          const chunk = this.chunkManager.getChunk(chunkX, chunkY);
          this.renderChunk(chunk);
        }
      }
    }

    // Draw entities (if any have position component)
    let entities = world.query().with('position', 'renderable').executeEntities();

    // Get agent positions for proximity culling
    const agentPositions: Array<{ x: number; y: number }> = [];
    const agentEntities = world.query().with('agent', 'position').executeEntities();
    for (const agentEntity of agentEntities) {
      const pos = agentEntity.components.get('position') as PositionComponent | undefined;
      if (pos) {
        agentPositions.push({ x: pos.x, y: pos.y });
      }
    }

    // Vision range for culling (from GameBalance.VISION_RANGE_TILES)
    const VISION_RANGE = 15; // tiles
    const VIEWPORT_MARGIN = 2; // tiles - small margin for smooth scrolling

    // Filter entities based on smart culling:
    // Keep if: building, planted crop, near any agent, or in viewport
    entities = [...entities].filter((entity) => {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      if (!pos) return false;

      // Always keep buildings (agent-created)
      if (entity.components.has('building')) return true;

      // Always keep planted crops (agent-created)
      const plant = entity.components.get('plant') as PlantComponent | undefined;
      if (plant?.planted) return true;

      // Keep if within vision range of any agent
      for (const agentPos of agentPositions) {
        const dx = pos.x - agentPos.x;
        const dy = pos.y - agentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= VISION_RANGE) return true;
      }

      // Keep if within viewport bounds (for player visibility)
      const inViewportX = pos.x >= bounds.left / this.tileSize - VIEWPORT_MARGIN &&
                         pos.x <= bounds.right / this.tileSize + VIEWPORT_MARGIN;
      const inViewportY = pos.y >= bounds.top / this.tileSize - VIEWPORT_MARGIN &&
                         pos.y <= bounds.bottom / this.tileSize + VIEWPORT_MARGIN;
      if (inViewportX && inViewportY) return true;

      // Cull everything else
      return false;
    });

    // In side-view mode, filter to only show entities "in front" of the camera
    // based on facing direction, within a few depth layers
    if (this.camera.isSideView()) {
      const depthAxis = this.camera.getDepthAxis(); // 'x' or 'y'
      const depthDirection = this.camera.getDepthDirection(); // +1 or -1
      const maxDepthLayers = 5; // Show entities up to 5 tiles in front

      // Camera position in world tiles
      const cameraWorldX = this.camera.x / this.tileSize;
      const cameraWorldY = this.camera.y / this.tileSize;

      // Filter to only entities in front of the camera within depth range
      entities = [...entities].filter((entity) => {
        const pos = entity.components.get('position') as PositionComponent | undefined;
        if (!pos) return false;

        // Get entity position on depth axis
        const entityDepth = depthAxis === 'x' ? pos.x : pos.y;
        const cameraDepth = depthAxis === 'x' ? cameraWorldX : cameraWorldY;

        // Calculate signed distance in front of camera
        // depthDirection tells us which way is "forward"
        const signedDistance = (entityDepth - cameraDepth) * depthDirection;

        // Only show entities that are in front (signedDistance >= 0) and within max depth
        // Also allow entities slightly behind (within 1 tile) for the current row
        if (signedDistance < -1 || signedDistance > maxDepthLayers) return false;

        return true;
      });

      // Sort by depth (furthest first) then by Z (height)
      entities = [...entities].sort((a, b) => {
        const posA = a.components.get('position') as PositionComponent | undefined;
        const posB = b.components.get('position') as PositionComponent | undefined;
        if (!posA || !posB) return 0;

        // Sort by depth - furthest entities render first (back to front)
        const depthA = depthAxis === 'x' ? posA.x : posA.y;
        const depthB = depthAxis === 'x' ? posB.x : posB.y;
        const depthDiff = (depthB - depthA) * depthDirection;
        if (Math.abs(depthDiff) > 0.5) return depthDiff;

        // Then by Z (height) - lower entities render first
        const zA = (posA as any)?.z ?? 0;
        const zB = (posB as any)?.z ?? 0;
        return zA - zB;
      });
    }

    // Debug: count buildings
    // const buildingEntities = entities.filter(e => e.components.has('building'));
    // if (buildingEntities.length > 0) {
    //   console.log(`[Renderer] Found ${buildingEntities.length} buildings to render:`,
    //     buildingEntities.map(e => ({
    //       id: e.id,
    //       building: e.components.get('building'),
    //       renderable: e.components.get('renderable'),
    //       position: e.components.get('position')
    //     }))
    //   );
    // }

    // Sort entities for proper rendering order (both modes)
    if (!this.camera.isSideView()) {
      // Top-down mode: sort by Y (lower Y = further from camera = render first)
      // Then by Z (lower Z = underground = render first)
      entities = [...entities].sort((a, b) => {
        const posA = a.components.get('position') as PositionComponent | undefined;
        const posB = b.components.get('position') as PositionComponent | undefined;
        if (!posA || !posB) return 0;

        // Primary sort by Y (lower Y renders first - back to front)
        if (posA.y !== posB.y) {
          return posA.y - posB.y;
        }

        // Secondary sort by Z
        const zA = (posA as any)?.z ?? 0;
        const zB = (posB as any)?.z ?? 0;
        return zA - zB;
      });
    }

    for (const entity of entities) {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      // Get entity z-coordinate (default to 0)
      const entityZ = (pos as any).z ?? 0;

      // In side-view mode, no parallax needed since we only show entities at the same depth slice
      // All visible entities are rendered at full scale and opacity
      const parallaxScale = 1;
      const parallaxOpacity = 1;

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;

      // In side-view mode, use special screen positioning based on facing direction
      let screen: { x: number; y: number };
      let terrainElevation = 0; // Track terrain elevation for procedural drawing
      if (this.camera.isSideView()) {
        // Side-view coordinate mapping depends on facing direction:
        // For N/S facing: X = screen horizontal, Y = depth
        // For E/W facing: Y = screen horizontal, X = depth
        // Z = vertical HEIGHT on screen (z=0 at terrain surface, z>0 above terrain)

        const depthAxis = this.camera.getDepthAxis();
        const isNorthSouth = depthAxis === 'y';

        // Apply vertical camera offset (same as terrain rendering)
        const baseSeaLevelY = this.camera.viewportHeight * 0.70;
        const seaLevelScreenY = baseSeaLevelY + this.camera.sideViewVerticalOffset;
        const tilePixelSize = this.tileSize * this.camera.zoom * parallaxScale;

        // Get the terrain elevation at this entity's ACTUAL position
        // Use the entity's actual world coordinates to get the elevation
        // This ensures entities follow the terrain height correctly
        terrainElevation = this.getTerrainElevationAt(
          Math.floor(pos.x),
          Math.floor(pos.y)
        );

        // Ground level for this tile based on terrain elevation
        const terrainScreenY = seaLevelScreenY - terrainElevation * tilePixelSize;

        // Screen X: horizontal position relative to camera
        // N/S facing: use world X position, E/W facing: use world Y position
        let screenX: number;
        if (isNorthSouth) {
          screenX = (worldX - this.camera.x) * this.camera.zoom * parallaxScale + this.camera.viewportWidth / 2;
        } else {
          screenX = (worldY - this.camera.y) * this.camera.zoom * parallaxScale + this.camera.viewportWidth / 2;
        }

        // Screen Y: based on entity's Z height ABOVE the terrain
        const heightAboveTerrain = entityZ;
        const verticalOffset = heightAboveTerrain * tilePixelSize;

        // Sprite bottom at terrain level, offset by entity height
        const screenY = terrainScreenY - tilePixelSize - verticalOffset;

        screen = { x: screenX, y: screenY };
      } else {
        screen = this.camera.worldToScreen(worldX, worldY, entityZ);
      }

      // Check if this is a building under construction
      const building = entity.components.get('building') as BuildingComponent | undefined;

      const isUnderConstruction = building && !building.isComplete && building.progress < 100;

      // Calculate effective opacity (construction + parallax)
      let effectiveOpacity = parallaxOpacity;
      if (isUnderConstruction) {
        effectiveOpacity *= 0.5;
      }

      // Apply visual metadata from renderable component
      const sizeMultiplier = renderable.sizeMultiplier ?? 1.0;
      const alpha = renderable.alpha ?? 1.0;
      this.ctx.globalAlpha = effectiveOpacity * alpha;

      // Calculate size with parallax scaling and size multiplier
      const baseSize = this.tileSize * this.camera.zoom;
      const scaledSize = baseSize * parallaxScale * sizeMultiplier;

      // Center the scaled sprite
      const offsetX = (scaledSize - baseSize) / 2;
      const offsetY = (scaledSize - baseSize) / 2;

      // In side-view, draw entities with height procedurally
      if (this.camera.isSideView()) {
        // Calculate terrain-based ground level for this entity
        // Apply vertical camera offset (same as elsewhere)
        const baseSeaLevelY = this.camera.viewportHeight * 0.70;
        const seaLevelScreenY = baseSeaLevelY + this.camera.sideViewVerticalOffset;
        const tilePixelSize = this.tileSize * this.camera.zoom * parallaxScale;
        const terrainScreenY = seaLevelScreenY - terrainElevation * tilePixelSize;

        // Used for stem/pole rendering on generic tall entities
        const spriteTop = screen.y - offsetY;
        const spriteBottom = spriteTop + scaledSize;

        // Create deterministic seed from entity position
        const entitySeed = Math.floor(pos.x * 1000 + pos.y * 7919);

        // Draw based on entity type
        if (renderable.spriteId === 'tree') {
          // Procedural tree: trunk + layered canopy
          // Tree height: entityZ is the tree height, grows from terrain surface
          const treeHeight = Math.max(1, entityZ + 1) * tilePixelSize;
          this.drawProceduralTree(
            screen.x - offsetX + scaledSize / 2, // center X
            terrainScreenY, // terrain ground Y (not fixed!)
            scaledSize * 0.25, // trunk width
            treeHeight, // total height
            scaledSize * 0.8, // canopy width
            parallaxOpacity,
            entitySeed
          );
        } else if (renderable.spriteId === 'rock') {
          // Rocks: draw stacked/scaled vertically from terrain
          const rockHeight = Math.max(1, entityZ + 1) * tilePixelSize;
          this.drawProceduralRock(
            screen.x - offsetX,
            terrainScreenY - rockHeight,
            scaledSize,
            rockHeight,
            parallaxOpacity,
            entitySeed
          );
        } else if (renderable.spriteId === 'mountain') {
          // Mountains: draw as triangular peak with snow cap from terrain
          const mountainHeight = Math.max(1, entityZ + 1) * tilePixelSize;
          this.drawProceduralMountain(
            screen.x - offsetX + scaledSize / 2, // center X
            terrainScreenY, // terrain ground Y (not fixed!)
            scaledSize * (1 + entityZ * 0.3), // width scales with height
            mountainHeight,
            parallaxOpacity,
            entitySeed
          );
        } else if (entityZ > 0) {
          // Generic tall entity: draw a stem/pole and sprite at top
          const stemWidth = scaledSize * 0.15;
          const stemX = screen.x - offsetX + (scaledSize - stemWidth) / 2;
          this.ctx.fillStyle = '#666666';
          this.ctx.fillRect(stemX, spriteBottom, stemWidth, terrainScreenY - spriteBottom);

          // Draw sprite at top - try PixelLab first for agents
          if (!this.renderPixelLabEntity(entity, screen.x - offsetX, screen.y - offsetY, scaledSize)) {
            renderSprite(this.ctx, renderable.spriteId, screen.x - offsetX, screen.y - offsetY, scaledSize);
          }
        } else {
          // Ground-level entity in side-view: render at terrain surface
          // Try PixelLab sprites first for agents
          if (!this.renderPixelLabEntity(entity, screen.x - offsetX, screen.y - offsetY, scaledSize)) {
            renderSprite(
              this.ctx,
              renderable.spriteId,
              screen.x - offsetX,
              screen.y - offsetY,
              scaledSize
            );
          }
        }
      } else {
        // Normal rendering (top-down or ground-level entities)
        // Try PixelLab sprites first for agents
        if (!this.renderPixelLabEntity(entity, screen.x - offsetX, screen.y - offsetY, scaledSize)) {
          renderSprite(
            this.ctx,
            renderable.spriteId,
            screen.x - offsetX,
            screen.y - offsetY,
            scaledSize
          );
        }
      }

      // Reset alpha
      this.ctx.globalAlpha = 1.0;

      // Draw highlight border for buildings
      if (building) {
        const borderColor = isUnderConstruction ? '#FFA500' : '#FFFFFF';
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = isUnderConstruction ? 0.6 : 0.4;
        this.ctx.strokeRect(
          screen.x,
          screen.y,
          this.tileSize * this.camera.zoom,
          this.tileSize * this.camera.zoom
        );
        this.ctx.globalAlpha = 1.0;
      }

      // Draw building name label for better visibility
      if (building && this.showBuildingLabels) {
        this.drawBuildingLabel(screen.x, screen.y, building.buildingType, !!isUnderConstruction);
      }

      // Draw construction progress bar if under construction
      if (isUnderConstruction && building) {
        this.drawConstructionProgress(screen.x, screen.y, building.progress);
      }

      // Draw resource amount bar for harvestable resources (trees, rocks)
      const resource = entity.components.get('resource') as ResourceComponent | undefined;
      if (resource && resource.harvestable && resource.maxAmount > 0 && this.showResourceAmounts) {
        this.drawResourceAmount(screen.x, screen.y, resource.amount, resource.maxAmount, resource.resourceType);
      }

      // Draw agent behavior label
      const agent = entity.components.get('agent') as AgentComponent | undefined;
      const circadian = entity.components.get('circadian') as CircadianComponent | undefined;
      if (agent && agent.behavior && this.showAgentTasks) {
        this.drawAgentBehavior(screen.x, screen.y, agent.behavior, agent.behaviorState, circadian);
      }

      // Register agent speech for speech bubble rendering
      if (agent?.recentSpeech) {
        this.speechBubbleRenderer.registerSpeech(entity.id, agent.recentSpeech);
      }

      // Draw Z's above sleeping agents
      if (circadian?.isSleeping) {
        this.drawSleepingIndicator(screen.x, screen.y);
      }

      // Draw reflection indicator for agents currently reflecting
      const reflection = entity.components.get('reflection') as ReflectionComponent | undefined;
      if (reflection?.isReflecting) {
        this.drawReflectionIndicator(screen.x, screen.y, reflection.reflectionType);
      }

      // Draw animal state label
      const animal = entity.components.get('animal') as AnimalComponent | undefined;
      if (animal) {
        this.drawAnimalState(screen.x, screen.y, animal.state, animal.wild);
      }

      // Highlight selected entity
      if (selectedEntity && entity.id === selectedEntity.id) {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
          screen.x - 2,
          screen.y - 2,
          this.tileSize * this.camera.zoom + 4,
          this.tileSize * this.camera.zoom + 4
        );
        this.ctx.setLineDash([]);
      }
    }

    // Draw agent-building interaction indicators
    this.drawAgentBuildingInteractions(world, selectedEntity);

    // Draw navigation path for selected entity
    this.drawNavigationPath(world, selectedEntity);

    // Draw city boundaries
    this.drawCityBoundaries(world);

    // Draw floating text (resource gathering feedback, etc.)
    this.floatingTextRenderer.render(this.ctx, this.camera, Date.now());

    // Draw particles (dust, sparks, etc.)
    this.particleRenderer.render(this.ctx, this.camera, Date.now());

    // Draw bed ownership markers
    this.bedOwnershipRenderer.render(this.ctx, this.camera, world);

    // Update and render speech bubbles
    this.speechBubbleRenderer.update();
    this.renderSpeechBubbles(world);

    // NOTE: Context menu is rendered separately in main.ts render loop
    // after all other UI panels, to ensure it appears on top.
    // Do NOT render it here or it will be covered by UI panels.

    // Draw debug info
    this.drawDebugInfo(world);
  }

  /**
   * Render speech bubbles above agents.
   */
  private renderSpeechBubbles(world: World): void {
    // Collect agents with positions for speech bubble rendering
    const agents = world.query().with('agent', 'position').executeEntities();
    const agentData: Array<{ id: string; x: number; y: number; name?: string }> = [];

    for (const entity of agents) {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const identity = entity.components.get('identity') as IdentityComponent | undefined;

      if (!pos) continue;

      // Convert world position to screen position
      const worldX = pos.x * this.tileSize + this.tileSize / 2;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      agentData.push({
        id: entity.id,
        x: screen.x,
        y: screen.y,
        name: this.showAgentNames ? identity?.name : undefined
      });
    }

    this.speechBubbleRenderer.render(this.ctx, agentData);
  }

  /**
   * Render in 3D mode for side-view using Three.js WebGL renderer.
   * Switches between 2D canvas and 3D WebGL based on view mode.
   */
  private render3DSideView(world: World): void {
    // Initialize 3D renderer if not already created
    if (!this.renderer3D) {
      // Pass ChunkManager and TerrainGenerator for independent 3D chunk loading
      this.renderer3D = new Renderer3D({}, this.chunkManager, this.terrainGenerator);
      // Mount 3D renderer to the same container as the canvas
      const container = this.canvas.parentElement;
      if (container) {
        this.renderer3D.mount(container);
      }
    }

    // Set world if changed
    if (this.current3DWorld !== world) {
      this.renderer3D.setWorld(world);
      this.current3DWorld = world;
    }

    // Activate 3D renderer and hide canvas if transitioning
    if (!this.was3DActive) {
      this.renderer3D.activate();
      this.canvas.style.display = 'none';
      // Position camera based on current 2D camera position
      const cameraTileX = this.camera.x / this.tileSize;
      const cameraTileY = this.camera.y / this.tileSize;
      const centerTile = world.getTileAt?.(Math.floor(cameraTileX), Math.floor(cameraTileY));
      const elevation = centerTile?.elevation ?? 0;
      this.renderer3D.setCameraFromWorld(cameraTileX, cameraTileY, elevation);
      this.was3DActive = true;
    }

    // 3D renderer handles its own render loop, no additional work needed here
  }

  /**
   * Deactivate 3D renderer when switching back to 2D mode.
   * Called when view mode changes away from side-view.
   */
  private deactivate3DRenderer(): void {
    if (this.renderer3D && this.was3DActive) {
      this.renderer3D.deactivate();
      this.canvas.style.display = 'block';
      this.was3DActive = false;
    }
  }

  /**
   * Set the 3D draw distance (in tiles). Called when settings change.
   */
  set3DDrawDistance(distance: number): void {
    if (this.renderer3D) {
      this.renderer3D.setDrawDistance(distance);
    }
  }

  /**
   * Render background for side-view mode with Starbound-style parallax layers.
   * Includes: sky gradient, distant mountains, mid-ground hills, clouds, atmospheric haze.
   */
  private renderSideViewBackground(): void {
    const width = this.camera.viewportWidth;
    const height = this.camera.viewportHeight;
    const groundY = height * 0.70; // Ground line at 70% down

    // Update cloud drift animation
    const now = performance.now();
    const deltaTime = (now - this.parallaxLastUpdateTime) / 1000;
    this.parallaxLastUpdateTime = now;
    this.parallaxCloudOffset += deltaTime * 8; // Slow cloud drift (8 pixels/second)
    if (this.parallaxCloudOffset > width * 2) {
      this.parallaxCloudOffset -= width * 2; // Wrap around
    }

    // Camera offset for parallax
    const cameraOffset = this.camera.x * this.camera.zoom;

    // === SKY GRADIENT ===
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, groundY);
    skyGradient.addColorStop(0, '#0a0a2a');     // Deep space at top
    skyGradient.addColorStop(0.15, '#1a1a4e');  // Deep blue
    skyGradient.addColorStop(0.4, '#2a3a6e');   // Mid blue
    skyGradient.addColorStop(0.7, '#4a6a9e');   // Light blue
    skyGradient.addColorStop(0.9, '#7a9abe');   // Pale blue
    skyGradient.addColorStop(1, '#aaccee');     // Horizon
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, groundY);

    // === REAL DISTANT TERRAIN SILHOUETTES ===
    // Render actual terrain elevation from chunks beyond the main render distance
    this.renderDistantTerrainSilhouettes(width, groundY);

    // === CLOUDS (drift independently + slight parallax) ===
    this.renderClouds(width, groundY, cameraOffset * 0.03);

    // === ATMOSPHERIC HAZE at horizon ===
    const hazeGradient = this.ctx.createLinearGradient(0, groundY * 0.6, 0, groundY);
    hazeGradient.addColorStop(0, 'rgba(170, 200, 230, 0)');
    hazeGradient.addColorStop(0.7, 'rgba(170, 200, 230, 0.15)');
    hazeGradient.addColorStop(1, 'rgba(170, 200, 230, 0.3)');
    this.ctx.fillStyle = hazeGradient;
    this.ctx.fillRect(0, groundY * 0.6, width, groundY * 0.4);

    // === HORIZON GLOW (sun effect) ===
    const horizonGlow = this.ctx.createRadialGradient(
      width * 0.7, groundY - 10, 0,
      width * 0.7, groundY - 10, width * 0.4
    );
    horizonGlow.addColorStop(0, 'rgba(255, 220, 180, 0.25)');
    horizonGlow.addColorStop(0.3, 'rgba(255, 200, 150, 0.15)');
    horizonGlow.addColorStop(1, 'rgba(255, 180, 120, 0)');
    this.ctx.fillStyle = horizonGlow;
    this.ctx.fillRect(0, groundY - 100, width, 110);

    // Draw focus depth indicator
    this.drawDepthIndicator();
  }

  /**
   * Render distant terrain as silhouettes based on real chunk elevation data.
   * Samples terrain from chunks beyond the main render distance.
   */
  private renderDistantTerrainSilhouettes(width: number, groundY: number): void {
    const depthAxis = this.camera.getDepthAxis();
    const depthDirection = this.camera.getDepthDirection();
    const isNorthSouth = depthAxis === 'y';

    const cameraWorldX = Math.floor(this.camera.x / this.tileSize);
    const cameraWorldY = Math.floor(this.camera.y / this.tileSize);
    const tilePixelSize = this.tileSize * this.camera.zoom;

    // Render 3 distance layers of real terrain silhouettes
    // Layer 1: Far (60-100 tiles away) - dark, faded
    this.renderTerrainSilhouetteLayer(
      width, groundY, isNorthSouth, depthDirection,
      cameraWorldX, cameraWorldY, tilePixelSize,
      60, 100, '#1a2a3a', 0.3, 0.05  // startDepth, endDepth, color, opacity, parallax
    );

    // Layer 2: Mid (35-60 tiles away) - medium fade
    this.renderTerrainSilhouetteLayer(
      width, groundY, isNorthSouth, depthDirection,
      cameraWorldX, cameraWorldY, tilePixelSize,
      35, 60, '#2a3a4a', 0.4, 0.1
    );

    // Layer 3: Near background (20-35 tiles away) - lighter
    this.renderTerrainSilhouetteLayer(
      width, groundY, isNorthSouth, depthDirection,
      cameraWorldX, cameraWorldY, tilePixelSize,
      20, 35, '#3a4a5a', 0.5, 0.15
    );
  }

  /**
   * Render a single layer of terrain silhouette from real elevation data.
   */
  private renderTerrainSilhouetteLayer(
    width: number,
    groundY: number,
    isNorthSouth: boolean,
    depthDirection: number,
    cameraWorldX: number,
    cameraWorldY: number,
    tilePixelSize: number,
    startDepth: number,
    endDepth: number,
    color: string,
    opacity: number,
    parallaxFactor: number
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;

    // Calculate parallax offset
    const parallaxOffset = (isNorthSouth ? this.camera.x : this.camera.y) * this.camera.zoom * parallaxFactor;

    // Sample terrain elevation across the visible width
    const samplesPerScreen = Math.ceil(width / 4); // Sample every 4 pixels
    const elevations: number[] = [];
    const screenXs: number[] = [];

    for (let i = 0; i <= samplesPerScreen; i++) {
      const screenX = (i / samplesPerScreen) * width;
      screenXs.push(screenX);

      // Convert screen X to world coordinates
      const worldHorizontal = isNorthSouth
        ? (screenX - width / 2 + parallaxOffset) / (this.camera.zoom * parallaxFactor) + this.camera.x / this.tileSize
        : (screenX - width / 2 + parallaxOffset) / (this.camera.zoom * parallaxFactor) + this.camera.y / this.tileSize;

      // Find max elevation in the depth range at this horizontal position
      let maxElevation = 0;
      for (let depth = startDepth; depth <= endDepth; depth += 2) {
        const depthPos = isNorthSouth
          ? cameraWorldY + depth * depthDirection
          : cameraWorldX + depth * depthDirection;

        const tileX = isNorthSouth ? Math.floor(worldHorizontal) : Math.floor(depthPos);
        const tileY = isNorthSouth ? Math.floor(depthPos) : Math.floor(worldHorizontal);

        const elevation = this.getTerrainElevationAt(tileX, tileY);
        maxElevation = Math.max(maxElevation, elevation);
      }

      elevations.push(maxElevation);
    }

    // Draw silhouette path
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY);

    for (let i = 0; i < screenXs.length; i++) {
      const screenX = screenXs[i] ?? 0;
      const elevation = elevations[i] ?? 0;
      // Scale elevation to visual height (higher elevation = higher on screen)
      const visualHeight = elevation * tilePixelSize * 0.5; // Scale factor for visibility
      const screenY = groundY - visualHeight;
      this.ctx.lineTo(screenX, screenY);
    }

    this.ctx.lineTo(width, groundY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Render a parallax mountain/hill layer with procedural peaks.
   */
  private renderMountainLayer(
    width: number,
    groundY: number,
    parallaxOffset: number,
    color: string,
    opacity: number,
    peakHeight: number,
    numPeaks: number,
    jaggedness: number
  ): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;

    // Wrap parallax offset
    const wrappedOffset = ((parallaxOffset % (width * 2)) + width * 2) % (width * 2);

    this.ctx.beginPath();
    this.ctx.moveTo(-width, groundY);

    // Generate mountain profile using sine waves with harmonics
    const segmentWidth = (width * 3) / (numPeaks * 10);
    for (let x = -width; x <= width * 2; x += segmentWidth) {
      const adjustedX = x + wrappedOffset;

      // Multiple sine waves for natural mountain shape
      const wave1 = Math.sin((adjustedX / width) * Math.PI * numPeaks * 0.3) * peakHeight * 0.5;
      const wave2 = Math.sin((adjustedX / width) * Math.PI * numPeaks * 0.7 + 1.3) * peakHeight * 0.3;
      const wave3 = Math.sin((adjustedX / width) * Math.PI * numPeaks * 1.5 + 2.7) * peakHeight * jaggedness;

      const mountainY = groundY - Math.max(0, wave1 + wave2 + wave3);
      this.ctx.lineTo(x, mountainY);
    }

    this.ctx.lineTo(width * 2, groundY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Render drifting clouds with parallax effect.
   */
  private renderClouds(width: number, groundY: number, parallaxOffset: number): void {
    this.ctx.save();

    // Cloud layer 1 - high wispy clouds
    const cloudY1 = groundY * 0.15;
    this.renderCloudLayer(width, cloudY1, parallaxOffset, this.parallaxCloudOffset, 0.3, 40, 15);

    // Cloud layer 2 - mid fluffy clouds
    const cloudY2 = groundY * 0.35;
    this.renderCloudLayer(width, cloudY2, parallaxOffset, this.parallaxCloudOffset * 0.7, 0.25, 60, 25);

    // Cloud layer 3 - lower clouds near horizon
    const cloudY3 = groundY * 0.55;
    this.renderCloudLayer(width, cloudY3, parallaxOffset, this.parallaxCloudOffset * 0.5, 0.2, 80, 35);

    this.ctx.restore();
  }

  /**
   * Render a single layer of clouds.
   */
  private renderCloudLayer(
    width: number,
    baseY: number,
    parallaxOffset: number,
    driftOffset: number,
    opacity: number,
    cloudWidth: number,
    cloudHeight: number
  ): void {
    this.ctx.globalAlpha = opacity;

    // Cloud gradient for soft edges
    const numClouds = Math.ceil(width / (cloudWidth * 2)) + 4;
    const spacing = (width * 2) / numClouds;

    for (let i = 0; i < numClouds; i++) {
      // Position with both parallax and drift
      let cloudX = i * spacing - driftOffset - parallaxOffset;

      // Wrap clouds
      cloudX = ((cloudX % (width * 2)) + width * 2) % (width * 2) - width * 0.5;

      // Vary cloud properties procedurally
      const seed = i * 7919;
      const sizeVariation = 0.7 + (Math.sin(seed) * 0.5 + 0.5) * 0.6;
      const yVariation = Math.cos(seed * 1.3) * cloudHeight * 0.5;
      const actualWidth = cloudWidth * sizeVariation;
      const actualHeight = cloudHeight * sizeVariation;
      const cloudCenterY = baseY + yVariation;

      // Draw cloud as multiple overlapping ellipses for fluffy look
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

      // Main cloud body
      this.drawCloudPuff(cloudX, cloudCenterY, actualWidth, actualHeight);
      this.drawCloudPuff(cloudX - actualWidth * 0.3, cloudCenterY + actualHeight * 0.1, actualWidth * 0.7, actualHeight * 0.8);
      this.drawCloudPuff(cloudX + actualWidth * 0.35, cloudCenterY + actualHeight * 0.05, actualWidth * 0.6, actualHeight * 0.7);
      this.drawCloudPuff(cloudX - actualWidth * 0.1, cloudCenterY - actualHeight * 0.15, actualWidth * 0.5, actualHeight * 0.6);
    }
  }

  /**
   * Draw a single cloud puff (ellipse with soft edges).
   */
  private drawCloudPuff(x: number, y: number, width: number, height: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height));
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Render terrain as ground cross-section in side-view mode.
   * Shows multiple layers of terrain in front of the camera based on facing direction.
   */
  private renderSideViewTerrain(
    startChunkX: number,
    endChunkX: number,
    startChunkY: number,
    endChunkY: number
  ): void {
    // In side-view, we render terrain layers based on facing direction
    // The depth axis (X for E/W, Y for N/S) determines which slices we show

    const baseSeaLevelY = this.camera.viewportHeight * 0.70;
    const seaLevelScreenY = baseSeaLevelY + this.camera.sideViewVerticalOffset;
    const tilePixelSize = this.tileSize * this.camera.zoom;

    const depthAxis = this.camera.getDepthAxis();
    const depthDirection = this.camera.getDepthDirection();
    const maxDepthLayers = 20; // Show this many terrain rows in front (increased from 5)

    // For N/S facing: X is screen horizontal, iterate over Y depth slices
    // For E/W facing: Y is screen horizontal, iterate over X depth slices
    const isNorthSouth = depthAxis === 'y';

    // Get camera position
    const cameraWorldX = Math.floor(this.camera.x / this.tileSize);
    const cameraWorldY = Math.floor(this.camera.y / this.tileSize);

    // Get camera elevation for horizon calculations
    const cameraElevation = this.getTerrainElevationAt(cameraWorldX, cameraWorldY);

    // Render depth layers from back to front
    for (let layerIdx = maxDepthLayers - 1; layerIdx >= 0; layerIdx--) {
      // Calculate world position of this depth layer
      const depthOffset = layerIdx * depthDirection;
      const layerDepthPos = isNorthSouth
        ? cameraWorldY + depthOffset
        : cameraWorldX + depthOffset;

      // Calculate base depth fading (further = more faded)
      const baseDepthFade = 1 - (layerIdx / maxDepthLayers) * 0.3;

      if (isNorthSouth) {
        // North/South facing: iterate X horizontally, layer is at fixed Y
        const chunkY = Math.floor(layerDepthPos / CHUNK_SIZE);
        const localY = layerDepthPos - chunkY * CHUNK_SIZE;
        if (localY < 0 || localY >= CHUNK_SIZE) continue;

        for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
          if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
          const chunk = this.chunkManager.getChunk(chunkX, chunkY);

          for (let localX = 0; localX < CHUNK_SIZE; localX++) {
            const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
            if (!tile) continue;

            const worldTileX = chunkX * CHUNK_SIZE + localX;
            const screenX = (worldTileX * this.tileSize - this.camera.x) * this.camera.zoom
              + this.camera.viewportWidth / 2;

            if (screenX + tilePixelSize < 0 || screenX > this.camera.viewportWidth) continue;

            // Calculate horizon-aware fade based on tile elevation and distance
            const tileElevation = (tile as any).elevation ?? 0;
            const distance = Math.abs(layerIdx); // Depth distance in tiles
            const horizonFade = globalHorizonCalculator.getFogFade(
              cameraElevation,
              tileElevation,
              distance,
              maxDepthLayers
            );

            // Combine base depth fade with horizon curvature fade
            const depthFade = Math.min(baseDepthFade, horizonFade);

            this.renderSideViewTile(tile, screenX, seaLevelScreenY, tilePixelSize, depthFade, layerIdx);
          }
        }
      } else {
        // East/West facing: iterate Y horizontally, layer is at fixed X
        const chunkX = Math.floor(layerDepthPos / CHUNK_SIZE);
        const localX = layerDepthPos - chunkX * CHUNK_SIZE;
        if (localX < 0 || localX >= CHUNK_SIZE) continue;

        for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
          if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
          const chunk = this.chunkManager.getChunk(chunkX, chunkY);

          for (let localY = 0; localY < CHUNK_SIZE; localY++) {
            const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
            if (!tile) continue;

            const worldTileY = chunkY * CHUNK_SIZE + localY;
            const screenX = (worldTileY * this.tileSize - this.camera.y) * this.camera.zoom
              + this.camera.viewportWidth / 2;

            if (screenX + tilePixelSize < 0 || screenX > this.camera.viewportWidth) continue;

            // Calculate horizon-aware fade based on tile elevation and distance
            const tileElevation = (tile as any).elevation ?? 0;
            const distance = Math.abs(layerIdx); // Depth distance in tiles
            const horizonFade = globalHorizonCalculator.getFogFade(
              cameraElevation,
              tileElevation,
              distance,
              maxDepthLayers
            );

            // Combine base depth fade with horizon curvature fade
            const depthFade = Math.min(baseDepthFade, horizonFade);

            this.renderSideViewTile(tile, screenX, seaLevelScreenY, tilePixelSize, depthFade, layerIdx);
          }
        }
      }
    }
  }

  /**
   * Render a single tile in side-view mode.
   */
  private renderSideViewTile(
    tile: Tile,
    screenX: number,
    seaLevelScreenY: number,
    tilePixelSize: number,
    depthFade: number,
    layerIdx: number
  ): void {
    const elevation = (tile as any).elevation ?? 0;
    const elevationOffset = elevation * tilePixelSize;
    const tileScreenY = seaLevelScreenY - elevationOffset;

    // Get base color and apply depth fading
    const baseColor = TERRAIN_COLORS[tile.terrain];
    const color = this.applyDepthFade(baseColor, depthFade);

    // Draw the surface tile
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, tileScreenY, tilePixelSize, tilePixelSize);

    // Draw earth/rock underneath elevated terrain
    if (elevation > 0) {
      for (let h = 1; h <= elevation; h++) {
        const layerY = tileScreenY + h * tilePixelSize;
        if (layerY > this.camera.viewportHeight) break;

        const layerRatio = h / elevation;
        let layerColor: string;
        if (layerRatio < 0.3) {
          layerColor = this.darkenColor('#7a7a7a', 0.9 - h * 0.02);
        } else if (layerRatio < 0.7) {
          layerColor = this.darkenColor('#6b5a4a', 0.9 - h * 0.02);
        } else {
          layerColor = this.darkenColor('#8B7355', 0.9 - h * 0.02);
        }
        this.ctx.fillStyle = this.applyDepthFade(layerColor, depthFade);
        this.ctx.fillRect(screenX, layerY, tilePixelSize, tilePixelSize);
      }
    }

    // Draw underground layers (only for front layer to avoid overdraw)
    if (layerIdx === 0) {
      const startDepth = Math.max(0, -elevation);
      for (let depth = startDepth + 1; depth <= startDepth + 6; depth++) {
        const undergroundY = seaLevelScreenY + depth * tilePixelSize;
        if (undergroundY > this.camera.viewportHeight) break;

        const darkening = 1 - (depth - startDepth) * 0.1;
        this.ctx.fillStyle = this.darkenColor('#8B7355', darkening);
        this.ctx.fillRect(screenX, undergroundY, tilePixelSize, tilePixelSize);
      }
    }

    // Draw water at sea level for water tiles
    if (tile.terrain === 'water') {
      this.ctx.fillStyle = `rgba(100, 150, 200, ${0.6 * depthFade})`;
      this.ctx.fillRect(screenX, seaLevelScreenY, tilePixelSize, tilePixelSize * 2);

      this.ctx.fillStyle = `rgba(200, 230, 255, ${0.4 * depthFade})`;
      this.ctx.fillRect(screenX, seaLevelScreenY, tilePixelSize, tilePixelSize * 0.3);
    }

    // Draw grid lines for tile boundaries (front layer only)
    if (layerIdx === 0) {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(screenX, tileScreenY, tilePixelSize, tilePixelSize);
    }

    // Draw grass tufts on front layer only
    if (layerIdx === 0 && tile.terrain !== 'water' && tile.terrain !== 'stone') {
      const grassHeight = Math.max(2, 4 * this.camera.zoom);
      this.ctx.fillStyle = '#2d5a27';

      const tuftX = screenX + tilePixelSize * 0.3;
      const tuftX2 = screenX + tilePixelSize * 0.7;

      this.ctx.beginPath();
      this.ctx.moveTo(tuftX, tileScreenY);
      this.ctx.lineTo(tuftX + 3 * this.camera.zoom, tileScreenY - grassHeight);
      this.ctx.lineTo(tuftX + 6 * this.camera.zoom, tileScreenY);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(tuftX2, tileScreenY);
      this.ctx.lineTo(tuftX2 + 4 * this.camera.zoom, tileScreenY - grassHeight * 1.2);
      this.ctx.lineTo(tuftX2 + 8 * this.camera.zoom, tileScreenY);
      this.ctx.fill();
    }
  }

  /**
   * Apply depth fading to a color for layered side-view rendering.
   */
  private applyDepthFade(color: string, fade: number): string {
    // Parse hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Blend toward a fog color (light blue-gray)
    const fogR = 180, fogG = 195, fogB = 210;
    const newR = Math.round(r * fade + fogR * (1 - fade));
    const newG = Math.round(g * fade + fogG * (1 - fade));
    const newB = Math.round(b * fade + fogB * (1 - fade));

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Darken a hex color by a factor (0-1, where 1 is original color).
   */
  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  /**
   * Create a seeded pseudo-random number generator.
   * Returns a function that generates deterministic random numbers (0-1) based on the seed.
   * Uses a simple mulberry32 algorithm.
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Get the terrain elevation at a given world tile position.
   * Used for side-view rendering to place entities on the correct ground level.
   *
   * @param worldTileX - X coordinate in tile space
   * @param worldTileY - Y coordinate in tile space (depth row in side-view)
   * @returns Tile elevation (0 = sea level), or 0 if tile not found
   */
  private getTerrainElevationAt(worldTileX: number, worldTileY: number): number {
    const chunkX = Math.floor(worldTileX / CHUNK_SIZE);
    const chunkY = Math.floor(worldTileY / CHUNK_SIZE);

    if (!this.chunkManager.hasChunk(chunkX, chunkY)) {
      return 0;
    }

    const chunk = this.chunkManager.getChunk(chunkX, chunkY);
    const localX = worldTileX - chunkX * CHUNK_SIZE;
    const localY = worldTileY - chunkY * CHUNK_SIZE;

    if (localX < 0 || localX >= CHUNK_SIZE || localY < 0 || localY >= CHUNK_SIZE) {
      return 0;
    }

    const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
    if (!tile) {
      return 0;
    }

    return (tile as any).elevation ?? 0;
  }

  /**
   * Draw z-depth indicator for side-view mode.
   */
  private drawDepthIndicator(): void {
    const z = this.camera.z;
    const maxZ = this.camera.parallaxConfig.maxZDistance;

    // Position in bottom-right corner
    const x = this.camera.viewportWidth - 120;
    const y = this.camera.viewportHeight - 40;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 10, y - 20, 120, 50);

    // Label
    this.ctx.fillStyle = '#00CED1';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Depth: ${z.toFixed(1)}`, x, y);

    // Progress bar showing z position
    const barWidth = 100;
    const barHeight = 8;
    const barY = y + 10;

    // Bar background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x, barY, barWidth, barHeight);

    // Bar fill (center is 0, left is -max, right is +max)
    const normalized = (z + maxZ) / (2 * maxZ); // 0-1 range
    const fillWidth = normalized * barWidth;

    // Color based on direction
    if (z < 0) {
      this.ctx.fillStyle = '#4FC3F7'; // Blue for background
    } else if (z > 0) {
      this.ctx.fillStyle = '#FFB74D'; // Orange for foreground
    } else {
      this.ctx.fillStyle = '#81C784'; // Green for focus
    }
    this.ctx.fillRect(x, barY, fillWidth, barHeight);

    // Center line (focus point)
    this.ctx.strokeStyle = '#FFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + barWidth / 2, barY - 2);
    this.ctx.lineTo(x + barWidth / 2, barY + barHeight + 2);
    this.ctx.stroke();

    this.ctx.textAlign = 'left';
  }

  /**
   * Draw a procedural tree in side-view mode.
   * Creates a trunk with layered canopy that looks like a real tree.
   */
  private drawProceduralTree(
    centerX: number,
    groundY: number,
    trunkWidth: number,
    totalHeight: number,
    canopyWidth: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    const trunkHeight = totalHeight * 0.4; // Trunk is 40% of height
    const canopyHeight = totalHeight * 0.7; // Canopy overlaps trunk

    // Draw trunk
    const trunkX = centerX - trunkWidth / 2;
    const trunkY = groundY - trunkHeight;

    // Trunk gradient (lighter in middle)
    const trunkGradient = this.ctx.createLinearGradient(trunkX, 0, trunkX + trunkWidth, 0);
    trunkGradient.addColorStop(0, '#4A3728');
    trunkGradient.addColorStop(0.3, '#6B4423');
    trunkGradient.addColorStop(0.7, '#6B4423');
    trunkGradient.addColorStop(1, '#4A3728');

    this.ctx.fillStyle = trunkGradient;
    this.ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);

    // Trunk texture (bark lines)
    this.ctx.strokeStyle = '#3E2723';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < trunkHeight; i += 6) {
      const offset = (i % 12 < 6) ? 1 : -1;
      this.ctx.beginPath();
      this.ctx.moveTo(trunkX + 2, trunkY + i);
      this.ctx.lineTo(trunkX + trunkWidth / 2 + offset * 2, trunkY + i + 3);
      this.ctx.lineTo(trunkX + trunkWidth - 2, trunkY + i + 1);
      this.ctx.stroke();
    }

    // Draw canopy as layered circles/ellipses
    const canopyY = groundY - totalHeight;
    const numLayers = 4;

    for (let layer = 0; layer < numLayers; layer++) {
      const layerRatio = layer / numLayers;
      const layerY = canopyY + canopyHeight * layerRatio * 0.6;
      const layerWidth = canopyWidth * (1 - layerRatio * 0.3);
      const layerHeight = canopyHeight * 0.35;

      // Color gets lighter towards top (use seeded random for variation)
      const greenBase = 40 + layer * 15;
      const greenHigh = 100 + layer * 20;
      this.ctx.fillStyle = `rgb(${30 + layer * 10}, ${greenBase + Math.floor(random() * 20)}, ${20 + layer * 5})`;

      // Draw ellipse for this layer
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, layerY + layerHeight / 2, layerWidth / 2, layerHeight / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Add some texture dots
      this.ctx.fillStyle = `rgb(${50 + layer * 15}, ${greenHigh}, ${30 + layer * 10})`;
      for (let dot = 0; dot < 5; dot++) {
        const dotX = centerX + (random() - 0.5) * layerWidth * 0.7;
        const dotY = layerY + random() * layerHeight * 0.8;
        const dotSize = 2 + random() * 3;
        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Draw a procedural rock formation in side-view mode.
   */
  private drawProceduralRock(
    x: number,
    y: number,
    width: number,
    height: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    // Draw stacked rock shapes
    const numRocks = Math.max(1, Math.floor(height / (width * 0.6)));
    const rockHeight = height / numRocks;

    for (let i = 0; i < numRocks; i++) {
      const rockY = y + i * rockHeight;
      const rockWidth = width * (0.7 + random() * 0.3);
      const rockX = x + (width - rockWidth) / 2 + (random() - 0.5) * width * 0.2;

      // Rock color (gray with variation)
      const grayBase = 80 + Math.floor(random() * 40);
      this.ctx.fillStyle = `rgb(${grayBase}, ${grayBase - 5}, ${grayBase - 10})`;

      // Draw rock as polygon
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.1, rockY + rockHeight);
      this.ctx.lineTo(rockX, rockY + rockHeight * 0.3);
      this.ctx.lineTo(rockX + rockWidth * 0.3, rockY);
      this.ctx.lineTo(rockX + rockWidth * 0.7, rockY + rockHeight * 0.1);
      this.ctx.lineTo(rockX + rockWidth, rockY + rockHeight * 0.4);
      this.ctx.lineTo(rockX + rockWidth * 0.9, rockY + rockHeight);
      this.ctx.closePath();
      this.ctx.fill();

      // Add highlight
      this.ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.2, rockY + rockHeight * 0.2);
      this.ctx.lineTo(rockX + rockWidth * 0.4, rockY + rockHeight * 0.1);
      this.ctx.lineTo(rockX + rockWidth * 0.5, rockY + rockHeight * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      // Add shadow
      this.ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.6, rockY + rockHeight * 0.7);
      this.ctx.lineTo(rockX + rockWidth * 0.9, rockY + rockHeight * 0.5);
      this.ctx.lineTo(rockX + rockWidth * 0.85, rockY + rockHeight);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  /**
   * Draw a procedural mountain in side-view mode.
   * Creates a triangular peak with snow cap and rock texture.
   */
  private drawProceduralMountain(
    centerX: number,
    groundY: number,
    baseWidth: number,
    height: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    const peakY = groundY - height;
    const leftX = centerX - baseWidth / 2;
    const rightX = centerX + baseWidth / 2;

    // Main mountain body - gradient from dark at bottom to lighter at top
    const mountainGradient = this.ctx.createLinearGradient(0, groundY, 0, peakY);
    mountainGradient.addColorStop(0, '#4a4a4a'); // Dark gray at base
    mountainGradient.addColorStop(0.4, '#6b6b6b'); // Medium gray
    mountainGradient.addColorStop(0.7, '#8a8a8a'); // Light gray
    mountainGradient.addColorStop(1, '#a0a0a0'); // Lightest at peak

    this.ctx.fillStyle = mountainGradient;
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, groundY);
    this.ctx.lineTo(centerX, peakY);
    this.ctx.lineTo(rightX, groundY);
    this.ctx.closePath();
    this.ctx.fill();

    // Add rocky texture - jagged lines
    this.ctx.strokeStyle = '#3a3a3a';
    this.ctx.lineWidth = 1;
    const numRidges = Math.floor(height / 15);
    for (let i = 0; i < numRidges; i++) {
      const ridgeY = groundY - (height * (i + 1)) / (numRidges + 1);
      const ridgeWidth = baseWidth * (1 - (i + 1) / (numRidges + 2));
      const ridgeLeftX = centerX - ridgeWidth / 2;
      const ridgeRightX = centerX + ridgeWidth / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(ridgeLeftX, ridgeY);
      // Jagged line across
      const numJags = 3 + Math.floor(random() * 3);
      for (let j = 1; j <= numJags; j++) {
        const jagX = ridgeLeftX + (ridgeWidth * j) / (numJags + 1);
        const jagY = ridgeY + (random() - 0.5) * 8;
        this.ctx.lineTo(jagX, jagY);
      }
      this.ctx.lineTo(ridgeRightX, ridgeY);
      this.ctx.stroke();
    }

    // Snow cap on tall mountains (height > 60px)
    if (height > 60) {
      const snowHeight = height * 0.25;
      const snowY = peakY + snowHeight;
      const snowWidth = baseWidth * 0.35;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - snowWidth / 2, snowY);
      this.ctx.lineTo(centerX, peakY);
      this.ctx.lineTo(centerX + snowWidth / 2, snowY);
      // Wavy bottom edge for snow
      this.ctx.quadraticCurveTo(centerX + snowWidth / 4, snowY + 5, centerX, snowY + 3);
      this.ctx.quadraticCurveTo(centerX - snowWidth / 4, snowY + 5, centerX - snowWidth / 2, snowY);
      this.ctx.closePath();
      this.ctx.fill();

      // Snow highlights
      this.ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - snowWidth / 4, snowY - snowHeight * 0.3);
      this.ctx.lineTo(centerX - snowWidth / 8, peakY + 3);
      this.ctx.lineTo(centerX, snowY - snowHeight * 0.5);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Shadow on right side
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, peakY);
    this.ctx.lineTo(rightX, groundY);
    this.ctx.lineTo(centerX + baseWidth * 0.1, groundY);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Render a single chunk.
   */
  private renderChunk(chunk: Chunk): void {
    for (let localY = 0; localY < CHUNK_SIZE; localY++) {
      for (let localX = 0; localX < CHUNK_SIZE; localX++) {
        const worldX = (chunk.x * CHUNK_SIZE + localX) * this.tileSize;
        const worldY = (chunk.y * CHUNK_SIZE + localY) * this.tileSize;

        const tile = chunk.tiles[localY * CHUNK_SIZE + localX];
        if (!tile) continue;

        const screen = this.camera.worldToScreen(worldX, worldY);
        const tilePixelSize = this.tileSize * this.camera.zoom;

        // Draw base tile
        const color = TERRAIN_COLORS[tile.terrain];
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          screen.x,
          screen.y,
          tilePixelSize,
          tilePixelSize
        );

        // Draw tilled indicator (VERY PROMINENT - must be clearly visible!)
        if (tile.tilled) {
          // DEBUG: Log first time we detect a tilled tile (to verify rendering is working)
          if (!this.hasLoggedTilledTile) {
            this.hasLoggedTilledTile = true;
          }

          // CRITICAL: Make tilled soil VERY different from untilled dirt
          // Use an EVEN DARKER brown base for maximum distinction
          // This creates extreme contrast with both grass (green) and natural dirt (light brown)
          this.ctx.fillStyle = 'rgba(45, 25, 10, 1.0)'; // EVEN DARKER, 100% opacity for maximum visibility
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add EXTRA THICK horizontal furrows (visible even at low zoom)
          // Use nearly black furrows with increased thickness
          this.ctx.strokeStyle = 'rgba(15, 8, 3, 1.0)'; // Even darker furrows
          this.ctx.lineWidth = Math.max(4, this.camera.zoom * 3); // THICKER lines (was 3, now 4 minimum)
          const furrowCount = 7; // Even more furrows for unmistakable pattern
          const furrowSpacing = tilePixelSize / (furrowCount + 1);

          for (let i = 1; i <= furrowCount; i++) {
            const y = screen.y + furrowSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x, y);
            this.ctx.lineTo(screen.x + tilePixelSize, y);
            this.ctx.stroke();
          }

          // Add vertical lines for grid pattern (makes it unmistakable)
          this.ctx.strokeStyle = 'rgba(15, 8, 3, 0.9)'; // Match furrow color
          this.ctx.lineWidth = Math.max(3, this.camera.zoom * 1.5); // Thicker vertical lines
          const verticalCount = 5; // More vertical lines for denser grid
          const verticalSpacing = tilePixelSize / (verticalCount + 1);

          for (let i = 1; i <= verticalCount; i++) {
            const x = screen.x + verticalSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, screen.y);
            this.ctx.lineTo(x, screen.y + tilePixelSize);
            this.ctx.stroke();
          }

          // Add DOUBLE BORDER for maximum visibility
          // Inner border: BRIGHTER orange for extreme visibility
          this.ctx.strokeStyle = 'rgba(255, 140, 60, 1.0)'; // BRIGHTER orange (increased from 200,120,60)
          this.ctx.lineWidth = Math.max(4, this.camera.zoom * 1.5); // THICKER inner border (was 3)
          this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Outer border: darker for contrast
          this.ctx.strokeStyle = 'rgba(90, 50, 20, 1.0)'; // Even darker outer border for more contrast
          this.ctx.lineWidth = Math.max(3, this.camera.zoom); // Thicker outer border (was 2)
          this.ctx.strokeRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
        }

        // Draw moisture indicator (blue tint for wet tiles)
        if (tile.moisture > 60) {
          const moistureAlpha = ((tile.moisture - 60) / 40) * 0.3; // 0-0.3 based on moisture 60-100
          this.ctx.fillStyle = `rgba(30, 144, 255, ${moistureAlpha})`;
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
        }

        // Draw fertilized indicator (golden glow)
        if (tile.fertilized) {
          this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'; // Gold
          this.ctx.lineWidth = Math.max(1, this.camera.zoom);
          this.ctx.strokeRect(screen.x, screen.y, tilePixelSize, tilePixelSize);
        }

        // ====================================================================
        // TILE-BASED VOXEL BUILDING RENDERING (walls, doors, windows)
        // ====================================================================
        const tileWithBuilding = tile as typeof tile & {
          wall?: { material: string; condition: number; constructionProgress?: number };
          door?: { material: string; state: 'open' | 'closed' | 'locked'; constructionProgress?: number };
          window?: { material: string; condition: number; constructionProgress?: number };
        };

        // Render wall tiles
        if (tileWithBuilding.wall) {
          // Debug: Log first wall detected (only once per session)
          if (!this.hasLoggedWallRender) {
            this.hasLoggedWallRender = true;
            console.log(`[Renderer] ✅ Detected wall tile at world (${chunk.x * CHUNK_SIZE + localX}, ${chunk.y * CHUNK_SIZE + localY})`, tileWithBuilding.wall);
          }

          const wall = tileWithBuilding.wall;
          const progress = wall.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // Material-based colors
          const wallColors: Record<string, string> = {
            wood: '#8B7355',
            stone: '#6B6B6B',
            mud_brick: '#A0826D',
            ice: '#B8E6FF',
            metal: '#4A4A4A',
            glass: '#87CEEB',
            thatch: '#D4B896',
          };
          const wallColor = wallColors[wall.material] ?? '#6B6B6B';

          // Fill wall tile
          this.ctx.fillStyle = `rgba(${parseInt(wallColor.slice(1, 3), 16)}, ${parseInt(wallColor.slice(3, 5), 16)}, ${parseInt(wallColor.slice(5, 7), 16)}, ${alpha})`;
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add border for wall definition
          this.ctx.strokeStyle = `rgba(40, 40, 40, ${alpha * 0.8})`;
          this.ctx.lineWidth = Math.max(1, this.camera.zoom * 0.5);
          this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

          // Show construction progress if incomplete
          if (progress < 100) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = `${Math.max(8, this.camera.zoom * 6)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${Math.round(progress)}%`, screen.x + tilePixelSize / 2, screen.y + tilePixelSize / 2);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
          }
        }

        // Render door tiles
        if (tileWithBuilding.door) {
          const door = tileWithBuilding.door;
          const progress = door.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 1.0 : 0.4 + (progress / 100) * 0.4;

          // Material-based colors
          const doorColors: Record<string, string> = {
            wood: '#654321',
            stone: '#505050',
            metal: '#383838',
            cloth: '#8B4513',
          };
          const doorColor = doorColors[door.material] ?? '#654321';

          if (door.state === 'open') {
            // Open door: render as thin outline (passable)
            this.ctx.strokeStyle = `rgba(${parseInt(doorColor.slice(1, 3), 16)}, ${parseInt(doorColor.slice(3, 5), 16)}, ${parseInt(doorColor.slice(5, 7), 16)}, ${alpha})`;
            this.ctx.lineWidth = Math.max(2, this.camera.zoom);
            this.ctx.strokeRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);
            // Add dashed pattern to indicate open
            this.ctx.setLineDash([3, 3]);
            this.ctx.strokeRect(screen.x + 4, screen.y + 4, tilePixelSize - 8, tilePixelSize - 8);
            this.ctx.setLineDash([]);
          } else {
            // Closed/locked door: render as solid with handle
            this.ctx.fillStyle = `rgba(${parseInt(doorColor.slice(1, 3), 16)}, ${parseInt(doorColor.slice(3, 5), 16)}, ${parseInt(doorColor.slice(5, 7), 16)}, ${alpha})`;
            this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

            // Door frame (lighter)
            this.ctx.strokeStyle = `rgba(160, 120, 80, ${alpha})`;
            this.ctx.lineWidth = Math.max(1, this.camera.zoom * 0.3);
            this.ctx.strokeRect(screen.x + 1, screen.y + 1, tilePixelSize - 2, tilePixelSize - 2);

            // Door handle (small circle on right side)
            this.ctx.fillStyle = door.state === 'locked' ? 'rgba(200, 200, 80, 0.9)' : 'rgba(180, 140, 100, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(screen.x + tilePixelSize * 0.75, screen.y + tilePixelSize * 0.5, Math.max(2, this.camera.zoom), 0, Math.PI * 2);
            this.ctx.fill();

            // Lock indicator for locked doors
            if (door.state === 'locked') {
              this.ctx.strokeStyle = 'rgba(200, 200, 80, 0.9)';
              this.ctx.lineWidth = Math.max(1, this.camera.zoom * 0.5);
              this.ctx.strokeRect(screen.x + tilePixelSize * 0.7, screen.y + tilePixelSize * 0.35, tilePixelSize * 0.1, tilePixelSize * 0.15);
            }
          }
        }

        // Render window tiles
        if (tileWithBuilding.window) {
          const window = tileWithBuilding.window;
          const progress = window.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.6 : 0.3 + (progress / 100) * 0.3;

          // Semi-transparent glass effect
          this.ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`; // Sky blue glass
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Window frame (dark border)
          this.ctx.strokeStyle = `rgba(60, 40, 30, ${alpha + 0.2})`;
          this.ctx.lineWidth = Math.max(2, this.camera.zoom * 0.7);
          this.ctx.strokeRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);

          // Cross pattern for window panes
          this.ctx.beginPath();
          this.ctx.moveTo(screen.x + tilePixelSize / 2, screen.y + 2);
          this.ctx.lineTo(screen.x + tilePixelSize / 2, screen.y + tilePixelSize - 2);
          this.ctx.moveTo(screen.x + 2, screen.y + tilePixelSize / 2);
          this.ctx.lineTo(screen.x + tilePixelSize - 2, screen.y + tilePixelSize / 2);
          this.ctx.stroke();
        }

        // Render roof tiles (overlay on interior tiles)
        const tileWithRoof = tile as typeof tile & {
          roof?: { material: string; condition: number; constructionProgress?: number };
        };
        if (tileWithRoof.roof) {
          const roof = tileWithRoof.roof;
          const progress = roof.constructionProgress ?? 100;
          const alpha = progress >= 100 ? 0.7 : 0.3 + (progress / 100) * 0.4;

          // Material-based colors for roofs
          const roofColors: Record<string, string> = {
            thatch: '#C4A35A', // Golden straw
            wood: '#8B6914', // Darker wood
            tile: '#B85C38', // Terracotta
            slate: '#4A5568', // Gray slate
            metal: '#6B7280', // Metallic gray
          };
          const roofColor = roofColors[roof.material] ?? '#C4A35A';

          // Draw roof with slight offset to show depth (rendering as if viewed from above)
          // Draw a diagonal pattern to indicate roofing
          this.ctx.fillStyle = `rgba(${parseInt(roofColor.slice(1, 3), 16)}, ${parseInt(roofColor.slice(3, 5), 16)}, ${parseInt(roofColor.slice(5, 7), 16)}, ${alpha})`;

          // Draw roof as semi-transparent overlay with texture pattern
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add diagonal line pattern to indicate roof texture
          this.ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
          this.ctx.lineWidth = Math.max(1, this.camera.zoom * 0.3);

          // Draw diagonal lines for roof texture
          const step = Math.max(3, tilePixelSize / 4);
          for (let i = 0; i < tilePixelSize * 2; i += step) {
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + i, screen.y);
            this.ctx.lineTo(screen.x, screen.y + i);
            this.ctx.stroke();
          }

          // Show construction progress if incomplete
          if (progress < 100) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = `${Math.max(8, this.camera.zoom * 6)}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`${Math.round(progress)}%`, screen.x + tilePixelSize / 2, screen.y + tilePixelSize / 2);
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
          }
        }

        // Draw temperature overlay (debug feature)
        // Note: Temperature is not currently stored per-tile, but this allows for future expansion
        const tileWithTemp = tile as typeof tile & { temperature?: number };
        if (this.showTemperatureOverlay && tileWithTemp.temperature !== undefined) {
          // Draw semi-transparent background for readability
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          this.ctx.fillRect(screen.x + 2, screen.y + 2, tilePixelSize - 4, tilePixelSize - 4);

          // Color-code temperature: cold = blue, warm = orange, hot = red
          let tempColor = '#FFFFFF';
          const temp = tileWithTemp.temperature;
          if (temp < 0) {
            tempColor = '#4FC3F7'; // Cold blue
          } else if (temp < 10) {
            tempColor = '#81C784'; // Cool green
          } else if (temp < 20) {
            tempColor = '#FFD54F'; // Mild yellow
          } else if (temp < 30) {
            tempColor = '#FFB74D'; // Warm orange
          } else {
            tempColor = '#FF6E40'; // Hot red
          }

          this.ctx.fillStyle = tempColor;
          this.ctx.font = `bold ${Math.max(8, this.camera.zoom * 8)}px monospace`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(
            Math.round(temp).toString() + '°',
            screen.x + tilePixelSize / 2,
            screen.y + tilePixelSize / 2
          );
          this.ctx.textAlign = 'left';
          this.ctx.textBaseline = 'alphabetic';
        }
      }
    }
  }

  /**
   * Draw building label above sprite for better visibility.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param buildingType Building type ID
   * @param isUnderConstruction Whether building is under construction
   */
  private drawBuildingLabel(
    screenX: number,
    screenY: number,
    buildingType: string,
    isUnderConstruction: boolean
  ): void {
    // Only show labels when zoomed in enough
    if (this.camera.zoom < 0.5) return;

    const fontSize = Math.max(8, 10 * this.camera.zoom);
    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    // Format building type for display
    const label = buildingType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Position label above the sprite
    const labelY = screenY - (isUnderConstruction ? 20 : 8) * this.camera.zoom;

    // Draw background for better readability
    const metrics = this.ctx.measureText(label);
    const padding = 2;
    const bgX = screenX + (this.tileSize * this.camera.zoom) / 2 - metrics.width / 2 - padding;
    const bgY = labelY - fontSize;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = fontSize + padding;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw label text
    this.ctx.fillStyle = isUnderConstruction ? '#FFA500' : '#FFFFFF';
    this.ctx.fillText(
      label,
      screenX + (this.tileSize * this.camera.zoom) / 2,
      labelY
    );

    this.ctx.textAlign = 'left'; // Reset
  }

  /**
   * Draw construction progress bar above a building.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param progress Construction progress (0-100)
   */
  private drawConstructionProgress(screenX: number, screenY: number, progress: number): void {
    const barWidth = this.tileSize * this.camera.zoom;
    const barHeight = 4 * this.camera.zoom;
    const barX = screenX;
    const barY = screenY - barHeight - 2;

    // Background (dark gray)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress fill (yellow to green gradient based on progress)
    const progressWidth = (barWidth * progress) / 100;
    if (progress < 50) {
      this.ctx.fillStyle = '#FFA500'; // Orange
    } else if (progress < 75) {
      this.ctx.fillStyle = '#FFFF00'; // Yellow
    } else {
      this.ctx.fillStyle = '#00FF00'; // Green
    }
    this.ctx.fillRect(barX, barY, progressWidth, barHeight);

    // Border (white)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Progress percentage text (if zoom is large enough)
    if (this.camera.zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `${10 * this.camera.zoom}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        `${progress.toFixed(0)}%`,
        barX + barWidth / 2,
        barY - 2
      );
      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Draw resource amount bar for harvestable resources (trees, rocks).
   * Shows current amount / max amount with color-coded bar.
   * Bar is always visible; text appears when zoomed in enough.
   */
  private drawResourceAmount(
    screenX: number,
    screenY: number,
    amount: number,
    maxAmount: number,
    resourceType: string
  ): void {
    const barWidth = this.tileSize * this.camera.zoom;
    const barHeight = Math.max(3, 4 * this.camera.zoom); // Minimum 3px height for visibility
    const barX = screenX;
    const barY = screenY + this.tileSize * this.camera.zoom + 2; // Below sprite

    // Calculate percentage
    const percentage = (amount / maxAmount) * 100;

    // Background (dark gray with higher opacity for better visibility)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Resource fill (color based on resource type and percentage)
    const resourceColors: Record<string, string> = {
      wood: '#8B4513', // Brown
      stone: '#A0A0A0', // Gray
      food: '#00FF00', // Green
      water: '#1E90FF', // Blue
    };

    let fillColor = resourceColors[resourceType] || '#FFFFFF';

    // Override color based on depletion level for better feedback
    if (percentage < 25) {
      fillColor = '#FF3333'; // Bright red if low
    } else if (percentage < 50) {
      fillColor = '#FF8800'; // Orange if medium
    }

    const fillWidth = (barWidth * amount) / maxAmount;
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border (white, more visible)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Resource amount text (show at lower zoom threshold for better UX)
    if (this.camera.zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${Math.max(8, 9 * this.camera.zoom)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 3;
      this.ctx.fillText(
        `${amount.toFixed(0)}/${maxAmount}`,
        barX + barWidth / 2,
        barY + barHeight + Math.max(10, 11 * this.camera.zoom)
      );
      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Draw agent behavior label above the agent.
   * Shows what the agent is currently doing.
   */
  /**
   * Draw floating Z's bubble above sleeping agents
   * Positioned above the behavior label for better visibility
   */
  private drawSleepingIndicator(screenX: number, screenY: number): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    const centerX = screenX + (this.tileSize * this.camera.zoom) / 2;
    // Position Z's ABOVE the behavior label (which is at screenY - 8 to -18)
    const baseY = screenY - 40 * this.camera.zoom;

    // Animate Z's with floating effect
    const time = Date.now() / 1000;
    const offset1 = Math.sin(time * 2) * 3 * this.camera.zoom;
    const offset2 = Math.sin(time * 2 + 0.5) * 3 * this.camera.zoom;
    const offset3 = Math.sin(time * 2 + 1.0) * 3 * this.camera.zoom;

    // Draw three Z's of increasing size with bubble effect
    this.ctx.font = `bold ${12 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.textAlign = 'center';

    this.ctx.fillText('Z', centerX - 8 * this.camera.zoom, baseY + offset1);

    this.ctx.font = `bold ${14 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fillText('Z', centerX + 2 * this.camera.zoom, baseY - 10 * this.camera.zoom + offset2);

    this.ctx.font = `bold ${16 * this.camera.zoom}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillText('Z', centerX + 12 * this.camera.zoom, baseY - 20 * this.camera.zoom + offset3);

    // Reset
    this.ctx.textAlign = 'left';
  }

  /**
   * Draw reflection indicator above agents who are reflecting
   * Shows a glowing thought bubble effect
   */
  private drawReflectionIndicator(screenX: number, screenY: number, reflectionType?: string): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    const centerX = screenX + (this.tileSize * this.camera.zoom) / 2;
    // Position above the sleeping indicator area
    const baseY = screenY - 60 * this.camera.zoom;

    // Animate with pulsing glow effect
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0

    // Draw thought bubble emoji with glow
    this.ctx.font = `bold ${18 * this.camera.zoom}px Arial`;
    this.ctx.textAlign = 'center';

    // Glow effect
    this.ctx.shadowBlur = 8 * pulse * this.camera.zoom;
    this.ctx.shadowColor = '#9370DB'; // Medium purple glow
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;

    // Use different emoji based on reflection type
    const emoji = reflectionType === 'deep' ? '🌟' : '💭';
    this.ctx.fillText(emoji, centerX, baseY);

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = 'left';
  }

  private drawAgentBehavior(
    screenX: number,
    screenY: number,
    behavior: string,
    behaviorState?: Record<string, unknown>,
    circadian?: CircadianComponent
  ): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    // Check if actually sleeping (from circadian component)
    const isActuallySleeping = circadian?.isSleeping || false;

    // Format behavior for display
    let displayText = behavior.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Override display if actually sleeping (regardless of behavior state)
    if (isActuallySleeping) {
      displayText = 'Sleeping 💤💤💤';
    } else if (behavior === 'gather' && behaviorState?.resourceType) {
      const resourceType = behaviorState.resourceType as string;
      displayText = `Gathering ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    } else if (behavior === 'build' && behaviorState?.buildingType) {
      displayText = `Building ${behaviorState.buildingType as string}`;
    } else if (behavior === 'seek_food') {
      displayText = 'Foraging';
    } else if (behavior === 'wander') {
      displayText = 'Wandering';
    } else if (behavior === 'idle') {
      displayText = 'Idle';
    } else if (behavior === 'talk') {
      displayText = 'Talking';
    } else if (behavior === 'follow_agent') {
      displayText = 'Following';
    } else if (behavior === 'seek_sleep') {
      displayText = 'Seeking Sleep 😴';
    } else if (behavior === 'forced_sleep') {
      displayText = 'Sleeping 💤💤💤';
    }

    // Position above sprite
    const labelX = screenX + (this.tileSize * this.camera.zoom) / 2;
    const labelY = screenY - 8 * this.camera.zoom;

    // Draw background
    this.ctx.font = `${9 * this.camera.zoom}px monospace`;
    const textWidth = this.ctx.measureText(displayText).width;
    const padding = 3 * this.camera.zoom;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - 10 * this.camera.zoom,
      textWidth + padding * 2,
      12 * this.camera.zoom
    );

    // Draw text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(displayText, labelX, labelY - 4 * this.camera.zoom);

    // Reset
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  /**
   * Draw animal state label above the animal.
   * Shows what the animal is currently doing.
   */
  private drawAnimalState(
    screenX: number,
    screenY: number,
    state: string,
    wild: boolean
  ): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    // Format state for display
    let displayText = state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Add emoji indicators
    if (state === 'sleeping') {
      displayText = 'Sleeping 💤';
    } else if (state === 'eating') {
      displayText = 'Eating 🍽️';
    } else if (state === 'drinking') {
      displayText = 'Drinking 💧';
    } else if (state === 'foraging') {
      displayText = 'Foraging 🌾';
    } else if (state === 'fleeing') {
      displayText = 'Fleeing 💨';
    } else if (state === 'idle') {
      displayText = wild ? 'Wild' : 'Idle';
    }

    // Position above sprite
    const labelX = screenX + (this.tileSize * this.camera.zoom) / 2;
    const labelY = screenY - 8 * this.camera.zoom;

    // Draw background
    this.ctx.font = `${9 * this.camera.zoom}px monospace`;
    const textWidth = this.ctx.measureText(displayText).width;
    const padding = 3 * this.camera.zoom;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - 10 * this.camera.zoom,
      textWidth + padding * 2,
      12 * this.camera.zoom
    );

    // Draw text (different color for wild animals)
    this.ctx.fillStyle = wild ? '#FFA500' : '#90EE90'; // Orange for wild, light green for tamed
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(displayText, labelX, labelY - 4 * this.camera.zoom);

    // Reset
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }

  /**
   * Draw visual indicators for agent-building interactions.
   * Shows when agents are near buildings (seeking warmth, shelter, working on construction).
   */
  private drawAgentBuildingInteractions(world: World, selectedEntity?: Entity | { id: string }): void {
    // Get all agents
    const agents = world.query().with('agent', 'position').executeEntities();

    // Get all buildings
    const buildings = world.query().with('building', 'position').executeEntities();

    const interactionRadius = 2.0; // tiles

    for (const agent of agents) {
      const agentPos = agent.components.get('position') as PositionComponent | undefined;
      const agentComp = agent.components.get('agent') as AgentComponent | undefined;
      const temperature = agent.components.get('temperature') as TemperatureComponent | undefined;

      if (!agentPos || !agentComp) continue;

      // Check if agent is near any building
      for (const building of buildings) {
        const buildingPos = building.components.get('position') as PositionComponent | undefined;
        const buildingComp = building.components.get('building') as BuildingComponent | undefined;

        if (!buildingPos || !buildingComp) continue;

        // Calculate distance
        const dx = agentPos.x - buildingPos.x;
        const dy = agentPos.y - buildingPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= interactionRadius) {
          // Agent is near building - determine interaction type
          let interactionType: string | null = null;
          let interactionColor = '#FFFFFF';

          // Check for warmth interaction (campfire)
          if (buildingComp.buildingType === 'campfire' && buildingComp.isComplete) {
            if (temperature && (temperature.state === 'cold' || temperature.state === 'dangerously_cold')) {
              interactionType = 'WARMTH';
              interactionColor = '#FF6600';
            }
          }

          // Check for shelter interaction (bed, bedroll)
          // NOTE: Multi-tile shelters (houses, tents) now use TileBasedBlueprintRegistry
          if ((buildingComp.buildingType === 'bed' || buildingComp.buildingType === 'bedroll') && buildingComp.isComplete) {
            // Could check for shelter need here if we had that component
            interactionType = 'SHELTER';
            interactionColor = '#00AAFF';
          }

          // Check for construction work
          if (!buildingComp.isComplete && agentComp.behavior === 'build') {
            interactionType = 'BUILDING';
            interactionColor = '#FFAA00';
          }

          // Draw interaction indicator
          if (interactionType) {
            this.drawInteractionIndicator(agentPos, buildingPos, interactionType, interactionColor);
          }

          // Only show interaction for selected agent or all agents
          if (!selectedEntity || agent.id === selectedEntity.id) {
            // Already handled above
          }
        }
      }
    }
  }

  /**
   * Draw a line and label between agent and building to show interaction.
   */
  private drawInteractionIndicator(
    agentPos: { x: number; y: number },
    buildingPos: { x: number; y: number },
    interactionType: string,
    color: string
  ): void {
    const agentWorldX = agentPos.x * this.tileSize + (this.tileSize / 2);
    const agentWorldY = agentPos.y * this.tileSize + (this.tileSize / 2);
    const buildingWorldX = buildingPos.x * this.tileSize + (this.tileSize / 2);
    const buildingWorldY = buildingPos.y * this.tileSize + (this.tileSize / 2);

    const agentScreen = this.camera.worldToScreen(agentWorldX, agentWorldY);
    const buildingScreen = this.camera.worldToScreen(buildingWorldX, buildingWorldY);

    // Draw line
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.moveTo(agentScreen.x, agentScreen.y);
    this.ctx.lineTo(buildingScreen.x, buildingScreen.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;

    // Draw label at midpoint
    const midX = (agentScreen.x + buildingScreen.x) / 2;
    const midY = (agentScreen.y + buildingScreen.y) / 2;

    const fontSize = Math.max(8, 9 * this.camera.zoom);
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    // Background
    const metrics = this.ctx.measureText(interactionType);
    const padding = 3;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(
      midX - metrics.width / 2 - padding,
      midY - fontSize,
      metrics.width + padding * 2,
      fontSize + padding
    );

    // Text
    this.ctx.fillStyle = color;
    this.ctx.fillText(interactionType, midX, midY);
    this.ctx.textAlign = 'left';
  }

  /**
   * Draw navigation path for selected entity.
   * Shows a line from current position to destination target.
   */
  private drawNavigationPath(world: World, selectedEntity?: Entity | { id: string }): void {
    if (!selectedEntity) return;

    // Get the full entity from world if we only have an ID
    let entity: Entity | undefined;
    if ('components' in selectedEntity) {
      // Already a full Entity
      entity = selectedEntity;
    } else {
      // Just an ID, look up from world
      entity = world.getEntity(selectedEntity.id);
    }

    if (!entity) return;

    const position = entity.getComponent('position') as PositionComponent | undefined;
    if (!position) return;

    // Try to find a target from multiple sources
    let targetX: number | undefined;
    let targetY: number | undefined;

    // 1. Check steering component first
    const steering = entity.getComponent('steering') as SteeringComponent | undefined;
    if (steering?.target) {
      targetX = steering.target.x;
      targetY = steering.target.y;
    }

    // 2. If no steering target, check action queue for targetPos
    if (targetX === undefined || targetY === undefined) {
      const actionQueue = entity.getComponent('action_queue') as any;

      if (actionQueue) {
        // Try to access queue data - the structure might vary
        let actions: any[] = [];

        if (typeof actionQueue.peek === 'function') {
          const current = actionQueue.peek();
          if (current) actions = [current];
        } else if (Array.isArray(actionQueue.queue)) {
          actions = actionQueue.queue;
        } else if (typeof actionQueue.isEmpty === 'function' && !actionQueue.isEmpty()) {
          // Last resort: try internal queue property
          actions = (actionQueue as any)._queue || (actionQueue as any).actions || [];
        }

        if (actions.length > 0) {
          const currentAction = actions[0];
          if (currentAction?.targetPos) {
            targetX = currentAction.targetPos.x;
            targetY = currentAction.targetPos.y;
          }
        }
      }
    }

    // No target found
    if (targetX === undefined || targetY === undefined) {
      return;
    }

    const currentX = position.x * this.tileSize + (this.tileSize / 2);
    const currentY = position.y * this.tileSize + (this.tileSize / 2);
    const targetWorldX = targetX * this.tileSize + (this.tileSize / 2);
    const targetWorldY = targetY * this.tileSize + (this.tileSize / 2);

    const currentScreen = this.camera.worldToScreen(currentX, currentY);
    const targetScreen = this.camera.worldToScreen(targetWorldX, targetWorldY);

    // Draw dashed line from current position to target
    this.ctx.strokeStyle = '#00CCFF'; // Cyan color
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([8, 4]);
    this.ctx.globalAlpha = 0.7;
    this.ctx.beginPath();
    this.ctx.moveTo(currentScreen.x, currentScreen.y);
    this.ctx.lineTo(targetScreen.x, targetScreen.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;

    // Draw target marker (circle with cross)
    const markerRadius = Math.max(6, 8 * this.camera.zoom);

    // Outer circle
    this.ctx.strokeStyle = '#00CCFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(targetScreen.x, targetScreen.y, markerRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner cross
    this.ctx.beginPath();
    this.ctx.moveTo(targetScreen.x - markerRadius / 2, targetScreen.y);
    this.ctx.lineTo(targetScreen.x + markerRadius / 2, targetScreen.y);
    this.ctx.moveTo(targetScreen.x, targetScreen.y - markerRadius / 2);
    this.ctx.lineTo(targetScreen.x, targetScreen.y + markerRadius / 2);
    this.ctx.stroke();
  }

  /**
   * Draw city boundaries for all city directors.
   * Shows a golden dashed border around each city's territory.
   */
  private drawCityBoundaries(world: World): void {
    if (!this.showCityBounds) return;

    // Find all city director entities
    const cityDirectors = world.query().with('city_director').executeEntities();

    for (const entity of cityDirectors) {
      const director = entity.getComponent('city_director') as CityDirectorComponent | undefined;
      if (!director) continue;

      const bounds = director.bounds;

      // Convert tile coordinates to world coordinates
      const minWorldX = bounds.minX * this.tileSize;
      const minWorldY = bounds.minY * this.tileSize;
      const maxWorldX = (bounds.maxX + 1) * this.tileSize;
      const maxWorldY = (bounds.maxY + 1) * this.tileSize;

      // Convert to screen coordinates
      const minScreen = this.camera.worldToScreen(minWorldX, minWorldY);
      const maxScreen = this.camera.worldToScreen(maxWorldX, maxWorldY);

      const width = maxScreen.x - minScreen.x;
      const height = maxScreen.y - minScreen.y;

      // Draw dashed border
      this.ctx.strokeStyle = '#FFD700'; // Gold
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 5]);
      this.ctx.globalAlpha = 0.8;
      this.ctx.strokeRect(minScreen.x, minScreen.y, width, height);
      this.ctx.setLineDash([]);
      this.ctx.globalAlpha = 1.0;

      // Draw city name label at top
      const centerX = minScreen.x + width / 2;
      const labelY = minScreen.y - 8;

      const fontSize = Math.max(12, 14 * this.camera.zoom);
      this.ctx.font = `bold ${fontSize}px monospace`;
      this.ctx.textAlign = 'center';

      // Background for label
      const metrics = this.ctx.measureText(director.cityName);
      const padding = 4;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(
        centerX - metrics.width / 2 - padding,
        labelY - fontSize,
        metrics.width + padding * 2,
        fontSize + padding
      );

      // Label text
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillText(director.cityName, centerX, labelY);
      this.ctx.textAlign = 'left';
    }
  }

  private drawDebugInfo(world: World): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';

    // Get time component to display day/night cycle
    const timeEntities = world.query().with('time').executeEntities();
    let timeOfDayStr = 'N/A';
    let phaseStr = 'N/A';
    let lightLevelStr = 'N/A';

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      if (!timeEntity) {
        throw new Error('Time entity is undefined');
      }
      // TimeComponent interface (inline since it's not exported from core)
      const timeComp = timeEntity.components.get('time') as
        | { timeOfDay: number; phase: string; lightLevel: number }
        | undefined;
      if (timeComp) {
        const hours = Math.floor(timeComp.timeOfDay);
        const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
        timeOfDayStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        phaseStr = timeComp.phase;
        lightLevelStr = (timeComp.lightLevel * 100).toFixed(0) + '%';
      }
    }

    // Build lines array, including view mode info
    const viewModeStr = this.camera.isSideView() ? 'Side-View' : 'Top-Down';
    const depthStr = this.camera.isSideView() ? ` Z: ${this.camera.z.toFixed(1)}` : '';

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${timeOfDayStr} (${phaseStr}) Light: ${lightLevelStr}`,
      `Camera: (${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}) zoom: ${this.camera.zoom.toFixed(2)}`,
      `View: ${viewModeStr}${depthStr} [V to toggle]`,
      `Chunks: ${this.chunkManager.getChunkCount()}`,
      `Entities: ${world.entities.size}`,
      `Seed: ${this.terrainGenerator.getSeed()}`,
    ];

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10, 20 + i * 15);
    });
  }
}
