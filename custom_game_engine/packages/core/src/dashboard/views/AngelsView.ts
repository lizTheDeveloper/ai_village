/**
 * AngelsView - Divine servants management
 *
 * Shows angels created by the deity, their current tasks, and allows creating new ones.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import type { DeityComponent } from '../../components/DeityComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Angel information
 */
export interface AngelInfo {
  id: string;
  name: string;
  type: string;
  power: number;
  currentTask: string | null;
  location: { x: number; y: number } | null;
  loyaltystrength: number;
}

/**
 * Data returned by the Angels view
 */
export interface AngelsViewData extends ViewData {
  /** Deity name */
  deityName: string | null;
  /** Current belief */
  currentBelief: number;
  /** Angels created */
  angels: AngelInfo[];
  /** Belief cost to create new angel */
  creationCost: number;
  /** Can afford to create angel */
  canCreate: boolean;
  /** Angel types available */
  angelTypes: Array<{ id: string; name: string; cost: number; description: string }>;
}

/**
 * Angels View Definition
 */
export const AngelsView: DashboardView<AngelsViewData> = {
  id: 'angels',
  title: 'Divine Servants',
  category: 'divinity',
  keyboardShortcut: 'N',
  description: 'Manage celestial angels and servants',

  defaultSize: {
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 400,
  },

  getData(context: ViewContext): AngelsViewData {
    const { world } = context;

    const angelTypes = [
      {
        id: 'messenger',
        name: 'Messenger Angel',
        cost: 2000,
        description: 'Delivers visions and prophecies to mortals',
      },
      {
        id: 'guardian',
        name: 'Guardian Angel',
        cost: 3000,
        description: 'Protects believers from harm',
      },
      {
        id: 'warrior',
        name: 'Warrior Angel',
        cost: 5000,
        description: 'Smites enemies and defends the faithful',
      },
    ];

    const emptyData: AngelsViewData = {
      timestamp: Date.now(),
      available: true,
      deityName: null,
      currentBelief: 0,
      angels: [],
      creationCost: 2000,
      canCreate: false,
      angelTypes,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // Find player deity
      // PERFORMANCE: Use ECS query instead of scanning all entities
      let playerDeity: { id: string; component: DeityComponent } | null = null;
      const deityEntities = world.query().with(CT.Deity).executeEntities();
      for (const entity of deityEntities) {
        const deityComp = entity.components.get(CT.Deity) as DeityComponent | undefined;
        if (deityComp && deityComp.controller === 'player') {
          playerDeity = { id: entity.id, component: deityComp };
          break;
        }
      }

      if (!playerDeity) {
        emptyData.available = false;
        emptyData.unavailableReason = 'No player deity found';
        return emptyData;
      }

      const deityComp = playerDeity.component;
      const currentBelief = deityComp.belief?.currentBelief ?? 0;
      const creationCost = 2000;

      // Find all angels
      // PERFORMANCE: Use ECS query instead of scanning all entities
      const angels: AngelInfo[] = [];

      const angelEntities = world.query().with(CT.Angel).executeEntities();
      for (const entity of angelEntities) {
        const angelComp = entity.components.get(CT.Angel);

        const identityComp = entity.components.get(CT.Identity) as IdentityComponent | undefined;
        const posComp = entity.components.get(CT.Position) as PositionComponent | undefined;

        // AngelComponent doesn't exist yet, so we access it as a generic component
        // with expected fields (type, power, currentTask, loyalty)
        const angelData = angelComp as unknown as {
          type?: string;
          power?: number;
          currentTask?: string;
          loyalty?: number;
        };

        angels.push({
          id: entity.id,
          name: identityComp?.name ?? 'Unnamed Angel',
          type: angelData.type ?? 'messenger',
          power: angelData.power ?? 100,
          currentTask: angelData.currentTask ?? null,
          location: posComp
            ? { x: posComp.x, y: posComp.y }
            : null,
          loyaltystrength: angelData.loyalty ?? 1.0,
        });
      }

      return {
        timestamp: Date.now(),
        available: true,
        deityName: deityComp.identity.primaryName,
        currentBelief,
        angels,
        creationCost,
        canCreate: currentBelief >= creationCost,
        angelTypes,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: AngelsViewData): string {
    const lines: string[] = [
      'DIVINE SERVANTS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Angel data unavailable');
      return lines.join('\n');
    }

    // Header
    lines.push(`${data.deityName || 'Unnamed Deity'}'s Celestial Host`);
    lines.push(`Current Belief: ${Math.floor(data.currentBelief)}`);
    lines.push('');

    // Angels
    if (data.angels.length === 0) {
      lines.push('You have not yet created any divine servants.');
      lines.push('');
      lines.push('Angels cost significant belief but serve you faithfully,');
      lines.push('carrying out your will in the mortal realm.');
    } else {
      lines.push(`Active Angels: ${data.angels.length}`);
      lines.push('─'.repeat(50));
      lines.push('');

      for (const angel of data.angels) {
        lines.push(`${angel.name.toUpperCase()} (${angel.type})`);
        lines.push(`  Power: ${angel.power}`);
        if (angel.currentTask) {
          lines.push(`  Task: ${angel.currentTask}`);
        } else {
          lines.push(`  Status: Awaiting command`);
        }
        if (angel.location) {
          lines.push(`  Location: (${angel.location.x}, ${angel.location.y})`);
        }
        lines.push('');
      }
    }

    // Creation options
    lines.push('CREATE NEW ANGEL');
    lines.push('─'.repeat(50));

    if (data.canCreate) {
      lines.push('You have sufficient belief to create a new angel.');
      lines.push('');
      lines.push('Available types:');
      for (const type of data.angelTypes) {
        const canAfford = data.currentBelief >= type.cost ? '✓' : '✗';
        lines.push(`  ${canAfford} ${type.name} (${type.cost} belief)`);
        lines.push(`    ${type.description}`);
      }
    } else {
      const needed = data.creationCost - data.currentBelief;
      lines.push(`Need ${Math.ceil(needed)} more belief to create an angel.`);
      lines.push('');
      lines.push('Angels are powerful servants that can:');
      lines.push('  - Deliver divine messages to mortals');
      lines.push('  - Protect believers from harm');
      lines.push('  - Manifest your will in physical form');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: AngelsViewData,
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
      ctx.fillText(data.unavailableReason || 'No angel data', x + padding, currentY);
      return;
    }

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText('Divine Servants', x + padding, currentY);
    currentY += lineHeight + 5;

    // Belief
    ctx.fillStyle = theme.colors.textMuted;
    ctx.font = theme.fonts.normal;
    ctx.fillText(`Belief: ${Math.floor(data.currentBelief)}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Angels
    if (data.angels.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No angels created yet', x + padding, currentY);
      currentY += lineHeight;
      ctx.fillText(`Creation cost: ${data.creationCost} belief`, x + padding, currentY);
    } else {
      ctx.fillStyle = theme.colors.text;
      ctx.font = theme.fonts.bold;
      ctx.fillText(`Active Angels: ${data.angels.length}`, x + padding, currentY);
      currentY += lineHeight + 5;

      ctx.font = theme.fonts.normal;
      for (const angel of data.angels.slice(0, 5)) {
        ctx.fillStyle = '#DAA520';
        ctx.fillText(angel.name, x + padding, currentY);
        currentY += lineHeight;

        ctx.fillStyle = theme.colors.textMuted;
        const task = angel.currentTask || 'Awaiting orders';
        ctx.fillText(`  ${task}`, x + padding, currentY);
        currentY += lineHeight + 2;
      }
    }
  },
};
