# Memory Viewer UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Memory Viewer provides players with insight into agent memories - what they remember, believe, and how their experiences have shaped them. This UI helps players understand agent motivations and explore the emergent history of the world.

**Core principle:**
> "Memories are immutable - players observe but cannot edit"

---

## Dependencies

- `agent-system/memory-system.md` - Memory types, formation, decay
- `agent-system/chroniclers.md` - Journal entries
- `agent-system/relationship-system.md` - Social memories

---

## Requirements

### REQ-MEM-001: Memory Browser

Main panel for browsing agent memories.

```typescript
// Re-export from memory-system for reference
import type {
  AgentMemory, EpisodicMemory, SemanticMemory, SocialMemory, Reflection,
  EventType, SemanticType,
  CollectiveMemory, JournalEntry
} from "agent-system/memory-system";

interface MemoryBrowser {
  isOpen: boolean;

  // Agent context
  agentId: string;
  agentName: string;

  // Memory tabs
  activeTab: MemoryTab;

  // Filtering
  filters: MemoryFilters;
  searchQuery: string;

  // Timeline
  timelineMode: boolean;
  timelineRange: TimeRange;

  // Selection
  selectedMemory: EpisodicMemory | SemanticMemory | null;
}

type MemoryTab =
  | "episodic"           // What happened
  | "beliefs"            // What they know/believe
  | "social"             // What they know about others
  | "reflections"        // What they've concluded
  | "journal"            // Written entries
  | "collective";        // Shared village memories

interface MemoryFilters {
  eventTypes: EventType[];
  importanceRange: [number, number];
  emotionalRange: [number, number];
  timeRange: TimeRange | null;
  involvedAgents: string[];
  showDecayed: boolean;
}
```

**Memory Browser Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🧠 MEMORY VIEWER - Aelindra's Memories                              [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ MEMORY TYPES  │  [Episodic] [Beliefs] [Social] [Reflections] [Journal]     │
│               │                                                             │
│ ● Episodic    │  FILTERS: [All Types ▼] [All Times ▼] [🔍 Search]          │
│ ○ Beliefs     │                                                             │
│ ○ Social      │  RECENT MEMORIES                                            │
│ ○ Reflections │  ─────────────────────────────────────────────────────────  │
│ ○ Journal     │                                                             │
│ ○ Collective  │  ┌─────────────────────────────────────────────────────┐   │
│               │  │ 📅 Today | ⭐ High Importance                       │   │
│ ─────────     │  │                                                     │   │
│               │  │ 😊 Had a wonderful conversation with Elder Thom     │   │
│ FILTERS       │  │    about the village founding. Learned so much!     │   │
│ ☑ Important   │  │    Importance: ████████░░ | Clarity: ██████████    │   │
│ ☐ Recent only │  │    Participants: Elder Thom                        │   │
│ ☐ Emotional   │  │                                        [View →]     │   │
│ ☐ Social      │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│ INVOLVED:     │  ┌─────────────────────────────────────────────────────┐   │
│ ☐ Elder Thom  │  │ 📅 Yesterday | ⭐ Medium                            │   │
│ ☐ Chief Elena │  │                                                     │   │
│ ☐ Merchant    │  │ 🌾 Successfully harvested the autumn wheat. The     │   │
│               │  │    yield was better than expected this year.        │   │
│               │  │    Importance: ██████░░░░ | Clarity: ████████░░    │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│               │  ┌─────────────────────────────────────────────────────┐   │
│               │  │ 📅 3 days ago | ⭐ Low | 🔅 Fading                  │   │
│               │  │                                                     │   │
│               │  │ 🚶 Walked to the market, nothing notable happened.  │   │
│               │  │    Clarity: ██░░░░░░░░ (fading)                     │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  Total Memories: 247 episodic | 89 semantic | 12 reflections               │
│  [📊 Timeline View]                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-002: Episodic Memory Display

Display individual episodic memories.

```typescript
// EpisodicMemoryDisplay wraps EpisodicMemory with UI properties
interface EpisodicMemoryDisplay {
  memory: EpisodicMemory;              // From memory-system

  // Display formatting
  summaryText: string;
  detailText: string;
  dateLabel: string;
  relativeTime: string;

  // Visual indicators
  importanceBar: number;
  clarityBar: number;
  emotionIcon: Sprite;
  emotionColor: Color;
  eventTypeIcon: Sprite;

  // State indicators
  isConsolidated: boolean;
  isDecaying: boolean;
  recallCount: number;

  // Linked content
  linkedMemories: EpisodicMemory[];
  relatedBeliefs: SemanticMemory[];
  participantProfiles: AgentMiniProfile[];
}
```

