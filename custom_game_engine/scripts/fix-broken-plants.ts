#!/usr/bin/env tsx
/**
 * Script to validate and fix broken plant entities
 * Removes plants that are missing required data (position, species, etc.)
 */

import { World } from '../packages/core/src/ecs/World.js';
import { EntityImpl } from '../packages/core/src/ecs/Entity.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';
import type { PlantComponent } from '../packages/core/src/components/PlantComponent.js';
import { BugReporter } from '../packages/core/src/utils/BugReporter.js';

export function validateAndFixPlants(world: World): {
  total: number;
  valid: number;
  broken: number;
  removed: string[];
} {
  const plantEntities = world.query().with(CT.Plant).executeEntities();

  const results = {
    total: plantEntities.length,
    valid: 0,
    broken: 0,
    removed: [] as string[]
  };

  console.log(`\n[PlantValidator] Found ${results.total} plant entities`);
  console.log('[PlantValidator] Validating...\n');

  for (const entity of plantEntities) {
    const impl = entity as EntityImpl;
    const plant = impl.getComponent<PlantComponent>(CT.Plant);

    if (!plant) {
      console.log(`⚠️  Entity ${entity.id}: Missing PlantComponent (should not happen)`);
      results.broken++;
      continue;
    }

    // Validate position
    if (!plant.position) {
      console.log(`❌ Plant ${entity.id}: Missing position field - REMOVING`);
      BugReporter.reportCorruptedPlant({
        entityId: entity.id,
        reason: 'Missing position field',
        plantData: {
          speciesId: plant.speciesId,
          stage: plant.stage,
          health: plant.health
        }
      });
      world.removeEntity(entity.id);
      results.broken++;
      results.removed.push(entity.id);
      continue;
    }

    // Validate position coordinates
    if (isNaN(plant.position.x) || isNaN(plant.position.y)) {
      console.log(`❌ Plant ${entity.id}: Invalid position (${plant.position.x}, ${plant.position.y}) - REMOVING`);
      BugReporter.reportCorruptedPlant({
        entityId: entity.id,
        reason: `Invalid position coordinates (${plant.position.x}, ${plant.position.y})`,
        plantData: {
          speciesId: plant.speciesId,
          stage: plant.stage,
          position: plant.position
        }
      });
      world.removeEntity(entity.id);
      results.broken++;
      results.removed.push(entity.id);
      continue;
    }

    // Validate species
    if (!plant.speciesId) {
      console.log(`❌ Plant ${entity.id}: Missing speciesId - REMOVING`);
      BugReporter.reportCorruptedPlant({
        entityId: entity.id,
        reason: 'Missing speciesId',
        plantData: {
          stage: plant.stage,
          position: plant.position,
          health: plant.health
        }
      });
      world.removeEntity(entity.id);
      results.broken++;
      results.removed.push(entity.id);
      continue;
    }

    // Validate critical fields
    if (plant.health === undefined || plant.hydration === undefined || plant.nutrition === undefined) {
      console.log(`❌ Plant ${entity.id}: Missing health/hydration/nutrition - REMOVING`);
      BugReporter.reportCorruptedPlant({
        entityId: entity.id,
        reason: 'Missing critical fields (health, hydration, or nutrition)',
        plantData: {
          speciesId: plant.speciesId,
          stage: plant.stage,
          position: plant.position,
          health: plant.health,
          hydration: plant.hydration,
          nutrition: plant.nutrition
        }
      });
      world.removeEntity(entity.id);
      results.broken++;
      results.removed.push(entity.id);
      continue;
    }

    // Plant is valid
    results.valid++;
  }

  console.log(`\n[PlantValidator] Results:`);
  console.log(`  Total plants:   ${results.total}`);
  console.log(`  Valid plants:   ${results.valid} ✅`);
  console.log(`  Broken plants:  ${results.broken} ❌`);
  console.log(`  Removed:        ${results.removed.length}`);

  if (results.removed.length > 0) {
    console.log(`\n[PlantValidator] Removed plant IDs:`);
    results.removed.forEach(id => console.log(`  - ${id}`));
  }

  return results;
}

// Export for use in other scripts
export default validateAndFixPlants;
