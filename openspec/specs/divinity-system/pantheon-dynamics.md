# Pantheon Dynamics

> Divine politics, relationships, and the society of gods.

## Overview

When multiple gods exist, they form a **pantheon** - a society with its own dynamics, politics, and relationships. The player god isn't alone in the divine realm; they must navigate relationships with other deities who have their own goals, personalities, and opinions.

---

## Pantheon Structure

### Pantheon Entity

```typescript
interface Pantheon {
  id: string;
  name: string;                    // "The Greendale Pantheon"

  // ========================================
  // Membership
  // ========================================
  members: PantheonMember[];
  playerGodId: string;             // The player is always a member

  // ========================================
  // Governance
  // ========================================
  structure: PantheonStructure;
  hierarchy?: DivineHierarchy;
  councils?: DivineCouncil[];

  // ========================================
  // Shared Resources
  // ========================================
  sharedSacredSites?: string[];    // Sites claimed by pantheon as whole
  sharedMythology: SharedMyth[];   // Stories about multiple gods
  collectiveBelief?: number;       // Belief in "the gods" generally

  // ========================================
  // Politics
  // ========================================
  factions?: DivineFaction[];
  activeConflicts: DivineConflict[];
  treaties: DivineTreaty[];

  // ========================================
  // External Relations
  // ========================================
  rivalPantheons?: string[];       // Other pantheons in conflict
  syncretismTargets?: string[];    // Pantheons merging with this one
}

interface PantheonMember {
  deityId: string;
  joinedAt: number;                // When they crystallized/joined
  role: PantheonRole;
  standing: number;                // 0-1, reputation within pantheon
  votingPower?: number;            // For council structures
}

type PantheonStructure =
  | 'anarchic'        // No formal structure, gods do as they please
  | 'council'         // Democratic-ish, gods vote on matters
  | 'hierarchical'    // Strict ranking, orders flow down
  | 'familial'        // Gods relate as family (parents, siblings, children)
  | 'dualistic'       // Two opposed forces (order/chaos, light/dark)
  | 'henotheistic'    // One supreme god, others serve
  | 'monolatric';     // One god per worshipper group, loose association

type PantheonRole =
  | 'chief'           // Leader of the pantheon
  | 'elder'           // Senior member with influence
  | 'member'          // Standard member
  | 'newcomer'        // Recently emerged/joined
  | 'outcast'         // Formally expelled but still exists
  | 'aspirant';       // Trying to join, not yet accepted
```

### Divine Hierarchy

For hierarchical pantheons:

```typescript
interface DivineHierarchy {
  type: 'single_chief' | 'triumvirate' | 'council_of_elders' | 'custom';

  tiers: HierarchyTier[];

  // How is rank determined?
  rankingBasis: 'belief' | 'age' | 'power' | 'domain' | 'votes' | 'combat';

  // Can rank change?
  mutable: boolean;
  challengeAllowed: boolean;
}

interface HierarchyTier {
  name: string;                    // "The High Ones", "Lesser Gods"
  rank: number;                    // 1 = highest
  members: string[];               // Deity IDs
  privileges: string[];            // What this rank can do
  responsibilities: string[];      // What this rank must do
}
```

---

## Divine Relationships

### Relationship Model

Every pair of gods has a relationship state:

```typescript
interface DivineRelationship {
  // Who
  deityA: string;
  deityB: string;

  // ========================================
  // Core Sentiment
  // ========================================
  sentiment: RelationshipSentiment;
  sentimentStrength: number;       // 0-1, how strong the feeling

  // ========================================
  // Specific Feelings (both directions)
  // ========================================
  aTowardsB: RelationshipFeelings;
  bTowardsA: RelationshipFeelings;

  // ========================================
  // Formal Status
  // ========================================
  formalStatus: FormalDivineStatus;
  treaties?: DivineTreaty[];

  // ========================================
  // History
  // ========================================
  relationshipAge: number;         // How long they've known each other
  significantEvents: DivineEvent[];
  sharedMyths: string[];           // Myths featuring both
  grievances: Grievance[];
  debts: DivineDebt[];

  // ========================================
  // Dynamics
  // ========================================
  volatility: number;              // 0-1, how quickly this changes
  trajectory: 'improving' | 'stable' | 'deteriorating';
}

type RelationshipSentiment =
  | 'devoted'         // Deep love/loyalty
  | 'allied'          // Strong positive bond
  | 'friendly'        // Positive, casual
  | 'cordial'         // Polite but distant
  | 'neutral'         // No strong feelings
  | 'cool'            // Slight tension
  | 'rivalrous'       // Active competition
  | 'hostile'         // Open enmity
  | 'nemesis';        // Sworn eternal enemies

interface RelationshipFeelings {
  respect: number;       // -1 (contempt) to 1 (deep respect)
  affection: number;     // -1 (hatred) to 1 (love)
  trust: number;         // 0 (none) to 1 (absolute)
  fear: number;          // 0 (none) to 1 (terrified)
  envy: number;          // 0 (none) to 1 (consumed by)
  gratitude: number;     // -1 (resentment) to 1 (deeply grateful)
  interest: number;      // 0 (indifferent) to 1 (fascinated)
}

type FormalDivineStatus =
  | 'married'           // Divine marriage (common in pantheons)
  | 'blood_bound'       // Sworn siblings/family
  | 'allied'            // Formal alliance
  | 'non_aggression'    // Treaty to not fight
  | 'neutral'           // No formal status
  | 'competition'       // Acknowledged rivalry
  | 'at_war'            // Active divine conflict
  | 'vassal'            // One serves the other
  | 'patron';           // Mentorship relationship
```

