# Event System Domain Refactor Plan

## Problem

EventMap.ts has grown to 4,588 lines with 570 event types and 117 unique domain prefixes:
- Flat organization makes navigation difficult
- TypeScript compilation increasingly slow for single large interface
- Systems need complex 30+ line type unions for multi-event subscriptions
- Adding events creates cascading changes

## Solution

Split into domain modules with type helpers for domain-level subscriptions.

## Domain Categorization

| Domain File | Event Prefixes | Approx Count |
|------------|----------------|--------------|
| world.events.ts | world:, time:, checkpoint: | ~15 |
| agent.events.ts | agent:, behavior:, need:, body: | ~45 |
| plant.events.ts | plant:, seed:, soil:, wild_plant:, harvest: | ~30 |
| building.events.ts | building:, construction:, door:, housing: | ~30 |
| combat.events.ts | combat:, conflict:, guard:, hunt:, predator:, invasion:, injury: | ~25 |
| social.events.ts | conversation:, relationship:, courtship:, parenting:, friendship:, trust:, dominance: | ~30 |
| economy.events.ts | trade:, trade_agreement:, market:, crafting:, cooking:, item:, inventory:, storage:, resource:, gathering: | ~50 |
| magic.events.ts | magic:, divine:, divine_power:, divinity:, prayer:, soul:, angel:, deity:, possession:, sacred_site:, godcrafted:, vision:, group_vision:, group_prayer: | ~60 |
| media.events.ts | tv:, radio:, publishing:, library:, bookstore:, journal:, paper: | ~60 |
| rebellion.events.ts | rebellion:, punishment:, mandate: | ~30 |
| research.events.ts | research:, university:, experiment:, technology:, recipe:, discovery:, capability_gap: | ~25 |
| navigation.events.ts | navigation:, exploration:, spatial:, zone:, terrain:, passage: | ~20 |
| animal.events.ts | animal:, predator: (non-combat) | ~10 |
| space.events.ts | spaceship:, fleet:, planet:, station:, lane: | ~25 |
| multiverse.events.ts | multiverse:, universe:, reality_anchor:, lore: | ~20 |
| ui.events.ts | ui:, input:, notification:, chat:, pixellab: | ~15 |
| action.events.ts | action:* (generic) | ~10 |
| misc.events.ts | belief:, memory:, mood:, skill:, trauma:, stress:, guild:, village:, weather:, fire:, disaster:, fluid:, voxel_resource:, etc. | ~100 |

## New File Structure

```
events/
├── EventMap.ts              # Aggregates all domains, exports GameEventMap
├── domains/
│   ├── index.ts             # Re-exports all domain types
│   ├── world.events.ts
│   ├── agent.events.ts
│   ├── plant.events.ts
│   ├── building.events.ts
│   ├── combat.events.ts
│   ├── social.events.ts
│   ├── economy.events.ts
│   ├── magic.events.ts
│   ├── media.events.ts
│   ├── rebellion.events.ts
│   ├── research.events.ts
│   ├── navigation.events.ts
│   ├── animal.events.ts
│   ├── space.events.ts
│   ├── multiverse.events.ts
│   ├── ui.events.ts
│   ├── action.events.ts
│   └── misc.events.ts
├── helpers/
│   └── DomainEvents.ts      # Domain subscription helpers
├── EventBus.ts              # (unchanged)
├── GameEvent.ts             # (unchanged)
├── TypedEventEmitter.ts     # (unchanged + new domain methods)
├── EventFilters.ts          # (unchanged)
└── index.ts                 # Updated exports
```

## Domain Event File Template

```typescript
// agent.events.ts
import type { EntityId } from '../../types.js';

/**
 * Agent-related events covering state, actions, and lifecycle.
 */
export interface AgentEvents {
  'agent:idle': { agentId: EntityId; ... };
  'agent:ate': { agentId: EntityId; foodType: string; ... };
  // ... all agent:* events
}

/**
 * Union of all agent event types.
 */
export type AgentEventType = keyof AgentEvents;

/**
 * Union of all agent event data payloads.
 */
export type AgentEventData = AgentEvents[AgentEventType];
```

## EventMap.ts (After Refactor)

```typescript
import type { WorldEvents } from './domains/world.events.js';
import type { AgentEvents } from './domains/agent.events.js';
// ... import all domains

/**
 * Unified map of all event types (backward compatible).
 */
export interface GameEventMap extends
  WorldEvents,
  AgentEvents,
  PlantEvents,
  BuildingEvents,
  CombatEvents,
  SocialEvents,
  EconomyEvents,
  MagicEvents,
  MediaEvents,
  RebellionEvents,
  ResearchEvents,
  NavigationEvents,
  AnimalEvents,
  SpaceEvents,
  MultiverseEvents,
  UIEvents,
  ActionEvents,
  MiscEvents {}

export type EventType = keyof GameEventMap;
export type EventData<T extends EventType> = GameEventMap[T];
```

## DomainEvents.ts Helper

```typescript
import type { EventBus } from '../EventBus.js';
import type { GameEvent } from '../GameEvent.js';
import type { AgentEvents, AgentEventType } from '../domains/agent.events.js';
// ... all domains

/**
 * Map of domain names to their event interfaces.
 */
export interface DomainMap {
  agent: AgentEvents;
  world: WorldEvents;
  // ... all domains
}

export type DomainName = keyof DomainMap;

/**
 * Get event types for a domain.
 */
export type DomainEventTypes<D extends DomainName> = keyof DomainMap[D];

/**
 * Get event data union for a domain.
 */
export type DomainEventData<D extends DomainName> = DomainMap[D][keyof DomainMap[D]];

/**
 * Subscribe to all events in a domain.
 */
export function subscribeToDomain<D extends DomainName>(
  eventBus: EventBus,
  domain: D,
  handler: (type: DomainEventTypes<D>, data: DomainEventData<D>) => void
): () => void {
  // Implementation subscribes to all event types with the domain prefix
}
```

## TypedEventEmitter Additions

```typescript
// New method on SystemEventManager:
onDomain<D extends DomainName>(
  domain: D,
  handler: (type: DomainEventTypes<D>, data: DomainEventData<D>, event: GameEvent) => void
): Unsubscribe {
  // Subscribe to all events matching domain prefix
}
```

## Migration Impact

### Files Modified:
- `events/EventMap.ts` - Refactored to aggregate domains
- `events/index.ts` - Updated exports
- `events/TypedEventEmitter.ts` - Add domain helpers

### Files Created:
- `events/domains/*.events.ts` (18 files)
- `events/domains/index.ts`
- `events/helpers/DomainEvents.ts`

### No Changes Required:
- All existing code using `GameEventMap`, `EventType`, `EventData` continues to work
- All existing `eventBus.emit()` and `eventBus.subscribe()` calls unchanged

## Benefits

1. **Organization**: Events grouped by game domain
2. **Navigation**: Find events by domain (agent events in agent.events.ts)
3. **TypeScript**: Smaller files = faster incremental compilation
4. **Domain Subscriptions**: `events.onDomain('agent', handler)` replaces 30-line unions
5. **Maintainability**: Add new domains without touching main file
6. **Discoverability**: Domain-specific types for autocomplete

## Testing

Run after implementation:
```bash
cd custom_game_engine && npm test
cd custom_game_engine && npm run build
```
