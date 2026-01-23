import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Tile-Based Blueprint System Specifications
 *
 * Per work order: String-based blueprints for defining building layouts.
 * Simpler than entity-based blueprints, easier for designers to write and modify.
 *
 * Blueprint Format:
 * - '#' = wall
 * - '.' = floor (empty space)
 * - 'D' = door
 * - 'W' = window
 * - ' ' = nothing (outdoor)
 *
 * Blueprints specify material separately from layout, allowing the same design
 * to be built in wood, stone, candy, flesh, etc.
 *
 * See: VOXEL_BUILDING_SYSTEM_PLAN.md Section 4
 */

/**
 * Test fixture type for blueprint configuration.
 * Represents the expected configuration object passed to world.createBlueprint().
 */
interface BlueprintConfig {
  id: string;
  name?: string;
  layout: string[];
  defaultWallMaterial?: string;
  defaultFloorMaterial?: string;
  defaultDoorMaterial?: string;
  defaultWindowMaterial?: string;
  materialOverrides?: Record<string, string>;
}

describe('Tile-Based Blueprint System', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Blueprint Definition', () => {
    describe('string-based layouts', () => {
      it('should parse a simple 3x3 room blueprint', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          name: 'Simple Room',
          layout: [
            '###',
            '#.#',
            '###'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        expect(blueprint).toBeDefined();
        expect(blueprint.width).toBe(3);
        expect(blueprint.height).toBe(3);
        expect(blueprint.id).toBe('simple_room');
      });

      it('should parse a room with a door', () => {
        const blueprint = world.createBlueprint({
          id: 'room_with_door',
          name: 'Room with Door',
          layout: [
            '#####',
            '#...#',
            'D...#',
            '#...#',
            '#####'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        // Count tiles by type
        const tiles = blueprint.getTileList();
        const doorTiles = tiles.filter(t => t.type === 'door');
        const wallTiles = tiles.filter(t => t.type === 'wall');
        const floorTiles = tiles.filter(t => t.type === 'floor');

        expect(doorTiles).toHaveLength(1);
        expect(doorTiles[0].position).toEqual({ x: 0, y: 2 });
        expect(wallTiles.length).toBeGreaterThan(0);
        expect(floorTiles.length).toBeGreaterThan(0);
      });

      it('should parse a hallway blueprint', () => {
        const blueprint = world.createBlueprint({
          id: 'hallway',
          name: 'Hallway',
          layout: [
            '#####',
            'D...D', // Hallway connecting two doors
            '#####'
          ],
          defaultWallMaterial: 'stone_wall',
          defaultFloorMaterial: 'stone_floor',
          defaultDoorMaterial: 'wood_door',
        });

        const tiles = blueprint.getTileList();
        const doorTiles = tiles.filter(t => t.type === 'door');

        expect(doorTiles).toHaveLength(2);
        expect(doorTiles[0].position.x).toBe(0); // Left door
        expect(doorTiles[1].position.x).toBe(4); // Right door
      });

      it('should parse a room with windows', () => {
        const blueprint = world.createBlueprint({
          id: 'room_with_windows',
          name: 'Room with Windows',
          layout: [
            '#W#W#',
            '#...#',
            '#...#',
            '#W#W#'
          ],
          defaultWallMaterial: 'stone_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultWindowMaterial: 'glass_window',
        });

        const tiles = blueprint.getTileList();
        const windowTiles = tiles.filter(t => t.type === 'window');

        expect(windowTiles).toHaveLength(4);
      });

      it('should parse complex multi-room blueprint', () => {
        const blueprint = world.createBlueprint({
          id: 'house',
          name: 'Small House',
          layout: [
            '##########',
            '#........#',
            '#...##...#',
            '#...D#...#', // Interior door
            '#...##...#',
            '#........#',
            '####D#####'  // Exterior door
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        const tiles = blueprint.getTileList();
        const doorTiles = tiles.filter(t => t.type === 'door');

        expect(doorTiles).toHaveLength(2); // Interior and exterior doors
        expect(blueprint.width).toBe(10);
        expect(blueprint.height).toBe(7);
      });
    });

    describe('material specification', () => {
      it('should support custom wall material', () => {
        const blueprint = world.createBlueprint({
          id: 'candy_room',
          name: 'Candy Room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'sugar_brick',
          defaultFloorMaterial: 'candy_floor',
        });

        const tiles = blueprint.getTileList();
        const wallTiles = tiles.filter(t => t.type === 'wall');

        expect(wallTiles[0].materialId).toBe('sugar_brick');
      });

      it('should support per-tile material overrides', () => {
        const blueprint = world.createBlueprint({
          id: 'mixed_materials',
          name: 'Mixed Materials Room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          materialOverrides: {
            '0,0': 'stone_wall',  // Top-left corner is stone
            '2,2': 'stone_wall',  // Bottom-right corner is stone
          },
        });

        const tiles = blueprint.getTileList();
        const topLeft = tiles.find(t => t.position.x === 0 && t.position.y === 0);
        const bottomRight = tiles.find(t => t.position.x === 2 && t.position.y === 2);
        const other = tiles.find(t => t.position.x === 1 && t.position.y === 0);

        expect(topLeft?.materialId).toBe('stone_wall');
        expect(bottomRight?.materialId).toBe('stone_wall');
        expect(other?.materialId).toBe('wood_wall');
      });
    });

    describe('blueprint metadata', () => {
      it('should include cost estimation', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        const cost = blueprint.estimateCost();

        expect(cost['wood_wall']).toBe(8); // 8 wall tiles
        expect(cost['wood_floor']).toBe(1); // 1 floor tile
      });

      it('should include construction time estimation', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        const time = blueprint.estimateConstructionTime();

        // Assume 60 seconds per tile (configurable)
        expect(time).toBe(540); // 9 tiles × 60 seconds
      });

      it('should include builder count recommendation', () => {
        const blueprint = world.createBlueprint({
          id: 'large_building',
          layout: [
            '##########',
            '#........#',
            '#........#',
            '#........#',
            '#........#',
            '##########'
          ],
          defaultWallMaterial: 'stone_wall',
          defaultFloorMaterial: 'stone_floor',
        });

        const recommendation = blueprint.recommendBuilders();

        // Large buildings benefit from multiple builders
        expect(recommendation.min).toBe(1);
        expect(recommendation.optimal).toBeGreaterThan(1);
      });
    });
  });

  describe('Blueprint Placement', () => {
    describe('basic placement', () => {
      it('should place blueprint at world coordinates', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        // Check corners
        expect(world.getTileAt(10, 10).wall?.materialId).toBe('wood_wall'); // Top-left
        expect(world.getTileAt(12, 10).wall?.materialId).toBe('wood_wall'); // Top-right
        expect(world.getTileAt(11, 11).floor).toBe('wood_floor'); // Center
      });

      it('should create construction tasks for each tile', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const tasks = world.getConstructionTasks();

        expect(tasks.length).toBe(9); // 9 tiles to build
        expect(tasks[0].blueprintId).toBe('simple_room');
        expect(tasks[0].status).toBe('pending');
      });

      it('should mark tiles as under construction', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        world.placeBlueprint(blueprint, 10, 10);

        const tile = world.getTileAt(10, 10);

        expect(tile.wall?.progress).toBe(0); // Not started
        expect(tile.wall?.builderId).toBeUndefined(); // No builder assigned yet
      });
    });

    describe('collision detection', () => {
      it('should throw if blueprint overlaps existing walls', () => {
        world.placeWallTile(10, 10, {
          materialId: 'stone_wall',
          health: 100,
          progress: 100,
          constructedAt: 0,
          orientation: 'north'
        });

        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        expect(() => {
          world.placeBlueprint(blueprint, 10, 10);
        }).toThrow('Blueprint overlaps existing structure at 10,10');
      });

      it('should allow placement adjacent to existing structures', () => {
        world.placeWallTile(9, 10, {
          materialId: 'stone_wall',
          health: 100,
          progress: 100,
          constructedAt: 0,
          orientation: 'north'
        });

        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        // Should not throw - adjacent is OK
        world.placeBlueprint(blueprint, 10, 10);

        expect(world.getTileAt(10, 10).wall).toBeDefined();
      });

      it('should throw if blueprint extends out of bounds', () => {
        const blueprint = world.createBlueprint({
          id: 'simple_room',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });

        expect(() => {
          world.placeBlueprint(blueprint, -1, -1); // Out of bounds
        }).toThrow('Blueprint extends out of world bounds');
      });
    });

    describe('rotation and mirroring', () => {
      it('should rotate blueprint 90 degrees clockwise', () => {
        const blueprint = world.createBlueprint({
          id: 'hallway',
          layout: [
            '#####',
            'D...D',
            '#####'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        const rotated = blueprint.rotate90();

        expect(rotated.width).toBe(3); // Swapped
        expect(rotated.height).toBe(5);

        // Doors should now be top and bottom instead of left and right
        const tiles = rotated.getTileList();
        const doorTiles = tiles.filter(t => t.type === 'door');

        expect(doorTiles[0].position.y).toBe(0); // Top door
        expect(doorTiles[1].position.y).toBe(4); // Bottom door
      });

      it('should mirror blueprint horizontally', () => {
        const blueprint = world.createBlueprint({
          id: 'asymmetric',
          layout: [
            '###',
            'D.#',
            '###'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        const mirrored = blueprint.mirrorHorizontal();

        const tiles = mirrored.getTileList();
        const doorTile = tiles.find(t => t.type === 'door');

        expect(doorTile?.position.x).toBe(2); // Door moved from left to right
      });

      it('should mirror blueprint vertically', () => {
        const blueprint = world.createBlueprint({
          id: 'asymmetric',
          layout: [
            '###',
            '#.#',
            'D.#'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
          defaultDoorMaterial: 'wood_door',
        });

        const mirrored = blueprint.mirrorVertical();

        const tiles = mirrored.getTileList();
        const doorTile = tiles.find(t => t.type === 'door');

        expect(doorTile?.position.y).toBe(0); // Door moved from bottom to top
      });
    });
  });

  describe('Blueprint Library', () => {
    describe('predefined blueprints', () => {
      it('should include basic room templates', () => {
        const library = world.getBlueprintLibrary();

        expect(library.has('basic_3x3_room')).toBe(true);
        expect(library.has('basic_5x5_room')).toBe(true);
        expect(library.has('hallway_straight')).toBe(true);
      });

      it('should include house templates', () => {
        const library = world.getBlueprintLibrary();

        expect(library.has('small_house')).toBe(true);
        expect(library.has('medium_house')).toBe(true);
        expect(library.has('large_house')).toBe(true);
      });

      it('should include workshop templates', () => {
        const library = world.getBlueprintLibrary();

        expect(library.has('workshop_basic')).toBe(true);
        expect(library.has('workshop_large')).toBe(true);
      });

      it('should include defensive structure templates', () => {
        const library = world.getBlueprintLibrary();

        expect(library.has('wall_segment')).toBe(true);
        expect(library.has('gate')).toBe(true);
        expect(library.has('tower')).toBe(true);
      });
    });

    describe('custom blueprints', () => {
      it('should allow registering custom blueprints', () => {
        const blueprint = world.createBlueprint({
          id: 'custom_temple',
          name: 'Custom Temple',
          layout: [
            '#######',
            '#.....#',
            '#.....#',
            '###D###'
          ],
          defaultWallMaterial: 'stone_wall',
          defaultFloorMaterial: 'marble_floor',
          defaultDoorMaterial: 'wood_door',
        });

        world.registerBlueprint(blueprint);

        const library = world.getBlueprintLibrary();
        expect(library.has('custom_temple')).toBe(true);
      });

      it('should allow saving blueprints from existing structures', () => {
        // Build a structure manually
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(11, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(12, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(10, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeWallTile(12, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeFloorTile(11, 11, 'wood_floor');

        // Save as blueprint
        const blueprint = world.saveBlueprintFromRegion(10, 10, 12, 11, 'saved_structure');

        expect(blueprint.id).toBe('saved_structure');
        expect(blueprint.width).toBe(3);
        expect(blueprint.height).toBe(2);
      });
    });

    describe('blueprint search and filtering', () => {
      it('should filter blueprints by size', () => {
        const library = world.getBlueprintLibrary();

        const smallBlueprints = library.filterByMaxSize(5, 5);

        smallBlueprints.forEach(bp => {
          expect(bp.width).toBeLessThanOrEqual(5);
          expect(bp.height).toBeLessThanOrEqual(5);
        });
      });

      it('should filter blueprints by material', () => {
        const library = world.getBlueprintLibrary();

        const woodBlueprints = library.filterByMaterial('wood_wall');

        woodBlueprints.forEach(bp => {
          expect(bp.defaultWallMaterial).toBe('wood_wall');
        });
      });

      it('should filter blueprints by tag', () => {
        const library = world.getBlueprintLibrary();

        const residentialBlueprints = library.filterByTag('residential');

        expect(residentialBlueprints.length).toBeGreaterThan(0);
        residentialBlueprints.forEach(bp => {
          expect(bp.tags).toContain('residential');
        });
      });
    });
  });

  describe('Magic Integration', () => {
    describe('material creation spells', () => {
      it('should create blueprint from spell (create_material_building)', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        mage.learnSpell('create_material_building');

        // Cast spell to create a candy house
        mage.castSpell('create_material_building', {
          blueprintId: 'small_house',
          material: 'sugar_brick',
          position: { x: 20, y: 20 }
        });

        // House should be instantly constructed (spell power)
        const tile = world.getTileAt(20, 20);
        expect(tile.wall?.materialId).toBe('sugar_brick');
        expect(tile.wall?.progress).toBe(100); // Spell creates completed structure
      });

      it('should scale mana cost based on blueprint size', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        mage.learnSpell('create_material_building');

        const smallHouseCost = mage.getSpellCost('create_material_building', {
          blueprintId: 'small_house',
          material: 'wood_wall'
        });

        const largeHouseCost = mage.getSpellCost('create_material_building', {
          blueprintId: 'large_house',
          material: 'wood_wall'
        });

        expect(largeHouseCost).toBeGreaterThan(smallHouseCost);
      });

      it('should scale mana cost based on material rarity', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        mage.learnSpell('create_material_building');

        const woodCost = mage.getSpellCost('create_material_building', {
          blueprintId: 'small_house',
          material: 'wood_wall' // Common
        });

        const candyCost = mage.getSpellCost('create_material_building', {
          blueprintId: 'small_house',
          material: 'sugar_brick' // Very Rare
        });

        expect(candyCost).toBeGreaterThan(woodCost);
      });
    });

    describe('spell-created structures', () => {
      it('should mark spell-created structures with magical signature', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        mage.learnSpell('create_material_building');

        mage.castSpell('create_material_building', {
          blueprintId: 'small_house',
          material: 'shadow_essence',
          position: { x: 20, y: 20 }
        });

        const tile = world.getTileAt(20, 20);
        expect(tile.wall?.magicalSignature).toBeDefined();
        expect(tile.wall?.createdBySpell).toBe('create_material_building');
      });

      it('should trigger divine detection for large spell-created structures', () => {
        const mage = world.createAgent({ position: { x: 10, y: 10 } });
        mage.learnSpell('create_material_district');

        const events: any[] = [];
        world.eventBus.subscribe('divine:detection', (event) => events.push(event));

        mage.castSpell('create_material_district', {
          material: 'flesh_brick',
          position: { x: 50, y: 50 }
        });

        expect(events).toHaveLength(1);
        expect(events[0].data.detectionRisk).toBe('critical');
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if blueprint has invalid layout character', () => {
      expect(() => {
        world.createBlueprint({
          id: 'invalid',
          layout: ['#X#'], // 'X' is not a valid character
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });
      }).toThrow('Invalid layout character: X');
    });

    it('should throw if blueprint has inconsistent row widths', () => {
      expect(() => {
        world.createBlueprint({
          id: 'invalid',
          layout: [
            '###',
            '##', // Too short!
            '###'
          ],
          defaultWallMaterial: 'wood_wall',
          defaultFloorMaterial: 'wood_floor',
        });
      }).toThrow('Inconsistent row width at row 1: expected 3, got 2');
    });

    it('should throw if blueprint material does not exist', () => {
      expect(() => {
        world.createBlueprint({
          id: 'invalid',
          layout: ['###', '#.#', '###'],
          defaultWallMaterial: 'nonexistent_material',
          defaultFloorMaterial: 'wood_floor',
        });
      }).toThrow('Unknown material: nonexistent_material');
    });

    it('should throw if placing blueprint with no wall material specified', () => {
      expect(() => {
        // Test fixture: Intentionally omit defaultWallMaterial to test error handling
        const invalidConfig: Omit<BlueprintConfig, 'defaultWallMaterial'> = {
          id: 'invalid',
          layout: ['###', '#.#', '###'],
          defaultFloorMaterial: 'wood_floor',
          // Missing defaultWallMaterial - should trigger error
        };
        world.createBlueprint(invalidConfig as BlueprintConfig);
      }).toThrow('Blueprint has walls but no defaultWallMaterial specified');
    });

    it('should throw if rotating blueprint that does not exist', () => {
      const library = world.getBlueprintLibrary();

      expect(() => {
        library.get('nonexistent_blueprint')?.rotate90();
      }).toThrow(); // Will throw because get() returns undefined
    });
  });
});
