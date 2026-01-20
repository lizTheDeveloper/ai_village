/**
 * Standalone Species Building Generator
 *
 * Generates complete building sets for elven, centaur, angelic, and high fae species
 */

import { convertToGameFormat } from './src/import-to-game';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are an expert fantasy architect. Return ONLY valid JSON, no explanations.

EXAMPLE:
{
  "id": "simple_hut",
  "name": "Simple Hut",
  "description": "A basic shelter",
  "category": "residential",
  "tier": 1,
  "layout": ["#####", "#B.S#", "#...D", "#####"],
  "materials": {"wall": "wood", "floor": "wood", "door": "wood"},
  "functionality": [{"type": "sleeping", "params": {"beds": 1}}],
  "capacity": 2
}

RULES: Door (D) on exterior edge. All floors (.) connect to door. Rectangular only. 4-7 tiles per side.
SYMBOLS: # = Wall, . = Floor, D = Door, W = Window, B = Bed, T = Table, S = Storage, K = Workstation`;

const SPECIES_PROMPTS: Record<string, string> = {
  elven: `ELVEN ARCHITECTURE:
- Philosophy: Harmony with nature, organic forms
- Materials: living_wood, crystal, moonlight, vines
- Features: Curved walls, living trees, natural lighting
- Dimensions: Tall, graceful`,

  centaur: `CENTAUR ARCHITECTURE:
- Philosophy: Open spaces for movement, ramps not stairs
- Materials: stone, wood, thatch, clay
- Features: Wide doorways, high ceilings, open plans
- Dimensions: Wide, spacious, single-story`,

  angelic: `ANGELIC ARCHITECTURE:
- Philosophy: Verticality, divine light, sacred geometry
- Materials: marble, gold, crystal, starlight
- Features: Vertical design, radial symmetry, light
- Dimensions: Soaring vertical spaces`,

  high_fae_10d: `HIGH FAE (10D) ARCHITECTURE:
- Philosophy: Non-euclidean, reality bending
- Materials: frozen_time, crystallized_dreams, starlight
- Features: Impossible geometry, dimensional folding
- Dimensions: Non-euclidean, transcends 3D`
};

const BUILDING_TYPES: Record<string, string[]> = {
  elven: ['moonlit treehouse', 'crystal meditation bower', 'living wood library', 'enchanted forge', 'starlight sanctuary'],
  centaur: ['stable dwelling', 'clan meeting hall', 'open smithy', 'training shelter', 'war council chamber'],
  angelic: ['prayer spire', 'choir tower', 'divine workshop', 'celestial archives', 'meditation sanctum'],
  high_fae_10d: ['folded manor', 'impossible tower', 'tesseract court', 'between-space workshop', 'dream archive']
};

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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 4000
    })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json() as any;
  return data.choices[0].message.content;
}

async function generateBuilding(species: string, buildingType: string, tier: number): Promise<any | null> {
  const prompt = `${SPECIES_PROMPTS[species]}

Design a tier-${tier} ${buildingType}.
Size: 5-7 tiles per side.
Return ONLY JSON matching example format.`;

  try {
    const response = await callQwen(prompt);
    let jsonStr = response.trim().replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const building = JSON.parse(jsonStr);
    building.species = species;
    return building;
  } catch (error) {
    console.error(`Failed: ${error}`);
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    SPECIES BUILDING GENERATION                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allBuildings: Record<string, any[]> = {};

  for (const species of ['elven', 'centaur', 'angelic', 'high_fae_10d']) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`GENERATING ${species.toUpperCase().replace('_', ' ')} BUILDINGS`);
    console.log(`${'='.repeat(80)}\n`);

    const buildings: any[] = [];
    const types = BUILDING_TYPES[species] || [];

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const tier = i < 2 ? 1 : i < 4 ? 2 : 3;

      console.log(`   [${i + 1}/${types.length}] ${type}...`);

      const building = await generateBuilding(species, type, tier);
      if (building) {
        buildings.push(building);
        console.log(`   ✅ ${building.name}`);
      } else {
        console.log(`   ❌ Failed`);
      }

      if (i < types.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    allBuildings[species] = buildings;
    console.log(`\n✅ Generated ${buildings.length}/${types.length} ${species} buildings`);
  }

  // Save results
  const outputPath = path.join(__dirname, 'all-species-buildings.json');
  fs.writeFileSync(outputPath, JSON.stringify(allBuildings, null, 2));

  // Convert to game format
  const gameFormat: Record<string, any[]> = {};
  for (const [species, buildings] of Object.entries(allBuildings)) {
    gameFormat[species] = buildings.map((b: any) => convertToGameFormat(b));
  }

  const gameFormatPath = path.join(__dirname, 'all-species-buildings-game-format.json');
  fs.writeFileSync(gameFormatPath, JSON.stringify(gameFormat, null, 2));

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('GENERATION COMPLETE');
  console.log(`${'='.repeat(80)}\n`);

  let total = 0;
  for (const [species, buildings] of Object.entries(allBuildings)) {
    console.log(`📦 ${species.padEnd(15)}: ${buildings.length} buildings`);
    total += buildings.length;
  }

  console.log(`\n🎉 Total: ${total} species-specific buildings!\n`);
  console.log('📁 Files:');
  console.log('   - all-species-buildings.json');
  console.log('   - all-species-buildings-game-format.json\n');
}

if (require.main === module) {
  main().catch(console.error);
}
