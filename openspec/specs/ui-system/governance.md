# Governance UI Specification

## Overview

The Governance UI provides interfaces for village political systems including laws, voting, leadership, factions, and policy management. Features council views, voting interfaces, and faction relationship displays. Supports both standard and alien governance types.

## Version

0.1.0

## Dependencies

- `governance-system/spec.md` - Governance mechanics (GovernanceType, VillageGovernance, Leader, Council, Law, Policy)
- `agent-system/relationship-system.md` - Social dynamics
- `ui-system/notifications.md` - Political alerts

## Requirements

### REQ-GOV-001: Governance Overview Panel
- **Description**: Summary of current political state
- **Priority**: MUST

```typescript
// Re-export from governance-system for reference
import type {
  GovernanceType, VillageGovernance, Leader, LeaderRole, GovernanceDomain,
  Council, CouncilMember, VotingMethod,
  Law, LawType, Policy, PolicyEffect,
  // Alien governance types
  ManchiGovernance, HiveGovernance, DominanceGovernance,
  GestaltGovernance, PackCouncilGovernance, CyclicRegencyGovernance,
  SymbiontGovernance
} from "governance-system/spec";

interface GovernanceOverviewPanel {
  isOpen: boolean;

  // Current system from VillageGovernance (governance-system/spec.md)
  governance: VillageGovernance;

  // Display helpers
  governanceTypeDisplay: GovernanceTypeDisplay;
  currentLeader: LeaderDisplayInfo | null;

  // Summary computed from VillageGovernance
  activeLaws: number;           // From governance.laws
  activePolicies: number;       // From governance.policies
  councilSize: number | null;   // From governance.council?.currentSize

  // Stability from VillageGovernance
  stability: number;            // From governance.stability (0-100)
  legitimacy: number;           // From governance.legitimacy (0-100)
  corruption: number;           // From governance.corruption (0-100)

  // Methods
  open(): void;
  close(): void;
  navigateTo(section: GovernanceSection): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// GovernanceType from governance-system/spec.md includes:
// Standard: "anarchic" | "elder_council" | "chieftain" | "council" | "monarchy" |
//           "meritocracy" | "theocracy" | "merchant_guild"
// Alien:    "manchi_hierarchy" | "hive_queen" | "dominance_chain" | "gestalt_consensus" |
//           "pack_council" | "cyclic_regency" | "symbiont_merged"

// UI display wrapper for GovernanceType
interface GovernanceTypeDisplay {
  type: GovernanceType;
  displayName: string;
  description: string;
  icon: Sprite;
  isAlienType: boolean;

  // Special UI indicators for alien governance
  alienTypeInfo?: AlienGovernanceInfo;
}

interface AlienGovernanceInfo {
  // For manchi_hierarchy
  manchiCascade?: { aiji: string; cascadeDepth: number };
  // For hive_queen
  queenInfo?: { hiveSize: number; directControlSlots: number };
  // For dominance_chain
  hierarchyInfo?: { topRank: string; recentChallenges: number };
  // For gestalt_consensus
  mindsInfo?: { mindCount: number; currentProposals: number };
  // For pack_council
  packInfo?: { rulingPacks: number; coherenceAverage: number };
  // For cyclic_regency
  cycleInfo?: { currentCycle: number; daysUntilNext: number };
  // For symbiont_merged
  symbiontInfo?: { joinedCount: number; elderSymbionts: number };
}

type GovernanceSection =
  | "overview"
  | "laws"
  | "policies"
  | "voting"
  | "factions"
  | "leadership"
  | "council"
  | "history"
  | "alien_details";  // For alien governance specifics

// Display wrapper for Leader from governance-system/spec.md
interface LeaderDisplayInfo {
  leader: Leader;  // From governance-system

  // Computed display properties
  displayName: string;
  displayTitle: string;  // From Leader.title
  portrait: Sprite;

  // From Leader interface
  role: LeaderRole;
  domains: GovernanceDomain[];
  authorityLevel: number;       // 0-100
  popularSupport: number;       // 0-100

  // Tenure info
  tenureStart: GameTime;        // From Leader.appointedAt
  termEnds: GameTime | null;    // Computed from appointedAt + termLength
}
```

### REQ-GOV-002: Laws and Policies
- **Description**: View and manage village laws
- **Priority**: MUST

