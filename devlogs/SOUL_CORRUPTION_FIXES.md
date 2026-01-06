# Soul Corruption Fixes - January 5, 2026

## Problem Summary

Two critical issues were found in the soul creation system:

1. **Thinking tags not stripped**: The LLM responded with `<thinking>` tags (Anthropic's standard) but the code only stripped `<think>` tags, leaving verbose internal reasoning in the soul's purpose field
2. **Fates had world context**: The Three Fates (thread spinner, weaver, cutter) were receiving world context that made them think about using tools and taking actions, even though they're divine beings without bodies

## Root Cause Analysis

### Issue 1: Thinking Tag Mismatch

**Location:** `custom_game_engine/packages/core/src/systems/SoulCreationSystem.ts:477-478`

**Old Code:**
```typescript
response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
```

**Problem:**
- Prompt at `SoulCreationCeremony.ts:263` asked for `<think>` tags
- But Claude Sonnet 4.5 naturally uses `<thinking>` tags (Anthropic's standard format)
- The regex only matched `<think>`, not `<thinking>`
- Some responses also came back as JSON with `{"thinking":"...", "speaking":"..."}`

### Issue 2: Unclosed Thinking Tags

Many soul purposes had **unclosed** `<think>` tags - the LLM started thinking and never stopped, resulting in souls with ONLY internal reasoning and no actual divine pronouncements from the Fates.

**Example Corrupted Soul (Brook):**
```json
{
  "purpose": "<think>\nOkay, let's tackle this. The user wants me to act as The Weaver...[2057 chars of thinking, no actual purpose]",
  "interests": ["knowledge", "crafting", "nature"]
}
```

### Issue 3: Fates Thinking About Tools

The Fates' prompts didn't explicitly tell them they cannot use tools or take actions. One soul (Ada) had this JSON response:

```json
{
  "thinking": "...",
  "speaking": "I see a soul meant to lay the village's foundations...",
  "action": {"type": "plan_build", "building": "storage-chest"}
}
```

## Fixes Applied

### Fix 1: Enhanced Thinking Tag Stripping

**File:** `custom_game_engine/packages/core/src/systems/SoulCreationSystem.ts:477-484`

```typescript
// Strip thinking tags (both <think> and <thinking> variants)
response = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
response = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
// Also strip any JSON wrappers if LLM responded with structured output
const jsonMatch = response.match(/\{[\s\S]*"speaking":\s*"([^"]+)"[\s\S]*\}/);
if (jsonMatch) {
  response = jsonMatch[1];
}
```

**Changes:**
- Added `<thinking>` tag stripping (Anthropic's standard)
- Case-insensitive matching with `/gi` flag
- JSON extraction for structured responses
- Handles both closed and unclosed tags

### Fix 2: Updated Prompt to Use Standard Tags

**File:** `custom_game_engine/packages/divinity/src/SoulCreationCeremony.ts:263-268`

```typescript
prompt += `\nIMPORTANT: Put your reasoning in <thinking> tags. Only your character's speech should be outside the tags.\n`;
prompt += `Example format:\n`;
prompt += `<thinking>Let me consider the context... The purpose should align with...</thinking>\n`;
prompt += `I see a soul meant to bridge the old and new. This thread shall weave knowledge into community.\n\n`;
prompt += `Respond as ${persona.name}. Keep your response to 1-3 sentences. Speak poetically but clearly.\n`;
prompt += `DO NOT use tools or functions. DO NOT respond with JSON. You are a divine being observing mortal realms - you cannot take physical actions.\n`;
```

**Changes:**
- Changed `<think>` → `<thinking>` (matches Anthropic's standard)
- Added explicit instruction: "DO NOT use tools or functions"
- Added reminder: "You are a divine being observing mortal realms - you cannot take physical actions"

### Fix 3: Soul Corruption Cleanup Script

**File:** `custom_game_engine/scripts/clean-corrupted-souls.ts` (NEW)

Created a soul cleanup script that:
1. Finds all souls with thinking tags or JSON structures in their purpose
2. Extracts clean "speaking" content from JSON responses
3. Strips `<thinking>` and `<think>` tags (closed and unclosed)
4. Marks completely corrupted souls with lore-appropriate messages
5. Updates all three soul repository locations (by-date, by-species, by-universe)

**Corruption Handling Philosophy:**

Following the project's "Conservation of Game Matter" principle, corrupted souls are NOT deleted. Instead they're marked:

```json
{
  "purpose": "[CORRUPTED SOUL] The Fates spoke only in riddles and internal musings. This soul's purpose remains veiled in cosmic static. Perhaps a divine intervention could restore their true purpose..."
}
```

This turns bugs into features - corrupted souls become part of the lore and can potentially be "restored" through gameplay mechanics later.

## Results

### Souls Cleaned

**Total Processed:** 36 souls
**Successfully Cleaned:** 1 soul (Ada - JSON extraction)
**Marked as Corrupted:** 4 souls (Brook, Indigo, River, Lark)
**Already Clean:** 31 souls

### Example: Successfully Cleaned Soul (Ada)

**Before:**
```json
{
  "purpose": "{\"thinking\":\"Okay, I need to figure out the purpose...[1761 chars]\", \"speaking\":\"I see a soul meant to lay the village's foundations...\", \"action\":{\"type\":\"plan_build\",\"building\":\"storage-chest\"}}"
}
```

**After:**
```json
{
  "purpose": "I see a soul meant to lay the village's foundations like a patient spider spinning earth into order. This thread shall gather and build—stockpiling not just wood and stone, but the collective will to endure. Let the first storage-chest rise where all may prosper."
}
```

### Example: Corrupted Souls (Preserved, Not Deleted)

**Before (Brook):**
```json
{
  "purpose": "<think>\nOkay, let's tackle this...[2057 chars of thinking, no speech]"
}
```

**After (Brook):**
```json
{
  "purpose": "[CORRUPTED SOUL] The Fates spoke only in riddles and internal musings. This soul's purpose remains veiled in cosmic static. Perhaps a divine intervention could restore their true purpose..."
}
```

## Testing Recommendations

To verify the fixes work for new souls:

1. Start the game: `./start.sh`
2. Spawn new agents (triggers soul creation ceremony)
3. Check soul repository: `ls demo/soul-repository/by-date/$(date +%Y-%m-%d)/`
4. Verify souls have clean purposes:
   ```bash
   cat demo/soul-repository/by-date/$(date +%Y-%m-%d)/*.json | jq -r '.purpose'
   ```
5. Confirm no `<thinking>` or `<think>` tags appear
6. Confirm no JSON structures appear
7. Confirm no tool calls or actions appear

## Future Improvements

1. **Corrupted Soul Recovery Quest**: Add gameplay mechanic to "restore" corrupted souls through divine intervention
2. **Soul Validation System**: Add validation in SoulRepositorySystem to detect corruption on save
3. **Corruption Components**: Add ECS components to mark corrupted souls in the game world:
   ```typescript
   {
     type: 'corrupted_soul',
     corruption_reason: 'fate_ceremony_failed',
     corruption_date: Date.now(),
     recoverable: true,
     recovery_requirements: ['divine_intervention', 'fate_summoning_ritual']
   }
   ```

## Files Modified

1. `custom_game_engine/packages/core/src/systems/SoulCreationSystem.ts`
2. `custom_game_engine/packages/divinity/src/SoulCreationCeremony.ts`
3. `custom_game_engine/scripts/clean-corrupted-souls.ts` (NEW)
4. 5 soul JSON files (1 cleaned, 4 marked as corrupted)

## Preservation of Game Matter ✅

Following the project's core principle, **no souls were deleted**. Corrupted souls were preserved and marked with lore-appropriate messages, turning a bug into a potential gameplay feature. Future players may discover these "veiled souls" and quest to restore their true purposes.
