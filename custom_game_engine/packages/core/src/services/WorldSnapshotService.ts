/**
 * WorldSnapshotService
 *
 * Captures the current simulation state as a structured, shareable snapshot.
 * Foundation for Universe Postcards (MUL-1292) — Drive 5 (Social Influence).
 *
 * Usage:
 *   const service = new WorldSnapshotService();
 *   service.initialize(world, eventBus);   // once, at game startup
 *   const postcard = service.captureSnapshot(world);
 */

import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { CanonEventRecorder } from '../metrics/CanonEventRecorder.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { TIME_CONSTANTS } from '../utils/ageUtils.js';
import { getMagicSystemState } from '../magic/index.js';

/** Max recent legends to retain for snapshots. */
const MAX_RECENT_LEGENDS = 5;
/** Max notable moments to include on a postcard. */
const MAX_NOTABLE_MOMENTS = 3;
/** Max length for a single notable moment string. */
const MAX_MOMENT_LENGTH = 80;
const MAX_TITLE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Strip HTML tags and enforce a character length limit.
 * Used to sanitize player-provided text for postcard annotations.
 */
export function sanitizeText(input: string, maxLength: number): string {
  const stripped = input.replace(/<[^>]*>/g, '').trim();
  return stripped.slice(0, maxLength);
}

/**
 * A shareable snapshot of the simulation at a particular moment.
 * Designed to be small (<2KB) for eventual social sharing (Universe Postcards).
 *
 * NOTE: Named `UniversePostcard` to avoid collision with the persistence
 * package's `WorldSnapshot` (terrain/zone save format).
 */
export interface UniversePostcard {
  /** ISO 8601 wall-clock timestamp when snapshot was captured. */
  capturedAt: string;
  /** Simulation tick at time of capture. */
  simulationTick: number;
  /** Total living agent count. */
  agentCount: number;
  /** Top 3 notable agents (oldest survivors). */
  notableAgents: Array<{
    name: string;
    species: string;
    age: number;
    legendStatus?: string;
  }>;
  /** Recent civilizational legend texts (up to 5, oldest first). */
  recentLegends: string[];
  /** Most common terrain type among entity positions. Falls back to 'unknown'. */
  dominantBiome: string;
  /** Names of currently active magic paradigms. */
  activeMagicParadigms: string[];
  /** Living agent count broken down by species. */
  populationBySpecies: Record<string, number>;
  /** Approximate world age in simulation years. */
  worldAge: number;
  /** Optional era title derived from world age milestones. */
  epochTitle?: string;
  /** Up to 3 human-readable summaries of notable canon events. Auto-populated. */
  notableMoments?: string[];
  /** Player-chosen universe title (max 50 chars). Set during share flow. */
  playerTitle?: string;
  /** Player-written description (max 200 chars). Set during share flow. */
  playerDescription?: string;
}

/**
 * WorldSnapshotService collects simulation state and produces UniversePostcard
 * snapshots suitable for display and eventual social sharing.
 *
 * Call `initialize()` once at game startup to begin tracking civilizational
 * legends. Then call `captureSnapshot()` at any time to get a fresh snapshot.
 */
export class WorldSnapshotService {
  private readonly recentLegends: string[] = [];
  private initialized = false;
  private canonEventRecorder: CanonEventRecorder | null = null;

  /**
   * Subscribe to `civilizational_legend:born` events so snapshots always
   * include the most recent legends. Call once at game startup.
   */
  initialize(world: World, eventBus: EventBus): void {
    if (this.initialized) return;
    this.initialized = true;

    // Suppress unused-variable warning — world param is part of the expected API
    void world;

    eventBus.subscribe('civilizational_legend:born', (event) => {
      const legendText = event.data?.legendText as string | undefined;
      if (!legendText) return;

      this.recentLegends.push(legendText);
      if (this.recentLegends.length > MAX_RECENT_LEGENDS) {
        this.recentLegends.shift();
      }
    });
  }

  /**
   * Inject a CanonEventRecorder to auto-populate notableMoments on postcards.
   * Call once at game startup (optional — postcards work without it).
   */
  setCanonEventRecorder(recorder: CanonEventRecorder): void {
    this.canonEventRecorder = recorder;
  }

