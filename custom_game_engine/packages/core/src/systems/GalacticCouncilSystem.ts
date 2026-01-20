/**
 * GalacticCouncilSystem - Galaxy-wide multi-species governance
 *
 * This system handles:
 * - Multi-species voting mechanics with weighted voting power
 * - Universal law enforcement across all civilizations
 * - Peacekeeping mission coordination
 * - Existential crisis response
 * - Inter-species dispute mediation
 * - Species membership management
 * - Integration with LLM governors for strategic decisions
 *
 * Priority: 210 (governance tier, after empire but before economy)
 *
 * Per 06-POLITICAL-HIERARCHY.md (Tier 6):
 * - Galactic Council is the highest political tier
 * - Population: 1T+ across galaxy
 * - Territory: Galaxy-wide
 * - Time Scale: 1 century/tick (cosmic simulation)
 * - Multi-species cooperation and universal laws
 *
 * Throttle: 72000 ticks (1 hour at 20 TPS) - galactic scale, ultra-infrequent updates
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  GalacticCouncilComponent,
  GalacticDelegate,
  PeacekeepingMission,
  UniversalLaw,
  LawViolation,
  GalacticDispute,
  ExistentialThreat,
  Species,
} from '../components/GalacticCouncilComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Species voting record for law proposals
 */
interface SpeciesVote {
  speciesName: string;
  vote: 'approve' | 'reject' | 'abstain';
  votingPower: number;
}

/**
 * Law proposal for voting
 */
interface LawProposal {
  id: string;
  name: string;
  description: string;
  scope: 'war_crimes' | 'trade' | 'rights' | 'environment' | 'technology';
  proposedBy: string; // Species name
  votes: SpeciesVote[];
  requiresSupermajority: boolean; // 75% for universal laws
}

/**
 * Crisis response coordination
 */
interface CrisisResponse {
  crisisId: string;
  respondingSpecies: string[];
  resourcesMobilized: number;
  fleetsMobilized: string[];
  status: 'planning' | 'executing' | 'resolved' | 'failed';
}

// ============================================================================
// System
// ============================================================================

