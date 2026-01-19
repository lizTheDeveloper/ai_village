#!/usr/bin/env python3
"""
Manually fix the three remaining paradigm definitions.
"""

def find_and_replace(content, const_name, json_key):
    """Find and replace a single paradigm definition."""
    import re

    # Find the start
    pattern = rf'(export const {const_name}: MagicParadigm = )\{{'
    match = re.search(pattern, content)

    if not match:
        print(f"Could not find {const_name}")
        return content

    prefix = match.group(1)
    start_pos = match.start()
    brace_start = match.end() - 1

    # Find matching closing brace
    brace_count = 1
    i = brace_start + 1
    in_string = False
    string_char = None

    while i < len(content) and brace_count > 0:
        ch = content[i]

        # Handle strings
        if ch in ['"', "'", '`'] and (i == 0 or content[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = ch
            elif ch == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if ch == '{':
                brace_count += 1
            elif ch == '}':
                brace_count -= 1

        i += 1

    if brace_count != 0:
        print(f"Could not find closing brace for {const_name}")
        return content

    end_pos = i
    # Skip semicolon if present
    if end_pos < len(content) and content[end_pos] == ';':
        end_pos += 1

    # Replace
    old_def = content[start_pos:end_pos]
    new_def = f'{prefix}_loadedParadigms.{json_key};'

    new_content = content[:start_pos] + new_def + content[end_pos:]
    print(f"✓ Replaced {const_name} ({len(old_def)} -> {len(new_def)} chars)")
    return new_content

def main():
    file_path = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/AnimistParadigms.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    # Replace in order
    content = find_and_replace(content, 'SYMPATHY_PARADIGM', 'sympathy')
    content = find_and_replace(content, 'DREAM_PARADIGM', 'dream')
    content = find_and_replace(content, 'DAEMON_PARADIGM', 'daemon')

    # Write back
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"\nUpdated {file_path}")

if __name__ == '__main__':
    main()
