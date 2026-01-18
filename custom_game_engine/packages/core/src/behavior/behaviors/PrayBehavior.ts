/**
 * PrayBehavior - Agent prays to communicate with the divine
 *
 * Part of Phase 27: Divine Communication System
 *
 * Prayer is active communication from agent to divine:
 * - Triggered by worry, crisis, gratitude, routine
 * - May be followed by meditation
 * - Generates belief for deities
 * - More effective at sacred sites
 */

import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SpiritualComponent, Prayer, PrayerType, PrayerUrgency } from '../../components/SpiritualComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { MoodComponent } from '../../components/MoodComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import { recordPrayer } from '../../components/SpiritualComponent.js';
import { SacredSiteSystem } from '../../systems/SacredSiteSystem.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Prayer configuration
 */
const PRAYER_CONFIG = {
  // Duration in game ticks (20 TPS)
  BASE_DURATION: 200, // ~10 seconds
  DESPERATE_DURATION: 100, // Shorter when desperate
  RITUAL_DURATION: 400, // Longer for formal prayers

  // Post-prayer behavior
  MEDITATION_CHANCE: 0.4, // 40% chance to meditate after praying

  // Prayer content generation interval
  MONOLOGUE_INTERVAL: 60,
};

/**
 * Prayer content templates by type
 */
const PRAYER_TEMPLATES: Record<PrayerType, string[]> = {
  guidance: [
    'I seek your wisdom in these uncertain times.',
    'Guide my steps, for I know not which path to take.',
    'Show me the way forward.',
  ],
  help: [
    'Please help me in my time of need.',
    'I call upon you for aid.',
    'Lend me your strength.',
  ],
  gratitude: [
    'Thank you for the blessings in my life.',
    'I am grateful for your watchful presence.',
    'My heart is full of thanks.',
  ],
  question: [
    'Why has this happened? Help me understand.',
    'I seek answers to questions that trouble me.',
    'Grant me understanding.',
  ],
  confession: [
    'I have faltered. Forgive me.',
    'I acknowledge my mistakes and seek redemption.',
    'Help me do better.',
  ],
  plea: [
    'Please, I beg of you, hear my plea.',
    'If ever you would answer, let it be now.',
    'I desperately need your intervention.',
  ],
  praise: [
    'Glory to you, divine presence.',
    'I honor you with my devotion.',
    'You are worthy of all worship.',
  ],
  mourning: [
    'Help me bear this grief.',
    'Watch over those who have passed.',
    'Grant peace to the departed.',
  ],
};

let prayerIdCounter = 0;

/**
 * PrayBehavior - Active spiritual communication
 */
export class PrayBehavior extends BaseBehavior {
  readonly name = 'pray' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // Stop all movement
    this.disableSteeringAndStop(entity);

    const state = this.getState(entity);
    const currentTick = world.tick;

