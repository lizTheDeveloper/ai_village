import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { TimeComponent } from './TimeSystem.js';

export class NeedsSystem implements System {
  public readonly id: SystemId = 'needs';
  public readonly priority: number = 15; // Run after AI (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['needs'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get game time from TimeComponent to calculate game minutes elapsed
    const timeEntities = world.query().with('time').executeEntities();
    let gameMinutesElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent<TimeComponent>('time');
      if (timeComp) {
        // Calculate game hours elapsed, then convert to minutes
        const hoursElapsed = (deltaTime / timeComp.dayLength) * 24;
        gameMinutesElapsed = hoursElapsed * 60;
      }
    }

    // Fallback if no time system: assume 1 real second = 1 game minute (for tests)
    if (gameMinutesElapsed === 0) {
      gameMinutesElapsed = deltaTime / 60;
    }
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>('needs')!;

      if (!needs) {
        console.warn(`[NeedsSystem] Entity ${entity.id} has no needs component!`);
        continue;
      }

      // Check if agent is sleeping (don't deplete energy while sleeping)
      const circadian = impl.getComponent('circadian') as any;
      const isSleeping = circadian?.isSleeping || false;

      // Decay hunger (continues even while sleeping, but MUCH slower)
      // Per CLAUDE.md: Don't let hunger wake agents during minimum sleep period
      // Agents need to recover energy more than they need to eat
      // Hunger decay rate is per real second
      const hungerDecay = needs.hungerDecayRate * deltaTime * (isSleeping ? 0.1 : 1.0);

      // Energy decay based on activity level (per GAME minute, not real time)
      // Rates balanced for 18-hour wake / 6-hour sleep cycle:
      // Assuming ~8 hours working, ~10 hours wandering/idle per day
      // - Idle/Walking: -0.05 energy/minute (~33 hours from 100 to 0)
      // - Working (gathering, building): -0.15 energy/minute (~11 hours from 100 to 0)
      // - Running: -0.2 energy/minute (~8 hours from 100 to 0)
      // - Cold/Hot exposure: -0.03 energy/minute additional
      // Average day: 8h*0.15 + 10h*0.05 = 72 + 30 = 102 energy used in 18h

      let energyDecayPerGameMinute = 0.05; // Base rate: idle/walking

      if (!isSleeping) {
        // Check agent's current behavior to determine activity level
        const agent = impl.getComponent('agent') as any;
        const movement = impl.getComponent('movement') as any;

        if (agent) {
          const behavior = agent.behavior;
          const isMoving = movement && (Math.abs(movement.velocityX) > 0.01 || Math.abs(movement.velocityY) > 0.01);

          if (behavior === 'gather' || behavior === 'build') {
            energyDecayPerGameMinute = 0.15; // Working
          } else if (isMoving && movement.speed > 3.0) {
            energyDecayPerGameMinute = 0.2; // Running
          } else if (isMoving) {
            energyDecayPerGameMinute = 0.05; // Walking
          } else {
            energyDecayPerGameMinute = 0.05; // Idle
          }
        }

        // Add temperature penalties
        const temperature = impl.getComponent('temperature') as any;
        if (temperature) {
          if (temperature.currentTemp < 10) {
            energyDecayPerGameMinute += 0.03; // Cold exposure
          } else if (temperature.currentTemp > 30) {
            energyDecayPerGameMinute += 0.03; // Hot exposure
          }
        }
      }

      const energyDecay = isSleeping ? 0 : energyDecayPerGameMinute * gameMinutesElapsed;

      const newHunger = Math.max(0, needs.hunger - hungerDecay);
      const newEnergy = Math.max(0, needs.energy - energyDecay);

      // Check for critical needs transitions (for memory formation)
      const wasHungerCritical = needs.hunger < 20;
      const isHungerCritical = newHunger < 20;
      const wasEnergyCritical = needs.energy < 20;
      const isEnergyCritical = newEnergy < 20;

      // Update needs
      impl.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        hunger: newHunger,
        energy: newEnergy,
      }));

      // Emit events for critical needs transitions (triggers memory formation)
      if (!wasHungerCritical && isHungerCritical) {
        world.eventBus.emit({
          type: 'need:critical',
          source: entity.id,
          data: {
            agentId: entity.id,
            needType: 'hunger',
            value: newHunger,
            survivalRelevance: 0.8,
            emotionalIntensity: 0.7,
            emotionalValence: -0.8,
            timestamp: Date.now(),
          },
        });
      }

      if (!wasEnergyCritical && isEnergyCritical) {
        world.eventBus.emit({
          type: 'need:critical',
          source: entity.id,
          data: {
            agentId: entity.id,
            needType: 'energy',
            value: newEnergy,
            survivalRelevance: 0.7,
            emotionalIntensity: 0.6,
            emotionalValence: -0.6,
            timestamp: Date.now(),
          },
        });
      }

      // Check for death (starving for too long)
      if (newHunger === 0 && newEnergy === 0) {
        // Agent should die - emit event for now, actual death handled elsewhere
        world.eventBus.emit({
          type: 'agent:starved',
          source: entity.id,
          data: { entityId: entity.id },
        });
      }
    }
  }
}
