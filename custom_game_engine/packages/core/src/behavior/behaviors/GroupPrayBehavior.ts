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
import type { Relationship, RelationshipComponent } from '../../components/RelationshipComponent.js';
import type { GeneticComponent } from '../../components/GeneticComponent.js';
import {
  getCultureAffinityScore,
  getSynchronizedParticipationScore,
} from '../../components/GeneticComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import { recordPrayer } from '../../components/SpiritualComponent.js';
import { getCanonicalTraits, type MythologyComponent } from '../../components/MythComponent.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

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

export interface GroupPrayerJoinSignals {
  faith: number;
  cultureAffinityParticipation: number;
  cultureAffinity: number;
  oxytocin?: number;
  cortisol?: number;
  speciesId?: string;
  relationshipAffinity?: number;
  relationshipTrust?: number;
  relationshipFamiliarity?: number;
}

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

/** Myth-themed prayers for wrathful deities */
const WRATHFUL_DEITY_PRAYERS = [
  'We tremble before your righteous fury!',
  'Spare us your wrath, O mighty one!',
  'We offer our devotion to calm your storm!',
  'Judge us worthy, O terrible and great!',
  'Your anger shapes the world — we bow before it!',
];

/** Myth-themed prayers for benevolent deities */
const BENEVOLENT_DEITY_PRAYERS = [
  'Your mercy flows like water upon us!',
  'We bask in your boundless compassion!',
  'Guide us with your gentle wisdom!',
  'Your love sustains all living things!',
  'We give thanks for your endless grace!',
];

/** Myth-themed prayers for powerful deities */
const POWERFUL_DEITY_PRAYERS = [
  'Your power shapes the very earth beneath us!',
  'We stand in awe of your dominion!',
  'Grant us a fraction of your strength!',
  'All creation bends to your will!',
  'We honor the source of all power!',
];

let groupPrayerIdCounter = 0;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeSignedRelationshipValue(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5;
  return clamp01((Math.max(-100, Math.min(100, value)) + 100) / 200);
}

function normalizeBoundedRelationshipValue(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5;
  return clamp01(Math.max(0, Math.min(100, value)) / 100);
}

export function getCultureAffinityParticipationScore(genetic: GeneticComponent | undefined): number {
  return getSynchronizedParticipationScore(genetic);
}

export function calculateGroupPrayerJoinChance(signals: GroupPrayerJoinSignals): number {
  const cultureAffinityParticipation = clamp01(signals.cultureAffinityParticipation);
  const cultureAffinity = clamp01(signals.cultureAffinity);
  const faithScore = clamp01((clamp01(signals.faith) - 0.2) / 0.8);
  const oxytocin = clamp01(signals.oxytocin ?? 0.5);
  const cortisol = clamp01(signals.cortisol ?? 0.5);
  const relationshipAffinity = normalizeSignedRelationshipValue(signals.relationshipAffinity);
  const relationshipTrust = normalizeBoundedRelationshipValue(signals.relationshipTrust);
  const relationshipFamiliarity = normalizeBoundedRelationshipValue(signals.relationshipFamiliarity);
  const socialScaffolding = clamp01(
    (relationshipAffinity * 0.6) +
    (relationshipTrust * 0.25) +
    (relationshipFamiliarity * 0.15)
  );
  const biochemistryReadiness = clamp01(0.5 + (oxytocin - cortisol) * 0.5);
  const isNornLike = (signals.speciesId ?? '').toLowerCase().includes('norn');
  const nornBonus = isNornLike && biochemistryReadiness > 0.55 ? 0.08 : 0;
  const scaffoldingGate = isNornLike
    ? 1
    : clamp01((socialScaffolding * 0.7) + (faithScore * 0.3));

  return clamp01(
    0.05 +
    (cultureAffinityParticipation * 0.3) +
    (cultureAffinity * 0.2) +
    (faithScore * 0.15) +
    (socialScaffolding * 0.15) +
    (biochemistryReadiness * 0.15) +
    nornBonus
  ) * scaffoldingGate;
}

