#!/usr/bin/env python3
"""
Quick script to fix unused parameter warnings by adding underscore prefix.
"""

import re
import sys

# Files and their unused parameters that need fixing
fixes = [
    ("packages/core/src/magic/appliers/ControlEffectApplier.ts", 110, "activeEffect"),
    ("packages/core/src/magic/appliers/ControlEffectApplier.ts", 111, "effect"),
    ("packages/core/src/magic/appliers/ControlEffectApplier.ts", 112, "target"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 129, "activeEffect"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 130, "effect"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 131, "target"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 133, "context"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 144, "activeEffect"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 145, "effect"),
    ("packages/core/src/magic/appliers/DamageEffectApplier.ts", 146, "target"),
    ("packages/core/src/magic/appliers/HealingEffectApplier.ts", 182, "activeEffect"),
    ("packages/core/src/magic/appliers/HealingEffectApplier.ts", 183, "effect"),
    ("packages/core/src/magic/appliers/HealingEffectApplier.ts", 184, "target"),
    ("packages/core/src/magic/appliers/ProtectionEffectApplier.ts", 124, "activeEffect"),
    ("packages/core/src/magic/appliers/ProtectionEffectApplier.ts", 125, "effect"),
    ("packages/core/src/magic/appliers/ProtectionEffectApplier.ts", 152, "effect"),
    ("packages/core/src/magic/appliers/ProtectionEffectApplier.ts", 153, "target"),
    ("packages/core/src/magic/appliers/SummonEffectApplier.ts", 138, "effect"),
    ("packages/core/src/magic/appliers/SummonEffectApplier.ts", 139, "target"),
    ("packages/core/src/magic/appliers/SummonEffectApplier.ts", 141, "context"),
    ("packages/core/src/magic/appliers/SummonEffectApplier.ts", 167, "effect"),
    ("packages/core/src/magic/appliers/SummonEffectApplier.ts", 168, "target"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 124, "activeEffect"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 125, "effect"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 126, "target"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 128, "context"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 135, "activeEffect"),
    ("packages/core/src/magic/appliers/TransformEffectApplier.ts", 136, "effect"),
    ("packages/core/src/magic/costs/calculators/BloodCostCalculator.ts", 241, "caster"),
    ("packages/core/src/magic/costs/calculators/BreathCostCalculator.ts", 61, "currentBreaths"),
    ("packages/core/src/magic/costs/calculators/NameCostCalculator.ts", 31, "context"),
    ("packages/core/src/magic/costs/calculators/PactCostCalculator.ts", 31, "context"),
]

def fix_unused_param(filepath, line_num, param_name):
    """Add underscore prefix to an unused parameter."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    if line_num > len(lines):
        print(f"Warning: Line {line_num} doesn't exist in {filepath}")
        return False

    # Check if line contains the parameter
    line = lines[line_num - 1]

    # Replace the parameter name with underscore version
    # Match parameter declarations like "paramName:" or "paramName,"
    pattern = r'\b' + re.escape(param_name) + r'\b(?=\s*[:,])'
    if re.search(pattern, line):
        new_line = re.sub(pattern, f'_{param_name}', line)
        lines[line_num - 1] = new_line

        with open(filepath, 'w') as f:
            f.writelines(lines)
        print(f"Fixed {filepath}:{line_num} - {param_name} -> _{param_name}")
        return True
    else:
        print(f"Warning: Could not find '{param_name}' on line {line_num} in {filepath}")
        return False

# Group fixes by file
files = {}
for filepath, line_num, param_name in fixes:
    if filepath not in files:
        files[filepath] = []
    files[filepath].append((line_num, param_name))

# Process each file (reverse order to avoid line number shifts)
for filepath, params in files.items():
    print(f"\nProcessing {filepath}...")
    # Sort by line number descending so we don't mess up line numbers
    for line_num, param_name in sorted(params, key=lambda x: x[0], reverse=True):
        fix_unused_param(filepath, line_num, param_name)

print("\nDone!")
