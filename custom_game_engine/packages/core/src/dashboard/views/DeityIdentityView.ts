/**
 * DeityIdentityView - Deity identity, personality, and emergence
 *
 * Shows how the deity emerged, their personality traits as perceived by mortals,
 * and how their identity evolves over time.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import type { DeityComponent } from '../../components/DeityComponent.js';

/**
 * Data returned by the DeityIdentity view
 */
export interface DeityIdentityViewData extends ViewData {
  /** Primary name */
  name: string;
  /** Alternative names/epithets */
  epithets: string[];
  /** Primary domain */
  primaryDomain: string | null;
  /** Secondary domains */
  secondaryDomains: string[];
  /** Perceived personality traits (0-1) */
  personality: {
    benevolence: number;
    interventionism: number;
    wrathfulness: number;
    mysteriousness: number;
    generosity: number;
    consistency: number;
  };
  /** Moral alignment */
  alignment: string;
  /** Sacred symbols */
  symbols: string[];
  /** Sacred colors */
  colors: string[];
  /** Sacred animals */
  sacredAnimals: string[];
  /** Trait confidence levels */
  traitConfidence: Array<{ trait: string; confidence: number }>;
  /** How long deity has existed */
  age: number;
  /** Believer count */
  believerCount: number;
}

const CT = { Deity: 'deity' };

/**
 * DeityIdentity View Definition
 */
