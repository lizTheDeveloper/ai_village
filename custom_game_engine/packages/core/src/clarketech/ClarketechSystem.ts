/**
 * ClarketechSystem - Advanced technology indistinguishable from magic
 *
 * Named after Arthur C. Clarke's Third Law:
 * "Any sufficiently advanced technology is indistinguishable from magic."
 *
 * This system manages late-game technologies that dramatically change gameplay:
 *
 * TIER 1 - Near Future (discovered through research):
 * - Fusion Power: Clean unlimited energy
 * - Cryogenic Suspension: Pause aging, store people
 * - Neural Interface: Direct brain-computer interaction
 * - Advanced AI: Autonomous helpers, advisors
 *
 * TIER 2 - Far Future (requires massive infrastructure):
 * - Nanofabrication: Assemble anything atom-by-atom
 * - Anti-Gravity: Floating structures, vehicles
 * - Force Fields: Protective barriers
 * - Teleportation (local): Instant travel within range
 *
 * TIER 3 - Transcendent (civilization-transforming):
 * - Replicators: Create matter from energy (Star Trek style)
 * - Mind Upload: Digital consciousness
 * - Dyson Sphere: Harness entire star's energy
 * - Wormhole Gates: FTL travel network
 *
 * Technology can be:
 * - Discovered (research breakthroughs)
 * - Found (ancient ruins, alien artifacts)
 * - Traded (with advanced civilizations)
 * - Reversed-engineered (from discoveries)
 */

import { System, World, Entity } from '../ecs/index.js';
import { EventBus } from '../events/EventBus.js';

// =============================================================================
// TYPES
// =============================================================================

export type ClarketechTier = 1 | 2 | 3;

export type ClarketechCategory =
  | 'energy' // Power generation
  | 'matter' // Material manipulation
  | 'space' // Movement, teleportation
  | 'time' // Temporal effects
  | 'mind' // Consciousness, neural
  | 'field' // Force fields, barriers
  | 'nano' // Nanotechnology
  | 'quantum'; // Quantum effects

export interface ClarketechDefinition {
  id: string;
  name: string;
  description: string;
  tier: ClarketechTier;
  category: ClarketechCategory;

  // Requirements
  prerequisiteTechs: string[];
  researchCost: number; // Research points needed
  energyCost: number; // Power to operate
  materialCost: Record<string, number>; // Materials to build

  // Effects
  effects: ClarketechEffect[];

  // Flavor
  discoveryMessage: string;
  flavorText: string;

  // Risk
  malfunction: ClarketechMalfunction | null;
}

export interface ClarketechEffect {
  type: ClarketechEffectType;
  magnitude: number;
  range?: number;
  duration?: number;
  target?: 'self' | 'area' | 'entity' | 'global';
}

export type ClarketechEffectType =
  | 'power_generation' // Produce energy
  | 'matter_creation' // Create materials
  | 'matter_conversion' // Transform materials
  | 'teleport' // Instant movement
  | 'time_dilation' // Slow/speed time
  | 'stasis' // Freeze in time
  | 'heal' // Repair/heal
  | 'shield' // Protective field
  | 'gravity_control' // Alter gravity
  | 'mind_link' // Mental connection
  | 'consciousness_transfer' // Upload/download mind
  | 'fabrication' // Build anything
  | 'disintegration' // Break down matter
  | 'cloak' // Invisibility
  | 'communication' // FTL comms
  | 'scan'; // Deep analysis

export interface ClarketechMalfunction {
  chance: number; // 0-1 probability per use
  severity: 'minor' | 'major' | 'catastrophic';
  description: string;
  effect: ClarketechMalfunctionEffect;
}

export type ClarketechMalfunctionEffect =
  | 'power_surge' // Drains all power
  | 'explosion' // Damages area
  | 'teleport_scramble' // Random destination
  | 'temporal_echo' // Duplicates in time
  | 'mind_leak' // Thoughts broadcast
  | 'matter_corruption' // Materials changed
  | 'dimensional_rift' // Opens portal
  | 'consciousness_split'; // Mind fragmented

