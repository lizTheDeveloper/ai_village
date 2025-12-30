import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';

export class NeedsSystem implements System {
  public readonly id: SystemId = 'needs';
  public readonly priority: number = 15; // Run after AI (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Needs];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Get game time from TimeComponent to calculate game minutes elapsed
    const timeEntities = world.query().with(CT.Time).executeEntities();
    let gameMinutesElapsed = 0;

    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0] as EntityImpl;
      const timeComp = timeEntity.getComponent<TimeComponent>(CT.Time);
      if (timeComp) {
        // Calculate effective day length based on speed multiplier
        const effectiveDayLength = timeComp.dayLength / timeComp.speedMultiplier;
        // Calculate game hours elapsed, then convert to minutes
        const hoursElapsed = (deltaTime / effectiveDayLength) * 24;
        gameMinutesElapsed = hoursElapsed * 60;
      }
    }

    // Fallback if no time system: assume 1 real second = 1 game minute (for tests)
    if (gameMinutesElapsed === 0) {
      gameMinutesElapsed = deltaTime / 60;
    }
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>(CT.Needs)!;

      if (!needs) {
        throw new Error(`Entity ${entity.id} missing required needs component`);
      }

      // Check if agent is sleeping (don't deplete energy while sleeping)
      const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
      const isSleeping = circadian?.isSleeping || false;

      // Decay hunger (paused during sleep to prevent waking agents)
      // Per CLAUDE.md: Don't let hunger wake agents during minimum sleep period
      // Agents need to recover energy more than they need to eat
      // Hunger decay rate is per GAME MINUTE (not real time!)
      // NeedsComponent uses 0-1 scale, so 0.0008/min = agents drop 0.5 (50%) in 625 game minutes (~10 hours)
      const hungerDecayPerGameMinute = 0.0008; // ~2-3 meals per 18-hour waking period
      const hungerDecay = isSleeping ? 0 : hungerDecayPerGameMinute * gameMinutesElapsed;

      // Energy decay based on activity level (per GAME minute, not real time)
      // NeedsComponent uses 0-1 scale (divide old values by 100)
      // Rates balanced for ~18-hour wake / ~6-hour sleep cycle per game day
      // At these rates, agents can work a full day before needing sleep:
      // - Idle/Walking: -0.0003 energy/minute (~55 hours from 1.0 to 0)
      // - Working (gathering, building): -0.0008 energy/minute (~21 hours from 1.0 to 0)
      // - Running: -0.0012 energy/minute (~14 hours from 1.0 to 0)
      // - Cold/Hot exposure: -0.0002 energy/minute additional

      let energyDecayPerGameMinute = 0.0003; // Base rate: idle/walking

      if (!isSleeping) {
        // Check agent's current behavior to determine activity level
        const agent = impl.getComponent<AgentComponent>(CT.Agent);
        const movement = impl.getComponent<MovementComponent>(CT.Movement);

        if (agent) {
          const behavior = agent.behavior;
          const isMoving = movement && (Math.abs(movement.velocityX) > 0.01 || Math.abs(movement.velocityY) > 0.01);

          // NeedsComponent uses 0-1 scale
          if (behavior === 'gather' || behavior === 'build') {
            energyDecayPerGameMinute = 0.0008; // Working
          } else if (isMoving && movement.speed > 3.0) {
            energyDecayPerGameMinute = 0.0012; // Running
          } else if (isMoving) {
            energyDecayPerGameMinute = 0.0003; // Walking
          } else {
            energyDecayPerGameMinute = 0.0003; // Idle
          }
        }

        // Add temperature penalties
        const temperature = impl.getComponent<TemperatureComponent>(CT.Temperature);
        if (temperature) {
          if (temperature.currentTemp < 10) {
            energyDecayPerGameMinute += 0.0002; // Cold exposure
          } else if (temperature.currentTemp > 30) {
            energyDecayPerGameMinute += 0.0002; // Hot exposure
          }
        }
      }

      const energyDecay = isSleeping ? 0 : energyDecayPerGameMinute * gameMinutesElapsed;

      const newHunger = Math.max(0, needs.hunger - hungerDecay);
      const newEnergy = Math.max(0, needs.energy - energyDecay);

      // Check for critical needs transitions (for memory formation)
      // NeedsComponent uses 0-1 scale (0.2 = 20%)
      const wasHungerCritical = needs.hunger < 0.2;
      const isHungerCritical = newHunger < 0.2;
      const wasEnergyCritical = needs.energy < 0.2;
      const isEnergyCritical = newEnergy < 0.2;

      // Update needs
      impl.updateComponent<NeedsComponent>(CT.Needs, (current) => {
        const updated = current.clone();
        updated.hunger = newHunger;
        updated.energy = newEnergy;
        return updated;
      });

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
          },
        });
      }

      // Check for death (starving for too long)
      if (newHunger === 0 && newEnergy === 0) {
        // Agent should die - emit event for now, actual death handled elsewhere
        world.eventBus.emit({
          type: 'agent:starved',
          source: entity.id,
          data: {
            agentId: entity.id,
            survivalRelevance: 1.0,
          },
        });
      }
    }
  }
}
