/**
 * BiosphereGenerator - Creates complete alien biospheres for planets
 *
 * Orchestrates niche identification, species generation, food web construction,
 * and sprite generation for procedural alien ecosystems.
 */

import type { PlanetConfig } from '../planet/PlanetTypes.js';
import type { AlienGenerationConstraints, GeneratedAlienSpecies } from '../alien-generation/AlienSpeciesGenerator.js';
import { AlienSpeciesGenerator } from '../alien-generation/AlienSpeciesGenerator.js';
import { EcologicalNicheIdentifier } from './EcologicalNicheIdentifier.js';
import type {
  BiosphereData,
  EcologicalNiche,
  FoodWeb,
  SizeClass,
} from './BiosphereTypes.js';
import type { LLMProvider } from '@ai-village/core';
// Art styles available (from deterministic-sprite-generator)
type ArtStyle = 'nes' | 'snes' | 'ps1' | 'gba' | 'gameboy' | 'neogeo' |
  'genesis' | 'mastersystem' | 'turbografx' | 'n64' | 'dreamcast' | 'saturn' |
  'c64' | 'amiga' | 'atarist' | 'zxspectrum' | 'cga' | 'ega' | 'vga' | 'msx' | 'pc98' |
  'atari2600' | 'atari7800' | 'wonderswan' | 'ngpc' | 'virtualboy' | '3do' |
  'celeste' | 'undertale' | 'stardew' | 'terraria';

export type ProgressCallback = (message: string) => void;

export interface BiosphereGeneratorOptions {
  /** Max total species to generate. Limits LLM calls to 2*maxSpecies. Default: unlimited. */
  maxSpecies?: number;
  /** Override art style selection. If not provided, art style is selected deterministically from planet seed. */
  artStyle?: ArtStyle;
}

export class BiosphereGenerator {
  private nicheIdentifier: EcologicalNicheIdentifier;
  private alienGenerator: AlienSpeciesGenerator;
  private planet: PlanetConfig;
  private progressCallback?: ProgressCallback;
  private maxSpecies: number;
  private configuredArtStyle?: ArtStyle;

  constructor(llmProvider: LLMProvider, planet: PlanetConfig, progressCallback?: ProgressCallback, options?: BiosphereGeneratorOptions) {
    this.nicheIdentifier = new EcologicalNicheIdentifier();
    this.alienGenerator = new AlienSpeciesGenerator(llmProvider);
    this.planet = planet;
    this.progressCallback = progressCallback;
    this.maxSpecies = options?.maxSpecies ?? Infinity;
    this.configuredArtStyle = options?.artStyle;
  }

  private reportProgress(message: string): void {
    console.log(`[BiosphereGenerator] ${message}`);
    if (this.progressCallback) {
      this.progressCallback(message);
    }
  }

  /**
   * Generate complete biosphere for the planet
   */
  async generateBiosphere(): Promise<BiosphereData> {
    const startTime = Date.now();

    this.reportProgress(`🌍 Creating world of ${this.planet.name}...`);

    // Phase 1: Identify ecological niches
    this.reportProgress('🌱 Ecological niches emerging...');
    const niches = this.nicheIdentifier.identifyNiches(this.planet);
    this.reportProgress(`✨ ${niches.length} unique habitats discovered`);

    // Phase 2: Generate species for each niche (respecting maxSpecies cap)
    this.reportProgress('🧬 Evolving creatures...');
    const species: GeneratedAlienSpecies[] = [];

    // Prioritize niches: producers first, then herbivores, then carnivores, then others
    const nichePriority: Record<string, number> = { producer: 0, herbivore: 1, omnivore: 2, carnivore: 3, decomposer: 4, parasite: 5 };
    const sortedNiches = [...niches].sort((a, b) => (nichePriority[a.category] ?? 99) - (nichePriority[b.category] ?? 99));

    for (const niche of sortedNiches) {
      if (species.length >= this.maxSpecies) {
        this.reportProgress(`🛑 Species cap reached (${this.maxSpecies}), stopping generation`);
        break;
      }
      const remaining = this.maxSpecies - species.length;
      const nicheSpecies = await this.generateSpeciesForNiche(niche, remaining);
      species.push(...nicheSpecies);
    }

    this.reportProgress(`🦋 ${species.length} species evolved`);

    // Phase 3: Build food web
    this.reportProgress('🍽️ Establishing food chains...');
    const foodWeb = this.buildFoodWeb(species, niches);

    // Phase 4: Map niches to species
    const nicheFilling = this.mapNichesToSpecies(niches, species);

    // Phase 5: Identify sapient species
    const sapientSpecies = species.filter(s =>
      s.intelligence === 'fully_sapient' ||
      s.intelligence === 'proto_sapient' ||
      s.intelligence === 'hive_intelligence'
    );

    this.reportProgress(`🧠 Discovered ${sapientSpecies.length} intelligent species`);

    // Phase 6: Choose art style (use configured style, or fall back to seed-based selection)
    const artStyle = this.configuredArtStyle ?? this.selectArtStyle(this.planet.seed);
    this.reportProgress(`🎨 ${this.configuredArtStyle ? 'Using configured art style' : 'Choosing art style from seed'}: ${artStyle}`);

    const endTime = Date.now();
    const generationTimeMs = endTime - startTime;

    const biosphere: BiosphereData = {
      $schema: 'https://aivillage.dev/schemas/biosphere/v1',
      planet: this.planet,
      niches,
      species,
      foodWeb,
      nicheFilling,
      sapientSpecies,
      artStyle,
      metadata: {
        generatedAt: Date.now(),
        generationTimeMs,
        totalSpecies: species.length,
        sapientCount: sapientSpecies.length,
        trophicLevels: this.countTrophicLevels(niches),
        averageSpeciesPerNiche: species.length / niches.length,
      },
    };

    this.reportProgress(`✅ Biosphere complete! ${biosphere.metadata.totalSpecies} species thriving`);
    console.log(`[BiosphereGenerator] Generation time: ${generationTimeMs}ms | ${biosphere.metadata.trophicLevels} trophic levels`);

    return biosphere;
  }

