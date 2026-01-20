/**
 * System Interaction Audit Script
 *
 * Performs comprehensive analysis of system dependencies, event handlers,
 * component usage, and priority ordering to detect potential issues.
 *
 * Run with: npm run audit:systems
 *
 * Checks performed:
 * 1. Priority conflicts - dependency ordering vs priority
 * 2. Event handler coverage - which events are emitted but not handled
 * 3. Component dependencies - systems querying components that don't exist
 * 4. Circular dependencies - system A depends on B which depends on A
 * 5. Singleton conflicts - multiple systems modifying same singleton
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// ES Module Compatibility
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface SystemInfo {
  name: string;
  filePath: string;
  priority: number;
  requiredComponents: string[];
  writesComponents: string[];
  dependsOn: string[];
  emittedEvents: string[];
  handledEvents: string[];
  queriesSingletons: string[];
  writesSingletons: string[];
}

interface PriorityIssue {
  system: string;
  priority: number;
  dependency: string;
  dependencyPriority: number;
  severity: 'error' | 'warning';
}

interface EventCoverageIssue {
  eventType: string;
  emittedBy: string[];
  handledBy: string[];
  severity: 'error' | 'warning';
}

interface ComponentDependencyIssue {
  system: string;
  component: string;
  isRegistered: boolean;
  createdBy: string[];
  severity: 'error' | 'warning';
}

interface CircularDependency {
  cycle: string[];
  severity: 'error';
}

interface SingletonConflict {
  singleton: string;
  systems: string[];
  severity: 'warning';
}

interface AuditReport {
  timestamp: string;
  systemsAudited: number;
  priorityIssues: PriorityIssue[];
  eventCoverageIssues: EventCoverageIssue[];
  componentDependencyIssues: ComponentDependencyIssue[];
  circularDependencies: CircularDependency[];
  singletonConflicts: SingletonConflict[];
  summary: {
    errors: number;
    warnings: number;
    healthy: boolean;
  };
}

// ============================================================================
// Constants
// ============================================================================

const SYSTEMS_DIR = path.join(__dirname, '../systems');
const COMPONENT_TYPES_FILE = path.join(__dirname, '../types/ComponentType.ts');
const EVENT_MAP_FILE = path.join(__dirname, '../events/EventMap.ts');
const REGISTER_ALL_SYSTEMS_FILE = path.join(__dirname, '../registerAllSystems.ts');

// Known singletons (entities that should only exist once)
const KNOWN_SINGLETONS = [
  'TimeEntity',
  'WeatherEntity',
  'MarketState',
  'GovernanceData',
];

// ============================================================================
// File Parsing
// ============================================================================

/**
 * Extract system priority from system file
 */
function extractPriority(content: string, systemName: string): number {
  const priorityMatch = content.match(/public\s+readonly\s+priority\s*[:=]\s*number\s*=\s*(\d+)/);
  if (priorityMatch && priorityMatch[1]) {
    return parseInt(priorityMatch[1], 10);
  }
  console.warn(`[WARN] Could not extract priority for ${systemName}, defaulting to 500`);
  return 500; // Default middle priority
}

/**
 * Extract required components from system file
 */
function extractRequiredComponents(content: string): string[] {
  const componentMatches = content.match(/requiredComponents\s*:\s*ReadonlyArray<ComponentType>\s*=\s*\[(.*?)\]/s);
  if (!componentMatches) return [];

  const componentsStr = componentMatches[1];
  if (!componentsStr) return [];

  const components: string[] = [];
  const regex = /CT\.(\w+)/g;
  let match;
  while ((match = regex.exec(componentsStr)) !== null) {
    if (match[1]) {
      components.push(match[1].toLowerCase());
    }
  }
  return components;
}

/**
 * Extract component writes from metadata
 */
function extractWritesComponents(content: string): string[] {
  const writesMatch = content.match(/writesComponents\s*:\s*\[(.*?)\]\s*as\s*const/s);
  if (!writesMatch) return [];

  const componentsStr = writesMatch[1];
  if (!componentsStr) return [];

  const components: string[] = [];
  const regex = /CT\.(\w+)/g;
  let match;
  while ((match = regex.exec(componentsStr)) !== null) {
    if (match[1]) {
      components.push(match[1].toLowerCase());
    }
  }
  return components;
}

/**
 * Extract system dependencies from metadata
 */
