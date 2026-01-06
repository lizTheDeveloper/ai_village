/**
 * Megastructure-scale research system
 *
 * Research at this scale is about creating conditions for breakthroughs,
 * not managing individual scientists. Papers require:
 * - Decades or centuries of sustained effort
 * - Statistical emergence of ultra-rare tier-100 specialists
 * - Multiple guilds/universities collaborating
 * - Geographic proximity (same gigasegment)
 * - Political/economic stability
 */

export interface ResearchPaper {
  id: string;
  title: string;
  field: ResearchField;
  tier: number;  // 1-100 (tier-10 = transcendent physics)

  // Requirements
  prerequisites: string[];  // Other paper IDs
  requiredGuilds: Record<ResearchField, number>;  // Field -> number of guilds
  requiredSpecialists: Record<number, number>;  // Tier -> count (e.g., tier-100: 10000)
  estimatedYears: number;  // Centuries for high-tier papers

  // Progress
  progress: number;  // 0-100
  startedAt?: number;  // Tick when research began
  leadUniversity?: string;  // University ID coordinating effort
  collaboratingInstitutions: string[];  // University/guild IDs
  activeSpecialists: Record<number, number>;  // Current specialist tiers working on it
}

export type ResearchField =
  | 'physics'
  | 'transcendent_physics'
  | 'chemistry'
  | 'exotic_matter_theory'
  | 'dimensional_engineering'
  | 'temporal_mechanics'
  | 'consciousness_studies'
  | 'cultural_synthesis'
  | 'megastructure_architecture'
  | 'energy_systems'
  | 'biological_augmentation'
  | 'artificial_intelligence'
  | 'reality_manipulation';

export interface Scientist {
  id: string;
  tier: number;  // 0-100 (tier-100 = once-per-civilization genius)
  field: ResearchField;
  specializations: string[];  // Sub-fields
  age: number;
  lifespan: number;  // Years (can be extended via tech)
  currentPaper?: string;  // Paper ID they're working on
  university?: string;  // University ID
  reputation: number;  // 0-100
}

export interface University {
  id: string;
  name: string;
  tier: number;  // 1-10 (tier-10 = transcendent institution)
  location: string;  // Gigasegment/megasegment ID

  // Capacity
  maxScientists: number;
  currentScientists: number;

  // Specializations
  strengths: Record<ResearchField, number>;  // Field -> strength (0-10)

  // Resources
  funding: number;  // Per year
  stability: number;  // 0-100 (affects retention, productivity)

  // Stats
  foundedAt: number;  // Tick
  papersPublished: number;
  activeResearch: string[];  // Paper IDs
}

export interface ResearchGuild {
  id: string;
  field: ResearchField;
  tier: number;  // 1-10
  location: string;  // Gigasegment/megasegment ID
  members: number;
  influence: number;  // 0-100
}

export interface ResearchCollaboration {
  id: string;
  paperId: string;

  // Participants
  leadUniversity: string;
  universities: string[];
  guilds: string[];

  // Requirements
  requiredStability: number;  // Must maintain this stability
  requiredYears: number;  // How long collaboration must last
  yearsElapsed: number;

  // Scientist pool
  scientistTiers: Record<number, number>;  // Tier -> count available

  // Progress
  probabilityOfSuccess: number;  // 0-1, calculated each year
  chancesPerYear: number;  // Rolls per year to complete
}

export interface ResearchProgress {
  // Global research state
  papers: Map<string, ResearchPaper>;
  scientists: Map<string, Scientist>;
  universities: Map<string, University>;
  guilds: Map<string, ResearchGuild>;
  collaborations: Map<string, ResearchCollaboration>;

  // Generation
  nextPaperId: number;
  nextScientistId: number;
}

/**
 * Paper title generator for procedural research
 */
export class PaperTitleGenerator {
  private prefixes = [
    'On the',
    'Towards a Theory of',
    'Foundations of',
    'Emergence of',
    'Convergence in',
    'Limits of',
    'Beyond',
    'Transcendent',
    'Unified Framework for',
    'Quantum Effects in',
    'Hyperdimensional',
    'Non-Linear Dynamics of',
    'Statistical Mechanics of',
    'Topology of',
    'Category Theory of'
  ];

