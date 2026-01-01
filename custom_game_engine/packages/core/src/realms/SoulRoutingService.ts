/**
 * SoulRoutingService - Determines which afterlife realm a soul goes to
 *
 * Routes souls based on:
 * 1. The deity they worshipped (primary factor)
 * 2. The deity's afterlife policy (judgment, reincarnation, etc.)
 * 3. The deity's ruled realms (specifically underworld-category realms)
 * 4. Falls back to default 'underworld' if no deity or no specific afterlife
 *
 * Policy types:
 * - Judgment: Soul is evaluated and routed to tiered destinations
 * - Reincarnation: Soul is flagged for rebirth instead of afterlife
 * - Unconditional: All souls go to same destination
 * - Annihilation: Soul ceases to exist
 * - Transformation: Soul becomes a different entity type
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { DeedLedgerComponent } from '../components/DeedLedgerComponent.js';
import { calculateDeedScore, getJudgmentTier } from '../components/DeedLedgerComponent.js';
import type { Deity } from '../divinity/DeityTypes.js';
import type { AfterlifePolicy, JudgmentTier, ReincarnationConfig } from '../divinity/AfterlifePolicy.js';
import { getRealmDefinition } from './RealmDefinitions.js';

/** Result of soul routing decision */
export interface SoulRoutingResult {
  /** The realm ID the soul should go to (or 'reincarnation' for rebirth) */
  realmId: string;

  /** Why this realm was chosen */
  reason: SoulRoutingReason;

  /** The deity ID if routing was based on deity worship */
  deityId?: string;

  /** Additional context for the routing decision */
  context?: string;

  /** Policy type that was applied */
  policyType?: AfterlifePolicy['type'];

  /** Judgment tier if judgment policy was used */
  judgmentTier?: JudgmentTier;

  /** Deed score if judgment policy was used */
  deedScore?: number;

  /** Reincarnation config if reincarnation policy was used */
  reincarnationConfig?: ReincarnationConfig;

  /** Whether the soul should cease to exist (annihilation) */
  annihilate?: boolean;
}

/** Reasons for routing a soul to a particular realm */
export type SoulRoutingReason =
  | 'deity_afterlife'      // Soul goes to their worshipped deity's realm
  | 'deity_judgment'       // Soul judged and routed based on deeds
  | 'deity_reincarnation'  // Soul flagged for rebirth
  | 'deity_annihilation'   // Soul ceases to exist
  | 'deity_unconditional'  // All believers go to same place
  | 'no_deity'             // Soul had no deity, goes to default
  | 'deity_no_realm'       // Deity has no underworld realm, goes to default
  | 'deity_no_policy'      // Deity has realm but no policy, use realm
  | 'unknown_deity'        // Deity ID not found in world
  | 'no_soul'              // Entity not eligible for afterlife
  | 'default';             // Catch-all default routing

/** Default afterlife realm for souls without specific destination */
export const DEFAULT_AFTERLIFE_REALM = 'underworld';

/** Default judgment thresholds */
const DEFAULT_THRESHOLDS = {
  exemplary: 100,
  favorable: 25,
  unfavorable: -25,
  condemned: -100,
};

/**
 * Determine which afterlife realm a dying entity should go to
 *
 * @param world - The game world
 * @param entity - The entity that is dying
 * @returns Routing result with realm ID, reason, and policy details
 */
export function routeSoulToAfterlife(
  world: World,
  entity: Entity
): SoulRoutingResult {
  // Get the entity's spiritual component to find their deity
  const spiritual = entity.components.get('spiritual') as SpiritualComponent | undefined;

  // No spiritual component or no believed deity -> default underworld
  if (!spiritual?.believedDeity) {
    return {
      realmId: DEFAULT_AFTERLIFE_REALM,
      reason: 'no_deity',
      context: 'Entity had no religious belief',
    };
  }

  const deityId = spiritual.believedDeity;

  // Look up the deity entity
  const deityEntity = world.getEntity(deityId);
  if (!deityEntity) {
    return {
      realmId: DEFAULT_AFTERLIFE_REALM,
      reason: 'unknown_deity',
      deityId,
      context: `Deity ${deityId} not found in world`,
    };
  }

  // Get the deity data (could be from component or direct interface)
  const deity = getDeityFromEntity(deityEntity);
  if (!deity) {
    return {
      realmId: DEFAULT_AFTERLIFE_REALM,
      reason: 'unknown_deity',
      deityId,
      context: `Entity ${deityId} is not a deity`,
    };
  }

  // Check if deity has an afterlife policy
  const policy = deity.afterlifePolicy;
  if (policy) {
    return evaluateAfterlifePolicy(entity, deity, policy);
  }

  // No policy - fall back to simple realm routing
  const afterlifeRealm = findDeityAfterlifeRealm(deity);
  if (!afterlifeRealm) {
    return {
      realmId: DEFAULT_AFTERLIFE_REALM,
      reason: 'deity_no_realm',
      deityId: deity.id,
      context: `Deity ${deity.identity.primaryName} has no afterlife realm`,
    };
  }

  return {
    realmId: afterlifeRealm,
    reason: 'deity_no_policy',
    deityId: deity.id,
    context: `Routed to ${deity.identity.primaryName}'s afterlife (no policy defined)`,
  };
}

/**
 * Evaluate a deity's afterlife policy to determine soul destination
 */
