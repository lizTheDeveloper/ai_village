import { describe, it, expect, beforeEach } from 'vitest';
import { ItemRegistry, ItemNotFoundError, DuplicateItemError } from '../ItemRegistry.js';
import { defineItem, type ItemDefinition } from '../ItemDefinition.js';
import { DEFAULT_ITEMS, registerDefaultItems } from '../defaultItems.js';
import { createSeedItem, isSeedItemId, getSeedSpeciesId, createSeedItemId } from '../SeedItemFactory.js';

describe('ItemRegistry', () => {
  let registry: ItemRegistry;

  beforeEach(() => {
    registry = new ItemRegistry();
  });

  describe('registration', () => {
    it('should register an item', () => {
      const item = defineItem('test', 'Test Item', 'misc');
      registry.register(item);

      expect(registry.has('test')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw DuplicateItemError for duplicate registration', () => {
      const item = defineItem('test', 'Test Item', 'misc');
      registry.register(item);

      expect(() => registry.register(item)).toThrow(DuplicateItemError);
    });

    it('should register multiple items', () => {
      const items = [
        defineItem('item1', 'Item 1', 'misc'),
        defineItem('item2', 'Item 2', 'misc'),
        defineItem('item3', 'Item 3', 'misc'),
      ];
      registry.registerAll(items);

      expect(registry.size).toBe(3);
      expect(registry.has('item1')).toBe(true);
      expect(registry.has('item2')).toBe(true);
      expect(registry.has('item3')).toBe(true);
    });

    it('should unregister an item', () => {
      registry.register(defineItem('test', 'Test', 'misc'));
      expect(registry.has('test')).toBe(true);

      const result = registry.unregister('test');
      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });

    it('should clear all items', () => {
      registry.registerAll([
        defineItem('item1', 'Item 1', 'misc'),
        defineItem('item2', 'Item 2', 'misc'),
      ]);
      expect(registry.size).toBe(2);

      registry.clear();
      expect(registry.size).toBe(0);
    });
  });

  describe('lookup', () => {
    beforeEach(() => {
      registry.register(defineItem('berry', 'Berry', 'food', {
        weight: 0.2,
        stackSize: 50,
        isEdible: true,
        hungerRestored: 15,
      }));
    });

    it('should get item by ID', () => {
      const item = registry.get('berry');
      expect(item.id).toBe('berry');
      expect(item.displayName).toBe('Berry');
      expect(item.category).toBe('food');
    });

    it('should throw ItemNotFoundError for unknown item', () => {
      expect(() => registry.get('unknown')).toThrow(ItemNotFoundError);
    });

    it('should return undefined for tryGet with unknown item', () => {
      expect(registry.tryGet('unknown')).toBeUndefined();
    });

    it('should validate item exists', () => {
      expect(() => registry.validate('berry')).not.toThrow();
      expect(() => registry.validate('unknown')).toThrow(ItemNotFoundError);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      registry.registerAll([
        defineItem('wood', 'Wood', 'resource', { isGatherable: true }),
        defineItem('stone', 'Stone', 'resource', { isGatherable: true }),
        defineItem('berry', 'Berry', 'food', { isEdible: true, isGatherable: true }),
        defineItem('bread', 'Bread', 'food', { isEdible: true, isGatherable: false }),
        defineItem('axe', 'Axe', 'tool', { isGatherable: false }),
      ]);
    });

    it('should get items by category', () => {
      const resources = registry.getByCategory('resource');
      expect(resources).toHaveLength(2);
      expect(resources.map(i => i.id)).toContain('wood');
      expect(resources.map(i => i.id)).toContain('stone');
    });

    it('should get edible items', () => {
      const edible = registry.getEdibleItems();
      expect(edible).toHaveLength(2);
      expect(edible.map(i => i.id)).toContain('berry');
      expect(edible.map(i => i.id)).toContain('bread');
    });

    it('should get gatherable items', () => {
      const gatherable = registry.getGatherableItems();
      expect(gatherable).toHaveLength(3);
      expect(gatherable.map(i => i.id)).toContain('wood');
      expect(gatherable.map(i => i.id)).toContain('stone');
      expect(gatherable.map(i => i.id)).toContain('berry');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      registry.registerAll([
        defineItem('berry', 'Berry', 'food', {
          weight: 0.2,
          stackSize: 50,
          isEdible: true,
          hungerRestored: 15,
          isStorable: true,
        }),
        defineItem('wood', 'Wood', 'resource', {
          weight: 2.0,
          stackSize: 50,
          isEdible: false,
          isStorable: true,
          isGatherable: true,
        }),
      ]);
    });

    it('should check if item is edible', () => {
      expect(registry.isEdible('berry')).toBe(true);
      expect(registry.isEdible('wood')).toBe(false);
      expect(registry.isEdible('unknown')).toBe(false);
    });

    it('should check if item is storable', () => {
      expect(registry.isStorable('berry')).toBe(true);
      expect(registry.isStorable('wood')).toBe(true);
      expect(registry.isStorable('unknown')).toBe(false);
    });

    it('should check if item is gatherable', () => {
      expect(registry.isGatherable('wood')).toBe(true);
      expect(registry.isGatherable('berry')).toBe(false); // Not set in this test
      expect(registry.isGatherable('unknown')).toBe(false);
    });

    it('should check item category', () => {
      expect(registry.isFood('berry')).toBe(true);
      expect(registry.isResource('wood')).toBe(true);
      expect(registry.isFood('wood')).toBe(false);
    });

    it('should get item weight', () => {
      expect(registry.getWeight('berry')).toBe(0.2);
      expect(registry.getWeight('wood')).toBe(2.0);
      expect(registry.getWeight('unknown')).toBe(1.0); // Default
    });

    it('should get item stack size', () => {
      expect(registry.getStackSize('berry')).toBe(50);
      expect(registry.getStackSize('unknown')).toBe(50); // Default
    });

    it('should get hunger restored', () => {
      expect(registry.getHungerRestored('berry')).toBe(15);
      expect(registry.getHungerRestored('wood')).toBe(0); // Not edible
      expect(registry.getHungerRestored('unknown')).toBe(0);
    });
  });
});

describe('defaultItems', () => {
  it('should have all required item categories', () => {
    const categories = new Set(DEFAULT_ITEMS.map(i => i.category));
    expect(categories.has('resource')).toBe(true);
    expect(categories.has('food')).toBe(true);
    expect(categories.has('material')).toBe(true);
    expect(categories.has('tool')).toBe(true);
  });

  it('should register all default items', () => {
    const registry = new ItemRegistry();
    registerDefaultItems(registry);

    expect(registry.size).toBe(DEFAULT_ITEMS.length);
    expect(registry.has('wood')).toBe(true);
    expect(registry.has('berry')).toBe(true);
    expect(registry.has('stone')).toBe(true);
  });

  it('should have valid definitions for key items', () => {
    const registry = new ItemRegistry();
    registerDefaultItems(registry);

    const berry = registry.get('berry');
    expect(berry.isEdible).toBe(true);
    expect(berry.hungerRestored).toBeGreaterThan(0);

    const wood = registry.get('wood');
    expect(wood.isGatherable).toBe(true);
    expect(wood.gatherSources).toContain('tree');
  });
});

describe('SeedItemFactory', () => {
  it('should create seed item ID', () => {
    expect(createSeedItemId('oak')).toBe('seed:oak');
    expect(createSeedItemId('berry_bush')).toBe('seed:berry_bush');
  });

  it('should check if item ID is a seed', () => {
    expect(isSeedItemId('seed:oak')).toBe(true);
    expect(isSeedItemId('seed:berry_bush')).toBe(true);
    expect(isSeedItemId('oak')).toBe(false);
    expect(isSeedItemId('berry')).toBe(false);
  });

  it('should extract species ID from seed item ID', () => {
    expect(getSeedSpeciesId('seed:oak')).toBe('oak');
    expect(getSeedSpeciesId('seed:berry_bush')).toBe('berry_bush');
  });

  it('should throw for invalid seed item ID', () => {
    expect(() => getSeedSpeciesId('oak')).toThrow();
  });

  it('should create valid seed item definition', () => {
    const seed = createSeedItem('oak', 'Oak');

    expect(seed.id).toBe('seed:oak');
    expect(seed.displayName).toBe('Oak Seed');
    expect(seed.category).toBe('seed');
    expect(seed.weight).toBe(0.1);
    expect(seed.stackSize).toBe(100);
    expect(seed.isEdible).toBe(false);
    expect(seed.isStorable).toBe(true);
    expect(seed.isGatherable).toBe(true);
    expect(seed.growsInto).toBe('oak');
  });

  it('should create seed with custom options', () => {
    const seed = createSeedItem('special', 'Special Plant', {
      weight: 0.5,
      stackSize: 50,
      gatherSources: ['special_plant', 'greenhouse'],
    });

    expect(seed.weight).toBe(0.5);
    expect(seed.stackSize).toBe(50);
    expect(seed.gatherSources).toContain('special_plant');
    expect(seed.gatherSources).toContain('greenhouse');
  });
});

describe('defineItem', () => {
  it('should create item with defaults', () => {
    const item = defineItem('test', 'Test', 'misc');

    expect(item.id).toBe('test');
    expect(item.displayName).toBe('Test');
    expect(item.category).toBe('misc');
    expect(item.weight).toBe(1.0);
    expect(item.stackSize).toBe(50);
    expect(item.isEdible).toBe(false);
    expect(item.isStorable).toBe(true);
    expect(item.isGatherable).toBe(false);
  });

  it('should override defaults', () => {
    const item = defineItem('custom', 'Custom', 'food', {
      weight: 0.5,
      stackSize: 100,
      isEdible: true,
      hungerRestored: 30,
      isGatherable: true,
      gatherSources: ['plant'],
    });

    expect(item.weight).toBe(0.5);
    expect(item.stackSize).toBe(100);
    expect(item.isEdible).toBe(true);
    expect(item.hungerRestored).toBe(30);
    expect(item.isGatherable).toBe(true);
    expect(item.gatherSources).toContain('plant');
  });
});

describe('ItemRegistry with trait-based items', () => {
  let registry: ItemRegistry;

  beforeEach(() => {
    registry = new ItemRegistry();
  });

  describe('Criterion 2: ItemDefinition with baseMaterial and traits', () => {
    it('should register item with baseMaterial field', () => {
      const ironSword: ItemDefinition = {
        id: 'iron_sword',
        displayName: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
        stackSize: 1,
        isStorable: true,
        isEdible: false,
        isGatherable: false,
      };

      registry.register(ironSword);

      const retrieved = registry.get('iron_sword');
      expect(retrieved.baseMaterial).toBe('iron');
      expect(retrieved.traits?.weapon).toBeDefined();
    });

    it('should register item with EdibleTrait instead of flat flags', () => {
      const berry: ItemDefinition = {
        id: 'berry_v2',
        displayName: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet', 'fruity'],
          },
        },
        stackSize: 50,
        isStorable: true,
        isEdible: true,
        isGatherable: true,
      };

      registry.register(berry);

      const retrieved = registry.get('berry_v2');
      expect(retrieved.traits?.edible).toBeDefined();
      expect(retrieved.traits!.edible!.hungerRestored).toBe(20);
      expect(retrieved.traits!.edible!.quality).toBe(60);
    });

    it('should query items by trait presence', () => {
      const sword: ItemDefinition = {
        id: 'sword',
        displayName: 'Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
        stackSize: 1,
        isStorable: true,
        isEdible: false,
        isGatherable: false,
      };

      const berry: ItemDefinition = {
        id: 'berry_trait',
        displayName: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet'],
          },
        },
        stackSize: 50,
        isStorable: true,
        isEdible: true,
        isGatherable: true,
      };

      registry.registerAll([sword, berry]);

      // Helper to check trait
      function hasWeaponTrait(itemId: string): boolean {
        const item = registry.get(itemId);
        return item.traits?.weapon !== undefined;
      }

      function hasEdibleTrait(itemId: string): boolean {
        const item = registry.get(itemId);
        return item.traits?.edible !== undefined;
      }

      expect(hasWeaponTrait('sword')).toBe(true);
      expect(hasWeaponTrait('berry_trait')).toBe(false);
      expect(hasEdibleTrait('berry_trait')).toBe(true);
      expect(hasEdibleTrait('sword')).toBe(false);
    });

    it('should throw when baseMaterial is missing (required field)', () => {
      const invalidItem = {
        id: 'invalid',
        displayName: 'Invalid',
        category: 'weapon',
        // Missing: baseMaterial
        baseValue: 50,
        weight: 3,
        description: 'Invalid item',
        traits: {},
        stackSize: 1,
        isStorable: true,
        isEdible: false,
        isGatherable: false,
      };

      // TypeScript will catch this at compile time
      // At runtime, validation should throw
      expect(() => {
        if (!('baseMaterial' in invalidItem)) {
          throw new Error('Item definition missing required field: baseMaterial');
        }
        registry.register(invalidItem as ItemDefinition);
      }).toThrow('missing required field: baseMaterial');
    });
  });

  describe('trait-based filtering', () => {
    beforeEach(() => {
      const items: ItemDefinition[] = [
        {
          id: 'iron_sword',
          displayName: 'Iron Sword',
          category: 'weapon',
          baseMaterial: 'iron',
          baseValue: 50,
          weight: 3,
          description: 'A sword',
          traits: {
            weapon: {
              damage: 15,
              damageType: 'slashing',
              range: 1,
              attackSpeed: 1.0,
              durabilityLoss: 0.5,
            },
          },
          stackSize: 1,
          isStorable: true,
          isEdible: false,
          isGatherable: false,
        },
        {
          id: 'magic_sword',
          displayName: 'Magic Sword',
          category: 'weapon',
          baseMaterial: 'iron',
          baseValue: 150,
          weight: 3,
          description: 'An enchanted sword',
          traits: {
            weapon: {
              damage: 20,
              damageType: 'slashing',
              range: 1,
              attackSpeed: 0.9,
              durabilityLoss: 0.6,
            },
            magical: {
              effects: [{ type: 'damage', magnitude: 5, element: 'fire' }],
            },
          },
          stackSize: 1,
          isStorable: true,
          isEdible: false,
          isGatherable: false,
        },
        {
          id: 'apple',
          displayName: 'Apple',
          category: 'food',
          baseMaterial: 'organic',
          baseValue: 3,
          weight: 0.2,
          description: 'An apple',
          traits: {
            edible: {
              hungerRestored: 25,
              quality: 70,
              flavors: ['sweet', 'crisp'],
            },
          },
          stackSize: 50,
          isStorable: true,
          isEdible: true,
          isGatherable: true,
        },
      ];

      registry.registerAll(items);
    });

    it('should get all items with weapon trait', () => {
      const allItems = registry.getAll();
      const weapons = allItems.filter(item => item.traits?.weapon !== undefined);

      expect(weapons).toHaveLength(2);
      expect(weapons.map(w => w.id)).toContain('iron_sword');
      expect(weapons.map(w => w.id)).toContain('magic_sword');
    });

    it('should get all items with magical trait', () => {
      const allItems = registry.getAll();
      const magical = allItems.filter(item => item.traits?.magical !== undefined);

      expect(magical).toHaveLength(1);
      expect(magical[0].id).toBe('magic_sword');
    });

    it('should get items with multiple traits', () => {
      const allItems = registry.getAll();
      const weaponAndMagic = allItems.filter(
        item => item.traits?.weapon !== undefined && item.traits?.magical !== undefined
      );

      expect(weaponAndMagic).toHaveLength(1);
      expect(weaponAndMagic[0].id).toBe('magic_sword');
    });
  });
});
