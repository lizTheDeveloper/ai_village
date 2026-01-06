#!/usr/bin/env tsx
/**
 * Create stable build
 *
 * Creates a snapshot of the current codebase as a "stable build" that:
 * 1. Runs on a different port (3100 instead of 3000)
 * 2. Is isolated from active development
 * 3. Can be played while you work on the dev build
 *
 * Usage: npm run build:stable
 *
 * This script:
 * - Validates all packages first
 * - Builds all packages
 * - Copies demo/ to demo-stable/
 * - Updates port configuration for stable build
 */

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const STABLE_BUILD_DIR = join(rootDir, 'demo-stable');
const STABLE_PORT = 3100;
const STABLE_METRICS_PORT = 8767;

async function validateAllPackages(): Promise<boolean> {
  console.log('🔍 Validating all packages...\n');

  const packages = ['core', 'renderer', 'llm', 'world'];
  let allValid = true;

  for (const pkg of packages) {
    try {
      console.log(`Validating ${pkg}...`);
      execSync(`npm run validate:runtime ${pkg}`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } catch (error) {
      console.error(`\n❌ Package ${pkg} failed validation\n`);
      allValid = false;
      break;
    }
  }

  return allValid;
}

async function buildAllPackages(): Promise<boolean> {
  console.log('\n📦 Building all packages...\n');

  try {
    execSync('npm run build', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    console.error('\n❌ Build failed\n');
    return false;
  }
}

function createStableBuild(): void {
  console.log('\n📋 Creating stable build...\n');

  // Remove old stable build if exists
  if (existsSync(STABLE_BUILD_DIR)) {
    console.log('Removing old stable build...');
    rmSync(STABLE_BUILD_DIR, { recursive: true, force: true });
  }

  // Copy demo/ to demo-stable/
  console.log('Copying demo/ to demo-stable/...');
  cpSync(join(rootDir, 'demo'), STABLE_BUILD_DIR, {
    recursive: true,
    filter: (src) => {
      // Skip node_modules, dist, and other build artifacts
      const skip = [
        'node_modules',
        'dist',
        '.vite',
        'soul-repository',
      ];
      return !skip.some(dir => src.includes(dir));
    },
  });

  // Update vite.config.ts to use different port
  const viteConfigPath = join(STABLE_BUILD_DIR, 'vite.config.ts');
  if (existsSync(viteConfigPath)) {
    console.log(`Updating Vite config to use port ${STABLE_PORT}...`);
    let viteConfig = readFileSync(viteConfigPath, 'utf8');

    // Replace port 3000-3002 with 3100-3102
    viteConfig = viteConfig.replace(
      /port:\s*3000/g,
      `port: ${STABLE_PORT}`
    );
    viteConfig = viteConfig.replace(
      /strictPort:\s*false/g,
      `strictPort: false // will try ${STABLE_PORT}, ${STABLE_PORT + 1}, ${STABLE_PORT + 2}`
    );

    writeFileSync(viteConfigPath, viteConfig);
  }

  // Update package.json to use different metrics port
  const packageJsonPath = join(STABLE_BUILD_DIR, 'package.json');
  if (existsSync(packageJsonPath)) {
    console.log(`Updating metrics port to ${STABLE_METRICS_PORT}...`);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Update metrics server script if it exists
    if (packageJson.scripts && packageJson.scripts['metrics-server']) {
      packageJson.scripts['metrics-server'] = packageJson.scripts['metrics-server'].replace(
        /8766/g,
        String(STABLE_METRICS_PORT)
      );
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // Copy built packages
  console.log('Copying built packages...');
  const packagesDir = join(rootDir, 'packages');
  const stablePackagesDir = join(STABLE_BUILD_DIR, '..', 'packages');

  if (existsSync(stablePackagesDir)) {
    rmSync(stablePackagesDir, { recursive: true, force: true });
  }

  cpSync(packagesDir, stablePackagesDir, {
    recursive: true,
  });

  console.log('\n✅ Stable build created successfully!\n');
  console.log(`Location: ${STABLE_BUILD_DIR}`);
  console.log(`Ports: Game=${STABLE_PORT}, Metrics=${STABLE_METRICS_PORT}`);
  console.log(`\nTo run stable build:`);
  console.log(`  cd ${STABLE_BUILD_DIR} && npm install && npm run dev`);
  console.log(`\nOr use the orchestrator:`);
  console.log(`  ./start.sh stable`);
}

async function main() {
  console.log('🏗️  Creating Stable Build\n');
  console.log('='.repeat(60));

  // Step 1: Validate
  console.log('\nStep 1/3: Validation\n');
  const validationPassed = await validateAllPackages();

  if (!validationPassed) {
    console.error('\n❌ Validation failed. Fix errors before creating stable build.\n');
    console.error('Run npm run watch:validate to see errors in real-time.');
    process.exit(1);
  }

  console.log('\n✅ All packages validated\n');

  // Step 2: Build
  console.log('Step 2/3: Building packages\n');
  const buildPassed = await buildAllPackages();

  if (!buildPassed) {
    console.error('\n❌ Build failed. Cannot create stable build.\n');
    process.exit(1);
  }

  console.log('\n✅ Build successful\n');

  // Step 3: Create stable snapshot
  console.log('Step 3/3: Creating stable snapshot\n');
  createStableBuild();

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Stable build ready!\n');
  console.log('You can now:');
  console.log(`  - Keep developing on port 3000 (might break)`);
  console.log(`  - Play stable build on port ${STABLE_PORT} (always works)`);
  console.log('\nBoth can run simultaneously.');
}

main().catch(error => {
  console.error('\n❌ Stable build creation failed:', error);
  process.exit(1);
});
