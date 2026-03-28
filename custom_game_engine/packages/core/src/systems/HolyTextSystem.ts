/**
 * HolyTextSystem - Phase 5: Religious Institutions
 *
 * Generates holy texts that canonize myths and shape deity identity.
 * Uses LLM-generated content when available; falls back to richer
 * procedural generation when no LLM queue is provided.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';

// ============================================================================
// Holy Text Types
// ============================================================================

export interface HolyTextData {
  id: string;
  title: string;
  deityId: string;
  authorAgentId: string;
  content: string;
  writtenAt: number;
  canonicity: number; // 0-1, how accepted is this text
  mythsReferenced: string[];
  teachingsContained: string[];
}

// ============================================================================
// Holy Text Configuration
// ============================================================================

export interface HolyTextConfig {
  /** How often to check for new texts (ticks) */
  checkInterval: number;

  /** Minimum priest rank to write texts */
  minRankForWriting: 'novice' | 'acolyte' | 'priest';
}

export const DEFAULT_HOLY_TEXT_CONFIG: HolyTextConfig = {
  checkInterval: 4800, // ~4 minutes at 20 TPS
  minRankForWriting: 'priest',
};

// ============================================================================
// HolyTextSystem
// ============================================================================

export class HolyTextSystem extends BaseSystem {
  public readonly id = 'HolyTextSystem';
  public readonly priority = 82;
  public readonly requiredComponents: string[] = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds at 20 TPS

  private config: HolyTextConfig;
  private holyTexts: Map<string, HolyTextData> = new Map();
  private llmQueue: LLMDecisionQueue | null;

  // Pending LLM text generation requests (requestId → metadata)
  private pendingLLMTexts = new Map<string, { deityId: string; deityName: string; timestamp: number }>();

  // Performance optimization: deity entity cache
  private deityCache = new Map<string, DeityComponent>();
  private lastCacheUpdate = 0;
  private readonly CACHE_REFRESH_INTERVAL = 100; // Refresh deity cache every 5 seconds

  // Performance optimization: track deities with texts (avoid repeated filtering)
  private deitiesWithTexts = new Set<string>();

  // Performance optimization: precomputed constants
  private readonly MIN_BELIEVERS_FOR_TEXT = 5;

  constructor(config: Partial<HolyTextConfig> = {}, llmQueue?: LLMDecisionQueue) {
    super();
    this.config = { ...DEFAULT_HOLY_TEXT_CONFIG, ...config };
    this.llmQueue = llmQueue ?? null;
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Refresh deity cache periodically
    if (currentTick - this.lastCacheUpdate >= this.CACHE_REFRESH_INTERVAL) {
      this.rebuildDeityCache(ctx.world);
      this.lastCacheUpdate = currentTick;
    }

    // Early exit: no deities exist
    if (this.deityCache.size === 0) return;

    // Process completed LLM responses
    this._processLLMResponses();

    // Check if any deity needs canonical texts
    this.checkForTextGeneration(ctx.world, currentTick);
  }

