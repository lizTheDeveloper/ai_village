# Proposal: Work Order: Threat Detection System - TypeScript Fixes & Integration

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/threat-detection-system

---

## Original Work Order

# Work Order: Threat Detection System - TypeScript Fixes & Integration

**Phase:** Combat Enhancement
**Created:** 2026-01-02
**Status:** PENDING_IMPLEMENTATION
**Priority:** HIGH

---

## Spec Reference

- **Design Doc:** [custom_game_engine/THREAT_DETECTION_SYSTEM.md](../../../../custom_game_engine/THREAT_DETECTION_SYSTEM.md)
- **Session Summary:** [custom_game_engine/SESSION_SUMMARY.md](../../../../custom_game_engine/SESSION_SUMMARY.md)
- **Related Systems:**
  - Combat System (AgentCombatSystem)
  - Personality Component (Big Five traits)
  - Equipment Component (combat stats)
  - Navigation System (flee/cover pathfinding)

---

## Context

The Threat Detection System was **designed on 2026-01-01** with comprehensive auto-response behaviors (flee, attack, seek cover, stand ground). The implementation exists but has **TypeScript compilation errors** that must be fixed before integration.

**Current Status:**
- ✅ Design complete with decision matrix
- ✅ Components created (ThreatDetectionComponent, ThreatResponseSystem)
- ❌ TypeScript errors prevent compilation
- ❌ Not integrated into main game loop

---

## Requirements Summary

### Feature 1: Auto-Flee Response
Agents automatically flee when critically outmatched:
1. Detect power differential < -30 (critical threat)
2. Check agent courage (low courage → flee)
3. Calculate flee direction (perpendicular to threat)
4. Navigate away from threat
5. Emit `threat:auto_response` event

### Feature 2: Auto-Attack Response
Agents automatically attack when they can win:
1. Detect power differential > +15 (can win)
2. Check agent aggression (high aggression → attack)
3. Initiate combat with target
4. Emit `threat:auto_response` event

### Feature 3: Seek Cover Response
Agents seek cover from ranged/magic threats:
1. Detect ranged or magic attack type
2. Find nearest building with cover
3. Navigate to cover position
4. Emit `threat:auto_response` event

### Feature 4: Stand Ground Response
Agents hold position in even matchups:
1. Detect power differential ±15 (even match)
2. Maintain defensive stance
3. Monitor threat continuously

---

## Required Fixes

### Fix 1: Component Import Path
**File:** `packages/core/src/components/ThreatDetectionComponent.ts`
**Line:** 11
**Error:** `Cannot find module './Component.js'`
**Fix:**
```typescript
// WRONG
import type { Component } from './Component.js';

// CORRECT
import type { Component } from '../ecs/Component.js';
```

### Fix 2: Add Version Property
**File:** `packages/core/src/components/ThreatDetectionComponent.ts`
**Error:** Missing required `version` field
**Fix:**
```typescript
export interface ThreatDetectionComponent extends Component {
  type: 'threat_detection';
  version: 1;  // ADD THIS
  // ... rest of properties
}
```

### Fix 3: Map Personality Traits
**File:** `packages/core/src/systems/ThreatResponseSystem.ts`
**Error:** PersonalityComponent doesn't have `courage` or `aggression` properties
**Fix:**
```typescript
// Map Big Five traits to game concepts
const personality = entity.getComponent(CT.Personality);
if (!personality) return;

// Courage = low neuroticism (resilient = brave)
const courage = 1 - (personality.neuroticism ?? 0.5);

// Aggression = low agreeableness (competitive = aggressive)
const aggression = 1 - (personality.agreeableness ?? 0.5);
```

### Fix 4: CombatStatsComponent Check
**File:** `packages/core/src/systems/ThreatResponseSystem.ts`
**Error:** CombatStatsComponent may not exist
**Fix:**
- Check if CombatStatsComponent exists
- If not, calculate power from SkillsComponent combat skill
- Use equipment defense values if available

### Fix 5: Use EntityImpl for updateComponent
**File:** `packages/core/src/systems/ThreatResponseSystem.ts`
**Error:** Entity type doesn't have `updateComponent` method
**Fix:**
```typescript
import { EntityImpl } from '../ecs/Entity.js';

// Cast when needed:
(entity as EntityImpl).updateComponent(CT.Agent, ...);
```

