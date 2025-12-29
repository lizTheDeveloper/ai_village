# DNA as ECS Components

## Core Philosophy

**Entities are composed of components, not inheriting from classes.**

This means DNA/genetics should work the SAME way - as composable components attached to entities.

---

## Current ECS Architecture

```typescript
// How entities work now
const entity = world.createEntity();

// Compose entity from components
entity.addComponent(createPositionComponent(x, y));
entity.addComponent(createPhysicsComponent(...));
entity.addComponent(generateRandomPersonality());
entity.addComponent(createAgentComponent(...));
entity.addComponent(createNeedsComponent(...));
entity.addComponent(createMemoryComponent(...));
```

**Key insight:** Entities are pure composition. No inheritance.

---

## DNA as Components

### GenomeComponent (Single Genome)

```typescript
interface GenomeComponent extends Component {
  type: 'genome';

  // Identification
  genomeId: string;            // Unique ID for this genome
  generation: number;          // How many generations from founder

  // Genes as simple key-value pairs
  genes: Map<string, GeneValue>;

  // Gene structure
  alleles: Map<string, [number, number]>;  // Gene name -> [allele1, allele2]
  dominance: Map<string, Dominance>;       // How alleles express

  // Provenance
  parents: EntityId[];         // Who contributed to this genome
  contributionRatios?: number[];  // How much each parent contributed

  // Reproduction mode that created this genome
  reproductionMode: ReproductionMode;

  // Special markers
  specialTraits?: string[];    // IDs of special traits
  mutations?: Mutation[];      // Record of mutations
}

interface GeneValue {
  allele1: number;  // 0-100
  allele2: number;  // 0-100
  expressed: number;  // Final expression (calculated)
}

interface Mutation {
  gene: string;
  fromValue: number;
  toValue: number;
  generation: number;
}

type Dominance = 'dominant' | 'recessive' | 'codominant' | 'overdominant';

type ReproductionMode =
  | 'sexual'
  | 'asexual'
  | 'budding'
  | 'parthenogenesis'
  | 'hermaphrodite'
  | 'tri_gender'
  | 'chimeric';
```

### Factory Functions

```typescript
function createGenomeComponent(config: {
  generation: number;
  parents: EntityId[];
  genes: Map<string, [number, number]>;
  reproductionMode: ReproductionMode;
}): GenomeComponent {
  const genomeId = generateUUID();

  return {
    type: 'genome',
    version: 1,
    genomeId,
    generation: config.generation,
    genes: new Map(),
    alleles: config.genes,
    dominance: new Map(),
    parents: config.parents,
    contributionRatios: undefined,
    reproductionMode: config.reproductionMode,
    specialTraits: [],
    mutations: []
  };
}

// Example: Create genome from sexual reproduction
function createSexualGenome(
  mother: Entity,
  father: Entity
): GenomeComponent {
  const motherGenome = mother.getComponent<GenomeComponent>('genome');
  const fatherGenome = father.getComponent<GenomeComponent>('genome');

  const childGenes = new Map<string, [number, number]>();

  // Inherit genes
  for (const geneName of motherGenome.alleles.keys()) {
    const motherAlleles = motherGenome.alleles.get(geneName);
    const fatherAlleles = fatherGenome.alleles.get(geneName);

    // Random allele from each parent
    const fromMother = Math.random() < 0.5 ? motherAlleles[0] : motherAlleles[1];
    const fromFather = Math.random() < 0.5 ? fatherAlleles[0] : fatherAlleles[1];

    childGenes.set(geneName, [fromMother, fromFather]);
  }

  return createGenomeComponent({
    generation: Math.max(motherGenome.generation, fatherGenome.generation) + 1,
    parents: [mother.id, father.id],
    genes: childGenes,
    reproductionMode: 'sexual'
  });
}
```

---

## Chimeras: True Composition

**Key insight:** Chimeras are entities with MULTIPLE genome components!

```typescript
// Normal entity: ONE genome
const normal = world.createEntity();
normal.addComponent(createGenomeComponent({...}));

// Chimeric entity: MULTIPLE genomes!
const chimera = world.createEntity();
chimera.addComponent(createGenomeComponent({
  genomeId: 'lineage_A',
  ...
}));
chimera.addComponent(createGenomeComponent({
  genomeId: 'lineage_B',
  ...
}));
chimera.addComponent(createChimericCoordinationComponent({
  genomeIds: ['lineage_A', 'lineage_B']
}));
```

