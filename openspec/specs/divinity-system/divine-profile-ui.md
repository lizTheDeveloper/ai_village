# Divine Profile UI - God Identity & Self-Discovery Interface

**Created:** 2026-01-04
**Status:** Draft
**Version:** 0.1.0
**Depends on:** `divinity-system/belief-and-deity-system.md`, `divinity-system/divine-player-interface.md`

---

## Overview

The Divine Profile UI is where players discover and explore their emergent god identity. Unlike traditional character sheets where you define who you are, this interface shows you **who your believers think you are**. It's a mirror reflecting back the god that has crystallized from worship, stories, and interpretation.

This is the answer to "Who am I?" as a god - but the answer comes from your followers, not from you.

---

## The Core Problem

**Current state:**
- Gods have rich emergent identities (domains, traits, names given by believers)
- The belief system tracks all of this data
- But there's **no way to view your own divine profile**
- Players can't see their god's name
- Players can't see how they're perceived
- Players can't browse their own mythology

**Design goal:**
The Divine Profile should feel like reading your own Wikipedia page written by people who worship you. Sometimes flattering, sometimes concerning, always revealing.

---

## UI Structure

### Main Profile Page

```
┌─ WHO AM I? ──────────────────────────────────────────────────────────┐
│                                                                       │
│  ╔═══════════════════════════════════════════════════════════════╗  │
│  ║                                                               ║  │
│  ║              🜃  THE UNNAMED ONE  🜃                          ║  │
│  ║                                                               ║  │
│  ║        "The silent watcher who speaks in storms"             ║  │
│  ║                                                               ║  │
│  ╚═══════════════════════════════════════════════════════════════╝  │
│                                                                       │
│  [IDENTITY] [MYTHOLOGY] [FOLLOWERS] [RELATIONS] [TIMELINE]           │
│                                                                       │
│  ┌─ YOUR NAMES ─────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  PRIMARY NAME: The Unnamed One                               │   │
│  │  ├── Used by: 87% of followers (142 believers)               │   │
│  │  └── Origin: Elder Silva, Day 12 - "The god with no name"    │   │
│  │                                                               │   │
│  │  OTHER NAMES:                                                 │   │
│  │  • Storm Bringer (23 believers)                              │   │
│  │    └── Used in: Coastal villages, fishermen                  │   │
│  │  • The Listener (8 believers)                                │   │
│  │    └── Used by: Those who had prayers answered               │   │
│  │  • Silent Judge (3 believers)                                │   │
│  │    └── Heretical sect in the North                           │   │
│  │                                                               │   │
│  │  NAME EVOLUTION:                                              │   │
│  │  Day 12: "The Unnamed One" emerged (Elder Silva)             │   │
│  │  Day 34: "Storm Bringer" coined after miracle (Fisher Cale)  │   │
│  │  Day 89: "Silent Judge" heresy began (Rebel priest Marcus)   │   │
│  │                                                               │   │
│  │                                      [View All] [Popularity]  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─ YOUR DOMAINS ───────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  STORMS ████████████████████░░ 87%                           │   │
│  │  └── You are strongly associated with storms and weather     │   │
│  │                                                               │   │
│  │  SILENCE ███████████████░░░░░░ 64%                           │   │
│  │  └── Believers see you as quiet, contemplative               │   │
│  │                                                               │   │
│  │  JUDGMENT ██████████░░░░░░░░░░ 42%                           │   │
│  │  └── Some view you as a moral arbiter                        │   │
│  │                                                               │   │
│  │  HARVEST ████░░░░░░░░░░░░░░░░░ 18%                           │   │
│  │  └── Declining - used to be higher                           │   │
│  │                                                               │   │
│  │  [View Domain History] [Stories By Domain]                   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─ YOUR PERSONALITY (AS THEY SEE YOU) ────────────────────────┐   │
│  │                                                               │   │
│  │  BENEVOLENT ████████████░░░░░░░░░░░ 58%                     │   │
│  │  WRATHFUL   ████████████████░░░░░░░ 71%                     │   │
│  │  MYSTERIOUS ████████████████████████ 93%                     │   │
│  │  JUST       ██████████░░░░░░░░░░░░░ 47%                     │   │
│  │  CAPRICIOUS ███████████████████░░░░░ 82%                     │   │
│  │                                                               │   │
│  │  ⚠ CONTRADICTIONS DETECTED:                                  │   │
│  │  You are seen as both "Benevolent" (58%) and "Wrathful"     │   │
│  │  (71%). This theological tension may lead to schisms.        │   │
│  │                                                               │   │
│  │  📖 TRAIT ORIGINS:                                            │   │
│  │  • "Wrathful" - The Storm of Day 34 (killed 3 fishermen)    │   │
│  │  • "Mysterious" - You rarely speak directly                  │   │
│  │  • "Capricious" - Answered 2 prayers, ignored 23            │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─ YOUR REPUTATION ────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  "You let children die but save crops. What kind of god     │   │
│  │   cares more about wheat than people?"                       │   │
│  │                        - Farmer Holt, Day 67                 │   │
│  │                          (Faith: 0.3, Doubting)              │   │
│  │                                                               │   │
│  │  "The Unnamed One sent me a vision when I was lost.         │   │
│  │   I would have died without them."                           │   │
│  │                        - Hunter Maya, Day 45                 │   │
│  │                          (Faith: 0.95, Devout)               │   │
│  │                                                               │   │
│  │  "Silent gods are useless gods."                             │   │
│  │                        - Rebel Priest Marcus, Day 89         │   │
│  │                          (Faith: 0.0, Heretic)               │   │
│  │                                                               │   │
│  │                           [View All Opinions] [Filter By]    │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Tab: Identity

Shows your current emergent identity as a god.

### Components

#### 1. Title & Epithet Display

```typescript
interface DivineTitle {
  // Primary name
  primaryName: string;              // "The Unnamed One"
  primaryNameUsagePercent: number;  // 87%
  primaryNameBelieverCount: number; // 142 believers

