import type { World } from '@ai-village/core';
import {
  ChunkManager,
  TerrainGenerator,
  CHUNK_SIZE,
  TERRAIN_COLORS,
  type Chunk,
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

    // Handle resize
    this.resize();
    window.addEventListener('resize', () => this.resize());
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
   * Find entity at screen coordinates.
   * Returns the entity if found, or null.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param world World instance
   */
  findEntityAtScreenPosition(screenX: number, screenY: number, world: World): any | null {
    const entities = world.query().with('position', 'renderable').executeEntities();

    console.log(`[Renderer] findEntityAtScreenPosition: screenX=${screenX}, screenY=${screenY}`);
    console.log(`[Renderer] Camera: x=${this.camera.x}, y=${this.camera.y}, zoom=${this.camera.zoom}`);
    console.log(`[Renderer] Viewport: width=${this.camera.viewportWidth}, height=${this.camera.viewportHeight}`);
    console.log(`[Renderer] TileSize: ${this.tileSize}`);
    console.log(`[Renderer] Found ${entities.length} entities with position+renderable`);

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

    let closestEntity: any | null = null;
    let closestDistance = Infinity;
    let closestAgent: any | null = null;
    let closestAgentDistance = Infinity;

    // Check all entities and find the closest one to the click point
    // Prioritize agents over other entities for better UX
    let agentCount = 0;
    for (const entity of entities) {
      if (!entity || !entity.components) {
        console.warn('[Renderer] Entity or entity.components is null/undefined');
        continue;
      }
      const pos = entity.components.get('position') as { x: number; y: number } | undefined;
      const renderable = entity.components.get('renderable') as { visible: boolean } | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const hasAgent = entity.components.has('agent');
      const hasPlant = entity.components.has('plant');
      const hasAnimal = entity.components.has('animal');

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
      // Plants need a moderate radius to be clickable (3 tiles)
      // Other entities use default (0.5 tiles)
      let clickRadius = tilePixelSize / 2;
      if (hasAgent) {
        clickRadius = tilePixelSize * 16; // Increased from 8 to 16 for more forgiving clicks
      } else if (hasAnimal) {
        clickRadius = tilePixelSize * 8; // Same as original agent radius
      } else if (hasPlant) {
        clickRadius = tilePixelSize * 3;
      }

      if (hasAgent) {
        agentCount++;
        console.log(`[Renderer]   Agent ${agentCount}: worldPixels=(${worldX.toFixed(1)}, ${worldY.toFixed(1)}), worldPos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}), screen=(${screen.x.toFixed(1)}, ${screen.y.toFixed(1)}), center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}), distance=${distance.toFixed(1)}, clickRadius=${clickRadius.toFixed(1)}, tilePixelSize=${tilePixelSize.toFixed(1)}, passes=${distance <= clickRadius}`);
      }

      // Check if click is within radius
      const passesDistanceCheck = distance <= clickRadius;
      const passesClosestCheck = distance < closestDistance;
      if (hasAgent) {
        console.log(`[Renderer]   Agent distance check: passesDistanceCheck=${passesDistanceCheck}, passesClosestCheck=${passesClosestCheck}, closestDistance=${closestDistance}`);
      }

      // Track closest agent separately (for prioritization)
      if (hasAgent && passesDistanceCheck && distance < closestAgentDistance) {
        closestAgent = entity;
        closestAgentDistance = distance;
        console.log(`[Renderer]   ✓ Setting this agent as closest agent (distance=${distance.toFixed(1)})`);
      }

      // Track closest entity overall
      if (passesDistanceCheck && passesClosestCheck) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    console.log(`[Renderer] Checked ${agentCount} agents, closestEntity: ${closestEntity ? closestEntity.id : 'null'}, closestDistance: ${closestDistance === Infinity ? 'Infinity' : closestDistance.toFixed(1)}, closestAgent: ${closestAgent ? closestAgent.id : 'null'}, closestAgentDistance: ${closestAgentDistance === Infinity ? 'Infinity' : closestAgentDistance.toFixed(1)}`);

    // Return the closest entity overall (could be agent, plant, or building)
    // If both agent and non-agent are within range, return whichever is closer
    if (closestEntity) {
      // Check if the closest entity is an agent
      const isAgent = closestEntity.components.has('agent');
      console.log(`[Renderer] Returning closest entity (${isAgent ? 'agent' : 'non-agent'}) at distance ${closestDistance.toFixed(1)}`);
      return closestEntity;
    }

    // If we found an agent but no other entities, return the agent
    if (closestAgent) {
      console.log(`[Renderer] Returning closest agent (no other entities in range)`);
      return closestAgent;
    }

    // If no entity found within radius, select the closest agent if it's reasonably close (within full viewport)
    // FIXED: Increased max search distance to full viewport since clicks can be anywhere on screen
    if (agentCount > 0) {
      console.log('[Renderer] No entity within click radius, searching for nearest agent...');
      let nearestAgent: any | null = null;
      let nearestDistance = Infinity;
      // Use full viewport diagonal distance as maximum
      const maxSearchDistance = Math.sqrt(this.camera.viewportWidth ** 2 + this.camera.viewportHeight ** 2);

      for (const entity of entities) {
        if (!entity || !entity.components) continue;
        if (!entity.components.has('agent')) continue;

        const pos = entity.components.get('position') as { x: number; y: number } | undefined;
        const renderable = entity.components.get('renderable') as { visible: boolean } | undefined;

        if (!pos || !renderable || !renderable.visible) continue;

        const worldX = pos.x * this.tileSize;
        const worldY = pos.y * this.tileSize;
        const screen = this.camera.worldToScreen(worldX, worldY);

        if (!isFinite(screen.x) || !isFinite(screen.y)) continue;

        const tilePixelSize = this.tileSize * this.camera.zoom;
        const centerX = screen.x + tilePixelSize / 2;
        const centerY = screen.y + tilePixelSize / 2;
        const distance = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);

        console.log(`[Renderer]   Fallback: Agent at screen=(${screen.x.toFixed(1)}, ${screen.y.toFixed(1)}), center=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}), distance=${distance.toFixed(1)}`);

        if (distance < nearestDistance && distance < maxSearchDistance) {
          nearestAgent = entity;
          nearestDistance = distance;
          console.log(`[Renderer]   Fallback: New nearest agent found, distance=${nearestDistance.toFixed(1)}`);
        }
      }

      if (nearestAgent) {
        console.log(`[Renderer] Found nearest agent at distance ${nearestDistance.toFixed(1)} (within max ${maxSearchDistance.toFixed(1)})`);
        return nearestAgent;
      } else {
        console.log(`[Renderer] No agents found within viewport distance`);
      }
    }

    return null;
  }

  /**
   * Render the world.
   * @param world World instance
   * @param selectedEntity Optional selected entity to highlight
   */
  render(world: World, selectedEntity?: any): void {
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
      this.terrainGenerator.generateChunk(chunk, world as any);
    }

    // Get visible bounds in world coordinates
    const bounds = this.camera.getVisibleBounds();

    // Calculate chunk bounds
    const startChunkX = Math.floor(bounds.left / CHUNK_SIZE);
    const endChunkX = Math.floor(bounds.right / CHUNK_SIZE);
    const startChunkY = Math.floor(bounds.top / CHUNK_SIZE);
    const endChunkY = Math.floor(bounds.bottom / CHUNK_SIZE);

    // Render terrain tiles
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
        if (!this.chunkManager.hasChunk(chunkX, chunkY)) continue;
        const chunk = this.chunkManager.getChunk(chunkX, chunkY);
        this.renderChunk(chunk);
      }
    }

    // Draw entities (if any have position component)
    const entities = world.query().with('position', 'renderable').executeEntities();

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

    // Debug: count and log animals
    const animalEntities = entities.filter(e => e.components.has('animal'));
    // if (animalEntities.length > 0) {
    //   console.log(`[Renderer] Found ${animalEntities.length} animals to render:`,
    //     animalEntities.map(e => ({
    //       id: e.id.substring(0, 10),
    //       animal: e.components.get('animal'),
    //       renderable: e.components.get('renderable'),
    //       position: e.components.get('position')
    //     }))
    //   );
    // } else {
    if (animalEntities.length === 0) {
      // Query all entities with animal component to see if they exist at all
      const allAnimals = world.query().with('animal').executeEntities();
      if (allAnimals.length > 0) {
        console.warn(`[Renderer] Found ${allAnimals.length} animals in world, but none have both position+renderable!`,
          allAnimals.map(e => ({
            id: e.id.substring(0, 10),
            hasPosition: e.components.has('position'),
            hasRenderable: e.components.has('renderable'),
            position: e.components.get('position'),
            renderable: e.components.get('renderable')
          }))
        );
      }
    }

    for (const entity of entities) {
      const pos = entity.components.get('position') as
        | { x: number; y: number }
        | undefined;
      const renderable = entity.components.get('renderable') as
        | { spriteId: string; visible: boolean }
        | undefined;

      if (!pos || !renderable || !renderable.visible) {
        // Debug: log why buildings are being skipped
        // if (entity.components.has('building')) {
        //   console.log(`[Renderer] Skipping building ${entity.id}:`, {
        //     hasPos: !!pos,
        //     hasRenderable: !!renderable,
        //     visible: renderable?.visible
        //   });
        // }
        continue;
      }

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      // Debug: log when we're about to render a building
      // if (entity.components.has('building')) {
      //   const building = entity.components.get('building') as any;
      //   console.log(`[Renderer] Rendering building ${entity.id}:`, {
      //     type: building.buildingType,
      //     worldPos: { x: pos.x, y: pos.y },
      //     worldPixels: { x: worldX, y: worldY },
      //     screenPos: { x: screen.x, y: screen.y },
      //     sprite: renderable.spriteId,
      //     tileSize: this.tileSize,
      //     zoom: this.camera.zoom
      //   });
      // }

      // Check if this is a building under construction
      const building = entity.components.get('building') as
        | { progress: number; isComplete: boolean; buildingType: string }
        | undefined;

      const isUnderConstruction = building && !building.isComplete && building.progress < 100;

      // Render sprite with reduced opacity if under construction
      if (isUnderConstruction) {
        this.ctx.globalAlpha = 0.5;
      }

      // Get plant component for stage-based rendering
      const plant = entity.components.get('plant') as { stage: string } | undefined;
      const metadata = plant ? { stage: plant.stage } : undefined;

      renderSprite(
        this.ctx,
        renderable.spriteId,
        screen.x,
        screen.y,
        this.tileSize * this.camera.zoom,
        metadata
      );

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
      if (building) {
        this.drawBuildingLabel(screen.x, screen.y, building.buildingType, !!isUnderConstruction);
      }

      // Draw construction progress bar if under construction
      if (isUnderConstruction && building) {
        this.drawConstructionProgress(screen.x, screen.y, building.progress);
      }

      // Draw resource amount bar for harvestable resources (trees, rocks)
      const resource = entity.components.get('resource') as
        | { resourceType: string; amount: number; maxAmount: number; harvestable: boolean }
        | undefined;
      if (resource && resource.harvestable && resource.maxAmount > 0) {
        this.drawResourceAmount(screen.x, screen.y, resource.amount, resource.maxAmount, resource.resourceType);
      }

      // Draw agent behavior label
      const agent = entity.components.get('agent') as
        | { behavior: string; behaviorState?: Record<string, any>; recentSpeech?: string }
        | undefined;
      const circadian = entity.components.get('circadian') as
        | { isSleeping: boolean }
        | undefined;
      if (agent && agent.behavior) {
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
      const reflection = entity.components.get('reflection') as
        | { isReflecting: boolean; reflectionType?: string }
        | undefined;
      if (reflection?.isReflecting) {
        this.drawReflectionIndicator(screen.x, screen.y, reflection.reflectionType);
      }

      // Draw animal state label
      const animal = entity.components.get('animal') as
        | { state: string; wild: boolean; name: string }
        | undefined;
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
      const pos = entity.components.get('position') as { x: number; y: number } | undefined;
      const identity = entity.components.get('identity') as { name: string } | undefined;

      if (!pos) continue;

      // Convert world position to screen position
      const worldX = pos.x * this.tileSize + this.tileSize / 2;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      agentData.push({
        id: entity.id,
        x: screen.x,
        y: screen.y,
        name: identity?.name
      });
    }

    this.speechBubbleRenderer.render(this.ctx, agentData);
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
            console.log(`[Renderer] ✅ RENDERING TILLED TILE - Visual feedback IS active!`);
            console.log(`[Renderer] Tilled tile details:`, {
              position: { x: chunk.x * CHUNK_SIZE + localX, y: chunk.y * CHUNK_SIZE + localY },
              terrain: tile.terrain,
              tilled: tile.tilled,
              plantability: tile.plantability,
              fertility: tile.fertility,
            });
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
    behaviorState?: Record<string, any>,
    circadian?: { isSleeping: boolean }
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
      const resourceType = behaviorState.resourceType;
      displayText = `Gathering ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
    } else if (behavior === 'build' && behaviorState?.buildingType) {
      displayText = `Building ${behaviorState.buildingType}`;
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
  private drawAgentBuildingInteractions(world: World, selectedEntity?: any): void {
    // Get all agents
    const agents = world.query().with('agent', 'position').executeEntities();

    // Get all buildings
    const buildings = world.query().with('building', 'position').executeEntities();

    const interactionRadius = 2.0; // tiles

    for (const agent of agents) {
      const agentPos = agent.components.get('position') as { x: number; y: number } | undefined;
      const agentComp = agent.components.get('agent') as { behavior: string } | undefined;
      const temperature = agent.components.get('temperature') as { state: string } | undefined;

      if (!agentPos || !agentComp) continue;

      // Check if agent is near any building
      for (const building of buildings) {
        const buildingPos = building.components.get('position') as { x: number; y: number } | undefined;
        const buildingComp = building.components.get('building') as
          { buildingType: string; isComplete: boolean } | undefined;

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
      const timeComp = timeEntity.components.get('time') as any;
      if (timeComp) {
        const hours = Math.floor(timeComp.timeOfDay);
        const minutes = Math.floor((timeComp.timeOfDay - hours) * 60);
        timeOfDayStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        phaseStr = timeComp.phase;
        lightLevelStr = (timeComp.lightLevel * 100).toFixed(0) + '%';
      }
    }

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${timeOfDayStr} (${phaseStr}) Light: ${lightLevelStr}`,
      `Camera: (${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)}) zoom: ${this.camera.zoom.toFixed(2)}`,
      `Chunks: ${this.chunkManager.getChunkCount()}`,
      `Entities: ${world.entities.size}`,
      `Seed: ${this.terrainGenerator.getSeed()}`,
    ];

    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10, 20 + i * 15);
    });
  }
}
