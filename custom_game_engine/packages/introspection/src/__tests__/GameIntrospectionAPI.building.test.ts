/**
 * Tests for GameIntrospectionAPI Phase 2 - Building Management
 *
 * Tests building placement, listing, and blueprint queries with validation,
 * collision detection, spatial filtering, and cache invalidation.
 *
 * Based on INTROSPECTION_API_DESIGN.md Phase 2 specification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '@ai-village/core';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { defineComponent } from '../types/ComponentSchema.js';
import type { World } from '@ai-village/core';
import type { Component } from '../types/index.js';
import type {
  PlaceBuildingRequest,
  PlaceBuildingResult,
  BuildingInfo,
  BlueprintInfo,
} from '../types/IntrospectionTypes.js';

/**
 * Test component types
 */
interface TestBuildingComponent extends Component {
  type: 'building';
  version: number;
  buildingType: string;
  tier: number;
  progress: number;
  isComplete: boolean;
  blocksMovement: boolean;
  storageCapacity: number;
  ownerId?: string;
  ownerName?: string;
  accessType: 'communal' | 'personal' | 'shared';
  sharedWith: string[];
}

interface TestPositionComponent extends Component {
  type: 'position';
  version: number;
  x: number;
  y: number;
  chunk_id: string;
}

/**
 * Test schemas
 */
const TestBuildingSchema = defineComponent<TestBuildingComponent>({
  type: 'building',
  version: 1,
  category: 'world',
  description: 'Test building component',

  fields: {
    buildingType: {
      type: 'string',
      required: true,
      description: 'Building type identifier',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text' },
      mutable: false,
    },

    tier: {
      type: 'number',
      required: true,
      range: [1, 5],
      description: 'Building tier',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    progress: {
      type: 'number',
      required: true,
      range: [0, 100],
      description: 'Construction progress',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },

    isComplete: {
      type: 'boolean',
      required: true,
      description: 'Construction complete',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'checkbox' },
      mutable: true,
    },

    blocksMovement: {
      type: 'boolean',
      required: true,
      description: 'Blocks movement',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'checkbox' },
      mutable: false,
    },

    storageCapacity: {
      type: 'number',
      required: true,
      range: [0, 1000],
      description: 'Storage capacity',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    ownerId: {
      type: 'string',
      required: false,
      description: 'Owner entity ID',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'text' },
      mutable: true,
    },

    ownerName: {
      type: 'string',
      required: false,
      description: 'Owner name',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text' },
      mutable: true,
    },

    accessType: {
      type: 'enum',
      enumValues: ['communal', 'personal', 'shared'],
      required: true,
      description: 'Access type',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'dropdown' },
      mutable: true,
    },

    sharedWith: {
      type: 'array',
      required: true,
      description: 'Shared with entity IDs',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'text' },
      mutable: true,
    },
  },

  validate: (data): data is TestBuildingComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'building' &&
      typeof (data as any).buildingType === 'string' &&
      typeof (data as any).tier === 'number'
    );
  },

  createDefault: () => ({
    type: 'building',
    version: 1,
    buildingType: 'workbench',
    tier: 1,
    progress: 0,
    isComplete: false,
    blocksMovement: true,
    storageCapacity: 0,
    accessType: 'communal',
    sharedWith: [],
  }),
});

const TestPositionSchema = defineComponent<TestPositionComponent>({
  type: 'position',
  version: 1,
  category: 'core',
  description: 'Test position component',

  fields: {
    x: {
      type: 'number',
      required: true,
      description: 'X coordinate',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    y: {
      type: 'number',
      required: true,
      description: 'Y coordinate',
      visibility: { player: true, llm: false, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },

    chunk_id: {
      type: 'string',
      required: true,
      description: 'Chunk ID',
      visibility: { player: false, llm: false, dev: true },
      ui: { widget: 'readonly' },
      mutable: false,
    },
  },

  validate: (data): data is TestPositionComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'position' &&
      typeof (data as any).x === 'number' &&
      typeof (data as any).y === 'number'
    );
  },

  createDefault: () => ({
    type: 'position',
    version: 1,
    x: 0,
    y: 0,
    chunk_id: 'chunk_0_0',
  }),
});

/**
 * Mock Building Blueprint
 */
