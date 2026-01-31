/**
 * Test script for Angel features
 * Runs headless game and automatically sends test messages
 *
 * RESULTS FROM AUTOMATED TEST RUN:
 * ================================
 *
 * ✅ FEATURE 1: Typing Indicators
 * - System emits typing_indicator events (verified in code)
 * - Not visible in headless console (no listener configured)
 * - Would show as "Angel is typing..." in full UI
 *
 * ✅ FEATURE 2: Emergent Narrative System
 * - Angel successfully responds to "any mysteries?" query
 * - Response: "nothing weird yet, but i'll keep an eye out 👀"
 * - Pattern tracking active (mysteryLevel calculations verified in code)
 * - Will track repetitive behaviors, agent conflicts, unusual events
 *
 * ✅ FEATURE 3: Angel Goal System
 * - Angel successfully reports personal goal: "boost village harmony"
 * - Successfully reports divine power: "100/100 divine power 🌟"
 * - Goals grant divine power rewards (10-30 points verified in code)
 * - One error: "Unknown command: set_personal_goal" (LLM tried to use unavailable command)
 *
 * 🎮 OVERALL GAMEPLAY EXPERIENCE:
 * - Angel responded naturally to all queries
 * - Personality intact (casual, helpful, uses emojis)
 * - Aware of village state (mentioned specific agents by name)
 * - Context-aware (referenced current day/time, agent activities)
 *
 * 🐛 ISSUES FOUND:
 * 1. LLM tried to call "set_personal_goal" command which doesn't exist
 * 2. Tool calling fallback triggered (400 error from Groq)
 * 3. PixelLab sprite generation failures (401 - invalid API token)
 *
 * 📊 CONVERSATION FLOW:
 * Player: "hey what's up"
 *   Angel: "just checking on lark, all good"
 *   System: "Getting info on Lark" (command executed)
 *
 * Player: "what's happening in the village?"
 *   Angel: "lark's out gathering resources, brook's building a storage chest.
 *          it's day 1 morning, three agents around. village harmony goal on my mind."
 *
 * Player: "any mysteries?"
 *   Angel: "nothing weird yet, but i'll keep an eye out 👀"
 *
 * Player: "what are your goals?"
 *   Angel: "my goal is to boost village harmony 🌱"
 *   System Error: "Unknown command: set_personal_goal"
 *
 * Player: "how much divine power do you have?"
 *   Angel: "i've got 100/100 divine power 🌟"
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const TEST_MESSAGES = [
  { delay: 15000, message: "hey what's up", description: "Casual greeting" },
  { delay: 8000, message: "what's happening in the village?", description: "Narrative query" },
  { delay: 8000, message: "any mysteries?", description: "Pattern/story threads" },
  { delay: 8000, message: "what are your goals?", description: "Angel's personal goals" },
  { delay: 8000, message: "how much divine power do you have?", description: "Power status" },
  { delay: 5000, message: "quit", description: "Exit" },
];

async function main() {
  console.log('='.repeat(60));
  console.log('ANGEL FEATURES TEST');
  console.log('='.repeat(60));
  console.log('Testing:');
  console.log('  1. Typing indicators');
  console.log('  2. Emergent narrative system');
  console.log('  3. Angel goal system');
  console.log('='.repeat(60));
  console.log('');

  // Start headless game
  const headless = spawn('npx', ['tsx', 'demo/headless.ts', '--agents=3'], {
    cwd: '/Users/annhoward/src/ai_village/custom_game_engine',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let gameReady = false;
  let testStarted = false;

  // Capture output
  headless.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Detect when game is ready
    if (output.includes('Divine Chat ready')) {
      gameReady = true;
      console.log('\n✓ Game initialized, starting tests in 15 seconds...\n');
    }
  });

  headless.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  headless.on('exit', (code) => {
    console.log(`\n[Test] Headless game exited with code ${code}`);
    process.exit(code || 0);
  });

  // Wait for game to be ready, then send test messages
  const interval = setInterval(async () => {
    if (gameReady && !testStarted) {
      testStarted = true;
      clearInterval(interval);

      console.log('\n' + '='.repeat(60));
      console.log('STARTING AUTOMATED TESTS');
      console.log('='.repeat(60) + '\n');

      // Send test messages with delays
      for (const test of TEST_MESSAGES) {
        await sleep(test.delay);
        console.log(`\n[Test] Sending: "${test.message}" (${test.description})`);
        console.log('-'.repeat(60));
        headless.stdin.write(test.message + '\n');
      }
    }
  }, 1000);

  // Timeout after 2 minutes
  setTimeout(() => {
    console.log('\n[Test] Timeout - stopping test');
    headless.kill();
    process.exit(1);
  }, 120000);
}

main().catch((error) => {
  console.error('[Test] Fatal error:', error);
  process.exit(1);
});
