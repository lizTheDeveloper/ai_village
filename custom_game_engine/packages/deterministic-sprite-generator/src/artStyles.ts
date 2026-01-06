/**
 * Planetary art style configurations
 * Each planet/universe renders sprites in a different console era style
 */

export type ArtStyle = 'nes' | 'snes' | 'ps1' | 'gba' | 'gameboy' | 'neogeo';

export interface ArtStyleConfig {
  era: string;
  description: string;
  baseSizes: { min: number; max: number };
  colorDepth: string;
  shadingStyle: 'flat shading' | 'basic shading' | 'medium shading' | 'detailed shading';
  outlineStyle: 'single color outline' | 'selective outline' | 'lineless';
  partsDirectory: string;
  referenceImageId?: string; // PixelLab reference for this style
}

export const ART_STYLES: Record<ArtStyle, ArtStyleConfig> = {
  nes: {
    era: '8-bit NES (1985-1990)',
    description: 'Chunky pixels, limited 56-color palette, simple shading like Super Mario Bros',
    baseSizes: { min: 32, max: 48 },
    colorDepth: '56 colors',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/nes/',
  },

  snes: {
    era: '16-bit SNES (1991-1996)',
    description: 'Detailed pixels, 256-color palette, smooth shading like Chrono Trigger',
    baseSizes: { min: 64, max: 96 },
    colorDepth: '256 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/snes/',
    referenceImageId: '762d156d-60dc-4822-915b-af55bc06fb49', // Our current reference
  },

  ps1: {
    era: '32-bit PS1/Saturn (1995-2000)',
    description: 'Pre-rendered 3D sprites, dithered shading, high detail like Final Fantasy Tactics',
    baseSizes: { min: 128, max: 192 },
    colorDepth: 'Thousands of colors',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/ps1/',
  },

  gba: {
    era: 'Game Boy Advance (2001-2008)',
    description: 'Bright vibrant colors, clean outlines like Golden Sun',
    baseSizes: { min: 64, max: 80 },
    colorDepth: '32,768 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/gba/',
  },

  gameboy: {
    era: 'Game Boy Classic (1989-1998)',
    description: 'Monochrome 4-shade palette with green tint like Pokemon Red/Blue',
    baseSizes: { min: 32, max: 48 },
    colorDepth: '4 shades (monochrome)',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/gameboy/',
  },

  neogeo: {
    era: 'Neo Geo Arcade (1990-2004)',
    description: 'Massive detailed sprites, hand-drawn quality like Metal Slug',
    baseSizes: { min: 128, max: 256 },
    colorDepth: '65,536 colors',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/neogeo/',
  },
};

/**
 * Get art style config by name
 */
export function getArtStyle(style: ArtStyle): ArtStyleConfig {
  return ART_STYLES[style];
}

/**
 * Deterministically pick art style from planet/universe ID
 * (For future integration when planets exist)
 */
export function getArtStyleFromPlanetId(planetId: string): ArtStyle {
  const styles: ArtStyle[] = ['nes', 'snes', 'ps1', 'gba', 'gameboy', 'neogeo'];

  // Simple hash to index
  let hash = 0;
  for (let i = 0; i < planetId.length; i++) {
    hash = ((hash << 5) - hash) + planetId.charCodeAt(i);
    hash = hash & hash;
  }

  const index = Math.abs(hash) % styles.length;
  return styles[index]!;
}
