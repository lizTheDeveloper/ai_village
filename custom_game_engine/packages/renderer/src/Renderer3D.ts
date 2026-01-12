/**
 * Renderer3D - Three.js-based 3D voxel renderer for side-view mode
 *
 * Renders the game world as Minecraft-style voxel blocks with billboarded sprites.
 * Used when the game is in side-view mode.
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import type { ChunkManager, TerrainGenerator, Chunk } from '@ai-village/world';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface Renderer3DConfig {
  /** Size of each voxel block */
  blockSize: number;
  /** Radius of terrain to render around camera */
  renderRadius: number;
  /** Fog start distance */
  fogNear: number;
  /** Fog end distance */
  fogFar: number;
  /** Movement speed */
  moveSpeed: number;
}

const DEFAULT_CONFIG: Renderer3DConfig = {
  blockSize: 1,
  renderRadius: 60,
  fogNear: 50,
  fogFar: 150,
  moveSpeed: 15,
};

// Animation directions for walking sprites
const ANIMATION_DIRECTIONS = [
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east',
] as const;
type AnimationDirection = typeof ANIMATION_DIRECTIONS[number];

// Animation configuration
const ANIMATION_CONFIG = {
  frameCount: 8,
  framesPerSecond: 10, // 10 FPS for walk animation
  animationType: 'walking-8-frames',
};

const TERRAIN_COLORS: Record<string, number> = {
  grass: 0x4ade80,
  dirt: 0x8b6914,
  stone: 0x6b7280,
  sand: 0xfcd34d,
  water: 0x3b82f6,
  snow: 0xf0f9ff,
  forest: 0x166534,
  mountain: 0x78716c,
  default: 0x9ca3af,
};

const BUILDING_COLORS: Record<string, number> = {
  // Crafting stations
  workbench: 0x8b4513,
  anvil: 0x4a4a4a,
  forge: 0xb22222,
  furnace: 0xcd853f,
  kiln: 0xa0522d,
  loom: 0xd2b48c,
  tanning_rack: 0x8b7355,
  brewing_stand: 0x6b8e23,
  alchemy_table: 0x9932cc,
  enchanting_table: 0x4169e1,
  sawmill: 0xdeb887,
  stonecutter: 0x808080,
  cooking_fire: 0xff4500,
  campfire: 0xff6347,
  // Storage
  storage: 0x654321,
  chest: 0x8b4513,
  barrel: 0x8b6914,
  silo: 0xf4a460,
  // Shelter
  house: 0xbc8f8f,
  hut: 0xa0522d,
  cabin: 0x8b4513,
  tent: 0xf5f5dc,
  // Production
  farm_plot: 0x228b22,
  well: 0x4682b4,
  mill: 0xdaa520,
  // Default
  default: 0x808080,
};

const PLANT_STAGE_COLORS: Record<string, number> = {
  seed: 0x8b4513,
  germinating: 0x9acd32,
  sprout: 0x90ee90,
  vegetative: 0x32cd32,
  flowering: 0xff69b4,
  fruiting: 0xff6347,
  mature: 0x228b22,
  seeding: 0xdaa520,
  senescence: 0xd2691e,
  decay: 0x8b4513,
  dead: 0x696969,
};

const ANIMAL_COLORS: Record<string, number> = {
  cow: 0xffffff,
  pig: 0xffb6c1,
  sheep: 0xf5f5dc,
  chicken: 0xffd700,
  horse: 0x8b4513,
  dog: 0xd2691e,
  cat: 0xffa500,
  wolf: 0x808080,
  deer: 0xcd853f,
  rabbit: 0xd3d3d3,
  fox: 0xff4500,
  bear: 0x654321,
  default: 0xdeb887,
};

// ============================================================================
// RENDERER3D CLASS
// ============================================================================

