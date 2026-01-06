/**
 * Script to convert items/*.ts to items.json
 *
 * Phase 3: Content Extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  RESOURCE_ITEMS,
  FOOD_ITEMS,
  MATERIAL_ITEMS,
  TOOL_ITEMS,
  WEAPON_ITEMS,
  CONSUMABLE_ITEMS,
  CLOTHING_ITEMS,
  ADVANCED_MATERIAL_ITEMS,
  PRESERVED_FOOD_ITEMS,
  FARMING_TOOL_ITEMS,
  DEFAULT_ITEMS,
} from '../packages/core/src/items/defaultItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '../data/items.json');

const itemsData = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'packages/core/src/items/defaultItems.ts',
  categories: {
    resources: RESOURCE_ITEMS,
    food: FOOD_ITEMS,
    materials: MATERIAL_ITEMS,
    tools: TOOL_ITEMS,
    weapons: WEAPON_ITEMS,
    consumables: CONSUMABLE_ITEMS,
    clothing: CLOTHING_ITEMS,
    advancedMaterials: ADVANCED_MATERIAL_ITEMS,
    preservedFood: PRESERVED_FOOD_ITEMS,
    farmingTools: FARMING_TOOL_ITEMS,
  },
  allItems: DEFAULT_ITEMS,
};

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(itemsData, null, 2), 'utf-8');

console.log(`✅ Converted items to JSON:`);
console.log(`   Output: ${outputPath}`);
console.log(`   Total items: ${DEFAULT_ITEMS.length}`);
console.log(`   Categories: ${Object.keys(itemsData.categories).length}`);
Object.entries(itemsData.categories).forEach(([name, items]) => {
  console.log(`     - ${name}: ${items.length} items`);
});
