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

  private tileSize = 16; // Pixels per tile at zoom=1

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
   * Find entity at screen coordinates.
   * Returns the entity if found, or null.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param world World instance
   */
  findEntityAtScreenPosition(screenX: number, screenY: number, world: World): any | null {
    const entities = world.query().with('position', 'renderable').executeEntities();

    let closestEntity: any | null = null;
    let closestDistance = Infinity;

    // Check all entities and find the closest one to the click point
    for (const entity of entities) {
      if (!entity) continue;
      const pos = entity.components.get('position') as { x: number; y: number } | undefined;
      const renderable = entity.components.get('renderable') as { visible: boolean } | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      const tilePixelSize = this.tileSize * this.camera.zoom;

      // Check distance from click to entity center (more forgiving than exact bounds)
      const centerX = screen.x + tilePixelSize / 2;
      const centerY = screen.y + tilePixelSize / 2;
      const distance = Math.sqrt((screenX - centerX) ** 2 + (screenY - centerY) ** 2);

      // Click is within entity if distance to center is less than half the tile size
      const clickRadius = tilePixelSize / 2;

      if (distance <= clickRadius && distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    return closestEntity;
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

    for (const entity of entities) {
      const pos = entity.components.get('position') as
        | { x: number; y: number }
        | undefined;
      const renderable = entity.components.get('renderable') as
        | { spriteId: string; visible: boolean }
        | undefined;

      if (!pos || !renderable || !renderable.visible) continue;

      const worldX = pos.x * this.tileSize;
      const worldY = pos.y * this.tileSize;
      const screen = this.camera.worldToScreen(worldX, worldY);

      // Check if this is a building under construction
      const building = entity.components.get('building') as
        | { progress: number; isComplete: boolean; buildingType: string }
        | undefined;
      const isUnderConstruction = building && !building.isComplete && building.progress < 100;

      // Render sprite with reduced opacity if under construction
      if (isUnderConstruction) {
        this.ctx.globalAlpha = 0.5;
      }

      renderSprite(
        this.ctx,
        renderable.spriteId,
        screen.x,
        screen.y,
        this.tileSize * this.camera.zoom
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
        | { behavior: string; behaviorState?: Record<string, any> }
        | undefined;
      if (agent && agent.behavior) {
        this.drawAgentBehavior(screen.x, screen.y, agent.behavior, agent.behaviorState);
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

    // Draw debug info
    this.drawDebugInfo(world);
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

        // Draw tilled indicator (darker brown overlay)
        if (tile.tilled) {
          this.ctx.fillStyle = 'rgba(101, 67, 33, 0.4)'; // Dark brown overlay
          this.ctx.fillRect(screen.x, screen.y, tilePixelSize, tilePixelSize);

          // Add horizontal lines to show tilled furrows
          this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.6)';
          this.ctx.lineWidth = Math.max(1, this.camera.zoom * 0.5);
          const furrowCount = 3;
          const furrowSpacing = tilePixelSize / (furrowCount + 1);
          for (let i = 1; i <= furrowCount; i++) {
            const y = screen.y + furrowSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x, y);
            this.ctx.lineTo(screen.x + tilePixelSize, y);
            this.ctx.stroke();
          }
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
   */
  private drawResourceAmount(
    screenX: number,
    screenY: number,
    amount: number,
    maxAmount: number,
    resourceType: string
  ): void {
    const barWidth = this.tileSize * this.camera.zoom;
    const barHeight = 3 * this.camera.zoom;
    const barX = screenX;
    const barY = screenY + this.tileSize * this.camera.zoom + 2; // Below sprite

    // Calculate percentage
    const percentage = (amount / maxAmount) * 100;

    // Background (dark gray)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Resource fill (color based on resource type and percentage)
    const resourceColors: Record<string, string> = {
      wood: '#8B4513', // Brown
      stone: '#A0A0A0', // Gray
      food: '#00FF00', // Green
      water: '#1E90FF', // Blue
    };

    let fillColor = resourceColors[resourceType] || '#FFFFFF';

    // Dim color if depleted
    if (percentage < 25) {
      fillColor = 'rgba(255, 0, 0, 0.7)'; // Red if low
    } else if (percentage < 50) {
      fillColor = 'rgba(255, 165, 0, 0.7)'; // Orange if medium
    }

    const fillWidth = (barWidth * amount) / maxAmount;
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border (white, thin)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Resource amount text (if zoom is large enough)
    if (this.camera.zoom >= 0.7) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${8 * this.camera.zoom}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 2;
      this.ctx.fillText(
        `${amount.toFixed(0)}/${maxAmount}`,
        barX + barWidth / 2,
        barY + barHeight + 10 * this.camera.zoom
      );
      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Draw agent behavior label above the agent.
   * Shows what the agent is currently doing.
   */
  private drawAgentBehavior(
    screenX: number,
    screenY: number,
    behavior: string,
    behaviorState?: Record<string, any>
  ): void {
    // Only show if zoom is reasonable
    if (this.camera.zoom < 0.5) return;

    // Format behavior for display
    let displayText = behavior.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    // Add resource type if gathering
    if (behavior === 'gather' && behaviorState?.resourceType) {
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

    const lines = [
      `Tick: ${world.tick}`,
      `Time: ${world.gameTime.hour}:00 Day ${world.gameTime.day} ${world.gameTime.season} Year ${world.gameTime.year}`,
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
