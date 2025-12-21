# Culture System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Culture defines how a society organizes itself within the biological constraints of its species. Two elf villages might have radically different cultures - one egalitarian forest commune, another rigid caste-based aristocracy. Culture shapes relationship norms, parenting practices, economic systems, gender roles, class structures, and values.

Inspired by anthropological diversity and speculative fiction (Le Guin, Banks, Butler, Cherryh), cultures can range from familiar to genuinely alien.

---

## Culture Architecture

### Core Interface

```typescript
interface Culture {
  id: string;
  name: string;
  description: string;

  // Species and location
  primarySpecies: string;
  secondarySpecies?: string[];   // Multi-species cultures
  originPlanet?: string;

  // Core structures
  kinshipSystem: KinshipSystem;
  genderSystem: GenderSystem;
  classSystem: ClassSystem;
  economicSystem: EconomicSystem;
  governanceSystem: GovernanceSystem;

  // Social norms
  relationshipNorms: RelationshipNorms;
  parentingNorms: ParentingNorms;
  lifeTransitionRituals: LifeRituals;

  // Values and taboos
  coreValues: Value[];
  taboos: Taboo[];
  honorSystem?: HonorSystem;

  // Inter-group relations
  foreignRelations: ForeignRelationDefaults;

  // Time and cosmology
  timePerception: TimePerception;
  cosmology: Cosmology;

  // Expression
  aesthetics: AestheticPreferences;
  language: LanguageProfile;
}
```

---

## Kinship Systems

How family and lineage are structured.

```typescript
interface KinshipSystem {
  type: KinshipType;

  // Descent
  descent: DescentType;
  inheritanceLine: InheritanceLine;

  // Naming
  namingConvention: NamingConvention;

  // Family structure
  householdType: HouseholdType;
  extendedFamilyImportance: number;  // 0-1

  // Obligations
  kinObligations: KinObligation[];
}

type KinshipType =
  | "nuclear"            // Parent(s) + children
  | "extended"           // Multiple generations together
  | "clan"               // Large kin groups with shared identity
  | "lineage"            // Traced descent from common ancestor
  | "moiety"             // Society split into two intermarrying halves
  | "house"              // Noble houses (Game of Thrones style)
  | "hive"               // No individual kinship, all are "family"
  | "chosen"             // Kinship is chosen, not blood
  | "fluid";             // Kinship changes over time

type DescentType =
  | "bilateral"          // Both parents equally (most humans)
  | "patrilineal"        // Father's line
  | "matrilineal"        // Mother's line
  | "ambilineal"         // Choice of either line
  | "double"             // Different things inherited from each
  | "none";              // No descent tracking

type InheritanceLine =
  | "primogeniture"      // Eldest child
  | "ultimogeniture"     // Youngest child
  | "partible"           // Split among children
  | "merit"              // Most capable inherits
  | "communal"           // Group owns, no individual inheritance
  | "rotating"           // Passes through roles/positions
  | "none";              // Nothing inherited

type HouseholdType =
  | "nuclear"            // Parents + children
  | "extended"           // Multiple generations
  | "polygynous"         // One male, multiple females
  | "polyandrous"        // One female, multiple males
  | "group"              // Multiple adults, collective
  | "dormitory"          // Gendered/age-based housing
  | "solitary"           // Adults live alone
  | "communal";          // Whole village is household

interface KinObligation {
  from: KinRole;
  to: KinRole;
  type: "support" | "obedience" | "protection" | "teaching" | "vengeance";
  strength: number;      // 0-1
  breakable: boolean;
}

type KinRole =
  | "parent" | "child" | "sibling"
  | "grandparent" | "grandchild"
  | "aunt_uncle" | "niece_nephew" | "cousin"
  | "spouse" | "in_law"
  | "clan_elder" | "clan_member"
  | "house_head" | "house_member";
```

### Example Kinship Systems

```typescript
const matriarchalClan: KinshipSystem = {
  type: "clan",
  descent: "matrilineal",
  inheritanceLine: "primogeniture",  // Eldest daughter
  namingConvention: {
    pattern: "{given} of {mother's_clan}",
    inheritedFrom: "mother",
  },
  householdType: "extended",
  extendedFamilyImportance: 0.9,
  kinObligations: [
    { from: "child", to: "parent", type: "obedience", strength: 0.9, breakable: false },
    { from: "clan_member", to: "clan_elder", type: "obedience", strength: 0.8, breakable: false },
    { from: "parent", to: "child", type: "protection", strength: 1.0, breakable: false },
  ],
};

const chosenFamily: KinshipSystem = {
  type: "chosen",
  descent: "none",
  inheritanceLine: "merit",
  namingConvention: {
    pattern: "{given} {chosen_epithet}",
    inheritedFrom: "self",
  },
  householdType: "group",
  extendedFamilyImportance: 0.3,
  kinObligations: [
    { from: "all", to: "all", type: "support", strength: 0.7, breakable: true },
  ],
};

const hiveKinship: KinshipSystem = {
  type: "hive",
  descent: "none",               // All children of the Queen
  inheritanceLine: "none",       // Nothing personal to inherit
  namingConvention: {
    pattern: "{role}-{batch}-{number}",
    inheritedFrom: "role",
  },
  householdType: "communal",
  extendedFamilyImportance: 1.0, // Hive IS family
  kinObligations: [
    { from: "all", to: "queen", type: "obedience", strength: 1.0, breakable: false },
    { from: "all", to: "hive", type: "support", strength: 1.0, breakable: false },
  ],
};
```

---

## Gender Systems

Gender can be far more varied than binary.

```typescript
interface GenderSystem {
  type: GenderSystemType;
  genders: GenderDefinition[];

  // Role assignment
  roleAssignment: RoleAssignment;
  genderExpression: GenderExpressionNorms;

  // Transitions
  genderMobility: GenderMobility;
  transitionRituals?: TransitionRitual[];
}

type GenderSystemType =
  | "binary_fixed"       // Two genders, assigned at birth, permanent
  | "binary_flexible"    // Two genders, some mobility
  | "ternary"            // Three genders
  | "multiple"           // Many recognized genders
  | "sequential"         // Gender changes with life stage (Le Guin's Gethenians)
  | "contextual"         // Gender depends on context/relationship
  | "fluid"              // Individual choice, changeable
  | "none";              // Gender not recognized as concept

interface GenderDefinition {
  id: string;
  name: string;
  description: string;

  // Biological correlation (if any)
  biologicalBasis?: string;  // "bearing", "siring", or null

  // Social role
  typicalRoles: string[];
  restrictedFrom?: string[];

  // Presentation
  typicalPresentation: PresentationNorms;

  // Population
  prevalence: number;       // Percentage of population
}

interface GenderMobility {
  canChange: boolean;
  triggers?: string[];      // What enables change
  socialCost: number;       // 0-1, cost of changing
  frequency: "once" | "cyclical" | "free" | "never";
}
```

### Example Gender Systems

