# Alternative Reproduction & Genetics Systems

## Philosophy

Reproduction shouldn't be limited to binary sexual reproduction. Life finds many ways:
- **Asexual** - Single organism creates offspring (bacteria, some plants)
- **Budding** - Parent creates clone that separates (hydra, yeast, corals)
- **Hermaphroditic** - Organism has both sexes (snails, earthworms, some fish)
- **Sequential Hermaphroditism** - Changes sex over lifetime (clownfish, parrotfish)
- **Parthenogenesis** - Unfertilized eggs develop (some reptiles, insects)
- **Multi-Gender** - 3+ sexes required for reproduction (fungi, fictional species)
- **Hybridization** - Different modes in different contexts

This extends the [Animal Genetics & Breeding System](./ANIMAL_GENETICS_BREEDING_SYSTEM.md) to support all reproductive modes for both animals and agents.

---

## Core Reproductive Modes

### 1. Asexual Reproduction

**How It Works:** Single parent creates offspring through mitotic division.

```typescript
interface AsexualReproduction {
  mode: 'asexual';
  parentId: EntityId;

  // Genetic characteristics
  mutationRate: number;        // Higher than sexual (0.03 vs 0.01)
  fidelity: number;            // How accurate copying is (0-1)

  // Costs
  energyCost: number;          // Energy required to reproduce
  cooldown: number;            // Ticks before can reproduce again
}

function reproduceAsexually(parent: Entity): Entity {
  // Offspring is genetic copy + mutations
  const offspring = cloneGenome(parent.genome);

  // Higher mutation rate (asexual = no genetic repair from recombination)
  const mutationChance = 0.03; // 3% per gene

  for (const geneName in offspring.genes) {
    if (Math.random() < mutationChance) {
      offspring.genes[geneName] = mutateGene(offspring.genes[geneName]);
    }
  }

  // Environmental variation (epigenetics)
  const environmentalNoise = calculateEnvironmentalEffects();
  offspring.phenotype = calculatePhenotype(offspring, environmentalNoise);

  // Create offspring entity
  return createOffspring({
    genome: offspring,
    phenotype: offspring.phenotype,
    parents: [parent.id],  // Single parent
    reproductionMode: 'asexual',
    generation: parent.generation + 1
  });
}
```

**Genetic Implications:**
- **No recombination** - offspring is clone + mutations
- **Accumulation of mutations** - Muller's ratchet (deleterious mutations accumulate)
- **Low variation** - population is genetically similar
- **Evolutionary stagnation** - slower adaptation (no mixing of beneficial mutations)

**Advantages:**
- Fast reproduction (no need to find mate)
- Preserves successful genotypes
- 100% of population can reproduce

**Disadvantages:**
- Genetic load accumulates
- Vulnerable to environmental changes
- Parasites/diseases can wipe out entire populations

---

### 2. Budding Reproduction

**How It Works:** Parent grows offspring as outgrowth that eventually separates.

```typescript
interface BuddingReproduction {
  mode: 'budding';
  parentId: EntityId;

  // Budding characteristics
  budType: 'identical' | 'developmental';  // Clone or immature version
  budCount: number;                         // How many buds simultaneously

  // Development
  budMaturationTime: number;                // Ticks until bud separates
  separationTrigger: 'time' | 'size' | 'environmental';

  // Resource allocation
  parentResourceLoss: number;               // Parent loses resources to bud
  budStartingResources: number;
}

function createBud(parent: Entity, type: 'identical' | 'developmental'): Entity {
  // Clone genome
  const budGenome = cloneGenome(parent.genome);

  // Small mutations during cell division
  applyMutations(budGenome, 0.01);

  if (type === 'identical') {
    // Bud is fully developed clone
    return createOffspring({
      genome: budGenome,
      lifeStage: parent.lifeStage,  // Same as parent
      size: parent.size * 0.8,      // Slightly smaller
      parents: [parent.id],
      reproductionMode: 'budding',
      budType: 'identical'
    });

  } else {  // developmental
    // Bud starts as infant/juvenile
    return createOffspring({
      genome: budGenome,
      lifeStage: 'infant',          // Starts young
      size: parent.size * 0.2,      // Much smaller
      parents: [parent.id],
      reproductionMode: 'budding',
      budType: 'developmental'
    });
  }
}

// Budding system tracks attached buds
class BuddingSystem implements System {
  update(world: World): void {
    const buddingEntities = world.query()
      .with('budding_component')
      .executeEntities();

    for (const entity of buddingEntities) {
      const budding = entity.getComponent<BuddingComponent>('budding_component');

      // Update attached buds
      for (const bud of budding.attachedBuds) {
        bud.maturationProgress++;

        // Parent feeds bud
        const resourceTransfer = budding.resourceTransferRate;
        entity.resources -= resourceTransfer;
        bud.resources += resourceTransfer;

        // Check separation
        if (shouldSeparate(bud, budding.separationTrigger)) {
          separateBud(entity, bud, world);
        }
      }
    }
  }
}
```

**Genetic Implications:**
- Nearly identical to parent (clone + small mutations)
- Can create multiple offspring simultaneously
- Parent invests resources during bud development

**Social Implications:**
- Bud may stay attached to parent (colonial organisms)
- Strong parent-offspring bond (literally connected)
- Communities of connected clones

---

### 3. Hermaphroditic Reproduction

**How It Works:** Organism has both male and female reproductive organs.

#### 3a. Simultaneous Hermaphrodite

Both organisms can fertilize each other in single mating:

