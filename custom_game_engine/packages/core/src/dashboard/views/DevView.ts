/**
 * DevView - Developer tools and debugging interface
 *
 * Shows debugging tools for magic systems, divinity, events, and more.
 * Accessibility-first: describes dev tools in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * Magic paradigm debug info
 */
interface ParadigmDebugInfo {
  id: string;
  name: string;
  state: 'disabled' | 'enabled' | 'active';
  agentCount: number;
  totalCasts: number;
  totalMishaps: number;
}

/**
 * System performance info
 */
interface SystemPerformanceInfo {
  name: string;
  lastUpdateMs: number;
  avgUpdateMs: number;
  entityCount: number;
}

/**
 * Recent event info
 */
interface RecentEvent {
  type: string;
  timestamp: number;
  data: string;
}

/**
 * Data returned by the Dev view
 */
export interface DevViewData extends ViewData {
  /** Current FPS */
  fps: number;
  /** Entity count */
  totalEntities: number;
  /** Magic paradigms debug info */
  paradigms: ParadigmDebugInfo[];
  /** System performance */
  systems: SystemPerformanceInfo[];
  /** Recent events */
  recentEvents: RecentEvent[];
  /** Memory usage (if available) */
  memoryMB: number | null;
  /** World tick count */
  tickCount: number;
  /** Game time */
  gameTime: {
    day: number;
    hour: number;
    minute: number;
  };
  /** Debug flags */
  debugFlags: {
    showColliders: boolean;
    showPaths: boolean;
    showPerception: boolean;
    logLLMCalls: boolean;
    pauseOnError: boolean;
  };
}

/**
 * Dev View Definition
 */
