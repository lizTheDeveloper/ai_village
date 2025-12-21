# Chroniclers & Written Works System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Some agents dedicate themselves to recording and sharing information - historians who document the past, journalists who report current events, poets who immortalize moments in verse. These chroniclers create **written works** that spread between villages, giving players (and other agents) insight into distant happenings and forgotten history.

Critically, chroniclers can write about events from **abstracted villages** - turning statistical world simulation into readable narrative.

---

## Chronicler Types

```typescript
interface Chronicler {
  agentId: string;
  type: ChroniclerType;

  // Specialization
  focus: ChroniclerFocus[];
  style: WritingStyle;
  reputation: number;           // 0-100, affects readership

  // Sources
  sources: InformationSource[];
  contacts: Map<VillageId, AgentId[]>;  // Who they know elsewhere

  // Output
  works: WrittenWork[];
  currentProject?: WorkInProgress;
  publicationRate: number;      // Works per season
}

type ChroniclerType =
  | "historian"         // Documents past events
  | "journalist"        // Reports current news
  | "chronicler"        // Records local happenings
  | "bard"              // Songs and epic poems
  | "scribe"            // Official records
  | "gossip"            // Informal news spreader
  | "scholar"           // Academic analysis
  | "traveler_writer";  // Writes about journeys

interface ChroniclerFocus {
  topic: FocusTopic;
  expertise: number;            // 0-1
  interest: number;             // How much they care
}

type FocusTopic =
  | "politics"          // Leadership, governance
  | "trade"             // Economic news
  | "wars"              // Conflicts
  | "discoveries"       // New things found
  | "culture"           // Traditions, festivals
  | "personalities"     // Notable people
  | "natural_events"    // Weather, disasters
  | "daily_life"        // Slice of life
  | "mysteries"         // Unexplained events
  | "foreign_lands";    // Other villages/planets

type WritingStyle =
  | "factual"           // Just the facts
  | "dramatic"          // Embellished for effect
  | "analytical"        // Deep analysis
  | "poetic"            // Artistic
  | "gossipy"           // Informal, chatty
  | "dry"               // Academic, boring
  | "satirical"         // Mocking
  | "heroic";           // Epic, glorifying
```

---

## Written Works

```typescript
interface WrittenWork {
  id: string;
  title: string;
  author: AgentId;
  authorName: string;

  // Type
  type: WorkType;
  genre: Genre;

  // Content
  content: string;              // The actual text (LLM generated)
  summary: string;              // Brief description
  topics: FocusTopic[];
  mentionedAgents: AgentId[];
  mentionedVillages: VillageId[];
  mentionedEvents: EventId[];

  // Time
  writtenAt: GameTime;
  coversperiod?: {
    start: GameTime;
    end: GameTime;
  };

  // Provenance
  basedOn: InformationSource[];
  accuracy: number;             // 0-1, how accurate is it?
  bias: Bias[];                 // Author's biases affecting content

  // Distribution
  copies: number;               // How many exist
  locations: VillageId[];       // Where copies are
  readBy: AgentId[];            // Who has read it
  influence: number;            // How much it shaped opinion
}

type WorkType =
  | "book"              // Long form
  | "pamphlet"          // Short, distributable
  | "newspaper"         // Regular publication
  | "scroll"            // Single document
  | "letter"            // Personal correspondence
  | "poem"              // Verse
  | "song"              // Meant to be sung
  | "official_record"   // Government/guild document
  | "journal"           // Personal diary (may be shared)
  | "encyclopedia";     // Reference work

type Genre =
  | "history"
  | "news"
  | "biography"
  | "travelogue"
  | "opinion"
  | "epic"
  | "satire"
  | "almanac"
  | "guide";

interface Bias {
  type: "pro" | "anti" | "neutral";
  subject: string;              // Village, person, idea
  strength: number;             // 0-1
}
```

---

## Information Sources

Chroniclers gather information from multiple sources:

```typescript
interface InformationSource {
  type: SourceType;
  reliability: number;          // 0-1
  freshness: number;            // How recent
  detail: number;               // How detailed
}

type SourceType =
  // Direct
  | "witnessed"           // Saw it themselves
  | "participated"        // Was involved

  // Secondary
  | "interview"           // Talked to someone who was there
  | "traveler_account"    // Heard from passing traveler
  | "merchant_news"       // Traders bring news
  | "official_report"     // Government/guild communication
  | "other_chronicle"     // Read another work

  // Tertiary
  | "rumor"               // Heard through gossip
  | "legend"              // Old stories

  // Abstract layer
  | "world_event";        // From abstracted simulation

// How chroniclers gather information
interface InformationGathering {
  methods: {
    // Active gathering
    interview: {
      targets: AgentId[];
      questionsAsked: string[];
      responsesReceived: string[];
    };

    // Passive gathering
    listening: {
      conversations_overheard: ConversationId[];
      rumors_heard: Rumor[];
    };

    // Research
    reading: {
      works_consulted: WorkId[];
      archives_visited: LocationId[];
    };

    // Travel
    travel: {
      villages_visited: VillageId[];
      events_witnessed: EventId[];
    };
  };
}
```