**Episodic Memory Detail View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MEMORY DETAIL                                                   [◀ Back]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 Spring 15, Year 3                                   😊 Happy Memory    │
│  Type: Social Interaction                                                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "Had a wonderful conversation with Elder Thom about the village's         │
│   founding. He told me stories of the first settlers crossing the          │
│   mountains with nothing but hope. I never knew our history was so         │
│   rich. I feel more connected to this place now."                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MEMORY PROPERTIES                                                          │
│  Importance:    ████████░░ 80%    Why: Close relationship, learned history │
│  Clarity:       ██████████ 100%   Status: Consolidated (permanent)         │
│  Emotion:       ████████░░ +0.8   Valence: Very Positive                   │
│  Surprise:      ██░░░░░░░░ 20%    Expected this would be interesting       │
│                                                                             │
│  PARTICIPANTS                                                               │
│  ┌────────┐                                                                 │
│  │ Elder  │  Relationship: Close Friend                                    │
│  │ Thom   │  Shared memories: 23                                           │
│  │ 😊     │                                                                │
│  └────────┘                                                                 │
│                                                                             │
│  LOCATION                                                                   │
│  📍 Elder Thom's Study, near the Great Oak                                 │
│                                                                             │
│  LINKED MEMORIES                                                            │
│  • "Elder Thom taught me about crop rotation" (2 weeks ago)                │
│  • "First met Elder Thom at the spring festival" (Year 1)                  │
│                                                                             │
│  BELIEFS FORMED                                                             │
│  • "The village was founded by brave settlers from the east"               │
│  • "Elder Thom is a reliable source of historical knowledge"               │
│                                                                             │
│  RECALL HISTORY                                                             │
│  Times recalled: 3 | Last recalled: Yesterday                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-003: Beliefs Panel

Display agent's semantic memories (knowledge/beliefs).

```typescript
interface BeliefsPanel {
  beliefs: SemanticMemoryDisplay[];

  // Grouping
  groupBy: "type" | "confidence" | "source" | "recency";

  // Categories
  categories: Map<SemanticType, SemanticMemoryDisplay[]>;

  // Contested beliefs
  contestedBeliefs: ContestedBeliefDisplay[];
}

interface SemanticMemoryDisplay {
  memory: SemanticMemory;              // From memory-system

  // Display
  beliefText: string;
  typeLabel: string;
  typeIcon: Sprite;

  // Confidence visualization
  confidenceBar: number;
  confidenceLabel: string;

  // Social validation
  sharedByCount: number;
  contestedByCount: number;

  // Source
  sourceDescription: string;
  learnedFromAgent?: string;
}

interface ContestedBeliefDisplay {
  subject: string;
  agentBelief: string;
  agentConfidence: number;
  alternativeBeliefs: { agent: string; belief: string; confidence: number }[];
}
```

**Beliefs Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BELIEFS & KNOWLEDGE                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FACTS (23)                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  📍 "The river is to the east of the village"      Confidence: ██████████  │
│  📍 "Wild berries grow near the old oak"           Confidence: ████████░░  │
│  📍 "Iron ore can be found in the northern hills"  Confidence: ██████░░░░  │
│                                                                             │
│  OPINIONS (15)                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  💭 "Tomatoes are the best crop to grow"           Confidence: ████████░░  │
│      Shared by: 3 others | Contested by: 2 others                          │
│  💭 "The council makes fair decisions"             Confidence: ██████░░░░  │
│      Contested by: Merchant Alara                                          │
│                                                                             │
│  VALUES (8)                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ❤️ "Helping others is important"                  Confidence: ██████████  │
│  ❤️ "Knowledge should be preserved"                Confidence: ██████████  │
│  ❤️ "Hard work leads to good harvests"             Confidence: ████████░░  │
│                                                                             │
│  STORIES (5)                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  📖 "The founders crossed the eastern mountains"   Source: Elder Thom      │
│  📖 "The great drought of year 2 nearly ended us"  Source: Witnessed       │
│                                                                             │
│  ⚠️ CONTESTED BELIEFS                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Subject: "Best trading partner"                                      │   │
│  │ Aelindra believes: Riverside Village                                 │   │
│  │ Merchant Alara believes: Hilltop Village                            │   │
│  │ Chief Elena believes: Riverside Village                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-004: Social Memory Panel

Display what agent knows about other agents.

