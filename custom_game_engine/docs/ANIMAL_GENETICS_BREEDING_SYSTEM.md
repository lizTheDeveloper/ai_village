# Animal Genetics & Breeding System - Deep Spec

## Philosophy

Genetics should create **emergent depth** through simple rules:
- **Discovery**: Agents learn genetics through breeding experiments
- **Mastery**: Selective breeding improves livestock over generations
- **Legacy**: Famous bloodlines become part of village history
- **Pride**: Breeding achievements create emotional moments
- **Economy**: Valuable genetics drive trade and cooperation
- **Stories**: "My prize cow descended from the founding herd"

## Core Genetics System

### DNA Structure

Every animal has a genome composed of gene pairs (alleles):

```typescript
type Allele = 'dominant' | 'recessive';
type GeneValue = number; // 0-100

interface Gene {
  trait: string;           // What this gene affects
  allele1: GeneValue;      // From mother
  allele2: GeneValue;      // From father
  dominance: Allele;       // Which allele dominates
  expression: number;      // Final expressed value (0-100)
}

interface Genome {
  // Physical traits (visible)
  size: Gene;              // Animal size
  color: Gene;             // Coat/feather color
  pattern: Gene;           // Spots, stripes, solid
  build: Gene;             // Stocky, lean, muscular

  // Production traits (invisible but measurable)
  eggProduction: Gene;     // Eggs per day (chickens)
  milkYield: Gene;         // Milk per milking (cows)
  woolQuality: Gene;       // Wool quality (sheep)
  growthRate: Gene;        // How fast they grow

  // Health traits (invisible)
  constitution: Gene;      // Base health/disease resistance
  longevity: Gene;         // Lifespan modifier
  fertility: Gene;         // Breeding success rate
  temperament: Gene;       // Aggression vs docility

  // Special traits (rare, emergent)
  specialTraits: SpecialTrait[];
}

interface SpecialTrait {
  id: string;
  name: string;
  rarity: number;          // 0-1, how rare
  effect: TraitEffect;
  discoveredBy?: string;   // Agent who first bred it
  inheritancePattern: 'recessive' | 'dominant' | 'polygenic';
}

// Example special traits
const SPECIAL_TRAITS = {
  // Beneficial
  golden_egg: {
    id: 'golden_egg',
    name: 'Golden Eggs',
    rarity: 0.001,           // 0.1% chance
    effect: { eggValue: 5x, eggProduction: -0.2 },
    inheritancePattern: 'recessive'
  },
  exceptional_milk: {
    id: 'exceptional_milk',
    name: 'Exceptional Milk',
    rarity: 0.01,
    effect: { milkQuality: +50, milkYield: +1.5x },
    inheritancePattern: 'polygenic'
  },
  gentle_giant: {
    id: 'gentle_giant',
    name: 'Gentle Giant',
    rarity: 0.005,
    effect: { size: +1.5x, temperament: 'docile', strength: +2x },
    inheritancePattern: 'dominant'
  },
  fast_grower: {
    id: 'fast_grower',
    name: 'Fast Grower',
    rarity: 0.02,
    effect: { growthRate: +2x, adultSize: -0.1 },
    inheritancePattern: 'recessive'
  },

  // Detrimental (mutations)
  weak_bones: {
    id: 'weak_bones',
    name: 'Weak Constitution',
    rarity: 0.01,
    effect: { health: -20, injuryRisk: +0.5 },
    inheritancePattern: 'recessive'
  },
  infertile: {
    id: 'infertile',
    name: 'Low Fertility',
    rarity: 0.015,
    effect: { fertility: -50 },
    inheritancePattern: 'recessive'
  }
};
```

### Gene Expression

How genes combine to create traits:

```typescript
function expressGene(gene: Gene): number {
  const { allele1, allele2, dominance } = gene;

  switch (dominance) {
    case 'dominant':
      // Higher value dominates
      return Math.max(allele1, allele2);

    case 'recessive':
      // Both must be high for high expression
      return Math.min(allele1, allele2);

    case 'codominant':
      // Blend of both
      return (allele1 + allele2) / 2;

    case 'incomplete':
      // Weighted blend favoring dominant
      const dominant = Math.max(allele1, allele2);
      const recessive = Math.min(allele1, allele2);
      return dominant * 0.7 + recessive * 0.3;
  }
}

// Real example: Size gene
const sizeGene: Gene = {
  trait: 'size',
  allele1: 80,  // Mother was large
  allele2: 40,  // Father was small
  dominance: 'dominant',
  expression: expressGene() // = 80 (large)
};

// Real example: Milk yield (polygenic)
const milkGene: Gene = {
  trait: 'milkYield',
  allele1: 90,  // Exceptional mother
  allele2: 50,  // Average father
  dominance: 'incomplete',
  expression: expressGene() // = 78 (good, but not exceptional)
};
```

