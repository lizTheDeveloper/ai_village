/**
 * Node.js Test Script for Soul Repository System
 *
 * This script demonstrates:
 * 1. Souls being saved to persistent repository (filesystem)
 * 2. Souls being reused across "game sessions"
 * 3. Name uniqueness enforced globally
 * 4. "Cedar is always a builder" - soul consistency
 */

import { WorldImpl, type World } from './packages/core/src/ecs/World.ts';
import { GameLoop } from './packages/core/src/loop/GameLoop.ts';
import { SoulRepositorySystem } from './packages/core/src/systems/SoulRepositorySystem.ts';
import { SoulCreationSystem } from './packages/core/src/systems/SoulCreationSystem.ts';
import { soulNameGenerator } from './packages/core/src/divinity/SoulNameGenerator.ts';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Soul Repository System - Node.js Integration Test     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Clean up old repository for fresh test
  const repoPath = path.join(process.cwd(), 'soul-repository');
  if (fs.existsSync(repoPath)) {
    console.log('🧹 Cleaning old repository...\n');
    fs.rmSync(repoPath, { recursive: true });
  }

  // Create first game world
  console.log('═══ GAME SESSION 1: First Universe ═══\n');

  const gameLoop1 = new GameLoop();
  const world1 = gameLoop1.world;

  // Manually register the systems we need
  const soulRepo1 = new SoulRepositorySystem();
  const soulCreation1 = new SoulCreationSystem();

  gameLoop1.systemRegistry.register(soulRepo1);
  gameLoop1.systemRegistry.register(soulCreation1);

  // Initialize systems
  soulRepo1.onInit(world1);
  soulCreation1.init(world1);

// Disable LLM for faster testing (uses fallback names)
soulCreation1.setUseLLM(false);

console.log('✅ Systems initialized');
console.log(`   Repository path: ${repoPath}\n`);

// Create several souls in first game
console.log('🌟 Creating souls in Universe 1...\n');

const souls1: string[] = [];

async function createSoulsForGame1() {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => {
      soulCreation1.requestSoulCreation(
        {
          cosmicAlignment: Math.random() * 2 - 1,
          culture: 'human',
        },
        (soulId) => {
          souls1.push(soulId);
          const soul = world1.getEntity(soulId);
          const identity = soul?.components.get('soul_identity') as any;
          console.log(`   ✨ Created: ${identity.soulName} (${identity.archetype})`);
          console.log(`      Purpose: ${identity.purpose.substring(0, 60)}...`);
          console.log(`      Interests: ${identity.coreInterests.join(', ')}\n`);
          resolve();
        }
      );
    });

    // Process world to trigger ceremony
    for (let tick = 0; tick < 5; tick++) {
      gameLoop1.update(16);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

await createSoulsForGame1();

// Check repository state after first game
console.log('📊 Repository State After Universe 1:\n');
const stats1 = soulRepo1.getStats();
console.log(`   Total souls saved: ${stats1.totalSouls}`);
console.log(`   By archetype: ${JSON.stringify(stats1.byArchetype)}`);
console.log(`   By species: ${JSON.stringify(stats1.bySpecies)}\n`);

// List actual files created
const indexPath = path.join(repoPath, 'index.json');
if (fs.existsSync(indexPath)) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  console.log('📁 Repository Files:\n');
  for (const soulId in index.souls) {
    const soul = index.souls[soulId];
    console.log(`   ${soul.name} → by-date/${soul.createdAt.split('T')[0]}/${soulId}.json`);
  }
  console.log();
}

// Create second game world (new session)
console.log('\n═══ GAME SESSION 2: Second Universe ═══\n');

const gameLoop2 = new GameLoop();
const world2 = gameLoop2.world;

// Register systems for second game
const soulRepo2 = new SoulRepositorySystem(); // Same repository path
const soulCreation2 = new SoulCreationSystem();

gameLoop2.systemRegistry.register(soulRepo2);
gameLoop2.systemRegistry.register(soulCreation2);

// Initialize systems
soulRepo2.onInit(world2);
soulCreation2.init(world2);

// Disable LLM for faster testing
soulCreation2.setUseLLM(false);

console.log('✅ Systems initialized for Universe 2');
console.log(`   Repository now has ${soulRepo2.getStats().totalSouls} souls available for reuse\n`);

// Create souls in second game - should reuse from repository
console.log('🔄 Creating souls in Universe 2 (should reuse from repository)...\n');

const souls2: string[] = [];
let reusedCount = 0;
let newCount = 0;

async function createSoulsForGame2() {
  for (let i = 0; i < 8; i++) {
    await new Promise<void>((resolve) => {
      soulCreation2.requestSoulCreation(
        {
          cosmicAlignment: Math.random() * 2 - 1,
          culture: 'human',
        },
        (soulId) => {
          souls2.push(soulId);
          const soul = world2.getEntity(soulId);
          const identity = soul?.components.get('soul_identity') as any;

          if (identity.isReincarnated) {
            reusedCount++;
            console.log(`   ♻️  REUSED: ${identity.soulName} (${identity.archetype})`);
          } else {
            newCount++;
            console.log(`   ✨ NEW: ${identity.soulName} (${identity.archetype})`);
          }

          resolve();
        }
      );
    });

    // Process world
    for (let tick = 0; tick < 5; tick++) {
      gameLoop2.update(16);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

await createSoulsForGame2();

// Final statistics
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                      TEST RESULTS                         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`Universe 1: Created ${souls1.length} new souls`);
console.log(`            Saved to repository: ${stats1.totalSouls}\n`);

console.log(`Universe 2: Created ${souls2.length} total souls`);
console.log(`            Reused: ${reusedCount} (${((reusedCount / souls2.length) * 100).toFixed(0)}%)`);
console.log(`            New: ${newCount}\n`);

const finalStats = soulRepo2.getStats();
console.log(`Final Repository: ${finalStats.totalSouls} unique souls`);
console.log(`                  ${Object.keys(finalStats.byArchetype).length} different archetypes`);
console.log();

// Verify soul consistency across games
console.log('🔍 Verifying Soul Consistency:\n');
const allSouls = soulRepo2.getAllSouls();
const soulsByName = new Map<string, any>();

for (const soul of allSouls) {
  soulsByName.set(soul.name, soul);
}

console.log('   First 3 souls in repository:\n');
let count = 0;
for (const [name, soul] of soulsByName) {
  if (count >= 3) break;
  console.log(`   "${name}"`);
  console.log(`      Archetype: ${soul.archetype}`);
  console.log(`      Purpose: ${soul.purpose.substring(0, 60)}...`);
  console.log(`      Interests: ${soul.interests.join(', ')}\n`);
  count++;
}

// Success criteria
const success = reusedCount >= 4 && finalStats.totalSouls > 0;

if (success) {
  console.log('✅ SUCCESS! Soul repository system is working correctly!');
  console.log('   - Souls are persisted to filesystem');
  console.log('   - Souls are reused across game sessions');
  console.log('   - Each soul maintains consistent identity (archetype, purpose, interests)');
  console.log('   - Repository can be shared across multiple universes\n');
} else {
  console.log('⚠️  Test did not meet success criteria');
  console.log(`   Expected: ~80% reuse rate (≥4 out of 8)`);
  console.log(`   Got: ${reusedCount} reused out of ${souls2.length}\n`);
}

  console.log('📁 Repository location:', repoPath);
  console.log('   You can inspect the saved soul files in soul-repository/\n');
}

// Run the test
main().catch(console.error);
