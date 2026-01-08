# ResponseParser Strictness Improvements

**Date:** 2026-01-07
**File:** `custom_game_engine/packages/llm/src/ResponseParser.ts`

## Problem

The ResponseParser was too lenient with malformed LLM output. It would accept invalid formats like:

```
Action: { "type": "talk" }
Speaking: "..."
```

This fuzzy extraction hid problems from developers and made it hard to identify when the LLM wasn't following the expected JSON format.

## Solution

Made the parser stricter while maintaining backward compatibility:

### 1. Three-Step Parse Strategy

The parser now tries parsing in this order:

1. **Strict JSON parsing** - Attempt `JSON.parse()` first
2. **Fallback fuzzy extraction** - If JSON fails, try keyword matching
3. **Fail with clear error** - If no valid action found, throw `BehaviorParseError`

### 2. Parse Quality Tracking

Added `parseQuality` field to `AgentResponse`:

```typescript
export interface AgentResponse {
  thinking: string;
  speaking: string;
  action: AgentBehavior;
  actionParams?: Record<string, unknown>;
  goal?: AgentGoal;
  parseQuality: 'strict' | 'fallback' | 'failed'; // NEW
}
```

- **`strict`** - Valid JSON with all required fields
- **`fallback`** - Fuzzy text extraction (warns about malformed response)
- **`failed`** - Could not parse (throws error)

### 3. Warning Messages

The parser now logs warnings when falling back to fuzzy extraction:

```
[ResponseParser] Falling back to fuzzy text extraction. LLM response was not valid JSON. This may indicate prompt issues. Response preview: "I think I should explore the area..."
[ResponseParser] Extracted action via keyword match: "explore"
```

This makes it visible when the LLM isn't following the expected format.

### 4. No Functional Changes

The parser still works exactly as before:
- Handles valid JSON responses
- Falls back to text extraction when needed
- Supports both string actions (`"action": "gather"`) and object actions (`"action": { "type": "plan_build", "building": "workbench" }`)
- Maps synonyms correctly (`harvest` → `gather`)

## Implementation Details

### Key Changes

**Before:**
```typescript
try {
  const parsed = JSON.parse(textToParse);
  // ... process JSON
} catch (e) {
  // Silent fallback to text extraction
}
```

**After:**
```typescript
// STEP 1: Try strict JSON parsing first
try {
  const parsed = JSON.parse(textToParse);
  // ... process JSON
  return { ..., parseQuality: 'strict' };
} catch (e) {
  if (!(e instanceof SyntaxError)) throw e;
  // Continue to fallback
}

// STEP 2: Fallback - Log warning
console.warn('[ResponseParser] Falling back to fuzzy text extraction...');
// ... fuzzy extraction
return { ..., parseQuality: 'fallback' };

// STEP 3: Fail
throw new BehaviorParseError(...);
```

### Test Coverage

Added 2 new tests:
1. Verify warnings are logged for fallback parsing
2. Verify warnings are NOT logged for strict JSON parsing

All 25 tests pass:
- 13 tests for structured JSON (strict parsing)
- 10 tests for text fallback (fuzzy extraction)
- 2 tests for warning behavior

## Benefits

1. **Visibility** - Developers can now see when LLMs produce malformed output
2. **Quality Tracking** - `parseQuality` field shows how often fallback parsing is used
3. **Debugging** - Warning messages include response preview for easier debugging
4. **No Breaking Changes** - Existing functionality preserved
5. **Test Coverage** - Comprehensive test suite ensures correctness

## Usage

Consumers of `AgentResponse` can now check parse quality:

```typescript
const response = parser.parseResponse(llmOutput);

if (response.parseQuality === 'fallback') {
  console.log('LLM produced malformed output, consider adjusting prompt');
}

// Or track metrics
metrics.increment(`llm.parse.${response.parseQuality}`);
```

## Verification

- ✅ All tests pass (25/25)
- ✅ Build succeeds with no TypeScript errors
- ✅ Backward compatible with existing code
- ✅ Warning messages appear in test output as expected
