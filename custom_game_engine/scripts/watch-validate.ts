#!/usr/bin/env tsx
/**
 * Watch mode validator
 *
 * Watches package source files and validates them before allowing rebuild.
 * This prevents broken code from crashing the running dev server.
 *
 * Usage: npm run watch:validate
 *
 * Run this alongside your dev server:
 *   Terminal 1: npm run watch:validate
 *   Terminal 2: npm run dev (in demo/)
 */

import chokidar from 'chokidar';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Track validation state per package
const validationState = new Map<string, {
  isValid: boolean;
  lastCheck: number;
  errors: string[];
}>();

// Debounce validation to avoid running on every keystroke
const validationQueue = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 1000; // Wait 1s after last change

function extractPackageName(filePath: string): string {
  // Extract package name from path like "packages/core/src/..."
  const match = filePath.match(/packages\/([^\/]+)\//);
  return match ? match[1] : '';
}

async function validatePackage(packageName: string): Promise<boolean> {
  console.log(`\n⏳ [${new Date().toLocaleTimeString()}] Validating ${packageName}...`);

  try {
    // Run the validation script
    execSync(`npx tsx scripts/validate-package-runtime.ts ${packageName}`, {
      cwd: rootDir,
      stdio: 'inherit',
    });

    // Validation passed
    validationState.set(packageName, {
      isValid: true,
      lastCheck: Date.now(),
      errors: [],
    });

    console.log(`✅ [${packageName}] Validation passed - rebuild can proceed`);
    return true;

  } catch (error: any) {
    // Validation failed
    const errors = [error.message || 'Unknown error'];
    validationState.set(packageName, {
      isValid: false,
      lastCheck: Date.now(),
      errors,
    });

    console.error(`\n❌ [${packageName}] Validation FAILED`);
    console.error('Fix the errors above, then save again to retry validation.\n');
    return false;
  }
}

function scheduleValidation(packageName: string) {
  // Clear existing timeout
  if (validationQueue.has(packageName)) {
    clearTimeout(validationQueue.get(packageName)!);
  }

  // Schedule new validation
  const timeout = setTimeout(async () => {
    validationQueue.delete(packageName);
    await validatePackage(packageName);
  }, DEBOUNCE_MS);

  validationQueue.set(packageName, timeout);

  console.log(`⏱️  [${packageName}] Validation scheduled (waiting for more changes...)`);
}

function startWatcher() {
  console.log('👀 Watching packages for changes...\n');
  console.log('This validator will check your code before rebuilds.');
  console.log('If validation fails, fix the errors and save again.\n');
  console.log('Press Ctrl+C to stop.\n');

  // Watch all TypeScript files in packages
  const watcher = chokidar.watch('packages/*/src/**/*.ts', {
    cwd: rootDir,
    ignoreInitial: true,
    ignored: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**'],
  });

  watcher.on('change', (filePath) => {
    const packageName = extractPackageName(filePath);

    if (!packageName) {
      console.warn(`⚠️  Could not extract package name from ${filePath}`);
      return;
    }

    const relativePath = path.relative(rootDir, filePath);
    console.log(`📝 [${new Date().toLocaleTimeString()}] ${relativePath} changed`);

    scheduleValidation(packageName);
  });

  watcher.on('add', (filePath) => {
    const packageName = extractPackageName(filePath);
    if (packageName) {
      console.log(`📄 New file added: ${path.relative(rootDir, filePath)}`);
      scheduleValidation(packageName);
    }
  });

  watcher.on('unlink', (filePath) => {
    const packageName = extractPackageName(filePath);
    if (packageName) {
      console.log(`🗑️  File deleted: ${path.relative(rootDir, filePath)}`);
      scheduleValidation(packageName);
    }
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });

  // Validate all packages on startup
  const packagesDir = join(rootDir, 'packages');
  const packages = fs.readdirSync(packagesDir).filter(name => {
    const stat = fs.statSync(join(packagesDir, name));
    return stat.isDirectory();
  });

  console.log(`Found packages: ${packages.join(', ')}\n`);
  console.log('Running initial validation...\n');

  // Run initial validation for all packages (in sequence to avoid spam)
  (async () => {
    for (const pkg of packages) {
      await validatePackage(pkg);
    }
    console.log('\n✨ Initial validation complete. Watching for changes...\n');
  })();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping validator...');

  // Show final status
  console.log('\nFinal validation status:');
  for (const [pkg, state] of validationState.entries()) {
    const status = state.isValid ? '✅' : '❌';
    console.log(`  ${status} ${pkg}`);
  }

  process.exit(0);
});

startWatcher();
