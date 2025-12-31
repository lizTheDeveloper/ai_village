/**
 * CollectiveMindComponent
 *
 * Represents the collective consciousness of a parasitic hive mind.
 * This component exists on a special "collective" entity that coordinates
 * all colonized hosts.
 *
 * The collective:
 * - Tracks all colonized hosts
 * - Makes breeding decisions
 * - Coordinates expansion strategy
 * - Manages the parasite gene pool
 * - Handles host acquisition priorities
 */

import { ComponentBase } from '../../ecs/Component.js';
import type { EntityId, Tick } from '../../types.js';

/** The collective's current strategic priority */
export type CollectiveStrategy =
  | 'expansion' // Prioritize colonizing new hosts
  | 'consolidation' // Strengthen control over existing hosts
  | 'breeding' // Prioritize reproduction of host bodies
  | 'infiltration' // Prioritize stealth and social positioning
  | 'defense' // Protect existing hosts from threats
  | 'hibernation'; // Conserve resources, minimal activity

/** A colonized host tracked by the collective */
export interface ColonizedHostRecord {
  hostId: EntityId;
  parasiteLineageId: string;
  colonizationTick: Tick;
  integrationLevel: number;
  controlLevel: string;

  // Host capabilities
  hostSpecies: string;
  hostAge: number;
  hostSex: string;
  hostFertile: boolean;
  hostSkills: string[];
  hostSocialPosition: string[];

  // Strategic value
  strategicValue: number; // 0-1, how valuable this host is to the collective
  breedingValue: number; // 0-1, genetic desirability
  infiltrationValue: number; // 0-1, social access provided

  // Assignments
  currentAssignment?: 'breeding' | 'infiltration' | 'labor' | 'defense' | 'expansion';
  assignedMateId?: EntityId;
}

/** Breeding pair assigned by the collective */
export interface BreedingAssignment {
  host1Id: EntityId;
  host2Id: EntityId;
  priority: number;
  desiredTraits: string[];
  assignedTick: Tick;
  deadline?: Tick; // Breed by this tick or reassign
  status: 'pending' | 'in_progress' | 'pregnant' | 'completed' | 'failed';
  offspringIds: EntityId[]; // Resulting offspring
}

/** Expansion target being evaluated */
export interface ExpansionTarget {
  targetId: EntityId;
  species: string;
  estimatedResistance: number;
  strategicValue: number;
  accessibleVia: EntityId[]; // Which hosts can reach this target
  priority: number;
  status: 'identified' | 'stalking' | 'attempting' | 'colonized' | 'failed';
}

/** Genetic lineage tracking within the collective */
export interface ParasiteLineage {
  lineageId: string;
  originTick: Tick;
  generation: number;
  currentHostId?: EntityId;
  hostHistory: EntityId[];
  mutations: string[];
  specialAbilities: string[];
}

/**
 * Component representing the parasitic hive mind collective.
 */
export class CollectiveMindComponent extends ComponentBase {
  public readonly type = 'collective_mind';

  // ============================================================================
  // Identity
  // ============================================================================

  /** Unique identifier for this collective */
  public collectiveId: string = '';

  /** Name the collective uses (for infiltration purposes) */
  public publicName: string = 'The Community';

  /** Internal designation */
  public trueName: string = 'Collective Prime';

  /** When this collective was founded */
  public foundingTick: Tick = 0 as Tick;

  // ============================================================================
  // Strategy & Goals
  // ============================================================================

  /** Current strategic priority */
  public currentStrategy: CollectiveStrategy = 'expansion';

  /** Target population size */
  public targetPopulation: number = 100;

  /** Minimum population for survival */
  public minimumViablePopulation: number = 10;

  /** Current morale/cohesion of the collective (0-1) */
  public cohesion: number = 1.0;

  /** Long-term goals */
  public objectives: string[] = ['expand', 'survive', 'optimize_host_genetics'];

  // ============================================================================
  // Host Management
  // ============================================================================

  /** All colonized hosts */
  public hosts: Map<EntityId, ColonizedHostRecord> = new Map();

  /** Hosts that have been lost */
  public lostHosts: Array<{
    hostId: EntityId;
    lostTick: Tick;
    reason: 'death' | 'decolonization' | 'rejection' | 'destroyed';
    parasiteLineageId: string;
    parasiteSurvived: boolean;
  }> = [];

