/**
 * Unit tests for WorldSnapshotService
 *
 * Tests snapshot capture logic:
 * - Field completeness and types
 * - Agent counting and species population
 * - Notable agents (top 3 oldest)
 * - Legend tracking via civilizational_legend:born events
 * - Dominant biome detection from agent positions
 * - World age and epoch title derivation
 * - Magic paradigm listing (graceful empty when unavailable)
 * - Dead agents excluded from counts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMinimalWorld } from './fixtures/worldFixtures.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import {
  WorldSnapshotService,
  PostcardSharingService,
  sanitizeText,
  type UniversePostcard,
  type PostcardAnnotations,
  type SharedPostcard,
} from '../services/WorldSnapshotService.js';
import { createAgentComponent } from '../components/AgentComponent.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { IntegrationTestHarness } from './utils/IntegrationTestHarness.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createLivingAgent(
  world: World,
  name: string,
  options?: {
    species?: 'human' | 'elf' | 'dwarf' | 'animal' | 'deity';
    birthTick?: number;
    health?: number;
    posX?: number;
    posY?: number;
  }
): EntityImpl {
  const entity = new EntityImpl(createEntityId(), 0);

  const agent = createAgentComponent();
  if (options?.birthTick !== undefined) {
    agent.birthTick = options.birthTick;
  }
  entity.addComponent(agent);
  entity.addComponent(
    new NeedsComponent(
      options?.health !== undefined ? { health: options.health } : { health: 1.0 }
    )
  );
  entity.addComponent(createIdentityComponent(name, options?.species ?? 'human'));

  // Add a minimal position component when x/y are provided
  if (options?.posX !== undefined && options?.posY !== undefined) {
    entity.addComponent({
      type: CT.Position,
      x: options.posX,
      y: options.posY,
      z: 0,
    } as any);
  }

  world.addEntity(entity);
  return entity;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorldSnapshotService', () => {
  let harness: IntegrationTestHarness;
  let world: World;
  let eventBus: EventBus;
  let service: WorldSnapshotService;

  beforeEach(async () => {
    harness = createMinimalWorld();
    world = harness.world;
    eventBus = harness.eventBus;
    service = new WorldSnapshotService();
    service.initialize(world, eventBus);
  });

  // -------------------------------------------------------------------------
  // 1. Basic snapshot structure
  // -------------------------------------------------------------------------

  describe('snapshot structure', () => {
    it('returns all required fields', () => {
      const snapshot = service.captureSnapshot(world);

      expect(typeof snapshot.capturedAt).toBe('string');
      expect(typeof snapshot.simulationTick).toBe('number');
      expect(typeof snapshot.agentCount).toBe('number');
      expect(Array.isArray(snapshot.notableAgents)).toBe(true);
      expect(Array.isArray(snapshot.recentLegends)).toBe(true);
      expect(typeof snapshot.dominantBiome).toBe('string');
      expect(Array.isArray(snapshot.activeMagicParadigms)).toBe(true);
      expect(typeof snapshot.populationBySpecies).toBe('object');
      expect(typeof snapshot.worldAge).toBe('number');
    });

    it('capturedAt is a valid ISO 8601 string', () => {
      const snapshot = service.captureSnapshot(world);
      expect(new Date(snapshot.capturedAt).toISOString()).toBe(snapshot.capturedAt);
    });

    it('simulationTick matches world.tick', () => {
      world.setTick(42);
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.simulationTick).toBe(42);
    });

    it('worldAge is proportional to simulationTick', () => {
      world.setTick(0);
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.worldAge).toBe(0);
    });

    it('activeMagicParadigms is an array (empty when magic system not available)', () => {
      const snapshot = service.captureSnapshot(world);
      // In headless test environments, getMagicSystemState may throw — service returns []
      expect(Array.isArray(snapshot.activeMagicParadigms)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Agent counting and species population
  // -------------------------------------------------------------------------

  describe('agent counting', () => {
    it('counts only living agents (health > 0)', () => {
      createLivingAgent(world, 'Alice', { health: 1.0 });
      createLivingAgent(world, 'Bob', { health: 0.5 });
      createLivingAgent(world, 'Dead One', { health: 0 });

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.agentCount).toBe(2);
    });

    it('returns 0 when no agents exist', () => {
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.agentCount).toBe(0);
    });

    it('populationBySpecies counts living agents per species', () => {
      createLivingAgent(world, 'Elf1', { species: 'elf' });
      createLivingAgent(world, 'Elf2', { species: 'elf' });
      createLivingAgent(world, 'Human1', { species: 'human' });
      createLivingAgent(world, 'DeadElf', { species: 'elf', health: 0 });

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.populationBySpecies['elf']).toBe(2);
      expect(snapshot.populationBySpecies['human']).toBe(1);
      expect(snapshot.populationBySpecies['dwarf']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Notable agents
  // -------------------------------------------------------------------------

  describe('notable agents', () => {
    it('returns at most 3 notable agents', () => {
      for (let i = 0; i < 10; i++) {
        createLivingAgent(world, `Agent${i}`, { birthTick: i * 100 });
      }

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableAgents.length).toBeLessThanOrEqual(3);
    });

    it('notable agents are oldest (lowest birthTick) first', () => {
      world.setTick(1000);
      createLivingAgent(world, 'Young', { birthTick: 900 });
      createLivingAgent(world, 'Oldest', { birthTick: 10 });
      createLivingAgent(world, 'Middle', { birthTick: 500 });

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableAgents[0]?.name).toBe('Oldest');
    });

    it('notable agent records include name, species, and age', () => {
      world.setTick(1000);
      createLivingAgent(world, 'Gandalf', { species: 'elf', birthTick: 0 });

      const snapshot = service.captureSnapshot(world);
      const notable = snapshot.notableAgents[0];
      expect(notable).toBeDefined();
      expect(notable!.name).toBe('Gandalf');
      expect(notable!.species).toBe('elf');
      expect(typeof notable!.age).toBe('number');
    });

    it('returns empty array when no living agents', () => {
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableAgents).toHaveLength(0);
    });

    it('excludes dead agents from notable agents', () => {
      world.setTick(1000);
      createLivingAgent(world, 'Dead Ancient', { birthTick: 1, health: 0 });
      createLivingAgent(world, 'Young Survivor', { birthTick: 900, health: 1.0 });

      const snapshot = service.captureSnapshot(world);
      const names = snapshot.notableAgents.map(a => a.name);
      expect(names).not.toContain('Dead Ancient');
      expect(names).toContain('Young Survivor');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Legend tracking
  // -------------------------------------------------------------------------

  describe('legend tracking', () => {
    it('starts with empty legend list', () => {
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.recentLegends).toHaveLength(0);
    });

    it('captures legends emitted via civilizational_legend:born', () => {
      eventBus.emit({
        type: 'civilizational_legend:born',
        data: {
          triggerType: 'elder_death',
          agentName: 'Elder',
          legendText: 'The elder walked into the stars.',
          tick: 1,
        },
        tick: 1,
      });
      eventBus.flush();

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.recentLegends).toContain('The elder walked into the stars.');
    });

    it('keeps at most 5 recent legends (oldest dropped)', () => {
      for (let i = 0; i < 7; i++) {
        eventBus.emit({
          type: 'civilizational_legend:born',
          data: {
            triggerType: 'elder_death',
            agentName: `Elder${i}`,
            legendText: `Legend ${i}`,
            tick: i,
          },
          tick: i,
        });
        eventBus.flush();
      }

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.recentLegends).toHaveLength(5);
      // Oldest two legends (0 and 1) should have been dropped
      expect(snapshot.recentLegends).not.toContain('Legend 0');
      expect(snapshot.recentLegends).not.toContain('Legend 1');
      expect(snapshot.recentLegends).toContain('Legend 6');
    });

    it('ignores legend:born events with no legendText', () => {
      eventBus.emit({
        type: 'civilizational_legend:born',
        data: { triggerType: 'elder_death', agentName: 'Mystery' },
        tick: 1,
      });
      eventBus.flush();

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.recentLegends).toHaveLength(0);
    });

    it('recentLegends is a copy (mutations do not affect service state)', () => {
      eventBus.emit({
        type: 'civilizational_legend:born',
        data: { legendText: 'A tale was told.', tick: 1, triggerType: 'elder_death', agentName: 'X' },
        tick: 1,
      });
      eventBus.flush();

      const snapshot1 = service.captureSnapshot(world);
      snapshot1.recentLegends.push('INJECTED');

      const snapshot2 = service.captureSnapshot(world);
      expect(snapshot2.recentLegends).not.toContain('INJECTED');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Dominant biome
  // -------------------------------------------------------------------------

  describe('dominant biome', () => {
    it('returns "unknown" when no agents have position components', () => {
      createLivingAgent(world, 'Nomad'); // no posX/posY

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.dominantBiome).toBe('unknown');
    });

    it('derives dominant biome from agent positions when tile terrain is available', () => {
      // Mock world.getTileAt to return a specific terrain type
      const mockGetTileAt = vi.fn((x: number, y: number) => {
        if (x < 50) return { terrain: 'forest' };
        return { terrain: 'plains' };
      });
      (world as any).getTileAt = mockGetTileAt;

      // 3 forest agents, 1 plains agent
      createLivingAgent(world, 'Forester1', { posX: 10, posY: 10 });
      createLivingAgent(world, 'Forester2', { posX: 20, posY: 20 });
      createLivingAgent(world, 'Forester3', { posX: 30, posY: 30 });
      createLivingAgent(world, 'Plainsman', { posX: 60, posY: 60 });

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.dominantBiome).toBe('forest');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Epoch title
  // -------------------------------------------------------------------------

  describe('epoch title', () => {
    it('returns undefined at tick 0 (world too young)', () => {
      world.setTick(0);
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.epochTitle).toBeUndefined();
    });

    it('returns "The Age of Beginnings" for early ticks (< 5 sim years)', () => {
      // 1 sim year at 20 TPS * 86400 s/day * 180 days = 311040000 ticks
      const TICKS_PER_YEAR = 20 * 60 * 60 * 24 * 180;
      world.setTick(Math.floor(TICKS_PER_YEAR * 2)); // 2 years in
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.epochTitle).toBe('The Age of Beginnings');
    });

    it('returns "The Age of Memory" for very old worlds (100+ years)', () => {
      const TICKS_PER_YEAR = 20 * 60 * 60 * 24 * 180;
      world.setTick(TICKS_PER_YEAR * 150);
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.epochTitle).toBe('The Age of Memory');
    });
  });

  // -------------------------------------------------------------------------
  // 7. initialize() idempotence
  // -------------------------------------------------------------------------

  describe('initialize', () => {
    it('is safe to call initialize() multiple times (no double subscription)', () => {
      // Second call should be a no-op
      service.initialize(world, eventBus);
      service.initialize(world, eventBus);

      eventBus.emit({
        type: 'civilizational_legend:born',
        data: { legendText: 'Once told.', triggerType: 'elder_death', agentName: 'X', tick: 1 },
        tick: 1,
      });
      eventBus.flush();

      const snapshot = service.captureSnapshot(world);
      // Should be exactly 1 legend, not duplicated
      expect(snapshot.recentLegends.filter(l => l === 'Once told.')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Notable moments
  // -------------------------------------------------------------------------

  describe('notable moments', () => {
    it('returns empty array when no CanonEventRecorder is set', () => {
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableMoments).toEqual([]);
    });

    it('returns empty array when recorder has no events', () => {
      const mockRecorder = { getEvents: () => [] } as any;
      service.setCanonEventRecorder(mockRecorder);

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableMoments).toEqual([]);
    });

    it('returns up to 3 notable moments from canon events', () => {
      const mockRecorder = {
        getEvents: () => [
          { type: 'agent:born', tick: 100, description: 'A child was born in the valley.' },
          { type: 'culture:emerged', tick: 200, description: 'First sacred site discovered.' },
          { type: 'crisis:occurred', tick: 300, description: 'A rebellion erupted in the north.' },
          { type: 'agent:died', tick: 400, description: 'The elder passed away.' },
          { type: 'soul:created', tick: 500, description: 'A soul was ensouled.' },
        ],
      } as any;
      service.setCanonEventRecorder(mockRecorder);

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableMoments).toHaveLength(3);
    });

    it('prioritises significant event types over recency', () => {
      const mockRecorder = {
        getEvents: () => [
          { type: 'agent:born', tick: 900, description: 'Recent birth' },
          { type: 'culture:emerged', tick: 100, description: 'Old culture event' },
          { type: 'crisis:occurred', tick: 50, description: 'Old crisis' },
        ],
      } as any;
      service.setCanonEventRecorder(mockRecorder);

      const snapshot = service.captureSnapshot(world);
      // culture:emerged and crisis:occurred should come first despite lower ticks
      expect(snapshot.notableMoments![0]).toBe('Old culture event');
    });

    it('truncates long moment descriptions to 80 chars', () => {
      const longDesc = 'A'.repeat(120);
      const mockRecorder = {
        getEvents: () => [
          { type: 'culture:emerged', tick: 100, description: longDesc },
        ],
      } as any;
      service.setCanonEventRecorder(mockRecorder);

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableMoments![0]!.length).toBe(80);
    });

    it('strips HTML tags from moment descriptions', () => {
      const mockRecorder = {
        getEvents: () => [
          { type: 'culture:emerged', tick: 100, description: '<b>Sacred</b> site <em>discovered</em>' },
        ],
      } as any;
      service.setCanonEventRecorder(mockRecorder);

      const snapshot = service.captureSnapshot(world);
      expect(snapshot.notableMoments![0]).toBe('Sacred site discovered');
    });
  });

  // -------------------------------------------------------------------------
  // 9. Annotation fields on UniversePostcard
  // -------------------------------------------------------------------------

  describe('annotation fields', () => {
    it('postcard includes optional playerTitle and playerDescription (undefined by default)', () => {
      const snapshot = service.captureSnapshot(world);
      expect(snapshot.playerTitle).toBeUndefined();
      expect(snapshot.playerDescription).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeText
// ---------------------------------------------------------------------------

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<b>bold</b> text', 100)).toBe('bold text');
  });

  it('strips script tags (content preserved as text)', () => {
    expect(sanitizeText('hello<script>alert(1)</script>world', 100)).toBe('helloalert(1)world');
  });

  it('enforces max length', () => {
    expect(sanitizeText('abcdefghij', 5)).toBe('abcde');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ', 100)).toBe('hello');
  });

  it('handles empty string', () => {
    expect(sanitizeText('', 100)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// PostcardSharingService
// ---------------------------------------------------------------------------

function makePostcard(overrides?: Partial<UniversePostcard>): UniversePostcard {
  return {
    capturedAt: new Date().toISOString(),
    simulationTick: 100,
    agentCount: 5,
    notableAgents: [{ name: 'Alice', species: 'human', age: 3 }],
    recentLegends: ['A star fell.'],
    dominantBiome: 'forest',
    activeMagicParadigms: ['elemental'],
    populationBySpecies: { human: 3, elf: 2 },
    worldAge: 2.5,
    epochTitle: 'The Age of Beginnings',
    ...overrides,
  };
}

const defaultAnnotations: PostcardAnnotations = {
  playerName: 'TestPlayer',
  title: 'My Universe',
  description: 'A peaceful world.',
};

describe('PostcardSharingService', () => {
  let sharingService: PostcardSharingService;
  let storageMock: Record<string, string>;

  beforeEach(() => {
    // Server is unavailable so we exercise localStorage fallback
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no server')));

    // Mock localStorage
    storageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { storageMock[key] = value; }),
    });

    sharingService = new PostcardSharingService('http://fake:9999/api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // sharePostcard
  // -------------------------------------------------------------------------

  describe('sharePostcard', () => {
    it('returns a SharedPostcard with annotations and sharedAt timestamp', async () => {
      const postcard = makePostcard();
      const result = await sharingService.sharePostcard(postcard, defaultAnnotations);

      expect(result.playerName).toBe('TestPlayer');
      expect(result.title).toBe('My Universe');
      expect(result.description).toBe('A peaceful world.');
      expect(typeof result.sharedAt).toBe('string');
      expect(new Date(result.sharedAt).toISOString()).toBe(result.sharedAt);
      // Original postcard fields preserved
      expect(result.agentCount).toBe(5);
      expect(result.dominantBiome).toBe('forest');
      // notableMoments defaults to empty
      expect(result.notableMoments).toEqual([]);
    });

    it('includes player-provided notableMoments with sanitization', async () => {
      const result = await sharingService.sharePostcard(makePostcard(), {
        ...defaultAnnotations,
        notableMoments: ['<b>First</b> discovery', 'Second event', 'Third event'],
      });

      expect(result.notableMoments).toHaveLength(3);
      expect(result.notableMoments[0]).toBe('First discovery');
    });

    it('falls back to postcard notableMoments when annotations omit them', async () => {
      const postcard = makePostcard({ notableMoments: ['A star was born.'] });
      const result = await sharingService.sharePostcard(postcard, defaultAnnotations);
      expect(result.notableMoments).toEqual(['A star was born.']);
    });

    it('limits notableMoments to 3 entries', async () => {
      const result = await sharingService.sharePostcard(makePostcard(), {
        ...defaultAnnotations,
        notableMoments: ['One', 'Two', 'Three', 'Four', 'Five'],
      });
      expect(result.notableMoments).toHaveLength(3);
    });

    it('sanitizes HTML tags from title and description', async () => {
      const result = await sharingService.sharePostcard(makePostcard(), {
        playerName: 'P',
        title: '<b>My</b> World',
        description: '<em>Bold</em> desc',
      });
      expect(result.title).toBe('My World');
      expect(result.description).toBe('Bold desc');
    });

    it('truncates title to 50 chars and description to 200 chars', async () => {
      const longTitle = 'A'.repeat(100);
      const longDesc = 'B'.repeat(500);
      const result = await sharingService.sharePostcard(makePostcard(), {
        playerName: 'P',
        title: longTitle,
        description: longDesc,
      });

      expect(result.title.length).toBe(50);
      expect(result.description.length).toBe(200);
    });

    it('throws if playerName is empty', async () => {
      await expect(
        sharingService.sharePostcard(makePostcard(), {
          playerName: '',
          title: 'T',
          description: 'D',
        })
      ).rejects.toThrow('playerName is required');
    });

    it('throws if title is empty', async () => {
      await expect(
        sharingService.sharePostcard(makePostcard(), {
          playerName: 'P',
          title: '',
          description: 'D',
        })
      ).rejects.toThrow('title is required');
    });

    it('stores in localStorage when server is unavailable', async () => {
      await sharingService.sharePostcard(makePostcard(), defaultAnnotations);

      const stored = JSON.parse(storageMock['mvee_shared_postcards']!);
      expect(stored).toHaveLength(1);
      expect(stored[0].playerName).toBe('TestPlayer');
    });

    it('appends to existing localStorage entries', async () => {
      await sharingService.sharePostcard(makePostcard(), defaultAnnotations);
      sharingService.resetServerCache();
      await sharingService.sharePostcard(makePostcard(), {
        ...defaultAnnotations,
        playerName: 'Player2',
      });

      const stored = JSON.parse(storageMock['mvee_shared_postcards']!);
      expect(stored).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // listSharedPostcards
  // -------------------------------------------------------------------------

  describe('listSharedPostcards', () => {
    it('returns empty array when nothing shared', async () => {
      const result = await sharingService.listSharedPostcards();
      expect(result).toEqual([]);
    });

    it('returns postcards from localStorage', async () => {
      await sharingService.sharePostcard(makePostcard(), defaultAnnotations);
      sharingService.resetServerCache();

      const result = await sharingService.listSharedPostcards();
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('My Universe');
    });

    it('returns empty array when localStorage has invalid data', async () => {
      storageMock['mvee_shared_postcards'] = 'not json';
      const result = await sharingService.listSharedPostcards();
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Server path
  // -------------------------------------------------------------------------

  describe('server upload', () => {
    it('uploads to server when available', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // HEAD /postcards check
        .mockResolvedValueOnce({ ok: true }); // POST /postcards upload
      vi.stubGlobal('fetch', mockFetch);
      sharingService.resetServerCache();

      await sharingService.sharePostcard(makePostcard(), defaultAnnotations);

      // Second call should be the POST upload
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const uploadCall = mockFetch.mock.calls[1]!;
      expect(uploadCall[0]).toBe('http://fake:9999/api/postcards');
      expect(uploadCall[1]!.method).toBe('POST');

      const body = JSON.parse(uploadCall[1]!.body as string);
      expect(body.playerName).toBe('TestPlayer');
    });

    it('fetches from server when available', async () => {
      const serverPostcards: SharedPostcard[] = [{
        ...makePostcard(),
        playerName: 'RemotePlayer',
        title: 'Remote Universe',
        description: 'From server.',
        sharedAt: new Date().toISOString(),
      }];

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // HEAD check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ postcards: serverPostcards }),
        }); // GET /postcards
      vi.stubGlobal('fetch', mockFetch);
      sharingService.resetServerCache();

      const result = await sharingService.listSharedPostcards();
      expect(result).toHaveLength(1);
      expect(result[0]!.playerName).toBe('RemotePlayer');
    });
  });

  // -------------------------------------------------------------------------
  // Size constraint
  // -------------------------------------------------------------------------

  describe('postcard size', () => {
    it('shared postcard stays under 3KB', async () => {
      const postcard = makePostcard();
      const result = await sharingService.sharePostcard(postcard, defaultAnnotations);
      const size = new Blob([JSON.stringify(result)]).size;
      expect(size).toBeLessThan(3072);
    });
  });
});
