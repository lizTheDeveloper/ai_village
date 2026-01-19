# Magic Package Data Directory

This directory contains spell definitions in JSON format, extracted from the original TypeScript source.

## Files

### Individual Paradigm Files

Each paradigm has its own JSON file containing an array of spell definitions:

- **`divine_spells.json`** - 26 Divine Magic spells (restoration, protection, judgment)
- **`academic_spells.json`** - 36 Academic Magic spells (elemental, systematic magic)
- **`blood_spells.json`** - 10 Blood Magic spells (sacrifice, vitality)
- **`name_spells.json`** - 9 Name Magic spells (true names, identity)
- **`breath_spells.json`** - 9 Breath Magic spells (song, voice, wind)
- **`pact_spells.json`** - 6 Pact Magic spells (contracts, bargains)

### Combined Files

- **`spells.json`** - All spells in consolidated format (96 total)
  - Used by root `data/spells.json`
  - Structure: `{ version, generatedAt, source, paradigms: { ... } }`

### Other Data Files

- **`animist-paradigms.json`** - Animist magic paradigm definitions
- **`core-paradigms.json`** - Core magic paradigm definitions
- **`creative-paradigms.json`** - Creative magic paradigm definitions

## Spell Definition Structure

Each spell is a JSON object with the following fields:

### Required Fields
```json
{
  "id": "spell_identifier",
  "name": "Display Name",
  "paradigmId": "divine|academic|blood|name|breath|pact",
  "technique": "create|enhance|transform|control|...",
  "form": "body|mind|spirit|matter|...",
  "source": "divine|arcane|blood|void|...",
  "description": "Full description of the spell...",
  "manaCost": 25,
  "castTime": 40,
  "range": 1
}
```

### Optional Fields
```json
{
  "effectId": "heal_effect",
  "school": "restoration",
  "icon": "✨",
  "minProficiency": 50,
  "hotkeyable": true,
  "baseMishapChance": 0.02,
  "prerequisites": ["other_spell_id"],
  "tags": ["healing", "support"]
}
```

### Creator Detection Metadata
```json
{
  "creatorDetection": {
    "detectionRisk": "low|moderate|high|critical|forbidden",
    "powerLevel": 3,
    "leavesMagicalSignature": false,
    "detectionNotes": "Why this spell draws attention...",
    "forbiddenCategories": ["academic_study", "mass_destruction"]
  }
}
```

## Usage

### In TypeScript

Spells are loaded via the `ExpandedSpells.ts` module:

```typescript
import {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  SPELL_COUNTS
} from './ExpandedSpells.js';

// Or via re-exports
import { DIVINE_SPELLS } from './spells/index.js';
```

### Direct JSON Import

You can also import JSON directly if needed:

```typescript
import divineSpells from '../data/divine_spells.json';
```

## Editing Spells

To add or modify spells:

1. Edit the appropriate `*_spells.json` file
2. Run the consolidation script to update `spells.json`:
   ```bash
   python3 /path/to/consolidate_spells.py
   ```
3. Validate changes:
   ```bash
   npx tsx src/validate-spells.ts
   ```

## Validation

Spell data is validated for:
- Required fields present
- Correct types
- Valid paradigm IDs
- No duplicate IDs

Run validation:
```bash
cd packages/magic
npx tsx src/validate-spells.ts
```

## Version History

- **v1.0.1** (2026-01-18) - Extracted from TypeScript to JSON
  - Initial extraction of 96 spells
  - Organized into 6 paradigm files

- **v1.0.0** (2026-01-05) - Original TypeScript definitions
  - All spells defined in `ExpandedSpells.ts`

## See Also

- `/custom_game_engine/SPELL_EXTRACTION_SUMMARY.md` - Full extraction documentation
- `/custom_game_engine/packages/magic/src/SpellRegistry.ts` - Spell registration system
- `/custom_game_engine/packages/magic/README.md` - Magic package documentation
