/**
 * Planetary art style configurations
 * Each planet/universe renders sprites in a different console era style
 */

export type ArtStyle = 'nes' | 'snes' | 'ps1' | 'gba' | 'gameboy' | 'neogeo' |
  'genesis' | 'mastersystem' | 'turbografx' | 'n64' | 'dreamcast' | 'saturn' |
  'c64' | 'amiga' | 'atarist' | 'zxspectrum' | 'cga' | 'ega' | 'vga' | 'msx' | 'pc98' |
  'atari2600' | 'atari7800' | 'wonderswan' | 'ngpc' | 'virtualboy' | '3do' |
  'celeste' | 'undertale' | 'stardew' | 'terraria';

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

  // === SEGA Consoles ===
  genesis: {
    era: 'Sega Genesis/Mega Drive (1988-1997)',
    description: 'Bold colors, dithered gradients, detailed sprites like Sonic the Hedgehog',
    baseSizes: { min: 64, max: 96 },
    colorDepth: '512 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/genesis/',
  },

  mastersystem: {
    era: 'Sega Master System (1985-1992)',
    description: 'Vibrant 32-color palette, simpler detail like Phantasy Star',
    baseSizes: { min: 32, max: 48 },
    colorDepth: '32 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/mastersystem/',
  },

  saturn: {
    era: 'Sega Saturn (1994-2000)',
    description: '2D powerhouse, smooth gradients, arcade-quality sprites',
    baseSizes: { min: 128, max: 192 },
    colorDepth: 'Millions of colors',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/saturn/',
  },

  dreamcast: {
    era: 'Sega Dreamcast (1998-2001)',
    description: 'High-res 2D sprites, anti-aliased edges, modern pixel art',
    baseSizes: { min: 128, max: 256 },
    colorDepth: 'True color',
    shadingStyle: 'detailed shading',
    outlineStyle: 'lineless',
    partsDirectory: 'assets/parts/dreamcast/',
  },

  // === PC/Computer Era ===
  c64: {
    era: 'Commodore 64 (1982-1994)',
    description: 'Limited 16-color palette, chunky pixels, distinctive C64 aesthetic',
    baseSizes: { min: 24, max: 32 },
    colorDepth: '16 colors',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/c64/',
  },

  amiga: {
    era: 'Commodore Amiga (1985-1996)',
    description: 'Rich 32-color palette, detailed pixel art, European computer style',
    baseSizes: { min: 48, max: 64 },
    colorDepth: '4096 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/amiga/',
  },

  atarist: {
    era: 'Atari ST (1985-1993)',
    description: 'Clean pixel art, 512-color palette, European home computer aesthetic',
    baseSizes: { min: 48, max: 64 },
    colorDepth: '512 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/atarist/',
  },

  zxspectrum: {
    era: 'ZX Spectrum (1982-1992)',
    description: 'Attribute clash, 8-color palette, British home computer style',
    baseSizes: { min: 16, max: 32 },
    colorDepth: '8 colors',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/zxspectrum/',
  },

  cga: {
    era: 'CGA DOS (1981-1987)',
    description: 'Four harsh colors (cyan/magenta/white/black), early PC gaming aesthetic',
    baseSizes: { min: 16, max: 32 },
    colorDepth: '4 colors',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/cga/',
  },

  ega: {
    era: 'EGA DOS (1984-1990)',
    description: '16-color palette, dithering, classic DOS game look',
    baseSizes: { min: 24, max: 48 },
    colorDepth: '16 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/ega/',
  },

  vga: {
    era: 'VGA DOS (1987-1995)',
    description: '256-color glory, smooth gradients, peak DOS era like Commander Keen',
    baseSizes: { min: 48, max: 80 },
    colorDepth: '256 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/vga/',
  },

  msx: {
    era: 'MSX (1983-1995)',
    description: 'Japanese home computer, 16-color sprites, Metal Gear origins',
    baseSizes: { min: 32, max: 48 },
    colorDepth: '16 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/msx/',
  },

  pc98: {
    era: 'NEC PC-98 (1982-2000)',
    description: 'Japanese PC standard, 16-color palette, visual novel aesthetic',
    baseSizes: { min: 48, max: 80 },
    colorDepth: '16 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/pc98/',
  },

  // === Handheld & Specialty ===
  turbografx: {
    era: 'TurboGrafx-16 (1987-1994)',
    description: 'Bright colors, detailed sprites, underrated console',
    baseSizes: { min: 64, max: 96 },
    colorDepth: '512 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/turbografx/',
  },

  wonderswan: {
    era: 'WonderSwan (1999-2003)',
    description: 'Clean monochrome or 241-color handheld sprites',
    baseSizes: { min: 48, max: 64 },
    colorDepth: '241 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/wonderswan/',
  },

  ngpc: {
    era: 'Neo Geo Pocket Color (1999-2001)',
    description: 'Vibrant 146-color palette, SNK handheld charm',
    baseSizes: { min: 48, max: 64 },
    colorDepth: '146 colors',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/ngpc/',
  },

  virtualboy: {
    era: 'Virtual Boy (1995-1996)',
    description: 'Red and black only, 3D depth illusion, unique Nintendo failure',
    baseSizes: { min: 48, max: 80 },
    colorDepth: '4 shades of red',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/virtualboy/',
  },

  // === Early 3D Era ===
  n64: {
    era: 'Nintendo 64 (1996-2002)',
    description: 'Pre-rendered 3D sprites, texture-filtered look, Paper Mario style',
    baseSizes: { min: 96, max: 128 },
    colorDepth: 'True color',
    shadingStyle: 'detailed shading',
    outlineStyle: 'lineless',
    partsDirectory: 'assets/parts/n64/',
  },

  '3do': {
    era: '3DO (1993-1996)',
    description: 'High-color 2D sprites, multimedia console aesthetic',
    baseSizes: { min: 96, max: 128 },
    colorDepth: 'True color',
    shadingStyle: 'detailed shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/3do/',
  },

  // === Classic Atari ===
  atari2600: {
    era: 'Atari 2600 (1977-1992)',
    description: 'Extremely limited, blocky sprites, 128-color palette',
    baseSizes: { min: 8, max: 16 },
    colorDepth: '128 colors',
    shadingStyle: 'flat shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/atari2600/',
  },

  atari7800: {
    era: 'Atari 7800 (1986-1992)',
    description: 'Improved Atari sprites, 256-color palette, arcade ports',
    baseSizes: { min: 24, max: 32 },
    colorDepth: '256 colors',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/atari7800/',
  },

  // === Modern Indie Pixel Art Styles ===
  celeste: {
    era: 'Celeste (2018)',
    description: 'Modern pixel art, smooth animations, rich detail like Celeste',
    baseSizes: { min: 64, max: 96 },
    colorDepth: 'True color',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/celeste/',
  },

  undertale: {
    era: 'Undertale (2015)',
    description: 'Minimalist sprites, expressive animations, indie charm',
    baseSizes: { min: 32, max: 64 },
    colorDepth: 'Limited palette',
    shadingStyle: 'basic shading',
    outlineStyle: 'single color outline',
    partsDirectory: 'assets/parts/undertale/',
  },

  stardew: {
    era: 'Stardew Valley (2016)',
    description: 'Cozy farming game aesthetic, soft colors, detailed sprites',
    baseSizes: { min: 48, max: 64 },
    colorDepth: 'True color',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/stardew/',
  },

  terraria: {
    era: 'Terraria (2011)',
    description: 'Detailed action sprites, vibrant colors, adventure game style',
    baseSizes: { min: 48, max: 80 },
    colorDepth: 'True color',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: 'assets/parts/terraria/',
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
