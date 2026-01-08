# LLM Prompt Pollution Fixes - 2026-01-07

## Summary

Fixed critical LLM prompt quality issues in the introspection schema system that were causing:
1. **Metacognitive pollution** - Previous AI's reasoning leaking into new calls
2. **UUID spam** - Hundreds of meaningless IDs shown to LLM
3. **Raw data structure leakage** - Object notation instead of formatted text

All fixes implemented via the introspection schema system, ensuring clean prompts across all agent decision layers (Autonomic, Talker, Executor).

## Problems Fixed

### 1. Metacognitive Pollution - lastThought Field

**Issue:** The `lastThought` field in AgentComponent was being shown to the LLM, causing the previous AI's internal chain-of-thought to leak into the next AI call.

**Example of problematic output:**
```
Last Thought: Okay, let's see. I need to figure out what Pebble should do next. The user has given a bunch of information about the village...
```

This confused the LLM about "who is thinking" and caused inconsistent agent behavior.

**Fix:** Updated `AgentSchema.ts` (packages/introspection/src/schemas/agent/AgentSchema.ts)

**Lines 108-125** - Changed lastThought visibility:
```typescript
lastThought: {
  type: 'string',
  required: false,
  description: 'Most recent internal thought/reasoning',
  displayName: 'Last Thought',
  visibility: {
    player: true,  // Show agent's thoughts to player
    llm: false,    // NEVER show to LLM - causes metacognitive pollution
    agent: false,  // Don't reflect on previous AI's chain-of-thought
    user: false,
    dev: true,
  },
  // ...
},
```

**Lines 228-229** - Removed from summarize function:
```typescript
// NOTE: lastThought is NOT included - it causes metacognitive pollution
// (previous AI's chain-of-thought leaking into next AI call)
```

### 2. UUID Spam - Vision Arrays

**Issue:** Vision fields (seenAgents, seenResources, seenBuildings) were showing raw UUID arrays to the LLM.

**Example of problematic output:**
```
Seen Resources: f09835e0-6604-4671-b114-e2595febcf2e, bc4c628b-8ff3-46de-a2ae-e3e3ad42bf9d, ...
(49 UUIDs listed)
```

**User feedback:** "Scene resources should not be IDs. Those are not meaningful to the language model agent. They should be the name of the resources and just a count of how many there are."

**Fix:** Updated `VisionSchema.ts` (packages/introspection/src/schemas/system/VisionSchema.ts)

**Changed all vision array fields from `llm: true` to `llm: 'summarized'`:**
- `seenAgents` (lines 101-118)
- `seenResources` (lines 120-137)
- `seenBuildings` (lines 139-155)
- `heardSpeech` (lines 157-174)

**Example for seenResources:**
```typescript
seenResources: {
  type: 'array',
  required: true,
  default: [],
  displayName: 'Seen Resources',
  visibility: {
    player: false,
    llm: 'summarized',  // Only show via summarize() - prevents UUID spam
    agent: true,
    user: false,
    dev: true,
  },
  // ...
},
```

**Result:** The existing summarize function provides clean output:
```
Perception: Sees 3 agent(s), 5 resource(s), 2 building(s)
```

### 3. Raw Data Structure Leakage - heardSpeech

**Issue:** heardSpeech was showing raw object notation to the LLM.

**Example of problematic output:**
```
Heard Speech: {speaker: Clay, text: "Hello there"}, {speaker: Pebble, text: "How are you?"}
```

**Fix:** Updated `VisionSchema.ts` summarize function (lines 183-220)

**Enhanced summarize to format speech as actual dialogue:**
```typescript
// Heard speech - format actual text without exposing UUIDs
if (data.heardSpeech.length > 0) {
  const speechTexts = data.heardSpeech
    .map(s => `"${s.text}"`)
    .slice(0, 3)  // Limit to 3 most recent to avoid bloat
    .join(', ');

  const suffix = data.heardSpeech.length > 3
    ? ` (+${data.heardSpeech.length - 3} more)`
    : '';

  parts.push(`Heard speech: ${speechTexts}${suffix}`);
}
```

