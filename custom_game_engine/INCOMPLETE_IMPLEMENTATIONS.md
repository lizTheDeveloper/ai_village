# Incomplete Implementations & Technical Debt

**Generated:** 2026-01-01
**Scope:** packages/core/src (excluding test files)
**Total Items:** 100+ TODOs, FIXMEs, and placeholder implementations

---

## Critical - Systems Disabled

### SoulCreationSystem - DISABLED
**Status:** Commented out in system registry
**Blocker:** Missing @ai-village/llm package

```
packages/core/src/systems/SoulCreationSystem.ts:34
// TODO: Fix @ai-village/llm package errors before re-enabling

packages/core/src/systems/SoulCreationSystem.ts:77
private llmProvider?: any; // TODO: Fix LLMProvider import

packages/core/src/systems/SoulCreationSystem.ts:83
setLLMProvider(provider: any): void { // TODO: Fix LLMProvider import

packages/core/src/systems/index.ts:121
// TODO: Fix SoulCreationSystem missing @ai-village/llm before re-enabling
```

**Impact:** Soul creation ceremony completely non-functional

---

### EquipmentSystem - DISABLED
**Status:** Commented out in system registry
**Blockers:** Multiple missing features

```
packages/core/src/systems/index.ts:69
// TODO: Fix EquipmentSystem errors before re-enabling

packages/core/src/systems/EquipmentSystem.ts:51
// TODO: Implement durability degradation

packages/core/src/systems/EquipmentSystem.ts:166-170
/**
 * TODO: Implement when ItemInstance registry is available.
 */
// TODO: Need ItemInstance registry to check instance.condition
```

**Impact:** Equipment system completely non-functional

---

### Incomplete Test Systems - NOT IMPLEMENTED
Systems that exist only as stubs with skipped tests:

```
packages/core/src/__tests__/GuardDuty.test.ts:18
// TODO: GuardDutySystem is not fully implemented - tests skipped until complete

packages/core/src/__tests__/PredatorAttack.test.ts:7
// TODO: PredatorAttackSystem is a stub - tests are skipped until implementation is complete

packages/core/src/__tests__/DominanceChallenge.test.ts:16
// TODO: DominanceChallengeSystem is not fully implemented - tests skipped until complete

packages/core/src/__tests__/DeathHandling.test.ts:21
// TODO: DeathHandling system is not fully implemented - tests skipped until complete
```

**Impact:** Core gameplay systems missing

---

## High Priority - Placeholder Implementations

### Reproduction/Courtship System
**File:** `packages/core/src/reproduction/courtship/compatibility.ts`
**Status:** Multiple placeholder values used in critical calculations

```typescript
Line 244: const socialScore = 0.5; // Placeholder - could include community approval, family, etc.

Line 258: // Health factors (placeholder - health tracked in BodyComponent or NeedsComponent)

Line 262: const fertilityModifier1 = 1.0; // Placeholder
Line 263: const fertilityModifier2 = 1.0; // Placeholder

Line 268: // Magical/mystical factors (placeholder)

Line 342: // For now, return true as placeholder
```

**Impact:** Courtship compatibility calculations are oversimplified

---

### Realm Transition System
**File:** `packages/core/src/realms/RealmTransition.ts`

```
Line 243: // TODO: Implement proper state checking
Line 248: // TODO: Implement permission checking
Line 256: // TODO: Implement these restriction types
```

**Impact:** Realm transitions not validated properly

---

### Pathfinding
**File:** `packages/core/src/actions/AgentAction.ts`

```
Line 361: move: 'wander', // TODO: Implement proper pathfinding
```

**Impact:** Agents use random movement instead of pathfinding

---

## High Priority - Persistence/Save System

### WorldSerializer - Major Gaps
**File:** `packages/core/src/persistence/WorldSerializer.ts`

```
Line 80: config: {},  // TODO: Add UniverseDivineConfig

Line 122: const worldImpl = world as any;  // TODO: Add proper save/load support to World interface

Line 127: // TODO: Deserialize world state (terrain, weather, etc.)

Line 245: // TODO: Implement terrain serialization
Line 246: // TODO: Implement weather serialization
Line 247: // TODO: Implement zone serialization
Line 248: // TODO: Implement building placement serialization
```

---

### SaveLoadService - Incomplete
**File:** `packages/core/src/persistence/SaveLoadService.ts`

```
Line 74: 'universe:main',  // TODO: Get from multiverse

Line 83: absoluteTick: '0',  // TODO: Get from MultiverseCoordinator

Line 113: passages: [],  // TODO: Implement passages

Line 115: player: undefined,  // TODO: Implement player state
```