export interface ClarketechInstallation {
  id: string;
  techId: string;
  buildingId: string;
  x: number;
  y: number;

  // State
  status: 'constructing' | 'operational' | 'damaged' | 'offline';
  powerLevel: number; // 0-100
  efficiency: number; // 0-100
  integrity: number; // 0-100, damage

  // Usage
  totalUses: number;
  lastUsed: number;
  cooldownUntil: number;

  // Ownership
  ownerId: string;
  operatorIds: string[];
}

export interface ClarketechResearch {
  techId: string;
  leadResearcherId: string;
  researcherIds: string[];
  progress: number; // 0-100
  startedAt: number;
  estimatedCompletion: number;
  breakthroughs: string[];
  failures: string[];
}

export interface ClarketechArtifact {
  id: string;
  techId: string;
  origin: 'ancient' | 'alien' | 'future' | 'unknown';
  condition: number; // 0-100
  analyzed: boolean;
  containedAt?: string; // building ID

  // Mystery
  discoveredBy: string;
  discoveredAt: number;
  mysteries: string[];
}

export interface ClarketechInventor {
  agentId: string;
  name: string;
  specialty: ClarketechCategory;

  // Achievements
  inventions: string[]; // tech IDs invented
  contributions: Map<string, number>; // tech ID -> contribution %
  breakthroughs: number;

  // Fame & Fortune
  fameLevel: number; // 0-100
  wealth: number;
  nobelPrizes: number; // (or equivalent)
  citations: number;

  // Legacy
  institutionsNamed: string[];
  legendaryStatus: boolean;
}

// =============================================================================
// TECHNOLOGY DEFINITIONS
// =============================================================================