  /**
   * Rebuild deity cache from world entities
   */
  private rebuildDeityCache(world: World): void {
    this.deityCache.clear();

    const deities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deities) {
      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deity) {
        this.deityCache.set(entity.id, deity);
      }
    }
  }

  /**
   * Check if deities need holy texts (optimized)
   */
  private checkForTextGeneration(world: World, currentTick: number): void {
    // Use cached deity list
    for (const [deityId, deity] of this.deityCache) {
      // Early exit: already has text
      if (this.deitiesWithTexts.has(deityId)) continue;

      // Early exit: not enough believers
      if (deity.believers.size < this.MIN_BELIEVERS_FOR_TEXT) continue;

      // Generate founding text
      this.generateFoundingTextOptimized(deityId, deity, currentTick);

      // Mark as having text (avoid repeated checks)
      this.deitiesWithTexts.add(deityId);
    }
  }

  /**
   * Poll for completed LLM responses and update pending holy texts
   */
  private _processLLMResponses(): void {
    if (!this.llmQueue) return;

    const completed: string[] = [];

    for (const [requestId, pending] of this.pendingLLMTexts) {
      const response = this.llmQueue.getDecision(requestId);
      if (!response) continue;

      const parsed = this._parseHolyTextResponse(response);
      if (!parsed) {
        console.warn(`[HolyTextSystem] Failed to parse LLM response for deity ${pending.deityName}`);
        completed.push(requestId);
        continue;
      }

      // Find and update the pending placeholder text
      for (const text of this.holyTexts.values()) {
        if (text.deityId === pending.deityId && text.content === '[GENERATING...]') {
          text.title = parsed.title;
          text.content = parsed.content;
          text.teachingsContained = parsed.teachings;
          break;
        }
      }

      completed.push(requestId);
    }

    for (const id of completed) {
      this.pendingLLMTexts.delete(id);
    }
  }

  /**
   * Generate a founding holy text for a deity (optimized)
   */
  private generateFoundingTextOptimized(
    deityId: string,
    deity: DeityComponent,
    currentTick: number
  ): void {
    // Get first believer (zero allocation approach)
    let firstBeliever = 'unknown';
    if (deity.believers && typeof deity.believers[Symbol.iterator] === 'function') {
      for (const believerId of deity.believers) {
        firstBeliever = believerId;
        break;
      }
    }

    const name = deity.identity.primaryName;

    // LLM generation path
    if (this.llmQueue) {
      // Don't queue if already pending for this deity
      const alreadyPending = Array.from(this.pendingLLMTexts.values()).some(p => p.deityId === deityId);
      if (!alreadyPending) {
        const requestId = `holytext_${deityId}_${Date.now()}`;
        const prompt = this._buildHolyTextPrompt(deity);

        this.llmQueue.requestDecision(requestId, prompt).catch(err => {
          console.error(`[HolyTextSystem] Failed to request text generation:`, err);
        });

        this.pendingLLMTexts.set(requestId, {
          deityId,
          deityName: name,
          timestamp: currentTick,
        });

        // Create placeholder text (will be updated when LLM responds)
        const text: HolyTextData = {
          id: `text_${deityId}_${Date.now()}`,
          title: `The Book of ${name}`,
          deityId,
          authorAgentId: firstBeliever,
          content: '[GENERATING...]',
          writtenAt: currentTick,
          canonicity: 0.8,
          mythsReferenced: deity.myths?.map(m => m.id) ?? [],
          teachingsContained: [],
        };
        this.holyTexts.set(text.id, text);
      }
    } else {
      // Fallback: richer procedural generation
      const generated = this._generateFallbackContent(deity);

      const text: HolyTextData = {
        id: `text_${deityId}_${Date.now()}`,
        title: generated.title,
        deityId,
        authorAgentId: firstBeliever,
        content: generated.content,
        writtenAt: currentTick,
        canonicity: 0.8,
        mythsReferenced: deity.myths?.map(m => m.id) ?? [],
        teachingsContained: generated.teachings,
      };
      this.holyTexts.set(text.id, text);
    }
  }

  /**
   * Build a rich LLM prompt using all available deity data
   */
  private _buildHolyTextPrompt(deity: DeityComponent): string {
    const { primaryName, domain, epithets, perceivedPersonality, perceivedAlignment, symbols, sacredAnimals } = deity.identity;

    let prompt = `You are generating a founding holy text for an emergent religion in a world simulation.\n\n`;
    prompt += `DEITY: ${primaryName}`;
    if (epithets?.length) prompt += ` (also known as: ${epithets.join(', ')})`;
    prompt += `\nDOMAIN: ${domain ?? 'mystery'}`;
    if (deity.identity.secondaryDomains?.length) {
      prompt += `\nSECONDARY DOMAINS: ${deity.identity.secondaryDomains.join(', ')}`;
    }
    prompt += `\nALIGNMENT: ${perceivedAlignment ?? 'unknown'}`;
    prompt += `\nBELIEVERS: ${deity.believers?.size ?? 0}`;
    prompt += `\nANSWERED PRAYERS: ${deity.totalAnsweredPrayers ?? 0}`;

    // Personality
    if (perceivedPersonality) {
      const traits: string[] = [];
      if (perceivedPersonality.benevolence > 0.3) traits.push('benevolent');
      else if (perceivedPersonality.benevolence < -0.3) traits.push('cruel');
      if (perceivedPersonality.interventionism > 0.3) traits.push('interventionist');
      else if (perceivedPersonality.interventionism < -0.3) traits.push('distant');
      if (perceivedPersonality.wrathfulness > 0.5) traits.push('wrathful');
      if (perceivedPersonality.mysteriousness > 0.5) traits.push('mysterious');
      if (perceivedPersonality.generosity > 0.5) traits.push('generous');
      if (perceivedPersonality.consistency < 0.3) traits.push('capricious');
      if (traits.length) prompt += `\nPERCEIVED NATURE: ${traits.join(', ')}`;
    }

    // Sacred symbols
    if (symbols?.length) prompt += `\nSACRED SYMBOLS: ${symbols.join(', ')}`;
    if (sacredAnimals?.length) prompt += `\nSACRED ANIMALS: ${sacredAnimals.join(', ')}`;

    // Existing myths
    if (deity.myths?.length) {
      prompt += `\n\nEXISTING MYTHS ABOUT THIS DEITY:`;
      for (const myth of deity.myths.slice(-3)) {
        prompt += `\n- "${myth.title}" (${myth.category}): ${myth.content?.slice(0, 150) ?? 'no content'}`;
      }
    }

    // Visions
    if (deity.sentVisions?.length) {
      const recentVisions = deity.sentVisions.slice(-2);
      prompt += `\n\nRECENT DIVINE VISIONS:`;
      for (const v of recentVisions) {
        prompt += `\n- Power: ${v.powerType}, Symbols: ${v.symbols?.join(', ') ?? 'none'}`;
      }
    }

    prompt += `\n\nWrite a founding holy text for this deity's religion. This text will be the first scripture their followers create. It should:`;
    prompt += `\n- Reflect the deity's specific personality and domain, not generic religious language`;
    prompt += `\n- Reference their history of miracles or answered prayers if any exist`;
    prompt += `\n- Capture the theological character of this specific deity`;
    prompt += `\n- Feel like it was written by a believer, not an outsider`;
    prompt += `\n- Be 3-6 sentences long`;
    prompt += `\n\nFormat your response EXACTLY as:`;
    prompt += `\nTITLE: [title of the holy text]`;
    prompt += `\nCONTENT: [the holy text itself]`;
    prompt += `\nTEACHINGS: [comma-separated list of 3-5 core teachings]`;

    return prompt;
  }

  /**
   * Parse the LLM response into structured holy text data
   */
  private _parseHolyTextResponse(response: string): { title: string; content: string; teachings: string[] } | null {
    const titleMatch = response.match(/TITLE:\s*(.+)/i);
    const contentMatch = response.match(/CONTENT:\s*([\s\S]+?)(?=\nTEACHINGS:|$)/i);
    const teachingsMatch = response.match(/TEACHINGS:\s*(.+)/i);

    if (!titleMatch || !contentMatch) return null;

    const title = titleMatch[1];
    const content = contentMatch[1];
    if (!title || !content) return null;

    return {
      title: title.trim(),
      content: content.trim(),
      teachings: teachingsMatch?.[1] ? teachingsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [],
    };
  }

  /**
   * Generate richer procedural content when no LLM queue is available.
   * Uses personality traits, myths, and deity history — not just name+domain templates.
   */
  private _generateFallbackContent(deity: DeityComponent): { title: string; content: string; teachings: string[] } {
    const name = deity.identity.primaryName;
    const domain = deity.identity.domain ?? 'mystery';
    const personality = deity.identity.perceivedPersonality;

    // Choose a text tone based on personality
    let tone = 'reverent';
    if (personality?.wrathfulness > 0.5) tone = 'fearful';
    else if (personality?.mysteriousness > 0.5) tone = 'cryptic';
    else if (personality?.benevolence > 0.3) tone = 'joyful';

    // Build content based on actual deity history
    const parts: string[] = [];

    if (deity.myths?.length) {
      const firstMyth = deity.myths[0];
      const firstMythTitle = firstMyth?.title ?? 'the first miracle';
      parts.push(`Before the first ${domain} was named, ${name} was already there — this the witnesses of ${firstMythTitle} know to be true.`);
    } else {
      parts.push(`When the world was young and the ${domain} had no guardian, ${name} arose.`);
    }

    if (deity.totalAnsweredPrayers > 0) {
      parts.push(`${deity.totalAnsweredPrayers} prayers have been answered, each a testament to the presence that watches.`);
    }

    if (tone === 'fearful') {
      parts.push(`Let those who defy the ways of ${domain} tremble, for ${name} sees all and forgives nothing.`);
    } else if (tone === 'cryptic') {
      parts.push(`The ways of ${name} are not for mortals to understand, only to follow.`);
    } else if (tone === 'joyful') {
      parts.push(`In the light of ${name}, all who walk the path of ${domain} find peace.`);
    } else {
      parts.push(`Through devotion to ${name}, the faithful are guided along the path of ${domain}.`);
    }

    // Teachings based on personality
    const teachings: string[] = [];
    if (personality?.benevolence !== undefined && personality.benevolence > 0) {
      teachings.push(`Show kindness as ${name} shows kindness`);
    } else if (personality?.benevolence !== undefined && personality.benevolence < 0) {
      teachings.push(`Strength is the only virtue ${name} respects`);
    }
    teachings.push(`Honor the ways of ${domain}`);
    if (personality?.interventionism !== undefined && personality.interventionism > 0) {
      teachings.push(`Pray often, for ${name} listens`);
    } else {
      teachings.push(`Act rightly without expecting intervention`);
    }
    teachings.push('Maintain faith in times of trial');

    return {
      title: tone === 'fearful' ? `The Warnings of ${name}` : tone === 'cryptic' ? `The Mysteries of ${name}` : `The Book of ${name}`,
      content: parts.join(' '),
      teachings,
    };
  }

  /**
   * Generate a founding holy text for a deity (deprecated - use generateFoundingTextOptimized)
   */
  private generateFoundingText(
    deityId: string,
    deity: DeityComponent,
    currentTick: number
  ): void {
    this.generateFoundingTextOptimized(deityId, deity, currentTick);
  }

  /**
   * Get holy text
   */
  getHolyText(textId: string): HolyTextData | undefined {
    return this.holyTexts.get(textId);
  }

  /**
   * Get all texts for a deity
   */
  getTextsForDeity(deityId: string): HolyTextData[] {
    return Array.from(this.holyTexts.values())
      .filter(t => t.deityId === deityId);
  }
}
