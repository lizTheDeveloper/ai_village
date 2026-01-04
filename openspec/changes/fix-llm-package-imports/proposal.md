# Proposal: Fix LLM Package Imports

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 1 system
**Priority:** CRITICAL
**Source:** Code Audit 2026-01-03

## Problem Statement

The `@ai-village/llm` package has import/export errors preventing critical systems from functioning:

- **SoulCreationSystem** - Disabled (core soul creation cannot function)
- **LLMGenerationSystem** - Disabled
- **Placeholder LLM providers** - Using `any` type workarounds

**Impact:** Soul creation system is completely non-functional. This is a fundamental game mechanic.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:17-26`

## Proposed Solution

1. Fix package exports in `@ai-village/llm`
2. Remove `any` type workarounds
3. Re-enable SoulCreationSystem and LLMGenerationSystem
4. Verify LLMProvider imports work correctly

## Requirements

### Requirement: LLM Package Exports

The LLM package SHALL export all necessary types and classes for external consumption.

#### Scenario: Import LLMProvider

- WHEN a system imports `LLMProvider` from `@ai-village/llm`
- THEN the import SHALL succeed without type errors

#### Scenario: Soul Creation System Enabled

- WHEN the game starts
- THEN SoulCreationSystem SHALL be registered and active
- AND LLMGenerationSystem SHALL be registered and active

### Requirement: Type Safety

Systems SHALL NOT use `any` type workarounds for LLM providers.

#### Scenario: Type-Safe LLM Integration

- WHEN a system references an LLM provider
- THEN it SHALL use the proper LLMProvider type
- AND TypeScript compilation SHALL succeed

## Dependencies

None - this is a foundational fix blocking other work

## Risks

- LLM package may have circular dependency issues
- May need to restructure package exports

## Alternatives Considered

1. **Keep systems disabled** - Unacceptable, core functionality lost
2. **Use `any` types permanently** - Defeats purpose of TypeScript
3. **Inline LLM logic** - Creates duplication and maintenance burden

## Definition of Done

- [ ] LLMProvider imports work in all systems
- [ ] No `any` type workarounds remain
- [ ] SoulCreationSystem enabled and functional
- [ ] LLMGenerationSystem enabled and functional
- [ ] TypeScript compilation passes
- [ ] All LLM-dependent tests pass