  /**
   * Generate species for a specific niche
   */
  private async generateSpeciesForNiche(niche: EcologicalNiche, maxCount: number = Infinity): Promise<GeneratedAlienSpecies[]> {
    const species: GeneratedAlienSpecies[] = [];
    const count = Math.min(niche.expectedSpeciesCount, maxCount);

    for (let i = 0; i < count; i++) {
      const constraints = this.fitNicheConstraints(niche, i);

      try {
        const alien = await this.alienGenerator.generateAlienSpecies(constraints);

        // Add niche metadata to species
        // Note: GeneratedAlienSpecies extends AlienCreatureSpecies which may not have these fields
        // They are added dynamically for biosphere tracking
        Object.assign(alien, {
          nicheId: niche.id,
          sizeClass: niche.sizeClass
        });

        species.push(alien);

        // Report this species creation
        this.reportProgress(`🦎 ${alien.name} evolved (${niche.category})`);
      } catch (error) {
        console.warn(`[BiosphereGenerator] Failed to generate species ${i} for niche ${niche.id}:`, error);
      }
    }

    return species;
  }

  /**
   * Fit niche constraints to alien generation parameters
   */
  private fitNicheConstraints(niche: EcologicalNiche, index: number): AlienGenerationConstraints {
    const constraints: AlienGenerationConstraints = {
      nativeWorld: this.planet.name,
    };

    // Map vertical zone to environment
    switch (niche.habitat.verticalZone) {
      case 'aquatic_surface':
      case 'aquatic_mid':
      case 'aquatic_deep':
        constraints.environment = 'aquatic';
        break;
      case 'aerial':
        constraints.environment = 'aerial';
        break;
      case 'burrowing':
        constraints.environment = 'subterranean';
        break;
      default:
        constraints.environment = 'terrestrial';
    }

    // Determine intelligence (rare sapient species)
    if (niche.sapientPossible && Math.random() < 0.05) {  // 5% chance
      const sapientLevels: Array<'proto_sapient' | 'fully_sapient' | 'hive_intelligence'> =
        ['proto_sapient', 'fully_sapient', 'hive_intelligence'];
      constraints.intelligence = sapientLevels[Math.floor(Math.random() * sapientLevels.length)];
      constraints.requireSapient = true;
    } else {
      const nonSapientLevels: Array<'instinctual_only' | 'basic_learning' | 'problem_solver'> =
        ['instinctual_only', 'basic_learning', 'problem_solver'];
      constraints.intelligence = nonSapientLevels[Math.floor(Math.random() * nonSapientLevels.length)];
    }

    // Determine danger level based on niche category
    if (niche.category === 'carnivore' && niche.sizeClass === 'large') {
      constraints.dangerLevel = Math.random() < 0.3 ? 'severe' : 'moderate';
    } else if (niche.category === 'carnivore') {
      constraints.dangerLevel = 'moderate';
    } else if (niche.category === 'parasite') {
      constraints.dangerLevel = 'minor';
    } else {
      constraints.dangerLevel = 'harmless';
    }

    // Domestication potential (herbivores and small omnivores most likely)
    if (niche.category === 'herbivore' && niche.sizeClass !== 'megafauna') {
      constraints.domesticationPotential = 'good';
    } else if (niche.category === 'omnivore' && niche.sizeClass === 'small') {
      constraints.domesticationPotential = 'moderate';
    } else {
      constraints.domesticationPotential = 'poor';
    }

    return constraints;
  }