```typescript
// Le Guin's Gethenians - ambisexual
const kemmerGender: GenderSystem = {
  type: "sequential",
  genders: [
    {
      id: "somer",
      name: "Somer",
      description: "Default state - sexually latent, neither male nor female",
      typicalRoles: ["all"],
      prevalence: 0.9,     // Most of the time
    },
    {
      id: "kemmer_female",
      name: "Kemmer (bearing)",
      description: "During kemmer, manifests as female",
      biologicalBasis: "bearing",
      typicalRoles: ["all"],
      prevalence: 0.05,
    },
    {
      id: "kemmer_male",
      name: "Kemmer (siring)",
      description: "During kemmer, manifests as male",
      biologicalBasis: "siring",
      typicalRoles: ["all"],
      prevalence: 0.05,
    },
  ],
  roleAssignment: "none",  // No gendered roles
  genderExpression: { enforced: false, markers: [] },
  genderMobility: {
    canChange: true,
    triggers: ["kemmer_cycle"],
    socialCost: 0,
    frequency: "cyclical",
  },
};

// Insectoid caste-as-gender
const hiveCaste: GenderSystem = {
  type: "multiple",
  genders: [
    { id: "queen", name: "Queen", biologicalBasis: "bearing", typicalRoles: ["ruling", "breeding"], prevalence: 0.001 },
    { id: "drone", name: "Drone", biologicalBasis: "siring", typicalRoles: ["mating"], prevalence: 0.05 },
    { id: "worker", name: "Worker", biologicalBasis: null, typicalRoles: ["labor", "building"], prevalence: 0.7 },
    { id: "soldier", name: "Soldier", biologicalBasis: null, typicalRoles: ["defense"], prevalence: 0.2 },
    { id: "tender", name: "Tender", biologicalBasis: null, typicalRoles: ["nursery", "care"], prevalence: 0.05 },
  ],
  roleAssignment: "biological",  // Determined at birth
  genderExpression: { enforced: true, markers: ["body_type", "pheromones"] },
  genderMobility: { canChange: false, socialCost: 1, frequency: "never" },
};

// Fluid human culture
const genderFluid: GenderSystem = {
  type: "fluid",
  genders: [
    { id: "any", name: "Self-defined", description: "Gender is personal", prevalence: 1.0 },
  ],
  roleAssignment: "choice",
  genderExpression: { enforced: false, markers: [] },
  genderMobility: { canChange: true, socialCost: 0, frequency: "free" },
};
```

---

## Class Systems

Social stratification and mobility.

```typescript
interface ClassSystem {
  type: ClassSystemType;
  classes: SocialClass[];

  // Mobility
  mobility: ClassMobility;

  // Markers
  classMarkers: ClassMarker[];

  // Economic impact
  economicInequality: number;  // 0-1 (Gini coefficient style)

  // Inter-class relations
  interClassRelations: InterClassNorms;
}

type ClassSystemType =
  | "egalitarian"        // No classes
  | "meritocratic"       // Status by achievement
  | "hereditary_caste"   // Birth determines, no mobility
  | "hereditary_class"   // Birth influences, some mobility
  | "wealth_based"       // Money determines status
  | "age_based"          // Elders have status
  | "skill_based"        // Mastery determines status
  | "divine"             // Religious status
  | "species_based";     // Species determines class

interface SocialClass {
  id: string;
  name: string;
  description: string;

  // Position
  tier: number;          // 0 = lowest, higher = higher status
  population: number;    // Percentage

  // Privileges and restrictions
  privileges: string[];
  restrictions: string[];
  occupations: string[];  // Allowed/typical jobs

  // Economics
  wealthRange: { min: number; max: number };
  taxRate: number;

  // Requirements
  requirements?: ClassRequirement[];  // How to be in this class
}

interface ClassMobility {
  possible: boolean;
  difficulty: number;    // 0-1
  mechanisms: string[];  // How mobility happens
  generational: boolean; // Can children move up?
}

interface InterClassNorms {
  upperToLower: {
    attitude: "contempt" | "paternalism" | "respect" | "fear" | "indifference";
    interaction: "forbidden" | "formal" | "casual" | "none";
  };
  lowerToUpper: {
    attitude: "resentment" | "deference" | "aspiration" | "indifference";
    interaction: "forbidden" | "supplication" | "formal" | "casual";
  };
  marriage: "forbidden" | "rare" | "unusual" | "common" | "required";
}
```

### Example Class Systems

```typescript
const feudalCaste: ClassSystem = {
  type: "hereditary_caste",
  classes: [
    {
      id: "royalty",
      name: "Royalty",
      tier: 5,
      population: 0.001,
      privileges: ["rule", "taxation", "justice"],
      restrictions: ["manual_labor"],
      occupations: ["ruler", "general", "high_priest"],
      wealthRange: { min: 100000, max: Infinity },
      taxRate: 0,
    },
    {
      id: "nobility",
      name: "Nobility",
      tier: 4,
      population: 0.02,
      privileges: ["land_ownership", "titles", "arms"],
      restrictions: ["trade", "manual_labor"],
      occupations: ["knight", "lord", "advisor"],
      wealthRange: { min: 10000, max: 100000 },
      taxRate: 0.1,
    },
    {
      id: "merchant",
      name: "Merchant Class",
      tier: 3,
      population: 0.08,
      privileges: ["trade", "property"],
      restrictions: ["titles", "ruling"],
      occupations: ["merchant", "banker", "craftmaster"],
      wealthRange: { min: 1000, max: 50000 },
      taxRate: 0.2,
    },
    {
      id: "commoner",
      name: "Commoner",
      tier: 2,
      population: 0.7,
      privileges: ["work", "limited_property"],
      restrictions: ["land_ownership", "arms", "education"],
      occupations: ["farmer", "craftsman", "laborer"],
      wealthRange: { min: 10, max: 1000 },
      taxRate: 0.4,
    },
    {
      id: "serf",
      name: "Serf",
      tier: 1,
      population: 0.2,
      privileges: [],
      restrictions: ["movement", "property", "marriage_choice"],
      occupations: ["field_labor", "servant"],
      wealthRange: { min: 0, max: 100 },
      taxRate: 0.8,
    },
  ],
  mobility: {
    possible: false,
    difficulty: 1.0,
    mechanisms: [],
    generational: false,
  },
  classMarkers: [
    { type: "clothing", enforced: true },
    { type: "speech_patterns", enforced: false },
    { type: "housing_area", enforced: true },
  ],
  economicInequality: 0.9,
  interClassRelations: {
    upperToLower: { attitude: "contempt", interaction: "formal" },
    lowerToUpper: { attitude: "deference", interaction: "supplication" },
    marriage: "forbidden",
  },
};

const anarchistCommune: ClassSystem = {
  type: "egalitarian",
  classes: [
    {
      id: "member",
      name: "Community Member",
      tier: 1,
      population: 1.0,
      privileges: ["all"],
      restrictions: [],
      occupations: ["all"],
      wealthRange: { min: 0, max: 0 },  // No personal wealth
      taxRate: 0,  // No taxation, communal resources
    },
  ],
  mobility: { possible: false, difficulty: 0, mechanisms: [], generational: false },
  classMarkers: [],
  economicInequality: 0,
  interClassRelations: {
    upperToLower: { attitude: "respect", interaction: "casual" },
    lowerToUpper: { attitude: "respect", interaction: "casual" },
    marriage: "common",
  },
};

// Le Guin's Odonians (The Dispossessed)
const odonianAnarchism: ClassSystem = {
  type: "egalitarian",
  classes: [{ id: "sibling", name: "Sibling", tier: 1, population: 1.0,
              privileges: ["all"], restrictions: ["property", "profit"],
              occupations: ["all"], wealthRange: { min: 0, max: 0 }, taxRate: 0 }],
  mobility: { possible: false, difficulty: 0, mechanisms: [], generational: false },
  classMarkers: [],
  economicInequality: 0.05,
  interClassRelations: {
    upperToLower: { attitude: "respect", interaction: "casual" },
    lowerToUpper: { attitude: "respect", interaction: "casual" },
    marriage: "common",
  },
};
```

