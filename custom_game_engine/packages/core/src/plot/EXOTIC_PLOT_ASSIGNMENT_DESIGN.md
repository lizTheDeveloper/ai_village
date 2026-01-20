# Exotic & Epic Plot Assignment System - Design Specification

**Status**: DRAFT - In Plan Mode
**Author**: Claude Code
**Date**: 2026-01-19

## Executive Summary

This design specifies how exotic and epic plot templates are automatically assigned to souls based on game events from divinity, multiverse, magic, time travel, and other advanced systems.

**Core Principle**: Game systems emit events when significant exotic conditions occur. A dedicated `ExoticPlotAssignmentSystem` subscribes to these events and assigns appropriate exotic/epic plots to affected souls.

## Architecture Overview

### Components

1. **ExoticPlotAssignmentSystem** (NEW)
   - Priority: 155 (after EventDrivenPlotAssignment at 150)
   - Throttle: 200 ticks (10 seconds)
   - Subscribes to exotic game events
   - Assigns exotic/epic plots when conditions met

2. **Event Emissions** (EXTEND existing systems)
   - DeityEmergenceSystem → `divinity:deity_relationship_critical`
   - BackgroundUniverseManager → `multiverse:invasion_triggered` (EXISTS)
   - MagicSystem → `magic:paradigm_conflict_detected` (NEW)
   - CompanionSystem → `companion:dimensional_encounter` (NEW)
   - GovernanceSystem → `governance:political_elevation` (NEW)
   - TimeSystem → `time:paradox_detected` (NEW)

3. **Plot Assignment Logic** (NEW)
   - Event → Plot mapping table
   - Soul eligibility checks (wisdom thresholds)
   - Scale limit enforcement (max 1 exotic/epic per soul)
   - Cooldown tracking (prevent spam)

## Event Specifications

### 1. Divine Reckoning (exotic_divine_reckoning)

**Trigger Event**: `divinity:deity_relationship_critical`

**Emitted By**: DeityEmergenceSystem, DivinePowerSystem, PrayerAnsweringSystem

**Event Data**:
```typescript
interface DeityRelationshipCriticalEvent {
  agentId: string;
  soulId: string;
  deityId: string;
  deityName: string;
  relationshipValue: number;  // -100 to 100
  relationshipType: 'favor' | 'disfavor' | 'obsession';
  triggerReason: 'sacrilege' | 'heresy' | 'divine_champion' | 'prayer_answered' | 'miracle_witnessed';
  tick: number;
}
```

**Emission Points**:
- `DeityEmergenceSystem`: When deity first notices an agent (relationship crosses threshold)
- `DivinePowerSystem`: When divine favor/disfavor reaches extreme (|value| > 80)
- `PrayerAnsweringSystem`: When prayer response creates strong relationship

**Assignment Logic**:
```typescript
// Assign if:
- relationshipValue < -60 (divine anger) OR relationshipValue > 80 (divine obsession)
- Soul wisdom >= 20
- Soul does not have active exotic plot
- Cooldown expired (1000 ticks per deity)
```

---

### 2. From Beyond the Veil (exotic_from_beyond_veil)

**Trigger Event**: `multiverse:invasion_triggered` (ALREADY EXISTS)

**Emitted By**: BackgroundUniverseManager

**Event Data** (existing):
```typescript
interface InvasionTriggeredEvent {
  invaderUniverse: string;
  invaderFaction: string;
  invaderPlanet: string;
  targetUniverse: string;
  threatLevel: number;
  estimatedArrivalTime: number;
  culturalTraits: CulturalTraits;
}
```

**Assignment Logic**:
```typescript
// Assign to souls in target universe when invasion begins:
- Random selection: 1-3 souls with wisdom >= 15
- Prefer souls with:
  - Leadership skills
  - Military experience
  - Previous trauma from conflict
- Max 1 per universe per invasion
```

---

