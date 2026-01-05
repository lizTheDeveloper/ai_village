/**
 * Entity Describer
 *
 * Extracts description context from ECS entities and converts them
 * to EntityDescriptionContext for voice mode transformation.
 */

import type { Entity, World, Component } from '@ai-village/core';
import type { EntityDescriptionContext, EntitySummary } from './types.js';
import { getVoiceTransformer, type VoiceTransformer } from './VoiceModes.js';
import type { VoiceMode } from './types.js';

// ============================================================================
// Component Type Interfaces (for type safety)
// ============================================================================

interface PositionComponent extends Component {
  x: number;
  y: number;
  z?: number;
}

interface IdentityComponent extends Component {
  name: string;
}

interface AgentComponent extends Component {
  behavior?: string;
  recentSpeech?: string;
}

interface BuildingComponent extends Component {
  buildingType: string;
  isComplete: boolean;
  progress?: number;
}

interface ResourceComponent extends Component {
  resourceType: string;
}

interface PlantComponent extends Component {
  speciesId: string;
  stage: string;
}

interface AnimalComponent extends Component {
  species: string;
  state?: string;
}

interface HealthComponent extends Component {
  current: number;
  max: number;
}

interface RenderableComponent extends Component {
  spriteId?: string;
}

// ============================================================================
// Entity Context Extraction
// ============================================================================

/**
 * Extract description context from an ECS entity.
 */
export function extractEntityContext(entity: Entity): EntityDescriptionContext {
  const position = entity.components.get('position') as PositionComponent | undefined;
  const identity = entity.components.get('identity') as IdentityComponent | undefined;
  const agent = entity.components.get('agent') as AgentComponent | undefined;
  const building = entity.components.get('building') as BuildingComponent | undefined;
  const resource = entity.components.get('resource') as ResourceComponent | undefined;
  const plant = entity.components.get('plant') as PlantComponent | undefined;
  const animal = entity.components.get('animal') as AnimalComponent | undefined;
  const health = entity.components.get('health') as HealthComponent | undefined;
  const renderable = entity.components.get('renderable') as RenderableComponent | undefined;

  // Determine entity type
  let entityType = 'other';
  if (agent) entityType = 'agent';
  else if (animal) entityType = 'animal';
  else if (building) entityType = 'building';
  else if (resource) entityType = 'resource';
  else if (plant) entityType = 'plant';

  // Get name with fallbacks
  let name = identity?.name || '';
  if (!name) {
    if (building) name = building.buildingType;
    else if (resource) name = resource.resourceType;
    else if (plant) name = plant.speciesId;
    else if (animal) name = animal.species;
    else name = entityType;
  }

  return {
    entityId: entity.id,
    entityType,
    name,
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    z: position?.z,
    behavior: agent?.behavior,
    recentSpeech: agent?.recentSpeech,
    health: health ? health.current / health.max : undefined,
    buildingType: building?.buildingType,
    isComplete: building?.isComplete,
    progress: building?.progress,
    resourceType: resource?.resourceType,
    species: plant?.speciesId,
    growthStage: plant?.stage,
    animalSpecies: animal?.species,
    animalState: animal?.state,
  };
}

/**
 * Get entity type for categorization.
 */
export function getEntityType(entity: Entity): EntitySummary['type'] {
  if (entity.components.has('agent')) return 'agent';
  if (entity.components.has('animal')) return 'animal';
  if (entity.components.has('building')) return 'building';
  if (entity.components.has('resource')) return 'resource';
  if (entity.components.has('plant')) return 'plant';
  if (entity.components.has('item')) return 'item';
  return 'other';
}

// ============================================================================
// Distance and Direction Calculation
// ============================================================================

/**
 * Calculate distance category between two points.
 */
export function getDistanceCategory(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): EntitySummary['distance'] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Distance thresholds (in tiles/meters)
  if (distance < 2) return 'immediate';
  if (distance < 10) return 'close';
  if (distance < 50) return 'area';
  return 'distant';
}

/**
 * Calculate cardinal direction from one point to another.
 */
export function getCardinalDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string | null {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // If very close, no direction
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;

  // Calculate angle
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Convert to compass direction
  // Note: In game coordinates, positive Y is typically down
  if (angle >= -22.5 && angle < 22.5) return 'east';
  if (angle >= 22.5 && angle < 67.5) return 'southeast';
  if (angle >= 67.5 && angle < 112.5) return 'south';
  if (angle >= 112.5 && angle < 157.5) return 'southwest';
  if (angle >= 157.5 || angle < -157.5) return 'west';
  if (angle >= -157.5 && angle < -112.5) return 'northwest';
  if (angle >= -112.5 && angle < -67.5) return 'north';
  if (angle >= -67.5 && angle < -22.5) return 'northeast';

  return null;
}

