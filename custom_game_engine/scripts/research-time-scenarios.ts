#!/usr/bin/env tsx
/**
 * Research Time Scenario Analysis
 *
 * Compares different research configurations:
 * - Researcher counts (3, 5, 10, 15 constant)
 * - Skill levels (novice, intermediate, expert)
 * - Building availability (none, library, university, institute)
 * - Focus dedication (casual, focused, dedicated)
 */

// ============================================================================
// BASE CONSTANTS
// ============================================================================

const BASE_HOURS_BY_COMPLEXITY: Record<number, number> = {
  1: 2, 2: 4, 3: 8, 4: 12, 5: 20, 6: 30, 7: 50, 8: 75, 9: 120, 10: 200,
};

const COMPLEXITY_DISTRIBUTION: Record<number, number> = {
  1: 50, 2: 80, 3: 100, 4: 90, 5: 80, 6: 60, 7: 40, 8: 20, 9: 2, 10: 1,
};

const TOTAL_PAPERS = Object.values(COMPLEXITY_DISTRIBUTION).reduce((sum, count) => sum + count, 0);

// ============================================================================
// SCENARIO CONFIGURATIONS
// ============================================================================

interface ScenarioConfig {
  name: string;
  researchers: number;
  skillLevel: number; // 0-100
  buildingBonus: number; // 0, 0.2, 0.5, 1.0
  focusMultiplier: number; // 0.5-1.5
}

const SCENARIOS: ScenarioConfig[] = [
  // Baseline scenarios
  {
    name: '3 Researchers, Novice, No Buildings',
    researchers: 3,
    skillLevel: 10,
    buildingBonus: 0,
    focusMultiplier: 1.0,
  },
  {
    name: '3 Researchers, Skilled, Library',
    researchers: 3,
    skillLevel: 40,
    buildingBonus: 0.2,
    focusMultiplier: 1.2,
  },
  {
    name: '5 Researchers, Skilled, University',
    researchers: 5,
    skillLevel: 50,
    buildingBonus: 0.5,
    focusMultiplier: 1.2,
  },
  {
    name: '10 Researchers, Expert, Research Institute',
    researchers: 10,
    skillLevel: 80,
    buildingBonus: 1.0,
    focusMultiplier: 1.3,
  },

  // Comparison scenarios - varying researchers
  {
    name: 'Low Investment: 3 Casual Researchers',
    researchers: 3,
    skillLevel: 20,
    buildingBonus: 0,
    focusMultiplier: 0.8,
  },
  {
    name: 'Medium Investment: 7 Focused Researchers',
    researchers: 7,
    skillLevel: 50,
    buildingBonus: 0.5,
    focusMultiplier: 1.2,
  },
  {
    name: 'High Investment: 15 Dedicated Researchers',
    researchers: 15,
    skillLevel: 70,
    buildingBonus: 1.0,
    focusMultiplier: 1.5,
  },

  // Edge cases
  {
    name: 'Minimal: 1 Novice Researcher',
    researchers: 1,
    skillLevel: 5,
    buildingBonus: 0,
    focusMultiplier: 0.5,
  },
  {
    name: 'Maximum: 20 Master Researchers',
    researchers: 20,
    skillLevel: 100,
    buildingBonus: 1.0,
    focusMultiplier: 1.5,
  },
];

// ============================================================================
// CALCULATION
// ============================================================================

function calculateResearchTime(config: ScenarioConfig): number {
  const skillBonus = config.skillLevel / 10 * 0.1; // 0.1 per 10 skill points
  const speed = (1 + skillBonus) * (1 + config.buildingBonus) * config.researchers * config.focusMultiplier;

  let totalHours = 0;

  for (let complexity = 1; complexity <= 10; complexity++) {
    const count = COMPLEXITY_DISTRIBUTION[complexity] || 0;
    const baseHours = BASE_HOURS_BY_COMPLEXITY[complexity]!;
    const actualHours = baseHours / speed;
    totalHours += actualHours * count;
  }

  return totalHours;
}

// ============================================================================
// ASCII GRAPHING
// ============================================================================

function drawBarGraph(values: Array<{ label: string; value: number }>, maxWidth: number = 60): void {
  const maxValue = Math.max(...values.map(v => v.value));
  const scale = maxWidth / maxValue;

  for (const item of values) {
    const barLength = Math.round(item.value * scale);
    const bar = '█'.repeat(barLength);
    const valueStr = item.value.toFixed(0).padStart(5);
    console.log(`${item.label.padEnd(45)} ${bar} ${valueStr}h`);
  }
}

