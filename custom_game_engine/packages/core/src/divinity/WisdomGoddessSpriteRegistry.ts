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
export const WISDOM_GODDESS_REGISTRY: WisdomGoddessConfig[] = [
  {
    name: 'Athena',
    spriteFolder: 'owl-scholar',
    origin: 'Greco-Classical',
    description:
      'Dignified figure in flowing white robes, owl perched on shoulder, holding scrolls of ancient wisdom',
    scrutinyStyle: 'strict',
  },
  {
    name: 'Saraswati',
    spriteFolder: 'lotus-sage',
    origin: 'Hindu',
    description:
      'Serene goddess seated on lotus, veena instrument in hand, books floating around her in divine light',
    scrutinyStyle: 'encouraging',
  },
  {
    name: 'Thoth',
    spriteFolder: 'ibis-scribe',
    origin: 'Egyptian',
    description:
      'Ibis-headed deity with reed pen and papyrus, scales of knowledge balanced in ethereal hands',
    scrutinyStyle: 'pragmatic',
  },
  {
    name: 'Odin',
    spriteFolder: 'one-eyed-wanderer',
    origin: 'Norse',
    description:
      'Cloaked wanderer with single burning eye, ravens Huginn and Muninn whispering secrets. ' +
      'Perpetually irritated at being grouped with "goddesses" in this registry.',
    scrutinyStyle: 'curious',
    resentsGoddessTitle: true,
    preferredTitle: 'Allfather',
  },
  {
    name: 'Sophia',
    spriteFolder: 'crystalline-oracle',
    origin: 'Gnostic',
    description:
      'Ethereal being of pure light, face shifting between forms, crystalline structures forming her crown',
    scrutinyStyle: 'encouraging',
  },
  {
    name: 'Seshat',
    spriteFolder: 'star-librarian',
    origin: 'Egyptian',
    description:
      'Leopard-skin clad goddess with star headdress, notching every discovery into the eternal record',
    scrutinyStyle: 'strict',
  },
];

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
