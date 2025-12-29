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

    it('should parse all core valid actions', () => {
      // These are actual valid behaviors (not synonyms)
      const actions = [
        'wander', 'idle', 'follow_agent', 'talk', 'pick',
        'explore', 'approach', 'observe', 'rest', 'work', 'help',
        'build', 'deposit_items', 'till', 'farm', 'plant'
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

      // seek_food is a synonym that maps to 'pick'
      expect(result.action).toBe('pick');
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
    it('should validate core behaviors', () => {
      // These are actual valid behaviors (not synonyms)
      const validBehaviors = [
        'wander', 'idle', 'follow_agent', 'talk', 'pick',
        'explore', 'approach', 'observe', 'rest', 'work', 'help',
        'build', 'deposit_items', 'till', 'farm', 'plant'
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

    it('should reject synonyms (they are not valid behaviors)', () => {
      // Synonyms map to valid behaviors but are not themselves valid
      expect(parser.isValidBehavior('seek_food')).toBe(false);
      expect(parser.isValidBehavior('gather')).toBe(false);
      expect(parser.isValidBehavior('harvest')).toBe(false);
    });
  });

  describe('Object-style actions', () => {
    it('should parse action object with type field', () => {
      const response = JSON.stringify({
        thinking: 'Village needs a workbench',
        speaking: 'Time to build!',
        action: { type: 'plan_build', building: 'workbench' }
      });

      const result = parser.parseResponse(response);

      expect(result.action).toBe('plan_build');
      expect(result.actionParams).toEqual({ building: 'workbench' });
      expect(result.thinking).toBe('Village needs a workbench');
    });

    it('should parse set_priorities action', () => {
      const response = JSON.stringify({
        thinking: 'Focus on building',
        speaking: '',
        action: { type: 'set_priorities', priorities: { building: 0.9, gathering: 0.3 } }
      });

      const result = parser.parseResponse(response);

      expect(result.action).toBe('set_priorities');
      expect(result.actionParams).toEqual({ priorities: { building: 0.9, gathering: 0.3 } });
    });

    it('should handle action object with synonym type', () => {
      const response = JSON.stringify({
        thinking: 'Need wood',
        speaking: '',
        action: { type: 'gather', target: 'wood' }
      });

      const result = parser.parseResponse(response);

      expect(result.action).toBe('pick');  // gather maps to pick
      expect(result.actionParams).toEqual({ target: 'wood' });
    });

    it('should throw on invalid action type in object', () => {
      const response = JSON.stringify({
        thinking: 'test',
        speaking: '',
        action: { type: 'invalid_action', foo: 'bar' }
      });

      expect(() => parser.parseResponse(response)).toThrow(BehaviorParseError);
      expect(() => parser.parseResponse(response)).toThrow('Invalid action type');
    });

    it('should return no actionParams for simple string action', () => {
      const response = JSON.stringify({
        thinking: 'Just wandering',
        speaking: '',
        action: 'wander'
      });

      const result = parser.parseResponse(response);

      expect(result.action).toBe('wander');
      expect(result.actionParams).toBeUndefined();
    });
  });

  describe('Synonym mapping', () => {
    it('should map seek_food to pick', () => {
      const response = 'I will seek_food in the forest';
      const result = parser.parseResponse(response);
      expect(result.action).toBe('pick');
    });

    it('should map gather to pick', () => {
      const response = 'Time to gather resources';
      const result = parser.parseResponse(response);
      expect(result.action).toBe('pick');
    });

    it('should map harvest to pick', () => {
      const response = 'I should harvest the crops';
      const result = parser.parseResponse(response);
      expect(result.action).toBe('pick');
    });

    it('should map sleep to rest', () => {
      const response = 'I need to sleep now';
      const result = parser.parseResponse(response);
      expect(result.action).toBe('rest');
    });

    it('should map construct to build', () => {
      const response = 'Let me construct a shelter';
      const result = parser.parseResponse(response);
      expect(result.action).toBe('build');
    });
  });
});
