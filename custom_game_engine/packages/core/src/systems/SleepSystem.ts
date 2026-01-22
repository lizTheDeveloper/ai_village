import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BuildingType as BT } from '../types/BuildingType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl, type Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { CircadianComponent, DreamContent } from '../components/CircadianComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { getAgent, getNeeds, getCircadian, getEpisodicMemory, getBuilding } from '../utils/componentHelpers.js';
import type { BuildingHarmonyComponent } from '../components/BuildingHarmonyComponent.js';
import { getHarmonyRestModifier } from '../components/BuildingHarmonyComponent.js';
import { setMutationRate, clearMutationRate } from '../components/MutationVectorComponent.js';

/**
 * Weird/surreal elements that can appear in dreams
 */
const WEIRD_DREAM_ELEMENTS = [
  'everything was made of water',
  'the sky was underground',
  'trees were walking and talking',
  'time was flowing backwards',
  'gravity kept reversing',
  'everyone had multiple faces',
  'the ground was transparent like glass',
  'colors were sounds and sounds were colors',
  'buildings were breathing',
  'the moon was following you',
  'your hands kept multiplying',
  'words were floating in the air like butterflies',
  'everything was upside down but felt normal',
  'you could see through walls',
  'the sun was cold and ice was hot',
  'shadows moved independently',
  'you were simultaneously in multiple places',
  'objects kept transforming into other things',
  'you could taste emotions',
  'the world was in black and white except for one color',
  'you were tiny like an ant',
  'you were giant and everything else was tiny',
  'you were swimming through the air',
  'everyone was speaking in reverse',
  'you had wings but couldn\'t fly',
];

/**
 * SleepSystem manages agent sleep behavior, energy recovery, and circadian rhythms
 *
 * Responsibilities:
 * - Update sleep drive based on time awake/asleep
 * - Recover energy during sleep
 * - Apply sleep quality modifiers
 * - Handle wake conditions
 */
export class SleepSystem extends BaseSystem {
  public readonly id = 'sleep' as const;
  public readonly priority = 12; // After Needs (priority 15), before Memory (100)
  public readonly requiredComponents = [CT.Circadian, CT.Needs] as const;
  // Only run when circadian components exist (O(1) activation check)
  public readonly activationComponents = ['circadian'] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  /**
   * Systems that must run before this one.
   * @see StateMutatorSystem - handles batched sleep drive and energy recovery
   */
  public readonly dependsOn = ['state_mutator'] as const;

  // Singleton entity caching
  private timeEntityId: string | null = null;

  protected onUpdate(ctx: SystemContext): void {
    // Get time component from world entity (cached singleton)
    if (!this.timeEntityId) {
      const timeEntities = ctx.world.query().with(CT.Time).executeEntities();
      if (timeEntities.length === 0) return;
      const firstEntity = timeEntities[0];
      if (!firstEntity) return;
      this.timeEntityId = firstEntity.id;
    }
    const timeEntity = ctx.world.getEntity(this.timeEntityId) as EntityImpl | undefined;
    if (!timeEntity) {
      this.timeEntityId = null; // Reset cache if entity disappeared
      return;
    }

    let timeOfDay = 12; // Default noon if no time component
    let hoursElapsed = 0;

    const timeComp = timeEntity.getComponent<TimeComponent>(CT.Time);
    if (timeComp) {
      timeOfDay = timeComp.timeOfDay;
      // Calculate effective day length based on speed multiplier
      // This ensures sleep drive accumulates correctly at different time speeds
      const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
      // Calculate hours elapsed based on deltaTime and effective day length
      hoursElapsed = (ctx.deltaTime / effectiveDayLength) * 24;
    }

    for (const entity of ctx.activeEntities) {
      const circadian = getCircadian(entity);
      const needs = getNeeds(entity);

      if (!circadian || !needs) continue;

      // Update mutation rates for sleep drive and energy recovery
      this.updateSleepMutations(entity, circadian, needs, timeOfDay);

      // Process sleep (discrete events: dreams, wake checks)
      if (circadian.isSleeping) {
        this.processSleep(entity, circadian, needs, hoursElapsed, ctx.world);
      }
    }
  }

  // ==========================================================================
  // Mutation Rate Management (Sleep Drive & Energy Recovery)
  // ==========================================================================

