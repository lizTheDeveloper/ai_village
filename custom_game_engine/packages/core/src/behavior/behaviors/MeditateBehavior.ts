/**
 * MeditateBehavior - Agent meditates to receive divine visions
 *
 * Part of Phase 27: Divine Communication System
 *
 * Meditation allows agents to:
 * - Receive pending visions queued by the player or deities
 * - Spontaneously receive visions based on spiritual aptitude
 * - Restore energy while connecting with the divine
 * - Increase vision clarity at sacred sites
 *
 * Meditation follows prayer in the spiritual communication pattern:
 * 1. Agent prays (speaks to divine)
 * 2. Agent meditates (listens for response)
 * 3. Agent may receive vision
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SpiritualComponent, Vision } from '../../components/SpiritualComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import { receiveVision } from '../../components/SpiritualComponent.js';
import { SacredSiteSystem } from '../../systems/SacredSiteSystem.js';

/**
 * Meditation configuration
 */
const MEDITATION_CONFIG = {
  // Duration in game ticks (20 TPS)
  BASE_DURATION: 400, // ~20 seconds
  MIN_DURATION: 200, // ~10 seconds
  MAX_DURATION: 800, // ~40 seconds

  // Vision chances
  BASE_VISION_CHANCE: 0.1, // 10% base chance per meditation
  POST_PRAYER_BONUS: 0.2, // +20% if just prayed
  SACRED_SITE_BONUS: 0.15, // +15% at sacred sites (stacks with site bonus)

  // Energy restoration
  ENERGY_RESTORE_RATE: 0.001, // Per tick while meditating

  // Monologue interval
  MONOLOGUE_INTERVAL: 100, // Ticks between internal thoughts
};

/**
 * Meditation internal monologues
 */
const MEDITATION_THOUGHTS = [
  'Quieting my mind...',
  'Listening to the silence within...',
  'Seeking clarity in stillness...',
  'Opening myself to the divine...',
  'Breathing deeply, finding peace...',
  'The world fades away...',
  'I wait for guidance...',
  'In the stillness, I listen...',
];

const VISION_RECEIVED_THOUGHTS = [
  'A vision comes to me!',
  'I see... I understand now...',
  'The divine speaks!',
  'A message from beyond...',
  'Light fills my mind...',
];

const NO_VISION_THOUGHTS = [
  'The silence is peaceful.',
  'Perhaps the answer will come later.',
  'I feel refreshed, even without a vision.',
  'Patience is its own reward.',
  'I will try again another time.',
];

/**
 * MeditateBehavior - Receptive spiritual practice
 */