  // Name origin story
  nameOrigin: {
    believer: string;               // "Elder Silva"
    day: number;                    // 12
    context: string;                // "The god with no name"
    originalQuote?: string;         // Full quote if available
  };

  // Epithet (generated from domains/traits)
  epithet: string;                  // "The silent watcher who speaks in storms"
  epithetGeneratedFrom: string[];   // ['silence:64%', 'storms:87%']

  // Alternative names
  alternateNames: AlternateName[];
}

interface AlternateName {
  name: string;                     // "Storm Bringer"
  believerCount: number;            // 23
  usedBy: string;                   // "Coastal villages, fishermen"
  isHeretical: boolean;             // false
  schismRisk: number;               // 0-1, risk this splits into separate god
  origin: {
    believer: string;
    day: number;
    context: string;
  };
}
```

**Requirements:**

The system SHALL display:
- Primary name with usage statistics
- Name origin story with attribution
- Auto-generated epithet from domains
- All alternate names with usage context
- Warning if alternate names indicate schism risk

**Scenario: Viewing your god names**
- WHEN player opens Divine Profile → Identity tab
- THEN system displays current primary name
- AND shows percentage of believers using that name
- AND lists all alternate names with usage stats
- AND highlights heretical or schism-risk names

**Scenario: Name has not emerged yet**
- WHEN god has no name (no believers have named them)
- THEN display "The Nameless God"
- AND show tooltip: "Your followers have not named you yet. Acts of power may inspire them to give you a name."

---

#### 2. Domain Display

```typescript
interface DomainDisplay {
  domains: DomainStrength[];
  domainHistory: DomainHistoryEntry[];
  storiesByDomain: Map<string, MythEntry[]>;
}

interface DomainStrength {
  domain: string;                   // "Storms"
  strength: number;                 // 0-1 (0.87 = 87%)
  trend: "rising" | "stable" | "falling";
  changeRate: number;               // +/-% per day

  // Context
  description: string;              // "You are strongly associated with storms"
  originStories: MythEntry[];       // Stories that established this domain
  recentReinforcement?: {           // Latest action that strengthened this
    action: string;
    day: number;
    impactDelta: number;
  };
}

interface DomainHistoryEntry {
  day: number;
  domain: string;
  strength: number;
  event: string;                    // What caused the change
}
```

**Requirements:**

The system SHALL:
- Display all domains with strength bars (0-100%)
- Show trend indicators (↑ rising, → stable, ↓ falling)
- Provide context for each domain
- Link to origin stories that established the domain
- Track and display domain history over time
- Allow filtering stories by domain

**Scenario: Domain strength visualization**
- WHEN player views Identity → Domains
- THEN system displays bar chart of all domains
- AND sorts by strength (strongest first)
- AND shows trend arrow and change rate
- AND highlights domains at risk of fading (<20%)

**Scenario: Declining domain warning**
- WHEN domain falls below 30% and is still falling
- THEN display warning: "Your association with [domain] is fading. Believers rarely connect you to [domain] anymore."
- AND suggest related divine actions to reinforce

---

#### 3. Personality Traits (Perceived)

```typescript
interface PerceivedPersonality {
  traits: PersonalityTrait[];
  contradictions: Contradiction[];
  traitOrigins: TraitOriginStory[];
}

interface PersonalityTrait {
  trait: string;                    // "Benevolent", "Wrathful", etc.
  strength: number;                 // 0-1
  believerSupport: number;          // How many believers see this trait
  recentActions: string[];          // Actions that reinforce this
  counterexamples: string[];        // Actions that contradict this
}

