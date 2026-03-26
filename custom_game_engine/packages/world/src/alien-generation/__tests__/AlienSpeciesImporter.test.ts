// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AlienSpeciesImporter, type ImportedSpecies } from '../AlienSpeciesImporter.js';

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

// Test factory — intentionally loosely typed so tests can pass invalid data for validation testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeValidExchange(overrides?: Record<string, any>): any {
  return {
    formatVersion: '1.0.0' as const,
    speciesId: 'ven_thari',
    speciesName: "Ven'thari",
    commonName: 'Wind Reader',
    archetypeSeed: 'territorial_predator' as const,
    ecologicalRole: 'secondary_consumer' as const,
    dietType: 'carnivore' as const,
    homeBiome: 'tundra_steppe',
    minViableGenes: [
      { traitId: 'size', category: 'morphological' as const, value: 0.75, heritability: 0.8 },
      { traitId: 'aggression', category: 'behavioral' as const, value: 0.7, heritability: 0.6 },
      { traitId: 'intelligence', category: 'cognitive' as const, value: 0.6, heritability: 0.7 },
      { traitId: 'sociability', category: 'social' as const, value: 0.4, heritability: 0.5 },
      { traitId: 'echolocation', category: 'sensory' as const, value: 0.8, heritability: 0.9 },
    ],
    personalityRanges: {
      curiosity: [0.3, 0.6],
      empathy: [0.1, 0.3],
      aggression: [0.5, 0.8],
      playfulness: [0.2, 0.5],
      stubbornness: [0.4, 0.7],
      creativity: [0.3, 0.5],
      sociability: [0.3, 0.5],
      courage: [0.6, 0.9],
    },
    cultureRanges: {
      learningRate: [0.3, 0.6],
      teachingDrive: [0.2, 0.4],
      traditionAffinity: [0.5, 0.8],
      innovationRate: [0.2, 0.4],
    },
    intelligenceRanges: {
      cognitiveCapacity: [0.5, 0.7],
      learningRate: [0.4, 0.6],
      abstractionAffinity: [0.3, 0.5],
      memoryDepth: [0.4, 0.7],
    },
    mutationRate: 0.015,
    compatibleSpecies: [],
    visualTokens: {
      baseHue: 200,
      accentHue: 30,
      saturation: 0.7,
      lightness: 0.5,
      sizeClass: 'large' as const,
      bodyPlan: 'quadruped' as const,
      pattern: 'banded',
      markingIntensity: 0.6,
      notableFeatures: ['wind-sensing antlers', 'frost-resistant fur'],
    },
    lore: {
      epithet: 'Wind Readers of the Frozen Steppe',
      creationMyth: 'Born from the first winter storm, shaped by the howling winds.',
      culturalPractices: ['wind-reading rituals', 'pack hunts at dusk'],
      folkloreTradition: 'Algonquian/Windigo',
      crossGameAnchors: [
        { game: 'mvee' as const, surface: 'wind-reader packs', keywords: ['wind', 'hunt'] },
      ],
    },
    sensitivity: {
      livingTradition: false,
      sourceAttribution: 'Algonquian, Ojibwe, Cree traditions',
    },
    provenance: {
      sourceGame: 'precursors' as const,
      sourceGameVersion: '0.1.0',
      exportedAt: '2026-03-20T12:00:00Z',
      exporterVersion: '1.0.0',
      waveUnlocked: 3,
      populationAtExport: 127,
      generationsObserved: 42,
      checksum: 'abc123def456',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: write a JSON file into a temp directory
// ---------------------------------------------------------------------------

async function writeExchange(dir: string, filename: string, data: unknown): Promise<void> {
  await writeFile(join(dir, filename), JSON.stringify(data), 'utf-8');
}

// ---------------------------------------------------------------------------
// translateSpecies (pure function tests)
// ---------------------------------------------------------------------------

describe('translateSpecies', () => {
  it('maps bodyPlan correctly for quadruped exchange body plan type', () => {
    const exchange = makeValidExchange();
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('standard_bilateral');
  });

  it('maps bodyPlan for bipedal exchange body plan type', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'bipedal' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('standard_bilateral');
  });

  it('maps bodyPlan for serpentine exchange body plan type', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'serpentine' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('serpentine_undulator');
  });

  it('maps bodyPlan for amorphous exchange body plan type', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'amorphous' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('tentacular_mass');
  });

  it('maps bodyPlan for insectoid exchange body plan type', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'insectoid' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('modular_segmented');
  });

  it('falls back to standard_bilateral for unknown body plan', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'hexadecapod_nightmare' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.bodyPlan).toBe('standard_bilateral');
  });

  it('maps locomotion to quadrupedal_running for quadruped body plan', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.locomotion).toBe('quadrupedal_running');
  });

  it('maps locomotion to tentacle_walking for serpentine body plan', () => {
    const exchange = makeValidExchange({
      visualTokens: { ...makeValidExchange().visualTokens, bodyPlan: 'serpentine' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.locomotion).toBe('tentacle_walking');
  });

  it('maps diet from ecologicalRole secondary_consumer to carnivore_ambush', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.diet).toBe('carnivore_ambush');
  });

  it('maps diet from ecologicalRole primary_consumer to herbivore_grazer', () => {
    const exchange = makeValidExchange({ ecologicalRole: 'primary_consumer', dietType: 'herbivore' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.diet).toBe('herbivore_grazer');
  });

  it('maps diet from ecologicalRole decomposer to omnivore_opportunist', () => {
    const exchange = makeValidExchange({ ecologicalRole: 'decomposer', dietType: 'omnivore' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.diet).toBe('omnivore_opportunist');
  });

  it('maps socialStructure to solitary_territorial for territorial_predator archetype', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.socialStructure).toBe('solitary_territorial');
  });

  it('maps socialStructure to pack_hierarchy for guardian archetype', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'guardian' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.socialStructure).toBe('pack_hierarchy');
  });

  it('maps socialStructure to herd_safety for social_generalist archetype', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'social_generalist' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.socialStructure).toBe('herd_safety');
  });

  it('maps socialStructure to eusocial_colony for collector_engineer archetype', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'collector_engineer' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.socialStructure).toBe('eusocial_colony');
  });

  it('maps socialStructure to symbiotic_partnership for parasite_symbiont archetype', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'parasite_symbiont' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.socialStructure).toBe('symbiotic_partnership');
  });

  it('maps intelligence from cognitiveCapacity midpoint 0.6 to problem_solver', () => {
    // cognitiveCapacity [0.5, 0.7] midpoint = 0.6, which is in [0.5, 0.65) → problem_solver
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.intelligence).toBe('problem_solver');
  });

  it('maps intelligence to instinctual_only when cognitiveCapacity midpoint is very low', () => {
    const exchange = makeValidExchange({
      intelligenceRanges: {
        cognitiveCapacity: [0.0, 0.15],
        learningRate: [0.0, 0.1],
        abstractionAffinity: [0.0, 0.1],
        memoryDepth: [0.0, 0.1],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.intelligence).toBe('instinctual_only');
  });

  it('maps intelligence to fully_sapient when cognitiveCapacity midpoint is high', () => {
    const exchange = makeValidExchange({
      intelligenceRanges: {
        cognitiveCapacity: [0.85, 1.0],
        learningRate: [0.8, 1.0],
        abstractionAffinity: [0.8, 1.0],
        memoryDepth: [0.8, 1.0],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.intelligence).toBe('fully_sapient');
  });

  it('maps sensorySystem - detects sensory gene with high value as vibration_detection', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    // exchange has echolocation gene at 0.8 (> 0.7) → vibration_detection
    expect(result.sensorySystem).toBe('vibration_detection');
  });

  it('maps sensorySystem - detects chemical/pheromone sensory gene', () => {
    const exchange = makeValidExchange({
      minViableGenes: [
        { traitId: 'size', category: 'morphological', value: 0.5, heritability: 0.6 },
        { traitId: 'pheromone_sensing', category: 'sensory', value: 0.9, heritability: 0.8 },
      ],
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.sensorySystem).toBe('pheromone_tracking');
  });

  it('maps sensorySystem - defaults to visual_standard when no prominent sensory gene', () => {
    const exchange = makeValidExchange({
      minViableGenes: [
        { traitId: 'size', category: 'morphological', value: 0.5, heritability: 0.6 },
        { traitId: 'strength', category: 'morphological', value: 0.6, heritability: 0.7 },
      ],
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.sensorySystem).toBe('visual_standard');
  });

  it('maps sensorySystem - knowledge_keeper archetype gets telepathic_awareness', () => {
    const exchange = makeValidExchange({
      archetypeSeed: 'knowledge_keeper',
      minViableGenes: [
        { traitId: 'size', category: 'morphological', value: 0.5, heritability: 0.6 },
      ],
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.sensorySystem).toBe('telepathic_awareness');
  });

  it('maps defense for territorial_predator with high aggression to sonic_scream', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    // territorial_predator with aggression 0.7 (> 0.6) → sonic_scream
    expect(result.defense).toBe('sonic_scream');
  });

  it('maps defense for parasite_symbiont archetype to camouflage_active', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'parasite_symbiont' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.defense).toBe('camouflage_active');
  });

  it('maps defense for low aggression species to size_inflation', () => {
    const exchange = makeValidExchange({
      archetypeSeed: 'environmental_adapter',
      minViableGenes: [
        { traitId: 'aggression', category: 'behavioral', value: 0.1, heritability: 0.5 },
      ],
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.defense).toBe('size_inflation');
  });

  it('maps dangerLevel from aggression gene and large size', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    // aggression gene 0.7 * large multiplier 1.3 = 0.91 → extinction_level
    expect(result.dangerLevel).toBe('extinction_level');
  });

  it('maps dangerLevel to harmless for non-aggressive, tiny species', () => {
    const exchange = makeValidExchange({
      archetypeSeed: 'environmental_adapter',
      personalityRanges: {
        ...makeValidExchange().personalityRanges,
        aggression: [0.0, 0.05],
      },
      minViableGenes: [
        { traitId: 'size', category: 'morphological', value: 0.05, heritability: 0.5 },
      ],
      visualTokens: { ...makeValidExchange().visualTokens, sizeClass: 'tiny' },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(['harmless', 'minor']).toContain(result.dangerLevel);
  });

  it('maps domesticationPotential from courage, sociability, intelligence', () => {
    // courage [0.6, 0.9] mid=0.75, sociability [0.3, 0.5] mid=0.4, cogCap [0.5, 0.7] mid=0.6
    // score = (1-0.75)*0.3 + 0.4*0.4 + 0.6*0.3 = 0.075 + 0.16 + 0.18 = 0.415
    // → moderate (0.4-0.6)
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.domesticationPotential).toBe('moderate');
  });

  it('maps domesticationPotential: high sociability + high intelligence = good', () => {
    const exchange = makeValidExchange({
      personalityRanges: {
        ...makeValidExchange().personalityRanges,
        courage: [0.1, 0.3], // low courage → high (1-courage) contribution
        sociability: [0.7, 0.9],
      },
      intelligenceRanges: {
        cognitiveCapacity: [0.7, 0.9],
        learningRate: [0.5, 0.7],
        abstractionAffinity: [0.4, 0.6],
        memoryDepth: [0.5, 0.7],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    // (1-0.2)*0.3 + 0.8*0.4 + 0.8*0.3 = 0.24 + 0.32 + 0.24 = 0.8 → excellent
    expect(['good', 'excellent']).toContain(result.domesticationPotential);
  });

  it('maps reproduction for collector_engineer archetype to hive_queen', () => {
    const exchange = makeValidExchange({ archetypeSeed: 'collector_engineer' });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.reproduction).toBe('hive_queen');
  });

  it('maps reproduction for high-intelligence species to live_birth_mammals', () => {
    const exchange = makeValidExchange({
      intelligenceRanges: {
        cognitiveCapacity: [0.85, 1.0],
        learningRate: [0.8, 1.0],
        abstractionAffinity: [0.8, 1.0],
        memoryDepth: [0.8, 1.0],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.reproduction).toBe('live_birth_mammals');
  });

  it('generates spritePrompt from visualTokens', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.spritePrompt).toBeTruthy();
    expect(result.spritePrompt).toContain('four-legged creature');
    expect(result.spritePrompt).toContain('cyan'); // baseHue 200 → cyan (hue < 210)
    expect(result.spritePrompt).toContain('orange'); // accentHue 30 → orange
    expect(result.spritePrompt).toContain('48px');
  });

  it('generates scientificName from speciesId', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.scientificName).toBe('Ven folkforkii');
  });

  it('preserves folkloreTradition from lore', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.folkloreTradition).toBe('Algonquian/Windigo');
  });

  it('preserves archetypeSeed on result', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.archetypeSeed).toBe('territorial_predator');
  });

  it('preserves precursorsSpeciesId (speciesId from exchange)', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.precursorsSpeciesId).toBe('ven_thari');
  });

  it('sets id with folkfork_ prefix', () => {
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(makeValidExchange());
    expect(result.id).toBe('folkfork_ven_thari');
  });

  it('includes culturalNotes for proto_sapient+ species', () => {
    // Need cognitiveCapacity midpoint >= 0.65 for proto_sapient
    const exchange = makeValidExchange({
      intelligenceRanges: {
        cognitiveCapacity: [0.65, 0.8],
        learningRate: [0.5, 0.7],
        abstractionAffinity: [0.4, 0.6],
        memoryDepth: [0.5, 0.7],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.intelligence).toBe('proto_sapient');
    expect(result.culturalNotes).toBeTruthy();
    expect(result.culturalNotes).toContain('wind-reading rituals');
  });

  it('omits culturalNotes for low-intelligence species', () => {
    const exchange = makeValidExchange({
      intelligenceRanges: {
        cognitiveCapacity: [0.0, 0.1],
        learningRate: [0.0, 0.1],
        abstractionAffinity: [0.0, 0.1],
        memoryDepth: [0.0, 0.1],
      },
    });
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);
    expect(result.culturalNotes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// File I/O tests
// ---------------------------------------------------------------------------

describe('loadImportedSpecies', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `alien-importer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('loads valid species from directory', async () => {
    await writeExchange(tempDir, 'ven_thari.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(1);
    expect(species[0]).toBeDefined();
    expect(species[0]!.id).toMatch(/^folkfork_/);
  });

  it('returns empty array for empty directory', async () => {
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('returns empty array for non-existent directory', async () => {
    const importer = new AlienSpeciesImporter(join(tmpdir(), 'does-not-exist-alien-importer'));
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips malformed JSON files', async () => {
    await writeFile(join(tempDir, 'broken.json'), '{ not valid json ]]]', 'utf-8');
    await writeExchange(tempDir, 'valid.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(1);
  });

  it('skips files with wrong formatVersion', async () => {
    await writeExchange(tempDir, 'old_format.json', makeValidExchange({ formatVersion: '0.9.0' }));
    await writeExchange(tempDir, 'new_format.json', makeValidExchange({ formatVersion: '2.0.0' }));
    await writeExchange(tempDir, 'good.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(1);
  });

  it('skips files missing required fields (speciesId)', async () => {
    const noId = makeValidExchange() as Record<string, unknown>;
    delete noId['speciesId'];
    await writeExchange(tempDir, 'missing_id.json', noId);
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips files missing required fields (speciesName)', async () => {
    const noName = makeValidExchange() as Record<string, unknown>;
    delete noName['speciesName'];
    await writeExchange(tempDir, 'missing_name.json', noName);
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips files missing required fields (minViableGenes)', async () => {
    const noGenes = makeValidExchange() as Record<string, unknown>;
    delete noGenes['minViableGenes'];
    await writeExchange(tempDir, 'no_genes.json', noGenes);
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips files missing required fields (visualTokens)', async () => {
    const noVisual = makeValidExchange() as Record<string, unknown>;
    delete noVisual['visualTokens'];
    await writeExchange(tempDir, 'no_visual.json', noVisual);
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips files missing required fields (provenance)', async () => {
    const noProv = makeValidExchange() as Record<string, unknown>;
    delete noProv['provenance'];
    await writeExchange(tempDir, 'no_provenance.json', noProv);
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toEqual([]);
  });

  it('skips non-.json files in the directory', async () => {
    await writeFile(join(tempDir, 'readme.txt'), 'Not a species file', 'utf-8');
    await writeFile(join(tempDir, 'species.yaml'), 'speciesId: ven_thari', 'utf-8');
    await writeExchange(tempDir, 'valid.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(1);
  });

  it('loads multiple species files', async () => {
    await writeExchange(tempDir, 'ven_thari.json', makeValidExchange());
    await writeExchange(
      tempDir,
      'second_species.json',
      makeValidExchange({ speciesId: 'kral_mok', speciesName: 'Kral-Mok' }),
    );
    await writeExchange(
      tempDir,
      'third_species.json',
      makeValidExchange({ speciesId: 'sun_chaser', speciesName: 'Sun Chaser' }),
    );
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(3);
    const ids = species.map((s) => s.precursorsSpeciesId).sort();
    expect(ids).toEqual(['kral_mok', 'sun_chaser', 'ven_thari']);
  });

  it('accepts v0.1.0 format version for backwards compatibility', async () => {
    await writeExchange(tempDir, 'legacy.json', makeValidExchange({ formatVersion: '0.1.0' }));
    const importer = new AlienSpeciesImporter(tempDir);
    const species = await importer.loadImportedSpecies();
    expect(species).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// countAvailableSpecies
// ---------------------------------------------------------------------------

describe('countAvailableSpecies', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `alien-count-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('counts JSON files in directory', async () => {
    await writeExchange(tempDir, 'one.json', makeValidExchange());
    await writeExchange(tempDir, 'two.json', makeValidExchange({ speciesId: 'other' }));
    const importer = new AlienSpeciesImporter(tempDir);
    const count = await importer.countAvailableSpecies();
    expect(count).toBe(2);
  });

  it('returns 0 for empty directory', async () => {
    const importer = new AlienSpeciesImporter(tempDir);
    const count = await importer.countAvailableSpecies();
    expect(count).toBe(0);
  });

  it('returns 0 for non-existent directory', async () => {
    const importer = new AlienSpeciesImporter(join(tmpdir(), 'no-such-dir-count-test'));
    const count = await importer.countAvailableSpecies();
    expect(count).toBe(0);
  });

  it('does not count non-JSON files', async () => {
    await writeFile(join(tempDir, 'notes.txt'), 'hello', 'utf-8');
    await writeFile(join(tempDir, 'data.csv'), 'a,b,c', 'utf-8');
    await writeExchange(tempDir, 'real.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const count = await importer.countAvailableSpecies();
    expect(count).toBe(1);
  });

  it('counts all JSON files including malformed ones', async () => {
    await writeFile(join(tempDir, 'broken.json'), '{ bad json', 'utf-8');
    await writeExchange(tempDir, 'valid.json', makeValidExchange());
    const importer = new AlienSpeciesImporter(tempDir);
    const count = await importer.countAvailableSpecies();
    expect(count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: Precursors export → MVEE import
// ---------------------------------------------------------------------------

describe('round-trip: Precursors export → MVEE import', () => {
  it('produces valid MVEE species from Precursors export format', () => {
    const exchange = makeValidExchange();
    const importer = new AlienSpeciesImporter('/irrelevant');
    const result = importer.translateSpecies(exchange);

    // All required AlienCreatureSpecies fields are present and non-empty strings
    const stringFields = [
      'id', 'name', 'scientificName', 'description',
      'bodyPlan', 'locomotion', 'sensorySystem', 'diet',
      'socialStructure', 'defense', 'reproduction', 'intelligence',
      'discovered', 'nativeWorld',
    ] as const;

    for (const field of stringFields) {
      expect(result[field]).toBeTruthy();
      expect(typeof result[field]).toBe('string');
    }

    // Enum fields have valid values
    expect(['none', 'poor', 'moderate', 'good', 'excellent']).toContain(result.domesticationPotential);
    expect(['harmless', 'minor', 'moderate', 'severe', 'extinction_level']).toContain(result.dangerLevel);

    // GeneratedAlienSpecies fields
    expect(result.spritePrompt).toBeTruthy();
    expect(result.biologyNotes).toBeTruthy();
    expect(result.behaviorNotes).toBeTruthy();

    // ImportedSpecies fields
    expect(result.precursorsSpeciesId).toBe('ven_thari');
    expect(result.archetypeSeed).toBe('territorial_predator');
    expect(result.folkloreTradition).toBe('Algonquian/Windigo');
  });

  it('all archetype seeds produce valid species', () => {
    const archetypes = [
      'social_generalist', 'territorial_predator', 'collector_engineer',
      'knowledge_keeper', 'environmental_adapter', 'trickster',
      'guardian', 'parasite_symbiont',
    ] as const;

    const importer = new AlienSpeciesImporter('/irrelevant');

    for (const archetype of archetypes) {
      const exchange = makeValidExchange({ archetypeSeed: archetype });
      const result = importer.translateSpecies(exchange);

      // All string fields should be non-empty
      expect(result.id).toBeTruthy();
      expect(result.bodyPlan).toBeTruthy();
      expect(result.locomotion).toBeTruthy();
      expect(result.diet).toBeTruthy();
      expect(result.socialStructure).toBeTruthy();
      expect(result.defense).toBeTruthy();
      expect(result.reproduction).toBeTruthy();
      expect(result.intelligence).toBeTruthy();
    }
  });

  it('all ecological roles produce valid diet mappings', () => {
    const roles = [
      'producer', 'primary_consumer', 'secondary_consumer',
      'keystone', 'mutualist', 'parasite', 'decomposer',
    ] as const;

    const importer = new AlienSpeciesImporter('/irrelevant');

    for (const role of roles) {
      const exchange = makeValidExchange({ ecologicalRole: role });
      const result = importer.translateSpecies(exchange);
      expect(result.diet).toBeTruthy();
      expect(typeof result.diet).toBe('string');
    }
  });
});
