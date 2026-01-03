# Communication Technology Progression Specification

> **System:** communication-system
> **Version:** 2.0
> **Status:** Draft
> **Last Updated:** 2026-01-03

## Overview

This specification defines a progressive technology tree for agent-to-agent communication, starting from written language and academic publishing, advancing through walkie-talkies, radio, television, cellular networks, satellite communications, mesh networking, and ultimately Clarke-tech quantum entanglement devices.

Each technology tier builds upon the previous, introducing new gameplay mechanics, infrastructure requirements, and social dynamics.

## Core Requirements

### Requirement 1: Progressive Technology Tree

Communication technologies unlock in tiers:
- **Tier 0a**: Writing Systems (permanent information storage via scrolls/manuscripts)
- **Tier 0b**: Binder Technology (bind papers together into proto-journals/books)
- **Tier 0c**: Scribe Workshops (manual copying of manuscripts)
- **Tier 0d**: Printing Press (mechanical reproduction device)
- **Tier 0e**: Printing Company (organizational infrastructure for mass publication)
- **Tier 0f**: Academic Journals (formal research publishing and distribution)
- **Tier 1**: Walkie-Talkie (basic radio, 100 tile range)
- **Tier 2**: Radio Broadcast (one-to-many via towers, 500 tile range)
- **Tier 3**: Television Broadcast (video streaming, 600 tile range)
- **Tier 4a**: Cellular Network (mobile phones, tower infrastructure)
- **Tier 4b**: TV Camera + Recorder (portable video recording)
- **Tier 4c**: Online Journals (digital research publication and distribution)
- **Tier 4d**: Search Engines (indexing and searching all online content)
- **Tier 4e**: Recommendation Algorithms (collaborative filtering, content suggestions)
- **Tier 5a**: Satellite Phone (global coverage)
- **Tier 5b**: Mesh Network (decentralized peer-to-peer)
- **Tier 5c**: Wikipedia/Collaborative Knowledge Base (crowd-sourced encyclopedia)
- **Tier 5d**: Cloud Computing (distributed storage and computation)
- **Tier 5e**: Personalization/Feed Algorithms (ML-based content ranking and filtering)
- **Tier 5f**: Language Models (AI assistants trained on all human knowledge)
- **Tier 6a**: Quantum Entanglement Communicator (instant, unlimited range)
- **Tier 6b**: Distributed Quantum Network (quantum mesh)

### Requirement 2: Infrastructure Requirements

Technologies require physical infrastructure:
- **Tier 0a**: Libraries for manuscript storage
- **Tier 0b**: Binder workshops (tools to bind papers)
- **Tier 0c**: Scribe workshops (desks, ink, parchment)
- **Tier 0d**: Printing press buildings (press machinery)
- **Tier 0e**: Printing company buildings (organizational infrastructure)
- **Tier 0f**: Journal press buildings (publication distribution)
- **Tier 1+**: Radio towers for broadcast
- **Tier 4+**: Cell towers for cellular network, internet backbone servers, search index servers, recommendation engine servers
- **Tier 5**: Satellites in orbit for satellite phones, data centers for cloud computing, Wikipedia servers, AI training clusters for language models
- **Tier 6+**: Quantum laboratories for entanglement devices

Infrastructure costs money, requires construction, and (for powered systems) needs continuous power and network bandwidth.

### Requirement 3: Emergent Agent Behavior

Agents autonomously decide communication methods based on:
- Urgency (emergency → fastest available)
- Privacy (private conversation vs broadcast)
- Cost (cell phone minutes cost money)
- Availability (what infrastructure exists?)
- Social norms (culture preferences)

## Implementation Files

> **Note:** This system is DRAFT - infrastructure not yet built

**Planned Components:**
- `packages/core/src/components/CommunicationComponent.ts` - Agent communication state
- `packages/core/src/components/CommunicationDeviceComponent.ts` - Device properties

**Planned Systems:**
- `packages/core/src/systems/WalkieTalkieSystem.ts` - Tier 1 implementation
- `packages/core/src/systems/RadioBroadcastSystem.ts` - Tier 2 implementation
- `packages/core/src/systems/CellularNetworkSystem.ts` - Tier 4a implementation
- `packages/core/src/systems/MeshNetworkSystem.ts` - Tier 5b implementation
- `packages/core/src/systems/QuantumCommunicationSystem.ts` - Tier 6 implementation

**Planned Buildings:**
- `packages/core/src/buildings/RadioTower.ts` - Radio broadcast infrastructure
- `packages/core/src/buildings/CellTower.ts` - Cellular infrastructure
- `packages/core/src/buildings/CommSatellite.ts` - Orbital satellite
- `packages/core/src/buildings/QuantumLaboratory.ts` - Entanglement facility

**Planned Items:**
- `packages/core/src/items/communicationDevices.ts` - All communication devices

## Components

### Component: CommunicationComponent
**Type:** `communication`
**Purpose:** Tracks active communication sessions for an agent

**Properties:**
- `activeCalls: ActiveCall[]` - Voice/video calls
- `activeChats: ActiveChat[]` - Chat sessions
- `devices: string[]` - Owned device IDs
- `activeDevice: string | null` - Current device in use
- `subscriptions: Subscription[]` - Radio/TV subscriptions
- `preferences: CommunicationPreferences` - Mute, DND, favorites

### Component: CommunicationTrait (Item Trait)
**Type:** `communication` (ItemTrait)
**Purpose:** Defines communication device capabilities

**Properties:**
- `mode: CommunicationMode` - two_way_radio, cellular, quantum, etc.
- `range: number | null` - Maximum range in tiles (null = unlimited)
- `channels: number` - Switchable channels/frequencies
- `requiresLineOfSight: boolean` - Needs clear path?
- `penetratesTerrain: boolean` - Can signal go through mountains?
- `batteryDuration: number` - Ticks until battery dies
- `signalStrength: number` - 0-1 multiplier
- `requiresInfrastructure: string[]` - Required tower/satellite IDs
- `latency: number` - Delay in ticks

## Systems

### System: ManuscriptSystem (Tier 0a)
**Purpose:** Physical research paper storage and distribution
**Update Frequency:** Event-driven

**Responsibilities:**
- Track research papers as physical manuscript entities
- Enforce library storage requirements (must be in library building)
- Handle manuscript degradation over time (decay/damage)
- Enable manuscript copying (manual transcription by scribes)
- Track manuscript ownership and location
- Handle manuscript destruction (fire, theft, loss)