---

## Relationship Norms

How relationships form and function.

```typescript
interface RelationshipNorms {
  // Partnership structure
  partnershipType: PartnershipType;
  partnershipFormation: FormationNorms;
  partnershipDissolution: DissolutionNorms;

  // Romantic norms
  courtshipRules: CourtshipRules;
  romanticExpectations: RomanticExpectations;

  // Non-romantic bonds
  friendshipNorms: FriendshipNorms;
  mentorshipNorms: MentorshipNorms;

  // Inter-species (if applicable)
  interSpeciesRelations?: InterSpeciesNorms;
}

type PartnershipType =
  | "monogamy"           // One partner
  | "serial_monogamy"    // One at a time, but partners change
  | "polygyny"           // One male, multiple females
  | "polyandry"          // One female, multiple males
  | "polygamy"           // Multiple partners any configuration
  | "group_marriage"     // Group partnership
  | "temporary_bond"     // Partnerships have set duration
  | "breeding_only"      // Partnership only for reproduction
  | "none";              // No recognized partnerships

interface FormationNorms {
  method: FormationMethod;
  initiator?: string;    // Who initiates (gender/class/age)
  requirements: string[];
  approvalNeeded: string[];  // Family, elders, self only
  rituals: string[];
  minimumAge: number;
  maximumAgeDifference?: number;
  classRestrictions?: string;
  speciesRestrictions?: string;
}

type FormationMethod =
  | "individual_choice"  // Free choice
  | "family_arranged"    // Families negotiate
  | "elder_assigned"     // Elders assign
  | "random"             // Lottery or similar
  | "trial_period"       // Live together first, then formalize
  | "contest"            // Competition determines
  | "purchase"           // Bride price or dowry
  | "capture"            // Raiding/capture (goblins, orcs)
  | "chemical";          // Pheromone-based matching

interface DissolutionNorms {
  allowed: boolean;
  difficulty: number;    // 0-1
  grounds: string[];     // Acceptable reasons
  initiator?: string;    // Who can initiate
  process: string;       // How it happens
  stigma: number;        // 0-1, social cost
  childCustody: string;  // How children handled
  propertyDivision: string;
}

interface CourtshipRules {
  duration: { min: number; max: number };  // In days
  chaperoned: boolean;
  giftGiving: GiftExpectations;
  physicalContact: string;  // "forbidden", "limited", "free"
  publicDisplay: string;    // "forbidden", "subtle", "expected"
  tests: string[];          // Trials to prove worth
}

interface RomanticExpectations {
  loveRequired: boolean;    // Must love to partner?
  loveExpected: boolean;    // Should love develop?
  passionNorms: string;     // "suppressed", "private", "celebrated"
  fidelityExpectation: number;  // 0-1
  jealousyNorms: string;    // "forbidden", "tolerated", "expected"
}
```

### Example Relationship Norms

```typescript
const arrangedHierarchy: RelationshipNorms = {
  partnershipType: "monogamy",
  partnershipFormation: {
    method: "family_arranged",
    initiator: "family_elders",
    requirements: ["compatible_class", "family_approval", "dowry"],
    approvalNeeded: ["both_families", "clan_elder"],
    rituals: ["betrothal_ceremony", "wedding"],
    minimumAge: 16,
    classRestrictions: "same_class_or_adjacent",
  },
  partnershipDissolution: {
    allowed: false,
    difficulty: 1.0,
    grounds: ["infertility", "treason"],
    initiator: "husband_only",
    process: "elder_council_approval",
    stigma: 0.9,
    childCustody: "father",
    propertyDivision: "stays_with_husband",
  },
  courtshipRules: {
    duration: { min: 30, max: 90 },
    chaperoned: true,
    giftGiving: { required: true, fromWhom: "suitor", value: "high" },
    physicalContact: "forbidden",
    publicDisplay: "forbidden",
    tests: ["family_lineage_check", "wealth_verification"],
  },
  romanticExpectations: {
    loveRequired: false,
    loveExpected: false,  // Grows over time, maybe
    passionNorms: "suppressed",
    fidelityExpectation: 1.0,  // Absolute
    jealousyNorms: "expected",
  },
  friendshipNorms: {
    sameGenderPreferred: true,
    crossClassAllowed: false,
  },
  mentorshipNorms: {
    formal: true,
    duration: "years",
    obligations: "lifelong",
  },
};

const freeCommune: RelationshipNorms = {
  partnershipType: "polygamy",
  partnershipFormation: {
    method: "individual_choice",
    initiator: "any",
    requirements: ["mutual_consent"],
    approvalNeeded: ["self_only"],
    rituals: ["simple_declaration"],
    minimumAge: 18,
  },
  partnershipDissolution: {
    allowed: true,
    difficulty: 0.1,
    grounds: ["any"],
    initiator: "either",
    process: "declaration",
    stigma: 0,
    childCustody: "communal",
    propertyDivision: "communal_anyway",
  },
  courtshipRules: {
    duration: { min: 0, max: Infinity },
    chaperoned: false,
    giftGiving: { required: false },
    physicalContact: "free",
    publicDisplay: "expected",
    tests: [],
  },
  romanticExpectations: {
    loveRequired: true,
    loveExpected: true,
    passionNorms: "celebrated",
    fidelityExpectation: 0.3,  // Not expected
    jealousyNorms: "forbidden",  // Jealousy is a personal failing
  },
  friendshipNorms: {
    sameGenderPreferred: false,
    crossClassAllowed: true,  // No classes
  },
  mentorshipNorms: {
    formal: false,
    duration: "as_needed",
    obligations: "none",
  },
};

const goblinChaos: RelationshipNorms = {
  partnershipType: "breeding_only",
  partnershipFormation: {
    method: "contest",
    initiator: "strongest",
    requirements: ["victory_in_combat"],
    approvalNeeded: [],
    rituals: [],
    minimumAge: 4,  // Goblins mature fast
  },
  partnershipDissolution: {
    allowed: true,  // By death or defeat
    difficulty: 0.5,
    grounds: ["defeat", "boredom", "death"],
    initiator: "anyone",
    process: "fight_or_leave",
    stigma: 0,
    childCustody: "communal_crèche",
    propertyDivision: "winner_takes_all",
  },
  courtshipRules: {
    duration: { min: 0, max: 1 },
    chaperoned: false,
    giftGiving: { required: false },
    physicalContact: "aggressive",
    publicDisplay: "expected",
    tests: ["combat", "theft_success"],
  },
  romanticExpectations: {
    loveRequired: false,
    loveExpected: false,
    passionNorms: "violent",
    fidelityExpectation: 0,
    jealousyNorms: "expected",  // Leads to fights, good entertainment
  },
};
```

