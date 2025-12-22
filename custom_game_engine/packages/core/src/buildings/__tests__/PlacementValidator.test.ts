import { describe, it, expect, beforeEach, vi } from 'vitest';
// NOTE: These imports will fail until the module is implemented (TDD red phase)
import {
  PlacementValidator,
} from '../PlacementValidator.js';
import { type BuildingBlueprint } from '../BuildingBlueprintRegistry.js';
import type { World } from '../../ecs/World.js';

// Mock world for testing
function createMockWorld(options: {
  tiles?: Map<string, { terrain: string }>;
  entities?: Array<{ position: { x: number; y: number }; building?: boolean }>;
}): World {
  const tiles = options.tiles ?? new Map();
  const entities = options.entities ?? [];

  return {
    tick: 0,
    gameTime: {
      totalTicks: 0,
      ticksPerHour: 1200,
      hour: 12,
      day: 1,
      season: 'spring',
      year: 1,
    },
    entities: new Map(),
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      flush: vi.fn(),
    } as any,
    features: {},
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      inRect: vi.fn((minX: number, minY: number, width: number, height: number) => {
        const maxX = minX + width;
        const maxY = minY + height;
        const entitiesInRect = entities.filter(e =>
          e.building &&
          e.position &&
          e.position.x >= minX &&
          e.position.x < maxX &&
          e.position.y >= minY &&
          e.position.y < maxY
        );
        return {
          execute: () => entitiesInRect.map((_, i) => `entity-${i}`),
          executeEntities: () => entitiesInRect.map((e, i) => ({
            id: `entity-${i}`,
            components: new Map<string, unknown>([
              ['position', e.position],
              ['building', { type: 'building' }],
            ]),
          })),
        };
      }),
      execute: vi.fn().mockReturnValue([]),
      executeEntities: vi.fn().mockReturnValue([]),
    }),
    getEntity: vi.fn(),
    getComponent: vi.fn(),
    hasComponent: vi.fn(),
    getEntitiesInChunk: vi.fn().mockReturnValue([]),
    getEntitiesInRect: vi.fn().mockReturnValue([]),
    isFeatureEnabled: vi.fn().mockReturnValue(false),
    // Custom method for testing - get tile at position
    getTile: (x: number, y: number) => tiles.get(`${x},${y}`),
  } as unknown as World;
}

function createTestBlueprint(overrides: Partial<BuildingBlueprint> = {}): BuildingBlueprint {
  return {
    id: 'test-building',
    name: 'Test Building',
    description: 'A test',
    category: 'residential',
    width: 1,
    height: 1,
    resourceCost: [],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    unlocked: true,
    buildTime: 10,
    tier: 1,
    functionality: [],
    canRotate: false,
    rotationAngles: [0],
    snapToGrid: true,
    requiresFoundation: false,
    ...overrides,
  };
}