    // Get required components
    const spiritual = entity.getComponent<SpiritualComponent>(ComponentType.Spiritual);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);
    const mood = entity.getComponent<MoodComponent>(ComponentType.Mood);
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);

    if (!spiritual || !agent) {
      throw new Error(`[PrayBehavior] Agent ${entity.id} missing required components: spiritual=${!!spiritual}, agent=${!!agent}`);
    }

    // Initialize prayer state
    if (!state.prayerStarted) {
      this.startPrayer(entity, spiritual, needs, mood, currentTick, world);
      return;
    }

    const startTick = state.prayerStarted as number;
    const duration = state.prayerDuration as number || PRAYER_CONFIG.BASE_DURATION;
    const elapsed = currentTick - startTick;

    // Periodic prayer utterances
    const lastMonologue = (state.lastMonologue as number) ?? 0;
    if (currentTick - lastMonologue > PRAYER_CONFIG.MONOLOGUE_INTERVAL) {
      const prayer = state.prayer as Prayer;
      if (prayer) {
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          lastThought: prayer.content,
          behaviorState: {
            ...current.behaviorState,
            lastMonologue: currentTick,
          },
        }));
      }
    }

    // Complete prayer
    if (elapsed >= duration) {
      return this.completePrayer(entity, spiritual, position, state.prayer as Prayer, world, currentTick);
    }

    // Continue praying
  }

  /**
   * Start prayer session
   */
  private startPrayer(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    needs: NeedsComponent | undefined,
    mood: MoodComponent | undefined,
    currentTick: number,
    world: World
  ): void {
    // Determine prayer type and urgency
    const { type, urgency, content } = this.determinePrayerContent(spiritual, needs, mood);

    // Calculate duration based on urgency and style
    let duration = PRAYER_CONFIG.BASE_DURATION;
    if (urgency === 'desperate') {
      duration = PRAYER_CONFIG.DESPERATE_DURATION;
    } else if (spiritual.prayerStyle === 'formal') {
      duration = PRAYER_CONFIG.RITUAL_DURATION;
    }

    // Create prayer record
    const prayer: Prayer = {
      id: `prayer_${prayerIdCounter++}`,
      type,
      urgency,
      content,
      timestamp: currentTick,
      answered: false,
    };

    // Record prayer in spiritual component
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);
    entity.addComponent(updatedSpiritual);

    this.updateState(entity, {
      prayerStarted: currentTick,
      prayerDuration: duration,
      prayer,
      lastMonologue: 0,
    });

    // Update agent state
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      lastThought: `Praying: "${content}"`,
    }));

    // Emit prayer event (using untyped emit for custom event)
    const eventBus = world.eventBus as unknown as { emit: (event: unknown) => void };
    eventBus.emit({
      type: 'prayer:offered',
      source: 'pray_behavior',
      data: {
        agentId: entity.id,
        deityId: spiritual.believedDeity ?? 'unknown',
        prayerType: type,
        answered: false,
        duration: duration,
      },
    });
  }

  /**
   * Complete prayer and decide next action
   */
  private completePrayer(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    position: PositionComponent | undefined,
    prayer: Prayer,
    world: World,
    currentTick: number
  ): BehaviorResult {
    // Update preferred prayer spot if at a sacred site
    if (position) {
      const sacredSiteSystem = this.getSacredSiteSystem(world);
      if (sacredSiteSystem) {
        const site = sacredSiteSystem.isAtSacredSite({ x: position.x, y: position.y });
        if (site && !spiritual.preferredPrayerSpot) {
          entity.updateComponent<SpiritualComponent>(ComponentType.Spiritual, (comp) => ({
            ...comp,
            preferredPrayerSpot: site.id,
          }));
          sacredSiteSystem.registerVisit(site.id, entity.id);
        }
      }
    }

    // Emit completion event (using untyped emit for custom event)
    const eventBus = world.eventBus as unknown as { emit: (event: unknown) => void };
    eventBus.emit({
      type: 'prayer:complete',
      source: 'pray_behavior',
      data: {
        agentId: entity.id,
        deityId: spiritual.believedDeity ?? 'unknown',
        prayerType: prayer.type,
        answered: false,
        duration: currentTick - (this.getState(entity).prayerStarted as number),
      },
    });

    // Decide whether to meditate after
    if (Math.random() < PRAYER_CONFIG.MEDITATION_CHANCE) {
      return {
        complete: true,
        nextBehavior: 'meditate',
        reason: 'seeking_response',
      };
    }

    return {
      complete: true,
      reason: 'prayer_complete',
    };
  }

  /**
   * Determine what the agent prays for based on their state
   */
  private determinePrayerContent(
    spiritual: SpiritualComponent,
    needs: NeedsComponent | undefined,
    mood: MoodComponent | undefined
  ): { type: PrayerType; urgency: PrayerUrgency; content: string } {
    // Check for desperate needs first
    if (needs) {
      if (needs.hunger < 0.2 || needs.health < 0.2 || needs.energy < 0.2) {
        return this.generatePrayer('help', 'desperate');
      }
      if (needs.hunger < 0.4 || needs.health < 0.4) {
        return this.generatePrayer('help', 'earnest');
      }
    }

    // Crisis of faith
    if (spiritual.crisisOfFaith) {
      return this.generatePrayer('question', 'desperate');
    }

    // Mood-based prayers
    if (mood) {
      if (mood.currentMood < -40) {
        return this.generatePrayer('plea', 'earnest');
      }
      if (mood.currentMood > 60) {
        return this.generatePrayer('gratitude', 'routine');
      }
    }

    // Style-based default prayers
    switch (spiritual.prayerStyle) {
      case 'grateful':
        return this.generatePrayer('gratitude', 'routine');
      case 'questioning':
        return this.generatePrayer('question', 'routine');
      case 'desperate':
        return this.generatePrayer('plea', 'earnest');
      case 'formal':
        return this.generatePrayer('praise', 'routine');
      default:
        // Conversational style - random routine prayer
        const types: PrayerType[] = ['guidance', 'gratitude', 'praise'];
        const type = types[Math.floor(Math.random() * types.length)]!;
        return this.generatePrayer(type, 'routine');
    }
  }

  /**
   * Generate prayer content from templates
   */
  private generatePrayer(
    type: PrayerType,
    urgency: PrayerUrgency
  ): { type: PrayerType; urgency: PrayerUrgency; content: string } {
    const templates = PRAYER_TEMPLATES[type];
    const content = templates[Math.floor(Math.random() * templates.length)]!;
    return { type, urgency, content };
  }

  /**
   * Get the SacredSiteSystem from the world
   */
  private getSacredSiteSystem(world: World): SacredSiteSystem | null {
    const systems = (world as unknown as { systems?: Map<string, unknown> }).systems;
    if (systems instanceof Map) {
      return systems.get('sacred_site') as SacredSiteSystem | null;
    }
    return null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use prayBehaviorWithContext for new code
 */
export function prayBehavior(entity: EntityImpl, world: World): void {
  const behavior = new PrayBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Modern pray behavior using BehaviorContext.
 * @example registerBehaviorWithContext('pray', prayBehaviorWithContext);
 */
export function prayBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  // Stop all movement
  ctx.stopMovement();

  const spiritual = ctx.getComponent<SpiritualComponent>(CT.Spiritual);

  if (!spiritual) {
    throw new Error(`[PrayBehavior] Agent ${ctx.entity.id} missing spiritual component`);
  }

  // Initialize prayer state
  if (!ctx.getState('prayerStarted')) {
    const needs = ctx.needs;
    const mood = ctx.getComponent<MoodComponent>(CT.Mood);

    // Determine prayer type and urgency
    const { type, urgency, content } = determinePrayerContentWithContext(spiritual, needs, mood);

    // Calculate duration based on urgency and style
    let duration = PRAYER_CONFIG.BASE_DURATION;
    if (urgency === 'desperate') {
      duration = PRAYER_CONFIG.DESPERATE_DURATION;
    } else if (spiritual.prayerStyle === 'formal') {
      duration = PRAYER_CONFIG.RITUAL_DURATION;
    }

    // Create prayer record
    const prayer: Prayer = {
      id: `prayer_${prayerIdCounter++}`,
      type,
      urgency,
      content,
      timestamp: ctx.tick,
      answered: false,
    };

    // Record prayer in spiritual component
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);
    (ctx.entity as EntityImpl).addComponent(updatedSpiritual);

    ctx.updateState({
      prayerStarted: ctx.tick,
      prayerDuration: duration,
      prayer,
      lastMonologue: 0,
    });

    ctx.setThought(`Praying: "${content}"`);

    // Emit prayer event
    ctx.emit({
      type: 'prayer:offered',
      data: {
        agentId: ctx.entity.id,
        deityId: spiritual.believedDeity ?? 'unknown',
        prayerType: type,
        urgency: urgency,
        prayerId: prayer.id,
      },
    });

    return;
  }

  const startTick = ctx.getState<number>('prayerStarted')!;
  const duration = ctx.getState<number>('prayerDuration') || PRAYER_CONFIG.BASE_DURATION;
  const elapsed = ctx.tick - startTick;

  // Periodic prayer utterances
  const lastMonologue = ctx.getState<number>('lastMonologue') ?? 0;
  if (ctx.tick - lastMonologue > PRAYER_CONFIG.MONOLOGUE_INTERVAL) {
    const prayer = ctx.getState<Prayer>('prayer');
    if (prayer) {
      ctx.setThought(prayer.content);
      ctx.updateState({ lastMonologue: ctx.tick });
    }
  }

  // Complete prayer
  if (elapsed >= duration) {
    const prayer = ctx.getState<Prayer>('prayer')!;

    // Update preferred prayer spot if at a sacred site
    const sacredSiteSystem = getSacredSiteSystemFromContext(ctx);
    if (sacredSiteSystem) {
      const site = sacredSiteSystem.isAtSacredSite({ x: ctx.position.x, y: ctx.position.y });
      if (site && !spiritual.preferredPrayerSpot) {
        ctx.updateComponent<SpiritualComponent>(CT.Spiritual, (comp) => ({
          ...comp,
          preferredPrayerSpot: site.id,
        }));
        sacredSiteSystem.registerVisit(site.id, ctx.entity.id);
      }
    }

    // Emit completion event
    ctx.emit({
      type: 'prayer:complete',
      data: {
        agentId: ctx.entity.id,
        deityId: spiritual.believedDeity ?? 'unknown',
        prayerType: prayer.type,
        answered: false,
        duration: elapsed,
      },
    });

    // Decide whether to meditate after
    if (Math.random() < PRAYER_CONFIG.MEDITATION_CHANCE) {
      return ctx.switchTo('meditate', {});
    }

    return ctx.complete('prayer_complete');
  }

  // Continue praying
}

