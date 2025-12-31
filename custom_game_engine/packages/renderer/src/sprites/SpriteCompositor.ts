/**
 * SpriteCompositor - Composites multiple sprite parts into a single rendered sprite
 *
 * Handles layering, animation frame selection, and rendering of LPC-style modular sprites.
 */

import {
  LPCDirection,
  LPCAnimation,
  LPC_FRAME_SIZE,
  LPC_ANIMATION_FRAMES,
  getLPCFrameRect,
  angleToLPCDirection,
  LPCCharacterDef,
  getPartsForCharacter,
} from './LPCSpriteDefs';
import { SpritePartRegistry, LoadedSpritePart, getSpritePartRegistry } from './SpritePartRegistry';

/** Animation state for a sprite */
export interface SpriteAnimationState {
  animation: LPCAnimation;
  direction: LPCDirection;
  frameIndex: number;
  frameTime: number; // Time spent on current frame
  speed: number; // Frames per second
  playing: boolean;
}

/** Rendered character with loaded parts and animation state */
export interface CompositeCharacter {
  id: string;
  def: LPCCharacterDef;
  partIds: string[];
  animState: SpriteAnimationState;
}

/**
 * SpriteCompositor - Handles rendering of composite sprites
 */
export class SpriteCompositor {
  private registry: SpritePartRegistry;
  private characters: Map<string, CompositeCharacter> = new Map();
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  constructor(registry?: SpritePartRegistry) {
    this.registry = registry ?? getSpritePartRegistry();
    this.initOffscreenCanvas();
  }