function getBiochemistrySignals(entity: EntityImpl): { oxytocin: number; cortisol: number } {
  const biochemistry = entity.getComponent(ComponentType.Biochemistry) as {
    oxytocin?: number;
    cortisol?: number;
  } | undefined;
  return {
    oxytocin: clamp01(biochemistry?.oxytocin ?? 0.5),
    cortisol: clamp01(biochemistry?.cortisol ?? 0.5),
  };
}

function getSpeciesId(entity: EntityImpl): string {
  const species = entity.getComponent(ComponentType.Species) as { speciesId?: string } | undefined;
  return species?.speciesId ?? '';
}

function getJoinSignals(
  agent: EntityImpl,
  spiritual: SpiritualComponent,
  genetic: GeneticComponent | undefined,
  relationship: Relationship | undefined
): GroupPrayerJoinSignals {
  const biochemistry = getBiochemistrySignals(agent);
  return {
    faith: spiritual.faith,
    cultureAffinityParticipation: getCultureAffinityParticipationScore(genetic),
    cultureAffinity: getCultureAffinityScore(genetic),
    oxytocin: biochemistry.oxytocin,
    cortisol: biochemistry.cortisol,
    speciesId: getSpeciesId(agent),
    relationshipAffinity: relationship?.affinity,
    relationshipTrust: relationship?.trust,
    relationshipFamiliarity: relationship?.familiarity,
  };
}

function getRelationshipToLeader(
  agent: EntityImpl,
  leaderId: string
): Relationship | undefined {
  return agent.getComponent<RelationshipComponent>(ComponentType.Relationship)
    ?.relationships
    .get(leaderId);
}

function shouldAgentJoinGroupPrayer(
  agent: EntityImpl,
  leaderId: string,
  spiritual: SpiritualComponent,
  genetic: GeneticComponent | undefined
): boolean {
  const relationship = getRelationshipToLeader(agent, leaderId);
  const joinSignals = getJoinSignals(agent, spiritual, genetic, relationship);
  return shouldJoinGroupPrayer(joinSignals);
}

function getContextJoinSignals(
  agent: EntityImpl,
  leaderId: string,
  spiritual: SpiritualComponent,
  genetic: GeneticComponent | undefined
): GroupPrayerJoinSignals {
  const relationship = getRelationshipToLeader(agent, leaderId);
  return getJoinSignals(agent, spiritual, genetic, relationship);
}

export function calculateJoinChanceForEntity(
  agent: EntityImpl,
  leaderId: string,
  spiritual: SpiritualComponent,
  genetic: GeneticComponent | undefined
): number {
  return calculateGroupPrayerJoinChance(
    getContextJoinSignals(agent, leaderId, spiritual, genetic)
  );
}

export function shouldJoinGroupPrayer(
  signals: GroupPrayerJoinSignals,
  rng: () => number = Math.random
): boolean {
  return rng() < calculateGroupPrayerJoinChance(signals);
}

/**
 * GroupPrayBehavior - Coordinated spiritual practice
 */
export class GroupPrayBehavior extends BaseBehavior {
  readonly name = 'group_pray' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const state = this.getState(entity);
    const currentTick = world.tick;
    const phase = (state.phase as GroupPrayerPhase) ?? 'gathering';

    const spiritual = entity.getComponent(ComponentType.Spiritual);
    const agent = entity.getComponent(ComponentType.Agent);
    const position = entity.getComponent(ComponentType.Position);

    if (!spiritual || !agent || !position) {
      throw new Error(`[GroupPrayBehavior] Agent ${entity.id} missing required components: spiritual=${!!spiritual}, agent=${!!agent}, position=${!!position}`);
    }

