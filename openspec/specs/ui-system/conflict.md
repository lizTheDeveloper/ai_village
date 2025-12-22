# Combat/Conflict UI Specification

## Overview

The Conflict UI provides visualization and control of combat situations, threats, and defensive operations. Features health displays, threat indicators, combat stance controls, and tactical overview.

## Version

0.1.0

## Dependencies

- `conflict-system/spec.md` - Conflict mechanics (ConflictType, ConflictResolution, AgentCombat, CombatOutcome, Injury, DominanceChallenge)
- `agent-system/spec.md` - Agent stats
- `ui-system/notifications.md` - Combat alerts

## Requirements

### REQ-COMBAT-001: Combat HUD
- **Description**: Overlay showing combat-relevant information
- **Priority**: MUST

```typescript
// Re-export from conflict-system for reference
import type {
  ConflictType, ConflictResolution,
  HuntingAttempt, HuntingOutcome, HuntingMethod,
  PredatorAttack, PredatorAttackOutcome, AttackTrigger,
  AgentCombat, CombatCause, CombatOutcome,
  DominanceChallenge, DominanceChallengeMethod, DominanceOutcome,
  Injury, InjuryType
} from "conflict-system/spec";

// ConflictType from conflict-system/spec.md:
// "hunting" | "predator_attack" | "agent_combat" | "dominance_challenge" |
// "raid" | "defense" | "duel" | "ambush"

interface CombatHUD {
  isActive: boolean;

  // Active conflicts from conflict-system
  activeConflicts: ActiveConflictDisplay[];

  // Threat status
  threatLevel: ThreatLevel;
  activeThreats: ThreatDisplay[];

  // Selected unit info
  selectedUnits: CombatUnitDisplay[];

  // Combat log - using ConflictResolution from conflict-system
  recentResolutions: ConflictResolutionDisplay[];

  // Methods
  activate(): void;
  deactivate(): void;

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for active conflicts
interface ActiveConflictDisplay {
  conflictType: ConflictType;  // From conflict-system
  participants: EntityId[];
  location: Vector2;
  startTime: GameTime;

  // Visual indicator
  icon: Sprite;
  severity: number;
}

type ThreatLevel =
  | "none"             // No threats
  | "low"              // Minor threat
  | "moderate"         // Significant threat
  | "high"             // Serious danger
  | "critical";        // Immediate danger

// Display wrapper for threats
interface ThreatDisplay {
  id: string;
  type: ThreatType;
  position: Vector2;
  severity: number;            // 0-100
  source: string;              // Entity or description

  // Maps to conflict-system types
  relatedConflictType?: ConflictType;
  predatorAttack?: PredatorAttack;  // If type is "predator"

  // Detection
  isVisible: boolean;
  isIdentified: boolean;
  detectedAt: GameTime;
}

type ThreatType =
  | "predator"         // Dangerous animal (maps to predator_attack)
  | "hostile_agent"    // Enemy agent (maps to agent_combat)
  | "raiding_party"    // Group attack (maps to raid)
  | "natural_disaster" // Environmental threat
  | "disease"          // Outbreak
  | "starvation"       // Resource shortage
  | "dominance_challenge";  // For dominance-based species
```

### REQ-COMBAT-002: Health Bars
- **Description**: Visual health indicators for entities
- **Priority**: MUST

```typescript
// Re-export from conflict-system for injury display
import type { Injury, InjuryType, BodyLocation } from "conflict-system/spec";

// InjuryType from conflict-system/spec.md:
// "laceration" | "puncture" | "blunt" | "burn" | "bite" | "exhaustion" | "psychological"

interface HealthBarDisplay {
  // Global settings
  showHealthBars: boolean;
  showForType: Set<EntityType>;

  // Visibility rules
  alwaysShowInjured: boolean;
  showOnHover: boolean;
  showOnSelect: boolean;
  showInCombat: boolean;

  // Thresholds
  criticalThreshold: number;   // Below this = red
  warningThreshold: number;    // Below this = yellow
}

interface HealthBar {
  entityId: string;
  position: Vector2;

  // Health values
  currentHealth: number;
  maxHealth: number;
  percentage: number;

  // Visual
  width: number;
  height: number;
  foregroundColor: Color;
  backgroundColor: Color;
  borderColor: Color;

  // Injuries from conflict-system
  activeInjuries: InjuryDisplay[];

  // Status effects (derived from injuries and other sources)
  statusEffects: StatusEffect[];

  render(ctx: CanvasRenderingContext2D): void;
}

// Display wrapper for Injury from conflict-system
interface InjuryDisplay {
  injury: Injury;              // From conflict-system
  icon: Sprite;
  displaySeverity: "minor" | "major" | "critical";  // Maps to injury.severity
  healingProgress: number;     // 0-1, computed from healingTime
  tooltip: string;             // Human-readable description
}

interface StatusEffect {
  id: string;
  name: string;
  icon: Sprite;
  duration: number | null;     // null = permanent

  type: StatusEffectType;
  severity: "minor" | "moderate" | "severe";

  // Link to source injury if applicable
  sourceInjury?: Injury;
}

type StatusEffectType =
  | "poison"
  | "bleeding"          // From laceration/puncture injuries
  | "burning"           // From burn injuries
  | "stunned"           // From blunt injuries
  | "weakened"          // From exhaustion injuries
  | "trauma"            // From psychological injuries
  | "strengthened"
  | "protected"
  | "healing";
```

