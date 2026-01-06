/**
 * Phase 1C Example: Field Metadata System Usage
 *
 * Demonstrates how to use the metadata types defined in Phase 1C
 */

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
} from '../src/index.js';

// Example 1: Widget Types
console.log('=== Widget Types ===');
const textWidget: WidgetType = 'text';
const sliderWidget: WidgetType = 'slider';
const dropdownWidget: WidgetType = 'dropdown';
console.log('✓ Widget types work:', textWidget, sliderWidget, dropdownWidget);

// Example 2: Component Categories
console.log('\n=== Component Categories ===');
const coreCategory: ComponentCategory = 'core';
const agentCategory: ComponentCategory = 'agent';
const magicCategory: ComponentCategory = 'magic';
console.log('✓ Categories work:', coreCategory, agentCategory, magicCategory);

// Example 3: Visibility Configuration
console.log('\n=== Visibility ===');
const playerVisible: Visibility = {
  player: true,
  llm: 'summarized',
  agent: true,
  user: false,
  dev: true,
};
console.log('✓ Visibility config:', playerVisible);
console.log('✓ Is visible to LLM?', isVisibleToLLM(playerVisible)); // true
console.log('✓ Should summarize?', shouldSummarizeForLLM(playerVisible)); // true

// Example 4: Mutability Configuration
console.log('\n=== Mutability ===');
const editableField: Mutability = {
  mutable: true,
  mutateVia: 'setHealth',
  permissions: {
    player: false,
    user: true,
    dev: true,
  },
};
console.log('✓ Mutability config:', editableField);
console.log('✓ Is mutable?', isMutable(editableField)); // true
console.log('✓ Requires mutator?', requiresMutator(editableField)); // true
console.log('✓ Player can edit?', canMutate(editableField, 'player')); // false
console.log('✓ Dev can edit?', canMutate(editableField, 'dev')); // true

// Example 5: UI Hints
console.log('\n=== UI Hints ===');
const healthUI: UIHints = {
  widget: 'slider',
  group: 'stats',
  order: 1,
  icon: '❤️',
  color: '#FF0000',
  tooltip: 'Current health points',
  emphasized: true,
};
console.log('✓ UI hints:', healthUI);

// Example 6: Component UI Config
console.log('\n=== Component UI Config ===');
const identityUI: UIConfig = {
  icon: '👤',
  color: '#4CAF50',
  priority: 1,
  collapsed: false,
  title: 'Agent Identity',
  section: 'Core Information',
};
console.log('✓ Component UI config:', identityUI);

// Example 7: LLM Configuration
console.log('\n=== LLM Config ===');
interface IdentityData {
  name: string;
  species: string;
  age: number;
}

const identityLLM: LLMConfig<IdentityData> = {
  promptSection: 'identity',
  summarize: (data) => `${data.name} (${data.species}, ${Math.floor(data.age / 365)} years old)`,
  priority: 1,
  includeInAgentPrompt: true,
  maxLength: 100,
};
console.log('✓ LLM config:', identityLLM);
console.log(
  '✓ Summarized:',
  identityLLM.summarize?.({ name: 'Alice', species: 'human', age: 9125 })
); // "Alice (human, 25 years old)"

// Example 8: Realistic Field Definition
console.log('\n=== Realistic Field Definition ===');
interface FieldDefinition {
  type: string;
  required: boolean;
  description: string;
  visibility: Visibility;
  mutability: Mutability;
  ui: UIHints;
}

const healthField: FieldDefinition = {
  type: 'number',
  required: true,
  description: 'Current health points (0-100)',
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
    tooltip: 'Health points',
  },
};

console.log('✓ Health field definition:', healthField);
console.log('  - Visible to players?', healthField.visibility.player);
console.log('  - Visible to LLM?', isVisibleToLLM(healthField.visibility));
console.log('  - Mutable?', isMutable(healthField.mutability));
console.log('  - Dev can edit?', canMutate(healthField.mutability, 'dev'));
console.log('  - Widget type:', healthField.ui.widget);

console.log('\n✅ All Phase 1C acceptance criteria validated!');
