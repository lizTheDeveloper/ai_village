/**
 * Run diagnostics cycle - collect issues from running actual systems
 */

import { diagnosticsHarness } from '../packages/core/src/diagnostics/DiagnosticsHarness.js';
import { wrapEntity } from '../packages/core/src/diagnostics/ProxyWrappers.js';

// Enable diagnostics
diagnosticsHarness.setEnabled(true);
diagnosticsHarness.clear();

console.log('========================================');
console.log('DIAGNOSTICS CYCLE 2 - COLLECTING ISSUES');
console.log('========================================\n');

// Import test suite to run with diagnostics
import('../packages/core/src/systems/__tests__/BrainSystem.test.ts')
  .then(() => {
    console.log('\n========================================');
    console.log('COLLECTION COMPLETE');
    console.log('========================================\n');

    const summary = diagnosticsHarness.getSummary();
    console.log(`Total Issues Found: ${summary.totalIssues}\n`);

    if (summary.totalIssues === 0) {
      console.log('✅ No issues detected!\n');
      process.exit(0);
    }

    console.log('Issues by Type:');
    for (const [type, count] of Object.entries(summary.byType)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\nIssues by Severity:');
    for (const [severity, count] of Object.entries(summary.bySeverity)) {
      console.log(`  ${severity}: ${count}`);
    }

    console.log('\n========================================');
    console.log('TOP ISSUES:');
    console.log('========================================\n');

    const issues = diagnosticsHarness.getIssues();
    for (const issue of issues.slice(0, 10)) {
      console.log(`${issue.severity.toUpperCase()}: ${issue.objectType}.${issue.property}`);
      console.log(`  Count: ${issue.count}`);
      if (issue.context?.suggestions?.length) {
        console.log(`  Suggestions: ${issue.context.suggestions.join(', ')}`);
      }
      const stackLines = issue.stackTrace.split('\n').slice(0, 2);
      console.log(`  Location: ${stackLines[0]?.trim()}`);
      console.log('');
    }

    // Export
    const fs = require('fs');
    fs.writeFileSync('diagnostics-cycle2.json', diagnosticsHarness.export());
    console.log('Full report: diagnostics-cycle2.json');
  })
  .catch((err) => {
    console.error('Error running tests:', err);
    process.exit(1);
  });
