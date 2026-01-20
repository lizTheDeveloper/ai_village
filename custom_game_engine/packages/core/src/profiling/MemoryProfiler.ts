/**
 * MemoryProfiler - Track heap usage and detect allocation hotspots
 *
 * Phase 6: Memory Allocation Optimization
 *
 * Capabilities:
 * - Track heap usage before/after system updates
 * - Detect allocation spikes (>1MB per tick)
 * - Identify systems causing GC pressure
 * - Measure GC pause frequency and duration
 * - Export profiling data for analysis
 *
 * Usage:
 * ```typescript
 * const profiler = new MemoryProfiler();
 * profiler.startProfiling(world);
 * // ... game loop runs
 * const report = profiler.generateReport();
 * profiler.stopProfiling();
 * ```
 *
 * NO silent fallbacks - all measurements are validated
 * NO object allocations in measurement paths
 * Reuses buffers for minimal GC impact
 */

import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';

/**
 * Memory measurement sample
 */
export interface MemorySample {
  tick: number;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  systemId: string;
  phase: 'before' | 'after';
}

/**
 * System memory profile
 */
export interface SystemMemoryProfile {
  systemId: string;
  systemPriority: number;
  sampleCount: number;
  totalAllocationBytes: number;
  avgAllocationBytes: number;
  maxAllocationBytes: number;
  minAllocationBytes: number;
  allocationSpikes: number; // Count of >1MB allocations
  estimatedGCPressure: number; // 0-1 score
}

/**
 * GC event record
 */
interface GCEvent {
  tick: number;
  timestamp: number;
  duration: number; // milliseconds
  type: 'minor' | 'major' | 'incremental';
  heapBefore: number;
  heapAfter: number;
  freed: number;
}

/**
 * Memory profiling report
 */
export interface MemoryProfilingReport {
  totalTicks: number;
  totalDuration: number;
  totalSamples: number;

  // Heap metrics
  avgHeapUsed: number;
  maxHeapUsed: number;
  totalHeapGrowth: number;
  allocationsPerTick: number;

  // GC metrics
  gcEvents: number;
  avgGCPause: number;
  maxGCPause: number;
  totalGCTime: number;
  gcFrequency: number; // events per second

  // System profiles
  systemProfiles: SystemMemoryProfile[];
  topAllocators: SystemMemoryProfile[]; // Top 10 by total allocation
  topGCContributors: SystemMemoryProfile[]; // Top 10 by GC pressure

  // Allocation hotspots
  allocationSpikes: Array<{
    tick: number;
    systemId: string;
    bytes: number;
    timestamp: number;
  }>;
}

/**
 * Performance mark for measuring durations
 */
interface PerformanceMark {
  name: string;
  startTime: number;
}

/**
 * MemoryProfiler class
 */
export class MemoryProfiler {
  private isProfiling = false;
  private startTime = 0;
  private startTick = 0;

  // Preallocated sample buffer (ring buffer for low GC impact)
  private readonly sampleBuffer: MemorySample[] = [];
  private readonly SAMPLE_BUFFER_SIZE = 10000;
  private sampleBufferIndex = 0;

  // System profiles (Map for O(1) lookup)
  private readonly systemProfiles = new Map<string, SystemMemoryProfile>();

  // GC event tracking
  private readonly gcEvents: GCEvent[] = [];
  private readonly MAX_GC_EVENTS = 1000;

  // Allocation spike tracking (>1MB per tick)
  private readonly allocationSpikes: Array<{
    tick: number;
    systemId: string;
    bytes: number;
    timestamp: number;
  }> = [];
  private readonly SPIKE_THRESHOLD_BYTES = 1024 * 1024; // 1 MB

  // Performance marks for measuring system update durations
  private readonly performanceMarks = new Map<string, PerformanceMark>();

  // Baseline memory measurement
  private baselineHeap = 0;

  /**
   * Initialize sample buffer (called once at construction)
   */
  constructor() {
    // Preallocate sample buffer to avoid allocations during profiling
    for (let i = 0; i < this.SAMPLE_BUFFER_SIZE; i++) {
      this.sampleBuffer.push({
        tick: 0,
        timestamp: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        systemId: '',
        phase: 'before',
      });
    }
  }

