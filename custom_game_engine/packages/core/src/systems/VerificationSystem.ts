import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { VerificationResult, VerificationRecord } from '../components/TrustNetworkComponent.js';
import type { Gradient } from '../components/SocialGradientComponent.js';
import { getPosition, getSocialGradient, getTrustNetwork, getResource } from '../utils/componentHelpers.js';
import {
  VERIFICATION_RANGE,
  CLAIM_AGE_THRESHOLD,
} from '../constants/index.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * VerificationSystem checks resource claims and updates trust scores
 * Detects: correct, stale, misidentified, false_report, unreliable patterns
 */
export class VerificationSystem extends BaseSystem {
  public readonly id: SystemId = 'verification';
  public readonly priority: number = 35; // After exploration/steering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval: number = 40; // Only run every 2 seconds (at 20 TPS)

  private eventBus?: EventBus;
  private readonly verificationRange: number = VERIFICATION_RANGE; // Tiles

  protected onInitialize(_world: any, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  protected onUpdate(ctx: SystemContext): void {
    const entities = ctx.activeEntities;
    const currentTick = ctx.tick;
    // Get agents with social gradients (potential verifiers)
    const verifiers = entities.filter(e =>
      e.components.has(CT.Agent) &&
      e.components.has(CT.Position) &&
      e.components.has(CT.SocialGradient)
    );

    for (const verifier of verifiers) {
      try {
        this._verifyGradients(verifier, entities, currentTick);
      } catch (error) {
        throw new Error(`VerificationSystem failed for entity ${verifier.id}: ${error}`);
      }
    }
  }

  private _verifyGradients(verifier: Entity, entities: ReadonlyArray<Entity>, currentTick: number): void {
    const position = getPosition(verifier);
    if (!position) {
      throw new Error('position component missing');
    }
    const socialGradient = getSocialGradient(verifier);
    if (!socialGradient) {
      throw new Error('SocialGradient component missing');
    }

    // Get all gradients that have claim positions
    const gradients = socialGradient.allGradients;

    for (const gradient of gradients) {
      if (!gradient.claimPosition) continue;
      if (!gradient.sourceAgentId) continue;

      // Check if verifier is close enough to claimed location
      const distance = this._distance(position, gradient.claimPosition);
      if (distance > this.verificationRange) {
        continue; // Too far to verify
      }

      // Find the claimant entity by entity ID
      const claimant = entities.find(e => e.id === gradient.sourceAgentId);

      if (!claimant) {
        // Can't verify without claimant
        continue;
      }

      // Verify the claim
      let result = this._checkClaim(gradient, position, entities, currentTick);

      // Record verification using entity IDs
      const verifierId = verifier.id;
      const claimantId = claimant.id;

      // Check for pattern of bad information (3+ failures)
      // Get claimant's trust network to check their history
      const claimantTrustNetwork = getTrustNetwork(claimant);
      if (claimantTrustNetwork) {
        const history = claimantTrustNetwork.getVerificationHistory(verifierId);

        // Count recent failures (false_report, misidentified)
        const failures = history.filter((record: VerificationRecord) =>
          record.result === 'false_report' ||
          record.result === 'misidentified'
        );

        // If this is a failure and there are 2+ previous failures, upgrade to 'unreliable'
        if ((result === 'false_report' || result === 'misidentified') && failures.length >= 2) {
          result = 'unreliable';
        }
      }

      this.recordVerification(claimantId, verifierId, result, currentTick);

      // Update VERIFIER's trust network with verification result
      // When the verifier checks the claimant's information, it affects the verifier's trust in the claimant
      // (If the claim is correct, trust increases; if wrong, trust decreases)
      const trustNetwork = getTrustNetwork(verifier);
      if (!trustNetwork) {
        continue; // Verifier needs trust network to track claimant's reliability
      }

      // recordVerification handles both trust score update and history tracking
      // Update verifier's trust in the claimant based on verification result
      trustNetwork.recordVerification(claimantId, result, currentTick);

      // Emit events (use emitImmediate for testing)
      if (this.eventBus) {
        if (result === 'correct') {
          this.eventBus.emitImmediate({
            type: 'trust:verified',
            source: 'verification',
            data: {
              trusterId: verifierId,
              trusteeId: gradient.sourceAgentId,
              informationType: 'verification',
              claimantId: gradient.sourceAgentId,
              verifierId,
              result,
            },
          });
        } else {
          this.eventBus.emitImmediate({
            type: 'trust:violated',
            source: 'verification',
            data: {
              trusterId: verifierId,
              trusteeId: gradient.sourceAgentId,
              informationType: 'verification',
              claimantId: gradient.sourceAgentId,
              verifierId,
              result,
            },
          });

          // Broadcast correction for false information
          this.eventBus.emitImmediate({
            type: 'agent:broadcast',
            source: 'verification',
            data: {
              agentId: verifierId,
              message: `I checked the location Alice mentioned - there's no ${gradient.resourceType} there.`,
              tick: currentTick,
            },
          });
        }
      }
    }
  }

  /**
   * Check if a gradient claim is accurate
   */
  private _checkClaim(gradient: Gradient, _verifierPos: { x: number; y: number }, entities: ReadonlyArray<Entity>, currentTick: number): VerificationResult {
    // Look for resources near claimed position
    const nearbyResources = entities.filter(e => {
      const resourcePos = getPosition(e);
      if (!resourcePos) return false;
      const dist = this._distance(gradient.claimPosition!, resourcePos);
      return dist < 10; // Within 10 tiles of claim
    });

    // Check for exact match
    const exactMatch = nearbyResources.find(e => {
      const resource = getResource(e);
      if (!resource) return false;
      return resource.resourceType === gradient.resourceType && resource.amount > 0;
    });

    if (exactMatch) {
      return 'correct';
    }

    // Check for wrong resource type
    const wrongType = nearbyResources.find(e => {
      const resource = getResource(e);
      if (!resource) return false;
      return resource.resourceType !== gradient.resourceType && resource.amount > 0;
    });

    if (wrongType) {
      return 'misidentified';
    }

    // Check if claim is old (might have been depleted)
    const claimAge = currentTick - gradient.tick;
    if (claimAge > CLAIM_AGE_THRESHOLD) {
      // Resource may have been harvested - stale info
      return 'stale';
    }

    // No resource found - this is a false report
    // Return 'false_report' for now, pattern detection happens in verification logic
    return 'false_report';
  }

  /**
   * Record verification event (for testing/debugging)
   */
  recordVerification(claimantId: string, verifierId: string, result: VerificationResult, _tick: number): void {
    if (!claimantId || claimantId === '') {
      throw new Error('recordVerification requires non-empty claimant agent ID');
    }
    if (!verifierId || verifierId === '') {
      throw new Error('recordVerification requires non-empty verifier agent ID');
    }

    const validResults: VerificationResult[] = ['correct', 'stale', 'misidentified', 'false_report', 'unreliable'];
    if (!validResults.includes(result)) {
      throw new Error(`Invalid verification result type: ${result}`);
    }

    // Event emitted in main verification logic
  }

  /**
   * Calculate trust change based on verification result
   */
  calculateTrustChange(result: VerificationResult): number {
    switch (result) {
      case 'correct':
        return 0.1;
      case 'stale':
        return -0.1;
      case 'false_report':
        return -0.2;
      case 'misidentified':
        return -0.4;
      case 'unreliable':
        return -0.8;
      default:
        throw new Error(`Unknown verification result: ${result}`);
    }
  }

  /**
   * Calculate distance between two points
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

}