function drawComparisonTable(
  scenarios: ScenarioConfig[],
  results: number[]
): void {
  console.log('┌' + '─'.repeat(98) + '┐');
  console.log('│ Scenario'.padEnd(47) + '│ Researchers │ Skill │ Building │ Focus │ Time (h) │');
  console.log('├' + '─'.repeat(98) + '┤');

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i]!;
    const time = results[i]!;
    const buildingName = s.buildingBonus === 0 ? 'None' :
                        s.buildingBonus === 0.2 ? 'Library' :
                        s.buildingBonus === 0.5 ? 'University' : 'Institute';

    console.log(
      `│ ${s.name.padEnd(45)}` +
      `│ ${s.researchers.toString().padStart(11)} ` +
      `│ ${s.skillLevel.toString().padStart(5)} ` +
      `│ ${buildingName.padStart(8)} ` +
      `│ ${s.focusMultiplier.toFixed(1).padStart(5)} ` +
      `│ ${time.toFixed(0).padStart(8)} │`
    );
  }

  console.log('└' + '─'.repeat(98) + '┘');
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

function analyzeSensitivity(): void {
  console.log('\n' + '='.repeat(100));
  console.log('SENSITIVITY ANALYSIS - How each factor affects research time');
  console.log('='.repeat(100));

  // Baseline: 5 researchers, skill 50, university, focus 1.2
  const baseline: ScenarioConfig = {
    name: 'Baseline',
    researchers: 5,
    skillLevel: 50,
    buildingBonus: 0.5,
    focusMultiplier: 1.2,
  };
  const baselineTime = calculateResearchTime(baseline);

  console.log(`\nBaseline: ${baseline.name}`);
  console.log(`  ${baseline.researchers} researchers, skill ${baseline.skillLevel}, university, focus ${baseline.focusMultiplier}`);
  console.log(`  Time: ${baselineTime.toFixed(0)} hours (${(baselineTime / 16).toFixed(1)} days)\n`);

  // Vary researchers (1-20)
  console.log('\n1. VARYING RESEARCHER COUNT (holding skill=50, university, focus=1.2)');
  console.log('─'.repeat(100));
  const researcherCounts = [1, 3, 5, 7, 10, 15, 20];
  const researcherResults = researcherCounts.map(count => {
    const config = { ...baseline, researchers: count, name: `${count} researchers` };
    const time = calculateResearchTime(config);
    return { label: `${count.toString().padStart(2)} researchers`, value: time };
  });
  drawBarGraph(researcherResults);

  // Vary skill (0-100)
  console.log('\n2. VARYING SKILL LEVEL (holding 5 researchers, university, focus=1.2)');
  console.log('─'.repeat(100));
  const skillLevels = [5, 20, 40, 60, 80, 100];
  const skillResults = skillLevels.map(skill => {
    const config = { ...baseline, skillLevel: skill, name: `skill ${skill}` };
    const time = calculateResearchTime(config);
    return { label: `Skill ${skill.toString().padStart(3)}`, value: time };
  });
  drawBarGraph(skillResults);

  // Vary building (none -> institute)
  console.log('\n3. VARYING BUILDING BONUS (holding 5 researchers, skill=50, focus=1.2)');
  console.log('─'.repeat(100));
  const buildings = [
    { name: 'No building', bonus: 0 },
    { name: 'Library (+20%)', bonus: 0.2 },
    { name: 'University (+50%)', bonus: 0.5 },
    { name: 'Research Institute (+100%)', bonus: 1.0 },
  ];
  const buildingResults = buildings.map(b => {
    const config = { ...baseline, buildingBonus: b.bonus, name: b.name };
    const time = calculateResearchTime(config);
    return { label: b.name.padEnd(25), value: time };
  });
  drawBarGraph(buildingResults);

  // Vary focus (0.5-1.5)
  console.log('\n4. VARYING FOCUS MULTIPLIER (holding 5 researchers, skill=50, university)');
  console.log('─'.repeat(100));
  const focusLevels = [0.5, 0.8, 1.0, 1.2, 1.5];
  const focusResults = focusLevels.map(focus => {
    const config = { ...baseline, focusMultiplier: focus, name: `focus ${focus}` };
    const time = calculateResearchTime(config);
    const focusName = focus === 0.5 ? 'Distracted' :
                     focus === 0.8 ? 'Casual' :
                     focus === 1.0 ? 'Normal' :
                     focus === 1.2 ? 'Focused' : 'Dedicated';
    return { label: `${focusName} (${focus.toFixed(1)}×)`.padEnd(20), value: time };
  });
  drawBarGraph(focusResults);
}

