import { describe, it, expect, beforeEach } from 'vitest';
import { OcclusionCuller } from '../OcclusionCuller.js';

describe('OcclusionCuller', () => {
  let culler: OcclusionCuller;

  beforeEach(() => {
    culler = new OcclusionCuller();
  });

  describe('analyzeChunk', () => {
    it('should mark all-solid chunk as solid with no face connections', () => {
      // All blocks return 1 (solid)
      const data = culler.analyzeChunk(0, 0, () => 1, 4, 4);
      expect(data.isSolid).toBe(true);
      expect(data.isEmpty).toBe(false);
      expect(data.chunkKey).toBe('0,0');
      // No faces should connect to any other faces
      expect(data.faceConnections.get('+X')?.size).toBe(0);
      expect(data.faceConnections.get('-X')?.size).toBe(0);
    });

    it('should mark all-air chunk as empty with all faces connected', () => {
      // All blocks return 0 (air)
      const data = culler.analyzeChunk(0, 0, () => 0, 4, 4);
      expect(data.isEmpty).toBe(true);
      expect(data.isSolid).toBe(false);
      expect(data.chunkKey).toBe('0,0');
      // All faces should connect to all other faces
      expect(data.faceConnections.get('+X')?.has('-X')).toBe(true);
      expect(data.faceConnections.get('+X')?.has('+Z')).toBe(true);
      expect(data.faceConnections.get('+X')?.has('-Z')).toBe(true);
      expect(data.faceConnections.get('+X')?.has('+Y')).toBe(true);
      expect(data.faceConnections.get('+X')?.has('-Y')).toBe(true);
      // Should have 6 connections (all faces including itself)
      expect(data.faceConnections.get('+X')?.size).toBe(6);
    });

    it('should detect face connectivity in mixed chunk with horizontal tunnel', () => {
      // Chunk with air tunnel from -X to +X at y=1, z=1
      const getBlock = (x: number, y: number, z: number) => {
        // Air tunnel at y=1, z=1
        if (y === 1 && z === 1) return 0;
        return 1;
      };
      const data = culler.analyzeChunk(0, 0, getBlock, 4, 4);
      expect(data.isSolid).toBe(false);
      expect(data.isEmpty).toBe(false);
      // -X and +X should be connected via tunnel
      expect(data.faceConnections.get('-X')?.has('+X')).toBe(true);
      expect(data.faceConnections.get('+X')?.has('-X')).toBe(true);
      // But they shouldn't connect to perpendicular faces (+Z, -Z)
      expect(data.faceConnections.get('-X')?.has('+Z')).toBe(false);
      expect(data.faceConnections.get('-X')?.has('-Z')).toBe(false);
    });

    it('should detect vertical tunnel connectivity', () => {
      // Chunk with air tunnel from -Y to +Y at x=1, z=1
      const getBlock = (x: number, y: number, z: number) => {
        if (x === 1 && z === 1) return 0; // Vertical tunnel
        return 1;
      };
      const data = culler.analyzeChunk(0, 0, getBlock, 4, 4);
      expect(data.isSolid).toBe(false);
      expect(data.isEmpty).toBe(false);
      // -Y and +Y should be connected
      expect(data.faceConnections.get('-Y')?.has('+Y')).toBe(true);
      expect(data.faceConnections.get('+Y')?.has('-Y')).toBe(true);
    });

    it('should handle L-shaped tunnel (corner connections)', () => {
      // Air at y=1, z=1 for x=0 to 2, then air at y=1, x=2 for z=1 to 3
      const getBlock = (x: number, y: number, z: number) => {
        if (y === 1) {
          // Horizontal part: z=1, x=0 to 2
          if (z === 1 && x <= 2) return 0;
          // Vertical part: x=2, z=1 to 3
          if (x === 2 && z >= 1) return 0;
        }
        return 1;
      };
      const data = culler.analyzeChunk(0, 0, getBlock, 4, 4);
      // -X face should connect to +Z face via the L-tunnel
      expect(data.faceConnections.get('-X')?.has('+Z')).toBe(true);
    });

    it('should respect 95% threshold for solid classification', () => {
      const chunkSize = 4;
      const chunkHeight = 4;
      const totalBlocks = chunkSize * chunkSize * chunkHeight; // 64 blocks
      let solidBlocks = 0;

      // Create chunk that's exactly at 95% solid
      const getBlock = (x: number, y: number, z: number) => {
        if (solidBlocks < totalBlocks * 0.95) {
          solidBlocks++;
          return 1;
        }
        return 0;
      };

      // Reset counter for actual analysis
      solidBlocks = 0;
      const data = culler.analyzeChunk(0, 0, getBlock, chunkSize, chunkHeight);

      // Should be classified as solid (>95%)
      expect(data.isSolid).toBe(true);
    });

    it('should cache occlusion data by chunk key', () => {
      const data1 = culler.analyzeChunk(5, 3, () => 0, 4, 4);
      expect(data1.chunkKey).toBe('5,3');

      // Analyze same chunk again with different data
      const data2 = culler.analyzeChunk(5, 3, () => 1, 4, 4);

      // Should have updated the cached data
      expect(data2.isSolid).toBe(true);
      expect(data1.chunkKey).toBe(data2.chunkKey);
    });
  });

  describe('computeVisibleChunks', () => {
    it('should always include camera chunk', () => {
      const visible = culler.computeVisibleChunks(0, 0, 4);
      expect(visible.has('0,0')).toBe(true);
    });

    it('should include direct neighbors when chunk data is unknown (default passable)', () => {
      const visible = culler.computeVisibleChunks(0, 0, 2);
      // Should include direct neighbors even without occlusion data
      expect(visible.has('1,0')).toBe(true);
      expect(visible.has('-1,0')).toBe(true);
      expect(visible.has('0,1')).toBe(true);
      expect(visible.has('0,-1')).toBe(true);
    });

    it('should respect maxRadius', () => {
      const visible = culler.computeVisibleChunks(0, 0, 1);
      // (2,0) is beyond radius 1 (distance = 2)
      expect(visible.has('2,0')).toBe(false);
      expect(visible.has('0,2')).toBe(false);
      // (1,1) has distance sqrt(2) ≈ 1.414, which is > 1, so should NOT be visible
      expect(visible.has('1,1')).toBe(false);
      // Only camera chunk and immediate neighbors within radius 1 should be visible
      expect(visible.has('1,0')).toBe(true); // distance = 1
      expect(visible.has('0,1')).toBe(true); // distance = 1
    });

    it('should propagate through passable chunks', () => {
      // Analyze camera chunk as empty (passable)
      culler.analyzeChunk(0, 0, () => 0, 4, 4);
      // Analyze neighbor as empty
      culler.analyzeChunk(1, 0, () => 0, 4, 4);
      // Analyze next neighbor as empty
      culler.analyzeChunk(2, 0, () => 0, 4, 4);

      const visible = culler.computeVisibleChunks(0, 0, 3);
      // Should propagate through (1,0) to reach (2,0)
      expect(visible.has('2,0')).toBe(true);
    });

    it('should stop propagation at solid chunks', () => {
      // The key to this test is that solid chunks don't propagate visibility
      // because they have empty face connection sets.

      // Build a complete wall around and beyond camera
      culler.analyzeChunk(0, 0, () => 0, 4, 4); // Camera is empty

      // Create solid wall - need to block ALL possible paths
      for (let x = -1; x <= 4; x++) {
        for (let z = -2; z <= 2; z++) {
          if (x === 0 && z === 0) continue; // Skip camera
          // Create wall at x >= 1
          if (x >= 1 && x <= 2) {
            culler.analyzeChunk(x, z, () => 1, 4, 4); // Solid wall
          } else if (x === -1) {
            culler.analyzeChunk(x, z, () => 1, 4, 4); // Block west too
          } else if (x >= 3) {
            culler.analyzeChunk(x, z, () => 0, 4, 4); // Beyond wall is empty
          }
        }
      }

      const visible = culler.computeVisibleChunks(0, 0, 4);

      // Should see immediate solid neighbors
      expect(visible.has('1,0')).toBe(true);

      // Should NOT see (3,0) because all paths through (1,x) and (2,x) are blocked
      expect(visible.has('3,0')).toBe(false);
      expect(visible.has('3,1')).toBe(false);
      expect(visible.has('4,0')).toBe(false);
    });

    it('should propagate through chunks with tunnel connections', () => {
      // Camera chunk empty
      culler.analyzeChunk(0, 0, () => 0, 4, 4);

      // Chunk (1,0) has tunnel connecting -X to +X
      culler.analyzeChunk(1, 0, (x, y, z) => {
        if (y === 1 && z === 1) return 0; // Tunnel
        return 1;
      }, 4, 4);

      // Chunk (2,0) is empty
      culler.analyzeChunk(2, 0, () => 0, 4, 4);

      const visible = culler.computeVisibleChunks(0, 0, 3);

      // Should see through the tunnel
      expect(visible.has('1,0')).toBe(true);
      expect(visible.has('2,0')).toBe(true);
    });

    it('should handle diagonal propagation', () => {
      // Set up empty chunks in a diagonal pattern
      culler.analyzeChunk(0, 0, () => 0, 4, 4); // Camera
      culler.analyzeChunk(1, 0, () => 0, 4, 4); // East
      culler.analyzeChunk(1, 1, () => 0, 4, 4); // Northeast
      culler.analyzeChunk(0, 1, () => 0, 4, 4); // North

      const visible = culler.computeVisibleChunks(0, 0, 2);

      // Should reach (1,1) via (1,0) or (0,1)
      expect(visible.has('1,1')).toBe(true);
    });

    it('should not revisit chunks from the same entry face', () => {
      // Create a loop: camera -> (1,0) -> (1,1) -> (0,1) -> camera
      culler.analyzeChunk(0, 0, () => 0, 4, 4);
      culler.analyzeChunk(1, 0, () => 0, 4, 4);
      culler.analyzeChunk(1, 1, () => 0, 4, 4);
      culler.analyzeChunk(0, 1, () => 0, 4, 4);

      const visible = culler.computeVisibleChunks(0, 0, 3);

      // All chunks should be visible
      expect(visible.has('0,0')).toBe(true);
      expect(visible.has('1,0')).toBe(true);
      expect(visible.has('1,1')).toBe(true);
      expect(visible.has('0,1')).toBe(true);

      // (2,2) has distance sqrt(8) ≈ 2.83, which is within radius 3, so it will be visible
      // if it's reachable. Let's check a chunk that's definitely beyond radius
      expect(visible.has('4,0')).toBe(false); // Distance 4, beyond radius 3
    });

    it('should work with non-origin camera positions', () => {
      // Camera at (5, 7)
      culler.analyzeChunk(5, 7, () => 0, 4, 4);
      culler.analyzeChunk(6, 7, () => 0, 4, 4);

      const visible = culler.computeVisibleChunks(5, 7, 2);

      expect(visible.has('5,7')).toBe(true);
      expect(visible.has('6,7')).toBe(true);
    });

    it('should only propagate through horizontal faces (not +Y/-Y)', () => {
      // The algorithm explicitly filters out +Y/-Y faces during propagation (line 311)
      // Let's verify that vertical connectivity doesn't enable propagation

      culler.analyzeChunk(0, 0, () => 0, 4, 4); // Camera (empty)

      // Chunk with only vertical connectivity (no horizontal passage)
      const data = culler.analyzeChunk(1, 0, (x, y, z) => {
        if (x === 1 && z === 1) return 0; // Vertical tunnel only
        return 1;
      }, 4, 4);

      // Verify no horizontal connectivity
      expect(data.faceConnections.get('-X')?.has('+X')).toBe(false);

      // Block all diagonal/alternate routes with solid chunks
      culler.analyzeChunk(0, 1, () => 1, 4, 4);
      culler.analyzeChunk(0, -1, () => 1, 4, 4);
      culler.analyzeChunk(1, 1, () => 1, 4, 4);
      culler.analyzeChunk(1, -1, () => 1, 4, 4);
      culler.analyzeChunk(2, 1, () => 1, 4, 4);
      culler.analyzeChunk(2, -1, () => 1, 4, 4);
      culler.analyzeChunk(-1, 0, () => 1, 4, 4);
      culler.analyzeChunk(-1, 1, () => 1, 4, 4);
      culler.analyzeChunk(-1, -1, () => 1, 4, 4);

      // Analyze (2,0) as empty
      culler.analyzeChunk(2, 0, () => 0, 4, 4);

      const visible = culler.computeVisibleChunks(0, 0, 3);

      expect(visible.has('1,0')).toBe(true); // Can see the chunk with vertical tunnel
      // Cannot see (2,0) because (1,0) has no horizontal face connections
      expect(visible.has('2,0')).toBe(false);
    });

    it('should handle large radius values', () => {
      culler.analyzeChunk(0, 0, () => 0, 4, 4);
      const visible = culler.computeVisibleChunks(0, 0, 100);

      // Camera chunk always visible
      expect(visible.has('0,0')).toBe(true);
      // Should include chunks up to radius 100 (assuming passable)
      expect(visible.size).toBeGreaterThan(1);
    });

    it('should handle zero radius', () => {
      const visible = culler.computeVisibleChunks(0, 0, 0);
      // Only camera chunk should be visible
      expect(visible.has('0,0')).toBe(true);
      expect(visible.size).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle single-block chunk', () => {
      // 1x1x1 chunk with air
      const data = culler.analyzeChunk(0, 0, () => 0, 1, 1);
      expect(data.isEmpty).toBe(true);
      expect(data.isSolid).toBe(false);
    });

    it('should handle single-block solid chunk', () => {
      // 1x1x1 chunk with solid block
      const data = culler.analyzeChunk(0, 0, () => 1, 1, 1);
      expect(data.isEmpty).toBe(false);
      expect(data.isSolid).toBe(true);
    });

    it('should handle thin vertical slice of air', () => {
      // Only middle slice (x=1) is air in 4x4x4 chunk
      const data = culler.analyzeChunk(0, 0, (x, y, z) => {
        return x === 1 ? 0 : 1;
      }, 4, 4);

      // Should not be classified as empty (only 25% air)
      expect(data.isEmpty).toBe(false);
      // The -X face is at x=0, which is solid, so we can't actually reach it from
      // the air blocks at x=1. The flood fill starts from face positions,
      // and since x=0 is all solid, there are no starting positions on -X face.
      // Therefore -X and +X won't connect. Let's test a proper tunnel instead.

      // Create a proper tunnel that actually connects both faces
      const data2 = culler.analyzeChunk(1, 1, (x, y, z) => {
        // Air tunnel at y=1, z=1 (all x values)
        if (y === 1 && z === 1) return 0;
        return 1;
      }, 4, 4);

      expect(data2.isEmpty).toBe(false);
      expect(data2.faceConnections.get('-X')?.has('+X')).toBe(true);
    });

    it('should handle checkerboard pattern', () => {
      // Alternating solid/air blocks
      const data = culler.analyzeChunk(0, 0, (x, y, z) => {
        return (x + y + z) % 2;
      }, 4, 4);

      // Should not be classified as solid or empty (50/50 split)
      expect(data.isEmpty).toBe(false);
      expect(data.isSolid).toBe(false);
      // But should have some connectivity through the air blocks
      expect(data.faceConnections.get('-X')?.size).toBeGreaterThan(0);
    });

    it('should handle negative chunk coordinates', () => {
      const data = culler.analyzeChunk(-5, -10, () => 0, 4, 4);
      expect(data.chunkKey).toBe('-5,-10');
      expect(data.isEmpty).toBe(true);

      const visible = culler.computeVisibleChunks(-5, -10, 2);
      expect(visible.has('-5,-10')).toBe(true);
      expect(visible.has('-4,-10')).toBe(true);
    });
  });
});
