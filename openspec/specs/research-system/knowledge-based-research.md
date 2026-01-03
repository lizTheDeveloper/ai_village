# Knowledge-Based Research Tree System - Specification

**Created:** 2026-01-02
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The knowledge-based research system transforms research from passive progress accumulation into an active education-driven model. Agents must read academic papers to gain knowledge and skills before they can author new papers and unlock technologies. This creates emergent specialization, generational knowledge transfer, and meaningful research progression.

---

## Core Concept

### Current System
- Researchers contribute progress to research topics
- Progress accumulates passively
- Technologies unlock when progress threshold is met
- Research papers exist but are not meaningfully integrated

### Knowledge-Based System
- Research papers arranged in tree structure with branches
- Each paper tagged with multiple technologies
- Technologies unlock when ALL tagged papers are discovered
- Agents must READ papers to gain knowledge before WRITING new papers
- Reading papers grants skill experience in related fields
- Later papers harder to discover (require reading prerequisites)
- Age restrictions apply (teens+, not young children)

---

## Paper Tree Structure

### ResearchPaperComponent

```typescript
interface ResearchPaperComponent extends Component {
  type: 'research_paper';

  // Paper Identity
  paperId: string;              // Unique identifier
  title: string;                // Display name
  field: ResearchField;         // Domain area
  tier: number;                 // 1-5 difficulty/advancement level

  // Knowledge Prerequisites
  prerequisitePapers: string[]; // Papers that must be read to author this

  // Reading Requirements
  minimumAge: AgeCategory;      // 'teen', 'adult', 'elder'
  minimumSkills?: {             // Optional skill requirements
    [skillId: string]: number;  // e.g., { metallurgy: 10 }
  };

  // Knowledge Effects
  skillGrants: {                // Skills gained by reading
    [skillId: string]: number;  // e.g., { metallurgy: 5 }
  };

  // Technology Contribution
  technologyTags: string[];     // Technologies this paper contributes to

  // Authorship
  authorId?: string;            // Entity ID of the agent who wrote it
  publicationTick?: number;     // When it was published

  // Status
  published: boolean;           // Available in library
  readBy: Set<string>;          // Entity IDs of agents who have read it
}
```

### AgentKnowledgeComponent

```typescript
interface AgentKnowledgeComponent extends Component {
  type: 'agent_knowledge';

  // Papers this agent has fully read
  readPapers: Set<string>;      // Paper IDs

  // Papers this agent has authored
  authoredPapers: Set<string>;  // Paper IDs

  // Current research focus
  currentReading?: string;      // Paper ID currently being read
  potentialContributions: string[]; // Papers agent could write next
}
```

### ReadingProgressComponent

```typescript
interface ReadingProgressComponent extends Component {
  type: 'reading_progress';

  paperId: string;              // Paper being read
  readerId: string;             // Agent reading it
  startTick: number;            // When reading started
  progressPercent: number;      // 0-100
  comprehension: number;        // 0-1, based on skill match
}
```

---

## Requirements

### REQ-KR-001: Paper Reading

Agents SHALL read papers to gain knowledge:

```
WHEN an agent with age >= teen starts reading a paper
AND agent meets skill requirements (if any)
THEN the system SHALL:
  1. Create ReadingProgressComponent
  2. Each tick, increment progress based on:
     - Agent's relevant skills (higher = faster)
     - Paper tier (higher = slower)
     - Agent's intelligence/focus
  3. On completion:
     - Grant skill experience from skillGrants
     - Add paper to agent's readPapers set
     - Remove progress component
     - Update potentialContributions list
```

Age restrictions:
- `child`: CANNOT read research papers
- `teen`: CAN read Tier 1-2 papers
- `adult`: CAN read Tier 1-4 papers
- `elder`: CAN read all papers (Tier 1-5)

### REQ-KR-002: Paper Authoring

Agents SHALL author papers only after reading prerequisites:

```
WHEN an agent has read all prerequisite papers for a discovery
AND agent decides to research
THEN the system SHALL:
  1. Identify papers in potentialContributions list
  2. LLM determines which contribution to make
  3. Create authoring progress component
  4. Agent works over time (slower than reading)
  5. On completion:
     - Publish paper to library
     - Add to agent's authoredPapers set
     - Check technology unlock conditions
     - Fire unlock events if needed
```

### REQ-KR-003: Technology Unlocks

Technologies SHALL unlock when all tagged papers are published:

```
WHEN a paper is published
THEN the system SHALL:
  1. For each technology tag on the paper:
     - Check if all required papers are published
     - IF all papers complete:
       - Mark technology as unlocked
       - Grant all technology benefits (recipes, buildings, abilities)
       - Emit "technology:unlocked" event
       - Update world state
```

