# Profession System

Agent profession mechanics for NPC city workers. Enables background work simulation without per-agent LLM calls.

## Overview

Professions link agents to workplaces, define behavioral priorities, and generate work output. System coordinates with `CityDirectorSystem` for city-wide distribution.

## Profession Types

### Media Professions
- **Newspaper**: `newspaper_reporter`, `newspaper_editor` - Investigation and content creation
- **Television**: `tv_actor`, `tv_director`, `tv_producer`, `tv_writer` - Performance and production
- **Radio**: `radio_dj`, `radio_producer` - Broadcasting and show production

### Service Professions
- **Healthcare**: `doctor`, `nurse` - Patient care, high service priority
- **Education**: `teacher`, `librarian` - Teaching and research
- **Commerce**: `shopkeeper`, `office_worker` - Customer service and cooking (TV influencers)

### Administrative
- `bureaucrat`, `city_planner`, `accountant` - Documentation and planning

### Other
- `generic_worker` - Balanced priorities across all activities

## Components

### ProfessionTemplates
Content generation without LLM. Templates by profession role, output type, and quality tier (0.0-1.0). Example:

```typescript
const content = generateProfessionContent('radio_dj', 0.8, { agentName: 'Freddy', cityName: 'Sunrise' });
// Output: "DJ Freddy in the morning, welcome to Sunrise City!"
```

### ProfessionPriorityProfiles
Strategic priority overrides per profession. Replaces skill-based priorities when working.

```typescript
newspaper_reporter: { exploration: 0.40, social: 0.25, investigation: 0.20 }
radio_dj: { social: 0.60, content_creation: 0.20 }
shopkeeper: { service: 0.50, social: 0.25 }
```

Utility functions:
- `isOnSiteProfession()` - High service (>0.3) or low exploration (<0.1)
- `isFieldProfession()` - High exploration (>0.2) or investigation (>0.15)

### ProfessionPersonalityGenerator
One-time LLM generation for catchphrases, intros, and quirks. Falls back to templates if LLM unavailable.

```typescript
const personality = await generator.generatePersonality('radio_dj', {
  name: 'Freddy',
  shift: { startHour: 5, endHour: 11 }
});
// Returns: { catchphrases: [...], intros: [...], quirks: [...], generatedBy: 'llm' }
```

### ReporterBehaviorHandler
Field reporter navigation for news coverage. Workflow:
1. Dispatched → status `en_route`
2. Behavior set to `navigate` or `follow_reporting_target`
3. Arrival → status `on_scene`
4. Recording starts automatically

```typescript
updateReporterBehaviors(world, currentTick); // Called by ProfessionWorkSimulationSystem
```

## Architecture

**Template-based**: No per-tick LLM calls. Use templates for work output.

**Priority-driven**: Profession overrides default skill priorities during work hours.

**City coordination**: CityDirectorSystem manages profession distribution across buildings.

## Integration

- `ProfessionComponent` - Attached to agents, tracks workplace, shift, output quota
- `ProfessionWorkSimulationSystem` - Updates work progress and generates output
- `NewsroomSystem` - Manages field reporters and story assignments (TV/news professions)
