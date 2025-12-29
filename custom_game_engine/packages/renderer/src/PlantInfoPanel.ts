import type { Entity } from '@ai-village/core';

/**
 * UI Panel displaying information about a selected plant.
 * Shows plant species, stage, age, health, hydration, nutrition, and genetics.
 */
export class PlantInfoPanel {
  private selectedEntityId: string | null = null;
  private panelWidth = 320;
  private panelHeight = 480; // Increased to fit all content including buttons
  private padding = 10;
  private lineHeight = 18;
  private scrollOffset = 0;
  private contentHeight = 0; // Calculated during render

  /**
   * Set the currently selected plant entity.
   * @param entity Plant entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntityId = entity ? entity.id : null;
    this.scrollOffset = 0; // Reset scroll when selecting new entity
  }

  /**
   * Get the currently selected entity ID.
   */
  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Get the currently selected entity (for backwards compatibility).
   */
  getSelectedEntity(): { id: string } | null {
    return this.selectedEntityId ? { id: this.selectedEntityId } : null;
  }

  /**
   * Handle scroll events.
   * @param deltaY Scroll delta (positive = down, negative = up)
   * @param viewportHeight Height of the visible content area
   * @returns True if scroll was handled
   */
  handleScroll(deltaY: number, viewportHeight: number): boolean {
    const scrollSpeed = 30;
    const maxScroll = Math.max(0, this.contentHeight - viewportHeight + this.padding * 2);

    this.scrollOffset += deltaY > 0 ? scrollSpeed : -scrollSpeed;
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));

    return true;
  }

  /**
   * Render the plant info panel.
   * When used via WindowManager adapter, ctx is already translated to window position,
   * so we render at (0, 0) relative to the content area.
   * @param ctx Canvas rendering context
   * @param width Width of the content area
   * @param height Height of the content area
   * @param world World instance to look up the selected entity
   * @param _tileInspectorOpen Deprecated - positioning handled by WindowManager
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number, world: any, _tileInspectorOpen: boolean = false): void {
    if (!this.selectedEntityId) {
      return; // Nothing to render
    }

    // Guard against undefined world
    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[PlantInfoPanel] World not available or missing getEntity method');
      return;
    }

    // Look up the entity from the world
    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[PlantInfoPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null; // Clear invalid selection
      return;
    }

    // Get plant component
    const plant = selectedEntity.components.get('plant') as any | undefined;
    if (!plant) {
      console.warn('[PlantInfoPanel] Selected entity is not a plant');
      this.selectedEntityId = null;
      return;
    }

    // Render at (0, 0) - WindowManager handles positioning via translate
    const x = 0;
    const y = 0;

    // Use provided dimensions (from WindowManager) or fall back to defaults
    const renderWidth = width || this.panelWidth;
    const renderHeight = height || this.panelHeight;

    // Set up clipping for scroll
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, renderWidth, renderHeight);
    ctx.clip();

    // Apply scroll offset
    ctx.translate(0, -this.scrollOffset);

    // Set up text rendering
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + this.padding;

    // Helper function to draw text
    const drawText = (text: string, color: string = '#FFFFFF') => {
      ctx.fillStyle = color;
      ctx.fillText(text, x + this.padding, currentY);
      currentY += this.lineHeight;
    };

    // Helper function to draw progress bar
    const drawProgressBar = (label: string, value: number, maxValue: number, color: string) => {
      const barWidth = renderWidth - 2 * this.padding;
      const barHeight = 14;
      const fillWidth = (value / maxValue) * barWidth;

      // Label
      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(label, x + this.padding, currentY);
      currentY += this.lineHeight;

      // Background
      ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
      ctx.fillRect(x + this.padding, currentY, barWidth, barHeight);

      // Fill
      ctx.fillStyle = color;
      ctx.fillRect(x + this.padding, currentY, fillWidth, barHeight);

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + this.padding, currentY, barWidth, barHeight);

      // Value text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px monospace';
      ctx.fillText(`${Math.round(value)}/${Math.round(maxValue)}`, x + this.padding + 5, currentY + 2);
      ctx.font = '14px monospace';

      currentY += barHeight + 4;
    };

    // Title - removed, WindowManager shows title in title bar
    currentY += 4;

    // Species
    const speciesName = this.getSpeciesDisplayName(plant.speciesId);
    drawText(`Species: ${speciesName}`, '#90EE90');

    // Stage
    const stageEmoji = this.getStageEmoji(plant.stage);
    const stageProgress = Math.round((plant.stageProgress || 0) * 100);
    drawText(`Stage: ${stageEmoji} ${plant.stage} (${stageProgress}%)`, '#FFD700');

    // Age
    drawText(`Age: ${plant.age?.toFixed(1) || 0} days`, '#CCCCCC');

    currentY += 4;

    // Health bar
    const health = plant.health ?? 0;
    const healthColor = health > 70 ? '#00FF00' : health > 40 ? '#FFFF00' : '#FF0000';
    drawProgressBar('Health', health, 100, healthColor);

    // Hydration bar
    const hydration = plant.hydration ?? 0;
    const hydrationColor = hydration > 60 ? '#1E90FF' : hydration > 30 ? '#FFA500' : '#FF4500';
    drawProgressBar('Hydration', hydration, 100, hydrationColor);

    // Nutrition bar
    const nutrition = plant.nutrition ?? 0;
    const nutritionColor = nutrition > 60 ? '#8B4513' : nutrition > 30 ? '#D2691E' : '#FF6347';
    drawProgressBar('Nutrition', nutrition, 100, nutritionColor);

    currentY += 4;

    // Genetics
    if (plant.genetics) {
      drawText('--- Genetics ---', '#9370DB');
      const growthRate = plant.genetics.growthRate ?? 1.0;
      const yieldAmount = plant.genetics.yieldAmount ?? 1.0;
      drawText(`Growth: ${growthRate.toFixed(2)}x`, '#CCCCCC');
      drawText(`Yield: ${yieldAmount.toFixed(2)}x`, '#CCCCCC');

      if (plant.genetics.droughtTolerance !== undefined) {
        drawText(`Drought Tol: ${plant.genetics.droughtTolerance.toFixed(0)}`, '#CCCCCC');
      }
      if (plant.genetics.coldTolerance !== undefined) {
        drawText(`Cold Tol: ${plant.genetics.coldTolerance.toFixed(0)}`, '#CCCCCC');
      }
    }

    currentY += 4;

    // Position
    const position = selectedEntity.components.get('position') as { x: number; y: number } | undefined;
    if (position) {
      drawText(`Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`, '#888888');
    }

    // Generation
    if (plant.generation !== undefined) {
      drawText(`Generation: ${plant.generation}`, '#888888');
    }

    // Production counts - always show for relevant species
    const isFruitBearing = speciesName.toLowerCase().includes('berry') ||
                          speciesName.toLowerCase().includes('fruit') ||
                          ['tomato', 'potato', 'carrot'].includes(plant.speciesId);

    if (plant.flowerCount > 0) {
      drawText(`🌸 Flowers: ${plant.flowerCount}`, '#FFB6C1');
    }

    // Always show fruit count for fruit-bearing plants
    if (plant.fruitCount > 0 || isFruitBearing) {
      const fruitEmoji = plant.speciesId === 'berry-bush' ? '🫐' : '🍅';
      drawText(`${fruitEmoji} Food: ${plant.fruitCount}`, '#FF6347');
    }

    if (plant.seedsProduced > 0) {
      drawText(`🌰 Seeds: ${plant.seedsProduced}`, '#8B4513');
    }

    currentY += 8;

    // Contents section - show resource data if entity has resource component
    const resource = selectedEntity.components.get('resource') as any | undefined;
    if (resource) {
      drawText('--- Contents ---', '#87CEEB');

      const resourceType = resource.resourceType || resource.type || 'unknown';
      const amount = resource.amount ?? 0;
      const maxAmount = resource.maxAmount ?? amount;
      const regenRate = resource.regenerationRate ?? 0;

      // Resource type with icon
      const resourceIcons: Record<string, string> = {
        'food': '🍎',
        'wood': '🪵',
        'stone': '🪨',
        'fiber': '🧵',
        'water': '💧',
      };
      const icon = resourceIcons[resourceType] || '📦';
      drawText(`${icon} ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`, '#90EE90');

      // Amount bar
      const barWidth = renderWidth - 2 * this.padding;
      const barHeight = 14;
      const fillWidth = maxAmount > 0 ? (amount / maxAmount) * barWidth : 0;

      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(`Amount: ${Math.round(amount)}/${Math.round(maxAmount)}`, x + this.padding, currentY);
      currentY += this.lineHeight;

      // Background
      ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
      ctx.fillRect(x + this.padding, currentY, barWidth, barHeight);

      // Fill
      ctx.fillStyle = amount > maxAmount * 0.5 ? '#4CAF50' : amount > maxAmount * 0.25 ? '#FFC107' : '#FF5722';
      ctx.fillRect(x + this.padding, currentY, fillWidth, barHeight);

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + this.padding, currentY, barWidth, barHeight);

      currentY += barHeight + 6;

      // Regeneration rate
      if (regenRate > 0) {
        drawText(`⏱️ Regen: +${regenRate.toFixed(2)}/sec`, '#CCCCCC');
      }
    }

    // Save content height for scroll calculations
    this.contentHeight = currentY - y;

    // Restore context (removes clipping and scroll transform)
    ctx.restore();

    // Draw scroll indicator if content overflows
    if (this.contentHeight > renderHeight) {
      const scrollbarWidth = 6;
      const scrollbarX = renderWidth - scrollbarWidth - 2;
      const scrollbarHeight = renderHeight - 4;
      const thumbHeight = Math.max(20, (renderHeight / this.contentHeight) * scrollbarHeight);
      const maxScroll = this.contentHeight - renderHeight;
      const thumbY = 2 + (this.scrollOffset / maxScroll) * (scrollbarHeight - thumbHeight);

      // Track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(scrollbarX, 2, scrollbarWidth, scrollbarHeight);

      // Thumb
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
    }
  }

  /**
   * Handle click events on the panel.
   * @param screenX Screen X coordinate
   * @param screenY Screen Y coordinate
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param tileInspectorOpen Whether the tile inspector is currently open
   * @returns True if click was handled
   */
  handleClick(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number, tileInspectorOpen: boolean = false): boolean {
    if (!this.selectedEntityId) {
      return false;
    }

    // Calculate panel position (same logic as render)
    let x: number;
    const y = canvasHeight - this.panelHeight - 20;

    if (tileInspectorOpen) {
      x = canvasWidth - this.panelWidth - 340 - 20;
    } else {
      x = canvasWidth - this.panelWidth - 20;
    }

    // Check if click is inside panel
    if (
      screenX < x ||
      screenX > x + this.panelWidth ||
      screenY < y ||
      screenY > y + this.panelHeight
    ) {
      return false;
    }

    // Check close button click
    const closeButtonSize = 24;
    const closeButtonX = x + this.panelWidth - closeButtonSize - 8;
    const closeButtonY = y + 8;

    if (
      screenX >= closeButtonX &&
      screenX <= closeButtonX + closeButtonSize &&
      screenY >= closeButtonY &&
      screenY <= closeButtonY + closeButtonSize
    ) {
      this.setSelectedEntity(null);
      return true;
    }

    return true; // Click was inside panel
  }

  /**
   * Get display name for species ID
   */
  private getSpeciesDisplayName(speciesId: string): string {
    // TODO: Look up from PlantSpeciesRegistry once it exists
    // For now, convert kebab-case to Title Case
    return speciesId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get emoji for stage
   */
  private getStageEmoji(stage: string): string {
    const emojis: Record<string, string> = {
      'seed': '🌰',
      'germinating': '🌱',
      'sprout': '🌱',
      'vegetative': '🌿',
      'flowering': '🌸',
      'fruiting': '🍇',
      'mature': '🌾',
      'seeding': '🌾',
      'senescence': '🍂',
      'decay': '🥀',
      'dead': '💀'
    };
    return emojis[stage] || '🌿';
  }
}
