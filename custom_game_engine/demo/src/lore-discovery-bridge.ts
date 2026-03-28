/**
 * Lore Discovery Bridge — MVEE
 *
 * Subscribes to `lore:discovery` ECS events emitted by LoreDiscoverySystem
 * and forwards them to the shared LoreDiscoveryEmitter for the Akashic
 * Records wiki.
 *
 * Import once during game boot after systems are registered.
 *
 * Uses dynamic import so the build doesn't break when @akashic-records
 * isn't installed yet (package is still in development).
 */

import type { EventBus } from '@ai-village/core';

declare global {
  interface Window {
    matrixAuth?: {
      accessToken: string;
      userId: string;
    };
  }
}

let emitter: any = null;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize the lore discovery bridge. Call once after system registration.
 * Subscribes to `lore:discovery` ECS events and forwards them to the
 * LoreDiscoveryEmitter which handles batching, dedup, and POST to the API.
 *
 * No-ops gracefully if @akashic-records is not installed.
 */
export async function initLoreDiscoveryBridge(eventBus: EventBus): Promise<void> {
  if (emitter) {
    throw new Error('[LoreDiscoveryBridge] Already initialized — call destroyLoreDiscoveryBridge() first');
  }

  try {
    // The vendor module is UMD — Vite can't extract named ESM exports from it.
    // Grab the default/namespace and pull LoreDiscoveryEmitter from it.
    const mod: any = await import('@akashic-records/lib/lore-discovery-emitter.js');
    const LoreDiscoveryEmitter = mod.LoreDiscoveryEmitter ?? mod.default?.LoreDiscoveryEmitter ?? mod.default;
    if (typeof LoreDiscoveryEmitter !== 'function') return;
    emitter = new LoreDiscoveryEmitter({
      game: 'mvee',
      getAuthToken: () => window.matrixAuth?.accessToken ?? null,
      getUserId: () => window.matrixAuth?.userId ?? null,
    });

    const unsubscribers: Array<() => void> = [];

    // Forward basic discovery events
    unsubscribers.push(
      eventBus.on('lore:discovery' as any, (event: any) => {
        const { category, subject, aspect, detail } = event.data;
        emitter!.discover(category, subject, aspect, detail);
      })
    );

    // Forward religion/mythology lore events to emitter as civilization discoveries
    const religionEventMappings: Array<{
      event: string;
      map: (data: any) => { category: string; subject: string; aspect: string; detail: string | null };
    }> = [
      {
        event: 'lore:myth_created',
        map: (d) => ({ category: 'civilization', subject: d.deityId ?? d.title ?? 'unknown', aspect: 'emerged', detail: d.title ?? null }),
      },
      {
        event: 'lore:myth_canonized',
        map: (d) => ({ category: 'civilization', subject: d.deityId ?? d.title ?? 'unknown', aspect: 'texts_read', detail: d.title ?? null }),
      },
      {
        event: 'lore:myth_disputed',
        map: (d) => ({ category: 'civilization', subject: d.mythId ?? 'unknown', aspect: 'discovered', detail: d.reason ?? null }),
      },
      {
        event: 'lore:myth_mutated',
        map: (d) => ({ category: 'civilization', subject: d.mythId ?? 'unknown', aspect: 'discovered', detail: d.mutation?.changeDescription ?? d.mutation?.description ?? null }),
      },
      {
        event: 'lore:schism_occurred',
        map: (d) => ({ category: 'event', subject: d.schismId ?? 'schism', aspect: 'witnessed', detail: d.cause ?? null }),
      },
      {
        event: 'lore:syncretism_occurred',
        map: (d) => ({ category: 'event', subject: d.syncretismId ?? 'syncretism', aspect: 'participated', detail: d.outcome ?? null }),
      },
      {
        event: 'lore:holy_text_written',
        map: (d) => ({ category: 'civilization', subject: d.deityId ?? 'unknown', aspect: 'texts_read', detail: d.title ?? null }),
      },
      {
        event: 'lore:ritual_performed',
        map: (d) => ({ category: 'event', subject: d.name ?? d.ritualId ?? 'ritual', aspect: 'participated', detail: d.deityId ?? null }),
      },
      {
        event: 'lore:festival_occurred',
        map: (d) => ({ category: 'event', subject: d.name ?? d.ritualId ?? 'festival', aspect: 'participated', detail: d.deityId ?? null }),
      },
      {
        event: 'lore:deity_emerged',
        map: (d) => ({ category: 'civilization', subject: d.deityName ?? d.deityId ?? 'deity', aspect: 'emerged', detail: d.domain ?? null }),
      },
      {
        event: 'lore:deity_dormant',
        map: (d) => ({ category: 'civilization', subject: d.deityName ?? d.deityId ?? 'deity', aspect: 'identified', detail: 'dormant' }),
      },
    ];

    for (const mapping of religionEventMappings) {
      unsubscribers.push(
        eventBus.on(mapping.event as any, (event: any) => {
          const { category, subject, aspect, detail } = mapping.map(event.data ?? event);
          try {
            emitter!.discover(category, subject, aspect, detail);
          } catch {
            // Aspect/category not yet in emitter — skip silently
          }
        })
      );
    }

    unsubscribe = () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  } catch {
    // @akashic-records not installed yet — bridge is a no-op
  }
}

/**
 * Tear down the bridge. Flushes remaining events and removes the subscription.
 */
export function destroyLoreDiscoveryBridge(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (emitter) {
    emitter.destroy();
    emitter = null;
  }
}