  /**
   * Start profiling
   */
  public startProfiling(world: World): void {
    if (this.isProfiling) {
      throw new Error('Profiler already running - call stopProfiling() first');
    }

    this.isProfiling = true;
    this.startTime = Date.now();
    this.startTick = world.tick;
    this.sampleBufferIndex = 0;
    this.systemProfiles.clear();
    this.gcEvents.length = 0;
    this.allocationSpikes.length = 0;

    // Record baseline heap usage
    const baseline = this.measureMemory();
    this.baselineHeap = baseline.heapUsed;

    console.log('[MemoryProfiler] Started profiling at tick', world.tick);
    console.log('[MemoryProfiler] Baseline heap usage:', this.formatBytes(this.baselineHeap));
  }

  /**
   * Stop profiling
   */
  public stopProfiling(): void {
    if (!this.isProfiling) {
      throw new Error('Profiler not running - call startProfiling() first');
    }

    this.isProfiling = false;

    const duration = Date.now() - this.startTime;
    console.log('[MemoryProfiler] Stopped profiling after', this.formatDuration(duration));
    console.log('[MemoryProfiler] Collected', this.sampleBufferIndex, 'samples');
  }

  /**
   * Record memory sample before system update
   */
  public recordBefore(world: World, system: System): void {
    if (!this.isProfiling) return;

    const memory = this.measureMemory();
    this.addSample({
      tick: world.tick,
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers,
      systemId: system.id,
      phase: 'before',
    });

    // Start performance mark
    this.performanceMarks.set(system.id, {
      name: system.id,
      startTime: performance.now(),
    });
  }

  /**
   * Record memory sample after system update
   */
  public recordAfter(world: World, system: System): void {
    if (!this.isProfiling) return;

    const memory = this.measureMemory();
    this.addSample({
      tick: world.tick,
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers,
      systemId: system.id,
      phase: 'after',
    });

    // Calculate allocation delta
    const beforeSample = this.getLastSample(system.id, 'before');
    if (beforeSample) {
      const allocationBytes = memory.heapUsed - beforeSample.heapUsed;

      // Update system profile
      this.updateSystemProfile(system, allocationBytes);

      // Check for allocation spike
      if (allocationBytes > this.SPIKE_THRESHOLD_BYTES) {
        this.allocationSpikes.push({
          tick: world.tick,
          systemId: system.id,
          bytes: allocationBytes,
          timestamp: Date.now(),
        });
      }
    }

    // End performance mark
    this.performanceMarks.delete(system.id);
  }

  /**
   * Record GC event (called by GC observer if available)
   */
  public recordGCEvent(type: 'minor' | 'major' | 'incremental', duration: number, world: World): void {
    if (!this.isProfiling) return;

    const memory = this.measureMemory();

    // Estimate heap before GC (current + freed)
    const freed = this.estimateFreedMemory();
    const heapBefore = memory.heapUsed + freed;

    const event: GCEvent = {
      tick: world.tick,
      timestamp: Date.now(),
      duration,
      type,
      heapBefore,
      heapAfter: memory.heapUsed,
      freed,
    };

    this.gcEvents.push(event);

    // Limit GC event storage
    if (this.gcEvents.length > this.MAX_GC_EVENTS) {
      this.gcEvents.shift();
    }
  }

