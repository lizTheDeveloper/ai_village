/**
 * Angel Playtest Script
 *
 * Simulates a player having a conversation with the angel
 * to test the Divine Chat feature.
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

async function main() {
  console.log('Starting angel playtest...\n');

  // Start the headless game
  const game = spawn('npx', ['tsx', 'demo/headless.ts', '--agents=3'], {
    cwd: '/Users/annhoward/src/ai_village/custom_game_engine',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let angelName = '';
  let conversationTurn = 0;

  // Conversation script - simulates a real player testing the angel
  const conversation = [
    { delay: 8000, message: 'hey there!' },
    { delay: 12000, message: 'what can you help me with?' },
    { delay: 12000, message: "what's happening in the village right now?" },
    { delay: 12000, message: 'can you pause the game for me?' },
    { delay: 10000, message: 'cool. can you spawn a new agent?' },
    { delay: 12000, message: 'are you a bot?' },
    { delay: 10000, message: 'resume the game' },
    { delay: 12000, message: "what's the weather like?" },
    { delay: 12000, message: 'can you make it rain?' },
    { delay: 12000, message: 'tell me about multiverse stuff' },
    { delay: 12000, message: 'what about time travel?' },
    { delay: 10000, message: 'status' },
    { delay: 12000, message: 'thanks for the help!' },
    { delay: 8000, message: 'quit' },
  ];

  // Collect all output
  const allOutput: string[] = [];

  game.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    allOutput.push(text);

    // Extract angel name
    if (text.includes('Spawned admin angel')) {
      const match = text.match(/Spawned admin angel '(\w+)'/);
      if (match) angelName = match[1];
    }

    // Look for angel messages
    if (text.includes('[Angel ')) {
      conversationTurn++;
    }
  });

  game.stderr.on('data', (data) => {
    const text = data.toString();
    // Filter out noise
    if (!text.includes('[dotenv]') && !text.includes('tip:')) {
      process.stderr.write(text);
      allOutput.push(text);
    }
  });

  // Wait for game to initialize
  await sleep(10000);

  // Send conversation messages
  for (const turn of conversation) {
    await sleep(turn.delay);
    console.log(`\n[Sending]: ${turn.message}`);
    game.stdin.write(turn.message + '\n');
  }

  // Wait for final responses
  await sleep(5000);

  // Generate report
  console.log('\n\n' + '='.repeat(80));
  console.log('PLAYTEST REPORT');
  console.log('='.repeat(80));

  const fullOutput = allOutput.join('');

  console.log('\n--- METRICS ---');
  console.log(`Conversation turns sent: ${conversation.length}`);
  console.log(`Angel name: ${angelName || 'unknown'}`);
  console.log(`Angel responses detected: ${conversationTurn}`);

  console.log('\n--- KEY OBSERVATIONS ---');

  // Check for greeting
  if (fullOutput.includes('hey') && fullOutput.includes('welcome')) {
    console.log('✓ Angel sent greeting message');
  } else {
    console.log('✗ No greeting detected');
  }

  // Check for command execution
  if (fullOutput.includes('[pause]') || fullOutput.includes('paused')) {
    console.log('✓ Angel understood pause command');
  } else {
    console.log('✗ Pause command not detected');
  }

  if (fullOutput.includes('[spawn') || fullOutput.includes('spawning')) {
    console.log('✓ Angel understood spawn command');
  } else {
    console.log('✗ Spawn command not detected');
  }

  // Check for personality
  if (fullOutput.toLowerCase().includes('ya lol') || fullOutput.toLowerCase().includes('yeah lol')) {
    console.log('✓ Angel acknowledged being a bot casually');
  } else {
    console.log('? Bot acknowledgment not detected');
  }

  // Check for errors
  const errorCount = (fullOutput.match(/\[AdminAngelSystem\] LLM call failed/g) || []).length;
  console.log(`\nLLM errors encountered: ${errorCount}`);

  console.log('\n--- END REPORT ---\n');

  game.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error('Playtest script error:', error);
  process.exit(1);
});
