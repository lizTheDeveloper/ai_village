# Alien Species Generator with PixelLab Integration

This tool allows you to generate unique alien species and create sprite variants with PixelLab.

## Features

- **Generate Alien Species**: Create biologically coherent alien species with LLM-guided trait selection
- **Detailed Sprite Prompts**: Comprehensive prompts including environmental context, danger level, and physical details
- **Editable Templates**: Modify sprite prompts before generating variants
- **Multi-Variant Generation**: Create male, female, and color variants in all 8 directions
- **Species Registry**: Automatically saves species and sprites to the registry
- **8-Directional Sprites**: Full 360° coverage (N, NE, E, SE, S, SW, W, NW)

## Setup

### 1. Install Dependencies

```bash
cd demo
npm install
```

### 2. Configure PixelLab API Key

Add your PixelLab API key to the `.env` file in the `custom_game_engine` directory:

```bash
PIXELLAB_API_KEY=your_api_key_here
```

### 3. Start Both Servers

Run both the Vite dev server and API server:

```bash
npm run dev:all
```

Or start them separately:

```bash
# Terminal 1 - Vite dev server (port 3000)
npm run dev

# Terminal 2 - API server (port 3001)
npm run api
```

## Usage

### 1. Access the Alien Generator

Open your browser to:
```
http://localhost:3000/alien-generator.html
```

### 2. Configure Constraints

Set generation constraints:
- **Intelligence Level**: From instinctual to incomprehensible
- **Sapient Requirement**: Check for soul-capable species
- **Danger Level**: Harmless to extinction-level
- **Domestication Potential**: None to excellent
- **Environment**: Terrestrial, aquatic, aerial, subterranean, void, or exotic
- **Native World**: Optional world name (affects coloring)

### 3. Generate Species

Click "Generate Alien Species" to create a new alien with:
- Scientific and common names
- Complete biological traits
- Environmental adaptations
- PixelLab sprite prompt with detailed physical descriptions

### 4. Edit Sprite Prompt (Optional)

The generated sprite prompt appears in an editable textarea. You can:
- Modify the description
- Add specific features
- Adjust coloration hints
- Fine-tune the appearance

### 5. Generate Sprite Variants

Click "🎨 Generate Sprite Variants" to:
1. Select variant types (Male, Female, Color Variant 1, Color Variant 2)
2. Click "Start Generation"
3. Watch progress as all 8 directions are generated for each variant
4. View generated sprites in real-time

### 6. Species Commit

When variant generation completes:
- Species JSON is saved to the registry
- All sprite images are saved to: `packages/renderer/assets/sprites/pixellab/aliens/{species_id}_{variant}/`
- Metadata is created for each variant
- Species is added to the alien species list

## Generated File Structure

```
packages/renderer/assets/sprites/
├── pixellab/aliens/
│   ├── alien_crystallis_araneus_123456_male/
│   │   ├── north.png
│   │   ├── northeast.png
│   │   ├── east.png
│   │   ├── southeast.png
│   │   ├── south.png
│   │   ├── southwest.png
│   │   ├── west.png
│   │   ├── northwest.png
│   │   └── metadata.json
│   ├── alien_crystallis_araneus_123456_female/
│   │   └── ... (same 8 directions)
│   └── ... (other variants)
└── alien-species-registry.json
```

## Species Registry Format

```json
{
  "species_count": 1,
  "species": {
    "alien_crystallis_araneus_123456": {
      "id": "alien_crystallis_araneus_123456",
      "name": "Crystal Spider",
      "scientificName": "Crystallis araneus",
      "description": "...",
      "bodyPlan": "crystalline_lattice",
      "locomotion": "hexapod_climbing",
      "sensorySystem": "vibration_detection",
      "diet": "mineral_crusher",
      "socialStructure": "solitary_territorial",
      "defense": "sonic_scream",
      "reproduction": "egg_laying_abundant",
      "intelligence": "basic_learning",
      "nativeWorld": "Kepler-442b",
      "domesticationPotential": "poor",
      "dangerLevel": "moderate",
      "spritePrompt": "Pixel art alien creature: ...",
      "biologyNotes": "...",
      "behaviorNotes": "...",
      "variants": [
        {
          "id": "alien_crystallis_araneus_123456_male",
          "variant": "male",
          "description": "male"
        },
        {
          "id": "alien_crystallis_araneus_123456_female",
          "variant": "female",
          "description": "female"
        }
      ],
      "generated_at": "2026-01-03T23:45:00.000Z"
    }
  }
}
```

## API Endpoints

The API server (port 3001) provides:

- **POST /api/species/sprite** - Proxy to PixelLab API
  ```json
  {
    "description": "sprite prompt with direction",
    "image_size": { "height": 48, "width": 48 },
    "no_background": true
  }
  ```

- **POST /api/species/save** - Save species with variants
  ```json
  {
    "species": { /* species data */ },
    "variants": [ /* variant data with sprites */ ]
  }
  ```

- **GET /api/species** - Get all species from registry

## Generation Time

Typical generation times:
- **Alien Species**: 1-3 seconds (LLM generation)
- **2 Variants × 8 Directions**: ~3-5 minutes (16 API calls with 2s delay)
- **4 Variants × 8 Directions**: ~6-10 minutes (32 API calls)

## Tips

1. **Start Small**: Generate 1-2 variants first to verify the sprite prompt works
2. **Edit Prompts**: Fine-tune the sprite description before generating all variants
3. **Monitor Progress**: Watch the progress bar and generated sprites in real-time
4. **Save Work**: Species and sprites are automatically saved on completion
5. **Environment Context**: Use native world names like "Lava World" or "Ice Planet" for automatic color hints

## Troubleshooting

### API Key Not Working
- Verify `PIXELLAB_API_KEY` is set in `.env`
- Restart both servers after adding the key

### Sprites Not Generating
- Check that both servers are running (ports 3000 and 3001)
- Verify PixelLab API quota/credits
- Check browser console for errors

### Slow Generation
- Normal! Each sprite takes ~2 seconds + API latency
- 8 directions × 2 variants = ~32 seconds minimum
- Do NOT close browser during generation

## Next Steps

After generating aliens:
1. Check the registry at `packages/renderer/assets/sprites/alien-species-registry.json`
2. Use sprites in the game by loading from the registry
3. Generate more variants or new species
4. Integrate alien species into soul creation system