function extractDependsOn(content: string): string[] {
  const dependsMatch = content.match(/dependsOn\s*:\s*\[(.*?)\]\s*as/s);
  if (!dependsMatch) return [];

  const depsStr = dependsMatch[1];
  if (!depsStr) return [];

  const deps: string[] = [];
  const regex = /'([^']+)'/g;
  let match;
  while ((match = regex.exec(depsStr)) !== null) {
    if (match[1]) {
      deps.push(match[1]);
    }
  }
  return deps;
}

/**
 * Extract emitted events from system file
 */
function extractEmittedEvents(content: string): string[] {
  const events: string[] = [];

  // Pattern 1: ctx.emit('event:name', ...)
  const ctxEmitRegex = /ctx\.emit\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = ctxEmitRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  // Pattern 2: world.eventBus.emit({ type: 'event:name', ... })
  const eventBusRegex = /eventBus\.emit\s*\(\s*\{\s*type\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = eventBusRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  // Pattern 3: this.events.emit('event:name', ...)
  const thisEventsRegex = /this\.events\.emit\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = thisEventsRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  return [...new Set(events)]; // Deduplicate
}

/**
 * Extract handled events from system file
 */
function extractHandledEvents(content: string): string[] {
  const events: string[] = [];

  // Pattern 1: this.events.on('event:name', ...)
  const onRegex = /this\.events\.on\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = onRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  // Pattern 2: this.events.subscribe('event:name', ...)
  const subscribeRegex = /this\.events\.subscribe\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = subscribeRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  // Pattern 3: eventBus.on('event:name', ...)
  const eventBusRegex = /eventBus\.on\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = eventBusRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  // Pattern 4: this.events.onGeneric('event:name', ...)
  const onGenericRegex = /this\.events\.onGeneric\s*\(\s*['"]([^'"]+)['"]/g;
  while ((match = onGenericRegex.exec(content)) !== null) {
    if (match[1]) {
      events.push(match[1]);
    }
  }

  return [...new Set(events)]; // Deduplicate
}

/**
 * Extract singleton queries (TimeEntity, WeatherEntity, etc.)
 */
function extractSingletonQueries(content: string): string[] {
  const singletons: string[] = [];

  for (const singleton of KNOWN_SINGLETONS) {
    if (content.includes(singleton)) {
      singletons.push(singleton);
    }
  }

  return singletons;
}

/**
 * Extract singleton writes (systems that modify singleton entities)
 */
function extractSingletonWrites(content: string, systemName: string): string[] {
  const singletons: string[] = [];

  // TimeEntity is usually only modified by TimeSystem
  if (content.includes('TimeEntity') && content.includes('updateComponent')) {
    if (systemName !== 'TimeSystem') {
      singletons.push('TimeEntity');
    }
  }

  // WeatherEntity is usually only modified by WeatherSystem
  if (content.includes('WeatherEntity') && content.includes('updateComponent')) {
    if (systemName !== 'WeatherSystem') {
      singletons.push('WeatherEntity');
    }
  }

  return singletons;
}

/**
 * Parse a system file to extract metadata
 */
function parseSystemFile(filePath: string): SystemInfo | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.ts');

  // Extract system name from class definition
  const classMatch = content.match(/export\s+class\s+(\w+System)/);
  if (!classMatch) {
    return null; // Not a system file
  }

  const systemName = classMatch[1];
  if (!systemName) {
    return null;
  }

  return {
    name: systemName,
    filePath,
    priority: extractPriority(content, systemName),
    requiredComponents: extractRequiredComponents(content),
    writesComponents: extractWritesComponents(content),
    dependsOn: extractDependsOn(content),
    emittedEvents: extractEmittedEvents(content),
    handledEvents: extractHandledEvents(content),
    queriesSingletons: extractSingletonQueries(content),
    writesSingletons: extractSingletonWrites(content, systemName),
  };
}

/**
 * Load all system files
 */
function loadAllSystems(): SystemInfo[] {
  const systems: SystemInfo[] = [];
  const systemFiles = fs.readdirSync(SYSTEMS_DIR).filter(f => f.endsWith('System.ts'));

  for (const file of systemFiles) {
    const filePath = path.join(SYSTEMS_DIR, file);
    const systemInfo = parseSystemFile(filePath);
    if (systemInfo) {
      systems.push(systemInfo);
    }
  }

  // Sort by priority
  systems.sort((a, b) => a.priority - b.priority);

  return systems;
}

/**
 * Load registered component types
 */
function loadComponentTypes(): Set<string> {
  const content = fs.readFileSync(COMPONENT_TYPES_FILE, 'utf-8');
  const components = new Set<string>();

  // Extract enum values
  const regex = /(\w+)\s*=\s*['"](\w+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[2]) {
      components.add(match[2]);
    }
  }

  return components;
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Check for priority ordering issues
 */
function checkPriorityOrder(systems: SystemInfo[]): PriorityIssue[] {
  const issues: PriorityIssue[] = [];
  const systemPriorityMap = new Map(systems.map(s => [s.name, s.priority]));

  for (const system of systems) {
    for (const depName of system.dependsOn) {
      const depPriority = systemPriorityMap.get(depName);

      if (depPriority !== undefined && depPriority >= system.priority) {
        issues.push({
          system: system.name,
          priority: system.priority,
          dependency: depName,
          dependencyPriority: depPriority,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

/**
 * Check for event coverage (emitted but not handled)
 */
function checkEventCoverage(systems: SystemInfo[]): EventCoverageIssue[] {
  const allEmitted = new Map<string, string[]>();
  const allHandled = new Map<string, string[]>();

  // Collect all emitted and handled events
  for (const system of systems) {
    for (const event of system.emittedEvents) {
      if (!allEmitted.has(event)) {
        allEmitted.set(event, []);
      }
      allEmitted.get(event)!.push(system.name);
    }

    for (const event of system.handledEvents) {
      if (!allHandled.has(event)) {
        allHandled.set(event, []);
      }
      allHandled.get(event)!.push(system.name);
    }
  }

  const issues: EventCoverageIssue[] = [];

  // Find events that are emitted but not handled
  for (const [event, emitters] of allEmitted) {
    const handlers = allHandled.get(event) || [];

    if (handlers.length === 0) {
      issues.push({
        eventType: event,
        emittedBy: emitters,
        handledBy: [],
        severity: 'warning', // Not always an error - some events are just logs
      });
    }
  }

  return issues;
}

/**
 * Check component dependencies
 */
function checkComponentDependencies(systems: SystemInfo[], registeredComponents: Set<string>): ComponentDependencyIssue[] {
  const issues: ComponentDependencyIssue[] = [];
  const componentCreators = new Map<string, string[]>();

  // Build map of which systems create which components
  for (const system of systems) {
    for (const comp of system.writesComponents) {
      if (!componentCreators.has(comp)) {
        componentCreators.set(comp, []);
      }
      componentCreators.get(comp)!.push(system.name);
    }
  }

  // Check each system's component dependencies
  for (const system of systems) {
    for (const comp of system.requiredComponents) {
      const isRegistered = registeredComponents.has(comp);
      const creators = componentCreators.get(comp) || [];

      if (!isRegistered) {
        issues.push({
          system: system.name,
          component: comp,
          isRegistered: false,
          createdBy: creators,
          severity: 'error',
        });
      } else if (creators.length === 0) {
        // Component is registered but no system creates it
        // This might be OK for components created during initialization
        issues.push({
          system: system.name,
          component: comp,
          isRegistered: true,
          createdBy: [],
          severity: 'warning',
        });
      }
    }
  }

  return issues;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(systems: SystemInfo[]): CircularDependency[] {
  const cycles: CircularDependency[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const systemMap = new Map(systems.map(s => [s.name, s]));

  function dfs(systemName: string, path: string[]): void {
    visited.add(systemName);
    recursionStack.add(systemName);
    path.push(systemName);

    const system = systemMap.get(systemName);
    if (!system) return;

    for (const depName of system.dependsOn) {
      if (!visited.has(depName)) {
        dfs(depName, path);
      } else if (recursionStack.has(depName)) {
        // Found a cycle
        const cycleStart = path.indexOf(depName);
        const cycle = path.slice(cycleStart).concat(depName);
        cycles.push({
          cycle,
          severity: 'error',
        });
      }
    }

    path.pop();
    recursionStack.delete(systemName);
  }

  for (const system of systems) {
    if (!visited.has(system.name)) {
      dfs(system.name, []);
    }
  }

  return cycles;
}

/**
 * Check for singleton conflicts
 */
function checkSingletonConflicts(systems: SystemInfo[]): SingletonConflict[] {
  const singletonWriters = new Map<string, string[]>();

  for (const system of systems) {
    for (const singleton of system.writesSingletons) {
      if (!singletonWriters.has(singleton)) {
        singletonWriters.set(singleton, []);
      }
      singletonWriters.get(singleton)!.push(system.name);
    }
  }

  const conflicts: SingletonConflict[] = [];

  for (const [singleton, systems] of singletonWriters) {
    if (systems.length > 1) {
      conflicts.push({
        singleton,
        systems,
        severity: 'warning',
      });
    }
  }

  return conflicts;
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate audit report
 */
function generateAuditReport(systems: SystemInfo[], registeredComponents: Set<string>): AuditReport {
  const priorityIssues = checkPriorityOrder(systems);
  const eventCoverageIssues = checkEventCoverage(systems);
  const componentDependencyIssues = checkComponentDependencies(systems, registeredComponents);
  const circularDependencies = detectCircularDependencies(systems);
  const singletonConflicts = checkSingletonConflicts(systems);

  const errors =
    priorityIssues.filter(i => i.severity === 'error').length +
    eventCoverageIssues.filter(i => i.severity === 'error').length +
    componentDependencyIssues.filter(i => i.severity === 'error').length +
    circularDependencies.length;

  const warnings =
    priorityIssues.filter(i => i.severity === 'warning').length +
    eventCoverageIssues.filter(i => i.severity === 'warning').length +
    componentDependencyIssues.filter(i => i.severity === 'warning').length +
    singletonConflicts.length;

  return {
    timestamp: new Date().toISOString(),
    systemsAudited: systems.length,
    priorityIssues,
    eventCoverageIssues,
    componentDependencyIssues,
    circularDependencies,
    singletonConflicts,
    summary: {
      errors,
      warnings,
      healthy: errors === 0,
    },
  };
}

/**
 * Format and print audit report
 */
function printReport(report: AuditReport): void {
  console.log('\n='.repeat(80));
  console.log('System Interaction Audit');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Systems Audited: ${report.systemsAudited}`);
  console.log('='.repeat(80));

  // Priority Order Analysis
  console.log('\nPriority Order Analysis:');
  console.log('-'.repeat(80));
  if (report.priorityIssues.length === 0) {
    console.log('✅ No priority conflicts detected');
  } else {
    for (const issue of report.priorityIssues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
      console.log(
        `${icon} ${issue.system} (${issue.priority}) depends on ${issue.dependency} (${issue.dependencyPriority})`
      );
    }
  }

  // Event Handler Coverage
  console.log('\nEvent Handler Coverage:');
  console.log('-'.repeat(80));
  if (report.eventCoverageIssues.length === 0) {
    console.log('✅ All emitted events have handlers');
  } else {
    const criticalEvents = report.eventCoverageIssues.slice(0, 10); // Show first 10
    for (const issue of criticalEvents) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
      console.log(`${icon} ${issue.eventType} - Emitted by: ${issue.emittedBy.join(', ')}, Handlers: None`);
    }
    if (report.eventCoverageIssues.length > 10) {
      console.log(`... and ${report.eventCoverageIssues.length - 10} more unhandled events`);
    }
  }

  // Component Dependencies
  console.log('\nComponent Dependencies:');
  console.log('-'.repeat(80));
  if (report.componentDependencyIssues.length === 0) {
    console.log('✅ All component dependencies satisfied');
  } else {
    for (const issue of report.componentDependencyIssues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
      if (!issue.isRegistered) {
        console.log(`${icon} ${issue.system} requires ${issue.component} - Component not registered`);
      } else {
        console.log(`${icon} ${issue.system} requires ${issue.component} - No creation system found`);
      }
    }
  }

  // Circular Dependencies
  console.log('\nCircular Dependencies:');
  console.log('-'.repeat(80));
  if (report.circularDependencies.length === 0) {
    console.log('✅ No circular dependencies detected');
  } else {
    for (const issue of report.circularDependencies) {
      console.log(`❌ Cycle: ${issue.cycle.join(' → ')}`);
    }
  }

  // Singleton Conflicts
  console.log('\nSingleton Conflicts:');
  console.log('-'.repeat(80));
  if (report.singletonConflicts.length === 0) {
    console.log('✅ No singleton conflicts detected');
  } else {
    for (const issue of report.singletonConflicts) {
      console.log(`⚠️  ${issue.singleton} modified by ${issue.systems.length} systems: ${issue.systems.join(', ')}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Overall Health:', report.summary.healthy ? '✅ HEALTHY' : '❌ NEEDS ATTENTION');
  console.log(`Issues: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log('Loading systems...');
  const systems = loadAllSystems();
  console.log(`Found ${systems.length} systems`);

  console.log('Loading component types...');
  const registeredComponents = loadComponentTypes();
  console.log(`Found ${registeredComponents.size} registered components`);

  console.log('Analyzing system interactions...\n');
  const report = generateAuditReport(systems, registeredComponents);

  printReport(report);

  // Write JSON report
  const reportPath = path.join(__dirname, '../../audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed JSON report written to: ${reportPath}`);

  // Exit with error code if critical issues found
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

main();
