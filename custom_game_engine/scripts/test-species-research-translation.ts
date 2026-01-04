/**
 * Test Script: Species-Specific Research Paper Translation
 *
 * Tests the LLM-based translation of research papers from the canonical human version
 * into species-specific versions for Elves, Orcs, and Fifth-Dimensional Tentacle Monsters.
 *
 * Uses the existing QWEN32B model via OllamaProvider.
 */

import { OllamaProvider } from '../packages/llm/src/OllamaProvider.js';
import type { ResearchPaper } from '../packages/world/src/research-papers/types.js';
import { ORE_IDENTIFICATION } from '../packages/world/src/research-papers/metallurgy-papers.js';

// Species physiology definitions
interface SpeciesPhysiology {
  name: string;
  bodyType: string;
  appendages: { type: string; count: number }[];
  senses: { type: string; count: number }[];
  primaryManipulator: string;
  environment: string;
  culturalTraits: string[];
}

const ELVES: SpeciesPhysiology = {
  name: 'Elves',
  bodyType: 'graceful humanoid',
  appendages: [
    { type: 'hand', count: 2 },
    { type: 'foot', count: 2 }
  ],
  senses: [
    { type: 'eye', count: 2 },
    { type: 'ear', count: 2 }
  ],
  primaryManipulator: 'slender fingers',
  environment: 'ancient forests',
  culturalTraits: ['harmony with nature', 'long-lived wisdom', 'artistic mastery', 'magical attunement']
};

const ORCS: SpeciesPhysiology = {
  name: 'Orcs',
  bodyType: 'muscular humanoid',
  appendages: [
    { type: 'hand', count: 2 },
    { type: 'foot', count: 2 }
  ],
  senses: [
    { type: 'eye', count: 2 },
    { type: 'ear', count: 2 },
    { type: 'tusk', count: 2 }
  ],
  primaryManipulator: 'powerful hands',
  environment: 'harsh wastelands and mountain strongholds',
  culturalTraits: ['brute strength', 'practical efficiency', 'tribal honor', 'forge mastery']
};

const TENTACLE_MONSTERS: SpeciesPhysiology = {
  name: 'Fifth-Dimensional Tentacle Beings',
  bodyType: 'amorphous mass existing partially outside conventional spacetime',
  appendages: [
    { type: 'tentacle', count: 10 },
    { type: 'sensory tendril', count: 47 }
  ],
  senses: [
    { type: 'eye', count: 35 },
    { type: 'dimensional perception organ', count: 5 },
    { type: 'probability sensor', count: 12 }
  ],
  primaryManipulator: 'precision tentacles',
  environment: 'interdimensional void spaces',
  culturalTraits: ['non-linear perception', 'hive-mind coordination', 'mathematical obsession', 'reality manipulation']
};

/**
 * Craft a prompt for translating a research paper to a species-specific version
 */
function createTranslationPrompt(paper: ResearchPaper, species: SpeciesPhysiology): string {
  return `You are a scholarly translator converting a scientific research paper into the perspective of an alien species.

**CANONICAL PAPER** (Standard/Human Version):
Title: "${paper.title}"
Field: ${paper.field}
Abstract: ${paper.abstract || 'N/A'}
Description: ${paper.description}

**TARGET SPECIES PHYSIOLOGY**:
Species Name: ${species.name}
Body Type: ${species.bodyType}
Appendages: ${species.appendages.map(a => `${a.count} ${a.type}${a.count > 1 ? 's' : ''}`).join(', ')}
Senses: ${species.senses.map(s => `${s.count} ${s.type}${s.count > 1 ? 's' : ''}`).join(', ')}
Primary Manipulator: ${species.primaryManipulator}
Environment: ${species.environment}
Cultural Traits: ${species.culturalTraits.join(', ')}

**TRANSLATION TASK**:
Rewrite this research paper from the ${species.name}'s perspective. The content and scientific findings MUST remain the same, but the language, metaphors, and methodology should reflect their unique physiology and culture.

Requirements:
1. **Terminology**: Use vocabulary natural to their physiology (e.g., if they have tentacles, describe manipulations using tentacles)
2. **Sensory References**: Describe observations using their specific senses (e.g., "With our 35 eyes, we simultaneously observed...")
3. **Cultural Voice**: Adopt their cultural perspective (e.g., elves might reference harmony and attunement, orcs focus on strength and practicality)
4. **Methodology**: Explain HOW they would perform the research using their appendages and tools
5. **Humor**: Maintain any humorous footnotes but adapt them to the species' perspective
6. **Academic Tone**: Keep it scholarly and serious (from their perspective) while being alien

Output Format:
{
  "title": "Translated title in species-specific academic style",
  "abstract": "Species-specific abstract (2-3 sentences)",
  "description": "Full translated description with footnotes adapted to species perspective. Maintain footnote markers (*,**,***,†,††,etc.) and include the footnotes at the end.",
  "researcherNotes": "Brief meta-commentary on how this species approaches this field of study (1-2 sentences)"
}

Return ONLY valid JSON. Do not include markdown code blocks or any text outside the JSON.`;
}