  /**
   * Update sleep drive and energy recovery mutation rates.
   * Uses the new setMutationRate API to register rates with StateMutatorSystem.
   */
  private updateSleepMutations(
    entity: Entity,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    timeOfDay: number
  ): void {
    // Set mutation rates based on sleep state
    if (circadian.isSleeping) {
      // Sleeping: deplete sleep drive
      // Rate: -17/hour = -17/3600 = -0.00472 per second
      const sleepDriveRatePerSecond = -17 / 3600;

      setMutationRate(entity, 'circadian.sleepDrive', sleepDriveRatePerSecond, {
        min: 0,
        max: 100,
        source: 'sleep_drive_depletion',
      });

      // Register energy recovery (only when sleeping)
      const sleepQuality = circadian.sleepQuality || 0.5;
      // Base recovery: 0.1 per game hour (10% energy per hour)
      // Convert to per-second: 0.1 / 3600 = 0.0000278 per second
      const energyRecoveryPerSecond = 0.1 * sleepQuality / 3600;

      setMutationRate(entity, 'needs.energy', energyRecoveryPerSecond, {
        min: 0,
        max: 1.0,
        source: 'sleep_energy_recovery',
      });
    } else {
      // Awake: accumulate sleep drive
      // Base rate: 5.5/hour
      let ratePerHour = 5.5;

      // Faster accumulation at night (biological circadian pressure)
      if (timeOfDay >= circadian.preferredSleepTime || timeOfDay < 5) {
        ratePerHour *= 1.2; // 6.6/hour
      }

      // Modified by energy level (low energy = higher sleep drive)
      if (needs.energy < 0.3) {
        ratePerHour *= 1.5; // 8.25/hour base, 9.9/hour at night
      } else if (needs.energy < 0.5) {
        ratePerHour *= 1.25; // 6.875/hour base, 8.25/hour at night
      }

      // Convert to per-second (3600 seconds = 1 game hour)
      const sleepDriveRatePerSecond = ratePerHour / 3600;

      setMutationRate(entity, 'circadian.sleepDrive', sleepDriveRatePerSecond, {
        min: 0,
        max: 100,
        source: 'sleep_drive_accumulation',
      });

      // Clear energy recovery mutation when awake
      clearMutationRate(entity, 'needs.energy');
    }
  }

  // ==========================================================================
  // Sleep Processing (Discrete Events)
  // ==========================================================================

  /**
   * Process sleep: handle discrete events like dreams and wake checks
   * (Energy recovery is now handled by StateMutatorSystem deltas)
   */
  private processSleep(
    entity: EntityImpl,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    hoursElapsed: number,
    world: World
  ): void {
    // Energy recovery is now handled by StateMutatorSystem deltas
    // This method only handles discrete events

    // Track accumulated sleep duration in game hours
    circadian.sleepDurationHours = circadian.sleepDurationHours + hoursElapsed;

    // Update circadian sleepQuality dynamically based on conditions
    const sleepQuality = circadian.sleepQuality || 0.5;
    const updatedQuality = this.calculateSleepQuality(entity, circadian, world);
    if (Math.abs(updatedQuality - sleepQuality) > 0.05) {
      // Only update if significant change (mutable property)
      circadian.sleepQuality = updatedQuality;
    }

    // Generate dream during REM sleep (after 2+ hours, once per sleep)
    if (!circadian.hasDreamedThisSleep && circadian.sleepDurationHours >= 2) {
      this.generateDream(entity, circadian, world);
    }

    // Check wake conditions
    if (this.shouldWake(entity, circadian, needs, world.tick)) {
      this.wakeAgent(entity, circadian, world);
    }
  }

  /**
   * Calculate sleep quality based on location, building harmony, and environment.
   * Harmonious buildings provide better rest quality.
   */
  private calculateSleepQuality(
    entity: EntityImpl,
    circadian: CircadianComponent,
    world: World
  ): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses
    if (circadian.sleepLocationId) {
      // Look up the sleep location entity by ID
      const sleepLocation = world.getEntity(circadian.sleepLocationId);
      if (sleepLocation) {
        // Check if sleeping in a bed or building
        const buildingComp = getBuilding(sleepLocation);
        if (buildingComp) {
          if (buildingComp.buildingType === BT.Bed) {
            quality += 0.4; // Bed: 0.9 total
          } else if (buildingComp.buildingType === BT.Bedroll) {
            quality += 0.2; // Bedroll: 0.7 total
          } else {
            quality += 0.1; // Other building: 0.6 total
          }

          // Building harmony affects rest quality
          // A harmonious space improves sleep, a discordant one disrupts it
          const sleepBuilding = sleepLocation as EntityImpl;
          const harmony = sleepBuilding.getComponent<BuildingHarmonyComponent>(CT.BuildingHarmony);
          if (harmony) {
            // getHarmonyRestModifier returns -0.75 to +0.75
            // Scale it down to -0.3 to +0.3 for sleep quality impact
            const harmonyBonus = getHarmonyRestModifier(harmony.harmonyScore) * 0.4;
            quality += harmonyBonus;
          }
        }
      }
    }

    // Environmental penalties
    const needs = getNeeds(entity);
    if (needs) {
      // Temperature penalties (if we had temperature on needs)
      // Note: Current NeedsComponent doesn't have temperature field
      // This would need to be integrated with TemperatureSystem
    }