  /** Maximum hosts this collective can effectively control */
  public controlCapacity: number = 1000;

  // ============================================================================
  // Breeding Management
  // ============================================================================

  /** Active breeding assignments */
  public breedingAssignments: BreedingAssignment[] = [];

  /** Desired genetic traits to propagate */
  public desiredTraits: string[] = ['strength', 'intelligence', 'resistance_to_disease'];

  /** Traits to eliminate from the host population */
  public undesiredTraits: string[] = ['weak_constitution', 'mental_instability'];

  /** Minimum genetic diversity threshold */
  public geneticDiversityThreshold: number = 0.7;

  /** Current genetic diversity score */
  public currentGeneticDiversity: number = 0.8;

  // ============================================================================
  // Expansion
  // ============================================================================

  /** Potential hosts being evaluated for colonization */
  public expansionTargets: ExpansionTarget[] = [];

  /** Species prioritized for colonization */
  public preferredHostSpecies: string[] = ['human', 'elf'];

  /** Expansion rate (hosts colonized per 1000 ticks) */
  public targetExpansionRate: number = 5;

  /** Current expansion rate */
  public currentExpansionRate: number = 0;

  // ============================================================================
  // Parasite Lineages
  // ============================================================================

  /** All parasite lineages in this collective */
  public lineages: Map<string, ParasiteLineage> = new Map();

  /** Next lineage ID to assign */
  public nextLineageId: number = 1;

  // ============================================================================
  // Communication & Detection
  // ============================================================================

  /** How hosts communicate (telepathy range, etc.) */
  public communicationRange: number = 1000; // Map units

  /** Whether the collective has been detected by outsiders */
  public exposureLevel: number = 0; // 0 = hidden, 1 = fully exposed

  /** Entities that suspect or know about the collective */
  public knownTo: EntityId[] = [];

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Register a newly colonized host.
   */
  public registerHost(
    hostId: EntityId,
    parasiteLineageId: string,
    currentTick: Tick,
    hostData: Partial<ColonizedHostRecord>,
  ): void {
    const record: ColonizedHostRecord = {
      hostId,
      parasiteLineageId,
      colonizationTick: currentTick,
      integrationLevel: 0,
      controlLevel: 'contested',
      hostSpecies: hostData.hostSpecies ?? 'unknown',
      hostAge: hostData.hostAge ?? 0,
      hostSex: hostData.hostSex ?? 'unknown',
      hostFertile: hostData.hostFertile ?? false,
      hostSkills: hostData.hostSkills ?? [],
      hostSocialPosition: hostData.hostSocialPosition ?? [],
      strategicValue: hostData.strategicValue ?? 0.5,
      breedingValue: hostData.breedingValue ?? 0.5,
      infiltrationValue: hostData.infiltrationValue ?? 0.5,
    };

    this.hosts.set(hostId, record);
    this.updateExpansionRate();
  }

  /**
   * Remove a host from the collective.
   */
  public removeHost(
    hostId: EntityId,
    reason: 'death' | 'decolonization' | 'rejection' | 'destroyed',
    currentTick: Tick,
    parasiteSurvived: boolean = false,
  ): void {
    const host = this.hosts.get(hostId);
    if (!host) return;

    this.lostHosts.push({
      hostId,
      lostTick: currentTick,
      reason,
      parasiteLineageId: host.parasiteLineageId,
      parasiteSurvived,
    });

    // Remove from breeding assignments
    this.breedingAssignments = this.breedingAssignments.filter(
      (a) => a.host1Id !== hostId && a.host2Id !== hostId,
    );

    this.hosts.delete(hostId);
    this.updateCohesion();
  }

  /**
   * Assign a breeding pair.
   */
  public assignBreedingPair(
    host1Id: EntityId,
    host2Id: EntityId,
    priority: number,
    desiredTraits: string[],
    currentTick: Tick,
  ): BreedingAssignment {
    const host1 = this.hosts.get(host1Id);
    const host2 = this.hosts.get(host2Id);

    if (!host1 || !host2) {
      throw new Error('Cannot assign breeding pair: one or both hosts not in collective');
    }

    const assignment: BreedingAssignment = {
      host1Id,
      host2Id,
      priority,
      desiredTraits,
      assignedTick: currentTick,
      status: 'pending',
      offspringIds: [],
    };

    // Update host records
    host1.currentAssignment = 'breeding';
    host1.assignedMateId = host2Id;
    host2.currentAssignment = 'breeding';
    host2.assignedMateId = host1Id;

    this.breedingAssignments.push(assignment);
    return assignment;
  }

