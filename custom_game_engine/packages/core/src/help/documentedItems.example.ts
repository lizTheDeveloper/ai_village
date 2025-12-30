/**
 * Example: Items with Embedded Documentation
 *
 * This file demonstrates how to add self-documenting help entries to items.
 * These examples show the full power of the help system:
 * - Summary and detailed descriptions
 * - Obtaining methods and uses
 * - Crafting recipes
 * - Tips and warnings
 * - Mechanical details for LLMs
 * - Quality information
 * - Related topics
 */

import { defineItem } from '../items/ItemDefinition.js';
// createItemHelp available for programmatic help generation
import { createItemHelp as _createItemHelp } from './HelpEntry.js';
void _createItemHelp; // Prevent unused import warning

// ============================================================================
// RESOURCE ITEMS
// ============================================================================

export const DOCUMENTED_IRON_INGOT = defineItem('iron_ingot', 'Iron Ingot', 'material', {
  weight: 2.0,
  stackSize: 100,
  baseValue: 50,
  rarity: 'common',
  baseMaterial: 'iron',
  help: {
    id: 'iron_ingot',
    summary: 'Refined iron bar used for crafting metal tools, weapons, and structures',
    description: `Iron ingots are the fundamental building material for most metalwork. Smelted from iron ore at a furnace, they serve as the primary ingredient for tools, weapons, armor, and building components. Quality affects durability and effectiveness of crafted items.`,
    category: 'items',
    subcategory: 'materials',
    tags: ['metal', 'craftable', 'smelting', 'building-material'],
    obtainedBy: [
      'Smelt iron ore at a Furnace (requires fuel)',
      'Trade with merchants',
      'Find in chests or loot',
    ],
    usedFor: [
      'Craft iron tools (axe, pickaxe, hoe)',
      'Forge iron weapons and armor',
      'Build metal structures and reinforcements',
      'Create advanced crafting stations',
    ],
    crafting: {
      station: 'Furnace',
      ingredients: [
        { item: 'iron_ore', amount: 1 },
        { item: 'coal', amount: 1 },
      ],
      skill: 'smelting',
      skillLevel: 1,
    },
    qualityInfo: {
      min: 0,
      max: 100,
      effects:
        'Quality affects the durability and effectiveness of items crafted with this ingot. Higher quality ingots produce better tools and weapons.',
    },
    mechanics: {
      values: {
        weight: 2.0,
        baseValue: 50,
        smeltTime: '30 seconds',
      },
      formulas: {
        quality: 'base_ore_quality * (1 + smelting_skill/100)',
        craftedItemBonus: 'ingot_quality * 0.5',
      },
      dependencies: ['furnace', 'smelting_skill'],
      unlocks: ['iron_tools', 'iron_weapons', 'iron_armor', 'smithy'],
    },
    tips: [
      'Stockpile iron ingots early - they are used in many recipes',
      'Higher smelting skill produces better quality ingots',
      'Combine with wood to create iron-reinforced structures',
    ],
    relatedTopics: ['iron_ore', 'coal', 'furnace', 'iron_sword', 'iron_pickaxe'],
  },
});