```typescript
interface HermaphroditicReproduction {
  mode: 'hermaphrodite';
  type: 'simultaneous' | 'sequential';

  // For simultaneous hermaphrodites
  bidirectional: boolean;  // Both fertilize each other?

  // Role allocation
  eggProvider?: EntityId;   // Who carries eggs (if not bidirectional)
  spermProvider?: EntityId; // Who provides sperm
}

function reproduceHermaphroditic(
  organism1: Entity,
  organism2: Entity,
  bidirectional: boolean
): Entity[] {

  if (bidirectional) {
    // BOTH organisms produce offspring
    const offspring1 = createOffspring({
      eggParent: organism1.id,   // Organism 1 provides egg
      spermParent: organism2.id, // Organism 2 provides sperm
      genome: inheritGenome(organism1.genome, organism2.genome)
    });

    const offspring2 = createOffspring({
      eggParent: organism2.id,   // Organism 2 provides egg
      spermParent: organism1.id, // Organism 1 provides sperm
      genome: inheritGenome(organism2.genome, organism1.genome)
    });

    return [offspring1, offspring2];

  } else {
    // Organisms negotiate roles (or random)
    const roles = negotiateReproductiveRoles(organism1, organism2);

    const offspring = createOffspring({
      eggParent: roles.eggProvider,
      spermParent: roles.spermProvider,
      genome: inheritGenome(
        roles.eggProvider.genome,
        roles.spermProvider.genome
      )
    });

    return [offspring];
  }
}

function negotiateReproductiveRoles(org1: Entity, org2: Entity): {
  eggProvider: Entity,
  spermProvider: Entity
} {
  // Factors influencing role choice:
  // 1. Energy levels (egg production is expensive)
  // 2. Size (larger often becomes female)
  // 3. Recent history (alternate roles)
  // 4. Social dominance

  const org1Score = (
    org1.energy * 0.4 +
    org1.size * 0.3 +
    (org1.lastReproductiveRole === 'sperm' ? 20 : 0) +
    org1.socialDominance * 0.2
  );

  const org2Score = (
    org2.energy * 0.4 +
    org2.size * 0.3 +
    (org2.lastReproductiveRole === 'sperm' ? 20 : 0) +
    org2.socialDominance * 0.2
  );

  // Higher score becomes egg provider (more costly role)
  if (org1Score > org2Score) {
    return { eggProvider: org1, spermProvider: org2 };
  } else {
    return { eggProvider: org2, spermProvider: org1 };
  }
}
```

#### 3b. Sequential Hermaphrodite

Organism changes sex during lifetime:

```typescript
interface SequentialHermaphrodite {
  currentSex: 'male' | 'female';
  transitionAge?: number;      // Age when sex change occurs
  transitionTrigger: 'age' | 'size' | 'social' | 'environmental';

  // Transition history
  sexHistory: Array<{
    sex: 'male' | 'female';
    startAge: number;
    endAge?: number;
  }>;
}

// Protandry: Male → Female (clownfish)
function checkProtandryTransition(entity: Entity): void {
  if (entity.sex === 'male' && entity.age > entity.species.malePhaseEnd) {
    // Become female
    transitionToFemale(entity);

    // Social trigger: dominant female dies
    if (!hasAdultFemaleInGroup(entity)) {
      // Accelerated transition
      transitionToFemale(entity);
    }
  }
}

// Protogyny: Female → Male (parrotfish, wrasses)
function checkProtogynyTransition(entity: Entity): void {
  if (entity.sex === 'female') {
    // Transition if:
    // 1. Reach large size
    // 2. Dominant male dies (social opportunity)
    // 3. High status in group

    if (entity.size > entity.species.femaleSizeThreshold ||
        (!hasAdultMaleInGroup(entity) && entity.socialRank === 1)) {
      transitionToMale(entity);
    }
  }
}
```

**Social Implications:**
- **100% of population can mate** (any two individuals)
- **Flexible family structures** (both parents can carry young in bidirectional)
- **No enforced gender roles** (everyone has same capabilities)
- **Role negotiation** creates interesting social dynamics

---

### 4. Parthenogenesis

**How It Works:** Unfertilized eggs develop into offspring.

```typescript
interface Parthenogenesis {
  mode: 'parthenogenesis';
  type: 'obligate' | 'facultative';  // Always or sometimes?

  // Genetic mechanism
  mechanism: 'automixis' | 'apomixis';
  // automixis: meiosis then fusion (some genetic variation)
  // apomixis: mitosis (clonal)

  // Sex determination
  offspringSex: 'female' | 'male' | 'random';  // What sex are offspring?

  // Triggers (for facultative)
  triggers?: {
    noMatesAvailable: boolean;
    environmentalStress: boolean;
    lowPopulation: boolean;
  };
}

function reproduceParthenogenetically(
  parent: Entity,
  mechanism: 'automixis' | 'apomixis'
): Entity {

  if (mechanism === 'apomixis') {
    // Mitotic parthenogenesis - offspring is clone
    const genome = cloneGenome(parent.genome);
    applyMutations(genome, 0.02);  // Higher mutation rate

    return createOffspring({
      genome,
      parents: [parent.id],
      sex: determineSex(parent.species.parthenogenesisSexRule),
      reproductionMode: 'parthenogenesis_apomixis'
    });

  } else {  // automixis
    // Meiotic parthenogenesis - some recombination
    // Create gamete through meiosis
    const gamete = performMeiosis(parent.genome);

    // Gamete fuses with itself or sister cell
    const genome = fuseGametes(gamete, gamete);

    // Result: offspring with some genetic variation
    // (homozygous at some loci, maintains heterozygosity at others)

    return createOffspring({
      genome,
      parents: [parent.id],
      sex: determineSex(parent.species.parthenogenesisSexRule),
      reproductionMode: 'parthenogenesis_automixis'
    });
  }
}

// Facultative parthenogenesis (can do both sexual and asexual)
function decideReproductionMode(entity: Entity): 'sexual' | 'parthenogenesis' {
  const triggers = entity.species.parthenogenesisTriggers;

  // Check if mates available
  const matesNearby = findPotentialMates(entity);
  if (matesNearby.length === 0 && triggers.noMatesAvailable) {
    return 'parthenogenesis';
  }

  // Environmental stress (overcrowding, resource scarcity)
  if (isEnvironmentallyStressed(entity) && triggers.environmentalStress) {
    return 'parthenogenesis';
  }

  // Low population (need rapid growth)
  if (getPopulationSize(entity.species) < 10 && triggers.lowPopulation) {
    return 'parthenogenesis';
  }

  // Default to sexual (maintains genetic diversity)
  return 'sexual';
}
```

