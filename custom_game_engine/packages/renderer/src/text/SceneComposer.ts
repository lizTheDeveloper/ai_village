/**
 * Scene Composer
 *
 * Composes complete scene descriptions from entity summaries,
 * terrain, ambience, and events.
 */

import type { World, Entity } from '@ai-village/core';
import type {
  TextFrame,
  VoiceMode,
  EntitySummary,
  DialogueLine,
  NavigationHints,
  SceneContext,
  DetailLevel,
} from './types.js';
import { getVoiceTransformer } from './VoiceModes.js';
import {
  generateEntitySummary,
  getDistanceCategory,
  getCardinalDirection,
  extractRecentDialogue,
  groupEntitiesByType,
} from './EntityDescriber.js';

// ============================================================================
// Scene Composer Class
// ============================================================================

export class SceneComposer {
  private voice: VoiceMode;
  private detailLevel: DetailLevel;
  private maxLength: number;

  constructor(
    voice: VoiceMode = 'live',
    detailLevel: DetailLevel = 'standard',
    maxLength: number = 500
  ) {
    this.voice = voice;
    this.detailLevel = detailLevel;
    this.maxLength = maxLength;
  }

  setVoice(voice: VoiceMode): void {
    this.voice = voice;
  }

  setDetailLevel(level: DetailLevel): void {
    this.detailLevel = level;
  }

  // ==========================================================================
  // Main Composition Method
  // ==========================================================================

  /**
   * Compose a complete scene description.
   */
  composeScene(context: SceneContext): TextFrame {
    const transformer = getVoiceTransformer(this.voice);
    const frameId = `frame_${context.tick}_${Date.now()}`;

    // Generate opening/location
    const locationDesc = this.composeLocation(context, transformer);

    // Generate entity descriptions
    const entitySummaries = this.composeEntities(context);

    // Generate scene prose
    const scene = this.composeSceneProse(context, locationDesc, entitySummaries, transformer);

    // Generate actions list
    const actions = this.composeActions(context.recentEvents, transformer);

    // Get dialogue
    const dialogue = context.activeDialogues;

    // Generate ambience
    const ambience = transformer.describeAmbience(
      context.weather,
      context.timeOfDay,
      context.season
    ) || null;

    // Generate navigation (if applicable)
    const navigation = this.composeNavigation(context);

    return {
      frameId,
      tick: context.tick,
      timestamp: Date.now(),
      scene,
      actions,
      dialogue,
      ambience,
      navigation,
      entities: entitySummaries,
      voice: this.voice,
    };
  }

  // ==========================================================================
  // Location Composition
  // ==========================================================================

  private composeLocation(context: SceneContext, transformer: ReturnType<typeof getVoiceTransformer>): string {
    // Build location name from terrain or default
    let location = 'the village';

    if (context.terrain) {
      // Extract key features from terrain description
      const terrainLower = context.terrain.toLowerCase();
      if (terrainLower.includes('cliff')) location = 'near the cliffs';
      else if (terrainLower.includes('peak')) location = 'in the mountains';
      else if (terrainLower.includes('lake')) location = 'by the lake';
      else if (terrainLower.includes('river')) location = 'along the river';
      else if (terrainLower.includes('forest')) location = 'in the forest';
      else if (terrainLower.includes('valley')) location = 'in the valley';
      else if (terrainLower.includes('plain')) location = 'on the plains';
    }

    // Build time description
    let timeDesc: string | undefined;
    if (context.timeOfDay !== undefined) {
      const dayNumber = Math.floor(context.tick / (20 * 60 * 24)) + 1; // Approximate day
      timeDesc = `Day ${dayNumber}`;
    }

    return transformer.openScene(location, timeDesc);
  }

  // ==========================================================================
  // Entity Composition
  // ==========================================================================

