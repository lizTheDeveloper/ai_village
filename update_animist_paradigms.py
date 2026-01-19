#!/usr/bin/env python3
"""
Update AnimistParadigms.ts to load paradigms from JSON instead of hardcoding them.
"""
import re

def main():
    file_path = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/AnimistParadigms.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    # Define the paradigms to replace (skip shinto, already done)
    paradigms = [
        ('SYMPATHY_PARADIGM', 'sympathy'),
        ('DREAM_PARADIGM', 'dream'),
        ('DAEMON_PARADIGM', 'daemon'),
    ]

    # Process in reverse order to avoid position shifts
    paradigms.reverse()

    for const_name, json_key in paradigms:
        # Find the paradigm definition
        pattern = rf'export const {const_name}: MagicParadigm = \{{'
        match = re.search(pattern, content)

        if not match:
            print(f"Could not find {const_name}")
            continue

        # Find the matching closing brace
        start = match.start()
        brace_start = match.end() - 1
        brace_count = 0
        in_string = False
        string_char = None
        i = brace_start

        while i < len(content):
            char = content[i]

            # Track strings
            if char in ['"', "'", '`'] and (i == 0 or content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None

            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        # Found the end
                        end = i + 1
                        # Check for semicolon
                        if end < len(content) and content[end] == ';':
                            end += 1

                        # Replace the entire definition with a simple reference
                        old_text = content[start:end]
                        new_text = f'export const {const_name}: MagicParadigm = _loadedParadigms.{json_key};'
                        content = content[:start] + new_text + content[end:]
                        print(f"✓ Replaced {const_name}")
                        break
            i += 1

    # Write the updated content
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"\nUpdated {file_path}")

if __name__ == '__main__':
    main()
