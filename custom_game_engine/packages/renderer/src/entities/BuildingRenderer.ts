import type { DimensionalConfig, RealmPocketConfig } from '@ai-village/building-designer';

/**
 * Handles rendering of building overlays: labels, construction progress, resource amounts.
 * Now includes basic dimensional building indicators (4D/5D/6D).
 * Extracted from Renderer.ts to improve maintainability.
 */
export class BuildingRenderer {
  private ctx: CanvasRenderingContext2D;
  public showBuildingLabels: boolean = true;
  public showResourceAmounts: boolean = true;

  // Dimensional building state (per-building)
  private dimensionalState: Map<string, { currentWSlice: number; currentVPhase: number; collapsedUState: number }> = new Map();

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Get or initialize dimensional state for a building.
   */
  private getDimensionalState(buildingId: string, dimensional?: DimensionalConfig) {
    if (!this.dimensionalState.has(buildingId)) {
      this.dimensionalState.set(buildingId, {
        currentWSlice: dimensional?.w_axis?.currentSlice || 0,
        currentVPhase: dimensional?.v_axis?.currentPhase || 0,
        collapsedUState: dimensional?.u_axis?.collapsed ? 0 : -1 // -1 = not collapsed yet
      });
    }
    return this.dimensionalState.get(buildingId)!;
  }

  /**
   * Get dimensional state for rendering (public access for Renderer).
   * Returns undefined if building has no dimensional state yet.
   */
  getDimensionalStateForRendering(buildingId: string): { currentWSlice: number; currentVPhase: number; collapsedUState: number } | undefined {
    return this.dimensionalState.get(buildingId);
  }

