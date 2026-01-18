#!/usr/bin/env python3
import re

def fix_emit_calls(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern matches the malformed closing with }  followed by });
    # Replace it with just });
    pattern = r'(\s+)\}\s*\n\s*\}\);'
    replacement = r'\1});'

    content = re.sub(pattern, replacement, content)

    with open(file_path, 'w') as f:
        f.write(content)

    print(f"Fixed {file_path}")

if __name__ == '__main__':
    fix_emit_calls('packages/botany/src/systems/PlantSystem.ts')
