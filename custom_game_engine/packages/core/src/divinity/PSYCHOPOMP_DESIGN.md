# Psychopomp Death Conversation System

## Overview

When an agent dies, they encounter a **psychopomp** (death guide) - an angel of the Underworld deity who conducts them to their afterlife. This conversation serves as a dramatic "last moment" where the soul reflects on their life before crossing over.

## Design Philosophy

- **Dramatic Moment**: Death becomes a meaningful narrative event, not just a state transition
- **Life Review**: Agents reflect on accomplishments, regrets, unfinished business
- **Personalized**: Conversation adapts to how they died, what they believed, who they loved
- **Consequences**: Judgment affects their initial afterlife state

## When It Happens

```
Agent dies (health ≤ 0)
    ↓
DeathTransitionSystem detects death
    ↓
Create "in_limbo" state (between life and death)
    ↓
PSYCHOPOMP CONVERSATION (2-4 exchanges)
    ↓
Judgment delivered
    ↓
Transition to Underworld with modified AfterlifeComponent
```

## Psychopomp Angel

### Identity
- **Type**: Angel of the Underworld deity
- **Role**: Soul guide, judge, ferryman
- **Personality**: Solemn but not cruel, patient, knows all
- **Appearance**: Based on UnderworldDeity form (hooded figure, skeletal judge, etc.)

### Powers
- **Omniscient about the deceased**: Knows their deeds, relationships, beliefs
- **Cannot be deceived**: Sees through lies and self-deception
- **Impartial**: Not swayed by pleas or bargaining
- **Compassionate**: Understands mortal weakness

## Conversation Structure

### Exchange 1: The Greeting
**Psychopomp**: Introduces themselves, acknowledges the death
- Gentle if natural death
- Solemn if violent death
- Regretful if untimely death

**Soul**: Initial reaction (shock, acceptance, denial, fear)

### Exchange 2: Life Review
**Psychopomp**: Asks about their life, accomplishments, regrets
- References specific deeds from memory
- Mentions important relationships
- Notes unfinished goals

**Soul**: Reflects on their life
- What they're proud of
- What they regret
- Who they'll miss

### Exchange 3: Judgment
**Psychopomp**: Delivers verdict on their afterlife fate
- Explains their spiritual state (tether, peace, coherence)
- Mentions what will help them (remembrance, goals completed)
- Warns of dangers (becoming a shade, restlessness)

**Soul**: Final words before crossing

### Exchange 4 (Optional): Bargaining/Blessing
- If soul has unfinished business: psychopomp may offer guidance
- If soul was faithful: deity's blessing mentioned
- If soul was wicked: warnings about consequences

## Judgment Criteria

### Peace (Acceptance of Death)
**Higher peace if**:
- Natural death (old age, illness)
- Died achieving their goals
- No major regrets
- At peace with their choices

**Lower peace if**:
- Violent/sudden death
- Many unfinished goals
- Died unfulfilled
- Strong attachment to life

### Tether (Connection to Living World)
**Higher tether if**:
- Many living relationships
- Unfinished goals that matter
- Children/descendants
- Strong community ties

**Lower tether if**:
- Few relationships
- Outlived everyone they knew
- Hermit/isolated
- Ready to move on

### Coherence (Sense of Self)
**Starts at 1.0 always** (full memory at death)

But psychopomp warns if at risk:
- Died alone → will fade faster without remembrance
- No one to mourn them → at risk of being forgotten
- Strong identity → will resist becoming shade

## Conversation Topics

### Always Mentioned
1. **Cause of death** - How they died
2. **Life summary** - What they accomplished
3. **Important relationships** - Who mattered to them
4. **Spiritual state** - Their afterlife needs explained

### Conditional Topics
- **Unfinished goals** (if > 0): What they left undone
- **Deity** (if believer): Their god's judgment
- **Murder** (if killed): Who killed them, justice/revenge
- **Children** (if has descendants): Will watch over them
- **Great deeds** (if famous): Their legacy will endure
- **Great sins** (if taboo violations): Must atone

## Example Conversations

### Peaceful Death (Old Age, Fulfilled)

```
PSYCHOPOMP: "Welcome, Elder Kora. Your time has come, as it comes for all.
You lived 82 winters - a full life by any measure."

KORA: "I... I'm dead? But I was just in my garden..."

PSYCHOPOMP: "Your heart gave out as you tended the roses. A gentle passing.
Tell me - what do you remember of your life?"

KORA: "I raised three children. I built the village shrine. I taught
the young ones how to grow wheat in poor soil. I... I think I did well."

PSYCHOPOMP: "You did. Your children speak your name with love. The shrine
still stands. The wheat still grows. But your work is done now.
Your tether to the living world grows weak - you are ready to rest."

KORA: "Will I see my husband? He died years ago."

PSYCHOPOMP: "If he still lingers, you will find him. If he has passed on,
you will follow in time. Your peace is high - the Underworld will be
gentle with you."
```

