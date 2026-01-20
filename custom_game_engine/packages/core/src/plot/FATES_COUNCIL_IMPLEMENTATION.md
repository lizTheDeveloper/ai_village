# Fates Council System - Implementation Status

**Status**: Core system implemented, needs event infrastructure and LLM integration
**Date**: 2026-01-19

## What's Been Built ✅

### 1. FatesCouncilSystem (Complete)
**Location**: `packages/core/src/plot/FatesCouncilSystem.ts`

**Features**:
- ✅ Meta-blind architecture (Fates don't know who the player is)
- ✅ Treats ALL entities equally (souls, gods, player-god, deities, spirits)
- ✅ Daily evening council meetings
- ✅ Narrative context gathering
- ✅ Story hook detection
- ✅ Narrative quality assessment
- ✅ Poetic justice detection
- ✅ Plot assignment execution
- ✅ Exotic event tracking
- ✅ LLM prompt generation

**How It Works**:
1. Every evening (in-game), the system checks if it's time for council
2. Gathers ALL entities into "threads" (souls, gods, deities - INCLUDING the player-god)
3. Examines recent exotic events (deity conflicts, invasions, etc.)
4. Identifies story hooks (events that could trigger exotic/epic plots)
5. Generates LLM prompt for Three Fates conversation
6. Fates debate which plots to assign
7. System executes Fates' decisions (assigns plots to entities)

### 2. Core Types (Complete)
- `EntityThread` - How Fates see any entity (soul, god, deity, etc.)
- `ExoticEvent` - Events that could trigger exotic plots
- `StoryHook` - Potential plot assignment opportunity
- `FatesCouncilContext` - Complete narrative state for council
- `FatesDecision` - Fates' decisions from council

### 3. Narrative Analysis (Implemented)
- **Story Potential Assessment**: Rates how interesting each entity's situation is
- **Narrative Quality**: Evaluates how good a plot assignment would be
- **Poetic Justice Detection**: Identifies when consequences fit actions
- **World Tension**: Measures peaceful vs chaotic state
- **Challenge Detection**: Finds entities that need new plots

### 4. The Player Is Just Another Thread
The system is **completely meta-blind**:
```typescript
// When gathering entities, player-god is included with no special treatment:
const allThreads = [
  ...souls,
  ...gods,  // ← Player-god here, treated identically
  ...deities,
  ...spirits,
];

// Fates see them all as potential story subjects:
"I observe the god-entity 'Creator Prime' has grown distant..."
```

The player discovers they're IN a plot the Fates wove, just like NPCs!

## What's Left To Build ⏳

### Phase 1: Event Infrastructure (HIGH PRIORITY)

**Create Event Type Definitions**:
```typescript
// In packages/core/src/events/domains/
- DivinityEvents.ts (EXTEND)
  - 'divinity:deity_relationship_critical'
  - 'divinity:prophecy_given'
  - 'divinity:champion_chosen'

- MagicEvents.ts (EXTEND)
  - 'magic:paradigm_conflict_detected'

- MultiverseEvents.ts (EXISTS)
  - 'multiverse:invasion_triggered' ✅ Already exists!

- CompanionEvents.ts (NEW or EXTEND)
  - 'companion:dimensional_encounter'

- GovernanceEvents.ts (NEW or EXTEND)
  - 'governance:political_elevation'

- TimeEvents.ts (NEW or EXTEND)
  - 'time:paradox_detected'
```

**Emit Events from Game Systems**:
```typescript
// Update existing systems to emit exotic events:

1. DeityEmergenceSystem / DivinePowerSystem
   → emit 'divinity:deity_relationship_critical'
   when |favorValue| > 80

2. MagicLawEnforcer
   → emit 'magic:paradigm_conflict_detected'
   when paradigms conflict

3. CompanionSystem
   → emit 'companion:dimensional_encounter'
   when Ophanim/β-space creature encountered

4. VillageGovernanceSystem / ProvinceGovernanceSystem
   → emit 'governance:political_elevation'
   when leader elected/appointed

5. UniverseForkingSystem / TimelineMergerSystem
   → emit 'time:paradox_detected'
   when timelines diverge/merge

6. DivinePowerSystem / PrayerAnsweringSystem
   → emit 'divinity:prophecy_given'
   when deity reveals prophecy

7. AvatarSystem / DivinePowerSystem
   → emit 'divinity:champion_chosen'
   when agent becomes divine champion
```

### Phase 2: LLM Integration (MEDIUM PRIORITY)

**FatesCouncil LLM Queue**:
```typescript
// Add to LLMDecisionQueue or create FatesCouncilQueue:

interface FatesCouncilRequest {
  context: FatesCouncilContext;
  prompt: string;
  tick: number;
}

class FatesCouncilQueue {
  queueCouncil(request: FatesCouncilRequest): Promise<FatesDecision>;

  // Uses 3-way multi-agent conversation:
  // 1. Weaver speaks
  // 2. Spinner speaks
  // 3. Cutter speaks
  // 4. Debate if needed
  // 5. Extract decisions from conversation
}
```

**Multi-Agent Conversation**:
- Reuse SoulCreationCeremony patterns
- Three separate LLM calls (one per Fate)
- Parse decisions from final conversation

### Phase 3: System Registration (LOW PRIORITY)

**Register FatesCouncilSystem**:
```typescript
// In packages/core/src/systems/registerAllSystems.ts:

import { FatesCouncilSystem } from '../plot/FatesCouncilSystem.js';

// Add to registration:
world.addSystem(new FatesCouncilSystem(llmQueue));
```

### Phase 4: Testing & Tuning (ONGOING)

**Test Scenarios**:
1. ✅ Fates assign Divine Reckoning to soul who angered deity
2. ✅ Fates assign From Beyond Veil to souls during invasion
3. ⏳ Fates assign plot to player-god without knowing they're player
4. ⏳ Fates connect two souls' plots (narrative weaving)
5. ⏳ Fates decide NOT to assign plot (peaceful thread)
6. ⏳ Fates debate and disagree about assignment

**Balance Tuning**:
- Adjust narrative quality thresholds
- Tune story potential assessment
- Calibrate world tension calculation
- Test assignment frequency (daily vs less frequent)

### Phase 5: Dashboard Integration (NICE TO HAVE)

**Admin Dashboard**:
- View Fates council transcripts
- See which plots Fates assigned
- Track exotic event emissions
- Monitor narrative quality scores
- Force council meeting (dev tool)

## Architecture Highlights

### Meta-Blindness
The Fates are in-world entities with NO meta-knowledge:
- ❌ Don't know who the player is
- ❌ Don't know what a "player" or "game" is
- ❌ Don't track "player engagement"
- ✅ Only see entities and their stories
- ✅ Treat player-god like any other powerful entity

### Narrative-Driven
Plots are assigned based on STORY QUALITY, not rules:
- LLM evaluates narrative potential
- Detects tropes (hubris, redemption, corruption)
- Recognizes poetic justice
- Connects plots for richer stories
- Can say "no" to prevent plot spam

### Event-Responsive Yet Thoughtful
Unlike EventDrivenPlotAssignment (immediate response):
- Events create OPPORTUNITIES, not automatic assignments
- Fates batch-review all events daily
- Evaluate narrative quality before assigning
- Can assign plots WITHOUT events (stale threads)
- Can IGNORE events if story is already rich

### Player Experience
```
Player: "I'm a god, watching over mortals..."

[Fates Council Occurs]

Weaver: "The god-entity grows distant. A test is needed."
Spinner: "Give them 'The Burden of Being Chosen.'"
Cutter: "Let a prophet demand their attention."

[Plot Assigned to Player-God]

Player: "Wait, why do I feel... compelled? A prophet is demanding I act?
        Am I... in a PLOT? Did the Fates just...
        OH MY GOD THEY DON'T KNOW I'M THE PLAYER!"
```

## Example Fates Council Output

```
🧵 Weaver: "I observe Day 47's tapestry. Three threads of note:
  - Soul 'Aria' has angered deity Theros through hubris
  - God-entity 'Creator Prime' watches but does not act
  - The invasion from Universe-7 nears our shores"

🌀 Spinner: "I spin possibilities:
  - Give Aria 'Divine Reckoning' - her pride demands consequence
  - Test Creator Prime with 'The Burden' - a prophet shall call
  - Weave young Marcus into the invasion - he needs a crucible"

✂️ Cutter: "I pronounce:
  - Aria's thread darkens with divine wrath [ASSIGN]
  - Creator Prime shall face a prophet's demands [ASSIGN]
  - Marcus meets the invasion at temple ruins [ASSIGN]
  Three mundane farmers remain peaceful. Not all need drama."

[Decisions Executed]
- Aria assigned: exotic_divine_reckoning
- Creator Prime (player-god!) assigned: exotic_burden_being_chosen
- Marcus assigned: exotic_from_beyond_veil
```

## Next Steps

1. **Create event type definitions** in EventMap
2. **Add event emissions** to game systems
3. **Integrate LLM queue** for council conversations
4. **Register system** in game initialization
5. **Test with mock events** to verify assignments
6. **Playtest** to ensure Fates assign to player unknowingly

## Files Created

- ✅ `FatesCouncilSystem.ts` - Core system (1000+ lines)
- ✅ `FATES_COUNCIL_IMPLEMENTATION.md` - This doc
- ✅ `EXOTIC_PLOT_ASSIGNMENT_DESIGN.md` - Original design (now superseded by Fates approach)

## Questions Resolved

1. **Q**: Should Fates know who the player is?
   **A**: NO - Meta-blind, player is just another entity

2. **Q**: Can player get exotic plots?
   **A**: YES - Player-god treated like any powerful entity

3. **Q**: One exotic plot total or one per category?
   **A**: ONE EPIC at a time, but multiple exotic OK (let Fates decide)

4. **Q**: Council frequency?
   **A**: Daily (evening), can skip if nothing interesting

5. **Q**: Scope?
   **A**: ONLY exotic and epic plots (not micro/small/medium)

## This Is Lit 🔥

The Fates don't just assign plots - they're **active narrative designers** who:
- Understand tropes and story patterns
- Create poetic justice
- Weave multiple plots together
- Know when to leave threads alone
- Can test GODS (including the player!)

And they do it all **without knowing who the player is**. Perfect meta-blind narrative AI.
