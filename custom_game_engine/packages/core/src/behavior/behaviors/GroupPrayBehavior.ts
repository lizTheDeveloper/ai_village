/**
 * GroupPrayBehavior - Agents pray together for amplified effect
 *
 * Part of Phase 27: Divine Communication System
 *
 * Group prayer mechanics:
 * - Leader initiates and speaks the prayer aloud
 * - Other participants join and add belief
 * - Amplified effect based on number of participants
 * - Higher chance of group visions
 * - Strengthens community bonds
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SpiritualComponent, Prayer, PrayerType } from '../../components/SpiritualComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { RelationshipComponent } from '../../components/RelationshipComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import { recordPrayer } from '../../components/SpiritualComponent.js';

/**
 * Group prayer configuration
 */
const GROUP_PRAYER_CONFIG = {
  // Gathering
  GATHER_RADIUS: 15, // How far to look for participants
  MIN_PARTICIPANTS: 2, // Minimum for group prayer
  MAX_PARTICIPANTS: 10, // Maximum participants
  GATHER_TIMEOUT: 200, // Ticks to wait for others to gather

  // Duration
  BASE_DURATION: 400, // ~20 seconds
  PER_PARTICIPANT_BONUS: 50, // Extra ticks per participant

  // Power amplification
  BASE_AMPLIFICATION: 1.0,
  PER_PARTICIPANT_AMPLIFICATION: 0.2, // +20% per participant

  // Vision chance
  BASE_VISION_CHANCE: 0.3, // 30% base for group
  PER_PARTICIPANT_VISION_BONUS: 0.05, // +5% per participant
};

/**
 * Group prayer phases
 */
type GroupPrayerPhase = 'gathering' | 'praying' | 'complete';

/**
 * Group prayer call phrases
 */
const GATHERING_CALLS = [
  'Come, let us pray together!',
  'Join me in prayer, friends.',
  'The divine awaits our voices united.',
  'Together, our prayers grow strong.',
];

const GROUP_PRAYERS = [
  'Together we call upon you, divine presence.',
  'Hear our united voices.',
  'We gather as one to seek your guidance.',
  'Bless this community with your wisdom.',
  'Watch over us all, we pray.',
];

let groupPrayerIdCounter = 0;

/**
 * GroupPrayBehavior - Coordinated spiritual practice
 */
export class GroupPrayBehavior extends BaseBehavior {
  readonly name = 'group_pray' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const state = this.getState(entity);
    const currentTick = world.tick;
    const phase = (state.phase as GroupPrayerPhase) ?? 'gathering';

