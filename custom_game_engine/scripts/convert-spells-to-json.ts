/**
 * Script to convert ExpandedSpells.ts to spells.json
 *
 * Phase 3: Content Extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  BLOOD_SPELLS,
  NAME_SPELLS,
  BREATH_SPELLS,
  PACT_SPELLS,
} from '../packages/core/src/magic/ExpandedSpells.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '../data/spells.json');

const spellsData = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'packages/core/src/magic/ExpandedSpells.ts',
  paradigms: {
    divine: DIVINE_SPELLS,
    academic: ACADEMIC_SPELLS,
    blood: BLOOD_SPELLS,
    names: NAME_SPELLS,
    breath: BREATH_SPELLS,
    pact: PACT_SPELLS,
  },
};

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(spellsData, null, 2), 'utf-8');

console.log(`✅ Converted spells to JSON:`);
console.log(`   Output: ${outputPath}`);
console.log(`   Paradigms: ${Object.keys(spellsData.paradigms).length}`);
console.log(`   Total spells: ${Object.values(spellsData.paradigms).flat().length}`);
