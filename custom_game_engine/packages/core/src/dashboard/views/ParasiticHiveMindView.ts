/**
 * ParasiticHiveMindView - Displays hive mind colonization status
 *
 * Shows collective statistics, colonized hosts, resistance status,
 * and hive pressure metrics. Available in both player UI and LLM dashboard.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';
import type { EntityImpl } from '../../ecs/Entity.js';
import type { ParasiticColonizationComponent } from '../../reproduction/parasitic/ParasiticColonizationComponent.js';
import type { CollectiveMindComponent } from '../../reproduction/parasitic/CollectiveMindComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/**
 * Data for an individual colonized host
 */
export interface ColonizedHostData {
  entityId: string;
  name: string;
  controlLevel: string;
  integrationProgress: number;
  isResisting: boolean;
  resistanceStamina: number;
  hivePressure: number;
  nearbyColonizedCount: number;
}

/**
 * Data for a collective hive mind
 */
export interface CollectiveData {
  collectiveId: string;
  strategy: string;
  hostCount: number;
  breedingPairs: number;
  expansionTargets: number;
  lineages: number;
}

/**
 * Data returned by the ParasiticHiveMind view
 */
export interface ParasiticHiveMindViewData extends ViewData {
  /** Total number of collectives in the world */
  collectiveCount: number;
  /** Total number of colonized hosts */
  colonizedCount: number;
  /** Number of hosts actively resisting */
  resistingCount: number;
  /** Number of uncolonized potential hosts */
  potentialHostCount: number;
  /** Breakdown by control level */
  controlLevelBreakdown: Record<string, number>;
  /** Average hive pressure across all colonized hosts */
  avgHivePressure: number;
  /** Details per collective */
  collectives: CollectiveData[];
  /** Details of hosts (limited for performance) */
  hosts: ColonizedHostData[];
}

/**
 * Parasitic Hive Mind View Definition
 */
