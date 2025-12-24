# Bug Report Template

Use this template when filing bugs discovered during playtesting or development.

## Bug Information

**Title:** [Short, descriptive title]

**Severity:**
- [ ] Critical - Game crashes, data loss, complete feature failure
- [ ] High - Major feature broken, significant UX issue
- [ ] Medium - Feature partially broken, workaround exists
- [ ] Low - Minor issue, cosmetic, edge case

**Type:**
- [ ] Crash - Game crashes or freezes
- [ ] Functional - Feature doesn't work as designed
- [ ] Performance - Slow, laggy, or memory issues
- [ ] Visual - Rendering issues, missing graphics
- [ ] Data - Incorrect values, bad calculations
- [ ] UX - Confusing, unintuitive, poor usability

## Description

**What happened:**
[Clear description of the bug]

**Expected behavior:**
[What should have happened]

**Actual behavior:**
[What actually happened]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [...]
4. [Bug occurs]

**Reproducibility:**
- [ ] Always (100%)
- [ ] Usually (75%)
- [ ] Sometimes (50%)
- [ ] Rarely (25%)
- [ ] Once (tried multiple times, happened once)

## Environment

**When discovered:**
- Date: [YYYY-MM-DD]
- Time: [HH:MM]
- During: [Playtest / Development / User Report]

**System:**
- Game Version: [e.g., v0.2.0 or commit hash]
- Browser: [Chrome 120 / Firefox 121 / Safari 17]
- OS: [macOS 14.1 / Windows 11 / Linux Ubuntu 22.04]
- Screen Resolution: [1920x1080]

**Game State:**
- In-game time: [e.g., Day 5, 14:30]
- Time speed: [1x / 2x / 4x / 8x]
- Number of agents: [e.g., 5 agents]
- Number of buildings: [e.g., 3 buildings]

## Evidence

**Screenshots:**
[Attach screenshots showing the issue]
- `bugs/[bug-id]/screenshot-1.png`
- `bugs/[bug-id]/screenshot-2.png`

**Console Errors:**
```
[Paste any browser console errors]
```

**Logs:**
```
[Paste relevant log excerpts]
```

**Video:**
[If applicable, link to screen recording]

## Additional Context

**Workaround:**
[If you found a way to avoid the bug, describe it]

**Related Issues:**
- Related to #123
- Possibly caused by recent change in commit abc1234

**Notes:**
[Any other relevant information]

## Investigation (For Developers)

**Root Cause:**
[To be filled by developer investigating]

**Fix Approach:**
[To be filled by developer]

**Files Affected:**
- `path/to/file.ts:123`
- `path/to/other.ts:456`

---

**Bug ID:** [Auto-generated: bugs-YYYYMMDD-HHMMSS]
**Filed by:** [Your name / Autonomous Agent]
**Status:** Open / In Progress / Fixed / Won't Fix / Duplicate
