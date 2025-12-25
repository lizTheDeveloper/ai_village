import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import { isInConversation, endConversation } from '../components/ConversationComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';

export class CommunicationSystem implements System {
  public readonly id: SystemId = 'communication';
  public readonly priority: number = 15; // Run after AI (10), before movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'conversation',
  ];

  private readonly maxConversationDurationSeconds: number = 15; // 15 seconds of conversation
  private conversationStartTimes: Map<string, number> = new Map(); // entityId -> real-time start

  update(_world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const conversation = impl.getComponent<ConversationComponent>('conversation');

      if (!conversation || !isInConversation(conversation)) continue;

      const partnerId = conversation.partnerId;
      if (!partnerId) continue;

      // Check if partner still exists and is nearby
      const partner = _world.getEntity(partnerId);
      if (!partner) {
        // Partner no longer exists, end conversation
        impl.updateComponent<ConversationComponent>('conversation', endConversation);

        // Clean up timing tracker
        this.conversationStartTimes.delete(entity.id);

        // Switch agent back to wandering
        const agent = impl.getComponent<AgentComponent>('agent');
        if (agent && agent.behavior === 'talk') {
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'wander',
            behaviorState: {},
          }));
        }
        continue;
      }

      // Track conversation time in real seconds, not ticks
      if (!this.conversationStartTimes.has(entity.id)) {
        this.conversationStartTimes.set(entity.id, Date.now());
      }

      const startTime = this.conversationStartTimes.get(entity.id)!;
      const durationSeconds = (Date.now() - startTime) / 1000;

      if (durationSeconds > this.maxConversationDurationSeconds) {
        // Conversation has gone on too long, end it
        impl.updateComponent<ConversationComponent>('conversation', endConversation);

        // Clean up timing tracker
        this.conversationStartTimes.delete(entity.id);

        // End partner's conversation too
        const partnerImpl = partner as EntityImpl;
        const partnerConversation = partnerImpl.getComponent<ConversationComponent>('conversation');
        if (partnerConversation) {
          partnerImpl.updateComponent<ConversationComponent>('conversation', endConversation);
          this.conversationStartTimes.delete(partnerId);
        }

        // Switch both agents back to wandering
        const agent = impl.getComponent<AgentComponent>('agent');
        if (agent && agent.behavior === 'talk') {
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'wander',
            behaviorState: {},
          }));
        }

        const partnerAgent = partnerImpl.getComponent<AgentComponent>('agent');
        if (partnerAgent && partnerAgent.behavior === 'talk') {
          partnerImpl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'wander',
            behaviorState: {},
          }));
        }

        // Emit conversation ended event
        _world.eventBus.emit({
          type: 'conversation:ended',
          source: entity.id,
          data: {
            conversationId: `conv-${entity.id}-${partnerId}`,
            participants: [entity.id, partnerId],
            agent1: entity.id,
            agent2: partnerId,
            duration: durationSeconds,
          },
        });
      }
    }
  }
}
