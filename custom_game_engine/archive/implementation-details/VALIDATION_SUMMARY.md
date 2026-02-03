# Package Validation System - Summary

## What It Does

**Prevents broken code from crashing your running server** by validating changes before rebuild.

## Installation Complete

The validation system is now installed and ready to use:

✅ **Blueprint validator** - Catches duplicate building IDs at build time
✅ **Package-specific validation** - Each package has custom validators
✅ **Watch mode** - Continuous validation as you edit files
✅ **TypeScript checking** - No type errors allowed
✅ **Data validation** - JSON files must be valid

## Quick Start

### Option 1: Watch Mode (Recommended)

Run this alongside your dev server:

```bash
# Terminal 1: Validation watcher
cd custom_game_engine
npm run watch:validate

# Terminal 2: Dev server
./start.sh
```

### Option 2: One-Time Validation

```bash
npm run validate:runtime core      # Validate core package
npm run validate:runtime renderer  # Validate renderer
npm run validate:blueprints        # Just check blueprints
```

## What Gets Validated

### All Packages
- ✅ TypeScript compilation (`tsc --noEmit`)
- ✅ Package exports (index.ts exists)

### Core Package (Extra Checks)
- ✅ Building blueprints (no duplicate IDs)
- ✅ Plant data (JSON validation)
- ✅ Item/spell data (integrity checks)

### Other Packages
- 🚧 Renderer: Asset validation (coming soon)
- 🚧 LLM: Prompt template validation (coming soon)
- 🚧 World: Entity schema validation (coming soon)

## Example: Blueprint Duplicates Caught

The validator immediately caught 5 duplicate blueprint IDs:

```
❌ Found 5 duplicate blueprint IDs:

  Blueprint ID: "workshop" (found 2 times)
    - BuildingBlueprintRegistry.ts:789
    - StandardVoxelBuildings.ts:332

  Blueprint ID: "barn" (found 2 times)
    - BuildingBlueprintRegistry.ts:828
    - StandardVoxelBuildings.ts:406

  Blueprint ID: "warehouse" (found 2 times)
    - BuildingBlueprintRegistry.ts:1004
    - GovernanceBlueprints.ts:75  <-- THIS ONE CRASHED YOUR SERVER

  Blueprint ID: "watchtower" (found 2 times)
    - BuildingBlueprintRegistry.ts:1591
    - GovernanceBlueprints.ts:190

  Blueprint ID: "archive" (found 2 times)
    - BuildingBlueprintRegistry.ts:1656
    - GovernanceBlueprints.ts:243
```

**Before**: These caused runtime crashes when registering blueprints
**After**: Caught at validation time, server keeps running

## How It Prevents Runtime Errors

### Before (Runtime Error)
```
1. Edit GovernanceBlueprints.ts → Add "warehouse" building
2. TypeScript rebuilds automatically
3. Server reloads
4. ❌ CRASH: "Blueprint with id 'warehouse' already registered"
5. Fix error → Save again
6. Rebuild → Crash again (different error)
7. Repeat until all errors fixed
```

### After (Validation Catches It)
```
1. Edit GovernanceBlueprints.ts → Add "warehouse" building
2. ⏱️  Validator debounces (waits 1s)
3. 🔍 Runs validation
4. ❌ Shows error: "Duplicate blueprint ID: warehouse"
5. ✅ Server keeps running with old code
6. Fix error → Save again
7. ✅ Validation passes → Rebuild proceeds
8. ✅ Server updates with new code
```

## Files Created

```
scripts/
  validate-package-runtime.ts   # Main validator (runs TS + package checks)
  validate-blueprints.ts         # Blueprint duplicate checker
  watch-validate.ts              # File watcher for continuous validation

VALIDATION.md                    # Full documentation
```

## What You Should Do Next

1. **Fix the duplicate blueprints** - Rename them to unique IDs
2. **Run validation before commits** - `npm run validate:runtime core`
3. **Use watch mode during development** - Catch errors as you type

## Extending the System

To add validation for other packages, edit `validate-package-runtime.ts`:

```typescript
case 'your-package':
  console.log('🔧 Validating your package...');

  // Add your validation logic
  try {
    execSync('npm run your-custom-validator', {
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error: any) {
    errors.push(`Your validation failed: ${error.message}`);
  }
  break;
```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/validate.yml
- name: Validate packages
  run: |
    npm run validate:runtime core
    npm run validate:runtime renderer
    npm run validate:runtime llm
```

## Performance

- **Debouncing**: Waits 1 second after last change before validating
- **Per-package**: Only validates the changed package
- **Parallel safe**: Won't run multiple validations of same package
- **Fast feedback**: Validation takes 2-5 seconds (vs rebuild crash + fix cycle)

## Troubleshooting

### Validation is too slow
- Adjust `DEBOUNCE_MS` in `watch-validate.ts` (default: 1000ms)
- Skip package-specific validation for packages you're not changing

### Validator shows false positive
- File an issue with the specific case
- Temporarily stop the watcher if needed

### Want to skip validation temporarily
- Just stop the watch validator (`Ctrl+C`)
- Continue editing normally
- Rebuild will proceed (but might crash if errors exist)