export const DeityIdentityView: DashboardView<DeityIdentityViewData> = {
  id: 'deity-identity',
  title: 'Divine Identity',
  category: 'divinity',
  keyboardShortcut: 'D',
  description: 'Your divine identity and personality',

  defaultSize: {
    width: 500,
    height: 650,
    minWidth: 400,
    minHeight: 500,
  },

  getData(context: ViewContext): DeityIdentityViewData {
    const { world } = context;

    const emptyData: DeityIdentityViewData = {
      timestamp: Date.now(),
      available: true,
      name: 'The Nameless',
      epithets: [],
      primaryDomain: null,
      secondaryDomains: [],
      personality: {
        benevolence: 0.5,
        interventionism: 0.5,
        wrathfulness: 0.5,
        mysteriousness: 0.5,
        generosity: 0.5,
        consistency: 0.5,
      },
      alignment: 'unknown',
      symbols: [],
      colors: [],
      sacredAnimals: [],
      traitConfidence: [],
      age: 0,
      believerCount: 0,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // Find player deity
      let playerDeity: { id: string; component: DeityComponent } | null = null;
      for (const entity of world.entities.values()) {
        if (entity.components.has(CT.Deity)) {
          const deityComp = entity.getComponent<DeityComponent>(CT.Deity);
          if (deityComp && deityComp.controller === 'player') {
            playerDeity = { id: entity.id, component: deityComp };
            break;
          }
        }
      }

      if (!playerDeity) {
        emptyData.available = false;
        emptyData.unavailableReason = 'No player deity found';
        return emptyData;
      }

      const deityComp = playerDeity.component;
      const identity = deityComp.identity ?? {};

      // Convert trait confidence map to array
      const traitConfidence: Array<{ trait: string; confidence: number }> = [];
      if (identity.traitConfidence && identity.traitConfidence.entries) {
        for (const [trait, confidence] of identity.traitConfidence.entries()) {
          traitConfidence.push({ trait, confidence });
        }
      }

      // Calculate age (ticks since first believer)
      // TODO: Track emergence tick in deity component
      const believerCount = deityComp.believers?.size ?? 0;
      const age = believerCount > 0 ? world.tick : 0;

      return {
        timestamp: Date.now(),
        available: true,
        name: identity.primaryName,
        epithets: identity.epithets,
        primaryDomain: identity.domain ?? null,
        secondaryDomains: identity.secondaryDomains,
        personality: {
          benevolence: identity.perceivedPersonality.benevolence,
          interventionism: identity.perceivedPersonality.interventionism,
          wrathfulness: identity.perceivedPersonality.wrathfulness,
          mysteriousness: identity.perceivedPersonality.mysteriousness ?? 0.5,
          generosity: identity.perceivedPersonality.generosity ?? 0.5,
          consistency: identity.perceivedPersonality.consistency ?? 0.5,
        },
        alignment: identity.perceivedAlignment,
        symbols: identity.symbols,
        colors: identity.colors,
        sacredAnimals: identity.sacredAnimals ?? [],
        traitConfidence,
        age,
        believerCount,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: DeityIdentityViewData): string {
    const lines: string[] = [
      'DIVINE IDENTITY',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Identity data unavailable');
      return lines.join('\n');
    }

    // Name and epithets
    lines.push(`NAME: ${data.name.toUpperCase()}`);
    if (data.epithets.length > 0) {
      lines.push('Also known as:');
      for (const epithet of data.epithets) {
        lines.push(`  • ${epithet}`);
      }
    }
    lines.push('');

    // Domains
    lines.push('DIVINE DOMAINS');
    lines.push('─'.repeat(50));
    if (data.primaryDomain) {
      const domainName = data.primaryDomain.replace('_', ' ');
      lines.push(`Primary: ${domainName.toUpperCase()}`);
    } else {
      lines.push('Primary: None yet - your identity is still forming');
    }

    if (data.secondaryDomains.length > 0) {
      lines.push('Secondary domains:');
      for (const domain of data.secondaryDomains) {
        const domainName = domain.replace('_', ' ');
        lines.push(`  • ${domainName}`);
      }
    }
    lines.push('');

    // Personality
    lines.push('PERCEIVED PERSONALITY');
    lines.push('─'.repeat(50));
    lines.push('How mortals perceive your divine nature:');
    lines.push('');

    const p = data.personality;

    // Benevolence
    const benevolenceDesc = p.benevolence > 0.7 ? 'kind and caring' :
      p.benevolence > 0.4 ? 'balanced in judgment' : 'harsh and demanding';
    lines.push(`  Benevolence: ${benevolenceDesc} (${Math.round(p.benevolence * 100)}%)`);

    // Interventionism
    const interventionDesc = p.interventionism > 0.7 ? 'highly active in mortal affairs' :
      p.interventionism > 0.4 ? 'selectively involved' : 'distant and mysterious';
    lines.push(`  Interventionism: ${interventionDesc} (${Math.round(p.interventionism * 100)}%)`);

    // Wrathfulness
    const wrathDesc = p.wrathfulness > 0.7 ? 'quick to anger' :
      p.wrathfulness > 0.4 ? 'measured in response' : 'patient and forgiving';
    lines.push(`  Wrathfulness: ${wrathDesc} (${Math.round(p.wrathfulness * 100)}%)`);

    // Mysteriousness
    const mysteryDesc = p.mysteriousness > 0.7 ? 'inscrutable and enigmatic' :
      p.mysteriousness > 0.4 ? 'sometimes clear, sometimes vague' : 'direct and comprehensible';
    lines.push(`  Mysteriousness: ${mysteryDesc} (${Math.round(p.mysteriousness * 100)}%)`);

    lines.push('');
    lines.push(`Moral Alignment: ${data.alignment.toUpperCase()}`);
    lines.push('');

    // Sacred iconography
    if (data.symbols.length > 0 || data.colors.length > 0 || data.sacredAnimals.length > 0) {
      lines.push('SACRED ICONOGRAPHY');
      lines.push('─'.repeat(50));

      if (data.symbols.length > 0) {
        lines.push(`Symbols: ${data.symbols.join(', ')}`);
      }
      if (data.colors.length > 0) {
        lines.push(`Colors: ${data.colors.join(', ')}`);
      }
      if (data.sacredAnimals.length > 0) {
        lines.push(`Sacred Animals: ${data.sacredAnimals.join(', ')}`);
      }
      lines.push('');
    }

    // Trait confidence
    if (data.traitConfidence.length > 0) {
      lines.push('IDENTITY FORMATION');
      lines.push('─'.repeat(50));
      lines.push('How certain mortals are about your traits:');
      for (const tc of data.traitConfidence) {
        const percent = Math.round(tc.confidence * 100);
        lines.push(`  ${tc.trait}: ${percent}% confidence`);
      }
      lines.push('');
    }

    // Stats
    lines.push('DIVINE PRESENCE');
    lines.push('─'.repeat(50));
    lines.push(`Believers: ${data.believerCount}`);
    const ticksToHours = data.age / 20 / 3600; // Assuming 20 TPS
    if (ticksToHours > 24) {
      const days = Math.floor(ticksToHours / 24);
      lines.push(`Age: ${days} game days`);
    } else if (ticksToHours > 0) {
      lines.push(`Age: ${Math.floor(ticksToHours)} game hours`);
    } else {
      lines.push('Age: Just emerged');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: DeityIdentityViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'No identity data', x + padding, currentY);
      return;
    }

    // Name
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.name, x + padding, currentY);
    currentY += lineHeight + 5;

    // Domain
    if (data.primaryDomain) {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.normal;
      const domainName = data.primaryDomain.replace('_', ' ');
      ctx.fillText(`Domain: ${domainName}`, x + padding, currentY);
      currentY += lineHeight + 5;
    }

    // Personality bars
    ctx.fillStyle = theme.colors.text;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Personality', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const p = data.personality;
    const barWidth = width - padding * 2 - 120;
    const barHeight = 8;

    const traits = [
      { name: 'Benevolence', value: p.benevolence },
      { name: 'Active', value: p.interventionism },
      { name: 'Wrathful', value: p.wrathfulness },
    ];

    for (const trait of traits) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(trait.name, x + padding, currentY);

      const barX = x + padding + 100;
      ctx.fillStyle = theme.colors.border;
      ctx.fillRect(barX, currentY + 3, barWidth, barHeight);

      ctx.fillStyle = '#DAA520';
      ctx.fillRect(barX, currentY + 3, barWidth * trait.value, barHeight);

      currentY += lineHeight + 2;
    }
  },
};
