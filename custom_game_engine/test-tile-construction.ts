/**
 * Test tile-based construction integration
 * Verifies that BuildBehavior routes to tile-based construction
 */

import { World } from './packages/core/src/ecs/World.js';
import { EntityImpl } from './packages/core/src/ecs/Entity.js';
import { createEntityId } from './packages/core/src/ecs/EntityId.js';
import { ComponentType } from './packages/core/src/types/ComponentType.js';
import { createAgentComponent } from './packages/core/src/components/AgentComponent.js';
import { createPositionComponent } from './packages/core/src/components/PositionComponent.js';
import { createInventoryComponent } from './packages/core/src/components/InventoryComponent.js';
import { BuildBehavior } from './packages/core/src/behavior/behaviors/BuildBehavior.js';
import { getTileConstructionSystem } from './packages/core/src/systems/TileConstructionSystem.js';

console.log('=== Tile-Based Construction Integration Test ===\n');

// Create world
const world = new World();

// Create test agent
const agent = new EntityImpl(createEntityId(), 0);
agent.addComponent(createPositionComponent(10, 10));
agent.addComponent(createAgentComponent('Test Agent'));

// Add inventory with wood for building
const inventory = createInventoryComponent(10);
inventory.slots[0] = { itemId: 'wood', quantity: 50 };
agent.addComponent(inventory);

// Set agent behavior to build tent (should route to tile-based)
agent.updateComponent(ComponentType.Agent, (comp) => ({
  ...comp,
  behavior: 'build',
  behaviorState: {
    buildingType: 'tent', // This should map to tile_simple_hut
  },
}));

world._addEntity(agent);

console.log('1. Agent created with build behavior for "tent"');
console.log(`   - Position: (10, 10)`);
console.log(`   - Inventory: 50 wood`);
console.log('');

// Execute BuildBehavior
const buildBehavior = new BuildBehavior();
const result = buildBehavior.execute(agent, world);

console.log('2. BuildBehavior executed');
console.log(`   - Result: ${result?.reason || 'void'}`);
console.log('');

// Check if agent switched to material_transport behavior
const agentComp = agent.getComponent(ComponentType.Agent);
console.log('3. Agent behavior after BuildBehavior:');
console.log(`   - Current behavior: ${agentComp?.behavior}`);
console.log(`   - Behavior state:`, agentComp?.behaviorState);
console.log('');

// Check if construction task was created
const constructionSystem = getTileConstructionSystem();
const activeTasks = constructionSystem.getActiveTasks();

console.log('4. TileConstructionSystem tasks:');
console.log(`   - Active tasks: ${activeTasks.length}`);
if (activeTasks.length > 0) {
  const task = activeTasks[0];
  console.log(`   - Task ID: ${task.id}`);
  console.log(`   - Blueprint: ${task.blueprintId}`);
  console.log(`   - Origin: (${task.origin.x}, ${task.origin.y})`);
  console.log(`   - Tiles to build: ${task.tiles.length}`);
  console.log(`   - Status: ${task.status}`);
}
console.log('');

// Summary
console.log('=== Test Summary ===');
const success = agentComp?.behavior === 'material_transport' && activeTasks.length > 0;
if (success) {
  console.log('✅ SUCCESS: Tile-based construction integration works!');
  console.log('   - Agent switched to material_transport behavior');
  console.log('   - Construction task created in TileConstructionSystem');
  console.log('   - Blueprint: ' + activeTasks[0]?.blueprintId);
} else {
  console.log('❌ FAILURE: Integration not working correctly');
  if (agentComp?.behavior !== 'material_transport') {
    console.log('   - Agent did not switch to material_transport');
    console.log('   - Current behavior: ' + agentComp?.behavior);
  }
  if (activeTasks.length === 0) {
    console.log('   - No construction task created');
  }
}