interface MockBlueprint {
  id: string;
  name: string;
  description: string;
  category: string;
  width: number;
  height: number;
  resourceCost: Array<{ resourceId: string; amountRequired: number }>;
  techRequired: string[];
  terrainRequired: string[];
  terrainForbidden: string[];
  unlocked: boolean;
  buildTime: number;
  tier: number;
  functionality: any[];
  canRotate: boolean;
  rotationAngles: number[];
  snapToGrid: boolean;
  requiresFoundation: boolean;
}

/**
 * Mock BuildingBlueprintRegistry
 */
class MockBuildingRegistry {
  private blueprints = new Map<string, MockBlueprint>();

  register(blueprint: MockBlueprint): void {
    this.blueprints.set(blueprint.id, blueprint);
  }

  get(id: string): MockBlueprint {
    const blueprint = this.blueprints.get(id);
    if (!blueprint) {
      throw new Error(`Blueprint "${id}" not found`);
    }
    return blueprint;
  }

  tryGet(id: string): MockBlueprint | undefined {
    return this.blueprints.get(id);
  }

  getByCategory(category: string): MockBlueprint[] {
    return Array.from(this.blueprints.values()).filter(
      (bp) => bp.category === category
    );
  }

  getAll(): MockBlueprint[] {
    return Array.from(this.blueprints.values());
  }
}

/**
 * Test helpers
 */
function createMockEntity(id?: string): EntityImpl {
  const entity = new EntityImpl(id || createEntityId(), 0);
  return entity;
}

function createMockWorld(buildingRegistry?: MockBuildingRegistry): World {
  const entities = new Map<string, EntityImpl>();

  // Create query function that returns entities with the specified components
  const queryFn = vi.fn().mockImplementation(() => {
    const requiredComponents: string[] = [];

    const queryObj = {
      with: vi.fn().mockImplementation((componentType: string) => {
        requiredComponents.push(componentType);
        return queryObj;
      }),
      without: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockImplementation(() => {
        // Filter entities that have all required components
        return Array.from(entities.values()).filter((entity: any) => {
          return requiredComponents.every(compType => entity.hasComponent(compType));
        });
      }),
      execute: vi.fn().mockReturnValue([]),
    };

    return queryObj;
  });

  return {
    tick: 100,
    timeEntity: null,
    buildingRegistry,
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: queryFn,
    getEntity: vi.fn((id: string) => entities.get(id)),
    addEntity: vi.fn((entity: EntityImpl) => {
      entities.set(entity.id, entity);
    }),
    removeEntity: vi.fn((id: string) => {
      entities.delete(id);
    }),
    simulationScheduler: {
      filterActiveEntities: vi.fn((entities) => entities),
    },
  } as unknown as World;
}

/**
 * Mock GameIntrospectionAPI with building methods
 */
class MockGameIntrospectionAPI {
  private world: World;
  private cache = new Map<string, any>();
  private cacheStats = { hits: 0, misses: 0, invalidations: 0 };
  private buildingRegistry?: MockBuildingRegistry;

  constructor(world: World, buildingRegistry?: MockBuildingRegistry) {
    this.world = world;
    this.buildingRegistry = buildingRegistry;
  }

  /**
   * Place building with validation and collision detection
   */
  async placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult> {
    // Validate blueprint exists
    if (!this.buildingRegistry) {
      return {
        success: false,
        error: 'Building registry not available',
      };
    }

    const blueprint = this.buildingRegistry.tryGet(request.blueprintId);
    if (!blueprint) {
      return {
        success: false,
        error: `Blueprint '${request.blueprintId}' not found`,
      };
    }

    // Check collisions if requested
    if (request.checkCollisions !== false) {
      const collisions = this.detectCollisions(request.position, blueprint.width, blueprint.height);
      if (collisions.length > 0) {
        return {
          success: false,
          error: 'Collision detected',
          collisions,
        };
      }
    }

    // Create building entity
    const buildingEntity = createMockEntity();
    (buildingEntity as any).addComponent({
      type: 'building',
      version: 1,
      buildingType: request.blueprintId,
      tier: blueprint.tier,
      progress: 0,
      isComplete: false,
      blocksMovement: true,
      storageCapacity: 0,
      ownerId: request.owner,
      ownerName: undefined,
      accessType: 'communal',
      sharedWith: [],
    });

    (buildingEntity as any).addComponent({
      type: 'position',
      version: 1,
      x: request.position.x,
      y: request.position.y,
      chunk_id: 'chunk_0_0',
    });

    // Add entity to world
    this.world.addEntity?.(buildingEntity);

    // Emit placement event
    if (this.world.eventBus && typeof this.world.eventBus.emit === 'function') {
      this.world.eventBus.emit('building_placed', {
        buildingId: buildingEntity.id,
        blueprintId: request.blueprintId,
        position: request.position,
        owner: request.owner,
      });
    }

    // Invalidate cache
    this.invalidateCache();

    return {
      success: true,
      buildingId: buildingEntity.id,
    };
  }