### Phenotype (Observable Traits)

What you actually see and measure:

```typescript
interface Phenotype {
  // Visual appearance
  visual: {
    size: number;          // 0.5x - 2.0x base size
    color: string;         // 'brown', 'white', 'black', 'spotted'
    pattern: string;       // 'solid', 'striped', 'patched'
    build: string;         // 'lean', 'stocky', 'muscular'
  };

  // Performance metrics
  performance: {
    eggRate: number;       // Eggs per day
    milkYield: number;     // Liters per milking
    woolQuality: number;   // Quality grade 0-100
    growthSpeed: number;   // Days to reach adult
  };

  // Health indicators
  health: {
    baseHealth: number;    // Starting health
    diseaseResist: number; // 0-100
    lifeExpectancy: number; // Days
    fertility: number;     // 0-100
  };

  // Behavioral
  behavior: {
    temperament: 'aggressive' | 'neutral' | 'docile' | 'friendly';
    trainability: number;  // How easy to train
    independence: number;  // How much they need care
  };

  // Special
  specialTraits: SpecialTrait[];
  uniqueFeatures: string[]; // Rare combinations
}

function calculatePhenotype(genome: Genome, environment: Environment): Phenotype {
  // Genetics + environment = phenotype
  // "Nature + nurture"

  const geneticBase = expressAllGenes(genome);
  const environmentalMod = calculateEnvironmentEffects(environment);

  return {
    visual: {
      size: geneticBase.size * environmentalMod.nutrition,
      color: determineColor(genome.color),
      pattern: determinePattern(genome.pattern),
      build: determineBuild(genome.build)
    },
    performance: {
      eggRate: geneticBase.eggProduction * environmentalMod.diet * environmentalMod.stress,
      milkYield: geneticBase.milkYield * environmentalMod.diet * environmentalMod.health,
      woolQuality: geneticBase.woolQuality * environmentalMod.nutrition,
      growthSpeed: geneticBase.growthRate * environmentalMod.nutrition
    },
    health: {
      baseHealth: geneticBase.constitution * environmentalMod.housing,
      diseaseResist: geneticBase.constitution,
      lifeExpectancy: geneticBase.longevity * environmentalMod.care,
      fertility: geneticBase.fertility * environmentalMod.stress
    },
    behavior: {
      temperament: determineTemperament(genome.temperament),
      trainability: geneticBase.temperament,
      independence: 100 - geneticBase.temperament
    },
    specialTraits: genome.specialTraits
  };
}
```

## Breeding Mechanics

### Mendelian Inheritance

