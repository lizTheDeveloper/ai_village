/**
 * Courtship State Machine
 *
 * Manages state transitions and logic for courtship behaviors.
 */

import type { Entity } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type { CourtshipComponent } from './CourtshipComponent';
import type { SexualityComponent } from '../SexualityComponent';
import type { RelationshipComponent } from '@ai-village/core';
import { updateRelationship } from '@ai-village/core';
import type { CourtshipTactic, CourtshipParadigm } from './types';
import { calculateCompatibility } from './compatibility';

export class CourtshipStateMachine {
  /**
   * Check if agent should become interested in potential mate
   * Idle -> Interested transition
   */
  public considerCourtship(agent: Entity, target: Entity, world: World): boolean {
    const courtship = (agent as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!courtship) {
      throw new Error('Agent missing CourtshipComponent');
    }

    const sexuality = (agent as EntityImpl).getComponent<SexualityComponent>('sexuality');
    if (!sexuality) {
      throw new Error('Agent missing SexualityComponent');
    }

    // Check cooldowns
    if (this.isOnCooldown(courtship, target.id, world.tick)) {
      return false;
    }

    // Check if actively seeking
    if (!sexuality.activelySeeking) {
      return false;
    }

    // Calculate compatibility
    const compatibility = calculateCompatibility(agent, target, world);

    // Threshold based on romantic inclination
    const threshold = 0.5 - courtship.romanticInclination * 0.3;

    if (compatibility > threshold) {
      courtship.state = 'interested';
      courtship.currentCourtshipTarget = target.id;
      return true;
    }

    return false;
  }

  /**
   * Initiate courtship with target
   * Interested -> Courting transition
   */
  public initiateCourtship(agent: Entity, target: Entity, world: World): void {
    const courtship = (agent as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!courtship) {
      throw new Error('Agent missing CourtshipComponent');
    }

    if (!target) {
      throw new Error('Invalid target entity');
    }

    const targetCourtship = (target as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!targetCourtship) {
      return; // Target can't be courted
    }

    // Transition agent to courting
    courtship.state = 'courting';
    courtship.lastCourtshipAttempt = world.tick;

    courtship.activeCourtships.push({
      targetId: target.id,
      startedAt: world.tick,
      tacticsAttempted: [],
      responses: [],
      compatibilityScore: calculateCompatibility(agent, target, world),
      successProbability: 0,
    });

    // Notify target
    targetCourtship.state = 'being_courted';
    targetCourtship.currentCourtshipInitiator = agent.id;
    targetCourtship.receivedCourtships.push({
      initiatorId: agent.id,
      startedAt: world.tick,
      tacticsReceived: [],
      currentInterest: 0.3, // Start with mild interest
      willingToConsent: false,
    });
  }

  /**
   * Perform a courtship tactic
   */
  public performCourtshipTactic(
    agent: Entity,
    target: Entity,
    tactic: CourtshipTactic,
    world: World
  ): void {
    const courtship = (agent as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!courtship) {
      throw new Error('Agent missing CourtshipComponent');
    }

    const activeCourtship = courtship.getActiveCourtship(target.id);
    if (!activeCourtship) {
      throw new Error('No active courtship found');
    }

    // Record tactic
    activeCourtship.tacticsAttempted.push(tactic);

    // Calculate reception
    const reception = this.calculateTacticReception(agent, target, tactic, world);
    activeCourtship.responses.push({ tactic, reception });

    // Update target's interest
    const targetCourtship = (target as EntityImpl).getComponent<CourtshipComponent>('courtship');
    const receivedCourtship = targetCourtship?.getReceivedCourtship(agent.id);

    if (receivedCourtship) {
      receivedCourtship.tacticsReceived.push(tactic);
      receivedCourtship.currentInterest += reception * 0.2; // Adjust interest
      receivedCourtship.currentInterest = Math.max(
        0,
        Math.min(1, receivedCourtship.currentInterest)
      );

      // Update relationship affinity and familiarity
      const targetImpl = target as EntityImpl;
      const relationship = targetImpl.getComponent<RelationshipComponent>('relationship');
      if (relationship) {
        const updatedRelationship = updateRelationship(
          relationship,
          agent.id,
          world.tick,
          5, // familiarity increase
          reception * 10 // affinity change (-10 to +10)
        );
        // Replace the component with the updated version
        targetImpl.addComponent(updatedRelationship);
      }
    }

    // Update success probability
    this.updateSuccessProbability(activeCourtship, agent, target, world);
  }