  private topics: Record<ResearchField, string[]> = {
    physics: ['Spacetime', 'Causality', 'Entropy', 'Symmetry Breaking', 'Field Theory', 'Particle Interactions'],
    transcendent_physics: ['Hyperdimensional Collapse', 'Non-Causal Loops', 'Meta-Entropy', 'Beyond-Planck Regimes', 'Reality Anchoring'],
    chemistry: ['Molecular Synthesis', 'Catalytic Processes', 'Exotic Compounds', 'Phase Transitions', 'Bonding Theories'],
    exotic_matter_theory: ['Strange Matter Stability', 'Negative Mass Implications', 'Exotic Vacuum States', 'Quark-Gluon Plasmas'],
    dimensional_engineering: ['Pocket Dimensions', 'Dimensional Folding', 'Hyperspatial Navigation', 'Boundary Stability'],
    temporal_mechanics: ['Closed Timelike Curves', 'Temporal Paradox Resolution', 'Chronology Protection', 'Time Dilation Fields'],
    consciousness_studies: ['Collective Consciousness', 'Emergent Sentience', 'Neural Substrate Independence', 'Qualia Transfer'],
    cultural_synthesis: ['Memetic Evolution', 'Cultural Convergence', 'Linguistic Unification', 'Societal Phase Transitions'],
    megastructure_architecture: ['Ringworld Stabilization', 'Dyson Sphere Dynamics', 'Stellar Lifting', 'Macro-Engineering'],
    energy_systems: ['Zero-Point Extraction', 'Antimatter Containment', 'Fusion Cascade Reactors', 'Dark Energy Harvesting'],
    biological_augmentation: ['Neural Enhancement', 'Genetic Optimization', 'Longevity Extension', 'Cognitive Amplification'],
    artificial_intelligence: ['Emergent Agency', 'Self-Modification Stability', 'Goal Alignment', 'Substrate Transfer'],
    reality_manipulation: ['Local Law Modification', 'Physical Constant Tuning', 'Reality Anchoring', 'Ontological Engineering']
  };

  private suffixes = [
    'in Curved Spacetime',
    'Under Extreme Conditions',
    'at Cosmological Scales',
    'in Multi-Generational Systems',
    'Across Dimensional Boundaries',
    'in Post-Singularity Contexts',
    'During Stellar Evolution',
    'in Megastructure Environments',
    'for Interstellar Applications',
    'in the Ringworld Context'
  ];

  generateTitle(field: ResearchField, tier: number): string {
    const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
    const topic = this.topics[field][Math.floor(Math.random() * this.topics[field].length)];
    const suffix = tier > 5 ? this.suffixes[Math.floor(Math.random() * this.suffixes.length)] : '';

    if (tier >= 8) {
      return `${prefix} ${topic} ${suffix} (Tier-${tier} Transcendent)`;
    } else if (tier >= 5) {
      return `${prefix} ${topic} ${suffix}`;
    } else {
      return `${topic}: ${prefix.replace('On the ', '')}`;
    }
  }

  generatePaperRequirements(tier: number): {
    requiredGuilds: Record<ResearchField, number>;
    requiredSpecialists: Record<number, number>;
    estimatedYears: number;
  } {
    // Exponential scaling
    const baseGuilds = Math.pow(tier, 1.5);
    const baseSpecialists = Math.pow(tier, 2);
    const baseYears = Math.pow(tier, 2.5);

    const requiredGuilds: Record<ResearchField, number> = {} as any;
    const numFields = Math.min(tier, 3); // High-tier papers cross disciplines
    const fields = this.getRandomFields(numFields);

    for (const field of fields) {
      requiredGuilds[field] = Math.ceil(baseGuilds / numFields);
    }

    const requiredSpecialists: Record<number, number> = {};

    if (tier >= 8) {
      // Transcendent papers need tier-100 scientists
      const tier100needed = Math.ceil(Math.pow(tier - 7, 3)) * 1000; // 1000, 8000, 27000...
      requiredSpecialists[100] = tier100needed;
    }

    if (tier >= 5) {
      // Need high-tier scientists
      const tier80needed = Math.ceil(Math.pow(tier - 4, 2)) * 100;
      requiredSpecialists[80] = tier80needed;
    }

    // Always need mid-tier scientists
    requiredSpecialists[50] = Math.ceil(baseSpecialists);

    return {
      requiredGuilds,
      requiredSpecialists,
      estimatedYears: Math.ceil(baseYears)
    };
  }

  private getRandomFields(count: number): ResearchField[] {
    const fields: ResearchField[] = Object.keys(this.topics) as ResearchField[];
    const selected: ResearchField[] = [];

    while (selected.length < count && selected.length < fields.length) {
      const field = fields[Math.floor(Math.random() * fields.length)];
      if (!selected.includes(field)) {
        selected.push(field);
      }
    }

    return selected;
  }
}
