import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
const errors = [];

page.on('console', msg => {
  const text = msg.text();
  logs.push(text);
  console.log(`[CONSOLE] ${text}`);
});

page.on('pageerror', err => {
  errors.push(err.message);
  console.error(`[ERROR] ${err.message}`);
});

console.log('Navigating to http://localhost:3000...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

console.log('\nWaiting 10 seconds to capture initialization logs...\n');
await page.waitForTimeout(10000);

console.log('\n=== SUMMARY ===');
console.log(`Total console logs: ${logs.length}`);
console.log(`Total errors: ${errors.length}`);

if (errors.length > 0) {
  console.log('\nERRORS:');
  errors.forEach(err => console.log(`  - ${err}`));
}

console.log('\nLast 20 console logs:');
logs.slice(-20).forEach(log => console.log(`  ${log}`));

await browser.close();