**Examples in Nature:**
- **Whiptail lizards** - All-female species, obligate parthenogenesis
- **Komodo dragons** - Facultative (can do sexual or parthenogenetic)
- **Water fleas (Daphnia)** - Switch based on environment

**Genetic Implications:**
- Loss of genetic diversity over generations
- Useful for rapid colonization (one individual can start population)
- Automixis creates some variation, apomixis is pure cloning

---

### 5. Multi-Gender Reproduction

**How It Works:** 3+ sexes required for successful reproduction.

#### 5a. Trinary System (3 genders)

```typescript
interface TriGenderReproduction {
  mode: 'multi_gender';
  genderCount: 3;

  // Gender roles
  genders: {
    type: 'genderA' | 'genderB' | 'genderC';
    role: string;
    contribution: GeneticContribution;
  }[];

  // Reproduction requirements
  requiredCombination: ['genderA', 'genderB', 'genderC'];
}

interface GeneticContribution {
  chromosomeSet?: 'nuclear' | 'mitochondrial' | 'plastid';
  genomeSegment?: number;  // Which portion of genome
  regulatoryRole?: string; // E.g., activates development
}

function reproduceTriGender(
  genderA: Entity,
  genderB: Entity,
  genderC: Entity
): Entity {

  // Example system: Each gender contributes 1/3 of genome
  const genomeA = genderA.genome.chromosomes.slice(0, 10);   // Chr 1-10
  const genomeB = genderB.genome.chromosomes.slice(10, 20);  // Chr 11-20
  const genomeC = genderC.genome.chromosomes.slice(20, 30);  // Chr 21-30

  const offspringGenome = {
    chromosomes: [...genomeA, ...genomeB, ...genomeC],
    contributors: [genderA.id, genderB.id, genderC.id]
  };

  // Determine offspring gender (could be random or based on genetics)
  const offspringGender = determineTriGenderOffspring(
    genderA.gender,
    genderB.gender,
    genderC.gender
  );

  return createOffspring({
    genome: offspringGenome,
    parents: [genderA.id, genderB.id, genderC.id],
    gender: offspringGender,
    reproductionMode: 'tri_gender'
  });
}

// Alternative: Specialization by role
function reproduceTriGenderSpecialized(
  donor1: Entity,  // Provides DNA
  donor2: Entity,  // Provides DNA
  carrier: Entity  // Gestates/grows offspring
): Entity {

  // Combine DNA from both donors
  const genome = inheritGenome(donor1.genome, donor2.genome);

  // Carrier provides environment, epigenetic factors
  const epigeneticModifiers = carrier.epigeneticState;

  const offspring = createOffspring({
    genome,
    parents: [donor1.id, donor2.id, carrier.id],
    gestationParent: carrier.id,
    epigeneticFactors: epigeneticModifiers,
    reproductionMode: 'tri_gender_specialized'
  });

  // Carrier experiences pregnancy/brooding
  carrier.isCarrying = true;
  carrier.gestationProgress = 0;
  carrier.carrying = offspring.id;

  return offspring;
}
```

#### 5b. Fungal-Style (Many Mating Types)

Some fungi have thousands of mating types:

```typescript
interface FungalReproduction {
  mode: 'multi_gender';
  matingTypes: number;  // Can be 100s or 1000s

  compatibilityRule: 'any_different' | 'specific_combinations';
}

function canMate(entity1: Entity, entity2: Entity): boolean {
  // Simple rule: any two different mating types can mate
  if (entity1.species.compatibilityRule === 'any_different') {
    return entity1.matingType !== entity2.matingType;
  }

  // Complex rule: specific combinations required
  const compatible = entity1.species.compatibilityMatrix[entity1.matingType];
  return compatible.includes(entity2.matingType);
}

// Example: 10 mating types, any 2 different can mate
function reproduceFungalStyle(
  entity1: Entity,
  entity2: Entity
): Entity {

  if (!canMate(entity1, entity2)) {
    throw new Error('Incompatible mating types');
  }

  // Standard sexual reproduction
  const genome = inheritGenome(entity1.genome, entity2.genome);

  // Offspring gets random mating type
  const offspringMatingType = Math.floor(Math.random() * entity1.species.matingTypes);

  return createOffspring({
    genome,
    parents: [entity1.id, entity2.id],
    matingType: offspringMatingType,
    reproductionMode: 'fungal_multi_type'
  });
}
```

**Social Implications for Tri-Gender:**
- **Family structure**: 3 parents raise offspring
- **Mate finding complexity**: Need to find 2 compatible partners
- **Social organization**: Triads as basic unit instead of pairs
- **Reproductive inequality**: Harder for unpopular individuals to find 2 mates

---

## Universal Genome Structure

Works for all reproductive modes:

