# Genetics Research Tree - Tech Tree Addition

## Overview

Added a complete genetics research branch to the tech tree, culminating in extremely late-game genetic modification technologies. This integrates with the Species + Genetics + Body system to enable scientific genetic engineering.

## Research Progression

### Tier 3: Foundation

**Basic Genetics (`genetics_i`)**
- **Prerequisites**: Nature I, Alchemy I
- **Required Building**: Library
- **Progress Required**: 300
- **Description**: Study heredity, traits, and the fundamentals of biological inheritance.
- **Unlocks**:
  - Knowledge: Genetic Theory
  - Knowledge: Trait Inheritance
  - Ability: Analyze Genetics

### Tier 4: Mastery

**Selective Breeding (`genetics_ii`)**
- **Prerequisites**: Basic Genetics, Greenhouse Cultivation
- **Required Building**: Library
- **Progress Required**: 500
- **Description**: Master controlled breeding programs to enhance desired traits.
- **Unlocks**:
  - Building: Breeding Facility
  - Ability: Selective Breeding
  - Ability: Trait Selection
  - Knowledge: Pedigree Analysis

### Tier 5: Transcendence (Late-Game)

#### 1. Genetic Engineering (`genetic_engineering`)
The foundation for all advanced genetic technologies.

- **Prerequisites**: Selective Breeding, Alchemy I, Experimental Methods
- **Required Building**: Inventor's Hall
- **Required Materials**:
  - Rare Essence x10
  - Research Notes x50
- **Progress Required**: 1000
- **Description**: Unlock the ability to directly modify genetic code and manipulate hereditary traits.
- **Unlocks**:
  - Building: Gene Lab
  - Ability: Gene Splicing
  - Ability: Modify Genome
  - Knowledge: Genetic Code

#### 2. Chimera Synthesis (`chimera_synthesis`)
Create hybrid life forms by fusing multiple species.

- **Prerequisites**: Genetic Engineering, Arcane Studies
- **Required Building**: Gene Lab
- **Required Materials**:
  - Mythical Essence x5
  - Genetic Samples x20
- **Progress Required**: 1500
- **Description**: Master the forbidden art of creating hybrid life forms by fusing multiple species.
- **Unlocks**:
  - Ability: Create Chimera
  - Ability: Species Fusion
  - Recipe: Chimera Serum
  - Knowledge: Multi-Species Genetics

#### 3. Trait Engineering (`trait_engineering`)
Precision genetic trait manipulation.

- **Prerequisites**: Genetic Engineering
- **Required Building**: Gene Lab
- **Required Materials**:
  - Trait Catalyst x15
- **Progress Required**: 1200
- **Description**: Design and install specific genetic traits with precision control.
- **Unlocks**:
  - Ability: Install Trait
  - Ability: Remove Trait
  - Ability: Enhance Trait
  - Recipe: Trait Serum

#### 4. Mutation Control (`mutation_control`)
Direct evolutionary processes.

- **Prerequisites**: Genetic Engineering
- **Required Building**: Gene Lab
- **Progress Required**: 1100
- **Description**: Learn to trigger and direct beneficial mutations while suppressing harmful ones.
- **Unlocks**:
  - Ability: Induced Mutation
  - Ability: Mutation Suppression
  - Ability: Directed Evolution
  - Recipe: Mutagen
  - Recipe: Stabilizer

#### 5. Genetic Autonomy (`genetic_autonomy`)
The pinnacle of genetic mastery - self-determination.

- **Prerequisites**: Trait Engineering, Mutation Control, Chimera Synthesis
- **Required Building**: Gene Lab
- **Required Materials**:
  - Divine Essence x3
  - Genetic Template x1
- **Progress Required**: 2000
- **Description**: Enable beings to freely choose and modify their own genetic traits without imposed standards of "perfection."
- **Unlocks**:
  - Ability: Genetic Self-Modification (entities can modify their own genetics)
  - Ability: Choose Traits (select desired traits freely)
  - Ability: Genetic Expression Control (toggle traits on/off)
  - Knowledge: Autonomous Genetics

