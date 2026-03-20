/**
 * OpusGeneratorService — LLM orchestration for Eternal Return Opus generation
 *
 * Routes Opus generation requests through the same-origin proxy so no API
 * keys are ever exposed in the browser. Parses and validates the structured
 * LLM response into a typed OpusResult.
 *
 * One Opus per cycle. Results are cached by cycleId so a second call for the
 * same cycle returns instantly without re-querying the LLM.
 *
 * Usage (from a UI panel):
 * ```typescript
 * const service = OpusGeneratorService.getInstance();
 * const result = await service.generate(passport);
 * // result.narrative  — the 300-600 word oracular text
 * // result.cycleKey   — stable identifier for this cycle's Opus
 * // result.wordCount  — approximate word count for UI display
 * ```
 */

import { SameOriginChatProxy } from './SameOriginChatProxy.js';
import {
  OpusPromptBuilder,
  type Passport,
  type OpusLLMResponse,
} from './OpusPromptBuilder.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Model used for Opus generation.
 * The Opus is the core revelation moment — use a capable narrative model.
 */
const OPUS_MODEL = 'llama-3.3-70b-versatile';
/** Groq base URL — consistent with SpellSandboxService */
const OPUS_BASE_URL = 'https://api.groq.com/openai/v1';
/**
 * Token budget: 300-600 words ≈ 400-800 tokens of output.
 * Add system/user prompt overhead (~500 tokens) → cap at 1200 to be safe.
 */
const MAX_TOKENS = 1200;
/**
 * Slightly lower temperature than SpellSandbox — the Opus should feel
 * considered and inevitable, not inventive.
 */
const TEMPERATURE = 0.72;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * The parsed, validated output of an Opus generation.
 */
export interface OpusResult {
  /** The 300–600 word oracular narrative */
  narrative: string;
  /** Stable key derived from the passport's cycleId (for caching/storage) */
  cycleKey: string;
  /** Approximate word count — useful for UI validation */
  wordCount: number;
  /** Timestamp (ms since epoch) when this Opus was generated */
  generatedAt: number;
}

// ---------------------------------------------------------------------------
// OpusGeneratorService
// ---------------------------------------------------------------------------

export class OpusGeneratorService {
  private static _instance: OpusGeneratorService | null = null;

  private readonly proxy: Pick<SameOriginChatProxy, 'generate' | 'isAvailable'>;
  private readonly builder: OpusPromptBuilder;

  /** Cache: cycleId → OpusResult */
  private readonly cache = new Map<string, OpusResult>();

  private constructor(
    proxy: Pick<SameOriginChatProxy, 'generate' | 'isAvailable'>,
  ) {
    this.proxy = proxy;
    this.builder = new OpusPromptBuilder();
  }

  /**
   * Get or create the singleton instance backed by the default same-origin proxy.
   * @param pathPrefix - URL prefix for the proxy (e.g. '/mvee' in production, '' in dev).
   *   Only applied on first construction; ignored on subsequent calls.
   */
  static getInstance(pathPrefix: string = ''): OpusGeneratorService {
    if (!OpusGeneratorService._instance) {
      const proxy = new SameOriginChatProxy(OPUS_MODEL, OPUS_BASE_URL, pathPrefix);
      OpusGeneratorService._instance = new OpusGeneratorService(proxy);
    }
    return OpusGeneratorService._instance;
  }

  /**
   * Create a non-singleton instance with an injected proxy — for testing.
   */
  static createWithProxy(
    proxy: Pick<SameOriginChatProxy, 'generate' | 'isAvailable'>,
  ): OpusGeneratorService {
    return new OpusGeneratorService(proxy);
  }

  /**
   * Generate the Opus for a completed Passport.
   *
   * Returns the cached result if this cycle's Opus has already been generated
   * in this session. Throws if the LLM is unreachable or returns bad output.
   */
  async generate(passport: Passport): Promise<OpusResult> {
    const cycleKey = passport.cycleId;

    const cached = this.cache.get(cycleKey);
    if (cached) return cached;

    const systemPrompt = this.builder.buildSystemPrompt();
    const userPrompt = this.builder.buildUserPrompt(passport);

    const combinedPrompt = `[System]\n${systemPrompt}\n\n[User]\n${userPrompt}`;

    const response = await this.proxy.generate({
      prompt: combinedPrompt,
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    });

    const result = this.parseResponse(response.text, cycleKey);
    this.cache.set(cycleKey, result);
    return result;
  }

  /**
   * Check whether the LLM backend is reachable.
   * Use this to gracefully disable the Opus UI when offline.
   */
  async isAvailable(): Promise<boolean> {
    return this.proxy.isAvailable();
  }

  /**
   * Return all Opuses generated in this session (by cycle key).
   */
  getCachedOpuses(): Map<string, OpusResult> {
    return new Map(this.cache);
  }

  /**
   * Clear the session cache (e.g. when resetting the cycle in tests).
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Exposed as non-private via 'any' cast in tests — keep logic testable. */
  private parseResponse(raw: string, cycleKey: string): OpusResult {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as Partial<OpusLLMResponse>;

    if (typeof parsed.narrative !== 'string' || !parsed.narrative.trim()) {
      throw new Error(
        'OpusGeneratorService: LLM response missing valid "narrative" field',
      );
    }

    const narrative = parsed.narrative.trim();
    const wordCount = countWords(narrative);

    if (wordCount < 300 || wordCount > 600) {
      console.warn(
        `OpusGeneratorService: Opus word count (${wordCount}) outside target range 300–600. ` +
        'Using result as-is.',
      );
    }

    return {
      narrative,
      cycleKey,
      wordCount,
      generatedAt: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Parsing utilities
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object from the LLM response.
 * Handles responses where the model may wrap JSON in markdown code fences.
 */
function extractJson(text: string): string {
  // Try markdown fence first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return fenceMatch[1].trim();
  }

  // Fall back to first { ... } span
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

/** Approximate word count (splits on whitespace). */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
