# Chunk Generation E2E Test Summary

## Overview

Comprehensive Playwright test suite for the chunk generation system with Web Worker integration.

**File:** `/Users/annhoward/src/ai_village/custom_game_engine/tests/chunk-generation.spec.ts`

**Total Test Count:** 24 tests across 9 test suites

## Test Coverage

### 1. Worker Pool Initialization (3 tests)

**Purpose:** Verify worker pool is created and systems are registered

Tests:
- ✓ Worker pool creation on initialization
- ✓ BackgroundChunkGeneratorSystem registered
- ✓ PredictiveChunkLoadingSystem registered

**Key Assertions:**
- Worker pool exists in world object
- Systems appear in system registry
- Console logs show worker creation messages

### 2. Performance Metrics (3 tests)

**Purpose:** Ensure TPS/FPS remain stable during chunk generation

Tests:
- ✓ Stable TPS during chunk generation (>= 18 TPS)
- ✓ Non-blocking main thread (no frame > 50ms)
- ✓ Stable FPS (>= 20 FPS minimum, ideally 40-60 FPS)

**Key Assertions:**
- TPS remains above 18 (performance threshold)
- TPS doesn't drop more than 15% from baseline
- No frame takes longer than 50ms (20 FPS minimum)
- Average frame time < 25ms (40 FPS target)

### 3. Chunk Queue System (3 tests)

**Purpose:** Test priority queuing and deduplication

Tests:
- ✓ Background queue accepts chunk requests
- ✓ Priority queue ordering (HIGH → MEDIUM → LOW)
- ✓ Clear queue functionality

**Key Assertions:**
- Queue status is available and accurate
- Queue accepts new requests
- Queue can be cleared successfully
- Priority ordering is maintained

### 4. Dynamic Prediction (2 tests)

**Purpose:** Validate prediction system configuration

Tests:
- ✓ Prediction distance constants (MIN=2, MAX=12)
- ✓ Prediction ahead of moving agents

**Key Assertions:**
- Prediction system is registered
- MIN_PREDICTION_DISTANCE = 2 chunks
- MAX_PREDICTION_DISTANCE = 12 chunks
- System processes moving agents

### 5. Camera Scrolling Integration (1 test)

**Purpose:** Verify camera movement triggers chunk generation

Tests:
- ✓ Camera scrolling triggers chunk generation

**Key Assertions:**
- Camera position changes when moved
- Movement delta > 1000 pixels
- Chunk generation activity occurs

### 6. Error Handling (2 tests)

**Purpose:** Test graceful error handling

Tests:
- ✓ Errors handled gracefully without crashing
- ✓ Worker pool errors don't crash game

**Key Assertions:**
- No critical errors (Uncaught, TypeError, ReferenceError)
- Game remains running after errors
- Worker errors don't break gameplay

### 7. Integration Tests (2 tests)

**Purpose:** End-to-end scenarios

Tests:
- ✓ Chunk generation maintains game state
- ✓ Rapid camera movements handled

**Key Assertions:**
- Entity count maintained or increases
- Tick counter advances
- TPS remains stable (>= 15) under stress

### 8. Backward Compatibility (1 test)

**Purpose:** Ensure sync fallback works

Tests:
- ✓ Fallback to sync generation if workers unavailable

**Key Assertions:**
- Generator exists regardless of worker support
- Chunks generate via worker or sync
- Queued chunks eventually complete

## Test Structure

```
Chunk Generation System
├── Worker Pool Initialization (3 tests)
├── Performance Metrics (3 tests)
├── Chunk Queue System (3 tests)
├── Dynamic Prediction (2 tests)
├── Camera Scrolling Integration (1 test)
├── Error Handling (2 tests)
├── Integration Tests (2 tests)
└── Backward Compatibility (1 test)
```

## Running the Tests

### Prerequisites

1. **Start the game server:**
   ```bash
   cd /Users/annhoward/src/ai_village/custom_game_engine
   ./start.sh
   ```

2. **Wait for initialization:**
   - Game server starts on port 3000
   - Allow 5-10 seconds for full initialization

### Run Commands

