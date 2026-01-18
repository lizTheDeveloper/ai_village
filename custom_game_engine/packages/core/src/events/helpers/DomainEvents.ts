/**
 * Domain event helpers for subscribing to groups of related events.
 */
import type { EventBus } from '../EventBus.js';
import type { GameEvent } from '../GameEvent.js';
import type { Unsubscribe } from '../GameEvent.js';

// Import domain types
import type { WorldEvents, WorldEventType } from '../domains/world.events.js';
import type { AgentEvents, AgentEventType } from '../domains/agent.events.js';
import type { PlantEvents, PlantEventType } from '../domains/plant.events.js';
import type { BuildingEvents, BuildingEventType } from '../domains/building.events.js';
import type { CombatEvents, CombatEventType } from '../domains/combat.events.js';
import type { SocialEvents, SocialEventType } from '../domains/social.events.js';
import type { EconomyEvents, EconomyEventType } from '../domains/economy.events.js';
import type { MagicEvents, MagicEventType } from '../domains/magic.events.js';
import type { MediaEvents, MediaEventType } from '../domains/media.events.js';
import type { RebellionEvents, RebellionEventType } from '../domains/rebellion.events.js';
import type { ResearchEvents, ResearchEventType } from '../domains/research.events.js';
import type { NavigationEvents, NavigationEventType } from '../domains/navigation.events.js';
import type { AnimalEvents, AnimalEventType } from '../domains/animal.events.js';
import type { SpaceEvents, SpaceEventType } from '../domains/space.events.js';
import type { MultiverseEvents, MultiverseEventType } from '../domains/multiverse.events.js';
import type { UIEvents, UIEventType } from '../domains/ui.events.js';
import type { ActionEvents, ActionEventType } from '../domains/action.events.js';
import type { MiscEvents, MiscEventType } from '../domains/misc.events.js';

/**
 * Map of domain names to their event interfaces.
 */
export interface DomainMap {
  world: WorldEvents;
  agent: AgentEvents;
  plant: PlantEvents;
  building: BuildingEvents;
  combat: CombatEvents;
  social: SocialEvents;
  economy: EconomyEvents;
  magic: MagicEvents;
  media: MediaEvents;
  rebellion: RebellionEvents;
  research: ResearchEvents;
  navigation: NavigationEvents;
  animal: AnimalEvents;
  space: SpaceEvents;
  multiverse: MultiverseEvents;
  ui: UIEvents;
  action: ActionEvents;
  misc: MiscEvents;
}

/**
 * All domain names.
 */
export type DomainName = keyof DomainMap;

/**
 * Get event types for a specific domain.
 */
export type DomainEventTypes<D extends DomainName> = keyof DomainMap[D];

/**
 * Get event data union for a specific domain.
 */
export type DomainEventData<D extends DomainName> = DomainMap[D][keyof DomainMap[D]];

/**
 * Domain prefixes for runtime event matching.
 */
export const DOMAIN_PREFIXES: Record<DomainName, readonly string[]> = {
  world: ['world:', 'time:', 'checkpoint:'],
  agent: ['agent:', 'behavior:', 'need:', 'body:'],
  plant: ['plant:', 'seed:', 'soil:', 'wild_plant:', 'harvest:'],
  building: ['building:', 'construction:', 'door:', 'housing:'],
  combat: ['combat:', 'conflict:', 'guard:', 'hunt:', 'predator:', 'invasion:', 'injury:'],
  social: ['conversation:', 'relationship:', 'courtship:', 'parenting:', 'friendship:', 'trust:', 'dominance:'],
  economy: ['trade:', 'trade_agreement:', 'market:', 'crafting:', 'cooking:', 'item:', 'items:', 'inventory:', 'storage:', 'resource:', 'gathering:'],
  magic: ['magic:', 'divine:', 'divine_power:', 'divinity:', 'prayer:', 'soul:', 'angel:', 'deity:', 'possession:', 'sacred_site:', 'godcrafted:', 'vision:', 'group_vision:', 'group_prayer:', 'wisdom:'],
  media: ['tv:', 'radio:', 'publishing:', 'library:', 'bookstore:', 'journal:', 'paper:'],
  rebellion: ['rebellion:', 'punishment:', 'mandate:', 'province:'],
  research: ['research:', 'university:', 'experiment:', 'technology:', 'recipe:', 'discovery:', 'capability_gap:'],
  navigation: ['navigation:', 'exploration:', 'spatial:', 'zone:', 'terrain:', 'passage:', 'chunk'],
  animal: ['animal:'],
  space: ['spaceship:', 'fleet:', 'planet:', 'station:', 'lane:'],
  multiverse: ['multiverse:', 'universe:', 'reality_anchor:', 'lore:'],
  ui: ['ui:', 'input:', 'notification:', 'chat:', 'pixellab:'],
  action: ['action:'],
  misc: ['belief:', 'memory:', 'mood:', 'skill:', 'trauma:', 'stress:', 'guild:', 'village:', 'weather:', 'fire:', 'disaster:', 'fluid:', 'voxel_resource:', 'death:', 'information:', 'entity:', 'interest:', 'llm:', 'conception', 'myth:', 'progression:', 'reporter:', 'title:', 'animation:', 'union:', 'reflection:', 'vr_session:', 'news:', 'festival:', 'temperature:', 'squadron:', 'walkie_talkie', 'cell_phone', 'cell_network', 'memory_bleed', 'test:'],
} as const;

/**
 * Check if an event type belongs to a domain.
 */
export function eventBelongsToDomain(eventType: string, domain: DomainName): boolean {
  const prefixes = DOMAIN_PREFIXES[domain];
  return prefixes.some(prefix => eventType.startsWith(prefix));
}

/**
 * Get the domain for an event type.
 */
export function getDomainForEvent(eventType: string): DomainName | null {
  for (const [domain, prefixes] of Object.entries(DOMAIN_PREFIXES) as [DomainName, readonly string[]][]) {
    if (prefixes.some(prefix => eventType.startsWith(prefix))) {
      return domain;
    }
  }
  return null;
}
