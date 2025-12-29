import { describe, it, expect, beforeEach } from 'vitest';
import {
  ItemLoader,
  ItemValidationError,
  parseItemData,
  parseItemsFromJson,
  loadItemsFromJson,
} from '../ItemLoader.js';
import { ItemRegistry } from '../ItemRegistry.js';
import type { RawItemData } from '../ItemLoader.js';

describe('ItemLoader', () => {
  describe('parseItemData', () => {
    it('should parse valid item data with all fields', () => {
      const raw: RawItemData = {
        id: 'test_item',
        displayName: 'Test Item',
        category: 'resource',
        weight: 2.5,
        stackSize: 30,
        isEdible: false,
        isStorable: true,
        isGatherable: true,
        gatherSources: ['tree'],
        requiredTool: 'axe',
      };

      const item = parseItemData(raw);

      expect(item.id).toBe('test_item');
      expect(item.displayName).toBe('Test Item');
      expect(item.category).toBe('resource');
      expect(item.weight).toBe(2.5);
      expect(item.stackSize).toBe(30);
      expect(item.isEdible).toBe(false);
      expect(item.isStorable).toBe(true);
      expect(item.isGatherable).toBe(true);
      expect(item.gatherSources).toEqual(['tree']);
      expect(item.requiredTool).toBe('axe');
    });

    it('should apply defaults for optional fields', () => {
      const raw: RawItemData = {
        id: 'minimal_item',
        displayName: 'Minimal Item',
        category: 'misc',
      };

      const item = parseItemData(raw);

      expect(item.weight).toBe(1.0);
      expect(item.stackSize).toBe(50);
      expect(item.isEdible).toBe(false);
      expect(item.isStorable).toBe(true);
      expect(item.isGatherable).toBe(false);
    });

    it('should parse food item with hunger value', () => {
      const raw: RawItemData = {
        id: 'test_food',
        displayName: 'Test Food',
        category: 'food',
        isEdible: true,
        hungerRestored: 25,
      };

      const item = parseItemData(raw);

      expect(item.isEdible).toBe(true);
      expect(item.hungerRestored).toBe(25);
    });

    it('should parse crafting recipe', () => {
      const raw: RawItemData = {
        id: 'crafted_item',
        displayName: 'Crafted Item',
        category: 'material',
        craftedFrom: [
          { itemId: 'wood', amount: 2 },
          { itemId: 'stone', amount: 3 },
        ],
      };

      const item = parseItemData(raw);

      expect(item.craftedFrom).toHaveLength(2);
      expect(item.craftedFrom![0]).toEqual({ itemId: 'wood', amount: 2 });
      expect(item.craftedFrom![1]).toEqual({ itemId: 'stone', amount: 3 });
    });

    it('should throw for missing id', () => {
      const raw = {
        displayName: 'No ID Item',
        category: 'misc',
      } as RawItemData;

      expect(() => parseItemData(raw)).toThrow(ItemValidationError);
    });

    it('should throw for missing displayName', () => {
      const raw = {
        id: 'no_name',
        category: 'misc',
      } as RawItemData;

      expect(() => parseItemData(raw)).toThrow(ItemValidationError);
    });

    it('should throw for invalid category', () => {
      const raw: RawItemData = {
        id: 'bad_category',
        displayName: 'Bad Category',
        category: 'invalid_category',
      };

      expect(() => parseItemData(raw)).toThrow(ItemValidationError);
    });

    it('should throw for negative weight', () => {
      const raw: RawItemData = {
        id: 'negative_weight',
        displayName: 'Negative Weight',
        category: 'misc',
        weight: -1,
      };

      expect(() => parseItemData(raw)).toThrow(ItemValidationError);
    });

    it('should throw for zero stackSize', () => {
      const raw: RawItemData = {
        id: 'zero_stack',
        displayName: 'Zero Stack',
        category: 'misc',
        stackSize: 0,
      };

      expect(() => parseItemData(raw)).toThrow(ItemValidationError);
    });
  });

  describe('parseItemsFromJson', () => {
    it('should parse array of items', () => {
      const rawItems: RawItemData[] = [
        { id: 'item1', displayName: 'Item 1', category: 'resource' },
        { id: 'item2', displayName: 'Item 2', category: 'food', isEdible: true },
      ];

      const items = parseItemsFromJson(rawItems);

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('item1');
      expect(items[1].id).toBe('item2');
      expect(items[1].isEdible).toBe(true);
    });

    it('should throw for non-array input', () => {
      expect(() => parseItemsFromJson({} as any)).toThrow('must be an array');
    });
  });

  describe('loadItemsFromJson', () => {
    let registry: ItemRegistry;

    beforeEach(() => {
      registry = new ItemRegistry();
    });

    it('should load valid items into registry', () => {
      const rawItems: RawItemData[] = [
        { id: 'loaded1', displayName: 'Loaded 1', category: 'resource' },
        { id: 'loaded2', displayName: 'Loaded 2', category: 'food' },
      ];

      const result = loadItemsFromJson(registry, rawItems);

      expect(result.loaded).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(registry.has('loaded1')).toBe(true);
      expect(registry.has('loaded2')).toBe(true);
    });

    it('should collect validation errors and continue loading', () => {
      const rawItems: RawItemData[] = [
        { id: 'valid', displayName: 'Valid', category: 'resource' },
        { id: 'invalid', displayName: 'Invalid', category: 'bad_category' },
        { id: 'also_valid', displayName: 'Also Valid', category: 'tool' },
      ];

      const result = loadItemsFromJson(registry, rawItems);

      expect(result.loaded).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].itemId).toBe('invalid');
      expect(registry.has('valid')).toBe(true);
      expect(registry.has('also_valid')).toBe(true);
      expect(registry.has('invalid')).toBe(false);
    });
  });

  describe('ItemLoader class', () => {
    let registry: ItemRegistry;
    let loader: ItemLoader;

    beforeEach(() => {
      registry = new ItemRegistry();
      loader = new ItemLoader(registry);
    });

    it('should load items from array', () => {
      const items: RawItemData[] = [
        { id: 'class_test', displayName: 'Class Test', category: 'misc' },
      ];

      loader.loadFromArray(items, 'test-source');

      expect(loader.getItemCount()).toBe(1);
      expect(loader.getLoadedSources()).toContain('test-source (1 items)');
    });

    it('should load items from JSON string', () => {
      const json = JSON.stringify([
        { id: 'json_test', displayName: 'JSON Test', category: 'resource' },
      ]);

      loader.loadFromString(json, 'json-source');

      expect(registry.has('json_test')).toBe(true);
    });

    it('should throw on validation errors', () => {
      const items: RawItemData[] = [
        { id: 'bad', displayName: 'Bad', category: 'invalid' },
      ];

      expect(() => loader.loadFromArray(items, 'bad-source')).toThrow();
    });
  });
});
