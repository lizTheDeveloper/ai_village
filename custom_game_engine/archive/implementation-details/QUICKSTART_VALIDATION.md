# Quick Start: Validation & Stable Build

## TL;DR

**Two new systems to prevent broken builds:**

1. **Validation** - Catches errors before they crash your server
2. **Stable Build** - Playable snapshot on different port

## 30-Second Setup

```bash
# Terminal 1: Start dev server
./start.sh

# Terminal 2: Start validation watcher (recommended)
npm run watch:validate

# When you have a working build:
npm run build:stable

# Terminal 3: Run stable build (optional)
cd demo-stable && npm run dev
```

**Result**:
- Port 3000: Development (might break)
- Port 3100: Stable (always works)
- Validation catches errors before rebuild

## Commands You Need

```bash
# Validation
npm run watch:validate          # Watch mode (recommended)
npm run validate:runtime core   # One-time check
npm run validate:blueprints     # Check for duplicates

# Stable Build
npm run build:stable            # Create snapshot
cd demo-stable && npm run dev   # Run it
```

## What It Catches

✅ **TypeScript errors** - Won't compile with errors
✅ **Duplicate blueprint IDs** - Like your "warehouse" bug
✅ **Invalid data files** - Plants, items, spells
✅ **Missing exports** - Package structure issues

**Example:**
```
❌ Blueprint ID: "warehouse" (found 2 times)
    - BuildingBlueprintRegistry.ts:1004
    - GovernanceBlueprints.ts:75  <-- CAUGHT BEFORE RUNTIME!
```

## Workflow

### Without Validation (Old Way)
```
Edit file → Build → Crash → Fix → Build → Crash → Fix...
❌ Can't play game while fixing
```

### With Validation (New Way)
```
Edit file → Validator catches error → Server keeps running
Fix error → Validation passes → Build proceeds
✅ Or play stable build while fixing
```

## Files Created

```
scripts/
  validate-package-runtime.ts   # Main validator
  validate-blueprints.ts         # Blueprint checker
  watch-validate.ts              # File watcher
  create-stable-build.ts         # Stable snapshots

Docs:
  VALIDATION.md                  # Full validation docs
  STABLE_BUILD.md                # Full stable build docs
  VALIDATION_SUMMARY.md          # Quick reference
  QUICKSTART_VALIDATION.md       # This file
```

## Next Steps

1. **Fix current errors** found by validator:
   - 5 duplicate blueprint IDs (warehouse, workshop, barn, watchtower, archive)
   - TypeScript error in RiddleBookMicrogenerator.ts

2. **Try validation watcher**:
   ```bash
   npm run watch:validate
   # Then edit a file and watch it validate automatically
   ```

3. **Create stable build**:
   ```bash
   npm run build:stable
   # Only works if validation passes
   ```

4. **Run both servers**:
   ```bash
   ./start.sh              # Port 3000 (dev)
   cd demo-stable && npm run dev  # Port 3100 (stable)
   # Now you can break dev while playing stable
   ```

## When to Use

### Use Validation Watcher When:
- ✅ Adding new content (plants, buildings, items)
- ✅ Refactoring systems
- ✅ Making large changes
- ✅ Working on multiple files

### Use Stable Build When:
- ✅ Want to play the game
- ✅ About to do risky refactoring
- ✅ Showing game to others
- ✅ End of coding session

### Skip When:
- ❌ Tiny one-line fixes
- ❌ Just reading code
- ❌ Working on isolated changes

## Full Documentation

- **VALIDATION.md** - Complete validation system docs
- **STABLE_BUILD.md** - Complete stable build docs
- **VALIDATION_AND_STABLE_BUILD_SUMMARY.md** - Combined overview

---

**That's it! Start with `npm run watch:validate` and you're set.**