### Violent Death (Murdered, Unfinished)

```
PSYCHOPOMP: "Rise, Theron. Your body lies broken, but your soul endures."

THERON: "Mara... Mara betrayed me! She drove the knife - I trusted her!"

PSYCHOPOMP: "Yes. I saw. A wound to body and spirit both."

THERON: "I can't die! My children - they're still young! And Mara walks
free while I rot?!"

PSYCHOPOMP: "Your children live. Your tether to them is strong - you will
watch over them from the shadows. But your peace... it is shattered.
You died with fury in your heart."

THERON: "Damn right I'm furious! This isn't justice!"

PSYCHOPOMP: "Justice may yet come. Your killer will face her own reckoning
in time. But YOU - you must decide. Will you cling to rage and become
restless? Or will you find peace and watch your children grow?"

THERON: "I... I don't know. How can I let go?"

PSYCHOPOMP: "You need not decide now. The Underworld has time. But know this:
the living will remember you. Your name will be spoken. That gives you
strength. Use it wisely."
```

## Implementation Details

### New Component: DeathJudgmentComponent

Tracks the conversation state while soul is in limbo.

```typescript
interface DeathJudgmentComponent {
  type: 'death_judgment';

  // Conversation state
  stage: 'awaiting_psychopomp' | 'in_conversation' | 'judgment_delivered' | 'crossing_over';
  conversationStartTick: number;

  // Psychopomp
  psychopompId: string;  // Entity ID of the psychopomp angel

  // Conversation history
  exchanges: Array<{
    speaker: 'psychopomp' | 'soul';
    text: string;
    timestamp: number;
  }>;

  // Judgment results (affect AfterlifeComponent)
  judgedPeace: number;      // 0-1, how at peace they are with death
  judgedTether: number;     // 0-1, how connected to living world
  coherenceModifier: number; // Bonus/penalty to starting coherence

  // Conversation context
  causeOfDeath: CauseOfDeath;
  unfinishedGoals: string[];
  importantRelationships: string[];
  notableDeeds: string[];
  sins: string[];
}
```

### New System: DeathJudgmentSystem

**Priority**: 109 (right before DeathTransitionSystem at 110)

**Flow**:
1. Detects newly dead entities
2. Creates DeathJudgmentComponent
3. Spawns psychopomp angel (or uses existing Underworld deity psychopomp)
4. Generates psychopomp greeting (LLM or template)
5. Waits for soul's response (LLM if agent was LLM-controlled)
6. Continues conversation (2-4 exchanges)
7. Delivers judgment
8. Marks as ready for transition
9. DeathTransitionSystem takes over

### Psychopomp Prompts

**System Prompt**:
```
You are a psychopomp - a guide of souls for the Underworld deity.
You have just encountered a newly deceased soul.

Your role:
- Greet them with appropriate solemnity
- Help them understand they have died
- Review their life with compassion but honesty
- Judge their spiritual state for the afterlife
- Guide them to accept their fate

Tone: Solemn, patient, all-knowing but not cruel
Style: Speak in second person, use poetic language
```

**Context Provided**:
- Cause of death
- Age, accomplishments, relationships
- Unfinished goals
- Religious beliefs
- Notable deeds/sins

## Events

### New Events

**death:judgment_started**
- Psychopomp appears
- Soul enters limbo

**death:exchange**
- Each message in conversation
- Observers can witness (if seers/necromancers present)

**death:judgment_delivered**
- Final verdict given
- Afterlife fate sealed

**death:crossing_over**
- Soul leaves limbo
- Enters Underworld

## Integration Points

### DeathTransitionSystem
- Check for DeathJudgmentComponent
- If present and stage is 'crossing_over', proceed with transition
- Otherwise, wait for judgment to complete

### AfterlifeComponent Creation
- Use judgedPeace, judgedTether from judgment
- Apply coherenceModifier
- Add conversation summary to memories

### Memory System
- Final conversation becomes an important memory
- Stored with high emotional intensity
- May influence reincarnation (if memories retained)

## Future Expansions

1. **Deity-Specific Psychopomps**: Different deities have different guides
   - War god: Valkyrie-like chooser of slain
   - Nature god: Spirit of the wilds
   - Trickster god: Chaotic ferryman

2. **Bargaining**: Soul can negotiate for:
   - Final message to loved ones
   - One last task before crossing
   - Reincarnation instead of Underworld

3. **Group Deaths**: Multiple souls crossing together
   - Soldiers who died in battle
   - Family that perished together
   - Mass casualties

4. **Failed Crossings**: Soul refuses to go
   - Becomes a ghost
   - Haunts the living world
   - Must be persuaded or forced later

5. **Witnessing**: Living can observe through:
   - Necromancy
   - Near-death experience
   - Divine vision

---

**Implementation Status**: Design complete, ready for coding
