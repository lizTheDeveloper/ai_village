/**
 * Debug courtship flow - step by step
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { CourtshipSystem } from './packages/core/src/systems/CourtshipSystem.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';

console.log('=== COURTSHIP FLOW DEBUG ===\n');

const gameLoop = new GameLoop();
const world = gameLoop.world as any;

// Register only CourtshipSystem
gameLoop.systemRegistry.register(new CourtshipSystem());

// Create Romeo
const romeoId = createWanderingAgent(world, 50, 50);
const romeo = world.getEntity(romeoId);
console.log(`✓ Romeo created: ${romeoId.substring(0, 8)}`);

// Create Juliet
const julietId = createWanderingAgent(world, 51, 50);
const juliet = world.getEntity(julietId);
console.log(`✓ Juliet created: ${julietId.substring(0, 8)}\n`);

// Add Species
(romeo as any).addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));
(juliet as any).addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));

// Check components
console.log('Romeo components:');
const romeoSexuality = romeo.getComponent(CT.Sexuality) as any;
const romeoCourtship = romeo.getComponent(CT.Courtship) as any;
const romeoPos = romeo.getComponent(CT.Position) as any;
console.log(`  - Sexuality: ${romeoSexuality ? 'YES' : 'NO'} (activelySeeking: ${romeoSexuality?.activelySeeking})`);
console.log(`  - Courtship: ${romeoCourtship ? 'YES' : 'NO'} (state: ${romeoCourtship?.state})`);
console.log(`  - Position: ${romeoPos ? 'YES' : 'NO'} (${romeoPos?.x}, ${romeoPos?.y})`);

console.log('\nJuliet components:');
const julietSexuality = juliet.getComponent(CT.Sexuality) as any;
const julietCourtship = juliet.getComponent(CT.Courtship) as any;
const julietPos = juliet.getComponent(CT.Position) as any;
console.log(`  - Sexuality: ${julietSexuality ? 'YES' : 'NO'} (activelySeeking: ${julietSexuality?.activelySeeking})`);
console.log(`  - Courtship: ${julietCourtship ? 'YES' : 'NO'} (state: ${julietCourtship?.state})`);
console.log(`  - Position: ${julietPos ? 'YES' : 'NO'} (${julietPos?.x}, ${julietPos?.y})`);

// Force both to be actively seeking
romeoSexuality.activelySeeking = true;
julietSexuality.activelySeeking = true;
romeoCourtship.romanticInclination = 0.9;
julietCourtship.romanticInclination = 0.9;

console.log('\n✓ Set both to actively seeking with high romantic inclination\n');

// Run 10 ticks manually
console.log('Running 10 ticks...');
for (let i = 0; i < 10; i++) {
  gameLoop.tick();

  const romeoState = romeoCourtship.state;
  const julietState = julietCourtship.state;

  console.log(`  Tick ${world.tick}: Romeo=${romeoState}, Juliet=${julietState}`);

  if (romeoState !== 'idle' || julietState !== 'idle') {
    console.log(`\n🎉 STATE CHANGE DETECTED!`);
    break;
  }
}

console.log('\n=== END DEBUG ===');
