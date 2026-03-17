/**
 * DivinePowersPanel - UI for divine powers and belief management
 *
 * Features:
 * - Belief bar and generation rate
 * - Divine power list by tier
 * - Power execution
 * - Blessing/curse management
 * - Believer count and faith levels
 * - Prayer queue display
 */

import type { World, DeityComponent, IdentityComponent, SpiritualComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';
import { DivineParameterModal, type DivineParameterResult } from './DivineParameterModal.js';

// ============================================================================
// Types (would import from @ai-village/core in real implementation)
// ============================================================================

type DivinePowerTier = 'dormant' | 'minor' | 'moderate' | 'major' | 'supreme' | 'world_shaping';

interface DivinePower {
  id: string;
  name: string;
  tier: DivinePowerTier;
  beliefCost: number;
  cooldown: number; // ticks
  description: string;
  domains?: string[];
  targetType: 'self' | 'believer' | 'anyone' | 'location' | 'object' | 'group';
}

interface BelieverInfo {
  id: string;
  name: string;
  faith: number;
}

interface DeityState {
  belief: number;
  beliefPerHour: number;
  peakBeliefRate: number;
  totalEarned: number;
  totalSpent: number;
  believerCount: number;
  believerList: BelieverInfo[];  // List of believers with names and faith
  angelCount: number;
  pendingPrayers: number;
  domains: Record<string, number>;
  identity: {
    name: string;
    benevolence: number;
    interventionism: number;
    wrathfulness: number;
  };
}

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_power' | 'execute_power' | 'filter_tier';
  data?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(20, 20, 30, 0.95)',
  headerBg: 'rgba(40, 40, 60, 0.9)',
  powerBg: 'rgba(30, 30, 45, 0.8)',
  powerSelected: 'rgba(60, 50, 80, 0.9)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  belief: '#FFD700',
  beliefBar: '#DAA520',
  tierDormant: '#444444',
  tierMinor: '#66AA66',
  tierModerate: '#6666CC',
  tierMajor: '#AA66AA',
  tierSupreme: '#FFAA00',
  tierWorldShaping: '#FF4444',
  border: 'rgba(100, 100, 140, 0.5)',
};

const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 36,
  beliefBarHeight: 44,
  statsHeight: 140, // Increased to show believer list
  filterHeight: 28,
  powerRowHeight: 56,
  detailHeight: 120,
};

const BELIEF_THRESHOLDS = {
  dormant: 0,
  minor: 10,
  moderate: 100,
  major: 500,
  supreme: 2000,
  world_shaping: 5000,
};

// Example powers (would come from divinity system in real implementation)
// NOTE: Communication powers (whisper, dream, vision) moved to DivineCommunicationPanel
const DIVINE_POWERS: DivinePower[] = [
  // Minor tier - non-communication powers
  { id: 'minor_luck', name: 'Minor Luck', tier: 'minor', beliefCost: 15, cooldown: 300, description: 'Grant a small fortune boost.', targetType: 'believer' },

  // Moderate tier
  { id: 'bless_individual', name: 'Bless', tier: 'moderate', beliefCost: 80, cooldown: 1200, description: 'Grant a lasting blessing.', targetType: 'believer' },
  { id: 'curse_individual', name: 'Curse', tier: 'moderate', beliefCost: 100, cooldown: 1200, description: 'Inflict a curse on someone.', targetType: 'anyone' },
  { id: 'minor_miracle', name: 'Minor Miracle', tier: 'moderate', beliefCost: 150, cooldown: 3600, description: 'Perform a small but visible miracle.', targetType: 'location' },
  { id: 'heal_wound', name: 'Heal Wound', tier: 'major', beliefCost: 300, cooldown: 600, description: 'Heal serious injuries.', targetType: 'believer' },
  { id: 'storm_calling', name: 'Storm Calling', tier: 'major', beliefCost: 400, cooldown: 7200, description: 'Summon a storm.', targetType: 'location' },
  { id: 'resurrect_recent', name: 'Resurrect (Recent)', tier: 'major', beliefCost: 800, cooldown: 36000, description: 'Return a recently deceased to life.', targetType: 'anyone' },
  { id: 'create_angel', name: 'Create Angel', tier: 'supreme', beliefCost: 2000, cooldown: 72000, description: 'Create a divine servant.', targetType: 'self' },
  { id: 'divine_cataclysm', name: 'Divine Cataclysm', tier: 'world_shaping', beliefCost: 5000, cooldown: 360000, description: 'Reshape the world dramatically.', targetType: 'location' },
];

