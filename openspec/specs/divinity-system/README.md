# Divinity System Specification

> Gods are not designed—they are discovered.

## Overview

This system implements an inverted god game where:
- The player is an undefined deity who learns their identity from believers
- Gods emerge from collective belief and storytelling
- LLMs control rival deities with emergent personalities
- Mythology is procedurally generated and shapes divine identity

## Specification Documents

### [belief-and-deity-system.md](./belief-and-deity-system.md)
The core specification covering:
- Belief as a resource (generation, storage, decay)
- Deity entity architecture
- The Player God (blank slate identity)
- Emergent Gods (how new deities form)
- Myth Generation (LLM-based storytelling)
- Divine Powers (what belief enables)
- Avatar Manifestation
- Angels and Divine Agents
- Religious Institutions
- Theological Dynamics (schisms, conversion, syncretism)
- Implementation phases

### [divine-player-interface.md](./divine-player-interface.md)
How the player experiences godhood:
- Prayer queue and notifications
- Divine power selection and cost previews
- Identity screen ("Your Divine Bio")
- Mythology browser (stories about you)
- Reputation management ("beating the allegations")
- Pantheon view (rival gods)
- Avatar mode controls
- Angel management

### [ai-god-behavior.md](./ai-god-behavior.md)
How emergent deities think and act:
- God consciousness model
- Motivation and worldview systems
- Decision-making loop and LLM prompts
- Personality archetypes (fear-born, gratitude-born, etc.)
- Inter-god relationships and conflict
- Character development arcs
- Dormancy and death
- Consistency maintenance

### [magic-integration.md](./magic-integration.md)
How divinity integrates with the magic paradigm system:
- Divine power (belief) vs mortal magic (mana, blood, etc.)
- The Theurgic paradigm: how gods themselves use power
- Domain-to-form mapping with cost modifiers
- Universes without mortal magic (gods-only)
- Gods granting magic (divine gifts)
- Emergent god paradigm flavors
- Divine artifacts vs magical artifacts
- Extended MagicLawEnforcer for divine actions

### [pantheon-dynamics.md](./pantheon-dynamics.md)
How gods relate to each other:
- Pantheon structures (council, hierarchical, familial, etc.)
- Divine relationships (sentiment, feelings, formal status)
- Player-god relationship interface
- Diplomatic actions (alliances, treaties, wars)
- Divine meetings and negotiations
- Councils, voting, and divine politics
- Divine Chat - a chatroom where gods talk directly
- Private DMs between gods
- Conflict resolution and divine warfare

### [narrative-pressure-system.md](./narrative-pressure-system.md)
How higher-dimensional beings shape stories through outcome attractors:
- Outcome attractors (goal-oriented probability fields)
- Narrative pressure vs fate/destiny/plot
- Probability biasing mechanisms
- Path analysis and convergence detection
- Divine will implementation (gods spending belief to create attractors)
- Player narrative control
- Attractor conflicts and interference patterns
- Integration with events, AI, and combat systems
- Self-fulfilling prophecies and tragic arcs

### [epistemic-discontinuities.md](./epistemic-discontinuities.md)
How higher-dimensional beings exhibit knowledge without causal acquisition paths:
- Information without history (knowledge that was never computed)
- Timeline selection vs prediction
- Divine omniscient selection (gods choose timelines where they know things)
- Player save-scum memory (NPCs remember deleted saves)
- Adaptive AI (bosses "learn" from previous attempts)
- Deja vu and timeline bleeding
- Prophecy without causal paths
- Ancestral memory and memetic contagion
- Detection and agent awareness of discontinuities

## Key Concepts

### The Fundamental Inversion
Traditional god games give the player a fully-defined deity who imposes will downward. This system inverts that: identity flows upward from believers. The player discovers who they are through worship.

### Emergent Pantheon
Other gods aren't designed by developers—they crystallize from collective belief. A community traumatized by storms might birth a storm god. A prosperous village might elevate an ancestor to divinity. These gods are LLM-controlled with emergent motivations.

### Mythogenic Actions
Every divine action may become a story. Stories shape identity. Written stories become harder to contradict. The player must consider not just what they do, but how it will be interpreted and remembered.

### Theological Ecology
Multiple gods compete for believers, form alliances, merge through syncretism, or split through schisms. Religion in this world is alive, evolving, and contested.

## Integration Points

### Existing Systems
- **SpiritualComponent**: Already tracks faith, prayers, visions, doubts
- **Memory System**: Divine experiences become high-impact memories
- **Communication System**: Religious discussions spread stories
- **Book/Writing System**: Holy texts canonize mythology

### New Systems Required
- Deity entity type
- Belief economy
- Myth generation pipeline
- AI god decision system
- Avatar manifestation
- Angel entities
- Temple building type
- Schism/conversion mechanics
- Narrative pressure system (outcome attractors)
- Attractor field simulation
- Path convergence analysis
- Probability biasing mechanisms

## Design Philosophy

1. **Emergence over design**: Let complex theological dynamics arise from simple rules
2. **Meaningful constraints**: Power should feel earned, not granted
3. **Narrative weight**: Actions have consequences that persist in story
4. **Character depth**: AI gods should be interesting, not simple antagonists
5. **Player discovery**: The joy is learning who you are, not deciding who you are
