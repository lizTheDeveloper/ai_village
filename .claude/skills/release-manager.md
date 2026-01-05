# Release Manager Skill

**Skill ID:** `release-manager`
**Purpose:** Automate the commit, documentation, and release process for the AI Village project

## Overview

This skill handles the complete release workflow:
1. Review and stage changes
2. Create clear, descriptive commit messages
3. Update RELEASE_NOTES.md with recent changes
4. Commit and push to GitHub
5. Can be run periodically (user must manually trigger)

## Usage

```bash
# Invoke the skill
/skill release-manager

# Or directly in conversation
"Run the release manager process"
```

## Process Steps

### 1. Review Current Changes

```bash
# Check status and diffs in parallel
git status
git diff --staged
git diff
git log -5 --oneline
```

Analyze:
- Modified files (exclude .pid files and build artifacts)
- Untracked new files
- Deleted files
- Recent commit message style

### 2. Stage Changes

Exclude temporary/build files:
```bash
# DO NOT stage these:
# - *.pid files
# - **/tsconfig.tsbuildinfo
# - **/node_modules/**
# - Build output in dist/

# Stage meaningful changes
git add <files>
```

### 3. Update RELEASE_NOTES.md

**Location:** `/Users/annhoward/src/ai_village/RELEASE_NOTES.md`

**Format:**
```markdown
## YYYY-MM-DD - Brief Title

### Major Feature Category

#### Subcategory
- **FileName.ts** - Description of changes
- **AnotherFile.ts** - Description

### Another Category

...

---

## Previous Entry...
```

**Guidelines:**
- Add new entry at TOP of file (above previous entries)
- Use current date in format `YYYY-MM-DD`
- Group changes by logical category:
  - New Systems/Features
  - UI Enhancements
  - Core System Updates
  - Documentation
  - Infrastructure
  - Test Coverage
- Include file names in **bold**
- Note lines added/changed when significant
- Mention deleted systems/files
- Reference new documentation files in devlogs/

**Categories to look for:**
- Animation System
- LLM/AI Provider Management
- Soul/Divine Systems
- PixelLab Sprite Assets
- 3D Rendering
- UI Panels/Components
- Building Systems
- Documentation Updates
- Test Coverage
- Infrastructure/Scripts

### 4. Create Commit Message

**Format:**
```
<type>: <brief summary>

<detailed description>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `perf:` - Performance improvement
- `refactor:` - Code refactoring
- `docs:` - Documentation updates
- `test:` - Test additions/changes
- `chore:` - Build process, dependencies

**Examples:**
```
feat: Add animation system and soul repository persistence

- Implement AnimationComponent and AnimationSystem for sprite animations
- Add SoulAnimationProgressionSystem for progressive unlocks
- Create LLM provider routing with ProviderPoolManager
- Add soul repository API endpoints for server-side persistence
- Expand PixelLab sprite library with buildings, items, and objects
- Add TechTreePanel UI and enhance DevPanel with click-to-place
- Update CLAUDE.md with Debug Actions API documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 5. Commit and Push

```bash
# Commit with heredoc for proper formatting
git commit -m "$(cat <<'EOF'
<commit message here>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Verify commit
git log -1 --format='[%h] (%an <%ae>) %s'

# Push to remote
git push origin main
```

### 6. Confirm Completion

Output summary:
```
✅ Release Manager Process Complete

Commit: <hash> - <message>
Files changed: <count>
Lines added: +<count>
Lines removed: -<count>
RELEASE_NOTES.md: Updated with <section-title>
Pushed to: origin/main
```

## Important Notes

### Exclusions

**NEVER commit these:**
- `.pid` files (`.api-server.pid`, `.dev-server.pid`, `.pixellab-daemon.pid`)
- Build artifacts (`tsconfig.tsbuildinfo`, `*.js` in `src/` directories)
- `node_modules/`
- IDE files (`.vscode/`, `.idea/`)
- Secrets (`.env`, `credentials.json`)

### Safety Checks

Before committing:
1. Verify no secrets in staged files
2. Check that build passes: `npm run build`
3. Ensure no runtime errors in browser console
4. Confirm changes are intentional (no accidental deletions)

### Git Safety Protocol

- NEVER update git config
- NEVER run destructive git commands without user confirmation
- NEVER skip hooks (--no-verify)
- NEVER force push to main/master
- Always check authorship before amending

### Periodic Execution

**User requested:** Commit every 5 minutes for next hour

**Important:** Claude Code cannot automatically execute tasks on a timer. Options:

1. **Manual trigger:** User asks "run release manager" every 5 minutes
2. **Cron job:** User creates a cron job to trigger commits
3. **Git hooks:** Use git hooks to auto-commit on file changes
4. **Watch script:** User creates a bash script with a loop

**Recommended approach for periodic commits:**

```bash
# Create a watch script
#!/bin/bash
# watch-and-commit.sh

for i in {1..12}; do
  echo "Round $i of 12..."

  # Ask Claude Code to run release manager
  # (User would need to trigger this manually or via automation)

  # Wait 5 minutes
  sleep 300
done
```

## Release Notes Template

Use this template when updating RELEASE_NOTES.md:

```markdown
## YYYY-MM-DD - Title

### Category Name

#### Subcategory
- **File.ts** (+XX lines) - Description
- **AnotherFile.ts** - Description
- List of related changes

### Another Category

#### Subcategory
- Changes here

### Documentation

#### Developer Guides
- **GUIDE_NAME.md** - Description

#### Session Devlogs
- **DEVLOG_YYYY-MM-DD.md** - What was accomplished

### Infrastructure

- Script changes
- Config updates
- Dependency changes

---
```

## Workflow Example

**User:** "Run the release manager process"

**Claude:**
1. ✅ Check git status (3 modified, 15 new files)
2. ✅ Exclude .pid files and build artifacts
3. ✅ Stage meaningful changes (18 files)
4. ✅ Update RELEASE_NOTES.md with new section
5. ✅ Draft commit message: "feat: Add animation system..."
6. ✅ Commit changes
7. ✅ Push to origin/main
8. ✅ Summary:
   - Commit: abc1234 - feat: Add animation system...
   - Files changed: 18
   - RELEASE_NOTES.md updated
   - Pushed successfully

**Next:** User can trigger again in 5 minutes, or set up automation

## Related Skills

- `pixellab` - Manage PixelLab sprite generation daemon
- `actions-api` - Debug game state via browser console API

## Troubleshooting

**Issue:** "Nothing to commit"
- Check if changes were already committed
- Verify files aren't in .gitignore
- Look for unstaged changes

**Issue:** "Commit failed - pre-commit hook"
- Fix linting/formatting errors
- Re-run commit after fixes
- Check hook output for details

**Issue:** "Push rejected"
- Pull latest changes: `git pull origin main`
- Resolve conflicts if any
- Re-push

**Issue:** "Release notes unclear"
- Read recent git diffs to understand changes
- Check file purposes from imports/exports
- Review recent commit messages for context
- Ask user for clarification on major features