---

## Writing About Distant Places

The key feature - chroniclers can write about abstracted villages:

```typescript
interface DistantReporting {
  // How news travels
  channels: {
    travelers: {
      frequency: "when_they_arrive";
      delay: number;            // Days since event
      accuracy: 0.7;            // Some distortion
    };

    merchants: {
      frequency: "trade_caravans";
      delay: number;
      accuracy: 0.8;            // Focus on trade news
      bias: "economic";
    };

    official_messengers: {
      frequency: "important_events";
      delay: number;
      accuracy: 0.9;
      bias: "political";
    };

    other_chroniclers: {
      frequency: "their_publications";
      delay: number;
      accuracy: "varies";
    };
  };
}

// Convert abstract world event to chronicle-able content
async function eventToChronicle(
  event: WorldEvent,
  chronicler: Chronicler
): Promise<ChronicleContent> {

  // Get event details
  const details = getEventDetails(event);

  // Filter through chronicler's interests
  const relevantAspects = details.filter(d =>
    chronicler.focus.some(f => f.topic === d.topic)
  );

  // Apply chronicler's style and biases
  const prompt = `
    You are ${chronicler.name}, a ${chronicler.type} known for your ${chronicler.style} style.
    Your interests: ${chronicler.focus.map(f => f.topic).join(", ")}
    Your biases: ${chronicler.biases.map(b => `${b.type} ${b.subject}`).join(", ")}

    An event occurred in ${event.location}:
    ${event.description}
    Details: ${JSON.stringify(relevantAspects)}

    Your source for this information: ${event.source.type}
    (Reliability: ${event.source.reliability}, Delay: ${event.source.delay} days)

    Write a ${chronicler.type === "journalist" ? "news report" : "historical account"}
    of this event in your characteristic style.

    Length: ${getAppropriateLength(chronicler, event)}

    Remember:
    - Your source is ${event.source.reliability < 0.7 ? "not entirely reliable" : "fairly reliable"}
    - This happened ${event.source.delay} days ago in a distant village
    - Apply your perspective and style
  `;

  const content = await llm.complete(prompt);

  return {
    content,
    accuracy: event.source.reliability * chronicler.accuracy,
    topics: relevantAspects.map(a => a.topic),
    mentionedVillages: [event.villageId],
    mentionedEvents: [event.id],
  };
}
```

---

## The Village Newspaper

Regular publications that compile news:

```typescript
interface Newspaper {
  id: string;
  name: string;                 // "The Forest Herald"
  village: VillageId;

  // Staff
  editor: AgentId;
  writers: AgentId[];

  // Publication
  frequency: "daily" | "weekly" | "monthly";
  distribution: VillageId[];    // Where it's sold/read

  // Content sections
  sections: NewspaperSection[];

  // Archives
  issues: NewspaperIssue[];
}

interface NewspaperSection {
  name: string;                 // "Local News", "Foreign Affairs"
  topics: FocusTopic[];
  editor?: AgentId;             // Section editor
}

interface NewspaperIssue {
  issueNumber: number;
  publishedAt: GameTime;
  articles: Article[];
  editorials: Editorial[];
  advertisements: Advertisement[];
}

interface Article {
  headline: string;
  byline: AgentId;              // Author
  content: string;
  section: string;
  sources: InformationSource[];
  wordCount: number;
}

// Generate a newspaper issue
async function generateNewspaperIssue(
  paper: Newspaper
): Promise<NewspaperIssue> {

  const articles: Article[] = [];

  // Gather recent events
  const localEvents = getRecentEvents(paper.village, paper.lastIssue);
  const foreignEvents = getForeignNewsReceived(paper.village, paper.lastIssue);

  // Assign to writers
  for (const event of localEvents) {
    const writer = assignWriter(paper, event);
    const article = await writeArticle(writer, event, "local");
    articles.push(article);
  }

  for (const event of foreignEvents) {
    const writer = assignWriter(paper, event);
    const article = await writeArticle(writer, event, "foreign");
    articles.push(article);
  }

  // Editor writes editorial
  const editorial = await writeEditorial(paper.editor, articles);

  return {
    issueNumber: paper.issues.length + 1,
    publishedAt: gameTime.now(),
    articles,
    editorials: [editorial],
    advertisements: gatherAdvertisements(paper.village),
  };
}

// Write an article about an event
async function writeArticle(
  writer: Chronicler,
  event: Event,
  scope: "local" | "foreign"
): Promise<Article> {

  const prompt = `
    You are ${writer.name}, a journalist for The ${paper.name}.
    Your writing style: ${writer.style}

    Write a news article about:
    ${event.description}

    ${scope === "foreign" ? `This happened in ${event.village}, which is ${getDistance(paper.village, event.village)} days travel away.` : "This happened locally."}

    Details available: ${JSON.stringify(event.details)}

    Write in a journalistic style appropriate for a village newspaper.
    Include a compelling headline.
    Length: 100-200 words.
  `;

  const response = await llm.complete(prompt);
  const { headline, content } = parseArticle(response);

  return {
    headline,
    byline: writer.agentId,
    content,
    section: categorizeEvent(event),
    sources: [{ type: scope === "local" ? "witnessed" : "traveler_account", ... }],
    wordCount: countWords(content),
  };
}
```

