import { describe, it, expect } from 'vitest';
import { parseAction, actionToBehavior } from '../AgentAction';
import type { AgentAction } from '../AgentAction';

describe('AgentAction', () => {
  describe('parseAction', () => {
    it('should parse "chop" keyword to chop action', () => {
      const action = parseAction('I will chop down the tree');
      expect(action).toEqual({ type: 'chop', targetId: 'nearest' });
    });

    it('should parse "mine" keyword to mine action', () => {
      const action = parseAction('I will mine the rock');
      expect(action).toEqual({ type: 'mine', targetId: 'nearest' });
    });

    it('should parse "wood" keyword to chop action', () => {
      const action = parseAction('I need to gather wood');
      expect(action).toEqual({ type: 'chop', targetId: 'nearest' });
    });

    it('should parse "stone" keyword to mine action', () => {
      const action = parseAction('I need to get stone');
      expect(action).toEqual({ type: 'mine', targetId: 'nearest' });
    });

    it('should parse "gather" keyword to chop action (default)', () => {
      const action = parseAction('I will gather resources');
      expect(action).toEqual({ type: 'chop', targetId: 'nearest' });
    });

    it('should prioritize "chop" over "gather" when both present', () => {
      const action = parseAction('I will gather by chopping trees');
      expect(action).toEqual({ type: 'chop', targetId: 'nearest' });
    });

    it('should prioritize "mine" over "gather" when both present', () => {
      const action = parseAction('I will gather by mining rocks');
      expect(action).toEqual({ type: 'mine', targetId: 'nearest' });
    });

    it('should parse "forage" to forage action (for food)', () => {
      const action = parseAction('I will forage for berries');
      expect(action).toEqual({ type: 'forage' });
    });
  });

  describe('actionToBehavior', () => {
    it('should map chop action to pick behavior', () => {
      const behavior = actionToBehavior({ type: 'chop', targetId: 'nearest' });
      expect(behavior).toBe('pick');
    });

    it('should map mine action to pick behavior', () => {
      const behavior = actionToBehavior({ type: 'mine', targetId: 'nearest' });
      expect(behavior).toBe('pick');
    });

    it('should map gather action to gather behavior', () => {
      const behavior = actionToBehavior({ type: 'gather', targetId: 'nearest' });
      expect(behavior).toBe('gather');
    });

    it('should map forage action to seek_food behavior', () => {
      const behavior = actionToBehavior({ type: 'forage' });
      expect(behavior).toBe('seek_food');
    });

    it('should map eat action to seek_food behavior', () => {
      // 'eat' action maps to 'seek_food' behavior which finds and eats food
      const behavior = actionToBehavior({ type: 'eat' });
      expect(behavior).toBe('seek_food');
    });

    it('should return undefined for idle action (fallback behavior)', () => {
      // idle should not be explicitly set by LLM - agent stays in current behavior
      const behavior = actionToBehavior({ type: 'idle' });
      expect(behavior).toBeUndefined();
    });

    it('should return undefined for wander action (fallback behavior)', () => {
      // wander should not be explicitly set by LLM - agent stays in current behavior
      const behavior = actionToBehavior({ type: 'wander' });
      expect(behavior).toBeUndefined();
    });

    it('should return undefined for unmapped action types', () => {
      // Unknown actions should not default to idle - return undefined
      const invalidType: unknown = 'unknown_action';
      const behavior = actionToBehavior({ type: invalidType as string } as AgentAction);
      expect(behavior).toBeUndefined();
    });
  });
});
