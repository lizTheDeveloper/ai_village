# Panels README

Modular UI sections for rendering agent information and magic systems.

## Overview

Two subdirectories provide specialized panel components:
- `agent-info/` - Agent state visualization across multiple tabs
- `magic/` - Magic skill tree visualization and interaction

## agent-info/ Sections

Tab-based agent information display with 8 specialized sections:

- **InfoSection** - Main overview: behavior, needs, goals, navigation, inventory summary, recent thought/speech
- **StatsSection** - Detailed statistics and metrics
- **SkillsSection** - Skill levels, experience, affinities
- **InventorySection** - Full inventory with capacity tracking
- **MemoriesSection** - Episodic memories, beliefs, social relationships, reflections, journal
- **ContextSection** - Contextual information and agent state
- **PrioritiesSection** - Behavior priorities with adjustable weights
- **DevSection** - Developer tools and debugging information

**Common features:**
- Scrolling support for long content
- Soul identity display (reincarnation tracking)
- Wrapped text rendering with truncation
- Color-coded status indicators
- Interactive elements (navigation targets, clickable regions)

## magic/ Skill Tree

**SkillTreePanel** - IWindowPanel implementation for magic skill trees. Features:
- Multi-paradigm tab switching (auto-hide for single paradigm)
- Interactive node unlocking with XP costs
- Viewport controls (pan, zoom, scroll)
- Keyboard navigation (Tab, Enter, Space, Escape)
- Discovery tracking and notifications

**SkillNodeRenderer** - Draws individual nodes with:
- Shape variants by category (square, circle, hexagon, diamond)
- State-based coloring (unlocked/available/locked/hidden)
- Pulsing animations for available nodes
- XP cost badges and level indicators
- Hover highlighting and tooltips

**Supporting classes:**
- `ParadigmTreeView` - Full tree layout and rendering
- `TreeLayoutEngine` - Hierarchical node positioning
- `ConditionRenderer` - Unlock requirement visualization
- `NodeTooltip` - Detailed node information display

## Integration

Both subdirectories export via `index.ts`. Import from `@ai-village/renderer/panels/agent-info` or `@ai-village/renderer/panels/magic`.

All components follow strict validation (no silent fallbacks) and use shared render utilities from `renderUtils.ts`.