**Pre-Journal Constraints:**
- Each paper exists as single physical manuscript
- Must be stored in library building (shelf space limited)
- Agents must travel to library to read
- Manuscripts can be lost permanently (fire/theft)
- No mass distribution (only original exists)

### System: BinderSystem (Tier 0b)
**Purpose:** Bind individual papers together into collections
**Update Frequency:** Event-driven

**Responsibilities:**
- Allow agents to bind multiple paper entities into single bound volume
- Track bound volumes (proto-journals, proto-books)
- Enable creating custom collections by topic
- Bound volumes easier to store and transport than loose papers
- Binding requires binder tool/workshop

**Mechanics:**
```typescript
// Agent action: "Bind Papers"
function bindPapers(papers: Entity[], title: string): Entity {
  return createEntity({
    components: [
      {
        type: 'bound_volume',
        title: title,
        containedPapers: papers.map(p => p.id),
        createdBy: agent.id,
        createdTick: currentTick,
        binding: 'string' // Later: 'leather', 'cloth'
      },
      {
        type: 'item',
        weight: papers.length * 0.1,
        stackable: false
      }
    ]
  });
}
```

**Unlocks:**
- Can organize papers by topic (create proto-journals)
- Easier transport (one bound volume vs many loose papers)
- Gift/trade entire collections
- Protect papers from damage (bound volumes more durable)

### System: ScribeWorkshopSystem (Tier 0c)
**Purpose:** Manual copying of manuscripts by trained scribes
**Update Frequency:** Every tick

**Responsibilities:**
- Manage scribe workshop buildings
- Track scribes (agents with scribe profession)
- Handle manuscript copying jobs (slow, labor-intensive)
- Consume ink and parchment resources
- Calculate copying time (based on scribe skill, paper length)
- Track copying errors (scribes may introduce mistakes)

**Copying Mechanics:**
```typescript
interface CopyingJob {
  jobId: string;
  scribeId: string;          // Agent doing the copying
  originalPaperId: string;   // Source manuscript

  // Progress
  startTick: number;
  estimatedTicks: number;    // Based on length & scribe skill
  progressPercent: number;

  // Quality
  scribeSkill: number;       // Higher = faster, fewer errors
  errorChance: number;       // % chance of introducing errors

  // Resources
  inkConsumed: number;
  parchmentConsumed: number;
}
```

**Copying Time Calculation:**
```typescript
function calculateCopyingTime(paper: ResearchPaper, scribeSkill: number): number {
  const baseTicks = 500; // ~8 minutes real-time
  const lengthModifier = paper.description.length / 1000;
  const skillBonus = 1 / (1 + scribeSkill / 50); // Skilled scribes faster

  return baseTicks * lengthModifier * skillBonus;
}
```

**Pre-Printing Press Distribution:**
- Each copy takes significant time (500+ ticks)
- Scribes earn money per copy
- Errors may propagate through copies
- Wealthy patrons can commission copies
- Limited distribution (too expensive for mass production)

### System: PrintingPressSystem (Tier 0d)
**Purpose:** Mechanical device for reproducing text
**Update Frequency:** Event-driven

**Responsibilities:**
- Enable printing of copies from manuscript using press device
- Track printing press device usage
- Calculate printing time (much faster than scribes, but still manual operation)
- Consume paper and ink resources
- One operator can run press

**Mechanics:**
```typescript
interface PrintingJob {
  jobId: string;
  operatorId: string;        // Agent operating the press
  sourceManuscriptId: string;

  // Progress
  copiesRequested: number;
  copiesCompleted: number;
  ticksPerCopy: number;      // ~50 ticks per copy (vs 500 for scribe)

  // Resources per copy
  inkCost: number;
  paperCost: number;
}
```

**Printing Press vs Scribes:**
- **Speed**: 10x faster than scribes (50 vs 500 ticks)
- **Quality**: No errors (mechanical consistency)
- **Cost**: Lower per copy (ink + paper, no scribe wages)
- **Limitation**: Still manual operation, one press = one operator
- **Scale**: Can't mass produce (yet)

### System: PrintingCompanySystem (Tier 0e)
**Purpose:** Organizational infrastructure for mass publication
**Update Frequency:** Event-driven

**Responsibilities:**
- Manage printing company buildings (multiple presses + staff)
- Schedule print runs across multiple presses
- Handle bulk orders (print 100+ copies)
- Manage distribution logistics
- Track inventory of printed materials
- Economic model (pricing, profit margins)

**Company Capabilities:**
```typescript
interface PrintingCompanyComponent {
  type: 'printing_company';

  companyId: string;
  name: string;              // "Gutenberg Press Inc."
  ownerId: string;           // Agent who owns company

  // Infrastructure
  pressCount: number;        // Number of presses owned
  employeeIds: string[];     // Press operators, binders, distributors

  // Production
  activeJobs: PrintRun[];
  inventory: PrintedBook[];  // Books in stock

  // Economics
  standardPricePerCopy: number;
  bulkDiscounts: BulkPricing[];
  revenue: number;
  expenses: number;
}

interface PrintRun {
  manuscriptId: string;
  copiesOrdered: number;
  copiesCompleted: number;
  assignedPresses: string[]; // Parallel production
  estimatedCompletion: number;
}
```

**Unlocks:**
- **Mass production**: Multiple presses working in parallel
- **Distribution network**: Companies can ship to multiple locations
- **Economy of scale**: Bulk orders reduce per-copy cost
- **Professional publishing**: Authors can submit to companies for publication
- **Book market**: Printed books become tradeable commodities

**Pre-Journal Limitations:**
- Companies print on demand (no scheduled publications)
- No standardized formats
- Distribution still manual (ships books to customers)

**Unlocks Biography Publishing:**
Once printing companies exist, agents can commission biographies of notable figures. These serve as career blueprints.

### System: BiographySystem (Tier 0e+)
**Purpose:** Publish life stories of notable agents as career inspiration
**Update Frequency:** Event-driven

**Responsibilities:**
- Track notable achievements (first to discover technology, master craftsman, etc.)
- Enable biography writing about accomplished agents
- Distribute biographies through printing companies
- Track which agents read which biographies
- Increase career aspiration based on biography reading

