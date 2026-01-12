# Magic System (Core Integration Layer)

ECS integration for magic system. Bridges `@ai-village/magic` package with core game systems.

## Overview

This module provides ECS bindings, spell execution, cost calculation, and skill progression for 25+ magic paradigms. The actual paradigm definitions, spell libraries, and effect appliers live in `packages/magic/`. This layer integrates them with World, Entity, and Component systems.

## Key Subsystems

### Paradigms & Laws
- **MagicParadigm**: Universe-level magic rule definitions (sources, costs, channels, laws, risks)
- **CoreParadigms**: Academic, Pact, Name, Breath, Divine, Blood, Emotional (foundational 7)
- **MagicLawEnforcer**: Validates spells against paradigm laws, calculates costs and risks
- **ParadigmComposition**: Multi-paradigm casters, hybrid paradigms (Theurgy, Hemomancy)

### Specialized Paradigms
- **AnimistParadigms**: Shinto (kami), Sympathy (Name of the Wind), Allomancy (Mistborn), Dream, Song, Rune, Daemon
- **WhimsicalParadigms**: Talent, Narrative, Pun, Wild (LLM-generated)
- **NullParadigms**: Null, Dead, Anti, Inverted, Tech Supremacy, Rational, Sealed, Divine Prohibition
- **DimensionalParadigms**: 4D+ geometry, extradimensional entities, weirdness escalation, corruption
- **CreativeParadigms**: Poetic (literal metaphors, word physics), Bureaucratic, Debt, Luck, Paradox, Game, Echo, Threshold, Belief, Commerce, Feng Shui, Architecture

### Spell Execution
- **SpellRegistry**: Spell definitions with effects, costs, targets, cooldowns
- **SpellEffect**: Declarative effect types (damage, healing, protection, buff, debuff, control, summon, transform, perception, dispel, teleport, creation, destruction, environmental, temporal, mental, soul, paradigm)
- **SpellEffectExecutor**: Central execution engine - scales effects, applies to entities, manages durations, delegates to appliers
- **EffectAppliers**: Category-specific appliers (`appliers/` directory) - Damage, Healing, Protection, Summon, Transform, Control, BodyTransform, BodyHealing
- **SpellCastingService**: High-level API - validates, deducts costs, executes effects, handles mishaps, records proficiency

### Costs & Resources
- **CostCalculatorRegistry**: Paradigm-specific cost calculators (`costs/calculators/`)
- **CostRecoveryManager**: Mana regen, favor accumulation, breath transfer
- **MagicSourceGenerator**: Generate resource pools with paradigm-appropriate regen rates
- **TerminalEffectHandler**: Non-recoverable costs (lifespan, sanity, permanent stat damage)

### Skill Trees
- **MagicSkillTree**: Progression trees with unlock conditions, XP costs, tiers
- **MagicSkillTreeRegistry**: Validates and stores trees
- **MagicSkillTreeEvaluator**: Evaluates unlock conditions, purchasable nodes, tree access
- **skillTrees/**: 25+ paradigm-specific trees (Allomancy, Shinto, Sympathy, Daemon, Dream, Song, Name, Breath, Pact, Blood, Emotional, Rune, Divine, Academic, Bureaucratic, Debt, Luck, Paradox, Game, Echo, Threshold, Belief, Commerce, Feng Shui, Architecture)

### Artifacts & Academies
- **ArtifactCreation**: Enchantment systems per paradigm (methods, permanence, sentience, material requirements)
- **MagicAcademy**: Multi-paradigm institutions, tutoring relationships, teaching methods

### Discovery & Generation
- **LLMEffectGenerator**: AI-driven magic discovery from experiments
- **ParadigmSpectrum**: Universe configuration (magical intensity, formality, animism level, source origin)
- **MagicDetectionSystem**: Detect magic, identify paradigms, analyze effects

### State Management
- **MagicSystemState**: Paradigm enable/disable, runtime state, serialization
- **ComboDetector**: Multi-spell combo detection and bonuses
- **InitializeMagicSystem**: Registers all paradigms, spells, cost calculators

## Relationship to packages/magic

**Core (this package)**: ECS integration, spell execution, entity/world interaction, cost deduction, skill XP
**Magic package**: Pure magic logic - paradigm definitions, spell libraries, effect implementations, validation pipeline

Core magic imports from `@ai-village/magic` and wires it into the ECS. When adding paradigms, edit `packages/magic/`. When integrating with game systems, edit here.

## Common Workflows

**Cast spell**: `SpellCastingService.castSpell(world, caster, spellId, targetId)`
**Check affordability**: `costCalculatorRegistry.get(paradigmId).canAfford(caster, spellCost, context)`
**Apply effect**: `SpellEffectExecutor.applyEffect(effect, caster, target, world)`
**Unlock skill node**: `MagicSkillTreeEvaluator.evaluateNode(nodeId, caster, skillProgress)`
**Generate paradigm sources**: `generateParadigmSource('academic', caster, config)`

## Files

`index.ts` - 1100 lines, exports all types and registries
`SpellCastingService.ts` - Orchestrates casting pipeline
`SpellEffectExecutor.ts` - Executes effects, manages active effects
`costs/` - Cost calculators per paradigm
`appliers/` - Effect appliers per category
`skillTrees/` - Skill trees per paradigm
`MagicParadigm.ts`, `CoreParadigms.ts`, `AnimistParadigms.ts`, `WhimsicalParadigms.ts`, `NullParadigms.ts`, `DimensionalParadigms.ts`, `CreativeParadigms.ts`, `LiterarySurrealismParadigm.ts`, `ParadigmComposition.ts`

See `packages/magic/README.md` for paradigm architecture, validation pipeline, and effect expression system.