---

## The Village Historian

Long-form historical writing:

```typescript
interface Historian {
  chronicler: Chronicler;

  // Specialization
  era: "ancient" | "recent" | "contemporary";
  region: VillageId[];          // What villages they cover
  themes: FocusTopic[];

  // Archives
  personalArchive: WrittenWork[];
  sourceMaterials: SourceMaterial[];

  // Current work
  currentProject: HistoricalWork | null;
}

interface HistoricalWork {
  title: string;
  scope: {
    startTime: GameTime;
    endTime: GameTime;
    regions: VillageId[];
    themes: FocusTopic[];
  };

  // Chapters
  chapters: Chapter[];
  currentChapter: number;

  // Progress
  researchComplete: boolean;
  writingProgress: number;      // 0-1
  estimatedCompletion: GameTime;
}

interface Chapter {
  title: string;
  content: string;
  events_covered: EventId[];
  sources_cited: WorkId[];
  status: "planned" | "researching" | "writing" | "complete";
}

// Historian decides what to write about
async function historianChooseProject(
  historian: Historian
): Promise<HistoricalWork> {

  // What events have happened that deserve chronicling?
  const significantEvents = getSignificantEvents({
    timeRange: { seasons: 4 },  // Last year
    regions: historian.region,
    minImportance: 0.6,
  });

  // What hasn't been written about yet?
  const undocumented = significantEvents.filter(e =>
    !hasBeenChronicled(e, historian.personalArchive)
  );

  // Let historian decide
  const prompt = `
    You are ${historian.chronicler.name}, a historian in ${historian.village}.
    Your expertise: ${historian.themes.join(", ")}
    Your style: ${historian.chronicler.style}

    Recent significant events that haven't been properly documented:
    ${undocumented.map(e => `- ${e.summary} (${e.date})`).join("\n")}

    What historical work should you write next?
    Consider: What would be valuable for future generations to understand?
    What story needs to be told?

    Respond with:
    - Title of the work
    - Scope (time period, regions)
    - Themes to explore
    - Why this matters
  `;

  const response = await llm.complete(prompt);
  return parseHistoricalProject(response);
}
```

---

## Distribution & Influence

Written works spread and influence opinion:

```typescript
interface WorkDistribution {
  // How works spread
  methods: {
    copying: {
      by: "scribes" | "printing_press";  // Depends on tech level
      rate: number;             // Copies per season
      cost: number;
    };

    trade: {
      merchants_carry: boolean;
      popular_works_only: boolean;
    };

    libraries: {
      public_access: boolean;
      collection_policy: string;
    };

    oral_transmission: {
      songs_memorized: boolean;
      stories_retold: boolean;
      accuracy_loss: number;
    };
  };
}

// Track a work's spread
interface WorkSpread {
  workId: string;
  originVillage: VillageId;
  publishedAt: GameTime;

  // Spread over time
  spreadHistory: {
    time: GameTime;
    village: VillageId;
    copies: number;
    howArrived: "trade" | "traveler" | "copied" | "gifted";
  }[];

  // Current state
  currentDistribution: Map<VillageId, number>;  // Copies per village
  totalReaders: number;
  influence: number;            // 0-1
}

// When a work arrives in a new village
async function workArrivesInVillage(
  work: WrittenWork,
  village: Village
): Promise<void> {

  // Add to village's available reading
  village.library.add(work);

  // Potential readers discover it
  const potentialReaders = village.agents.filter(a =>
    a.literacy > 0.5 && a.interests.some(i => work.topics.includes(i))
  );

  for (const reader of potentialReaders) {
    if (Math.random() < 0.3) {  // 30% chance to read
      await agentReadsWork(reader, work);
    }
  }
}

// Agent reads a work - may affect their knowledge/opinions
async function agentReadsWork(
  agent: Agent,
  work: WrittenWork
): Promise<void> {

  // Learn about events described
  for (const eventId of work.mentionedEvents) {
    const event = getEvent(eventId);
    agent.knowledge.learnAbout(event, {
      source: "read",
      accuracy: work.accuracy,
      fromWork: work.id,
    });
  }

  // Learn about places described
  for (const villageId of work.mentionedVillages) {
    agent.knowledge.learnAboutVillage(villageId, {
      source: "read",
      details: extractVillageDetails(work, villageId),
    });
  }

  // May form opinions based on biases
  for (const bias of work.bias) {
    const influence = work.author.reputation * agent.impressionability;
    agent.opinions.shift(bias.subject, bias.type, influence * bias.strength);
  }

  // Form memory of reading
  await createMemory(agent, {
    type: "read_work",
    summary: `Read "${work.title}" by ${work.authorName}`,
    importance: work.influence * 0.3,
  });
}
```

