/**
 * FriendshipSystem
 *
 * Deep Conversation System - Phase 6: Emergent Social Dynamics
 *
 * Detects when true friendships emerge from repeated quality interactions.
 * Friendship criteria:
 * - High familiarity (60+)
 * - Positive affinity (40+)
 * - Multiple interactions (10+)
 *
 * Emits 'friendship:formed' events for narrative/UI purposes.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId, ComponentType } from '../types.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';

export class FriendshipSystem implements System {
  public readonly id: SystemId = 'friendship';
  public readonly priority: number = 17; // After RelationshipConversationSystem (16)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Agent,
    CT.Relationship,
  ];

  // Throttle updates - friendships don't form instantly
  private static readonly UPDATE_INTERVAL = 500; // Check every ~25 seconds (20 tps)
  private tickCounter = 0;

  // Thresholds for friendship detection
  private static readonly FRIENDSHIP_FAMILIARITY = 60;
  private static readonly FRIENDSHIP_AFFINITY = 40;
  private static readonly FRIENDSHIP_INTERACTIONS = 10;

  init(_world: World): void {
    // No initialization needed
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.tickCounter++;
    if (this.tickCounter % FriendshipSystem.UPDATE_INTERVAL !== 0) return;

    for (const entity of entities) {
      this.checkForNewFriendships(entity as EntityImpl, world);
    }
  }

  private checkForNewFriendships(entity: EntityImpl, world: World): void {
    const relationships = entity.getComponent<RelationshipComponent>(CT.Relationship);
    if (!relationships) return;

    const socialMemory = entity.getComponent<SocialMemoryComponent>(CT.SocialMemory);

    for (const [partnerId, relationship] of relationships.relationships) {
      // Already marked as friend?
      if (socialMemory) {
        const memory = socialMemory.socialMemories.get(partnerId);
        if (memory?.relationshipType === 'friend') continue;
      }

      // Check friendship criteria
      const meetsThresholds =
        relationship.familiarity >= FriendshipSystem.FRIENDSHIP_FAMILIARITY &&
        relationship.affinity >= FriendshipSystem.FRIENDSHIP_AFFINITY &&
        relationship.interactionCount >= FriendshipSystem.FRIENDSHIP_INTERACTIONS;

      if (meetsThresholds) {
        // New friendship formed!
        this.markAsFriend(entity, partnerId, socialMemory, world);

        // Emit event
        this.emitFriendshipEvent(entity, partnerId, world);
      }
    }
  }

  private markAsFriend(
    entity: EntityImpl,
    partnerId: string,
    socialMemory: SocialMemoryComponent | undefined,
    world: World
  ): void {
    if (!socialMemory) return;

    const existingMemory = socialMemory.socialMemories.get(partnerId);
    if (!existingMemory) {
      // Record a first interaction to create the memory, then update relationship type
      socialMemory.recordInteraction({
        agentId: partnerId,
        interactionType: 'friendship_formed',
        sentiment: 0.5,
        timestamp: Date.now(),
        trustDelta: 0.1,
      });
    }
    // Update relationship type using the component's method
    socialMemory.updateRelationshipType(partnerId, 'friend');
  }

  private emitFriendshipEvent(
    entity: EntityImpl,
    partnerId: string,
    world: World
  ): void {
    const partner = world.getEntity(partnerId);
    if (!partner) return;

    const selfIdentity = entity.getComponent<IdentityComponent>(CT.Identity);
    const partnerIdentity = partner.components.get(CT.Identity) as IdentityComponent | undefined;

    const selfName = selfIdentity?.name ?? 'Unknown';
    const partnerName = partnerIdentity?.name ?? 'Unknown';

    world.eventBus.emit({
      type: 'friendship:formed',
      source: entity.id,
      data: {
        agent1: entity.id,
        agent2: partnerId,
        agent1Name: selfName,
        agent2Name: partnerName,
      },
    });
  }

}
