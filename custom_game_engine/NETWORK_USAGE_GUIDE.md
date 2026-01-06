# Cross-Universe Networking - Usage Guide

This guide shows how to use the peer-to-peer networked multiverse features.

## Features

1. **MultiverseNetworkManager** - WebSocket-based peer connections
2. **GodChatRoomNetwork** - Distributed chat for players
3. **ProximityVoiceChat** - WebRTC spatial voice/video
4. **RemotePassages** - Portals between universes on different machines
5. **Entity Transfer** - Move entities between networked universes
6. **Live Universe Streaming** - Real-time delta-based updates

## Quick Start

### 1. Initialize Network Manager

```typescript
import {
  initializeNetworkManager,
  multiverseCoordinator,
} from '@ai-village/core';

// Initialize the network manager
const networkManager = initializeNetworkManager(multiverseCoordinator);

// Start WebSocket server (host)
await networkManager.startServer(8080);

console.log(`Server started. My Peer ID: ${networkManager.getMyPeerId()}`);
console.log(`Share this address: ws://your-ip:8080`);
```

### 2. Connect to a Remote Peer (Client)

```typescript
// Connect to a remote host
const peerId = await networkManager.connectToPeer('ws://192.168.1.100:8080');

console.log(`Connected to peer: ${peerId}`);
```

### 3. Create a Remote Passage

```typescript
import type { RemotePassageConfig } from '@ai-village/core';

const config: RemotePassageConfig = {
  localUniverseId: 'my-universe',
  remoteUniverseId: 'friend-universe',
  remotePeerId: peerId,
  creatorId: 'player-1',

  // View mode: 'none', 'observe', 'participate'
  viewMode: 'observe',

  // Interaction: 'none', 'limited', 'full', 'collaborative'
  interactionMode: 'limited',

  // Optional: Local/remote positions for the passage entrance
  localPosition: { x: 100, y: 100 },
  remotePosition: { x: 50, y: 50 },

  // Optional: Viewport bounds for streaming
  viewportBounds: { x: 0, y: 0, width: 50, height: 50 },

  // Streaming config
  syncFrequency: 20, // Hz
  includeEvents: true,
  includeTerrain: false,
};

const passage = await networkManager.createRemotePassage(config);

console.log(`Passage created: ${passage.id}`);
console.log(`Connection state: ${passage.connectionState}`);
```

### 4. Transfer Entity Through Passage

```typescript
// Transfer an entity to remote universe
const entityId = 'agent-12345';
const newEntityId = await networkManager.transferEntity(entityId, passage.id);

console.log(`Entity transferred!`);
console.log(`Old ID: ${entityId}`);
console.log(`New ID: ${newEntityId}`);
```

### 5. Subscribe to Remote Universe Updates

```typescript
// Subscribe to universe updates through passage
networkManager.subscribeToUniverse(passage.id);

// Updates will be received automatically via the passage
```

## God Chat Room

### Initialize Chat Network

```typescript
import { GodChatRoomNetwork } from '@ai-village/core';

// Create chat network
const chatNetwork = new GodChatRoomNetwork(
  networkManager.getMyPeerId(),
  'PlayerName',
  (peerId, message) => {
    // Send message to peer via network manager
    // Network manager handles routing
  },
  (roomId, message) => {
    // Broadcast to all peers in room
    // Implementation depends on your network topology
  }
);

// Join a chat room
chatNetwork.joinChatRoom('main', 'Main Chat');

// Send a message
chatNetwork.sendChatMessage('main', 'Hello everyone!');

// Send an emote
chatNetwork.sendChatMessage('main', 'waves at everyone', 'emote');

// Get recent messages
const messages = chatNetwork.getRecentMessages('main', 50);

// Get active members
const members = chatNetwork.getActiveMembers('main');
console.log(`Online: ${chatNetwork.getOnlineMemberCount('main')}`);
```

### Integrate with NetworkManager

```typescript
// In MultiverseNetworkManager's message handler, route chat messages:
private handleMessage(peerId: PeerId, message: NetworkMessage): void {
  // Existing handlers...

  // Check if it's a chat message
  if (message.type.startsWith('chat_')) {
    this.chatNetwork?.handleNetworkMessage(peerId, message as any);
    return;
  }

  // Existing message routing...
}
```

## Proximity Voice Chat

### Initialize Voice Chat

```typescript
import { ProximityVoiceChat } from '@ai-village/core';

const voiceChat = new ProximityVoiceChat(
  networkManager.getMyPeerId(),
  (peerId, message) => {
    // Send WebRTC signaling message
    // Use network manager to send
  },
  {
    // Spatial audio settings
    refDistance: 10,      // Distance at which attenuation begins
    maxDistance: 100,     // Distance at which audio becomes silent
    rolloffFactor: 2,     // How quickly volume drops
    panningModel: 'HRTF', // Spatial audio model
    distanceModel: 'inverse',
  }
);

