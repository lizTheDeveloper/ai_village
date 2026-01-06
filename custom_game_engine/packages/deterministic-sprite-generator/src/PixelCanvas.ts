/**
 * Simple pixel drawing utilities
 */

import type { Color, PixelData, Point } from './types.js';

export class PixelCanvas {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }

  setPixel(x: number, y: number, color: Color): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.pixels[index] = color.r;
    this.pixels[index + 1] = color.g;
    this.pixels[index + 2] = color.b;
    this.pixels[index + 3] = color.a;
  }

  getPixel(x: number, y: number): Color {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const index = (y * this.width + x) * 4;
    return {
      r: this.pixels[index]!,
      g: this.pixels[index + 1]!,
      b: this.pixels[index + 2]!,
      a: this.pixels[index + 3]!,
    };
  }

  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.setPixel(x + dx, y + dy, color);
      }
    }
  }

  drawCircle(cx: number, cy: number, radius: number, color: Color): void {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          this.setPixel(cx + x, cy + y, color);
        }
      }
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: Color): void {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
      this.setPixel(x, y, color);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  compositeOver(other: PixelData, offsetX: number, offsetY: number): void {
    for (let y = 0; y < other.height; y++) {
      for (let x = 0; x < other.width; x++) {
        const srcIndex = (y * other.width + x) * 4;
        const srcAlpha = other.pixels[srcIndex + 3]! / 255;

        if (srcAlpha === 0) continue;

        const destX = offsetX + x;
        const destY = offsetY + y;

        if (destX < 0 || destX >= this.width || destY < 0 || destY >= this.height) continue;

        const destIndex = (destY * this.width + destX) * 4;
        const destAlpha = this.pixels[destIndex + 3]! / 255;

        const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);

        if (outAlpha === 0) continue;

        for (let c = 0; c < 3; c++) {
          this.pixels[destIndex + c] = Math.round(
            (other.pixels[srcIndex + c]! * srcAlpha + this.pixels[destIndex + c]! * destAlpha * (1 - srcAlpha)) / outAlpha
          );
        }
        this.pixels[destIndex + 3] = Math.round(outAlpha * 255);
      }
    }
  }

  toPixelData(): PixelData {
    return {
      width: this.width,
      height: this.height,
      pixels: this.pixels,
    };
  }
}
