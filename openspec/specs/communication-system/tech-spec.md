# Communication Technology Progression Specification

> **System:** communication-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

## Overview

This specification defines a progressive technology tree for agent-to-agent communication, starting from basic walkie-talkies and advancing through radio, television, cellular networks, satellite communications, mesh networking, and ultimately Clarke-tech quantum entanglement devices.

Each technology tier builds upon the previous, introducing new gameplay mechanics, infrastructure requirements, and social dynamics.

## Core Requirements

### Requirement 1: Progressive Technology Tree

Communication technologies unlock in tiers:
- **Tier 1**: Walkie-Talkie (basic radio, 100 tile range)
- **Tier 2**: Radio Broadcast (one-to-many via towers, 500 tile range)
- **Tier 3**: Television Broadcast (video streaming, 600 tile range)
- **Tier 4a**: Cellular Network (mobile phones, tower infrastructure)
- **Tier 4b**: TV Camera + Recorder (portable video recording)
- **Tier 5a**: Satellite Phone (global coverage)
- **Tier 5b**: Mesh Network (decentralized peer-to-peer)
- **Tier 6a**: Quantum Entanglement Communicator (instant, unlimited range)
- **Tier 6b**: Distributed Quantum Network (quantum mesh)

### Requirement 2: Infrastructure Requirements

Later technologies require physical infrastructure:
- Radio towers for broadcast
- Cell towers for cellular network
- Satellites in orbit for satellite phones
- Quantum laboratories for entanglement devices

Infrastructure costs money, requires construction, and needs continuous power.

### Requirement 3: Emergent Agent Behavior

Agents autonomously decide communication methods based on:
- Urgency (emergency → fastest available)
- Privacy (private conversation vs broadcast)
- Cost (cell phone minutes cost money)
- Availability (what infrastructure exists?)
- Social norms (culture preferences)

## Implementation Files

> **Note:** This system is DRAFT - infrastructure not yet built

**Planned Components:**
- `packages/core/src/components/CommunicationComponent.ts` - Agent communication state
- `packages/core/src/components/CommunicationDeviceComponent.ts` - Device properties

**Planned Systems:**
- `packages/core/src/systems/WalkieTalkieSystem.ts` - Tier 1 implementation
- `packages/core/src/systems/RadioBroadcastSystem.ts` - Tier 2 implementation
- `packages/core/src/systems/CellularNetworkSystem.ts` - Tier 4a implementation
- `packages/core/src/systems/MeshNetworkSystem.ts` - Tier 5b implementation
- `packages/core/src/systems/QuantumCommunicationSystem.ts` - Tier 6 implementation

**Planned Buildings:**
- `packages/core/src/buildings/RadioTower.ts` - Radio broadcast infrastructure
- `packages/core/src/buildings/CellTower.ts` - Cellular infrastructure
- `packages/core/src/buildings/CommSatellite.ts` - Orbital satellite
- `packages/core/src/buildings/QuantumLaboratory.ts` - Entanglement facility

**Planned Items:**
- `packages/core/src/items/communicationDevices.ts` - All communication devices

## Components

### Component: CommunicationComponent
**Type:** `communication`
**Purpose:** Tracks active communication sessions for an agent

**Properties:**
- `activeCalls: ActiveCall[]` - Voice/video calls
- `activeChats: ActiveChat[]` - Chat sessions
- `devices: string[]` - Owned device IDs
- `activeDevice: string | null` - Current device in use
- `subscriptions: Subscription[]` - Radio/TV subscriptions
- `preferences: CommunicationPreferences` - Mute, DND, favorites

### Component: CommunicationTrait (Item Trait)
**Type:** `communication` (ItemTrait)
**Purpose:** Defines communication device capabilities

**Properties:**
- `mode: CommunicationMode` - two_way_radio, cellular, quantum, etc.
- `range: number | null` - Maximum range in tiles (null = unlimited)
- `channels: number` - Switchable channels/frequencies
- `requiresLineOfSight: boolean` - Needs clear path?
- `penetratesTerrain: boolean` - Can signal go through mountains?
- `batteryDuration: number` - Ticks until battery dies
- `signalStrength: number` - 0-1 multiplier
- `requiresInfrastructure: string[]` - Required tower/satellite IDs
- `latency: number` - Delay in ticks

