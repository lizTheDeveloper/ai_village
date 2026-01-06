# Validation & Stable Build System - Complete Summary

## What We Built

Two interconnected systems to prevent broken builds from disrupting development:

### 1. Package Validation System
**Catches errors at build time, before they crash your server**

### 2. Stable Build System
**Creates isolated snapshots you can play while developing**

---

## System 1: Package Validation

### The Problem

```
Before:
Edit file → TypeScript rebuilds → Server reloads → ❌ CRASH
"Blueprint with id 'warehouse' already registered"
```

### The Solution

```
After:
Edit file → Validator runs → ❌ Shows error → ✅ Server keeps running
Fix error → Save again → ✅ Validation passes → Rebuild proceeds
```

### What Gets Validated

**All Packages:**
- ✅ TypeScript compilation (`tsc --noEmit`)
- ✅ Package exports (index.ts exists)

**Core Package:**
- ✅ Blueprint duplicates (caught the "warehouse" bug!)
- ✅ Plant data validation
- ✅ Item/spell data integrity

**Other Packages:**
- 🚧 Renderer: Asset validation (TODO)
- 🚧 LLM: Prompt template validation (TODO)
- 🚧 World: Entity schema validation (TODO)

### Commands

```bash
# Watch mode (recommended - run alongside dev server)
npm run watch:validate

# One-time validation
npm run validate:runtime core
npm run validate:blueprints
```

### Example Output

```bash
🔍 Validating building blueprints...
Found 90 total blueprints

❌ Found 5 duplicate blueprint IDs:

  Blueprint ID: "warehouse" (found 2 times)
    - BuildingBlueprintRegistry.ts:1004
    - GovernanceBlueprints.ts:75  <-- YOUR BUG

  Blueprint ID: "workshop" (found 2 times)
  Blueprint ID: "barn" (found 2 times)
  Blueprint ID: "watchtower" (found 2 times)
  Blueprint ID: "archive" (found 2 times)
```

**These errors are now caught BEFORE runtime!**

---

## System 2: Stable Build

### The Problem

```
You break the dev build while coding → Can't play the game anymore
Need to revert changes or fix immediately → Interrupts flow
```

### The Solution

```
Port 3000: Development build (might break)
Port 3100: Stable build (always works)

Break dev build? No problem - play on stable while you fix it.
```

### How It Works

```bash
# Create stable snapshot (only when validation passes)
npm run build:stable

# Runs on ports:
Development: 3000 (game), 8766 (metrics)
Stable:      3100 (game), 8767 (metrics)

# Run both at once:
Terminal 1: ./start.sh               # Dev build
Terminal 2: cd demo-stable && npm run dev  # Stable
```

### What It Does

1. ✅ Validates all packages (core, renderer, llm, world)
2. ✅ Builds all packages
3. ✅ Copies demo/ to demo-stable/
4. ✅ Updates ports to 3100/8767
5. ✅ Creates isolated snapshot

**If validation fails, stable build is NOT created.**

---

## Complete Workflow

### Initial Setup

```bash
# 1. Create first stable build
npm run build:stable

# 2. Start both servers
# Terminal 1: Development
./start.sh

# Terminal 2: Validation watcher
npm run watch:validate

# Terminal 3: Stable build (optional)
cd demo-stable && npm run dev
```

### Development Cycle

```
1. Edit files (port 3000)
   ↓
2. Validator runs automatically
   ├─ If valid → Rebuild proceeds
   └─ If invalid → Shows errors, server keeps running
   ↓
3. Fix errors until validation passes
   ↓
4. Test on dev build (port 3000)
   ↓
5. When ready: npm run build:stable
   ↓
6. Play stable version (port 3100)
```

### Example: Adding a New Plant

```bash
# Edit packages/core/src/data/plants.json
{
  "magic_bean": {
    "name": "Magic Bean",
    "growth_time": -5  // ❌ Oops! Negative
  }
}

# Save file
# Validation runs:
❌ [core] Validation FAILED
Plant 'magic_bean' has invalid growth_time: -5 (must be > 0)

# Server on port 3000: Still running with old code ✅
# Server on port 3100: Unaffected, still playable ✅

# Fix the error
"growth_time": 50  // ✅ Fixed

# Save again
# Validation runs:
✅ [core] Validation passed - rebuild can proceed

# Dev server updates with new code
# Stable server still on old snapshot (until you run build:stable)
```

---

## Files Created

