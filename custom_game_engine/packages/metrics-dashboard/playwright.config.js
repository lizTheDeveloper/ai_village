var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, devices } from '@playwright/test';
/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './src/__tests__/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use */
    reporter: 'html',
    /* Shared settings for all the projects below */
    use: {
        /* Base URL to use in actions like `await page.goto('/')` */
        baseURL: 'http://localhost:5174',
        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',
        /* Screenshot on failure */
        screenshot: 'only-on-failure',
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: __assign({}, devices['Desktop Chrome']),
        },
        {
            name: 'firefox',
            use: __assign({}, devices['Desktop Firefox']),
        },
        {
            name: 'webkit',
            use: __assign({}, devices['Desktop Safari']),
        },
        /* Test against mobile viewports (tablet as per spec) */
        {
            name: 'iPad',
            use: __assign({}, devices['iPad Pro']),
        },
    ],
    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
