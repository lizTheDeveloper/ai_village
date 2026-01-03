> **System:** research-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Work Order: Knowledge-Based Research Tree System

**Status:** ⏳ Ready
**Priority:** High
**Estimated Effort:** 12-18 hours
**Dependencies:** Phase 13 (Research & Discovery) ✅ Complete
**Spec:** [KNOWLEDGE_RESEARCH_TREE_SPEC.md](./KNOWLEDGE_RESEARCH_TREE_SPEC.md)

## Overview

Transform the research system from passive progress accumulation to an active education-driven model where agents must read academic papers to gain knowledge before contributing new research. This creates emergent specialization, generational knowledge transfer, and meaningful research progression.

## Goals

1. **Paper-based Knowledge** - Research progress driven by reading and writing papers, not passive accumulation
2. **Education Prerequisites** - Agents must read prerequisite papers before authoring new ones
3. **Skill-Based Learning** - Reading papers grants skill experience in related fields
4. **Age Restrictions** - Only teens, adults, and elders can read research papers (children cannot)
5. **Technology Unlocks** - Technologies unlock when ALL tagged papers are discovered
6. **Emergent Difficulty** - Later papers harder to discover due to prerequisite chains

## Implementation Tasks

### Phase 1: Component Architecture (2-3 hours)

- [ ] **1.1** Create `ResearchPaperComponent`
  - Paper identity (ID, title, field, tier)
  - Prerequisites (papers that must be read first)
  - Reading requirements (age, skills)
  - Skill grants (skills gained by reading)
  - Technology tags (technologies this contributes to)
  - Publication metadata (author, tick, status)
  - Tracking (who has read it)

- [ ] **1.2** Create `AgentKnowledgeComponent`
  - Track papers read by agent
  - Track papers authored by agent
  - Current reading state
  - Potential contributions (papers agent could write)

- [ ] **1.3** Create `ReadingProgressComponent`
  - Track active reading sessions
  - Paper being read
  - Reader entity ID
  - Progress percentage
  - Start tick
  - Comprehension level

### Phase 2: System Implementation (5-7 hours)

- [ ] **2.1** Implement `ResearchLibrarySystem`
  - Manage global collection of published papers
  - `getReadablePapers(agent)` - Filter by age and skills
  - `getAuthorablePapers(agent)` - Check prerequisite completion
  - `isTechnologyUnlocked(techId)` - Check if all tagged papers complete
  - `publishPaper(paper)` - Add new paper to library
  - Integration with existing library buildings

- [ ] **2.2** Implement `ReadingSystem`
  - Start reading sessions when agent begins reading
  - Update reading progress each tick based on:
    - Agent's relevant skills (higher = faster)
    - Paper tier (higher = slower)
    - Agent's focus/intelligence
  - On completion:
    - Grant skill experience from paper's `skillGrants`
    - Add paper to agent's `readPapers` set
    - Remove progress component
    - Trigger authorship potential check

- [ ] **2.3** Implement `AuthoringSystem`
  - Detect when agent can contribute (read all prerequisites)
  - Update agent's `potentialContributions` list
  - When agent chooses to author:
    - Create authoring progress component
    - Track writing progress over time
    - On completion, publish paper to library
  - Check technology unlocks after publication

- [ ] **2.4** Update `TechnologyProgressSystem`
  - Change from progress-based to paper-based unlocking
  - Monitor paper publications
  - Track completion of technology paper sets
  - Fire unlock events when all papers in set complete
  - Grant technology benefits (recipes, buildings, abilities)

### Phase 3: Behavior Integration (2-3 hours)

- [ ] **3.1** Update `research` behavior
  - Add library navigation
  - Add paper browsing logic
  - Add reading action
  - Add authoring action
  - LLM integration for paper selection

- [ ] **3.2** Implement age validation
  - Verify age when starting to read
  - Block `child` age category from reading
  - Allow `teen`, `adult`, `elder` to read appropriate tiers
  - Clear error messages when blocked

- [ ] **3.3** Implement skill validation
  - Check minimum skill requirements before reading
  - Provide feedback on skill gaps
  - Suggest prerequisite papers to build skills

- [ ] **3.4** Add library building requirement
  - Research behaviors require library access
  - Papers stored in library entities
  - Library capacity mechanics (optional)

### Phase 4: Content Creation (3-4 hours)

- [ ] **4.1** Map technologies to paper trees
  - Convert existing `ResearchDefinition` technologies
  - Identify which papers contribute to each tech
  - Ensure complete coverage of all technologies

- [ ] **4.2** Define prerequisite chains
  - Design paper dependency trees
  - Balance difficulty progression (Tier 1 → 5)
  - Create meaningful educational paths
  - Avoid circular dependencies

- [ ] **4.3** Write paper metadata
  - Create unique ID for each paper
  - Write descriptive titles
  - Assign appropriate fields
  - Set tier levels (1-5)
  - Define skill grants per paper
  - Set minimum age/skill requirements

- [ ] **4.4** Create paper content seeds
  - Write brief descriptions for each paper
  - Create LLM prompts for paper generation
  - Define paper structure/format
  - Cache generated content

### Phase 5: Testing & Balancing (2-3 hours)

- [ ] **5.1** Test technology unlock flow
  - Verify all technologies can be unlocked
  - Test prerequisite chains work correctly
  - Ensure no orphaned papers
  - Test edge cases (multiple paths to tech)