  /**
   * Capture the current simulation state as an UniversePostcard.
   * Safe to call at any tick — reads world state non-destructively.
   */
  captureSnapshot(world: World): UniversePostcard {
    const livingAgents = this.collectLivingAgents(world);

    return {
      capturedAt: new Date().toISOString(),
      simulationTick: world.tick,
      agentCount: livingAgents.length,
      notableAgents: this.buildNotableAgents(livingAgents, world.tick),
      recentLegends: [...this.recentLegends],
      dominantBiome: this.detectDominantBiome(livingAgents, world),
      activeMagicParadigms: this.getActiveParadigmNames(),
      populationBySpecies: this.countBySpecies(livingAgents),
      worldAge: world.tick / TIME_CONSTANTS.TICKS_PER_YEAR,
      epochTitle: this.deriveEpochTitle(world.tick),
      notableMoments: this.buildNotableMoments(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Return all entities that are living agents (health > 0). */
  private collectLivingAgents(world: World): EntityImpl[] {
    const result: EntityImpl[] = [];

    const entities = world.query().with(CT.Agent).with(CT.Needs).executeEntities();
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);
      if (needs && needs.health > 0) {
        result.push(impl);
      }
    }

    return result;
  }

  /**
   * Build top-3 notable agents sorted by age (oldest = lowest birthTick first).
   * Falls back to identity.age if birthTick is unavailable.
   */
  private buildNotableAgents(
    agents: EntityImpl[],
    currentTick: number
  ): UniversePostcard['notableAgents'] {
    interface AgentRecord {
      entity: EntityImpl;
      sortKey: number; // lower = older
    }

    const records: AgentRecord[] = [];

    for (const entity of agents) {
      const agent = entity.getComponent<AgentComponent>(CT.Agent);
      const identity = entity.getComponent<IdentityComponent>(CT.Identity);
      if (!identity) continue;

      const birthTick = agent?.birthTick;
      const sortKey = birthTick !== undefined ? birthTick : currentTick - identity.age;
      records.push({ entity, sortKey });
    }

    records.sort((a, b) => a.sortKey - b.sortKey);
    const top3 = records.slice(0, 3);

    return top3.map(({ entity, sortKey }) => {
      const identity = entity.getComponent<IdentityComponent>(CT.Identity)!;
      const ageInTicks = currentTick - sortKey;
      const ageInYears = ageInTicks / TIME_CONSTANTS.TICKS_PER_YEAR;

      return {
        name: identity.name,
        species: identity.species,
        age: Math.max(identity.age, ageInYears),
      };
    });
  }

  /**
   * Determine the dominant biome by sampling agent positions and checking
   * the terrain type at each location. Falls back to 'unknown' if no data.
   */
  private detectDominantBiome(agents: EntityImpl[], world: World): string {
    const biomeCounts: Record<string, number> = {};

    for (const entity of agents) {
      const pos = entity.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      const tile = world.getTileAt?.(Math.round(pos.x), Math.round(pos.y));
      const terrain = tile?.terrain;
      if (!terrain) continue;

      biomeCounts[terrain] = (biomeCounts[terrain] ?? 0) + 1;
    }

    let dominant = 'unknown';
    let maxCount = 0;
    for (const [biome, count] of Object.entries(biomeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = biome;
      }
    }

    return dominant;
  }

  /** Return names of all currently active magic paradigms. */
  private getActiveParadigmNames(): string[] {
    try {
      const state = getMagicSystemState();
      return state.getActiveParadigms().map(p => p.name);
    } catch {
      // MagicSystemState not yet initialised in headless/test environments
      return [];
    }
  }

  /** Count living agents per species. */
  private countBySpecies(agents: EntityImpl[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entity of agents) {
      const identity = entity.getComponent<IdentityComponent>(CT.Identity);
      if (!identity) continue;

      counts[identity.species] = (counts[identity.species] ?? 0) + 1;
    }

    return counts;
  }

  /**
   * Build up to 3 notable moments from recorded canon events.
   * Picks the most recent significant events, returning human-readable summaries.
   */
  private buildNotableMoments(): string[] {
    if (!this.canonEventRecorder) return [];

    const events = this.canonEventRecorder.getEvents();
    if (events.length === 0) return [];

    // Prioritise significant event types, then fall back to recency
    const significantTypes = new Set([
      'culture:emerged', 'crisis:occurred', 'lineage:founded',
      'soul:created', 'union:formed',
    ]);

    const sorted = [...events].sort((a, b) => {
      const aSignificant = significantTypes.has(a.type) ? 1 : 0;
      const bSignificant = significantTypes.has(b.type) ? 1 : 0;
      if (aSignificant !== bSignificant) return bSignificant - aSignificant;
      return b.tick - a.tick;
    });

    return sorted
      .slice(0, MAX_NOTABLE_MOMENTS)
      .map(e => sanitizeText(e.description, MAX_MOMENT_LENGTH));
  }

  /**
   * Derive an optional epoch title from simulation tick milestones.
   * Returns undefined before the world has aged enough to name an era.
   */
  private deriveEpochTitle(tick: number): string | undefined {
    const years = tick / TIME_CONSTANTS.TICKS_PER_YEAR;

    if (years < 1) return undefined;
    if (years < 5) return 'The Age of Beginnings';
    if (years < 20) return 'The Age of Settlement';
    if (years < 50) return 'The Age of Growth';
    if (years < 100) return 'The Age of Legacy';
    return 'The Age of Memory';
  }
}

// ---------------------------------------------------------------------------
// Postcard Sharing Types
// ---------------------------------------------------------------------------

/** Player-provided annotations when sharing a postcard. */
export interface PostcardAnnotations {
  /** Sharer's display name. */
  playerName: string;
  /** Player-chosen universe title (max 50 chars). */
  title: string;
  /** Short description (max 200 chars). */
  description: string;
  /** Optional player-edited notable moments (up to 3, max 80 chars each). */
  notableMoments?: string[];
}

/** A postcard with player annotations, ready for sharing. */
export interface SharedPostcard extends UniversePostcard {
  /** Sharer's display name. */
  playerName: string;
  /** Player-chosen universe title (max 50 chars). */
  title: string;
  /** Short description (max 200 chars). */
  description: string;
  /** ISO 8601 timestamp when shared. */
  sharedAt: string;
  /** Player-edited or auto-populated notable moments (up to 3). */
  notableMoments: string[];
}

/** A postcard enriched with player info and share code, stored in the local gallery. */
export interface GalleryPostcard extends UniversePostcard {
  /** Player-chosen title for their universe (max 50 chars). */
  playerTitle: string;
  /** Player-written description (max 200 chars). */
  playerDescription: string;
  /** Display name or ID of the player who created this postcard. */
  createdBy: string;
  /** ISO 8601 timestamp when the postcard was created. */
  createdAt: string;
  /** 6-character alphanumeric share code for exchanging postcards. */
  shareCode: string;
}

const SHARED_POSTCARDS_STORAGE_KEY = 'mvee_shared_postcards';

/**
 * Handles uploading/downloading universe postcards for the shared gallery.
 * Falls back to localStorage when the multiverse server is unavailable.
 */
export class PostcardSharingService {
  private serverBaseUrl: string;
  private serverAvailable: boolean | null = null;

