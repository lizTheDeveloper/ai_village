import type { Entity, AnimalComponent, AppearanceComponent, SteeringComponent, PositionComponent, VelocityComponent } from '@ai-village/core';
import { getPixelLabSpriteLoader, type PixelLabSpriteLoader } from './PixelLabSpriteLoader.js';
import { PixelLabDirection, angleToPixelLabDirection } from './PixelLabSpriteDefs.js';
import { findSprite, type SpriteTraits } from './SpriteRegistry.js';
import { lookupSprite } from './SpriteService.js';

/**
 * Handles rendering of entities using PixelLab sprites.
 * Manages sprite loading, caching, and direction tracking.
 * Extracted from Renderer.ts to improve maintainability.
 */
export class PixelLabEntityRenderer {
  private ctx: CanvasRenderingContext2D;
  private pixelLabLoader: PixelLabSpriteLoader;

  // Sprite loading state
  private loadingSprites = new Set<string>();
  private failedSprites = new Map<string, number>(); // folderId -> timestamp of failure
  private readonly SPRITE_RETRY_DELAY_MS = 5000; // Wait 5 seconds before retrying a failed load

  // Entity sprite tracking
  private entitySpriteInstances = new Map<string, string>(); // entityId -> instanceId
  private entityLastDirections = new Map<string, PixelLabDirection>(); // entityId -> last direction
  private lastFrameTime: number = performance.now();

  constructor(ctx: CanvasRenderingContext2D, assetsPath: string = '/assets/sprites/pixellab') {
    this.ctx = ctx;
    this.pixelLabLoader = getPixelLabSpriteLoader(assetsPath);
  }

  /**
   * Get the sprite loader for external use (e.g., UI panels).
   */
  getSpriteLoader(): PixelLabSpriteLoader {
    return this.pixelLabLoader;
  }

  /**
   * Update animations for all sprite instances.
   * Call this once per frame before rendering.
   * @param currentTime Current time in milliseconds
   */
  updateAnimations(currentTime: number): void {
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update all sprite animations
    for (const instanceId of this.entitySpriteInstances.values()) {
      this.pixelLabLoader.updateAnimation(instanceId, deltaTime);
    }
  }

  /**
   * Try to render an entity using PixelLab sprites.
   * Returns true if successfully rendered, false if fallback is needed.
   */
  renderPixelLabEntity(
    entity: Entity,
    x: number,
    y: number,
    size: number
  ): boolean {
    // Try to get animal component first (prioritize animals over agents)
    const animal = entity.components.get('animal') as AnimalComponent | undefined;

    // Try to get appearance component if no animal (for agents/humanoids)
    const appearance = entity.components.get('appearance') as AppearanceComponent | undefined;

    if (!appearance && !animal) return false;

    // Build traits for sprite lookup - prioritize animal component
    const traits: SpriteTraits = animal ? {
      species: animal.speciesId, // Use speciesId from animal component
    } : {
      species: appearance!.species || 'human',
      gender: appearance!.gender,
      hairColor: appearance!.hairColor,
      skinTone: appearance!.skinTone,
    };

    // Find the best matching sprite folder and queue generation if missing
    const spriteResult = lookupSprite(traits);
    const spriteFolderId = spriteResult.folderId;

    // Check if sprite is loaded
    if (!this.pixelLabLoader.isLoaded(spriteFolderId)) {
      // Check if this sprite has failed recently (prevent thundering herd)
      const failedTime = this.failedSprites.get(spriteFolderId);
      if (failedTime !== undefined) {
        const timeSinceFailure = Date.now() - failedTime;
        if (timeSinceFailure < this.SPRITE_RETRY_DELAY_MS) {
          return false; // Too soon to retry, use fallback
        }
        // Enough time has passed, clear the failure and allow retry
        this.failedSprites.delete(spriteFolderId);
      }

      // Start loading if not already loading
      if (!this.loadingSprites.has(spriteFolderId)) {
        this.loadingSprites.add(spriteFolderId);
        this.pixelLabLoader.loadCharacter(spriteFolderId)
          .then(() => {
            this.loadingSprites.delete(spriteFolderId);
            // Clear any previous failure record on success
            this.failedSprites.delete(spriteFolderId);
          })
          .catch((error) => {
            this.loadingSprites.delete(spriteFolderId);
            // Mark as failed with timestamp to prevent immediate retry
            this.failedSprites.set(spriteFolderId, Date.now());
            // Log error once (not on every frame)
            console.error(`[PixelLabEntityRenderer] Failed to load sprite ${spriteFolderId}, will retry in ${this.SPRITE_RETRY_DELAY_MS}ms:`, error.message);
          });
      }
      return false; // Use fallback while loading
    }

    // Get or create instance for this entity
    let instanceId = this.entitySpriteInstances.get(entity.id);
    if (!instanceId) {
      instanceId = `entity_${entity.id}`;
      const instance = this.pixelLabLoader.createInstance(instanceId, spriteFolderId);
      if (!instance) return false;
      this.entitySpriteInstances.set(entity.id, instanceId);
    }

    // Determine direction from entity velocity or steering
    // First check steering component for desired direction (more responsive for animals)
    const steering = entity.components.get('steering') as SteeringComponent | undefined;
    const velocity = entity.components.get('velocity') as VelocityComponent | undefined;

    // Prefer steering target for immediate direction changes
    let vx = 0;
    let vy = 0;

    if (steering?.target) {
      // Calculate direction from steering target (immediate, no lag)
      const position = entity.components.get('position') as PositionComponent | undefined;
      if (position) {
        vx = steering.target.x - position.x;
        vy = steering.target.y - position.y;
      }
    } else if (velocity) {
      // Fallback to actual velocity
      vx = velocity.vx ?? 0;
      vy = velocity.vy ?? 0;
    }

    // Check if entity is moving
    const isMoving = Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01;

    let direction: PixelLabDirection;
    if (isMoving) {
      // Calculate direction from movement vector
      // NOTE: Negate vy because screen coordinates have Y pointing down,
      // but Math.atan2 expects standard math coordinates (Y pointing up)
      const angle = Math.atan2(-vy, vx);
      direction = angleToPixelLabDirection(angle);
      // Store this direction for when entity stops moving
      this.entityLastDirections.set(entity.id, direction);
    } else {
      // Not moving - use last known direction, or default to South
      direction = this.entityLastDirections.get(entity.id) ?? PixelLabDirection.South;
    }

    // Update sprite direction
    this.pixelLabLoader.setDirection(instanceId, direction);

    // Set appropriate animation based on movement
    if (isMoving) {
      // Play walking animation when moving
      this.pixelLabLoader.setAnimation(instanceId, 'walking-8-frames', true);
    } else {
      // Stop animation when idle (will show static rotation)
      this.pixelLabLoader.setAnimation(instanceId, 'idle', false);
    }

    // Calculate scale to fit the size
    // PixelLab sprites are 48x48, we want them to fit in `size` pixels
    const scale = size / 48;

    // Render the sprite
    return this.pixelLabLoader.render(this.ctx, instanceId, x, y, scale);
  }
}
