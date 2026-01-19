/**
 * SoulSpriteRenderer - Generate sprites based on soul reincarnation tier
 *
 * Implements the Soul Sprite Progression System where visual complexity
 * reflects spiritual complexity through reincarnation count.
 *
 * Tier 1 (1 life):     16×16, 1 direction, no animations
 * Tier 2 (2 lives):    24×24, 4 directions, no animations
 * Tier 3 (3 lives):    32×32, 8 directions, no animations
 * Tier 4 (4 lives):    40×40, 8 directions, walking
 * Tier 5 (5 lives):    48×48, 8 directions, walking + running
 * Tier 6 (6 lives):    56×56, 8 directions, walking + running + idle
 * Tier 7 (7 lives):    64×64, 8 directions, full animations
 * Tier 8+ (8+ lives):  64×64, 8 directions, all animations + effects
 *
 * Animals (no soul): Always max quality (64×64, 8 directions, all animations)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  PixelLabAPI,
  createPixelLabClient,
  type ViewAngle,
  type Direction,
  type DetailLevel,
  type ShadingLevel,
  type OutlineStyle,
} from './PixelLabAPI.js';

/** Soul sprite tier configuration */
export interface TierConfig {
  tier: number;
  size: number;
  directions: 1 | 4 | 8;
  animations: string[];
  detail: DetailLevel;
  shading: ShadingLevel;
  outline: OutlineStyle;
}

/** All 8 directions for sprite generation */
const ALL_DIRECTIONS: Direction[] = [
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east',
];

/** Cardinal directions only */
const CARDINAL_DIRECTIONS: Direction[] = ['south', 'west', 'north', 'east'];

