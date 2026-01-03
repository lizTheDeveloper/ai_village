# Research Interface Specification

## Overview

The research interface allows players to view, discover, and track scientific papers, unlocking technologies, buildings, abilities, and recipes as their civilization progresses through the tech tree.

## Design Philosophy

- **True Discovery**: You only see papers you've discovered - no total counts, no progress bars
- **Hidden Unlocks**: You don't know when technologies will unlock or what's required
- **Organic Growth**: Papers lead to papers through prerequisites and references
- **Surprise Rewards**: Technologies appear when the right combination of papers is complete
- **Academic Flavor**: Pratchett-style humor with academic paper formatting (titles, abstracts, footnotes)
- **Just the Tree**: Focus on connections between papers you know about

## UI Components

### 1. Research Library (Main View)

**Layout**: Simple list/grid of discovered papers ONLY

```
┌─────────────────────────────────────────────────────┐
│  RESEARCH LIBRARY                    🔍 Search       │
├─────────────────────────────────────────────────────┤
│  Filters: [All] [Nature] [Alchemy] [Cuisine] ...    │
│  Sort by: [Field] [Complexity] [Recently Added]     │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ 📜       │  │ 📜 ✓     │  │ 📖       │          │
│  │ Herb ID  │  │ Yeast    │  │ Stone    │          │
│  │ Nature   │  │ Cuisine  │  │ Construct│          │
│  │ ⭐⭐      │  │ ⭐⭐⭐    │  │ ⭐⭐      │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  Discovered papers: 47                              │
└─────────────────────────────────────────────────────┘
```

**Paper Cards Show**:
- Title (truncated)
- Field name/color
- Complexity stars (⭐ 1-10)
- Status: Available / In Progress / Completed

**States**:
- **Available**: Can be studied right now (white/default)
- **In Progress**: Currently being researched (yellow highlight)
- **Completed**: Fully understood (checkmark, slightly faded)
- **Just Discovered**: New paper (sparkle animation for 24 hours)

**NO locked papers shown** - you don't know what you haven't discovered
**NO progress bars** - you don't know how close you are to unlocks
**NO "X of Y" counters** - you don't know how many papers exist

### 2. Paper Detail View

**Opened when clicking a paper card**

```
┌─────────────────────────────────────────────────────┐
│  On the Mysterious Rising of Dough: A Study of     │
│  Yeast                                        [X]   │
├─────────────────────────────────────────────────────┤
│  Field: Cuisine              Complexity: ⭐⭐⭐     │
│  Min Age: Teen               Researchers: 2/2      │
│                                                      │
│  ABSTRACT                                           │
│  The fundamentals of yeast fermentation and bread   │
│  rising, including temperature control and timing.  │
│                                                      │
│  FULL TEXT                           [Expand ▼]     │
│  The practice of bread making rests upon the        │
│  shoulders of invisible organisms* whose existence  │
│  was long disputed by the Guild of Bakers†...       │
│                                                      │
│  *Though several bakers claimed to have spotted...  │
│  †The infamous "Yeast Denial Period" of 1847...    │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  PROGRESS                                           │
│  ████████░░ 80% (158 research hours)                │
│                                                      │
│  GRANTS SKILLS                                      │
│  • Cooking +10                                      │
│  • Nature +5                                        │
│                                                      │
│  LEADS TO (discovered)                              │
│  • Sourdough Culture Maintenance                   │
│  • Advanced Fermentation                            │
│                                                      │
│  REFERENCES IN TEXT                                 │
│  • Grain Malting (mentioned in footnote 3)         │
│  • Fermentation Temperature (prerequisite)          │
│                                                      │
│  [Assign Researcher] [Remove Researcher] [Close]   │
└─────────────────────────────────────────────────────┘
```

**Sections**:
1. **Header**: Title, field, complexity, current researchers
2. **Abstract**: 1-2 sentence summary
3. **Full Text**: Expandable Pratchett-style content with footnotes
4. **Progress Bar**: Visual indicator of research completion (for this paper only)
5. **Skill Grants**: What skills are gained on completion
6. **Leads To**: Papers discovered that have this as prerequisite
7. **References In Text**: Papers mentioned in footnotes and text
8. **Actions**: Assign/remove researchers

### 3. Related Papers Panel

**Shows discovered papers grouped by field**

```
┌─────────────────────────────────────────────────────┐
│  RELATED PAPERS                                     │
├─────────────────────────────────────────────────────┤
│  ▼ Alchemy (15 papers discovered)                  │
│     • Yeast Fermentation ✓                          │
│     • Grain Malting ✓                              │
│     • Hop Cultivation (in progress)                 │
│     • Fermentation Temperature                      │
│     • Beer Aging Techniques ✓                      │
│     • ... and 10 more                               │
│                                                      │
│  ▼ Nature (23 papers discovered)                   │
│     • Herb Identification ✓                         │
│     • Medicinal Plants ✓                           │
│     • Herb Garden Planning (in progress)            │
│     • ... and 20 more                               │
└─────────────────────────────────────────────────────┘
```

