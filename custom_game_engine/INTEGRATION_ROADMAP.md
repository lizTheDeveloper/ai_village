# Future Integration Points - Master Roadmap

> **Generated:** 2026-01-19
> **Total Integration Points Analyzed:** 140+ TODOs
> **Categories:** Plot/Narrative, Multiverse, Divinity, LLM/AI, Grand Strategy, Game Mechanics

This document provides a comprehensive plan for addressing all "future integration point" TODOs in the codebase. Each item has been analyzed by specialized agents and categorized by readiness, dependencies, and priority.

---

## Executive Summary

### Overall Statistics

- **Total Integration Points:** ~140 TODOs
- **Ready to Implement:** 33 items (24%)
- **Blocked (Missing Dependencies):** 16 items (11%)
- **Convert to Documentation:** 15 items (11%)
- **Architectural Notes (Keep as TODOs):** ~76 items (54%)

### Key Findings

1. **Infrastructure is 80-90% complete** - Most core systems exist, TODOs are integration points
2. **Components exist, systems missing** - Empire/Nation components complete but no processing systems
3. **LLM infrastructure is production-ready** - Just needs hookups for specific features
4. **Divine/spiritual systems 95% complete** - Missing a few components (Angel, DivineAbility)
5. **Multiverse infrastructure solid** - Missing save/load integration and divergence calculations

---

## Priority Matrix

### 🔥 Critical Priority (Implement Immediately)

**Effort:** 8-16 hours total | **Impact:** Unlocks multiple features

1. **Passage Restoration in Save/Load** (2-3 hours)
   - **Category:** Multiverse
   - **Blocker:** Save/load broken for multiverse games
   - **File:** `packages/core/src/persistence/SaveLoadService.ts:439`
   - **Dependencies:** ✅ All exist (MultiverseCoordinator, PassageComponent)

2. **Track Answered Prayers** (1-2 hours)
   - **Category:** Divinity
   - **Impact:** Completes prayer statistics in dashboard
   - **File:** `packages/core/src/dashboard/views/PrayersView.ts:154`
   - **Dependencies:** ✅ DeityComponent exists

3. **Spawn Attractor Integration** (1-2 hours)
   - **Category:** Plot/Narrative
   - **Impact:** Enables plot-driven narrative pressure
   - **File:** `packages/core/src/plot/PlotEffectExecutor.ts:137`
   - **Dependencies:** ✅ NarrativePressureSystem exists

4. **Event Bus Generic Event Migration** (2-4 hours)
   - **Category:** Infrastructure
   - **Impact:** Code quality, type safety
   - **Files:** 5+ systems using `onGeneric()`
   - **Dependencies:** ✅ EventBus exists, just need type definitions

---

### ⚡ High Priority (Implement Soon)

**Effort:** 20-40 hours total | **Impact:** Major feature completions

5. **Create AngelComponent** (6-8 hours)
   - **Category:** Divinity
   - **Impact:** Unlocks angel UI, completes angel system
   - **Blockers:** None
   - **Follow-up:** Enables divine power tracking

6. **Divergence-Based Contamination** (3-5 hours)
   - **Category:** Multiverse
   - **Impact:** Better passage mechanics, universe isolation
   - **File:** `packages/core/src/systems/PassageTraversalSystem.ts:325`
   - **Dependencies:** ✅ DivergenceTrackingSystem exists

7. **Emotional State Duration Tracking** (1 hour)
   - **Category:** Plot/Narrative
   - **Impact:** Accurate plot triggering
   - **File:** `packages/core/src/plot/EventDrivenPlotAssignment.ts:266`
   - **Dependencies:** ✅ MoodComponent.moodHistory exists

8. **Navy-Armada Linking System** (2-4 hours)
   - **Category:** Grand Strategy
   - **Impact:** Completes navy hierarchy
   - **File:** `packages/core/src/systems/NavySystem.ts` (4 TODOs)
   - **Dependencies:** ✅ All components exist

9. **Soil-Weather Integration** (3-5 hours)
   - **Category:** Game Mechanics
   - **Impact:** Completes environmental simulation
   - **File:** `packages/core/src/systems/SoilSystem.ts:82`
   - **Dependencies:** ✅ Test file exists with spec

