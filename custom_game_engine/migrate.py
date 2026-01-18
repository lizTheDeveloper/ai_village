#!/usr/bin/env python3
"""
Automated migration script to add throttleInterval to all BaseSystem classes
"""

import os
import re
import subprocess
from pathlib import Path

THROTTLE = {
    'EVERY_TICK': 0,
    'FAST': 10,
    'NORMAL': 20,
    'SLOW': 100,
    'VERY_SLOW': 200,
}

SYSTEM_THROTTLE_RULES = {
    'EVERY_TICK': [
        r'PlayerInput', r'Movement(?!.*Prediction)', r'Steering', r'TimeSystem',
        r'Possession', r'Combat', r'Swimming',
    ],
    'FAST': [
        r'Temperature', r'AgentBrain', r'AnimalBrain', r'Injury', r'Threat',
        r'Fire', r'Door', r'Passage',
    ],
    'NORMAL': [
        r'Animal(?!.*Spawning)', r'Plant(?!.*Population|.*Discovery)', r'Agent(?!.*Brain)',
        r'Needs', r'Sleep', r'Mood', r'Skill', r'Equipment', r'Friendship',
        r'Social', r'Memory(?!.*Consolidation)', r'Hunting', r'Taming',
        r'Companion', r'Parenting',
    ],
    'SLOW': [
        r'Weather', r'Climate', r'Soil', r'Fluid', r'Building(?!.*Generation)',
        r'Durability', r'Cooking', r'Crafting', r'Resource', r'Production',
        r'Trading', r'Market', r'Ritual', r'Prayer', r'Belief', r'Faith',
        r'Interest', r'Exploration', r'Discovery', r'PlantDisease',
        r'WildPlantPopulation', r'WildAnimalSpawning', r'AquaticAnimalSpawning',
    ],
    'VERY_SLOW': [
        r'Research', r'Academic', r'Publication', r'Chronicler', r'InventorFame',
        r'Technology', r'Governance', r'VillageGovernance', r'TradeAgreement',
        r'Metrics', r'AutoSave', r'StateMutator', r'Syncretism', r'Schism',
        r'Religious', r'Rebellion', r'Landmark', r'Library', r'University',
        r'Myth', r'Lore', r'Plot', r'Narrative', r'Television', r'TV',
        r'Soap', r'GameShow', r'TalkShow', r'Newsroom', r'Archive',
        r'RoofRepair', r'Maintenance', r'Verification', r'ChunkLoading',
        r'BackgroundChunk', r'PredictiveChunk', r'CityBuilding', r'Deity',
        r'Reincarnation', r'Afterlife', r'Soul(?!Animation)', r'Species',
        r'Uplift', r'Consciousness', r'PackMind', r'HiveMind', r'Parasitic',
        r'Colonization', r'Clarketech', r'Artifact', r'MassEvent',
        r'CityDirector', r'FactoryAI', r'Spaceship', r'Planet', r'Realm',
        r'Portal', r'CrossRealm', r'EmotionalNavigation', r'VR', r'Neural',
        r'App', r'Chat', r'Radio', r'Phone', r'PowerGrid', r'Belt',
        r'Assembly', r'Shipping', r'Squadron', r'DeltaSync', r'PathPrediction',
        r'PathInterpolation',
    ],
}

PROXIMITY_SYSTEMS = [
    r'Plant', r'Animal(?!.*Visuals)', r'WildPlant', r'WildAnimal',
]

def determine_throttle(system_name):
    """Determine throttle interval for a system based on its name"""
    for category, patterns in SYSTEM_THROTTLE_RULES.items():
        for pattern in patterns:
            if re.search(pattern, system_name, re.IGNORECASE):
                return THROTTLE[category], category
    return THROTTLE['SLOW'], 'SLOW'

def needs_proximity_mode(system_name):
    """Check if system should use PROXIMITY mode"""
    return any(re.search(pat, system_name, re.IGNORECASE) for pat in PROXIMITY_SYSTEMS)

