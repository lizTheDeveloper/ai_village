/**
 * RelationshipsView - Social relationships for selected agent
 *
 * Shows the selected agent's social connections including:
 * - Friends, acquaintances, and strangers
 * - Relationship strength and history
 * - Recent interactions
 * - Group memberships
 *
 * Accessibility-first: describes social network in narrative form.
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
 * A single relationship entry
 */
interface RelationshipEntry {
  targetId: string;
  targetName: string;
  strength: number; // -100 to 100
  type: 'friend' | 'acquaintance' | 'stranger' | 'rival' | 'family';
  lastInteraction: number | null;
  interactionCount: number;
  sharedMemories: number;
}

/**
 * Data returned by the Relationships view
 */
export interface RelationshipsViewData extends ViewData {
  /** Agent entity ID */
  agentId: string | null;
  /** Agent's name */
  agentName: string | null;
  /** Total relationships */
  totalRelationships: number;
  /** Friends (strength > 50) */
  friendCount: number;
  /** Rivals (strength < -30) */
  rivalCount: number;
  /** List of relationships */
  relationships: RelationshipEntry[];
  /** Agent's sociability trait */
  sociability: number | null;
  /** Is the agent isolated? */
  isIsolated: boolean;
}

/**
 * Get relationship type description
 */
function getRelationshipDescription(strength: number, type: string): string {
  if (type === 'family') {
    return strength > 50 ? 'close family' : strength > 0 ? 'family' : 'estranged family';
  }
  if (strength >= 70) return 'close friend';
  if (strength >= 50) return 'friend';
  if (strength >= 20) return 'acquaintance';
  if (strength >= -20) return 'neutral';
  if (strength >= -50) return 'disliked';
  return 'rival';
}

/**
 * Format time since last interaction
 */
function formatTimeSince(timestamp: number | null): string {
  if (!timestamp) return 'never';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'just now';
}

/**
 * Relationships View Definition
 */
