/**
 * HolyTextSystem - Phase 5: Religious Institutions
 *
 * Generates holy texts that canonize myths and shape deity identity.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';

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
  public readonly requiredComponents = [];
  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  private config: HolyTextConfig;
  private holyTexts: Map<string, HolyTextData> = new Map();

  constructor(config: Partial<HolyTextConfig> = {}) {
    super();
    this.config = { ...DEFAULT_HOLY_TEXT_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Check if any deity needs canonical texts
    this.checkForTextGeneration(ctx.world, currentTick);
  }

  /**
   * Check if deities need holy texts
   */
  private checkForTextGeneration(world: World, currentTick: number): void {
    // Deities are ALWAYS simulated entities, so we iterate all
    for (const entity of world.entities.values()) {
      if (!entity.components.has(CT.Deity)) continue;

      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deity) continue;

      // Check if deity has enough believers and no texts yet
      if (deity.believers.size >= 5) {
        const textsForDeity = Array.from(this.holyTexts.values())
          .filter(t => t.deityId === entity.id);

        if (textsForDeity.length === 0) {
          this.generateFoundingText(entity.id, deity, currentTick);
        }
      }
    }
  }

  /**
   * Generate a founding holy text for a deity
   */
  private generateFoundingText(
    deityId: string,
    deity: DeityComponent,
    currentTick: number
  ): void {
    // Create a simple founding text
    const text: HolyTextData = {
      id: `text_${deityId}_${Date.now()}`,
      title: `The Book of ${deity.identity.primaryName}`,
      deityId,
      authorAgentId: Array.from(deity.believers)[0] ?? 'unknown',
      content: this.generateFoundingContent(deity),
      writtenAt: currentTick,
      canonicity: 0.8,
      mythsReferenced: [],
      teachingsContained: this.generateTeachings(deity),
    };

    this.holyTexts.set(text.id, text);
  }

  /**
   * Generate founding text content
   */
  private generateFoundingContent(deity: DeityComponent): string {
    const domain = deity.identity.domain ?? 'mystery';
    const name = deity.identity.primaryName;

    const templates = [
      `In the beginning, ${name} watched over the ${domain}. Through faith, we are blessed.`,
      `${name} is the guardian of ${domain}, protector of the faithful.`,
      `Let it be known that ${name} guides those who walk the path of ${domain}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)] || `In the name of ${name}, let all be known.`;
  }

  /**
   * Generate core teachings
   */
  private generateTeachings(deity: DeityComponent): string[] {
    const domain = deity.identity.domain ?? 'mystery';

    return [
      `Honor ${deity.identity.primaryName}`,
      `Respect the ways of ${domain}`,
      'Maintain faith in times of trial',
      'Share blessings with fellow believers',
    ];
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
