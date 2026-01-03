# Research Paper System - Complete Specification

## Core Concept: Research Sets with Uncertain Paths

Research papers form **sets** where the path to discovery is uncertain. Like real-world AI research (perceptron → LSTM → attention → transformer → LLMs), researchers don't know which papers will be crucial until the technology unlocks.

### Key Principles

1. **Papers belong to sets** - A set contains all papers related to a technology
2. **N-of-M unlock logic** - Technology unlocks when N papers from the set are discovered (not all M papers needed)
3. **Hidden paths** - Researchers don't know which papers are "required" until after unlock
4. **Everything is a paper** - Cooking recipes, spell discoveries, herb identification, building techniques
5. **Textbooks enable bulk learning** - Universities compile papers into textbooks
6. **Skill-based authoring** - Higher skill = higher % chance to publish next paper in graph

## Data Structure

```typescript
interface ResearchPaper {
  // Identity
  paperId: string;
  title: string;
  field: ResearchField;

  // Set membership - papers belong to one or more sets
  paperSets: string[];  // e.g., ['language_models_set', 'attention_mechanisms_set']

  // Prerequisites - papers that must be READ to AUTHOR this one
  prerequisitePapers: string[];

  // Complexity affects skill grants and authoring chance
  complexity: number;  // 1-10

  // Reading requirements
  minimumAge: AgeCategory;
  minimumSkills?: Record<string, number>;

  // Skill grants (based on complexity)
  skillGrants: Record<string, number>;  // Calculated from complexity

  // Unlock contribution
  contributesTo: TechnologyUnlock[];  // What this paper helps unlock

  // Content
  description: string;  // With footnotes!
  abstract: string;

  // Authorship
  authorId?: string;
  publicationTick?: number;
  published: boolean;
}

interface ResearchSet {
  setId: string;
  name: string;
  description: string;
  field: ResearchField;

  // All papers in this set
  allPapers: string[];  // Total M papers

  // Unlock logic - which technologies unlock from this set
  unlocks: SetUnlockCondition[];
}

interface SetUnlockCondition {
  technologyId: string;

  // N-of-M logic
  papersRequired: number;  // N - how many papers needed
  // Total papers in set: M (from ResearchSet.allPapers.length)

  // Optional: specific required papers (some papers might be mandatory)
  mandatoryPapers?: string[];  // Must include these specific papers

  // What unlocks
  grants: TechnologyUnlock[];
}

interface Textbook {
  textbookId: string;
  title: string;
  compiledPapers: string[];  // Papers compiled into this textbook

  // Reading this textbook = reading all papers at once
  minimumAge: AgeCategory;
  readingTime: number;  // Longer than individual papers but shorter than reading all

  // Published by
  publishedBy: string;  // University entity ID
  publicationTick: number;
}

interface UniversityComponent {
  type: 'university';

  // Can publish textbooks
  publishedTextbooks: string[];

  // Publishing capabilities
  canPublishTextbooks: boolean;
  textbookProductionRate: number;  // Ticks per textbook
}

interface ResearchProductionChance {
  // After reaching skill thresholds, % chance to author new papers
  skillThreshold: number;
  baseChance: number;  // % per tick of attempting research

  // Complexity affects chance
  complexityModifier: number;  // Higher complexity = lower chance
}
```

## Example: Language Models Set

