/**
 * Realm System Types
 *
 * Defines types for mythological realms - pocket dimensions that exist
 * alongside universes. Realms are cheaper to access than universe crossing,
 * tied to divine presences, and have special laws.
 */

export type RealmCategory =
  | 'celestial'    // Divine courts, heavens, paradises
  | 'underworld'   // Death realms, afterlife, spirit worlds
  | 'elemental'    // Pure elemental manifestations
  | 'dream'        // Consciousness, imagination realms
  | 'liminal'      // Boundary spaces, crossroads
  | 'personal'     // Individual divine domains
  | 'wild';        // Untamed, primordial chaos

export type RealmSize =
  | 'pocket'       // Single room/location (0.50+ spectrum)
  | 'domain'       // Village-scale (0.60+ spectrum)
  | 'territory'    // Region-scale (0.70+ spectrum)
  | 'kingdom'      // Nation-scale (0.80+ spectrum)
  | 'infinite';    // Unbounded (0.90+ spectrum)

export type TimeFlowType =
  | 'frozen'       // No time passes (ratio = 0)
  | 'crawling'     // 100-10 years pass outside per year inside (0.01-0.1)
  | 'slow'         // 10-2 years pass outside per year inside (0.1-0.5)
  | 'normal'       // Same as parent universe (1.0)
  | 'fast'         // 1 year inside = weeks outside (2-10)
  | 'rushing'      // 1 year inside = days outside (10-100)
  | 'subjective';  // Variable based on perception

export type AccessMethod =
  | 'death'        // Die to enter (permanent, usually)
  | 'dream'        // Enter through sleep/dreams
  | 'ritual'       // Perform ritual to open gate
  | 'portal'       // Find physical portal
  | 'invitation'   // Invited by realm ruler
  | 'pilgrimage'   // Complete sacred journey
  | 'ascension'    // Achieve worthiness
  | 'trance'       // Shamanic/meditative state
  | 'physical_gate'// Walk through physical door
  | 'summoning';   // Summoned by realm inhabitant

export interface AccessRestriction {
  type: 'identity' | 'state' | 'action' | 'permission' | 'knowledge' | 'time';
  requirement: string;
  description?: string;
}

export interface RealmLaw {
  name: string;
  effect: string;
  enforcement: 'automatic' | 'environmental' | 'guardian' | 'ruler';
  description?: string;
}

export interface RealmProperties {
  // Identity
  id: string;
  name: string;
  category: RealmCategory;
  parentUniverseId: string;

  // Physical properties
  size: RealmSize;
  topology: string;  // 'mountain_peak', 'underground_world', 'floating_islands', etc.

  // Temporal properties
  timeFlow: TimeFlowType;
  timeRatio: number;  // 1.0 = same as parent, 0.1 = 10x slower, 10 = 10x faster

  // Environmental
  environment: string;  // 'eternal_spring', 'eternal_twilight', 'volcanic', etc.
  stability: number;    // 0-1, how stable reality is here

  // Access control
  accessMethods: AccessMethod[];
  accessRestrictions: AccessRestriction[];

  // Governance
  ruler?: string;  // Presence ID of realm ruler
  contested: boolean;
  laws: RealmLaw[];  // Special rules that apply in this realm

  // Maintenance
  selfSustaining: boolean;
  maintenanceCost: number;  // Attention cost per tick
  subRealms?: string[];     // Child realm IDs (nested realms)
}

export interface RealmTransitionResult {
  success: boolean;
  reason?: string;
  effects?: TransitionEffect[];
}

export interface TransitionEffect {
  type: 'transformation' | 'memory' | 'time' | 'status';
  description: string;
  magnitude: number;
}

export interface RealmInhabitant {
  entityId: string;
  native: boolean;  // Born in realm vs visitor
  enteredAt: number;  // Tick when entered
  canLeave: boolean;
  transformations: string[];  // Effects applied by realm
}