**Biography Mechanics:**
```typescript
interface BiographyComponent {
  type: 'biography';

  biographyId: string;
  title: string;            // "The Life of Grok the Smith"
  subjectId: string;        // Agent being written about

  // Subject's achievements
  achievements: Achievement[];
  field: ResearchField;     // Primary career field
  peakSkill: number;        // Subject's highest skill level

  // Publication
  authorId: string;         // Who wrote the biography
  publishedBy: string;      // Printing company
  publicationTick: number;
  copiesPrinted: number;

  // Inspiration effect
  inspirationBonus: number; // 0-1, based on subject's achievements
  careerPath: CareerBlueprint;
}

interface Achievement {
  type: 'first_discovery' | 'master_craftsman' | 'innovation' | 'teaching';
  description: string;
  field: ResearchField;
  tick: number;
}

interface CareerBlueprint {
  field: ResearchField;
  recommendedSkills: string[];
  milestones: Milestone[];
}

interface Milestone {
  description: string;      // "Learn basic metallurgy"
  skillRequirement?: { skill: string, level: number };
  paperRequirement?: string[]; // Papers to read
  orderInPath: number;
}
```

**Biography Eligibility:**
Agents must have notable achievements to have biographies written:
- First to discover/publish a major research paper
- Master craftsman (skill level 75+)
- Invented new technique or recipe
- Founded influential institution (university, company)
- Taught many successful students

**Inspiration Mechanics:**
```typescript
function readBiography(agent: Entity, biography: BiographyComponent): void {
  const subject = getAgent(biography.subjectId);

  // Increase aspiration to follow similar career
  if (agent.age === 'teen' || agent.age === 'young_adult') {
    // Young agents most impressionable
    const aspirationBonus = biography.inspirationBonus * 2.0;

    // Make agent more likely to pursue research in that field
    agent.careerAspirations.set(biography.field, aspirationBonus);

    // Give blueprint for career path
    agent.careerBlueprint = biography.careerPath;

    // Increase motivation to read prerequisite papers
    for (const milestone of biography.careerPath.milestones) {
      if (milestone.paperRequirement) {
        agent.priorityPapers.push(...milestone.paperRequirement);
      }
    }
  }

  // All agents gain some inspiration
  agent.motivationToResearch += biography.inspirationBonus * 0.5;
}
```

**Career Path Following:**
```typescript
interface CareerAspirationComponent {
  type: 'career_aspiration';

  // Aspired career (from biography)
  targetField?: ResearchField;
  roleModel?: string;         // Biography subject ID
  blueprint?: CareerBlueprint;

  // Progress tracking
  currentMilestone: number;   // Which step in blueprint
  achievedMilestones: number[];

  // Motivation effects
  researchMotivation: number; // 0-1, how motivated to do research
  persistenceBonus: number;   // Less likely to give up when stuck
}
```

**Emergent Gameplay:**
- **Role models**: Young agents read biographies and emulate heroes
- **Career paths**: Biographies provide structured path to mastery
- **Generational knowledge**: Each generation inspired by previous
- **Fame incentive**: Agents work harder knowing biography might be written
- **Cultural heroes**: Villages develop local heroes (statues, celebrations)
- **Inequality**: Only successful agents get biographies (survivor bias)

**Biography Types:**

```typescript
const BIOGRAPHY_TYPES = {
  // Scientific biographies
  'the_first_metallurgist': {
    field: 'metallurgy',
    milestones: [
      { description: 'Read "Ore Identification"', paperRequirement: ['ore_identification'] },
      { description: 'Read "Smelting Fundamentals"', paperRequirement: ['smelting_fundamentals'] },
      { description: 'Achieve Apprentice rank', skillRequirement: { skill: 'metallurgy', level: 25 } },
      { description: 'Publish first metallurgy paper', type: 'publish_paper' },
      { description: 'Achieve Master rank', skillRequirement: { skill: 'metallurgy', level: 75 } }
    ]
  },

  // Entrepreneurial biographies
  'the_printing_magnate': {
    field: 'society',
    milestones: [
      { description: 'Learn printing press operation' },
      { description: 'Start printing company', type: 'found_company' },
      { description: 'Print 1000 books', type: 'production_milestone' },
      { description: 'Expand to multiple locations' }
    ]
  },

  // Teaching biographies
  'the_great_teacher': {
    field: 'any',
    milestones: [
      { description: 'Achieve Master rank in field' },
      { description: 'Teach first student' },
      { description: 'Have student achieve Master rank', type: 'student_success' },
      { description: 'Found school or university' }
    ]
  }
};
```

**Integration with Research System:**
- Biographies recommend specific papers to read
- Young agents more likely to read papers in biography's field
- Career blueprints guide research progression
- Success stories inspire next generation

**Publishing Economics:**
- Biographies are profitable (agents buy to learn career paths)
- Printing companies compete for famous subjects
- Subjects may get royalties (or their estates)
- Unauthorized biographies (gossip/scandal) also possible

### System: AcademicJournalSystem (Tier 0f)
**Purpose:** Formal research publishing and distribution infrastructure
**Update Frequency:** Every 100 ticks (publication cycle)

**Responsibilities:**
- Manage journal entities (one per research field)
- Accept paper submissions from agents
- Track journal volumes and issues
- Distribute published journals to subscribers (libraries, universities)
- Enable mass distribution of research across settlements
- Track journal prestige and citation metrics
- Handle peer review process (if enabled)

**Journal Publication Mechanics:**
1. Agent submits paper to journal (must have authored it)
2. Journal queues paper for next issue
3. On publication tick, journal publishes issue with all queued papers
4. Issue distributed to all subscriber libraries
5. Papers now accessible at all subscriber locations
6. Authors gain reputation from publication

**Post-Journal Benefits:**
- Papers discoverable without traveling
- Multiple settlements can access same research
- Organized by field (easier to find relevant work)
- Knowledge preserved across settlements
- Research spreads faster through civilization

**Component: JournalComponent**
```typescript
interface JournalComponent {
  type: 'journal';

  // Identity
  journalId: string;
  name: string;              // "Annals of Metallurgy"
  field: ResearchField;      // Specialization

  // Publication
  publishedPapers: string[]; // All papers published
  currentVolume: number;
  currentIssue: number;
  queuedPapers: string[];    // Accepted, awaiting publication

  // Distribution
  subscribers: string[];     // Library/university entity IDs
  copiesPerIssue: number;    // How many printed

  // Quality
  prestige: number;          // 0-100, affects skill grants
  peerReviewEnabled: boolean;
  editorId?: string;         // Agent managing journal
}
```

