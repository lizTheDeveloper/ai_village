#!/usr/bin/env tsx
/**
 * Calculate research completion time for the full research tree
 *
 * Research Speed Formula (from openspec/specs/ui/research-interface.md):
 * researchSpeed = baseSpeed × (1 + skillBonus) × (1 + buildingBonus) × numResearchers × focusMultiplier
 *
 * - Skill Bonus: 0.1 per 10 skill points
 * - Building Bonus: Library (+0.2), University (+0.5), Research Institute (+1.0)
 * - Focus: 1.5x if researching field of interest, 0.5x if not
 * - numResearchers: 3 initially, scaling to 10
 */

// ============================================================================
// CONSTANTS & ASSUMPTIONS
// ============================================================================

// Base research hours per complexity level
// Complexity 1-10 mapped to hours
const BASE_HOURS_BY_COMPLEXITY: Record<number, number> = {
  1: 2,    // Beginner (⭐)
  2: 4,    // Beginner (⭐⭐)
  3: 8,    // Novice (⭐⭐)
  4: 12,   // Novice (⭐⭐)
  5: 20,   // Intermediate (⭐⭐⭐)
  6: 30,   // Intermediate (⭐⭐⭐)
  7: 50,   // Advanced (⭐⭐⭐⭐)
  8: 75,   // Advanced (⭐⭐⭐⭐)
  9: 120,  // Expert (⭐⭐⭐⭐⭐)
  10: 200, // Expert (⭐⭐⭐⭐⭐)
};

// Paper complexity distribution (estimated from research sets)
// 345 new papers from herbalism/cooking/construction sets
// 179 existing papers (assumed lower complexity average)
const COMPLEXITY_DISTRIBUTION = {
  1: 50,   // Very basic papers
  2: 80,   // Basic papers
  3: 100,  // Common novice papers
  4: 90,   // Advanced novice papers
  5: 80,   // Intermediate papers
  6: 60,   // Advanced intermediate
  7: 40,   // Advanced papers
  8: 20,   // Very advanced
  9: 2,    // Expert papers
  10: 1,   // Master papers
};

// Building availability timeline (in completed papers)
interface BuildingUnlock {
  atPaperCount: number;
  bonus: number;
  name: string;
}

const BUILDING_TIMELINE: BuildingUnlock[] = [
  { atPaperCount: 0, bonus: 0, name: 'No facilities' },
  { atPaperCount: 20, bonus: 0.2, name: 'Library' },
  { atPaperCount: 100, bonus: 0.5, name: 'University' },
  { atPaperCount: 250, bonus: 1.0, name: 'Research Institute' },
];

// Researcher scaling (papers completed → researchers available)
interface ResearcherScaling {
  atPaperCount: number;
  researchers: number;
}

const RESEARCHER_TIMELINE: ResearcherScaling[] = [
  { atPaperCount: 0, researchers: 3 },
  { atPaperCount: 50, researchers: 4 },
  { atPaperCount: 100, researchers: 5 },
  { atPaperCount: 150, researchers: 6 },
  { atPaperCount: 200, researchers: 7 },
  { atPaperCount: 250, researchers: 8 },
  { atPaperCount: 300, researchers: 9 },
  { atPaperCount: 350, researchers: 10 },
];

// Skill progression (papers completed → average skill level)
// Assumes researchers gain skill as they complete papers
function getAverageSkill(papersCompleted: number): number {
  // Start at skill 5, gain 0.2 skill per paper
  // Cap at skill 100
  return Math.min(100, 5 + papersCompleted * 0.2);
}

// Focus multiplier (assume 70% of papers are in-focus)
const AVERAGE_FOCUS_MULTIPLIER = 0.7 * 1.5 + 0.3 * 0.5; // = 1.2

// ============================================================================
// CALCULATION
// ============================================================================

function getCurrentBuildingBonus(papersCompleted: number): number {
  let bonus = 0;
  for (const building of BUILDING_TIMELINE) {
    if (papersCompleted >= building.atPaperCount) {
      bonus = building.bonus;
    }
  }
  return bonus;
}

function getCurrentResearcherCount(papersCompleted: number): number {
  let count = 3;
  for (const stage of RESEARCHER_TIMELINE) {
    if (papersCompleted >= stage.atPaperCount) {
      count = stage.researchers;
    }
  }
  return count;
}

function calculateResearchSpeed(
  baseHours: number,
  papersCompleted: number
): number {
  const skill = getAverageSkill(papersCompleted);
  const skillBonus = skill / 10 * 0.1; // 0.1 per 10 skill points
  const buildingBonus = getCurrentBuildingBonus(papersCompleted);
  const numResearchers = getCurrentResearcherCount(papersCompleted);
  const focusMultiplier = AVERAGE_FOCUS_MULTIPLIER;

  const speed = (1 + skillBonus) * (1 + buildingBonus) * numResearchers * focusMultiplier;

  return baseHours / speed;
}

