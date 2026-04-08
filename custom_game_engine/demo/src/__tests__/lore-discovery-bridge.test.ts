/**
 * Integration tests for lore-discovery-bridge
 *
 * Verifies that:
 * - initLoreDiscoveryBridge subscribes to lore events
 * - lore:myth_created, lore:deity_emerged, lore:ritual_performed trigger emitPortableLore
 * - Constructed portable objects match expected shapes
 * - destroyLoreDiscoveryBridge cleans up subscriptions and calls destroy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock EventBus
// ---------------------------------------------------------------------------

type Handler = (event: unknown) => void;

function createMockEventBus() {
  const handlers: Map<string, Handler[]> = new Map();

  const on = vi.fn((event: string, handler: Handler) => {
    if (!handlers.has(event)) handlers.set(event, []);
    handlers.get(event)!.push(handler);
    return () => {
      const list = handlers.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  });

  function emit(event: string, data: unknown) {
    const list = handlers.get(event);
    if (list) {
      for (const h of list) h({ data });
    }
  }

  function subscriberCount(event: string): number {
    return handlers.get(event)?.length ?? 0;
  }

  return { on, emit, subscriberCount };
}

// ---------------------------------------------------------------------------
// Mock @akashic-records dynamic import
// ---------------------------------------------------------------------------

const mockDiscover = vi.fn();
const mockEmitPortableLore = vi.fn();
const mockDestroy = vi.fn();

// The bridge uses `import(/* @vite-ignore */ emitterPath)` so we need to
// intercept at the module resolution level. We use vi.stubGlobal to replace
// the import function or provide the mock via dynamic module resolution.
// Since the bridge catches import failures, we mock at the global import level.

// Actually, we need to intercept dynamic imports. Use vi.mock with the path.
vi.mock('@akashic-records/lib/lore-discovery-emitter.js', () => {
  class MockLoreDiscoveryEmitter {
    discover = mockDiscover;
    emitPortableLore = mockEmitPortableLore;
    destroy = mockDestroy;
  }
  return { LoreDiscoveryEmitter: MockLoreDiscoveryEmitter };
});

// ---------------------------------------------------------------------------
// Import bridge after mocks are set up
// ---------------------------------------------------------------------------

import { initLoreDiscoveryBridge, destroyLoreDiscoveryBridge } from '../lore-discovery-bridge.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('lore-discovery-bridge', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEventBus = createMockEventBus();
    await initLoreDiscoveryBridge(mockEventBus as any);
  });

  afterEach(() => {
    destroyLoreDiscoveryBridge();
  });

  it('subscribes to lore:myth_created during init', () => {
    expect(mockEventBus.subscriberCount('lore:myth_created')).toBeGreaterThan(0);
  });

  it('subscribes to lore:deity_emerged during init', () => {
    expect(mockEventBus.subscriberCount('lore:deity_emerged')).toBeGreaterThan(0);
  });

  it('subscribes to lore:ritual_performed during init', () => {
    expect(mockEventBus.subscriberCount('lore:ritual_performed')).toBeGreaterThan(0);
  });

  it('throws if initialized twice without destroy', async () => {
    await expect(initLoreDiscoveryBridge(mockEventBus as any)).rejects.toThrow(
      'Already initialized'
    );
  });

  // -------------------------------------------------------------------------
  // lore:myth_created
  // -------------------------------------------------------------------------

  describe('lore:myth_created', () => {
    it('calls emitPortableLore with a PortableMyth', () => {
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-001',
        sourceGame: 'mvee',
        title: 'The First Fire',
        summary: 'How fire came to be',
        fullText: 'In the beginning there was darkness...',
        category: 'creation',
        deityDomains: ['fire', 'light'],
        deityPersonality: { benevolence: 0.8, interventionism: 0.6, wrathfulness: 0.2, mysteriousness: 0.4, generosity: 0.7, consistency: 0.9 },
        deityName: 'Ignis',
        believerCount: 50,
        tellingCount: 12,
        status: 'canonical',
        canonicityScore: 0.9,
        timestamp: 1000,
      });

      expect(mockEmitPortableLore).toHaveBeenCalledOnce();
      const [type, myth] = mockEmitPortableLore.mock.calls[0];
      expect(type).toBe('myth');
      expect(myth.mythId).toBe('myth-001');
      expect(myth.sourceGame).toBe('mvee');
      expect(myth.title).toBe('The First Fire');
      expect(myth.category).toBe('creation');
      expect(myth.status).toBe('canonical');
      expect(myth.believerCount).toBe(50);
      expect(myth.tellingCount).toBe(12);
      expect(myth.canonicityScore).toBe(0.9);
      expect(myth.version).toBe(1);
      expect(myth.temporalSetting).toBe('timeless');
      expect(Array.isArray(myth.mutations)).toBe(true);
      expect(typeof myth.exportedAt).toBe('string');
    });

    it('maps deityPersonality via mapPersonality (-1 to 1 -> 0 to 1)', () => {
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-002',
        title: 'The Great Flood',
        category: 'flood',
        deityPersonality: { benevolence: 1.0, interventionism: -1.0, wrathfulness: 0.5, mysteriousness: 0.5, generosity: 0.5, consistency: 0.5 },
        status: 'oral',
      });

      const [, myth] = mockEmitPortableLore.mock.calls[0];
      // (1.0 + 1) / 2 = 1.0
      expect(myth.deityPersonality.benevolence).toBeCloseTo(1.0);
      // (-1.0 + 1) / 2 = 0.0
      expect(myth.deityPersonality.interventionism).toBeCloseTo(0.0);
    });

    it('falls back to "origin" for unmapped myth category', () => {
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-003',
        title: 'A Strange Tale',
        category: 'cosmic_event',
        status: 'oral',
      });

      const [, myth] = mockEmitPortableLore.mock.calls[0];
      expect(myth.category).toBe('origin');
    });

    it('defaults status to "oral" when status is missing', () => {
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-004',
        title: 'Untitled',
        category: 'origin',
      });

      const [, myth] = mockEmitPortableLore.mock.calls[0];
      expect(myth.status).toBe('oral');
    });

    it('omits deityPersonality when none provided', () => {
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-005',
        title: 'Ancestral Song',
        category: 'origin',
        status: 'oral',
      });

      const [, myth] = mockEmitPortableLore.mock.calls[0];
      expect(myth.deityPersonality).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // lore:deity_emerged
  // -------------------------------------------------------------------------

  describe('lore:deity_emerged', () => {
    it('calls emitPortableLore with a PortableDeity', () => {
      mockEventBus.emit('lore:deity_emerged', {
        sourceGame: 'mvee',
        deityId: 'deity-001',
        deityName: 'Aethon',
        domain: 'sun',
        deityPersonality: {
          benevolence: -0.6,
          interventionism: 0.2,
          wrathfulness: 0.8,
          mysteriousness: 0.4,
          generosity: 0.9,
          consistency: 0.3,
        },
        believerCount: 120,
        timestamp: 500,
      });

      expect(mockEmitPortableLore).toHaveBeenCalledOnce();
      const [type, deity] = mockEmitPortableLore.mock.calls[0];
      expect(type).toBe('deity');
      expect(deity.deityId).toBe('deity-001');
      expect(deity.sourceGame).toBe('mvee');
      expect(deity.primaryName).toBe('Aethon');
      expect(deity.domain).toBe('sun');
      expect(deity.believerCount).toBe(120);
      expect(deity.personality.benevolence).toBeCloseTo(0.2);
      expect(deity.personality.interventionism).toBeCloseTo(0.6);
      expect(deity.personality.wrathfulness).toBeCloseTo(0.8);
      expect(deity.alignment).toBe('unknown');
      expect(deity.mythCount).toBe(0);
      expect(Array.isArray(deity.canonicalMythIds)).toBe(true);
      expect(Array.isArray(deity.epithets)).toBe(true);
      expect(typeof deity.exportedAt).toBe('string');
    });

    it('uses deityId as primaryName when deityName is absent', () => {
      mockEventBus.emit('lore:deity_emerged', {
        deityId: 'deity-002',
        domain: 'mystery',
        believerCount: 5,
        timestamp: 200,
      });

      const [, deity] = mockEmitPortableLore.mock.calls[0];
      expect(deity.primaryName).toBe('deity-002');
    });

    it('defaults domain to "mystery" when absent', () => {
      mockEventBus.emit('lore:deity_emerged', {
        deityId: 'deity-003',
        deityName: 'Unknown',
        believerCount: 0,
        timestamp: 0,
      });

      const [, deity] = mockEmitPortableLore.mock.calls[0];
      expect(deity.domain).toBe('mystery');
    });

    it('falls back to a neutral personality vector when deity personality is absent', () => {
      mockEventBus.emit('lore:deity_emerged', {
        deityId: 'deity-004',
        deityName: 'Equilibrius',
        domain: 'balance',
        believerCount: 30,
        timestamp: 300,
      });

      const [, deity] = mockEmitPortableLore.mock.calls[0];
      expect(deity.personality.benevolence).toBe(0.5);
      expect(deity.personality.interventionism).toBe(0.5);
    });
  });

  // -------------------------------------------------------------------------
  // lore:ritual_performed
  // -------------------------------------------------------------------------

  describe('lore:ritual_performed', () => {
    it('calls emitPortableLore with a PortableRitual', () => {
      mockEventBus.emit('lore:ritual_performed', {
        sourceGame: 'mvee',
        ritualId: 'ritual-001',
        name: 'Morning Prayer',
        deityId: 'deity-001',
        type: 'daily_prayer',
        beliefGenerated: 15,
        requiredParticipants: 1,
        duration: 600,
        timestamp: 1000,
      });

      expect(mockEmitPortableLore).toHaveBeenCalledOnce();
      const [type, ritual] = mockEmitPortableLore.mock.calls[0];
      expect(type).toBe('ritual');
      expect(ritual.ritualId).toBe('ritual-001');
      expect(ritual.sourceGame).toBe('mvee');
      expect(ritual.name).toBe('Morning Prayer');
      expect(ritual.ritualType).toBe('worship');
      expect(ritual.frequency).toBe('daily');
      expect(ritual.associatedDeityId).toBe('deity-001');
      expect(ritual.beliefGenerated).toBe(15);
      expect(ritual.status).toBe('active');
      expect(ritual.version).toBe(1);
      expect(typeof ritual.exportedAt).toBe('string');
    });

    it('maps weekly_ceremony to communion frequency weekly', () => {
      mockEventBus.emit('lore:ritual_performed', {
        ritualId: 'ritual-002',
        name: 'Council of Faith',
        deityId: 'deity-001',
        type: 'weekly_ceremony',
        beliefGenerated: 40,
        requiredParticipants: 10,
        duration: 3600,
        timestamp: 2000,
      });

      const [, ritual] = mockEmitPortableLore.mock.calls[0];
      expect(ritual.ritualType).toBe('communion');
      expect(ritual.frequency).toBe('weekly');
    });

    it('defaults ritualType to "worship" for unknown type', () => {
      mockEventBus.emit('lore:ritual_performed', {
        ritualId: 'ritual-003',
        name: 'Strange Rite',
        type: 'unknown_rite',
        beliefGenerated: 5,
        requiredParticipants: 2,
        duration: 300,
        timestamp: 500,
      });

      const [, ritual] = mockEmitPortableLore.mock.calls[0];
      expect(ritual.ritualType).toBe('worship');
      expect(ritual.frequency).toBe('weekly');
    });

    it('sets associatedDeityId to null when deityId is absent', () => {
      mockEventBus.emit('lore:ritual_performed', {
        ritualId: 'ritual-004',
        name: 'Secular Gathering',
        type: 'seasonal_festival',
        beliefGenerated: 0,
        requiredParticipants: 50,
        duration: 7200,
        timestamp: 800,
      });

      const [, ritual] = mockEmitPortableLore.mock.calls[0];
      expect(ritual.associatedDeityId).toBeNull();
    });

    it('constructs description from ritual type', () => {
      mockEventBus.emit('lore:ritual_performed', {
        ritualId: 'ritual-005',
        name: 'Journey of the Devout',
        type: 'pilgrimage',
        beliefGenerated: 80,
        requiredParticipants: 5,
        duration: 864000,
        timestamp: 9000,
      });

      const [, ritual] = mockEmitPortableLore.mock.calls[0];
      expect(ritual.description).toBe('A pilgrimage for the faithful');
    });
  });

  // -------------------------------------------------------------------------
  // destroyLoreDiscoveryBridge
  // -------------------------------------------------------------------------

  describe('destroyLoreDiscoveryBridge', () => {
    it('calls destroy on the emitter', () => {
      destroyLoreDiscoveryBridge();
      expect(mockDestroy).toHaveBeenCalledOnce();
    });

    it('stops forwarding events after destroy', () => {
      destroyLoreDiscoveryBridge();
      mockEventBus.emit('lore:myth_created', {
        mythId: 'myth-post-destroy',
        title: 'Should Not Forward',
        category: 'origin',
        status: 'oral',
      });
      expect(mockEmitPortableLore).not.toHaveBeenCalled();
    });

    it('allows re-initialization after destroy', async () => {
      destroyLoreDiscoveryBridge();
      const freshEventBus = createMockEventBus();
      await expect(initLoreDiscoveryBridge(freshEventBus as any)).resolves.toBeUndefined();
      destroyLoreDiscoveryBridge();
    });
  });
});
