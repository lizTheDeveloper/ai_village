#!/usr/bin/env tsx
/**
 * Fix test files that are missing EventBus initialization
 *
 * This script:
 * 1. Finds test files calling `new World()` without EventBus
 * 2. Adds EventBusImpl import if missing
 * 3. Adds eventBus variable declaration
 * 4. Updates `new World()` to `new World(eventBus)`
 * 5. Updates `world.eventBus` references to `eventBus`
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FixResult {
  file: string;
  fixed: boolean;
  changes: string[];
  errors?: string[];
}

async function fixTestFile(filePath: string): Promise<FixResult> {
  const result: FixResult = {
    file: filePath,
    fixed: false,
    changes: [],
  };

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Check if file uses World
  if (!content.includes('World')) {
    return result;
  }

  // Check if file already has EventBusImpl import
  const hasEventBusImport = /import.*EventBusImpl.*from.*EventBus/.test(content);

  // Check if file has `new World()` without parameter
  const hasInvalidWorldConstruction = /new World\(\s*\)/.test(content);

  // Check if file has world.eventBus references
  const hasWorldEventBusRef = /world\.eventBus/.test(content);

  if (!hasInvalidWorldConstruction && !hasWorldEventBusRef) {
    // File might already be fixed or doesn't need fixing
    return result;
  }

  // Add EventBusImpl import if missing
  if (!hasEventBusImport) {
    // Find the last import statement
    const importLines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      // Determine the correct relative path to EventBus
      const relativePath = getRelativePathToEventBus(filePath);
      const importStatement = `import { EventBusImpl } from '${relativePath}';`;

      importLines.splice(lastImportIndex + 1, 0, importStatement);
      content = importLines.join('\n');
      result.changes.push('Added EventBusImpl import');
    }
  }

  // Add eventBus variable declaration if missing
  if (!content.includes('eventBus:') && !content.includes('let eventBus')) {
    // Find where world is declared (e.g., "let world: World;")
    const worldDeclMatch = /let world: World;/;
    if (worldDeclMatch.test(content)) {
      content = content.replace(
        worldDeclMatch,
        'let world: World;\n  let eventBus: EventBusImpl;'
      );
      result.changes.push('Added eventBus variable declaration');
    }
  }

  // Fix `new World()` to `new World(eventBus)`
  if (hasInvalidWorldConstruction) {
    // First, ensure eventBus is initialized before World
    // Pattern: world = new World();
    // Replace with: eventBus = new EventBusImpl(); world = new World(eventBus);

    content = content.replace(
      /(\s+)world = new World\(\s*\);/g,
      '$1eventBus = new EventBusImpl(); world = new World(eventBus);'
    );
    result.changes.push('Fixed World constructor to include eventBus');
  }

  // Fix world.eventBus references to just eventBus
  if (hasWorldEventBusRef) {
    const beforeCount = (content.match(/world\.eventBus/g) || []).length;
    content = content.replace(/world\.eventBus/g, 'eventBus');
    const afterCount = (content.match(/world\.eventBus/g) || []).length;
    if (beforeCount > afterCount) {
      result.changes.push(`Replaced ${beforeCount} world.eventBus references with eventBus`);
    }
  }

  // Write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    result.fixed = true;
  }

  return result;
}

function getRelativePathToEventBus(testFilePath: string): string {
  // Determine relative path from test file to EventBus
  const testDir = path.dirname(testFilePath);

  // Count how many levels deep we are
  const pathParts = testFilePath.split('/');
  const testDirIndex = pathParts.indexOf('__tests__');

  if (testDirIndex === -1) {
    // Not in __tests__ directory, use default
    return '../events/EventBus.js';
  }

  // If we're in packages/X/src/__tests__, EventBus is at packages/core/src/events/EventBus.js
  if (testFilePath.includes('/packages/')) {
    const packageMatch = testFilePath.match(/packages\/([^/]+)\//);
    if (packageMatch && packageMatch[1] === 'core') {
      return '../events/EventBus.js';
    } else {
      // Different package, need to import from @ai-village/core
      return '@ai-village/core';
    }
  }

  return '../events/EventBus.js';
}

async function main() {
  console.log('🔍 Scanning for test files needing EventBus fixes...\n');

  // Find all test files
  const testFiles = await glob('**/__tests__/**/*.test.ts', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  console.log(`Found ${testFiles.length} test files\n`);

  const results: FixResult[] = [];
  let fixedCount = 0;

  for (const file of testFiles) {
    const fullPath = path.join(process.cwd(), file);
    const result = await fixTestFile(fullPath);

    if (result.fixed) {
      fixedCount++;
      console.log(`✅ Fixed: ${file}`);
      for (const change of result.changes) {
        console.log(`   - ${change}`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      console.log(`⚠️  Errors in ${file}:`);
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
    }

    results.push(result);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SUMMARY: Fixed ${fixedCount} / ${testFiles.length} test files`);
  console.log('='.repeat(80));

  if (fixedCount > 0) {
    console.log('\n✅ Test files have been updated. Run tests again to verify fixes.');
  } else {
    console.log('\n✅ All test files appear to be correct.');
  }
}

main().catch(console.error);
