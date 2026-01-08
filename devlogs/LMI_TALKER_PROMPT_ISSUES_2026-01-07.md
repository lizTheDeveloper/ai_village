# LMI Talker Prompt Issues - Tracking Document

**Created**: 2026-01-07
**Status**: ✅ Complete (Issue 1 deferred by design)

## Architecture Overview

The LMI (Language Model Interface) uses a three-layer architecture:

| Layer | Responsibility |
|-------|----------------|
| **Autonomic** | Fallback behaviors (wander, idle, seek_warmth, seek_sleep) - NOT LLM controlled |
| **Talker** | Social brain - speaks, sets goals, expresses desires, notices people/vibes |
| **Executor** | Task brain - reads Talker's goals, creates plans, executes tool calls, tracks resources |

## Issues List

### Issue 1: Schema Dump is Massive/Unfiltered
**Status**: Deferred (user clarified Talker SHOULD see inventory/spatial)
**File**: `TalkerPromptBuilder.ts:133-141`

The `buildSchemaPrompt()` method renders ALL entity components with LLM visibility. This includes combat, guard_duty, parenting, spirituality, realm_location - many of which are irrelevant for social decisions.

**Problem**: Token waste, potential confusion
**User Note**: Talker SHOULD see inventory and spatial coords - don't remove those
**Recommendation**: Filter schema to social-relevant components only (identity, emotions, relationships, conversation, needs)

---

### Issue 2: Boundary Violation - wander/idle in Talker Actions
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:460-462`

The `getAvailableTalkerActions()` method includes:
```typescript
actions.push('wander - Explore your surroundings casually');
actions.push('idle - Take a moment to think and rest');
```

But `ActionDefinitions.ts:40-42` explicitly states:
```typescript
// NOTE: 'wander', 'idle', 'rest', 'seek_sleep', 'seek_warmth' are NOT included here.
// These are autonomic/fallback behaviors, not executive decisions for the LLM to make.
```

**Problem**: Architecture violation - Talker shouldn't choose autonomic behaviors
**Fix**: Remove wander/idle from Talker's action list

---

### Issue 3: Goal Output Format Not Parsed
**Status**: ✅ FIXED (2026-01-07)
**File**: `ResponseParser.ts`

The Talker prompt response format shows:
```json
{
  "goal": {
    "type": "personal" | "medium_term" | "group",
    "description": "goal description"
  }
}
```

But `ResponseParser.parseResponse()` only extracts `thinking`, `speaking`, and `action`. The `goal` field is silently ignored.

**Problem**: Goals set by Talker are dropped
**Fix**: Add goal parsing to ResponseParser and update AgentResponse interface

---

### Issue 4: Environment Lists Specific Resource Types
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:321-356`

The environment section says "You notice some wood, fiber around" - listing specific resource types. The Talker prompt says Talker should see "berries around" not detailed counts, but listing types is still Executor's domain.

**Problem**: Boundary blur between Talker (qualitative) and Executor (quantitative)
**Fix**: Changed to qualitative awareness ("The area seems resourceful with natural materials nearby") - saves ~20-50 tokens

---

### Issue 5: Extract Thinking from `<think>` Tags
**Status**: ✅ FIXED (2026-01-07)
**File**: `ResponseParser.ts`

Added `extractThinkTags()` method to extract thinking content from Qwen3's `<think>...</think>` tags:
- Extracts content from all `<think>` tags in the response
- Removes tags from the text before JSON parsing
- Populates the `thinking` field in `AgentResponse`
- Falls back to `parsed.thinking` JSON field if no tags present

---

### Issue 6: Personality Section Too Verbose
**Status**: ✅ FIXED (2026-01-07)
**File**: `PersonalityPromptTemplates.ts`, `PersonalityVariationsLibrary.ts`

Personality descriptions consume significant tokens with literary flourishes that repeat every LLM call.

**Problem**: Token waste in premium context space
**Fix**: Compressed personality descriptions by ~65-68%. Uses semicolons, math symbols, and bullet points instead of prose. Saves ~150-200 tokens per agent per call