  /**
   * Initialize offscreen canvas for compositing
   */
  private initOffscreenCanvas(): void {
    // Use OffscreenCanvas if available, otherwise create a regular canvas
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(LPC_FRAME_SIZE, LPC_FRAME_SIZE);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = LPC_FRAME_SIZE;
      canvas.height = LPC_FRAME_SIZE;
      this.offscreenCanvas = canvas;
      this.offscreenCtx = canvas.getContext('2d');
    }
  }

  /**
   * Create a composite character from a definition
   */
  async createCharacter(def: LPCCharacterDef): Promise<CompositeCharacter> {
    const partIds = getPartsForCharacter(def);

    // Load all required parts
    await this.registry.loadParts(partIds);

    const character: CompositeCharacter = {
      id: def.id,
      def,
      partIds,
      animState: {
        animation: 'walkcycle',
        direction: LPCDirection.Down,
        frameIndex: 0,
        frameTime: 0,
        speed: 8, // 8 FPS default
        playing: false,
      },
    };

    this.characters.set(def.id, character);
    return character;
  }

  /**
   * Get a character by ID
   */
  getCharacter(id: string): CompositeCharacter | undefined {
    return this.characters.get(id);
  }

  /**
   * Update animation state for a character
   */
  updateAnimation(characterId: string, deltaTime: number): void {
    const character = this.characters.get(characterId);
    if (!character || !character.animState.playing) return;

    const state = character.animState;
    state.frameTime += deltaTime;

    const frameDuration = 1000 / state.speed;
    if (state.frameTime >= frameDuration) {
      state.frameTime -= frameDuration;
      state.frameIndex = (state.frameIndex + 1) % LPC_ANIMATION_FRAMES[state.animation];
    }
  }

  /**
   * Set animation for a character
   */
  setAnimation(characterId: string, animation: LPCAnimation, play: boolean = true): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    if (character.animState.animation !== animation) {
      character.animState.animation = animation;
      character.animState.frameIndex = 0;
      character.animState.frameTime = 0;
    }
    character.animState.playing = play;
  }

  /**
   * Set direction for a character
   */
  setDirection(characterId: string, direction: LPCDirection): void {
    const character = this.characters.get(characterId);
    if (!character) return;
    character.animState.direction = direction;
  }

  /**
   * Set direction from an angle (radians)
   */
  setDirectionFromAngle(characterId: string, angle: number): void {
    this.setDirection(characterId, angleToLPCDirection(angle));
  }

  /**
   * Render a composite character to a canvas context
   */
  render(
    ctx: CanvasRenderingContext2D,
    characterId: string,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    const character = this.characters.get(characterId);
    if (!character) return false;

    const { animation, direction, frameIndex } = character.animState;

    // Get parts sorted by z-index
    const loadedParts = character.partIds
      .map((id) => this.registry.getLoadedPart(id))
      .filter((p): p is LoadedSpritePart => p !== undefined)
      .sort((a, b) => a.def.zIndex - b.def.zIndex);

    if (loadedParts.length === 0) return false;

    // Render each part
    for (const part of loadedParts) {
      const frameRect = getLPCFrameRect(animation, direction, frameIndex);

      // Check if the frame exists in this sprite sheet
      if (
        frameRect.x + frameRect.width > part.def.sheetWidth ||
        frameRect.y + frameRect.height > part.def.sheetHeight
      ) {
        // Frame doesn't exist in this sheet, skip
        continue;
      }

      ctx.drawImage(
        part.image,
        frameRect.x,
        frameRect.y,
        frameRect.width,
        frameRect.height,
        x + (part.def.offset?.x ?? 0) * scale,
        y + (part.def.offset?.y ?? 0) * scale,
        LPC_FRAME_SIZE * scale,
        LPC_FRAME_SIZE * scale
      );
    }

    return true;
  }

  /**
   * Render a character directly (without character registration)
   * Useful for one-off renders or previews
   */
  renderDirect(
    ctx: CanvasRenderingContext2D,
    partIds: string[],
    animation: LPCAnimation,
    direction: LPCDirection,
    frameIndex: number,
    x: number,
    y: number,
    scale: number = 1
  ): boolean {
    // Get parts sorted by z-index
    const loadedParts = partIds
      .map((id) => this.registry.getLoadedPart(id))
      .filter((p): p is LoadedSpritePart => p !== undefined)
      .sort((a, b) => a.def.zIndex - b.def.zIndex);

    if (loadedParts.length === 0) return false;

    // Render each part
    for (const part of loadedParts) {
      const frameRect = getLPCFrameRect(animation, direction, frameIndex);

      // Check if the frame exists in this sprite sheet
      if (
        frameRect.x + frameRect.width > part.def.sheetWidth ||
        frameRect.y + frameRect.height > part.def.sheetHeight
      ) {
        continue;
      }

      ctx.drawImage(
        part.image,
        frameRect.x,
        frameRect.y,
        frameRect.width,
        frameRect.height,
        x + (part.def.offset?.x ?? 0) * scale,
        y + (part.def.offset?.y ?? 0) * scale,
        LPC_FRAME_SIZE * scale,
        LPC_FRAME_SIZE * scale
      );
    }

    return true;
  }

  /**
   * Composite parts to the offscreen canvas and return as ImageData
   * Useful for caching or creating sprites dynamically
   */
  compositeToImage(
    partIds: string[],
    animation: LPCAnimation,
    direction: LPCDirection,
    frameIndex: number
  ): ImageData | null {
    if (!this.offscreenCtx) return null;

    this.offscreenCtx.clearRect(0, 0, LPC_FRAME_SIZE, LPC_FRAME_SIZE);

    const success = this.renderDirect(
      this.offscreenCtx as CanvasRenderingContext2D,
      partIds,
      animation,
      direction,
      frameIndex,
      0,
      0,
      1
    );

    if (!success) return null;

    return this.offscreenCtx.getImageData(0, 0, LPC_FRAME_SIZE, LPC_FRAME_SIZE);
  }

  /**
   * Remove a character from the compositor
   */
  removeCharacter(characterId: string): void {
    this.characters.delete(characterId);
  }

  /**
   * Clear all characters
   */
  clearCharacters(): void {
    this.characters.clear();
  }

  /**
   * Get all character IDs
   */
  getAllCharacterIds(): string[] {
    return Array.from(this.characters.keys());
  }
}

/** Singleton instance */
let globalCompositor: SpriteCompositor | null = null;

/**
 * Get the global sprite compositor
 */
export function getSpriteCompositor(): SpriteCompositor {
  if (!globalCompositor) {
    globalCompositor = new SpriteCompositor();
  }
  return globalCompositor;
}

/**
 * Reset the global compositor
 */
export function resetSpriteCompositor(): void {
  globalCompositor?.clearCharacters();
  globalCompositor = null;
}