function determinePrayerContentWithContext(
  spiritual: SpiritualComponent,
  needs: NeedsComponent | null,
  mood: MoodComponent | undefined
): { type: PrayerType; urgency: PrayerUrgency; content: string } {
  // Check for desperate needs first
  if (needs) {
    if (needs.hunger < 0.2 || needs.health < 0.2 || needs.energy < 0.2) {
      return generatePrayerFromTemplate('help', 'desperate');
    }
    if (needs.hunger < 0.4 || needs.health < 0.4) {
      return generatePrayerFromTemplate('help', 'earnest');
    }
  }

  // Crisis of faith
  if (spiritual.crisisOfFaith) {
    return generatePrayerFromTemplate('question', 'desperate');
  }

  // Mood-based prayers
  if (mood) {
    if (mood.currentMood < -40) {
      return generatePrayerFromTemplate('plea', 'earnest');
    }
    if (mood.currentMood > 60) {
      return generatePrayerFromTemplate('gratitude', 'routine');
    }
  }

  // Style-based default prayers
  switch (spiritual.prayerStyle) {
    case 'grateful':
      return generatePrayerFromTemplate('gratitude', 'routine');
    case 'questioning':
      return generatePrayerFromTemplate('question', 'routine');
    case 'desperate':
      return generatePrayerFromTemplate('plea', 'earnest');
    case 'formal':
      return generatePrayerFromTemplate('praise', 'routine');
    default:
      // Conversational style - random routine prayer
      const types: PrayerType[] = ['guidance', 'gratitude', 'praise'];
      const type = types[Math.floor(Math.random() * types.length)]!;
      return generatePrayerFromTemplate(type, 'routine');
  }
}

function generatePrayerFromTemplate(
  type: PrayerType,
  urgency: PrayerUrgency
): { type: PrayerType; urgency: PrayerUrgency; content: string } {
  const templates = PRAYER_TEMPLATES[type];
  const content = templates[Math.floor(Math.random() * templates.length)]!;
  return { type, urgency, content };
}

function getSacredSiteSystemFromContext(ctx: BehaviorContext): SacredSiteSystem | null {
  // Access world through entity's internal reference
  const entityImpl = ctx.entity as EntityImpl;
  const world = (entityImpl as unknown as { world?: World }).world;
  if (!world) return null;

  const systems = (world as unknown as { systems?: Map<string, unknown> }).systems;
  if (systems instanceof Map) {
    const system = systems.get('sacred_site');
    return system instanceof SacredSiteSystem ? system : null;
  }
  return null;
}