```typescript
function breedAnimals(
  mother: AnimalComponent,
  father: AnimalComponent,
  world: World
): BreedingResult {
  // 1. Check compatibility
  if (!canBreed(mother, father)) {
    return { success: false, reason: getBreedingBlocker(mother, father) };
  }

  // 2. Calculate success chance
  const fertilityChance = (
    (mother.phenotype.health.fertility / 100) *
    (father.phenotype.health.fertility / 100) *
    (1 - calculateInbreedingPenalty(mother, father))
  );

  if (Math.random() > fertilityChance) {
    return {
      success: false,
      reason: 'Breeding unsuccessful',
      insight: 'Low fertility or too closely related'
    };
  }

  // 3. Generate offspring genome
  const offspring = createOffspring(mother, father);

  // 4. Record in breeding registry
  world.breedingRegistry.recordBreeding({
    mother: mother.id,
    father: father.id,
    offspring: offspring.id,
    timestamp: world.currentTick,
    breeder: mother.ownerId
  });

  // 5. Create emotional moment for owner
  if (mother.ownerId) {
    const agent = world.getEntity(mother.ownerId);

    // Joy from successful breeding
    agent.mood += 20;

    agent.createMemory({
      type: 'joyful',
      content: `${mother.name} gave birth to ${offspring.name}! ${describeOffspring(offspring)}`,
      emotionalValence: 0.9,
      emotionalIntensity: 0.8,
      associatedEntities: [mother.id, father.id, offspring.id]
    });

    // Pride if offspring is exceptional
    if (isExceptional(offspring)) {
      agent.mood += 10;
      agent.createMemory({
        type: 'achievement',
        content: `${offspring.name} shows exceptional traits! My breeding is paying off.`,
        emotionalValence: 0.95
      });
    }
  }

  return {
    success: true,
    offspring,
    message: `${mother.name} gave birth to ${offspring.name}!`
  };
}

function createOffspring(
  mother: AnimalComponent,
  father: AnimalComponent
): AnimalComponent {
  const genome: Genome = {
    // For each trait, inherit one allele from each parent
    size: inheritGene(mother.genome.size, father.genome.size),
    color: inheritGene(mother.genome.color, father.genome.color),
    pattern: inheritGene(mother.genome.pattern, father.genome.pattern),
    eggProduction: inheritGene(mother.genome.eggProduction, father.genome.eggProduction),
    milkYield: inheritGene(mother.genome.milkYield, father.genome.milkYield),
    constitution: inheritGene(mother.genome.constitution, father.genome.constitution),
    longevity: inheritGene(mother.genome.longevity, father.genome.longevity),
    fertility: inheritGene(mother.genome.fertility, father.genome.fertility),
    temperament: inheritGene(mother.genome.temperament, father.genome.temperament),
    // ... all other genes
  };

  // Check for mutations
  genome.specialTraits = checkForMutations(mother, father, genome);

  // Calculate phenotype from genome
  const phenotype = calculatePhenotype(genome, getCurrentEnvironment());

  return createAnimal({
    speciesId: mother.speciesId,
    genome,
    phenotype,
    lifeStage: 'infant',
    parents: {
      mother: mother.id,
      father: father.id
    }
  });
}

function inheritGene(motherGene: Gene, fatherGene: Gene): Gene {
  // Randomly select one allele from each parent
  const motherAllele = Math.random() < 0.5 ? motherGene.allele1 : motherGene.allele2;
  const fatherAllele = Math.random() < 0.5 ? fatherGene.allele1 : fatherGene.allele2;

  // Apply mutation chance (1%)
  const mutation = Math.random() < 0.01;

  return {
    trait: motherGene.trait,
    allele1: mutation ? mutateAllele(motherAllele) : motherAllele,
    allele2: mutation ? mutateAllele(fatherAllele) : fatherAllele,
    dominance: motherGene.dominance,
    expression: 0 // Will be calculated
  };
}

function mutateAllele(value: number): number {
  // Small random change (+/- 20)
  const change = (Math.random() - 0.5) * 40;
  return Math.max(0, Math.min(100, value + change));
}

function checkForMutations(
  mother: AnimalComponent,
  father: AnimalComponent,
  genome: Genome
): SpecialTrait[] {
  const traits: SpecialTrait[] = [];

  // Inherit special traits from parents
  for (const trait of [...mother.genome.specialTraits, ...father.genome.specialTraits]) {
    const inheritChance = trait.inheritancePattern === 'dominant' ? 0.5 : 0.25;
    if (Math.random() < inheritChance) {
      traits.push(trait);
    }
  }

  // New mutation chance
  for (const [id, trait] of Object.entries(SPECIAL_TRAITS)) {
    if (Math.random() < trait.rarity) {
      traits.push(trait);

      // DISCOVERY MOMENT!
      const breeder = world.getEntity(mother.ownerId);
      breeder.mood += 30;
      breeder.createMemory({
        type: 'discovery',
        content: `I discovered a new trait: ${trait.name}! This is incredible!`,
        emotionalValence: 1.0,
        emotionalIntensity: 1.0
      });

      // Record in world genetics knowledge
      world.geneticsKnowledge.recordDiscovery({
        trait: trait,
        discoveredBy: breeder.id,
        discoveredAt: world.currentTick,
        animal: offspring.id
      });
    }
  }

  return traits;
}
```

### Inbreeding & Genetic Diversity

