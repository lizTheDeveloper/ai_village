import type { Entity } from '@ai-village/core';

/**
 * UI Panel displaying information about a selected plant.
 * Shows plant species, stage, age, health, hydration, nutrition, and genetics.
 */
export class PlantInfoPanel {
  private selectedEntityId: string | null = null;
  private panelWidth = 320;
  private panelHeight = 400;
  private padding = 10;
  private lineHeight = 18;

  /**
   * Set the currently selected plant entity.
   * @param entity Plant entity to display, or null to clear selection
   */
  setSelectedEntity(entity: Entity | null): void {
    console.log('[PlantInfoPanel] setSelectedEntity called with:', entity ? `Entity ${entity.id}` : 'null');
    this.selectedEntityId = entity ? entity.id : null;
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
   * Render the plant info panel.
   * @param ctx Canvas rendering context
   * @param canvasWidth Width of the canvas
   * @param canvasHeight Height of the canvas
   * @param world World instance to look up the selected entity
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, world: any): void {
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

    // Position panel in bottom-right corner (below agent panel if present)
    const x = canvasWidth - this.panelWidth - 20;
    const y = canvasHeight - this.panelHeight - 20;

    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, this.panelWidth, this.panelHeight);

    // Draw panel border
    ctx.strokeStyle = 'rgba(34, 139, 34, 0.7)'; // Green border for plants
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, this.panelWidth, this.panelHeight);

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
      const barWidth = this.panelWidth - 2 * this.padding;
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

    // Title
    drawText('=== PLANT INFO ===', '#32CD32');
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

    // Production counts
    if (plant.flowerCount > 0) {
      drawText(`Flowers: ${plant.flowerCount}`, '#FFB6C1');
    }
    if (plant.fruitCount > 0) {
      drawText(`Fruit: ${plant.fruitCount}`, '#FF6347');
    }
    if (plant.seedsProduced > 0) {
      drawText(`Seeds: ${plant.seedsProduced}`, '#8B4513');
    }
  }

  /**
   * Get display name for species ID
   */
  private getSpeciesDisplayName(speciesId: string): string {
    const names: Record<string, string> = {
      'grass': 'Grass',
      'wildflower': 'Wildflower',
      'berry-bush': 'Berry Bush',
      'wheat': 'Wheat',
      'carrot': 'Carrot',
      'potato': 'Potato',
      'tomato': 'Tomato'
    };
    return names[speciesId] || speciesId;
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