```typescript
// Uses Law, LawType, LawProvision, Punishment, PunishmentType,
// Policy, PolicyEffect from governance-system/spec.md

interface LawsPanel {
  // Uses Law[] from governance-system
  laws: Law[];

  // Filtering - uses GovernanceDomain (not LawCategory) from governance-system
  filterByDomain: GovernanceDomain | null;
  filterByStatus: LawDisplayStatus | null;
  filterByType: LawType | null;  // From governance-system
  searchQuery: string;

  // Sorting
  sortBy: "name" | "date" | "domain" | "support" | "enforcement";

  // Selection
  selectedLaw: LawDisplayInfo | null;

  // Methods
  selectLaw(law: Law): void;
  proposeLaw(): void;
  repealLaw(lawId: string): void;
}

// Law from governance-system/spec.md:
// - id, name, description
// - domain: GovernanceDomain (not LawCategory)
// - affectedAgents: "all" | "citizens" | "visitors" | string[]
// - type: LawType
// - provisions: LawProvision[]
// - punishment: Punishment[]
// - enforcementLevel: number (0-100)
// - proposedBy: string
// - enactedAt: GameTime
// - supportVotes: number
// - opposeVotes: number

// LawType from governance-system/spec.md:
// "prohibition" | "requirement" | "regulation" | "taxation" |
// "property" | "trade" | "social" | "religious"

// UI display wrapper for Law
interface LawDisplayInfo {
  law: Law;  // From governance-system

  // Computed display properties
  displayStatus: LawDisplayStatus;
  supportPercentage: number;     // supportVotes / (supportVotes + opposeVotes)
  enforcementDescription: string; // "Strictly enforced", "Loosely enforced", etc.

  // Provisions display
  provisionDisplays: LawProvisionDisplay[];

  // Punishment display
  punishmentDisplays: PunishmentDisplay[];
}

// UI status (extends beyond governance-system tracking)
type LawDisplayStatus =
  | "active"           // Currently in effect (enactedAt set)
  | "proposed"         // Under consideration
  | "voting"           // Being voted on
  | "repealed"         // Removed from governance.laws
  | "expired";         // Time-limited law expired

// Display wrapper for LawProvision
interface LawProvisionDisplay {
  provision: LawProvision;  // From governance-system
  conditionDescription: string;
  requirementDescription: string;
  exceptionsList: string[];
}

// Display wrapper for Punishment
interface PunishmentDisplay {
  punishment: Punishment;  // From governance-system
  severityIcon: Sprite;
  severityColor: Color;
  typeDescription: string;
  amountFormatted: string | null;  // "50 gold", "7 days", etc.
}

// PunishmentType from governance-system/spec.md:
// "fine" | "labor" | "restitution" | "exile" |
// "imprisonment" | "shunning" | "demotion" | "execution"

// Policy display
interface PoliciesPanel {
  // Uses Policy[] from governance-system
  policies: PolicyDisplayInfo[];

  filterByDomain: GovernanceDomain | null;
  selectedPolicy: PolicyDisplayInfo | null;

  selectPolicy(policy: Policy): void;
  proposePolicy(): void;
  modifyPolicy(policyId: string): void;
}

// Display wrapper for Policy from governance-system
interface PolicyDisplayInfo {
  policy: Policy;  // From governance-system

  displayName: string;
  domainIcon: Sprite;
  effectsSummary: string;

  // Effects display
  effectDisplays: PolicyEffectDisplay[];
}

interface PolicyEffectDisplay {
  effect: PolicyEffect;  // From governance-system
  targetName: string;
  modifierFormatted: string;  // "+10%", "-5%", etc.
  isPositive: boolean;
}
```

### REQ-GOV-003: Voting Interface
- **Description**: Participate in and view votes
- **Priority**: MUST

