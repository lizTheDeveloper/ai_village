/**
 * InstancedSpriteRenderer - GPU-instanced sprite rendering using texture atlas
 *
 * Renders hundreds of sprites in 1-4 draw calls by:
 * 1. Combining all sprites into a texture atlas
 * 2. Using InstancedMesh for GPU instancing
 * 3. Passing UV offsets per-instance via instance attributes
 *
 * This reduces draw calls from O(n) to O(1) for sprite rendering.
 */

import * as THREE from 'three';
import { SpriteAtlasBuilder, type UVRect } from './SpriteAtlasBuilder.js';

/** Sprite instance data */
export interface SpriteInstance {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  uvRect: UVRect;
  visible: boolean;
}

/** Configuration for the instanced sprite renderer */
export interface InstancedSpriteConfig {
  /** Maximum number of sprites (default: 1024) */
  maxSprites: number;
  /** Default sprite scale (default: 2.0) */
  defaultScale: number;
  /** Whether sprites should billboard (always face camera) */
  billboard: boolean;
}

const DEFAULT_CONFIG: InstancedSpriteConfig = {
  maxSprites: 1024,
  defaultScale: 2.0,
  billboard: true,
};

// Custom shader for atlas-based instanced sprites
const vertexShader = `
  // Instance attributes
  attribute vec4 instanceUV;  // u, v, width, height in atlas
  attribute float instanceVisible;

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    vVisible = instanceVisible;

    // Calculate UV from atlas rect
    // instanceUV: x=u, y=v, z=width, w=height
    vUv = vec2(
      instanceUV.x + uv.x * instanceUV.z,
      instanceUV.y + uv.y * instanceUV.w
    );

    // Standard instanced position
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform sampler2D atlasTexture;

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    // Skip invisible sprites by discarding
    if (vVisible < 0.5) {
      discard;
    }

    vec4 texColor = texture2D(atlasTexture, vUv);

    // Discard transparent pixels for proper depth sorting
    if (texColor.a < 0.1) {
      discard;
    }

    gl_FragColor = texColor;
  }
`;

/**
 * InstancedSpriteRenderer manages GPU-instanced sprite rendering.
 */
export class InstancedSpriteRenderer {
  private config: InstancedSpriteConfig;
  private scene: THREE.Scene;
  private atlas: SpriteAtlasBuilder;

  /** The instanced mesh */
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;

  /** Per-instance attribute buffers */
  private instanceUVs: Float32Array;
  private instanceVisible: Float32Array;

  /** Instance ID to index mapping */
  private instanceMap: Map<string, number> = new Map();
  private freeIndices: number[] = [];
  private instanceCount = 0;

  /** Reusable matrix for transforms */
  private _tempMatrix = new THREE.Matrix4();
  private _tempQuaternion = new THREE.Quaternion();

  /** Camera reference for billboarding */
  private camera: THREE.Camera | null = null;

  /** Whether the instance buffer needs updating */
  private needsUpdate = false;

  constructor(scene: THREE.Scene, atlas: SpriteAtlasBuilder, config: Partial<InstancedSpriteConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scene = scene;
    this.atlas = atlas;

    // Allocate attribute buffers
    this.instanceUVs = new Float32Array(this.config.maxSprites * 4);
    this.instanceVisible = new Float32Array(this.config.maxSprites);

    // Initialize all as invisible
    this.instanceVisible.fill(0);

    // Pre-fill free indices
    for (let i = this.config.maxSprites - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    this.createMesh();
  }

  /**
   * Create the instanced mesh with custom shader material.
   */
  private createMesh(): void {
    // Create billboard geometry (plane)
    this.geometry = new THREE.PlaneGeometry(1, 1);

    // Create shader material
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        atlasTexture: { value: this.atlas.getTexture() },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.config.maxSprites
    );
    this.mesh.frustumCulled = false; // We'll handle frustum culling ourselves

    // Add instance attributes
    this.geometry.setAttribute(
      'instanceUV',
      new THREE.InstancedBufferAttribute(this.instanceUVs, 4)
    );
    this.geometry.setAttribute(
      'instanceVisible',
      new THREE.InstancedBufferAttribute(this.instanceVisible, 1)
    );

    // Initialize all instance matrices to zero scale (hidden)
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.config.maxSprites; i++) {
      this.mesh.setMatrixAt(i, zeroMatrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.mesh);
  }

