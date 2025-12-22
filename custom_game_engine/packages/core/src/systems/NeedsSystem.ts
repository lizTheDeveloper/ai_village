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

      // Decay hunger (continues even while sleeping, but slower)
      // Hunger decay rate is per real second, keep as-is for now
      const hungerDecay = needs.hungerDecayRate * deltaTime * (isSleeping ? 0.3 : 1.0);

      // Energy decay based on activity level (per GAME minute, not real time)
      // Per work order:
      // - Idle/Walking: -0.5 energy/minute
      // - Working (gathering, building): -1.5 energy/minute
      // - Running: -2.0 energy/minute
      // - Cold exposure (<10°C): -0.3 energy/minute additional
      // - Hot exposure (>30°C): -0.3 energy/minute additional

      let energyDecayPerGameMinute = 0.5; // Base rate: idle/walking

      if (!isSleeping) {
        // Check agent's current behavior to determine activity level
        const agent = impl.getComponent('agent') as any;
        const movement = impl.getComponent('movement') as any;

        if (agent) {
          const behavior = agent.behavior;
          const isMoving = movement && (Math.abs(movement.velocityX) > 0.01 || Math.abs(movement.velocityY) > 0.01);

          if (behavior === 'gather' || behavior === 'build') {
            energyDecayPerGameMinute = 1.5; // Working
          } else if (isMoving && movement.speed > 3.0) {
            energyDecayPerGameMinute = 2.0; // Running
          } else if (isMoving) {
            energyDecayPerGameMinute = 0.5; // Walking (base rate)
          } else {
            energyDecayPerGameMinute = 0.5; // Idle (base rate)
          }
        }

        // Add temperature penalties
        const temperature = impl.getComponent('temperature') as any;
        if (temperature) {
          if (temperature.currentTemp < 10) {
            energyDecayPerGameMinute += 0.3; // Cold exposure
          } else if (temperature.currentTemp > 30) {
            energyDecayPerGameMinute += 0.3; // Hot exposure
          }
        }
      }

      const energyDecay = isSleeping ? 0 : energyDecayPerGameMinute * gameMinutesElapsed;

      const newHunger = Math.max(0, needs.hunger - hungerDecay);
      const newEnergy = Math.max(0, needs.energy - energyDecay);

      // Debug logging every 100 ticks for first 3 entities (to avoid spam but still see data)
      if ((entity.id < '4' || entity.id.startsWith('0')) && world.tick % 100 === 0) {
        console.log(`[NeedsSystem] Entity ${entity.id.substring(0, 8)}: energy ${needs.energy.toFixed(1)} → ${newEnergy.toFixed(1)} (decay: ${energyDecay.toFixed(3)}, gameMin: ${gameMinutesElapsed.toFixed(3)}, sleeping: ${isSleeping})`);
      }

      // Update needs
      impl.updateComponent<NeedsComponent>('needs', (current) => ({
        ...current,
        hunger: newHunger,
        energy: newEnergy,
      }));

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