```typescript
interface GeneticDiversity {
  inbreedingCoefficient: number; // 0-1, higher = more inbred
  heterozygosity: number;        // 0-1, genetic variation
  commonAncestor?: string;       // ID of common ancestor
  generationsApart: number;      // How far back common ancestor
}

function calculateInbreedingPenalty(
  animal1: AnimalComponent,
  animal2: AnimalComponent
): number {
  const kinship = calculateKinship(animal1, animal2);

  // Inbreeding coefficient (F)
  const F = kinship;

  // Effects of inbreeding
  const penalties = {
    fertility: F * 0.5,        // Up to -50% fertility
    health: F * 0.3,           // Up to -30% health
    vigor: F * 0.4,            // Up to -40% growth/productivity
    mutationRate: F * 2.0      // 2x more mutations
  };

  return penalties;
}

function calculateKinship(
  animal1: AnimalComponent,
  animal2: AnimalComponent
): number {
  // Find common ancestors
  const ancestors1 = getAncestors(animal1, 5); // 5 generations
  const ancestors2 = getAncestors(animal2, 5);

  const commonAncestors = ancestors1.filter(a =>
    ancestors2.some(b => b.id === a.id)
  );

  if (commonAncestors.length === 0) {
    return 0; // Unrelated
  }

  // Calculate kinship based on closest common ancestor
  const closest = commonAncestors.reduce((min, ancestor) => {
    const gen1 = getGenerationDistance(animal1, ancestor);
    const gen2 = getGenerationDistance(animal2, ancestor);
    const totalGen = gen1 + gen2;
    return totalGen < min.gen ? { ancestor, gen: totalGen } : min;
  }, { ancestor: null, gen: Infinity });

  // Kinship coefficient
  // Siblings: 0.25, Half-siblings: 0.125, Cousins: 0.0625
  const kinship = Math.pow(0.5, closest.gen + 1);

  return kinship;
}

// Hybrid vigor (outcrossing bonus)
function calculateHybridVigor(
  animal1: AnimalComponent,
  animal2: AnimalComponent
): number {
  const kinship = calculateKinship(animal1, animal2);

  // Unrelated animals = bonus
  if (kinship === 0) {
    return {
      fertility: 1.2,      // +20% fertility
      health: 1.15,        // +15% health
      vigor: 1.25,         // +25% growth/productivity
      diseaseResist: 1.3   // +30% disease resistance
    };
  }

  return { fertility: 1, health: 1, vigor: 1, diseaseResist: 1 };
}
```

## Selective Breeding & Strategy

### Breeding Programs

```typescript
interface BreedingProgram {
  id: string;
  name: string;
  breeder: string;        // Agent ID
  species: string;

  // Goals
  goals: {
    trait: string;
    targetValue: number;
    priority: number;     // Weight in selection
  }[];

  // Current stock
  breeding: string[];     // Animal IDs in breeding program
  retired: string[];      // Old breeders
  offspring: string[];    // All offspring produced

  // Results
  generations: number;
  bestPerformers: {
    trait: string;
    animalId: string;
    value: number;
  }[];

  // Knowledge
  discoveries: SpecialTrait[];
  insights: BreedingInsight[];
}

interface BreedingInsight {
  generation: number;
  insight: string;
  data: {
    trait: string;
    pattern: 'improving' | 'plateaued' | 'regressing';
    rate: number;
  };
}

// Agent creates breeding program
function createBreedingProgram(
  agent: Agent,
  goals: BreedingGoal[]
): BreedingProgram {
  const program: BreedingProgram = {
    id: generateId(),
    name: await llm.generate({
      prompt: `
You're starting a breeding program for ${goals[0].species}.
Your goals: ${goals.map(g => `${g.trait}: ${g.targetValue}`).join(', ')}

What do you name your breeding program?
Examples: "Golden Egg Project", "Bessie's Line", "Swift Wind Stables"

