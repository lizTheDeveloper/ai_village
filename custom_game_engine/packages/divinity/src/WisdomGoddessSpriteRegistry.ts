/**
 * Wisdom Goddess Sprite Registry
 *
 * Maps wisdom goddess names to their PixelLab sprite folders.
 * These are AI-generated character sprites with 8-directional views.
 *
 * The Goddess of Wisdom scrutinizes LLM-generated technologies and
 * magic effects before they enter the world.
 */

/** Wisdom goddess configuration */
export interface WisdomGoddessConfig {
  /** Internal name/ID */
  name: string;
  /** PixelLab sprite folder ID (in /assets/sprites/pixellab/wisdom-goddesses/) */
  spriteFolder: string;
  /** Cultural/thematic origin */
  origin: string;
  /** Description for flavor text */
  description: string;
  /** Personality traits affecting scrutiny style */
  scrutinyStyle: 'strict' | 'encouraging' | 'curious' | 'pragmatic';
  /** Whether this deity resents being called a "goddess" */
  resentsGoddessTitle?: boolean;
  /** Preferred title if they resent "goddess" */
  preferredTitle?: string;
}

/**
 * Registry of all available wisdom goddesses with their sprite assignments
 */
import wisdomGoddessRegistryData from '../data/wisdom-goddess-registry.json';

export const WISDOM_GODDESS_REGISTRY: WisdomGoddessConfig[] = wisdomGoddessRegistryData.wisdomGoddesses as WisdomGoddessConfig[];

/**
 * Get a wisdom goddess configuration by name
 */
export function getWisdomGoddessByName(name: string): WisdomGoddessConfig | undefined {
  return WISDOM_GODDESS_REGISTRY.find((goddess) => goddess.name === name);
}

/**
 * Get a wisdom goddess configuration by index (cycles through registry)
 */
export function getWisdomGoddessByIndex(index: number): WisdomGoddessConfig {
  const safeIndex = index % WISDOM_GODDESS_REGISTRY.length;
  return WISDOM_GODDESS_REGISTRY[safeIndex]!;
}

/**
 * Get a random wisdom goddess configuration
 */
export function getRandomWisdomGoddess(): WisdomGoddessConfig {
  const index = Math.floor(Math.random() * WISDOM_GODDESS_REGISTRY.length);
  return WISDOM_GODDESS_REGISTRY[index]!;
}

/**
 * Get all wisdom goddess names
 */
export function getAllWisdomGoddessNames(): string[] {
  return WISDOM_GODDESS_REGISTRY.map((goddess) => goddess.name);
}

/**
 * Get sprite folder path for a wisdom goddess
 */
export function getWisdomGoddessSpritePath(config: WisdomGoddessConfig): string {
  return `wisdom-goddesses/${config.spriteFolder}`;
}