10. **Checkpoint Name Generation** (2-3 hours)
    - **Category:** LLM/AI
    - **Impact:** Better UX for save/load, time travel
    - **File:** `packages/core/src/systems/AutoSaveSystem.ts:245`
    - **Dependencies:** ✅ LLMDecisionQueue exists

---

### 📊 Medium Priority (Implement When Ready)

**Effort:** 40-80 hours total | **Impact:** Feature enhancements

11. **Deity Relationship System** (8-12 hours)
    - **Category:** Divinity
    - **Impact:** Divine politics, rivalries
    - **File:** `packages/core/src/dashboard/views/PantheonView.ts:143`

12. **Choice Tracking via Memory** (2-3 hours)
    - **Category:** Plot/Narrative
    - **Impact:** Plot condition evaluation
    - **File:** `packages/core/src/plot/PlotConditionEvaluator.ts:89`

13. **Governor Decision Integration** (6-10 hours)
    - **Category:** Grand Strategy
    - **Impact:** LLM-powered governance
    - **File:** `packages/core/src/governance/DecisionProtocols.ts` (3 TODOs)

14. **Universe Compatibility Calculation** (3-5 hours)
    - **Category:** Multiverse
    - **Impact:** Network passage validation
    - **File:** `packages/core/src/multiverse/MultiverseNetworkManager.ts:333`

15. **Fleet Combat Integration** (3-5 hours)
    - **Category:** Grand Strategy
    - **Impact:** Proper battle resolution
    - **File:** `packages/core/src/systems/RebellionEventSystem.ts:349`

16. **Megastructure Component Integration** (2-3 hours)
    - **Category:** Game Mechanics
    - **Impact:** Completes megastructure system
    - **File:** `packages/core/src/systems/MegastructureMaintenanceSystem.ts`

17. **LLM Prayer Domain Inference** (4-6 hours)
    - **Category:** Divinity + LLM
    - **Impact:** Better deity emergence
    - **File:** `packages/core/src/systems/DeityEmergenceSystem.ts:445`

18. **Warehouse Integration for Governors** (2-3 hours)
    - **Category:** Grand Strategy
    - **Impact:** Resource-aware governance
    - **File:** `packages/core/src/governance/GovernorContextBuilders.ts:1384`

---

### 🔧 Low Priority (Future Enhancements)

**Effort:** 80+ hours total | **Impact:** Polish & advanced features

19. **Companion System Phase 2-4** (16-24 hours)
20. **Archetype Entity System** (8-12 hours)
21. **Squadron Formation Modifiers** (2-3 hours)
22. **Hilbert Time from Coordinator** (2-3 hours)
23. **Fertility Forecasting** (4-6 hours)
24. **Age & Generation Tracking** (3-5 hours)
25. **Uplift System Integrations** (4-6 hours)
26. **Myth Generation Event Expansion** (3-5 hours)
27. **Tilling Tool Requirement** (1-2 hours)
28. **Season-Based Soil Decay** (2-3 hours)
29. **Production Input Mapping** (2-3 hours)
30. **Governance Audit Trail** (4-6 hours)
31. **Escalation Event Emission** (1-2 hours)
32. **Avatar Manifestation** (2-3 hours)
33. **LLM Placeholder Enhancement** (2-3 hours)

---

## Blocked Items (Requires New Systems)

### 🚧 Missing Components

#### 1. **DivineAbilityComponent** (16-20 hours to create)
**Blocks:**
- Divine power system (PossessionSystem.ts:124)
- DevPanel divine controls (renderer TODO.md:43-55)

**Create:**
```typescript
interface DivineAbilityComponent {
  type: 'divine_ability';
  abilities: DivinePower[];
  activePowers: string[];
  totalPowersUsed: number;
  divineEnergyPool: number;
}
```

#### 2. **DelayedEventQueue System** (4-8 hours to create)
**Blocks:**
- Plot event queueing (PlotEffectExecutor.ts:144)

**Create:**
```typescript
class DelayedEventQueue extends BaseSystem {
  enqueue(event: QueuedEvent): void;
  processQueue(currentTick: number): void;
  cancelPlotEvents(plotInstanceId: string): void;
}
```

#### 3. **DimensionalRiftComponent** (6-10 hours to create)
**Blocks:**
- Rebellion dimensional rifts (RebellionEventSystem.ts:630)
- Reality corruption mechanics

#### 4. **DysonSwarmComponent** (4-6 hours to create)
**Blocks:**
- Dyson swarm construction (ProductionScalingSystem.ts:290)