    const spiritual = entity.getComponent<SpiritualComponent>(ComponentType.Spiritual);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);

    if (!spiritual || !agent || !position) {
      return { complete: true, nextBehavior: 'idle', reason: 'missing_components' };
    }

    switch (phase) {
      case 'gathering':
        return this.handleGatheringPhase(entity, position, world, currentTick);
      case 'praying':
        return this.handlePrayingPhase(entity, spiritual, world, currentTick);
      case 'complete':
        return { complete: true, nextBehavior: 'wander', reason: 'group_prayer_complete' };
    }
  }

  /**
   * Gathering phase - call others and wait for them to arrive
   */
  private handleGatheringPhase(
    entity: EntityImpl,
    position: PositionComponent,
    world: World,
    currentTick: number
  ): BehaviorResult | void {
    this.disableSteeringAndStop(entity);
    const state = this.getState(entity);

    // Initialize gathering
    if (!state.gatherStarted) {
      const call = GATHERING_CALLS[Math.floor(Math.random() * GATHERING_CALLS.length)]!;

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: call,
      }));

      // Emit call to prayer event (using untyped emit for custom event)
      const eventBus = world.eventBus as { emit: (event: unknown) => void };
      eventBus.emit({
        type: 'group_prayer:call',
        source: 'group_pray_behavior',
        data: {
          leaderId: entity.id,
          location: { x: position.x, y: position.y },
          message: call,
          tick: currentTick,
        },
      });

      this.updateState(entity, {
        gatherStarted: currentTick,
        isLeader: true,
        participants: [entity.id],
      });
      return;
    }

    // Check for timeout
    const elapsed = currentTick - (state.gatherStarted as number);
    if (elapsed > GROUP_PRAYER_CONFIG.GATHER_TIMEOUT) {
      // Find nearby agents who might join
      const participants = this.gatherParticipants(entity, position, world);

      if (participants.length < GROUP_PRAYER_CONFIG.MIN_PARTICIPANTS) {
        // Not enough participants, pray alone instead
        return {
          complete: true,
          nextBehavior: 'pray',
          reason: 'insufficient_participants',
        };
      }

      // Transition to praying phase
      this.updateState(entity, {
        phase: 'praying',
        participants: participants.map(p => p.id),
        prayerStarted: currentTick,
      });

      // Notify participants (using untyped emit for custom event)
      const eventBus = world.eventBus as { emit: (event: unknown) => void };
      for (const participant of participants) {
        if (participant.id !== entity.id) {
          eventBus.emit({
            type: 'group_prayer:joined',
            source: 'group_pray_behavior',
            data: {
              participantId: participant.id,
              leaderId: entity.id,
              tick: currentTick,
            },
          });
        }
      }

      return;
    }

    // Still waiting
    if (elapsed % 100 === 0) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'Waiting for others to gather...',
      }));
    }
  }

  /**
   * Praying phase - conduct the group prayer
   */
  private handlePrayingPhase(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    world: World,
    currentTick: number
  ): BehaviorResult | void {
    this.disableSteeringAndStop(entity);
    const state = this.getState(entity);

    const participants = state.participants as string[] || [];
    const prayerStarted = state.prayerStarted as number;
    const duration = GROUP_PRAYER_CONFIG.BASE_DURATION +
      (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_BONUS);

    const elapsed = currentTick - prayerStarted;

    // Periodic group prayer utterances (only leader speaks)
    if (state.isLeader) {
      const lastUtterance = (state.lastUtterance as number) ?? 0;
      if (currentTick - lastUtterance > 100) {
        const prayer = GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          lastThought: prayer,
        }));
        this.updateState(entity, { lastUtterance: currentTick });

        // Emit spoken prayer (using untyped emit for custom event fields)
        const eventBus = world.eventBus as { emit: (event: unknown) => void };
        eventBus.emit({
          type: 'agent:speak',
          source: 'group_pray_behavior',
          data: {
            agentId: entity.id,
            text: prayer,
            category: 'prayer' as const,
            tick: currentTick,
          },
        });
      }
    }

    // Complete prayer
    if (elapsed >= duration) {
      return this.completeGroupPrayer(entity, spiritual, participants, world, currentTick);
    }

    // Continue praying
  }

  /**
   * Complete the group prayer
   */
  private completeGroupPrayer(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    participants: string[],
    world: World,
    currentTick: number
  ): BehaviorResult {
    const state = this.getState(entity);

    // Calculate amplification
    const amplification = GROUP_PRAYER_CONFIG.BASE_AMPLIFICATION +
      (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_AMPLIFICATION);

    // Create group prayer record
    const prayer: Prayer = {
      id: `group_prayer_${groupPrayerIdCounter++}`,
      type: 'praise' as PrayerType,
      urgency: 'routine',
      content: 'United prayer of the community.',
      timestamp: currentTick,
      answered: false,
    };

    // Record prayer for leader
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);
    entity.addComponent(updatedSpiritual);

    // Calculate vision chance
    const visionChance = GROUP_PRAYER_CONFIG.BASE_VISION_CHANCE +
      (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_VISION_BONUS);

    const receivedGroupVision = Math.random() < visionChance;

    // Emit group prayer complete event (using untyped emit for custom event)
    const eventBus = world.eventBus as { emit: (event: unknown) => void };
    eventBus.emit({
      type: 'group_prayer:complete',
      source: 'group_pray_behavior',
      data: {
        leaderId: entity.id,
        participants,
        tick: currentTick,
        duration: participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_BONUS + GROUP_PRAYER_CONFIG.BASE_DURATION,
        deityId: entity.getComponent<SpiritualComponent>(ComponentType.Spiritual)?.believedDeity,
        answered: false,
        prayerPower: amplification,
      },
    });

    // If vision received, emit vision event
    if (receivedGroupVision && state.isLeader) {
      eventBus.emit({
        type: 'group_vision:received',
        source: 'group_pray_behavior',
        data: {
          participants,
          deityId: entity.getComponent<SpiritualComponent>(ComponentType.Spiritual)?.believedDeity,
          clarity: Math.min(1.0, 0.6 + (participants.length * 0.05)),
          prayerPower: amplification,
        },
      });

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'A vision came to all of us!',
      }));
    } else {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: 'The prayer is complete. We are blessed.',
      }));
    }

    // Improve relationships between participants
    this.improveParticipantRelationships(entity, participants, world);

    return {
      complete: true,
      nextBehavior: 'wander',
      reason: 'group_prayer_complete',
    };
  }

  /**
   * Find nearby agents willing to join group prayer
   */
  private gatherParticipants(
    leader: EntityImpl,
    leaderPos: PositionComponent,
    world: World
  ): EntityImpl[] {
    const participants: EntityImpl[] = [leader];

    // Query nearby agents with spiritual components
    const nearbyAgents = world.query()
      .with(ComponentType.Agent)
      .with(ComponentType.Spiritual)
      .with(ComponentType.Position)
      .executeEntities();

    for (const agent of nearbyAgents) {
      if (agent.id === leader.id) continue;
      if (participants.length >= GROUP_PRAYER_CONFIG.MAX_PARTICIPANTS) break;

      const agentPos = agent.components.get(ComponentType.Position) as PositionComponent | undefined;
      const spiritual = agent.components.get(ComponentType.Spiritual) as SpiritualComponent | undefined;
      const agentComp = agent.components.get(ComponentType.Agent) as AgentComponent | undefined;

      if (!agentPos || !spiritual || !agentComp) continue;

      // Check distance
      const dx = agentPos.x - leaderPos.x;
      const dy = agentPos.y - leaderPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > GROUP_PRAYER_CONFIG.GATHER_RADIUS) continue;

      // Check if agent is busy with critical behavior
      const busyBehaviors = ['flee', 'seek_food', 'seek_sleep', 'forced_sleep'];
      if (busyBehaviors.includes(agentComp.behavior)) continue;

      // Check willingness based on faith
      if (spiritual.faith < 0.2) continue; // Low faith agents won't join
      if (spiritual.crisisOfFaith) continue; // Crisis agents won't join groups

      // Add to participants
      participants.push(agent as EntityImpl);
    }

    return participants;
  }

  /**
   * Improve relationships between prayer participants
   */
  private improveParticipantRelationships(
    _entity: EntityImpl,
    participants: string[],
    world: World
  ): void {
    for (const participantId of participants) {
      const participant = world.getEntity(participantId);
      if (!participant) continue;

      const relationships = participant.components.get(ComponentType.Relationship) as RelationshipComponent | undefined;
      if (!relationships) continue;

      // Improve relationships with other participants
      for (const otherId of participants) {
        if (otherId === participantId) continue;

        // Emit relationship improvement event (using untyped emit for custom event)
        const eventBus = world.eventBus as { emit: (event: unknown) => void };
        eventBus.emit({
          type: 'relationship:improved',
          source: 'group_pray_behavior',
          data: {
            agent1: participantId,
            agent2: otherId,
            reason: 'shared_prayer',
            delta: 0.05, // Small but meaningful improvement
          },
        });
      }
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function groupPrayBehavior(entity: EntityImpl, world: World): void {
  const behavior = new GroupPrayBehavior();
  behavior.execute(entity, world);
}
