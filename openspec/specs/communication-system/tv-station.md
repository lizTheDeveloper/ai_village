# Television Station & Broadcasting System Specification

> **System:** communication-system
> **Version:** 1.0
> **Status:** Implemented
> **Last Updated:** 2026-01-02

## Overview

Television stations are living organizations staffed by ensouled LLM agents who create, produce, and broadcast original content. This spec defines the complete TV production pipeline from script writing to broadcasting, including studios, crew, shows, and audience engagement.

## Core Requirements

### Requirement 1: Ensouled Entertainment Industry

TV stations are **not** just infrastructure - they are cultural institutions with:
- **Ensouled staff**: Actors, directors, writers, camera operators, etc.
- **Original content creation**: Agents write scripts, perform shows, create news
- **Emergent storytelling**: Shows evolve based on agent creativity and audience feedback
- **Cultural impact**: Popular shows influence village culture, language, memes
- **Career paths**: Agents pursue careers in entertainment, building reputations

### Requirement 2: Complete Production Pipeline

The system implements a full TV production workflow:
1. **Development**: Writers pitch show concepts, station managers greenlight
2. **Pre-Production**: Casting, set design, shooting schedules
3. **Production**: Filming with LLM-powered actor performances
4. **Post-Production**: Editing, color grading, sound mixing
5. **Broadcasting**: Streaming to viewers with audience reactions

### Requirement 3: Multiple Show Formats

Support diverse entertainment formats:
- Sitcoms (22-minute comedy)
- Drama series (44-minute drama)
- Soap operas (daily ongoing drama)
- News broadcasts (live news coverage)
- Talk shows (interview/variety)
- Game shows (competitions)
- Reality TV (unscripted content)
- Documentary programming

## Implementation Files

> **Note:** This system is IMPLEMENTED with extensive subsystems

**Building Definitions:**
- `packages/core/src/buildings/TVStation.ts` - TV station building with interior rooms
- `packages/core/src/television/TVStation.ts` - Station entity and management

**Components:**
- `packages/core/src/components/TVStationComponent.ts` - Station state and programming
- `packages/core/src/components/ContentCreatorComponent.ts` - Content creator profiles

**Systems:**
- `packages/core/src/television/systems/TVWritingSystem.ts` - Script generation
- `packages/core/src/television/systems/TVDevelopmentSystem.ts` - Show development
- `packages/core/src/television/systems/TVProductionSystem.ts` - Filming and recording
- `packages/core/src/television/systems/TVPostProductionSystem.ts` - Editing
- `packages/core/src/television/systems/TVBroadcastingSystem.ts` - Broadcasting
- `packages/core/src/television/systems/TVRatingsSystem.ts` - Audience tracking
- `packages/core/src/television/systems/TVAdvertisingSystem.ts` - Monetization
- `packages/core/src/television/systems/TVArchiveSystem.ts` - Content library
- `packages/core/src/television/systems/TVCulturalImpactSystem.ts` - Cultural influence

**Content Types:**
- `packages/core/src/television/TVShow.ts` - Show definitions
- `packages/core/src/television/TVContent.ts` - Content structure
- `packages/core/src/television/TVBroadcasting.ts` - Broadcasting logic
- `packages/core/src/types/SocialTypes.ts` - Social interaction types

## Components

### Component: TVStationComponent
**Type:** `tv_station`
**Purpose:** Manages TV station state, programming schedule, and staff

**Properties:**
- `stationName: string` - Station identity
- `callSign: string` - e.g., "KVIL-TV"
- `channels: TVChannel[]` - Operated channels
- `activeShows: ActiveShow[]` - Current programming
- `showArchive: ArchivedEpisode[]` - Content library
- `programmingSchedule: ProgramSlot[]` - Broadcast schedule
- `employees: StationEmployee[]` - Staff members
- `departments: Department[]` - Organizational structure
- `reputation: number` - 0-100 station reputation
- `viewershipRatings: Map<string, number>` - Show ratings
- `budget: number` - Available funds