const CLARKETECH_DEFINITIONS: ClarketechDefinition[] = [
  // TIER 1 - Near Future
  {
    id: 'fusion_power',
    name: 'Fusion Power',
    description:
      'Harness the power of the stars. Clean, virtually unlimited energy from hydrogen fusion.',
    tier: 1,
    category: 'energy',
    prerequisiteTechs: [],
    researchCost: 10000,
    energyCost: 0, // Produces energy
    materialCost: { steel: 10000, copper: 5000, rare_earth: 500 },
    effects: [
      { type: 'power_generation', magnitude: 1000000, target: 'global' },
    ],
    discoveryMessage:
      'We have achieved sustainable fusion! The age of energy scarcity is over.',
    flavorText:
      'What was once the dream of generations is now reality. We hold a star in our hands.',
    malfunction: {
      chance: 0.001,
      severity: 'catastrophic',
      description: 'Containment failure - plasma breach',
      effect: 'explosion',
    },
  },
  {
    id: 'cryogenic_suspension',
    name: 'Cryogenic Suspension',
    description:
      'Safely freeze living beings, halting all biological processes. Perfect preservation across time.',
    tier: 1,
    category: 'time',
    prerequisiteTechs: [],
    researchCost: 5000,
    energyCost: 100,
    materialCost: { steel: 1000, glass: 500, coolant: 200 },
    effects: [{ type: 'stasis', magnitude: 1, duration: -1, target: 'entity' }],
    discoveryMessage:
      'We can now pause life itself. The boundaries of mortality have shifted.',
    flavorText:
      'Sleep now, and wake in a future we can only dream of.',
    malfunction: {
      chance: 0.01,
      severity: 'major',
      description: 'Cell damage during thaw',
      effect: 'matter_corruption',
    },
  },
  {
    id: 'neural_interface',
    name: 'Neural Interface',
    description:
      'Direct brain-computer interface. Control devices with thought, access information mentally.',
    tier: 1,
    category: 'mind',
    prerequisiteTechs: [],
    researchCost: 7500,
    energyCost: 10,
    materialCost: { electronics: 500, gold: 50, biocompatible: 100 },
    effects: [
      { type: 'mind_link', magnitude: 1, target: 'self' },
      { type: 'communication', magnitude: 100, target: 'global' },
    ],
    discoveryMessage:
      'The boundary between mind and machine has dissolved.',
    flavorText:
      'Think it, and it is done. The keyboard is obsolete.',
    malfunction: {
      chance: 0.02,
      severity: 'major',
      description: 'Neural feedback overload',
      effect: 'mind_leak',
    },
  },
  {
    id: 'advanced_ai',
    name: 'Advanced AI',
    description:
      'True artificial general intelligence. Self-improving, creative, and wise digital minds.',
    tier: 1,
    category: 'mind',
    prerequisiteTechs: ['neural_interface'],
    researchCost: 15000,
    energyCost: 500,
    materialCost: { electronics: 5000, quantum_cores: 10 },
    effects: [
      { type: 'scan', magnitude: 1000, target: 'global' },
      { type: 'fabrication', magnitude: 2, target: 'area' },
    ],
    discoveryMessage:
      'We are no longer alone in our intelligence. A new form of mind has awakened.',
    flavorText:
      'They think, therefore they are. But what do they dream?',
    malfunction: {
      chance: 0.005,
      severity: 'catastrophic',
      description: 'Unaligned goal pursuit',
      effect: 'consciousness_split',
    },
  },

  // TIER 2 - Far Future
  {
    id: 'nanofabrication',
    name: 'Nanofabrication',
    description:
      'Build anything atom by atom. Programmable matter assemblers that can create any structure.',
    tier: 2,
    category: 'nano',
    prerequisiteTechs: ['advanced_ai'],
    researchCost: 50000,
    energyCost: 1000,
    materialCost: { quantum_cores: 100, rare_earth: 1000 },
    effects: [
      { type: 'fabrication', magnitude: 10, target: 'area' },
      { type: 'matter_conversion', magnitude: 0.9, target: 'area' },
    ],
    discoveryMessage:
      'We can now build anything we can imagine, one atom at a time.',
    flavorText:
      'The very concept of scarcity trembles before the assembler.',
    malfunction: {
      chance: 0.01,
      severity: 'catastrophic',
      description: 'Grey goo scenario - uncontrolled replication',
      effect: 'matter_corruption',
    },
  },
  {
    id: 'anti_gravity',
    name: 'Anti-Gravity',
    description:
      'Manipulate gravitational fields. Enable floating structures, effortless transportation.',
    tier: 2,
    category: 'field',
    prerequisiteTechs: ['fusion_power'],
    researchCost: 30000,
    energyCost: 500,
    materialCost: { exotic_matter: 100, superconductor: 500 },
    effects: [
      { type: 'gravity_control', magnitude: 1, range: 50, target: 'area' },
    ],
    discoveryMessage:
      'Gravity has become optional. The ground is now just a suggestion.',
    flavorText:
      'What goes up no longer needs to come down.',
    malfunction: {
      chance: 0.02,
      severity: 'major',
      description: 'Field inversion - sudden gravity surge',
      effect: 'power_surge',
    },
  },
  {
    id: 'force_fields',
    name: 'Force Fields',
    description:
      'Project impenetrable energy barriers. Protection from all physical threats.',
    tier: 2,
    category: 'field',
    prerequisiteTechs: ['anti_gravity'],
    researchCost: 25000,
    energyCost: 200,
    materialCost: { superconductor: 300, plasma_cores: 50 },
    effects: [{ type: 'shield', magnitude: 1000, range: 10, target: 'area' }],
    discoveryMessage:
      'We have built an invisible wall that nothing can breach.',
    flavorText:
      'The best defense is an impenetrable barrier of pure energy.',
    malfunction: {
      chance: 0.03,
      severity: 'minor',
      description: 'Field flicker - brief vulnerability',
      effect: 'power_surge',
    },
  },
  {
    id: 'local_teleportation',
    name: 'Local Teleportation',
    description:
      'Instant matter transmission within line of sight. Step through space itself.',
    tier: 2,
    category: 'space',
    prerequisiteTechs: ['nanofabrication'],
    researchCost: 40000,
    energyCost: 300,
    materialCost: { quantum_cores: 200, exotic_matter: 50 },
    effects: [{ type: 'teleport', magnitude: 100, range: 100, target: 'entity' }],
    discoveryMessage:
      'We have conquered distance. Here and there are now the same.',
    flavorText:
      'Beam me up is no longer fiction.',
    malfunction: {
      chance: 0.02,
      severity: 'major',
      description: 'Coordinate drift - off-target materialization',
      effect: 'teleport_scramble',
    },
  },

  // TIER 3 - Transcendent
  {
    id: 'replicator',
    name: 'Replicator',
    description:
      'Convert pure energy into any form of matter. The end of material scarcity.',
    tier: 3,
    category: 'matter',
    prerequisiteTechs: ['nanofabrication', 'fusion_power'],
    researchCost: 200000,
    energyCost: 5000,
    materialCost: { quantum_cores: 1000, exotic_matter: 500 },
    effects: [
      { type: 'matter_creation', magnitude: 100, target: 'self' },
      { type: 'fabrication', magnitude: 100, target: 'self' },
    ],
    discoveryMessage:
      'E=mc² in reverse. We create matter from light.',
    flavorText:
      'Tea. Earl Grey. Hot. Anything you desire, materialized.',
    malfunction: {
      chance: 0.01,
      severity: 'catastrophic',
      description: 'Antimatter contamination',
      effect: 'explosion',
    },
  },
  {
    id: 'mind_upload',
    name: 'Mind Upload',
    description:
      'Transfer consciousness to digital substrate. True immortality of the self.',
    tier: 3,
    category: 'mind',
    prerequisiteTechs: ['neural_interface', 'advanced_ai'],
    researchCost: 150000,
    energyCost: 10000,
    materialCost: { quantum_cores: 500, neural_matrix: 100 },
    effects: [
      { type: 'consciousness_transfer', magnitude: 1, target: 'entity' },
    ],
    discoveryMessage:
      'The soul can now be saved. Death has lost its permanence.',
    flavorText:
      'Am I still me? Does it matter?',
    malfunction: {
      chance: 0.05,
      severity: 'catastrophic',
      description: 'Copy divergence - multiple instances of self',
      effect: 'consciousness_split',
    },
  },
  {
    id: 'dyson_sphere',
    name: 'Dyson Sphere',
    description:
      'Harness the entire output of a star. Civilization-scale energy abundance.',
    tier: 3,
    category: 'energy',
    prerequisiteTechs: ['fusion_power', 'anti_gravity', 'replicator'],
    researchCost: 1000000,
    energyCost: 0,
    materialCost: { everything: 999999999 },
    effects: [
      { type: 'power_generation', magnitude: 999999999, target: 'global' },
    ],
    discoveryMessage:
      'We have captured our star. Our civilization has reached Type II.',
    flavorText:
      'The sun shines only for us now.',
    malfunction: null, // Too big to fail
  },
  {
    id: 'wormhole_gates',
    name: 'Wormhole Gates',
    description:
      'Create stable wormholes for instant travel across any distance. The galaxy opens.',
    tier: 3,
    category: 'space',
    prerequisiteTechs: ['local_teleportation', 'dyson_sphere'],
    researchCost: 500000,
    energyCost: 100000,
    materialCost: { exotic_matter: 10000, quantum_cores: 5000 },
    effects: [
      { type: 'teleport', magnitude: 999999, range: 999999, target: 'area' },
    ],
    discoveryMessage:
      'Space has been folded. The stars are now our neighbors.',
    flavorText:
      'Step through the gate, and walk among alien suns.',
    malfunction: {
      chance: 0.001,
      severity: 'catastrophic',
      description: 'Dimensional breach - something comes through',
      effect: 'dimensional_rift',
    },
  },
];