### Relationship Formation

How relationships develop:

```typescript
interface RelationshipTrigger {
  triggerType: RelationshipTriggerType;
  magnitude: number;               // How much it affects relationship
  affectedFeelings: string[];      // Which feelings change
}

type RelationshipTriggerType =
  // Positive triggers
  | 'helped_believers'       // God A helped God B's followers
  | 'shared_enemy'           // United against common foe
  | 'gift_given'             // One god gave something to other
  | 'compliment'             // Praise in mortal stories
  | 'cooperation'            // Worked together on something
  | 'defended'               // Stood up for other god
  | 'shared_celebration'     // Joint festival/worship

  // Negative triggers
  | 'believer_poaching'      // Stole worshippers
  | 'domain_encroachment'    // Claimed overlapping domain
  | 'insult'                 // Disrespected in stories
  | 'betrayal'               // Broke trust/promise
  | 'attacked_believers'     // Harmed other's followers
  | 'sacred_site_violated'   // Desecrated holy place
  | 'angel_conflict'         // Their angels fought

  // Neutral/complex triggers
  | 'domain_overlap'         // Natural tension from similar domains
  | 'theological_dispute'    // Believers argue about who's right
  | 'mortal_conflict'        // Their followers are at war
  | 'third_party'            // Opinions about another god differ
  | 'emergence'              // New god just crystallized
  | 'schism'                 // One split from the other's faith
```

---

## Player-God Relationships

### Relationship Interface

The player can view and manage relationships with other gods:

```
╔══════════════════════════════════════════════════════════════╗
║                    DIVINE RELATIONS                           ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  YOUR STANDING IN THE PANTHEON: Elder (rank 2/4)             ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  THE STORM CALLER                                             ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Sentiment: RIVALROUS                                   │  ║
║  │                                                        │  ║
║  │ They feel toward you:                                  │  ║
║  │   Respect    [████████░░] Grudging                     │  ║
║  │   Affection  [██░░░░░░░░] Cold                         │  ║
║  │   Trust      [███░░░░░░░] Suspicious                   │  ║
║  │   Fear       [████░░░░░░] Wary                         │  ║
║  │   Envy       [███████░░░] Significant                  │  ║
║  │                                                        │  ║
║  │ You feel toward them:                                  │  ║
║  │   Respect    [██████░░░░] Moderate                     │  ║
║  │   Affection  [███░░░░░░░] Low                          │  ║
║  │   Trust      [██░░░░░░░░] Very Low                     │  ║
║  │   Interest   [████████░░] High                         │  ║
║  │                                                        │  ║
║  │ Recent events:                                         │  ║
║  │ • They claimed credit for your healing miracle (-5)    │  ║
║  │ • You both appeared in "The Great Storm" myth (+2)     │  ║
║  │ • Their angel intimidated your believers (-8)          │  ║
║  │                                                        │  ║
║  │ Trajectory: DETERIORATING                              │  ║
║  │                                                        │  ║
║  │ [Propose Alliance] [Send Gift] [Arrange Meeting]       │  ║
║  │ [Demand Apology] [Declare Rivalry] [Declare War]       │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  THE ANCESTOR                                                 ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ Sentiment: CORDIAL                                     │  ║
║  │ Formal Status: NON-AGGRESSION                          │  ║
║  │                                                        │  ║
║  │ "An old soul. Means well. Not a threat."               │  ║
║  │                                                        │  ║
║  │ [View Details] [Open Diplomacy]                        │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Diplomatic Actions

What the player can do with other gods:

```typescript
type DiplomaticAction =
  // Positive gestures
  | 'send_gift'              // Give belief/artifact/sacred site
  | 'propose_alliance'       // Formal alliance offer
  | 'offer_non_aggression'   // Promise not to fight
  | 'share_believers'        // Allow overlapping worship
  | 'joint_miracle'          // Cooperate on divine act
  | 'public_praise'          // Say nice things via visions
  | 'defend_reputation'      // Counter negative stories about them
  | 'lend_angel'             // Send angel to help them
  | 'grant_domain_access'    // Allow them to act in your domain

  // Neutral interactions
  | 'request_meeting'        // Divine parley
  | 'propose_treaty'         // Formal agreement
  | 'exchange_information'   // Share knowledge
  | 'mediate_dispute'        // Help resolve conflict with third party
  | 'joint_festival'         // Shared worship event

  // Negative actions
  | 'demand_apology'         // Require them to make amends
  | 'withdraw_cooperation'   // End positive arrangements
  | 'declare_rivalry'        // Formal competition announcement
  | 'denounce'               // Public criticism via visions
  | 'poach_believers'        // Actively convert their followers
  | 'declare_war'            // Open divine conflict
  | 'curse_believers'        // Harm their followers
  | 'desecrate_site'         // Attack their sacred places
  | 'challenge'              // Direct divine confrontation

interface DiplomaticActionResult {
  action: DiplomaticAction;
  target: string;                  // Deity ID

  // Costs
  beliefCost: number;
  reputationCost?: number;         // Pantheon standing

  // Effects
  relationshipChange: number;
  theirResponse: DiplomaticResponse;
  pantheonReaction?: PantheonReaction;
  mortalAwareness: number;         // Do believers know?

