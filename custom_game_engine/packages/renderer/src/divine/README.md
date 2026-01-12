# Divine UI Components

God-mode interface for divine systems (prayers, angels, visions, sacred sites). Implements the player-as-deity interaction layer.

## Panels & Components

### Core Panels (IWindowPanel)
- **PrayerPanel** - Prayer inbox with filtering, agent context, response actions (visions/miracles)
- **AngelManagementPanel** - Angel roster, creation wizard, autonomy settings, performance stats
- **SacredGeographyPanel** - Sacred sites map with faith density heatmap, prayer paths visualization
- **DivineAnalyticsPanel** - Faith trends, prophecy tracking, energy economy metrics

### Supporting Components
- **DivineStatusBar** - Top bar showing divine energy, average faith, quick stats (prayers/angels/prophecies)
- **DivineTabBar** - Bottom tab navigation between panels (prayers/angels/sacred/insights)
- **FloatingPrayerNotifications** - Floating mini-cards for new prayers (left edge, auto-dismiss)
- **DivineActionsPalette** - Quick actions palette for divine interventions
- **PrayingAgentIndicators** - On-map indicators for agents currently praying

## Key Types

### DivineUITypes.ts
**Resources**: `DivineEnergy` (current/max/regen/consumption)

**Prayer System**: `Prayer`, `PrayerContext`, `PrayerDomain` (survival/health/social/guidance/environment/gratitude), `PrayerUrgency` (critical/urgent/moderate/gratitude)

**Vision System**: `VisionDraft`, `VisionPreview` (success chance, faith impact, energy cost), `VisionType` (guidance/warning/prophecy/revelation), `VisionDelivery` (sleep/meditation/immediate)

**Angel System**: `Angel` (level/xp/energy/assigned agents/performance/corruption), `AngelType` (guardian/specialist/messenger/watcher/archangel), `AngelDomain`, `AngelStyle` (gentle/stern/cryptic/direct), `AngelAutonomy` (supervised/semi_autonomous/fully_autonomous), `AngelStatus` (working/available/depleted/overloaded/resting/leveling/corrupt)

**Sacred Sites**: `SacredSite` (level 1-5, faith power, bonuses), `SacredSiteLevel` names (Blessed Spot → Divine Nexus)

**Analytics**: `FaithDistribution` (skeptics/curious/believers/devout), `PrayerStatistics`, `Prophecy`, `ProphecyStatus`

### Color Constants
`DIVINE_COLORS`: primary (gold), secondary (lavender), accent (sky blue), sacred (khaki), faith levels, urgency colors

`URGENCY_COLORS/ICONS`: Maps urgency to colors/emojis (critical=red, urgent=orange, moderate=yellow, gratitude=green)

`ANGEL_STATUS_ICONS`: Status emojis for angels

## Architecture

All panels implement `IWindowPanel` interface. State managed via callbacks pattern. Canvas-based rendering (no DOM). Energy costs calculated via helper functions (`getVisionEnergyCost`, `getAngelCreationCost`).

UI responds to divine energy economy - depleted energy disables expensive actions. Faith level affects success chances and visual feedback colors.
