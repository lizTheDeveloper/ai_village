import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  VillageGovernanceComponent,
  VillageProposal,
} from '../components/VillageGovernanceComponent.js';
import type { TownHallComponent } from '../components/TownHallComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';

/**
 * VillageGovernanceSystem - Political governance for village-level settlements
 *
 * Per 06-POLITICAL-HIERARCHY.md Phase 2: Political Governance
 * Implements:
 * - Election cycles for elder councils
 * - Proposal voting and execution
 * - Council meetings
 * - Village priority management
 *
 * Runs after GovernanceDataSystem (priority 50) to use updated TownHall data.
 * Priority 52 ensures village governance uses fresh population/demographic data.
 *
 * Performance:
 * - Throttled updates: Elections and meetings are infrequent events
 * - Uses pre-computed data from TownHallComponent
 * - Early exit if no governance entities exist
 */
export class VillageGovernanceSystem extends BaseSystem {
  public readonly id: SystemId = 'village_governance';
  public readonly priority: number = 52; // Run after GovernanceDataSystem (50)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.VillageGovernance];
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  /**
   * Initialize event listeners
   */
  protected onInitialize(world: World, eventBus: EventBus): void {
    // Future: Listen for trade agreement events, conflict events, etc.
  }

  /**
   * Update all village governance entities
   * Handles elections, proposals, and council meetings
   */
  protected onUpdate(ctx: SystemContext): void {
    const entities = ctx.world
      .query()
      .with(CT.VillageGovernance)
      .executeEntities();

    if (entities.length === 0) {
      return; // Early exit if no villages
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const governance = impl.getComponent<VillageGovernanceComponent>(CT.VillageGovernance);

      if (!governance) {
        continue;
      }

      // Check if elections are needed
      this.checkElections(ctx.world, impl, governance);

      // Process active proposals
      this.processProposals(ctx.world, impl, governance);

      // Hold council meetings if interval has passed
      this.checkCouncilMeetings(ctx.world, impl, governance);
    }
  }