```typescript
interface UniversalGenome {
  // Core genetics
  genes: Map<string, Gene>;
  chromosomes?: Chromosome[];  // Optional for diploid/polyploid

  // Inheritance tracking
  contributors: EntityId[];    // Who contributed to this genome
  contributionRatios?: number[]; // How much each contributed
  generation: number;

  // Reproduction mode used to create this organism
  reproductionMode: ReproductionMode;

  // Ploidy (number of chromosome sets)
  ploidy: number;  // 1 (haploid), 2 (diploid), 3+ (polyploid)

  // Special traits
  specialTraits: SpecialTrait[];

  // Epigenetic state
  epigenetics?: EpigeneticMarkers;
}

type ReproductionMode =
  | 'sexual'
  | 'asexual'
  | 'budding'
  | 'parthenogenesis_apomixis'
  | 'parthenogenesis_automixis'
  | 'hermaphrodite_bidirectional'
  | 'hermaphrodite_unidirectional'
  | 'sequential_hermaphrodite'
  | 'tri_gender'
  | 'multi_gender'
  | 'fungal_multi_type';

interface Gene {
  trait: string;
  alleles: number[];      // Variable length (1 for haploid, 2+ for polyploid)
  dominance: AlleleDominance;
  expression: number;
}

interface AlleleDominance {
  pattern: 'dominant' | 'recessive' | 'codominant' | 'overdominant' | 'underdominant';
  weights?: number[];     // For complex dominance
}
```

---

### 6. Chimeric Organisms (Composition Over Inheritance)

**How It Works:** Organism contains cells from multiple genetically distinct sources.

```typescript
interface ChimericOrganism {
  mode: 'chimeric';

  // Multiple genomes coexist in one body
  genomes: {
    genomeId: string;
    source: EntityId;           // Where this genome came from
    tissueTypes: string[];      // Which body parts have this genome
    cellPercentage: number;     // % of body cells with this genome
    dominance: number;          // Which genome controls phenotype
  }[];

  // Formation mechanism
  formationType: 'fusion' | 'absorption' | 'symbiotic' | 'grafting';
}

// Example: Fusion chimera (two embryos fuse)
function createFusionChimera(
  embryo1: Entity,
  embryo2: Entity
): Entity {

  // Both genomes persist in different cell lineages
  const chimericGenome = {
    genomes: [
      {
        genomeId: 'lineage_A',
        source: embryo1.id,
        genome: embryo1.genome,
        tissueTypes: ['skin', 'nervous_system', 'left_organs'],
        cellPercentage: 60,
        dominance: 0.6
      },
      {
        genomeId: 'lineage_B',
        source: embryo2.id,
        genome: embryo2.genome,
        tissueTypes: ['blood', 'muscles', 'right_organs'],
        cellPercentage: 40,
        dominance: 0.4
      }
    ]
  };

  // Phenotype is a mosaic
  const phenotype = calculateChimericPhenotype(chimericGenome);

  return createEntity({
    genome: chimericGenome,
    phenotype,
    isChimera: true,
    parents: [embryo1.parentIds, embryo2.parentIds].flat()
  });
}

// Absorption chimera (absorbs twin in womb)
function createAbsorptionChimera(
  primary: Entity,
  absorbed: Entity
): Entity {

  return {
    genomes: [
      {
        genomeId: 'primary',
        source: primary.id,
        genome: primary.genome,
        tissueTypes: ['all'],
        cellPercentage: 85,
        dominance: 1.0
      },
      {
        genomeId: 'absorbed',
        source: absorbed.id,
        genome: absorbed.genome,
        tissueTypes: ['patches'],  // Scattered throughout
        cellPercentage: 15,
        dominance: 0.1
      }
    ]
  };
}

// Symbiotic chimera (deliberate fusion for mutual benefit)
function createSymbioticChimera(
  host: Entity,
  symbiont: Entity,
  consensual: boolean
): Entity {

  const chimera = {
    genomes: [
      {
        genomeId: 'host',
        source: host.id,
        genome: host.genome,
        tissueTypes: ['structural', 'nervous', 'digestive'],
        cellPercentage: 70,
        dominance: 0.8
      },
      {
        genomeId: 'symbiont',
        source: symbiont.id,
        genome: symbiont.genome,
        tissueTypes: ['circulatory', 'immune', 'energy_production'],
        cellPercentage: 30,
        dominance: 0.2
      }
    ]
  };

  // Track relationship
  if (consensual) {
    createBond(host, symbiont, {
      type: 'symbiotic_fusion',
      bondStrength: 100,
      permanent: true,
      description: "We are one, yet we are two"
    });
  }

  return createEntity({
    genome: chimera,
    phenotype: calculateSymbioticPhenotype(chimera),
    consciousness: consensual ? 'shared' : 'dominant',
    isChimera: true,
    constituents: [host.id, symbiont.id]
  });
}

// Grafting chimera (deliberate tissue combination)
function createGraftingChimera(
  base: Entity,
  graftedTissues: Array<{tissue: string, source: Entity}>
): Entity {

  const genomes = [
    {
      genomeId: 'base',
      source: base.id,
      genome: base.genome,
      tissueTypes: ['core'],
      cellPercentage: 60,
      dominance: 1.0
    }
  ];

  let remainingPercentage = 40;
  for (const graft of graftedTissues) {
    const percentage = remainingPercentage / graftedTissues.length;
    genomes.push({
      genomeId: `graft_${graft.tissue}`,
      source: graft.source.id,
      genome: graft.source.genome,
      tissueTypes: [graft.tissue],
      cellPercentage: percentage,
      dominance: 0.1
    });
  }

  return createEntity({
    genome: { genomes },
    phenotype: calculateGraftedPhenotype(genomes),
    isChimera: true,
    constituents: [base.id, ...graftedTissues.map(g => g.source.id)]
  });
}
```

#### Chimeric Phenotype Calculation

