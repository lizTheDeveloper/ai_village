import { describe, it, expect, beforeEach } from 'vitest';
import { ItemRegistry } from '../ItemRegistry.js';
import { defineItem } from '../ItemDefinition.js';
import { ItemPropertyVectorizer, VECTOR_DIMENSIONS, vectorizeItem } from '../ItemPropertyVectorizer.js';
import { AffordanceNetwork } from '../AffordanceNetwork.js';

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeRegistry() {
  const registry = new ItemRegistry();

  registry.register(defineItem('berry', 'Berry', 'food', {
    isEdible: true,
    isGatherable: true,
    weight: 0.1,
    stackSize: 100,
    baseValue: 1,
    rarity: 'common',
    traits: {
      edible: { hungerRestored: 20, quality: 40, flavors: ['sweet'], hydrating: true },
    },
  }));

  registry.register(defineItem('wood', 'Wood', 'resource', {
    isStorable: true,
    isGatherable: true,
    weight: 2.0,
    stackSize: 50,
    baseValue: 2,
    rarity: 'common',
    traits: {
      material: { isLiving: false, isEdible: false, isTransient: false, isSolid: true },
    },
  }));

  registry.register(defineItem('axe', 'Axe', 'tool', {
    isStorable: true,
    weight: 3.0,
    stackSize: 1,
    baseValue: 15,
    rarity: 'common',
    traits: {
      tool: { toolType: 'axe', efficiency: 1.5, durabilityLoss: 0.02 },
    },
  }));

  registry.register(defineItem('iron_sword', 'Iron Sword', 'equipment', {
    isStorable: true,
    weight: 4.0,
    stackSize: 1,
    baseValue: 50,
    rarity: 'uncommon',
    traits: {
      weapon: { damage: 25, damageType: 'slashing', range: 1, attackSpeed: 1.2, durabilityLoss: 0.01, twoHanded: false, category: 'sword', attackType: 'melee' },
    },
  }));

  registry.register(defineItem('magic_scroll', 'Magic Scroll', 'consumable', {
    isStorable: true,
    weight: 0.2,
    stackSize: 10,
    baseValue: 40,
    rarity: 'rare',
    traits: {
      magical: { effects: [], charges: 3, manaCost: 20, school: 'arcane', passive: false, cursed: false, magicType: 'arcane' },
    },
  }));

  registry.register(defineItem('flour', 'Flour', 'food', {
    isEdible: false,
    isStorable: true,
    weight: 0.5,
    stackSize: 100,
    baseValue: 3,
    rarity: 'common',
    traits: {
      material: { isLiving: false, isEdible: true, isTransient: false, isSolid: true },
    },
  }));

  return registry;
}

// ─── ItemPropertyVectorizer tests ────────────────────────────────────────────

describe('ItemPropertyVectorizer', () => {
  let registry: ItemRegistry;
  let vectorizer: ItemPropertyVectorizer;

  beforeEach(() => {
    registry = makeRegistry();
    vectorizer = new ItemPropertyVectorizer(registry);
  });

  it('produces vectors of the correct dimension', () => {
    const v = vectorizer.getVector('berry');
    expect(v.length).toBe(VECTOR_DIMENSIONS);
  });

  it('produces non-zero vectors for items with traits', () => {
    const v = vectorizer.getVector('axe');
    const nonZero = Array.from(v).some(x => x !== 0);
    expect(nonZero).toBe(true);
  });

  it('berry vector has edible trait flag set', () => {
    const v = vectorizer.getVector('berry');
    // Trait presence flags start at dim 14; edible is first
    expect(v[14]).toBe(1);
    // weapon should be 0
    expect(v[15]).toBe(0);
  });

  it('axe vector has tool trait flag set', () => {
    const v = vectorizer.getVector('axe');
    // tool trait flag is at index 14+4=18
    expect(v[18]).toBe(1);
  });

  it('caches repeated lookups', () => {
    const v1 = vectorizer.getVector('wood');
    const v2 = vectorizer.getVector('wood');
    expect(v1).toBe(v2); // same reference
  });

  it('vectorizeAll populates the cache for all items', () => {
    const cache = vectorizer.vectorizeAll();
    expect(cache.size).toBe(registry.size);
  });

  it('vectorizeItem is a pure function — same item yields identical result', () => {
    const item = registry.get('iron_sword');
    const v1 = vectorizeItem(item);
    const v2 = vectorizeItem(item);
    expect(Array.from(v1)).toEqual(Array.from(v2));
  });

  it('different categories produce different category one-hot encodings', () => {
    const food = vectorizer.getVector('berry');   // food category
    const tool = vectorizer.getVector('axe');     // tool category
    // First 9 dims are category one-hot
    const foodCat = Array.from(food.slice(0, 9));
    const toolCat = Array.from(tool.slice(0, 9));
    expect(foodCat).not.toEqual(toolCat);
  });
});

