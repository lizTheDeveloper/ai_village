# Magic Paradigm Data Migration

## Overview

Magic paradigm data has been extracted from TypeScript files into JSON files for easier maintenance and modification.

## File Structure

```
packages/magic/
├── data/                           # JSON data files
│   ├── core-paradigms.json        # 7 core paradigms (academic, pact, names, etc.)
│   └── animist-paradigms.json     # Example kami and allomantic metals
├── src/
│   ├── data-loader.ts             # Loads and validates JSON data
│   ├── CoreParadigms.ts           # Now loads from JSON
│   ├── AnimistParadigms.ts        # Partially migrated (kami + metals from JSON)
│   └── CreativeParadigms.ts       # Not yet migrated (21 paradigms, complex structure)
```

## What Was Migrated

### CoreParadigms.ts
All 7 core paradigms moved to `data/core-paradigms.json`:
- academic (The Academies)
- pact (The Pacts)
- names (The Deep Grammar)
- breath (The Breath)
- divine (The Faithful)
- blood (The Crimson Art)
- emotional (The Passionate)

### AnimistParadigms.ts
Extracted supporting data:
- `EXAMPLE_KAMI` array → `data/animist-paradigms.json`
- `ALLOMANTIC_METALS` array → `data/animist-paradigms.json`

Paradigm definitions remain in TypeScript for now (SHINTO_PARADIGM, SYMPATHY_PARADIGM, etc.)

### CreativeParadigms.ts
Not yet migrated due to:
- 21 different paradigms with varying structures
- Inconsistent typing (some use `as any[]` casts)
- Complex nested data

## Benefits

1. **Easier Editing**: Modify paradigm data without TypeScript knowledge
2. **Separation of Concerns**: Data separated from code logic
3. **Validation**: Centralized validation in `data-loader.ts`
4. **Maintainability**: JSON is easier to diff and merge
5. **Future Features**: Could enable runtime paradigm loading, modding support

## How It Works

```typescript
// OLD (hardcoded)
export const ACADEMIC_PARADIGM: MagicParadigm = {
  id: 'academic',
  name: 'The Academies',
  // ... 100+ lines of data
};

// NEW (JSON-loaded)
import { loadCoreParadigms } from './data-loader.js';
const LOADED_PARADIGMS = loadCoreParadigms();
export const ACADEMIC_PARADIGM: MagicParadigm = LOADED_PARADIGMS.academic!;
```

## Data Loader API

```typescript
import { loadCoreParadigms, loadExampleKami, loadAllomanticMetals } from './data-loader.js';

// Load core paradigms
const paradigms = loadCoreParadigms();
// Returns: { academic: MagicParadigm, pact: MagicParadigm, ... }

// Load example kami
const kami = loadExampleKami();
// Returns: Kami[]

// Load allomantic metals
const metals = loadAllomanticMetals();
// Returns: AllomanticMetal[]
```

## Testing

Tests verify JSON data loads correctly:

```bash
npm test -- packages/magic/src/__tests__/data-loader.test.ts
```

All tests pass:
- Core paradigms load (7 paradigms)
- Example kami load (6 kami)
- Allomantic metals load (12 metals)
- Data structure validation

## Future Work

1. **Migrate CreativeParadigms**: Extract 21 creative paradigms to JSON
2. **Migrate AnimistParadigms**: Move remaining paradigm definitions to JSON
3. **Schema Validation**: Add JSON Schema for paradigm data
4. **Runtime Loading**: Enable dynamic paradigm loading for modding
5. **Editor Tools**: Build UI tools for editing paradigm JSON

## Notes

- TypeScript config updated to include JSON imports (`resolveJsonModule: true`)
- Non-null assertions (`!`) used for paradigm exports (data guaranteed by JSON structure)
- Backward compatibility maintained - all exports unchanged
- No breaking changes to consuming code
