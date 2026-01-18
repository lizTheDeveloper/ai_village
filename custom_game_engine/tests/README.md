# E2E Tests

End-to-end tests for the Multiverse game engine using Playwright.

## Setup

Playwright is already installed as a dev dependency. No additional setup required.

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Specific Test Suite
```bash
npm run test:chunk-generation
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Mode
```bash
npm run test:e2e:debug
```

## Test Files

### chunk-generation.spec.ts

Comprehensive tests for the chunk generation system with Web Worker integration.

**What it tests:**
- Worker pool initialization
- Background chunk generation (non-blocking)
- TPS/FPS stability during chunk generation
- Priority queue system (HIGH → MEDIUM → LOW)
- Dynamic prediction based on agent speed
- Camera scrolling triggering chunk generation
- Error handling and graceful degradation
- Backward compatibility (sync fallback)

**Prerequisites:**
- Game server must be running on `http://localhost:3000`
- Run `./start.sh` before testing

**Test structure:**
1. **Worker Pool Initialization** - Verifies worker pool and systems are registered
2. **Performance Metrics** - Ensures TPS/FPS remain stable during generation
3. **Chunk Queue System** - Tests priority queuing and deduplication
4. **Dynamic Prediction** - Validates prediction system configuration
5. **Camera Scrolling Integration** - Verifies camera movement triggers chunks
6. **Error Handling** - Tests graceful error handling
7. **Integration Tests** - End-to-end scenarios
8. **Backward Compatibility** - Ensures sync fallback works

**Key assertions:**
- TPS remains above 18 during chunk generation
- No frame should take longer than 50ms (20 FPS minimum)
- Worker pool is created successfully
- Priority queue respects HIGH → MEDIUM → LOW ordering
- Chunks are generated in background without blocking main thread

### agent-behavior.spec.ts

Tests for agent behavior, LLM integration, and decision-making.

**What it tests:**
- Agent rendering and movement
- LLM decision processing
- Thinking/Speaking/Action structure
- Hearing system
- Performance and memory leaks
- Ollama API integration

**Prerequisites:**
- Game server must be running on `http://localhost:3006`
- Ollama must be running and accessible

## Writing New Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Your Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForFunction(() => window.game !== undefined, { timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for initialization
  });

  test('should do something', async ({ page }) => {
    // Your test code
  });
});
```

### Accessing Game API

The game exposes a `window.game` object with the following structure:

```typescript
interface GameAPI {
  world: World;              // World instance with all entities
  gameLoop: GameLoop;        // Game loop with system registry
  renderer: Renderer;        // Renderer instance with camera
  placementUI: any;          // Building placement UI
  buildingRegistry: any;     // Building blueprint registry
  agentInfoPanel: any;       // Agent info panel
  animalInfoPanel: any;      // Animal info panel
  resourcesPanel: any;       // Resources panel
  devPanel: any;             // Dev panel
  debugManager: any;         // Debug manager
}
```

### Common Patterns

**Get current TPS:**
```typescript
const tps = await page.evaluate(() => window.game?.gameLoop?.getCurrentTPS?.() ?? 0);
```

**Move camera:**
```typescript
await page.evaluate(() => {
  const renderer = window.game?.renderer;
  if (renderer) {
    renderer.camera.x += 1000;
    renderer.camera.y += 1000;
  }
});
```

**Queue a chunk:**
```typescript
await page.evaluate(() => {
  const world = window.game?.world;
  const generator = world?.getBackgroundChunkGenerator?.();
  generator?.queueChunk({
    chunkX: 10,
    chunkY: 10,
    priority: 'HIGH',
    requestedBy: 'test',
  });
});
```

**Monitor console logs:**
```typescript
const logs: string[] = [];
page.on('console', (msg) => logs.push(msg.text()));
```

**Check for errors:**
```typescript
const errors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  }
});
page.on('pageerror', (error) => {
  errors.push(error.message);
});
```

### Best Practices

1. **Wait for initialization** - Game takes 5-10 seconds to fully initialize
2. **Use timeouts appropriately** - Allow time for async operations
3. **Filter noise** - Ignore favicon 404s, websocket errors in tests
4. **Test performance** - Verify TPS/FPS remain stable
5. **Test error cases** - Ensure graceful degradation
6. **Use descriptive test names** - Should read like documentation
7. **Clean up after tests** - Clear queues, reset state if needed

## CI/CD Integration

Tests are configured to run in CI with:
- Retries: 2 retries on failure
- Workers: 1 (sequential execution to avoid conflicts)
- Screenshots: Only on failure
- Trace: On first retry

See `playwright.config.ts` for full configuration.

## Troubleshooting

### Tests timeout on `window.game !== undefined`

**Cause:** Game server not running or port mismatch

**Fix:**
```bash
cd custom_game_engine
./start.sh
```

### Worker pool tests fail

**Cause:** Browser doesn't support Web Workers or security policy blocks workers

**Fix:**
- Check browser console for worker errors
- Verify `chunk-generation.worker.ts` is accessible
- Test in headed mode: `npm run test:e2e:headed`

### TPS/FPS tests fail

**Cause:** System under load or browser throttling

**Fix:**
- Close other applications
- Run in headed mode to see actual performance
- Adjust thresholds if system is slow

### Tests are flaky

**Cause:** Race conditions, timing issues, or async operations

**Fix:**
- Increase timeouts for initialization
- Use `waitForFunction` instead of fixed timeouts
- Add retries in test configuration

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Game Debug API](../DEBUG_API.md)
- [Architecture Overview](../ARCHITECTURE_OVERVIEW.md)
- [Performance Guide](../PERFORMANCE.md)
