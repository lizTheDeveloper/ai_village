/**
 * Type tests for Phase 1C: Field Metadata System
 *
 * Verifies all metadata types work as expected
 */

import { describe, it, expect } from 'vitest';
import {
  type WidgetType,
  type ComponentCategory,
  type Visibility,
  type Mutability,
  type UIHints,
  type UIConfig,
  type LLMConfig,
  isVisibleToLLM,
  shouldSummarizeForLLM,
  isMutable,
  requiresMutator,
  canMutate,
} from '../index.js';

describe('Phase 1C: Field Metadata System', () => {
  describe('WidgetType', () => {
    it('should accept all valid widget types', () => {
      const validWidgets: WidgetType[] = [
        'text',
        'textarea',
        'number',
        'slider',
        'dropdown',
        'checkbox',
        'color',
        'readonly',
        'json',
        'custom',
      ];

      validWidgets.forEach((widget) => {
        const w: WidgetType = widget;
        expect(w).toBe(widget);
      });
    });
  });

  describe('ComponentCategory', () => {
    it('should accept all valid categories', () => {
      const validCategories: ComponentCategory[] = [
        'core',
        'agent',
        'physical',
        'social',
        'cognitive',
        'magic',
        'world',
        'system',
      ];

      validCategories.forEach((category) => {
        const c: ComponentCategory = category;
        expect(c).toBe(category);
      });
    });
  });

  describe('Visibility', () => {
    it('should create valid visibility config', () => {
      const vis: Visibility = {
        player: true,
        llm: 'summarized',
        agent: false,
        user: true,
        dev: true,
      };

      expect(vis.player).toBe(true);
      expect(vis.llm).toBe('summarized');
      expect(vis.agent).toBe(false);
      expect(vis.user).toBe(true);
      expect(vis.dev).toBe(true);
    });

    it('should detect LLM visibility', () => {
      expect(isVisibleToLLM({ llm: true })).toBe(true);
      expect(isVisibleToLLM({ llm: 'summarized' })).toBe(true);
      expect(isVisibleToLLM({ llm: false })).toBe(false);
      expect(isVisibleToLLM({})).toBe(false);
    });

    it('should detect summarization requirement', () => {
      expect(shouldSummarizeForLLM({ llm: 'summarized' })).toBe(true);
      expect(shouldSummarizeForLLM({ llm: true })).toBe(false);
      expect(shouldSummarizeForLLM({ llm: false })).toBe(false);
    });
  });

  describe('Mutability', () => {
    it('should create valid mutability config', () => {
      const mut: Mutability = {
        mutable: true,
        mutateVia: 'setHealth',
        permissions: {
          player: false,
          user: true,
          dev: true,
        },
      };

      expect(mut.mutable).toBe(true);
      expect(mut.mutateVia).toBe('setHealth');
      expect(mut.permissions?.dev).toBe(true);
    });

    it('should detect mutability', () => {
      expect(isMutable({ mutable: true })).toBe(true);
      expect(isMutable({ mutable: false })).toBe(false);
      expect(isMutable(undefined)).toBe(false);
    });

    it('should detect mutator requirement', () => {
      expect(requiresMutator({ mutateVia: 'setHealth' })).toBe(true);
      expect(requiresMutator({ mutable: true })).toBe(false);
      expect(requiresMutator(undefined)).toBe(false);
    });

    it('should check consumer permissions', () => {
      const mut: Mutability = {
        mutable: true,
        permissions: {
          player: false,
          user: true,
          dev: true,
        },
      };

      expect(canMutate(mut, 'player')).toBe(false);
      expect(canMutate(mut, 'user')).toBe(true);
      expect(canMutate(mut, 'dev')).toBe(true);
    });

    it('should default to dev-only if no permissions specified', () => {
      const mut: Mutability = { mutable: true };

      expect(canMutate(mut, 'player')).toBe(false);
      expect(canMutate(mut, 'user')).toBe(false);
      expect(canMutate(mut, 'dev')).toBe(true);
    });
  });

  describe('UIHints', () => {
    it('should create valid UI hints', () => {
      const ui: UIHints = {
        widget: 'slider',
        group: 'stats',
        order: 1,
        icon: 'heart',
        color: '#FF0000',
        tooltip: 'Current health',
        emphasized: true,
      };

      expect(ui.widget).toBe('slider');
      expect(ui.group).toBe('stats');
      expect(ui.order).toBe(1);
      expect(ui.icon).toBe('heart');
      expect(ui.color).toBe('#FF0000');
    });
  });

  describe('UIConfig', () => {
    it('should create valid UI config', () => {
      const config: UIConfig = {
        icon: 'person',
        color: '#4CAF50',
        priority: 1,
        collapsed: false,
        title: 'Agent Identity',
        section: 'Core',
      };

      expect(config.icon).toBe('person');
      expect(config.color).toBe('#4CAF50');
      expect(config.priority).toBe(1);
    });
  });

  describe('LLMConfig', () => {
    it('should create valid LLM config', () => {
      interface TestData {
        name: string;
        age: number;
      }

      const config: LLMConfig<TestData> = {
        promptSection: 'identity',
        summarize: (data) => `${data.name} (${data.age} years old)`,
        priority: 1,
        includeInAgentPrompt: true,
        maxLength: 100,
      };

      expect(config.promptSection).toBe('identity');
      expect(config.summarize?.({ name: 'Alice', age: 25 })).toBe('Alice (25 years old)');
    });
  });

  describe('Integration Test', () => {
    it('should work together in a realistic field definition', () => {
      // This mimics how a field would be defined in a schema
      interface FieldDef {
        visibility: Visibility;
        mutability: Mutability;
        ui: UIHints;
      }

      const healthField: FieldDef = {
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: false,
          dev: true,
        },
        mutability: {
          mutable: true,
          mutateVia: 'damage',
          permissions: {
            player: false,
            user: false,
            dev: true,
          },
        },
        ui: {
          widget: 'slider',
          group: 'stats',
          order: 1,
          icon: '❤️',
          color: '#FF0000',
        },
      };

      // Verify it compiles and has correct structure
      expect(healthField.visibility.player).toBe(true);
      expect(isVisibleToLLM(healthField.visibility)).toBe(true);
      expect(shouldSummarizeForLLM(healthField.visibility)).toBe(true);
      expect(isMutable(healthField.mutability)).toBe(true);
      expect(requiresMutator(healthField.mutability)).toBe(true);
      expect(canMutate(healthField.mutability, 'dev')).toBe(true);
      expect(canMutate(healthField.mutability, 'player')).toBe(false);
      expect(healthField.ui.widget).toBe('slider');
    });
  });
});
