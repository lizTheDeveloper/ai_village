#!/usr/bin/env python3
"""
Script to add ecological metadata to remaining diet patterns.
Based on DIET_ECOLOGY_MAPPING.md analysis.
"""

# Mapping of diet pattern ID → ecological metadata
DIET_ECOLOGY_DATA = {
    'chemosynthesis': {
        'relatedItems': [],  # Inorganic chemicals (not yet in item system)
        'ecologicalWeight': 0.25,
        'comment': '// Deep sea vents, underground'
    },
    'parasitic': {
        'relatedItems': [],  # Living hosts
        'ecologicalWeight': 0.3,
        'comment': '// Parasitic - requires living hosts'
    },
    'emotional_vampirism': {
        'relatedItems': [],  # Emotions from sentient beings
        'ecologicalWeight': 0.1,
        'comment': '// Abstract - emotions from sentient beings'
    },
    'radiation_metabolizer': {
        'relatedItems': [],  # Radiation sources
        'ecologicalWeight': 0.15,
        'comment': '// Rare - radioactive areas only'
    },
    'sound_digestion': {
        'relatedItems': ["'material:frozen_music'"],  # Rare from surrealMaterials.ts
        'ecologicalWeight': 0.08,
        'realmWeights': "{ 'audiomancy_areas': 0.4 }",
        'comment': '// Rare sound crystal from surrealMaterials.ts'
    },
    'dimensional_scavenging': {
        'relatedItems': [],
        'ecologicalWeight': 0.0,
        'deprecated': True,
        'deprecationReason': "'Breaks ecology - pulls food from parallel dimensions'",
        'comment': '// DEPRECATED'
    },
    'symbiotic_farming': {
        'relatedItems': [],  # Self-sustaining internal organisms
        'ecologicalWeight': 0.3,
        'comment': '// Self-sufficient - farms bacteria inside'
    },
    'magnetic_digestion': {
        'relatedItems': ["'material:forged_steel'"],  # Metal from surrealMaterials.ts
        'ecologicalWeight': 0.2,
        'comment': '// Uncommon metal materials'
    },
    'stellar_sipping': {
        'relatedItems': [],
        'ecologicalWeight': 0.0,
        'deprecated': True,
        'deprecationReason': "'Scale mismatch - drinking from stars breaks ecology'",
        'comment': '// DEPRECATED'
    },
    'pain_metabolizer': {
        'relatedItems': [],
        'ecologicalWeight': 0.0,
        'deprecated': True,
        'deprecationReason': "'Unethical mechanic - requires causing suffering'",
        'comment': '// DEPRECATED'
    },
    'crystalline_consumption': {
        'relatedItems': ["'material:dream_crystal'", "'material:memory_crystal'", "'material:resonant_crystal'"],
        'ecologicalWeight': 0.15,
        'comment': '// Rare/legendary crystals'
    },
    'gravity_feeding': {
        'relatedItems': [],
        'ecologicalWeight': 0.0,
        'deprecated': True,
        'deprecationReason': "'No gravitational resources exist in game'",
        'comment': '// DEPRECATED'
    },
    'void_consumption': {
        'relatedItems': [],
        'ecologicalWeight': 0.0,
        'deprecated': True,
        'deprecationReason': "'Eating entropy has no game representation'",
        'comment': '// DEPRECATED'
    },
    'information_digestion': {
        'relatedItems': ["'material:folded_parchment'"],  # Paper from surrealMaterials.ts
        'ecologicalWeight': 0.2,
        'comment': '// Common paper material if knowledge items exist'
    },
    'hematophage': {
        'relatedItems': [],  # Blood from living creatures
        'ecologicalWeight': 0.4,
        'comment': '// Generated from living entities'
    },
    'fungivore': {
        'relatedItems': ["'mushroom'", "'material:giant_mushroom'"],
        'ecologicalWeight': 0.5,
        'comment': '// Uncommon fungi'
    },
    'granivore': {
        'relatedItems': ["'wheat'"],
        'ecologicalWeight': 0.8,
        'comment': '// Common seeds/grains'
    },
    'folivore': {
        'relatedItems': ["'leaves'", "'fiber'"],
        'ecologicalWeight': 0.6,
        'comment': '// Common leaf materials'
    },
}

def generate_metadata_string(diet_id, data):
    """Generate the TypeScript metadata lines for a diet pattern."""
    lines = []

    # relatedItems
    if data['relatedItems']:
        items_str = ', '.join(data['relatedItems'])
        lines.append(f"    relatedItems: [{items_str}],")
    else:
        if data.get('comment'):
            lines.append(f"    relatedItems: [], {data['comment']}")
        else:
            lines.append(f"    relatedItems: [],")

    # ecologicalWeight
    lines.append(f"    ecologicalWeight: {data['ecologicalWeight']},")

    # realmWeights (optional)
    if 'realmWeights' in data:
        lines.append(f"    realmWeights: {data['realmWeights']},")

    # deprecated (optional)
    if data.get('deprecated'):
        lines.append(f"    deprecated: true,")
        lines.append(f"    deprecationReason: {data['deprecationReason']},")

    return '\n'.join(lines)

# Print metadata for manual addition
print("# Ecological Metadata for Remaining Diet Patterns\n")
print("Add these lines to each diet pattern after flavorText:\n")
for diet_id, data in sorted(DIET_ECOLOGY_DATA.items()):
    print(f"\n## {diet_id}:")
    print(generate_metadata_string(diet_id, data))
