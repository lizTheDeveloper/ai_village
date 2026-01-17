# LLM Navigation Guide

**How AI agents should navigate and understand this codebase.**

This guide optimizes documentation consumption for Large Language Models (LLMs) working on the Multiverse codebase.

---

## 🎯 Your First Actions

When starting a new task:

1. **Read CLAUDE.md** - Contains critical development guidelines, rules, and constraints
2. **Check [QUICK_REFERENCE.md](../QUICK_REFERENCE.md)** - Get essential patterns and commands
3. **Use [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)** - Navigate to specific documentation

**Do NOT** read all documentation. Be selective based on your task.

---

## 📋 Task-Specific Documentation Paths

### Implementing a New Behavior

**Read in order:**
1. [docs/BEHAVIOR_CONTEXT.md](./BEHAVIOR_CONTEXT.md) - Behavior API and patterns
2. [packages/core/src/behavior/README.md](../packages/core/src/behavior/README.md) - Behavior architecture
3. Example: `packages/core/src/behavior/behaviors/GatherBehavior.ts`
4. [docs/AGENT_DECISION_STATE_DIAGRAM.md](./AGENT_DECISION_STATE_DIAGRAM.md) - Decision flow

**Skip:** System internals, rendering, save/load (not relevant)

### Creating a New System

**Read in order:**
1. [NEW_SYSTEM_CHECKLIST.md](../NEW_SYSTEM_CHECKLIST.md) - Step-by-step guide
2. [docs/SYSTEM_BASE_CLASSES.md](./SYSTEM_BASE_CLASSES.md) - Base class patterns
3. [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md) - See existing systems
4. [packages/core/src/ecs/SYSTEM_HELPERS_USAGE.md](../packages/core/src/ecs/SYSTEM_HELPERS_USAGE.md) - Helper utilities
5. [SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md) - Priority and throttling

**Skip:** Behavior details, LLM integration (unless your system needs it)

### Fixing a Bug

