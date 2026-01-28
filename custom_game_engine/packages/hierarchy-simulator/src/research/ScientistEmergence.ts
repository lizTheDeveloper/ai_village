/**
 * Scientist Emergence System
 *
 * Scientists don't spawn instantly - they emerge statistically from the population
 * based on conditions. A tier-100 physicist might require:
 * - 1 billion population
 * - 10+ tier-8 physics universities
 * - 100+ years of stability
 * - Active tier-9 research in physics
 *
 * You create the conditions and wait for emergence.
 */

import type { Scientist, University, ResearchField, ResearchGuild } from './ResearchTypes.js';

export interface EmergenceConditions {
  // Population requirements
  totalPopulation: number;
  educatedPopulation: number;  // % with advanced education

  // Infrastructure
  universities: University[];
  guilds: ResearchGuild[];

  // Temporal requirements
  stabilityYears: number;  // Years of sustained >80% stability
  fundingYears: number;  // Years of sustained research funding

  // Research activity
  activePapers: number;
  publishedPapers: number;
  highestTierActive: number;  // Highest tier paper in progress
}

export interface EmergenceRate {
  tier: number;
  field: ResearchField;
  probabilityPerYear: number;  // 0-1 chance per year
  expectedYears: number;  // 1 / probability
}

export class ScientistEmergenceSystem {
  /**
   * Calculate emergence rates for scientists of different tiers
   *
   * Tier distribution (per billion population with ideal conditions):
   * - Tier 20-40: Common (thousands per year)
   * - Tier 40-60: Uncommon (hundreds per year)
   * - Tier 60-80: Rare (tens per year)
   * - Tier 80-90: Very Rare (few per year)
   * - Tier 90-95: Ultra Rare (one per decade)
   * - Tier 95-98: Legendary (one per century)
   * - Tier 98-100: Civilization-defining (one per millennium)
   */
  calculateEmergenceRates(
    field: ResearchField,
    conditions: EmergenceConditions
  ): EmergenceRate[] {
    const rates: EmergenceRate[] = [];

    // Field-specific infrastructure
    const fieldUniversities = conditions.universities.filter(u =>
      (u.strengths[field] || 0) >= 5
    );
    const fieldGuilds = conditions.guilds.filter(g => g.field === field);

    const universitiesStrength = this.calculateUniversityStrength(fieldUniversities);
    const guildsInfluence = this.calculateGuildInfluence(fieldGuilds);

    // Base rates per billion population
    const baseProbabilities: Record<number, number> = {
      50: 0.1,    // 10% chance per year = ~10 years for tier-50
      60: 0.01,   // 1% = ~100 years
      70: 0.001,  // 0.1% = ~1000 years
      80: 0.0001, // 0.01% = ~10,000 years (once per civilization)
      90: 0.00001,  // Ultra rare
      95: 0.000001, // Legendary
      98: 0.0000001, // Once per million years
      100: 0.00000001 // Tier-100: once per 100 million years base
    };

    for (const [tierStr, baseProbability] of Object.entries(baseProbabilities)) {
      const tier = parseInt(tierStr);

      // Calculate modifiers
      const populationModifier = this.calculatePopulationModifier(
        conditions.totalPopulation,
        tier
      );

      const infrastructureModifier = this.calculateInfrastructureModifier(
        universitiesStrength,
        guildsInfluence,
        tier
      );

      const stabilityModifier = this.calculateStabilityModifier(
        conditions.stabilityYears,
        tier
      );

      const researchActivityModifier = this.calculateResearchActivityModifier(
        conditions.activePapers,
        conditions.publishedPapers,
        conditions.highestTierActive,
        tier
      );

      // Combined probability
      const probability =
        baseProbability *
        populationModifier *
        infrastructureModifier *
        stabilityModifier *
        researchActivityModifier;

      rates.push({
        tier,
        field,
        probabilityPerYear: probability,
        expectedYears: probability > 0 ? 1 / probability : Infinity
      });
    }

    return rates;
  }