export class Renderer3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls;

  private config: Renderer3DConfig;
  private world: World | null = null;

  // Terrain
  private terrainGroup: THREE.Group;
  private builtTiles: Set<string> = new Set();
  private blockGeometry: THREE.BoxGeometry;
  private materials: Map<string, THREE.MeshLambertMaterial> = new Map();

  // Entities (agents)
  private entitySprites: Map<string, {
    sprite: THREE.Sprite;
    textures: Record<string, THREE.Texture>;
    name: string;
    worldX: number;
    worldY: number;
    worldZ: number;
    currentDirection: string;
  }> = new Map();

  // Buildings
  private buildingMeshes: Map<string, THREE.Mesh> = new Map();
  private buildingMaterials: Map<string, THREE.MeshLambertMaterial> = new Map();

  // Animals
  private animalSprites: Map<string, {
    sprite: THREE.Sprite;
    texture: THREE.Texture;
    worldX: number;
    worldY: number;
    worldZ: number;
    // Animation state
    speciesId: string;
    lastX: number;
    lastY: number;
    currentDirection: AnimationDirection;
    currentFrame: number;
    lastFrameTime: number;
    isMoving: boolean;
    hasAnimation: boolean;
  }> = new Map();

  // Plants
  private plantSprites: Map<string, {
    sprite: THREE.Sprite;
    texture: THREE.Texture;
    worldX: number;
    worldY: number;
    worldZ: number;
  }> = new Map();

  // Texture loading for pixel art sprites
  private textureLoader = new THREE.TextureLoader();
  private animalTextureCache: Map<string, THREE.Texture> = new Map();
  private loadingAnimalTextures: Set<string> = new Set();

  // Animation frame cache: Map<speciesId, Map<direction, Texture[]>>
  private animationFrameCache: Map<string, Map<AnimationDirection, THREE.Texture[]>> = new Map();
  private loadingAnimations: Set<string> = new Set();
  private speciesWithAnimations: Set<string> = new Set();

  // Lighting
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Movement
  private moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  private velocity = new THREE.Vector3();

  // State
  private isActive = false;
  private animationFrameId: number | null = null;
  private container: HTMLElement | null = null;

  // Selection state
  private selectedEntityId: string | null = null;
  private haloMesh: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private onEntitySelectedCallback: ((entityId: string | null) => void) | null = null;

  // Event handler references for cleanup
  private boundContextMenuHandler: ((e: MouseEvent) => void) | null = null;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;

  // TerrainGenerator reference (chunkManager removed - chunk loading now handled by ChunkLoadingSystem)
  private terrainGenerator: TerrainGenerator | null = null;

  constructor(
    config: Partial<Renderer3DConfig> = {},
    chunkManager?: ChunkManager,
    terrainGenerator?: TerrainGenerator
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Store terrain generator reference (chunkManager parameter kept for backwards compatibility but unused)
    if (terrainGenerator) this.terrainGenerator = terrainGenerator;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, this.config.fogNear, this.config.fogFar);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.set(30, 20, 30);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Create controls
    this.controls = new PointerLockControls(this.camera, document.body);

    // Create terrain group
    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    // Create block geometry
    this.blockGeometry = new THREE.BoxGeometry(
      this.config.blockSize,
      this.config.blockSize,
      this.config.blockSize
    );

    // Create materials
    for (const [name, color] of Object.entries(TERRAIN_COLORS)) {
      this.materials.set(name, new THREE.MeshLambertMaterial({ color }));
    }

    // Setup lights
    this.setupLights();

    // Setup controls
    this.setupControls();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.3);
    this.scene.add(this.hemiLight);

    // Create building materials
    for (const [name, color] of Object.entries(BUILDING_COLORS)) {
      this.buildingMaterials.set(name, new THREE.MeshLambertMaterial({ color }));
    }
  }

  private setupControls(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.isActive) return;
      switch (e.code) {
        case 'KeyW': this.moveState.forward = true; break;
        case 'KeyS': this.moveState.backward = true; break;
        case 'KeyA': this.moveState.left = true; break;
        case 'KeyD': this.moveState.right = true; break;
        case 'Space': this.moveState.up = true; e.preventDefault(); break;
        case 'ShiftLeft': this.moveState.down = true; break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!this.isActive) return;
      switch (e.code) {
        case 'KeyW': this.moveState.forward = false; break;
        case 'KeyS': this.moveState.backward = false; break;
        case 'KeyA': this.moveState.left = false; break;
        case 'KeyD': this.moveState.right = false; break;
        case 'Space': this.moveState.up = false; break;
        case 'ShiftLeft': this.moveState.down = false; break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Mount the 3D renderer to a container element
   */
  mount(container: HTMLElement): void {
    this.container = container;
    container.appendChild(this.renderer.domElement);

    // Position 3D canvas behind 2D canvas (which has z-index 10 in 3D mode)
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '5';

    this.resize();

    // Right-click to lock controls for mouse navigation
    this.boundContextMenuHandler = (e: MouseEvent) => {
      if (this.isActive) {
        e.preventDefault();
        this.controls.lock();
      }
    };
    container.addEventListener('contextmenu', this.boundContextMenuHandler);

    // Left-click to select entities
    this.boundClickHandler = (e: MouseEvent) => {
      if (this.isActive && !this.controls.isLocked) {
        this.handleEntityClick(e);
      }
    };
    container.addEventListener('click', this.boundClickHandler);
  }

  /**
   * Unmount the 3D renderer
   */
  unmount(): void {
    // Remove event listeners
    if (this.container) {
      if (this.boundContextMenuHandler) {
        this.container.removeEventListener('contextmenu', this.boundContextMenuHandler);
        this.boundContextMenuHandler = null;
      }
      if (this.boundClickHandler) {
        this.container.removeEventListener('click', this.boundClickHandler);
        this.boundClickHandler = null;
      }
      if (this.renderer.domElement.parentElement === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    this.container = null;
    this.controls.unlock();
  }

  /**
   * Resize the renderer to fit container
   */
  resize(): void {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Set the game world to render
   */
  setWorld(world: World): void {
    this.world = world;
    this.clearTerrain();
  }

  /**
   * Activate the 3D renderer
   */
  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.renderer.domElement.style.display = 'block';
    this.startRenderLoop();
  }

  /**
   * Deactivate the 3D renderer
   */
  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.controls.unlock();
    this.renderer.domElement.style.display = 'none';
    this.stopRenderLoop();
  }

  /**
   * Check if 3D renderer is active
   */
  isRendering(): boolean {
    return this.isActive;
  }

  /**
   * Set camera position from 2D coordinates
   */
  setCameraFromWorld(worldX: number, worldY: number, elevation: number): void {
    this.camera.position.set(worldX, elevation + 15, worldY + 15);
    this.camera.lookAt(worldX, elevation, worldY);
  }

  /**
   * Get camera position in world coordinates
   */
  getCameraWorldPosition(): { x: number; y: number; z: number } {
    return {
      x: this.camera.position.x,
      y: this.camera.position.z, // Z in Three.js is Y in world
      z: this.camera.position.y, // Y in Three.js is Z (elevation)
    };
  }

  /**
   * Set the 3D draw distance (in tiles). Updates render radius and fog.
   */
  setDrawDistance(distance: number): void {
    this.config.renderRadius = distance;
    // Update fog to match - near is 80% of distance, far is 150% of distance
    this.config.fogNear = distance * 0.8;
    this.config.fogFar = distance * 1.5;
    // Update the actual fog in the scene
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = this.config.fogNear;
      this.scene.fog.far = this.config.fogFar;
    }
  }

  /**
   * Get current draw distance
   */
  getDrawDistance(): number {
    return this.config.renderRadius;
  }

  /**
   * Set callback for when an entity is selected
   */
  setOnEntitySelected(callback: (entityId: string | null) => void): void {
    this.onEntitySelectedCallback = callback;
  }

  /**
   * Get currently selected entity ID
   */
  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Set selected entity (can be called externally to sync with 2D selection)
   */
  setSelectedEntity(entityId: string | null): void {
    this.selectedEntityId = entityId;
    this.updateHalo();
  }

  // ============================================================================
  // ENTITY SELECTION
  // ============================================================================

  /**
   * Handle external click forwarded from 2D canvas overlay.
   * Used when windows don't consume the click in 3D mode.
   */
  handleExternalClick(clientX: number, clientY: number, canvasRect: DOMRect): void {
    if (!this.isActive) return;

    this.mouse.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.mouse.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    this.performEntityRaycast();
  }

  /**
   * Handle left-click to select entities via raycasting
   */
  private handleEntityClick(event: MouseEvent): void {
    if (!this.container) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.performEntityRaycast();
  }

  /**
   * Perform raycasting to find and select entities at current mouse position.
   */
  private performEntityRaycast(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Collect all entity sprites to test
    const sprites: THREE.Sprite[] = [];
    const spriteToEntityId: Map<THREE.Sprite, string> = new Map();

    for (const [entityId, data] of this.entitySprites) {
      sprites.push(data.sprite);
      spriteToEntityId.set(data.sprite, entityId);
    }

    // Also check animal sprites
    for (const [entityId, data] of this.animalSprites) {
      sprites.push(data.sprite);
      spriteToEntityId.set(data.sprite, entityId);
    }

    const intersects = this.raycaster.intersectObjects(sprites);

    if (intersects.length > 0 && intersects[0]) {
      const hitSprite = intersects[0].object as THREE.Sprite;
      const entityId = spriteToEntityId.get(hitSprite);
      if (entityId) {
        this.selectedEntityId = entityId;
        this.updateHalo();
        if (this.onEntitySelectedCallback) {
          this.onEntitySelectedCallback(entityId);
        }
      }
    } else {
      // Clicked on nothing - deselect
      this.selectedEntityId = null;
      this.updateHalo();
      if (this.onEntitySelectedCallback) {
        this.onEntitySelectedCallback(null);
      }
    }
  }

  /**
   * Create or update the halo indicator above selected entity
   */
  private updateHalo(): void {
    // Remove existing halo if any
    if (this.haloMesh) {
      this.scene.remove(this.haloMesh);
      this.haloMesh.geometry.dispose();
      (this.haloMesh.material as THREE.Material).dispose();
      this.haloMesh = null;
    }

    if (!this.selectedEntityId) return;

    // Find the selected entity's position
    let position: THREE.Vector3 | null = null;

    const entityData = this.entitySprites.get(this.selectedEntityId);
    if (entityData) {
      position = entityData.sprite.position.clone();
    } else {
      const animalData = this.animalSprites.get(this.selectedEntityId);
      if (animalData) {
        position = animalData.sprite.position.clone();
      }
    }

    if (!position) return;

    // Create a torus (ring/halo) above the entity
    const geometry = new THREE.TorusGeometry(0.6, 0.08, 8, 24);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.9,
    });
    this.haloMesh = new THREE.Mesh(geometry, material);

    // Position above the entity and rotate to be horizontal
    this.haloMesh.position.set(position.x, position.y + 1.8, position.z);
    this.haloMesh.rotation.x = Math.PI / 2;

    this.scene.add(this.haloMesh);
  }

  /**
   * Update halo position to follow selected entity (called in render loop)
   */
  private updateHaloPosition(): void {
    if (!this.haloMesh || !this.selectedEntityId) return;

    let position: THREE.Vector3 | null = null;

    const entityData = this.entitySprites.get(this.selectedEntityId);
    if (entityData) {
      position = entityData.sprite.position.clone();
    } else {
      const animalData = this.animalSprites.get(this.selectedEntityId);
      if (animalData) {
        position = animalData.sprite.position.clone();
      }
    }

    if (position) {
      this.haloMesh.position.set(position.x, position.y + 1.8, position.z);
      // Gentle rotation animation
      this.haloMesh.rotation.z += 0.02;
    } else {
      // Entity no longer exists - remove halo
      this.selectedEntityId = null;
      this.updateHalo();
    }
  }

  // ============================================================================
  // TERRAIN RENDERING
  // ============================================================================

  /**
   * Clear all terrain
   */
  clearTerrain(): void {
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0];
      if (child) {
        this.terrainGroup.remove(child);
      }
    }
    this.builtTiles.clear();
  }


  /**
   * Update terrain around camera position
   */
  updateTerrain(): void {
    if (!this.world) return;

    const camX = Math.floor(this.camera.position.x);
    const camY = Math.floor(this.camera.position.z); // Z in Three.js is Y in world

    const radius = Math.floor(this.config.renderRadius);

    for (let x = camX - radius; x <= camX + radius; x++) {
      for (let y = camY - radius; y <= camY + radius; y++) {
        const key = `${x},${y}`;
        if (this.builtTiles.has(key)) continue;

        const tile = this.world.getTileAt?.(x, y);
        if (!tile) continue;

        this.buildTile(x, y, tile);
        this.builtTiles.add(key);
      }
    }
  }

  private buildTile(
    x: number,
    y: number,
    tile: { terrain?: string; elevation?: number; wall?: { material?: string } }
  ): void {
    const terrain = tile.terrain || 'grass';
    const elevation = tile.elevation || 0;

    // Build surface block + a few blocks below
    const minZ = Math.max(-2, elevation - 3);
    const maxZ = elevation;

    for (let z = minZ; z <= maxZ; z++) {
      let material: THREE.MeshLambertMaterial;
      if (z === elevation) {
        material = this.materials.get(terrain) || this.materials.get('default')!;
      } else if (z > elevation - 2) {
        material = this.materials.get('dirt')!;
      } else {
        material = this.materials.get('stone')!;
      }

      const mesh = new THREE.Mesh(this.blockGeometry, material);
      mesh.position.set(
        x * this.config.blockSize,
        z * this.config.blockSize,
        y * this.config.blockSize
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.terrainGroup.add(mesh);
    }

    // Add wall if present
    if (tile.wall) {
      const wallMat = this.materials.get('stone')!;
      for (let wz = elevation + 1; wz <= elevation + 3; wz++) {
        const wallMesh = new THREE.Mesh(this.blockGeometry, wallMat);
        wallMesh.position.set(
          x * this.config.blockSize,
          wz * this.config.blockSize,
          y * this.config.blockSize
        );
        this.terrainGroup.add(wallMesh);
      }
    }
  }

  // ============================================================================
  // ENTITY RENDERING
  // ============================================================================

  /**
   * Update entities from the world
   */
  updateEntities(): void {
    if (!this.world) return;

    const currentIds = new Set<string>();

    for (const entity of this.world.entities.values()) {
      const agent = entity.components.get('agent');
      if (!agent) continue;

      const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
      if (!position) continue;

      const identity = entity.components.get('identity') as { name?: string } | undefined;
      const name = identity?.name || entity.id;

      currentIds.add(entity.id);

      const x = position.x ?? 0;
      const y = position.y ?? 0;
      const tile = this.world.getTileAt?.(Math.floor(x), Math.floor(y));
      const elevation = tile?.elevation ?? 0;

      this.addOrUpdateEntity(entity.id, name, x, y, elevation);
    }

    // Remove entities no longer present
    for (const id of this.entitySprites.keys()) {
      if (!currentIds.has(id)) {
        const data = this.entitySprites.get(id);
        if (data) {
          this.scene.remove(data.sprite);
          this.entitySprites.delete(id);
        }
      }
    }
  }

  private addOrUpdateEntity(id: string, name: string, x: number, y: number, elevation: number): void {
    let data = this.entitySprites.get(id);

    if (!data) {
      const color = this.getAgentColor(name);
      const textures = this.createDirectionalTextures(color);
      const material = new THREE.SpriteMaterial({
        map: textures['front'],
        transparent: true,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1.5, 2.25, 1);

      this.scene.add(sprite);

      data = {
        sprite,
        textures,
        name,
        worldX: x,
        worldY: y,
        worldZ: elevation,
        currentDirection: 'front',
      };
      this.entitySprites.set(id, data);
    }

    // Update position
    data.sprite.position.set(x, elevation + 1.5, y);
    data.worldX = x;
    data.worldY = y;
    data.worldZ = elevation;
  }

  private getAgentColor(name: string): number {
    const colors = [0x4ade80, 0x3b82f6, 0xf59e0b, 0xef4444, 0x8b5cf6, 0x06b6d4, 0xec4899];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length]!;
  }

  private createDirectionalTextures(color: number): Record<string, THREE.Texture> {
    const c = new THREE.Color(color);
    const hex = '#' + c.getHexString();
    const skinColor = '#f5d0c5';
    const pantsColor = '#374151';
    const hairColor = '#5c4033';

    return {
      front: this.createSpriteTexture(hex, skinColor, pantsColor, hairColor, 'front'),
      back: this.createSpriteTexture(hex, skinColor, pantsColor, hairColor, 'back'),
      left: this.createSpriteTexture(hex, skinColor, pantsColor, hairColor, 'left'),
      right: this.createSpriteTexture(hex, skinColor, pantsColor, hairColor, 'right'),
    };
  }

  private createSpriteTexture(
    shirtColor: string,
    skinColor: string,
    pantsColor: string,
    hairColor: string,
    direction: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 32, 48);

    if (direction === 'front') {
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(16, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(16, 5, 5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(12, 6, 2, 2);
      ctx.fillRect(18, 6, 2, 2);
      ctx.fillRect(14, 10, 4, 1);
      ctx.fillStyle = shirtColor;
      ctx.fillRect(8, 14, 16, 14);
      ctx.fillStyle = skinColor;
      ctx.fillRect(4, 16, 4, 10);
      ctx.fillRect(24, 16, 4, 10);
      ctx.fillStyle = pantsColor;
      ctx.fillRect(8, 28, 7, 14);
      ctx.fillRect(17, 28, 7, 14);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(8, 42, 7, 4);
      ctx.fillRect(17, 42, 7, 4);
    } else if (direction === 'back') {
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(16, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(16, 7, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shirtColor;
      ctx.fillRect(8, 14, 16, 14);
      ctx.fillStyle = skinColor;
      ctx.fillRect(4, 16, 4, 10);
      ctx.fillRect(24, 16, 4, 10);
      ctx.fillStyle = pantsColor;
      ctx.fillRect(8, 28, 7, 14);
      ctx.fillRect(17, 28, 7, 14);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(8, 42, 7, 4);
      ctx.fillRect(17, 42, 7, 4);
    } else {
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(16, 8, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(direction === 'left' ? 18 : 14, 5, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(direction === 'left' ? 13 : 17, 7, 2, 2);
      ctx.fillStyle = shirtColor;
      ctx.fillRect(10, 14, 12, 14);
      ctx.fillStyle = skinColor;
      ctx.fillRect(direction === 'left' ? 6 : 22, 16, 4, 10);
      ctx.fillStyle = pantsColor;
      ctx.fillRect(11, 28, 10, 14);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(11, 42, 10, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private updateDirectionalSprites(): void {
    for (const [, data] of this.entitySprites) {
      const { sprite, textures, worldX, worldY } = data;

      const dx = this.camera.position.x - worldX;
      const dz = this.camera.position.z - worldY;
      const angleToCamera = Math.atan2(dz, dx);

      let relativeAngle = angleToCamera;
      while (relativeAngle < 0) relativeAngle += Math.PI * 2;
      while (relativeAngle >= Math.PI * 2) relativeAngle -= Math.PI * 2;

      let newDirection: string;
      if (relativeAngle < Math.PI / 4 || relativeAngle >= 7 * Math.PI / 4) {
        newDirection = 'right';
      } else if (relativeAngle < 3 * Math.PI / 4) {
        newDirection = 'front';
      } else if (relativeAngle < 5 * Math.PI / 4) {
        newDirection = 'left';
      } else {
        newDirection = 'back';
      }

      if (newDirection !== data.currentDirection) {
        sprite.material.map = textures[newDirection]!;
        sprite.material.needsUpdate = true;
        data.currentDirection = newDirection;
      }
    }
  }

  // ============================================================================
  // BUILDING RENDERING
  // ============================================================================

  /**
   * Update buildings from the world
   */
  updateBuildings(): void {
    if (!this.world) return;

    const currentIds = new Set<string>();

    for (const entity of this.world.entities.values()) {
      const building = entity.components.get('building') as {
        buildingType?: string;
        tier?: number;
        isComplete?: boolean;
        progress?: number;
      } | undefined;
      if (!building) continue;

      const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
      if (!position) continue;

      currentIds.add(entity.id);

      const x = position.x ?? 0;
      const y = position.y ?? 0;
      const tile = this.world.getTileAt?.(Math.floor(x), Math.floor(y));
      const elevation = tile?.elevation ?? 0;

      this.addOrUpdateBuilding(entity.id, building, x, y, elevation);
    }

    // Remove buildings no longer present
    for (const id of this.buildingMeshes.keys()) {
      if (!currentIds.has(id)) {
        const mesh = this.buildingMeshes.get(id);
        if (mesh) {
          this.scene.remove(mesh);
          this.buildingMeshes.delete(id);
        }
      }
    }
  }

  private addOrUpdateBuilding(
    id: string,
    building: { buildingType?: string; tier?: number; isComplete?: boolean; progress?: number },
    x: number,
    y: number,
    elevation: number
  ): void {
    let mesh = this.buildingMeshes.get(id);
    const buildingType = building.buildingType || 'default';
    const tier = building.tier || 1;
    const isComplete = building.isComplete ?? true;

    // Calculate building size based on tier
    const sizeX = 1 + tier * 0.3;
    const sizeY = 1 + tier * 0.5;  // Height
    const sizeZ = 1 + tier * 0.3;

    if (!mesh) {
      const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
      let material = this.buildingMaterials.get(buildingType);
      if (!material) {
        material = this.buildingMaterials.get('default')!;
      }

      // If incomplete, make it transparent
      if (!isComplete) {
        material = material.clone();
        material.transparent = true;
        material.opacity = 0.5 + (building.progress || 0) * 0.5;
      }

      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.buildingMeshes.set(id, mesh);
    }

    // Update position
    mesh.position.set(x, elevation + sizeY / 2 + 1, y);
  }

  // ============================================================================
  // ANIMAL RENDERING
  // ============================================================================

  /**
   * Update animals from the world
   */
  updateAnimals(): void {
    if (!this.world) return;

    const currentIds = new Set<string>();

    for (const entity of this.world.entities.values()) {
      const animal = entity.components.get('animal') as {
        speciesId?: string;
        name?: string;
        size?: number;
      } | undefined;
      if (!animal) continue;

      const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
      if (!position) continue;

      currentIds.add(entity.id);

      const x = position.x ?? 0;
      const y = position.y ?? 0;
      const tile = this.world.getTileAt?.(Math.floor(x), Math.floor(y));
      const elevation = tile?.elevation ?? 0;

      this.addOrUpdateAnimal(entity.id, animal, x, y, elevation);
    }

    // Remove animals no longer present
    for (const id of this.animalSprites.keys()) {
      if (!currentIds.has(id)) {
        const data = this.animalSprites.get(id);
        if (data) {
          this.scene.remove(data.sprite);
          data.texture.dispose();
          this.animalSprites.delete(id);
        }
      }
    }
  }

  private addOrUpdateAnimal(
    id: string,
    animal: { speciesId?: string; name?: string; size?: number },
    x: number,
    y: number,
    elevation: number
  ): void {
    let data = this.animalSprites.get(id);
    const speciesId = animal.speciesId || 'default';

    if (!data) {
      const texture = this.getAnimalTexture(speciesId);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(material);
      const size = animal.size || 1;
      // Scale to appropriate size for pixel art (typically 48x48 or 64x64 sprites)
      sprite.scale.set(size * 1.5, size * 1.5, 1);

      this.scene.add(sprite);

      data = {
        sprite,
        texture,
        worldX: x,
        worldY: y,
        worldZ: elevation,
        // Animation state initialization
        speciesId,
        lastX: x,
        lastY: y,
        currentDirection: 'south',
        currentFrame: 0,
        lastFrameTime: performance.now(),
        isMoving: false,
        hasAnimation: this.speciesWithAnimations.has(speciesId),
      };
      this.animalSprites.set(id, data);

      // Try to load animations for this species if not already loaded/loading
      this.loadAnimationFrames(speciesId);
    }

    // Detect movement and update direction
    const dx = x - data.lastX;
    const dy = y - data.lastY;
    const moved = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;

    if (moved) {
      data.isMoving = true;
      data.currentDirection = this.getDirectionFromDelta(dx, dy);
    } else {
      data.isMoving = false;
    }

    // Update position tracking
    data.lastX = x;
    data.lastY = y;
    data.worldX = x;
    data.worldY = y;
    data.worldZ = elevation;

    // Update sprite position
    const size = animal.size || 1;
    data.sprite.position.set(x, elevation + size / 2 + 1, y);
  }

  /**
   * Get or load a texture for an animal species from pixel art sprites.
   * Uses cached textures when available, loads from assets/sprites/pixellab/{species}/south.png
   */
  private getAnimalTexture(speciesId: string): THREE.Texture {
    // Check cache first
    const cached = this.animalTextureCache.get(speciesId);
    if (cached) return cached;

    // Check if already loading
    if (this.loadingAnimalTextures.has(speciesId)) {
      // Return placeholder while loading
      return this.createPlaceholderAnimalTexture(speciesId);
    }

    // Start loading the sprite
    this.loadingAnimalTextures.add(speciesId);
    const spritePath = `/assets/sprites/pixellab/${speciesId}/south.png`;

    this.textureLoader.load(
      spritePath,
      (texture) => {
        // Configure texture for pixel art
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;

        // Cache it
        this.animalTextureCache.set(speciesId, texture);
        this.loadingAnimalTextures.delete(speciesId);

        // Update any existing sprites using this species
        this.updateAnimalSpritesWithTexture(speciesId, texture);
      },
      undefined,
      () => {
        // Failed to load - create fallback texture and cache it
        const fallback = this.createPlaceholderAnimalTexture(speciesId);
        this.animalTextureCache.set(speciesId, fallback);
        this.loadingAnimalTextures.delete(speciesId);
      }
    );

    // Return placeholder while loading
    return this.createPlaceholderAnimalTexture(speciesId);
  }

  /**
   * Update all animal sprites that are using a particular species when texture loads
   */
  private updateAnimalSpritesWithTexture(speciesId: string, texture: THREE.Texture): void {
    for (const [id, data] of this.animalSprites.entries()) {
      // Check if this sprite needs updating by looking at the animal entity
      const entity = this.world?.entities.get(id);
      if (!entity) continue;
      const animal = entity.components.get('animal') as { speciesId?: string } | undefined;
      if (animal?.speciesId === speciesId) {
        // Update the sprite's material with the new texture
        const material = data.sprite.material as THREE.SpriteMaterial;
        material.map = texture;
        material.needsUpdate = true;
        data.texture = texture;
      }
    }
  }

  /**
   * Create a simple placeholder texture for an animal while the real one loads
   */
  private createPlaceholderAnimalTexture(speciesId: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    // Use species-specific colors for placeholder
    const color = ANIMAL_COLORS[speciesId] ?? ANIMAL_COLORS['default'] ?? 0xdeb887;
    const colorHex = '#' + color.toString(16).padStart(6, '0');

    // Simple oval body
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.6, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(size / 2, size * 0.35, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  /**
   * Get direction from movement delta.
   * Maps velocity to one of 8 compass directions.
   */
  private getDirectionFromDelta(dx: number, dy: number): AnimationDirection {
    // Calculate angle in radians, then convert to 8-direction index
    // Note: In our world, +Y is south (screen down in top-down), +X is east
    const angle = Math.atan2(dy, dx); // -PI to PI
    // Convert to 0-7 index (0=east, going counter-clockwise)
    // Offset by half-segment to center the ranges
    const segment = Math.round((angle + Math.PI) / (Math.PI / 4)) % 8;

    // Map segment index to direction
    // atan2 gives: 0=east, PI/2=south, PI=west, -PI/2=north
    const directionMap: AnimationDirection[] = [
      'west',        // angle ~= PI/-PI
      'north-west',  // angle ~= -3PI/4
      'north',       // angle ~= -PI/2
      'north-east',  // angle ~= -PI/4
      'east',        // angle ~= 0
      'south-east',  // angle ~= PI/4
      'south',       // angle ~= PI/2
      'south-west',  // angle ~= 3PI/4
    ];

    return directionMap[segment] ?? 'south';
  }

  /**
   * Load all animation frames for a species.
   * Loads 8 frames for each of 8 directions.
   */
  private loadAnimationFrames(speciesId: string): void {
    // Skip if already loaded or loading
    if (this.animationFrameCache.has(speciesId) || this.loadingAnimations.has(speciesId)) {
      return;
    }

    this.loadingAnimations.add(speciesId);

    // Try to load the first frame to check if animations exist
    const testPath = `/assets/sprites/pixellab/${speciesId}/animations/${ANIMATION_CONFIG.animationType}/south/frame_000.png`;

    // Use a simple image load to test if animations exist
    const testImg = new Image();
    testImg.onload = () => {
      // Animations exist! Load all frames for all directions
      this.speciesWithAnimations.add(speciesId);
      this.loadAllAnimationFrames(speciesId);
    };
    testImg.onerror = () => {
      // No animations for this species
      this.loadingAnimations.delete(speciesId);
    };
    testImg.src = testPath;
  }

  /**
   * Load all animation frames for all directions.
   */
  private loadAllAnimationFrames(speciesId: string): void {
    const directionFrames = new Map<AnimationDirection, THREE.Texture[]>();

    let loadedDirections = 0;
    const totalDirections = ANIMATION_DIRECTIONS.length;

    for (const direction of ANIMATION_DIRECTIONS) {
      const frames: THREE.Texture[] = [];
      let loadedFrames = 0;

      for (let i = 0; i < ANIMATION_CONFIG.frameCount; i++) {
        const frameNum = i.toString().padStart(3, '0');
        const framePath = `/assets/sprites/pixellab/${speciesId}/animations/${ANIMATION_CONFIG.animationType}/${direction}/frame_${frameNum}.png`;

        this.textureLoader.load(
          framePath,
          (texture) => {
            // Configure for pixel art
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.colorSpace = THREE.SRGBColorSpace;

            frames[i] = texture;
            loadedFrames++;

            // Check if all frames for this direction are loaded
            if (loadedFrames === ANIMATION_CONFIG.frameCount) {
              directionFrames.set(direction, frames);
              loadedDirections++;

              // Check if all directions are loaded
              if (loadedDirections === totalDirections) {
                this.animationFrameCache.set(speciesId, directionFrames);
                this.loadingAnimations.delete(speciesId);

                // Update existing sprites to enable animation
                this.enableAnimationsForSpecies(speciesId);
              }
            }
          },
          undefined,
          () => {
            // Frame failed to load - use placeholder
            loadedFrames++;
            if (loadedFrames === ANIMATION_CONFIG.frameCount) {
              directionFrames.set(direction, frames);
              loadedDirections++;
              if (loadedDirections === totalDirections) {
                this.animationFrameCache.set(speciesId, directionFrames);
                this.loadingAnimations.delete(speciesId);
              }
            }
          }
        );
      }
    }
  }

  /**
   * Enable animations for all sprites of a species after frames are loaded.
   */
  private enableAnimationsForSpecies(speciesId: string): void {
    for (const data of this.animalSprites.values()) {
      if (data.speciesId === speciesId) {
        data.hasAnimation = true;
      }
    }
  }

  /**
   * Update animation frames for all moving animals.
   * Called each render frame to cycle through animation frames.
   */
  private updateAnimalAnimations(): void {
    const now = performance.now();
    const frameDuration = 1000 / ANIMATION_CONFIG.framesPerSecond;

    for (const data of this.animalSprites.values()) {
      if (!data.hasAnimation) continue;

      const frames = this.animationFrameCache.get(data.speciesId);
      if (!frames) continue;

      const directionFrames = frames.get(data.currentDirection);
      if (!directionFrames || directionFrames.length === 0) continue;

      if (data.isMoving) {
        // Animate when moving
        const timeSinceLastFrame = now - data.lastFrameTime;
        if (timeSinceLastFrame >= frameDuration) {
          // Advance to next frame
          data.currentFrame = (data.currentFrame + 1) % ANIMATION_CONFIG.frameCount;
          data.lastFrameTime = now;
        }

        // Get the current frame texture
        const frameTexture = directionFrames[data.currentFrame];
        if (frameTexture) {
          const material = data.sprite.material as THREE.SpriteMaterial;
          if (material.map !== frameTexture) {
            material.map = frameTexture;
            material.needsUpdate = true;
          }
        }
      } else {
        // When idle, show first frame of current direction (or use static sprite)
        const idleFrame = directionFrames[0];
        if (idleFrame) {
          const material = data.sprite.material as THREE.SpriteMaterial;
          if (material.map !== idleFrame) {
            material.map = idleFrame;
            material.needsUpdate = true;
          }
        }
      }
    }
  }

  // ============================================================================
  // PLANT RENDERING
  // ============================================================================

  /**
   * Update plants from the world
   */
  updatePlants(): void {
    if (!this.world) return;

    const currentIds = new Set<string>();

    for (const entity of this.world.entities.values()) {
      const plant = entity.components.get('plant') as {
        speciesId?: string;
        stage?: string;
        position?: { x: number; y: number };
        providesShade?: boolean;
      } | undefined;
      if (!plant) continue;

      // Plants have their position in the component
      const position = plant.position;
      if (!position) continue;

      currentIds.add(entity.id);

      const x = position.x ?? 0;
      const y = position.y ?? 0;
      const tile = this.world.getTileAt?.(Math.floor(x), Math.floor(y));
      const elevation = tile?.elevation ?? 0;

      // Get tree height from entity's position.z (trees store height there)
      const entityPosition = entity.components.get('position') as { z?: number } | undefined;
      const treeHeight = entityPosition?.z ?? 0;

      this.addOrUpdatePlant(entity.id, plant, x, y, elevation, treeHeight);
    }

    // Remove plants no longer present
    for (const id of this.plantSprites.keys()) {
      if (!currentIds.has(id)) {
        const data = this.plantSprites.get(id);
        if (data) {
          this.scene.remove(data.sprite);
          data.texture.dispose();
          this.plantSprites.delete(id);
        }
      }
    }
  }

  private addOrUpdatePlant(
    id: string,
    plant: { speciesId?: string; stage?: string; providesShade?: boolean },
    x: number,
    y: number,
    elevation: number,
    treeHeight: number = 0
  ): void {
    let data = this.plantSprites.get(id);

    const stage = plant.stage || 'vegetative';
    const isTree = plant.providesShade === true;

    if (!data) {
      const color = PLANT_STAGE_COLORS[stage] ?? PLANT_STAGE_COLORS['vegetative'] ?? 0x32cd32;
      const texture = this.createPlantTexture(color, stage, isTree);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(material);

      // Size based on stage
      let size = this.getPlantSize(stage);
      if (isTree) {
        // Tree height from position.z determines actual height
        // Base multiplier of 3 + height tiles (so height 0 = 3x, height 4 = 7x)
        // This gives realistic tree sizes relative to 2-block-tall agents
        const heightMultiplier = 3 + Math.max(0, treeHeight);
        size *= heightMultiplier;
      }
      sprite.scale.set(size, size * 1.5, 1);

      this.scene.add(sprite);

      data = {
        sprite,
        texture,
        worldX: x,
        worldY: y,
        worldZ: elevation,
      };
      this.plantSprites.set(id, data);
    }

    // Update position and scale
    let size = this.getPlantSize(stage);
    if (isTree) {
      // Match the height calculation from creation
      const heightMultiplier = 3 + Math.max(0, treeHeight);
      size *= heightMultiplier;
    }
    data.sprite.scale.set(size, size * 1.5, 1);
    data.sprite.position.set(x, elevation + size * 0.75 + 1, y);
    data.worldX = x;
    data.worldY = y;
    data.worldZ = elevation;
  }

  private getPlantSize(stage: string): number {
    const sizes: Record<string, number> = {
      seed: 0.3,
      germinating: 0.4,
      sprout: 0.5,
      vegetative: 0.8,
      flowering: 1.0,
      fruiting: 1.2,
      mature: 1.5,
      seeding: 1.3,
      senescence: 1.0,
      decay: 0.8,
      dead: 0.5,
    };
    return sizes[stage] ?? 0.8;
  }

  private createPlantTexture(color: number, stage: string, isTree: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 32, 48);

    const c = new THREE.Color(color);
    const colorHex = '#' + c.getHexString();

    if (isTree) {
      // Draw tree trunk
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(13, 25, 6, 23);

      // Draw tree foliage (triangle/circle based on stage)
      ctx.fillStyle = colorHex;
      if (stage === 'flowering') {
        // Flowering trees have pink dots
        ctx.beginPath();
        ctx.arc(16, 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff69b4';
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const px = 16 + Math.cos(angle) * 8;
          const py = 14 + Math.sin(angle) * 8;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (stage === 'fruiting') {
        // Fruiting trees have red dots
        ctx.beginPath();
        ctx.arc(16, 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6347';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const px = 16 + Math.cos(angle) * 7;
          const py = 14 + Math.sin(angle) * 7;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(16, 14, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw small plant
      // Stem
      ctx.fillStyle = '#228b22';
      ctx.fillRect(14, 30, 4, 18);

      // Leaves/body based on stage
      ctx.fillStyle = colorHex;
      if (stage === 'seed' || stage === 'germinating') {
        ctx.beginPath();
        ctx.arc(16, 38, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage === 'sprout') {
        ctx.beginPath();
        ctx.ellipse(16, 32, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage === 'flowering') {
        ctx.beginPath();
        ctx.arc(16, 24, 10, 0, Math.PI * 2);
        ctx.fill();
        // Add flower center
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(16, 24, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage === 'fruiting') {
        ctx.beginPath();
        ctx.arc(16, 24, 10, 0, Math.PI * 2);
        ctx.fill();
        // Add fruits
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(10, 28, 3, 0, Math.PI * 2);
        ctx.arc(22, 28, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(16, 24, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // ============================================================================
  // TIME-OF-DAY LIGHTING
  // ============================================================================

  /**
   * Update lighting based on world time
   */
  updateTimeOfDayLighting(): void {
    if (!this.world) return;

    // Find time entity - time component uses timeOfDay (0-24 continuous)
    let timeOfDay = 12; // Default to noon
    for (const entity of this.world.entities.values()) {
      const time = entity.components.get('time') as {
        timeOfDay?: number;
        phase?: string;
      } | undefined;
      if (time && time.timeOfDay !== undefined) {
        timeOfDay = time.timeOfDay;
        break;
      }
    }

    // Calculate sun position and lighting based on time
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI; // 6am = 0, 12pm = PI/2, 6pm = PI
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.max(sunHeight * 100, -20);

    // Update sun position
    if (this.sunLight) {
      this.sunLight.position.set(sunX, sunY, 50);

      // Adjust sun color and intensity based on time
      if (timeOfDay < 6 || timeOfDay > 20) {
        // Night
        this.sunLight.intensity = 0.1;
        this.sunLight.color.setHex(0x4444aa);
      } else if (timeOfDay < 7 || timeOfDay > 19) {
        // Dawn/Dusk
        this.sunLight.intensity = 0.4;
        this.sunLight.color.setHex(0xff7700);
      } else if (timeOfDay < 8 || timeOfDay > 18) {
        // Golden hour
        this.sunLight.intensity = 0.6;
        this.sunLight.color.setHex(0xffaa44);
      } else {
        // Day
        this.sunLight.intensity = 0.8;
        this.sunLight.color.setHex(0xffffff);
      }
    }

    // Update ambient light
    if (this.ambientLight) {
      if (timeOfDay < 6 || timeOfDay > 20) {
        this.ambientLight.intensity = 0.15;
        this.ambientLight.color.setHex(0x222244);
      } else if (timeOfDay < 7 || timeOfDay > 19) {
        this.ambientLight.intensity = 0.3;
        this.ambientLight.color.setHex(0x886644);
      } else {
        this.ambientLight.intensity = 0.5;
        this.ambientLight.color.setHex(0xffffff);
      }
    }

    // Update sky color
    if (timeOfDay < 6 || timeOfDay > 20) {
      this.scene.background = new THREE.Color(0x0a0a2e);
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.setHex(0x0a0a2e);
      }
    } else if (timeOfDay < 7 || timeOfDay > 19) {
      this.scene.background = new THREE.Color(0xff7744);
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.setHex(0xff7744);
      }
    } else if (timeOfDay < 8 || timeOfDay > 18) {
      this.scene.background = new THREE.Color(0x87ceeb);
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.setHex(0x87ceeb);
      }
    } else {
      this.scene.background = new THREE.Color(0x87ceeb);
      if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.setHex(0x87ceeb);
      }
    }
  }

  // ============================================================================
  // RENDER LOOP
  // ============================================================================

  private startRenderLoop(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      if (!this.isActive) return;

      this.animationFrameId = requestAnimationFrame(animate);

      // Update movement
      this.updateMovement(0.016);

      // Update terrain around camera
      this.updateTerrain();

      // Update entities (agents)
      this.updateEntities();

      // Update buildings
      this.updateBuildings();

      // Update animals
      this.updateAnimals();

      // Update animal walk animations
      this.updateAnimalAnimations();

      // Update plants
      this.updatePlants();

      // Update time-of-day lighting
      this.updateTimeOfDayLighting();

      // Update sprite directions
      this.updateDirectionalSprites();

      // Update selection halo position
      this.updateHaloPosition();

      // Render
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateMovement(delta: number): void {
    const speed = this.config.moveSpeed * delta;
    const damping = 0.85;

    this.velocity.x *= damping;
    this.velocity.z *= damping;
    this.velocity.y *= damping;

    if (this.moveState.forward) this.velocity.z -= speed;
    if (this.moveState.backward) this.velocity.z += speed;
    if (this.moveState.left) this.velocity.x -= speed;
    if (this.moveState.right) this.velocity.x += speed;
    if (this.moveState.up) this.velocity.y += speed;
    if (this.moveState.down) this.velocity.y -= speed;

    this.controls.moveRight(this.velocity.x);
    this.controls.moveForward(-this.velocity.z);
    this.camera.position.y += this.velocity.y;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.deactivate();
    this.unmount();

    // Dispose geometry
    this.blockGeometry.dispose();

    // Dispose materials
    for (const material of this.materials.values()) {
      material.dispose();
    }

    // Dispose building materials
    for (const material of this.buildingMaterials.values()) {
      material.dispose();
    }

    // Dispose building meshes
    for (const mesh of this.buildingMeshes.values()) {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }

    // Dispose entity sprites
    for (const data of this.entitySprites.values()) {
      data.sprite.material.dispose();
      for (const texture of Object.values(data.textures)) {
        texture.dispose();
      }
    }

    // Dispose animal sprites
    for (const data of this.animalSprites.values()) {
      data.sprite.material.dispose();
      data.texture.dispose();
    }

    // Dispose plant sprites
    for (const data of this.plantSprites.values()) {
      data.sprite.material.dispose();
      data.texture.dispose();
    }

    // Dispose halo
    if (this.haloMesh) {
      this.haloMesh.geometry.dispose();
      (this.haloMesh.material as THREE.Material).dispose();
      this.haloMesh = null;
    }

    // Dispose renderer
    this.renderer.dispose();
  }
}