### Component Types for Chimeras

```typescript
interface GenomeComponent extends Component {
  type: 'genome';

  // ADD: Which tissues does this genome control?
  tissues?: string[];      // ['skin', 'nervous_system'] or undefined (all)
  cellPercentage?: number; // % of body cells with this genome
  dominance?: number;      // 0-1, which genome controls phenotype
}

interface ChimericCoordinationComponent extends Component {
  type: 'chimeric';

  // Which genomes are in this chimera
  genomeIds: string[];     // References to genome components

  // Identity
  consciousness: 'unified' | 'shared' | 'dominant' | 'multiple';
  identity: 'singular' | 'plural' | 'conflicted';
  harmony: number;         // 0-100, how well genomes "get along"

  // Formation
  formationType: 'fusion' | 'absorption' | 'symbiotic' | 'grafting';
  isConsensual?: boolean;  // For symbiotic chimeras

  // Constituents (who merged to form this)
  constituents?: EntityId[];
}

function createChimericCoordinationComponent(config: {
  genomeIds: string[];
  consciousness: string;
  formationType: string;
  constituents?: EntityId[];
}): ChimericCoordinationComponent {
  return {
    type: 'chimeric',
    version: 1,
    genomeIds: config.genomeIds,
    consciousness: config.consciousness as any,
    identity: determineIdentity(config.consciousness),
    harmony: 70,  // Default
    formationType: config.formationType as any,
    isConsensual: config.formationType === 'symbiotic',
    constituents: config.constituents
  };
}
```

---

## Systems Process Components

### GeneExpressionSystem

Calculates phenotype from genotype:

```typescript
class GeneExpressionSystem implements System {
  update(world: World): void {
    const entities = world.query()
      .with('genome')
      .executeEntities();

    for (const entity of entities) {
      const genome = entity.getComponent<GenomeComponent>('genome');

      // Calculate expression for each gene
      for (const [geneName, alleles] of genome.alleles) {
        const dominance = genome.dominance.get(geneName);
        const expressed = calculateExpression(alleles, dominance);

        genome.genes.set(geneName, {
          allele1: alleles[0],
          allele2: alleles[1],
          expressed
        });
      }

      // Update component
      entity.updateComponent('genome', () => genome);
    }
  }
}

function calculateExpression(
  alleles: [number, number],
  dominance: Dominance
): number {
  const [a1, a2] = alleles;

  switch (dominance) {
    case 'dominant':
      return Math.max(a1, a2);
    case 'recessive':
      return Math.min(a1, a2);
    case 'codominant':
      return (a1 + a2) / 2;
    case 'overdominant':
      return Math.max(a1, a2) * 1.2;  // Hybrid vigor
    default:
      return (a1 + a2) / 2;
  }
}
```

### ChimericPhenotypeSystem

For chimeras, blend multiple genomes:

```typescript
class ChimericPhenotypeSystem implements System {
  update(world: World): void {
    const chimeras = world.query()
      .with('chimeric')
      .executeEntities();

    for (const entity of chimeras) {
      const chimeric = entity.getComponent<ChimericCoordinationComponent>('chimeric');

      // Get all genome components
      const genomes = chimeric.genomeIds
        .map(id => entity.components.get(`genome_${id}`) as GenomeComponent)
        .filter(g => g !== undefined);

      // Calculate mosaic phenotype
      const phenotype = calculateChimericPhenotype(genomes, chimeric);

      // Store in phenotype component
      if (!entity.hasComponent('phenotype')) {
        entity.addComponent(createPhenotypeComponent(phenotype));
      } else {
        entity.updateComponent('phenotype', () => phenotype);
      }
    }
  }
}
```

---

## Reproduction Systems

### SexualReproductionSystem