function evaluateAfterlifePolicy(
  entity: Entity,
  deity: Deity,
  policy: AfterlifePolicy
): SoulRoutingResult {
  const deityId = deity.id;
  const deityName = deity.identity.primaryName;

  switch (policy.type) {
    case 'judgment':
      return evaluateJudgmentPolicy(entity, deity, policy);

    case 'reincarnation':
      return {
        realmId: 'reincarnation',  // Special marker for reincarnation
        reason: 'deity_reincarnation',
        deityId,
        context: `${deityName} decrees rebirth`,
        policyType: 'reincarnation',
        reincarnationConfig: policy.reincarnation,
      };

    case 'unconditional':
      return {
        realmId: policy.unconditionalDestination ?? findDeityAfterlifeRealm(deity) ?? DEFAULT_AFTERLIFE_REALM,
        reason: 'deity_unconditional',
        deityId,
        context: `All of ${deityName}'s faithful go to the same destination`,
        policyType: 'unconditional',
      };

    case 'annihilation':
      return {
        realmId: 'annihilation',  // Special marker
        reason: 'deity_annihilation',
        deityId,
        context: `Soul absorbed into ${deityName}`,
        policyType: 'annihilation',
        annihilate: true,
      };

    case 'transformation':
      // Transformation is handled similarly to judgment but with different outcome
      // For now, route to deity's realm where transformation will occur
      return {
        realmId: policy.transformation?.destinationRealm ?? findDeityAfterlifeRealm(deity) ?? DEFAULT_AFTERLIFE_REALM,
        reason: 'deity_afterlife',
        deityId,
        context: `Soul to be transformed by ${deityName}`,
        policyType: 'transformation',
      };

    default:
      // Unknown policy type - fall back to simple routing
      return {
        realmId: findDeityAfterlifeRealm(deity) ?? DEFAULT_AFTERLIFE_REALM,
        reason: 'deity_afterlife',
        deityId,
        context: `Routed to ${deityName}'s afterlife`,
      };
  }
}

/**
 * Evaluate a judgment-based afterlife policy
 */
function evaluateJudgmentPolicy(
  entity: Entity,
  deity: Deity,
  policy: AfterlifePolicy
): SoulRoutingResult {
  const deityId = deity.id;
  const deityName = deity.identity.primaryName;

  // Get the entity's deed ledger
  const ledger = entity.components.get('deed_ledger') as DeedLedgerComponent | undefined;

  // Calculate deed score based on deity's weights
  let score = 0;
  if (ledger && policy.deedWeights) {
    score = calculateDeedScore(ledger, policy.deedWeights, true);
  }

  // Determine judgment tier
  const thresholds = policy.tierThresholds ?? DEFAULT_THRESHOLDS;
  const tier = getJudgmentTier(score, thresholds);

  // Get destination for this tier
  const destinations = policy.destinations ?? {};
  let realmId = destinations[tier];

  // Fall back through tiers if no destination defined
  if (!realmId) {
    if (tier === 'exemplary' && destinations.favorable) realmId = destinations.favorable;
    else if (tier === 'condemned' && destinations.unfavorable) realmId = destinations.unfavorable;
    else if (destinations.neutral) realmId = destinations.neutral;
    else realmId = findDeityAfterlifeRealm(deity) ?? DEFAULT_AFTERLIFE_REALM;
  }

  return {
    realmId,
    reason: 'deity_judgment',
    deityId,
    context: `${deityName} judges soul as ${tier} (score: ${score})`,
    policyType: 'judgment',
    judgmentTier: tier,
    deedScore: score,
  };
}

/**
 * Find the afterlife realm for a specific deity
 *
 * Searches the deity's ruledRealmIds for realms with category 'underworld'
 */
export function findDeityAfterlifeRealm(deity: Deity): string | undefined {
  if (!deity.ruledRealmIds || deity.ruledRealmIds.length === 0) {
    return undefined;
  }

  // Look through ruled realms for underworld-category realms
  for (const realmId of deity.ruledRealmIds) {
    const realmDef = getRealmDefinition(realmId);
    if (realmDef?.category === 'underworld') {
      return realmId;
    }
  }

  // No underworld realm found among ruled realms
  return undefined;
}

/**
 * Extract Deity interface from an entity
 *
 * Handles both DeityComponent-based entities and direct Deity entities
 */
function getDeityFromEntity(entity: Entity): Deity | undefined {
  // Check for deity component
  const deityComponent = entity.components.get('deity');
  if (deityComponent && isDeityLike(deityComponent)) {
    return deityComponent as unknown as Deity;
  }

  // Check if entity itself matches Deity interface
  // (for cases where deity is stored as entity metadata)
  const entityAny = entity as unknown as Record<string, unknown>;
  if (entityAny['entityType'] === 'deity' && entityAny['identity']) {
    return entityAny as unknown as Deity;
  }

  return undefined;
}

/**
 * Type guard to check if an object looks like a Deity
 */
function isDeityLike(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return 'identity' in record && 'ruledRealmIds' in record;
}

/**
 * Register a new afterlife realm for a deity
 *
 * Used when creating deity-specific underworlds dynamically
 */
export function registerDeityAfterlife(
  deity: Deity,
  realmId: string
): void {
  if (!deity.ruledRealmIds) {
    deity.ruledRealmIds = [];
  }
  if (!deity.ruledRealmIds.includes(realmId)) {
    deity.ruledRealmIds.push(realmId);
  }
}

/**
 * Check if a realm is an afterlife realm
 */
export function isAfterlifeRealm(realmId: string): boolean {
  const def = getRealmDefinition(realmId);
  return def?.category === 'underworld';
}

/**
 * Get all afterlife realms from a list of realm IDs
 */
export function filterAfterlifeRealms(realmIds: string[]): string[] {
  return realmIds.filter(isAfterlifeRealm);
}