---

### Issue 7: Role Explanation Wastes Tokens
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:516-546`

The role explanation is ~400 tokens repeated every prompt. Could be condensed to:
"You handle social decisions. Executor handles tasks. Focus on WHAT and WHY, not HOW."

**Problem**: Token waste
**Fix**: Compressed to ~50 tokens: "You handle social decisions and goal-setting. Executor handles task execution. You decide WHAT and WHY. Executor handles HOW." Saves ~350 tokens per prompt

---

### Issue 8: "No goals yet" Should Be Omitted
**Status**: ✅ FIXED (2026-01-07)
**File**: `GoalsComponent.ts:formatGoalsForPrompt()`

Changed `formatGoalsForPrompt()` to return empty string when no goals exist (was returning "No personal goals yet."). The prompt builder already omits empty sections, so this saves tokens.

---

### Issue 9: Emoji Headers Inconsistent
**Status**: ✅ FIXED (2026-01-07)
**Files**: `TalkerPromptBuilder.ts:162, 310`

Some sections use emoji (🗣️, 🥶), others don't. Emojis may tokenize inefficiently.

**Problem**: Inconsistency, potential tokenization issues
**Fix**: Replaced all emoji headers with consistent text formatting: `[ACTIVE CONVERSATION]`, `[FREEZING]`, `[COLD WARNING]`

---

### Issue 10: Action Descriptions Hardcoded
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts`, `ActionDefinitions.ts`

- Added `formatAction()` helper that pulls from `BEHAVIOR_DESCRIPTIONS`
- Added goal-setting actions to `ActionDefinitions.ts` and `AgentBehavior` type
- All Talker actions now use single source of truth

---

### Issue 11: Conversation Lacks Relationship Context
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:buildSocialContext()`

Added `formatSpeaker()` helper that looks up relationship by `speakerId` and adds context:
- `Clay (close friend): "..."`
- `Clay (friend): "..."`
- `Clay (acquaintance): "..."`
- `Clay (stranger): "..."`
- `Clay (wary of): "..."`
- `Clay (dislike): "..."`

---

### Issue 12: Cold Status Buried in Environment
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:471-491`

Critical needs like "You are cold" are buried in the environment section. The instruction doesn't mention it.

**Problem**: Critical needs not influencing instructions
**Fix**: Surfaced critical needs (hunger < 0.2, energy < 0.2) prominently in instruction text with `CRITICAL:` prefix

---

### Issue 13: Speaking Field Allows Empty
**Status**: ✅ FIXED (2026-01-07)
**File**: `TalkerPromptBuilder.ts:586`

Talker's primary job is verbal output, but the format explicitly permits silence.

**Problem**: Unclear when silence is appropriate
**Fix**: Clarified in format: "leave empty only if alone or deep in thought"

---

## Completed Fixes

1. **Issue 2**: Removed `wander` and `idle` from `getAvailableTalkerActions()`
2. **Issue 3**: Added goal parsing to `ResponseParser` and updated `AgentResponse` interface
3. **Issue 4**: Made environment awareness qualitative (no specific resource types)
4. **Issue 5**: Extract thinking from `<think>` tags
5. **Issue 6**: Compressed personality descriptions by ~65-68%
6. **Issue 7**: Compressed role explanation from ~400 to ~50 tokens
7. **Issue 8**: "No goals yet" now returns empty string
8. **Issue 9**: Standardized headers to `[BRACKETED]` format
9. **Issue 10**: Action descriptions use single source of truth
10. **Issue 11**: Conversation shows relationship context
11. **Issue 12**: Critical needs surfaced in instruction text
12. **Issue 13**: Speaking field clarifies when silence is valid

## Total Token Savings

- Role explanation: ~350 tokens/prompt
- Personality: ~150-200 tokens/agent/call
- Environment: ~20-50 tokens/prompt
- Emoji → brackets: ~5-15 tokens/prompt
- **Estimated total: ~400-600 tokens saved per Talker prompt**
