/**
 * Belief Attribution System - Types and Functions
 *
 * This module handles how witnesses attribute divine events to deities
 * and how that affects their perception of deity powers and domains.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A perceived power that a believer thinks a deity has
 */
export interface PerceivedPower {
  domain: DivineDomain;
  strength: number; // 0-1
  believerCount: number;
  origin: 'witnessed_miracle' | 'answered_prayer' | 'misattributed_event' | 'told_in_myth';
  firstWitnessed?: number; // Timestamp
}

/**
 * The perceived identity of a deity from a believer's perspective
 * (may differ from the deity's true identity)
 */
export interface DeityPerceivedIdentity {
  perceivedPowers: PerceivedPower[];
  primaryDomains: DivineDomain[];
}

/**
 * Result of processing a witnessed miracle
 */
export interface MiracleWitnessResult {
  generalBeliefGained: number;
  domainBeliefGained: Partial<Record<DivineDomain, number>>;
  isFirstWitness: boolean;
  perceivedPower: PerceivedPower | null;
  totalBonus: number;
}

/**
 * Result of processing an answered prayer
 */
export interface PrayerAnsweredResult {
  generalBeliefGained: number;
  domainBeliefGained: Partial<Record<DivineDomain, number>>;
  exactMatch: boolean;
  totalBonus: number;
}

/**
 * Result of processing a misattributed event
 */
export interface MisattributedEventResult {
  domainBeliefGained: number;
  isNewDomain: boolean;
  perceivedPower: PerceivedPower;
}

/**
 * Belief contribution split between general and domain-specific
 */
export interface BeliefContribution {
  generalBelief: number;
  domainBelief: Partial<Record<DivineDomain, number>>;
}

// ============================================================================
// Constants
// ============================================================================

const BASE_MIRACLE_BELIEF = 5.0;
const BASE_PRAYER_BELIEF = 3.0;
const BASE_MISATTRIBUTION_BELIEF = 2.0;

const FIRST_WITNESS_BONUS = 2.0;
const EXACT_MATCH_BONUS = 2.0;

const GENERAL_BELIEF_RATIO = 0.3; // 30% goes to general belief
const DOMAIN_BELIEF_RATIO = 0.7; // 70% split among domains

// ============================================================================
// Functions
// ============================================================================

/**
 * Create a blank perceived identity for a new deity
 */
export function createInitialPerceivedIdentity(): DeityPerceivedIdentity {
  return {
    perceivedPowers: [],
    primaryDomains: [],
  };
}

/**
 * Process a witnessed miracle and update perceived identity
 */
export function processMiracleWitness(
  domain: DivineDomain,
  description: string,
  faithLevel: number,
  identity: DeityPerceivedIdentity
): MiracleWitnessResult {
  // Check if this is the first witnessed miracle in this domain
  const existingPower = identity.perceivedPowers.find(p => p.domain === domain);
  const isFirstWitness = !existingPower;

  // Calculate base belief
  const baseBelief = BASE_MIRACLE_BELIEF * faithLevel;
  const bonus = isFirstWitness ? FIRST_WITNESS_BONUS : 1.0;
  const totalBelief = baseBelief * bonus;

  // Split between general and domain belief
  const generalBelief = totalBelief * GENERAL_BELIEF_RATIO;
  const domainBelief = totalBelief * DOMAIN_BELIEF_RATIO;

  // Update or create perceived power
  let perceivedPower: PerceivedPower;
  if (existingPower) {
    existingPower.strength = Math.min(1.0, existingPower.strength + 0.1);
    existingPower.believerCount += 1;
    perceivedPower = existingPower;
  } else {
    perceivedPower = {
      domain,
      strength: 0.5,
      believerCount: 1,
      origin: 'witnessed_miracle',
      firstWitnessed: Date.now(),
    };
    identity.perceivedPowers.push(perceivedPower);

    // Update primary domains if this is a new strong association
    if (!identity.primaryDomains.includes(domain)) {
      identity.primaryDomains.push(domain);
    }
  }

  return {
    generalBeliefGained: generalBelief,
    domainBeliefGained: { [domain]: domainBelief },
    isFirstWitness,
    perceivedPower,
    totalBonus: bonus,
  };
}

