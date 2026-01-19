#!/usr/bin/env python3
"""
Extract plant species definitions from TypeScript to JSON.

This script parses TypeScript plant species files and extracts the data
into a single consolidated JSON file.
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List

# Base path
BASE_PATH = Path(__file__).parent / "custom_game_engine/packages/world/src/plant-species"

# Files to process
FILES = [
    ("wild-plants.ts", 19),
    ("mountain-plants.ts", 8),
    ("tropical-plants.ts", 6),
    ("wetland-plants.ts", 6),
    ("medicinal-plants.ts", 5),
    ("magical-plants.ts", 5),
    ("cultivated-crops.ts", 4),
]


def clean_value(value: str) -> Any:
    """Clean and convert a TypeScript value to Python/JSON."""
    value = value.strip()

    # Handle booleans
    if value == "true":
        return True
    if value == "false":
        return False

    # Handle null/undefined
    if value in ("null", "undefined"):
        return None

    # Handle numbers
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        pass

    # Handle strings (remove quotes)
    if (value.startswith('"') and value.endswith('"')) or \
       (value.startswith("'") and value.endswith("'")):
        return value[1:-1]

    # Handle arrays
    if value.startswith("[") and value.endswith("]"):
        # Simple array parsing - split by comma
        inner = value[1:-1].strip()
        if not inner:
            return []
        items = [clean_value(item.strip()) for item in split_by_comma(inner)]
        return items

    # Return as string if can't parse
    return value


def split_by_comma(text: str) -> List[str]:
    """Split by comma, respecting nesting."""
    parts = []
    current = ""
    depth = 0
    in_string = False
    string_char = None

    for char in text:
        if char in ('"', "'") and not in_string:
            in_string = True
            string_char = char
        elif char == string_char and in_string:
            in_string = False
            string_char = None
        elif not in_string:
            if char in ("[", "{"):
                depth += 1
            elif char in ("]", "}"):
                depth -= 1
            elif char == "," and depth == 0:
                parts.append(current)
                current = ""
                continue

        current += char

    if current:
        parts.append(current)

    return parts


def parse_object(text: str) -> Dict[str, Any]:
    """Parse a JavaScript/TypeScript object literal."""
    result = {}

    # Remove outer braces
    text = text.strip()
    if text.startswith("{"):
        text = text[1:]
    if text.endswith("}"):
        text = text[:-1]

    # Split into property: value pairs
    lines = text.split("\n")
    current_key = None
    current_value = ""
    brace_depth = 0

    for line in lines:
        stripped = line.strip()

        # Skip empty lines and comments
        if not stripped or stripped.startswith("//"):
            continue

        # Remove trailing comma
        if stripped.endswith(","):
            stripped = stripped[:-1]

        # Check if this is a new property
        if ":" in stripped and brace_depth == 0:
            # Save previous property
            if current_key:
                result[current_key] = clean_value(current_value.strip())

            # Start new property
            key, value = stripped.split(":", 1)
            current_key = key.strip()
            current_value = value.strip()

            # Count braces in value
            brace_depth = current_value.count("{") - current_value.count("}")
            brace_depth += current_value.count("[") - current_value.count("]")
        else:
            # Continuation of current property
            current_value += " " + stripped
            brace_depth += stripped.count("{") - stripped.count("}")
            brace_depth += stripped.count("[") - stripped.count("]")

    # Save last property
    if current_key:
        result[current_key] = clean_value(current_value.strip())

    return result


def extract_plants_from_file(filepath: Path) -> List[Dict[str, Any]]:
    """Extract all plant species from a TypeScript file."""
    print(f"Processing {filepath.name}...")

    content = filepath.read_text()
    plants = []

    # Find export const declarations
    pattern = r'export const (\w+): PlantSpecies = \{'
    matches = list(re.finditer(pattern, content))

    for i, match in enumerate(matches):
        plant_name = match.group(1)
        start = match.start()

        # Find the end of this plant definition
        # Look for the closing brace before the next export or end of file
        if i < len(matches) - 1:
            end = matches[i + 1].start()
        else:
            end = len(content)

        # Extract the plant object
        plant_text = content[start:end]

        # Find the closing brace - need to count braces properly
        brace_count = 0
        in_string = False
        string_char = None
        actual_end = start

        for j in range(start, end):
            char = content[j]

            # Track strings
            if char in ('"', "'") and (j == 0 or content[j-1] != "\\"):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False

            # Track braces outside strings
            if not in_string:
                if char == "{":
                    brace_count += 1
                elif char == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        actual_end = j + 1
                        break

        plant_text = content[start:actual_end]

        # Extract just the object part
        obj_start = plant_text.find("{")
        if obj_start == -1:
            continue

        obj_text = plant_text[obj_start:]

        # Basic extraction - we'll use a simpler approach
        # Since the data is well-formatted, we can extract key fields
        plant_data = {"id": plant_name.lower().replace("_", "-")}

        # Extract key properties with regex
        # This is a simplified extraction - we'll just copy the raw structure
        print(f"  Found: {plant_name}")
        plants.append({"_const_name": plant_name, "_raw": obj_text})

    return plants


def main():
    """Main extraction function."""
    print("Plant Species Data Extraction")
    print("=" * 60)

    all_plants = []

    for filename, expected_count in FILES:
        filepath = BASE_PATH / filename
        if not filepath.exists():
            print(f"WARNING: {filepath} not found!")
            continue

        plants = extract_plants_from_file(filepath)
        print(f"  Extracted {len(plants)} plants (expected {expected_count})")

        if len(plants) != expected_count:
            print(f"  WARNING: Count mismatch!")

        all_plants.extend(plants)

    print()
    print(f"Total plants extracted: {len(all_plants)}")

    # Save intermediate data
    output_path = Path(__file__).parent / "plant_species_raw.json"
    with open(output_path, "w") as f:
        json.dump(all_plants, f, indent=2)

    print(f"Raw data saved to: {output_path}")
    print()
    print("Next step: Manual cleanup and structuring required.")
    print("The TypeScript object syntax is too complex for automated parsing.")


if __name__ == "__main__":
    main()