  private composeEntities(context: SceneContext): EntitySummary[] {
    const { cameraX, cameraY, entities } = context;
    const summaries: EntitySummary[] = [];

    // Sort entities by distance using squared distance (avoids sqrt, preserves order)
    const sortedEntities = [...entities].sort((a, b) => {
      const distASquared = (a.x - cameraX) ** 2 + (a.y - cameraY) ** 2;
      const distBSquared = (b.x - cameraX) ** 2 + (b.y - cameraY) ** 2;
      return distASquared - distBSquared;
    });

    // Limit based on detail level
    const maxEntities = this.detailLevel === 'verbose' ? 15 :
                        this.detailLevel === 'standard' ? 10 : 5;

    for (const entityCtx of sortedEntities.slice(0, maxEntities)) {
      const distance = getDistanceCategory(cameraX, cameraY, entityCtx.x, entityCtx.y);
      const direction = getCardinalDirection(cameraX, cameraY, entityCtx.x, entityCtx.y);

      const transformer = getVoiceTransformer(this.voice);
      const activity = transformer.describeEntity(entityCtx);

      // Map entity type
      let type: EntitySummary['type'] = 'other';
      switch (entityCtx.entityType) {
        case 'agent': type = 'agent'; break;
        case 'animal': type = 'animal'; break;
        case 'building': type = 'building'; break;
        case 'resource': type = 'resource'; break;
        case 'plant': type = 'plant'; break;
      }

      // Generate details
      let details: string | null = null;
      if (entityCtx.health !== undefined && entityCtx.health < 1) {
        details = `${Math.round(entityCtx.health * 100)}% health`;
      }

      summaries.push({
        id: entityCtx.entityId,
        type,
        name: entityCtx.name,
        activity,
        distance,
        direction,
        details,
      });
    }

    return summaries;
  }

  // ==========================================================================
  // Scene Prose Composition
  // ==========================================================================

  private composeSceneProse(
    context: SceneContext,
    locationDesc: string,
    entities: EntitySummary[],
    transformer: ReturnType<typeof getVoiceTransformer>
  ): string {
    const parts: string[] = [];

    // Add location opening
    parts.push(locationDesc);

    // Add terrain description
    if (context.terrain) {
      const terrainDesc = transformer.describeTerrain(context.terrain);
      if (terrainDesc) {
        parts.push(terrainDesc);
      }
    }

    // Group entities by distance for narrative flow
    const immediate = entities.filter(e => e.distance === 'immediate');
    const close = entities.filter(e => e.distance === 'close');
    const area = entities.filter(e => e.distance === 'area');
    const distant = entities.filter(e => e.distance === 'distant');

    // Describe immediate entities in detail
    if (immediate.length > 0) {
      const immediateDesc = this.describeEntityGroup(immediate, transformer, 'immediate');
      parts.push(immediateDesc);
    }

    // Describe close entities
    if (close.length > 0) {
      const closeDesc = this.describeEntityGroup(close, transformer, 'close');
      parts.push(closeDesc);
    }

    // Summarize area entities
    if (area.length > 0) {
      const areaDesc = this.describeEntityGroup(area, transformer, 'area');
      parts.push(areaDesc);
    }

    // Briefly mention distant entities
    if (distant.length > 0) {
      const distantDesc = this.describeEntityGroup(distant, transformer, 'distant');
      parts.push(distantDesc);
    }

    // Combine and truncate if needed
    let combined = parts.join(' ');
    if (combined.length > this.maxLength) {
      combined = combined.substring(0, this.maxLength - 3) + '...';
    }

    return combined;
  }

  private describeEntityGroup(
    entities: EntitySummary[],
    transformer: ReturnType<typeof getVoiceTransformer>,
    distance: EntitySummary['distance']
  ): string {
    if (entities.length === 0) return '';

    const locationDesc = transformer.describeLocation(null, distance);

    if (entities.length === 1) {
      const entity = entities[0]!;
      const directionDesc = entity.direction
        ? `to the ${entity.direction}`
        : locationDesc;
      return `${entity.activity} ${directionDesc}.`;
    }

    // Group by type for summarization
    const byType = new Map<EntitySummary['type'], EntitySummary[]>();
    for (const entity of entities) {
      const group = byType.get(entity.type) || [];
      group.push(entity);
      byType.set(entity.type, group);
    }

    const descriptions: string[] = [];
    for (const [type, group] of byType) {
      if (group.length === 1) {
        descriptions.push(group[0]!.activity);
      } else {
        // Summarize multiple of same type
        const typeName = this.getPluralTypeName(type);
        descriptions.push(`${group.length} ${typeName}`);
      }
    }

    return `${descriptions.join(', ')} ${locationDesc}.`;
  }

  private getPluralTypeName(type: EntitySummary['type']): string {
    switch (type) {
      case 'agent': return 'villagers';
      case 'animal': return 'animals';
      case 'building': return 'buildings';
      case 'resource': return 'resources';
      case 'plant': return 'plants';
      case 'item': return 'items';
      default: return 'things';
    }
  }

