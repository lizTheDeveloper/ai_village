/**
 * Nearest-neighbor pixel scaling for pixel art
 */

import type { PixelData } from './types.js';

export function scalePixelData(source: PixelData, scale: number): PixelData {
  if (scale === 1) return source;

  const scaledWidth = source.width * scale;
  const scaledHeight = source.height * scale;
  const scaledPixels = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);

  // Nearest-neighbor upscaling
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const srcIndex = (srcY * source.width + srcX) * 4;
      const destIndex = (y * scaledWidth + x) * 4;

      scaledPixels[destIndex] = source.pixels[srcIndex]!;
      scaledPixels[destIndex + 1] = source.pixels[srcIndex + 1]!;
      scaledPixels[destIndex + 2] = source.pixels[srcIndex + 2]!;
      scaledPixels[destIndex + 3] = source.pixels[srcIndex + 3]!;
    }
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    pixels: scaledPixels,
  };
}