### 3. When Magics Collide (exotic_when_magics_collide)

**Trigger Event**: `magic:paradigm_conflict_detected` (NEW)

**Emitted By**: MagicLawEnforcer (when checking paradigm compatibility)

**Event Data**:
```typescript
interface ParadigmConflictDetectedEvent {
  agentId: string;
  paradigm1: string;  // e.g., 'divine'
  paradigm2: string;  // e.g., 'pact'
  conflictSeverity: 'warning' | 'dangerous' | 'catastrophic';
  manifestation: 'spell_failure' | 'backlash' | 'unstable_magic' | 'paradigm_collapse';
  tick: number;
}
```

**Emission Point**:
- `MagicLawEnforcer.validateCast()`: When detecting conflicting paradigms
- `MagicSystem.update()`: When paradigm instability accumulates

**Assignment Logic**:
```typescript
// Assign if:
- conflictSeverity === 'dangerous' OR 'catastrophic'
- Agent has MagicComponent with 2+ active paradigms
- Soul wisdom >= 25
- Has skill: magic_theory >= 3
```

---

### 4. What Dwells Between (exotic_what_dwells_between)

**Trigger Event**: `companion:dimensional_encounter` (NEW)

**Emitted By**: CompanionSystem (when Ophanim/β-space creature encountered)

**Event Data**:
```typescript
interface DimensionalEncounterEvent {
  agentId: string;
  soulId: string;
  creatureId: string;
  creatureType: 'ophanim' | 'dimensional_horror' | 'reality_eater';
  encounterType: 'summoned' | 'accidental_breach' | 'portal_opened';
  sanityDamage: number;
  tick: number;
}
```

**Emission Point**:
- `CompanionSystem`: When Ophanim companion assigned to agent
- `PortalSystem`: When portal to β-space opened
- `MagicSystem`: When summoning spell targets β-space entity

**Assignment Logic**:
```typescript
// Assign if:
- First dimensional encounter for this soul
- sanityDamage > 20 OR creatureType === 'dimensional_horror'
- Soul wisdom >= 10
- No active exotic plot
```

---

### 5. The Tyrant You Became (exotic_tyrant_you_became)

**Trigger Event**: `governance:political_elevation` (NEW)

**Emitted By**: VillageGovernanceSystem, ProvinceGovernanceSystem, GovernanceDataSystem

**Event Data**:
```typescript
interface PoliticalElevationEvent {
  agentId: string;
  soulId: string;
  previousRole: string | null;
  newRole: 'village_leader' | 'province_governor' | 'emperor';
  powerLevel: number;  // 1-100
  subjectCount: number;  // How many agents they rule
  electionType: 'democratic' | 'coup' | 'inheritance' | 'appointment';
  tick: number;
}
```

**Emission Point**:
- `VillageGovernanceSystem`: When leader elected/appointed
- `ProvinceGovernanceSystem`: When governor installed
- `EmpireSystem`: When emperor crowned

**Assignment Logic**:
```typescript
// Assign if:
- powerLevel >= 50 (significant authority)
- subjectCount >= 10
- Soul does not have this plot active
- Wisdom >= 15
```

---

### 6. The Price of Changing Yesterday (exotic_price_changing_yesterday)

**Trigger Event**: `time:paradox_detected` (NEW)

**Emitted By**: TimelineMergerSystem, UniverseForkingSystem, persistence/SaveLoadService

**Event Data**:
```typescript
interface ParadoxDetectedEvent {
  agentId: string;  // Who caused the paradox
  soulId: string;
  paradoxType: 'grandfather' | 'causal_loop' | 'bootstrap' | 'ontological';
  timelineId: string;
  alterationMagnitude: number;  // How big was the change
  affectedSouls: string[];  // Other souls impacted
  tick: number;
}
```

**Emission Point**:
- `UniverseForkingSystem.forkUniverse()`: When timeline diverges
- `TimelineMergerSystem`: When timelines merge and conflicts detected
- `SaveLoadService.load()`: When loading creates timeline branch

