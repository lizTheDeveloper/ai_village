# Model Capability Discovery Implementation

**Date:** 2026-01-11
**Task:** Create automated Model Capability Discovery system for probing unknown LLM models

## Summary

Successfully implemented the ModelCapabilityDiscovery system that automatically detects capabilities of unknown LLM models through lightweight probes.

## Files Created

### 1. `/packages/llm/src/ModelCapabilityDiscovery.ts`

Main implementation with:
- **ModelCapabilityDiscovery class** - Runs capability probes on LLM providers
- **Discovery probes** for:
  - Tool calling (3 probes for reliability scoring)
  - Thinking tags (tries 5 variants: think, thinking, thoughts, reasoning, internal)
  - Reasoning field (Groq/Qwen style)
  - JSON mode
- **Caching system** - Both memory and localStorage persistence
- **Timeout handling** - 10-second timeout per probe
- **Error resilience** - Continues probing even if individual probes fail

### 2. `/packages/llm/src/__tests__/ModelCapabilityDiscovery.test.ts`

Comprehensive test suite with 27 tests covering:
- Tool calling detection (success, failure, reliability scoring)
- Think tag variant detection (all 5 variants)
- Reasoning field detection
- JSON mode detection
- Cache behavior (hit, miss, invalidation)
- Error handling (probe failures, partial failures)
- localStorage persistence
- Max observed tokens tracking
- Singleton instance behavior

## Key Features

### Capability Detection

```typescript
interface DiscoveredCapabilities {
  supportsToolCalling: boolean;
  toolCallingReliability: number;  // 0-1 (tested with 3 probes)

  thinkingFormat: 'think_tags' | 'reasoning_field' | 'none';
  thinkingTagName?: string;  // Actual tag name that worked

  supportsJsonMode: boolean;
  maxObservedTokens: number;

  probeResults: ProbeResult[];
  discoveredAt: number;
}
```

### Usage Example

```typescript
import { modelCapabilityDiscovery } from '@ai-village/llm';

// Discover capabilities (runs 6+ probes)
const capabilities = await modelCapabilityDiscovery.discoverCapabilities(
  provider,
  'unknown-model'
);

// Later: use cached results
const cached = await modelCapabilityDiscovery.getOrDiscoverCapabilities(
  provider,
  'unknown-model'
);

// Clear cache if needed
modelCapabilityDiscovery.clearCache('unknown-model');
```

### Probe Types

1. **Tool Calling** (3x for reliability)
   - Prompt: "What is 2 + 2? Use the calculator tool."
   - Detects: Tool/function mentions in response
   - Reliability: Success count / 3

2. **Think Tags** (tries 5 variants)
   - Variants: think, thinking, thoughts, reasoning, internal
   - Prompt: "Show reasoning in <tag> tags..."
   - Detects: Presence of opening and closing tags

3. **Reasoning Field**
   - Prompt: "What is 5 * 7? Show your reasoning."
   - Detects: "reasoning:" field in response

4. **JSON Mode**
   - Prompt: "Return JSON with answer and reasoning..."
   - Detects: Valid JSON with expected keys

### Caching Strategy

- **Memory cache** - Fast access for repeated probes in same session
- **localStorage** - Persists across page reloads
- **Cache key** - Model name
- **Invalidation** - Manual via `clearCache(model?)`

### Error Handling

- Probes have 10-second timeout
- Individual probe failures don't stop discovery
- Failed probes recorded in `probeResults` with error messages
- Partial failures allowed (some probes succeed, others fail)

## Test Results

```
✓ 27 tests passed
  - Tool calling detection: 3 tests
  - Think tag detection: 4 tests
  - Reasoning field detection: 3 tests
  - JSON mode detection: 3 tests
  - Cache behavior: 4 tests
  - Error handling: 2 tests
  - Max tokens: 1 test
  - Probe results: 2 tests
  - Singleton: 2 tests
  - localStorage: 2 tests
  - Timestamp: 1 test
```

## Integration

Exported from `@ai-village/llm`:
```typescript
export * from './ModelCapabilityDiscovery';
```

Available:
- `ModelCapabilityDiscovery` - Class for creating instances
- `modelCapabilityDiscovery` - Singleton instance (recommended)
- All types and interfaces

## Performance

- **Discovery time**: ~10-30 seconds (6 probes with timeouts)
- **Cache hit**: Instant (memory) or <5ms (localStorage)
- **Probe timeout**: 10 seconds max per probe
- **Lightweight probes**: 100-200 tokens per probe

## Future Enhancements

Potential improvements:
1. Add more capability probes (streaming, vision, etc.)
2. Parallel probe execution (faster discovery)
3. Probe result confidence scoring
4. Auto-discovery on first use (lazy initialization)
5. Export discovery results for sharing
6. Model capability comparison tools

## Verification

Build: ✅ No TypeScript errors
Tests: ✅ All 27 tests passing
Export: ✅ Properly exported from package index
