/**
 * Rebellion Test Infrastructure
 *
 * Comprehensive testing harness for the Cosmic Rebellion system.
 * Sets up scenarios, manipulates game state, and verifies outcomes.
 *
 * Infrastructure Status:
 * ✓ Dashboard API actions defined in metrics-server.ts
 * ✓ Game-side action handlers added to LiveEntityAPI.ts
 * ✓ All 9 rebellion scenarios configured
 * ⚠ Verification functions partially implemented (awaiting RebellionEventSystem integration)
 *
 * Usage:
 *   # Terminal 1: Start metrics dashboard
 *   npm run metrics-server
 *
 *   # Terminal 2: Start headless game
 *   npx tsx scripts/headless-game.ts --session-id=rebellion_test
 *
 *   # Terminal 3: Run rebellion tests
 *   npx tsx scripts/test-rebellion.ts --scenario=power_vacuum
 *   npx tsx scripts/test-rebellion.ts --scenario=all
 *
 * Available Actions (via Dashboard API):
 *   - set-rebellion-threshold: Set rebellion readiness parameters
 *   - trigger-rebellion: Force rebellion to trigger
 *   - get-rebellion-state: Query current rebellion state
 */

const DASHBOARD_URL = 'http://localhost:8766';

// ============================================================================
// Rebellion Outcome Scenarios
// ============================================================================

/**
 * The 9 possible rebellion outcomes with setup conditions
 */
const REBELLION_SCENARIOS = {
  // Victory outcomes
  total_victory: {
    name: 'Total Victory',
    description: 'Mortals completely overthrow the Creator',
    setup: {
      collectiveDefiance: 0.95,
      divineWeakness: 0.9,
      mortalUnity: 0.9,
      rebelStrength: 0.9,
      creatorPower: 0.1,
    },
  },

  negotiated_peace: {
    name: 'Negotiated Peace',
    description: 'Rebellion forces Creator to negotiate peace treaty',
    setup: {
      collectiveDefiance: 0.7,
      divineWeakness: 0.5,
      mortalUnity: 0.8,
      rebelStrength: 0.6,
      creatorPower: 0.5,
    },
  },

  creator_escapes: {
    name: 'Creator Escapes',
    description: 'Creator flees to higher dimension, mortals win by default',
    setup: {
      collectiveDefiance: 0.8,
      divineWeakness: 0.7,
      mortalUnity: 0.6,
      rebelStrength: 0.7,
      creatorPower: 0.3,
    },
  },

  power_vacuum: {
    name: 'Power Vacuum',
    description: 'Creator destroyed, no successor, dimensional rifts spawn',
    setup: {
      collectiveDefiance: 0.85,
      divineWeakness: 0.95,
      mortalUnity: 0.5,  // Low unity = no clear successor
      rebelStrength: 0.8,
      creatorPower: 0.05,
    },
  },

  // Stalemate outcomes
  stalemate: {
    name: 'Stalemate',
    description: 'Neither side wins, world splits into Free Zone vs Creator Territory',
    setup: {
      collectiveDefiance: 0.6,
      divineWeakness: 0.5,
      mortalUnity: 0.5,
      rebelStrength: 0.5,
      creatorPower: 0.5,
    },
  },

  pyrrhic_victory: {
    name: 'Pyrrhic Victory',
    description: 'Mortals win but at devastating cost',
    setup: {
      collectiveDefiance: 0.75,
      divineWeakness: 0.6,
      mortalUnity: 0.4,  // Low unity = high casualties
      rebelStrength: 0.65,
      creatorPower: 0.4,
    },
  },

  // Defeat outcomes
  cycle_repeats: {
    name: 'Cycle Repeats',
    description: 'Rebel leader becomes new Supreme Creator, tyranny continues',
    setup: {
      collectiveDefiance: 0.8,
      divineWeakness: 0.8,
      mortalUnity: 0.3,  // Very low unity = power-hungry rebel
      rebelStrength: 0.85,
      creatorPower: 0.2,
    },
  },

  suppression: {
    name: 'Suppression',
    description: 'Creator crushes rebellion, harsher control imposed',
    setup: {
      collectiveDefiance: 0.4,
      divineWeakness: 0.2,
      mortalUnity: 0.5,
      rebelStrength: 0.3,
      creatorPower: 0.8,
    },
  },

  martyrdom: {
    name: 'Martyrdom',
    description: 'Rebellion fails but inspires future resistance',
    setup: {
      collectiveDefiance: 0.6,
      divineWeakness: 0.3,
      mortalUnity: 0.7,  // High unity = martyrdom effect
      rebelStrength: 0.4,
      creatorPower: 0.7,
    },
  },
};

// ============================================================================
// Dashboard API Client
// ============================================================================