// Start voice/video chat with a peer
await voiceChat.startChat(peerId, {
  audio: true,
  video: true,
  videoWidth: 320,
  videoHeight: 240,
});

// Mute/unmute
voiceChat.setMuted(true);
voiceChat.setMuted(false);

// Enable/disable video
voiceChat.setVideoEnabled(false);
voiceChat.setVideoEnabled(true);
```

### Update Spatial Audio

```typescript
// In your game loop, update spatial positions
const myPosition = { x: 100, y: 200 };
const playerPositions = new Map([
  ['peer-123', { x: 110, y: 205 }],
  ['peer-456', { x: 150, y: 250 }],
]);

voiceChat.update(myPosition, playerPositions);
```

### Render Video Feeds

```typescript
// In your renderer
const ctx = canvas.getContext('2d')!;

// Get player info with positions
const playerInfo = new Map([
  ['peer-123', {
    position: { x: 110, y: 205 },
    displayName: 'Alice'
  }],
  ['peer-456', {
    position: { x: 150, y: 250 },
    displayName: 'Bob'
  }],
]);

// Render video bubbles above characters
voiceChat.renderVideoFeeds(ctx, playerInfo);
```

### Handle WebRTC Signaling

```typescript
// In MultiverseNetworkManager's message handler
private handleMessage(peerId: PeerId, message: NetworkMessage): void {
  // Check if it's a WebRTC signaling message
  if (message.type.startsWith('webrtc_')) {
    this.voiceChat?.handleSignalingMessage(message as any);
    return;
  }

  // Existing message routing...
}
```

## UI Panels

### Network Panel

```typescript
import { NetworkPanel } from '@ai-village/renderer';

// Create network panel
const networkPanel = new NetworkPanel(networkManager);

// Show the panel
networkPanel.setVisible(true);

// Render (in your renderer)
networkPanel.render(ctx, x, y, width, height);

// Handle clicks
networkPanel.handleClick(mouseX, mouseY);

// Handle keyboard (for input fields)
networkPanel.handleKeyPress(key);

// Handle scroll
networkPanel.handleWheel(deltaY);
```

### Chat Panel

```typescript
import { ChatPanel } from '@ai-village/renderer';

// Create chat panel
const chatPanel = new ChatPanel(chatNetwork, 'main');

// Show the panel
chatPanel.setVisible(true);

// Render
chatPanel.render(ctx, x, y, width, height);

// Handle input
chatPanel.handleClick(mouseX, mouseY);
chatPanel.handleKeyPress(key);
chatPanel.handleWheel(deltaY);

// Switch rooms
chatPanel.switchRoom('guild', 'Guild Chat');

// Leave room
chatPanel.leaveCurrentRoom();
```

### Remote Universe View

```typescript
import { RemoteUniverseView } from '@ai-village/renderer';

// Create remote universe view
const remoteView = new RemoteUniverseView(
  passage.id,
  passage.to.universeId,
  'picture-in-picture' // or 'portal', 'split-screen'
);

// Show the view
remoteView.setVisible(true);

// Handle universe updates
remoteView.handleSnapshot(snapshotMessage);
remoteView.handleUpdate(updateMessage);

// Render
remoteView.render(ctx, x, y, width, height);

// Pan camera
remoteView.panCamera(dx, dy);

// Zoom
remoteView.setZoom(1.5);

// Change view mode
remoteView.setViewMode('split-screen');
```

## Complete Integration Example

```typescript
import {
  initializeNetworkManager,
  multiverseCoordinator,
  GodChatRoomNetwork,
  ProximityVoiceChat,
} from '@ai-village/core';

import {
  NetworkPanel,
  ChatPanel,
  RemoteUniverseView,
} from '@ai-village/renderer';

class NetworkedGame {
  private networkManager: MultiverseNetworkManager;
  private chatNetwork: GodChatRoomNetwork;
  private voiceChat: ProximityVoiceChat;

  private networkPanel: NetworkPanel;
  private chatPanel: ChatPanel;
  private remoteViews: Map<string, RemoteUniverseView> = new Map();

  async initialize() {
    // Initialize network manager
    this.networkManager = initializeNetworkManager(multiverseCoordinator);

    // Start server (host)
    await this.networkManager.startServer(8080);

    // Initialize chat network
    this.chatNetwork = new GodChatRoomNetwork(
      this.networkManager.getMyPeerId(),
      'Player',
      (peerId, msg) => {
        // Send via network manager (implement routing)
      },
      (roomId, msg) => {
        // Broadcast via network manager
      }
    );

    // Initialize voice chat
    this.voiceChat = new ProximityVoiceChat(
      this.networkManager.getMyPeerId(),
      (peerId, msg) => {
        // Send WebRTC signaling via network manager
      }
    );

    // Initialize UI
    this.networkPanel = new NetworkPanel(this.networkManager);
    this.chatPanel = new ChatPanel(this.chatNetwork);

    // Join main chat
    this.chatNetwork.joinChatRoom('main', 'Main Chat');
  }

