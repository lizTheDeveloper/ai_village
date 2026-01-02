/**
 * Test the full conception → pregnancy → birth pipeline
 *
 * This test verifies:
 * 1. Courtship system works (agents become interested → court → consent)
 * 2. Conception happens (30% base probability)
 * 3. MidwiferySystem receives conception event
 * 4. Pregnancy component is created
 * 5. Pregnancy progresses over time
 * 6. Birth occurs after gestation period (5 minutes = 6000 ticks)
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { CourtshipSystem } from './packages/core/src/systems/CourtshipSystem.js';
import { MidwiferySystem } from './packages/core/src/reproduction/midwifery/MidwiferySystem.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';

console.log('=== BABY BIRTH TEST ===\n');

const gameLoop = new GameLoop();
const world = gameLoop.world as any;

// Register necessary systems
console.log('Registering systems...');
const courtshipSystem = new CourtshipSystem();
const midwiferySystem = new MidwiferySystem();
gameLoop.systemRegistry.register(courtshipSystem);
gameLoop.systemRegistry.register(midwiferySystem);

// Manually initialize MidwiferySystem (SystemRegistry may not call initialize automatically in test)
console.log('Initializing MidwiferySystem manually...');
midwiferySystem.initialize(world, world.eventBus);
console.log('✓ Systems registered and initialized\n');

// Create Romeo and Juliet
console.log('Creating test agents...');
const romeoId = createWanderingAgent(world, 50, 50);
const julietId = createWanderingAgent(world, 51, 50);
const romeo = world.getEntity(romeoId);
const juliet = world.getEntity(julietId);

// Add Species
(romeo as any).addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));
(juliet as any).addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));

// Force high romantic inclination and active seeking
const romeoSexuality = romeo.getComponent(CT.Sexuality) as any;
const julietSexuality = juliet.getComponent(CT.Sexuality) as any;
const romeoCourtship = romeo.getComponent(CT.Courtship) as any;
const julietCourtship = juliet.getComponent(CT.Courtship) as any;

romeoSexuality.activelySeeking = true;
julietSexuality.activelySeeking = true;
romeoCourtship.romanticInclination = 0.9;
julietCourtship.romanticInclination = 0.9;

console.log(`✓ Romeo created: ${romeoId.substring(0, 8)}`);
console.log(`✓ Juliet created: ${julietId.substring(0, 8)}\n`);

// Event tracking
let conceptionEvent: any = null;
let pregnancyStartEvent: any = null;
let birthEvent: any = null;

world.eventBus.subscribe('conception', (event: any) => {
  conceptionEvent = event;
  console.log(`\n💚 CONCEPTION at tick ${world.tick}!`);
  console.log(`   Pregnant: ${event.data.pregnantAgentId.substring(0, 8)}`);
  console.log(`   Other parent: ${event.data.otherParentId.substring(0, 8)}\n`);
});

world.eventBus.subscribe('midwifery:pregnancy_started', (event: any) => {
  pregnancyStartEvent = event;
  console.log(`🤰 PREGNANCY STARTED at tick ${world.tick}!`);
  console.log(`   Due date: tick ${event.data.expectedDueDate}`);
  console.log(`   Duration: ${event.data.expectedDueDate - world.tick} ticks (~${Math.round((event.data.expectedDueDate - world.tick) / 20 / 60)} minutes)\n`);
});

world.eventBus.subscribe('midwifery:birth_started', (event: any) => {
  console.log(`👶 BIRTH STARTED at tick ${world.tick}!`);
});

world.eventBus.subscribe('midwifery:birth_completed', (event: any) => {
  birthEvent = event;
  console.log(`\n🎉 BABY BORN at tick ${world.tick}!`);
  console.log(`   Mother: ${event.data.motherId?.substring(0, 8)}`);
  console.log(`   Father: ${event.data.fatherId?.substring(0, 8)}`);
  console.log(`   Children: ${event.data.childIds?.length || 0}`);
  if (event.data.childIds && event.data.childIds.length > 0) {
    console.log(`   Child ID: ${event.data.childIds[0].substring(0, 8)}\n`);
  }
});

// Run simulation
console.log('Starting simulation...');
console.log('Phase 1: Waiting for courtship → consent → conception...\n');

let phase = 1;
const maxTicks = 20000; // 10 minutes max (should only need 5 minutes for gestation)

for (let i = 0; i < maxTicks; i++) {
  gameLoop.tick();

  // Phase 1: Wait for conception
  if (phase === 1 && conceptionEvent) {
    phase = 2;
    console.log('Phase 2: Waiting for pregnancy to complete (~5 minutes)...\n');
  }

  // Phase 2: Wait for birth
  if (phase === 2 && birthEvent) {
    console.log('=== SUCCESS! ===');
    console.log(`Baby born after ${world.tick} ticks (${Math.round(world.tick / 20 / 60 * 10) / 10} minutes)\n`);

    // Verify baby exists
    if (birthEvent.data.childIds && birthEvent.data.childIds.length > 0) {
      const baby = world.getEntity(birthEvent.data.childIds[0]);
      if (baby) {
        console.log('Baby verification:');
        console.log(`  - Baby entity exists: ✓`);
        console.log(`  - Baby ID: ${baby.id.substring(0, 8)}`);

        const babyAge = baby.getComponent(CT.Age);
        const babyName = baby.getComponent(CT.Name);
        if (babyAge) console.log(`  - Age: ${babyAge.currentAge} ticks old`);
        if (babyName) console.log(`  - Name: ${babyName.name}`);
      }
    }

    break;
  }

  // Progress indicator every 1000 ticks
  if (i > 0 && i % 1000 === 0) {
    console.log(`  Tick ${world.tick}...`);

    // Check pregnancy progress
    if (conceptionEvent) {
      const pregnantId = conceptionEvent.data.pregnantAgentId;
      const pregnantAgent = world.getEntity(pregnantId);
      const pregnancy = (pregnantAgent as any)?.getComponent(CT.Pregnancy);
      if (pregnancy) {
        const progress = Math.round((world.tick - pregnancy.conceptionTick) / pregnancy.gestationLength * 100);
        console.log(`    Pregnancy: ${progress}% complete`);
      }
    }
  }
}

if (!birthEvent) {
  console.log('\n❌ TEST FAILED: No baby born within time limit\n');
  console.log('Debug info:');
  console.log(`  - Conception occurred: ${conceptionEvent ? '✓' : '✗'}`);
  console.log(`  - Pregnancy started: ${pregnancyStartEvent ? '✓' : '✗'}`);
  console.log(`  - Birth occurred: ${birthEvent ? '✓' : '✗'}`);

  if (conceptionEvent && !pregnancyStartEvent) {
    console.log('\n⚠️  Bug: Conception happened but pregnancy never started!');
    console.log('   This means MidwiferySystem is not receiving conception events.');
  }

  if (pregnancyStartEvent && !birthEvent) {
    console.log('\n⚠️  Bug: Pregnancy started but birth never occurred!');
    console.log('   Check MidwiferySystem.updatePregnancies() and birth logic.');
  }
}

console.log('\n=== END TEST ===');