  /**
   * Draw building label above sprite for better visibility.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param buildingType Building type ID
   * @param isUnderConstruction Whether building is under construction
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawBuildingLabel(
    screenX: number,
    screenY: number,
    buildingType: string,
    isUnderConstruction: boolean,
    tileSize: number,
    zoom: number
  ): void {
    // Only show labels when zoomed in enough
    if (zoom < 0.5) return;

    const fontSize = Math.max(8, 10 * zoom);
    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textAlign = 'center';

    // Format building type for display
    const label = buildingType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Position label above the sprite
    const labelY = screenY - (isUnderConstruction ? 20 : 8) * zoom;

    // Draw background for better readability
    const metrics = this.ctx.measureText(label);
    const padding = 2;
    const bgX = screenX + (tileSize * zoom) / 2 - metrics.width / 2 - padding;
    const bgY = labelY - fontSize;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = fontSize + padding;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Draw label text
    this.ctx.fillStyle = isUnderConstruction ? '#FFA500' : '#FFFFFF';
    this.ctx.fillText(
      label,
      screenX + (tileSize * zoom) / 2,
      labelY
    );

    this.ctx.textAlign = 'left'; // Reset
  }

  /**
   * Draw construction progress bar above a building.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param progress Construction progress (0-100)
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawConstructionProgress(
    screenX: number,
    screenY: number,
    progress: number,
    tileSize: number,
    zoom: number
  ): void {
    const barWidth = tileSize * zoom;
    const barHeight = 4 * zoom;
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
    if (zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `${10 * zoom}px monospace`;
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
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param amount Current resource amount
   * @param maxAmount Maximum resource amount
   * @param resourceType Type of resource (wood, stone, food, water)
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawResourceAmount(
    screenX: number,
    screenY: number,
    amount: number,
    maxAmount: number,
    resourceType: string,
    tileSize: number,
    zoom: number
  ): void {
    const barWidth = tileSize * zoom;
    const barHeight = Math.max(3, 4 * zoom); // Minimum 3px height for visibility
    const barX = screenX;
    const barY = screenY + tileSize * zoom + 2; // Below sprite

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
    if (zoom >= 0.5) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${Math.max(8, 9 * zoom)}px monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      this.ctx.shadowBlur = 3;
      this.ctx.fillText(
        `${amount.toFixed(0)}/${maxAmount}`,
        barX + barWidth / 2,
        barY + barHeight + Math.max(10, 11 * zoom)
      );
      this.ctx.shadowBlur = 0;
      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Draw dimensional building indicator (shows 4D/5D/6D status).
   * Displays current W-slice, V-phase, or U-state for dimensional buildings.
   * @param screenX Screen x position
   * @param screenY Screen y position
   * @param buildingId Unique building ID
   * @param dimensional Dimensional configuration
   * @param realmPocket Realm pocket configuration
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   */
  drawDimensionalIndicator(
    screenX: number,
    screenY: number,
    buildingId: string,
    dimensional?: DimensionalConfig,
    realmPocket?: RealmPocketConfig,
    tileSize: number = 16,
    zoom: number = 1.0
  ): void {
    if (!dimensional && !realmPocket) return;
    if (zoom < 0.5) return; // Only show when zoomed in

    const state = this.getDimensionalState(buildingId, dimensional);
    const fontSize = Math.max(8, 10 * zoom);
    this.ctx.font = `bold ${fontSize}px monospace`;
    this.ctx.textAlign = 'left';

    let label = '';
    let color = '#FF00FF'; // Magenta for dimensional

    // 4D W-axis indicator
    if (dimensional?.w_axis && dimensional.w_axis.layers > 1) {
      const layers = dimensional.w_axis.layers;
      const current = state.currentWSlice;
      label = `4D [W${current + 1}/${layers}]`;
      color = '#00FFFF'; // Cyan for 4D
    }
    // 5D V-axis indicator (phase-shifting)
    else if (dimensional?.v_axis && dimensional.v_axis.phases > 1) {
      const phases = dimensional.v_axis.phases;
      const current = state.currentVPhase;
      label = `5D [V${current + 1}/${phases}]`;
      color = '#FF00FF'; // Magenta for 5D
    }
    // 6D U-axis indicator (quantum superposition)
    else if (dimensional?.u_axis && dimensional.u_axis.probabilityStates > 1) {
      if (state.collapsedUState === -1) {
        label = `6D [Superposed]`;
        color = '#FFFF00'; // Yellow for uncollapsed
      } else {
        label = `6D [State ${state.collapsedUState + 1}]`;
        color = '#00FF00'; // Green for collapsed
      }
    }

    // Realm pocket indicator
    if (realmPocket) {
      const ratio = `${realmPocket.exteriorSize.width}x${realmPocket.exteriorSize.height}→${realmPocket.interiorDimensions.width}x${realmPocket.interiorDimensions.height}`;
      label = `TARDIS [${ratio}]`;
      color = '#0088FF'; // Blue for TARDIS
    }

    if (label) {
      // Position indicator in top-right corner of building
      const indicatorX = screenX + (tileSize * zoom) - 4;
      const indicatorY = screenY + fontSize + 2;

      // Draw background
      const metrics = this.ctx.measureText(label);
      const padding = 3;
      const bgX = indicatorX - metrics.width - padding * 2;
      const bgY = indicatorY - fontSize - padding;
      const bgWidth = metrics.width + padding * 2;
      const bgHeight = fontSize + padding * 2;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

      // Draw border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

      // Draw label
      this.ctx.fillStyle = color;
      this.ctx.fillText(label, bgX + padding, indicatorY - padding);

      this.ctx.textAlign = 'left'; // Reset
    }
  }

  /**
   * Set the current W-slice for a 4D building.
   * Call this when the player changes the W-slice slider.
   */
  setWSlice(buildingId: string, wSlice: number): void {
    const state = this.getDimensionalState(buildingId);
    state.currentWSlice = wSlice;
  }

  /**
   * Update V-phase for a 5D building (auto-updates based on game tick).
   * Call this each frame to cycle through phases.
   */
  updateVPhase(buildingId: string, gameTick: number, dimensional?: DimensionalConfig): void {
    if (!dimensional?.v_axis) return;
    const state = this.getDimensionalState(buildingId, dimensional);
    const transitionRate = dimensional.v_axis.transitionRate || 0.1;
    const phases = dimensional.v_axis.phases;
    state.currentVPhase = Math.floor(gameTick * transitionRate) % phases;
  }

