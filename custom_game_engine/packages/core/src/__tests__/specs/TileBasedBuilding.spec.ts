import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Tile-Based Building System Specifications
 *
 * Per work order: Transform building system from monolithic entities to RimWorld/Dwarf Fortress-style
 * tile-based construction. Buildings are composed of individual wall, floor, and door tiles.
 *
 * See: VOXEL_BUILDING_SYSTEM_PLAN.md
 */
describe('Tile-Based Building System', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Tile Structure', () => {
    describe('wall tiles', () => {
      it('should allow placing a wall tile at coordinates', () => {
        world.placeWallTile(10, 10, {
          materialId: 'wood_wall',
          health: 100,
          orientation: 'north',
          progress: 100,
          constructedAt: world.tick
        });

        const tile = world.getTileAt(10, 10);
        expect(tile.wall).toBeDefined();
        expect(tile.wall?.materialId).toBe('wood_wall');
        expect(tile.wall?.health).toBe(100);
      });

      it('should track construction progress (0-100)', () => {
        world.placeWallTile(10, 10, {
          materialId: 'wood_wall',
          health: 100,
          orientation: 'north',
          progress: 50, // Under construction
          builderId: 'agent-123',
          constructedAt: world.tick
        });

        const tile = world.getTileAt(10, 10);
        expect(tile.wall?.progress).toBe(50);
        expect(tile.wall?.builderId).toBe('agent-123');
      });

      it('should auto-determine wall orientation from neighbors', () => {
        // Place walls in a line (north-south orientation)
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(10, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(10, 12, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const middleTile = world.getTileAt(10, 11);
        expect(middleTile.wall?.orientation).toBe('north'); // Vertical wall
      });

      it('should detect corner walls', () => {
        // Place L-shaped walls
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(10, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(11, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });

        const cornerTile = world.getTileAt(10, 11);
        expect(cornerTile.wall?.orientation).toBe('corner');
      });

      it('should support different wall materials', () => {
        world.placeWallTile(10, 10, { materialId: 'flesh_brick', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const tile = world.getTileAt(10, 10);
        expect(tile.wall?.materialId).toBe('flesh_brick');
      });

      it('should throw if trying to place wall on occupied tile', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        expect(() => {
          world.placeWallTile(10, 10, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }).toThrow('Tile 10,10 already has a wall');
      });
    });

    describe('door tiles', () => {
      it('should allow placing a door tile', () => {
        world.placeDoorTile(10, 10, {
          materialId: 'wood_door',
          health: 100,
          isOpen: false,
          orientation: 'horizontal',
          progress: 100,
          constructedAt: world.tick
        });

        const tile = world.getTileAt(10, 10);
        expect(tile.door).toBeDefined();
        expect(tile.door?.isOpen).toBe(false);
      });

      it('should allow opening and closing doors', () => {
        world.placeDoorTile(10, 10, {
          materialId: 'wood_door',
          health: 100,
          isOpen: false,
          orientation: 'horizontal',
          progress: 100,
          constructedAt: 0
        });

        world.openDoor(10, 10);
        expect(world.getTileAt(10, 10).door?.isOpen).toBe(true);

        world.closeDoor(10, 10);
        expect(world.getTileAt(10, 10).door?.isOpen).toBe(false);
      });

      it('should determine door orientation (horizontal/vertical)', () => {
        // Horizontal door (in a north-south wall)
        world.placeWallTile(10, 9, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });
        world.placeWallTile(10, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const door = world.getTileAt(10, 10).door;
        expect(door?.orientation).toBe('horizontal');
      });

      it('should throw if trying to place door without adjacent walls', () => {
        expect(() => {
          world.placeDoorTile(100, 100, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });
        }).toThrow('Door requires adjacent walls');
      });
    });

    describe('floor tiles', () => {
      it('should allow placing floor tiles', () => {
        world.placeFloorTile(10, 10, 'wood_floor');

        const tile = world.getTileAt(10, 10);
        expect(tile.floor).toBe('wood_floor');
      });

      it('should allow different floor materials', () => {
        world.placeFloorTile(10, 10, 'stone_floor');
        world.placeFloorTile(11, 11, 'candy_floor');

        expect(world.getTileAt(10, 10).floor).toBe('stone_floor');
        expect(world.getTileAt(11, 11).floor).toBe('candy_floor');
      });
    });

    describe('tile combinations', () => {
      it('should allow floor + wall on same tile', () => {
        world.placeFloorTile(10, 10, 'wood_floor');
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const tile = world.getTileAt(10, 10);
        expect(tile.floor).toBe('wood_floor');
        expect(tile.wall).toBeDefined();
      });

      it('should allow floor + door on same tile', () => {
        world.placeFloorTile(10, 10, 'wood_floor');
        world.placeWallTile(10, 9, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(10, 11, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });

        const tile = world.getTileAt(10, 10);
        expect(tile.floor).toBe('wood_floor');
        expect(tile.door).toBeDefined();
      });

      it('should not allow wall + door on same tile', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        expect(() => {
          world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });
        }).toThrow('Cannot place door on tile with wall');
      });
    });

    describe('window tiles (future)', () => {
      it('should allow placing window tiles', () => {
        world.placeWindowTile(10, 10, {
          materialId: 'glass_window',
          health: 100,
          orientation: 'horizontal',
          progress: 100,
          constructedAt: 0
        });

        const tile = world.getTileAt(10, 10);
        expect(tile.window).toBeDefined();
      });
    });
  });

  describe('Movement Integration', () => {
    describe('wall collision', () => {
      it('should block movement through walls', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const agent = world.createAgent({ position: { x: 9, y: 10 } });
        agent.moveTowards(11, 10);

        expect(agent.position.x).toBe(9); // Blocked by wall
      });

      it('should allow movement around walls', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const agent = world.createAgent({ position: { x: 9, y: 10 } });
        agent.moveTowards(9, 11); // Move around wall

        expect(agent.position.y).toBe(11);
      });
    });

    describe('door navigation', () => {
      it('should block movement through closed doors', () => {
        world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });

        const agent = world.createAgent({ position: { x: 9, y: 10 } });
        agent.moveTowards(11, 10);

        expect(agent.position.x).toBe(9); // Blocked by closed door
      });

      it('should allow movement through open doors', () => {
        world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: true, orientation: 'horizontal', progress: 100, constructedAt: 0 });

        const agent = world.createAgent({ position: { x: 9, y: 10 } });
        agent.moveTowards(11, 10);

        expect(agent.position.x).toBeCloseTo(11, 1);
      });

      it('should auto-open doors when agent approaches', () => {
        world.placeDoorTile(10, 10, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 });

        const agent = world.createAgent({ position: { x: 9.5, y: 10 } });
        world.tick(1); // Door interaction system runs

        expect(world.getTileAt(10, 10).door?.isOpen).toBe(true);
      });
    });

    describe('partially-built structures', () => {
      it('should block movement through partially-built walls (progress < 100)', () => {
        world.placeWallTile(10, 10, {
          materialId: 'wood_wall',
          health: 100,
          progress: 50, // Under construction
          constructedAt: 0,
          orientation: 'north'
        });

        const agent = world.createAgent({ position: { x: 9, y: 10 } });
        agent.moveTowards(11, 10);

        expect(agent.position.x).toBe(9); // Still blocks
      });
    });
  });

  describe('Tile Modification and Damage', () => {
    describe('wall damage', () => {
      it('should reduce wall health when damaged', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        world.damageWall(10, 10, 30);

        expect(world.getTileAt(10, 10).wall?.health).toBe(70);
      });

      it('should remove wall when health reaches 0', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        world.damageWall(10, 10, 100);

        expect(world.getTileAt(10, 10).wall).toBeUndefined();
      });

      it('should drop materials when wall is destroyed', () => {
        world.placeWallTile(10, 10, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const items = world.damageWall(10, 10, 100);

        expect(items).toContainEqual({ itemId: 'wood_wall', amount: 1 });
      });
    });

    describe('demolition', () => {
      it('should allow manual demolition of walls', () => {
        world.placeWallTile(10, 10, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        world.demolishWall(10, 10);

        expect(world.getTileAt(10, 10).wall).toBeUndefined();
      });

      it('should recover materials on demolition', () => {
        world.placeWallTile(10, 10, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

        const recovered = world.demolishWall(10, 10);

        expect(recovered).toContainEqual({ itemId: 'stone_wall', amount: 1 });
      });

      it('should recover partial materials from damaged walls', () => {
        world.placeWallTile(10, 10, { materialId: 'stone_wall', health: 50, progress: 100, constructedAt: 0, orientation: 'north' });

        const recovered = world.demolishWall(10, 10);

        expect(recovered).toContainEqual({ itemId: 'stone_wall', amount: 0.5 });
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if placing tile on invalid coordinates', () => {
      expect(() => {
        world.placeWallTile(-1, -1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
      }).toThrow('Invalid tile coordinates: -1,-1');
    });

    it('should throw if using non-existent material', () => {
      expect(() => {
        world.placeWallTile(10, 10, { materialId: 'nonexistent_material', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
      }).toThrow('Unknown material: nonexistent_material');
    });

    it('should throw if opening non-existent door', () => {
      expect(() => {
        world.openDoor(100, 100);
      }).toThrow('No door at 100,100');
    });

    it('should throw if demolishing non-existent wall', () => {
      expect(() => {
        world.demolishWall(100, 100);
      }).toThrow('No wall at 100,100');
    });
  });
});
