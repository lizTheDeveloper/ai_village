import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { GradientParser } from '../parsers/GradientParser.js';
import type { ResourceType } from '../components/ResourceComponent.js';

/**
 * SocialGradientSystem listens for agent speech and parses gradient information
 * Updates SocialGradientComponent with trust-weighted directional hints
 */
export class SocialGradientSystem implements System {
  public readonly id: SystemId = 'social_gradient';
  public readonly priority: number = 22; // After AISystem, before Exploration
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Future: Add event bus support for gradient events
  private lastProcessedTick: Map<string, number> = new Map();

  initialize(_world: World, _eventBus: EventBus): void {
    // Future: Subscribe to speech events via event bus
  }

  update(world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Apply gradient decay to all entities
    const gradientsEntities = entities.filter(e => e.components.has('social_gradient'));

    for (const entity of gradientsEntities) {
      try {
        const impl = entity as EntityImpl;
        const socialGradient = impl.getComponent('social_gradient') as any;
        if (socialGradient) {
          socialGradient.applyDecay(currentTick);
        }
      } catch (error) {
        throw new Error(`SocialGradientSystem decay failed for entity ${entity.id}: ${error}`);
      }
    }

    // Process speech events from event bus
    // In a real implementation, this would listen to the event bus
    // For now, we'll scan for agents that just spoke (have ConversationComponent)
    const agents = entities.filter(e =>
      e.components.has('agent') &&
      e.components.has('conversation')
    );

    for (const agent of agents) {
      try {
        this._processSpeech(agent, entities, world, currentTick);
      } catch (error) {
        throw new Error(`SocialGradientSystem failed for entity ${agent.id}: ${error}`);
      }
    }
  }

  private _processSpeech(speaker: Entity, entities: ReadonlyArray<Entity>, _world: World, currentTick: number): void {
    const impl = speaker as EntityImpl;
    const speakerAgent = impl.getComponent('agent') as any;
    if (!speakerAgent) return;

    const conversation = impl.getComponent('conversation') as any;
    if (!conversation || !conversation.recentMessages || conversation.recentMessages.length === 0) {
      return;
    }

    const speakerId = speakerAgent.id;

    // Get the most recent message
    const messages = conversation.recentMessages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || !lastMessage.content) return;

    // Skip if we've already processed this message
    const messageKey = `${speakerId}:${currentTick}`;
    if (this.lastProcessedTick.get(messageKey) === currentTick) {
      return;
    }
    this.lastProcessedTick.set(messageKey, currentTick);

    // Parse gradients from speech
    const gradients = GradientParser.parseAll(lastMessage.content);

    if (gradients.length === 0) {
      return; // No gradient information found
    }

    // Get speaker's position for calculating claim positions
    const speakerPos = impl.getComponent('position') as any as { x: number; y: number } | undefined;

    // Broadcast gradients to nearby agents
    const listeners = entities.filter(e => {
      if (e.id === speaker.id) return false; // Don't send to self
      if (!e.components.has('agent')) return false;
      if (!e.components.has('social_gradient')) return false;
      if (!e.components.has('position')) return false;

      // Check if within hearing range (same as conversation system)
      if (speakerPos) {
        const listenerPos = e.components.get('position') as any as { x: number; y: number };
        const distance = this._distance(speakerPos, listenerPos);
        return distance < 20; // 20 tile hearing range
      }

      return true;
    });

    for (const listener of listeners) {
      const listenerImpl = listener as EntityImpl;
      const listenerAgent = listenerImpl.getComponent('agent') as any;
      if (!listenerAgent) continue;

      // Get trust score for speaker
      let trustScore = 0.5; // Default neutral
      if (listenerImpl.hasComponent('trust_network')) {
        const trustNetwork = listenerImpl.getComponent('trust_network') as any;
        if (trustNetwork) {
          trustScore = trustNetwork.getTrustScore(speakerId);
        }
      }

      // Add gradients to listener's social gradient component
      const socialGradient = listenerImpl.getComponent('SocialGradient') as any;
      if (!socialGradient) continue;

      for (const gradient of gradients) {
        // Calculate claim position if speaker position available
        let claimPosition: { x: number; y: number } | undefined;
        if (speakerPos && gradient.distance !== undefined) {
          claimPosition = this._calculateClaimPosition(
            speakerPos,
            gradient.bearing,
            gradient.distance
          );
        }

        // Add gradient with trust-weighted confidence
        socialGradient.addGradient({
          resourceType: gradient.resourceType,
          bearing: gradient.bearing,
          distance: gradient.distance ?? 50, // Default 50 tiles if not specified
          confidence: gradient.confidence * trustScore, // Weight by trust
          sourceAgentId: speakerId,
          tick: currentTick,
        });

        // Store claim position for verification
        // We'll extend the gradient interface to include this
        const allGradients = socialGradient.allGradients;
        const lastAddedGradient = allGradients[allGradients.length - 1];
        if (lastAddedGradient && claimPosition) {
          // Mutate to add claim position (not ideal but works for now)
          (lastAddedGradient as any).claimPosition = claimPosition;
        }
      }
    }
  }

  /**
   * Calculate world position from bearing and distance
   */
  private _calculateClaimPosition(
    origin: { x: number; y: number },
    bearing: number,
    distance: number
  ): { x: number; y: number } {
    // Convert bearing to radians (0° = North = -Y direction)
    const angleRad = (bearing - 90) * (Math.PI / 180);

    return {
      x: origin.x + Math.cos(angleRad) * distance,
      y: origin.y + Math.sin(angleRad) * distance,
    };
  }

  /**
   * Calculate distance between two points
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get blended gradient for navigation (exposed for other systems)
   */
  getBlendedGradient(
    entity: Entity,
    resourceType: ResourceType
  ): { bearing: number; strength: number; confidence: number } | undefined {
    const impl = entity as EntityImpl;

    if (!impl.hasComponent('SocialGradient')) {
      return undefined;
    }

    const socialGradient = impl.getComponent('SocialGradient') as any;
    if (!socialGradient) return undefined;

    // Get trust scores if available
    let trustScores: Map<string, number> | undefined;
    if (impl.hasComponent('TrustNetwork')) {
      const trustNetwork = impl.getComponent('TrustNetwork') as any;
      if (trustNetwork) {
        trustScores = trustNetwork.scores;
      }
    }

    return socialGradient.getBlendedGradient(resourceType, trustScores);
  }
}
