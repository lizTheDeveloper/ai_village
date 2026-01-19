#!/usr/bin/env npx ts-node
/**
 * PixelLab Background Daemon
 *
 * Runs continuously, generating sprites on-demand as agents are born.
 * Uses PixelLab APIs to generate sprites with proper directional consistency.
 *
 * Setup:
 *   export PIXELLAB_API_KEY="your-api-key"
 *
 * Usage:
 *   npx ts-node scripts/pixellab-daemon.ts
 *   # Or run in background:
 *   nohup npx ts-node scripts/pixellab-daemon.ts > pixellab-daemon.log 2>&1 &
 *
 * Queue Job Format (sprite-generation-queue.json):
 * {
 *   "sprites": [
 *     {
 *       "folderId": "sprite_name",
 *       "description": "Visual description of the sprite",
 *       "status": "queued",
 *       "queuedAt": 1234567890,
 *       "traits": {
 *         "category": "characters",
 *         "size": 48,
 *         "name": "Character Name",
 *         "species": "human",  // If present, treated as character (multi-directional)
 *         "legs": 4,           // Number of legs (2=humanoid, 4=quadruped, >6=alien)
 *         "generationMode": "auto",  // Override detection: "auto", "pixflux", "characters", "quadruped", "alien"/"directions"
 *         "apiParams": {       // Custom API parameters to override defaults
 *           "view": "high top-down",
 *           "detail": "high detail",
 *           "outline": "lineless",
 *           "shading": "detailed shading"
 *         }
 *       }
 *     }
 *   ],
 *   "soul_sprites": [
 *     {
 *       "folderId": "soul_sprite_name",
 *       "name": "Character Name",
 *       "description": "Visual description of the character",
 *       "reincarnationCount": 3,     // Determines tier (1-8)
 *       "isAnimal": false,            // If true, uses max quality (no tier progression)
 *       "species": "human",           // Optional species type
 *       "status": "queued",
 *       "queuedAt": 1234567890
 *     }
 *   ]
 * }
 *
 * Soul Sprite Tier Progression:
 * | Tier | Lives | Size   | Directions | Animations                |
 * |------|-------|--------|------------|---------------------------|
 * | 1    | 1     | 16×16  | 1 (south)  | None                      |
 * | 2    | 2     | 24×24  | 4 cardinal | None                      |
 * | 3    | 3     | 32×32  | 8 full     | None                      |
 * | 4    | 4     | 40×40  | 8 full     | Walk                      |
 * | 5    | 5     | 48×48  | 8 full     | Walk, Run                 |
 * | 6    | 6     | 56×56  | 8 full     | Walk, Run, Idle           |
 * | 7    | 7     | 64×64  | 8 full     | Walk, Run, Idle, Attack   |
 * | 8+   | 8+    | 64×64  | 8 full     | All + Effects             |
 *
 * Animals: Always 64×64, 8 directions, full animations (no progression)
 *
 * Generation Modes:
 * - auto: Automatically detect based on species/legs (default)
 * - static: Single image using PixFlux (trees, rocks, items)
 * - humanoid: 8 directions using Characters API directly (humans, elves, orcs)
 * - quadruped: PixFlux reference + Characters API (dogs, cats, horses - 4 legs)
 * - alien/directions: PixFlux reference + Directions API (tentacles, blobs - very alien)
 *
 * API Parameter Overrides (apiParams):
 * - view: "low top-down", "high top-down", "side"
 * - detail: "low detail", "medium detail", "high detail", "highly detailed"
 * - outline: "single color outline", "single color black outline", "selective outline", "lineless"
 * - shading: "flat shading", "basic shading", "medium shading", "detailed shading", "highly detailed shading"
 * - Any other PixelLab API parameters
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const API_KEY = process.env.PIXELLAB_API_KEY;
const API_BASE = 'https://api.pixellab.ai/v1';
const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const QUEUE_PATH = path.join(__dirname, '../sprite-generation-queue.json');
const STATE_PATH = path.join(__dirname, 'pixellab-daemon-state.json');
const ASSETS_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Configuration
const CHECK_INTERVAL_MS = 60000; // Check for new jobs every 60 seconds when idle
const DELAY_AFTER_QUEUE_MS = 5000; // Wait 5 seconds between generations (rate limiting)

type AssetType = 'character' | 'animal' | 'tileset' | 'isometric_tile' | 'map_object' | 'item' | 'soul_sprite';

// Soul Sprite Tier Configuration - based on reincarnation count
interface TierConfig {
  tier: number;
  size: number;
  directions: 1 | 4 | 8;
  animations: string[];
  detail: string;
  shading: string;
  outline: string;
}

const SOUL_TIER_CONFIGS: Record<number, TierConfig> = {
  1: {
    tier: 1,
    size: 16,
    directions: 1,
    animations: [],
    detail: 'low detail',
    shading: 'flat shading',
    outline: 'single color outline',
  },
  2: {
    tier: 2,
    size: 24,
    directions: 4,
    animations: [],
    detail: 'low detail',
    shading: 'basic shading',
    outline: 'single color outline',
  },
  3: {
    tier: 3,
    size: 32,
    directions: 8,
    animations: [],
    detail: 'medium detail',
    shading: 'medium shading',
    outline: 'single color outline',
  },
  4: {
    tier: 4,
    size: 40,
    directions: 8,
    animations: ['walk'],
    detail: 'medium detail',
    shading: 'medium shading',
    outline: 'single color outline',
  },
  5: {
    tier: 5,
    size: 48,
    directions: 8,
    animations: ['walk', 'run'],
    detail: 'medium detail',
    shading: 'detailed shading',
    outline: 'single color outline',
  },
  6: {
    tier: 6,
    size: 56,
    directions: 8,
    animations: ['walk', 'run', 'idle'],
    detail: 'high detail',
    shading: 'detailed shading',
    outline: 'single color outline',
  },
  7: {
    tier: 7,
    size: 64,
    directions: 8,
    animations: ['walk', 'run', 'idle', 'attack'],
    detail: 'high detail',
    shading: 'detailed shading',
    outline: 'selective outline',
  },
  8: {
    tier: 8,
    size: 64,
    directions: 8,
    animations: ['walk', 'run', 'idle', 'attack', 'jump', 'defend'],
    detail: 'highly detailed',
    shading: 'highly detailed shading',
    outline: 'selective outline',
  },
};

// Animal config (always max quality)
const ANIMAL_TIER_CONFIG: TierConfig = {
  tier: 0,
  size: 64,
  directions: 8,
  animations: ['walk', 'run', 'idle'],
  detail: 'high detail',
  shading: 'detailed shading',
  outline: 'single color outline',
};

// Direction sets
const ALL_DIRECTIONS = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
const CARDINAL_DIRECTIONS = ['south', 'west', 'north', 'east'];

// Animation name to template ID mapping
const ANIMATION_TEMPLATES: Record<string, string> = {
  'walk': 'walking-8-frames',
  'run': 'running-8-frames',
  'idle': 'breathing-idle',
  'attack': 'cross-punch',
  'jump': 'jumping-1',
  'defend': 'crouching',
};

// Animation name to action description
const ANIMATION_ACTIONS: Record<string, string> = {
  'walk': 'walking steadily, rhythmic movement',
  'run': 'running quickly, fast movement',
  'idle': 'breathing idle, subtle movement',
  'attack': 'attacking, combat strike motion',
  'jump': 'jumping upward, airborne motion',
  'defend': 'defensive stance, blocking position',
};

function getTierConfig(reincarnationCount: number): TierConfig {
  const tier = Math.min(Math.max(reincarnationCount, 1), 8);
  return SOUL_TIER_CONFIGS[tier] ?? SOUL_TIER_CONFIGS[8]!;
}

function getDirectionsForTier(config: TierConfig): string[] {
  switch (config.directions) {
    case 1: return ['south'];
    case 4: return CARDINAL_DIRECTIONS;
    case 8: return ALL_DIRECTIONS;
    default: return ['south'];
  }
}

interface DaemonState {
  totalGenerated: number;
  totalDownloaded: number;
  startedAt: string;
  lastCheck: string;
}

function log(msg: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

function loadState(): DaemonState {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    totalGenerated: 0,
    totalDownloaded: 0,
    startedAt: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
  };
}

function saveState(state: DaemonState): void {
  state.lastCheck = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadManifest(): any {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function saveManifest(manifest: any): void {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function loadQueue(): { sprites: any[]; animations: any[]; soul_sprites: any[] } {
  if (!fs.existsSync(QUEUE_PATH)) {
    return { sprites: [], animations: [], soul_sprites: [] };
  }
  try {
    const content = fs.readFileSync(QUEUE_PATH, 'utf-8');
    const data = JSON.parse(content);
    // Handle old format (just array) and new format (object with sprites/animations/soul_sprites)
    if (Array.isArray(data)) {
      return { sprites: data, animations: [], soul_sprites: [] };
    }
    return {
      sprites: data.sprites || [],
      animations: data.animations || [],
      soul_sprites: data.soul_sprites || [],
    };
  } catch (err) {
    log(`Error loading queue: ${err}`);
    return { sprites: [], animations: [], soul_sprites: [] };
  }
}

function saveQueue(sprites: any[], animations: any[], soul_sprites: any[] = []): void {
  const data = { sprites, animations, soul_sprites };
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(data, null, 2));
}

async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  if (!API_KEY) {
    throw new Error('PIXELLAB_API_KEY not set');
  }

  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json();
}

// Generate character with all 8 directions (for moving entities)
async function generateCharacter(description: string, name: string, size: number = 48, customParams: any = {}): Promise<string> {
  const params = {
    description,
    name,
    size,
    n_directions: 8,
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
    ...customParams, // Allow overriding any parameter
  };

  const result = await apiRequest('/v1/characters', 'POST', params);
  return result.character_id || result.id;
}

// Synchronous single image generation (for static objects like trees)
async function generateSingleImage(description: string, size: number = 48, customParams: any = {}): Promise<string> {
  const params = {
    description,
    image_size: {
      height: size,
      width: size,
    },
    no_background: true,
    ...customParams, // Allow overriding any parameter
  };

  const result = await apiRequest('/generate-image-pixflux', 'POST', params);

  if (!result.image || !result.image.base64) {
    throw new Error('No image in API response');
  }

  return result.image.base64;
}

// Generate character with reference image (for non-humanoid creatures)
async function generateCharacterWithReference(description: string, name: string, referenceImageBase64: string, size: number = 48, customParams: any = {}): Promise<string> {
  const params = {
    description,
    name,
    size,
    n_directions: 8,
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
    reference_image: referenceImageBase64,
    ...customParams, // Allow overriding any parameter
  };

  const result = await apiRequest('/v1/characters', 'POST', params);
  return result.character_id || result.id;
}

// Generate 8 directional images using PixFlux + Directions API (for very alien creatures)
async function generateDirections(referenceImageBase64: string, description: string, customParams: any = {}): Promise<{ [direction: string]: string }> {
  const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
  const result: { [direction: string]: string } = {};

  for (const direction of directions) {
    const params = {
      description: `${description}, facing ${direction}`,
      reference_image: referenceImageBase64,
      ...customParams,
    };

    const dirResult = await apiRequest('/generate-image-pixflux', 'POST', params);

    if (!dirResult.image || !dirResult.image.base64) {
      throw new Error(`No image in API response for ${direction}`);
    }

    result[direction] = dirResult.image.base64;

    // Rate limiting between directions
    if (direction !== 'south-east') {
      await sleep(2000); // 2 second delay between direction generations
    }
  }

  return result;
}

// Classify creature type based on traits
function classifyCreatureType(traits: any): 'static' | 'humanoid' | 'quadruped' | 'alien' {
  if (!traits || !traits.species) {
    return 'static'; // Trees, rocks, etc.
  }

  // Check for leg count
  const legCount = traits.legs || traits.legCount || 2;
  const bodyPlan = (traits.bodyPlan || '').toLowerCase();
  const species = (traits.species || '').toLowerCase();

  // Very alien creatures (tentacles, blobs, serpents, many-legged)
  if (bodyPlan.includes('tentacle') ||
      bodyPlan.includes('blob') ||
      bodyPlan.includes('serpent') ||
      species.includes('octopus') ||
      species.includes('squid') ||
      legCount > 6) {
    return 'alien';
  }

  // Quadrupeds (4-legged animals like dogs, cats, horses)
  if (legCount === 4 ||
      bodyPlan.includes('quadruped') ||
      ['dog', 'cat', 'horse', 'cow', 'sheep', 'goat', 'deer', 'pig', 'rabbit'].includes(species)) {
    return 'quadruped';
  }

  // Humanoid (2 legs - humans, elves, orcs, etc.)
  return 'humanoid';
}

/**
 * Generate animation using PixelLab API
 * Returns character ID from the API response
 */
