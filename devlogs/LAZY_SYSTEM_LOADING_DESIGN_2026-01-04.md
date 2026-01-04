# Lazy System Loading Design - 2026-01-04

## Problem Statement

Currently, **all ~120+ systems** are registered and active from game start, even if:
- The required technology hasn't been unlocked
- No entities use the system's components
- The gameplay hasn't progressed to need the system

This wastes CPU cycles running systems that do nothing.

## Current Architecture

### What We Have

✅ **SystemRegistry has enable/disable** (`SystemRegistry.ts:85-107`)
- `enable(systemId)` - activates a system
- `disable(systemId)` - pauses a system
- Disabled systems are filtered out of `getSorted()` and don't execute

✅ **TechnologyUnlockSystem tracks unlocked buildings/techs** (`TechnologyUnlockSystem.ts`)
- `TechnologyUnlockComponent` stores what's unlocked globally
- `isBuildingUnlocked(unlock, buildingType)` checks if tech is available

✅ **Some systems already check tech internally** (e.g., `UpliftCandidateDetectionSystem:97`)
```typescript
private isTechnologyUnlocked(_world: World): boolean {
  // TODO: Integration point - check ClarketechSystem
  return true; // Placeholder for standalone testing
}
```

### What We Don't Have

❌ **No declarative tech requirements on systems**
- Systems don't declare what tech they need
- No automatic enabling when tech unlocks

❌ **No usage-based activation**
- Systems run even if zero entities have their components
- No detection of "this system is idle forever"

❌ **No lazy registration**
- All systems registered at startup
- Can't defer expensive system initialization

---

## Design: Three-Tier Lazy Loading

### Tier 1: Conditional Registration (Startup)

**Goal**: Don't even register systems if prerequisites aren't met.

**Approach**: Add metadata to systems and conditionally register in `registerAllSystems()`.

```typescript
// New System interface extension (backward compatible)
export interface System {
  // ... existing fields ...

  /** Optional: System won't be registered unless this returns true */
  shouldRegister?(world: World): boolean;

  /** Optional: System metadata for lazy loading */
  readonly metadata?: SystemMetadata;
}

export interface SystemMetadata {
  /** Don't register until these techs are unlocked */
  requiredTechnologies?: string[];

  /** Don't register until these components exist in the world */
  requiredComponentsExist?: ComponentType[];

  /** Category for bulk enable/disable */
  category?: 'core' | 'advanced' | 'lategame' | 'optional';

  /** Human-readable description of when this system activates */
  activationCondition?: string;
}
```

**Example Usage**:
```typescript
export class TelevisionSystem implements System {
  readonly id = 'television';
  readonly priority = 200;
  readonly requiredComponents = [CT.Television];

  readonly metadata: SystemMetadata = {
    requiredTechnologies: ['television_station', 'broadcast_tower'],
    category: 'lategame',
    activationCondition: 'After building first TV station',
  };

  shouldRegister(world: World): boolean {
    // Only register if TV tech is unlocked
    const unlock = getTechUnlock(world);
    return isBuildingUnlocked(unlock, 'television_station');
  }
}
```

**Benefits**:
- Zero overhead for unused systems
- Saves memory (system object never created)
- Clear documentation of prerequisites

**Drawbacks**:
- Systems missing if tech unlocks mid-game (need Tier 2)
- Requires restart to activate new systems

---

### Tier 2: Dynamic Enabling (Runtime)

**Goal**: Enable/disable systems dynamically as game state changes.

**Approach**: Create a `SystemActivationManager` that monitors tech unlocks and component usage.

```typescript
export class SystemActivationManager implements System {
  readonly id = 'system_activation_manager';
  readonly priority = 1; // Run first
  readonly requiredComponents = [];

  private pendingSystems: Map<SystemId, System> = new Map();
  private activationChecks: Map<SystemId, () => boolean> = new Map();

  /**
   * Register a system that will be activated later when conditions are met
   */
  registerPending(system: System, activationCheck: () => boolean): void {
    this.pendingSystems.set(system.id, system);
    this.activationChecks.set(system.id, activationCheck);
  }

  update(world: World): void {
    // Check pending systems
    for (const [systemId, system] of this.pendingSystems) {
      const check = this.activationChecks.get(systemId);
      if (check && check()) {
        console.log(`[SystemActivation] Activating ${systemId}`);

        // Initialize and register
        system.initialize?.(world, world.eventBus);
        world.systemRegistry.register(system);

        // Remove from pending
        this.pendingSystems.delete(systemId);
        this.activationChecks.delete(systemId);
      }
    }

    // Check for systems to disable (e.g., last entity with component was deleted)
    this.checkForIdleSystems(world);
  }

  private checkForIdleSystems(world: World): void {
    // For each active system, check if it has any entities to process
    for (const system of world.systemRegistry.getSorted()) {
      if (system.requiredComponents.length === 0) continue; // Skip global systems

      const entities = world.query()
        .withAll(...system.requiredComponents)
        .executeEntities();

      // If system has had zero entities for 1000 ticks (50 seconds), consider disabling
      if (entities.length === 0) {
        this.recordIdleTick(system.id);
        if (this.getIdleTicks(system.id) > 1000) {
          console.log(`[SystemActivation] Disabling idle system: ${system.id}`);
          world.systemRegistry.disable(system.id);
        }
      } else {
        this.resetIdleTicks(system.id);

        // Re-enable if was disabled
        if (!world.systemRegistry.isEnabled(system.id)) {
          console.log(`[SystemActivation] Re-enabling system: ${system.id}`);
          world.systemRegistry.enable(system.id);
        }
      }
    }
  }
}
```

