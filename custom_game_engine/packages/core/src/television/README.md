# Television System

In-game TV broadcasting with ensouled LLM agents as writers, actors, and crew.

## Architecture

**Content-Centric Design**: Episodes and recordings are persistent ECS entities separate from broadcasting. Good content is archived in tiered storage (hot/warm/cold).

**Components**:
- `TVContentComponent`: Persistent episodes with scripts, quality metrics, viewership, cultural impact
- `TVStationComponent`: Station organization, staff (14 roles), channels, finances, production pipelines
- `TVShowComponent`: Show metadata, cast, characters, storylines, air schedule
- `TVBroadcastComponent`: Programming schedule, active broadcasts, viewer tracking, advertising

## Show Formats & Generation

**Formats**: Sitcom (22min), drama (44min), soap opera (30min), news, talk show (60min), game show, reality TV, documentary, cooking, sports, weather, children's, late night.

**LLM-Powered Generation** (`generation/`):
- `ScriptGenerator`: Writes scripts with acts, scenes, dialogue, stage directions
- `DialogueGenerator`: Generates character-specific dialogue with emotional beats

**Specialized Formats** (`formats/`):
- `NewsroomSystem`: Live news with reporters, desks, story priorities
- `TalkShowSystem`: Monologues, interviews, performances, guest bookings
- `GameShowSystem`: Competitions, contestants, challenges, prizes
- `SoapOperaSystem`: Serialized drama, relationships, plot twists, storylines

## Production & Broadcasting

**Production Pipeline** (`systems/`):
1. `TVDevelopmentSystem`: Pitch submissions, greenlight decisions
2. `TVWritingSystem`: Script writing tasks, episode planning
3. `TVProductionSystem`: Filming sessions, crew assignment, takes
4. `TVPostProductionSystem`: Editing, music cues, VFX, color grading
5. `TVBroadcastingSystem`: Schedule management, real-time transmission
6. `TVRatingsSystem`: Viewer reactions, ratings calculation

**Production Phases**: Development → Pre-production → Production → Post-production → Ready

**Broadcasting**:
- `ProgramSlot`: Weekly recurring schedule (day/time/duration)
- `BroadcastEvent`: Active broadcast with viewer tracking
- `ViewerReaction`: LLM-generated thoughts, ratings (1-10), enjoyment

## Cultural Impact & Revenue

**Cultural System** (`TVCulturalImpactSystem`):
- Catchphrases spread to agents
- Fashion trends from shows
- Fan communities and theories
- Celebrity status for actors
- Iconic moments

**Advertising** (`TVAdvertisingSystem`):
- Commercial breaks (start/middle/end)
- Sponsor deals
- Revenue based on viewership
- Per-channel targeting

**Archive** (`TVArchiveSystem`):
- Hot: Recent/high impact (free retrieval)
- Warm: Last month/decent ratings (10 cost)
- Cold: Old content (50 cost)
- Retrospective shows from archives

## Integration

**ChatRoomSystem**: Writers room and production floor collaboration.

**Employment**: Agents hired as station managers, producers, directors, writers, actors, news anchors, camera operators, editors, etc.

**Scheduling**: Time-based (day/hour/minute), prime time detection (8-11pm), conflict resolution.