export class MeditateBehavior extends BaseBehavior {
  readonly name = 'meditate' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Get required components
    const spiritual = entity.getComponent<SpiritualComponent>(ComponentType.Spiritual);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);

    if (!spiritual || !agent) {
      // Can't meditate without spiritual component
      return { complete: true, nextBehavior: 'idle', reason: 'no_spiritual_component' };
    }

    // Initialize meditation state
    if (!state.meditationStarted) {
      this.startMeditation(entity, spiritual, currentTick, world);
      return;
    }

    const startTick = state.meditationStarted as number;
    const duration = state.meditationDuration as number || MEDITATION_CONFIG.BASE_DURATION;
    const elapsed = currentTick - startTick;

    // Update meditation progress
    const progress = Math.min(1.0, elapsed / duration);
    entity.updateComponent<SpiritualComponent>(ComponentType.Spiritual, (comp) => ({
      ...comp,
      meditating: true,
      meditationProgress: progress,
    }));

    // Restore energy while meditating
    if (needs) {
      entity.updateComponent<NeedsComponent>(ComponentType.Needs, (comp) => {
        return new NeedsComponent({
          ...comp,
          energy: Math.min(1.0, comp.energy + MEDITATION_CONFIG.ENERGY_RESTORE_RATE),
        });
      });
    }

    // Periodic internal monologue
    const lastMonologue = (state.lastMonologue as number) ?? 0;
    if (currentTick - lastMonologue > MEDITATION_CONFIG.MONOLOGUE_INTERVAL) {
      const thought = MEDITATION_THOUGHTS[Math.floor(Math.random() * MEDITATION_THOUGHTS.length)]!;
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: thought,
        behaviorState: {
          ...current.behaviorState,
          lastMonologue: currentTick,
        },
      }));

      // Emit internal monologue event (using untyped emit for custom event)
      const eventBus = world.eventBus as { emit: (event: unknown) => void };
      eventBus.emit({
        type: 'agent:internal_monologue',
        source: 'meditate_behavior',
        data: {
          agentId: entity.id,
          behaviorType: 'meditate',
          monologue: thought,
          timestamp: currentTick,
        },
      });
    }

    // Check for vision at end of meditation
    if (elapsed >= duration) {
      return this.completeMeditation(entity, spiritual, position, world, currentTick);
    }

    // Continue meditating
  }

  /**
   * Start meditation session
   */
  private startMeditation(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    currentTick: number,
    world: World
  ): void {
    // Calculate meditation duration based on spiritual aptitude
    const aptitudeBonus = spiritual.faith * 0.3; // Higher faith = shorter meditation needed
    const duration = Math.floor(
      MEDITATION_CONFIG.BASE_DURATION * (1 - aptitudeBonus)
    );

    this.updateState(entity, {
      meditationStarted: currentTick,
      meditationDuration: Math.max(MEDITATION_CONFIG.MIN_DURATION, duration),
      lastMonologue: 0,
    });

    // Mark as meditating
    entity.updateComponent<SpiritualComponent>(ComponentType.Spiritual, (comp) => ({
      ...comp,
      meditating: true,
      meditationProgress: 0,
    }));

    // Emit event (using untyped emit for custom event)
    const eventBus = world.eventBus as { emit: (event: unknown) => void };
    eventBus.emit({
      type: 'agent:meditation_started',
      source: 'meditate_behavior',
      data: {
        agentId: entity.id,
        position: undefined,
      },
    });
  }

  /**
   * Complete meditation and check for vision
   */
  private completeMeditation(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    position: PositionComponent | undefined,
    world: World,
    currentTick: number
  ): BehaviorResult {
    const state = this.getState(entity);

    // Calculate vision chance
    let visionChance = MEDITATION_CONFIG.BASE_VISION_CHANCE;

    // Bonus if recently prayed
    const timeSinceLastPrayer = currentTick - (spiritual.lastPrayerTime ?? 0);
    if (timeSinceLastPrayer < 600) { // ~30 seconds
      visionChance += MEDITATION_CONFIG.POST_PRAYER_BONUS;
    }

    // Bonus from sacred site
    if (position) {
      const sacredSiteSystem = this.getSacredSiteSystem(world);
      if (sacredSiteSystem) {
        const visionClarityBonus = sacredSiteSystem.getVisionClarity({ x: position.x, y: position.y });
        visionChance += visionClarityBonus;
        visionChance += MEDITATION_CONFIG.SACRED_SITE_BONUS * (visionClarityBonus > 0 ? 1 : 0);
      }
    }

    // Faith affects vision chance
    visionChance *= (0.5 + spiritual.faith * 0.5); // 50-100% based on faith

    const receivedVision = Math.random() < visionChance;

    // End meditation state
    entity.updateComponent<SpiritualComponent>(ComponentType.Spiritual, (comp) => ({
      ...comp,
      meditating: false,
      meditationProgress: undefined,
    }));

    if (receivedVision) {
      // Generate and deliver vision
      const vision = this.generateVision(entity, spiritual, position, world, currentTick);
      const updatedSpiritual = receiveVision(spiritual, vision, 10);
      (entity as any).addComponent(updatedSpiritual);

      // Thought about receiving vision
      const thought = VISION_RECEIVED_THOUGHTS[Math.floor(Math.random() * VISION_RECEIVED_THOUGHTS.length)]!;
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: thought,
      }));

      // Emit vision event (using untyped emit for custom event)
      const eventBus = world.eventBus as { emit: (event: unknown) => void };
      eventBus.emit({
        type: 'vision:received',
        source: 'meditate_behavior',
        data: {
          agentId: entity.id,
          deityId: undefined,
          visionType: 'meditation',
          content: vision.content,
          clarity: vision.clarity,
          position: position ? { x: position.x, y: position.y } : undefined,
        },
      });
    } else {
      // No vision - peaceful ending
      const thought = NO_VISION_THOUGHTS[Math.floor(Math.random() * NO_VISION_THOUGHTS.length)]!;
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: thought,
      }));
    }

    // Emit meditation complete event (using untyped emit for custom event)
    const completeEventBus = world.eventBus as { emit: (event: unknown) => void };
    completeEventBus.emit({
      type: 'agent:meditation_complete',
      source: 'meditate_behavior',
      data: {
        agentId: entity.id,
        visionReceived: receivedVision,
        duration: state.meditationDuration as number || MEDITATION_CONFIG.BASE_DURATION,
      },
    });

    return {
      complete: true,
      nextBehavior: 'wander',
      reason: receivedVision ? 'vision_received' : 'meditation_complete',
    };
  }

  /**
   * Generate a vision for the agent
   */
  private generateVision(
    _entity: EntityImpl,
    spiritual: SpiritualComponent,
    position: PositionComponent | undefined,
    _world: World,
    currentTick: number
  ): Vision {
    // Calculate clarity based on faith and sacred site
    let clarity = spiritual.faith * 0.5 + 0.3; // Base 30-80% clarity

    if (position) {
      const sacredSiteSystem = this.getSacredSiteSystem(_world);
      if (sacredSiteSystem) {
        clarity += sacredSiteSystem.getVisionClarity({ x: position.x, y: position.y });
      }
    }

    clarity = Math.min(1.0, clarity);

    // Generate vision content (simple template-based for now)
    // In future, this would use LLM generation
    const visionTemplates = [
      'A path unfolds before you, leading to great purpose.',
      'Those you care for are watched over.',
      'Change is coming. Embrace it.',
      'Your efforts do not go unnoticed.',
      'The village will grow strong under your guidance.',
      'Trust in those around you.',
      'A challenge approaches, but you are ready.',
      'Peace will come to those who seek it.',
    ];

    const content = visionTemplates[Math.floor(Math.random() * visionTemplates.length)]!;

    return {
      id: `vision_${currentTick}`,
      content,
      source: 'meditation',
      clarity,
      timestamp: currentTick,
      receivedAt: currentTick,
      interpreted: false,
      sharedWith: [],
    };
  }

  /**
   * Get the SacredSiteSystem from the world
   */
  private getSacredSiteSystem(world: World): SacredSiteSystem | null {
    // Systems are registered on the world, try to get the sacred site system
    // Note: This is a simplified approach - in practice, systems should be
    // accessible via a proper registry pattern
    const systems = (world as unknown as { systems?: Map<string, unknown> }).systems;
    if (systems instanceof Map) {
      return systems.get('sacred_site') as SacredSiteSystem | null;
    }
    return null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function meditateBehavior(entity: EntityImpl, world: World): void {
  const behavior = new MeditateBehavior();
  behavior.execute(entity, world);
}