### REQ-COMBAT-003: Combat Unit Panel
- **Description**: Detailed view of selected combat unit
- **Priority**: MUST

```typescript
// Reference types from conflict-system for combat context
import type {
  AgentCombat, CombatCause, CombatOutcome,
  Weapon, Armor, Injury
} from "conflict-system/spec";

interface CombatUnitPanel {
  unit: CombatUnitDisplay | null;
  position: "side" | "bottom";

  // Sections
  showStats: boolean;
  showEquipment: boolean;
  showAbilities: boolean;
  showOrders: boolean;
}

// Display wrapper for combat-capable entities
interface CombatUnitDisplay {
  entityId: string;
  name: string;
  portrait: Sprite;

  // Combat stats (from agent-system skills)
  combatSkill: number;         // Maps to AgentCombat.attackerCombat/defenderCombat
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;

  // Offensive display
  attackPower: number;
  attackSpeed: number;
  accuracy: number;

  // Defensive display
  defense: number;
  evasion: number;
  resistance: Map<DamageType, number>;

  // Current state
  stance: CombatStance;
  currentAction: CombatAction | null;
  target: string | null;

  // Equipment from conflict-system
  weapon: EquipmentDisplay | null;    // Wraps Weapon
  armor: EquipmentDisplay | null;     // Wraps Armor
  shield: EquipmentDisplay | null;

  // Active injuries from conflict-system
  injuries: InjuryDisplay[];

  // If currently in combat
  activeCombat?: AgentCombat;          // From conflict-system
}

// Display wrapper for equipment
interface EquipmentDisplay {
  id: string;
  name: string;
  icon: Sprite;
  durability: number;
  maxDurability: number;

  // Weapon stats if applicable
  weapon?: Weapon;             // From conflict-system
  // Armor stats if applicable
  armor?: Armor;               // From conflict-system

  stats: Map<string, number>;
}

// Damage types (aligned with InjuryType where applicable)
type DamageType =
  | "physical"         // Maps to laceration, puncture, blunt
  | "fire"             // Maps to burn
  | "cold"
  | "poison"
  | "disease"
  | "bite";            // Maps to bite injury type

type CombatStance =
  | "passive"          // Won't fight
  | "defensive"        // Fight if attacked
  | "aggressive"       // Attack threats
  | "flee";            // Run from danger

type CombatAction =
  | "idle"
  | "moving"
  | "attacking"
  | "defending"
  | "fleeing"
  | "using_ability"
  | "stunned"
  | "recovering";
```

### REQ-COMBAT-004: Stance Controls
- **Description**: Set combat behavior for units
- **Priority**: MUST

```typescript
interface StanceControls {
  selectedUnits: CombatUnit[];

  // Current stance
  currentStance: CombatStance | "mixed";

  // Methods
  setStance(stance: CombatStance): void;
  setStanceForAll(stance: CombatStance): void;
}

interface StanceButton {
  stance: CombatStance;
  icon: Sprite;
  label: string;
  tooltip: string;

  isActive: boolean;
  isEnabled: boolean;

  // Visual
  activeColor: Color;
  inactiveColor: Color;
}

const STANCE_BUTTONS: StanceButton[] = [
  {
    stance: "passive",
    icon: "peace_icon",
    label: "Passive",
    tooltip: "Will not engage in combat"
  },
  {
    stance: "defensive",
    icon: "shield_icon",
    label: "Defensive",
    tooltip: "Will fight if attacked"
  },
  {
    stance: "aggressive",
    icon: "sword_icon",
    label: "Aggressive",
    tooltip: "Will attack nearby threats"
  },
  {
    stance: "flee",
    icon: "flee_icon",
    label: "Flee",
    tooltip: "Will run from danger"
  }
];
```

