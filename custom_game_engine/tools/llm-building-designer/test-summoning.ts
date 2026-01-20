/**
 * Quick test script for building summoning magic.
 * Run in browser console after loading game.
 */

// Test sequence
async function testBuildingSummoning() {
  console.log('🌀 Testing Building Summoning Magic...\n');

  // 1. List available dimensional buildings
  console.log('1️⃣ Listing dimensional buildings...');
  const buildings = await dimensional.listBuildings();
  console.log(`Found ${buildings.total} dimensional buildings`);

  // 2. Spawn a 3D shelter
  console.log('\n2️⃣ Spawning 3D shelter...');
  const shelter = await dimensional.spawnBuilding('simple_shelter', 50, 50);
  console.log(`Result: ${shelter.message}`);

  // 3. Spawn a 4D tesseract (if available)
  console.log('\n3️⃣ Spawning 4D tesseract...');
  const tesseract = await dimensional.spawnBuilding('tesseract_research_lab_01', 100, 50);
  console.log(`Result: ${tesseract.message}`);

  // 4. Spawn a 5D penteract (if available)
  console.log('\n4️⃣ Spawning 5D penteract...');
  const penteract = await dimensional.spawnBuilding('5d_phase_temple_001', 150, 50);
  console.log(`Result: ${penteract.message}`);

  // 5. Create dimensional rift
  console.log('\n5️⃣ Creating 3D→4D rift...');
  const rift = await dimensional.spawnRift(200, 50, 4);
  console.log(`Result: ${rift.message}`);

  // 6. Grant magic to nearest agent (placeholder - would need to query for agent)
  console.log('\n6️⃣ Granting dimensional magic to agent...');
  console.log('(Skipped - need agent ID. Use: dimensional.grantMagic("agent-id", 50))');

  console.log('\n✅ Test complete! Check the game world.');
}

// Test individual functions
async function testSpawnBuilding(buildingId: string, x: number, y: number) {
  console.log(`Spawning ${buildingId} at (${x}, ${y})...`);
  const result = await dimensional.spawnBuilding(buildingId, x, y);
  console.log(result);
  return result;
}

async function testSpawnRift(x: number, y: number, targetDim: number = 4) {
  console.log(`Creating rift to ${targetDim}D at (${x}, ${y})...`);
  const result = await dimensional.spawnRift(x, y, targetDim);
  console.log(result);
  return result;
}

async function testListBuildings() {
  console.log('Fetching dimensional buildings...');
  const result = await dimensional.listBuildings();
  console.log(result);
  return result;
}

// Expose to window
(window as any).testSummoning = testBuildingSummoning;
(window as any).testSpawnBuilding = testSpawnBuilding;
(window as any).testSpawnRift = testSpawnRift;
(window as any).testListBuildings = testListBuildings;

console.log('💫 Building Summoning Test Suite Loaded');
console.log('');
console.log('Available commands:');
console.log('  testSummoning()              - Run full test sequence');
console.log('  testSpawnBuilding(id, x, y)  - Spawn specific building');
console.log('  testSpawnRift(x, y, dim)     - Create dimensional rift');
console.log('  testListBuildings()          - List all dimensional buildings');
console.log('');
console.log('Direct API (from dimensional-dev-tools.ts):');
console.log('  dimensional.spawnBuilding(id, x, y)');
console.log('  dimensional.spawnRift(x, y, targetDim)');
console.log('  dimensional.listBuildings()');
console.log('  dimensional.grantMagic(agentId, powerLevel)');