## Tech Tree Diagram

```
Tier 3:  Nature I + Alchemy I → Basic Genetics
                                      ↓
Tier 4:  Agriculture III + Basic Genetics → Selective Breeding
                                                    ↓
         ┌──────────────────────────────────────────────────────┐
         │                                                      │
Tier 5:  Experimental Methods + Alchemy I + Selective Breeding │
                           ↓                                    │
                   Genetic Engineering                          │
                 ↙       ↓       ↘                              │
        Trait Eng.  Mutation  Chimera Synth. ← Arcane Studies  │
                        ↓         ↓                             │
                        └─────┬───┘                             │
                              ↓                                 │
                    Genetic Autonomy ←────────────────────────────┘
```

## Integration with Existing Systems

### Species + Genetics + Body System

The genetics research tree unlocks scientific methods to interact with the genetic system:

1. **Analyze Genetics**: View an entity's genome, alleles, and hereditary modifications
2. **Selective Breeding**: Choose parents based on desired traits (complements natural reproduction)
3. **Gene Splicing**: Directly edit alleles and genome
4. **Modify Genome**: Add or remove specific alleles
5. **Create Chimera**: Fuse multiple species programmatically (beyond natural hybrids)
6. **Install/Remove Traits**: Add species traits to individuals
7. **Induced Mutation**: Trigger mutations with controlled types
8. **Genetic Self-Modification**: Entities choose and modify their own traits

### Divinity System Integration

Genetics research provides a **scientific alternative** to divine transformations:

| Divine Power | Scientific Equivalent |
|--------------|----------------------|
| Divine Wings | Trait Engineering (install wing trait) |
| Divine Transformation | Gene Splicing + Trait Engineering |
| Species Creation (deities) | Chimera Synthesis + Perfect Genome |
| Divine Evolution | Directed Evolution |

### Research System Integration

- **Field**: New `genetics` research field added to ResearchField type
- **Building**: Gene Lab building (unlocked by Genetic Engineering)
- **Dependencies**: Requires experimental research, alchemy, and nature knowledge
- **Material Costs**: Rare essences, genetic samples, catalysts

## Gameplay Implications

### Early Game (Tier 1-2)
No genetics research available. Natural reproduction only.

### Mid Game (Tier 3)
- **Basic Genetics**: Villagers can study inheritance patterns
- **Knowledge Unlocks**: Understanding of how traits pass to offspring

### Late Mid Game (Tier 4)
- **Selective Breeding**: Choose breeding pairs for desired traits
- **Breeding Facility**: Dedicated building for controlled reproduction
- **Pedigree Tracking**: Analyze family trees and bloodlines

### Late Game (Tier 5)
- **Genetic Engineering**: Direct genome editing
- **Gene Lab**: Advanced facility for genetic research
- **Trait Manipulation**: Add/remove specific traits

### Extreme Late Game (Tier 5 Advanced)
- **Chimera Creation**: Multi-species fusion
- **Mutation Control**: Direct evolutionary outcomes
- **Genetic Autonomy**: Entities freely choose and modify their own traits
- **Self-Determination**: Full control over genetic expression

## New Content IDs

### Buildings
- `breeding_facility` - Controlled breeding environment
- `gene_lab` - Advanced genetic research facility

### Abilities
- `analyze_genetics` - View genetic information
- `selective_breeding` - Choose breeding pairs
- `trait_selection` - Select desired traits for offspring
- `gene_splicing` - Edit genome directly
- `modify_genome` - Add/remove alleles
- `create_chimera` - Fuse multiple species
- `species_fusion` - Advanced multi-species combination
- `install_trait` - Add trait to individual
- `remove_trait` - Remove trait from individual
- `enhance_trait` - Improve existing trait
- `induced_mutation` - Trigger mutation
- `mutation_suppression` - Prevent harmful mutations
- `directed_evolution` - Guide evolutionary outcomes
- `genetic_self_modification` - Modify own genetics
- `choose_traits` - Select desired traits freely
- `genetic_expression_control` - Toggle traits on/off