**Modified `registerAllSystems()`**:
```typescript
export function registerAllSystems(gameLoop: GameLoop, config: SystemRegistrationConfig) {
  const activationManager = new SystemActivationManager();
  gameLoop.systemRegistry.register(activationManager);

  // Example: Register TV system as pending
  const tvSystem = new TelevisionSystem();
  activationManager.registerPending(tvSystem, () => {
    const unlock = getTechUnlock(gameLoop.world);
    return isBuildingUnlocked(unlock, 'television_station');
  });

  // Core systems register immediately
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new MovementSystem());
  // ...
}
```

**Benefits**:
- Systems activate mid-game when tech unlocks
- Automatic disable of idle systems
- No game restart required

**Drawbacks**:
- Activation manager has overhead (checking every tick)
- More complex state management

---

### Tier 3: Usage-Based Auto-Disable

**Goal**: Automatically pause systems that have nothing to do.

**Approach**: Track entity counts per system and disable after sustained inactivity.

```typescript
// In GameLoop.update()
for (const system of this.systemRegistry.getSorted()) {
  const entities = this.queryForSystem(system);

  // Track stats
  this.systemRegistry.recordStats(system.id, {
    lastEntityCount: entities.length,
  });

  // Auto-disable if zero entities for long time
  if (entities.length === 0) {
    this.incrementIdleCounter(system.id);

    if (this.getIdleCounter(system.id) > IDLE_THRESHOLD) {
      console.log(`[Auto-disable] System ${system.id} has no entities`);
      this.systemRegistry.disable(system.id);
    }
  } else {
    this.resetIdleCounter(system.id);
  }

  // Run the system
  system.update(this.world, entities, deltaTime);
}
```

**Benefits**:
- Fully automatic, no manual configuration
- Detects actually unused systems (even if tech is unlocked)
- Self-healing (re-enables when entities appear)

**Drawbacks**:
- Some systems need to run even with zero entities (e.g., spawning systems)
- Need to mark systems as "always active"

---

## Recommended Implementation Strategy

### Phase 1: Low-Hanging Fruit (Immediate)

**Add metadata to expensive systems** and start them disabled:

```typescript
// In registerAllSystems.ts
const tvSystem = new TelevisionSystem();
gameLoop.systemRegistry.register(tvSystem);
gameLoop.systemRegistry.disable('television'); // Disabled until TV tech unlocks
```

**Manually enable when tech unlocks**:
```typescript
// In TechnologyUnlockSystem, when TV station is built:
if (buildingType === 'television_station') {
  world.systemRegistry.enable('television');
  world.systemRegistry.enable('tv_broadcasting');
  world.systemRegistry.enable('tv_ratings');
  // ...
}
```

**Pros**: Simple, no new infrastructure
**Cons**: Manual, error-prone, requires knowing system dependencies

---

### Phase 2: Activation Manager (Medium-term)

**Implement `SystemActivationManager`** from Tier 2:
- Add `SystemMetadata` interface
- Create activation manager system
- Migrate expensive systems to pending registration

**Priority systems to defer**:
1. **Television (10 systems)** - requires TV station
2. **Uplift (5 systems)** - requires consciousness studies tech
3. **Plot/Narrative (3 systems)** - requires storytelling tech
4. **Neural Interface (2 systems)** - requires brain-computer interface
5. **Parasitic Reproduction (2 systems)** - requires biology research
6. **Clarke Tech (1 system)** - requires advanced physics

**Estimated savings**: ~25 systems (20% of total) deferred until mid/late game.

---

### Phase 3: Auto-Disable (Long-term)

**Implement usage tracking** in `GameLoop` or `SystemRegistry`:
- Track entity counts per system over time
- Auto-disable after sustained zero-entity periods
- Auto-re-enable when entities appear

**Whitelist "always active" systems**:
- TimeSystem
- WeatherSystem
- EventBus systems
- Spawning systems (intentionally create entities from nothing)

---

## System Categorization

### Category: Core (Always Active)

Never disable these - foundational to game loop:
- TimeSystem, WeatherSystem, TemperatureSystem
- MovementSystem, SteeringSystem
- MemorySystem, NeedsSystem, MoodSystem
- BuildingSystem, ResourceGatheringSystem

### Category: Early Game (Active from Start)

Needed immediately but could be tech-gated later:
- PlantSystem, AnimalSystem
- CommunicationSystem, SocialGradientSystem
- TradingSystem, SkillSystem

### Category: Mid Game (Defer Until Unlocked)