  /**
   * Check if elections are needed and trigger them
   */
  private checkElections(
    world: World,
    entity: EntityImpl,
    governance: VillageGovernanceComponent
  ): void {
    if (world.tick < governance.nextElectionTick) {
      return; // Not time for elections yet
    }

    // Get TownHall for voter list
    const townHall = entity.getComponent<TownHallComponent>(CT.TownHall);
    if (!townHall) {
      // No TownHall, can't hold elections
      return;
    }

    // Get eligible voters (adults only - age 18+)
    const voters = townHall.agents.filter((a) => a.status === 'alive' && a.age >= 18);

    if (voters.length === 0) {
      // No eligible voters, postpone election
      entity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
        ...current,
        nextElectionTick: world.tick + 1000, // Try again in 1000 ticks
      }));
      return;
    }

    // Conduct election based on governance type
    const newElders = this.conductElection(world, governance, voters);

    // Update governance with new elders
    entity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
      ...current,
      elderAgentIds: newElders,
      chiefElderId: newElders.length > 0 ? newElders[0] : undefined, // First elder is chief
      lastElectionTick: world.tick,
      nextElectionTick: world.tick + current.termLengthTicks,
    }));

    // Emit election event
    this.events.emit('village:election_completed', {
      villageId: entity.id,
      villageName: governance.villageName,
      newElders,
      tick: world.tick,
    });
  }

  /**
   * Conduct an election to select new elders
   * Simple rule-based logic for Phase 2 (no LLM needed)
   */
  private conductElection(
    world: World,
    governance: VillageGovernanceComponent,
    voters: Array<{ id: string; name: string; age: number }>
  ): string[] {
    if (governance.governanceType === 'direct_democracy') {
      // No elders in direct democracy
      return [];
    }

    // Get all candidate agents
    const candidates = voters.filter((v) => v.age >= 25); // Elders must be 25+

    if (candidates.length === 0) {
      return []; // No eligible candidates
    }

    // Simple selection: Pick oldest and most experienced
    // In Phase 3+, could use LLM for selection or skill-based voting
    const sorted = [...candidates].sort((a, b) => b.age - a.age);

    // Select 3-7 elders depending on governance type
    const elderCount = governance.governanceType === 'chieftain' ? 1 : Math.min(5, Math.max(3, Math.floor(voters.length / 10)));

    return sorted.slice(0, elderCount).map((c) => c.id);
  }

  /**
   * Process active proposals - count votes and execute approved ones
   */
  private processProposals(
    world: World,
    entity: EntityImpl,
    governance: VillageGovernanceComponent
  ): void {
    if (governance.activeProposals.length === 0) {
      return; // No proposals to process
    }

    let proposalsChanged = false;

    for (const proposal of governance.activeProposals) {
      if (proposal.status !== 'voting') {
        continue; // Only process proposals in voting stage
      }

      if (world.tick < proposal.votingDeadline) {
        continue; // Voting period not over yet
      }

      // Count votes
      const totalVotes = proposal.votesFor.length + proposal.votesAgainst.length;

      if (totalVotes === 0) {
        // No votes, reject proposal
        proposal.status = 'rejected';
        proposalsChanged = true;
        continue;
      }

      const forPercentage = proposal.votesFor.length / totalVotes;

      if (forPercentage > 0.5) {
        // Proposal passed
        proposal.status = 'approved';
        this.executeProposal(world, entity, governance, proposal);
        proposalsChanged = true;

        this.events.emit('village:proposal_passed', {
          villageId: entity.id,
          villageName: governance.villageName,
          proposal: proposal.description,
          type: proposal.type,
          tick: world.tick,
        });
      } else {
        // Proposal rejected
        proposal.status = 'rejected';
        proposalsChanged = true;

        this.events.emit('village:proposal_rejected', {
          villageId: entity.id,
          villageName: governance.villageName,
          proposal: proposal.description,
          tick: world.tick,
        });
      }
    }

    if (proposalsChanged) {
      // Update component to persist changes
      entity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
        ...current,
        activeProposals: [...current.activeProposals], // Trigger update
      }));
    }
  }

  /**
   * Execute an approved proposal
   */
  private executeProposal(
    world: World,
    entity: EntityImpl,
    governance: VillageGovernanceComponent,
    proposal: VillageProposal
  ): void {
    switch (proposal.type) {
      case 'build':
        // Add to building queue
        // In Phase 3+, would parse description to extract building type
        // For now, just log the intent
        break;

      case 'explore':
        // Assign exploration mission
        // In Phase 3+, would create exploration missions for agents
        break;

      case 'trade':
        // Initiate trade with neighbor
        // In Phase 3+, would create trade agreements with other villages
        break;

      case 'law':
        // Enact new law
        // In Phase 3+, would add to laws array
        break;

      case 'custom':
        // Custom proposal - implementation depends on description
        break;
    }

    proposal.status = 'implemented';
  }

  /**
   * Check if it's time for a council meeting and hold one if needed
   */
  private checkCouncilMeetings(
    world: World,
    entity: EntityImpl,
    governance: VillageGovernanceComponent
  ): void {
    if (world.tick - governance.lastMeetingTick < governance.meetingInterval) {
      return; // Not time for meeting yet
    }

    // Hold council meeting
    this.holdCouncilMeeting(world, entity, governance);

    // Update last meeting tick
    entity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
      ...current,
      lastMeetingTick: world.tick,
    }));

    this.events.emit('village:council_meeting', {
      villageId: entity.id,
      villageName: governance.villageName,
      tick: world.tick,
    });
  }

  /**
   * Hold a council meeting
   * In Phase 2: Just updates priorities based on village state
   * In Phase 3+: LLM-controlled elders propose new ideas
   */
  private holdCouncilMeeting(
    world: World,
    entity: EntityImpl,
    governance: VillageGovernanceComponent
  ): void {
    // Get TownHall for village statistics
    const townHall = entity.getComponent<TownHallComponent>(CT.TownHall);
    if (!townHall) {
      return;
    }

    // Simple rule-based priority adjustment
    // In Phase 3+, elders would use LLM to make decisions

    const population = townHall.populationCount;
    const recentDeaths = townHall.recentDeaths.length;

    // Determine priority based on village state
    let newPriority: 'food' | 'materials' | 'defense' | 'growth' = governance.resourcePriority;

    if (recentDeaths > population * 0.1) {
      // High death rate - focus on food
      newPriority = 'food';
    } else if (population < 20) {
      // Small population - focus on growth
      newPriority = 'growth';
    } else if (population > 100) {
      // Large population - focus on materials/expansion
      newPriority = 'materials';
    }

    // Update priority if changed
    if (newPriority !== governance.resourcePriority) {
      entity.updateComponent<VillageGovernanceComponent>(CT.VillageGovernance, (current) => ({
        ...current,
        resourcePriority: newPriority,
      }));
    }
  }
}
