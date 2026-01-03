# Psychopomp Death Conversation System - Implementation Summary

**Date**: 2026-01-01
**Status**: ✅ Complete and Building

## Overview

Successfully implemented a dramatic death conversation system where dying agents encounter a psychopomp (death guide angel) and have a meaningful conversation before transitioning to the afterlife. This transforms death from a simple state transition into a narrative event.

## What Was Implemented

### 1. ✅ Design Document
**File**: `packages/core/src/divinity/PSYCHOPOMP_DESIGN.md`

Comprehensive design covering:
- **Conversation Structure**: 4-stage flow (greeting → life review → judgment → crossing over)
- **Psychopomp Identity**: Angel of the Underworld deity, solemn but compassionate
- **Judgment Criteria**: Peace (acceptance), Tether (connection), Coherence (identity)
- **Example Conversations**: Peaceful death vs violent death scenarios
- **Future Expansions**: Deity-specific psychopomps, bargaining, group deaths, witnessing

### 2. ✅ DeathJudgmentComponent
**File**: `packages/core/src/components/DeathJudgmentComponent.ts`

Tracks conversation state while soul is in limbo:
```typescript
interface DeathJudgmentComponent {
  // Conversation state
  stage: 'awaiting_psychopomp' | 'in_conversation' | 'judgment_delivered' | 'crossing_over';
  conversationStartTick: number;

  // Psychopomp
  psychopompId: string | null;
  psychopompName: string;

  // Conversation history
  exchanges: ConversationExchange[];

  // Judgment results (affect AfterlifeComponent)
  judgedPeace: number;      // 0-1
  judgedTether: number;     // 0-1
  coherenceModifier: number; // -0.2 to +0.2

  // Context for prompts
  causeOfDeath: CauseOfDeath;
  ageName: string;
  unfinishedGoals: string[];
  importantRelationships: Array<{ name: string; relationship: string }>;
  notableDeeds: string[];
  sins: string[];
  beliefs: string | null;
}
```

**Helper Functions**:
- `createDeathJudgmentComponent()` - Initialize judgment for a dying soul
- `addConversationExchange()` - Track psychopomp/soul dialogue
- `calculateInitialPeace()` - Peace based on death circumstances
- `calculateInitialTether()` - Tether based on relationships
- `getAgeCategory()` - Convert age to category (child, young adult, etc.)
- `getJudgmentSummary()` - Human-readable judgment description

### 3. ✅ DeathJudgmentSystem
**File**: `packages/core/src/systems/DeathJudgmentSystem.ts`
**Priority**: 109 (runs before DeathTransitionSystem at 110)

Manages the entire conversation flow:
1. **Initiates judgment** when an agent dies (health <= 0)
2. **Gathers context** about the deceased:
   - Cause of death (starvation, combat, old age, etc.)
   - Unfinished goals from GoalsComponent
   - Important relationships from SocialMemoryComponent
   - Deeds and sins from DeedLedgerComponent
   - Religious beliefs from SpiritualComponent
3. **Generates psychopomp greeting** based on death circumstances:
   - Gentle for old age
   - Solemn for violent death
   - Comforting for starvation/exposure
4. **Manages conversation** through 2-4 exchanges
5. **Calculates judgment** values for AfterlifeComponent
6. **Marks ready for transition** (stage: 'crossing_over')

**Template-Based Responses** (placeholder for future LLM integration):
- Exchange 1: Shock/acceptance reaction
- Exchange 2: Life review question
- Exchange 3: Reflection on deeds and regrets
- Exchange 4: Judgment delivery
- Exchange 5: Final words before crossing

### 4. ✅ DeathTransitionSystem Integration
**File**: `packages/core/src/systems/DeathTransitionSystem.ts`

Modified to respect judgment flow:
```typescript
// Check if death judgment is in progress
const deathJudgment = entity.components.get('death_judgment');
const judgmentInProgress = deathJudgment && deathJudgment.stage !== 'crossing_over';

// Only transition if judgment is complete
if (isDead && !alreadyProcessed && !judgmentInProgress) {
  this.handleDeath(world, entity.id, realmLocation);
}
```

### 5. ✅ Event System Integration
**File**: `packages/core/src/events/EventMap.ts`

Added 4 new event types:
- **death:judgment_started** - Psychopomp appears, conversation begins
- **death:exchange** - Each message in the conversation (observable by seers/necromancers)
- **death:judgment_delivered** - Final verdict given
- **death:crossing_over** - Soul ready to transition to Underworld

### 6. ✅ System Registration
**Files**:
- `packages/core/src/systems/index.ts` - Exported DeathJudgmentSystem
- `packages/core/src/systems/registerAllSystems.ts` - Registered before DeathTransitionSystem

## Conversation Flow Example

```
AGENT DIES (health <= 0)
    ↓
DeathJudgmentSystem detects death
    ↓
Create DeathJudgmentComponent
Gather context (cause, goals, relationships, deeds)
Calculate initial peace/tether
    ↓
PSYCHOPOMP GREETING (Exchange 1)
  "Welcome, Elder Kora. Your time has come..."
    ↓
SOUL RESPONSE (Exchange 2)
  "I... I understand. What happens now?"
    ↓
LIFE REVIEW (Exchange 3)
  Psychopomp: "What do you remember of your life?"
  Soul: "I raised three children. I built the shrine..."
    ↓
JUDGMENT (Exchange 4)
  Psychopomp: "Your soul departs at peace, ready to rest..."
  Soul: "Will I see my husband again?"
    ↓
CROSSING OVER (Exchange 5)
  Stage changes to 'crossing_over'
    ↓
DeathTransitionSystem proceeds with transition
Creates AfterlifeComponent with judgment values
Transitions to Underworld realm
```

