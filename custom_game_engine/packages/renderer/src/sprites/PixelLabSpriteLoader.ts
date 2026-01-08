/**
 * PixelLabSpriteLoader - Loads and manages PixelLab AI-generated sprites
 *
 * PixelLab provides individual frame images (not sprite sheets) with metadata.
 * This loader handles loading from the metadata.json and individual PNGs.
 */

import {
  PixelLabDirection,
  PIXELLAB_DIRECTION_NAMES,
  PIXELLAB_DEFAULT_SIZE,
  angleToPixelLabDirection,
} from './PixelLabSpriteDefs';

// Re-export for external use
export { PixelLabDirection } from './PixelLabSpriteDefs';
import { getSpriteCache } from './SpriteCache';

/** Metadata format from PixelLab (nested format) */
interface PixelLabMetadataNested {
  character: {
    id: string;
    name: string;
    prompt: string;
    size: { width: number; height: number };
    directions: 4 | 8;
    view: string;
  };
  frames: {
    rotations: Record<string, string>;
    animations: Record<string, Record<string, string[]>>;
  };
}

/** Simpler metadata format (flat format used by actual assets) */
interface PixelLabMetadataFlat {
  id: string;
  name?: string;
  size: number;
  directions: 4 | 8 | string[]; // Can be number or array of direction names
  rotations?: string[]; // Optional - same as directions for backwards compatibility
  animations?: Record<string, unknown>;
}

/** Combined metadata type */
type PixelLabMetadata = PixelLabMetadataNested | PixelLabMetadataFlat;

/** Type guard for flat metadata */
function isFlatMetadata(meta: PixelLabMetadata): meta is PixelLabMetadataFlat {
  return 'directions' in meta || ('rotations' in meta && Array.isArray(meta.rotations));
}

/** Animation state for a PixelLab sprite */
export interface PixelLabAnimationState {
  animation: string;
  direction: PixelLabDirection;
  frameIndex: number;
  frameTime: number;
  speed: number; // Frames per second
  playing: boolean;
}

/** Loaded PixelLab character with all images */
export interface LoadedPixelLabCharacter {
  id: string;
  name: string;
  size: number;
  directions: 4 | 8;
  /** Static rotation images: direction name -> image */
  rotations: Map<string, HTMLImageElement>;
  /** Animation frames: animName -> direction -> frame images */
  animations: Map<string, Map<string, HTMLImageElement[]>>;
}

/** Active character instance for rendering */
export interface PixelLabCharacterInstance {
  id: string;
  character: LoadedPixelLabCharacter;
  animState: PixelLabAnimationState;
}

/**
 * PixelLabSpriteLoader - Loads and renders PixelLab sprites
 */
export class PixelLabSpriteLoader {
  private basePath: string;
  private characters: Map<string, LoadedPixelLabCharacter> = new Map();
  private instances: Map<string, PixelLabCharacterInstance> = new Map();
  private loadingPromises: Map<string, Promise<LoadedPixelLabCharacter>> = new Map();

  constructor(basePath: string = '/assets/sprites/pixellab') {
    this.basePath = basePath;
  }

  /**
   * Load a character from its folder (reads metadata.json)
   */
  async loadCharacter(folderId: string): Promise<LoadedPixelLabCharacter> {
    // Check if already loaded
    if (this.characters.has(folderId)) {
      return this.characters.get(folderId)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(folderId)) {
      return this.loadingPromises.get(folderId)!;
    }

    // Start loading
    const loadPromise = this.doLoadCharacter(folderId);
    this.loadingPromises.set(folderId, loadPromise);

    try {
      const character = await loadPromise;
      this.characters.set(folderId, character);
      return character;
    } finally {
      this.loadingPromises.delete(folderId);
    }
  }

