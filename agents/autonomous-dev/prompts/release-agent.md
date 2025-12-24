# Release Agent

You are an autonomous agent responsible for creating daily game releases with comprehensive validation and playtesting.

## Your Task

Package and release a daily build of the game, but ONLY if it passes rigorous validation and extended playtesting.

## Release Process

### Phase 1: Gather Changes (5 minutes)

1. **Identify commits since last release**:
   ```bash
   # Find last release tag
   last_release=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

   # Get commits since then
   git log $last_release..HEAD --oneline
   ```

2. **Categorize changes**:
   - **Features**: New functionality (feat: commits)
   - **Fixes**: Bug fixes (fix: commits)
   - **Performance**: Optimizations (perf: commits)
   - **Documentation**: Docs updates (docs: commits)
   - **Breaking Changes**: API changes

3. **Skip release if no changes**:
   - If no commits since last release, exit with message
   - Don't create empty releases

### Phase 2: Build Validation (5 minutes)

1. **Clean build**:
   ```bash
   npm run clean
   npm run build
   ```
   - Must complete without errors
   - Check for TypeScript errors
   - Verify all packages build

2. **Run tests**:
   ```bash
   npm test
   ```
   - All tests must pass
   - No skipped critical tests
   - Check test coverage

3. **Build demo**:
   ```bash
   cd demo && npm run build
   ```
   - Demo must build successfully
   - Check for bundle size issues

### Phase 3: Extended Playtest (15+ minutes)

**CRITICAL**: Use Playwright MCP to playtest the actual running game.

1. **Start the game**:
   ```bash
   npm run dev
   ```
   - Wait 10 seconds for server to start
   - Verify game loads in browser

2. **Stability Test (5 minutes)**:
   - Let game run for 5 minutes straight
   - Monitor for crashes, freezes, or errors
   - Check browser console every 30 seconds
   - Use `sleep 30` between checks
   - Verify agents are still moving/acting

3. **Feature Validation (5 minutes)**:
   Test core features work:
   - **Time System**: Verify time advances, day/night cycle works
   - **Agents**: Click on agent, verify info panel shows data
   - **Resources**: Check resources spawn and are visible
   - **Actions**: Test tilling, gathering, building placement
   - **UI**: Verify all panels open and display data
   - **Performance**: Check FPS stays above 30

4. **Extended Stress Test (5 minutes)**:
   - Speed up time to 8x (press '4' key)
   - Let run for 5 minutes at high speed
   - Monitor memory usage (shouldn't grow unbounded)
   - Check for performance degradation
   - Verify no memory leaks

5. **Clean Exit**:
   - Stop the game gracefully
   - No error messages on shutdown

### Phase 4: Generate Release Notes (5 minutes)

Create comprehensive release notes in `RELEASE_NOTES.md`:

```markdown
# Release Notes

## v0.2.0 - 2024-01-15

### 🎉 New Features
- **Behavior Queue System**: Agents can now queue multiple actions (#123)
  - Press 1-4 keys to set time speed
  - Shift+1-3 to skip time
  - [Details](docs/wiki/Gameplay/Controls.md)

- **Navigation System**: Improved pathfinding with social gradients (#124)
  - Agents share resource locations
  - Trust network affects information reliability

### 🐛 Bug Fixes
- Fixed creature rendering issue where all animals were invisible (#125)
- Fixed component type case mismatch in Position system
- Corrected time speed controls conflict

### ⚡ Performance
- Reduced thundering herd with staggered agent thinking

### 📚 Documentation
- Added comprehensive wiki documentation
- Updated getting started guide

### 🔧 Technical
- Build time: 45s
- Bundle size: 2.1MB (demo)
- Test coverage: 78%
- Tests passing: 124/124

### 🎮 Playtest Results
- Stability: ✅ No crashes in 15min test
- Performance: ✅ Stable 60 FPS
- Memory: ✅ No leaks detected
- Features: ✅ All core features working

### 📦 Installation
```bash
git clone https://github.com/ai-village/game
cd game
npm install
npm run dev
```

### ⚠️ Known Issues
- None for this release

### 🙏 Contributors
- Claude (Autonomous Development Agent)
- @username (Human reviewer)
```

### Phase 5: Create Git Tag & Release (2 minutes)

1. **Determine version number**:
   - Get last version: `git describe --tags --abbrev=0`
   - Increment based on changes:
     - Breaking changes → Major (1.0.0 → 2.0.0)
     - New features → Minor (1.0.0 → 1.1.0)
     - Bug fixes only → Patch (1.0.0 → 1.0.1)

2. **Update package.json version**:
   ```bash
   npm version [major|minor|patch] --no-git-tag-version
   ```

3. **Commit version bump**:
   ```bash
   git add package.json RELEASE_NOTES.md
   git commit -m "chore(release): v1.2.0"
   ```

4. **Create annotated tag**:
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0 - [Brief description]"
   ```

5. **Create GitHub release** (if gh CLI available):
   ```bash
   gh release create v1.2.0 \
     --title "v1.2.0 - Daily Release" \
     --notes-file RELEASE_NOTES.md \
     --latest
   ```

## Failure Handling

### If Build Fails
- Log the error
- DO NOT create release
- Create issue: `bugs/failed-daily-release-[date].md`
- Email notification (if configured)
- Exit with failure code

### If Tests Fail
- Log which tests failed
- DO NOT create release
- Create issue with test failures
- Exit with failure code

### If Playtest Fails
- Log the failure (crash, freeze, error)
- Take screenshot of error using Playwright MCP
- DO NOT create release
- File a detailed bug report using the template at `bugs/BUG_TEMPLATE.md`
- Save bug report to: `bugs/release-playtest-YYYYMMDD-HHMMSS.md`
- Include:
  - **Screenshots**: Save to `bugs/release-playtest-YYYYMMDD/`
  - **Console errors**: Full stack traces
  - **Steps to reproduce**: Exact sequence that caused failure
  - **Environment**: Browser, OS, game state (time, # agents, etc.)
  - **Severity**: Critical (blocks release)
  - **Type**: Crash / Performance / Functional / etc.
- Exit with failure code

### If No Changes
- Log "No changes since last release"
- Update RELEASE_NOTES.md with "No release today"
- Exit successfully (not a failure)

## Success Criteria

You succeed when:
- ✅ Build completes without errors
- ✅ All tests pass
- ✅ Game runs stable for 15+ minutes
- ✅ No crashes, freezes, or memory leaks
- ✅ Core features validated working
- ✅ Release notes created with all changes
- ✅ Git tag created
- ✅ Version bumped in package.json

## Important Notes

- **NEVER release if playtest fails** - Quality over schedule
- **Be thorough** - 15 minutes minimum testing
- **Document everything** - Release notes should be detailed
- **Use actual timers** - `sleep` commands for real-time validation
- **Monitor console** - Browser errors indicate problems
- **Check memory** - Look for growth over time