  // ==========================================================================
  // Actions Composition
  // ==========================================================================

  private composeActions(
    events: string[],
    transformer: ReturnType<typeof getVoiceTransformer>
  ): string[] {
    // Events are already formatted, just return them
    // In the future, we could transform them through the voice mode
    return events.slice(0, 5);
  }

  // ==========================================================================
  // Navigation Composition
  // ==========================================================================

  private composeNavigation(context: SceneContext): NavigationHints | null {
    // For now, just indicate if there are entities in each direction
    const { cameraX, cameraY, entities } = context;

    const hints: NavigationHints = {
      north: null,
      south: null,
      east: null,
      west: null,
      up: null,
      down: null,
    };

    // Find notable things in each direction
    for (const entity of entities) {
      const direction = getCardinalDirection(cameraX, cameraY, entity.x, entity.y);
      if (direction) {
        // Map cardinal directions to hint keys
        switch (direction) {
          case 'north':
          case 'northeast':
          case 'northwest':
            if (hints.north === null) hints.north = entity.name;
            break;
          case 'south':
          case 'southeast':
          case 'southwest':
            if (hints.south === null) hints.south = entity.name;
            break;
          case 'east':
            if (hints.east === null) hints.east = entity.name;
            break;
          case 'west':
            if (hints.west === null) hints.west = entity.name;
            break;
        }
      }
    }

    // Only return if we have any navigation info
    const hasAny = hints.north !== null || hints.south !== null ||
                   hints.east !== null || hints.west !== null ||
                   hints.up !== null || hints.down !== null;
    if (!hasAny) return null;

    return hints;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a scene composer with default settings.
 */
export function createSceneComposer(
  voice: VoiceMode = 'live',
  detailLevel: DetailLevel = 'standard'
): SceneComposer {
  return new SceneComposer(voice, detailLevel);
}

// ============================================================================
// Text Adventure Mode Formatter
// ============================================================================

/**
 * Format a TextFrame as a text adventure display.
 */
export function formatAsTextAdventure(frame: TextFrame): string {
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(60));
  lines.push('                    AI VILLAGE - TEXT MODE');
  lines.push('═'.repeat(60));
  lines.push('');

  // Ambience header
  if (frame.ambience) {
    lines.push(frame.ambience);
    lines.push('');
  }

  // Scene description
  lines.push(frame.scene);
  lines.push('');

  // Dialogue
  if (frame.dialogue.length > 0) {
    lines.push('DIALOGUE:');
    for (const line of frame.dialogue) {
      lines.push(`  ${line.speakerName}: "${line.text}"`);
    }
    lines.push('');
  }

  // Nearby entities by distance
  const immediate = frame.entities.filter(e => e.distance === 'immediate');
  const close = frame.entities.filter(e => e.distance === 'close');

  if (immediate.length > 0 || close.length > 0) {
    lines.push('NEARBY:');
    for (const entity of immediate) {
      const dir = entity.direction ? ` (${entity.direction})` : '';
      lines.push(`  * ${entity.activity}${dir}`);
    }
    for (const entity of close) {
      const dir = entity.direction ? ` to the ${entity.direction}` : '';
      lines.push(`  - ${entity.activity}${dir}`);
    }
    lines.push('');
  }

  // Navigation
  if (frame.navigation) {
    lines.push('EXITS:');
    const { north, south, east, west } = frame.navigation;
    if (north) lines.push(`  NORTH: ${north}`);
    if (south) lines.push(`  SOUTH: ${south}`);
    if (east) lines.push(`  EAST: ${east}`);
    if (west) lines.push(`  WEST: ${west}`);
    lines.push('');
  }

  // Recent actions
  if (frame.actions.length > 0) {
    lines.push('RECENT EVENTS:');
    for (const action of frame.actions) {
      lines.push(`  - ${action}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

/**
 * Format a TextFrame as a compact one-liner for screen readers.
 */
export function formatAsScreenReader(frame: TextFrame): string {
  const parts: string[] = [];

  // Scene (truncated)
  parts.push(frame.scene.substring(0, 200));

  // Immediate dialogue
  if (frame.dialogue.length > 0) {
    const recent = frame.dialogue[frame.dialogue.length - 1]!;
    parts.push(`${recent.speakerName} says: ${recent.text}`);
  }

  return parts.join(' ');
}
