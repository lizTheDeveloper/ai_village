# Multi-Style Architecture: Planets as Art Styles

## Concept

Each planet/universe has a unique visual art style tied to gaming console eras. Sprites are generated deterministically from a planet-specific parts library.

## Style Libraries

### Planet A: 8-bit NES Era (1985-1990)
- **Aesthetic**: Chunky pixels, limited palette (56 colors), simple shading
- **Examples**: Super Mario Bros, Mega Man, Dragon Quest
- **Characteristics**:
  - 2-3 colors per sprite max
  - Hard edges, no gradients
  - Iconic and readable at small sizes
  - 32x32 to 48x48 base size

### Planet B: 16-bit SNES Era (1991-1996)
- **Aesthetic**: Detailed pixels, rich palette, smooth shading
- **Examples**: Chrono Trigger, Final Fantasy VI, Secret of Mana
- **Characteristics**:
  - 16+ colors per sprite
  - Smooth gradients and highlights
  - Expressive faces and details
  - 64x64 to 96x96 base size
  - **CURRENT REFERENCE**: Our base character

### Planet C: 32-bit PS1/Saturn Era (1995-2000)
- **Aesthetic**: Pre-rendered 3D sprites, dithered shading, high detail
- **Examples**: Final Fantasy Tactics, Disgaea, Grandia
- **Characteristics**:
  - Hundreds of colors
  - Dithering for shadows/gradients
  - Pseudo-3D look
  - 128x128+ base size

### Planet D: Game Boy Advance Era (2001-2008)
- **Aesthetic**: Bright vibrant colors, clean outlines, portable-friendly
- **Examples**: Golden Sun, Advance Wars, Fire Emblem
- **Characteristics**:
  - Saturated palette
  - Strong outlines
  - Optimized for small screens
  - 64x64 to 80x80 base size

### Planet E: Game Boy Classic (1989-1998)
- **Aesthetic**: 4-shade monochrome (green tint)
- **Examples**: Pokemon Red/Blue, Link's Awakening
- **Characteristics**:
  - ONLY 4 shades: white, light green, dark green, black
  - High contrast for readability
  - Nostalgic and iconic
  - 32x32 to 48x48 base size

### Planet F: Neo Geo Era (1990-2004)
- **Aesthetic**: Arcade quality, massive sprites, fluid animation
- **Examples**: Metal Slug, King of Fighters, Samurai Shodown
- **Characteristics**:
  - Extremely detailed
  - Large sprite sizes (128x128+)
  - Hand-drawn quality
  - Rich colors and shading

## Implementation

```typescript
interface StyleConfig {
  era: string;
  baseSizes: { min: number; max: number };
  colorDepth: string;
  shadingStyle: 'flat' | 'basic' | 'medium' | 'detailed';
  outlineStyle: 'single color' | 'selective' | 'lineless';
  referenceCharacterId: string; // PixelLab reference
}

const PLANET_STYLES: Record<string, StyleConfig> = {
  'planet_alpha': {
    era: '8-bit NES',
    baseSizes: { min: 32, max: 48 },
    colorDepth: '56 colors max',
    shadingStyle: 'flat',
    outlineStyle: 'single color',
    referenceCharacterId: 'nes_reference_id'
  },
  'planet_beta': {
    era: '16-bit SNES',
    baseSizes: { min: 64, max: 96 },
    colorDepth: '256 colors',
    shadingStyle: 'medium',
    outlineStyle: 'selective',
    referenceCharacterId: '762d156d-60dc-4822-915b-af55bc06fb49'
  },
  // ... etc
};

// Generate sprite based on planet
function generateSpriteForPlanet(agentId: string, planetId: string) {
  const style = PLANET_STYLES[planetId];
  const seed = `${agentId}_${planetId}`;

  return generateSprite({
    seed,
    template: 'humanoid',
    styleConfig: style,
    // Parts library filtered by style.era
  });
}
```

## Planet-Hopping Art Style Shifts

When agents travel between planets, their sprite style **changes instantly** to match the destination:

- Agent on 8-bit planet: Chunky NES sprite
- Agent travels to 16-bit planet: Smooth SNES sprite (same agent ID, different style)
- Agent travels to Game Boy planet: Monochrome green sprite

**Same agent genetics/identity, different visual representation per planet.**

## Parts Library Structure

```
assets/parts/
├── nes/           # 8-bit NES style parts
│   ├── heads/
│   ├── bodies/
│   ├── hair/
│   └── reference.png
├── snes/          # 16-bit SNES style parts (current)
│   ├── heads/
│   ├── bodies/
│   ├── hair/
│   └── reference.png
├── ps1/           # 32-bit PS1 style parts
│   ├── heads/
│   ├── bodies/
│   ├── hair/
│   └── reference.png
├── gba/           # GBA style parts
│   └── ...
└── gameboy/       # Game Boy monochrome parts
    └── ...
```

## Generation Strategy

**Phase 1**: Build SNES library (64x64, current)
- 10 heads, 5 bodies, 15 hair styles, 10 accessories
- **Reference**: `762d156d-60dc-4822-915b-af55bc06fb49`

**Phase 2**: Build NES library (48x48)
- Generate NES-style reference first
- 8 heads, 5 bodies, 10 hair styles, 5 accessories
- Limited colors, chunky pixels

**Phase 3**: Build PS1 library (128x128)
- Generate PS1-style reference first
- 12 heads, 6 bodies, 20 hair styles, 15 accessories
- Dithered shading, high detail

**Phase 4+**: Other eras as needed

## Lore Integration

**In-game explanation**:
> "Each realm in the multiverse has its own visual laws - the fabric of reality renders beings differently. The pixelated nature of Planet Alpha (NES) versus the smooth forms of Planet Beta (SNES) reflects fundamental differences in their dimensional frequencies."

**Player experience**:
- Traveling feels like moving between different games
- Nostalgic for different console eras
- Creates visual variety without changing character identity

## Benefits

1. **Infinite variety**: Same parts library × different styles
2. **Deterministic**: Planet ID + Agent ID = consistent sprite
3. **Nostalgic**: Appeals to different gamer generations
4. **Lore-friendly**: "Different dimensional visual laws"
5. **Performance**: Pre-generated parts, instant composition
6. **No ML needed**: Pure deterministic assembly

## Next Steps

1. Complete SNES (16-bit) library first
2. Generate NES reference character
3. Build NES library with that reference
4. Add planet-style mapping to generator
5. Test cross-planet travel style shifts

---

**This is PERFECT for deterministic generation!** 🎮✨