// ============================================================================
// Entity Summary Generation
// ============================================================================

/**
 * Generate a summary of an entity for text output.
 */
export function generateEntitySummary(
  entity: Entity,
  cameraX: number,
  cameraY: number,
  voice: VoiceMode
): EntitySummary {
  const ctx = extractEntityContext(entity);
  const transformer = getVoiceTransformer(voice);

  const distance = getDistanceCategory(cameraX, cameraY, ctx.x, ctx.y);
  const direction = getCardinalDirection(cameraX, cameraY, ctx.x, ctx.y);

  // Generate activity description
  const activity = transformer.describeEntity(ctx);

  // Generate additional details based on entity type
  let details: string | null = null;
  if (ctx.health !== undefined && ctx.health < 1) {
    const healthPct = Math.round(ctx.health * 100);
    details = `${healthPct}% health`;
  }

  return {
    id: entity.id,
    type: getEntityType(entity),
    name: ctx.name,
    activity,
    distance,
    direction,
    details,
  };
}

// ============================================================================
// Entity Grouping
// ============================================================================

/**
 * Group entities by type for summarized descriptions.
 */
export function groupEntitiesByType(
  entities: Entity[]
): Map<EntitySummary['type'], Entity[]> {
  const groups = new Map<EntitySummary['type'], Entity[]>();

  for (const entity of entities) {
    const type = getEntityType(entity);
    const group = groups.get(type) || [];
    group.push(entity);
    groups.set(type, group);
  }

  return groups;
}

/**
 * Generate a grouped summary (e.g., "3 berry bushes, 2 trees").
 */
export function generateGroupedSummary(
  entities: Entity[],
  voice: VoiceMode
): string {
  const groups = groupEntitiesByType(entities);
  const transformer = getVoiceTransformer(voice);
  const descriptions: string[] = [];

  for (const [type, group] of groups) {
    if (group.length === 0) continue;

    if (group.length === 1) {
      const ctx = extractEntityContext(group[0]!);
      descriptions.push(transformer.describeEntity(ctx));
    } else {
      // Summarize group
      const typeName = getGroupTypeName(type, group);
      descriptions.push(`${group.length} ${typeName}`);
    }
  }

  return descriptions.join(', ');
}

/**
 * Get a plural name for a group of entities.
 */
function getGroupTypeName(type: EntitySummary['type'], entities: Entity[]): string {
  if (entities.length === 0) return type;

  // Try to get a more specific name from the first entity
  const first = entities[0]!;

  switch (type) {
    case 'agent':
      return 'villagers';
    case 'animal': {
      const animal = first.components.get('animal') as AnimalComponent | undefined;
      if (animal?.species) {
        return `${animal.species}s`;
      }
      return 'animals';
    }
    case 'building': {
      const building = first.components.get('building') as BuildingComponent | undefined;
      if (building?.buildingType) {
        // Check if all same type
        const allSameType = entities.every(e => {
          const b = e.components.get('building') as BuildingComponent | undefined;
          return b?.buildingType === building.buildingType;
        });
        if (allSameType) {
          return `${building.buildingType}s`;
        }
      }
      return 'buildings';
    }
    case 'resource': {
      const resource = first.components.get('resource') as ResourceComponent | undefined;
      if (resource?.resourceType) {
        return `${resource.resourceType} sources`;
      }
      return 'resources';
    }
    case 'plant': {
      const plant = first.components.get('plant') as PlantComponent | undefined;
      if (plant?.speciesId) {
        const name = plant.speciesId.replace(/-/g, ' ');
        return `${name}s`;
      }
      return 'plants';
    }
    case 'item':
      return 'items';
    default:
      return 'things';
  }
}

// ============================================================================
// Dialogue Extraction
// ============================================================================

/**
 * Extract recent speech from agents.
 */
export function extractRecentDialogue(
  agents: Entity[],
  currentTick: number,
  maxAge: number = 100 // ~5 seconds at 20 TPS
): Array<{ speakerId: string; speakerName: string; text: string; tick: number }> {
  const dialogue: Array<{ speakerId: string; speakerName: string; text: string; tick: number }> = [];

  for (const agent of agents) {
    const agentComp = agent.components.get('agent') as AgentComponent | undefined;
    const identity = agent.components.get('identity') as IdentityComponent | undefined;

    if (agentComp?.recentSpeech && identity?.name) {
      // Note: We don't have tick info on speech, so we just include it
      dialogue.push({
        speakerId: agent.id,
        speakerName: identity.name,
        text: agentComp.recentSpeech,
        tick: currentTick, // Approximate
      });
    }
  }

  return dialogue;
}