interface Contradiction {
  trait1: string;                   // "Benevolent"
  trait1Strength: number;           // 0.58
  trait2: string;                   // "Wrathful"
  trait2Strength: number;           // 0.71
  tensionLevel: number;             // 0-1, how much this contradicts
  schismRisk: number;               // 0-1, risk of theological split
  description: string;              // Explanation of the contradiction
}

interface TraitOriginStory {
  trait: string;
  originEvent: string;              // "The Storm of Day 34"
  impact: string;                   // "killed 3 fishermen"
  day: number;
  believerQuotes: string[];         // What believers said about it
}
```

**Requirements:**

The system SHALL:
- Display perceived personality traits with strength
- Detect and warn about contradictions
- Show schism risk when contradictory traits are both high
- Explain trait origins with specific events
- Link traits to the actions that caused them

**Scenario: Contradiction warning**
- WHEN two contradictory traits both exceed 60% strength
- THEN display warning banner
- AND explain the contradiction
- AND show schism risk percentage
- AND link to the events that caused each trait

---

#### 4. Reputation Quotes

```typescript
interface ReputationDisplay {
  quotes: BelieverQuote[];
  sentimentBreakdown: SentimentStats;
  concerningQuotes: BelieverQuote[];  // Low faith, heretical, etc.
}

interface BelieverQuote {
  quote: string;
  believer: string;
  believerFaith: number;            // 0-1
  believerStatus: "devout" | "faithful" | "questioning" | "doubting" | "heretic";
  day: number;
  context: string;                  // What prompted this quote
  sentiment: "positive" | "neutral" | "negative";
  isHeretical: boolean;
}

interface SentimentStats {
  positive: number;                 // % of believers with positive view
  neutral: number;
  negative: number;
  totalQuotes: number;
}
```

**Requirements:**

The system SHALL:
- Display recent believer quotes about the god
- Show believer's faith level and status with each quote
- Highlight concerning quotes (heretical, very negative)
- Provide sentiment breakdown
- Allow filtering by sentiment, faith level, time period
- Show context for why the quote was generated

**Scenario: Viewing reputation quotes**
- WHEN player opens Identity → Reputation
- THEN system displays 10 most recent quotes
- AND shows mix of positive, neutral, negative
- AND highlights heretical quotes in red
- AND allows filtering by sentiment/faith

---

## Tab: Mythology

Shows stories told about you by believers.

### Components

#### 1. Myth Browser

```typescript
interface MythBrowser {
  myths: MythEntry[];
  mythCategories: MythCategory[];
  canonStatus: CanonTracker;
}

interface MythEntry {
  title: string;                    // "The Storm of Day 34"
  author: string;                   // Believer who created story
  day: number;
  content: string;                  // The actual story text
  category: string;                 // "miracle", "judgment", "creation", etc.

  // Spread metrics
  believersWhoKnow: number;
  believersWhoBelieve: number;
  isCanon: boolean;                 // Written in holy text?
  canonizedOn?: number;             // Day it was written down

  // Impact
  domainsReinforced: string[];      // What domains this strengthened
  traitsReinforced: string[];       // What traits this reinforced
  faithImpact: number;              // Average faith change from hearing this

  // Variations
  variations: MythVariation[];      // Different versions of the same story
}

interface MythVariation {
  version: string;                  // The variant text
  believersWhoKnow: number;
  divergencePoint: string;          // Where it differs from main version
  schismRisk: number;               // Risk this variant splits off
}

interface MythCategory {
  category: string;                 // "Miracles", "Judgments", "Origins"
  mythCount: number;
  iconicMyths: MythEntry[];         // Most influential in this category
}
```

**Requirements:**

The system SHALL:
- Display all myths told about the god
- Categorize myths (miracles, judgments, creation, etc.)
- Show spread metrics (how many know it, believe it)
- Indicate canon status (written in holy texts)
- Display myth variations and divergences
- Show impact on domains/traits
- Allow filtering and searching

**Scenario: Browsing your mythology**
- WHEN player opens Mythology tab
- THEN system displays myth categories
- AND shows iconic myths in each category
- AND indicates which are canonized
- AND displays spread metrics for each myth

**Scenario: Myth variation warning**
- WHEN myth has >3 significant variations
- AND variations have >20% total believer base
- THEN display warning: "This story is told differently in different regions. This may lead to theological divergence."
- AND show schism risk percentage

---

#### 2. Canon Tracker

```typescript
interface CanonTracker {
  holyTexts: HolyText[];
  canonizedMyths: MythEntry[];
  canonizationHistory: CanonizationEvent[];
}

interface HolyText {
  title: string;                    // "The Book of Storms"
  author: string;                   // Priest/believer who wrote it
  writtenOn: number;                // Day
  mythsIncluded: string[];          // Which myths are in this text
  believersWhoRead: number;
  influence: number;                // 0-1, how much this shapes belief
  isHeretical: boolean;
}