---

### Type Definitions Missing
**File:** `packages/core/src/persistence/types.ts`

```
Line 83: terrain: unknown;  // TODO: Define terrain format

Line 193: passages: unknown[];  // TODO: PassageSnapshot
```

**Impact:** Save/load system incomplete - cannot save world state

---

## Medium Priority - AI & LLM Integration

### AI God Behavior - Missing Core Features
**File:** `packages/core/src/systems/AIGodBehaviorSystem.ts`

```
Line 169: // TODO: Detect when believers are in danger

Line 172: // TODO: Weather gods cause weather, harvest gods bless crops, etc.
```

**Impact:** AI gods don't perform domain-specific actions

---

### LandmarkNamingSystem - Missing Components
**File:** `packages/core/src/systems/LandmarkNamingSystem.ts`

```
Line 181: // TODO: Implement getMemoriesByType method in SpatialMemoryComponent
Line 192: // TODO: Implement getMemoriesByType method in SpatialMemoryComponent
Line 397: // TODO: Implement getMemoriesByType method in SpatialMemoryComponent

Line 220: // TODO: Add customLLMConfig to AgentComponent if needed

Line 267: // TODO: Add humor trait to PersonalityComponent if needed
```

---

### AutoSaveSystem - LLM Features Stubbed
**File:** `packages/core/src/systems/AutoSaveSystem.ts`

```
Line 194: // TODO: Get actual magic system configuration

Line 220: // TODO: Integrate with LLM to generate poetic names

Line 228: console.log(`[AutoSave] TODO: Generate LLM name for checkpoint day ${checkpoint.day}`);
```

**Impact:** Auto-save checkpoint names are generic instead of poetic

---

### DeityEmergenceSystem - LLM Analysis Missing
**File:** `packages/core/src/systems/DeityEmergenceSystem.ts`

```
Line 119: // TODO: Use this to emit deity_emerged events when deities are created

Line 282: // TODO: This is simplified - in full implementation, would analyze

Line 452: /**
 * TODO: In full implementation, use LLM to analyze prayer content
 */
```

**File:** `packages/core/src/systems/DeityEmergenceSystem.d.ts`

```
Line 90: /**
 * TODO: In full implementation, use LLM to analyze prayer content
 */
```

---

## Medium Priority - Component Integration Gaps

### Spirit Component - Not Integrated
**File:** `packages/core/src/systems/PrayerSystem.ts`

```
Line 136: // TODO: Uncomment when Spirit component is added to ComponentType enum

Line 186: // TODO: Uncomment when Spirit component is implemented
```

**Impact:** Spirit component exists but unusable in prayer system

---

### Angel Component - Missing
**File:** `packages/core/src/dashboard/views/AngelsView.ts`

```
Line 133: // TODO: Check for angel component when implemented
```

---

### Family Tree System - Not Available
**File:** `packages/core/src/systems/DeathTransitionSystem.ts`

```
Line 337: // TODO: Get descendants from family tree system when implemented
```

---

### SpatialMemoryComponent - Missing Method
**Files:** Multiple systems need this method

```
packages/core/src/systems/LandmarkNamingSystem.ts:181
packages/core/src/systems/LandmarkNamingSystem.ts:192
packages/core/src/systems/LandmarkNamingSystem.ts:397
```

**Missing:** `getMemoriesByType` method

---

## Medium Priority - Magic System Gaps

### Skill Trees - Missing Features
**File:** `packages/core/src/magic/skillTrees/BreathSkillTree.ts`

```
Line 151: // TODO: Implement resource_accumulated condition type
```

**File:** `packages/core/src/magic/skillTrees/GameSkillTree.ts`
Multiple TODOs present

---

### Reality Anchor System - No Power Grid
**File:** `packages/core/src/systems/RealityAnchorSystem.ts`

```
Line 80: // TODO: Drain power from power grid/generator

Line 119: // TODO: Actually drain from power grid
```

**Impact:** Reality anchors don't consume power

---

### Body System - Infection Spreading
**File:** `packages/core/src/systems/BodySystem.ts`

```
Line 194: // TODO: Implement infection spreading logic
```

---

### Magical Traits - Not Integrated
**File:** `packages/core/src/items/traits/MagicalTrait.ts`
**File:** `packages/core/src/items/traits/MagicalTrait.d.ts`

```
Line 3: /**
 * TODO: Integrate with Phase 30 Magic System when available.
 */
```

---

## Medium Priority - System Features

### AfterlifeMemoryFadingSystem - Missing Events
**File:** `packages/core/src/systems/AfterlifeMemoryFadingSystem.ts`

