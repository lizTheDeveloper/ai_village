/**
 * DivinePowersView - Divine powers and belief management
 *
 * Shows deity belief status, available powers, and divine capabilities.
 * Accessibility-first: describes divine power in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';

/**
 * A divine power entry
 */
interface DivinePowerInfo {
  id: string;
  name: string;
  tier: string;
  beliefCost: number;
  description: string;
  isAvailable: boolean;
  isOnCooldown: boolean;
}

/**
 * Domain strength entry
 */
interface DomainInfo {
  name: string;
  strength: number;
}

/**
 * Data returned by the DivinePowers view
 */
export interface DivinePowersViewData extends ViewData {
  /** Deity's name/title */
  deityName: string | null;
  /** Current belief points */
  belief: number;
  /** Belief generation rate per hour */
  beliefPerHour: number;
  /** Current power tier */
  currentTier: string;
  /** Belief needed for next tier */
  nextTierThreshold: number | null;
  /** Number of believers */
  believerCount: number;
  /** Number of angels/servants */
  angelCount: number;
  /** Pending prayer count */
  pendingPrayers: number;
  /** Domain strengths */
  domains: DomainInfo[];
  /** Available powers at current tier */
  availablePowers: DivinePowerInfo[];
  /** Deity personality traits */
  personality: {
    benevolence: number;
    interventionism: number;
    wrathfulness: number;
  } | null;
}

/**
 * Belief tier thresholds
 */
const TIER_THRESHOLDS = {
  dormant: 0,
  minor: 10,
  moderate: 100,
  major: 500,
  supreme: 2000,
  world_shaping: 5000,
} as const;

/**
 * Find the player-controlled deity entity
 */
function findPlayerDeity(world: any): { id: string; deityComponent: any } | null {
  const CT = { Deity: 'deity' };

  for (const entity of world.entities.values()) {
    if (entity.components.has(CT.Deity)) {
      const deityComp = entity.components.get(CT.Deity);
      if (deityComp && deityComp.controller === 'player') {
        return {
          id: entity.id,
          deityComponent: deityComp,
        };
      }
    }
  }

  return null;
}

/**
 * Calculate power tier from belief amount
 */
function calculateTier(belief: number): string {
  if (belief >= TIER_THRESHOLDS.world_shaping) return 'world_shaping';
  if (belief >= TIER_THRESHOLDS.supreme) return 'supreme';
  if (belief >= TIER_THRESHOLDS.major) return 'major';
  if (belief >= TIER_THRESHOLDS.moderate) return 'moderate';
  if (belief >= TIER_THRESHOLDS.minor) return 'minor';
  return 'dormant';
}

/**
 * Get next tier threshold
 */
function getNextTierThreshold(currentTier: string): number | null {
  const tiers: Array<keyof typeof TIER_THRESHOLDS> = [
    'dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'
  ];
  const currentIndex = tiers.indexOf(currentTier as keyof typeof TIER_THRESHOLDS);
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null; // Already at max tier
  }
  const nextTier = tiers[currentIndex + 1];
  if (nextTier === undefined) {
    return null;
  }
  return TIER_THRESHOLDS[nextTier];
}

/**
 * Get available powers for current tier
 */
