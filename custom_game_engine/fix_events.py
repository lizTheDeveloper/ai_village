#!/usr/bin/env python3
import re
import sys

def fix_events(content):
    """Fix malformed this.events.emit calls that are missing opening brace."""

    # Pattern to match malformed emit calls like:
    # this.events.emit(
    #   'type:name',
    #
    #   {
    #     data...
    #   }
    # );

    # Replace pattern: this.events.emit(\n  'type:name',\n  \n  {
    # With: this.events.emit({\n  type: 'type:name',\n  source: 'SOURCE',\n  data: {

    # First pass: fix the ones with string first parameter
    pattern1 = r"this\.events\.emit\(\s*\n\s*'([^']+)',\s*\n\s*\n\s*{"
    replacement1 = r"this.events.emit({\n  type: '\1',\n  source: this.id,\n  data: {"
    content = re.sub(pattern1, replacement1, content)

    # Second pass: fix closing braces - change }\n); to }\n});
    pattern2 = r"}\s*\n\s*\);"
    replacement2 = r"}\n  });"
    content = re.sub(pattern2, replacement2, content)

    return content

if __name__ == '__main__':
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'packages/botany/src/systems/PlantSystem.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    fixed_content = fix_events(content)

    with open(file_path, 'w') as f:
        f.write(fixed_content)

    print(f"Fixed events in {file_path}")
