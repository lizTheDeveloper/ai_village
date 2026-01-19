/**
 * Death God Sprite Registry
 *
 * Maps death god names to their PixelLab sprite folders.
 * These are AI-generated character sprites with 8-directional views.
 */

/** Death god configuration */
export interface DeathGodConfig {
  /** Internal name/ID */
  name: string;
  /** PixelLab sprite folder ID (in /assets/sprites/pixellab/death-gods/) */
  spriteFolder: string;
  /** Cultural/thematic origin */
  origin: string;
  /** Description for flavor text */
  description: string;
}

/**
 * Registry of all available death gods with their sprite assignments
 */
import deathGodRegistryData from '../data/death-god-registry.json';

export const DEATH_GOD_REGISTRY: DeathGodConfig[] = deathGodRegistryData.deathGods as DeathGodConfig[];

/**
 * Get a death god configuration by name
 */
export function getDeathGodByName(name: string): DeathGodConfig | undefined {
  return DEATH_GOD_REGISTRY.find((god) => god.name === name);
}

/**
 * Get a death god configuration by index (cycles through registry)
 */
export function getDeathGodByIndex(index: number): DeathGodConfig {
  const safeIndex = index % DEATH_GOD_REGISTRY.length;
  return DEATH_GOD_REGISTRY[safeIndex]!;
}

/**
 * Get a random death god configuration
 */
export function getRandomDeathGod(): DeathGodConfig {
  const index = Math.floor(Math.random() * DEATH_GOD_REGISTRY.length);
  return DEATH_GOD_REGISTRY[index]!;
}

/**
 * Get all death god names
 */
export function getAllDeathGodNames(): string[] {
  return DEATH_GOD_REGISTRY.map((god) => god.name);
}

/**
 * Get sprite folder path for a death god
 */
export function getDeathGodSpritePath(nameOrConfig: string | DeathGodConfig): string {
  const config = typeof nameOrConfig === 'string' ? getDeathGodByName(nameOrConfig) : nameOrConfig;
  if (!config) {
    throw new Error(`Unknown death god: ${nameOrConfig}`);
  }
  return `death-gods/${config.spriteFolder}`;
}
