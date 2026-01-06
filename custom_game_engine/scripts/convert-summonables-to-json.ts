/**
 * Script to convert SummonableEntities.ts data to summonables.json
 *
 * Phase 3: Content Extraction
 * Note: Type definitions remain in TypeScript
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  PERSONALITY_ARCHETYPES,
  NEGOTIATION_PATTERNS,
  DEMAND_PATTERNS,
  SERVICE_TEMPLATES,
  CONTRACT_TEMPLATES,
  ENTITY_QUIRKS,
  BREACH_PATTERNS,
  APPEARANCE_PATTERNS,
  SUMMONING_REQUIREMENT_PATTERNS,
  EXAMPLE_SUMMONABLE_ENTITIES,
} from '../packages/core/src/magic/SummonableEntities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '../data/summonables.json');

const summonablesData = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: 'packages/core/src/magic/SummonableEntities.ts',
  note: 'Type definitions remain in TypeScript',
  personalityArchetypes: PERSONALITY_ARCHETYPES,
  negotiationPatterns: NEGOTIATION_PATTERNS,
  demandPatterns: DEMAND_PATTERNS,
  serviceTemplates: SERVICE_TEMPLATES,
  contractTemplates: CONTRACT_TEMPLATES,
  entityQuirks: ENTITY_QUIRKS,
  breachPatterns: BREACH_PATTERNS,
  appearancePatterns: APPEARANCE_PATTERNS,
  summoningRequirementPatterns: SUMMONING_REQUIREMENT_PATTERNS,
  exampleEntities: EXAMPLE_SUMMONABLE_ENTITIES,
};

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(summonablesData, null, 2), 'utf-8');

console.log(`✅ Converted summonables to JSON:`);
console.log(`   Output: ${outputPath}`);
console.log(`   Personality archetypes: ${Object.keys(PERSONALITY_ARCHETYPES).length}`);
console.log(`   Negotiation patterns: ${Object.keys(NEGOTIATION_PATTERNS).length}`);
console.log(`   Demand patterns: ${DEMAND_PATTERNS.length}`);
console.log(`   Service templates: ${SERVICE_TEMPLATES.length}`);
console.log(`   Example entities: ${EXAMPLE_SUMMONABLE_ENTITIES.length}`);
