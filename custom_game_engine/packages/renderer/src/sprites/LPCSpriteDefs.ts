/**
 * LPC (Liberated Pixel Cup) Sprite Definitions
 *
 * Defines the structure and metadata for LPC-style modular sprites.
 * These sprites use a 64x64 frame size with 4 directions and multiple animations.
 *
 * Configuration data is loaded from lpc-sprite-config.json
 */

import lpcConfig from './lpc-sprite-config.json';

/** Direction indices in LPC sprite sheets (row order) */
export enum LPCDirection {
  Up = 0,
  Left = 1,
  Down = 2,
  Right = 3,
}

/** Animation types available in LPC sprites */
export type LPCAnimation = 'walkcycle' | 'slash' | 'spellcast' | 'thrust' | 'shoot' | 'hurt';

/** Frame dimensions for LPC sprites (loaded from config) */
export const LPC_FRAME_SIZE = lpcConfig.defaults.frameSize;

/** Animation frame counts (loaded from config) */
export const LPC_ANIMATION_FRAMES: Record<LPCAnimation, number> = {} as Record<LPCAnimation, number>;

// Convert the config structure to the expected format
Object.keys(lpcConfig.animations).forEach((key) => {
  const animKey = key as LPCAnimation;
  const configAnims = lpcConfig.animations as Record<string, { frames: number }>;
  const animData = configAnims[key];
  if (animData) {
    LPC_ANIMATION_FRAMES[animKey] = animData.frames;
  }
});

/** Part types that can be composited */
export type LPCPartType = 'body' | 'head' | 'shadow' | 'hair' | 'clothing' | 'armor' | 'weapon';

/** Gender options */
export type LPCGender = 'male' | 'female';

/** Body types available */
export type LPCBodyType = 'normal' | 'muscular' | 'pregnant';

/** Species/head types available */
export type LPCSpecies = 'human' | 'ogre' | 'lizard' | 'wolf' | 'skeleton';

/** Skin color palettes */
export type LPCSkinColor = 'ivory' | 'ogregreen' | 'drakegreen' | 'wolfbrown' | 'coffee';

/**
 * Defines a single sprite part (body, head, etc.)
 */
export interface LPCPartDef {
  /** Unique identifier for this part */
  id: string;
  /** Type of part (body, head, etc.) */
  type: LPCPartType;
  /** Path to the sprite sheet image */
  imagePath: string;
  /** Width of the sprite sheet in pixels */
  sheetWidth: number;
  /** Height of the sprite sheet in pixels */
  sheetHeight: number;
  /** Available animations in this sheet */
  animations: LPCAnimation[];
  /** Z-index for layering (higher = on top) */
  zIndex: number;
  /** Optional offset from base position */
  offset?: { x: number; y: number };
}

/**
 * A complete character definition combining multiple parts
 */
export interface LPCCharacterDef {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Gender */
  gender: LPCGender;
  /** Body type */
  bodyType: LPCBodyType;
  /** Species/head type */
  species: LPCSpecies;
  /** Skin color palette */
  skinColor: LPCSkinColor;
  /** Additional parts (clothing, weapons, etc.) */
  additionalParts?: string[];
}

/**
 * Get the frame rectangle for a specific animation frame
 */
export function getLPCFrameRect(
  animation: LPCAnimation,
  direction: LPCDirection,
  frameIndex: number
): { x: number; y: number; width: number; height: number } {
  const frameCount = LPC_ANIMATION_FRAMES[animation];
  const clampedFrame = frameIndex % frameCount;

  return {
    x: clampedFrame * LPC_FRAME_SIZE,
    y: direction * LPC_FRAME_SIZE,
    width: LPC_FRAME_SIZE,
    height: LPC_FRAME_SIZE,
  };
}

/**
 * Convert a facing angle (radians) to an LPC direction
 */
export function angleToLPCDirection(angle: number): LPCDirection {
  // Normalize angle to 0-2PI
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // Map to 4 directions
  // Up: around PI/2 (90 degrees)
  // Down: around 3PI/2 (270 degrees)
  // Left: around PI (180 degrees)
  // Right: around 0 or 2PI (0/360 degrees)

  if (normalized >= Math.PI * 0.25 && normalized < Math.PI * 0.75) {
    return LPCDirection.Up;
  } else if (normalized >= Math.PI * 0.75 && normalized < Math.PI * 1.25) {
    return LPCDirection.Left;
  } else if (normalized >= Math.PI * 1.25 && normalized < Math.PI * 1.75) {
    return LPCDirection.Down;
  } else {
    return LPCDirection.Right;
  }
}

/**
 * Built-in part definitions for downloaded LPC sprites (loaded from config)
 */
export const LPC_BUILTIN_PARTS: Record<string, LPCPartDef> =
  lpcConfig.builtinParts as Record<string, LPCPartDef>;

/**
 * Get the parts needed for a character definition
 */
export function getPartsForCharacter(charDef: LPCCharacterDef): string[] {
  const parts: string[] = [];

  // Body
  const bodyKey = `${charDef.gender}_${charDef.skinColor}_${charDef.bodyType}_body`;
  if (LPC_BUILTIN_PARTS[bodyKey]) {
    parts.push(bodyKey);
  }

  // Shadow (use human shadow for all species for now)
  const shadowKey = `${charDef.gender}_${charDef.skinColor}_human_shadow`;
  if (LPC_BUILTIN_PARTS[shadowKey]) {
    parts.push(shadowKey);
  }

  // Head
  const headKey = charDef.species === 'skeleton'
    ? 'male_skeleton_head'
    : `${charDef.gender}_${charDef.skinColor}_${charDef.species}_head`;
  if (LPC_BUILTIN_PARTS[headKey]) {
    parts.push(headKey);
  }

  // Additional parts
  if (charDef.additionalParts) {
    parts.push(...charDef.additionalParts);
  }

  return parts;
}
