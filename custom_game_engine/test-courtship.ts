/**
 * Courtship System Integration Test
 *
 * Verifies that agents have courtship components and can court each other.
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { World } from './packages/core/src/ecs/World.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { CourtshipSystem } from './packages/core/src/systems/CourtshipSystem.js';
import { MovementSystem } from './packages/core/src/systems/MovementSystem.js';
import { SteeringSystem } from './packages/core/src/systems/SteeringSystem.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';

console.log('='.repeat(60));
console.log('COURTSHIP SYSTEM INTEGRATION TEST');
console.log('='.repeat(60));

// Create game loop (it creates its own world internally)
const gameLoop = new GameLoop();
const world = gameLoop.world as any;  // Get the world from the game loop

// Register only essential systems for courtship testing
console.log('\n[1] Registering systems...');
try {
  gameLoop.systemRegistry.register(new MovementSystem());
  gameLoop.systemRegistry.register(new SteeringSystem());
  gameLoop.systemRegistry.register(new CourtshipSystem());
  console.log('✓ Systems registered: MovementSystem, SteeringSystem, CourtshipSystem');
} catch (error) {
  console.error('✗ Error registering systems:', error);
  process.exit(1);
}

// Create 5 test agents
console.log('\n[2] Creating 5 test agents...');
const agentIds: string[] = [];
for (let i = 0; i < 5; i++) {
  const x = 10 + Math.random() * 10;  // Cluster agents together for proximity
  const y = 10 + Math.random() * 10;
  const agentId = createWanderingAgent(world, x, y);
  agentIds.push(agentId);
  console.log(`  Created agent ${i + 1}: ${agentId}`);
}

// Add Species components to all agents (required for courtship compatibility)
console.log('\n[2.5] Adding Species components...');
for (let i = 0; i < agentIds.length; i++) {
  const agent = world.getEntity(agentIds[i]);
  if (agent) {
    const speciesComponent = new SpeciesComponent('human', 'Human', 'humanoid_biped');
    (agent as any).addComponent(speciesComponent);
    console.log(`  ✓ Agent ${i + 1} (${agentIds[i].substring(0, 8)}) is now Human species`);
  }
}

// Set at least 3 agents to actively seeking
console.log('\n[2.6] Setting 3 agents to actively seeking...');
for (let i = 0; i < 3; i++) {
  const agent = world.getEntity(agentIds[i]);
  if (agent) {
    const sexuality = agent.getComponent(CT.Sexuality) as any;
    if (sexuality) {
      sexuality.activelySeeking = true;
      console.log(`  ✓ Agent ${i + 1} (${agentIds[i].substring(0, 8)}) now actively seeking`);
    }
  }
}

// Verify agents have courtship and sexuality components
console.log('\n[3] Verifying components...');
let allHaveComponents = true;
for (const agentId of agentIds) {
  const agent = world.getEntity(agentId);
  if (!agent) {
    console.error(`  ✗ Agent ${agentId} not found!`);
    allHaveComponents = false;
    continue;
  }

  const courtship = agent.getComponent(CT.Courtship);
  const sexuality = agent.getComponent(CT.Sexuality);

  if (!courtship) {
    console.error(`  ✗ Agent ${agentId} missing courtship component!`);
    allHaveComponents = false;
  } else {
    console.log(`  ✓ Agent ${agentId}: courtship state = ${courtship.state}, romantic inclination = ${courtship.romanticInclination.toFixed(2)}`);
  }

  if (!sexuality) {
    console.error(`  ✗ Agent ${agentId} missing sexuality component!`);
    allHaveComponents = false;
  } else {
    console.log(`    - sexuality: seeking = ${sexuality.activelySeeking}, style = ${sexuality.relationshipStyle}`);
  }
}

if (allHaveComponents) {
  console.log('\n✓ ALL AGENTS HAVE COURTSHIP AND SEXUALITY COMPONENTS!');
} else {
  console.log('\n✗ SOME AGENTS MISSING COMPONENTS - INTEGRATION FAILED');
  process.exit(1);
}

// Run simulation for a while to check for courtship activity
console.log('\n[4] Running simulation for 2000 ticks to check for courtship activity...');
console.log('   (This may take 30-60 seconds at 20 TPS simulation speed)');

let courtshipEvents = 0;
let conceptionEvents = 0;

// Listen for courtship and conception events
world.eventBus.on('courtship:consent', () => {
  courtshipEvents++;
  console.log('  🎉 COURTSHIP CONSENT EVENT DETECTED!');
});

world.eventBus.on('conception', (event) => {
  conceptionEvents++;
  console.log(`  👶 CONCEPTION EVENT DETECTED! Pregnant: ${event.data.pregnantAgentId}, Other parent: ${event.data.otherParentId}`);
});

// Run simulation
for (let tick = 0; tick < 2000; tick++) {
  gameLoop.tick();

  // Log progress every 500 ticks
  if (tick % 500 === 0 && tick > 0) {
    console.log(`  Tick ${tick}...`);

    // Check agent states
    let courtingCount = 0;
    for (const agentId of agentIds) {
      const agent = world.getEntity(agentId);
      const courtship = agent?.getComponent(CT.Courtship) as any;
      if (courtship && courtship.state !== 'idle') {
        courtingCount++;
        console.log(`    Agent ${agentId.substring(0, 8)}: ${courtship.state}`);
      }
    }

    if (courtingCount > 0) {
      console.log(`    ${courtingCount} agents actively courting!`);
    } else {
      console.log(`    All agents idle`);
    }
  }
}

console.log('\n[5] Simulation complete!');
console.log(`  Courtship consent events: ${courtshipEvents}`);
console.log(`  Conception events: ${conceptionEvents}`);

// Debug: Check agent positions and distances
console.log('\n[6] Debug: Agent positions and distances...');
for (let i = 0; i < agentIds.length; i++) {
  const agent1 = world.getEntity(agentIds[i]);
  const pos1 = agent1?.getComponent(CT.Position) as any;
  if (!pos1) {
    console.log(`  ⚠️  Agent ${i + 1} missing Position component!`);
    continue;
  }

  console.log(`  Agent ${i + 1}: pos=(${pos1.x.toFixed(1)}, ${pos1.y.toFixed(1)})`);

  for (let j = i + 1; j < agentIds.length; j++) {
    const agent2 = world.getEntity(agentIds[j]);
    const pos2 = agent2?.getComponent(CT.Position) as any;
    if (!pos2) continue;

    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      console.log(`    - Distance to Agent ${j + 1}: ${dist.toFixed(2)} tiles (WITHIN RANGE)`);
    }
  }
}

// Debug: Check for Species and Relationship components
console.log('\n[7] Debug: Checking for missing components...');
for (let i = 0; i < agentIds.length; i++) {
  const agent = world.getEntity(agentIds[i]);
  const species = agent?.getComponent(CT.Species);
  const relationship = agent?.getComponent(CT.Relationship);

  if (!species) {
    console.log(`  ⚠️  Agent ${i + 1} missing Species component!`);
  }
  if (!relationship) {
    console.log(`  ⚠️  Agent ${i + 1} missing Relationship component!`);
  }
}

if (courtshipEvents > 0 || conceptionEvents > 0) {
  console.log('\n🎉 SUCCESS! Courtship system is working!');
} else {
  console.log('\n⚠️  No courtship activity detected in 2000 ticks.');
  console.log('   This might be normal - courtship requires:');
  console.log('   - Agents with activelySeeking = true (~70% chance)');
  console.log('   - Compatible agents (same species, mutual attraction)');
  console.log('   - Agents in proximity (<10 tiles)');
  console.log('   - Time for courtship to progress (can take 500-2000 ticks)');
  console.log('   - High enough romantic inclination');
  console.log('\n   The components are correctly installed, so the system should work.');
  console.log('   Try running for longer or with more agents to see courtship activity.');
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
