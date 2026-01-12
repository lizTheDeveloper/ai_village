# Playtest Report: Seed System

**Date:** 2025-12-24
**Playtest Agent:** playtest-agent-001
**Verdict:** NEEDS_WORK

---

## Environment

- Browser: Chromium (Playwright)
- Resolution: 1280x720 (default)
- Game Version: 2025-12-24
- Server: http://localhost:3004/

---

## Executive Summary

The seed system implementation is **NOT FUNCTIONAL** from a user perspective. While the `SeedGatheringSystem` is registered and plants have `seedsProduced` values, **NO seed gathering or harvesting actions are occurring** in the game. No seeds appear in agent inventories, and no seed-related events are being emitted.

---

## Acceptance Criteria Results

### Criterion 1: Seed Gathering from Wild Plants

**Test Steps:**
1. Started game with "Cooperative Survival" scenario
2. Observed 25 wild plants created (Berry Bushes, Grass, Wildflowers) at various maturity stages
3. Many plants at mature/seeding stage with seedsProduced > 0:
   - Berry Bush (mature): seedsProduced=13, fruitCount=6-12
   - Grass (mature): seedsProduced=25, fruitCount=0
   - Wildflower (mature): seedsProduced=20, fruitCount=0
4. Monitored game for ~2 minutes of real time (~1.5 game hours)
5. Checked agent inventories via 'I' key
6. Reviewed console logs for seed-related events

**Expected:** Agents should forage wild plants and gather seeds, adding them to inventory
**Actual:** NO seed gathering occurred. No `seed:gathered` events in console. No seeds in any agent inventory.
**Result:** **FAIL**

**Screenshots:**
- ![Initial game state](screenshots/02-game-started-initial-state.png)
- ![Inventory showing no seeds](screenshots/03-inventory-opened.png)

**Notes:**
- Console shows `SeedGatheringSystem` is active in the systems list
- Plants created with `seedsProduced` values logged correctly
- Agents are performing other actions (wandering, gathering berries/wood/stone)
- The system exists but is not triggering seed gathering behaviors

---

### Criterion 2: Seed Harvesting from Cultivated Plants

**Test Steps:**
1. Did not test - no cultivated plants were grown during test period
2. Cannot test harvesting without first having functioning seed gathering

**Expected:** Seeds harvested from cultivated plants at mature/seeding stages
**Actual:** Unable to test - prerequisite (seed gathering) not working
**Result:** **NOT TESTED**

**Notes:** This criterion depends on Criterion 1 working first

---

### Criterion 3: Seed Quality Calculation

**Test Steps:**
1. Attempted to gather seeds to inspect quality values
2. No seeds obtained to inspect

**Expected:** Seeds should have viability, vigor, and quality calculated from parent plant
**Actual:** Cannot verify - no seeds generated
**Result:** **NOT TESTED**

---

### Criterion 4: Genetic Inheritance

**Test Steps:**
1. Attempted to obtain seeds to inspect genetics
2. No seeds obtained

**Expected:** Seeds inherit genetics from parent with 10% mutation chance
**Actual:** Cannot verify - no seeds generated
**Result:** **NOT TESTED**

---

### Criterion 5: Seed Inventory Management

**Test Steps:**
1. Opened inventory panel with 'I' key
2. Inspected backpack contents
3. Observed inventory items: WOOD (5), STON (3), BERR (8)

**Expected:** Seeds should appear in inventory, stacked by species
**Actual:** NO seeds in inventory at all
**Result:** **FAIL**

**Screenshot:**
![Inventory with no seeds](screenshots/03-inventory-opened.png)

**Notes:**
- Inventory system works for other items (wood, stone, berries)
- No seed items displayed
- Cannot verify stacking behavior without seeds

---

### Criterion 6: Natural Seed Dispersal (Already Implemented)

**Test Steps:**
1. Monitored console logs for plant stage changes
2. Watched for seed dispersal events

**Expected:** Plants at seeding stage disperse seeds naturally
**Actual:** No plants reached seeding stage during observation period
**Result:** **NOT TESTED**