Require specific tech:
- **ResearchSystem** - requires research lab
- **UniversitySystem** - requires university building
- **MagicSystem** - requires magic discovery
- **FactoryAISystem** - requires automation tech

### Category: Late Game (Defer Until Unlocked)

Advanced mechanics:
- **Television (10 systems)** - requires TV tech
- **Uplift (5 systems)** - requires consciousness studies
- **Neural Interface (2 systems)** - requires BCI tech
- **Divinity - Advanced (4 systems)** - requires theology research

### Category: Optional/Experimental

May never activate in some playthroughs:
- **Parasitic Reproduction (2 systems)**
- **VRSystem** - requires VR tech
- **Rebellion systems** - requires theocracy conflict

---

## Performance Impact Estimates

### Current State
- ~120 systems registered
- All systems execute every tick (even if no entities)
- Systems with empty queries still have overhead

### After Phase 1 (Manual Disable)
- ~100 systems active early game
- ~20 systems deferred
- **Estimated CPU savings**: 15-20%

### After Phase 2 (Activation Manager)
- ~90 systems active early game
- ~30 systems pending activation
- **Estimated CPU savings**: 25-30%

### After Phase 3 (Auto-Disable)
- ~70-80 systems active at any given time
- ~40-50 systems idle/disabled
- **Estimated CPU savings**: 35-40%

---

## Migration Path

### Step 1: Audit Systems

Create a spreadsheet of all systems with:
- System ID
- Priority
- Required tech (if any)
- Earliest possible activation time
- Category (core/early/mid/late/optional)

### Step 2: Add Metadata

Add `SystemMetadata` to 20-30 most expensive systems:
```typescript
export class UpliftCandidateDetectionSystem implements System {
  // ...
  readonly metadata: SystemMetadata = {
    requiredTechnologies: ['consciousness_studies'],
    category: 'lategame',
    activationCondition: 'After researching consciousness studies',
  };
}
```

### Step 3: Implement Activation Manager

Create `SystemActivationManager` and register pending systems:
```typescript
// In registerAllSystems.ts
const activationMgr = new SystemActivationManager();
gameLoop.systemRegistry.register(activationMgr);

// Register TV systems as pending
for (const tvSystem of tvSystems) {
  activationMgr.registerPending(tvSystem, () => {
    return isTechUnlocked(world, 'television_station');
  });
}
```

### Step 4: Test & Iterate

- Monitor system activation in logs
- Track performance improvement
- Add more systems to pending registration
- Fine-tune activation conditions

### Step 5: Auto-Disable (Optional)

If performance is still an issue, add usage-based auto-disable.

---

## Alternative: Component-Driven Activation

**Simpler approach**: Just check if components exist.

```typescript
export function registerAllSystems(gameLoop: GameLoop) {
  // Always register core systems
  gameLoop.systemRegistry.register(new TimeSystem());
  gameLoop.systemRegistry.register(new MovementSystem());

  // Conditionally register based on world state
  if (world.query().with(CT.Television).executeEntities().length > 0) {
    gameLoop.systemRegistry.register(new TelevisionSystem());
  }

  // Or: Register but disable if no components
  const tvSystem = new TelevisionSystem();
  gameLoop.systemRegistry.register(tvSystem);
  if (world.query().with(CT.Television).executeEntities().length === 0) {
    gameLoop.systemRegistry.disable('television');
  }
}
```

**Pros**: Dead simple, no new infrastructure
**Cons**: Doesn't handle future component creation (need runtime checks)

---

## Recommendation

**Start with Phase 1 (manual disable)** for high-impact systems:

1. Identify 10-20 most expensive/late-game systems
2. Register them disabled in `registerAllSystems()`
3. Add enable calls in `TechnologyUnlockSystem` when tech unlocks

**Then implement Phase 2 (Activation Manager)** if benefits are clear:
- Cleaner architecture
- Automatic activation
- Easier to maintain

**Skip Phase 3 (auto-disable)** unless profiling shows it's needed - the complexity may not be worth the 5-10% extra savings.

---

## Open Questions

1. **Should systems be unregistered or just disabled?**
   - Unregister = frees memory, but lose initialization state
   - Disable = keeps in registry, fast to re-enable

2. **How to handle system dependencies?**
   - If System A requires System B, how to enforce activation order?
   - Example: `TVRatingsSystem` needs `TVBroadcastingSystem`

3. **What about save/load?**
   - Should enabled/disabled state persist across saves?
   - Or re-evaluate on load based on world state?

4. **Debug UI for system activation?**
   - Dashboard showing which systems are pending vs active vs disabled?
   - Manual override to force-enable for testing?

---

## Success Metrics

**Before implementing, establish baselines:**
- Average tick time (ms)
- Number of systems executed per tick
- CPU usage during idle periods

**After Phase 1:**
- Target: 15-20% reduction in tick time
- Target: 20 systems deferred early game

**After Phase 2:**
- Target: 25-30% reduction in tick time
- Target: 30 systems deferred early game
- Target: Systems activate within 1 tick of tech unlock

**Long-term:**
- Only ~70-80 systems active at any given time
- Minimal CPU waste on systems with zero entities
- Smooth performance even with 200+ systems in codebase