  private calculatePopulationModifier(totalPop: number, tier: number): number {
    // More population = higher chance, but diminishing returns
    const billionPop = totalPop / 1_000_000_000;

    // Tier-50: Linear scaling up to 10 billion
    // Tier-100: Need 1 trillion+ for good odds
    const requiredPop = Math.pow(10, tier / 20); // tier-100 needs 10^5 = 100k billion
    const ratio = billionPop / requiredPop;

    return Math.min(10, Math.pow(ratio, 0.5)); // Square root scaling, cap at 10x
  }

  private calculateInfrastructureModifier(
    universityStrength: number,
    guildInfluence: number,
    tier: number
  ): number {
    // Universities and guilds multiply effectiveness

    const requiredUniversities = Math.pow(tier / 10, 2); // tier-100 needs 100 universities
    const universityRatio = universityStrength / requiredUniversities;

    const requiredGuilds = Math.pow(tier / 10, 1.5); // tier-100 needs ~31 guilds
    const guildRatio = guildInfluence / requiredGuilds;

    // Both needed for high-tier scientists
    if (tier >= 80) {
      return Math.min(universityRatio, guildRatio); // Bottlenecked by weaker one
    } else {
      return (universityRatio + guildRatio) / 2; // Average for mid-tier
    }
  }

  private calculateStabilityModifier(stabilityYears: number, tier: number): number {
    // High-tier scientists need sustained stability
    const requiredYears = tier * 2; // tier-100 needs 200 years

    const ratio = stabilityYears / requiredYears;

    if (ratio < 0.5) return 0; // Not enough stability
    if (ratio < 1.0) return ratio; // Partial
    return 1.0 + Math.log10(ratio); // Bonus for extra stability
  }

  private calculateResearchActivityModifier(
    activePapers: number,
    publishedPapers: number,
    highestTierActive: number,
    targetTier: number
  ): number {
    // Active research attracts/develops talent

    // Need active papers at similar tier
    if (highestTierActive < targetTier * 0.8) {
      return 0.1; // Penalty if no high-tier research happening
    }

    const activityBonus = Math.min(2.0, 1.0 + Math.log10(activePapers + 1));
    const legacyBonus = Math.min(1.5, 1.0 + Math.log10(publishedPapers + 1) * 0.1);

    return activityBonus * legacyBonus;
  }

  private calculateUniversityStrength(universities: University[]): number {
    // Sum of tier^2 for each university
    return universities.reduce((sum, u) => sum + Math.pow(u.tier, 2), 0);
  }

  private calculateGuildInfluence(guilds: ResearchGuild[]): number {
    // Sum of tier * influence for each guild
    return guilds.reduce((sum, g) => sum + g.tier * (g.influence / 100), 0);
  }

  /**
   * Attempt to emerge a scientist
   * Returns scientist if emergence succeeds, null otherwise
   */
  attemptEmergence(
    tier: number,
    field: ResearchField,
    probability: number,
    location: string
  ): Scientist | null {
    if (Math.random() > probability) {
      return null; // No emergence this year
    }

    // Success! A rare scientist has emerged
    return this.createScientist(tier, field, location);
  }