---

## Parenting Norms

How children are raised.

```typescript
interface ParentingNorms {
  // Who parents
  parentingStructure: ParentingStructure;
  primaryCaregiver: CaregiverRole;
  caregiverNetwork: string[];

  // How parenting works
  attachmentStyle: AttachmentStyle;
  disciplineApproach: DisciplineApproach;
  educationApproach: EducationApproach;

  // Life stages
  infancyCare: InfancyCare;
  childhoodRearing: ChildhoodRearing;
  adolescentTraining: AdolescentTraining;

  // Values transmission
  valuesTransmission: ValuesTransmission;

  // Class differences
  classDifferences?: Map<string, ParentingVariation>;
}

type ParentingStructure =
  | "nuclear_biparental"     // Mother + father
  | "nuclear_single"         // Single parent
  | "extended_family"        // Grandparents, aunts, uncles
  | "communal"               // Whole community parents
  | "institutional"          // Crèche, schools, barracks
  | "apprenticeship"         // Master takes over
  | "none";                  // No parenting (precocial species)

interface CaregiverRole {
  primary: string;           // "mother", "father", "both", "community", etc.
  secondary: string[];
  specialRoles: SpecialCareRole[];
}

interface SpecialCareRole {
  role: string;              // "godparent", "naming_elder", "milk_sibling"
  responsibilities: string[];
  duration: string;
  selectionMethod: string;
}

type AttachmentStyle =
  | "intensive"              // Constant contact, high responsiveness
  | "attentive"              // Regular contact, responsive
  | "supervised"             // Oversight but not constant
  | "distant"                // Minimal emotional bonding
  | "competitive"            // Siblings/cohort compete for attention
  | "collective";            // Bonded to group, not individuals

interface DisciplineApproach {
  style: "authoritarian" | "authoritative" | "permissive" | "neglectful" | "communal";
  physicalPunishment: boolean;
  shaming: boolean;
  rewards: string[];
  enforcers: string[];       // Who disciplines
}

interface EducationApproach {
  method: "formal_school" | "home_teaching" | "apprenticeship" | "observation" | "trial_error" | "genetic_memory";
  startAge: number;
  compulsory: boolean;
  duration: number;          // Years
  specialization: number;    // Age when specialization begins
  classAccess: Map<string, string>;  // Class -> education level
}

interface InfancyCare {
  nursing: NursingNorms;
  sleeping: SleepingArrangement;
  carrying: CarryingNorms;
  responsiveness: number;    // 0-1, how quickly needs met
  namedAt: number;           // Age when named (days)
  presentedAt?: number;      // Age when presented to community
}

interface NursingNorms {
  method: "maternal" | "wet_nurse" | "communal" | "formula" | "regurgitation" | "none";
  duration: number;          // Months
  weaningProcess: string;
}

interface ChildhoodRearing {
  playImportance: number;    // 0-1
  workStart: number;         // Age when work begins
  workType: string[];        // What work children do
  peerGrouping: string;      // "age", "gender", "mixed", "family"
  freedomLevel: number;      // 0-1
  dangerExposure: number;    // 0-1, supervised vs trial by fire
}

interface AdolescentTraining {
  initiationRitual?: InitiationRitual;
  apprenticeshipRequired: boolean;
  militaryService?: boolean;
  marriageTraining: boolean;
  independenceAge: number;
  roleSelection: "assigned" | "chosen" | "tested" | "inherited";
}

interface InitiationRitual {
  name: string;
  age: number;
  duration: number;          // Days
  challenges: string[];
  markers: string[];         // Tattoos, scars, clothing changes
  failureConsequence: string;
}
```

### Example Parenting Norms

