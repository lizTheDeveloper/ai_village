# Core Systems

ECS systems that process entities with specific component sets each tick. Systems execute in priority order (lower = earlier) at fixed 20 TPS.

## System Priority Ranges

**Infrastructure (1-10)**: Time (3), Weather (5), StateMutator (5)
**Agent Core (50-100)**: Brain (50), Movement (20), Needs (60), Sleep (65), Steering (95)
**Cognition (100-200)**: Memory (100), Consolidation (110), Reflection (150), Journaling (180)
**Utility (900-999)**: Metrics (999), AutoSave (950)

See [SCHEDULER_GUIDE.md](../../../../SCHEDULER_GUIDE.md) for full priority list and scheduling rules.

## Throttling Pattern

Non-critical systems use tick-based throttling to reduce CPU:

```typescript
private UPDATE_INTERVAL = 100;  // Every 5 seconds at 20 TPS
private lastUpdate = 0;

update(world: World): void {
  if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) return;
  this.lastUpdate = world.tick;
  // Actual logic
}
```

Common intervals: Weather (100 ticks), Memory consolidation (1000 ticks), AutoSave (6000 ticks).

## System Categories

**Time & Environment**: TimeSystem, WeatherSystem, TemperatureSystem, SoilSystem
**Agent AI**: AgentBrainSystem (orchestrates perception/decision/behavior), MovementSystem, SteeringSystem, NeedsSystem
**Memory**: MemoryFormationSystem, MemoryConsolidationSystem, ReflectionSystem, SpatialMemoryQuerySystem
**Social**: CommunicationSystem, SocialFatigueSystem, RelationshipConversationSystem, InterestsSystem
**Building**: BuildingSystem, TileConstructionSystem, TreeFellingSystem, ResourceGatheringSystem
**Automation**: PowerGridSystem, BeltSystem, AssemblyMachineSystem, FactoryAISystem
**Divinity**: DeityEmergenceSystem, DivinePowerSystem, PrayerSystem, MythGenerationSystem
**Realms**: RealmManager, PortalSystem, DeathJudgmentSystem, ReincarnationSystem
**Combat**: AgentCombatSystem, HuntingSystem, InjurySystem, VillageDefenseSystem
**Research**: ResearchSystem, UniversitySystem, AcademicPaperSystem
**Magic**: MagicSystem (see [packages/magic](../../../magic/README.md))

## Registration

Use `registerAllSystems()` from `registerAllSystems.ts` - single source of truth for system registration. Never register systems manually in main.ts/headless.ts.

## Adding Systems

1. Implement `System` interface with `id`, `priority`, `requiredComponents`, `update()`
2. Add export to `index.ts`
3. Register in `registerAllSystems.ts` with proper priority
4. Document dependencies in JSDoc comments

See existing systems for patterns. Priority determines execution order - lower priorities run first.
