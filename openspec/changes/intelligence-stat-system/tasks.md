# Tasks: intelligence-stat-system

## Overview
Implement intelligence as a concrete, three-dimensional stat for AI agents that controls their model quality, thinking depth, and decision frequency.

**Estimated Effort:** 10-15 hours | **Complexity:** 2-3 systems

## Phase 1: Intelligence Stat Structure

- [ ] Create Intelligence interface with three components
  - [ ] modelQuality: number (1-10) - determines which Claude model to use
  - [ ] thinkingDepth: number (1-10) - determines max_tokens budget
  - [ ] thinkingFrequency: number (1-10) - determines decision interval
- [ ] Add intelligence field to agent component
- [ ] Create utility functions for intelligence
  - [ ] Default intelligence generation
  - [ ] Intelligence validation

## Phase 2: Model Quality Mapping (1-10 scale)

- [ ] Implement model selection based on modelQuality
  - [ ] 1-3 (Low): Use Claude Haiku
  - [ ] 4-7 (Medium): Use Claude Sonnet
  - [ ] 8-10 (High): Use Claude Opus
- [ ] Update LLM provider to accept model quality parameter
- [ ] Add fallback logic for unavailable models

## Phase 3: Thinking Depth Mapping (1-10 scale)

- [ ] Implement token budget based on thinkingDepth
  - [ ] 1-2: 200-500 tokens (quick reactions, minimal planning)
  - [ ] 3-4: 500-1000 tokens (basic reasoning)
  - [ ] 5-6: 1000-2000 tokens (considers multiple options)
  - [ ] 7-8: 2000-4000 tokens (explores alternatives, short-term planning)
  - [ ] 9-10: 4000-8000 tokens (deep analysis, long-term planning)
- [ ] Update prompt builder to respect token budget
- [ ] Add token usage tracking per intelligence level

## Phase 4: Thinking Frequency Mapping (1-10 scale)

- [ ] Implement decision interval based on thinkingFrequency
  - [ ] 1-2: 60-120 seconds (very slow, misses many events)
  - [ ] 3-4: 30-60 seconds (slow, background awareness)
  - [ ] 5-6: 15-30 seconds (moderate, notices important events)
  - [ ] 7-8: 5-15 seconds (alert, responsive)
  - [ ] 9-10: 2-5 seconds (hyper-aware, constantly re-evaluating)
- [ ] Update agent scheduler to respect thinking frequency
- [ ] Implement event-priority thinking (urgent events bypass interval)

## Phase 5: Genetic Intelligence Inheritance

- [ ] Implement inheritIntelligence function
  - [ ] Average parents' intelligence stats
  - [ ] Apply mutation with variance
- [ ] Implement inheritStat for individual dimensions
  - [ ] Calculate average from both parents
  - [ ] Apply epigenetic bias from life quality
  - [ ] Calculate mutation variance based on stress/nutrition
- [ ] Create LifeQuality interface
  - [ ] nutrition: 0-10 (well-fed vs starving)
  - [ ] stress: 0-10 (peaceful vs traumatized)
  - [ ] education: 0-10 (learned vs ignorant)
  - [ ] happiness: 0-10 (fulfilled vs miserable)
  - [ ] healthCare: 0-10 (treated vs neglected)
- [ ] Implement calculateEpigeneticBias
  - [ ] Average parents' life quality
  - [ ] Convert to bias: 0-5 quality = negative, 5-10 = positive
  - [ ] Range: -2.0 to +2.0 bias
- [ ] Implement calculateMutationVariance
  - [ ] Higher stress = larger variance
  - [ ] Lower nutrition = larger variance
  - [ ] Range: 1.0 to 4.0 variance
- [ ] Implement generateBaseIntelligence for first-gen agents
  - [ ] Random 1-10 for each dimension
  - [ ] Option for biased distribution (weighted toward middle)

## Phase 6: Agent Configuration Integration

- [ ] Set intelligence when agent is spawned/created
  - [ ] Use inheritance if parents exist
  - [ ] Use generation if first-gen
- [ ] Store intelligence in agent state (immutable)
- [ ] Connect intelligence to behavior system
  - [ ] Model selection uses modelQuality
  - [ ] Token budget uses thinkingDepth
  - [ ] Decision interval uses thinkingFrequency

## Phase 7: UI Display

- [ ] Add intelligence to agent inspector panel
  - [ ] Overall intelligence level (derived average)
  - [ ] Breakdown of three dimensions with bars/numbers
  - [ ] Current model in use (Haiku/Sonnet/Opus)
  - [ ] Current thinking interval (seconds)
- [ ] Add cost estimate display
  - [ ] Estimated API cost per hour for this agent
  - [ ] Breakdown by model and token usage
- [ ] Add population intelligence summary
  - [ ] Distribution histogram
  - [ ] Average intelligence stats

## Phase 8: Cost Considerations

- [ ] Implement cost tracking per agent
  - [ ] Track API calls and tokens
  - [ ] Estimate cost based on model pricing
- [ ] Add warnings for high-cost agents
  - [ ] Flag agents with intelligence 8-10
  - [ ] Show cost impact in UI
- [ ] Consider batch/queue optimizations
  - [ ] Queue requests for high-frequency agents
  - [ ] Prevent latency issues with many high-intelligence agents

## Testing

### Unit Tests
- [ ] Intelligence stat validation (1-10 range)
- [ ] Model selection logic (quality -> model mapping)
- [ ] Token budget calculation
- [ ] Frequency interval calculation
- [ ] Inheritance calculations
- [ ] Epigenetic bias calculation
- [ ] Mutation variance calculation

### Integration Tests
- [ ] Create agents with different intelligence levels
- [ ] Verify correct model is used for each modelQuality tier
- [ ] Confirm thinking depth affects response quality
- [ ] Validate thinking frequency timing is accurate
- [ ] Test inheritance from two parents
- [ ] Verify API cost tracking

### Manual Tests
- [ ] Test edge cases (intelligence = 1, intelligence = 10)
- [ ] Compare behavior of low vs high intelligence agents
- [ ] Measure API cost for different intelligence profiles
- [ ] Test runtime modification of intelligence stats
- [ ] Verify UI displays correctly

### Performance Tests
- [ ] Multiple high-frequency agents don't cause latency
- [ ] Cost tracking doesn't impact performance
- [ ] Inheritance calculation is fast (< 1ms)