```typescript
// Uses VotingMethod from governance-system/spec.md for council voting
// VotingMethod: "majority" | "supermajority" | "unanimous" |
//               "plurality" | "consensus" | "leader_tiebreak"

interface VotingInterface {
  activeVotes: VoteDisplayInfo[];
  completedVotes: VoteDisplayInfo[];

  // Current vote
  selectedVote: VoteDisplayInfo | null;

  // Council context from VillageGovernance
  councilVotingMethod: VotingMethod | null;  // From governance.council.votingMethod
  councilQuorum: number | null;              // From governance.council.quorum

  // Methods
  selectVote(vote: VoteDisplayInfo): void;
  castVote(voteId: string, choice: VoteChoice): void;
  viewResults(voteId: string): void;
}

// UI vote tracking (governance-system tracks individual votes in council/laws)
interface VoteDisplayInfo {
  id: string;
  type: VoteType;
  title: string;
  description: string;

  // Subject
  subject: VoteSubject;

  // Voting method from council
  votingMethod: VotingMethod;  // From governance-system

  // Options
  choices: VoteChoice[];

  // Timing
  startTime: GameTime;
  endTime: GameTime;
  status: VoteStatus;

  // Results (if complete)
  results: VoteResults | null;

  // Context
  requiredForPassage: string;  // "Majority", "2/3 supermajority", etc.
}

type VoteType =
  | "law_proposal"     // New law
  | "law_repeal"       // Remove law
  | "leader_election"  // Choose leader (uses AppointmentMethod: "election")
  | "policy_change"    // Change policy
  | "council_appointment" // Appoint council member
  | "resource_decision" // Resource allocation
  | "expulsion"        // Remove member
  | "admission";       // Accept new member

interface VoteSubject {
  type: "law" | "agent" | "policy" | "resource";
  id: string;
  name: string;

  // For law subjects
  lawType?: LawType;           // From governance-system
  lawDomain?: GovernanceDomain; // From governance-system
}

interface VoteChoice {
  id: string;
  label: string;
  description: string;

  // For elections - candidate info
  candidateId?: string;
  candidatePortrait?: Sprite;

  // Voting stats
  voteCount: number;
  percentage: number;
}

type VoteStatus =
  | "pending"          // Not started
  | "active"           // Voting now
  | "closed"           // Voting ended
  | "passed"           // Majority approved
  | "failed"           // Majority rejected
  | "tied";            // No clear winner

interface VoteResults {
  totalVotes: number;
  turnout: number;            // Percentage who voted
  quorumMet: boolean;         // From council.quorum
  winner: VoteChoice | null;
  breakdown: VoteBreakdown[];
}

interface VoteBreakdown {
  choice: VoteChoice;
  votes: number;
  percentage: number;
  voters: string[];           // Agent IDs
  weightedVotes: number;      // Sum of CouncilMember.votingWeight
}
```

### REQ-GOV-004: Factions Display
- **Description**: View political factions and their relationships
- **Priority**: SHOULD

```typescript
// Uses Faction from governance-system/spec.md (from Revolution interface context)
// Faction: { name, leader, members, support, resources, goals }

interface FactionsPanel {
  factions: FactionDisplayInfo[];

  // Display
  viewMode: "list" | "graph";

  // Selection
  selectedFaction: FactionDisplayInfo | null;

  // Revolution context from VillageGovernance
  activeRevolution: RevolutionDisplayInfo | null;

  // Methods
  selectFaction(faction: FactionDisplayInfo): void;
  compareFactions(faction1: string, faction2: string): void;
}

// Faction from governance-system/spec.md:
// - name: string
// - leader: string (agent ID)
// - members: string[] (agent IDs)
// - support: number (0-100 popular support)
// - resources: number
// - goals: string[]

// UI display wrapper for Faction
interface FactionDisplayInfo {
  faction: Faction;  // From governance-system

  // UI identifiers
  id: string;        // Generated for UI tracking
  icon: Sprite;
  color: Color;

  // Computed from faction data
  leaderName: string | null;
  memberCount: number;  // faction.members.length
  influence: number;    // Computed from support + resources

  // Extended UI data
  beliefs: FactionBelief[];
  priorities: FactionPriority[];

  // Relationships with other factions
  relationships: FactionRelationshipDisplay[];
}

interface FactionBelief {
  topic: string;
  position: number;            // -100 to 100
  label: string;
}

interface FactionPriority {
  area: GovernanceDomain;      // Uses GovernanceDomain from governance-system
  importance: number;          // 0-100
}

interface FactionRelationshipDisplay {
  factionId: string;
  factionName: string;
  standing: number;            // -100 to 100
  status: FactionRelationshipStatus;
}

type FactionRelationshipStatus =
  | "allied"
  | "friendly"
  | "neutral"
  | "rival"
  | "hostile";

// Revolution display from governance-system/spec.md
interface RevolutionDisplayInfo {
  revolution: Revolution;  // From governance-system

  // Computed display
  revolutionaryFaction: FactionDisplayInfo;
  loyalistFaction: FactionDisplayInfo;
  currentPhase: RevolutionPhase;  // From governance-system
  phaseDescription: string;
  progressIndicator: number;      // 0-100
}

// RevolutionPhase from governance-system/spec.md:
// "unrest" | "protests" | "uprising" | "civil_war" | "resolution"

interface FactionGraph {
  factions: FactionNode[];
  relationships: FactionEdge[];

  // Layout
  layout: "force" | "circular";

  render(ctx: CanvasRenderingContext2D): void;
}

interface FactionNode {
  faction: FactionDisplayInfo;
  position: Vector2;
  size: number;                // Based on influence
}

interface FactionEdge {
  from: string;
  to: string;
  standing: number;
  color: Color;
}
```