async function generateAnimation(
  folderId: string,
  animationName: string,
  actionDescription: string,
  directionName: string,
  referenceImagePath: string
): Promise<string> {
  // Read reference image and convert to base64
  const imageBuffer = fs.readFileSync(referenceImagePath);
  const base64Image = imageBuffer.toString('base64');

  // Get character ID from metadata if it exists
  const metadataPath = path.join(ASSETS_PATH, folderId, 'metadata_with_animations.json');
  let characterId = '';

  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    characterId = metadata.character?.id || '';
  }

  // Call PixelLab animate API
  const result = await apiRequest('/animate-with-text', 'POST', {
    character_id: characterId || undefined,
    description: actionDescription,
    reference_image: base64Image,
    template_animation_id: animationName.includes('walking') ? 'walking-8-frames' : 'walking-8-frames', // Default to walking
  });

  if (!result.character?.id) {
    throw new Error('No character ID in animation response');
  }

  return result.character.id;
}

/**
 * Save animation frames from PixelLab character
 */
async function saveAnimation(
  folderId: string,
  animationName: string,
  characterId: string,
  directionName: string
): Promise<boolean> {
  try {
    const animDir = path.join(ASSETS_PATH, folderId, 'animations', animationName, directionName);
    fs.mkdirSync(animDir, { recursive: true });

    // Poll PixelLab API for character data
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (attempts < maxAttempts) {
      const character = await apiRequest(`/characters/${characterId}`, 'GET');

      // Check if animation is ready
      if (character.frames?.animations?.[animationName]?.[directionName]) {
        const frameUrls = character.frames.animations[animationName][directionName];

        // Download each frame
        for (let i = 0; i < frameUrls.length; i++) {
          const frameUrl = frameUrls[i];
          const frameResponse = await fetch(`https://api.pixellab.ai${frameUrl}`);
          const frameBuffer = Buffer.from(await frameResponse.arrayBuffer());
          const framePath = path.join(animDir, `frame_${String(i).padStart(3, '0')}.png`);
          fs.writeFileSync(framePath, frameBuffer);
        }

        log(`  ✓ Saved ${frameUrls.length} frames for ${directionName}`);
        return true;
      }

      // Wait before next poll
      await sleep(5000);
      attempts++;
    }

    throw new Error('Animation generation timed out');
  } catch (err: any) {
    log(`  ✗ Failed to save animation: ${err.message}`);
    return false;
  }
}

