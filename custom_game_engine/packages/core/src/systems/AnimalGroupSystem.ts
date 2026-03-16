import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import {
  AnimalGroupComponent,
  addMemberToGroup,
  removeMemberFromGroup,
  defaultMaxSizeForGroupType,
  defaultCohesionForGroupType,
} from '../components/AnimalGroupComponent.js';
import type { AnimalGroupType } from '../components/AnimalGroupComponent.js';
import { AnimalComponent } from '../components/AnimalComponent.js';

/**
 * AnimalGroupSystem - manages pack/herd social structures
 * Priority: 66 (right after AnimalSystem at 65)
 *
 * Responsibilities:
 * - Validate group membership (remove dead/missing members)
 * - Elect alpha when current alpha leaves or dies
 * - Update territory centroid from member positions
 */
export class AnimalGroupSystem extends BaseSystem {
  public readonly id: SystemId = 'animal_group';
  public readonly priority: number = 66;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.AnimalGroup];
  protected readonly throttleInterval = 40; // Every 2 seconds — slow-changing social state

  protected onUpdate(ctx: SystemContext): void {
    // Build a set of all living animal entity IDs for fast membership checks
    const livingAnimalIds = new Set<string>();
    const animalEntityMap = new Map<string, AnimalComponent>();

    for (const entity of ctx.activeEntities) {
      const animal = entity.getComponent<AnimalComponent>('animal');
      if (animal) {
        livingAnimalIds.add(entity.id);
        animalEntityMap.set(entity.id, animal);
      }
    }

    // Also scan all animal entities (not just active ones) using a cached query
    const allAnimals = ctx.world.query().with(CT.Animal).executeEntities();
    for (const entity of allAnimals) {
      const animal = entity.getComponent<AnimalComponent>('animal');
      if (animal && !animalEntityMap.has(entity.id)) {
        livingAnimalIds.add(entity.id);
        animalEntityMap.set(entity.id, animal);
      }
    }

    for (const entity of ctx.activeEntities) {
      const group = entity.getComponent<AnimalGroupComponent>('animal_group');
      if (!group) continue;

      // Remove members that no longer exist
      for (const member of [...group.members]) {
        if (!livingAnimalIds.has(member.entityId)) {
          removeMemberFromGroup(group, member.entityId);
        }
      }

      // Elect new alpha if needed
      if (!group.alphaEntityId && group.members.length > 0) {
        const firstMember = group.members[0];
        if (firstMember) {
          group.alphaEntityId = firstMember.entityId;
        }
      }

      // Update territory centroid from member positions
      if (group.members.length > 0) {
        this.updateTerritoryCentroid(group, animalEntityMap);
      }
    }
  }

  private updateTerritoryCentroid(
    group: AnimalGroupComponent,
    animalEntityMap: Map<string, AnimalComponent>
  ): void {
    const positions: { x: number; y: number }[] = [];

    for (const member of group.members) {
      const animal = animalEntityMap.get(member.entityId);
      if (animal) {
        positions.push({ x: animal.position.x, y: animal.position.y });
      }
    }

    if (positions.length === 0) return;

    const cx = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const cy = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

    // Estimate territory radius as the max distance from centroid + buffer
    let maxDist = 0;
    for (const p of positions) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) maxDist = dist;
    }

    group.territory = {
      x: cx,
      y: cy,
      radius: Math.max(maxDist + 5, 10), // Minimum radius of 10
    };
  }

  /**
   * Create a new group component with the founder as alpha.
   * The caller must attach this component to a world entity.
   */
  public createGroup(
    groupType: AnimalGroupType,
    founderEntityId: string,
    tick: number
  ): AnimalGroupComponent {
    const group = new AnimalGroupComponent({
      groupType,
      members: [],
      alphaEntityId: founderEntityId,
      maxSize: defaultMaxSizeForGroupType(groupType),
      cohesion: defaultCohesionForGroupType(groupType),
    });
    addMemberToGroup(group, founderEntityId, tick);
    const founderMember = group.members[0];
    if (founderMember) {
      founderMember.rank = 0; // Founder is alpha with rank 0
    }
    return group;
  }

  /**
   * Add an animal to a group. Updates the animal's groupId to the group entity ID.
   * Returns false if group is full.
   */
  public joinGroup(
    group: AnimalGroupComponent,
    _groupEntityId: string,
    animal: AnimalComponent,
    tick: number
  ): boolean {
    return addMemberToGroup(group, animal.id, tick);
  }

  /**
   * Remove an animal from its group.
   */
  public leaveGroup(
    group: AnimalGroupComponent,
    animal: AnimalComponent
  ): void {
    removeMemberFromGroup(group, animal.id);
  }
}