```typescript
class SexualReproductionSystem implements System {
  reproduce(mother: Entity, father: Entity, world: World): Entity {
    // Create offspring entity
    const offspring = world.createEntity();

    // Inherit position (born near mother)
    const motherPos = mother.getComponent<PositionComponent>('position');
    offspring.addComponent(createPositionComponent(
      motherPos.x + randomOffset(),
      motherPos.y + randomOffset()
    ));

    // Create hybrid genome
    const genome = createSexualGenome(mother, father);
    offspring.addComponent(genome);

    // Inherit/blend other components
    const motherPersonality = mother.getComponent<PersonalityComponent>('personality');
    const fatherPersonality = father.getComponent<PersonalityComponent>('personality');

    const childPersonality = blendPersonalities(
      motherPersonality,
      fatherPersonality,
      genome  // Genetics affects personality
    );
    offspring.addComponent(childPersonality);

    // Add agent component if parents are agents
    if (mother.hasComponent('agent')) {
      offspring.addComponent(createAgentComponent());
    }

    // Add needs
    offspring.addComponent(createNeedsComponent());

    // Add memory (blank slate, but may inherit some instincts)
    offspring.addComponent(createMemoryComponent());

    return offspring;
  }
}
```

### AsexualReproductionSystem

```typescript
class AsexualReproductionSystem implements System {
  reproduce(parent: Entity, world: World): Entity {
    const offspring = world.createEntity();

    // Clone genome
    const parentGenome = parent.getComponent<GenomeComponent>('genome');
    const clonedGenome = cloneGenome(parentGenome);

    // Apply mutations (higher rate for asexual)
    applyMutations(clonedGenome, 0.03);

    clonedGenome.generation = parentGenome.generation + 1;
    clonedGenome.parents = [parent.id];
    clonedGenome.reproductionMode = 'asexual';

    offspring.addComponent(clonedGenome);

    // Clone other components
    for (const [type, component] of parent.components) {
      if (type === 'genome' || type === 'position') continue;  // Skip

      // Clone component
      offspring.addComponent(cloneComponent(component));
    }

    // Slightly offset position
    const parentPos = parent.getComponent<PositionComponent>('position');
    offspring.addComponent(createPositionComponent(
      parentPos.x + randomOffset(),
      parentPos.y + randomOffset()
    ));

    return offspring;
  }
}
```

### ChimericFusionSystem

Creates chimeras by merging entities:

```typescript
class ChimericFusionSystem implements System {
  fuseEntities(
    entity1: Entity,
    entity2: Entity,
    world: World,
    consensual: boolean
  ): Entity {
    // Create new chimeric entity
    const chimera = world.createEntity();

    // Extract genomes
    const genome1 = entity1.getComponent<GenomeComponent>('genome');
    const genome2 = entity2.getComponent<GenomeComponent>('genome');

    // Add both genomes as separate components!
    // This is the key: multiple genome components
    const genomeA = { ...genome1 };
    genomeA.genomeId = 'lineage_A';
    genomeA.tissues = ['skin', 'nervous_system', 'left_organs'];
    genomeA.cellPercentage = 60;
    genomeA.dominance = 0.6;

    const genomeB = { ...genome2 };
    genomeB.genomeId = 'lineage_B';
    genomeB.tissues = ['blood', 'muscles', 'right_organs'];
    genomeB.cellPercentage = 40;
    genomeB.dominance = 0.4;

    chimera.addComponent(genomeA);
    chimera.addComponent(genomeB);

    // Add chimeric coordination
    chimera.addComponent(createChimericCoordinationComponent({
      genomeIds: ['lineage_A', 'lineage_B'],
      consciousness: consensual ? 'shared' : 'dominant',
      formationType: 'symbiotic',
      constituents: [entity1.id, entity2.id]
    }));

    // Merge other components
    mergePersonalities(chimera, entity1, entity2);
    mergeMemories(chimera, entity1, entity2);

    // Position at midpoint
    const pos1 = entity1.getComponent<PositionComponent>('position');
    const pos2 = entity2.getComponent<PositionComponent>('position');
    chimera.addComponent(createPositionComponent(
      (pos1.x + pos2.x) / 2,
      (pos1.y + pos2.y) / 2
    ));

    // Remove original entities (they merged)
    world.removeEntity(entity1.id);
    world.removeEntity(entity2.id);

    return chimera;
  }
}
```

---

## Querying Chimeras

Systems can query for chimeric entities:

```typescript
// Find all chimeras
const chimeras = world.query()
  .with('chimeric')
  .executeEntities();

// Find entities with genome
const hasGenome = world.query()
  .with('genome')
  .executeEntities();

// Find entities with MULTIPLE genomes (chimeras)
const multipleGenomes = entities.filter(entity => {
  const genomeComponents = Array.from(entity.components.entries())
    .filter(([type, _]) => type === 'genome');
  return genomeComponents.length > 1;
});
```

