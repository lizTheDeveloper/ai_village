import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const logs = [];
const soulLogs = [];

page.on('console', msg => {
  const text = msg.text();
  logs.push(text);

  // Track soul-related logs
  if (text.includes('soul') || text.includes('Soul') || text.includes('Fate') ||
      text.includes('ceremony') || text.includes('Creating soul')) {
    soulLogs.push(text);
    console.log(`[SOUL] ${text}`);
  }
});

page.on('pageerror', err => {
  console.error(`[PAGE ERROR] ${err.message}`);
});

console.log('Loading page...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

console.log('\n1. Waiting for universe config screen...');
await page.waitForSelector('.universe-config-screen', { timeout: 10000 });

console.log('2. Clicking "Next: Choose Your Story"...');
await page.click('button:has-text("Next: Choose Your Story")');

console.log('3. Waiting 2s for next screen...');
await page.waitForTimeout(2000);

console.log('4. Clicking "Next: Soul Ceremonies"...');
await page.click('button:has-text("Next")');

console.log('\n5. Waiting for soul creation to start (checking for events)...');
console.log('   This should NOT hang - we should see ceremony events!\n');

// Wait for first soul ceremony to start
let ceremonyStarted = false;
let ceremonyCompleted = false;

// Monitor for 15 seconds
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(500);

  // Check logs for ceremony events
  if (!ceremonyStarted && soulLogs.some(log => log.includes('ceremony started') || log.includes('Ceremony started'))) {
    ceremonyStarted = true;
    console.log('✅ CEREMONY STARTED! (This means the fix worked - game loop is running)');
  }

  if (!ceremonyCompleted && soulLogs.some(log => log.includes('Soul created') || log.includes('ceremony complete'))) {
    ceremonyCompleted = true;
    console.log('✅ CEREMONY COMPLETED! Soul 1 was created successfully!');
    break;
  }

  // Check for fate events
  const fateEvents = soulLogs.filter(log =>
    log.includes('weaver:') || log.includes('spinner:') || log.includes('cutter:')
  );
  if (fateEvents.length > 0 && i % 4 === 0) {
    console.log(`   Fates are speaking... (${fateEvents.length} messages so far)`);
  }
}

console.log('\n=== TEST RESULTS ===\n');

if (ceremonyStarted) {
  console.log('✅ SUCCESS: Ceremony started (game loop is running!)');
} else {
  console.log('❌ FAILURE: Ceremony never started (still hanging)');
}

if (ceremonyCompleted) {
  console.log('✅ SUCCESS: First soul created successfully!');
} else if (ceremonyStarted) {
  console.log('⏳ IN PROGRESS: Ceremony started but not completed yet (LLM might be slow)');
} else {
  console.log('❌ FAILURE: No soul creation (system still hanging)');
}

console.log('\n=== Soul-related logs ===');
soulLogs.forEach(log => console.log(log));

console.log('\n=== Waiting 5 more seconds to see if more souls get created ===');
await page.waitForTimeout(5000);

const finalSoulLogs = soulLogs.filter(log => log.includes('Soul created'));
console.log(`\nTotal souls created: ${finalSoulLogs.length}`);

await browser.close();
