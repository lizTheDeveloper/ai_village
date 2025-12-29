/**
 * LiveEntityAPI - Handles live entity queries from the metrics dashboard
 *
 * Provides real-time entity data including:
 * - List of all agents with basic info
 * - Detailed entity state (components, inventory, etc.)
 * - Live LLM prompt generation using StructuredPromptBuilder
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { MetricsStreamClient, QueryRequest, QueryResponse } from './MetricsStreamClient.js';

/**
 * Interface for the prompt builder (from @ai-village/llm)
 */
export interface PromptBuilder {
  buildPrompt(agent: Entity, world: World): string;
}

/**
 * Entity summary for the entities list
 */
export interface EntitySummary {
  id: string;
  name: string;
  type: 'agent' | 'animal' | 'building' | 'plant' | 'resource' | 'other';
  position?: { x: number; y: number };
  behavior?: string;
}

/**
 * Detailed entity data
 */
export interface EntityDetails {
  id: string;
  name?: string;
  components: Record<string, unknown>;
}

/**
 * LiveEntityAPI connects the game's World to the metrics dashboard
 */
export class LiveEntityAPI {
  private world: World;
  private promptBuilder: PromptBuilder | null = null;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Set the prompt builder for generating LLM prompts
   */
  setPromptBuilder(builder: PromptBuilder): void {
    this.promptBuilder = builder;
  }

  /**
   * Attach to a MetricsStreamClient to handle queries
   */
  attach(client: MetricsStreamClient): void {
    client.setQueryHandler(this.handleQuery.bind(this));
  }

  /**
   * Handle incoming queries
   */
  async handleQuery(query: QueryRequest): Promise<QueryResponse> {
    switch (query.queryType) {
      case 'entities':
        return this.handleEntitiesQuery(query);
      case 'entity':
        return this.handleEntityQuery(query);
      case 'entity_prompt':
        return this.handleEntityPromptQuery(query);
      default:
        return {
          requestId: query.requestId,
          success: false,
          error: `Unknown query type: ${query.queryType}`,
        };
    }
  }

  /**
   * Get list of all agents
   */
  private handleEntitiesQuery(query: QueryRequest): QueryResponse {
    const entities: EntitySummary[] = [];

    for (const entity of this.world.entities.values()) {
      const summary = this.getEntitySummary(entity);
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
   * Get detailed entity state
   */
  private handleEntityQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    const entity = this.world.getEntity(query.entityId);
    if (!entity) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity not found: ${query.entityId}`,
      };
    }

    const details = this.getEntityDetails(entity);
    return {
      requestId: query.requestId,
      success: true,
      data: details,
    };
  }

  /**
   * Get live LLM prompt for an entity
   */
  private handleEntityPromptQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    if (!this.promptBuilder) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'PromptBuilder not configured',
      };
    }

    const entity = this.world.getEntity(query.entityId);
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
      const prompt = this.promptBuilder.buildPrompt(entity, this.world);
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
   * Get a summary of an entity
   */
  private getEntitySummary(entity: Entity): EntitySummary {
    const id = entity.id;

    // Get name from identity component
    const identity = entity.components.get('identity') as { name?: string } | undefined;
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
    const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
    const pos = position ? { x: position.x ?? 0, y: position.y ?? 0 } : undefined;

    // Get current behavior
    const agent = entity.components.get('agent') as { currentBehavior?: string } | undefined;
    const behavior = agent?.currentBehavior;

    return { id, name, type, position: pos, behavior };
  }

  /**
   * Get detailed entity data
   */
  private getEntityDetails(entity: Entity): EntityDetails {
    const id = entity.id;
    const identity = entity.components.get('identity') as { name?: string } | undefined;
    const name = identity?.name;

    // Serialize all components
    const components: Record<string, unknown> = {};
    for (const [key, value] of entity.components.entries()) {
      components[key] = this.serializeComponent(value);
    }

    return { id, name, components };
  }

  /**
   * Serialize a component for JSON transport
   */
  private serializeComponent(component: unknown): unknown {
    if (component === null || component === undefined) {
      return component;
    }

    if (typeof component !== 'object') {
      return component;
    }

    // Handle arrays
    if (Array.isArray(component)) {
      return component.map(item => this.serializeComponent(item));
    }

    // Handle Maps
    if (component instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of component.entries()) {
        obj[String(k)] = this.serializeComponent(v);
      }
      return obj;
    }

    // Handle Sets
    if (component instanceof Set) {
      return Array.from(component).map(item => this.serializeComponent(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component as Record<string, unknown>)) {
      // Skip functions
      if (typeof value === 'function') continue;
      result[key] = this.serializeComponent(value);
    }
    return result;
  }
}
