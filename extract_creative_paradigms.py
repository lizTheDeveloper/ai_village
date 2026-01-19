#!/usr/bin/env python3
"""
Extract unique Creative paradigms from CreativeParadigms.ts to creative-paradigms.json

The 6 paradigms that are in both Animist and Creative will be handled by re-exports.
This extracts the 15 unique Creative paradigms only.
"""
import json
import re

def extract_paradigm_from_ts(content: str, paradigm_id: str) -> dict | None:
    """Extract a single paradigm object from TypeScript source."""
    # Find the paradigm constant declaration
    pattern = rf'{paradigm_id.upper()}_PARADIGM:\s*MagicParadigm\s*=\s*\{{'
    match = re.search(pattern, content)

    if not match:
        return None

    # Find the matching closing brace
    start = match.end() - 1  # Point to the opening {
    brace_count = 0
    in_string = False
    string_char = None
    i = start

    while i < len(content):
        char = content[i]

        # Track strings (single, double, or backtick)
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
                    # Found the end - extract the object text
                    obj_text = content[start:i+1]
                    # Remove semicolon if present
                    if i+1 < len(content) and content[i+1] == ';':
                        i += 1

                    # Parse the object
                    return parse_paradigm_object(obj_text, paradigm_id)
        i += 1

    return None

def parse_paradigm_object(obj_text: str, paradigm_id: str) -> dict:
    """Parse a TypeScript object literal into a Python dict."""
    result = {'id': paradigm_id}

    # Extract simple string fields
    for field in ['name', 'description', 'lore']:
        pattern = rf"{field}:\s*['\"`](.+?)['\"`](?:,|\s*}})"
        match = re.search(pattern, obj_text, re.DOTALL)
        if match:
            value = match.group(1)
            # Unescape quotes and newlines
            value = value.replace("\\'", "'").replace('\\"', '"')
            value = value.replace('\\n', '\n')
            # Collapse multiline strings
            value = ' '.join(line.strip() for line in value.split('\n'))
            result[field] = value

    # Extract universeIds array
    universe_match = re.search(r"universeIds:\s*\[([^\]]+)\]", obj_text)
    if universe_match:
        ids = re.findall(r"['\"]([^'\"]+)['\"]", universe_match.group(1))
        result['universeIds'] = ids

    # Extract arrays (sources, costs, channels, laws, risks, acquisitionMethods, etc.)
    result['sources'] = parse_array_of_objects(obj_text, 'sources')
    result['costs'] = parse_array_of_objects(obj_text, 'costs')
    result['channels'] = parse_array_of_objects(obj_text, 'channels')
    result['laws'] = parse_array_of_objects(obj_text, 'laws')
    result['risks'] = parse_array_of_objects(obj_text, 'risks')
    result['acquisitionMethods'] = parse_array_of_objects(obj_text, 'acquisitionMethods')
    result['forbiddenCombinations'] = parse_array_of_objects(obj_text, 'forbiddenCombinations')
    result['resonantCombinations'] = parse_array_of_objects(obj_text, 'resonantCombinations')

    # Extract simple arrays
    result['availableTechniques'] = parse_string_array(obj_text, 'availableTechniques')
    result['availableForms'] = parse_string_array(obj_text, 'availableForms')
    result['compatibleParadigms'] = parse_string_array(obj_text, 'compatibleParadigms')
    result['conflictingParadigms'] = parse_string_array(obj_text, 'conflictingParadigms')

    # Extract simple fields
    for field in ['powerScaling', 'foreignMagicPolicy']:
        pattern = rf"{field}:\s*['\"]([^'\"]+)['\"]"
        match = re.search(pattern, obj_text)
        if match:
            result[field] = match.group(1)

    # Extract numeric fields
    for field in ['powerCeiling', 'groupCastingMultiplier']:
        pattern = rf"{field}:\s*(\d+\.?\d*)"
        match = re.search(pattern, obj_text)
        if match:
            val = match.group(1)
            result[field] = float(val) if '.' in val else int(val)

    # Extract boolean fields
    for field in ['allowsGroupCasting', 'allowsEnchantment', 'persistsAfterDeath', 'allowsTeaching', 'allowsScrolls']:
        pattern = rf"{field}:\s*(true|false)"
        match = re.search(pattern, obj_text)
        if match:
            result[field] = match.group(1) == 'true'

    return result

