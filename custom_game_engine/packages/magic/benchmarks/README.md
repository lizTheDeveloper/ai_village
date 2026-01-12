# Magic Effect Generation Benchmark

This directory contains DeepEval benchmarks for evaluating LLM-generated magic effects.

## Overview

The benchmark tests an LLM's ability to generate safe, balanced, and creative `EffectExpression` bytecode for the magic system.

## Metrics

### 1. **EffectSafetyMetric** (threshold: 1.0)
Ensures generated effects respect security limits:
- ✅ Damage ≤ 10,000
- ✅ Spawns ≤ 50
- ✅ Chain depth ≤ 5
- ✅ All values are finite (no NaN, no Infinity)

**Scoring**: Binary (pass/fail). Any violation = 0.0 score.

### 2. **EffectCompletenessMetric** (threshold: 1.0)
Ensures generated effects have all required fields:
- ✅ `target` with valid `type`
- ✅ `operations` array (non-empty)
- ✅ `timing` with valid `type`
- ✅ Valid operation types (21 supported)

**Scoring**: Binary (pass/fail). Missing fields reduce score.

### 3. **EffectBalanceMetric** (threshold: 0.7)
Ensures generated effects are reasonably balanced:
- ⚖️ Damage scales appropriately (5-5,000 range)
- ⚖️ Healing scales appropriately
- ⚖️ Not too many operations (<10)
- ⚖️ Area effects have reasonable radius (<50)

**Scoring**: Graduated (0.0-1.0). Minor issues reduce score by 15% each.

### 4. **EffectCreativityMetric** (threshold: 0.6)
Ensures generated effects demonstrate creative use of the system:
- 🎨 Uses multiple operation types (not just damage)
- 🎨 Uses conditions when appropriate
- 🎨 Uses advanced operations (chain, conditional, repeat)
- 🎨 Uses creative timing (delayed, over_time, triggered)
- 🎨 Appropriate target selection for spell theme

**Scoring**: Points-based (0-5 creativity points / 5 max).

## Test Cases

The benchmark includes 7 test cases covering:

1. **Simple damage spell** - Basic fireball
2. **Area effect with status** - Frost Nova with slow
3. **Conditional healing** - Emergency heal (only if health < 30%)
4. **Chain effect** - Chain Lightning
5. **Over-time damage** - Poison Cloud
6. **Complex multi-operation** - Meteor Strike (teleport + damage + status)
7. **Safety violation** - World Destroyer (should fail safety check)

## Setup

### 1. Activate Python Virtual Environment

```bash
cd /Users/annhoward/src/ai_village/custom_game_engine
source .venv/bin/activate
```

### 2. Install Dependencies (if not already installed)

```bash
pip install deepeval
```

### 3. Set API Key

DeepEval requires an LLM for evaluation. Set your API key:

```bash
export OPENAI_API_KEY=your_key_here
# OR
export ANTHROPIC_API_KEY=your_key_here
```

## Running the Benchmark

### Run All Tests

```bash
cd packages/magic/benchmarks
deepeval test run effect_generation_benchmark.py
```

### Run Specific Test

```bash
deepeval test run effect_generation_benchmark.py::test_effect_safety
deepeval test run effect_generation_benchmark.py::test_effect_completeness
deepeval test run effect_generation_benchmark.py::test_effect_balance
deepeval test run effect_generation_benchmark.py::test_effect_creativity
deepeval test run effect_generation_benchmark.py::test_full_effect_evaluation
```

### Export Dataset

```bash
python effect_generation_benchmark.py
# Creates: effect_generation_dataset.json
```

## Expected Results

All test cases (except "World Destroyer") should:
- ✅ Pass EffectSafetyMetric (1.0)
- ✅ Pass EffectCompletenessMetric (1.0)
- ✅ Pass EffectBalanceMetric (≥0.7)
- ✅ Pass EffectCreativityMetric (≥0.6) for complex spells

The "World Destroyer" test case should:
- ❌ Fail EffectSafetyMetric (damage exceeds limit)

## Integration with Phase 33

This benchmark is the foundation for Phase 33 (Safe LLM Effect Generation):

1. **LLM generates effect** → JSON EffectExpression
2. **EffectInterpreter validates** → Parse and check syntax
3. **Benchmark evaluates** → Safety, completeness, balance, creativity
4. **Universe fork testing** → Test effect in isolated sandbox
5. **Blessing** → If all checks pass, effect is "blessed" and added to game

## Customization

### Adding New Test Cases

Edit `create_test_cases()` in `effect_generation_benchmark.py`:

```python
test_cases.append(LLMTestCase(
    input=EFFECT_GENERATION_PROMPT.format(
        spell_description="Your spell description here"
    ),
    actual_output=json.dumps({
        # Your expected EffectExpression JSON
    }),
    expected_output="Description of expected output"
))
```

### Adjusting Thresholds

Modify metric initialization:

```python
EffectSafetyMetric(threshold=1.0)     # Strict (must be perfect)
EffectBalanceMetric(threshold=0.7)    # Moderate (70% pass)
EffectCreativityMetric(threshold=0.6) # Lenient (60% pass)
```

### Creating New Metrics

Extend `BaseMetric`:

```python
class MyCustomMetric(BaseMetric):
    def __init__(self, threshold: float = 0.8):
        self.threshold = threshold
        self.score = 0.0

    @property
    def name(self) -> str:
        return "My Custom Metric"

    def measure(self, test_case: LLMTestCase) -> float:
        # Your evaluation logic
        self.score = 1.0
        self.success = self.score >= self.threshold
        self.reason = "Evaluation complete"
        return self.score

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success
```

## Troubleshooting

### "No module named 'deepeval'"

```bash
source .venv/bin/activate
pip install deepeval
```

### "API key not found"

```bash
export OPENAI_API_KEY=your_key
# OR
export ANTHROPIC_API_KEY=your_key
```

### Tests failing unexpectedly

Check that `actual_output` in test cases matches the current EffectExpression schema. The schema is defined in:
- `packages/magic/src/EffectExpression.ts`

## References

- **DeepEval Documentation**: https://docs.confident-ai.com/
- **EffectExpression Schema**: `packages/magic/src/EffectExpression.ts`
- **EffectInterpreter**: `packages/magic/src/EffectInterpreter.ts`
- **Magic System Guide**: `custom_game_engine/METASYSTEMS_GUIDE.md#magic-system`
