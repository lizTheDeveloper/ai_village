/**
 * Tests for Phase 2B: Mutation Layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent } from '../types/ComponentSchema.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import {
  MutationService,
  ValidationService,
  UndoStack,
  type MutationEvent,
} from '../mutation/index.js';

/**
 * Mock Entity implementation for testing
 */
class MockEntity {
  public id: string;
  private components: Map<string, any> = new Map();

  constructor(id: string = 'test-entity') {
    this.id = id;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  getComponent<T>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  addComponent(component: any): void {
    this.components.set(component.type, component);
  }

  updateComponent<T>(type: string, updater: (current: T) => T): void {
    const current = this.components.get(type) as T | undefined;
    if (!current) {
      throw new Error(`Entity ${this.id} does not have component of type "${type}"`);
    }
    const updated = updater(current);
    this.components.set(type, updated);
  }
}

/**
 * Test component types
 */
interface IdentityComponent {
  type: 'identity';
  version: number;
  name: string;
  age: number;
  species: 'human' | 'elf' | 'dwarf';
}

interface HealthComponent {
  type: 'health';
  version: number;
  current: number;
  max: number;
}

/**
 * Test schemas
 */
const IdentitySchema = defineComponent<IdentityComponent>({
  type: 'identity',
  version: 1,
  category: 'core',

  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Entity name',
      maxLength: 50,
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text' },
      mutable: true,
    },

    age: {
      type: 'number',
      required: true,
      range: [0, 10000],
      description: 'Age in days',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },

    species: {
      type: 'enum',
      enumValues: ['human', 'elf', 'dwarf'],
      required: true,
      description: 'Species type',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'dropdown' },
      mutable: false, // Not mutable!
    },
  },

  validate: (data): data is IdentityComponent => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return (
      candidate.type === 'identity' &&
      typeof candidate.name === 'string' &&
      typeof candidate.age === 'number'
    );
  },

  createDefault: () => ({
    type: 'identity',
    version: 1,
    name: 'Unknown',
    age: 0,
    species: 'human',
  }),
});

const HealthSchema = defineComponent<HealthComponent>({
  type: 'health',
  version: 1,
  category: 'physical',

  fields: {
    current: {
      type: 'number',
      required: true,
      range: [0, 100],
      description: 'Current health',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider' },
      mutable: true,
    },

    max: {
      type: 'number',
      required: true,
      range: [1, 100],
      description: 'Maximum health',
      visibility: { player: true, dev: true },
      ui: { widget: 'number' },
      mutable: true,
    },
  },

  validate: (data): data is HealthComponent => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Record<string, unknown>;
    return (
      candidate.type === 'health' &&
      typeof candidate.current === 'number' &&
      typeof candidate.max === 'number'
    );
  },

  createDefault: () => ({
    type: 'health',
    version: 1,
    current: 100,
    max: 100,
  }),
});

