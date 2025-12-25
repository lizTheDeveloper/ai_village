import { describe, it, expect } from 'vitest';
import { GradientParser } from '../GradientParser';

describe('GradientParser', () => {
  describe('AC4: Social Gradients Work - Parsing', () => {
    it('should parse "wood at bearing 45° about 30 tiles"', () => {
      const text = 'I found wood at bearing 45° about 30 tiles from here!';

      const gradient = GradientParser.parse(text);

      expect(gradient).toBeDefined();
      expect(gradient?.resourceType).toBe('wood');
      expect(gradient?.bearing).toBe(45);
      expect(gradient?.distance).toBe(30);
    });

    it('should parse "stone north about 20 tiles"', () => {
      const text = 'There is stone north about 20 tiles.';

      const gradient = GradientParser.parse(text);

      expect(gradient).toBeDefined();
      expect(gradient?.resourceType).toBe('stone');
      expect(gradient?.bearing).toBe(0); // North = 0°
      expect(gradient?.distance).toBe(20);
    });

    it('should parse "food south 15 tiles"', () => {
      const text = 'Found food south 15 tiles.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('food');
      expect(gradient?.bearing).toBe(180); // South = 180°
      expect(gradient?.distance).toBe(15);
    });

    it('should parse "wood east around 40 tiles"', () => {
      const text = 'Wood east around 40 tiles.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('wood');
      expect(gradient?.bearing).toBe(90); // East = 90°
      expect(gradient?.distance).toBe(40);
    });

    it('should parse "stone west roughly 25 tiles"', () => {
      const text = 'I saw stone west roughly 25 tiles away.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('stone');
      expect(gradient?.bearing).toBe(270); // West = 270°
      expect(gradient?.distance).toBe(25);
    });

    it('should parse cardinal directions correctly', () => {
      const testCases = [
        { text: 'wood north', expected: 0 },
        { text: 'wood northeast', expected: 45 },
        { text: 'wood east', expected: 90 },
        { text: 'wood southeast', expected: 135 },
        { text: 'wood south', expected: 180 },
        { text: 'wood southwest', expected: 225 },
        { text: 'wood west', expected: 270 },
        { text: 'wood northwest', expected: 315 },
      ];

      testCases.forEach(({ text, expected }) => {
        const gradient = GradientParser.parse(text);
        expect(gradient?.bearing).toBe(expected);
      });
    });

    it('should parse multiple resource types', () => {
      const resourceTypes = ['wood', 'stone', 'food', 'water'];

      resourceTypes.forEach(resource => {
        const text = `Found ${resource} north 10 tiles.`;
        const gradient = GradientParser.parse(text);

        expect(gradient?.resourceType).toBe(resource);
      });
    });

    it('should parse distance variations (about, around, roughly)', () => {
      const variations = [
        'wood north about 10 tiles',
        'wood north around 10 tiles',
        'wood north roughly 10 tiles',
        'wood north 10 tiles',
      ];

      variations.forEach(text => {
        const gradient = GradientParser.parse(text);
        expect(gradient?.distance).toBe(10);
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for text without resource mention', () => {
      const text = 'Hello, how are you?';

      const gradient = GradientParser.parse(text);

      expect(gradient).toBeNull();
    });

    it('should return null for text without direction', () => {
      const text = 'I found wood.';

      const gradient = GradientParser.parse(text);

      expect(gradient).toBeNull();
    });

    it('should handle text with resource but no distance', () => {
      const text = 'Wood is north of here.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('wood');
      expect(gradient?.bearing).toBe(0);
      expect(gradient?.distance).toBeUndefined(); // Or default value
    });

    it('should parse bearing with degree symbol variations', () => {
      const variations = [
        'wood at bearing 45°',
        'wood at bearing 45 degrees',
        'wood at bearing 45deg',
        'wood at 45°',
      ];

      variations.forEach(text => {
        const gradient = GradientParser.parse(text);
        expect(gradient?.bearing).toBe(45);
      });
    });

    it('should handle compound sentences', () => {
      const text = 'I went exploring and found wood at bearing 90° about 25 tiles. It was great!';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('wood');
      expect(gradient?.bearing).toBe(90);
      expect(gradient?.distance).toBe(25);
    });

    it('should prioritize explicit bearing over cardinal direction', () => {
      const text = 'wood north at bearing 45°'; // Conflicting

      const gradient = GradientParser.parse(text);

      expect(gradient?.bearing).toBe(45); // Explicit bearing wins
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error for invalid bearing value', () => {
      expect(() => {
        GradientParser.validateBearing(400);
      }).toThrow(/bearing/i);
    });

    it('should throw error for negative bearing', () => {
      expect(() => {
        GradientParser.validateBearing(-10);
      }).toThrow(/bearing/i);
    });

    it('should throw error for non-numeric bearing', () => {
      expect(() => {
        GradientParser.validateBearing(NaN);
      }).toThrow(/bearing/i);
    });

    it('should throw error for invalid resource type', () => {
      expect(() => {
        GradientParser.validateResourceType('invalid_resource');
      }).toThrow(/resource type/i);
    });

    it('should throw error for negative distance', () => {
      expect(() => {
        GradientParser.validateDistance(-5);
      }).toThrow(/distance/i);
    });
  });

  describe('confidence calculation', () => {
    it('should assign higher confidence to precise bearings', () => {
      const precise = GradientParser.parse('wood at bearing 47° about 30 tiles');
      const vague = GradientParser.parse('wood north about 30 tiles');

      expect(precise?.confidence).toBeGreaterThan(vague?.confidence || 0);
    });

    it('should assign higher confidence to specific distances', () => {
      const specific = GradientParser.parse('wood north 30 tiles');
      const vague = GradientParser.parse('wood north');

      expect(specific?.confidence).toBeGreaterThan(vague?.confidence || 0);
    });

    it('should assign lower confidence to approximate language', () => {
      const approximate = GradientParser.parse('wood north roughly 30 tiles');
      const specific = GradientParser.parse('wood north 30 tiles');

      expect(approximate?.confidence).toBeLessThan(specific?.confidence || 1);
    });
  });

  describe('alternative phrasings', () => {
    it('should parse "spotted wood to the north"', () => {
      const text = 'I spotted wood to the north.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('wood');
      expect(gradient?.bearing).toBe(0);
    });

    it('should parse "there\'s stone in the east direction"', () => {
      const text = "There's stone in the east direction about 20 tiles.";

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('stone');
      expect(gradient?.bearing).toBe(90);
      expect(gradient?.distance).toBe(20);
    });

    it('should parse "food can be found southwest"', () => {
      const text = 'Food can be found southwest, roughly 35 tiles away.';

      const gradient = GradientParser.parse(text);

      expect(gradient?.resourceType).toBe('food');
      expect(gradient?.bearing).toBe(225);
      expect(gradient?.distance).toBe(35);
    });
  });

  describe('extraction helpers', () => {
    it('should extract resource type from text', () => {
      const text = 'I found some wood today.';

      const resource = GradientParser.extractResourceType(text);

      expect(resource).toBe('wood');
    });

    it('should extract bearing from text', () => {
      const text = 'at bearing 127°';

      const bearing = GradientParser.extractBearing(text);

      expect(bearing).toBe(127);
    });

    it('should extract cardinal direction', () => {
      const text = 'to the northeast';

      const bearing = GradientParser.extractCardinalDirection(text);

      expect(bearing).toBe(45);
    });

    it('should extract distance from text', () => {
      const text = 'about 42 tiles away';

      const distance = GradientParser.extractDistance(text);

      expect(distance).toBe(42);
    });
  });

  describe('multiple gradients in one message', () => {
    it('should parse first gradient when multiple mentioned', () => {
      const text = 'Found wood north 10 tiles and stone south 20 tiles.';

      const gradient = GradientParser.parse(text);

      // Should return first valid gradient
      expect(gradient?.resourceType).toBe('wood');
    });

    it('should provide parseAll method for multiple gradients', () => {
      const text = 'Found wood north 10 tiles. Also saw stone south 20 tiles.';

      const gradients = GradientParser.parseAll(text);

      expect(gradients).toHaveLength(2);
      expect(gradients[0].resourceType).toBe('wood');
      expect(gradients[1].resourceType).toBe('stone');
    });
  });
});
