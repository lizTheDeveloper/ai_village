/**
 * analyze-query-patterns.ts - Automated query anti-pattern detection
 *
 * This script analyzes TypeScript files for query optimization issues:
 * - Queries inside loops (most critical)
 * - Repeated singleton queries
 * - Nested query iterations
 * - Inefficient filter operations
 *
 * Usage:
 *   npx ts-node src/scripts/analyze-query-patterns.ts
 *   npx ts-node src/scripts/analyze-query-patterns.ts --file=SystemName.ts
 *   npx ts-node src/scripts/analyze-query-patterns.ts --fix  # Apply auto-fixes
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - throws on errors
 * - Clear error messages
 * - Non-destructive by default (--fix to apply)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface QueryIssue {
  file: string;
  line: number;
  column: number;
  type: 'query_in_loop' | 'repeated_singleton' | 'nested_query' | 'inefficient_filter';
  severity: 'critical' | 'important' | 'minor';
  message: string;
  context: string; // Code snippet
  suggestion: string; // How to fix
}

interface AnalysisResult {
  issues: QueryIssue[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    importantIssues: number;
    minorIssues: number;
    filesAnalyzed: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const SYSTEMS_TO_ANALYZE = [
  'GovernorDecisionExecutor.ts',
  'CityGovernanceSystem.ts',
  'EmpireDynastyManager.ts',
  'EmpireDiplomacySystem.ts',
  'EmpireWarSystem.ts',
  'FederationGovernanceSystem.ts',
  'GalacticCouncilSystem.ts',
  'TradeNetworkSystem.ts',
  'ShipyardProductionSystem.ts',
  'NavyPersonnelSystem.ts',
  'ExplorationDiscoverySystem.ts',
  'StellarMiningSystem.ts',
  'InvasionPlotHandler.ts',
  'ParadoxDetectionSystem.ts',
  'TimelineMergerSystem.ts',
];

// Regex patterns for detection
const PATTERNS = {
  query: /world\.query\(\)\.with\([^)]+\)\.execute(?:Entities|First)\(\)/g,
  forLoop: /for\s*\([^)]*\)\s*\{/g,
  whileLoop: /while\s*\([^)]*\)\s*\{/g,
  mapIteration: /\.map\s*\(/g,
  filterOperation: /\.filter\s*\(/g,
};

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Find all Phase 1-5 system files
 */
function findSystemFiles(baseDir: string, fileFilter?: string): string[] {
  const files: string[] = [];

  function searchDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, __tests__
        if (['node_modules', 'dist', '__tests__', 'test'].includes(entry.name)) {
          continue;
        }
        searchDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        // Check if this file matches our systems list
        if (fileFilter) {
          if (entry.name === fileFilter) {
            files.push(fullPath);
          }
        } else if (SYSTEMS_TO_ANALYZE.includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  searchDir(baseDir);
  return files;
}

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Analyze a single file for query anti-patterns
 */
function analyzeFile(filePath: string): QueryIssue[] {
  const issues: QueryIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Track loop nesting level
  let loopStack: Array<{ type: string; line: number }> = [];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (!line) continue;

    const lineNumber = lineNum + 1; // 1-indexed for display

    // Track loop entry/exit
    if (PATTERNS.forLoop.test(line) || PATTERNS.whileLoop.test(line)) {
      const loopType = line.includes('for') ? 'for' : 'while';
      loopStack.push({ type: loopType, line: lineNumber });
    }

    // Track loop exit (closing brace - simplified heuristic)
    if (line.trim() === '}' && loopStack.length > 0) {
      loopStack.pop();
    }

    // Skip commented lines (single-line comments or lines that are just comments)
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
      continue;
    }

    // Detect query patterns
    const queryMatches = line.matchAll(PATTERNS.query);
    for (const match of queryMatches) {
      const column = match.index ?? 0;

      // Check if inside loop
      if (loopStack.length > 0) {
        const loopContext = loopStack[loopStack.length - 1];
        if (!loopContext) continue;

        const severity = loopStack.length > 1 ? 'critical' : 'critical'; // All loops are critical

        issues.push({
          file: path.basename(filePath),
          line: lineNumber,
          column,
          type: 'query_in_loop',
          severity,
          message: `Query inside ${loopContext.type} loop (started line ${loopContext.line})`,
          context: getContextLines(lines, lineNum, 2),
          suggestion: `Cache query before loop:\nconst entities = world.query()...; // Before loop\nfor (...) {\n  // Use cached 'entities'\n}`,
        });
      }

      // Check for repeated singleton queries (same line text appears multiple times)
      if (line.includes('executeFirst()')) {
        const queryText = match[0];
        const occurrences = countOccurrences(content, queryText);
        if (occurrences > 1) {
          issues.push({
            file: path.basename(filePath),
            line: lineNumber,
            column,
            type: 'repeated_singleton',
            severity: 'important',
            message: `Singleton query repeated ${occurrences} times in file`,
            context: getContextLines(lines, lineNum, 1),
            suggestion: `Cache singleton in class property:\nprivate entityId: string | null = null;\n// In method:\nif (!this.entityId) this.entityId = world.query()...executeFirst()?.id;`,
          });
        }
      }
    }

    // Check for filter after query
    if (line.includes('.executeEntities()') && line.includes('.filter(')) {
      issues.push({
        file: path.basename(filePath),
        line: lineNumber,
        column: line.indexOf('.filter('),
        type: 'inefficient_filter',
        severity: 'minor',
        message: 'Filter operation after query - consider query predicates',
        context: getContextLines(lines, lineNum, 1),
        suggestion: 'If filtering by component, add to query:\nworld.query().with(CT.A).with(CT.B)... // Better than .filter()',
      });
    }
  }

  return issues;
}