### Fix 6: Add Event Type to EventMap
**File:** `packages/core/src/events/EventMap.ts`
**Error:** `threat:auto_response` event not in EventMap
**Fix:**
```typescript
'threat:auto_response': {
  agentId: string;
  response: 'flee' | 'attack' | 'seek_cover' | 'stand_ground';
  targetId?: string;
  reason: string;
};
```

---

## Acceptance Criteria

### Criterion 1: TypeScript Compilation
- **WHEN:** The code is compiled
- **THEN:** The system SHALL:
  1. Compile without errors
  2. Pass all type checks
  3. Have no missing imports
  4. Have all required component properties
- **Verification:**
  - Run `npm run build` in custom_game_engine
  - Zero TypeScript errors
  - ThreatDetectionComponent and ThreatResponseSystem compile successfully

### Criterion 2: Auto-Flee Behavior
- **WHEN:** A weak agent encounters a strong threat
- **THEN:** The system SHALL:
  1. Calculate power differential (< -30 = critical threat)
  2. Check agent courage (< 0.9 triggers flee)
  3. Calculate flee direction perpendicular to threat
  4. Navigate agent away from threat
  5. Emit `threat:auto_response` event with reason
- **Verification:**
  - Weak agent (power 10, courage 0.5) vs strong enemy (power 50)
  - Power diff = -40 (critical)
  - Agent automatically flees
  - Event emitted: `{response: 'flee', reason: 'Critical threat detected'}`

### Criterion 3: Auto-Attack Behavior
- **WHEN:** An aggressive agent encounters a weak target
- **THEN:** The system SHALL:
  1. Calculate power differential (> +15 = can win)
  2. Check agent aggression (> 0.5 triggers attack)
  3. Initiate combat with target
  4. Emit `threat:auto_response` event
- **Verification:**
  - Strong agent (power 50, aggression 0.7) vs weak enemy (power 20)
  - Power diff = +30 (can win)
  - Agent automatically attacks
  - Event emitted: `{response: 'attack', targetId: '...'}`

### Criterion 4: Seek Cover from Ranged Threats
- **WHEN:** An agent detects a ranged or magic threat
- **THEN:** The system SHALL:
  1. Identify threat as ranged/magic attack type
  2. Find nearest building within vision
  3. Calculate path to building
  4. Navigate to cover position
  5. Emit `threat:auto_response` event
- **Verification:**
  - Agent sees ranged attacker
  - Building within 10 tiles
  - Agent pathfinds to building
  - Event emitted: `{response: 'seek_cover', reason: 'Ranged threat'}`

### Criterion 5: Stand Ground in Even Matchup
- **WHEN:** An agent faces an evenly matched opponent
- **THEN:** The system SHALL:
  1. Calculate power differential (±15 = even)
  2. Not trigger flee or attack
  3. Set response to 'stand_ground'
  4. Continue monitoring threat
- **Verification:**
  - Two agents with power 40 and 45 (diff = 5)
  - Neither flees nor attacks automatically
  - Response = 'stand_ground'

### Criterion 6: Personality-Driven Decisions
- **WHEN:** Multiple agents face the same threat
- **THEN:** The system SHALL:
  1. Map Big Five traits to courage/aggression
  2. Brave agents (low neuroticism) stand ground longer
  3. Aggressive agents (low agreeableness) attack more readily
  4. Different agents make different choices
- **Verification:**
  - Agent A (neuroticism 0.8, agreeableness 0.8) → flees easily, doesn't attack
  - Agent B (neuroticism 0.2, agreeableness 0.2) → brave, aggressive
  - Same threat produces different responses

---

## Implementation Steps

1. **Fix TypeScript Errors** (2-3 hours)
   - Fix import paths in ThreatDetectionComponent
   - Add version property to component
   - Map personality traits in ThreatResponseSystem
   - Add EntityImpl casting where needed
   - Add event type to EventMap
   - Verify compilation with `npm run build`

2. **Register System** (30 minutes)
   - Add ThreatResponseSystem to registerAllSystems()
   - Set priority (should run before movement, after perception)
   - Add ThreatDetection to ComponentType enum (already done)

3. **Integration Testing** (1-2 hours)
   - Create test scenario: weak agent vs strong enemy
   - Verify auto-flee triggers correctly
   - Create test scenario: strong agent vs weak enemy
   - Verify auto-attack triggers correctly
   - Create test scenario: ranged attacker
   - Verify seek-cover triggers correctly

