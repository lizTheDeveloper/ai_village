# Research Papers - Knowledge Tree Data

This directory contains the complete data definitions for the knowledge-based research system, featuring papers written with extensive Pratchett/Moers/Gaiman/Adams-style footnotes.

## Overview: N-of-M Research Sets

Research papers are organized into **sets** with **uncertain unlock paths**:
- **Papers belong to sets** - A set contains all papers related to a technology (M papers total)
- **N-of-M unlock logic** - Technology unlocks when N papers from the set are discovered (not all M papers needed!)
- **Hidden paths** - Researchers don't know which papers are "required" until after unlock
- **Agents must READ papers** to gain knowledge and skills
- **Agents must read all prerequisites** before they can AUTHOR a new paper
- **Emergent research** - Research paths unfold organically based on what agents discover

### Why N-of-M?

Like real-world AI research (perceptron → LSTM → attention → transformer → LLMs), researchers don't know which papers will be crucial until the technology unlocks. The `basic_agriculture` set has 7 papers, but you only need 2 to unlock Agriculture I. Which 2? Any 2! (Though `seed_selection` is mandatory.) This creates natural exploration and uncertainty - just like real research!

## Tree Structure Visualization

### Agriculture Tree

```
                    AGRICULTURE I TECHNOLOGY
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌───────────────┐                   ┌──────────────┐
│ Seed Selection│                   │Soil Preparation│
│   (Tier 1)    │                   │   (Tier 1)     │
└───────┬───────┘                   └────────┬───────┘
        │                                    │
        └──────────┬─────────────────────────┘
                   ↓
          AGRICULTURE II TECHNOLOGY
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
┌────────────────┐    ┌──────────────────┐
│   Irrigation   │    │  Fertilization   │
│  Principles    │    │     Theory       │
│   (Tier 2)     │    │    (Tier 2)      │
└────────┬───────┘    └────────┬─────────┘
         │                     │
         │         ┌───────────┘
         │         │
         └────┬────┘
              ↓
    ┌──────────────────┐
    │  Crop Rotation   │
    │    (Tier 3)      │
    └─────────┬────────┘
              │
              ├────────────────────────┐
              ↓                        ↓
    ┌──────────────────┐      ┌────────────────┐
    │Climate Control   │      │ Year-Round     │
    │    (Tier 4)      │      │   Growing      │
    └──────────────────┘      │   (Tier 4)     │
              │               └────────────────┘
              │                        │
              └────────┬───────────────┘
                       ↓
          GREENHOUSE CULTIVATION TECHNOLOGY
```

### Metallurgy Tree

```
              BASIC METALLURGY TECHNOLOGY
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌──────────────┐  ┌──────────┐  ┌────────────┐
│     Ore      │  │ Smelting │  │    Iron    │
│Identification│  │  Basics  │  │  Working   │
│  (Tier 1)    │  │ (Tier 1) │  │  (Tier 2)  │
└──────────────┘  └──────────┘  └──────┬─────┘
                                        │
                    ┌───────────────────┴──────────┐
                    ↓                              ↓
            ┌──────────────┐              ┌───────────────┐
            │   Carbon     │              │  Quenching    │
            │  Infusion    │              │    Theory     │
            │  (Tier 3)    │              │   (Tier 3)    │
            └──────┬───────┘              └───────┬───────┘
                   │                              │
                   └──────────┬───────────────────┘
                              ↓
                    STEEL FORGING TECHNOLOGY
                              │
                   ┌──────────┴─────────┐
                   ↓                    ↓
           ┌──────────────┐     ┌─────────────────┐
           │Alloy Theory  │     │   Legendary     │
           │  (Tier 4)    │     │  Metallurgy     │
           └──────────────┘     │    (Tier 5)     │
                   │            └─────────────────┘
                   │                     │
                   └──────────┬──────────┘
                              ↓
                  LEGENDARY METALS TECHNOLOGY
```

### Alchemy Tree

