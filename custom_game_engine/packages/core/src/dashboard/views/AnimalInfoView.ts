/**
 * AnimalInfoView - Detailed animal information
 *
 * Shows comprehensive info about the selected animal including:
 * - Species and life stage
 * - Health and needs (hunger, thirst, energy)
 * - Mood (stress, happiness)
 * - Taming status (wild/tamed, bond level, trust)
 * - Temperature status
 *
 * Accessibility-first: describes animal state in natural language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { getStatusColor, createProgressBar } from '../theme.js';

/**
 * Data returned by the AnimalInfo view
 */
export interface AnimalInfoViewData extends ViewData {
  /** Animal entity ID */
  animalId: string | null;
  /** Animal's name */
  name: string | null;
  /** Species ID */
  speciesId: string | null;
  /** Life stage */
  lifeStage: string | null;
  /** Current behavior state */
  state: string | null;
  /** Age in days */
  age: number;
  /** Is wild or tamed */
  isWild: boolean;
  /** Health (0-100) */
  health: number;
  /** Hunger (0-100, higher = more hungry) */
  hunger: number;
  /** Thirst (0-100, higher = more thirsty) */
  thirst: number;
  /** Energy (0-100) */
  energy: number;
  /** Stress (0-100, higher = more stressed) */
  stress: number;
  /** Mood/happiness (0-100) */
  mood: number;
  /** Bond level with owner (0-100) */
  bondLevel: number;
  /** Trust level (0-100) */
  trustLevel: number;
  /** Current temperature */
  temperature: number | null;
  /** Temperature state */
  temperatureState: string | null;
  /** Position */
  position: { x: number; y: number } | null;
}

/**
 * Get bond description
 */
function getBondDescription(bondLevel: number): string {
  if (bondLevel >= 81) return 'Bonded';
  if (bondLevel >= 61) return 'Loyal';
  if (bondLevel >= 41) return 'Friendly';
  if (bondLevel >= 21) return 'Accepting';
  return 'Wary';
}

/**
 * Get trust description
 */
function getTrustDescription(trustLevel: number): string {
  if (trustLevel >= 70) return 'High Trust';
  if (trustLevel >= 40) return 'Moderate Trust';
  if (trustLevel >= 20) return 'Low Trust';
  return 'No Trust';
}

/**
 * AnimalInfo View Definition
 */
