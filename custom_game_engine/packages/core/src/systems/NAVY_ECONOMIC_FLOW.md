# Navy Economic System Flow Diagram

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Nation Economy                            │
│  GDP: 1,000,000  |  Military Budget: 150,000 (15% of GDP)         │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                    NationSystem.allocateNavyBudget()
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
       Peace (10%)        Tension (25%)      War (40%)
       15,000             37,500             60,000
              │                 │                 │
              └─────────────────┴─────────────────┘
                                │
                        Navy Annual Budget
                                │
                    NavyBudgetSystem.processAnnualBudget()
                    (Every 6000 ticks = 5 minutes)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   Construction 30%        Maintenance 25%         Personnel 30%
     18,000                  15,000                  18,000
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌──────────────┐       ┌─────────────────┐
│  Shipyard     │      │  Fleet       │       │  Personnel      │
│  Production   │      │  Maintenance │       │  Payroll        │
│  System       │      │  (Existing)  │       │  System         │
│  Priority 170 │      │              │       │  Priority 175   │
└───────┬───────┘      └──────┬───────┘       └────────┬────────┘
        │                     │                         │
        │                     │                         │
        ▼                     ▼                         ▼
```

## Shipyard Production System Detail

```
┌────────────────────────────────────────────────────────────────────┐
│                   ShipyardProductionSystem                         │
│                   (Every 100 ticks = 5 seconds)                    │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                     processConstructionQueue()
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
  ┌──────────┐           ┌──────────┐          ┌──────────┐
  │ Project  │           │ Project  │          │ Project  │
  │ Alpha    │           │ Beta     │          │ Gamma    │
  │ 45%      │           │ 78%      │          │ 12%      │
  └────┬─────┘           └────┬─────┘          └────┬─────┘
       │                      │                      │
       │ Check Resources      │ Check Resources      │ Check Resources
       ├────────────────┐     ├────────────────┐     ├────────────────┐
       │ Available?     │     │ Available?     │     │ Available?     │
       │ Yes            │     │ Yes            │     │ No - DELAY     │
       │                │     │                │     │                │
       │ Allocate       │     │ Allocate       │     │ Emit:          │
       │ Budget         │     │ Budget         │     │ construction_  │
       │                │     │                │     │ delayed        │
       │ Increment      │     │ Increment      │     │                │
       │ Progress       │     │ Progress       │     └────────────────┘
       │ → 50%          │     │ → 85%          │
       │                │     │                │
       └────────────────┘     │                │
                              ▼                │
                         Progress 100%         │
                              │                │
                    completeShipConstruction() │
                              │                │
                              ▼                │
                    ┌──────────────────┐       │
                    │ Create Spaceship │       │
                    │ Component Entity │       │
                    └────────┬─────────┘       │
                             │                 │
                             ├─────────────────┘
                             │
                             ▼
                    Update navy.assets.totalShips
                             │
                             ▼
                    Emit: shipyard:construction_completed
```

## Personnel System Detail

```
┌────────────────────────────────────────────────────────────────────┐
│                    NavyPersonnelSystem                             │
│                   (Every 1200 ticks = 1 minute)                    │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                   processPersonnelCosts()
                                │
                    estimateRankDistribution()
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   Captains: 50          Navigators: 50          Engineers: 500
   Marines: 750          Crew: 3,650
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                    calculateCrewPayroll()
                                │
                    ┌───────────┴───────────┐
                    │                       │
            Base Salary × Rank Multiplier   │
                    │                       │
            Captains: 50 × 50 = 2,500       │
            Navigators: 50 × 30 = 1,500     │
            Engineers: 500 × 20 = 10,000    │
            Marines: 750 × 15 = 11,250      │
            Crew: 3,650 × 10 = 36,500       │
                    │                       │
            Total Payroll: 61,750           │
                    │                       │
                    └───────────┬───────────┘
                                │
                    calculateTrainingCosts()
                                │
                    ┌───────────┴───────────┐
                    │                       │
        Officer Academy (quality 1.5)       │
        100 officers × 1000 × 1.5 = 150,000 │
                    │                       │
        NCO Training (quality 1.2)          │
        500 NCOs × 500 × 1.2 = 300,000      │
                    │                       │
                    └───────────┬───────────┘
                                │
                    calculateRetentionCosts()
                                │
                Veterans: 20 × 500 = 10,000
                                │
                    ┌───────────┴───────────┐
                    │                       │
            Total Personnel Cost: 521,750   │
            Personnel Budget: 18,000        │
                    │                       │
        SHORTFALL: 503,750 (96% unpaid!)    │
                    │                       │
                    └───────────┬───────────┘
                                │
                                ▼
                Emit: navy:personnel_budget_shortfall
                                │
                                ▼
                    FleetSystem.reduceFleetMorale()
                                │
                                ▼
                        MORALE CRISIS!
