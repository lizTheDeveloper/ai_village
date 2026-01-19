#!/usr/bin/env python3
"""
Consolidate individual spell JSON files into the format expected by SpellsLoader.
"""

import json
from pathlib import Path
from datetime import datetime

def main():
    # Paths
    magic_data_dir = Path("/Users/annhoward/src/ai_village/custom_game_engine/packages/magic/data")
    root_data_dir = Path("/Users/annhoward/src/ai_village/custom_game_engine/data")

    # Load individual paradigm files
    paradigms = {
        'divine': json.loads((magic_data_dir / 'divine_spells.json').read_text()),
        'academic': json.loads((magic_data_dir / 'academic_spells.json').read_text()),
        'blood': json.loads((magic_data_dir / 'blood_spells.json').read_text()),
        'names': json.loads((magic_data_dir / 'name_spells.json').read_text()),  # Note: 'names' not 'name'
        'breath': json.loads((magic_data_dir / 'breath_spells.json').read_text()),
        'pact': json.loads((magic_data_dir / 'pact_spells.json').read_text()),
    }

    # Create consolidated structure
    consolidated = {
        'version': '1.0.1',
        'generatedAt': datetime.utcnow().isoformat() + 'Z',
        'source': 'packages/magic/data/*_spells.json',
        'paradigms': paradigms
    }

    # Write to root data directory
    output_file = root_data_dir / 'spells.json'
    with output_file.open('w') as f:
        json.dump(consolidated, f, indent=2)

    # Also update the combined file in magic/data
    magic_output_file = magic_data_dir / 'spells.json'
    # The magic/data/spells.json has a different structure (arrays named DIVINE_SPELLS, etc.)
    # But we'll also update it to match the consolidated structure for consistency
    with magic_output_file.open('w') as f:
        json.dump(consolidated, f, indent=2)

    # Print summary
    total_spells = sum(len(spells) for spells in paradigms.values())
    print(f"Consolidated {total_spells} spells into:")
    print(f"  {output_file}")
    print(f"  {magic_output_file}")
    print("\nSpells per paradigm:")
    for paradigm, spells in paradigms.items():
        print(f"  {paradigm}: {len(spells)}")

if __name__ == "__main__":
    main()
