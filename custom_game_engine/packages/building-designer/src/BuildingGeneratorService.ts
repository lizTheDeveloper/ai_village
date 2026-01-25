/**
 * Building Generator Service
 *
 * Generates species-specific and alien buildings using LLM
 * Integrates with alien world generation pipeline
 */

// Note: LLM integration temporarily disabled - needs proper provider setup
// import type { LLMProvider } from '@ai-village/llm';

export interface GeneratedBuilding {
  id: string;
  name: string;
  description: string;
  category: 'residential' | 'production' | 'religious' | 'commercial' | 'military' | 'academic' | 'cultural';
  tier: number;
  layout: string[];
  materials: {
    wall: string;
    floor: string;
    door: string;
    window?: string;
  };
  functionality: Array<{
    type: string;
    params: Record<string, any>;
  }>;
  capacity: number;
  species?: string;
  culturalSignificance?: string;
}

export interface SpeciesArchitecturalStyle {
  species: string;
  philosophy: string;
  materials: string[];
  characteristics: string[];
  dimensions: string;
  examples: string;
}

const ARCHITECTURAL_STYLES: Record<string, SpeciesArchitecturalStyle> = {
  elven: {
    species: 'Elven',
    philosophy: 'Harmony with nature, flowing organic forms, integration with living plants',
    materials: ['living_wood', 'crystal', 'moonlight', 'vines', 'enchanted_wood', 'silver', 'glass'],
    characteristics: [
      'Curved walls and organic shapes',
      'Living trees incorporated into structure',
      'Natural lighting through crystals',
      'Minimal environmental impact',
      'Elegant and timeless design'
    ],
    dimensions: 'Tall, graceful structures with high ceilings',
    examples: 'Treehouses, crystal pavilions, moonlit gardens'
  },

  centaur: {
    species: 'Centaur',
    philosophy: 'Open spaces for movement, low doorways, ramps instead of stairs',
    materials: ['stone', 'wood', 'thatch', 'clay', 'bronze', 'leather'],
    characteristics: [
      'Wide doorways (no normal doors needed)',
      'Ramps for vertical access',
      'High ceilings for rearing up',
      'Open floor plans for mobility',
      'Sturdy construction for heavy inhabitants'
    ],
    dimensions: 'Wide and spacious, low structures (single story preferred)',
    examples: 'Meeting halls, smithies, stables, training grounds'
  },

  angelic: {
    species: 'Angelic',
    philosophy: 'Verticality, divine light, ethereal beauty, sacred geometry',
    materials: ['marble', 'gold', 'crystal', 'starlight', 'glass', 'platinum', 'cloud'],
    characteristics: [
      'Vertical architecture reaching skyward',
      'Sacred geometric patterns',
      'Abundant natural and divine light',
      'Floating or elevated structures',
      'Radial symmetry'
    ],
    dimensions: 'Soaring vertical spaces, multiple levels connected by flight',
    examples: 'Spires, temples, meditation towers, choir halls'
  },

  high_fae_10d: {
    species: 'High Fae (Tenth Dimensional)',
    philosophy: 'Non-euclidean geometry, reality bending, impossible architecture',
    materials: ['frozen_time', 'dimensional_fabric', 'crystallized_dreams', 'starlight', 'moonlight', 'void_matter'],
    characteristics: [
      'Rooms larger inside than outside',
      'Doorways to multiple locations simultaneously',
      'Walls that shift between dimensions',
      'Gravity-defying structures',
      'Tesseract-like spatial folding'
    ],
    dimensions: 'Variable and non-euclidean, transcends normal 3D space',
    examples: 'Impossible towers, folded palaces, between-space courts'
  }
};

export class BuildingGeneratorService {
  // private llm: LLMProvider; // TODO: Re-enable when LLM integration is set up

  constructor() {
    // this.llm = ...; // TODO: Initialize LLM provider
  }

  /**
   * Generate a building for a specific species and function
   */
  async generateBuilding(
    species: keyof typeof ARCHITECTURAL_STYLES,
    buildingType: string,
    tier: number = 2,
    options: {
      size?: 'small' | 'medium' | 'large';
      specialFeatures?: string[];
    } = {}
  ): Promise<GeneratedBuilding | null> {
    const style = ARCHITECTURAL_STYLES[species];
    if (!style) {
      throw new Error(`Unknown species: ${species}`);
    }

    const size = options.size || 'medium';
    const sizeSpec = size === 'small' ? '4-5 tiles' : size === 'medium' ? '5-7 tiles' : '7-9 tiles';

    const prompt = this.buildPrompt(style, buildingType, tier, sizeSpec, options.specialFeatures);

    // TODO: Re-enable LLM integration
    console.error('BuildingGeneratorService: LLM integration not yet implemented');
    return null;

    // try {
    //   const response = await this.llm.chat({
    //     provider: 'groq',
    //     model: 'qwen/qwen3-32b',
    //     messages: [
    //       { role: 'system', content: this.getSystemPrompt() },
    //       { role: 'user', content: prompt }
    //     ],
    //     temperature: 0.7,
    //     max_tokens: 4000
    //   });
    //
    //   return this.parseResponse(response.content, species);
    // } catch (error) {
    //   console.error('Failed to generate building:', error);
    //   return null;
    // }
  }

