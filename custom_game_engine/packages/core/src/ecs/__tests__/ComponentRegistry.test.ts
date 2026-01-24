import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRegistry } from '../ComponentRegistry.js';
import type { ComponentSchema, Component } from '../Component.js';

interface TestComponent extends Component {
  type: 'test';
  value: number;
}

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;
  let testSchema: ComponentSchema<TestComponent>;

  beforeEach(() => {
    registry = new ComponentRegistry();
    testSchema = {
      type: 'test',
      version: 1,
      fields: [{ name: 'value', type: 'number', required: true, default: 0 }],
      validate: (data): data is TestComponent => {
        return typeof data === 'object' && data !== null && (data as { type?: string }).type === 'test';
      },
      createDefault: () => ({ type: 'test', version: 1, value: 0 }),
    };
  });

  it('should register component schema', () => {
    registry.register(testSchema);
    expect(registry.has('test')).toBe(true);
  });

  it('should throw when registering duplicate type', () => {
    registry.register(testSchema);
    expect(() => registry.register(testSchema)).toThrow();
  });

  it('should get registered schema', () => {
    registry.register(testSchema);
    const schema = registry.getSchema<TestComponent>('test');
    expect(schema).toBe(testSchema);
  });

  it('should return undefined for unregistered type', () => {
    expect(registry.getSchema('nonexistent')).toBeUndefined();
  });

  it('should create default component', () => {
    registry.register(testSchema);
    const component = registry.createDefault<TestComponent>('test');

    expect(component.type).toBe('test');
    expect(component.version).toBe(1);
    expect(component.value).toBe(0);
  });

  it('should throw when creating default for unregistered type', () => {
    expect(() => registry.createDefault('nonexistent')).toThrow();
  });

  it('should list all registered types', () => {
    registry.register(testSchema);

    const types = registry.getTypes();
    expect(types).toContain('test');
    expect(types.length).toBe(1);
  });

  it('should migrate component', () => {
    const schemaWithMigration: ComponentSchema<TestComponent> = {
      ...testSchema,
      migrateFrom: (data: unknown, fromVersion: number) => {
        if (fromVersion === 1) {
          const oldData = data as { value: number };
          return { type: 'test', version: 2, value: oldData.value * 2 };
        }
        return data as TestComponent;
      },
    };

    registry.register(schemaWithMigration);

    const oldData = { type: 'test', version: 1, value: 5 };
    const migrated = registry.migrate<TestComponent>('test', oldData, 1);

    expect(migrated.version).toBe(2);
    expect(migrated.value).toBe(10);
  });

  it('should throw when migrating without migration function', () => {
    registry.register(testSchema);
    expect(() => {
      registry.migrate('test', {}, 1);
    }).toThrow();
  });
});
