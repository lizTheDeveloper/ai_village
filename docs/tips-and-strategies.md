# Tips and Strategies

Expert advice for getting the most out of the simulation.

---

## Philosophy of Play

### Embrace the Simulation

**This isn't a traditional game** - it's a living system you observe and nudge. The best experiences come from:

- **Letting go of control** - Agents surprise you when you don't micromanage
- **Being patient** - Emergent behavior takes time to develop
- **Observing patterns** - Watch for behaviors you didn't explicitly program
- **Creating constraints** - Limitations often produce the most interesting outcomes

### Think Like a Scientist

Approach the game as an experiment:
- **Form hypotheses** - "What if I give all agents fire magic?"
- **Test variables** - Change one thing, observe results
- **Document findings** - Take notes on interesting behaviors
- **Iterate** - Try variations, see what's most interesting

### Set Personal Goals

Since there's no "win condition," define your own:
- **Storytelling:** Follow specific agents' life stories
- **Engineering:** Build the most efficient resource pipeline
- **Sociology:** Study social dynamics and relationships
- **Ecology:** Create balanced multi-species ecosystems
- **Religion:** Watch pantheons emerge and interact
- **Chaos:** Introduce disasters and see how village recovers

---

## Helping Agents Survive

### Resource Fundamentals

**Food chain:**
1. **Early game:** Spawn or mark wild berries/plants for gathering
2. **Mid game:** Build farms for reliable food production
3. **Late game:** Automated cooking stations producing meals

**Shelter progression:**
1. **Day 1:** Place 2-3 tent blueprints (minimal resource cost)
2. **Week 1:** Build proper houses near water source
3. **Month 1:** Dedicated residential area with beds, storage, heat

**Resource placement tips:**
- **Centralize storage** - One main warehouse agents can access
- **Place near use** - Cooking station near food storage
- **Redundancy** - Multiple food sources in case one fails
- **Accessibility** - Ensure agents can path to all resources

### Monitoring Agent Health

**What to watch:**
- Open **Agent Roster** - Look for red dots (critical needs)
- Pin **Agent Info** for interesting agents you want to keep alive
- Check **Notifications** for death warnings
- Use **Admin Dashboard** → Agents for detailed health analytics

**Early warning signs:**
- Agent constantly seeking food (not enough available)
- Agent sleeping on ground (build more beds)
- Agent avoiding others (critical cleanliness need)
- Agent moving slowly (check temperature comfort)

**Intervention strategies:**
- **Spawn resources** via Dev Panel (short-term fix)
- **Build infrastructure** (long-term solution)
- **Grant skill XP** in survival skills (helps agent prioritize)
- **Relocate agent** to better resource area

### Preventing Common Deaths

**Starvation:**
- Ensure 2-3 food items per agent always available
- Farms produce food continuously
- Multiple food sources (foraging, farming, hunting)
- Storage accessible to all agents

**Exhaustion:**
- One bed per 2-3 agents minimum
- Beds in sheltered areas
- Don't overwork agents (they'll rest autonomously)

**Environmental:**
- Build shelters in temperate zones
- Provide heating (fires) in cold areas
- Water access for cooling in heat
- Avoid building in hazardous areas (near fire, deep water)

**Combat:**
- Don't spawn aggressive predators early
- Build defensive structures if predators present
- Assign guards with combat skills
- Provide healing resources

---

## Efficient Resource Gathering

### Gathering Priorities

**What agents need most (in order):**
1. **Food** - Constant need, highest priority
2. **Wood** - Building, fuel, tools
3. **Stone** - Durable construction
4. **Water** - Drinking, farming, cleaning

**How to optimize gathering:**
- **Zone designation** - Paint gather zones for priority resources
- **Skill specialization** - High-foraging agents gather food, high-woodcutting cut trees
- **Strategic spawning** - Spawn resources near village center
- **Mark targets** - Right-click specific trees/plants → "Mark for gathering"

### Building Material Management

**Storage strategy:**
- **Central warehouse** for bulk storage
- **Production stockpiles** near crafting stations (dedicated)
- **Emergency caches** distributed around village

**Material flow:**
```
Gathering → Central Storage → Crafting Station → Finished Goods → Distribution
```

**Avoid over-gathering:**
- Don't strip all trees (some agents need them for pathfinding/shade)
- Leave some plants for re-seeding
- Balanced extraction = sustainable village

