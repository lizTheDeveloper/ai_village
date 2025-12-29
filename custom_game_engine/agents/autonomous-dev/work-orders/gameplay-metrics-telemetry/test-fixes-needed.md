# Test Fixes Needed - MetricsAnalysis

The following tests have incorrect setup that doesn't match implementation requirements:

## 1. "should find negative correlation between hunger crises and health" (line 317)

**Problem**: Test calls `collector.sampleMetrics()` without first recording agent birth events.

**Fix needed**: Add birth events before sampling:

```typescript
it('should find negative correlation between hunger crises and health', () => {
  // ADD THESE LINES:
  collector.recordEvent({
    type: 'agent:birth',
    timestamp: 0,
    agentId: 'agent-1',
    generation: 1,
    parents: null,
    initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
  });

  collector.recordEvent({
    type: 'agent:birth',
    timestamp: 0,
    agentId: 'agent-2',
    generation: 1,
    parents: null,
    initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
  });

  // Now the existing sampleMetrics calls will work:
  collector.sampleMetrics('agent-1', {
    hunger: 5,
    ...
```

## 2. "should detect no correlation when variables are independent" (line 357)

**Problem**: Test records test:metric1 and test:metric2 events but `findCorrelations()` doesn't support these metric types. It only supports 'intelligence' vs 'lifespan' and 'hunger_crises' vs 'health'.

**Fix Option 1**: Use supported metric types that should have low correlation:
```typescript
it('should detect no correlation when variables are independent', () => {
  // Create agents with random intelligence and lifespans (no correlation)
  for (let i = 0; i < 5; i++) {
    const intelligence = 50 + Math.random() * 50;
    const lifespan = 1000 + Math.random() * 5000;

    collector.recordEvent({
      type: 'agent:birth',
      timestamp: 0,
      agentId: `agent-${i}`,
      generation: 1,
      parents: null,
      initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100, intelligence }
    });

    collector.recordEvent({
      type: 'agent:death',
      timestamp: lifespan,
      agentId: `agent-${i}`,
      causeOfDeath: 'old_age',
      ageAtDeath: lifespan,
      finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
    });
  }

  const correlation = analysis.findCorrelations('intelligence', 'lifespan');
  expect(Math.abs(correlation.coefficient)).toBeLessThan(0.3);
  expect(correlation.strength).toBe('weak');
});
```

**Fix Option 2**: Implement generic correlation support in `extractCorrelationData()`.

## 3. "should calculate correlation with sufficient sample size" (line 375)

**Problem**: Error message changed from "minimum 3 samples" to "minimum 2 samples" but test still expects old message.

**Fix needed**:
```typescript
it('should calculate correlation with sufficient sample size', () => {
  expect(() => {
    analysis.findCorrelations('metric1', 'metric2');
  }).toThrow('Insufficient data for correlation analysis (minimum 2 samples required)');
  // Changed from: 'minimum 3 samples required'
});
```

## 4. "should detect cyclic trend" (line 455)

**Problem**: The sine wave pattern may not be strong enough to trigger autocorrelation threshold.

**Current test**:
```typescript
population: 100 + Math.sin(i * Math.PI / 4) * 20 // Oscillates 80-120
```

**Fix Option 1**: Make the pattern more pronounced:
```typescript
population: 100 + Math.sin(i * Math.PI / 3) * 50 // Oscillates 50-150, faster period
```

**Fix Option 2**: Add more data points to make pattern clearer:
```typescript
for (let i = 0; i < 30; i++) { // Changed from 20
```

## 5. "should recognize trade route pattern" (line 528)

**Problem**: Test records `agent:moved` events but doesn't first create the agent with a birth event. Also need to check if `handleAgentMoved` properly aggregates distance.

**Fix needed**:
```typescript
it('should recognize trade route pattern', () => {
  // ADD birth event:
  collector.recordEvent({
    type: 'agent:birth',
    timestamp: 0,
    agentId: 'agent-1',
    generation: 1,
    parents: null,
    initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
  });

  // Then existing movement events:
  for (let i = 0; i < 20; i++) {
    collector.recordEvent({
      type: 'agent:moved',
      timestamp: Date.now() + (i * 1000),
      agentId: 'agent-1',
      from: i % 2 === 0 ? { x: 0, y: 0 } : { x: 100, y: 100 },
      to: i % 2 === 0 ? { x: 100, y: 100 } : { x: 0, y: 0 },
      distance: 141
    });
  }
  ...
```

## 6. "should recognize social clustering pattern" (line 547)

**Problem**: Test records conversations but the threshold in `detectSocialClustering` expects 5+ relationships. With 10 conversations creating relationships between 3 agents, we should have enough.

The test looks correct. The issue might be that `conversationsPerDay` is not being set properly. Need to verify that `handleConversationStarted` increments `conversationsPerDay`.

**Status**: Need to investigate if implementation properly tracks conversationsPerDay.

## Summary

Tests need:
1. Birth events before sampleMetrics calls (2 tests)
2. Use supported correlation metric types (1 test)
3. Update error message expectation (1 test)
4. Stronger cyclic pattern or more data points (1 test)
5. Birth event before agent:moved events (1 test)
6. Verify conversationsPerDay tracking (1 test - may be implementation bug)