### REQ-GOV-005: Leadership Panel
- **Description**: View and manage leadership
- **Priority**: SHOULD

```typescript
// Uses Council, CouncilMember, SuccessionRule, AppointmentMethod from governance-system/spec.md
// Uses Leader interface already imported in REQ-GOV-001

interface LeadershipPanel {
  // Uses LeaderDisplayInfo wrapper from REQ-GOV-001
  currentLeader: LeaderDisplayInfo | null;

  // Uses Council from governance-system
  council: CouncilDisplayInfo | null;

  // From VillageGovernance
  stability: number;     // governance.stability
  legitimacy: number;    // governance.legitimacy
  corruption: number;    // governance.corruption

  // Succession from VillageGovernance
  successionRule: SuccessionRule;  // governance.succession

  // Methods
  viewLeaderDetails(): void;
  callElection(): void;
  challengeLeader(): void;
}

// Council from governance-system/spec.md:
// - id, name, villageId
// - members: CouncilMember[]
// - requiredSize, currentSize
// - meetingFrequency, meetingLocation, lastMeeting
// - votingMethod: VotingMethod
// - quorum
// - domains: GovernanceDomain[]
// - canOverrideLeader

// CouncilMember from governance-system/spec.md:
// - agentId, seat, joinedAt, termEnds?
// - votingWeight, attendance

// Display wrapper for Council
interface CouncilDisplayInfo {
  council: Council;  // From governance-system

  // Computed display
  memberDisplays: CouncilMemberDisplayInfo[];
  seatsFilled: string;         // "5/7 seats filled"
  nextMeeting: GameTime | null;
  quorumStatus: "met" | "not_met" | "unknown";
}

// Display wrapper for CouncilMember
interface CouncilMemberDisplayInfo {
  member: CouncilMember;  // From governance-system

  // UI display properties
  name: string;
  portrait: Sprite;
  seatDescription: string;      // From member.seat

  // Computed from member
  tenureDays: number;           // Days since member.joinedAt
  termRemaining: number | null; // Days until member.termEnds
  attendanceFormatted: string;  // "85%" from member.attendance
  votingPower: string;          // From member.votingWeight

  // Extended UI data
  factionAffiliation: string | null;
  influenceLevel: number;
}

// SuccessionRule from governance-system/spec.md:
// - type: SuccessionType
// - candidates: SuccessionCriteria
// - selectionMethod: AppointmentMethod
// - successionTriggers: SuccessionTrigger[]
// - interregnumHandler, maxInterregnumDays

// Display wrapper for SuccessionRule
interface SuccessionDisplayInfo {
  rule: SuccessionRule;  // From governance-system

  typeDescription: string;       // "Elected by popular vote", "Hereditary", etc.
  selectionMethodDescription: string;  // From AppointmentMethod
  successionLine: SuccessionLineEntry[];
}

interface SuccessionLineEntry {
  agentId: string;
  name: string;
  portrait: Sprite;
  position: number;            // 1 = heir apparent
  eligibilityStatus: "eligible" | "conditional" | "ineligible";
  reason: string | null;
}

interface ApprovalBreakdown {
  // From Leader.popularSupport
  overall: number;

  byFaction: Map<string, number>;
  byDemographic: Map<string, number>;
  trend: "rising" | "stable" | "falling";
  recentEvents: ApprovalEvent[];
}

interface ApprovalEvent {
  event: string;
  impact: number;
  date: GameTime;
}
```

