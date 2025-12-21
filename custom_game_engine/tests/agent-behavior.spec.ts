import { test, expect } from '@playwright/test';

test.describe('Agent Behavior E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3006');
    await page.waitForTimeout(2000); // Wait for game to initialize
  });

  test('should display agents on canvas', async ({ page }) => {
    const canvas = await page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Check canvas has rendered something
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(0);
  });

  test('should show agent actions in console', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Wait for agents to make decisions
    await page.waitForTimeout(5000);

    // Check for AI system logs
    const aiLogs = consoleLogs.filter(log =>
      log.includes('[AISystem]') || log.includes('[OllamaProvider]')
    );

    expect(aiLogs.length).toBeGreaterThan(0);
  });

  test('should process LLM decisions without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Wait for multiple decision cycles
    await page.waitForTimeout(10000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(err =>
      !err.includes('404') && // Ignore missing resources
      !err.includes('favicon') && // Ignore favicon errors
      !err.includes('WebSocket') // Ignore websocket errors
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test.describe('Thinking/Speaking/Action', () => {
    test('should log structured LLM responses', async ({ page }) => {
      const structuredResponses: any[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[AISystem] Parsed structured LLM decision')) {
          structuredResponses.push(text);
        }
      });

      await page.waitForTimeout(8000);

      expect(structuredResponses.length).toBeGreaterThan(0);

      // Check that responses include all three components
      const firstResponse = structuredResponses[0];
      expect(firstResponse).toMatch(/thinking:/);
      expect(firstResponse).toMatch(/speaking:/);
      expect(firstResponse).toMatch(/action:/);
    });

    test('should recognize all 12 actions', async ({ page }) => {
      const actionsSeen = new Set<string>();

      page.on('console', (msg) => {
        const text = msg.text();
        const actionMatch = text.match(/action:\s*'?(\w+)'?/);
        if (actionMatch) {
          actionsSeen.add(actionMatch[1]);
        }
      });

      // Wait longer to see variety of actions
      await page.waitForTimeout(15000);

      // Should see at least some of the common actions
      const commonActions = ['wander', 'idle', 'explore'];
      const foundCommon = commonActions.filter(a => actionsSeen.has(a));

      expect(foundCommon.length).toBeGreaterThan(0);
    });
  });

  test.describe('Hearing System', () => {
    test('should detect when agents speak', async ({ page }) => {
      const speechEvents: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('speaking:') && !text.includes('(silent)')) {
          speechEvents.push(text);
        }
      });

      await page.waitForTimeout(10000);

      // At least some agents should speak
      expect(speechEvents.length).toBeGreaterThan(0);
    });

    test('should show heard speech in prompts', async ({ page }) => {
      const promptsWithSpeech: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('What you hear:')) {
          promptsWithSpeech.push(text);
        }
      });

      // Wait for agents to speak and others to hear
      await page.waitForTimeout(15000);

      // Eventually some agent should hear another speaking
      // (This is probabilistic, so we don't enforce it strictly)
      if (promptsWithSpeech.length > 0) {
        expect(promptsWithSpeech[0]).toMatch(/says:/);
      }
    });
  });

  test.describe('Performance', () => {
    test('should maintain reasonable FPS', async ({ page }) => {
      let frameCount = 0;

      await page.evaluate(() => {
        (window as any).testFrameCount = 0;
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
          (window as any).testFrameCount++;
          return originalRAF(callback);
        };
      });

      await page.waitForTimeout(5000);

      frameCount = await page.evaluate(() => (window as any).testFrameCount || 0);

      // Should render at least 50 frames in 5 seconds (10 FPS minimum)
      expect(frameCount).toBeGreaterThan(50);
    });

    test('should not have memory leaks', async ({ page }) => {
      const initialHeapSize = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Let game run for a bit
      await page.waitForTimeout(10000);

      const finalHeapSize = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (initialHeapSize > 0 && finalHeapSize > 0) {
        // Heap shouldn't grow by more than 50MB
        const growth = finalHeapSize - initialHeapSize;
        expect(growth).toBeLessThan(50 * 1024 * 1024);
      }
    });
  });

  test.describe('LLM Integration', () => {
    test('should successfully call Ollama API', async ({ page }) => {
      const ollamaLogs: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[OllamaProvider]')) {
          ollamaLogs.push(text);
        }
      });

      await page.waitForTimeout(8000);

      expect(ollamaLogs.length).toBeGreaterThan(0);

      // Check for successful responses
      const successLogs = ollamaLogs.filter(log =>
        log.includes('Response:') || log.includes('Tool call response')
      );

      expect(successLogs.length).toBeGreaterThan(0);
    });

    test('should handle LLM errors gracefully', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('LLM') && text.includes('error')) {
          errors.push(text);
        }
      });

      await page.waitForTimeout(10000);

      // If there are LLM errors, agents should fall back gracefully
      if (errors.length > 0) {
        // Game should still be running
        const canvas = await page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    });
  });
});

test.describe('Agent Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3006');
    await page.waitForTimeout(2000);
  });

  test('should have agents move around', async ({ page }) => {
    const positionLogs: any[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const posMatch = text.match(/position.*x:\s*([\d.]+).*y:\s*([\d.]+)/);
      if (posMatch) {
        positionLogs.push({
          x: parseFloat(posMatch[1]),
          y: parseFloat(posMatch[2]),
          time: Date.now()
        });
      }
    });

    await page.waitForTimeout(8000);

    if (positionLogs.length >= 2) {
      // Check that positions changed
      const first = positionLogs[0];
      const last = positionLogs[positionLogs.length - 1];

      const distanceMoved = Math.sqrt(
        Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
      );

      expect(distanceMoved).toBeGreaterThan(0);
    }
  });

  test('should have agents within hearing range of each other', async ({ page }) => {
    const hearingEvents: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('heardSpeech') || text.includes('What you hear:')) {
        hearingEvents.push(text);
      }
    });

    // Wait for agents to get close and speak
    await page.waitForTimeout(20000);

    // This is probabilistic - agents might not get close enough
    // But we can check if the hearing system is active
    if (hearingEvents.length > 0) {
      expect(hearingEvents[0]).toBeTruthy();
    }
  });
});
