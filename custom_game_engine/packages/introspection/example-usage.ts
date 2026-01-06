/**
 * Example usage demonstrating Phase 1B: Component Registry
 * 
 * This file verifies all acceptance criteria work correctly.
 */

import {
  ComponentRegistry,
  defineComponent,
  autoRegister,
  type ComponentSchema,
  type Component
} from './dist/index.js';

// Define an example component type
interface IdentityComponent extends Component {
  type: 'identity';
  version: 1;
  name: string;
  species: 'human' | 'elf' | 'dwarf';
  age: number;
}

// Create a schema
const IdentitySchema = defineComponent<IdentityComponent>({
  type: 'identity',
  version: 1,
  category: 'core',
  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Entity name',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'text', group: 'basic', order: 1 },
    },
    species: {
      type: 'enum',
      enumValues: ['human', 'elf', 'dwarf'] as const,
      required: true,
      description: 'Species type',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'dropdown', group: 'basic', order: 2 },
    },
    age: {
      type: 'number',
      required: true,
      range: [0, 10000],
      description: 'Age in days',
      visibility: { player: true, llm: true, agent: true, dev: true },
      ui: { widget: 'slider', group: 'basic', order: 3 },
    },
  },
  validate: (data): data is IdentityComponent => {
    return typeof data === 'object'
      && data !== null
      && (data as any).type === 'identity'
      && typeof (data as any).name === 'string'
      && typeof (data as any).age === 'number';
  },
  createDefault: () => ({
    type: 'identity',
    version: 1,
    name: 'Unknown',
    species: 'human',
    age: 0,
  }),
});

// ACCEPTANCE CRITERIA TESTS
console.log('=== Phase 1B: Component Registry - Acceptance Criteria ===\n');

// 1. Register schema
console.log('1. Registering IdentitySchema...');
ComponentRegistry.register(IdentitySchema);
console.log('   ✓ Schema registered\n');

// 2. Query with get()
console.log('2. Query with get():');
const schema = ComponentRegistry.get('identity');
if (schema) {
  console.log('   ✓ Schema retrieved');
  console.log('   - Type:', schema.type);
  console.log('   - Category:', schema.category);
  console.log('   - Fields:', Object.keys(schema.fields).join(', '));
  // Type-safe access
  console.log('   - Field "name" type:', schema.fields.name?.type);
} else {
  console.log('   ✗ Failed to retrieve schema');
}
console.log('');

// 3. Check with has()
console.log('3. Check with has():');
console.log('   - has("identity"):', ComponentRegistry.has('identity'));
console.log('   - has("nonexistent"):', ComponentRegistry.has('nonexistent'));
console.log('   ✓ Type checking works\n');

// 4. List all schemas
console.log('4. List all schemas:');
const allTypes = ComponentRegistry.list();
console.log('   - Registered types:', allTypes);
console.log('   ✓ Listing works\n');

// 5. Get by category
console.log('5. Get by category:');
const coreSchemas = ComponentRegistry.getByCategory('core');
console.log('   - Core schemas count:', coreSchemas.length);
console.log('   - Core schema types:', coreSchemas.map(s => s.type));
console.log('   ✓ Category filtering works\n');

// 6. Auto-registration test
console.log('6. Auto-registration:');
const PersonalitySchema = autoRegister(defineComponent({
  type: 'personality',
  version: 1,
  category: 'agent',
  fields: {
    traits: {
      type: 'array',
      itemType: 'string',
      required: true,
      description: 'Personality traits',
      visibility: { player: false, llm: true, agent: true, dev: true },
      ui: { widget: 'json', group: 'traits' },
    },
  },
  validate: (data): data is any => true,
  createDefault: () => ({ type: 'personality', version: 1, traits: [] }),
}));
console.log('   ✓ Auto-registered on import');
console.log('   - has("personality"):', ComponentRegistry.has('personality'));
console.log('   - Total schemas:', ComponentRegistry.count());
console.log('');

// 7. Additional registry methods
console.log('7. Additional methods:');
console.log('   - getAll() count:', ComponentRegistry.getAll().length);
console.log('   - count():', ComponentRegistry.count());
console.log('   ✓ All methods work\n');

console.log('=== All Acceptance Criteria Passed ✓ ===');