### REQ-KR-004: Reading Speed Calculation

Reading progress SHALL be calculated:

```typescript
function calculateReadingProgress(
  agent: Entity,
  paper: ResearchPaperComponent,
  deltaTime: number
): number {
  const baseRate = 1;

  // Skill bonus - higher skill = faster reading
  const relevantSkill = getRelevantSkill(agent, paper.field);
  const skillBonus = 1 + (relevantSkill / 100);

  // Tier penalty - higher tier = slower reading
  const tierPenalty = 1 / paper.tier;

  // Intelligence/focus modifier
  const focusBonus = agent.stats?.intelligence || 1;

  // Calculate progress points per tick
  const progressPerTick = baseRate * skillBonus * tierPenalty * focusBonus;

  return progressPerTick * deltaTime;
}
```

Base reading times:
- Tier 1: ~100 ticks
- Tier 2: ~200 ticks
- Tier 3: ~300 ticks
- Tier 4: ~400 ticks
- Tier 5: ~500 ticks

(Modified by agent skills)

### REQ-KR-005: Skill Grants

Reading papers SHALL grant skill experience:

```
WHEN an agent completes reading a paper
THEN the system SHALL:
  1. For each skill in paper.skillGrants:
     - Add experience to agent's SkillsComponent
     - Update skill level if threshold crossed
     - Emit "skill:gained" event
  2. Update agent's knowledge tracking
  3. Unlock new readable papers (based on new skill levels)
```

---

## Paper Tree Example

### Technology: "Steel Forging"

Required papers: `["iron_smelting", "carbon_infusion", "quenching_theory"]`

```
iron_smelting (Tier 1)
├─ Prerequisites: []
├─ Tags: ["basic_metallurgy", "steel_forging"]
├─ Skill Grant: { metallurgy: 5 }
├─ Age: teen+
└─ Skill Requirements: none

carbon_infusion (Tier 2)
├─ Prerequisites: ["iron_smelting"]
├─ Tags: ["advanced_metallurgy", "steel_forging"]
├─ Skill Grant: { metallurgy: 10 }
├─ Age: teen+
└─ Skill Requirements: { metallurgy: 10 }

quenching_theory (Tier 3)
├─ Prerequisites: ["iron_smelting", "carbon_infusion"]
├─ Tags: ["steel_forging"]
├─ Skill Grant: { metallurgy: 15 }
├─ Age: adult+
└─ Skill Requirements: { metallurgy: 20 }
```

**Unlock Condition:** When all 3 papers are published → "Steel Forging" technology unlocks

---

## Systems Architecture

### ResearchLibrarySystem

**Responsibilities:**
- Manage global collection of published papers
- Provide paper discovery interface
- Check reading prerequisites
- Monitor technology completion

**Key Methods:**

```typescript
class ResearchLibrarySystem implements System {
  // Get papers available for an agent to read
  getReadablePapers(agent: Entity): ResearchPaperComponent[] {
    // Filter by age
    // Filter by skill requirements
    // Filter out already read
    // Return sorted by tier
  }

  // Get papers an agent could author (has read all prerequisites)
  getAuthorablePapers(agent: Entity): ResearchPaperComponent[] {
    // Check prerequisite completion
    // Return papers ready to author
  }

  // Check if a technology is unlocked
  isTechnologyUnlocked(technologyId: string): boolean {
    // Get all papers tagged with technology
    // Check if all are published
    // Return true/false
  }

  // Publish a new paper
  publishPaper(paper: ResearchPaperComponent): void {
    // Add to library
    // Check technology unlocks
    // Emit events
  }
}
```

### ReadingSystem

**Responsibilities:**
- Handle agents reading papers and gaining knowledge
- Update reading progress each tick
- Grant skills upon completion
- Update agent knowledge tracking

**Process:**

```
1. Agent selects a paper to read
2. System creates ReadingProgressComponent
3. Each tick:
   - Calculate progress increment
   - Update progressPercent
   - Check for completion
4. On completion:
   - Grant skill experience
   - Add to agent's readPapers set
   - Remove progress component
   - Update potentialContributions
```

### AuthoringSystem

**Responsibilities:**
- Detect when agents can contribute
- Guide paper authoring process
- Publish completed papers
- Check technology unlocks

**Process:**

```
1. Check if agent has read all prerequisite papers
2. If yes, add to potentialContributions
3. When agent decides to research:
   - LLM determines which contribution to make
   - Create authoring progress component
   - Agent works over time
4. On completion:
   - Publish paper to library
   - Check technology set completion
   - Fire unlock events if needed
```

