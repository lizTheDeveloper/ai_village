/**
 * PrayersView - Divine prayer queue
 *
 * Shows pending prayers from believers that the deity can answer.
 * Each prayer displays the believer's name, urgency, content, and faith level.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * Prayer information
 */
export interface PrayerInfo {
  prayerId: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: number;
  urgency: 'routine' | 'earnest' | 'desperate';
  faith: number;
  timeAgo: string;
}

/**
 * Data returned by the Prayers view
 */
export interface PrayersViewData extends ViewData {
  /** Deity name */
  deityName: string | null;
  /** Current belief */
  currentBelief: number;
  /** Pending prayers */
  prayers: PrayerInfo[];
  /** Total prayers answered (lifetime) */
  totalAnswered: number;
}

const CT = { Deity: 'deity', Agent: 'agent', Spiritual: 'spiritual' };

/**
 * Prayers View Definition
 */
export const PrayersView: DashboardView<PrayersViewData> = {
  id: 'prayers',
  title: 'Prayers',
  category: 'divinity',
  keyboardShortcut: 'Y',
  description: 'View and respond to prayers from believers',

  defaultSize: {
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 400,
  },

  getData(context: ViewContext): PrayersViewData {
    const { world } = context;

    const emptyData: PrayersViewData = {
      timestamp: Date.now(),
      available: true,
      deityName: null,
      currentBelief: 0,
      prayers: [],
      totalAnswered: 0,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // Find player deity
      const playerDeity = findPlayerDeity(world);

      if (!playerDeity) {
        emptyData.available = false;
        emptyData.unavailableReason = 'No player deity found';
        return emptyData;
      }

      const deityComp = playerDeity.deityComponent;

      // Get prayers from queue
      const prayers: PrayerInfo[] = [];

      for (const prayer of deityComp.prayerQueue) {
        const agentEntity = world.getEntity(prayer.agentId);
        if (!agentEntity) continue;

        const agentComp = agentEntity.components.get(CT.Agent);
        const spiritualComp = agentEntity.components.get(CT.Spiritual);

        if (!agentComp || !spiritualComp) continue;

        const agentName = (agentComp as any).name ?? 'Unknown Believer';
        const faith = (spiritualComp as any).faith ?? 0;

        // Find the actual prayer content
        const spiritualPrayers = (spiritualComp as any).prayers ?? [];
        const matchingPrayer = spiritualPrayers.find(
          (p: any) => p.id === prayer.prayerId || p.timestamp === prayer.timestamp
        );

        const content = matchingPrayer?.content ?? 'Please hear my prayer...';

        // Determine urgency based on faith and content keywords
        const urgency = determineUrgency(content, faith);

        // Calculate time ago
        const ticksAgo = world.tick - prayer.timestamp;
        const secondsAgo = Math.floor(ticksAgo / 20); // Assuming 20 TPS
        const timeAgo = formatTimeAgo(secondsAgo);

        prayers.push({
          prayerId: prayer.prayerId,
          agentId: prayer.agentId,
          agentName,
          content,
          timestamp: prayer.timestamp,
          urgency,
          faith,
          timeAgo,
        });
      }

      // Sort by urgency (desperate first)
      prayers.sort((a, b) => {
        const urgencyOrder = { desperate: 0, earnest: 1, routine: 2 };
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        // Then by timestamp (oldest first)
        return a.timestamp - b.timestamp;
      });

      return {
        timestamp: Date.now(),
        available: true,
        deityName: deityComp.identity.primaryName,
        currentBelief: deityComp.belief.currentBelief,
        prayers,
        totalAnswered: 0, // TODO: Track this in deity component
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: PrayersViewData): string {
    const lines: string[] = [
      'PRAYERS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Prayer data unavailable');
      return lines.join('\n');
    }

    // Header
    lines.push(`${data.deityName || 'Unnamed Deity'}`);
    lines.push(`Current Belief: ${Math.floor(data.currentBelief)}`);
    lines.push('');

    // Prayers
    if (data.prayers.length === 0) {
      lines.push('No pending prayers.');
      lines.push('');
      lines.push('Your believers are content, or have lost faith.');
    } else {
      lines.push(`${data.prayers.length} prayer${data.prayers.length === 1 ? '' : 's'} awaiting your attention:`);
      lines.push('─'.repeat(50));
      lines.push('');

      for (const prayer of data.prayers.slice(0, 10)) {
        // Urgency indicator
        const urgencySymbol = {
          desperate: '◉ DESPERATE',
          earnest: '◎ EARNEST',
          routine: '○ ROUTINE',
        }[prayer.urgency];

        lines.push(`${urgencySymbol} - ${prayer.agentName} (${prayer.timeAgo})`);
        lines.push(`  Faith: ${Math.round(prayer.faith * 100)}%`);

        // Truncate long prayers
        const content = prayer.content.length > 80
          ? prayer.content.substring(0, 77) + '...'
          : prayer.content;

        lines.push(`  "${content}"`);
        lines.push('');
      }

      if (data.prayers.length > 10) {
        lines.push(`... and ${data.prayers.length - 10} more prayers`);
      }

      lines.push('');
      lines.push('─'.repeat(50));
      lines.push('To answer prayers, use the prayer UI or divine power system.');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: PrayersViewData,
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
      ctx.fillText(data.unavailableReason || 'No prayer data', x + padding, currentY);
      return;
    }

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.deityName || 'Prayers', x + padding, currentY);
    currentY += lineHeight + 5;

    // Belief
    ctx.fillStyle = theme.colors.textMuted;
    ctx.font = theme.fonts.normal;
    ctx.fillText(`Belief: ${Math.floor(data.currentBelief)}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Prayers
    if (data.prayers.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No pending prayers', x + padding, currentY);
    } else {
      for (const prayer of data.prayers.slice(0, 5)) {
        // Urgency
        const urgencyColor = {
          desperate: '#FF4444',
          earnest: '#FFAA44',
          routine: '#888888',
        }[prayer.urgency];

        ctx.fillStyle = urgencyColor;
        ctx.font = theme.fonts.bold;
        ctx.fillText(`${prayer.agentName} (${prayer.timeAgo})`, x + padding, currentY);
        currentY += lineHeight;

        // Content
        ctx.fillStyle = theme.colors.text;
        ctx.font = theme.fonts.normal;
        const maxWidth = width - padding * 2;

        // Word wrap
        const words = prayer.content.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, x + padding + 10, currentY);
            currentY += lineHeight;
            line = word + ' ';
          } else {
            line = testLine;
          }
        }
        if (line !== '') {
          ctx.fillText(line, x + padding + 10, currentY);
          currentY += lineHeight;
        }

        currentY += 5;
      }
    }
  },
};

/**
 * Helper: Find player deity
 */
function findPlayerDeity(world: any): { id: string; deityComponent: any } | null {
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
 * Helper: Determine prayer urgency
 */
function determineUrgency(content: string, faith: number): 'routine' | 'earnest' | 'desperate' {
  const lower = content.toLowerCase();

  // Desperate keywords
  if (
    lower.includes('please') ||
    lower.includes('help') ||
    lower.includes('dying') ||
    lower.includes('desperate') ||
    lower.includes('beg')
  ) {
    return 'desperate';
  }

  // Earnest if high faith
  if (faith > 0.7) {
    return 'earnest';
  }

  // Otherwise routine
  return 'routine';
}

/**
 * Helper: Format time ago
 */
function formatTimeAgo(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