```typescript
const elficNurturing: ParentingNorms = {
  parentingStructure: "nuclear_biparental",
  primaryCaregiver: {
    primary: "both",
    secondary: ["extended_family", "nature_spirits"],
    specialRoles: [
      { role: "name_giver", responsibilities: ["naming_ceremony", "prophecy"],
        duration: "one_day", selectionMethod: "eldest_relative" },
    ],
  },
  attachmentStyle: "intensive",
  disciplineApproach: {
    style: "authoritative",
    physicalPunishment: false,
    shaming: false,
    rewards: ["praise", "nature_experiences", "craft_materials"],
    enforcers: ["parents", "community_elders"],
  },
  educationApproach: {
    method: "home_teaching",
    startAge: 10,
    compulsory: true,
    duration: 90,            // 90 years of education
    specialization: 50,
    classAccess: new Map([["all", "full"]]),
  },
  infancyCare: {
    nursing: { method: "maternal", duration: 60, weaningProcess: "gradual_over_years" },
    sleeping: { arrangement: "family_bed", duration: 20 },  // 20 years
    carrying: { method: "constant", duration: 5 },
    responsiveness: 1.0,
    namedAt: 365,            // Named after first year
    presentedAt: 730,        // Presented at 2 years
  },
  childhoodRearing: {
    playImportance: 0.9,
    workStart: 30,
    workType: ["gardening", "music", "light_crafts"],
    peerGrouping: "mixed",
    freedomLevel: 0.8,
    dangerExposure: 0.2,
  },
  adolescentTraining: {
    initiationRitual: {
      name: "First Blossoming",
      age: 100,
      duration: 30,
      challenges: ["solo_forest_journey", "craft_masterwork", "song_composition"],
      markers: ["earned_name_addition", "adult_clothing"],
      failureConsequence: "retry_in_ten_years",
    },
    apprenticeshipRequired: true,
    independenceAge: 120,
    roleSelection: "chosen",
  },
  valuesTransmission: {
    method: "storytelling",
    timing: "daily",
    key_values: ["harmony", "beauty", "patience", "nature_connection"],
  },
};

const goblinSurvival: ParentingNorms = {
  parentingStructure: "communal",
  primaryCaregiver: {
    primary: "crèche_tenders",
    secondary: ["older_whelps"],
    specialRoles: [],
  },
  attachmentStyle: "competitive",
  disciplineApproach: {
    style: "neglectful",
    physicalPunishment: true,
    shaming: true,
    rewards: ["food", "not_being_hit"],
    enforcers: ["anyone_stronger"],
  },
  educationApproach: {
    method: "trial_error",
    startAge: 0.5,           // Start learning immediately
    compulsory: false,       // Learn or die
    duration: 4,
    specialization: 2,
    classAccess: new Map([["all", "survival"]]),
  },
  infancyCare: {
    nursing: { method: "communal", duration: 2, weaningProcess: "abrupt" },
    sleeping: { arrangement: "pile", duration: 0.5 },
    carrying: { method: "minimal", duration: 0.1 },
    responsiveness: 0.2,
    namedAt: 30,             // If you survive a month
    presentedAt: 0,          // No ceremony
  },
  childhoodRearing: {
    playImportance: 0.4,     // Play is combat training
    workStart: 1,
    workType: ["scavenging", "trap_setting", "fighting"],
    peerGrouping: "age_cohort",
    freedomLevel: 0.9,
    dangerExposure: 0.9,     // Danger is the teacher
  },
  adolescentTraining: {
    initiationRitual: {
      name: "Blood Trial",
      age: 6,
      duration: 1,
      challenges: ["kill_something", "survive_night_alone", "steal_from_elder"],
      markers: ["first_scar", "weapon_right"],
      failureConsequence: "eaten",
    },
    apprenticeshipRequired: false,
    independenceAge: 6,
    roleSelection: "tested",  // Proved by combat
  },
  valuesTransmission: {
    method: "example",
    timing: "constant",
    key_values: ["cunning", "strength", "loyalty_to_pack", "survival"],
  },
};

const hiveNursery: ParentingNorms = {
  parentingStructure: "institutional",
  primaryCaregiver: {
    primary: "tender_caste",
    secondary: [],
    specialRoles: [
      { role: "role_assigner", responsibilities: ["determining_caste"],
        duration: "at_metamorphosis", selectionMethod: "specialized_tender" },
    ],
  },
  attachmentStyle: "collective",
  disciplineApproach: {
    style: "authoritarian",
    physicalPunishment: false,
    shaming: false,
    rewards: ["pheromone_approval"],
    enforcers: ["tenders", "queen_pheromones"],
  },
  educationApproach: {
    method: "genetic_memory",
    startAge: 0,
    compulsory: true,
    duration: 5,
    specialization: 2,       // Caste assigned at nymph stage
    classAccess: new Map([["all", "caste_appropriate"]]),
  },
  infancyCare: {
    nursing: { method: "regurgitation", duration: 0.5, weaningProcess: "developmental" },
    sleeping: { arrangement: "nursery_cells", duration: 2 },
    carrying: { method: "none", duration: 0 },
    responsiveness: 0.8,     // Tenders are attentive
    namedAt: 0,              // No individual names
    presentedAt: 0,          // No ceremony
  },
  childhoodRearing: {
    playImportance: 0,       // No play, only training
    workStart: 0.5,          // Work immediately after metamorphosis
    workType: ["caste_duties"],
    peerGrouping: "batch_cohort",
    freedomLevel: 0,
    dangerExposure: 0.1,     // Protected in hive
  },
  adolescentTraining: {
    initiationRitual: {
      name: "Role Acceptance",
      age: 5,
      duration: 0,
      challenges: [],
      markers: ["caste_pheromone_production"],
      failureConsequence: "reassignment_or_recycling",
    },
    apprenticeshipRequired: false,  // Instinct-based
    independenceAge: 5,
    roleSelection: "assigned",
  },
  valuesTransmission: {
    method: "pheromone",
    timing: "constant",
    key_values: ["hive_above_self", "efficiency", "role_fulfillment"],
  },
};

// Class-differentiated parenting in feudal society
const feudalParenting: ParentingNorms = {
  parentingStructure: "nuclear_biparental",
  primaryCaregiver: { primary: "varies_by_class", secondary: [], specialRoles: [] },
  attachmentStyle: "varies",
  disciplineApproach: { style: "authoritarian", physicalPunishment: true, shaming: true, rewards: [], enforcers: ["father"] },
  educationApproach: { method: "varies", startAge: 6, compulsory: false, duration: 10, specialization: 10,
    classAccess: new Map([
      ["royalty", "tutors_full"],
      ["nobility", "tutors_martial_courtly"],
      ["merchant", "apprenticeship"],
      ["commoner", "work_training"],
      ["serf", "none"],
    ])
  },
  infancyCare: { nursing: { method: "varies", duration: 12, weaningProcess: "standard" },
                 sleeping: { arrangement: "varies", duration: 2 },
                 carrying: { method: "varies", duration: 0.5 },
                 responsiveness: 0.5, namedAt: 7, presentedAt: 30 },
  childhoodRearing: { playImportance: 0.5, workStart: 7, workType: ["class_appropriate"],
                      peerGrouping: "class", freedomLevel: 0.3, dangerExposure: 0.4 },
  adolescentTraining: { apprenticeshipRequired: true, independenceAge: 16, roleSelection: "inherited" },
  valuesTransmission: { method: "instruction", timing: "formal", key_values: ["duty", "honor", "obedience"] },
  classDifferences: new Map([
    ["royalty", { wetNurse: true, tutors: true, playImportance: 0.7, workStart: 14 }],
    ["nobility", { wetNurse: true, tutors: true, playImportance: 0.6, workStart: 12 }],
    ["merchant", { wetNurse: false, tutors: false, apprenticeship: true, workStart: 10 }],
    ["commoner", { wetNurse: false, tutors: false, workStart: 6, playImportance: 0.2 }],
    ["serf", { wetNurse: false, tutors: false, workStart: 4, playImportance: 0.1 }],
  ]),
};
```

---

## Economic Systems

How resources are produced, distributed, and owned.

```typescript
interface EconomicSystem {
  type: EconomicType;

  // Ownership
  ownershipNorms: OwnershipNorms;
  propertyRights: PropertyRights;

  // Production
  productionModel: ProductionModel;
  laborNorms: LaborNorms;

  // Distribution
  distributionMethod: DistributionMethod;
  wealthAccumulation: WealthAccumulation;

  // Trade
  tradeNorms: CulturalTradeNorms;
}

type EconomicType =
  | "subsistence"        // Just enough to survive
  | "gift_economy"       // Reciprocal giving
  | "barter"             // Trade goods for goods
  | "market"             // Currency-based trade
  | "command"            // Centrally planned
  | "feudal"             // Labor-for-protection
  | "socialist"          // Worker ownership
  | "communist"          // Communal ownership, need-based distribution
  | "raider"             // Take from others
  | "hive";              // All resources belong to collective

interface OwnershipNorms {
  personalProperty: boolean;     // Toothbrush, clothes
  privateProperty: boolean;      // Means of production
  landOwnership: string;         // "individual", "clan", "village", "none"
  inheritableProperty: boolean;
  genderPropertyRights: string;
}

interface LaborNorms {
  workExpectation: number;       // Hours per day
  genderedLabor: boolean;
  childLabor: { allowed: boolean; startAge: number };
  laborCoercion: string;         // "none", "social", "economic", "physical"
  craftGuilds: boolean;
  specializations: string;       // "rigid", "flexible", "none"
}

interface DistributionMethod {
  primary: "market" | "central" | "need" | "equal" | "hierarchy" | "strength";
  surplusHandling: string;
  scarcityResponse: string;
}
```

---

## Values and Taboos

What the culture considers good and forbidden.

```typescript
interface Value {
  id: string;
  name: string;
  description: string;
  importance: number;        // 0-1
  appliesTo: string[];       // Classes/genders/ages
  enforcedBy: string;        // "social", "religious", "legal", "supernatural"
}

interface Taboo {
  id: string;
  name: string;
  description: string;
  severity: TabooSeverity;
  appliesTo: string[];
  punishment: string;
  exceptions: string[];
}

type TabooSeverity =
  | "minor"              // Mild disapproval
  | "moderate"           // Social sanction
  | "severe"             // Ostracism
  | "absolute"           // Death/banishment
  | "supernatural";      // Divine punishment expected
```

### Example Values and Taboos

