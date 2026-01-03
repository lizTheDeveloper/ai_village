# LPC Sprite System vs PixelLab Integration

## Two Sprite Systems in the Game

### 1. LPC (Liberated Pixel Cup) - Modular Composition System
**Location**: `/packages/renderer/src/sprites/`

**Format**:
- 64×64px frames
- 4 directions (up, down, left, right)
- Multiple animations (walk, slash, spellcast, etc.)
- **Generative**: Compose characters from modular parts

**Parts System**:
```
Character = Body + Head + Hair + Clothing + Armor + Weapons
           (layered by z-index)
```

**Advantages**:
- Create thousands of variations from limited sprite sheets
- Dynamically equip armor/weapons on any character
- Memory efficient (reuse parts)
- Great for player customization and NPCs with equipment

### 2. PixelLab AI - Fully Rendered Characters
**Location**: `/packages/renderer/assets/sprites/pixellab/`

**Format**:
- 48×48px frames (configurable)
- 8 directions (including diagonals)
- Single unified sprite per character
- **Fixed**: Each character is a complete pre-rendered asset

**Advantages**:
- Highly detailed, AI-generated unique appearances
- More directions (8 vs 4)
- Better for special NPCs (deities, unique creatures)
- Supports non-humanoid forms (when using map_object API)

## Integration Strategy

### Use LPC For:
- **Player characters** - needs equipment swapping
- **Generic NPCs** - villagers, guards, merchants
- **Enemies with loot** - need to show equipped items
- **Large populations** - memory efficient

### Use PixelLab For:
- **Unique NPCs** - named characters with distinctive looks
- **Deities and special beings** - gods, angels, demons
- **Special creatures** - unique monsters, bosses
- **Non-humanoid entities** - aliens, animals, fantastical creatures

## Converting Between Systems

### PixelLab → LPC Parts (Future Enhancement)
Could segment PixelLab sprites into LPC-compatible parts:
1. Extract 8-direction sprites
2. Map to 4 LPC directions (combine diagonals)
3. Resize 48×48 → 64×64
4. Segment into body parts (head, torso, legs)
5. Register as custom LPC parts

### LPC → PixelLab Style (For Consistency)
Could use PixelLab to generate matching characters:
1. Create character in LPC compositor
2. Render all frames
3. Use as reference for PixelLab character generation
4. Get AI-enhanced version with more detail

## Current Status

**LPC Assets**: Pre-downloaded sprite sheets in `/lpc/` directory
**PixelLab Assets**: AI-generated characters in `/pixellab/` directory
**Map Objects**: Non-bipedal creatures (aliens, unicorns, etc.)

Both systems coexist - use the right tool for the job!