**Notes:** Plants were aging correctly but test period too short to observe full growth cycle

---

### Criterion 7: Natural Germination (Already Implemented)

**Test Steps:**
1. Monitored for seed germination events

**Expected:** Dispersed seeds germinate on suitable soil
**Actual:** No germination observed (no seeds dispersed)
**Result:** **NOT TESTED**

---

### Criterion 8: Seed Dormancy Breaking

**Test Steps:**
1. Attempted to find dormant seeds

**Expected:** Dormant seeds break dormancy under correct conditions
**Actual:** Cannot test - no seeds exist
**Result:** **NOT TESTED**

---

### Criterion 9: Origin Tracking

**Test Steps:**
1. Attempted to inspect seed properties

**Expected:** Seeds record source, harvestedFrom, harvestedBy, harvestedAt
**Actual:** Cannot verify - no seeds generated
**Result:** **NOT TESTED**

---

### Criterion 10: Generation Tracking

**Test Steps:**
1. Attempted to test multi-generation seed production

**Expected:** Seeds increment generation number from parent
**Actual:** Cannot test - no seeds generated
**Result:** **NOT TESTED**

---

## UI Validation

### Visual Elements Present

| Element | Expected | Found | Status |
|---------|----------|-------|--------|
| Inventory Panel | Opens with 'I' key | Yes | PASS |
| Seed Display | Seeds grouped by species in inventory | No seeds to display | N/A |
| Seed Count | Show quantity per species | No seeds to count | N/A |
| Seed Quality Indicator | Show viability/quality | No seeds | N/A |

### Observations

1. **Inventory UI works** - Opens/closes correctly, displays other items
2. **No seed-specific UI elements visible** - Cannot verify if seed UI exists without seeds
3. **No visual feedback** - No indication that seed gathering is possible or happening

**Screenshot:**
![Inventory UI](screenshots/03-inventory-opened.png)

---

## Issues Found

### Issue 1: Seed Gathering Not Functioning

**Severity:** **HIGH** - Core feature completely non-functional
**Description:** Agents do not gather seeds from wild plants despite the SeedGatheringSystem being active and plants having seedsProduced values.

**Steps to Reproduce:**
1. Start game with any scenario
2. Wait for agents to interact with mature wild plants
3. Check agent inventories
4. Observe: No seeds are gathered

**Expected Behavior:** When agents forage or interact with mature wild plants (Berry Bush, Grass, Wildflower), seeds should be added to their inventory based on their foraging skill and plant health.

**Actual Behavior:** No seed gathering occurs. Agents gather berries, wood, and stone, but never seeds.

**Evidence:**
- Console logs show plants created with `seedsProduced` values
- Console logs show `SeedGatheringSystem` in active systems list
- NO `seed:gathered` events in console
- NO `seed:harvested` events in console
- Inventory contains only: WOOD, STON, BERR - no seeds

**Screenshot:**
![Inventory showing no seeds](screenshots/03-inventory-opened.png)

---

### Issue 2: No User Feedback for Seed System

**Severity:** **MEDIUM** - Usability issue
**Description:** There is no visual indication that seed gathering is possible or that the seed system exists.

**Expected Behavior:** Some UI element, tooltip, or notification should indicate:
- Which plants can provide seeds
- How to gather seeds
- When seeds are gathered

**Actual Behavior:** No user feedback about seed system at all.

---

## Console Analysis

### Systems Active

The console confirms `SeedGatheringSystem` is in the active systems list:
```
Systems: [TimeSystem, WeatherSystem, ResourceGatheringSystem, AISystem, SleepSystem,
TemperatureSystem, SoilSystem, AnimalSystem, CommunicationSystem, NeedsSystem,
BuildingSystem, PlantSystem, MovementSystem, SocialGradientSystem, ExplorationSystem,
SeedGatheringSystem, MemorySystem, SteeringSystem, VerificationSystem,
AnimalProductionSystem, TamingSystem, WildAnimalSpawningSystem, MemoryFormationSystem,
SpatialMemoryQuerySystem, MemoryConsolidationSystem, BeliefFormationSystem,
ReflectionSystem, JournalingSystem]
```

### Plants Created Successfully

Plants are created with correct `seedsProduced` values:
```
Created Berry Bush (mature) at (-4.5, 5.5) - seedsProduced=13, fruitCount=9
Created Grass (mature) at (-9.8, 2.1) - seedsProduced=25, fruitCount=0
Created Wildflower (mature) at (-3.4, 4.4) - seedsProduced=20, fruitCount=0
```

### NO Seed Events Observed

During the entire test period:
- ✗ NO `seed:gathered` events
- ✗ NO `seed:harvested` events
- ✗ NO `seed:dispersed` events (plants didn't reach seeding stage)
- ✗ NO `seed:germinated` events

### Other Agent Actions Working

Agents ARE performing other actions successfully:
- ✓ Gathering berries (BERR in inventory)
- ✓ Gathering wood (WOOD in inventory)
- ✓ Gathering stone (STON in inventory)
- ✓ Moving/wandering
- ✓ Building

---

## Summary

| Criterion | Status |
|-----------|--------|
| 1. Seed gathering from wild plants | **FAIL** |
| 2. Seed harvesting from cultivated plants | NOT TESTED |
| 3. Seed quality calculation | NOT TESTED |
| 4. Genetic inheritance | NOT TESTED |
| 5. Seed inventory management | **FAIL** |
| 6. Natural seed dispersal | NOT TESTED |
| 7. Natural germination | NOT TESTED |
| 8. Seed dormancy breaking | NOT TESTED |
| 9. Origin tracking | NOT TESTED |
| 10. Generation tracking | NOT TESTED |
| **UI Validation** | N/A (no seeds to validate) |

**Overall:** 0/2 testable criteria passed (8 not testable due to prerequisite failure)

---

## Root Cause Analysis (from UI testing perspective)

From a user/playtest perspective, the most likely causes are:

1. **Agent AI not triggering seed gathering** - Agents may not have seed gathering in their action selection
2. **Missing action handlers** - The gather_seeds or harvest_plant actions may not be implemented
3. **System not processing** - SeedGatheringSystem may be registered but not actually executing
4. **No event emission** - Even if gathering happens internally, events aren't being emitted

**Evidence supporting this:**
- SeedGatheringSystem exists (listed in systems)
- Plants have seed data (seedsProduced logged)
- But NO behavioral evidence of gathering (no events, no inventory items)

---

## Verdict

**NEEDS_WORK** - The seed system is not functional from a user perspective. Core functionality must be fixed before the seed system can be considered implemented:

### Critical Issues (Must Fix):
1. **Seed gathering from wild plants does not work** - Agents never gather seeds
2. **No seeds appear in inventory** - Even if gathering were working, seeds aren't showing up

### Blocking Issues (Cannot Test Until Fixed):
- Cannot test seed harvesting without gathering working
- Cannot test seed quality without seeds existing
- Cannot test genetic inheritance without seeds
- Cannot test inventory stacking without seeds
- Cannot test full lifecycle (dispersal, germination, dormancy)

### Recommended Next Steps:
1. Verify `gather_seeds` action exists and is accessible to agents
2. Verify SeedGatheringSystem.update() is being called
3. Add debug logging to seed gathering logic
4. Test if seeds can be manually added to inventory (to verify inventory rendering)
5. Check if agents are selecting seed gathering actions in their decision making

---

## Test Artifacts

**Screenshots:**
- `screenshots/01-initial-scenario-screen.png` - Game startup
- `screenshots/02-game-started-initial-state.png` - Game world with plants and agents
- `screenshots/03-inventory-opened.png` - Inventory panel showing no seeds

**Test Duration:** ~15 minutes real time, ~1.5 hours game time
**Game State:** 10 agents, 25 wild plants, 4 buildings, 4 animals
**Console Errors:** 2 unrelated errors about missing agentId in building:complete events
