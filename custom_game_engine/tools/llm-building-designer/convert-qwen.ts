/**
 * Convert Qwen-generated buildings to game format
 */

import { convertToGameFormat } from './src/import-to-game';
import * as fs from 'fs';
import * as path from 'path';

const inputPath = path.join(__dirname, 'qwen-generated-buildings.json');
const outputPath = path.join(__dirname, 'qwen-buildings-game-format.json');

const buildings = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const converted = buildings.map(convertToGameFormat);

fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));

console.log(`✅ Converted ${converted.length} Qwen building(s) to game format`);
console.log(`📁 Output: ${outputPath}`);
console.log('\nBuildings:');
converted.forEach((b: any) => {
  console.log(`  - ${b.name} (${b.id}) [Tier ${b.tier}, ${b.width}x${b.height}]`);
});