interface CanonizationEvent {
  myth: string;
  canonizedOn: number;
  canonizedBy: string;              // Who wrote it down
  impact: string;                   // What effect this had
}
```

**Requirements:**

The system SHALL:
- Track which myths are canonized (written in holy texts)
- Display all holy texts about the god
- Show canonization history
- Indicate influence of each holy text
- Warn about heretical texts

**Scenario: Canon formation**
- WHEN myth is written into holy text
- THEN mark myth as "canonized"
- AND track the text, author, and date
- AND show increased influence of that myth

---

## Tab: Followers

Shows your believer base and statistics.

### Components

#### 1. Follower Statistics

```typescript
interface FollowerStats {
  totalFollowers: number;
  faithDistribution: FaithTier[];
  geographicSpread: GeographicData[];
  demographicBreakdown: DemographicData;
  growthMetrics: GrowthData;
}

interface FaithTier {
  tier: "devout" | "faithful" | "questioning" | "doubting" | "lapsed";
  count: number;
  percentage: number;
  trend: "growing" | "stable" | "shrinking";
}

interface GeographicData {
  region: string;
  followerCount: number;
  averageFaith: number;
  dominantDomain: string;           // What they emphasize about you
  localName: string;                // What they call you here
}

interface DemographicData {
  byAge: Map<string, number>;       // "young", "adult", "elder"
  byOccupation: Map<string, number>;// "farmer", "fisher", "merchant"
  bySpecies: Map<string, number>;   // If multi-species world
}

interface GrowthData {
  newFollowersThisWeek: number;
  lostFollowersThisWeek: number;
  conversionRate: number;           // % of exposed agents who convert
  retentionRate: number;            // % who maintain faith over time
  projectedGrowth: number;          // Estimated followers next month
}
```

**Requirements:**

The system SHALL:
- Display total follower count
- Show faith distribution (devout → lapsed)
- Show geographic spread with local variations
- Break down demographics
- Track growth metrics and trends
- Project future growth

**Scenario: Follower overview**
- WHEN player opens Followers tab
- THEN system displays total followers
- AND shows faith tier distribution
- AND displays geographic spread map
- AND shows growth trends

---

#### 2. Notable Followers

```typescript
interface NotableFollowers {
  mostDevout: Follower[];
  mostInfluential: Follower[];      // Spread your faith effectively
  recentConverts: Follower[];
  atRisk: Follower[];               // Losing faith
  heretics: Follower[];             // Preaching against you
}

interface Follower {
  name: string;
  species: string;
  occupation: string;
  faith: number;                    // 0-1
  influence: number;                // How many they can sway
  location: string;

  // Relationship
  prayerCount: number;              // Times prayed to you
  answeredPrayers: number;
  visionsReceived: number;

  // Their view of you
  perceivedDomains: string[];       // Domains they associate with you
  perceivedTraits: string[];
  personalQuote?: string;           // What they say about you
}
```

**Requirements:**

The system SHALL:
- Highlight most devout followers
- Show most influential spreaders of faith
- List recent converts
- Warn about at-risk followers
- Flag heretics spreading dissent
- Show each follower's perception of you

**Scenario: At-risk follower warning**
- WHEN follower's faith drops below 0.3
- AND they are influential (>10 influence)
- THEN display in "At Risk" section
- AND explain why they're losing faith
- AND suggest interventions

---

## Tab: Relations

Shows your relationships with other gods.

### Components

#### 1. Pantheon Overview

```typescript
interface PantheonOverview {
  pantheonStructure: "council" | "hierarchical" | "anarchic" | "familial";
  totalGods: number;
  yourRank?: number;                // If hierarchical
  yourRole?: string;                // "Council Member", "Subordinate", etc.
}
```

**Requirements:**

The system SHALL:
- Display pantheon structure type
- Show total number of gods
- Show player's rank/role if applicable

---

#### 2. God Relationships

```typescript
interface GodRelationship {
  god: string;                      // Other god's name

  // Formal status
  formalStatus: "ally" | "neutral" | "rival" | "enemy" | "subordinate" | "superior";
  treatyStatus?: "peace" | "non-aggression" | "alliance" | "war";

  // Your feelings (player-defined or emergent)
  yourSentiment: number;            // -1 to 1 (hate to love)
  yourFeelings: string[];           // ["respect", "envy", "fear"]

  // Their feelings (AI god's view)
  theirSentiment: number;
  theirFeelings: string[];

  // Believer overlap
  sharedBelievers: number;          // Agents who worship both
  conflictingBelievers: number;     // Agents who see you as rivals

  // Domain overlap
  domainOverlap: string[];          // Domains you both claim
  domainConflicts: DomainConflict[];

  // History
  relationshipHistory: RelationshipEvent[];
}