```
              BASIC ALCHEMY TECHNOLOGY
                        ↓
            ┌───────────┴────────────┐
            ↓                        ↓
    ┌──────────────┐         ┌──────────────┐
    │  Substance   │         │ Extraction   │
    │Identification│         │   Methods    │
    │  (Tier 1)    │         │  (Tier 1)    │
    └──────┬───────┘         └──────┬───────┘
           └──────────┬──────────────┘
                      ↓
              ┌──────────────┐
              │   Mixture    │
              │    Theory    │
              │   (Tier 2)   │
              └──────┬───────┘
                     │
         ┌───────────┴────────────┐
         ↓                        ↓
┌──────────────────┐      ┌──────────────────┐
│     Potion       │      │ Transmutation    │
│  Formulation     │      │   Principles     │
│    (Tier 3)      │      │    (Tier 4)      │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │        ┌────────────────┘
         │        │
         └───┬────┘
             ↓
    ┌──────────────────┐
    │  Grand Alchemy   │
    │    (Tier 5)      │
    └──────────────────┘
             ↓
    LEGENDARY ALCHEMY TECHNOLOGY
```

## N-of-M Technology Unlock Conditions

Technologies unlock when **N papers from a set of M** have been published:

| Technology | Set | N of M | Mandatory Papers | Unlocks |
|------------|-----|--------|------------------|---------|
| **Agriculture I** | basic_agriculture | 2 of 7 | seed_selection | Farm plots, crops |
| **Agriculture II** | basic_agriculture | 4 of 7 | irrigation_principles, fertilization_theory | Irrigation, fertilizer |
| **Greenhouse Cultivation** | basic_agriculture | 6 of 7 | climate_control, year_round_growing | Greenhouses |
| **Basic Metallurgy** | basic_metallurgy | 2 of 3 | smelting_fundamentals | Furnace, smithy |
| **Iron Age** | basic_metallurgy | 3 of 3 | (all required) | Iron crafting |
| **Steel Forging** | advanced_metallurgy | 2 of 4 | carbon_infusion | Steel crafting |
| **Advanced Alloys** | advanced_metallurgy | 3 of 4 | alloy_theory | Bronze, brass |
| **Legendary Metals** | advanced_metallurgy | 4 of 4 | legendary_metallurgy | Masterwork |
| **Basic Alchemy** | basic_alchemy | 2 of 3 | substance_identification | Alchemy lab |
| **Advanced Alchemy** | basic_alchemy | 3 of 3 | mixture_theory | Acids, bases |
| **Medicine** | advanced_alchemy | 1 of 3 | potion_formulation | Healing potions |
| **Transmutation** | advanced_alchemy | 2 of 3 | transmutation_principles | Transmutation |
| **Legendary Alchemy** | advanced_alchemy | 3 of 3 | grand_alchemy | Universal solvent |
| **Basic Runes** | rune_magic | 2 of 6 | symbol_recognition | Basic runes |
| **Intermediate Runes** | rune_magic | 4 of 6 | rune_combinations, activation_methods | Combine runes |
| **Elder Runes** | rune_magic | 6 of 6 | elder_runes | Elder runes |

## Key Features

### Emergent Discovery Path with Uncertainty

Agents don't know what comes next - they only see:
1. Papers they can **read** (prerequisites met)
2. Papers they can **author** (have read all prerequisites)
3. Papers they've **authored** (contributing to unknown unlocks)

Technologies are **hidden** until enough papers are published. This means:
- Agents don't know they're working toward "Steel Forging" - they just know "I've read about iron, now I can write about carbon infusion"
- Agents don't know they only need 2 of 4 papers for Steel Forging - they might author all 4!
- Different villages might unlock the same tech via different paper combinations
- Some papers are "wasted effort" but still grant skills
- The research tree unfolds organically based on what interests agents

### N-of-M Creates Natural Branching

Example from Basic Agriculture (7 papers, 3 unlock tiers):
- **Agriculture I**: Need 2 of 7 (with seed_selection mandatory)
  - Could be: seed_selection + soil_preparation
  - Or: seed_selection + irrigation_principles
  - Or: seed_selection + fertilization_theory
  - Or any other combination with seed_selection!