```bash
# Run all chunk generation tests
npm run test:chunk-generation

# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Expected Results

### Success Criteria

All 24 tests should pass with:
- ✓ Worker pool initialized
- ✓ TPS >= 18 during chunk generation
- ✓ FPS >= 20 (ideally 40-60)
- ✓ No critical errors
- ✓ Chunks generated in background
- ✓ Queue system functional
- ✓ Graceful error handling

### Performance Benchmarks

**TPS (Ticks Per Second):**
- Baseline: ~20 TPS
- During generation: >= 18 TPS
- Maximum drop: 15% from baseline

**FPS (Frames Per Second):**
- Baseline: 40-60 FPS
- During generation: >= 20 FPS
- Maximum frame time: < 50ms
- Average frame time: < 25ms

**Chunk Generation:**
- Queue processing: 1 chunk per 2 ticks (100ms)
- Worker timeout: 5 seconds
- No main thread blocking

## Troubleshooting

### Test Failures

**"Worker pool not found"**
- Check console logs for worker creation errors
- Verify browser supports Web Workers
- Run in headed mode to debug: `npm run test:e2e:headed`

**"TPS below threshold"**
- System may be under load
- Close other applications
- Run fewer concurrent processes
- Adjust threshold in test if system is slow

**"Timeout waiting for game initialization"**
- Game server not running
- Port 3000 not accessible
- Check with: `curl http://localhost:3000`
- Restart server: `./start.sh kill && ./start.sh`

**"Frame time too high"**
- Browser throttling (background tab)
- System under heavy load
- Run in headed mode to see actual performance

### Debug Process

1. **Check server is running:**
   ```bash
   curl http://localhost:3000
   ```

2. **Run in headed mode:**
   ```bash
   npm run test:e2e:headed
   ```

3. **Check browser console:**
   - F12 → Console tab
   - Look for red errors
   - Check worker creation logs

4. **Use debug mode:**
   ```bash
   npm run test:e2e:debug
   ```

5. **Check Playwright trace:**
   - Traces saved in `test-results/` on failure
   - Open with: `npx playwright show-trace trace.zip`

## Test Maintenance

### Updating Thresholds

If legitimate performance changes require threshold updates:

```typescript
// In chunk-generation.spec.ts

// TPS threshold (currently 18)
expect(finalTPS).toBeGreaterThanOrEqual(18);  // Update as needed

// Frame time threshold (currently 50ms)
expect(frameStats.max).toBeLessThan(50);  // Update as needed

// FPS threshold (currently 20 FPS minimum)
expect(frameCount).toBeGreaterThan(100);  // Update as needed
```

### Adding New Tests

Follow the existing pattern:

```typescript
test.describe('New Feature Tests', () => {
  test('should verify new feature', async ({ page }) => {
    // Setup
    const initialState = await page.evaluate(() => {
      // Get initial state
    });

    // Action
    await page.evaluate(() => {
      // Perform action
    });

    // Assert
    const finalState = await page.evaluate(() => {
      // Get final state
    });

    expect(finalState).toBe(expectedValue);
  });
});
```

## Integration with CI/CD

### Configuration

Tests configured for CI in `playwright.config.ts`:
- Workers: 1 (sequential)
- Retries: 2 on failure
- Screenshots: On failure
- Trace: On first retry

### CI Requirements

1. Game server must be running
2. Port 3000 accessible
3. Browser environment available
4. Sufficient resources (2GB+ RAM)

### Environment Variables

```bash
# Optional: Override test timeout
PLAYWRIGHT_TIMEOUT=60000

# Optional: Override base URL
BASE_URL=http://localhost:3000
```

## References

- **Test File:** `/Users/annhoward/src/ai_village/custom_game_engine/tests/chunk-generation.spec.ts`
- **README:** `/Users/annhoward/src/ai_village/custom_game_engine/tests/README.md`
- **Playwright Config:** `/Users/annhoward/src/ai_village/custom_game_engine/playwright.config.ts`
- **Worker Pool:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/workers/ChunkGenerationWorkerPool.ts`
- **Background Generator:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/chunks/BackgroundChunkGenerator.ts`
- **Predictive System:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/systems/PredictiveChunkLoadingSystem.ts`