```typescript
interface SocialMemoryPanel {
  socialMemories: SocialMemoryDisplay[];

  // Sorting
  sortBy: "relationship" | "recent" | "name";

  // Selection
  selectedAgent: string | null;
  selectedAgentDetail: SocialMemoryDetail | null;
}

interface SocialMemoryDisplay {
  memory: SocialMemory;                // From memory-system

  // Agent info
  agentId: string;
  agentName: string;
  agentPortrait: Sprite;

  // Relationship summary
  relationshipLabel: string;
  sentimentBar: number;
  trustBar: number;

  // Last interaction
  lastInteractionLabel: string;
  interactionCount: number;
}

interface SocialMemoryDetail {
  memory: SocialMemory;

  // Full impression history
  impressionTimeline: ImpressionDisplay[];

  // Known facts about them
  knownPreferences: string[];
  knownSkills: string[];
  knownBeliefs: string[];

  // Predictions
  predictions: string[];

  // Significant shared moments
  significantMoments: EpisodicMemory[];
}
```

**Social Memory Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SOCIAL MEMORY - Who Aelindra Knows                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RELATIONSHIPS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Portrait] Elder Thom                              Close Friend     │   │
│  │            Historian | Known 2 years                                │   │
│  │            Sentiment: ████████░░ +0.8   Trust: ██████████ 95%      │   │
│  │            Last spoke: Today | 47 interactions                      │   │
│  │                                                        [Details →]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Portrait] Chief Elena                             Respected Leader│   │
│  │            Village Chief | Known 3 years                            │   │
│  │            Sentiment: ██████░░░░ +0.6   Trust: ████████░░ 78%      │   │
│  │            Last spoke: 3 days ago | 23 interactions                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Portrait] Merchant Alara                          Acquaintance     │   │
│  │            Trader | Known 1 year                                    │   │
│  │            Sentiment: ████░░░░░░ +0.2   Trust: ██████░░░░ 55%      │   │
│  │            ⚠️ Some tension over trade dispute last month            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  SELECTED: Elder Thom                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  WHAT AELINDRA KNOWS ABOUT ELDER THOM                                       │
│                                                                             │
│  Preferences: Enjoys quiet mornings, loves historical research             │
│  Skills: Expert historian, skilled writer, good teacher                    │
│  Beliefs: Values tradition, believes in preserving knowledge               │
│                                                                             │
│  PREDICTIONS                                                                │
│  "He'll probably be in his study in the mornings"                          │
│  "He'll appreciate gifts of old books or scrolls"                          │
│  "He'll want to hear about any discoveries I make"                         │
│                                                                             │
│  SIGNIFICANT SHARED MOMENTS                                                 │
│  • He taught me about the village founding (Today)                         │
│  • We weathered the great storm together (Year 2)                          │
│  • He welcomed me when I first arrived (Year 1)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-005: Reflections Panel

Display agent's reflections and insights.

```typescript
interface ReflectionsPanel {
  reflections: ReflectionDisplay[];

  // Grouping
  groupBy: "date" | "type" | "theme";

  // Selection
  selectedReflection: Reflection | null;
}

interface ReflectionDisplay {
  reflection: Reflection;              // From memory-system

  // Display
  dateLabel: string;
  typeLabel: string;
  summaryText: string;

  // Insights extracted
  insights: string[];
  beliefChanges: string[];
  goalChanges: string[];
}
```

**Reflections Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REFLECTIONS & INSIGHTS                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LATEST REFLECTION - End of Day, Spring 15                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "Today was meaningful. My conversation with Elder Thom reminded me why    │
│   I chose to stay in this village. The history he shared made me feel      │
│   part of something bigger than myself. I'm grateful for friends who       │
│   take time to share knowledge.                                             │
│                                                                             │
│   The harvest went well too. I'm getting better at farming - I can tell    │
│   by how the crops respond to my care. Maybe someday I'll be as skilled    │
│   as Farmer Giles.                                                          │
│                                                                             │
│   Tomorrow I want to visit the old oak Elder Thom mentioned. He said       │
│   that's where the founders first camped. I'd like to see it for myself." │
│                                                                             │
│  INSIGHTS GAINED                                                            │
│  • "The village has a rich history worth learning"                          │
│  • "Elder Thom is an excellent teacher"                                     │
│  • "I'm improving at farming"                                               │
│                                                                             │
│  GOALS AFFECTED                                                             │
│  + New goal: Visit the founders' camp at the old oak                       │
│  + Updated: Spend more time learning from elders                           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DEEP REFLECTION - End of Spring, Year 3                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "This season has been transformative. I've grown closer to the village    │
│   and feel truly at home now. My skills have improved, my friendships      │
│   have deepened, and I've learned so much about where I live..."           │
│                                                                             │
│                                              [Read Full Reflection →]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-006: Memory Timeline

Chronological visualization of memories.

