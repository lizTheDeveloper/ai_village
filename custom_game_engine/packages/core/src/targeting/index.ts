/**
 * Targeting Module - Domain-specific targeting implementations
 *
 * These classes provide specialized targeting logic for different entity types,
 * all respecting perception limits (agents can only target what they see/remember).
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

export { ResourceTargeting, type ResourceTargetingOptions } from './ResourceTargeting.js';
export { PlantTargeting, type PlantTargetingOptions } from './PlantTargeting.js';
export { BuildingTargeting, type BuildingTargetingOptions } from './BuildingTargeting.js';
export { AgentTargeting, type AgentTargetingOptions } from './AgentTargeting.js';
export { ThreatTargeting, type ThreatTargetingOptions } from './ThreatTargeting.js';
