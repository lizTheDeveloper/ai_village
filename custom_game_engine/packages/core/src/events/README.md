# Event System

Type-safe event-driven architecture for decoupled system communication.

## Overview

The event system enables systems to communicate without direct dependencies. Events are immutable messages queued during tick execution and dispatched atomically at tick end. Supports 60+ event categories with 3800+ typed event definitions.

## Core Concepts

**EventBus**: Central pub/sub hub. Systems subscribe to event types, emit events during tick, flush at tick end.

**GameEvent**: Immutable message with `type`, `tick`, `timestamp`, `source`, and typed `data` payload.

**EventMap**: Compile-time type definitions mapping event types to data structures. Prevents typos, enables autocomplete.

**Priorities**: `immediate`, `high`, `normal`, `low`, `deferred` control handler execution order.

## Event Categories (60+)

World & Time, Agent Actions, Agent State, Agent Behavior, Soil & Farming, Plant Lifecycle, Plant Disease, Seeds, Harvesting, Resources, Buildings, Crafting, Cooking, Conversations, Memory, Beliefs, Divine Power, Exploration, Animals, Housing, Storage, Needs, Weather, Inventory, Spatial, Research, Publishing, University, Technology, Experimentation, Reproduction, Courtship, Mood, Goals, LLM Decisions, Trading, Economy, Multiverse, Skills, Conflicts, Guard Duty, Television, Deity, Myths, VR, News, Rebellion, Magic

## Usage

### Type-Safe Subscription

```typescript
import { eventBus } from '@ai-village/core';

// Typed subscription - event.data is inferred
eventBus.subscribe<'agent:action:started'>('agent:action:started', (event) => {
  const { actionId, actionType } = event.data; // Typed!
  console.log(`${event.source} started ${actionType}`);
});

// Multiple types
eventBus.subscribe(['agent:sleep_start', 'agent:woke'], handler);

// Priority handling
eventBus.subscribe('world:tick:start', handler, 'high');
```

### Type-Safe Emission

```typescript
// Queued (default) - dispatched at tick end
eventBus.emit<'agent:action:completed'>({
  type: 'agent:action:completed',
  source: agentId,
  data: { actionId: 'abc', actionType: 'till', success: true }
});

// Immediate (breaks atomicity - use sparingly)
eventBus.emitImmediate<'agent:death'>({
  type: 'agent:death',
  source: agentId,
  data: { cause: 'starvation', killedBy: 'hunger' }
});
```

### Event Filtering

```typescript
import { filterEventsByType, hasEventType, countEventsByType } from '@ai-village/core';

const deaths = filterEventsByType(events, 'agent:death'); // GameEvent<'agent:death'>[]
const hasDeath = hasEventType(events, 'agent:death'); // boolean
const deathCount = countEventsByType(events, 'agent:death'); // number
```

## Architecture

**EventBus** (`EventBus.ts`): Subscription management, queue, dispatch, history
**GameEvent** (`GameEvent.ts`): Event interface, handler type, priority enum
**EventMap** (`EventMap.ts`): 3800+ typed event definitions
**EventFilters** (`EventFilters.ts`): Type-safe filtering utilities

**Queue Flow**: `emit()` → queue → `flush()` (end of tick) → dispatch by priority → handlers

**History**: Events stored for replay/debugging. Use `getHistory(since?)`, `pruneHistory(olderThan)`.

## Adding Events

1. Add type to `GameEventMap` in `EventMap.ts`:
```typescript
'agent:new_event': { field1: string; field2: number };
```

2. Emit in system:
```typescript
eventBus.emit<'agent:new_event'>({
  type: 'agent:new_event',
  source: this.id,
  data: { field1: 'value', field2: 42 }
});
```

3. Subscribe in consuming system:
```typescript
eventBus.subscribe<'agent:new_event'>('agent:new_event', (event) => {
  // event.data is typed!
});
```

## Performance Notes

- Events queued during tick, dispatched once at end (atomicity)
- Subscription index by event type (O(1) lookup)
- Handler errors caught and logged, don't crash dispatch
- History pruning recommended for long-running simulations