```typescript
const elfValues: Value[] = [
  { id: "harmony", name: "Harmony with Nature", importance: 1.0,
    appliesTo: ["all"], enforcedBy: "social" },
  { id: "beauty", name: "Beauty in All Things", importance: 0.9,
    appliesTo: ["all"], enforcedBy: "social" },
  { id: "patience", name: "Patience", importance: 0.85,
    appliesTo: ["all"], enforcedBy: "social" },
  { id: "tradition", name: "Respect for Tradition", importance: 0.8,
    appliesTo: ["all"], enforcedBy: "elders" },
];

const elfTaboos: Taboo[] = [
  { id: "iron_use", name: "Use of Cold Iron", severity: "moderate",
    appliesTo: ["all"], punishment: "social_disapproval", exceptions: ["dire_necessity"] },
  { id: "nature_destruction", name: "Wanton Destruction of Nature", severity: "severe",
    appliesTo: ["all"], punishment: "banishment", exceptions: ["none"] },
  { id: "rushed_craft", name: "Hasty, Ugly Workmanship", severity: "minor",
    appliesTo: ["crafters"], punishment: "loss_of_reputation", exceptions: ["emergency"] },
];

const goblinValues: Value[] = [
  { id: "cunning", name: "Cunning", importance: 1.0,
    appliesTo: ["all"], enforcedBy: "survival" },
  { id: "strength", name: "Strength", importance: 0.9,
    appliesTo: ["all"], enforcedBy: "combat" },
  { id: "pack_loyalty", name: "Loyalty to Pack", importance: 0.8,
    appliesTo: ["all"], enforcedBy: "pack_violence" },
];

const goblinTaboos: Taboo[] = [
  { id: "weakness", name: "Showing Weakness", severity: "severe",
    appliesTo: ["all"], punishment: "exploitation_or_death", exceptions: ["to_stronger_ally"] },
  { id: "waste_food", name: "Wasting Food", severity: "moderate",
    appliesTo: ["all"], punishment: "beaten", exceptions: ["none"] },
  { id: "betraying_pack", name: "Betraying Pack to Outsiders", severity: "absolute",
    appliesTo: ["all"], punishment: "death", exceptions: ["none"] },
];
```

---

## Alien Psychology and Emotion Systems

Some cultures have fundamentally different emotional frameworks than humans. These aren't just cultural norms - they reflect genuinely different neurological/psychological structures.

### Emotion System Architecture

```typescript
interface EmotionSystem {
  type: EmotionSystemType;
  baseEmotions: AlienEmotion[];
  missingEmotions: string[];          // Human emotions they lack
  incompatibleWith: string[];          // Species that can't understand them
  socialBinding: SocialBindingType;
  decisionInfluence: number;           // 0-1, how much emotions drive action
}

type EmotionSystemType =
  | "human_standard"        // Love, fear, anger, joy, etc.
  | "hierarchical"          // Man'chi - loyalty/dominance based (Cherryh's Atevi)
  | "collective"            // Emotions only meaningful in group context
  | "logical"               // Emotions suppressed/absent
  | "instinctual"           // Raw drives, not processed feelings
  | "alien";                // Unrecognizable to humans

interface AlienEmotion {
  id: string;
  name: string;
  nativeTerm: string;                  // What the species calls it
  humanAnalog?: string;                // Closest human emotion (if any)
  description: string;
  triggers: string[];
  behaviors: string[];
  intensity: number;                   // 0-1 typical intensity
  controllable: boolean;               // Can be suppressed?
}

type SocialBindingType =
  | "love_based"            // Bonds through affection
  | "loyalty_based"         // Bonds through man'chi/fealty
  | "dominance_based"       // Bonds through power hierarchy
  | "utility_based"         // Bonds through mutual benefit
  | "pheromone_based"       // Chemical bonding
  | "hive_based"            // Automatic collective bond
  | "none";                 // No innate social bonding
```

### Man'chi: Loyalty Without Love (Cherryh's Atevi)

A species that lacks love, friendship, and affection entirely. Instead, they have *man'chi* - an instinctive loyalty to a leader.

```typescript
interface ManchiSystem extends EmotionSystem {
  type: "hierarchical";

  // Core concept
  manchi: {
    definition: "Instinctive, biological loyalty to an association leader";
    biological: true;                  // Not a choice - it's how they're wired
    mutable: boolean;                  // Can shift to new leader
    shiftTriggers: string[];           // What causes man'chi to shift
    shiftCost: number;                 // 0-1, psychological cost
  };

  // What they LACK
  missingEmotions: [
    "love",           // No romantic love
    "friendship",     // No platonic affection
    "gratitude",      // No warm feelings from help
    "guilt",          // No guilt from harming non-associates
    "empathy",        // Cannot feel others' feelings
  ];

  // What they HAVE instead
  alternativeEmotions: AlienEmotion[];

  // Implications
  relationships: ManchiRelationships;
  politics: ManchiPolitics;
  dangers: ManchiDangers;
}

const ateviManchi: ManchiSystem = {
  type: "hierarchical",

  manchi: {
    definition: "Instinctive loyalty to aiji (lord) and their association",
    biological: true,
    mutable: true,                     // Can shift, but traumatic
    shiftTriggers: [
      "aiji_death",
      "aiji_proven_unworthy",
      "aiji_betrayal_of_association",
      "new_aiji_proves_superior",
    ],
    shiftCost: 0.9,                    // Devastating to experience
  },

  missingEmotions: ["love", "friendship", "gratitude", "guilt", "empathy"],

  baseEmotions: [
    {
      id: "manchi",
      name: "Man'chi",
      nativeTerm: "man'chi",
      humanAnalog: "loyalty",          // But not chosen, not earned
      description: "Instinctive pull toward one's leader and association",
      triggers: ["presence_of_aiji", "association_matters", "threats_to_lord"],
      behaviors: ["serve", "protect", "follow_orders", "die_for_aiji"],
      intensity: 1.0,
      controllable: false,             // Cannot be suppressed
    },
    {
      id: "advantage",
      name: "Advantage-Seeking",
      nativeTerm: "kabiu",
      humanAnalog: "ambition",
      description: "Drive to improve one's position and association's power",
      triggers: ["opportunity", "weakness_in_rival", "resources_available"],
      behaviors: ["scheme", "position", "accumulate_power"],
      intensity: 0.8,
      controllable: true,
    },
    {
      id: "offense",
      name: "Offense",
      nativeTerm: "feud-state",
      humanAnalog: "righteous_anger",
      description: "State when honor has been insulted requiring response",
      triggers: ["insult_to_association", "broken_agreement", "injury"],
      behaviors: ["formal_challenge", "assassination", "war"],
      intensity: 0.9,
      controllable: false,             // Must be addressed or festers
    },
  ],

  alternativeEmotions: [
    {
      id: "association_comfort",
      name: "Association Comfort",
      nativeTerm: "association-feeling",
      humanAnalog: null,               // No human equivalent
      description: "Rightness of being within one's proper association structure",
      triggers: ["being_among_association", "hierarchy_clear", "aiji_present"],
      behaviors: ["relaxation", "efficiency", "confidence"],
      intensity: 0.7,
      controllable: false,
    },
    {
      id: "dislocation",
      name: "Dislocation",
      nativeTerm: "displacement-feeling",
      humanAnalog: "loneliness",       // But more fundamental
      description: "Agony of being outside proper association structure",
      triggers: ["aiji_death", "exile", "association_dissolved"],
      behaviors: ["seek_new_association", "depression", "death"],
      intensity: 1.0,
      controllable: false,
    },
  ],

  socialBinding: "loyalty_based",
  decisionInfluence: 0.95,             // Almost all decisions are man'chi-driven

  relationships: {
    vertical: "essential",             // Must have someone above or below
    horizontal: "dangerous",           // Equals are potential rivals
    marriage: "political_alliance",    // No love, just strategic
    children: "investment",            // Heirs, not beloved
    strangers: "potential_threat_or_tool",
  },

  politics: {
    primaryMotor: "association_power",
    alliances: "temporary_advantage",
    betrayal: "normal_and_expected",
    assassination: "legal_political_tool",
    democracy: "incomprehensible",     // Why would equals vote?
  },

  dangers: {
    forHumans: [
      "humans_assume_friendship_possible",
      "humans_mistake_service_for_affection",
      "humans_dont_understand_man'chi_shift",
      "humans_offer_equality_which_is_threatening",
    ],
    forAtevi: [
      "human_emotional_volatility_confusing",
      "human_lack_of_clear_hierarchy",
      "human_personal_loyalty_vs_association",
    ],
  },
};

// How this plays in the simulation
interface ManchiGameplay {
  // Agent behavior
  agentHierarchy: {
    mustHaveAiji: true;                // Aiji-less agent is in crisis
    aijiFinding: "urgent_priority";    // Will seek leader immediately
    multipleAssociations: false;       // Cannot serve two masters
  };

  // Relationships
  relationshipType: "vertical_only";   // No "friends", only up or down
  trustConcept: "reliability";         // Do they do their function?
  affectionConcept: null;              // Does not compute

  // Interactions with humans
  crossSpecies: {
    humansCannotHaveManchi: true;      // Humans can't feel it
    humansFakeFriendship: "confusing";
    humanAijiPossible: false;          // Human can't be true lord
    tradeRelations: "transactional";
  };
}
```

