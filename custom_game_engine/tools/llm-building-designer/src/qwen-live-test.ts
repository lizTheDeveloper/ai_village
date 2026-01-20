/**
 * Live Qwen Building Design Test
 *
 * Actually calls Qwen API to design buildings
 */

import { validateBuilding, visualizeBuilding } from './validator';
import { VoxelBuildingDefinition } from './types';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found in environment');
  console.error('Please set GROQ_API_KEY in .env file');
  process.exit(1);
}

const BUILDING_DESIGNER_PROMPT = `You are a building designer for a fantasy game. Design buildings using ASCII layouts.

IMPORTANT: Keep your response brief. Return ONLY valid JSON. No long explanations.

TILE SYMBOLS:
# = Wall    . = Floor    D = Door    W = Window
B = Bed     T = Table    S = Storage    K = Workstation

MATERIALS: wood, stone, brick, metal, glass, granite, marble, crystal, coral, living_wood, fungus, ice, obsidian

CRITICAL RULES:
1. MUST have at least ONE door (D) on exterior wall
2. Doors between walls: #D# or on edge
3. All floors (.) reachable from door
4. Keep simple - rectangular only
5. 4-8 tiles per side

EXAMPLE (VALID):
{
  "id": "simple_cabin",
  "name": "Simple Cabin",
  "description": "A basic wooden shelter",
  "category": "residential",
  "tier": 1,
  "layout": [
    "######",
    "#B..S#",
    "#....D",
    "######"
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

IMPORTANT:
- Return ONLY valid JSON, nothing else
- Door MUST connect to exterior (outside the walls)
- Keep layouts SIMPLE and rectangular
- No explanations before or after JSON`;

interface QwenResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

async function callQwen(prompt: string): Promise<string> {
  console.log('📞 Calling Qwen via Groq API...\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: BUILDING_DESIGNER_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} ${error}`);
  }

  const data = await response.json() as QwenResponse;
  return data.choices[0].message.content;
}

async function testQwenDesign(request: string, index: number): Promise<VoxelBuildingDefinition | null> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}: ${request}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const response = await callQwen(request);

    console.log('📥 Qwen Response:');
    console.log(response);
    console.log('');

    // Extract JSON from response (Qwen might add text/thinking before/after)
    let jsonStr = response.trim();

    // Remove thinking blocks if present
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Try to find JSON block
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    let building: VoxelBuildingDefinition;
    try {
      building = JSON.parse(jsonStr);
      console.log('✅ JSON parsed successfully\n');
    } catch (e: any) {
      console.log('❌ Failed to parse JSON:', e.message);
      console.log('Raw response was:', response);
      return null;
    }

    // Validate building
    const validation = validateBuilding(building);

    console.log('🏗️  Building Visualization:');
    console.log(visualizeBuilding(building));
    console.log('');

    if (validation.isValid) {
      console.log('✅ SUCCESS: Qwen designed a VALID building!');
      console.log(`   - Name: ${building.name}`);
      console.log(`   - Materials: ${building.materials.wall}/${building.materials.floor}`);
      console.log(`   - Size: ${validation.dimensions.width}x${validation.dimensions.height}`);
      console.log(`   - Tiles: ${validation.tileCounts.walls + validation.tileCounts.floors}`);
      return building;
    } else {
      console.log('⚠️  Building has validation issues:');
      const errors = validation.issues.filter(i => i.severity === 'error');
      const warnings = validation.issues.filter(i => i.severity === 'warning');
      console.log(`   Errors: ${errors.length}, Warnings: ${warnings.length}`);

      if (errors.length > 0) {
        console.log('\n   Error details:');
        errors.forEach(e => console.log(`   - ${e.message}`));
      }
      return null;
    }

  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         QWEN LIVE BUILDING DESIGN TEST                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const requests = [
    'Design a 4x4 wooden cottage, tier-1. Include bed. Simple rectangular layout with one door.',

    'Design a 5x5 stone workshop, tier-2. Include workstation and storage. Use granite walls.',

    'Design a 6x5 coral house, tier-2. Include bed and table. Beach cottage style.',
  ];

  const validBuildings: VoxelBuildingDefinition[] = [];

  for (let i = 0; i < requests.length; i++) {
    const building = await testQwenDesign(requests[i], i);
    if (building) {
      validBuildings.push(building);
    }

    // Small delay between requests
    if (i < requests.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next request...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`FINAL RESULTS`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`✅ Valid buildings: ${validBuildings.length}/${requests.length}`);
  console.log(`❌ Failed: ${requests.length - validBuildings.length}\n`);

  if (validBuildings.length > 0) {
    console.log('🎉 SUCCESS! Qwen designed these buildings:\n');
    validBuildings.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.category}, tier ${b.tier})`);
      console.log(`      Materials: ${b.materials.wall}, ${b.materials.floor}`);
    });

    // Save valid buildings
    const outputPath = path.join(__dirname, '..', 'qwen-generated-buildings.json');
    fs.writeFileSync(outputPath, JSON.stringify(validBuildings, null, 2));
    console.log(`\n📁 Saved to: qwen-generated-buildings.json\n`);
  } else {
    console.log('😞 No valid buildings were generated. Try adjusting the prompts.\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