```

## Budget Deficit Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    Insufficient Budget Scenario                    │
└────────────────────────────────────────────────────────────────────┘

Nation at Peace → Navy Budget: 15,000 (10% of military)
                                │
                NavyBudgetSystem.processAnnualBudget()
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   Construction          Maintenance               Personnel
     4,500                 3,750                     4,500
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
  Can build 0-1            Need 10,000              Need 21,750
  courier ships            for 100 ships            for 5,000 crew
        │                       │                       │
        │                  SHORTFALL!               SHORTFALL!
        │                   6,250                    17,250
        │                       │                       │
        │                       ▼                       ▼
        │              Defer maintenance         Unpaid crew: 79%
        │                       │                       │
        │                       ▼                       ▼
        │              Degrade 60 ships         Morale crisis
        │              Hull integrity            Readiness -40%
        │              -10%                      Risk of mutiny
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                                ▼
                    Nation declares war! (Emergency)
                                │
                                ▼
                Navy Budget: 60,000 (40% of military)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   Construction          Maintenance               Personnel
     18,000                15,000                    18,000
        │                       │                       │
        ▼                       ▼                       ▼
  Build 1 threshold     Maintain all ships        Pay all crew
  ship per year         Restore readiness         Restore morale
```

## Ship Construction Timeline

```
Year 1, Month 1 (Tick 0)
│
├─ Nation allocates military budget
│  └─ Navy receives 60,000 (war-time)
│
├─ NavyBudgetSystem allocates budget
│  ├─ Construction: 18,000
│  ├─ Maintenance: 15,000
│  ├─ Personnel: 18,000
│  ├─ R&D: 6,000
│  └─ Reserves: 3,000
│
└─ ShipyardProductionSystem.queueShipConstruction()
   └─ Request: threshold_ship "HMS Defiant"
      ├─ Cost: 10,000 budget
      ├─ Capacity: 1.0 points
      ├─ Resources: reinforced_hull (100), advanced_circuit (50)...
      └─ ETA: 6000 ticks (5 minutes = 1 year)

Year 1, Month 2 (Tick 1200)
│
└─ Construction progress: 10%
   ├─ Budget allocated: 1,000
   └─ Resources consumed: reinforced_hull (10), advanced_circuit (5)

Year 1, Month 6 (Tick 3000)
│
└─ Construction progress: 50%
   ├─ Budget allocated: 5,000
   └─ Resources consumed: reinforced_hull (50), advanced_circuit (25)

Year 1, Month 12 (Tick 6000)
│
└─ Construction COMPLETE!
   ├─ Progress: 100%
   ├─ Budget spent: 10,000
   ├─ Create SpaceshipComponent entity
   ├─ Update navy.assets.totalShips: 101
   └─ Emit: shipyard:construction_completed

Year 2, Month 1 (Tick 6100)
│
└─ Ship joins fleet
   ├─ Assign to Squadron Alpha
   ├─ Squadron joins Fleet Bravo
   └─ Fleet joins Armada One
```

## Resource Dependency Chain

```
Ship Construction Requirements:

threshold_ship
    │
    ├─ reinforced_hull (100)
    │  ├─ stellarite_ingot (50)
    │  │  └─ stellarite_ore (100) → Mining
    │  └─ hull_plating (150)
    │     └─ iron_ore (300) → Mining
    │
    ├─ advanced_circuit (50)
    │  ├─ basic_circuit (100)
    │  │  ├─ silicon_wafer (200)
    │  │  │  └─ silicon_sand (400) → Mining
    │  │  └─ copper_wire (300)
    │  │     └─ copper_ore (600) → Mining
    │  └─ rare_earth_compound (50)
    │     └─ rare_earth_ore (100) → Mining
    │
    ├─ stellarite_ingot (50)  [see above]
    │
    ├─ propulsion_unit (15)
    │  ├─ void_capacitor (30)
    │  │  └─ void_essence (60) → Magic/Harvest
    │  └─ mana_crystal (45)
    │     └─ refined_mana (90)
    │        └─ mana_shard (180) → Magic/Harvest
    │
    ├─ navigation_array (5)
    │  ├─ quantum_processor (10)
    │  │  └─ [complex chain]
    │  └─ crystal_lens (15)
    │     └─ raw_crystal (30) → Mining
    │
    └─ power_core (10)
       ├─ neutronium_core (2)
       │  └─ neutronium_shard (4) → Exotic Mining
       └─ emotional_matrix (5)
          └─ emotional_essence (10)
             └─ emotional_resonance (20) → Harvest from emotions

TOTAL REQUIRED FOR 1 THRESHOLD SHIP:
  - 30+ different resource types
  - 2000+ individual resource units
  - Mining, Magic, Emotion harvesting, Advanced crafting
```

---

**This diagram illustrates:**
- Budget flow from nation → navy → systems
- Construction queue processing
- Personnel cost calculations
- Deficit handling and consequences
- Ship construction timeline
- Resource dependency chains