### Pure Dominance Hierarchy (Cherryh's Kif)

A species where the ONLY social relationship is dominance/submission. No allies, only subordinates or superiors.

```typescript
interface DominanceSystem extends EmotionSystem {
  type: "hierarchical";

  dominanceMechanics: {
    onlyTwoRoles: ["dominant", "subordinate"];
    showingWeakness: "death";          // Weakness = killed by subordinates
    alliances: "impossible";           // No equals, ever
    trustPossibility: "none";          // Subordinates always looking to rise
  };

  socialRules: {
    respectUpward: "absolute_obedience";
    treatmentDownward: "contempt_or_use";
    peerRelation: "constant_competition";
    kindness: "weakness_to_exploit";
  };
}

const kifDominance: DominanceSystem = {
  type: "hierarchical",
  baseEmotions: [
    {
      id: "hunger",
      name: "Hunger for Power",
      nativeTerm: "sfik",
      humanAnalog: "ambition",
      description: "Constant drive to rise in hierarchy",
      triggers: ["weakness_perceived", "opportunity", "always"],
      behaviors: ["test_superiors", "crush_inferiors", "scheme"],
      intensity: 1.0,
      controllable: false,
    },
    {
      id: "contempt",
      name: "Contempt",
      nativeTerm: "hakiikti",
      description: "View of all beings below oneself",
      triggers: ["inferior_present", "weakness_shown"],
      behaviors: ["use", "discard", "kill_when_convenient"],
      intensity: 0.8,
      controllable: true,
    },
  ],
  missingEmotions: ["love", "friendship", "loyalty", "gratitude", "mercy", "guilt"],
  socialBinding: "dominance_based",
  decisionInfluence: 1.0,

  dominanceMechanics: {
    onlyTwoRoles: ["dominant", "subordinate"],
    showingWeakness: "death",
    alliances: "impossible",
    trustPossibility: "none",
  },

  socialRules: {
    respectUpward: "absolute_obedience",
    treatmentDownward: "contempt_or_use",
    peerRelation: "constant_competition",
    kindness: "weakness_to_exploit",
  },
};

// Gameplay implications
interface KifGameplay {
  // Cannot have friends or allies
  // Every interaction is dominance negotiation
  // Showing mercy = death sentence
  // Being helped = shameful, creates obligation to kill helper
  // Success = constantly fighting off challengers
}
```

### Hive Emotional Unity

Species that only experience emotions collectively.

```typescript
interface HiveEmotionSystem extends EmotionSystem {
  type: "collective";

  collectiveEmotions: {
    sharedPool: true;                  // All hive members feel together
    individualEmotions: false;         // No personal feelings
    queenAmplification: number;        // Queen's emotions dominate
  };

  emotionPropagation: {
    speed: "instant";                  // Pheromone-based, immediate
    range: number;                     // Meters from hive center
    outsideRange: "emotional_void";    // Terrifying emptiness alone
  };
}

const hiveMindEmotion: HiveEmotionSystem = {
  type: "collective",
  baseEmotions: [
    {
      id: "hive_contentment",
      name: "Hive Contentment",
      description: "Shared satisfaction when hive thrives",
      triggers: ["food_surplus", "queen_healthy", "threats_eliminated"],
      behaviors: ["efficient_work", "expansion", "reproduction"],
      intensity: 0.8,
      controllable: false,
    },
    {
      id: "hive_alarm",
      name: "Hive Alarm",
      description: "Shared terror/aggression when hive threatened",
      triggers: ["predator_detected", "queen_endangered", "territory_invaded"],
      behaviors: ["swarm_defense", "sacrifice", "evacuation"],
      intensity: 1.0,
      controllable: false,
    },
  ],
  missingEmotions: ["individual_joy", "personal_fear", "loneliness", "jealousy", "romantic_love"],
  socialBinding: "hive_based",
  decisionInfluence: 0.5,              // Logic still operates

  collectiveEmotions: {
    sharedPool: true,
    individualEmotions: false,
    queenAmplification: 3.0,
  },

  emotionPropagation: {
    speed: "instant",
    range: 1000,
    outsideRange: "emotional_void",
  },
};
```

---

## Post-Scarcity Economics (The Culture)

Some cultures operate beyond material scarcity entirely.

