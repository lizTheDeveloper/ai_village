/**
 * ParallelSystemAnalyzer - Identifies systems that can run in parallel
 *
 * For safe parallel execution, systems must not:
 * 1. Write to components that another parallel system reads
 * 2. Create/destroy entities while another system reads them
 * 3. Emit events that another parallel system subscribes to
 *
 * This analyzer uses system metadata to build dependency graphs and
 * identify which systems can safely execute in parallel.
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new ParallelSystemAnalyzer(systems);
 * const groups = analyzer.getParallelGroups();
 *
 * // groups = [
 * //   [WeatherSystem, TimeSystem],      // Can run in parallel
 * //   [AgentBrainSystem],                // Must run alone
 * //   [SteeringSystem, NeedsSystem],     // Can run in parallel
 * // ]
 * ```
 *
 * ## Limitations
 *
 * - JavaScript is single-threaded; true parallelism requires Web Workers
 * - This analyzer only identifies SAFE parallelism, not how to implement it
 * - Systems without metadata are assumed to conflict with everything
 */

import type { System, SystemMetadata } from './System.js';
import type { ComponentType, SystemId } from '../types.js';

/**
 * Dependency between two systems
 */
export interface SystemDependency {
  from: SystemId;
  to: SystemId;
  reason: 'reads_writes' | 'writes_writes' | 'explicit' | 'unknown';
  component?: ComponentType;
}

/**
 * Analysis result for a system
 */
export interface SystemAnalysis {
  id: SystemId;
  priority: number;
  readsComponents: ComponentType[];
  writesComponents: ComponentType[];
  dependsOn: SystemId[];
  parallelWith: SystemId[];
  conflictsWith: SystemId[];
}

/**
 * ParallelSystemAnalyzer identifies safe parallel execution groups
 */
export class ParallelSystemAnalyzer {
  private systems: Map<SystemId, System> = new Map();
  private dependencies: SystemDependency[] = [];
  private analyses: Map<SystemId, SystemAnalysis> = new Map();

  constructor(systems: System[]) {
    // Index systems
    for (const system of systems) {
      this.systems.set(system.id, system);
    }

    // Analyze each system
    for (const system of systems) {
      this.analyzeSystem(system);
    }

    // Build dependency graph
    this.buildDependencyGraph();
  }

  /**
   * Analyze a single system's read/write patterns
   */
  private analyzeSystem(system: System): void {
    const metadata = system.metadata;

    const analysis: SystemAnalysis = {
      id: system.id,
      priority: system.priority,
      readsComponents: [
        ...system.requiredComponents,
        ...(metadata?.readsComponents ?? []),
      ],
      writesComponents: metadata?.writesComponents ?? [],
      dependsOn: [...(metadata?.dependsOn ?? [])],
      parallelWith: [],
      conflictsWith: [],
    };

    this.analyses.set(system.id, analysis);
  }

  /**
   * Build the dependency graph by analyzing read/write conflicts
   */
  private buildDependencyGraph(): void {
    const systemIds = [...this.systems.keys()];

    // For each pair of systems, check for conflicts
    for (let i = 0; i < systemIds.length; i++) {
      for (let j = i + 1; j < systemIds.length; j++) {
        const a = this.analyses.get(systemIds[i])!;
        const b = this.analyses.get(systemIds[j])!;

        const conflict = this.findConflict(a, b);
        if (conflict) {
          this.dependencies.push(conflict);
          a.conflictsWith.push(b.id);
          b.conflictsWith.push(a.id);
        } else {
          a.parallelWith.push(b.id);
          b.parallelWith.push(a.id);
        }
      }
    }
  }