### REQ-COMBAT-005: Threat Indicators
- **Description**: Visual indicators for threats in world
- **Priority**: MUST

```typescript
interface ThreatIndicators {
  // Display settings
  showIndicators: boolean;
  showOffscreen: boolean;
  showDistance: boolean;

  // Active threats
  threats: ThreatIndicator[];

  render(ctx: CanvasRenderingContext2D): void;
}

interface ThreatIndicator {
  threat: Threat;

  // Position
  worldPosition: Vector2;
  screenPosition: Vector2;
  isOnScreen: boolean;

  // Visual
  icon: Sprite;
  color: Color;
  size: number;
  pulseAnimation: boolean;

  // Off-screen indicator
  edgePosition: Vector2 | null;
  direction: number;           // Angle to threat
  distance: number;
}

interface ThreatRadar {
  // Minimap-style threat display
  position: Vector2;
  radius: number;

  // Center on player/village
  centerPosition: Vector2;
  range: number;

  // Blips
  threatBlips: RadarBlip[];

  render(ctx: CanvasRenderingContext2D): void;
}

interface RadarBlip {
  threat: Threat;
  relativePosition: Vector2;   // Relative to center
  blipColor: Color;
  blipSize: number;
}
```

### REQ-COMBAT-006: Combat Log
- **Description**: Scrollable log of combat events
- **Priority**: SHOULD

```typescript
// Reference resolution types from conflict-system
import type {
  ConflictResolution, ConflictOutcome,
  HuntingOutcome, PredatorAttackOutcome, CombatOutcome,
  DominanceOutcome, Death, DeathCause
} from "conflict-system/spec";

interface CombatLog {
  events: CombatLogEvent[];
  maxEvents: number;

  // Filtering
  filterByType: Set<CombatEventType>;
  filterByConflictType: Set<ConflictType>;
  filterByEntity: string | null;

  // Display
  isExpanded: boolean;
  scrollPosition: number;

  render(ctx: CanvasRenderingContext2D): void;
}

// UI event wrapper that maps conflict-system outcomes to display
interface CombatLogEvent {
  id: string;
  type: CombatEventType;
  timestamp: GameTime;

  // Participants
  source: string | null;
  target: string | null;

  // Details
  message: string;
  value: number | null;        // Damage, healing, etc.

  // Link to conflict-system resolution
  conflictResolution?: ConflictResolution;
  huntingOutcome?: HuntingOutcome;
  predatorOutcome?: PredatorAttackOutcome;
  combatOutcome?: CombatOutcome;
  dominanceOutcome?: DominanceOutcome;
  death?: Death;

  // Visual
  color: Color;
  icon: Sprite | null;
}

// Display wrapper for conflict resolutions
interface ConflictResolutionDisplay {
  resolution: ConflictResolution;   // From conflict-system
  conflictType: ConflictType;
  narrative: string;                // LLM-generated narrative
  displaySummary: string;           // Short summary for log
  participants: EntityId[];
  timestamp: GameTime;
}

type CombatEventType =
  | "attack"
  | "damage_dealt"
  | "damage_received"
  | "miss"
  | "block"
  | "dodge"
  | "critical"
  | "death"                  // Links to Death from conflict-system
  | "heal"
  | "injury_inflicted"       // Links to Injury from conflict-system
  | "status_applied"
  | "status_removed"
  | "ability_used"
  | "flee_attempt"
  | "flee_success"
  | "hunt_success"           // Links to HuntingOutcome
  | "hunt_failed"
  | "predator_attack"        // Links to PredatorAttackOutcome
  | "dominance_challenge"    // Links to DominanceOutcome
  | "conflict_resolved";     // Links to ConflictResolution
```

### REQ-COMBAT-007: Tactical Overview
- **Description**: Strategic view of combat situation
- **Priority**: SHOULD