export const DOCUMENTED_HEALING_POTION = defineItem(
  'healing_potion',
  'Healing Potion',
  'consumable',
  {
    weight: 0.5,
    stackSize: 20,
    baseValue: 100,
    rarity: 'uncommon',
    traits: {
      edible: {
        hungerRestored: 0,
        quality: 70,
        flavors: ['bitter'],
        // effectsDescription moved to help.description
      },
    },
    help: {
      id: 'healing_potion',
      summary: 'Magical potion that restores health over time',
      description: `A shimmering red potion brewed from medicinal herbs and magical essence. When consumed, it rapidly regenerates health over 10 seconds. The healing effect cannot be interrupted, but multiple potions do not stack - you must wait for one to finish before drinking another.`,
      category: 'items',
      subcategory: 'consumables',
      tags: ['potion', 'healing', 'craftable', 'magic', 'emergency'],
      obtainedBy: [
        'Craft at Alchemy Station with herbs and mana crystals',
        'Purchase from healers and alchemists',
        'Find in dungeons and treasure chests',
        'Quest rewards',
      ],
      usedFor: [
        'Emergency healing during combat',
        'Recovery between battles',
        'Sustaining health during exploration',
      ],
      crafting: {
        station: 'Alchemy Station',
        ingredients: [
          { item: 'red_herb', amount: 3 },
          { item: 'mana_crystal', amount: 1 },
          { item: 'water', amount: 1 },
        ],
        skill: 'alchemy',
        skillLevel: 2,
      },
      qualityInfo: {
        min: 50,
        max: 100,
        effects:
          'Quality affects healing amount: 50-quality heals 40 HP, 100-quality heals 60 HP',
      },
      mechanics: {
        values: {
          baseHealing: 50,
          duration: '10 seconds',
          tickRate: '1 second',
        },
        formulas: {
          totalHealing: 'baseHealing * (quality/70)',
          healPerTick: 'totalHealing / 10',
        },
        conditions: {
          'Cannot stack': 'Drinking another potion cancels the first',
          'Combat safe': 'Effect continues even while taking damage',
        },
        timing: {
          duration: '10 seconds',
          cooldown: 'None',
        },
        costs: {
          'Inventory weight': 0.5,
        },
      },
      tips: [
        'Keep at least 3 potions in your hotbar for emergencies',
        'Higher alchemy skill creates better quality potions',
        'Use before combat for a health buffer',
        'Combine with food for full recovery',
      ],
      warnings: [
        'Does not stack - finish one potion before drinking another',
        'Cannot cure poison or disease - use antidotes instead',
      ],
      examples: [
        {
          title: 'Combat Emergency',
          description:
            'You are at 30% health in a boss fight. Drink a healing potion to gain 50 HP over 10 seconds while continuing to attack.',
        },
        {
          title: 'Efficient Exploration',
          description:
            'After a fight leaves you at 60% health, drink a potion and continue exploring while it heals you, rather than waiting idle.',
        },
      ],
      relatedTopics: [
        'alchemy_station',
        'red_herb',
        'mana_crystal',
        'energy_potion',
        'antidote',
      ],
    },
  }
);

// ============================================================================
// TOOLS
// ============================================================================

export const DOCUMENTED_IRON_PICKAXE = defineItem('iron_pickaxe', 'Iron Pickaxe', 'tool', {
  weight: 3.0,
  stackSize: 1,
  baseValue: 200,
  rarity: 'common',
  baseMaterial: 'iron',
  traits: {
    tool: {
      toolType: 'pickaxe',
      efficiency: 1.5,
      durabilityLoss: 0.1,
      qualityBonus: 10,
    },
  },
  help: {
    id: 'iron_pickaxe',
    summary: 'Essential tool for mining stone, ore, and minerals',
    description: `The iron pickaxe is the workhorse of any mining operation. Forged from iron ingots, it breaks through stone and ore deposits 50% faster than basic stone tools. Durability decreases with use, requiring repairs at an anvil. Quality affects mining speed and ore quality extracted.`,
    category: 'items',
    subcategory: 'tools',
    tags: ['tool', 'mining', 'craftable', 'iron', 'durable'],
    obtainedBy: [
      'Craft at Smithy with iron ingots and sticks',
      'Purchase from blacksmiths',
      'Find in mining camps',
    ],
    usedFor: [
      'Mine stone, iron ore, copper ore, coal',
      'Excavate rock formations',
      'Break through cave walls',
      'Gather minerals and gems (when unlocked)',
    ],
    crafting: {
      station: 'Smithy',
      ingredients: [
        { item: 'iron_ingot', amount: 3 },
        { item: 'stick', amount: 2 },
      ],
      skill: 'smithing',
      skillLevel: 2,
    },
    qualityInfo: {
      min: 30,
      max: 100,
      effects:
        'Quality affects mining speed (30-quality: 1.3x, 100-quality: 1.8x) and durability (30-quality: 500 uses, 100-quality: 1000 uses)',
    },
    mechanics: {
      values: {
        baseMiningSpeed: 1.5,
        baseDurability: 500,
        repairCost: '1 iron ingot per 25% durability',
      },
      formulas: {
        miningSpeed: 'baseMiningSpeed * (0.8 + quality * 0.004)',
        durability: 'baseDurability * (0.6 + quality * 0.008)',
        oreQuality: 'base_ore_quality + (pickaxe_quality * 0.2)',
      },
      conditions: {
        'Requires smithy': 'Cannot craft without a smithy building',
        'Requires mining skill 1': 'Cannot use effectively below skill level 1',
      },
      dependencies: ['smithy', 'mining_skill_1'],
      unlocks: ['advanced_mining', 'gem_extraction', 'deep_mining'],
    },
    tips: [
      'Repair before durability reaches 0 to avoid breakage',
      'Higher smithing skill creates better quality pickaxes',
      'Combine with mining skill upgrades for maximum efficiency',
      'Keep a backup pickaxe when mining far from home',
    ],
    warnings: [
      'If durability reaches 0, the pickaxe breaks permanently',
      'Cannot mine rare ores without sufficient mining skill',
    ],
    examples: [
      {
        title: 'Early Game Mining',
        description:
          'Craft your first iron pickaxe to access iron and coal deposits, enabling advanced crafting and smelting.',
      },
      {
        title: 'Efficient Resource Gathering',
        description:
          'A quality-80 iron pickaxe mines 50% faster and lasts twice as long as a quality-30 one, saving time and resources.',
      },
    ],
    relatedTopics: [
      'iron_ingot',
      'smithy',
      'mining_skill',
      'iron_ore',
      'coal',
      'steel_pickaxe',
    ],
  },
});

