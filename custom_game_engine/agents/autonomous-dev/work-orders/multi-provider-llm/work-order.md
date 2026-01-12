# Work Order: Multi-Provider LLM Support

**Phase:** Infrastructure (LLM Extensibility)
**Created:** 2026-01-11
**Priority:** MEDIUM
**Status:** READY_FOR_IMPLEMENTATION

---

## Problem Statement

The game was built around **Qwen 3 32B** running on **Groq**, but users may want to:

1. Use different LLM providers (OpenAI, Anthropic, Together, local Ollama, etc.)
2. Use different models (Llama 3.3, Mistral, Claude, GPT-4, etc.)
3. Provide their own API keys
4. Handle model-specific quirks (thinking tags, tool calling support, response formats)

Currently, `OpenAICompatProvider.ts` has some model detection but it's:
- Hardcoded for specific model strings (qwen, llama, deepseek)
- Mixed into the main provider class
- Not easily configurable by users

---

## Requirements

### R1: Model Profile System

Create a model profile registry that captures model-specific behaviors:

```typescript
interface ModelProfile {
  // Identification
  modelPattern: RegExp;  // Pattern to match model names

  // Capabilities
  supportsToolCalling: boolean;
  supportsThinkTags: boolean;      // <think>...</think>
  supportsReasoningField: boolean; // message.reasoning (Groq/Qwen)

  // Response format preferences
  preferredThinkingFormat: 'think_tags' | 'reasoning_field' | 'none';

  // System prompt adjustments
  systemPromptPrefix?: string;
  systemPromptSuffix?: string;

  // Token limits
  maxContextTokens: number;
  maxOutputTokens: number;

  // Pricing (per 1M tokens)
  inputCostPer1M: number;
  outputCostPer1M: number;
}
```

### R2: Built-in Model Profiles

Include profiles for current frontier models (as of January 2026):

| Model Family | Provider | Tool Calling | Think Tags | Context | Notes |
|--------------|----------|--------------|------------|---------|-------|
| **Qwen 3 32B** | Groq/Together | Yes | Yes | 32K | Default, well-tested |
| **GPT-5.2** | OpenAI | Yes | No | 400K | Latest OpenAI - Instant/Thinking/Pro variants |
| **Claude Sonnet 4.5** | Anthropic | Yes | Extended thinking | 200K | Best coding model, $3/$15 per 1M tokens |
| **Gemini 3 Pro** | Google | Yes | No | 2M | State-of-the-art reasoning + multimodal |
| **Kimi K2** | Moonshot/OpenRouter | Yes | Yes (K2-Thinking) | 128K | 1T MoE, open source, strong agentic |
| **Llama 3.3** | Groq/Ollama | Yes | No | 128K | Good tool calling, local-friendly |
| **DeepSeek V3** | DeepSeek | Yes | Yes | 64K | Similar to Qwen |
| **Mistral Large** | Groq/Together | Yes | No | 128K | Fast inference |

**Model Details:**

