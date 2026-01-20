/**
 * Batch Qwen Building Generation with Improved Prompts
 *
 * Generates multiple unique buildings using few-shot examples
 */

import { validateBuilding } from './validator';
import { VoxelBuildingDefinition } from './types';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found');
  process.exit(1);
}

const IMPROVED_PROMPT = `You are a building designer. Return ONLY valid JSON, nothing else.

EXAMPLE OF VALID BUILDING:
{
  "id": "simple_hut",
  "name": "Simple Hut",
  "description": "A basic shelter",
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

RULES:
1. Door (D) MUST be on exterior wall edge
2. All floors (.) must connect to door
3. Keep rectangular - no complex shapes
4. Size: 4-7 tiles per side

SYMBOLS: # = Wall, . = Floor, D = Door, W = Window, B = Bed, T = Table, S = Storage, K = Workstation

MATERIALS: wood, stone, brick, granite, marble, crystal, coral, ice, fungus, living_wood

Return ONLY JSON matching the example format.`;

async function callQwen(prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: IMPROVED_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

async function generateBuilding(request: string): Promise<VoxelBuildingDefinition | null> {
  try {
    const response = await callQwen(request);

    // Remove thinking blocks
    let jsonStr = response.trim().replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Extract JSON
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const building = JSON.parse(jsonStr);
    const validation = validateBuilding(building);

    if (validation.isValid) {
      console.log(`✅ ${building.name} - VALID`);
      return building;
    } else {
      console.log(`❌ ${building.name} - Invalid (${validation.issues.filter(i => i.severity === 'error').length} errors)`);
      return null;
    }

  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         QWEN BATCH BUILDING GENERATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const requests = [
    'Design a 5x5 mushroom house (tier-2). Use fungus material. Include bed and table.',

    'Design a 6x5 ice lodge (tier-2). Use ice walls. Include bed, table, and storage.',

    'Design a 7x6 crystal workshop (tier-3). Include 2 workstations and storage.',

    'Design a 5x5 living wood treehouse (tier-2). Include bed and storage.',

    'Design a 6x6 marble temple (tier-3). Include table and storage.',
  ];

  const validBuildings: VoxelBuildingDefinition[] = [];

  for (let i = 0; i < requests.length; i++) {
    console.log(`\n[${i + 1}/${requests.length}] ${requests[i]}`);

    const building = await generateBuilding(requests[i]);
    if (building) {
      validBuildings.push(building);
    }

    // Rate limit
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`RESULTS: ${validBuildings.length}/${requests.length} valid buildings`);
  console.log(`${'='.repeat(80)}\n`);

  if (validBuildings.length > 0) {
    const outputPath = path.join(__dirname, '..', 'qwen-batch-buildings.json');
    fs.writeFileSync(outputPath, JSON.stringify(validBuildings, null, 2));
    console.log(`✅ Saved ${validBuildings.length} buildings to qwen-batch-buildings.json\n`);

    validBuildings.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.name} (${b.category}, tier ${b.tier})`);
    });
  } else {
    console.log('❌ No valid buildings generated\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
