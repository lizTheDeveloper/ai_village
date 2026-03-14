#!/usr/bin/env tsx
/**
 * Circular dependency checker for MVEE engine packages.
 *
 * Analyzes all engine packages together as a single dependency graph to detect
 * circular imports. Fails CI if the cycle count exceeds the established
 * baseline, preventing TDZ (Temporal Dead Zone) regressions like MUL-1042.
 *
 * Baseline established 2026-03-14: 110 cycles across all engine packages.
 *
 * Usage:
 *   npm run check:circular              # check all packages against baseline
 *   npm run check:circular -- --verbose # show every cycle
 *   npm run check:circular -- --update-baseline # print new baseline count
 */

import madge from 'madge';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Baseline cycle count across all engine packages (established 2026-03-14).
// Update this ONLY after intentional cleanup — run --update-baseline to get the new number.
const CYCLE_BASELINE = 110;

const VERBOSE = process.argv.includes('--verbose');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

function getPackageSrcDirs(): string[] {
  const packagesDir = path.join(ROOT, 'packages');
  return fs
    .readdirSync(packagesDir)
    .map((name) => path.join(packagesDir, name, 'src'))
    .filter((dir) => fs.existsSync(dir));
}

async function main(): Promise<void> {
  const srcDirs = getPackageSrcDirs();
  console.log(`Checking circular dependencies across ${srcDirs.length} engine packages...\n`);

  const result = await madge(srcDirs, {
    fileExtensions: ['ts'],
    detectiveOptions: {
      ts: { mixedImports: true },
    },
  });

  const cycles = result.circular();
  const count = cycles.length;

  if (UPDATE_BASELINE) {
    console.log(`Current cycle count: ${count}`);
    console.log(`\nUpdate CYCLE_BASELINE in check-circular.ts to: ${count}`);
    process.exit(0);
  }

  // Show cycles if verbose or if we found new ones
  if (VERBOSE || count > CYCLE_BASELINE) {
    const header = count > CYCLE_BASELINE ? 'All cycles (baseline exceeded):' : 'All cycles:';
    console.log(header);
    cycles.forEach((cycle, i) => {
      console.log(`  ${i + 1}) ${cycle.join(' > ')}`);
    });
    console.log();
  }

  if (count > CYCLE_BASELINE) {
    console.error(`❌ FAILED: ${count} circular dependencies found (baseline: ${CYCLE_BASELINE}).`);
    console.error(`   ${count - CYCLE_BASELINE} new cycle(s) introduced.`);
    console.error('   Fix the new cycles or run --update-baseline only after intentional cleanup.\n');
    process.exit(1);
  }

  const improved = count < CYCLE_BASELINE;
  console.log(`✅ PASSED: ${count} circular dependencies (baseline: ${CYCLE_BASELINE}).`);
  if (improved) {
    console.log(`   ⬇ Improved! Down from ${CYCLE_BASELINE}. Run --update-baseline to lower the baseline.`);
  } else {
    console.log('   Note: 110 known cycles remain — see MUL-1062 for tracking and gradual elimination.');
  }
}

main().catch((err) => {
  console.error('check-circular failed:', err);
  process.exit(1);
});
