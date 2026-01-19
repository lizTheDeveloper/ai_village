#!/usr/bin/env python3
"""
Extract building definitions from TypeScript to JSON.

This script parses building definition TypeScript files and extracts
the VoxelBuildingDefinition objects into JSON format.
"""

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List


def parse_typescript_value(value_str: str) -> Any:
    """Parse a TypeScript value to Python equivalent."""
    value_str = value_str.strip()

    # Handle booleans
    if value_str == 'true':
        return True
    if value_str == 'false':
        return False

    # Handle null/undefined
    if value_str in ('null', 'undefined'):
        return None

    # Handle numbers
    try:
        if '.' in value_str:
            return float(value_str)
        return int(value_str)
    except ValueError:
        pass

    # Handle strings (remove quotes)
    if value_str.startswith("'") or value_str.startswith('"'):
        return value_str[1:-1]

    # Return as-is for complex types (arrays, objects)
    return value_str


def extract_building_from_ts(ts_content: str, start_pos: int) -> tuple[Dict[str, Any], int]:
    """
    Extract a single building definition starting at start_pos.
    Returns (building_dict, end_pos).
    """
    building = {}

    # Find the opening brace
    brace_start = ts_content.find('{', start_pos)
    if brace_start == -1:
        return None, -1

    # Track nested braces to find the matching closing brace
    brace_count = 1
    pos = brace_start + 1
    field_content = []

    while pos < len(ts_content) and brace_count > 0:
        char = ts_content[pos]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                break
        pos += 1

    # Extract content between braces
    content = ts_content[brace_start + 1:pos]

    # Parse fields using regex
    # Match field: value patterns, handling nested structures
    current_field = None
    current_value = []
    in_array = False
    in_object = False
    array_depth = 0
    object_depth = 0

    lines = content.split('\n')
    for line in lines:
        line = line.strip()

        # Skip comments
        if line.startswith('//') or line.startswith('/*') or line.startswith('*'):
            continue

        # Remove inline comments
        comment_pos = line.find('//')
        if comment_pos >= 0:
            line = line[:comment_pos].strip()

        if not line or line == ',':
            continue

        # Check if this is a field declaration
        field_match = re.match(r'(\w+):\s*(.*)', line)
        if field_match and object_depth == 0 and array_depth == 0:
            # Save previous field if exists
            if current_field:
                value_str = ' '.join(current_value).rstrip(',').strip()
                building[current_field] = parse_field_value(value_str)

            current_field = field_match.group(1)
            current_value = [field_match.group(2)]

            # Check if value is complete
            if current_value[0].rstrip(',').endswith('}') or current_value[0].rstrip(',').endswith(']'):
                # Value might be complete
                pass
            continue

        # Append to current value
        if current_field:
            current_value.append(line)

    # Save last field
    if current_field:
        value_str = ' '.join(current_value).rstrip(',').strip()
        building[current_field] = parse_field_value(value_str)

    return building, pos + 1


def parse_field_value(value_str: str) -> Any:
    """Parse a field value, handling arrays and objects."""
    value_str = value_str.rstrip(',').strip()

    # Handle arrays
    if value_str.startswith('['):
        return parse_array(value_str)

    # Handle objects
    if value_str.startswith('{'):
        return parse_object(value_str)

    # Handle simple values
    return parse_typescript_value(value_str)


def parse_array(array_str: str) -> List[Any]:
    """Parse a TypeScript array."""
    array_str = array_str.strip()
    if not array_str.startswith('[') or not array_str.endswith(']'):
        return []

    content = array_str[1:-1].strip()
    if not content:
        return []

    # Handle string arrays (layouts)
    if "'" in content or '"' in content:
        # Extract quoted strings
        pattern = r"'([^']*)'|\"([^\"]*)\""
        matches = re.findall(pattern, content)
        return [m[0] or m[1] for m in matches]

    # Handle object arrays
    if '{' in content:
        objects = []
        depth = 0
        current_obj = []

        for char in content:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1

            current_obj.append(char)

            if depth == 0 and char == '}':
                obj_str = ''.join(current_obj).strip().rstrip(',')
                if obj_str:
                    objects.append(parse_object(obj_str))
                current_obj = []

        return objects

    # Handle simple arrays
    items = content.split(',')
    return [parse_typescript_value(item.strip()) for item in items if item.strip()]


def parse_object(obj_str: str) -> Dict[str, Any]:
    """Parse a TypeScript object."""
    obj_str = obj_str.strip()
    if not obj_str.startswith('{') or not obj_str.endswith('}'):
        return {}

    content = obj_str[1:-1].strip()
    if not content:
        return {}

    result = {}

    # Split by fields, respecting nested structures
    fields = []
    current_field = []
    depth = 0

    for char in content:
        if char in '{[':
            depth += 1
        elif char in '}]':
            depth -= 1

        current_field.append(char)

        if char == ',' and depth == 0:
            field_str = ''.join(current_field[:-1]).strip()
            if field_str:
                fields.append(field_str)
            current_field = []

    # Add last field
    if current_field:
        field_str = ''.join(current_field).strip()
        if field_str:
            fields.append(field_str)

    # Parse each field
    for field in fields:
        field = field.strip()
        if not field:
            continue

        # Match key: value
        match = re.match(r'(\w+):\s*(.*)', field, re.DOTALL)
        if match:
            key = match.group(1)
            value_str = match.group(2).rstrip(',').strip()
            result[key] = parse_field_value(value_str)

    return result


def extract_buildings_from_file(filepath: Path) -> List[Dict[str, Any]]:
    """Extract all building definitions from a TypeScript file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    buildings = []

    # Find all exported const building definitions
    pattern = r'export const (\w+):\s*VoxelBuildingDefinition\s*='

    for match in re.finditer(pattern, content):
        const_name = match.group(1)
        start_pos = match.end()

        building, end_pos = extract_building_from_ts(content, start_pos)
        if building and 'id' in building:
            buildings.append(building)
            print(f"  ✓ Extracted: {building.get('id', const_name)}")
        else:
            print(f"  ✗ Failed to extract: {const_name}")

    return buildings


def main():
    """Main extraction process."""
    src_dir = Path(__file__).parent / 'src'
    data_dir = Path(__file__).parent / 'data'
    data_dir.mkdir(exist_ok=True)

    files_to_extract = {
        'building-library.ts': 'standard-buildings.json',
        'exotic-buildings.ts': 'exotic-buildings.json',
        'magic-buildings.ts': 'magic-buildings.json',
        'crafting-buildings.ts': 'crafting-buildings.json',
    }

    total_extracted = 0

    for ts_file, json_file in files_to_extract.items():
        print(f"\n{'='*60}")
        print(f"Processing: {ts_file}")
        print(f"{'='*60}")

        ts_path = src_dir / ts_file
        if not ts_path.exists():
            print(f"  ✗ File not found: {ts_path}")
            continue

        buildings = extract_buildings_from_file(ts_path)

        if buildings:
            json_path = data_dir / json_file
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(buildings, f, indent=2, ensure_ascii=False)

            print(f"\n  ✓ Saved {len(buildings)} buildings to: {json_path}")
            total_extracted += len(buildings)
        else:
            print(f"  ✗ No buildings extracted from {ts_file}")

    print(f"\n{'='*60}")
    print(f"EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Total buildings extracted: {total_extracted}")
    print(f"Output directory: {data_dir}")


if __name__ == '__main__':
    main()
