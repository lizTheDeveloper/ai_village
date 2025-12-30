import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SpiritualComponent, PrayerType, PrayerUrgency, Prayer } from '../components/SpiritualComponent.js';
import { recordPrayer } from '../components/SpiritualComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

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
export class PrayerSystem implements System {
  public readonly id: SystemId = 'prayer';
  public readonly priority: number = 116; // After belief generation
  public readonly requiredComponents = [];

  private eventBus?: EventBus;
  private prayerIdCounter: number = 0;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(_world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Find all agents with spiritual components
    const believers = entities.filter(e =>
      e.components.has(CT.Spiritual) &&
      e.components.has(CT.Personality)
    );

    // Find all deities
    const deities = entities.filter(e => e.components.has(CT.Deity));

    for (const believer of believers) {
      this._checkForPrayer(believer, deities, currentTick);
    }
  }

  /**
   * Check if agent should pray and generate prayer if so
   */
  private _checkForPrayer(entity: Entity, deities: ReadonlyArray<Entity>, currentTick: number): void {
    const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
    const personality = entity.components.get(CT.Personality) as PersonalityComponent;

    if (!spiritual || !personality) return;

    // Skip if no deity
    if (!spiritual.believedDeity) return;

    // Skip if faith is too low (< 0.1)
    if (spiritual.faith < 0.1) return;

    // Check if it's time to pray based on prayer frequency
    const timeSinceLastPrayer = currentTick - (spiritual.lastPrayerTime ?? 0);
    const prayerInterval = this._calculatePrayerInterval(spiritual, personality);

    if (timeSinceLastPrayer < prayerInterval) return;

    // Generate and record prayer
    const prayer = this._generatePrayer(entity, spiritual, currentTick);
    const updatedSpiritual = recordPrayer(spiritual, prayer, 20);

    // Update component
    (entity as EntityImpl).addComponent(updatedSpiritual);

    // Add prayer to deity's queue
    const deity = deities.find(d => d.id === spiritual.believedDeity);
    if (deity) {
      const deityComp = deity.components.get(CT.Deity);
      if (deityComp) {
        (deityComp as any).addPrayer(entity.id, prayer.id, currentTick);
      }
    }

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'prayer:offered',
        source: 'prayer',
        data: {
          agentId: entity.id,
          deityId: spiritual.believedDeity,
          prayerType: prayer.type,
          urgency: prayer.urgency,
          prayerId: prayer.id,
        },
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
    entity: Entity,
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
