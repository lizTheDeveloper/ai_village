/**
 * Verify that JSON loaders are working correctly
 */

import { getAllItems, getItemById } from '../packages/core/src/data/ItemsLoader.js';
import { getAllSpells, getSpellById } from '../packages/core/src/data/SpellsLoader.js';
import {
  PERSONALITY_ARCHETYPES,
  EXAMPLE_SUMMONABLE_ENTITIES,
} from '../packages/core/src/data/SummonablesLoader.js';

console.log('🔍 Verifying JSON data loaders...\n');

// Test items
const allItems = getAllItems();
console.log(`✅ Items loaded: ${allItems.length} total items`);
const woodItem = getItemById('wood');
if (woodItem) {
  console.log(`✅ getItemById('wood') works: ${woodItem.name}`);
} else {
  console.error('❌ getItemById(\'wood\') failed');
  process.exit(1);
}

// Test spells
const allSpells = getAllSpells();
console.log(`✅ Spells loaded: ${allSpells.length} total spells`);
const healSpell = getSpellById('divine_heal');
if (healSpell) {
  console.log(`✅ getSpellById('divine_heal') works: ${healSpell.name}`);
} else {
  console.error('❌ getSpellById(\'divine_heal\') failed');
  process.exit(1);
}

// Test summonables
console.log(`✅ Personality archetypes loaded: ${PERSONALITY_ARCHETYPES.length} archetypes`);
console.log(`✅ Example entities loaded: ${EXAMPLE_SUMMONABLE_ENTITIES.length} entities`);

console.log('\n✅ All JSON loaders working correctly!');
