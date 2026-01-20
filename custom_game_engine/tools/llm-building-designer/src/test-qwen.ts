/**
 * Test Qwen's ability to design buildings using the LLM Building Designer
 */

import { validateBuilding, formatValidationResult } from './validator';
import { VoxelBuildingDefinition, TILE_SYMBOLS } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * System prompt for building design
 */
const BUILDING_DESIGNER_PROMPT = `You are a building designer for a fantasy game. Design buildings using ASCII layouts.

TILE SYMBOLS:
# = Wall (solid, blocks movement)
. = Floor (walkable)
D = Door (connects rooms/exterior)
W = Window (in walls, allows light)
  = Empty/outside space
B = Bed (furniture)
T = Table (furniture)
S = Storage chest
K = Workstation/crafting
C = Counter

MATERIALS:
Common: wood, stone, brick, metal, glass
Organic: living_wood, fungus, bamboo, thatch
Exotic: ice, crystal, obsidian, marble, bone
Magical: starlight, enchanted_wood, shadowstone

DESIGN RULES:
1. Building MUST have at least one door (D) connecting interior to exterior
2. All interior spaces must be reachable from doors
3. Doors must have walls on opposite sides (vertical OR horizontal)
4. Windows (W) should be in wall lines
5. Exterior must be fully walled (no gaps)
6. Use proper JSON format

EXAMPLE:
{
  "id": "example_hut",
  "name": "Example Hut",
  "description": "A simple dwelling",
  "category": "residential",
  "tier": 1,
  "layout": [
    "#####",
    "#B.S#",
    "#...D",
    "#####"
  ],
  "materials": {
    "wall": "wood",
    "floor": "wood",
    "door": "wood"
  },
  "functionality": [
    { "type": "sleeping", "params": { "beds": 1 } }
  ],
  "capacity": 1
}

IMPORTANT: Return ONLY valid JSON. No explanations before or after. The JSON must parse correctly.`;

/**
 * Building design requests for testing
 */
const TEST_REQUESTS = [
  {
    name: 'Simple Cottage',
    prompt: 'Design a cozy tier-2 cottage for 2 people with a bed, table, and storage. Use wood materials. Make it 6x6 tiles.',
  },
  {
    name: 'Stone Workshop',
    prompt: 'Design a tier-3 stone workshop with 2 workstations, storage, and a table. Should be rectangular, about 8x6 tiles.',
  },
  {
    name: 'Crystal Observatory',
    prompt: 'Design a tier-4 crystal tower for research. Include workstation, windows for stargazing, and storage. 7x9 tiles, use crystal/glass materials.',
  },
];

/**
 * Test Qwen with a building design request
 */
async function testQwenDesign(request: { name: string; prompt: string }): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${request.name}`);
  console.log(`Request: ${request.prompt}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('📝 Prompt sent to Qwen:');
  console.log(BUILDING_DESIGNER_PROMPT);
  console.log(`\nUSER: ${request.prompt}\n`);

  console.log('⚠️  This is a simulation - Qwen API integration needed');
  console.log('To actually test Qwen, you would:');
  console.log('1. Call Qwen API with the system prompt + user request');
  console.log('2. Parse the JSON response');
  console.log('3. Validate using validateBuilding()');
  console.log('4. Report results\n');

  console.log('Example integration:');
  console.log(`
const response = await callQwenAPI({
  system: BUILDING_DESIGNER_PROMPT,
  user: request.prompt,
  temperature: 0.7,
});

const building = JSON.parse(response.content);
const validation = validateBuilding(building);

if (validation.isValid) {
  console.log('✅ Qwen designed a valid building!');
} else {
  console.log('❌ Building has errors:');
  console.log(formatValidationResult(validation));
}
  `);
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        TESTING QWEN LLM BUILDING DESIGN CAPABILITIES          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('This test demonstrates how to integrate Qwen (or any LLM) with the');
  console.log('building designer. To actually test Qwen, you need:');
  console.log('');
  console.log('1. Qwen API access (via groq, together.ai, or local deployment)');
  console.log('2. Update packages/llm/src/providers/* to add Qwen support');
  console.log('3. Modify this script to call the LLM provider');
  console.log('');

  for (const request of TEST_REQUESTS) {
    await testQwenDesign(request);
  }

  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEPS:');
  console.log('='.repeat(80));
  console.log('');
  console.log('To enable real Qwen testing:');
  console.log('');
  console.log('1. Add Qwen provider to packages/llm/src/providers/');
  console.log('2. Add Qwen API key to .env: QWEN_API_KEY=...');
  console.log('3. Update this script to call:');
  console.log('   import { LLMServiceFacade } from "@ai-village/llm"');
  console.log('   const llm = LLMServiceFacade.getInstance()');
  console.log('   const response = await llm.chat({ provider: "qwen", ... })');
  console.log('4. Parse response and validate building');
  console.log('');
  console.log('Alternative: Use Groq API which supports Qwen models:');
  console.log('   https://console.groq.com/docs/models');
  console.log('');
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

export { BUILDING_DESIGNER_PROMPT, TEST_REQUESTS };