// ─── AffordanceNetwork tests ─────────────────────────────────────────────────

describe('AffordanceNetwork', () => {
  let registry: ItemRegistry;
  let net: AffordanceNetwork;

  beforeEach(() => {
    registry = makeRegistry();
    net = new AffordanceNetwork(registry);
  });

  it('scoreCompatibility returns a value in [0, 1]', () => {
    const score = net.scoreCompatibility('berry', 'wood');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scoreCompatibility is commutative (a,b) ≈ (b,a)', () => {
    const ab = net.scoreCompatibility('axe', 'wood');
    const ba = net.scoreCompatibility('wood', 'axe');
    // May differ slightly due to bilinear, but identity W means they're equal
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('suggestCombinations returns results sorted by score descending', () => {
    const items = ['berry', 'wood', 'axe', 'iron_sword', 'magic_scroll', 'flour']
      .map(id => registry.get(id));
    const suggestions = net.suggestCombinations(items, 10);

    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i].score).toBeLessThanOrEqual(suggestions[i - 1].score);
    }
  });

  it('suggestCombinations respects maxSuggestions limit', () => {
    const items = ['berry', 'wood', 'axe', 'iron_sword', 'magic_scroll', 'flour']
      .map(id => registry.get(id));
    const suggestions = net.suggestCombinations(items, 3);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it('heuristic: tool + material scores higher than food + tool', () => {
    const toolMaterial = net.suggestCombinations(
      [registry.get('axe'), registry.get('wood')], 5
    );
    const foodTool = net.suggestCombinations(
      [registry.get('berry'), registry.get('axe')], 5
    );
    // axe + wood should score higher (tool acts on material heuristic)
    const tmScore = toolMaterial[0]?.score ?? 0;
    const ftScore = foodTool[0]?.score ?? 0;
    expect(tmScore).toBeGreaterThan(ftScore);
  });

  it('heuristic: magic_scroll + iron_sword fires magical enhancement', () => {
    const items = [registry.get('magic_scroll'), registry.get('iron_sword')];
    const suggestions = net.suggestCombinations(items, 5);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].reason).toContain('enchant');
  });

  it('recordEpisode increases score for rewarded pair', () => {
    const before = net.scoreCompatibility('berry', 'flour');
    net.recordEpisode({ itemA: 'berry', itemB: 'flour', reward: 5 });
    const after = net.scoreCompatibility('berry', 'flour');
    expect(after).toBeGreaterThan(before);
  });

  it('recordEpisode decreases score for penalized pair', () => {
    // First boost so score isn't already at floor
    net.recordEpisode({ itemA: 'iron_sword', itemB: 'berry', reward: 3 });
    const before = net.scoreCompatibility('iron_sword', 'berry');
    net.recordEpisode({ itemA: 'iron_sword', itemB: 'berry', reward: -5 });
    const after = net.scoreCompatibility('iron_sword', 'berry');
    expect(after).toBeLessThan(before);
  });

  it('exportWeights and importWeights round-trip', () => {
    // Train a bit
    net.recordEpisode({ itemA: 'axe', itemB: 'wood', reward: 2 });
    const exported = net.exportWeights();

    const net2 = new AffordanceNetwork(registry);
    net2.importWeights(exported);

    const s1 = net.scoreCompatibility('axe', 'wood');
    const s2 = net2.scoreCompatibility('axe', 'wood');
    expect(s1).toBeCloseTo(s2, 6);
  });

  it('importWeights throws on wrong size', () => {
    expect(() => net.importWeights(new Float32Array(10))).toThrow(/mismatch/);
  });
});
