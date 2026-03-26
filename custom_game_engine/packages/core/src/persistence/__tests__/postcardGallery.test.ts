/**
 * Unit tests for SaveLoadService postcard gallery (localStorage MVP)
 *
 * Verifies save/load round-trip, share code generation, and gallery management.
 * MUL-3876: Phase 1 — Postcard persistence via localStorage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GalleryPostcard } from '../../services/WorldSnapshotService.js';

// Mock fetch globally (SaveLoadService module uses it)
vi.stubGlobal('fetch', vi.fn());

// Mock localStorage
const localStorageStore: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { for (const key of Object.keys(localStorageStore)) delete localStorageStore[key]; }),
});

function createMockGalleryPostcard(overrides?: Partial<GalleryPostcard>): GalleryPostcard {
  return {
    capturedAt: '2026-03-26T12:00:00.000Z',
    simulationTick: 10000,
    agentCount: 25,
    notableAgents: [
      { name: 'Elder Thane', species: 'norn', age: 6.1 },
      { name: 'Wise Crow', species: 'ettin', age: 4.8 },
    ],
    recentLegends: ['The great flood receded', 'First temple built'],
    dominantBiome: 'forest',
    activeMagicParadigms: ['elemental', 'runic'],
    populationBySpecies: { norn: 15, ettin: 10 },
    worldAge: 7.2,
    epochTitle: 'The Age of Settlement',
    playerTitle: 'My Forest Kingdom',
    playerDescription: 'A peaceful realm of norns and ettins',
    createdBy: 'player-42',
    createdAt: '2026-03-26T12:00:00.000Z',
    shareCode: 'AbC123',
    ...overrides,
  };
}

describe('SaveLoadService — Postcard Gallery', () => {
  let SaveLoadService: typeof import('../SaveLoadService.js').SaveLoadService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear localStorage mock store
    for (const key of Object.keys(localStorageStore)) delete localStorageStore[key];

    // Re-import to get fresh module
    const slModule = await import('../SaveLoadService.js');
    SaveLoadService = slModule.SaveLoadService;
  });

  describe('generateShareCode', () => {
    it('returns a 6-character alphanumeric string', () => {
      const service = new SaveLoadService();
      const code = service.generateShareCode();

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('generates unique codes', () => {
      const service = new SaveLoadService();
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateShareCode());
      }
      // With 62^6 possibilities, 100 codes should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe('savePostcardToGallery + loadGallery round-trip', () => {
    it('saves and loads a single postcard', () => {
      const service = new SaveLoadService();
      const postcard = createMockGalleryPostcard();

      service.savePostcardToGallery(postcard);
      const gallery = service.loadGallery();

      expect(gallery).toHaveLength(1);
      expect(gallery[0]).toEqual(postcard);
    });

    it('preserves all required fields through round-trip', () => {
      const service = new SaveLoadService();
      const postcard = createMockGalleryPostcard();

      service.savePostcardToGallery(postcard);
      const [loaded] = service.loadGallery();

      // UniversePostcard base fields
      expect(loaded.agentCount).toBe(25);
      expect(loaded.epochTitle).toBe('The Age of Settlement');
      expect(loaded.notableAgents).toHaveLength(2);
      expect(loaded.dominantBiome).toBe('forest');
      expect(loaded.activeMagicParadigms).toEqual(['elemental', 'runic']);

      // GalleryPostcard extra fields
      expect(loaded.playerTitle).toBe('My Forest Kingdom');
      expect(loaded.playerDescription).toBe('A peaceful realm of norns and ettins');
      expect(loaded.createdBy).toBe('player-42');
      expect(loaded.createdAt).toBe('2026-03-26T12:00:00.000Z');
      expect(loaded.shareCode).toBe('AbC123');
    });

    it('accumulates multiple postcards in gallery', () => {
      const service = new SaveLoadService();

      service.savePostcardToGallery(createMockGalleryPostcard({ shareCode: 'AAA111' }));
      service.savePostcardToGallery(createMockGalleryPostcard({ shareCode: 'BBB222' }));
      service.savePostcardToGallery(createMockGalleryPostcard({ shareCode: 'CCC333' }));

      const gallery = service.loadGallery();
      expect(gallery).toHaveLength(3);
      expect(gallery.map(p => p.shareCode)).toEqual(['AAA111', 'BBB222', 'CCC333']);
    });

    it('uses mvee-postcards-gallery localStorage key', () => {
      const service = new SaveLoadService();
      service.savePostcardToGallery(createMockGalleryPostcard());

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mvee-postcards-gallery',
        expect.any(String)
      );
      expect(localStorage.getItem).toHaveBeenCalledWith('mvee-postcards-gallery');
    });

    it('returns empty array when gallery is empty', () => {
      const service = new SaveLoadService();
      const gallery = service.loadGallery();
      expect(gallery).toEqual([]);
    });

    it('returns empty array when localStorage has invalid data', () => {
      localStorageStore['mvee-postcards-gallery'] = 'not-json!!!';
      const service = new SaveLoadService();
      const gallery = service.loadGallery();
      expect(gallery).toEqual([]);
    });

    it('returns empty array when localStorage has non-array JSON', () => {
      localStorageStore['mvee-postcards-gallery'] = '{"not": "an array"}';
      const service = new SaveLoadService();
      const gallery = service.loadGallery();
      expect(gallery).toEqual([]);
    });
  });

  describe('postcard size', () => {
    it('gallery postcard serializes under 2KB', () => {
      const postcard = createMockGalleryPostcard();
      const size = new TextEncoder().encode(JSON.stringify(postcard)).length;
      expect(size).toBeLessThan(2048);
    });
  });
});