## Judgment Calculation

### Peace (Acceptance of Death)
**Factors**:
- **Cause of death**: old_age (+0.3), combat (-0.2), murder (-0.3)
- **Age**: elderly (+0.15), child (-0.2)
- **Unfinished goals**: -0.05 per goal

**Range**: 0.0 (troubled) to 1.0 (at peace)

### Tether (Connection to Living World)
**Factors**:
- **Relationships**: +0.1 per important relationship
- **Unfinished goals**: +0.08 per goal
- **Age**: child (+0.2), elderly (-0.1)

**Range**: 0.0 (ready to move on) to 1.0 (strongly bound)

### Coherence Modifier
**Default**: 0.0 (no modifier)
**Future**: Will be adjusted based on conversation quality and resolution

## Integration Points

### With Existing Systems
1. **AfterlifeNeedsSystem** - Uses judgedPeace/judgedTether for initial values
2. **ReincarnationSystem** - Can check judgment for memory retention
3. **Memory System** - Conversation becomes important memory
4. **Event System** - Observers (seers, necromancers) can witness exchanges

### Future LLM Integration
The system is designed for LLM integration:
- **Psychopomp Prompts**: Context-aware greeting/judgment generation
- **Soul Responses**: LLM-controlled agents have personalized reactions
- **Dynamic Conversations**: Adapt to specific life circumstances

Current implementation uses **template-based responses** as placeholders.

## Files Created/Modified

### New Files (3)
1. `packages/core/src/divinity/PSYCHOPOMP_DESIGN.md` - Design document
2. `packages/core/src/components/DeathJudgmentComponent.ts` - Component & helpers
3. `packages/core/src/systems/DeathJudgmentSystem.ts` - Conversation management

### Modified Files (5)
1. `packages/core/src/components/index.ts` - Export DeathJudgmentComponent
2. `packages/core/src/systems/index.ts` - Export DeathJudgmentSystem
3. `packages/core/src/systems/registerAllSystems.ts` - Register system
4. `packages/core/src/systems/DeathTransitionSystem.ts` - Wait for judgment
5. `packages/core/src/events/EventMap.ts` - Add death judgment events

## Build Status

```
✅ TypeScript compilation: SUCCESS
✅ All type errors resolved
✅ System priority order correct (109 → 110)
✅ Component exports working
✅ Event types registered
```

## Testing Recommendations

### To Test in Game:
1. **Force agent death**: Set agent health to 0 via console
2. **Monitor events**: Watch for death:judgment_started, death:exchange, death:crossing_over
3. **Check component**: Verify DeathJudgmentComponent appears on dying entity
4. **Verify transition delay**: Death transition should wait for crossing_over stage
5. **Inspect judgment values**: Check peace/tether affect AfterlifeComponent

### Test Scenarios:
- **Old age death** (peaceful): High peace, moderate tether
- **Combat death** (violent): Low peace, high tether if relationships exist
- **Starvation** (tragic): Low peace, moderate tether
- **Death with unfinished goals**: Lower peace, higher tether
- **Death with many relationships**: Normal peace, very high tether

## Future Enhancements

As outlined in PSYCHOPOMP_DESIGN.md:

1. **LLM Integration**:
   - Replace template responses with dynamic LLM-generated dialogue
   - Personalized psychopomp greetings based on life story
   - Soul responses reflect personality and beliefs

2. **Deity-Specific Psychopomps**:
   - War god: Valkyrie-like chooser of slain
   - Nature god: Spirit of the wilds
   - Trickster god: Chaotic ferryman

3. **Bargaining Mechanics**:
   - Soul can negotiate for final message to loved ones
   - Request one last task before crossing
   - Attempt to bargain for reincarnation

4. **Group Deaths**:
   - Soldiers who died in battle cross together
   - Family that perished in disaster
   - Mass casualties create communal judgment

5. **Failed Crossings**:
   - Soul refuses to accept death
   - Becomes a ghost/restless spirit
   - Must be persuaded or forced to cross later

6. **Witnessing**:
   - Necromancers can observe death conversations
   - Near-death experiences glimpse the judgment
   - Divine visions show the crossing

## Success Metrics

| Metric | Status |
|--------|--------|
| Design document complete | ✅ Yes |
| Component implemented | ✅ Yes |
| System implemented | ✅ Yes |
| Integration complete | ✅ Yes |
| Events registered | ✅ Yes |
| Build passing | ✅ Yes |
| Gameplay tested | ⏳ Pending |

## Next Steps

1. **Play test** the system by forcing agent deaths
2. **Monitor conversation flow** in game events
3. **Verify judgment values** affect afterlife experience
4. **Consider LLM integration** for dynamic dialogue
5. **Add psychopomp spawning** (currently just names)
6. **Implement age detection** (currently defaults to 'adult')

---

**Implementation Complete**: Death is now a dramatic narrative moment, not just a stat transition.
