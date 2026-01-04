/**
 * ProfessionPriorityProfiles - Strategic priority overrides for different professions
 *
 * Each profession has unique behavioral priorities that override the default
 * skill-based priorities. This makes professions feel distinct and realistic.
 *
 * Examples:
 * - TV cook influencer: Prioritizes gathering ingredients & cooking > content creation
 * - Newspaper reporter: Prioritizes exploration & investigation > office work
 * - Radio DJ: Prioritizes social interaction (broadcasting) > exploration
 */

import type { StrategicPriorities } from '../components/AgentComponent.js';
import type { ProfessionRole } from '../components/ProfessionComponent.js';

/**
 * Extended priorities that include profession-specific actions.
 */
export interface ExtendedPriorities extends StrategicPriorities {
  /** Investigation/research (reporters, investigators) */
  investigation?: number;
  /** Cooking/food preparation (cooks, chefs) */
  cooking?: number;
  /** Content creation (media professions) */
  content_creation?: number;
  /** Customer service (shopkeepers, doctors) */
  service?: number;
}

/**
 * Profession priority profiles.
 * These override agent's skill-based priorities when they're "on the job."
 */
export const PROFESSION_PRIORITY_PROFILES: Record<ProfessionRole, ExtendedPriorities> = {
  // ============================================================================
  // MEDIA PROFESSIONS - INVESTIGATIVE
  // ============================================================================

  newspaper_reporter: {
    exploration: 0.40,      // HIGH - Go to scenes, investigate
    social: 0.25,           // Interview sources
    investigation: 0.20,    // Research, fact-finding
    content_creation: 0.10, // Writing articles
    rest: 0.05,
    gathering: 0.0,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  newspaper_editor: {
    social: 0.30,           // Coordinate with reporters
    content_creation: 0.40, // Editing, layout
    investigation: 0.15,    // Fact-checking
    exploration: 0.05,      // Minimal field work
    rest: 0.10,
    gathering: 0.0,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  // ============================================================================
  // MEDIA PROFESSIONS - PERFORMANCE
  // ============================================================================

  tv_actor: {
    social: 0.50,           // HIGH - Performing, interacting
    content_creation: 0.25, // Rehearsing, learning lines
    exploration: 0.05,      // Minimal - mostly on set
    rest: 0.15,             // Long days, need rest
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  tv_director: {
    social: 0.40,           // Directing actors, coordinating crew
    content_creation: 0.35, // Planning shots, creative decisions
    exploration: 0.10,      // Location scouting
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  tv_producer: {
    social: 0.45,           // Coordinating, managing
    content_creation: 0.30, // Planning, budgeting
    exploration: 0.10,
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  tv_writer: {
    content_creation: 0.50, // HIGH - Writing scripts
    social: 0.20,           // Collaborating with team
    exploration: 0.15,      // Research, inspiration
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  // ============================================================================
  // MEDIA PROFESSIONS - BROADCAST
  // ============================================================================

  radio_dj: {
    social: 0.60,           // VERY HIGH - Talking on air
    content_creation: 0.20, // Planning shows, selecting music
    exploration: 0.05,      // Minimal field work
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  radio_producer: {
    social: 0.40,           // Coordinating with DJ/guests
    content_creation: 0.35, // Producing segments
    exploration: 0.10,      // Researching topics
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  // ============================================================================
  // SERVICE PROFESSIONS - SPECIAL BEHAVIORS
  // ============================================================================

  /**
   * TV COOK INFLUENCER - Special case!
   * Prioritizes gathering ingredients and cooking over content creation.
   * Content creation is secondary to actually making good food.
   */
  office_worker: {
    // NOTE: "office_worker" used for TV cook influencers
    gathering: 0.35,        // HIGH - Get ingredients
    cooking: 0.30,          // HIGH - Prepare dishes
    social: 0.20,           // Record content, interact with audience
    content_creation: 0.10, // Lower priority - content follows cooking
    rest: 0.05,
    exploration: 0.0,
    building: 0.0,
    farming: 0.0,
    magic: 0.0,
  },

  shopkeeper: {
    service: 0.50,          // HIGH - Customer interaction
    social: 0.25,           // Community engagement
    gathering: 0.15,        // Restocking
    exploration: 0.0,       // Stay at shop
    rest: 0.05,
    building: 0.05,
    farming: 0.0,
    content_creation: 0.0,
    magic: 0.0,
  },

  doctor: {
    service: 0.55,          // VERY HIGH - Patient care
    social: 0.25,           // Bedside manner, consultations
    investigation: 0.10,    // Diagnosis, research
    exploration: 0.0,       // Stay at clinic
    rest: 0.05,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    content_creation: 0.0,
    magic: 0.0,
  },

  nurse: {
    service: 0.60,          // VERY HIGH - Patient care
    social: 0.20,           // Comforting patients
    exploration: 0.0,       // Stay at clinic
    rest: 0.10,             // Long shifts
    gathering: 0.10,        // Medical supplies
    building: 0.0,
    farming: 0.0,
    content_creation: 0.0,
    investigation: 0.0,
    magic: 0.0,
  },

  teacher: {
    service: 0.45,          // HIGH - Teaching students
    social: 0.30,           // Classroom interaction
    content_creation: 0.15, // Lesson planning
    exploration: 0.0,       // Stay in classroom
    rest: 0.05,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    investigation: 0.0,
    magic: 0.0,
  },

  librarian: {
    service: 0.40,          // Helping patrons
    social: 0.25,           // Community programs
    investigation: 0.20,    // Research, cataloging
    exploration: 0.0,       // Stay at library
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    content_creation: 0.0,
    magic: 0.0,
  },

  // ============================================================================
  // ADMINISTRATIVE PROFESSIONS
  // ============================================================================

  bureaucrat: {
    service: 0.40,          // Processing paperwork
    social: 0.25,           // Public interaction
    content_creation: 0.20, // Documentation
    exploration: 0.0,       // Office-bound
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    investigation: 0.0,
    magic: 0.0,
  },

  city_planner: {
    content_creation: 0.35, // Planning, design
    social: 0.25,           // Meetings, public hearings
    exploration: 0.20,      // Site visits
    investigation: 0.10,    // Research, zoning
    rest: 0.05,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    service: 0.0,
    magic: 0.0,
  },

  accountant: {
    content_creation: 0.45, // Bookkeeping, reports
    investigation: 0.25,    // Auditing
    social: 0.15,           // Client meetings
    exploration: 0.0,       // Office-bound
    rest: 0.10,
    gathering: 0.05,
    building: 0.0,
    farming: 0.0,
    service: 0.0,
    magic: 0.0,
  },

  // ============================================================================
  // GENERIC WORKER
  // ============================================================================

  generic_worker: {
    gathering: 0.20,
    building: 0.20,
    farming: 0.20,
    social: 0.15,
    exploration: 0.10,
    rest: 0.10,
    magic: 0.05,
    service: 0.0,
    content_creation: 0.0,
    investigation: 0.0,
    cooking: 0.0,
  },
};

/**
 * Get profession-specific priorities for a role.
 */
export function getProfessionPriorities(role: ProfessionRole): ExtendedPriorities {
  return PROFESSION_PRIORITY_PROFILES[role] ?? PROFESSION_PRIORITY_PROFILES.generic_worker;
}

/**
 * Check if profession should work on-site (vs. roaming).
 */
export function isOnSiteProfession(role: ProfessionRole): boolean {
  const profile = getProfessionPriorities(role);

  // Professions with high service or low exploration are on-site
  return (profile.service ?? 0) > 0.3 || (profile.exploration ?? 0) < 0.1;
}

/**
 * Check if profession is field-based (reporters, investigators).
 */
export function isFieldProfession(role: ProfessionRole): boolean {
  const profile = getProfessionPriorities(role);

  // High exploration OR investigation
  return (profile.exploration ?? 0) > 0.2 || (profile.investigation ?? 0) > 0.15;
}

/**
 * Normalize extended priorities to sum to 1.0.
 */
export function normalizeExtendedPriorities(priorities: ExtendedPriorities): ExtendedPriorities {
  const total = Object.values(priorities).reduce((sum, val) => sum + (val ?? 0), 0);

  if (total === 0) {
    return priorities;
  }

  const normalized: ExtendedPriorities = {};
  for (const [key, value] of Object.entries(priorities)) {
    normalized[key as keyof ExtendedPriorities] = (value ?? 0) / total;
  }

  return normalized;
}
