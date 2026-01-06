/**
 * Summonable Entities - Module Index
 *
 * Re-exports all summoning-related types and data.
 * This module is designed for LLM-driven entity generation.
 */

// Core types
export * from './types.js';

// Data libraries
export { PERSONALITY_ARCHETYPES } from './personalities.js';

// Re-export from the original file
export {
  NEGOTIATION_PATTERNS,
  DEMAND_PATTERNS,
  SERVICE_TEMPLATES,
  CONTRACT_TEMPLATES,
  ENTITY_QUIRKS,
  BREACH_PATTERNS,
  APPEARANCE_PATTERNS,
  SUMMONING_REQUIREMENT_PATTERNS,
  EXAMPLE_SUMMONABLE_ENTITIES,
} from '../SummonableEntities.js';