  /**
   * Generate a complete building set for a species
   */
  async generateSpeciesBuildingSet(
    species: keyof typeof ARCHITECTURAL_STYLES,
    buildingTypes: string[] = [
      'small dwelling',
      'large dwelling',
      'workshop',
      'temple',
      'gathering hall',
      'storage',
      'training facility'
    ]
  ): Promise<GeneratedBuilding[]> {
    const buildings: GeneratedBuilding[] = [];

    console.log(`\n🏗️  Generating ${species} building set...`);

    for (let i = 0; i < buildingTypes.length; i++) {
      const type = buildingTypes[i];
      if (!type) continue;
      const tier = type.includes('small') ? 1 : type.includes('temple') || type.includes('hall') ? 3 : 2;

      console.log(`   [${i + 1}/${buildingTypes.length}] Generating ${type}...`);

      const building = await this.generateBuilding(species, type, tier);

      if (building) {
        buildings.push(building);
        console.log(`   ✅ ${building.name}`);
      } else {
        console.log(`   ❌ Failed to generate ${type}`);
      }

      // Rate limiting
      if (i < buildingTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Generated ${buildings.length}/${buildingTypes.length} ${species} buildings\n`);
    return buildings;
  }

  private getSystemPrompt(): string {
    return `You are an expert fantasy architect designing buildings for different species.

IMPORTANT: Return ONLY valid JSON. No explanations, no thinking blocks.

VALID BUILDING EXAMPLE:
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
  "capacity": 2,
  "culturalSignificance": "Basic dwelling"
}

RULES:
1. Door (D) MUST be on exterior wall edge (right or bottom usually)
2. All floors (.) must connect to door
3. Keep rectangular - simple shapes only
4. Use species-appropriate materials

SYMBOLS:
# = Wall
. = Floor
D = Door
W = Window
B = Bed
T = Table
S = Storage
K = Workstation

Return ONLY the JSON object, nothing else.`;
  }

  private buildPrompt(
    style: SpeciesArchitecturalStyle,
    buildingType: string,
    tier: number,
    sizeSpec: string,
    specialFeatures?: string[]
  ): string {
    return `Design a ${tier === 1 ? 'tier-1' : tier === 2 ? 'tier-2' : 'tier-3'} ${buildingType} for ${style.species}.

SPECIES ARCHITECTURE:
- Philosophy: ${style.philosophy}
- Materials: ${style.materials.slice(0, 5).join(', ')}
- Key Features: ${style.characteristics.slice(0, 3).join('; ')}
- Dimensions: ${style.dimensions}

BUILDING REQUIREMENTS:
- Size: ${sizeSpec} per side (rectangular layout)
- Type: ${buildingType}
- Include appropriate furniture for function
${specialFeatures ? `- Special: ${specialFeatures.join(', ')}` : ''}

Design a building that reflects ${style.species} culture and needs.
Use materials from the species list.
Keep layout simple and rectangular.
Return ONLY JSON matching the example format.`;
  }

  private parseResponse(content: string, species: string): GeneratedBuilding | null {
    try {
      // Remove thinking blocks
      let jsonStr = content.trim().replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Extract JSON
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const building = JSON.parse(jsonStr) as GeneratedBuilding;
      building.species = species;

      return building;
    } catch (error) {
      console.error('Failed to parse building JSON:', error);
      return null;
    }
  }

  /**
   * Validate generated building layout
   */
  validateBuilding(building: GeneratedBuilding): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for door
    const hasDoor = building.layout.some(row => row.includes('D'));
    if (!hasDoor) {
      errors.push('No door found');
    }

    // Check layout is rectangular
    const widths = building.layout.map(row => row.length);
    if (new Set(widths).size > 1) {
      errors.push('Layout is not rectangular');
    }

    // Check materials are specified
    if (!building.materials.wall || !building.materials.floor || !building.materials.door) {
      errors.push('Missing required materials');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const buildingGeneratorService = new BuildingGeneratorService();
