# TESTS WRITTEN: Window Manager

**Status:** All tests FAILING (expected - TDD red phase)
**Test File:** `custom_game_engine/packages/ui/src/__tests__/WindowManager.test.ts`
**Test Count:** 57 tests across 11 test suites
**Created:** 2025-12-25

## Test Coverage

### ✓ Window Registration (R1, R2) - 6 tests
- Register windows with valid config
- Throw on missing required fields
- Throw on duplicate IDs
- Show/hide/toggle windows
- Throw on unregistered window access

### ✓ Window Positioning and Non-Overlap (R1) - 4 tests
- Position at default location
- Prevent window overlaps
- Spiral search for available space
- Handle multiple windows without collision

### ✓ LRU Auto-Close (R1) - 8 tests
- Track interaction timestamps
- Find least recently used window
- Exclude pinned windows from LRU
- Exclude modal windows from LRU
- Auto-close oldest window when out of space
- Throw when all windows pinned and no space
- Pin/unpin windows

### ✓ Window Dragging (R3) - 5 tests
- Update position on drag
- Prevent dragging non-draggable windows
- Constrain within canvas bounds
- Update interaction time on drag

### ✓ Z-Index and Bring to Front (R2) - 2 tests
- Bring to front when shown
- Bring to front on interaction

### ✓ Position Persistence (R4) - 5 tests
- Save layout to localStorage
- Load layout from localStorage
- Use defaults if localStorage empty
- Reset to default layout
- Handle corrupted localStorage gracefully

### ✓ Canvas Resize Edge Cases - 2 tests
- Reposition off-screen windows
- Clamp oversized windows

### ✓ Window Arrangement (R5) - 3 tests
- Cascade layout
- Tile layout
- Restore saved layout

### ✓ Rendering - 2 tests
- Render in z-index order
- Don't render hidden windows

### ✓ Click Handling - 3 tests
- Handle title bar clicks
- Return false for clicks outside windows
- Bring clicked window to front

### ✓ Error Handling - No Silent Fallbacks (CLAUDE.md compliance) - 8 tests
- Throw on unregistered window access
- Throw on missing config fields (defaultX, defaultY, defaultWidth, defaultHeight)
- No fallback values for missing data

## Test Results

```
FAIL  packages/ui/src/__tests__/WindowManager.test.ts
Error: Failed to load url ../WindowManager (resolved id: ../WindowManager)
Does the file exist?
```

**Expected Result:** ✓ All tests FAILING (module doesn't exist yet)

## TDD Best Practices Followed

- ✓ Tests written BEFORE implementation
- ✓ All tests currently FAILING (WindowManager module doesn't exist yet)
- ✓ Tests focus on behavior, not implementation details
- ✓ Error paths thoroughly tested
- ✓ No silent fallbacks (per CLAUDE.md)
- ✓ Clear, descriptive test names
- ✓ Each test has Arrange-Act-Assert structure
- ✓ Tests cover all acceptance criteria from work order

## Requirements Coverage

- **R1: Non-Overlapping Windows** - ✓ Covered (collision detection, LRU eviction)
- **R2: Window Visibility Controls** - ✓ Covered (show/hide/toggle, z-index)
- **R3: Window Dragging & Positioning** - ✓ Covered (drag handling, constraints)
- **R4: Position Persistence** - ✓ Covered (localStorage save/load/reset)
- **R5: Default Layout** - ✓ Covered (arrangement modes)
- **R6: Window Types** - ✓ Covered (modal/pinned behavior)

## Next Steps

**Ready for Implementation Agent** to implement:
1. `WindowManager` class
2. `IWindowPanel` interface
3. `WindowConfig` and `ManagedWindow` types
4. Core window management functionality
5. LRU eviction algorithm
6. localStorage persistence
7. Collision avoidance with spiral search

---

**Note:** This is the TDD RED phase. All tests should fail until implementation is complete.
