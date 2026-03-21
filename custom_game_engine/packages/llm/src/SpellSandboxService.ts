/**
 * SpellSandboxService - Player-facing LLM service for spell casting in the Research Casting Circle
 *
 * Routes spell-generation requests through the same-origin proxy so no API keys
 * are ever exposed in the browser. Parses and validates the structured LLM response
 * into a typed SpellResult.
 *
 * Usage (from a UI panel):
 * ```typescript
 * const service = SpellSandboxService.getInstance();
 * const result = await service.cast({
 *   verb: 'Ignite', noun: 'Memory',
 *   paradigmId: 'academic', paradigmName: 'The Academies',
 *   paradigmLore: 'Magic is a science in these realms...'
 * });
 * // result.title, result.description, result.powerLevel, result.worldEffect
 * ```
 */

import { SameOriginChatProxy } from './SameOriginChatProxy.js';
import {
  SpellSandboxPromptBuilder,
  type SpellComposition,
  type SpellResult,
  type SpellLLMResponse,
} from './SpellSandboxPromptBuilder.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Model used for spell generation — fast and cheap; flavour text doesn't need heavy reasoning. */
const SPELL_MODEL = 'llama-3.3-70b-versatile';
/** Groq base URL (already used for agent cognition) */
const SPELL_BASE_URL = 'https://api.groq.com/openai/v1';
/** Token budget per spell; 2–3 sentences + JSON overhead is well within 256 tokens. */
const MAX_TOKENS = 300;
/** Slightly elevated temperature for creative flavour variation */
const TEMPERATURE = 0.85;

// ---------------------------------------------------------------------------
// SpellSandboxService
// ---------------------------------------------------------------------------

/** Persisted spellbook entry — shape matches SpellEntry in @ai-village/persistence */
export interface SpellEntry {
  verb: string;
  noun: string;
  paradigm: string;
  title: string;
  description: string;
  powerLevel: 'minor' | 'moderate' | 'major' | 'legendary';
  worldEffect?: string;
  compositionKey: string;
  discoveredAt: number;
}

/** Internal cache record: result + original composition for serialization */
interface CacheRecord {
  result: SpellResult;
  verb: string;
  noun: string;
  paradigmId: string;
  discoveredAt: number;
}

export class SpellSandboxService {
  private static _instance: SpellSandboxService | null = null;

  private readonly proxy: SameOriginChatProxy;
  private readonly builder: SpellSandboxPromptBuilder;

  /** In-memory cache: compositionKey → CacheRecord */
  private readonly cache = new Map<string, CacheRecord>();

  private constructor(pathPrefix: string = '') {
    this.proxy = new SameOriginChatProxy(SPELL_MODEL, SPELL_BASE_URL, pathPrefix);
    this.builder = new SpellSandboxPromptBuilder();

    // Listen for spellbook restoration from the save/load system
    if (typeof window !== 'undefined') {
      window.addEventListener('spellbook:loaded', ((event: CustomEvent<{ entries: SpellEntry[] }>) => {
        this.loadFromEntries(event.detail.entries);
      }) as EventListener);
    }
  }

  /**
   * Get the singleton instance.
   * @param pathPrefix - URL prefix for the same-origin proxy (e.g. '/mvee' in production, '' in dev).
   *   Only applied on first construction; ignored on subsequent calls.
   */
  static getInstance(pathPrefix: string = ''): SpellSandboxService {
    if (!SpellSandboxService._instance) {
      SpellSandboxService._instance = new SpellSandboxService(pathPrefix);
    }
    return SpellSandboxService._instance;
  }

  /**
   * Cast a spell by sending the verb+noun+paradigm composition to the LLM.
   *
   * Caches results by composition key so identical combinations return instantly
   * within a session (the player "discovered" it; no need to re-generate).
   *
   * @throws Error if the LLM is unreachable or returns unparseable output.
   */
  async cast(composition: SpellComposition): Promise<SpellResult> {
    const key = this.builder.compositionKey(composition);

    const cached = this.cache.get(key);
    if (cached) return cached.result;

    const systemPrompt = this.builder.buildSystemPrompt();
    const userPrompt = this.builder.buildUserPrompt(composition);

    // Combine into a single prompt for the SameOriginChatProxy (which uses user-turn only)
    const combinedPrompt = `[System]\n${systemPrompt}\n\n[User]\n${userPrompt}`;

    const response = await this.proxy.generate({
      prompt: combinedPrompt,
      maxTokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    });

    const result = this.parseResponse(response.text, key);
    this.cache.set(key, {
      result,
      verb: composition.verb,
      noun: composition.noun,
      paradigmId: composition.paradigmId,
      discoveredAt: Date.now(),
    });
    return result;
  }

