#!/usr/bin/env python3
"""
Fix type assertions in LiveEntityAPI.ts
Replaces 'as Type' with proper type guards
"""

import re

def read_file(filename):
    with open(filename, 'r') as f:
        return f.read()

def write_file(filename, content):
    with open(filename, 'w') as f:
        f.write(content)

def fix_assertions(content):
    """Fix all type assertions with proper type guards"""

    # Pattern 1: const X = entity.components.get('identity') as { name?: string } | undefined;
    # Replace with type guard

    replacements = [
        # Identity component
        (
            r"const (\w+) = entity\.components\.get\('identity'\) as \{ name\?: string \} \| undefined;",
            r"const \1Comp = entity.components.get('identity');\n    const \1 = \1Comp && isIdentityComponent(\1Comp) ? \1Comp : undefined;"
        ),
        # Position component
        (
            r"const (\w+) = entity\.components\.get\('position'\) as \{ x\?: number; y\?: number \} \| undefined;",
            r"const \1Comp = entity.components.get('position');\n    const \1 = \1Comp && isPositionComponent(\1Comp) ? \1Comp : undefined;"
        ),
        # Agent component (currentBehavior)
        (
            r"const (\w+) = entity\.components\.get\('agent'\) as \{ currentBehavior\?: string \} \| undefined;",
            r"const \1Comp = entity.components.get('agent');\n    const \1 = \1Comp && isAgentComponent(\1Comp) ? \1Comp : undefined;"
        ),
        # Needs component
        (
            r"const (\w+) = entity\.components\.get\('needs'\) as Record<string, unknown> \| undefined;",
            r"const \1Comp = entity.components.get('needs');\n    const \1 = \1Comp && isNeedsComponent(\1Comp) ? \1Comp : undefined;"
        ),
    ]

    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)

    return content

def main():
    filename = 'LiveEntityAPI.ts'
    content = read_file(filename)
    fixed_content = fix_assertions(content)
    write_file(filename, fixed_content)
    print("Fixed type assertions")

if __name__ == '__main__':
    main()
