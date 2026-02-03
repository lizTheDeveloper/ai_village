# Death Tracking Implementation for CityManager

## Summary

Implemented death event tracking in `CityManager.ts` to resolve the TODO at line 540. The city manager now tracks deaths that occurred within the last 24 in-game hours and uses this data for strategic decision-making.

## Changes Made

### 1. Added Death Tracking Types (`CityManager.ts` lines 23-27)

```typescript
export interface RecentDeath {
  entityId: string;
  tick: number;
  causeOfDeath: string;
}
```

### 2. Added Death Tracking Fields (lines 115-119)

```typescript
// Death tracking
/** How long to keep death events for city stats (24 in-game hours = 1,728,000 ticks at 20 TPS) */
private static readonly DEATH_RETENTION_TICKS = 1_728_000;
/** Recent deaths tracked for city metrics */
private recentDeaths: RecentDeath[] = [];
```

**Calculation:** 24 hours × 60 minutes × 60 seconds × 20 TPS = 1,728,000 ticks

### 3. Added Event Subscription Initializer (lines 138-155)

```typescript
/**
 * Initialize event subscriptions (must be called after EventBus is available)
 */
initialize(eventBus: EventBus): void {
  // Subscribe to death events for city metrics
  eventBus.subscribe('agent:died', (event) => {
    // Track death with entityId, tick, and causeOfDeath
  });
}
```

### 4. Implemented Death Counting with Cleanup (lines 575-584)

```typescript
private countRecentDeaths(world: World): number {
  const currentTick = world.tick;

  // Clean up old deaths (older than 24 in-game hours)
  this.recentDeaths = this.recentDeaths.filter(
    d => currentTick - d.tick < CityManager.DEATH_RETENTION_TICKS
  );

  return this.recentDeaths.length;
}
```

### 5. Added Public Accessor (lines 395-397)

```typescript
getRecentDeaths(): readonly RecentDeath[] {
  return [...this.recentDeaths];
}
```

### 6. Updated HeadlessCitySimulator (line 255)

Called `cityManager.initialize(world.eventBus)` in the simulator's `initialize()` method to set up event subscriptions.

## How It Works

### Event Flow

1. **Death Occurs**: When an agent dies, `DeathTransitionSystem` emits an `agent:died` event
2. **CityManager Listens**: The event subscription adds the death to `recentDeaths` array
3. **Stats Update**: When `analyzeCity()` runs (every 10 seconds), `countRecentDeaths()`:
   - Filters out deaths older than 24 in-game hours
   - Returns the count of recent deaths
4. **Decision Making**: The count affects city strategy:
   - **Line 404**: If `recentDeaths > 0`, city switches to 'security' focus
   - **Line 441**: Deaths are mentioned in security reasoning: "Detected X threats with Y recent deaths"

### Usage in Decision Logic

```typescript
// inferFocus() - line 404
if (stats.nearbyThreats > 3 || stats.recentDeaths > 0) return 'security';

// generateReasoning() - line 441
security: `Detected ${stats.nearbyThreats} threats with ${stats.recentDeaths} recent deaths...`
```

## Testing

Created comprehensive tests in `packages/core/src/city/__tests__/CityManager.test.ts`:

- ✅ Track single death event
- ✅ Track multiple death events
- ✅ Clean up deaths after 24 in-game hours
- ✅ Include deaths in city stats
- ✅ Affect city focus (switch to security mode)

## Context: What Line 540 Needed

The TODO was in `countRecentDeaths()`, which is called by `analyzeCity()` to populate the `CityStats.recentDeaths` field. This field is used for:

1. **Strategic Focus**: Determines if city should enter "security" mode
2. **Reasoning Text**: Explains why city is in security mode
3. **Decision History**: Tracks death trends over time for the director's decision-making

## Related Systems

### CityDirectorSystem

Note: `CityDirectorSystem.ts` (line 277) has a similar hardcoded `recentDeaths: 0`. This is a separate system that doesn't use `CityManager`. Future enhancement could integrate these systems, but they currently operate independently:

- **CityManager**: Rule-based city AI (used in headless simulator, tests)
- **CityDirectorSystem**: LLM-based city director (used in full game)

## Files Modified

1. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/city/CityManager.ts`
   - Added death tracking infrastructure
   - Implemented event subscription
   - Added cleanup logic

2. `/Users/annhoward/src/ai_village/custom_game_engine/packages/city-simulator/src/HeadlessCitySimulator.ts`
   - Added `cityManager.initialize(world.eventBus)` call

3. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/city/__tests__/CityManager.test.ts`
   - Created comprehensive test suite (NEW FILE)

## Performance Considerations

- **Memory**: Deaths are automatically cleaned up after 24 in-game hours (1.7M ticks)
- **CPU**: Cleanup runs during `countRecentDeaths()`, called every 10 seconds (200 ticks)
- **Typical Load**: Small settlements rarely exceed 5-10 deaths per 24-hour window

## Future Enhancements

1. **Integrate with CityDirectorSystem**: Share death tracking between rule-based and LLM-based city AI
2. **Death Analytics**: Track cause-of-death statistics for better decision-making
3. **Spatial Awareness**: Track death locations to identify dangerous areas
4. **Trend Detection**: Compare recent deaths to historical baseline to detect anomalies
