#!/usr/bin/env tsx
/**
 * Utility script to view and manage bug reports
 */

import { BugReporter } from '../packages/core/src/utils/BugReporter.js';
import type { BugReport } from '../packages/core/src/utils/BugReporter.js';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  severity: args.find(arg => arg.startsWith('--severity='))?.split('=')[1],
  summary: args.includes('--summary'),
  resolve: args.find(arg => arg.startsWith('--resolve='))?.split('=')[1],
  help: args.includes('--help') || args.includes('-h')
};

function printHelp(): void {
  console.log(`
Bug Reports Utility

Usage:
  npx tsx scripts/view-bug-reports.ts [options]

Options:
  --summary               Show summary of bug reports by category
  --category=TYPE         Filter by category (corrupted_data, validation_failure, system_error, unknown)
  --severity=LEVEL        Filter by severity (critical, high, medium, low)
  --resolve=BUG_ID        Move bug report to resolved directory
  --help, -h              Show this help message

Examples:
  npx tsx scripts/view-bug-reports.ts
  npx tsx scripts/view-bug-reports.ts --summary
  npx tsx scripts/view-bug-reports.ts --category=corrupted_data
  npx tsx scripts/view-bug-reports.ts --severity=high
  npx tsx scripts/view-bug-reports.ts --resolve=bug-1767290000-abc123
`);
}

function formatBugReport(bug: BugReport): string {
  const lines = [
    `${'='.repeat(80)}`,
    `ID:        ${bug.id}`,
    `Timestamp: ${new Date(bug.timestamp).toLocaleString()}`,
    `Category:  ${bug.category}`,
    `Severity:  ${bug.severity}`,
    `Component: ${bug.component}`,
  ];

  if (bug.entityId) {
    lines.push(`Entity ID: ${bug.entityId}`);
  }
  if (bug.entityType) {
    lines.push(`Entity Type: ${bug.entityType}`);
  }

  lines.push(`Error:     ${bug.error}`);

  if (Object.keys(bug.details).length > 0) {
    lines.push(`Details:   ${JSON.stringify(bug.details, null, 2).split('\n').join('\n           ')}`);
  }

  if (bug.stackTrace) {
    lines.push(`Stack:     ${bug.stackTrace.split('\n')[0]}`);
  }

  return lines.join('\n');
}

function showSummary(): void {
  const summary = BugReporter.getSummary();
  const reports = BugReporter.getActiveBugReports();

  console.log('\n📊 Bug Reports Summary\n');
  console.log(`Total Active Bugs: ${reports.length}\n`);

  if (reports.length === 0) {
    console.log('✅ No active bug reports!\n');
    return;
  }

  // Group by category and severity
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byComponent: Record<string, number> = {};

  for (const report of reports) {
    bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1;
    byCategory[report.category] = (byCategory[report.category] || 0) + 1;
    byComponent[report.component] = (byComponent[report.component] || 0) + 1;
  }

  console.log('By Severity:');
  for (const [severity, count] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1])) {
    const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
    console.log(`  ${icon} ${severity.padEnd(10)} ${count}`);
  }

  console.log('\nBy Category:');
  for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${category.padEnd(20)} ${count}`);
  }

  console.log('\nBy Component:');
  for (const [component, count] of Object.entries(byComponent).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${component.padEnd(20)} ${count}`);
  }

  console.log('');
}

function resolveBug(bugId: string): void {
  try {
    BugReporter.resolveBugReport(bugId);
    console.log(`✅ Bug report ${bugId} moved to resolved directory`);
  } catch (error) {
    console.error(`❌ Failed to resolve bug ${bugId}: ${error}`);
    process.exit(1);
  }
}

function viewBugReports(): void {
  let reports = BugReporter.getActiveBugReports();

  // Apply filters
  if (flags.category) {
    reports = reports.filter(r => r.category === flags.category);
  }
  if (flags.severity) {
    reports = reports.filter(r => r.severity === flags.severity);
  }

  console.log(`\n📋 Active Bug Reports (${reports.length})\n`);

  if (reports.length === 0) {
    console.log('✅ No bug reports matching filters\n');
    return;
  }

  for (const report of reports) {
    console.log(formatBugReport(report));
    console.log('');
  }
}

// Main execution
if (flags.help) {
  printHelp();
  process.exit(0);
}

if (flags.resolve) {
  resolveBug(flags.resolve);
  process.exit(0);
}

if (flags.summary) {
  showSummary();
  process.exit(0);
}

viewBugReports();