export const RelationshipsView: DashboardView<RelationshipsViewData> = {
  id: 'relationships',
  title: 'Relationships',
  category: 'social',
  keyboardShortcut: 'R',
  description: 'Social connections and relationships for the selected agent',

  defaultSize: {
    width: 360,
    height: 500,
    minWidth: 300,
    minHeight: 400,
  },

  getData(context: ViewContext): RelationshipsViewData {
    const { world, selectedEntityId } = context;

    const emptyData: RelationshipsViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No agent selected',
      agentId: null,
      agentName: null,
      totalRelationships: 0,
      friendCount: 0,
      rivalCount: 0,
      relationships: [],
      sociability: null,
      isIsolated: true,
    };

    if (!selectedEntityId) {
      return emptyData;
    }

    if (!world || typeof world.getEntity !== 'function') {
      emptyData.unavailableReason = 'Game world not available';
      return emptyData;
    }

    try {
      const entity = world.getEntity(selectedEntityId);
      if (!entity) {
        emptyData.unavailableReason = 'Selected entity not found';
        return emptyData;
      }

      const agent = entity.components.get('agent') as unknown as {
        name?: string;
      } | undefined;

      if (!agent) {
        emptyData.unavailableReason = 'Selected entity is not an agent';
        return emptyData;
      }

      const social = entity.components.get('social') as unknown as {
        relationships?: Map<string, {
          strength: number;
          type: string;
          lastInteraction?: number;
          interactionCount?: number;
          sharedMemories?: number;
        }>;
      } | undefined;

      const personality = entity.components.get('personality') as unknown as {
        sociability?: number;
      } | undefined;

      const relationships: RelationshipEntry[] = [];
      let friendCount = 0;
      let rivalCount = 0;

      if (social?.relationships) {
        for (const [targetId, rel] of social.relationships) {
          // Try to get target name
          let targetName = 'Unknown';
          try {
            const targetEntity = world.getEntity(targetId);
            const targetAgent = targetEntity?.components.get('agent') as unknown as { name?: string } | undefined;
            if (targetAgent?.name) {
              targetName = targetAgent.name;
            }
          } catch {
            // Target may no longer exist
          }

          const entry: RelationshipEntry = {
            targetId,
            targetName,
            strength: rel.strength,
            type: (rel.type as RelationshipEntry['type']) || 'acquaintance',
            lastInteraction: rel.lastInteraction || null,
            interactionCount: rel.interactionCount || 0,
            sharedMemories: rel.sharedMemories || 0,
          };

          relationships.push(entry);

          if (rel.strength > 50) friendCount++;
          if (rel.strength < -30) rivalCount++;
        }
      }

      // Sort by strength (strongest relationships first)
      relationships.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));

      return {
        timestamp: Date.now(),
        available: true,
        agentId: selectedEntityId,
        agentName: agent.name || null,
        totalRelationships: relationships.length,
        friendCount,
        rivalCount,
        relationships,
        sociability: personality?.sociability ?? null,
        isIsolated: relationships.length === 0,
      };
    } catch (error) {
      emptyData.unavailableReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      return emptyData;
    }
  },

  textFormatter(data: RelationshipsViewData): string {
    const lines: string[] = [
      'SOCIAL RELATIONSHIPS',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Relationship data unavailable');
      lines.push('');
      lines.push('Click on an agent in the game world to view their relationships.');
      return lines.join('\n');
    }

    // Agent identity
    lines.push(`${data.agentName || 'Unnamed Agent'}'s Social Network`);
    lines.push('');

    // Social summary - narrative
    if (data.isIsolated) {
      lines.push('This agent has no established relationships yet.');
      lines.push('They are socially isolated and may benefit from more interaction.');
      if (data.sociability !== null) {
        const sociabilityDesc = data.sociability > 0.6 ? 'naturally social' :
          data.sociability > 0.3 ? 'moderately social' : 'introverted';
        lines.push(`Personality: ${sociabilityDesc}`);
      }
      return lines.join('\n');
    }

    // Summary
    lines.push('SOCIAL SUMMARY');
    lines.push('-'.repeat(50));

    const summaryParts: string[] = [];
    if (data.friendCount > 0) {
      summaryParts.push(`${data.friendCount} friend${data.friendCount === 1 ? '' : 's'}`);
    }
    if (data.rivalCount > 0) {
      summaryParts.push(`${data.rivalCount} rival${data.rivalCount === 1 ? '' : 's'}`);
    }
    const othersCount = data.totalRelationships - data.friendCount - data.rivalCount;
    if (othersCount > 0) {
      summaryParts.push(`${othersCount} other connection${othersCount === 1 ? '' : 's'}`);
    }

    lines.push(`Total connections: ${data.totalRelationships}`);
    lines.push(summaryParts.join(', '));

    if (data.sociability !== null) {
      const sociabilityDesc = data.sociability > 0.6 ? 'highly social' :
        data.sociability > 0.3 ? 'moderately social' : 'prefers solitude';
      lines.push(`Social tendency: ${sociabilityDesc}`);
    }
    lines.push('');

    // Friends section
    const friends = data.relationships.filter(r => r.strength > 50);
    if (friends.length > 0) {
      lines.push('FRIENDS');
      lines.push('-'.repeat(50));
      for (const rel of friends) {
        const desc = getRelationshipDescription(rel.strength, rel.type);
        lines.push(`  ${rel.targetName} - ${desc}`);
        lines.push(`    Bond strength: ${rel.strength}%`);
        lines.push(`    ${createProgressBar(Math.max(0, rel.strength), 20)}`);
        lines.push(`    Interactions: ${rel.interactionCount}, last: ${formatTimeSince(rel.lastInteraction)}`);
        if (rel.sharedMemories > 0) {
          lines.push(`    Shared memories: ${rel.sharedMemories}`);
        }
        lines.push('');
      }
    }

    // Acquaintances section
    const acquaintances = data.relationships.filter(r => r.strength >= -30 && r.strength <= 50);
    if (acquaintances.length > 0) {
      lines.push('ACQUAINTANCES');
      lines.push('-'.repeat(50));
      for (const rel of acquaintances.slice(0, 5)) {
        const desc = getRelationshipDescription(rel.strength, rel.type);
        lines.push(`  ${rel.targetName} - ${desc} (${rel.strength >= 0 ? '+' : ''}${rel.strength})`);
        lines.push(`    Last interaction: ${formatTimeSince(rel.lastInteraction)}`);
      }
      if (acquaintances.length > 5) {
        lines.push(`  ... and ${acquaintances.length - 5} more`);
      }
      lines.push('');
    }

    // Rivals section
    const rivals = data.relationships.filter(r => r.strength < -30);
    if (rivals.length > 0) {
      lines.push('RIVALS');
      lines.push('-'.repeat(50));
      for (const rel of rivals) {
        lines.push(`  ${rel.targetName} - tension level: ${Math.abs(rel.strength)}%`);
        lines.push(`    Last interaction: ${formatTimeSince(rel.lastInteraction)}`);
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: RelationshipsViewData,
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
      ctx.fillText('Click on an agent to view relationships', x + padding, currentY);
      return;
    }

    // Header
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`${data.agentName}'s Relationships`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Summary
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Friends: ${data.friendCount} | Rivals: ${data.rivalCount}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Top relationships
    const topRelationships = data.relationships.slice(0, 5);
    for (const rel of topRelationships) {
      // Name and type
      const color = rel.strength > 50 ? '#00FF00' :
        rel.strength > 0 ? '#90EE90' :
          rel.strength > -30 ? '#FFFF00' : '#FF6B6B';

      ctx.fillStyle = color;
      ctx.fillText(rel.targetName, x + padding, currentY);

      // Strength bar
      const barX = x + padding + 100;
      const barWidth = width - padding * 2 - 110;
      const barHeight = 8;

      ctx.fillStyle = theme.colors.border;
      ctx.fillRect(barX, currentY + 4, barWidth, barHeight);

      if (rel.strength >= 0) {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(barX + barWidth / 2, currentY + 4, (barWidth / 2) * (rel.strength / 100), barHeight);
      } else {
        ctx.fillStyle = '#FF6B6B';
        const negWidth = (barWidth / 2) * (Math.abs(rel.strength) / 100);
        ctx.fillRect(barX + barWidth / 2 - negWidth, currentY + 4, negWidth, barHeight);
      }

      currentY += lineHeight + 5;
    }
  },
};