// ============================================================================
// PROGRESSION ANALYSIS
// ============================================================================

function analyzeProgression(): void {
  console.log('\n' + '='.repeat(100));
  console.log('PROGRESSION ANALYSIS - Scaling from weak to strong research capability');
  console.log('='.repeat(100));

  const stages = [
    {
      name: 'Early Game (New Village)',
      researchers: 3,
      skillLevel: 10,
      buildingBonus: 0,
      focusMultiplier: 1.0,
    },
    {
      name: 'Early-Mid Game (Library Built)',
      researchers: 4,
      skillLevel: 25,
      buildingBonus: 0.2,
      focusMultiplier: 1.1,
    },
    {
      name: 'Mid Game (University Built)',
      researchers: 6,
      skillLevel: 45,
      buildingBonus: 0.5,
      focusMultiplier: 1.2,
    },
    {
      name: 'Late-Mid Game (Growing Expertise)',
      researchers: 8,
      skillLevel: 65,
      buildingBonus: 0.5,
      focusMultiplier: 1.3,
    },
    {
      name: 'Late Game (Research Institute)',
      researchers: 10,
      skillLevel: 85,
      buildingBonus: 1.0,
      focusMultiplier: 1.4,
    },
    {
      name: 'End Game (Peak Research)',
      researchers: 12,
      skillLevel: 100,
      buildingBonus: 1.0,
      focusMultiplier: 1.5,
    },
  ];

  console.log('\nProgression stages (if maintained at each level for full tree):');
  console.log('');

  const progressionResults = stages.map(stage => {
    const time = calculateResearchTime(stage);
    return { label: stage.name, value: time };
  });

  drawBarGraph(progressionResults, 50);

  console.log('\nDetailed breakdown:');
  drawComparisonTable(stages, progressionResults.map(r => r.value));
}

// ============================================================================
// STRATEGY COMPARISON
// ============================================================================