/**
 * Process an answered prayer and update perceived identity
 */
export function processPrayerAnswered(
  domain: DivineDomain,
  description: string,
  faithLevel: number,
  identity: DeityPerceivedIdentity,
  exactMatch: boolean
): PrayerAnsweredResult {
  // Calculate base belief
  const baseBelief = BASE_PRAYER_BELIEF * faithLevel;
  const bonus = exactMatch ? EXACT_MATCH_BONUS : 1.0;
  const totalBelief = baseBelief * bonus;

  // Split between general and domain belief
  const generalBelief = totalBelief * GENERAL_BELIEF_RATIO;
  const domainBelief = totalBelief * DOMAIN_BELIEF_RATIO;

  // Update or create perceived power
  const existingPower = identity.perceivedPowers.find(p => p.domain === domain);
  if (existingPower) {
    existingPower.strength = Math.min(1.0, existingPower.strength + 0.05);
    existingPower.believerCount += 1;
  } else {
    const newPower: PerceivedPower = {
      domain,
      strength: 0.4,
      believerCount: 1,
      origin: 'answered_prayer',
      firstWitnessed: Date.now(),
    };
    identity.perceivedPowers.push(newPower);

    if (!identity.primaryDomains.includes(domain)) {
      identity.primaryDomains.push(domain);
    }
  }

  return {
    generalBeliefGained: generalBelief,
    domainBeliefGained: { [domain]: domainBelief },
    exactMatch,
    totalBonus: bonus,
  };
}

/**
 * Process a misattributed event (deity blamed for something they didn't do)
 */
export function processMisattributedEvent(
  domain: DivineDomain,
  description: string,
  witnessCount: number,
  averageFaith: number,
  identity: DeityPerceivedIdentity
): MisattributedEventResult {
  // Check if this domain is new
  const existingPower = identity.perceivedPowers.find(p => p.domain === domain);
  const isNewDomain = !existingPower;

  // Calculate belief based on witnesses
  const baseBelief = BASE_MISATTRIBUTION_BELIEF * averageFaith * Math.sqrt(witnessCount);

  // Update or create perceived power
  let perceivedPower: PerceivedPower;
  if (existingPower) {
    existingPower.strength = Math.min(1.0, existingPower.strength + 0.1);
    existingPower.believerCount += witnessCount;
    perceivedPower = existingPower;
  } else {
    perceivedPower = {
      domain,
      strength: 0.3,
      believerCount: witnessCount,
      origin: 'misattributed_event',
      firstWitnessed: Date.now(),
    };
    identity.perceivedPowers.push(perceivedPower);

    if (!identity.primaryDomains.includes(domain)) {
      identity.primaryDomains.push(domain);
    }
  }

  return {
    domainBeliefGained: baseBelief,
    isNewDomain,
    perceivedPower,
  };
}

/**
 * Calculate how total belief is split between general and domain-specific
 */
export function calculateBeliefContribution(
  totalBelief: number,
  perceivedDomains: DivineDomain[],
  powerStrengths: Partial<Record<DivineDomain, number>>
): BeliefContribution {
  // Allocate 30% to general belief
  const generalBelief = totalBelief * GENERAL_BELIEF_RATIO;

  // Allocate 70% to domains, weighted by power strength
  const domainPool = totalBelief * DOMAIN_BELIEF_RATIO;
  const domainBelief: Partial<Record<DivineDomain, number>> = {};

  // Calculate total strength
  const totalStrength = perceivedDomains.reduce(
    (sum, domain) => sum + (powerStrengths[domain] ?? 0.5),
    0
  );

  if (totalStrength > 0) {
    // Distribute proportionally to strength
    for (const domain of perceivedDomains) {
      const strength = powerStrengths[domain] ?? 0.5;
      const proportion = strength / totalStrength;
      domainBelief[domain] = domainPool * proportion;
    }
  }

  return {
    generalBelief,
    domainBelief,
  };
}