  /**
   * Record offspring from a breeding assignment.
   */
  public recordOffspring(
    parentIds: [EntityId, EntityId],
    offspringId: EntityId,
    _currentTick: Tick,
  ): void {
    const assignment = this.breedingAssignments.find(
      (a) =>
        (a.host1Id === parentIds[0] && a.host2Id === parentIds[1]) ||
        (a.host1Id === parentIds[1] && a.host2Id === parentIds[0]),
    );

    if (assignment) {
      assignment.offspringIds.push(offspringId);
      assignment.status = 'completed';
    }

    // Offspring should be colonized - add to expansion targets with highest priority
    this.expansionTargets.push({
      targetId: offspringId,
      species: 'newborn',
      estimatedResistance: 0.1, // Newborns have low resistance
      strategicValue: 0.9, // High value - raised from birth
      accessibleVia: parentIds as EntityId[],
      priority: 100, // Maximum priority
      status: 'identified',
    });
  }

  /**
   * Evaluate and select breeding pairs based on genetic optimization.
   */
  public evaluateBreedingPairs(): Array<{
    host1Id: EntityId;
    host2Id: EntityId;
    score: number;
    traits: string[];
  }> {
    const fertileHosts = Array.from(this.hosts.values()).filter(
      (h) =>
        h.hostFertile &&
        h.integrationLevel >= 0.8 &&
        h.currentAssignment !== 'breeding',
    );

    const males = fertileHosts.filter((h) => h.hostSex === 'male' || h.hostSex === 'host_male');
    const females = fertileHosts.filter((h) => h.hostSex === 'female' || h.hostSex === 'host_female');

    const pairs: Array<{ host1Id: EntityId; host2Id: EntityId; score: number; traits: string[] }> = [];

    for (const male of males) {
      for (const female of females) {
        // Calculate genetic compatibility score
        const diversityBonus = this.calculateGeneticDiversity(male, female);
        const traitScore = this.calculateTraitScore(male, female);
        const score = diversityBonus * 0.4 + traitScore * 0.6;

        pairs.push({
          host1Id: male.hostId,
          host2Id: female.hostId,
          score,
          traits: this.predictOffspringTraits(male, female),
        });
      }
    }

    // Sort by score descending
    pairs.sort((a, b) => b.score - a.score);
    return pairs;
  }

