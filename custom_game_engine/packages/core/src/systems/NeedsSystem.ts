import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

export class NeedsSystem implements System {
  public readonly id: SystemId = 'needs';
  public readonly priority: number = 15; // Run after AI (10), before Movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['needs'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>('needs')!;

      // Decay hunger and energy
      const hungerDecay = needs.hungerDecayRate * deltaTime;
      const energyDecay = needs.energyDecayRate * deltaTime;

      const newHunger = Math.max(0, needs.hunger - hungerDecay);
      const newEnergy = Math.max(0, needs.energy - energyDecay);

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
