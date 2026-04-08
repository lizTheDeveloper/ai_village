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
import { mapMythCategory, mapMythStatus, mapPersonality } from '../../packages/core/src/lore/MythExporter.js';
import type {
  PortableMyth,
  PortableDeity,
  PortableRitual,
  PortableMythCategory,
  PortableRitualType,
  RitualFrequency,
  DeityPersonalityVector,
} from '../../packages/core/src/lore/PortableLoreTypes.js';

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
    // Use a variable so Vite's static import analysis doesn't fail when
    // @akashic-records is not installed (it's an optional dependency).
    const emitterPath = '@akashic-records/lib/lore-discovery-emitter.js';
    const mod: any = await import(/* @vite-ignore */ emitterPath);
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

    // -------------------------------------------------------------------------
    // Portable lore exporters — construct PortableMyth/PortableDeity/PortableRitual
    // from event data and call emitter.emitPortableLore() when available.
    // -------------------------------------------------------------------------

    function tryMapMythCategory(category: string): PortableMythCategory {
      try {
        return mapMythCategory(category);
      } catch {
        return 'origin';
      }
    }

    function tryMapPersonality(p: unknown): DeityPersonalityVector | undefined {
      try {
        return mapPersonality(p as Parameters<typeof mapPersonality>[0]);
      } catch {
        return undefined;
      }
    }

    function defaultPortablePersonality(): DeityPersonalityVector {
      return {
        benevolence: 0.5,
        interventionism: 0.5,
        wrathfulness: 0.5,
        mysteriousness: 0.5,
        generosity: 0.5,
        consistency: 0.5,
      };
    }

    const RITUAL_TYPE_MAP: Record<string, PortableRitualType> = {
      daily_prayer: 'worship',
      weekly_ceremony: 'communion',
      seasonal_festival: 'festival',
      initiation: 'initiation',
      blessing: 'purification',
      sacrifice: 'sacrifice',
      pilgrimage: 'pilgrimage',
    };

    const RITUAL_FREQ_MAP: Record<string, RitualFrequency> = {
      daily_prayer: 'daily',
      weekly_ceremony: 'weekly',
      seasonal_festival: 'seasonal',
      initiation: 'lifecycle',
      blessing: 'crisis',
      sacrifice: 'weekly',
      pilgrimage: 'annual',
    };

    unsubscribers.push(
      eventBus.on('lore:myth_created' as any, (event: any) => {
        const d = event.data ?? event;
        const portableMyth: PortableMyth = {
          mythId: d.mythId,
          sourceGame: 'mvee',
          version: 1,
          title: d.title,
          summary: d.summary ?? '',
          fullText: d.fullText ?? '',
          category: tryMapMythCategory(d.category),
          deityDomains: d.deityDomains ?? [],
          deityPersonality: d.deityPersonality ? tryMapPersonality(d.deityPersonality) : undefined,
          linguisticMarkers: [],
          motifs: [],
          symbols: [],
          temporalSetting: 'timeless',
          mutations: [],
          canonicityScore: d.canonicityScore ?? 0,
          status: d.status ? mapMythStatus(d.status) : 'oral',
          exportedAt: new Date().toISOString(),
          tellingCount: d.tellingCount ?? 1,
          believerCount: d.believerCount ?? 0,
        };
        if (typeof emitter!.emitPortableLore === 'function') {
          emitter!.emitPortableLore('myth', portableMyth);
        }
      })
    );

    unsubscribers.push(
      eventBus.on('lore:deity_emerged' as any, (event: any) => {
        const d = event.data ?? event;
        const mappedPersonality = tryMapPersonality(d.deityPersonality ?? d.personality);
        const portableDeity: PortableDeity = {
          deityId: d.deityId,
          sourceGame: 'mvee',
          primaryName: d.deityName ?? d.deityId,
          epithets: Array.isArray(d.epithets) ? d.epithets : [],
          domain: d.domain ?? 'mystery',
          secondaryDomains: Array.isArray(d.secondaryDomains) ? d.secondaryDomains : [],
          personality: mappedPersonality ?? defaultPortablePersonality(),
          alignment: d.alignment ?? 'unknown',
          believerCount: d.believerCount ?? 0,
          mythCount: d.mythCount ?? 0,
          canonicalMythIds: [],
          exportedAt: new Date().toISOString(),
        };
        if (typeof emitter!.emitPortableLore === 'function') {
          emitter!.emitPortableLore('deity', portableDeity);
        }
      })
    );

    unsubscribers.push(
      eventBus.on('lore:ritual_performed' as any, (event: any) => {
        const d = event.data ?? event;
        const portableRitual: PortableRitual = {
          ritualId: d.ritualId,
          sourceGame: 'mvee',
          version: 1,
          name: d.name,
          ritualType: RITUAL_TYPE_MAP[d.type as string] ?? 'worship',
          associatedDeityId: d.deityId ?? null,
          description: `A ${(d.type as string).replace(/_/g, ' ')} for the faithful`,
          frequency: RITUAL_FREQ_MAP[d.type as string] ?? 'weekly',
          participantRequirements: { minimumParticipants: d.requiredParticipants },
          beliefGenerated: d.beliefGenerated,
          status: 'active',
          exportedAt: new Date().toISOString(),
        };
        if (typeof emitter!.emitPortableLore === 'function') {
          emitter!.emitPortableLore('ritual', portableRitual);
        }
      })
    );

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
