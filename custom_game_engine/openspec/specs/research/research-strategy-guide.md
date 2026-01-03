# Research Strategy Guide

> **Strategic analysis of research development paths and optimization for civilization advancement**

## Overview

Research is the key to unlocking technologies, buildings, abilities, and recipes. With 523 papers across 10 complexity levels, choosing the right research strategy can mean the difference between 5 days and 183 days to complete the full tree.

This guide provides mathematical analysis and strategic recommendations based on the research speed formula.

## Research Speed Formula

```
researchSpeed = baseSpeed × (1 + skillBonus) × (1 + buildingBonus) × numResearchers × focusMultiplier

Where:
- Skill Bonus: 0.1 per 10 skill points (skill 50 = 1.5× multiplier)
- Building Bonus: Library (+20%), University (+50%), Research Institute (+100%)
- numResearchers: Linear scaling, no diminishing returns
- Focus Multiplier: 1.5× if interested, 0.5× if distracted, 1.0× neutral
```

**All factors multiply together**, creating compound effects.

## The Four Levers of Research Speed

### 1. Researcher Count (Linear Impact, No Diminishing Returns)

**Impact:** Each researcher adds the same speed boost

```
 1 researcher → 10 researchers = 10× faster
10 researchers → 20 researchers = 2× faster
```

**Sensitivity Analysis:**
- Going from 3 → 5 researchers: **-40% time** (biggest single improvement)
- Going from 5 → 10 researchers: **-50% time**
- Going from 10 → 20 researchers: **-50% time**

**Key Insight:** Researchers have **no diminishing returns**. The 20th researcher is just as valuable as the 1st.

**Trade-offs:**
- ✅ Immediate impact - hire today, research faster today
- ✅ Scales linearly - predictable results
- ❌ Opportunity cost - researchers aren't farming/building/crafting
- ❌ Population limited - can't hire 100 researchers with 20 villagers

### 2. Building Bonuses (Multiplicative Boost)

**Impact:** Multiply the effectiveness of all researchers

```
Library:            +20% (1.2× multiplier)
University:         +50% (1.5× multiplier)
Research Institute: +100% (2.0× multiplier)
```

**Sensitivity Analysis:**
- None → Library: **-17% time**
- Library → University: **-20% time**
- University → Institute: **-25% time**
- None → Institute: **-50% time** (massive boost)

**Key Insight:** Building bonuses **compound with researcher count**. A Research Institute with 10 researchers provides 20× speed (10 × 2.0), not 12× speed.

**Trade-offs:**
- ✅ Permanent bonus - build once, benefit forever
- ✅ Multiplicative - scales with researcher count
- ✅ No maintenance cost
- ❌ High upfront cost (resources, construction time)
- ❌ Delayed benefit - must finish building first
- ❌ Research requirement - must unlock the building through research first

### 3. Skill Level (Steady Progression)

**Impact:** Increases research speed as researchers gain experience

```
Skill  10: 1.1× multiplier
Skill  50: 1.5× multiplier
Skill 100: 2.0× multiplier
```

**Sensitivity Analysis:**
- Skill 5 → 40: **-25% time**
- Skill 40 → 80: **-22% time**
- Skill 80 → 100: **-10% time**

**Key Insight:** Skill grows over time as researchers complete papers (approximately +0.2 skill per paper). Early research trains your researchers for later research.

**Trade-offs:**
- ✅ Automatic - researchers gain skill by researching
- ✅ Compounds over time - late game research goes much faster
- ❌ Slow buildup - takes completing papers to gain skill
- ❌ Reset on death - researcher turnover loses trained expertise

### 4. Focus Multiplier (Hidden Powerhouse)

**Impact:** Whether researchers are engaged or distracted

```
Distracted:  0.5× (researching uninteresting topics, needs unsatisfied)
Neutral:     1.0× (doing their job)
Focused:     1.2× (researching topics of interest)
Dedicated:   1.5× (passionate + needs met + relevant skills)
```

**Sensitivity Analysis:**
- Distracted (0.5×) → Dedicated (1.5×): **-67% time** (3× speed!)
- Neutral (1.0×) → Focused (1.2×): **-17% time**
- Focused (1.2×) → Dedicated (1.5×): **-20% time**

**Key Insight:** Focus is often **overlooked but extremely powerful**. A dedicated researcher is worth 3 distracted researchers.

**How to maximize focus:**
- ✅ Assign researchers to papers in their field of interest
- ✅ Keep researcher needs satisfied (food, shelter, social)
- ✅ Match papers to researcher skills (Nature researcher → Nature papers)
- ✅ Avoid assigning too many concurrent papers (spreads attention)
- ❌ Don't force researchers to study unrelated fields
- ❌ Don't let researcher morale drop

## Strategic Archetypes

### 🏫 "Build Schools First" Strategy

**Philosophy:** Invest heavily in infrastructure early, fewer but highly trained researchers

**Configuration:**
- 4 researchers
- Skill 60 (well-trained)
- Research Institute (built early)
- Focus 1.3× (dedicated academics)

**Results:**
- Completion time: **579 hours (36 days)**
- Total multiplier: **16.6× base speed**

**Pros:**
- ✅ Lower population requirement
- ✅ Long-term efficiency (buildings are permanent)
- ✅ Prestige/quality focus
- ✅ Less vulnerability to distraction (smaller team)

**Cons:**
- ❌ Slow start (must build institute first)
- ❌ High resource cost upfront
- ❌ Vulnerable to researcher loss (few researchers)
- ❌ Requires unlocking Research Institute through research first

**Best for:**
- Small populations (< 20 villagers)
- Resource-rich starts
- Long-term strategic planning
- Defensive/isolated civilizations

---

### 👥 "Hire Researchers Fast" Strategy

**Philosophy:** Throw people at the problem, minimal infrastructure investment

**Configuration:**
- 12 researchers
- Skill 30 (basic training)
- Library only (minimal building investment)
- Focus 1.1× (some distraction from large team)

**Results:**
- Completion time: **468 hours (29 days)**
- Total multiplier: **20.6× base speed**

**Pros:**
- ✅ Fastest raw speed (more researchers = linear gains)
- ✅ Immediate results (no waiting for buildings)
- ✅ Flexible (can reassign researchers easily)
- ✅ Resilient to loss (losing 1 of 12 is less impactful)

**Cons:**
- ❌ Requires large population (12+ researchers from 30+ villagers)
- ❌ High opportunity cost (researchers aren't producing)
- ❌ Lower efficiency per researcher
- ❌ Harder to maintain focus with large team

**Best for:**
- Large populations (50+ villagers)
- Urgent research needs (war, crisis)
- Expansionist civilizations
- When you have surplus labor

---

### ⚖️ "Balanced Growth" Strategy

**Philosophy:** Moderate investment in both researchers and infrastructure

**Configuration:**
- 7 researchers
- Skill 50 (medium training)
- University (mid-tier building)
- Focus 1.2× (focused but not obsessed)

**Results:**
- Completion time: **510 hours (32 days)**
- Total multiplier: **18.9× base speed**

**Pros:**
- ✅ Flexible approach
- ✅ Adapts to circumstances
- ✅ Balanced costs (not too many researchers, not too expensive buildings)
- ✅ Steady progression

**Cons:**
- ❌ Not optimized for any specific constraint
- ❌ Middle-of-the-road efficiency
- ❌ May be suboptimal compared to specialized strategies

**Best for:**
- Uncertain conditions
- First-time players
- Civilizations without clear bottlenecks
- When you want safety/flexibility

---

### 🏆 "Elite Academy" Strategy

**Philosophy:** Few master researchers with best facilities (optimal strategy)

**Configuration:**
- 5 researchers
- Skill 90 (master researchers)
- Research Institute (best facilities)
- Focus 1.5× (maximum dedication)

**Results:**
- Completion time: **338 hours (21 days)** ⭐ FASTEST
- Total multiplier: **28.5× base speed**

**Pros:**
- ✅ **Fastest overall strategy**
- ✅ Best compound multipliers (skill × building × focus)
- ✅ Prestige civilization (master researchers)
- ✅ Efficient resource use per paper

**Cons:**
- ❌ Requires high skill researchers (time investment)
- ❌ Must build Research Institute first
- ❌ Vulnerable to researcher turnover
- ❌ Hard to achieve early game

**Best for:**
- Late-game optimization
- Quality-focused civilizations
- When you can attract/retain top talent
- **Recommended end-state for any civilization**

---

### ⚡ "Quantity Over Quality" Strategy

**Philosophy:** Maximum researchers, minimal training/facilities (emergency mode)

**Configuration:**
- 20 researchers
- Skill 20 (minimal training)
- No buildings (rush strategy)
- Focus 0.8× (distraction from chaos)

**Results:**
- Completion time: **502 hours (31 days)**
- Total multiplier: **19.2× base speed**

**Pros:**
- ✅ No building prerequisites (immediate start)
- ✅ Maximum raw researcher count
- ✅ Can execute with minimal resources

**Cons:**
- ❌ Inefficient (slower than "Hire Researchers Fast" with Library)
- ❌ Massive opportunity cost (20 researchers!)
- ❌ Low focus from chaos (0.8× instead of 1.2×)
- ❌ Risk of burnout/dissatisfaction

**Best for:**
- Emergency situations (war, crisis)
- Desperate research pushes
- When efficiency doesn't matter, only speed
- **Not recommended for normal play**

## Optimization Priorities

Based on mathematical analysis, here are the priority optimizations:

### 1st Priority: Build Research Buildings (Biggest Multiplicative Boost)

**Impact:** -50% time (None → Research Institute)

Research Institute provides a **2× multiplier** to all research. This compounds with everything else:
- 5 researchers with Institute = **10× speed**
- 5 researchers without = **5× speed**

**Action Steps:**
1. Research papers required to unlock Library (early)
2. Build Library as soon as possible (+20%)
3. Research papers to unlock University
4. Build University mid-game (+50%)
5. Research papers to unlock Research Institute
6. Build Institute late-game (+100%)

---

### 2nd Priority: Assign More Researchers (Linear Scaling)

**Impact:** -40% time (3 → 5 researchers)

Each researcher adds the same speed boost with **no diminishing returns**.

**Action Steps:**
1. Identify villagers with high relevant skills (Nature, Alchemy, etc.)
2. Assign them to research duty
3. Balance against other needs (farming, defense, crafting)
4. Aim for 5-7 researchers mid-game, 10+ late-game

---

### 3rd Priority: Train Researchers (Steady Long-term Gains)

**Impact:** -25% time (Skill 10 → 50)

Skill grows automatically as researchers complete papers (~0.2 skill per paper).

**Action Steps:**
1. Keep same researchers on research duty (don't rotate)
2. Assign papers in researchers' existing skill areas (faster completion)
3. Let researchers specialize (Nature expert, Alchemy expert, etc.)
4. Protect experienced researchers from danger

---

### 4th Priority: Maintain Focus (Easy 1.2-1.5× Boost)

**Impact:** -20% time (1.0× → 1.2× focus)

Focus is **free** if you manage it properly.

**Action Steps:**
1. Match papers to researcher interests
2. Keep researcher needs satisfied (food, shelter, social)
3. Don't assign too many concurrent papers per researcher
4. Celebrate research milestones (morale boost)
5. Build research facilities near housing (reduce travel time/distraction)

## Progressive Strategy Roadmap

### Early Game (0-50 Papers, ~23 Hours)

**Constraints:**
- Small population (5-15 villagers)
- Limited resources
- No research buildings yet

**Strategy: "Minimal Viable Research"**
```
Researchers: 2-3
Skill: 5-15
Building: None (working toward Library)
Focus: 1.0× (basic)
```

**Goals:**
1. Complete 5-10 basic papers to unlock Library
2. Identify which villagers have research aptitude
3. Begin skill progression
4. **Don't over-commit** - research competes with survival needs

---

### Early-Mid Game (50-100 Papers, 23-52 Hours)

**Constraints:**
- Growing population (15-30 villagers)
- Library unlocked
- Resources for University being gathered

**Strategy: "Library Expansion"**
```
Researchers: 4-5
Skill: 15-25
Building: Library (+20%)
Focus: 1.1× (improving)
```

**Goals:**
1. Build Library ASAP
2. Research papers toward University unlock
3. Dedicate 4-5 villagers full-time to research
4. Skill training through consistent research

---

### Mid Game (100-250 Papers, 52-127 Hours)

**Constraints:**
- Established population (30-50 villagers)
- University built or in progress
- Stable economy

**Strategy: "University Acceleration"**
```
Researchers: 6-8
Skill: 35-55
Building: University (+50%)
Focus: 1.2× (focused team)
```

**Goals:**
1. Build University
2. Increase researcher count to 6-8
3. Maintain researcher focus through needs satisfaction
4. Research toward Research Institute unlock

---

### Late Game (250-400 Papers, 127-193 Hours)

**Constraints:**
- Large population (50+ villagers)
- Research Institute built
- Advanced economy

**Strategy: "Institute Mastery"**
```
Researchers: 10-12
Skill: 65-85
Building: Research Institute (+100%)
Focus: 1.3-1.4× (dedicated)
```

**Goals:**
1. Build Research Institute
2. Expand to 10+ researchers
3. High-skill researchers (65+)
4. Maintain high focus through job satisfaction

---

### End Game (400-523 Papers, 193-314 Hours)

**Constraints:**
- Mature civilization
- All facilities built
- Peak efficiency

**Strategy: "Elite Academy" (Transition)**
```
Researchers: 8-10 (optimize down from 12)
Skill: 85-100 (master level)
Building: Research Institute (+100%)
Focus: 1.4-1.5× (maximum dedication)
```

**Goals:**
1. Transition to fewer, higher-skill researchers
2. Focus on prestige and efficiency
3. Complete remaining complex papers (complexity 7-10)
4. Celebrate civilization achievement

## Comparative Timelines

### Scenario 1: Weak Start → Strong Finish (Natural Progression)

```
Phase          | Researchers | Skill | Building  | Time/50 Papers | Cumulative
---------------|-------------|-------|-----------|----------------|------------
Early (0-50)   |      3      |  10   | None      |     23h        |    23h
E-Mid (50-100) |      4      |  25   | Library   |     29h        |    52h
Mid (100-150)  |      6      |  45   | University|     24h        |    76h
L-Mid (150-250)|      8      |  65   | University|     51h        |   127h
Late (250-350) |     10      |  85   | Institute |     43h        |   170h
End (350-523)  |     12      | 100   | Institute |    144h        |   314h

Total: 314 hours (19.7 days)
```

This is the **realistic natural progression** for most civilizations.

---

### Scenario 2: "Rush Schools" (Infrastructure First)

```
Phase          | Researchers | Skill | Building  | Time/50 Papers | Cumulative
---------------|-------------|-------|-----------|----------------|------------
Early (0-50)   |      2      |  15   | Building! |     35h        |    35h
E-Mid (50-100) |      3      |  40   | Institute |     22h        |    57h
Mid (100-150)  |      4      |  60   | Institute |     12h        |    69h
L-Mid (150-250)|      4      |  75   | Institute |     25h        |    94h
Late (250-350) |      5      |  85   | Institute |     14h        |   108h
End (350-523)  |      5      |  95   | Institute |     34h        |   142h

Total: 142 hours (8.9 days) ⭐ Fastest if you can afford early Institute
```

High-risk, high-reward strategy. Requires:
- Unlocking Research Institute quickly (first 50 papers)
- Resources to build it immediately
- Enough population to sustain 2-5 dedicated researchers

---

### Scenario 3: "Hire Fast" (Population Surge)

```
Phase          | Researchers | Skill | Building  | Time/50 Papers | Cumulative
---------------|-------------|-------|-----------|----------------|------------
Early (0-50)   |      5      |  10   | None      |     14h        |    14h
E-Mid (50-100) |      8      |  20   | Library   |     10h        |    24h
Mid (100-150)  |     10      |  30   | Library   |      8h        |    32h
L-Mid (150-250)|     12      |  40   | Library   |     16h        |    48h
Late (250-350) |     15      |  50   | University|      9h        |    57h
End (350-523)  |     15      |  60   | University|     23h        |    80h

Total: 80 hours (5.0 days) ⭐ Fastest raw time, highest cost
```

Requires massive population (50+ villagers) and willingness to dedicate 15+ to research.

## Common Mistakes to Avoid

### ❌ Mistake 1: "Waiting for Perfect Conditions"

**Problem:** Delaying research until you have Institute + 10 researchers + high skills

**Why it's bad:** Research generates skill. Starting late means slower skill progression overall.

**Fix:** Start with 2-3 researchers immediately, even with no buildings. Early papers are easy and train your researchers.

---

### ❌ Mistake 2: "Rotating Researchers"

**Problem:** Cycling villagers through research duty for "fairness"

**Why it's bad:** Skill is per-researcher. Rotating loses accumulated skill and slows overall progress.

**Fix:** Dedicate 3-5 villagers to research permanently. Let them specialize and gain expertise.

---

### ❌ Mistake 3: "Building Library Too Late"

**Problem:** Researching 100+ papers before building Library

**Why it's bad:** Missing out on the +20% multiplier for early papers. The time saved on those 100 papers would've paid for the Library's cost.

**Fix:** Build Library after ~20 papers. It pays for itself in saved time.

---

### ❌ Mistake 4: "Ignoring Focus Multiplier"

**Problem:** Assigning researchers to papers they hate, or letting their needs go unmet

**Why it's bad:** Research speed can drop to 0.5× (distracted), effectively doubling research time.

**Fix:** Match papers to interests, keep researchers happy, maintain focus at 1.2× or higher.

---

### ❌ Mistake 5: "Too Many Concurrent Papers Per Researcher"

**Problem:** Assigning 5 different papers to each researcher

**Why it's bad:** Spreads attention, reduces focus multiplier, slows progress on all papers.

**Fix:** Limit to 1-2 concurrent papers per researcher. Let them focus and build momentum.

---

### ❌ Mistake 6: "Hoarding Researchers"

**Problem:** Assigning 20 researchers in early game when population is 25

**Why it's bad:** Cripples economy, food production, defense. Research doesn't matter if you starve.

**Fix:** Scale researchers with population. Early game: 2-3. Mid game: 5-7. Late game: 10-15.

## Advanced Optimization Techniques

### Technique 1: Skill Specialization

**Concept:** Instead of generalist researchers, create specialists

**Implementation:**
- Assign each researcher a primary field (Nature, Alchemy, Cuisine, Construction)
- Route papers in that field to that researcher
- They gain skill faster in their specialty
- Higher skill = higher focus (researching what they're good at)

**Result:** +10-20% speed from improved focus and skill synergy

---

### Technique 2: Building-Gated Progression

**Concept:** Time building construction to coincide with paper unlocks

**Implementation:**
- Complete papers toward Library unlock
- Start Library construction immediately upon unlock
- Continue researching while Library is being built
- Library completes just as next batch of papers begins

**Result:** Minimize "dead time" where you could benefit from building but it's not built yet

---

### Technique 3: Researcher Pipelining

**Concept:** New researchers start on easy papers while veterans tackle hard ones

**Implementation:**
1. Veteran researchers (skill 60+) → Complexity 7-10 papers
2. Mid-level researchers (skill 30-60) → Complexity 4-6 papers
3. New researchers (skill 5-30) → Complexity 1-3 papers

**Result:** Efficient skill progression, faster overall completion

---

### Technique 4: Focus Rotation for Morale

**Concept:** Prevent researcher burnout through strategic breaks

**Implementation:**
- After completing 10 papers, give researcher 1-2 day break
- Let them socialize, pursue hobbies, rest
- Return to research refreshed with +focus bonus

**Result:** Maintain 1.3-1.5× focus instead of degrading to 0.8-1.0×

## Multiplayer / Multiverse Considerations

### Strategy 1: "Cooperative Research Guilds"

**Concept:** Multiple civilizations pool researchers

**Benefits:**
- Share building bonuses (one civ builds Institute, all benefit)
- Distribute paper load (each civ specializes in a field)
- Trade completed papers

**Challenges:**
- Coordination overhead
- Trust required
- Unequal contribution risks

---

### Strategy 2: "Research Race"

**Concept:** Competition to unlock technologies first

**Optimal Strategy:**
- "Hire Researchers Fast" for raw speed
- Focus on high-value papers (unlock key technologies)
- Accept inefficiency for competitive advantage

---

### Strategy 3: "Knowledge Trade"

**Concept:** Civilizations trade completed papers

**Implications:**
- Reduces total papers needed (no duplication)
- Creates interdependence (trade leverage)
- Rewards specialization ("We're the Alchemy experts")

## Conclusion

Research strategy boils down to four levers:

1. **Researcher count** (linear, no diminishing returns)
2. **Building bonuses** (multiplicative, permanent)
3. **Skill progression** (automatic over time)
4. **Focus management** (free if you do it right)

**Optimal progression:**
- Early game: 2-3 researchers, build Library quickly
- Mid game: 5-7 researchers, build University
- Late game: 10+ researchers, build Research Institute
- End game: Transition to "Elite Academy" (fewer, better researchers)

**Key insight:** Research buildings are the **highest-leverage investment** in the game. A Research Institute provides a permanent 2× multiplier to all research forever.

The difference between a weak research strategy (183 days) and optimal (21 days) is **8.7× speed**. Research strategy matters enormously.

---

*Generated from mathematical analysis of 523 papers across 10 complexity levels. See `/scripts/research-time-scenarios.ts` for full simulation code.*