### TechnologyProgressSystem

**Responsibilities:**
- Monitor paper publication
- Track completion of technology paper sets
- Fire unlock events
- Grant technology benefits

**Data Structure:**

```typescript
interface TechnologyDefinition {
  id: string;
  name: string;
  description: string;
  requiredPapers: string[];     // All papers needed
  unlocks: TechnologyUnlock[];  // What this grants
}

interface TechnologyState {
  technologyId: string;
  publishedPapers: Set<string>; // Papers completed so far
  unlocked: boolean;
  unlockedTick?: number;
}
```

---

## Difficulty Progression

### Natural Emergent Difficulty

```
Tier 1: 100% of researchers can contribute (starting knowledge)
   ↓
Tier 2: ~60% can contribute (those who read Tier 1)
   ↓
Tier 3: ~30% can contribute (dedicated scholars)
   ↓
Tier 4: ~10% can contribute (masters)
   ↓
Tier 5: ~3% can contribute (grandmasters)
```

This creates natural specialization - not every agent becomes a master researcher.

---

## Emergent Gameplay

### Knowledge Transfer
- Experienced researchers guide younger ones
- Villages develop unique research paths
- Cultural identity through specialization

### Knowledge Loss
- If all experts die, technology can be lost
- Later generations must rediscover knowledge
- Dramatic stakes for keeping scholars alive

### Specialization
- Agents naturally specialize based on reading history
- Some focus on metallurgy, others on agriculture
- Community develops complementary expertise

---

## Integration Requirements

### REQ-KR-006: Library Building

Papers SHALL be stored in library buildings:

```
WHEN an agent wants to read a paper
THEN the agent MUST:
  1. Navigate to a library building
  2. Have access to library (not locked/restricted)
  3. Select paper from available collection
```

### REQ-KR-007: Age System Integration

Reading SHALL be restricted by age category:

```typescript
function canRead(agent: Entity, paper: ResearchPaperComponent): boolean {
  const age = agent.getComponent('agent')?.ageCategory;

  if (age === 'child') {
    return false; // Children cannot read research
  }

  if (age === 'teen' && paper.tier > 2) {
    return false; // Teens limited to Tier 1-2
  }

  if (age === 'adult' && paper.tier > 4) {
    return false; // Adults limited to Tier 1-4
  }

  // Elders can read everything
  return true;
}
```

### REQ-KR-008: Skill System Integration

Skill requirements SHALL block reading:

```
WHEN an agent attempts to read a paper with skill requirements
THEN the system SHALL:
  1. Check agent's skill levels
  2. IF any required skill is below minimum:
     - Display error message
     - Suggest prerequisite papers to build skills
     - Prevent reading
  3. ELSE:
     - Allow reading to proceed
```

---

## Success Metrics

### System Health
- **Paper Publication Rate:** Papers published per 1000 ticks
- **Reading Rate:** Papers read per researcher per 1000 ticks
- **Technology Unlock Rate:** Technologies unlocked per age
- **Knowledge Distribution:** % of agents who have read each paper

### Engagement Metrics
- **Specialization Depth:** Average papers read per researcher
- **Knowledge Breadth:** Number of different fields explored
- **Generational Transfer:** Papers read by generation N+1 vs N
- **Research Community Size:** % of teen+ population engaged

---

## Migration Path

### Phase 1: Parallel System
1. Create new components alongside existing system
2. Define technology-to-papers mapping
3. Keep existing progress-based system running

### Phase 2: Content Migration
1. Convert ResearchDefinitions to paper trees
2. Map prerequisite chains
3. Define skill grants and requirements

### Phase 3: Cutover
1. Switch technology unlocks to paper-based system
2. Migrate existing progress to paper completions
3. Deprecate old progress system

### Phase 4: Cleanup
1. Remove old components
2. Update documentation
3. Update save format

---

## Open Questions

1. **Paper Storage:** Do papers exist as entities or data records?
   - **Recommendation:** Entities (allows physical books, libraries, theft, fires)

2. **Reading Time:** How long should reading take?
   - **Recommendation:** Tier 1: 100 ticks, scale by tier

3. **LLM Paper Content:** Generate unique content for each paper?
   - **Recommendation:** Yes, but cache after first generation

4. **Knowledge Decay:** Can agents forget papers?
   - **Recommendation:** No for simplicity (Phase 2 feature)

5. **Translation:** Papers in different languages?
   - **Recommendation:** Phase 2 feature, adds cultural depth

---

**End of Specification**
