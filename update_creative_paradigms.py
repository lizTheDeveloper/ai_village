#!/usr/bin/env python3
"""
Update CreativeParadigms.ts to replace hardcoded paradigms with JSON loads.
"""

def main():
    file_path = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/CreativeParadigms.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    # The 15 unique Creative paradigms to replace
    paradigms = [
        ('DEBT_PARADIGM', 'debt'),
        ('BUREAUCRATIC_PARADIGM', 'bureaucratic'),
        ('LUCK_PARADIGM', 'luck'),
        ('THRESHOLD_PARADIGM', 'threshold'),
        ('BELIEF_PARADIGM', 'belief'),
        ('CONSUMPTION_PARADIGM', 'consumption'),
        ('SILENCE_PARADIGM', 'silence'),
        ('PARADOX_PARADIGM', 'paradox'),
        ('ECHO_PARADIGM', 'echo'),
        ('GAME_PARADIGM', 'game'),
        ('CRAFT_PARADIGM', 'craft'),
        ('COMMERCE_PARADIGM', 'commerce'),
        ('LUNAR_PARADIGM', 'lunar'),
        ('SEASONAL_PARADIGM', 'seasonal'),
        ('AGE_PARADIGM', 'age'),
    ]

    # Also need to delete the shared paradigm definitions that are now imported
    shared_paradigms = [
        'SYMPATHY_PARADIGM',
        'ALLOMANCY_PARADIGM',
        'DREAM_PARADIGM',
        'SONG_PARADIGM',
        'RUNE_PARADIGM',
        'SHINTO_PARADIGM',
    ]

    def find_and_replace(content, const_name, json_key):
        """Find and replace a paradigm definition."""
        import re

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

        # Count braces to find the end
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
                        end_idx = i + 1
                        # Skip semicolon if present
                        if end_idx < len(content) and content[end_idx] == ';':
                            end_idx += 1

                        # Build replacement
                        replacement = f'export const {const_name}: MagicParadigm = _loadedCreativeParadigms.{json_key};'

                        # Replace
                        new_content = content[:idx] + replacement + content[end_idx:]
                        return new_content, True

            i += 1

        return content, False

    # Delete shared paradigm definitions
    for const_name in shared_paradigms:
        content, success = find_and_replace(content, const_name, 'dummy')
        if success:
            # Actually, just delete it - we're importing it instead
            # Replace the replacement with nothing (it's already imported above)
            content = content.replace(f'export const {const_name}: MagicParadigm = _loadedCreativeParadigms.dummy;', '')
            print(f"✗ Deleted duplicate {const_name} (now imported)")

    # Replace unique paradigms
    for const_name, json_key in paradigms:
        content, success = find_and_replace(content, const_name, json_key)
        if success:
            print(f"✓ Replaced {const_name}")
        else:
            print(f"✗ Failed to replace {const_name}")

    # Write the file
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"\nUpdated {file_path}")

if __name__ == '__main__':
    main()
