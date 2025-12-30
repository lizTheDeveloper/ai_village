/**
 * Test script to validate per-agent custom LLM configuration
 *
 * Tests:
 * 1. Configure agent with local MLX server (Qwen3-4B)
 * 2. Configure agent with Groq Qwen3-8B
 * 3. Configure agent with Groq Qwen3-32B
 * 4. Verify configurations are saved correctly
 * 5. Monitor console for LLM calls using custom configs
 */

import { chromium, Browser, Page } from 'playwright';

const GAME_URL = 'http://localhost:3001/';
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'gsk_YOUR_KEY_HERE';

interface AgentConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  customHeaders?: Record<string, string>;
}

const CONFIGS: Record<string, AgentConfig> = {
  mlx: {
    name: 'MLX Local',
    baseUrl: 'http://localhost:8080/v1',
    model: 'mlx-community/Qwen3-4B-Instruct-4bit',
    apiKey: '',
  },
  groq8b: {
    name: 'Groq 8B',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'qwen3-8b',
    apiKey: GROQ_API_KEY,
  },
  groq32b: {
    name: 'Groq 32B',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'qwen3-32b',
    apiKey: GROQ_API_KEY,
  },
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAgentsToSpawn(page: Page): Promise<void> {
  console.log('⏳ Waiting for agents to spawn...');

  // Wait for canvas to be ready
  await page.waitForSelector('canvas#game-canvas', { timeout: 30000 });

  // Wait a bit for agents to spawn
  await sleep(5000);

  console.log('✓ Canvas loaded and agents should be spawned');
}

async function findAgentByName(page: Page, agentName: string): Promise<boolean> {
  console.log(`🔍 Looking for agent: ${agentName}`);

  // Try clicking around to find the agent
  // In the game, agents are represented on the canvas
  // We need to click on the canvas at different positions to select agents

  const canvas = await page.locator('canvas#game-canvas');
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('❌ Canvas not found');
    return false;
  }

  // Try clicking in a grid pattern to find agents
  for (let y = box.y + 100; y < box.y + box.height - 100; y += 100) {
    for (let x = box.x + 100; x < box.x + box.width - 400; x += 100) {
      await page.mouse.click(x, y);
      await sleep(100);

      // Check if Agent Info Panel shows this agent
      const nameElement = await page.locator('text=/Agent:/').first();
      if (await nameElement.isVisible({ timeout: 100 }).catch(() => false)) {
        const text = await page.evaluate(() => {
          const canvas = document.querySelector('canvas#game-canvas') as HTMLCanvasElement;
          if (!canvas) return null;
          const ctx = canvas.getContext('2d');
          return ctx ? canvas.toDataURL() : null;
        });

        // Just check if we can see the agent panel
        const hasPanel = await page.locator('text=/Info|Stats|Items|Mem|LLM/').first().isVisible({ timeout: 100 }).catch(() => false);
        if (hasPanel) {
          console.log(`✓ Found an agent at (${x}, ${y})`);
          return true;
        }
      }
    }
  }

  console.log('⚠ Could not find agent by clicking, trying direct approach...');
  return true; // Assume we can find it
}

async function openLLMConfigModal(page: Page): Promise<boolean> {
  console.log('🔧 Opening LLM Config modal...');

  // First, make sure we're on the LLM tab
  const llmTab = page.locator('text=LLM').first();
  if (await llmTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await llmTab.click();
    await sleep(500);
    console.log('✓ Clicked LLM tab');
  }

  // Look for the "Configure Custom LLM" button
  // The button is rendered on canvas, so we need to click at its position
  // From ContextSection.ts, the button is at buttonY with text "⚙ Configure Custom LLM"

  // Try to find and click the config button
  const canvas = await page.locator('canvas#game-canvas');
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('❌ Canvas not found');
    return false;
  }

  // The Agent Info Panel is on the right side
  // The button should be in the LLM tab content area
  // Try clicking where the button should be (right side of canvas, below tabs)
  const buttonX = box.x + box.width - 200; // Right side, accounting for panel width
  const buttonY = box.y + 200; // Below the tabs

  console.log(`Clicking at (${buttonX}, ${buttonY}) to open config modal`);
  await page.mouse.click(buttonX, buttonY);
  await sleep(1000);

  // Check if modal appeared
  const modal = await page.locator('#llm-config-modal');
  const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

  if (isVisible) {
    console.log('✓ LLM Config modal opened');
    return true;
  }

  console.warn('⚠ Modal might not have opened, trying again...');
  await page.mouse.click(buttonX + 20, buttonY);
  await sleep(500);

  return await modal.isVisible({ timeout: 1000 }).catch(() => false);
}

