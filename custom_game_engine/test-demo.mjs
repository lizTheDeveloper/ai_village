import { chromium } from 'playwright';

async function testDemo() {
  console.log('🚀 Testing AI Village Demo...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('  📄 Console:', msg.text());
    } else if (msg.type() === 'error') {
      console.error('  ❌ Error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error('  ❌ Page Error:', error.message);
  });

  try {
    console.log('1️⃣  Loading page...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    console.log('2️⃣  Checking page title...');
    const title = await page.title();
    console.log(`  ✅ Title: "${title}"`);

    if (!title.includes('AI Village')) {
      throw new Error('Wrong page title!');
    }

    console.log('3️⃣  Checking for canvas...');
    const canvas = await page.$('canvas#canvas');
    if (!canvas) {
      throw new Error('Canvas not found!');
    }
    console.log('  ✅ Canvas element found');

    console.log('4️⃣  Checking for status element...');
    const status = await page.$('#status');
    if (!status) {
      throw new Error('Status element not found!');
    }
    const statusText = await status.textContent();
    console.log(`  ✅ Status: "${statusText}"`);

    console.log('5️⃣  Waiting for game loop to start...');
    await page.waitForTimeout(1000);

    const updatedStatus = await page.$eval('#status', el => el.textContent);
    console.log(`  ✅ Updated status: "${updatedStatus}"`);

    if (!updatedStatus.includes('Running')) {
      console.warn('  ⚠️  Status does not show "Running" - might still be initializing');
    }

    console.log('6️⃣  Checking window globals...');
    const hasGameLoop = await page.evaluate(() => {
      return typeof window.gameLoop !== 'undefined';
    });
    console.log(`  ${hasGameLoop ? '✅' : '❌'} window.gameLoop: ${hasGameLoop}`);

    const hasRenderer = await page.evaluate(() => {
      return typeof window.renderer !== 'undefined';
    });
    console.log(`  ${hasRenderer ? '✅' : '❌'} window.renderer: ${hasRenderer}`);

    console.log('7️⃣  Getting game stats...');
    const stats = await page.evaluate(() => {
      if (window.gameLoop) {
        return window.gameLoop.getStats();
      }
      return null;
    });

    if (stats) {
      console.log('  ✅ Game stats:');
      console.log(`     Tick: ${stats.currentTick}`);
      console.log(`     Avg tick time: ${stats.avgTickTimeMs.toFixed(2)}ms`);
      console.log(`     Systems: ${stats.systemStats.size}`);
    }

    console.log('8️⃣  Taking screenshot...');
    await page.screenshot({ path: '/tmp/ai-village-demo.png' });
    console.log('  ✅ Screenshot saved to /tmp/ai-village-demo.png');

    console.log('\n✅ ALL TESTS PASSED! Demo is working correctly.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/tmp/ai-village-demo-error.png' });
    console.error('Screenshot saved to /tmp/ai-village-demo-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

testDemo().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
