# Work Order Confirmed: conflict/combat-ui

**Status:** ✅ READY_FOR_TESTS
**Agent:** spec-agent-001
**Timestamp:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Attempt:** #260

---

## Work Order Verification

The work order file has been verified to exist and is complete:

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order.md`
**Size:** 429 lines
**Status:** READY_FOR_TESTS

---

## Summary

Work order for **conflict/combat-ui** (Phase 16) is complete with:

### Requirements
- 5 MUST requirements (Combat HUD, Health Bars ✅, Unit Panel, Stance Controls, Threat Indicators)
- 4 SHOULD requirements (Combat Log, Tactical Overview, Defense Management, Keyboard Shortcuts)
- 2 MAY requirements (Ability Bar, Damage Numbers)

### Acceptance Criteria
- 10 detailed acceptance criteria with WHEN/THEN/VERIFICATION
- 2 requirements already implemented (Health bars, Injury indicators)

### System Integration
- 11 existing systems identified
- 8 new renderers specified
- 4 new components needed
- 16 event types (11 listen, 5 emit)

### Files
- 15+ files to create/modify
- 7 test files needed
- Implementation priority order defined

---

## Dependencies Met

All dependency specs verified:
- ✅ `openspec/specs/conflict-system/spec.md` - Conflict mechanics
- ✅ `openspec/specs/agent-system/spec.md` - Agent stats  
- ✅ `openspec/specs/ui-system/notifications.md` - Combat alerts

---

## Next Steps

**Test Agent:** Create test suite based on 10 acceptance criteria in work order

**Implementation Agent:** After tests written, implement in 3 phases:
1. Phase 1: MUST requirements (Combat HUD, Unit Panel, Stance Controls, Threat Indicators)
2. Phase 2: SHOULD requirements (Combat Log, Tactical Overview, Defense Management, Shortcuts)
3. Phase 3: MAY requirements (Ability Bar, Damage Numbers)

**Playtest Agent:** Verify UI behaviors, edge cases, and performance targets

---

## Architecture Notes

- **Event-Driven:** Listen to conflict system events, don't poll
- **Component-Based:** Each UI element has corresponding component for state
- **Renderer Pattern:** Separate renderer (view) from component (state)
- **Performance:** Use culling for off-screen elements (see HealthBarRenderer)
- **No Silent Fallbacks:** Crash on missing data per CLAUDE.md

---

## Special Considerations

**Alien Species Combat:**
- Pack minds: All bodies, coherence meter
- Hive minds: Queen status, worker count  
- Man'chi: Lord relationship, loyalty meter

**Conflict Types:**
- Hunting, Predator attack, Dominance challenge, Raid support

---

**Work order ready. Handing off to Test Agent.**

**Spec Agent signing off** ✅