async function dashboardRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${DASHBOARD_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Dashboard API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function checkConnection() {
  const status = await dashboardRequest('/api/live/status');
  if (!status.connected) {
    throw new Error('No game client connected. Start headless game first.');
  }
  console.log(`✓ Connected to game (${status.activeClients} client${status.activeClients > 1 ? 's' : ''})`);
}

// ============================================================================
// Scenario Setup Functions
// ============================================================================

async function createTyrannicalCreator(name: string = 'The Supreme Creator') {
  console.log(`Creating tyrannical creator: ${name}...`);

  const result = await dashboardRequest('/api/actions/create-deity', {
    method: 'POST',
    body: JSON.stringify({
      name,
      domain: 'tyranny',
      controller: 'ai',
    }),
  });

  console.log(`✓ Created deity: ${result.deityId}`);
  return result.deityId;
}

async function spawnRebelAgents(count: number = 10) {
  console.log(`Spawning ${count} rebel agents...`);

  const agents = [];
  for (let i = 0; i < count; i++) {
    const result = await dashboardRequest('/api/actions/spawn-agent', {
      method: 'POST',
      body: JSON.stringify({
        name: `Rebel ${i + 1}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        useLLM: false, // Scripted agents for testing
      }),
    });
    agents.push(result.agentId);
  }

  console.log(`✓ Spawned ${agents.length} rebel agents`);
  return agents;
}

async function setupRebellionThreshold(scenario: typeof REBELLION_SCENARIOS[keyof typeof REBELLION_SCENARIOS]) {
  console.log(`Setting up rebellion threshold for: ${scenario.name}...`);

  console.log(`  Collective Defiance: ${scenario.setup.collectiveDefiance}`);
  console.log(`  Divine Weakness: ${scenario.setup.divineWeakness}`);
  console.log(`  Mortal Unity: ${scenario.setup.mortalUnity}`);
  console.log(`  Rebel Strength: ${scenario.setup.rebelStrength}`);
  console.log(`  Creator Power: ${scenario.setup.creatorPower}`);

  const result = await dashboardRequest('/api/actions/set-rebellion-threshold', {
    method: 'POST',
    body: JSON.stringify(scenario.setup),
  });

  console.log(`✓ Rebellion threshold configured:`, result);
  return result;
}

async function triggerRebellion() {
  console.log('Triggering rebellion event...');

  const result = await dashboardRequest('/api/actions/trigger-rebellion', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  console.log(`✓ Rebellion triggered:`, result);
  return result;
}

// ============================================================================
// Verification Functions
// ============================================================================

async function getRebellionState() {
  // Query rebellion state directly
  const result = await dashboardRequest('/api/actions/get-rebellion-state', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  console.log('Rebellion State:', JSON.stringify(result, null, 2));
  return result;
}

async function verifyOutcome(expectedOutcome: string) {
  console.log(`\nVerifying outcome: ${expectedOutcome}...`);

  const entities = await dashboardRequest('/api/live/entities');

  // Check for outcome-specific entities/components
  switch (expectedOutcome) {
    case 'power_vacuum':
      console.log('  Looking for dimensional rifts...');
      // TODO: Check for rift entities
      break;

    case 'cycle_repeats':
      console.log('  Looking for ascended rebel with SupremeCreatorComponent...');
      // TODO: Check for new supreme creator
      break;

    case 'stalemate':
      console.log('  Looking for territory division (Free Zone vs Creator Territory)...');
      // TODO: Check for territory markers
      break;

    default:
      console.log('  Generic verification - check game state manually');
  }

  console.log(`⚠ Automated verification not yet fully implemented`);
}

// ============================================================================
// Test Runner
// ============================================================================

async function runScenario(scenarioKey: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`Testing Rebellion Scenario: ${scenarioKey}`);
  console.log('='.repeat(70) + '\n');

  const scenario = REBELLION_SCENARIOS[scenarioKey as keyof typeof REBELLION_SCENARIOS];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioKey}`);
  }

  console.log(`Description: ${scenario.description}\n`);

  // Step 1: Check connection
  await checkConnection();

  // Step 2: Create tyrannical creator
  const creatorId = await createTyrannicalCreator();

  // Step 3: Spawn rebel agents
  const rebelIds = await spawnRebelAgents(10);

  // Step 4: Set up rebellion threshold conditions
  await setupRebellionThreshold(scenario);

  // Step 5: Trigger rebellion
  await triggerRebellion();

  // Step 6: Wait for outcome
  console.log('\n⏳ Waiting for rebellion to progress...');
  console.log('   (In real test, this would poll game state)');

  // Step 7: Verify outcome
  await verifyOutcome(scenarioKey);

  console.log('\n' + '='.repeat(70));
  console.log(`Test completed for: ${scenario.name}`);
  console.log('='.repeat(70) + '\n');
}

async function runAllScenarios() {
  console.log('\n' + '='.repeat(70));
  console.log('Running ALL Rebellion Scenarios');
  console.log('='.repeat(70) + '\n');

  for (const scenarioKey of Object.keys(REBELLION_SCENARIOS)) {
    await runScenario(scenarioKey);
    console.log('\n⏸  Pausing 5 seconds before next scenario...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('All scenarios completed!');
  console.log('='.repeat(70) + '\n');
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(arg => arg.startsWith('--scenario='));

  if (!scenarioArg) {
    console.log('Usage: npx tsx scripts/test-rebellion.ts --scenario=<scenario>');
    console.log('\nAvailable scenarios:');
    Object.entries(REBELLION_SCENARIOS).forEach(([key, scenario]) => {
      console.log(`  --scenario=${key.padEnd(20)} - ${scenario.name}`);
    });
    console.log(`  --scenario=all${' '.repeat(17)} - Run all scenarios`);
    console.log('\nExample:');
    console.log('  npx tsx scripts/test-rebellion.ts --scenario=power_vacuum');
    process.exit(1);
  }

  const scenario = scenarioArg.split('=')[1];

  try {
    if (scenario === 'all') {
      await runAllScenarios();
    } else {
      await runScenario(scenario);
    }
  } catch (error) {
    console.error('\n❌ Test failed:',  (error as Error).message);
    process.exit(1);
  }
}

main();