interface DomainConflict {
  domain: string;
  yourStrength: number;
  theirStrength: number;
  believerPreference: number;       // -1 to 1, who believers favor
  tensionLevel: number;             // 0-1
}

interface RelationshipEvent {
  day: number;
  event: string;                    // "Declared alliance", "Answered rival prayer"
  sentimentChange: number;          // How it affected relationship
}
```

**Requirements:**

The system SHALL:
- Display all god relationships
- Show formal status (ally, rival, etc.)
- Show sentiment (both directions)
- Track domain conflicts
- Show believer overlap/conflicts
- Maintain relationship history

**Scenario: Viewing god relationship**
- WHEN player clicks on another god
- THEN system displays full relationship details
- AND shows sentiment from both perspectives
- AND highlights domain conflicts
- AND shows relationship history

**Scenario: Domain conflict warning**
- WHEN domain overlap >50%
- AND both gods' strength in that domain >60%
- THEN display warning: "You and [God] both claim [Domain] strongly. This may lead to theological conflict among shared believers."

---

## Tab: Timeline

Divine history - what you've done and when.

### Components

#### 1. Divine History

```typescript
interface DivineTimeline {
  events: TimelineEvent[];
  milestones: Milestone[];
  eraMarkers: Era[];
}

interface TimelineEvent {
  day: number;
  eventType: "miracle" | "vision" | "judgment" | "manifestation" | "myth_created" | "name_given" | "domain_shift" | "schism" | "alliance" | "war";
  description: string;
  impact: string;                   // What changed as a result
  beliefCost?: number;              // If spent belief
  beliefGained?: number;            // If gained belief

  // Affected entities
  affectedBelievers: string[];
  affectedDomains: string[];
  affectedTraits: string[];

  // Narrative context
  storyCreated?: string;            // Myth that resulted from this
  witnessCount: number;
}

interface Milestone {
  day: number;
  milestone: string;                // "First follower", "100 believers", etc.
  significance: string;
}

interface Era {
  name: string;                     // "The Silent Years", "Age of Storms"
  startDay: number;
  endDay?: number;                  // null if current era
  definingCharacteristic: string;   // What defined this era
}
```

**Requirements:**

The system SHALL:
- Display chronological timeline of divine actions
- Mark major milestones
- Define eras in divine history
- Show impact of each action
- Link events to resulting myths
- Allow filtering by event type

**Scenario: Viewing timeline**
- WHEN player opens Timeline tab
- THEN system displays chronological list of events
- AND groups events by era
- AND highlights milestones
- AND shows impact summaries

**Scenario: Era detection**
- WHEN god's behavior/domains shift significantly
- THEN system auto-generates new era
- AND prompts player to name it (or uses default)
- AND marks the transition point

---

## Integration with Existing Systems

### With Belief System

The Divine Profile UI reads from:
- `DeityComponent` - Core god data (name, domains, traits)
- `BeliefComponent` - Belief accumulation/decay
- `MythComponent` - Stories and mythology
- `FollowerComponent` - Believer list and faith levels

### With Divine Player Interface

The Divine Profile is accessed from:
- Main HUD "Who Am I?" button
- Divine Powers menu → "View Profile" link
- Prayer queue → "How do they see me?" link

### With Pantheon Dynamics

The Relations tab reads from:
- `PantheonComponent` - Structure and hierarchy
- `DivineRelationshipComponent` - God-to-god relationships
- Domain overlap calculations

---

## UI Behavior Requirements

### Requirement: Real-Time Updates

The Divine Profile SHALL update in real-time as:
- Believers pray and talk about you
- Your domains shift
- New myths are created
- Your name spreads or changes
- Traits evolve from actions

**Scenario: Real-time myth creation**
- WHEN player performs a miracle
- AND believers witness it
- AND story begins to spread
- THEN new myth appears in Mythology tab within seconds
- AND domain/trait impacts update immediately

---

### Requirement: First-Time Experience

For new gods with no followers:

The system SHALL:
- Display "The Nameless God" as placeholder
- Show "No followers yet" with helpful guidance
- Indicate "Your identity will emerge from worship"
- Provide tutorial hints about gaining followers

**Scenario: First follower milestone**
- WHEN god gains their first follower
- THEN display celebration notification
- AND unlock full Divine Profile interface
- AND explain: "Your identity is beginning to form. As more agents believe in you, you'll discover who you are."

---

### Requirement: Warning System

The system SHALL warn about:
- Contradictory traits causing theological tension
- Domains at risk of fading
- Schism risk from myth variations
- Domain conflicts with other gods
- At-risk influential followers

**Scenario: Schism warning**
- WHEN schism risk exceeds 40%
- THEN display prominent warning
- AND explain the contradiction causing it
- AND show which believers are affected
- AND suggest actions to reduce tension

---

## Visual Design Notes

### Color Coding

- **Gold**: Divine, sacred, high importance
- **Blue**: Calm, your domains, your identity
- **Red**: Warnings, heresy, schisms, conflicts
- **Green**: Growth, positive trends, devout believers
- **Gray**: Neutral, historical, declining metrics

### Typography

- God names: Large, serif, reverent
- Believer quotes: Italic, personal
- Stats/numbers: Mono, clean, data-focused
- Warnings: Bold, attention-grabbing

### Animations

- Domain bars fill smoothly when displayed
- New myths fade in with gentle glow
- Warning banners pulse subtly
- Timeline scrolls with parallax effect

---

## Divine Apps - Progressive Interface Unlocks

### Core Concept

Gods get **divine versions of mortal apps** when their followers first develop that technology. Before these unlocks, gods must rely on:
- Direct observation of other gods' actions
- Stories and rumors from followers
- Personal theories and beliefs about rivals
- Second-hand accounts and hearsay

This creates technological progression gates for divine UI features and information asymmetry.

---

### Divine App Unlock System

```typescript
interface DivineApp {
  appName: string;                  // "Divine Facebook", "Divine Wikipedia"
  mortalPrerequisite: string;       // "social_media", "encyclopedia"
  unlockedOn?: number;              // Day when followers invented it
  isUnlocked: boolean;