  /**
   * Collapse U-state for a 6D building (quantum observation).
   * Call this when a player observes the building.
   */
  collapseUState(buildingId: string, dimensional?: DimensionalConfig): void {
    if (!dimensional?.u_axis) return;
    const state = this.getDimensionalState(buildingId, dimensional);
    if (state.collapsedUState === -1) {
      // Weighted random selection based on stateWeights
      const weights = dimensional.u_axis.stateWeights || [];
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          state.collapsedUState = i;
          break;
        }
      }
      if (state.collapsedUState === -1) state.collapsedUState = 0; // Fallback
    }
  }

  /**
   * Render a building layout from ASCII string array.
   * Supports dimensional layouts (W-axis slices, V-axis phases, U-axis states).
   *
   * @param screenX Screen X position
   * @param screenY Screen Y position
   * @param layout ASCII layout (e.g., ['#####', '#...#', '#...D'])
   * @param tileSize Tile size in pixels
   * @param zoom Camera zoom level
   * @param isDimensional Whether this is from a dimensional building (adds special effects)
   */
  renderBuildingLayout(
    screenX: number,
    screenY: number,
    layout: string[],
    tileSize: number,
    zoom: number,
    isDimensional: boolean = false
  ): void {
    if (!layout || layout.length === 0) return;

    const scaledTileSize = tileSize * zoom;

    for (let y = 0; y < layout.length; y++) {
      const row = layout[y];
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        const tileX = screenX + x * scaledTileSize;
        const tileY = screenY + y * scaledTileSize;

        // Render based on tile symbol
        switch (tile) {
          case '#': // Wall
            this.ctx.fillStyle = isDimensional ? 'rgba(100, 100, 150, 0.8)' : 'rgba(80, 80, 80, 0.9)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
            this.ctx.strokeRect(tileX, tileY, scaledTileSize, scaledTileSize);
            break;

          case '.': // Floor
            this.ctx.fillStyle = isDimensional ? 'rgba(150, 150, 200, 0.5)' : 'rgba(120, 120, 120, 0.6)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            break;

          case 'D': // Door
            this.ctx.fillStyle = isDimensional ? 'rgba(200, 150, 100, 0.9)' : 'rgba(139, 69, 19, 0.9)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            this.ctx.strokeStyle = 'rgba(80, 40, 0, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(tileX + 2, tileY + 2, scaledTileSize - 4, scaledTileSize - 4);
            break;

          case 'W': // Window
            this.ctx.fillStyle = isDimensional ? 'rgba(150, 200, 255, 0.6)' : 'rgba(100, 150, 200, 0.7)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            this.ctx.strokeStyle = 'rgba(50, 100, 150, 0.8)';
            this.ctx.strokeRect(tileX + 1, tileY + 1, scaledTileSize - 2, scaledTileSize - 2);
            break;

          case '<': // Stairs up
          case '>': // Stairs down
            this.ctx.fillStyle = 'rgba(160, 120, 80, 0.8)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${scaledTileSize * 0.6}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tile, tileX + scaledTileSize/2, tileY + scaledTileSize/2);
            break;

          case '+': // Column/pillar
            this.ctx.fillStyle = isDimensional ? 'rgba(120, 120, 160, 0.9)' : 'rgba(100, 100, 100, 0.9)';
            this.ctx.fillRect(tileX + scaledTileSize * 0.2, tileY + scaledTileSize * 0.2,
                             scaledTileSize * 0.6, scaledTileSize * 0.6);
            break;

          case 'B': // Bed
          case 'T': // Table
          case 'S': // Storage
          case 'K': // Kitchen
          case 'C': // Chair
            // Furniture - draw floor + symbol
            this.ctx.fillStyle = 'rgba(120, 120, 120, 0.4)';
            this.ctx.fillRect(tileX, tileY, scaledTileSize, scaledTileSize);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = `bold ${scaledTileSize * 0.5}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tile, tileX + scaledTileSize/2, tileY + scaledTileSize/2);
            break;

          case ' ': // Empty/exterior
          default:
            // Don't render anything
            break;
        }
      }
    }

    // Add dimensional glow effect if this is a dimensional building
    if (isDimensional) {
      this.ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
      this.ctx.lineWidth = 2;
      const width = Math.max(...layout.map(row => row.length)) * scaledTileSize;
      const height = layout.length * scaledTileSize;
      this.ctx.strokeRect(screenX - 2, screenY - 2, width + 4, height + 4);
    }

    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }
}
