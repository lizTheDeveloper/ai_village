/**
 * PopulationView - Population summary display
 *
 * Shows population statistics: total agents, alive/dead counts, births, etc.
 * Available in both player UI (canvas) and LLM dashboard (curl).
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
 * Data returned by the Population view
 */
export interface PopulationViewData extends ViewData {
  /** Total number of agents (alive) */
  alive: number;
  /** Number of dead agents this session */
  dead: number;
  /** Number of births this session */
  births: number;
  /** Average age of living agents */
  avgAge: number;
  /** Breakdown by behavior (what agents are doing) */
  behaviorBreakdown: Record<string, number>;
  /** Health statistics */
  healthStats: {
    healthy: number;
    struggling: number;
    critical: number;
  };
}

/**
 * Population View Definition
 */
export const PopulationView: DashboardView<PopulationViewData> = {
  id: 'population',
  title: 'Population Summary',
  category: 'info',
  keyboardShortcut: 'P',
  description: 'Shows population statistics and agent status',

  defaultSize: {
    width: 280,
    height: 250,
    minWidth: 220,
    minHeight: 180,
  },

  getData(context: ViewContext): PopulationViewData {
    const { world } = context;

    // Handle missing world
    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Game world not available',
        alive: 0,
        dead: 0,
        births: 0,
        avgAge: 0,
        behaviorBreakdown: {},
        healthStats: { healthy: 0, struggling: 0, critical: 0 },
      };
    }

    try {
      // Query all agents
      const agents = world.query()
        .with('agent')
        .executeEntities();

      let totalAge = 0;
      const behaviorBreakdown: Record<string, number> = {};
      let healthy = 0;
      let struggling = 0;
      let critical = 0;

      for (const entity of agents) {
        const agent = entity.components.get('agent');
        const needs = entity.components.get('needs');

        if (agent) {
          // Age tracking - use type assertion for component data
          const agentData = agent as unknown as { age?: number; currentBehavior?: string };
          totalAge += agentData.age || 0;

          // Behavior tracking
          const behavior = agentData.currentBehavior || 'idle';
          behaviorBreakdown[behavior] = (behaviorBreakdown[behavior] || 0) + 1;
        }

        // Health categorization
        if (needs) {
          const needsData = needs as unknown as { hunger?: number; energy?: number; health?: number };
          const minNeed = Math.min(
            needsData.hunger ?? 100,
            needsData.energy ?? 100,
            needsData.health ?? 100
          );
          if (minNeed >= 50) {
            healthy++;
          } else if (minNeed >= 20) {
            struggling++;
          } else {
            critical++;
          }
        } else {
          healthy++; // Default to healthy if no needs component
        }
      }

      const alive = agents.length;
      const avgAge = alive > 0 ? totalAge / alive : 0;

      // Note: dead/births would need to come from metrics/events
      // For now we just show what we can query live
      return {
        timestamp: Date.now(),
        available: true,
        alive,
        dead: 0, // Would need metrics integration
        births: 0, // Would need metrics integration
        avgAge,
        behaviorBreakdown,
        healthStats: { healthy, struggling, critical },
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        alive: 0,
        dead: 0,
        births: 0,
        avgAge: 0,
        behaviorBreakdown: {},
        healthStats: { healthy: 0, struggling: 0, critical: 0 },
      };
    }
  },

  textFormatter(data: PopulationViewData): string {
    const lines: string[] = [
      'POPULATION SUMMARY',
      '═'.repeat(40),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Data unavailable');
      return lines.join('\n');
    }

    // Population counts
    lines.push(`Living Agents: ${data.alive}`);
    if (data.dead > 0) {
      lines.push(`Deaths (session): ${data.dead}`);
    }
    if (data.births > 0) {
      lines.push(`Births (session): ${data.births}`);
    }
    lines.push(`Average Age: ${data.avgAge.toFixed(1)} years`);
    lines.push('');

    // Health breakdown
    lines.push('HEALTH STATUS:');
    const { healthy, struggling, critical } = data.healthStats;
    const total = healthy + struggling + critical;
    if (total > 0) {
      const healthyPct = Math.round((healthy / total) * 100);
      const strugglingPct = Math.round((struggling / total) * 100);
      const criticalPct = Math.round((critical / total) * 100);
      lines.push(`  Healthy:    ${healthy} (${healthyPct}%)`);
      lines.push(`  Struggling: ${struggling} (${strugglingPct}%)`);
      lines.push(`  Critical:   ${critical} (${criticalPct}%)`);
      lines.push(`  ${createProgressBar(healthyPct, 30)}`);
    } else {
      lines.push('  No agents');
    }
    lines.push('');

    // Behavior breakdown
    const behaviors = Object.entries(data.behaviorBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5

    if (behaviors.length > 0) {
      lines.push('CURRENT ACTIVITIES:');
      for (const [behavior, count] of behaviors) {
        lines.push(`  ${behavior}: ${count}`);
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: PopulationViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Data unavailable', x + padding, currentY);
      return;
    }

    // Population count (large)
    ctx.font = theme.fonts.bold;
    ctx.fillStyle = theme.colors.accent;
    ctx.fillText(`Population: ${data.alive}`, x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Avg Age: ${data.avgAge.toFixed(1)} yrs`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Health breakdown
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText('Health:', x + padding, currentY);
    currentY += lineHeight;

    const { healthy, struggling, critical } = data.healthStats;

    ctx.fillStyle = theme.colors.success;
    ctx.fillText(`  Healthy: ${healthy}`, x + padding, currentY);
    currentY += lineHeight;

    ctx.fillStyle = theme.colors.warning;
    ctx.fillText(`  Struggling: ${struggling}`, x + padding, currentY);
    currentY += lineHeight;

    ctx.fillStyle = theme.colors.error;
    ctx.fillText(`  Critical: ${critical}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Top activities
    const behaviors = Object.entries(data.behaviorBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (behaviors.length > 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Activities:', x + padding, currentY);
      currentY += lineHeight;

      ctx.fillStyle = theme.colors.text;
      for (const [behavior, count] of behaviors) {
        ctx.fillText(`  ${behavior}: ${count}`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
