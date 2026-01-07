/**
 * Test if agents are actually moving or oscillating
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

const startPos = agent.getComponent(CT.Position);
console.log(`Starting at: (${startPos.x}, ${startPos.y})\n`);

// Run 30 ticks
const positions: {x: number, y: number}[] = [];
for (let i = 0; i < 30; i++) {
  gameLoop.tick(16);
  const pos = agent.getComponent(CT.Position);
  positions.push({x: pos.x, y: pos.y});

  if (i % 5 === 4) {
    const movement = agent.getComponent(CT.Movement);
    console.log(`Tick ${i+1}: pos=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}), vel=(${movement.velocityX.toFixed(2)}, ${movement.velocityY.toFixed(2)})`);
  }
}

// Calculate total distance traveled
let totalDistance = 0;
for (let i = 1; i < positions.length; i++) {
  const dx = positions[i].x - positions[i-1].x;
  const dy = positions[i].y - positions[i-1].y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  totalDistance += dist;
}

const finalPos = positions[positions.length - 1];
const straightLineDistance = Math.sqrt(
  (finalPos.x - startPos.x) ** 2 +
  (finalPos.y - startPos.y) ** 2
);

console.log(`\n=== Results ===`);
console.log(`Final position: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)})`);
console.log(`Straight-line distance from start: ${straightLineDistance.toFixed(2)}`);
console.log(`Total distance traveled (path): ${totalDistance.toFixed(2)}`);
console.log(`Average speed: ${(totalDistance / 30).toFixed(2)} units/tick`);

// Check for oscillation
if (totalDistance < 1.0) {
  console.log(`\n❌ FAILED: Agent barely moved (${totalDistance.toFixed(2)} units total)`);
} else if (straightLineDistance < totalDistance * 0.1) {
  console.log(`\n⚠️  WARNING: Agent might be oscillating (path ${totalDistance.toFixed(2)}, net displacement ${straightLineDistance.toFixed(2)})`);
} else {
  console.log(`\n✅ SUCCESS: Agent is moving normally`);
}

process.exit(0);
