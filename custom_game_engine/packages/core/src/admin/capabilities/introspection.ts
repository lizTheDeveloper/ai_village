/**
 * Introspection Capability - Expose GameIntrospectionAPI via HTTP
 *
 * Provides unified access to entity queries, mutations, snapshots, and observability.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// Type definitions for game client and world
type GameClientWithWorld = {
  world?: {
    __introspectionAPI?: IntrospectionAPI;
    snapshots?: unknown[];
  };
};

type IntrospectionAPI = {
  getEntity(entityId: unknown, options?: unknown): Promise<Record<string, unknown>>;
  queryEntities(query: unknown): Promise<unknown[]>;
  getComponentSchema(type: unknown): Record<string, unknown>;
  listSchemas(options?: unknown): unknown[];
  getSkills(entityId: unknown): Promise<Record<string, unknown>>;
  listBuildings(options?: unknown): Promise<unknown[]>;
  listBlueprints(options?: unknown): unknown[];
  getMutationHistory(options?: unknown): Promise<unknown[]>;
  getCacheStats(): Record<string, unknown>;
  getEconomicMetrics(options?: unknown): Promise<Record<string, unknown>>;
  getEnvironmentalState(bounds?: unknown): Promise<Record<string, unknown>>;
  mutateField(mutation: unknown): Promise<{ success: boolean; error?: string }>;
  mutateBatch(mutations: unknown[]): Promise<{ success: boolean; error?: string }>;
  undo(count: number): Promise<{ success: boolean; error?: string }>;
  redo(count: number): Promise<{ success: boolean; error?: string }>;
  placeBuilding(config: unknown): Promise<{ success: boolean; error?: string }>;
  grantSkillXP(entityId: string, skill: string, amount: number): Promise<{ success: boolean; error?: string }>;
  triggerBehavior(config: unknown): Promise<{ success: boolean; error?: string }>;
  createSnapshot(entityIds: string[], metadata?: unknown): Promise<string>;
  restoreSnapshot(snapshotId: string): Promise<{ success: boolean; error?: string }>;
};

const introspectionCapability = defineCapability({
  id: 'introspection',
  name: 'Introspection',
  description: 'Query and mutate game state via GameIntrospectionAPI',
  category: 'infrastructure',

  tab: {
    icon: '🔍',
    priority: 55,
  },

  queries: [
    defineQuery({
      id: 'get-entity',
      name: 'Get Entity',
      description: 'Get entity with components and schema metadata',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity ID to retrieve' },
        { name: 'components', type: 'string', required: false, description: 'Comma-separated component types (e.g., "agent,needs,position")' },
        { name: 'visibility', type: 'select', required: false, options: [
          { value: 'full', label: 'Full (all fields)' },
          { value: 'llm', label: 'LLM (for prompts)' },
          { value: 'player', label: 'Player (UI visible)' },
        ], description: 'Schema visibility level' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.components) {
          options.components = (params.components as string).split(',').map(c => c.trim());
        }
        if (params.visibility) {
          options.visibility = params.visibility;
        }

        try {
          const result = await introspectionAPI.getEntity(params.entityId, options);
          return result;
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'query-entities',
      name: 'Query Entities',
      description: 'Query entities with filters and pagination',
      params: [
        { name: 'componentFilters', type: 'string', required: false, description: 'Comma-separated component types to filter by' },
        { name: 'boundsJson', type: 'string', required: false, description: 'JSON bounds object: {"x":0,"y":0,"width":100,"height":100}' },
        { name: 'activeOnly', type: 'boolean', required: false, default: false, description: 'Only return active (visible) entities' },
        { name: 'limit', type: 'number', required: false, default: 50, description: 'Maximum results' },
        { name: 'offset', type: 'number', required: false, default: 0, description: 'Results offset (pagination)' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const query: Record<string, unknown> = {};
        if (params.componentFilters) {
          query.componentFilters = (params.componentFilters as string).split(',').map(c => c.trim());
        }
        if (params.boundsJson) {
          try {
            query.bounds = JSON.parse(params.boundsJson as string);
          } catch (err) {
            return { error: 'Invalid JSON in boundsJson parameter' };
          }
        }
        if (params.activeOnly) {
          query.activeOnly = true;
        }
        if (params.limit) {
          query.limit = params.limit;
        }
        if (params.offset) {
          query.offset = params.offset;
        }

        try {
          const results = await introspectionAPI.queryEntities(query);
          return { count: results.length, entities: results };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-schema',
      name: 'Get Component Schema',
      description: 'Get schema definition for a component type',
      params: [
        { name: 'type', type: 'string', required: true, description: 'Component type (e.g., "agent", "needs", "position")' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const schema = introspectionAPI.getComponentSchema(params.type);
          return schema;
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'list-schemas',
      name: 'List Component Schemas',
      description: 'List all registered component schemas with filtering',
      params: [
        { name: 'category', type: 'string', required: false, description: 'Filter by category (e.g., "cognitive", "physical", "social")' },
        { name: 'mutable', type: 'boolean', required: false, description: 'Filter by mutability (true = mutable only)' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.category) {
          options.category = params.category;
        }
        if (params.mutable !== undefined) {
          options.mutable = params.mutable;
        }

        try {
          const schemas = introspectionAPI.listSchemas(options);
          return { count: schemas.length, schemas };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-skills',
      name: 'Get Entity Skills',
      description: 'Get all skills and levels for an entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const skills = await introspectionAPI.getSkills(params.entityId);
          return { entityId: params.entityId, skills };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'list-buildings',
      name: 'List Buildings',
      description: 'List buildings with optional filters',
      params: [
        { name: 'owner', type: 'entity-id', required: false, entityType: 'agent', description: 'Filter by owner entity ID' },
        { name: 'category', type: 'string', required: false, description: 'Filter by building category' },
        { name: 'boundsJson', type: 'string', required: false, description: 'JSON bounds: {"x":0,"y":0,"width":100,"height":100}' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.owner) {
          options.owner = params.owner;
        }
        if (params.category) {
          options.category = params.category;
        }
        if (params.boundsJson) {
          try {
            options.bounds = JSON.parse(params.boundsJson as string);
          } catch (err) {
            return { error: 'Invalid JSON in boundsJson parameter' };
          }
        }

        try {
          const buildings = await introspectionAPI.listBuildings(options);
          return { count: buildings.length, buildings };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'list-blueprints',
      name: 'List Building Blueprints',
      description: 'Get available building blueprints',
      params: [
        { name: 'category', type: 'string', required: false, description: 'Filter by category' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.category) {
          options.category = params.category;
        }

        try {
          const blueprints = introspectionAPI.listBlueprints(options);
          return { count: blueprints.length, blueprints };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-mutation-history',
      name: 'Get Mutation History',
      description: 'Get mutation history for entity or component',
      params: [
        { name: 'entityId', type: 'entity-id', required: false, description: 'Filter by entity ID' },
        { name: 'componentType', type: 'string', required: false, description: 'Filter by component type' },
        { name: 'limit', type: 'number', required: false, default: 100, description: 'Max results' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.entityId) {
          options.entityId = params.entityId;
        }
        if (params.componentType) {
          options.componentType = params.componentType;
        }
        if (params.limit) {
          options.limit = params.limit;
        }

        try {
          const history = await introspectionAPI.getMutationHistory(options);
          return { count: history.length, mutations: history };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'list-snapshots',
      name: 'List Snapshots',
      description: 'List all saved snapshots',
      params: [],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          // Access snapshots from persistence system
          const snapshots = (world as any).snapshots || [];
          return { count: snapshots.length, snapshots };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-snapshot-count',
      name: 'Get Snapshot Count',
      description: 'Get total number of snapshots',
      params: [],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const snapshots = (world as any).snapshots || [];
        return { count: snapshots.length };
      },
    }),

    defineQuery({
      id: 'get-cache-stats',
      name: 'Get Cache Statistics',
      description: 'Get introspection cache statistics',
      params: [],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const stats = introspectionAPI.getCacheStats();
          return stats;
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-economic-metrics',
      name: 'Get Economic Metrics',
      description: 'Get resource prices and trade history',
      params: [
        { name: 'resources', type: 'string', required: false, description: 'Comma-separated resource IDs' },
        { name: 'timeRangeJson', type: 'string', required: false, description: 'JSON time range: {"start":0,"end":1000}' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        const options: Record<string, unknown> = {};
        if (params.resources) {
          options.resources = (params.resources as string).split(',').map(r => r.trim());
        }
        if (params.timeRangeJson) {
          try {
            options.timeRange = JSON.parse(params.timeRangeJson as string);
          } catch (err) {
            return { error: 'Invalid JSON in timeRangeJson parameter' };
          }
        }

        try {
          const metrics = await introspectionAPI.getEconomicMetrics(options);
          return metrics;
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineQuery({
      id: 'get-environmental-state',
      name: 'Get Environmental State',
      description: 'Get weather and environmental state',
      params: [
        { name: 'boundsJson', type: 'string', required: false, description: 'JSON bounds for regional data: {"x":0,"y":0,"width":100,"height":100}' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { error: 'GameIntrospectionAPI not available on world instance' };
        }

        let bounds = undefined;
        if (params.boundsJson) {
          try {
            bounds = JSON.parse(params.boundsJson as string);
          } catch (err) {
            return { error: 'Invalid JSON in boundsJson parameter' };
          }
        }

        try {
          const state = await introspectionAPI.getEnvironmentalState(bounds);
          return state;
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'mutate-field',
      name: 'Mutate Component Field',
      description: 'Mutate a component field with validation and tracking',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity ID' },
        { name: 'componentType', type: 'string', required: true, description: 'Component type (e.g., "needs")' },
        { name: 'field', type: 'string', required: true, description: 'Field name (e.g., "hunger")' },
        { name: 'valueJson', type: 'string', required: true, description: 'JSON value to set (e.g., "0.5", "true", \'{"x":10,"y":20}\')' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for mutation (for audit log)' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        let value: any;
        try {
          value = JSON.parse(params.valueJson as string);
        } catch (err) {
          return { success: false, error: 'Invalid JSON in valueJson parameter' };
        }

        try {
          const result = await introspectionAPI.mutateField({
            entityId: params.entityId,
            componentType: params.componentType,
            field: params.field,
            value,
            reason: params.reason as string | undefined,
            source: 'admin',
          });
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'mutate-batch',
      name: 'Batch Mutations',
      description: 'Apply multiple mutations atomically',
      params: [
        { name: 'mutationsJson', type: 'string', required: true, description: 'JSON array of mutations: [{"entityId":"...","componentType":"needs","field":"hunger","value":0.5}]' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        let mutations: unknown[];
        try {
          mutations = JSON.parse(params.mutationsJson as string);
          if (!Array.isArray(mutations)) {
            return { success: false, error: 'mutationsJson must be an array' };
          }
        } catch (err) {
          return { success: false, error: 'Invalid JSON in mutationsJson parameter' };
        }

        try {
          const result = await introspectionAPI.mutateBatch(mutations);
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'undo',
      name: 'Undo Mutations',
      description: 'Undo last N mutations',
      params: [
        { name: 'count', type: 'number', required: false, default: 1, description: 'Number of mutations to undo' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const result = await introspectionAPI.undo(params.count as number || 1);
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'redo',
      name: 'Redo Mutations',
      description: 'Redo last N undone mutations',
      params: [
        { name: 'count', type: 'number', required: false, default: 1, description: 'Number of mutations to redo' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const result = await introspectionAPI.redo(params.count as number || 1);
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'place-building',
      name: 'Place Building',
      description: 'Place a building with collision detection',
      params: [
        { name: 'blueprintId', type: 'string', required: true, description: 'Blueprint ID to place' },
        { name: 'positionJson', type: 'string', required: true, description: 'Position JSON: {"x":10,"y":20}' },
        { name: 'owner', type: 'entity-id', required: false, entityType: 'agent', description: 'Owner entity ID' },
        { name: 'checkCollisions', type: 'boolean', required: false, default: true, description: 'Check for collisions' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        let position: any;
        try {
          position = JSON.parse(params.positionJson as string);
        } catch (err) {
          return { success: false, error: 'Invalid JSON in positionJson parameter' };
        }

        try {
          const result = await introspectionAPI.placeBuilding({
            blueprintId: params.blueprintId as string,
            position,
            owner: params.owner as string | undefined,
            checkCollisions: params.checkCollisions !== false,
          });
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'grant-skill-xp',
      name: 'Grant Skill XP',
      description: 'Grant skill XP to an entity (100 XP = 1 level)',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity ID' },
        { name: 'skill', type: 'string', required: true, description: 'Skill name (e.g., "farming", "combat")' },
        { name: 'amount', type: 'number', required: true, description: 'XP amount (100 = 1 level)' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const result = await introspectionAPI.grantSkillXP(
            params.entityId as string,
            params.skill as string,
            params.amount as number
          );
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'trigger-behavior',
      name: 'Trigger Behavior',
      description: 'Force an entity to perform a specific behavior',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity ID' },
        { name: 'behavior', type: 'string', required: true, description: 'Behavior to trigger' },
        { name: 'paramsJson', type: 'string', required: false, description: 'JSON params: {"targetId":"..."}' },
        { name: 'validate', type: 'boolean', required: false, default: true, description: 'Validate behavior params' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        let behaviorParams = undefined;
        if (params.paramsJson) {
          try {
            behaviorParams = JSON.parse(params.paramsJson as string);
          } catch (err) {
            return { success: false, error: 'Invalid JSON in paramsJson parameter' };
          }
        }

        try {
          const result = await introspectionAPI.triggerBehavior({
            entityId: params.entityId as string,
            behavior: params.behavior as string,
            params: behaviorParams,
            validate: params.validate !== false,
          });
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'create-snapshot',
      name: 'Create Snapshot',
      description: 'Create snapshot of entity state for rollback',
      params: [
        { name: 'entityIdsJson', type: 'string', required: true, description: 'JSON array of entity IDs: ["id1","id2"]' },
        { name: 'metadataJson', type: 'string', required: false, description: 'JSON metadata: {"reason":"Before experiment"}' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        let entityIds: string[];
        try {
          entityIds = JSON.parse(params.entityIdsJson as string);
          if (!Array.isArray(entityIds)) {
            return { success: false, error: 'entityIdsJson must be an array' };
          }
        } catch (err) {
          return { success: false, error: 'Invalid JSON in entityIdsJson parameter' };
        }

        let metadata = undefined;
        if (params.metadataJson) {
          try {
            metadata = JSON.parse(params.metadataJson as string);
          } catch (err) {
            return { success: false, error: 'Invalid JSON in metadataJson parameter' };
          }
        }

        try {
          const snapshotId = await introspectionAPI.createSnapshot(entityIds, metadata);
          return { success: true, snapshotId };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'restore-snapshot',
      name: 'Restore Snapshot',
      description: 'Restore entities from snapshot',
      params: [
        { name: 'snapshotId', type: 'string', required: true, description: 'Snapshot ID to restore' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        const introspectionAPI = world.__introspectionAPI;
        if (!introspectionAPI) {
          return { success: false, error: 'GameIntrospectionAPI not available on world instance' };
        }

        try {
          const result = await introspectionAPI.restoreSnapshot(params.snapshotId as string);
          return result;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      },
    }),

    defineAction({
      id: 'delete-snapshot',
      name: 'Delete Snapshot',
      description: 'Delete a snapshot',
      params: [
        { name: 'snapshotId', type: 'string', required: true, description: 'Snapshot ID to delete' },
      ],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        type Snapshot = { id: string };
        const snapshots = world.snapshots || [];
        const index = snapshots.findIndex((s) => typeof s === 'object' && s !== null && 'id' in s && (s as Snapshot).id === params.snapshotId);

        if (index === -1) {
          return { success: false, error: `Snapshot not found: ${params.snapshotId}` };
        }

        snapshots.splice(index, 1);
        return { success: true, snapshotId: params.snapshotId };
      },
    }),

    defineAction({
      id: 'clear-snapshots',
      name: 'Clear All Snapshots',
      description: 'Delete all snapshots (dangerous!)',
      dangerous: true,
      requiresConfirmation: true,
      params: [],
      handler: async (params, gameClient, context) => {
        const world = (gameClient as GameClientWithWorld)?.world;
        if (!world) {
          return { success: false, error: 'No active game world' };
        }
        type MutableWorld = { snapshots?: unknown[] };
        const snapshots = world.snapshots || [];
        const count = snapshots.length;
        (world as MutableWorld).snapshots = [];

        return { success: true, deletedCount: count };
      },
    }),
  ],
});

capabilityRegistry.register(introspectionCapability);