4. **Power Calculation Tuning** (1 hour)
   - Verify power calculation matches design
   - Test with various equipment combinations
   - Ensure balanced threat detection thresholds

5. **Event Integration** (30 minutes)
   - Verify events emit correctly
   - Check dashboard shows threat responses
   - Ensure events integrate with metrics collection

---

## Testing Plan

### Unit Tests
- Test power differential calculation
- Test personality trait mapping (neuroticism → courage)
- Test flee direction calculation (perpendicular to threat)
- Test cover-finding algorithm (nearest building)

### Integration Tests
- Test full auto-flee sequence with navigation
- Test full auto-attack sequence with combat initiation
- Test full seek-cover sequence with pathfinding
- Test stand-ground with no action taken

### Scenario Tests
1. **Survival Scenario**: 5 weak agents vs 1 strong predator
   - Verify all weak agents flee
   - Verify brave agents flee less readily

2. **Aggressive Scenario**: 1 strong hunter vs 5 weak prey
   - Verify hunter attacks weak targets
   - Verify prey flee when detected

3. **Tactical Scenario**: Agents with buildings nearby
   - Verify agents use cover against ranged threats
   - Verify agents don't seek cover for melee threats

---

## Performance Requirements

- **Update Throttling**: Every 5 ticks (0.25s) per agent
- **Scan Throttling**: Every 10 ticks (0.5s) for new threats
- **Distance Calculations**: Use squared distance (no Math.sqrt)
- **Vision Queries**: Cache results, don't re-query per tick
- **Max Threat Tracking**: 5 threats per agent maximum

---

## Success Metrics

1. ✅ Zero TypeScript compilation errors
2. ✅ All 6 acceptance criteria met
3. ✅ Performance within budget (< 0.5ms per agent per scan)
4. ✅ Events emit correctly to dashboard
5. ✅ Integration tests pass (flee, attack, cover scenarios)
6. ✅ Agents make personality-driven decisions

---

## Dependencies

- ✅ PersonalityComponent (Big Five traits)
- ✅ SkillsComponent (combat skill)
- ⚠️ EquipmentComponent (exists but combat integration pending)
- ✅ VisionComponent (threat detection)
- ✅ NavigationSystem (flee/cover pathfinding)
- ✅ AgentCombatSystem (attack initiation)

---

## Implementation Checklist

### Phase 1: TypeScript Compilation Fixes (Priority: CRITICAL)
- [ ] Fix Component import path in `packages/core/src/components/ThreatDetectionComponent.ts`
  - Change `'./Component.js'` to `'../ecs/Component.js'`
- [ ] Add `version: 1` property to ThreatDetectionComponent interface
- [ ] Update `packages/core/src/types/ComponentType.ts` if ThreatDetection not already added
- [ ] Run `npm run build` and verify zero TypeScript errors

### Phase 2: System Logic Fixes
- [ ] Map personality traits in `packages/core/src/systems/ThreatResponseSystem.ts`
  - Calculate courage from `1 - neuroticism`
  - Calculate aggression from `1 - agreeableness`
- [ ] Add CombatStatsComponent existence check
  - Fallback to SkillsComponent combat skill if CombatStatsComponent missing
- [ ] Add EntityImpl casting for `updateComponent` calls
  - Import `EntityImpl` from `'../ecs/Entity.js'`
  - Cast: `(entity as EntityImpl).updateComponent(...)`
- [ ] Add `threat:auto_response` event to `packages/core/src/events/EventMap.ts`

### Phase 3: System Registration
- [ ] Add ThreatResponseSystem to `packages/core/src/systems/registerAllSystems.ts`
- [ ] Set priority (after perception, before movement): ~950
- [ ] Verify system appears in dashboard system list

### Phase 4: Integration Testing
- [ ] Create test scenario: weak agent vs strong enemy
  - Spawn agent (power 10, courage 0.5)
  - Spawn enemy (power 50)
  - Verify agent flees
- [ ] Create test scenario: strong agent vs weak enemy
  - Spawn agent (power 50, aggression 0.7)
  - Spawn enemy (power 20)
  - Verify agent attacks
- [ ] Create test scenario: ranged threat + building
  - Spawn ranged attacker
  - Place building nearby
  - Verify agent seeks cover
- [ ] Verify event emission to dashboard