  /**
   * Find any conflict between two systems
   */
  private findConflict(
    a: SystemAnalysis,
    b: SystemAnalysis
  ): SystemDependency | null {
    // Check explicit dependencies
    if (a.dependsOn.includes(b.id)) {
      return { from: a.id, to: b.id, reason: 'explicit' };
    }
    if (b.dependsOn.includes(a.id)) {
      return { from: b.id, to: a.id, reason: 'explicit' };
    }

    // Check read-write conflicts (A reads what B writes or vice versa)
    for (const component of a.readsComponents) {
      if (b.writesComponents.includes(component)) {
        return { from: a.id, to: b.id, reason: 'reads_writes', component };
      }
    }
    for (const component of b.readsComponents) {
      if (a.writesComponents.includes(component)) {
        return { from: b.id, to: a.id, reason: 'reads_writes', component };
      }
    }

    // Check write-write conflicts (both write to same component)
    for (const component of a.writesComponents) {
      if (b.writesComponents.includes(component)) {
        return { from: a.id, to: b.id, reason: 'writes_writes', component };
      }
    }

    // No conflicts found
    return null;
  }

  /**
   * Get parallel execution groups (systems in same group can run together)
   */
  getParallelGroups(): SystemId[][] {
    const groups: SystemId[][] = [];
    const assigned = new Set<SystemId>();

    // Sort systems by priority
    const sortedSystems = [...this.systems.values()].sort(
      (a, b) => a.priority - b.priority
    );

    for (const system of sortedSystems) {
      if (assigned.has(system.id)) continue;

      // Start a new group with this system
      const group: SystemId[] = [system.id];
      assigned.add(system.id);

      // Find all systems that can run in parallel with this one
      const analysis = this.analyses.get(system.id);
      if (analysis) {
        for (const parallelId of analysis.parallelWith) {
          if (assigned.has(parallelId)) continue;

          // Check if this system can run with ALL systems already in the group
          const parallelAnalysis = this.analyses.get(parallelId);
          if (!parallelAnalysis) continue;

          const canJoinGroup = group.every((groupId) =>
            parallelAnalysis.parallelWith.includes(groupId)
          );

          if (canJoinGroup) {
            group.push(parallelId);
            assigned.add(parallelId);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Get analysis for a specific system
   */
  getAnalysis(systemId: SystemId): SystemAnalysis | undefined {
    return this.analyses.get(systemId);
  }

  /**
   * Get all dependencies
   */
  getDependencies(): readonly SystemDependency[] {
    return this.dependencies;
  }

  /**
   * Generate a report of parallelization opportunities
   */
  generateReport(): string {
    const lines: string[] = [
      '# Parallel System Execution Analysis',
      '',
      '## Parallel Groups',
      '',
      'Systems in the same group can potentially run in parallel.',
      '',
    ];

    const groups = this.getParallelGroups();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group.length > 1) {
        lines.push(`### Group ${i + 1} (${group.length} systems - PARALLELIZABLE)`);
      } else {
        lines.push(`### Group ${i + 1} (sequential)`);
      }
      for (const id of group) {
        const analysis = this.analyses.get(id);
        const system = this.systems.get(id);
        lines.push(
          `- **${id}** (priority: ${system?.priority ?? '?'})`
        );
        if (analysis && analysis.writesComponents.length > 0) {
          lines.push(`  - Writes: ${analysis.writesComponents.join(', ')}`);
        }
      }
      lines.push('');
    }

    lines.push('## Dependencies');
    lines.push('');

    for (const dep of this.dependencies) {
      lines.push(
        `- ${dep.from} → ${dep.to}: ${dep.reason}${dep.component ? ` (${dep.component})` : ''}`
      );
    }

    // Summary
    lines.push('');
    lines.push('## Summary');
    lines.push('');

    const parallelizableGroups = groups.filter((g) => g.length > 1);
    const parallelizableSystems = parallelizableGroups.reduce(
      (sum, g) => sum + g.length,
      0
    );

    lines.push(`- Total systems: ${this.systems.size}`);
    lines.push(`- Parallelizable groups: ${parallelizableGroups.length}`);
    lines.push(`- Systems in parallel groups: ${parallelizableSystems}`);
    lines.push(`- Total dependencies: ${this.dependencies.length}`);

    return lines.join('\n');
  }
}

/**
 * Analyze systems and log parallelization opportunities
 */
export function analyzeSystemParallelism(systems: System[]): void {
  const analyzer = new ParallelSystemAnalyzer(systems);
  console.log(analyzer.generateReport());
}
