# Package Validation System

**Problem**: When you edit a file (like adding a new plant), the TypeScript build rebuilds automatically. If your code has errors, the rebuild breaks and crashes the running server.

**Solution**: Pre-validate packages before they rebuild, so you get fast feedback without breaking your running server.

## How It Works

The validation system runs in a separate terminal and watches your package files. When you save a file:

1. **Debounce** - Waits 1 second for more changes (so you can keep typing)
2. **Type-check** - Runs `tsc --noEmit` to check TypeScript errors
3. **Check exports** - Validates package.json and index.ts
4. **Data validation** - For core package, validates JSON data files
5. **Show results** - If invalid, shows errors; if valid, allows rebuild to proceed

## Usage

### Watch Mode (Recommended for Development)

Run this alongside your dev server:

```bash
# Terminal 1: Validation watcher
cd custom_game_engine
npm run watch:validate

# Terminal 2: Dev server (as usual)
cd custom_game_engine
./start.sh
```

The validator will:
- ✅ Show validation status for each package on startup
- 👀 Watch for file changes
- ⏱️ Debounce validation (waits 1s after last change)
- ❌ Show errors immediately without crashing your server
- ✅ Allow rebuild only when validation passes

### One-Time Validation

Validate a single package before committing:

```bash
npm run validate:runtime core
npm run validate:runtime renderer
npm run validate:runtime llm
# etc.
```

## Example Workflow

**Scenario**: You're adding a new plant species to the core package.

```typescript
// packages/core/src/data/plants.json
{
  "deadly_nightshade": {
    "name": "Deadly Nightshade",
    "growth_time": -10,  // ❌ Invalid: negative growth time
    // ...
  }
}
```

**Without validation watcher**:
1. Save file → TypeScript rebuilds → Server crashes
2. Fix error → Save again → Rebuilds → Crashes again (different error)
3. Repeat until all errors fixed

**With validation watcher**:
1. Save file → Validator runs → Shows error immediately
2. Server keeps running with old code
3. Fix error → Save again → Validator passes → Rebuild proceeds
4. Server updates with new code

## Terminal Output Example

```
👀 Watching packages for changes...

📝 [10:23:45] packages/core/src/data/plants.json changed
⏱️  [core] Validation scheduled (waiting for more changes...)

⏳ [10:23:46] Validating core...

📝 Checking TypeScript compilation...
📦 Checking package exports...
📊 Validating data files...

❌ [core] Validation FAILED

Errors:
  Data validation failed:
  Plant 'deadly_nightshade' has invalid growth_time: -10 (must be > 0)

Fix the errors above, then save again to retry validation.

📝 [10:24:12] packages/core/src/data/plants.json changed
⏱️  [core] Validation scheduled (waiting for more changes...)

⏳ [10:24:13] Validating core...

📝 Checking TypeScript compilation...
📦 Checking package exports...
📊 Validating data files...

✅ [core] Validation passed - rebuild can proceed
```

## Integration with Existing Tools

The validation system uses existing infrastructure:

- **TypeScript** - `tsc --noEmit` for type checking
- **Data validators** - `npm run validate-data` for core package
- **Plant validators** - `npm run validate-plants` for plant data

It just orchestrates them and provides watch mode.

## What Gets Validated

### All Packages
- ✅ TypeScript compilation (no type errors)
- ✅ Package exports (index.ts exists and exports things)

### Core Package (Extra Validation)
- ✅ Plant data files (via `validate-plants`)
- ✅ Item data files
- ✅ Spell data files
- ✅ All JSON data integrity

### Future Enhancements

The validation system can be extended to:

- **Runtime simulation** - Actually instantiate systems and run them for 1 tick
- **Component validation** - Check that all components have required fields
- **Cross-package validation** - Ensure imports from other packages are valid
- **Performance checks** - Warn if a system is too slow

## When to Use

**Use validation watcher when**:
- Adding new content (plants, items, spells, etc.)
- Refactoring systems
- Working on data files
- Making large changes across multiple files

**Skip validation watcher when**:
- Making tiny one-line fixes
- Just reading code (not editing)
- Working on isolated, self-contained changes

## Troubleshooting

### Validator shows "TypeScript compilation failed"
- Fix the TypeScript errors shown
- Save again to retry validation

### Validator shows "Data validation failed"
- Fix the data integrity errors (invalid JSON, missing fields, etc.)
- Check the error message for specific issues
- Save again to retry

### Validator passes but server still crashes
- The validator only checks pre-build errors
- Runtime errors (like logic bugs) still happen at runtime
- Use the debugger or console logs to diagnose

### Validation is too slow
- Adjust `DEBOUNCE_MS` in `scripts/watch-validate.ts` (default: 1000ms)
- Disable data validation for non-core packages if needed

## Technical Details

### File Structure

```
scripts/
  validate-package-runtime.ts  # One-time validation script
  watch-validate.ts             # Watch mode validator
```

### How It Works

1. **File watcher** (`chokidar`) watches `packages/*/src/**/*.ts`
2. **Debouncing** - Multiple rapid changes trigger only one validation
3. **Per-package validation** - Only validates the changed package
4. **Parallel safety** - Won't run multiple validations of same package concurrently
5. **State tracking** - Remembers which packages are valid/invalid

### Adding Custom Validators

Extend `PackageValidator` in `validate-package-runtime.ts`:

```typescript
class PackageValidator {
  async validate(): Promise<ValidationResult> {
    // ... existing checks ...

    // Add your custom check
    const customResult = await this.customCheck();
    if (!customResult.valid) {
      result.valid = false;
      result.errors.push(...customResult.errors);
    }

    return result;
  }

  private async customCheck(): Promise<ValidationResult> {
    // Your validation logic here
    return { valid: true, errors: [], warnings: [] };
  }
}
```

## FAQ

**Q: Does this replace TypeScript's `tsc --watch`?**
A: No, it runs alongside it. The validator checks your code *before* the rebuild, giving you faster feedback.

**Q: Can I run validation on every save automatically?**
A: Yes! That's exactly what `npm run watch:validate` does.

**Q: Will this slow down my development?**
A: No. Validation is debounced and runs in parallel with your workflow. You get errors faster than waiting for a broken rebuild.

**Q: What if validation is wrong (false positive)?**
A: File an issue with the specific case, and we'll fix the validator. You can also skip validation temporarily by stopping the watcher.
