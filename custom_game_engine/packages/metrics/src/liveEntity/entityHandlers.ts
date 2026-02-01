/**
 * Entity Query Handlers for LiveEntityAPI
 *
 * Handles entity-related queries including:
 * - Entity list (agents)
 * - Entity details
 * - Entity prompts (LLM)
 * - Plants query
 * - Terrain query
 */

import type { World, Entity } from '@ai-village/core';
import type {
  QueryRequest,
  QueryResponse,
  EntitySummary,
  EntityDetails,
  PromptBuilder,
} from './types.js';
import {
  isIdentityComponent,
  isPositionComponent,
  isAgentComponent,
  isPlantComponent,
  isRenderableComponent,
  hasTerrain,
} from './types.js';

/**
 * Context required for entity handlers
 */
export interface EntityHandlerContext {
  world: World;
  promptBuilder: PromptBuilder | null;
  talkerPromptBuilder: PromptBuilder | null;
  executorPromptBuilder: PromptBuilder | null;
}

/**
 * Get list of all agents
 */
export function handleEntitiesQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  const entities: EntitySummary[] = [];

  for (const entity of ctx.world.entities.values()) {
    const summary = getEntitySummary(entity);
    if (summary.type === 'agent') {
      entities.push(summary);
    }
  }

  return {
    requestId: query.requestId,
    success: true,
    data: { entities },
  };
}

/**
 * Get list of all plants with their visual metadata for 3D rendering
 */
export function handlePlantsQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  const plants: Array<{
    id: string;
    plantType: string;
    stage: string;
    position: { x: number; y: number };
    spriteId: string;
    sizeMultiplier: number;
    alpha: number;
  }> = [];

  for (const entity of ctx.world.entities.values()) {
    if (!entity.components.has('plant')) continue;

    const plantComp = entity.components.get('plant');
    const plant = plantComp && isPlantComponent(plantComp) ? plantComp : undefined;

    const positionComp = entity.components.get('position');
    const position = positionComp && isPositionComponent(positionComp) ? positionComp : undefined;

    const renderableComp = entity.components.get('renderable');
    const renderable = renderableComp && isRenderableComponent(renderableComp) ? renderableComp : undefined;

    // Skip plants without position or renderable
    if (!position || !renderable) continue;

    plants.push({
      id: entity.id,
      plantType: plant?.plantType || 'unknown',
      stage: plant?.stage || 'mature',
      position: {
        x: position.x ?? 0,
        y: position.y ?? 0,
      },
      spriteId: renderable.spriteId || 'plant_default',
      sizeMultiplier: renderable.sizeMultiplier ?? 1.0,
      alpha: renderable.alpha ?? 1.0,
    });
  }

  return {
    requestId: query.requestId,
    success: true,
    data: { plants, count: plants.length },
  };
}

/**
 * Get detailed entity state
 */
export function handleEntityQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  if (!query.entityId) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'entityId is required',
    };
  }

  const entity = ctx.world.getEntity(query.entityId);
  if (!entity) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity not found: ${query.entityId}`,
    };
  }

  const details = getEntityDetails(entity);
  return {
    requestId: query.requestId,
    success: true,
    data: details,
  };
}

/**
 * Get live LLM prompt for an entity
 */
export function handleEntityPromptQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  if (!query.entityId) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'entityId is required',
    };
  }

  if (!ctx.promptBuilder) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'PromptBuilder not configured',
    };
  }

  const entity = ctx.world.getEntity(query.entityId);
  if (!entity) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity not found: ${query.entityId}`,
    };
  }

  // Check if this is an agent
  if (!entity.components.has('agent')) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity ${query.entityId} is not an agent`,
    };
  }

  try {
    const prompt = ctx.promptBuilder.buildPrompt(entity, ctx.world);
    return {
      requestId: query.requestId,
      success: true,
      data: { prompt },
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to build prompt',
    };
  }
}

/**
 * Handle Talker prompt query (Layer 2: conversation, goals, social)
 */
export function handleTalkerPromptQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  if (!query.entityId) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'entityId is required',
    };
  }

  if (!ctx.talkerPromptBuilder) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'TalkerPromptBuilder not configured',
    };
  }

  const entity = ctx.world.getEntity(query.entityId);
  if (!entity) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity not found: ${query.entityId}`,
    };
  }

  // Check if this is an agent
  if (!entity.components.has('agent')) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity ${query.entityId} is not an agent`,
    };
  }

  try {
    const prompt = ctx.talkerPromptBuilder.buildPrompt(entity, ctx.world);
    return {
      requestId: query.requestId,
      success: true,
      data: { prompt, layer: 'talker' },
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to build Talker prompt',
    };
  }
}

/**
 * Handle Executor prompt query (Layer 3: strategic planning, tasks)
 */
export function handleExecutorPromptQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  if (!query.entityId) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'entityId is required',
    };
  }

  if (!ctx.executorPromptBuilder) {
    return {
      requestId: query.requestId,
      success: false,
      error: 'ExecutorPromptBuilder not configured',
    };
  }

  const entity = ctx.world.getEntity(query.entityId);
  if (!entity) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity not found: ${query.entityId}`,
    };
  }

  // Check if this is an agent
  if (!entity.components.has('agent')) {
    return {
      requestId: query.requestId,
      success: false,
      error: `Entity ${query.entityId} is not an agent`,
    };
  }

  try {
    const prompt = ctx.executorPromptBuilder.buildPrompt(entity, ctx.world);
    return {
      requestId: query.requestId,
      success: true,
      data: { prompt, layer: 'executor' },
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to build Executor prompt',
    };
  }
}

