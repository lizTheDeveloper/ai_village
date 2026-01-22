/**
 * InstancedRenderer - GPU instancing for repeated objects
 *
 * Uses THREE.InstancedMesh for efficient rendering of many
 * identical objects (buildings, plants, etc.) with different transforms.
 */

import * as THREE from 'three';

/** Instance data */
interface InstanceData {
  id: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  color: THREE.Color;
  index: number;
}

/** Instanced object group configuration */
interface InstanceGroupConfig {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  maxInstances: number;
}

/**
 * InstancedRenderer manages groups of instanced objects
 */
export class InstancedRenderer {
  private scene: THREE.Scene;
  private groups: Map<string, InstanceGroup> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Create a new instance group
   */
  createGroup(
    groupId: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number = 1000
  ): void {
    if (this.groups.has(groupId)) {
      console.warn(`Instance group ${groupId} already exists`);
      return;
    }

    const group = new InstanceGroup(geometry, material, maxInstances);
    group.addToScene(this.scene);
    this.groups.set(groupId, group);
  }

  /**
   * Add an instance to a group
   */
  addInstance(
    groupId: string,
    instanceId: string,
    position: THREE.Vector3,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    color: THREE.Color = new THREE.Color(0xffffff)
  ): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      console.warn(`Instance group ${groupId} not found`);
      return false;
    }
    return group.addInstance(instanceId, position, scale, color);
  }

  /**
   * Update an instance's transform
   */
  updateInstance(
    groupId: string,
    instanceId: string,
    position?: THREE.Vector3,
    scale?: THREE.Vector3,
    color?: THREE.Color
  ): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;
    return group.updateInstance(instanceId, position, scale, color);
  }

  /**
   * Remove an instance
   */
  removeInstance(groupId: string, instanceId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;
    return group.removeInstance(instanceId);
  }

  /**
   * Check if an instance exists
   */
  hasInstance(groupId: string, instanceId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;
    return group.hasInstance(instanceId);
  }

  /**
   * Commit changes (call after batch updates)
   */
  commit(groupId?: string): void {
    if (groupId) {
      const group = this.groups.get(groupId);
      if (group) group.commit();
    } else {
      this.groups.forEach((group) => {
        group.commit();
      });
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    groups: number;
    totalInstances: number;
    groupStats: Map<string, { instances: number; maxInstances: number }>;
  } {
    const groupStats = new Map<string, { instances: number; maxInstances: number }>();
    let totalInstances = 0;

    this.groups.forEach((group, id) => {
      const stats = group.getStats();
      groupStats.set(id, stats);
      totalInstances += stats.instances;
    });

    return {
      groups: this.groups.size,
      totalInstances,
      groupStats,
    };
  }

  /**
   * Remove a group
   */
  removeGroup(groupId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      group.removeFromScene(this.scene);
      group.dispose();
      this.groups.delete(groupId);
    }
  }

  /**
   * Clear all groups
   */
  clear(): void {
    const keys = Array.from(this.groups.keys());
    keys.forEach((groupId) => {
      this.removeGroup(groupId);
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
  }
}

/**
 * InstanceGroup manages a single THREE.InstancedMesh
 */
class InstanceGroup {
  private mesh: THREE.InstancedMesh;
  private instances: Map<string, InstanceData> = new Map();
  private freeIndices: number[] = [];
  private nextIndex = 0;
  private maxInstances: number;
  private dirty = false;

  // Reusable objects
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private quaternion = new THREE.Quaternion();
  private scale = new THREE.Vector3();

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, maxInstances: number) {
    this.maxInstances = maxInstances;
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;

    // Enable instance colors if material supports it
    if ((material as THREE.MeshLambertMaterial).vertexColors !== undefined) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(maxInstances * 3),
        3
      );
    }
  }

  addInstance(
    id: string,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    color: THREE.Color
  ): boolean {
    if (this.instances.has(id)) {
      return this.updateInstance(id, position, scale, color);
    }

    // Get next available index
    let index: number;
    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else if (this.nextIndex < this.maxInstances) {
      index = this.nextIndex++;
    } else {
      console.warn('Instance group full');
      return false;
    }

    const data: InstanceData = {
      id,
      position: position.clone(),
      scale: scale.clone(),
      color: color.clone(),
      index,
    };

    this.instances.set(id, data);
    this.updateInstanceMatrix(data);
    this.updateInstanceColor(data);

    // Update visible count
    this.mesh.count = Math.max(this.mesh.count, index + 1);
    this.dirty = true;

    return true;
  }

  updateInstance(
    id: string,
    position?: THREE.Vector3,
    scale?: THREE.Vector3,
    color?: THREE.Color
  ): boolean {
    const data = this.instances.get(id);
    if (!data) return false;

    if (position) data.position.copy(position);
    if (scale) data.scale.copy(scale);
    if (color) {
      data.color.copy(color);
      this.updateInstanceColor(data);
    }

    this.updateInstanceMatrix(data);
    this.dirty = true;

    return true;
  }

  removeInstance(id: string): boolean {
    const data = this.instances.get(id);
    if (!data) return false;

    // Hide by scaling to zero
    this.scale.set(0, 0, 0);
    this.matrix.compose(data.position, this.quaternion.identity(), this.scale);
    this.mesh.setMatrixAt(data.index, this.matrix);

    // Return index to free pool
    this.freeIndices.push(data.index);
    this.instances.delete(id);
    this.dirty = true;

    return true;
  }

  hasInstance(id: string): boolean {
    return this.instances.has(id);
  }

  private updateInstanceMatrix(data: InstanceData): void {
    this.matrix.compose(data.position, this.quaternion.identity(), data.scale);
    this.mesh.setMatrixAt(data.index, this.matrix);
  }

  private updateInstanceColor(data: InstanceData): void {
    if (this.mesh.instanceColor) {
      this.mesh.setColorAt(data.index, data.color);
    }
  }

  commit(): void {
    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) {
        (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
      }
      this.dirty = false;
    }
  }

  getStats(): { instances: number; maxInstances: number } {
    return {
      instances: this.instances.size,
      maxInstances: this.maxInstances,
    };
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
    this.instances.clear();
  }
}

/**
 * Create common building geometry for instancing
 */
export function createBuildingGeometry(tier: number = 1): THREE.BoxGeometry {
  const sizeX = 1 + tier * 0.3;
  const sizeY = 1 + tier * 0.5;
  const sizeZ = 1 + tier * 0.3;
  return new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
}

/**
 * Create common plant billboard geometry
 */
export function createPlantGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, 1.5);
}