**Assignment Logic**:
```typescript
// Assign if:
- Agent caused the paradox (not just affected by it)
- alterationMagnitude > 0.7
- Soul has performed 2+ time manipulations
- Wisdom >= 30
```

---

### 7. The Prophecy Trap (exotic_prophecy_trap)

**Trigger Event**: `divinity:prophecy_given` (NEW)

**Emitted By**: DivinePowerSystem, PrayerAnsweringSystem, HolyTextSystem

**Event Data**:
```typescript
interface ProphecyGivenEvent {
  recipientId: string;
  soulId: string;
  deityId: string;
  prophecyText: string;
  prophecyType: 'destiny' | 'warning' | 'doom' | 'blessing';
  inevitability: number;  // 0-1 (how fixed is the future?)
  timeframe: number;  // Ticks until prophecy should fulfill
  tick: number;
}
```

**Emission Point**:
- `PrayerAnsweringSystem`: When deity reveals prophecy via prayer answer
- `HolyTextSystem`: When holy text contains prophecy
- `DivinePowerSystem.usePower()`: When deity uses 'Prophecy' power

**Assignment Logic**:
```typescript
// Assign if:
- inevitability > 0.7 (strong prophecy)
- Soul wisdom >= 25
- Agent has relationship with deity that gave prophecy
```

---

### 8. The Burden of Being Chosen (exotic_burden_being_chosen)

**Trigger Event**: `divinity:champion_chosen` (NEW)

**Emitted By**: DivinePowerSystem, AvatarSystem

**Event Data**:
```typescript
interface ChampionChosenEvent {
  championId: string;
  soulId: string;
  deityId: string;
  deityName: string;
  champType: 'avatar' | 'prophet' | 'warrior' | 'saint';
  dutiesAssigned: string[];
  powerGranted: number;  // Divine power level
  tick: number;
}
```

**Emission Point**:
- `DivinePowerSystem`: When deity chooses champion
- `AvatarSystem`: When agent becomes deity avatar

**Assignment Logic**:
```typescript
// Assign immediately when chosen
- No wisdom requirement (being chosen is the requirement)
- Replace any active small/medium plots
- This is a life-defining event
```

---

## Epic Ascension Plot Assignment

Epic plots are NOT event-driven. They are assigned by wisdom threshold progression:

### Assignment Trigger
- Soul reaches wisdom >= 100
- Soul has completed 5+ large-scale plots
- No active epic plot
- Check every 1000 ticks via periodic scan

### Template Selection
```typescript
// Based on soul's accumulated lessons and affinities:
if (soul.lessons_learned.includes('nature_harmony') && hasSkill('druidry')) {
  → The Endless Summer (Fae Ascension)
} else if (soul.lessons_learned.includes('purity') && hasRelationship('deity', trust > 90)) {
  → The Enochian Ascension (Angel Path)
} else if (soul.lessons_learned.includes('family_creation') && hasDescendants > 10) {
  → The Exaltation Path (Mormon Godhood)
}
```

---

## Implementation Plan

### Phase 1: Event Infrastructure (Week 1)
- [ ] Add new event type definitions to EventMap
- [ ] Implement event emission in game systems:
  - [ ] DeityEmergenceSystem → divinity:deity_relationship_critical
  - [ ] MagicLawEnforcer → magic:paradigm_conflict_detected
  - [ ] CompanionSystem → companion:dimensional_encounter
  - [ ] VillageGovernanceSystem → governance:political_elevation
  - [ ] UniverseForkingSystem → time:paradox_detected
  - [ ] DivinePowerSystem → divinity:prophecy_given
  - [ ] AvatarSystem → divinity:champion_chosen

