/**
 * MagicComponentMigration - Utility to migrate from monolithic MagicComponent to split components
 *
 * Phase 2 of magic system refactoring: Split god object into focused components.
 *
 * Migration strategy:
 * 1. Read old MagicComponent
 * 2. Create 5 new focused components with data from old component
 * 3. Add new components to entity
 * 4. Remove old MagicComponent (or mark deprecated)
 *
 * This preserves all existing data while transitioning to the new architecture.
 */

import type { EntityImpl } from '@ai-village/core/ecs/Entity.js';
import { ComponentType as CT } from '@ai-village/core/types/ComponentType.js';
import type { MagicComponent } from '@ai-village/core/components/MagicComponent.js';
import type { ManaPoolsComponent } from '@ai-village/core/components/ManaPoolsComponent.js';
import type { SpellKnowledgeComponent } from '@ai-village/core/components/SpellKnowledgeComponent.js';
import type { CastingStateComponent } from '@ai-village/core/components/CastingStateComponent.js';
import type { SkillProgressComponent } from '@ai-village/core/components/SkillProgressComponent.js';
import type { ParadigmStateComponent } from '@ai-village/core/components/ParadigmStateComponent.js';

/**
 * Migrate an entity from monolithic MagicComponent to split components.
 *
 * This function is idempotent - it can be called multiple times safely.
 * If the new components already exist, it skips migration.
 *
 * @param entity The entity to migrate
 * @param removeOldComponent Whether to remove the old MagicComponent after migration (default: false)
 * @returns True if migration occurred, false if already migrated or no MagicComponent
 */
export function migrateToSplitComponents(entity: EntityImpl, removeOldComponent: boolean = false): boolean {
  // Check if already migrated (new components exist)
  const hasManaPoolsComponent = entity.hasComponent(CT.ManaPoolsComponent);
  const hasSpellKnowledgeComponent = entity.hasComponent(CT.SpellKnowledgeComponent);
  const hasCastingStateComponent = entity.hasComponent(CT.CastingStateComponent);
  const hasSkillProgressComponent = entity.hasComponent(CT.SkillProgressComponent);
  const hasParadigmStateComponent = entity.hasComponent(CT.ParadigmStateComponent);

  // If all new components exist, migration already complete
  if (
    hasManaPoolsComponent &&
    hasSpellKnowledgeComponent &&
    hasCastingStateComponent &&
    hasSkillProgressComponent &&
    hasParadigmStateComponent
  ) {
    return false;
  }

  // Get old MagicComponent
  const magic = entity.getComponent<MagicComponent>(CT.Magic);
  if (!magic) {
    return false; // No magic component to migrate
  }

  // Create ManaPoolsComponent
  if (!hasManaPoolsComponent) {
    const manaPoolsComponent: ManaPoolsComponent = {
      type: 'mana_pools',
      version: 1,
      manaPools: magic.manaPools,
      resourcePools: magic.resourcePools,
      primarySource: magic.primarySource,
    };
    entity.addComponent(manaPoolsComponent);
  }

  // Create SpellKnowledgeComponent
  if (!hasSpellKnowledgeComponent) {
    const spellKnowledgeComponent: SpellKnowledgeComponent = {
      type: 'spell_knowledge',
      version: 1,
      knownSpells: magic.knownSpells,
      knownParadigmIds: magic.knownParadigmIds,
      activeEffects: magic.activeEffects,
      techniqueProficiency: magic.techniqueProficiency,
      formProficiency: magic.formProficiency,
    };
    entity.addComponent(spellKnowledgeComponent);
  }

  // Create CastingStateComponent
  if (!hasCastingStateComponent) {
    const castingStateComponent: CastingStateComponent = {
      type: 'casting_state',
      version: 1,
      casting: magic.casting,
      currentSpellId: magic.currentSpellId,
      castProgress: magic.castProgress,
      castingState: magic.castingState,
    };
    entity.addComponent(castingStateComponent);
  }

  // Create SkillProgressComponent
  if (!hasSkillProgressComponent) {
    const skillProgressComponent: SkillProgressComponent = {
      type: 'skill_progress',
      version: 1,
      skillTreeState: magic.skillTreeState ?? {},
    };
    entity.addComponent(skillProgressComponent);
  }

  // Create ParadigmStateComponent
  if (!hasParadigmStateComponent) {
    const paradigmStateComponent: ParadigmStateComponent = {
      type: 'paradigm_state',
      version: 1,
      homeParadigmId: magic.homeParadigmId,
      activeParadigmId: magic.activeParadigmId,
      adaptations: magic.adaptations,
      paradigmState: magic.paradigmState,
      corruption: magic.corruption,
      attentionLevel: magic.attentionLevel,
      favorLevel: magic.favorLevel,
      addictionLevel: magic.addictionLevel,
    };
    entity.addComponent(paradigmStateComponent);
  }

  // Optionally remove old MagicComponent
  if (removeOldComponent) {
    entity.removeComponent(CT.Magic);
  }

  return true;
}

/**
 * Migrate all entities with MagicComponent in a world.
 *
 * @param world The world to migrate
 * @param removeOldComponents Whether to remove old MagicComponents after migration
 * @returns Number of entities migrated
 */
export function migrateAllMagicComponents(
  world: { query: () => any },
  removeOldComponents: boolean = false
): number {
  let migratedCount = 0;

  const entities = world.query()
    .with(CT.Magic)
    .executeEntities();

  for (const entity of entities) {
    const migrated = migrateToSplitComponents(entity as EntityImpl, removeOldComponents);
    if (migrated) {
      migratedCount++;
    }
  }

  return migratedCount;
}

/**
 * Check if an entity has been migrated to split components.
 *
 * @param entity The entity to check
 * @returns True if entity has all new split components
 */
export function isMigrated(entity: EntityImpl): boolean {
  return (
    entity.hasComponent(CT.ManaPoolsComponent) &&
    entity.hasComponent(CT.SpellKnowledgeComponent) &&
    entity.hasComponent(CT.CastingStateComponent) &&
    entity.hasComponent(CT.SkillProgressComponent) &&
    entity.hasComponent(CT.ParadigmStateComponent)
  );
}

/**
 * Check if an entity needs migration.
 *
 * @param entity The entity to check
 * @returns True if entity has MagicComponent but not all split components
 */
export function needsMigration(entity: EntityImpl): boolean {
  return entity.hasComponent(CT.Magic) && !isMigrated(entity);
}
