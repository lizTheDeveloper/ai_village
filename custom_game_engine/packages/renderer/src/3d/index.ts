/**
 * 3D Rendering Module
 *
 * Minecraft-style optimizations for voxel rendering:
 * - Greedy meshing for vertex reduction
 * - Chunk-based geometry batching
 * - Frustum culling
 * - Occlusion culling (cave culling)
 * - GPU instancing
 * - Worker thread meshing
 */

export { GreedyMesher, SimpleMesher, type MeshData, type BlockData } from './GreedyMesher.js';
export { ChunkMesh, type ChunkMeshConfig } from './ChunkMesh.js';
export { ChunkManager3D, type ChunkManager3DConfig } from './ChunkManager3D.js';
export { OcclusionCuller, type ChunkOcclusionData } from './OcclusionCuller.js';
export {
  InstancedRenderer,
  createBuildingGeometry,
  createPlantGeometry,
} from './InstancedRenderer.js';
export { MeshWorkerPool, type BlockData as WorkerBlockData } from './MeshWorkerPool.js';
