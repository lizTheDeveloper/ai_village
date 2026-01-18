#!/usr/bin/env python3
"""
Fix 'as any' type casts in magic paradigm files by adding missing required fields.
"""

import re
import sys

def fix_sources(content: str) -> str:
    """Fix sources arrays - add id and name fields."""
    pattern = r"sources: \[\s*\{([^}]+)\}\s*\] as any\[\],"

    def replace_source(match):
        inner = match.group(1)
        # Check if id and name are already present
        if 'id:' in inner and 'name:' in inner:
            # Just remove the 'as any[]'
            return f"sources: [{{{inner}}}],"

        # Extract paradigm context to generate appropriate id/name
        # This is a heuristic - we'll use generic names
        return f"sources: [{{{inner}, id: 'source', name: 'Power Source'}}],"

    return re.sub(pattern, replace_source, content, flags=re.DOTALL)

def fix_costs(content: str) -> str:
    """Fix costs arrays - these have simplified schema, need to stay as Partial or create proper type."""
    # For now, just remove 'as any[]' since costs use a simplified schema
    return re.sub(r"(costs: \[[^\]]+\]) as any\[\],", r"\1,", content, flags=re.DOTALL)

def fix_channels(content: str) -> str:
    """Fix channels arrays - add missing fields."""
    pattern = r"channels: \[\s*\{([^}]+)\}\s*\] as any\[\],"

    def replace_channel(match):
        inner = match.group(1)
        lines = [line.strip() for line in inner.split(',') if line.strip()]

        # Check for missing fields
        has_type = any('name:' in line or 'type:' in line for line in lines)
        has_requirement = any('requirement:' in line for line in lines)
        has_canBeMastered = any('canBeMastered:' in line for line in lines)
        has_blockEffect = any('blockEffect:' in line for line in lines)

        # Build complete object
        result_lines = []
        for line in lines:
            result_lines.append(line)

        if not has_canBeMastered:
            result_lines.append("canBeMastered: true")
        if not has_blockEffect:
            result_lines.append("blockEffect: 'prevents_casting' as const")

        inner_fixed = ', '.join(result_lines)
        return f"channels: [{{{inner_fixed}}}],"

    return re.sub(pattern, replace_channel, content, flags=re.DOTALL)

def fix_laws(content: str) -> str:
    """Fix laws arrays - add missing fields."""
    pattern = r"laws: \[\s*\{([^}]+)\}\s*\] as any\[\],"

    def replace_law(match):
        inner = match.group(1)
        lines = [line.strip() for line in inner.split(',') if line.strip()]

        # Check for missing fields
        has_id = any('id:' in line for line in lines)
        has_name = any('name:' in line for line in lines)
        has_strictness = any('strictness:' in line or 'strength:' in line for line in lines)
        has_canBeCircumvented = any('canBeCircumvented:' in line or 'circumventable:' in line for line in lines)

        result_lines = []
        type_val = None

        for line in lines:
            if 'type:' in line:
                # Extract type value for generating id/name
                match_type = re.search(r"type:\s*['\"]([^'\"]+)['\"]", line)
                if match_type:
                    type_val = match_type.group(1)

            # Rename 'strength' to 'strictness' and 'circumventable' to 'canBeCircumvented'
            line = line.replace('strength:', 'strictness:')
            line = line.replace('circumventable:', 'canBeCircumvented:')
            result_lines.append(line)

        if not has_id and type_val:
            result_lines.insert(0, f"id: '{type_val}_law'")
        elif not has_id:
            result_lines.insert(0, "id: 'law'")

        if not has_name and type_val:
            name = type_val.replace('_', ' ').title()
            result_lines.insert(1, f"name: '{name} Law'")
        elif not has_name:
            result_lines.insert(1, "name: 'Magical Law'")

        inner_fixed = ', '.join(result_lines)
        return f"laws: [{{{inner_fixed}}}],"

    return re.sub(pattern, replace_law, content, flags=re.DOTALL)

def fix_acquisitions(content: str) -> str:
    """Fix acquisitionMethods arrays - add missing fields."""
    pattern = r"acquisitionMethods: \[\s*\{([^}]+)\}\s*\] as any\[\],"

    def replace_acq(match):
        inner = match.group(1)
        lines = [line.strip() for line in inner.split(',') if line.strip()]

        # Check for missing required fields
        has_voluntary = any('voluntary:' in line for line in lines)
        has_grantsAccess = any('grantsAccess:' in line for line in lines)
        has_startingProficiency = any('startingProficiency:' in line for line in lines)

        result_lines = list(lines)

        if not has_voluntary:
            result_lines.append("voluntary: true")
        if not has_grantsAccess:
            result_lines.append("grantsAccess: ['source']")
        if not has_startingProficiency:
            result_lines.append("startingProficiency: 5")

        inner_fixed = ', '.join(result_lines)
        return f"acquisitionMethods: [{{{inner_fixed}}}],"

    return re.sub(pattern, replace_acq, content, flags=re.DOTALL)

def fix_simple_arrays(content: str) -> str:
    """Fix simple array casts for risks, forbidden/resonant combinations."""
    # These are simpler - just remove 'as any[]'
    content = re.sub(r"(risks: \[[^\]]+\]) as any\[\],", r"\1,", content, flags=re.DOTALL)
    content = re.sub(r"(forbiddenCombinations: \[[^\]]+\]) as any\[\],", r"\1,", content, flags=re.DOTALL)
    content = re.sub(r"(resonantCombinations: \[[^\]]+\]) as any\[\],", r"\1,", content, flags=re.DOTALL)
    return content

def fix_foreign_magic_effect(content: str) -> str:
    """Fix foreignMagicEffect casts."""
    return re.sub(r"foreignMagicEffect: (['\"][^'\"]+['\"]|[a-z_]+) as any", r"foreignMagicEffect: \1", content)

def main():
    file_path = sys.argv[1] if len(sys.argv) > 1 else "custom_game_engine/packages/core/src/magic/CreativeParadigms.ts"

    with open(file_path, 'r') as f:
        content = f.read()

    print(f"Fixing {file_path}...")

    # Apply all fixes
    content = fix_sources(content)
    content = fix_costs(content)
    content = fix_channels(content)
    content = fix_laws(content)
    content = fix_acquisitions(content)
    content = fix_simple_arrays(content)
    content = fix_foreign_magic_effect(content)

    with open(file_path, 'w') as f:
        f.write(content)

    print("Done!")

if __name__ == '__main__':
    main()