/** Tier configurations based on reincarnation count */
const TIER_CONFIGS: Record<number, TierConfig> = {
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

/** Maximum quality config for animals (non-ensouled entities) */
const ANIMAL_CONFIG: TierConfig = {
  tier: 0, // Special: not a soul tier
  size: 64,
  directions: 8,
  animations: ['walk', 'run', 'idle'],
  detail: 'high detail',
  shading: 'detailed shading',
  outline: 'single color outline',
};

/** Soul entity data */
export interface SoulEntity {
  id: string;
  name: string;
  description: string; // Character appearance description
  reincarnationCount: number;
  species?: string;
  gender?: string;
}

/** Animal entity data (no soul) */
export interface AnimalEntity {
  id: string;
  name: string;
  description: string;
  species: string;
}

/** Generated sprite set */
export interface SpriteSet {
  entityId: string;
  tier: number;
  config: TierConfig;
  sprites: Map<Direction, string>; // direction -> Base64 PNG
  animations: Map<string, AnimationSet>; // animation name -> frames
  generatedAt: number;
}

/** Animation frame set */
export interface AnimationSet {
  name: string;
  frames: Map<Direction, string[]>; // direction -> array of Base64 PNGs
  frameCount: number;
  frameRate: number;
}

/**
 * Soul Sprite Renderer - Generate sprites based on soul tier
 */
export class SoulSpriteRenderer {
  private api: PixelLabAPI;
  private view: ViewAngle = 'high top-down';

  constructor(apiToken?: string) {
    this.api = apiToken ? new PixelLabAPI(apiToken) : createPixelLabClient();
  }

  /**
   * Calculate tier from reincarnation count
   */
  calculateTier(reincarnationCount: number): number {
    return Math.min(Math.max(reincarnationCount, 1), 8);
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: number): TierConfig {
    const clampedTier = Math.min(Math.max(tier, 1), 8);
    return TIER_CONFIGS[clampedTier] ?? TIER_CONFIGS[8]!;
  }

  /**
   * Get configuration for an animal (non-ensouled entity)
   */
  getAnimalConfig(): TierConfig {
    return ANIMAL_CONFIG;
  }

  /**
   * Generate sprites for a soul entity based on reincarnation count
   */
  async generateSoulSprites(entity: SoulEntity): Promise<SpriteSet> {
    const tier = this.calculateTier(entity.reincarnationCount);
    const config = this.getTierConfig(tier);


    return this.generateSprites(entity.id, entity.description, config);
  }

  /**
   * Generate sprites for an animal (always max quality)
   */
  async generateAnimalSprites(entity: AnimalEntity): Promise<SpriteSet> {
    const config = this.getAnimalConfig();


    return this.generateSprites(entity.id, entity.description, config);
  }

  /**
   * Generate sprites with given configuration
   */
  private async generateSprites(
    entityId: string,
    description: string,
    config: TierConfig
  ): Promise<SpriteSet> {
    const sprites = new Map<Direction, string>();
    const animations = new Map<string, AnimationSet>();

    // Determine which directions to generate
    const directions = this.getDirectionsForConfig(config);

    // Generate base sprites for each direction
    for (const direction of directions) {
      const sprite = await this.generateDirectionalSprite(description, direction, config);
      sprites.set(direction, sprite);
    }

    // Generate animations if tier supports them
    if (config.animations.length > 0) {
      for (const animName of config.animations) {
        const animSet = await this.generateAnimation(
          description,
          animName,
          directions,
          config,
          sprites
        );
        animations.set(animName, animSet);
      }
    }

    return {
      entityId,
      tier: config.tier,
      config,
      sprites,
      animations,
      generatedAt: Date.now(),
    };
  }

  /**
   * Get directions to generate based on config
   */
  private getDirectionsForConfig(config: TierConfig): Direction[] {
    switch (config.directions) {
      case 1:
        return ['south'];
      case 4:
        return CARDINAL_DIRECTIONS;
      case 8:
        return ALL_DIRECTIONS;
      default:
        return ['south'];
    }
  }

  /**
   * Generate a single directional sprite
   */
  private async generateDirectionalSprite(
    description: string,
    direction: Direction,
    config: TierConfig
  ): Promise<string> {
    const response = await this.api.generateImageBitforge({
      description,
      image_size: {
        width: config.size,
        height: config.size,
      },
      view: this.view,
      direction,
      detail: config.detail,
      shading: config.shading,
      outline: config.outline,
      no_background: true,
    });

    return response.image;
  }

  /**
   * Generate animation for all directions
   */
  private async generateAnimation(
    description: string,
    animationName: string,
    directions: Direction[],
    _config: TierConfig,
    baseSprites: Map<Direction, string>
  ): Promise<AnimationSet> {
    const frames = new Map<Direction, string[]>();
    const frameCount = 8; // Standard frame count
    const frameRate = 12;

    // Map animation name to action description
    const actionDesc = this.getActionDescription(animationName);

    for (const direction of directions) {
      const referenceSprite = baseSprites.get(direction);
      if (!referenceSprite) {
        throw new Error(`No reference sprite for direction: ${direction}`);
      }

      // Generate animation frames
      // Note: animate-with-text is fixed at 64x64, so we use that
      const response = await this.api.animateWithText({
        description,
        action: actionDesc,
        image_size: { width: 64, height: 64 },
        reference_image: referenceSprite,
        n_frames: frameCount,
        view: this.view,
        direction,
      });

      frames.set(direction, response.images);
    }

    return {
      name: animationName,
      frames,
      frameCount,
      frameRate,
    };
  }

  /**
   * Map animation name to action description
   */
  private getActionDescription(animationName: string): string {
    const actionMap: Record<string, string> = {
      walk: 'walking steadily, rhythmic movement',
      run: 'running quickly, fast movement',
      idle: 'breathing idle, subtle movement',
      attack: 'attacking, combat strike motion',
      jump: 'jumping upward, airborne motion',
      defend: 'defensive stance, blocking position',
    };

    return actionMap[animationName] || `performing ${animationName}`;
  }

  /**
   * Save sprite set to disk
   */
  async saveSpriteSet(spriteSet: SpriteSet, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    // Save base sprites
    const spritesDir = path.join(outputDir, 'sprites');
    await fs.mkdir(spritesDir, { recursive: true });

    for (const [direction, imageData] of spriteSet.sprites) {
      const filename = `${direction}.png`;
      const filepath = path.join(spritesDir, filename);

      // Handle both string and object formats
      const base64Data = typeof imageData === 'string'
        ? imageData
        : (imageData as Record<string, unknown>).base64 as string || (imageData as Record<string, unknown>).image as string;

      if (!base64Data) {
        console.error(`[SoulSpriteRenderer] Invalid image data format for ${direction}:`, imageData);
        throw new Error(`Invalid image data format for direction: ${direction}`);
      }

      await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
    }

    // Save animations
    if (spriteSet.animations.size > 0) {
      const animDir = path.join(outputDir, 'animations');
      await fs.mkdir(animDir, { recursive: true });

      for (const [animName, animSet] of spriteSet.animations) {
        const animSubDir = path.join(animDir, animName);
        await fs.mkdir(animSubDir, { recursive: true });

        for (const [direction, frames] of animSet.frames) {
          const dirSubDir = path.join(animSubDir, direction);
          await fs.mkdir(dirSubDir, { recursive: true });

          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            if (!frame) continue;

            // Handle both string and object formats
            const base64Data = typeof frame === 'string'
              ? frame
              : (frame as Record<string, unknown>).base64 as string || (frame as Record<string, unknown>).image as string;

            if (!base64Data) {
              console.error(`[SoulSpriteRenderer] Invalid frame data format for ${animName}/${direction}/frame_${i}:`, frame);
              continue;
            }

            const filename = `frame_${String(i).padStart(3, '0')}.png`;
            const filepath = path.join(dirSubDir, filename);
            await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
          }
        }
      }
    }

    // Save metadata
    const metadata = {
      entityId: spriteSet.entityId,
      tier: spriteSet.tier,
      config: {
        size: spriteSet.config.size,
        directions: spriteSet.config.directions,
        animations: spriteSet.config.animations,
        detail: spriteSet.config.detail,
        shading: spriteSet.config.shading,
      },
      sprites: Array.from(spriteSet.sprites.keys()).map((dir) => `sprites/${dir}.png`),
      animations: Array.from(spriteSet.animations.entries()).map(([name, anim]) => ({
        name,
        frameCount: anim.frameCount,
        frameRate: anim.frameRate,
        directions: Array.from(anim.frames.keys()),
      })),
      generatedAt: spriteSet.generatedAt,
    };

    await fs.writeFile(
      path.join(outputDir, 'sprite-set.json'),
      JSON.stringify(metadata, null, 2)
    );
  }
}

/**
 * Helper: Determine if entity should use soul progression
 */
export function shouldUseSoulProgression(entity: { hasSoul?: boolean }): boolean {
  return entity.hasSoul === true;
}

/**
 * Get sprite tier description
 */
export function getTierDescription(tier: number): string {
  const descriptions: Record<number, string> = {
    1: 'Newborn Soul (16×16, south only)',
    2: 'Young Soul (24×24, 4 directions)',
    3: 'Maturing Soul (32×32, 8 directions)',
    4: 'Experienced Soul (40×40, walking)',
    5: 'Seasoned Soul (48×48, walking + running)',
    6: 'Wise Soul (56×56, full movement)',
    7: 'Ancient Soul (64×64, combat ready)',
    8: 'Transcendent Soul (64×64, fully realized)',
  };
  return descriptions[tier] ?? descriptions[8]!;
}