  /**
   * Check whether the LLM backend is reachable.
   * Useful for disabling the casting UI gracefully when offline.
   */
  async isAvailable(): Promise<boolean> {
    return this.proxy.isAvailable();
  }

  /**
   * Return all spells discovered in this session.
   * Ordered by discovery time (insertion order of the Map).
   */
  getDiscoveredSpells(): SpellResult[] {
    return Array.from(this.cache.values())
      .filter(r => r.result.isDiscovery)
      .map(r => r.result);
  }

  /**
   * Return all discovered spells as serializable SpellEntry objects for save-file persistence.
   * Call this before saveLoadService.save() and pass the result as SaveOptions.spellbook.
   */
  getSpellbookEntries(): SpellEntry[] {
    return Array.from(this.cache.values())
      .filter(r => r.result.isDiscovery)
      .map(r => ({
        verb: r.verb,
        noun: r.noun,
        paradigm: r.paradigmId,
        title: r.result.title,
        description: r.result.description,
        powerLevel: r.result.powerLevel,
        worldEffect: r.result.worldEffect,
        compositionKey: r.result.compositionKey,
        discoveredAt: r.discoveredAt,
      }));
  }

  /**
   * Repopulate the cache from persisted SpellEntry records.
   * Called automatically when a 'spellbook:loaded' CustomEvent is dispatched by SaveLoadService.
   * Safe to call with an empty array (e.g. for old saves without spellbook data).
   */
  loadFromEntries(entries: SpellEntry[]): void {
    for (const entry of entries) {
      const result: SpellResult = {
        title: entry.title,
        description: entry.description,
        isDiscovery: true,
        powerLevel: entry.powerLevel,
        worldEffect: entry.worldEffect,
        compositionKey: entry.compositionKey,
      };
      this.cache.set(entry.compositionKey, {
        result,
        verb: entry.verb,
        noun: entry.noun,
        paradigmId: entry.paradigm,
        discoveredAt: entry.discoveredAt,
      });
    }
  }

  /**
   * Clear session cache (e.g. when resetting the sandbox).
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private parseResponse(raw: string, compositionKey: string): SpellResult {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as Partial<SpellLLMResponse>;

    if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
      throw new Error('SpellSandboxService: LLM response missing valid "title"');
    }
    if (typeof parsed.description !== 'string' || !parsed.description.trim()) {
      throw new Error('SpellSandboxService: LLM response missing valid "description"');
    }

    const powerLevel = validatePowerLevel(parsed.power_level);

    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      isDiscovery: parsed.is_discovery === true,
      powerLevel,
      worldEffect: validateWorldEffect(parsed.world_effect),
      compositionKey,
    };
  }
}

// ---------------------------------------------------------------------------
// Parsing utilities
// ---------------------------------------------------------------------------

const VALID_POWER_LEVELS = new Set<SpellResult['powerLevel']>(['minor', 'moderate', 'major', 'legendary']);

function validatePowerLevel(raw: unknown): SpellResult['powerLevel'] {
  if (typeof raw === 'string' && VALID_POWER_LEVELS.has(raw as SpellResult['powerLevel'])) {
    return raw as SpellResult['powerLevel'];
  }
  return 'minor';
}

const VALID_WORLD_EFFECTS = new Set([
  'plant_tree',
  'reveal_hidden',
  'bind_entity',
  'create_fire',
  'extinguish_fire',
  'heal_wound',
  'summon_creature',
  'silence_area',
  'alter_weather',
  'transform_object',
]);

function validateWorldEffect(raw: unknown): string | undefined {
  if (typeof raw === 'string' && VALID_WORLD_EFFECTS.has(raw)) {
    return raw;
  }
  return undefined;
}

/**
 * Extract the first JSON object from the LLM response.
 * Handles responses where the model may wrap JSON in markdown code fences.
 */
function extractJson(text: string): string {
  // Try to find a JSON block inside markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return fenceMatch[1].trim();
  }

  // Fall back to the first { ... } span in the text
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  // Last resort: return as-is and let JSON.parse report the error
  return text.trim();
}