Program name:`,
      personality: agent.personality
    }),
    breeder: agent.id,
    species: goals[0].species,
    goals: goals,
    breeding: [],
    retired: [],
    offspring: [],
    generations: 0,
    bestPerformers: [],
    discoveries: [],
    insights: []
  };

  // Emotional investment
  agent.mood += 10;
  agent.createMemory({
    type: 'meaningful',
    content: `I started my breeding program: ${program.name}. This will be my legacy.`,
    emotionalValence: 0.7
  });

  return program;
}

// Selection algorithm
function selectBreedingPair(
  program: BreedingProgram,
  availableAnimals: AnimalComponent[]
): { mother: AnimalComponent, father: AnimalComponent } {
  // Score each animal against program goals
  const scored = availableAnimals.map(animal => ({
    animal,
    score: scoreAgainstGoals(animal, program.goals)
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Select top performers
  const candidates = scored.slice(0, 10); // Top 10

  // Find best pairing (maximize offspring potential, minimize inbreeding)
  let bestPair: { mother: any, father: any, score: number } = null;

  for (const mother of candidates) {
    for (const father of candidates) {
      if (mother.animal.id === father.animal.id) continue;
      if (mother.animal.sex === father.animal.sex) continue;

      const inbreeding = calculateKinship(mother.animal, father.animal);
      const hybridVigor = calculateHybridVigor(mother.animal, father.animal);
      const offspringPotential = predictOffspring(mother.animal, father.animal, program.goals);

      const pairScore = (
        (mother.score + father.score) / 2 * 0.4 +
        offspringPotential * 0.4 +
        (1 - inbreeding) * 0.1 +
        hybridVigor.vigor * 0.1
      );

      if (!bestPair || pairScore > bestPair.score) {
        bestPair = { mother: mother.animal, father: father.animal, score: pairScore };
      }
    }
  }

  return { mother: bestPair.mother, father: bestPair.father };
}

function scoreAgainstGoals(
  animal: AnimalComponent,
  goals: BreedingGoal[]
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const goal of goals) {
    const traitValue = getTraitValue(animal, goal.trait);
    const goalValue = goal.targetValue;

    // How close to goal (0-100)
    const closeness = 100 - Math.abs(traitValue - goalValue);

    // Weighted by priority
    totalScore += closeness * goal.priority;
    totalWeight += goal.priority;
  }

  return totalScore / totalWeight;
}

function predictOffspring(
  mother: AnimalComponent,
  father: AnimalComponent,
  goals: BreedingGoal[]
): number {
  // Simulate multiple offspring, average their scores
  let avgScore = 0;
  const simulations = 100;

  for (let i = 0; i < simulations; i++) {
    const simulatedOffspring = simulateOffspring(mother, father);
    avgScore += scoreAgainstGoals(simulatedOffspring, goals);
  }

  return avgScore / simulations;
}
```

### Progress Tracking & Insights

```typescript
function analyzeBreedingProgress(program: BreedingProgram): BreedingInsight[] {
  const insights: BreedingInsight[] = [];

  for (const goal of program.goals) {
    const history = getGenerationalData(program, goal.trait);

    // Calculate trend
    const trend = calculateTrend(history);

    if (trend.improving && trend.rate > 2) {
      insights.push({
        generation: program.generations,
        insight: `${goal.trait} is improving rapidly! (+${trend.rate.toFixed(1)} per generation)`,
        data: {
          trait: goal.trait,
          pattern: 'improving',
          rate: trend.rate
        }
      });
    } else if (trend.plateaued) {
      insights.push({
        generation: program.generations,
        insight: `${goal.trait} has plateaued. Consider outcrossing for genetic diversity.`,
        data: {
          trait: goal.trait,
          pattern: 'plateaued',
          rate: trend.rate
        }
      });
    } else if (trend.regressing) {
      insights.push({
        generation: program.generations,
        insight: `${goal.trait} is declining! Check for inbreeding or environmental factors.`,
        data: {
          trait: goal.trait,
          pattern: 'regressing',
          rate: trend.rate
        }
      });
    }
  }

  return insights;
}

// Share insights with agent
function reportBreedingProgress(
  agent: Agent,
  program: BreedingProgram,
  insights: BreedingInsight[]
) {
  const summary = await llm.generate({
    prompt: `
You're reviewing your breeding program "${program.name}" (Generation ${program.generations}).

Recent insights:
${insights.map(i => `- ${i.insight}`).join('\n')}

Current best performers:
${program.bestPerformers.map(bp => `- ${bp.trait}: ${bp.value.toFixed(1)}`).join('\n')}

