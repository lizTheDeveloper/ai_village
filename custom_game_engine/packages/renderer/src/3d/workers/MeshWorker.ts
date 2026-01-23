/**
 * MeshWorker - Web Worker for CPU-intensive mesh generation
 *
 * Offloads greedy meshing from main thread to prevent frame drops.
 * Uses transferable arrays for zero-copy data transfer.
 */

import { GreedyMesher, type MeshData } from '../GreedyMesher.js';

/** Request message format */
interface MeshRequest {
  type: 'mesh';
  chunkX: number;
  chunkZ: number;
  blocks: ArrayBuffer; // Transferable block data (type + color packed)
  chunkSize: number;
  chunkHeight: number;
}

/** Response message format */
interface MeshResponse {
  type: 'mesh_complete';
  chunkX: number;
  chunkZ: number;
  meshData: {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
    vertexCount: number;
    indexCount: number;
  };
}

/**
 * Worker message handler
 */
self.onmessage = (e: MessageEvent<MeshRequest>) => {
  const { chunkX, chunkZ, blocks, chunkSize, chunkHeight } = e.data;

  // Deserialize block data from ArrayBuffer
  // Format: [type0, color0, type1, color1, ...]
  const blockView = new Uint32Array(blocks);

  const getBlock = (x: number, y: number, z: number): number => {
    if (
      x < 0 ||
      x >= chunkSize ||
      y < 0 ||
      y >= chunkHeight ||
      z < 0 ||
      z >= chunkSize
    ) {
      return 0; // Air for out-of-bounds
    }
    const idx = x + z * chunkSize + y * chunkSize * chunkSize;
    return blockView[idx * 2] ?? 0; // type
  };

  const getColor = (x: number, y: number, z: number): number => {
    if (
      x < 0 ||
      x >= chunkSize ||
      y < 0 ||
      y >= chunkHeight ||
      z < 0 ||
      z >= chunkSize
    ) {
      return 0x9ca3af; // Default gray for out-of-bounds
    }
    const idx = x + z * chunkSize + y * chunkSize * chunkSize;
    return blockView[idx * 2 + 1] ?? 0x9ca3af; // color
  };

  // Run meshing (CPU intensive, but in worker!)
  const mesher = new GreedyMesher(chunkSize, chunkHeight);
  const meshData = mesher.mesh(getBlock, getColor);

  // Build response
  const response: MeshResponse = {
    type: 'mesh_complete',
    chunkX,
    chunkZ,
    meshData: {
      positions: meshData.positions,
      normals: meshData.normals,
      colors: meshData.colors,
      indices: meshData.indices,
      vertexCount: meshData.vertexCount,
      indexCount: meshData.indexCount,
    },
  };

  // Transfer arrays back (zero-copy)
  const transferables = [
    meshData.positions.buffer,
    meshData.normals.buffer,
    meshData.colors.buffer,
    meshData.indices.buffer,
  ];
  // postMessage is a global in worker scope
  postMessage(response, { transfer: transferables });
};
