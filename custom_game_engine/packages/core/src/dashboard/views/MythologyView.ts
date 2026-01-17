/**
 * MythologyView - Emergent stories about the deity
 *
 * Shows myths, legends, and stories that mortals tell about the deity.
 * These emerge from the deity's actions and are interpreted by believers.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { DeityComponent } from '../../components/DeityComponent.js';

/**
 * Myth/story information
 */
export interface MythInfo {
  id: string;
  title: string;
  category: 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable';
  content: string;
  believerCount: number;
  variants: number;
  createdAt: number;
}

/**
 * Data returned by the Mythology view
 */
export interface MythologyViewData extends ViewData {
  /** Deity name */
  deityName: string | null;
  /** Origin story */
  originStory: string | null;
  /** Collected myths */
  myths: MythInfo[];
  /** Common epithets */
  epithets: string[];
  /** Sacred symbols */
  symbols: string[];
}

const CT = { Deity: 'deity' };

/**
 * Mythology View Definition
 */
export const MythologyView: DashboardView<MythologyViewData> = {
  id: 'mythology',
  title: 'Divine Mythology',
  category: 'divinity',
  keyboardShortcut: 'L',
  description: 'Stories and legends told about the deity',

  defaultSize: {
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 400,
  },

  getData(context: ViewContext): MythologyViewData {
    const { world } = context;

    const emptyData: MythologyViewData = {
      timestamp: Date.now(),
      available: true,
      deityName: null,
      originStory: null,
      myths: [],
      epithets: [],
      symbols: [],
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
          const deityComp = entity.components.get(CT.Deity);
          if (deityComp instanceof DeityComponent && deityComp.controller === 'player') {
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
      const identity = deityComp.identity ?? { primaryName: 'Unknown Deity' };

      const believerCount = deityComp.believers?.size ?? 0;
      const originStory = `${identity.primaryName} emerged from the collective belief of ${believerCount} mortals, drawn together by their shared need for divine guidance.`;

      // Read myths from deity component
      const myths: MythInfo[] = deityComp.myths ?? [];

      return {
        timestamp: Date.now(),
        available: true,
        deityName: identity.primaryName,
        originStory,
        myths,
        epithets: identity.epithets,
        symbols: identity.symbols,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: MythologyViewData): string {
    const lines: string[] = [
      'DIVINE MYTHOLOGY',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Mythology unavailable');
      return lines.join('\n');
    }

    lines.push(`The Stories of ${data.deityName || 'the Nameless'}`);
    lines.push('');

    // Origin
    if (data.originStory) {
      lines.push('ORIGIN');
      lines.push('─'.repeat(50));
      lines.push(data.originStory);
      lines.push('');
    }

    // Epithets
    if (data.epithets.length > 0) {
      lines.push('EPITHETS');
      lines.push('─'.repeat(50));
      lines.push('Mortals call you:');
      for (const epithet of data.epithets) {
        lines.push(`  • ${epithet}`);
      }
      lines.push('');
    }

    // Symbols
    if (data.symbols.length > 0) {
      lines.push('SACRED SYMBOLS');
      lines.push('─'.repeat(50));
      lines.push(`Your presence is marked by: ${data.symbols.join(', ')}`);
      lines.push('');
    }

    // Myths
    if (data.myths.length === 0) {
      lines.push('STORIES & LEGENDS');
      lines.push('─'.repeat(50));
      lines.push('No myths have emerged yet.');
      lines.push('');
      lines.push('As you perform miracles and answer prayers,');
      lines.push('mortals will create stories about your deeds.');
      lines.push('These stories will spread among believers,');
      lines.push('evolving and changing with each retelling.');
    } else {
      lines.push('COLLECTED MYTHS');
      lines.push('─'.repeat(50));

      for (const myth of data.myths) {
        const categoryLabel = myth.category.toUpperCase();
        lines.push(`[${categoryLabel}] ${myth.title}`);
        lines.push(`  Believed by ${myth.believerCount} mortals`);
        if (myth.variants > 1) {
          lines.push(`  ${myth.variants} different versions exist`);
        }
        lines.push('');
        // Truncate long content
        const content = myth.content.length > 200
          ? myth.content.substring(0, 197) + '...'
          : myth.content;
        lines.push(`  ${content}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: MythologyViewData,
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
      ctx.fillText(data.unavailableReason || 'No mythology data', x + padding, currentY);
      return;
    }

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText(`Mythology of ${data.deityName || 'Unknown'}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Epithets
    if (data.epithets.length > 0) {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.bold;
      ctx.fillText('Known as:', x + padding, currentY);
      currentY += lineHeight;

      ctx.fillStyle = theme.colors.text;
      ctx.font = theme.fonts.normal;
      for (const epithet of data.epithets.slice(0, 3)) {
        ctx.fillText(`  ${epithet}`, x + padding, currentY);
        currentY += lineHeight;
      }
      currentY += 5;
    }

    // Myths count
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`${data.myths.length} myths collected`, x + padding, currentY);
  },
};
