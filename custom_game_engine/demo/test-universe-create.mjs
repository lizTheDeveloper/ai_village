import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];

page.on('console', msg => {
  const text = msg.text();
  logs.push({ time: Date.now(), text });
  console.log(`[CONSOLE] ${text}`);
});

page.on('pageerror', err => {
  console.error(`[ERROR] ${err.message}`);
});

console.log('Loading page...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

console.log('Waiting for universe creation screen...');
await page.waitForSelector('.universe-config-screen', { timeout: 10000 });

console.log('Universe creation screen found. Waiting 2s then clicking Create...');
await page.waitForTimeout(2000);

// Click the Create/Start button
const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
console.log('Clicking Create button...');
await createButton.click();

console.log('Waiting 30 seconds to see what happens...');
await page.waitForTimeout(30000);

console.log('\n=== LOGS FROM CLICKING CREATE ===');
const startTime = logs[logs.length - 1]?.time - 30000 || 0;
const recentLogs = logs.filter(l => l.time >= startTime);
recentLogs.forEach(l => console.log(l.text));

await browser.close();
