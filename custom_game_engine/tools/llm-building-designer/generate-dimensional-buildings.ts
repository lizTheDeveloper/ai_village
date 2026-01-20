/**
 * LLM-Based Dimensional Building Generator
 *
 * Generates higher-dimensional buildings (3D, 4D, 5D, 6D) using LLM prompts.
 * Replaces hard-coded algorithmic generators with AI-driven generation.
 *
 * Dimensions:
 * - 3D: Standard buildings with multiple floors
 * - 4D: W-axis buildings with multiple spatial slices (tesseracts)
 * - 5D: V-axis buildings with phase-shifting layouts (penteracts)
 * - 6D: U-axis buildings with quantum superposition (hexeracts)
 */

import { convertToGameFormat } from './src/import-to-game';
import * as fs from 'fs';
import * as path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found');
  process.exit(1);
}

// =============================================================================
// BASE SYSTEM PROMPT
// =============================================================================

const BASE_SYSTEM_PROMPT = `You are an expert architect specializing in higher-dimensional buildings.

You design buildings that exist in 3D, 4D, 5D, and 6D space. Return ONLY valid JSON.

DIMENSIONAL FEATURES:

3D BUILDINGS:
- Standard multi-floor buildings
- floors: Array of floor layouts (ground floor, 2nd floor, etc.)

4D BUILDINGS (W-axis):
- Building exists across multiple W-axis slices
- dimensional.w_axis.sliceLayouts: Array of layouts for each W-slice
- Slices are navigable (like scrolling through parallel 3D spaces)
- Example: Tesseract has outer cube (slice 0) and inner cube (slice 1)

5D BUILDINGS (V-axis):
- Building cycles through multiple phase configurations
- dimensional.v_axis.phaseLayouts: Array of layouts that morph/transition
- Each phase is a different configuration of the same space
- Example: Walls shift, doors appear/disappear between phases

6D BUILDINGS (U-axis):
- Building exists in quantum superposition of states
- dimensional.u_axis.stateLayouts: Array of possible configurations
- dimensional.u_axis.stateWeights: Probability of each state
- Multiple layouts exist simultaneously until observed

LAYOUT RULES:
- Rectangular grids only
- Size: 5-25 tiles per side (larger for higher dimensions)
- Symbols: # (wall), . (floor), D (door), W (window), S (stairs), > (stairs up), < (stairs down), + (pillar)
- All floors must connect to entrance/exit
- Higher dimensional buildings should be larger and more complex

MATERIALS:
Standard: wood, stone, brick, marble, metal, glass
Exotic: crystal, starlight, void, dreams, time, frozen_time, crystallized_dreams, force_field, plasma

Return JSON format:
{
  "id": "building_id",
  "name": "Building Name",
  "description": "Description of the building and its dimensional properties",
  "category": "residential|spiritual|research|production|governance",
  "tier": 1-5,
  "layout": ["#####", "#...D", "#####"],  // Main floor
  "floors": [  // For 3D multi-floor buildings
    {"level": 1, "name": "Second Floor", "layout": ["#####", "#...#", "#####"]}
  ],
  "materials": {
    "wall": "material_name",
    "floor": "material_name",
    "door": "material_name"
  },
  "functionality": [{"type": "sleeping|research|storage|spiritual", "params": {}}],
  "capacity": 2-20,
  "dimensional": {  // ONLY for 4D/5D/6D buildings
    "dimension": 4|5|6,
    "w_axis": {  // For 4D
      "layers": 2-4,
      "sliceLayouts": [["###", "#.#", "###"], ["###", "#.#", "###"]]
    },
    "v_axis": {  // For 5D
      "phases": 2-6,
      "phaseLayouts": [["###", "#.#", "###"], ["###", "D.#", "###"]],
      "transitionRate": 0.1-0.5
    },
    "u_axis": {  // For 6D
      "probabilityStates": 2-4,
      "stateWeights": [0.5, 0.3, 0.2],
      "stateLayouts": [["###", "#.#", "###"], ["###", "#.#", "###"]]
    }
  }
}`;

// =============================================================================
// DIMENSIONAL PROMPTS
// =============================================================================

