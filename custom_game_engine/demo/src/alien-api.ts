/**
 * Alien Species Generator API
 * Backend endpoints for PixelLab integration and species persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY || '';
const PIXELLAB_API_BASE = 'https://api.pixellab.ai/v1';
const ALIEN_SPRITES_DIR = path.join(__dirname, '../../packages/renderer/assets/sprites/pixellab/aliens');
const ALIEN_REGISTRY_PATH = path.join(__dirname, '../../packages/renderer/assets/sprites/alien-species-registry.json');

// Ensure directories exist
if (!fs.existsSync(ALIEN_SPRITES_DIR)) {
  fs.mkdirSync(ALIEN_SPRITES_DIR, { recursive: true });
}

/**
 * Generate a sprite using PixelLab API
 */
export async function generateSprite(req: any, res: any) {
  try {
    const { description, image_size, no_background } = req.body;

    if (!PIXELLAB_API_KEY) {
      return res.status(500).json({ error: 'PIXELLAB_API_KEY not configured' });
    }

    const response = await fetch(`${PIXELLAB_API_BASE}/generate-image-pixflux`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        image_size,
        no_background,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PixelLab API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Sprite generation error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Save alien species with generated variants
 */
export async function saveAlienSpecies(req: any, res: any) {
  try {
    const { species, variants } = req.body;

    // Load or create registry
    let registry: any = { species_count: 0, species: {} };
    if (fs.existsSync(ALIEN_REGISTRY_PATH)) {
      registry = JSON.parse(fs.readFileSync(ALIEN_REGISTRY_PATH, 'utf-8'));
    }

    // Save species data
    const speciesId = species.id;
    registry.species[speciesId] = {
      ...species,
      variants: variants.map((v: any) => ({
        id: v.id,
        variant: v.variant,
        description: v.description,
      })),
      generated_at: new Date().toISOString(),
    };

    // Save sprite images
    for (const variant of variants) {
      const variantDir = path.join(ALIEN_SPRITES_DIR, variant.id);
      fs.mkdirSync(variantDir, { recursive: true });

      for (const [direction, base64] of Object.entries(variant.sprites)) {
        const imageBuffer = Buffer.from(base64 as string, 'base64');
        fs.writeFileSync(path.join(variantDir, `${direction}.png`), imageBuffer);
      }

      // Save variant metadata
      fs.writeFileSync(
        path.join(variantDir, 'metadata.json'),
        JSON.stringify({
          id: variant.id,
          base_species: speciesId,
          variant: variant.variant,
          description: variant.description,
          size: 48,
          directions: Object.keys(variant.sprites),
          generated_at: new Date().toISOString(),
        }, null, 2)
      );
    }

    // Update registry
    registry.species_count = Object.keys(registry.species).length;
    fs.writeFileSync(ALIEN_REGISTRY_PATH, JSON.stringify(registry, null, 2));

    res.json({ success: true, speciesId });
  } catch (error: any) {
    console.error('Species save error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all alien species from registry
 */
export async function getAllAlienSpecies(req: any, res: any) {
  try {
    if (!fs.existsSync(ALIEN_REGISTRY_PATH)) {
      return res.json({ species_count: 0, species: {} });
    }

    const registry = JSON.parse(fs.readFileSync(ALIEN_REGISTRY_PATH, 'utf-8'));
    res.json(registry);
  } catch (error: any) {
    console.error('Registry read error:', error);
    res.status(500).json({ error: error.message });
  }
}
