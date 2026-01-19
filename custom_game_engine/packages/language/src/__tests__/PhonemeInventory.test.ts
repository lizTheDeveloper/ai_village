/**
 * PhonemeInventory.test.ts
 *
 * Tests for the universal phoneme inventory
 */

import { describe, test, expect } from 'vitest';
import { UNIVERSAL_PHONEMES, PHONEME_STATS } from '../PhonemeInventory.js';

describe('PhonemeInventory', () => {
  describe('UNIVERSAL_PHONEMES', () => {
    test('has all consonants from spec', () => {
      const expectedConsonants = [
        // Stops
        'p', 't', 'k', 'b', 'd', 'g', 'q', "'",
        // Fricatives
        'f', 's', 'sh', 'v', 'z', 'th', 'kh', 'x', 'h',
        // Nasals
        'm', 'n', 'ng',
        // Liquids
        'l', 'r', 'rr',
        // Glides
        'w', 'y',
        // Affricates
        'ch', 'j'
      ];

      const actualConsonants = UNIVERSAL_PHONEMES.consonants.map(p => p.sound);

      for (const expected of expectedConsonants) {
        expect(actualConsonants).toContain(expected);
      }
    });

    test('has all vowels from spec', () => {
      const expectedVowels = ['i', 'u', 'ü', 'e', 'o', 'ö', 'a', 'ä'];
      const actualVowels = UNIVERSAL_PHONEMES.vowels.map(p => p.sound);

      for (const expected of expectedVowels) {
        expect(actualVowels).toContain(expected);
      }
    });

    test('has all clusters from spec', () => {
      const expectedClusters = ['tr', 'kr', 'fl', 'bl', 'gr', 'st', 'sk'];
      const actualClusters = UNIVERSAL_PHONEMES.clusters.map(p => p.sound);

      for (const expected of expectedClusters) {
        expect(actualClusters).toContain(expected);
      }
    });

    test('has all tones from spec', () => {
      const expectedTones = ["'", "`", "^"];
      const actualTones = UNIVERSAL_PHONEMES.tones.map(p => p.sound);

      for (const expected of expectedTones) {
        expect(actualTones).toContain(expected);
      }
    });

    test('has all syllable patterns', () => {
      const expectedPatterns = ['CV', 'CVC', 'CVCC', 'V', 'VC', 'CCV', 'CCVC'];

      for (const expected of expectedPatterns) {
        expect(UNIVERSAL_PHONEMES.syllablePatterns).toContain(expected);
      }
    });
  });

  describe('Phoneme metadata', () => {
    test('all phonemes have required fields', () => {
      const allPhonemes = [
        ...UNIVERSAL_PHONEMES.consonants,
        ...UNIVERSAL_PHONEMES.vowels,
        ...UNIVERSAL_PHONEMES.clusters,
        ...UNIVERSAL_PHONEMES.tones
      ];

      for (const phoneme of allPhonemes) {
        expect(phoneme.sound).toBeDefined();
        expect(phoneme.category).toBeDefined();
        expect(phoneme.qualities).toBeDefined();
        expect(phoneme.qualities.texture).toBeInstanceOf(Array);
        expect(phoneme.qualities.hardness).toBeInstanceOf(Array);
        expect(phoneme.qualities.position).toBeInstanceOf(Array);
        expect(phoneme.qualities.manner).toBeInstanceOf(Array);
      }
    });

    test('consonants have type field', () => {
      for (const consonant of UNIVERSAL_PHONEMES.consonants) {
        expect(consonant.type).toBeDefined();
      }
    });

    test('vowels have type field', () => {
      for (const vowel of UNIVERSAL_PHONEMES.vowels) {
        expect(vowel.type).toBeDefined();
      }
    });

    test('clusters have type field', () => {
      for (const cluster of UNIVERSAL_PHONEMES.clusters) {
        expect(cluster.type).toBeDefined();
      }
    });

    test('tones have type field', () => {
      for (const tone of UNIVERSAL_PHONEMES.tones) {
        expect(tone.type).toBeDefined();
      }
    });
  });

  describe('Phoneme qualities', () => {
    test('stops are percussive', () => {
      const stops = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'stop');

      for (const stop of stops) {
        expect(stop.qualities.texture).toContain('percussive');
      }
    });

    test('fricatives have sibilant, guttural, or breathy texture', () => {
      const fricatives = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'fricative');

      for (const fricative of fricatives) {
        const hasExpectedTexture =
          fricative.qualities.texture.includes('sibilant') ||
          fricative.qualities.texture.includes('guttural') ||
          fricative.qualities.texture.includes('breathy');
        expect(hasExpectedTexture).toBe(true);
      }
    });

    test('nasals are resonant', () => {
      const nasals = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'nasal');

      for (const nasal of nasals) {
        expect(nasal.qualities.manner).toContain('resonant');
      }
    });

    test('liquids have liquid texture', () => {
      const liquids = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'liquid');

      for (const liquid of liquids) {
        expect(liquid.qualities.texture).toContain('liquid');
      }
    });

    test('vowels have liquid texture', () => {
      for (const vowel of UNIVERSAL_PHONEMES.vowels) {
        expect(vowel.qualities.texture).toContain('liquid');
      }
    });
  });

  describe('PHONEME_STATS', () => {
    test('counts match actual phonemes', () => {
      expect(PHONEME_STATS.consonants).toBe(UNIVERSAL_PHONEMES.consonants.length);
      expect(PHONEME_STATS.vowels).toBe(UNIVERSAL_PHONEMES.vowels.length);
      expect(PHONEME_STATS.clusters).toBe(UNIVERSAL_PHONEMES.clusters.length);
      expect(PHONEME_STATS.tones).toBe(UNIVERSAL_PHONEMES.tones.length);
    });

    test('total is sum of all categories', () => {
      const expectedTotal =
        UNIVERSAL_PHONEMES.consonants.length +
        UNIVERSAL_PHONEMES.vowels.length +
        UNIVERSAL_PHONEMES.clusters.length +
        UNIVERSAL_PHONEMES.tones.length;

      expect(PHONEME_STATS.total).toBe(expectedTotal);
    });
  });

  describe('Phoneme counts', () => {
    test('has expected number of stops', () => {
      const stops = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'stop');
      expect(stops.length).toBe(8); // p, t, k, b, d, g, q, '
    });

    test('has expected number of fricatives', () => {
      const fricatives = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'fricative');
      expect(fricatives.length).toBe(9); // f, s, sh, v, z, th, kh, x, h
    });

    test('has expected number of nasals', () => {
      const nasals = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'nasal');
      expect(nasals.length).toBe(3); // m, n, ng
    });

    test('has expected number of liquids', () => {
      const liquids = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'liquid');
      expect(liquids.length).toBe(3); // l, r, rr
    });

    test('has expected number of glides', () => {
      const glides = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'glide');
      expect(glides.length).toBe(2); // w, y
    });

    test('has expected number of affricates', () => {
      const affricates = UNIVERSAL_PHONEMES.consonants.filter(c => c.type === 'affricate');
      expect(affricates.length).toBe(2); // ch, j
    });

    test('has 8 vowels total', () => {
      expect(UNIVERSAL_PHONEMES.vowels.length).toBe(8);
    });

    test('has 7 clusters total', () => {
      expect(UNIVERSAL_PHONEMES.clusters.length).toBe(7);
    });

    test('has 3 tones total', () => {
      expect(UNIVERSAL_PHONEMES.tones.length).toBe(3);
    });
  });

  describe('Typology information', () => {
    test('universal phonemes marked correctly', () => {
      const universalPhonemes = ['p', 't', 'k', 's', 'm', 'n', 'l', 'i', 'u', 'e', 'o', 'a'];

      for (const sound of universalPhonemes) {
        const phoneme =
          UNIVERSAL_PHONEMES.consonants.find(p => p.sound === sound) ||
          UNIVERSAL_PHONEMES.vowels.find(p => p.sound === sound);

        expect(phoneme?.typology?.frequency).toBe('universal');
      }
    });

    test('affricates have prerequisites', () => {
      const ch = UNIVERSAL_PHONEMES.consonants.find(c => c.sound === 'ch');
      const j = UNIVERSAL_PHONEMES.consonants.find(c => c.sound === 'j');

      expect(ch?.typology?.prerequisites).toBeDefined();
      expect(j?.typology?.prerequisites).toBeDefined();
    });

    test('clusters have prerequisites', () => {
      for (const cluster of UNIVERSAL_PHONEMES.clusters) {
        expect(cluster.typology?.prerequisites).toBeDefined();
      }
    });
  });
});
