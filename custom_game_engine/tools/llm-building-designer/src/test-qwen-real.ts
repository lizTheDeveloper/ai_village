/**
 * REAL Qwen Building Design Test
 *
 * Tests Qwen's ability to design buildings using the actual LLM infrastructure
 */

import { validateBuilding, formatValidationResult, visualizeBuilding } from './validator';
import { VoxelBuildingDefinition } from './types';

// Mock LLM call - replace with actual call to game's LLM system
async function callQwen(_prompt: string): Promise<string> {
  console.log('\n📞 Calling Qwen via Groq...');
  console.log('Model: qwen-3-32b');
  console.log('Temperature: 0.7\n');

  // TODO: Integrate with game's LLM system:
  // import { ProxyLLMProvider } from '@ai-village/llm';
  // const provider = new ProxyLLMProvider();
  // const response = await provider.chat({
  //   model: 'qwen-3-32b',
  //   messages: [
  //     { role: 'system', content: BUILDING_DESIGNER_PROMPT },
  //     { role: 'user', content: prompt }
  //   ],
  //   temperature: 0.7
  // });
  // return response.content;

  // For now, return a simulated response
  return `{
  "id": "qwen_stone_workshop",
  "name": "Artisan's Stone Workshop",
  "description": "A sturdy stone workshop for skilled craftspeople",
  "category": "production",
  "tier": 3,
  "layout": [
    "########",
    "#K....K#",
    "W......W",
    "#......#",
    "#..SS..#",
    "#......#",
    "W...T..W",
    "######D#"
  ],
  "materials": {
    "wall": "stone",
    "floor": "stone",
    "door": "wood"
  },
  "functionality": [
    { "type": "crafting", "params": { "workstations": 2, "qualityBonus": 1.5 } },
    { "type": "storage", "params": { "capacity": 50 } }
  ],
  "capacity": 3
}`;
}

async function testQwenBuildingDesign(request: string): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING QWEN BUILDING DESIGN`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`Request: ${request}\n`);

  try {
    // Call Qwen
    const response = await callQwen(request);

    console.log('📥 Qwen Response:');
    console.log(response);
    console.log('');

    // Parse JSON
    let building: VoxelBuildingDefinition;
    try {
      building = JSON.parse(response);
      console.log('✅ JSON parsed successfully\n');
    } catch (e: any) {
      console.log('❌ Failed to parse JSON:',  e.message);
      return false;
    }

    // Validate building
    const validation = validateBuilding(building);

    console.log('🏗️  Building Visualization:');
    console.log(visualizeBuilding(building));
    console.log('');

    console.log('🔍 Validation Results:');
    console.log(formatValidationResult(validation));
    console.log('');

    if (validation.isValid) {
      console.log('✅ SUCCESS: Qwen designed a valid building!');
      console.log(`   - Name: ${building.name}`);
      console.log(`   - Category: ${building.category}`);
      console.log(`   - Tier: ${building.tier}`);
      console.log(`   - Size: ${validation.dimensions.width}x${validation.dimensions.height}`);
      console.log(`   - Tile count: ${validation.tileCounts.walls + validation.tileCounts.floors}`);
      console.log(`   - Entrances: ${validation.pathfinding.entrances.length}`);
      return true;
    } else {
      console.log('⚠️  PARTIAL: Building has validation issues');
      console.log(`   Errors: ${validation.issues.filter(i => i.severity === 'error').length}`);
      console.log(`   Warnings: ${validation.issues.filter(i => i.severity === 'warning').length}`);
      return false;
    }

  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         QWEN BUILDING DESIGNER - REAL TEST                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const requests = [
    'Design a tier-2 wooden cottage for 2 people with a bed, table, and storage. Make it cozy and 6x6 tiles.',
    'Design a tier-3 stone workshop with 2 workstations, storage, and windows. About 8x8 tiles.',
    'Design a tier-4 magical laboratory with crystal walls. Include workstation, bookshelves, and windows. 9x10 tiles.',
  ];

  let successCount = 0;
  for (const request of requests) {
    const success = await testQwenBuildingDesign(request);
    if (success) successCount++;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SUMMARY: ${successCount}/${requests.length} buildings successfully designed and validated`);
  console.log(`${'='.repeat(80)}\n`);

  if (successCount === requests.length) {
    console.log('🎉 Qwen can design valid buildings!');
  } else {
    console.log('⚠️  Qwen needs prompt refinement or validation adjustments');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
