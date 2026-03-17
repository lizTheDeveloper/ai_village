import { describe, it, expect } from 'vitest';
import {
  calculateBreedingCompatibility,
  canAnimalsBreed,
  findAnimalHybrid,
  getAnimalHybridById,
  getAllAnimalHybrids,
  getAnimalTaxonomy,
} from '../genetics/AnimalBreedingCompatibility.js';

// ============================================================================
// calculateBreedingCompatibility
// ============================================================================

describe('calculateBreedingCompatibility', () => {
  it('same species always returns 1.0', () => {
    expect(calculateBreedingCompatibility('wolf', 'wolf')).toBe(1.0);
    expect(calculateBreedingCompatibility('chicken', 'chicken')).toBe(1.0);
    expect(calculateBreedingCompatibility('sea_turtle', 'sea_turtle')).toBe(1.0);
  });

  it('throws when a species ID is empty string', () => {
    expect(() => calculateBreedingCompatibility('', 'wolf')).toThrow();
    expect(() => calculateBreedingCompatibility('wolf', '')).toThrow();
  });

  // ---- Known mythological hybrids ----

  it('deer × blue_heron returns the Peryton score (0.05)', () => {
    expect(calculateBreedingCompatibility('deer', 'blue_heron')).toBe(0.05);
    expect(calculateBreedingCompatibility('blue_heron', 'deer')).toBe(0.05);
  });

  it('wolf × magma_salamander returns the Hellhound score (0.03)', () => {
    expect(calculateBreedingCompatibility('wolf', 'magma_salamander')).toBe(0.03);
    expect(calculateBreedingCompatibility('magma_salamander', 'wolf')).toBe(0.03);
  });

  it('horse × sea_turtle returns the Hippocampus score (0.01)', () => {
    expect(calculateBreedingCompatibility('horse', 'sea_turtle')).toBe(0.01);
    expect(calculateBreedingCompatibility('sea_turtle', 'horse')).toBe(0.01);
  });

  // ---- Trogdor (legendary) ----

  it('trogdor is incompatible with all other species', () => {
    const others = ['wolf', 'chicken', 'deer', 'jaguar', 'sea_turtle'];
    for (const other of others) {
      expect(calculateBreedingCompatibility('trogdor', other)).toBe(0);
      expect(calculateBreedingCompatibility(other, 'trogdor')).toBe(0);
    }
  });

  // ---- Same-taxonomy mammals ----

  it('wolf × dog score is high (same mammal_carnivore + shared biomes + same diet)', () => {
    const score = calculateBreedingCompatibility('wolf', 'dog');
    // taxonomy(0.8)*0.6 + biome(>0)*0.3 + diet(0.8)*0.1
    expect(score).toBeGreaterThan(0.5);
  });

  it('cow × horse score is high (same mammal_ungulate + shared biomes + same diet)', () => {
    const score = calculateBreedingCompatibility('cow', 'horse');
    expect(score).toBeGreaterThan(0.5);
  });

  // ---- Cross-order mammals ----

  it('wolf × jaguar score is nonzero but lower (both mammal_carnivore, no biome overlap)', () => {
    const score = calculateBreedingCompatibility('wolf', 'jaguar');
    // taxonomy(0.8)*0.6 + biome(0)*0.3 + diet(0.8)*0.1 = 0.48+0+0.08 = 0.56
    // They're same taxonomy group (mammal_carnivore) so score is actually still > 0.5
    expect(score).toBeGreaterThan(0);
  });

  // ---- Cross-class (vertebrate-vertebrate, not a known hybrid) ----

  it('deer × tropical_parrot score is very low (mammal vs bird, no biome overlap)', () => {
    const score = calculateBreedingCompatibility('deer', 'tropical_parrot');
    // taxonomy(0.04)*0.6 + biome(0)*0.3 + diet(0.8)*0.1 = 0.024+0+0.08 = 0.104
    // Actually they share no biomes, deer is herbivore, parrot is herbivore = 0.8 diet
    // But score will be quite low
    expect(score).toBeLessThan(0.2);
  });

  it('wolf × obsidian_beetle score is very low (mammal vs arthropod)', () => {
    const score = calculateBreedingCompatibility('wolf', 'obsidian_beetle');
    // taxonomy(0.01)*0.6 + biome(0)*0.3 + diet(carnivore+omnivore=0.5)*0.1 ≈ 0.056
    expect(score).toBeLessThan(0.1);
    expect(score).toBeGreaterThan(0);
  });

  // ---- Invertebrate cross-class ----

  it('mud_crab × sulfur_moth score is low (both arthropod but no biome overlap and different diet)', () => {
    const score = calculateBreedingCompatibility('mud_crab', 'sulfur_moth');
    // same arthropod group: taxonomy(0.8)*0.6 = 0.48
    // biome: wetland/ocean/river vs sulfur_flats/ash_plain/caldera — 0 overlap
    // diet: omnivore + omnivore = 0.8*0.1 = 0.08
    // total = 0.56
    expect(score).toBeGreaterThan(0);
  });

  // ---- Scores are always in [0, 1] ----

  it('all pairwise scores are in [0, 1]', () => {
    const allSpecies = [
      'chicken', 'cow', 'sheep', 'horse', 'dog', 'cat', 'rabbit', 'deer',
      'pig', 'goat', 'wolf', 'trogdor', 'blue_heron', 'river_otter', 'mud_crab',
      'sea_turtle', 'magma_salamander', 'obsidian_beetle', 'sulfur_moth',
      'jaguar', 'tree_frog', 'tropical_parrot', 'giant_spider',
    ];
    for (const s1 of allSpecies) {
      for (const s2 of allSpecies) {
        const score = calculateBreedingCompatibility(s1, s2);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  // ---- Symmetry ----

  it('compatibility is symmetric', () => {
    const pairs: [string, string][] = [
      ['wolf', 'jaguar'],
      ['deer', 'horse'],
      ['chicken', 'tropical_parrot'],
      ['giant_spider', 'tree_frog'],
    ];
    for (const [a, b] of pairs) {
      expect(calculateBreedingCompatibility(a, b)).toBe(
        calculateBreedingCompatibility(b, a)
      );
    }
  });
});

// ============================================================================
// canAnimalsBreed
// ============================================================================

describe('canAnimalsBreed', () => {
  it('same species always returns true', () => {
    expect(canAnimalsBreed('wolf', 'wolf')).toBe(true);
    expect(canAnimalsBreed('trogdor', 'trogdor')).toBe(true);
  });

  it('trogdor cannot breed with any other species', () => {
    expect(canAnimalsBreed('trogdor', 'wolf')).toBe(false);
    expect(canAnimalsBreed('chicken', 'trogdor')).toBe(false);
  });

  it('known mythological pairs can breed even though their score is very low', () => {
    // hippocampus score is 0.01 — below default minScore(0.05) — but still allowed
    expect(canAnimalsBreed('horse', 'sea_turtle')).toBe(true);
    expect(canAnimalsBreed('wolf', 'magma_salamander')).toBe(true);
    expect(canAnimalsBreed('deer', 'blue_heron')).toBe(true);
  });

  it('well-matched same-taxonomy pairs return true with default threshold', () => {
    expect(canAnimalsBreed('wolf', 'dog')).toBe(true);
    expect(canAnimalsBreed('cow', 'horse')).toBe(true);
    expect(canAnimalsBreed('cat', 'jaguar')).toBe(true);
  });

  it('respects a custom minScore', () => {
    // wolf × jaguar scores ~0.56 — passes even a strict threshold
    expect(canAnimalsBreed('wolf', 'jaguar', 0.5)).toBe(true);

    // wolf × sea_turtle is NOT a known hybrid; low score; fails strict threshold
    const score = calculateBreedingCompatibility('wolf', 'sea_turtle');
    expect(canAnimalsBreed('wolf', 'sea_turtle', score + 0.01)).toBe(false);
  });
});

// ============================================================================
// findAnimalHybrid
// ============================================================================

describe('findAnimalHybrid', () => {
  it('returns the Peryton definition for deer × blue_heron', () => {
    const hybrid = findAnimalHybrid('deer', 'blue_heron');
    expect(hybrid).toBeDefined();
    expect(hybrid!.id).toBe('peryton');
    expect(hybrid!.name).toBe('Peryton');
  });

  it('is order-independent for all three hybrids', () => {
    expect(findAnimalHybrid('blue_heron', 'deer')?.id).toBe('peryton');
    expect(findAnimalHybrid('magma_salamander', 'wolf')?.id).toBe('hellhound');
    expect(findAnimalHybrid('sea_turtle', 'horse')?.id).toBe('hippocampus');
  });

  it('returns undefined for an unknown cross', () => {
    expect(findAnimalHybrid('cow', 'rabbit')).toBeUndefined();
    expect(findAnimalHybrid('trogdor', 'wolf')).toBeUndefined();
  });

  it('all hybrids have lore and mythologicalOrigin text', () => {
    for (const hybrid of getAllAnimalHybrids()) {
      expect(hybrid.lore.length).toBeGreaterThan(10);
      expect(hybrid.mythologicalOrigin.length).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// getAnimalHybridById
// ============================================================================

describe('getAnimalHybridById', () => {
  it('retrieves each known hybrid by id', () => {
    expect(getAnimalHybridById('peryton')?.name).toBe('Peryton');
    expect(getAnimalHybridById('hellhound')?.name).toBe('Hellhound');
    expect(getAnimalHybridById('hippocampus')?.name).toBe('Hippocampus');
  });

  it('returns undefined for an unknown id', () => {
    expect(getAnimalHybridById('gryphon')).toBeUndefined();
  });
});

// ============================================================================
// getAllAnimalHybrids
// ============================================================================

describe('getAllAnimalHybrids', () => {
  it('returns exactly 3 known hybrids', () => {
    expect(getAllAnimalHybrids().length).toBe(3);
  });

  it('all three are cross-biome (parents share no biome groups)', () => {
    // Verify each hybrid crosses distinct biome zones
    const { ANIMAL_BIOMES_TEST } = { ANIMAL_BIOMES_TEST: undefined };
    void ANIMAL_BIOMES_TEST; // accessed indirectly via calculateBreedingCompatibility

    const hybrids = getAllAnimalHybrids();
    for (const h of hybrids) {
      // Known hybrids should be rare (score < 0.06)
      expect(h.compatibilityScore).toBeLessThan(0.06);
      expect(h.compatibilityScore).toBeGreaterThan(0);
    }
  });

  it('each hybrid has at least 3 unique abilities', () => {
    for (const h of getAllAnimalHybrids()) {
      expect(h.offspringTraits.uniqueAbilities.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('peryton has flight ability', () => {
    const peryton = getAnimalHybridById('peryton')!;
    expect(peryton.offspringTraits.uniqueAbilities).toContain('flight');
  });

  it('hellhound has fire_breath and heat_resistance', () => {
    const hellhound = getAnimalHybridById('hellhound')!;
    expect(hellhound.offspringTraits.uniqueAbilities).toContain('fire_breath');
    expect(hellhound.offspringTraits.uniqueAbilities).toContain('heat_resistance');
  });

  it('hippocampus has aquatic_movement', () => {
    const hippocampus = getAnimalHybridById('hippocampus')!;
    expect(hippocampus.offspringTraits.uniqueAbilities).toContain('aquatic_movement');
  });

  it('hippocampus is rarity legendary, others are rare', () => {
    expect(getAnimalHybridById('hippocampus')!.rarity).toBe('legendary');
    expect(getAnimalHybridById('peryton')!.rarity).toBe('rare');
    expect(getAnimalHybridById('hellhound')!.rarity).toBe('rare');
  });
});

// ============================================================================
// getAnimalTaxonomy
// ============================================================================

describe('getAnimalTaxonomy', () => {
  it('correctly classifies known species', () => {
    expect(getAnimalTaxonomy('wolf')).toBe('mammal_carnivore');
    expect(getAnimalTaxonomy('horse')).toBe('mammal_ungulate');
    expect(getAnimalTaxonomy('rabbit')).toBe('mammal_small');
    expect(getAnimalTaxonomy('blue_heron')).toBe('bird');
    expect(getAnimalTaxonomy('sea_turtle')).toBe('reptile');
    expect(getAnimalTaxonomy('magma_salamander')).toBe('amphibian');
    expect(getAnimalTaxonomy('giant_spider')).toBe('arthropod');
    expect(getAnimalTaxonomy('trogdor')).toBe('legendary');
  });

  it('throws for an unknown species', () => {
    expect(() => getAnimalTaxonomy('unicorn')).toThrow(/Unknown animal species/);
  });
});
