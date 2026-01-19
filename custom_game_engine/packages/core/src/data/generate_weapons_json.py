#!/usr/bin/env python3
"""
Extract weapon definitions from TypeScript files and generate weapons.json
"""

import json
import re
import os
from pathlib import Path

# Parse TypeScript object literal to JSON
def parse_ts_object(content):
    """Parse TypeScript object literal (simplified)"""
    # Remove comments
    content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    # Convert single quotes to double quotes (simple approach)
    content = content.replace("'", '"')

    # Remove trailing commas
    content = re.sub(r',(\s*[}\]])', r'\1', content)

    return content

def extract_weapon(match):
    """Extract a single weapon definition"""
    id_val, name, category, props = match.groups()

    # Parse the properties object
    props = props.strip()

    # Build weapon dict
    weapon = {
        'id': id_val,
        'name': name,
        'category': category,
    }

    # Extract top-level properties
    weight_match = re.search(r'weight:\s*([0-9.]+)', props)
    if weight_match:
        weapon['weight'] = float(weight_match.group(1))

    stack_match = re.search(r'stackSize:\s*(\d+)', props)
    if stack_match:
        weapon['stackSize'] = int(stack_match.group(1))

    value_match = re.search(r'baseValue:\s*(\d+)', props)
    if value_match:
        weapon['baseValue'] = int(value_match.group(1))

    rarity_match = re.search(r"rarity:\s*'([^']+)'", props)
    if rarity_match:
        weapon['rarity'] = rarity_match.group(1)

    material_match = re.search(r"baseMaterial:\s*'([^']+)'", props)
    if material_match:
        weapon['baseMaterial'] = material_match.group(1)

    tech_match = re.search(r'clarketechTier:\s*(\d+)', props)
    if tech_match:
        weapon['clarketechTier'] = int(tech_match.group(1))

    research_match = re.search(r"researchRequired:\s*(\[.*?\]|'[^']+')", props, re.DOTALL)
    if research_match:
        research_str = research_match.group(1)
        if research_str.startswith('['):
            # Array
            weapon['researchRequired'] = [
                r.strip().strip('"\'')
                for r in re.findall(r"'([^']+)'", research_str)
            ]
        else:
            weapon['researchRequired'] = research_str.strip('"\'')

    # Extract traits.weapon
    weapon_trait_match = re.search(r'weapon:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}', props, re.DOTALL)
    if weapon_trait_match:
        weapon_trait_str = weapon_trait_match.group(1)
        weapon_trait = {}

            # Extract numeric fields
        for field in ['damage', 'range', 'attackSpeed', 'durabilityLoss', 'aoeRadius', 'minRange', 'powerCost', 'critChance', 'critMultiplier']:
            pattern = field + r':\s*([0-9.]+)'
            field_match = re.search(pattern, weapon_trait_str)
            if field_match:
                val = field_match.group(1)
                weapon_trait[field] = float(val) if '.' in val else int(val)

        # Extract string fields
        for field in ['damageType', 'category', 'attackType']:
            pattern = field + r":\s*'([^']+)'"
            field_match = re.search(pattern, weapon_trait_str)
            if field_match:
                weapon_trait[field] = field_match.group(1)

        # Extract boolean fields
        for field in ['twoHanded']:
            pattern = field + r':\s*(true|false)'
            field_match = re.search(pattern, weapon_trait_str)
            if field_match:
                weapon_trait[field] = field_match.group(1) == 'true'

        # Extract special array
        special_match = re.search(r'special:\s*\[(.*?)\]', weapon_trait_str)
        if special_match:
            weapon_trait['special'] = [
                s.strip().strip('"\'')
                for s in special_match.group(1).split(',')
                if s.strip()
            ]

        # Extract ammo
        ammo_match = re.search(r'ammo:\s*\{([^}]+)\}', weapon_trait_str)
        if ammo_match:
            ammo_str = ammo_match.group(1)
            ammo = {}
            for field in ['ammoType', 'ammoPerShot', 'magazineSize', 'reloadTime']:
                pattern = field + r':\s*("?[^,}]+"?)'
                field_match = re.search(pattern, ammo_str)
                if field_match:
                    val = field_match.group(1).strip().strip('"\'')
                    try:
                        ammo[field] = int(val)
                    except ValueError:
                        ammo[field] = val
            weapon_trait['ammo'] = ammo

        # Extract projectile
        proj_match = re.search(r'projectile:\s*\{([^}]+)\}', weapon_trait_str)
        if proj_match:
            proj_str = proj_match.group(1)
            projectile = {}
            for field in ['speed', 'penetration']:
                pattern = field + r':\s*([0-9.]+)'
                field_match = re.search(pattern, proj_str)
                if field_match:
                    val = field_match.group(1)
                    projectile[field] = float(val) if '.' in val else int(val)
            for field in ['arc']:
                pattern = field + r':\s*(true|false)'
                field_match = re.search(pattern, proj_str)
                if field_match:
                    projectile[field] = field_match.group(1) == 'true'
            for field in ['dropoff']:
                pattern = field + r':\s*([0-9.]+)'
                field_match = re.search(pattern, proj_str)
                if field_match:
                    projectile[field] = float(field_match.group(1))
            weapon_trait['projectile'] = projectile

        weapon['weapon'] = weapon_trait

    # Extract traits.magical
    magical_match = re.search(r'magical:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}', props, re.DOTALL)
    if magical_match:
        magical_str = magical_match.group(1)
        magical = {}

        # Extract string fields
        for field in ['magicType']:
            pattern = field + r":\s*'([^']+)'"
            field_match = re.search(pattern, magical_str)
            if field_match:
                magical[field] = field_match.group(1)

        # Extract numeric fields
        for field in ['manaPerUse', 'spellPowerBonus', 'manaRegen']:
            pattern = field + r':\s*([0-9.]+)'
            field_match = re.search(pattern, magical_str)
            if field_match:
                val = field_match.group(1)
                magical[field] = float(val) if '.' in val else int(val)

        # Extract boolean fields
        for field in ['cursed']:
            pattern = field + r':\s*(true|false)'
            field_match = re.search(pattern, magical_str)
            if field_match:
                magical[field] = field_match.group(1) == 'true'

        # Extract effects array
        effects_match = re.search(r'effects:\s*\[(.*?)\]', magical_str, re.DOTALL)
        if effects_match:
            magical['effects'] = [
                s.strip().strip('"\'')
                for s in effects_match.group(1).split(',')
                if s.strip()
            ]

        # Extract grantsSpells array
        spells_match = re.search(r'grantsSpells:\s*\[(.*?)\]', magical_str, re.DOTALL)
        if spells_match:
            magical['grantsSpells'] = [
                s.strip().strip('"\'')
                for s in spells_match.group(1).split(',')
                if s.strip()
            ]

        weapon['magical'] = magical

    return weapon