How do you feel about your progress? What are your thoughts?
2-3 sentences, reflecting on successes and challenges:`,
    personality: agent.personality,
    mood: agent.mood
  });

  agent.createMemory({
    type: 'reflection',
    content: summary,
    emotionalValence: calculateEmotionalValence(insights),
    associatedEntities: program.offspring
  });

  // Mood impact
  const positiveInsights = insights.filter(i => i.data.pattern === 'improving').length;
  const negativeInsights = insights.filter(i => i.data.pattern === 'regressing').length;

  agent.mood += (positiveInsights * 10 - negativeInsights * 15);
}
```

## Integration with Game Systems

### 1. Mood & Emotional Impact

```typescript
// Breeding success
onBreedingSuccess(agent, offspring) {
  agent.mood += 20;

  if (isExceptional(offspring)) {
    agent.mood += 15;
    agent.createAchievement('exceptional_breeder');
  }

  if (hasSpecialTrait(offspring)) {
    agent.mood += 30; // Discovery!
  }
}

// Breeding failure
onBreedingFailure(agent, reason) {
  agent.mood -= 10;

  if (reason === 'inbreeding_depression') {
    agent.mood -= 15;
    agent.createMemory({
      type: 'learning',
      content: 'Breeding too closely related animals leads to problems. Need more genetic diversity.'
    });
  }
}

// Long-term pride
dailyBreedingMoodBonus(agent) {
  const programs = getBreedingPrograms(agent);
  let bonus = 0;

  for (const program of programs) {
    // Pride in successful program
    if (program.generations > 5) {
      bonus += 5;
    }

    // Pride in discoveries
    bonus += program.discoveries.length * 3;
  }

  return Math.min(30, bonus);
}
```

### 2. Memory & Reflection

```typescript
// Memorable breeding moments
createBreedingMemory(agent, event) {
  switch(event.type) {
    case 'first_breeding':
      agent.createMemory({
        type: 'milestone',
        content: `I bred my first animals today. ${event.mother.name} and ${event.father.name} had ${event.offspring.name}.`,
        emotionalValence: 0.8,
        emotionalIntensity: 0.7
      });
      break;

    case 'trait_discovery':
      agent.createMemory({
        type: 'discovery',
        content: `${event.offspring.name} has ${event.trait.name}! I've never seen this before!`,
        emotionalValence: 1.0,
        emotionalIntensity: 0.9
      });
      break;

    case 'lineage_milestone':
      agent.createMemory({
        type: 'achievement',
        content: `My ${event.species} line has reached generation ${event.generation}. ${event.bestAnimal.name} is the finest yet.`,
        emotionalValence: 0.9
      });
      break;

    case 'inbreeding_lesson':
      agent.createMemory({
        type: 'learning',
        content: `I learned the hard way - breeding siblings creates weak offspring. Need to bring in new blood.`,
        emotionalValence: -0.4,
        emotionalIntensity: 0.6
      });
      break;
  }
}

// Reflection prompts
getBreedingReflectionPrompts(agent, program) {
  return [
    `Reflect on your breeding program "${program.name}" and what you've learned about genetics.`,
    `Think about ${program.bestPerformers[0].animalId} and what makes them special.`,
    `Consider the lineage from ${program.founder} to the current generation. What has changed?`
  ];
}
```

### 3. Social & Economy

```typescript
// Trading genetics
interface AnimalListing {
  animal: AnimalComponent;
  seller: string;
  price: number;
  highlights: string[]; // Special traits, lineage
  pedigree: Pedigree;
}

function evaluateAnimalValue(animal: AnimalComponent): number {
  let value = 100; // Base

  // Trait quality
  value += animal.phenotype.performance.eggRate * 10;
  value += animal.phenotype.performance.milkYield * 20;

  // Special traits (HUGE value)
  for (const trait of animal.genome.specialTraits) {
    value += 1000 / trait.rarity; // Rare = expensive
  }

  // Pedigree (famous lineage)
  if (isFromFamousLine(animal)) {
    value *= 2;
  }

  // Genetic diversity (valuable for outcrossing)
  value *= (1 + animal.heterozygosity);

  return value;
}

