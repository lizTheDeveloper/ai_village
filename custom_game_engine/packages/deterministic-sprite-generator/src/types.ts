/**
 * Core types for deterministic sprite generation
 */

export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PixelData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface SpritePart {
  id: string;
  name: string;
  slot: string;
  pixelData: PixelData;
  anchor: Point;
  zIndex: number;
}

export interface SpriteSlot {
  name: string;
  required: boolean;
  zIndex: number;
  defaultAnchor: Point;
}

export interface SpriteTemplate {
  id: string;
  name: string;
  baseSize: { width: number; height: number };
  slots: SpriteSlot[];
}

export interface GenerationParams {
  seed: string;
  template: string;
  colors?: Record<string, Color>;
  scale?: number;
  variations?: Record<string, any>;
  planetaryArtStyle?: 'nes' | 'snes' | 'ps1' | 'gba' | 'gameboy' | 'neogeo';
}

export interface GeneratedSprite {
  params: GenerationParams;
  pixelData: PixelData;
  parts: SpritePart[];
  metadata: {
    generatedAt: number;
    deterministic: true;
    version: string;
  };
}

export interface PartDefinition {
  id: string;
  name: string;
  slot: string;
  tags: string[];
  colorZones: string[];
  draw: (width: number, height: number, colors: Record<string, Color>) => PixelData;
}
