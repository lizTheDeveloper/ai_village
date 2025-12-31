import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';

/**
 * Room Detection System Specifications
 *
 * Per work order: Detect enclosed rooms via flood-fill algorithm and calculate
 * per-room temperature based on wall materials. Replaces abstract `interiorRadius`
 * with real room geometry.
 *
 * See: VOXEL_BUILDING_SYSTEM_PLAN.md Section 5
 */
describe('Room Detection System', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  describe('Flood-Fill Room Detection', () => {
    describe('simple enclosed rooms', () => {
      it('should detect a 3x3 enclosed room', () => {
        // Create a 3x3 room with walls
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor'); // Interior floor

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room).toBeDefined();
        expect(room?.area).toBe(1); // 1 floor tile
      });

      it('should detect room bounds (minX, maxX, minY, maxY)', () => {
        // Create 5x4 room
        for (let x = 0; x < 5; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 3, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 4; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(4, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        for (let x = 1; x < 4; x++) {
          for (let y = 1; y < 3; y++) {
            world.placeFloorTile(x, y, 'wood_floor');
          }
        }

        world.detectRooms();

        const room = world.getRoomAt(2, 1);
        expect(room?.bounds).toMatchObject({
          minX: 1,
          maxX: 3,
          minY: 1,
          maxY: 2
        });
      });

      it('should calculate room area (number of floor tiles)', () => {
        // Create 4x4 room
        for (let x = 0; x < 6; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 5, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 6; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(5, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        for (let x = 1; x < 5; x++) {
          for (let y = 1; y < 5; y++) {
            world.placeFloorTile(x, y, 'wood_floor');
          }
        }

        world.detectRooms();

        const room = world.getRoomAt(2, 2);
        expect(room?.area).toBe(16); // 4×4 = 16 floor tiles
      });

      it('should track all walls enclosing the room', () => {
        // 3x3 room = 8 wall tiles
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.wallTiles).toHaveLength(8);
      });
    });

    describe('rooms with doors', () => {
      it('should treat doors as room boundaries (stop flood-fill)', () => {
        // Create room with door
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeWallTile(0, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeDoorTile(2, 1, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 }); // Door on right
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.doorTiles).toHaveLength(1);
        expect(room?.doorTiles[0]).toMatchObject({ x: 2, y: 1 });
      });

      it('should detect multiple rooms connected by doors', () => {
        // Room 1
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeWallTile(0, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeWallTile(2, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeDoorTile(1, 2, { materialId: 'wood_door', health: 100, isOpen: false, orientation: 'horizontal', progress: 100, constructedAt: 0 }); // Door between rooms
        world.placeFloorTile(1, 1, 'wood_floor');

        // Room 2
        world.placeWallTile(0, 3, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeWallTile(2, 3, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 4, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeFloorTile(1, 3, 'wood_floor');

        world.detectRooms();

        const room1 = world.getRoomAt(1, 1);
        const room2 = world.getRoomAt(1, 3);

        expect(room1?.id).not.toBe(room2?.id); // Different rooms
        expect(room1?.doorTiles).toHaveLength(1);
        expect(room2?.doorTiles).toHaveLength(1);
      });
    });

    describe('open vs enclosed rooms', () => {
      it('should mark fully enclosed rooms as isEnclosed: true', () => {
        // Fully enclosed 3x3 room
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.isEnclosed).toBe(true);
      });

      it('should mark open rooms (missing walls) as isEnclosed: false', () => {
        // Room with missing wall section
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeWallTile(0, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        // Missing: placeWallTile(2, 1, ...) - open on right side
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.isEnclosed).toBe(false);
      });

      it('should mark rooms with open doors as enclosed', () => {
        // Room with open door is still "enclosed" (door exists, just open)
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        world.placeWallTile(0, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeDoorTile(2, 1, { materialId: 'wood_door', health: 100, isOpen: true, orientation: 'horizontal', progress: 100, constructedAt: 0 });
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.isEnclosed).toBe(true); // Still enclosed (door counts as boundary)
      });
    });

    describe('complex room shapes', () => {
      it('should detect L-shaped rooms', () => {
        // Create L-shaped room
        // ###
        // #.#
        // #.###
        // #...#
        // #####

        // Vertical part of L
        world.placeFloorTile(1, 1, 'wood_floor');
        world.placeFloorTile(1, 2, 'wood_floor');
        world.placeFloorTile(1, 3, 'wood_floor');

        // Horizontal part of L
        world.placeFloorTile(2, 3, 'wood_floor');
        world.placeFloorTile(3, 3, 'wood_floor');

        // Walls (simplified for example)
        // [Would need complete wall placement]

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.area).toBe(5); // 5 floor tiles in L shape
      });

      it('should detect multiple separate rooms', () => {
        // Room 1 at (1,1)
        world.placeFloorTile(1, 1, 'wood_floor');
        // [Walls for room 1...]

        // Room 2 at (10,10) - completely separate
        world.placeFloorTile(10, 10, 'wood_floor');
        // [Walls for room 2...]

        world.detectRooms();

        const rooms = world.getAllRooms();
        expect(rooms.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Material Properties and Insulation', () => {
    describe('wall material properties', () => {
      it('should calculate average insulation from wall materials', () => {
        // Create room with wood walls
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.averageInsulation).toBeGreaterThan(0);
      });

      it('should use temperatureResistance from MaterialTrait', () => {
        // Wood has temperatureResistance = 50 (from MaterialTrait)
        // Formula: insulation = (temperatureResistance + 100) / 200
        //         = (50 + 100) / 200 = 0.75

        // Create wood wall room
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.averageInsulation).toBeCloseTo(0.75, 2);
      });

      it('should calculate average when using mixed wall materials', () => {
        // 2 wood walls (insulation 0.75) + 2 stone walls (insulation 0.90)
        // Average = (0.75 + 0.75 + 0.90 + 0.90) / 4 = 0.825

        world.placeWallTile(0, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(1, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(0, 1, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeWallTile(1, 1, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeFloorTile(0.5, 0.5, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(0.5, 0.5);
        expect(room?.averageInsulation).toBeCloseTo(0.825, 2);
      });
    });

    describe('exotic wall materials', () => {
      it('should support flesh walls with low insulation', () => {
        // Flesh has temperatureResistance = -20
        // Insulation = (-20 + 100) / 200 = 0.40

        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'flesh_brick', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'flesh_brick', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'flesh_brick', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'flesh_brick', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.averageInsulation).toBeCloseTo(0.40, 2); // Poor insulation
      });

      it('should support ice walls with excellent insulation', () => {
        // Ice has temperatureResistance = 90
        // Insulation = (90 + 100) / 200 = 0.95

        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'eternal_ice', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'eternal_ice', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'eternal_ice', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'eternal_ice', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        expect(room?.averageInsulation).toBeCloseTo(0.95, 2); // Excellent insulation
      });
    });
  });

  describe('Room Temperature Simulation', () => {
    describe('enclosed room temperature', () => {
      it('should maintain different temperature than outside', () => {
        world.setWorldTemperature(0); // Cold outside

        // Create well-insulated room
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();
        world.tick(3600); // 1 hour passes

        const room = world.getRoomAt(1, 1);
        expect(room?.currentTemperature).toBeGreaterThan(0); // Warmer than outside
      });

      it('should gradually approach world temperature (heat transfer)', () => {
        world.setWorldTemperature(30); // Hot outside

        // Create room starting at 20°C
        for (let x = 0; x < 3; x++) {
          world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
          world.placeWallTile(x, 2, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        }
        for (let y = 0; y < 3; y++) {
          world.placeWallTile(0, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
          world.placeWallTile(2, y, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        }
        world.placeFloorTile(1, 1, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(1, 1);
        const startTemp = room?.currentTemperature || 20;

        world.tick(3600); // 1 hour

        expect(room?.currentTemperature).toBeGreaterThan(startTemp); // Warming up
        expect(room?.currentTemperature).toBeLessThan(30); // Not yet equilibrium
      });

      it('should have slower temperature change with better insulation', () => {
        world.setWorldTemperature(30);

        // Poor insulation room (flesh walls)
        const room1 = this.createRoom(world, 0, 0, 'flesh_brick');

        // Good insulation room (stone walls)
        const room2 = this.createRoom(world, 10, 10, 'stone_wall');

        world.detectRooms();
        world.tick(1800); // 30 minutes

        const tempChange1 = Math.abs(room1.currentTemperature - 20);
        const tempChange2 = Math.abs(room2.currentTemperature - 20);

        expect(tempChange1).toBeGreaterThan(tempChange2); // Poor insulation changes faster
      });
    });

    describe('non-enclosed room temperature', () => {
      it('should match world temperature immediately', () => {
        world.setWorldTemperature(25);

        // Create room with missing wall (open to exterior)
        world.placeWallTile(0, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(1, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(0, 1, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        // Missing: placeWallTile(1, 1, ...) - open on right
        world.placeFloorTile(0.5, 0.5, 'wood_floor');

        world.detectRooms();

        const room = world.getRoomAt(0.5, 0.5);
        expect(room?.isEnclosed).toBe(false);
        expect(room?.currentTemperature).toBe(25); // Matches world temp
      });
    });
  });

  describe('Agent Temperature Effects', () => {
    it('should use room temperature for agents inside rooms', () => {
      world.setWorldTemperature(0); // Cold outside

      // Create warm room
      for (let x = 0; x < 3; x++) {
        world.placeWallTile(x, 0, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
        world.placeWallTile(x, 2, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
      }
      for (let y = 0; y < 3; y++) {
        world.placeWallTile(0, y, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
        world.placeWallTile(2, y, { materialId: 'stone_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
      }
      world.placeFloorTile(1, 1, 'wood_floor');

      world.detectRooms();

      const agent = world.createAgent({ position: { x: 1, y: 1 } }); // Inside room

      const effectiveTemp = agent.getEffectiveTemperature();
      expect(effectiveTemp).toBeGreaterThan(0); // Room temp, not world temp
    });

    it('should use world temperature for agents outside', () => {
      world.setWorldTemperature(0);

      const agent = world.createAgent({ position: { x: 100, y: 100 } }); // Outside

      const effectiveTemp = agent.getEffectiveTemperature();
      expect(effectiveTemp).toBe(0); // World temperature
    });
  });

  describe('Room Updates', () => {
    it('should recalculate rooms every N ticks (not every frame)', () => {
      world.placeFloorTile(1, 1, 'wood_floor');

      let recalculations = 0;
      const originalDetect = world.detectRooms;
      world.detectRooms = () => {
        recalculations++;
        return originalDetect.call(world);
      };

      world.tick(60); // 3 seconds at 20 TPS = 3 recalculations (every 1 second)

      expect(recalculations).toBe(3);
    });

    it('should invalidate cache when walls are added/removed', () => {
      world.detectRooms();
      const roomsBefore = world.getAllRooms().length;

      // Add new room
      for (let x = 0; x < 3; x++) {
        world.placeWallTile(x, 0, { materialId: 'wood_wall', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
      }
      world.placeFloorTile(1, 1, 'wood_floor');

      world.detectRooms(); // Should recalculate

      const roomsAfter = world.getAllRooms().length;
      expect(roomsAfter).toBeGreaterThan(roomsBefore);
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if querying room at invalid coordinates', () => {
      expect(() => {
        world.getRoomAt(-1, -1);
      }).toThrow('Invalid coordinates: -1,-1');
    });

    it('should throw if material has no MaterialTrait', () => {
      world.placeWallTile(0, 0, { materialId: 'invalid_material', health: 100, progress: 100, constructedAt: 0, orientation: 'north' });

      expect(() => {
        world.detectRooms();
      }).toThrow('Material invalid_material has no MaterialTrait');
    });
  });

  // Helper method
  private createRoom(world: WorldImpl, originX: number, originY: number, materialId: string): any {
    for (let x = 0; x < 3; x++) {
      world.placeWallTile(originX + x, originY, { materialId, health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
      world.placeWallTile(originX + x, originY + 2, { materialId, health: 100, progress: 100, constructedAt: 0, orientation: 'north' });
    }
    for (let y = 0; y < 3; y++) {
      world.placeWallTile(originX, originY + y, { materialId, health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
      world.placeWallTile(originX + 2, originY + y, { materialId, health: 100, progress: 100, constructedAt: 0, orientation: 'east' });
    }
    world.placeFloorTile(originX + 1, originY + 1, 'wood_floor');

    return world.getRoomAt(originX + 1, originY + 1);
  }
});
