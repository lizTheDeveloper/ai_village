#!/usr/bin/env python3
"""
Extract research sets from TypeScript file to JSON format.
"""
import re
import json
from typing import List, Dict, Any

def parse_typescript_object(content: str, start_idx: int) -> tuple[Dict[str, Any], int]:
    """
    Parse a TypeScript object literal starting at start_idx.
    Returns (parsed_dict, end_idx).
    """
    result = {}
    i = start_idx
    in_string = False
    string_char = None
    current_key = None
    bracket_depth = 0
    square_depth = 0

    while i < len(content):
        char = content[i]

        # Track string boundaries
        if char in ['"', "'", '`'] and (i == 0 or content[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if char == '{':
                bracket_depth += 1
            elif char == '}':
                bracket_depth -= 1
                if bracket_depth == 0:
                    return result, i
            elif char == '[':
                square_depth += 1
            elif char == ']':
                square_depth -= 1

        i += 1

    return result, i

def extract_research_sets(ts_content: str) -> List[Dict[str, Any]]:
    """Extract all research set definitions from TypeScript content."""
    research_sets = []

    # Find all research set definitions
    pattern = r'export const (\w+_SET): ResearchSet = \{'
    matches = list(re.finditer(pattern, ts_content))

    for match in matches:
        const_name = match.group(1)
        start_pos = match.start()

        # Find the matching closing brace
        brace_count = 0
        in_string = False
        string_char = None
        pos = ts_content.index('{', start_pos)

        i = pos
        while i < len(ts_content):
            char = ts_content[i]

            # Track strings
            if char in ['"', "'", '`'] and (i == 0 or ts_content[i-1] != '\\'):
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
                        obj_text = ts_content[pos:i+1]
                        parsed = parse_research_set(obj_text)
                        if parsed:
                            research_sets.append(parsed)
                        break
            i += 1

    return research_sets

def parse_research_set(obj_text: str) -> Dict[str, Any]:
    """Parse a single research set object literal."""
    result = {}

    # Extract setId
    match = re.search(r"setId:\s*['\"]([^'\"]+)['\"]", obj_text)
    if match:
        result['setId'] = match.group(1)

    # Extract name
    match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", obj_text)
    if match:
        result['name'] = match.group(1)

    # Extract description
    match = re.search(r"description:\s*['\"]([^'\"]+)['\"]", obj_text)
    if match:
        result['description'] = match.group(1)

    # Extract field
    match = re.search(r"field:\s*['\"]([^'\"]+)['\"]", obj_text)
    if match:
        result['field'] = match.group(1)

    # Extract allPapers array
    match = re.search(r"allPapers:\s*\[(.*?)\]", obj_text, re.DOTALL)
    if match:
        papers_text = match.group(1)
        papers = re.findall(r"['\"]([^'\"]+)['\"]", papers_text)
        result['allPapers'] = papers

    # Extract unlocks array
    unlocks_match = re.search(r"unlocks:\s*\[(.*)\](?:\s*\};\s*$)", obj_text, re.DOTALL)
    if unlocks_match:
        unlocks_text = unlocks_match.group(1)
        result['unlocks'] = parse_unlocks(unlocks_text)

    return result

def parse_unlocks(unlocks_text: str) -> List[Dict[str, Any]]:
    """Parse the unlocks array."""
    unlocks = []

    # Split by individual unlock objects (they're separated by },\n    {)
    # First, find all { that start an unlock object
    unlock_objects = []
    brace_depth = 0
    current_obj_start = None
    in_string = False
    string_char = None

    i = 0
    while i < len(unlocks_text):
        char = unlocks_text[i]

        # Track strings
        if char in ['"', "'", '`'] and (i == 0 or unlocks_text[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None

        if not in_string:
            if char == '{':
                if brace_depth == 0:
                    current_obj_start = i
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0 and current_obj_start is not None:
                    unlock_objects.append(unlocks_text[current_obj_start:i+1])
                    current_obj_start = None
        i += 1

    for obj_text in unlock_objects:
        unlock = {}

        # Extract technologyId
        match = re.search(r"technologyId:\s*['\"]([^'\"]+)['\"]", obj_text)
        if match:
            unlock['technologyId'] = match.group(1)

        # Extract papersRequired
        match = re.search(r"papersRequired:\s*(\d+)", obj_text)
        if match:
            unlock['papersRequired'] = int(match.group(1))

        # Extract mandatoryPapers (optional)
        match = re.search(r"mandatoryPapers:\s*\[(.*?)\]", obj_text, re.DOTALL)
        if match:
            papers_text = match.group(1)
            papers = re.findall(r"['\"]([^'\"]+)['\"]", papers_text)
            if papers:
                unlock['mandatoryPapers'] = papers

        # Extract grants array
        grants_match = re.search(r"grants:\s*\[(.*?)\]", obj_text, re.DOTALL)
        if grants_match:
            grants_text = grants_match.group(1)
            unlock['grants'] = parse_grants(grants_text)

        unlocks.append(unlock)

    return unlocks

def parse_grants(grants_text: str) -> List[Dict[str, str]]:
    """Parse the grants array."""
    grants = []

    # Find all grant objects
    grant_pattern = r'\{\s*type:\s*[\'"](\w+)[\'"],\s*(\w+):\s*[\'"]([^\'\"]+)[\'"]\s*\}'

    for match in re.finditer(grant_pattern, grants_text):
        grant_type = match.group(1)
        id_key = match.group(2)
        id_value = match.group(3)
        grants.append({
            'type': grant_type,
            id_key: id_value
        })

    return grants

def main():
    # Read the TypeScript file
    ts_file = '/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/research-papers/research-sets.ts'

    with open(ts_file, 'r') as f:
        content = f.read()

    # Extract research sets
    research_sets = extract_research_sets(content)

    print(f"Extracted {len(research_sets)} research sets")

    # Write to JSON
    output_file = '/Users/annhoward/src/ai_village/custom_game_engine/packages/world/data/research-sets.json'

    with open(output_file, 'w') as f:
        json.dump(research_sets, f, indent=2)

    print(f"Wrote research sets to {output_file}")

    # Print first few for verification
    if research_sets:
        print("\nFirst research set:")
        print(json.dumps(research_sets[0], indent=2))

if __name__ == '__main__':
    main()