- [ ] **5.2** Balance reading times
  - Test Tier 1 reading speed (~100 ticks)
  - Scale appropriately for higher tiers
  - Adjust based on skill modifiers
  - Ensure feels rewarding not grindy

- [ ] **5.3** Test age/skill restrictions
  - Verify children cannot read papers
  - Test tier access for each age category
  - Test skill requirement blocking
  - Verify clear error messaging

- [ ] **5.4** Verify skill progression
  - Test skill grants apply correctly
  - Verify skill levels unlock new papers
  - Check natural progression path exists
  - Balance skill gain rates

- [ ] **5.5** Test generational knowledge transfer
  - Verify papers persist across generations
  - Test knowledge loss scenarios (all experts die)
  - Test rediscovery mechanics
  - Verify elder mentorship patterns emerge

## Acceptance Criteria

### Functional Requirements
- ✅ Agents can browse available papers in library
- ✅ Reading requires age ≥ teen and appropriate skills
- ✅ Reading grants skill experience from paper's skillGrants
- ✅ Agents can only author papers after reading prerequisites
- ✅ Technologies unlock when all tagged papers complete
- ✅ Children cannot read research papers
- ✅ Reading time scales with paper tier and agent skills

### Technical Requirements
- ✅ All new components use lowercase_with_underscores type names
- ✅ No silent fallbacks - throw errors for invalid states
- ✅ No clamping - use proper normalization (softmax, sigmoid)
- ✅ No console.log debug statements
- ✅ Performance optimized (cached queries, no loops with queries)

### Integration Requirements
- ✅ Works with existing library buildings
- ✅ Integrates with existing skill system
- ✅ Compatible with age/lifecycle system
- ✅ Preserves existing technology unlock benefits
- ✅ Dashboard shows paper publication/reading metrics

## Success Metrics

After implementation, monitor:
- **Paper Publication Rate** - Papers published per 1000 ticks
- **Reading Rate** - Papers read per researcher per 1000 ticks
- **Technology Unlock Rate** - Technologies unlocked per age
- **Knowledge Distribution** - % of population who have read each paper
- **Specialization Depth** - Average papers read per researcher
- **Research Community Size** - % of teen+ population reading papers

## Implementation Notes

### Age Categories (from AgentComponent.ts:104)
```typescript
type AgeCategory = 'child' | 'teen' | 'adult' | 'elder';
```

Reading permissions:
- `child`: Cannot read research papers
- `teen`: Can read Tier 1-2 papers (fundamentals)
- `adult`: Can read Tier 1-4 papers (advanced)
- `elder`: Can read all papers (mastery)

### Skill System Integration
Reading papers should:
1. Check agent's current skill level vs paper requirements
2. Grant experience based on paper's `skillGrants` field
3. Use skill level to modify reading speed (higher = faster)
4. Update SkillsComponent on completion

### Paper Tree Example
```
Technology: "Steel Forging"

iron_smelting (Tier 1)
├─ Prerequisites: none
├─ Tags: ["basic_metallurgy", "steel_forging"]
├─ Skill Grant: { metallurgy: 5 }
└─ Age Requirement: teen+

carbon_infusion (Tier 2)
├─ Prerequisites: ["iron_smelting"]
├─ Tags: ["advanced_metallurgy", "steel_forging"]
├─ Skill Grant: { metallurgy: 10 }
└─ Age Requirement: teen+, metallurgy 10+

quenching_theory (Tier 3)
├─ Prerequisites: ["iron_smelting", "carbon_infusion"]
├─ Tags: ["steel_forging"]
├─ Skill Grant: { metallurgy: 15 }
└─ Age Requirement: adult+, metallurgy 20+
```

When all 3 papers published → "Steel Forging" technology unlocks

### Migration Path
1. Keep existing ResearchDefinition structures temporarily
2. Create parallel paper-based system
3. Migrate technologies one by one
4. Remove old system once all migrated
5. Update existing save games (if persistence implemented)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too slow to unlock technologies | High | Balance reading times, allow parallel researchers |
| Papers too hard to discover | High | Clear UI showing prerequisites, tutorial papers |
| Knowledge loss feels punishing | Medium | Add "rediscovery" bonus, archive papers persist |
| LLM cost for paper content | Medium | Cache generated content, use templates |
| Complexity creep | Medium | Start with core loop, add features incrementally |

## Future Enhancements (Not in Scope)

- Multi-language papers requiring translation
- Paper quality affecting skill grants
- Co-authorship mechanics
- Paper citation networks
- Knowledge decay (forgetting over time)
- Physical book entities (can be stolen, burned)
- Field specialization bonuses
- University buildings for advanced research

## Related Work Orders

- Phase 13: Research & Discovery (✅ Complete - foundation system)
- Phase 30: Magic System (could use paper-based spell research)
- Skill System: Progressive Skill Reveal (🚧 In Progress - skill-gated content)

## Definition of Done

- [ ] All implementation tasks complete
- [ ] All acceptance criteria met
- [ ] Tests passing (if test suite exists)
- [ ] No console.log debug statements
- [ ] Dashboard shows research metrics
- [ ] Spec accuracy verified (implementation matches design)
- [ ] Performance acceptable (no frame drops during research)
- [ ] Documentation updated (if needed)
- [ ] Code review completed
- [ ] Merged to main branch