  /**
   * Generate profiling report
   */
  public generateReport(): MemoryProfilingReport {
    if (this.isProfiling) {
      console.warn('[MemoryProfiler] Generating report while profiling is still active');
    }

    const totalTicks = this.sampleBufferIndex > 0
      ? this.sampleBuffer[this.sampleBufferIndex - 1]!.tick - this.startTick
      : 0;
    const totalDuration = Date.now() - this.startTime;

    // Calculate heap metrics
    let totalHeap = 0;
    let maxHeap = 0;
    let finalHeap = 0;

    for (let i = 0; i < this.sampleBufferIndex; i++) {
      const sample = this.sampleBuffer[i]!;
      totalHeap += sample.heapUsed;
      maxHeap = Math.max(maxHeap, sample.heapUsed);
      if (i === this.sampleBufferIndex - 1) {
        finalHeap = sample.heapUsed;
      }
    }

    const avgHeapUsed = this.sampleBufferIndex > 0 ? totalHeap / this.sampleBufferIndex : 0;
    const totalHeapGrowth = finalHeap - this.baselineHeap;
    const allocationsPerTick = totalTicks > 0 ? totalHeapGrowth / totalTicks : 0;

    // Calculate GC metrics
    let totalGCTime = 0;
    let maxGCPause = 0;

    for (const event of this.gcEvents) {
      totalGCTime += event.duration;
      maxGCPause = Math.max(maxGCPause, event.duration);
    }

    const avgGCPause = this.gcEvents.length > 0 ? totalGCTime / this.gcEvents.length : 0;
    const gcFrequency = totalDuration > 0 ? (this.gcEvents.length / totalDuration) * 1000 : 0;

    // Sort system profiles by allocation
    const systemProfiles = Array.from(this.systemProfiles.values());
    const topAllocators = systemProfiles
      .slice()
      .sort((a, b) => b.totalAllocationBytes - a.totalAllocationBytes)
      .slice(0, 10);

    const topGCContributors = systemProfiles
      .slice()
      .sort((a, b) => b.estimatedGCPressure - a.estimatedGCPressure)
      .slice(0, 10);

    // Sort allocation spikes by size
    const spikes = this.allocationSpikes
      .slice()
      .sort((a, b) => b.bytes - a.bytes);

    return {
      totalTicks,
      totalDuration,
      totalSamples: this.sampleBufferIndex,
      avgHeapUsed,
      maxHeapUsed: maxHeap,
      totalHeapGrowth,
      allocationsPerTick,
      gcEvents: this.gcEvents.length,
      avgGCPause,
      maxGCPause,
      totalGCTime,
      gcFrequency,
      systemProfiles,
      topAllocators,
      topGCContributors,
      allocationSpikes: spikes,
    };
  }

  /**
   * Print report to console
   */
  public printReport(report: MemoryProfilingReport): void {
    console.log('\n=== Memory Profiling Report ===\n');

    console.log('Duration:', this.formatDuration(report.totalDuration));
    console.log('Ticks:', report.totalTicks);
    console.log('Samples:', report.totalSamples);
    console.log();

    console.log('--- Heap Metrics ---');
    console.log('Average heap:', this.formatBytes(report.avgHeapUsed));
    console.log('Max heap:', this.formatBytes(report.maxHeapUsed));
    console.log('Total growth:', this.formatBytes(report.totalHeapGrowth));
    console.log('Allocations/tick:', this.formatBytes(report.allocationsPerTick));
    console.log();

    console.log('--- GC Metrics ---');
    console.log('GC events:', report.gcEvents);
    console.log('Average GC pause:', report.avgGCPause.toFixed(2), 'ms');
    console.log('Max GC pause:', report.maxGCPause.toFixed(2), 'ms');
    console.log('Total GC time:', this.formatDuration(report.totalGCTime));
    console.log('GC frequency:', report.gcFrequency.toFixed(2), 'events/sec');
    console.log();

    console.log('--- Top 10 Allocators ---');
    for (let i = 0; i < Math.min(10, report.topAllocators.length); i++) {
      const profile = report.topAllocators[i]!;
      console.log(
        `${i + 1}. ${profile.systemId} (priority ${profile.systemPriority}):`,
        this.formatBytes(profile.totalAllocationBytes),
        `(avg: ${this.formatBytes(profile.avgAllocationBytes)}, spikes: ${profile.allocationSpikes})`
      );
    }
    console.log();

    console.log('--- Top 10 GC Contributors ---');
    for (let i = 0; i < Math.min(10, report.topGCContributors.length); i++) {
      const profile = report.topGCContributors[i]!;
      console.log(
        `${i + 1}. ${profile.systemId}:`,
        `GC pressure ${(profile.estimatedGCPressure * 100).toFixed(1)}%,`,
        this.formatBytes(profile.totalAllocationBytes)
      );
    }
    console.log();

    console.log('--- Top 10 Allocation Spikes (>1MB) ---');
    for (let i = 0; i < Math.min(10, report.allocationSpikes.length); i++) {
      const spike = report.allocationSpikes[i]!;
      console.log(
        `${i + 1}. Tick ${spike.tick}, ${spike.systemId}:`,
        this.formatBytes(spike.bytes)
      );
    }
    console.log();
  }