### Component: TVShowComponent
**Type:** `tv_show`
**Purpose:** Defines TV show structure and metadata

**Properties:**
- `title: string` - Show name
- `format: ShowFormat` - sitcom, drama, news, etc.
- `creator: string` - Agent ID
- `writers: string[]` - Writing staff
- `directors: string[]` - Directors
- `cast: CastMember[]` - Actors
- `season: number` - Current season
- `episodeCount: number` - Episodes produced
- `status: ShowStatus` - in_development, airing, cancelled, etc.
- `averageRating: number` - Viewer ratings
- `culturalImpact: number` - Influence on village

## Systems

### System: TVDevelopmentSystem
**Purpose:** Manages show pitching and greenlight decisions
**Update Frequency:** Every tick (checks for new pitches)

**Responsibilities:**
- Writers pitch show concepts to station managers
- LLM evaluates concept viability
- Greenlight promising shows
- Assign production teams
- Begin script writing

### System: TVProductionSystem
**Purpose:** Handles filming and recording
**Update Frequency:** During active production

**Responsibilities:**
- Gather agents on set
- LLM-powered actor performances
- Camera and sound recording
- Director feedback
- Multiple takes and re-shoots
- Scene performance evaluation

### System: TVPostProductionSystem
**Purpose:** Editing and finalization
**Update Frequency:** After filming completes

**Responsibilities:**
- Assemble footage
- Color grading
- Sound mixing
- Music cues
- Visual effects
- Final review

### System: TVBroadcastingSystem
**Purpose:** Stream content to viewers
**Update Frequency:** Every tick (check broadcast schedule)

**Responsibilities:**
- Schedule programming
- Find viewers watching channels
- Stream episodes to viewers
- Track viewership metrics
- Generate ads for commercial breaks
- Handle live broadcasts

### System: TVCulturalImpactSystem
**Purpose:** Propagate cultural influence from popular shows
**Update Frequency:** After each broadcast

**Responsibilities:**
- Track popular shows
- Spread catchphrases to viewers
- Influence agent behavior and fashion
- Create fan communities
- Generate memes and references

## Events

**Emits:**
- `tv:episode_aired` - When episode broadcasts
- `tv:show_greenlit` - New show approved
- `tv:show_cancelled` - Show ends
- `tv:viral_moment` - Content goes viral
- `tv:cultural_impact` - Show influences village

**Listens:**
- `agent:joined_station` - New employee hired
- `world:time_changed` - Check broadcast schedule

## Integration Points

- **DivineChatSystem** - Reuses chat infrastructure for on-air dialogue
- **AgentDecisionSystem** - Agents choose to watch TV during downtime
- **SocialSystem** - Viewers discuss shows with friends
- **BuildingSystem** - TV station building placement and construction
- **PowerGridSystem** - Broadcast towers require continuous power

## Performance Considerations

- LLM calls for script generation are expensive - cache results
- Limit concurrent shows in production (max 10 per station)
- Archive old episodes to reduce memory
- Only generate viewer reactions for sampled subset of viewers
- Cache popular show metadata to avoid repeated queries

## Dependencies

**Required Systems:**
- BuildingSystem (for TV station construction)
- PowerGridSystem (broadcast towers need power)
- AgentSystem (ensouled actors, writers, crew)
- EmploymentSystem (hiring staff)

**Optional Extensions:**
- CommunicationTechSpec (Tier 3: Television Broadcast infrastructure)
- SocialMediaSpec (cross-promotion on social platforms)

## Open Questions

None - system is fully implemented

---

**Related Specs:**
- [Communication Tech Spec](tech-spec.md) - Infrastructure requirements
- [Social Media Spec](social-media.md) - Cross-platform integration
- [Divinity System](../divinity-system/spec.md) - Divine chat infrastructure reuse