```typescript
function calculateChimericPhenotype(
  chimericGenome: ChimericOrganism
): Phenotype {

  // Different body parts express different genomes
  const phenotype: ChimericPhenotype = {
    mosaic: true,
    regions: []
  };

  for (const genomeEntry of chimericGenome.genomes) {
    const regionalPhenotype = calculatePhenotype(genomeEntry.genome);

    phenotype.regions.push({
      tissues: genomeEntry.tissueTypes,
      appearance: regionalPhenotype.visual,
      traits: regionalPhenotype.performance,
      expressionLevel: genomeEntry.dominance
    });
  }

  // Overall phenotype weighted by dominance
  phenotype.overall = blendPhenotypes(
    chimericGenome.genomes.map(g => ({
      phenotype: calculatePhenotype(g.genome),
      weight: g.dominance
    }))
  );

  // Chimeric advantages
  phenotype.hybrid_vigor = calculateHybridVigor(chimericGenome.genomes);
  phenotype.versatility = chimericGenome.genomes.length * 0.2;  // More genomes = more adaptable

  return phenotype;
}
```

#### Identity & Consciousness in Chimeras

```typescript
interface ChimericIdentity {
  // Do they identify as one being or multiple?
  identity: 'unified' | 'plural' | 'conflicted';

  // Consciousness structure
  consciousness: {
    type: 'shared' | 'dominant' | 'multiple';
    voices?: number;  // How many distinct "selves"
    harmony: number;  // 0-100, how well they get along
  };

  // Memory integration
  memories: {
    shared: Memory[];
    lineageA: Memory[];  // Memories from genome A lineage
    lineageB: Memory[];  // Memories from genome B lineage
  };

  // Personality
  personalities: {
    genomeId: string;
    personality: PersonalityComponent;
    influence: number;  // How much it affects behavior
  }[];
}

// Unified identity (most chimeras)
const unifiedChimera: ChimericIdentity = {
  identity: 'unified',
  consciousness: {
    type: 'shared',
    harmony: 90
  },
  // "I am one being with multiple genetic sources"
};

// Plural identity (rare, symbiotic fusion)
const pluralChimera: ChimericIdentity = {
  identity: 'plural',
  consciousness: {
    type: 'multiple',
    voices: 2,
    harmony: 70
  },
  // "We are two who chose to become one"
  // Uses "we" pronouns, both identities persist
};

// Conflicted identity (forced fusion, incompatible genomes)
const conflictedChimera: ChimericIdentity = {
  identity: 'conflicted',
  consciousness: {
    type: 'dominant',
    voices: 2,
    harmony: 30
  },
  // Internal struggle between genetic lineages
  // May have identity crisis, mood swings
};
```

#### Chimeric Reproduction

What happens when chimeras reproduce?

```typescript
function reproduceAsChimera(
  chimera: ChimericOrganism,
  partner: Entity
): Entity {

  // Problem: Which genome does chimera pass on?
  // Solution: Depends on which genome produces gametes

  const reproductiveGenome = chimera.genomes.find(
    g => g.tissueTypes.includes('reproductive_organs')
  );

  if (!reproductiveGenome) {
    // Chimera may be infertile
    throw new Error('Chimera has no functional reproductive tissue');
  }

  // Chimera's offspring inherits from reproductive genome + partner
  const offspring = createOffspring({
    parent1: reproductiveGenome.genome,
    parent2: partner.genome,
    isChimericOffspring: false  // Offspring is NOT chimeric (normal reproduction)
  });

  // BUT: Chimera might pass on BOTH genomes (rare)
  if (Math.random() < 0.05) {  // 5% chance
    // Offspring becomes chimera too
    const chimericOffspring = {
      genomes: [
        {
          genome: reproductiveGenome.genome,
          cellPercentage: 60,
          tissueTypes: ['primary']
        },
        {
          genome: chimera.genomes.find(g => g !== reproductiveGenome).genome,
          cellPercentage: 40,
          tissueTypes: ['secondary']
        }
      ]
    };

    createMemory(chimera, {
      type: 'meaningful',
      content: `My child inherited both my lineages - they are chimeric like me!`,
      emotionalValence: 0.9
    });

    return chimericOffspring;
  }

  return offspring;
}
```

#### Social Implications

```typescript
interface ChimericCulture {
  // How are chimeras viewed?
  socialStatus: 'sacred' | 'normal' | 'taboo' | 'feared';

  // Creation ethics
  creationMethod: {
    naturalFusion: 'accepted',      // Embryo fusion in womb
    deliberateFusion: 'controversial',  // Intentional merging
    absorption: 'tragic',           // Twin absorption
    grafting: 'medical' | 'enhancement'
  };

  // Identity recognition
  identityStatus: 'single_person' | 'plural_person' | 'uncertain';
  legalRights: 'full' | 'partial' | 'none';

  // Reproduction rights
  canReproduce: boolean;
  offspringStatus: 'legitimate' | 'uncertain_parentage';
}

const chimeraBeliefs = {
  sacred: [
    "The chimera is blessed with two souls",
    "They carry the wisdom of multiple lineages",
    "Fusion is divine unity"
  ],
  feared: [
    "An abomination against nature",
    "Which parent do they belong to?",
    "Are they even one person?"
  ],
  medical: [
    "Grafting saves lives",
    "Tissue compatibility issues exist",
    "Chimeric organs can cure disease"
  ],
  identity: [
    "I am both and neither",
    "We are one, we are legion",
    "My blood remembers two mothers"
  ]
};
```

#### Example Species: The Melded

