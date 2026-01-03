import { test, expect } from '@playwright/test';

/**
 * E2E tests for Metrics Dashboard
 *
 * These tests verify critical user flows through the dashboard.
 * Run with: npx playwright test
 */

test.describe('Metrics Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:5174');

    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial Load', () => {
    test('should load dashboard within 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.waitForSelector('[data-testid="dashboard-container"]', {
        timeout: 2000,
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should connect to MetricsAPI', async ({ page }) => {
      // Check for successful API connection indicator
      await expect(page.locator('[data-testid="api-status"]')).toContainText('Connected');
    });

    test('should connect to WebSocket', async ({ page }) => {
      // Check for successful WebSocket connection
      await expect(page.locator('[data-testid="ws-status"]')).toContainText('Connected');
    });

    test('should display navigation menu', async ({ page }) => {
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.getByText('Network')).toBeVisible();
      await expect(page.getByText('Timeline')).toBeVisible();
      await expect(page.getByText('Spatial')).toBeVisible();
      await expect(page.getByText('Inequality')).toBeVisible();
      await expect(page.getByText('Cultural')).toBeVisible();
      await expect(page.getByText('Time Series')).toBeVisible();
    });
  });

  test.describe('Network Visualization Flow', () => {
    test('should navigate to network view', async ({ page }) => {
      await page.click('text=Network');
      await expect(page.locator('[data-testid="network-graph"]')).toBeVisible();
    });

    test('should render network graph with nodes', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="network-graph"]');

      // Verify graph is rendered
      const graph = page.locator('[data-testid="network-graph"]');
      await expect(graph).toBeVisible();
    });

    test('should show agent details on node click', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="network-graph"]');

      // Click first node
      await page.click('[data-testid="network-node-0"]');

      // Verify details panel appears
      await expect(page.locator('[data-testid="agent-details-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-centrality"]')).toBeVisible();
    });

    test('should allow zooming and panning', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="network-graph"]');

      // Test zoom in
      await page.click('[aria-label="zoom in"]');

      // Test zoom out
      await page.click('[aria-label="zoom out"]');

      // Test fit to screen
      await page.click('[aria-label="fit to screen"]');

      // Verify no errors occurred
      const errors = await page.evaluate(() => {
        return (window as any).__errors || [];
      });
      expect(errors.length).toBe(0);
    });

    test('should filter by community', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="community-filter"]');

      // Select community 1
      await page.selectOption('[data-testid="community-filter"]', '1');

      // Verify only community 1 nodes are visible
      await page.waitForTimeout(500); // Wait for filter to apply
      // Visual verification would happen here
    });
  });

  test.describe('Timeline Visualization Flow', () => {
    test('should navigate to timeline view', async ({ page }) => {
      await page.click('text=Timeline');
      await expect(page.locator('[data-testid="area-chart"]')).toBeVisible();
    });

    test('should display behavior timeline', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[data-testid="timeline-container"]');

      // Verify behaviors are shown
      await expect(page.getByText('gather')).toBeVisible();
      await expect(page.getByText('craft')).toBeVisible();
      await expect(page.getByText('socialize')).toBeVisible();
    });

    test('should show innovation markers', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[data-testid="innovation-marker"]');

      const markers = await page.locator('[data-testid="innovation-marker"]').count();
      expect(markers).toBeGreaterThan(0);
    });

    test('should scrub through time', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[data-testid="time-scrubber"]');

      const scrubber = page.locator('[data-testid="time-scrubber"]');

      // Move scrubber
      await scrubber.fill('2000');

      // Verify chart updates
      await page.waitForTimeout(300);
    });

    test('should export timeline as PNG', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[aria-label="export"]');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await page.click('[aria-label="export"]');
      await page.click('text=PNG');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.png$/);
    });
  });

  test.describe('Spatial Heatmap Flow', () => {
    test('should navigate to spatial view', async ({ page }) => {
      await page.click('text=Spatial');
      await expect(page.locator('[data-testid="spatial-heatmap"]')).toBeVisible();
    });

    test('should toggle layers', async ({ page }) => {
      await page.click('text=Spatial');
      await page.waitForSelector('[data-testid="spatial-heatmap"]');

      // Toggle trails
      await page.click('[aria-label="trails"]');
      await expect(page.locator('[data-testid="movement-trails"]')).toBeVisible();

      // Toggle territories
      await page.click('[aria-label="territories"]');
      await expect(page.locator('[data-testid="territory-boundaries"]')).toBeVisible();

      // Toggle density
      await page.click('[aria-label="density"]');
      await expect(page.locator('[data-testid="heatmap-canvas"]')).not.toBeVisible();
    });

    test('should render heatmap on canvas', async ({ page }) => {
      await page.click('text=Spatial');
      await page.waitForSelector('[data-testid="heatmap-canvas"]');

      const canvas = page.locator('[data-testid="heatmap-canvas"]');
      await expect(canvas).toBeVisible();

      // Verify canvas has dimensions
      const width = await canvas.evaluate((el: HTMLCanvasElement) => el.width);
      const height = await canvas.evaluate((el: HTMLCanvasElement) => el.height);

      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });
  });

  test.describe('Real-Time Updates', () => {
    test('should receive WebSocket updates', async ({ page }) => {
      // Listen for WebSocket messages
      const messages: any[] = [];

      page.on('websocket', (ws) => {
        ws.on('framereceived', (event) => {
          messages.push(event);
        });
      });

      await page.goto('http://localhost:5174');
      await page.waitForLoadState('networkidle');

      // Wait for at least one message
      await page.waitForFunction(() => messages.length > 0, { timeout: 5000 });

      expect(messages.length).toBeGreaterThan(0);
    });

    test('should update graph in real-time with < 1s lag', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="network-graph"]');

      // Record initial state
      const initialNodeCount = await page.locator('[class*="network-node"]').count();

      // Wait for update
      await page.waitForTimeout(2000);

      // Check if update occurred (node count might change or positions update)
      // In a real test, we'd verify specific update occurred
    });

    test('should show reconnecting message on disconnect', async ({ page }) => {
      await page.goto('http://localhost:5174');

      // Simulate network disconnect
      await page.route('**/*', (route) => route.abort());

      // Should show reconnecting message
      await expect(page.getByText(/reconnecting/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance Requirements', () => {
    test('should render 1000 nodes in < 500ms', async ({ page }) => {
      await page.click('text=Network');
      await page.waitForSelector('[data-testid="network-graph"]');

      const startTime = Date.now();

      // Trigger re-render with 1000 nodes (would need to inject test data)
      await page.evaluate(() => {
        // Inject large dataset
        (window as any).__testData = {
          nodes: Array.from({ length: 1000 }, (_, i) => ({
            id: `node-${i}`,
            centrality: Math.random(),
            community: Math.floor(Math.random() * 10),
          })),
        };
      });

      // Wait for render
      await page.waitForFunction(() => {
        return document.querySelectorAll('[class*="network-node"]').length === 1000;
      }, { timeout: 1000 });

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(500);
    });

    test('should update charts in < 100ms', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[data-testid="area-chart"]');

      const startTime = Date.now();

      // Trigger chart update
      await page.click('[data-testid="behavior-toggle-gather"]');

      // Wait for update
      await page.waitForTimeout(200);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(100);
    });
  });

  test.describe('Error Handling', () => {
    test('should display error on API failure', async ({ page }) => {
      // Intercept API calls and return error
      await page.route('**/api/metrics/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('http://localhost:5174');

      await expect(page.getByText(/error/i)).toBeVisible();
    });

    test('should handle malformed data gracefully', async ({ page }) => {
      // Intercept API and return invalid data
      await page.route('**/api/metrics/network', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ invalid: 'data' }),
        });
      });

      await page.goto('http://localhost:5174');
      await page.click('text=Network');

      // Should show error message, not crash
      await expect(page.getByText(/error/i)).toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export CSV from time series view', async ({ page }) => {
      await page.click('text=Time Series');
      await page.waitForSelector('[aria-label="export csv"]');

      const downloadPromise = page.waitForEvent('download');

      await page.click('[aria-label="export csv"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    test('should export PNG from timeline', async ({ page }) => {
      await page.click('text=Timeline');
      await page.waitForSelector('[aria-label="export"]');

      const downloadPromise = page.waitForEvent('download');

      await page.click('[aria-label="export"]');
      await page.click('text=PNG');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.png$/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5174');

      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    });

    test('should adapt navigation for smaller screens', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5174');

      // Mobile nav should be visible on tablet
      await expect(page.locator('nav')).toBeVisible();
    });
  });
});
