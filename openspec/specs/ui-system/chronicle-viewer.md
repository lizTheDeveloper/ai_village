# Chronicle Viewer UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Chronicle Viewer provides players with access to written works created by chroniclers - historians, journalists, bards, and scribes. This UI surfaces the emergent history of the world as documented by its inhabitants, bridging detailed and abstracted simulation layers.

**Core purpose:**
> "The world's story is written by its inhabitants"

Players read newspapers, historical accounts, epic poems, and scholarly works to learn about:
- Local village events
- Distant village happenings (from abstracted simulation)
- Historical events and their interpretations
- The biases and perspectives of different chroniclers

---

## Dependencies

- `agent-system/chroniclers.md` - Chronicler types, written works, information sources
- `ui-system/inventory.md` - Written works as items
- `ui-system/notifications.md` - New publication alerts

---

## Requirements

### REQ-CHR-001: Library Panel

The library panel displays all available written works.

```typescript
// Re-export from agent-system/chroniclers for reference
import type {
  Chronicler, ChroniclerType, ChroniclerFocus, WritingStyle,
  WrittenWork, WorkType, Genre, Bias,
  Newspaper, NewspaperIssue, Article,
  Historian, HistoricalWork, Chapter,
  InformationSource, SourceType
} from "agent-system/chroniclers";

interface LibraryPanel {
  isOpen: boolean;

  // Available works (from village library + player inventory)
  availableWorks: WrittenWork[];
  ownedWorks: WrittenWork[];           // In player inventory

  // Reading state
  currentlyReading: WrittenWork | null;
  readingProgress: number;              // 0-1 for long works

  // Filtering
  filterByType: WorkType | null;
  filterByGenre: Genre | null;
  filterByTopic: FocusTopic | null;
  filterByVillage: VillageId | null;   // Works mentioning village
  searchQuery: string;

  // Sorting
  sortBy: LibrarySortOption;

  // Selection
  selectedWork: WrittenWork | null;

  // Methods
  open(): void;
  close(): void;
  selectWork(workId: string): void;
  startReading(workId: string): void;
}

type LibrarySortOption =
  | "newest"              // Most recently published
  | "oldest"              // Historical order
  | "author"              // By author name
  | "title"               // Alphabetical
  | "relevance"           // To current events
  | "popularity";         // Most read
```