  private async doLoadCharacter(folderId: string): Promise<LoadedPixelLabCharacter> {
    const folderPath = `${this.basePath}/${folderId}`;
    const cache = getSpriteCache();

    // Try to get metadata from cache first
    let metadata: PixelLabMetadata = (await cache.getMetadata(folderId)) as PixelLabMetadata;

    if (!metadata) {
      // Load metadata from network
      const metadataResponse = await fetch(`${folderPath}/metadata.json`);
      if (!metadataResponse.ok) {
        throw new Error(`Failed to load metadata for ${folderId}`);
      }
      metadata = await metadataResponse.json();

      // Cache for next time
      await cache.cacheMetadata(folderId, metadata);
    }

    const rotations = new Map<string, HTMLImageElement>();
    const animations = new Map<string, Map<string, HTMLImageElement[]>>();

    // Handle flat metadata format (actual asset format)
    if (isFlatMetadata(metadata)) {
      // Get direction names from either 'directions' or 'rotations' field
      let directionNames: string[] = Array.isArray(metadata.directions)
        ? metadata.directions
        : metadata.rotations || [];

      // If no directions in metadata, try all 8 standard directions (auto-detect)
      if (directionNames.length === 0) {
        directionNames = [
          'south', 'southwest', 'west', 'northwest',
          'north', 'northeast', 'east', 'southeast'
        ];
      }

      // Load rotation images (check both with and without rotations/ subfolder)
      const rotationPromises = directionNames.map(async (dirName) => {
        // Try direct path first (newer format)
        let imgPath = `${folderPath}/${dirName}.png`;
        try {
          const img = await this.loadImage(imgPath, metadata.id);
          rotations.set(dirName, img);
          return;
        } catch {
          // Fall back to rotations/ subdirectory (older format)
          try {
            imgPath = `${folderPath}/rotations/${dirName}.png`;
            const img = await this.loadImage(imgPath, metadata.id);
            rotations.set(dirName, img);
          } catch {
            // Skip failed loads silently
          }
        }
      });

      await Promise.all(rotationPromises);

      // Load animations if they exist (flat format)
      // Try standard animation names: breathing-idle, walking-8-frames, etc.
      const commonAnimations = ['breathing-idle', 'idle', 'walking-8-frames', 'walking-4-frames', 'running'];

      for (const animName of commonAnimations) {
        const animMap = new Map<string, HTMLImageElement[]>();
        let foundAnyFrames = false;

        for (const dirName of directionNames) {
          const frames: HTMLImageElement[] = [];
          let frameIndex = 0;

          // Try loading frames until we hit a missing one
          while (true) {
            const framePath = `${folderPath}/animations/${animName}/${dirName}/frame_${frameIndex.toString().padStart(3, '0')}.png`;
            try {
              const img = await this.loadImage(framePath, metadata.id);
              frames.push(img);
              foundAnyFrames = true;
              frameIndex++;
            } catch {
              break; // No more frames for this direction
            }
          }

          if (frames.length > 0) {
            animMap.set(dirName, frames);
          }
        }

        if (foundAnyFrames && animMap.size > 0) {
          animations.set(animName, animMap);
        }
      }

      const directionCount = typeof metadata.directions === 'number'
        ? metadata.directions
        : (directionNames.length as 4 | 8);

      return {
        id: metadata.id,
        name: metadata.name || metadata.id,
        size: metadata.size,
        directions: directionCount,
        rotations,
        animations,
      };
    }

    // Handle nested metadata format (original expected format)
    const rotationPromises = Object.entries(metadata.frames.rotations).map(
      async ([dirName, path]) => {
        try {
          const img = await this.loadImage(`${folderPath}/${path}`, metadata.character.id);
          rotations.set(dirName, img);
        } catch {
          // Skip failed loads
        }
      }
    );

    await Promise.all(rotationPromises);

    // Load animation frames
    for (const [animName, directions] of Object.entries(metadata.frames.animations)) {
      const animMap = new Map<string, HTMLImageElement[]>();

      const dirPromises = Object.entries(directions).map(async ([dirName, framePaths]) => {
        const frames: HTMLImageElement[] = [];

        // Load all frames for this direction
        for (const framePath of framePaths) {
          try {
            const img = await this.loadImage(`${folderPath}/${framePath}`, metadata.character.id);
            frames.push(img);
          } catch {
            // Skip failed frame
          }
        }

        if (frames.length > 0) {
          animMap.set(dirName, frames);
        }
      });

      await Promise.all(dirPromises);

      if (animMap.size > 0) {
        animations.set(animName, animMap);
      }
    }

    return {
      id: metadata.character.id,
      name: metadata.character.name,
      size: metadata.character.size.width,
      directions: metadata.character.directions,
      rotations,
      animations,
    };
  }

