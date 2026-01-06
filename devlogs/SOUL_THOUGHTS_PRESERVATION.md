# Soul Thoughts Preservation - January 5, 2026

## Overview

Updated the soul creation system to **preserve** Fate reasoning instead of discarding it. The thinking content from `<thinking>` tags is now extracted and saved to a separate `thoughts` field for transparency and debugging.

## Why This Matters

The Fates' internal reasoning is valuable for:
- **Debugging**: Understanding why a soul got certain attributes
- **Transparency**: Players can see the divine reasoning process
- **Lore**: Fate thoughts add depth to the soul creation narrative
- **Development**: Helps tune prompts and improve soul quality

## Previous Behavior

**Before:** Thinking tags were stripped and discarded
```typescript
response = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
// Thinking content lost forever ❌
```

**Example Soul (Before):**
```json
{
  "name": "Cedar",
  "purpose": "I see a soul meant to bridge old and new...",
  "interests": ["knowledge", "crafting"]
}
```

## New Behavior

**After:** Thinking is extracted and preserved separately
```typescript
// Extract thinking content
const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i);
thoughts = thinkingMatch?.[1].trim();

// Strip from output
response = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
```

**Example Soul (After):**
```json
{
  "name": "Cedar",
  "purpose": "I see a soul meant to bridge old and new...",
  "interests": ["knowledge", "crafting"],
  "thoughts": "[The Weaver] Let me consider the context. The First Village needs someone to connect traditions with innovation. I should propose a purpose that balances old and new...\n\n[The Spinner] The Weaver proposed bridging. I'll spin interests that support this - knowledge to learn from the past, crafting to build the future...\n\n[The Cutter] I see two paths: one where they succeed in uniting the village, another where the weight of tradition crushes innovation..."
}
```

## Implementation

### 1. Updated Interfaces

**ConversationExchange** (`packages/divinity/src/SoulCreationCeremony.ts:105-121`):
```typescript
export interface ConversationExchange {
  speaker: 'weaver' | 'spinner' | 'cutter' | 'soul' | 'chorus';
  text: string;
  thoughts?: string; // NEW: Internal reasoning preserved
  tick: number;
  topic: 'examination' | 'purpose' | 'interests' | 'destiny' | 'debate' | 'blessing' | 'curse' | 'finalization';
}
```

**SoulRecord** (`packages/core/src/systems/SoulRepositorySystem.ts:27-60`):
```typescript
interface SoulRecord {
  // ... identity fields ...
  purpose: string;
  interests: string[];
  thoughts?: string; // NEW: Fate reasoning (preserved for transparency/debugging)
  // ... other fields ...
}
```

### 2. Extraction Logic

**SoulCreationSystem** (`packages/core/src/systems/SoulCreationSystem.ts:467-512`):

```typescript
// Extract thinking content (both <think> and <thinking> variants)
const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i);
const thinkMatch = fullResponse.match(/<think>([\s\S]*?)<\/think>/i);
thoughts = thinkingMatch?.[1].trim() || thinkMatch?.[1].trim();

// Strip thinking tags to get only character speech
response = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
response = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// Also handle JSON responses
const jsonMatch = response.match(/\{[\s\S]*"speaking":\s*"([^"]+)"[\s\S]*\}/);
if (jsonMatch) {
  const jsonThinkingMatch = fullResponse.match(/"thinking":\s*"([^"]+)"/);
  if (jsonThinkingMatch && !thoughts) {
    thoughts = jsonThinkingMatch[1];
  }
  response = jsonMatch[1];
}

// Add to transcript with thoughts
const exchange: ConversationExchange = {
  speaker: ceremony.currentSpeaker,
  text: response,
  thoughts: thoughts, // Preserved!
  tick: world.tick,
  topic: this.determineTopic(ceremony.turnCount),
};
```

### 3. Compilation for Soul Record

**SoulCreationSystem** (`packages/core/src/systems/SoulCreationSystem.ts:617-627`):