### Automation for Gathering (Advanced)

**Set up gathering automation:**
1. **Conveyor belts** from resource spawn points to storage
2. **Assembly machines** processing raw → refined materials
3. **Power grid** running everything
4. Agents freed from gathering, can do higher-value tasks

**When to automate:**
- After establishing basic survival
- When agent count > 20
- When repetitive tasks dominate agent time
- For scaling production massively

---

## Building Placement Tips

### Location Strategy

**Housing area:**
- Near fresh water (river, well)
- Central to resources (minimize travel)
- Temperate zone (avoid extreme heat/cold)
- Flat terrain (easier construction, pathfinding)

**Production area:**
- Near raw material sources (forest for lumber mill)
- Downwind from housing (smoke, noise)
- Expandable space for growth
- Connected by roads/paths

**Farms:**
- Fertile soil (check with Tile Inspector Panel)
- Near water source (irrigation)
- Flat terrain
- Good sunlight (avoid heavy tree coverage)

**Religious buildings:**
- Visible/prominent locations (hilltops)
- Separate from mundane buildings
- Near natural features (sacred grove, spring)
- Central for community access

### Construction Efficiency

**Build order for new village:**
1. **Tents** (quick shelter, low cost)
2. **Stockpile zones** (organized storage)
3. **Crafting station** (tool production)
4. **Farms** (food security)
5. **Houses** (upgrade from tents)
6. **Workshop** (advanced crafting)
7. **Infrastructure** (roads, wells, defenses)

**Cluster buildings:**
- Group by function (all production together)
- Reduces travel time
- Easier to manage
- More efficient resource sharing

**Use blueprints wisely:**
- Start with small, cheap buildings
- Upgrade gradually
- Custom blueprints for specific needs
- Save successful designs for reuse

### Defensive Placement

**If predators/threats present:**
- **Walls** around perimeter
- **Watchtowers** at corners
- **Gates** for controlled entry
- **Guard posts** at strategic points
- **Escape routes** from every area

---

## Using the Admin Dashboard Effectively

### Dashboard Workflows

**Morning check routine:**
1. Open http://localhost:8766/admin
2. **Overview tab** - Check TPS, agent count, warnings
3. **Agents tab** - Sort by health, identify struggling agents
4. **LLM Queue** - Check if decision-making is backed up
5. Close dashboard, address issues in-game

**Deep dive investigation:**
1. **Select interesting agent** in game
2. **Admin Dashboard** → Agents → Search by name
3. View full history: memories, relationships, behaviors
4. Cross-reference with Metrics for patterns
5. Return to game to intervene or continue observing

**Performance debugging:**
1. Notice TPS drop (F3 panel shows < 15)
2. **Admin Dashboard** → Overview → System Performance
3. Identify slowest systems
4. Reduce relevant entities (e.g., too many animals)
5. Adjust settings or cull entities

### Useful Dashboard Queries

**Find all agents with critical hunger:**
- Agents tab → Filter by "Hunger < 30%"
- Spawn food near them or ensure farm is producing

**See LLM cost breakdown:**
- LLM Queue tab → Cost by Provider
- Optimize by switching to cheaper models for routine decisions

**View agent behavior patterns:**
- Select agent → Behavior History
- See what agent does most often
- Understand emergent patterns

**Time travel to interesting moment:**
- Time Travel tab → Browse snapshots
- Load snapshot from before interesting event
- Re-observe or try different intervention

---

## Interesting Things to Try

### Experiments to Run

**Social experiments:**
- Spawn agents with opposing personalities, watch conflicts
- Create all-peaceful village vs. mixed personality village
- Isolate one agent, observe loneliness effects
- Form pairs, watch relationships develop

**Magic experiments:**
- Give all agents same paradigm, watch coordinated magic use
- Give each agent different paradigm, watch magic diversity
- Disable magic mid-game, observe adjustment
- Max out magic skills, watch reality-warping chaos

**Economic experiments:**
- Scarcity scenario (minimal resources, many agents)
- Abundance scenario (infinite resources, few agents)
- Introduce currency, observe trade emergence
- Limit specific resource, watch adaptation

**Religious experiments:**
- Ensure strong belief in one god, watch mono-theology
- Encourage diverse beliefs, watch pantheon politics
- Play as god, test different divine personalities
- Ignore prayers vs. answer all prayers

**Disaster recovery:**
- Let village establish for 10 in-game days
- Trigger fire disaster (Dev Panel)
- Observe rebuilding and adaptation
- Compare to control village (fork universe first)

### Emergent Behavior to Watch For

**Look for:**
- **Spontaneous cooperation** - Agents helping without being told
- **Social hierarchies** - Leaders emerging naturally
- **Cultural traditions** - Repeated behaviors becoming norms
- **Innovation** - Agents finding creative solutions
- **Storytelling** - Complex narratives emerging from simple rules
- **Adaptation** - Population adjusting to constraints

**Document:**
- Take screenshots of interesting moments
- Note agent names in interesting stories
- Save before major events (for replaying)
- Share emergent stories with community

---

## Watching for Emergent Behavior

### How to Observe Without Interfering

**Observer mode:**
1. Spawn initial agents and resources
2. **Pause interventions** - Don't spawn, don't grant resources
3. **Select different agents** to watch their perspectives
4. **Speed up time** (2x or 4x) to see patterns faster
5. **Take notes** on surprising behaviors

**What to track:**
- Agent relationships (who becomes friends with whom?)
- Resource usage patterns (do agents specialize?)
- Building choices (where do agents prefer to build?)
- Magic adoption (which paradigms become popular?)
- Religious trends (which gods gain followers?)

### Understanding Agent Decision-Making

**Agents decide based on:**
1. **Immediate needs** - Hunger, energy (highest priority)
2. **Goals** - Personal objectives generated by AI
3. **Social context** - What other agents are doing
4. **Memory** - Past experiences influencing current choices
5. **Personality** - Individual traits affecting preferences

**To understand specific decision:**
1. **Select agent** (Agent Info Panel)
2. **Read "Current Thought"** - See reasoning
3. **Check needs** - Critical needs override everything
4. **View memories** (Memory Inspector) - Recent experiences influencing choice
5. **Relationships** - Social factors in decision

**Example decision breakdown:**
```
Agent Alice is gathering wood.

Why?
1. Current Thought: "I need materials to build shelter"
2. Needs: Energy 80%, Hunger 60% (no critical needs blocking)
3. Goal: "Build a house for myself and family"
4. Memory: "Yesterday I saw Bob building his house, felt inspired"
5. Personality: Industrious, forward-thinking
6. Context: Wood is visible nearby, no other pressing tasks

Result: Autonomous decision to gather wood for future building project
```

### Recognizing Patterns

**Behavioral patterns to watch:**
- **Daily routines** - Wake, eat, work, socialize, sleep
- **Social clustering** - Friend groups forming
- **Specialization** - Agents favoring certain tasks
- **Territorial behavior** - Preferred areas
- **Innovation diffusion** - New behaviors spreading through population

**When you notice a pattern:**
- Ask: "Why is this happening?"
- Isolate variables (test with fork universe)
- Change one factor, see if pattern persists
- Document and share interesting patterns

---

## Advanced Strategies

### Multi-Generational Planning

**Long-term village development:**
1. **Generation 1** (Days 1-20)
   - Survival basics
   - Simple buildings
   - Resource gathering routines

2. **Generation 2** (Days 20-50)
   - Infrastructure expansion
   - Skill specialization emerging
   - Cultural traditions forming

3. **Generation 3+** (Days 50+)
   - Advanced automation
   - Complex social structures
   - Rich religious/magical culture
   - Multi-lifetime storylines (reincarnation)

**What to track:**
- Family lineages
- Skill inheritance (children learn from parents)
- Cultural transmission (traditions passing down)
- Infrastructure evolution

### Scaling Your Village

**Growing from 5 agents to 50:**

**Small village (5-10 agents):**
- Personal attention to each agent
- Manual resource management
- Simple social dynamics
- Easy to follow stories

**Medium village (10-30 agents):**
- Specialization emerges
- Build management infrastructure
- Complex social networks
- Need organization systems

**Large village (30-50+ agents):**
- Automation essential
- Leaders/hierarchy needed
- Use Admin Dashboard heavily
- Emergent behaviors at scale

**Tips for scaling:**
- Build infrastructure BEFORE adding agents
- Ensure resources scale (food, housing, jobs)
- Use zones and automation
- Accept you can't follow every agent's story
- Focus on macro patterns

### Creating Interesting Challenges

