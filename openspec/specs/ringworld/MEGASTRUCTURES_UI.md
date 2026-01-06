# Megastructures UI Specification

**Status:** Draft
**Version:** 1.0
**Last Updated:** 2026-01-06

## Overview

The Megastructures UI reinforces the player's presence on a massive artificial ringworld. It provides context about the ring's scale, the player's location, nearby megastructures, and ring-wide phenomena.

## Design Goals

1. **Scale Awareness:** Make player feel the immensity of the ring
2. **Orientation:** Show where player is in the ring's geography
3. **Lore Integration:** Explain ringworld mechanics through UI
4. **Discovery:** Encourage exploration of distant regions
5. **Immersion:** Constant reminder this isn't a planet

## UI Components

### 1. Ring Position HUD (Always Visible)

Small overlay in corner of screen:

```
┌─────────────────────────┐
│ ◉ RING POSITION         │
├─────────────────────────┤
│ Megasegment: 007        │
│ Region: The Crystal     │
│         Wastes (#23)    │
│                         │
│ Distance from Prime:    │
│   67,200 km (7.0%)      │
│                         │
│ Local Time: 14:23       │
│ Shadow Square: 3h 12m   │
└─────────────────────────┘
```

**Data shown:**
- Current megasegment number (0-999)
- Current region name and number
- Distance traveled around ring from Prime Meridian
- Percentage of ring circumference
- Local time (based on position relative to shadow squares)
- Time until next shadow square passes overhead

### 2. Ring Map Panel

Large panel showing:
- **Ring Circumference View:** Unwrapped 2D map of the ring
- **Discovered Regions:** Regions player has visited (lit up)
- **Undiscovered Regions:** Grayed out, showing only terrain type hints
- **Landmarks:** Major megastructures, spaceports, ruins
- **Player Position:** Marker showing current location

```
┌──────────────────────────────────────────────────┐
│ RING MAP - TOTAL CIRCUMFERENCE: 9.6M KM         │
├──────────────────────────────────────────────────┤
│                                                  │
│ [====|====|====|====|====|====|====|====|====]  │
│  0   100  200  300  400  500  600  700  800  900│
│      ▲                                           │
│      You are here (Megasegment 7)               │
│                                                  │
│ Discovered Regions: 8 / 100,000                 │
│ Exploration Progress: 0.008%                     │
│                                                  │
│ ◉ Notable Landmarks:                             │
│   • The Great Spire (Megaseg 0)                 │
│   • Crystal Wastes (Megaseg 7) ← YOU ARE HERE   │
│   • Ancient Spaceport (Megaseg 12) - 48,000km E │
│   • The Worldforge (Megaseg 250) - Undiscovered │
│   • Terminus Station (Megaseg 999)              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 3. Megastructures Encyclopedia

Detailed information about ring components:

```
┌──────────────────────────────────────────────────┐
│ MEGASTRUCTURES ENCYCLOPEDIA                      │
├──────────────────────────────────────────────────┤
│                                                  │
│ ◉ THE RING                                       │
│   • Diameter: 1.9 AU (~300M km)                  │
│   • Circumference: 9.6M km                       │
│   • Width: 1000 km                               │
│   • Height: 3000 km (rim walls)                  │
│   • Rotation: 1.6 RPM                            │
│   • Simulated Gravity: 1.0g (centrifugal)        │
│   • Age: ~10,000 years since completion          │
│   • Builder Species: Unknown (extinct?)          │
│                                                  │
│ ◉ SHADOW SQUARES (20 total)                      │
│   • Purpose: Day/night cycle                     │
│   • Size: 1.5M km × 1M km each                   │
│   • Orbit: Geostationary above ring             │
│   • Cycle: 24-hour day/night                     │
│   • Material: Unknown black metamaterial         │
│   • Status: Operational                          │
│                                                  │
│ ◉ SPACEPORTS (47 known)                          │
│   • Function: Access to orbit/interstellar       │
│   • Type: Orbital tethers & mass drivers         │
│   • Nearest: Ancient Spaceport Alpha (48,000km)  │
│   • Status: Most non-functional                  │
│                                                  │
│ ◉ RIM WALLS                                      │
│   • Height: 3000 km (vertical walls)             │
│   • Purpose: Atmosphere retention                │
│   • Composition: Neutronium lattice              │
│   • Access: Limited (few breach points)          │
│                                                  │
│ ◉ ATMOSPHERE RETENTION SYSTEM                    │
│   • Coverage: Ring-wide                          │
│   • Pressure: 1 atm (Earth-like)                 │
│   • Composition: N₂ 78%, O₂ 21%                  │
│   • Weather Control: 4,000 weather towers        │
│   • Status: Degraded but functional              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4. Ring Statistics Panel

Live data about the ringworld:

```
┌──────────────────────────────────────────────────┐
│ RING-WIDE STATISTICS                             │
├──────────────────────────────────────────────────┤
│                                                  │
│ ◉ SCALE                                          │
│   Surface Area: 9.6B km²                         │
│   (960× Earth's land area)                       │
│                                                  │
│   Habitable Regions: ~100,000                    │
│   Explored by You: 8 (0.008%)                    │
│                                                  │
│ ◉ POPULATION (Estimated)                         │
│   Total Sapient Life: 800 million                │
│   Known Civilizations: 12,000+                   │
│   Tech Levels: 0 (Stone Age) - 9 (Clarketech)   │
│                                                  │
│ ◉ INFRASTRUCTURE STATUS                          │
│   Shadow Squares: 20/20 Operational (100%)       │
│   Weather Towers: 3,200/4,000 Operational (80%)  │
│   Spaceports: 3/47 Operational (6%)              │
│   Maintenance Drones: ~2,000 Active              │
│   Builder Facilities: Status Unknown             │
│                                                  │
│ ◉ PHENOMENA                                      │
│   Reality Stability: 94% (Nominal)               │
│   Void Breaches: 3 Active (Contained)            │
│   Temporal Anomalies: 17 Detected                │
│   Dimensional Rifts: 5 Known                     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 5. Local Megastructures View

Shows megastructures visible in current region:

```
┌──────────────────────────────────────────────────┐
│ LOCAL MEGASTRUCTURES                             │
├──────────────────────────────────────────────────┤
│                                                  │
│ Visible in Current Region:                       │
│                                                  │
│ ◉ SHADOW SQUARE ALPHA-7                          │
│   Distance: 300,000 km overhead                  │
│   Status: Operational                            │
│   Next Pass: 3h 12m (twilight begins)            │
│   Coverage: 40% of sky when overhead             │
│   Effect: Temperature -5°C when shadowed         │
│                                                  │
│ ◉ ORBITAL TETHER REMNANT                         │
│   Distance: 12 km north                          │
│   Type: Cargo elevator (broken)                  │
│   Height: 2,800 km (reaches rim wall)            │
│   Status: Non-functional, climbable              │
│   Lore: "Fell during The Calamity 800 years ago"│
│   Contains: Ancient tech, dangerous ascent       │
│                                                  │
│ ◉ WEATHER CONTROL TOWER #4523                    │
│   Distance: 5 km east                            │
│   Type: Climate regulation                       │
│   Status: Operational (automated)                │
│   Effect: Maintains 20°C, low humidity           │
│   Access: Locked (Builder authorization needed)  │
│                                                  │
│ ◉ RIM WALL (NORTH)                               │
│   Distance: 500 km north                         │
│   Visible: Faint line on horizon                 │
│   Height: 3000 km                                │
│   Access: Breach point 200km northeast           │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 6. Journey Tracker

Tracks player's circumnavigation progress:

```
┌──────────────────────────────────────────────────┐
│ RINGWORLD CIRCUMNAVIGATION                       │
├──────────────────────────────────────────────────┤
│                                                  │
│ ◉ YOUR JOURNEY                                   │
│   Started: Day 1 (Megasegment 0)                 │
│   Current: Day 47 (Megasegment 7)                │
│   Distance Traveled: 67,200 km                   │
│   Progress: 0.7% of ring                         │
│                                                  │
│   Estimated Time to Complete Circuit:            │
│     At Current Pace: ~18 years                   │
│     If Using Fast Travel: ~6 months              │
│     If Using Spaceport: ~1 week                  │
│                                                  │
│ ◉ MILESTONES REACHED                             │
│   ✓ The Great Spire (Start)                      │
│   ✓ The Greenlands (Megaseg 3)                   │
│   ✓ Crystal Wastes (Megaseg 7) ← Current         │
│   ◯ Ancient Spaceport (Megaseg 12)               │
│   ◯ The Worldforge (Megaseg 250)                 │
│   ◯ Terminus Station (Megaseg 999)               │
│   ◯ Return to Prime (Megaseg 0)                  │
│                                                  │
│ ◉ DISCOVERIES                                    │
│   Regions Explored: 8                            │
│   Civilizations Met: 3                           │
│   Ancient Tech Found: 12 items                   │
│   Megastructures Visited: 2                      │
│   Lore Fragments: 7/1000                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 7. Ring Phenomena Alerts

Notifications for ring-wide events:

```
┌──────────────────────────────────────────────────┐
│ ⚠ RING PHENOMENA ALERTS                          │
├──────────────────────────────────────────────────┤
│                                                  │
│ ◉ SHADOW SQUARE APPROACHING                      │
│   ETA: 3h 12m                                    │
│   Duration: 12 hours                             │
│   Effect: Temperature drop, darkness             │
│   Recommendation: Seek shelter or light source   │
│                                                  │
│ ◉ RING QUAKE DETECTED                            │
│   Location: Megasegment 45 (3,600km away)        │
│   Magnitude: 4.2                                 │
│   Cause: Tectonic stress in substrate            │
│   Local Impact: None (too distant)               │
│                                                  │
│ ◉ VOID BREACH CONTAINED                          │
│   Location: Megasegment 89                       │
│   Status: Sealed by maintenance drones           │
│   Danger Level: Moderate (avoid region)          │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Visual Design

### Skybox Integration

The skybox reinforces ringworld presence:

1. **Horizon:** Ring surface curves upward on both sides
2. **Overhead:** Opposite side of ring visible (hazy, distant)
3. **Shadow Squares:** Dark rectangles moving across sky
4. **Sun:** Central star (very bright, never sets)
5. **Stars:** Visible at "night" when shadow square blocks sun
6. **Rim Walls:** Faint vertical lines at extreme distance

### Color Scheme

- **Ring UI Elements:** Cyan/blue (technological, artificial)
- **Warnings:** Orange/red (phenomena, dangers)
- **Discovery:** Green (new regions, achievements)
- **Lore:** Purple (ancient, mysterious)

### Iconography

```
◉ Ring position
⚠ Warnings/alerts
✓ Completed milestones
◯ Uncompleted milestones
▲ Player location marker
━ Ring circumference bar
│ Rim walls
□ Shadow squares
◊ Megastructures
```

## Interaction Patterns

### Opening the Megastructures Panel

Hotkey: **M** (for Megastructures)

Or click icon in top-right corner:
```
┌─┐
│◊│ ← Megastructures icon
└─┘
```

### Navigation

- **Tab 1:** Ring Map
- **Tab 2:** Encyclopedia
- **Tab 3:** Statistics
- **Tab 4:** Local Structures
- **Tab 5:** Journey Tracker

### Tooltips

Hover over any megastructure for detailed info:

```
╔═══════════════════════════════════════╗
║ SHADOW SQUARE ALPHA-7                 ║
╠═══════════════════════════════════════╣
║ A massive rectangular panel orbiting  ║
║ above the ring to create day/night    ║
║ cycles. Made of unknown black         ║
║ metamaterial that absorbs 99.9% of    ║
║ light. Maintained by ancient drones.  ║
║                                       ║
║ When this passes overhead, the region ║
║ experiences 12 hours of twilight/dark.║
║                                       ║
║ Next Pass: 3h 12m                     ║
║ Duration: 12 hours                    ║
╚═══════════════════════════════════════╝
```

## Data Sources

### Ring Position HUD
- **Source:** Player position component
- **Update:** Every tick
- **Calculation:** `worldX / RING_CIRCUMFERENCE`

### Ring Map
- **Source:** Discovered regions list
- **Update:** When player enters new region
- **Storage:** Bitmap of visited regions

### Statistics
- **Source:** Abstract region states
- **Update:** Once per in-game day
- **Aggregation:** Sum across all abstract regions

### Local Megastructures
- **Source:** Region template + player position
- **Update:** When region changes
- **Range:** Structures within 100km

## Performance

- **Memory:** < 500KB for UI textures
- **CPU:** < 1ms per frame
- **Network:** None (single player)
- **Storage:** < 100KB save data (discovered regions)

## Implementation Phases

### Phase 1: Basic HUD
- [ ] Ring Position HUD (always visible)
- [ ] Current megasegment/region display
- [ ] Distance from Prime

### Phase 2: Ring Map
- [ ] Unwrapped circumference view
- [ ] Discovered regions visualization
- [ ] Player position marker
- [ ] Major landmarks

### Phase 3: Encyclopedia
- [ ] Ring specifications
- [ ] Megastructure descriptions
- [ ] Lore integration

### Phase 4: Statistics
- [ ] Population estimates
- [ ] Infrastructure status
- [ ] Ring-wide phenomena

### Phase 5: Local View
- [ ] Nearby megastructures list
- [ ] Shadow square tracking
- [ ] Weather tower display

### Phase 6: Journey Tracker
- [ ] Circumnavigation progress
- [ ] Milestones system
- [ ] Discoveries counter

## Success Criteria

- ✅ Player understands they're on a ringworld, not a planet
- ✅ Player can navigate to specific megasegments
- ✅ Player feels the scale and immensity
- ✅ UI provides gameplay value (not just flavor)
- ✅ Lore is integrated seamlessly

## Future Enhancements

- **3D Ring View:** Rotate and inspect the ring from space
- **Fast Travel:** Click on discovered region to teleport
- **Megastructure Challenges:** Quests to repair/activate structures
- **Ring Encyclopedia Completion:** Collect lore fragments to unlock entries
- **Multiplayer Markers:** See other players' positions on ring