```typescript
// Reference defense and combat types from conflict-system
import type {
  VillageDefense, RaidDefense,
  GuardDuty, GuardAssignment,
  PackMindCombat, HiveWarfare, ManchiCombat
} from "conflict-system/spec";

interface TacticalOverview {
  isOpen: boolean;

  // Forces
  friendlyUnits: CombatUnitDisplay[];
  hostileUnits: CombatUnitDisplay[];
  neutralUnits: CombatUnitDisplay[];

  // Village defense status from conflict-system
  villageDefense?: VillageDefense;
  activeRaidDefense?: RaidDefense;

  // Summary
  friendlyStrength: number;
  hostileStrength: number;
  battleOdds: number;          // -1 to 1, positive = advantage

  // Map overlay
  showTerrain: boolean;
  showPositions: boolean;
  showRanges: boolean;

  // Special combat modes (alien species)
  activePackCombat?: PackMindCombat[];
  activeHiveWarfare?: HiveWarfare;
  activeManchiCombat?: ManchiCombat[];

  render(ctx: CanvasRenderingContext2D): void;
}

interface ForcesSummary {
  side: "friendly" | "hostile" | "neutral";

  unitCount: number;
  totalHealth: number;
  averageHealth: number;

  // Breakdown
  unitTypes: Map<string, number>;

  // Guard assignments from conflict-system
  activeGuards: GuardDutyDisplay[];
}

// Display wrapper for GuardDuty from conflict-system
interface GuardDutyDisplay {
  guardDuty: GuardDuty;         // From conflict-system
  guardName: string;
  alertnessDisplay: number;     // 0-100 visual
  assignmentDescription: string;
}

interface BattlePrediction {
  // Predicted outcome
  winProbability: number;
  expectedCasualties: number;
  expectedDuration: number;

  // Factors
  advantageFactors: PredictionFactor[];
  disadvantageFactors: PredictionFactor[];

  // Fortification bonus from VillageDefense
  fortificationBonus?: number;
}

interface PredictionFactor {
  name: string;
  impact: number;
  description: string;
}
```

### REQ-COMBAT-008: Ability Bar
- **Description**: Quick access to combat abilities
- **Priority**: MAY

```typescript
interface AbilityBar {
  unit: CombatUnit;
  abilities: Ability[];

  position: Vector2;
  layout: "horizontal" | "vertical";

  // Methods
  useAbility(abilityId: string): void;
  getAbilityAtSlot(slot: number): Ability | null;
}

interface Ability {
  id: string;
  name: string;
  icon: Sprite;
  description: string;

  // Usage
  cooldown: number;
  currentCooldown: number;
  cost: AbilityCost;

  // State
  isReady: boolean;
  isEnabled: boolean;

  // Targeting
  targetType: AbilityTargetType;
  range: number;
}

interface AbilityCost {
  stamina: number;
  health: number;
  resource: Map<string, number>;
}

type AbilityTargetType =
  | "self"
  | "ally"
  | "enemy"
  | "ground"
  | "direction"
  | "none";

interface AbilitySlot {
  ability: Ability | null;
  slotIndex: number;
  hotkey: string;

  // Visual
  isHovered: boolean;
  isPressed: boolean;
  cooldownOverlay: number;     // 0-1

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-COMBAT-009: Defense Management
- **Description**: Manage defensive structures and zones
- **Priority**: SHOULD

```typescript
// Reference defense types from conflict-system
import type {
  VillageDefense, WallDefense, WatchtowerDefense, GateDefense,
  GuardDuty, GuardAssignment
} from "conflict-system/spec";

interface DefenseManagement {
  // Village defense from conflict-system
  villageDefense: VillageDefense;

  // Defensive structures (display wrappers)
  structures: DefensiveStructureDisplay[];

  // Defense zones
  zones: DefenseZone[];

  // Patrol routes (based on GuardAssignment patrol type)
  patrols: PatrolRouteDisplay[];

  // Methods
  createZone(bounds: Rect): DefenseZone;
  assignToZone(unitId: string, zoneId: string): void;
  createPatrol(waypoints: Vector2[]): PatrolRouteDisplay;
}

// Display wrapper for defensive structures from conflict-system
interface DefensiveStructureDisplay {
  id: string;
  type: DefenseStructureType;
  position: Vector2;
  health: number;
  maxHealth: number;

  // Coverage
  range: number;
  coverageArc: number;         // Degrees

  // Status
  isOperational: boolean;
  assignedOperators: string[];

  // Link to conflict-system structures
  wallDefense?: WallDefense;
  watchtowerDefense?: WatchtowerDefense;
  gateDefense?: GateDefense;
}

type DefenseStructureType =
  | "wall"
  | "gate"
  | "tower"
  | "trap"
  | "barricade";

interface DefenseZone {
  id: string;
  name: string;
  bounds: Rect;
  priority: number;

  assignedUnits: string[];
  requiredUnits: number;

  // Guard assignments from conflict-system
  guardDuties: GuardDuty[];

  // Threat tracking
  threatsInZone: ThreatDisplay[];
}

