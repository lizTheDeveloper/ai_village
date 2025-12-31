/**
 * Sprite Generation Script
 *
 * Generates all character sprites needed for the game using PixelLab API.
 * Run with: npx ts-node scripts/generate-sprites.ts
 *
 * Requires PIXELLAB_API_KEY environment variable.
 */

// ============================================================================
// Sprite Definition Types
// ============================================================================

interface SpriteVariant {
  id: string;
  species: string;
  gender: 'male' | 'female' | 'nonbinary' | 'neutral';
  hairColor?: string;
  skinTone?: string;
  description: string;
  name: string;
  tags: string[];
}

interface SpriteGenerationConfig {
  size: number;
  directions: 4 | 8;
  view: 'low top-down' | 'high top-down' | 'side';
  detail: 'low detail' | 'medium detail' | 'high detail';
  shading: 'flat shading' | 'basic shading' | 'medium shading' | 'detailed shading';
  outline: 'single color black outline' | 'single color outline' | 'selective outline' | 'lineless';
  animations: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: SpriteGenerationConfig = {
  size: 48,
  directions: 8,
  view: 'high top-down',
  detail: 'medium detail',
  shading: 'basic shading',
  outline: 'single color black outline',
  animations: ['walking-8-frames'],
};

// ============================================================================
// Sprite Variants Definition
// ============================================================================

const HAIR_COLORS = ['black', 'brown', 'blonde', 'red', 'gray'] as const;
const HUMAN_SKIN_TONES = ['light', 'medium', 'tan', 'dark'] as const;
const ELF_SKIN_TONES = ['pale', 'fair', 'golden', 'dusky'] as const;
const DWARF_SKIN_TONES = ['ruddy', 'tan', 'pale', 'weathered'] as const;
const ORC_SKIN_TONES = ['green', 'dark green', 'gray-green'] as const;
const CELESTIAL_SKIN_TONES = ['radiant white', 'golden'] as const;
const DEMON_SKIN_TONES = ['red', 'dark red', 'purple', 'black'] as const;
const THRAKEEN_CHITIN_COLORS = ['brown', 'black', 'red', 'green', 'blue'] as const;
const AQUATIC_SKIN_TONES = ['blue', 'green', 'teal', 'purple'] as const;

type Gender = 'male' | 'female' | 'nonbinary';
const GENDERS: Gender[] = ['male', 'female', 'nonbinary'];

// ============================================================================
// Sprite Generation Functions
// ============================================================================

function generateHumanVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const hair of HAIR_COLORS) {
      for (const skin of HUMAN_SKIN_TONES) {
        const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;
        const hairLength = gender === 'male' ? 'short' : gender === 'female' ? 'long' : 'medium-length';
        const clothing = gender === 'female' ? 'simple dress' : 'simple tunic';

        variants.push({
          id: `human_${gender}_${hair}_${skin}`.replace(/\s+/g, '_'),
          species: 'human',
          gender,
          hairColor: hair,
          skinTone: skin,
          description: `${genderDesc} human with ${hairLength} ${hair} hair, ${skin} skin tone, medieval fantasy villager, ${clothing}`,
          name: `Human ${gender} - ${hair} hair, ${skin} skin`,
          tags: ['human', gender, hair, skin],
        });
      }
    }
  }

  return variants;
}

function generateElfVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const hair of HAIR_COLORS) {
      for (const skin of ELF_SKIN_TONES) {
        const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;
        const hairLength = 'long flowing';
        const clothing = 'elegant elven robes';

        variants.push({
          id: `elf_${gender}_${hair}_${skin}`.replace(/\s+/g, '_'),
          species: 'elf',
          gender,
          hairColor: hair,
          skinTone: skin,
          description: `${genderDesc} elf with ${hairLength} ${hair} hair, ${skin} skin, pointed ears, ${clothing}`,
          name: `Elf ${gender} - ${hair} hair, ${skin} skin`,
          tags: ['elf', gender, hair, skin],
        });
      }
    }
  }

  return variants;
}

function generateDwarfVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const hair of HAIR_COLORS) {
      for (const skin of DWARF_SKIN_TONES) {
        const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;
        const beardDesc = gender === 'male' ? 'thick beard, ' : gender === 'female' ? 'braided hair, ' : '';
        const clothing = 'sturdy mining clothes';

        variants.push({
          id: `dwarf_${gender}_${hair}_${skin}`.replace(/\s+/g, '_'),
          species: 'dwarf',
          gender,
          hairColor: hair,
          skinTone: skin,
          description: `${genderDesc} dwarf with ${hair} hair, ${beardDesc}${skin} skin, stocky build, ${clothing}`,
          name: `Dwarf ${gender} - ${hair} hair, ${skin} skin`,
          tags: ['dwarf', gender, hair, skin],
        });
      }
    }
  }

  return variants;
}

function generateOrcVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const hair of HAIR_COLORS) {
      for (const skin of ORC_SKIN_TONES) {
        const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;
        const clothing = 'tribal warrior clothing';

        variants.push({
          id: `orc_${gender}_${hair}_${skin}`.replace(/\s+/g, '_'),
          species: 'orc',
          gender,
          hairColor: hair,
          skinTone: skin,
          description: `${genderDesc} orc with ${hair} hair, ${skin} skin, tusks, muscular build, ${clothing}`,
          name: `Orc ${gender} - ${hair} hair, ${skin} skin`,
          tags: ['orc', gender, hair, skin],
        });
      }
    }
  }

  return variants;
}

function generateCelestialVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];
  const celestialHair = ['white', 'golden', 'silver'] as const;

  for (const gender of GENDERS) {
    for (const hair of celestialHair) {
      for (const skin of CELESTIAL_SKIN_TONES) {
        const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;

        variants.push({
          id: `celestial_${gender}_${hair}_${skin}`.replace(/\s+/g, '_'),
          species: 'celestial',
          gender,
          hairColor: hair,
          skinTone: skin,
          description: `${genderDesc} angel with ${hair} hair, ${skin} glowing skin, white feathered wings, halo, flowing white robes`,
          name: `Celestial ${gender} - ${hair} hair`,
          tags: ['celestial', 'angel', gender, hair],
        });
      }
    }
  }

  return variants;
}

function generateDemonVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const skin of DEMON_SKIN_TONES) {
      const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;

      variants.push({
        id: `demon_${gender}_${skin}`.replace(/\s+/g, '_'),
        species: 'demon',
        gender,
        skinTone: skin,
        description: `${genderDesc} demon with ${skin} skin, horns, bat-like wings, glowing eyes, dark armor`,
        name: `Demon ${gender} - ${skin} skin`,
        tags: ['demon', gender, skin],
      });
    }
  }

  return variants;
}

function generateThrakeenVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const chitin of THRAKEEN_CHITIN_COLORS) {
    variants.push({
      id: `thrakeen_${chitin}`.replace(/\s+/g, '_'),
      species: 'thrakeen',
      gender: 'neutral',
      skinTone: chitin,
      description: `four-armed insectoid alien with ${chitin} chitinous exoskeleton, compound eyes, antennae, trader robes`,
      name: `Thrakeen - ${chitin} chitin`,
      tags: ['thrakeen', 'insectoid', 'alien', chitin],
    });
  }

  return variants;
}

function generateAquaticVariants(): SpriteVariant[] {
  const variants: SpriteVariant[] = [];

  for (const gender of GENDERS) {
    for (const skin of AQUATIC_SKIN_TONES) {
      const genderDesc = gender === 'nonbinary' ? 'androgynous' : gender;

      variants.push({
        id: `aquatic_${gender}_${skin}`.replace(/\s+/g, '_'),
        species: 'aquatic',
        gender,
        skinTone: skin,
        description: `${genderDesc} merfolk with ${skin} scaled skin, fins, gills, webbed hands, aquatic features`,
        name: `Merfolk ${gender} - ${skin}`,
        tags: ['aquatic', 'merfolk', gender, skin],
      });
    }
  }

  return variants;
}

// ============================================================================
// Generate All Variants
// ============================================================================

export function generateAllSpriteVariants(): SpriteVariant[] {
  return [
    ...generateHumanVariants(),      // 3 × 5 × 4 = 60
    ...generateElfVariants(),        // 3 × 5 × 4 = 60
    ...generateDwarfVariants(),      // 3 × 5 × 4 = 60
    ...generateOrcVariants(),        // 3 × 5 × 3 = 45
    ...generateCelestialVariants(),  // 3 × 3 × 2 = 18
    ...generateDemonVariants(),      // 3 × 4 = 12
    ...generateThrakeenVariants(),   // 5
    ...generateAquaticVariants(),    // 3 × 4 = 12
  ];
}

// ============================================================================
// Summary Statistics
// ============================================================================

export function printSpriteSummary(): void {
  const all = generateAllSpriteVariants();

  const bySpecies = all.reduce((acc, v) => {
    acc[v.species] = (acc[v.species] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n========================================');
  console.log('SPRITE GENERATION SUMMARY');
  console.log('========================================\n');

  console.log('Characters by Species:');
  for (const [species, count] of Object.entries(bySpecies)) {
    console.log(`  ${species.padEnd(12)} ${count}`);
  }

  console.log(`\nTotal Characters: ${all.length}`);
  console.log(`Total Rotations: ${all.length * 8} images`);
  console.log(`Walking Animations: ${all.length} (8 dirs × 8 frames = 64 frames each)`);
  console.log(`Total Animation Frames: ${all.length * 64}`);

  console.log('\n========================================\n');
}

// ============================================================================
// PixelLab API Integration (placeholder for actual API calls)
// ============================================================================

interface GenerationJob {
  variant: SpriteVariant;
  characterId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  animationStatus: 'pending' | 'generating' | 'completed' | 'failed';
}

export class SpriteGenerationQueue {
  private jobs: GenerationJob[] = [];
  private apiKey: string;
  private baseUrl = 'https://api.pixellab.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Queue all sprites for generation
   */
  queueAll(variants: SpriteVariant[]): void {
    this.jobs = variants.map(v => ({
      variant: v,
      status: 'pending',
      animationStatus: 'pending',
    }));
  }

  /**
   * Get pending jobs
   */
  getPendingJobs(): GenerationJob[] {
    return this.jobs.filter(j => j.status === 'pending');
  }

  /**
   * Get job summary
   */
  getSummary(): { pending: number; generating: number; completed: number; failed: number } {
    return {
      pending: this.jobs.filter(j => j.status === 'pending').length,
      generating: this.jobs.filter(j => j.status === 'generating').length,
      completed: this.jobs.filter(j => j.status === 'completed').length,
      failed: this.jobs.filter(j => j.status === 'failed').length,
    };
  }

  /**
   * Export jobs to JSON for tracking
   */
  exportToJson(): string {
    return JSON.stringify(this.jobs, null, 2);
  }

  /**
   * Import jobs from JSON
   */
  importFromJson(json: string): void {
    this.jobs = JSON.parse(json);
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

// Run if executed directly
printSpriteSummary();

// Print first few examples
const variants = generateAllSpriteVariants();
console.log('First 5 sprite definitions:\n');
for (const v of variants.slice(0, 5)) {
  console.log(`ID: ${v.id}`);
  console.log(`Name: ${v.name}`);
  console.log(`Description: ${v.description}`);
  console.log(`Tags: ${v.tags.join(', ')}`);
  console.log('---');
}
