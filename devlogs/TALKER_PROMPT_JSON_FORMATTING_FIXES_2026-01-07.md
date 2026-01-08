# Talker Prompt JSON Formatting Fixes

**Date:** 2026-01-07
**File:** `custom_game_engine/packages/llm/src/TalkerPromptBuilder.ts`

## Problem

LLMs were returning malformed JSON responses despite instructions to "RESPOND IN JSON ONLY". Common issues:

1. **Label pollution**: Responses included labels like:
   ```
   Action: { "type": "talk" }
   Speaking: "Hello there"
   ```

2. **Missing concrete examples**: No example of correct JSON output format

3. **Name announcement spam**: Agents kept starting conversations with "Kestrel here." or "Clay here." even though the conversation UI already shows who's speaking

## Solution

Enhanced the response format instruction in `TalkerPromptBuilder.ts` (lines 720-747) with three critical improvements:

### 1. More Explicit/Emphatic JSON Instructions

Added emphatic warnings about output format:
- **CRITICAL:** "Output ONLY valid JSON"
- **DO NOT** include labels like "Action:", "Speaking:", or "Thoughts:"
- **Explicit boundaries:** "Start your response with `{` and end with `}`"
- **No extras:** "NO extra text before or after the JSON"

### 2. Concrete Example of Correct Response

Added a complete, working example showing exactly what the LLM should output:

```json
{
  "speaking": "I think we should gather more wood before winter.",
  "action": {
    "type": "talk"
  }
}
```

This gives LLMs a clear reference to pattern-match against.

### 3. Instruction to Not Say Name

Added explicit instruction to prevent name announcements:
- "DO NOT start your speech with your name - the conversation already shows who's speaking"
- "Speak naturally without announcing yourself (e.g., 'Kestrel here' or 'Clay speaking')"

## Changes Made

**File:** `custom_game_engine/packages/llm/src/TalkerPromptBuilder.ts`

**Location:** Lines 719-747 (response format section)

**Before:**
```typescript
const responseFormat = `RESPOND IN JSON ONLY. Use this exact format:
{
  "speaking": "what you say out loud (leave empty only if alone or deep in thought)",
  "action": {
    "type": "action_name",
    "target": "optional target like agent name"
  },
  "goal": {
    "type": "personal" | "medium_term" | "group",
    "description": "goal description (if setting a goal)"
  }
}`;
```

**After:**
```typescript
const responseFormat = `--- RESPONSE FORMAT ---

CRITICAL: Output ONLY valid JSON. DO NOT include labels like "Action:", "Speaking:", or "Thoughts:".
Start your response with { and end with }. NO extra text before or after the JSON.

DO NOT start your speech with your name - the conversation already shows who's speaking.
Speak naturally without announcing yourself (e.g., "Kestrel here" or "Clay speaking").

Example of CORRECT response:
{
  "speaking": "I think we should gather more wood before winter.",
  "action": {
    "type": "talk"
  }
}

Use this exact format:
{
  "speaking": "what you say out loud (leave empty only if alone or deep in thought)",
  "action": {
    "type": "action_name",
    "target": "optional target like agent name"
  },
  "goal": {
    "type": "personal" | "medium_term" | "group",
    "description": "goal description (if setting a goal)"
  }
}`;
```

## Expected Impact

These changes should significantly reduce JSON parsing errors by:

1. **Reducing label pollution** - Explicit warnings about not including labels like "Action:" or "Speaking:"
2. **Providing clear pattern** - Concrete example gives LLMs a reference to follow
3. **Improving conversation quality** - Agents no longer announce their names unnecessarily

## Verification

Changes compile successfully (pre-existing TypeScript config issues are unrelated to these changes).

To test in game:
1. Start the game: `cd custom_game_engine && ./start.sh`
2. Spawn agents and observe conversation output
3. Check browser console for reduced JSON parsing errors
4. Verify agents no longer say "Name here" at start of speech

## Related Files

- **Response Parser:** `custom_game_engine/packages/llm/src/ResponseParser.ts` - Handles parsing of JSON responses
- **Action Definitions:** `custom_game_engine/packages/llm/src/ActionDefinitions.ts` - Defines valid action types
- **LLM System Docs:** `custom_game_engine/packages/llm/README.md` - LLM integration documentation

## Notes

This fix addresses prompt-level issues. If JSON parsing errors persist, the next step would be to improve error recovery in `ResponseParser.ts` to handle common malformations gracefully.