// Save sprite from base64 data
async function saveSprite(localId: string, category: string, base64Data: string, description: string, size: number): Promise<boolean> {
  try {
    const spriteDir = path.join(ASSETS_PATH, localId);
    fs.mkdirSync(spriteDir, { recursive: true });

    // Save image from base64
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(path.join(spriteDir, 'sprite.png'), imageBuffer);

    // Save metadata
    fs.writeFileSync(
      path.join(spriteDir, 'metadata.json'),
      JSON.stringify({
        id: localId,
        category: category,
        size: size,
        description: description,
        generated_at: new Date().toISOString(),
        directions: ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'],
      }, null, 2)
    );

    return true;
  } catch (err) {
    log(`  Error saving sprite: ${err}`);
    return false;
  }
}

/**
 * Process a soul sprite job based on reincarnation tier
 * Generates appropriate resolution, directions, and animations
 */
async function processSoulSprite(job: any): Promise<boolean> {
  const isAnimal = job.isAnimal || false;
  const config = isAnimal ? ANIMAL_TIER_CONFIG : getTierConfig(job.reincarnationCount || 1);
  const directions = getDirectionsForTier(config);
  const folderId = job.folderId;
  const description = job.description;
  const name = job.name || folderId;

  log(`  Tier: ${config.tier} | Size: ${config.size}×${config.size} | Directions: ${config.directions} | Animations: ${config.animations.length > 0 ? config.animations.join(', ') : 'none'}`);

  const spriteDir = path.join(ASSETS_PATH, folderId);
  const spritesDir = path.join(spriteDir, 'sprites');
  fs.mkdirSync(spritesDir, { recursive: true });

  const generatedSprites: Record<string, string> = {}; // direction -> base64

  // Step 1: Generate base sprites for each direction
  log(`  Step 1: Generating ${directions.length} directional sprites...`);

  for (const direction of directions) {
    log(`    Generating ${direction}...`);

    // Use generate-image-bitforge for directional sprites
    const params = {
      description: `${description}, facing ${direction}`,
      image_size: {
        width: config.size,
        height: config.size,
      },
      view: 'high top-down',
      direction: direction,
      detail: config.detail,
      shading: config.shading,
      outline: config.outline,
      no_background: true,
    };

    const result = await apiRequest('/generate-image-bitforge', 'POST', params);

    if (!result.image?.base64) {
      throw new Error(`No image in response for direction ${direction}`);
    }

    generatedSprites[direction] = result.image.base64;

    // Save sprite immediately
    const imageBuffer = Buffer.from(result.image.base64, 'base64');
    fs.writeFileSync(path.join(spritesDir, `${direction}.png`), imageBuffer);
    log(`    ✓ ${direction}.png`);

    // Rate limiting between directions
    if (direction !== directions[directions.length - 1]) {
      await sleep(1500);
    }
  }

  // Step 2: Generate animations if tier supports them
  if (config.animations.length > 0) {
    log(`  Step 2: Generating ${config.animations.length} animations...`);

    const animDir = path.join(spriteDir, 'animations');
    fs.mkdirSync(animDir, { recursive: true });

    for (const animName of config.animations) {
      log(`    Generating animation: ${animName}...`);
      const animSubDir = path.join(animDir, animName);
      fs.mkdirSync(animSubDir, { recursive: true });

      const templateId = ANIMATION_TEMPLATES[animName] || 'walking-8-frames';
      const actionDesc = ANIMATION_ACTIONS[animName] || `performing ${animName}`;

      // Generate animation for each direction
      for (const direction of directions) {
        log(`      ${direction}...`);
        const dirSubDir = path.join(animSubDir, direction);
        fs.mkdirSync(dirSubDir, { recursive: true });

        const referenceSprite = generatedSprites[direction];
        if (!referenceSprite) {
          log(`      ⚠ No reference sprite for ${direction}, skipping`);
          continue;
        }

        // Use animate-with-text API
        const animParams = {
          description: description,
          action: actionDesc,
          image_size: { width: 64, height: 64 }, // animate-with-text is fixed at 64x64
          reference_image: referenceSprite,
          n_frames: 8,
          view: 'high top-down',
          direction: direction,
        };

        const animResult = await apiRequest('/animate-with-text', 'POST', animParams);

        if (!animResult.images || animResult.images.length === 0) {
          log(`      ⚠ No animation frames for ${direction}`);
          continue;
        }

        // Save frames
        for (let i = 0; i < animResult.images.length; i++) {
          const frameData = animResult.images[i];
          const base64Data = typeof frameData === 'string' ? frameData : (frameData.base64 || frameData.image);
          if (base64Data) {
            const frameBuffer = Buffer.from(base64Data, 'base64');
            const framePath = path.join(dirSubDir, `frame_${String(i).padStart(3, '0')}.png`);
            fs.writeFileSync(framePath, frameBuffer);
          }
        }
        log(`      ✓ ${direction} (${animResult.images.length} frames)`);

        // Rate limiting between animation generations
        await sleep(2000);
      }
    }
  }

  // Save metadata
  const metadata = {
    id: folderId,
    name: name,
    type: isAnimal ? 'animal' : 'soul_sprite',
    tier: config.tier,
    reincarnationCount: job.reincarnationCount || 0,
    isAnimal: isAnimal,
    species: job.species || 'unknown',
    config: {
      size: config.size,
      directions: config.directions,
      animations: config.animations,
      detail: config.detail,
      shading: config.shading,
      outline: config.outline,
    },
    sprites: directions.map(dir => `sprites/${dir}.png`),
    animations: config.animations.map(anim => ({
      name: anim,
      directions: directions.map(dir => `animations/${anim}/${dir}/`),
    })),
    description: description,
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(spriteDir, 'sprite-set.json'),
    JSON.stringify(metadata, null, 2)
  );

  log(`  ✓ Saved sprite-set.json`);
  return true;
}


