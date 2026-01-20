# Epic Plot Scanner Implementation

## Overview

Epic plot assignment has been integrated into the **FatesCouncilSystem**. The Fates now scan for souls ready for ascension during their evening council meetings.

## Implementation

### Location
`packages/core/src/plot/FatesCouncilSystem.ts`

### Key Methods

1. **scanForEpicAscensions(world, tick)** - Main scanning logic
   - Throttled to run every 50,000 ticks (~40 minutes real time)
   - Queries all souls with SoulIdentity + PlotLines components
   - Checks eligibility and assigns appropriate epic templates

2. **isEligibleForEpicPlot(soulIdentity, plotLines)** - Eligibility checking
   - Wisdom >= 100
   - Completed 5+ large/epic plots
   - No active epic plot already assigned

3. **selectEpicTemplate(entity, soulIdentity, plotLines, world)** - Template selection
   - Analyzes lessons_learned and skills
   - Checks deity relationships and descendants
   - Returns best-fit epic template ID

### Template Selection Logic

#### The Endless Summer (Fae Ascension)
- **Trigger**: Lessons include 'nature', 'wild', 'harmony', 'druid'
- **Skills**: gathering, farming, or animal_handling at level 2+
- **Template ID**: `epic_endless_summer`

#### The Enochian Ascension (Angel Path)
- **Trigger**: Lessons include 'purity', 'divine', 'devotion', 'angel', 'celestial'
- **Relationship**: Has deity relationship with trust >= 90
- **Template ID**: `epic_enochian_ascension`

#### The Exaltation Path (Mormon Godhood)
- **Trigger**: Lessons include 'family', 'legacy', 'descendant', 'children', 'creation'
- **Descendants**: Has 10+ descendants (recursive count)
- **Template ID**: `epic_exaltation_path`

#### Default Behavior
If wisdom >= 100 but no clear affinity:
- Scores each path based on partial matches
- Picks highest score
- If all scores are 0, randomly selects a template

### Integration

Epic scanning runs automatically after the Fates Council concludes each evening:

```typescript
// In onUpdate method:
this.conductFatesCouncil(ctx.world, ctx.tick, currentDay);
this.scanForEpicAscensions(ctx.world, ctx.tick); // Added here
```

### Helper Methods

- **hasSkillAffinity(entity, skills)** - Checks if entity has any skill at level 2+
- **hasDeityRelationship(entity, world, minTrust)** - Checks for deity with trust >= threshold
- **countDescendants(entity, world)** - Recursively counts all descendants via Parenting component

## Design Rationale

### Why in FatesCouncilSystem?

1. **Narrative Authority**: The Fates are already responsible for assigning exotic plots
2. **Thematic Consistency**: Ascension is a fate-level decision, not event-driven
3. **Timing**: Evening council is a natural time for deep reflection on soul progression
4. **Code Organization**: Keeps all plot assignment logic in one system

### Why NOT Event-Driven?

Epic plots are **threshold-based**, not **event-triggered**:
- Wisdom accumulation is gradual
- Plot completion is tracked over time
- Assignment requires holistic evaluation of the soul's entire journey
- Should feel like a culmination, not a reaction

### Scan Interval

50,000 ticks = ~40 minutes real time at 20 TPS
- Balances CPU cost with responsiveness
- Souls won't wait forever once eligible
- Infrequent enough to feel special/rare

## Testing

To test epic plot assignment:

1. Grant a soul high wisdom: `game.grantWisdom(agentId, 100)`
2. Mark large plots as completed (requires manual component editing)
3. Wait for next evening + scan interval
4. Check console for: `[FatesCouncilSystem] ✨ EPIC ASCENSION: ...`

## Future Enhancements

- [ ] LLM-powered template selection (Fates decide based on narrative)
- [ ] Custom epic templates per soul archetype
- [ ] Epic plot prerequisites (e.g., must complete specific large plots first)
- [ ] Multiple epic paths for one soul (sequential ascensions)
- [ ] Admin dashboard view for epic eligibility tracking