```typescript
const LANGUAGE_MODELS_SET: ResearchSet = {
  setId: 'language_models',
  name: 'Language Model Research',
  description: 'The collective research leading to modern language models',
  field: 'arcane',  // or 'experimental' for clarketech

  // All papers in the set (M = 8)
  allPapers: [
    'perceptron_theory',
    'backpropagation',
    'recurrent_networks',
    'lstm_networks',
    'attention_mechanism',
    'transformer_architecture',
    'pretraining_methods',
    'scaling_laws'
  ],

  unlocks: [
    {
      technologyId: 'basic_neural_nets',
      papersRequired: 2,  // Need 2 of 8 papers
      mandatoryPapers: ['perceptron_theory'],  // This one is mandatory
      grants: [
        { type: 'building', buildingId: 'neural_network_lab' },
        { type: 'ability', abilityId: 'train_simple_models' }
      ]
    },
    {
      technologyId: 'advanced_language_models',
      papersRequired: 5,  // Need 5 of 8 papers
      mandatoryPapers: ['transformer_architecture', 'attention_mechanism'],
      grants: [
        { type: 'building', buildingId: 'language_model_datacenter' },
        { type: 'ability', abilityId: 'train_language_models' },
        { type: 'item', itemId: 'llm_api_key' }
      ]
    }
  ]
};

// Example papers in the set
const PERCEPTRON_PAPER: ResearchPaper = {
  paperId: 'perceptron_theory',
  title: 'The Perceptron: A Probabilistic Model for Information Storage',
  field: 'arcane',
  paperSets: ['language_models', 'neural_network_fundamentals'],
  prerequisitePapers: [],  // Foundation paper
  complexity: 3,
  minimumAge: 'adult',
  skillGrants: { neural_networks: 10, mathematics: 5 },
  contributesTo: [
    { setId: 'language_models', technologyId: 'basic_neural_nets' }
  ],
  description: `A foundational paper on artificial neurons...`,
  abstract: 'Introduces the concept of the perceptron.',
  published: false
};

const TRANSFORMER_PAPER: ResearchPaper = {
  paperId: 'transformer_architecture',
  title: 'Attention Is All You Need',
  field: 'arcane',
  paperSets: ['language_models', 'attention_mechanisms'],
  prerequisitePapers: ['attention_mechanism', 'recurrent_networks'],
  complexity: 8,  // Very complex
  minimumAge: 'elder',
  minimumSkills: { neural_networks: 30, mathematics: 25 },
  skillGrants: { neural_networks: 40, mathematics: 20 },  // High skill grant
  contributesTo: [
    { setId: 'language_models', technologyId: 'advanced_language_models' }
  ],
  description: `Revolutionary architecture replacing recurrence with attention...`,
  abstract: 'Proposes transformer architecture using only attention mechanisms.',
  published: false
};
```

## Example: Cooking Recipe as Research

```typescript
const PERFECT_BREAD_RECIPE: ResearchPaper = {
  paperId: 'perfect_bread_recipe',
  title: 'On the Mastery of Gluten Development: The Perfect Loaf',
  field: 'cuisine',
  paperSets: ['bread_baking', 'advanced_cooking'],
  prerequisitePapers: ['yeast_fermentation', 'flour_chemistry'],
  complexity: 5,
  minimumAge: 'adult',
  minimumSkills: { cooking: 20 },
  skillGrants: { cooking: 15, chemistry: 5 },
  contributesTo: [
    { setId: 'bread_baking', technologyId: 'artisan_baking' }
  ],
  description: `A treatise on kneading, proofing, and achieving the perfect crust*...

*The author spent seventeen years perfecting this recipe. Their family ate a lot of bread. Some of it was good.`,
  abstract: 'Complete methodology for producing superior bread through controlled gluten development.',
  published: false,

  // IMPORTANT: This paper unlocks the actual recipe
  unlocks: [
    { type: 'recipe', recipeId: 'perfect_bread' }
  ]
};

// The BREAD_BAKING set requires 3 of 5 papers to unlock artisan baking
const BREAD_BAKING_SET: ResearchSet = {
  setId: 'bread_baking',
  name: 'The Science of Bread',
  field: 'cuisine',
  allPapers: [
    'yeast_fermentation',
    'flour_chemistry',
    'perfect_bread_recipe',
    'sourdough_cultivation',
    'steam_injection_technique'
  ],
  unlocks: [
    {
      technologyId: 'artisan_baking',
      papersRequired: 3,  // Need 3 of 5
      grants: [
        { type: 'building', buildingId: 'artisan_bakery' },
        { type: 'ability', abilityId: 'master_baker' }
      ]
    }
  ]
};
```

