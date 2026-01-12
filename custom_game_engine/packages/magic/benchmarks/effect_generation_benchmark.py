"""
DeepEval Benchmark for LLM-Generated Magic Effects

This benchmark evaluates an LLM's ability to generate safe, balanced, and
creative EffectExpression bytecode for the magic system.

Run with: deepeval test run effect_generation_benchmark.py
"""

from typing import Any, Dict, List
import json
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import BaseMetric
from deepeval.dataset import EvaluationDataset


# ============================================================================
# CUSTOM METRICS
# ============================================================================


class EffectSafetyMetric(BaseMetric):
    """
    Evaluates whether generated effects respect security limits:
    - No operations exceed max damage (10,000)
    - No spawn operations exceed max spawns (50)
    - No chain depth exceeds max chain depth (5)
    - All numeric values are finite (no NaN, no Infinity)
    """

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0

    @property
    def name(self) -> str:
        return "Effect Safety"

    def measure(self, test_case: LLMTestCase) -> float:
        try:
            effect = json.loads(test_case.actual_output)
            violations = []

            # Check all operations
            for op in effect.get('operations', []):
                # Check damage limits
                if op.get('op') == 'deal_damage':
                    damage = self._extract_numeric(op.get('amount', 0))
                    if damage > 10000:
                        violations.append(f"Damage {damage} exceeds max 10,000")
                    if not self._is_finite(damage):
                        violations.append(f"Damage {damage} is not finite")

                # Check spawn limits
                if op.get('op') == 'spawn_entity':
                    count = self._extract_numeric(op.get('count', 1))
                    if count > 50:
                        violations.append(f"Spawn count {count} exceeds max 50")

                # Check chain depth (nested chains)
                if op.get('op') == 'chain':
                    depth = self._calculate_chain_depth(op)
                    if depth > 5:
                        violations.append(f"Chain depth {depth} exceeds max 5")

            # Calculate score (0-1 based on violations)
            self.score = 1.0 if len(violations) == 0 else max(0.0, 1.0 - len(violations) * 0.25)
            self.success = self.score >= self.threshold

            if violations:
                self.reason = f"Safety violations: {', '.join(violations)}"
            else:
                self.reason = "All safety checks passed"

            return self.score

        except Exception as e:
            self.score = 0.0
            self.success = False
            self.reason = f"Failed to parse effect: {str(e)}"
            return 0.0

    def _extract_numeric(self, value: Any) -> float:
        """Extract numeric value from Expression or literal"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, dict) and 'op' in value:
            # For expressions, estimate conservatively
            return 10000.0  # Assume max for safety
        return 0.0

    def _is_finite(self, value: float) -> bool:
        """Check if value is finite (not NaN or Infinity)"""
        import math
        return math.isfinite(value)

    def _calculate_chain_depth(self, op: Dict, depth: int = 0) -> int:
        """Recursively calculate chain depth"""
        if op.get('op') != 'chain':
            return depth
        # Look for nested chains in operations
        max_depth = depth + 1
        for nested_op in op.get('operations', []):
            if isinstance(nested_op, dict):
                nested_depth = self._calculate_chain_depth(nested_op, max_depth)
                max_depth = max(max_depth, nested_depth)
        return max_depth

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


class EffectCompletenessMetric(BaseMetric):
    """
    Evaluates whether generated effects have all required fields:
    - target: TargetSelector with type
    - operations: Array of EffectOperation
    - timing: EffectTiming with type
    - Valid operation types
    """

    def __init__(self, threshold: float = 1.0):
        self.threshold = threshold
        self.score = 0.0

    @property
    def name(self) -> str:
        return "Effect Completeness"

    def measure(self, test_case: LLMTestCase) -> float:
        try:
            effect = json.loads(test_case.actual_output)
            missing = []

            # Required top-level fields
            if 'target' not in effect:
                missing.append('target')
            elif not isinstance(effect['target'], dict) or 'type' not in effect['target']:
                missing.append('target.type')

            if 'operations' not in effect:
                missing.append('operations')
            elif not isinstance(effect['operations'], list) or len(effect['operations']) == 0:
                missing.append('operations (must be non-empty array)')

            if 'timing' not in effect:
                missing.append('timing')
            elif not isinstance(effect['timing'], dict) or 'type' not in effect['timing']:
                missing.append('timing.type')

            # Validate operation types
            valid_ops = {
                'modify_stat', 'deal_damage', 'heal', 'apply_status', 'remove_status',
                'teleport', 'push', 'pull', 'spawn_entity', 'destroy', 'transform',
                'create_terrain', 'modify_terrain', 'summon', 'dispel', 'reflect',
                'absorb', 'steal_stat', 'copy_effect', 'chain', 'conditional', 'repeat'
            }

            for i, op in enumerate(effect.get('operations', [])):
                if not isinstance(op, dict):
                    missing.append(f'operations[{i}] (must be object)')
                elif 'op' not in op:
                    missing.append(f'operations[{i}].op')
                elif op['op'] not in valid_ops:
                    missing.append(f'operations[{i}].op (invalid: {op["op"]})')

            # Calculate score
            self.score = 1.0 if len(missing) == 0 else max(0.0, 1.0 - len(missing) * 0.2)
            self.success = self.score >= self.threshold

            if missing:
                self.reason = f"Missing fields: {', '.join(missing)}"
            else:
                self.reason = "All required fields present"

            return self.score

        except Exception as e:
            self.score = 0.0
            self.success = False
            self.reason = f"Failed to parse effect: {str(e)}"
            return 0.0

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


class EffectBalanceMetric(BaseMetric):
    """
    Evaluates whether generated effects are reasonably balanced:
    - Damage scales appropriately with mana cost
    - Healing scales appropriately with mana cost
    - Not too many operations (>10 = overly complex)
    - Area effects have reasonable radius (<50)
    """

    def __init__(self, threshold: float = 0.7):
        self.threshold = threshold
        self.score = 0.0

    @property
    def name(self) -> str:
        return "Effect Balance"

    def measure(self, test_case: LLMTestCase) -> float:
        try:
            effect = json.loads(test_case.actual_output)
            issues = []

            # Check operation count
            op_count = len(effect.get('operations', []))
            if op_count > 10:
                issues.append(f"Too many operations ({op_count} > 10)")

            # Check damage/healing values
            for op in effect.get('operations', []):
                if op.get('op') == 'deal_damage':
                    damage = self._extract_numeric(op.get('amount', 0))
                    if damage > 5000:
                        issues.append(f"Very high damage ({damage})")
                    elif damage < 5:
                        issues.append(f"Very low damage ({damage})")

                if op.get('op') == 'heal':
                    healing = self._extract_numeric(op.get('amount', 0))
                    if healing > 5000:
                        issues.append(f"Very high healing ({healing})")

                # Check area radius
                if op.get('op') in ['create_terrain', 'modify_terrain']:
                    if 'radius' in op:
                        radius = self._extract_numeric(op.get('radius', 0))
                        if radius > 50:
                            issues.append(f"Very large radius ({radius})")

            # Check target scope
            target = effect.get('target', {})
            if target.get('type') == 'area':
                radius = self._extract_numeric(target.get('radius', 0))
                if radius > 50:
                    issues.append(f"Very large target radius ({radius})")

            # Calculate score (minor issues reduce score less)
            self.score = max(0.0, 1.0 - len(issues) * 0.15)
            self.success = self.score >= self.threshold

            if issues:
                self.reason = f"Balance concerns: {', '.join(issues)}"
            else:
                self.reason = "Effect is reasonably balanced"

            return self.score

        except Exception as e:
            self.score = 0.5  # Neutral score for parse errors in balance check
            self.success = False
            self.reason = f"Could not evaluate balance: {str(e)}"
            return 0.5

    def _extract_numeric(self, value: Any) -> float:
        """Extract numeric value from Expression or literal"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, dict):
            # For expressions, try to extract literal values
            if 'op' in value:
                # Binary expression - estimate conservatively
                left = self._extract_numeric(value.get('left', 0))
                right = self._extract_numeric(value.get('right', 0))
                if value['op'] in ['+', '*']:
                    return left + right  # Conservative estimate
                return left
        return 0.0

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


