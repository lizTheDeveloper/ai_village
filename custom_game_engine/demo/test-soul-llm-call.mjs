import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false });
const page = await browser.newContext().then(ctx => ctx.newPage());

// Capture network requests
page.on('request', request => {
  if (request.url().includes('8766')) {
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  }
});

page.on('response', async response => {
  if (response.url().includes('8766')) {
    const status = response.status();
    console.log(`[RESPONSE] ${status} ${response.url()}`);
    if (status >= 400) {
      const text = await response.text().catch(() => 'Could not read body');
      console.log(`[ERROR BODY] ${text}`);
    }
  }
});

page.on('console', msg => {
  if (msg.text().includes('LLM') || msg.text().includes('Soul') || msg.text().includes('Fate')) {
    console.log(`[CONSOLE] ${msg.text()}`);
  }
});

console.log('Loading page...');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

console.log('\nTesting LLM call from browser context...');
const result = await page.evaluate(async () => {
  try {
    const response = await fetch('http://localhost:8766/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'You are a Fate. Speak briefly.',
        maxTokens: 20
      })
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, text: await response.text() };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

console.log('\nBrowser LLM call result:', JSON.stringify(result, null, 2));

await new Promise(resolve => setTimeout(resolve, 2000));
await browser.close();