// Display wrapper for patrol routes (based on GuardAssignment patrol type)
interface PatrolRouteDisplay {
  id: string;
  waypoints: Vector2[];           // Maps to GuardAssignment.patrolRoute
  assignedUnits: string[];

  // Patrol settings
  loopType: "loop" | "pingpong";
  pauseAtWaypoints: number;       // Maps to GuardAssignment.patrolInterval

  // Link to guard assignments
  guardAssignments: GuardAssignment[];
}
```

### REQ-COMBAT-010: Damage Numbers
- **Description**: Floating combat numbers
- **Priority**: MAY

```typescript
interface DamageNumbers {
  showDamage: boolean;
  showHealing: boolean;
  showMisses: boolean;
  showCriticals: boolean;

  // Active numbers
  activeNumbers: FloatingNumber[];

  // Animation settings
  floatSpeed: number;
  fadeTime: number;
  spread: number;

  // Methods
  spawnNumber(config: FloatingNumberConfig): void;

  render(ctx: CanvasRenderingContext2D): void;
}

interface FloatingNumber {
  value: string;
  position: Vector2;
  velocity: Vector2;

  color: Color;
  size: number;
  opacity: number;

  lifetime: number;
  maxLifetime: number;

  // Style
  isCritical: boolean;
  icon: Sprite | null;
}

interface FloatingNumberConfig {
  value: number;
  type: "damage" | "heal" | "miss" | "block" | "critical";
  position: Vector2;

  // Optional
  sourceId?: string;
  targetId?: string;
}
```

### REQ-COMBAT-011: Keyboard Shortcuts
- **Description**: Quick access for combat actions
- **Priority**: SHOULD

```typescript
interface CombatShortcuts {
  // Stances
  setPassive: string;          // Default: "1"
  setDefensive: string;        // Default: "2"
  setAggressive: string;       // Default: "3"
  setFlee: string;             // Default: "4"

  // Commands
  attack: string;              // Default: "A"
  hold: string;                // Default: "H"
  retreat: string;             // Default: "R"
  patrol: string;              // Default: "P"

  // Abilities
  ability1: string;            // Default: "Q"
  ability2: string;            // Default: "W"
  ability3: string;            // Default: "E"
  ability4: string;            // Default: "R"

  // UI
  toggleCombatLog: string;     // Default: "L"
  toggleTactical: string;      // Default: "T"
}
```

## Visual Style

```typescript
interface CombatStyle {
  // Health bars
  healthBarHeight: number;
  healthBarWidth: number;
  healthyColor: Color;         // Green
  woundedColor: Color;         // Yellow
  criticalColor: Color;        // Red
  healthBarBorder: Color;

  // Threat indicators
  threatLowColor: Color;       // Yellow
  threatHighColor: Color;      // Red
  threatIconSize: number;

  // Damage numbers
  damageColor: Color;          // Red
  healColor: Color;            // Green
  criticalColor: Color;        // Orange
  missColor: Color;            // Gray

  // Combat log
  logBackground: Color;
  logTextColor: Color;

  // 8-bit styling
  pixelScale: number;
  useBoldOutlines: boolean;
}
```

## State Management

```typescript
// Import core conflict-system types for state management
import type {
  ConflictType, ConflictResolution,
  AgentCombat, CombatOutcome,
  Death, Injury,
  VillageDefense
} from "conflict-system/spec";

interface CombatState {
  // Combat status
  isInCombat: boolean;
  threatLevel: ThreatLevel;

  // Active conflicts from conflict-system
  activeConflicts: ActiveConflictDisplay[];

  // Selected units
  selectedUnits: string[];

  // Active threats
  activeThreats: ThreatDisplay[];

  // Combat log
  combatEvents: CombatLogEvent[];

  // Recent resolutions from conflict-system
  recentResolutions: ConflictResolutionDisplay[];

  // Village defense status
  villageDefense?: VillageDefense;

  // UI state
  showHealthBars: boolean;
  showThreatIndicators: boolean;
  combatLogExpanded: boolean;

  // Events (consuming conflict-system events)
  onCombatStart: Event<AgentCombat>;
  onCombatEnd: Event<CombatOutcome>;
  onConflictResolved: Event<ConflictResolution>;
  onThreatDetected: Event<ThreatDisplay>;
  onInjuryInflicted: Event<Injury>;
  onUnitDeath: Event<Death>;
}
```

## Integration Points

- **Conflict System**: Combat mechanics, damage calculation
- **Agent System**: Agent stats, health, abilities
- **Notification System**: Combat alerts, deaths
- **Selection System**: Unit selection
- **Camera System**: Focus on combat
