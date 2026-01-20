/**
 * FederationGovernanceSystem - Multi-empire cooperative governance (Tier 5)
 *
 * Per 06-POLITICAL-HIERARCHY.md (lines 2158-2324): Federations are voluntary alliances
 * of empires/nations operating at pan-galactic scale with rotating presidency,
 * unified military command, and common economic policies.
 *
 * Population: 50B-5T | Territory: Multi-empire tier | Time Scale: 1 decade/tick
 *
 * This system handles:
 * - Federal assembly voting (weighted by population)
 * - Federal law enforcement across all member states
 * - Member satisfaction tracking and secession mechanics
 * - Joint military operations coordination
 * - Federal treasury and trade union management
 * - LLM-driven presidential decisions
 *
 * Priority: 205 (after EmpireSystem at 200, strategic governance tier)
 * Throttle: 12000 ticks (10 minutes) - very infrequent strategic updates
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  FederationGovernanceComponent,
  FederalLaw,
  FederalRepresentative,
  JointOperation,
  FederationRelation,
} from '../components/FederationGovernanceComponent.ts';
import type { EmpireComponent } from '../components/EmpireComponent.js';
import type { NationComponent } from '../components/NationComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Federal proposal with voting tracking
 */
interface FederalProposal {
  id: string;
  name: string;
  description: string;
  type: 'law' | 'treaty' | 'budget' | 'military' | 'tariff';
  scope: 'trade' | 'military' | 'justice' | 'rights' | 'environment';

  // Voting
  proposerId: string; // Member empire/nation ID
  debateStartTick: number;
  debateDuration: number; // Ticks (usually 3)
  votingStartTick?: number;

  votes: Map<string, 'for' | 'against' | 'abstain'>; // Member ID -> vote
  votingPowerFor: number; // 0-1
  votingPowerAgainst: number; // 0-1
  votingPowerAbstained: number; // 0-1

  status: 'debating' | 'voting' | 'passed' | 'failed' | 'vetoed';
  requiresSupermajority: boolean; // 66% for constitutional changes
}

/**
 * Member satisfaction breakdown
 */
interface MemberSatisfaction {
  memberId: string;
  overall: number; // 0-1

  // Components (each 0-1)
  economicBenefit: number; // Trade volume increase
  militaryProtection: number; // Defense effectiveness
  politicalAutonomy: number; // Freedom from federal overreach
  culturalRespect: number; // Cultural recognition

  // History
  consecutiveTicksLow: number; // Ticks with satisfaction < 0.4
  secessionRisk: number; // 0-1
}

/**
 * Aggregated member statistics
 */
interface MemberStats {
  population: number;
  gdp: number;
  militaryStrength: number;
  fleetCount: number;
  systemCount: number;
}

// ============================================================================
// System
// ============================================================================

