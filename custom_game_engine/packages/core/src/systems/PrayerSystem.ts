import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpiritualComponent, PrayerType, PrayerUrgency, Prayer } from '../components/SpiritualComponent.js';
import { recordPrayer } from '../components/SpiritualComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritComponent } from '../components/SpiritComponent.js';
import { resolvePrayer } from '../divinity/CosmologyInteraction.js';
import type { Spirit } from '../divinity/AnimistTypes.js';
import type { Deity } from '../divinity/DeityTypes.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * PrayerSystem - Generates prayers from agents to deities
 *
 * Agents pray based on:
 * - Their spirituality trait (higher = pray more often)
 * - Their current needs/situation
 * - Their prayer frequency setting
 * - Time since last prayer
 *
 * Prayers generate more belief than passive faith (spec: 0.1 vs 0.01 belief/hour)
 */
export class PrayerSystem extends BaseSystem {
  public readonly id: SystemId = 'prayer';
  public readonly priority: number = 116; // After belief generation
  public readonly requiredComponents = [] as const;
  // Only run when spiritual components exist (need agents who can pray)
  // This system handles both: prayers to existing deities AND proto_deity_belief events for deity emergence
  public readonly activationComponents = ['spiritual'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds at 20 TPS

  private prayerIdCounter: number = 0;

  protected onUpdate(ctx: SystemContext): void {
    // Find all agents with spiritual components
    const believers: EntityImpl[] = [];
    const deities: EntityImpl[] = [];

    for (const entity of ctx.activeEntities) {
      if (entity.components.has(CT.Spiritual) && entity.components.has(CT.Personality)) {
        believers.push(entity);
      }
      if (entity.components.has(CT.Deity)) {
        deities.push(entity);
      }
    }

    for (const believer of believers) {
      this._checkForPrayer(believer, deities, ctx.tick);
    }
  }

  /**
   * Check if agent should pray and generate prayer if so
   */
  private _checkForPrayer(entity: EntityImpl, deities: ReadonlyArray<EntityImpl>, currentTick: number): void {
    const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
    const personality = entity.components.get(CT.Personality) as PersonalityComponent;

    if (!spiritual || !personality) return;

    // Skip if faith is too low (< 0.1)
    if (spiritual.faith < 0.1 && !spiritual.believedDeity) return;

    // Check if it's time to pray based on prayer frequency
    const timeSinceLastPrayer = currentTick - (spiritual.lastPrayerTime ?? 0);
    const prayerInterval = this._calculatePrayerInterval(spiritual, personality);

    if (timeSinceLastPrayer < prayerInterval) return;

    // Generate and record prayer
    const prayer = this._generatePrayer(entity, spiritual, currentTick);
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);

    // Update component
    entity.addComponent(updatedSpiritual);

    // Handle prayer routing based on whether agent has a specific deity
    if (!spiritual.believedDeity || this._isPrayerToSpirit(prayer)) {
      // Use CosmologyInteraction to resolve ambiguous prayer
      // This handles prayers to spirits, proto-deities, or unknown divine entities
      this._resolveAmbiguousPrayer(entity, prayer, deities, currentTick);
      return;
    }

    // Add prayer to deity's queue
    const deity = deities.find(d => d.id === spiritual.believedDeity);
    if (deity) {
      const deityComp = deity.getComponent<DeityComponent>(CT.Deity);
      if (deityComp) {
        deityComp.addPrayer(entity.id, prayer.id, currentTick);
      }
    }

    // Emit event
    this.events.emit('prayer:offered', {
      agentId: entity.id,
      deityId: spiritual.believedDeity,
      prayerType: prayer.type,
      urgency: prayer.urgency,
      prayerId: prayer.id,
    });
  }

