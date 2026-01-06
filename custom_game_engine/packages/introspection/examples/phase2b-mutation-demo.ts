/**
 * Phase 2B: Mutation Layer Demonstration
 *
 * Shows how to use the MutationService for validated, reversible component mutations.
 */

import { defineComponent, ComponentRegistry, MutationService } from '../src/index.js';

// ========================================
// 1. Define a sample component schema
// ========================================

interface PlayerComponent {
  type: 'player';
  version: number;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  class: 'warrior' | 'mage' | 'rogue';
}

const PlayerSchema = defineComponent<PlayerComponent>({
  type: 'player',
  version: 1,
  category: 'agent',

  fields: {
    name: {
      type: 'string',
      required: true,
      maxLength: 30,
      description: 'Player character name',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'text', group: 'identity' },
      mutable: true, // Can be changed
    },

    level: {
      type: 'number',
      required: true,
      range: [1, 100],
      description: 'Character level',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'slider', group: 'stats' },
      mutable: true, // Can be leveled up
    },

    health: {
      type: 'number',
      required: true,
      range: [0, 999],
      description: 'Current health points',
      visibility: { player: true, dev: true },
      ui: { widget: 'slider', group: 'stats' },
      mutable: true, // Changes in combat
    },

    maxHealth: {
      type: 'number',
      required: true,
      range: [1, 999],
      description: 'Maximum health points',
      visibility: { player: true, dev: true },
      ui: { widget: 'number', group: 'stats' },
      mutable: true,
    },

    class: {
      type: 'enum',
      enumValues: ['warrior', 'mage', 'rogue'],
      required: true,
      description: 'Character class',
      visibility: { player: true, llm: true, dev: true },
      ui: { widget: 'dropdown', group: 'identity' },
      mutable: false, // Cannot change class once chosen!
    },
  },

  validate: (data): data is PlayerComponent => {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as any).type === 'player' &&
      typeof (data as any).name === 'string' &&
      typeof (data as any).level === 'number' &&
      typeof (data as any).health === 'number'
    );
  },

  createDefault: () => ({
    type: 'player',
    version: 1,
    name: 'Adventurer',
    level: 1,
    health: 100,
    maxHealth: 100,
    class: 'warrior',
  }),
});

// ========================================
// 2. Mock Entity (simplified for demo)
// ========================================

class DemoEntity {
  public id: string;
  private components: Map<string, any> = new Map();

  constructor(id: string) {
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
    const current = this.components.get(type) as T;
    if (!current) {
      throw new Error(`Entity ${this.id} does not have component '${type}'`);
    }
    const updated = updater(current);
    this.components.set(type, updated);
  }
}

// ========================================
// 3. Usage Examples
// ========================================

function runDemo() {
  console.log('=== Phase 2B: Mutation Layer Demo ===\n');

  // Register the schema
  ComponentRegistry.register(PlayerSchema);

  // Create an entity with a player component
  const player = new DemoEntity('player-001');
  player.addComponent(PlayerSchema.createDefault());

  console.log('Initial state:', player.getComponent('player'));

  // ----------------------------------------
  // Example 1: Valid mutation
  // ----------------------------------------
  console.log('\n--- Example 1: Valid mutation ---');
  const result1 = MutationService.mutate(player, 'player', 'name', 'Thorin');
  console.log('Changed name to "Thorin":', result1.success ? '✓' : '✗');
  console.log('Current name:', player.getComponent<PlayerComponent>('player')?.name);

  // ----------------------------------------
  // Example 2: Range validation
  // ----------------------------------------
  console.log('\n--- Example 2: Range validation ---');
  const result2a = MutationService.mutate(player, 'player', 'level', 10);
  console.log('Level up to 10:', result2a.success ? '✓' : '✗');

  const result2b = MutationService.mutate(player, 'player', 'level', 150);
  console.log('Level up to 150 (invalid):', result2b.success ? '✓' : '✗');
  console.log('Error:', result2b.error);
  console.log('Current level:', player.getComponent<PlayerComponent>('player')?.level);

  // ----------------------------------------
  // Example 3: Immutable field protection
  // ----------------------------------------
  console.log('\n--- Example 3: Immutable field protection ---');
  const result3 = MutationService.mutate(player, 'player', 'class', 'mage');
  console.log('Change class to mage:', result3.success ? '✓' : '✗');
  console.log('Error:', result3.error);
  console.log('Current class:', player.getComponent<PlayerComponent>('player')?.class);

  // ----------------------------------------
  // Example 4: Dev mode override
  // ----------------------------------------
  console.log('\n--- Example 4: Dev mode override ---');
  MutationService.setDevMode(true);
  const result4 = MutationService.mutate(player, 'player', 'class', 'mage');
  console.log('Change class to mage (dev mode):', result4.success ? '✓' : '✗');
  console.log('Current class:', player.getComponent<PlayerComponent>('player')?.class);
  MutationService.setDevMode(false);

  // ----------------------------------------
  // Example 5: Undo/Redo
  // ----------------------------------------
  console.log('\n--- Example 5: Undo/Redo ---');
  MutationService.mutate(player, 'player', 'health', 50);
  console.log('Health after damage:', player.getComponent<PlayerComponent>('player')?.health);

  MutationService.undo();
  console.log('Health after undo:', player.getComponent<PlayerComponent>('player')?.health);

  MutationService.redo();
  console.log('Health after redo:', player.getComponent<PlayerComponent>('player')?.health);

  // ----------------------------------------
  // Example 6: Event subscription
  // ----------------------------------------
  console.log('\n--- Example 6: Event subscription ---');
  MutationService.on('mutated', (event) => {
    console.log(
      `[Event] ${event.fieldName}: ${event.oldValue} → ${event.newValue} (by ${event.source})`
    );
  });

  MutationService.mutate(player, 'player', 'name', 'Gandalf', 'user');
  MutationService.mutate(player, 'player', 'level', 20, 'system');

  // ----------------------------------------
  // Example 7: Batch mutations
  // ----------------------------------------
  console.log('\n--- Example 7: Batch mutations ---');
  const results = MutationService.mutateBatch([
    { entity: player, componentType: 'player', fieldName: 'health', value: 80 },
    { entity: player, componentType: 'player', fieldName: 'maxHealth', value: 120 },
    { entity: player, componentType: 'player', fieldName: 'level', value: 25 },
  ]);

  console.log('Batch mutation results:', results.every((r) => r.success) ? 'All ✓' : 'Some ✗');
  console.log('Final state:', player.getComponent('player'));

  // ----------------------------------------
  // Summary
  // ----------------------------------------
  console.log('\n=== Summary ===');
  console.log('Undo stack size:', MutationService.canUndo() ? 'Has history' : 'Empty');
  console.log('Redo stack size:', MutationService.canRedo() ? 'Has history' : 'Empty');
}

// Run the demo
runDemo();