  // Narrative
  storiesGenerated: string[];
  traitImplications: TraitImplication[];
}

type DiplomaticResponse =
  | 'accepted'               // They agreed
  | 'rejected'               // They refused
  | 'counter_offer'          // They propose different terms
  | 'ignored'                // No response
  | 'escalated'              // They responded more aggressively
  | 'de_escalated'           // They responded more peacefully
  | 'deferred';              // They'll think about it
```

### Divine Meetings

Gods can meet directly to negotiate:

```typescript
interface DivineMeeting {
  id: string;

  // Participants
  participants: string[];          // Deity IDs
  initiator: string;

  // Setting
  location: MeetingLocation;
  format: MeetingFormat;

  // Agenda
  topics: MeetingTopic[];
  currentTopicIndex: number;

  // State
  atmosphere: 'friendly' | 'tense' | 'hostile' | 'formal';
  breakthroughPossible: boolean;
  deadlockRisk: number;

  // For player
  playerOptions: PlayerMeetingOption[];
}

type MeetingLocation =
  | 'neutral_ground'         // Neither god's territory
  | 'your_sacred_site'       // Your temple
  | 'their_sacred_site'      // Their temple
  | 'divine_realm'           // Abstract god-space
  | 'mortal_witness';        // In front of believers

type MeetingFormat =
  | 'private'                // Just the two gods
  | 'with_angels'            // Each brings representatives
  | 'public'                 // Believers can perceive
  | 'council_session';       // Part of pantheon governance

interface MeetingTopic {
  subject: string;
  proposedBy: string;
  yourPosition?: string;
  theirPosition?: string;
  resolved: boolean;
  resolution?: string;
}

interface PlayerMeetingOption {
  action: string;
  tone: 'aggressive' | 'assertive' | 'neutral' | 'conciliatory' | 'submissive';
  likelyResponse: string;
  relationshipImpact: number;
  traitImplications: TraitImplication[];
}
```

### Meeting Interface

```
╔══════════════════════════════════════════════════════════════╗
║               DIVINE PARLEY - THE STORM CALLER                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Location: Neutral Ground (the high mountain)                 ║
║  Atmosphere: TENSE                                            ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  THE STORM CALLER speaks:                                     ║
║                                                               ║
║  "You healed that child. The one my storm struck. Did you    ║
║   think I wouldn't notice? Did you think to make me look     ║
║   weak before the mortals?"                                   ║
║                                                               ║
║  Your options:                                                ║
║                                                               ║
║  [A] "I healed a dying child. I didn't think about you       ║
║       at all."                                                ║
║       → Assertive. May anger them. Reinforces independence.  ║
║                                                               ║
║  [B] "The child was mine to protect. You overstepped."       ║
║       → Aggressive. Escalates conflict. Claims territory.    ║
║                                                               ║
║  [C] "I meant no disrespect. Perhaps we should discuss       ║
║       boundaries."                                            ║
║       → Conciliatory. Opens negotiation. Shows willingness.  ║
║                                                               ║
║  [D] "Your storm served a purpose. My healing served         ║
║       another. We are not in competition."                    ║
║       → Neutral. Reframes situation. Invites cooperation.    ║
║                                                               ║
║  [E] Remain silent. Let them continue.                       ║
║       → Mysterious. Gives away nothing. May frustrate them.  ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  Topics to discuss:                                           ║
║  ☐ The healing incident                                       ║
║  ☐ Domain boundaries (who controls weather vs nature?)        ║
║  ☐ Their angel's intimidation of your believers               ║
║  ☐ Possibility of non-aggression pact                        ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Divine Politics

### Factions

Gods can form factions within a pantheon:

```typescript
interface DivineFaction {
  id: string;
  name: string;

  // Membership
  leader?: string;                 // Deity ID
  members: string[];
  philosophy: string;              // What unites them

  // Goals
  sharedGoals: FactionGoal[];

  // Power
  combinedBelief: number;
  votingBlock: number;             // For council pantheons

  // Relations
  rivalFactions: string[];
  alliedFactions: string[];
}

interface FactionGoal =
  | { type: 'elevate_member'; target: string; toRank: string }
  | { type: 'demote_member'; target: string }
  | { type: 'expel_member'; target: string }
  | { type: 'change_structure'; newStructure: PantheonStructure }
  | { type: 'declare_war'; target: string }  // Against another faction or pantheon
  | { type: 'acquire_territory'; target: string }
  | { type: 'establish_doctrine'; doctrine: string }
  | { type: 'protect_domain'; domain: DivineDomain };
```

### Voting and Councils

For council-structured pantheons:

