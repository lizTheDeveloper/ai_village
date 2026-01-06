/**
 * Test and demonstrate PromptRenderer and AgentPromptRenderer
 *
 * Shows how schema-driven prompts work alongside legacy prompts
 */

import { PromptRenderer, AgentPromptRenderer } from '../src/prompt/index.js';
import { ComponentRegistry } from '../src/registry/ComponentRegistry.js';
// Import schema to trigger auto-registration
import '../src/schemas/IdentitySchema.js';

// Mock entity with identity component
const mockEntity = {
  id: 'test-agent-123',
  components: new Map([
    ['identity', {
      type: 'identity' as const,
      version: 1,
      name: 'Alice',
      species: 'human' as const,
      age: 9125, // 25 years in days
    }],
    ['non_schema_component', {
      type: 'some_legacy_component',
      data: 'this should be ignored'
    }]
  ])
};

console.log('=== Phase 3: Prompt Integration Test ===\n');

// Verify IdentitySchema is registered
console.log('1. Schema Registry Check');
console.log(`   - IdentitySchema registered: ${ComponentRegistry.has('identity')}`);
console.log(`   - Total schemas: ${ComponentRegistry.count()}\n`);

// Test PromptRenderer (LLM visibility)
console.log('2. PromptRenderer (LLM Visibility)');
console.log('   Generates prompts with visibility.llm === true fields\n');

const llmPrompt = PromptRenderer.renderEntity(mockEntity);
console.log('Generated LLM Prompt:');
console.log('─────────────────────');
console.log(llmPrompt);
console.log('─────────────────────\n');

// Test AgentPromptRenderer (Agent visibility)
console.log('3. AgentPromptRenderer (Agent Self-Awareness)');
console.log('   Generates prompts with visibility.agent === true fields\n');

const agentPrompt = AgentPromptRenderer.renderEntity(mockEntity);
console.log('Generated Agent Prompt:');
console.log('─────────────────────');
console.log(agentPrompt);
console.log('─────────────────────\n');

// Test summarization
console.log('4. Summarization Test');
console.log('   Testing schema.llm.summarize function\n');

const identitySchema = ComponentRegistry.get('identity');
if (identitySchema?.llm?.summarize) {
  const identity = mockEntity.components.get('identity')!;
  const summary = identitySchema.llm.summarize(identity);
  console.log(`   Summary: ${summary}\n`);
}

// Test with non-schema'd component
console.log('5. Legacy Fallback Test');
console.log('   Non-schema\'d components are ignored by PromptRenderer');
console.log(`   - 'non_schema_component' has schema: ${ComponentRegistry.has('non_schema_component')}`);
console.log('   - Should NOT appear in prompt above ✓\n');

// Show what fields are LLM-visible
console.log('6. Field Visibility Breakdown');
if (identitySchema) {
  console.log('   IdentitySchema fields:');
  for (const [fieldName, fieldSchema] of Object.entries(identitySchema.fields)) {
    const llmVisible = fieldSchema.visibility.llm;
    const agentVisible = fieldSchema.visibility.agent;
    console.log(`   - ${fieldName}:`);
    console.log(`     - LLM:   ${llmVisible}`);
    console.log(`     - Agent: ${agentVisible}`);
  }
}

console.log('\n=== Test Complete ===');
console.log('\nNext Step: Integrate PromptRenderer into StructuredPromptBuilder');
console.log('  - Modify buildSystemPrompt to use PromptRenderer.renderEntity()');
console.log('  - Fall back to legacy extraction for non-schema\'d components');
console.log('  - Gradually migrate components to schemas');