```typescript
interface MemoryTimeline {
  memories: EpisodicMemory[];

  // Time range
  startTime: GameTime;
  endTime: GameTime;
  zoomLevel: "day" | "week" | "season" | "year";

  // Visualization
  nodes: TimelineNode[];
  connections: TimelineConnection[];

  // Filtering
  showOnlyImportant: boolean;
  filterByType: EventType[];
}

interface TimelineNode {
  memory: EpisodicMemory;
  position: { x: number; y: number };
  size: number;                        // Based on importance
  color: Color;                        // Based on emotion
  icon: Sprite;                        // Based on type
}

interface TimelineConnection {
  from: string;                        // Memory ID
  to: string;                          // Memory ID
  relationship: "linked" | "caused" | "related";
}
```

**Memory Timeline:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📅 MEMORY TIMELINE                           [Zoom: Season] [Filter ▼]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Year 3, Spring                                                             │
│  ├─────────────────────────────────────────────────────────────────────────│
│  │                                                                         │
│  │  Day 1          Day 5              Day 10         Day 15               │
│  │    │              │                  │              │                  │
│  │    ●──────────────●──────────────────●──────────────●                  │
│  │    │              │                  │              │                  │
│  │  Spring         Planted            Good         Conversation          │
│  │  Festival       new crops          harvest      with Thom             │
│  │  (😊 +0.7)      (😐 +0.2)          (😊 +0.5)    (😊 +0.8)             │
│  │                                                      │                 │
│  │                                                      ↓                 │
│  │                                                   Learned              │
│  │                                                   village              │
│  │                                                   history              │
│  │                                                                         │
│  Year 2, Winter                                                            │
│  ├─────────────────────────────────────────────────────────────────────────│
│  │                                                                         │
│  │  Day 60              Day 75                      Day 90                │
│  │    │                   │                           │                   │
│  │    ●───────────────────●───────────────────────────●                   │
│  │    │                   │                           │                   │
│  │  First             Deep               Winter                           │
│  │  snowfall          cold               Festival                         │
│  │  (😨 -0.3)         (😢 -0.5)          (😊 +0.6)                        │
│  │                                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Legend: ● Important  ○ Normal  ○ Fading                                   │
│          😊 Positive  😐 Neutral  😢 Negative                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-MEM-007: Collective Memory Panel

Display village-wide shared memories.

```typescript
interface CollectiveMemoryPanel {
  collectiveMemories: CollectiveMemoryDisplay[];

  // Categories
  legends: CollectiveMemoryDisplay[];
  history: CollectiveMemoryDisplay[];
  traditions: CollectiveMemoryDisplay[];

  // Lost knowledge
  lostKnowledge: LostKnowledgeDisplay[];
}

interface CollectiveMemoryDisplay {
  memory: CollectiveMemory;            // From memory-system

  // Display
  title: string;
  summary: string;
  typeLabel: string;

  // Transmission stats
  knowerCount: number;
  tellingCount: number;

  // Version info
  hasMultipleVersions: boolean;
  isContested: boolean;
}

interface LostKnowledgeDisplay {
  summary: string;
  lostWhen: GameTime;
  lastKnownBy: string;
  recoverable: boolean;
}
```

---

## Keyboard Shortcuts

```
MEMORY VIEWER CONTROLS:
- M              : Open memory viewer
- Escape         : Close / back
- Tab            : Switch memory tab
- ↑/↓            : Navigate memory list
- Enter          : View memory detail
- T              : Toggle timeline view
- F              : Open filters
- S              : Search memories
```

---

## State Management

### Memory System Integration

```typescript
interface MemoryViewerState {
  // View state
  isOpen: boolean;
  selectedAgentId: string | null;
  activeTab: MemoryTab;
  selectedMemory: EpisodicMemory | SemanticMemory | null;

  // Filters
  filters: MemoryFilters;
  searchQuery: string;

  // Timeline
  timelineMode: boolean;
  timelineRange: TimeRange;

  // Read-only - memories cannot be modified
  readonly: true;
}
```

---

## Visual Style

```typescript
interface MemoryViewerStyle {
  // Memory importance colors
  highImportance: Color;
  mediumImportance: Color;
  lowImportance: Color;

  // Emotion colors
  positiveEmotion: Color;
  negativeEmotion: Color;
  neutralEmotion: Color;

  // Clarity visualization
  fullClarity: Color;
  fadingClarity: Color;

  // Event type icons
  eventTypeIcons: Map<EventType, Sprite>;

  // 8-bit styling
  pixelScale: number;
}
```

---

## Open Questions

1. Should players be able to "bookmark" interesting memories?
2. Memory comparison between agents?
3. Search across all village agents' memories?
4. Memory export for sharing?
5. Visual memory map showing connections?

---

## Related Specs

- `agent-system/memory-system.md` - Source system spec
- `agent-system/chroniclers.md` - Journals as memory artifacts
- `ui-system/agent-roster.md` - Memory access from agent panel
- `ui-system/relationship-viewer.md` - Social memory integration