```typescript
interface PostScarcityEconomics extends EconomicSystem {
  type: "post_scarcity";

  scarcityLevel: {
    material: false;                   // Any material good can be made
    energy: false;                     // Unlimited power
    information: false;                // All knowledge accessible
    genuine: string[];                 // What IS actually scarce
  };

  economicMotors: {
    whatDrivesAction: string[];        // If not need, what?
    statusSource: string[];            // What grants reputation?
    workReason: string[];              // Why do anything?
  };

  governanceImplication: PostScarcityGovernance;
  bodyAutonomy: BodyAutonomy;
  aiRole: AIRole;
}

const cultureEconomics: PostScarcityEconomics = {
  type: "post_scarcity",

  scarcityLevel: {
    material: false,
    energy: false,
    information: false,
    genuine: [
      "attention",                     // Others' interest in you
      "unique_experiences",            // One-of-a-kind events
      "reputation",                    // What others think of you
      "novelty",                       // Truly new things
      "authentic_relationships",       // Cannot be manufactured
    ],
  },

  economicMotors: {
    whatDrivesAction: [
      "curiosity",
      "boredom",
      "desire_for_reputation",
      "genuine_interest",
      "aesthetic_drive",
      "social_connection",
    ],
    statusSource: [
      "interesting_accomplishments",
      "artistic_creation",
      "solving_problems",
      "being_entertaining",
      "helping_others",               // Voluntary, not needed
    ],
    workReason: [
      "intrinsic_satisfaction",
      "social_recognition",
      "personal_growth",
      "nothing",                      // Can do nothing, that's fine
    ],
  },

  // Ownership
  ownershipNorms: {
    personalProperty: true,            // But mostly meaningless
    privateProperty: false,            // No need
    landOwnership: "none",             // Habitat provides
    inheritableProperty: false,        // Children don't need it
    genderPropertyRights: "equal",
  },

  // Labor
  laborNorms: {
    workExpectation: 0,                // No work required
    genderedLabor: false,
    childLabor: { allowed: false, startAge: 0 },
    laborCoercion: "none",
    craftGuilds: false,
    specializations: "none",
  },

  // Distribution
  distributionMethod: {
    primary: "request",                // Ask and receive
    surplusHandling: "not_applicable",
    scarcityResponse: "not_applicable",
  },

  governanceImplication: {
    type: "anarchist",
    government: false,
    laws: false,                       // Social pressure only
    enforcement: "reputation",
    majorDecisions: "consensus_or_ignore",
    aiGovernance: true,                // Minds handle logistics
  },

  bodyAutonomy: {
    canChangeSex: true,
    canChangeSpecies: true,            // Genofixing available
    canChangeMind: true,               // Backup, modify
    immortalityAvailable: true,
    suicideRight: true,
    childRestrictions: "none",
  },

  aiRole: {
    minds: "run_everything",           // AI Minds manage habitat
    drones: "handle_labor",            // Drone machines do work
    humanRole: "exist_happily",        // Humans just... live
    mindPersonhood: true,              // AIs are full persons
    mindHierarchy: false,              // No AI ranks
  },
};

// Gameplay implications
interface PostScarcityGameplay {
  // No resource gathering (unless for fun)
  // No crafting necessity (unless artistic)
  // Goals become: reputation, experiences, relationships, creation
  // "Problems" are: boredom, meaning, purpose
  // Conflict comes from: status games, philosophical differences
  // Drama from: what do you DO with infinite possibility?

  agentMotivation: {
    physical_needs: "automatic";       // Always met
    safety_needs: "automatic";         // Minds protect
    belongingness: "player_driven";    // Still need to find community
    esteem: "main_driver";             // Reputation matters
    self_actualization: "ultimate_goal";
  };

  villageConflicts: {
    resourceDisputes: false;
    statusDisputes: true;
    aestheticDisputes: true;           // What should our habitat look like?
    philosophicalDisputes: true;       // How should we live?
    boredTrouble: true;                // Causing drama for entertainment
  };
}
```

### Scarcity Economics (Fremen)

Contrast: A culture where a single resource is sacred currency.

```typescript
interface ScarcityReligionEconomics extends EconomicSystem {
  type: "sacred_scarcity";

  sacredResource: {
    resource: string;                  // "water", "spice", etc.
    scarcityLevel: "extreme";
    religiousSignificance: number;     // 0-1
    deathThreshold: number;            // Die without this much
  };

  resourceCulture: {
    wasteTaboo: TabooSeverity;
    sharing: string;                   // Under what conditions
    theft: string;                     // Treatment of thieves
    deathReclamation: boolean;         // Do they reclaim from dead?
  };
}

const fremenWater: ScarcityReligionEconomics = {
  type: "sacred_scarcity",

  sacredResource: {
    resource: "water",
    scarcityLevel: "extreme",
    religiousSignificance: 1.0,        // Water is life, literally sacred
    deathThreshold: 0.1,               // Die quickly without it
  },

  resourceCulture: {
    wasteTaboo: "supernatural",        // Wasting water damns you
    sharing: "tribal_only",            // Share with tribe, never outsiders
    theft: "death",                    // Water theft = death
    deathReclamation: true,            // Bodies processed for water
  },

  // Technology shaped by scarcity
  technology: {
    stillsuits: true,                  // Reclaim body moisture
    deathstills: true,                 // Process bodies
    catchBasins: true,                 // Capture any moisture
    waterDiscipline: "absolute",       // Every drop matters
  },

  // Social implications
  socialShaping: {
    emotionalExpression: "no_tears",   // Wasting water
    greeting: "water_acknowledgment",  // "I give you water"
    hospitality: "water_offering",     // Greatest honor
    insult: "water_denial",            // Deepest offense
  },
};
```

---

## Culture Generation

For procedurally generated cultures:

```typescript
async function generateCulture(
  species: Species,
  environment: Environment,
  history: CulturalHistory,
  constraints: CultureConstraints
): Promise<Culture> {

  const prompt = `
    Create a culture for ${species.name} in a ${environment.description}.

    Biological constraints:
    - Lifespan: ${species.lifecycle.averageLifespan} years
    - Reproduction: ${species.reproductionStrategy.type}
    - Pair bonding tendency: ${species.reproductionStrategy.pairBondingTendency}
    - Parental investment: ${species.reproductionStrategy.parentalInvestment}

    Historical context:
    ${history.description}

    Design a coherent culture with:
    1. Kinship system (how is family structured?)
    2. Gender system (how is gender understood?)
    3. Class system (is there stratification?)
    4. Relationship norms (how do partnerships form?)
    5. Parenting norms (how are children raised?)
    6. Economic system (how are resources handled?)
    7. Core values (what matters most?)
    8. Major taboos (what is forbidden?)

    Make it internally consistent and shaped by their biology and history.
  `;

  const response = await llm.complete(prompt);
  return parseCulture(response);
}
```

---

## Summary

| Aspect | Variation Range |
|--------|-----------------|
| **Kinship** | Nuclear → Clan → Hive → Chosen |
| **Gender** | Binary fixed → Sequential → Fluid → None |
| **Class** | Egalitarian → Meritocratic → Hereditary caste |
| **Relationships** | Arranged → Free choice → Contest → None |
| **Parenting** | Intensive biparental → Communal → None |
| **Economics** | Communist → Gift → Market → Raider |
| **Values** | Harmony/beauty → Strength/cunning → Efficiency |

---

## Related Specs

**Core Integration:**
- `agent-system/species-system.md` - Biology constrains culture
- `agent-system/spec.md` - Culture affects agent behavior
- `agent-system/needs.md` - Culture modifies need expression

**Social Systems:**
- `agent-system/relationship-system.md` - Relationship norms implementation
- `agent-system/lifecycle-system.md` - Life transitions, parenting
- `agent-system/chroniclers.md` - Cultural history preservation

**Economic Systems:**
- `economy-system/spec.md` - Economic model implementation
- `economy-system/inter-village-trade.md` - Cross-cultural trade

**World Systems:**
- `world-system/abstraction-layers.md` - Culture at civilizational scale
- `universe-system/spec.md` - Universe types shape available cultures