  // What this unlocks
  featuresUnlocked: DivineFeature[];
}

interface DivineFeature {
  featureName: string;              // "View Other Gods' Profiles"
  description: string;              // What this lets you do
  beforeUnlock: string;             // What you had to do before
}

// Examples
const DIVINE_APPS: DivineApp[] = [
  {
    appName: "Divine Mirror",
    mortalPrerequisite: "none",     // Always available
    featuresUnlocked: [
      {
        featureName: "Your Own Profile",
        description: "View your own divine identity, domains, and myths",
        beforeUnlock: "You had no way to see yourself"
      }
    ]
  },

  {
    appName: "Divine Wikipedia",
    mortalPrerequisite: "encyclopedia",  // When mortals make encyclopedias
    featuresUnlocked: [
      {
        featureName: "Other Gods' Basic Info",
        description: "View other gods' names, domains, and public mythology",
        beforeUnlock: "You had to piece together info from follower stories"
      },
      {
        featureName: "Historical Record",
        description: "See documented divine events in chronological order",
        beforeUnlock: "You only knew what you witnessed or heard about"
      }
    ]
  },

  {
    appName: "Divine Facebook",
    mortalPrerequisite: "social_media",  // When mortals invent social networks
    featuresUnlocked: [
      {
        featureName: "Full God Profiles",
        description: "View other gods' complete profiles, traits, relationships",
        beforeUnlock: "You formed theories based on limited observations"
      },
      {
        featureName: "Divine Friend Requests",
        description: "Formally connect with other gods",
        beforeUnlock: "Relationships were implicit and ambiguous"
      },
      {
        featureName: "What Mortals Say",
        description: "Read believer discussions comparing gods",
        beforeUnlock: "You only heard your own followers' opinions"
      }
    ]
  },

  {
    appName: "Divine Twitter",
    mortalPrerequisite: "microblogging",
    featuresUnlocked: [
      {
        featureName: "Public Divine Announcements",
        description: "Broadcast short messages to all gods",
        beforeUnlock: "Communication required visions or avatars"
      },
      {
        featureName: "Divine Trending Topics",
        description: "See what mortals are discussing about gods",
        beforeUnlock: "You had no aggregate view of mortal discourse"
      }
    ]
  },

  {
    appName: "Divine LinkedIn",
    mortalPrerequisite: "professional_networking",
    featuresUnlocked: [
      {
        featureName: "Divine Skill Endorsements",
        description: "Other gods can vouch for your domains",
        beforeUnlock: "Domain authority was purely believer-driven"
      },
      {
        featureName: "Divine Job Board",
        description: "Coordinate divine responsibilities and territories",
        beforeUnlock: "Domain conflicts emerged organically"
      }
    ]
  },

  {
    appName: "Divine Yelp",
    mortalPrerequisite: "review_platform",
    featuresUnlocked: [
      {
        featureName: "Believer Reviews of Gods",
        description: "Read aggregated believer satisfaction ratings",
        beforeUnlock: "You only heard individual prayers and complaints"
      },
      {
        featureName: "Compare Divine Services",
        description: "See how you rank vs other gods in specific domains",
        beforeUnlock: "You had no comparative metrics"
      }
    ]
  }
];
```

---

### Before Divine Facebook: Information Asymmetry

**BEFORE mortals invent social media:**

When viewing the Relations tab, instead of full god profiles, you see:

```
┌─ OTHER GODS (Limited Information) ───────────────────────────────┐
│                                                                   │
│  🔒 DIVINE FACEBOOK NOT YET UNLOCKED                             │
│  Your followers have not invented social networking yet.         │
│  You must form beliefs about other gods from observation.        │
│                                                                   │
│  ┌─ The Storm Lord ────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  📊 WHAT YOU KNOW:                                       │    │
│  │                                                          │    │
│  │  NAME: "The Storm Lord"                                 │    │
│  │  └── Heard from: 23 followers                           │    │
│  │                                                          │    │
│  │  OBSERVED ACTIONS:                                       │    │
│  │  • Day 34: Created massive storm (witnessed)            │    │
│  │  • Day 56: Answered Fisher Cale's prayer (rumor)        │    │
│  │  • Day 78: Destroyed coastal temple (follower report)   │    │
│  │                                                          │    │
│  │  FOLLOWER STORIES ABOUT THEM:                           │    │
│  │  "The Storm Lord is wrathful and demands tribute"       │    │
│  │       - Your follower Marcus, Day 45                    │    │
│  │                                                          │    │
│  │  "I heard The Storm Lord can sink entire ships"         │    │
│  │       - Your follower Elena, Day 67                     │    │
│  │                                                          │    │
│  │  YOUR THEORIES:                                          │    │
│  │  ○ Domain: Storms (probably)                            │    │
│  │  ○ Domain: Sea? (uncertain - followers disagree)        │    │
│  │  ○ Trait: Wrathful (based on stories)                  │    │
│  │  ○ Trait: Demanding? (3 followers mentioned tribute)    │    │
│  │                                                          │    │
│  │  ⚠ UNVERIFIED - These are your best guesses             │    │
│  │                                                          │    │
│  │  [Update Beliefs] [Request Divine Meeting]              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  🎯 TO UNLOCK FULL PROFILES:                                     │
│  Your followers must develop social networking technology.       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**AFTER Divine Facebook unlocks:**