function compareStrategies(): void {
  console.log('\n' + '='.repeat(100));
  console.log('STRATEGY COMPARISON - Different approaches to research development');
  console.log('='.repeat(100));

  const strategies = [
    {
      name: '"Build Schools First" Strategy',
      description: 'Invest heavily in research buildings early, fewer researchers',
      config: {
        name: 'Schools First',
        researchers: 4,
        skillLevel: 60, // High skill from education focus
        buildingBonus: 1.0, // Research Institute built early
        focusMultiplier: 1.3, // Dedicated academics
      },
    },
    {
      name: '"Hire Researchers Fast" Strategy',
      description: 'Many researchers quickly, minimal infrastructure',
      config: {
        name: 'Researchers Fast',
        researchers: 12,
        skillLevel: 30, // Lower individual skill
        buildingBonus: 0.2, // Just basic library
        focusMultiplier: 1.1, // Some distraction from chaos
      },
    },
    {
      name: '"Balanced Growth" Strategy',
      description: 'Moderate researchers, moderate buildings',
      config: {
        name: 'Balanced',
        researchers: 7,
        skillLevel: 50,
        buildingBonus: 0.5, // University
        focusMultiplier: 1.2,
      },
    },
    {
      name: '"Elite Academy" Strategy',
      description: 'Few highly trained researchers, best facilities',
      config: {
        name: 'Elite Academy',
        researchers: 5,
        skillLevel: 90, // Master researchers
        buildingBonus: 1.0, // Research Institute
        focusMultiplier: 1.5, // Maximum dedication
      },
    },
    {
      name: '"Quantity Over Quality" Strategy',
      description: 'Maximum researchers, minimal training/facilities',
      config: {
        name: 'Quantity',
        researchers: 20,
        skillLevel: 20, // Basic training
        buildingBonus: 0, // No facilities
        focusMultiplier: 0.8, // Less focused due to scale
      },
    },
  ];

  console.log('\nStrategy Results:\n');

  for (const strategy of strategies) {
    const time = calculateResearchTime(strategy.config);
    const days = time / 16;
    console.log(`${strategy.name}`);
    console.log(`  ${strategy.description}`);
    console.log(`  Config: ${strategy.config.researchers} researchers, skill ${strategy.config.skillLevel}, ` +
                `building +${(strategy.config.buildingBonus * 100).toFixed(0)}%, focus ${strategy.config.focusMultiplier.toFixed(1)}×`);
    console.log(`  Result: ${time.toFixed(0)} hours (${days.toFixed(1)} days)\n`);
  }

  console.log('Visual comparison:');
  console.log('─'.repeat(100));
  const strategyResults = strategies.map(s => ({
    label: s.config.name,
    value: calculateResearchTime(s.config),
  }));
  drawBarGraph(strategyResults, 50);

  // Calculate multipliers for each strategy
  console.log('\n\nStrategy Multiplier Breakdown:');
  console.log('─'.repeat(100));
  console.log('Strategy'.padEnd(20) + ' │ Skill Mult │ Building Mult │ Researchers │ Focus │ Total Mult');
  console.log('─'.repeat(100));

  for (const strategy of strategies) {
    const c = strategy.config;
    const skillMult = 1 + (c.skillLevel / 10 * 0.1);
    const buildingMult = 1 + c.buildingBonus;
    const totalMult = skillMult * buildingMult * c.researchers * c.focusMultiplier;

    console.log(
      `${c.name.padEnd(20)} │ ` +
      `${skillMult.toFixed(2).padStart(10)} │ ` +
      `${buildingMult.toFixed(2).padStart(14)} │ ` +
      `${c.researchers.toString().padStart(11)} │ ` +
      `${c.focusMultiplier.toFixed(2).padStart(5)} │ ` +
      `${totalMult.toFixed(1).padStart(10)}×`
    );
  }

  console.log('\n\nStrategy Analysis:');
  console.log('─'.repeat(100));
  console.log(`
1. "BUILD SCHOOLS FIRST" (4 researchers, institute, high skill)
   - Total multiplier: ${(1.6 * 2.0 * 4 * 1.3).toFixed(1)}× base speed
   - Good for: Small populations, long-term planning
   - Risk: Slow start before buildings complete
   - Best when: You have limited population but resources for buildings

2. "HIRE RESEARCHERS FAST" (12 researchers, library, medium skill)
   - Total multiplier: ${(1.3 * 1.2 * 12 * 1.1).toFixed(1)}× base speed
   - Good for: Large populations, immediate results
   - Risk: Inefficient resource use without infrastructure
   - Best when: You have surplus population and need fast results

3. "BALANCED GROWTH" (7 researchers, university, medium skill)
   - Total multiplier: ${(1.5 * 1.5 * 7 * 1.2).toFixed(1)}× base speed
   - Good for: Flexible approach, adapts to circumstances
   - Risk: Not optimized for any specific constraint
   - Best when: Unsure of long-term needs, want safety

4. "ELITE ACADEMY" (5 researchers, institute, master skill)
   - Total multiplier: ${(1.9 * 2.0 * 5 * 1.5).toFixed(1)}× base speed
   - Good for: Quality over quantity, prestige focus
   - Risk: Vulnerable to researcher loss/turnover
   - Best when: You can attract/retain top talent

5. "QUANTITY OVER QUALITY" (20 researchers, no buildings, low skill)
   - Total multiplier: ${(1.2 * 1.0 * 20 * 0.8).toFixed(1)}× base speed
   - Good for: Emergency research push, wartime
   - Risk: Poor long-term efficiency, researcher burnout
   - Best when: Desperate need for breakthrough, population surplus
  `);
}

// ============================================================================
// OPTIMIZATION RECOMMENDATIONS
// ============================================================================