interface PendingJob {
  type: AssetType;
  localId: string;
  description: string;
  category: string;
  extra?: any;
}

function getNextPendingJob(manifest: any): PendingJob | null {
  // Priority order: humanoids, animals, building_tiles, tilesets, map_objects, items, plants

  // 1. Humanoids (characters with 8 directions)
  if (manifest.humanoids) {
    for (const [species, data] of Object.entries(manifest.humanoids) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'character',
          localId: item.id,
          description: item.desc,
          category: `humanoids.${species}`,
          extra: {
            proportions: data.proportions,
            bodyPlan: data.bodyPlan,
            height: data.height,
          },
        };
      }
    }
  }

  // 2. Animals (smaller characters)
  if (manifest.animals) {
    for (const [category, data] of Object.entries(manifest.animals) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'animal',
          localId: item.id,
          description: item.desc,
          category: `animals.${category}`,
        };
      }
    }
  }

  // 3. Building tiles (isometric tiles)
  if (manifest.building_tiles) {
    for (const [tileType, data] of Object.entries(manifest.building_tiles) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'isometric_tile',
          localId: item.id,
          description: item.desc,
          category: `building_tiles.${tileType}`,
        };
      }
    }
  }

  // 4. Tilesets (terrain transitions)
  if (manifest.tilesets) {
    for (const [category, data] of Object.entries(manifest.tilesets) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'tileset',
          localId: item.id,
          description: `${item.lower} → ${item.upper}`,
          category: `tilesets.${category}`,
          extra: item,
        };
      }
    }
  }

  // 5. Map objects (trees, rocks, decorations)
  if (manifest.map_objects) {
    if (manifest.map_objects.pending && manifest.map_objects.pending.length > 0) {
      const item = manifest.map_objects.pending[0];
      return {
        type: 'map_object',
        localId: item.id,
        description: item.desc,
        category: 'map_objects',
        extra: { width: item.width || 48, height: item.height || 48 },
      };
    }
  }

  // 6. Items (inventory icons)
  if (manifest.items) {
    for (const [category, data] of Object.entries(manifest.items) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'item',
          localId: item.id,
          description: item.desc,
          category: `items.${category}`,
          extra: { width: 32, height: 32 },
        };
      }
    }
  }

  // 7. Plants (would need multiple stages - complex, skip for now)
  // TODO: Each plant needs 8 growth stages generated

  return null;
}