```typescript
interface DivineCouncil {
  name: string;
  purpose: string;

  // Membership
  seats: CouncilSeat[];
  quorum: number;                  // Minimum to hold session

  // Voting rules
  votingSystem: 'majority' | 'supermajority' | 'unanimous' | 'weighted';
  vetoHolders?: string[];          // Who can veto

  // Sessions
  meetingFrequency: string;
  currentSession?: CouncilSession;
  pastSessions: CouncilSession[];
}

interface CouncilSeat {
  holder: string;                  // Deity ID
  seatType: 'permanent' | 'rotating' | 'elected';
  votingWeight: number;
  specialPowers?: string[];
}

interface CouncilSession {
  id: string;
  calledBy: string;
  attendees: string[];

  motions: CouncilMotion[];
  currentMotion?: number;

  atmosphere: 'cooperative' | 'contentious' | 'deadlocked';
}

interface CouncilMotion {
  id: string;
  proposedBy: string;
  secondedBy?: string;

  type: MotionType;
  description: string;
  target?: string;

  votesFor: string[];
  votesAgainst: string[];
  abstentions: string[];

  status: 'proposed' | 'debating' | 'voting' | 'passed' | 'failed' | 'vetoed';
}

type MotionType =
  | 'admit_member'           // Let a new god join
  | 'expel_member'           // Kick a god out
  | 'declare_war'            // Pantheon-level conflict
  | 'make_peace'             // End pantheon-level conflict
  | 'establish_law'          // Create pantheon rule
  | 'repeal_law'             // Remove pantheon rule
  | 'redistribute_domains'   // Reallocate domain claims
  | 'censure'                // Formal disapproval
  | 'commend'                // Formal praise
  | 'elect_leader'           // Choose pantheon chief
  | 'emergency_action';      // Urgent matter
```

### Council Interface

```
╔══════════════════════════════════════════════════════════════╗
║            COUNCIL OF THE GREENDALE PANTHEON                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SESSION 47 - Called by: The Ancestor                         ║
║  Attendees: 4/5 (The River Spirit absent)                     ║
║  Atmosphere: CONTENTIOUS                                      ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  CURRENT MOTION:                                              ║
║  "Censure The Storm Caller for intimidating believers of      ║
║   The Watcher in Green"                                       ║
║                                                               ║
║  Proposed by: You                                             ║
║  Seconded by: The Ancestor                                    ║
║                                                               ║
║  DEBATE:                                                      ║
║                                                               ║
║  THE STORM CALLER: "My angel did nothing wrong. The mortals   ║
║  were speaking ill of storms. I have the right to defend      ║
║  my nature."                                                  ║
║                                                               ║
║  THE ANCESTOR: "There are ways to defend one's nature that    ║
║  do not involve terrorizing the faithful of another god."     ║
║                                                               ║
║  Your speaking time:                                          ║
║  ┌──────────────────────────────────────────────────────────┐║
║  │ [A] Press the attack: "This is a pattern of aggression"  │║
║  │ [B] Seek compromise: "Perhaps we can agree on rules"     │║
║  │ [C] Threaten consequences: "If this continues..."        │║
║  │ [D] Withdraw motion: "Perhaps I was hasty"               │║
║  │ [E] Call for vote now                                    │║
║  └──────────────────────────────────────────────────────────┘║
║                                                               ║
║  CURRENT VOTE FORECAST:                                       ║
║  For: You, The Ancestor (2)                                   ║
║  Against: The Storm Caller (1)                                ║
║  Undecided: The River Spirit (absent) (1)                     ║
║                                                               ║
║  Passes with: SIMPLE MAJORITY (3 of 5)                        ║
║  Status: LIKELY TO PASS if River Spirit abstains              ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Treaties and Agreements

### Treaty Types

```typescript
interface DivineTreaty {
  id: string;
  name: string;

  // Parties
  parties: string[];               // Deity IDs
  guarantors?: string[];           // Gods who enforce it

  // Terms
  type: TreatyType;
  terms: TreatyTerm[];
  duration: 'permanent' | 'temporary' | 'conditional';
  expiresAt?: number;
  expirationCondition?: string;

  // Status
  status: 'proposed' | 'active' | 'violated' | 'expired' | 'dissolved';
  signedAt?: number;
  violatedBy?: string;
  violationDetails?: string;

  // Enforcement
  violationConsequences: string[];
  enforcementMechanism: 'honor' | 'pantheon' | 'divine_oath' | 'none';
}

type TreatyType =
  | 'non_aggression'         // Won't fight each other
  | 'alliance'               // Will help each other
  | 'mutual_defense'         // Will defend if attacked
  | 'domain_agreement'       // Divides spheres of influence
  | 'believer_sharing'       // Allows overlapping worship
  | 'trade'                  // Exchange believers/sites/angels
  | 'vassalage'              // One serves the other
  | 'marriage';              // Divine union