function analyzeOptimization(): void {
  console.log('\n' + '='.repeat(100));
  console.log('OPTIMIZATION ANALYSIS - Best ways to speed up research');
  console.log('='.repeat(100));

  // Start from a weak position
  const starting: ScenarioConfig = {
    name: 'Starting Position',
    researchers: 3,
    skillLevel: 20,
    buildingBonus: 0,
    focusMultiplier: 1.0,
  };
  const startingTime = calculateResearchTime(starting);

  console.log(`\nStarting Position: ${startingTime.toFixed(0)} hours (${(startingTime / 16).toFixed(1)} days)`);
  console.log(`  3 researchers, skill 20, no building, normal focus\n`);

  // Test improvements
  const improvements = [
    {
      name: '+2 researchers (3→5)',
      config: { ...starting, researchers: 5 },
    },
    {
      name: '+20 skill (20→40)',
      config: { ...starting, skillLevel: 40 },
    },
    {
      name: 'Build Library (+20%)',
      config: { ...starting, buildingBonus: 0.2 },
    },
    {
      name: 'Increase focus (1.0→1.3)',
      config: { ...starting, focusMultiplier: 1.3 },
    },
  ];

  console.log('Single improvement impact:');
  console.log('─'.repeat(100));

  for (const improvement of improvements) {
    const newTime = calculateResearchTime(improvement.config);
    const savings = startingTime - newTime;
    const percentReduction = (savings / startingTime * 100);
    console.log(`${improvement.name.padEnd(30)}: ${newTime.toFixed(0).padStart(6)}h  (−${savings.toFixed(0)}h, −${percentReduction.toFixed(1)}%)`);
  }

  console.log('\nCombination strategies:');
  console.log('─'.repeat(100));

  const combos = [
    {
      name: 'Library + 1 researcher',
      config: { ...starting, researchers: 4, buildingBonus: 0.2 },
    },
    {
      name: 'Train up skill (+30)',
      config: { ...starting, skillLevel: 50 },
    },
    {
      name: 'All improvements',
      config: {
        ...starting,
        researchers: 5,
        skillLevel: 40,
        buildingBonus: 0.2,
        focusMultiplier: 1.3,
      },
    },
  ];

  for (const combo of combos) {
    const newTime = calculateResearchTime(combo.config);
    const savings = startingTime - newTime;
    const percentReduction = (savings / startingTime * 100);
    console.log(`${combo.name.padEnd(30)}: ${newTime.toFixed(0).padStart(6)}h  (−${savings.toFixed(0)}h, −${percentReduction.toFixed(1)}%)`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('\n' + '█'.repeat(100));
console.log('RESEARCH TIME SCENARIO ANALYSIS'.padStart(65));
console.log(`Total Papers: ${TOTAL_PAPERS}`.padStart(61));
console.log('█'.repeat(100));

// Run all scenarios
console.log('\n' + '='.repeat(100));
console.log('SCENARIO COMPARISON - Different research configurations');
console.log('='.repeat(100));

const results = SCENARIOS.map(scenario => calculateResearchTime(scenario));

drawComparisonTable(SCENARIOS, results);

console.log('\nVisual comparison (time in hours):');
console.log('─'.repeat(100));

const graphData = SCENARIOS.map((scenario, i) => ({
  label: scenario.name,
  value: results[i]!,
}));

drawBarGraph(graphData, 40);

// Sensitivity analysis
analyzeSensitivity();

// Progression analysis
analyzeProgression();

// Strategy comparison
compareStrategies();

// Optimization recommendations
analyzeOptimization();

// Summary
console.log('\n' + '='.repeat(100));
console.log('SUMMARY');
console.log('='.repeat(100));
console.log(`
Key Findings:

1. RESEARCHER COUNT has the biggest linear impact
   - 1 researcher → 3 researchers = 3× speed
   - 3 researchers → 10 researchers = 3.33× speed
   - Diminishing returns are minimal (each researcher adds same speed)

2. BUILDING BONUSES multiply total speed
   - Library (+20%) = 1.2× speed boost
   - University (+50%) = 1.5× speed boost
   - Research Institute (+100%) = 2× speed boost
   - Buildings + researchers compound (5 researchers + institute = 10× baseline speed)

3. SKILL PROGRESSION provides steady gains
   - Skill 10 → 50 = ~1.5× speed
   - Skill 50 → 100 = ~2× speed
   - High skill (80+) roughly doubles research speed

4. FOCUS MULTIPLIER is often overlooked
   - Dedicated researchers (1.5×) vs distracted (0.5×) = 3× difference
   - Can be achieved through job assignments, interests, needs satisfaction

OPTIMIZATION PRIORITIES:
1. Build research buildings ASAP (biggest multiplicative boost)
2. Assign more researchers (linear scaling, no diminishing returns)
3. Train researchers in relevant fields (steady improvement)
4. Keep researchers happy/focused (easy 1.2-1.5× boost)

REALISTIC TIMELINE (with natural progression):
- Starting (3 researchers, low skill): ~${results[0]!.toFixed(0)}h (${(results[0]! / 16).toFixed(0)} days)
- Mid-game (7 researchers, university): ~${results[5]!.toFixed(0)}h (${(results[5]! / 16).toFixed(0)} days)
- End-game (15 researchers, institute): ~${results[6]!.toFixed(0)}h (${(results[6]! / 16).toFixed(0)} days)
`);

console.log('='.repeat(100));