// ============================================================================
// MAGICAL ITEMS
// ============================================================================

export const DOCUMENTED_MANA_CRYSTAL = defineItem('mana_crystal', 'Mana Crystal', 'material', {
  weight: 0.2,
  stackSize: 50,
  baseValue: 150,
  rarity: 'uncommon',
  traits: {
    magical: {
      effects: ['restore_mana:25'],
      charges: 10,
      rechargeRate: 1, // 1 charge per hour
      passive: false,
    },
  },
  help: {
    id: 'mana_crystal',
    summary: 'Crystallized magical energy used for spellcasting and alchemy',
    description: `Mana crystals are condensed magical energy that naturally forms in areas of high magical saturation. They serve dual purposes: as a material component for magical crafting and as a rechargeable mana battery. When held, a mage can drain the crystal to restore 25 mana per charge. Crystals slowly recharge when exposed to magical fields.`,
    category: 'items',
    subcategory: 'magical-materials',
    tags: ['magic', 'rechargeable', 'crafting-ingredient', 'rare'],
    obtainedBy: [
      'Mine from crystal deposits in magical zones',
      'Craft at Enchanting Table by condensing pure mana',
      'Drops from magical creatures',
      'Purchase from magic merchants',
    ],
    usedFor: [
      'Restore mana in emergencies (25 mana per use, 10 uses)',
      'Craft magical potions and scrolls',
      'Enchant items at enchanting stations',
      'Power magical machinery',
    ],
    qualityInfo: {
      min: 40,
      max: 100,
      effects:
        'Quality affects mana restoration (40-quality: 20 mana, 100-quality: 30 mana) and recharge rate',
    },
    mechanics: {
      values: {
        baseManaRestored: 25,
        maxCharges: 10,
        rechargeRate: '1 charge per hour',
        activationTime: 'Instant',
      },
      formulas: {
        manaRestored: 'baseManaRestored * (quality/70)',
        rechargeSpeed: 'baseRate * (1 + quality/200)',
      },
      conditions: {
        'Requires magical affinity': 'Non-mages restore half mana',
        Recharging: 'Must be in magical zone or carried by mage',
      },
      timing: {
        cooldown: '5 seconds between uses',
        rechargeTime: '10 hours for full recharge',
      },
    },
    tips: [
      'Keep one in your hotbar as an emergency mana source',
      'Recharge faster by standing near ley lines or magical structures',
      'Combine multiple crystals for larger mana pools',
      'Use lower-quality crystals for crafting, save high-quality for combat',
    ],
    warnings: [
      'Overuse can cause mana sickness - wait for cooldown',
      'Crystals shatter if depleted below 0 charges (quality check)',
    ],
    examples: [
      {
        title: 'Combat Mana Management',
        description:
          'During a tough battle, your mana drops to 10. Activate the mana crystal to instantly restore 25 mana and continue casting spells.',
      },
      {
        title: 'Crafting Efficiency',
        description:
          'Use 3 mana crystals to craft a healing potion at the alchemy station, preserving your personal mana for adventuring.',
      },
    ],
    relatedTopics: [
      'magic_system',
      'enchanting_table',
      'healing_potion',
      'mana_management',
      'ley_lines',
    ],
  },
});
