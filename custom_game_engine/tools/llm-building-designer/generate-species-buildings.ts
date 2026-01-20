/**
 * Generate Species-Specific Building Sets
 *
 * Generates complete building sets for:
 * - Elven
 * - Centaur
 * - Angelic
 * - High Fae (Tenth Dimensional)
 */

import { buildingGeneratorService } from '../../packages/building-designer/src/BuildingGeneratorService';
import { convertToGameFormat } from './src/import-to-game';
import * as fs from 'fs';
import * as path from 'path';

const BUILDING_TYPES = {
  basic: [
    'small dwelling',
    'family dwelling',
    'communal hall',
    'workshop',
    'storage building',
    'temple',
    'training facility'
  ],
  elven: [
    'moonlit treehouse',
    'crystal meditation bower',
    'living wood library',
    'enchanted forge',
    'starlight sanctuary',
    'vine-wrapped gathering hall',
    'ancient tree archive'
  ],
  centaur: [
    'stable dwelling',
    'clan meeting hall',
    'open-air smithy',
    'training grounds shelter',
    'war council chamber',
    'equipment storage',
    'healer pavilion'
  ],
  angelic: [
    'prayer spire',
    'choir tower',
    'divine workshop',
    'celestial archives',
    'meditation sanctum',
    'healing temple',
    'judgment hall'
  ],
  high_fae_10d: [
    'folded manor',
    'impossible tower',
    'tesseract court',
    'between-space workshop',
    'dream archive',
    'temporal sanctuary',
    'dimensional nexus hall'
  ]
};

async function generateAllSpeciesBuildings() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    SPECIES-SPECIFIC BUILDING SET GENERATION                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allBuildings: Record<string, any[]> = {};

  // Generate for each species
  for (const species of ['elven', 'centaur', 'angelic', 'high_fae_10d'] as const) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`GENERATING ${species.toUpperCase().replace('_', ' ')} BUILDINGS`);
    console.log(`${'='.repeat(80)}\n`);

    const buildingTypes = BUILDING_TYPES[species] || BUILDING_TYPES.basic;
    const buildings = await buildingGeneratorService.generateSpeciesBuildingSet(
      species,
      buildingTypes
    );

    // Validate each building
    const validBuildings = buildings.filter(b => {
      const validation = buildingGeneratorService.validateBuilding(b);
      if (!validation.valid) {
        console.log(`⚠️  ${b.name}: ${validation.errors.join(', ')}`);
      }
      return validation.valid;
    });

    allBuildings[species] = validBuildings;

    // Save species-specific file
    const speciesPath = path.join(__dirname, `species-buildings-${species}.json`);
    fs.writeFileSync(speciesPath, JSON.stringify(validBuildings, null, 2));

    console.log(`\n📁 Saved ${validBuildings.length} ${species} buildings to species-buildings-${species}.json`);
  }

  // Save combined file
  const combinedPath = path.join(__dirname, 'all-species-buildings.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allBuildings, null, 2));

  // Convert to game format
  console.log(`\n${'='.repeat(80)}`);
  console.log('CONVERTING TO GAME FORMAT');
  console.log(`${'='.repeat(80)}\n`);

  const gameFormatBuildings: Record<string, any[]> = {};

  for (const [species, buildings] of Object.entries(allBuildings)) {
    gameFormatBuildings[species] = buildings.map((b: any) => convertToGameFormat(b));
    console.log(`✅ Converted ${buildings.length} ${species} buildings`);
  }

  const gameFormatPath = path.join(__dirname, 'all-species-buildings-game-format.json');
  fs.writeFileSync(gameFormatPath, JSON.stringify(gameFormatBuildings, null, 2));

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('GENERATION COMPLETE');
  console.log(`${'='.repeat(80)}\n`);

  let totalBuildings = 0;
  for (const [species, buildings] of Object.entries(allBuildings)) {
    console.log(`📦 ${species.padEnd(15)}: ${buildings.length} buildings`);
    totalBuildings += buildings.length;
  }

  console.log(`\n🎉 Total: ${totalBuildings} species-specific buildings generated!\n`);
  console.log('📁 Files created:');
  console.log('   - all-species-buildings.json (LLM format)');
  console.log('   - all-species-buildings-game-format.json (game format)');
  console.log('   - species-buildings-{species}.json (individual sets)');
  console.log('');
}

if (require.main === module) {
  generateAllSpeciesBuildings().catch(console.error);
}

export { generateAllSpeciesBuildings };