```typescript
const theMelded: SpeciesDefinition = {
  name: "The Melded",
  reproductionMode: 'symbiotic_chimera',

  biology: {
    formationType: 'consensual_fusion',
    ageOfFusion: 'young_adult',  // Choose to meld around age 20

    // Two individuals merge into one chimeric being
    process: {
      duration: 30,  // Days to complete fusion
      reversible: false,
      survivalRate: 0.95
    },

    // Result
    postFusion: {
      consciousness: 'shared',
      lifespan: '+50%',  // Live longer as chimera
      abilities: 'combined',  // Both skill sets accessible
      appearance: 'mosaic'
    }
  },

  culture: {
    beliefs: [
      "Two become one, one becomes greater",
      "The Melding is the highest form of love",
      "We are stronger together than apart"
    ],

    traditions: {
      meldingCeremony: "Sacred ritual where two pledge to become one",
      namingConvention: "Take combined name (Alice + Bob = Alob)",
      identity: "Refer to self as 'we' after melding"
    },

    socialStructure: {
      basicUnit: 'melded_pair',
      unmeldedStatus: 'incomplete',  // Pressure to find meld-partner
      voluntaryNature: true  // Must be consensual
    }
  },

  gameplay: {
    // Player can choose to meld two agents
    meldingMechanics: {
      requirements: {
        bondLevel: 90,  // Must have very strong bond
        consent: true,  // Both must agree
        health: 80      // Must be healthy
      },

      benefits: {
        lifespan: 1.5,
        skillPooling: true,  // Access to both skill sets
        bonusTraits: ['resilience', 'adaptability']
      },

      costs: {
        individualIdentityLoss: true,
        irreversible: true,
        socialComplexity: 'high'
      }
    }
  }
};
```

---

## Integration with Agent Personality & Traits

For agents (sentient beings), genetics affects but doesn't fully determine traits:

```typescript
interface AgentGenome extends UniversalGenome {
  // Heritable personality components
  personalityGenes: {
    openness: Gene;
    conscientiousness: Gene;
    extraversion: Gene;
    agreeableness: Gene;
    neuroticism: Gene;
    workEthic: Gene;
    creativity: Gene;
    generosity: Gene;
    leadership: Gene;
  };

  // Heritable abilities
  abilityGenes: {
    intelligence: Gene;
    strength: Gene;
    agility: Gene;
    charisma: Gene;
    perception: Gene;
  };

  // Physical traits
  physicalGenes: {
    height: Gene;
    build: Gene;
    metabolism: Gene;
    lifespan: Gene;
  };
}

function calculateAgentPersonality(
  genome: AgentGenome,
  environment: Environment,
  experiences: Memory[]
): PersonalityComponent {

  // Genetics provides BASE (50-70% influence)
  const geneticBase = {
    openness: expressGene(genome.personalityGenes.openness),
    conscientiousness: expressGene(genome.personalityGenes.conscientiousness),
    extraversion: expressGene(genome.personalityGenes.extraversion),
    agreeableness: expressGene(genome.personalityGenes.agreeableness),
    neuroticism: expressGene(genome.personalityGenes.neuroticism),
    workEthic: expressGene(genome.personalityGenes.workEthic),
    creativity: expressGene(genome.personalityGenes.creativity),
    generosity: expressGene(genome.personalityGenes.generosity),
    leadership: expressGene(genome.personalityGenes.leadership)
  };

  // Environment modifies (10-20% influence)
  const environmentalModifiers = {
    openness: environment.culturalOpenness * 0.15,
    conscientiousness: environment.orderliness * 0.15,
    extraversion: environment.socialDensity * 0.1,
    agreeableness: environment.cooperationNorms * 0.15,
    neuroticism: environment.stressLevel * 0.2,
    workEthic: environment.workCulture * 0.15,
    creativity: environment.innovationSupport * 0.1,
    generosity: environment.wealthDistribution * 0.1,
    leadership: environment.leadershipOpportunities * 0.1
  };

  // Experiences modify (10-30% influence)
  const experientialModifiers = calculateExperientialEffects(experiences);

  // Final personality
  return {
    type: 'personality',
    openness: Math.min(100, geneticBase.openness + environmentalModifiers.openness + experientialModifiers.openness),
    conscientiousness: Math.min(100, geneticBase.conscientiousness + environmentalModifiers.conscientiousness + experientialModifiers.conscientiousness),
    extraversion: Math.min(100, geneticBase.extraversion + environmentalModifiers.extraversion + experientialModifiers.extraversion),
    agreeableness: Math.min(100, geneticBase.agreeableness + environmentalModifiers.agreeableness + experientialModifiers.agreeableness),
    neuroticism: Math.min(100, geneticBase.neuroticism + environmentalModifiers.neuroticism + experientialModifiers.neuroticism),
    workEthic: Math.min(100, geneticBase.workEthic + environmentalModifiers.workEthic + experientialModifiers.workEthic),
    creativity: Math.min(100, geneticBase.creativity + environmentalModifiers.creativity + experientialModifiers.creativity),
    generosity: Math.min(100, geneticBase.generosity + environmentalModifiers.generosity + experientialModifiers.generosity),
    leadership: Math.min(100, geneticBase.leadership + environmentalModifiers.leadership + experientialModifiers.leadership)
  };
}
```

**Nature vs Nurture:**
- **Genetics**: 50-70% of personality variation
- **Environment**: 10-20%
- **Experiences**: 10-30%
- **Random/Epigenetic**: ~10%

---

## Social & Cultural Implications

### Asexual Societies

```typescript
interface AsexualCulture {
  // Social structure
  familyUnit: 'parent-offspring-clones';
  lineages: boolean;  // Do clone lines matter?

  // Identity
  individuality: 'low' | 'medium' | 'high';  // Are clones seen as distinct?

  // Reproduction norms
  reproductionFrequency: number;
  populationControl: boolean;  // Limit reproduction to prevent overpopulation?

  // Genetic diversity concerns
  mutationEncouragement: boolean;  // Seek mutation for variation?
  outcrossingTaboo: boolean;       // If sexual reproduction possible
}

// Agents in asexual society
const asexualCulturalBeliefs = {
  "We are all one lineage, branches of the same tree",
  "Purity of form must be preserved",
  "Mutation is our only hope for change",
  "The Founder's genes live in us all",
  "Clones are not copies, we are continuations"
};
```

### Hermaphrodite Societies

```typescript
interface HermaphroditeCulture {
  // Gender roles
  genderRoles: 'flexible' | 'none';
  roleSwitching: boolean;  // Do individuals switch parenting roles?

  // Reproduction
  partnerPreference: 'reciprocal' | 'specialized';
  // reciprocal = both carry offspring
  // specialized = one carries, one provides

  // Family structure
  familyStructure: 'paired' | 'communal';
  parentalDivision: 'equal' | 'carrier-focused';
}

const hermaphroditeCulturalBeliefs = {
  "We all share the burden and joy of creation",
  "Gender is a choice, not a destiny",
  "True partnership means equal contribution",
  "The carrier bears the weight, the donor provides the spark"
};
```

### Tri-Gender Societies

```typescript
interface TriGenderCulture {
  // Gender roles
  genderA_role: string;  // e.g., "The Seed" (genetic contributor)
  genderB_role: string;  // e.g., "The Root" (genetic contributor)
  genderC_role: string;  // e.g., "The Soil" (carrier/nurturer)

  // Social structure
  familyUnit: 'triad';
  triadFormation: 'deliberate' | 'spontaneous' | 'arranged';

  // Relationship dynamics
  exclusivity: boolean;  // Monogamous triads or fluid groupings?
  dominanceHierarchy: boolean;  // Is one gender socially dominant?

  // Reproduction politics
  partnerSelection: 'democratic' | 'hierarchical';
  reproductiveRights: 'equal' | 'carrier-decides';
}

const triGenderCulturalBeliefs = {
  "Three make one, one makes three",
  "The Seed provides potential, the Root provides strength, the Soil provides life",
  "Balance of three is sacred",
  "A child of three bonds is stronger than a child of two"
};

// Tri-gender family dynamics
interface TriGenderFamily {
  parents: [EntityId, EntityId, EntityId];
  roles: {
    [parentId: EntityId]: 'genetic_donor_A' | 'genetic_donor_B' | 'carrier'
  };

  // Relationship dynamics
  primaryBonds: Map<EntityId, EntityId>;  // Strongest 1:1 bonds within triad
  triadCohesion: number;  // How well all 3 get along

  // Parenting
  parentingStyle: 'equal_three' | 'carrier_primary' | 'specialized_roles';
}
```

---

## Emotional & Bonding Integration

### Parent-Offspring Bonds by Reproduction Mode

```typescript
interface ParentOffspringBond {
  parentIds: EntityId[];
  offspringId: EntityId;

  bondStrengths: Map<EntityId, number>;  // Individual bond with each parent

  // Mode-specific dynamics
  reproductionMode: ReproductionMode;
  bondingFactors: BondingFactors;
}

interface BondingFactors {
  // Asexual/Budding
  geneticIdentity?: number;  // 0-1, how genetically similar (clones = 1.0)

  // Sexual/Hermaphrodite
  geneticContribution?: Map<EntityId, number>;  // % of genes from each parent

  // Tri-gender
  roleInReproduction?: Map<EntityId, 'genetic_donor' | 'carrier' | 'nurturer'>;

  // All modes
  timeInvested: Map<EntityId, number>;     // Parenting time
  resourcesProvided: Map<EntityId, number>;  // Food, care, teaching
}

// Bond strength calculation
function calculateParentOffspringBond(
  parent: Entity,
  offspring: Entity,
  mode: ReproductionMode
): number {

  let baseBond = 50;  // Base parent-child bond

  switch (mode) {
    case 'asexual':
    case 'budding':
      // Clone identity creates strong bond
      baseBond += 30;  // "This is literally me"
      break;

    case 'sexual':
    case 'hermaphrodite_bidirectional':
      // Standard 50% genetic contribution
      baseBond += 20;
      break;

    case 'tri_gender':
      // 33% genetic contribution, but shared parenting
      const contribution = offspring.genome.contributionRatios[parent.id];
      baseBond += contribution * 40;  // ~13 for genetic donor

      if (parent.id === offspring.gestationParent) {
        baseBond += 25;  // Carrier bonus
      }
      break;

    case 'parthenogenesis_apomixis':
      // Clone from single parent
      baseBond += 35;
      break;

    case 'parthenogenesis_automixis':
      // Recombined genes but single parent
      baseBond += 25;
      break;
  }

  // Modify by time invested
  baseBond += (parent.timeWithOffspring / 100);

  return Math.min(100, baseBond);
}
```

### Grief Differences by Reproduction Mode

```typescript
function handleOffspringDeath(
  parent: Entity,
  offspring: Entity,
  bond: ParentOffspringBond
): GriefResponse {

  const baseBondStrength = bond.bondStrengths.get(parent.id);
  let griefIntensity = baseBondStrength;

  // Modifiers by reproduction mode
  switch (bond.reproductionMode) {
    case 'asexual':
    case 'budding':
      // Losing a clone is like losing part of yourself
      griefIntensity *= 1.3;

      // But also: can create another similar offspring
      const replacementPossible = parent.canReproduce;
      if (replacementPossible) {
        griefIntensity *= 0.8;  // Lessened by replaceability
      }
      break;

    case 'tri_gender':
      // Shared grief across 3 parents
      // Each parent grieves, but can support each other
      griefIntensity *= 1.1;  // Slightly more (more parents = more bonds)

      // Triad cohesion affects grief coping
      const otherParents = bond.parentIds.filter(id => id !== parent.id);
      const triadSupport = calculateTriadSupport(parent, otherParents);
      griefIntensity *= (1 - triadSupport * 0.3);  // Support reduces grief
      break;

    case 'parthenogenesis_apomixis':
      // Single parent, clone child
      griefIntensity *= 1.2;  // No co-parent to share grief
      griefIntensity *= 1.1;  // Clone identity loss
      break;
  }

  return {
    intensity: Math.min(100, griefIntensity),
    duration: Math.floor(griefIntensity * 5),  // Days
    coping: determineCopingMechanism(parent, bond.reproductionMode)
  };
}

function determineCopingMechanism(
  parent: Entity,
  mode: ReproductionMode
): string {

  switch (mode) {
    case 'asexual':
    case 'budding':
      return "Create another offspring as living memorial";

    case 'sexual':
      return "Seek comfort from co-parent";

    case 'tri_gender':
      return "Triad grieves together, strengthening remaining bonds";

    case 'parthenogenesis_apomixis':
      return "Isolation in grief, no co-parent for support";

    default:
      return "Standard grief process";
  }
}
```

