/**
 * Courtship System
 *
 * Manages courtship state progression, compatibility evaluation, and mating behaviors.
 * Runs every tick to process courtship attempts, evaluate responses, and trigger conception.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { ComponentType } from '../types';
import { ComponentType as CT } from '../types/ComponentType';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity';
import type { CourtshipComponent } from '../reproduction/courtship/CourtshipComponent';
import type { SexualityComponent } from '../reproduction/SexualityComponent';
import { CourtshipStateMachine } from '../reproduction/courtship/CourtshipStateMachine';
import { attemptConception } from '../reproduction/courtship/compatibility';
import type { CourtshipTactic } from '../reproduction/courtship/types';
import { getTacticsForSpecies } from '../reproduction/courtship/tactics';
import type { SpeciesComponent } from '../components/SpeciesComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ActiveCourtship } from '../reproduction/courtship/types';

export class CourtshipSystem extends BaseSystem {
  public readonly id = 'courtship' as const;
  public readonly priority = 18; // After AI (10), before Movement (20)
  public readonly requiredComponents = [CT.Courtship] as const;

  // Lazy activation: Skip entire system when no courtship components exist in world
  public readonly activationComponents = [CT.Courtship] as const;

  // Throttle: Run courtship checks every 5 ticks (reduces CPU load)
  protected readonly throttleInterval = 5;

  private stateMachine = new CourtshipStateMachine();

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const courtship = entity.getComponent<CourtshipComponent>(CT.Courtship);

      if (!courtship) {
        throw new Error(`Entity ${entity.id} missing required courtship component`);
      }

      // Process based on current state
      switch (courtship.state) {
        case 'idle':
          this.processIdleState(entity, courtship, ctx.world);
          break;

        case 'interested':
          this.processInterestedState(entity, courtship, ctx.world);
          break;

        case 'courting':
          this.processCourtingState(entity, courtship, ctx.world);
          break;

        case 'being_courted':
          this.processBeingCourtedState(entity, courtship, ctx.world);
          break;

        case 'consenting':
          this.processConsentingState(entity, courtship, ctx.world);
          break;

        case 'mating':
          this.processMatingState(entity, courtship, ctx.world);
          break;
      }
    }
  }

  /**
   * Idle state: Check if agent should become interested in someone
   */
  private processIdleState(agent: EntityImpl, courtship: CourtshipComponent, world: World): void {
    const sexuality = agent.getComponent<SexualityComponent>(CT.Sexuality);

    // Only consider courtship if actively seeking
    if (!sexuality?.activelySeeking) {
      return;
    }

    // Check cooldowns
    if (courtship.isOnCooldown(world.tick)) {
      return;
    }

    // Find potential targets
    const potentialTargets = this.findPotentialTargets(agent, courtship, world);

    // Evaluate compatibility with each potential target
    for (const target of potentialTargets) {
      // Skip if on rejection cooldown
      if (courtship.isOnRejectionCooldown(target.id, world.tick)) {
        continue;
      }

      // Use state machine to determine if should pursue
      const shouldPursue = this.stateMachine.considerCourtship(agent, target, world);
      if (shouldPursue) {
        // Found someone! State machine already updated state to 'interested'
        // Emit interested event
        this.events.emit('courtship:interested', {
          agentId: agent.id,
          targetId: target.id,
          tick: world.tick,
        }, agent.id);
        break;
      }
    }
  }

  /**
   * Interested state: Initiate courtship
   */
  private processInterestedState(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    world: World
  ): void {
    if (!courtship.currentCourtshipTarget) {
      // No target set, return to idle
      courtship.state = 'idle';
      return;
    }

    const target = world.getEntity(courtship.currentCourtshipTarget);
    if (!target) {
      // Target no longer exists
      courtship.state = 'idle';
      courtship.currentCourtshipTarget = null;
      return;
    }

    // Use state machine to initiate courtship
    this.stateMachine.initiateCourtship(agent, target, world);
    // State machine updates state to 'courting'

    // Emit courtship initiated event
    this.events.emit('courtship:initiated', {
      initiatorId: agent.id,
      targetId: target.id,
      tick: world.tick,
    }, agent.id);
  }

  /**
   * Courting state: Perform courtship tactics
   */
  private processCourtingState(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    world: World
  ): void {
    if (!courtship.currentCourtshipTarget) {
      courtship.state = 'idle';
      return;
    }

    const target = world.getEntity(courtship.currentCourtshipTarget);
    if (!target) {
      courtship.state = 'idle';
      courtship.currentCourtshipTarget = null;
      return;
    }

    // Get active courtship
    const activeCourtship = courtship.getActiveCourtship(target.id);
    if (!activeCourtship) {
      courtship.state = 'idle';
      courtship.currentCourtshipTarget = null;
      return;
    }

    // Select next tactic to perform
    const tactic = this.selectNextTactic(agent, courtship, activeCourtship, world);
    if (!tactic) {
      // No suitable tactics available, wait
      return;
    }

    // Perform tactic
    this.stateMachine.performCourtshipTactic(agent, target, tactic, world);
  }

  /**
   * Being courted state: Evaluate courtship attempts
   */
  private processBeingCourtedState(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    world: World
  ): void {
    if (!courtship.currentCourtshipInitiator) {
      courtship.state = 'idle';
      return;
    }

    const initiator = world.getEntity(courtship.currentCourtshipInitiator);
    if (!initiator) {
      courtship.state = 'idle';
      courtship.currentCourtshipInitiator = null;
      return;
    }

    // Get received courtship
    const receivedCourtship = courtship.getReceivedCourtship(initiator.id);
    if (!receivedCourtship) {
      courtship.state = 'idle';
      courtship.currentCourtshipInitiator = null;
      return;
    }

    // Evaluate courtship attempt
    const decision = this.stateMachine.evaluateCourtship(agent, initiator, world);

    if (decision === 'accept') {
      // Both agents transition to consenting state
      this.stateMachine.transitionToMating(agent, initiator, world);
    } else if (decision === 'reject') {
      // Handle rejection
      courtship.state = 'idle';
      courtship.currentCourtshipInitiator = null;
      courtship.lastCourtshipAttempt = world.tick;

      // Add rejection cooldown
      courtship.rejectionCooldown.set(initiator.id, world.tick);

      // Notify initiator of rejection
      const initiatorCourtship = (initiator as EntityImpl).getComponent<CourtshipComponent>(
        CT.Courtship
      );
      if (initiatorCourtship) {
        initiatorCourtship.state = 'idle';
        initiatorCourtship.currentCourtshipTarget = null;
        initiatorCourtship.endCourtship(agent.id, false, 'rejected', world.tick);
      }

      // Emit rejection event
      this.events.emit('courtship:rejected', {
        rejecterId: agent.id,
        initiatorId: initiator.id,
        tick: world.tick,
      }, agent.id);
    }
    // 'continue' means keep waiting for more tactics
  }

  /**
   * Consenting state: Both agents agree, transition to mating
   */
  private processConsentingState(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    world: World
  ): void {
    // Check if both agents are consenting
    const partnerId = courtship.currentCourtshipTarget || courtship.currentCourtshipInitiator;
    if (!partnerId) {
      courtship.state = 'idle';
      return;
    }

    const partner = world.getEntity(partnerId);
    if (!partner) {
      courtship.state = 'idle';
      courtship.currentCourtshipTarget = null;
      courtship.currentCourtshipInitiator = null;
      return;
    }

    const partnerCourtship = (partner as EntityImpl).getComponent<CourtshipComponent>(CT.Courtship);
    if (!partnerCourtship || partnerCourtship.state !== 'consenting') {
      // Partner not ready, wait
      return;
    }

    // Both consenting, transition to mating
    courtship.state = 'mating';
    partnerCourtship.state = 'mating';

    // Emit event
    this.events.emit('courtship:consent', {
      agent1: agent.id,
      agent2: partner.id,
      tick: world.tick,
    }, agent.id);
  }

  /**
   * Mating state: Handle mating behavior and attempt conception
   */
  private processMatingState(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    world: World
  ): void {
    const partnerId = courtship.currentCourtshipTarget || courtship.currentCourtshipInitiator;
    if (!partnerId) {
      courtship.state = 'idle';
      return;
    }

    const partner = world.getEntity(partnerId);
    if (!partner) {
      courtship.state = 'idle';
      courtship.currentCourtshipTarget = null;
      courtship.currentCourtshipInitiator = null;
      return;
    }

    // Attempt conception
    const conceptionResult = attemptConception(agent, partner, world);

    if (conceptionResult) {
      // Conception successful! Event emitted by attemptConception
      // End courtship successfully
      courtship.endCourtship(partner.id, true, 'conception', world.tick);

      const partnerCourtship = (partner as EntityImpl).getComponent<CourtshipComponent>(
        CT.Courtship
      );
      if (partnerCourtship) {
        const wasInitiator = partnerCourtship.currentCourtshipTarget === agent.id;
        if (wasInitiator) {
          partnerCourtship.endCourtship(agent.id, true, 'conception', world.tick);
        } else {
          partnerCourtship.endReceivedCourtship(agent.id, true, 'conception', world.tick);
        }
      }
    } else {
      // Conception failed, but courtship still successful
      // End courtship, but don't trigger rejection cooldown
      courtship.endCourtship(partner.id, true, 'completed_no_conception', world.tick);

      const partnerCourtship = (partner as EntityImpl).getComponent<CourtshipComponent>(
        CT.Courtship
      );
      if (partnerCourtship) {
        const wasInitiator = partnerCourtship.currentCourtshipTarget === agent.id;
        if (wasInitiator) {
          partnerCourtship.endCourtship(agent.id, true, 'completed_no_conception', world.tick);
        } else {
          partnerCourtship.endReceivedCourtship(
            agent.id,
            true,
            'completed_no_conception',
            world.tick
          );
        }
      }
    }

    // Return both to idle
    courtship.state = 'idle';
    courtship.currentCourtshipTarget = null;
    courtship.currentCourtshipInitiator = null;

    const partnerCourtship = (partner as EntityImpl).getComponent<CourtshipComponent>(CT.Courtship);
    if (partnerCourtship) {
      partnerCourtship.state = 'idle';
      partnerCourtship.currentCourtshipTarget = null;
      partnerCourtship.currentCourtshipInitiator = null;
    }
  }

  /**
   * Find potential courtship targets nearby
   */
  private findPotentialTargets(
    agent: EntityImpl,
    _courtship: CourtshipComponent,
    world: World
  ): Entity[] {
    // Query for all agents with courtship and sexuality components
    const allAgents = world
      .query()
      .with(CT.Courtship)
      .with(CT.Sexuality)
      .with(CT.Position)
      .executeEntities();

    const agentPos = agent.getComponent<PositionComponent>(CT.Position);
    if (!agentPos) return [];

    const targets: Entity[] = [];

    for (const other of allAgents) {
      // Skip self
      if (other.id === agent.id) continue;

      const otherImpl = other as EntityImpl;

      // Skip if already courting someone else
      const otherCourtship = otherImpl.getComponent<CourtshipComponent>(CT.Courtship);
      if (
        otherCourtship?.state !== 'idle' &&
        otherCourtship?.state !== 'interested' &&
        otherCourtship?.state !== 'being_courted'
      ) {
        continue;
      }

      // Check if within proximity (simple distance check)
      const otherPos = otherImpl.getComponent<PositionComponent>(CT.Position);
      if (!otherPos) continue;

      const dx = agentPos.x - otherPos.x;
      const dy = agentPos.y - otherPos.y;
      const distSq = dx * dx + dy * dy;

      // Within 10 tiles
      if (distSq < 100) {
        targets.push(other);
      }
    }

    return targets;
  }

  /**
   * Select next courtship tactic to perform
   */
  private selectNextTactic(
    agent: EntityImpl,
    courtship: CourtshipComponent,
    activeCourtship: ActiveCourtship,
    _world: World
  ): CourtshipTactic | null {
    const species = agent.getComponent<SpeciesComponent>(CT.Species);
    if (!species) return null;

    // Get available tactics for species
    const availableTactics = getTacticsForSpecies(species.speciesId);

    // Filter by paradigm requirements
    const paradigm = courtship.paradigm;
    const suitableTactics = availableTactics.filter((tactic) => {
      // Skip forbidden tactics
      if (paradigm.forbiddenTactics?.includes(tactic.id)) return false;

      // Skip tactics already attempted
      if (activeCourtship.tacticsAttempted.some((attempted) => attempted.id === tactic.id))
        return false;

      // Prefer preferred tactics
      if (courtship.preferredTactics.includes(tactic.id)) return true;

      // Skip disliked tactics
      if (courtship.dislikedTactics.includes(tactic.id)) return false;

      return true;
    });

    if (suitableTactics.length === 0) return null;

    // Select tactic based on style
    // For now, random selection
    return suitableTactics[Math.floor(Math.random() * suitableTactics.length)] ?? null;
  }

}