export class GalacticCouncilSystem extends BaseSystem {
  public readonly id: SystemId = 'galactic_council' as SystemId;
  public readonly priority: number = 210;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.GalacticCouncil];
  public readonly activationComponents = ['galactic_council'] as const;
  public readonly metadata = {
    category: 'economy' as const, // Governance systems use 'economy' category
    description: 'Processes galaxy-wide multi-species governance',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.GalacticCouncil, CT.Navy, CT.Species] as const,
  } as const;

  // Update interval: 72000 ticks = 1 hour at 20 TPS (galactic cycle)
  // Time scale: 1 century per tick (highest tier)
  protected readonly throttleInterval = 72000;

  // ========================================================================
  // State
  // ========================================================================

  private councilLastUpdateTick: Map<string, number> = new Map();
  private pendingLawProposals: Map<string, LawProposal[]> = new Map();
  private activeCrisisResponses: Map<string, CrisisResponse[]> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each galactic council
    for (const councilEntity of ctx.activeEntities) {
      const council = councilEntity.getComponent<GalacticCouncilComponent>(CT.GalacticCouncil);
      if (!council) continue;

      // Check if galactic update is due
      const lastUpdate = this.councilLastUpdateTick.get(council.name) || 0;
      const timeSinceLastUpdate = tick - lastUpdate;

      if (timeSinceLastUpdate >= this.throttleInterval) {
        this.processGalacticUpdate(ctx.world, councilEntity as EntityImpl, tick);
        this.councilLastUpdateTick.set(council.name, tick);
      }
    }
  }

  // ========================================================================
  // Galactic Update
  // ========================================================================

  /**
   * Process galactic council's update cycle
   *
   * This handles:
   * - Update galaxy state (stars, planets, civilizations)
   * - Track species civilizations
   * - Process universal laws
   * - Manage peacekeeping missions
   * - Handle existential crises
   * - Mediate disputes
   * - Update species voting records
   */
  private processGalacticUpdate(world: World, councilEntity: EntityImpl, tick: number): void {
    const council = councilEntity.getComponent<GalacticCouncilComponent>(CT.GalacticCouncil);
    if (!council) return;

    // Step 1: Update galaxy state
    const galaxyStats = this.updateGalaxyState(world, council);

    // Step 2: Track species civilizations
    this.trackSpeciesCivilizations(world, council);

    // Step 3: Process universal laws
    this.enforceUniversalLaws(world, council, councilEntity, tick);

    // Step 4: Manage peacekeeping missions
    this.managePeacekeepingMissions(world, council, councilEntity, tick);

    // Step 5: Handle existential crises
    this.respondToCrises(world, council, councilEntity, tick);

    // Step 6: Mediate disputes
    this.mediateDisputes(world, council, councilEntity, tick);

    // Step 7: Update council component
    councilEntity.updateComponent<GalacticCouncilComponent>(CT.GalacticCouncil, (c) => ({
      ...c,
      totalPopulation: galaxyStats.totalPopulation,
      totalSectors: galaxyStats.totalSectors,
      lastCosmicUpdateTick: tick,
    }));

    // Step 8: Emit update event
    world.eventBus.emit({
      type: 'galactic_council:cosmic_update',
      source: councilEntity.id,
      data: {
        councilName: council.name,
        speciesCount: council.memberSpecies.length,
        totalPopulation: galaxyStats.totalPopulation,
        universalLaws: council.universalLaws.length,
        peacekeepingMissions: council.peacekeepingForces.activeMissions.length,
        existentialThreats: council.science.existentialThreats.length,
        tick,
      },
    });
  }

  // ========================================================================
  // Galaxy State
  // ========================================================================

  /**
   * Update galaxy-wide statistics
   */
  private updateGalaxyState(
    world: World,
    council: GalacticCouncilComponent
  ): {
    totalPopulation: number;
    totalSectors: number;
  } {
    let totalPopulation = 0;
    let totalSectors = 0;

    // Aggregate from member species
    for (const species of council.memberSpecies) {
      totalPopulation += species.population;
    }

    // Calculate sectors from member federations and empires
    totalSectors = council.totalSectors; // Use existing value as baseline

    return {
      totalPopulation,
      totalSectors,
    };
  }

  // ========================================================================
  // Species Tracking
  // ========================================================================

  /**
   * Track species civilizations and update their attributes
   */
  private trackSpeciesCivilizations(world: World, council: GalacticCouncilComponent): void {
    // Query all species components
    const speciesEntities = world.query().with(CT.Species).executeEntities();

    for (const entity of speciesEntities) {
      const speciesComp = entity.getComponent<SpeciesComponent>(CT.Species);
      if (!speciesComp) continue;

      // Check if species is already in council
      const existingSpecies = council.memberSpecies.find((s) => s.name === speciesComp.name);

      if (existingSpecies) {
        // Update species attributes
        existingSpecies.population = speciesComp.population;
        existingSpecies.techLevel = speciesComp.techLevel;
      } else {
        // Auto-add species if space age (tech level 7+)
        if (speciesComp.techLevel >= 7) {
          this.addSpeciesToCouncil(world, council, entity.id, speciesComp);
        }
      }
    }
  }

  // ========================================================================
  // Universal Law Enforcement
  // ========================================================================

  /**
   * Enforce universal laws across all civilizations
   */
  private enforceUniversalLaws(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    tick: number
  ): void {
    for (const law of council.universalLaws) {
      // Check compliance across all species
      const violations = this.detectLawViolations(world, council, law);

      // Apply sanctions for violations
      for (const violation of violations) {
        this.applySanctions(world, council, councilEntity, law, violation, tick);
      }

      // Update compliance rate
      const totalCivilizations = council.memberSpecies.length;
      const compliantCivilizations = totalCivilizations - violations.length;
      law.complianceRate = totalCivilizations > 0 ? compliantCivilizations / totalCivilizations : 1;
    }
  }

  /**
   * Detect law violations
   */
  private detectLawViolations(
    world: World,
    council: GalacticCouncilComponent,
    law: UniversalLaw
  ): LawViolation[] {
    const violations: LawViolation[] = [];

    // Check each species for violations (simplified detection logic)
    // In a full implementation, this would query civilizations' actions
    // For now, random chance based on law scope

    for (const species of council.memberSpecies) {
      // Aggressive species more likely to violate war crimes laws
      if (law.scope === 'war_crimes' && Math.random() < 0.1) {
        violations.push({
          violatorId: species.name,
          violationType: law.scope,
          evidence: `Species ${species.name} suspected of war crimes`,
        });
      }

      // Tech-advanced species more likely to violate tech laws
      if (law.scope === 'technology' && species.techLevel > 10 && Math.random() < 0.05) {
        violations.push({
          violatorId: species.name,
          violationType: law.scope,
          evidence: `Species ${species.name} developing banned technology`,
        });
      }
    }

    return violations;
  }

  /**
   * Apply sanctions for law violations
   */
  private applySanctions(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    law: UniversalLaw,
    violation: LawViolation,
    tick: number
  ): void {
    // Determine sanction severity based on violation type
    const sanctions: string[] = [];

    if (violation.violationType === 'war_crimes') {
      sanctions.push('trade_embargo', 'tech_sharing_cutoff');
    } else if (violation.violationType === 'technology') {
      sanctions.push('research_ban', 'inspection_team');
    } else {
      sanctions.push('diplomatic_censure');
    }

    // Update violation with sanctions
    violation.sanctionsImposed = sanctions;

    // Add to law violations array
    law.violations.push(violation);

    // Emit violation event
    world.eventBus.emit({
      type: 'galactic_council:violation_detected',
      source: councilEntity.id,
      data: {
        councilName: council.name,
        lawName: law.name,
        violatorId: violation.violatorId,
        violationType: violation.violationType,
        sanctions,
        tick,
      },
    });
  }

  // ========================================================================
  // Peacekeeping Missions
  // ========================================================================

  /**
   * Manage active peacekeeping missions
   */
  private managePeacekeepingMissions(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    tick: number
  ): void {
    for (const mission of council.peacekeepingForces.activeMissions) {
      // Update mission status based on duration
      const missionDuration = tick - mission.startedTick;

      // Missions complete after ~10 cosmic cycles (10 hours real-time)
      if (missionDuration > this.throttleInterval * 10) {
        mission.status = 'completed';

        world.eventBus.emit({
          type: 'galactic_council:peacekeeping_completed',
          source: councilEntity.id,
          data: {
            councilName: council.name,
            missionName: mission.name,
            missionType: mission.type,
            duration: missionDuration,
            tick,
          },
        });
      }
    }

    // Remove completed missions
    council.peacekeepingForces.activeMissions = council.peacekeepingForces.activeMissions.filter(
      (m) => m.status === 'active'
    );
  }

  /**
   * Deploy peacekeeping mission
   */
  public deployPeacekeepingMission(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    missionType: PeacekeepingMission['type'],
    location: string,
    objective: string,
    tick: number
  ): void {
    // Query participating species' navies
    const fleetsDeployed: string[] = [];
    const navyEntities = world.query().with(CT.Navy).executeEntities();

    for (const navyEntity of navyEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Check if navy belongs to council member species
      const memberSpecies = council.memberSpecies.find((s) => s.name === navy.factionId);
      if (memberSpecies) {
        // Contribute 10% of navy to peacekeeping
        const fleetsToContribute = Math.max(1, Math.floor(navy.assets.totalFleets * 0.1));
        for (let i = 0; i < fleetsToContribute; i++) {
          fleetsDeployed.push(`${navy.factionId}_fleet_${i}`);
        }
      }
    }

    // Create mission
    const mission: PeacekeepingMission = {
      id: `mission_${tick}_${missionType}`,
      name: `Peacekeeping: ${objective}`,
      type: missionType,
      location,
      fleetsDeployed,
      objective,
      status: 'active',
      startedTick: tick,
    };

    council.peacekeepingForces.activeMissions.push(mission);

    // Emit event
    world.eventBus.emit({
      type: 'galactic_council:peacekeeping_deployed',
      source: councilEntity.id,
      data: {
        councilName: council.name,
        missionName: mission.name,
        missionType,
        location,
        fleetsDeployed: fleetsDeployed.length,
        tick,
      },
    });
  }

  // ========================================================================
  // Crisis Response
  // ========================================================================

  /**
   * Respond to existential crises
   */
  private respondToCrises(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    tick: number
  ): void {
    for (const crisis of council.science.existentialThreats) {
      // Check if crisis requires emergency response
      if (crisis.severity === 'extinction_level' || crisis.severity === 'major') {
        // Mobilize resources from all species
        const response = this.mobilizeCrisisResponse(world, council, crisis, tick);

        // Track response
        const existingResponses = this.activeCrisisResponses.get(council.name) || [];
        existingResponses.push(response);
        this.activeCrisisResponses.set(council.name, existingResponses);

        // Emit crisis event
        world.eventBus.emit({
          type: 'galactic_council:crisis_declared',
          source: councilEntity.id,
          data: {
            councilName: council.name,
            crisisType: crisis.type,
            severity: crisis.severity,
            affectedSectors: crisis.affectedSectors.length,
            tick,
          },
        });
      }
    }
  }

  /**
   * Mobilize crisis response
   */
  private mobilizeCrisisResponse(
    world: World,
    council: GalacticCouncilComponent,
    crisis: ExistentialThreat,
    tick: number
  ): CrisisResponse {
    const respondingSpecies: string[] = [];
    const fleetsMobilized: string[] = [];

    // All species contribute to existential threats
    for (const species of council.memberSpecies) {
      respondingSpecies.push(species.name);
    }

    // Query navies for fleet mobilization
    const navyEntities = world.query().with(CT.Navy).executeEntities();

    for (const navyEntity of navyEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Check if navy belongs to responding species
      if (respondingSpecies.includes(navy.factionId)) {
        // Mobilize 50% of navy for existential crisis
        const fleetsToMobilize = Math.max(1, Math.floor(navy.assets.totalFleets * 0.5));
        for (let i = 0; i < fleetsToMobilize; i++) {
          fleetsMobilized.push(`${navy.factionId}_fleet_${i}`);
        }
      }
    }

    return {
      crisisId: `crisis_${tick}_${crisis.type}`,
      respondingSpecies,
      resourcesMobilized: respondingSpecies.length * 1000000, // 1M resources per species
      fleetsMobilized,
      status: 'executing',
    };
  }

  // ========================================================================
  // Dispute Mediation
  // ========================================================================

  /**
   * Mediate inter-species disputes
   */
  private mediateDisputes(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    tick: number
  ): void {
    for (const dispute of council.disputes.activeDisputes) {
      // Only mediate unresolved disputes
      if (dispute.status !== 'unresolved' && dispute.status !== 'mediation') {
        continue;
      }

      // Assign mediators if not already assigned
      if (!dispute.mediatorAgentId) {
        dispute.mediatorAgentId = this.assignMediator(council, dispute);
        dispute.status = 'mediation';
      }

      // Mediation takes time (simplified: 5 cosmic cycles = 5 hours)
      const mediationDuration = tick - dispute.startedTick;
      if (mediationDuration > this.throttleInterval * 5) {
        // Resolve dispute (simplified: 70% success rate)
        const resolved = Math.random() < 0.7;

        if (resolved) {
          dispute.status = 'resolved';
          dispute.resolvedTick = tick;

          // Move to resolved disputes
          council.disputes.resolvedDisputes.push(dispute);

          world.eventBus.emit({
            type: 'galactic_council:dispute_resolved',
            source: councilEntity.id,
            data: {
              councilName: council.name,
              disputeId: dispute.id,
              disputeType: dispute.type,
              parties: dispute.parties,
              tick,
            },
          });
        } else {
          // Escalation to war
          dispute.status = 'escalated_to_war';

          world.eventBus.emit({
            type: 'galactic_council:dispute_escalated',
            source: councilEntity.id,
            data: {
              councilName: council.name,
              disputeId: dispute.id,
              disputeType: dispute.type,
              parties: dispute.parties,
              tick,
            },
          });
        }
      }
    }

    // Remove resolved/escalated disputes from active list
    council.disputes.activeDisputes = council.disputes.activeDisputes.filter(
      (d) => d.status === 'unresolved' || d.status === 'mediation'
    );
  }

  /**
   * Assign mediator for dispute
   */
  private assignMediator(council: GalacticCouncilComponent, dispute: GalacticDispute): string {
    // Find neutral species (not involved in dispute)
    const neutralSpecies = council.memberSpecies.filter(
      (s) => !dispute.parties.includes(s.name)
    );

    if (neutralSpecies.length > 0) {
      // Pick species with highest tech level (most advanced = most diplomatic)
      const mediator = neutralSpecies.reduce((prev, current) =>
        current.techLevel > prev.techLevel ? current : prev
      );

      return mediator.representativeAgentId || mediator.name;
    }

    // Fallback: Secretary-General
    return council.secretaryGeneralAgentId || 'council_secretary';
  }

  // ========================================================================
  // Species Membership
  // ========================================================================

  /**
   * Add species to galactic council
   */
  public addSpeciesToCouncil(
    world: World,
    council: GalacticCouncilComponent,
    speciesEntityId: string,
    speciesComp: SpeciesComponent
  ): void {
    // Check if species already exists
    const existing = council.memberSpecies.find((s) => s.name === speciesComp.name);
    if (existing) return;

    // Create species record
    const species: Species = {
      name: speciesComp.name,
      homeworld: speciesComp.homeworld || 'Unknown',
      population: speciesComp.population,
      techLevel: speciesComp.techLevel,
      representativeAgentId: speciesEntityId,
    };

    // Add to council
    council.memberSpecies.push(species);

    // Create delegate
    const votingPower = this.calculateVotingPower(species);
    const delegate: GalacticDelegate = {
      memberStateId: species.name,
      delegateAgentId: speciesEntityId,
      votingPower,
    };

    council.assemblyDelegates.push(delegate);

    // Emit event
    world.eventBus.emit({
      type: 'galactic_council:species_joined',
      source: speciesEntityId,
      data: {
        councilName: council.name,
        speciesName: species.name,
        homeworld: species.homeworld,
        techLevel: species.techLevel,
        votingPower,
        tick: world.tick,
      },
    });
  }

  // ========================================================================
  // Voting Mechanics
  // ========================================================================

  /**
   * Calculate voting power for species
   *
   * Formula: power = (population^0.3 + techLevel*10) / totalPower
   * - Population influence: Diminishing returns (cube root)
   * - Tech influence: Linear (advanced civs have more say)
   */
  private calculateVotingPower(species: Species): number {
    const populationFactor = Math.pow(species.population, 0.3);
    const techFactor = species.techLevel * 10;
    return populationFactor + techFactor;
  }

  /**
   * Normalize voting power across all delegates
   */
  public normalizeVotingPower(council: GalacticCouncilComponent): void {
    const totalPower = council.assemblyDelegates.reduce((sum, d) => sum + d.votingPower, 0);

    if (totalPower === 0) return;

    for (const delegate of council.assemblyDelegates) {
      delegate.votingPower = delegate.votingPower / totalPower;
    }
  }

  /**
   * Propose universal law
   */
  public proposeLaw(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    proposedBy: string,
    lawName: string,
    lawDescription: string,
    scope: UniversalLaw['scope'],
    tick: number
  ): void {
    // Create proposal
    const proposal: LawProposal = {
      id: `law_proposal_${tick}_${lawName}`,
      name: lawName,
      description: lawDescription,
      scope,
      proposedBy,
      votes: [],
      requiresSupermajority: true, // Universal laws require 75% majority
    };

    // Add to pending proposals
    const pendingProposals = this.pendingLawProposals.get(council.name) || [];
    pendingProposals.push(proposal);
    this.pendingLawProposals.set(council.name, pendingProposals);

    // Emit event
    world.eventBus.emit({
      type: 'galactic_council:law_proposed',
      source: councilEntity.id,
      data: {
        councilName: council.name,
        proposalId: proposal.id,
        lawName,
        scope,
        proposedBy,
        tick,
      },
    });
  }

  /**
   * Vote on law proposal
   */
  public voteOnLaw(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    proposalId: string,
    speciesName: string,
    vote: 'approve' | 'reject' | 'abstain',
    tick: number
  ): void {
    const pendingProposals = this.pendingLawProposals.get(council.name) || [];
    const proposal = pendingProposals.find((p) => p.id === proposalId);

    if (!proposal) {
      throw new Error(`Law proposal ${proposalId} not found`);
    }

    // Find delegate voting power
    const delegate = council.assemblyDelegates.find((d) => d.memberStateId === speciesName);
    if (!delegate) {
      throw new Error(`Species ${speciesName} not found in council`);
    }

    // Record vote
    proposal.votes.push({
      speciesName,
      vote,
      votingPower: delegate.votingPower,
    });

    // Check if all species have voted
    if (proposal.votes.length === council.memberSpecies.length) {
      this.concludeVote(world, council, councilEntity, proposal, tick);
    }
  }

  /**
   * Conclude vote on law proposal
   */
  private concludeVote(
    world: World,
    council: GalacticCouncilComponent,
    councilEntity: EntityImpl,
    proposal: LawProposal,
    tick: number
  ): void {
    // Calculate vote outcome
    let approvalPower = 0;
    let totalPower = 0;

    for (const vote of proposal.votes) {
      totalPower += vote.votingPower;
      if (vote.vote === 'approve') {
        approvalPower += vote.votingPower;
      }
    }

    const approvalPercentage = totalPower > 0 ? approvalPower / totalPower : 0;

    // Check if proposal passes
    const threshold = proposal.requiresSupermajority ? 0.75 : 0.51;
    const passed = approvalPercentage >= threshold;

    if (passed) {
      // Enact law
      const law: UniversalLaw = {
        name: proposal.name,
        description: proposal.description,
        scope: proposal.scope,
        enforcedInSectors: [], // Will be populated by enforcement system
        complianceRate: 1.0, // Start at 100%
        violations: [],
        enactedTick: tick,
      };

      council.universalLaws.push(law);

      world.eventBus.emit({
        type: 'galactic_council:law_passed',
        source: councilEntity.id,
        data: {
          councilName: council.name,
          lawName: law.name,
          scope: law.scope,
          approvalPercentage,
          tick,
        },
      });
    } else {
      world.eventBus.emit({
        type: 'galactic_council:law_rejected',
        source: councilEntity.id,
        data: {
          councilName: council.name,
          proposalId: proposal.id,
          lawName: proposal.name,
          approvalPercentage,
          tick,
        },
      });
    }

    // Remove from pending proposals
    const pendingProposals = this.pendingLawProposals.get(council.name) || [];
    this.pendingLawProposals.set(
      council.name,
      pendingProposals.filter((p) => p.id !== proposal.id)
    );
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Get council entity by name
   */
  public getCouncilEntity(world: World, councilName: string): EntityImpl | null {
    const councils = world.query().with(CT.GalacticCouncil).executeEntities();

    for (const entity of councils) {
      const council = entity.getComponent<GalacticCouncilComponent>(CT.GalacticCouncil);
      if (council && council.name === councilName) {
        return entity as EntityImpl;
      }
    }

    return null;
  }

  /**
   * Check if species can veto (tech level 13+ = transcendent civilizations)
   */
  public canVeto(species: Species): boolean {
    return species.techLevel >= 13;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: GalacticCouncilSystem | null = null;

export function getGalacticCouncilSystem(): GalacticCouncilSystem {
  if (!systemInstance) {
    systemInstance = new GalacticCouncilSystem();
  }
  return systemInstance;
}