**Library Panel Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📚 VILLAGE LIBRARY                                      [🔍 Search] [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ CATEGORIES    │  AVAILABLE WORKS (47)                     [Sort: Newest ▼] │
│               │                                                             │
│ ○ All (47)    │  ┌─────────────────────────────────────────────────────┐   │
│ ○ Books (12)  │  │ 📰 The Forest Herald - Issue #127                   │   │
│ ● News (23)   │  │    Published: Today | By: Multiple Authors          │   │
│ ○ Poems (5)   │  │    "Trade Agreement Signed with Riverside"          │   │
│ ○ History (7) │  │    [Read] [Take Copy]                               │   │
│               │  └─────────────────────────────────────────────────────┘   │
│ TOPICS        │                                                             │
│ □ Politics    │  ┌─────────────────────────────────────────────────────┐   │
│ □ Trade       │  │ 📖 "The Founding Years" by Elder Thom               │   │
│ ☑ Foreign     │  │    Published: 3 seasons ago | History               │   │
│ □ Culture     │  │    Covers: Year 1-5 of village history              │   │
│               │  │    [Read] [Take Copy]                               │   │
│ VILLAGES      │  └─────────────────────────────────────────────────────┘   │
│ □ Local       │                                                             │
│ ☑ Riverside   │  ┌─────────────────────────────────────────────────────┐   │
│ □ Hilltop     │  │ 🎵 "Ballad of the Great Harvest"                    │   │
│               │  │    By: Bard Melody | Epic Poem                      │   │
│               │  │    Mentions: Farmer Giles, The Drought              │   │
│               │  │    [Read] [Take Copy]                               │   │
│               │  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  Your Collection: 8 works                              [View Collection]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-002: Work Display

Individual written works are displayed in a readable format.

```typescript
// WorkDisplay wraps WrittenWork with UI-specific properties
interface WorkDisplay {
  work: WrittenWork;                    // From chroniclers system

  // Reading state
  isReading: boolean;
  currentPage: number;
  totalPages: number;
  scrollPosition: number;

  // UI elements
  showAuthorBio: boolean;
  showSourceInfo: boolean;
  showBiasIndicators: boolean;
  showMentionedEntities: boolean;

  // Formatting
  fontSize: "small" | "medium" | "large";
  theme: "parchment" | "paper" | "slate";

  // Navigation
  hasChapters: boolean;
  chapterList: ChapterNav[];
  bookmarks: Bookmark[];
}

interface ChapterNav {
  chapterId: string;
  title: string;
  pageStart: number;
  isComplete: boolean;                  // For ongoing works
}

interface Bookmark {
  pageNumber: number;
  position: number;
  note: string;
  createdAt: GameTime;
}

// Display biases from WrittenWork for transparency
interface BiasDisplay {
  bias: Bias;                           // From chroniclers system
  indicator: BiasIndicator;
  tooltip: string;
}

type BiasIndicator =
  | "favorable"           // Author likes subject
  | "critical"            // Author dislikes subject
  | "neutral"             // Balanced view
  | "unknown";            // Bias unclear
```

**Work Reading View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📖 "The Founding Years"                                 [◀ Back] [✕]      │
│     by Elder Thom                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Chapter 3: The First Winter                                        │   │
│  │                                                                     │   │
│  │    When the snows came that first year, none of us were             │   │
│  │  prepared. Old Marcus - may his memory be blessed - had             │   │
│  │  predicted a mild winter based on the behavior of the               │   │
│  │  forest creatures. He was wrong.                                    │   │
│  │                                                                     │   │
│  │    The cold set in on the third day of Frost Moon. By               │   │
│  │  morning, the river had frozen solid. Chief Elena called            │   │
│  │  a gathering at the great oak...                                    │   │
│  │                                                                     │   │
│  │                                                                     │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Mentioned: [Chief Elena] [Old Marcus] [The Great Oak]                      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Page 12 of 45                    [◀◀] [◀] [▶] [▶▶]     [📑 Chapters]      │
│  ⚠️ Author bias: Favorable toward Chief Elena                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-003: Newspaper Reader

Special UI for reading newspaper issues.

```typescript
// NewspaperDisplay wraps Newspaper from chroniclers system
interface NewspaperDisplay {
  newspaper: Newspaper;                 // From chroniclers system
  currentIssue: NewspaperIssue;

  // Navigation
  issueList: IssueNav[];
  selectedSection: NewspaperSection | null;

  // Reading
  expandedArticle: Article | null;
  articleList: ArticleDisplay[];
}

interface IssueNav {
  issueNumber: number;
  publishedAt: GameTime;
  headline: string;                     // Top story
  isRead: boolean;
}

// ArticleDisplay wraps Article with UI properties
interface ArticleDisplay {
  article: Article;                     // From chroniclers system
  isExpanded: boolean;
  sourceReliability: SourceReliabilityDisplay;
}

interface SourceReliabilityDisplay {
  sources: InformationSource[];         // From chroniclers system
  overallReliability: number;           // 0-1 aggregate
  indicator: "verified" | "likely" | "rumor" | "unknown";
  tooltip: string;
}
```

**Newspaper Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📰 THE FOREST HERALD                    Issue #127 | Today  [◀Prev] [X]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  TRADE AGREEMENT SIGNED WITH RIVERSIDE VILLAGE                        ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  By Scribe Alara                                           Source: ✓ Verified│
│                                                                             │
│  After weeks of negotiation, representatives from our village and          │
│  Riverside have agreed to terms for regular trade exchanges...             │
│                                                                             │
│  [Read Full Article]                                                        │
│                                                                             │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐   │
│  │ LOCAL NEWS                      │ │ FOREIGN AFFAIRS                 │   │
│  │                                 │ │                                 │   │
│  │ • New Bakery Opens on          │ │ • Hilltop Village Reports       │   │
│  │   Market Square                 │ │   Strange Lights               │   │
│  │   [Read]                        │ │   [Read] ⚠️ Rumor               │   │
│  │                                 │ │                                 │   │
│  │ • Council Approves Road        │ │ • Coastal Trading Post          │   │
│  │   Expansion                     │ │   Established                   │   │
│  │   [Read]                        │ │   [Read]                        │   │
│  └─────────────────────────────────┘ └─────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ EDITORIAL by Editor Thom: "On the Importance of Trade"              │   │
│  │ [Read]                                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  SECTIONS: [All] [Local] [Foreign] [Trade] [Culture] [Editorial]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-004: Author Profiles

Display information about chroniclers and their works.

```typescript
// ChroniclerDisplay wraps Chronicler with UI properties
interface ChroniclerDisplay {
  chronicler: Chronicler;               // From chroniclers system

  // Summary
  worksCount: number;
  latestWork: WrittenWork | null;
  knownBiases: Bias[];
  reputationDisplay: ReputationDisplay;

  // Works list
  publishedWorks: WrittenWork[];
  workInProgress: WorkInProgress | null;
}

interface ReputationDisplay {
  value: number;                        // From Chronicler.reputation
  label: ReputationLabel;
  description: string;
}

type ReputationLabel =
  | "unknown"            // New chronicler
  | "novice"             // Low reputation
  | "respected"          // Medium reputation
  | "renowned"           // High reputation
  | "legendary";         // Very high reputation
```

**Author Profile:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHRONICLER PROFILE                                              [X]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    [Portrait]     Elder Thom                                                │
│                   Historian | Renowned                                      │
│                                                                             │
│    Style: Analytical, thorough                                              │
│    Focus: Politics, History, Personalities                                  │
│                                                                             │
│    Known biases:                                                            │
│    • Favorable toward Chief Elena                                           │
│    • Critical of old governance system                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  PUBLISHED WORKS (12)                                                       │
│                                                                             │
│  📖 "The Founding Years"                    History | 3 seasons ago         │
│  📖 "Leadership Through Crisis"             Biography | 1 year ago          │
│  📖 "Trade Routes of the Valley"            Guide | 2 years ago             │
│  ...                                                                        │
│                                                                             │
│  CURRENT PROJECT                                                            │
│  📝 "The Great Drought and Its Aftermath"   [In Progress: 60%]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-005: Historical Timeline

Browse history through chronicled events.

```typescript
interface HistoricalTimeline {
  // Time range
  startTime: GameTime;
  endTime: GameTime;
  currentViewRange: TimeRange;

  // Events from chronicles
  chronicledEvents: ChronicledEvent[];

  // Filtering
  filterByVillage: VillageId | null;
  filterByTopic: FocusTopic | null;
  filterByChronicler: AgentId | null;

  // Display
  zoomLevel: "years" | "seasons" | "months";
  showMultiplePerspectives: boolean;   // Same event, different accounts
}

interface ChronicledEvent {
  eventId: string;
  summary: string;
  time: GameTime;

  // Source chronicles
  accounts: WrittenWork[];              // Works that mention this event
  perspectiveCount: number;             // How many chroniclers covered it

  // Aggregate info
  consensusDescription: string;
  hasConflictingAccounts: boolean;
}
```

**Timeline View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📜 HISTORICAL TIMELINE                                   [Zoom: Seasons]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Year 1                     Year 2                     Year 3              │
│  ├─────────────────────────┼─────────────────────────┼─────────            │
│                                                                             │
│  ●─────● Village Founded    ●──● First Trade          ●─● Great Drought    │
│  │     │ 3 accounts         │  │ 2 accounts           │ │ 5 accounts       │
│  │     │                    │  │                      │ │                  │
│  │     ●─● First Winter     │  ●── Council Formed     │ ●── Recovery       │
│  │       │ 4 accounts       │      1 account          │     2 accounts     │
│  │       │ ⚠️ Conflicting    │                         │                    │
│  │                          │                         │                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  SELECTED: The Great Drought (Year 3, Summer)                               │
│                                                                             │
│  📖 "The Founding Years" by Elder Thom                                      │
│     "The drought that struck in year three tested us like nothing before..."│
│                                                                             │
│  📰 The Forest Herald #42 by Scribe Alara                                   │
│     "Water rationing begins as river levels drop to record lows..."         │
│                                                                             │
│  🎵 "Ballad of the Great Harvest" by Bard Melody                           │
│     "When the sun burned fierce and the rivers ran low..."                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-006: Source Transparency

Display information source reliability and chains.

```typescript
interface SourceTransparency {
  work: WrittenWork;

  // Source breakdown
  sources: SourceDisplay[];
  overallAccuracy: number;              // From WrittenWork.accuracy

  // Source chain for distant events
  informationChain: InformationChainLink[];
}

interface SourceDisplay {
  source: InformationSource;            // From chroniclers system
  label: string;
  reliabilityIndicator: ReliabilityIndicator;
}

type ReliabilityIndicator =
  | "witnessed"          // Author saw it
  | "interview"          // Author talked to witness
  | "reported"           // From another chronicle
  | "rumor"              // Unverified
  | "abstract";          // From world simulation

interface InformationChainLink {
  step: number;
  source: string;                       // "Witnessed by X" or "Reported by Y"
  reliability: number;
  delay: number;                        // Days since event
}
```

**Source Info Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 SOURCE INFORMATION                                           [X]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Overall Reliability: ████████░░ 78%                                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  INFORMATION CHAIN:                                                         │
│                                                                             │
│  🌍 Event occurs in Riverside Village                                       │
│     ↓ (witnessed)                                                           │
│  👤 Merchant Toma sees event                                                │
│     ↓ (3 days travel)                                                       │
│  👤 Merchant Toma tells Chronicler Alara                                    │
│     ↓ (interview)                                                           │
│  📰 Chronicler Alara writes article                                         │
│                                                                             │
│  ⚠️ Note: Event details may have been simplified or altered during          │
│     transmission. Reliability decreases with each step.                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  SOURCES CITED:                                                             │
│  ✓ Interview with Merchant Toma (reliable, 3 day delay)                     │
│  ✓ Official trade records (verified)                                        │
│  ? Local gossip (unverified)                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CHR-007: Notification Integration

Alerts for new publications.

```typescript
interface ChronicleNotifications {
  // New publication types
  onNewNewspaper: Event<NewspaperIssue>;
  onNewBook: Event<WrittenWork>;
  onWorkCompleted: Event<HistoricalWork>;

  // Mentions
  onPlayerMentioned: Event<WrittenWork>;    // Player mentioned in work
  onAgentMentioned: Event<{                 // Followed agent mentioned
    work: WrittenWork;
    agent: AgentId;
  }>;

  // Settings
  notifyNewspapers: boolean;
  notifyBooks: boolean;
  notifyMentions: boolean;
}
```

---

## Keyboard Shortcuts

```
LIBRARY CONTROLS:
- L              : Open library
- Escape         : Close library/reader
- ↑/↓            : Navigate work list
- Enter          : Start reading selected
- F              : Search works

READER CONTROLS:
- ←/→            : Previous/next page
- Home/End       : First/last page
- C              : Chapter list
- B              : Add bookmark
- +/-            : Adjust font size
- Escape         : Close reader
```

---

## Visual Style

```typescript
interface ChronicleStyle {
  // Work type icons
  workIcons: Map<WorkType, Sprite>;

  // Reliability indicators
  verifiedColor: Color;              // Green
  likelyColor: Color;                // Yellow
  rumorColor: Color;                 // Orange
  unknownColor: Color;               // Gray

  // Bias indicators
  favorableColor: Color;             // Blue
  criticalColor: Color;              // Red

  // Reading themes
  themes: {
    parchment: ThemeConfig;          // Aged paper look
    paper: ThemeConfig;              // Clean modern
    slate: ThemeConfig;              // Dark mode
  };

  // 8-bit styling
  pixelScale: number;
}
```

---

## State Management

### Chroniclers System Integration

The chronicle viewer subscribes to chronicler events.

```typescript
interface ChronicleViewerState {
  // View state
  libraryOpen: boolean;
  currentlyReading: WrittenWork | null;
  readingPosition: ReadingPosition;

  // Events from chroniclers system
  onWorkPublished: Event<WrittenWork>;
  onNewspaperIssued: Event<NewspaperIssue>;
  onChroniclerStartedProject: Event<WorkInProgress>;
  onHistoryDocumented: Event<EventId>;     // Event was chronicled

  // Read tracking
  readWorks: Set<string>;                   // Work IDs player has read
  bookmarks: Map<string, Bookmark[]>;

  // Filtering preferences
  savedFilters: FilterPreset[];
}

interface ReadingPosition {
  workId: string;
  page: number;
  scrollOffset: number;
  lastReadAt: GameTime;
}
```

---

## Integration Points

- **Chroniclers System**: WrittenWork, Newspaper, Historian data
- **Agent System**: Author profiles, chronicler behaviors
- **Inventory System**: Written works as tradeable items
- **Notification System**: Publication alerts
- **World System**: Events being chronicled

---

## Open Questions

1. Should players be able to commission chroniclers to write about specific topics?
2. Book collection achievements or reading lists?
3. Translation system for works from other languages/villages?
4. Audio narration option for poems and songs?
5. Player annotation system for works?

---

## Related Specs

- `agent-system/chroniclers.md` - Source system spec
- `ui-system/inventory.md` - Written works as items
- `ui-system/notifications.md` - Publication alerts
- `world-system/abstraction-layers.md` - Distant village information