/**
 * Get terrain data for 3D visualization
 * Returns tile data for a rectangular area around given coordinates
 */
export function handleTerrainQuery(
  ctx: EntityHandlerContext,
  query: QueryRequest
): QueryResponse {
  try {
    // Parse query params - default to getting terrain around entity positions
    const params = query.entityId ? JSON.parse(query.entityId) : {};
    const centerX = typeof params.x === 'number' ? params.x : 0;
    const centerY = typeof params.y === 'number' ? params.y : 0;
    const radius = typeof params.radius === 'number' ? Math.min(params.radius, 100) : 50;

    // Access chunk manager via world
    if (!hasTerrain(ctx.world)) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'World does not support tile access',
      };
    }

    if (!ctx.world.getTileAt) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'World does not support tile access',
      };
    }

    // Collect terrain data for the area
    const tiles: Array<{
      x: number;
      y: number;
      terrain: string;
      elevation: number;
      biome?: string;
      wall?: { material: string };
    }> = [];

    const minX = Math.floor(centerX - radius);
    const maxX = Math.ceil(centerX + radius);
    const minY = Math.floor(centerY - radius);
    const maxY = Math.ceil(centerY + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const tile = ctx.world.getTileAt(x, y);

        if (tile) {
          tiles.push({
            x,
            y,
            terrain: tile.terrain || 'grass',
            elevation: tile.elevation || 0,
            biome: tile.biome,
            wall: tile.wall ? { material: tile.wall.material || 'stone' } : undefined,
          });
        }
      }
    }

    return {
      requestId: query.requestId,
      success: true,
      data: {
        centerX,
        centerY,
        radius,
        tileCount: tiles.length,
        tiles,
      },
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to query terrain',
    };
  }
}

/**
 * Get a summary of an entity
 */
export function getEntitySummary(entity: Entity): EntitySummary {
  const id = entity.id;

  // Get name from identity component
  const identityComp = entity.components.get('identity');
  const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
  const name = identity?.name || id;

  // Determine type
  let type: EntitySummary['type'] = 'other';
  if (entity.components.has('agent')) {
    type = 'agent';
  } else if (entity.components.has('animal')) {
    type = 'animal';
  } else if (entity.components.has('building')) {
    type = 'building';
  } else if (entity.components.has('plant')) {
    type = 'plant';
  } else if (entity.components.has('resource')) {
    type = 'resource';
  }

  // Get position
  const positionComp = entity.components.get('position');
  const position = positionComp && isPositionComponent(positionComp) ? positionComp : undefined;
  const pos = position ? { x: position.x ?? 0, y: position.y ?? 0 } : undefined;

  // Get current behavior
  const agentComp = entity.components.get('agent');
  const agent = agentComp && isAgentComponent(agentComp) ? agentComp : undefined;
  const behavior = agent?.currentBehavior;

  return { id, name, type, position: pos, behavior };
}

/**
 * Get detailed entity data
 */
export function getEntityDetails(entity: Entity): EntityDetails {
  const id = entity.id;
  const identityComp = entity.components.get('identity');
  const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
  const name = identity?.name;

  // Serialize all components
  const components: Record<string, unknown> = {};
  for (const [key, value] of entity.components.entries()) {
    components[key] = serializeComponent(value);
  }

  return { id, name, components };
}

/**
 * Serialize a component for JSON transport
 */
export function serializeComponent(component: unknown): unknown {
  if (component === null || component === undefined) {
    return component;
  }

  if (typeof component !== 'object') {
    return component;
  }

  // Handle arrays
  if (Array.isArray(component)) {
    return component.map(item => serializeComponent(item));
  }

  // Handle Maps
  if (component instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of component.entries()) {
      obj[String(k)] = serializeComponent(v);
    }
    return obj;
  }

  // Handle Sets
  if (component instanceof Set) {
    return Array.from(component).map(item => serializeComponent(item));
  }

  // Handle plain objects
  const result: Record<string, unknown> = {};
  if (typeof component === 'object' && component !== null) {
    for (const [key, value] of Object.entries(component)) {
      // Skip functions
      if (typeof value === 'function') continue;
      result[key] = serializeComponent(value);
    }
  }
  return result;
}
