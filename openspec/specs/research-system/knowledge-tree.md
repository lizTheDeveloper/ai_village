> **System:** research-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Knowledge-Based Research Tree System

## Overview

A research system where progress is driven by reading academic papers rather than passive progress accumulation. Agents must educate themselves by reading prerequisite papers before they can contribute new research to unlock technologies.

## Core Concept

### Current System (Phase 13)
- Researchers contribute progress to research topics
- Progress accumulates passively
- Technologies unlock when progress threshold is met
- Research papers exist but are not meaningfully integrated

### New System: Education-Driven Research
- Research papers are arranged in a tree structure with branches
- Each paper is tagged with multiple technologies
- Technologies unlock when ALL papers tagged with that technology are discovered
- **Agents must READ papers to gain knowledge before they can WRITE new papers**
- Later papers in a set are harder to discover because agents must read all preceding papers first
- Reading papers grants skill experience in related fields

## Knowledge Tree Structure

### Paper Prerequisites
Each research paper has:
- **ID**: Unique identifier for the paper
- **Title**: Human-readable name
- **Field**: Research domain (agriculture, metallurgy, arcane, etc.)
- **Technology Tags**: List of technologies this paper contributes to
- **Prerequisite Papers**: Papers that must be read before this one can be authored
- **Reading Prerequisites**: Minimum age and skill requirements to read
- **Skill Grants**: Skills gained by reading this paper

### Example Tree Branch
```
Technology: "Steel Forging"
Required Papers: ["iron_smelting", "carbon_infusion", "quenching_theory"]

iron_smelting (Tier 1)
├─ Prerequisites: []
├─ Tags: ["basic_metallurgy", "steel_forging"]
├─ Skill Grant: metallurgy +5
└─ Reading Requirements: teen+, none

carbon_infusion (Tier 2)
├─ Prerequisites: ["iron_smelting"]
├─ Tags: ["advanced_metallurgy", "steel_forging"]
├─ Skill Grant: metallurgy +10
└─ Reading Requirements: teen+, metallurgy 10+

quenching_theory (Tier 3)
├─ Prerequisites: ["iron_smelting", "carbon_infusion"]
├─ Tags: ["steel_forging"]
├─ Skill Grant: metallurgy +15
└─ Reading Requirements: adult+, metallurgy 20+
```

When all three papers are discovered, "Steel Forging" technology unlocks.

## Research Process

### 1. Reading Phase (Knowledge Acquisition)
Agents with `research` behavior can:
1. **Visit the Library** - Browse available published papers
2. **Select a Paper** - Choose a paper they haven't read yet
3. **Read the Paper** - Takes time based on paper complexity
4. **Gain Knowledge** - Receive skill experience in related fields
5. **Unlock Authoring** - Can now write papers that require this as a prerequisite

**Age Requirements:**
- `child` (early childhood): Cannot read research papers
- `teen` (late childhood): Can read Tier 1-2 papers
- `adult`: Can read Tier 1-4 papers
- `elder`: Can read all papers

**Skill Requirements:**
Each paper may require minimum skill levels to comprehend.

### 2. Authoring Phase (Knowledge Creation)
Once an agent has read all prerequisite papers for a new discovery:
1. **Have an Idea** - LLM determines if agent realizes they can contribute
2. **Write a Paper** - Agent authors a new paper (takes significant time)
3. **Publish** - Paper becomes available in the library
4. **Check Technology Unlock** - If all papers in a technology set are complete, unlock it

### 3. Education Progression
Agents naturally progress through research as they age and gain skills:
- **Teens** start with Tier 1 fundamentals
- **Young Adults** read Tier 2-3 after mastering basics
- **Experienced Adults** tackle Tier 4-5 advanced research
- **Elders** can contribute to cutting-edge discoveries

## Component Architecture

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

## System Architecture

### ResearchLibrarySystem
Manages the global collection of published papers.

**Responsibilities:**
- Track all published papers
- Provide paper discovery interface
- Check reading prerequisites
- Monitor technology completion

**Key Methods:**
```typescript
class ResearchLibrarySystem {
  // Get papers available for an agent to read
  getReadablePapers(agent: Entity): ResearchPaperComponent[];

  // Get papers an agent could author (has read all prerequisites)
  getAuthorablePapers(agent: Entity): ResearchPaperComponent[];

  // Check if a technology is unlocked
  isTechnologyUnlocked(technologyId: string): boolean;

  // Publish a new paper
  publishPaper(paper: ResearchPaperComponent): void;
}
```

### ReadingSystem
Handles agents reading papers and gaining knowledge.

**Responsibilities:**
- Start reading sessions
- Update reading progress
- Grant skills upon completion
- Update agent knowledge tracking

**Process:**
1. Agent selects a paper to read
2. System creates `ReadingProgressComponent`
3. Each tick, increment progress based on:
   - Agent's relevant skills (higher = faster)
   - Paper tier (higher = slower)
   - Agent's intelligence/focus
4. On completion:
   - Grant skill experience
   - Add to agent's `readPapers` set
   - Remove progress component
   - Trigger potential authorship check

### AuthoringSystem
Handles agents writing new papers.

**Responsibilities:**
- Detect when agents can contribute
- Guide paper authoring process
- Publish completed papers
- Check technology unlocks

**Process:**
1. Check if agent has read all prerequisite papers
2. If yes, add to `potentialContributions`
3. When agent decides to research:
   - LLM determines which contribution to make
   - Create authoring progress component
   - Agent works over time