def process_system_file(file_path):
    """Process a single system file"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Check if already has throttleInterval
    if 'throttleInterval' in content:
        return {'status': 'skip', 'reason': 'already has throttleInterval'}

    # Check if extends BaseSystem
    if 'extends BaseSystem' not in content:
        return {'status': 'skip', 'reason': 'does not extend BaseSystem'}

    # Extract system name from filename
    file_name = Path(file_path).stem
    system_name = file_name.replace('System', '')

    # Determine throttle
    interval, category = determine_throttle(file_name)
    needs_position = needs_proximity_mode(file_name)

    # Find class declaration with requiredComponents
    class_match = re.search(
        r'(export class \w+System extends BaseSystem \{.*?readonly requiredComponents[^;]*;)',
        content,
        re.DOTALL
    )

    if not class_match:
        return {'status': 'error', 'reason': 'could not find class declaration'}

    class_decl = class_match.group(1)
    new_class_decl = class_decl

    # Add Position to requiredComponents if needed
    added_position = False
    if needs_position and 'CT.Position' not in class_decl:
        new_class_decl = re.sub(
            r'(readonly requiredComponents[^=]*=\s*\[)([^\]]*)\]',
            lambda m: f"{m.group(1)}{m.group(2).strip()}, CT.Position]" if m.group(2).strip() else f"{m.group(1)}CT.Position]",
            new_class_decl
        )
        added_position = True

    # Add throttleInterval after requiredComponents
    throttle_comments = {
        'EVERY_TICK': 'EVERY_TICK - critical responsiveness',
        'FAST': 'FAST - 0.5 seconds',
        'NORMAL': 'NORMAL - 1 second',
        'SLOW': 'SLOW - 5 seconds',
        'VERY_SLOW': 'VERY_SLOW - 10 seconds',
    }

    new_class_decl = re.sub(
        r'(readonly requiredComponents[^;]*;)',
        f"\\1\n  protected readonly throttleInterval = {interval}; // {throttle_comments[category]}",
        new_class_decl
    )

    # Replace in content
    new_content = content.replace(class_decl, new_class_decl)

    # Write back
    with open(file_path, 'w') as f:
        f.write(new_content)

    return {
        'status': 'migrated',
        'systemName': file_name,
        'throttle': f"{category} ({interval})",
        'addedPosition': added_position,
    }

def main():
    packages_dir = Path(__file__).parent / 'packages'

    # Find all system files
    result = subprocess.run(
        ['find', str(packages_dir), '-name', '*System.ts', '-type', 'f'],
        capture_output=True,
        text=True
    )

    system_files = [f for f in result.stdout.strip().split('\n') if f]

    # Filter to those extending BaseSystem without throttleInterval
    files_to_migrate = []
    for file_path in system_files:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            if 'extends BaseSystem' in content and 'throttleInterval' not in content:
                files_to_migrate.append(file_path)
        except:
            pass

    print(f"Found {len(files_to_migrate)} systems to migrate\n")

    results = {'migrated': [], 'skipped': [], 'errors': []}

    # Process each file
    for file_path in files_to_migrate:
        result = process_system_file(file_path)

        if result['status'] == 'migrated':
            results['migrated'].append(result)
            pos_note = ' + Position' if result.get('addedPosition') else ''
            print(f"✅ {result['systemName']} ({result['throttle']}{pos_note})")
        elif result['status'] == 'skip':
            results['skipped'].append({'file': file_path, 'reason': result['reason']})
        else:
            results['errors'].append({'file': file_path, 'reason': result['reason']})
            print(f"❌ {file_path} - {result['reason']}")

    # Summary
    print(f"\n{'=' * 60}")
    print('MIGRATION SUMMARY')
    print('=' * 60)
    print(f"✅ Migrated: {len(results['migrated'])}")
    print(f"⏭️  Skipped: {len(results['skipped'])}")
    print(f"❌ Errors: {len(results['errors'])}")
    print('=' * 60)

    if results['errors']:
        print('\nErrors:')
        for e in results['errors']:
            print(f"  - {e['file']}: {e['reason']}")

    # Group by throttle category
    by_category = {}
    for r in results['migrated']:
        cat = r['throttle'].split(' ')[0]
        by_category.setdefault(cat, []).append(r['systemName'])

    print('\nMigrations by Category:')
    for category in sorted(by_category.keys()):
        systems = by_category[category]
        print(f"\n{category} ({len(systems)} systems):")
        for s in systems:
            print(f"  - {s}")

if __name__ == '__main__':
    main()