**Building Requirements:**
- **Library** (Tier 0a) - Physical manuscript storage, limited capacity
- **Printing Press** (Tier 0d) - Building that produces printed copies
- **Printing Company** (Tier 0e) - Organizational infrastructure with multiple presses
- **Bookstore** (Tier 0e+) - Commercial building selling books and biographies
- **University Library** (Tier 0f+) - Academic library with journal subscriptions
- **Journal Press** (Tier 0f) - Building that publishes and distributes journals

## Knowledge Infrastructure Buildings

### Building: Library (Tier 0a - Critical Infrastructure)
**Purpose:** Public repository for manuscripts and books
**Capacity:** Limited by building size (50-200 items)

**Component:**
```typescript
interface LibraryComponent {
  type: 'library';

  // Collection
  manuscripts: string[];     // Manuscript entity IDs
  books: string[];          // Book entity IDs
  capacity: number;         // Maximum items

  // Access
  publicAccess: boolean;    // Free for all vs membership
  membershipFee?: number;
  openHours: { start: number, end: number };

  // Staff
  librarianId?: string;     // Agent who manages collection

  // Usage metrics
  visitsPerDay: number;
  mostReadItems: Map<string, number>; // Item ID → read count
}
```

**Critical Functions:**
- **Manuscript preservation**: Only safe storage before printing press
- **Knowledge access**: Agents must visit to read (no home copies yet)
- **Capacity crisis**: Limited space forces tough decisions (what to preserve?)
- **Fire risk**: All knowledge in one place (catastrophic loss possible)

**Emergent Gameplay:**
- Librarian profession (curates collection, recommends readings)
- Waiting lists (popular manuscripts have queues)
- Library fires destroy irreplaceable knowledge
- Villages compete to build largest libraries
- Restricted sections (advanced papers locked away)

### Building: Bookstore (Tier 0e+ - Commercial)
**Purpose:** Sell printed books and biographies
**Enabled By:** Printing companies

**Component:**
```typescript
interface BookstoreComponent {
  type: 'bookstore';

  // Inventory
  booksForSale: BookListing[];

  // Economics
  ownerId: string;
  revenue: number;
  markupPercentage: number; // Price above printing cost

  // Ordering
  printingPartners: string[]; // Printing company IDs
  canOrderCustom: boolean;   // Can special-order any book?
}

interface BookListing {
  bookId: string;
  title: string;
  type: 'biography' | 'research_compilation' | 'textbook' | 'novel';
  copiesInStock: number;
  price: number;
  popularityScore: number;  // How often purchased
}
```