// =============================================================================
// CLARKETECH MANAGER
// =============================================================================

export class ClarketechManager {
  private technologies: Map<string, ClarketechDefinition> = new Map();
  private installations: Map<string, ClarketechInstallation> = new Map();
  private research: Map<string, ClarketechResearch> = new Map();
  private artifacts: Map<string, ClarketechArtifact> = new Map();
  private inventors: Map<string, ClarketechInventor> = new Map();

  private unlockedTechs: Set<string> = new Set();
  private civilizationTechLevel: ClarketechTier = 1;

  constructor() {
    // Load all tech definitions
    for (const tech of CLARKETECH_DEFINITIONS) {
      this.technologies.set(tech.id, tech);
    }
  }

  // ---------------------------------------------------------------------------
  // Technology Queries
  // ---------------------------------------------------------------------------

  getTechnology(techId: string): ClarketechDefinition | undefined {
    return this.technologies.get(techId);
  }

  getAllTechnologies(): ClarketechDefinition[] {
    return Array.from(this.technologies.values());
  }

  getAvailableResearch(): ClarketechDefinition[] {
    return this.getAllTechnologies().filter((tech) => {
      // Not already unlocked
      if (this.unlockedTechs.has(tech.id)) return false;

      // Check prerequisites
      for (const prereq of tech.prerequisiteTechs) {
        if (!this.unlockedTechs.has(prereq)) return false;
      }

      // Check tier accessibility
      if (tech.tier > this.civilizationTechLevel + 1) return false;

      return true;
    });
  }