### REQ-GOV-006: Proposal Creation
- **Description**: Interface for creating new proposals
- **Priority**: SHOULD

```typescript
// Uses Law, LawType, LawProvision, GovernanceDomain, Policy, PolicyEffect
// from governance-system/spec.md

interface ProposalCreation {
  isOpen: boolean;
  proposalType: VoteType;

  // Draft
  draft: ProposalDraft;

  // Validation against governance-system requirements
  isValid: boolean;
  validationErrors: string[];

  // Support preview based on faction analysis
  estimatedSupport: number;
  likelyOutcome: "pass" | "fail" | "uncertain";

  // Methods
  setType(type: VoteType): void;
  updateDraft(changes: Partial<ProposalDraft>): void;
  submitProposal(): void;
  cancel(): void;
}

interface ProposalDraft {
  title: string;
  description: string;
  type: VoteType;

  // For laws - uses governance-system types
  lawDomain: GovernanceDomain | null;    // Not LawCategory
  lawType: LawType | null;               // From governance-system
  affectedAgents: "all" | "citizens" | "visitors" | string[];
  provisions: LawProvision[];            // From governance-system
  punishments: Punishment[];             // From governance-system
  enforcementLevel: number;              // 0-100

  // For policies - uses governance-system types
  policyDomain: GovernanceDomain | null;
  policyEffects: PolicyEffect[];         // From governance-system

  // For elections
  candidates: string[];

  // Voting rules - uses council's VotingMethod
  votingMethod: VotingMethod;            // From governance-system
  votingDuration: number;
  requiredMajority: number;              // 0.5-1.0
  quorumRequired: number;                // From council.quorum
}

interface SupportPreview {
  // Predicted votes
  likelySupport: number;
  likelyOpposition: number;
  undecided: number;

  // By faction using FactionDisplayInfo
  factionPositions: Map<string, FactionPositionPreview>;
}

interface FactionPositionPreview {
  faction: FactionDisplayInfo;
  position: "support" | "oppose" | "undecided";
  strength: number;            // How strongly
  reason: string;
}
```

### REQ-GOV-007: Political History
- **Description**: Timeline of political events
- **Priority**: MAY

```typescript
// Uses VillageGovernance.previousTypes and VillageGovernance.revolutions
// from governance-system/spec.md

interface PoliticalHistory {
  events: PoliticalEventDisplay[];

  // From VillageGovernance
  formedAt: GameTime;                    // governance.formedAt
  previousTypes: GovernanceType[];       // governance.previousTypes
  revolutions: RevolutionDisplayInfo[];  // governance.revolutions

  // Filtering
  filterByType: PoliticalEventType | null;
  dateRange: DateRange | null;

  // Display
  viewMode: "timeline" | "list";
}

interface PoliticalEventDisplay {
  id: string;
  type: PoliticalEventType;
  title: string;
  description: string;
  date: GameTime;

  // Participants
  involvedAgents: string[];
  involvedFactions: FactionDisplayInfo[];

  // Impact on VillageGovernance stats
  impact: PoliticalImpact;
}

type PoliticalEventType =
  | "election"           // AppointmentMethod: "election"
  | "law_passed"         // Law added to governance.laws
  | "law_repealed"       // Law removed from governance.laws
  | "leader_change"      // Leader changed in governance.leaders
  | "governance_change"  // GovernanceType changed
  | "faction_formed"
  | "faction_dissolved"
  | "alliance"
  | "revolution_start"   // Revolution began
  | "revolution_end"     // Revolution resolved
  | "council_formed"     // Council created
  | "reform";

interface PoliticalImpact {
  // Changes to VillageGovernance stats
  stabilityChange: number;    // governance.stability
  legitimacyChange: number;   // governance.legitimacy
  corruptionChange: number;   // governance.corruption
  factionChanges: Map<string, number>;
}

interface PoliticalTimeline {
  events: PoliticalEventDisplay[];

  // Display
  orientation: "horizontal" | "vertical";
  showIcons: boolean;
  groupByYear: boolean;

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-GOV-008: Public Mood Display
- **Description**: Aggregate sentiment of population
- **Priority**: SHOULD

```typescript
interface PublicMoodDisplay {
  overallMood: number;         // 0-100
  moodTrend: "rising" | "stable" | "falling";