interface RealmPocketConfig {
  exteriorSize: {width: number; height: number};
  interiorSize: {width: number; height: number};
  sizeFactor: number;  // How much bigger inside (2 = 2x, 10 = 10x, 9999 = infinite)
  timeRatio: number;   // Time flow: 0.1 = 10x slower inside, 10 = 10x faster
  description: string;
}

interface DimensionalSpec {
  dimension: 3 | 4 | 5 | 6;
  buildingType: string;
  species?: string;
  size: 'small' | 'medium' | 'large';
  tier: number;
  materials?: string[];
  characteristics?: string[];
  realmPocket?: RealmPocketConfig;  // NEW: Bigger on inside
}

function getDimensionalPrompt(spec: DimensionalSpec): string {
  const { dimension, buildingType, species, size, tier, materials, characteristics } = spec;

  const sizeMap = { small: '7-11', medium: '11-17', large: '17-25' };
  const gridSize = sizeMap[size];

  let prompt = `Design a ${tier}-tier ${buildingType}.\n`;

  if (species) {
    prompt += `Species: ${species}\n`;
  }

  prompt += `Dimension: ${dimension}D\n`;
  prompt += `Size: ${gridSize} tiles per side\n\n`;

  if (dimension === 3) {
    prompt += `3D REQUIREMENTS:
- Create 1-3 floors using the "floors" array
- Ground floor must have entrance (D on edge)
- Upper floors connected via stairs (> / <)
- Each floor layout should be rectangular grid
`;
  } else if (dimension === 4) {
    prompt += `4D W-AXIS REQUIREMENTS:
- Create 2-4 W-axis slices in dimensional.w_axis.sliceLayouts
- Each slice is a different 3D cross-section
- Slices should be related but distinct (like nested cubes)
- Example: Outer cube (slice 0) contains inner cube (slice 1)
- Add stairs/portals to navigate between slices
`;
  } else if (dimension === 5) {
    prompt += `5D V-AXIS REQUIREMENTS:
- Create 3-6 phase layouts in dimensional.v_axis.phaseLayouts
- Each phase is a morphed configuration of the same space
- Walls shift, doors appear/disappear between phases
- Phases should cycle smoothly (rotation, expansion, transformation)
- Set transitionRate: 0.1 (slow) to 0.5 (fast)
`;
  } else if (dimension === 6) {
    prompt += `6D U-AXIS REQUIREMENTS:
- Create 2-4 quantum states in dimensional.u_axis.stateLayouts
- Each state is a possible configuration
- Provide probability weights (must sum to ~1.0)
- States can be drastically different (quantum superposition)
- Example: State 1 (0.6): Meditation hall, State 2 (0.4): War room
`;
  }

  if (spec.realmPocket) {
    const rp = spec.realmPocket;
    prompt += `\nREALM POCKET (BIGGER ON INSIDE):
- Exterior: ${rp.exteriorSize.width}×${rp.exteriorSize.height} tiles (small, unassuming)
- Interior: ${rp.interiorSize.width}×${rp.interiorSize.height} tiles (${rp.sizeFactor}x bigger!)
- ${rp.description}
- Time flow: ${rp.timeRatio}x (${rp.timeRatio < 1 ? 'slower inside' : rp.timeRatio > 1 ? 'faster inside' : 'normal'})
- Create BOTH an exterior layout (small) AND interior layout (large)
- Add "realmPocket" field to JSON with this config
`;
  }

  if (materials && materials.length > 0) {
    prompt += `\nPreferred materials: ${materials.join(', ')}\n`;
  }

  if (characteristics && characteristics.length > 0) {
    prompt += `\nArchitectural characteristics:\n`;
    characteristics.forEach(c => prompt += `- ${c}\n`);
  }

  prompt += `\nReturn ONLY valid JSON matching the format.`;

  return prompt;
}

// =============================================================================
// LLM CALL
// =============================================================================

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
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

// =============================================================================
// BUILDING GENERATOR
// =============================================================================

