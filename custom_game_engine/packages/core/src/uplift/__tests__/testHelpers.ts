/**
 * Test Helpers for Uplift System Tests
 */

import { AnimalComponent } from '../../components/AnimalComponent.js';
import { SpeciesComponent } from '../../components/SpeciesComponent.js';
import { ProtoSapienceComponent } from '../../components/ProtoSapienceComponent.js';
import { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../World.js';

/**
 * Create a test animal with all required fields
 * Returns the created entity
 */
export function createTestAnimal(world: World, speciesId: string, overrides?: Partial<{
  intelligence: number;
  age: number;
  health: number;
  name: string;
}>): any {
  const entity = world.createEntity();

  const animalComp = new AnimalComponent({
    id: entity.id,
    speciesId,
    name: overrides?.name || `Test ${speciesId}`,
    position: { x: 0, y: 0 },
    age: overrides?.age || 100,
    lifeStage: 'adult' as const,
    health: overrides?.health || 100,
    size: 1.0,
    state: 'idle' as const,
    hunger: 50,
    thirst: 50,
    energy: 80,
    stress: 20,
    mood: 70,
    wild: true,
    bondLevel: 0,
    trustLevel: 50,
  });

  // Override intelligence if provided
  if (overrides?.intelligence !== undefined) {
    (animalComp as any).intelligence = overrides.intelligence;
  }

  (entity as EntityImpl).addComponent(animalComp);

  // Add species component
  const speciesName = speciesId.charAt(0).toUpperCase() + speciesId.slice(1);
  const speciesComp = new SpeciesComponent(speciesId, speciesName, 'mammal', {
    maturityAge: 2,
    sapient: false, // Will be set to true upon awakening
  });
  (entity as EntityImpl).addComponent(speciesComp);

  return entity;
}

/**
 * Create a proto-sapient test animal
 * Returns the created entity
 */
export function createProtoSapientAnimal(world: World, speciesId: string, intelligence: number): any {
  const entity = world.createEntity();

  const animalComp = new AnimalComponent({
    id: entity.id,
    speciesId,
    name: `Proto-Sapient ${speciesId}`,
    position: { x: 0, y: 0 },
    age: 100,
    lifeStage: 'adult' as const,
    health: 100,
    size: 1.0,
    state: 'idle' as const,
    hunger: 50,
    thirst: 50,
    energy: 80,
    stress: 20,
    mood: 70,
    wild: true,
    bondLevel: 0,
    trustLevel: 50,
  });

  (entity as EntityImpl).addComponent(animalComp);

  const speciesName = speciesId.charAt(0).toUpperCase() + speciesId.slice(1);
  const speciesComp = new SpeciesComponent(speciesId, speciesName, 'mammal', {
    maturityAge: 2,
    sapient: false, // Will be set to true upon awakening
  });
  (entity as EntityImpl).addComponent(speciesComp);

  const proto = new ProtoSapienceComponent({
    intelligence,
    usesTools: intelligence >= 0.45,
    createsTools: intelligence >= 0.55,
    hasProtocolanguage: intelligence >= 0.60,
    passedMirrorTest: intelligence >= 0.65,
    abstractThinking: intelligence >= 0.68,
  });
  (entity as EntityImpl).addComponent(proto);

  return entity;
}
