import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { AnimalMigrationSystem } from '../AnimalMigrationSystem.js';
import { AnimalComponent } from '../../components/AnimalComponent.js';
import { createAnimalMigrationComponent } from '../../components/AnimalMigrationComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import type { AnimalMigrationComponent } from '../../components/AnimalMigrationComponent.js';

/**
 * AnimalMigrationSystem tests
 *
 * Tests:
 * 1. Migration triggered for migratory birds on fall season change
 * 2. Non-migratory species are not triggered
 * 3. Animal position moves toward migration destination
 * 4. Arriving animal has migration component removed and emits completion event
 */

describe('AnimalMigrationSystem', () => {
  let harness: IntegrationTestHarness;
  let system: AnimalMigrationSystem;

  beforeEach(async () => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });

    system = new AnimalMigrationSystem();
    await system.initialize(harness.world, harness.eventBus);
    harness.registerSystem('AnimalMigrationSystem', system);
  });

  function createAnimalEntity(
    speciesId: string,
    position: { x: number; y: number },
    wild = true,
  ): EntityImpl {
    const entity = new EntityImpl(createEntityId(), 0);
    entity.addComponent(
      new AnimalComponent({
        id: entity.id,
        speciesId,
        name: `Test ${speciesId}`,
        position,
        age: 30,
        lifeStage: 'adult',
        health: 100,
        size: 1.0,
        state: 'idle',
        hunger: 50,
        thirst: 50,
        energy: 80,
        stress: 20,
        mood: 70,
        wild,
        bondLevel: 0,
        trustLevel: 50,
      }),
    );
    harness.world.addEntity(entity);
    return entity;
  }

  it('should add AnimalMigrationComponent when a migratory bird is in forest during fall', async () => {
    // Create a wild robin in a "forest" biome
    const robinEntity = createAnimalEntity('robin', { x: 10, y: 10 });

    // Mock getTileAt to return forest biome for this animal's position
    (harness.world as any).getTileAt = (_x: number, _y: number) => ({ biome: 'forest' });

    // Trigger a fall season change event directly via the event bus
    harness.eventBus.emitImmediate({
      type: 'time:season_change',
      source: 'world',
      data: { newSeason: 'fall' },
    });

    // Run the system - it should now evaluate the pending season change
    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    // Check that the robin now has an AnimalMigrationComponent
    const migrationComp = robinEntity.getComponent<AnimalMigrationComponent>(CT.AnimalMigration);
    expect(migrationComp).toBeDefined();
    expect(migrationComp!.targetBiome).toBe('plains');
    expect(migrationComp!.season).toBe('fall');
  });

  it('should NOT add AnimalMigrationComponent to a non-migratory species', async () => {
    // Create a wild cow - not in the migratory species list
    const cowEntity = createAnimalEntity('cow', { x: 10, y: 10 });

    // Mock getTileAt to return forest biome
    (harness.world as any).getTileAt = (_x: number, _y: number) => ({ biome: 'forest' });

    // Trigger fall season change
    harness.eventBus.emitImmediate({
      type: 'time:season_change',
      source: 'world',
      data: { newSeason: 'fall' },
    });

    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    // Cow should NOT have migration component
    const migrationComp = cowEntity.getComponent(CT.AnimalMigration);
    expect(migrationComp).toBeUndefined();
  });

  it('should move animal position toward migration target on each update', async () => {
    // Create an animal with a migration component already applied
    const deerEntity = createAnimalEntity('deer', { x: 0, y: 0 });
    const targetX = 100;
    const targetY = 100;

    deerEntity.addComponent(
      createAnimalMigrationComponent('plains', targetX, targetY, 'winter', 1),
    );

    const initialAnimal = deerEntity.getComponent<AnimalComponent>(CT.Animal)!;
    const initialX = initialAnimal.position.x;
    const initialY = initialAnimal.position.y;

    // Run the system several times (throttle=100, so set tick to multiple of 100)
    harness.setTick(100);
    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    const updatedAnimal = deerEntity.getComponent<AnimalComponent>(CT.Animal)!;
    // Position should have moved closer to target
    const oldDistSq = (targetX - initialX) ** 2 + (targetY - initialY) ** 2;
    const newDistSq =
      (targetX - updatedAnimal.position.x) ** 2 +
      (targetY - updatedAnimal.position.y) ** 2;

    expect(newDistSq).toBeLessThan(oldDistSq);
  });

  it('should remove AnimalMigrationComponent and emit completion event when animal arrives', async () => {
    // Create an animal very close to its migration target (within ARRIVAL_DISTANCE_SQ = 100, i.e. 10 units)
    const targetX = 50;
    const targetY = 50;
    // Place animal 5 units away (distSq = 25 < 100)
    const swallowEntity = createAnimalEntity('swallow', { x: targetX + 5, y: targetY });

    swallowEntity.addComponent(
      createAnimalMigrationComponent('plains', targetX, targetY, 'fall', 1),
    );

    harness.clearEvents();

    harness.setTick(100);
    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    // Migration component should be removed
    const migrationComp = swallowEntity.getComponent(CT.AnimalMigration);
    expect(migrationComp).toBeUndefined();

    // Should have emitted migration_completed event
    const completedEvents = harness.getEmittedEvents('animal:migration_completed');
    expect(completedEvents.length).toBeGreaterThan(0);
    expect(completedEvents[0]!.data.biome).toBe('plains');
  });
});
