/**
 * PlantInfoView - Detailed plant information
 *
 * Shows comprehensive info about the selected plant including:
 * - Species and growth stage
 * - Health, hydration, and nutrition
 * - Genetics and traits
 * - Production (flowers, fruits, seeds)
 * - Resource contents
 *
 * Accessibility-first: describes plant state in natural language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';

/**
 * Genetics information
 */
interface PlantGenetics {
  growthRate: number;
  yieldAmount: number;
  droughtTolerance?: number;
  coldTolerance?: number;
}

/**
 * Resource information
 */
interface PlantResource {
  type: string;
  amount: number;
  maxAmount: number;
  regenerationRate: number;
}

/**
 * Data returned by the PlantInfo view
 */
export interface PlantInfoViewData extends ViewData {
  /** Plant entity ID */
  plantId: string | null;
  /** Species display name */
  speciesName: string | null;
  /** Species ID */
  speciesId: string | null;
  /** Current growth stage */
  stage: string | null;
  /** Progress through current stage (0-1) */
  stageProgress: number;
  /** Plant age in days */
  age: number;
  /** Health (0-100) */
  health: number;
  /** Hydration (0-100) */
  hydration: number;
  /** Nutrition (0-100) */
  nutrition: number;
  /** Genetics info */
  genetics: PlantGenetics | null;
  /** Position */
  position: { x: number; y: number } | null;
  /** Generation number */
  generation: number | null;
  /** Flower count */
  flowerCount: number;
  /** Fruit count */
  fruitCount: number;
  /** Seeds produced */
  seedsProduced: number;
  /** Resource contents */
  resource: PlantResource | null;
}

/**
 * Get stage emoji
 */
function getStageEmoji(stage: string): string {
  const emojis: Record<string, string> = {
    'seed': '(seed)',
    'germinating': '(sprout)',
    'sprout': '(sprout)',
    'vegetative': '(growing)',
    'flowering': '(flower)',
    'fruiting': '(fruit)',
    'mature': '(mature)',
    'seeding': '(seeding)',
    'senescence': '(wilting)',
    'decay': '(decaying)',
    'dead': '(dead)',
  };
  return emojis[stage] || '(plant)';
}

/**
 * PlantInfo View Definition
 */