function getAvailablePowers(tier: string, currentBelief: number): DivinePowerInfo[] {
  const powers: DivinePowerInfo[] = [];

  // Minor powers (10+ belief)
  if (tier !== 'dormant') {
    powers.push({
      id: 'whisper',
      name: 'Whisper',
      tier: 'minor',
      beliefCost: 5,
      description: 'Send a vague feeling to one mortal',
      isAvailable: currentBelief >= 5,
      isOnCooldown: false,
    });
    powers.push({
      id: 'dream_hint',
      name: 'Dream Hint',
      tier: 'minor',
      beliefCost: 10,
      description: 'Send vague dream imagery',
      isAvailable: currentBelief >= 10,
      isOnCooldown: false,
    });
  }

  // Moderate powers (100+ belief)
  if (tier === 'moderate' || tier === 'major' || tier === 'supreme' || tier === 'world_shaping') {
    powers.push({
      id: 'clear_vision',
      name: 'Clear Vision',
      tier: 'moderate',
      beliefCost: 50,
      description: 'Send clear dream or vision to a believer',
      isAvailable: currentBelief >= 50,
      isOnCooldown: false,
    });
    powers.push({
      id: 'minor_miracle',
      name: 'Minor Miracle',
      tier: 'moderate',
      beliefCost: 100,
      description: 'Small physical effect (light rain, warmth)',
      isAvailable: currentBelief >= 100,
      isOnCooldown: false,
    });
    powers.push({
      id: 'bless_individual',
      name: 'Bless Individual',
      tier: 'moderate',
      beliefCost: 75,
      description: 'Grant minor blessing to one person',
      isAvailable: currentBelief >= 75,
      isOnCooldown: false,
    });
  }

  // Major powers (500+ belief)
  if (tier === 'major' || tier === 'supreme' || tier === 'world_shaping') {
    powers.push({
      id: 'mass_vision',
      name: 'Mass Vision',
      tier: 'major',
      beliefCost: 400,
      description: 'Send vision to many believers at once',
      isAvailable: currentBelief >= 400,
      isOnCooldown: false,
    });
    powers.push({
      id: 'major_miracle',
      name: 'Major Miracle',
      tier: 'major',
      beliefCost: 500,
      description: 'Significant physical effect',
      isAvailable: currentBelief >= 500,
      isOnCooldown: false,
    });
  }

  // Supreme powers (2000+ belief)
  if (tier === 'supreme' || tier === 'world_shaping') {
    powers.push({
      id: 'create_angel',
      name: 'Create Angel',
      tier: 'supreme',
      beliefCost: 2000,
      description: 'Create a celestial servant',
      isAvailable: currentBelief >= 2000,
      isOnCooldown: false,
    });
    powers.push({
      id: 'manifest_avatar',
      name: 'Manifest Avatar',
      tier: 'supreme',
      beliefCost: 5000,
      description: 'Manifest physical form in the world (-100 belief/hour)',
      isAvailable: currentBelief >= 5000,
      isOnCooldown: false,
    });
  }

  // World-shaping powers (5000+ belief)
  if (tier === 'world_shaping') {
    powers.push({
      id: 'create_species',
      name: 'Create Species',
      tier: 'world_shaping',
      beliefCost: 10000,
      description: 'Create a new form of life',
      isAvailable: currentBelief >= 10000,
      isOnCooldown: false,
    });
  }

  return powers;
}

/**
 * DivinePowers View Definition
 */