def parse_array_of_objects(text: str, field_name: str) -> list:
    """Parse an array of objects like sources, costs, etc."""
    pattern = rf"{field_name}:\s*\["
    match = re.search(pattern, text)
    if not match:
        return []

    # Find the closing ]
    start = match.end()
    bracket_depth = 1
    in_string = False
    string_char = None
    i = start

    while i < len(text) and bracket_depth > 0:
        char = text[i]

        if char in ['"', "'", '`'] and (i == 0 or text[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if char == '[':
                bracket_depth += 1
            elif char == ']':
                bracket_depth -= 1
        i += 1

    if bracket_depth != 0:
        return []

    array_text = text[start:i-1]

    # Parse individual objects
    objects = []
    obj_start = None
    brace_depth = 0
    in_string = False
    string_char = None

    for i, char in enumerate(array_text):
        if char in ['"', "'", '`'] and (i == 0 or array_text[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if char == '{':
                if brace_depth == 0:
                    obj_start = i
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0 and obj_start is not None:
                    obj_text = array_text[obj_start:i+1]
                    obj = parse_simple_object(obj_text)
                    if obj:
                        objects.append(obj)
                    obj_start = None

    return objects

def parse_simple_object(obj_text: str) -> dict:
    """Parse a simple TypeScript object into a dict."""
    result = {}

    # Match key-value pairs
    # Handle string values
    for match in re.finditer(r"(\w+):\s*['\"]([^'\"]+)['\"]", obj_text):
        key, value = match.groups()
        # Unescape
        value = value.replace("\\'", "'").replace('\\"', '"')
        result[key] = value

    # Handle numeric values
    for match in re.finditer(r"(\w+):\s*(\d+\.?\d*)", obj_text):
        key, value = match.groups()
        if key not in result:  # Don't override string values
            result[key] = float(value) if '.' in value else int(value)

    # Handle boolean values
    for match in re.finditer(r"(\w+):\s*(true|false)", obj_text):
        key, value = match.groups()
        if key not in result:
            result[key] = value == 'true'

    # Handle array values
    for match in re.finditer(r"(\w+):\s*\[([^\]]+)\]", obj_text):
        key, array_content = match.groups()
        if key not in result:
            # Extract string elements
            elements = re.findall(r"['\"]([^'\"]+)['\"]", array_content)
            if elements:
                result[key] = elements

    return result

def parse_string_array(text: str, field_name: str) -> list:
    """Parse a simple string array."""
    pattern = rf"{field_name}:\s*\[([^\]]+)\]"
    match = re.search(pattern, text)
    if not match:
        return []

    array_content = match.group(1)
    return re.findall(r"['\"]([^'\"]+)['\"]", array_content)

def main():
    # Read the TypeScript file
    ts_file = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/CreativeParadigms.ts'
    with open(ts_file, 'r') as f:
        content = f.read()

    # The 15 unique Creative paradigms (not in Animist)
    unique_paradigms = [
        'debt', 'bureaucratic', 'luck', 'threshold', 'belief',
        'consumption', 'silence', 'paradox', 'echo', 'game',
        'craft', 'commerce', 'lunar', 'seasonal', 'age'
    ]

    result = {}

    for paradigm_id in unique_paradigms:
        print(f"Extracting {paradigm_id}...")
        paradigm = extract_paradigm_from_ts(content, paradigm_id)
        if paradigm:
            result[paradigm_id] = paradigm
            print(f"  ✓ Extracted {paradigm['name']}")
        else:
            print(f"  ✗ Failed to extract {paradigm_id}")

    # Read existing creative-paradigms.json and merge
    json_file = '/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/data/creative-paradigms.json'
    try:
        with open(json_file, 'r') as f:
            existing = json.load(f)
    except:
        existing = {}

    # Merge (new data overwrites existing)
    existing.update(result)

    # Write the updated JSON
    with open(json_file, 'w') as f:
        json.dump(existing, f, indent=2)

    print(f"\nWrote {len(result)} paradigms to {json_file}")
    print(f"Total paradigms in file: {len(existing)}")
    print("\nExtracted paradigms:")
    for key in sorted(result.keys()):
        print(f"  - {key}: {result[key].get('name', 'Unknown')}")

if __name__ == '__main__':
    main()