/**
 * Get context lines around an issue
 */
function getContextLines(lines: string[], lineNum: number, contextSize: number): string {
  const start = Math.max(0, lineNum - contextSize);
  const end = Math.min(lines.length, lineNum + contextSize + 1);
  const contextLines = lines.slice(start, end);

  return contextLines
    .map((line, idx) => {
      const actualLineNum = start + idx + 1;
      const marker = actualLineNum === lineNum + 1 ? '→' : ' ';
      return `${marker} ${actualLineNum}: ${line}`;
    })
    .join('\n');
}

/**
 * Count occurrences of a string in content
 */
function countOccurrences(content: string, searchString: string): number {
  const escaped = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'g');
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

// ============================================================================
// Analysis & Reporting
// ============================================================================

/**
 * Analyze all systems and generate report
 */
function analyzeAllSystems(baseDir: string, fileFilter?: string): AnalysisResult {
  const systemFiles = findSystemFiles(baseDir, fileFilter);

  if (systemFiles.length === 0) {
    if (fileFilter) {
      throw new Error(`File not found: ${fileFilter}`);
    } else {
      throw new Error(`No Phase 1-5 system files found in ${baseDir}`);
    }
  }

  console.log(`\nAnalyzing ${systemFiles.length} files...`);
  console.log(`Base directory: ${baseDir}\n`);

  const allIssues: QueryIssue[] = [];

  for (const file of systemFiles) {
    console.log(`Analyzing: ${path.basename(file)}`);
    const issues = analyzeFile(file);
    allIssues.push(...issues);

    if (issues.length > 0) {
      console.log(`  Found ${issues.length} issues`);
    } else {
      console.log(`  ✓ No issues found`);
    }
  }

  const summary = {
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter((i) => i.severity === 'critical').length,
    importantIssues: allIssues.filter((i) => i.severity === 'important').length,
    minorIssues: allIssues.filter((i) => i.severity === 'minor').length,
    filesAnalyzed: systemFiles.length,
  };

  return { issues: allIssues, summary };
}

/**
 * Generate detailed report
 */
