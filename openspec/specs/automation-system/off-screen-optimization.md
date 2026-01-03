> **System:** automation-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Off-Screen Production Optimization

## Problem

Running full factory simulation for all chunks is expensive:
- **Belt System**: Transfer calculations for every belt, every tick
- **Assembly Machines**: Progress updates, ingredient checks
- **Power Grid**: Network flood-fill, power distribution
- **Direct Connections**: Machine-to-machine transfers

For a Dyson Swarm Factory City with **500+ machines and 1000+ belts**, full simulation costs **~50ms per tick** (1000ms per second at 20 TPS).

If you have **10 factory cities**, that's **10 seconds of CPU per game second** - completely unplayable.

## Solution: Production Rate Calculation

Instead of simulating every tick, calculate production rates and fast-forward state.

### When Chunk Goes Off-Screen

1. **Snapshot machine states**:
   - Recipe being crafted
   - Machine speed multiplier
   - Power efficiency
   - Input/output buffer contents

2. **Calculate production rate**:
   ```typescript
   craftingTime = 0.5 seconds (from recipe)
   machineSpeed = 1.0 (base assembly machine)
   powerEfficiency = 1.0 (fully powered)

   craftsPerSecond = 1.0 / craftingTime = 2.0
   craftsPerHour = craftsPerSecond * 3600 = 7200
   actualRate = craftsPerHour * machineSpeed * powerEfficiency = 7200
   ```

3. **Store production rate** in `ChunkProductionStateComponent`:
   ```typescript
   {
     itemId: 'iron_gear',
     ratePerHour: 7200,
     inputRequirements: [
       { itemId: 'iron_plate', ratePerHour: 14400 }
     ],
     powerRequired: 100
   }
   ```

### While Chunk Is Off-Screen

**Every tick** (20 times per second):
- Do nothing - just let time accumulate

**Every second** (configurable interval):
- Check if chunk is still off-screen
- Track elapsed ticks since last simulation

**Cost**: ~0.001ms per tick (1000x faster than full simulation)

### When Chunk Loads On-Screen

1. **Calculate elapsed time**:
   ```typescript
   currentTick = 1000000
   lastSimulatedTick = 900000
   elapsedTicks = 100000

   // At 20 TPS, 72000 ticks = 1 hour
   elapsedHours = 100000 / 72000 = 1.39 hours
   ```

2. **Fast-forward production**:
   ```typescript
   targetProduction = 7200 items/hour * 1.39 hours = 10008 items

   // Check input limits
   inputStockpile = 20000 iron plates
   inputRequired = 14400 items/hour * 1.39 hours = 20016 plates

   // Not enough inputs! Can only produce:
   actualProduction = (20000 / 20016) * 10008 = 9999 items
   ```

3. **Consume inputs**:
   ```typescript
   inputStockpile -= 20000  // All iron plates used
   ```

4. **Add to output buffer**:
   ```typescript
   outputBuffer['iron_gear'] += 9999
   ```

5. **Resume full simulation**:
   - Regular automation systems take over
   - Belt System, Assembly Machine System run normally
   - Chunk behaves as if it was always simulating

## Performance Comparison

### Dyson Swarm Factory City (500 machines, 1000 belts)

**Full simulation (on-screen)**:
- 500 machines × 0.01ms = 5ms
- 1000 belts × 0.005ms = 5ms
- 200 power entities × 0.001ms = 0.2ms
- **Total: 10.2ms per tick**
- **204ms per second** (at 20 TPS)
- **12.2 seconds per game hour**

**Off-screen optimization**:
- 0.001ms per tick (just elapsed time tracking)
- **0.02ms per second** (at 20 TPS)
- **0.07 seconds per game hour**

**Speedup: 10,200x faster**
**CPU savings: 99.99%**

### 10 Factory Cities

**Full simulation**:
- 10 cities × 204ms/sec = **2040ms per second**
- Game runs at **0.5 FPS** - unplayable

**Off-screen (9 cities off-screen, 1 on-screen)**:
- 1 on-screen: 204ms/sec
- 9 off-screen: 9 × 0.02ms = 0.18ms/sec
- **Total: 204.18ms per second**
- Game runs at **50 FPS** - smooth

## Implementation

### Component: ChunkProductionStateComponent

**File**: `packages/core/src/components/ChunkProductionStateComponent.ts`

```typescript
interface ChunkProductionStateComponent {
  type: 'chunk_production_state';

  // Snapshot data
  lastSimulatedTick: number;
  productionRates: ProductionRate[];
  inputStockpiles: Map<string, number>;
  outputBuffers: Map<string, number>;

  // Power state
  totalPowerGeneration: number;
  totalPowerConsumption: number;
  isPowered: boolean;

  // Visibility
  isOnScreen: boolean;
}
```

### System: OffScreenProductionSystem

**File**: `packages/core/src/systems/OffScreenProductionSystem.ts`

**Priority**: 49 (runs before automation systems at 50+)

**Logic**:
1. Check chunk visibility every second
2. If off-screen: accumulate time, skip full simulation
3. If on-screen: fast-forward production, resume full simulation

### Integration with ChunkManager

