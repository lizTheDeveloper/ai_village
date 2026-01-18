# Event System

Type-safe event-driven architecture for decoupled system communication.

## Overview

The event system enables systems to communicate without direct dependencies. Events are immutable messages queued during tick execution and dispatched atomically at tick end. Supports 570+ typed event definitions organized into 18 domain modules.

## Core Concepts

**EventBus**: Central pub/sub hub. Systems subscribe to event types, emit events during tick, flush at tick end.

**GameEvent**: Immutable message with `type`, `tick`, `timestamp`, `source`, and typed `data` payload.

**EventMap**: Compile-time type definitions mapping event types to data structures. Aggregates all domain modules.

**Domain Modules**: Events organized by game domain (agent, plant, combat, etc.) for maintainability.

**Priorities**: `immediate`, `high`, `normal`, `low`, `deferred` control handler execution order.

## File Structure

```
events/
├── EventMap.ts              # Aggregates all domains into GameEventMap
├── EventBus.ts              # Pub/sub hub with queue and dispatch
├── GameEvent.ts             # Event interface and types
├── TypedEventEmitter.ts     # Type-safe emission helpers
├── EventFilters.ts          # Filtering utilities
├── domains/                 # Domain-specific event definitions
│   ├── index.ts             # Re-exports all domains
│   ├── agent.events.ts      # agent:*, behavior:*, need:*, body:*
│   ├── animal.events.ts     # animal:*, animal_*
│   ├── building.events.ts   # building:*, construction:*, door:*, housing:*
│   ├── combat.events.ts     # combat:*, conflict:*, guard:*, hunt:*, predator:*
│   ├── economy.events.ts    # trade:*, crafting:*, inventory:*, resource:*
│   ├── magic.events.ts      # magic:*, divine:*, prayer:*, soul:*
│   ├── media.events.ts      # tv:*, radio:*, publishing:*, library:*
│   ├── misc.events.ts       # Catch-all: memory:*, mood:*, skill:*, etc.
│   ├── multiverse.events.ts # multiverse:*, universe:*, reality_anchor:*
│   ├── navigation.events.ts # navigation:*, exploration:*, zone:*, terrain:*
│   ├── plant.events.ts      # plant:*, seed:*, soil:*, harvest:*
│   ├── rebellion.events.ts  # rebellion:*, province:*, mandate:*
│   ├── research.events.ts   # research:*, university:*, experiment:*
│   ├── social.events.ts     # conversation:*, relationship:*, courtship:*
│   ├── space.events.ts      # spaceship:*, fleet:*, planet:*, lane:*
│   ├── ui.events.ts         # ui:*, input:*, notification:*, chat:*
│   ├── world.events.ts      # world:*, time:*, checkpoint:*
│   └── action.events.ts     # action:* (generic actions)
└── helpers/
    └── DomainEvents.ts      # Domain-level type helpers
```

## Event Domains (18)

| Domain | Prefixes | Description |
|--------|----------|-------------|
| world | `world:`, `time:`, `checkpoint:` | World lifecycle, time progression |
| agent | `agent:`, `behavior:`, `need:`, `body:` | Agent state, actions, needs |
| plant | `plant:`, `seed:`, `soil:`, `harvest:` | Plant lifecycle, farming |
| building | `building:`, `construction:`, `door:`, `housing:` | Building placement, construction |
| combat | `combat:`, `conflict:`, `guard:`, `hunt:`, `predator:` | Combat, conflicts, hunting |
| social | `conversation:`, `relationship:`, `courtship:`, `parenting:` | Social interactions |
| economy | `trade:`, `crafting:`, `inventory:`, `resource:` | Economy, trading, resources |
| magic | `magic:`, `divine:`, `prayer:`, `soul:` | Magic, divine, spiritual |
| media | `tv:`, `radio:`, `publishing:`, `library:` | Broadcasting, publishing |
| rebellion | `rebellion:`, `province:`, `mandate:` | Governance, rebellions |
| research | `research:`, `university:`, `experiment:` | Research, technology |
| navigation | `navigation:`, `exploration:`, `zone:` | Movement, exploration |
| animal | `animal:`, `animal_*` | Animal behavior, taming |
| space | `spaceship:`, `fleet:`, `planet:`, `lane:` | Space travel, fleets |
| multiverse | `multiverse:`, `universe:`, `reality_anchor:` | Multiverse mechanics |
| ui | `ui:`, `input:`, `notification:` | UI interactions |
| action | `action:*` | Generic action events |
| misc | Various | Memory, mood, skills, weather, etc. |

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

