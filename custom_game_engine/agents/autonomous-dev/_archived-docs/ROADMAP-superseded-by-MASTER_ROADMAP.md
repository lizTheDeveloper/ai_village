# AI Village Game Engine - Roadmap

## Legend
- `[x]` Complete
- `[~]` In Progress
- `[ ]` Not Started
- `[P]` Needs Playtest
- `-->` Depends on

---

## Parallel Workstreams

These can all progress independently:

### Stream A: Core Refactoring (Technical Debt)
| Status | Task | Notes |
|--------|------|-------|
| [~] | AI System Refactor | AgentBrainSystem modularization |
| [ ] | Plant System Decomposition | Break up large file |
| [ ] | Prompt Builder Decomposition | Break up large file |
| [ ] | Renderer Decomposition | Break up large file |
| [x] | AgentInfoPanel Decomposition | Split into sections |
| [ ] | Component Interface Audit | Standardize component APIs |
| [ ] | Test Infrastructure | Improve test utilities |

### Stream B: Item & Inventory
| Status | Task | Notes |
|--------|------|-------|
| [~] | Item System Refactor | ItemRegistry, data-driven items |
| [x] | Inventory UI | Grid view, drag-drop |
| [x] | Storage Deposit System | Agents deposit to storage |

### Stream C: Crafting & Building
| Status | Task | Notes |
|--------|------|-------|
| [x] | Crafting System | Base crafting with recipes |
| [x] | Crafting UI | Queue panel |
| [P] | Crafting Stations | Workbenches, forges (awaiting playtest) |
| [x] | Building System | Construction mechanics |
| [x] | Construction Progress | Visual feedback |

### Stream D: Farming & Nature
| Status | Task | Notes |
|--------|------|-------|
| [x] | Plant Lifecycle | Growth, harvest, seeds |
| [x] | Tilling Action | Soil preparation |
| [x] | Soil/Tile System | Fertility, moisture |
| [~] | Seed System Fixes | Manual gathering behavior |

### Stream E: Agent AI
| Status | Task | Notes |
|--------|------|-------|
| [x] | Behavior Queue | Multi-step behaviors |
| [x] | Episodic Memory | Event memory |
| [x] | Navigation/Exploration | Pathfinding, discovery |
| [x] | Sleep/Circadian Rhythm | Day/night behavior |
| [x] | Window Manager | UI panels |

### Stream F: Animals
| Status | Task | Notes |
|--------|------|-------|
| [x] | Animal System Foundation | Taming, housing, production |

---

## Future Features (Not Blocking Anything)

### Skill System (Spec Complete)
See `work-orders/skill-system/spec.md`
- 10 skill categories with XP progression
- Skill trees with prerequisites
- Cross-skill synergies
- Affects LLM context depth
- **No dependencies** - can start anytime

### Combat System
- Threats and defense
- Weapons and tools
- **Depends on**: Item System (for weapons)

### Trading System
- Agent-to-agent exchange
- **Depends on**: Social memory (complete)

### Tool System
- Tools affect action efficiency
- **Depends on**: Item System

### Biomes & Seasons
- Terrain variety
- Weather patterns
- **No dependencies**

### Relationships & Social
- Friendship, rivalry
- Leadership emergence
- **Depends on**: Social memory (complete), Skill System (for teaching)

---

## Recently Completed (December 2024)

- [x] Crafting UI panel
- [x] Episodic memory system
- [x] Behavior queue system
- [x] Navigation/exploration system
- [x] Tilling action
- [x] Storage deposit system
- [x] Event schemas
- [x] Agent building orchestration
- [x] Animal system foundation
- [x] Sleep and circadian rhythm
- [x] Plant lifecycle
- [x] Resource gathering
- [x] Soil/tile system
- [x] Building definitions
- [x] Weather system
- [x] Agent inventory display
- [x] Construction system
- [x] AgentInfoPanel refactor

---

## Work Order Cleanup Needed

These folders can be archived (implementation complete):
- `behavior-queue-system/`
- `crafting-ui/`
- `tilling-action/`
- `seed-system/` (if fixes verified)

Active work orders:
- `crafting-stations/` - Awaiting playtest verification
- `ai-system-refactor/` - In progress
- `item-system/` - In progress
- `skill-system/` - Spec complete, ready for implementation