- **Agriculture II**: Need 4 of 7 (with 2 mandatory)
- **Greenhouse**: Need 6 of 7 (with 2 mandatory)

This means researchers can take different paths to the same technology!

### Branching Paths

Many papers contribute to **multiple technologies**:
- `iron_working` contributes to both **Basic Metallurgy** AND **Steel Forging**
- This creates branching points where agents must choose directions
- Some paths are longer than others (agriculture is more linear, metallurgy has more branches)

### Tier Progression

Papers are organized in 5 tiers:
- **Tier 1**: No prerequisites, teens can read
- **Tier 2**: Requires 1-2 Tier 1 papers, teens can read
- **Tier 3**: Requires multiple Tier 2 papers, adults recommended
- **Tier 4**: Complex prerequisites, adults only
- **Tier 5**: Pinnacle papers, elders recommended

### Skill Requirements & Grants

Papers have skill requirements and grant skill XP:
```typescript
{
  minimumSkills: { metallurgy: 20 },  // Need this to READ
  skillGrants: { metallurgy: 15 }      // Gain this by READING
}
```

This creates natural progression:
1. Read Tier 1 papers (no requirements) → Gain basic skills
2. Use those skills to read Tier 2 papers → Gain more skills
3. Eventually qualify for advanced papers

## Footnote Style Guide

Papers include extensive footnotes in the style of Terry Pratchett and Walter Moers:

**Pratchett Style:**
- Informative but humorous
- Points out absurdities in the subject matter
- Provides "historical context" for fictional events
- Often more entertaining than the main text
- Uses asterisks: *, **, ***, etc.

**Moers Style:**
- Fantastical elaboration
- Invented creatures, places, and incidents
- Elaborate digressions
- Nested footnotes (footnotes within footnotes)
- Uses symbols: †, ††, †††, ‡, ‡‡, etc.

Example from "Ore Identification":
> *This may seem obvious to the modern farmer, but in earlier times the distinction was not well understood. Historical records indicate that approximately 40% of early agricultural failures were due to attempting to plant rocks, small pebbles, or in one notable case, dried beans that had already been cooked†.
>
> †The bean incident is not discussed in polite agricultural circles.

## Statistics

Current paper collection:
- **Total Papers**: 20
- **Agriculture**: 7 papers (Tier 1-4)
- **Metallurgy**: 7 papers (Tier 1-5)
- **Alchemy**: 6 papers (Tier 1-5)
- **Root Papers** (no prerequisites): 6
- **Technologies**: 13

## Usage

```typescript
import {
  ALL_RESEARCH_PAPERS,
  ALL_RESEARCH_SETS,
  getPaper,
  getResearchSet,
  getReadablePapers,
  isTechnologyUnlocked,
  getTechnologyProgress
} from './index.js';

// Get papers an agent can read
const readPapers = new Set(['seed_selection', 'soil_preparation']);
const readable = getReadablePapers(readPapers);
// Returns papers where all prerequisites are in readPapers

// Check if a technology unlocked (N-of-M logic)
const published = new Set(['seed_selection', 'soil_preparation']);
const unlocked = isTechnologyUnlocked('agriculture_i', published);
// Returns: true (has 2 of 7 papers, both from basic_agriculture set)

// Get progress toward a technology
const progress = getTechnologyProgress('agriculture_i', published);
// Returns: 1.0 (100% - need 2, have 2)

const progress2 = getTechnologyProgress('agriculture_ii', published);
// Returns: 0.5 (50% - need 4, have 2)

// Get a research set
const agricSet = getResearchSet('basic_agriculture');
// Returns ResearchSet with all 7 papers and 3 unlock conditions
```

## Integration Notes

**This data is standalone and not yet integrated into the game systems.**

When integrated, it will connect to:
- `ResearchLibrarySystem` - manages paper publication
- `ReadingSystem` - handles agents reading papers
- `AuthoringSystem` - handles agents writing papers
- `TechnologyProgressSystem` - tracks unlocks
- `AgentKnowledgeComponent` - tracks what each agent has read

See `openspec/specs/research-system/knowledge-tree.md` for the full system specification.
