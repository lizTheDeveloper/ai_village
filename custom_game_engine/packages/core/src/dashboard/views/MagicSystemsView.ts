/**
 * MagicSystemsView - Magic paradigms overview
 *
 * Shows all registered magic paradigms and their states.
 * Accessibility-first: describes magical capabilities in plain language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { MagicSystemStateManager } from '../../magic/MagicSystemState.js';

/**
 * A magic paradigm entry
 */
interface ParadigmInfo {
  id: string;
  name: string;
  description: string;
  state: 'disabled' | 'enabled' | 'active';
  agentCount: number;
  playerProficiency: number;
  totalSpellsCast: number;
  totalMishaps: number;
  sources: string[];
}

/**
 * Data returned by the MagicSystems view
 */
export interface MagicSystemsViewData extends ViewData {
  /** All registered paradigms */
  paradigms: ParadigmInfo[];
  /** Number of active paradigms */
  activeCount: number;
  /** Number of enabled paradigms */
  enabledCount: number;
  /** Total paradigms */
  totalCount: number;
}

/**
 * MagicSystems View Definition
 */
export const MagicSystemsView: DashboardView<MagicSystemsViewData> = {
  id: 'magic-systems',
  title: 'Magic Systems',
  category: 'magic',
  keyboardShortcut: undefined, // Defer to existing panel shortcut
  description: 'Overview of all magic paradigms and their current states',

  defaultSize: {
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
  },

  getData(context: ViewContext): MagicSystemsViewData {
    const { world } = context;

    // Default empty state
    const emptyData: MagicSystemsViewData = {
      timestamp: Date.now(),
      available: true,
      paradigms: [],
      activeCount: 0,
      enabledCount: 0,
      totalCount: 0,
    };

    if (!world) {
      return emptyData;
    }

    try {
      const stateManager = MagicSystemStateManager.getInstance();
      const allParadigms = stateManager.getAllParadigms();
      const allStates = stateManager.getAllStates();

      const paradigms: ParadigmInfo[] = [];
      let activeCount = 0;
      let enabledCount = 0;

      for (const paradigm of allParadigms) {
        const runtimeState = allStates.get(paradigm.id);
        const state = runtimeState?.state ?? 'disabled';

        if (state === 'active') activeCount++;
        if (state === 'enabled' || state === 'active') enabledCount++;

        paradigms.push({
          id: paradigm.id,
          name: paradigm.name,
          description: paradigm.description,
          state,
          agentCount: runtimeState?.agentCount ?? 0,
          playerProficiency: runtimeState?.playerProficiency ?? 0,
          totalSpellsCast: runtimeState?.totalSpellsCast ?? 0,
          totalMishaps: runtimeState?.totalMishaps ?? 0,
          sources: paradigm.sources?.map(s => s.name) ?? [],
        });
      }

      // Sort: active first, then enabled, then disabled
      paradigms.sort((a, b) => {
        const stateOrder = { active: 0, enabled: 1, disabled: 2 };
        return stateOrder[a.state] - stateOrder[b.state];
      });

      return {
        timestamp: Date.now(),
        available: true,
        paradigms,
        activeCount,
        enabledCount,
        totalCount: paradigms.length,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: MagicSystemsViewData): string {
    const lines: string[] = [
      'MAGIC SYSTEMS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Magic system data unavailable');
      return lines.join('\n');
    }

    if (data.paradigms.length === 0) {
      lines.push('No magic paradigms have been registered in this world.');
      lines.push('');
      lines.push('Magic paradigms define different traditions and schools of magic,');
      lines.push('each with their own power sources, costs, and casting methods.');
      lines.push('');
      lines.push('As the world develops, magic systems may emerge through discovery,');
      lines.push('research, or divine inspiration.');
      return lines.join('\n');
    }

    // Summary
    lines.push(`This world has ${data.totalCount} magical traditions.`);
    lines.push(`Currently: ${data.activeCount} active, ${data.enabledCount} enabled, ${data.totalCount - data.enabledCount} disabled`);
    lines.push('');

    // Active paradigms first
    const active = data.paradigms.filter(p => p.state === 'active');
    if (active.length > 0) {
      lines.push('ACTIVE MAGIC SYSTEMS');
      lines.push('─'.repeat(50));
      lines.push('These magical traditions are currently in use:');
      lines.push('');

      for (const p of active) {
        lines.push(`  ${p.name.toUpperCase()}`);
        lines.push(`    ${p.description}`);
        lines.push(`    Practitioners: ${p.agentCount} agents`);
        lines.push(`    Your proficiency: ${p.playerProficiency}%`);
        if (p.totalSpellsCast > 0) {
          lines.push(`    Spells cast: ${p.totalSpellsCast}`);
        }
        if (p.totalMishaps > 0) {
          lines.push(`    ⚠️  Mishaps: ${p.totalMishaps}`);
        }
        lines.push(`    Power sources: ${p.sources.join(', ')}`);
        lines.push('');
      }
    }

    // Enabled but not active
    const enabled = data.paradigms.filter(p => p.state === 'enabled');
    if (enabled.length > 0) {
      lines.push('AVAILABLE MAGIC SYSTEMS');
      lines.push('─'.repeat(50));
      lines.push('These are enabled but not currently active:');
      lines.push('');

      for (const p of enabled) {
        lines.push(`  ${p.name}: ${p.description}`);
      }
      lines.push('');
    }

    // Disabled
    const disabled = data.paradigms.filter(p => p.state === 'disabled');
    if (disabled.length > 0) {
      lines.push('DISABLED MAGIC SYSTEMS');
      lines.push('─'.repeat(50));

      for (const p of disabled) {
        lines.push(`  ${p.name} (disabled)`);
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: MagicSystemsViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Header
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`Magic Systems (${data.activeCount}/${data.totalCount} active)`, x + padding, currentY);
    currentY += lineHeight + 10;

    if (data.paradigms.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.font = theme.fonts.normal;
      ctx.fillText('No magic paradigms registered', x + padding, currentY);
      return;
    }

    // List paradigms
    ctx.font = theme.fonts.normal;
    for (const p of data.paradigms.slice(0, 5)) {
      const stateColor = p.state === 'active' ? '#2196F3' :
        p.state === 'enabled' ? '#4CAF50' : theme.colors.textMuted;

      ctx.fillStyle = stateColor;
      ctx.fillText(`● ${p.name}`, x + padding, currentY);

      ctx.fillStyle = theme.colors.textMuted;
      const stateText = p.state.toUpperCase();
      ctx.fillText(` (${stateText})`, x + padding + 120, currentY);

      currentY += lineHeight;
    }
  },
};
