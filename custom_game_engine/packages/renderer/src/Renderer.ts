import type {
  World,
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
  EventBus,
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
import { HealthBarRenderer } from './HealthBarRenderer.js';
import { ThreatIndicatorRenderer } from './ThreatIndicatorRenderer.js';
import type { ContextMenuManager } from './ContextMenuManager.js';
import { Renderer3D } from './Renderer3D.js';
import { TerrainRenderer } from './terrain/index.js';
import { SideViewTerrainRenderer } from './terrain/index.js';
import { AgentRenderer, AnimalRenderer, BuildingRenderer } from './entities/index.js';
import { DebugOverlay, InteractionOverlay } from './overlays/index.js';
import { EntityPicker } from './EntityPicker.js';
import { PixelLabEntityRenderer } from './sprites/PixelLabEntityRenderer.js';

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
  private terrainRenderer!: TerrainRenderer;
  private sideViewTerrainRenderer!: SideViewTerrainRenderer;
  private agentRenderer!: AgentRenderer;
  private animalRenderer!: AnimalRenderer;
  private buildingRenderer!: BuildingRenderer;
  private debugOverlay!: DebugOverlay;
  private interactionOverlay!: InteractionOverlay;
  private entityPicker!: EntityPicker;
  private pixelLabEntityRenderer!: PixelLabEntityRenderer;

  // Combat UI renderers (initialized via initCombatUI)
  private healthBarRenderer: HealthBarRenderer | null = null;
  private threatIndicatorRenderer: ThreatIndicatorRenderer | null = null;

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
  private renderer3DMounted = false; // Track if 3D renderer is mounted
  private onEntitySelectedCallback: ((entityId: string | null) => void) | null = null;

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
    this.terrainRenderer = new TerrainRenderer(this.ctx, this.tileSize);
    this.sideViewTerrainRenderer = new SideViewTerrainRenderer(this.ctx, this.tileSize, this.chunkManager, this.camera);
    this.agentRenderer = new AgentRenderer(this.ctx, this.tileSize, this.camera);
    this.animalRenderer = new AnimalRenderer(this.ctx);
    this.buildingRenderer = new BuildingRenderer(this.ctx);
    this.debugOverlay = new DebugOverlay(this.ctx, this.chunkManager, this.terrainGenerator);
    this.interactionOverlay = new InteractionOverlay(this.ctx);
    this.entityPicker = new EntityPicker(this.tileSize);
    this.pixelLabEntityRenderer = new PixelLabEntityRenderer(this.ctx, '/assets/sprites/pixellab');

    // Handle resize - store bound handler for cleanup
    this.resize();
    this.boundResizeHandler = () => this.resize();
    window.addEventListener('resize', this.boundResizeHandler);
  }

  /**
   * Get the PixelLab sprite loader for external use (e.g., UI panels).
   */
  get pixelLabLoader() {
    return this.pixelLabEntityRenderer.getSpriteLoader();
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
      this.renderer3D.deactivate();
      this.renderer3D.dispose();
      this.renderer3D = null;
      this.was3DActive = false;
      this.current3DWorld = null;
      this.renderer3DMounted = false;
    }

    // Clean up combat UI renderers
    if (this.threatIndicatorRenderer) {
      this.threatIndicatorRenderer.cleanup();
      this.threatIndicatorRenderer = null;
    }
    this.healthBarRenderer = null;
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
    this.terrainRenderer.setShowTemperatureOverlay(this.showTemperatureOverlay);
  }

  /**
   * Get current temperature overlay state.
   */
  isTemperatureOverlayEnabled(): boolean {
    return this.showTemperatureOverlay;
  }

  /**
   * Initialize combat UI renderers.
   * Call this after the renderer is created to enable combat visualization.
   *
   * @param world - The game world
   * @param eventBus - EventBus for combat events
   */
  initCombatUI(world: World, eventBus: EventBus): void {
    this.healthBarRenderer = new HealthBarRenderer(world, this.canvas);
    this.threatIndicatorRenderer = new ThreatIndicatorRenderer(world, eventBus, this.canvas);
  }

  /**
   * Find entity at screen coordinates.
   * Returns the entity if found, or null.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param world World instance
   */
  findEntityAtScreenPosition(screenX: number, screenY: number, world: World): Entity | null {
    return this.entityPicker.findEntityAtScreenPosition(screenX, screenY, world, this.camera, this.chunkManager);
  }

  /**
   * Render the world.
   * @param world World instance
   * @param selectedEntity Optional selected entity to highlight (can be full Entity or just { id: string })
   */
  render(world: World, selectedEntity?: Entity | { id: string }): void {
    // Handle 3D/2D mode switching first
    if (this.camera.isSideView()) {
      // Activate 3D renderer
      this.activate3DRenderer(world);
      // Clear 2D canvas to transparent so UI windows can overlay on 3D
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Skip 2D game rendering - UI windows will be drawn by main.ts after this
      return;
    } else {
      // Deactivate 3D renderer if switching back to 2D mode
      this.deactivate3DRenderer();
    }

    // Clear with solid background for 2D mode
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update all sprite animations
    this.pixelLabEntityRenderer.updateAnimations(performance.now());

    // Sync view toggle properties with sub-renderers
    this.buildingRenderer.showBuildingLabels = this.showBuildingLabels;
    this.buildingRenderer.showResourceAmounts = this.showResourceAmounts;
    this.debugOverlay.showCityBounds = this.showCityBounds;

    // Update camera
    this.camera.update();

    // Get visible bounds in world coordinates
    const bounds = this.camera.getVisibleBounds();

    // Calculate chunk bounds (convert world pixels to tiles, then to chunks)
    const startChunkX = Math.floor(bounds.left / this.tileSize / CHUNK_SIZE);
    const endChunkX = Math.floor(bounds.right / this.tileSize / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / this.tileSize / CHUNK_SIZE);
    const endChunkY = Math.floor(bounds.bottom / this.tileSize / CHUNK_SIZE);

    // Render terrain tiles
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
        if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
        const chunk = this.chunkManager.getChunk(chunkX, chunkY);
        this.terrainRenderer.renderChunk(chunk, this.camera);
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

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;

      // Convert world coordinates to screen coordinates
      const screen = this.camera.worldToScreen(worldX, worldY, entityZ);

      // Check if this is a building under construction
      const building = entity.components.get('building') as BuildingComponent | undefined;

      const isUnderConstruction = building && !building.isComplete && building.progress < 100;

      // Calculate effective opacity (construction)
      let effectiveOpacity = 1.0;
      if (isUnderConstruction) {
        effectiveOpacity *= 0.5;
      }

      // Apply visual metadata from renderable component
      const sizeMultiplier = renderable.sizeMultiplier ?? 1.0;
      const alpha = renderable.alpha ?? 1.0;
      this.ctx.globalAlpha = effectiveOpacity * alpha;

      // Calculate size with size multiplier
      const baseSize = this.tileSize * this.camera.zoom;
      const scaledSize = baseSize * sizeMultiplier;

      // Center the scaled sprite
      const offsetX = (scaledSize - baseSize) / 2;
      const offsetY = (scaledSize - baseSize) / 2;

      // Render entity sprite (try PixelLab sprites first for agents/animals)
      if (!this.pixelLabEntityRenderer.renderPixelLabEntity(entity, screen.x - offsetX, screen.y - offsetY, scaledSize)) {
        renderSprite(
          this.ctx,
          renderable.spriteId,
          screen.x - offsetX,
          screen.y - offsetY,
          scaledSize
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
        this.buildingRenderer.drawBuildingLabel(screen.x, screen.y, building.buildingType, !!isUnderConstruction, this.tileSize, this.camera.zoom);
      }

      // Draw construction progress bar if under construction
      if (isUnderConstruction && building) {
        this.buildingRenderer.drawConstructionProgress(screen.x, screen.y, building.progress, this.tileSize, this.camera.zoom);
      }

      // Draw resource amount bar for harvestable resources (trees, rocks)
      const resource = entity.components.get('resource') as ResourceComponent | undefined;
      if (resource && resource.harvestable && resource.maxAmount > 0 && this.showResourceAmounts) {
        this.buildingRenderer.drawResourceAmount(screen.x, screen.y, resource.amount, resource.maxAmount, resource.resourceType, this.tileSize, this.camera.zoom);
      }

      // Draw agent behavior label
      const agent = entity.components.get('agent') as AgentComponent | undefined;
      const circadian = entity.components.get('circadian') as CircadianComponent | undefined;
      if (agent && agent.behavior && this.showAgentTasks) {
        this.agentRenderer.drawAgentBehavior(screen.x, screen.y, agent.behavior, agent.behaviorState, circadian);
      }

      // Register agent speech for speech bubble rendering
      if (agent?.recentSpeech) {
        this.speechBubbleRenderer.registerSpeech(entity.id, agent.recentSpeech);
      }

      // Draw Z's above sleeping agents
      if (circadian?.isSleeping) {
        this.agentRenderer.drawSleepingIndicator(screen.x, screen.y);
      }

      // Draw reflection indicator for agents currently reflecting
      const reflection = entity.components.get('reflection') as ReflectionComponent | undefined;
      if (reflection?.isReflecting) {
        this.agentRenderer.drawReflectionIndicator(screen.x, screen.y, reflection.reflectionType);
      }

      // Draw animal state label
      const animal = entity.components.get('animal') as AnimalComponent | undefined;
      if (animal) {
        this.animalRenderer.drawAnimalState(screen.x, screen.y, animal.state, animal.wild, this.tileSize, this.camera.zoom);
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
    this.interactionOverlay.drawAgentBuildingInteractions(world, this.camera, this.tileSize, selectedEntity);

    // Draw navigation path for selected entity
    this.interactionOverlay.drawNavigationPath(world, this.camera, this.tileSize, selectedEntity);

    // Draw city boundaries
    this.debugOverlay.drawCityBoundaries(world, this.camera, this.tileSize);

    // Draw floating text (resource gathering feedback, etc.)
    this.floatingTextRenderer.render(this.ctx, this.camera, Date.now());

    // Draw particles (dust, sparks, etc.)
    this.particleRenderer.render(this.ctx, this.camera, Date.now());

    // Draw bed ownership markers
    this.bedOwnershipRenderer.render(this.ctx, this.camera, world);

    // Update and render speech bubbles
    this.speechBubbleRenderer.update();
    this.renderSpeechBubbles(world);

    // Render combat UI elements (after speech bubbles, before debug)
    if (this.healthBarRenderer) {
      this.healthBarRenderer.render(
        this.camera.x,
        this.camera.y,
        this.canvas.width,
        this.canvas.height,
        this.camera.zoom,
        [...entities] // Pass pre-filtered entities for performance (convert readonly to mutable)
      );
    }

    if (this.threatIndicatorRenderer) {
      this.threatIndicatorRenderer.render(
        this.camera.x,
        this.camera.y,
        this.canvas.width,
        this.canvas.height,
        this.camera.zoom
      );
    }

    // NOTE: Context menu is rendered separately in main.ts render loop
    // after all other UI panels, to ensure it appears on top.
    // Do NOT render it here or it will be covered by UI panels.

    // Draw debug info
    this.debugOverlay.drawDebugInfo(world, this.camera);
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
   * Set callback for when an entity is selected (in either 2D or 3D mode).
   * This is used by the game to update the selected entity state.
   */
  setOnEntitySelected(callback: (entityId: string | null) => void): void {
    this.onEntitySelectedCallback = callback;
    // Also set on 3D renderer if it exists
    if (this.renderer3D) {
      this.renderer3D.setOnEntitySelected(callback);
    }
  }

  /**
   * Sync selected entity to 3D renderer (call when switching to 3D mode).
   */
  syncSelectedEntityTo3D(entityId: string | null): void {
    if (this.renderer3D) {
      this.renderer3D.setSelectedEntity(entityId);
    }
  }

  /**
   * Forward a click to the 3D renderer for entity selection.
   * Call this from main.ts when a click in 3D mode doesn't hit a window.
   * @param screenX Screen X coordinate (relative to canvas)
   * @param screenY Screen Y coordinate (relative to canvas)
   */
  forward3DClick(screenX: number, screenY: number): void {
    if (this.renderer3D && this.was3DActive) {
      const rect = this.canvas.getBoundingClientRect();
      // Convert screen coordinates to client coordinates
      const clientX = rect.left + screenX;
      const clientY = rect.top + screenY;
      this.renderer3D.handleExternalClick(clientX, clientY, rect);
    }
  }

  /**
   * Get or create the 3D renderer (lazy initialization).
   */
  private getOrCreate3DRenderer(): Renderer3D {
    if (!this.renderer3D) {
      this.renderer3D = new Renderer3D({}, this.chunkManager, this.terrainGenerator);
      // Set up selection callback if one exists
      if (this.onEntitySelectedCallback) {
        this.renderer3D.setOnEntitySelected(this.onEntitySelectedCallback);
      }
    }
    if (!this.renderer3DMounted && this.canvas.parentElement) {
      this.renderer3D.mount(this.canvas.parentElement);
      this.renderer3DMounted = true;
    }
    return this.renderer3D;
  }

  /**
   * Check if currently in 3D mode.
   */
  is3DActive(): boolean {
    return this.was3DActive;
  }

  /**
   * Activate 3D renderer for side-view mode.
   * Returns true if 3D is active and 2D rendering should be skipped.
   */
  private activate3DRenderer(world: World): boolean {
    const renderer3D = this.getOrCreate3DRenderer();

    // Set world if not already set
    if (this.current3DWorld !== world) {
      renderer3D.setWorld(world);
      this.current3DWorld = world;
    }

    // Only sync camera position when first switching to 3D (not every frame)
    if (!this.was3DActive) {
      const worldX = this.camera.x / this.tileSize;
      const worldY = this.camera.y / this.tileSize;
      renderer3D.setCameraFromWorld(worldX, worldY, 0);

      // Position 3D canvas behind 2D canvas for UI overlay
      // The 2D canvas stays visible but transparent for UI windows
      this.canvas.style.position = 'absolute';
      this.canvas.style.zIndex = '10';
      // Keep pointer events so windows are clickable
      // 3D interaction works via right-click (pointer lock) and selection when locked
    }

    // Activate 3D renderer
    renderer3D.activate();
    this.was3DActive = true;

    return true;
  }

  /**
   * Deactivate 3D renderer when switching back to 2D mode.
   * Called when view mode changes away from side-view.
   */
  private deactivate3DRenderer(): void {
    if (this.renderer3D && this.was3DActive) {
      this.renderer3D.deactivate();
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
}
