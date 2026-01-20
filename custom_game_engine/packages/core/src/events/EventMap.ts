/**
 * Unified event type definitions aggregated from domain modules.
 *
 * This file re-exports all event types from domain-specific modules
 * for backward compatibility. New code should import from domains directly.
 *
 * @see ./domains/ for domain-specific event definitions
 * @see ./helpers/DomainEvents.ts for domain subscription helpers
 */

import type { EntityId } from '../types.js';

// Import all domain event interfaces
import type { WorldEvents } from './domains/world.events.js';
import type { AgentEvents } from './domains/agent.events.js';
import type { PlantEvents } from './domains/plant.events.js';
import type { BuildingEvents } from './domains/building.events.js';
import type { CognitiveEvents } from './domains/cognitive.events.js';
import type { CombatEvents } from './domains/combat.events.js';
import type { CompanionEvents } from './domains/companion.events.js';
import type { SocialEvents } from './domains/social.events.js';
import type { EconomyEvents } from './domains/economy.events.js';
import type { MagicEvents } from './domains/magic.events.js';
import type { MediaEvents } from './domains/media.events.js';
import type { RebellionEvents } from './domains/rebellion.events.js';
import type { ResearchEvents } from './domains/research.events.js';
import type { NavigationEvents } from './domains/navigation.events.js';
import type { AnimalEvents } from './domains/animal.events.js';
import type { SpaceEvents } from './domains/space.events.js';
import type { MultiverseEvents } from './domains/multiverse.events.js';
import type { UIEvents } from './domains/ui.events.js';
import type { WorkEvents } from './domains/work.events.js';
import type { ActionEvents } from './domains/action.events.js';
import type { MiscEvents } from './domains/misc.events.js';
import type { GovernanceEvents } from './domains/governance.events.js';
import type { ExplorationEvents } from './domains/exploration.events.js';

/**
 * Unified map of all event types to their data payloads.
 *
 * Aggregates all domain-specific event interfaces for backward compatibility.
 * This interface is used for type-safe event emission and subscription.
 *
 * @example
 * ```typescript
 * eventBus.emit<'agent:idle'>({
 *   type: 'agent:idle',
 *   source: agentId,
 *   data: { agentId } // Typed!
 * });
 * ```
 */
export interface GameEventMap extends
  WorldEvents,
  AgentEvents,
  PlantEvents,
  BuildingEvents,
  CognitiveEvents,
  CombatEvents,
  CompanionEvents,
  SocialEvents,
  EconomyEvents,
  MagicEvents,
  MediaEvents,
  RebellionEvents,
  ResearchEvents,
  NavigationEvents,
  AnimalEvents,
  SpaceEvents,
  MultiverseEvents,
  UIEvents,
  WorkEvents,
  ActionEvents,
  MiscEvents,
  GovernanceEvents,
  ExplorationEvents {}

/**
 * Union type of all valid event type strings.
 */
export type EventType = keyof GameEventMap;

/**
 * Get the data type for a specific event type.
 */
export type EventData<T extends EventType> = GameEventMap[T];

// Re-export domain types for convenience
export type {
  WorldEvents,
  AgentEvents,
  PlantEvents,
  BuildingEvents,
  CognitiveEvents,
  CombatEvents,
  CompanionEvents,
  SocialEvents,
  EconomyEvents,
  MagicEvents,
  MediaEvents,
  RebellionEvents,
  ResearchEvents,
  NavigationEvents,
  AnimalEvents,
  SpaceEvents,
  MultiverseEvents,
  UIEvents,
  WorkEvents,
  ActionEvents,
  MiscEvents,
};