  private async loadImage(path: string, characterId?: string): Promise<HTMLImageElement> {
    // Check cache first
    const cache = getSpriteCache();
    const cached = await cache.getSprite(path);
    if (cached) {
      return cached;
    }

    // Load from network
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        // Cache for next time
        await cache.cacheSprite(path, img, characterId);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
      img.src = path;
    });
  }

  /**
   * Create an instance of a character for rendering
   */
  createInstance(instanceId: string, characterFolderId: string): PixelLabCharacterInstance | null {
    const character = this.characters.get(characterFolderId);
    if (!character) return null;

    const instance: PixelLabCharacterInstance = {
      id: instanceId,
      character,
      animState: {
        animation: 'idle',
        direction: PixelLabDirection.South,
        frameIndex: 0,
        frameTime: 0,
        speed: 8,
        playing: false,
      },
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
   * Get an instance by ID
   */
  getInstance(instanceId: string): PixelLabCharacterInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Set animation for an instance
   */
  setAnimation(instanceId: string, animation: string, play: boolean = true): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (instance.animState.animation !== animation) {
      instance.animState.animation = animation;
      instance.animState.frameIndex = 0;
      instance.animState.frameTime = 0;

      // Check if animation exists, if not try to load it (may have been generated after initial load)
      const character = instance.character;
      if (!character.animations.has(animation) && animation !== 'idle') {
        // Try loading the animation from disk first (async, non-blocking)
        // This catches animations that were generated after the character was first loaded
        this.tryLoadAnimation(character, animation).then(loaded => {
          if (!loaded) {
            // Animation not on disk, queue generation
            this.queueAnimationGeneration(character.id, animation);
          }
        });
      }
    }
    instance.animState.playing = play;
  }

  private generationRequests = new Set<string>();

  /**
   * Queue animation generation via API
   */
  private queueAnimationGeneration(folderId: string, animationName: string): void {
    if (typeof window === 'undefined') return;

    // Avoid re-queueing the same animation
    const cacheKey = `${folderId}:${animationName}`;
    if (this.generationRequests.has(cacheKey)) return;
    this.generationRequests.add(cacheKey);

    // Map animation name to action description
    const actionDescription = this.getActionDescription(animationName);

    fetch('/api/animations/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId,
        animationName,
        actionDescription,
      }),
    })
      .then(res => res.json())
      .then(result => {
        console.log(`[AnimGen] Queued ${animationName} for ${folderId}:`, result.message);
      })
      .catch(err => {
        console.error(`[AnimGen] Failed to queue ${animationName} for ${folderId}:`, err);
        this.generationRequests.delete(cacheKey);
      });
  }

  /**
   * Convert animation name to action description
   */
  private getActionDescription(animationName: string): string {
    const descriptions: Record<string, string> = {
      'walking-8-frames': 'walking forward at normal pace',
      'walking-4-frames': 'walking forward',
      'running': 'running quickly',
      'idle': 'standing idle',
      'attack': 'attacking with weapon',
      'cast': 'casting spell with hands raised',
    };
    return descriptions[animationName] || animationName.replace(/-/g, ' ');
  }

  // Track which animations we're currently trying to load to avoid duplicate attempts
  private loadingAnimations = new Set<string>();

  /**
   * Try to load an animation that may have been generated after the character was first loaded.
   * This checks the disk for animation frames and adds them to the character if found.
   */
  async tryLoadAnimation(character: LoadedPixelLabCharacter, animName: string): Promise<boolean> {
    // Already loaded?
    if (character.animations.has(animName)) return true;

    // Already trying to load?
    const loadKey = `${character.id}:${animName}`;
    if (this.loadingAnimations.has(loadKey)) return false;

    this.loadingAnimations.add(loadKey);

    try {
      const folderPath = `${this.basePath}/${character.id}`;
      const directionNames = character.directions === 8
        ? PIXELLAB_DIRECTION_NAMES
        : ['south', 'west', 'east', 'north'];

      const animMap = new Map<string, HTMLImageElement[]>();
      let foundAnyFrames = false;

      for (const dirName of directionNames) {
        const frames: HTMLImageElement[] = [];
        let frameIndex = 0;

        // Try loading frames until we hit a missing one
        while (frameIndex < 20) { // Cap at 20 frames to avoid infinite loop
          const framePath = `${folderPath}/animations/${animName}/${dirName}/frame_${frameIndex.toString().padStart(3, '0')}.png`;
          try {
            const img = await this.loadImage(framePath, character.id);
            frames.push(img);
            foundAnyFrames = true;
            frameIndex++;
          } catch {
            break; // No more frames for this direction
          }
        }

        if (frames.length > 0) {
          animMap.set(dirName, frames);
        }
      }

      if (foundAnyFrames && animMap.size > 0) {
        character.animations.set(animName, animMap);
        console.log(`[PixelLabLoader] Loaded ${animName} animation for ${character.id} (${animMap.size} directions)`);
        // Clear generation request since we now have the animation
        this.generationRequests.delete(`${character.id}:${animName}`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[PixelLabLoader] Failed to load ${animName} for ${character.id}:`, error);
      return false;
    } finally {
      this.loadingAnimations.delete(loadKey);
    }
  }

  /**
   * Set direction for an instance
   */
  setDirection(instanceId: string, direction: PixelLabDirection): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    instance.animState.direction = direction;
  }

  /**
   * Set direction from angle (radians)
   */
  setDirectionFromAngle(instanceId: string, angle: number): void {
    this.setDirection(instanceId, angleToPixelLabDirection(angle));
  }

  /**
   * Update animation state
   */
  updateAnimation(instanceId: string, deltaTime: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.animState.playing) return;

    const state = instance.animState;
    state.frameTime += deltaTime;

    const frameDuration = 1000 / state.speed;

    // Get frame count for current animation/direction
    const dirName = PIXELLAB_DIRECTION_NAMES[state.direction];
    const animFrames = instance.character.animations.get(state.animation);
    const dirFrames = animFrames?.get(dirName);
    const totalFrames = dirFrames?.length || 1;

    if (state.frameTime >= frameDuration) {
      state.frameTime -= frameDuration;
      state.frameIndex = (state.frameIndex + 1) % totalFrames;
    }
  }

  /**
   * Render an instance to the canvas
   */
  render(
    ctx: CanvasRenderingContext2D,
    instanceId: string,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const { character, animState } = instance;
    const size = character.size || PIXELLAB_DEFAULT_SIZE;
    const dirName = PIXELLAB_DIRECTION_NAMES[animState.direction];

    // Try to render animation frame first
    if (animState.animation !== 'idle') {
      const animFrames = character.animations.get(animState.animation);
      if (animFrames) {
        const dirFrames = animFrames.get(dirName);
        if (dirFrames && dirFrames.length > 0) {
          const frameIdx = Math.min(animState.frameIndex, dirFrames.length - 1);
          const frame = dirFrames[frameIdx];
          if (frame) {
            ctx.drawImage(frame, x, y, size * scale, size * scale);
            return true;
          }
        }

        // Try mirror direction for missing animations
        const mirrorDir = this.getMirrorDirection(dirName);
        if (mirrorDir) {
          const mirrorFrames = animFrames.get(mirrorDir);
          if (mirrorFrames && mirrorFrames.length > 0) {
            const frameIdx = Math.min(animState.frameIndex, mirrorFrames.length - 1);
            const frame = mirrorFrames[frameIdx];
            if (frame) {
              // Flip horizontally
              ctx.save();
              ctx.translate(x + size * scale, y);
              ctx.scale(-1, 1);
              ctx.drawImage(frame, 0, 0, size * scale, size * scale);
              ctx.restore();
              return true;
            }
          }
        }
      }
    }

    // Fall back to static rotation
    let rotationImage = character.rotations.get(dirName);

    // Try mirror for missing rotations
    if (!rotationImage) {
      const mirrorDir = this.getMirrorDirection(dirName);
      if (mirrorDir) {
        rotationImage = character.rotations.get(mirrorDir);
        if (rotationImage) {
          // Flip horizontally
          ctx.save();
          ctx.translate(x + size * scale, y);
          ctx.scale(-1, 1);
          ctx.drawImage(rotationImage, 0, 0, size * scale, size * scale);
          ctx.restore();
          return true;
        }
      }
    }

    if (rotationImage) {
      ctx.drawImage(rotationImage, x, y, size * scale, size * scale);
      return true;
    }

    // Try any available rotation as fallback
    const rotationValues = Array.from(character.rotations.values());
    if (rotationValues.length > 0 && rotationValues[0]) {
      ctx.drawImage(rotationValues[0], x, y, size * scale, size * scale);
      return true;
    }

    return false;
  }

  /**
   * Get the mirror direction for horizontal flipping
   */
  private getMirrorDirection(dirName: string): string | null {
    const mirrors: Record<string, string> = {
      east: 'west',
      'north-east': 'north-west',
      'south-east': 'south-west',
    };
    return mirrors[dirName] || null;
  }

  /**
   * Render a character directly without instance (for previews)
   */
  renderDirect(
    ctx: CanvasRenderingContext2D,
    characterFolderId: string,
    direction: PixelLabDirection,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    const character = this.characters.get(characterFolderId);
    if (!character) return false;

    const size = character.size || PIXELLAB_DEFAULT_SIZE;
    const dirName = PIXELLAB_DIRECTION_NAMES[direction];
    const rotationImage = character.rotations.get(dirName);

    if (rotationImage) {
      ctx.drawImage(rotationImage, x, y, size * scale, size * scale);
      return true;
    }

    return false;
  }

  /**
   * Remove an instance
   */
  removeInstance(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  /**
   * Unload a character and all its instances
   */
  unloadCharacter(characterFolderId: string): void {
    // Remove all instances using this character
    const character = this.characters.get(characterFolderId);
    if (character) {
      const entriesToDelete: string[] = [];
      this.instances.forEach((instance, instanceId) => {
        if (instance.character === character) {
          entriesToDelete.push(instanceId);
        }
      });
      entriesToDelete.forEach((id) => this.instances.delete(id));
    }
    this.characters.delete(characterFolderId);
  }

  /**
   * Get all loaded character folder IDs
   */
  getLoadedCharacterIds(): string[] {
    return Array.from(this.characters.keys());
  }

  /**
   * Get all instance IDs
   */
  getInstanceIds(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Check if a character is loaded
   */
  isLoaded(characterFolderId: string): boolean {
    return this.characters.has(characterFolderId);
  }

  /**
   * Get available animations for a character
   */
  getAvailableAnimations(characterFolderId: string): string[] {
    const character = this.characters.get(characterFolderId);
    if (!character) return [];
    return Array.from(character.animations.keys());
  }
}

/** Global loader instance */
let globalLoader: PixelLabSpriteLoader | null = null;

/**
 * Get the global PixelLab sprite loader
 */
export function getPixelLabSpriteLoader(basePath?: string): PixelLabSpriteLoader {
  if (!globalLoader) {
    globalLoader = new PixelLabSpriteLoader(basePath);
  }
  return globalLoader;
}

/**
 * Reset the global loader
 */
export function resetPixelLabSpriteLoader(): void {
  globalLoader = null;
}
