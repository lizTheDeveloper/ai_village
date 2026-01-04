import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  logs.push(text);
  // Only print soul-related logs to reduce noise
  if (text.includes('Soul') || text.includes('soul') || text.includes('Fate') ||
      text.includes('ceremony') || text.includes('Demo') || text.includes('Creating')) {
    console.log(`[CONSOLE] ${text}`);
  }
});

page.on('pageerror', err => {
  console.error(`[PAGE ERROR] ${err.message}`);
});

console.log('Loading page...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

console.log('\nWaiting for universe config screen...');
await page.waitForSelector('.universe-config-screen', { timeout: 10000 });

console.log('Clicking "Next: Choose Your Story"...');
await page.click('button:has-text("Next: Choose Your Story")');

console.log('Waiting 2s for next screen...');
await page.waitForTimeout(2000);

console.log('Looking for next button...');
const nextButtons = await page.$$('button');
for (const btn of nextButtons) {
  const text = await btn.textContent();
  console.log(`Found button: "${text}"`);
}

console.log('\nClicking second Next button...');
await page.click('button:has-text("Next")');

console.log('\n=== Waiting for soul creation (60 seconds) ===\n');
await page.waitForTimeout(60000);

console.log('\n=== Soul-related logs from the last 60 seconds ===');
const recentLogs = logs.slice(-50);
recentLogs.forEach(log => {
  if (log.includes('soul') || log.includes('Soul') || log.includes('Creating') || log.includes('ceremony')) {
    console.log(log);
  }
});

await browser.close();
