/**
 * Summonables JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to summonables.json
 */

import summonablesData from '../../../../data/summonables.json';

// Re-export all data (types remain in SummonableEntities.ts)
export const PERSONALITY_ARCHETYPES = summonablesData.personalityArchetypes;
export const NEGOTIATION_PATTERNS = summonablesData.negotiationPatterns;
export const DEMAND_PATTERNS = summonablesData.demandPatterns;
export const SERVICE_TEMPLATES = summonablesData.serviceTemplates;
export const CONTRACT_TEMPLATES = summonablesData.contractTemplates;
export const ENTITY_QUIRKS = summonablesData.entityQuirks;
export const BREACH_PATTERNS = summonablesData.breachPatterns;
export const APPEARANCE_PATTERNS = summonablesData.appearancePatterns;
export const SUMMONING_REQUIREMENT_PATTERNS = summonablesData.summoningRequirementPatterns;
export const EXAMPLE_SUMMONABLE_ENTITIES = summonablesData.exampleEntities;
