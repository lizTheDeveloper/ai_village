/**
 * Test script to debug autonomic behavior execution
 * Traces the full flow from decision → behavior execution → movement
 */

import { GameLoop } from '../packages/core/src/loop/GameLoop.js';
import { registerAllSystems } from '../packages/core/src/systems/registerAllSystems.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';

console.log('[Test] Creating world and game loop...\n');

const gameLoop = new GameLoop();

// Register all systems (this includes AgentBrainSystem and MovementSystem)
registerAllSystems(gameLoop, {
  enableMetrics: false,
  enableAutoSave: false,
});

console.log('[Test] Systems registered successfully\n');

// Use the game loop's world (not a separate world instance!)
const world = gameLoop.world;

// Create a test agent with hunger to trigger autonomic seek_food behavior
const agent = world.createEntity();
agent.addComponent({
  type: CT.Identity,
  name: 'Test Agent',
  species: 'human',
  age: 25,
  gender: 'neutral',
});

agent.addComponent({
  type: CT.Position,
  x: 50,
  y: 50,
  z: 0,
});

agent.addComponent({
  type: CT.Movement,
  velocityX: 0,
  velocityY: 0,
  velocityZ: 0,
  speed: 2,
  isMoving: false,
});

agent.addComponent({
  type: CT.Agent,
  behavior: 'idle',
  behaviorState: {},
  useLLM: false,  // Disable LLM to focus on autonomic behaviors
  llmCooldown: 0,
  lastLLMRequest: 0,
  thinkInterval: 1,  // Think every tick for fast testing
  lastThinkTick: 0,
});

agent.addComponent({
  type: CT.Needs,
  hunger: 0.3,  // Low hunger (< 0.6) should trigger seek_food in AutonomicSystem
  energy: 0.9,  // High energy (prevent sleep from triggering)
  temperature: 1.0,
});

agent.addComponent({
  type: CT.Inventory,
  slots: Array(10).fill({ itemId: null, quantity: 0 }),
  capacity: 10,
  currentWeight: 0,
});

console.log('[Test] Agent created:');
console.log(`  - Position: (${agent.getComponent(CT.Position).x}, ${agent.getComponent(CT.Position).y})`);
console.log(`  - Hunger: ${(agent.getComponent(CT.Needs).hunger * 100).toFixed(0)}%`);
console.log(`  - Behavior: ${agent.getComponent(CT.Agent).behavior}`);
console.log(`  - useLLM: ${agent.getComponent(CT.Agent).useLLM}`);
console.log();

// Listen for behavior changes (use world's event bus)
(world as any).eventBus.subscribe('behavior:change', (event: any) => {
  console.log(`[Event] Behavior changed: ${event.data.from} → ${event.data.to} (reason: ${event.data.reason}, layer: ${event.data.layer || 'unknown'})`);
});

console.log('[Test] Running 5 game ticks...\n');

for (let i = 0; i < 5; i++) {
  console.log(`=== Tick ${i + 1} ===`);

  const beforeAgent = agent.getComponent(CT.Agent);
  const beforePos = agent.getComponent(CT.Position);
  const beforeMovement = agent.getComponent(CT.Movement);

  console.log(`[Before] Position: (${beforePos.x.toFixed(2)}, ${beforePos.y.toFixed(2)})`);
  console.log(`[Before] Velocity: (${beforeMovement.velocityX.toFixed(2)}, ${beforeMovement.velocityY.toFixed(2)})`);
  console.log(`[Before] Behavior: ${beforeAgent.behavior}`);

  // Run game tick
  gameLoop.tick(16); // 16ms = 60fps

  const afterAgent = agent.getComponent(CT.Agent);
  const afterPos = agent.getComponent(CT.Position);
  const afterMovement = agent.getComponent(CT.Movement);

  console.log(`[After]  Position: (${afterPos.x.toFixed(2)}, ${afterPos.y.toFixed(2)})`);
  console.log(`[After]  Velocity: (${afterMovement.velocityX.toFixed(2)}, ${afterMovement.velocityY.toFixed(2)})`);
  console.log(`[After]  Behavior: ${afterAgent.behavior}`);

  // Check if anything changed
  const behaviorChanged = beforeAgent.behavior !== afterAgent.behavior;
  const velocityChanged = beforeMovement.velocityX !== afterMovement.velocityX ||
                          beforeMovement.velocityY !== afterMovement.velocityY;
  const positionChanged = beforePos.x !== afterPos.x || beforePos.y !== afterPos.y;

  console.log(`[Changes] Behavior: ${behaviorChanged}, Velocity: ${velocityChanged}, Position: ${positionChanged}`);
  console.log();
}

console.log('\n=== Final State ===');
const finalAgent = agent.getComponent(CT.Agent);
const finalPos = agent.getComponent(CT.Position);
const finalMovement = agent.getComponent(CT.Movement);

console.log(`Position: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)})`);
console.log(`Velocity: (${finalMovement.velocityX.toFixed(2)}, ${finalMovement.velocityY.toFixed(2)})`);
console.log(`Behavior: ${finalAgent.behavior}`);
console.log(`Hunger: ${(agent.getComponent(CT.Needs).hunger * 100).toFixed(0)}%`);

// Verdict
console.log('\n=== Test Results ===\n');

if (finalAgent.behavior === 'idle') {
  console.log('❌ FAILED: Agent behavior never changed from idle');
  console.log('   Expected: seek_food (hunger < 60%)');
  console.log('   Autonomic system is not working');
} else if (finalAgent.behavior === 'seek_food') {
  if (finalMovement.velocityX === 0 && finalMovement.velocityY === 0) {
    console.log('⚠️  PARTIAL: Agent behavior changed to seek_food but velocity is still 0');
    console.log('   Decision system is working, but behavior execution is broken');
  } else if (finalPos.x === 50 && finalPos.y === 50) {
    console.log('⚠️  PARTIAL: Agent has velocity but position didn\'t move');
    console.log('   Behavior execution is working, but MovementSystem is broken');
  } else {
    console.log('✅ SUCCESS: Agent is seeking food and moving!');
    console.log(`   Behavior: ${finalAgent.behavior}`);
    console.log(`   Moved from (50, 50) to (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)})`);
  }
} else {
  console.log(`⚠️  PARTIAL: Agent behavior changed to ${finalAgent.behavior}`);
  console.log(`   Expected: seek_food, but got different behavior`);
}

console.log('\n=== Test Complete ===\n');
process.exit(0);
