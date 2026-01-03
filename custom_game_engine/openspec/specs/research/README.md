# Research System Specifications

This directory contains specifications for the research system, including papers, technologies, and strategic guidance.

## Documents

### [Research Strategy Guide](./research-strategy-guide.md)
**Comprehensive strategic analysis and player documentation**

Mathematical analysis of research development strategies, including:
- Research speed formula breakdown
- Strategic archetypes (Build Schools First, Hire Researchers Fast, Elite Academy, etc.)
- Optimization priorities (buildings > researchers > skill > focus)
- Comparative timelines (5 days to 183 days depending on strategy)
- Common mistakes and how to avoid them
- Advanced optimization techniques

**Purpose:** Help players understand research mechanics and make informed strategic decisions

**Generated from:** Mathematical simulation (`/scripts/research-time-scenarios.ts`)

---

## Related Specifications

- **[Research Interface](../ui/research-interface.md)** - UI/UX design for research panels
- **[Research Papers](../../packages/world/src/research-papers/)** - Paper definitions (523 papers across 10 complexity levels)
- **[Research Sets](../../packages/world/src/research-papers/*-sets.ts)** - Paper groupings and technology unlocks

## Research System Overview

### Papers
- **Total:** 523 papers
- **Complexity:** 1 (beginner) to 10 (master)
- **Fields:** Nature, Alchemy, Cuisine, Construction, Engineering, Arcane, Physics, Mathematics

### Technologies
Unlocked through N-of-M requirements:
- Complete N papers from a set of M papers
- Mandatory papers must be included in the N
- Grants buildings, abilities, items, recipes

### Research Speed Formula
```
researchSpeed = baseSpeed × (1 + skillBonus) × (1 + buildingBonus) × numResearchers × focusMultiplier
```

### Key Mechanics
- **Discovery-based:** Players only see papers they've discovered
- **Organic growth:** Papers lead to papers through prerequisites
- **Surprise unlocks:** Technologies appear when prerequisites are met (hidden from player)
- **Skill progression:** Researchers gain skill as they complete papers
- **Focus management:** Keep researchers engaged for 1.5× speed boost

## For Developers

### Adding New Papers
1. Define paper in appropriate research set (`herbalism-cooking-sets.ts`, `construction-building-sets.ts`, etc.)
2. Add paper spec to `/scripts/paper-specs/` as JSON
3. Run `/scripts/generate-missing-papers-only.ts` to generate paper content
4. Paper appears in game automatically via registry

### Modifying Research Speed
Edit formula in:
- `/packages/core/src/systems/ResearchSystem.ts` (implementation)
- `/openspec/specs/ui/research-interface.md` (documentation)
- `/scripts/research-time-scenarios.ts` (simulation)

### Strategic Balance
When adjusting research parameters:
1. Run `npx tsx scripts/research-time-scenarios.ts` to see impact
2. Verify timelines are reasonable (aim for 20-30 days natural progression)
3. Update strategy guide if major changes
4. Test in-game to confirm feel

## For Content Creators

### Writing Papers
Papers use Pratchett/Moers/Adams/Gaiman style:
- Humorous footnotes
- Academic tone with absurd content
- Practical knowledge wrapped in wit
- References to other papers

See existing papers in `/packages/world/src/research-papers/*-papers.ts` for examples.

### Designing Technologies
Technology unlocks should:
- Feel like natural progression (not arbitrary gates)
- Provide meaningful gameplay changes
- Have clear prerequisites (papers that make sense)
- Balance N-of-M requirements (25-75% of papers, not 85%+)

See [Research Strategy Guide](./research-strategy-guide.md) for balance considerations.
