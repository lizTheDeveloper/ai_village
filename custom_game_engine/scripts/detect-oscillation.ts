#!/usr/bin/env npx ts-node
/**
 * Oscillation Detection Script
 *
 * Launches the game demo and monitors agent positions for oscillation.
 * Detects rapid oscillation patterns and logs detailed debug info.
 *
 * Usage:
 *   cd custom_game_engine
 *   npx tsx scripts/detect-oscillation.ts [options]
 *
 * Options:
 *   --start-server     Auto-start the demo server
 *   --duration=N       Monitor for N minutes (default: 5)
 *   --scenario=NAME    Scenario preset to use (default: cooperative-survival)
 *   --headless         Run browser in headless mode
 *
 * Examples:
 *   npm run detect-oscillation
 *   npm run detect-oscillation -- --duration=1 --headless
 *   npm run detect-oscillation -- --start-server --scenario=hostile-wilderness
 */

import { chromium, type Page, type Browser } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';

// Parse command line arguments
function parseArgs(): {
  startServer: boolean;
  durationMinutes: number;
  scenario: string;
  headless: boolean;
} {
  const args = process.argv.slice(2);
  return {
    startServer: args.includes('--start-server'),
    durationMinutes: parseFloat(args.find(a => a.startsWith('--duration='))?.split('=')[1] ?? '5'),
    scenario: args.find(a => a.startsWith('--scenario='))?.split('=')[1] ?? 'cooperative-survival',
    headless: args.includes('--headless'),
  };
}

const ARGS = parseArgs();

// Configuration
const CONFIG = {
  demoUrl: 'http://localhost:5173',
  monitorDurationMs: ARGS.durationMinutes * 60 * 1000,
  sampleIntervalMs: 100, // Sample positions every 100ms
  oscillationWindowMs: 2000, // Look for oscillation in 2-second windows
  minReversalsForOscillation: 6, // Need 6+ direction reversals in window to flag
  minMovementForOscillation: 0.5, // Must be moving at least this much total
  reportIntervalMs: 30000, // Report status every 30 seconds
  scenario: ARGS.scenario,
  headless: ARGS.headless,
};

interface PositionSample {
  tick: number;
  timestamp: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  behavior: string;
  behaviorState: Record<string, unknown>;
}

interface AgentTracker {
  id: string;
  name: string;
  samples: PositionSample[];
  oscillationEvents: OscillationEvent[];
}

interface OscillationEvent {
  timestamp: number;
  gameTick: number;
  duration: number;
  reversalCount: number;
  position: { x: number; y: number };
  behavior: string;
  behaviorState: Record<string, unknown>;
  samples: PositionSample[];
  efficiency: number;
}

// Agent tracking state
const agentTrackers = new Map<string, AgentTracker>();
let serverProcess: ChildProcess | null = null;
let detectedServerUrl: string | null = null;

/**
 * Injection script that runs in the browser to collect agent data
 */
const INJECTION_SCRIPT = `
window.__oscillationTracker = {
  getAgentData: function() {
    // Access the game world through the global game instance
    if (!window.game || !window.game.world) {
      return { error: 'Game not initialized', agents: [] };
    }

    const world = window.game.world;
    const agents = [];

    // Query all entities with agent component
    try {
      const agentEntities = world.query().with('agent').with('position').executeEntities();

      for (const entity of agentEntities) {
        const position = entity.getComponent('position');
        const agent = entity.getComponent('agent');
        const movement = entity.getComponent('movement');
        const velocity = entity.getComponent('velocity');

        if (position && agent) {
          agents.push({
            id: entity.id,
            name: agent.name || entity.id,
            x: position.x,
            y: position.y,
            vx: velocity?.vx ?? movement?.velocityX ?? 0,
            vy: velocity?.vy ?? movement?.velocityY ?? 0,
            behavior: agent.behavior,
            behaviorState: agent.behaviorState || {},
          });
        }
      }

      // Get current game tick
      const timeEntities = world.query().with('time').executeEntities();
      let tick = 0;
      if (timeEntities.length > 0) {
        const timeComp = timeEntities[0].getComponent('time');
        tick = timeComp?.tick ?? 0;
      }

      return { tick, agents };
    } catch (e) {
      return { error: e.message, agents: [] };
    }
  }
};
`;

/**
 * Analyze samples for oscillation patterns
 */
