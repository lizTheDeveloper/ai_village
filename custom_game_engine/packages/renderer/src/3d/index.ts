/**
 * 3D Rendering Module
 *
 * Minecraft-style optimizations for voxel rendering:
 * - Greedy meshing for vertex reduction
 * - Chunk-based geometry batching
 * - Frustum culling
 * - GPU instancing
 */

export { GreedyMesher, SimpleMesher, type MeshData, type BlockData } from './GreedyMesher.js';
export { ChunkMesh, type ChunkMeshConfig } from './ChunkMesh.js';
export { ChunkManager3D, type ChunkManager3DConfig } from './ChunkManager3D.js';
export {
  InstancedRenderer,
  createBuildingGeometry,
  createPlantGeometry,
} from './InstancedRenderer.js';
