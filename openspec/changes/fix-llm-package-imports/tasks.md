# Tasks: Fix LLM Package Imports

## Phase 1: Diagnose Package Issues

- [ ] Identify all export errors in `@ai-village/llm` package
- [ ] List all systems using LLM functionality
- [ ] Document current `any` type workarounds
- [ ] Check for circular dependencies

## Phase 2: Fix Package Exports

- [ ] Fix package.json exports configuration
- [ ] Update index.ts to properly export types
- [ ] Add explicit type exports for LLMProvider, LLMResponse, etc.
- [ ] Verify no circular dependencies exist

## Phase 3: Remove Workarounds

- [ ] Replace `private llmProvider?: any` with proper types
- [ ] Update all LLM imports to use package exports
- [ ] Remove commented-out import attempts
- [ ] Fix type errors in systems using LLM

## Phase 4: Re-enable Systems

- [ ] Uncomment SoulCreationSystem registration
- [ ] Uncomment LLMGenerationSystem registration
- [ ] Verify systems initialize correctly
- [ ] Test soul creation flow end-to-end

## Validation

- [ ] TypeScript compilation passes with no errors
- [ ] All LLM-dependent systems active
- [ ] Soul creation creates valid souls
- [ ] No runtime import errors
- [ ] Tests pass for all LLM systems
