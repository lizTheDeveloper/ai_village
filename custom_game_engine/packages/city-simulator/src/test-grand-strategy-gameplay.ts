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
    const component = e.getComponent(CT.Empire);
    if (component && component.type === 'empire') {
      const emp = component as import('@ai-village/core').EmpireComponent;
      console.log(`  ${emp.empireName || 'unnamed'}:`);
      console.log(`    - Government: ${emp.leadership.type}`);
      console.log(`    - Legitimacy: ${emp.stability.imperialLegitimacy}`);
      console.log(`    - Treasury: ${emp.economy.imperialTreasury}`);
      console.log(`    - Nations: ${emp.territory.nations.length || 0}`);
    }
  }

  // Check Navy components in detail
  const navies = world.query().with(CT.Navy).executeEntities();
  console.log(`\nNavies: ${navies.length}`);
  for (const e of navies) {
    const component = e.getComponent(CT.Navy);
    if (component && component.type === 'navy') {
      const nav = component as import('@ai-village/core').NavyComponent;
      console.log(`  ${nav.name}:`);
      console.log(`    - Faction: ${nav.factionId}`);
      console.log(`    - Budget: ${nav.economy.annualBudget}`);
      console.log(`    - Total Ships: ${nav.assets.totalShips || 0}`);
      console.log(`    - Total Crew: ${nav.assets.totalCrew || 0}`);
      console.log(`    - Maintenance Cost: ${nav.economy.maintenanceCost || 0}`);
    }
  }

  // Check Megastructures
  const megas = world.query().with(CT.Megastructure).executeEntities();
  console.log(`\nMegastructures: ${megas.length}`);
  for (const e of megas) {
    const component = e.getComponent(CT.Megastructure);
    if (component && component.type === 'megastructure') {
      const mega = component as import('@ai-village/core').MegastructureComponent;
      console.log(`  ${mega.name}:`);
      console.log(`    - Category: ${mega.category}`);
      console.log(`    - Type: ${mega.structureType}`);
      console.log(`    - Operational: ${mega.operational}`);
      console.log(`    - Efficiency: ${mega.efficiency}`);
    }
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
    const component = e.getComponent(CT.Empire);
    if (component && component.type === 'empire') {
      const emp = component as import('@ai-village/core').EmpireComponent;
      console.log(`  ${emp.empireName || 'unnamed'}: legitimacy=${emp.stability.imperialLegitimacy}, treasury=${emp.economy.imperialTreasury}`);
    }
  }

  console.log('\nNavy changes:');
  for (const e of navies) {
    const component = e.getComponent(CT.Navy);
    if (component && component.type === 'navy') {
      const nav = component as import('@ai-village/core').NavyComponent;
      console.log(`  ${nav.name}: ships=${nav.assets.totalShips || 0}, crew=${nav.assets.totalCrew || 0}`);
    }
  }

  console.log('\nMegastructure changes:');
  for (const e of megas) {
    const component = e.getComponent(CT.Megastructure);
    if (component && component.type === 'megastructure') {
      const mega = component as import('@ai-village/core').MegastructureComponent;
      console.log(`  ${mega.name}: operational=${mega.operational}, efficiency=${mega.efficiency}`);
    }
  }

  // Check what systems are running
  console.log('\n=== SYSTEM ACTIVITY CHECK ===\n');

  // Note: systemRegistry is internal, this check is for debugging only
  // TODO: fix type - systemRegistry is not exposed in public API
  console.log('Grand Strategy systems check: skipped (requires internal API access)');

  console.log('\n🎮 Gameplay test complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
