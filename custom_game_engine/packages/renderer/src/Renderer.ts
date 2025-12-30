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

  private tileSize = 16; // Pixels per tile at zoom=1
  private hasLoggedTilledTile = false; // Debug flag to log first tilled tile rendering
  private showTemperatureOverlay = false; // Debug flag to show temperature on tiles

  // View toggles for labels and overlays
  public showResourceAmounts = true;
  public showBuildingLabels = true;
  public showAgentNames = true;
  public showAgentTasks = true;

  // Bound handlers for cleanup
  private boundResizeHandler: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, seed: string = 'default') {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);
    this.chunkManager = new ChunkManager(3); // Load 3 chunks in each direction
    this.terrainGenerator = new TerrainGenerator(seed);
    this.floatingTextRenderer = new FloatingTextRenderer();
    this.speechBubbleRenderer = new SpeechBubbleRenderer();
    this.particleRenderer = new ParticleRenderer();

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
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
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
   * @param selectedEntity Optional selected entity to highlight
   */
  render(world: World, selectedEntity?: Entity): void {
    // Clear
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
      this.renderSideViewBackground();
      // Render terrain as ground cross-section in side-view
      this.renderSideViewTerrain(startChunkX, endChunkX, startChunkY, endChunkY);
    } else {
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
      this.ctx.globalAlpha = effectiveOpacity;

      // Get plant component for stage-based rendering
      const plant = entity.components.get('plant') as PlantComponent | undefined;
      const metadata = plant ? { stage: plant.stage } : undefined;

      // Calculate size with parallax scaling
      const baseSize = this.tileSize * this.camera.zoom;
      const scaledSize = baseSize * parallaxScale;

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

          // Draw sprite at top
          renderSprite(this.ctx, renderable.spriteId, screen.x - offsetX, screen.y - offsetY, scaledSize, metadata);
        } else {
          // Ground-level entity in side-view: render at terrain surface
          renderSprite(
            this.ctx,
            renderable.spriteId,
            screen.x - offsetX,
            screen.y - offsetY,
            scaledSize,
            metadata
          );
        }
      } else {
        // Normal rendering (top-down or ground-level entities)
        renderSprite(
          this.ctx,
          renderable.spriteId,
          screen.x - offsetX,
          screen.y - offsetY,
          scaledSize,
          metadata
        );
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

    // Draw floating text (resource gathering feedback, etc.)
    this.floatingTextRenderer.render(this.ctx, this.camera, Date.now());

    // Draw particles (dust, sparks, etc.)
    this.particleRenderer.render(this.ctx, this.camera, Date.now());

    // Update and render speech bubbles
    this.speechBubbleRenderer.update();
    this.renderSpeechBubbles(world);

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
   * Render background for side-view mode.
   * Shows a sky gradient above the ground line.
   */
  private renderSideViewBackground(): void {
    const width = this.camera.viewportWidth;
    const height = this.camera.viewportHeight;
    const groundY = height * 0.70; // Ground line at 70% down

    // Create sky gradient (only above ground line)
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, groundY);

    // Sky colors - darker at top, lighter near horizon
    skyGradient.addColorStop(0, '#0a0a1a');    // Dark sky at top
    skyGradient.addColorStop(0.3, '#1a1a3e');  // Deep blue
    skyGradient.addColorStop(0.6, '#2a4a6e');  // Mid blue
    skyGradient.addColorStop(0.85, '#5588bb'); // Light blue
    skyGradient.addColorStop(1, '#88bbdd');    // Horizon

    // Fill sky area
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, groundY);

    // Draw horizon glow
    const horizonGlow = this.ctx.createLinearGradient(0, groundY - 20, 0, groundY);
    horizonGlow.addColorStop(0, 'rgba(255, 200, 150, 0)');
    horizonGlow.addColorStop(1, 'rgba(255, 200, 150, 0.3)');
    this.ctx.fillStyle = horizonGlow;
    this.ctx.fillRect(0, groundY - 20, width, 20);

    // Draw focus depth indicator
    this.drawDepthIndicator();
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
    const maxDepthLayers = 5; // Show this many terrain rows in front

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
  private drawAgentBuildingInteractions(world: World, selectedEntity?: Entity): void {
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

          // Check for shelter interaction (lean-to, tent)
          if ((buildingComp.buildingType === 'lean-to' || buildingComp.buildingType === 'tent') && buildingComp.isComplete) {
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