---

## Integration with Abstraction Layers

Chroniclers bridge detailed and abstract simulation:

```typescript
// When player reads about distant village
async function getNewsFromDistantVillage(
  readerVillage: Village,
  targetVillage: VillageId
): Promise<WrittenWork[]> {

  // Get available works about that village
  const works = readerVillage.library.getWorksAbout(targetVillage);

  // If village is abstract, we can also check for recent events
  const villageState = getSimulationLayer(targetVillage);

  if (villageState === "abstract" || villageState === "historical") {
    // Check if any chronicler should write about recent events
    const recentEvents = getAbstractVillageEvents(targetVillage);
    const unchronicled = recentEvents.filter(e => !hasChronicle(e));

    if (unchronicled.length > 0) {
      // Find chroniclers who might write about this
      const chroniclers = findChroniclers({
        hasContacts: targetVillage,
        interested: unchronicled.map(e => e.topic),
      });

      for (const chronicler of chroniclers) {
        // They write about it (using abstract event data)
        const work = await chronicler.writeAbout(unchronicled);
        works.push(work);
      }
    }
  }

  return works;
}

// Abstract events become readable history
async function chronicleAbstractHistory(
  chronicler: Chronicler,
  village: VillageAggregate,
  period: TimePeriod
): Promise<WrittenWork> {

  // Get abstract events from that period
  const events = village.recentHistory.filter(e =>
    e.time >= period.start && e.time <= period.end
  );

  // Chronicler interprets and writes
  const prompt = `
    You are ${chronicler.name}, writing a historical account of ${village.name}.
    Your style: ${chronicler.style}

    Events that occurred (${period.start} to ${period.end}):
    ${events.map(e => `- ${e.description}`).join("\n")}

    Village context:
    - Population: ${village.population.total}
    - Governance: ${village.governance.type}
    - Main industries: ${village.economy.mainIndustries.join(", ")}
    - Current state: ${village.stability > 0.7 ? "stable" : "troubled"}

    Write a ${chronicler.type === "historian" ? "historical account" : "report"}
    covering this period. Include your interpretation of why these events
    happened and what they mean.

    Length: 200-400 words.
  `;

  const content = await llm.complete(prompt);

  return {
    id: generateId(),
    title: generateTitle(chronicler, village, period),
    author: chronicler.agentId,
    authorName: chronicler.name,
    type: "book",
    genre: "history",
    content,
    summary: summarize(content),
    topics: extractTopics(events),
    mentionedVillages: [village.id],
    mentionedEvents: events.map(e => e.id),
    writtenAt: gameTime.now(),
    coversPeriod: period,
    basedOn: [{ type: "world_event", reliability: 0.9 }],
    accuracy: 0.85,
    bias: chronicler.biases,
    copies: 1,
    locations: [chronicler.village],
    readBy: [],
    influence: 0,
  };
}
```

---

## Summary

| Role | Writes About | Style | Distribution |
|------|-------------|-------|--------------|
| **Historian** | Past events | Analytical, thorough | Books, archives |
| **Journalist** | Current news | Factual, timely | Newspapers |
| **Bard** | Epic moments | Poetic, dramatic | Songs, performances |
| **Chronicler** | Local happenings | Detailed records | Scrolls, journals |
| **Gossip** | Rumors, scandals | Informal | Word of mouth |
| **Scholar** | Analysis | Academic | Treatises |

Key features:
- **Bridge abstract/detailed** - chroniclers write about distant abstracted events
- **Information propagation** - news spreads through written works
- **Bias & accuracy** - works reflect author's perspective
- **Influence** - readers' opinions shaped by what they read
- **Emergent history** - the world's story is written by its inhabitants

---

## Related Specs

- `world-system/abstraction-layers.md` - Simulation layers
- `agent-system/memory-system.md` - How agents remember what they read
- `economy-system/inter-village-trade.md` - Merchants carry news
- `economy-system/spec.md` - Information economy, written work valuation
- `items-system/spec.md` - Written works as tradeable items
- `research-system/spec.md` - Documenting discoveries
- `agent-system/spec.md` - Writing and literacy skills