export const DevView: DashboardView<DevViewData> = {
  id: 'dev',
  title: 'Developer Tools',
  category: 'dev',
  keyboardShortcut: 'F12',
  description: 'Debugging and development tools',

  defaultSize: {
    width: 450,
    height: 650,
    minWidth: 400,
    minHeight: 550,
  },

  getData(context: ViewContext): DevViewData {
    const { world } = context;

    const defaultData: DevViewData = {
      timestamp: Date.now(),
      available: true,
      fps: 0,
      totalEntities: 0,
      paradigms: [],
      systems: [],
      recentEvents: [],
      memoryMB: null,
      tickCount: 0,
      gameTime: { day: 1, hour: 6, minute: 0 },
      debugFlags: {
        showColliders: false,
        showPaths: false,
        showPerception: false,
        logLLMCalls: false,
        pauseOnError: false,
      },
    };

    if (!world) {
      defaultData.available = false;
      defaultData.unavailableReason = 'No world available';
      return defaultData;
    }

    try {
      // In real implementation, gather debug data from world and systems
      return defaultData;
    } catch (error) {
      return {
        ...defaultData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: DevViewData): string {
    const lines: string[] = [
      'DEVELOPER TOOLS',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Dev tools unavailable');
      return lines.join('\n');
    }

    // Performance overview
    lines.push('PERFORMANCE');
    lines.push('-'.repeat(50));
    lines.push(`FPS: ${data.fps.toFixed(1)}`);
    lines.push(`Total Entities: ${data.totalEntities}`);
    lines.push(`Tick Count: ${data.tickCount}`);
    if (data.memoryMB !== null) {
      lines.push(`Memory: ${data.memoryMB.toFixed(1)} MB`);
    }
    lines.push('');

    // Game time
    lines.push('GAME TIME');
    lines.push('-'.repeat(50));
    const hourStr = String(data.gameTime.hour).padStart(2, '0');
    const minStr = String(data.gameTime.minute).padStart(2, '0');
    lines.push(`Day ${data.gameTime.day}, ${hourStr}:${minStr}`);
    lines.push('');

    // System performance
    if (data.systems.length > 0) {
      lines.push('SYSTEM PERFORMANCE');
      lines.push('-'.repeat(50));
      lines.push('System                      Last(ms)  Avg(ms)  Entities');

      for (const sys of data.systems) {
        const name = sys.name.padEnd(26);
        const last = sys.lastUpdateMs.toFixed(2).padStart(8);
        const avg = sys.avgUpdateMs.toFixed(2).padStart(8);
        const count = String(sys.entityCount).padStart(9);
        lines.push(`${name}${last}${avg}${count}`);
      }
      lines.push('');
    }

    // Magic paradigms
    if (data.paradigms.length > 0) {
      lines.push('MAGIC PARADIGMS');
      lines.push('-'.repeat(50));

      for (const p of data.paradigms) {
        const stateIcon = p.state === 'active' ? '[ACTIVE]' :
          p.state === 'enabled' ? '[ON]' : '[OFF]';
        lines.push(`  ${p.name} ${stateIcon}`);
        lines.push(`    Agents: ${p.agentCount} | Casts: ${p.totalCasts} | Mishaps: ${p.totalMishaps}`);
      }
      lines.push('');
    }

    // Recent events
    if (data.recentEvents.length > 0) {
      lines.push('RECENT EVENTS');
      lines.push('-'.repeat(50));

      for (const event of data.recentEvents.slice(0, 10)) {
        const timeAgo = Math.floor((Date.now() - event.timestamp) / 1000);
        lines.push(`  [${timeAgo}s ago] ${event.type}`);
        if (event.data) {
          lines.push(`    ${event.data.substring(0, 60)}${event.data.length > 60 ? '...' : ''}`);
        }
      }
      lines.push('');
    }

    // Debug flags
    lines.push('DEBUG FLAGS');
    lines.push('-'.repeat(50));
    lines.push(`Show Colliders: ${data.debugFlags.showColliders ? 'ON' : 'OFF'}`);
    lines.push(`Show Paths: ${data.debugFlags.showPaths ? 'ON' : 'OFF'}`);
    lines.push(`Show Perception: ${data.debugFlags.showPerception ? 'ON' : 'OFF'}`);
    lines.push(`Log LLM Calls: ${data.debugFlags.logLLMCalls ? 'ON' : 'OFF'}`);
    lines.push(`Pause on Error: ${data.debugFlags.pauseOnError ? 'ON' : 'OFF'}`);
    lines.push('');

    // Commands
    lines.push('DEVELOPER COMMANDS');
    lines.push('-'.repeat(50));
    lines.push('Available via console or keyboard shortcuts:');
    lines.push('  F1 - Toggle collider visualization');
    lines.push('  F2 - Toggle path visualization');
    lines.push('  F3 - Toggle perception ranges');
    lines.push('  F4 - Spawn test entity');
    lines.push('  F5 - Force garbage collection');
    lines.push('  F6 - Export world state');
    lines.push('  F7 - Import world state');
    lines.push('  F8 - Toggle slow motion');
    lines.push('  F9 - Step single frame');
    lines.push('  F10 - Reset world');
    lines.push('  F11 - Toggle LLM logging');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: DevViewData,
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
      ctx.fillText(data.unavailableReason || 'Dev tools unavailable', x + padding, currentY);
      return;
    }

    // FPS indicator
    const fpsColor = data.fps >= 55 ? '#00FF00' :
      data.fps >= 30 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = fpsColor;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`FPS: ${data.fps.toFixed(0)}`, x + padding, currentY);

    // Entity count
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Entities: ${data.totalEntities}`, x + padding + 80, currentY);
    currentY += lineHeight + 5;

    // Memory
    if (data.memoryMB !== null) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.font = theme.fonts.normal;
      ctx.fillText(`Memory: ${data.memoryMB.toFixed(1)} MB`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Game time
    const hourStr = String(data.gameTime.hour).padStart(2, '0');
    const minStr = String(data.gameTime.minute).padStart(2, '0');
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`Day ${data.gameTime.day} ${hourStr}:${minStr}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // System performance (top 5 slowest)
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('System Performance', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const sortedSystems = [...data.systems].sort((a, b) => b.avgUpdateMs - a.avgUpdateMs);
    for (const sys of sortedSystems.slice(0, 5)) {
      const color = sys.avgUpdateMs > 16 ? '#FF6B6B' :
        sys.avgUpdateMs > 8 ? '#FFFF00' : '#90EE90';
      ctx.fillStyle = color;
      ctx.fillText(`${sys.name}: ${sys.avgUpdateMs.toFixed(2)}ms`, x + padding, currentY);
      currentY += lineHeight;
    }

    currentY += 10;

    // Debug flags
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Debug Flags', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const flags = [
      { label: 'Colliders', value: data.debugFlags.showColliders },
      { label: 'Paths', value: data.debugFlags.showPaths },
      { label: 'Perception', value: data.debugFlags.showPerception },
      { label: 'LLM Log', value: data.debugFlags.logLLMCalls },
    ];

    let flagX = x + padding;
    for (const flag of flags) {
      ctx.fillStyle = flag.value ? '#00FF00' : '#666666';
      ctx.fillText(`[${flag.value ? 'X' : ' '}] ${flag.label}`, flagX, currentY);
      flagX += 90;
    }
    currentY += lineHeight + 10;

    // Recent events
    if (data.recentEvents.length > 0) {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.bold;
      ctx.fillText('Recent Events', x + padding, currentY);
      currentY += lineHeight + 5;

      ctx.font = theme.fonts.normal;
      for (const event of data.recentEvents.slice(0, 3)) {
        ctx.fillStyle = theme.colors.textMuted;
        ctx.fillText(`${event.type}`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