// Main simulation
function simulateResearchTree(): void {
  console.log('='.repeat(80));
  console.log('RESEARCH TREE COMPLETION TIME SIMULATION');
  console.log('='.repeat(80));
  console.log('');

  // Calculate total papers
  const totalPapers = Object.values(COMPLEXITY_DISTRIBUTION).reduce((sum, count) => sum + count, 0);
  console.log(`Total papers: ${totalPapers}`);
  console.log('');

  // Sort papers by complexity (easiest first - natural progression)
  const paperQueue: number[] = [];
  for (let complexity = 1; complexity <= 10; complexity++) {
    const count = COMPLEXITY_DISTRIBUTION[complexity] || 0;
    for (let i = 0; i < count; i++) {
      paperQueue.push(complexity);
    }
  }

  let totalHours = 0;
  let papersCompleted = 0;

  console.log('Complexity Distribution:');
  for (let complexity = 1; complexity <= 10; complexity++) {
    const count = COMPLEXITY_DISTRIBUTION[complexity] || 0;
    const baseHours = BASE_HOURS_BY_COMPLEXITY[complexity]!;
    const stars = '⭐'.repeat(Math.ceil(complexity / 2));
    console.log(`  ${stars.padEnd(10)} (${complexity}): ${count.toString().padStart(3)} papers × ${baseHours.toString().padStart(3)}h base = ${(count * baseHours).toString().padStart(6)}h base`);
  }
  console.log('');

  // Simulate research progression
  console.log('Research Progression:');
  console.log('─'.repeat(80));

  const milestones = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 523];

  for (const complexity of paperQueue) {
    const baseHours = BASE_HOURS_BY_COMPLEXITY[complexity]!;
    const actualHours = calculateResearchSpeed(baseHours, papersCompleted);

    totalHours += actualHours;
    papersCompleted++;

    // Log milestones
    if (milestones.includes(papersCompleted)) {
      const skill = getAverageSkill(papersCompleted);
      const buildingBonus = getCurrentBuildingBonus(papersCompleted);
      const researchers = getCurrentResearcherCount(papersCompleted);
      const currentBuilding = BUILDING_TIMELINE.filter(b => papersCompleted >= b.atPaperCount).pop();

      console.log(`Papers ${papersCompleted.toString().padStart(3)}: ${(totalHours).toFixed(0).padStart(6)}h total | ` +
                  `${researchers} researchers | Skill ${skill.toFixed(0).padStart(2)} | ` +
                  `${currentBuilding?.name || 'No building'}`);
    }
  }

  console.log('─'.repeat(80));
  console.log('');

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total Papers: ${totalPapers}`);
  console.log(`Total Research Time: ${totalHours.toFixed(0)} game-hours`);
  console.log('');

  // Convert to days (assuming 16 active hours per day)
  const gameDays = totalHours / 16;
  console.log(`Game Time: ${gameDays.toFixed(1)} days (${(gameDays / 30).toFixed(1)} months, ${(gameDays / 365).toFixed(1)} years)`);
  console.log('');

  // Researcher scaling summary
  console.log('Researcher Scaling:');
  for (const stage of RESEARCHER_TIMELINE) {
    console.log(`  After ${stage.atPaperCount.toString().padStart(3)} papers: ${stage.researchers} researchers`);
  }
  console.log('');

  // Building bonus summary
  console.log('Building Bonuses:');
  for (const building of BUILDING_TIMELINE) {
    const bonusPercent = (building.bonus * 100).toFixed(0);
    console.log(`  After ${building.atPaperCount.toString().padStart(3)} papers: ${building.name} (+${bonusPercent}% speed)`);
  }
  console.log('');

  // Average research time per paper at different stages
  console.log('Average Paper Completion Time (by stage):');
  const stages = [0, 100, 200, 300, 400, 500];
  for (const stage of stages) {
    if (stage < totalPapers) {
      const avgComplexity = 5; // Approximate average
      const baseHours = BASE_HOURS_BY_COMPLEXITY[avgComplexity]!;
      const actualHours = calculateResearchSpeed(baseHours, stage);
      console.log(`  At ${stage.toString().padStart(3)} papers: ${actualHours.toFixed(1)}h per paper (complexity ${avgComplexity})`);
    }
  }
  console.log('');
  console.log('='.repeat(80));
}

// Run simulation
simulateResearchTree();