// Breeding cooperation
function requestBreedingPartnership(
  agent1: Agent,
  agent2: Agent,
  animal1: AnimalComponent
) {
  const proposal = await llm.generate({
    prompt: `
You want to breed your ${animal1.name} (${describeAnimal(animal1)}) with ${agent2.name}'s animals.

Write a proposal explaining:
- Why this breeding would benefit both parties
- What traits you're looking for
- What you're willing to offer

2-3 sentences:`,
    personality: agent1.personality
  });

  const response = await agent2.considerProposal({
    from: agent1,
    proposal,
    type: 'breeding_partnership'
  });

  if (response.accepted) {
    // Create partnership
    agent1.mood += 10;
    agent2.mood += 10;

    // Shared venture
    createJointBreedingProgram(agent1, agent2, animal1, response.animal);
  }
}

// Reputation
updateBreederReputation(agent, event) {
  switch(event.type) {
    case 'exceptional_offspring':
      agent.reputation.breeder += 10;
      break;
    case 'trait_discovery':
      agent.reputation.breeder += 25;
      agent.reputation.scientist += 15;
      break;
    case 'established_line':
      agent.reputation.breeder += 20;
      break;
  }

  // Unlock titles
  if (agent.reputation.breeder > 100) {
    grantTitle(agent, 'Master Breeder');
  }
  if (agent.discoveries.length > 3) {
    grantTitle(agent, 'Geneticist');
  }
}
```

### 4. Research Integration

```typescript
// Genetics research tree (extends cooking research)
const GENETICS_RESEARCH: ResearchDefinition[] = [
  {
    id: 'animal_husbandry_i',
    name: 'Basic Animal Husbandry',
    field: 'animal_science',
    tier: 1,
    unlocks: [
      { type: 'ability', abilityId: 'basic_breeding' },
      { type: 'knowledge', knowledgeId: 'breeding_basics' }
    ]
  },
  {
    id: 'selective_breeding',
    name: 'Selective Breeding',
    field: 'animal_science',
    tier: 2,
    prerequisites: ['animal_husbandry_i'],
    unlocks: [
      { type: 'ability', abilityId: 'trait_selection' },
      { type: 'ui', uiId: 'breeding_planner' }
    ]
  },
  {
    id: 'genetics_i',
    name: 'Mendelian Genetics',
    field: 'animal_science',
    tier: 3,
    prerequisites: ['selective_breeding'],
    unlocks: [
      { type: 'knowledge', knowledgeId: 'inheritance_patterns' },
      { type: 'ui', uiId: 'pedigree_viewer' },
      { type: 'ability', abilityId: 'predict_offspring' }
    ]
  },
  {
    id: 'genetics_ii',
    name: 'Advanced Genetics',
    field: 'animal_science',
    tier: 4,
    prerequisites: ['genetics_i'],
    unlocks: [
      { type: 'knowledge', knowledgeId: 'genetic_diversity' },
      { type: 'ability', abilityId: 'identify_carriers' },
      { type: 'ui', uiId: 'genetics_analyzer' }
    ]
  },
  {
    id: 'genetic_engineering',
    name: 'Genetic Engineering',
    field: 'animal_science',
    tier: 5,
    prerequisites: ['genetics_ii', 'experimental_research'],
    unlocks: [
      { type: 'ability', abilityId: 'trait_splicing' },
      { type: 'generated', generationType: 'designer_traits' }
    ]
  }
];
```

## UI & Visualization

### Pedigree Chart

```typescript
interface Pedigree {
  subject: AnimalComponent;
  parents: {
    mother: AnimalComponent | null;
    father: AnimalComponent | null;
  };
  grandparents: {
    maternal_grandmother: AnimalComponent | null;
    maternal_grandfather: AnimalComponent | null;
    paternal_grandmother: AnimalComponent | null;
    paternal_grandfather: AnimalComponent | null;
  };
  // ... great-grandparents, etc.

  inbreedingCoefficient: number;
  notableTraits: SpecialTrait[];
  famousAncestors: AnimalComponent[];
}

function renderPedigreeChart(pedigree: Pedigree): HTMLElement {
  /*
  Visual tree showing:
  - Animal portraits (with visual traits visible)
  - Trait indicators (special icons)
  - Inbreeding warnings (red lines)
  - Famous lineage highlights (gold borders)
  */
}
```

### Genetics Analyzer

```typescript
interface GeneticsAnalysis {
  animal: AnimalComponent;

  // Genome breakdown
  traitAnalysis: {
    trait: string;
    expressedValue: number;
    allele1: number;
    allele2: number;
    dominance: string;
    potential: 'excellent' | 'good' | 'average' | 'poor';
  }[];

