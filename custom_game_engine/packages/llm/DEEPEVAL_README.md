# DeepEval Test Suites for LLM Layers

This directory contains comprehensive evaluation suites for testing the Talker and Executor LLM layers.

## Overview

The game uses a three-layer LLM architecture:
- **Autonomic Layer**: Handles survival needs (sleep, warmth, hunger) - not tested here as it's rule-based
- **Talker Layer**: Generates agent speech and social interactions
- **Executor Layer**: Makes high-level decisions about what actions to take

These DeepEval suites test whether the LLM outputs from Talker and Executor layers match expected behavior patterns.

## Test Files

### TalkerDeepEval.test.ts

Tests the Talker layer's ability to:
- **Personality-Based Speech**: Extroverts speak frequently/verbosely, introverts speak rarely/concisely
- **Contextual Appropriateness**: Speak in conversations, stay silent when alone
- **Speech Quality**: Don't announce agent name, maintain conversation context
- **Response Format**: Use tool calling, not JSON format
- **Edge Cases**: Handle missing components, long conversation histories

**Key Test Categories:**
```typescript
describe('Personality-Based Speech Patterns')
describe('Contextual Speech Appropriateness')
describe('Speech Content Quality')
describe('Edge Cases and Error Handling')
describe('Response Format')
```

### ExecutorDeepEval.test.ts

Tests the Executor layer's ability to:
- **Skill-Gated Actions**: Only suggest actions the agent has skills for (Progressive Skill Reveal)
- **Resource Awareness**: Only suggest gathering/building when resources are visible
- **Task Queue Management**: Show current queue, suggest sleep_until_queue_complete
- **Goal-Driven Behavior**: Align actions with personal/group goals
- **Social Actions**: Suggest help/follow when agents nearby, combat only with skill
- **Response Format**: Use tool calling, not JSON format
- **Action Validation**: All suggested actions exist in ACTION_DEFINITIONS

**Key Test Categories:**
```typescript
describe('Skill-Gated Action Selection')
describe('Resource-Aware Actions')
describe('Task Queue Management')
describe('Goal-Driven Behavior')
describe('Social Actions')
describe('Response Format Validation')
describe('Action Parsing')
```

## Running the Tests

### Run All DeepEval Tests
```bash
cd custom_game_engine/packages/llm
npm test -- TalkerDeepEval ExecutorDeepEval
```

### Run Only Talker Tests
```bash
npm test -- TalkerDeepEval
```

### Run Only Executor Tests
```bash
npm test -- ExecutorDeepEval
```

### Run Specific Test Category
```bash
npm test -- ExecutorDeepEval -t "Skill-Gated"
```

### Watch Mode (Re-run on Changes)
```bash
npm test -- --watch TalkerDeepEval
```

## Understanding Test Results

### ✅ Passing Tests
All assertions pass - the LLM prompts are correctly configured for expected behavior.

### ❌ Failing Tests

**Common Failure Reasons:**

1. **Missing Actions in Prompt**
   ```
   expect(prompt).toContain('cast_spell')
   ```
   - Cause: Action not included in available actions list
   - Fix: Check `ExecutorPromptBuilder.getAvailableExecutorActions()`

2. **Wrong Response Format**
   ```
   expect(prompt).not.toContain('RESPOND IN JSON')
   ```
   - Cause: Prompt includes JSON format instructions
   - Fix: Remove JSON format instructions from prompt builders

3. **Skill Gating Broken**
   ```
   expect(prompt).not.toContain('build - Construct a building')
   ```
   - Cause: Action suggested despite agent lacking required skill
   - Fix: Check skill filtering in `ExecutorPromptBuilder.buildPrompt()`

4. **Personality Not Affecting Behavior**
   ```
   // Expected introvert prompt to contain 'silent'
   expect(prompt).toMatch(/silent|quiet|observe/i)
   ```
   - Cause: Personality traits not used in prompt generation
   - Fix: Check `TalkerPromptBuilder.buildPrompt()` personality integration

## Test Data Patterns

### Mock Agent Structure
```typescript
const mockAgent = {
  id: 'test-agent-123',
  components: new Map([
    ['identity', { name: 'TestAgent', species: 'human' }],
    ['personality', {
      extraversion: 0.5,    // 0-1 scale
      agreeableness: 0.5,
      conscientiousness: 0.5,
      neuroticism: 0.3,
      openness: 0.7
    }],
    ['skills', {
      levels: {
        gathering: 1.0,
        farming: 1.0,
        building: 1.0,
        combat: 0.5,
        magic: 0.0
      }
    }],
    ['agent', {
      behavior: 'idle',
      currentAction: null,
      behaviorQueue: []
    }]
  ])
};
```

### Context Structure
```typescript
const context = {
  nearbyAgents: [
    { id: 'other-1', components: new Map([...]) }
  ],
  nearbyResources: [
    { type: 'stone', position: { x: 105, y: 105 }, distance: 5 }
  ],
  visibleBuildings: [],
  currentGoals: ['Become master builder'],
  recentMemories: [
    { type: 'conversation', content: 'Friend: Hello!', timestamp: Date.now() - 1000 }
  ]
};
```

## Adding New Tests