```
┌─ OTHER GODS (Full Profiles via Divine Facebook) ─────────────────┐
│                                                                   │
│  ✓ DIVINE FACEBOOK UNLOCKED - Day 234                           │
│                                                                   │
│  ┌─ The Storm Lord ────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  VERIFIED PROFILE ✓                                      │    │
│  │                                                          │    │
│  │  PRIMARY NAME: The Storm Lord (92% of followers)        │    │
│  │  ALTERNATE NAMES: Tempest King, The Drowner             │    │
│  │                                                          │    │
│  │  DOMAINS:                                                │    │
│  │  Storms ████████████████████ 89%                        │    │
│  │  Sea    ███████████████░░░░░ 67%  ← You were RIGHT!     │    │
│  │  Death  ██████████░░░░░░░░░░ 45%  ← You DIDN'T KNOW    │    │
│  │                                                          │    │
│  │  TRAITS:                                                 │    │
│  │  Wrathful   ████████████████ 78%  ← You were RIGHT!     │    │
│  │  Protective ██████████░░░░░░ 51%  ← You were WRONG!     │    │
│  │  Demanding  ████████░░░░░░░░ 38%  ← Partially right     │    │
│  │                                                          │    │
│  │  RELATIONSHIP: Neutral                                   │    │
│  │  Their view of you: Wary (-0.3 sentiment)               │    │
│  │                                                          │    │
│  │  [View Full Profile] [Send Divine Message]              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  💡 BELIEF COMPARISON:                                           │
│  Your theories about The Storm Lord were 60% accurate.           │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**The reveal moment** when Divine Facebook unlocks is designed to be exciting - you finally see how accurate your theories were!

---

### Unlock Flow

```typescript
interface DivineAppUnlockEvent {
  app: DivineApp;
  unlockedOn: number;               // Game day
  triggerTech: string;              // What mortal tech triggered it

  // Celebratory unlock screen
  unlockTitle: string;              // "Divine Facebook Unlocked!"
  unlockDescription: string;        // What you can now do
  beforeAfterComparison: string;    // "Before, you... Now, you..."

  // Show player what they missed
  newInsights: Insight[];           // Things they didn't know about other gods
}