async function generateDimensionalBuilding(spec: DimensionalSpec): Promise<any | null> {
  const prompt = getDimensionalPrompt(spec);

  try {
    const response = await callQwen(prompt);

    // Clean response
    let jsonStr = response.trim()
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const building = JSON.parse(jsonStr);

    // Add metadata
    building.species = spec.species || 'universal';
    building.generatedDimension = spec.dimension;

    return building;
  } catch (error: any) {
    console.error(`   Failed: ${error.message}`);
    return null;
  }
}

// =============================================================================
// SPECIES-SPECIFIC DIMENSIONAL SPECS
// =============================================================================

const SPECIES_DIMENSIONAL_SPECS: Record<string, DimensionalSpec[]> = {
  elven: [
    {
      dimension: 3,
      buildingType: 'Living Wood Treehouse',
      species: 'elven',
      size: 'medium',
      tier: 2,
      materials: ['living_wood', 'crystal', 'vines'],
      characteristics: [
        'Organic curved walls',
        'Natural lighting through crystal windows',
        'Multiple floors connected by spiral growth',
        'Integrated with living trees'
      ]
    },
    {
      dimension: 3,
      buildingType: 'Crystal Meditation Bower',
      species: 'elven',
      size: 'small',
      tier: 2,
      materials: ['crystal', 'living_wood', 'starlight'],
      characteristics: [
        'Transparent crystal walls',
        'Sacred geometry patterns',
        'Elevated meditation platforms',
        'Natural light amplification'
      ]
    }
  ],

  centaur: [
    {
      dimension: 3,
      buildingType: 'Clan Meeting Hall',
      species: 'centaur',
      size: 'large',
      tier: 2,
      materials: ['stone', 'wood', 'thatch'],
      characteristics: [
        'Wide open floor plan (15+ tiles wide)',
        'High ceilings (for rearing)',
        'No internal walls (quadrupedal movement)',
        'Wide entrance (4+ tiles)',
        'Ramps instead of stairs'
      ]
    },
    {
      dimension: 3,
      buildingType: 'Training Grounds Shelter',
      species: 'centaur',
      size: 'large',
      tier: 2,
      materials: ['wood', 'stone', 'clay'],
      characteristics: [
        'Completely open interior',
        'Perimeter columns/pillars only',
        'Wide entrance on multiple sides',
        'High roof for aerial movement drills',
        'Minimal obstructions'
      ]
    }
  ],

  angelic: [
    {
      dimension: 3,
      buildingType: 'Prayer Spire',
      species: 'angelic',
      size: 'medium',
      tier: 3,
      materials: ['marble', 'gold', 'crystal', 'starlight'],
      characteristics: [
        'Vertical tower with 3+ floors',
        'Sacred geometry (radial symmetry)',
        'Light-conducting materials',
        'Narrow footprint, tall structure',
        'Divine light from above'
      ]
    },
    {
      dimension: 4,
      buildingType: 'Celestial Archives',
      species: 'angelic',
      size: 'large',
      tier: 4,
      materials: ['crystal', 'starlight', 'void', 'marble'],
      characteristics: [
        '4D structure with W-axis library stacks',
        'Knowledge stored across dimensional slices',
        'Radiant geometric patterns',
        'Infinite shelf space in finite footprint',
        'Light-based navigation between slices'
      ]
    }
  ],

  high_fae_10d: [
    {
      dimension: 3,
      buildingType: 'Pocket Manor',
      species: 'high_fae_10d',
      size: 'small',
      tier: 4,
      materials: ['void', 'crystallized_dreams', 'frozen_time'],
      characteristics: [
        'Tiny exterior hut',
        'Vast mansion interior',
        'Impossible spatial compression',
        'Multiple rooms inside',
        'Time moves slower inside (training/study)'
      ],
      realmPocket: {
        exteriorSize: {width: 5, height: 5},
        interiorSize: {width: 21, height: 21},
        sizeFactor: 16,  // 16x bigger inside!
        timeRatio: 0.1,  // 10x slower = more time for activities
        description: 'Tiny 5×5 hut exterior contains vast 21×21 mansion interior'
      }
    },
    {
      dimension: 4,
      buildingType: 'Folded Manor',
      species: 'high_fae_10d',
      size: 'medium',
      tier: 4,
      materials: ['frozen_time', 'crystallized_dreams', 'void', 'starlight'],
      characteristics: [
        'Non-euclidean W-axis folding',
        'Rooms larger inside than outside',
        'Impossible staircases between slices',
        'Reality-bending architecture',
        'Corridors that loop impossibly'
      ]
    },
    {
      dimension: 5,
      buildingType: 'Chronodream Spire',
      species: 'high_fae_10d',
      size: 'large',
      tier: 5,
      materials: ['time', 'dreams', 'crystallized_dreams', 'void'],
      characteristics: [
        '5D phase-shifting tower',
        'Morphs between past/present/future configurations',
        'Walls appear and vanish with phase transitions',
        'Rooms rearrange based on observer',
        'Dreamlike fluid geometry'
      ]
    },
    {
      dimension: 6,
      buildingType: 'Tesseract Court',
      species: 'high_fae_10d',
      size: 'large',
      tier: 5,
      materials: ['void', 'crystallized_dreams', 'force_field', 'plasma'],
      characteristics: [
        '6D quantum superposition palace',
        'Multiple throne rooms exist simultaneously',
        'Observing collapses probability states',
        'Impossible geometry across all states',
        'Non-euclidean connections between states'
      ]
    }
  ]
};

