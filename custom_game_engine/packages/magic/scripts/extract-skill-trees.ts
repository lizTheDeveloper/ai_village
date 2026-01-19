#!/usr/bin/env tsx
/**
 * Extract skill tree definitions to JSON files.
 *
 * This script imports each skill tree TypeScript file and exports
 * the tree data to JSON for easier editing and version control.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import all skill trees
import { DAEMON_SKILL_TREE } from '../src/skillTrees/DaemonSkillTree.js';
import { ARCHITECTURE_SKILL_TREE } from '../src/skillTrees/ArchitectureSkillTree.js';
import { DREAM_SKILL_TREE } from '../src/skillTrees/DreamSkillTree.js';
import { SONG_SKILL_TREE } from '../src/skillTrees/SongSkillTree.js';
import { NAME_SKILL_TREE } from '../src/skillTrees/NameSkillTree.js';
import { PACT_SKILL_TREE } from '../src/skillTrees/PactSkillTree.js';
import { ALLOMANCY_SKILL_TREE } from '../src/skillTrees/AllomancySkillTree.js';
import { SYMPATHY_SKILL_TREE } from '../src/skillTrees/SympathySkillTree.js';
import { RUNE_SKILL_TREE } from '../src/skillTrees/RuneSkillTree.js';
import { SHINTO_SKILL_TREE } from '../src/skillTrees/ShintoSkillTree.js';
import { BREATH_SKILL_TREE } from '../src/skillTrees/BreathSkillTree.js';
import { BLOOD_SKILL_TREE } from '../src/skillTrees/BloodSkillTree.js';
import { BELIEF_SKILL_TREE } from '../src/skillTrees/BeliefSkillTree.js';
import { DIVINE_SKILL_TREE } from '../src/skillTrees/DivineSkillTree.js';
import { ACADEMIC_SKILL_TREE } from '../src/skillTrees/AcademicSkillTree.js';
import { COMMERCE_SKILL_TREE } from '../src/skillTrees/CommerceSkillTree.js';
import { DEBT_SKILL_TREE } from '../src/skillTrees/DebtSkillTree.js';
import { BUREAUCRATIC_SKILL_TREE } from '../src/skillTrees/BureaucraticSkillTree.js';
import { GAME_SKILL_TREE } from '../src/skillTrees/GameSkillTree.js';
import { LUCK_SKILL_TREE } from '../src/skillTrees/LuckSkillTree.js';
import { EMOTIONAL_SKILL_TREE } from '../src/skillTrees/EmotionalSkillTree.js';
import { ECHO_SKILL_TREE } from '../src/skillTrees/EchoSkillTree.js';
import { PARADOX_SKILL_TREE } from '../src/skillTrees/ParadoxSkillTree.js';
import { FENG_SHUI_SKILL_TREE } from '../src/skillTrees/FengShuiSkillTree.js';
import { THRESHOLD_SKILL_TREE } from '../src/skillTrees/ThresholdSkillTree.js';

import type { MagicSkillTree } from '../src/MagicSkillTree.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKILL_TREES: MagicSkillTree[] = [
  DAEMON_SKILL_TREE,
  ARCHITECTURE_SKILL_TREE,
  DREAM_SKILL_TREE,
  SONG_SKILL_TREE,
  NAME_SKILL_TREE,
  PACT_SKILL_TREE,
  ALLOMANCY_SKILL_TREE,
  SYMPATHY_SKILL_TREE,
  RUNE_SKILL_TREE,
  SHINTO_SKILL_TREE,
  BREATH_SKILL_TREE,
  BLOOD_SKILL_TREE,
  BELIEF_SKILL_TREE,
  DIVINE_SKILL_TREE,
  ACADEMIC_SKILL_TREE,
  COMMERCE_SKILL_TREE,
  DEBT_SKILL_TREE,
  BUREAUCRATIC_SKILL_TREE,
  GAME_SKILL_TREE,
  LUCK_SKILL_TREE,
  EMOTIONAL_SKILL_TREE,
  ECHO_SKILL_TREE,
  PARADOX_SKILL_TREE,
  FENG_SHUI_SKILL_TREE,
  THRESHOLD_SKILL_TREE,
];

function main() {
  console.log('Magic Skill Tree JSON Extraction');
  console.log('='.repeat(60));

  const outputDir = join(__dirname, '..', 'data', 'skill-trees');

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  let totalNodes = 0;
  const summary: Record<string, any> = {
    totalTrees: SKILL_TREES.length,
    totalNodes: 0,
    trees: {} as Record<string, { nodeCount: number; file: string }>,
  };

  for (const tree of SKILL_TREES) {
    const nodeCount = tree.nodes.length;
    totalNodes += nodeCount;

    console.log(`\n${tree.paradigmId}: ${nodeCount} nodes`);

    // Write tree to JSON
    const outputFile = join(outputDir, `${tree.paradigmId}.json`);
    writeFileSync(outputFile, JSON.stringify(tree, null, 2));

    summary.trees[tree.paradigmId] = {
      nodeCount,
      file: `${tree.paradigmId}.json`,
    };

    // Print top 5 nodes by XP cost
    const topNodes = [...tree.nodes]
      .sort((a, b) => b.xpCost - a.xpCost)
      .slice(0, 5);

    console.log('  Top nodes by XP cost:');
    topNodes.forEach(node => {
      console.log(`    - ${node.name} (${node.xpCost} XP, tier ${node.tier})`);
    });
  }

  summary.totalNodes = totalNodes;

  // Write summary
  const summaryFile = join(outputDir, '_summary.json');
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`✓ Extracted ${SKILL_TREES.length} skill trees`);
  console.log(`✓ Total nodes: ${totalNodes}`);
  console.log(`✓ Output: ${outputDir}`);
  console.log('\nJSON files created:');
  console.log(`  - ${SKILL_TREES.length} paradigm files`);
  console.log(`  - 1 summary file`);
}

main();
