/**
 * Test script for BiosphereGenerator
 *
 * Generates a complete alien biosphere for a test planet.
 */

import { BiosphereGenerator } from './BiosphereGenerator.js';
import type { PlanetConfig } from '../planet/PlanetTypes.js';
import type { LLMProvider } from '@ai-village/core';
import fs from 'fs';
import path from 'path';

// Mock LLM provider for testing
class MockLLMProvider implements LLMProvider {
  async generate(params: any): Promise<any> {
    // Return plausible JSON for testing
    const mockResponses = [
      {
        scientificName: `Xenoform ${Math.random().toString(36).substring(7)}`,
        commonName: `Test Creature ${Math.floor(Math.random() * 1000)}`,
        description: 'A fascinating alien organism adapted to its niche.'
      }
    ];

    const response = mockResponses[0]!;
    return {
      text: JSON.stringify(response),
      inputTokens: 100,
      outputTokens: 50,
      costUSD: 0.001
    };
  }

  getModelName(): string { return 'mock-llm'; }
  async isAvailable(): Promise<boolean> { return true; }
  getPricing(): any { return { inputCostPer1M: 0, outputCostPer1M: 0 }; }
  getProviderId(): string { return 'mock'; }
}

// Test planet configurations
const testPlanets: PlanetConfig[] = [
  // Earth-like terrestrial world
  {
    id: 'test_planet_terrestrial',
    name: 'New Terra',
    type: 'terrestrial',
    seed: 'test_seed_terra_001',
    temperatureOffset: 0.0,
    temperatureScale: 1.0,
    moistureOffset: 0.0,
    moistureScale: 1.0,
    elevationOffset: 0.0,
    elevationScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: ['plains', 'forest', 'mountains', 'ocean', 'river', 'wetland', 'desert'],
    gravity: 1.0,
    atmosphereDensity: 1.0,
    atmosphereType: 'nitrogen_oxygen',
  },

  // Ocean world (Hycean)
  {
    id: 'test_planet_ocean',
    name: 'Aquarius Prime',
    type: 'hycean',
    seed: 'test_seed_aqua_001',
    temperatureOffset: 0.2,
    temperatureScale: 0.8,
    moistureOffset: 1.0,
    moistureScale: 0.5,
    elevationOffset: -0.5,
    elevationScale: 0.5,
    seaLevel: 0.5,
    allowedBiomes: ['ocean', 'wetland'],
    gravity: 1.2,
    atmosphereDensity: 2.5,
    atmosphereType: 'hydrogen',
  },

  // High-gravity super-Earth
  {
    id: 'test_planet_super_earth',
    name: 'Kepler-442b',
    type: 'super_earth',
    seed: 'test_seed_kepler_001',
    temperatureOffset: 0.1,
    temperatureScale: 1.0,
    moistureOffset: 0.2,
    moistureScale: 1.1,
    elevationOffset: 0.0,
    elevationScale: 1.3,
    seaLevel: -0.2,
    allowedBiomes: ['plains', 'forest', 'ocean', 'mountains', 'wetland'],
    gravity: 1.6,
    atmosphereDensity: 1.2,
    atmosphereType: 'nitrogen_oxygen',
  },

  // Tidally-locked world
  {
    id: 'test_planet_tidally_locked',
    name: 'Proxima b',
    type: 'tidally_locked',
    seed: 'test_seed_proxima_001',
    temperatureOffset: 0.0,
    temperatureScale: 2.0,
    moistureOffset: 0.0,
    moistureScale: 1.5,
    elevationOffset: 0.0,
    elevationScale: 1.0,
    seaLevel: -0.3,
    allowedBiomes: ['plains', 'desert', 'wetland', 'river'],
    gravity: 1.1,
    atmosphereDensity: 0.8,
    isTidallyLocked: true,
    atmosphereType: 'nitrogen_oxygen',
  },

  // Rogue starless world
  {
    id: 'test_planet_rogue',
    name: 'Wanderer-7',
    type: 'rogue',
    seed: 'test_seed_rogue_001',
    temperatureOffset: -0.9,
    temperatureScale: 0.3,
    moistureOffset: -0.5,
    moistureScale: 0.5,
    elevationOffset: 0.0,
    elevationScale: 1.0,
    seaLevel: -0.5,
    allowedBiomes: ['tundra', 'mountains'],
    gravity: 0.8,
    atmosphereDensity: 0.5,
    isStarless: true,
    atmosphereType: 'methane',
  },
];

async function testBiosphereGeneration() {
  console.log('='.repeat(80));
  console.log('BIOSPHERE GENERATOR TEST');
  console.log('='.repeat(80));

  const llmProvider = new MockLLMProvider();

  for (const planet of testPlanets) {
    console.log('\n' + '='.repeat(80));
    console.log(`TESTING: ${planet.name} (${planet.type})`);
    console.log('='.repeat(80));

    try {
      const generator = new BiosphereGenerator(llmProvider, planet);
      const biosphere = await generator.generateBiosphere();

      // Print results
      console.log('\nBIOSPHERE SUMMARY:');
      console.log(`  Planet: ${biosphere.planet.name}`);
      console.log(`  Art Style: ${biosphere.artStyle}`);
      console.log(`  Niches: ${biosphere.niches.length}`);
      console.log(`  Species: ${biosphere.species.length}`);
      console.log(`  Sapient Species: ${biosphere.sapientSpecies.length}`);
      console.log(`  Trophic Levels: ${biosphere.metadata.trophicLevels}`);
      console.log(`  Generation Time: ${biosphere.metadata.generationTimeMs}ms`);

      // Print niche breakdown
      console.log('\nNICHE BREAKDOWN:');
      for (const niche of biosphere.niches) {
        const speciesCount = biosphere.nicheFilling[niche.id]?.length || 0;
        console.log(`  ${niche.name} (${niche.category}): ${speciesCount} species`);
      }

      // Print sapient species
      if (biosphere.sapientSpecies.length > 0) {
        console.log('\nSAPIENT SPECIES:');
        for (const species of biosphere.sapientSpecies) {
          console.log(`  ${species.name} (${species.scientificName})`);
          console.log(`    Intelligence: ${species.intelligence}`);
          console.log(`    Niche: ${(species as any).nicheId}`);
        }
      }

      // Print food web statistics
      const totalPreyRelationships = Object.values(biosphere.foodWeb)
        .reduce((sum, rel) => sum + rel.preys.length, 0);
      console.log('\nFOOD WEB:');
      console.log(`  Total Predator-Prey Relationships: ${totalPreyRelationships}`);

      // Save to file
      const outputDir = path.join(process.cwd(), 'test-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `biosphere_${planet.id}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(biosphere, null, 2));
      console.log(`\nSaved to: ${outputPath}`);

    } catch (error) {
      console.error(`\nERROR generating biosphere for ${planet.name}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run test
testBiosphereGeneration().catch(console.error);