// =============================================================================
// EXOTIC BUILDING TEMPLATES (replacing hard-coded generators)
// =============================================================================

const EXOTIC_TEMPLATES: DimensionalSpec[] = [
  // 4D Tesseracts
  {
    dimension: 4,
    buildingType: 'Tesseract Research Lab',
    size: 'medium',
    tier: 5,
    materials: ['glass', 'crystal', 'metal', 'force_field'],
    characteristics: [
      'Cube within cube W-axis structure',
      'Outer cube (slice 0) contains inner cube (slice 1)',
      'Dimensional portals between slices',
      'Impossible overlapping spaces',
      'Research equipment across dimensions'
    ]
  },
  {
    dimension: 4,
    buildingType: 'Hypercube Vault',
    size: 'medium',
    tier: 5,
    materials: ['void', 'force_field', 'crystal'],
    characteristics: [
      '4D security vault',
      'Access points hidden in W-axis slices',
      'Impossible to reach without 4D navigation',
      'Treasure room in inner dimensional fold'
    ]
  },

  // 5D Penteracts
  {
    dimension: 5,
    buildingType: 'Phase-Shifting Temple',
    size: 'large',
    tier: 5,
    materials: ['starlight', 'crystal', 'time', 'marble'],
    characteristics: [
      '5D rotating temple with 4-6 phase states',
      'Each phase reveals different sanctum',
      'Altar shifts position between phases',
      'Worshippers from different phases never meet',
      'Smooth transitions between configurations'
    ]
  },
  {
    dimension: 5,
    buildingType: 'Morphing Fortress',
    size: 'large',
    tier: 5,
    materials: ['stone', 'metal', 'plasma', 'force_field'],
    characteristics: [
      '5D defensive structure',
      'Walls materialize in different phases',
      'Entrance exists only in certain phases',
      'Garrison troops across phase-locked rooms',
      'Attackers trapped between phases'
    ]
  },

  // 6D Hexeracts
  {
    dimension: 6,
    buildingType: 'Quantum Observatory',
    size: 'large',
    tier: 5,
    materials: ['void', 'crystal', 'starlight', 'data'],
    characteristics: [
      '6D quantum superposition structure',
      '3-4 probability states with different observatories',
      'Each state observes different dimensional plane',
      'Observation collapses state temporarily',
      'Astronomers work in parallel states'
    ]
  },
  {
    dimension: 6,
    buildingType: 'Superposition Palace',
    size: 'large',
    tier: 5,
    materials: ['crystallized_dreams', 'void', 'time', 'plasma'],
    characteristics: [
      '6D royal palace in quantum flux',
      'Throne room, war room, garden exist simultaneously',
      'State collapses based on ruler\'s intent',
      'Multiple timelines/decisions coexist',
      'Probability weights shift with use'
    ]
  },

  // Realm Pocket (Bigger on Inside)
  {
    dimension: 3,
    buildingType: 'Infinite Library',
    size: 'small',
    tier: 5,
    materials: ['pages', 'starlight', 'void', 'time'],
    characteristics: [
      'Small phone booth exterior',
      'Infinite library interior',
      'Books from every timeline',
      'Time frozen inside for eternal study',
      'Impossible Escher-like staircases'
    ],
    realmPocket: {
      exteriorSize: {width: 3, height: 3},
      interiorSize: {width: 99, height: 99},  // Effectively infinite
      sizeFactor: 9999,  // "Infinite" interior
      timeRatio: 0.01,  // 100x slower = one day outside = 100 days inside
      description: 'Tiny 3×3 phone booth contains infinite 99×99 library with frozen time'
    }
  }
];

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║    DIMENSIONAL BUILDING GENERATION (LLM-Powered)               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allBuildings: Record<string, any[]> = {
    elven: [],
    centaur: [],
    angelic: [],
    high_fae_10d: [],
    exotic: []
  };

  // Generate species-specific buildings
  for (const [species, specs] of Object.entries(SPECIES_DIMENSIONAL_SPECS)) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`GENERATING ${species.toUpperCase().replace('_', ' ')} DIMENSIONAL BUILDINGS`);
    console.log(`${'='.repeat(80)}\n`);

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      console.log(`   [${i + 1}/${specs.length}] ${spec.buildingType} (${spec.dimension}D)...`);

      const building = await generateDimensionalBuilding(spec);
      if (building) {
        allBuildings[species].push(building);
        console.log(`   ✅ ${building.name} (${spec.dimension}D)`);
      } else {
        console.log(`   ❌ Failed`);
      }

      if (i < specs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Generated ${allBuildings[species].length}/${specs.length} ${species} buildings`);
  }

  // Generate exotic templates
  console.log(`\n${'='.repeat(80)}`);
  console.log(`GENERATING EXOTIC DIMENSIONAL BUILDINGS`);
  console.log(`${'='.repeat(80)}\n`);

  for (let i = 0; i < EXOTIC_TEMPLATES.length; i++) {
    const spec = EXOTIC_TEMPLATES[i];
    console.log(`   [${i + 1}/${EXOTIC_TEMPLATES.length}] ${spec.buildingType} (${spec.dimension}D)...`);

    const building = await generateDimensionalBuilding(spec);
    if (building) {
      allBuildings.exotic.push(building);
      console.log(`   ✅ ${building.name} (${spec.dimension}D)`);
    } else {
      console.log(`   ❌ Failed`);
    }

    if (i < EXOTIC_TEMPLATES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n✅ Generated ${allBuildings.exotic.length}/${EXOTIC_TEMPLATES.length} exotic buildings`);

  // Save results
  const outputPath = path.join(__dirname, 'dimensional-buildings.json');
  fs.writeFileSync(outputPath, JSON.stringify(allBuildings, null, 2));

  // Convert to game format
  const gameFormat: Record<string, any[]> = {};
  for (const [category, buildings] of Object.entries(allBuildings)) {
    gameFormat[category] = buildings.map((b: any) => convertToGameFormat(b));
  }

  const gameFormatPath = path.join(__dirname, 'dimensional-buildings-game-format.json');
  fs.writeFileSync(gameFormatPath, JSON.stringify(gameFormat, null, 2));

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('GENERATION COMPLETE');
  console.log(`${'='.repeat(80)}\n`);

  let total = 0;
  for (const [category, buildings] of Object.entries(allBuildings)) {
    const dimBreakdown = buildings.reduce((acc: any, b: any) => {
      const dim = b.generatedDimension || 3;
      acc[dim] = (acc[dim] || 0) + 1;
      return acc;
    }, {});

    const breakdown = Object.entries(dimBreakdown)
      .map(([dim, count]) => `${count}×${dim}D`)
      .join(', ');

    console.log(`📦 ${category.padEnd(15)}: ${buildings.length} buildings (${breakdown})`);
    total += buildings.length;
  }

  console.log(`\n🎉 Total: ${total} dimensional buildings!\n`);
  console.log('📁 Files:');
  console.log('   - dimensional-buildings.json');
  console.log('   - dimensional-buildings-game-format.json\n');
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateDimensionalBuilding, getDimensionalPrompt };