export class FederationGovernanceSystem extends BaseSystem {
  public readonly id: SystemId = 'federation_governance' as SystemId;
  public readonly priority: number = 205;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.FederationGovernance];
  public readonly activationComponents = ['federation_governance'] as const;
  public readonly metadata = {
    category: 'economy' as const, // Governance systems use 'economy' category
    description: 'Multi-empire cooperative governance at pan-galactic scale',
    dependsOn: ['empire' as SystemId, 'nation' as SystemId],
    writesComponents: [CT.FederationGovernance, CT.Empire, CT.Nation] as const,
  } as const;

  // Update interval: 12000 ticks = 10 minutes (strategic, very infrequent)
  protected readonly throttleInterval = 12000;

  // ========================================================================
  // State
  // ========================================================================

  // Cached satisfaction calculations (avoid recomputing every tick)
  private memberSatisfactionCache: Map<string, Map<string, MemberSatisfaction>> = new Map();

  // Pending proposals (in-memory, will be persisted to component later)
  private activeProposals: Map<string, FederalProposal[]> = new Map();

  // Last update tick per federation
  private federationLastUpdateTick: Map<string, number> = new Map();

  // ========================================================================
  // Main Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each federation
    for (const federationEntity of ctx.activeEntities) {
      const federation = federationEntity.getComponent<FederationGovernanceComponent>(CT.FederationGovernance);
      if (!federation) continue;

      // Check if strategic update is due (every 12000 ticks = 10 minutes)
      const lastUpdate = this.federationLastUpdateTick.get(federation.name) || 0;
      const timeSinceLastUpdate = tick - lastUpdate;

      if (timeSinceLastUpdate >= this.throttleInterval) {
        this.processFederationStrategicUpdate(ctx.world, federationEntity as EntityImpl, tick);
        this.federationLastUpdateTick.set(federation.name, tick);
      }

      // Always process proposals (even between strategic updates)
      this.processProposalVoting(ctx.world, federationEntity as EntityImpl, tick);
    }
  }

  // ========================================================================
  // Strategic Update (10 minute cycle)
  // ========================================================================

  /**
   * Process federation's strategic update cycle
   *
   * Steps:
   * 1. Aggregate member empire/nation statistics
   * 2. Update federal treasury (member contributions)
   * 3. Process federal laws (enforcement across members)
   * 4. Coordinate joint military operations
   * 5. Track member satisfaction
   * 6. Handle secession attempts
   * 7. Rotate presidency if needed
   */
  private processFederationStrategicUpdate(
    world: World,
    federationEntity: EntityImpl,
    tick: number
  ): void {
    const federation = federationEntity.getComponent<FederationGovernanceComponent>(CT.FederationGovernance);
    if (!federation) return;

    // Step 1: Aggregate member statistics
    const memberStats = this.aggregateMemberStatistics(world, federation);

    // Step 2: Update federal treasury (5% GDP contribution from each member)
    this.updateFederalTreasury(world, federation, memberStats);

    // Step 3: Enforce federal laws across members
    this.enforceFederalLaws(world, federation, federationEntity);

    // Step 4: Coordinate joint military operations
    this.coordinateJointOperations(world, federation);

    // Step 5: Update member satisfaction
    const satisfactionMap = this.updateMemberSatisfaction(world, federation, memberStats, tick);

    // Step 6: Handle secession attempts
    this.processSecessionAttempts(world, federation, federationEntity, satisfactionMap, tick);

    // Step 7: Rotate presidency if needed
    this.rotatePresidency(world, federation, federationEntity, tick);

    // Step 8: Update federation component with aggregated data
    federationEntity.updateComponent<FederationGovernanceComponent>(CT.FederationGovernance, (f) => ({
      ...f,
      totalPopulation: memberStats.population,
      totalSystems: memberStats.systemCount,
      military: {
        ...f.military,
        totalShips: memberStats.fleetCount,
        totalReadiness: this.calculateOverallReadiness(world, f),
      },
      lastPanGalacticUpdateTick: tick,
    }));

    // Step 9: Emit strategic update event
    world.eventBus.emit({
      type: 'federation:strategic_update',
      source: federationEntity.id,
      data: {
        federationName: federation.name,
        totalPopulation: memberStats.population,
        totalSystems: memberStats.systemCount,
        memberCount: federation.memberEmpireIds.length + federation.memberNationIds.length,
        cohesion: federation.stability.cohesion,
        tick,
      },
    });
  }

  // ========================================================================
  // Member Statistics Aggregation
  // ========================================================================

  /**
   * Aggregate statistics from all member empires and nations
   */
  private aggregateMemberStatistics(
    world: World,
    federation: FederationGovernanceComponent
  ): MemberStats {
    let totalPopulation = 0;
    let totalGDP = 0;
    let totalMilitaryStrength = 0;
    let totalFleetCount = 0;
    let totalSystemCount = 0;

    // Query all empires once (cached query pattern)
    const allEmpires = world.query().with(CT.Empire).executeEntities();
    const allNations = world.query().with(CT.Nation).executeEntities();

    // Aggregate empire stats
    for (const empireId of federation.memberEmpireIds) {
      const empireEntity = allEmpires.find((e) => e.id === empireId);
      if (!empireEntity) continue;

      const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!empire) continue;

      totalPopulation += empire.territory.totalPopulation;
      totalGDP += empire.economy.gdp;
      totalMilitaryStrength += empire.military.totalShips;
      totalFleetCount += empire.military.totalFleets;
      totalSystemCount += empire.territory.systems.length;
    }

    // Aggregate independent nation stats (non-empire members)
    for (const nationId of federation.memberNationIds) {
      const nationEntity = allNations.find((n) => n.id === nationId);
      if (!nationEntity) continue;

      const nation = nationEntity.getComponent<NationComponent>(CT.Nation);
      if (!nation) continue;

      totalPopulation += nation.population;
      totalGDP += nation.economy.gdp;
      totalMilitaryStrength += nation.military.armyStrength;
      // Nations are single-planet/system entities
      totalSystemCount += 1;
    }

    return {
      population: totalPopulation,
      gdp: totalGDP,
      militaryStrength: totalMilitaryStrength,
      fleetCount: totalFleetCount,
      systemCount: totalSystemCount,
    };
  }

  // ========================================================================
  // Federal Treasury Management
  // ========================================================================

  /**
   * Update federal treasury with member contributions (5% of GDP)
   */
  private updateFederalTreasury(
    world: World,
    federation: FederationGovernanceComponent,
    memberStats: MemberStats
  ): void {
    // Calculate total contribution (5% of aggregate GDP)
    const contributionRate = 0.05;
    const totalContribution = memberStats.gdp * contributionRate;

    // Update treasury (simplified - just track gold/credits)
    const currentGold = federation.tradeUnion.internalTradeVolume; // Reuse as treasury proxy
    const newTreasury = currentGold + totalContribution;

    // Calculate expenditures (joint military, infrastructure, research)
    const militaryExpenditure = federation.military.activeJointOperations.length * 10000;
    const infrastructureExpenditure = 5000; // Flat rate
    const researchExpenditure = 3000; // Flat rate

    const totalExpenditure = militaryExpenditure + infrastructureExpenditure + researchExpenditure;
    const netTreasury = newTreasury - totalExpenditure;

    // Note: This is stored back to tradeUnion.internalTradeVolume as a proxy
    // Real implementation would have a dedicated treasury field
  }

  // ========================================================================
  // Federal Law Enforcement
  // ========================================================================

  /**
   * Enforce federal laws across all member states
   *
   * Federal laws supersede member laws and must be adopted by all members.
   * Non-compliance results in penalties.
   */
  private enforceFederalLaws(
    world: World,
    federation: FederationGovernanceComponent,
    federationEntity: EntityImpl
  ): void {
    const allEmpires = world.query().with(CT.Empire).executeEntities();
    const allNations = world.query().with(CT.Nation).executeEntities();

    for (const law of federation.federalLaws) {
      if (law.complianceRate >= 1.0) continue; // Already fully enforced

      const enforcedMembers: string[] = [];
      let totalMembers = 0;

      // Enforce in member empires
      for (const empireId of federation.memberEmpireIds) {
        totalMembers++;
        const empireEntity = allEmpires.find((e) => e.id === empireId);
        if (!empireEntity) continue;

        const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
        if (!empire) continue;

        // Check if empire has adopted this law
        if (!law.enforcedInMembers.includes(empireId)) {
          // Add law to empire's governance (simplified - would need EmpireGovernance component)
          enforcedMembers.push(empireId);
          law.enforcedInMembers.push(empireId);
        }
      }

      // Enforce in member nations
      for (const nationId of federation.memberNationIds) {
        totalMembers++;
        const nationEntity = allNations.find((n) => n.id === nationId);
        if (!nationEntity) continue;

        const nation = nationEntity.getComponent<NationComponent>(CT.Nation);
        if (!nation) continue;

        // Check if nation has adopted this law
        if (!law.enforcedInMembers.includes(nationId)) {
          // Add law to nation's policies
          (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (n) => ({
            ...n,
            policies: [
              ...n.policies,
              {
                id: `federal_law_${law.name}`,
                name: `Federal: ${law.name}`,
                category: law.scope === 'trade' ? 'economic' : law.scope === 'military' ? 'military' : 'diplomatic',
                priority: 'high' as const,
                description: law.description,
                budgetAllocation: 0.05,
                progress: 1.0, // Federal laws are immediately binding
                startTick: world.tick,
              },
            ],
          }));

          enforcedMembers.push(nationId);
          law.enforcedInMembers.push(nationId);
        }
      }

      // Update compliance rate
      law.complianceRate = law.enforcedInMembers.length / Math.max(1, totalMembers);

      // Emit enforcement event if any new members adopted
      if (enforcedMembers.length > 0) {
        world.eventBus.emit({
          type: 'federation:law_enforced',
          source: federationEntity.id,
          data: {
            federationName: federation.name,
            lawName: law.name,
            newlyEnforcedMembers: enforcedMembers,
            complianceRate: law.complianceRate,
            tick: world.tick,
          },
        });
      }
    }
  }

  // ========================================================================
  // Joint Military Operations
  // ========================================================================

  /**
   * Coordinate joint military operations across member fleets
   */
  private coordinateJointOperations(
    world: World,
    federation: FederationGovernanceComponent
  ): void {
    const allNavies = world.query().with(CT.Navy).executeEntities();

    for (const operation of federation.military.activeJointOperations) {
      if (operation.status !== 'active') continue;

      // Aggregate fleet strength from participating members
      let totalFleetStrength = 0;
      const operationFleets: string[] = [];

      for (const memberId of operation.participatingMembers) {
        // Find member's navy
        const fleetId = operation.fleetsCommitted.get(memberId);
        if (!fleetId) continue;

        const navyEntity = allNavies.find((n) => n.id === fleetId);
        if (!navyEntity) continue;

        const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
        if (!navy) continue;

        totalFleetStrength += navy.assets.totalShips;
        operationFleets.push(fleetId);
      }

      // Update operation progress (simplified - 1% per tick)
      const duration = world.tick - operation.startedTick;
      if (duration % 100 === 0) {
        // Every 100 ticks (5 seconds), emit progress event
        world.eventBus.emit({
          type: 'federation:joint_operation_progress',
          source: operationFleets[0] || 'unknown',
          data: {
            federationName: federation.name,
            operationId: operation.id,
            operationName: operation.name,
            operationType: operation.type,
            participatingMembers: operation.participatingMembers,
            totalFleetStrength,
            duration,
            tick: world.tick,
          },
        });
      }
    }
  }

  // ========================================================================
  // Member Satisfaction Tracking
  // ========================================================================

  /**
   * Calculate satisfaction for each member state
   *
   * Satisfaction formula (0-1):
   * - Economic benefit (30%): Trade volume increase since joining
   * - Military protection (30%): Defense from external threats
   * - Political autonomy (20%): Minimal federal overreach
   * - Cultural respect (20%): Recognition of cultural identity
   *
   * Effects:
   * - High (>70): Willing to contribute extra resources
   * - Medium (40-70): Stable membership
   * - Low (<40): Reduced contribution, secession risk
   * - Critical (<20): Secession attempt triggered
   */
  private updateMemberSatisfaction(
    world: World,
    federation: FederationGovernanceComponent,
    memberStats: MemberStats,
    tick: number
  ): Map<string, MemberSatisfaction> {
    const satisfactionMap = new Map<string, MemberSatisfaction>();
    const allEmpires = world.query().with(CT.Empire).executeEntities();
    const allNations = world.query().with(CT.Nation).executeEntities();

    const allMembers = [
      ...federation.memberEmpireIds,
      ...federation.memberNationIds,
    ];

    for (const memberId of allMembers) {
      // Get current satisfaction from cache or initialize
      let cached = this.memberSatisfactionCache.get(federation.name)?.get(memberId);
      if (!cached) {
        cached = {
          memberId,
          overall: 0.7, // Default moderate satisfaction
          economicBenefit: 0.7,
          militaryProtection: 0.7,
          politicalAutonomy: 0.7,
          culturalRespect: 0.7,
          consecutiveTicksLow: 0,
          secessionRisk: 0,
        };
      }

      // Calculate economic benefit (30%)
      // Simplified: Assume internal trade volume correlates with economic benefit
      const economicBenefit = Math.min(1.0, federation.tradeUnion.internalTradeVolume / (memberStats.gdp * 0.5));

      // Calculate military protection (30%)
      // Check if member is involved in joint operations
      const memberInOperations = federation.military.activeJointOperations.filter((op) =>
        op.participatingMembers.includes(memberId)
      ).length;
      const militaryProtection = Math.min(1.0, 0.5 + (memberInOperations * 0.2));

      // Calculate political autonomy (20%)
      // Based on number of federal laws vs member preference for independence
      const lawCount = federation.federalLaws.length;
      const politicalAutonomy = Math.max(0.3, 1.0 - (lawCount * 0.05)); // Each law reduces autonomy by 5%

      // Calculate cultural respect (20%)
      // Simplified: Check if member is in council
      const hasRepresentative = federation.councilRepresentatives.some((rep) => rep.memberStateId === memberId);
      const culturalRespect = hasRepresentative ? 0.8 : 0.5;

      // Weighted average
      const overall =
        economicBenefit * 0.3 +
        militaryProtection * 0.3 +
        politicalAutonomy * 0.2 +
        culturalRespect * 0.2;

      // Track consecutive low satisfaction
      const consecutiveTicksLow = overall < 0.4 ? cached.consecutiveTicksLow + 1 : 0;

      // Calculate secession risk (0-1)
      const secessionRisk = overall < 0.2 ? 0.8 :
                           overall < 0.4 ? 0.3 :
                           0.05;

      const satisfaction: MemberSatisfaction = {
        memberId,
        overall,
        economicBenefit,
        militaryProtection,
        politicalAutonomy,
        culturalRespect,
        consecutiveTicksLow,
        secessionRisk,
      };

      satisfactionMap.set(memberId, satisfaction);

      // Update federation component's satisfaction tracking
      federation.stability.memberSatisfaction.set(memberId, overall);
      federation.stability.withdrawalRisk.set(memberId, secessionRisk);
    }

    // Cache for next update
    if (!this.memberSatisfactionCache.has(federation.name)) {
      this.memberSatisfactionCache.set(federation.name, new Map());
    }
    this.memberSatisfactionCache.set(federation.name, satisfactionMap);

    // Update federation cohesion (average satisfaction)
    const avgSatisfaction = Array.from(satisfactionMap.values())
      .reduce((sum, s) => sum + s.overall, 0) / Math.max(1, satisfactionMap.size);
    federation.stability.cohesion = avgSatisfaction;

    return satisfactionMap;
  }

  // ========================================================================
  // Secession Mechanics
  // ========================================================================

  /**
   * Process secession attempts from dissatisfied members
   *
   * Secession conditions:
   * - Member satisfaction < 20% for > 5 consecutive strategic updates (50 minutes)
   * - Internal vote passes (simulated based on satisfaction)
   * - Federation can attempt to prevent (military intervention or concessions)
   */
  private processSecessionAttempts(
    world: World,
    federation: FederationGovernanceComponent,
    federationEntity: EntityImpl,
    satisfactionMap: Map<string, MemberSatisfaction>,
    tick: number
  ): void {
    const allEmpires = world.query().with(CT.Empire).executeEntities();
    const allNations = world.query().with(CT.Nation).executeEntities();

    for (const [memberId, satisfaction] of satisfactionMap.entries()) {
      // Check secession threshold
      if (satisfaction.overall >= 0.2 || satisfaction.consecutiveTicksLow < 5) {
        continue;
      }

      // Member is eligible for secession
      // Simulate internal vote (80% chance of passing when satisfaction is this low)
      const voteResult = Math.random();
      if (voteResult < 0.8) {
        // Secession vote passes - remove from federation
        this.executeMemberSecession(
          world,
          federation,
          federationEntity,
          memberId,
          satisfaction,
          tick
        );
      }
    }
  }

  /**
   * Execute member secession from federation
   */
  private executeMemberSecession(
    world: World,
    federation: FederationGovernanceComponent,
    federationEntity: EntityImpl,
    memberId: string,
    satisfaction: MemberSatisfaction,
    tick: number
  ): void {
    // Remove from member lists
    const empireIndex = federation.memberEmpireIds.indexOf(memberId);
    if (empireIndex !== -1) {
      federation.memberEmpireIds.splice(empireIndex, 1);
    }

    const nationIndex = federation.memberNationIds.indexOf(memberId);
    if (nationIndex !== -1) {
      federation.memberNationIds.splice(nationIndex, 1);
    }

    // Remove from council
    const councilIndex = federation.councilRepresentatives.findIndex((rep) => rep.memberStateId === memberId);
    if (councilIndex !== -1) {
      federation.councilRepresentatives.splice(councilIndex, 1);
    }

    // Remove from satisfaction tracking
    federation.stability.memberSatisfaction.delete(memberId);
    federation.stability.withdrawalRisk.delete(memberId);

    // Emit secession event
    world.eventBus.emit({
      type: 'federation:member_seceded',
      source: federationEntity.id,
      data: {
        federationName: federation.name,
        memberId,
        satisfactionAtSecession: satisfaction.overall,
        consecutiveTicksLow: satisfaction.consecutiveTicksLow,
        tick,
      },
    });
  }

  // ========================================================================
  // Presidency Rotation
  // ========================================================================

  /**
   * Rotate federation presidency if term has ended
   */
  private rotatePresidency(
    world: World,
    federation: FederationGovernanceComponent,
    federationEntity: EntityImpl,
    tick: number
  ): void {
    // Check if rotation is due
    if (!federation.nextRotationTick || tick < federation.nextRotationTick) {
      return;
    }

    // Find next president (round-robin through empires, then nations)
    const allMembers = [
      ...federation.memberEmpireIds,
      ...federation.memberNationIds,
    ];

    if (allMembers.length === 0) {
      // Federation has no members - should not happen
      return;
    }

    const currentPresidentIndex = federation.currentPresidentEmpireId
      ? allMembers.indexOf(federation.currentPresidentEmpireId)
      : -1;

    const nextPresidentIndex = (currentPresidentIndex + 1) % allMembers.length;
    const nextPresidentId = allMembers[nextPresidentIndex]!;

    // Update presidency
    federationEntity.updateComponent<FederationGovernanceComponent>(CT.FederationGovernance, (f) => ({
      ...f,
      currentPresidentEmpireId: nextPresidentId,
      nextRotationTick: tick + f.presidencyDuration,
    }));

    // Emit rotation event
    world.eventBus.emit({
      type: 'federation:presidency_rotated',
      source: federationEntity.id,
      data: {
        federationName: federation.name,
        previousPresidentId: federation.currentPresidentEmpireId,
        newPresidentId: nextPresidentId,
        tick,
      },
    });
  }

  // ========================================================================
  // Federal Assembly Voting
  // ========================================================================

  /**
   * Process proposal voting in federal assembly
   *
   * Voting system:
   * - Weighted voting by population: votingPower = sqrt(population) / totalSqrtPop
   * - Veto powers for founding members (first 3-5 members)
   * - Quorum requirement: 60% of voting power must participate
   * - Passage threshold: 66% supermajority for constitutional changes, 51% for normal laws
   */
  private processProposalVoting(
    world: World,
    federationEntity: EntityImpl,
    tick: number
  ): void {
    const federation = federationEntity.getComponent<FederationGovernanceComponent>(CT.FederationGovernance);
    if (!federation) return;

    const proposals = this.activeProposals.get(federation.name) || [];
    if (proposals.length === 0) return;

    for (const proposal of proposals) {
      // Check if debate period has ended
      if (proposal.status === 'debating') {
        const debateEndTick = proposal.debateStartTick + proposal.debateDuration;
        if (tick >= debateEndTick) {
          // Start voting
          proposal.status = 'voting';
          proposal.votingStartTick = tick;

          world.eventBus.emit({
            type: 'federation:proposal_voting_started',
            source: federationEntity.id,
            data: {
              federationName: federation.name,
              proposalId: proposal.id,
              proposalName: proposal.name,
              proposalType: proposal.type,
              tick,
            },
          });
        }
      }

      // Process voting
      if (proposal.status === 'voting') {
        // Calculate voting results
        const votingResult = this.calculateVotingResult(world, federation, proposal);

        // Check if quorum met (60% of voting power participated)
        const totalParticipation = votingResult.votingPowerFor + votingResult.votingPowerAgainst + votingResult.votingPowerAbstained;
        const quorumMet = totalParticipation >= 0.6;

        if (!quorumMet) {
          // Proposal fails due to lack of quorum
          proposal.status = 'failed';

          world.eventBus.emit({
            type: 'federation:proposal_failed',
            source: federationEntity.id,
            data: {
              federationName: federation.name,
              proposalId: proposal.id,
              proposalName: proposal.name,
              reason: 'quorum_not_met',
              participation: totalParticipation,
              tick,
            },
          });
          continue;
        }

        // Check if threshold met
        const threshold = proposal.requiresSupermajority ? 0.66 : 0.51;
        const passageRate = votingResult.votingPowerFor / (votingResult.votingPowerFor + votingResult.votingPowerAgainst);

        if (passageRate >= threshold) {
          // Check for veto from founding members
          const vetoedByFounder = this.checkFounderVeto(federation, proposal);

          if (vetoedByFounder) {
            proposal.status = 'vetoed';

            world.eventBus.emit({
              type: 'federation:proposal_vetoed',
              source: federationEntity.id,
              data: {
                federationName: federation.name,
                proposalId: proposal.id,
                proposalName: proposal.name,
                vetoedBy: vetoedByFounder,
                tick,
              },
            });
          } else {
            // Proposal passes
            proposal.status = 'passed';

            // Convert to federal law
            if (proposal.type === 'law') {
              const law: FederalLaw = {
                name: proposal.name,
                description: proposal.description,
                scope: proposal.scope,
                enforcedInMembers: [],
                complianceRate: 0,
                enactedTick: tick,
                votingResults: proposal.votes,
              };

              federation.federalLaws.push(law);
            }

            world.eventBus.emit({
              type: 'federation:proposal_passed',
              source: federationEntity.id,
              data: {
                federationName: federation.name,
                proposalId: proposal.id,
                proposalName: proposal.name,
                proposalType: proposal.type,
                passageRate,
                tick,
              },
            });
          }
        } else {
          // Proposal fails
          proposal.status = 'failed';

          world.eventBus.emit({
            type: 'federation:proposal_failed',
            source: federationEntity.id,
            data: {
              federationName: federation.name,
              proposalId: proposal.id,
              proposalName: proposal.name,
              reason: 'insufficient_votes',
              passageRate,
              tick,
            },
          });
        }
      }
    }

    // Clean up completed proposals
    this.activeProposals.set(
      federation.name,
      proposals.filter((p) => p.status === 'debating' || p.status === 'voting')
    );
  }

  /**
   * Calculate weighted voting result
   */
  private calculateVotingResult(
    world: World,
    federation: FederationGovernanceComponent,
    proposal: FederalProposal
  ): { votingPowerFor: number; votingPowerAgainst: number; votingPowerAbstained: number } {
    const allEmpires = world.query().with(CT.Empire).executeEntities();
    const allNations = world.query().with(CT.Nation).executeEntities();

    // Calculate total sqrt population for normalization
    let totalSqrtPopulation = 0;
    const memberPopulations = new Map<string, number>();

    for (const empireId of federation.memberEmpireIds) {
      const empireEntity = allEmpires.find((e) => e.id === empireId);
      if (!empireEntity) continue;

      const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!empire) continue;

      const population = empire.territory.totalPopulation;
      memberPopulations.set(empireId, population);
      totalSqrtPopulation += Math.sqrt(population);
    }

    for (const nationId of federation.memberNationIds) {
      const nationEntity = allNations.find((n) => n.id === nationId);
      if (!nationEntity) continue;

      const nation = nationEntity.getComponent<NationComponent>(CT.Nation);
      if (!nation) continue;

      const population = nation.population;
      memberPopulations.set(nationId, population);
      totalSqrtPopulation += Math.sqrt(population);
    }

    // Calculate weighted votes
    let votingPowerFor = 0;
    let votingPowerAgainst = 0;
    let votingPowerAbstained = 0;

    for (const [memberId, vote] of proposal.votes.entries()) {
      const population = memberPopulations.get(memberId) || 0;
      const votingPower = Math.sqrt(population) / totalSqrtPopulation;

      if (vote === 'for') {
        votingPowerFor += votingPower;
      } else if (vote === 'against') {
        votingPowerAgainst += votingPower;
      } else {
        votingPowerAbstained += votingPower;
      }
    }

    proposal.votingPowerFor = votingPowerFor;
    proposal.votingPowerAgainst = votingPowerAgainst;
    proposal.votingPowerAbstained = votingPowerAbstained;

    return { votingPowerFor, votingPowerAgainst, votingPowerAbstained };
  }

  /**
   * Check if founding member vetoed proposal
   */
  private checkFounderVeto(
    federation: FederationGovernanceComponent,
    proposal: FederalProposal
  ): string | null {
    // First 3-5 members are founders with veto power
    const founderCount = Math.min(5, Math.max(3, federation.memberEmpireIds.length));
    const founders = [
      ...federation.memberEmpireIds.slice(0, founderCount),
      ...federation.memberNationIds.slice(0, Math.max(0, founderCount - federation.memberEmpireIds.length)),
    ];

    for (const founderId of founders) {
      const vote = proposal.votes.get(founderId);
      if (vote === 'against') {
        return founderId;
      }
    }

    return null;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Calculate overall military readiness across all member fleets
   */
  private calculateOverallReadiness(
    world: World,
    federation: FederationGovernanceComponent
  ): number {
    const allNavies = world.query().with(CT.Navy).executeEntities();
    let totalReadiness = 0;
    let fleetCount = 0;

    // Aggregate from member fleets
    for (const [memberId, fleetId] of federation.military.memberFleets.entries()) {
      const navyEntity = allNavies.find((n) => n.id === fleetId);
      if (!navyEntity) continue;

      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Navy readiness calculation (simplified)
      const readiness = navy.assets.activeDeployments / Math.max(1, navy.assets.totalShips);
      totalReadiness += readiness;
      fleetCount++;
    }

    return fleetCount > 0 ? totalReadiness / fleetCount : 0;
  }

  /**
   * Public API: Propose new federal law
   */
  public proposeFederalLaw(
    world: World,
    federationId: string,
    proposerId: string,
    name: string,
    description: string,
    scope: 'trade' | 'military' | 'justice' | 'rights' | 'environment',
    requiresSupermajority: boolean = false
  ): string {
    const federationEntity = world.getEntity(federationId);
    if (!federationEntity) {
      throw new Error(`Federation ${federationId} not found`);
    }

    const federation = federationEntity.getComponent<FederationGovernanceComponent>(CT.FederationGovernance);
    if (!federation) {
      throw new Error('Entity is not a federation');
    }

    // Create proposal
    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const proposal: FederalProposal = {
      id: proposalId,
      name,
      description,
      type: 'law',
      scope,
      proposerId,
      debateStartTick: world.tick,
      debateDuration: 3, // 3 ticks debate period
      votes: new Map(),
      votingPowerFor: 0,
      votingPowerAgainst: 0,
      votingPowerAbstained: 0,
      status: 'debating',
      requiresSupermajority,
    };

    // Add to active proposals
    const proposals = this.activeProposals.get(federation.name) || [];
    proposals.push(proposal);
    this.activeProposals.set(federation.name, proposals);

    // Emit proposal event
    world.eventBus.emit({
      type: 'federation:law_proposed',
      source: federationEntity.id,
      data: {
        federationName: federation.name,
        proposalId,
        proposalName: name,
        proposerId,
        scope,
        requiresSupermajority,
        tick: world.tick,
      },
    });

    return proposalId;
  }

  /**
   * Public API: Cast vote on proposal
   */
  public castVote(
    world: World,
    federationId: string,
    proposalId: string,
    memberId: string,
    vote: 'for' | 'against' | 'abstain'
  ): void {
    const federationEntity = world.getEntity(federationId);
    if (!federationEntity) {
      throw new Error(`Federation ${federationId} not found`);
    }

    const federation = federationEntity.getComponent<FederationGovernanceComponent>(CT.FederationGovernance);
    if (!federation) {
      throw new Error('Entity is not a federation');
    }

    const proposals = this.activeProposals.get(federation.name) || [];
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting status`);
    }

    // Cast vote
    proposal.votes.set(memberId, vote);

    // Emit vote event
    world.eventBus.emit({
      type: 'federation:vote_cast',
      source: federationEntity.id,
      data: {
        federationName: federation.name,
        proposalId,
        memberId,
        vote,
        tick: world.tick,
      },
    });
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: FederationGovernanceSystem | null = null;

export function getFederationGovernanceSystem(): FederationGovernanceSystem {
  if (!systemInstance) {
    systemInstance = new FederationGovernanceSystem();
  }
  return systemInstance;
}