function analyzeForOscillation(
  samples: PositionSample[],
  windowMs: number
): { isOscillating: boolean; reversals: number; efficiency: number } {
  if (samples.length < 3) {
    return { isOscillating: false, reversals: 0, efficiency: 1 };
  }

  // Filter to samples within window
  const now = samples[samples.length - 1].timestamp;
  const windowSamples = samples.filter(s => now - s.timestamp <= windowMs);

  if (windowSamples.length < 3) {
    return { isOscillating: false, reversals: 0, efficiency: 1 };
  }

  // Count velocity direction reversals
  let reversals = 0;
  for (let i = 2; i < windowSamples.length; i++) {
    const prev = windowSamples[i - 1];
    const curr = windowSamples[i];

    // X direction reversal
    if (prev.vx !== 0 && curr.vx !== 0 && Math.sign(prev.vx) !== Math.sign(curr.vx)) {
      reversals++;
    }
    // Y direction reversal
    if (prev.vy !== 0 && curr.vy !== 0 && Math.sign(prev.vy) !== Math.sign(curr.vy)) {
      reversals++;
    }
  }

  // Calculate movement efficiency (net displacement / total distance)
  let totalDistance = 0;
  for (let i = 1; i < windowSamples.length; i++) {
    const dx = windowSamples[i].x - windowSamples[i - 1].x;
    const dy = windowSamples[i].y - windowSamples[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  const netDx = windowSamples[windowSamples.length - 1].x - windowSamples[0].x;
  const netDy = windowSamples[windowSamples.length - 1].y - windowSamples[0].y;
  const netDisplacement = Math.sqrt(netDx * netDx + netDy * netDy);

  const efficiency = totalDistance > 0.01 ? netDisplacement / totalDistance : 1;

  // Detect oscillation: high reversals + low efficiency + actually moving
  const isOscillating =
    reversals >= CONFIG.minReversalsForOscillation &&
    efficiency < 0.3 &&
    totalDistance >= CONFIG.minMovementForOscillation;

  return { isOscillating, reversals, efficiency };
}

/**
 * Sample agent positions from the browser
 */
async function sampleAgents(page: Page): Promise<void> {
  try {
    const data = await page.evaluate(() => {
      return (window as any).__oscillationTracker?.getAgentData() ?? { error: 'Tracker not found', agents: [] };
    });

    if (data.error) {
      // Game might not be fully loaded yet
      return;
    }

    const timestamp = Date.now();

    for (const agent of data.agents) {
      let tracker = agentTrackers.get(agent.id);
      if (!tracker) {
        tracker = {
          id: agent.id,
          name: agent.name,
          samples: [],
          oscillationEvents: [],
        };
        agentTrackers.set(agent.id, tracker);
      }

      const sample: PositionSample = {
        tick: data.tick,
        timestamp,
        x: agent.x,
        y: agent.y,
        vx: agent.vx,
        vy: agent.vy,
        behavior: agent.behavior,
        behaviorState: agent.behaviorState,
      };

      tracker.samples.push(sample);

      // Keep only last 30 seconds of samples to manage memory
      const cutoff = timestamp - 30000;
      tracker.samples = tracker.samples.filter(s => s.timestamp > cutoff);

      // Check for oscillation
      const analysis = analyzeForOscillation(tracker.samples, CONFIG.oscillationWindowMs);

      if (analysis.isOscillating) {
        // Check if we already logged this oscillation event recently
        const recentEvent = tracker.oscillationEvents.find(
          e => timestamp - e.timestamp < 5000
        );

        if (!recentEvent) {
          const event: OscillationEvent = {
            timestamp,
            gameTick: data.tick,
            duration: CONFIG.oscillationWindowMs,
            reversalCount: analysis.reversals,
            position: { x: agent.x, y: agent.y },
            behavior: agent.behavior,
            behaviorState: agent.behaviorState,
            samples: tracker.samples.slice(-20), // Last 20 samples for context
            efficiency: analysis.efficiency,
          };

          tracker.oscillationEvents.push(event);

          // Log immediately
          logOscillationEvent(tracker, event);
        }
      }
    }
  } catch (e) {
    // Page might be navigating or closing
  }
}

/**
 * Log an oscillation event with full debug info
 */
function logOscillationEvent(tracker: AgentTracker, event: OscillationEvent): void {
  console.log('\n' + '='.repeat(80));
  console.log('OSCILLATION DETECTED');
  console.log('='.repeat(80));
  console.log(`Agent: ${tracker.name} (${tracker.id})`);
  console.log(`Time: ${new Date(event.timestamp).toISOString()}`);
  console.log(`Game Tick: ${event.gameTick}`);
  console.log(`Position: (${event.position.x.toFixed(2)}, ${event.position.y.toFixed(2)})`);
  console.log(`Behavior: ${event.behavior}`);
  console.log(`Behavior State: ${JSON.stringify(event.behaviorState, null, 2)}`);
  console.log(`Reversals in window: ${event.reversalCount}`);
  console.log(`Movement efficiency: ${(event.efficiency * 100).toFixed(1)}%`);
  console.log('\nRecent position samples:');
  console.log('-'.repeat(80));
  console.log('  Tick  |    X    |    Y    |   VX   |   VY   | Behavior');
  console.log('-'.repeat(80));

  for (const sample of event.samples.slice(-10)) {
    console.log(
      `  ${String(sample.tick).padStart(5)} | ` +
      `${sample.x.toFixed(2).padStart(7)} | ` +
      `${sample.y.toFixed(2).padStart(7)} | ` +
      `${sample.vx.toFixed(2).padStart(6)} | ` +
      `${sample.vy.toFixed(2).padStart(6)} | ` +
      `${sample.behavior}`
    );
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Print periodic status report
 */
function printStatusReport(elapsedMs: number): void {
  const elapsedMin = (elapsedMs / 60000).toFixed(1);
  const remainingMin = ((CONFIG.monitorDurationMs - elapsedMs) / 60000).toFixed(1);

  console.log('\n--- Status Report ---');
  console.log(`Elapsed: ${elapsedMin} min | Remaining: ${remainingMin} min`);
  console.log(`Tracking ${agentTrackers.size} agents`);

  let totalEvents = 0;
  for (const tracker of agentTrackers.values()) {
    totalEvents += tracker.oscillationEvents.length;
  }
  console.log(`Total oscillation events detected: ${totalEvents}`);

  if (totalEvents > 0) {
    console.log('\nAgents with oscillation:');
    for (const tracker of agentTrackers.values()) {
      if (tracker.oscillationEvents.length > 0) {
        console.log(`  - ${tracker.name}: ${tracker.oscillationEvents.length} events`);
      }
    }
  }
  console.log('---------------------\n');
}

/**
 * Print final summary report
 */
function printFinalReport(): void {
  console.log('\n' + '='.repeat(80));
  console.log('FINAL OSCILLATION DETECTION REPORT');
  console.log('='.repeat(80));
  console.log(`Duration: ${(CONFIG.monitorDurationMs / 60000).toFixed(1)} minutes`);
  console.log(`Agents tracked: ${agentTrackers.size}`);

  let totalEvents = 0;
  const agentsWithOscillation: AgentTracker[] = [];

  for (const tracker of agentTrackers.values()) {
    totalEvents += tracker.oscillationEvents.length;
    if (tracker.oscillationEvents.length > 0) {
      agentsWithOscillation.push(tracker);
    }
  }

  console.log(`Total oscillation events: ${totalEvents}`);
  console.log('');

  if (agentsWithOscillation.length === 0) {
    console.log('No oscillation detected during monitoring period.');
  } else {
    console.log('Agents with oscillation issues:');
    console.log('-'.repeat(80));

    for (const tracker of agentsWithOscillation) {
      console.log(`\n${tracker.name} (${tracker.id}):`);
      console.log(`  Total events: ${tracker.oscillationEvents.length}`);

      // Group by behavior
      const byBehavior = new Map<string, number>();
      for (const event of tracker.oscillationEvents) {
        byBehavior.set(event.behavior, (byBehavior.get(event.behavior) || 0) + 1);
      }
      console.log('  By behavior:');
      for (const [behavior, count] of byBehavior) {
        console.log(`    - ${behavior}: ${count} events`);
      }

      // Show worst event (lowest efficiency)
      const worstEvent = tracker.oscillationEvents.reduce((worst, e) =>
        e.efficiency < worst.efficiency ? e : worst
      );
      console.log(`  Worst event:`);
      console.log(`    - Position: (${worstEvent.position.x.toFixed(2)}, ${worstEvent.position.y.toFixed(2)})`);
      console.log(`    - Behavior: ${worstEvent.behavior}`);
      console.log(`    - Efficiency: ${(worstEvent.efficiency * 100).toFixed(1)}%`);
      console.log(`    - Reversals: ${worstEvent.reversalCount}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Start the demo server if requested
 */
async function startDemoServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting demo server...');

    // Get the script directory to find demo folder
    const scriptDir = new URL('.', import.meta.url).pathname;
    const demoDir = scriptDir.replace('/scripts/', '/demo/');

    console.log(`Demo directory: ${demoDir}`);

    serverProcess = spawn('npx', ['vite'], {
      cwd: demoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;

    const checkOutput = (data: Buffer) => {
      const output = data.toString();
      console.log('[vite]', output.trim());

      // Extract the URL from vite output (e.g., "Local:   http://localhost:3002/")
      const urlMatch = output.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (urlMatch && !detectedServerUrl) {
        detectedServerUrl = urlMatch[1];
        console.log(`Detected server URL: ${detectedServerUrl}`);
      }

      // Vite shows "Local:" with the URL when ready
      if ((output.includes('Local:') || output.includes('localhost')) && !started) {
        started = true;
        console.log('Demo server started!');
        setTimeout(resolve, 2000); // Wait a bit for full init
      }
    };

    serverProcess.stdout?.on('data', checkOutput);
    serverProcess.stderr?.on('data', checkOutput);

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error('Demo server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Oscillation Detection Script');
  console.log('='.repeat(60));
  console.log(`Monitor duration: ${CONFIG.monitorDurationMs / 60000} minutes`);
  console.log(`Sample interval: ${CONFIG.sampleIntervalMs}ms`);
  console.log(`Scenario: ${CONFIG.scenario}`);
  console.log(`Headless: ${CONFIG.headless}`);
  console.log(`Start server: ${ARGS.startServer}`);
  console.log('');

  let browser: Browser | null = null;

  try {
    // Start server if requested
    if (ARGS.startServer) {
      await startDemoServer();
    }

    // Launch browser
    console.log(`Launching browser (headless: ${CONFIG.headless})...`);
    browser = await chromium.launch({
      headless: CONFIG.headless,
    });

    const page = await browser.newPage();

    // Navigate to demo (use detected URL if server was started, otherwise use config)
    const targetUrl = detectedServerUrl || CONFIG.demoUrl;
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Handle first-run settings panel - select scenario and click "Start Game"
    console.log('Checking for first-run settings panel...');
    try {
      // Wait a moment for the settings panel to potentially appear
      await page.waitForTimeout(1000);

      // Look for the scenario preset dropdown
      const scenarioSelect = page.locator('#settings-dm-preset');
      if (await scenarioSelect.isVisible({ timeout: 2000 })) {
        console.log('Found settings panel, selecting scenario...');

        // Select the configured scenario
        await scenarioSelect.selectOption(CONFIG.scenario);
        console.log(`Selected scenario: ${CONFIG.scenario}`);

        // Wait for the selection to register
        await page.waitForTimeout(200);

        // Click "Start Game" button
        const startButton = page.locator('button:has-text("Start Game")');
        if (await startButton.isVisible({ timeout: 1000 })) {
          await startButton.click();
          console.log('Clicked Start Game');
        }
      }
    } catch {
      // No settings panel or already configured - continue
      console.log('No first-run settings panel detected, continuing...');
    }

    // Wait for game to initialize
    console.log('Waiting for game to initialize...');
    await page.waitForFunction(
      () => (window as any).game?.world !== undefined,
      { timeout: 30000 }
    );

    // Inject tracking script
    console.log('Injecting tracking script...');
    await page.evaluate(INJECTION_SCRIPT);

    // Verify injection worked
    const testData = await page.evaluate(() => {
      return (window as any).__oscillationTracker?.getAgentData();
    });

    if (testData?.error) {
      console.error('Failed to access game data:', testData.error);
      return;
    }

    console.log(`Found ${testData?.agents?.length ?? 0} agents`);
    console.log('Starting monitoring...\n');

    // Start monitoring
    const startTime = Date.now();
    let lastReportTime = startTime;

    const sampleInterval = setInterval(() => sampleAgents(page), CONFIG.sampleIntervalMs);

    // Run until duration complete
    while (Date.now() - startTime < CONFIG.monitorDurationMs) {
      await new Promise(r => setTimeout(r, 1000));

      // Periodic status report
      if (Date.now() - lastReportTime >= CONFIG.reportIntervalMs) {
        printStatusReport(Date.now() - startTime);
        lastReportTime = Date.now();
      }
    }

    clearInterval(sampleInterval);

    // Print final report
    printFinalReport();

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch(console.error);