  // Breeding recommendations
  recommendations: {
    pairWith: AnimalComponent;
    reason: string;
    predictedOutcome: {
      trait: string;
      min: number;
      max: number;
      average: number;
    }[];
  }[];

  // Risks
  risks: {
    issue: string;
    severity: 'high' | 'medium' | 'low';
    mitigation: string;
  }[];
}
```

## Emergent Narratives

### Story 1: The Discovery

```
Generation 1: Agent breeds chickens for eggs
→ Standard results, learning basics

Generation 3: Notices some chickens lay more than others
→ Starts selecting best layers

Generation 5: Focuses breeding on top 2 hens
→ Offspring consistently good

Generation 7: New chick hatches with GOLDEN EGGS trait!
→ DISCOVERY MOMENT
→ Massive mood boost, creates memory
→ Names chick "Goldie"
→ Community learns of discovery
→ Agent becomes famous

Generation 10: Goldie's line produces golden eggs
→ Most valuable chickens in region
→ Agent's legacy established
→ "The Golden Line from [agent name]"
```

### Story 2: The Inbreeding Lesson

```
Agent breeds best cow (Bessie) with best bull (Bruno)
→ Exceptional calf (Bella)

Breeds Bella back to Bruno (father-daughter)
→ Good calf (Betty), but slightly weaker

Breeds Betty back to Bruno (grandfather-granddaughter)
→ Calf born weak, dies young
→ Agent devastated
→ Mood crash, grief

Agent reflects: "I was too focused on performance, ignored genetics"
→ Learns about inbreeding depression
→ Seeks outside genetics
→ Travels to another village for unrelated bull
→ Outcross restores vigor
→ Character growth through failure
```

### Story 3: The Competition

```
Two agents in village both breed sheep for wool
→ Friendly rivalry develops

Agent 1: Focuses on wool quantity
Agent 2: Focuses on wool quality

Annual wool fair
→ Judge evaluates both
→ Agent 1 wins volume prize
→ Agent 2 wins quality prize
→ Both proud, different strategies validated

They decide to collaborate
→ Cross their lines
→ Produce sheep with high quantity AND quality
→ Shared success, stronger friendship
→ Community benefits
```

### Story 4: The Extinction Recovery

```
Rare trait appears in agent's herd
→ Only one animal has it (rare pattern)
→ Agent prizes this animal

Animal gets sick, dies
→ Trait appears lost forever
→ Agent grieves

Later discovers: offspring carries recessive gene!
→ Breeds carrier with another animal
→ 25% chance trait reappears in offspring
→ Several failed attempts

Finally: trait resurfaces in new generation!
→ Joy of recovery
→ Agent becomes conservationist
→ Focuses on preserving genetic diversity
→ "Never again will I let a bloodline vanish"
```

## Technical Implementation Notes

### Performance

```typescript
// Genome storage
// Don't store full genome for every animal - use efficient encoding

interface CompactGenome {
  parentIds: [string, string]; // Mother, father
  mutations: Map<string, number>; // Only store differences
  specialTraits: string[]; // Trait IDs
}

// Reconstruct full genome on-demand
function expandGenome(compact: CompactGenome): Genome {
  const mother = getAnimal(compact.parentIds[0]);
  const father = getAnimal(compact.parentIds[1]);

  const base = inheritGenome(mother, father);

  // Apply mutations
  for (const [trait, value] of compact.mutations) {
    base[trait] = value;
  }

  return base;
}
```

### Save/Load

```typescript
// Save breeding registry
{
  "breeding_programs": [...],
  "pedigrees": [...],
  "discoveries": [...],
  "genetics_knowledge": {
    "discovered_traits": [...],
    "known_patterns": [...]
  }
}
```

## Conclusion

This genetics system creates **deep emergent gameplay**:

- **Discovery**: Finding rare traits feels like scientific breakthrough
- **Mastery**: Selective breeding rewards patience and strategy
- **Legacy**: Bloodlines become part of village history
- **Emotion**: Success = pride, failure = learning, discovery = joy
- **Social**: Trading genetics, breeding partnerships, competitions
- **Story**: Every lineage has a story

**The key**: Genetics isn't just numbers - it's **family trees, legacies, discoveries, and the stories of patient breeders creating something remarkable**.