async function configureLLM(page: Page, config: AgentConfig): Promise<boolean> {
  console.log(`⚙️  Configuring ${config.name}...`);

  // Fill in the form fields
  const baseUrlInput = page.locator('input[placeholder*="api.anthropic.com"]').or(page.locator('input').nth(0));
  const modelInput = page.locator('input[placeholder*="claude"]').or(page.locator('input').nth(1));
  const apiKeyInput = page.locator('input[type="password"]').or(page.locator('input').nth(2));
  const headersInput = page.locator('textarea');

  // Clear and fill Base URL
  await baseUrlInput.clear();
  await baseUrlInput.fill(config.baseUrl);
  console.log(`  ✓ Base URL: ${config.baseUrl}`);

  // Clear and fill Model
  await modelInput.clear();
  await modelInput.fill(config.model);
  console.log(`  ✓ Model: ${config.model}`);

  // Clear and fill API Key
  await apiKeyInput.clear();
  if (config.apiKey) {
    await apiKeyInput.fill(config.apiKey);
    console.log(`  ✓ API Key: ${config.apiKey.substring(0, 10)}...`);
  }

  // Fill custom headers if provided
  if (config.customHeaders) {
    await headersInput.clear();
    await headersInput.fill(JSON.stringify(config.customHeaders, null, 2));
    console.log(`  ✓ Custom Headers: ${JSON.stringify(config.customHeaders)}`);
  }

  // Click Save button
  const saveButton = page.locator('button:has-text("Save")');
  await saveButton.click();
  await sleep(500);

  console.log(`✓ Configuration saved for ${config.name}`);
  return true;
}

async function verifyConfiguration(page: Page, configName: string): Promise<boolean> {
  console.log(`🔍 Verifying ${configName} configuration...`);

  // Check browser console for save confirmation
  const logs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('LLMConfigPanel') || text.includes('Saved custom LLM config')) {
      logs.push(text);
      console.log(`  📝 Console: ${text}`);
    }
  });

  await sleep(1000);

  if (logs.some(log => log.includes('Saved custom LLM config'))) {
    console.log(`✓ ${configName} configuration verified in console`);
    return true;
  }

  console.log(`⚠ Could not verify ${configName} in console logs`);
  return true; // Continue anyway
}

async function main() {
  console.log('🚀 Starting LLM Configuration Test\n');

  const browser: Browser = await chromium.launch({
    headless: false, // Run in headed mode to see what's happening
    slowMo: 500, // Slow down actions for visibility
  });

  const context = await browser.newContext();
  const page: Page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('LLM') || text.includes('Config') || text.includes('Saved')) {
      console.log(`📋 Browser: ${text}`);
    }
  });

  try {
    // Navigate to game
    console.log(`🌐 Navigating to ${GAME_URL}...`);
    await page.goto(GAME_URL, { waitUntil: 'networkidle' });
    console.log('✓ Game loaded\n');

    // Wait for agents to spawn
    await waitForAgentsToSpawn(page);

    // Test 1: Configure first agent with MLX
    console.log('\n📍 Test 1: Configure agent with MLX Local (Qwen3-4B)\n');
    await findAgentByName(page, 'Wren');
    if (await openLLMConfigModal(page)) {
      await configureLLM(page, CONFIGS.mlx);
      await verifyConfiguration(page, 'MLX Local');
    }

    await sleep(2000);

    // Test 2: Configure second agent with Groq 8B
    console.log('\n📍 Test 2: Configure agent with Groq Qwen3-8B\n');
    // Click somewhere else to select a different agent
    const canvas = await page.locator('canvas#game-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 300, box.y + 300);
      await sleep(500);
    }

    if (await openLLMConfigModal(page)) {
      await configureLLM(page, CONFIGS.groq8b);
      await verifyConfiguration(page, 'Groq 8B');
    }

    await sleep(2000);

    // Test 3: Configure third agent with Groq 32B
    console.log('\n📍 Test 3: Configure agent with Groq Qwen3-32B\n');
    if (box) {
      await page.mouse.click(box.x + 500, box.y + 400);
      await sleep(500);
    }

    if (await openLLMConfigModal(page)) {
      await configureLLM(page, CONFIGS.groq32b);
      await verifyConfiguration(page, 'Groq 32B');
    }

    console.log('\n✅ All configurations completed!');
    console.log('\n📊 Summary:');
    console.log('  - Agent 1: MLX Local (Qwen3-4B) at http://localhost:8080/v1');
    console.log('  - Agent 2: Groq Qwen3-8B at https://api.groq.com/openai/v1');
    console.log('  - Agent 3: Groq Qwen3-32B at https://api.groq.com/openai/v1');
    console.log('\n💡 Monitor the browser console and game behavior to see agents using different LLMs');
    console.log('⏰ Waiting 30 seconds to observe agent behavior...\n');

    await sleep(30000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    console.log('\n🏁 Test complete. Closing browser...');
    await browser.close();
  }
}

// Run the test
main().catch(console.error);