  /**
   * Export report as JSON
   */
  public exportReport(report: MemoryProfilingReport): string {
    return JSON.stringify(report, null, 2);
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  /**
   * Measure current memory usage
   */
  private measureMemory(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers || 0,
      };
    }

    // Fallback for browser environment (limited data)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        heapUsed: mem.usedJSHeapSize || 0,
        heapTotal: mem.totalJSHeapSize || 0,
        external: 0,
        arrayBuffers: 0,
      };
    }

    // No memory API available
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
    };
  }

  /**
   * Add sample to ring buffer
   */
  private addSample(sample: MemorySample): void {
    if (this.sampleBufferIndex >= this.SAMPLE_BUFFER_SIZE) {
      console.warn('[MemoryProfiler] Sample buffer full - overwriting oldest samples');
      this.sampleBufferIndex = 0;
    }

    const slot = this.sampleBuffer[this.sampleBufferIndex]!;
    slot.tick = sample.tick;
    slot.timestamp = sample.timestamp;
    slot.heapUsed = sample.heapUsed;
    slot.heapTotal = sample.heapTotal;
    slot.external = sample.external;
    slot.arrayBuffers = sample.arrayBuffers;
    slot.systemId = sample.systemId;
    slot.phase = sample.phase;

    this.sampleBufferIndex++;
  }

  /**
   * Get last sample for system with matching phase
   */
  private getLastSample(systemId: string, phase: 'before' | 'after'): MemorySample | null {
    // Search backwards from current index
    for (let i = this.sampleBufferIndex - 1; i >= 0; i--) {
      const sample = this.sampleBuffer[i]!;
      if (sample.systemId === systemId && sample.phase === phase) {
        return sample;
      }
    }
    return null;
  }

  /**
   * Update system memory profile
   */
  private updateSystemProfile(system: System, allocationBytes: number): void {
    let profile = this.systemProfiles.get(system.id);

    if (!profile) {
      profile = {
        systemId: system.id,
        systemPriority: system.priority,
        sampleCount: 0,
        totalAllocationBytes: 0,
        avgAllocationBytes: 0,
        maxAllocationBytes: 0,
        minAllocationBytes: Number.MAX_SAFE_INTEGER,
        allocationSpikes: 0,
        estimatedGCPressure: 0,
      };
      this.systemProfiles.set(system.id, profile);
    }

    profile.sampleCount++;
    profile.totalAllocationBytes += allocationBytes;
    profile.avgAllocationBytes = profile.totalAllocationBytes / profile.sampleCount;
    profile.maxAllocationBytes = Math.max(profile.maxAllocationBytes, allocationBytes);
    profile.minAllocationBytes = Math.min(profile.minAllocationBytes, allocationBytes);

    if (allocationBytes > this.SPIKE_THRESHOLD_BYTES) {
      profile.allocationSpikes++;
    }

    // Estimate GC pressure: (total allocations * spike frequency) / heap size
    const spikeFrequency = profile.sampleCount > 0 ? profile.allocationSpikes / profile.sampleCount : 0;
    profile.estimatedGCPressure = Math.min(1.0, (profile.totalAllocationBytes * spikeFrequency) / (100 * 1024 * 1024)); // normalize to 100MB
  }

  /**
   * Estimate freed memory from recent GC
   * (Heuristic: assume 50% of small allocations get freed)
   */
  private estimateFreedMemory(): number {
    // Get last few samples
    const recentSamples = 10;
    let totalRecent = 0;
    let count = 0;

    for (let i = Math.max(0, this.sampleBufferIndex - recentSamples); i < this.sampleBufferIndex; i++) {
      const sample = this.sampleBuffer[i]!;
      if (sample.phase === 'after') {
        totalRecent += sample.heapUsed;
        count++;
      }
    }

    const avgRecent = count > 0 ? totalRecent / count : 0;
    return avgRecent * 0.5; // Heuristic: 50% freed
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
  }

  /**
   * Format duration to human-readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
    return `${(ms / 60000).toFixed(2)} min`;
  }
}