export const DivinePowersView: DashboardView<DivinePowersViewData> = {
  id: 'divine-powers',
  title: 'Divine Powers',
  category: 'divinity',
  keyboardShortcut: undefined, // Defer to existing panel shortcut
  description: 'Overview of divine belief, powers, and celestial influence',

  defaultSize: {
    width: 400,
    height: 550,
    minWidth: 350,
    minHeight: 450,
  },

  getData(context: ViewContext): DivinePowersViewData {
    const { world } = context;

    const emptyData: DivinePowersViewData = {
      timestamp: Date.now(),
      available: true,
      deityName: null,
      belief: 0,
      beliefPerHour: 0,
      currentTier: 'dormant',
      nextTierThreshold: TIER_THRESHOLDS.minor,
      believerCount: 0,
      angelCount: 0,
      pendingPrayers: 0,
      domains: [],
      availablePowers: [],
      personality: null,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // Find player-controlled deity entity
      const playerDeity = findPlayerDeity(world);

      if (!playerDeity) {
        emptyData.available = false;
        emptyData.unavailableReason = 'No player deity found. Divinity system may not be enabled.';
        return emptyData;
      }

      const deityComp = playerDeity.deityComponent;

      // Calculate current tier
      const currentTier = calculateTier(deityComp.belief.currentBelief);
      const nextTierThreshold = getNextTierThreshold(currentTier);

      // Extract domains
      const domains: DomainInfo[] = [];
      if (deityComp.identity.domain) {
        domains.push({
          name: deityComp.identity.domain,
          strength: 100, // Primary domain starts at 100%
        });
      }
      for (const secondaryDomain of deityComp.identity.secondaryDomains) {
        domains.push({
          name: secondaryDomain,
          strength: 50, // Secondary domains at 50%
        });
      }

      // Get available powers for current tier
      const availablePowers = getAvailablePowers(currentTier, deityComp.belief.currentBelief);

      // Convert belief per tick to per hour
      // Assuming 20 TPS and 20 ticks per in-game second
      const beliefPerHour = deityComp.belief.beliefPerTick * 20 * 3600; // ticks per second * seconds per hour

      // Count angels
      let angelCount = 0;
      for (const entity of world.entities.values()) {
        if (entity.components.has('angel')) {
          angelCount++;
        }
      }

      return {
        timestamp: Date.now(),
        available: true,
        deityName: deityComp.identity.primaryName,
        belief: deityComp.belief.currentBelief,
        beliefPerHour,
        currentTier,
        nextTierThreshold,
        believerCount: deityComp.believers.size,
        angelCount,
        pendingPrayers: deityComp.prayerQueue.length,
        domains,
        availablePowers,
        personality: {
          benevolence: deityComp.identity.perceivedPersonality.benevolence,
          interventionism: deityComp.identity.perceivedPersonality.interventionism,
          wrathfulness: deityComp.identity.perceivedPersonality.wrathfulness,
        },
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: DivinePowersViewData): string {
    const lines: string[] = [
      'DIVINE POWERS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Divine power data unavailable');
      return lines.join('\n');
    }

    // Deity identity
    if (data.deityName) {
      lines.push(`You are ${data.deityName}.`);
    } else {
      lines.push('You are an unnamed deity, still forming your divine identity.');
    }
    lines.push('');

    // Belief status - narrative description
    lines.push('BELIEF & POWER');
    lines.push('─'.repeat(50));

    const tierDescriptions: Record<string, string> = {
      dormant: 'You are barely remembered, a whisper in the wind.',
      minor: 'A small but devoted following believes in you.',
      moderate: 'Your influence grows. Mortals speak your name with reverence.',
      major: 'You are a significant divine presence in this world.',
      supreme: 'Your power rivals the greatest deities.',
      world_shaping: 'You hold the power to reshape reality itself.',
    };

    lines.push(tierDescriptions[data.currentTier] || 'Your divine status is unclear.');
    lines.push('');

    lines.push(`Current Belief: ${Math.floor(data.belief)} points`);
    lines.push(`Generation Rate: +${data.beliefPerHour} belief per hour`);
    lines.push(`Power Tier: ${data.currentTier.replace('_', ' ').toUpperCase()}`);

    if (data.nextTierThreshold !== null) {
      const needed = data.nextTierThreshold - data.belief;
      if (needed > 0) {
        lines.push(`Next Tier: ${data.nextTierThreshold} belief (need ${Math.ceil(needed)} more)`);
        const progress = Math.round((data.belief / data.nextTierThreshold) * 100);
        lines.push(`Progress: ${createProgressBar(progress, 30)}`);
      }
    }
    lines.push('');

    // Followers
    lines.push('FOLLOWERS & SERVANTS');
    lines.push('─'.repeat(50));

    if (data.believerCount === 0) {
      lines.push('You have no mortal believers yet.');
      lines.push('Perform miracles or answer prayers to gain followers.');
    } else if (data.believerCount === 1) {
      lines.push('You have 1 devoted believer.');
    } else {
      lines.push(`You have ${data.believerCount} believers offering their faith.`);
    }

    if (data.angelCount > 0) {
      const angelWord = data.angelCount === 1 ? 'angel' : 'angels';
      lines.push(`${data.angelCount} celestial ${angelWord} serve your will.`);
    }

    if (data.pendingPrayers > 0) {
      const prayerWord = data.pendingPrayers === 1 ? 'prayer awaits' : 'prayers await';
      lines.push(`${data.pendingPrayers} ${prayerWord} your attention.`);
    }
    lines.push('');

    // Domains
    if (data.domains.length > 0) {
      lines.push('DIVINE DOMAINS');
      lines.push('─'.repeat(50));
      lines.push('Your areas of influence:');
      for (const domain of data.domains) {
        const strength = domain.strength >= 70 ? 'strong' :
          domain.strength >= 40 ? 'moderate' : 'weak';
        lines.push(`  ${domain.name}: ${strength} (${domain.strength}%)`);
      }
      lines.push('');
    }

    // Available powers
    if (data.availablePowers.length > 0) {
      lines.push('AVAILABLE DIVINE POWERS');
      lines.push('─'.repeat(50));

      for (const power of data.availablePowers.slice(0, 5)) {
        const status = power.isOnCooldown ? ' (on cooldown)' :
          !power.isAvailable ? ' (insufficient belief)' : '';
        lines.push(`  ${power.name} - ${power.beliefCost} belief${status}`);
        lines.push(`    ${power.description}`);
      }

      if (data.availablePowers.length > 5) {
        lines.push(`  ... and ${data.availablePowers.length - 5} more powers`);
      }
    } else {
      lines.push('DIVINE POWERS');
      lines.push('─'.repeat(50));
      lines.push('Gain more belief to unlock divine powers.');
    }

    // Personality (if defined)
    if (data.personality) {
      lines.push('');
      lines.push('DIVINE NATURE');
      lines.push('─'.repeat(50));

      const benevolence = data.personality.benevolence;
      const interventionism = data.personality.interventionism;
      const wrathfulness = data.personality.wrathfulness;

      const alignmentDesc = benevolence > 0.6 ? 'benevolent and caring' :
        benevolence < 0.4 ? 'harsh and demanding' : 'balanced in judgment';

      const styleDesc = interventionism > 0.6 ? 'frequently intervening in mortal affairs' :
        interventionism < 0.4 ? 'distant and mysterious' : 'selective in your interventions';

      lines.push(`You are ${alignmentDesc}, ${styleDesc}.`);
      if (wrathfulness > 0.5) {
        lines.push('Those who displease you feel your wrath.');
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: DivinePowersViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'No divine data', x + padding, currentY);
      return;
    }

    // Deity name
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.deityName || 'Unnamed Deity', x + padding, currentY);
    currentY += lineHeight + 5;

    // Belief bar
    ctx.fillStyle = theme.colors.text;
    ctx.font = theme.fonts.normal;
    ctx.fillText(`Belief: ${Math.floor(data.belief)}`, x + padding, currentY);
    currentY += lineHeight;

    // Draw belief bar
    const barWidth = width - padding * 2 - 40;
    const barHeight = 12;
    const progress = data.nextTierThreshold
      ? Math.min(1, data.belief / data.nextTierThreshold)
      : 1;

    ctx.fillStyle = theme.colors.border;
    ctx.fillRect(x + padding, currentY, barWidth, barHeight);

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(x + padding, currentY, barWidth * progress, barHeight);

    currentY += barHeight + 10;

    // Tier
    ctx.fillStyle = theme.colors.accent;
    ctx.fillText(`Tier: ${data.currentTier.replace('_', ' ')}`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Stats
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`${data.believerCount} believers • ${data.angelCount} angels`, x + padding, currentY);
    currentY += lineHeight;

    if (data.pendingPrayers > 0) {
      ctx.fillStyle = theme.colors.warning;
      ctx.fillText(`${data.pendingPrayers} prayers pending`, x + padding, currentY);
    }
  },
};