### Testing New Talker Behavior
```typescript
it('should handle new personality trait', async () => {
  mockAgent.components.set('personality', {
    extraversion: 0.5,
    newTrait: 0.8  // Add new trait
  });

  const prompt = promptBuilder.buildPrompt(mockAgent, mockWorld, context);

  // Assert expected behavior
  expect(prompt).toContain('expected_keyword');
});
```

### Testing New Executor Action
```typescript
it('should suggest new_action when conditions met', async () => {
  mockAgent.components.set('skills', {
    levels: {
      new_skill: 2.0  // Agent has required skill
    }
  });

  const prompt = promptBuilder.buildPrompt(mockAgent, mockWorld, context);

  // Should include new action
  expect(prompt).toContain('new_action');
});
```

## Integration with CI/CD

These tests should run on every commit to ensure:
- Prompt builders don't regress
- New actions are properly gated by skills
- Response formats stay consistent
- Personality traits continue affecting behavior

### GitHub Actions Example
```yaml
- name: Run DeepEval Tests
  run: |
    cd custom_game_engine/packages/llm
    npm test -- TalkerDeepEval ExecutorDeepEval --coverage
```

## Debugging Failed Tests

### 1. Inspect Generated Prompt
```typescript
it('should do something', async () => {
  const prompt = promptBuilder.buildPrompt(mockAgent, mockWorld, context);
  console.log('Generated prompt:', prompt);  // Add this
  expect(prompt).toContain('expected');
});
```

### 2. Check ACTION_DEFINITIONS
```typescript
import { ACTION_DEFINITIONS, VALID_BEHAVIORS } from '../ActionDefinitions.js';

console.log('Available actions:', Array.from(VALID_BEHAVIORS));
console.log('Action details:', ACTION_DEFINITIONS);
```

### 3. Verify Skill Requirements
```typescript
const actionsWithSkills = ACTION_DEFINITIONS.filter(a => a.skillRequired);
console.log('Skill-gated actions:', actionsWithSkills);
```

### 4. Test Prompt Builder Directly
```typescript
import { ExecutorPromptBuilder } from '../ExecutorPromptBuilder.js';

const builder = new ExecutorPromptBuilder();
const result = builder.buildPrompt(agent, world, context);
console.log(result);
```

## Common Assertions

### Talker Tests
```typescript
// Personality affects frequency
expect(prompt).toMatch(/speak|silent/i);

// No name announcement
expect(prompt).toMatch(/DO NOT start.*with.*name/i);

// Conversation context
expect(prompt).toContain('recent conversation');

// No JSON format
expect(prompt).not.toContain('RESPOND IN JSON');
```

### Executor Tests
```typescript
// Skill gating
expect(prompt).toContain('action_name');
expect(prompt).not.toContain('unavailable_action');

// Resource awareness
expect(prompt).toContain('visible_resource');

// Task queue
expect(prompt).toContain('Task Queue');

// Goal alignment
expect(prompt).toContain(currentGoal);

// Valid actions only
expect(VALID_BEHAVIORS.has(actionName)).toBe(true);
```

## Performance Benchmarks

These tests should run quickly:
- **TalkerDeepEval**: ~500ms for all tests
- **ExecutorDeepEval**: ~800ms for all tests
- **Total**: ~1.3 seconds

If tests are slower, check for:
- Large mock data structures
- Synchronous LLM calls (use mocks instead)
- Inefficient prompt building

## Maintenance

### When to Update Tests

**Add tests when:**
- Adding new actions to ACTION_DEFINITIONS
- Adding new personality traits
- Changing prompt format
- Adding new skill requirements
- Modifying task queue behavior

**Update tests when:**
- Action descriptions change
- Skill requirements change
- Prompt builder logic changes
- Response format changes

### Versioning

Tag test suites with game version:
```typescript
describe('ExecutorDeepEval v1.2.0 - Action Selection', () => {
  // Tests for version 1.2.0
});
```

## Related Documentation

- **ActionDefinitions.ts**: Source of truth for valid actions
- **TalkerPromptBuilder.ts**: Generates Talker layer prompts
- **ExecutorPromptBuilder.ts**: Generates Executor layer prompts
- **AgentAction.ts**: Action parsing and validation
- **LLMScheduler.ts**: Layer selection and cooldown logic

## Examples from Test Output

### Successful Talker Test
```
✓ extroverts should speak more frequently and verbosely (12ms)
✓ introverts should speak less frequently and concisely (8ms)
✓ high agreeableness should produce supportive speech (10ms)
✓ should not start speech with agent name (5ms)
```

### Successful Executor Test
```
✓ should only suggest actions the agent has skills for (15ms)
✓ should suggest advanced actions when agent has high skills (11ms)
✓ should require target parameter for gather actions (9ms)
✓ all suggested actions should be in ACTION_DEFINITIONS (7ms)
```

### Failed Test Example
```
✗ should suggest cast_spell when agent has magic skill (18ms)
  expect(prompt).toContain('cast_spell')

  Received: "Available actions:\n- pick\n- gather\n- build\n..."

  Missing: 'cast_spell'
```

This indicates that `cast_spell` is not being added to available actions when the agent has magic skill, pointing to a bug in `ExecutorPromptBuilder.getAvailableExecutorActions()`.

## Questions?

For questions about these tests, see:
- **CLAUDE.md**: Project development guidelines
- **packages/llm/README.md**: LLM system architecture
- **packages/core/README.md**: ECS and component system