// ============================================================================
// Helpers
// ============================================================================

function getTierEmoji(tier: DivinePowerTier | 'all'): string {
  switch (tier) {
    case 'dormant': return '💤';
    case 'minor': return '✨';
    case 'moderate': return '🌟';
    case 'major': return '⚡';
    case 'supreme': return '👑';
    case 'world_shaping': return '🌍';
    default: return '✦';
  }
}

// ============================================================================
// DivinePowersPanel
// ============================================================================

export class DivinePowersPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private selectedPowerId: string | null = null;
  private filterTier: DivinePowerTier | 'all' = 'all';
  private clickRegions: ClickRegion[] = [];
  private contentHeight = 0;
  private visibleHeight = 0;

  // World reference for event emission and state reading
  private world?: World;
  private playerDeityId?: string;

  // Parameter modal for divine powers
  private parameterModal: DivineParameterModal = new DivineParameterModal();

  // Deity state (refreshed from World when available, fallback to mock data)
  private deityState: DeityState = {
    belief: 0,
    beliefPerHour: 0,
    peakBeliefRate: 0,
    totalEarned: 0,
    totalSpent: 0,
    believerCount: 0,
    believerList: [],
    angelCount: 0,
    pendingPrayers: 0,
    domains: {},
    identity: {
      name: 'No Deity',
      benevolence: 0.5,
      interventionism: 0.5,
      wrathfulness: 0.5,
    },
  };

  // Power cooldowns (powerId -> tick when available)
  private cooldowns: Map<string, number> = new Map();

  /**
   * Refresh deity state from the World
   * PERFORMANCE: Uses ECS query to get only deity entities (avoids full scan)
   */
  private refreshFromWorld(world: World): void {
    this.world = world;

    // Find player-controlled deity
    const deityEntities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deityEntities) {
      const deityComp = entity.components.get('deity') as DeityComponent | undefined;
      if (deityComp && deityComp.controller === 'player') {
        this.playerDeityId = entity.id;

        // Update state from deity component - match actual DeityComponent structure
        // Convert beliefPerTick to beliefPerHour (20 ticks/sec * 3600 sec/hour = 72000 ticks/hour)
        const ticksPerHour = 72000;
        const beliefPerTick = deityComp.belief?.beliefPerTick ?? 0;

        // Count believers and get their info (Set has .size, not .length)
        const believerIds: string[] = deityComp.believers instanceof Set
          ? Array.from(deityComp.believers)
          : (Array.isArray(deityComp.believers) ? deityComp.believers : []);

        const believerCount = believerIds.length;

        // Get believer names and faith levels
        const believerList: BelieverInfo[] = [];
        for (const believerId of believerIds) {
          const believerEntity = world.entities.get(believerId);
          if (believerEntity) {
            const identity = believerEntity.components?.get('identity') as IdentityComponent | undefined;
            const spiritual = believerEntity.components?.get('spiritual') as SpiritualComponent | undefined;
            believerList.push({
              id: believerId,
              name: identity?.name || 'Unknown',
              faith: spiritual?.faith ?? 0,
            });
          }
        }
        // Sort by faith (highest first)
        believerList.sort((a, b) => b.faith - a.faith);

        // Count angels - entities with 'angel' component
        // PERFORMANCE: Uses ECS query to get only angel entities (avoids full scan)
        const angelEntities = world.query().with(CT.Angel).executeEntities();
        const angelCount = angelEntities.length;

        // Build domains from identity
        const domains: Record<string, number> = {};
        if (deityComp.identity?.domain) {
          domains[deityComp.identity.domain] = 100;
        }
        if (deityComp.identity?.secondaryDomains) {
          for (const domain of deityComp.identity.secondaryDomains) {
            domains[domain] = 50;
          }
        }

        this.deityState = {
          belief: deityComp.belief?.currentBelief ?? 0,
          beliefPerHour: beliefPerTick * ticksPerHour,
          peakBeliefRate: deityComp.belief?.peakBeliefRate ?? 0,
          totalEarned: deityComp.belief?.totalBeliefEarned ?? 0,
          totalSpent: deityComp.belief?.totalBeliefSpent ?? 0,
          believerCount,
          believerList,
          angelCount,
          pendingPrayers: deityComp.prayerQueue?.length ?? 0,
          domains,
          identity: {
            name: deityComp.identity?.primaryName ?? 'Unknown Deity',
            benevolence: deityComp.identity?.perceivedPersonality?.benevolence ?? 0.5,
            interventionism: deityComp.identity?.perceivedPersonality?.interventionism ?? 0.5,
            wrathfulness: deityComp.identity?.perceivedPersonality?.wrathfulness ?? 0.5,
          },
        };
        return;
      }
    }

    // No player deity found - reset to defaults
    this.playerDeityId = undefined;
    this.deityState = {
      belief: 0,
      beliefPerHour: 0,
      peakBeliefRate: 0,
      totalEarned: 0,
      totalSpent: 0,
      believerCount: 0,
      believerList: [],
      angelCount: 0,
      pendingPrayers: 0,
      domains: {},
      identity: {
        name: 'No Deity Found',
        benevolence: 0.5,
        interventionism: 0.5,
        wrathfulness: 0.5,
      },
    };
  }

  // ========== Visibility ==========


  getId(): string {
    return 'divine-powers';
  }

  getTitle(): string {
    return 'Divine Powers';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 600;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  // ========== Dev/Testing ==========

  setDeityState(state: Partial<DeityState>): void {
    this.deityState = { ...this.deityState, ...state };
  }

  addBelief(amount: number): void {
    this.deityState.belief += amount;
    this.deityState.totalEarned += amount;
  }

  getBelief(): number {
    return this.deityState.belief;
  }

  // ========== Rendering ==========

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, world?: any): void {
    // Refresh state from world if available
    if (world) {
      this.refreshFromWorld(world);
    }

    this.clickRegions = [];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Deep mystical panel background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(14, 10, 32, 0.98)');
    bgGrad.addColorStop(1, 'rgba(7, 5, 18, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    let y = 0;

    // Header
    y = this.renderHeader(ctx, width, y);

    // Belief bar
    y = this.renderBeliefBar(ctx, width, y);

    // Quick stats
    y = this.renderStats(ctx, width, y);

    // Tier filter
    y = this.renderTierFilter(ctx, width, y);

    // Save context for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, height - y - (this.selectedPowerId ? SIZES.detailHeight : 0));
    ctx.clip();

    const contentStartY = y;
    y -= this.scrollOffset;

    // Power list
    y = this.renderPowerList(ctx, width, y);

    ctx.restore();

    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY - (this.selectedPowerId ? SIZES.detailHeight : 0);

    // Detail panel
    if (this.selectedPowerId) {
      this.renderDetailPanel(ctx, width, height);
    }
  }

  renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Gradient header strip
    const headerGrad = ctx.createLinearGradient(0, y, 0, y + SIZES.headerHeight);
    headerGrad.addColorStop(0, 'rgba(55, 30, 100, 0.95)');
    headerGrad.addColorStop(1, 'rgba(30, 15, 60, 0.95)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    // Arcane rune decorations
    ctx.fillStyle = 'rgba(180, 120, 255, 0.3)';
    ctx.font = '14px monospace';
    ctx.fillText('✦', SIZES.padding - 2, y + 8);
    ctx.fillText('✦', width - SIZES.padding - 10, y + 8);

    // Gold title with glow
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('DIVINE POWERS', SIZES.padding + 14, y + 10);
    ctx.shadowBlur = 0;

    // Accent separator line
    const sepGrad = ctx.createLinearGradient(0, y + SIZES.headerHeight - 1, width, y + SIZES.headerHeight - 1);
    sepGrad.addColorStop(0, 'transparent');
    sepGrad.addColorStop(0.3, 'rgba(180, 120, 255, 0.6)');
    sepGrad.addColorStop(0.7, 'rgba(180, 120, 255, 0.6)');
    sepGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = sepGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + SIZES.headerHeight - 1);
    ctx.lineTo(width, y + SIZES.headerHeight - 1);
    ctx.stroke();

    // Identity name (right-aligned, softer)
    ctx.fillStyle = 'rgba(200, 170, 255, 0.8)';
    ctx.font = '10px monospace';
    const nameWidth = ctx.measureText(this.deityState.identity.name).width;
    ctx.fillText(this.deityState.identity.name, width - nameWidth - SIZES.padding - 12, y + 12);

    return y + SIZES.headerHeight;
  }

  private renderBeliefBar(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const barWidth = width - SIZES.padding * 2;
    const barH = 18;
    const barY = y + 8;

    // Determine current tier and next threshold
    const currentTier = this.getCurrentTier();
    const nextThreshold = this.getNextThreshold();
    const prevThreshold = BELIEF_THRESHOLDS[currentTier];
    const tierColor = this.getTierColor(currentTier);

    // Progress within current tier
    let progress = 1;
    if (nextThreshold > prevThreshold) {
      progress = Math.min(1, (this.deityState.belief - prevThreshold) / (nextThreshold - prevThreshold));
    }

    // Track background — rounded
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, barY, barWidth, barH, 5);
    ctx.fill();

    // Fill — gradient in tier color
    if (progress > 0) {
      const fillGrad = ctx.createLinearGradient(SIZES.padding, 0, SIZES.padding + barWidth * progress, 0);
      fillGrad.addColorStop(0, tierColor + 'AA');
      fillGrad.addColorStop(1, tierColor);
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, barY, barWidth * progress, barH, 5);
      ctx.fill();
    }

    // Animated shimmer sweep when >80% to next tier
    if (progress > 0.8) {
      const t = performance.now() / 600;
      const shimmerX = SIZES.padding + (barWidth * progress) * ((t % 1));
      const shimGrad = ctx.createLinearGradient(shimmerX - 20, 0, shimmerX + 20, 0);
      shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
      shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimGrad;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, barY, barWidth * progress, barH, 5);
      ctx.clip();
      ctx.fillRect(SIZES.padding, barY, barWidth, barH);
      ctx.restore();
    }

    // Threshold markers (subtle ticks)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (const [_tier, threshold] of Object.entries(BELIEF_THRESHOLDS)) {
      if (threshold > 0 && threshold < 10000) {
        const xPos = SIZES.padding + (threshold / 10000) * barWidth;
        ctx.beginPath();
        ctx.moveTo(xPos, barY + 2);
        ctx.lineTo(xPos, barY + barH - 2);
        ctx.stroke();
      }
    }

    // Belief text over bar — centered
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `✦ ${this.deityState.belief.toFixed(1)} (+${this.deityState.beliefPerHour.toFixed(1)}/hr)`,
      width / 2,
      barY + 4
    );
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    // Tier pill (left) + next threshold (right) below bar
    const pillY = barY + barH + 4;

    // Tier pill
    ctx.fillStyle = tierColor + '33';
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, pillY, 70, 13, 4);
    ctx.fill();
    ctx.fillStyle = tierColor;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${getTierEmoji(currentTier)} ${currentTier.toUpperCase().replace('_', ' ')}`, SIZES.padding + 35, pillY + 2);
    ctx.textAlign = 'left';

    if (nextThreshold < Infinity) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`next tier: ${nextThreshold}`, width - SIZES.padding, pillY + 2);
      ctx.textAlign = 'left';
    }

    return y + SIZES.beliefBarHeight;
  }

  private renderStats(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Stats row with gradient pill badges
    const statItems: Array<{ label: string; value: string | number; color: string }> = [
      { label: '🙏', value: `${this.deityState.believerCount} believers`, color: '#88CCFF' },
      { label: '👼', value: `${this.deityState.angelCount} angels`, color: '#FFDD88' },
      { label: '✉', value: `${this.deityState.pendingPrayers} prayers`, color: '#FF88CC' },
    ];

    let sx = SIZES.padding;
    const pillH = 16;
    const pillY = y + 2;

    for (const stat of statItems) {
      const text = `${stat.label} ${stat.value}`;
      ctx.font = '9px monospace';
      const tw = ctx.measureText(text).width;
      const pw = tw + 14;

      ctx.fillStyle = stat.color + '22';
      ctx.beginPath();
      ctx.roundRect(sx, pillY, pw, pillH, 4);
      ctx.fill();
      ctx.strokeStyle = stat.color + '55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sx, pillY, pw, pillH, 4);
      ctx.stroke();

      ctx.fillStyle = stat.color;
      ctx.fillText(text, sx + 7, pillY + 3);
      sx += pw + 6;
    }

    y += pillH + 8;

    // Who believes section
    if (this.deityState.believerList.length > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('WHO BELIEVES', SIZES.padding, y + 2);

      // Gradient separator
      const sepGrad = ctx.createLinearGradient(SIZES.padding, 0, width - SIZES.padding, 0);
      sepGrad.addColorStop(0, 'rgba(255,215,0,0.4)');
      sepGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = sepGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(SIZES.padding + 80, y + 6);
      ctx.lineTo(width - SIZES.padding, y + 6);
      ctx.stroke();

      y += 14;

      const maxBelieversToShow = 4;
      const displayBelievers = this.deityState.believerList.slice(0, maxBelieversToShow);
      const barTrackW = 60;

      for (const believer of displayBelievers) {
        const faithPercent = Math.round(believer.faith * 100);
        const faithColor = faithPercent >= 80 ? '#FFD700' : faithPercent >= 50 ? '#87CEEB' : '#888888';

        // Row background
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.roundRect(SIZES.padding, y, width - SIZES.padding * 2, 14, 3);
        ctx.fill();

        ctx.fillStyle = faithColor;
        ctx.font = '9px monospace';
        ctx.fillText(believer.name, SIZES.padding + 4, y + 3);

        // Faith bar — right side
        const barX = width - SIZES.padding - barTrackW;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.roundRect(barX, y + 4, barTrackW, 6, 2);
        ctx.fill();

        const faithFill = (faithPercent / 100) * barTrackW;
        const fbGrad = ctx.createLinearGradient(barX, 0, barX + faithFill, 0);
        fbGrad.addColorStop(0, faithColor + '88');
        fbGrad.addColorStop(1, faithColor);
        ctx.fillStyle = fbGrad;
        ctx.beginPath();
        ctx.roundRect(barX, y + 4, faithFill, 6, 2);
        ctx.fill();

        ctx.fillStyle = faithColor;
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${faithPercent}%`, barX - 4, y + 3);
        ctx.textAlign = 'left';

        y += 14;
      }

      if (this.deityState.believerList.length > maxBelieversToShow) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '8px monospace';
        ctx.fillText(`  +${this.deityState.believerList.length - maxBelieversToShow} more…`, SIZES.padding, y + 2);
        y += 12;
      }
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '9px monospace';
      ctx.fillText('No believers yet — spread the faith', SIZES.padding, y + 2);
      y += 14;
    }

    // Note about Divine Communication panel
    y += 4;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText('💬 Visions & whispers → Divine Communication panel', SIZES.padding, y + 2);
    y += 13;

    // Domains as colored pill badges
    const domainEntries = Object.entries(this.deityState.domains);
    if (domainEntries.length > 0) {
      y += 4;
      ctx.font = '8px monospace';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('DOMAINS', SIZES.padding, y + 2);

      let dx = SIZES.padding + 55;
      for (const [domain, strength] of domainEntries) {
        const domainColor = strength > 50 ? '#FFD700' : '#8888AA';
        const dtext = domain;
        const dtw = ctx.measureText(dtext).width;
        const dpw = dtw + 12;

        ctx.fillStyle = domainColor + '22';
        ctx.beginPath();
        ctx.roundRect(dx, y, dpw, 14, 4);
        ctx.fill();
        ctx.strokeStyle = domainColor + '55';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(dx, y, dpw, 14, 4);
        ctx.stroke();

        ctx.fillStyle = domainColor;
        ctx.font = '8px monospace';
        ctx.fillText(dtext, dx + 6, y + 3);
        dx += dpw + 5;
      }
      y += 16;
    }

    return y + 4;
  }

  private renderTierFilter(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const tiers: Array<{ id: DivinePowerTier | 'all'; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'minor', label: 'Minor' },
      { id: 'moderate', label: 'Mod' },
      { id: 'major', label: 'Major' },
      { id: 'supreme', label: 'Supreme' },
    ];

    const tabWidth = (width - SIZES.padding * 2) / tiers.length;
    let x = SIZES.padding;
    const tabH = SIZES.filterHeight - 4;

    for (const tier of tiers) {
      const isActive = this.filterTier === tier.id;
      const isAvailable = tier.id === 'all' || this.deityState.belief >= BELIEF_THRESHOLDS[tier.id];
      const tierColor = tier.id === 'all' ? '#AAAACC' : this.getTierColor(tier.id);

      // Tab background
      if (isActive) {
        ctx.fillStyle = tierColor + '33';
      } else {
        ctx.fillStyle = 'rgba(30, 25, 55, 0.5)';
      }
      ctx.beginPath();
      ctx.roundRect(x, y, tabWidth - 2, tabH, 5);
      ctx.fill();

      // Active border glow
      if (isActive) {
        ctx.shadowColor = tierColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = tierColor + 'AA';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, tabWidth - 2, tabH, 5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(80,70,110,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, tabWidth - 2, tabH, 5);
        ctx.stroke();
      }

      ctx.fillStyle = !isAvailable ? COLORS.textDim : (isActive ? tierColor : COLORS.textMuted);
      ctx.font = isActive ? 'bold 9px monospace' : '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        tier.id !== 'all' ? `${getTierEmoji(tier.id)} ${tier.label}` : tier.label,
        x + (tabWidth - 2) / 2,
        y + 7
      );
      ctx.textAlign = 'left';

      if (isAvailable) {
        this.clickRegions.push({
          x,
          y,
          width: tabWidth - 2,
          height: tabH,
          action: 'filter_tier',
          data: tier.id,
        });
      }

      x += tabWidth;
    }

    return y + SIZES.filterHeight;
  }

  private renderPowerList(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const filtered = DIVINE_POWERS.filter(p => {
      if (this.filterTier !== 'all' && p.tier !== this.filterTier) return false;
      return this.isTierAccessible(p.tier);
    });

    if (filtered.length === 0) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No powers available at this tier', width / 2, y + 20);
      ctx.textAlign = 'left';
      return y + 60;
    }

    for (const power of filtered) {
      y = this.renderPowerRow(ctx, width, y, power);
    }

    return y;
  }

  private renderPowerRow(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    power: DivinePower
  ): number {
    const isSelected = this.selectedPowerId === power.id;
    const canAfford = this.deityState.belief >= power.beliefCost;
    const isOnCooldown = this.isPowerOnCooldown(power.id);
    const isUsable = canAfford && !isOnCooldown;
    const tierColor = this.getTierColor(power.tier);

    const rowX = SIZES.padding / 2;
    const rowW = width - SIZES.padding;
    const rowH = SIZES.powerRowHeight - 4;

    // Card background
    const cardGrad = ctx.createLinearGradient(rowX, y + 2, rowX + rowW, y + 2);
    if (isSelected) {
      cardGrad.addColorStop(0, 'rgba(70, 50, 110, 0.9)');
      cardGrad.addColorStop(1, 'rgba(45, 30, 75, 0.9)');
    } else {
      cardGrad.addColorStop(0, 'rgba(30, 25, 50, 0.85)');
      cardGrad.addColorStop(1, 'rgba(20, 15, 35, 0.85)');
    }
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(rowX, y + 2, rowW, rowH, 5);
    ctx.fill();

    // 3px left accent bar in tier color
    ctx.fillStyle = tierColor;
    ctx.beginPath();
    ctx.roundRect(rowX, y + 2, 3, rowH, [3, 0, 0, 3]);
    ctx.fill();

    // Selected border glow
    if (isSelected) {
      ctx.shadowColor = tierColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = tierColor + '88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rowX, y + 2, rowW, rowH, 5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(80, 70, 110, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rowX, y + 2, rowW, rowH, 5);
      ctx.stroke();
    }

    // Tier emoji prefix + power name
    const emoji = getTierEmoji(power.tier);
    ctx.fillStyle = isUsable ? COLORS.text : COLORS.textDim;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${emoji} ${power.name}`, rowX + 10, y + 8);

    // Cost pill badge (top-right)
    const costText = `${power.beliefCost} ✦`;
    ctx.font = '9px monospace';
    const ctw = ctx.measureText(costText).width;
    const cpw = ctw + 10;
    const cpx = rowX + rowW - cpw - 4;
    ctx.fillStyle = canAfford ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 80, 80, 0.15)';
    ctx.beginPath();
    ctx.roundRect(cpx, y + 6, cpw, 14, 4);
    ctx.fill();
    ctx.fillStyle = canAfford ? '#FFD700' : '#FF6666';
    ctx.fillText(costText, cpx + 5, y + 8);

    // Description
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText(power.description, rowX + 10, y + 24);

    // Status row: target type or cooldown
    if (isOnCooldown) {
      // Cooldown pill
      ctx.fillStyle = 'rgba(255, 100, 100, 0.12)';
      ctx.beginPath();
      ctx.roundRect(rowX + 10, y + 37, 72, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#FF8888';
      ctx.font = '8px monospace';
      ctx.fillText('⏳ On Cooldown', rowX + 14, y + 40);
    } else {
      ctx.fillStyle = 'rgba(120, 120, 160, 0.3)';
      ctx.beginPath();
      ctx.roundRect(rowX + 10, y + 37, 70, 12, 3);
      ctx.fill();
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '8px monospace';
      ctx.fillText(`→ ${power.targetType}`, rowX + 14, y + 40);
    }

    // Click region
    this.clickRegions.push({
      x: rowX,
      y: y + 2,
      width: rowW,
      height: rowH,
      action: 'select_power',
      data: power.id,
    });

    return y + SIZES.powerRowHeight;
  }

  private renderDetailPanel(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const power = DIVINE_POWERS.find(p => p.id === this.selectedPowerId);
    if (!power) return;

    const panelY = height - SIZES.detailHeight;
    const canAfford = this.deityState.belief >= power.beliefCost;
    const isOnCooldown = this.isPowerOnCooldown(power.id);
    const isUsable = canAfford && !isOnCooldown;
    const tierColor = this.getTierColor(power.tier);

    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, panelY, 0, height);
    bgGrad.addColorStop(0, 'rgba(28, 20, 55, 0.97)');
    bgGrad.addColorStop(1, 'rgba(14, 10, 32, 0.97)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, panelY, width, SIZES.detailHeight);

    // Tier-color gradient top border glow
    const topBorderGrad = ctx.createLinearGradient(0, panelY, width, panelY);
    topBorderGrad.addColorStop(0, 'transparent');
    topBorderGrad.addColorStop(0.2, tierColor);
    topBorderGrad.addColorStop(0.8, tierColor);
    topBorderGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = topBorderGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(width, panelY);
    ctx.stroke();

    let y = panelY + SIZES.padding;

    // Power name with tier glow
    ctx.shadowColor = tierColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = tierColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${getTierEmoji(power.tier)} ${power.name}`, SIZES.padding, y);
    ctx.shadowBlur = 0;

    // INVOKE button — pulses when usable
    const btnX = width - 100 - SIZES.padding;
    const btnY = y - 2;
    const btnW = 98;
    const btnH = 22;

    if (isUsable) {
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 400);
      ctx.shadowColor = tierColor;
      ctx.shadowBlur = 10 * pulse;
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, tierColor + 'CC');
      btnGrad.addColorStop(1, tierColor + '88');
      ctx.fillStyle = btnGrad;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(60, 55, 80, 0.7)';
    }
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 5);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = isUsable ? '#FFFFFF' : COLORS.textDim;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ INVOKE', btnX + btnW / 2, btnY + 6);
    ctx.textAlign = 'left';

    if (isUsable) {
      this.clickRegions.push({
        x: btnX,
        y: btnY,
        width: btnW,
        height: btnH,
        action: 'execute_power',
        data: power.id,
      });
    }

    y += 22;

    // Description
    ctx.fillStyle = '#DDCCFF';
    ctx.font = '10px monospace';
    ctx.fillText(power.description, SIZES.padding, y);
    y += 17;

    // Stats row
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText(
      `Cost: ${power.beliefCost} ✦  |  Cooldown: ${(power.cooldown / 20).toFixed(0)}s  |  Target: ${power.targetType}`,
      SIZES.padding,
      y
    );
    y += 15;

    // After use preview
    if (canAfford) {
      ctx.fillStyle = 'rgba(100, 220, 120, 0.7)';
      ctx.fillText(
        `After use: ${Math.floor(this.deityState.belief - power.beliefCost)} ✦ remaining`,
        SIZES.padding,
        y
      );
    } else {
      ctx.fillStyle = '#FF8888';
      ctx.fillText(
        `Need ${power.beliefCost - Math.floor(this.deityState.belief)} more belief`,
        SIZES.padding,
        y
      );
    }
  }

  // ========== Helpers ==========

  private getCurrentTier(): DivinePowerTier {
    const belief = this.deityState.belief;
    if (belief >= BELIEF_THRESHOLDS.world_shaping) return 'world_shaping';
    if (belief >= BELIEF_THRESHOLDS.supreme) return 'supreme';
    if (belief >= BELIEF_THRESHOLDS.major) return 'major';
    if (belief >= BELIEF_THRESHOLDS.moderate) return 'moderate';
    if (belief >= BELIEF_THRESHOLDS.minor) return 'minor';
    return 'dormant';
  }

  private getNextThreshold(): number {
    const belief = this.deityState.belief;
    if (belief < BELIEF_THRESHOLDS.minor) return BELIEF_THRESHOLDS.minor;
    if (belief < BELIEF_THRESHOLDS.moderate) return BELIEF_THRESHOLDS.moderate;
    if (belief < BELIEF_THRESHOLDS.major) return BELIEF_THRESHOLDS.major;
    if (belief < BELIEF_THRESHOLDS.supreme) return BELIEF_THRESHOLDS.supreme;
    if (belief < BELIEF_THRESHOLDS.world_shaping) return BELIEF_THRESHOLDS.world_shaping;
    return Infinity;
  }

  private isTierAccessible(tier: DivinePowerTier): boolean {
    return this.deityState.belief >= BELIEF_THRESHOLDS[tier];
  }

  private getTierColor(tier: DivinePowerTier | 'all'): string {
    switch (tier) {
      case 'dormant': return COLORS.tierDormant;
      case 'minor': return COLORS.tierMinor;
      case 'moderate': return COLORS.tierModerate;
      case 'major': return COLORS.tierMajor;
      case 'supreme': return COLORS.tierSupreme;
      case 'world_shaping': return COLORS.tierWorldShaping;
      default: return COLORS.text;
    }
  }

  private isPowerOnCooldown(powerId: string): boolean {
    const availableAt = this.cooldowns.get(powerId);
    if (!availableAt) return false;
    return Date.now() < availableAt;
  }

  // ========== Interaction ==========

  handleScroll(deltaY: number, _contentHeight?: number): boolean {
    const maxScroll = Math.max(0, this.contentHeight - this.visibleHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  handleClick(x: number, y: number): boolean {
    const adjustedY = y + this.scrollOffset;

    for (const region of this.clickRegions) {
      const regionY = region.y + (region.action === 'select_power' ? this.scrollOffset : 0);

      if (
        x >= region.x &&
        x <= region.x + region.width &&
        adjustedY >= regionY &&
        adjustedY <= regionY + region.height
      ) {
        return this.handleClickAction(region);
      }
    }

    return false;
  }

  private handleClickAction(region: ClickRegion): boolean {
    switch (region.action) {
      case 'select_power':
        this.selectedPowerId = this.selectedPowerId === region.data ? null : region.data ?? null;
        return true;

      case 'filter_tier':
        this.filterTier = region.data as DivinePowerTier | 'all';
        return true;

      case 'execute_power':
        this.executePower(region.data!);
        return true;
    }
    return false;
  }

  private executePower(powerId: string): void {
    const power = DIVINE_POWERS.find(p => p.id === powerId);
    if (!power) return;

    if (this.deityState.belief < power.beliefCost) return;
    if (this.isPowerOnCooldown(powerId)) return;

    // Check if we have a world and deity to execute with
    if (!this.world || !this.playerDeityId) {
      console.error('[DivinePowersPanel] Cannot execute power: no world or deity');
      return;
    }

    // Powers that require parameter input
    const parametricPowers = ['whisper', 'dream_hint', 'clear_vision', 'subtle_sign'];

    if (parametricPowers.includes(powerId)) {
      // Show parameter modal
      this.parameterModal.show({
        powerType: powerId,
        powerName: power.name,
        deityId: this.playerDeityId,
        availableTargets: this.deityState.believerList,
        onConfirm: (params: DivineParameterResult) => {
          this.executePowerWithParameters(powerId, power, params);
        },
        onCancel: () => {
          // User cancelled - deselect the power to return to full list
          this.selectedPowerId = null;
        },
      });
    } else {
      // Powers without parameters can execute directly
      this.executePowerWithParameters(powerId, power, {});
    }
  }

  /**
   * Execute a power with collected parameters
   */
  private executePowerWithParameters(
    powerId: string,
    power: DivinePower,
    params: DivineParameterResult
  ): void {
    if (!this.world || !this.playerDeityId) return;

    // Set cooldown locally (will be enforced by backend too)
    this.cooldowns.set(powerId, Date.now() + power.cooldown * 50); // 50ms per tick

    // Build params object
    const eventParams: Record<string, any> = { ...params.params };
    if (params.message) {
      eventParams.message = params.message;
    }
    if (params.signType) {
      eventParams.signType = params.signType;
    }

    // Emit event to trigger the DivinePowerSystem backend
    this.world.eventBus.emit({
      type: 'divine_power:request',
      source: 'ui',
      data: {
        deityId: this.playerDeityId,
        powerType: powerId,
        targetId: params.targetId,
        params: eventParams,
      },
    });
  }

  /**
   * Execute a power with a specific target
   */
  executePowerWithTarget(powerId: string, targetId: string): void {
    const power = DIVINE_POWERS.find(p => p.id === powerId);
    if (!power) return;

    if (this.deityState.belief < power.beliefCost) return;
    if (this.isPowerOnCooldown(powerId)) return;

    if (!this.world || !this.playerDeityId) {
      console.error('[DivinePowersPanel] Cannot execute power: no world or deity');
      return;
    }

    this.cooldowns.set(powerId, Date.now() + power.cooldown * 50);

    this.world.eventBus.emit({
      type: 'divine_power:request',
      source: 'ui',
      data: {
        deityId: this.playerDeityId,
        powerType: powerId,
        targetId,
        params: {},
      },
    });
  }
}