/**
 * Translate a research paper for a specific species
 */
async function translatePaper(
  provider: OllamaProvider,
  paper: ResearchPaper,
  species: SpeciesPhysiology
): Promise<any> {
  const prompt = createTranslationPrompt(paper, species);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Translating: "${paper.title}"`);
  console.log(`📚 For species: ${species.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const response = await provider.generate({
      prompt,
      temperature: 0.8, // Higher temperature for creative alien perspectives
      maxTokens: 2000,
    });

    // Parse JSON response
    const translated = JSON.parse(response.text);

    console.log(`✅ Translation complete for ${species.name}\n`);
    return translated;
  } catch (error) {
    console.error(`❌ Translation failed for ${species.name}:`, error);
    throw error;
  }
}

/**
 * Pretty-print a translated paper
 */
function printTranslation(species: SpeciesPhysiology, translation: any): void {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📖 ${species.name.toUpperCase()} VERSION`);
  console.log(`${'═'.repeat(80)}\n`);

  console.log(`Title: ${translation.title}\n`);
  console.log(`Abstract:\n${translation.abstract}\n`);
  console.log(`Description:\n${translation.description}\n`);
  console.log(`Researcher's Notes:\n${translation.researcherNotes}\n`);
  console.log(`${'═'.repeat(80)}\n`);
}

/**
 * Main test function
 */
async function main() {
  console.log('\n🧪 SPECIES-SPECIFIC RESEARCH PAPER TRANSLATION TEST\n');
  console.log('Testing with: "On the Nature of Ores: Which Rocks Are Actually Useful"\n');

  // Initialize LLM provider
  // Using qwen3:8b model on local Ollama
  const provider = new OllamaProvider('qwen3:8b', 'http://localhost:11434');

  console.log('🔌 Connected to Ollama (QWEN3 8B)\n');
  console.log('📋 Testing with 3 species:');
  console.log('   1. Elves (graceful, nature-attuned)');
  console.log('   2. Orcs (brutal, strength-focused)');
  console.log('   3. Fifth-Dimensional Tentacle Monsters (incomprehensible)\n');

  try {
    // Translate for each species
    const elvenTranslation = await translatePaper(provider, ORE_IDENTIFICATION, ELVES);
    printTranslation(ELVES, elvenTranslation);

    const orcishTranslation = await translatePaper(provider, ORE_IDENTIFICATION, ORCS);
    printTranslation(ORCS, orcishTranslation);

    const tentacleTranslation = await translatePaper(provider, ORE_IDENTIFICATION, TENTACLE_MONSTERS);
    printTranslation(TENTACLE_MONSTERS, tentacleTranslation);

    console.log('\n✅ ALL TRANSLATIONS COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   - Original Paper: "${ORE_IDENTIFICATION.title}"`);
    console.log(`   - Species Tested: 3 (Elves, Orcs, Tentacle Monsters)`);
    console.log(`   - Model Used: QWEN3 8B`);
    console.log('\n💡 Each species sees the same metallurgy through their own unique lens!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
