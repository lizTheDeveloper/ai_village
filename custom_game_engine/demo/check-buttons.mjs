import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForSelector('.universe-config-screen', { timeout: 10000 });

// Get all button texts
const buttons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
console.log('All buttons found:');
buttons.forEach((text, i) => console.log(`  ${i+1}. "${text}"`));

// Take screenshot
await page.screenshot({ path: '/tmp/universe-screen.png' });
console.log('\nScreenshot saved to /tmp/universe-screen.png');

await browser.close();
