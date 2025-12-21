import { describe, it, expect } from 'vitest';
import { ResponseParser, BehaviorParseError } from '../ResponseParser';

describe('ResponseParser', () => {
  const parser = new ResponseParser();

  describe('parseResponse - Structured JSON', () => {
    it('should parse valid structured response', () => {
      const response = JSON.stringify({
        thinking: 'I should explore to find food',
        speaking: 'Time to look around!',
        action: 'explore'
      });

      const result = parser.parseResponse(response);

      expect(result).toEqual({
        thinking: 'I should explore to find food',
        speaking: 'Time to look around!',
        action: 'explore'
      });
    });

    it('should handle response with no speaking', () => {
      const response = JSON.stringify({
        thinking: 'Just going to wander',
        speaking: '',
        action: 'wander'
      });

      const result = parser.parseResponse(response);

      expect(result.speaking).toBe('');
      expect(result.action).toBe('wander');
    });

    it('should parse all 12 valid actions', () => {
      const actions = [
        'wander', 'idle', 'seek_food', 'follow_agent', 'talk',
        'gather', 'explore', 'approach', 'observe', 'rest', 'work', 'help'
      ];

      for (const action of actions) {
        const response = JSON.stringify({
          thinking: 'test',
          speaking: '',
          action: action
        });

        const result = parser.parseResponse(response);
        expect(result.action).toBe(action);
      }
    });

    it('should throw on invalid action in structured response', () => {
      const response = JSON.stringify({
        thinking: 'test',
        speaking: '',
        action: 'invalid_action'
      });

      expect(() => parser.parseResponse(response)).toThrow(BehaviorParseError);
      expect(() => parser.parseResponse(response)).toThrow('Invalid action in structured response');
    });
  });

  describe('parseResponse - Text Fallback', () => {
    it('should parse plain text with action name', () => {
      const response = 'I think I should explore the area';

      const result = parser.parseResponse(response);

      expect(result.action).toBe('explore');
      expect(result.thinking).toBe(response);
      expect(result.speaking).toBe('');
    });

    it('should find action anywhere in text', () => {
      const response = 'Given the situation, I will seek_food to satisfy hunger';

      const result = parser.parseResponse(response);

      expect(result.action).toBe('seek_food');
    });

    it('should throw on empty response', () => {
      expect(() => parser.parseResponse('')).toThrow(BehaviorParseError);
      expect(() => parser.parseResponse('  ')).toThrow(BehaviorParseError);
    });

    it('should throw when no valid action found', () => {
      const response = 'This has no valid action in it';

      expect(() => parser.parseResponse(response)).toThrow(BehaviorParseError);
      expect(() => parser.parseResponse(response)).toThrow('Could not parse valid behavior');
    });
  });

  describe('parseBehavior - Legacy API', () => {
    it('should extract just the action from structured response', () => {
      const response = JSON.stringify({
        thinking: 'test',
        speaking: 'hello',
        action: 'talk'
      });

      const behavior = parser.parseBehavior(response);

      expect(behavior).toBe('talk');
    });

    it('should work with text response', () => {
      const response = 'I should idle and rest';

      const behavior = parser.parseBehavior(response);

      expect(behavior).toBe('idle');
    });
  });

  describe('isValidBehavior', () => {
    it('should validate all 12 behaviors', () => {
      const validBehaviors = [
        'wander', 'idle', 'seek_food', 'follow_agent', 'talk',
        'gather', 'explore', 'approach', 'observe', 'rest', 'work', 'help'
      ];

      for (const behavior of validBehaviors) {
        expect(parser.isValidBehavior(behavior)).toBe(true);
      }
    });

    it('should reject invalid behaviors', () => {
      expect(parser.isValidBehavior('invalid')).toBe(false);
      expect(parser.isValidBehavior('run')).toBe(false);
      expect(parser.isValidBehavior('')).toBe(false);
    });
  });
});