**Critical Functions:**
- **Home libraries**: Agents buy books to own (don't need library visits)
- **Biography distribution**: Primary source for career inspiration books
- **Bestsellers**: Popular books sell out, must restock
- **Economic engine**: Profitable business model
- **Special orders**: Can order rare books from printing companies

**Bookstore vs Library:**
- **Library**: Free, limited copies, must read on-site, public good
- **Bookstore**: Pay to own, take home, build personal library, commercial

**Emergent Gameplay:**
- Bestseller lists emerge (most popular biographies/papers)
- Book collectors (agents who buy many books)
- Rare book market (out-of-print books become valuable)
- Bookstore chains (multiple locations)
- Independent vs chain competition

### Building: University Library (Tier 0f+ - Academic)
**Purpose:** Research-focused library with journal subscriptions
**Enabled By:** Academic journals + universities

**Component:**
```typescript
interface UniversityLibraryComponent {
  type: 'university_library';

  // Enhanced collection
  manuscripts: string[];
  books: string[];
  capacity: number;         // Much larger than public libraries

  // Journal subscriptions (CRITICAL!)
  journalSubscriptions: string[]; // Journal IDs
  subscriptionCost: number;       // Annual cost per journal

  // Special collections
  specialCollections: {
    rareManuscripts: string[];
    archiveAccessRequired: boolean;
  };

  // Academic access
  universityId: string;     // Which university owns this
  studentAccess: boolean;   // Students can access
  publicAccess: boolean;    // Non-students allowed?

  // Research support
  readingRooms: number;     // Quiet spaces for study
  studyGroupRooms: number;  // Collaborative spaces

  // Librarian services
  referenceLibrarians: string[]; // Agents who help find papers
  catalogingSystem: 'basic' | 'dewey' | 'library_congress';
}
```

**Critical Functions:**
- **Journal access**: Only place to read latest research (outside journal press)
- **Research hub**: Researchers congregate here
- **Subscription costs**: Expensive! Universities pay for access
- **Comprehensive collection**: Much larger than public libraries
- **Reference services**: Librarians help navigate complex research

**Why University Libraries are CRITICAL:**
1. **Journal monopoly**: Only source of published research papers
2. **Subscription lock-in**: Expensive to maintain, hard to cancel
3. **Knowledge gatekeeping**: Non-university agents locked out
4. **Research dependency**: Researchers must affiliate with university for access
5. **Competitive advantage**: Universities with better libraries attract better researchers

**Emergent Gameplay:**
- **Access inequality**: University vs non-university knowledge gap
- **Subscription crises**: Universities cancel subscriptions (research impact)
- **Open access movement**: Push for free journal access
- **Library consortiums**: Universities share subscriptions
- **Interlibrary loan**: Libraries share resources
- **Academic prestige**: Library quality affects university ranking

### Knowledge Access Progression

**Tier 0a (Manuscripts):**
- Public libraries only
- Must travel to read
- Knowledge fragile (one copy)

**Tier 0e (Printing):**
- Bookstores enable home libraries
- Can own books
- Knowledge duplicated (safer)

**Tier 0f (Journals):**
- University libraries critical for research
- Journal subscriptions expensive
- Knowledge access inequality

**Tier 4c (Online Journals):**
- Digital access (no physical library needed)
- Instant global access
- Subscription model persists (paywalls)

**Tier 5c (Wikipedia):**
- Free knowledge access
- No library/bookstore needed
- Democratization complete

### Library System Integration

```typescript
// Agent reading behavior based on library access
function findReadingLocation(agent: Entity, paperId: string): Building | null {
  const paper = getPaper(paperId);

  // Check if agent owns the book
  if (agent.inventory.includes(paperId)) {
    return null; // Read at home
  }

  // Check public library
  const publicLibrary = findNearestLibrary(agent.position);
  if (publicLibrary?.manuscripts.includes(paperId)) {
    return publicLibrary;
  }

  // Check university library (if agent has access)
  if (agent.universityAffiliation) {
    const uniLibrary = getUniversityLibrary(agent.universityAffiliation);
    if (uniLibrary?.hasAccess(paperId)) {
      return uniLibrary;
    }
  }

  // Check bookstore (can buy it)
  const bookstore = findNearestBookstore(agent.position);
  if (bookstore?.hasInStock(paperId) && agent.money >= bookstore.getPrice(paperId)) {
    return bookstore; // Will purchase and take home
  }

  return null; // Cannot access this paper!
}
```

### System: WalkieTalkieSystem (Tier 1)
**Purpose:** Two-way radio communication
**Update Frequency:** Every tick

**Responsibilities:**
- Find agents with walkie-talkies
- Group by channel (1-8)
- Calculate signal strength with terrain penalties
- Route messages to receivers on same channel
- Drain battery based on transmission time

### System: RadioBroadcastSystem (Tier 2)
**Purpose:** One-to-many broadcasting
**Update Frequency:** Every tick

**Responsibilities:**
- Find powered radio towers
- Find agents with radios within tower range
- Match frequencies
- Stream broadcast content to listeners
- Track "now playing" on each channel

### System: CellularNetworkSystem (Tier 4a)
**Purpose:** Mobile phone network
**Update Frequency:** Every tick

**Responsibilities:**
- Build network graph from powered cell towers
- Assign phones to nearest tower
- Route calls/messages through network
- Handle voice calls, SMS, group chats
- Manage dropped calls when out of range

### System: OnlineJournalSystem (Tier 4c)
**Purpose:** Digital research publication and instant global distribution
**Update Frequency:** Every 10 ticks (near-instant publication)

**Responsibilities:**
- Manage online journal platforms (arXiv, JSTOR-equivalents)
- Accept digital paper submissions
- Publish papers to internet-accessible database
- Enable instant worldwide access to research
- Track downloads, citations, and impact metrics
- Handle open-access vs paywalled content
- Support preprint servers and peer review workflows

**Key Differences from Physical Journals (Tier 0c):**
- **Instant publication** - No printing delay
- **Global access** - Anyone with internet can read
- **Searchable** - Full-text search across all papers
- **Zero marginal cost** - No printing/distribution cost per copy
- **Version control** - Can update papers with corrections
- **Citation tracking** - Automatic reference graphs

**Component: OnlineJournalComponent**
```typescript
interface OnlineJournalComponent {
  type: 'online_journal';

  journalId: string;
  name: string;              // "arXiv", "Nature Online"
  field: ResearchField;

  // Digital publication
  publishedPapers: string[]; // All papers (instant access)
  preprintServer: boolean;   // Allow unreviewed preprints?
  openAccess: boolean;       // Free vs paywalled

  // Metrics
  totalDownloads: number;
  citationGraph: Map<string, string[]>; // Paper citations

  // Access control
  requiresSubscription: boolean;
  subscriberIds: string[];   // Agents/institutions with access
}
```

### System: SearchEngineSystem (Tier 4d)
**Purpose:** Index and search all online content
**Update Frequency:** Every 10 ticks (re-indexing), instant for queries

**Responsibilities:**
- Crawl and index all online journals, wiki articles, and websites
- Build inverted index for full-text search
- Rank search results by relevance
- Handle search queries from agents
- Update index as new content is published
- Track search metrics (popular queries, click-through rates)

**Component: SearchEngineComponent**
```typescript
interface SearchEngineComponent {
  type: 'search_engine';

  engineId: string;
  name: string;              // "AgentSearch", "VillageFindr"

  // Index
  indexedDocuments: Map<string, DocumentIndex>;
  totalDocuments: number;
  lastCrawlTick: number;
  crawlFrequency: number;    // Ticks between re-crawls

  // Query handling
  queriesPerTick: number;
  queryHistory: SearchQuery[];

  // Ranking algorithm
  rankingAlgorithm: 'basic' | 'pagerank' | 'ml_based';

  // Economics
  ownerId: string;
  revenueModel: 'free' | 'subscription' | 'advertising';
}

interface SearchQuery {
  queryId: string;
  agentId: string;
  query: string;
  results: SearchResult[];
  timestamp: number;
}

interface SearchResult {
  documentId: string;        // Paper/wiki/website ID
  relevanceScore: number;    // 0-1
  title: string;
  snippet: string;           // Preview text
}
```

**Search Algorithms:**
- **Basic**: Term frequency matching
- **PageRank**: Citation/link-based ranking
- **ML-based**: Learned relevance (requires Tier 5e)

**Emergent Gameplay:**
- Agents discover papers through search instead of browsing
- Search engines become gatekeepers to knowledge
- SEO emerges (agents optimize content for discoverability)
- Multiple search engines compete (different ranking algorithms)

### System: RecommendationSystem (Tier 4e)
**Purpose:** Suggest content based on agent preferences and behavior
**Update Frequency:** Every tick

**Responsibilities:**
- Track agent reading/viewing history
- Build user preference models
- Generate personalized recommendations
- Implement collaborative filtering (users similar to you liked...)
- Implement content-based filtering (based on what you read...)
- Update recommendations as agent behavior changes

**Component: RecommendationEngineComponent**
```typescript
interface RecommendationEngineComponent {
  type: 'recommendation_engine';

  engineId: string;
  name: string;

  // User modeling
  userProfiles: Map<string, AgentProfile>;

  // Algorithm type
  algorithm: 'collaborative_filtering' | 'content_based' | 'hybrid';

  // Item embeddings (for content-based)
  documentEmbeddings: Map<string, number[]>;

  // Performance metrics
  clickThroughRate: number;
  diversityScore: number;    // How varied are recommendations?
}

interface AgentProfile {
  agentId: string;

  // Reading history
  readPapers: string[];
  readWikiArticles: string[];
  watchedVideos: string[];

  // Inferred interests
  topicPreferences: Map<ResearchField, number>; // 0-1 interest score

  // Behavior patterns
  prefersLongForm: boolean;  // Long papers vs short articles?
  prefersRecent: boolean;    // Recent content vs classics?
  diversitySeeking: boolean; // Explores new topics?
}

interface Recommendation {
  documentId: string;
  score: number;             // 0-1 relevance
  reason: string;            // "Because you read X" or "Users like you read Y"
}
```

**Algorithms:**
```typescript
// Collaborative filtering
function collaborativeFiltering(agent: Entity): Recommendation[] {
  // Find similar users
  const similarAgents = findSimilarAgents(agent);

  // Get what they read that this agent hasn't
  const recommendations = [];
  for (const similar of similarAgents) {
    const theirReads = similar.profile.readPapers;
    const myReads = agent.profile.readPapers;
    const unread = theirReads.filter(p => !myReads.includes(p));
    recommendations.push(...unread);
  }

  return rankByPopularity(recommendations);
}

// Content-based filtering
function contentBasedFiltering(agent: Entity): Recommendation[] {
  // Get agent's favorite topics
  const interests = agent.profile.topicPreferences;

  // Find papers matching those topics
  const allPapers = getAllPapers();
  return allPapers
    .filter(p => !agent.profile.readPapers.includes(p.id))
    .map(p => ({
      documentId: p.id,
      score: cosineSimilarity(interests, p.topics)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

**Emergent Gameplay:**
- Filter bubbles form (agents only see content matching their views)
- Recommendation quality varies by agent diversity
- Popular content becomes more popular (rich-get-richer dynamics)
- Niche content hard to discover without good recommendations

### System: PersonalizationSystem (Tier 5e)
**Purpose:** ML-based content ranking and filtering for personalized feeds
**Update Frequency:** Every tick

**Responsibilities:**
- Train ML models on agent behavior
- Predict what content each agent will engage with
- Generate personalized content feeds
- A/B test different ranking algorithms
- Optimize for engagement metrics (time spent, shares, etc.)
- Handle filter bubble detection and mitigation

**Component: PersonalizationComponent**
```typescript
interface PersonalizationComponent {
  type: 'personalization';

  engineId: string;
  name: string;

  // ML model
  modelTrainingStatus: 'untrained' | 'training' | 'trained';
  modelVersion: number;
  trainingDataSize: number;  // Number of agent interactions

  // Feed generation
  feedAlgorithm: 'chronological' | 'engagement' | 'ml_ranked';

  // Optimization target
  optimizationGoal: 'time_spent' | 'shares' | 'learning' | 'diversity';

  // A/B testing
  activeExperiments: Experiment[];

  // Ethics
  filterBubbleScore: number; // 0-1, how siloed are users?
  diversityEnforcement: boolean; // Intentionally show diverse content?
}

interface Experiment {
  experimentId: string;
  variantA: FeedAlgorithm;
  variantB: FeedAlgorithm;
  usersInA: string[];
  usersInB: string[];
  metrics: {
    engagementA: number;
    engagementB: number;
    winner?: 'A' | 'B';
  };
}
```

**Advanced Features:**
- **Engagement optimization**: Predict which papers keep agents reading longest
- **Virality prediction**: Which content will be shared/cited most?
- **Diversity injection**: Intentionally show content outside filter bubble
- **Ethical controls**: Limit addictive patterns, enforce information diversity

**Emergent Gameplay:**
- Social media-like dynamics emerge
- Viral research papers spread rapidly
- Some agents become "addicted" to feeds (spend all time reading)
- Villages debate ethics of personalization (manipulation vs utility)
- Regulation emerges (laws limiting personalization?)

### System: WikipediaSystem (Tier 5c)
**Purpose:** Crowd-sourced collaborative knowledge base
**Update Frequency:** Every tick (real-time editing)

**Responsibilities:**
- Manage wiki articles (one per topic/technology/entity)
- Accept edits from any agent (with optional moderation)
- Track edit history and reverts
- Handle edit conflicts (merge or last-write-wins)
- Enable linking between articles
- Support image uploads and formatting
- Calculate article quality scores
- Track vandalism and spam detection

**Emergent Gameplay:**
- Agents can document discoveries on wiki
- Collaborative world knowledge base
- Edit wars between agents with different perspectives
- Quality varies by contributor expertise
- Can become primary knowledge source (replaces textbooks)

**Component: WikiArticleComponent**
```typescript
interface WikiArticleComponent {
  type: 'wiki_article';

  articleId: string;
  topic: string;             // "Steel Forging", "Agent #1234"
  currentVersion: string;    // Article text (markdown)

  // Edit history
  edits: WikiEdit[];         // Full history
  contributors: string[];    // Agent IDs who edited

  // Quality
  viewCount: number;
  qualityScore: number;      // 0-100, based on citations/length
  flaggedForReview: boolean; // Vandalism detection

  // Metadata
  categories: string[];
  linkedArticles: string[];  // Internal links
  lastEditTick: number;
}

interface WikiEdit {
  editorId: string;
  timestamp: number;
  previousVersion: string;
  newVersion: string;
  summary: string;           // Edit comment
  reverted: boolean;
}
```

### System: CloudComputingSystem (Tier 5d)
**Purpose:** Distributed storage and computation infrastructure
**Update Frequency:** Every tick

**Responsibilities:**
- Manage data center buildings (servers, storage)
- Enable agents to store data remotely
- Provide computational services (rendering, AI training, simulations)
- Handle data replication and backup
- Calculate storage/compute costs (pay per use)
- Track bandwidth usage
- Enable cloud-based applications

**Unlocks:**
- Remote data backup (papers/files survive local disasters)
- Computational services (agents can run complex simulations)
- Shared data storage (collaboration without physical exchange)
- Cloud gaming / remote rendering
- Distributed AI training (research benefits)

**Component: DataCenterComponent**
```typescript
interface DataCenterComponent {
  type: 'data_center';

  datacenterId: string;
  location: Position;

  // Capacity
  storageCapacityGB: number;
  computeCapacityTFLOPS: number;
  usedStorageGB: number;
  usedComputeTFLOPS: number;

  // Stored data
  storedFiles: CloudFile[];
  runningJobs: ComputeJob[];

  // Economics
  storageCostPerGB: number;  // Money per tick
  computeCostPerTFLOP: number;
  totalRevenue: number;

  // Infrastructure
  powerConsumption: number;  // Watts
  bandwidth: number;         // Mbps
  redundancy: number;        // Replication factor
}

interface CloudFile {
  fileId: string;
  ownerId: string;           // Agent who uploaded
  sizeGB: number;
  uploadedTick: number;
  accessPermissions: string[]; // Who can access
}

interface ComputeJob {
  jobId: string;
  ownerId: string;
  type: 'simulation' | 'rendering' | 'ai_training';
  tflopsRequired: number;
  estimatedTicks: number;
  progressPercent: number;
}
```

### System: MeshNetworkSystem (Tier 5b)
**Purpose:** Peer-to-peer mesh networking
**Update Frequency:** Every tick

**Responsibilities:**
- Discover mesh nodes in range
- Build routing table using AODV algorithm
- Route messages through multi-hop paths
- Handle node mobility
- Recalculate routes when topology changes

### System: LanguageModelSystem (Tier 5e)
**Purpose:** AI assistants trained on all published knowledge
**Update Frequency:** Every tick (for queries), long-running for training

**Responsibilities:**
- Train language models on all published research papers, wiki articles, books
- Provide AI assistant interface for agents
- Answer questions based on world knowledge
- Generate text, summaries, explanations
- Enable agents to query the collective knowledge without reading every paper
- Track model versions and capabilities
- Handle training compute costs (massive TFLOPS required)

**Prerequisites:**
- Cloud computing infrastructure (training requires massive compute)
- Online journals (training data source)
- Wikipedia (training data source)
- Research papers from N-of-M sets (specific papers unlock AI capabilities)

**Research Integration:**
Language models are unlocked through the research system. From the research spec, agents must publish papers in the "Language Models" research set:

```typescript
// From research system spec
const LANGUAGE_MODELS_SET: ResearchSet = {
  setId: 'language_models',
  name: 'Language Model Research',
  allPapers: [
    'perceptron_theory',           // Tier 1
    'backpropagation',             // Tier 2
    'recurrent_networks',          // Tier 2
    'lstm_networks',               // Tier 3
    'attention_mechanism',         // Tier 4
    'transformer_architecture',    // Tier 5 (key paper!)
    'pretraining_methods',         // Tier 5
    'scaling_laws'                 // Tier 5
  ],
  unlocks: [
    {
      technologyId: 'basic_neural_nets',
      papersRequired: 2,  // perceptron + one other
      grants: [{ type: 'building', buildingId: 'neural_network_lab' }]
    },
    {
      technologyId: 'advanced_language_models',
      papersRequired: 5,  // Including transformer & attention (mandatory)
      mandatoryPapers: ['transformer_architecture', 'attention_mechanism'],
      grants: [
        { type: 'building', buildingId: 'language_model_datacenter' },
        { type: 'ability', abilityId: 'train_language_models' },
        { type: 'item', itemId: 'llm_api_key' }
      ]
    }
  ]
};
```

**Component: LanguageModelComponent**
```typescript
interface LanguageModelComponent {
  type: 'language_model';

  modelId: string;
  name: string;              // "GPT-Village-1", "Claude-Agent-3"
  version: string;

  // Training
  trainingStatus: 'untrained' | 'training' | 'trained' | 'fine-tuning';
  trainingProgress: number;  // 0-100%
  trainingStartTick: number;
  estimatedCompletionTick: number;

  // Training data sources
  trainedOnPapers: string[]; // All papers included in training
  trainedOnWiki: boolean;    // Include Wikipedia?
  trainedOnBooks: boolean;   // Include published books?

  // Capabilities (based on which papers were published)
  capabilities: {
    basicQA: boolean;         // Can answer simple questions
    reasoning: boolean;       // Can reason about complex topics
    codeGeneration: boolean;  // Can write code
    researchSummary: boolean; // Can summarize papers
    multimodal: boolean;      // Can process images (requires extra papers)
  };

  // Economics
  queryCostPerToken: number; // Cost to ask questions
  trainingCostTFLOPS: number; // Compute required for training
  ownerId: string;           // Who owns/trained this model

  // Access
  public: boolean;           // Public API or private?
  apiKeyRequired: boolean;
  subscribers: string[];     // Agents with access
}

interface LLMQuery {
  queryId: string;
  agentId: string;
  modelId: string;
  prompt: string;
  response?: string;
  tokensUsed: number;
  cost: number;
  timestamp: number;
}
```

**Emergent Gameplay:**
- **Research race**: Villages compete to publish papers needed for language models
- **Knowledge monopoly**: First to train LLM has huge advantage (can query all knowledge instantly)
- **Democratization**: Public LLMs vs private (open weights vs API)
- **AI assistants**: Agents can ask LLMs instead of reading papers manually
- **Skill acceleration**: LLMs help agents learn faster (summarize complex papers)
- **Economic model**: LLM owners charge for API access

**Training Mechanics:**
```typescript
function trainLanguageModel(
  trainingData: {
    papers: string[],
    wikiArticles: string[],
    books: string[]
  },
  computeResources: DataCenterComponent
): LanguageModelComponent {
  const totalTokens = calculateTrainingTokens(trainingData);
  const requiredTFLOPS = totalTokens * TFLOPS_PER_TOKEN;
  const trainingTicks = requiredTFLOPS / computeResources.computeCapacityTFLOPS;

  return createModel({
    trainingStatus: 'training',
    estimatedCompletionTick: currentTick + trainingTicks,
    capabilities: determineCapabilities(trainingData.papers) // Based on research papers
  });
}
```

**Key Dependencies:**
- **Tier 0f**: Academic journals (training data)
- **Tier 4c**: Online journals (digital training data)
- **Tier 5c**: Wikipedia (training data)
- **Tier 5d**: Cloud computing (training infrastructure)
- **Research System**: Must publish papers in "language_models" set

**Post-LLM World:**
- Agents can query LLM instead of reading every paper
- Knowledge gap narrows (everyone can access expert knowledge)
- New profession: "Prompt engineers" who are skilled at querying LLMs
- LLM fine-tuning becomes research activity
- AI alignment becomes concern (what if LLM gives bad advice?)

### System: QuantumCommunicationSystem (Tier 6)
**Purpose:** Instant quantum entanglement communication
**Update Frequency:** Every tick

**Responsibilities:**
- Track all quantum communicators
- Validate entanglement pairs
- Route messages instantly between pairs
- Degrade entanglement over time (requires re-calibration)
- Handle device destruction

## Events

**Emits:**
- `communication:call_started` - Voice/video call initiated
- `communication:call_ended` - Call terminated
- `communication:message_sent` - Message delivered
- `communication:broadcast_started` - Radio/TV broadcast begins
- `communication:network_failure` - Infrastructure failure
- `research:paper_published` - Paper published to journal
- `research:paper_downloaded` - Paper accessed from online journal
- `wiki:article_edited` - Wiki article modified
- `cloud:file_uploaded` - File stored to cloud
- `cloud:job_completed` - Compute job finished

**Listens:**
- `power:outage` - Tower/server loses power
- `building:destroyed` - Infrastructure destroyed
- `agent:inventory_changed` - Device acquired/dropped
- `research:paper_authored` - New paper available for publication

## Integration Points

- **ResearchSystem** - Journals publish research papers, Wikipedia documents technologies
- **ManuscriptSystem** - Physical papers stored in libraries (Tier 0a)
- **AuthoringSystem** - Agents submit papers to journals
- **ReadingSystem** - Agents read papers from journals/online
- **DivineChatSystem** - Reuses chat room infrastructure for calls/messages
- **PowerGridSystem** - Towers/servers/data centers require continuous power
- **BuildingSystem** - Infrastructure construction (libraries, presses, data centers)
- **CraftingSystem** - Device crafting recipes
- **EconomySystem** - Cloud storage/compute costs, journal subscriptions

## UI Requirements

**Communication Panel:**
- Active Calls/Chats tab
- Contacts list
- Devices (switch between walkie-talkie, phone, etc.)
- Broadcasts (radio/TV listings)
- Settings (mute, DND, favorites)

**Context Menu:**
- "Call [Agent Name]" (if have phone)
- "Send Message" (if have phone)
- "Radio [Agent Name]" (if both have walkie-talkies)

## Performance Considerations

- Use quadtrees for spatial partitioning (find nearby devices)
- Cache network topology to avoid recalculation
- Limit messages per tick to prevent spam
- Event-driven updates (only process when state changes)
- Cache singleton tower/satellite entities

## Dependencies

**Phase 0 (Written Communication):**
- ResearchSystem (papers as entities)
- BuildingSystem (libraries, printing presses, journal presses)
- ItemSystem (manuscripts as items)

**Phase 1 (Walkie-Talkie):**
- CraftingSystem (create walkie-talkies)
- ItemSystem (device as item)
- AgentDecisionSystem (choose to use radio)

**Phase 2+ (Infrastructure):**
- BuildingSystem (towers, satellites, data centers)
- PowerGridSystem (continuous power)
- ResearchSystem (unlock technologies)
- EconomySystem (purchase costs, subscriptions, cloud services)
- NetworkingSystem (internet backbone)

## Technology Evolution Summary

### Knowledge Distribution Evolution

The communication tech tree traces the evolution of how agents share knowledge:

**Tier 0a - Manuscripts (Ancient/Medieval Era):**
- Single loose papers, stored in libraries
- Must travel to read
- Knowledge can be permanently lost (fire/theft)
- Very limited reach

**Tier 0b - Binder Technology (Medieval):**
- Can bind papers into volumes
- Proto-journals and proto-books
- Easier to organize and transport
- Still only original copies

**Tier 0c - Scribe Workshops (Medieval/Renaissance):**
- Manual copying by trained scribes
- Slow (500 ticks per copy)
- Expensive (scribe wages)
- Copying errors propagate
- Limited distribution (wealthy patrons only)

**Tier 0d - Printing Press Device (Renaissance):**
- Mechanical reproduction (10x faster than scribes)
- No copying errors
- Lower cost per copy
- Still manual operation (one operator per press)

**Tier 0e - Printing Company (Renaissance/Early Modern):**
- Multiple presses working in parallel
- Mass production capability
- Distribution networks
- Professional publishing industry
- Books become commodities

**Tier 0f - Academic Journals (Enlightenment):**
- Organized publication by field
- Scheduled publication cycles
- Distribution to subscriber libraries
- Standardized peer review
- Knowledge preserved across settlements

**Tier 4c - Online Journals (Information Age):**
- Instant global publication
- Zero marginal cost
- Full-text search
- Citation tracking
- No geographic barriers

**Tier 5c - Wikipedia (Collaborative Era):**
- Crowd-sourced knowledge
- Real-time updates
- Anyone can contribute
- Self-correcting through community
- Becomes primary knowledge source

**Tier 5d - Cloud Computing (Infrastructure Era):**
- Knowledge backed up globally
- Computational research services
- Distributed collaboration
- Survives local disasters

This progression mirrors real-world history:
**Ancient → Medieval → Renaissance → Enlightenment → Information Age → Collaborative Era → Infrastructure Era**

Loose manuscripts → Bound codices → Scribe copying → Printing press (device) → Printing companies → Academic journals → Online journals → Wikipedia → Cloud computing

### Communication Modes Evolution

**Tier 0**: Written (asynchronous, persistent, slow distribution)
**Tier 1**: Voice radio (synchronous, ephemeral, limited range)
**Tier 2**: Broadcast (one-to-many, scheduled, medium range)
**Tier 3**: Television (video + audio, one-to-many, wide range)
**Tier 4**: Mobile phones (personal, ubiquitous, networked)
**Tier 5**: Internet services (global, instant, collaborative)
**Tier 6**: Quantum (instant, unlimited range, Clarke-tech)

## Open Questions

**Tier 0 (Publishing):**
- [ ] Should manuscripts decay over time? (preservability mechanics)
- [ ] Can agents steal/destroy valuable manuscripts?
- [ ] Should journal prestige affect research speed/skill gains?
- [ ] Can journals reject papers? (peer review mechanics)

**Electronic Communication:**
- [ ] Should quantum devices violate no-communication theorem? (Clarke-tech handwave?)
- [ ] How to balance cost of cell phone plans?
- [ ] Should governments be able to monitor communications?
- [ ] Encryption/privacy mechanics?

**Wikipedia & Cloud:**
- [ ] Can wiki be vandalized by malicious agents?
- [ ] Should cloud data centers be hackable?
- [ ] Cost model for cloud storage/compute?
- [ ] Can agents run out of cloud storage quota?

---

**Related Specs:**
- [Knowledge-Based Research System](../research-system/knowledge-based-research.md) - Research paper system ("everything is a paper" concept)
- [TV Station Spec](tv-station.md) - Television broadcasting implementation
- [Social Media Spec](social-media.md) - Digital communication platforms
- [Divinity System](../divinity-system/spec.md) - Chat infrastructure reuse
