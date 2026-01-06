/**
 * Load PNG images and convert to PixelData for sprite composition
 */

import type { PixelData } from './types.js';

/**
 * Load PNG from base64 string and convert to PixelData
 */
export async function loadPNGFromBase64(base64: string): Promise<PixelData> {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/png;base64,/, '');

  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob and load as image
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  return loadPNGFromURL(url);
}

/**
 * Load PNG from URL and convert to PixelData
 */
export async function loadPNGFromURL(url: string): Promise<PixelData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create canvas to extract pixel data
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image and extract pixels
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      resolve({
        width: img.width,
        height: img.height,
        pixels: imageData.data,
      });

      // Clean up
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
}

/**
 * Load PNG from file path (browser - uses fetch)
 */
export async function loadPNGFromFile(path: string): Promise<PixelData> {
  const response = await fetch(path);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  return loadPNGFromURL(url);
}