  /**
   * Set the camera for billboarding.
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Add or update a sprite instance.
   */
  setSprite(id: string, x: number, y: number, z: number, spriteKey: string, scale: number = this.config.defaultScale): boolean {
    // Get or allocate instance index
    let index: number;
    const existingIndex = this.instanceMap.get(id);

    if (existingIndex !== undefined) {
      index = existingIndex;
    } else {
      // Allocate new index
      if (this.freeIndices.length === 0) {
        console.warn('[InstancedSpriteRenderer] Max sprites reached, cannot add:', id);
        return false;
      }
      index = this.freeIndices.pop()!;
      this.instanceMap.set(id, index);
      this.instanceCount++;
    }

    // Get UV rect from atlas
    const uvRect = this.atlas.getUVRect(spriteKey);
    if (!uvRect) {
      // Sprite not in atlas - mark as invisible
      this.instanceVisible[index] = 0;
      this.needsUpdate = true;
      return false;
    }

    // Update UV attribute
    const uvOffset = index * 4;
    this.instanceUVs[uvOffset] = uvRect.u;
    this.instanceUVs[uvOffset + 1] = uvRect.v;
    this.instanceUVs[uvOffset + 2] = uvRect.width;
    this.instanceUVs[uvOffset + 3] = uvRect.height;

    // Update visibility
    this.instanceVisible[index] = 1;

    // Update transform matrix
    this._tempMatrix.makeTranslation(x, z, y); // Note: y/z swap for Three.js
    this._tempMatrix.scale(new THREE.Vector3(scale, scale, 1));

    // Apply billboarding if enabled and camera available
    if (this.config.billboard && this.camera) {
      this.camera.getWorldQuaternion(this._tempQuaternion);
      const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(this._tempQuaternion);
      this._tempMatrix.multiply(rotationMatrix);
    }

    this.mesh!.setMatrixAt(index, this._tempMatrix);
    this.needsUpdate = true;

    return true;
  }

  /**
   * Remove a sprite instance.
   */
  removeSprite(id: string): void {
    const index = this.instanceMap.get(id);
    if (index === undefined) return;

    // Mark as invisible
    this.instanceVisible[index] = 0;

    // Hide with zero scale
    this._tempMatrix.makeScale(0, 0, 0);
    this.mesh!.setMatrixAt(index, this._tempMatrix);

    // Return index to free list
    this.freeIndices.push(index);
    this.instanceMap.delete(id);
    this.instanceCount--;
    this.needsUpdate = true;
  }

  /**
   * Update sprite visibility (for frustum culling).
   */
  setSpriteVisible(id: string, visible: boolean): void {
    const index = this.instanceMap.get(id);
    if (index === undefined) return;

    this.instanceVisible[index] = visible ? 1 : 0;
    this.needsUpdate = true;
  }

  /**
   * Batch update multiple sprites' positions.
   * More efficient than calling setSprite individually.
   */
  updatePositions(updates: Array<{ id: string; x: number; y: number; z: number }>): void {
    for (const { id, x, y, z } of updates) {
      const index = this.instanceMap.get(id);
      if (index === undefined) continue;

      // Only update position, keep existing scale/rotation
      this._tempMatrix.makeTranslation(x, z, y); // Note: y/z swap for Three.js
      this._tempMatrix.scale(new THREE.Vector3(this.config.defaultScale, this.config.defaultScale, 1));
      this.mesh!.setMatrixAt(index, this._tempMatrix);
    }
    this.needsUpdate = true;
  }

  /**
   * Apply all pending updates to the GPU.
   * Call once per frame after all sprite updates.
   */
  flush(): void {
    if (!this.needsUpdate || !this.mesh) return;

    // Update instance matrix buffer
    this.mesh.instanceMatrix.needsUpdate = true;

    // Update custom attributes
    const uvAttr = this.geometry!.getAttribute('instanceUV') as THREE.InstancedBufferAttribute;
    uvAttr.needsUpdate = true;

    const visibleAttr = this.geometry!.getAttribute('instanceVisible') as THREE.InstancedBufferAttribute;
    visibleAttr.needsUpdate = true;

    // Update atlas texture if it changed
    const atlasUniform = this.material!.uniforms.atlasTexture;
    if (atlasUniform) {
      atlasUniform.value = this.atlas.getTexture();
    }

    this.needsUpdate = false;
  }

  /**
   * Get the number of active sprites.
   */
  getActiveCount(): number {
    return this.instanceCount;
  }

  /**
   * Get statistics.
   */
  getStats(): { active: number; max: number; atlasStats: ReturnType<SpriteAtlasBuilder['getStats']> } {
    return {
      active: this.instanceCount,
      max: this.config.maxSprites,
      atlasStats: this.atlas.getStats(),
    };
  }

  /**
   * Check if a sprite exists.
   */
  hasSprite(id: string): boolean {
    return this.instanceMap.has(id);
  }

  /**
   * Clear all sprites.
   */
  clear(): void {
    // Reset all to invisible
    this.instanceVisible.fill(0);

    // Return all indices to free list
    this.freeIndices = [];
    for (let i = this.config.maxSprites - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    this.instanceMap.clear();
    this.instanceCount = 0;
    this.needsUpdate = true;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.instanceMap.clear();
  }
}