4. On completion:
   - Publish paper to library
   - Check if technology set is complete
   - Fire unlock events if needed

### TechnologyProgressSystem
Tracks technology unlock status.

**Responsibilities:**
- Monitor paper publication
- Track completion of technology paper sets
- Fire unlock events
- Grant technology benefits (recipes, buildings, abilities)

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

## Difficulty Progression

### Natural Emergent Difficulty
- **Early papers** (Tier 1): No prerequisites, any teen can read
- **Mid papers** (Tier 2-3): Require reading 1-3 earlier papers
- **Late papers** (Tier 4-5): Require extensive education (5+ prerequisite papers)

### Educational Funnel
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

## Migration from Current System

### Phase 1: Data Structure
1. Create new components (ResearchPaperComponent, AgentKnowledgeComponent, ReadingProgressComponent)
2. Define technology-to-papers mapping
3. Convert existing ResearchDefinitions to paper trees

### Phase 2: Systems
1. Implement ReadingSystem
2. Implement AuthoringSystem (initially simple)
3. Implement ResearchLibrarySystem
4. Update TechnologyProgressSystem to check papers instead of progress

### Phase 3: Behavior Integration
1. Update `research` behavior to include reading and authoring
2. Add library building requirement
3. Add age/skill validation

### Phase 4: Content Creation
1. Design paper trees for all technologies
2. Define prerequisite chains
3. Balance skill grants and requirements
4. Write paper titles and content seeds for LLM

## Benefits

### Emergent Gameplay
- **Specialization**: Agents naturally specialize based on what they read
- **Mentorship**: Experienced researchers guide younger ones
- **Knowledge Loss**: If all experts die, technology can be lost
- **Rediscovery**: Later generations can rediscover lost knowledge
- **Cultural Identity**: Villages develop unique research paths

### Player Engagement
- **Visible Progress**: See the research tree fill out
- **Strategic Decisions**: "Should we focus on metallurgy or agriculture?"
- **Generational Planning**: "Train the next generation of researchers"
- **Dramatic Stakes**: "Our only master alchemist is dying!"

### Technical Benefits
- **Deterministic**: No RNG in technology unlocks
- **Debuggable**: Can inspect exactly which papers are missing
- **Moddable**: Easy to add new paper branches
- **Scalable**: LLM can generate paper content dynamically

## Example Technology Trees

### Basic Metallurgy → Steel Forging
```
Papers:
1. "On the Nature of Ores" [basic_metallurgy]
2. "Smelting Fundamentals" [basic_metallurgy]
3. "Iron Working Techniques" [basic_metallurgy, steel_forging]
4. "The Role of Carbon" [steel_forging]
5. "Heat Treatment Methods" [steel_forging]

Technology "Basic Metallurgy" unlocks when papers 1-3 complete
Technology "Steel Forging" unlocks when papers 3-5 complete
```

### Agriculture → Greenhouse Cultivation
```
Papers:
1. "Seed Selection" [agriculture_i]
2. "Soil Preparation" [agriculture_i]
3. "Irrigation Principles" [agriculture_ii]
4. "Fertilization Theory" [agriculture_ii]
5. "Climate Control" [greenhouse_cultivation]
6. "Year-Round Growing" [greenhouse_cultivation]

Progression:
agriculture_i (papers 1-2) → agriculture_ii (papers 3-4) → greenhouse_cultivation (papers 5-6)
```

## Success Metrics

### System Health
- **Paper Publication Rate**: Papers published per 1000 ticks
- **Reading Rate**: Papers read per researcher per 1000 ticks
- **Technology Unlock Rate**: Technologies unlocked per age
- **Knowledge Distribution**: % of agents who have read each paper

### Engagement Metrics
- **Specialization Depth**: Average papers read per researcher
- **Knowledge Breadth**: Number of different fields explored
- **Generational Transfer**: Papers read by generation N+1 vs generation N
- **Research Community Size**: % of population engaged in research

## Open Questions

1. **Paper Storage**: Do papers exist as entities or just data records?
   - **Recommendation**: Entities allow for physical books, libraries, theft, fires

2. **Reading Time**: How long should reading take?
   - **Recommendation**: Tier 1: 100 ticks, scale by tier (Tier 5: 500 ticks)

3. **LLM Paper Content**: Generate unique content for each paper?
   - **Recommendation**: Yes, but cache after first generation

4. **Knowledge Decay**: Can agents forget papers?
   - **Recommendation**: No for simplicity, but could add age-based memory loss

5. **Translation**: Can papers be in different languages?
   - **Recommendation**: Phase 2 feature, adds cultural depth

## Implementation Estimate

### Components (1-2 hours)
- ResearchPaperComponent
- AgentKnowledgeComponent
- ReadingProgressComponent

### Systems (4-6 hours)
- ResearchLibrarySystem
- ReadingSystem
- AuthoringSystem
- TechnologyProgressSystem updates

### Behavior Integration (2-3 hours)
- Update research behavior
- Add library interactions
- Age/skill validation

### Content Creation (3-4 hours)
- Map technologies to paper trees
- Define prerequisite chains
- Write paper metadata

### Testing & Balancing (2-3 hours)
- Verify technology unlocks
- Balance reading times
- Test edge cases

**Total: 12-18 hours of implementation work**