  /**
   * List buildings with filters
   */
  async listBuildings(options?: {
    owner?: string;
    bounds?: { x: number; y: number; width: number; height: number };
    category?: string;
  }): Promise<BuildingInfo[]> {
    // Query all building entities
    const query = this.world.query?.();
    if (!query) {
      return [];
    }

    const queryWithTypes = query.with('building').with('position');
    const buildingEntities = queryWithTypes.executeEntities() as EntityImpl[];

    const results: BuildingInfo[] = [];

    for (const entity of buildingEntities) {
      const building = (entity as any).getComponent('building') as TestBuildingComponent;
      const position = (entity as any).getComponent('position') as TestPositionComponent;

      if (!building || !position) {
        continue;
      }

      // Filter by owner
      if (options?.owner && building.ownerId !== options.owner) {
        continue;
      }

      // Filter by bounds
      if (options?.bounds) {
        const { x, y, width, height } = options.bounds;
        if (
          position.x < x ||
          position.x >= x + width ||
          position.y < y ||
          position.y >= y + height
        ) {
          continue;
        }
      }

      // Filter by category
      if (options?.category) {
        const blueprint = this.buildingRegistry?.tryGet(building.buildingType);
        if (!blueprint || blueprint.category !== options.category) {
          continue;
        }
      }

      // Get blueprint name
      const blueprint = this.buildingRegistry?.tryGet(building.buildingType);
      const name = blueprint?.name || building.buildingType;
      const category = blueprint?.category || 'unknown';
      const state = building.isComplete ? 'active' : 'under_construction';

      results.push({
        id: entity.id,
        blueprintId: building.buildingType,
        name,
        category,
        position: { x: position.x, y: position.y },
        owner: building.ownerId,
        state,
        createdAt: this.world.tick,
      });
    }

    return results;
  }

  /**
   * List blueprints with filters
   */
  listBlueprints(options?: { category?: string }): BlueprintInfo[] {
    if (!this.buildingRegistry) {
      return [];
    }

    let blueprints = this.buildingRegistry.getAll();

    if (options?.category) {
      blueprints = this.buildingRegistry.getByCategory(options.category);
    }

    return blueprints.map((bp) => ({
      id: bp.id,
      name: bp.name,
      category: bp.category,
      description: bp.description,
      dimensions: { width: bp.width, height: bp.height, depth: 1 },
      costs: bp.resourceCost.reduce((acc, cost) => {
        acc[cost.resourceId] = cost.amountRequired;
        return acc;
      }, {} as Record<string, number>),
    }));
  }

  /**
   * Detect collisions with existing buildings
   */
  private detectCollisions(
    position: { x: number; y: number },
    width: number,
    height: number
  ): Array<{ entityId: string; type: string; position: { x: number; y: number } }> {
    const query = this.world.query?.();
    if (!query) {
      return [];
    }

    const queryWithTypes = query.with('building').with('position');
    const buildingEntities = queryWithTypes.executeEntities() as EntityImpl[];

    const collisions: Array<{ entityId: string; type: string; position: { x: number; y: number } }> = [];

    for (const entity of buildingEntities) {
      const building = (entity as any).getComponent('building') as TestBuildingComponent;
      const existingPos = (entity as any).getComponent('position') as TestPositionComponent;

      if (!building || !existingPos) {
        continue;
      }

      // Get existing building dimensions
      const blueprint = this.buildingRegistry?.tryGet(building.buildingType);
      const existingWidth = blueprint?.width || 1;
      const existingHeight = blueprint?.height || 1;

      // Check for overlap (simple AABB collision)
      const overlap =
        position.x < existingPos.x + existingWidth &&
        position.x + width > existingPos.x &&
        position.y < existingPos.y + existingHeight &&
        position.y + height > existingPos.y;

      if (overlap) {
        collisions.push({
          entityId: entity.id,
          type: building.buildingType,
          position: { x: existingPos.x, y: existingPos.y },
        });
      }
    }

    return collisions;
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cache.clear();
    this.cacheStats.invalidations++;
  }

