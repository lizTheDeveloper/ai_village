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
import { buildingBlueprintRegistry } from '@ai-village/core';
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
import { DimensionalControls } from './DimensionalControls.js';

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
  // Lazy-initialized renderers (created on first use)
  private floatingTextRenderer: FloatingTextRenderer | null = null;
  private speechBubbleRenderer: SpeechBubbleRenderer | null = null;
  private particleRenderer: ParticleRenderer | null = null;
  private bedOwnershipRenderer: BedOwnershipRenderer | null = null;
  private animalRenderer: AnimalRenderer | null = null;

  // Core renderers (always needed)
  private terrainRenderer!: TerrainRenderer;
  private sideViewTerrainRenderer!: SideViewTerrainRenderer;
  private agentRenderer!: AgentRenderer;
  private buildingRenderer!: BuildingRenderer;
  private debugOverlay!: DebugOverlay;
  private interactionOverlay!: InteractionOverlay;
  private entityPicker!: EntityPicker;
  private pixelLabEntityRenderer!: PixelLabEntityRenderer;
  private dimensionalControls!: DimensionalControls;

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

  // Reusable arrays to avoid per-frame allocations (massive GC savings)
  private _visibleEntities: Entity[] = [];
  private _agentPositions: Array<{ x: number; y: number }> = [];
  private _sortedEntities: Entity[] = [];

  // Bound handlers for cleanup
  private boundResizeHandler: (() => void) | null = null;

  // 3D renderer for side-view mode
  private renderer3D: Renderer3D | null = null;
  private was3DActive = false; // Track previous state for mode transitions
  private current3DWorld: World | null = null; // Track if world has been set
  private renderer3DMounted = false; // Track if 3D renderer is mounted
  private onEntitySelectedCallback: ((entityId: string | null) => void) | null = null;

  // Track currently selected dimensional building for UI controls
  private selectedDimensionalBuildingId: string | null = null;

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

    // Initialize core renderers (always needed)
    this.terrainRenderer = new TerrainRenderer(this.ctx, this.tileSize);
    this.sideViewTerrainRenderer = new SideViewTerrainRenderer(this.ctx, this.tileSize, this.chunkManager, this.camera);
    this.agentRenderer = new AgentRenderer(this.ctx, this.tileSize, this.camera);
    this.buildingRenderer = new BuildingRenderer(this.ctx);
    this.debugOverlay = new DebugOverlay(this.ctx, this.chunkManager, this.terrainGenerator);
    this.interactionOverlay = new InteractionOverlay(this.ctx);
    this.entityPicker = new EntityPicker(this.tileSize);
    this.pixelLabEntityRenderer = new PixelLabEntityRenderer(this.ctx, '/assets/sprites/pixellab');
    this.dimensionalControls = new DimensionalControls();

    // Lazy renderers: floatingTextRenderer, speechBubbleRenderer, particleRenderer,
    // bedOwnershipRenderer, animalRenderer initialized on first use via getters

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

    // Clean up dimensional controls
    this.dimensionalControls.destroy();
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
   * Get the floating text renderer for adding feedback messages (lazy-initialized).
   */
  getFloatingTextRenderer(): FloatingTextRenderer {
    if (!this.floatingTextRenderer) {
      this.floatingTextRenderer = new FloatingTextRenderer();
    }
    return this.floatingTextRenderer;
  }

  /**
   * Get the speech bubble renderer for agent dialogue (lazy-initialized).
   */
  getSpeechBubbleRenderer(): SpeechBubbleRenderer {
    if (!this.speechBubbleRenderer) {
      this.speechBubbleRenderer = new SpeechBubbleRenderer();
    }
    return this.speechBubbleRenderer;
  }

  /**
   * Get the particle renderer for visual effects (lazy-initialized).
   */
  getParticleRenderer(): ParticleRenderer {
    if (!this.particleRenderer) {
      this.particleRenderer = new ParticleRenderer();
    }
    return this.particleRenderer;
  }

  /**
   * Get the bed ownership renderer (lazy-initialized).
   */
  private getBedOwnershipRenderer(): BedOwnershipRenderer {
    if (!this.bedOwnershipRenderer) {
      this.bedOwnershipRenderer = new BedOwnershipRenderer();
    }
    return this.bedOwnershipRenderer;
  }

  /**
   * Get the animal renderer (lazy-initialized).
   */
  private getAnimalRenderer(): AnimalRenderer {
    if (!this.animalRenderer) {
      this.animalRenderer = new AnimalRenderer(this.ctx);
    }
    return this.animalRenderer;
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

        // Emergency fallback: If chunk is visible but not generated, generate it immediately
        // This only happens if user scrolls faster than background generation
        // Prevents missing terrain at the cost of a minor lag spike
        if (!chunk.generated) {
          console.warn(
            `[Renderer] Emergency chunk generation for visible chunk (${chunkX}, ${chunkY}). ` +
            `This indicates camera scrolled faster than background generation. ` +
            `Consider increasing BackgroundChunkGenerator throttle or adding more predictive loading.`
          );
          this.terrainGenerator.generateChunk(chunk, world);
        }

        this.terrainRenderer.renderChunk(chunk, this.camera);
      }
    }

    // Draw entities (if any have position component)
    const allEntities = world.query().with('position', 'renderable').executeEntities();

    // Get agent positions for proximity culling - reuse array
    this._agentPositions.length = 0;
    const agentEntities = world.query().with('agent', 'position').executeEntities();
    for (const agentEntity of agentEntities) {
      const pos = agentEntity.components.get('position') as PositionComponent | undefined;
      if (pos) {
        this._agentPositions.push({ x: pos.x, y: pos.y });
      }
    }

    // Vision range for culling (from GameBalance.VISION_RANGE_TILES)
    const VISION_RANGE_SQUARED = 15 * 15; // Use squared distance to avoid Math.sqrt
    const VIEWPORT_MARGIN = 2; // tiles - small margin for smooth scrolling

    // Pre-calculate viewport bounds in tile coordinates
    const viewMinX = bounds.left / this.tileSize - VIEWPORT_MARGIN;
    const viewMaxX = bounds.right / this.tileSize + VIEWPORT_MARGIN;
    const viewMinY = bounds.top / this.tileSize - VIEWPORT_MARGIN;
    const viewMaxY = bounds.bottom / this.tileSize + VIEWPORT_MARGIN;

    // Filter entities into reusable array (no allocation)
    // Keep if: building, planted crop, near any agent, or in viewport
    this._visibleEntities.length = 0;
    for (const entity of allEntities) {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      if (!pos) continue;

      // Always keep buildings (agent-created)
      if (entity.components.has('building')) {
        this._visibleEntities.push(entity);
        continue;
      }

      // Always keep planted crops (agent-created)
      const plant = entity.components.get('plant') as PlantComponent | undefined;
      if (plant?.planted) {
        this._visibleEntities.push(entity);
        continue;
      }

      // Keep if within viewport bounds (for player visibility) - check first as it's fastest
      if (pos.x >= viewMinX && pos.x <= viewMaxX && pos.y >= viewMinY && pos.y <= viewMaxY) {
        this._visibleEntities.push(entity);
        continue;
      }

      // Keep if within vision range of any agent (squared distance - no sqrt!)
      let nearAgent = false;
      for (const agentPos of this._agentPositions) {
        const dx = pos.x - agentPos.x;
        const dy = pos.y - agentPos.y;
        const distSquared = dx * dx + dy * dy;
        if (distSquared <= VISION_RANGE_SQUARED) {
          nearAgent = true;
          break;
        }
      }
      if (nearAgent) {
        this._visibleEntities.push(entity);
      }
      // Otherwise cull
    }

    // Use filtered entities for the rest of rendering
    let entities: Entity[] = this._visibleEntities;

    // In side-view mode, filter to only show entities "in front" of the camera
    // based on facing direction, within a few depth layers
    if (this.camera.isSideView()) {
      const depthAxis = this.camera.getDepthAxis(); // 'x' or 'y'
      const depthDirection = this.camera.getDepthDirection(); // +1 or -1
      const maxDepthLayers = 5; // Show entities up to 5 tiles in front

      // Camera position in world tiles
      const cameraWorldX = this.camera.x / this.tileSize;
      const cameraWorldY = this.camera.y / this.tileSize;
      const cameraDepth = depthAxis === 'x' ? cameraWorldX : cameraWorldY;

      // Filter in-place into _sortedEntities to avoid allocation
      this._sortedEntities.length = 0;
      for (const entity of entities) {
        const pos = entity.components.get('position') as PositionComponent | undefined;
        if (!pos) continue;

        // Get entity position on depth axis
        const entityDepth = depthAxis === 'x' ? pos.x : pos.y;

        // Calculate signed distance in front of camera
        const signedDistance = (entityDepth - cameraDepth) * depthDirection;

        // Only show entities that are in front (signedDistance >= 0) and within max depth
        // Also allow entities slightly behind (within 1 tile) for the current row
        if (signedDistance >= -1 && signedDistance <= maxDepthLayers) {
          this._sortedEntities.push(entity);
        }
      }
      entities = this._sortedEntities;

      // Sort in-place by depth (furthest first) then by Z (height)
      entities.sort((a, b) => {
        const posA = a.components.get('position') as PositionComponent | undefined;
        const posB = b.components.get('position') as PositionComponent | undefined;
        if (!posA || !posB) return 0;

        // Sort by depth - furthest entities render first (back to front)
        const depthA = depthAxis === 'x' ? posA.x : posA.y;
        const depthB = depthAxis === 'x' ? posB.x : posB.y;
        const depthDiff = (depthB - depthA) * depthDirection;
        if (Math.abs(depthDiff) > 0.5) return depthDiff;

        // Then by Z (height) - lower entities render first
        return posA.z - posB.z;
      });
    } else {
      // Top-down mode: sort by Y (lower Y = further from camera = render first)
      // Then by Z (lower Z = underground = render first)
      // Copy to _sortedEntities for sorting (don't modify _visibleEntities)
      this._sortedEntities.length = 0;
      for (const entity of entities) {
        this._sortedEntities.push(entity);
      }
      entities = this._sortedEntities;

      // Sort in-place (no spread allocation!)
      entities.sort((a, b) => {
        const posA = a.components.get('position') as PositionComponent | undefined;
        const posB = b.components.get('position') as PositionComponent | undefined;
        if (!posA || !posB) return 0;

        // Primary sort by Y (lower Y renders first - back to front)
        if (posA.y !== posB.y) {
          return posA.y - posB.y;
        }

        // Secondary sort by Z
        return posA.z - posB.z;
      });
    }

    for (const entity of entities) {
      const pos = entity.components.get('position') as PositionComponent | undefined;
      const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      // Get entity z-coordinate
      const entityZ = pos.z;

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

      // Render building layout and dimensional indicators
      if (building) {
        const blueprint = buildingBlueprintRegistry.tryGet(building.buildingType);

        if (blueprint) {
          let layoutToRender: string[] | undefined;
          let isDimensional = false;

          // 4D W-axis buildings
          if (blueprint.dimensional?.w_axis) {
            const currentSlice = this.buildingRenderer.getDimensionalStateForRendering(entity.id)?.currentWSlice || 0;
            layoutToRender = blueprint.dimensional.w_axis.sliceLayouts?.[currentSlice];
            isDimensional = true;
          }
          // 5D V-axis buildings (phase-shifting)
          else if (blueprint.dimensional?.v_axis) {
            const currentPhase = this.buildingRenderer.getDimensionalStateForRendering(entity.id)?.currentVPhase || 0;
            layoutToRender = blueprint.dimensional.v_axis.phaseLayouts?.[currentPhase];
            isDimensional = true;
          }
          // 6D U-axis buildings (quantum superposition)
          else if (blueprint.dimensional?.u_axis) {
            const stateData = this.buildingRenderer.getDimensionalStateForRendering(entity.id);
            const selectedState = stateData?.collapsedUState;
            if (selectedState !== undefined && selectedState !== -1) {
              layoutToRender = blueprint.dimensional.u_axis.stateLayouts?.[selectedState];
            }
            isDimensional = true;
          }
          // 3D multi-floor or standard layout
          else if (blueprint.floors && blueprint.floors.length > 0) {
            // Use first floor for now (TODO: floor selection UI)
            layoutToRender = blueprint.floors[0].layout;
          }
          else if (blueprint.layout) {
            layoutToRender = blueprint.layout;
          }

          // Render the layout if we have one
          if (layoutToRender && layoutToRender.length > 0) {
            this.buildingRenderer.renderBuildingLayout(
              screen.x,
              screen.y,
              layoutToRender,
              this.tileSize,
              this.camera.zoom,
              isDimensional
            );
          }

          // Draw dimensional indicator badge
          if (blueprint.dimensional || blueprint.realmPocket) {
            this.buildingRenderer.drawDimensionalIndicator(
              screen.x,
              screen.y,
              entity.id,
              blueprint.dimensional,
              blueprint.realmPocket,
              this.tileSize,
              this.camera.zoom
            );
          }
        }
      }

      // Draw agent behavior label
      const agent = entity.components.get('agent') as AgentComponent | undefined;
      const circadian = entity.components.get('circadian') as CircadianComponent | undefined;
      if (agent && agent.behavior && this.showAgentTasks) {
        this.agentRenderer.drawAgentBehavior(screen.x, screen.y, agent.behavior, agent.behaviorState, circadian);
      }

      // Register agent speech for speech bubble rendering
      if (agent?.recentSpeech) {
        this.getSpeechBubbleRenderer().registerSpeech(entity.id, agent.recentSpeech);
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
        this.getAnimalRenderer().drawAnimalState(screen.x, screen.y, animal.state, animal.wild, this.tileSize, this.camera.zoom);
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

        // Update dimensional controls if this is a dimensional building
        const building = entity.components.get('building') as BuildingComponent | undefined;
        if (building && entity.id !== this.selectedDimensionalBuildingId) {
          this.handleDimensionalBuildingSelection(world, entity);
        }
      }
    }

    // Clear dimensional controls if no building selected
    if (!selectedEntity || !world.getEntityById(selectedEntity.id)?.components.get('building')) {
      if (this.selectedDimensionalBuildingId !== null) {
        this.handleDimensionalBuildingSelection(world, null);
      }
    }

    // Draw agent-building interaction indicators
    this.interactionOverlay.drawAgentBuildingInteractions(world, this.camera, this.tileSize, selectedEntity);

    // Draw navigation path for selected entity
    this.interactionOverlay.drawNavigationPath(world, this.camera, this.tileSize, selectedEntity);

    // Draw city boundaries
    this.debugOverlay.drawCityBoundaries(world, this.camera, this.tileSize);

    // Draw floating text (resource gathering feedback, etc.)
    this.getFloatingTextRenderer().render(this.ctx, this.camera, Date.now());

    // Draw particles (dust, sparks, etc.)
    this.getParticleRenderer().render(this.ctx, this.camera, Date.now());

    // Draw bed ownership markers
    this.getBedOwnershipRenderer().render(this.ctx, this.camera, world);

    // Update and render speech bubbles
    this.getSpeechBubbleRenderer().update();
    this.renderSpeechBubbles(world);

    // Render combat UI elements (after speech bubbles, before debug)
    if (this.healthBarRenderer) {
      this.healthBarRenderer.render(
        this.camera.x,
        this.camera.y,
        this.canvas.width,
        this.canvas.height,
        this.camera.zoom,
        entities // Already mutable from _sortedEntities - no spread needed
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

    this.getSpeechBubbleRenderer().render(this.ctx, agentData);
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
   * Handle building selection and update dimensional controls.
   * Call this when a building entity is selected.
   */
  handleDimensionalBuildingSelection(world: World, entity: Entity | null): void {
    if (!entity) {
      this.selectedDimensionalBuildingId = null;
      this.dimensionalControls.hideAll();
      return;
    }

    const building = entity.components.get('building') as BuildingComponent | undefined;
    if (!building) {
      this.selectedDimensionalBuildingId = null;
      this.dimensionalControls.hideAll();
      return;
    }

    const blueprint = buildingBlueprintRegistry.tryGet(building.buildingType);
    if (!blueprint) {
      this.selectedDimensionalBuildingId = null;
      this.dimensionalControls.hideAll();
      return;
    }

    // Only show controls for dimensional or realm pocket buildings
    if (!blueprint.dimensional && !blueprint.realmPocket) {
      this.selectedDimensionalBuildingId = null;
      this.dimensionalControls.hideAll();
      return;
    }

    this.selectedDimensionalBuildingId = entity.id;

    // 4D W-axis buildings - show slider
    if (blueprint.dimensional?.w_axis) {
      const layers = blueprint.dimensional.w_axis.layers;
      const currentSlice = this.buildingRenderer.getDimensionalStateForRendering(entity.id)?.currentWSlice || 0;

      this.dimensionalControls.showWSlider(currentSlice, layers, (newSlice) => {
        this.buildingRenderer.setWSlice(entity.id, newSlice);
        // Force re-render by triggering a minimal state update
        // The next frame will pick up the new slice
      });
    }
    // 5D V-axis buildings - show phase indicator (auto-updates in render loop)
    else if (blueprint.dimensional?.v_axis) {
      const phases = blueprint.dimensional.v_axis.phases;
      const currentPhase = this.buildingRenderer.getDimensionalStateForRendering(entity.id)?.currentVPhase || 0;
      this.dimensionalControls.showPhaseIndicator(currentPhase, phases);
    }
    // 6D U-axis buildings - show quantum collapse button
    else if (blueprint.dimensional?.u_axis) {
      const state = this.buildingRenderer.getDimensionalStateForRendering(entity.id);
      const isCollapsed = state?.collapsedUState !== undefined && state.collapsedUState !== -1;

      this.dimensionalControls.showQuantumControls(isCollapsed, () => {
        if (isCollapsed) {
          // Reset to superposition - clear the state
          const currentState = this.buildingRenderer.getDimensionalStateForRendering(entity.id);
          if (currentState) {
            currentState.collapsedUState = -1;
          }
        } else {
          // Collapse to random state
          this.buildingRenderer.collapseUState(entity.id, blueprint.dimensional);
        }
        // Re-call this method to update the UI
        this.handleDimensionalBuildingSelection(world, entity);
      });
    }
  }

  /**
   * Center camera on world position (works in both 2D and 3D modes).
   * @param worldX World X coordinate (in tile units)
   * @param worldY World Y coordinate (in tile units)
   * @param elevation Optional elevation/z-coordinate (defaults to 0)
   */
  centerCameraOnWorldPosition(worldX: number, worldY: number, elevation: number = 0): void {
    // Update 2D camera
    this.camera.setPosition(worldX * this.tileSize, worldY * this.tileSize);

    // Also update 3D camera if in 3D mode
    if (this.was3DActive && this.renderer3D) {
      this.renderer3D.setCameraFromWorld(worldX, worldY, elevation);
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
      this.renderer3D = new Renderer3D({}, this.chunkManager, this.terrainGenerator, this.pixelLabEntityRenderer);
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