    // Clamp to valid range (0.1 to 1.0)
    return Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * Check if agent should wake up
   * NOTE: Sleep duration is tracked in GAME HOURS by SleepSystem.processSleep via hoursElapsed accumulation,
   * not in real-time ticks. We use circadian.sleepDurationHours.
   */
  private shouldWake(
    _entity: EntityImpl,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    _currentTick: number
  ): boolean {
    if (!circadian.isSleeping || circadian.sleepStartTime === null) {
      return false;
    }

    // Get accumulated sleep duration from circadian component (in game hours)
    // This is updated by processSleep each frame
    const hoursAsleep = circadian.sleepDurationHours;

    // Minimum sleep duration: 4 game hours
    if (hoursAsleep < 4) {
      // Only wake for critical hunger (not energy - agent needs to recover!)
      // NeedsComponent uses 0-1 scale (0.1 = 10%)
      if (needs.hunger < 0.1) {
        return true; // Critical hunger overrides minimum sleep
      }
      return false;
    }

    // Wake conditions (prioritize full energy recovery):
    // NeedsComponent uses 0-1 scale (1.0 = 100%, 0.1 = 10%)
    // 1. Energy fully restored (100%) - primary wake condition
    const energyFull = needs.energy >= 1.0;

    // 2. Urgent hunger (< 10%) - emergency wake
    const urgentNeed = needs.hunger < 0.1;

    // 3. Maximum sleep duration reached (12 hours - prevent oversleeping)
    const maxSleepReached = hoursAsleep >= 12;

    // Note: Removed "wellRestedAndSatisfied" (70% energy + sleepDrive < 10) condition
    // User requested agents wake at 100% energy, not 70%
    return energyFull || urgentNeed || maxSleepReached;
  }

  /**
   * Wake agent from sleep
   */
  private wakeAgent(
    entity: EntityImpl,
    circadian: CircadianComponent,
    world: World
  ): void {
    // Update circadian component by mutating properties
    circadian.isSleeping = false;
    circadian.lastSleepLocationId = circadian.sleepLocationId;
    circadian.sleepLocationId = null;
    circadian.sleepStartTime = null;
    circadian.sleepDurationHours = 0; // Reset sleep duration counter

    // Update agent behavior (switch from sleeping to wandering)
    const agent = getAgent(entity);
    if (agent && (agent.behavior === 'seek_sleep' || agent.behavior === 'forced_sleep')) {
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }

    // Emit wake event
    this.events.emit('agent:woke', {
      agentId: entity.id,
    }, entity.id);
  }

  /**
   * Generate a dream based on memories and emotions
   */
  private generateDream(
    entity: EntityImpl,
    circadian: CircadianComponent,
    world: World
  ): void {
    const memComp = getEpisodicMemory(entity);
    const memoryElements: string[] = [];

    if (memComp && memComp.episodicMemories.length > 0) {
      // Get recent and emotional memories (last 10, sorted by recency and emotion)
      const memories = [...memComp.episodicMemories]
        .sort((a: EpisodicMemory, b: EpisodicMemory) => {
          const aScore = (world.tick - a.timestamp) / 1000 + a.emotionalIntensity * 500;
          const bScore = (world.tick - b.timestamp) / 1000 + b.emotionalIntensity * 500;
          return bScore - aScore; // Higher score = more recent or emotional
        })
        .slice(0, 10);

      // Extract 2-4 memory elements from summaries
      const numElements = Math.min(memories.length, 2 + Math.floor(Math.random() * 3));
      for (let i = 0; i < numElements; i++) {
        const memory = memories[i];
        if (memory && memory.summary) {
          memoryElements.push(memory.summary);
        }
      }
    }

    // Pick a random weird element
    const weirdElementIndex = Math.floor(Math.random() * WEIRD_DREAM_ELEMENTS.length);
    const weirdElement = WEIRD_DREAM_ELEMENTS[weirdElementIndex];
    if (!weirdElement) {
      throw new Error('Failed to select weird dream element');
    }

    // Construct dream narrative
    let dreamNarrative = 'You had a strange dream. ';

    if (memoryElements.length > 0) {
      dreamNarrative += memoryElements.join(', and then ');
      dreamNarrative += ', but ' + weirdElement + '.';
    } else {
      dreamNarrative += 'You were wandering around, but ' + weirdElement + '.';
    }

    // Generate simple interpretation
    const interpretations = [
      'I wonder what that dream meant...',
      'That was a weird dream. Maybe it means something?',
      'Strange dream. I should think about what it could mean.',
      'What an odd dream. I\'m not sure what to make of it.',
      'That dream felt significant somehow.',
      'I had the strangest dream last night.',
      'I keep thinking about that bizarre dream.',
    ];

    const interpretationIndex = Math.floor(Math.random() * interpretations.length);
    const interpretation = interpretations[interpretationIndex];
    if (!interpretation) {
      throw new Error('Failed to generate dream interpretation');
    }

    // Create dream content object
    const dreamContent: DreamContent = {
      memoryElements,
      weirdElement,
      dreamNarrative,
      interpretation,
    };

    // Update circadian with dream (mutable properties)
    circadian.lastDream = dreamContent;
    circadian.hasDreamedThisSleep = true;

    // Emit dream event
    this.events.emit('agent:dreamed', {
      agentId: entity.id,
      dreamContent: dreamNarrative,
      entityId: entity.id,
    }, entity.id);
  }

}