### Phase 2: ExoticPlotAssignmentSystem (Week 1-2)
- [ ] Create ExoticPlotAssignmentSystem class
- [ ] Implement event subscription handlers
- [ ] Implement eligibility checking
- [ ] Implement cooldown tracking
- [ ] Implement scale limit enforcement
- [ ] Add to system registry

### Phase 3: Epic Plot Assignment (Week 2)
- [ ] Add epic plot scanning to PlotAssignmentSystem
- [ ] Implement wisdom threshold check (>= 100)
- [ ] Implement template selection algorithm
- [ ] Add to periodic update loop

### Phase 4: Testing & Tuning (Week 3)
- [ ] Unit tests for each event handler
- [ ] Integration tests for full assignment flow
- [ ] Playtest exotic plots trigger correctly
- [ ] Balance cooldowns and thresholds
- [ ] Monitor plot assignment rates

### Phase 5: Dashboard & Visibility (Week 3)
- [ ] Add exotic plot tracking to Admin Dashboard
- [ ] Add event emission logging
- [ ] Create plot assignment metrics
- [ ] Add debug tools for testing exotic triggers

---

## Code Structure

```
packages/core/src/plot/
├── ExoticPlotAssignmentSystem.ts  (NEW - main system)
├── ExoticPlotEventHandlers.ts     (NEW - event handling logic)
├── EpicPlotScanner.ts              (NEW - wisdom threshold scanner)
└── PlotAssignmentShared.ts         (NEW - shared eligibility logic)

packages/core/src/events/domains/
├── DivinityEvents.ts               (EXTEND - add new divinity events)
├── MagicEvents.ts                  (EXTEND - add paradigm conflict)
├── MultiverseEvents.ts             (EXISTS - invasion event)
├── GovernanceEvents.ts             (EXTEND - add political elevation)
└── TimeEvents.ts                   (EXTEND - add paradox detection)

packages/core/src/systems/
├── DeityEmergenceSystem.ts         (EXTEND - emit relationship events)
├── DivinePowerSystem.ts            (EXTEND - emit prophecy/champion events)
├── MagicLawEnforcer.ts             (EXTEND - emit conflict events)
├── CompanionSystem.ts              (EXTEND - emit dimensional encounter)
├── VillageGovernanceSystem.ts      (EXTEND - emit political events)
├── UniverseForkingSystem.ts        (EXTEND - emit paradox events)
└── AvatarSystem.ts                 (EXTEND - emit champion events)
```

---

## Alternative Approaches Considered

### Option A: Extend EventDrivenPlotAssignmentSystem
**Pros**: Single unified plot assignment system
**Cons**: System becomes very large; exotic logic is fundamentally different from emotion-based triggers
**Decision**: REJECTED - Exotic plots need specialized handling

### Option B: Manual Assignment in Each Game System
**Pros**: Tight coupling; immediate assignment
**Cons**: Systems become aware of plot system; harder to maintain; logic scattered
**Decision**: REJECTED - Violates separation of concerns

### Option C: Hybrid - Some Events, Some Manual
**Pros**: Flexibility
**Cons**: Inconsistent; hard to understand where assignment happens
**Decision**: REJECTED - Need consistent architecture

### Option D: Event-Driven with Dedicated System (CHOSEN)
**Pros**: Clean separation; extensible; consistent pattern; centralized logic
**Cons**: Requires defining new events; slightly more code
**Decision**: ACCEPTED - Best architecture for maintainability

---

## Performance Considerations

### Event Frequency
- Most exotic events are RARE (< 1 per minute game time)
- Invasion: ~1 per 10 minutes
- Deity relationship: ~5-10 per hour
- Paradigm conflict: ~1-2 per hour
- Dimensional encounter: ~1 per 30 minutes

**Impact**: Negligible - exotic events are infrequent by design

### System Throttling
- ExoticPlotAssignmentSystem throttled to 200 ticks (10 seconds)
- Only processes events accumulated since last update
- Event queue bounded by natural rarity

**Impact**: ~0.1ms per update (negligible)