  /**
   * Identify and prioritize expansion targets.
   */
  public identifyExpansionTargets(
    potentialTargets: Array<{ id: EntityId; species: string; resistance: number; socialValue: number }>,
  ): void {
    for (const target of potentialTargets) {
      // Skip if already colonized or targeted
      if (this.hosts.has(target.id)) continue;
      if (this.expansionTargets.some((t) => t.targetId === target.id)) continue;

      // Calculate strategic value
      const speciesBonus = this.preferredHostSpecies.includes(target.species) ? 0.3 : 0;
      const strategicValue = target.socialValue + speciesBonus;

      // Find hosts that could access this target
      const accessibleVia = Array.from(this.hosts.values())
        .filter((h) => h.infiltrationValue > 0.5)
        .map((h) => h.hostId);

      this.expansionTargets.push({
        targetId: target.id,
        species: target.species,
        estimatedResistance: target.resistance,
        strategicValue,
        accessibleVia,
        priority: Math.round(strategicValue * 100 - target.resistance * 50),
        status: 'identified',
      });
    }

    // Sort by priority
    this.expansionTargets.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate a new parasite lineage ID.
   */
  public createLineage(currentTick: Tick, parentLineageId?: string): ParasiteLineage {
    const lineageId = `${this.collectiveId}-L${this.nextLineageId++}`;

    const parentLineage = parentLineageId ? this.lineages.get(parentLineageId) : undefined;
    const generation = parentLineage ? parentLineage.generation + 1 : 0;

    const lineage: ParasiteLineage = {
      lineageId,
      originTick: currentTick,
      generation,
      hostHistory: [],
      mutations: [],
      specialAbilities: parentLineage ? [...parentLineage.specialAbilities] : [],
    };

    this.lineages.set(lineageId, lineage);
    return lineage;
  }

  /**
   * Update collective cohesion based on host count and status.
   */
  private updateCohesion(): void {
    const hostCount = this.hosts.size;

    if (hostCount < this.minimumViablePopulation) {
      this.cohesion = hostCount / this.minimumViablePopulation;
    } else if (hostCount > this.controlCapacity) {
      // Too many hosts strains the collective
      this.cohesion = Math.max(0.5, 1 - (hostCount - this.controlCapacity) / this.controlCapacity);
    } else {
      this.cohesion = 1.0;
    }
  }

  /**
   * Update expansion rate tracking.
   */
  private updateExpansionRate(): void {
    // Simple rate calculation - would be more sophisticated in production
    this.currentExpansionRate = this.hosts.size * 0.05;
  }

  /**
   * Calculate genetic diversity between two hosts.
   */
  private calculateGeneticDiversity(host1: ColonizedHostRecord, host2: ColonizedHostRecord): number {
    // In a real implementation, this would compare genetic markers
    // For now, different species = maximum diversity
    if (host1.hostSpecies !== host2.hostSpecies) return 1.0;

    // Check for shared lineage (inbreeding avoidance)
    const lineage1 = this.lineages.get(host1.parasiteLineageId);
    const lineage2 = this.lineages.get(host2.parasiteLineageId);

    if (lineage1 && lineage2) {
      const sharedHistory = lineage1.hostHistory.filter((h) => lineage2.hostHistory.includes(h));
      if (sharedHistory.length > 0) return 0.3; // Related
    }

    return 0.7; // Baseline diversity
  }

  /**
   * Calculate trait desirability score.
   */
  private calculateTraitScore(host1: ColonizedHostRecord, host2: ColonizedHostRecord): number {
    const allSkills = [...host1.hostSkills, ...host2.hostSkills];
    const desiredCount = allSkills.filter((s) => this.desiredTraits.includes(s)).length;
    const undesiredCount = allSkills.filter((s) => this.undesiredTraits.includes(s)).length;

    return Math.min(1, Math.max(0, (desiredCount * 0.2 - undesiredCount * 0.3 + 0.5)));
  }

  /**
   * Predict likely traits in offspring.
   */
  private predictOffspringTraits(host1: ColonizedHostRecord, host2: ColonizedHostRecord): string[] {
    // Offspring likely to inherit traits present in both parents
    return host1.hostSkills.filter((s) => host2.hostSkills.includes(s));
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new parasitic collective.
 */
export function createCollective(
  collectiveId: string,
  trueName: string,
  currentTick: Tick,
): CollectiveMindComponent {
  const component = new CollectiveMindComponent();
  component.collectiveId = collectiveId;
  component.trueName = trueName;
  component.foundingTick = currentTick;
  return component;
}

/**
 * Create a collective focused on aggressive expansion.
 */
export function createExpansionistCollective(
  collectiveId: string,
  currentTick: Tick,
): CollectiveMindComponent {
  const component = createCollective(collectiveId, 'The Swarm', currentTick);
  component.currentStrategy = 'expansion';
  component.targetExpansionRate = 10;
  component.targetPopulation = 500;
  return component;
}

/**
 * Create a collective focused on stealth infiltration.
 */
export function createInfiltratorCollective(
  collectiveId: string,
  currentTick: Tick,
): CollectiveMindComponent {
  const component = createCollective(collectiveId, 'The Shadow', currentTick);
  component.currentStrategy = 'infiltration';
  component.targetExpansionRate = 2;
  component.targetPopulation = 50;
  component.publicName = 'The Neighborhood Association';
  return component;
}

/**
 * Create a collective focused on breeding superior hosts.
 */
export function createEugenicsCollective(
  collectiveId: string,
  currentTick: Tick,
): CollectiveMindComponent {
  const component = createCollective(collectiveId, 'The Perfectors', currentTick);
  component.currentStrategy = 'breeding';
  component.desiredTraits = ['strength', 'intelligence', 'longevity', 'disease_immunity'];
  component.geneticDiversityThreshold = 0.8;
  return component;
}
