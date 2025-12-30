# Data Validators

Comprehensive validation suite for all game data files.

## Available Validators

### 1. Plant Validator (`plant-validator.ts`)
Validates plant species definitions for:
- Required fields (id, name, category, biomes, rarity)
- Valid plant categories (crop, herb, tree, flower, etc.)
- Valid rarity levels (common, uncommon, rare, legendary)
- Genetics validation (growth rate, yield, disease resistance, etc.)
- Magical properties validation (universe types, magic type, potency)
- Medicinal properties validation
- Lifecycle and sprite validation

### 2. Item Validator (`item-validator.ts`)
Validates item definitions for:
- Required fields (id, name, category, stackable)
- Valid categories (resource, tool, weapon, food, etc.)
- Weight and durability validation
- Type-specific validation:
  - Food items: nutrition, spoilTime
  - Tools: toolType, efficiency, durability
  - Seeds: plantSpecies, growthTime
- Stack size validation

### 3. Spell Validator (`spell-validator.ts`)
Validates magic spell definitions for:
- Required fields (id, name, school, tier)
- Valid schools (elemental, life, mind, spirit, etc.)
- Tier validation (1-10)
- Cost validation (manaCost, castTime, cooldown)
- Range validation
- Components validation (item requirements)
- Effects validation (type, magnitude, duration, radius)
- Universe types for magical spells

### 4. Animal Validator (`animal-validator.ts`)
Validates animal species definitions for:
- Required fields (id, name, category, temperament, diet)
- Valid categories (livestock, wild, pet, working, predator, prey)
- Valid temperament (docile, neutral, aggressive, etc.)
- Valid diet types (herbivore, carnivore, omnivore, etc.)
- Social structure validation
- Activity pattern validation (diurnal, nocturnal, etc.)
- Lifecycle validation (infant, juvenile, adult, max age)
- Physical attributes (size, speed)
- Needs decay rates (hunger, thirst, energy)
- Taming validation (difficulty, preferred food)
- Temperature range validation
- Spawning validation (biomes, density)

### 5. Recipe Validator (`recipe-validator.ts`)
Validates crafting recipe definitions for:
- Required fields (id, name, category, description, ingredients, output)
- Valid categories (Tools, Weapons, Food, Materials, Building, Decorations)
- Ingredients validation (itemId, quantity > 0)
- Output validation (itemId, quantity > 0)
- Crafting time validation (non-negative)
- XP gain validation
- Skill requirements validation (skill type, level)
- Research requirements validation

### 6. Building Validator (`building-validator.ts`)
Validates building blueprint definitions for:
- Required fields (id, name, description, category, width, height)
- Valid categories (production, storage, residential, commercial, etc.)
- Dimensions validation (positive numbers)
- Resource costs validation (resourceId, amountRequired > 0)
- Tech and terrain requirements
- Skill requirements validation (skill type, level 0-5)
- Build time validation
- Tier validation (1-5)
- Functionality validation:
  - Crafting: recipes, speed
  - Storage: capacity, item types
  - Mood aura: radius, bonus
  - And many more function types
- Placement rules validation (rotation, grid snapping, foundation)

### 7. Summonable Entity Validator (`summonable-entity-validator.ts`)
Validates summonable entity definitions for:
- Required fields (id, name, category, rank, description, personality, demands)
- Valid categories (demon, devil, angel, spirit, fey, djinn, psychopomp, outsider, servitor)
- Valid ranks (lesser, common, greater, noble, prince, archetype)
- Power level validation (0-100)
- Personality validation:
  - Mortal attitude (contemptuous, curious, predatory, etc.)
  - Honesty (truthful, misleading, deceptive, literalist)
  - Patience, humor, motivation, voice
- Demands validation:
  - Valid demand types (payment, offering, concession)
  - Severity levels (trivial, minor, significant, major, extreme)
  - Negotiability
- Negotiation style validation
- Services validation (id, name, category, power cost)
- Contract types validation (duration, binding force)
- Appearance validation (base form, size, aura, sounds, smells)
- Summoning requirements validation
- Breach consequences validation

## Usage

### Running Individual Validators

Each validator can be imported and used independently:

```typescript
import { validatePlantSpecies } from './validators/plant-validator.js';
import { validateItem } from './validators/item-validator.js';

const errors = validatePlantSpecies(myPlant, 'plants/tomato.ts');
if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

### Running All Validators

Use the master validation script:

```bash
npm run validate-data
```

This will:
1. Scan all data directories for relevant files
2. Extract data objects from TypeScript files
3. Run appropriate validators on each object
4. Aggregate all errors and warnings
5. Print a comprehensive report
6. Exit with code 1 if errors found, 0 otherwise

## Error Severity Levels

- **error**: Critical validation failure that must be fixed
- **warning**: Non-critical issue that should be reviewed

## Adding New Validators

To add a new validator:

1. Create a new file in `scripts/validators/` (e.g., `creature-validator.ts`)
2. Implement the validator class following the pattern:
   ```typescript
   export interface ValidationError {
     file: string;
     entityId: string;
     field: string;
     message: string;
     severity: 'error' | 'warning';
   }

   export class YourValidator {
     private errors: ValidationError[] = [];

     validate(data: any, fileName: string): ValidationError[] {
       this.errors = [];
       // ... validation logic
       return this.errors;
     }

     private validateRequired(data: any, fileName: string, field: string) {
       if (!data[field] && data[field] !== false && data[field] !== 0) {
         this.addError(fileName, data.id || 'unknown', field,
           `Missing required field: ${field}`, 'error');
       }
     }

     private addError(file: string, id: string, field: string,
                      message: string, severity: 'error' | 'warning') {
       this.errors.push({ file, entityId: id, field, message, severity });
     }
   }

   export function validateYourType(data: any, fileName: string): ValidationError[] {
     const validator = new YourValidator();
     return validator.validate(data, fileName);
   }
   ```

3. Add your validator to `validate-all-data.ts` in the `VALIDATORS` array:
   ```typescript
   {
     pattern: '**/your-data/**/*.ts',
     validator: validateYourType,
     type: 'your_type',
     extractData: extractYourData,
   }
   ```

4. Implement the extraction function to parse your data from TypeScript files

## Validation Philosophy

Following CLAUDE.md guidelines:

- **No silent fallbacks**: Missing required fields are errors, not warnings
- **Fail fast**: Invalid data throws clear errors immediately
- **Type safety**: Validate enum values against known types
- **Range validation**: Check numeric values are within sensible bounds
- **Consistency checks**: Verify logical relationships (e.g., lifecycle stages < max age)
- **Clear messages**: Error messages explain what's wrong and how to fix it

## Integration

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run validate-data
```

### CI/CD Pipeline

Add to GitHub Actions or similar:
```yaml
- name: Validate game data
  run: npm run validate-data
```

### Development Workflow

Run validators after making data changes:
```bash
# Edit some plant species
vim packages/world/src/plant-species/magical-plants.ts

# Validate your changes
npm run validate-data

# Fix any errors
# Commit when validation passes
git commit -m "Add new magical plants"
```
