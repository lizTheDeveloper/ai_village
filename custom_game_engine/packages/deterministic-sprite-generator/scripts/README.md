# SNES Parts Generation Scripts

## Overview

This directory contains scripts to automatically generate SNES-style (16-bit) sprite parts using the PixelLab API.

## Prerequisites

1. **PixelLab API Key**: Set `PIXELLAB_API_KEY` in `custom_game_engine/.env`
2. **Reference Character**: The SNES reference character must exist (ID: `762d156d-60dc-4822-915b-af55bc06fb49`)

## Scripts

### `generate-snes-parts.ts`

Generates all 49 SNES sprite parts (heads, bodies, hair, accessories) using the reference character for style consistency.

**Usage:**

```bash
cd packages/deterministic-sprite-generator
npx ts-node scripts/generate-snes-parts.ts
```

**Features:**
- ✅ Automatic resume from where it left off (tracks progress in `generation-progress.json`)
- ✅ Rate limiting (5 seconds between API calls)
- ✅ Reference-based generation for consistent art style
- ✅ Organized output by category (`assets/parts/snes/{category}/{id}.png`)
- ✅ Progress tracking and error reporting

**Output:**

Parts are saved to:
```
assets/parts/snes/
  head/
    head_round_pale.png
    head_round_tan.png
    ...
  body/
    body_athletic.png
    body_stocky.png
    ...
  hair/
    hair_spiky_brown.png
    hair_spiky_blonde.png
    ...
  accessory/
    accessory_glasses_round.png
    accessory_beard_short.png
    ...
```

**Generation Time:**

- Total parts: 49
- Rate limit: 5 seconds between calls
- Estimated time: ~5 minutes (excluding generation time per part)

**Resuming:**

The script automatically saves progress to `generation-progress.json`. If interrupted, simply run it again and it will skip already completed parts.

To start fresh:
```bash
rm scripts/generation-progress.json
```

## Parts Library

The parts are defined in `batch-generate-snes-parts.ts`:

- **8 Human Heads**: Round, square, oval, angular faces with varying skin tones
- **5 Human Bodies**: Athletic, stocky, thin, average, heavy builds
- **12 Hair Styles**: Spiky, long, short, ponytail, curly, bald, etc.
- **6 Accessories**: Glasses, beards, wizard hat, crown, eyepatch
- **10 Monster Bodies**: Tentacles, wings, furry, slime, scales, robot, ghost, insect, plant, crystal
- **8 Monster Heads**: Dragon, demon, skull, cat, octopus, robot, slime, bird

## Next Steps

After generation completes:

1. **Review Generated Parts**: Check `assets/parts/snes/` for quality
2. **Update Parts Loader**: Modify `src/parts.ts` to load from PNG files instead of procedural generation
3. **Test**: Run the test screen to verify parts work correctly
4. **Regenerate Failed Parts**: If any parts failed, check errors and regenerate manually if needed

## Troubleshooting

**"PIXELLAB_API_KEY not set"**
- Ensure `.env` exists in `custom_game_engine/` with `PIXELLAB_API_KEY=your_key_here`

**"Reference character has no rotations"**
- The reference character may not be fully generated yet
- Check character status: Visit PixelLab dashboard

**"API error 429: Sorry, you need to wait longer"**
- Rate limit hit. The script will automatically handle this between calls.
- If you hit this, wait ~10 seconds and restart the script (it will resume)

**ESM/TypeScript errors**
- Ensure you're running from the package directory
- Check that `tsconfig.json` includes `"ts-node": { "esm": true }`
