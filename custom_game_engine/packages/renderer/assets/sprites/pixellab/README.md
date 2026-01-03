# PixelLab Character Sprites

Downloaded character sprites from PixelLab.ai for the AI Village game.

## Downloaded Characters (2026-01-01)

### Death Gods
- **Thanatos** (Greek Death God) - 8 directions, 48×48px
- **Hel** (Norse Death Goddess) - 8 directions, 48×48px
- **Anubis** (Egyptian Death God) - 8 directions, 48×48px

### Angels
- **Punisher Angel** - 8 directions, 48×48px

### Pantheon Deities
- **Zeus** (Greek Sky God) - 8 directions, 48×48px
- **Athena** (Greek Wisdom) - 8 directions, 48×48px
- **Odin** (Norse All-Father) - 8 directions, 48×48px

### Fae Creatures
- **Pixie** - 8 directions, 48×48px
- **Forest Sprite** - 8 directions, 48×48px

### Elves
- **High Elf Noble** - 8 directions, 48×48px

### Aliens
- **Crystalline Quadarm Alien** - 8 directions, 48×48px
- **Gelatinous Blob Alien** - 8 directions, 48×48px
- **Mantis Hexapod Alien** - 8 directions, 48×48px

## File Structure

Each character folder contains:
```
character-name/
├── metadata.json          # Generation parameters and metadata
└── rotations/            # 8 directional sprite PNGs
    ├── south.png
    ├── south-west.png
    ├── west.png
    ├── north-west.png
    ├── north.png
    ├── north-east.png
    ├── east.png
    └── south-east.png
```

## Sprite Specifications

- **Canvas Size**: 48×48 pixels
- **Character Size**: ~28px tall, ~21px wide
- **Directions**: 8 (south, west, east, north, south-east, north-east, north-west, south-west)
- **View**: Low top-down perspective
- **Style**: Medium detail, basic shading, single color black outline
- **Format**: PNG with transparency for pixel-perfect collision detection

## Usage

Sprites can be loaded in the renderer and used for deity/special entity visualization in the game.

## Generation Info

All characters generated using PixelLab MCP server with custom proportions for variety in body types. Alien characters use experimental body proportions to create unique non-humanoid forms.
