#!/usr/bin/env python3
"""
Extract spell definitions from ExpandedSpells.ts to JSON files.
Preserves all fields, descriptions, and metadata.
"""

import json
import re
from pathlib import Path

def extract_spells_from_ts(file_path: Path) -> dict[str, list[dict]]:
    """Parse TypeScript file and extract spell arrays."""
    content = file_path.read_text()

    # Find all spell arrays
    spell_arrays = {}
    array_pattern = r'export const (\w+_SPELLS): SpellDefinition\[\] = \[(.*?)\];'

    # Split by export const to find each array
    sections = re.split(r'(?=export const \w+_SPELLS:)', content)

    for section in sections:
        if not section.strip():
            continue

        # Extract array name
        match = re.match(r'export const (\w+_SPELLS):', section)
        if not match:
            continue

        array_name = match.group(1)

        # Extract individual spell objects
        spells = []

        # Find all spell objects (starting with { and ending with },)
        spell_pattern = r'\{\s*id:\s*[\'"]([^\'"]+)[\'"].*?\},(?=\s*(?:\{|$|\]))'

        # More robust: find balanced braces
        in_spell = False
        brace_count = 0
        spell_text = ""

        for i, char in enumerate(section):
            if char == '{' and not in_spell:
                in_spell = True
                brace_count = 1
                spell_text = char
            elif in_spell:
                spell_text += char
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        # Found complete spell object
                        spell_obj = parse_spell_object(spell_text)
                        if spell_obj:
                            spells.append(spell_obj)
                        in_spell = False
                        spell_text = ""

        if spells:
            spell_arrays[array_name] = spells
            print(f"Extracted {len(spells)} spells from {array_name}")

    return spell_arrays

def parse_spell_object(text: str) -> dict | None:
    """Parse a single spell object from TypeScript."""
    try:
        spell = {}

        # Extract simple string fields
        simple_fields = ['id', 'name', 'paradigmId', 'technique', 'form', 'source',
                        'effectId', 'description', 'school', 'icon']

        for field in simple_fields:
            # Handle both single and double quotes, allow escaped quotes inside
            pattern = rf"{field}:\s*['\"](.+?)['\"](?=\s*,|\s*}})"
            match = re.search(pattern, text, re.DOTALL)
            if match:
                value = match.group(1)
                # Unescape quotes
                value = value.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n')
                spell[field] = value

        # Extract numeric fields
        numeric_fields = ['manaCost', 'castTime', 'range', 'minProficiency', 'powerLevel']
        for field in numeric_fields:
            pattern = rf"{field}:\s*(\d+(?:\.\d+)?)"
            match = re.search(pattern, text)
            if match:
                value = match.group(1)
                spell[field] = float(value) if '.' in value else int(value)

        # Extract boolean fields
        bool_fields = ['hotkeyable', 'leavesMagicalSignature']
        for field in bool_fields:
            pattern = rf"{field}:\s*(true|false)"
            match = re.search(pattern, text)
            if match:
                spell[field] = match.group(1) == 'true'

        # Extract baseMishapChance (float)
        match = re.search(r"baseMishapChance:\s*(\d+(?:\.\d+)?)", text)
        if match:
            spell['baseMishapChance'] = float(match.group(1))

        # Extract arrays
        # prerequisites
        match = re.search(r"prerequisites:\s*\[(.*?)\]", text)
        if match:
            prereqs = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
            if prereqs:
                spell['prerequisites'] = prereqs

        # tags
        match = re.search(r"tags:\s*\[(.*?)\]", text)
        if match:
            tags = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
            if tags:
                spell['tags'] = tags

        # creatorDetection object
        detection_match = re.search(r"creatorDetection:\s*\{(.*?)\}", text, re.DOTALL)
        if detection_match:
            detection_text = detection_match.group(1)
            detection = {}

            # detectionRisk
            match = re.search(r"detectionRisk:\s*['\"]([^'\"]+)['\"]", detection_text)
            if match:
                detection['detectionRisk'] = match.group(1)

            # powerLevel
            match = re.search(r"powerLevel:\s*(\d+)", detection_text)
            if match:
                detection['powerLevel'] = int(match.group(1))

            # leavesMagicalSignature
            match = re.search(r"leavesMagicalSignature:\s*(true|false)", detection_text)
            if match:
                detection['leavesMagicalSignature'] = match.group(1) == 'true'

            # detectionNotes
            match = re.search(r"detectionNotes:\s*['\"](.+?)['\"](?=\s*,|\s*}})", detection_text, re.DOTALL)
            if match:
                notes = match.group(1).replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n')
                detection['detectionNotes'] = notes

            # forbiddenCategories
            match = re.search(r"forbiddenCategories:\s*\[(.*?)\]", detection_text)
            if match:
                categories = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
                if categories:
                    detection['forbiddenCategories'] = categories

            if detection:
                spell['creatorDetection'] = detection

        # Validate required fields
        if 'id' not in spell or 'name' not in spell:
            return None

        return spell
    except Exception as e:
        print(f"Error parsing spell: {e}")
        return None

def main():
    # Paths
    ts_file = Path("/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/src/ExpandedSpells.ts")
    data_dir = Path("/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/data")

    # Create data directory
    data_dir.mkdir(exist_ok=True)

    # Extract spells
    print("Extracting spells from TypeScript...")
    spell_arrays = extract_spells_from_ts(ts_file)

    # Save each paradigm to separate JSON file
    total_spells = 0
    for array_name, spells in spell_arrays.items():
        # Convert DIVINE_SPELLS -> divine
        paradigm = array_name.replace('_SPELLS', '').lower()
        output_file = data_dir / f"{paradigm}_spells.json"

        with output_file.open('w') as f:
            json.dump(spells, f, indent=2)

        print(f"  {paradigm}: {len(spells)} spells -> {output_file}")
        total_spells += len(spells)

    # Also create combined file
    combined_file = data_dir / "spells.json"
    with combined_file.open('w') as f:
        json.dump(spell_arrays, f, indent=2)

    print(f"\nTotal: {total_spells} spells extracted")
    print(f"Combined file: {combined_file}")
    print(f"Individual files: {data_dir}/*_spells.json")

if __name__ == "__main__":
    main()