  async connectToPeer(address: string) {
    const peerId = await this.networkManager.connectToPeer(address);

    // Start voice chat
    await this.voiceChat.startChat(peerId, {
      audio: true,
      video: true,
    });

    return peerId;
  }

  async createPassage(peerId: string, remoteUniverseId: string) {
    const passage = await this.networkManager.createRemotePassage({
      localUniverseId: 'my-universe',
      remoteUniverseId,
      remotePeerId: peerId,
      creatorId: 'player',
      viewMode: 'observe',
      interactionMode: 'limited',
    });

    // Subscribe to updates
    this.networkManager.subscribeToUniverse(passage.id);

    // Create remote view
    const remoteView = new RemoteUniverseView(
      passage.id,
      remoteUniverseId,
      'picture-in-picture'
    );

    this.remoteViews.set(passage.id, remoteView);

    return passage;
  }

  update(deltaTime: number) {
    // Update spatial audio
    const myPos = this.getPlayerPosition();
    const peerPositions = this.getPeerPositions();
    this.voiceChat.update(myPos, peerPositions);
  }

  render(ctx: CanvasRenderingContext2D) {
    // Render game world...

    // Render video feeds above characters
    const playerInfo = this.getPlayerInfo();
    this.voiceChat.renderVideoFeeds(ctx, playerInfo);

    // Render UI panels
    if (this.networkPanel.isVisible()) {
      this.networkPanel.render(ctx, 10, 10, 450, 600);
    }

    if (this.chatPanel.isVisible()) {
      this.chatPanel.render(ctx, 470, 10, 600, 400);
    }

    // Render remote universe views
    for (const view of this.remoteViews.values()) {
      if (view.isVisible()) {
        view.render(ctx, viewX, viewY, viewWidth, viewHeight);
      }
    }
  }

  cleanup() {
    // Stop voice chat
    this.voiceChat.destroy();

    // Leave chat rooms
    this.chatNetwork.destroy();

    // Stop network manager
    this.networkManager.stopServer();
  }

  private getPlayerPosition() {
    // Get local player position
    return { x: 0, y: 0 };
  }

  private getPeerPositions() {
    // Get positions of peer players in world
    return new Map();
  }

  private getPlayerInfo() {
    // Get player display info for video rendering
    return new Map();
  }
}

// Usage
const game = new NetworkedGame();
await game.initialize();

// Connect to peer
await game.connectToPeer('ws://192.168.1.100:8080');

// Create passage
await game.createPassage('peer-id', 'remote-universe');
```

## Security Considerations

1. **Encryption**: Remote passages use encryption by default
2. **Authentication**: Implement `requiresAuthentication` for passages
3. **Access Control**: Use `accessPolicy` ('private', 'friends', 'public')
4. **Checksum Validation**: Entity transfers are validated with checksums
5. **STUN/TURN**: Configure ICE servers for NAT traversal in production

## Performance Tips

1. **Delta Updates**: Enable `deltaUpdatesOnly` in stream config
2. **Entity Filtering**: Use `entityFilter` to limit streamed entities
3. **Viewport Bounds**: Set `viewportBounds` to stream only visible area
4. **Sync Frequency**: Lower `syncFrequency` for better performance (default: 20 Hz)
5. **Max Entities**: Set `maxEntities` to cap bandwidth usage

## Troubleshooting

### Connection Failed
- Check firewall settings
- Verify WebSocket port is open
- Ensure correct peer address format: `ws://ip:port`

### No Audio
- Check browser permissions for microphone
- Verify STUN servers are accessible
- Check spatial audio distance settings

### High Latency
- Reduce `syncFrequency`
- Enable `deltaUpdatesOnly`
- Use `viewportBounds` to limit streamed area
- Reduce `maxEntities`

### Entity Transfer Failed
- Verify passage is in 'connected' state
- Check universe IDs match
- Ensure entity exists in source universe
- Check checksum validation errors in console

## API Reference

See TypeScript definitions for complete API:
- `packages/core/src/multiverse/MultiverseNetworkManager.ts`
- `packages/core/src/multiverse/GodChatRoomNetwork.ts`
- `packages/core/src/multiverse/ProximityVoiceChat.ts`
- `packages/core/src/multiverse/NetworkProtocol.ts`