  private createScientist(
    tier: number,
    field: ResearchField,
    location: string
  ): Scientist {
    const baseLifespan = 80; // Base human lifespan
    const tier100Lifespan = 200; // Tier-100 scientists live longer (better tech/augmentation)

    const lifespan = baseLifespan + ((tier100Lifespan - baseLifespan) * tier) / 100;

    return {
      id: `scientist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier,
      field,
      specializations: this.generateSpecializations(field, tier),
      age: 25 + Math.floor(Math.random() * 15), // Start career at 25-40
      lifespan: Math.floor(lifespan),
      reputation: tier * 0.5, // Starts with reputation matching tier
      // currentPaper and university assigned when they join research
    };
  }

  private generateSpecializations(field: ResearchField, tier: number): string[] {
    const specializationsByField: Record<ResearchField, string[]> = {
      physics: [
        'Quantum Field Theory',
        'General Relativity',
        'Particle Physics',
        'Cosmology',
        'String Theory'
      ],
      transcendent_physics: [
        'Hyperdimensional Topology',
        'Non-Causal Dynamics',
        'Meta-Entropic Systems',
        'Reality Anchoring',
        'Beyond-Planck Regimes'
      ],
      chemistry: [
        'Quantum Chemistry',
        'Organic Synthesis',
        'Catalysis',
        'Materials Science',
        'Exotic Compounds'
      ],
      exotic_matter_theory: [
        'Strange Matter',
        'Negative Mass',
        'Exotic Vacuum States',
        'Quark-Gluon Plasma',
        'Dark Matter'
      ],
      dimensional_engineering: [
        'Pocket Dimensions',
        'Dimensional Folding',
        'Hyperspatial Navigation',
        'Boundary Stability',
        'Dimensional Anchoring'
      ],
      temporal_mechanics: [
        'Closed Timelike Curves',
        'Paradox Resolution',
        'Chronology Protection',
        'Time Dilation',
        'Temporal Causality'
      ],
      consciousness_studies: [
        'Collective Consciousness',
        'Emergent Sentience',
        'Neural Substrates',
        'Qualia Transfer',
        'Mind Uploading'
      ],
      cultural_synthesis: [
        'Memetic Evolution',
        'Cultural Convergence',
        'Linguistic Theory',
        'Societal Dynamics',
        'Civilizational Cycles'
      ],
      megastructure_architecture: [
        'Ringworld Dynamics',
        'Dyson Spheres',
        'Stellar Lifting',
        'Macro-Engineering',
        'Orbital Mechanics'
      ],
      energy_systems: [
        'Zero-Point Energy',
        'Antimatter',
        'Fusion',
        'Dark Energy',
        'Energy Storage'
      ],
      biological_augmentation: [
        'Genetic Engineering',
        'Neural Enhancement',
        'Longevity',
        'Cognitive Amplification',
        'Biocomputing'
      ],
      artificial_intelligence: [
        'Emergent Agency',
        'Self-Modification',
        'Goal Alignment',
        'Substrate Transfer',
        'Artificial General Intelligence'
      ],
      reality_manipulation: [
        'Physical Constant Tuning',
        'Local Law Modification',
        'Reality Anchoring',
        'Ontological Engineering',
        'Fundamental Force Manipulation'
      ]
    };

    const available = specializationsByField[field] || [];
    const count = Math.min(Math.ceil(tier / 25), available.length); // tier-100 gets 4 specializations

    const selected: string[] = [];
    while (selected.length < count) {
      const spec = available[Math.floor(Math.random() * available.length)]!;
      if (!selected.includes(spec)) {
        selected.push(spec);
      }
    }

    return selected;
  }
}

/**
 * Example: Emergence of a tier-100 physicist
 *
 * Conditions needed:
 * - 1 trillion population (1000 billion)
 * - 100+ tier-8+ physics universities
 * - 30+ tier-8+ physics guilds
 * - 200+ years of 80%+ stability
 * - Active tier-9+ physics research
 * - 1000+ published physics papers
 *
 * With these conditions:
 * - Base probability: 0.00000001 per year (100 million years)
 * - Population modifier: ~3x (sqrt(1000/100000))
 * - Infrastructure modifier: ~1x (if exactly meeting requirements)
 * - Stability modifier: ~1x (200 years / 200 years required)
 * - Research activity modifier: ~2x (active tier-9+ research)
 *
 * Final probability: ~0.00000006 per year
 * Expected time: ~16.7 million years
 *
 * If you double infrastructure and maintain 500 years stability:
 * - Infrastructure modifier: ~1.4x
 * - Stability modifier: ~1.4x
 *
 * Final probability: ~0.00000025 per year
 * Expected time: ~4 million years
 *
 * This is manageable in a 2000-hour game where each hour = centuries
 */
