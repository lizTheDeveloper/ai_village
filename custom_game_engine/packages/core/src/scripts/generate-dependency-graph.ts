/**
 * Dependency Graph Generator
 *
 * Generates visual dependency graphs from audit results
 * Outputs in both Mermaid and text formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuditReport {
  systemsAudited: number;
  circularDependencies: Array<{ cycle: string[]; severity: string }>;
  priorityIssues: Array<{
    system: string;
    priority: number;
    dependency: string;
    dependencyPriority: number;
  }>;
}

interface SystemInfo {
  name: string;
  priority: number;
  dependsOn: string[];
}

/**
 * Parse system files to extract dependency information
 */
function extractSystemDependencies(): Map<string, SystemInfo> {
  const systems = new Map<string, SystemInfo>();
  const systemsDir = path.join(__dirname, '../systems');
  const files = fs.readdirSync(systemsDir).filter(f => f.endsWith('System.ts'));

  for (const file of files) {
    const filePath = path.join(systemsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const name = file.replace('.ts', '');

    // Extract priority
    const priorityMatch = content.match(/public\s+readonly\s+priority[:\s]*number\s*=\s*(\d+)/);
    const priority = priorityMatch && priorityMatch[1] ? parseInt(priorityMatch[1]) : 500;

    // Extract dependencies
    const dependsOn: string[] = [];
    const metadataMatch = content.match(/dependsOn:\s*\[(.*?)\]/s);
    if (metadataMatch && metadataMatch[1]) {
      const deps = metadataMatch[1].match(/'([^']+)'|"([^"]+)"/g);
      if (deps) {
        dependsOn.push(...deps.map(d => d.replace(/['"]/g, '')));
      }
    }

    systems.set(name, { name, priority, dependsOn });
  }

  return systems;
}

/**
 * Generate Mermaid diagram
 */
function generateMermaidGraph(systems: Map<string, SystemInfo>, report: AuditReport): string {
  let mermaid = 'graph TD\n';
  mermaid += '  %% System Dependency Graph\n';
  mermaid += '  %% Generated from System Interaction Audit\n\n';

  // Group systems by priority ranges
  const groups = new Map<string, SystemInfo[]>();
  for (const system of systems.values()) {
    let group = '';
    if (system.priority < 10) group = 'Infrastructure';
    else if (system.priority < 50) group = 'Core';
    else if (system.priority < 100) group = 'Agent Systems';
    else if (system.priority < 200) group = 'Cognition & Social';
    else if (system.priority < 900) group = 'Empire & Space';
    else group = 'Utilities';

    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(system);
  }

  // Add subgraphs for priority groups
  for (const [groupName, groupSystems] of groups.entries()) {
    mermaid += `  subgraph ${groupName.replace(/ /g, '_')}\n`;
    for (const system of groupSystems) {
      const shortName = system.name.replace('System', '');
      mermaid += `    ${system.name}["${shortName}<br/>p:${system.priority}"]\n`;
    }
    mermaid += '  end\n\n';
  }

  // Add dependency edges
  mermaid += '  %% Dependencies\n';
  const cycles = new Set(report.circularDependencies.flatMap(c => c.cycle.join('→')));

  for (const system of systems.values()) {
    for (const dep of system.dependsOn) {
      const edgeName = `${system.name}→${dep}`;
      const isCycle = cycles.has(edgeName) || cycles.has(`${dep}→${system.name}`);

      if (isCycle) {
        mermaid += `  ${system.name} -.->|"⚠️ CYCLE"| ${dep}\n`;
      } else {
        mermaid += `  ${system.name} --> ${dep}\n`;
      }
    }
  }

  // Style cycles in red
  mermaid += '\n  %% Styling\n';
  mermaid += '  classDef cycleNode fill:#f99,stroke:#d55\n';

  for (const cycle of report.circularDependencies) {
    for (const node of cycle.cycle) {
      mermaid += `  class ${node} cycleNode\n`;
    }
  }

  return mermaid;
}

/**
 * Generate text-based tree visualization
 */
function generateTextGraph(systems: Map<string, SystemInfo>): string {
  let text = '# System Dependency Tree\n\n';
  text += '```\n';

  // Sort by priority
  const sorted = Array.from(systems.values()).sort((a, b) => a.priority - b.priority);

  let currentPriorityRange = -1;
  for (const system of sorted) {
    const priorityRange = Math.floor(system.priority / 100) * 100;

    if (priorityRange !== currentPriorityRange) {
      currentPriorityRange = priorityRange;
      text += `\n[Priority ${priorityRange}-${priorityRange + 99}]\n`;
    }

    const shortName = system.name.replace('System', '');
    text += `├─ ${shortName} (${system.priority})\n`;

    if (system.dependsOn.length > 0) {
      for (let i = 0; i < system.dependsOn.length; i++) {
        const isLast = i === system.dependsOn.length - 1;
        const prefix = isLast ? '└──' : '├──';
        text += `│  ${prefix} depends on: ${system.dependsOn[i]}\n`;
      }
    }
  }

  text += '```\n';
  return text;
}

/**
 * Generate critical path analysis
 */
function generateCriticalPaths(systems: Map<string, SystemInfo>): string {
  let text = '\n## Critical Dependency Chains\n\n';
  text += 'Systems with the longest dependency chains (potential bottlenecks):\n\n';

  // Calculate depth for each system using DFS
  const depths = new Map<string, number>();

  function calculateDepth(systemName: string, visited: Set<string> = new Set()): number {
    if (depths.has(systemName)) return depths.get(systemName)!;
    if (visited.has(systemName)) return 0; // Cycle detected

    const system = systems.get(systemName);
    if (!system || system.dependsOn.length === 0) {
      depths.set(systemName, 0);
      return 0;
    }

    visited.add(systemName);
    const maxDepth = Math.max(
      ...system.dependsOn.map(dep => calculateDepth(dep, new Set(visited)))
    );
    visited.delete(systemName);

    const depth = maxDepth + 1;
    depths.set(systemName, depth);
    return depth;
  }

  for (const system of systems.keys()) {
    calculateDepth(system);
  }

  // Sort by depth
  const sorted = Array.from(depths.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [systemName, depth] of sorted) {
    const system = systems.get(systemName);
    if (system) {
      text += `- **${systemName}**: depth ${depth}, priority ${system.priority}\n`;
      if (system.dependsOn.length > 0) {
        text += `  - Depends on: ${system.dependsOn.join(', ')}\n`;
      }
    }
  }

  return text;
}

/**
 * Main execution
 */
function main(): void {
  console.log('Generating dependency graph...');

  // Load audit report
  const reportPath = path.join(__dirname, '../../audit-report.json');
  const report: AuditReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // Extract system dependencies
  const systems = extractSystemDependencies();
  console.log(`Analyzed ${systems.size} systems`);

  // Generate outputs
  const mermaid = generateMermaidGraph(systems, report);
  const textGraph = generateTextGraph(systems);
  const criticalPaths = generateCriticalPaths(systems);

  // Combine into single markdown file
  let output = '# System Dependency Graph\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Systems Analyzed: ${systems.size}\n\n`;
  output += '---\n\n';
  output += '## Mermaid Diagram\n\n';
  output += '```mermaid\n';
  output += mermaid;
  output += '```\n\n';
  output += '---\n\n';
  output += textGraph;
  output += '\n---\n';
  output += criticalPaths;

  // Add circular dependencies section
  if (report.circularDependencies.length > 0) {
    output += '\n\n---\n\n## ⚠️ Circular Dependencies Detected\n\n';
    for (const cycle of report.circularDependencies) {
      output += `- **${cycle.cycle.join(' → ')}**\n`;
    }
  }

  // Write to file
  const outputPath = path.join(__dirname, '../../DEPENDENCY_GRAPH.md');
  fs.writeFileSync(outputPath, output);
  console.log(`Dependency graph written to: ${outputPath}`);

  // Also write just the mermaid for easy viewing
  const mermaidPath = path.join(__dirname, '../../dependency-graph.mmd');
  fs.writeFileSync(mermaidPath, mermaid);
  console.log(`Mermaid diagram written to: ${mermaidPath}`);
}

main();
