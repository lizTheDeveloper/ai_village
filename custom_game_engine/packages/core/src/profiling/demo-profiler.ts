/**
 * Demo script for performance profiling
 *
 * This script shows how to use the SystemProfiler to profile a live game session.
 *
 * Usage in browser console:
 * ```javascript
 * // Enable profiling
 * game.gameLoop.enableProfiling();
 *
 * // Let it run for 100+ ticks (5+ seconds at 20 TPS)
 * await new Promise(resolve => setTimeout(resolve, 10000));
 *
 * // Get report
 * const report = game.gameLoop.getProfilingReport();
 * console.log(report.summary);
 * console.table(report.systems);
 *
 * // Export as markdown
 * const md = game.gameLoop.exportProfilingMarkdown();
 * console.log(md);
 *
 * // Copy to clipboard
 * navigator.clipboard.writeText(md);
 * ```
 *
 * Automated profiling session (copy-paste into console):
 */

import type { SystemMetrics, HotspotDetection } from './SystemProfiler.js';

export async function runProfilingSession(): Promise<void> {
  console.log('[Profiler] Starting profiling session...');

  // Access game loop from window.game
  const game = (window as any).game;
  if (!game || !game.gameLoop) {
    console.error('[Profiler] window.game.gameLoop not found. Make sure game is loaded.');
    return;
  }

  const gameLoop = game.gameLoop;

  // Enable profiling
  gameLoop.enableProfiling();
  console.log('[Profiler] Profiling enabled. Running for 100 ticks...');

  // Wait for 100 ticks (~5 seconds at 20 TPS)
  await new Promise((resolve) => setTimeout(resolve, 6000));

  // Get report
  const report = gameLoop.getProfilingReport();

  console.log('\n' + '='.repeat(80));
  console.log('[Profiler] Performance Report');
  console.log('='.repeat(80));
  console.log(report.summary);
  console.log('');
  console.log(`Tick Range: ${report.startTick} - ${report.endTick} (${report.ticksCovered} ticks)`);
  console.log(`Total Tick Time: ${report.totalTickTimeMs.toFixed(1)}ms`);
  console.log(`Target: ${report.targetTickTimeMs}ms for ${20} TPS`);
  console.log(`Actual TPS: ${report.actualTPS.toFixed(1)}`);
  console.log(`Budget Usage: ${report.budgetUsagePercent.toFixed(1)}%`);
  console.log('');

  // Show top 10 systems
  console.log('Top 10 Slowest Systems:');
  console.log('-'.repeat(80));
  const top10 = report.systems.slice(0, 10);
  console.table(
    top10.map((s: SystemMetrics) => ({
      System: s.systemName,
      'Avg(ms)': s.avgExecutionTimeMs.toFixed(2),
      'Max(ms)': s.maxExecutionTimeMs.toFixed(2),
      'P99(ms)': s.p99ExecutionTimeMs.toFixed(2),
      'CPU%': s.avgCpuPercent.toFixed(1),
      Entities: s.avgEntityCount.toFixed(0),
      Status:
        s.maxExecutionTimeMs > 10
          ? 'CRITICAL'
          : s.maxExecutionTimeMs > 5
            ? 'SLOW'
            : 'OK',
    }))
  );

  // Show hotspots
  if (report.hotspots.length > 0) {
    console.log('');
    console.log('Hotspots Detected:');
    console.log('-'.repeat(80));

    const critical = report.hotspots.filter((h: HotspotDetection) => h.severity === 'critical');
    const warnings = report.hotspots.filter((h: HotspotDetection) => h.severity === 'warning');
    const info = report.hotspots.filter((h: HotspotDetection) => h.severity === 'info');

    if (critical.length > 0) {
      console.log('\nCRITICAL ISSUES:');
      critical.forEach((h: HotspotDetection) => {
        console.log(`  ${h.systemName}: ${h.issue}`);
        console.log(`    Measurement: ${h.measurement}`);
        console.log(`    Suggestion: ${h.suggestion}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\nWARNINGS:');
      warnings.forEach((h: HotspotDetection) => {
        console.log(`  ${h.systemName}: ${h.issue}`);
        console.log(`    Measurement: ${h.measurement}`);
        console.log(`    Suggestion: ${h.suggestion}`);
      });
    }

    if (info.length > 0 && (critical.length > 0 || warnings.length > 0)) {
      console.log(`\nINFO: ${info.length} optimization opportunities (use full report for details)`);
    }
  } else {
    console.log('\nNo hotspots detected - all systems within budget!');
  }

  // Export markdown
  const markdown = gameLoop.exportProfilingMarkdown();
  console.log('');
  console.log('='.repeat(80));
  console.log('[Profiler] Full markdown report copied to clipboard!');
  console.log('[Profiler] Paste into a .md file or documentation.');
  console.log('='.repeat(80));

  try {
    await navigator.clipboard.writeText(markdown);
    console.log('✅ Markdown copied to clipboard successfully');
  } catch (err) {
    console.warn('⚠️ Could not copy to clipboard, printing markdown instead:');
    console.log('\n' + markdown);
  }

  // Disable profiling to reduce overhead
  gameLoop.disableProfiling();
  console.log('[Profiler] Profiling disabled.');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  (window as any).runProfilingSession = runProfilingSession;
  console.log('[Profiler] Demo loaded. Run window.runProfilingSession() to start.');
}