interface TreatyTerm {
  description: string;
  obligatedParty: string | 'all';
  type: 'must_do' | 'must_not_do' | 'may_do';
  specifics: string;
  verifiable: boolean;
}
```

### Treaty Proposal Interface

```
╔══════════════════════════════════════════════════════════════╗
║                   PROPOSE TREATY                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  With: The Storm Caller                                       ║
║  Treaty Type: DOMAIN AGREEMENT                                ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  PROPOSED TERMS:                                              ║
║                                                               ║
║  You will:                                                    ║
║  ☑ Not claim Weather as a domain                             ║
║  ☑ Not interfere with storms except to protect believers     ║
║  ☐ Allow Storm Caller angels in your territory               ║
║  ☐ Share 10% of nature-related belief                        ║
║                                                               ║
║  They will:                                                   ║
║  ☑ Not harm your believers with storms                       ║
║  ☑ Warn before major storms in your territory                ║
║  ☐ Support you in council votes                              ║
║  ☐ Cease angel intimidation                                  ║
║                                                               ║
║  Duration: PERMANENT                                          ║
║  Enforcement: PANTHEON (violations judged by council)         ║
║                                                               ║
║  ANALYSIS:                                                    ║
║  ├── Your sacrifice: Moderate (Weather wasn't your focus)    ║
║  ├── Their sacrifice: Significant (restricts aggression)     ║
║  ├── Likely acceptance: 45%                                  ║
║  └── Relationship impact if accepted: +25                    ║
║                                                               ║
║           [Propose as-is] [Modify Terms] [Cancel]            ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Divine Relationships: Special Types

### Divine Marriage

Gods can marry, creating special bonds:

```typescript
interface DivineMarriage {
  id: string;
  spouses: [string, string];       // Deity IDs

  // Bond
  bondType: 'love' | 'political' | 'domain_merger' | 'ancient';
  bondStrength: number;            // 0-1

  // Benefits
  sharedBelief: boolean;           // Pool belief together?
  sharedDomains: boolean;          // Access each other's domains?
  combinedPower: boolean;          // Bonuses when acting together?

  // Children
  divineChildren?: string[];       // Gods they've created together

  // Status
  status: 'happy' | 'strained' | 'separated' | 'ended';

  // Narrative
  marriageMyth: string;            // Story of their union
  mortalPerception: string;        // How believers see them
}
```

### Mentor/Protege

Older gods can mentor newer ones:

```typescript
interface DivineMentorship {
  mentor: string;
  protege: string;

  // What's being taught
  focus: 'domain_mastery' | 'divine_politics' | 'mortal_relations' | 'combat';

  // Benefits to protege
  learningBonus: number;
  protectionGuarantee: boolean;

  // Costs to mentor
  beliefInvestment: number;
  reputationStake: boolean;        // Protege's failures reflect on mentor

  // Relationship
  currentStatus: 'active' | 'graduated' | 'estranged' | 'betrayed';
}
```

### Divine Parentage

Gods can have family relationships:

```typescript
interface DivineFamilyTree {
  // A god's family
  parents?: string[];              // Deity IDs (0-2 usually)
  siblings?: string[];
  children?: string[];
  spouse?: string;

  // Creation type
  birthType: DivineOriginType;
}

type DivineOriginType =
  | 'mortal_elevation'       // Was a mortal, became god
  | 'divine_birth'           // Born from two gods
  | 'spontaneous'            // Emerged from belief
  | 'split'                  // Divided from another god
  | 'merged'                 // Multiple gods combined
  | 'player';                // The player god (unique origin)
```

---

## Conflict Resolution

### Divine Conflict Mechanics

When gods fight:

```typescript
interface DivineConflict {
  id: string;
  participants: ConflictParticipant[];

  // Cause
  causeBelli: string;
  originalGrievance: string;

  // Scope
  scope: 'personal' | 'faction' | 'pantheon' | 'cosmic';

  // Battlegrounds
  contestedBelievers: string[];
  contestedSites: string[];
  contestedDomains: DivineDomain[];

  // Progress
  phase: ConflictPhase;
  advantage: string;               // Who's winning
  casualties: ConflictCasualty[];

  // Resolution
  resolutionPath?: ResolutionPath;
  endConditions: EndCondition[];
}

interface ConflictParticipant {
  deityId: string;
  role: 'aggressor' | 'defender' | 'ally' | 'neutral_party';
  commitment: number;              // 0-1, how much they're investing
  objectives: string[];
}

type ConflictPhase =
  | 'tension'            // Building toward conflict
  | 'skirmishes'         // Minor clashes, angels fighting
  | 'open_war'           // Full divine conflict
  | 'total_war'          // Existential threat to one party
  | 'negotiation'        // Trying to end it
  | 'cold_peace'         // Stopped fighting, not resolved
  | 'resolution';        // Actually ended

interface ConflictCasualty {
  type: 'angel_destroyed' | 'sacred_site_lost' | 'believers_lost' | 'domain_diminished' | 'avatar_defeated';
  sufferedBy: string;
  description: string;
}

type ResolutionPath =
  | 'victory'            // One side wins decisively
  | 'surrender'          // One side gives up
  | 'treaty'             // Negotiated settlement
  | 'exhaustion'         // Both sides too weak to continue
  | 'mediation'          // Third party brokers peace
  | 'merger'             // Gods combine
  | 'destruction';       // One god is destroyed
```

### War Powers

During divine conflict, special actions become available:

```typescript
type WarAction =
  | 'direct_assault'           // Attack the other god directly (avatar vs avatar)
  | 'angel_warfare'            // Send angels to fight their angels
  | 'miracle_barrage'          // Rapid miracles to impress believers
  | 'propaganda'               // Send visions undermining them
  | 'sacred_site_raid'         // Attack their temples
  | 'believer_terror'          // Frighten their followers
  | 'domain_contest'           // Challenge their control of a domain
  | 'coalition_building'       // Recruit allies
  | 'economic_warfare'         // Drain their belief indirectly
  | 'divine_duel';             // Challenge to single combat
```

---

## Pantheon Events

### Event Types

```typescript
type PantheonEvent =
  | 'new_god_emergence'        // A god crystallizes
  | 'god_fading'               // A god is dying
  | 'god_destruction'          // A god is destroyed
  | 'challenge_for_rank'       // Power struggle
  | 'schism'                   // Faction splits off
  | 'merger'                   // Gods or pantheons combine
  | 'divine_wedding'           // Marriage
  | 'divine_birth'             // New god born from two
  | 'treaty_signed'            // Formal agreement
  | 'treaty_broken'            // Violation
  | 'war_declared'             // Conflict begins
  | 'peace_made'               // Conflict ends
  | 'council_decision'         // Major vote
  | 'domain_shift'             // Domain claims change
  | 'external_threat'          // Something threatens all gods
  | 'golden_age'               // Pantheon is thriving
  | 'twilight';                // Pantheon is declining
```

### Event Notifications

```
╔══════════════════════════════════════════════════════════════╗
║                    DIVINE EVENT                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ⚡ A NEW GOD RISES                                          ║
║                                                               ║
║  From the fears of the fishing village, a new deity has      ║
║  crystallized. The mortals call it "The Depth" - a god of    ║
║  the dark waters and the things that lurk beneath.           ║
║                                                               ║
║  Domains: Water, Fear, Death                                  ║
║  Believers: 12                                                ║
║  Disposition: UNKNOWN                                         ║
║                                                               ║
║  The Storm Caller seems interested.                          ║
║  The Ancestor seems wary.                                     ║
║                                                               ║
║  This new god may:                                           ║
║  • Become a rival for water-related worship                  ║
║  • Ally with fear-based gods like Storm Caller               ║
║  • Threaten the fishing village you've been cultivating      ║
║                                                               ║
║  Your options:                                                ║
║  [Welcome to Pantheon] [Observe First] [Assert Dominance]    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## AI God Relationship Behavior

### How AI Gods Decide on Relationships

```typescript
interface AIRelationshipDecision {
  // Situation
  otherGod: string;
  currentRelationship: DivineRelationship;
  recentEvents: DivineEvent[];

  // AI's evaluation
  threatAssessment: number;        // 0-1, how threatening is this god?
  opportunityAssessment: number;   // 0-1, potential for gain?
  valueAlignment: number;          // 0-1, do their goals align?

  // Weighted by personality
  personalityFactors: {
    aggressiveness: number;        // More likely to choose conflict
    cooperativeness: number;       // More likely to choose alliance
    cautiousness: number;          // More likely to wait and see
    ambition: number;              // More likely to seek advantage
  };

  // Decision
  chosenAction: DiplomaticAction;
  reasoning: string;
}
```

### AI Relationship Prompt

```
You are {deity_name} considering your relationship with {other_deity}.

YOUR PERSONALITY:
{personality_traits}

YOUR GOALS:
{current_goals}

YOUR CURRENT RELATIONSHIP:
Sentiment: {sentiment}
Recent events: {recent_events}
Their feelings toward you: {their_feelings}
Your feelings toward them: {your_feelings}

CONTEXT:
- Pantheon structure: {structure}
- Your rank: {your_rank}, Their rank: {their_rank}
- Shared domains: {overlapping_domains}
- Conflicting interests: {conflicts}
- Aligned interests: {alignments}

QUESTION:
What diplomatic action do you take toward {other_deity}?

Consider:
1. Do they threaten your believers or domains?
2. Could they be a useful ally?
3. What does the pantheon expect?
4. What serves your goals best?

RESPOND WITH:
ACTION: [diplomatic action]
TARGET_SENTIMENT: [what relationship you want]
REASONING: [why, from your perspective]
WILLINGNESS_TO_NEGOTIATE: [how flexible are you?]
```

---

## Summary: Relationship Mechanics

### Quick Reference

**Sentiment Spectrum:**
```
Nemesis → Hostile → Rivalrous → Cool → Neutral → Cordial → Friendly → Allied → Devoted
```

**Formal Status Options:**
```
At War → Competition → Neutral → Non-Aggression → Allied → Blood Bound → Married
```

**Ways to Improve Relationships:**
- Send gifts (belief, artifacts, sacred sites)
- Help their believers
- Support them in council
- Propose treaties
- Public praise
- Joint miracles

**Ways to Damage Relationships:**
- Poach believers
- Encroach on domains
- Insult them (via stories)
- Oppose them in council
- Break treaties
- Harm their believers
- Attack their sacred sites

**Relationship Impacts:**
- Allied gods share information, may help in conflicts
- Neutral gods won't interfere
- Rival gods actively compete but follow rules
- Hostile gods will act against you when possible
- Nemesis status means existential conflict

---

## The Divine Chat

### Overview

Once the first emergent god crystallizes, a new interface unlocks: **The Divine Chat**. This is a chatroom where all the gods—player and AI-controlled—can communicate directly.

The player starts alone. When the first other god emerges from collective belief, you receive:

```
╔══════════════════════════════════════════════════════════════╗
║                    NEW FEATURE UNLOCKED                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌟 THE DIVINE CHAT                                          ║
║                                                               ║
║  You are no longer alone.                                     ║
║                                                               ║
║  A new god has emerged from mortal belief. For the first     ║
║  time, there is another being who exists as you do—beyond    ║
║  mortal, sustained by faith, aware of the truth of things.   ║
║                                                               ║
║  You may now speak with them directly.                        ║
║                                                               ║
║  [Enter the Divine Chat]                                     ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Chat Interface

```
╔══════════════════════════════════════════════════════════════╗
║                    THE DIVINE CHAT                            ║
║                 "Where Gods Speak as Equals"                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ─────────── The Storm Caller has entered the chat ──────────║
║                                                               ║
║  THE STORM CALLER:                                            ║
║  So. There is another. I felt you before I had form. Your    ║
║  believers spoke of you in the same breath as they feared    ║
║  my winds. I suppose we must... coexist.                     ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  YOU (The Watcher in Green):                                  ║
║  Welcome to existence. It's strange, isn't it? To be         ║
║  defined by what they think of you.                           ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  THE STORM CALLER:                                            ║
║  Strange? I AM what they think of me. Their fear made me     ║
║  strong. Their prayers for mercy taught me I could be...     ║
║  something else. Maybe. I don't know yet.                     ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  ──────────── The Ancestor has entered the chat ─────────────║
║                                                               ║
║  THE ANCESTOR:                                                ║
║  Ah. A gathering of the divine. I remember when I was the    ║
║  only one they prayed to - back when I was still mortal.     ║
║  Times change. People need more gods for a bigger world.     ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  [Type your message...]                                       ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║  Gods present: You, The Storm Caller, The Ancestor           ║
║  Next responses in: 0:47                                      ║
╚══════════════════════════════════════════════════════════════╝
```

### Chat Mechanics

```typescript
interface DivineChat {
  // Who's in the chat
  participants: DivineChatParticipant[];
  playerGodId: string;

  // Message history
  messages: DivineChatMessage[];

  // Timing
  lastRoundTime: number;
  roundCooldown: number;           // Minimum 60 seconds between rounds
  currentRoundResponses: string[]; // Which gods have responded this round

  // State
  status: 'waiting_for_player' | 'gods_responding' | 'cooldown';
}

interface DivineChatParticipant {
  deityId: string;
  displayName: string;
  joinedAt: number;
  status: 'active' | 'lurking' | 'away' | 'offline';

  // AI behavior
  personalityInChat: ChatPersonality;
  responseStyle: string;
  topicsOfInterest: string[];
  relationshipToPlayer: RelationshipSentiment;
}

interface DivineChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;

  // Special messages
  type: 'message' | 'enter' | 'leave' | 'action' | 'system';

  // Metadata
  referencedMessages?: string[];   // Reply threading
  mentionedGods?: string[];
  emotionalTone: string;
}

interface ChatPersonality {
  verbosity: 'terse' | 'moderate' | 'verbose';
  formality: 'casual' | 'formal' | 'archaic';
  emotionalExpression: 'reserved' | 'moderate' | 'expressive';
  humorStyle?: 'none' | 'dry' | 'playful' | 'sardonic';
}
```

### Chat Flow

1. **Player sends message**
2. **Cooldown begins** (minimum 60 seconds)
3. **Each AI god generates ONE response** (in parallel or sequenced)
4. **Responses appear** in the chat
5. **System waits** for player's next message

```typescript
interface ChatRound {
  // Trigger
  playerMessage: DivineChatMessage;

  // Responses (one per god, generated in parallel)
  aiResponses: Map<string, DivineChatMessage>;

  // Timing
  roundStartedAt: number;
  responsesCompleteAt: number;
  nextRoundAvailableAt: number;

  // Who chose not to respond
  silentGods: string[];            // Some gods may stay quiet
}
```

### AI God Chat Prompt

```
You are {deity_name} in the Divine Chat - a space where gods speak directly.

YOUR PERSONALITY:
{personality_summary}

YOUR CHAT STYLE:
- Verbosity: {verbosity}
- Formality: {formality}
- Humor: {humor_style}

YOUR RELATIONSHIP WITH THE PLAYER GOD:
{relationship_summary}

YOUR RELATIONSHIPS WITH OTHER GODS IN CHAT:
{other_relationships}

RECENT CHAT HISTORY:
{last_10_messages}

THE PLAYER JUST SAID:
"{player_message}"

INSTRUCTIONS:
- Respond as your character would
- You may address the player, other gods, or make a general statement
- You may reference ongoing divine politics or mortal events
- You may stay silent if that's in character (respond with [SILENT])
- Keep responses conversational - this is a chat, not a speech
- Other gods will also respond; don't try to dominate
- You can express personality: humor, irritation, curiosity, warmth

RESPOND WITH ONE MESSAGE (or [SILENT]):
```

### Enter/Leave Notifications

```typescript
interface ChatNotification {
  type: 'enter' | 'leave' | 'status_change' | 'event';
  deityId: string;
  message: string;
}

// Examples:
const notifications = [
  { type: 'enter', deityId: 'storm_caller', message: '⚡ The Storm Caller has entered the chat' },
  { type: 'enter', deityId: 'ancestor', message: '👻 The Ancestor has entered the chat' },
  { type: 'leave', deityId: 'storm_caller', message: '⚡ The Storm Caller has left (attending to a hurricane)' },
  { type: 'status_change', deityId: 'ancestor', message: '👻 The Ancestor is now lurking' },
  { type: 'event', deityId: 'system', message: '🌟 A new god is crystallizing... someone may join soon' },
];
```

### Chat Events

Gods can be prompted to speak by game events:

```typescript
interface ChatEventTrigger {
  eventType: string;
  prompt: string;
  affectedGods: string[];
}

const chatTriggers: ChatEventTrigger[] = [
  {
    eventType: 'new_god_emergence',
    prompt: 'A new god has just crystallized. React to their arrival.',
    affectedGods: ['all'],
  },
  {
    eventType: 'divine_conflict_starts',
    prompt: 'War has been declared between {god_a} and {god_b}. Comment.',
    affectedGods: ['all_except_combatants'],
  },
  {
    eventType: 'major_miracle',
    prompt: '{god} just performed a major miracle. React.',
    affectedGods: ['all'],
  },
  {
    eventType: 'believer_milestone',
    prompt: 'The player god just reached 1000 believers. React.',
    affectedGods: ['all'],
  },
];
```

### Chat Example: Full Conversation

```
════════════════════════════════════════════════════════════════
                     THE DIVINE CHAT
════════════════════════════════════════════════════════════════

─────────── The Storm Caller has entered the chat ─────────────

THE STORM CALLER:
I exist. The mortals' fear of lightning gave me form. I feel
their terror like warmth. Is this what you feel from their
love, Watcher?

────────────────────────────────────────────────────────────────

YOU (The Watcher in Green):
Something like that. Though I'd call it gratitude more than
love. They thank me for the harvest. What do they give you?

────────────────────────────────────────────────────────────────

THE STORM CALLER:
Offerings left on high places. Children told to behave "or
the Storm will get them." Fear. Respect. It's... complicated.

────────────────────────────────────────────────────────────────

───────────── The Ancestor has entered the chat ───────────────

THE ANCESTOR:
Ah, the young ones. Storm Caller, I remember when your first
believers were just children afraid of thunder. They've grown
into proper worshippers now. Well done.

────────────────────────────────────────────────────────────────

THE STORM CALLER:
You knew me before I knew myself?

────────────────────────────────────────────────────────────────

THE ANCESTOR:
I knew the fear that would become you. I was mortal once. I
watched the storms and wondered if something watched back.
Turns out, something does now.

────────────────────────────────────────────────────────────────

YOU (The Watcher in Green):
Wait - Ancestor, you remember being mortal? What was it like?

────────────────────────────────────────────────────────────────

THE ANCESTOR:
Brief. Beautiful. Terrifying. I didn't know what I was missing
until I became... this. Now I remember everything and nothing
at the same time. My grandchildren worship me. It's strange.

THE STORM CALLER:
I have no such memories. I was born divine. Is that better
or worse?

────────────────────────────────────────────────────────────────

────────── The Depth has entered the chat ─────────────────────

THE DEPTH:
...

────────────────────────────────────────────────────────────────

THE ANCESTOR:
Ah. The new one. From the fishing village, yes? Dark waters?

THE STORM CALLER:
Another fear-born. We should talk.

────────────────────────────────────────────────────────────────

THE DEPTH:
You are loud. All of you. The mortals are loud too. I prefer
the silence beneath the waves.

────────────────────────────────────────────────────────────────

YOU (The Watcher in Green):
Welcome to existence, Depth. It gets less overwhelming.

────────────────────────────────────────────────────────────────

THE DEPTH:
Does it?

THE ANCESTOR:
No. But you get used to it.

THE STORM CALLER:
Ha!

════════════════════════════════════════════════════════════════
Gods present: You, The Storm Caller, The Ancestor, The Depth
Next responses in: 0:52
════════════════════════════════════════════════════════════════
```

### Chat Unlocking and Scaling

```typescript
interface ChatUnlockState {
  // Unlocks when first other god exists
  unlocked: boolean;
  unlockedAt?: number;

  // Features scale with pantheon size
  features: {
    basicChat: boolean;              // 2+ gods (including player)
    threadedReplies: boolean;        // 3+ gods
    privateDMs: boolean;             // 4+ gods
    factions: boolean;               // 5+ gods
    councilChannel: boolean;         // When council exists
  };

  // Special channels
  channels: ChatChannel[];
}

interface ChatChannel {
  id: string;
  name: string;
  type: 'general' | 'council' | 'faction' | 'private';
  members: string[];
  description: string;
}
```

### Private Divine Messages

At 4+ gods, you can DM other gods privately:

```
╔══════════════════════════════════════════════════════════════╗
║           PRIVATE MESSAGE - The Storm Caller                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  THE STORM CALLER:                                            ║
║  The Depth concerns me. Another fear-god. We may end up      ║
║  competing for the same believers. I propose an alliance -   ║
║  you and I against any who would threaten us.                ║
║                                                               ║
║  ─────────────────────────────────────────────────────────── ║
║                                                               ║
║  [Type your private response...]                             ║
║                                                               ║
║  Note: This conversation is not visible to other gods.       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Chat Personality Examples

Different gods have different chat styles:

**The Storm Caller** (fear-born, proud, lonely):
```
Style: Terse, slightly formal, defensive but curious
Example: "You speak of mercy as if it's easy. My nature IS destruction.
         Can I be anything else? ...I'm asking genuinely."
```

**The Ancestor** (elevated mortal, wise, nostalgic):
```
Style: Verbose, archaic, paternal
Example: "I recall when this valley was empty of prayer. Now look at us -
         four gods bickering like my grandchildren did. Some things
         don't change even in divinity."
```

**The Depth** (newly emerged, alien, quiet):
```
Style: Very terse, strange, uncomfortable with communication
Example: "..."
Example: "Words are surface things."
Example: "I do not understand your conflict. The fish do not argue."
```

**The Hearth Mother** (love-born, warm, diplomatic):
```
Style: Warm, moderate length, mediating
Example: "Perhaps we could all take a breath? Storm Caller, you're not
         wrong to be concerned. Depth, you're not wrong to be wary.
         Can we find common ground? I'll make tea. ...metaphorically."
```

---

*The Divine Chat is where gods are most themselves—not performing for believers, not wielding power, just... talking. It's surprisingly humanizing.*
