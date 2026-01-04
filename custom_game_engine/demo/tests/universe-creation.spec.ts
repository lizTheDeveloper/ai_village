import { test, expect } from '@playwright/test';

/**
 * Integration tests for universe creation flow
 *
 * These tests ensure that:
 * 1. Universe creation screen appears for new users
 * 2. Users can create a new universe with preset scenarios
 * 3. Souls are created successfully
 * 4. The game initializes and starts running
 */

test.describe('Universe Creation Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all storage to simulate first-run experience
    await context.clearCookies();
    await context.clearPermissions();
  });

  test('should show universe creation screen on first run', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    // Navigate to game
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for main() to be called
    await page.waitForFunction(() => {
      return window.console.log.toString().includes('[DEMO] main() called');
    }, { timeout: 5000 });

    // Check that initialization logs appear
    expect(consoleLogs.some(log => log.includes('[DEMO] main() called, initializing...'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('[DEMO] Canvas found, creating game loop...'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('[DEMO] First run check: true'))).toBeTruthy();

    // Universe creation screen should be visible
    const universeConfigScreen = page.locator('.universe-config-screen, [class*="UniverseConfig"]');
    await expect(universeConfigScreen).toBeVisible({ timeout: 10000 });
  });

  test('should create universe with "Pioneers" preset', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for universe creation screen
    const universeConfigScreen = page.locator('.universe-config-screen, [class*="UniverseConfig"]');
    await expect(universeConfigScreen).toBeVisible({ timeout: 10000 });

    // Select "Pioneers" preset (or first available preset)
    const pioneersButton = page.locator('button:has-text("Pioneers"), button:has-text("pioneers")').first();
    await pioneersButton.click();

    // Click "Create Universe" or "Start" button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
    await createButton.click();

    // Wait for universe creation to complete
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('*')).some(el =>
        el.textContent?.includes('Creating souls') ||
        el.textContent?.includes('Initializing')
      );
    }, { timeout: 15000 });

    // Check console logs for universe creation
    await page.waitForTimeout(2000); // Give time for logs to appear

    expect(consoleLogs.some(log => log.includes('[Demo] Creating new world'))).toBeTruthy();
  });

  test('should create souls for initial agents', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for universe creation screen
    await page.waitForSelector('.universe-config-screen, [class*="UniverseConfig"]', { timeout: 10000 });

    // Select first preset and create universe
    const firstPresetButton = page.locator('button[class*="preset"], button[class*="scenario"]').first();
    await firstPresetButton.click();

    const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
    await createButton.click();

    // Wait for soul creation logs
    await page.waitForFunction(() => {
      const logs = (window as any).__consoleLogs || [];
      return logs.some((log: string) => log.includes('[Demo] Creating souls'));
    }, { timeout: 20000 });

    // Verify soul creation logs
    expect(consoleLogs.some(log => log.includes('[Demo] Creating souls for'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('[Demo] Creating soul 1/'))).toBeTruthy();
  });

  test('should initialize game and start running', async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Complete universe creation flow
    await page.waitForSelector('.universe-config-screen, [class*="UniverseConfig"]', { timeout: 10000 });

    const firstPresetButton = page.locator('button[class*="preset"], button[class*="scenario"]').first();
    await firstPresetButton.click();

    const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
    await createButton.click();

    // Wait for game to start (canvas should be visible and rendering)
    const canvas = page.locator('canvas#canvas');
    await expect(canvas).toBeVisible({ timeout: 30000 });

    // Verify game loop is running (check for game-specific UI elements)
    // Wait for at least one of these to appear
    await page.waitForSelector(
      'button:has-text("Play"), button:has-text("Pause"), [class*="time-control"]',
      { timeout: 10000 }
    );

    // Check that no critical errors occurred
    const criticalErrors = errors.filter(err =>
      err.includes('FATAL') ||
      err.includes('Uncaught') ||
      err.includes('Cannot read')
    );

    expect(criticalErrors).toHaveLength(0);

    // Verify game session was created
    expect(consoleLogs.some(log => log.includes('[Demo] Game session ID:'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('All systems registered'))).toBeTruthy();
  });

  test('should handle magic paradigm selection', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for universe creation screen
    await page.waitForSelector('.universe-config-screen, [class*="UniverseConfig"]', { timeout: 10000 });

    // Look for magic paradigm selector (if available)
    const magicSelector = page.locator('select[name*="magic"], select[id*="magic"], [class*="magic-paradigm"]');
    const hasMagicSelector = await magicSelector.count() > 0;

    if (hasMagicSelector) {
      // Select "academic" magic paradigm
      await magicSelector.selectOption({ label: /academic/i });
    }

    // Create universe
    const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
    await createButton.click();

    // Wait for magic system configuration
    await page.waitForFunction(() => {
      const logs = (window as any).__consoleLogs || [];
      return logs.some((log: string) => log.includes('Magic system configured'));
    }, { timeout: 15000 });

    // Verify magic paradigm was set
    expect(consoleLogs.some(log => log.includes('[Demo] Enabling magic paradigm:'))).toBeTruthy();
  });

  test('should prevent regression: universe creation after refresh', async ({ page, context }) => {
    // First visit: Create universe
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForSelector('.universe-config-screen, [class*="UniverseConfig"]', { timeout: 10000 });

    const firstPresetButton = page.locator('button[class*="preset"], button[class*="scenario"]').first();
    await firstPresetButton.click();

    const createButton = page.locator('button:has-text("Create"), button:has-text("Start"), button:has-text("Begin")').first();
    await createButton.click();

    // Wait for game to start
    await page.waitForSelector('canvas#canvas', { timeout: 30000 });

    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });

    // Should NOT show universe creation screen again (save exists)
    // Instead should show load dialog or automatically load
    const universeConfigScreen = page.locator('.universe-config-screen, [class*="UniverseConfig"]');

    // Either load dialog appears OR game loads directly
    const loadDialog = page.locator('button:has-text("Load"), button:has-text("Continue")');
    const gameCanvas = page.locator('canvas#canvas');

    // One of these should be visible
    await expect(loadDialog.or(gameCanvas)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Universe Creation - Edge Cases', () => {
  test('should handle LLM timeout gracefully', async ({ page }) => {
    const consoleLogs: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for LLM availability check
    await page.waitForFunction(() => {
      const logs = (window as any).__consoleLogs || [];
      return logs.some((log: string) =>
        log.includes('[DEMO] LLM available:') ||
        log.includes('LLM availability check timed out')
      );
    }, { timeout: 5000 });

    // Should either succeed or timeout gracefully
    const hasTimeout = warnings.some(w => w.includes('LLM availability check timed out'));
    const hasSuccess = consoleLogs.some(l => l.includes('[DEMO] LLM available: true'));

    expect(hasTimeout || hasSuccess).toBeTruthy();

    // Game should still initialize even if LLM times out
    expect(consoleLogs.some(log => log.includes('[DEMO] Settings loaded, continuing initialization...'))).toBeTruthy();
  });

  test('should not crash if canvas is missing', async ({ page }) => {
    // Inject script to remove canvas before main() runs
    await page.addInitScript(() => {
      window.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('canvas');
        if (canvas) {
          canvas.remove();
        }
      });
    });

    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Should throw a clear error about missing canvas
    await page.waitForTimeout(2000);

    expect(errors.some(err => err.includes('Canvas element not found'))).toBeTruthy();
  });
});
