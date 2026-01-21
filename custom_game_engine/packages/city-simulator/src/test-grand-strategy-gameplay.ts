/**
 * Test Grand Strategy GAMEPLAY - are systems actually processing entities?
 */

import { GrandStrategySimulator } from './GrandStrategySimulator.js';
import { CT } from '@ai-village/core';

async function main() {
  console.log('🎮 Testing Grand Strategy GAMEPLAY...\n');

  const simulator = new GrandStrategySimulator({
    empireCount: 2,
    federationCount: 1,
    createGalacticCouncil: true,
    naviesPerEmpire: 1,
    megastructureCount: 2,
  });

  await simulator.initialize();
  const world = simulator.getWorld();

  console.log('=== INITIAL STATE ===\n');

  // Check Empire components in detail
  const empires = world.query().with(CT.Empire).executeEntities();
  console.log(`Empires: ${empires.length}`);
  for (const e of empires) {
    const emp = e.getComponent(CT.Empire) as any;
    console.log(`  ${emp?.name || 'unnamed'}:`);
    console.log(`    - Government: ${emp?.governmentType}`);
    console.log(`    - Stability: ${emp?.stability}`);
    console.log(`    - Treasury: ${emp?.treasury}`);
    console.log(`    - Nations: ${emp?.territory?.nations?.length || 0}`);
  }

  // Check Navy components in detail
  const navies = world.query().with(CT.Navy).executeEntities();
  console.log(`\nNavies: ${navies.length}`);
  for (const e of navies) {
    const nav = e.getComponent(CT.Navy) as any;
    console.log(`  ${nav?.name}:`);
    console.log(`    - Empire: ${nav?.empireId}`);
    console.log(`    - Budget: ${nav?.budget}`);
    console.log(`    - Total Ships: ${nav?.assets?.totalShips || 0}`);
    console.log(`    - Total Crew: ${nav?.assets?.totalCrew || 0}`);
    console.log(`    - Maintenance Cost: ${nav?.economy?.maintenanceCost || 0}`);
  }

  // Check Megastructures
  const megas = world.query().with(CT.Megastructure).executeEntities();
  console.log(`\nMegastructures: ${megas.length}`);
  for (const e of megas) {
    const mega = e.getComponent(CT.Megastructure) as any;
    console.log(`  ${mega?.name}:`);
    console.log(`    - Category: ${mega?.category}`);
    console.log(`    - Type: ${mega?.structureType}`);
    console.log(`    - Operational: ${mega?.operational}`);
    console.log(`    - Integrity: ${mega?.integrity}`);
  }

  // Run simulation for 200 ticks (10 seconds)
  console.log('\n=== RUNNING 200 TICKS ===\n');

  for (let i = 0; i < 200; i++) {
    simulator.tick();
  }

  console.log('=== AFTER 200 TICKS ===\n');

  // Check if anything changed
  console.log('Empire changes:');
  for (const e of empires) {
    const emp = e.getComponent(CT.Empire) as any;
    console.log(`  ${emp?.name || 'unnamed'}: stability=${emp?.stability}, treasury=${emp?.treasury}`);
  }

  console.log('\nNavy changes:');
  for (const e of navies) {
    const nav = e.getComponent(CT.Navy) as any;
    console.log(`  ${nav?.name}: ships=${nav?.assets?.totalShips || 0}, crew=${nav?.assets?.totalCrew || 0}`);
  }

  console.log('\nMegastructure changes:');
  for (const e of megas) {
    const mega = e.getComponent(CT.Megastructure) as any;
    console.log(`  ${mega?.name}: operational=${mega?.operational}, integrity=${mega?.integrity}`);
  }

  // Check what systems are running
  console.log('\n=== SYSTEM ACTIVITY CHECK ===\n');

  // Look for any events that were fired
  const systemRegistry = (simulator as any).gameLoop?.systemRegistry;
  if (systemRegistry) {
    const systems = systemRegistry.getAll?.() || [];
    const gsSystemIds = ['empire', 'navy_management', 'armada_management', 'fleet_management', 'megastructure_maintenance'];

    console.log('Grand Strategy systems registered:');
    for (const id of gsSystemIds) {
      const sys = systems.find((s: any) => s.id === id);
      console.log(`  ${id}: ${sys ? '✓ registered' : '✗ NOT FOUND'}`);
    }
  }

  console.log('\n🎮 Gameplay test complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
