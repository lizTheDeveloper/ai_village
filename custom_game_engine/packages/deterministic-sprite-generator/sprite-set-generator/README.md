# 🎨 Sprite Set Generator - Interactive Wizard

An interactive, visual wizard for generating consistent sprite part libraries using PixelLab.

## Features

✨ **Step-by-Step Wizard**
- Choose art style (NES, SNES, PS1, GBA, Game Boy, Neo Geo)
- Generate & approve reference character
- Auto-generate parts with live preview
- Review & regenerate individual parts

📊 **Live Progress Tracking**
- Real-time sprite sheet preview
- Progress bar showing completion
- Queue visualization with status indicators
- Auto-save version history

🎯 **Smart Generation**
- Uses reference character for style consistency
- Auto-continues to next part
- Pause/resume support
- Jump queue to regenerate specific parts

💾 **Export & Integration**
- Export complete sprite sheet as PNG
- Version history with rollback
- Ready for use in deterministic generator

## Quick Start

```bash
# Set API key in root .env
PIXELLAB_API_KEY=your_key_here

# Run the wizard
npm run sprite-wizard
```

Open browser to http://localhost:3011

## Workflow

### Step 1: Choose Art Style

Select your console era:
- **8-bit NES**: 32-48px, chunky pixels, limited palette
- **16-bit SNES**: 64-96px, detailed, 256 colors (recommended)
- **32-bit PS1**: 128-192px, pre-rendered 3D look
- **GBA**: 64-80px, bright vibrant
- **Game Boy**: 32-48px, 4-shade monochrome
- **Neo Geo**: 128-256px, arcade quality

### Step 2: Generate Reference Character

The wizard generates a reference character in your chosen style. This character serves as the style anchor for all subsequent parts.

**Approve or Regenerate:**
- ✓ Approve: Move to part generation
- 🔄 Regenerate: Generate a new reference

### Step 3: Auto-Generate Parts

Watch the sprite sheet build in real-time:

**Progress Display:**
- Live sprite sheet canvas
- Part queue with status (pending/generating/completed)
- Progress bar and percentage
- Current part being generated

**Controls:**
- ▶ Start Generation: Begin auto-generation
- ⏸ Pause: Pause between parts
- Click completed part: Jump queue to regenerate

**What's Generated:**
- 8 human head variations (round, square, oval faces × skin tones)
- 5 body types (athletic, stocky, thin, average, heavy)
- 12 hair styles (short, long, spiky, curly, ponytail, bald)
- 6 accessories (glasses, beards, wizard hat, crown, eyepatch)
- 10 monster bodies (tentacles, wings, furry, slime, scales, etc.)
- 8 monster heads (dragon, demon, skull, cat, octopus, robot, etc.)

**Total: 49 parts per art style**

### Step 4: Review & Refine

After generation completes:

**Review Grid:**
- See all generated parts
- Click any part to view version history
- Select previous versions or regenerate

**Version History:**
- All previous generations saved
- Rollback to any version
- Compare versions side-by-side

**Export:**
- 💾 Export Sprite Sheet: Download PNG with all parts
- Sheet includes all active versions
- Organized grid layout

## Part Categories

### Heads (16 total)
- 8 human variations (different face shapes and skin tones)
- 8 monster/creature heads (dragon, demon, skull, etc.)

### Bodies (15 total)
- 5 human body types
- 10 exotic monster bodies (tentacles, wings, etc.)

### Hair (12 total)
- Short, medium, long lengths
- Spiky, wavy, straight, curly styles
- Ponytails and bald option

### Accessories (6 total)
- Eyewear (glasses)
- Facial hair (beards)
- Headwear (wizard hat, crown)
- Unique items (eyepatch)

## Technical Details

**Generation Flow:**
1. Reference character generated first (no reference)
2. First part uses reference character for style
3. Subsequent parts use first generated part as reference
4. Maintains consistency through reference chaining

**Rate Limiting:**
- 5 second delay between API calls
- Automatic retry on errors
- Pause/resume support

**Storage:**
- All versions saved in memory
- Export sprite sheet to PNG
- Can save/load generation state (coming soon)

## Tips

**For Best Results:**
1. Start with SNES style (best balance of detail vs speed)
2. Carefully review reference character - it sets the style
3. Let full generation complete before review
4. Use "jump queue" sparingly during generation
5. Review all parts before finalizing

**Regeneration Strategy:**
- Regenerate reference if style is off
- Regenerate early parts (heads/bodies) if inconsistent
- Hair and accessories are more forgiving

**Export Tips:**
- Export frequently to avoid losing work
- Keep multiple versions for comparison
- Name exports clearly (snes-v1, snes-v2, etc.)

## Integration with Deterministic Generator

Once you have a sprite sheet:

1. **Export sprite sheet** from wizard
2. **Place in assets/** directory
3. **Update deterministic generator** to load from sheet:

```typescript
// Load from sprite sheet instead of procedural generation
const headImage = loadFromSheet('sprite-sheet-snes.png', 'head_round_pale');
```

## Extending to New Art Styles

The wizard supports all art styles defined in `src/artStyles.ts`:

```typescript
export const ART_STYLES = {
  nes: { era: '8-bit', baseSizes: { min: 32, max: 48 }, ... },
  snes: { era: '16-bit', baseSizes: { min: 64, max: 96 }, ... },
  ps1: { era: '32-bit', baseSizes: { min: 128, max: 192 }, ... },
  // ... add more styles here
};
```

## Troubleshooting

**"No reference image"**
- Ensure Step 2 completed successfully
- Check browser console for errors
- Verify API key is valid

**"Generation stuck"**
- Check browser network tab for API errors
- Try pausing and resuming
- Refresh page (progress will be lost)

**"Parts look inconsistent"**
- Regenerate reference character
- Start fresh with new reference
- Try different art style

**"API rate limit errors"**
- Script includes 5s delays
- If hitting limits, increase delay in code
- Contact PixelLab for rate limit increase

## Future Enhancements

- [ ] Save/load generation state
- [ ] Batch regeneration mode
- [ ] Style transfer between sheets
- [ ] Custom part definitions
- [ ] A/B comparison view
- [ ] Automatic best-of-N selection
- [ ] Integration with game preview

## Architecture

**UI Components:**
- Wizard flow (4 steps)
- Live sprite sheet canvas
- Part queue visualization
- Version history modal

**State Management:**
- Global generation state
- Version tracking per part
- Active version selection
- Pause/resume support

**API Integration:**
- PixelLab generate-image-pixflux endpoint
- Reference-based generation
- Rate limiting
- Error handling