export const PlantInfoView: DashboardView<PlantInfoViewData> = {
  id: 'plant-info',
  title: 'Plant Info',
  category: 'farming',
  keyboardShortcut: 'P',
  description: 'Detailed information about the selected plant',

  defaultSize: {
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 400,
  },

  getData(context: ViewContext): PlantInfoViewData {
    const { world, selectedEntityId } = context;

    const emptyData: PlantInfoViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No plant selected',
      plantId: null,
      speciesName: null,
      speciesId: null,
      stage: null,
      stageProgress: 0,
      age: 0,
      health: 0,
      hydration: 0,
      nutrition: 0,
      genetics: null,
      position: null,
      generation: null,
      flowerCount: 0,
      fruitCount: 0,
      seedsProduced: 0,
      resource: null,
    };

    if (!selectedEntityId) {
      return emptyData;
    }

    if (!world || typeof world.getEntity !== 'function') {
      emptyData.unavailableReason = 'Game world not available';
      return emptyData;
    }

    try {
      const entity = world.getEntity(selectedEntityId);
      if (!entity) {
        emptyData.unavailableReason = 'Selected entity not found';
        return emptyData;
      }

      const plant = entity.components.get('plant') as unknown as {
        speciesId?: string;
        stage?: string;
        stageProgress?: number;
        age?: number;
        health?: number;
        hydration?: number;
        nutrition?: number;
        genetics?: PlantGenetics;
        generation?: number;
        flowerCount?: number;
        fruitCount?: number;
        seedsProduced?: number;
      } | undefined;

      if (!plant) {
        emptyData.unavailableReason = 'Selected entity is not a plant';
        return emptyData;
      }

      const position = entity.components.get('position') as unknown as {
        x?: number;
        y?: number;
      } | undefined;

      const resource = entity.components.get('resource') as unknown as {
        resourceType?: string;
        type?: string;
        amount?: number;
        maxAmount?: number;
        regenerationRate?: number;
      } | undefined;

      // Format species name
      const speciesName = plant.speciesId
        ? plant.speciesId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : null;

      return {
        timestamp: Date.now(),
        available: true,
        plantId: selectedEntityId,
        speciesName,
        speciesId: plant.speciesId || null,
        stage: plant.stage || null,
        stageProgress: plant.stageProgress || 0,
        age: plant.age || 0,
        health: plant.health ?? 0,
        hydration: plant.hydration ?? 0,
        nutrition: plant.nutrition ?? 0,
        genetics: plant.genetics || null,
        position: position?.x !== undefined && position?.y !== undefined
          ? { x: position.x, y: position.y }
          : null,
        generation: plant.generation ?? null,
        flowerCount: plant.flowerCount || 0,
        fruitCount: plant.fruitCount || 0,
        seedsProduced: plant.seedsProduced || 0,
        resource: resource ? {
          type: resource.resourceType || resource.type || 'unknown',
          amount: resource.amount ?? 0,
          maxAmount: resource.maxAmount ?? resource.amount ?? 0,
          regenerationRate: resource.regenerationRate ?? 0,
        } : null,
      };
    } catch (error) {
      emptyData.unavailableReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      return emptyData;
    }
  },

  textFormatter(data: PlantInfoViewData): string {
    const lines: string[] = [
      'PLANT INFORMATION',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Plant data unavailable');
      lines.push('');
      lines.push('Click on a plant in the game world to view its details.');
      return lines.join('\n');
    }

    // Identity
    lines.push(data.speciesName || 'Unknown Plant');
    const stageEmoji = getStageEmoji(data.stage || '');
    const stageProgress = Math.round((data.stageProgress || 0) * 100);
    lines.push(`Stage: ${stageEmoji} ${data.stage || 'unknown'} (${stageProgress}% complete)`);
    lines.push(`Age: ${data.age.toFixed(1)} days`);
    if (data.generation !== null) {
      lines.push(`Generation: ${data.generation}`);
    }
    lines.push('');

    // Health status - narrative
    lines.push('CONDITION');
    lines.push('─'.repeat(50));

    const healthDesc = data.health > 70 ? 'thriving' :
      data.health > 40 ? 'healthy' :
        data.health > 20 ? 'struggling' : 'dying';
    lines.push(`This plant is ${healthDesc}.`);

    // Health bar
    lines.push(`  Health: ${Math.round(data.health)}%`);
    lines.push(`  ${createProgressBar(data.health, 30)}`);

    // Hydration
    const hydrationDesc = data.hydration > 60 ? 'well-watered' :
      data.hydration > 30 ? 'adequately moist' :
        data.hydration > 10 ? 'dry' : 'parched';
    lines.push(`  Hydration: ${Math.round(data.hydration)}% (${hydrationDesc})`);
    lines.push(`  ${createProgressBar(data.hydration, 30)}`);

    // Nutrition
    const nutritionDesc = data.nutrition > 60 ? 'well-fed' :
      data.nutrition > 30 ? 'adequately nourished' :
        data.nutrition > 10 ? 'hungry' : 'starving';
    lines.push(`  Nutrition: ${Math.round(data.nutrition)}% (${nutritionDesc})`);
    lines.push(`  ${createProgressBar(data.nutrition, 30)}`);
    lines.push('');

    // Production
    if (data.flowerCount > 0 || data.fruitCount > 0 || data.seedsProduced > 0) {
      lines.push('PRODUCTION');
      lines.push('─'.repeat(50));
      if (data.flowerCount > 0) {
        lines.push(`  Flowers: ${data.flowerCount}`);
      }
      if (data.fruitCount > 0) {
        lines.push(`  Fruits/Food: ${data.fruitCount}`);
      }
      if (data.seedsProduced > 0) {
        lines.push(`  Seeds: ${data.seedsProduced}`);
      }
      lines.push('');
    }

    // Genetics
    if (data.genetics) {
      lines.push('GENETICS');
      lines.push('─'.repeat(50));
      lines.push(`  Growth rate: ${data.genetics.growthRate.toFixed(2)}x`);
      lines.push(`  Yield multiplier: ${data.genetics.yieldAmount.toFixed(2)}x`);
      if (data.genetics.droughtTolerance !== undefined) {
        lines.push(`  Drought tolerance: ${data.genetics.droughtTolerance.toFixed(0)}`);
      }
      if (data.genetics.coldTolerance !== undefined) {
        lines.push(`  Cold tolerance: ${data.genetics.coldTolerance.toFixed(0)}`);
      }
      lines.push('');
    }

    // Resource contents
    if (data.resource) {
      lines.push('HARVESTABLE RESOURCES');
      lines.push('─'.repeat(50));
      lines.push(`  ${data.resource.type}: ${Math.round(data.resource.amount)}/${Math.round(data.resource.maxAmount)}`);
      if (data.resource.regenerationRate > 0) {
        lines.push(`  Regeneration: +${data.resource.regenerationRate.toFixed(2)}/sec`);
      }
      lines.push('');
    }

    // Position
    if (data.position) {
      lines.push(`Location: (${data.position.x.toFixed(1)}, ${data.position.y.toFixed(1)})`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: PlantInfoViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Click on a plant to inspect', x + padding, currentY);
      return;
    }

    // Species name
    ctx.fillStyle = '#90EE90';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.speciesName || 'Unknown Plant', x + padding, currentY);
    currentY += lineHeight + 5;

    // Stage
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Stage: ${data.stage} (${Math.round(data.stageProgress * 100)}%)`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Health bar
    const barWidth = width - padding * 2 - 60;
    const barHeight = 12;

    ctx.fillStyle = theme.colors.text;
    ctx.fillText('Health:', x + padding, currentY);

    ctx.fillStyle = theme.colors.border;
    ctx.fillRect(x + padding + 50, currentY, barWidth, barHeight);

    const healthColor = data.health > 70 ? '#00FF00' : data.health > 40 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = healthColor;
    ctx.fillRect(x + padding + 50, currentY, barWidth * (data.health / 100), barHeight);
    currentY += 20;

    // Hydration bar
    ctx.fillStyle = theme.colors.text;
    ctx.fillText('Water:', x + padding, currentY);

    ctx.fillStyle = theme.colors.border;
    ctx.fillRect(x + padding + 50, currentY, barWidth, barHeight);

    const hydrationColor = data.hydration > 60 ? '#1E90FF' : data.hydration > 30 ? '#FFA500' : '#FF4500';
    ctx.fillStyle = hydrationColor;
    ctx.fillRect(x + padding + 50, currentY, barWidth * (data.hydration / 100), barHeight);
    currentY += 20;

    // Production summary
    if (data.fruitCount > 0 || data.flowerCount > 0) {
      ctx.fillStyle = theme.colors.textMuted;
      const prodText = [];
      if (data.flowerCount > 0) prodText.push(`${data.flowerCount} flowers`);
      if (data.fruitCount > 0) prodText.push(`${data.fruitCount} fruits`);
      ctx.fillText(prodText.join(', '), x + padding, currentY);
    }
  },
};