describe('PlacementValidator', () => {
  let validator: PlacementValidator;

  beforeEach(() => {
    validator = new PlacementValidator();
  });

  describe('REQ-BPLACE-003: Grid Snapping', () => {
    it('should snap position to 16px grid', () => {
      const snapped = validator.snapToGrid(17, 33, 16);
      expect(snapped).toEqual({ x: 16, y: 32 });
    });

    it('should snap exact grid positions correctly', () => {
      const snapped = validator.snapToGrid(32, 64, 16);
      expect(snapped).toEqual({ x: 32, y: 64 });
    });

    it('should handle negative coordinates', () => {
      const snapped = validator.snapToGrid(-17, -33, 16);
      expect(snapped).toEqual({ x: -32, y: -48 });
    });

    it('should use default tile size of 16', () => {
      const snapped = validator.snapToGrid(25, 25);
      expect(snapped).toEqual({ x: 16, y: 16 });
    });
  });

  describe('REQ-BPLACE-005: Terrain Validation', () => {
    it('should return valid when terrain is allowed', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        terrainRequired: ['grass'],
        terrainForbidden: ['water'],
      });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when terrain is forbidden', () => {
      const tiles = new Map([['0,0', { terrain: 'water' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        terrainRequired: [], // No specific terrain required, so only forbidden check applies
        terrainForbidden: ['water'],
      });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('terrain_invalid');
      expect(result.errors[0]?.message).toContain('water');
    });

    it('should throw when tile does not exist at position', () => {
      const world = createMockWorld({ tiles: new Map() });
      const blueprint = createTestBlueprint();

      expect(() => validator.validate({ x: 0, y: 0 }, blueprint, world)).toThrow(
        'Invalid position: no tile at (0, 0)'
      );
    });

    it('should validate all tiles for multi-tile buildings', () => {
      const tiles = new Map([
        ['0,0', { terrain: 'grass' }],
        ['1,0', { terrain: 'grass' }],
        ['0,1', { terrain: 'water' }], // Invalid tile
        ['1,1', { terrain: 'grass' }],
      ]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        width: 2,
        height: 2,
        terrainForbidden: ['water'],
      });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'terrain_invalid')).toBe(true);
    });
  });

  describe('REQ-BPLACE-005: Entity Collision Detection', () => {
    it('should return invalid when another building exists at position', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({
        tiles,
        entities: [{ position: { x: 0, y: 0 }, building: true }],
      });
      const blueprint = createTestBlueprint();

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'terrain_occupied')).toBe(true);
    });

    it('should allow placement when no buildings overlap', () => {
      const tiles = new Map([
        ['0,0', { terrain: 'grass' }],
        ['5,5', { terrain: 'grass' }],
      ]);
      const world = createMockWorld({
        tiles,
        entities: [{ position: { x: 5, y: 5 }, building: true }], // Far away
      });
      const blueprint = createTestBlueprint();

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(true);
    });
  });

  describe('REQ-BPLACE-006: Resource Requirement Checking', () => {
    it('should report missing resources as errors', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        resourceCost: [
          { resourceId: 'wood', amountRequired: 10 },
          { resourceId: 'stone', amountRequired: 5 },
        ],
      });

      // Validator checks resources if inventory is provided
      const result = validator.validate(
        { x: 0, y: 0 },
        blueprint,
        world,
        { wood: 3, stone: 10 } // Not enough wood
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === 'resource_missing')).toBe(true);
      expect(result.errors.find(e => e.type === 'resource_missing')?.message).toContain(
        'wood'
      );
    });

    it('should pass when all resources are available', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        resourceCost: [
          { resourceId: 'wood', amountRequired: 10 },
          { resourceId: 'stone', amountRequired: 5 },
        ],
      });

      const result = validator.validate(
        { x: 0, y: 0 },
        blueprint,
        world,
        { wood: 15, stone: 10 } // Enough
      );

      expect(result.valid).toBe(true);
    });

    it('should skip resource check if no inventory provided', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        resourceCost: [{ resourceId: 'wood', amountRequired: 10 }],
      });

      // No inventory provided - skip resource check (for Phase 7 MVP)
      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.valid).toBe(true);
    });
  });

  describe('REQ-BPLACE-004: Rotation Validation', () => {
    it('should validate rotation is in allowed angles', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world, undefined, 90);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid rotation angle', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world, undefined, 45);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('rotation'))).toBe(true);
    });

    it('should ignore rotation for non-rotatable buildings', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({
        canRotate: false,
        rotationAngles: [0],
      });

      // Even if invalid rotation is passed, should be ignored
      const result = validator.validate({ x: 0, y: 0 }, blueprint, world, undefined, 0);

      expect(result.valid).toBe(true);
    });
  });

  describe('Error Handling (CLAUDE.md: No Silent Fallbacks)', () => {
    it('should throw when blueprint is null', () => {
      const world = createMockWorld({});

      expect(() =>
        validator.validate({ x: 0, y: 0 }, null as any, world)
      ).toThrow('Blueprint is required');
    });

    it('should throw when world is null', () => {
      const blueprint = createTestBlueprint();

      expect(() =>
        validator.validate({ x: 0, y: 0 }, blueprint, null as any)
      ).toThrow('World is required');
    });

    it('should throw when position has invalid coordinates', () => {
      const tiles = new Map([['0,0', { terrain: 'grass' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint();

      expect(() =>
        validator.validate({ x: NaN, y: 0 }, blueprint, world)
      ).toThrow('Position x must be a valid number');

      expect(() =>
        validator.validate({ x: 0, y: Infinity }, blueprint, world)
      ).toThrow('Position y must be a valid number');
    });
  });

  describe('Validation Result Structure', () => {
    it('should return properly structured ValidationResult', () => {
      const tiles = new Map([['0,0', { terrain: 'water' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({ terrainForbidden: ['water'] });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should include affected tiles in error', () => {
      const tiles = new Map([['0,0', { terrain: 'water' }]]);
      const world = createMockWorld({ tiles });
      const blueprint = createTestBlueprint({ terrainForbidden: ['water'] });

      const result = validator.validate({ x: 0, y: 0 }, blueprint, world);

      expect(result.errors[0]?.affectedTiles).toBeDefined();
      expect(result.errors[0]?.affectedTiles).toContainEqual({ x: 0, y: 0 });
    });
  });

  describe('Multiple Error Aggregation', () => {
    it('should collect all validation errors, not stop at first', () => {
      const tiles = new Map([
        ['0,0', { terrain: 'water' }], // Invalid terrain
      ]);
      const world = createMockWorld({
        tiles,
        entities: [{ position: { x: 0, y: 0 }, building: true }], // Also occupied
      });
      const blueprint = createTestBlueprint({
        terrainForbidden: ['water'],
        resourceCost: [{ resourceId: 'gold', amountRequired: 1000 }],
      });

      const result = validator.validate(
        { x: 0, y: 0 },
        blueprint,
        world,
        { gold: 0 } // Not enough
      );

      // Should have multiple errors, not just the first one found
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.type === 'terrain_invalid')).toBe(true);
      expect(result.errors.some(e => e.type === 'resource_missing')).toBe(true);
    });
  });
});
