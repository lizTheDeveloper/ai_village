/**
 * Help System Demo Test
 *
 * Demonstrates the complete help system workflow:
 * 1. Define items with embedded documentation
 * 2. Register help entries
 * 3. Query and search
 * 4. Generate markdown and JSON wikis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  helpRegistry,
  MarkdownWikiGenerator,
  JsonWikiGenerator,
  createItemHelp,
} from '../index.js';
import { defineItem } from '../../items/ItemDefinition.js';

describe('Help System Demo', () => {
  beforeEach(() => {
    helpRegistry.clear();
  });

  it('demonstrates complete workflow', () => {
    // ========================================================================
    // STEP 1: Define items with embedded help
    // ========================================================================

    const ironSword = defineItem('iron_sword', 'Iron Sword', 'equipment', {
      weight: 2.5,
      baseValue: 200,
      rarity: 'common',
      help: {
        id: 'iron_sword',
        summary: 'A sturdy iron blade forged for combat',
        description:
          'Crafted from iron ingots at a forge. Effective against unarmored foes. Requires strength 10 to wield effectively.',
        category: 'items',
        subcategory: 'weapons',
        tags: ['melee', 'craftable', 'metal', 'weapon'],
        obtainedBy: ['Craft at Smithy', 'Purchase from blacksmith', 'Loot from enemies'],
        usedFor: ['Combat', 'Hunting', 'Defense'],
        crafting: {
          station: 'Smithy',
          ingredients: [
            { item: 'iron_ingot', amount: 2 },
            { item: 'stick', amount: 1 },
          ],
          skill: 'smithing',
          skillLevel: 2,
        },
        mechanics: {
          values: {
            damage: 15,
            attackSpeed: 1.0,
            durability: 500,
          },
          formulas: {
            actualDamage: 'baseDamage * (1 + skill/100)',
          },
        },
        tips: ['Keep repaired', 'Upgrade to steel when possible'],
        relatedTopics: ['iron_ingot', 'smithy', 'steel_sword'],
      },
    });

    const healingPotion = defineItem('healing_potion', 'Healing Potion', 'consumable', {
      weight: 0.5,
      baseValue: 100,
      rarity: 'uncommon',
      help: {
        id: 'healing_potion',
        summary: 'Magical potion that restores health over time',
        description:
          'Restores 50 health over 10 seconds. Cannot stack - finish one before drinking another.',
        category: 'items',
        subcategory: 'consumables',
        tags: ['potion', 'healing', 'craftable', 'magic'],
        obtainedBy: ['Craft at Alchemy Station', 'Purchase from healers'],
        usedFor: ['Emergency healing', 'Recovery between battles'],
        crafting: {
          station: 'Alchemy Station',
          ingredients: [
            { item: 'red_herb', amount: 3 },
            { item: 'mana_crystal', amount: 1 },
          ],
          skill: 'alchemy',
          skillLevel: 2,
        },
        mechanics: {
          values: {
            baseHealing: 50,
            duration: '10 seconds',
          },
        },
        warnings: ['Does not cure poison'],
        relatedTopics: ['red_herb', 'mana_crystal', 'antidote'],
      },
    });

    // ========================================================================
    // STEP 2: Register help entries
    // ========================================================================

    if (ironSword.help) {
      helpRegistry.register({
        ...ironSword.help,
        id: ironSword.id,
        summary: ironSword.help.summary || '',
        description: ironSword.help.description || '',
        category: 'items',
        tags: ironSword.help.tags || [],
      });
    }

    if (healingPotion.help) {
      helpRegistry.register({
        ...healingPotion.help,
        id: healingPotion.id,
        summary: healingPotion.help.summary || '',
        description: healingPotion.help.description || '',
        category: 'items',
        tags: healingPotion.help.tags || [],
      });
    }

    // ========================================================================
    // STEP 3: Query and search
    // ========================================================================

    // Get by ID
    const swordHelp = helpRegistry.get('iron_sword');
    expect(swordHelp).toBeDefined();
    expect(swordHelp?.summary).toBe('A sturdy iron blade forged for combat');

    // Search by text
    const healingResults = helpRegistry.search({ search: 'healing' });
    expect(healingResults).toHaveLength(1);
    expect(healingResults[0].id).toBe('healing_potion');

    // Filter by category
    const allItems = helpRegistry.getByCategory('items');
    expect(allItems).toHaveLength(2);

    // Filter by subcategory
    const weapons = helpRegistry.getBySubcategory('items', 'weapons');
    expect(weapons).toHaveLength(1);
    expect(weapons[0].id).toBe('iron_sword');

    // Filter by tag
    const craftable = helpRegistry.getByTag('craftable');
    expect(craftable).toHaveLength(2);

    // ========================================================================
    // STEP 4: Generate wikis
    // ========================================================================

    const mdGenerator = new MarkdownWikiGenerator(helpRegistry);
    const markdown = mdGenerator.generateCategory('items', {
      includeToc: true,
      includeMechanics: true,
      includeExamples: true,
    });

    expect(markdown).toContain('# Items');
    expect(markdown).toContain('iron_sword');
    expect(markdown).toContain('healing_potion');
    expect(markdown).toContain('## Weapons');
    expect(markdown).toContain('## Consumables');

    const jsonGenerator = new JsonWikiGenerator(helpRegistry);
    const json = jsonGenerator.generateFull();

    expect(json).toHaveProperty('version');
    expect(json).toHaveProperty('stats');
    expect(json).toHaveProperty('categories');

    // ========================================================================
    // STEP 5: Statistics
    // ========================================================================

    const stats = helpRegistry.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.categories.items).toBe(2);
    expect(stats.tags.craftable).toBe(2);
    expect(stats.tags.weapon).toBe(1);
  });

  it('demonstrates programmatic help creation', () => {
    const help = createItemHelp(
      'test_item',
      'A test item for demonstration',
      'This item demonstrates programmatic help creation',
      'tools',
      ['test', 'demo']
    );

    expect(help.id).toBe('test_item');
    expect(help.category).toBe('items');
    expect(help.subcategory).toBe('tools');
    expect(help.tags).toContain('test');

    helpRegistry.register(help);
    const retrieved = helpRegistry.get('test_item');
    expect(retrieved).toBeDefined();
  });

  it('demonstrates search capabilities', () => {
    // Register test items
    helpRegistry.register(
      createItemHelp('sword', 'A sharp blade', 'For cutting', 'weapons', ['melee', 'sharp'])
    );
    helpRegistry.register(
      createItemHelp('axe', 'A chopping tool', 'For chopping', 'tools', ['tool', 'sharp'])
    );
    helpRegistry.register(
      createItemHelp('potion', 'A healing drink', 'For healing', 'consumables', ['magic'])
    );

    // Search by text
    const sharpResults = helpRegistry.search({ search: 'sharp' });
    expect(sharpResults).toHaveLength(1); // Only 'sword' has 'sharp' in description

    // Filter by tag
    const sharpItems = helpRegistry.getByTag('sharp');
    expect(sharpItems).toHaveLength(2);

    // Complex query
    const results = helpRegistry.search({
      category: 'items',
      tags: ['sharp'],
      limit: 1,
    });
    expect(results).toHaveLength(1);
  });

  it('generates valid markdown', () => {
    helpRegistry.register(
      createItemHelp('demo', 'Demo item', 'A demonstration', 'misc', ['demo'])
    );

    const generator = new MarkdownWikiGenerator(helpRegistry);
    const markdown = generator.generateEntry(helpRegistry.get('demo')!);

    expect(markdown).toContain('### demo');
    expect(markdown).toContain('**Demo item**');
    expect(markdown).toContain('A demonstration');
    expect(markdown).toContain('Tags: `demo`');
  });

  it('generates valid JSON', () => {
    helpRegistry.register(
      createItemHelp('demo', 'Demo item', 'A demonstration', 'misc', ['demo'])
    );

    const generator = new JsonWikiGenerator(helpRegistry);
    const wiki = generator.generateFull();

    expect(wiki).toHaveProperty('version', '1.0');
    expect(wiki).toHaveProperty('generatedAt');
    expect(wiki).toHaveProperty('stats');
    expect(wiki).toHaveProperty('categories.items');
  });
});
