// Quick test script to verify animal rendering setup
// Run with: node test-animal-rendering.js

import { World } from './custom_game_engine/packages/core/dist/ecs/World.js';
import { WildAnimalSpawningSystem } from './custom_game_engine/packages/core/dist/systems/WildAnimalSpawningSystem.js';

const world = new World();
const spawner = new WildAnimalSpawningSystem();

// Spawn a chicken at position (5, 5)
const entity = spawner.spawnSpecificAnimal(world, 'chicken', { x: 5, y: 5 });

console.log('Entity ID:', entity.id);
console.log('Components:', Array.from(entity.components.keys()));

const animal = entity.components.get('animal');
const position = entity.components.get('position');
const renderable = entity.components.get('renderable');

console.log('\nAnimal Component:', animal);
console.log('\nPosition Component:', position);
console.log('\nRenderable Component:', renderable);

// Check what the renderer would see
if (renderable && position) {
  console.log('\n=== RENDERER VIEW ===');
  console.log('Would render sprite:', renderable.spriteId);
  console.log('At position:', position);
  console.log('Visible:', renderable.visible);
  console.log('Layer:', renderable.layer);
}