describe('Phase 2B: Mutation Layer', () => {
  beforeEach(() => {
    // Register schemas
    ComponentRegistry.register(IdentitySchema);
    ComponentRegistry.register(HealthSchema);

    // Clear mutation history
    MutationService.clearHistory();
    MutationService.setDevMode(false);
  });

  afterEach(() => {
    ComponentRegistry.clear();
  });

  describe('ValidationService', () => {
    it('should validate correct types', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'name',
        'Bob',
        false
      );
      expect(result.valid).toBe(true);
    });

    it('should reject incorrect types', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'name',
        123,
        false
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected string');
    });

    it('should validate number ranges', () => {
      const valid = ValidationService.validate(IdentitySchema, 'age', 50, false);
      expect(valid.valid).toBe(true);

      const tooLow = ValidationService.validate(IdentitySchema, 'age', -5, false);
      expect(tooLow.valid).toBe(false);
      expect(tooLow.error).toContain('must be between 0 and 10000');

      const tooHigh = ValidationService.validate(IdentitySchema, 'age', 20000, false);
      expect(tooHigh.valid).toBe(false);
    });

    it('should validate enum values', () => {
      // Use isDev=true to bypass mutability check (species is immutable)
      const valid = ValidationService.validate(
        IdentitySchema,
        'species',
        'elf',
        true // Dev mode to bypass mutability
      );
      expect(valid.valid).toBe(true);

      const invalid = ValidationService.validate(
        IdentitySchema,
        'species',
        'orc',
        true // Dev mode to bypass mutability
      );
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toContain('must be one of');
    });

    it('should validate string max length', () => {
      const valid = ValidationService.validate(IdentitySchema, 'name', 'Bob', false);
      expect(valid.valid).toBe(true);

      const tooLong = ValidationService.validate(
        IdentitySchema,
        'name',
        'A'.repeat(100),
        false
      );
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toContain('must be at most 50 characters');
    });

    it('should protect immutable fields', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'species',
        'elf',
        false
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not mutable');
    });

    it('should allow dev to mutate immutable fields', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'species',
        'elf',
        true
      );
      expect(result.valid).toBe(true);
    });

    it('should reject mutations to non-existent fields', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'nonexistent',
        'value',
        false
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should reject null for required fields', () => {
      const result = ValidationService.validate(
        IdentitySchema,
        'name',
        null,
        false
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('UndoStack', () => {
    it('should track commands', () => {
      const stack = new UndoStack();
      let value = 10;

      const command = {
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: 10,
        newValue: 20,
        execute: () => {
          value = 20;
        },
        undo: () => {
          value = 10;
        },
      };

      stack.push(command);
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('should undo commands', () => {
      const stack = new UndoStack();
      let value = 10;

      const command = {
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: 10,
        newValue: 20,
        execute: () => {
          value = 20;
        },
        undo: () => {
          value = 10;
        },
      };

      command.execute();
      expect(value).toBe(20);

      stack.push(command);
      stack.undo();
      expect(value).toBe(10);
      expect(stack.canRedo()).toBe(true);
    });

    it('should redo commands', () => {
      const stack = new UndoStack();
      let value = 10;

      const command = {
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: 10,
        newValue: 20,
        execute: () => {
          value = 20;
        },
        undo: () => {
          value = 10;
        },
      };

      command.execute();
      stack.push(command);
      stack.undo();
      expect(value).toBe(10);

      stack.redo();
      expect(value).toBe(20);
    });

    it('should clear redo stack on new command', () => {
      const stack = new UndoStack();
      let value = 10;

      const command1 = {
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: 10,
        newValue: 20,
        execute: () => {
          value = 20;
        },
        undo: () => {
          value = 10;
        },
      };

      const command2 = {
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: 20,
        newValue: 30,
        execute: () => {
          value = 30;
        },
        undo: () => {
          value = 20;
        },
      };

      command1.execute();
      stack.push(command1);
      stack.undo();

      // New command should clear redo
      command2.execute();
      stack.push(command2);
      expect(stack.canRedo()).toBe(false);
    });

    it('should enforce max size', () => {
      const stack = new UndoStack(2); // Max 2 commands

      const makeCommand = (n: number) => ({
        entityId: 'test',
        componentType: 'test',
        fieldName: 'value',
        oldValue: n - 1,
        newValue: n,
        execute: () => {},
        undo: () => {},
      });

      stack.push(makeCommand(1));
      stack.push(makeCommand(2));
      stack.push(makeCommand(3)); // Should evict command 1

      expect(stack.getUndoSize()).toBe(2);
    });
  });

  describe('MutationService', () => {
    it('should mutate valid fields', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const result = MutationService.mutate(entity, 'identity', 'name', 'Alice');

      expect(result.success).toBe(true);
      const identity = entity.getComponent<IdentityComponent>('identity');
      expect(identity?.name).toBe('Alice');
    });

    it('should reject invalid type mutations', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const result = MutationService.mutate(entity, 'identity', 'name', 123);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected string');
    });

    it('should reject out-of-range mutations', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const result = MutationService.mutate(entity, 'identity', 'age', -5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be between');
    });

    it('should reject immutable field mutations', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const result = MutationService.mutate(entity, 'identity', 'species', 'elf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not mutable');
    });

    it('should allow dev mode to mutate immutable fields', () => {
      MutationService.setDevMode(true);

      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const result = MutationService.mutate(entity, 'identity', 'species', 'elf');

      expect(result.success).toBe(true);
      const identity = entity.getComponent<IdentityComponent>('identity');
      expect(identity?.species).toBe('elf');
    });

    it('should support undo', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      MutationService.mutate(entity, 'identity', 'name', 'Bob');
      expect(entity.getComponent<IdentityComponent>('identity')?.name).toBe('Bob');

      MutationService.undo();
      expect(entity.getComponent<IdentityComponent>('identity')?.name).toBe('Unknown');
    });

    it('should support redo', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      MutationService.mutate(entity, 'identity', 'name', 'Charlie');
      MutationService.undo();

      MutationService.redo();
      expect(entity.getComponent<IdentityComponent>('identity')?.name).toBe('Charlie');
    });

    it('should emit mutation events', () => {
      const entity = new MockEntity();
      entity.addComponent(IdentitySchema.createDefault());

      const events: MutationEvent[] = [];
      const handler = (e: MutationEvent) => events.push(e);

      MutationService.on('mutated', handler);

      MutationService.mutate(entity, 'identity', 'name', 'David');

      expect(events).toHaveLength(1);
      const event = events[0];
      expect(event).toBeDefined();
      expect(event!.fieldName).toBe('name');
      expect(event!.oldValue).toBe('Unknown');
      expect(event!.newValue).toBe('David');

      MutationService.off('mutated', handler);
    });

    it('should handle batch mutations', () => {
      const entity1 = new MockEntity('entity-1');
      const entity2 = new MockEntity('entity-2');

      entity1.addComponent(IdentitySchema.createDefault());
      entity2.addComponent(HealthSchema.createDefault());

      const results = MutationService.mutateBatch([
        { entity: entity1, componentType: 'identity', fieldName: 'name', value: 'Eve' },
        { entity: entity2, componentType: 'health', fieldName: 'current', value: 50 },
      ]);

      expect(results.every((r) => r.success)).toBe(true);
      const identity1 = entity1.getComponent<IdentityComponent>('identity');
      const health2 = entity2.getComponent<HealthComponent>('health');
      expect(identity1).toBeDefined();
      expect(health2).toBeDefined();
      expect(identity1!.name).toBe('Eve');
      expect(health2!.current).toBe(50);
    });

    it('should reject batch if any mutation is invalid', () => {
      const entity1 = new MockEntity('entity-1');
      const entity2 = new MockEntity('entity-2');

      entity1.addComponent(IdentitySchema.createDefault());
      entity2.addComponent(HealthSchema.createDefault());

      const results = MutationService.mutateBatch([
        { entity: entity1, componentType: 'identity', fieldName: 'name', value: 'Frank' },
        { entity: entity2, componentType: 'health', fieldName: 'current', value: 200 }, // Invalid!
      ]);

      // Both should fail due to batch validation
      const result0 = results[0];
      const result1 = results[1];
      expect(result0).toBeDefined();
      expect(result1).toBeDefined();
      expect(result0!.success).toBe(true); // First is valid
      expect(result1!.success).toBe(false); // Second is invalid
      const error = result1!.error;
      expect(error).toBeDefined();
      expect(error!).toContain('must be between');
    });

    it('should reject mutations to missing components', () => {
      const entity = new MockEntity();
      // No components added!

      const result = MutationService.mutate(entity, 'identity', 'name', 'George');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have component');
    });

    it('should reject mutations to unregistered schemas', () => {
      const entity = new MockEntity();
      entity.addComponent({ type: 'unknown', version: 1 });

      const result = MutationService.mutate(entity, 'unknown', 'field', 'value');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No schema registered');
    });
  });
});
