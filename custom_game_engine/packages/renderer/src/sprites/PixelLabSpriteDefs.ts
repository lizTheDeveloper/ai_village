/**
 * PixelLabSpriteDefs - Definitions for PixelLab AI-generated sprites
 *
 * PixelLab uses 8 directions and provides animated sprites as sprite sheets.
 * This module handles the format conversion for use with our game engine.
 */

/** 8-direction system used by PixelLab */
export enum PixelLabDirection {
  South = 0,
  SouthWest = 1,
  West = 2,
  NorthWest = 3,
  North = 4,
  NorthEast = 5,
  East = 6,
  SouthEast = 7,
}

/** Direction names as used in PixelLab file paths */
export const PIXELLAB_DIRECTION_NAMES: Record<PixelLabDirection, string> = {
  [PixelLabDirection.South]: 'south',
  [PixelLabDirection.SouthWest]: 'south-west',
  [PixelLabDirection.West]: 'west',
  [PixelLabDirection.NorthWest]: 'north-west',
  [PixelLabDirection.North]: 'north',
  [PixelLabDirection.NorthEast]: 'north-east',
  [PixelLabDirection.East]: 'east',
  [PixelLabDirection.SouthEast]: 'south-east',
};

/** Animation types available from PixelLab */
export type PixelLabAnimation =
  | 'idle'
  | 'walking-4-frames'
  | 'walking-6-frames'
  | 'walking-8-frames'
  | 'running-4-frames'
  | 'running-6-frames'
  | 'running-8-frames'
  | 'breathing-idle'
  | 'jumping-1'
  | 'jumping-2';

/** Frame counts for each animation type */
export const PIXELLAB_ANIMATION_FRAMES: Record<string, number> = {
  idle: 1,
  'walking-4-frames': 4,
  'walking-6-frames': 6,
  'walking-8-frames': 8,
  'running-4-frames': 4,
  'running-6-frames': 6,
  'running-8-frames': 8,
  'breathing-idle': 4,
  'jumping-1': 4,
  'jumping-2': 6,
};

/** Character definition from PixelLab */
export interface PixelLabCharacterDef {
  id: string;
  name: string;
  description: string;
  size: number; // Canvas size (e.g., 48)
  directions: 4 | 8;
  view: 'low top-down' | 'high top-down' | 'side';
}

/** Loaded PixelLab character with images */
export interface LoadedPixelLabCharacter {
  def: PixelLabCharacterDef;
  /** Static rotation images for each direction */
  rotations: Map<PixelLabDirection, HTMLImageElement>;
  /** Animated sprite sheets: animation -> direction -> image */
  animations: Map<string, Map<PixelLabDirection, HTMLImageElement>>;
}

/**
 * Convert angle in radians to PixelLab 8-direction
 */
export function angleToPixelLabDirection(angle: number): PixelLabDirection {
  // Normalize to 0-2PI
  const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Each direction covers PI/4 radians (45 degrees)
  const index = Math.round(normalized / (Math.PI / 4)) % 8;

  // Map from angle order (starting East, CCW) to PixelLab order
  // Angle 0 = East, but PixelLab 0 = South
  const angleToPixelLab: PixelLabDirection[] = [
    PixelLabDirection.East, // 0 radians
    PixelLabDirection.NorthEast, // PI/4
    PixelLabDirection.North, // PI/2
    PixelLabDirection.NorthWest, // 3PI/4
    PixelLabDirection.West, // PI
    PixelLabDirection.SouthWest, // 5PI/4
    PixelLabDirection.South, // 3PI/2
    PixelLabDirection.SouthEast, // 7PI/4
  ];

  return angleToPixelLab[index] ?? PixelLabDirection.South;
}

/**
 * Get frame rect from a PixelLab animation sprite sheet
 * PixelLab sprite sheets are horizontal strips: frames are left-to-right
 */
export function getPixelLabFrameRect(
  frameIndex: number,
  frameSize: number,
  totalFrames: number
): { x: number; y: number; width: number; height: number } {
  // Clamp frame index
  const safeIndex = Math.max(0, Math.min(frameIndex, totalFrames - 1));

  return {
    x: safeIndex * frameSize,
    y: 0,
    width: frameSize,
    height: frameSize,
  };
}

/**
 * Build the path to a PixelLab rotation image
 */
export function getRotationImagePath(
  basePath: string,
  characterId: string,
  direction: PixelLabDirection
): string {
  const dirName = PIXELLAB_DIRECTION_NAMES[direction];
  return `${basePath}/${characterId}/rotations/${dirName}.png`;
}

/**
 * Build the path to a PixelLab animation sprite sheet
 */
export function getAnimationImagePath(
  basePath: string,
  characterId: string,
  animationName: string,
  direction: PixelLabDirection
): string {
  const dirName = PIXELLAB_DIRECTION_NAMES[direction];
  return `${basePath}/${characterId}/animations/${animationName}/${dirName}.png`;
}

/** Default frame size for PixelLab sprites */
export const PIXELLAB_DEFAULT_SIZE = 48;