```
Line 82: // TODO: Emit event if memories just completed fading

Line 176: // TODO: Emit event when event type is added to EventMap
```

---

### ReincarnationSystem - Species Support
**File:** `packages/core/src/systems/ReincarnationSystem.ts`

```
Line 353: // TODO: Use species to add species-specific components when implemented
```

---

### SoilSystem - Tool Checking
**File:** `packages/core/src/systems/SoilSystem.ts`
**File:** `packages/core/src/systems/SoilSystem.d.ts`

```
Line 82: /**
 * TODO: Add agentId parameter for tool checking when agent-initiated tilling is implemented
 */
```

---

### LoreSpawnSystem - Creator Intervention
**File:** `packages/core/src/systems/LoreSpawnSystem.ts`

```
Line 162: // TODO: When CreatorInterventionSystem is available, scan for marks/silence

Line 319: // TODO: Implement proper entity query when available
```

---

### PossessionSystem - Divine Abilities
**File:** `packages/core/src/systems/PossessionSystem.ts`

```
Line 101: const isUsingAbility = false; // TODO: Check for divine ability use
```

---

## Low Priority - Architectural

### ECS/World - Archetype Creation
**File:** `packages/core/src/ecs/World.ts`

```
Line 354: // TODO: Implement archetype-based entity creation
```

---

### SimulationScheduler - Essential Entity Tracking
**File:** `packages/core/src/ecs/SimulationScheduler.ts`

```
Line 227: // let isEssential = false;  // TODO: implement essential entity tracking

Line 236: // isEssential = true;  // TODO: implement essential entity tracking
```

**Impact:** Cannot mark entities as essential for always-simulate

---

### MultiverseCoordinator - Deep Cloning
**File:** `packages/core/src/multiverse/MultiverseCoordinator.ts`

```
Line 149: // TODO: Implement deep world cloning
```

---

## Low Priority - Targeting System

### ThreatTargeting - Component Contracts
**File:** `packages/core/src/targeting/ThreatTargeting.ts`

```
Line 322: // TODO: AnimalComponent, AgentComponent, and ResourceComponent don't currently define
```

---

## Test Issues

### InjurySystem - Test/Implementation Mismatch
**File:** `packages/core/src/__tests__/InjurySystem.test.ts`

```
Line 118: // TODO: Test logic needs review - the comparison stats.combatSkill - 7 gives negative number

Line 164: // TODO: System only disables memory for critical head injuries, not major

Line 194: // TODO: System modifies hungerDecayRate, not hungerRate

Line 212: // TODO: System modifies energyDecayRate, not energyRate

Line 227: // TODO: Healing time is only set during handleHealing, not on first update

Line 275: // TODO: untreatedDuration gets incremented during update even on first pass

Line 305: // TODO: Healing requires requiresTreatment: false for minor injuries

Line 323: // TODO: elapsed counter behavior differs from test expectation

Line 345: // TODO: Healing behavior needs review
```

**Impact:** 9 test/implementation mismatches documented but not fixed

---

### AutomatedLove - Test Caching Issue
**File:** `packages/core/src/__tests__/AutomatedLove.integration.test.ts`

```
Line 299: // TODO: Fix this test - vitest appears to have a caching issue
```

---

### TillAction - Placeholder Test Failures
**File:** `packages/core/src/actions/__tests__/TillAction.test.ts`

```
Line 954: expect(true).toBe(false); // Placeholder to fail
Line 960: expect(true).toBe(false); // Placeholder to fail
Line 966: expect(true).toBe(false); // Placeholder to fail
Line 971: expect(true).toBe(false); // Placeholder to fail
Line 999: expect(true).toBe(false); // Placeholder
Line 1008: expect(true).toBe(false); // Placeholder
```

**Impact:** 6 tests intentionally failing as placeholders

---

### StorageDeposit - Missing Event Handler
**File:** `packages/core/src/systems/__tests__/StorageDeposit.test.ts`

```
Line 277: // TODO: Implement inventory:full event handler in AgentBrainSystem to auto-switch to deposit_items behavior
```

---

### ReflectionSystem - LLM Integration
**File:** `packages/core/src/systems/__tests__/ReflectionSystem.test.ts`

```
Line 459: // LLM integration - TODO: Implement LLM-based reflection generation
```

---

### CraftingSystem - ItemInstance Integration
**File:** `packages/core/src/crafting/__tests__/CraftingSystem.test.ts`

