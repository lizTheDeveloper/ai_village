import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

const SHELTER_RANGE = 3; // Distance in tiles that buildings provide shelter
const SHELTER_RESTORE_RATE = 5.0; // Points per second when in shelter

export class BuildingSystem implements System {
  public readonly id: SystemId = 'building';
  public readonly priority: number = 16; // Run after Needs (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['building', 'position'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Restore shelter to agents near shelter-providing buildings
    const shelterBuildings = entities.filter((entity) => {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>('building')!;
      return building.isComplete && building.providesShelter;
    });

    // Find all agents with needs
    const agents = world.query().with('needs').with('position').executeEntities();

    for (const agent of agents) {
      const agentImpl = agent as EntityImpl;
      const agentPos = agentImpl.getComponent<PositionComponent>('position')!;
      const needs = agentImpl.getComponent<NeedsComponent>('needs')!;

      // Check if agent is near any shelter
      let inShelter = false;
      for (const building of shelterBuildings) {
        const buildingImpl = building as EntityImpl;
        const buildingPos = buildingImpl.getComponent<PositionComponent>('position')!;

        const distance = Math.sqrt(
          Math.pow(agentPos.x - buildingPos.x, 2) +
          Math.pow(agentPos.y - buildingPos.y, 2)
        );

        if (distance <= SHELTER_RANGE) {
          inShelter = true;
          break;
        }
      }

      // Restore shelter if agent is in shelter
      if (inShelter) {
        const shelterRestore = SHELTER_RESTORE_RATE * deltaTime;
        const newShelter = Math.min(100, needs.shelter + shelterRestore);

        agentImpl.updateComponent<NeedsComponent>('needs', (current) => ({
          ...current,
          shelter: newShelter,
        }));
      }
    }
  }
}
