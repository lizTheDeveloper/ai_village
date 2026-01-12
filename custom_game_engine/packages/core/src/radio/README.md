# Radio Broadcasting System

Audio-only broadcast infrastructure for music programming, talk shows, and DJ personalities.

## Overview

Simulates radio stations with AM/FM bands, signal coverage, listener engagement, and cultural impact through music discovery and DJ catchphrases.

**Components**: `radio_station` component attached to building entities
**System**: `RadioBroadcastingSystem` (priority 70, updates every 1s)

## Station Mechanics

### Configuration
```typescript
RadioStationConfig {
  callSign: "WXYZ"
  frequency: 98.5 | 1050   // FM or AM
  band: "AM" | "FM"         // AM = longer range, FM = shorter range
  format: RadioFormat       // top_40, rock, classical, jazz, talk, news, etc.
  signalStrength: 0-100     // Affects coverage radius
}
```

### Coverage
- **FM**: 50-tile base radius (better quality)
- **AM**: 100-tile base radius (longer range)
- Scaled by `signalStrength / 100`
- Agents must be in coverage to listen

### Shows & Programming
```typescript
RadioShow {
  format: 'music' | 'talk' | 'news' | 'sports' | 'variety'
  hostId: DJ agent
  duration: ticks
  currentListeners: real-time count
}
```

Schedule slots define weekly programming (day/hour/host/duration).

## DJ System

**RadioDJ component** tracks DJ careers:
- `djName`: On-air personality name
- `specialty`: Preferred radio format
- `fameLevel`: 0-100 (≥70 = famous DJ)
- `voiceRecognition`: How recognizable their voice is
- `catchphrases[]`: Signature phrases
- `talkStyle`: energetic/calm/controversial/comedic/serious

### Catchphrases
Create strong episodic memories for all listeners (0.6 emotional intensity, 0.7 novelty). Radio is more intimate than TV - "one voice in your ear".

## Music Discovery

20% chance listeners "discover" new tracks. Creates episodic memory with 0.9 novelty. Track metadata:
- `title`, `artist`, `genre`, `releaseYear`
- `playCount`: Increments per play
- `popularity`: Station-level metric

## Listener Engagement

```typescript
RadioListenerState {
  tuningDuration: ticks listened
  favoriteShows: show IDs
  favoriteDJs: agent IDs
  discoveredTracks: first-heard songs
}
```

**API**:
- `tuneIn(agentId, stationId)`: Start listening
- `tuneOut(agentId)`: Stop listening
- `getStationListeners(stationId)`: Active listeners

Listener count tracked per station and per show. Memories created after 10 minutes of listening.

## Commercials

```typescript
RadioCommercial {
  sponsorName, productName
  duration: seconds
  cost: ad buy price
  playCount, effectiveness: 0-100
}
```

Revenue = `cost / 10` per play. Commercial breaks tracked per show.

## Events

- `radio:show_started` / `radio:show_ended`
- `radio:listener_tuned_in` / `radio:listener_tuned_out`
- `radio:listener_update` (periodic)
- `radio:catchphrase_said`
- `radio:song_discovered`

## Usage

```typescript
import { getRadioStationManager, getRadioBroadcastingSystem } from '@ai-village/core';

const manager = getRadioStationManager();
const station = manager.createStation(entityId, {
  callSign: "WBOS",
  frequency: 92.9,
  band: "FM",
  format: "rock",
  signalStrength: 80
});

manager.goOnAir(entityId);
manager.registerDJ(agentId, entityId, "Johnny Midnight", "rock");

const system = getRadioBroadcastingSystem();
system.tuneIn(listenerId, entityId);
system.startDJShow(entityId, agentId, "Midnight Rock Hour", "music", tick, 7200);
```

## Integration

**Memory**: Creates episodic memories for catchphrases (high intensity) and music discovery (high novelty)
**Coverage**: Squared distance check against coverage radius
**Throttling**: Updates every 20 ticks (1 second at 20 TPS)