export const AnimalInfoView: DashboardView<AnimalInfoViewData> = {
  id: 'animal-info',
  title: 'Animal Info',
  category: 'animals',
  keyboardShortcut: 'A',
  description: 'Detailed information about the selected animal',

  defaultSize: {
    width: 320,
    height: 500,
    minWidth: 280,
    minHeight: 400,
  },

  getData(context: ViewContext): AnimalInfoViewData {
    const { world, selectedEntityId } = context;

    const emptyData: AnimalInfoViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No animal selected',
      animalId: null,
      name: null,
      speciesId: null,
      lifeStage: null,
      state: null,
      age: 0,
      isWild: true,
      health: 0,
      hunger: 0,
      thirst: 0,
      energy: 0,
      stress: 0,
      mood: 0,
      bondLevel: 0,
      trustLevel: 0,
      temperature: null,
      temperatureState: null,
      position: null,
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

      const animal = entity.components.get('animal') as unknown as {
        name?: string;
        speciesId?: string;
        lifeStage?: string;
        state?: string;
        age?: number;
        wild?: boolean;
        health?: number;
        hunger?: number;
        thirst?: number;
        energy?: number;
        stress?: number;
        mood?: number;
        bondLevel?: number;
        trustLevel?: number;
      } | undefined;

      if (!animal) {
        emptyData.unavailableReason = 'Selected entity is not an animal';
        return emptyData;
      }

      const position = entity.components.get('position') as unknown as {
        x?: number;
        y?: number;
      } | undefined;

      const temperature = entity.components.get('temperature') as unknown as {
        currentTemp?: number;
        state?: string;
      } | undefined;

      return {
        timestamp: Date.now(),
        available: true,
        animalId: selectedEntityId,
        name: animal.name || null,
        speciesId: animal.speciesId || null,
        lifeStage: animal.lifeStage || null,
        state: animal.state || null,
        age: animal.age || 0,
        isWild: animal.wild ?? true,
        health: animal.health ?? 0,
        hunger: animal.hunger ?? 0,
        thirst: animal.thirst ?? 0,
        energy: animal.energy ?? 0,
        stress: animal.stress ?? 0,
        mood: animal.mood ?? 0,
        bondLevel: animal.bondLevel ?? 0,
        trustLevel: animal.trustLevel ?? 0,
        temperature: temperature?.currentTemp ?? null,
        temperatureState: temperature?.state || null,
        position: position?.x !== undefined && position?.y !== undefined
          ? { x: position.x, y: position.y }
          : null,
      };
    } catch (error) {
      emptyData.unavailableReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      return emptyData;
    }
  },

  textFormatter(data: AnimalInfoViewData): string {
    const lines: string[] = [
      'ANIMAL INFORMATION',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Animal data unavailable');
      lines.push('');
      lines.push('Click on an animal in the game world to view its details.');
      return lines.join('\n');
    }

    // Identity
    lines.push(data.name || 'Unnamed Animal');
    const speciesName = data.speciesId
      ? data.speciesId.charAt(0).toUpperCase() + data.speciesId.slice(1)
      : 'Unknown';
    const lifeStageName = data.lifeStage
      ? data.lifeStage.charAt(0).toUpperCase() + data.lifeStage.slice(1)
      : 'Unknown';
    lines.push(`${speciesName} (${lifeStageName})`);
    lines.push(`Age: ${data.age.toFixed(1)} days`);
    lines.push('');

    // Wild/Tame status
    lines.push('STATUS');
    lines.push('─'.repeat(50));
    if (data.isWild) {
      lines.push('This is a wild animal. It has not been tamed.');
      if (data.trustLevel > 0) {
        lines.push(`However, it is beginning to trust you (${getTrustDescription(data.trustLevel)}).`);
      }
    } else {
      lines.push('This animal has been tamed and is part of your village.');
      lines.push(`Bond: ${getBondDescription(data.bondLevel)} (${data.bondLevel.toFixed(0)}%)`);
      lines.push(`Trust: ${getTrustDescription(data.trustLevel)} (${data.trustLevel.toFixed(0)}%)`);
    }

    // Current behavior
    if (data.state) {
      const stateDesc = data.state.split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      lines.push(`Currently: ${stateDesc}`);
    }
    lines.push('');

    // Health
    lines.push('HEALTH');
    lines.push('─'.repeat(50));
    const healthDesc = data.health >= 70 ? 'healthy' :
      data.health >= 40 ? 'moderate' :
        data.health >= 20 ? 'poor' : 'critical';
    lines.push(`Health: ${healthDesc} (${data.health.toFixed(0)}%)`);
    lines.push(`  ${createProgressBar(data.health, 30)}`);
    lines.push('');

    // Needs
    lines.push('NEEDS');
    lines.push('─'.repeat(50));

    // Hunger (inverted: low = full, high = starving)
    const hungerDesc = data.hunger <= 30 ? 'full' :
      data.hunger <= 60 ? 'peckish' :
        data.hunger <= 80 ? 'hungry' : 'starving';
    lines.push(`Hunger: ${hungerDesc} (${(100 - data.hunger).toFixed(0)}% satiated)`);
    lines.push(`  ${createProgressBar(100 - data.hunger, 30)}`);

    // Thirst (inverted: low = hydrated, high = dehydrated)
    const thirstDesc = data.thirst <= 30 ? 'hydrated' :
      data.thirst <= 60 ? 'thirsty' :
        data.thirst <= 80 ? 'very thirsty' : 'dehydrated';
    lines.push(`Thirst: ${thirstDesc} (${(100 - data.thirst).toFixed(0)}% hydrated)`);
    lines.push(`  ${createProgressBar(100 - data.thirst, 30)}`);

    // Energy
    const energyDesc = data.energy >= 70 ? 'energetic' :
      data.energy >= 40 ? 'rested' :
        data.energy >= 20 ? 'tired' : 'exhausted';
    lines.push(`Energy: ${energyDesc} (${data.energy.toFixed(0)}%)`);
    lines.push(`  ${createProgressBar(data.energy, 30)}`);
    lines.push('');

    // Mood
    lines.push('MOOD');
    lines.push('─'.repeat(50));

    // Stress (inverted for display)
    const stressDesc = data.stress <= 20 ? 'calm' :
      data.stress <= 50 ? 'slightly anxious' :
        data.stress <= 70 ? 'stressed' : 'panicked';
    lines.push(`Stress: ${stressDesc} (${data.stress.toFixed(0)}%)`);

    // Happiness
    const moodDesc = data.mood >= 70 ? 'happy' :
      data.mood >= 40 ? 'content' :
        data.mood >= 20 ? 'unhappy' : 'miserable';
    lines.push(`Mood: ${moodDesc} (${data.mood.toFixed(0)}%)`);
    lines.push(`  ${createProgressBar(data.mood, 30)}`);

    // Temperature
    if (data.temperature !== null) {
      lines.push('');
      lines.push('ENVIRONMENT');
      lines.push('─'.repeat(50));
      lines.push(`Temperature: ${data.temperature.toFixed(1)}°C`);
      if (data.temperatureState) {
        lines.push(`State: ${data.temperatureState}`);
      }
    }

    // Position
    if (data.position) {
      lines.push('');
      lines.push(`Location: (${data.position.x.toFixed(1)}, ${data.position.y.toFixed(1)})`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: AnimalInfoViewData,
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
      ctx.fillText('Click on an animal to inspect', x + padding, currentY);
      return;
    }

    // Name
    ctx.fillStyle = data.isWild ? '#FFA500' : '#00FF00';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.name || 'Unnamed', x + padding, currentY);
    currentY += lineHeight;

    // Species and status
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`${data.speciesId} (${data.isWild ? 'Wild' : 'Tamed'})`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Health bar
    const barWidth = width - padding * 2 - 60;
    const barHeight = 12;

    ctx.fillStyle = theme.colors.text;
    ctx.fillText('Health:', x + padding, currentY);

    ctx.fillStyle = theme.colors.border;
    ctx.fillRect(x + padding + 50, currentY, barWidth, barHeight);

    ctx.fillStyle = getStatusColor(data.health);
    ctx.fillRect(x + padding + 50, currentY, barWidth * (data.health / 100), barHeight);
    currentY += 20;

    // Mood
    ctx.fillStyle = theme.colors.text;
    ctx.fillText('Mood:', x + padding, currentY);

    ctx.fillStyle = theme.colors.border;
    ctx.fillRect(x + padding + 50, currentY, barWidth, barHeight);

    ctx.fillStyle = getStatusColor(data.mood);
    ctx.fillRect(x + padding + 50, currentY, barWidth * (data.mood / 100), barHeight);
    currentY += 20;

    // Bond (for tamed animals)
    if (!data.isWild) {
      ctx.fillStyle = theme.colors.text;
      ctx.fillText('Bond:', x + padding, currentY);

      ctx.fillStyle = theme.colors.border;
      ctx.fillRect(x + padding + 50, currentY, barWidth, barHeight);

      ctx.fillStyle = '#FF69B4';
      ctx.fillRect(x + padding + 50, currentY, barWidth * (data.bondLevel / 100), barHeight);
    }
  },
};