### SystemEventManager (Recommended)

```typescript
import { SystemEventManager } from '@ai-village/core';

class MySystem {
  private events: SystemEventManager;

  initialize(eventBus: EventBus) {
    this.events = new SystemEventManager(eventBus, 'my_system');

    // Type-safe subscription with auto-cleanup
    this.events.on('agent:idle', (data) => {
      console.log(data.agentId); // Typed!
    });
  }

  update() {
    // Type-safe emission
    this.events.emit('agent:ate', { agentId, foodType: 'berry', hungerRestored: 10 });
  }

  cleanup() {
    this.events.cleanup(); // Unsubscribes all automatically
  }
}
```

### Domain Type Helpers

```typescript
import {
  DomainName,
  DomainEventTypes,
  DomainEventData,
  eventBelongsToDomain,
  getDomainForEvent
} from '@ai-village/core';

// Get all event types for a domain
type AgentEventTypes = DomainEventTypes<'agent'>; // 'agent:idle' | 'agent:ate' | ...

// Get event data union for a domain
type AgentEventData = DomainEventData<'agent'>; // Union of all agent event payloads

// Runtime helpers
eventBelongsToDomain('agent:idle', 'agent'); // true
getDomainForEvent('plant:mature'); // 'plant'
```

### Event Filtering

```typescript
import { filterEventsByType, hasEventType, countEventsByType } from '@ai-village/core';

const deaths = filterEventsByType(events, 'agent:death'); // GameEvent<'agent:death'>[]
const hasDeath = hasEventType(events, 'agent:death'); // boolean
const deathCount = countEventsByType(events, 'agent:death'); // number
```

## Adding New Events

### 1. Find the Right Domain File

Choose the domain that best matches your event:
- Agent behavior? → `domains/agent.events.ts`
- Plant/farming? → `domains/plant.events.ts`
- Combat? → `domains/combat.events.ts`
- Doesn't fit anywhere? → `domains/misc.events.ts`

### 2. Add the Event Type

```typescript
// In domains/agent.events.ts
export interface AgentEvents {
  // ... existing events ...

  /** Agent discovered a new location */
  'agent:discovered_location': {
    agentId: EntityId;
    locationName: string;
    position: { x: number; y: number };
  };
}
```

### 3. Emit the Event

```typescript
eventBus.emit<'agent:discovered_location'>({
  type: 'agent:discovered_location',
  source: agentId,
  data: { agentId, locationName: 'Ancient Ruins', position: { x: 100, y: 200 } }
});
```

### 4. Subscribe to the Event

```typescript
eventBus.subscribe<'agent:discovered_location'>('agent:discovered_location', (event) => {
  console.log(`${event.source} discovered ${event.data.locationName}`);
});
```

## Creating a New Domain

If you need a new domain (rare):

1. Create `domains/mydomain.events.ts`:
```typescript
import type { EntityId } from '../../types.js';

export interface MyDomainEvents {
  'mydomain:something_happened': { entityId: EntityId; value: number };
}

export type MyDomainEventType = keyof MyDomainEvents;
export type MyDomainEventData = MyDomainEvents[MyDomainEventType];
```

2. Export from `domains/index.ts`:
```typescript
export * from './mydomain.events.js';
```

3. Add to `EventMap.ts`:
```typescript
import type { MyDomainEvents } from './domains/mydomain.events.js';

export interface GameEventMap extends
  // ... existing domains ...
  MyDomainEvents {}
```

4. Add to `helpers/DomainEvents.ts`:
```typescript
import type { MyDomainEvents } from '../domains/mydomain.events.js';

export interface DomainMap {
  // ... existing domains ...
  mydomain: MyDomainEvents;
}

export const DOMAIN_PREFIXES = {
  // ... existing prefixes ...
  mydomain: ['mydomain:'],
};
```

## Architecture

**Queue Flow**: `emit()` → queue → `flush()` (end of tick) → dispatch by priority → handlers

**History**: Events stored for replay/debugging. Use `getHistory(since?)`, `pruneHistory(olderThan)`.

## Performance Notes

- Events queued during tick, dispatched once at end (atomicity)
- Subscription index by event type (O(1) lookup)
- Handler errors caught and logged, don't crash dispatch
- History pruning recommended for long-running simulations
- Domain modules improve TypeScript incremental compilation speed