def extract_weapons_from_file(filepath):
    """Extract all weapons from a TypeScript file"""
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all defineItem calls - uses single quotes
    pattern = r"defineItem\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\{(.*?)\}\s*\)"

    weapons = []
    for match in re.finditer(pattern, content, re.DOTALL):
        try:
            weapon = extract_weapon(match)
            weapons.append(weapon)
        except Exception as e:
            print(f"Error parsing weapon in {filepath}: {e}")
            print(f"Match: {match.group(1)}")

    return weapons

def main():
    weapons_dir = Path(__file__).parent.parent / 'items' / 'weapons'
    output_file = Path(__file__).parent / 'weapons.json'

    categories = {
        'creative': 'creative.ts',
        'melee': 'melee.ts',
        'firearms': 'firearms.ts',
        'magic': 'magic.ts',
        'exotic': 'exotic.ts',
        'ranged': 'ranged.ts',
        'energy': 'energy.ts',
    }

    all_weapons = {}
    total = 0

    for category, filename in categories.items():
        filepath = weapons_dir / filename
        if not filepath.exists():
            print(f"Warning: {filepath} not found")
            continue

        weapons = extract_weapons_from_file(filepath)
        all_weapons[category] = weapons
        print(f"Extracted {len(weapons)} weapons from {filename}")
        total += len(weapons)

    print(f"\nTotal: {total} weapons")

    # Write JSON
    with open(output_file, 'w') as f:
        json.dump(all_weapons, f, indent=2)

    print(f"\nWrote weapons.json ({output_file})")
    print(f"File size: {output_file.stat().st_size / 1024:.1f} KB")

if __name__ == '__main__':
    main()
