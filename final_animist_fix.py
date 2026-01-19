#!/usr/bin/env python3
"""
Use ast-like approach to properly parse and replace paradigm definitions.
"""
import re

def replace_paradigm_multipass(content, const_name, json_key):
    """
    Multi-pass approach: Find start, track braces carefully, replace.
    """
    # Find the export statement
    pattern = f'export const {const_name}: MagicParadigm = '
    idx = content.find(pattern)

    if idx == -1:
        return content, False

    # Move to the opening brace
    start_def = idx + len(pattern)
    brace_idx = content.find('{', start_def)

    if brace_idx == -1 or brace_idx > start_def + 10:
        return content, False

    # Now count braces to find the end
    level = 0
    i = brace_idx
    in_string = None
    escape = False

    while i < len(content):
        ch = content[i]

        if escape:
            escape = False
            i += 1
            continue

        if ch == '\\':
            escape = True
            i += 1
            continue

        if ch in ['"', "'", '`']:
            if in_string is None:
                in_string = ch
            elif in_string == ch:
                in_string = None
        elif in_string is None:
            if ch == '{':
                level += 1
            elif ch == '}':
                level -= 1
                if level == 0:
                    # Found the end
                    end_idx = i + 1
                    # Skip semicolon if present
                    if end_idx < len(content) and content[end_idx] == ';':
                        end_idx += 1

                    # Build replacement
                    replacement = f'export const {const_name}: MagicParadigm = _loadedParadigms.{json_key};'

                    # Replace
                    new_content = content[:idx] + replacement + content[end_idx:]
                    return new_content, True

        i += 1

    return content, False

def main():
    file_path = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/AnimistParadigms.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    # Track changes
    changed = False

    # Replace each paradigm
    for const_name, json_key in [
        ('SYMPATHY_PARADIGM', 'sympathy'),
        ('DREAM_PARADIGM', 'dream'),
        ('DAEMON_PARADIGM', 'daemon'),
    ]:
        content, success = replace_paradigm_multipass(content, const_name, json_key)
        if success:
            print(f"✓ Replaced {const_name}")
            changed = True
        else:
            print(f"✗ Failed to replace {const_name}")

    if changed:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"\nUpdated {file_path}")
    else:
        print("\nNo changes made")

if __name__ == '__main__':
    main()
