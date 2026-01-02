/**
 * Minimal test to verify pregnancy → birth pipeline
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { CourtshipSystem } from './packages/core/src/systems/CourtshipSystem.js';
import { MidwiferySystem } from './packages/core/src/reproduction/midwifery/MidwiferySystem.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';
import { createPregnancyComponent } from './packages/core/src/reproduction/midwifery/PregnancyComponent.js';

console.log('=== MINIMAL PREGNANCY TEST ===\n');

const gameLoop = new GameLoop();
const world = gameLoop.world as any;

// Register MidwiferySystem
const midwiferySystem = new MidwiferySystem();
gameLoop.systemRegistry.register(midwiferySystem);
midwiferySystem.initialize(world, world.eventBus);
console.log('✓ MidwiferySystem registered\n');

// Create a pregnant agent
console.log('Creating pregnant agent...');
const motherId = createWanderingAgent(world, 50, 50);
const mother = world.getEntity(motherId) as any;
mother.addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));

// Manually add pregnancy component
console.log('Adding pregnancy component...');
const pregnancy = createPregnancyComponent('father-id', 0, 100); // 100 tick gestation for fast test
mother.addComponent(pregnancy);
console.log(`✓ Pregnancy added: gestationLength=${pregnancy.gestationLength}, expectedDueDate=${pregnancy.expectedDueDate}\n`);

// Event tracking
let laborStarted = false;
let birthCompleted = false;

world.eventBus.subscribe('midwifery:labor_started', (event: any) => {
  laborStarted = true;
  console.log(`\n🤰 LABOR STARTED at tick ${world.tick}!`);
  console.log(`   Mother: ${event.data.motherId.substring(0, 8)}`);
});

world.eventBus.subscribe('midwifery:birth', (event: any) => {
  birthCompleted = true;
  console.log(`\n👶 BIRTH COMPLETED at tick ${world.tick}!`);
  console.log(`   Children: ${event.data.childIds?.length || 0}`);
});

// Run simulation (need ~500 ticks: 100 for pregnancy + 400 for labor)
console.log('Running simulation for 600 ticks...\n');
for (let i = 0; i < 600; i++) {
  gameLoop.tick();

  // Check pregnancy progress every 20 ticks
  if (i % 20 === 0) {
    const preg = (mother as any).getComponent(CT.Pregnancy);
    if (preg) {
      console.log(`Tick ${world.tick}: progress=${(preg.gestationProgress * 100).toFixed(1)}%, readyForLabor=${preg.isReadyForLabor()}`);
    } else {
      console.log(`Tick ${world.tick}: Pregnancy component missing!`);
    }
  }

  if (birthCompleted) {
    console.log(`\n✅ SUCCESS! Birth completed at tick ${world.tick}`);
    break;
  }
}

if (!laborStarted) {
  console.log('\n❌ FAILURE: Labor never started');
} else if (!birthCompleted) {
  console.log('\n❌ FAILURE: Labor started but birth never completed');
}

console.log('\n=== END TEST ===');