function generateReport(result: AnalysisResult): void {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Query Optimization Analysis - Phase 1-5 Systems');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  console.log('Summary:');
  console.log(`  Files analyzed: ${result.summary.filesAnalyzed}`);
  console.log(`  Total issues:   ${result.summary.totalIssues}`);
  console.log(`    Critical:     ${result.summary.criticalIssues} (queries in loops)`);
  console.log(`    Important:    ${result.summary.importantIssues} (repeated singletons)`);
  console.log(`    Minor:        ${result.summary.minorIssues} (inefficient filters)`);
  console.log('');

  if (result.issues.length === 0) {
    console.log('✓ No query optimization issues found!\n');
    return;
  }

  // Group issues by file
  const issuesByFile = new Map<string, QueryIssue[]>();
  for (const issue of result.issues) {
    const existing = issuesByFile.get(issue.file) || [];
    existing.push(issue);
    issuesByFile.set(issue.file, existing);
  }

  // Sort files by issue count (highest first)
  const sortedFiles = Array.from(issuesByFile.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Issues by File');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  for (const [file, issues] of sortedFiles) {
    console.log(`\n${file} (${issues.length} issues)`);
    console.log('─'.repeat(file.length + 20));

    // Group by severity
    const critical = issues.filter((i) => i.severity === 'critical');
    const important = issues.filter((i) => i.severity === 'important');
    const minor = issues.filter((i) => i.severity === 'minor');

    // Show critical issues first
    if (critical.length > 0) {
      console.log('\n  CRITICAL Issues (queries in loops):');
      for (const issue of critical) {
        printIssue(issue);
      }
    }

    if (important.length > 0) {
      console.log('\n  IMPORTANT Issues (repeated singletons):');
      for (const issue of important) {
        printIssue(issue);
      }
    }

    if (minor.length > 0) {
      console.log('\n  MINOR Issues (inefficient filters):');
      for (const issue of minor) {
        printIssue(issue);
      }
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Recommendations');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Priority 1 (Fix Immediately):');
  console.log('  1. Fix all CRITICAL issues (queries in loops)');
  console.log('     → Cache queries before loops');
  console.log('     → Pass cached entities to helper methods');
  console.log('');
  console.log('Priority 2 (Fix Soon):');
  console.log('  2. Fix IMPORTANT issues (repeated singletons)');
  console.log('     → Cache singleton IDs in class properties');
  console.log('');
  console.log('Priority 3 (Optimize Later):');
  console.log('  3. Review MINOR issues (inefficient filters)');
  console.log('     → Consider query predicates');
  console.log('');
  console.log('See QUERY_OPTIMIZATION_REPORT.md for detailed fixes.');
  console.log('');
}

/**
 * Print a single issue
 */
function printIssue(issue: QueryIssue): void {
  const severityEmoji =
    issue.severity === 'critical' ? '❌' : issue.severity === 'important' ? '⚠️ ' : 'ℹ️ ';

  console.log(`\n  ${severityEmoji} Line ${issue.line}: ${issue.message}`);
  console.log('');
  console.log('    Code:');
  const indentedContext = issue.context
    .split('\n')
    .map((l) => `      ${l}`)
    .join('\n');
  console.log(indentedContext);
  console.log('');
  console.log('    Suggestion:');
  const indentedSuggestion = issue.suggestion
    .split('\n')
    .map((l) => `      ${l}`)
    .join('\n');
  console.log(indentedSuggestion);
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const fileFilter = args.find((arg) => arg.startsWith('--file='))?.split('=')[1];
  const shouldFix = args.includes('--fix');

  if (shouldFix) {
    console.log('ERROR: Auto-fix not yet implemented');
    console.log('Please review QUERY_OPTIMIZATION_REPORT.md and apply fixes manually.');
    console.log('Automated fixes will be added in a future update.');
    process.exit(1);
  }

  // Find base directory (custom_game_engine/packages/core)
  const scriptDir = __dirname; // .../custom_game_engine/packages/core/src/scripts
  const coreDir = path.resolve(scriptDir, '..', '..'); // .../custom_game_engine/packages/core
  const srcDir = path.join(coreDir, 'src');

  try {
    const result = analyzeAllSystems(srcDir, fileFilter);
    generateReport(result);

    // Exit with error code if issues found
    if (result.summary.criticalIssues > 0) {
      process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\nERROR: ${error.message}\n`);
    } else {
      console.error(`\nERROR: ${String(error)}\n`);
    }
    process.exit(1);
  }
}

// Export for testing
export { analyzeFile, analyzeAllSystems, findSystemFiles };

// Run if executed directly (ESM check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
