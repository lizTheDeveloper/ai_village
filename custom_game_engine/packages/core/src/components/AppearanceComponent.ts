/**
 * AppearanceComponent - Visual traits for sprite selection
 *
 * Stores the physical appearance traits that determine which sprite
 * to use for rendering an entity. These traits are used by the
 * SpriteRegistry to find the best matching PixelLab sprite.
 */

import { ComponentBase } from '../ecs/Component.js';

export type Species = 'human' | 'elf' | 'dwarf' | 'orc' | 'celestial' | 'demon' | 'thrakeen' | 'aquatic';
export type Gender = 'male' | 'female' | 'nonbinary';
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'white' | 'silver' | 'green' | 'blue';
export type SkinTone = 'light' | 'medium' | 'dark';
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel' | 'amber' | 'gray' | 'red' | 'violet';
export type ClothingType = 'peasant' | 'common' | 'merchant' | 'noble' | 'royal';

export interface AppearanceTraits {
  species?: Species;
  gender: Gender;
  hairColor: HairColor;
  skinTone: SkinTone;
  eyeColor?: EyeColor;
  height?: number;      // cm, variation from species average
  build?: 'slim' | 'average' | 'stocky' | 'muscular';
  clothingType?: ClothingType;
}

export class AppearanceComponent extends ComponentBase {
  public readonly type = 'appearance';

  public species: Species;
  public gender: Gender;
  public hairColor: HairColor;
  public skinTone: SkinTone;
  public eyeColor: EyeColor;
  public height: number;
  public build: 'slim' | 'average' | 'stocky' | 'muscular';
  public clothingType: ClothingType;

  // Cached sprite folder ID (set after lookup)
  public spriteFolderId?: string;
  public spriteStatus: 'unknown' | 'available' | 'missing' | 'generating' = 'unknown';

  constructor(traits: Partial<AppearanceTraits> = {}) {
    super();

    this.species = traits.species ?? 'human';
    this.gender = traits.gender ?? randomGender();
    this.hairColor = traits.hairColor ?? randomHairColor();
    this.skinTone = traits.skinTone ?? randomSkinTone();
    this.eyeColor = traits.eyeColor ?? randomEyeColor();
    this.height = traits.height ?? randomHeightVariation();
    this.build = traits.build ?? randomBuild();
    this.clothingType = traits.clothingType ?? 'peasant'; // Default to peasant clothing
  }

  /**
   * Get traits in format expected by SpriteRegistry
   */
  getSpriteTraits(): { species: Species; gender: Gender; hairColor: HairColor; skinTone: SkinTone; clothingType: ClothingType } {
    return {
      species: this.species,
      gender: this.gender,
      hairColor: this.hairColor,
      skinTone: this.skinTone,
      clothingType: this.clothingType,
    };
  }

  /**
   * Clone this appearance
   */
  clone(): AppearanceComponent {
    const clone = new AppearanceComponent({
      species: this.species,
      gender: this.gender,
      hairColor: this.hairColor,
      skinTone: this.skinTone,
      eyeColor: this.eyeColor,
      height: this.height,
      build: this.build,
      clothingType: this.clothingType,
    });
    clone.spriteFolderId = this.spriteFolderId;
    clone.spriteStatus = this.spriteStatus;
    return clone;
  }

  /**
   * Update clothing type (e.g., when entity changes social status or equips new clothing)
   */
  setClothingType(clothingType: ClothingType): void {
    if (this.clothingType !== clothingType) {
      this.clothingType = clothingType;
      // Reset sprite cache to force re-lookup with new clothing
      this.spriteFolderId = undefined;
      this.spriteStatus = 'unknown';
    }
  }
}

// ============================================================================
// Random Generation Functions
// ============================================================================

const GENDER_WEIGHTS: [Gender, number][] = [
  ['male', 0.48],
  ['female', 0.48],
  ['nonbinary', 0.04],
];

const HAIR_COLOR_WEIGHTS: [HairColor, number][] = [
  ['black', 0.35],
  ['brown', 0.35],
  ['blonde', 0.15],
  ['red', 0.08],
  ['white', 0.04],
  ['silver', 0.02],
  ['green', 0.005],
  ['blue', 0.005],
];

