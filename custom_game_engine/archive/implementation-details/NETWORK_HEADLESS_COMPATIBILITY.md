# Network System - Headless Compatibility

## Overview

The networking system is designed to work in **both browser and Node.js environments**, including the headless game service.

## Compatibility Matrix

### ✅ Fully Headless Compatible

These components work in Node.js without a browser:

**1. MultiverseNetworkManager**
- ✅ WebSocket server/client (uses `ws` package in Node.js)
- ✅ Peer connections
- ✅ Remote passage creation
- ✅ Entity transfer
- ✅ Universe streaming
- ✅ Message routing

**2. GodChatRoomNetwork**
- ✅ Chat room management
- ✅ Message synchronization
- ✅ Presence tracking
- ✅ Member management
- ✅ All networking logic

**Usage in Headless**:
```typescript
// headless.ts
import {
  initializeNetworkManager,
  multiverseCoordinator,
  GodChatRoomNetwork,
} from '@ai-village/core';

// Initialize networking
const networkManager = initializeNetworkManager(multiverseCoordinator);

// Start server
await networkManager.startServer(8080);

// Create chat network
const chatNetwork = new GodChatRoomNetwork(
  networkManager.getMyPeerId(),
  'HeadlessServer',
  (peerId, msg) => {
    // Send via network manager
  },
  (roomId, msg) => {
    // Broadcast via network manager
  }
);

// Join chat room
chatNetwork.joinChatRoom('main', 'Main Chat');

// Now headless server can communicate with browser clients!
```

### ❌ Browser-Only (Not Headless Compatible)

These components require browser APIs:

**1. ProximityVoiceChat**
- ❌ Requires WebRTC (RTCPeerConnection)
- ❌ Requires Web Audio API (AudioContext, PannerNode)
- ❌ Requires getUserMedia for mic/camera
- **Alternative**: Headless can relay WebRTC signaling without participating

**2. UI Components**
- ❌ NetworkPanel (requires canvas)
- ❌ ChatPanel (requires canvas)
- ❌ RemoteUniverseView (requires canvas)
- **Alternative**: Headless can provide data via HTTP/WebSocket API

## Headless Server Architecture

### Use Case 1: Headless Game Server

A headless server can host universes and handle networking:

```typescript
// headless-server.ts
import { HeadlessGameLoop } from './headless.js';
import {
  initializeNetworkManager,
  multiverseCoordinator,
  GodChatRoomNetwork,
} from '@ai-village/core';

class NetworkedHeadlessServer {
  private headlessGame: HeadlessGameLoop;
  private networkManager: MultiverseNetworkManager;
  private chatNetwork: GodChatRoomNetwork;

  async start() {
    // Start headless game
    this.headlessGame = new HeadlessGameLoop(gameLoop);
    this.headlessGame.start();

    // Initialize networking
    this.networkManager = initializeNetworkManager(multiverseCoordinator);
    await this.networkManager.startServer(8080);

    // Initialize chat
    this.chatNetwork = new GodChatRoomNetwork(
      this.networkManager.getMyPeerId(),
      'Server',
      this.sendMessage.bind(this),
      this.broadcast.bind(this)
    );

    this.chatNetwork.joinChatRoom('main', 'Main Chat');

    console.log('Headless server ready for connections');
  }

  private sendMessage(peerId: string, message: any) {
    // Route through network manager
  }

  private broadcast(roomId: string, message: any) {
    // Broadcast to all connected peers
  }
}

const server = new NetworkedHeadlessServer();
await server.start();
```

**Capabilities**:
- ✅ Accept connections from browser clients
- ✅ Host universes that clients can view
- ✅ Transfer entities to/from clients
- ✅ Participate in chat rooms
- ✅ Stream universe updates
- ❌ No voice/video (browser clients can do P2P voice amongst themselves)
- ❌ No UI rendering (that's on the clients)

### Use Case 2: Headless + Browser Hybrid

Browser client connects to headless server:

```
┌─────────────────────────────┐
│  Headless Server (Node.js)  │
│  - Universe simulation      │
│  - Entity logic             │
│  - Chat relay               │
│  - WebSocket server :8080   │
└─────────────┬───────────────┘
              │
              │ WebSocket
              │
┌─────────────▼───────────────┐
│  Browser Client             │
│  - NetworkPanel UI          │
│  - ChatPanel UI             │
│  - RemoteUniverseView       │
│  - ProximityVoiceChat       │
│    (P2P with other browsers)│
└─────────────────────────────┘
```

**Flow**:
1. Headless server runs universe simulation
2. Browser client connects via WebSocket
3. Server streams universe updates to client
4. Client renders and provides UI
5. Multiple browser clients can do P2P voice/video
6. Chat goes through server (relayed to all clients)

### Use Case 3: Multiple Headless Servers

Headless servers can connect to each other:

```
┌─────────────────┐     WebSocket    ┌─────────────────┐
│ Headless Server │◄────────────────►│ Headless Server │
│   Universe A    │                  │   Universe B    │
│   Port 8080     │                  │   Port 8081     │
└─────────────────┘                  └─────────────────┘
        │                                     │
        │                                     │
        ▼                                     ▼
  [Universe A]                          [Universe B]
  - Entities                            - Entities
  - State                               - State
  - Can transfer                        - Can receive
    entities to B                         entities from A
```

**Benefits**:
- Distributed universe hosting
- Load balancing across servers
- High availability (servers can failover)
- Scalable architecture

## Implementation Notes

### Network Manager Initialization

The MultiverseNetworkManager automatically detects environment:

```typescript
// In MultiverseNetworkManager.ts
async startServer(port: number = 8080): Promise<void> {
  // Dynamic import for Node.js environment
  try {
    const { WebSocketServer } = await import('ws');
    this.wsServer = new WebSocketServer({ port });
    // ... rest of setup
  } catch (error) {
    throw new Error('WebSocket server requires Node.js environment');
  }
}
```

**Browser**: Uses native `WebSocket`
**Node.js**: Uses `ws` package

### Chat Network - Environment Agnostic

GodChatRoomNetwork is pure TypeScript logic with no browser dependencies:

```typescript
export class GodChatRoomNetwork {
  // No DOM, no browser APIs, just data structures and callbacks
  private chatRooms: Map<string, ChatRoom> = new Map();
  private myPeerId: PeerId;

  // Callbacks allow environment-specific sending
  private sendMessage: (peerId: PeerId, message: any) => void;
  private broadcastToRoom: (roomId: string, message: any) => void;
}
```

## Testing Headless Networking

### Basic Test

```bash
# Terminal 1: Start headless server
cd custom_game_engine
npx tsx demo/headless-network-server.ts

# Terminal 2: Connect from another headless instance
npx tsx demo/headless-network-client.ts ws://localhost:8080

# Terminal 3: Open browser client
npm run dev
# Then connect via NetworkPanel UI
```

### Chat Test

```typescript
// In headless server
chatNetwork.sendChatMessage('main', 'Hello from headless!');

// Browser client will receive this message
// Browser can reply and headless will receive it
```

### Entity Transfer Test

```typescript
// Headless server creates an agent
const agent = createLLMAgent(world, { x: 100, y: 100 }, 'ServerBot');

// Browser creates a passage to headless server
const passage = await networkManager.createRemotePassage({
  localUniverseId: 'browser-universe',
  remoteUniverseId: 'headless-universe',
  remotePeerId: 'headless-server-peer-id',
  // ...
});

// Browser can transfer entity to headless server
await networkManager.transferEntity(agentId, passage.id);

// Entity now exists in headless server's world
```

## Limitations in Headless Mode

1. **No Voice/Video**: ProximityVoiceChat requires browser
   - **Workaround**: Browser clients do P2P voice amongst themselves
   - Headless can relay signaling messages

2. **No UI Rendering**: NetworkPanel, ChatPanel require canvas
   - **Workaround**: Provide HTTP API or CLI for headless control
   - Example: `curl http://localhost:8080/admin/chat/send`

3. **No Video Rendering**: RemoteUniverseView requires canvas
   - **Workaround**: Stream JSON data instead of rendering
   - Browser clients can render the data

## Recommended Headless Setup

```typescript
// headless-network-server.ts
import { HeadlessGameLoop } from './headless.js';
import {
  initializeNetworkManager,
  multiverseCoordinator,
  GodChatRoomNetwork,
} from '@ai-village/core';

async function main() {
  // 1. Start headless game simulation
  const headlessGame = new HeadlessGameLoop(gameLoop);
  headlessGame.start();

  // 2. Initialize networking
  const networkManager = initializeNetworkManager(multiverseCoordinator);
  await networkManager.startServer(8080);

  // 3. Initialize chat
  const chatNetwork = new GodChatRoomNetwork(
    networkManager.getMyPeerId(),
    'HeadlessServer',
    (peerId, msg) => {
      // Send to specific peer via network manager
      const ws = networkManager.getConnection(peerId);
      if (ws) ws.send(JSON.stringify(msg));
    },
    (roomId, msg) => {
      // Broadcast to all connected peers
      networkManager.broadcast(msg);
    }
  );

  chatNetwork.joinChatRoom('main', 'Main Chat');

  // 4. Optional: HTTP API for admin
  const express = require('express');
  const app = express();

  app.post('/admin/chat/send', (req, res) => {
    chatNetwork.sendChatMessage('main', req.body.message);
    res.json({ success: true });
  });

  app.listen(3000, () => {
    console.log('Admin API on port 3000');
  });

  console.log(`
    Headless server ready!
    - WebSocket server: ws://localhost:8080
    - Admin API: http://localhost:3000
    - Peer ID: ${networkManager.getMyPeerId()}
  `);
}

main().catch(console.error);
```

## Conclusion

**✅ Headless networking is fully supported** for:
- Core networking (WebSocket P2P)
- Chat room communication
- Entity transfer
- Universe streaming
- Remote passages

**❌ Browser-only features**:
- Voice/video (WebRTC)
- UI components (canvas)

The architecture allows headless servers to fully participate in the networked multiverse, serving as authoritative game hosts while browser clients handle UI and voice/video.