---

## Component Registry

Register genome-related components:

```typescript
// Register component types
ComponentRegistry.register({
  type: 'genome',
  version: 1,
  createDefault: () => createGenomeComponent({
    generation: 0,
    parents: [],
    genes: new Map(),
    reproductionMode: 'sexual'
  }),
  validate: (data) => {
    return data.type === 'genome' &&
           typeof data.generation === 'number' &&
           Array.isArray(data.parents);
  }
});

ComponentRegistry.register({
  type: 'chimeric',
  version: 1,
  createDefault: () => createChimericCoordinationComponent({
    genomeIds: [],
    consciousness: 'unified',
    formationType: 'fusion'
  }),
  validate: (data) => {
    return data.type === 'chimeric' &&
           Array.isArray(data.genomeIds) &&
           data.genomeIds.length >= 2;
  }
});
```

---

## Personality from Genetics (ECS Way)

```typescript
// Personality is DERIVED from genome but stored separately
function derivePersonalityFromGenome(
  genome: GenomeComponent,
  environment: EnvironmentComponent,
  experiences: MemoryComponent
): PersonalityComponent {

  // Get genetic base values
  const geneticBase = {
    openness: genome.genes.get('openness')?.expressed ?? 50,
    conscientiousness: genome.genes.get('conscientiousness')?.expressed ?? 50,
    extraversion: genome.genes.get('extraversion')?.expressed ?? 50,
    agreeableness: genome.genes.get('agreeableness')?.expressed ?? 50,
    neuroticism: genome.genes.get('neuroticism')?.expressed ?? 50,
    workEthic: genome.genes.get('workEthic')?.expressed ?? 50,
    creativity: genome.genes.get('creativity')?.expressed ?? 50,
    generosity: genome.genes.get('generosity')?.expressed ?? 50,
    leadership: genome.genes.get('leadership')?.expressed ?? 50
  };

  // Apply environmental and experiential modifiers
  const personality = applyModifiers(geneticBase, environment, experiences);

  return {
    type: 'personality',
    version: 1,
    ...personality
  };
}

// System that keeps personality in sync with genome
class PersonalityGeneticsSystem implements System {
  update(world: World): void {
    const entities = world.query()
      .with('genome')
      .with('personality')
      .executeEntities();

    for (const entity of entities) {
      const genome = entity.getComponent<GenomeComponent>('genome');
      const environment = entity.getComponent<EnvironmentComponent>('environment');
      const experiences = entity.getComponent<MemoryComponent>('memory');

      // Recalculate personality from genetics + environment + experience
      const newPersonality = derivePersonalityFromGenome(
        genome,
        environment,
        experiences
      );

      entity.updateComponent('personality', () => newPersonality);
    }
  }
}
```

---

## Benefits of Component-Based DNA

### 1. Chimeras are Natural

```typescript
// Chimera = entity with multiple genome components
// No special case needed!

const genomes = Array.from(entity.components.values())
  .filter(c => c.type === 'genome');

if (genomes.length > 1) {
  // This is a chimera!
}
```

### 2. Easy to Extend

```typescript
// Add new genetic component without modifying existing ones
entity.addComponent(createEpigeneticComponent({
  methylation: new Map(),
  histoneMarks: new Map()
}));

entity.addComponent(createMitochondrialGenomeComponent({
  genes: new Map(),
  parent: motherId  // Only inherited from mother
}));
```

### 3. Systems Can Operate on Genes

```typescript
// Mutation system
class MutationSystem implements System {
  update(world: World): void {
    const entities = world.query()
      .with('genome')
      .executeEntities();

    for (const entity of entities) {
      const genome = entity.getComponent<GenomeComponent>('genome');

      // Apply random mutations
      if (Math.random() < 0.001) {  // 0.1% chance
        applyRandomMutation(genome);
        entity.updateComponent('genome', () => genome);
      }
    }
  }
}

// Inbreeding detection system
class InbreedingDetectionSystem implements System {
  calculateInbreeding(entity: Entity): number {
    const genome = entity.getComponent<GenomeComponent>('genome');

    if (genome.parents.length !== 2) return 0;

    const [parent1, parent2] = genome.parents.map(id => world.getEntity(id));

    // Check common ancestors
    return calculateKinship(parent1, parent2);
  }
}
```