interface Insight {
  category: "god_profile" | "relationship" | "event" | "domain";
  subject: string;                  // Which god/thing
  revelation: string;               // What you just learned
  wasYourTheoryCorrect: boolean;    // Did you guess right?
}
```

**Scenario: Divine Facebook unlocks**
- WHEN follower civilization develops social networking
- THEN display dramatic unlock notification
- AND show celebratory "Divine Facebook Unlocked!" screen
- AND reveal comparison of your theories vs reality
- AND grant access to full god profiles in Relations tab

---

### Progressive Feature Table

| Mortal Tech | Divine App | Features Unlocked | Before This |
|-------------|------------|-------------------|-------------|
| None | Divine Mirror | Your own profile | You had no self-awareness |
| Writing | Divine Chronicle | Record of divine events | History was oral tradition |
| Encyclopedia | Divine Wikipedia | Other gods' basic info, historical record | You pieced together rumors |
| Social Media | Divine Facebook | Full god profiles, friend requests, mortal discussions | You formed theories from observations |
| Microblogging | Divine Twitter | Public announcements, trending topics | Communication required visions/avatars |
| Forums | Divine Reddit | Divine discussion threads, upvoting theology | No aggregate divine discourse |
| Professional Networking | Divine LinkedIn | Skill endorsements, job coordination | Domain conflicts emerged organically |
| Review Sites | Divine Yelp | Believer reviews, comparative rankings | No aggregate satisfaction metrics |
| Dating Apps | Divine Tinder | Divine romance system (😏) | Gods courted through formal meetings |
| Video Streaming | Divine YouTube | Record and share divine acts as videos | Actions only witnessed live |

---

### UI Changes for Locked Features

When a feature is locked, show:
- 🔒 Lock icon
- Clear explanation of what's locked
- What mortal tech is required
- What you can do instead (observe, theorize, etc.)
- Progress bar if followers are researching the tech

**Example locked feature UI:**

```
┌─ OTHER GODS ─────────────────────────────────────────────────────┐
│                                                                   │
│  🔒 FULL PROFILES LOCKED                                         │
│                                                                   │
│  Requires: Divine Facebook                                       │
│  Prerequisite: Mortal social networking                          │
│                                                                   │
│  Your followers are researching: Communication Tech              │
│  Progress: ████████░░░░░░░░ 42%                                 │
│  Estimated: 15 days until social media                           │
│                                                                   │
│  MEANWHILE:                                                       │
│  You can still form theories about other gods based on:          │
│  • Direct observation of their actions                           │
│  • Stories your followers tell about them                        │
│  • Rumors and second-hand accounts                               │
│                                                                   │
│  [View What You Know] [Form New Theory]                         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

### Theory Mechanics

Before unlocks, players actively form theories about other gods:

```typescript
interface GodTheory {
  targetGod: string;
  theorizedDomains: TheorizedAttribute[];
  theorizedTraits: TheorizedAttribute[];
  confidenceLevel: number;          // 0-1, based on evidence
  evidence: Evidence[];
  lastUpdated: number;
}

interface TheorizedAttribute {
  attribute: string;                // "Storms", "Wrathful"
  confidence: number;               // 0-1, how sure you are
  basedOn: string[];                // Evidence IDs
}

interface Evidence {
  id: string;
  type: "witnessed_action" | "follower_story" | "rumor" | "divine_meeting";
  content: string;
  reliability: number;              // 0-1, how trustworthy
  day: number;
  source: string;
}
```

**Scenario: Updating theory about rival god**
- WHEN player observes another god's action
- OR hears new follower story about them
- THEN add evidence to theory
- AND recalculate confidence levels
- AND suggest updated domain/trait attributions

**Scenario: Theory vs reality comparison**
- WHEN Divine Facebook unlocks
- THEN compare all player theories to actual god data
- AND display accuracy percentage
- AND highlight surprising revelations
- AND award "Divine Detective" achievement if >80% accurate

---

## Open Questions

1. **Should there be a "reject identity" mechanic?** Can the player actively fight against how they're perceived? (e.g., "No, I'm NOT the god of death!")

2. **Export mythology?** Should players be able to export their mythology as readable text/PDF?

3. **Achievement integration?** Should milestones unlock achievements?

4. **Iconography generation?** Should the system auto-generate a divine symbol based on domains/traits?

5. **Theory betting?** Should players be able to "bet" belief on their theories about other gods, earning rewards if correct?

6. **Divine app customization?** Can gods personalize their Divine Facebook profile, or is it purely emergent?

---

## Future Enhancements

### Divine Symbol Generator

Auto-generate a symbolic icon based on:
- Primary domain (storms → lightning bolt)
- Strongest trait (mysterious → veiled figure)
- Believer consensus (what they draw when depicting you)

### Prophecy Tracker

Track prophecies made about you and whether they came true.

### Theological Debate Viewer

Watch believers argue about what you represent.

### Divine Mood Board

Visual collage of images representing your domains/traits.

---

## Success Metrics

The Divine Profile UI is successful when:
- Players report "discovering myself as a god" as a core experience
- Players can answer "who am I?" based on profile data
- Players identify moments when their identity shifted
- Players feel the weight of contradictions
- Players understand schism warnings and act to prevent/allow them

---

## Related Specifications

- `divinity-system/belief-and-deity-system.md` - Core belief mechanics
- `divinity-system/divine-player-interface.md` - How player interacts as god
- `divinity-system/pantheon-dynamics.md` - God-to-god relationships
- `divinity-system/ai-god-behavior.md` - How AI gods work (for comparison)
- `ui-system/hud.md` - Where profile button lives

---

**The mirror shows you who you are. The mirror is made of belief.**