## Research Production Mechanics

### Skill-Based Authoring Chance

Once an agent reaches a skill threshold, they have a % chance per tick to author new papers:

```typescript
function calculateResearchProductionChance(
  agent: Entity,
  paper: ResearchPaper
): number {
  const skill = agent.getSkill(paper.field);

  // Threshold table
  const thresholds = [
    { skill: 10, baseChance: 0.001 },   // 0.1% per tick
    { skill: 25, baseChance: 0.005 },   // 0.5% per tick
    { skill: 50, baseChance: 0.01 },    // 1% per tick
    { skill: 75, baseChance: 0.02 },    // 2% per tick
    { skill: 100, baseChance: 0.05 }    // 5% per tick
  ];

  const threshold = thresholds
    .reverse()
    .find(t => skill >= t.skill);

  if (!threshold) return 0;

  // Complexity modifier (harder papers = lower chance)
  const complexityPenalty = 1 / paper.complexity;

  return threshold.baseChance * complexityPenalty;
}
```

### Textbook Publishing

Universities can compile multiple papers into textbooks:

```typescript
function publishTextbook(
  university: Entity,
  papers: ResearchPaper[],
  title: string
): Textbook {
  return {
    textbookId: generateId(),
    title,
    compiledPapers: papers.map(p => p.paperId),
    minimumAge: Math.max(...papers.map(p => ageToNumber(p.minimumAge))),
    readingTime: papers.length * 50,  // 50 ticks per paper, but bulk discount
    publishedBy: university.id,
    publicationTick: getCurrentTick()
  };
}

// Reading a textbook = reading all papers at once
function readTextbook(agent: Entity, textbook: Textbook): void {
  for (const paperId of textbook.compiledPapers) {
    const paper = getPaper(paperId);
    // Grant skills
    grantSkills(agent, paper.skillGrants);
    // Mark as read
    agent.knowledge.readPapers.add(paperId);
  }
}
```

## Discovery Uncertainty

Agents don't know which papers are "required" for a technology:

```typescript
// What agents see
function getVisiblePapers(agent: Entity, setId: string): ResearchPaper[] {
  const set = getResearchSet(setId);

  // Show papers where prerequisites are met
  return set.allPapers
    .map(paperId => getPaper(paperId))
    .filter(paper => {
      // Can read if prerequisites met
      return paper.prerequisitePapers.every(prereq =>
        agent.knowledge.readPapers.has(prereq)
      );
    });
}

// Agents DON'T see:
// - How many papers are required (the N in N-of-M)
// - Which papers are mandatory
// - Which sets the paper belongs to (beyond the primary field)

// This creates natural exploration and uncertainty
// Just like real research!
```

## Integration Requirements

1. **All unlockables become papers**:
   - Cooking recipes → cuisine papers
   - Herb discoveries → nature papers
   - Building techniques → construction papers
   - Spell discoveries → arcane papers
   - New items → crafting papers

2. **Sets map to technologies**:
   - Each technology has a set
   - Sets can overlap (papers can be in multiple sets)
   - N-of-M logic prevents "one true path"

3. **Universities are key**:
   - Publish textbooks for bulk learning
   - Enable teenagers to catch up to frontier
   - Create "standard curriculum"

4. **Complexity matters**:
   - Higher complexity = more skill grants
   - Higher complexity = lower authoring chance
   - Higher complexity = longer reading time

## Content Creation Strategy

For each unlockable in the game:
1. Identify the technology/unlock
2. Create a research set (3-8 papers)
3. Define N-of-M unlock condition
4. Write papers with footnotes
5. Assign complexity
6. Define prerequisites

This creates hundreds of papers but makes research feel like real discovery!