function markJobQueued(manifest: any, localId: string, category: string): void {
  // category is like "humanoids.humans" or "animals.livestock" or "map_objects"
  const parts = category.split('.');

  if (parts.length === 2) {
    const [section, subsection] = parts;
    const data = manifest[section]?.[subsection];
    if (data?.pending) {
      const idx = data.pending.findIndex((item: any) => item.id === localId);
      if (idx >= 0) {
        data.pending.splice(idx, 1);
      }
    }
  } else if (parts.length === 1) {
    // Direct section like "map_objects"
    const data = manifest[parts[0]];
    if (data?.pending) {
      const idx = data.pending.findIndex((item: any) => item.id === localId);
      if (idx >= 0) {
        data.pending.splice(idx, 1);
      }
    }
  }
}

function markJobCompleted(manifest: any, localId: string, category: string): void {
  // category is like "humanoids.humans" or "animals.livestock" or "map_objects"
  const parts = category.split('.');

  if (parts.length === 2) {
    const [section, subsection] = parts;
    const data = manifest[section]?.[subsection];
    if (data) {
      if (!data.completed) {
        data.completed = [];
      }
      if (!data.completed.includes(localId)) {
        data.completed.push(localId);
      }
    }
  } else if (parts.length === 1) {
    // Direct section like "map_objects"
    const data = manifest[parts[0]];
    if (data) {
      if (!data.completed) {
        data.completed = [];
      }
      if (!data.completed.includes(localId)) {
        data.completed.push(localId);
      }
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhance sprite description with rich visual details
 * Only enhances character sprites (with species/archetype traits)
 */
function enhanceSpriteDescription(baseDescription: string, traits: any): string {
  // If no species trait, this is not a character (tree, rock, etc.) - return original
  if (!traits || !traits.species) {
    return baseDescription;
  }

  const parts: string[] = [];

  // Extract key information from base description
  const species = traits.species;
  const name = traits.name || '';
  const archetype = traits.archetype || '';
  const reincarnationCount = traits.reincarnationCount || 1;

  // Build detailed character description based on archetype and species
  const archetypeDescriptions: Record<string, string> = {
    warrior: 'seasoned warrior with battle-worn armor, leather straps, metal plates, carrying a sword and shield',
    mage: 'mystical mage in flowing robes adorned with arcane symbols, carrying a glowing staff',
    scholar: 'learned scholar in academic robes with leather-bound tome, ink-stained fingers, wearing spectacles',
    artisan: 'skilled craftsperson in sturdy work clothes, leather apron, tool belt with hammer and chisel',
    merchant: 'prosperous trader in fine wool doublet, silk vest with gold buttons, coin purse at belt',
    farmer: 'hardworking farmer in simple linen tunic, rolled-up sleeves, dirt-stained trousers, straw hat',
    healer: 'compassionate healer in white robes with red cross emblem, carrying medicine bag with herbs',
    explorer: 'adventurous explorer in weathered travel gear, leather jacket, rope coil, backpack with supplies',
    noble: 'dignified noble in elegant silk attire with velvet cloak, gold trim, jeweled rings',
    priest: 'devoted priest in ceremonial robes with holy symbols, prayer beads, ceremonial staff',
    unifier: 'charismatic leader in practical yet distinguished clothing, diplomatic sash, peace symbol',
    seeker: 'wise wanderer in travel-worn robes, carrying ancient scrolls and mystical artifacts',
    creator: 'inventive artisan with paint-stained smock, carrying tools and creative materials',
  };

  // Species-specific visual details - only for non-human species
  const speciesDetails: Record<string, string> = {
    elf: 'elf with elegant pointed ears, tall slender build, fair skin, ethereal graceful features, long flowing hair',
    dwarf: 'dwarf with thick braided beard, short stocky muscular build, broad shoulders, weathered rugged features',
    orc: 'orc with green skin, pronounced lower tusks, broad muscular physique, strong jaw, intense gaze',
    thrakeen: 'thrakeen reptilian humanoid with iridescent scaled skin, ridge along spine, clawed hands, serpentine eyes with vertical pupils',
    celestial: 'celestial being with radiant pale skin, subtle ethereal glow, serene features, luminous eyes',
    aquatic: 'aquatic merfolk with blue-green scaled skin, webbed fingers, gill slits on neck, flowing hair like seaweed',
  };

  // Build the enhanced description
  // Start with species description (detailed for non-humans, simple for humans)
  if (species.toLowerCase() === 'human') {
    parts.push('human');
  } else if (speciesDetails[species.toLowerCase()]) {
    parts.push(speciesDetails[species.toLowerCase()]);
  } else {
    parts.push(`${species} humanoid`);
  }

  // Add archetype details if available
  if (archetype && archetypeDescriptions[archetype.toLowerCase()]) {
    parts.push(archetypeDescriptions[archetype.toLowerCase()]);
  } else if (archetype) {
    parts.push(`${archetype} profession`);
  }

  // Add experience/wisdom based on reincarnation count (shown through appearance, not calling them souls)
  if (reincarnationCount > 15) {
    parts.push('weathered wise appearance with knowing eyes, calm confident bearing');
  } else if (reincarnationCount > 10) {
    parts.push('experienced veteran with confident posture, steady gaze');
  } else if (reincarnationCount > 5) {
    parts.push('mature bearing with composed expression');
  } else if (reincarnationCount > 1) {
    parts.push('young adult with eager bright expression');
  } else {
    parts.push('youthful appearance with fresh innocent features');
  }

  // Pixel art specifications
  parts.push('detailed pixel art');
  parts.push('top-down 45-degree view');
  parts.push('clear silhouette');
  parts.push('vibrant colors');
  parts.push('visible facial features and clothing details');

  return parts.join(', ');
}

// ============ Main Loop ============

async function runDaemon(): Promise<void> {
  if (!API_KEY) {
    console.error('Error: PIXELLAB_API_KEY not set.');
    console.log('Set it with: export PIXELLAB_API_KEY="your-key"');
    console.log('Or add to .env file in custom_game_engine/');
    process.exit(1);
  }

  log('=== PixelLab Daemon Started ===');
  log(`Rate limit delay: ${DELAY_AFTER_QUEUE_MS / 1000}s between generations`);
  log(`Idle check interval: ${CHECK_INTERVAL_MS / 1000}s`);
  log('Press Ctrl+C to stop\n');

  const state = loadState();
  state.startedAt = new Date().toISOString();

  while (true) {
    try {
      // Check on-demand queue first (higher priority)
      const queue = loadQueue();
      const spriteJobs = queue.sprites;
      const animJobs = queue.animations;
      const soulSpriteJobs = queue.soul_sprites;

      // Process soul sprite jobs first (highest priority - complex generation)
      const soulJob = soulSpriteJobs.find((job: any) => job.status === 'queued');

      if (soulJob) {
        log(`\n[SoulSprite] Generating: ${soulJob.folderId}`);
        log(`  Name: ${soulJob.name || soulJob.folderId}`);
        log(`  Description: ${soulJob.description}`);
        log(`  Reincarnation count: ${soulJob.reincarnationCount || 0}`);
        log(`  Is animal: ${soulJob.isAnimal || false}`);

        try {
          await processSoulSprite(soulJob);

          // Mark as complete and remove from queue
          soulJob.status = 'complete';
          soulJob.completedAt = Date.now();
          const updatedSoulSprites = soulSpriteJobs.filter((j: any) => j.folderId !== soulJob.folderId);
          saveQueue(spriteJobs, animJobs, updatedSoulSprites);

          state.totalGenerated++;
          state.totalDownloaded++;
          saveState(state);

          log(`  ✓ Soul sprite complete: ${soulJob.folderId}`);
          log(`  ✓ Removed from queue (${spriteJobs.length} sprites, ${animJobs.length} animations, ${updatedSoulSprites.length} soul_sprites remaining)`);

          // Rate limiting
          log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
          await sleep(DELAY_AFTER_QUEUE_MS);
          continue;

        } catch (err: any) {
          log(`  ✗ Error: ${err.message}`);
          soulJob.status = 'failed';
          soulJob.error = err.message;
          saveQueue(spriteJobs, animJobs, soulSpriteJobs);

          if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
            log('  Rate limited - waiting longer before retry');
            await sleep(CHECK_INTERVAL_MS);
          }
          continue;
        }
      }

      // Process sprite generation jobs
      const queueJob = spriteJobs.find((job: any) => job.status === 'queued');

      if (queueJob) {
        // Process on-demand sprite generation request
        log(`\n[Queue] Generating: ${queueJob.folderId}`);
        log(`  Original description: ${queueJob.description}`);

        try {
          // Determine size from traits or default to 48
          const size = queueJob.traits?.size || 48;
          const name = queueJob.traits?.name || queueJob.folderId;

          // Enhance the description with visual details
          const enhancedDescription = enhanceSpriteDescription(queueJob.description, queueJob.traits);
          log(`  Enhanced description: ${enhancedDescription}`);

          // Check for explicit generation mode override
          const generationMode = queueJob.traits?.generationMode || 'auto';

          // Classify creature type (can be overridden by generationMode)
          let creatureType = 'static';
          if (generationMode === 'auto') {
            creatureType = classifyCreatureType(queueJob.traits);
          } else if (generationMode === 'pixflux') {
            creatureType = 'static';
          } else if (generationMode === 'characters') {
            creatureType = 'humanoid';
          } else if (generationMode === 'quadruped') {
            creatureType = 'quadruped';
          } else if (generationMode === 'alien' || generationMode === 'directions') {
            creatureType = 'alien';
          }

          log(`  Creature type: ${creatureType} (mode: ${generationMode})`);

          // Extract custom API parameters from traits
          const apiParams = queueJob.traits?.apiParams || {};

          if (creatureType === 'static') {
            // Static object (tree, rock, etc.) - use single image generation
            log(`  Generating static object...`);
            const base64Data = await generateSingleImage(enhancedDescription, size, apiParams);
            log(`  ✓ Generated single image`);

            // Save as simple sprite
            const category = queueJob.traits?.category || 'objects';
            const spriteDir = path.join(ASSETS_PATH, queueJob.folderId);
            fs.mkdirSync(spriteDir, { recursive: true });

            // Save image
            const imageBuffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(path.join(spriteDir, 'sprite.png'), imageBuffer);

            // Save metadata
            const metadata = {
              id: queueJob.folderId,
              category,
              size,
              description: enhancedDescription,
              original_description: queueJob.description,
              generated_at: new Date().toISOString(),
              type: 'static',
            };
            fs.writeFileSync(path.join(spriteDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

          } else if (creatureType === 'humanoid') {
            // Humanoid character - use Characters API directly
            log(`  Requesting humanoid character generation...`);
            const characterId = await generateCharacter(enhancedDescription, name, size, apiParams);
            log(`  ✓ Character queued: ${characterId}`);

            // Poll for completion
            log(`  Polling for completion...`);
            let attempts = 0;
            const maxAttempts = 120; // 10 minutes max wait (5s * 120)
            let character: any = null;

            while (attempts < maxAttempts) {
              await sleep(5000); // Wait 5 seconds between polls
              attempts++;

              character = await apiRequest(`/v1/characters/${characterId}`, 'GET');

              if (character.status === 'completed' || character.rotations) {
                log(`  ✓ Character generation complete!`);
                break;
              } else if (character.status === 'failed') {
                throw new Error('Character generation failed');
              }

              if (attempts % 6 === 0) { // Log every 30 seconds
                log(`  ⏳ Still processing... (${attempts * 5}s elapsed)`);
              }
            }

            if (!character || (!character.rotations && character.status !== 'completed')) {
              throw new Error('Character generation timed out');
            }

            // Download all 8 directions
            log(`  Downloading rotations...`);
            const charDir = path.join(ASSETS_PATH, queueJob.folderId);
            const rotationsDir = path.join(charDir, 'rotations');
            fs.mkdirSync(rotationsDir, { recursive: true });

            const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
            for (const dir of directions) {
              const url = character.rotations?.[dir] || character.frames?.rotations?.[dir];
              if (url) {
                const fullUrl = url.startsWith('http') ? url : `https://api.pixellab.ai${url}`;
                const response = await fetch(fullUrl);
                const buffer = Buffer.from(await response.arrayBuffer());
                const destFile = path.join(rotationsDir, `${dir}.png`);
                fs.writeFileSync(destFile, buffer);
                log(`    ✓ ${dir}.png`);
              }
            }

            // Save metadata
            const metadata = {
              id: queueJob.folderId,
              category: queueJob.traits?.category || 'characters',
              size,
              description: enhancedDescription,
              original_description: queueJob.description,
              generated_at: new Date().toISOString(),
              pixellab_character_id: characterId,
              directions: directions,
              type: 'humanoid',
            };
            fs.writeFileSync(path.join(charDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

          } else if (creatureType === 'quadruped') {
            // Quadruped (4-legged animal) - generate each direction separately using PixFlux
            log(`  Generating quadruped: PixFlux per-direction...`);

            const charDir = path.join(ASSETS_PATH, queueJob.folderId);
            fs.mkdirSync(charDir, { recursive: true });

            // Direction descriptions for proper facing
            const directionDescriptions: Record<string, string> = {
              'south': 'facing toward the camera, front view from above',
              'south-west': 'facing southwest, angled front-left view from above',
              'west': 'facing left, side profile view from above',
              'north-west': 'facing northwest, angled back-left view from above',
              'north': 'facing away from camera, rear view from above',
              'north-east': 'facing northeast, angled back-right view from above',
              'east': 'facing right, side profile view from above',
              'south-east': 'facing southeast, angled front-right view from above',
            };

            const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

            for (let i = 0; i < directions.length; i++) {
              const dir = directions[i];
              const dirDesc = directionDescriptions[dir];

              // Build direction-specific description
              const dirDescription = `${queueJob.description} as a quadruped animal on all four legs, ${dirDesc}, natural animal pose, pixel art style, top-down perspective, transparent background`;

              log(`    [${dir}] Generating...`);

              const result = await apiRequest('/generate-image-pixflux', 'POST', {
                description: dirDescription,
                image_size: { height: size, width: size },
                no_background: true,
                ...apiParams,
              });

              if (!result.image || !result.image.base64) {
                throw new Error(`No image in API response for direction ${dir}`);
              }

              const imageBuffer = Buffer.from(result.image.base64, 'base64');
              fs.writeFileSync(path.join(charDir, `${dir}.png`), imageBuffer);
              log(`    [${dir}] ✓ Saved`);

              // Rate limiting between directions (except last)
              if (i < directions.length - 1) {
                await sleep(2000);
              }
            }

            // Save metadata
            const metadata = {
              id: queueJob.folderId,
              category: queueJob.traits?.category || 'animals',
              size,
              description: queueJob.description,
              original_description: queueJob.description,
              generated_at: new Date().toISOString(),
              directions: directions,
              type: 'quadruped',
            };
            fs.writeFileSync(path.join(charDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

          } else if (creatureType === 'alien') {
            // Very alien creatures - generate PixFlux reference, then use Directions API
            log(`  Generating alien creature: PixFlux reference + Directions API...`);

            // Step 1: Generate reference image using PixFlux
            log(`  Step 1: Generating PixFlux reference image...`);
            const referenceBase64 = await generateSingleImage(enhancedDescription, size, apiParams);
            log(`  ✓ Reference image generated`);

            // Step 2: Generate all 8 directions using PixFlux Directions
            log(`  Step 2: Generating all 8 directions from reference...`);
            const directionalImages = await generateDirections(referenceBase64, enhancedDescription, apiParams);
            log(`  ✓ All 8 directions generated`);

            // Save all directions
            const charDir = path.join(ASSETS_PATH, queueJob.folderId);
            const rotationsDir = path.join(charDir, 'rotations');
            fs.mkdirSync(rotationsDir, { recursive: true });

            const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
            for (const dir of directions) {
              const imageBuffer = Buffer.from(directionalImages[dir], 'base64');
              const destFile = path.join(rotationsDir, `${dir}.png`);
              fs.writeFileSync(destFile, imageBuffer);
              log(`    ✓ ${dir}.png`);
            }

            // Save metadata
            const metadata = {
              id: queueJob.folderId,
              category: queueJob.traits?.category || 'aliens',
              size,
              description: enhancedDescription,
              original_description: queueJob.description,
              generated_at: new Date().toISOString(),
              directions: directions,
              type: 'alien',
            };
            fs.writeFileSync(path.join(charDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
          }

          // Mark as complete and remove from queue
          queueJob.status = 'complete';
          queueJob.completedAt = Date.now();
          const updatedSprites = spriteJobs.filter((j: any) => j.folderId !== queueJob.folderId);
          saveQueue(updatedSprites, animJobs, soulSpriteJobs);

          state.totalGenerated++;
          state.totalDownloaded++;
          saveState(state);

          log(`  ✓ Saved: ${queueJob.folderId}`);
          log(`  ✓ Removed from queue (${updatedSprites.length} sprites, ${animJobs.length} animations, ${soulSpriteJobs.length} soul_sprites remaining)`);

          // Rate limiting
          log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
          await sleep(DELAY_AFTER_QUEUE_MS);
          continue;

        } catch (err: any) {
          log(`  ✗ Error: ${err.message}`);
          queueJob.status = 'failed';
          queueJob.error = err.message;
          saveQueue(spriteJobs, animJobs, soulSpriteJobs);

          if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
            log('  Rate limited - waiting longer before retry');
            await sleep(CHECK_INTERVAL_MS);
          }
          continue;
        }
      }

      // Process animation generation jobs
      const animJob = animJobs.find((job: any) => job.status === 'queued');

      if (animJob) {
        log(`\n[AnimQueue] Generating: ${animJob.folderId}:${animJob.animationName}`);
        log(`  Action: ${animJob.actionDescription}`);

        try {
          // Determine which directions to generate (only non-mirrored ones)
          const directionsToGenerate = ['south', 'south-east', 'east', 'north-east', 'north'];

          let characterId = animJob.characterId;

          for (const direction of directionsToGenerate) {
            log(`  Generating ${direction}...`);

            // Find reference sprite image
            const spriteDir = path.join(ASSETS_PATH, animJob.folderId);
            let referencePath = path.join(spriteDir, `${direction}.png`);

            // Try alternate naming conventions
            if (!fs.existsSync(referencePath)) {
              referencePath = path.join(spriteDir, 'rotations', `${direction}.png`);
            }
            if (!fs.existsSync(referencePath)) {
              const altDirection = direction.replace('-', ''); // Try 'southeast' instead of 'south-east'
              referencePath = path.join(spriteDir, `${altDirection}.png`);
            }
            if (!fs.existsSync(referencePath)) {
              log(`  ⚠ No reference sprite for ${direction}, skipping`);
              continue;
            }

            // Generate animation for this direction
            characterId = await generateAnimation(
              animJob.folderId,
              animJob.animationName,
              animJob.actionDescription,
              direction,
              referencePath
            );

            // Save animation frames
            await saveAnimation(
              animJob.folderId,
              animJob.animationName,
              characterId,
              direction
            );

            log(`  ✓ Generated ${direction}`);
          }

          // Mark as complete and remove from queue
          animJob.status = 'complete';
          animJob.completedAt = Date.now();
          animJob.characterId = characterId;
          const updatedAnims = animJobs.filter((j: any) =>
            !(j.folderId === animJob.folderId && j.animationName === animJob.animationName)
          );
          saveQueue(spriteJobs, updatedAnims, soulSpriteJobs);

          state.totalGenerated++;
          saveState(state);

          log(`  ✓ Animation complete: ${animJob.folderId}:${animJob.animationName}`);
          log(`  ✓ Removed from queue (${spriteJobs.length} sprites, ${updatedAnims.length} animations, ${soulSpriteJobs.length} soul_sprites remaining)`);

          // Rate limiting
          log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
          await sleep(DELAY_AFTER_QUEUE_MS);
          continue;

        } catch (err: any) {
          log(`  ✗ Error: ${err.message}`);
          animJob.status = 'failed';
          animJob.error = err.message;
          saveQueue(spriteJobs, animJobs, soulSpriteJobs);

          if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
            log('  Rate limited - waiting longer before retry');
            await sleep(CHECK_INTERVAL_MS);
          }
          continue;
        }
      }

      // No queue jobs - check manifest
      const manifest = loadManifest();

      // Get next pending job
      const nextJob = getNextPendingJob(manifest);
      if (!nextJob) {
        log('No more pending jobs in manifest or queue. Waiting for new entries...');
        await sleep(CHECK_INTERVAL_MS);
        continue;
      }

      log(`\nGenerating ${nextJob.type}: ${nextJob.localId}`);
      log(`  ${nextJob.description}`);

      try {
        // Determine size based on asset type
        let size = 48;
        if (nextJob.type === 'animal') size = 32;
        if (nextJob.extra?.width) size = nextJob.extra.width;

        // Generate sprite synchronously
        const base64Data = await generateSingleImage(nextJob.description, size);
        log(`  ✓ Generated sprite`);

        // Save immediately
        const success = await saveSprite(nextJob.localId, nextJob.category, base64Data, nextJob.description, size);

        if (success) {
          markJobQueued(manifest, nextJob.localId, nextJob.category);
          markJobCompleted(manifest, nextJob.localId, nextJob.category);
          saveManifest(manifest);

          state.totalGenerated++;
          state.totalDownloaded++;
          saveState(state);

          log(`  ✓ Saved: ${nextJob.localId}`);
        }

        // Rate limiting
        log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
        await sleep(DELAY_AFTER_QUEUE_MS);

      } catch (err: any) {
        log(`  ✗ Error: ${err.message}`);
        if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
          log('  Rate limited - waiting longer before retry');
          await sleep(CHECK_INTERVAL_MS);
        } else {
          // Mark as queued (remove from pending) to avoid infinite retries
          markJobQueued(manifest, nextJob.localId, nextJob.category);
          saveManifest(manifest);
        }
      }

      // Count remaining
      const countPending = (section: any) => {
        if (!section) return 0;
        let count = 0;
        if (section.pending) count += section.pending.length;
        for (const value of Object.values(section)) {
          if (value && typeof value === 'object' && (value as any).pending) {
            count += (value as any).pending.length;
          }
        }
        return count;
      };

      const remaining =
        countPending(manifest.humanoids) +
        countPending(manifest.animals) +
        countPending(manifest.building_tiles) +
        countPending(manifest.tilesets) +
        countPending(manifest.map_objects) +
        countPending(manifest.items);

      log(`--- Progress: ${state.totalGenerated} generated | ${remaining} remaining ---\n`);

    } catch (err: any) {
      log(`Error in main loop: ${err.message}`);
      await sleep(CHECK_INTERVAL_MS);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\nShutting down...');
  const state = loadState();
  saveState(state);
  log('State saved. Goodbye!');
  process.exit(0);
});

runDaemon().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
