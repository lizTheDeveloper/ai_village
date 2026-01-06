# Multiverse: The End of Eternity - E2E Tests

Integration tests using Playwright to ensure universe creation and soul creation flows work correctly.

## Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test universe-creation.spec.ts

# Run specific test by name
npx playwright test -g "should create souls"
```

## Test Coverage

### Universe Creation Flow (`universe-creation.spec.ts`)

**Critical Path Tests:**
- ✅ Universe creation screen appears on first run
- ✅ Users can create universe with preset scenarios
- ✅ Souls are created for initial agents
- ✅ Game initializes and starts running
- ✅ Magic paradigm selection works
- ✅ Saved games load on refresh (no re-creation)

**Edge Case Tests:**
- ✅ LLM timeout handled gracefully
- ✅ Missing canvas throws clear error

## Preventing Regression

These tests prevent regressions for the following bugs:

1. **Universe creation screen not appearing** (fixed 2026-01-03)
   - Test: `should show universe creation screen on first run`
   - Ensures first-run settings panel doesn't block initialization

2. **Soul creation failing**
   - Test: `should create souls for initial agents`
   - Verifies souls are created for all starting agents

3. **Game not starting after universe creation**
   - Test: `should initialize game and start running`
   - Ensures game loop starts and UI renders

## CI Integration

Add to GitHub Actions:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install chromium

- name: Run E2E Tests
  run: npm run test:e2e
```

## Debugging Failed Tests

1. **Check test artifacts:**
   - Screenshots: `test-results/*/test-failed-*.png`
   - Videos: `test-results/*/video.webm`
   - Traces: `test-results/*/trace.zip`

2. **View trace:**
   ```bash
   npx playwright show-trace test-results/*/trace.zip
   ```

3. **Run in debug mode:**
   ```bash
   npm run test:e2e:debug
   ```

## Test Maintenance

Update test selectors if UI changes:
- Universe config screen: `.universe-config-screen, [class*="UniverseConfig"]`
- Preset buttons: `button[class*="preset"], button[class*="scenario"]`
- Create button: `button:has-text("Create"), button:has-text("Start")`

## Notes

- Tests automatically start dev server on port 3000
- Browser storage is cleared before each test
- Tests run in parallel by default
- Retries 2x on CI, 0x locally