  /**
   * Evaluate courtship and decide: accept, reject, or continue
   */
  public evaluateCourtship(
    agent: Entity,
    initiator: Entity,
    world: World
  ): 'accept' | 'reject' | 'continue' {
    const courtship = (agent as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!courtship) {
      return 'reject';
    }

    const receivedCourtship = courtship.getReceivedCourtship(initiator.id);
    if (!receivedCourtship) {
      return 'reject';
    }

    // Check paradigm requirements
    const tacticsMet = this.checkParadigmRequirements(
      courtship.paradigm,
      receivedCourtship.tacticsReceived
    );

    // If requirements not met, continue
    if (!tacticsMet) {
      return receivedCourtship.currentInterest < 0.2 ? 'reject' : 'continue';
    }

    // Calculate final decision
    const compatibility = calculateCompatibility(agent, initiator, world);
    const interest = receivedCourtship.currentInterest;
    const decisionScore = compatibility * 0.6 + interest * 0.4;

    // Romantic inclination affects threshold
    const threshold = 0.6 - courtship.romanticInclination * 0.2;

    if (decisionScore > threshold) {
      receivedCourtship.willingToConsent = true;
      return 'accept';
    } else if (interest < 0.2) {
      return 'reject';
    }

    return 'continue';
  }

  /**
   * Transition both agents to mating
   */
  public transitionToMating(agent1: Entity, agent2: Entity, world: World): void {
    const courtship1 = (agent1 as EntityImpl).getComponent<CourtshipComponent>('courtship');
    const courtship2 = (agent2 as EntityImpl).getComponent<CourtshipComponent>('courtship');

    if (!courtship1 || !courtship2) {
      return;
    }

    courtship1.state = 'consenting';
    courtship2.state = 'consenting';

    // Emit event to trigger mating behavior
    world.eventBus.emit({
      type: 'courtship:consent',
      source: agent1.id,
      data: {
        agent1: agent1.id,
        agent2: agent2.id,
        tick: world.tick,
        agent1Id: agent1.id,
        agent2Id: agent2.id,
        matingBehavior: String(courtship1.paradigm.matingBehavior),
      },
    });
  }

  /**
   * Check if paradigm requirements are met
   */
  public checkParadigmRequirements(
    paradigm: CourtshipParadigm,
    tacticsReceived: CourtshipTactic[]
  ): boolean {
    const tacticIds = tacticsReceived.map((t) => t.id);

    // Check for forbidden tactics
    for (const forbidden of paradigm.forbiddenTactics) {
      if (tacticIds.includes(forbidden)) {
        return false; // Forbidden tactic used
      }
    }

    // Check for required tactics
    for (const required of paradigm.requiredTactics) {
      if (!tacticIds.includes(required)) {
        return false; // Missing required tactic
      }
    }

    // Check minimum tactics count
    if (tacticsReceived.length < paradigm.minimumTactics) {
      return false;
    }

    return true;
  }

  /**
   * Calculate how well a tactic is received
   */
  private calculateTacticReception(
    _agent: Entity,
    target: Entity,
    tactic: CourtshipTactic,
    _world: World
  ): number {
    const targetCourtship = (target as EntityImpl).getComponent<CourtshipComponent>('courtship');
    if (!targetCourtship) {
      return 0;
    }

    let reception = tactic.baseAppeal;

    // Check if preferred
    if (targetCourtship.preferredTactics.includes(tactic.id)) {
      reception += 0.3;
    }

    // Check if disliked
    if (targetCourtship.dislikedTactics.includes(tactic.id)) {
      reception -= 0.5;
    }

    // Apply romantic inclination modifier
    if (tactic.appealModifiers.romanticInclination) {
      reception += tactic.appealModifiers.romanticInclination * targetCourtship.romanticInclination;
    }

    // Apply personality modifiers (simplified)
    // In full implementation, would check target's personality traits

    return Math.max(-1, Math.min(1, reception));
  }

  /**
   * Update success probability based on tactics and responses
   */
  private updateSuccessProbability(
    courtship: { responses: Array<{ tactic: CourtshipTactic; reception: number }> },
    agent: Entity,
    target: Entity,
    world: World
  ): void {
    if (courtship.responses.length === 0) {
      return;
    }

    // Average reception
    const avgReception =
      courtship.responses.reduce((sum, r) => sum + r.reception, 0) / courtship.responses.length;

    // Compatibility factor
    const compatibility = calculateCompatibility(agent, target, world);

    // Success probability is weighted combination
    const successProbability = avgReception * 0.4 + compatibility * 0.6;

    (courtship as any).successProbability = Math.max(0, Math.min(1, successProbability));
  }

  /**
   * Check if agent is on cooldown
   */
  private isOnCooldown(courtship: CourtshipComponent, targetId: string, currentTick: number): boolean {
    // Check general cooldown
    if (courtship.isOnCooldown(currentTick)) {
      return true;
    }

    // Check rejection cooldown for this specific target
    if (courtship.isOnRejectionCooldown(targetId, currentTick)) {
      return true;
    }

    return false;
  }
}
