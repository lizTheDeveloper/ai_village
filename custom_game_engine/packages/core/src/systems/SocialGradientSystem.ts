import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { GradientParser } from '../parsers/GradientParser.js';
import type { ResourceType } from '../components/ResourceComponent.js';
import {
  getAgent,
  getPosition,
  getConversation,
  getSocialGradient,
  getTrustNetwork
} from '../utils/componentHelpers.js';

/**
 * SocialGradientSystem listens for agent speech and parses gradient information
 * Updates SocialGradientComponent with trust-weighted directional hints
 */
export class SocialGradientSystem extends BaseSystem {
  public readonly id: SystemId = CT.SocialGradient;
  public readonly priority: number = 22; // After AISystem, before Exploration
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.SocialGradient];

  // Lazy activation: Skip entire system when no social_gradient components exist in world
  public readonly activationComponents = [CT.SocialGradient] as const;

  protected readonly throttleInterval: number = 200; // VERY_SLOW - 10 seconds (social gradients change slowly)

  // Future: Add event bus support for gradient events
  private lastProcessedMessageCount: Map<string, number> = new Map();
  private pendingProcessing = new Set<string>(); // Set for O(1) lookup - queue of agent IDs waiting to be processed
  private readonly maxProcessPerUpdate: number = 2; // Process max 2 agents per update (round-robin)

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Future: Subscribe to speech events via event bus
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, tick } = ctx;

    // Apply gradient decay to all entities (already filtered by requiredComponents to have SocialGradient)
    for (const entity of activeEntities) {
      try {
        const socialGradient = getSocialGradient(entity);
        if (socialGradient) {
          socialGradient.applyDecay(tick);
        }
      } catch (error) {
        throw new Error(`SocialGradientSystem decay failed for entity ${entity.id}: ${error}`);
      }
    }

    // OPTIMIZATION: Only process speech when agents have NEW messages
    // Round-robin scheduling: Queue agents with new messages, process limited number per update
    const agents = activeEntities.filter(e =>
      e.components.has(CT.Agent) &&
      e.components.has(CT.Conversation)
    );

    // Step 1: Identify agents with new messages and add to pending queue
    for (const agent of agents) {
      const speakerAgent = getAgent(agent);
      if (!speakerAgent) continue;

      const conversation = getConversation(agent);
      if (!conversation || !conversation.messages || conversation.messages.length === 0) {
        continue;
      }

      const speakerId = agent.id;
      const messageCount = conversation.messages.length;
      const lastCount = this.lastProcessedMessageCount.get(speakerId) ?? 0;

      // Queue agent if there are new messages and not already queued - O(1) Set lookup
      if (messageCount > lastCount && !this.pendingProcessing.has(speakerId)) {
        this.pendingProcessing.add(speakerId);
      }
    }

    // Build entity lookup map for O(1) access by ID
    const entityById = new Map(activeEntities.map(e => [e.id, e]));

    // Step 2: Process up to maxProcessPerUpdate agents from the queue (round-robin)
    const processCount = Math.min(this.maxProcessPerUpdate, this.pendingProcessing.size);
    const speakersToProcess = Array.from(this.pendingProcessing).slice(0, processCount);

    for (const speakerId of speakersToProcess) {
      this.pendingProcessing.delete(speakerId);

      try {
        // O(1) lookup by ID using map
        const agent = entityById.get(speakerId);

        if (!agent) continue;

        const conversation = getConversation(agent);
        if (!conversation) continue;

        // Process this agent's speech
        this._processSpeech(agent, activeEntities, ctx.world, tick);

        // Update the message count to mark as processed
        this.lastProcessedMessageCount.set(speakerId, conversation.messages.length);
      } catch (error) {
        throw new Error(`SocialGradientSystem failed for agent ${speakerId}: ${error}`);
      }
    }
  }

  private _processSpeech(speaker: Entity, entities: ReadonlyArray<Entity>, _world: World, currentTick: number): void {
    const speakerAgent = getAgent(speaker);
    if (!speakerAgent) return;

    const conversation = getConversation(speaker);
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return;
    }

    const speakerId = speaker.id;

    // Get the most recent message (the new one that triggered this processing)
    const messages = conversation.messages;
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || !lastMessage.message) return;

    // Parse gradients from speech
    const gradients = GradientParser.parseAll(lastMessage.message);

    if (gradients.length === 0) {
      return; // No gradient information found
    }

    // Get speaker's position for calculating claim positions
    const speakerPos = getPosition(speaker);

    // Broadcast gradients to nearby agents
    const listeners = entities.filter(e => {
      if (e.id === speaker.id) return false; // Don't send to self
      if (!e.components.has(CT.Agent)) return false;
      if (!e.components.has(CT.SocialGradient)) return false;
      if (!e.components.has(CT.Position)) return false;

      // Check if within hearing range (same as conversation system)
      if (speakerPos) {
        const listenerPos = getPosition(e);
        if (listenerPos) {
          const distance = this._distance(speakerPos, listenerPos);
          return distance < 20; // 20 tile hearing range
        }
      }

      return true;
    });

    for (const listener of listeners) {
      const listenerAgent = getAgent(listener);
      if (!listenerAgent) continue;

      // Get trust score for speaker
      let trustScore = 0.5; // Default neutral
      const trustNetwork = getTrustNetwork(listener);
      if (trustNetwork) {
        trustScore = trustNetwork.getTrustScore(speakerId);
      }

      // Add gradients to listener's social gradient component
      const socialGradient = getSocialGradient(listener);
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
          claimPosition, // Include claim position for verification
        });
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
    if (!entity.components.has(CT.SocialGradient)) {
      return undefined;
    }

    const socialGradient = getSocialGradient(entity);
    if (!socialGradient) return undefined;

    // Get trust scores if available
    let trustScores: Map<string, number> | undefined;
    const trustNetwork = getTrustNetwork(entity);
    if (trustNetwork) {
      // Convert ReadonlyMap to Map for compatibility
      trustScores = new Map(trustNetwork.scores);
    }

    return socialGradient.getBlendedGradient(resourceType, trustScores);
  }
}
