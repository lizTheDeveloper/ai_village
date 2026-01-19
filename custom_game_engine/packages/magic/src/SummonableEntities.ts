/**
 * Summonable Entities - Component Library for LLM Generation
 *
 * This file re-exports all summonable entity types and data from @ai-village/core.
 * The actual data is stored in JSON format in the core package.
 *
 * Philosophy: Gods create these beings. Mages summon them. Both discover they're
 * dealing with entities who have opinions about the arrangement. Most of those
 * opinions are unflattering.
 */

// Re-export everything from core package
// Note: Import from package root, not internal src path
export type {
  SummonableEntity,
  EntityCategory,
  EntityRank,
  EntityPersonality,
  EntityDemand,
  DemandType,
  NegotiationStyle,
  DemandPattern,
  EntityService,
  ServiceTemplate,
  ContractType,
  EntityAppearance,
  AppearancePattern,
  BreachConsequence,
  SummoningRequirement,
  SummoningNegotiation,
  NegotiationOffer,
  ActiveContract,
} from '@ai-village/core';

export {
  PERSONALITY_ARCHETYPES,
  NEGOTIATION_PATTERNS,
  DEMAND_PATTERNS,
  SERVICE_TEMPLATES,
  CONTRACT_TEMPLATES,
  ENTITY_QUIRKS,
  BREACH_PATTERNS,
  APPEARANCE_PATTERNS,
  SUMMONING_REQUIREMENT_PATTERNS,
  EXAMPLE_SUMMONABLE_ENTITIES,
} from '@ai-village/core';
