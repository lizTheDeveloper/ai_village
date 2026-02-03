# Stable Build System

**Problem**: While developing, you might break the game. You want a stable version you can always play.

**Solution**: Create a "stable build" snapshot that runs on different ports, isolated from active development.

## How It Works

### Two Environments

```
Port 3000-3002 (Development)     Port 3100-3102 (Stable)
├─ demo/                         ├─ demo-stable/
├─ Active development            ├─ Snapshot of working build
├─ Might break while coding      ├─ Always works
├─ Hot Module Reload (HMR)       ├─ No live changes
└─ For development               └─ For playing
```

### Workflow

```
1. Work on dev build (port 3000)
   ├─ Edit files
   ├─ Validation catches errors
   └─ Fix until validation passes

2. Create stable build (when ready)
   ├─ npm run build:stable
   ├─ Validates all packages
   ├─ Builds all packages
   └─ Copies to demo-stable/

3. Run both at once
   ├─ Terminal 1: Dev build (port 3000) - work here
   ├─ Terminal 2: Stable build (port 3100) - play here
   └─ Both independent
```

## Commands

### Create Stable Build

```bash
npm run build:stable
```

This will:
1. ✅ Validate all packages (core, renderer, llm, world)
2. ✅ Build all packages with TypeScript
3. ✅ Copy demo/ to demo-stable/
4. ✅ Update ports to 3100 (game) and 8767 (metrics)
5. ✅ Copy all built packages

**If validation fails, stable build is NOT created.** Fix errors first.

### Run Stable Build

```bash
cd demo-stable
npm install    # First time only
npm run dev    # Runs on port 3100
```

**Or both at once:**

```bash
# Terminal 1: Development build
cd custom_game_engine
./start.sh     # Port 3000

# Terminal 2: Stable build
cd custom_game_engine/demo-stable
npm run dev    # Port 3100
```

### Update Stable Build

When you've made progress and want to update the stable version:

```bash
npm run build:stable   # Creates new snapshot
```

The old demo-stable/ is replaced with the new working version.

## Example Session

### Initial Setup

```bash
# Create first stable build
npm run build:stable

# Output:
🏗️  Creating Stable Build
============================================================

Step 1/3: Validation
🔍 Validating all packages...
Validating core...
✅ All packages validated

Step 2/3: Building packages
📦 Building all packages...
✅ Build successful

Step 3/3: Creating stable snapshot
📋 Creating stable build...
Copying demo/ to demo-stable/...
Updating Vite config to use port 3100...
✅ Stable build created successfully!

✨ Stable build ready!
You can now:
  - Keep developing on port 3000 (might break)
  - Play stable build on port 3100 (always works)
```

### Running Both

```bash
# Terminal 1: Start development build
./start.sh
# → Opens browser at http://localhost:3000

# Terminal 2: Start stable build
cd demo-stable && npm run dev
# → Opens browser at http://localhost:3100
```

Now you can:
- 🎮 **Play on port 3100** - The stable, working version
- 💻 **Develop on port 3000** - Edit code, test features, might break

### Breaking the Dev Build (Safe)

```bash
# Terminal 1 (dev build running on port 3000)
# Edit GovernanceBlueprints.ts, add duplicate "warehouse"

# Validation catches it:
❌ [core] Validation FAILED
Duplicate blueprint ID: warehouse

# Server on port 3000 keeps running with old code
# Server on port 3100 still works fine (stable)

# Fix the error
# Edit GovernanceBlueprints.ts, rename to "storage-warehouse"

# Validation passes:
✅ [core] Validation passed - rebuild can proceed

# Port 3000 updates with new code
# Port 3100 still on old stable build (unaffected)
```

### Promoting Dev to Stable

When dev build is working well and you want to update stable:

```bash
# Dev build is working on port 3000
npm run build:stable

# New stable snapshot created
# Port 3100 now has the latest working version

# Continue developing on port 3000
```

## Ports Reference

| Service | Development | Stable |
|---------|-------------|--------|
| Game    | 3000-3002  | 3100-3102 |
| Metrics | 8766       | 8767      |

## Directory Structure

```
custom_game_engine/
├── demo/                  # Development build
│   ├── src/
│   ├── package.json
│   └── vite.config.ts     # Port 3000
│
├── demo-stable/           # Stable build (created by build:stable)
│   ├── src/               # Snapshot of demo/src
│   ├── package.json
│   └── vite.config.ts     # Port 3100
│
└── packages/              # Shared by both
    ├── core/
    ├── renderer/
    ├── llm/
    └── world/
```

## When to Create Stable Build

✅ **Good times to create stable build:**
- After implementing a major feature
- Before starting risky refactoring
- At the end of a coding session
- When you want to play the game
- Before showing the game to others

❌ **Don't create stable build when:**
- Validation is failing
- Build is broken
- You're in the middle of a feature
- Tests are failing

## Comparison to Other Approaches

### vs. Git Branches

| Git Branch | Stable Build |
|------------|--------------|
| Requires commit | No commit needed |
| Switch between | Run both at once |
| Share with team | Local only |
| Version control | Quick snapshot |

### vs. Manual Backup

| Manual Backup | Stable Build |
|---------------|--------------|
| Copy/paste manually | One command |
| Forget to update ports | Ports auto-updated |
| Risk of running same port | Different ports enforced |
| No validation check | Validates before creating |

## Troubleshooting

### "Validation failed" when running build:stable

**Cause**: Current code has errors (TypeScript, duplicates, etc.)

**Fix**: Run validation manually to see errors:
```bash
npm run watch:validate   # Shows errors in real-time
# Fix errors
npm run build:stable     # Retry
```

### "Port 3100 already in use"

**Cause**: Stable build is already running

**Fix**:
```bash
# Stop stable build
cd demo-stable
# Ctrl+C to stop, or:
lsof -ti:3100 | xargs kill -9
```

### "demo-stable/ not found"

**Cause**: Haven't created stable build yet

**Fix**:
```bash
npm run build:stable     # Create first stable build
```

### Changes in dev build appear in stable build

**Cause**: Both are using same packages/ (they share built code)

**Effect**: This is intentional - both use the same compiled packages. Only demo/ vs demo-stable/ code is different.

**Workaround**: If you need fully isolated builds, copy packages/ to demo-stable/../packages-stable/ and update imports.

## Advanced: Fully Isolated Stable Build

If you need complete isolation (not recommended for normal use):

```bash
# Copy packages too (warning: doubles disk usage)
cp -r packages packages-stable

# Update demo-stable imports to use packages-stable
# (manual process, not automated)
```

This is rarely needed. The default shared-packages approach is fine for most development.

## Integration with Version Control

The stable build is **not committed to git**. It's a local-only snapshot.

Add to `.gitignore`:
```
demo-stable/
packages-stable/
```

Why? Because:
- It's a build artifact, not source code
- Each developer can have their own stable snapshots
- It would double the repo size
- Git branches are better for shared snapshots

## Summary

**Stable build** = Snapshot of working version that runs on different ports

**Use it to**:
- Play the game while developing
- Have a fallback if you break something
- Show stable version to others while coding

**Don't use it for**:
- Version control (use git)
- Sharing with team (use git)
- Production deployment (use proper build process)

It's a **development tool**, not a deployment strategy.
