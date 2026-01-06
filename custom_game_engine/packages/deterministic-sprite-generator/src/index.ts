/**
 * Deterministic Sprite Generator
 * Pure algorithmic pixel art generation - no ML
 */

export { generateSprite } from './generateSprite.js';
export { DeterministicRandom } from './DeterministicRandom.js';
export { PixelCanvas } from './PixelCanvas.js';
export { TEMPLATES, getTemplate } from './templates.js';
export { PARTS, getPartsBySlot, getPartById } from './parts.js';

export type {
  Point,
  Color,
  PixelData,
  SpritePart,
  SpriteSlot,
  SpriteTemplate,
  GenerationParams,
  GeneratedSprite,
  PartDefinition,
} from './types.js';