### Phase 5: Performance Validation
- [ ] Measure ThreatResponseSystem tick time (< 0.5ms per agent)
- [ ] Verify query caching (don't re-query every tick)
- [ ] Verify distance calculations use squared distance
- [ ] Check max threat tracking limit (5 threats per agent)

---

## Test Requirements

### Unit Tests (Create: `packages/core/src/systems/__tests__/ThreatResponseSystem.test.ts`)
- [ ] **Test:** Power differential calculation
  - Given: Agent power 30, threat power 60
  - When: Calculate differential
  - Then: Result is -30 (critical threat)
- [ ] **Test:** Courage mapping from neuroticism
  - Given: Agent neuroticism 0.8 (high neuroticism)
  - When: Map to courage
  - Then: Courage = 0.2 (low courage → flees easily)
- [ ] **Test:** Aggression mapping from agreeableness
  - Given: Agent agreeableness 0.2 (low agreeableness)
  - When: Map to aggression
  - Then: Aggression = 0.8 (high aggression → attacks readily)
- [ ] **Test:** Flee direction calculation
  - Given: Agent at (10, 10), threat at (15, 10)
  - When: Calculate flee direction
  - Then: Direction perpendicular to threat vector
- [ ] **Test:** Cover finding algorithm
  - Given: Agent at (10, 10), building at (12, 12)
  - When: Find nearest cover
  - Then: Returns building at (12, 12)

### Integration Tests (Create: `packages/core/src/systems/__tests__/ThreatResponseIntegration.test.ts`)
- [ ] **Test:** Full auto-flee sequence
  - Given: Weak agent, strong threat
  - When: Threat detected
  - Then: Agent navigates away, event emitted
- [ ] **Test:** Full auto-attack sequence
  - Given: Strong agent, weak threat
  - When: Threat detected
  - Then: Combat initiated, event emitted
- [ ] **Test:** Full seek-cover sequence
  - Given: Agent, ranged threat, building nearby
  - When: Ranged threat detected
  - Then: Agent pathfinds to building, event emitted
- [ ] **Test:** Stand-ground response
  - Given: Two evenly matched agents (power diff ±15)
  - When: Threats detected
  - Then: Neither flees nor attacks automatically

### Manual Test Scenarios
1. **Survival Scenario**: 5 weak agents vs 1 strong predator
   - Verify all weak agents flee
   - Verify brave agents (low neuroticism) flee less readily
   - Check event dashboard shows flee responses

2. **Aggressive Scenario**: 1 strong hunter vs 5 weak prey
   - Verify hunter attacks weak targets
   - Verify prey flee when detected
   - Check power differentials trigger correctly

3. **Tactical Scenario**: Agents with buildings nearby
   - Verify agents use cover against ranged threats
   - Verify agents don't seek cover for melee threats
   - Check pathfinding to buildings works

---

## Definition of Done

- [ ] **All implementation tasks complete**
  - All TypeScript errors fixed
  - All system logic corrections applied
  - System registered in game loop

- [ ] **Unit tests passing**
  - All 5 unit tests written and passing
  - Code coverage > 80% for ThreatResponseSystem

- [ ] **Integration tests passing**
  - All 4 integration tests written and passing
  - Tests cover flee, attack, cover, stand-ground

- [ ] **Manual testing complete**
  - All 3 manual scenarios tested
  - Screenshots/videos captured
  - No unexpected behaviors observed

- [ ] **Documentation updated**
  - THREAT_DETECTION_SYSTEM.md updated with implementation notes
  - Code comments added to complex logic
  - Event types documented in EventMap

- [ ] **No TypeScript errors**
  - `npm run build` passes with zero errors
  - No `any` types introduced
  - All interfaces properly exported

- [ ] **Performance validated**
  - ThreatResponseSystem tick time < 0.5ms per agent
  - Query caching verified
  - Distance calculations use squared distance
  - Dashboard shows system performance metrics

---

## Pre-Test Checklist (N/A - Status: PENDING_IMPLEMENTATION)

_This section applies only to READY_FOR_TESTS status._

---

## Notes

- This system was designed on 2026-01-01 but blocked on TypeScript errors
- Once TypeScript fixes are applied, integration should be straightforward
- Consider adding projectile detection when ProjectileComponent exists
- Consider group morale when multiple agents present
- Future enhancement: Tactical positioning (flanking, high ground)


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated
