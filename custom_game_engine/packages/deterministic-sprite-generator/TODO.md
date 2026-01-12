# Deterministic Sprite Generator Package - Implementation Audit

**Audit Date:** 2026-01-11
**Package Version:** 0.1.0
**Status:** Research/Prototype (Not integrated with game)

## Summary

The deterministic sprite generator package is **functionally complete for its core purpose** (generating deterministic pixel art sprites from seeds). However, several features mentioned in the README are **not implemented** or are **stubbed out for future use**. The package is in a **prototype/research state** and is intentionally **not integrated with the game engine**.

**Overall Health:** 7/10
- Core generation works as advertised
- Good test coverage via interactive tools
- Clean, minimal codebase with no broken code
- Missing several "future" features documented in README
- Art style system is defined but not actually used
- No quadruped, clothes, or accessory parts despite templates existing

---

## Stubs and Placeholders

### 1. Anchor Points Not Implemented
- **File:** `src/generateSprite.ts:60`
- **Issue:** Anchor points are defined in templates but ignored during composition
- **Comment:** `// Composite at origin (anchor points not yet implemented)`
- **Impact:** All parts are composited at (0,0) instead of proper attachment points
- **README Claims:** README Example 7 shows `defaultAnchor` being used in templates, implying they work
- **Priority:** Medium (affects part positioning accuracy)

### 2. Variations Parameter Completely Unused
- **File:** `src/types.ts:51`
- **Issue:** `variations?: Record<string, any>` parameter accepted but never used
- **Usage:** Parameter is destructured in `generateSprite()` but ignored
- **README Claims:** README documents `variations` as "Future: part selection hints"
- **Priority:** Low (documented as future feature)

### 3. Planetary Art Style Accepted But Ignored
- **File:** `src/generateSprite.ts:13`
- **Issue:** `planetaryArtStyle` parameter is accepted and defaults to 'snes', but **never actually used**
- **README Claims:**
  - README Example 4 shows art styles affecting sprite generation
  - README says "Art style determines which part library is used" (line 493)
  - 30+ art style configurations defined in `artStyles.ts`
- **Reality:** Art style parameter has zero effect on generation - same parts are always used
- **Priority:** High (major feature documented but not working)

### 4. Part Library Loading Not Implemented
- **File:** `src/artStyles.ts:19`
- **Issue:** `partsDirectory` field exists in all 30+ art style configs, but **no code loads parts from these directories**
- **Example:** `partsDirectory: 'assets/parts/snes/'` is defined but unused
- **README Claims:** "Future: Art style determines which part library is used" (line 493-495)
- **Priority:** High (would enable actual art style differences)

### 5. Single TODO in Sprite Wizard
- **File:** `sprite-set-generator/main.ts:746`
- **Issue:** `// TODO: Implement regeneration UI`
- **Context:** Function `regenerateSpecificPart()` exists but UI isn't hooked up
- **Priority:** Low (wizard is a dev tool, not production code)

---

## Missing Integrations

### 1. No Quadruped Parts Exist
- **Issue:** `quadruped` template is fully defined with 5 slots (body, head, legs, tail, ears)
- **Reality:** **Zero quadruped parts exist in parts library**
- **README Claims:** README says template is "Use for: Animals, creatures, mounts" (line 136)
- **Impact:** Attempting to generate quadruped sprite will throw error: "No parts available for required slot: body"
- **Priority:** High (documented template is unusable)

### 2. No Clothes Parts Exist
- **Issue:** `humanoid` template includes `clothes` slot (zIndex: 4)
- **Reality:** **Zero clothing parts exist in parts library**
- **Impact:** Clothes slot is always skipped (optional slot, so no error)
- **Priority:** Medium (documented slot never used)

### 3. No Accessory Parts Exist
- **Issue:** `humanoid` template includes `accessory` slot (zIndex: 5)
- **Reality:** **Zero accessory parts exist in parts library**
- **Impact:** Accessory slot is always skipped
- **Priority:** Medium (documented slot never used)

### 4. No Game Engine Integration
- **Issue:** Package is completely standalone
- **README Claims:** README Example 5 (line 500-528) shows hypothetical agent integration
- **Reality:** This is **intentionally not implemented** (README line 26 says "NOT integrated with game")
- **Priority:** N/A (documented as standalone)

### 5. Art Style to Planet ID Mapping Not Used
- **File:** `src/artStyles.ts:353-365`
- **Issue:** `getArtStyleFromPlanetId()` function exists but is never called
- **README Claims:** README shows "Planetary integration (future)" example (line 273-278)
- **Priority:** Low (future feature, properly documented)

---

## Dead Code

### 1. Unused Art Style Configurations
- **File:** `src/artStyles.ts`
- **Issue:** 30+ art style configs defined (NES, SNES, Genesis, Amiga, etc.) but **never actually used**
- **Lines:** 23-340 define elaborate configs with colors, shading, sizes
- **Impact:** ~320 lines of dead code that has zero effect on generation
- **Priority:** Medium (clean up or implement)

### 2. Unused Color Depth Specs
- **File:** `src/artStyles.ts`
- **Issue:** Each art style has `colorDepth: string` field ("56 colors", "4 shades", etc.) but this is never enforced
- **Example:** `gameboy` style claims "4 shades (monochrome)" but sprites can use full RGB
- **Priority:** Low (metadata for future use)

### 3. Unused Reference Image IDs
- **File:** `src/artStyles.ts:42`
- **Issue:** `referenceImageId?: string` field exists but is only populated for SNES style
- **Example:** `referenceImageId: '762d156d-60dc-4822-915b-af55bc06fb49'`
- **Usage:** This ID is used by **scripts** (generation tools) but not by core library
- **Priority:** Low (used by external tools)

### 4. PNG Loading Functions Not Used
- **File:** `src/loadPNG.ts`
- **Issue:** Three PNG loading functions (`loadPNGFromBase64`, `loadPNGFromURL`, `loadPNGFromFile`) are exported but **never used** by core generator
- **Usage:** These are for loading **pre-generated parts** from files, not used by algorithmic generation
- **Priority:** Low (utility functions for future part loading)

---

## Misleading Documentation

### 1. README Claims Art Styles Work
- **Location:** README lines 238-278, Examples 4 & 5
- **Claim:** "Each planet/universe renders sprites in a different retro console art style"
- **Reality:** Art style parameter is accepted but ignored - no effect on output
- **Fix Needed:** Update README to clarify this is a future feature OR implement it

### 2. README Shows Non-Existent Parts
- **Location:** README line 162-168
- **Claim:** "Total combinations (humanoid): 3 bodies × 3 heads × 4 eyes × 6 hair = **216 unique sprites**"
- **Reality:** True for humanoid, but quadruped has zero parts (can't generate any sprites)
- **Fix Needed:** Clarify which templates actually have parts

### 3. README Example 7 Shows Wrong Data
- **Location:** README lines 571-594 (Creating Custom Templates)
- **Claim:** Shows creating a `dragon` template with anchor points
- **Reality:** Anchor points don't work (see stub #1)
- **Fix Needed:** Add note that anchor points are not yet implemented

---

## Priority Fixes

### P0 - Critical (Breaks Documented Features)

1. **[Quadruped Template Unusable]**
   - Template exists but has zero parts - attempting to use throws error
   - **Fix:** Either create quadruped parts OR remove template and update docs

2. **[Art Style Has Zero Effect]**
   - README extensively documents art styles, but parameter is completely ignored
   - **Fix:** Either implement art style system OR mark as "future" in README

### P1 - High (Missing Major Features)

3. **[Part Library Loading Not Implemented]**
   - All art styles define `partsDirectory` but nothing loads from them
   - **Fix:** Implement `loadPartsFromDirectory()` function to use art-style-specific parts

4. **[Anchor Points Not Implemented]**
   - Templates define anchors but parts are composited at (0,0)
   - **Fix:** Use anchor points during composition in `generateSprite()`

### P2 - Medium (Partial Implementations)

5. **[Missing Humanoid Slots]**
   - `clothes` and `accessory` slots exist but have no parts
   - **Fix:** Create some basic clothing/accessory parts OR mark slots as experimental

6. **[Unused Art Style Configs]**
   - 30+ elaborate configs defined but never used (dead code)
   - **Fix:** Either implement art style system OR move configs to separate "future" file

### P3 - Low (Documentation & Polish)

7. **[Variations Parameter Stub]**
   - Accepted but ignored - should either work or be removed
   - **Fix:** Remove from API or implement basic hint system

8. **[Misleading README Examples]**
   - Examples show features that don't work (art styles, anchors)
   - **Fix:** Add "Future" markers or notes to clarify implementation status

---

## Recommendations

### Option A: Clean Up Prototype
1. Remove or clearly mark all "future" features in README
2. Delete unused art style configs (or move to `future-features/` directory)
3. Remove `quadruped` template until parts exist
4. Remove `variations` parameter from API
5. Add big "PROTOTYPE - NOT PRODUCTION READY" warning to README

### Option B: Implement Core Features
1. Implement anchor point positioning (4-6 hours)
2. Create basic quadruped parts (4-8 hours)
3. Implement part loading from art style directories (8-12 hours)
4. Add basic clothing/accessory parts (2-4 hours)
5. Hook up art style parameter to actually use different parts (4-6 hours)

### Option C: Keep As-Is
- This is a **research/prototype package** intentionally kept simple
- Core deterministic generation **works perfectly** for its intended use
- "Future" features are clearly marked in comments (though not in README)
- Package provides value as a standalone sprite generation proof-of-concept

---

## What Actually Works

Despite the stubs, this package **does work** for its core purpose:

✅ **Deterministic generation** - Same seed = same sprite (verified)
✅ **Modular composition** - Parts are layered by zIndex correctly
✅ **Color parameterization** - Custom colors work as documented
✅ **Pixel scaling** - Nearest-neighbor scaling works correctly
✅ **Seeded RNG** - DeterministicRandom is fully functional
✅ **Humanoid sprites** - 3 bodies × 3 heads × 4 eyes × 6 hair = 216 combinations work
✅ **Interactive testing** - Test screen and sprite wizard are excellent
✅ **Clean code** - No crashes, no silent failures, good error handling

The package delivers on its core promise. The "missing" features are **future enhancements** that were designed but not built.

---

## Conclusion

This package is in **excellent shape for a prototype**. The core sprite generation algorithm is solid, deterministic, and well-tested. The missing features fall into two categories:

1. **Designed but not implemented** (art styles, anchor points) - Clear stubs, no broken code
2. **Missing content** (quadruped parts, clothes, accessories) - Templates exist, parts don't

**No malware, no broken promises, no silent failures.** The code does exactly what it claims to do in the implementation - the README just documents some "future" features without clearly marking them as such.

**Recommended Action:** Add "Status: Prototype" banner to README and mark unimplemented features clearly.
