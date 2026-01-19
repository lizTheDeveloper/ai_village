/**
 * PoliticalEntityComponent - Represents a political entity in the hierarchy
 *
 * Phase 6 (AI Governance): Political entities exist at each tier of the grand
 * strategy system, from villages to galactic councils. Each entity can have
 * governors, child entities, and pending directives from higher tiers.
 *
 * Hierarchy:
 * - galactic_council (top)
 *   → empire
 *     → nation
 *       → province
 *         → village (bottom)
 *
 * Each entity tracks its governor, parent/child relationships, resources,
 * and pending directives/crises requiring attention.
 */

import type { Component } from '../ecs/Component.js';
import type { PoliticalTier } from './GovernorComponent.js';

/**
 * Directive from a higher-tier entity to a lower-tier entity.
 * Example: Empire directs nations to prioritize military production.
 */
export interface PoliticalDirective {
  fromTier: PoliticalTier;
  type: string;
  parameters: Record<string, unknown>;
  deadline: number; // Tick by which directive must be addressed
  priority: number; // 0-1 (higher = more urgent)
}

/**
 * Crisis requiring governor attention.
 * Example: Province reports military attack requiring national response.
 */
export interface PoliticalCrisis {
  type: string;
  severity: number; // 0-1 (higher = more severe)
  description: string;
  reportedAt: number; // Tick when crisis was reported
}

/**
 * Voting protocol for councils/parliaments with multiple governors.
 */
export type VotingProtocol = 'majority' | 'unanimous' | 'weighted';

/**
 * PoliticalEntityComponent represents a political entity at any tier of the hierarchy.
 *
 * Can be:
 * - A village (lowest tier, no governor)
 * - A province/city (governed by a mayor)
 * - A nation (governed by a monarch or parliament)
 * - An empire (governed by an emperor and council)
 * - A galactic council (multi-species assembly)
 */
export interface PoliticalEntityComponent extends Component {
  type: 'political_entity';
  version: 1;

  // Identity
  tier: PoliticalTier;
  name: string;

  // Hierarchy
  governorId?: string; // Reference to governor entity (if single governor)
  parentEntityId?: string; // Reference to higher-tier entity
  childEntityIds: string[]; // References to lower-tier entities

  // Basic Stats
  population: number;
  territory: number; // Star systems, provinces, or area depending on tier
  resources: Record<string, number>;

  // For councils/parliaments with multiple governors
  councilMemberIds?: string[];
  votingProtocol?: VotingProtocol;

  // Directives from higher tiers
  pendingDirectives: PoliticalDirective[];

  // Crises requiring attention
  pendingCrises: PoliticalCrisis[];
}

/**
 * Create a new PoliticalEntityComponent with sensible defaults.
 *
 * @param tier - Political tier
 * @param name - Entity name
 * @returns PoliticalEntityComponent with defaults
 */
export function createPoliticalEntityComponent(
  tier: PoliticalTier,
  name: string
): PoliticalEntityComponent {
  return {
    type: 'political_entity',
    version: 1,
    tier,
    name,
    parentEntityId: undefined,
    childEntityIds: [],
    population: 0,
    territory: 0,
    resources: {},
    pendingDirectives: [],
    pendingCrises: [],
  };
}

/**
 * Set the governor for a political entity.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param governorId - ID of the governor entity
 */
export function setGovernor(entity: PoliticalEntityComponent, governorId: string): void {
  entity.governorId = governorId;
}

/**
 * Set up a council/parliament with multiple governors.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param councilMemberIds - IDs of council member entities
 * @param votingProtocol - Voting protocol for the council
 */
export function setCouncil(
  entity: PoliticalEntityComponent,
  councilMemberIds: string[],
  votingProtocol: VotingProtocol
): void {
  if (councilMemberIds.length === 0) {
    throw new Error('Council must have at least one member');
  }

  entity.councilMemberIds = [...councilMemberIds];
  entity.votingProtocol = votingProtocol;
  entity.governorId = undefined; // Council overrides single governor
}

/**
 * Add a child entity to the hierarchy.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param childId - ID of the child entity
 */
export function addChildEntity(entity: PoliticalEntityComponent, childId: string): void {
  if (entity.childEntityIds.includes(childId)) {
    throw new Error(`Child entity ${childId} already exists`);
  }

  entity.childEntityIds.push(childId);
}

/**
 * Remove a child entity from the hierarchy.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param childId - ID of the child entity
 */
export function removeChildEntity(entity: PoliticalEntityComponent, childId: string): void {
  const index = entity.childEntityIds.indexOf(childId);
  if (index === -1) {
    throw new Error(`Child entity ${childId} not found`);
  }

  entity.childEntityIds.splice(index, 1);
}

/**
 * Set the parent entity in the hierarchy.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param parentId - ID of the parent entity
 */
export function setParentEntity(entity: PoliticalEntityComponent, parentId: string): void {
  entity.parentEntityId = parentId;
}

/**
 * Receive a directive from a higher-tier entity.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param directive - Directive to add
 */
export function receiveDirective(
  entity: PoliticalEntityComponent,
  directive: PoliticalDirective
): void {
  entity.pendingDirectives.push(directive);

  // Sort by priority (highest first)
  entity.pendingDirectives.sort((a, b) => b.priority - a.priority);

  // Keep directive queue reasonable (max 50 directives)
  if (entity.pendingDirectives.length > 50) {
    // Remove lowest priority directive
    entity.pendingDirectives.pop();
  }
}