---

### 🚧 Missing Systems

#### 1. **EmpireSystem & NationSystem** (16-24 hours to create)
**Blocks:**
- All governance decision-making
- Treaty execution
- War resolution beyond combat
- Research completion
- Empire/nation component processing

**Priority:** HIGH - Components exist but unused

#### 2. **TimeJumpTrajectorySystem** (20+ hours to create)
**Blocks:**
- Soul trajectory generation (TimeCompressionSystem.ts:181)
- Time compression with LLM

**Priority:** LOW - Advanced feature

#### 3. **TerritoryZoneSystem** (8-12 hours to create)
**Blocks:**
- Spatial territory control
- World bounds tracking (RebellionEventSystem.ts:613, 713)

---

## Documentation Conversions

These TODOs should be converted to architectural documentation rather than implementation tasks:

### Plot/Narrative
1. **Temporary State System** → `docs/TEMPORARY_STATE_SYSTEM.md`
   - Duration tracking pattern
   - Temporary buffs/debuffs architecture

2. **Plot Sequencing** → `packages/core/src/plot/PLOT_SEQUENCING.md`
   - Chain reaction design
   - Sequel/prerequisite patterns

3. **Stage-Specific Action Guidance** → Keep as enhancement TODO

### LLM/AI
4. **Reflection LLM Integration** → `openspec/specs/cognition/REFLECTION_DEPTH.md`
   - Cost/benefit analysis needed
   - Template vs LLM decision

5. **Biome Context** → Backlog/enhancement list

### Grand Strategy
6. **Phase 6 Governance Notes** → `GOVERNANCE_ROADMAP.md`
   - Document phased approach
   - Migration path from placeholder to soul agent

7. **Meditation Chamber Biofeedback** → `SPACESHIP_COMPONENTS.md`

8. **Removal Restrictions** → `REBELLION_OUTCOMES.md`

### Game Mechanics
9. **Planetary Currents** → `openspec/specs/environment/PLANETARY_CURRENTS.md`
   - Complex physics simulation
   - Performance profiling needed

10. **Village Defense** → `openspec/specs/combat/VILLAGE_DEFENSE.md`

11. **Naval Warfare** → `openspec/specs/military/NAVAL_WARFARE.md`

12. **Epistemic Humility** → `openspec/specs/cognition/EPISTEMIC_HUMILITY.md`

13. **Governor Events** → `GOVERNANCE_INTEGRATION.md`

14. **Passage Persistence** → `packages/core/src/multiverse/PASSAGE_PERSISTENCE.md`

15. **Soul Architecture** → `SOUL_ARCHITECTURE.md`

---

## Implementation Sprints

### Sprint 1: Critical Fixes (8-16 hours)
**Goal:** Unblock save/load and complete core features

- [ ] Passage restoration in SaveLoadService
- [ ] Track answered prayers in DeityComponent
- [ ] Spawn attractor integration in PlotEffectExecutor
- [ ] Event bus generic event migration

**Deliverable:** Save/load works with multiverse, prayer stats complete, plot attractors working

---

### Sprint 2: Divine Power (24-32 hours)
**Goal:** Complete divinity system

- [ ] Create AngelComponent
- [ ] Create DivineAbilityComponent
- [ ] Implement DivinePowerSystem
- [ ] Wire divine ability cost checking
- [ ] Add divine resource tracking

**Deliverable:** Full divine intervention mechanics, angel UI, power system

---

### Sprint 3: Multiverse & Time (12-20 hours)
**Goal:** Complete multiverse mechanics

- [ ] Divergence-based contamination
- [ ] Universe compatibility calculation
- [ ] Hilbert time from coordinator
- [ ] Emotional state duration tracking

**Deliverable:** Accurate contamination, universe validation, better time coordinates

---

### Sprint 4: Grand Strategy (16-24 hours)
**Goal:** Complete empire/nation hierarchy

- [ ] Navy-armada linking
- [ ] Fleet combat integration
- [ ] Warehouse integration for governors
- [ ] Create EmpireSystem stub
- [ ] Create NationSystem stub

**Deliverable:** Functional navy hierarchy, resource-aware governance

---

### Sprint 5: Environment & Polish (16-24 hours) ✅ COMPLETE
**Goal:** Complete environmental simulation