### Scale Limits
- Max 1 exotic plot per soul
- Max 1 epic plot per soul
- Checking requires scanning PlotLinesComponent

**Optimization**: Cache active exotic/epic count per soul

---

## Open Questions

1. **Should exotic plots be cancellable?**
   - Proposal: Yes, via specific plot stage transitions (exile, divine forgiveness, etc.)
   - Need clear "escape hatch" stages

2. **Can multiple exotic plots of DIFFERENT types be active?**
   - Current spec: No - max 1 exotic total
   - Alternative: Max 1 per category (divine, multiverse, magic, etc.)
   - **Decision needed from user**

3. **How do exotic plots interact with epic plots?**
   - Can soul have 1 exotic + 1 epic simultaneously?
   - Or is epic exclusive?
   - **Proposal**: Epic exclusive (replaces all other plots)

4. **Should there be exotic plot "cooldown per soul" or "per universe"?**
   - Prevents same soul getting Divine Reckoning repeatedly
   - But universe-level prevents spam across all souls
   - **Proposal**: Both - 5000 tick soul cooldown, 1000 tick event cooldown

---

## Success Metrics

### Assignment Rates (Target)
- Divine Reckoning: 1-2 assignments per 1000 souls
- From Beyond Veil: 2-3 per invasion event
- When Magics Collide: 1-2 per 500 mages
- What Dwells Between: 1 per 10 dimensional encounters
- Tyrant You Became: 50% of political leaders
- Price of Yesterday: 1-2 per timeline fork
- Prophecy Trap: 30% of divine prophecies
- Burden of Chosen: 100% of divine champions

### Completion Rates (Target)
- 30% complete successfully
- 40% abandon/fail
- 30% ongoing across lifetimes

### Player Feedback
- Exotic plots feel rare and significant
- Events triggering plots make narrative sense
- Plot progressions are engaging

---

## Next Steps

1. **User Review**: Get approval on overall architecture
2. **Clarify Open Questions**: Resolve exotic plot exclusivity, cooldowns
3. **Implementation Priority**: Which exotic plots to implement first?
4. **Testing Strategy**: How to trigger exotic events in development?

---

## Appendix: Event Emission Examples

### Example 1: Divine Reckoning Trigger
```typescript
// In DivinePowerSystem.updateDeityRelationship()
if (Math.abs(relationship.favorValue) > 80) {
  this.events.emit('divinity:deity_relationship_critical', {
    agentId: agent.id,
    soulId: soul.true_name,
    deityId: deity.id,
    deityName: deity.identity.primaryName,
    relationshipValue: relationship.favorValue,
    relationshipType: relationship.favorValue > 0 ? 'obsession' : 'disfavor',
    triggerReason: determineReason(relationship),
    tick: this.world.tick,
  });
}
```

### Example 2: Paradigm Conflict Trigger
```typescript
// In MagicLawEnforcer.validateCast()
if (this.detectParadigmConflict(caster, spell)) {
  this.events.emit('magic:paradigm_conflict_detected', {
    agentId: caster.id,
    paradigm1: activePara digms[0],
    paradigm2: conflictingParadigm,
    conflictSeverity: this.assessConflictSeverity(),
    manifestation: 'spell_failure',
    tick: this.world.tick,
  });
}
```

### Example 3: Invasion Assignment
```typescript
// In ExoticPlotAssignmentSystem.handleInvasionEvent()
private handleInvasionEvent(event: InvasionTriggeredEvent): void {
  const targetSouls = this.findEligibleSoulsInUniverse(event.targetUniverse, {
    minWisdom: 15,
    preferredSkills: ['leadership', 'combat'],
    maxAssignments: 3,
  });

  for (const soul of targetSouls) {
    this.assignExoticPlot(soul, 'exotic_from_beyond_veil', {
      invaderUniverse: event.invaderUniverse,
      threatLevel: event.threatLevel,
    });
  }
}
```