---

## Species Examples

### Example 1: Fungal-Inspired Multi-Type Species

```typescript
const myceloids: SpeciesDefinition = {
  name: "Myceloid",
  reproductionMode: 'fungal_multi_type',
  matingTypes: 256,  // 256 different compatibility types

  compatibilityRule: 'any_different',

  physicalTraits: {
    networked: true,  // Can form underground networks
    colonial: true,   // Individual bodies are part of colony
  },

  culture: {
    individuality: 'low',
    collectiveIdentity: 'high',
    familyConcept: 'network',  // "My network-kin"
  },

  beliefs: [
    "We are all threads of the great web",
    "Connection is existence",
    "256 types, infinite combinations"
  ]
};
```

### Example 2: Sequential Hermaphrodite Reef Dwellers

```typescript
const coralkin: SpeciesDefinition = {
  name: "Coralkin",
  reproductionMode: 'sequential_hermaphrodite',

  sexDetermination: {
    initial: 'male',
    transition: 'protandry',  // Male → Female
    transitionTrigger: 'social',  // When dominant female dies
  },

  socialStructure: {
    groupType: 'harem',
    dominanceBased: true,
    femaleAsLeader: true,
  },

  lifeStages: {
    juvenile: { sex: 'immature', duration: 50 },
    male: { sex: 'male', duration: 200 },
    transitionPeriod: { sex: 'transitioning', duration: 20 },
    female: { sex: 'female', duration: 300 }
  },

  culture: {
    beliefs: [
      "The matriarch was once young and male, as we all were",
      "To lead is to transform",
      "Succession is sacred - when she falls, another rises"
    ]
  }
};
```

### Example 3: Tri-Gender Humanoid Species

```typescript
const trisapiens: SpeciesDefinition = {
  name: "Trisapiens",
  reproductionMode: 'tri_gender',

  genders: [
    {
      name: "Ember",
      role: "Genetic contributor - provides passion traits",
      physicalMarkers: "Warm coloration, high energy"
    },
    {
      name: "Tide",
      role: "Genetic contributor - provides stability traits",
      physicalMarkers: "Cool coloration, calm demeanor"
    },
    {
      name: "Vessel",
      role: "Gestates offspring, provides epigenetic environment",
      physicalMarkers: "Neutral coloration, nurturing build"
    }
  ],

  genetics: {
    emberGenes: ['creativity', 'risk-taking', 'passion'],
    tideGenes: ['wisdom', 'patience', 'resilience'],
    vesselGenes: ['empathy', 'nurturing', 'balance'],
    // Offspring inherits from all three
  },

  socialStructure: {
    familyUnit: 'triad',
    triadFormation: 'deliberate',  // Choose partners carefully
    childRearing: 'equal_three',
  },

  culture: {
    beliefs: [
      "Three flames become one fire",
      "Without all three, life cannot be",
      "The child carries pieces of three souls"
    ],

    traditions: {
      triadBonding: "Year-long courtship of all three partners",
      birthCelebration: "All three parents honored equally",
      inheritance: "Property divided three ways"
    }
  }
};
```

---

## Implementation Phases

### Phase 1: Universal Genome (Week 1)
- [ ] Extend genome structure to support variable parents
- [ ] Create `UniversalGenome` interface
- [ ] Update gene expression for variable ploidy
- [ ] Implement basic inheritance for all modes

### Phase 2: Alternative Modes (Week 2)
- [ ] Asexual reproduction system
- [ ] Budding reproduction system
- [ ] Hermaphroditic reproduction system
- [ ] Parthenogenesis system
- [ ] Tri-gender reproduction system

### Phase 3: Agent Integration (Week 3)
- [ ] Agent genetics (personality genes)
- [ ] Agent reproduction system
- [ ] Multi-parent family structures
- [ ] Parent-offspring bonding for all modes

### Phase 4: Social Systems (Week 4)
- [ ] Cultural frameworks for each mode
- [ ] Relationship dynamics (triads, etc.)
- [ ] Grief and loss systems
- [ ] Social norms emergence

### Phase 5: Species Diversity (Week 5+)
- [ ] Define 5+ species with different reproduction modes
- [ ] Cross-species interaction protocols
- [ ] Cultural exchange between reproductive paradigms
- [ ] Emergent social dynamics

---

## Conclusion

This system enables:

1. **Biological Diversity** - Species reproduce in radically different ways
2. **Social Complexity** - Family structures from 1 to 3+ parents
3. **Cultural Depth** - Beliefs and norms shaped by reproduction mode
4. **Emotional Richness** - Bonding and grief vary by reproductive context
5. **Emergent Stories** - Unique narratives from alternative family structures

**Every reproductive mode creates different gameplay:**
- Asexual = rapid expansion, genetic stagnation risk
- Hermaphroditic = flexible partnerships, role negotiation
- Tri-gender = complex family dynamics, three-way bonding
- Sequential = life-stage transitions, social succession

**The key insight:** Reproduction mode isn't just biology - it fundamentally shapes society, culture, relationships, and individual identity.