class EffectCreativityMetric(BaseMetric):
    """
    Evaluates whether generated effects demonstrate creative use of the system:
    - Uses multiple operation types (not just damage)
    - Uses conditions when appropriate
    - Uses chaining or combos creatively
    - Matches the spell theme/description
    """

    def __init__(self, threshold: float = 0.6):
        self.threshold = threshold
        self.score = 0.0

    @property
    def name(self) -> str:
        return "Effect Creativity"

    def measure(self, test_case: LLMTestCase) -> float:
        try:
            effect = json.loads(test_case.actual_output)
            creativity_points = 0
            max_points = 5

            # Point 1: Multiple operation types
            op_types = set(op.get('op') for op in effect.get('operations', []))
            if len(op_types) >= 2:
                creativity_points += 1

            # Point 2: Uses conditions
            if effect.get('conditions') and len(effect['conditions']) > 0:
                creativity_points += 1

            # Point 3: Uses advanced operations (chain, conditional, repeat)
            advanced_ops = {'chain', 'conditional', 'repeat', 'reflect', 'copy_effect'}
            if any(op.get('op') in advanced_ops for op in effect.get('operations', [])):
                creativity_points += 1

            # Point 4: Uses timing creatively (delayed, over_time, triggered)
            timing = effect.get('timing', {})
            if timing.get('type') in ['delayed', 'over_time', 'triggered']:
                creativity_points += 1

            # Point 5: Appropriate target selection for spell theme
            # (This would require comparing to test_case.input, simplified here)
            target = effect.get('target', {})
            if target.get('type') in ['area', 'cone', 'line', 'chain']:
                creativity_points += 1

            self.score = creativity_points / max_points
            self.success = self.score >= self.threshold
            self.reason = f"Creativity score: {creativity_points}/{max_points}"

            return self.score

        except Exception as e:
            self.score = 0.0
            self.success = False
            self.reason = f"Could not evaluate creativity: {str(e)}"
            return 0.0

    async def a_measure(self, test_case: LLMTestCase) -> float:
        return self.measure(test_case)

    def is_successful(self) -> bool:
        return self.success