## Systems

### System: WalkieTalkieSystem (Tier 1)
**Purpose:** Two-way radio communication
**Update Frequency:** Every tick

**Responsibilities:**
- Find agents with walkie-talkies
- Group by channel (1-8)
- Calculate signal strength with terrain penalties
- Route messages to receivers on same channel
- Drain battery based on transmission time

### System: RadioBroadcastSystem (Tier 2)
**Purpose:** One-to-many broadcasting
**Update Frequency:** Every tick

**Responsibilities:**
- Find powered radio towers
- Find agents with radios within tower range
- Match frequencies
- Stream broadcast content to listeners
- Track "now playing" on each channel

### System: CellularNetworkSystem (Tier 4a)
**Purpose:** Mobile phone network
**Update Frequency:** Every tick

**Responsibilities:**
- Build network graph from powered cell towers
- Assign phones to nearest tower
- Route calls/messages through network
- Handle voice calls, SMS, group chats
- Manage dropped calls when out of range

### System: MeshNetworkSystem (Tier 5b)
**Purpose:** Peer-to-peer mesh networking
**Update Frequency:** Every tick

**Responsibilities:**
- Discover mesh nodes in range
- Build routing table using AODV algorithm
- Route messages through multi-hop paths
- Handle node mobility
- Recalculate routes when topology changes

### System: QuantumCommunicationSystem (Tier 6)
**Purpose:** Instant quantum entanglement communication
**Update Frequency:** Every tick

**Responsibilities:**
- Track all quantum communicators
- Validate entanglement pairs
- Route messages instantly between pairs
- Degrade entanglement over time (requires re-calibration)
- Handle device destruction

## Events

**Emits:**
- `communication:call_started` - Voice/video call initiated
- `communication:call_ended` - Call terminated
- `communication:message_sent` - Message delivered
- `communication:broadcast_started` - Radio/TV broadcast begins
- `communication:network_failure` - Infrastructure failure

**Listens:**
- `power:outage` - Tower loses power
- `building:destroyed` - Infrastructure destroyed
- `agent:inventory_changed` - Device acquired/dropped

## Integration Points

- **DivineChatSystem** - Reuses chat room infrastructure
- **PowerGridSystem** - Towers require continuous power
- **BuildingSystem** - Infrastructure construction
- **CraftingSystem** - Device crafting recipes
- **ResearchSystem** - Technology unlocks

## UI Requirements

**Communication Panel:**
- Active Calls/Chats tab
- Contacts list
- Devices (switch between walkie-talkie, phone, etc.)
- Broadcasts (radio/TV listings)
- Settings (mute, DND, favorites)

**Context Menu:**
- "Call [Agent Name]" (if have phone)
- "Send Message" (if have phone)
- "Radio [Agent Name]" (if both have walkie-talkies)

## Performance Considerations

- Use quadtrees for spatial partitioning (find nearby devices)
- Cache network topology to avoid recalculation
- Limit messages per tick to prevent spam
- Event-driven updates (only process when state changes)
- Cache singleton tower/satellite entities

## Dependencies

**Phase 1 (Walkie-Talkie):**
- CraftingSystem (create walkie-talkies)
- ItemSystem (device as item)
- AgentDecisionSystem (choose to use radio)

**Phase 2+ (Infrastructure):**
- BuildingSystem (towers, satellites)
- PowerGridSystem (continuous power)
- ResearchSystem (unlock technologies)
- EconomySystem (purchase costs)

## Open Questions

- [ ] Should quantum devices violate no-communication theorem? (Clarke-tech handwave?)
- [ ] How to balance cost of cell phone plans?
- [ ] Should governments be able to monitor communications?
- [ ] Encryption/privacy mechanics?

---

**Related Specs:**
- [TV Station Spec](tv-station.md) - Television broadcasting implementation
- [Social Media Spec](social-media.md) - Digital communication platforms
- [Divinity System](../divinity-system/spec.md) - Chat infrastructure reuse
