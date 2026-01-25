/**
 * Quick test script for GrandStrategySimulator
 * Run with: npx tsx packages/city-simulator/src/test-grand-strategy.ts
 */

import { GrandStrategySimulator } from './GrandStrategySimulator.js';

async function main() {
  console.log('🌌 Creating Grand Strategy Simulator...\n');

  const simulator = new GrandStrategySimulator({
    empireCount: 3,
    federationCount: 1,
    createGalacticCouncil: true,
    naviesPerEmpire: 2,
    megastructureCount: 4,
  });

  await simulator.initialize();

  console.log('\n📊 Grand Strategy Stats:');
  const stats = simulator.getGrandStrategyStats();
  console.log(`  Empires: ${stats.empires}`);
  console.log(`  Federations: ${stats.federations}`);
  console.log(`  Galactic Councils: ${stats.galacticCouncils}`);
  console.log(`  Total Naval Forces: ${stats.totalNavalForces}`);
  console.log(`  Megastructures: ${stats.megastructures}`);

  console.log('\n🆔 Spawned Entity IDs:');
  const entities = simulator.getSpawnedEntities();
  console.log(`  Empires: ${entities.empires.join(', ')}`);
  console.log(`  Federations: ${entities.federations.join(', ')}`);
  console.log(`  Galactic Councils: ${entities.galacticCouncils.join(', ')}`);
  console.log(`  Navies: ${entities.navies.join(', ')}`);
  console.log(`  Armadas: ${entities.armadas.join(', ')}`);
  console.log(`  Fleets: ${entities.fleets.join(', ')}`);
  console.log(`  Squadrons: ${entities.squadrons.join(', ')}`);
  console.log(`  Megastructures: ${entities.megastructures.join(', ')}`);

  console.log('\n🔍 Querying entities from World...');
  const world = simulator.getWorld();

  // Query empires
  const empireQuery = world.query().with('empire').executeEntities();
  console.log(`  Found ${empireQuery.length} Empire entities`);
  for (const e of empireQuery) {
    const comp = e.getComponent('empire');
    if (comp && comp.type === 'empire') {
      const empireComp = comp as import('@ai-village/core').EmpireComponent;
      console.log(`    - ${empireComp.empireName || 'unnamed'} (${e.id})`);
    }
  }

  // Query federations
  const fedQuery = world.query().with('federation_governance').executeEntities();
  console.log(`  Found ${fedQuery.length} Federation entities`);
  for (const e of fedQuery) {
    const comp = e.getComponent('federation_governance');
    if (comp && comp.type === 'federation_governance') {
      const fedComp = comp as import('@ai-village/core').FederationGovernanceComponent;
      console.log(`    - ${fedComp.name || 'unnamed'} (${e.id})`);
    }
  }

  // Query galactic councils
  const councilQuery = world.query().with('galactic_council').executeEntities();
  console.log(`  Found ${councilQuery.length} Galactic Council entities`);
  for (const e of councilQuery) {
    const comp = e.getComponent('galactic_council');
    if (comp && comp.type === 'galactic_council') {
      const councilComp = comp as import('@ai-village/core').GalacticCouncilComponent;
      console.log(`    - ${councilComp.name || 'unnamed'} (${e.id})`);
    }
  }

  // Query navies
  const navyQuery = world.query().with('navy').executeEntities();
  console.log(`  Found ${navyQuery.length} Navy entities`);
  for (const e of navyQuery) {
    const comp = e.getComponent('navy');
    if (comp && comp.type === 'navy') {
      const navyComp = comp as import('@ai-village/core').NavyComponent;
      console.log(`    - ${navyComp.name || 'unnamed'} (${e.id})`);
    }
  }

  // Query megastructures
  const megaQuery = world.query().with('megastructure').executeEntities();
  console.log(`  Found ${megaQuery.length} Megastructure entities`);
  for (const e of megaQuery) {
    const comp = e.getComponent('megastructure');
    if (comp && comp.type === 'megastructure') {
      const megaComp = comp as import('@ai-village/core').MegastructureComponent;
      console.log(`    - ${megaComp.name || 'unnamed'} (${e.id})`);
    }
  }

  console.log('\n✅ Running 100 ticks...');
  simulator.start();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  simulator.pause();

  const runStats = simulator.getStats();
  console.log(`  Ticks run: ${runStats.ticksRun}`);
  console.log(`  Days elapsed: ${runStats.daysElapsed}`);
  console.log(`  TPS: ${runStats.ticksPerSecond.toFixed(1)}`);

  console.log('\n🎉 Grand Strategy test complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
