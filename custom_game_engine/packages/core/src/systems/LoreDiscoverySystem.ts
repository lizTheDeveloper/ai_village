/**
 * LoreDiscoverySystem - Bridges MVEE internal ECS events to the shared
 * LoreDiscoveryEmitter for the Akashic Records wiki.
 *
 * This system is intentionally decoupled from the browser-only
 * LoreDiscoveryEmitter. Instead of calling the emitter directly, it emits a
 * typed `lore:discovery` ECS event. The game's initialization code is
 * responsible for subscribing to that event and forwarding it to the emitter.
 *
 * Event subscriptions (all in onInitialize):
 *   civilization:biome_discovered  → biome / entered
 *   civilization:biome_explored    → biome / explored
 *   agent:born                     → species / encountered (first per species)
 *                                    species / behavior (at count 5+)
 *   hand:carry                     → species / encountered (player pickup)
 *   exploration:resource_discovered → item / found
 *   exploration:rare_find           → item / found
 *   exploration:stellar_phenomenon_discovered → event / witnessed
 *   exploration:planet_discovered   → event / witnessed
 *
 * Priority: 950 (utility tier, runs late)
 * throttleInterval: 10000 (no-op update, all work is event-driven)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { ComponentType } from '../types.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';

/**
 * LoreDiscoverySystem — event-driven bridge to the Akashic Records wiki.
 *
 * All processing happens in event handlers registered in onInitialize.
 * onUpdate is a deliberate no-op (throttleInterval set very high).
 */
export class LoreDiscoverySystem extends BaseSystem {
  public readonly id = 'lore_discovery' as const;
  public readonly priority = 950;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [] as const;
  protected readonly throttleInterval = 10000;

  /** Counts how many times each speciesId has been seen via agent:born. */
  private speciesEncounterCounts: Map<string, number> = new Map();

  /**
   * Manually tracked unsubscribe functions so onCleanup can tear them all
   * down explicitly.
   */
  private unsubscribeFns: Array<() => void> = [];

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  protected onInitialize(): void {
    this.unsubscribeFns = [];

    // civilization:biome_discovered → biome / entered
    this.unsubscribeFns.push(
      this.events.on('civilization:biome_discovered', (data) => {
        this.emitDiscovery('biome', data.biomeType, 'entered', null);
      })
    );

    // civilization:biome_explored → biome / explored
    this.unsubscribeFns.push(
      this.events.on('civilization:biome_explored', (data) => {
        this.emitDiscovery('biome', data.biomeType, 'explored', null);
      })
    );

    // agent:born → species / encountered (first per species)
    //            → species / behavior     (at count 5+)
    this.unsubscribeFns.push(
      this.events.on('agent:born', (data) => {
        const speciesId = this.resolveSpeciesId(data.agentId);

        const previousCount = this.speciesEncounterCounts.get(speciesId) ?? 0;
        const newCount = previousCount + 1;
        this.speciesEncounterCounts.set(speciesId, newCount);

        if (previousCount === 0) {
          this.emitDiscovery('species', speciesId, 'encountered', null);
        }

        if (newCount >= 5 && previousCount < 5) {
          this.emitDiscovery('species', speciesId, 'behavior', null);
        }
      })
    );

    // hand:carry → species / encountered
    // Wire direct player pickup interactions into lore discovery stream.
    this.unsubscribeFns.push(
      this.events.on('hand:carry', (data) => {
        const speciesId = this.resolveSpeciesId(data.agentId);
        this.emitDiscovery('species', speciesId, 'encountered', 'hand_carry');
      })
    );

    // exploration:resource_discovered → item / found
    this.unsubscribeFns.push(
      this.events.on('exploration:resource_discovered', (data) => {
        this.emitDiscovery('item', data.resourceType, 'found', null);
      })
    );

    // exploration:rare_find → item / found
    this.unsubscribeFns.push(
      this.events.on('exploration:rare_find', (data) => {
        this.emitDiscovery('item', data.resourceType, 'found', null);
      })
    );

    // exploration:stellar_phenomenon_discovered → event / witnessed
    this.unsubscribeFns.push(
      this.events.on('exploration:stellar_phenomenon_discovered', (data) => {
        this.emitDiscovery('event', data.phenomenonId, 'witnessed', data.phenomenonType);
      })
    );

    // exploration:planet_discovered → event / witnessed
    this.unsubscribeFns.push(
      this.events.on('exploration:planet_discovered', (data) => {
        this.emitDiscovery('event', data.planetId, 'witnessed', data.planetType);
      })
    );
  }

  protected onCleanup(): void {
    for (const unsub of this.unsubscribeFns) {
      unsub();
    }
    this.unsubscribeFns = [];
    this.speciesEncounterCounts.clear();
  }

  // --------------------------------------------------------------------------
  // Update (intentional no-op — all work is event-driven)
  // --------------------------------------------------------------------------

  protected onUpdate(_ctx: SystemContext): void {
    // Deliberate no-op. All discovery logic is handled in event callbacks
    // registered in onInitialize. throttleInterval is set to 10000 to avoid
    // unnecessary scheduler overhead.
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private resolveSpeciesId(agentId: string): string {
    const entity = this.world.getEntity(agentId);
    const speciesComp = entity?.getComponent<SpeciesComponent>(CT.Species);
    return speciesComp?.speciesId ?? agentId;
  }

  private emitDiscovery(
    category: string,
    subject: string,
    aspect: string,
    detail: string | null,
  ): void {
    this.events.emit('lore:discovery', {
      category,
      subject,
      aspect,
      detail,
    });
  }
}