**Self-imposed constraints:**
- **Limited resources** - Specific resource max (e.g., 100 wood total)
- **Specific biome** - Harsh environment (desert, tundra)
- **Magic-only** - Agents must use magic for all tasks
- **Pacifist village** - No combat allowed
- **Nomadic** - Agents can't build permanent structures
- **Theocracy** - All decisions guided by gods

**Scenario ideas:**
- **The Exodus** - Agents must migrate to new location
- **The Plague** - Random deaths, village must survive
- **The Prophet** - One agent receives divine visions, others must decide to follow
- **The Experiment** - Two villages, different rules, compare outcomes
- **The Collapse** - Thriving village loses all resources overnight

---

## Performance Optimization Strategies

### Keeping Simulation Smooth

**Agent count guidelines:**
- **5-15 agents:** Smooth on any system
- **15-30 agents:** Good performance on decent hardware
- **30-50 agents:** Requires good CPU, optimized settings
- **50+ agents:** Expert-level optimization needed

**Entity management:**
- Limit total entities < 5000 (agents + animals + items + buildings)
- Cull old items (Dev Panel → Remove old dropped items)
- Don't spawn excessive animals
- Clear finished buildings (remove ruined structures)

**System throttling:**
Settings → Simulation:
- Non-critical update frequency: LOW
- Memory consolidation: SLOW
- Weather updates: INFREQUENT

**Visual optimizations:**
- Fallback sprites (faster than PixelLab)
- Disable particles
- Lower FPS cap to 30
- Reduce zoom (less entities on screen)

### When to Fork vs. Continue

**Fork universe when:**
- Testing major changes (new magic ruleset)
- Want to compare outcomes (two different approaches)
- Before risky interventions (might break village)
- Preserving interesting moment (before disaster)

**Continue existing universe when:**
- Invested in current stories
- Village has rich history
- Multi-generational play
- Testing would disrupt immersion

**Universe management:**
- Delete old experiment forks regularly
- Keep 2-3 "main timeline" universes
- Name universes descriptively ("Magic Test 1", "Main - Day 50")

---

## Expert Tips

### Hidden Mechanics

**Things the game doesn't explicitly tell you:**
- Agents share knowledge through conversation (skills, discoveries, beliefs)
- Building quality affects durability and agent preferences
- Gods' personalities evolve based on worship style
- Memories fade over time (consolidation to semantic memory)
- Reincarnated souls have stat bonuses from past lives
- Sacred sites spawn naturally near divine events
- Magic paradigms interact (combining can create hybrid effects)

### Leveraging the LLM

**The AI decision system is powerful:**
- Agents truly make autonomous choices (not scripted)
- More interesting with varied personalities
- Context matters (what agents can see/remember influences decisions)
- Emergent behavior is real, not simulated

**To get best LLM behaviors:**
- Provide diverse situations
- Don't over-control
- Let agents build memories
- Give them interesting problems to solve
- Watch for novel solutions

**Admin Dashboard → LLM Queue:**
- See what agents are thinking about
- Identify decision patterns
- Monitor LLM costs and adjust if needed

### Community Strategies

**Share your experiences:**
- Document emergent stories
- Screenshot interesting moments
- Save interesting universes for others to explore
- Contribute mod content (magic paradigms, buildings)

**Learn from others:**
- Read community discussions
- Try others' scenarios
- Import shared blueprints/items
- Collaborate on experiments

---

## Final Wisdom

### The Art of Observation

**The game rewards patience:**
- Most interesting behaviors emerge over time
- Watching is as valuable as acting
- Patterns you notice are unique to your universe
- Every simulation tells a different story

### The Balance of Intervention

**When to intervene:**
- Village is truly stuck (all agents starving, no food accessible)
- Testing specific mechanic
- Setting up interesting scenario
- Recovering from bug/corruption

**When to observe:**
- Village is struggling but has potential to recover
- Interesting social dynamics developing
- Emergent patterns appearing
- Stories unfolding naturally

### The Joy of Emergence

**The magic happens when:**
- You're surprised by agent behavior
- Unexpected stories develop
- Complex patterns emerge from simple rules
- The simulation teaches you something
- You forget you're "playing" and just watch

> "The best moments are the ones you didn't plan."

---

**[← Back to Main Docs](./README.md)**

Enjoy your journey through the multiverse! Every simulation is unique, and the stories your agents create are yours alone.
