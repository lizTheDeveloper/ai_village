/**
 * Research Paper Data Types
 *
 * These types define the structure of research papers in the knowledge tree system.
 * Papers must be read before they can be authored, creating a natural education progression.
 */

export type ResearchField =
  | 'agriculture'
  | 'metallurgy'
  | 'alchemy'
  | 'textiles'
  | 'cuisine'
  | 'construction'
  | 'crafting'
  | 'nature'
  | 'arcane'
  | 'machinery'
  | 'society'
  | 'physics'                // Classical mechanics, thermodynamics, optics
  | 'advanced_physics'       // Relativity, electromagnetism, nuclear physics
  | 'mathematics'            // Calculus, linear algebra, geometry
  | 'advanced_mathematics'   // Differential equations, topology, group theory
  | 'exotic_physics'         // Quantum field theory, particle physics, cosmology
  | 'artificial_intelligence' // ML, LLMs, agents, RAG, agentic systems
  | 'neural_interfaces'      // Brain-computer interfaces, neural prosthetics
  | 'quantum_mechanics'      // Quantum observation, superposition, wavefunction collapse
  | 'temporal_navigation'    // β-space, timeline navigation, crew coherence
  | 'dimensional_awareness'  // Understanding higher-dimensional reality
  // Tech tree expansion fields (500-paper tree)
  | 'engineering'            // Materials science, mechanics, design principles
  | 'power_generation'       // Steam → nuclear → fusion → Dyson swarm
  | 'manufacturing'          // Assembly, automation, factory systems
  | 'transportation'         // Vehicles, logistics, supply chain
  | 'communication'          // Telegraph → radio → internet
  | 'electrical_engineering' // Circuits, power distribution, motors
  | 'computing'              // Early computers → modern computing → distributed systems
  | 'climate_control'        // HVAC, refrigeration, climate systems
  | 'entertainment'          // Games, novels, VR, video game industry
  | 'distributed_systems'    // Vector clocks, consensus algorithms, coordination
  | 'space_industry'         // Rockets, satellites, orbital mechanics
  | 'military'               // Defense, coordination, strategic technology
  | 'collaboration'          // Task management, project coordination, precursor to hive minds
  // Magic paths to β-space
  | 'daemon_magic'           // Dust navigation, Subtle Knife, world-walking
  | 'rune_magic'             // Dimensional runes, portal gates, symbolic navigation
  | 'pact_magic'             // Demon contracts, entity-granted travel, bargained passage
  | 'divine_magic'           // Divine ascension, god-granted travel, celestial navigation
  | 'narrative_magic'        // Plot holes, metafiction, story-based reality manipulation
  | 'wild_magic'             // Chaos navigation, entropy manipulation, reality breaks
  | 'song_magic'             // Harmonic resonance, frequency travel, musical portals
  | 'academic_magic'         // Theoretical reality manipulation, spell theory, magical physics
  | 'experimental';          // Clarketech, advanced weapons, exotic physics applications

export type AgeCategory = 'child' | 'teen' | 'adult' | 'elder';

export interface ResearchPaper {
  // Identity
  paperId: string;
  title: string;
  field: ResearchField;

  // Set membership - papers belong to one or more sets
  paperSets?: string[]; // e.g., ['language_models_set', 'attention_mechanisms_set'] (optional for legacy)

  // Prerequisites - papers that must be READ to AUTHOR this one
  prerequisitePapers: string[];

  // Complexity affects skill grants and authoring chance
  complexity?: number; // 1-10 (optional, falls back to tier if not specified)

  // Reading requirements
  minimumAge: AgeCategory;
  minimumSkills?: Record<string, number>;

  // Skill grants (based on complexity)
  skillGrants: Record<string, number>;

  // Unlock contribution
  contributesTo?: TechnologyUnlock[]; // What this paper helps unlock (optional for legacy)

  // Flavor
  description: string; // With footnotes!
  abstract?: string; // Short summary (recommended but optional)

  // Authorship
  authorId?: string;
  publicationTick?: number;
  published?: boolean; // Defaults to false

  // Optional metadata
  estimatedReadingTime?: number; // In ticks
  authoringDifficulty?: number; // How hard to write (vs. read)

  // Legacy fields (can be removed eventually)
  tier?: number; // Deprecated - use complexity instead
  technologyTags?: string[]; // Deprecated - use contributesTo instead
}

export type TechnologyUnlock =
  | { type: 'recipe'; recipeId: string }
  | { type: 'building'; buildingId: string }
  | { type: 'crop'; cropId: string }
  | { type: 'item'; itemId: string }
  | { type: 'ability'; abilityId: string }
  | { type: 'spell'; spellId: string }
  | { type: 'herb'; herbId: string }
  | { type: 'knowledge'; knowledgeId: string }
  | { type: 'research'; researchId: string };

export interface ResearchSet {
  setId: string;
  name: string;
  description: string;
  field: ResearchField;

  // All papers in this set
  allPapers: string[]; // Total M papers

  // Unlock logic - which technologies unlock from this set
  unlocks: SetUnlockCondition[];
}

export interface SetUnlockCondition {
  technologyId: string;

  // N-of-M logic
  papersRequired: number; // N - how many papers needed
  // Total papers in set: M (from ResearchSet.allPapers.length)

  // Optional: specific required papers (some papers might be mandatory)
  mandatoryPapers?: string[]; // Must include these specific papers

  // What unlocks
  grants: TechnologyUnlock[];
}

export interface Textbook {
  textbookId: string;
  title: string;
  compiledPapers: string[]; // Papers compiled into this textbook

  // Reading this textbook = reading all papers at once
  minimumAge: AgeCategory;
  readingTime: number; // Longer than individual papers but shorter than reading all

  // Published by
  publishedBy: string; // University entity ID
  publicationTick: number;
}

export interface UniversityComponent {
  type: 'university';

  // Can publish textbooks
  publishedTextbooks: string[];

  // Publishing capabilities
  canPublishTextbooks: boolean;
  textbookProductionRate: number; // Ticks per textbook
}

// Legacy - kept for backwards compatibility with existing tech definitions
export interface TechnologyDefinition {
  id: string;
  name: string;
  description: string;
  requiredPapers: string[]; // All papers that must be published
  unlocks: TechnologyUnlock[];
}
