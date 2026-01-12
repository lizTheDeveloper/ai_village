/**
 * Sprite System - Modular sprite composition for LPC-style characters
 *
 * This module provides a part-based sprite system inspired by the Liberated Pixel Cup (LPC)
 * sprite format. Characters are composed of multiple layered parts (body, head, clothing, etc.)
 * that can be mixed and matched at runtime.
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   getSpritePartRegistry,
 *   getSpriteCompositor,
 *   LPCDirection,
 *   LPCCharacterDef
 * } from './sprites';
 *
 * // Get the global instances
 * const registry = getSpritePartRegistry('/assets/sprites/');
 * const compositor = getSpriteCompositor();
 *
 * // Define a character
 * const charDef: LPCCharacterDef = {
 *   id: 'villager_1',
 *   name: 'Villager',
 *   gender: 'male',
 *   bodyType: 'normal',
 *   species: 'human',
 *   skinColor: 'ivory',
 * };
 *
 * // Create the character (loads required parts)
 * await compositor.createCharacter(charDef);
 *
 * // In your render loop:
 * compositor.setAnimation('villager_1', 'walkcycle', true);
 * compositor.setDirection('villager_1', LPCDirection.Down);
 * compositor.updateAnimation('villager_1', deltaTime);
 * compositor.render(ctx, 'villager_1', x, y, scale);
 * ```
 *
 * ## Adding Custom Parts
 *
 * ```typescript
 * import { getSpritePartRegistry, LPCPartDef } from './sprites';
 *
 * const customPart: LPCPartDef = {
 *   id: 'custom_armor',
 *   type: 'armor',
 *   imagePath: 'custom/armor.png',
 *   sheetWidth: 576,
 *   sheetHeight: 256,
 *   animations: ['walkcycle'],
 *   zIndex: 15, // Above body and head
 * };
 *
 * getSpritePartRegistry().registerPart(customPart);
 * ```
 */

// Sprite definitions - values (enums, constants, functions)
export {
  LPCDirection,
  LPC_FRAME_SIZE,
  LPC_ANIMATION_FRAMES,
  getLPCFrameRect,
  angleToLPCDirection,
  LPC_BUILTIN_PARTS,
  getPartsForCharacter,
} from './LPCSpriteDefs';
// Sprite definitions - types
export type {
  LPCAnimation,
  LPCPartType,
  LPCGender,
  LPCBodyType,
  LPCSpecies,
  LPCSkinColor,
  LPCPartDef,
  LPCCharacterDef,
} from './LPCSpriteDefs';

// Part registry
export {
  SpritePartRegistry,
  getSpritePartRegistry,
  resetSpritePartRegistry,
} from './SpritePartRegistry';
export type { LoadedSpritePart } from './SpritePartRegistry';

// Compositor
export {
  SpriteCompositor,
  getSpriteCompositor,
  resetSpriteCompositor,
} from './SpriteCompositor';
export type {
  SpriteAnimationState,
  CompositeCharacter,
} from './SpriteCompositor';

// PixelLab AI-generated sprites
export {
  PixelLabDirection,
  PIXELLAB_DIRECTION_NAMES,
  PIXELLAB_ANIMATION_FRAMES,
  PIXELLAB_DEFAULT_SIZE,
  angleToPixelLabDirection,
  getPixelLabFrameRect,
} from './PixelLabSpriteDefs';

export {
  PixelLabSpriteLoader,
  getPixelLabSpriteLoader,
  resetPixelLabSpriteLoader,
} from './PixelLabSpriteLoader';
export type {
  PixelLabAnimationState,
  PixelLabCharacterInstance,
  LoadedPixelLabCharacter,
} from './PixelLabSpriteLoader';

// PixelLab Entity Renderer - High-level sprite rendering for entities
export { PixelLabEntityRenderer } from './PixelLabEntityRenderer';

// Sprite Cache - Persistent browser storage for sprites
export {
  SpriteCache,
  getSpriteCache,
  resetSpriteCache,
} from './SpriteCache';

// Sprite Registry - Maps game traits to sprite folders
export {
  findSprite,
  getAvailableSprites,
  getSpritesForSpecies,
  normalizeHairColor,
  normalizeSkinTone,
  buildTraitsFromEntity,
} from './SpriteRegistry';
export type {
  SpriteTraits,
  SpriteMapping,
} from './SpriteRegistry';