**Shows**:
- Field groupings
- Papers you've discovered in each field
- Which are completed, in progress, or available
- NO total counts (you don't know how many exist)
- NO unlock requirements (surprise when they happen)

### 4. Research Assignment Interface

**Drag-and-drop or click-to-assign interface**

```
┌─────────────────────────────────────────────────────┐
│  RESEARCH ASSIGNMENTS                               │
├─────────────────────────────────────────────────────┤
│  Available Researchers: 8                           │
│  Max Concurrent Papers: 5                           │
│                                                      │
│  📜 Yeast Fermentation            [⏱️ 80%]         │
│     👤 Dr. Weatherwax (Cooking 47) — Remove         │
│     👤 Igor (Cooking 23)           — Remove         │
│     Est. completion: 2 hours                        │
│                                                      │
│  📜 Herb Identification           [⏱️ 30%]         │
│     👤 Granny Aching (Herbalism 56) — Remove        │
│     + Assign Researcher                             │
│     Est. completion: 8 hours                        │
│                                                      │
│  📜 Stone Masonry Basics          [⏱️ 0%]          │
│     + Assign Researcher (Need Construction 10+)     │
│                                                      │
│  [+ Start New Research]                             │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Shows all active research
- Researcher skill levels affect research speed
- Skill requirements for papers
- Estimated completion times
- Easy assignment/removal

### 5. Technology Unlocks Notification

**Toast notification when technology unlocks**

```
┌─────────────────────────────────────┐
│  🎉 TECHNOLOGY UNLOCKED!            │
│                                      │
│  Basic Brewing                      │
│                                      │
│  You may now:                       │
│  • Build: Brewery                   │
│  • Use Ability: Brew Beer           │
│  • Create: Beer recipe              │
│                                      │
│  Your research into fermentation,   │
│  grains, and brewing has paid off!  │
│                                      │
│  [View Details] [Dismiss]           │
└─────────────────────────────────────┘
```

### 6. Research Tree Visualization (Optional Advanced View)

**Graph view showing connections between papers**

```
┌─────────────────────────────────────────────────────┐
│  RESEARCH TREE - Cuisine                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│      ┌──────────┐                                   │
│      │ Fire     │────┐                              │
│      │ Control  │    │                              │
│      └──────────┘    ▼                              │
│                  ┌──────────┐      ┌──────────┐     │
│                  │ Boiling  │──────│ Steaming │     │
│                  └──────────┘      └──────────┘     │
│                       │                 │            │
│      ┌──────────┐     ▼                 ▼            │
│      │ Grains   │  ┌──────────┐   ┌──────────┐     │
│      └──────────┘──│  Bread   │   │  Rice    │     │
│                     │  Making  │   │ Cooking  │     │
│                     └──────────┘   └──────────┘     │
│                                                      │
│  ✓ Completed  ⏺️ In Progress  ○ Available           │
└─────────────────────────────────────────────────────┘
```

## Visual Design

### Color Coding by Field

- **Nature**: 🟢 Green (herbs, farming, natural sciences)
- **Alchemy**: 🟣 Purple (potions, transmutation, magical chemistry)
- **Cuisine**: 🟠 Orange (cooking, brewing, food)
- **Construction**: 🟤 Brown (building, materials, architecture)
- **Engineering**: 🔵 Blue (machines, structures, physics)
- **Arcane**: 💜 Deep Purple (pure magic, impossible geometry)
- **Physics**: ⚪ White/Silver (fundamental laws)
- **Mathematics**: 🔷 Cyan (pure theory)

### Complexity Indicators

- ⭐ (1-2): Beginner - Simple concepts, teen accessible
- ⭐⭐ (3-4): Novice - Requires basic understanding
- ⭐⭐⭐ (5-6): Intermediate - Adult concepts
- ⭐⭐⭐⭐ (7-8): Advanced - Specialized knowledge
- ⭐⭐⭐⭐⭐ (9-10): Expert - Elder-level mastery

### Icons

- 📜 Available paper
- 📖 Paper being studied
- ✓ Completed paper
- ⚗️ Alchemy field
- 🌿 Nature field
- 🍳 Cuisine field
- 🏗️ Construction field
- ⚙️ Engineering field
- ✨ Arcane field
- 🎓 Researcher

## Interactions

### Discovery Mechanics

Papers become available when:
1. **Prerequisites met**: Previous papers completed
2. **Skill threshold reached**: Agent has minimum skill level
3. **Building unlocked**: Certain buildings enable paper access (e.g., Library)
4. **Age requirement**: Agent reaches minimum age
5. **Random chance**: Some papers discovered through experimentation

### Research Speed Factors

```typescript
researchSpeed = baseSpeed
  × (1 + skillBonus)      // Higher skill = faster research
  × (1 + buildingBonus)   // Better facilities = faster
  × numResearchers        // More researchers = faster
  × focusMultiplier       // Agent focus/interest
```

- **Skill Bonus**: 0.1 per 10 skill points in relevant field
- **Building Bonus**: Library (+0.2), University (+0.5), Research Institute (+1.0)
- **Focus**: 1.5x if researching field of interest, 0.5x if not

## Mobile/Touch Considerations

- **Large tap targets**: Paper cards at least 60×60px
- **Swipe navigation**: Swipe between fields/sets
- **Long-press for details**: Quick peek at paper info
- **Drag-and-drop**: Assign researchers by dragging
- **Pinch-to-zoom**: In tree visualization view

## Accessibility

- **Screen reader support**: All papers readable with full text
- **High contrast mode**: Clear distinction between states
- **Keyboard navigation**: Tab through papers, Enter to open
- **Text scaling**: Support for larger text sizes
- **Color-blind friendly**: Don't rely solely on color (use icons + color)

## Performance Considerations

- **Lazy loading**: Only render visible papers (virtual scrolling)
- **Search indexing**: Pre-index paper titles/abstracts for fast search
- **Caching**: Cache paper details to avoid re-fetching
- **Pagination**: Load papers in chunks if > 100 in view

## Research Strategy

For detailed strategic analysis and optimization guidance, see:
- **[Research Strategy Guide](../research/research-strategy-guide.md)** - Comprehensive analysis of research development paths, strategic archetypes ("Build Schools First" vs "Hire Researchers Fast"), optimization priorities, and mathematical modeling of completion times

Key strategic insights:
- Researchers scale linearly with **no diminishing returns** (20 researchers = 20× speed)
- Building bonuses multiply everything (Research Institute = 2× speed boost)
- Focus multiplier can provide 3× speed (dedicated vs distracted researchers)
- Optimal strategy: "Elite Academy" (5 master researchers, Research Institute, 1.5× focus) = 21 days
- Natural progression: 3 → 10 researchers over time = 20 days

## Future Enhancements

1. **Research Teams**: Multiple agents collaborating on one paper
2. **Paper Writing**: Agents can author new papers based on discoveries
3. **Research Journals**: Publish collections of papers
4. **Inter-Village Sharing**: Trade research papers with other villages
5. **Research Debates**: Papers can be challenged/improved
6. **Patent System**: Lock certain technologies behind patents
7. **Failed Experiments**: Papers that lead to dead ends (Pratchett humor!)

## Integration Points

### With Agent System
- Agents gain skills from completing papers
- Agents have preferred research fields (personality)
- Agent age affects which papers they can study

### With Building System
- Buildings unlock new research paths
- Buildings provide research speed bonuses
- Some buildings require research to construct

### With Economy
- Papers can be traded/sold
- Research funding affects speed
- Universities employ researchers

### With Needs System
- Research satisfies "intellectual stimulation" need
- Completing papers provides satisfaction
- Unlocking technologies creates purpose

## Example User Flow

1. Player opens Research Library
2. Sees available papers in Nature field
3. Clicks "Herb Identification" paper
4. Reads abstract (Pratchett-style humor)
5. Expands full text with footnotes
6. Sees "Leads To" section mentions "Medicinal Plants" and "Herb Garden Planning"
7. Assigns Dr. Weatherwax (Herbalism 56) to research
8. Checks back later - paper 80% complete
9. Paper completes - toast notification!
10. New papers discovered: "Medicinal Plants" and "Herb Garden Planning"
11. Completes several more herbalism papers over time
12. 🎉 Technology Unlocked! "Herbalist Workshop" - total surprise!
13. Player didn't know they were working toward this - just followed interesting papers

## Technical Implementation Notes

### Data Structures

```typescript
interface PaperUI {
  paperId: string;
  title: string;
  field: ResearchField;
  complexity: number;
  status: 'available' | 'in_progress' | 'completed';
  progress: number; // 0-1
  abstract: string;
  fullText: string;
  researchers: AgentId[];
  leadsTo: string[]; // Discovered papers that have this as prerequisite
  referencesInText: string[]; // Papers mentioned in this paper's text
}

// Note: UnlockProgress is tracked internally but NEVER shown to player
// Players discover technologies as surprises when prerequisites are met
interface UnlockProgress {
  technologyId: string;
  papersCompleted: number; // Internal tracking only
  papersRequired: number; // Internal tracking only
  grants: TechnologyUnlock[];
}
```

### UI State Management

```typescript
interface ResearchUIState {
  selectedField: ResearchField | 'all';
  sortBy: 'field' | 'complexity' | 'progress';
  searchQuery: string;
  selectedPaper: string | null;
  showTreeView: boolean;
  activeResearch: Map<string, ResearchProgress>;
}
```

This specification provides a complete vision for the research interface that:
- Makes discovery feel rewarding through surprise unlocks
- Preserves the hidden nature of research - no progress bars, no locked papers
- Shows only what has been discovered - the tree grows organically
- Maintains Pratchett-style humor and academic flavor
- Scales to thousands of papers
- Works on desktop and mobile
- Integrates with all game systems
