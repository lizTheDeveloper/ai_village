# AI Village Architecture

This directory contains the foundational design documents for AI Village.

## Documents

| File | Purpose |
|------|---------|
| [CORE_ARCHITECTURE.md](./CORE_ARCHITECTURE.md) | Design patterns, stability contract, how everything fits together |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Phased development plan from zero to full game |
| [INTERFACES.ts](./INTERFACES.ts) | TypeScript interfaces - the actual code contract |

## Quick Start

1. **Read CORE_ARCHITECTURE.md** first - understand the patterns
2. **Reference INTERFACES.ts** when implementing - these are the contracts
3. **Follow IMPLEMENTATION_ROADMAP.md** for what to build when

## Key Principles

### Backwards Compatibility
- Every save file has a version
- Migrations upgrade old saves automatically
- New features add new components (never modify existing shape)
- Feature flags let old saves work with new code

### Loose Coupling
- Systems communicate via Events (not direct calls)
- Agents express Intent via Actions (world validates/applies)
- Components are pure data (systems have logic)

### Incremental Development
- Each phase delivers something playable
- Features can be developed in isolation
- One feature per day is sustainable after Phase 5

## The Stability Contract

These things **NEVER CHANGE** once defined:

```typescript
// Primitive types
type EntityId = string;
type ComponentType = string;
type Tick = number;

// Base shapes
interface Component {
  readonly type: ComponentType;
  readonly version: number;
}

interface GameEvent {
  readonly type: EventType;
  readonly tick: Tick;
  readonly source: EntityId | SystemId | 'world';
  readonly data: Record<string, unknown>;
}

interface Action {
  readonly id: string;
  readonly type: ActionType;
  readonly actorId: EntityId;
  status: ActionStatus;
}

interface SaveHeader {
  readonly saveVersion: number;
  readonly features: FeatureFlags;
}
```

You can **ALWAYS** add:
- New component types
- New fields to components (with defaults)
- New action types
- New event types
- New systems
- New feature flags

## Minimum Viable Game

After **Phase 5** (see roadmap), you have:
- ✅ Infinite procedural world
- ✅ Multiple LLM-controlled agents
- ✅ Survival mechanics (hunger, energy)
- ✅ Foraging for food
- ✅ Agent conversations
- ✅ Basic social awareness
- ✅ Working save/load

Everything after that adds depth but isn't required for the core loop.

## Daily Development Pattern

Once you're past Phase 5, each feature follows this pattern:

```
Morning:   Design components, actions, events
Afternoon: Implement system, register handlers
Evening:   Add migration, test with old saves
```

Each feature is:
- Self-contained in its own system
- Guarded by a feature flag
- Backwards compatible via migration
- Testable in isolation
