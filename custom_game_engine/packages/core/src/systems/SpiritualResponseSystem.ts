/**
 * SpiritualResponseSystem - Event-driven prayer triggers
 *
 * Listens to gameplay events and causes agents to pray in response to:
 * - Starvation/hunger (desperate prayers for food)
 * - Injury/illness (prayers for healing)
 * - Death nearby (mourning prayers)
 * - Good harvests (gratitude prayers)
 * - Childbirth (blessing prayers)
 * - Natural disasters (fearful prayers)
 *
 * Prayers are more authentic when triggered by actual events rather than
 * random intervals. This creates emergent spiritual behavior.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { SpiritualComponent, Prayer, PrayerType, PrayerUrgency } from '../components/SpiritualComponent.js';
import { recordPrayer } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';

export class SpiritualResponseSystem extends BaseSystem {
  public readonly id: SystemId = 'spiritual_response';
  public readonly priority: number = 117; // After PrayerSystem (116)
  public readonly requiredComponents = [] as const;

  private prayerIdCounter: number = 0;
  private recentPrayers = new Map<string, number>(); // agentId -> last prayer tick

  onInit(ctx: SystemContext): void {
    // Subscribe to all relevant gameplay events that should trigger prayers

    // === STARVATION/HUNGER EVENTS ===
    ctx.events.on('need:critical', (data) => {
      if (data.needType === 'hunger') {
        this.triggerStarvationPrayer(data.agentId, ctx.world, ctx.tick);
      } else if (data.needType === 'health') {
        this.triggerInjuryPrayer(data.agentId, ctx.world, ctx.tick);
      }
    });

    ctx.events.on('agent:starved', (data) => {
      this.triggerStarvationPrayer(data.agentId, ctx.world, ctx.tick);
    });

    // === INJURY/HEALTH EVENTS ===
    ctx.events.on('agent:health_critical', (data) => {
      this.triggerInjuryPrayer(data.agentId, ctx.world, ctx.tick);
    });

    // === DEATH EVENTS ===
    ctx.events.on('agent:died', (data) => {
      this.triggerDeathMourningPrayers(data.entityId, ctx.world, ctx.tick);
    });

    ctx.events.on('death:witnessed', (data) => {
      this.triggerMourningPrayer(data.witnessId, data.deceasedId, ctx.world, ctx.tick);
    });

    // === HARVEST EVENTS ===
    ctx.events.on('harvest:completed', (data) => {
      this.triggerGratitudePrayer(data.agentId, 'harvest', ctx.world, ctx.tick);
    });

    // === BIRTH EVENTS ===
    ctx.events.on('agent:birth', (data) => {
      // Parents pray for blessing
      if (data.parents) {
        for (const parentId of data.parents) {
          this.triggerBirthPrayer(parentId, data.agentId, data.name, ctx.world, ctx.tick);
        }
      }
    });

    // === DISASTER EVENTS ===
    ctx.events.on('disaster:occurred', (data) => {
      this.triggerDisasterPrayers(data.location, data.disasterType, ctx.world, ctx.tick);
    });

    // === EXTREME WEATHER EVENTS ===
    ctx.events.on('weather:changed', (data) => {
      // Only trigger for extreme weather
      if (data.intensity === 'heavy' || data.divine) {
        this.triggerWeatherPrayers(data.weatherType, ctx.world, ctx.tick);
      }
    });
  }

  protected onUpdate(_ctx: SystemContext): void {
    // This system is event-driven, no per-tick logic needed
  }

  /**
   * Trigger desperate prayer for food when starving
   */
  private triggerStarvationPrayer(agentId: string, world: SystemContext['world'], tick: number): void {
    const entity = world.getEntity(agentId) as EntityImpl | undefined;
    if (!entity || !this.shouldPray(entity, tick, 100)) return; // At most once per 5 seconds

    const prayer = this.createPrayer(
      'help',
      'desperate',
      'Please, I beg you, grant me food! I am starving and weak...',
      tick
    );

    this.recordAgentPrayer(entity, prayer, tick);
    this.emitPrayerEvent(entity, prayer, 'starvation', this.events);
  }

  /**
   * Trigger prayer for healing when critically injured
   */
  private triggerInjuryPrayer(agentId: string, world: SystemContext['world'], tick: number): void {
    const entity = world.getEntity(agentId) as EntityImpl | undefined;
    if (!entity || !this.shouldPray(entity, tick, 200)) return; // At most once per 10 seconds

    const prayer = this.createPrayer(
      'help',
      'desperate',
      'I am wounded and in great pain. Please heal my body and restore my strength...',
      tick
    );

    this.recordAgentPrayer(entity, prayer, tick);
    this.emitPrayerEvent(entity, prayer, 'injury', this.events);
  }

  /**
   * Trigger mourning prayers from nearby agents when someone dies
   */
  private triggerDeathMourningPrayers(deceasedId: string, world: SystemContext['world'], tick: number): void {
    const deceased = world.getEntity(deceasedId) as EntityImpl | undefined;
    if (!deceased) return;

    const deceasedPos = deceased.getComponent<PositionComponent>(CT.Position);
    if (!deceasedPos) return;

    // Find nearby spiritual agents
    const nearbyAgents = world.query()
      .with(CT.Spiritual)
      .with(CT.Position)
      .with(CT.Personality)
      .executeEntities() as EntityImpl[];

    for (const agent of nearbyAgents) {
      if (agent.id === deceasedId) continue;

      const pos = agent.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      // Only pray if within reasonable distance (50 tiles)
      const dx = pos.x - deceasedPos.x;
      const dy = pos.y - deceasedPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 50 * 50) continue;

      this.triggerMourningPrayer(agent.id, deceasedId, world, tick);
    }
  }

  /**
   * Trigger mourning prayer for specific deceased
   */
  private triggerMourningPrayer(agentId: string, deceasedId: string, world: SystemContext['world'], tick: number): void {
    const entity = world.getEntity(agentId) as EntityImpl | undefined;
    if (!entity || !this.shouldPray(entity, tick, 300)) return;

    const deceased = world.getEntity(deceasedId) as EntityImpl | undefined;
    const deceasedIdentity = deceased?.getComponent<IdentityComponent>(CT.Identity);
    const deceasedName = deceasedIdentity?.name ?? 'the departed';

    const prayer = this.createPrayer(
      'mourning',
      'earnest',
      `May ${deceasedName}'s soul find peace. Watch over them in the beyond...`,
      tick
    );

    this.recordAgentPrayer(entity, prayer, tick);
    this.emitPrayerEvent(entity, prayer, 'death', this.events);
  }

  /**
   * Trigger gratitude prayer after successful harvest
   */
  private triggerGratitudePrayer(agentId: string, reason: string, world: SystemContext['world'], tick: number): void {
    const entity = world.getEntity(agentId) as EntityImpl | undefined;
    if (!entity || !this.shouldPray(entity, tick, 400)) return; // At most once per 20 seconds

    const prayer = this.createPrayer(
      'gratitude',
      'routine',
      `Thank you for this bountiful ${reason}. Your blessings sustain us...`,
      tick
    );

    this.recordAgentPrayer(entity, prayer, tick);
    this.emitPrayerEvent(entity, prayer, 'harvest', this.events);
  }

  /**
   * Trigger blessing prayer for newborn
   */
  private triggerBirthPrayer(parentId: string, childId: string, childName: string, world: SystemContext['world'], tick: number): void {
    const entity = world.getEntity(parentId) as EntityImpl | undefined;
    if (!entity || !this.shouldPray(entity, tick, 500)) return;

    const prayer = this.createPrayer(
      'plea',
      'earnest',
      `Bless this child, ${childName}. Watch over them and guide their path in life...`,
      tick
    );

    this.recordAgentPrayer(entity, prayer, tick);
    this.emitPrayerEvent(entity, prayer, 'birth', this.events);
  }

  /**
   * Trigger fearful prayers during disasters
   */
  private triggerDisasterPrayers(location: { x: number; y: number }, disasterType: string, world: SystemContext['world'], tick: number): void {
    // Find nearby spiritual agents
    const nearbyAgents = world.query()
      .with(CT.Spiritual)
      .with(CT.Position)
      .with(CT.Personality)
      .executeEntities() as EntityImpl[];

    for (const agent of nearbyAgents) {
      const pos = agent.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      // Pray if within disaster radius (100 tiles)
      const dx = pos.x - location.x;
      const dy = pos.y - location.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 100 * 100) continue;

      if (!this.shouldPray(agent, tick, 200)) continue;

      const prayer = this.createPrayer(
        'help',
        'desperate',
        `Protect us from this ${disasterType}! We are at your mercy...`,
        tick
      );

      this.recordAgentPrayer(agent, prayer, tick);
      this.emitPrayerEvent(agent, prayer, 'disaster', this.events);
    }
  }

  /**
   * Trigger prayers during extreme weather
   */
  private triggerWeatherPrayers(weatherType: string, world: SystemContext['world'], tick: number): void {
    // Random sample of spiritual agents pray during extreme weather
    const spiritualAgents = world.query()
      .with(CT.Spiritual)
      .with(CT.Personality)
      .executeEntities() as EntityImpl[];

    // Only ~10% of spiritual agents pray for weather
    for (const agent of spiritualAgents) {
      if (Math.random() > 0.1) continue;
      if (!this.shouldPray(agent, tick, 600)) continue;

      const prayer = this.createPrayer(
        'plea',
        'earnest',
        `Calm this terrible ${weatherType}. Show us mercy...`,
        tick
      );

      this.recordAgentPrayer(agent, prayer, tick);
      this.emitPrayerEvent(agent, prayer, 'weather', this.events);
    }
  }

  /**
   * Check if agent should pray based on spirituality and cooldown
   */
  private shouldPray(entity: EntityImpl, currentTick: number, minInterval: number): boolean {
    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);

    if (!spiritual || !personality) return false;

    // Only spiritual agents pray (spirituality > 0.3)
    if ((personality.spirituality ?? 0.5) < 0.3) return false;

    // Check cooldown
    const lastPrayer = this.recentPrayers.get(entity.id) ?? 0;
    if (currentTick - lastPrayer < minInterval) return false;

    return true;
  }

  /**
   * Create a prayer object
   */
  private createPrayer(type: PrayerType, urgency: PrayerUrgency, content: string, tick: number): Prayer {
    return {
      id: `event_prayer_${this.prayerIdCounter++}`,
      type,
      urgency,
      content,
      timestamp: tick,
      answered: false,
    };
  }

  /**
   * Record prayer in agent's spiritual component
   */
  private recordAgentPrayer(entity: EntityImpl, prayer: Prayer, tick: number): void {
    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    const updated = recordPrayer(spiritual, prayer, 20);
    entity.addComponent(updated);

    // Update cooldown
    this.recentPrayers.set(entity.id, tick);
  }

  /**
   * Emit prayer event for PrayerAnsweringSystem and UI
   */
  private emitPrayerEvent(entity: EntityImpl, prayer: Prayer, trigger: string, events: SystemContext['events']): void {
    const spiritual = entity.getComponent<SpiritualComponent>(CT.Spiritual);

    events.emit('prayer:offered', {
      agentId: entity.id,
      deityId: spiritual?.believedDeity ?? '',
      prayerType: prayer.type,
      urgency: prayer.urgency,
      prayerId: prayer.id,
    });

    // Also emit agent speak event for prayer
    events.emit('agent:speak', {
      agentId: entity.id,
      text: prayer.content,
      category: 'prayer',
      tick: prayer.timestamp,
    });
  }
}