/**
 * Complete a directive.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param directiveIndex - Index of the directive to complete
 */
export function completeDirective(entity: PoliticalEntityComponent, directiveIndex: number): void {
  if (directiveIndex < 0 || directiveIndex >= entity.pendingDirectives.length) {
    throw new Error(`Invalid directive index: ${directiveIndex}`);
  }

  entity.pendingDirectives.splice(directiveIndex, 1);
}

/**
 * Get directives by type.
 *
 * @param entity - PoliticalEntityComponent to query
 * @param type - Directive type filter
 * @returns Directives matching the type
 */
export function getDirectivesByType(
  entity: PoliticalEntityComponent,
  type: string
): PoliticalDirective[] {
  return entity.pendingDirectives.filter(d => d.type === type);
}

/**
 * Get overdue directives (past deadline).
 *
 * @param entity - PoliticalEntityComponent to query
 * @param currentTick - Current game tick
 * @returns Directives past their deadline
 */
export function getOverdueDirectives(
  entity: PoliticalEntityComponent,
  currentTick: number
): PoliticalDirective[] {
  return entity.pendingDirectives.filter(d => d.deadline < currentTick);
}

/**
 * Report a crisis to the entity.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param crisis - Crisis to report
 */
export function reportCrisis(entity: PoliticalEntityComponent, crisis: PoliticalCrisis): void {
  entity.pendingCrises.push(crisis);

  // Sort by severity (highest first)
  entity.pendingCrises.sort((a, b) => b.severity - a.severity);

  // Keep crisis queue reasonable (max 20 crises)
  if (entity.pendingCrises.length > 20) {
    // Remove lowest severity crisis
    entity.pendingCrises.pop();
  }
}

/**
 * Resolve a crisis.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param crisisIndex - Index of the crisis to resolve
 */
export function resolveCrisis(entity: PoliticalEntityComponent, crisisIndex: number): void {
  if (crisisIndex < 0 || crisisIndex >= entity.pendingCrises.length) {
    throw new Error(`Invalid crisis index: ${crisisIndex}`);
  }

  entity.pendingCrises.splice(crisisIndex, 1);
}

/**
 * Get crises by type.
 *
 * @param entity - PoliticalEntityComponent to query
 * @param type - Crisis type filter
 * @returns Crises matching the type
 */
export function getCrisesByType(entity: PoliticalEntityComponent, type: string): PoliticalCrisis[] {
  return entity.pendingCrises.filter(c => c.type === type);
}

/**
 * Get the most severe crisis.
 *
 * @param entity - PoliticalEntityComponent to query
 * @returns Most severe crisis, or undefined if none
 */
export function getMostSevereCrisis(entity: PoliticalEntityComponent): PoliticalCrisis | undefined {
  if (entity.pendingCrises.length === 0) {
    return undefined;
  }

  // Already sorted by severity
  return entity.pendingCrises[0];
}

/**
 * Get the highest priority directive.
 *
 * @param entity - PoliticalEntityComponent to query
 * @returns Highest priority directive, or undefined if none
 */
export function getHighestPriorityDirective(
  entity: PoliticalEntityComponent
): PoliticalDirective | undefined {
  if (entity.pendingDirectives.length === 0) {
    return undefined;
  }

  // Already sorted by priority
  return entity.pendingDirectives[0];
}

/**
 * Update resource amount.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param resourceType - Type of resource
 * @param delta - Change in resource amount
 */
export function updateResource(
  entity: PoliticalEntityComponent,
  resourceType: string,
  delta: number
): void {
  const current = entity.resources[resourceType] ?? 0;
  const newAmount = current + delta;

  if (newAmount < 0) {
    throw new Error(
      `Cannot reduce resource ${resourceType} below 0 (current: ${current}, delta: ${delta})`
    );
  }

  entity.resources[resourceType] = newAmount;
}

/**
 * Set resource amount.
 *
 * @param entity - PoliticalEntityComponent to update
 * @param resourceType - Type of resource
 * @param amount - New resource amount
 */
export function setResource(
  entity: PoliticalEntityComponent,
  resourceType: string,
  amount: number
): void {
  if (amount < 0) {
    throw new Error(`Resource amount cannot be negative: ${amount}`);
  }

  entity.resources[resourceType] = amount;
}

/**
 * Get resource amount.
 *
 * @param entity - PoliticalEntityComponent to query
 * @param resourceType - Type of resource
 * @returns Resource amount, or 0 if not found
 */
export function getResource(entity: PoliticalEntityComponent, resourceType: string): number {
  return entity.resources[resourceType] ?? 0;
}

/**
 * Check if entity is governed by a council.
 *
 * @param entity - PoliticalEntityComponent to query
 * @returns True if entity has a council
 */
export function hasCouncil(entity: PoliticalEntityComponent): boolean {
  return (entity.councilMemberIds?.length ?? 0) > 0;
}

/**
 * Check if entity is governed by a single governor.
 *
 * @param entity - PoliticalEntityComponent to query
 * @returns True if entity has a single governor
 */
export function hasSingleGovernor(entity: PoliticalEntityComponent): boolean {
  return entity.governorId !== undefined && !hasCouncil(entity);
}

/**
 * Check if entity is ungoverned (no governor or council).
 *
 * @param entity - PoliticalEntityComponent to query
 * @returns True if entity has no governor
 */
export function isUngoverned(entity: PoliticalEntityComponent): boolean {
  return !hasSingleGovernor(entity) && !hasCouncil(entity);
}
