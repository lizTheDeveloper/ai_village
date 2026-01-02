/**
 * Romance Pair Test
 *
 * Spawns two highly compatible agents and watches them court each other.
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { CourtshipSystem } from './packages/core/src/systems/CourtshipSystem.js';
import { MovementSystem } from './packages/core/src/systems/MovementSystem.js';
import { SteeringSystem } from './packages/core/src/systems/SteeringSystem.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';

console.log('='.repeat(60));
console.log('ROMANCE PAIR TEST - Two Perfect Matches');
console.log('='.repeat(60));

// Create game loop
const gameLoop = new GameLoop();
const world = gameLoop.world as any;

// Register systems
console.log('\n[1] Registering systems...');
gameLoop.systemRegistry.register(new MovementSystem());
gameLoop.systemRegistry.register(new SteeringSystem());
gameLoop.systemRegistry.register(new CourtshipSystem());
console.log('✓ Systems registered');

// Create Romeo
console.log('\n[2] Creating Romeo...');
const romeoId = createWanderingAgent(world, 50, 50);
const romeo = world.getEntity(romeoId);
console.log(`  ✓ Romeo: ${romeoId}`);

// Create Juliet (very close to Romeo)
console.log('\n[3] Creating Juliet...');
const julietId = createWanderingAgent(world, 51, 50);
const juliet = world.getEntity(julietId);
console.log(`  ✓ Juliet: ${julietId}`);

// Add Species components (required for compatibility)
console.log('\n[4] Adding Species components...');
const romeoSpecies = new SpeciesComponent('human', 'Human', 'humanoid_biped');
const julietSpecies = new SpeciesComponent('human', 'Human', 'humanoid_biped');
(romeo as any).addComponent(romeoSpecies);
(juliet as any).addComponent(julietSpecies);
console.log('  ✓ Both are Human species (compatible)');

// Maximize compatibility
console.log('\n[5] Maximizing romantic compatibility...');

// Set both to actively seeking
const romeoSexuality = romeo.getComponent(CT.Sexuality) as any;
const julietSexuality = juliet.getComponent(CT.Sexuality) as any;

if (romeoSexuality) {
  romeoSexuality.activelySeeking = true;
  console.log('  ✓ Romeo is actively seeking');
}

if (julietSexuality) {
  julietSexuality.activelySeeking = true;
  console.log('  ✓ Juliet is actively seeking');
}

// Maximize romantic inclination
const romeoCourtship = romeo.getComponent(CT.Courtship) as any;
const julietCourtship = juliet.getComponent(CT.Courtship) as any;

if (romeoCourtship) {
  romeoCourtship.romanticInclination = 0.9;  // Very romantic
  console.log(`  ✓ Romeo romantic inclination: ${romeoCourtship.romanticInclination}`);
}

if (julietCourtship) {
  julietCourtship.romanticInclination = 0.9;  // Very romantic
  console.log(`  ✓ Juliet romantic inclination: ${julietCourtship.romanticInclination}`);
}

// Make their personalities compatible
const romeoPersonality = romeo.getComponent(CT.Personality) as any;
const julietPersonality = juliet.getComponent(CT.Personality) as any;

if (romeoPersonality && julietPersonality) {
  // Set complementary personalities
  romeoPersonality.openness = 0.8;
  romeoPersonality.conscientiousness = 0.7;
  romeoPersonality.extroversion = 0.9;
  romeoPersonality.agreeableness = 0.8;
  romeoPersonality.neuroticism = 0.3;
  romeoPersonality.creativity = 0.7;
  romeoPersonality.spirituality = 0.6;

  julietPersonality.openness = 0.8;
  julietPersonality.conscientiousness = 0.7;
  julietPersonality.extroversion = 0.8;
  julietPersonality.agreeableness = 0.9;
  julietPersonality.neuroticism = 0.3;
  julietPersonality.creativity = 0.7;
  julietPersonality.spirituality = 0.6;

  console.log('  ✓ Personalities aligned (high compatibility)');
}

// Set up relationship components for initial positive disposition
const romeoRelationship = romeo.getComponent(CT.Relationship) as any;
const julietRelationship = juliet.getComponent(CT.Relationship) as any;

if (romeoRelationship && julietRelationship) {
  // Pre-seed positive relationship
  romeoRelationship.relationships.set(julietId, {
    targetId: julietId,
    familiarity: 70,
    affinity: 50,
    trust: 70,
    lastInteraction: 0,
    interactionCount: 5,
    sharedMemories: 3,
    sharedMeals: 2,
    perceivedSkills: [],
  });

  julietRelationship.relationships.set(romeoId, {
    targetId: romeoId,
    familiarity: 70,
    affinity: 50,
    trust: 70,
    lastInteraction: 0,
    interactionCount: 5,
    sharedMemories: 3,
    sharedMeals: 2,
    perceivedSkills: [],
  });

  console.log('  ✓ Initial positive relationship established');
}

// Summary
console.log('\n[6] Agent Summary:');
console.log('  Romeo:');
console.log(`    - Position: (50, 50)`);
console.log(`    - Actively seeking: ${romeoSexuality?.activelySeeking}`);
console.log(`    - Romantic inclination: ${romeoCourtship?.romanticInclination}`);
console.log(`    - Courtship state: ${romeoCourtship?.state}`);
console.log('  Juliet:');
console.log(`    - Position: (51, 50) [1 tile away]`);
console.log(`    - Actively seeking: ${julietSexuality?.activelySeeking}`);
console.log(`    - Romantic inclination: ${julietCourtship?.romanticInclination}`);
console.log(`    - Courtship state: ${julietCourtship?.state}`);

// Event listeners
let courtshipEvents = 0;
let conceptionEvents = 0;
let interestEvents = 0;
let courtingEvents = 0;

world.eventBus.on('courtship:interested', (event: any) => {
  interestEvents++;
  const initiator = event.source;
  const target = event.data?.targetId;
  console.log(`\n  💘 ${initiator.substring(0, 8)} became INTERESTED in ${target?.substring(0, 8)}!`);
});

world.eventBus.on('courtship:initiated', (event: any) => {
  courtingEvents++;
  const initiator = event.source;
  const target = event.data?.targetId;
  console.log(`\n  💕 ${initiator.substring(0, 8)} started COURTING ${target?.substring(0, 8)}!`);
});

world.eventBus.on('courtship:consent', (event: any) => {
  courtshipEvents++;
  const agent1 = event.source;
  const agent2 = event.data?.partnerId;
  console.log(`\n  🎉 COURTSHIP CONSENT! ${agent1.substring(0, 8)} ❤️ ${agent2?.substring(0, 8)}`);
});

world.eventBus.on('conception', (event: any) => {
  conceptionEvents++;
  const pregnant = event.data?.pregnantAgentId;
  const partner = event.data?.otherParentId;
  console.log(`\n  👶 CONCEPTION! Pregnant: ${pregnant?.substring(0, 8)}, Partner: ${partner?.substring(0, 8)}`);
});

// Run simulation
console.log('\n[7] Running simulation for 5000 ticks (watching for romance)...');
console.log('    (This will take about 60 seconds)\n');

let lastReportTick = 0;
for (let tick = 0; tick < 5000; tick++) {
  gameLoop.tick();

  // Report every 500 ticks
  if (tick > 0 && tick % 500 === 0) {
    console.log(`  [Tick ${tick}]`);

    const romeoState = romeoCourtship.state;
    const julietState = julietCourtship.state;

    console.log(`    Romeo: ${romeoState}, Juliet: ${julietState}`);

    if (romeoState !== 'idle' || julietState !== 'idle') {
      console.log(`    🔥 Activity detected!`);
    }

    lastReportTick = tick;
  }

  // Early exit if courtship succeeds
  if (courtshipEvents > 0) {
    console.log(`\n  ✨ SUCCESS at tick ${tick}! Stopping simulation.`);
    break;
  }
}

console.log('\n[8] Simulation complete!');
console.log(`  Interest events: ${interestEvents}`);
console.log(`  Courting events: ${courtingEvents}`);
console.log(`  Courtship consent events: ${courtshipEvents}`);
console.log(`  Conception events: ${conceptionEvents}`);

if (courtshipEvents > 0) {
  console.log('\n🎉 SUCCESS! Romeo and Juliet fell in love!');
} else if (interestEvents > 0) {
  console.log('\n💔 Interest was shown, but courtship didn\'t complete.');
  console.log('   This might indicate:');
  console.log('   - Courtship in progress (needs more time)');
  console.log('   - Compatibility calculation issues');
  console.log('   - Missing components for full courtship flow');
} else {
  console.log('\n😢 No courtship activity detected.');
  console.log('   Possible issues:');
  console.log('   - CourtshipSystem not running properly');
  console.log('   - Agents not finding each other (proximity)');
  console.log('   - Compatibility calculation returning 0');
  console.log('   - Missing required components');
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
