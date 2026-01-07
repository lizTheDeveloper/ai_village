/**
 * Test why agents stop moving after they start
 */

import { GameLoop } from '../packages/core/src/loop/GameLoop.js';
import { registerAllSystems } from '../packages/core/src/systems/registerAllSystems.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';

const gameLoop = new GameLoop();
registerAllSystems(gameLoop, {
  enableMetrics: false,
  enableAutoSave: false,
});

const world = gameLoop.world;

// Create hungry agent
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
  useLLM: false,
  llmCooldown: 0,
  lastLLMRequest: 0,
  thinkInterval: 1,
  lastThinkTick: 0,
});

agent.addComponent({
  type: CT.Needs,
  hunger: 0.3,  // Hungry
  energy: 0.9,
  temperature: 1.0,
});

agent.addComponent({
  type: CT.Inventory,
  slots: Array(10).fill({ itemId: null, quantity: 0 }),
  capacity: 10,
  currentWeight: 0,
});

console.log('Running 100 ticks, tracking when agent stops...\n');

let lastMovingTick = -1;
let lastVelocity = { x: 0, y: 0 };
let lastBehavior = 'idle';

for (let i = 0; i < 100; i++) {
  gameLoop.tick(16);

  const movement = agent.getComponent(CT.Movement);
  const agentComp = agent.getComponent(CT.Agent);
  const pos = agent.getComponent(CT.Position);

  const isMoving = movement.velocityX !== 0 || movement.velocityY !== 0;

  if (isMoving) {
    lastMovingTick = i;
    lastVelocity = { x: movement.velocityX, y: movement.velocityY };
    lastBehavior = agentComp.behavior;
  }

  // Log every 10 ticks
  if (i % 10 === 9) {
    console.log(`Tick ${i+1}: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}), vel=(${movement.velocityX.toFixed(2)}, ${movement.velocityY.toFixed(2)}), behavior=${agentComp.behavior}, moving=${isMoving}`);
  }

  // Detect when agent stops
  if (lastMovingTick === i - 1 && !isMoving) {
    console.log(`\n⚠️  Agent STOPPED at tick ${i+1}!`);
    console.log(`   Last velocity: (${lastVelocity.x.toFixed(2)}, ${lastVelocity.y.toFixed(2)})`);
    console.log(`   Behavior before stop: ${lastBehavior}`);
    console.log(`   Behavior after stop: ${agentComp.behavior}`);
    console.log(`   Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);

    // Check if behavior changed
    if (lastBehavior !== agentComp.behavior) {
      console.log(`   ❌ Behavior changed: ${lastBehavior} → ${agentComp.behavior}`);
    }
  }
}

const finalMovement = agent.getComponent(CT.Movement);
const finalAgent = agent.getComponent(CT.Agent);

console.log(`\n=== Final State ===`);
console.log(`Last moving tick: ${lastMovingTick}`);
console.log(`Final velocity: (${finalMovement.velocityX.toFixed(2)}, ${finalMovement.velocityY.toFixed(2)})`);
console.log(`Final behavior: ${finalAgent.behavior}`);

if (lastMovingTick < 90) {
  console.log(`\n❌ FAILED: Agent stopped moving at tick ${lastMovingTick + 1}`);
} else {
  console.log(`\n✅ SUCCESS: Agent kept moving throughout the test`);
}

process.exit(0);
