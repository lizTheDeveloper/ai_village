/**
 * Main sprite generation function
 */

import { DeterministicRandom } from './DeterministicRandom.js';
import { PixelCanvas } from './PixelCanvas.js';
import { getTemplate } from './templates.js';
import { getPartsBySlot, getPartById } from './parts.js';
import { scalePixelData } from './scalePixelData.js';
import type { GenerationParams, GeneratedSprite, SpritePart, Color } from './types.js';

export function generateSprite(params: GenerationParams): GeneratedSprite {
  const { seed, template: templateId, colors = {}, scale = 1, planetaryArtStyle = 'snes' } = params;

  // Get template
  const template = getTemplate(templateId);
  const rng = new DeterministicRandom(seed);

  // Select parts for each slot
  const selectedParts: SpritePart[] = [];

  for (const slot of template.slots) {
    const slotRng = rng.derive(`slot_${slot.name}`);
    const availableParts = getPartsBySlot(slot.name);

    if (availableParts.length === 0) {
      if (slot.required) {
        throw new Error(`No parts available for required slot: ${slot.name}`);
      }
      continue;
    }

    // Randomly select part
    const partDef = slotRng.pick(availableParts);

    // Generate part with colors
    const pixelData = partDef.draw(template.baseSize.width, template.baseSize.height, colors);

    selectedParts.push({
      id: partDef.id,
      name: partDef.name,
      slot: slot.name,
      pixelData,
      anchor: slot.defaultAnchor,
      zIndex: slot.zIndex,
    });
  }

  // Sort parts by zIndex
  selectedParts.sort((a, b) => a.zIndex - b.zIndex);

  // Compose final sprite
  const finalWidth = template.baseSize.width * scale;
  const finalHeight = template.baseSize.height * scale;
  const canvas = new PixelCanvas(finalWidth, finalHeight);

  for (const part of selectedParts) {
    // Scale part to match final canvas size
    const scaledPart = scalePixelData(part.pixelData, scale);
    // Composite at origin (anchor points not yet implemented)
    canvas.compositeOver(scaledPart, 0, 0);
  }

  return {
    params,
    pixelData: canvas.toPixelData(),
    parts: selectedParts,
    metadata: {
      generatedAt: Date.now(),
      deterministic: true,
      version: '0.1.0',
    },
  };
}