### Knowledge
- `genetic_theory` - Understanding of inheritance
- `trait_inheritance` - How traits pass to offspring
- `pedigree_analysis` - Family tree analysis
- `genetic_code` - DNA structure and function
- `multi_species_genetics` - Cross-species genetics
- `autonomous_genetics` - Self-determined genetics

### Items/Recipes
- `chimera_serum` - Serum for species fusion
- `trait_serum` - Serum for trait manipulation
- `mutagen` - Induces mutations
- `stabilizer` - Prevents mutations
- `rare_essence` - Rare material for research
- `mythical_essence` - Legendary material
- `genetic_samples` - DNA samples
- `trait_catalyst` - Trait manipulation catalyst
- `divine_essence` - Divine-tier material
- `genetic_template` - Customizable genetic template

## Balance Considerations

### Progression Pacing
- **Tier 3** (300 progress): Accessible mid-game, theory only
- **Tier 4** (500 progress): Late mid-game, controlled breeding
- **Tier 5** (1000-2000 progress): Late to extreme late-game

### Material Requirements
Tier 5 research requires rare materials to gate access:
- Rare/Mythical/Divine essences (hard to obtain)
- Genetic samples (require specimen collection)
- Research notes (time investment)

### Prerequisites
Multiple prerequisite chains ensure proper progression:
- Nature → Genetics foundation
- Alchemy → Material transformation
- Experimental → Scientific method
- Arcane → Magical integration

### Power Level
Genetic modification is **extremely powerful**:
- Entities can freely choose their own traits
- Can trigger beneficial mutations on demand
- Can create custom species hybrids
- **Philosophy**: Self-determination over imposed ideals
- **Balanced by**:
  - Extreme research cost (2000 progress for Genetic Autonomy)
  - Rare material requirements
  - Late-game unlock (requires 4+ other Tier 5 techs)
  - Requires multiple specialized buildings

## Future Extensions

### Possible Additions
1. **Genetic Diseases**: Research to cure hereditary conditions
2. **Age Reversal**: Genetic rejuvenation techniques
3. **Memory Encoding**: Genetic memory inheritance
4. **Hive Genetics**: Collective genetic consciousness
5. **Viral Genetics**: Genetic modification via contagion
6. **Synthetic Life**: Entirely artificial organisms
7. **Genetic Weapons**: Targeted genetic warfare (dark path)

### Integration Opportunities
- **Magic System**: Genetic magic vs. scientific genetics
- **Divinity System**: Deities vs. scientists (who creates life?)
- **Economy**: Genetic services as tradeable commodities
- **Ethics**: Moral implications of genetic modification
- **Governance**: Regulation of genetic research

## Summary

The genetics research tree adds:
- **7 new research projects** (1 Tier 3, 1 Tier 4, 5 Tier 5)
- **1 new research field** (`genetics`)
- **20+ new abilities** for genetic manipulation
- **2 new buildings** (breeding facility, gene lab)
- **10+ new knowledge items**
- **5+ new recipes/items**

This creates a **scientific counterpart** to divine transformation, enabling a **technology-based path** to genetic mastery that complements (or competes with) divine intervention.

## Design Philosophy

The genetics tree emphasizes **self-determination over perfection**:

- **No "Perfect" Standard**: The pinnacle tech is "Genetic Autonomy," not "Perfect Genome"
- **Individual Choice**: Entities choose their own traits based on their values and desires
- **Diversity Over Uniformity**: Encourages variety rather than optimization toward a single ideal
- **Personal Expression**: Genetics becomes a form of self-expression, not conformity
- **Anti-Eugenics**: Explicitly rejects the concept of genetic "perfection" or superiority

This reflects the game's broader themes of emergent culture, individual agency, and the dangers of imposed ideals.