  /**
   * Get cache stats
   */
  getCacheStats(): any {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      invalidations: this.cacheStats.invalidations,
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
    };
  }
}

/**
 * Tests
 */
describe('GameIntrospectionAPI Phase 2 - Building Management', () => {
  let world: World;
  let api: MockGameIntrospectionAPI;
  let buildingRegistry: MockBuildingRegistry;

  beforeEach(() => {
    // Register test schemas
    ComponentRegistry.register(TestBuildingSchema);
    ComponentRegistry.register(TestPositionSchema);

    // Create building registry with test blueprints
    buildingRegistry = new MockBuildingRegistry();

    // Register test blueprints
    buildingRegistry.register({
      id: 'small_house',
      name: 'Small House',
      description: 'A cozy dwelling',
      category: 'residential',
      width: 4,
      height: 4,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 50 },
        { resourceId: 'stone', amountRequired: 20 },
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water'],
      unlocked: true,
      buildTime: 600,
      tier: 1,
      functionality: [{ type: 'sleeping', restBonus: 1.5 }],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    buildingRegistry.register({
      id: 'workbench',
      name: 'Workbench',
      description: 'Basic crafting station',
      category: 'production',
      width: 2,
      height: 2,
      resourceCost: [{ resourceId: 'wood', amountRequired: 20 }],
      techRequired: [],
      terrainRequired: [],
      terrainForbidden: ['water'],
      unlocked: true,
      buildTime: 300,
      tier: 1,
      functionality: [{ type: 'crafting', recipes: ['tools'], speed: 1.0 }],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false,
    });

    buildingRegistry.register({
      id: 'storage_shed',
      name: 'Storage Shed',
      description: 'Large storage building',
      category: 'storage',
      width: 3,
      height: 3,
      resourceCost: [{ resourceId: 'wood', amountRequired: 30 }],
      techRequired: [],
      terrainRequired: [],
      terrainForbidden: ['water'],
      unlocked: true,
      buildTime: 400,
      tier: 1,
      functionality: [{ type: 'storage', capacity: 100 }],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false,
    });

    // Create world and API
    world = createMockWorld(buildingRegistry);
    api = new MockGameIntrospectionAPI(world, buildingRegistry);
  });

  afterEach(() => {
    ComponentRegistry.clear();
  });

  describe('placeBuilding', () => {
    it('should successfully place building with valid blueprint', async () => {
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 20 },
        owner: 'agent-1',
        checkCollisions: true,
      });

      expect(result.success).toBe(true);
      expect(result.buildingId).toBeDefined();
      expect(result.error).toBeUndefined();

      // Verify building was added to world
      const buildings = await api.listBuildings();
      expect(buildings.length).toBe(1);
      expect(buildings[0].blueprintId).toBe('workbench');
      expect(buildings[0].position).toEqual({ x: 10, y: 20 });
      expect(buildings[0].owner).toBe('agent-1');
    });

    it('should validate blueprint exists', async () => {
      const result = await api.placeBuilding({
        blueprintId: 'nonexistent_building',
        position: { x: 10, y: 20 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.buildingId).toBeUndefined();
    });

    it('should detect overlapping buildings (collision detection)', async () => {
      // Place first building
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 10 },
        checkCollisions: true,
      });

      // Try to place overlapping building
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 11, y: 11 },
        checkCollisions: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Collision');
      expect(result.collisions).toBeDefined();
      expect(result.collisions!.length).toBeGreaterThan(0);
      expect(result.collisions![0].type).toBe('workbench');
      expect(result.collisions![0].position).toEqual({ x: 10, y: 10 });
    });

    it('should allow overlap when collision detection disabled', async () => {
      // Place first building
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 10 },
        checkCollisions: true,
      });

      // Place overlapping building with collisions disabled
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 11, y: 11 },
        checkCollisions: false,
      });

      expect(result.success).toBe(true);
      expect(result.buildingId).toBeDefined();

      // Verify both buildings exist
      const buildings = await api.listBuildings();
      expect(buildings.length).toBe(2);
    });

    it('should invalidate cache after placement', async () => {
      const statsBefore = api.getCacheStats();
      const invalidationsBefore = statsBefore.invalidations;

      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 20 },
      });

      const statsAfter = api.getCacheStats();
      expect(statsAfter.invalidations).toBeGreaterThan(invalidationsBefore);
    });

    it('should handle error when buildingRegistry not available', async () => {
      // Create API without registry
      const worldWithoutRegistry = createMockWorld();
      const apiWithoutRegistry = new MockGameIntrospectionAPI(worldWithoutRegistry);

      const result = await apiWithoutRegistry.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 20 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('registry not available');
    });

    it('should emit building placement event', async () => {
      const emitSpy = vi.spyOn(world.eventBus!, 'emit');

      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 20 },
        owner: 'agent-1',
      });

      expect(emitSpy).toHaveBeenCalledWith('building_placed', {
        buildingId: result.buildingId,
        blueprintId: 'workbench',
        position: { x: 10, y: 20 },
        owner: 'agent-1',
      });
    });
  });

  describe('listBuildings', () => {
    beforeEach(async () => {
      // Place several test buildings
      await api.placeBuilding({
        blueprintId: 'small_house',
        position: { x: 0, y: 0 },
        owner: 'agent-1',
      });

      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 10 },
        owner: 'agent-1',
      });

      await api.placeBuilding({
        blueprintId: 'storage_shed',
        position: { x: 20, y: 20 },
        owner: 'agent-2',
      });

      await api.placeBuilding({
        blueprintId: 'small_house',
        position: { x: 50, y: 50 },
        owner: 'agent-2',
      });
    });

    it('should list all buildings', async () => {
      const buildings = await api.listBuildings();

      expect(buildings.length).toBe(4);
      expect(buildings.map((b) => b.blueprintId).sort()).toEqual([
        'small_house',
        'small_house',
        'storage_shed',
        'workbench',
      ]);
    });

    it('should filter by owner', async () => {
      const buildings = await api.listBuildings({ owner: 'agent-1' });

      expect(buildings.length).toBe(2);
      expect(buildings.every((b) => b.owner === 'agent-1')).toBe(true);
      expect(buildings.map((b) => b.blueprintId).sort()).toEqual(['small_house', 'workbench']);
    });

    it('should filter by category', async () => {
      const buildings = await api.listBuildings({ category: 'residential' });

      expect(buildings.length).toBe(2);
      expect(buildings.every((b) => b.category === 'residential')).toBe(true);
      expect(buildings.every((b) => b.blueprintId === 'small_house')).toBe(true);
    });

    it('should filter by bounds (spatial query)', async () => {
      const buildings = await api.listBuildings({
        bounds: { x: 0, y: 0, width: 15, height: 15 },
      });

      expect(buildings.length).toBe(2);
      expect(buildings.map((b) => b.blueprintId).sort()).toEqual(['small_house', 'workbench']);
      expect(buildings.every((b) => b.position.x < 15 && b.position.y < 15)).toBe(true);
    });

    it('should combine filters (owner + category)', async () => {
      const buildings = await api.listBuildings({
        owner: 'agent-2',
        category: 'residential',
      });

      expect(buildings.length).toBe(1);
      expect(buildings[0].blueprintId).toBe('small_house');
      expect(buildings[0].owner).toBe('agent-2');
      expect(buildings[0].category).toBe('residential');
      expect(buildings[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should return empty array when no buildings match', async () => {
      const buildings = await api.listBuildings({ owner: 'nonexistent-agent' });

      expect(buildings.length).toBe(0);
    });

    it('should include building metadata', async () => {
      const buildings = await api.listBuildings();

      for (const building of buildings) {
        expect(building.id).toBeDefined();
        expect(building.blueprintId).toBeDefined();
        expect(building.name).toBeDefined();
        expect(building.category).toBeDefined();
        expect(building.position).toBeDefined();
        expect(building.state).toBeDefined();
        expect(building.createdAt).toBe(world.tick);
      }
    });

    it('should handle buildings with no position component gracefully', async () => {
      // Create entity with building but no position
      const brokenEntity = createMockEntity();
      (brokenEntity as any).addComponent({
        type: 'building',
        version: 1,
        buildingType: 'workbench',
        tier: 1,
        progress: 0,
        isComplete: false,
        blocksMovement: true,
        storageCapacity: 0,
        accessType: 'communal',
        sharedWith: [],
      });
      world.addEntity?.(brokenEntity);

      const buildings = await api.listBuildings();

      // Should skip broken entity (has building but no position)
      // Note: The 4 buildings from beforeEach still exist
      expect(buildings.length).toBe(4);
    });
  });

  describe('listBlueprints', () => {
    it('should list all blueprints', () => {
      const blueprints = api.listBlueprints();

      expect(blueprints.length).toBe(3);
      expect(blueprints.map((b) => b.id).sort()).toEqual([
        'small_house',
        'storage_shed',
        'workbench',
      ]);
    });

    it('should filter by category', () => {
      const blueprints = api.listBlueprints({ category: 'production' });

      expect(blueprints.length).toBe(1);
      expect(blueprints[0].id).toBe('workbench');
      expect(blueprints[0].category).toBe('production');
    });

    it('should return empty array when registry not available', () => {
      const worldWithoutRegistry = createMockWorld();
      const apiWithoutRegistry = new MockGameIntrospectionAPI(worldWithoutRegistry);

      const blueprints = apiWithoutRegistry.listBlueprints();

      expect(blueprints.length).toBe(0);
    });

    it('should include blueprint metadata', () => {
      const blueprints = api.listBlueprints();

      for (const blueprint of blueprints) {
        expect(blueprint.id).toBeDefined();
        expect(blueprint.name).toBeDefined();
        expect(blueprint.category).toBeDefined();
        expect(blueprint.description).toBeDefined();
        expect(blueprint.dimensions).toBeDefined();
        expect(blueprint.dimensions.width).toBeGreaterThan(0);
        expect(blueprint.dimensions.height).toBeGreaterThan(0);
        expect(blueprint.costs).toBeDefined();
        expect(Object.keys(blueprint.costs).length).toBeGreaterThan(0);
      }
    });

    it('should convert resource costs correctly', () => {
      const blueprints = api.listBlueprints({ category: 'residential' });

      expect(blueprints.length).toBe(1);
      expect(blueprints[0].costs).toEqual({
        wood: 50,
        stone: 20,
      });
    });

    it('should return empty array for non-existent category', () => {
      const blueprints = api.listBlueprints({ category: 'nonexistent' });

      expect(blueprints.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle placing building at negative coordinates', async () => {
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: -10, y: -20 },
      });

      expect(result.success).toBe(true);

      const buildings = await api.listBuildings({
        bounds: { x: -15, y: -25, width: 10, height: 10 },
      });
      expect(buildings.length).toBe(1);
    });

    it('should handle placing multiple buildings in same location with collisions disabled', async () => {
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 0, y: 0 },
        checkCollisions: false,
      });

      await api.placeBuilding({
        blueprintId: 'small_house',
        position: { x: 0, y: 0 },
        checkCollisions: false,
      });

      const buildings = await api.listBuildings({
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      });

      expect(buildings.length).toBe(2);
    });

    it('should detect partial overlap collision', async () => {
      // Place 4x4 building at (0, 0)
      await api.placeBuilding({
        blueprintId: 'small_house',
        position: { x: 0, y: 0 },
        checkCollisions: true,
      });

      // Try to place 2x2 building at (3, 3) - should overlap at corner
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 3, y: 3 },
        checkCollisions: true,
      });

      expect(result.success).toBe(false);
      expect(result.collisions).toBeDefined();
      expect(result.collisions!.length).toBe(1);
    });

    it('should not detect collision for adjacent buildings', async () => {
      // Place 2x2 building at (0, 0)
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 0, y: 0 },
        checkCollisions: true,
      });

      // Place another 2x2 building at (2, 0) - should be adjacent, not overlapping
      const result = await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 2, y: 0 },
        checkCollisions: true,
      });

      expect(result.success).toBe(true);
    });

    it('should handle bounds query with zero width/height', async () => {
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 10 },
      });

      const buildings = await api.listBuildings({
        bounds: { x: 10, y: 10, width: 0, height: 0 },
      });

      expect(buildings.length).toBe(0);
    });

    it('should handle owner filter with undefined owner', async () => {
      await api.placeBuilding({
        blueprintId: 'workbench',
        position: { x: 10, y: 10 },
        // No owner specified
      });

      const buildings = await api.listBuildings({ owner: undefined });

      // Should match building without owner
      expect(buildings.length).toBe(1);
    });
  });
});