    switch (phase) {
      case 'gathering':
        return this.handleGatheringPhase(entity, position, world, currentTick);
      case 'praying':
        return this.handlePrayingPhase(entity, spiritual, world, currentTick);
      case 'complete':
        return { complete: true, reason: 'group_prayer_complete' };
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

      // Emit call to prayer event
      world.eventBus.emit({
        type: 'group_prayer:call' as const,
        source: 'group_pray_behavior' as const,
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

      // Notify participants
      for (const participant of participants) {
        if (participant.id !== entity.id) {
          world.eventBus.emit({
            type: 'group_prayer:joined' as const,
            source: 'group_pray_behavior' as const,
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
        const prayer = this._selectMythAwarePrayer(entity, world);
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          lastThought: prayer,
        }));
        this.updateState(entity, { lastUtterance: currentTick });

        // Emit spoken prayer
        world.eventBus.emit({
          type: 'agent:speak' as const,
          source: 'group_pray_behavior' as const,
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

    // Myth-aware amplification: canonical myth traits modulate prayer power
    let mythAmplification = 1.0;
    const deityId = entity.getComponent(ComponentType.Spiritual)?.believedDeity;
    if (deityId) {
      const deityEntity = world.getEntity(deityId);
      if (deityEntity) {
        const mythComp = deityEntity.getComponent(ComponentType.Mythology) as MythologyComponent | undefined;
        if (mythComp) {
          const traits = getCanonicalTraits(mythComp);
          // More canonical myths = stronger prayer resonance
          if (traits.size > 0) {
            // Each canonical trait adds up to 10% prayer power
            let traitBonus = 0;
            for (const [, score] of traits) {
              traitBonus += Math.abs(score) * 0.1;
            }
            mythAmplification = Math.min(1.5, 1.0 + traitBonus);
          }
        }
      }
    }
    const finalAmplification = amplification * mythAmplification;

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
    // Cast required: Entity interface doesn't expose mutation methods
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);
    (entity as EntityImpl).addComponent(updatedSpiritual);

    // Calculate vision chance
    const visionChance = GROUP_PRAYER_CONFIG.BASE_VISION_CHANCE +
      (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_VISION_BONUS);

    const receivedGroupVision = Math.random() < visionChance;

    // Emit group prayer complete event
    world.eventBus.emit({
      type: 'group_prayer:complete' as const,
      source: 'group_pray_behavior' as const,
      data: {
        leaderId: entity.id,
        participants,
        tick: currentTick,
        duration: participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_BONUS + GROUP_PRAYER_CONFIG.BASE_DURATION,
        deityId: entity.getComponent(ComponentType.Spiritual)?.believedDeity,
        answered: false,
        prayerPower: finalAmplification,
      },
    });

    // If vision received, emit vision event
    if (receivedGroupVision && state.isLeader) {
      world.eventBus.emit({
        type: 'group_vision:received' as const,
        source: 'group_pray_behavior' as const,
        data: {
          participants,
          deityId: entity.getComponent(ComponentType.Spiritual)?.believedDeity,
          clarity: Math.min(1.0, 0.6 + (participants.length * 0.05)),
          prayerPower: finalAmplification,
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
      reason: 'group_prayer_complete',
    };
  }

  /**
   * Select a prayer that reflects the deity's canonical myth traits
   */
  private _selectMythAwarePrayer(entity: EntityImpl, world: World): string {
    const deityId = entity.getComponent(ComponentType.Spiritual)?.believedDeity;
    if (!deityId) {
      return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
    }

    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) {
      return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
    }

    const mythComp = deityEntity.getComponent(ComponentType.Mythology) as MythologyComponent | undefined;
    if (!mythComp) {
      return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
    }

    const traits = getCanonicalTraits(mythComp);
    if (traits.size === 0) {
      return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
    }

    // Find dominant trait
    let dominantTrait = '';
    let maxScore = 0;
    for (const [trait, score] of traits) {
      if (Math.abs(score) > maxScore) {
        maxScore = Math.abs(score);
        dominantTrait = trait;
      }
    }

    // Select prayer pool based on dominant trait
    let prayerPool: string[];
    switch (dominantTrait) {
      case 'wrathfulness':
      case 'vengeance':
      case 'judgment':
        prayerPool = WRATHFUL_DEITY_PRAYERS;
        break;
      case 'benevolence':
      case 'compassion':
      case 'mercy':
        prayerPool = BENEVOLENT_DEITY_PRAYERS;
        break;
      case 'power':
      case 'dominion':
      case 'creation':
        prayerPool = POWERFUL_DEITY_PRAYERS;
        break;
      default:
        prayerPool = GROUP_PRAYERS;
        break;
    }

    return prayerPool[Math.floor(Math.random() * prayerPool.length)]!;
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

      const agentPos = agent.getComponent(ComponentType.Position);
      const spiritual = agent.getComponent(ComponentType.Spiritual);
      const agentComp = agent.getComponent(ComponentType.Agent);
      const genetic = agent.getComponent<GeneticComponent>(ComponentType.Genetic);

      if (!agentPos || !spiritual || !agentComp) continue;

      // Check distance (using squared distance for performance)
      const dx = agentPos.x - leaderPos.x;
      const dy = agentPos.y - leaderPos.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > GROUP_PRAYER_CONFIG.GATHER_RADIUS * GROUP_PRAYER_CONFIG.GATHER_RADIUS) continue;

      // Check if agent is busy with critical behavior
      const busyBehaviors = ['flee', 'seek_food', 'seek_sleep', 'forced_sleep'];
      if (busyBehaviors.includes(agentComp.behavior)) continue;

      // Check willingness based on faith
      if (spiritual.faith < 0.2) continue; // Low faith agents won't join
      if (spiritual.crisisOfFaith) continue; // Crisis agents won't join groups

      if (!shouldAgentJoinGroupPrayer(agent as EntityImpl, leader.id, spiritual, genetic)) {
        continue;
      }

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

      const relationships = participant.getComponent<RelationshipComponent>(ComponentType.Relationship);
      if (!relationships) continue;

      // Improve relationships with other participants
      for (const otherId of participants) {
        if (otherId === participantId) continue;

        // Emit relationship improvement event (from participant's perspective)
        world.eventBus.emit({
          type: 'relationship:improved' as const,
          source: 'group_pray_behavior' as const,
          data: {
            targetAgent: otherId,
            reason: 'shared_prayer',
            amount: 0.05, // Small but meaningful improvement
          },
        });
      }
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use groupPrayBehaviorWithContext for new code
 */
export function groupPrayBehavior(entity: EntityImpl, world: World): void {
  const behavior = new GroupPrayBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Modern group_pray behavior using BehaviorContext.
 * @example registerBehaviorWithContext('group_pray', groupPrayBehaviorWithContext);
 */
export function groupPrayBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const phase = (ctx.getState<string>('phase')) ?? 'gathering';

  const spiritual = ctx.getComponent<SpiritualComponent>(CT.Spiritual);

  if (!spiritual) {
    throw new Error(`[GroupPrayBehavior] Agent ${ctx.entity.id} missing spiritual component`);
  }

  switch (phase) {
    case 'gathering':
      return handleGatheringPhaseWithContext(ctx);
    case 'praying':
      return handlePrayingPhaseWithContext(ctx, spiritual);
    case 'complete':
      return ctx.complete('group_prayer_complete');
  }
}

function handleGatheringPhaseWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  ctx.stopMovement();

  // Initialize gathering
  if (!ctx.getState('gatherStarted')) {
    const call = GATHERING_CALLS[Math.floor(Math.random() * GATHERING_CALLS.length)]!;

    ctx.setThought(call);

    // Emit call to prayer event
    ctx.emit({
      type: 'group_prayer:call',
      data: {
        leaderId: ctx.entity.id,
        location: { x: ctx.position.x, y: ctx.position.y },
        message: call,
        tick: ctx.tick,
      },
    });

    ctx.updateState({
      gatherStarted: ctx.tick,
      isLeader: true,
      participants: [ctx.entity.id],
    });
    return;
  }

  // Check for timeout
  const gatherStarted = ctx.getState<number>('gatherStarted')!;
  const elapsed = ctx.tick - gatherStarted;

  if (elapsed > GROUP_PRAYER_CONFIG.GATHER_TIMEOUT) {
    // Find nearby agents who might join
    const participants = gatherParticipantsWithContext(ctx);

    if (participants.length < GROUP_PRAYER_CONFIG.MIN_PARTICIPANTS) {
      // Not enough participants, pray alone instead
      return ctx.switchTo('pray', {});
    }

    // Transition to praying phase
    ctx.updateState({
      phase: 'praying',
      participants: participants.map(p => p.id),
      prayerStarted: ctx.tick,
    });

    // Notify participants
    for (const participant of participants) {
      if (participant.id !== ctx.entity.id) {
        ctx.emit({
          type: 'group_prayer:joined',
          data: {
            participantId: participant.id,
            leaderId: ctx.entity.id,
            tick: ctx.tick,
          },
        });
      }
    }

    return;
  }

  // Still waiting
  if (elapsed % 100 === 0) {
    ctx.setThought('Waiting for others to gather...');
  }
}

function handlePrayingPhaseWithContext(
  ctx: BehaviorContext,
  spiritual: SpiritualComponent
): ContextBehaviorResult | void {
  ctx.stopMovement();

  const participants = ctx.getState<string[]>('participants') || [];
  const prayerStarted = ctx.getState<number>('prayerStarted')!;
  const duration = GROUP_PRAYER_CONFIG.BASE_DURATION +
    (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_BONUS);

  const elapsed = ctx.tick - prayerStarted;

  // Periodic group prayer utterances (only leader speaks)
  if (ctx.getState('isLeader')) {
    const lastUtterance = ctx.getState<number>('lastUtterance') ?? 0;
    if (ctx.tick - lastUtterance > 100) {
      const prayer = selectMythAwarePrayer(ctx.entity as EntityImpl, ctx.world);
      ctx.setThought(prayer);
      ctx.updateState({ lastUtterance: ctx.tick });

      // Emit spoken prayer
      ctx.emit({
        type: 'agent:speak',
        data: {
          agentId: ctx.entity.id,
          text: prayer,
          category: 'prayer' as const,
          tick: ctx.tick,
        },
      });
    }
  }

  // Complete prayer
  if (elapsed >= duration) {
    return completeGroupPrayerWithContext(ctx, spiritual, participants);
  }

  // Continue praying
}

function completeGroupPrayerWithContext(
  ctx: BehaviorContext,
  spiritual: SpiritualComponent,
  participants: string[]
): BehaviorResult {
  // Calculate amplification
  const amplification = GROUP_PRAYER_CONFIG.BASE_AMPLIFICATION +
    (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_AMPLIFICATION);

  // Myth-aware amplification: canonical myth traits modulate prayer power
  let mythAmplification = 1.0;
  const deityId = spiritual.believedDeity;
  if (deityId) {
    const deityEntity = ctx.world.getEntity(deityId);
    if (deityEntity) {
      const mythComp = (deityEntity as EntityImpl).getComponent(ComponentType.Mythology) as MythologyComponent | undefined;
      if (mythComp) {
        const traits = getCanonicalTraits(mythComp);
        // More canonical myths = stronger prayer resonance
        if (traits.size > 0) {
          // Each canonical trait adds up to 10% prayer power
          let traitBonus = 0;
          for (const [, score] of traits) {
            traitBonus += Math.abs(score) * 0.1;
          }
          mythAmplification = Math.min(1.5, 1.0 + traitBonus);
        }
      }
    }
  }
  const finalAmplification = amplification * mythAmplification;

  // Create group prayer record
  const prayer: Prayer = {
    id: `group_prayer_${groupPrayerIdCounter++}`,
    type: 'praise' as PrayerType,
    urgency: 'routine',
    content: 'United prayer of the community.',
    timestamp: ctx.tick,
    answered: false,
  };

  // Record prayer for leader
  // Cast required: Entity interface doesn't expose mutation methods
  const updatedSpiritual = recordPrayer(spiritual, prayer, 20);
  (ctx.entity as EntityImpl).addComponent(updatedSpiritual);

  // Calculate vision chance
  const visionChance = GROUP_PRAYER_CONFIG.BASE_VISION_CHANCE +
    (participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_VISION_BONUS);

  const receivedGroupVision = Math.random() < visionChance;

  // Emit group prayer complete event
  ctx.emit({
    type: 'group_prayer:complete',
    data: {
      leaderId: ctx.entity.id,
      participants,
      tick: ctx.tick,
      duration: participants.length * GROUP_PRAYER_CONFIG.PER_PARTICIPANT_BONUS + GROUP_PRAYER_CONFIG.BASE_DURATION,
      deityId: spiritual.believedDeity,
      answered: false,
      prayerPower: finalAmplification,
    },
  });

  // If vision received, emit vision event
  if (receivedGroupVision && ctx.getState('isLeader')) {
    ctx.emit({
      type: 'group_vision:received',
      data: {
        participants,
        deityId: spiritual.believedDeity,
        clarity: Math.min(1.0, 0.6 + (participants.length * 0.05)),
        prayerPower: finalAmplification,
      },
    });

    ctx.setThought('A vision came to all of us!');
  } else {
    ctx.setThought('The prayer is complete. We are blessed.');
  }

  // Improve relationships between participants
  for (const participantId of participants) {
    for (const otherId of participants) {
      if (otherId === participantId) continue;

      // Emit relationship improvement event (from participant's perspective)
      ctx.emit({
        type: 'relationship:improved',
        data: {
          targetAgent: otherId,
          reason: 'shared_prayer',
          amount: 0.05,
        },
      });
    }
  }

  return ctx.complete('group_prayer_complete');
}

function selectMythAwarePrayer(entity: EntityImpl, world: World): string {
  const deityId = entity.getComponent(ComponentType.Spiritual)?.believedDeity;
  if (!deityId) {
    return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
  }

  const deityEntity = world.getEntity(deityId);
  if (!deityEntity) {
    return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
  }

  const mythComp = (deityEntity as EntityImpl).getComponent(ComponentType.Mythology) as MythologyComponent | undefined;
  if (!mythComp) {
    return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
  }

  const traits = getCanonicalTraits(mythComp);
  if (traits.size === 0) {
    return GROUP_PRAYERS[Math.floor(Math.random() * GROUP_PRAYERS.length)]!;
  }

  // Find dominant trait
  let dominantTrait = '';
  let maxScore = 0;
  for (const [trait, score] of traits) {
    if (Math.abs(score) > maxScore) {
      maxScore = Math.abs(score);
      dominantTrait = trait;
    }
  }

  // Select prayer pool based on dominant trait
  let prayerPool: string[];
  switch (dominantTrait) {
    case 'wrathfulness':
    case 'vengeance':
    case 'judgment':
      prayerPool = WRATHFUL_DEITY_PRAYERS;
      break;
    case 'benevolence':
    case 'compassion':
    case 'mercy':
      prayerPool = BENEVOLENT_DEITY_PRAYERS;
      break;
    case 'power':
    case 'dominion':
    case 'creation':
      prayerPool = POWERFUL_DEITY_PRAYERS;
      break;
    default:
      prayerPool = GROUP_PRAYERS;
      break;
  }

  return prayerPool[Math.floor(Math.random() * prayerPool.length)]!;
}

function gatherParticipantsWithContext(ctx: BehaviorContext): EntityImpl[] {
  const participants: EntityImpl[] = [ctx.entity];

  // Query nearby agents with spiritual components
  const nearbyAgents = ctx.getEntitiesInRadius(
    GROUP_PRAYER_CONFIG.GATHER_RADIUS,
    [CT.Agent, CT.Spiritual],
    { limit: GROUP_PRAYER_CONFIG.MAX_PARTICIPANTS }
  );

  for (const { entity: agent } of nearbyAgents) {
    if (agent.id === ctx.entity.id) continue;
    if (participants.length >= GROUP_PRAYER_CONFIG.MAX_PARTICIPANTS) break;

    const agentImpl = agent as EntityImpl;
    const spiritual = agentImpl.getComponent<SpiritualComponent>(CT.Spiritual);
    const agentComp = agentImpl.getComponent<AgentComponent>(CT.Agent);
    const genetic = agentImpl.getComponent<GeneticComponent>(CT.Genetic);

    if (!spiritual || !agentComp) continue;

    // Check if agent is busy with critical behavior
    const busyBehaviors = ['flee', 'seek_food', 'seek_sleep', 'forced_sleep'];
    if (busyBehaviors.includes(agentComp.behavior)) continue;

    // Check willingness based on faith
    if (spiritual.faith < 0.2) continue; // Low faith agents won't join
    if (spiritual.crisisOfFaith) continue; // Crisis agents won't join groups

    if (!shouldJoinGroupPrayer(getContextJoinSignals(agentImpl, ctx.entity.id, spiritual, genetic))) {
      continue;
    }

    // Add to participants
    participants.push(agentImpl);
  }

  return participants;
}
