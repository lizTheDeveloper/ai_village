/**
 * LPC (Liberated Pixel Cup) Sprite Definitions
 *
 * Defines the structure and metadata for LPC-style modular sprites.
 * These sprites use a 64x64 frame size with 4 directions and multiple animations.
 */

/** Direction indices in LPC sprite sheets (row order) */
export enum LPCDirection {
  Up = 0,
  Left = 1,
  Down = 2,
  Right = 3,
}

/** Animation types available in LPC sprites */
export type LPCAnimation = 'walkcycle' | 'slash' | 'spellcast' | 'thrust' | 'shoot' | 'hurt';

/** Frame dimensions for LPC sprites */
export const LPC_FRAME_SIZE = 64;

/** Animation frame counts */
export const LPC_ANIMATION_FRAMES: Record<LPCAnimation, number> = {
  walkcycle: 9,
  slash: 6,
  spellcast: 7,
  thrust: 8,
  shoot: 13,
  hurt: 6,
};

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
 * Built-in part definitions for downloaded LPC sprites
 */
export const LPC_BUILTIN_PARTS: Record<string, LPCPartDef> = {
  // Male bodies
  'male_ivory_normal_body': {
    id: 'male_ivory_normal_body',
    type: 'body',
    imagePath: 'lpc/modular_heads/male_ivory_normal_headless_walkcycle.png',
    sheetWidth: 576,
    sheetHeight: 256,
    animations: ['walkcycle'],
    zIndex: 0,
  },
  'male_ivory_normal_body_slash': {
    id: 'male_ivory_normal_body_slash',
    type: 'body',
    imagePath: 'lpc/modular_heads/male_ivory_normal_headless_slash.png',
    sheetWidth: 384,
    sheetHeight: 256,
    animations: ['slash'],
    zIndex: 0,
  },
  'male_ivory_muscular_body': {
    id: 'male_ivory_muscular_body',
    type: 'body',
    imagePath: 'lpc/modular_heads/male_ivory_muscular_headless_walkcycle.png',
    sheetWidth: 576,
    sheetHeight: 256,
    animations: ['walkcycle'],
    zIndex: 0,
  },

  // Female bodies
  'female_ivory_normal_body': {
    id: 'female_ivory_normal_body',
    type: 'body',
    imagePath: 'lpc/modular_heads/female_ivory_normal_headless_walkcycle.png',
    sheetWidth: 576,
    sheetHeight: 256,
    animations: ['walkcycle'],
    zIndex: 0,
  },
  'female_ivory_pregnant_body': {
    id: 'female_ivory_pregnant_body',
    type: 'body',
    imagePath: 'lpc/modular_heads/female_ivory_pregnant_headless_walkcycle.png',
    sheetWidth: 576,
    sheetHeight: 256,
    animations: ['walkcycle'],
    zIndex: 0,
  },

  // Male heads
  'male_ivory_human_head': {
    id: 'male_ivory_human_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/male_ivory_human_head.png',
    sheetWidth: 320,
    sheetHeight: 192,
    animations: ['walkcycle'],
    zIndex: 10,
  },
  'male_ivory_ogre_head': {
    id: 'male_ivory_ogre_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/male_ivory_ogre_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 10,
  },
  'male_ivory_lizard_head': {
    id: 'male_ivory_lizard_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/male_ivory_lizard_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 10,
  },
  'male_ivory_wolf_head': {
    id: 'male_ivory_wolf_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/male_ivory_wolf_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 10,
  },
  'male_skeleton_head': {
    id: 'male_skeleton_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/male_skeleton_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 10,
  },

  // Female heads
  'female_ivory_human_head': {
    id: 'female_ivory_human_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/female_ivory_human_head.png',
    sheetWidth: 320,
    sheetHeight: 192,
    animations: ['walkcycle'],
    zIndex: 10,
  },
  'female_ivory_wolf_head': {
    id: 'female_ivory_wolf_head',
    type: 'head',
    imagePath: 'lpc/modular_heads/female_ivory_wolf_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 10,
  },

  // Shadows
  'male_ivory_human_shadow': {
    id: 'male_ivory_human_shadow',
    type: 'shadow',
    imagePath: 'lpc/modular_heads/male_ivory_human_shadow_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 5, // Between body and head
  },
  'female_ivory_human_shadow': {
    id: 'female_ivory_human_shadow',
    type: 'shadow',
    imagePath: 'lpc/modular_heads/female_ivory_human_shadow_head.png',
    sheetWidth: 256,
    sheetHeight: 64,
    animations: ['walkcycle'],
    zIndex: 5,
  },
};

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