**Modify ChunkManager** to:
1. Track which chunks are on-screen (within viewport)
2. Register chunks with OffScreenProductionSystem
3. Call `setChunkVisibility()` when chunks enter/leave viewport

Example:
```typescript
class ChunkManager {
  private offScreenSystem: OffScreenProductionSystem;

  updateVisibleChunks(viewportBounds: Bounds) {
    for (const chunk of this.chunks.values()) {
      const wasVisible = chunk.isVisible;
      const isVisible = this.isInViewport(chunk, viewportBounds);

      if (wasVisible !== isVisible) {
        // Visibility changed
        this.offScreenSystem.setChunkVisibility(
          chunk.id,
          isVisible
        );
      }
    }
  }
}
```

## Edge Cases

### 1. Resource Exhaustion

**Problem**: What if inputs run out while off-screen?

**Solution**: `fastForwardProduction()` checks input limits:
```typescript
// Can't produce more than inputs allow
const maxFromInput = inputStockpile / inputRequired;
actualProduction = Math.min(targetProduction, maxFromInput * targetProduction);
```

When inputs run out, production stops. Output buffer shows partial results.

### 2. Power Outage

**Problem**: What if power fails while off-screen?

**Solution**: Check power status in snapshot:
```typescript
state.isPowered = state.totalPowerGeneration >= state.totalPowerConsumption;

if (!state.isPowered) {
  // Production rate = 0
  return new Map(); // No production
}
```

### 3. Output Buffer Full

**Problem**: What if output buffer fills up?

**Solution**: Limit production to available buffer space:
```typescript
const bufferCapacity = 100;
const bufferUsed = state.outputBuffers.get(itemId) || 0;
const bufferSpace = bufferCapacity - bufferUsed;

actualProduction = Math.min(targetProduction, bufferSpace);
```

### 4. Recipe Change

**Problem**: What if player changes machine recipe while off-screen?

**Solution**:
- **Option A**: Recalculate production rates when recipe changes
- **Option B**: Only allow recipe changes for on-screen machines
- **Recommended**: Option B (simpler, more intuitive)

### 5. Very Long Offline Time

**Problem**: What if player is offline for 24 real-world hours?

**Solution**: Cap maximum fast-forward time:
```typescript
const MAX_OFFLINE_HOURS = 8; // 8 game hours max
const elapsedHours = Math.min(
  elapsedTicks / TICKS_PER_HOUR,
  MAX_OFFLINE_HOURS
);
```

This prevents:
- Integer overflow in production calculations
- Massive item dumps when loading
- Unfair "idle game" progression

## Testing

### Test 1: Production Rate Accuracy

Compare full simulation vs off-screen optimization:

```typescript
// Simulate for 1 hour (72000 ticks) with full simulation
const fullSimResult = runFullSimulation(72000);

// Fast-forward for 1 hour off-screen
const offScreenResult = fastForwardProduction(state, 72000);

// Should be within 1% (accounts for rounding)
expect(offScreenResult.get('iron_gear')).toBeCloseTo(
  fullSimResult.get('iron_gear'),
  0.01
);
```

### Test 2: Resource Exhaustion

Test that production stops when inputs run out:

```typescript
// Start with 100 input items
state.inputStockpiles.set('iron_plate', 100);

// Recipe needs 200 items per hour
// After 1 hour, should have produced only 50% (ran out halfway)
const result = fastForwardProduction(state, 72000);

expect(state.inputStockpiles.get('iron_plate')).toBe(0);
expect(result.get('iron_gear')).toBeLessThan(expectedFullProduction);
```

### Test 3: Chunk Visibility Toggle

Test switching between on-screen and off-screen:

```typescript
// Start on-screen (full sim)
offScreenSystem.setChunkVisibility(chunkId, true);
runTicks(1000);

// Go off-screen
offScreenSystem.setChunkVisibility(chunkId, false);
runTicks(72000); // 1 hour

// Come back on-screen
offScreenSystem.setChunkVisibility(chunkId, true);

// Production should have continued
expect(outputBuffer.get('iron_gear')).toBeGreaterThan(0);
```

## Future Enhancements

### 1. Logistics Network Integration

When Tier 5 Logistics Network is implemented:
- Calculate item flows between chunks
- Track "in transit" items for off-screen deliveries
- Fast-forward logistics bot deliveries

### 2. Research Bonuses

Apply global production speed bonuses:
```typescript
const researchBonus = world.researchSystem.getBonus('production_speed');
actualRate = baseRate * machineSpeed * powerEfficiency * researchBonus;
```

### 3. Efficiency Visualization

Show production efficiency in UI:
- "This factory is producing at 87% efficiency (low iron input)"
- "This factory is idle (no power)"
- "This factory is at full capacity"

### 4. Historical Production Tracking

Store production history for graphs:
```typescript
productionHistory: Array<{
  timestamp: number;
  itemId: string;
  produced: number;
}>;
```

Display charts showing production over time.

## See Also

- **AUTOMATION_LOGISTICS_SPEC.md** - Core automation systems
- **FACTORY_BLUEPRINTS.md** - Factory designs
- **packages/core/src/systems/OffScreenProductionSystem.ts** - Implementation
- **packages/core/src/components/ChunkProductionStateComponent.ts** - State component