  constructor(serverBaseUrl?: string) {
    this.serverBaseUrl = serverBaseUrl ??
      ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
        ? `${import.meta.env.VITE_API_URL}/api`
        : 'http://localhost:3001/api');
  }

  /**
   * Share a postcard with annotations. Uploads to server if available,
   * otherwise stores in localStorage.
   *
   * @returns The shared postcard with timestamp and validated annotations.
   */
  async sharePostcard(
    postcard: UniversePostcard,
    annotations: PostcardAnnotations
  ): Promise<SharedPostcard> {
    const title = sanitizeText(annotations.title, MAX_TITLE_LENGTH);
    const description = sanitizeText(annotations.description, MAX_DESCRIPTION_LENGTH);

    if (!sanitizeText(annotations.playerName, MAX_TITLE_LENGTH)) {
      throw new Error('playerName is required');
    }
    if (!title) {
      throw new Error('title is required');
    }

    // Use player-provided moments if given, otherwise fall back to auto-populated
    const moments = (annotations.notableMoments ?? postcard.notableMoments ?? [])
      .slice(0, MAX_NOTABLE_MOMENTS)
      .map(m => sanitizeText(m, MAX_MOMENT_LENGTH));

    const shared: SharedPostcard = {
      ...postcard,
      playerName: sanitizeText(annotations.playerName, MAX_TITLE_LENGTH),
      title,
      description,
      notableMoments: moments,
      playerTitle: title,
      playerDescription: description,
      sharedAt: new Date().toISOString(),
    };

    const serverUp = await this.isServerAvailable();
    if (serverUp) {
      await this.uploadToServer(shared);
    } else {
      this.storeLocally(shared);
    }

    return shared;
  }

  /**
   * List all shared postcards. Fetches from server if available,
   * otherwise reads from localStorage.
   */
  async listSharedPostcards(): Promise<SharedPostcard[]> {
    const serverUp = await this.isServerAvailable();
    if (serverUp) {
      return this.fetchFromServer();
    }
    return this.loadFromLocalStorage();
  }

  // ---------------------------------------------------------------------------
  // Server operations
  // ---------------------------------------------------------------------------

  private async isServerAvailable(): Promise<boolean> {
    if (this.serverAvailable !== null) return this.serverAvailable;
    try {
      const response = await fetch(`${this.serverBaseUrl}/postcards`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      });
      this.serverAvailable = response.ok;
    } catch {
      this.serverAvailable = false;
    }
    return this.serverAvailable;
  }

  /** Reset cached server availability (e.g. for retry after network change). */
  resetServerCache(): void {
    this.serverAvailable = null;
  }

  private async uploadToServer(postcard: SharedPostcard): Promise<void> {
    const response = await fetch(`${this.serverBaseUrl}/postcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postcard),
    });
    if (!response.ok) {
      throw new Error(`Failed to upload postcard: ${response.status}`);
    }
  }

  private async fetchFromServer(): Promise<SharedPostcard[]> {
    const response = await fetch(`${this.serverBaseUrl}/postcards`);
    if (!response.ok) {
      throw new Error(`Failed to fetch postcards: ${response.status}`);
    }
    const data = await response.json();
    return data.postcards ?? data;
  }

  // ---------------------------------------------------------------------------
  // localStorage fallback
  // ---------------------------------------------------------------------------

  private storeLocally(postcard: SharedPostcard): void {
    const existing = this.loadFromLocalStorage();
    existing.push(postcard);
    try {
      localStorage.setItem(SHARED_POSTCARDS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      throw new Error('Failed to store postcard in localStorage (quota exceeded?)');
    }
  }

  private loadFromLocalStorage(): SharedPostcard[] {
    try {
      const raw = localStorage.getItem(SHARED_POSTCARDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