```
Line 227: // TODO: Once ItemInstance is implemented:
Line 265: // TODO: Once ItemInstance is implemented:
Line 280: // TODO: Once ItemInstance is implemented:
Line 295: // TODO: Once ItemInstance is implemented:
Line 324: // TODO: Once ItemInstance is implemented, this should throw:
```

---

## Event System Placeholders

### EventMap - Future System Placeholders
**File:** `packages/core/src/events/EventMap.ts`

```
Line 1458: // These events are placeholders for future combat system implementation.

Line 1525: // These events are placeholders for future governance system implementation.

Line 1597: // These events are placeholders for future stress/breakdown system.
```

**Impact:** Event definitions exist but systems not implemented

---

## Dashboard Views

### Multiple Dashboard TODOs
**Files:** Various dashboard view files

```
packages/core/src/dashboard/views/ControlsView.ts - Has TODO
packages/core/src/dashboard/views/AngelsView.ts:133 - Angel component check
packages/core/src/dashboard/views/PantheonView.ts - Has TODO
packages/core/src/dashboard/views/PrayersView.ts - Has TODO
packages/core/src/dashboard/views/TileInspectorView.ts - Has TODO
packages/core/src/dashboard/views/VisionComposerView.ts - Has TODO
packages/core/src/dashboard/views/DeityIdentityView.ts - Has TODO
packages/core/src/dashboard/views/GovernanceView.ts - Has TODO
packages/core/src/dashboard/views/ShopView.ts - Has TODO
packages/core/src/dashboard/views/SpellbookView.ts - Has TODO
```

---

## Behavior System TODOs

```
packages/core/src/behavior/behaviors/ReflectBehavior.ts - Has TODO
packages/core/src/behavior/behaviors/GatherBehavior.ts - Has TODO
packages/core/src/behavior/behaviors/CastSpellBehavior.ts:343
// TODO: Could be made more sophisticated with utility scoring
```

---

## Component TODOs

```
packages/core/src/components/MoodComponent.ts - Has TODO
packages/core/src/components/EquipmentSlotsComponent.ts - Has TODO
packages/core/src/components/SoulWisdomComponent.ts - Has TODO
packages/core/src/components/SoulIdentityComponent.ts - Has TODO
packages/core/src/components/NeedsComponent.ts - Has TODO
```

---

## Divinity System TODOs

```
packages/core/src/divinity/RaceTemplates.ts - Has TODO
packages/core/src/divinity/SoulCreationCeremony.ts - Has TODO
```

---

## Magic System TODOs

```
packages/core/src/magic/ComboDetector.ts - Has TODO
packages/core/src/magic/CreativeParadigms.ts - Has TODO
packages/core/src/magic/SummonableEntities.ts - Has TODO
```

---

## Metrics System TODOs

```
packages/core/src/metrics/MetricsDashboard.ts:600
// Return empty buffer as placeholder
```

---

## Summary Statistics

### By Priority
- **Critical (Systems Disabled):** 3 systems
- **High Priority:** 15+ major gaps
- **Medium Priority:** 30+ feature gaps
- **Low Priority:** 20+ architectural improvements
- **Test Issues:** 25+ test-related TODOs

### By Category
- **Systems:** 10+ incomplete/disabled systems
- **Persistence:** 10+ save/load gaps
- **LLM Integration:** 8+ missing LLM features
- **Components:** 6+ integration gaps
- **Magic System:** 5+ feature gaps
- **Tests:** 25+ test issues
- **Dashboard:** 10+ view TODOs
- **Events:** 3 placeholder event categories

### Total Count
**100+ documented incomplete implementations**

---

## Recommended Action Plan

### Phase 1: Critical (Enable Disabled Systems)
1. Resolve @ai-village/llm dependency
2. Re-enable SoulCreationSystem
3. Complete ItemInstance registry
4. Re-enable EquipmentSystem

### Phase 2: High Priority (Core Gameplay)
5. Implement courtship compatibility calculations
6. Complete persistence/save system
7. Implement pathfinding
8. Fix AutomatedLove relationship API

### Phase 3: Medium Priority (Feature Completion)
9. Add Spirit component to ComponentType enum
10. Implement getMemoriesByType in SpatialMemoryComponent
11. Complete AI god domain-specific actions
12. Implement power grid for reality anchors

### Phase 4: Low Priority (Polish)
13. Implement archetype-based entity creation
14. Add essential entity tracking
15. Clean up test placeholders
16. Complete LLM-based naming features

### Phase 5: Test Cleanup
17. Fix 9 InjurySystem test mismatches
18. Remove 6 TillAction placeholder failures
19. Fix AutomatedLove vitest caching
20. Implement missing event handlers

---

**End of Report**