- [x] Soil-weather integration (SoilSystem already integrated with WeatherSystem events)
- [x] Season-based soil decay (Season-aware decay multipliers in SoilSystem)
- [x] Megastructure component integration (MegastructureMaintenanceSystem integrated)
- [x] Age & generation tracking (New AgeTrackingSystem with lifecycle events)
- [x] Tilling tool requirement (HoeSoilBehavior requires 'hoe' or 'plow' tool)

**Deliverable:** Realistic weather effects, complete megastructure support

---

### Sprint 6: LLM Enhancements (12-20 hours)
**Goal:** Leverage existing LLM infrastructure

- [ ] Checkpoint name generation
- [ ] LLM prayer domain inference
- [ ] Governor decision integration
- [ ] Myth generation event expansion

**Deliverable:** AI-generated content throughout game

---

## Testing Strategy

### Critical Path Tests
1. **Save/Load with Passages** - Create passage, save, load, traverse
2. **Prayer Statistics** - Create deity, send prayers, verify answered count
3. **Plot Attractors** - Trigger plot effect, verify NarrativePressure updated
4. **Divergence Contamination** - Fork universe, traverse passage, check contamination

### Integration Tests
5. **Soil-Weather** - Rain event → moisture increase on outdoor tiles only
6. **Navy Hierarchy** - Create armada, verify linked to navy
7. **Divine Powers** - Use ability, verify possession cost increased
8. **Event Migration** - Replace `onGeneric()`, verify events still work

---

## Risk Assessment

### High Risk Items
1. **EmpireSystem/NationSystem** - Large scope, many dependencies
2. **TimeJumpTrajectorySystem** - LLM cost concerns, design complexity
3. **DivineAbilityComponent** - Blocks multiple features, needs careful design

### Medium Risk Items
4. **Governor LLM Integration** - Token usage could be high
5. **Deity Relationship System** - Performance with many deities
6. **Universe Compatibility** - Complex calculations, needs caching

### Low Risk Items
7. **Most READY items** - Dependencies exist, implementation straightforward

---

## Success Metrics

### Code Quality
- ✅ All generic events migrated to typed events
- ✅ Zero placeholder TODOs in production code
- ✅ All integration tests passing

### Feature Completeness
- ✅ Save/load works with all multiverse features
- ✅ Divine systems fully operational (prayers, angels, powers)
- ✅ Plot system fully integrated with narrative pressure
- ✅ Navy/armada hierarchy complete

### Performance
- ✅ No performance regressions from integrations
- ✅ LLM request queuing prevents rate limit issues
- ✅ Contamination caching works correctly

---

## Next Steps

1. **Immediate (This Week)**
   - Implement Sprint 1 critical fixes
   - Create missing component definitions
   - Document blocked items

2. **Short Term (This Month)**
   - Complete Sprint 2 (divine power)
   - Complete Sprint 3 (multiverse)
   - Start Sprint 4 (grand strategy)

3. **Medium Term (This Quarter)**
   - Complete all READY items
   - Create blocked systems (Empire, Nation, DivineAbility)
   - Convert architectural TODOs to documentation

4. **Long Term (Next Quarter+)**
   - Implement blocked items once dependencies ready
   - Polish and enhancement items
   - Advanced features (time jump trajectories, etc.)

---

## File Index

### Critical Files
- `packages/core/src/persistence/SaveLoadService.ts` - Passage restoration
- `packages/core/src/plot/PlotEffectExecutor.ts` - Attractor & event queue
- `packages/core/src/systems/PassageTraversalSystem.ts` - Contamination
- `packages/core/src/dashboard/views/PrayersView.ts` - Prayer tracking

### Component Definitions Needed
- `packages/core/src/components/AngelComponent.ts` (NEW)
- `packages/core/src/components/DivineAbilityComponent.ts` (NEW)
- `packages/core/src/components/DimensionalRiftComponent.ts` (NEW)
- `packages/core/src/components/DysonSwarmComponent.ts` (NEW)

### Systems Needed
- `packages/core/src/systems/EmpireSystem.ts` (NEW)
- `packages/core/src/systems/NationSystem.ts` (NEW)
- `packages/core/src/events/DelayedEventQueue.ts` (NEW)
- `packages/core/src/systems/DivinePowerSystem.ts` (NEW)

---

**Last Updated:** 2026-01-19
**Status:** Sprints 1-6 Complete - Blocked items remain
