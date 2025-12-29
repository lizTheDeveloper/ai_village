# BUG-001: LLM Decision Parsing Failures

**Created:** 2025-12-28
**Status:** 🔴 OPEN
**Priority:** HIGH
**Detected In:** Session game_1766914249543_mtj3u7

---

## Summary

LLM decision responses are failing to parse at a 78% rate. Out of 32 LLM requests, only 7 produced valid decisions.

## Observed Behavior

```
LLM Requests:  32
LLM Decisions: 7
Failure Rate:  78%
```

The LLM is being called and returning responses (we see reasoning in the logs), but the responses aren't being converted into actionable decisions.

## Expected Behavior

LLM responses should successfully parse into decisions at 95%+ rate. Failed parses should emit error events for debugging.

## Reproduction

1. Start game with LLM agents enabled
2. Observe metrics dashboard after 2-3 minutes
3. Compare `llm:request` count to `llm:decision` count

## Files to Investigate

- `packages/llm/src/ResponseParser.ts` - Parse logic for LLM responses
- `packages/llm/src/LLMDecisionProcessor.ts` - Decision processing pipeline
- `packages/llm/src/StructuredPromptBuilder.ts` - Prompt format that LLM sees

## Potential Root Causes

1. Response format mismatch between LLM output and parser expectations
2. Missing or malformed action fields in LLM response
3. Parser throwing exceptions that are silently caught
4. LLM not following the expected response schema

## Acceptance Criteria

- [ ] LLM decision success rate > 90%
- [ ] Failed parses emit `llm:parse_error` event with details
- [ ] Add integration test for LLM response parsing

## Notes

The reasoning text appears correct ("village needs a workbench...") which suggests the LLM understands the prompt but the structured output format may not match parser expectations.
