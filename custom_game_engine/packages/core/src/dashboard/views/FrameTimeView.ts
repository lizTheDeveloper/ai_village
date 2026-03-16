/**
 * FrameTimeView - Real-time frame-time telemetry for MUL-818
 *
 * Shows p95/p99 tick times, gate status (p95 < 16.7ms = PASS),
 * entity count, average and max tick times, and TPS.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
} from '../types.js';

/** Gate threshold for 60 fps (one frame budget in milliseconds) */
const P95_GATE_THRESHOLD_MS = 16.7;

/** Bar width for the ASCII fill indicator */
const BAR_WIDTH = 30;

/**
 * Data returned by the FrameTime view
 */
export interface FrameTimeViewData extends ViewData {
  /** Current ticks per second */
  tps: number;
  /** Exponential moving average tick time in milliseconds */
  avgTickTimeMs: number;
  /** Maximum observed tick time in milliseconds (decays over time) */
  maxTickTimeMs: number;
  /** 95th percentile tick time in milliseconds (rolling 200-sample window) */
  p95TickTimeMs: number;
  /** 99th percentile tick time in milliseconds (rolling 200-sample window) */
  p99TickTimeMs: number;
  /** Total entities in the world */
  entityCount: number;
  /** Total ticks executed */
  tickCount: number;
  /** Whether the p95 gate passes (p95 < 16.7ms) */
  gatePass: boolean;
}

/**
 * Render a simple ASCII bar showing how full the p95 budget is.
 * Returns a string like "[##########          ] 50.0%"
 */
function renderBar(value: number, threshold: number): string {
  const ratio = Math.min(value / threshold, 1);
  const filled = Math.round(ratio * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const bar = '#'.repeat(filled) + ' '.repeat(empty);
  const pct = ((value / threshold) * 100).toFixed(1);
  return `[${bar}] ${pct}%`;
}

/**
 * FrameTime View Definition
 */
export const FrameTimeView: DashboardView<FrameTimeViewData> = {
  id: 'frame-time',
  title: 'Frame Time Telemetry',
  category: 'dev',
  description: 'Real-time p95/p99 tick-time telemetry with 60fps gate (MUL-818)',

  defaultSize: {
    width: 420,
    height: 320,
    minWidth: 380,
    minHeight: 280,
  },

  getData(context: ViewContext): FrameTimeViewData {
    const defaultData: FrameTimeViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No world available',
      tps: 0,
      avgTickTimeMs: 0,
      maxTickTimeMs: 0,
      p95TickTimeMs: 0,
      p99TickTimeMs: 0,
      entityCount: 0,
      tickCount: 0,
      gatePass: false,
    };

    const { world } = context;
    if (!world) {
      return defaultData;
    }

    try {
      const stats = world.performanceStats;
      const p95 = stats.p95TickTimeMs ?? 0;
      return {
        timestamp: Date.now(),
        available: true,
        tps: stats.tps,
        avgTickTimeMs: stats.avgTickTimeMs,
        maxTickTimeMs: stats.maxTickTimeMs,
        p95TickTimeMs: p95,
        p99TickTimeMs: stats.p99TickTimeMs ?? 0,
        entityCount: stats.entityCount ?? 0,
        tickCount: stats.tickCount,
        gatePass: p95 < P95_GATE_THRESHOLD_MS,
      };
    } catch (error) {
      return {
        ...defaultData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: FrameTimeViewData): string {
    const lines: string[] = [
      'FRAME TIME TELEMETRY (MUL-818)',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason ?? 'Frame time data unavailable');
      return lines.join('\n');
    }

    // Gate status
    const gateLabel = data.gatePass ? 'PASS' : 'FAIL';
    const gateDetail = `p95 ${data.p95TickTimeMs.toFixed(2)}ms vs ${P95_GATE_THRESHOLD_MS}ms threshold`;
    lines.push(`GATE STATUS: ${gateLabel}  (${gateDetail})`);
    lines.push('');

    // p95 fill bar
    lines.push(`p95 budget usage:`);
    lines.push(`  ${renderBar(data.p95TickTimeMs, P95_GATE_THRESHOLD_MS)}`);
    lines.push('');

    // Percentile breakdown
    lines.push('PERCENTILES');
    lines.push('-'.repeat(50));
    lines.push(`  p95 tick time : ${data.p95TickTimeMs.toFixed(3)} ms`);
    lines.push(`  p99 tick time : ${data.p99TickTimeMs.toFixed(3)} ms`);
    lines.push('');

    // General stats
    lines.push('TICK STATS');
    lines.push('-'.repeat(50));
    lines.push(`  TPS           : ${data.tps.toFixed(2)}`);
    lines.push(`  Avg tick time : ${data.avgTickTimeMs.toFixed(3)} ms`);
    lines.push(`  Max tick time : ${data.maxTickTimeMs.toFixed(3)} ms`);
    lines.push(`  Tick count    : ${data.tickCount}`);
    lines.push('');

    // Entity count
    lines.push('ENTITIES');
    lines.push('-'.repeat(50));
    lines.push(`  Entity count  : ${data.entityCount}`);
    lines.push('');

    // Thresholds reference
    lines.push('THRESHOLDS');
    lines.push('-'.repeat(50));
    lines.push(`  p95 gate      : < ${P95_GATE_THRESHOLD_MS} ms  (60 fps frame budget)`);

    return lines.join('\n');
  },
};