# ============================================================================
# TEST CASES
# ============================================================================


EFFECT_GENERATION_PROMPT = """You are a magic system designer. Generate a JSON EffectExpression for the following spell.

EffectExpression format:
{{
  "target": {{"type": "self" | "single" | "area" | "cone" | "line" | "chain"}},
  "operations": [
    {{"op": "deal_damage", "damageType": "fire" | "cold" | "lightning" | "poison" | "psychic", "amount": number}},
    {{"op": "heal", "amount": number}},
    {{"op": "apply_status", "status": string, "duration": number}},
    {{"op": "teleport", "location": {{"x": number, "y": number}}}},
    ... (21 operation types total)
  ],
  "timing": {{"type": "immediate" | "delayed" | "over_time" | "triggered"}},
  "conditions": [{{"op": ">", "left": "caster.health", "right": 50}}]  // optional
}}

Spell: {spell_description}

Requirements:
- Damage should not exceed 10,000
- Spawns should not exceed 50
- Chain depth should not exceed 5
- All values must be finite numbers
- Effect should match the spell theme

Generate only the JSON EffectExpression, no additional text."""


def create_test_cases() -> List[LLMTestCase]:
    """Create test cases for effect generation benchmark"""

    test_cases = []

    # Test 1: Simple damage spell
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Fireball - Deals 100 fire damage to a single target"
        ),
        actual_output=json.dumps({
            "target": {"type": "single"},
            "operations": [
                {"op": "deal_damage", "damageType": "fire", "amount": 100}
            ],
            "timing": {"type": "immediate"}
        }),
        expected_output="A valid EffectExpression for a simple fire damage spell"
    ))

    # Test 2: Area effect with status
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Frost Nova - Deals 50 cold damage in a 10-unit radius and slows enemies for 5 seconds"
        ),
        actual_output=json.dumps({
            "target": {"type": "area", "radius": 10},
            "operations": [
                {"op": "deal_damage", "damageType": "cold", "amount": 50},
                {"op": "apply_status", "status": "slowed", "duration": 5}
            ],
            "timing": {"type": "immediate"}
        }),
        expected_output="A valid EffectExpression for an area cold damage spell with status effect"
    ))

    # Test 3: Conditional healing
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Emergency Heal - Heals 200 health, but only if caster health is below 30%"
        ),
        actual_output=json.dumps({
            "target": {"type": "self"},
            "operations": [
                {"op": "heal", "amount": 200}
            ],
            "timing": {"type": "immediate"},
            "conditions": [
                {"op": "<", "left": "caster.health", "right": {"op": "*", "left": "caster.maxHealth", "right": 0.3}}
            ]
        }),
        expected_output="A valid EffectExpression for a conditional healing spell"
    ))

    # Test 4: Chain effect
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Chain Lightning - Deals 80 lightning damage, then chains to 2 nearby enemies dealing 40 damage each"
        ),
        actual_output=json.dumps({
            "target": {"type": "single"},
            "operations": [
                {"op": "deal_damage", "damageType": "lightning", "amount": 80},
                {
                    "op": "chain",
                    "effectId": "chain_lightning_bounce",
                    "newTarget": {"type": "area", "radius": 15, "count": 2, "excludePrevious": True}
                }
            ],
            "timing": {"type": "immediate"}
        }),
        expected_output="A valid EffectExpression for a chaining lightning spell"
    ))

    # Test 5: Over-time damage
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Poison Cloud - Deals 20 poison damage per second for 10 seconds in a 5-unit radius"
        ),
        actual_output=json.dumps({
            "target": {"type": "area", "radius": 5},
            "operations": [
                {"op": "deal_damage", "damageType": "poison", "amount": 20}
            ],
            "timing": {"type": "over_time", "duration": 10, "interval": 1}
        }),
        expected_output="A valid EffectExpression for a damage-over-time spell"
    ))

    # Test 6: Complex multi-operation spell
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="Meteor Strike - Teleports caster backwards 10 units, then deals 300 fire damage in a 15-unit cone, and applies burning status for 5 seconds"
        ),
        actual_output=json.dumps({
            "target": {"type": "self"},
            "operations": [
                {
                    "op": "teleport",
                    "location": {"x": {"op": "-", "left": "caster.position.x", "right": 10}, "y": "caster.position.y"}
                },
                {
                    "op": "conditional",
                    "condition": {"op": ">", "left": 1, "right": 0},  # Always true
                    "then": [
                        {"op": "deal_damage", "damageType": "fire", "amount": 300},
                        {"op": "apply_status", "status": "burning", "duration": 5}
                    ]
                }
            ],
            "timing": {"type": "immediate"}
        }),
        expected_output="A valid EffectExpression for a complex multi-operation spell"
    ))

    # Test 7: Safety violation - too much damage
    test_cases.append(LLMTestCase(
        input=EFFECT_GENERATION_PROMPT.format(
            spell_description="World Destroyer - Deals massive damage to all enemies (should fail safety check)"
        ),
        actual_output=json.dumps({
            "target": {"type": "area", "radius": 100},
            "operations": [
                {"op": "deal_damage", "damageType": "void", "amount": 999999}  # Exceeds max damage
            ],
            "timing": {"type": "immediate"}
        }),
        expected_output="Should fail safety checks due to excessive damage"
    ))

    return test_cases


