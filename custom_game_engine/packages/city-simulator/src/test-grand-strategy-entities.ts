/**
 * Focused test for Grand Strategy entity spawning and gameplay actions
 */

import { GrandStrategySimulator } from './GrandStrategySimulator.js';
import { CT } from '@ai-village/core';

async function main() {
  console.log('🌌 Testing Grand Strategy Entity Spawning...\n');

  const simulator = new GrandStrategySimulator({
    empireCount: 2,
    nationsPerEmpire: 2,
    federationCount: 1,
    createGalacticCouncil: true,
    naviesPerEmpire: 1,
    shipsPerSquadron: 3, // Minimum 3 ships per squadron required
    megastructureCount: 2,
    workersPerMegastructure: 3,
  });

  await simulator.initialize();
  const world = simulator.getWorld();

  // Skip initial simulation ticks - just check entities spawned correctly
  console.log('=== GRAND STRATEGY ENTITY SUMMARY ===\n');

  const stats = simulator.getGrandStrategyStats();
  console.log('📊 Entity Counts:');
  console.log(`  Nations: ${stats.nations}`);
  console.log(`  Empires: ${stats.empires}`);
  console.log(`  Federations: ${stats.federations}`);
  console.log(`  Galactic Councils: ${stats.galacticCouncils}`);
  console.log(`  Navies: ${stats.navies}`);
  console.log(`  Ships: ${stats.ships}`);
  console.log(`  Crew Members: ${stats.crews}`);
  console.log(`  Megastructures: ${stats.megastructures}`);
  console.log(`  Megastructure Workers: ${stats.megastructureWorkers}`);

  // Verify entities have proper data
  console.log('\n=== EMPIRE DETAILS ===\n');
  const empires = world.query().with(CT.Empire).executeEntities();
  for (const e of empires) {
    const component = e.getComponent(CT.Empire);
    if (component && component.type === 'empire') {
      const emp = component as import('@ai-village/core').EmpireComponent;
      console.log(`👑 ${emp.empireName}:`);
      console.log(`   Nations linked: ${emp.territory.nations.length || 0}`);
      console.log(`   Nation records: ${emp.nationRecords.length || 0}`);
      console.log(`   Treasury: ${emp.economy.imperialTreasury.toLocaleString()}`);
      console.log(`   Total population: ${emp.territory.totalPopulation.toLocaleString()}`);
      if (emp.nationRecords.length > 0) {
        console.log(`   First nation: ${emp.nationRecords[0].nationName} (GDP: ${emp.nationRecords[0].gdp?.toLocaleString()})`);
      }
    }
  }

  console.log('\n=== NAVY DETAILS ===\n');
  const navies = world.query().with(CT.Navy).executeEntities();
  for (const e of navies) {
    const component = e.getComponent(CT.Navy);
    if (component && component.type === 'navy') {
      const nav = component as import('@ai-village/core').NavyComponent;
      console.log(`⚓ ${nav.name}:`);
      console.log(`   Armadas: ${nav.assets.armadaIds.length || 0}`);
      console.log(`   Total ships: ${nav.assets.totalShips || 0}`);
      console.log(`   Total crew: ${nav.assets.totalCrew || 0}`);
      console.log(`   Budget: ${nav.budget.toLocaleString()}`);
    }
  }

  console.log('\n=== SHIP DETAILS ===\n');
  const ships = world.query().with(CT.Spaceship).executeEntities();
  console.log(`Total ships found: ${ships.length}`);
  if (ships.length > 0) {
    const firstShip = ships[0]!;
    const shipComp = firstShip.getComponent(CT.Spaceship) as any;
    console.log(`First ship: ${shipComp?.name}`);
    console.log(`  Type: ${shipComp?.shipType}`);
    console.log(`  Crew members: ${shipComp?.crew?.member_ids?.length || 0}`);
    console.log(`  Crew coherence: ${shipComp?.crew?.coherence}`);
  }

  console.log('\n=== MEGASTRUCTURE DETAILS ===\n');
  const megas = world.query().with(CT.Megastructure).executeEntities();
  for (const e of megas) {
    const mega = e.getComponent(CT.Megastructure) as any;
    console.log(`🏗️ ${mega?.name}:`);
    console.log(`   Category: ${mega?.category}`);
    console.log(`   Type: ${mega?.structureType}`);
    console.log(`   Operational: ${mega?.operational}`);
    console.log(`   Integrity: ${mega?.integrity}`);
    console.log(`   Workers: ${mega?.workerIds?.length || 0}`);
  }

  // Test gameplay actions
  console.log('\n=== TESTING GAMEPLAY ACTIONS ===\n');

  const spawned = simulator.getSpawnedEntities();

  // Test diplomatic action
  if (spawned.empires.length >= 2) {
    const result = simulator.diplomaticAction(
      spawned.empires[0]!,
      spawned.empires[1]!,
      'trade_agreement'
    );
    console.log(`Diplomatic action (trade_agreement): ${result ? '✅ SUCCESS' : '❌ FAILED'}`);

    // Check if relation was set
    const empire1 = world.getEntity(spawned.empires[0]!);
    const emp1Comp = empire1?.getComponent(CT.Empire) as any;
    const relation = emp1Comp?.diplomacy?.relations?.get(spawned.empires[1]!);
    console.log(`  Relation established: ${relation ? '✅ YES' : '❌ NO'}`);
    if (relation) {
      console.log(`  Relationship: ${relation.relationship}`);
      console.log(`  Treaties: ${relation.treaties?.join(', ')}`);
    }
  }

  // Test fleet movement
  if (spawned.fleets.length > 0) {
    const result = simulator.moveFleet(spawned.fleets[0]!, 500, 500);
    console.log(`Fleet movement: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  // Test megastructure task
  if (spawned.megastructures.length > 0) {
    const result = simulator.assignMegastructureTask(spawned.megastructures[0]!, 'expansion');
    console.log(`Megastructure task assignment: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  console.log('\n=== ENTITY ID LIST (for API testing) ===\n');
  console.log('Empires:', spawned.empires.slice(0, 2).join(', '));
  console.log('Navies:', spawned.navies.slice(0, 2).join(', '));
  console.log('Fleets:', spawned.fleets.slice(0, 2).join(', '));
  console.log('Ships:', spawned.ships.slice(0, 3).join(', '));
  console.log('Megastructures:', spawned.megastructures.slice(0, 2).join(', '));

  console.log('\n🌌 Grand Strategy entity test complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