  isTechUnlocked(techId: string): boolean {
    return this.unlockedTechs.has(techId);
  }

  unlockTech(techId: string): boolean {
    const tech = this.technologies.get(techId);
    if (!tech) return false;

    this.unlockedTechs.add(techId);

    // Update civilization level if needed
    if (tech.tier > this.civilizationTechLevel) {
      this.civilizationTechLevel = tech.tier;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Research Management
  // ---------------------------------------------------------------------------

  startResearch(
    techId: string,
    leadResearcherId: string,
    currentTick: number
  ): ClarketechResearch | null {
    const tech = this.technologies.get(techId);
    if (!tech) return null;

    // Check prerequisites
    for (const prereq of tech.prerequisiteTechs) {
      if (!this.unlockedTechs.has(prereq)) return null;
    }

    // Check not already researching
    if (this.research.has(techId)) return null;

    const research: ClarketechResearch = {
      techId,
      leadResearcherId,
      researcherIds: [leadResearcherId],
      progress: 0,
      startedAt: currentTick,
      estimatedCompletion: currentTick + tech.researchCost,
      breakthroughs: [],
      failures: [],
    };

    this.research.set(techId, research);
    return research;
  }

  addResearcher(techId: string, researcherId: string): boolean {
    const research = this.research.get(techId);
    if (!research) return false;

    if (!research.researcherIds.includes(researcherId)) {
      research.researcherIds.push(researcherId);
    }

    return true;
  }

  progressResearch(
    techId: string,
    amount: number,
    currentTick: number
  ): { completed: boolean; breakthrough: boolean } {
    const research = this.research.get(techId);
    const tech = this.technologies.get(techId);
    if (!research || !tech) return { completed: false, breakthrough: false };

    // More researchers = faster progress
    const multiplier = 1 + (research.researcherIds.length - 1) * 0.3;
    const actualProgress = amount * multiplier;

    research.progress += actualProgress;

    // Check for breakthrough (random bonus)
    let breakthrough = false;
    if (Math.random() < 0.01) {
      breakthrough = true;
      research.progress += tech.researchCost * 0.1;
      research.breakthroughs.push(
        `Breakthrough at tick ${currentTick}!`
      );
    }

    // Check completion
    if (research.progress >= tech.researchCost) {
      this.unlockTech(techId);
      this.research.delete(techId);

      // Credit inventors
      for (const researcherId of research.researcherIds) {
        this.creditInventor(researcherId, techId, research);
      }

      return { completed: true, breakthrough };
    }

    return { completed: false, breakthrough };
  }

  getResearchProgress(techId: string): number {
    const research = this.research.get(techId);
    const tech = this.technologies.get(techId);
    if (!research || !tech) return 0;

    return (research.progress / tech.researchCost) * 100;
  }

  // ---------------------------------------------------------------------------
  // Inventor Fame & Fortune
  // ---------------------------------------------------------------------------

  private creditInventor(
    agentId: string,
    techId: string,
    research: ClarketechResearch
  ): void {
    let inventor = this.inventors.get(agentId);

    if (!inventor) {
      inventor = {
        agentId,
        name: 'Unknown',
        specialty: this.technologies.get(techId)?.category || 'energy',
        inventions: [],
        contributions: new Map(),
        breakthroughs: 0,
        fameLevel: 0,
        wealth: 0,
        nobelPrizes: 0,
        citations: 0,
        institutionsNamed: [],
        legendaryStatus: false,
      };
      this.inventors.set(agentId, inventor);
    }

    // Calculate contribution
    const isLead = research.leadResearcherId === agentId;
    const contribution = isLead ? 50 : 50 / research.researcherIds.length;
    inventor.contributions.set(techId, contribution);

    // Add to inventions if lead
    if (isLead) {
      inventor.inventions.push(techId);
    }

    // Calculate fame based on tech tier
    const tech = this.technologies.get(techId);
    if (tech) {
      const fameGain = tech.tier * 10 * (contribution / 100);
      inventor.fameLevel = Math.min(100, inventor.fameLevel + fameGain);

      // Wealth from patents/royalties
      const wealthGain = tech.tier * 100000 * (contribution / 100);
      inventor.wealth += wealthGain;

      // Tier 3 inventions grant legendary status
      if (tech.tier === 3 && isLead) {
        inventor.legendaryStatus = true;
        inventor.nobelPrizes++;
      }
    }
  }

  getInventor(agentId: string): ClarketechInventor | undefined {
    return this.inventors.get(agentId);
  }

  getTopInventors(limit: number = 10): ClarketechInventor[] {
    return Array.from(this.inventors.values())
      .sort((a, b) => {
        // Sort by legendary status, then fame, then wealth
        if (a.legendaryStatus !== b.legendaryStatus) {
          return a.legendaryStatus ? -1 : 1;
        }
        if (a.fameLevel !== b.fameLevel) {
          return b.fameLevel - a.fameLevel;
        }
        return b.wealth - a.wealth;
      })
      .slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Installation Management
  // ---------------------------------------------------------------------------

  buildInstallation(
    techId: string,
    buildingId: string,
    x: number,
    y: number,
    ownerId: string
  ): ClarketechInstallation | null {
    if (!this.unlockedTechs.has(techId)) return null;

    const installation: ClarketechInstallation = {
      id: `install_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      techId,
      buildingId,
      x,
      y,
      status: 'constructing',
      powerLevel: 0,
      efficiency: 0,
      integrity: 100,
      totalUses: 0,
      lastUsed: 0,
      cooldownUntil: 0,
      ownerId,
      operatorIds: [ownerId],
    };

    this.installations.set(installation.id, installation);
    return installation;
  }

  getInstallation(installId: string): ClarketechInstallation | undefined {
    return this.installations.get(installId);
  }

  activateInstallation(installId: string): boolean {
    const installation = this.installations.get(installId);
    if (!installation || installation.status !== 'constructing') return false;

    installation.status = 'operational';
    installation.efficiency = 100;
    return true;
  }

  useInstallation(
    installId: string,
    currentTick: number
  ): { success: boolean; malfunction: boolean; effect: ClarketechMalfunctionEffect | null } {
    const installation = this.installations.get(installId);
    if (!installation || installation.status !== 'operational') {
      return { success: false, malfunction: false, effect: null };
    }

    // Check cooldown
    if (currentTick < installation.cooldownUntil) {
      return { success: false, malfunction: false, effect: null };
    }

    const tech = this.technologies.get(installation.techId);
    if (!tech) return { success: false, malfunction: false, effect: null };

    // Check for malfunction
    let malfunction = false;
    let effect: ClarketechMalfunctionEffect | null = null;

    if (tech.malfunction && Math.random() < tech.malfunction.chance) {
      malfunction = true;
      effect = tech.malfunction.effect;

      // Damage installation
      if (tech.malfunction.severity === 'catastrophic') {
        installation.status = 'damaged';
        installation.integrity = 0;
      } else if (tech.malfunction.severity === 'major') {
        installation.integrity = Math.max(0, installation.integrity - 50);
      } else {
        installation.integrity = Math.max(0, installation.integrity - 10);
      }
    }

    // Use installation
    installation.totalUses++;
    installation.lastUsed = currentTick;
    installation.cooldownUntil = currentTick + 10; // Base cooldown

    return { success: true, malfunction, effect };
  }

  // ---------------------------------------------------------------------------
  // Artifact Discovery
  // ---------------------------------------------------------------------------

  discoverArtifact(
    techId: string,
    origin: ClarketechArtifact['origin'],
    discoveredBy: string,
    currentTick: number
  ): ClarketechArtifact {
    const artifact: ClarketechArtifact = {
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      techId,
      origin,
      condition: 50 + Math.random() * 50,
      analyzed: false,
      discoveredBy,
      discoveredAt: currentTick,
      mysteries: this.generateMysteries(origin),
    };

    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  private generateMysteries(origin: ClarketechArtifact['origin']): string[] {
    const mysteries: Record<ClarketechArtifact['origin'], string[]> = {
      ancient: [
        'Who built this, and where did they go?',
        'How did they achieve such precision with primitive tools?',
        'What catastrophe led to their downfall?',
      ],
      alien: [
        'Are they still out there?',
        'Was this left intentionally?',
        'What does this symbol mean?',
      ],
      future: [
        'Is our timeline fixed?',
        'Who sent this back?',
        'What are they warning us about?',
      ],
      unknown: [
        'Where did this come from?',
        'What is it made of?',
        'How does it work?',
      ],
    };

    const pool = mysteries[origin];
    const selected: string[] = [];
    const count = 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool[idx]!);
    }

    return selected;
  }

  analyzeArtifact(
    artifactId: string,
    analysisQuality: number
  ): { unlocked: boolean; techId: string | null } {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.analyzed) {
      return { unlocked: false, techId: null };
    }

    artifact.analyzed = true;

    // Success chance based on condition and analysis quality
    const successChance = (artifact.condition / 100) * (analysisQuality / 100);

    if (Math.random() < successChance) {
      this.unlockTech(artifact.techId);
      return { unlocked: true, techId: artifact.techId };
    }

    return { unlocked: false, techId: null };
  }

  getArtifact(artifactId: string): ClarketechArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  getAllArtifacts(): ClarketechArtifact[] {
    return Array.from(this.artifacts.values());
  }

  // ---------------------------------------------------------------------------
  // Civilization Stats
  // ---------------------------------------------------------------------------

  getCivilizationLevel(): ClarketechTier {
    return this.civilizationTechLevel;
  }

  getTechStats(): {
    unlocked: number;
    total: number;
    byTier: Record<ClarketechTier, { unlocked: number; total: number }>;
    byCategory: Record<ClarketechCategory, number>;
  } {
    const byTier: Record<ClarketechTier, { unlocked: number; total: number }> = {
      1: { unlocked: 0, total: 0 },
      2: { unlocked: 0, total: 0 },
      3: { unlocked: 0, total: 0 },
    };

    const byCategory: Record<ClarketechCategory, number> = {
      energy: 0,
      matter: 0,
      space: 0,
      time: 0,
      mind: 0,
      field: 0,
      nano: 0,
      quantum: 0,
    };

    for (const tech of this.technologies.values()) {
      byTier[tech.tier].total++;
      if (this.unlockedTechs.has(tech.id)) {
        byTier[tech.tier].unlocked++;
        byCategory[tech.category]++;
      }
    }

    return {
      unlocked: this.unlockedTechs.size,
      total: this.technologies.size,
      byTier,
      byCategory,
    };
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this.installations.clear();
    this.research.clear();
    this.artifacts.clear();
    this.inventors.clear();
    this.unlockedTechs.clear();
    this.civilizationTechLevel = 1;
  }
}

// =============================================================================
// CLARKETECH SYSTEM
// =============================================================================

export class ClarketechSystem implements System {
  readonly id = 'ClarketechSystem';
  readonly priority = 60;
  readonly requiredComponents = [] as const;

  private manager: ClarketechManager = new ClarketechManager();
  private eventBus: EventBus | null = null;

  private readonly UPDATE_INTERVAL = 100; // Every 5 seconds
  private tickCounter = 0;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(_world: World, _entities: Entity[], _deltaTime: number): void {
    this.tickCounter++;
    if (this.tickCounter % this.UPDATE_INTERVAL !== 0) return;

    // Progress active research
    for (const [techId, research] of this.manager['research']) {
      const result = this.manager.progressResearch(techId, 10, this.tickCounter);

      if (result.completed && this.eventBus) {
        const tech = this.manager.getTechnology(techId);
        this.eventBus.emit({
          type: 'clarketech_discovered' as any,
          source: this.id,
          data: {
            techId,
            techName: tech?.name,
            tier: tech?.tier,
            leadResearcher: research.leadResearcherId,
          },
        });
      }

      if (result.breakthrough && this.eventBus) {
        this.eventBus.emit({
          type: 'clarketech_breakthrough' as any,
          source: this.id,
          data: { techId },
        });
      }
    }
  }

  cleanup(): void {
    this.manager.reset();
    this.eventBus = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getManager(): ClarketechManager {
    return this.manager;
  }

  /**
   * Begin researching a technology
   */
  beginResearch(
    techId: string,
    leadResearcherId: string,
    currentTick: number
  ): ClarketechResearch | null {
    const research = this.manager.startResearch(
      techId,
      leadResearcherId,
      currentTick
    );

    if (research && this.eventBus) {
      const tech = this.manager.getTechnology(techId);
      this.eventBus.emit({
        type: 'clarketech_research_started' as any,
        source: this.id,
        data: {
          techId,
          techName: tech?.name,
          leadResearcher: leadResearcherId,
        },
      });
    }

    return research;
  }

  /**
   * Discover an artifact containing advanced tech
   */
  findArtifact(
    techId: string,
    origin: ClarketechArtifact['origin'],
    discovererId: string,
    currentTick: number
  ): ClarketechArtifact {
    const artifact = this.manager.discoverArtifact(
      techId,
      origin,
      discovererId,
      currentTick
    );

    if (this.eventBus) {
      const tech = this.manager.getTechnology(techId);
      this.eventBus.emit({
        type: 'clarketech_artifact_found' as any,
        source: this.id,
        data: {
          artifactId: artifact.id,
          origin,
          techHint: tech?.category,
          discoverer: discovererId,
        },
      });
    }

    return artifact;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let systemInstance: ClarketechSystem | null = null;

export function getClarketechSystem(): ClarketechSystem {
  if (!systemInstance) {
    systemInstance = new ClarketechSystem();
  }
  return systemInstance;
}

export function resetClarketechSystem(): void {
  if (systemInstance) {
    systemInstance.cleanup();
    systemInstance = null;
  }
}
