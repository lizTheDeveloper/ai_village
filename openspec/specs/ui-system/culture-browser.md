# Culture Browser UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Culture Browser provides players with comprehensive views of village cultures - their kinship systems, gender norms, class structures, relationship patterns, parenting practices, economic models, values, and taboos. This UI helps players understand how different societies operate and interact.

**Core insight:**
> "Culture defines how a society organizes itself within the biological constraints of its species."

Two elf villages might have radically different cultures - one egalitarian forest commune, another rigid caste-based aristocracy. Understanding these differences is key to meaningful interaction.

---

## Dependencies

- `agent-system/culture-system.md` - Culture definitions and systems
- `agent-system/species-system.md` - Species constraints on culture
- `governance-system/spec.md` - Governance integration

---

## Requirements

### REQ-CULT-001: Culture Overview Panel

Main panel displaying culture summary and navigation.

```typescript
// Re-export from agent-system/culture-system for reference
import type {
  Culture, KinshipSystem, KinshipType, DescentType, HouseholdType,
  GenderSystem, GenderSystemType, GenderDefinition, GenderMobility,
  ClassSystem, ClassSystemType, SocialClass, ClassMobility,
  RelationshipNorms, PartnershipType, FormationNorms, DissolutionNorms,
  ParentingNorms, ParentingStructure, AttachmentStyle,
  EconomicSystem, EconomicType, OwnershipNorms, LaborNorms,
  Value, Taboo, TabooSeverity,
  EmotionSystem, EmotionSystemType
} from "agent-system/culture-system";

interface CultureBrowser {
  isOpen: boolean;

  // Current culture
  currentCulture: Culture;
  villageId: string;

  // Navigation
  activeSection: CultureSection;

  // Comparison mode
  comparisonMode: boolean;
  comparisonCulture: Culture | null;

  // Knowledge level
  playerKnowledge: CultureKnowledge;
}

type CultureSection =
  | "overview"
  | "kinship"
  | "gender"
  | "class"
  | "relationships"
  | "parenting"
  | "economics"
  | "values"
  | "emotions";

interface CultureKnowledge {
  level: "outsider" | "visitor" | "resident" | "native";
  knownAspects: Set<CultureSection>;
  hiddenTaboos: boolean;              // Some taboos only revealed with trust
}
```

**Culture Overview Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏛️ CULTURE BROWSER                                             [X]       │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ SECTIONS      │  OAKWOOD VILLAGE CULTURE                                    │
│               │  ─────────────────────────────────────────────────────────  │
│ ● Overview    │                                                             │
│ ○ Kinship     │  Species: Elf (primary)                                     │
│ ○ Gender      │  Origin: Forest Haven                                       │
│ ○ Class       │  Your Knowledge: Visitor                                    │
│ ○ Relations   │                                                             │
│ ○ Parenting   │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│ ○ Economics   │  │ 👪 KINSHIP     │ │ ⚧ GENDER       │ │ 📊 CLASS       │  │
│ ○ Values      │  │ Matriarchal    │ │ Binary,        │ │ Egalitarian    │  │
│ ○ Emotions    │  │ Clan-based     │ │ Flexible       │ │                │  │
│               │  └────────────────┘ └────────────────┘ └────────────────┘  │
│ ─────────     │                                                             │
│               │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│ [Compare]     │  │ 💕 RELATIONS   │ │ 👶 PARENTING   │ │ 💰 ECONOMICS   │  │
│               │  │ Monogamous     │ │ Extended       │ │ Gift Economy   │  │
│               │  │ Free Choice    │ │ Nurturing      │ │                │  │
│               │  └────────────────┘ └────────────────┘ └────────────────┘  │
│               │                                                             │
│               │  CORE VALUES                                                │
│               │  ████████████████ Harmony with Nature                      │
│               │  ██████████████░░ Beauty in All Things                     │
│               │  ████████████░░░░ Patience                                 │
│               │  ██████████░░░░░░ Respect for Tradition                    │
│               │                                                             │
│               │  KNOWN TABOOS                                               │
│               │  ⚠️ Use of Cold Iron                                        │
│               │  ⚠️ Destruction of Nature                                   │
│               │  🔒 [2 hidden - gain trust to learn]                        │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  📝 Your Notes: [Add cultural observation...]                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-002: Kinship System Panel