  /**
   * Check if a prayer is directed at a spirit rather than a deity.
   */
  private _isPrayerToSpirit(prayer: Prayer): boolean {
    const content = prayer.content.toLowerCase();
    // Keywords that indicate prayer to a spirit rather than a deity
    const spiritKeywords = ['spirit', 'kami', 'ancestor', 'essence', 'guardian of'];
    return spiritKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Handle prayers to spirits or unknown entities using CosmologyInteraction.
   * Called when prayer target is ambiguous (e.g., "the river spirit", "the forest god").
   */
  private _resolveAmbiguousPrayer(
    entity: EntityImpl,
    prayer: Prayer,
    nearbyEntities: ReadonlyArray<EntityImpl>,
    currentTick: number
  ): void {
    // Extract nearby spirits and deities for cosmology resolution
    // Note: Converting ECS components to interface types for CosmologyInteraction
    const nearbySpirits: Spirit[] = nearbyEntities
      .filter(e => e.components.has(CT.Spirit))
      .map(e => {
        const spiritComp = e.getComponent<SpiritComponent>(CT.Spirit);
        return {
          id: e.id,
          entityType: 'spirit' as const,
          magnitude: spiritComp?.magnitude ?? 'minor',
          totalRespect: spiritComp?.totalRespect ?? 0,
          ...spiritComp,
        } as unknown as Spirit;
      });

    const nearbyDeities: Deity[] = nearbyEntities
      .filter(e => e.components.has(CT.Deity))
      .map(e => {
        const deityComp = e.getComponent<DeityComponent>(CT.Deity);
        return {
          id: e.id,
          ...deityComp,
        } as unknown as Deity;
      });

    // Use cosmology to resolve where this prayer should go
    const resolution = resolvePrayer(
      entity.id,
      prayer.content,
      nearbySpirits,
      nearbyDeities
    );

    // Emit resolution event (using generic emit for events not in GameEventMap)
    this.events.emitGeneric('prayer:resolved', {
      agentId: entity.id,
      prayerId: prayer.id,
      resolutionType: resolution.type,
      targetId: resolution.targetId,
      beliefGenerated: resolution.beliefGenerated,
      respectGenerated: resolution.respectGenerated,
      couldCreateDeity: resolution.couldCreateDeity,
      timestamp: currentTick,
    });

    // Handle spirit prayer
    if (resolution.type === 'spirit' && resolution.targetId) {
      const spirit = nearbyEntities.find(e => e.id === resolution.targetId);
      if (spirit) {
        const spiritComp = spirit.getComponent<SpiritComponent>(CT.Spirit);
        if (spiritComp) {
          // Add respect to spirit
          spiritComp.totalRespect = (spiritComp.totalRespect ?? 0) + resolution.respectGenerated;
          spirit.addComponent(spiritComp);
        }
      }
    }

    // Handle unresolved prayer (potential deity emergence)
    if (resolution.type === 'unresolved' && resolution.couldCreateDeity) {
      this.events.emitGeneric('divinity:proto_deity_belief', {
        agentId: entity.id,
        prayerContent: prayer.content,
        beliefContributed: resolution.beliefGenerated,
        timestamp: currentTick,
      });
    }
  }

  /**
   * Calculate prayer interval based on spirituality and frequency setting
   */
  private _calculatePrayerInterval(
    spiritual: SpiritualComponent,
    personality: PersonalityComponent
  ): number {
    const baseInterval = spiritual.prayerFrequency;

    // Higher spirituality = pray more often (shorter interval)
    const spiritualityMultiplier = 2 - (personality.spirituality ?? 0.5);

    return Math.floor(baseInterval * spiritualityMultiplier);
  }

  /**
   * Generate a prayer based on agent's current situation
   */
  private _generatePrayer(
    entity: EntityImpl,
    spiritual: SpiritualComponent,
    currentTick: number
  ): Prayer {
    const needs = entity.components.get(CT.Needs) as NeedsComponent | undefined;
    const mood = entity.components.get(CT.Mood) as MoodComponent | undefined;

    // Determine prayer type and urgency based on situation
    const { type, urgency, content } = this._determinePrayerContent(needs, mood, spiritual);

    return {
      id: `prayer_${this.prayerIdCounter++}`,
      type,
      urgency,
      content,
      timestamp: currentTick,
      answered: false,
    };
  }

  /**
   * Determine what the agent prays for based on their needs
   */
  private _determinePrayerContent(
    needs: NeedsComponent | undefined,
    mood: MoodComponent | undefined,
    spiritual: SpiritualComponent
  ): { type: PrayerType; urgency: PrayerUrgency; content: string } {
    // Desperate prayers for critical needs
    if (needs) {
      if (needs.hunger < 0.2) {
        return {
          type: 'help',
          urgency: 'desperate',
          content: 'Please help me find food, I am starving...',
        };
      }
      if (needs.energy < 0.2) {
        return {
          type: 'help',
          urgency: 'desperate',
          content: 'I am exhausted and weak, please grant me rest...',
        };
      }
      if (needs.health < 0.3) {
        return {
          type: 'help',
          urgency: 'desperate',
          content: 'I am injured and in pain, please heal me...',
        };
      }
    }

    // Earnest prayers for moderate needs
    if (needs) {
      if (needs.hunger < 0.5) {
        return {
          type: 'help',
          urgency: 'earnest',
          content: 'Please guide me to food and sustenance...',
        };
      }
      if (needs.energy < 0.5) {
        return {
          type: 'help',
          urgency: 'earnest',
          content: 'Grant me strength to continue my work...',
        };
      }
    }

    // Prayers based on mood (currentMood is -100 to 100)
    if (mood) {
      if (mood.currentMood < -40) {
        return {
          type: 'question',
          urgency: 'earnest',
          content: 'Why do I feel such sorrow? What is my purpose?',
        };
      }
      if (mood.currentMood > 60) {
        return {
          type: 'gratitude',
          urgency: 'routine',
          content: 'Thank you for the blessings in my life...',
        };
      }
    }

    // Crisis of faith
    if (spiritual.crisisOfFaith) {
      return {
        type: 'question',
        urgency: 'desperate',
        content: 'Are you there? Why do you not answer me?',
      };
    }

    // Default routine prayers
    const routinePrayers: Array<{ type: PrayerType; content: string }> = [
      { type: 'guidance', content: 'Please guide my steps today...' },
      { type: 'praise', content: 'I honor you with my work and devotion...' },
      { type: 'gratitude', content: 'Thank you for watching over us...' },
    ];

    const chosen = routinePrayers[Math.floor(Math.random() * routinePrayers.length)]!;

    return {
      type: chosen.type,
      urgency: 'routine',
      content: chosen.content,
    };
  }
}
