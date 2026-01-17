# Documentation Index

**Master navigation for Multiverse: The End of Eternity documentation.**

This index organizes all documentation by purpose and audience. Use this as your primary entry point for understanding the codebase.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[README.md](../README.md)** - Project philosophy, inspirations, open source approach
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - ⚡ Essential commands, patterns, and facts
3. **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - High-level system architecture (ECS, packages, data flow)
4. **[CLAUDE.md](../CLAUDE.md)** - Development guidelines for AI agents (critical for LLM context)

**Want to run the game?**
```bash
cd custom_game_engine && ./start.sh
```
See [CLAUDE.md - Running the Game](../CLAUDE.md#running-the-game)

**Need quick facts?** See **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** for commands, patterns, troubleshooting

---

## 📚 Core Reference Documentation

### Architecture & Systems

| Document | Description | Audience |
|----------|-------------|----------|
| **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** | ECS architecture, packages, metasystems, data flow | All developers |
| **[SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)** | Complete catalog of 212+ systems with priorities, components | System developers |
| **[COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)** | 125+ component types with fields and examples | All developers |
| **[METASYSTEMS_GUIDE.md](./METASYSTEMS_GUIDE.md)** | Consciousness, Divinity, Reproduction, Multiverse, Magic, Realms | Feature developers |

### Behavior & Decision Making

| Document | Description | Audience |
|----------|-------------|----------|
| **[docs/BEHAVIOR_CONTEXT.md](./docs/BEHAVIOR_CONTEXT.md)** | Agent behavior API ("pit of success" pattern) | Behavior developers |
| **[docs/AGENT_DECISION_STATE_DIAGRAM.md](./docs/AGENT_DECISION_STATE_DIAGRAM.md)** | Agent decision flow and state machine | AI system developers |

### ECS & Performance

| Document | Description | Audience |
|----------|-------------|----------|
| **[packages/core/src/ecs/README.md](./packages/core/src/ecs/README.md)** | ECS implementation details | Core developers |
| **[docs/SYSTEM_BASE_CLASSES.md](./docs/SYSTEM_BASE_CLASSES.md)** | System base classes and patterns | System developers |
| **[docs/QUERY_CACHING.md](./docs/QUERY_CACHING.md)** | Query caching and optimization | Performance tuning |
| **[PERFORMANCE.md](./PERFORMANCE.md)** | Performance optimization guide | All developers |
| **[SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)** | GameLoop, system throttling, entity culling | Performance tuning |
| **[SIMULATION_SCHEDULER.md](./packages/core/src/ecs/SIMULATION_SCHEDULER.md)** | Entity culling (Dwarf Fortress-style) | Performance tuning |

### Persistence & Time Travel

| Document | Description | Audience |
|----------|-------------|----------|
| **[packages/persistence/README.md](./packages/persistence/README.md)** | Save/load system architecture | Core developers |
| **[CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md)** | Conservation of game matter, recovery system | All developers |
| **[CHECKPOINT_RETENTION.md](./CHECKPOINT_RETENTION.md)** | Snapshot retention policies | Infrastructure |

---

## 🎮 Gameplay Systems

### Agents & AI

| Document | Description |
|----------|-------------|
| **[packages/agents/README.md](./packages/agents/README.md)** | Agent architecture overview |
| **[packages/llm/README.md](./packages/llm/README.md)** | LLM integration, prompts, providers |
| **[packages/core/src/behavior/README.md](./packages/core/src/behavior/README.md)** | Behavior system architecture |
| **[packages/core/src/decision/README.md](./packages/core/src/decision/README.md)** | Decision processors (LLM, Scripted) |

### Magic & Skills

| Document | Description |
|----------|-------------|
| **[packages/magic/README.md](./packages/magic/README.md)** | Magic system with 25+ paradigms |
| **[packages/magic/src/skillTrees/README.md](./packages/magic/src/skillTrees/README.md)** | Skill tree system |
| **[packages/core/src/magic/README.md](./packages/core/src/magic/README.md)** | Magic integration in core |

### Divinity & Souls

| Document | Description |
|----------|-------------|
| **[packages/divinity/README.md](./packages/divinity/README.md)** | Gods, miracles, divine power |
| **[packages/core/src/divinity/README.md](./packages/core/src/divinity/README.md)** | Divinity system integration |
| **[packages/core/src/soul/README.md](./packages/core/src/soul/README.md)** | Soul creation, reincarnation |
| **[packages/core/src/consciousness/README.md](./packages/core/src/consciousness/README.md)** | Consciousness emergence |

### World & Environment

| Document | Description |
|----------|-------------|
| **[packages/world/README.md](./packages/world/README.md)** | Terrain, chunks, world generation |
| **[packages/world/src/chunks/README.md](./packages/world/src/chunks/README.md)** | Chunk system and spatial queries |
| **[packages/botany/README.md](./packages/botany/README.md)** | Plant genetics and growth |
| **[packages/environment/README.md](./packages/environment/README.md)** | Weather, soil, temperature |

### Reproduction & Genetics

| Document | Description |
|----------|-------------|
| **[packages/reproduction/README.md](./packages/reproduction/README.md)** | Mating, genetics, families |
| **[docs/ANIMAL_GENETICS_BREEDING_SYSTEM.md](./docs/ANIMAL_GENETICS_BREEDING_SYSTEM.md)** | Animal breeding mechanics |
| **[docs/DNA_AS_ECS_COMPONENTS.md](./docs/DNA_AS_ECS_COMPONENTS.md)** | Genetic system design |

### Navigation & Pathfinding

| Document | Description |
|----------|-------------|
| **[packages/navigation/README.md](./packages/navigation/README.md)** | Pathfinding, steering behaviors |
| **[docs/NAVIGATION_EXPLORATION_SPEC.md](./docs/NAVIGATION_EXPLORATION_SPEC.md)** | Exploration mechanics |

### Buildings & Construction

| Document | Description |
|----------|-------------|
| **[packages/building-designer/README.md](./packages/building-designer/README.md)** | Voxel building system |
| **[packages/core/src/buildings/README.md](./packages/core/src/buildings/README.md)** | Building mechanics |

### Research & Knowledge

| Document | Description |
|----------|-------------|
| **[packages/hierarchy-simulator/README.md](./packages/hierarchy-simulator/README.md)** | Renormalization group simulation |
| **[packages/core/src/research/README.md](./packages/core/src/research/README.md)** | Research system |
| **[docs/EPISTEMIC_LEARNING_SPEC.md](./docs/EPISTEMIC_LEARNING_SPEC.md)** | Knowledge and learning |

---

## 🛠️ Developer Tools & Debugging

### Admin Dashboard

| Document | Description |
|----------|-------------|
| **[packages/core/src/admin/README.md](./packages/core/src/admin/README.md)** | Admin dashboard architecture |
| **[CLAUDE.md - Admin Dashboard](../CLAUDE.md#admin-dashboard)** | Dashboard usage guide |

### Diagnostics & Debugging

| Document | Description |
|----------|-------------|
| **[DIAGNOSTICS_GUIDE.md](./DIAGNOSTICS_GUIDE.md)** | Diagnostics harness for debugging agents |
| **[DIAGNOSTICS_DEMO.md](./DIAGNOSTICS_DEMO.md)** | Diagnostics usage examples |
| **[AGENT_DEBUG_LOGGING.md](./AGENT_DEBUG_LOGGING.md)** | Agent logging system |
| **[docs/DEVELOPER_TOOLS.md](./docs/DEVELOPER_TOOLS.md)** | Developer tool overview |
| **[DEBUG_API.md](./DEBUG_API.md)** | Browser console debug API |

### Code Quality

| Document | Description |
|----------|-------------|
| **[docs/ESLINT_RULES.md](./docs/ESLINT_RULES.md)** | ESLint configuration and rules |
| **[TYPE_SAFETY_CYCLES_SUMMARY.md](./TYPE_SAFETY_CYCLES_SUMMARY.md)** | Type safety improvement history |
| **[COMMON_PITFALLS.md](./COMMON_PITFALLS.md)** | Common mistakes and solutions |
| **[NEW_SYSTEM_CHECKLIST.md](./NEW_SYSTEM_CHECKLIST.md)** | Checklist for creating new systems |

---

## 🎨 Rendering & UI

| Document | Description |
|----------|-------------|
| **[packages/renderer/README.md](./packages/renderer/README.md)** | Rendering architecture, sprites, 40+ panels |
| **[packages/deterministic-sprite-generator/README.md](./packages/deterministic-sprite-generator/README.md)** | Sprite generation system |
| **[packages/renderer/src/panels/README.md](./packages/renderer/src/panels/README.md)** | UI panel system |

---

## 📊 Metrics & Monitoring

| Document | Description |
|----------|-------------|
| **[packages/metrics/README.md](./packages/metrics/README.md)** | Metrics collection system |
| **[packages/metrics-dashboard/README.md](./packages/metrics-dashboard/README.md)** | Metrics visualization |

---

## 🧩 Package-Specific Documentation

### Complete Package List

All packages have READMEs following a consistent format (Overview, Core Concepts, API, Examples, Architecture, Troubleshooting):

**Core Infrastructure:**
- [core](./packages/core/README.md) - ECS engine, systems, components
- [world](./packages/world/README.md) - Terrain, chunks, world generation
- [persistence](./packages/persistence/README.md) - Save/load, time travel
- [shared-worker](./packages/shared-worker/README.md) - Multi-tab coordination

**Gameplay:**
- [botany](./packages/botany/README.md) - Plants, genetics, growth
- [environment](./packages/environment/README.md) - Weather, soil, temperature
- [navigation](./packages/navigation/README.md) - Pathfinding, steering
- [reproduction](./packages/reproduction/README.md) - Mating, families, genetics
- [building-designer](./packages/building-designer/README.md) - Voxel buildings

**Advanced Features:**
- [divinity](./packages/divinity/README.md) - Gods, miracles, divine power
- [magic](./packages/magic/README.md) - 25+ magic paradigms
- [hierarchy-simulator](./packages/hierarchy-simulator/README.md) - Renormalization

**AI & LLM:**
- [llm](./packages/llm/README.md) - LLM providers, prompts, scheduling
- [introspection](./packages/introspection/README.md) - Schema generation, mutations
- [agents](./packages/agents/README.md) - Agent architecture

**Rendering & UI:**
- [renderer](./packages/renderer/README.md) - Sprites, panels, overlays
- [deterministic-sprite-generator](./packages/deterministic-sprite-generator/README.md) - Sprite generation

**Infrastructure:**
- [metrics](./packages/metrics/README.md) - Metrics collection
- [metrics-dashboard](./packages/metrics-dashboard/README.md) - Metrics visualization
- [city-simulator](./packages/city-simulator/README.md) - Headless testing

---

## 📖 Historical & Design Documents

### Major Features

| Document | Description |
|----------|-------------|
| **[docs/HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md](./docs/HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md)** | Hive mind system design |
| **[docs/COOKING_RESEARCH_TREE.md](./docs/COOKING_RESEARCH_TREE.md)** | Cooking and recipes |
| **[docs/ANIMAL_BONDING_SYSTEM.md](./docs/ANIMAL_BONDING_SYSTEM.md)** | Animal companion system |

### Optimization History

| Document | Description |
|----------|-------------|
| **[CHUNK_SPATIAL_MASTER_SUMMARY.md](./CHUNK_SPATIAL_MASTER_SUMMARY.md)** | Chunk spatial optimization project summary |
| See also: CHUNK_SPATIAL_PHASE*.md files for detailed phase breakdowns |

---

## 🎯 Audience-Specific Quick Links

### For AI Agents / LLMs
**📖 Dedicated guide:** [docs/LLM_NAVIGATION_GUIDE.md](./docs/LLM_NAVIGATION_GUIDE.md) - How LLMs should navigate this codebase

**Start here:** [CLAUDE.md](../CLAUDE.md) - Complete development guidelines
**Then read:**
1. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Essential patterns
2. [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
3. Task-specific docs (see LLM Navigation Guide for paths)

### For New Developers
**Start here:** [README.md](../README.md) - Project philosophy
**Then read:**
1. [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
2. [CLAUDE.md - Running the Game](../CLAUDE.md#running-the-game)
3. [PERFORMANCE.md](./PERFORMANCE.md)
4. [COMMON_PITFALLS.md](./COMMON_PITFALLS.md)

### For System Developers
**Start here:** [NEW_SYSTEM_CHECKLIST.md](./NEW_SYSTEM_CHECKLIST.md)
**Then read:**
1. [SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)
2. [docs/SYSTEM_BASE_CLASSES.md](./docs/SYSTEM_BASE_CLASSES.md)
3. [packages/core/src/ecs/SYSTEM_HELPERS_USAGE.md](./packages/core/src/ecs/SYSTEM_HELPERS_USAGE.md)
4. [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)

### For Behavior Developers
**Start here:** [docs/BEHAVIOR_CONTEXT.md](./docs/BEHAVIOR_CONTEXT.md)
**Then read:**
1. [packages/core/src/behavior/README.md](./packages/core/src/behavior/README.md)
2. [docs/AGENT_DECISION_STATE_DIAGRAM.md](./docs/AGENT_DECISION_STATE_DIAGRAM.md)
3. [packages/llm/README.md](./packages/llm/README.md)

### For Performance Tuning
**Start here:** [PERFORMANCE.md](./PERFORMANCE.md)
**Then read:**
1. [SCHEDULER_GUIDE.md](./SCHEDULER_GUIDE.md)
2. [docs/QUERY_CACHING.md](./docs/QUERY_CACHING.md)
3. [packages/core/src/ecs/SIMULATION_SCHEDULER.md](./packages/core/src/ecs/SIMULATION_SCHEDULER.md)

---

## 🔍 Finding Documentation

### By Topic

Use this index or search for:
- **Architecture**: Search for "ARCHITECTURE", "ECS", "packages"
- **Systems**: See [SYSTEMS_CATALOG.md](./SYSTEMS_CATALOG.md)
- **Components**: See [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md)
- **Behaviors**: Search "BEHAVIOR", check `packages/core/src/behavior/`
- **Performance**: Search "PERFORMANCE", "SCHEDULER", "optimization"
- **Save/Load**: Search "persistence", "checkpoint", "snapshot"

### By Package

All package documentation follows: `packages/{package-name}/README.md`

Subsystem documentation: `packages/{package}/src/{subsystem}/README.md`

### By File Location

```
custom_game_engine/
├── DOCUMENTATION_INDEX.md          (YOU ARE HERE)
├── ARCHITECTURE_OVERVIEW.md        (Start here for architecture)
├── SYSTEMS_CATALOG.md              (All 212+ systems)
├── COMPONENTS_REFERENCE.md         (All 125+ components)
├── METASYSTEMS_GUIDE.md            (Complex metasystems)
├── PERFORMANCE.md                  (Optimization guide)
├── SCHEDULER_GUIDE.md              (System scheduling)
├── DIAGNOSTICS_GUIDE.md            (Debugging tools)
├── DEBUG_API.md                    (Console debug API)
├── COMMON_PITFALLS.md              (Common mistakes)
├── NEW_SYSTEM_CHECKLIST.md         (System creation guide)
├── docs/                           (Specialized documentation)
│   ├── BEHAVIOR_CONTEXT.md         (Behavior API)
│   ├── AGENT_DECISION_STATE_DIAGRAM.md
│   ├── SYSTEM_BASE_CLASSES.md
│   ├── QUERY_CACHING.md
│   ├── DEVELOPER_TOOLS.md
│   └── ESLINT_RULES.md
└── packages/                       (Package-specific READMEs)
    ├── core/README.md
    ├── world/README.md
    ├── botany/README.md
    └── ... (see complete list above)
```

---

## 📝 Documentation Standards

All documentation should follow these standards:

1. **Clear headings** - Use ## for major sections, ### for subsections
2. **Code examples** - Include working code snippets
3. **Cross-references** - Link to related documentation
4. **Audience markers** - Indicate who should read the doc
5. **Update dates** - Note when last updated (for time-sensitive info)

Missing documentation? Use [README_TEMPLATE.md](./README_TEMPLATE.md) as a guide (see [packages/botany/README.md](./packages/botany/README.md) as reference implementation).

---

## 🚨 Critical Documents (Read First)

1. **[CLAUDE.md](../CLAUDE.md)** - Development guidelines (AI agents MUST read this)
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - ⚡ Essential commands and patterns
3. **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - System architecture
4. **[CORRUPTION_SYSTEM.md](./CORRUPTION_SYSTEM.md)** - Never delete anything!
5. **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance constraints

---

**Last Updated:** 2026-01-16

**Maintainers:** Keep this index updated as documentation changes. This is the primary navigation tool for both humans and AI agents.
