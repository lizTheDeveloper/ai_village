import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BuildingType as BT } from '../types/BuildingType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { CircadianComponent, DreamContent } from '../components/CircadianComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { getAgent, getNeeds, getCircadian, getEpisodicMemory, getBuilding } from '../utils/componentHelpers.js';

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
export class SleepSystem implements System {
  public readonly id: SystemId = 'sleep';
  public readonly priority: number = 12; // After Needs (priority 15), before Memory (100)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Circadian, CT.Needs];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get time component from world entity (should be only one)
    const timeEntities = world.query().with(CT.Time).executeEntities();
    let timeOfDay = 12; // Default noon if no time entity
    let hoursElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent<TimeComponent>(CT.Time);
      if (timeComp) {
        timeOfDay = timeComp.timeOfDay;
        // Calculate effective day length based on speed multiplier
        // This ensures sleep drive accumulates correctly at different time speeds
        const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
        // Calculate hours elapsed based on deltaTime and effective day length
        hoursElapsed = (deltaTime / effectiveDayLength) * 24;
      }
    }

    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const circadian = getCircadian(impl);
      const needs = getNeeds(impl);

      if (!circadian || !needs) continue;

      // Update sleep drive based on time and whether sleeping
      let newSleepDrive = circadian.sleepDrive;

      if (circadian.isSleeping) {
        // Decrease while sleeping - targeting 6 hours to deplete from 100 to 0
        // Rate: -17/hour (100 / 17 = ~5.9 hours)
        newSleepDrive = Math.max(0, circadian.sleepDrive - 17 * hoursElapsed);
      } else {
        // Increase while awake - targeting 18 hours to reach 95% threshold
        // Base rate: 5.5/hour (95 / 5.5 = ~17.3 hours)
        let increment = 5.5 * hoursElapsed;

        // Faster accumulation at night (biological circadian pressure)
        if (timeOfDay >= circadian.preferredSleepTime || timeOfDay < 5) {
          increment *= 1.2; // 20% faster at night (6.6/hour)
        }

        // Modified by energy level (low energy = higher sleep drive)
        // NeedsComponent uses 0-1 scale (0.3 = 30%, 0.5 = 50%)
        if (needs.energy < 0.3) {
          increment *= 1.5; // 50% faster when tired (8.25/hour base, 9.9/hour at night)
        } else if (needs.energy < 0.5) {
          increment *= 1.25; // 25% faster when moderately tired
        }

        newSleepDrive = Math.min(100, circadian.sleepDrive + increment);
      }

      // Apply sleep drive changes directly by mutating the component
      // CircadianComponent has public mutable properties
      circadian.sleepDrive = newSleepDrive;

      // Process sleep (energy recovery) if sleeping
      if (circadian.isSleeping) {
        this.processSleep(impl, circadian, needs, hoursElapsed, world);
      }
    }
  }

  /**
   * Process sleep: recover energy based on sleep quality
   */
  private processSleep(
    entity: EntityImpl,
    circadian: CircadianComponent,
    needs: NeedsComponent,
    hoursElapsed: number,
    world: World
  ): void {
    // Get sleep quality from circadian component (set by AISystem when sleep started)
    const sleepQuality = circadian.sleepQuality || 0.5;

    // Base energy recovery: +10% (0.1) per game hour on 0-1 scale
    const baseRecovery = 0.1 * hoursElapsed;

    // Apply quality modifier
    const recoveryAmount = baseRecovery * sleepQuality;

    // Recover energy (0-1 scale, 1.0 = full)
    const newEnergy = Math.min(1.0, needs.energy + recoveryAmount);

    // Update needs component
    entity.updateComponent<NeedsComponent>(CT.Needs, (current) => {
      const updated = current.clone();
      updated.energy = newEnergy;
      return updated;
    });

    // Track accumulated sleep duration in game hours
    circadian.sleepDurationHours = circadian.sleepDurationHours + hoursElapsed;

    // Update circadian sleepQuality dynamically based on conditions
    const updatedQuality = this.calculateSleepQuality(entity, circadian);
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
   * Calculate sleep quality based on location and environmental conditions
   */
  private calculateSleepQuality(
    entity: EntityImpl,
    circadian: CircadianComponent
  ): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses
    if (circadian.sleepLocation) {
      // Check if sleeping in a bed
      const buildingComp = getBuilding(circadian.sleepLocation);
      if (buildingComp) {
        if (buildingComp.buildingType === BT.Bed) {
          quality += 0.4; // Bed: 0.9 total
        } else if (buildingComp.buildingType === BT.Bedroll) {
          quality += 0.2; // Bedroll: 0.7 total
        } else {
          quality += 0.1; // Other building: 0.6 total
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

    // Wake conditions (prioritize energy recovery):
    // NeedsComponent uses 0-1 scale (1.0 = 100%, 0.7 = 70%, 0.1 = 10%)
    // 1. Energy fully restored (100%)
    const energyFull = needs.energy >= 1.0;

    // 2. Urgent hunger (< 10%)
    const urgentNeed = needs.hunger < 0.1;

    // 3. Energy sufficiently recovered (>= 70%) AND sleep drive depleted (< 10)
    // This prevents premature waking when sleep drive depletes before energy recovers
    const wellRestedAndSatisfied = needs.energy >= 0.7 && circadian.sleepDrive < 10;

    // 4. Maximum sleep duration reached (12 hours - prevent oversleeping)
    const maxSleepReached = hoursAsleep >= 12;

    return energyFull || urgentNeed || wellRestedAndSatisfied || maxSleepReached;
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
    circadian.lastSleepLocation = circadian.sleepLocation;
    circadian.sleepLocation = null;
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
    world.eventBus.emit({
      type: 'agent:woke',
      source: entity.id,
      data: {
        agentId: entity.id,
      },
    });
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
    world.eventBus.emit({
      type: 'agent:dreamed',
      source: entity.id,
      data: {
        agentId: entity.id,
        dreamContent: dreamNarrative,
        entityId: entity.id,
      },
    });
  }
}