**Read in order:**
1. [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Common patterns and pitfalls
2. [COMMON_PITFALLS.md](../COMMON_PITFALLS.md) - Known issues and solutions
3. Relevant system/package README (if bug is in specific system)
4. [DIAGNOSTICS_GUIDE.md](../DIAGNOSTICS_GUIDE.md) - If debugging agent decisions

**Skip:** Architecture overviews (you need specifics, not big picture)

### Performance Optimization

**Read in order:**
1. [PERFORMANCE.md](../PERFORMANCE.md) - Core optimization strategies
2. [SCHEDULER_GUIDE.md](../SCHEDULER_GUIDE.md) - System scheduling
3. [docs/QUERY_CACHING.md](./QUERY_CACHING.md) - Query optimization
4. [packages/core/src/ecs/SIMULATION_SCHEDULER.md](../packages/core/src/ecs/SIMULATION_SCHEDULER.md) - Entity culling

**Skip:** High-level architecture, gameplay systems

### Adding LLM/AI Features

**Read in order:**
1. [packages/llm/README.md](../packages/llm/README.md) - LLM architecture
2. [packages/llm/src/prompt-builders/README.md](../packages/llm/src/prompt-builders/README.md) - Prompt building
3. [docs/BEHAVIOR_CONTEXT.md](./BEHAVIOR_CONTEXT.md) - Agent behaviors
4. [packages/core/src/decision/README.md](../packages/core/src/decision/README.md) - Decision processors

**Skip:** ECS internals, rendering (handled elsewhere)

### Working on UI/Rendering

**Read in order:**
1. [packages/renderer/README.md](../packages/renderer/README.md) - Renderer architecture
2. [packages/renderer/src/panels/README.md](../packages/renderer/src/panels/README.md) - Panel system
3. [packages/renderer/src/overlays/README.md](../packages/renderer/src/overlays/README.md) - Overlays

**Skip:** Save/load, genetics, magic systems

---

## 🧠 Efficient Context Management

### Token Budget Strategy

**High Priority (always include in context):**
- CLAUDE.md - Development rules
- QUICK_REFERENCE.md - Essential patterns
- Task-specific README (e.g., packages/core/README.md)

**Medium Priority (include if relevant to task):**
- COMPONENTS_REFERENCE.md - If working with components
- SYSTEMS_CATALOG.md - If creating/modifying systems
- ARCHITECTURE_OVERVIEW.md - For architectural decisions

**Low Priority (reference only when needed):**
- Feature specifications in docs/
- Historical documents (CHUNK_SPATIAL_*.md, etc.)
- Package-specific implementation details

### Search Strategy

**Instead of reading all docs:**

1. **Use targeted searches:**
   ```
   "Find all behaviors related to movement"
   → Search: packages/core/src/behavior/behaviors/*Move*.ts

   "Find component definition for inventory"
   → Search: packages/core/src/components/*Inventory*

   "Find system that handles combat"
   → Check: SYSTEMS_CATALOG.md or packages/core/src/systems/*Combat*
   ```

2. **Use README files as entry points:**
   - Package README → subsystem README → implementation
   - Example: packages/magic/README.md → packages/magic/src/skillTrees/README.md → SpellCaster.ts

3. **Follow cross-references:**
   - Documentation liberally links related docs
   - Use these links to build understanding incrementally

---

## 📊 Understanding the Architecture (Minimal Reading)

### Core Concepts (Must Know)

**ECS (Entity-Component-System):**
- Read: [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md) - sections 1-3 only
- Skip: Detailed metasystem descriptions (read on-demand)

**Components:**
- Naming: `lowercase_with_underscores`
- Pure data, no logic
- Reference: [COMPONENTS_REFERENCE.md](../COMPONENTS_REFERENCE.md)

**Systems:**
- Logic processors
- Priority-ordered (lower = earlier)
- Reference: [SYSTEMS_CATALOG.md](../SYSTEMS_CATALOG.md)

**Behaviors:**
- Agent decision-making
- API pattern: BehaviorContext
- Reference: [docs/BEHAVIOR_CONTEXT.md](./BEHAVIOR_CONTEXT.md)

### Package Dependencies (Know Before Modifying)

```
core → Everything depends on this (ECS, components, systems)
world → Terrain, chunks (used by most gameplay systems)
llm → AI integration (used by agent behaviors)
magic → Spell system (isolated, few dependencies)
renderer → UI/display (consumes core data, doesn't modify it)
```

**Before modifying a package:**
1. Read its README.md
2. Check its dependencies: `package.json`
3. Search for imports: `grep -r "from '@ai-village/{package}'" packages/`

---

## 🚫 Common LLM Mistakes (Avoid These)

### 1. Reading Too Much Documentation

**Bad:** "Let me read ARCHITECTURE_OVERVIEW, SYSTEMS_CATALOG, COMPONENTS_REFERENCE, all package READMEs..."

**Good:** "I need to add a behavior. Let me read BEHAVIOR_CONTEXT.md and one example behavior."

**Rule:** Read only what's necessary for your specific task.

### 2. Ignoring CLAUDE.md Rules

**Bad:** Adding `console.log` for debugging, using silent fallbacks

**Good:** Following CLAUDE.md patterns: error throwing, component naming, query caching

**Rule:** CLAUDE.md rules override general patterns. Always check it first.

### 3. Not Using Quick Reference

**Bad:** Asking "How do I start the server?" or "What's the tick rate?"

**Good:** Check QUICK_REFERENCE.md first for common facts and commands

**Rule:** QUICK_REFERENCE answers 80% of common questions instantly.

### 4. Assuming Patterns Without Checking

**Bad:** "I'll use PascalCase for components like normal TypeScript"

**Good:** "QUICK_REFERENCE shows component types use lowercase_with_underscores"

**Rule:** This codebase has specific conventions. Check before assuming.

### 5. Not Following Package Structure

**Bad:** Putting new system in wrong package or creating ad-hoc imports

**Good:** Following package boundaries, using established import patterns

**Rule:** Respect package architecture. If unclear, check similar code.

---

## 🎯 Goal-Oriented Navigation

### "I need to understand how X works"

1. **Check DOCUMENTATION_INDEX.md** for X-related docs
2. **Find X in SYSTEMS_CATALOG or COMPONENTS_REFERENCE**
3. **Read package README** where X is implemented
4. **Read implementation file** with understanding from README

### "I need to implement feature Y"

1. **Find similar feature** in codebase (search for keywords)
2. **Read README** of package where similar feature exists
3. **Read implementation** of similar feature
4. **Check CLAUDE.md** for any constraints or patterns
5. **Implement** following established patterns

### "I need to fix bug Z"

1. **Reproduce bug** (check QUICK_REFERENCE for debug commands)
2. **Find relevant system/behavior** (use grep or SYSTEMS_CATALOG)
3. **Read COMMON_PITFALLS** for known issues
4. **Check implementation** with CLAUDE.md patterns in mind
5. **Fix** and verify with tests

---

## 📚 Documentation Hierarchy

**Think of documentation as a tree:**

```
README.md (Philosophy, project overview)
  ├─ CLAUDE.md (Development guidelines) ← LLMs READ THIS FIRST
  ├─ DOCUMENTATION_INDEX.md (Navigation hub)
  └─ QUICK_REFERENCE.md (Quick facts)
       ├─ ARCHITECTURE_OVERVIEW.md (System design)
       │    ├─ SYSTEMS_CATALOG.md (All systems)
       │    └─ COMPONENTS_REFERENCE.md (All components)
       ├─ Package READMEs (Package-specific docs)
       │    └─ Subsystem READMEs (Detailed implementation)
       └─ docs/ (Specialized guides)
            ├─ BEHAVIOR_CONTEXT.md (Behavior API)
            ├─ SYSTEM_BASE_CLASSES.md (System patterns)
            └─ ... (other specialized docs)
```

**Navigation rule:** Start at top, drill down only as needed.

---

## 🔍 Fast Lookup Patterns

### Finding Component Schema

```typescript
// 1. Check COMPONENTS_REFERENCE.md for quick overview
// 2. Or grep:
grep -A 10 "type: 'component_name'" packages/core/src/components/
```

### Finding System Priority

```typescript
// Check SYSTEMS_CATALOG.md or:
grep "priority.*=" packages/core/src/systems/SystemName.ts
```

### Finding Behavior Examples

```typescript
// Look in behaviors directory:
ls packages/core/src/behavior/behaviors/*Behavior.ts
```

### Finding API Patterns

```typescript
// Check relevant README:
// - Behaviors: packages/core/src/behavior/README.md
// - Systems: packages/core/src/systems/README.md
// - Components: packages/core/src/components/README.md
```

---

## ✅ LLM Navigation Checklist

Before starting any task:

- [ ] Read CLAUDE.md (if not already in context)
- [ ] Check QUICK_REFERENCE.md for relevant patterns
- [ ] Identify task-specific documentation path (see above)
- [ ] Read only necessary documentation
- [ ] Search for similar implementations in codebase
- [ ] Verify patterns against CLAUDE.md rules
- [ ] Check for common pitfalls in COMMON_PITFALLS.md

---

## 🚀 Example: Full Navigation for "Add Sleep Behavior"

**Task:** Implement a new sleep behavior for agents.

**Efficient path:**

1. **CLAUDE.md** (already in context) - Know the rules
2. **QUICK_REFERENCE.md** - Component naming, behavior patterns
3. **docs/BEHAVIOR_CONTEXT.md** - Understand BehaviorContext API
4. **packages/core/src/behavior/behaviors/IdleBehavior.ts** - See simple example
5. **Implement SleepBehavior.ts** following patterns
6. **Test** using debug commands from QUICK_REFERENCE.md

**Total reading:** ~4 documents, ~15 minutes of focused reading

**Avoided reading:** ARCHITECTURE_OVERVIEW (not needed), SYSTEMS_CATALOG (not creating system), magic/divinity docs (not relevant), 10+ other package READMEs

**Result:** Efficient implementation following all conventions.

---

## 💡 Pro Tips for LLMs

1. **Favor code examples over prose** - Read working implementations
2. **Use grep liberally** - Search is faster than reading all docs
3. **Trust package boundaries** - Don't cross them without good reason
4. **When stuck, check COMMON_PITFALLS.md** - Someone hit this before
5. **CLAUDE.md overrides everything** - Its rules are law
6. **QUICK_REFERENCE.md saves tokens** - Essential facts, zero fluff
7. **README files are entry points** - Start there, drill down from there

---

**Last Updated:** 2026-01-16

**For:** AI agents, LLMs, autonomous developers working on Multiverse codebase
