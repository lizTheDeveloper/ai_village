/**
 * Sprite template definitions
 */

import type { SpriteTemplate } from './types.js';

export const TEMPLATES: Record<string, SpriteTemplate> = {
  humanoid: {
    id: 'humanoid',
    name: 'Humanoid',
    baseSize: { width: 16, height: 24 },
    slots: [
      { name: 'body', required: true, zIndex: 0, defaultAnchor: { x: 8, y: 12 } },
      { name: 'head', required: true, zIndex: 1, defaultAnchor: { x: 8, y: 6 } },
      { name: 'eyes', required: false, zIndex: 2, defaultAnchor: { x: 8, y: 6 } },
      { name: 'hair', required: false, zIndex: 3, defaultAnchor: { x: 8, y: 4 } },
      { name: 'clothes', required: false, zIndex: 4, defaultAnchor: { x: 8, y: 12 } },
      { name: 'accessory', required: false, zIndex: 5, defaultAnchor: { x: 8, y: 8 } },
    ],
  },

  quadruped: {
    id: 'quadruped',
    name: 'Quadruped',
    baseSize: { width: 20, height: 16 },
    slots: [
      { name: 'body', required: true, zIndex: 0, defaultAnchor: { x: 10, y: 8 } },
      { name: 'head', required: true, zIndex: 1, defaultAnchor: { x: 16, y: 6 } },
      { name: 'legs', required: true, zIndex: -1, defaultAnchor: { x: 10, y: 12 } },
      { name: 'tail', required: false, zIndex: -2, defaultAnchor: { x: 4, y: 8 } },
      { name: 'ears', required: false, zIndex: 2, defaultAnchor: { x: 16, y: 4 } },
    ],
  },

  simple: {
    id: 'simple',
    name: 'Simple (Debug)',
    baseSize: { width: 16, height: 16 },
    slots: [
      { name: 'base', required: true, zIndex: 0, defaultAnchor: { x: 8, y: 8 } },
      { name: 'detail', required: false, zIndex: 1, defaultAnchor: { x: 8, y: 8 } },
    ],
  },
};

export function getTemplate(id: string): SpriteTemplate {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Template not found: ${id}`);
  }
  return template;
}