- **GPT-5.2** ([source](https://openai.com/index/introducing-gpt-5-2/)): Three variants (Instant, Thinking, Pro). First model >90% on ARC-AGI. $1.75/1M input tokens.
- **Claude Sonnet 4.5** ([source](https://www.anthropic.com/news/claude-sonnet-4-5)): State-of-the-art SWE-bench (72.7%), best for coding agents. Hybrid instant/extended thinking.
- **Gemini 3 Pro** ([source](https://developers.googleblog.com/en/gemini-2-family-expands/)): Google's latest with powerful agentic and coding capabilities.
- **Kimi K2** ([source](https://github.com/MoonshotAI/Kimi-K2)): 1T parameter MoE, 32B active. K2-Thinking beats GPT-5 on BrowseComp (60.2% vs 54.9%). Open source (MIT).

### R3: Provider Configuration UI

Add settings panel for LLM configuration:

```typescript
interface LLMSettings {
  // Provider selection
  provider: 'groq' | 'cerebras' | 'openai' | 'ollama' | 'together' | 'custom';

  // API configuration
  apiKey?: string;          // User's API key
  baseUrl?: string;         // Custom endpoint (for Ollama, etc.)

  // Model selection
  model: string;            // Model name/ID

  // Optional overrides
  maxTokens?: number;
  temperature?: number;

  // Advanced: Custom model profile
  customProfile?: Partial<ModelProfile>;
}
```

### R4: Graceful Fallback Chain

When tool calling fails, fall back gracefully:

1. **Try tool calling** (preferred)
2. **Retry without tools** if 400 error
3. **Parse JSON from text** if response is JSON
4. **Extract action from text** as last resort

Current code does some of this but it's messy.

### R5: Local Model Support (Ollama)

Ensure Ollama works well for users who want local inference:

- `OllamaProvider.ts` exists but may need updates
- Should detect Ollama at `localhost:11434` automatically
- Handle models that don't support tool calling well

### R6: API Key Management

Support multiple ways to provide API keys:

1. **Environment variables** (current): `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.
2. **Settings panel** (new): Store in localStorage, encrypted if possible
3. **Per-request headers** (current): `customHeaders` on provider

### R7: Automated Model Capability Discovery (CRITICAL)

**Problem:** New open models will come out and we don't know what they support. Instead of hardcoding profiles, we should auto-detect capabilities.

**Solution:** A benchmark/probe system that discovers model capabilities at runtime:

```typescript
interface ModelCapabilityProbe {
  // What we're testing for
  capability: 'tool_calling' | 'think_tags' | 'reasoning_field' | 'json_mode';

  // The probe to send
  testPrompt: string;
  testTools?: Tool[];

  // How to detect success
  successDetector: (response: LLMResponse) => boolean;

  // Variants to try (e.g., different tag names)
  variants?: string[];
}

interface DiscoveredCapabilities {
  supportsToolCalling: boolean;
  toolCallingReliability: number;  // 0-1 (tested with N probes)

  thinkingFormat: 'think_tags' | 'thinking_tags' | 'thoughts_tags' | 'reasoning_field' | 'none';
  thinkingTagName?: string;  // The actual tag name that worked

  supportsJsonMode: boolean;
  maxObservedTokens: number;

  // Probe results for debugging
  probeResults: ProbeResult[];
}
```

**Discovery Probes:**

1. **Tool Calling Probe:**
   ```typescript
   const toolCallingProbe = {
     prompt: "What is 2 + 2? Use the calculator tool to compute.",
     tools: [{
       type: 'function',
       function: {
         name: 'calculator',
         description: 'Performs basic math',
         parameters: {
           type: 'object',
           properties: { expression: { type: 'string' } }
         }
       }
     }],
     successDetector: (r) => r.toolCalls?.length > 0
   };
   ```

2. **Thinking Tag Probe (tries multiple variants):**
   ```typescript
   const thinkTagVariants = ['think', 'thinking', 'thoughts', 'reasoning', 'internal'];

   for (const tagName of thinkTagVariants) {
     const probe = {
       prompt: `Before answering, show your reasoning inside <${tagName}>...</${tagName}> tags. Question: Is 7 a prime number?`,
       successDetector: (r) => {
         const regex = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`);
         return regex.test(r.content);
       }
     };
     // Run probe and record which tag name works
   }
   ```

3. **Reasoning Field Probe (Groq/Qwen style):**
   ```typescript
   const reasoningFieldProbe = {
     prompt: "Think step by step. What is 15% of 80?",
     successDetector: (r) => !!r.message?.reasoning || !!r.reasoning
   };
   ```

4. **JSON Mode Probe:**
   ```typescript
   const jsonModeProbe = {
     prompt: "Respond with a JSON object containing 'answer' and 'confidence' fields.",
     responseFormat: { type: 'json_object' },
     successDetector: (r) => {
       try {
         JSON.parse(r.content);
         return true;
       } catch { return false; }
     }
   };
   ```

**Discovery Flow:**

```typescript
class ModelCapabilityDiscovery {
  async discoverCapabilities(
    provider: LLMProvider,
    model: string
  ): Promise<DiscoveredCapabilities> {
    const results: DiscoveredCapabilities = {
      supportsToolCalling: false,
      toolCallingReliability: 0,
      thinkingFormat: 'none',
      supportsJsonMode: false,
      maxObservedTokens: 0,
      probeResults: []
    };

    // 1. Test tool calling (3 probes for reliability)
    const toolResults = await this.runProbesWithRetry(
      provider, model, this.toolCallingProbes, 3
    );
    results.supportsToolCalling = toolResults.successRate > 0.5;
    results.toolCallingReliability = toolResults.successRate;

    // 2. Test thinking tag variants
    for (const tagName of this.thinkTagVariants) {
      const tagResult = await this.runProbe(
        provider, model, this.createThinkTagProbe(tagName)
      );
      if (tagResult.success) {
        results.thinkingFormat = 'think_tags';
        results.thinkingTagName = tagName;
        break;  // Found working tag
      }
    }

    // 3. Test reasoning field (if no think tags found)
    if (results.thinkingFormat === 'none') {
      const reasoningResult = await this.runProbe(
        provider, model, this.reasoningFieldProbe
      );
      if (reasoningResult.success) {
        results.thinkingFormat = 'reasoning_field';
      }
    }

    // 4. Test JSON mode
    const jsonResult = await this.runProbe(
      provider, model, this.jsonModeProbe
    );
    results.supportsJsonMode = jsonResult.success;

    return results;
  }

  // Cache discovered capabilities
  private discoveryCache = new Map<string, DiscoveredCapabilities>();

  async getOrDiscoverCapabilities(
    provider: LLMProvider,
    model: string
  ): Promise<DiscoveredCapabilities> {
    const cacheKey = `${provider.name}:${model}`;

    if (this.discoveryCache.has(cacheKey)) {
      return this.discoveryCache.get(cacheKey)!;
    }

    // Check localStorage for persisted discovery
    const stored = localStorage.getItem(`model_caps_${cacheKey}`);
    if (stored) {
      const caps = JSON.parse(stored);
      this.discoveryCache.set(cacheKey, caps);
      return caps;
    }

    // Run discovery
    const caps = await this.discoverCapabilities(provider, model);
    this.discoveryCache.set(cacheKey, caps);
    localStorage.setItem(`model_caps_${cacheKey}`, JSON.stringify(caps));

    return caps;
  }
}
```

**When to Run Discovery:**

1. **First use of unknown model** - Run full discovery suite
2. **Settings change** - Re-run if model changes
3. **Manual trigger** - "Test Model" button in settings
4. **Failure recovery** - If tool calling fails, re-probe

**Discovery UI:**

```
┌────────────────────────────────────────┐
│ Model: qwen-3-32b @ groq               │
│ Status: Discovering capabilities...    │
│                                        │
│ ✅ Tool Calling: Supported (100%)      │
│ ✅ Think Tags: <think>                 │
│ ⏳ JSON Mode: Testing...               │
│ ❓ Reasoning Field: Not tested         │
│                                        │
│ [Re-run Discovery] [Use Known Profile] │
└────────────────────────────────────────┘
```

**Benefits:**

1. **Future-proof**: Works with any new model that follows similar patterns
2. **No hardcoding**: Discovers what works rather than assuming
3. **Self-healing**: If model behavior changes, re-discovery adapts
4. **Transparent**: Users can see what capabilities were detected

**Integration with Model Profiles:**

- Known models get hardcoded profiles (faster, reliable)
- Unknown models trigger auto-discovery
- Users can override discovered capabilities
- Discovery results can be shared/exported

---

## Current Architecture

### Existing Files

| File | Purpose |
|------|---------|
| `LLMProvider.ts` | Interface definition |
| `OpenAICompatProvider.ts` | Main provider, handles Groq/Cerebras/OpenAI |
| `OllamaProvider.ts` | Ollama-specific provider |
| `FallbackProvider.ts` | Fallback chain |
| `LoadBalancingProvider.ts` | Load balancing across providers |
| `ProviderPoolManager.ts` | Pool management |
| `ProviderQueue.ts` | Request queuing |
| `ProxyLLMProvider.ts` | Proxy wrapper |

### Current Model Detection (OpenAICompatProvider.ts:505-522)

```typescript
const isQwen = this.model.toLowerCase().includes('qwen');
const isLlama = this.model.toLowerCase().includes('llama');
const isDeepseek = this.model.toLowerCase().includes('deepseek');

let thinkingInstructions: string;
if (isQwen) {
  thinkingInstructions = `First, reason about what to do inside <think>...</think> tags...`;
} else if (isDeepseek) {
  thinkingInstructions = `Use <think>...</think> tags...`;
} else if (isLlama) {
  thinkingInstructions = `Briefly consider what you should do...`;
} else {
  thinkingInstructions = `Think briefly about what action makes sense.`;
}
```

This needs to be refactored into a proper profile system.

---

## Acceptance Criteria

### Criterion 1: Model Profile Registry
- **WHEN:** A new model is used
- **THEN:** The system detects its capabilities from the profile registry
- **Verification:** Unit tests for profile matching

### Criterion 2: Qwen 3 Still Works
- **WHEN:** Using default Groq + Qwen 3 setup
- **THEN:** Behavior is identical to current system
- **Verification:** Existing DeepEval tests pass

### Criterion 3: Llama 3.3 Works
- **WHEN:** Switching to Llama 3.3 on Groq
- **THEN:** Tool calling works, no think tags expected
- **Verification:** Manual test + new unit tests

### Criterion 4: Ollama Local Works
- **WHEN:** Running local Ollama with Qwen or Llama
- **THEN:** Can configure in settings and agents use it
- **Verification:** Manual test with local Ollama

### Criterion 5: Custom API Keys
- **WHEN:** User provides their own Groq/OpenAI key
- **THEN:** That key is used for requests
- **Verification:** Settings panel stores and uses custom key

### Criterion 6: Settings Persist
- **WHEN:** User changes LLM settings
- **THEN:** Settings persist across page reloads
- **Verification:** localStorage contains LLM settings

### Criterion 7: Auto-Discovery Works for Unknown Models
- **WHEN:** Using a model not in the hardcoded profiles
- **THEN:** System runs discovery probes and detects capabilities
- **Verification:**
  - Tool calling probe correctly identifies support
  - Thinking tag probe finds the right tag name
  - Results are cached for future use
  - Discovery UI shows probe status

### Criterion 8: Discovery Handles New Thinking Tag Variants
- **WHEN:** A new model uses an unusual thinking tag (e.g., `<internal>`, `<reasoning>`)
- **THEN:** Discovery system tries common variants and finds the working one
- **Verification:** Unit tests with mock responses using different tag names

---

## Files to Create

### New Files

1. **`packages/llm/src/ModelProfileRegistry.ts`**
   - Model profile interface
   - Built-in profiles for common models
   - Profile matching logic

2. **`packages/llm/src/ModelProfiles.ts`** (or inline in registry)
   - Qwen 3 profile
   - Llama 3 profile
   - Mistral profile
   - DeepSeek profile
   - GPT-4 profile
   - Default fallback profile

3. **`packages/renderer/src/LLMSettingsPanel.ts`**
   - UI for configuring LLM provider/model
   - API key input (masked)
   - Model selection dropdown
   - Test connection button

4. **`packages/llm/src/__tests__/ModelProfileRegistry.test.ts`**
   - Profile matching tests
   - Capability detection tests

5. **`packages/llm/src/ModelCapabilityDiscovery.ts`**
   - Probe definitions for tool calling, think tags, reasoning field, JSON mode
   - Discovery orchestration
   - Result caching (memory + localStorage)
   - Integration with provider

6. **`packages/llm/src/__tests__/ModelCapabilityDiscovery.test.ts`**
   - Mock provider tests for discovery
   - Probe success/failure detection tests
   - Cache hit/miss tests

---

## Files to Modify

### Priority 1 - Core Provider Refactor

1. **`packages/llm/src/OpenAICompatProvider.ts`**
   - Extract model detection into profile lookup
   - Use profile for thinking instructions
   - Use profile for tool calling decisions
   - Use profile for response parsing

### Priority 2 - Settings Integration

2. **`packages/llm/src/LLMRouter.ts`** (or wherever provider is configured)
   - Load settings from localStorage
   - Apply custom API keys
   - Select provider based on settings

### Priority 3 - Ollama Updates

3. **`packages/llm/src/OllamaProvider.ts`**
   - Ensure tool calling support matches capabilities
   - Add profile-based behavior

---

## Implementation Notes

### Model Profile Matching

```typescript
class ModelProfileRegistry {
  private profiles: ModelProfile[] = [
    // Order matters - more specific patterns first
    { modelPattern: /qwen.*3/i, supportsThinkTags: true, ... },
    { modelPattern: /qwen/i, supportsThinkTags: true, ... },
    { modelPattern: /llama.*3\.3/i, supportsToolCalling: true, ... },
    { modelPattern: /llama/i, supportsToolCalling: true, ... },
    { modelPattern: /gpt-4/i, supportsToolCalling: true, ... },
    { modelPattern: /.*/, ... },  // Default fallback
  ];

  getProfile(modelName: string): ModelProfile {
    return this.profiles.find(p => p.modelPattern.test(modelName))
      ?? this.defaultProfile;
  }
}
```

### Settings Storage

```typescript
const LLM_SETTINGS_KEY = 'ai_village_llm_settings';

function saveLLMSettings(settings: LLMSettings): void {
  localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(settings));
}

function loadLLMSettings(): LLMSettings | null {
  const stored = localStorage.getItem(LLM_SETTINGS_KEY);
  return stored ? JSON.parse(stored) : null;
}
```

### Secure API Key Handling

For API keys in localStorage, consider:
- Don't store raw keys (use browser's credential manager if available)
- At minimum, base64 encode (not secure, but obscures from casual viewing)
- Warn users about localStorage limitations
- Support env vars as primary method for production

---

## Testing Checklist

- [ ] Existing DeepEval tests pass (Qwen 3 behavior unchanged)
- [ ] New unit tests for ModelProfileRegistry
- [ ] New unit tests for ModelCapabilityDiscovery
- [ ] Discovery probe tests for each capability type
- [ ] Discovery cache hit/miss tests
- [ ] Manual test: Groq + Qwen 3 (default)
- [ ] Manual test: Groq + Llama 3.3
- [ ] Manual test: Local Ollama + Qwen 3
- [ ] Manual test: Custom API key from settings
- [ ] Manual test: Unknown model triggers auto-discovery
- [ ] Settings persist across reload
- [ ] Build passes: `npm run build`
- [ ] No console errors in browser

---

## Out of Scope

The following are NOT part of this work order:

1. **Anthropic Claude provider** - Claude API is different enough to need its own provider
2. **Streaming responses** - Keep batch-only for now
3. **Fine-tuned models** - Assume standard model behavior
4. **Multi-model agents** - Each agent uses one model (configurable globally)

---

## Notes for Implementation Agent

1. **Start with ModelProfileRegistry** - This is the core abstraction
2. **Implement ModelCapabilityDiscovery next** - Core auto-detection logic
3. **Don't break Qwen 3** - This is the default and must keep working
4. **Test incrementally** - Run DeepEval tests after each major change
5. **Settings panel last** - Core refactor first, UI second

**Implementation Order:**
1. `ModelProfileRegistry.ts` - Profile interface and known profiles
2. `ModelCapabilityDiscovery.ts` - Probe definitions and discovery logic
3. Integrate into `OpenAICompatProvider.ts` - Replace hardcoded detection
4. Unit tests for both new files
5. Settings panel UI (if time permits)

---

## Notes for Review Agent

1. **Check Qwen 3 compatibility** - Must not regress
2. **Check profile matching** - Should be deterministic
3. **Check discovery probes** - Must test all capability types
4. **Check discovery caching** - Results should persist
5. **Check settings security** - API keys shouldn't be exposed
6. **Run existing tests** - All should pass

---

## Notes for Playtest Agent

Manual testing needed for:
1. Start game with default settings (should work exactly as before)
2. Change to different model in settings (if UI exists)
3. Verify agents still behave coherently
4. Check that tool calling still works

---

## Success Metrics

This work order is COMPLETE when:

1. Model profile registry exists with profiles for Qwen, Llama, Mistral, DeepSeek, GPT-4
2. OpenAICompatProvider uses profiles instead of hardcoded model detection
3. **Model capability discovery system can auto-detect unknown models**
4. **Discovery probes for: tool calling, think tags (5+ variants), reasoning field, JSON mode**
5. Existing DeepEval tests pass
6. At least one non-Qwen model tested and working
7. Settings can be changed (even if UI is basic)
8. Build passes with no new TypeScript errors

---

## Future Enhancements (Not This Work Order)

- Anthropic Claude provider
- Streaming responses
- Per-agent model selection
- Cost tracking dashboard
- Rate limit handling improvements
- Model-specific prompt optimization

---

**Estimated Complexity:** MEDIUM-HIGH
**Estimated Effort:** 2-3 days
**Priority:** MEDIUM (enables broader adoption)