**Result:** Clean formatted output:
```
Heard speech: "Hello there", "How are you?", "Nice weather today"
```

## Technical Details

### Introspection Schema Visibility Modes

The introspection system supports three visibility modes for LLM prompts:

1. **`llm: true`** - Show raw component data to LLM
2. **`llm: false`** - Hide component data from LLM entirely
3. **`llm: 'summarized'`** - Use the schema's summarize function to create clean, human-readable output

When ANY field has `llm: 'summarized'`, the PromptRenderer calls the component's summarize function instead of dumping raw data.

### Files Modified

1. **packages/introspection/src/schemas/agent/AgentSchema.ts**
   - Line 115: Changed `llm: true` to `llm: false` for lastThought
   - Lines 228-229: Removed lastThought from summarize function with explanatory comment

2. **packages/introspection/src/schemas/system/VisionSchema.ts**
   - Lines 108, 127, 145, 164: Changed `llm: true` to `llm: 'summarized'` for all vision arrays
   - Lines 199-211: Enhanced summarize function to format heardSpeech as actual dialogue

### Build Verification

```bash
npm run build
```

Build succeeded with no TypeScript errors. All schema changes compile correctly.

## Impact

### Before Changes
```
Agent State: Behavior: pick

Last Thought: Okay, let's see. I need to figure out what Pebble should do next. The user has given a bunch of information about the village...

Perception: Sees 3 agent(s), Seen Resources: f09835e0-6604-4671-b114-e2595febcf2e, bc4c628b-8ff3-46de-a2ae-e3e3ad42bf9d, ... (49 more)

Heard Speech: {speaker: abc123, text: "Hello there"}, {speaker: def456, text: "How are you?"}
```

### After Changes
```
Agent State: Behavior: pick. Personal goal: Find food

Perception: Sees 3 agent(s), 5 resource(s), 2 building(s). Heard speech: "Hello there", "How are you?", "Nice weather today"
```

## Related Systems

These fixes apply to all three LLM decision layers:
- **Autonomic Layer** (StructuredPromptBuilder) - Reflexive decisions, basic needs
- **Talker Layer** (TalkerPromptBuilder) - Conversations, social interactions
- **Executor Layer** (ExecutorPromptBuilder) - Strategic planning, task execution

All three layers use the PromptRenderer which respects introspection schema visibility settings.

## Future Considerations

### Remaining Prompt Quality Issues (Not Addressed)

1. **Excessive decimal precision** - Priorities showing 15+ decimal places (e.g., `0.12820512820512822`)
2. **Incomplete inventory display** - Shows "+ 14 more" without listing what the items are
3. **Resource name resolution** - Currently shows counts, but not actual resource names (would require world context in summarize function)

### Potential Enhancements

1. **Speaker name resolution for heardSpeech** - Currently only shows text, not who said it (would require entity lookup in summarize)
2. **Proximity-aware summarization** - Different detail levels for near vs distant entities
3. **Importance-based filtering** - Only show most relevant entities based on agent's current goals

## Testing Recommendations

1. Verify prompts no longer contain lastThought field
2. Verify vision fields show counts instead of UUIDs
3. Verify heardSpeech shows formatted dialogue
4. Monitor LLM decision quality for improved coherence

## References

- Architecture: `custom_game_engine/ARCHITECTURE_OVERVIEW.md`
- Systems Catalog: `custom_game_engine/SYSTEMS_CATALOG.md`
- Metasystems: `custom_game_engine/METASYSTEMS_GUIDE.md` (Consciousness/LLM Scheduler)
- Previous conversation work: `devlogs/CONVERSATION_SYSTEM_IMPROVEMENTS_2026-01-07.md`