const SKIN_TONE_WEIGHTS: [SkinTone, number][] = [
  ['light', 0.33],
  ['medium', 0.34],
  ['dark', 0.33],
];

const EYE_COLOR_WEIGHTS: [EyeColor, number][] = [
  ['brown', 0.45],
  ['blue', 0.20],
  ['green', 0.12],
  ['hazel', 0.10],
  ['amber', 0.06],
  ['gray', 0.05],
  ['red', 0.01],
  ['violet', 0.01],
];

const BUILD_WEIGHTS: ['slim' | 'average' | 'stocky' | 'muscular', number][] = [
  ['slim', 0.20],
  ['average', 0.50],
  ['stocky', 0.15],
  ['muscular', 0.15],
];

function weightedRandom<T>(weights: [T, number][]): T {
  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [value, weight] of weights) {
    random -= weight;
    if (random <= 0) return value;
  }

  return weights[0]![0]; // Fallback
}

export function randomGender(): Gender {
  return weightedRandom(GENDER_WEIGHTS);
}

export function randomHairColor(): HairColor {
  return weightedRandom(HAIR_COLOR_WEIGHTS);
}

export function randomSkinTone(): SkinTone {
  return weightedRandom(SKIN_TONE_WEIGHTS);
}

export function randomEyeColor(): EyeColor {
  return weightedRandom(EYE_COLOR_WEIGHTS);
}

export function randomBuild(): 'slim' | 'average' | 'stocky' | 'muscular' {
  return weightedRandom(BUILD_WEIGHTS);
}

export function randomHeightVariation(): number {
  // Normal distribution around 0, range roughly -15cm to +15cm
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(z * 5); // Standard deviation of 5cm
}

/**
 * Generate appearance traits for a child based on parents
 */
export function inheritAppearance(
  parent1: AppearanceComponent,
  parent2: AppearanceComponent
): AppearanceTraits {
  // Gender is random
  const gender = randomGender();

  // Hair color - 45% from each parent, 10% random
  let hairColor: HairColor;
  const hairRoll = Math.random();
  if (hairRoll < 0.45) {
    hairColor = parent1.hairColor;
  } else if (hairRoll < 0.90) {
    hairColor = parent2.hairColor;
  } else {
    hairColor = randomHairColor();
  }

  // Skin tone - blend parents or random variation
  let skinTone: SkinTone;
  const skinRoll = Math.random();
  if (skinRoll < 0.40) {
    skinTone = parent1.skinTone;
  } else if (skinRoll < 0.80) {
    skinTone = parent2.skinTone;
  } else {
    // Blend or random
    const tones: SkinTone[] = ['light', 'medium', 'dark'];
    const p1Index = tones.indexOf(parent1.skinTone);
    const p2Index = tones.indexOf(parent2.skinTone);
    const avgIndex = Math.round((p1Index + p2Index) / 2);
    skinTone = tones[avgIndex] ?? 'medium';
  }

  // Eye color - dominant/recessive simulation
  let eyeColor: EyeColor;
  const eyeRoll = Math.random();
  if (eyeRoll < 0.45) {
    eyeColor = parent1.eyeColor;
  } else if (eyeRoll < 0.90) {
    eyeColor = parent2.eyeColor;
  } else {
    eyeColor = randomEyeColor();
  }

  // Height - average of parents with variation
  const avgHeight = (parent1.height + parent2.height) / 2;
  const height = Math.round(avgHeight + randomHeightVariation() * 0.5);

  // Build - influenced by parents
  const builds: ('slim' | 'average' | 'stocky' | 'muscular')[] = ['slim', 'average', 'stocky', 'muscular'];
  const buildRoll = Math.random();
  let build: 'slim' | 'average' | 'stocky' | 'muscular';
  if (buildRoll < 0.40) {
    build = parent1.build;
  } else if (buildRoll < 0.80) {
    build = parent2.build;
  } else {
    build = builds[Math.floor(Math.random() * builds.length)] ?? 'average';
  }

  return { gender, hairColor, skinTone, eyeColor, height, build };
}

/**
 * Create an appearance component with all random traits
 */
export function createAppearanceComponent(traits?: Partial<AppearanceTraits>): AppearanceComponent {
  return new AppearanceComponent(traits);
}