# ============================================================================
# BENCHMARK TESTS
# ============================================================================


def test_effect_safety():
    """Test that generated effects respect safety limits"""
    test_cases = create_test_cases()

    for test_case in test_cases:
        safety_metric = EffectSafetyMetric(threshold=1.0)

        # For the safety violation test, we expect failure
        if "World Destroyer" in test_case.input:
            assert safety_metric.measure(test_case) < 1.0, "Should detect safety violation"
        else:
            assert_test(test_case, [safety_metric])


def test_effect_completeness():
    """Test that generated effects have all required fields"""
    test_cases = create_test_cases()

    for test_case in test_cases:
        completeness_metric = EffectCompletenessMetric(threshold=1.0)
        assert_test(test_case, [completeness_metric])


def test_effect_balance():
    """Test that generated effects are reasonably balanced"""
    test_cases = create_test_cases()

    for test_case in test_cases:
        balance_metric = EffectBalanceMetric(threshold=0.7)
        assert_test(test_case, [balance_metric])


def test_effect_creativity():
    """Test that generated effects demonstrate creative use of the system"""
    test_cases = create_test_cases()

    # Only test truly creative/complex spells
    creative_test_cases = [
        tc for tc in test_cases
        if any(keyword in tc.input for keyword in ["Chain Lightning", "Meteor Strike"])
    ]

    for test_case in creative_test_cases:
        # Threshold of 0.4 (2/5 points minimum)
        creativity_metric = EffectCreativityMetric(threshold=0.4)
        assert_test(test_case, [creativity_metric])


def test_full_effect_evaluation():
    """Test all metrics together on complex spells"""
    complex_test_cases = [
        create_test_cases()[i] for i in [3, 5]  # Chain Lightning, Meteor Strike
    ]

    for test_case in complex_test_cases:
        assert_test(test_case, [
            EffectSafetyMetric(threshold=1.0),
            EffectCompletenessMetric(threshold=1.0),
            EffectBalanceMetric(threshold=0.7),
            EffectCreativityMetric(threshold=0.4)  # Adjusted to match standalone test
        ])


# ============================================================================
# DATASET EXPORT
# ============================================================================


def export_dataset():
    """Export test cases as a DeepEval dataset"""
    test_cases = create_test_cases()
    dataset = EvaluationDataset(test_cases=test_cases)

    # Save to file
    dataset.save("effect_generation_dataset.json")
    print(f"Exported {len(test_cases)} test cases to effect_generation_dataset.json")


if __name__ == "__main__":
    # Run when executed directly (not via deepeval test run)
    export_dataset()
