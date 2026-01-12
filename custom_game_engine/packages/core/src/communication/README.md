# Communication

Agent-to-agent communication infrastructure supporting real-time chat, device-based comms, and cross-realm messaging.

## Message Types

**ChatRoom** - Group chats, DMs, threads with configurable membership
- `open`: Anyone can join
- `invite_only`: Admin-controlled membership
- `criteria_based`: Auto-membership via tags/guilds (e.g., `tag:deity`, `guild:miners`)

**WalkieTalkie** - Short-range push-to-talk radio communication
- Channel-based (1-99 channels depending on model)
- Range-limited broadcast (15-100 tiles by model tier)
- Battery-powered, no infrastructure required
- Models: basic, consumer, professional, military, emergency

**CellPhone** - Personal mobile devices with generational evolution
- 1G: Voice only
- 2G: Digital voice + SMS
- 3G: Internet + apps + GPS
- 4G/5G: High-speed data, social media integration
- Requires cell tower infrastructure (range, capacity, generation)

**CrossRealmPhone** - Inter-universe communication via β-space routing
- `basic`: Same universe only
- `advanced`: Cross-universe (same multiverse)
- `transcendent`: Cross-multiverse
- Uses σ (sync time) for causal ordering, prevents timeline paradoxes
- Powered by mana/energy charges

## Communication Patterns

**Broadcast**: WalkieTalkie channels, one-to-many within range

**Point-to-Point**: CellPhone calls/texts, one-to-one with infrastructure

**Group Persistent**: ChatRooms, many-to-many with message history

**Cross-Timeline**: CrossRealmPhone, bridges universes via β-coordinates

## Components

Agents get `chat_room_member` component when joining rooms. WalkieTalkie/CellPhone devices stored in inventory. CrossRealmPhone tracked in high-tier Clarketech systems.

## Retention

ChatRoom messages use `RetentionPolicy`:
- `none`: No history kept
- `session`: Cleared on restart
- `permanent`: Saved to disk

WalkieTalkie/CellPhone history stored per-device. CrossRealmPhone uses call history with β-space coordinates.

## Systems

`ChatRoomSystem` - Updates criteria-based membership, activates/deactivates rooms based on thresholds

`WalkieTalkieSystem` - Range checks, channel management, battery drain, transmission delivery

`CellPhoneSystem` - Signal strength via towers, call routing, SMS delivery, generation-specific features

CrossRealmPhone managed by trade/multiverse systems due to β-space dependencies.