Display family and lineage structures.

```typescript
// KinshipDisplay wraps KinshipSystem with UI properties
interface KinshipDisplay {
  kinship: KinshipSystem;              // From culture-system

  // Visualizations
  familyTreeExample: FamilyTreeDiagram;
  householdDiagram: HouseholdDiagram;

  // Obligation matrix
  obligationMatrix: ObligationMatrixDisplay;

  // Naming examples
  namingExamples: NamingExample[];
}

interface FamilyTreeDiagram {
  type: KinshipType;
  descentLine: DescentType;
  exampleFamily: FamilyMember[];
  highlightedRelations: string[];
}

interface HouseholdDiagram {
  type: HouseholdType;
  typicalMembers: string[];
  livingArrangement: string;
  decisionMaker: string;
}

interface ObligationMatrixDisplay {
  obligations: KinObligation[];        // From culture-system
  matrix: Map<string, Map<string, ObligationCell>>;
}

interface ObligationCell {
  from: KinRole;
  to: KinRole;
  type: string;
  strength: number;
  breakable: boolean;
  color: Color;
}

interface NamingExample {
  role: string;
  pattern: string;
  example: string;
}
```

**Kinship Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KINSHIP SYSTEM                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TYPE: Matriarchal Clan                                                     │
│  DESCENT: Matrilineal (through mother's line)                              │
│  INHERITANCE: Eldest daughter                                               │
│                                                                             │
│  FAMILY STRUCTURE                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│                        👵 Clan Matriarch                                    │
│                              │                                              │
│              ┌───────────────┼───────────────┐                              │
│              │               │               │                              │
│           👩 Eldest       👩 Middle       👩 Youngest                       │
│              │               │               │                              │
│        ┌─────┴─────┐        ┌┴┐             ┌┴┐                             │
│       👧          👦       👧👦           👧👧                              │
│   (inherits)  (marries                                                      │
│                  out)                                                       │
│                                                                             │
│  HOUSEHOLD TYPE: Extended                                                   │
│  • Multiple generations live together                                       │
│  • Decision-making: Eldest female                                           │
│  • Children belong to mother's clan                                         │
│                                                                             │
│  NAMING CONVENTION                                                          │
│  Pattern: {Given Name} of {Mother's Clan}                                   │
│  Example: "Aelindra of Moonbrook"                                           │
│                                                                             │
│  KINSHIP OBLIGATIONS                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  FROM → TO          TYPE          STRENGTH    BREAKABLE                     │
│  Child → Parent     Obedience     ████████░░  No                           │
│  Clan → Elder       Obedience     ████████░░  No                           │
│  Parent → Child     Protection    ██████████  No                           │
│  Sibling → Sibling  Support       ██████░░░░  Yes (rare)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-003: Gender System Panel

Display gender structures and norms.

```typescript
// GenderDisplay wraps GenderSystem with UI properties
interface GenderDisplay {
  gender: GenderSystem;                // From culture-system

  // Gender visualization
  genderSpectrum: GenderSpectrumDisplay;

  // Role assignments
  roleBreakdown: GenderRoleDisplay[];

  // Mobility info
  mobilityInfo: GenderMobilityDisplay;

  // Transition rituals (if any)
  transitionInfo?: TransitionDisplay;
}

interface GenderSpectrumDisplay {
  type: GenderSystemType;
  genders: GenderDefinitionDisplay[];
  visualLayout: "linear" | "circular" | "web";
}

interface GenderDefinitionDisplay {
  gender: GenderDefinition;            // From culture-system
  icon: Sprite;
  color: Color;
  prevalenceBar: number;
  typicalRoles: string[];
  restrictions: string[];
}

interface GenderMobilityDisplay {
  mobility: GenderMobility;            // From culture-system
  diagram: string;                     // ASCII visualization
  socialImplications: string[];
}

interface TransitionDisplay {
  rituals: TransitionRitual[];
  requirements: string[];
  socialResponse: string;
}
```

**Gender Panel (Sequential Gender Example - Phaseborn-inspired):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GENDER SYSTEM                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TYPE: Sequential (Flux Cycle)                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "Gender changes cyclically - most of the time neither male nor female"    │
│                                                                             │
│  GENDER STATES                                                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │    ╭───────────╮           ╭───────────╮           ╭───────────╮   │   │
│  │    │  SOMER    │──flux──▶  │ BEARING   │           │  SIRING   │   │   │
│  │    │ (default) │◀──return──│           │◀── OR ───▶│           │   │   │
│  │    │   90%     │           │    5%     │           │    5%     │   │   │
│  │    ╰───────────╯           ╰───────────╯           ╰───────────╯   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SOMER (Default State)                                                      │
│  • Sexually latent, neither male nor female                                │
│  • All social roles available                                               │
│  • No gendered behavior expected                                            │
│                                                                             │
│  FLUX (Fertile Phase)                                                       │
│  • Manifests as bearing (female) or siring (male)                          │
│  • Triggered by partner proximity                                           │
│  • Role determination: situational                                          │
│                                                                             │
│  GENDER ROLES: None                                                         │
│  • No gendered labor division                                               │
│  • No gendered clothing or markers                                          │
│  • "Anyone can be anything at any time"                                     │
│                                                                             │
│  MOBILITY: Cyclical                                                         │
│  • Changes with flux cycle                                                  │
│  • No social cost                                                           │
│  • Cannot be controlled                                                     │
│                                                                             │
│  CULTURAL IMPLICATIONS                                                      │
│  • No permanent gender roles                                                │
│  • No "battle of the sexes"                                                 │
│  • All individuals experience both roles                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-004: Class System Panel

Display social stratification and mobility.

```typescript
// ClassDisplay wraps ClassSystem with UI properties
interface ClassDisplay {
  class: ClassSystem;                  // From culture-system

  // Class pyramid visualization
  classPyramid: ClassPyramidDisplay;

  // Mobility information
  mobilityInfo: ClassMobilityDisplay;

  // Inter-class relations
  relationsMatrix: InterClassDisplay;

  // Player's current class in this culture
  playerClass?: SocialClass;
}

interface ClassPyramidDisplay {
  classes: SocialClassDisplay[];
  inequalityIndex: number;
  visualType: "pyramid" | "horizontal" | "circles";
}

interface SocialClassDisplay {
  class: SocialClass;                  // From culture-system
  icon: Sprite;
  color: Color;
  populationBar: number;
  privilegesList: string[];
  restrictionsList: string[];
}

interface ClassMobilityDisplay {
  mobility: ClassMobility;             // From culture-system
  mechanisms: MobilityMechanismDisplay[];
  successStories?: string[];           // Examples of mobility
}

interface MobilityMechanismDisplay {
  mechanism: string;
  difficulty: number;
  requirements: string[];
}

interface InterClassDisplay {
  norms: InterClassNorms;              // From culture-system
  marriageRules: string;
  interactionRules: InteractionRuleDisplay[];
}
```

**Class Panel (Egalitarian Example):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLASS SYSTEM                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TYPE: Egalitarian                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  "All members are equals - no hierarchy, no inherited privilege"           │
│                                                                             │
│  ECONOMIC INEQUALITY: ░░░░░░░░░░ 0%                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │     ╭─────────────────────────────────────────────────────────╮     │   │
│  │     │                                                         │     │   │
│  │     │                  COMMUNITY MEMBER                       │     │   │
│  │     │                     (100%)                              │     │   │
│  │     │                                                         │     │   │
│  │     ╰─────────────────────────────────────────────────────────╯     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PRIVILEGES (All)                    RESTRICTIONS (None)                    │
│  • Equal voice in decisions          • No personal wealth accumulation     │
│  • Access to all resources           • Cannot own land privately           │
│  • Freedom of occupation                                                    │
│  • Freedom of movement                                                      │
│                                                                             │
│  CLASS MOBILITY: Not Applicable                                             │
│  • No classes to move between                                               │
│                                                                             │
│  INTER-CLASS RELATIONS: Not Applicable                                      │
│  • All relationships are peer relationships                                 │
│  • No deference or supplication required                                    │
│  • Marriage between any members allowed                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-005: Relationship Norms Panel

Display partnership and courtship customs.

```typescript
// RelationshipDisplay wraps RelationshipNorms with UI properties
interface RelationshipDisplay {
  norms: RelationshipNorms;            // From culture-system

  // Partnership overview
  partnershipInfo: PartnershipDisplay;

  // Courtship guide
  courtshipGuide: CourtshipDisplay;

  // Dissolution rules
  dissolutionInfo: DissolutionDisplay;

  // Friendship/mentorship norms
  otherBondsInfo: OtherBondsDisplay;
}

interface PartnershipDisplay {
  type: PartnershipType;
  diagram: string;                     // Visual representation
  formationMethod: FormationMethod;
  requirements: string[];
  approvalNeeded: string[];
}

interface CourtshipDisplay {
  rules: CourtshipRules;               // From culture-system
  dosList: string[];
  dontsList: string[];
  giftGuide?: GiftGuideDisplay;
  timeline: CourtshipTimelineDisplay;
}

interface DissolutionDisplay {
  norms: DissolutionNorms;             // From culture-system
  allowed: boolean;
  difficulty: number;
  stigmaLevel: number;
  process: string;
}
```

**Relationships Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RELATIONSHIP NORMS                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PARTNERSHIP TYPE: Monogamy (Free Choice)                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │   👤 ═══════════════════════════════════════════════════════ 👤     │   │
│  │          Lifelong bond between two individuals                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Formation: Individual choice                                               │
│  Initiator: Either party                                                    │
│  Requirements: Mutual consent, of age (100+ years)                          │
│  Approval Needed: Self only (family blessing appreciated)                   │
│                                                                             │
│  COURTSHIP                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Duration: 1-10 years typical                                               │
│  Chaperoned: No                                                             │
│                                                                             │
│  ✓ DO                             ✗ DON'T                                  │
│  • Exchange handcrafted gifts     • Rush the process                       │
│  • Share nature walks             • Pressure for commitment                │
│  • Create art together            • Ignore family introductions            │
│  • Attend festivals as pair       • Gift manufactured items                │
│                                                                             │
│  ROMANTIC EXPECTATIONS                                                      │
│  Love Required: Yes               Fidelity: Expected (100%)                 │
│  Passion: Celebrated privately    Jealousy: Discouraged                    │
│                                                                             │
│  DISSOLUTION                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Allowed: Yes, but rare           Difficulty: ████████░░ High              │
│  Grounds: Mutual agreement, fundamental incompatibility                     │
│  Social Stigma: ████░░░░░░ Moderate                                        │
│  Process: Mediated by elders, period of reflection required                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-006: Values and Taboos Panel

Display cultural values and forbidden behaviors.

```typescript
// ValuesDisplay wraps Value and Taboo arrays with UI properties
interface ValuesDisplay {
  values: Value[];                     // From culture-system
  taboos: Taboo[];                     // From culture-system

  // Value rankings
  valueRankings: ValueRankingDisplay[];

  // Taboo categories
  tabooCategories: TabooCategoryDisplay[];

  // Honor system (if present)
  honorSystem?: HonorSystemDisplay;
}

interface ValueRankingDisplay {
  value: Value;
  rank: number;
  icon: Sprite;
  importanceBar: number;
  enforcementMethod: string;
  examples: string[];
}

interface TabooCategoryDisplay {
  category: string;
  taboos: TabooDisplay[];
}

interface TabooDisplay {
  taboo: Taboo;
  severityIcon: Sprite;
  severityColor: Color;
  punishmentDescription: string;
  exceptionsNote: string;
  hidden: boolean;                     // Requires trust to reveal
}
```

**Values Panel:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VALUES & TABOOS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CORE VALUES                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  1. 🌿 HARMONY WITH NATURE              Importance: ██████████ 100%         │
│     Live in balance with the natural world                                  │
│     Enforced by: Social pressure, spiritual belief                          │
│                                                                             │
│  2. ✨ BEAUTY IN ALL THINGS             Importance: █████████░ 90%          │
│     Create and appreciate aesthetic excellence                              │
│     Enforced by: Social approval/disapproval                                │
│                                                                             │
│  3. ⏳ PATIENCE                          Importance: ████████░░ 85%         │
│     Take time, consider carefully, never rush                               │
│     Enforced by: Elder guidance                                             │
│                                                                             │
│  4. 📜 RESPECT FOR TRADITION             Importance: ████████░░ 80%         │
│     Honor the ways of ancestors                                             │
│     Enforced by: Community elders                                           │
│                                                                             │
│  TABOOS                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ MODERATE: Use of Cold Iron                                              │
│  Punishment: Social disapproval, need for cleansing                         │
│  Exceptions: Dire necessity only                                            │
│                                                                             │
│  🚫 SEVERE: Wanton Destruction of Nature                                    │
│  Punishment: Banishment from community                                      │
│  Exceptions: None                                                           │
│                                                                             │
│  ⚠️ MINOR: Hasty, Ugly Workmanship                                          │
│  Punishment: Loss of reputation                                             │
│  Exceptions: Emergency situations                                           │
│                                                                             │
│  🔒 [2 taboos hidden - increase trust level to reveal]                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-007: Emotion System Panel

Display alien emotional frameworks.

```typescript
// EmotionDisplay for non-human emotional systems
interface EmotionDisplay {
  system: EmotionSystem;               // From culture-system

  // Human comparison
  humanComparison: EmotionComparisonDisplay;

  // Unique emotions
  alienEmotions: AlienEmotionDisplay[];

  // Missing human emotions
  missingEmotions: MissingEmotionDisplay[];

  // Interaction guide
  interactionGuide: EmotionInteractionGuide;
}

interface EmotionComparisonDisplay {
  systemType: EmotionSystemType;
  humanCompatibility: number;          // 0-1
  mainDifferences: string[];
}

interface AlienEmotionDisplay {
  emotion: AlienEmotion;               // From culture-system
  icon: Sprite;
  color: Color;
  humanAnalogNote: string;
  triggerExamples: string[];
  behaviorExamples: string[];
}

interface MissingEmotionDisplay {
  emotion: string;                     // Human emotion they lack
  implication: string;                 // What this means for interaction
  mistakeToAvoid: string;              // Common error other species make
}

interface EmotionInteractionGuide {
  dosList: string[];
  dontsList: string[];
  dangerSigns: string[];
  misunderstandings: PotentialMisunderstanding[];
}

interface PotentialMisunderstanding {
  yourAction: string;
  theirInterpretation: string;
  correctApproach: string;
}
```

**Emotion Panel (Man'chi System - Atevi-inspired):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMOTION SYSTEM                                                ⚠️ ALIEN     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TYPE: Hierarchical (Man'chi-based)                                         │
│  Human Compatibility: ██░░░░░░░░ 20%                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ⚠️ WARNING: This species lacks emotions humans consider fundamental.       │
│     Do not assume your emotional framework applies.                         │
│                                                                             │
│  THEY DO NOT HAVE                  THEY HAVE INSTEAD                        │
│  ─────────────────────────         ─────────────────────────                │
│  ❌ Love (romantic)                ✓ Man'chi (instinctive loyalty)         │
│  ❌ Friendship (platonic)          ✓ Association comfort                    │
│  ❌ Gratitude                      ✓ Advantage-seeking                      │
│  ❌ Guilt                          ✓ Offense state                          │
│  ❌ Empathy                        ✓ Dislocation (when unassociated)       │
│                                                                             │
│  PRIMARY EMOTION: MAN'CHI                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Definition: Instinctive, biological loyalty to a leader                    │
│  NOT a choice - it is how they are neurologically wired                     │
│                                                                             │
│  Triggers: Presence of aiji (lord), threats to association                  │
│  Behaviors: Serve, protect, follow orders, die for lord                     │
│  Intensity: ██████████ Maximum                                             │
│  Controllable: No                                                           │
│                                                                             │
│  INTERACTION GUIDE                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ✓ DO                             ✗ DON'T                                  │
│  • Respect hierarchy              • Assume they like you                   │
│  • Be clear about status          • Offer friendship                       │
│  • Maintain formal relations      • Expect gratitude                       │
│  • Understand service ≠ love      • Show weakness                          │
│                                                                             │
│  DANGER: They may serve you loyally for decades and feel nothing           │
│  like what you would call affection. This is normal for them.              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-CULT-008: Culture Comparison

Compare two cultures side-by-side.

```typescript
interface CultureComparison {
  culture1: Culture;
  culture2: Culture;

  // Comparison areas
  comparisons: CultureComparisonArea[];

  // Compatibility assessment
  compatibility: CompatibilityAssessment;

  // Potential conflicts
  potentialConflicts: ConflictPoint[];

  // Trade/diplomacy implications
  diplomaticNotes: DiplomaticNote[];
}

interface CultureComparisonArea {
  aspect: CultureSection;
  culture1Summary: string;
  culture2Summary: string;
  compatibility: "compatible" | "different" | "conflicting";
  notes: string[];
}

interface CompatibilityAssessment {
  overall: number;                     // 0-1
  tradeCompatibility: number;
  marriageCompatibility: number;
  allianceCompatibility: number;
}

interface ConflictPoint {
  area: string;
  culture1View: string;
  culture2View: string;
  severity: "minor" | "significant" | "major";
  avoidanceStrategy: string;
}
```

---

## Keyboard Shortcuts

```
CULTURE BROWSER CONTROLS:
- U              : Open culture browser
- Escape         : Close
- 1-9            : Jump to section
- C              : Toggle comparison mode
- N              : Add cultural note
- Tab            : Next section
- Shift+Tab      : Previous section
```

---

## State Management

### Culture System Integration

```typescript
interface CultureBrowserState {
  // View state
  isOpen: boolean;
  currentVillageId: string;
  activeSection: CultureSection;

  // Comparison
  comparisonMode: boolean;
  comparisonVillageId: string | null;

  // Knowledge tracking
  cultureKnowledge: Map<string, CultureKnowledge>;

  // Player notes
  culturalNotes: Map<string, string[]>;

  // Events
  onCultureLearned: Event<{ villageId: string; aspect: CultureSection }>;
  onTabooRevealed: Event<{ villageId: string; taboo: Taboo }>;
}
```

---

## Open Questions

1. Should players be able to adopt cultural practices from other cultures?
2. Cultural drift visualization over time?
3. Integration with agent relationship system for cultural compatibility?
4. "Culture shock" mechanics when visiting very different cultures?
5. Hybrid cultures from mixed-species villages?

---

## Related Specs

- `agent-system/culture-system.md` - Source system spec
- `agent-system/species-system.md` - Species constraints on culture
- `governance-system/spec.md` - Governance integration
- `ui-system/agent-roster.md` - Individual agent cultural context
