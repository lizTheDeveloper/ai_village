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
  private lastProcessedMessageCount: Map<string, number> = new Map();
  private lastUpdateTick: number = 0;
  private readonly updateInterval: number = 20; // Only run once per second (at 20 TPS)
  private pendingProcessing: string[] = []; // Queue of agent IDs waiting to be processed
  private readonly maxProcessPerUpdate: number = 2; // Process max 2 agents per update (round-robin)

  initialize(_world: World, _eventBus: EventBus): void {
    // Future: Subscribe to speech events via event bus
  }

  update(world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Throttle: Only run once per second instead of 20x per second
    if (world.tick - this.lastUpdateTick < this.updateInterval) {
      return;
    }
    this.lastUpdateTick = world.tick;
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

    // OPTIMIZATION: Only process speech when agents have NEW messages
    // Round-robin scheduling: Queue agents with new messages, process limited number per update
    const agents = entities.filter(e =>
      e.components.has('agent') &&
      e.components.has('conversation')
    );

    // Step 1: Identify agents with new messages and add to pending queue
    for (const agent of agents) {
      const impl = agent as EntityImpl;
      const speakerAgent = impl.getComponent('agent') as any;
      if (!speakerAgent) continue;

      const conversation = impl.getComponent('conversation') as any;
      if (!conversation || !conversation.recentMessages || conversation.recentMessages.length === 0) {
        continue;
      }

      const speakerId = speakerAgent.id;
      const messageCount = conversation.recentMessages.length;
      const lastCount = this.lastProcessedMessageCount.get(speakerId) ?? 0;

      // Queue agent if there are new messages and not already queued
      if (messageCount > lastCount && !this.pendingProcessing.includes(speakerId)) {
        this.pendingProcessing.push(speakerId);
      }
    }

    // Step 2: Process up to maxProcessPerUpdate agents from the queue (round-robin)
    const processCount = Math.min(this.maxProcessPerUpdate, this.pendingProcessing.length);
    for (let i = 0; i < processCount; i++) {
      const speakerId = this.pendingProcessing.shift();
      if (!speakerId) break;

      try {
        // Find the agent entity by ID
        const agent = entities.find(e => {
          if (e.components.has('agent')) {
            const agentComp = e.components.get('agent') as any;
            return agentComp?.id === speakerId;
          }
          return e.id === speakerId;
        });

        if (!agent) continue;

        const impl = agent as EntityImpl;
        const conversation = impl.getComponent('conversation') as any;
        if (!conversation) continue;

        // Process this agent's speech
        this._processSpeech(agent, entities, world, currentTick);

        // Update the message count to mark as processed
        this.lastProcessedMessageCount.set(speakerId, conversation.recentMessages.length);
      } catch (error) {
        throw new Error(`SocialGradientSystem failed for agent ${speakerId}: ${error}`);
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

    // Get the most recent message (the new one that triggered this processing)
    const messages = conversation.recentMessages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || !lastMessage.content) return;

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
      const socialGradient = listenerImpl.getComponent('social_gradient') as any;
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

    if (!impl.hasComponent('social_gradient')) {
      return undefined;
    }

    const socialGradient = impl.getComponent('social_gradient') as any;
    if (!socialGradient) return undefined;

    // Get trust scores if available
    let trustScores: Map<string, number> | undefined;
    if (impl.hasComponent('trust_network')) {
      const trustNetwork = impl.getComponent('trust_network') as any;
      if (trustNetwork) {
        trustScores = trustNetwork.scores;
      }
    }

    return socialGradient.getBlendedGradient(resourceType, trustScores);
  }
}
