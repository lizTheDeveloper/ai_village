/**
 * AlienSpeciesImporter - MVEE-side import pipeline for the Folkfork cross-game species exchange.
 *
 * Reads `species_exchange_v1` JSON files from a configured directory and maps them
 * to MVEE's `GeneratedAlienSpecies` interface, producing `ImportedSpecies` records.
 *
 * Design constraints:
 * - Self-contained: does NOT import from the folkfork-bridge package.
 * - Exchange types are declared locally.
 * - `translateSpecies` is a pure function with no I/O, exposed for testing.
 * - Invalid files are skipped with a `console.warn`; no throws on bad data.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedAlienSpecies } from './AlienSpeciesGenerator.js';

// ============================================================================
// Locally-declared exchange types (do NOT import from folkfork-bridge)
// ============================================================================

type ArchetypeSeed =
  | 'social_generalist'
  | 'territorial_predator'
  | 'collector_engineer'
  | 'knowledge_keeper'
  | 'environmental_adapter'
  | 'trickster'
  | 'guardian'
  | 'parasite_symbiont';

type EcologicalRole =
  | 'producer'
  | 'primary_consumer'
  | 'secondary_consumer'
  | 'keystone'
  | 'mutualist'
  | 'parasite'
  | 'decomposer';

interface MinViableGene {
  traitId: string;
  category: string;
  value: number;       // 0–1
  heritability: number; // 0–1
}

interface PersonalityExchange {
  curiosity: [number, number];
  empathy: [number, number];
  aggression: [number, number];
  playfulness: [number, number];
  stubbornness: [number, number];
  creativity: [number, number];
  sociability: [number, number];
  courage: [number, number];
}

interface CultureExchange {
  [key: string]: [number, number];
}

interface IntelligenceExchange {
  cognitiveCapacity: [number, number];
  learningRate: [number, number];
  abstractionAffinity: [number, number];
  memoryDepth: [number, number];
}

type SizeClass = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

type BodyPlanToken =
  | 'bipedal'
  | 'quadruped'
  | 'serpentine'
  | 'avian'
  | 'amorphous'
  | 'insectoid'
  | 'aquatic';

interface SpeciesVisualTokens {
  baseHue: number;        // 0–360
  accentHue: number;      // 0–360
  saturation: number;     // 0–1
  lightness: number;      // 0–1
  sizeClass: SizeClass;
  bodyPlan: string;
  pattern: string | null;
  markingIntensity: number | null;
  notableFeatures: string[] | null;
}

interface LoreExchange {
  epithet: string;
  creationMyth?: string;
  culturalPractices: string[];
  languagePattern?: string;
  folkloreTradition?: string;
}

interface SensitivityFlags {
  livingTradition: boolean;
  sourceAttribution: string;
  sensitivityNotes?: string;
  consultationStatus?: string;
}

interface SpeciesProvenance {
  sourceGame: string;
  sourceGameVersion: string;
  exportedAt: string;
  exporterVersion: string;
  waveUnlocked: number;
  checksum: string;
}

interface SpeciesExchangeV1 {
  formatVersion: '1.0.0' | '0.1.0';
  speciesId: string;
  speciesName: string;
  commonName?: string;
  archetypeSeed: ArchetypeSeed;
  ecologicalRole: EcologicalRole;
  dietType: 'herbivore' | 'carnivore' | 'omnivore';
  homeBiome: string;
  minViableGenes: MinViableGene[];
  personalityRanges: PersonalityExchange;
  cultureRanges: CultureExchange;
  intelligenceRanges: IntelligenceExchange;
  mutationRate?: number;
  compatibleSpecies?: string[];
  visualTokens: SpeciesVisualTokens;
  lore: LoreExchange;
  sensitivity: SensitivityFlags;
  provenance: SpeciesProvenance;
}

// ============================================================================
// Output type
// ============================================================================

export interface ImportedSpecies extends GeneratedAlienSpecies {
  folkloreTradition?: string;
  archetypeSeed?: string;
  precursorsSpeciesId: string;
}

// ============================================================================
// Helper utilities
// ============================================================================

function findGene(genes: MinViableGene[], traitId: string): MinViableGene | undefined {
  return genes.find((g) => g.traitId === traitId);
}

function findGeneByCategory(genes: MinViableGene[], category: string): MinViableGene | undefined {
  return genes.find((g) => g.category === category);
}

function midpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2;
}

function hueToColorName(hue: number): string {
  // Normalize hue into [0, 360)
  const h = ((hue % 360) + 360) % 360;
  if (h >= 330 || h < 30) return 'red';
  if (h < 60) return 'orange';
  if (h < 90) return 'yellow';
  if (h < 150) return 'green';
  if (h < 210) return 'cyan';
  if (h < 270) return 'blue';
  if (h < 310) return 'purple';
  return 'magenta';
}

function applyLightnessSaturation(
  colorName: string,
  lightness: number,
  saturation: number,
): string {
  let result: string;
  if (lightness < 0.4) {
    result = `dark ${colorName}`;
  } else if (lightness > 0.7) {
    result = `pale ${colorName}`;
  } else {
    result = colorName;
  }

  if (saturation < 0.3) {
    result = `muted ${result}`;
  } else if (saturation > 0.8) {
    result = `vivid ${result}`;
  }
  return result;
}

function bodyPlanToForm(bodyPlan: BodyPlanToken): string {
  const forms: Record<BodyPlanToken, string> = {
    bipedal: 'upright two-legged form',
    quadruped: 'four-legged creature',
    serpentine: 'sinuous limbless body',
    avian: 'winged creature',
    amorphous: 'shapeless mass with pseudopods',
    insectoid: 'multi-legged insect-like body',
    aquatic: 'streamlined aquatic form',
  };
  return forms[bodyPlan];
}

// ============================================================================
// Mapping helpers
// ============================================================================

function mapBodyPlan(bodyPlan: string): string {
  const map: Record<string, string> = {
    bipedal: 'standard_bilateral',
    quadruped: 'standard_bilateral',
    serpentine: 'serpentine_undulator',
    avian: 'standard_bilateral',
    amorphous: 'tentacular_mass',
    insectoid: 'modular_segmented',
    aquatic: 'tentacular_mass',
  };
  return map[bodyPlan] ?? 'standard_bilateral';
}

function mapLocomotion(bodyPlan: string): string {
  const map: Record<string, string> = {
    bipedal: 'quadrupedal_running',
    quadruped: 'quadrupedal_running',
    serpentine: 'tentacle_walking',
    avian: 'wing_flight',
    amorphous: 'tentacle_walking',
    insectoid: 'hexapod_scuttling',
    aquatic: 'jet_propulsion',
  };
  return map[bodyPlan] ?? 'quadrupedal_running';
}

function mapSensorySystem(
  genes: MinViableGene[],
  archetypeSeed: ArchetypeSeed,
): string {
  // Check for sensory genes
  const sensoryGenes = genes.filter((g) => g.category === 'sensory');

  for (const gene of sensoryGenes) {
    const id = gene.traitId.toLowerCase();
    if (id.includes('chem') || id.includes('pheromone')) {
      return 'pheromone_tracking';
    }
  }

  for (const gene of sensoryGenes) {
    if (gene.value > 0.7) {
      return 'vibration_detection';
    }
  }

  if (archetypeSeed === 'knowledge_keeper') {
    return 'telepathic_awareness';
  }

  return 'visual_standard';
}

function mapDiet(ecologicalRole: EcologicalRole): string {
  const map: Record<EcologicalRole, string> = {
    producer: 'energy_absorber',
    primary_consumer: 'herbivore_grazer',
    secondary_consumer: 'carnivore_ambush',
    decomposer: 'omnivore_opportunist',
    keystone: 'omnivore_opportunist',
    mutualist: 'omnivore_opportunist',
    parasite: 'parasitic_drainer',
  };
  return map[ecologicalRole];
}

function mapSocialStructure(archetypeSeed: string): string {
  const map: Record<string, string> = {
    social_generalist: 'herd_safety',
    territorial_predator: 'solitary_territorial',
    collector_engineer: 'eusocial_colony',
    knowledge_keeper: 'pack_hierarchy',
    environmental_adapter: 'herd_safety',
    trickster: 'solitary_territorial',
    guardian: 'pack_hierarchy',
    parasite_symbiont: 'symbiotic_partnership',
  };
  return map[archetypeSeed] ?? 'pack_hierarchy';
}

function mapDefense(
  archetypeSeed: ArchetypeSeed,
  genes: MinViableGene[],
): string {
  // Find aggression gene
  const aggressionGene = findGene(genes, 'aggression') ?? findGeneByCategory(genes, 'aggression');
  const aggression = aggressionGene?.value ?? 0.5;

  if (archetypeSeed === 'territorial_predator' && aggression > 0.6) {
    return 'sonic_scream';
  }
  if (archetypeSeed === 'parasite_symbiont') {
    return 'camouflage_active';
  }
  if (aggression < 0.2) {
    return 'size_inflation';
  }
  return 'armored_plating';
}

function mapReproduction(
  archetypeSeed: ArchetypeSeed,
  intelligenceRanges: IntelligenceExchange,
): string {
  if (archetypeSeed === 'collector_engineer') {
    return 'hive_queen';
  }
  const socialStructure = mapSocialStructure(archetypeSeed);
  if (socialStructure === 'eusocial_colony') {
    return 'hive_queen';
  }
  const cogMid = midpoint(intelligenceRanges.cognitiveCapacity);
  if (cogMid > 0.7) {
    return 'live_birth_mammals';
  }
  return 'egg_laying_abundant';
}

function mapIntelligence(intelligenceRanges: IntelligenceExchange): string {
  const cogMid = midpoint(intelligenceRanges.cognitiveCapacity);
  if (cogMid < 0.3) return 'instinctual_only';
  if (cogMid < 0.5) return 'basic_learning';
  if (cogMid < 0.65) return 'problem_solver';
  if (cogMid < 0.8) return 'proto_sapient';
  return 'fully_sapient';
}

function mapDangerLevel(
  genes: MinViableGene[],
  personalityRanges: PersonalityExchange,
  sizeClass: SizeClass,
): 'harmless' | 'minor' | 'moderate' | 'severe' | 'extinction_level' {
  const sizeMultipliers: Record<SizeClass, number> = {
    tiny: 0.5,
    small: 0.7,
    medium: 1.0,
    large: 1.3,
    huge: 1.5,
  };

  // Prefer an explicit aggression gene, fall back to personality range midpoint
  const aggressionGene = findGene(genes, 'aggression') ?? findGeneByCategory(genes, 'aggression');
  const aggression = aggressionGene?.value ?? midpoint(personalityRanges.aggression);

  const dangerScore = aggression * sizeMultipliers[sizeClass];

  if (dangerScore < 0.2) return 'harmless';
  if (dangerScore < 0.4) return 'minor';
  if (dangerScore < 0.6) return 'moderate';
  if (dangerScore < 0.8) return 'severe';
  return 'extinction_level';
}

function mapDomesticationPotential(
  personalityRanges: PersonalityExchange,
  intelligenceRanges: IntelligenceExchange,
): 'none' | 'poor' | 'moderate' | 'good' | 'excellent' {
  const courageMid = midpoint(personalityRanges.courage);
  const sociabilityMid = midpoint(personalityRanges.sociability);
  const cogMid = midpoint(intelligenceRanges.cognitiveCapacity);

  const score = (1 - courageMid) * 0.3 + sociabilityMid * 0.4 + cogMid * 0.3;

  if (score < 0.2) return 'none';
  if (score < 0.4) return 'poor';
  if (score < 0.6) return 'moderate';
  if (score < 0.8) return 'good';
  return 'excellent';
}

function buildScientificName(speciesId: string): string {
  // e.g. "ven_thari" → "Ven folkforkii"
  const firstPart = speciesId.split('_')[0] ?? speciesId;
  const capitalized = firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase();
  return `${capitalized} folkforkii`;
}

function buildDescription(lore: LoreExchange): string {
  const myth = lore.creationMyth
    ? ` ${lore.creationMyth.slice(0, 200)}${lore.creationMyth.length > 200 ? '...' : ''}`
    : '';
  return `${lore.epithet}.${myth} Arrived via Folkfork from Precursors.`;
}

function buildSpritePrompt(visualTokens: SpeciesVisualTokens): string {
  const { baseHue, accentHue, saturation, lightness, sizeClass, bodyPlan, pattern, notableFeatures } =
    visualTokens;

  const baseColorName = hueToColorName(baseHue);
  const accentColorName = hueToColorName(accentHue);

  const primaryColor = applyLightnessSaturation(baseColorName, lightness, saturation);

  const bodyForm = bodyPlanToForm(bodyPlan as BodyPlanToken) ?? 'alien creature';

  const patternStr = pattern ? `${pattern} pattern` : 'plain';
  const featuresStr = Array.isArray(notableFeatures) ? notableFeatures.join(', ') : (notableFeatures ?? '');

  return (
    `Pixel art alien creature: ${bodyForm}, ${primaryColor} coloration with ${accentColorName} accents, ` +
    `${patternStr}, ${featuresStr}. ${sizeClass} sized. ` +
    `Top-down view, 48px, medium detail, distinct body parts clearly defined.`
  );
}

function buildBiologyNotes(
  genes: MinViableGene[],
  diet: string,
  ecologicalRole: EcologicalRole,
): string {
  const geneSummary =
    genes.length > 0
      ? `Key traits: ${genes
          .slice(0, 5)
          .map((g) => `${g.traitId}(${g.value.toFixed(2)})`)
          .join(', ')}${genes.length > 5 ? ` +${genes.length - 5} more` : ''}.`
      : 'No gene data available.';
  return `${geneSummary} Diet pattern: ${diet.replace(/_/g, ' ')}. Ecological role: ${ecologicalRole.replace(/_/g, ' ')}.`;
}

function buildBehaviorNotes(
  personalityRanges: PersonalityExchange,
  socialStructure: string,
): string {
  const traits = Object.entries(personalityRanges)
    .map(([key, range]) => `${key}: ${midpoint(range as [number, number]).toFixed(2)}`)
    .join(', ');
  return `Personality profile (midpoints) — ${traits}. Social structure: ${socialStructure.replace(/_/g, ' ')}.`;
}

function buildCulturalNotes(lore: LoreExchange): string {
  const practices = Array.isArray(lore.culturalPractices)
    ? lore.culturalPractices.join(', ')
    : String(lore.culturalPractices);
  return `Cultural practices: ${practices}`;
}

// ============================================================================
// Validation
// ============================================================================

function isValidExchange(data: unknown): data is SpeciesExchangeV1 {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (d['formatVersion'] !== '1.0.0' && d['formatVersion'] !== '0.1.0') return false;
  if (typeof d['speciesId'] !== 'string' || !d['speciesId']) return false;
  if (typeof d['speciesName'] !== 'string' || !d['speciesName']) return false;
  if (!Array.isArray(d['minViableGenes'])) return false;
  if (typeof d['visualTokens'] !== 'object' || d['visualTokens'] === null) return false;
  if (typeof d['provenance'] !== 'object' || d['provenance'] === null) return false;

  return true;
}

// ============================================================================
// Main class
// ============================================================================

export class AlienSpeciesImporter {
  private readonly folkforkDir: string;

  constructor(folkforkDir: string) {
    this.folkforkDir = folkforkDir;
  }

  /**
   * Count how many .json files are present in the configured directory.
   */
  async countAvailableSpecies(): Promise<number> {
    let entries: string[];
    try {
      entries = await readdir(this.folkforkDir);
    } catch {
      return 0;
    }
    return entries.filter((e) => e.endsWith('.json')).length;
  }

  /**
   * Load all valid species from the configured directory.
   * Files that fail validation or JSON parsing are skipped with a warning.
   */
  async loadImportedSpecies(): Promise<ImportedSpecies[]> {
    let entries: string[];
    try {
      entries = await readdir(this.folkforkDir);
    } catch {
      return [];
    }
    const jsonFiles = entries.filter((e) => e.endsWith('.json'));

    const results: ImportedSpecies[] = [];

    for (const filename of jsonFiles) {
      const filePath = join(this.folkforkDir, filename);

      let raw: string;
      try {
        raw = await readFile(filePath, 'utf-8');
      } catch (err) {
        console.warn(`[AlienSpeciesImporter] Could not read file ${filename}:`, err);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn(`[AlienSpeciesImporter] Invalid JSON in ${filename}:`, err);
        continue;
      }

      if (!isValidExchange(parsed)) {
        console.warn(
          `[AlienSpeciesImporter] Validation failed for ${filename}: missing required fields or unsupported formatVersion.`,
        );
        continue;
      }

      try {
        const imported = this.translateSpecies(parsed);
        results.push(imported);
      } catch (err) {
        console.warn(`[AlienSpeciesImporter] Translation failed for ${filename}:`, err);
      }
    }

    return results;
  }

  /**
   * Pure translation function: maps a validated SpeciesExchangeV1 to ImportedSpecies.
   * No I/O. Exposed for testing.
   */
  translateSpecies(exchange: SpeciesExchangeV1): ImportedSpecies {
    const {
      speciesId,
      speciesName,
      archetypeSeed,
      ecologicalRole,
      minViableGenes,
      personalityRanges,
      intelligenceRanges,
      visualTokens,
      lore,
      provenance,
      homeBiome,
    } = exchange;

    const bodyPlanMvee = mapBodyPlan(visualTokens.bodyPlan);
    const locomotion = mapLocomotion(visualTokens.bodyPlan);
    const sensorySystem = mapSensorySystem(minViableGenes, archetypeSeed);
    const diet = mapDiet(ecologicalRole);
    const socialStructure = mapSocialStructure(archetypeSeed);
    const defense = mapDefense(archetypeSeed, minViableGenes);
    const reproduction = mapReproduction(archetypeSeed, intelligenceRanges);
    const intelligence = mapIntelligence(intelligenceRanges);
    const dangerLevel = mapDangerLevel(minViableGenes, personalityRanges, visualTokens.sizeClass);
    const domesticationPotential = mapDomesticationPotential(personalityRanges, intelligenceRanges);

    const scientificName = buildScientificName(speciesId);
    const description = buildDescription(lore);
    const spritePrompt = buildSpritePrompt(visualTokens);
    const biologyNotes = buildBiologyNotes(minViableGenes, diet, ecologicalRole);
    const behaviorNotes = buildBehaviorNotes(personalityRanges, socialStructure);

    const isSapient = intelligence === 'proto_sapient' || intelligence === 'fully_sapient';
    const culturalNotes = isSapient ? buildCulturalNotes(lore) : undefined;

    const imported: ImportedSpecies = {
      // AlienCreatureSpecies fields
      id: `folkfork_${speciesId}`,
      name: speciesName,
      scientificName,
      description,
      bodyPlan: bodyPlanMvee,
      locomotion,
      sensorySystem,
      diet,
      socialStructure,
      defense,
      reproduction,
      intelligence,
      discovered: `Folkfork Pipeline, Wave ${provenance.waveUnlocked}`,
      nativeWorld: homeBiome,
      domesticationPotential,
      dangerLevel,
      // GeneratedAlienSpecies fields
      spritePrompt,
      biologyNotes,
      behaviorNotes,
      culturalNotes,
      // ImportedSpecies fields
      folkloreTradition: lore.folkloreTradition,
      archetypeSeed,
      precursorsSpeciesId: speciesId,
    };

    return imported;
  }
}
