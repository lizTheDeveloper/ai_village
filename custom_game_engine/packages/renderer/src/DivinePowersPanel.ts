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

import type { World } from '@ai-village/core';
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
  beliefBarHeight: 40,
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
   */
  private refreshFromWorld(world: World): void {
    this.world = world;

    // Find player-controlled deity
    for (const entity of world.entities.values()) {
      const deityComp = entity.components.get('deity') as any;
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
            const identity = believerEntity.components?.get('identity') as any;
            const spiritual = believerEntity.components?.get('spiritual') as any;
            believerList.push({
              id: believerId,
              name: identity?.name || 'Unknown',
              faith: spiritual?.faith ?? 0,
            });
          }
        }
        // Sort by faith (highest first)
        believerList.sort((a, b) => b.faith - a.faith);

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
          angelCount: 0, // TODO: Track angels separately
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
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    ctx.fillStyle = COLORS.belief;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('DIVINE POWERS', SIZES.padding, y + 10);

    // Identity name
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    const nameWidth = ctx.measureText(this.deityState.identity.name).width;
    ctx.fillText(this.deityState.identity.name, width - nameWidth - SIZES.padding, y + 12);

    return y + SIZES.headerHeight;
  }

  private renderBeliefBar(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const barWidth = width - SIZES.padding * 2;

    // Determine current tier and next threshold
    const currentTier = this.getCurrentTier();
    const nextThreshold = this.getNextThreshold();
    const prevThreshold = BELIEF_THRESHOLDS[currentTier];

    // Progress within current tier
    let progress = 1;
    if (nextThreshold > prevThreshold) {
      progress = Math.min(1, (this.deityState.belief - prevThreshold) / (nextThreshold - prevThreshold));
    }

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(SIZES.padding, y + 8, barWidth, 20);

    // Fill
    ctx.fillStyle = COLORS.beliefBar;
    ctx.fillRect(SIZES.padding, y + 8, barWidth * progress, 20);

    // Threshold markers
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 1;
    for (const [_tier, threshold] of Object.entries(BELIEF_THRESHOLDS)) {
      if (threshold > 0 && threshold < 10000) {
        const xPos = SIZES.padding + (threshold / 10000) * barWidth;
        ctx.beginPath();
        ctx.moveTo(xPos, y + 8);
        ctx.lineTo(xPos, y + 28);
        ctx.stroke();
      }
    }

    // Belief text - rounded to 1 decimal place
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `BELIEF: ${this.deityState.belief.toFixed(1)} (+${this.deityState.beliefPerHour.toFixed(1)}/hr)`,
      width / 2,
      y + 11
    );
    ctx.textAlign = 'left';

    // Tier indicator
    ctx.fillStyle = this.getTierColor(currentTier);
    ctx.font = '9px monospace';
    ctx.fillText(currentTier.toUpperCase(), SIZES.padding, y + 32);

    if (nextThreshold < Infinity) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(`Next: ${nextThreshold}`, SIZES.padding + 80, y + 32);
    }

    return y + SIZES.beliefBarHeight;
  }

  private renderStats(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';

    const stats = [
      `Believers: ${this.deityState.believerCount}`,
      `Angels: ${this.deityState.angelCount}`,
      `Prayers: ${this.deityState.pendingPrayers}`,
    ];

    let x = SIZES.padding;
    for (const stat of stats) {
      ctx.fillText(stat, x, y + 4);
      x += ctx.measureText(stat).width + 20;
    }

    // Show who is believing (believer names with faith levels)
    y += 18;
    if (this.deityState.believerList.length > 0) {
      ctx.fillStyle = COLORS.belief;
      ctx.fillText('Who believes:', SIZES.padding, y + 4);

      y += 14;
      ctx.font = '9px monospace';
      const maxBelieversToShow = 5;
      const displayBelievers = this.deityState.believerList.slice(0, maxBelieversToShow);

      for (const believer of displayBelievers) {
        // Faith bar
        const faithPercent = Math.round(believer.faith * 100);
        const faithColor = faithPercent >= 80 ? '#FFD700' : faithPercent >= 50 ? '#87CEEB' : '#888888';

        ctx.fillStyle = faithColor;
        ctx.fillText(`  ${believer.name} (${faithPercent}% faith)`, SIZES.padding, y + 4);
        y += 12;
      }

      if (this.deityState.believerList.length > maxBelieversToShow) {
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(`  ...and ${this.deityState.believerList.length - maxBelieversToShow} more`, SIZES.padding, y + 4);
        y += 12;
      }

      ctx.font = '10px monospace';
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('No believers yet', SIZES.padding, y + 4);
      y += 14;
    }

    // Note about Divine Communication panel
    y += 6;
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('💬 For visions/whispers: Use Divine Communication panel', SIZES.padding, y + 4);
    y += 12;

    // Domains
    y += 4;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Domains:', SIZES.padding, y + 4);

    x = SIZES.padding + 60;
    for (const [domain, strength] of Object.entries(this.deityState.domains)) {
      ctx.fillStyle = strength > 50 ? COLORS.belief : COLORS.textMuted;
      ctx.fillText(`${domain} ${strength}%`, x, y + 4);
      x += ctx.measureText(`${domain} ${strength}%`).width + 12;
    }

    return y + SIZES.statsHeight - 20;
  }

  private renderTierFilter(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const tiers: Array<{ id: DivinePowerTier | 'all'; label: string }> = [
      { id: 'all', label: 'All' },
      { id: 'minor', label: 'Minor' },
      { id: 'moderate', label: 'Moderate' },
      { id: 'major', label: 'Major' },
      { id: 'supreme', label: 'Supreme' },
    ];

    const tabWidth = (width - SIZES.padding * 2) / tiers.length;
    let x = SIZES.padding;

    for (const tier of tiers) {
      const isActive = this.filterTier === tier.id;
      const isAvailable = tier.id === 'all' || this.deityState.belief >= BELIEF_THRESHOLDS[tier.id];

      ctx.fillStyle = isActive ? 'rgba(100, 100, 140, 0.5)' : 'rgba(40, 40, 60, 0.3)';
      ctx.fillRect(x, y, tabWidth - 2, SIZES.filterHeight - 4);

      ctx.fillStyle = !isAvailable ? COLORS.textDim : (isActive ? this.getTierColor(tier.id) : COLORS.textMuted);
      ctx.font = isActive ? 'bold 9px monospace' : '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tier.label, x + tabWidth / 2, y + 8);
      ctx.textAlign = 'left';

      if (isAvailable) {
        this.clickRegions.push({
          x,
          y,
          width: tabWidth - 2,
          height: SIZES.filterHeight - 4,
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

    // Background
    ctx.fillStyle = isSelected ? COLORS.powerSelected : COLORS.powerBg;
    ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.powerRowHeight - 4);

    // Border
    ctx.strokeStyle = isSelected ? this.getTierColor(power.tier) : COLORS.border;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.powerRowHeight - 4);

    // Tier indicator
    ctx.fillStyle = this.getTierColor(power.tier);
    ctx.font = '9px monospace';
    ctx.fillText(power.tier.substring(0, 3).toUpperCase(), SIZES.padding, y + 8);

    // Power name
    ctx.fillStyle = isUsable ? COLORS.text : COLORS.textDim;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(power.name, SIZES.padding + 35, y + 8);

    // Cost
    ctx.fillStyle = canAfford ? COLORS.belief : '#FF6666';
    ctx.font = '10px monospace';
    const costText = `${power.beliefCost} belief`;
    const costWidth = ctx.measureText(costText).width;
    ctx.fillText(costText, width - costWidth - SIZES.padding, y + 8);

    // Description
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText(power.description, SIZES.padding, y + 24);

    // Cooldown status
    if (isOnCooldown) {
      ctx.fillStyle = '#FF6666';
      ctx.fillText('On Cooldown', SIZES.padding, y + 38);
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(`Target: ${power.targetType}`, SIZES.padding, y + 38);
    }

    // Click region
    this.clickRegions.push({
      x: SIZES.padding / 2,
      y: y + 2,
      width: width - SIZES.padding,
      height: SIZES.powerRowHeight - 4,
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

    // Background
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, panelY, width, SIZES.detailHeight);

    // Border
    ctx.strokeStyle = this.getTierColor(power.tier);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelY);
    ctx.lineTo(width, panelY);
    ctx.stroke();

    let y = panelY + SIZES.padding;

    // Power name
    ctx.fillStyle = this.getTierColor(power.tier);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(power.name, SIZES.padding, y);

    // Execute button
    const btnX = width - 100 - SIZES.padding;
    const btnY = y - 4;
    const btnW = 100;
    const btnH = 24;

    ctx.fillStyle = isUsable ? this.getTierColor(power.tier) : COLORS.textDim;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 4);
    ctx.fill();

    ctx.fillStyle = isUsable ? COLORS.text : COLORS.textMuted;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INVOKE', btnX + btnW / 2, btnY + 7);
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
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px monospace';
    ctx.fillText(power.description, SIZES.padding, y);
    y += 18;

    // Details
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px monospace';
    ctx.fillText(
      `Cost: ${power.beliefCost} belief | Cooldown: ${(power.cooldown / 20).toFixed(0)}s | Target: ${power.targetType}`,
      SIZES.padding,
      y
    );
    y += 16;

    // After use preview
    if (canAfford) {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(
        `After use: ${Math.floor(this.deityState.belief - power.beliefCost)} belief remaining`,
        SIZES.padding,
        y
      );
    } else {
      ctx.fillStyle = '#FF6666';
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
      console.log('[DivinePowersPanel] Showing parameter modal for power:', powerId);
      // Show parameter modal
      this.parameterModal.show({
        powerType: powerId,
        powerName: power.name,
        deityId: this.playerDeityId,
        availableTargets: this.deityState.believerList,
        onConfirm: (params: DivineParameterResult) => {
          console.log('[DivinePowersPanel] Modal confirmed with params:', params);
          this.executePowerWithParameters(powerId, power, params);
        },
        onCancel: () => {
          console.log('[DivinePowersPanel] Modal cancelled');
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