```
custom_game_engine/
├── scripts/
│   ├── validate-package-runtime.ts  # Main validator
│   ├── validate-blueprints.ts       # Blueprint duplicate checker
│   ├── watch-validate.ts            # File watcher for validation
│   └── create-stable-build.ts       # Stable build creator
│
├── VALIDATION.md                    # Validation system docs
├── VALIDATION_SUMMARY.md            # Quick reference
├── STABLE_BUILD.md                  # Stable build docs
└── VALIDATION_AND_STABLE_BUILD_SUMMARY.md  # This file

demo-stable/                         # Created by npm run build:stable
└── (snapshot of demo/, runs on port 3100)
```

---

## Commands Reference

### Validation

```bash
# Watch mode (recommended)
npm run watch:validate              # All packages

# One-time validation
npm run validate:runtime core       # Validate core package
npm run validate:runtime renderer   # Validate renderer
npm run validate:blueprints         # Just blueprints
npm run validate-data               # Just data files
```

### Stable Build

```bash
# Create/update stable build
npm run build:stable

# Run stable build
cd demo-stable && npm run dev

# Check what's running
./start.sh status
```

### Development

```bash
# Normal development (port 3000)
./start.sh

# With validation watcher (recommended)
# Terminal 1:
./start.sh
# Terminal 2:
npm run watch:validate

# With stable build too (all three)
# Terminal 1:
./start.sh
# Terminal 2:
npm run watch:validate
# Terminal 3:
cd demo-stable && npm run dev
```

---

## What This Solves

### Before

❌ Edit file → Build crashes → Can't play game
❌ Runtime errors ("warehouse already registered")
❌ Only discover errors when server starts
❌ Break game while developing

### After

✅ Edit file → Validation catches errors → Server keeps running
✅ Build-time errors (duplicates caught before runtime)
✅ Discover errors as you type (watch mode)
✅ Play stable version while developing

---

## Integration Points

### With Git

```bash
# Validation as pre-commit hook
.husky/pre-commit:
  npm run validate:runtime core
  npm run validate:blueprints
```

### With CI/CD

```yaml
# .github/workflows/validate.yml
- name: Validate packages
  run: |
    npm run validate:runtime core
    npm run validate:runtime renderer
    npm run validate:runtime llm
```

### With Testing

```bash
# Run validation before tests
npm run test
# Already includes: npm run validate-data && vitest run
```

---

## Current Status

### ✅ Implemented

- Package validation system (all packages)
- Blueprint duplicate detection
- Data validation (plants, items, spells)
- Watch mode for continuous validation
- Stable build creation
- Port isolation (3000 vs 3100)

### 🚧 TODO

- Renderer asset validation
- LLM prompt template validation
- World entity schema validation
- Runtime simulation (actually instantiate systems)
- Pre-commit hooks integration

### 🐛 Known Issues to Fix

**Found by validation:**
- 5 duplicate blueprint IDs:
  - `warehouse` (BuildingBlueprintRegistry + GovernanceBlueprints)
  - `workshop` (BuildingBlueprintRegistry + StandardVoxelBuildings)
  - `barn` (BuildingBlueprintRegistry + StandardVoxelBuildings)
  - `watchtower` (BuildingBlueprintRegistry + GovernanceBlueprints)
  - `archive` (BuildingBlueprintRegistry + GovernanceBlueprints)

**Fix by renaming duplicates in GovernanceBlueprints.ts:**
- `warehouse` → `resource-warehouse` or `granary-warehouse`
- `watchtower` → `guard-watchtower` or `security-tower`
- `archive` → `records-archive` or `document-vault`

---

## FAQ

### Q: Do I need to run validation watcher?
**A**: Recommended but optional. It gives you faster feedback, but validation also runs when you do `build:stable`.

### Q: Can I skip validation temporarily?
**A**: Yes, just don't run the watcher. But you won't be able to create a stable build until validation passes.

### Q: Does stable build affect my development?
**A**: No. It's completely isolated - different directory, different ports. You can delete demo-stable/ anytime.

### Q: How often should I create stable builds?
**A**: Whenever you have a working version you want to preserve. Maybe once per session, or after major features.

### Q: What if I want to go back to an old stable build?
**A**: Use git for version control. Stable build is just a quick snapshot, not version history.

### Q: Can I commit demo-stable/ to git?
**A**: Not recommended. It's a build artifact. Use git branches for shareable snapshots.

---

## Next Steps

1. **Fix duplicate blueprints** (found by validator)
2. **Try the validation watcher**: `npm run watch:validate`
3. **Create first stable build**: `npm run build:stable`
4. **Run both servers** and see isolation in action

---

## Summary

**Validation System** prevents errors from reaching runtime
**Stable Build** lets you play while developing

Together: **Never lose ability to play your game while coding**

🎮 **Happy developing!**
