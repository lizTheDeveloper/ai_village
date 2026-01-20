import { convertToGameFormat } from './src/import-to-game';
import * as fs from 'fs';

const buildings = JSON.parse(fs.readFileSync('qwen-all-buildings.json', 'utf-8'));
const converted = buildings.map((b: any) => convertToGameFormat(b));

fs.writeFileSync('qwen-all-buildings-game-format.json', JSON.stringify(converted, null, 2));

console.log(`✅ Converted ${converted.length} Qwen buildings to game format`);
console.log(`📁 Output: qwen-all-buildings-game-format.json\n`);

converted.forEach((b: any) => {
  console.log(`  - ${b.name} (${b.id})`);
  console.log(`    Tier ${b.tier}, ${b.width}x${b.height}, ${b.category}`);
  console.log(`    Materials: ${b.resourceCost.map((r: any) => r.resourceId).join(', ')}`);
  console.log('');
});

console.log('📋 Ready to import into game!');
