import { describe, it, expect } from 'vitest';
import {
  parseResourceMentions,
  isResourceAnnouncement,
  getPrimaryResourceMention,
  generateResourceAnnouncement,
  getAnnouncementExamples,
  vectorToCardinal,
  cardinalToVector,
  distanceToTiles,
  type ResourceMention,
} from '../SpeechParser.js';

describe('SpeechParser', () => {
  describe('parseResourceMentions', () => {
    it('parses food mention with direction', () => {
      const mentions = parseResourceMentions('Found berries to the north!');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('food');
      expect(mentions[0].direction).toBe('north');
      expect(mentions[0].isPositive).toBe(true);
    });

    it('parses wood mention', () => {
      const mentions = parseResourceMentions('There are trees to the east');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('wood');
      expect(mentions[0].direction).toBe('east');
    });

    it('parses stone mention', () => {
      const mentions = parseResourceMentions('Found stone deposits far to the southwest');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('stone');
      expect(mentions[0].direction).toBe('southwest');
      expect(mentions[0].distance).toBe('far');
    });

    it('parses water mention', () => {
      const mentions = parseResourceMentions('There is a river nearby');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('water');
      expect(mentions[0].direction).toBe('nearby');
    });

    it('parses negative mentions', () => {
      const mentions = parseResourceMentions('No food around here');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('food');
      expect(mentions[0].isPositive).toBe(false);
    });

    it('parses depletion mentions', () => {
      const mentions = parseResourceMentions('The berries northeast are gone');

      expect(mentions.length).toBe(1);
      expect(mentions[0].resourceType).toBe('food');
      expect(mentions[0].direction).toBe('northeast');
      expect(mentions[0].isPositive).toBe(false);
    });

    it('parses close distance', () => {
      const mentions = parseResourceMentions('Found wood close to the west');

      expect(mentions[0].distance).toBe('close');
    });

    it('parses medium distance by default', () => {
      const mentions = parseResourceMentions('Found wood to the west');

      expect(mentions[0].distance).toBe('medium');
    });

    it('parses far distance', () => {
      const mentions = parseResourceMentions('There is wood far to the west');

      expect(mentions[0].distance).toBe('far');
    });

    it('sets close distance for nearby direction', () => {
      const mentions = parseResourceMentions('There is food right here');

      expect(mentions[0].direction).toBe('nearby');
      expect(mentions[0].distance).toBe('close');
    });

    it('parses multiple resource types', () => {
      const mentions = parseResourceMentions('Found berries and wood to the north');

      expect(mentions.length).toBe(2);
      const types = mentions.map((m) => m.resourceType);
      expect(types).toContain('food');
      expect(types).toContain('wood');
    });

    it('returns empty for non-resource speech', () => {
      const mentions = parseResourceMentions('Hello, nice weather today!');

      expect(mentions.length).toBe(0);
    });

    it('handles various food synonyms', () => {
      const foodWords = ['berries', 'fruit', 'apples', 'carrots', 'wheat', 'crops'];

      for (const word of foodWords) {
        const mentions = parseResourceMentions(`Found ${word} north`);
        expect(mentions.length).toBeGreaterThan(0);
        expect(mentions[0].resourceType).toBe('food');
      }
    });

    it('handles various wood synonyms', () => {
      const woodWords = ['wood', 'trees', 'logs', 'lumber', 'timber'];

      for (const word of woodWords) {
        const mentions = parseResourceMentions(`Found ${word} north`);
        expect(mentions.length).toBeGreaterThan(0);
        expect(mentions[0].resourceType).toBe('wood');
      }
    });

    it('handles various stone synonyms', () => {
      const stoneWords = ['stone', 'rocks', 'boulders'];

      for (const word of stoneWords) {
        const mentions = parseResourceMentions(`Found ${word} north`);
        expect(mentions.length).toBeGreaterThan(0);
        expect(mentions[0].resourceType).toBe('stone');
      }
    });
  });

  describe('confidence scoring', () => {
    it('gives higher confidence to mentions with clear sentiment', () => {
      const clearMention = parseResourceMentions('Found berries to the north!')[0];
      const vagueQuery = parseResourceMentions('berries')[0];

      expect(clearMention.confidence).toBeGreaterThan(vagueQuery.confidence);
    });

    it('gives higher confidence to mentions with direction', () => {
      const withDirection = parseResourceMentions('Found food to the north')[0];
      const withoutDirection = parseResourceMentions('Found food nearby')[0];

      expect(withDirection.confidence).toBeGreaterThan(withoutDirection.confidence);
    });

    it('gives higher confidence to mentions with explicit distance', () => {
      const withDistance = parseResourceMentions('Found food close to the north')[0];
      const withoutDistance = parseResourceMentions('Found food to the north')[0];

      expect(withDistance.confidence).toBeGreaterThan(withoutDistance.confidence);
    });
  });

  describe('isResourceAnnouncement', () => {
    it('returns true for clear announcements', () => {
      expect(isResourceAnnouncement('Found berries to the north!')).toBe(true);
      expect(isResourceAnnouncement("There's wood far to the east.")).toBe(true);
      // Need a positive indicator word like "found" for high confidence
      expect(isResourceAnnouncement('Found stone deposits nearby.')).toBe(true);
    });

    it('returns false for vague resource mentions', () => {
      // Mentions without clear positive indicators get low confidence
      // "Stone deposits nearby" lacks "found", "there's", etc.
      expect(isResourceAnnouncement('Stone deposits nearby.')).toBe(false);
    });

    it('returns false for non-resource speech', () => {
      expect(isResourceAnnouncement('Hello friend!')).toBe(false);
      expect(isResourceAnnouncement('Nice weather today.')).toBe(false);
    });

    it('returns false for vague mentions', () => {
      // Just mentioning a resource without context
      expect(isResourceAnnouncement('I like berries')).toBe(false);
    });
  });

  describe('getPrimaryResourceMention', () => {
    it('returns highest confidence mention', () => {
      const primary = getPrimaryResourceMention('Found berries and wood north');

      expect(primary).not.toBeNull();
      // Both should have similar confidence, but one will be returned
      expect(['food', 'wood']).toContain(primary!.resourceType);
    });

    it('returns null for non-resource speech', () => {
      const primary = getPrimaryResourceMention('Hello there!');

      expect(primary).toBeNull();
    });
  });

  describe('generateResourceAnnouncement', () => {
    it('generates close positive announcement', () => {
      const text = generateResourceAnnouncement('food', 'north', 'close', true);

      expect(text).toContain('food');
      expect(text).toContain('north');
      expect(text).toContain('Found');
    });

    it('generates far positive announcement', () => {
      const text = generateResourceAnnouncement('wood', 'east', 'far', true);

      expect(text).toContain('wood');
      expect(text).toContain('east');
      expect(text).toContain('far');
    });

    it('generates medium positive announcement', () => {
      const text = generateResourceAnnouncement('stone', 'south', 'medium', true);

      expect(text).toContain('stone');
      expect(text).toContain('south');
    });

    it('generates negative announcement', () => {
      const text = generateResourceAnnouncement('water', 'west', 'medium', false);

      expect(text).toContain('water');
      expect(text).toContain('west');
      expect(text).toContain('gone');
    });

    it('handles nearby direction', () => {
      const text = generateResourceAnnouncement('food', 'nearby', 'close', true);

      expect(text).toContain('nearby');
    });
  });

  describe('getAnnouncementExamples', () => {
    it('returns array of example announcements', () => {
      const examples = getAnnouncementExamples();

      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);
    });

    it('examples are parseable', () => {
      const examples = getAnnouncementExamples();

      for (const example of examples) {
        const mentions = parseResourceMentions(example);
        expect(mentions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('vectorToCardinal', () => {
    it('returns nearby for zero vector', () => {
      expect(vectorToCardinal(0, 0)).toBe('nearby');
    });

    it('converts pure directions correctly', () => {
      expect(vectorToCardinal(1, 0)).toBe('east');
      expect(vectorToCardinal(-1, 0)).toBe('west');
      expect(vectorToCardinal(0, 1)).toBe('south'); // +y is down
      expect(vectorToCardinal(0, -1)).toBe('north');
    });

    it('converts diagonal directions', () => {
      expect(vectorToCardinal(1, 1)).toBe('southeast');
      expect(vectorToCardinal(-1, 1)).toBe('southwest');
      expect(vectorToCardinal(1, -1)).toBe('northeast');
      expect(vectorToCardinal(-1, -1)).toBe('northwest');
    });

    it('handles non-normalized vectors', () => {
      expect(vectorToCardinal(100, 0)).toBe('east');
      expect(vectorToCardinal(0, -50)).toBe('north');
    });
  });

  describe('cardinalToVector', () => {
    it('returns zero for nearby', () => {
      const vec = cardinalToVector('nearby');
      expect(vec.dx).toBe(0);
      expect(vec.dy).toBe(0);
    });

    it('returns correct vectors for cardinal directions', () => {
      expect(cardinalToVector('north')).toEqual({ dx: 0, dy: -1 });
      expect(cardinalToVector('south')).toEqual({ dx: 0, dy: 1 });
      expect(cardinalToVector('east')).toEqual({ dx: 1, dy: 0 });
      expect(cardinalToVector('west')).toEqual({ dx: -1, dy: 0 });
    });

    it('returns normalized vectors for diagonals', () => {
      const ne = cardinalToVector('northeast');
      expect(ne.dx).toBeCloseTo(0.707, 2);
      expect(ne.dy).toBeCloseTo(-0.707, 2);
    });
  });

  describe('distanceToTiles', () => {
    it('returns correct estimates', () => {
      expect(distanceToTiles('close')).toBe(20);
      expect(distanceToTiles('medium')).toBe(50);
      expect(distanceToTiles('far')).toBe(100);
    });
  });

  describe('round-trip parsing', () => {
    it('can parse generated announcements', () => {
      const original = generateResourceAnnouncement('food', 'north', 'close', true);
      const parsed = getPrimaryResourceMention(original);

      expect(parsed).not.toBeNull();
      expect(parsed!.resourceType).toBe('food');
      expect(parsed!.direction).toBe('north');
      expect(parsed!.isPositive).toBe(true);
    });

    it('can parse all direction variations', () => {
      const directions = [
        'north',
        'northeast',
        'east',
        'southeast',
        'south',
        'southwest',
        'west',
        'northwest',
      ] as const;

      for (const dir of directions) {
        const text = generateResourceAnnouncement('food', dir, 'medium', true);
        const parsed = getPrimaryResourceMention(text);

        expect(parsed).not.toBeNull();
        expect(parsed!.direction).toBe(dir);
      }
    });
  });
});