  // Breakdown
  moodFactors: MoodFactor[];

  // By demographic
  moodByFaction: Map<string, number>;
  moodByJob: Map<string, number>;

  // History
  moodHistory: MoodHistoryPoint[];
}

interface MoodFactor {
  name: string;
  impact: number;              // Positive or negative
  description: string;
  source: string;
}

interface MoodHistoryPoint {
  date: GameTime;
  mood: number;
  event: string | null;
}

interface UnrestIndicator {
  level: UnrestLevel;
  risk: number;                // 0-100

  // Contributing factors
  grievances: Grievance[];

  // Potential consequences
  possibleOutcomes: string[];
}

type UnrestLevel =
  | "content"          // Happy population
  | "grumbling"        // Minor complaints
  | "discontent"       // Significant unhappiness
  | "unrest"           // Active dissatisfaction
  | "revolt";          // Open rebellion

interface Grievance {
  issue: string;
  severity: number;
  affectedCount: number;
  duration: number;            // How long ongoing
}
```

### REQ-GOV-009: Keyboard Shortcuts
- **Description**: Quick access for governance UI
- **Priority**: SHOULD

```typescript
interface GovernanceShortcuts {
  // Window
  toggleGovernance: string;    // Default: "G"
  closeGovernance: string;     // Default: "Escape"

  // Navigation
  nextSection: string;         // Default: "Tab"
  previousSection: string;     // Default: "Shift+Tab"

  // Sections
  openLaws: string;            // Default: "L"
  openVoting: string;          // Default: "V"
  openFactions: string;        // Default: "F"

  // Actions
  proposeNew: string;          // Default: "N"
  castVote: string;            // Default: "Enter"
}
```

## Visual Style

```typescript
interface GovernanceStyle {
  // Panel
  backgroundColor: Color;
  headerColor: Color;
  sectionBackground: Color;

  // Faction colors
  factionColors: Map<string, Color>;

  // Mood indicators
  positiveMoodColor: Color;    // Green
  neutralMoodColor: Color;     // Yellow
  negativeMoodColor: Color;    // Red

  // Vote display
  supportColor: Color;         // Green
  opposeColor: Color;          // Red
  abstainColor: Color;         // Gray

  // Typography
  titleFont: PixelFont;
  bodyFont: PixelFont;

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
interface GovernanceState {
  // Core data from governance-system
  governance: VillageGovernance;  // From governance-system

  // View state
  isOpen: boolean;
  activeSection: GovernanceSection;

  // Selection - using display wrappers
  selectedLaw: LawDisplayInfo | null;
  selectedVote: VoteDisplayInfo | null;
  selectedFaction: FactionDisplayInfo | null;
  selectedLeader: LeaderDisplayInfo | null;

  // Filters
  lawFilters: LawFilterState;
  voteFilters: VoteFilterState;

  // Proposal draft
  activeDraft: ProposalDraft | null;

  // Events - using governance-system types
  onLawSelected: Event<Law>;              // From governance-system
  onVoteSelected: Event<VoteDisplayInfo>;
  onVoteCast: Event<VoteCastEvent>;
  onLeaderChanged: Event<Leader>;         // From governance-system
  onGovernanceTypeChanged: Event<GovernanceType>;  // From governance-system
  onRevolutionStarted: Event<Revolution>; // From governance-system
  onStabilityChanged: Event<number>;
  onLegitimacyChanged: Event<number>;
}

interface LawFilterState {
  domain: GovernanceDomain | null;  // Uses GovernanceDomain from governance-system
  status: LawDisplayStatus | null;
  type: LawType | null;             // From governance-system
  searchQuery: string;
}

interface VoteFilterState {
  type: VoteType | null;
  status: VoteStatus | null;
  showCompleted: boolean;
}

interface VoteCastEvent {
  voteId: string;
  choice: string;
  voter: string;
  votingWeight: number;  // From CouncilMember.votingWeight if applicable
}
```

## Integration Points

- **Governance System**: Political mechanics, voting
- **Agent System**: Leaders, council, faction members
- **Relationship System**: Political relationships
- **Notification System**: Political alerts
- **Economy System**: Resource policy effects