  /**
   * Build food web relationships between species
   */
  private buildFoodWeb(species: GeneratedAlienSpecies[], niches: EcologicalNiche[]): FoodWeb {
    const foodWeb: FoodWeb = {};

    // Initialize empty relationships for all species
    for (const s of species) {
      foodWeb[s.id] = {
        preys: [],
        predators: [],
        competitors: [],
        mutualists: [],
      };
    }

    // Build predator-prey relationships
    for (const predator of species) {
      // Access dynamically added nicheId
      const predatorNicheId = 'nicheId' in predator ? (predator as typeof predator & { nicheId: string }).nicheId : undefined;
      const predatorNiche = niches.find(n => n.id === predatorNicheId);
      if (!predatorNiche) continue;

      if (predatorNiche.category === 'carnivore') {
        // Carnivores eat herbivores and smaller carnivores
        for (const prey of species) {
          if (prey.id === predator.id) continue;

          const preyNicheId = 'nicheId' in prey ? (prey as typeof prey & { nicheId: string }).nicheId : undefined;
          const preyNiche = niches.find(n => n.id === preyNicheId);
          if (!preyNiche) continue;

          // Can eat if: prey is herbivore OR prey is smaller carnivore
          const canEat = (
            preyNiche.category === 'herbivore' ||
            (preyNiche.category === 'carnivore' && this.isSmallerSize(preyNiche.sizeClass, predatorNiche.sizeClass))
          );

          if (canEat) {
            foodWeb[predator.id]!.preys.push(prey.id);
            foodWeb[prey.id]!.predators.push(predator.id);
          }
        }
      } else if (predatorNiche.category === 'herbivore') {
        // Herbivores eat producers
        for (const producer of species) {
          const producerNicheId = 'nicheId' in producer ? (producer as typeof producer & { nicheId: string }).nicheId : undefined;
          const producerNiche = niches.find(n => n.id === producerNicheId);
          if (producerNiche?.category === 'producer') {
            foodWeb[predator.id]!.preys.push(producer.id);
            foodWeb[producer.id]!.predators.push(predator.id);
          }
        }
      }
    }

    // Build competition relationships (same niche)
    for (const s1 of species) {
      const s1NicheId = 'nicheId' in s1 ? (s1 as typeof s1 & { nicheId: string }).nicheId : undefined;
      for (const s2 of species) {
        if (s1.id === s2.id) continue;
        const s2NicheId = 'nicheId' in s2 ? (s2 as typeof s2 & { nicheId: string }).nicheId : undefined;
        if (s1NicheId && s1NicheId === s2NicheId) {
          if (!foodWeb[s1.id]!.competitors.includes(s2.id)) {
            foodWeb[s1.id]!.competitors.push(s2.id);
          }
        }
      }
    }

    return foodWeb;
  }

  /**
   * Check if size1 is smaller than size2
   */
  private isSmallerSize(size1: SizeClass, size2: SizeClass): boolean {
    const sizeOrder: SizeClass[] = ['microscopic', 'tiny', 'small', 'medium', 'large', 'megafauna'];
    const idx1 = sizeOrder.indexOf(size1);
    const idx2 = sizeOrder.indexOf(size2);
    return idx1 < idx2;
  }

  /**
   * Map niches to species that fill them
   */
  private mapNichesToSpecies(niches: EcologicalNiche[], species: GeneratedAlienSpecies[]): Record<string, string[]> {
    const mapping: Record<string, string[]> = {};

    for (const niche of niches) {
      mapping[niche.id] = species
        .filter(s => {
          const nicheId = 'nicheId' in s ? (s as typeof s & { nicheId: string }).nicheId : undefined;
          return nicheId === niche.id;
        })
        .map(s => s.id);
    }

    return mapping;
  }

  /**
   * Count trophic levels
   */
  private countTrophicLevels(niches: EcologicalNiche[]): number {
    const levels = new Set<number>();

    for (const niche of niches) {
      if (niche.category === 'producer') levels.add(1);
      if (niche.category === 'herbivore') levels.add(2);
      if (niche.category === 'carnivore') levels.add(3);
      if (niche.category === 'decomposer') levels.add(0);  // Special
    }

    return levels.size;
  }

  /**
   * Select art style deterministically from planet seed
   */
  private selectArtStyle(seed: string): ArtStyle {
    // Hash seed to number
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;  // Convert to 32bit integer
    }

    // Available art styles
    const styles: ArtStyle[] = [
      'nes', 'snes', 'ps1', 'gba', 'gameboy', 'neogeo',
      'genesis', 'mastersystem', 'turbografx', 'n64', 'dreamcast',
      'c64', 'amiga', 'atarist', 'zxspectrum', 'cga', 'ega', 'vga',
      'msx', 'pc98', 'atari2600', 'wonderswan', 'ngpc', 'virtualboy',
      'celeste', 'undertale', 'stardew', 'terraria'
    ];

    const index = Math.abs(hash) % styles.length;
    return styles[index]!;
  }
}
