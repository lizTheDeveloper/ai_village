#!/usr/bin/env tsx
/**
 * Interface Duplication Checker
 *
 * Detects duplicate interface definitions across the codebase.
 * Ensures interfaces are only defined in their canonical locations.
 *
 * Usage: npm run check:interfaces
 * CI Usage: npx tsx scripts/check-interface-duplication.ts
 *
 * Exit codes:
 *   0 - No duplicates found
 *   1 - Duplicates detected
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface CanonicalInterface {
  name: string;
  canonicalFile: string;
}

interface Violation {
  interfaceName: string;
  canonicalFile: string;
  duplicateFile: string;
  lineNumber: number;
}

// Define canonical interface locations
const CANONICAL_INTERFACES: CanonicalInterface[] = [
  { name: 'LLMProvider', canonicalFile: 'packages/core/src/types/LLMTypes.ts' },
  { name: 'LLMRequest', canonicalFile: 'packages/core/src/types/LLMTypes.ts' },
  { name: 'LLMResponse', canonicalFile: 'packages/core/src/types/LLMTypes.ts' },
  { name: 'LLMDecisionQueue', canonicalFile: 'packages/core/src/types/LLMTypes.ts' },
  { name: 'LLMScheduler', canonicalFile: 'packages/core/src/types/LLMTypes.ts' },
];

// Patterns to exclude from search
const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '*.test.ts',
  '__tests__',
  '*.md',
  'agents/autonomous-dev',
  '*.js',
  '*.d.ts',
];

/**
 * Search for interface definitions using grep
 */
function findInterfaceDefinitions(interfaceName: string): Array<{ file: string; line: number; content: string }> {
  try {
    // Build grep command with exclusions
    const excludeArgs = EXCLUDE_PATTERNS.map(pattern => `--exclude-dir=${pattern}`).join(' ');
    const excludeFiles = ['--exclude=*.test.ts', '--exclude=*.md', '--exclude=*.js', '--exclude=*.d.ts'].join(' ');

    // Search for "interface InterfaceName" or "export interface InterfaceName"
    const pattern = `(interface|export interface)\\s+${interfaceName}\\s*[{<]`;
    const command = `grep -rn -E "${pattern}" . ${excludeArgs} ${excludeFiles} || true`;

    const output = execSync(command, {
      cwd: path.resolve(process.cwd()),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (!output.trim()) {
      return [];
    }

    // Parse grep output: "file:line:content"
    const results: Array<{ file: string; line: number; content: string }> = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        const [, filePath, lineNum, content] = match;
        // Normalize path to relative
        const relativePath = path.relative(process.cwd(), filePath);
        results.push({
          file: relativePath,
          line: parseInt(lineNum, 10),
          content: content.trim(),
        });
      }
    }

    return results;
  } catch (error) {
    // grep returns non-zero when no matches found, which is fine
    return [];
  }
}

/**
 * Check if a file path matches any exclude pattern
 */
function isExcluded(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');

  // Exclude this script itself
  if (normalized.includes('check-interface-duplication.ts')) {
    return true;
  }

  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.startsWith('*')) {
      // Wildcard pattern
      const suffix = pattern.slice(1);
      if (normalized.endsWith(suffix)) return true;
    } else {
      // Directory or exact match
      if (normalized.includes(pattern)) return true;
    }
  }

  return false;
}

/**
 * Find all duplicate interface definitions
 */
function findDuplicates(): Violation[] {
  const violations: Violation[] = [];

  console.log('🔍 Scanning codebase for duplicate interface definitions...\n');

  for (const canonical of CANONICAL_INTERFACES) {
    const normalizedCanonical = canonical.canonicalFile.replace(/\\/g, '/');
    const results = findInterfaceDefinitions(canonical.name);

    for (const result of results) {
      const normalizedFile = result.file.replace(/\\/g, '/');

      // Skip if it's the canonical file
      if (normalizedFile === normalizedCanonical) {
        continue;
      }

      // Skip if it matches exclude patterns
      if (isExcluded(normalizedFile)) {
        continue;
      }

      violations.push({
        interfaceName: canonical.name,
        canonicalFile: canonical.canonicalFile,
        duplicateFile: result.file,
        lineNumber: result.line,
      });
    }
  }

  return violations;
}

/**
 * Pretty-print violations
 */
function printViolations(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log('✅ No duplicate interface definitions found!\n');
    return;
  }

  console.log(`❌ Found ${violations.length} duplicate interface definition(s):\n`);

  // Group by interface name
  const byInterface = new Map<string, Violation[]>();
  for (const violation of violations) {
    const existing = byInterface.get(violation.interfaceName) || [];
    existing.push(violation);
    byInterface.set(violation.interfaceName, existing);
  }

  for (const [interfaceName, interfaceViolations] of byInterface.entries()) {
    const canonical = interfaceViolations[0].canonicalFile;
    console.log(`\n📦 Interface: ${interfaceName}`);
    console.log(`   Canonical: ${canonical}`);
    console.log(`   Duplicates:`);

    for (const violation of interfaceViolations) {
      console.log(`     - ${violation.duplicateFile}:${violation.lineNumber}`);
    }
  }

  console.log('\n💡 Fix: Remove duplicate definitions and import from canonical location instead.\n');
  console.log('Example:');
  console.log('  // Remove: interface LLMProvider { ... }');
  console.log('  // Add:    import type { LLMProvider } from \'@ai-village/core\';');
  console.log('');
}

/**
 * Main execution
 */
function main(): void {
  console.log('Interface Duplication Checker');
  console.log('==============================\n');

  const violations = findDuplicates();
  printViolations(violations);

  if (violations.length > 0) {
    console.log('❌ CI Check Failed: Duplicate interfaces detected\n');
    process.exit(1);
  } else {
    console.log('✅ CI Check Passed: No duplicate interfaces\n');
    process.exit(0);
  }
}

// Run the checker
main();
