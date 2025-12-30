/**
 * PantheonView - All deities in the world
 *
 * Shows all deities (player and AI), their domains, followers, and relationships.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * Deity summary information
 */
export interface DeitySummary {
  id: string;
  name: string;
  controller: 'player' | 'ai' | 'dormant';
  belief: number;
  believerCount: number;
  domain: string | null;
  powerTier: string;
  alignment: string;
}

/**
 * Deity relationship
 */
export interface DeityRelation {
  deityId: string;
  relationshipType: 'ally' | 'rival' | 'enemy' | 'neutral';
  strength: number;
}

/**
 * Data returned by the Pantheon view
 */
export interface PantheonViewData extends ViewData {
  /** All deities */
  deities: DeitySummary[];
  /** Player deity ID */
  playerDeityId: string | null;
  /** Relationships between deities */
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  /** Total belief in the world */
  totalBelief: number;
}

const CT = { Deity: 'deity' };

/**
 * Calculate power tier from belief
 */
function calculateTier(belief: number): string {
  if (belief >= 5000) return 'world_shaping';
  if (belief >= 2000) return 'supreme';
  if (belief >= 500) return 'major';
  if (belief >= 100) return 'moderate';
  if (belief >= 10) return 'minor';
  return 'dormant';
}

/**
 * Pantheon View Definition
 */
export const PantheonView: DashboardView<PantheonViewData> = {
  id: 'pantheon',
  title: 'Divine Pantheon',
  category: 'divinity',
  keyboardShortcut: undefined,
  description: 'All deities and their relationships',

  defaultSize: {
    width: 550,
    height: 600,
    minWidth: 450,
    minHeight: 400,
  },

  getData(context: ViewContext): PantheonViewData {
    const { world } = context;

    const emptyData: PantheonViewData = {
      timestamp: Date.now(),
      available: true,
      deities: [],
      playerDeityId: null,
      relationships: [],
      totalBelief: 0,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      const deities: DeitySummary[] = [];
      let playerDeityId: string | null = null;
      let totalBelief = 0;

      // Find all deities
      for (const entity of world.entities.values()) {
        if (!entity.components.has(CT.Deity)) continue;

        const deityComp = entity.components.get(CT.Deity) as any;
        if (!deityComp) continue;

        const belief = deityComp.belief?.currentBelief ?? 0;
        totalBelief += belief;

        const identity = deityComp.identity ?? { primaryName: 'Unknown', domain: null, perceivedAlignment: 'neutral' };
        const summary: DeitySummary = {
          id: entity.id,
          name: identity.primaryName,
          controller: deityComp.controller,
          belief,
          believerCount: deityComp.believers?.size ?? 0,
          domain: identity.domain ?? null,
          powerTier: calculateTier(belief),
          alignment: identity.perceivedAlignment,
        };

        deities.push(summary);

        if (deityComp.controller === 'player') {
          playerDeityId = entity.id;
        }
      }

      // Sort by belief (most powerful first)
      deities.sort((a, b) => b.belief - a.belief);

      // TODO: Get deity relationships when relationship system is implemented
      const relationships: Array<{ from: string; to: string; type: string }> = [];

      return {
        timestamp: Date.now(),
        available: true,
        deities,
        playerDeityId,
        relationships,
        totalBelief,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: PantheonViewData): string {
    const lines: string[] = [
      'DIVINE PANTHEON',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Pantheon data unavailable');
      return lines.join('\n');
    }

    if (data.deities.length === 0) {
      lines.push('No deities exist in this world yet.');
      lines.push('');
      lines.push('Deities emerge when mortals share beliefs and prayers.');
      return lines.join('\n');
    }

    lines.push(`${data.deities.length} ${data.deities.length === 1 ? 'Deity' : 'Deities'} in the World`);
    lines.push(`Total Divine Belief: ${Math.floor(data.totalBelief)}`);
    lines.push('');

    // Group by power tier
    const tierGroups = new Map<string, DeitySummary[]>();
    for (const deity of data.deities) {
      const tier = deity.powerTier;
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(deity);
    }

    const tierOrder = ['world_shaping', 'supreme', 'major', 'moderate', 'minor', 'dormant'];

    for (const tier of tierOrder) {
      const group = tierGroups.get(tier);
      if (!group || group.length === 0) continue;

      const tierName = tier.replace('_', ' ').toUpperCase();
      lines.push(`${tierName} TIER`);
      lines.push('─'.repeat(50));

      for (const deity of group) {
        const isPlayer = deity.id === data.playerDeityId ? ' [YOU]' : '';
        const controllerLabel = deity.controller === 'ai' ? ' (AI)' : deity.controller === 'dormant' ? ' (dormant)' : '';

        lines.push(`${deity.name}${isPlayer}${controllerLabel}`);
        lines.push(`  Belief: ${Math.floor(deity.belief)} | Believers: ${deity.believerCount}`);

        if (deity.domain) {
          const domainLabel = deity.domain.replace('_', ' ');
          lines.push(`  Domain: ${domainLabel} | Alignment: ${deity.alignment}`);
        }

        lines.push('');
      }
    }

    // Relationships
    if (data.relationships.length > 0) {
      lines.push('DIVINE RELATIONSHIPS');
      lines.push('─'.repeat(50));

      for (const rel of data.relationships) {
        const fromDeity = data.deities.find(d => d.id === rel.from);
        const toDeity = data.deities.find(d => d.id === rel.to);

        if (fromDeity && toDeity) {
          lines.push(`${fromDeity.name} → ${toDeity.name}: ${rel.type}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: PantheonViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'No pantheon data', x + padding, currentY);
      return;
    }

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText('Divine Pantheon', x + padding, currentY);
    currentY += lineHeight + 5;

    // Stats
    ctx.fillStyle = theme.colors.text;
    ctx.font = theme.fonts.normal;
    ctx.fillText(`${data.deities.length} deities`, x + padding, currentY);
    currentY += lineHeight;
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`Total belief: ${Math.floor(data.totalBelief)}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Deities
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Active Deities:', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    for (const deity of data.deities.slice(0, 8)) {
      const isPlayer = deity.id === data.playerDeityId;
      ctx.fillStyle = isPlayer ? '#DAA520' : theme.colors.text;

      const name = isPlayer ? `${deity.name} [YOU]` : deity.name;
      ctx.fillText(name, x + padding, currentY);
      currentY += lineHeight;

      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`  ${deity.believerCount} believers, ${deity.powerTier}`, x + padding, currentY);
      currentY += lineHeight + 2;
    }
  },
};