```typescript
// Compile all Fate thoughts into a single string for the soul record
const allThoughts = ceremony.transcript
  .filter(exchange => exchange.thoughts)
  .map(exchange => {
    const speaker = exchange.speaker === 'weaver' ? 'The Weaver'
      : exchange.speaker === 'spinner' ? 'The Spinner'
      : exchange.speaker === 'cutter' ? 'The Cutter'
      : exchange.speaker;
    return `[${speaker}] ${exchange.thoughts}`;
  })
  .join('\n\n');
```

### 4. Persistence

**SoulRepositorySystem** (`packages/core/src/systems/SoulRepositorySystem.ts:150-197`):

```typescript
const { soulId, agentId, name, archetype, purpose, species, interests, thoughts } = soulData;

const soulRecord: SoulRecord = {
  // ... other fields ...
  thoughts: thoughts || undefined, // Saved to soul repository
  // ... other fields ...
};
```

### 5. Cleanup Script

**clean-corrupted-souls.ts** (Updated):

Now extracts thinking from old souls instead of discarding:

```typescript
function cleanPurpose(purpose: string): { purpose: string; thoughts?: string } {
  // Extract <thinking> content
  const thinkingMatch = cleaned.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkingMatch) {
    extractedThoughts = thinkingMatch[1].trim();
  }

  // Strip tags from purpose
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  return { purpose: cleaned, thoughts: extractedThoughts };
}
```

## Example: Real Soul with Thoughts

When a new soul is created, the LLM response looks like:

**The Weaver's Response:**
```
<thinking>
Okay, I need to create The Weaver's response for the soul creation ceremony. The context is the founding of the First Village with a blessed cosmic alignment. The village needs structure, cooperation, and survival. I should propose a purpose that addresses these needs while being poetic. Maybe something about laying foundations and gathering resources. The blessed alignment suggests a positive role. Let me use the tapestry metaphor and make it concise.
</thinking>

I see a soul meant to lay the village's foundations like a patient spider spinning earth into order. This thread shall gather and build—stockpiling not just wood and stone, but the collective will to endure.
```

**Extracted and Stored:**
```json
{
  "purpose": "I see a soul meant to lay the village's foundations like a patient spider spinning earth into order. This thread shall gather and build—stockpiling not just wood and stone, but the collective will to endure.",
  "thoughts": "[The Weaver] Okay, I need to create The Weaver's response for the soul creation ceremony. The context is the founding of the First Village with a blessed cosmic alignment..."
}
```

## Benefits

1. **Debugging**: Can see why souls got certain attributes
2. **Transparency**: Full divine reasoning is preserved
3. **Quality Control**: Can review Fate logic to improve prompts
4. **Lore Depth**: Thinking adds narrative richness
5. **No Data Loss**: All LLM output is preserved (Conservation of Game Matter principle)

## Files Modified

1. `packages/divinity/src/SoulCreationCeremony.ts` - Added `thoughts` to ConversationExchange
2. `packages/core/src/systems/SoulRepositorySystem.ts` - Added `thoughts` to SoulRecord
3. `packages/core/src/systems/SoulCreationSystem.ts` - Extract and compile thoughts
4. `scripts/clean-corrupted-souls.ts` - Extract thinking from old souls

## Future Enhancements

1. **Thought Viewer UI**: Display Fate reasoning in soul inspector panel
2. **Thought Analytics**: Analyze thinking patterns to improve prompts
3. **Multi-Language Thoughts**: Preserve thinking in multiple languages
4. **Thought Compression**: Archive old thoughts to reduce file size
5. **Thought Search**: Search souls by Fate reasoning content

## Testing

To verify thoughts are being preserved:

```bash
# Create new souls
./start.sh

# Spawn agents (triggers soul creation)

# Check soul repository
cat demo/soul-repository/by-date/$(date +%Y-%m-%d)/*.json | jq '{name, purpose, thoughts}'
```

Expected output:
```json
{
  "name": "Willow",
  "purpose": "I see a soul...",
  "thoughts": "[The Weaver] Let me consider..."
}
```
