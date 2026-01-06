/**
 * Sprite part library
 */

import type { Color, PartDefinition } from './types.js';
import { PixelCanvas } from './PixelCanvas.js';

export const PARTS: PartDefinition[] = [
  // Humanoid bodies - Multiple variations
  {
    id: 'humanoid_body_stocky',
    name: 'Stocky Body',
    slot: 'body',
    tags: ['humanoid', 'stocky'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };
      const dark = { r: skin.r - 30, g: skin.g - 30, b: skin.b - 30, a: 255 };

      // Wide torso
      canvas.fillRect(4, 9, 8, 7, skin);
      canvas.fillRect(5, 16, 6, 1, dark); // Belt line

      // Thick arms
      canvas.fillRect(2, 10, 2, 6, skin);
      canvas.fillRect(12, 10, 2, 6, skin);

      // Sturdy legs
      canvas.fillRect(5, 17, 3, 5, skin);
      canvas.fillRect(8, 17, 3, 5, skin);

      return canvas.toPixelData();
    },
  },
  {
    id: 'humanoid_body_thin',
    name: 'Thin Body',
    slot: 'body',
    tags: ['humanoid', 'thin'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };

      // Narrow torso
      canvas.fillRect(6, 9, 4, 8, skin);

      // Thin arms
      canvas.fillRect(4, 11, 1, 5, skin);
      canvas.fillRect(11, 11, 1, 5, skin);

      // Long thin legs
      canvas.fillRect(6, 17, 2, 6, skin);
      canvas.fillRect(8, 17, 2, 6, skin);

      return canvas.toPixelData();
    },
  },
  {
    id: 'humanoid_body_athletic',
    name: 'Athletic Body',
    slot: 'body',
    tags: ['humanoid', 'athletic'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };
      const muscle = { r: skin.r - 20, g: skin.g - 20, b: skin.b - 20, a: 255 };

      // V-shaped torso
      canvas.fillRect(5, 9, 6, 3, skin); // Shoulders
      canvas.fillRect(6, 12, 4, 5, skin); // Core
      canvas.setPixel(5, 12, muscle); // Definition
      canvas.setPixel(10, 12, muscle);

      // Defined arms
      canvas.fillRect(3, 10, 2, 6, skin);
      canvas.fillRect(11, 10, 2, 6, skin);
      canvas.setPixel(3, 13, muscle);
      canvas.setPixel(12, 13, muscle);

      // Strong legs
      canvas.fillRect(6, 17, 2, 6, skin);
      canvas.fillRect(8, 17, 2, 6, skin);

      return canvas.toPixelData();
    },
  },

  // Humanoid heads - Multiple variations
  {
    id: 'humanoid_head_round',
    name: 'Round Head',
    slot: 'head',
    tags: ['humanoid', 'round'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };
      const dark = { r: skin.r - 30, g: skin.g - 30, b: skin.b - 30, a: 255 };

      // Round head with ears
      canvas.fillRect(6, 4, 4, 5, skin);
      canvas.fillRect(7, 3, 2, 1, skin); // Top
      canvas.fillRect(7, 9, 2, 1, skin); // Chin

      // Ears
      canvas.setPixel(5, 6, skin);
      canvas.setPixel(10, 6, skin);

      return canvas.toPixelData();
    },
  },
  {
    id: 'humanoid_head_square',
    name: 'Square Head',
    slot: 'head',
    tags: ['humanoid', 'square'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };

      // Square head
      canvas.fillRect(6, 3, 4, 6, skin);

      // Strong jaw
      canvas.fillRect(7, 9, 2, 1, skin);

      return canvas.toPixelData();
    },
  },
  {
    id: 'humanoid_head_oval',
    name: 'Oval Head',
    slot: 'head',
    tags: ['humanoid', 'oval'],
    colorZones: ['skin'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const skin = colors.skin || { r: 255, g: 200, b: 180, a: 255 };

      // Tall oval
      canvas.fillRect(7, 2, 2, 8, skin);
      canvas.fillRect(6, 3, 4, 6, skin);

      // Small ears
      canvas.setPixel(5, 5, skin);
      canvas.setPixel(10, 5, skin);

      return canvas.toPixelData();
    },
  },

  // Eyes - Multiple variations
  {
    id: 'eyes_dot',
    name: 'Dot Eyes',
    slot: 'eyes',
    tags: ['simple'],
    colorZones: ['eye'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const eye = colors.eye || { r: 0, g: 0, b: 0, a: 255 };

      canvas.setPixel(6, 5, eye);
      canvas.setPixel(9, 5, eye);

      return canvas.toPixelData();
    },
  },
  {
    id: 'eyes_normal',
    name: 'Normal Eyes',
    slot: 'eyes',
    tags: ['normal'],
    colorZones: ['eye'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const white = { r: 255, g: 255, b: 255, a: 255 };
      const eye = colors.eye || { r: 0, g: 0, b: 0, a: 255 };

      // Left eye
      canvas.fillRect(5, 5, 2, 2, white);
      canvas.setPixel(6, 6, eye);

      // Right eye
      canvas.fillRect(9, 5, 2, 2, white);
      canvas.setPixel(9, 6, eye);

      return canvas.toPixelData();
    },
  },
  {
    id: 'eyes_wide',
    name: 'Wide Eyes',
    slot: 'eyes',
    tags: ['expressive'],
    colorZones: ['eye'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const white = { r: 255, g: 255, b: 255, a: 255 };
      const eye = colors.eye || { r: 50, g: 50, b: 255, a: 255 };

      // Large eyes
      canvas.fillRect(5, 4, 2, 3, white);
      canvas.fillRect(6, 5, 1, 2, eye);

      canvas.fillRect(9, 4, 2, 3, white);
      canvas.fillRect(9, 5, 1, 2, eye);

      return canvas.toPixelData();
    },
  },
  {
    id: 'eyes_narrow',
    name: 'Narrow Eyes',
    slot: 'eyes',
    tags: ['serious'],
    colorZones: ['eye'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const eye = colors.eye || { r: 0, g: 0, b: 0, a: 255 };

      // Narrow slits
      canvas.fillRect(5, 5, 2, 1, eye);
      canvas.fillRect(9, 5, 2, 1, eye);

      return canvas.toPixelData();
    },
  },

  // Hair - Multiple variations
  {
    id: 'hair_short',
    name: 'Short Hair',
    slot: 'hair',
    tags: ['short'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

      canvas.fillRect(6, 2, 4, 2, hair);
      canvas.fillRect(5, 4, 6, 1, hair);

      return canvas.toPixelData();
    },
  },
  {
    id: 'hair_long',
    name: 'Long Hair',
    slot: 'hair',
    tags: ['long'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

      // Long flowing hair
      canvas.fillRect(6, 2, 4, 3, hair);
      canvas.fillRect(5, 5, 6, 5, hair);
      canvas.fillRect(4, 7, 8, 2, hair);

      return canvas.toPixelData();
    },
  },
  {
    id: 'hair_spiky',
    name: 'Spiky Hair',
    slot: 'hair',
    tags: ['spiky'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

      // Spiky points
      canvas.setPixel(6, 1, hair);
      canvas.setPixel(8, 0, hair);
      canvas.setPixel(9, 1, hair);
      canvas.fillRect(5, 2, 6, 2, hair);
      canvas.fillRect(6, 4, 4, 1, hair);

      return canvas.toPixelData();
    },
  },
  {
    id: 'hair_curly',
    name: 'Curly Hair',
    slot: 'hair',
    tags: ['curly'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

      // Fluffy curly top
      canvas.fillRect(5, 1, 6, 4, hair);
      canvas.setPixel(4, 3, hair);
      canvas.setPixel(11, 3, hair);
      canvas.fillRect(5, 5, 6, 2, hair);

      return canvas.toPixelData();
    },
  },
  {
    id: 'hair_bald',
    name: 'Bald',
    slot: 'hair',
    tags: ['bald'],
    colorZones: [],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      // No hair!
      return canvas.toPixelData();
    },
  },
  {
    id: 'hair_ponytail',
    name: 'Ponytail',
    slot: 'hair',
    tags: ['tied'],
    colorZones: ['hair'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const hair = colors.hair || { r: 100, g: 50, b: 20, a: 255 };

      // Front
      canvas.fillRect(6, 2, 4, 2, hair);
      canvas.fillRect(5, 4, 6, 1, hair);

      // Ponytail back
      canvas.fillRect(3, 5, 3, 4, hair);

      return canvas.toPixelData();
    },
  },

  // Simple parts for debugging
  {
    id: 'simple_square',
    name: 'Square',
    slot: 'base',
    tags: ['simple', 'debug'],
    colorZones: ['primary'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const primary = colors.primary || { r: 200, g: 100, b: 100, a: 255 };
      canvas.fillRect(4, 4, 8, 8, primary);
      return canvas.toPixelData();
    },
  },

  {
    id: 'simple_circle',
    name: 'Circle',
    slot: 'base',
    tags: ['simple', 'debug'],
    colorZones: ['primary'],
    draw: (w, h, colors) => {
      const canvas = new PixelCanvas(w, h);
      const primary = colors.primary || { r: 100, g: 100, b: 200, a: 255 };
      canvas.drawCircle(8, 8, 4, primary);
      return canvas.toPixelData();
    },
  },
];

export function getPartsBySlot(slot: string): PartDefinition[] {
  return PARTS.filter(part => part.slot === slot);
}

export function getPartById(id: string): PartDefinition | undefined {
  return PARTS.find(part => part.id === id);
}