### 4. Serialization is Simple

```typescript
// Save
const saved = {
  entityId: entity.id,
  components: Array.from(entity.components.entries()).map(([type, component]) => ({
    type,
    data: component
  }))
};

// Load
const entity = world.createEntity(saved.entityId);
for (const { type, data } of saved.components) {
  entity.addComponent(data);
}
```

---

## Example: Creating a Chimeric Agent

```typescript
function createMeldedAgent(
  agent1: Entity,
  agent2: Entity,
  world: World
): Entity {

  const melded = world.createEntity();

  // Extract and modify genomes
  const genome1 = agent1.getComponent<GenomeComponent>('genome');
  const genome2 = agent2.getComponent<GenomeComponent>('genome');

  // Add both genomes
  melded.addComponent({
    ...genome1,
    type: 'genome',
    genomeId: 'lineage_A',
    tissues: ['structural', 'nervous', 'digestive'],
    cellPercentage: 70,
    dominance: 0.7
  });

  melded.addComponent({
    ...genome2,
    type: 'genome',
    genomeId: 'lineage_B',
    tissues: ['circulatory', 'immune', 'energy'],
    cellPercentage: 30,
    dominance: 0.3
  });

  // Add chimeric coordination
  melded.addComponent(createChimericCoordinationComponent({
    genomeIds: ['lineage_A', 'lineage_B'],
    consciousness: 'shared',
    formationType: 'symbiotic',
    constituents: [agent1.id, agent2.id]
  }));

  // Merge personalities (weighted blend)
  const personality1 = agent1.getComponent<PersonalityComponent>('personality');
  const personality2 = agent2.getComponent<PersonalityComponent>('personality');

  melded.addComponent(blendPersonalities(personality1, personality2, 0.7, 0.3));

  // Merge memories
  const memories1 = agent1.getComponent<MemoryComponent>('memory');
  const memories2 = agent2.getComponent<MemoryComponent>('memory');

  melded.addComponent(mergeMemories(memories1, memories2));

  // Add agent component
  melded.addComponent(createAgentComponent());

  // Add position
  const pos1 = agent1.getComponent<PositionComponent>('position');
  melded.addComponent(createPositionComponent(pos1.x, pos1.y));

  // Add needs
  melded.addComponent(createNeedsComponent());

  return melded;
}
```

---

## Tri-Gender Reproduction (ECS)

```typescript
function reproduceTriGender(
  parent1: Entity,
  parent2: Entity,
  parent3: Entity,
  world: World
): Entity {

  const offspring = world.createEntity();

  // Get genomes
  const genome1 = parent1.getComponent<GenomeComponent>('genome');
  const genome2 = parent2.getComponent<GenomeComponent>('genome');
  const genome3 = parent3.getComponent<GenomeComponent>('genome');

  // Create tri-genome offspring
  const childGenome = createGenomeComponent({
    generation: Math.max(genome1.generation, genome2.generation, genome3.generation) + 1,
    parents: [parent1.id, parent2.id, parent3.id],
    genes: blendTriGenderGenes(genome1, genome2, genome3),
    reproductionMode: 'tri_gender'
  });

  childGenome.contributionRatios = [0.33, 0.33, 0.34];

  offspring.addComponent(childGenome);

  // Add other components
  offspring.addComponent(createAgentComponent());
  offspring.addComponent(createNeedsComponent());
  offspring.addComponent(createMemoryComponent());

  // Personality from all three parents
  const personalities = [
    parent1.getComponent<PersonalityComponent>('personality'),
    parent2.getComponent<PersonalityComponent>('personality'),
    parent3.getComponent<PersonalityComponent>('personality')
  ];

  offspring.addComponent(blendMultiplePersonalities(personalities, [0.33, 0.33, 0.34]));

  return offspring;
}
```

---

## Conclusion

**DNA as components = true composition**

- ✅ Chimeras are natural (multiple genome components)
- ✅ Easy to extend (add new genetic components)
- ✅ Systems operate on components (mutations, expression, etc.)
- ✅ Serialization is automatic (components serialize)
- ✅ No inheritance hierarchy (pure composition)

**This matches the ECS architecture perfectly.**
