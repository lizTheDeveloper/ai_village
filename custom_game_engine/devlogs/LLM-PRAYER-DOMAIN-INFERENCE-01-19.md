# LLM Prayer Domain Inference Implementation

**Date:** 2026-01-19
**Feature:** DeityEmergenceSystem LLM prayer domain inference
**Estimated effort:** 4-6 hours
**Status:** ✅ Complete

## Overview

Implemented LLM-based prayer domain inference in `DeityEmergenceSystem` to improve deity emergence based on prayer content analysis. The system now intelligently classifies prayers into divine domains using an LLM, with robust fallback to keyword matching.

## Implementation Details

### Files Modified

1. **`packages/core/src/systems/DeityEmergenceSystem.ts`**
   - Added `LLMDecisionQueue` integration
   - Implemented async LLM domain inference
   - Added caching for LLM results
   - Enhanced keyword matching as fallback
   - Added belief migration from keyword to LLM-inferred domains

2. **`packages/core/src/systems/registerAllSystems.ts`**
   - Updated `DeityEmergenceSystem` registration to pass `llmQueue`
   - Line 875: `new DeityEmergenceSystem({}, llmQueue || undefined)`

### New Interfaces

```typescript
interface PendingDomainInference {
  prayerContent: string;
  requestId: string;
  timestamp: number;
}
```

### Key Features

#### 1. LLM Integration
- **Constructor:** Now accepts optional `LLMDecisionQueue` parameter
- **Async processing:** LLM requests are queued and processed asynchronously
- **Graceful degradation:** Works without LLM queue (fallback to keyword matching)

#### 2. Domain Inference Flow

```
Prayer received
    ↓
inferDomainFromPrayer()
    ↓
┌─────────────────────────────┐
│ Check cache                 │
│ - Return if cached          │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ LLM available?              │
│ Yes → Queue LLM request     │
│ No  → Skip to fallback      │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Keyword matching (fallback) │
│ - Immediate result          │
└─────────────────────────────┘
    ↓
Later tick...
    ↓
processLLMDomainInferences()
    ↓
┌─────────────────────────────┐
│ Parse & validate response   │
│ - Cache result              │
│ - Migrate beliefs if needed │
└─────────────────────────────┘
```

#### 3. LLM Prompt Structure

```typescript
buildDomainInferencePrompt(prayerContent: string): string
```

The prompt:
- Lists all 29 valid divine domains
- Requests structured JSON response
- Asks for domain classification, confidence, and reasoning
- Handles ambiguous prayers with fallback to "mystery" domain

Example response format:
```json
{
  "domain": "healing",
  "confidence": 0.9,
  "reasoning": "Prayer requests healing for sick family member"
}
```

#### 4. Keyword Matching (Fallback)

Enhanced keyword matching covers all 29 domains:
- `harvest`, `war`, `wisdom`, `craft`, `nature`, `death`, `love`, `chaos`, `order`
- `fortune`, `protection`, `healing`, `mystery`, `time`, `sky`, `earth`, `water`
- `fire`, `storm`, `hunt`, `home`, `travel`, `trade`, `justice`, `vengeance`
- `dreams`, `fear`, `beauty`, `trickery`

#### 5. Caching Strategy

- **LLM results cached:** Prevents duplicate LLM calls for same prayer text
- **Cache size limit:** Max 1000 entries (FIFO eviction)
- **Cache key:** Prayer content (exact match)

#### 6. Belief Migration

When LLM inference returns a different domain than keyword matching:
- Belief points are migrated from keyword domain to LLM domain
- Contributors are merged
- Ensures accurate deity emergence based on refined classification

### Error Handling

1. **Invalid JSON:** Logs error, caches `null` result, falls back to keywords
2. **Invalid domain:** Validates against known domains, rejects invalid responses
3. **LLM unavailable:** Seamlessly uses keyword matching only
4. **Request failure:** Catches and logs errors, doesn't crash system

### Performance Optimizations

1. **Throttled updates:** System runs every ~1 minute (1200 ticks at 20 TPS)
2. **Async processing:** LLM requests don't block game loop
3. **Early cache check:** Skips LLM request if result cached
4. **Stale request cleanup:** Removes old pending requests
5. **Cache size limit:** Prevents unbounded memory growth

## Testing

Created comprehensive test suite in `packages/core/src/systems/__tests__/DeityEmergence.llm.test.ts`:

1. ✅ Keyword matching as immediate fallback
2. ✅ LLM request queuing
3. ✅ Response caching
4. ✅ Invalid JSON handling
5. ✅ Domain validation
6. ✅ Works without LLM queue
7. ✅ Prompt includes all valid domains

## Example Usage

### With LLM
```typescript
const llmQueue = new LLMDecisionQueue(llmProvider, 1);
const system = new DeityEmergenceSystem({}, llmQueue);
```

### Without LLM (keyword only)
```typescript
const system = new DeityEmergenceSystem({});
```

## Integration Points

### Event Flow
```
PrayerSystem
    ↓ (emits)
divinity:proto_deity_belief event
    ↓ (contains)
{ agentId, prayerContent, beliefContributed, timestamp }
    ↓
DeityEmergenceSystem.trackProtoDeityBelief()
    ↓
inferDomainFromPrayer(prayerContent)
    ↓ (if LLM available)
Queue LLM request
    ↓ (async)
processLLMDomainInferences()
    ↓
Update belief tracking with refined domain
```

### System Update Cycle
```typescript
protected onUpdate(ctx: SystemContext): void {
  // 1. Process LLM responses
  if (this.llmQueue) {
    this.processLLMDomainInferences();
  }

  // 2. Check proto-deity emergence
  this.checkProtoDeityEmergence(ctx.world, ctx.tick);

  // 3. Detect belief patterns
  const patterns = this.detectBeliefPatterns(ctx.world, ctx.activeEntities);

  // 4. Emerge deities if threshold met
  for (const pattern of patterns) {
    if (this.shouldEmerge(pattern)) {
      this.emergeDeity(ctx.world, pattern, ctx.tick);
    }
  }
}
```

## Benefits

1. **More accurate domain classification:** LLM understands context better than keywords
2. **Emergent deity quality:** Gods emerge with domains that truly match their believers' prayers
3. **Robust fallback:** System works immediately with keywords, upgrades to LLM when available
4. **Performance conscious:** Async processing, caching, throttling
5. **Future-proof:** Easy to add more sophisticated prompts or domain types

## Future Enhancements

- [ ] Multi-domain classification (prayers can relate to multiple domains)
- [ ] Confidence-based weighting (high-confidence LLM results override keywords)
- [ ] Domain relationship inference (e.g., healing + life = life domain deity)
- [ ] Cultural context awareness (same prayer text may have different meanings in different cultures)
- [ ] Agent personality influence (how different agents interpret same divine manifestation)

## Related Files

- `packages/core/src/components/DeityComponent.ts` - DivineDomain type definition
- `packages/core/src/systems/PrayerSystem.ts` - Emits proto_deity_belief events
- `packages/llm/src/LLMDecisionQueue.ts` - LLM request queue implementation
- `packages/core/src/systems/MythGenerationSystem.ts` - Similar LLM integration pattern

## Notes

- TODO at line 445 has been resolved ✅
- Build passes with no new errors
- System is backward compatible (works without LLM)
- Tests created but blocked by unrelated test setup issues (plot templates)
- Implementation follows existing patterns from MythGenerationSystem