export const ParasiticHiveMindView: DashboardView<ParasiticHiveMindViewData> = {
  id: 'parasitic-hivemind',
  title: 'Parasitic Hive Minds',
  category: 'social',
  keyboardShortcut: 'H',
  description: 'Shows parasitic collective status, colonized hosts, and resistance',

  defaultSize: {
    width: 320,
    height: 350,
    minWidth: 280,
    minHeight: 250,
  },

  getData(context: ViewContext): ParasiticHiveMindViewData {
    const { world } = context;

    // Handle missing world
    if (!world || typeof world.query !== 'function') {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: 'Game world not available',
        collectiveCount: 0,
        colonizedCount: 0,
        resistingCount: 0,
        potentialHostCount: 0,
        controlLevelBreakdown: {},
        avgHivePressure: 0,
        collectives: [],
        hosts: [],
      };
    }

    try {
      const collectives: CollectiveData[] = [];
      const hosts: ColonizedHostData[] = [];
      const controlLevelBreakdown: Record<string, number> = {};
      let colonizedCount = 0;
      let resistingCount = 0;
      let potentialHostCount = 0;
      let totalHivePressure = 0;

      // Find all entities with collective mind components
      for (const entity of world.query().with(CT.CollectiveMind).executeEntities()) {
        const impl = entity as EntityImpl;
        const collective = impl.getComponent<CollectiveMindComponent>(CT.CollectiveMind);
        if (collective) {
          collectives.push({
            collectiveId: collective.collectiveId,
            strategy: collective.currentStrategy,
            hostCount: collective.hosts.size,
            breedingPairs: collective.breedingAssignments.length,
            expansionTargets: collective.expansionTargets.length,
            lineages: collective.lineages.size,
          });
        }
      }

      // Find all entities with parasitic colonization
      for (const entity of world.query().with(CT.ParasiticColonization).executeEntities()) {
        const impl = entity as EntityImpl;
        const colonization = impl.getComponent<ParasiticColonizationComponent>(CT.ParasiticColonization);
        if (colonization) {
          if (colonization.isColonized) {
            colonizedCount++;

            // Track control levels
            const level = colonization.controlLevel;
            controlLevelBreakdown[level] = (controlLevelBreakdown[level] || 0) + 1;

            // Track resistance
            if (colonization.isResisting) {
              resistingCount++;
            }

            // Track hive pressure
            totalHivePressure += colonization.hivePressure;

            // Add to hosts list (limit to 10 for performance)
            if (hosts.length < 10) {
              const agent = impl.components.get(CT.Agent) as { name?: string } | undefined;
              hosts.push({
                entityId: entity.id,
                name: agent?.name ?? `Entity-${entity.id.slice(0, 6)}`,
                controlLevel: colonization.controlLevel,
                integrationProgress: colonization.integration?.progress ?? 0,
                isResisting: colonization.isResisting,
                resistanceStamina: colonization.resistanceStamina,
                hivePressure: colonization.hivePressure,
                nearbyColonizedCount: colonization.nearbyColonizedCount,
              });
            }
          } else {
            // Potential host (has component but not colonized)
            potentialHostCount++;
          }
        }
      }

      const avgHivePressure = colonizedCount > 0 ? totalHivePressure / colonizedCount : 0;

      return {
        timestamp: Date.now(),
        available: true,
        collectiveCount: collectives.length,
        colonizedCount,
        resistingCount,
        potentialHostCount,
        controlLevelBreakdown,
        avgHivePressure,
        collectives,
        hosts,
      };
    } catch (error) {
      return {
        timestamp: Date.now(),
        available: false,
        unavailableReason: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        collectiveCount: 0,
        colonizedCount: 0,
        resistingCount: 0,
        potentialHostCount: 0,
        controlLevelBreakdown: {},
        avgHivePressure: 0,
        collectives: [],
        hosts: [],
      };
    }
  },

  textFormatter(data: ParasiticHiveMindViewData): string {
    const lines: string[] = [
      'PARASITIC HIVE MINDS',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Data unavailable');
      return lines.join('\n');
    }

    // Overview
    lines.push('OVERVIEW:');
    lines.push(`  Collectives: ${data.collectiveCount}`);
    lines.push(`  Colonized Hosts: ${data.colonizedCount}`);
    lines.push(`  Actively Resisting: ${data.resistingCount}`);
    lines.push(`  Potential Hosts: ${data.potentialHostCount}`);
    lines.push(`  Avg Hive Pressure: ${(data.avgHivePressure * 100).toFixed(0)}%`);
    lines.push('');

    // Control level breakdown
    if (Object.keys(data.controlLevelBreakdown).length > 0) {
      lines.push('CONTROL LEVELS:');
      for (const [level, count] of Object.entries(data.controlLevelBreakdown)) {
        const icon = level === 'integrated' ? '🔒' :
                     level === 'full' ? '⚠️' :
                     level === 'partial' ? '⚡' :
                     level === 'contested' ? '💢' : '○';
        lines.push(`  ${icon} ${level}: ${count}`);
      }
      lines.push('');
    }

    // Collectives
    if (data.collectives.length > 0) {
      lines.push('COLLECTIVES:');
      for (const c of data.collectives) {
        lines.push(`  [${c.collectiveId}]`);
        lines.push(`    Strategy: ${c.strategy}`);
        lines.push(`    Hosts: ${c.hostCount} | Lineages: ${c.lineages}`);
        lines.push(`    Breeding Pairs: ${c.breedingPairs} | Targets: ${c.expansionTargets}`);
      }
      lines.push('');
    }

    // Hosts (top 10)
    if (data.hosts.length > 0) {
      lines.push('COLONIZED HOSTS:');
      for (const h of data.hosts) {
        const resistIcon = h.isResisting ? ' [RESISTING]' : '';
        const pressureBar = createProgressBar(h.hivePressure * 100, 10);
        lines.push(`  ${h.name}${resistIcon}`);
        lines.push(`    Control: ${h.controlLevel} | Integration: ${(h.integrationProgress * 100).toFixed(0)}%`);
        lines.push(`    Stamina: ${h.resistanceStamina.toFixed(0)} | Pressure: ${pressureBar} (${h.nearbyColonizedCount} nearby)`);
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: ParasiticHiveMindViewData,
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

    // Title with count
    ctx.font = theme.fonts.bold;
    ctx.fillStyle = theme.colors.error; // Red for ominous hive mind vibes
    ctx.fillText(`Hive Minds: ${data.collectiveCount}`, x + padding, currentY);
    currentY += lineHeight + 5;

    // Stats
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Colonized: ${data.colonizedCount}`, x + padding, currentY);
    currentY += lineHeight;

    ctx.fillStyle = data.resistingCount > 0 ? theme.colors.warning : theme.colors.textMuted;
    ctx.fillText(`Resisting: ${data.resistingCount}`, x + padding, currentY);
    currentY += lineHeight;

    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText(`Potential Hosts: ${data.potentialHostCount}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Hive pressure gauge
    ctx.fillStyle = theme.colors.textMuted;
    ctx.fillText('Avg Hive Pressure:', x + padding, currentY);
    currentY += lineHeight;

    const barWidth = 100;
    const barHeight = 12;
    const pressurePct = data.avgHivePressure;

    // Background
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(x + padding, currentY, barWidth, barHeight);

    // Pressure fill (red gradient effect)
    const gradient = ctx.createLinearGradient(x + padding, 0, x + padding + barWidth, 0);
    gradient.addColorStop(0, '#4a90a4');
    gradient.addColorStop(0.5, '#d4a017');
    gradient.addColorStop(1, '#c41e3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(x + padding, currentY, barWidth * pressurePct, barHeight);

    // Border
    ctx.strokeStyle = theme.colors.border;
    ctx.strokeRect(x + padding, currentY, barWidth, barHeight);

    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`${(pressurePct * 100).toFixed(0)}%`, x + padding + barWidth + 5, currentY);
    currentY += lineHeight + 15;

    // Control level breakdown
    if (Object.keys(data.controlLevelBreakdown).length > 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Control Levels:', x + padding, currentY);
      currentY += lineHeight;

      const levelColors: Record<string, string> = {
        none: theme.colors.success,
        contested: theme.colors.warning,
        partial: '#d4a017',
        full: theme.colors.error,
        integrated: '#8b0000',
        symbiotic: theme.colors.accent,
      };

      for (const [level, count] of Object.entries(data.controlLevelBreakdown)) {
        ctx.fillStyle = levelColors[level] ?? theme.colors.text;
        ctx.fillText(`  ${level}: ${count}`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
