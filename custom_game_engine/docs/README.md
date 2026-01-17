# Documentation Directory

This directory contains **specialized technical documentation** for specific subsystems and developer workflows.

## What Goes Here

**Specialized technical docs:**
- System architecture deep-dives
- Developer workflow guides
- Design specifications for complex features
- Performance optimization guides
- Code quality standards

**What does NOT go here:**
- Package-specific docs → use `packages/{package}/README.md`
- General architecture → use `ARCHITECTURE_OVERVIEW.md` (root)
- System catalog → use `SYSTEMS_CATALOG.md` (root)
- Development guidelines → use `CLAUDE.md` (root)

## Current Documentation

### Agent & Behavior Systems
- **[BEHAVIOR_CONTEXT.md](./BEHAVIOR_CONTEXT.md)** - Agent behavior API and patterns
- **[AGENT_DECISION_STATE_DIAGRAM.md](./AGENT_DECISION_STATE_DIAGRAM.md)** - Decision flow state machine

### Performance & Architecture
- **[SYSTEM_BASE_CLASSES.md](./SYSTEM_BASE_CLASSES.md)** - System base class patterns
- **[QUERY_CACHING.md](./QUERY_CACHING.md)** - Query optimization strategies
- **[DEVELOPER_TOOLS.md](./DEVELOPER_TOOLS.md)** - Developer tool overview

### Code Quality
- **[ESLINT_RULES.md](./ESLINT_RULES.md)** - ESLint configuration and rules

### For AI Agents
- **[LLM_NAVIGATION_GUIDE.md](./LLM_NAVIGATION_GUIDE.md)** - 🤖 How LLMs should navigate this codebase

### Feature Specifications
- **[NAVIGATION_EXPLORATION_SPEC.md](./NAVIGATION_EXPLORATION_SPEC.md)** - Navigation and exploration mechanics
- **[EPISTEMIC_LEARNING_SPEC.md](./EPISTEMIC_LEARNING_SPEC.md)** - Knowledge and learning systems
- **[HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md](./HIVE_MIND_COLLECTIVE_INTELLIGENCE_SPEC.md)** - Hive mind mechanics

### Animal & Genetics Systems
- **[ANIMAL_GENETICS_BREEDING_SYSTEM.md](./ANIMAL_GENETICS_BREEDING_SYSTEM.md)** - Animal breeding mechanics
- **[ANIMAL_BONDING_SYSTEM.md](./ANIMAL_BONDING_SYSTEM.md)** - Companion animal system
- **[ANIMAL_SYSTEM_ANALYSIS.md](./ANIMAL_SYSTEM_ANALYSIS.md)** - Animal system architecture
- **[DNA_AS_ECS_COMPONENTS.md](./DNA_AS_ECS_COMPONENTS.md)** - Genetic system design

### Cooking & Crafting
- **[COOKING_RESEARCH_TREE.md](./COOKING_RESEARCH_TREE.md)** - Cooking progression system
- **[COOKING_MOOD_PREFERENCE_SYSTEM.md](./COOKING_MOOD_PREFERENCE_SYSTEM.md)** - Food preferences
- **[MOOD_SYSTEM_INTEGRATION_ANALYSIS.md](./MOOD_SYSTEM_INTEGRATION_ANALYSIS.md)** - Mood system design

### Alternative/Experimental Designs
- **[ALTERNATIVE_REPRODUCTION_GENETICS.md](./ALTERNATIVE_REPRODUCTION_GENETICS.md)** - Alternative genetic systems

## Navigation

**Looking for something specific?** See the master index:
### → [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)

## Adding New Documentation

When adding documentation to this directory:

1. **Check if it belongs here** - Is it specialized/technical? If general, use root docs.
2. **Use clear filenames** - UPPERCASE_WITH_UNDERSCORES.md
3. **Update this README** - Add your doc to the appropriate section above
4. **Update DOCUMENTATION_INDEX.md** - Add cross-reference in master index
5. **Follow template structure**:
   ```markdown
   # Document Title

   **Purpose:** One-sentence summary
   **Audience:** Who should read this
   **Related:** Links to related docs

   ## Overview
   ...

   ## Core Concepts
   ...

   ## Implementation
   ...

   ## Examples
   ...
   ```

## Organization Philosophy

**This directory is for depth, not breadth.**

- Keep it focused on technical deep-dives
- Cross-reference liberally
- Assume readers have read core architecture docs first
- Prefer working code examples over abstract descriptions

---

**Last Updated:** 2026-01-16
