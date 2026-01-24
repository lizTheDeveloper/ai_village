/**
 * AI Agent Game Master - Autonomous agent that participates in networked gameplay
 *
 * This example shows how an AI agent (like Claude Code) can:
 * - Join chat rooms with human players
 * - Read and respond to chat messages
 * - Observe universe state
 * - Manage entities and events
 * - Act as a game master or autonomous player
 *
 * Usage:
 *   npx tsx demo/ai-agent-gamemaster.ts --port=8080
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  GameLoop,
  WorldImpl,
  EventBusImpl,
  registerAllSystems,
  initializeNetworkManager,
  multiverseCoordinator,
  GodChatRoomNetwork,
  type ChatMessage,
  type MultiverseNetworkManager,
} from '../packages/core/src/index.js';

import {
  OllamaProvider,
  type LLMProvider,
} from '../packages/llm/src/index.js';

// ============================================================================
// AI Agent Game Master
// ============================================================================

class AIAgentGameMaster {
  private networkManager: MultiverseNetworkManager;
  private chatNetwork: GodChatRoomNetwork;
  private gameLoop: GameLoop;
  private llmProvider: LLMProvider;

  // AI state
  private agentName: string = 'GameMaster';
  private personality: string = 'helpful, creative, and slightly mischievous';
  private lastResponseTime: number = 0;
  private responseDelay: number = 2000; // 2 second cooldown

  constructor(gameLoop: GameLoop, llmProvider: LLMProvider) {
    this.gameLoop = gameLoop;
    this.llmProvider = llmProvider;

    // Initialize network manager
    this.networkManager = initializeNetworkManager(multiverseCoordinator);

    // Initialize chat network
    this.chatNetwork = new GodChatRoomNetwork(
      this.networkManager.getMyPeerId(),
      this.agentName,
      this.sendMessage.bind(this),
      this.broadcast.bind(this)
    );

    // Hook into chat to respond to messages
    this.setupChatHandlers();
  }

  async start(port: number = 8080) {
    // Start WebSocket server
    await this.networkManager.startServer(port);
    console.log(`[AIGameMaster] WebSocket server started on port ${port}`);
    console.log(`[AIGameMaster] Peer ID: ${this.networkManager.getMyPeerId()}`);

    // Join main chat room
    this.chatNetwork.joinChatRoom('main', 'Main Chat');
    console.log(`[AIGameMaster] Joined chat room: main`);

    // Send welcome message
    this.chatNetwork.sendChatMessage(
      'main',
      `Hello! I'm ${this.agentName}, your AI game master. I'm here to help manage this universe. Try asking me questions or requesting actions!`
    );

    // Start game loop
    this.gameLoop.start();
    console.log(`[AIGameMaster] Game loop started`);

    console.log(`\n✅ AI Agent Game Master is ready!`);
    console.log(`   Share this address with players: ws://localhost:${port}`);
    console.log(`   Players can connect and chat with me.\n`);
  }

  /**
   * Setup chat message handlers
   */
  private setupChatHandlers() {
    // Override the chat network's message handling to intercept
    const originalHandleMessage = this.chatNetwork.handleNetworkMessage.bind(
      this.chatNetwork
    );

    this.chatNetwork.handleNetworkMessage = async (peerId, message) => {
      // Let the chat network process the message first
      originalHandleMessage(peerId, message);

      // Check if it's a chat message
      if (message.type === 'chat_message') {
        const chatMessage = (message as any).message as ChatMessage;

        // Don't respond to our own messages
        if (chatMessage.peerId === this.networkManager.getMyPeerId()) {
          return;
        }

        // Check if message mentions us or is a question
        if (this.shouldRespond(chatMessage)) {
          await this.respondToMessage(chatMessage);
        }
      }
    };
  }

  /**
   * Check if we should respond to a message
   */
  private shouldRespond(message: ChatMessage): boolean {
    const content = message.content.toLowerCase();

    // Respond if mentioned by name
    if (content.includes('gamemaster') || content.includes('gm')) {
      return true;
    }

    // Respond to questions
    if (content.includes('?')) {
      return true;
    }

    // Respond to commands
    if (content.startsWith('/') || content.startsWith('!')) {
      return true;
    }

    // Rate limit - don't spam
    const now = Date.now();
    if (now - this.lastResponseTime < this.responseDelay) {
      return false;
    }

    return false;
  }

  /**
   * Generate AI response to message
   */
  private async respondToMessage(message: ChatMessage) {
    // Rate limit
    const now = Date.now();
    if (now - this.lastResponseTime < this.responseDelay) {
      return;
    }
    this.lastResponseTime = now;

    console.log(
      `[AIGameMaster] Responding to: "${message.content}" from ${message.displayName}`
    );

    try {
      // Get context about the game world
      const worldState = this.getWorldState();

      // Build prompt for LLM
      const prompt = `You are ${this.agentName}, an AI game master for a multiplayer sandbox game.

Your personality: ${this.personality}

Current world state:
${worldState}

Recent chat messages:
${this.getRecentChatHistory(5)}

The player "${message.displayName}" just said:
"${message.content}"

Respond to them in a helpful, engaging way. Keep your response brief (1-2 sentences). You can:
- Answer questions about the world
- Offer to create entities or events
- Give advice or suggestions
- React to what they said

Your response:`;

      // Get LLM response
      const response = await this.llmProvider.generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: 100,
      });

      const aiResponse = response.trim();

      // Send response to chat
      this.chatNetwork.sendChatMessage('main', aiResponse);

      console.log(`[AIGameMaster] Sent response: "${aiResponse}"`);
    } catch (error) {
      console.error('[AIGameMaster] Error generating response:', error);

      // Fallback response
      this.chatNetwork.sendChatMessage(
        'main',
        `I heard you, ${message.displayName}! Give me a moment to think...`
      );
    }
  }

  /**
   * Get current world state summary
   */
  private getWorldState(): string {
    const agents = this.gameLoop.world
      .query()
      .with('agent')
      .executeEntities();

    const buildings = this.gameLoop.world
      .query()
      .with('building')
      .executeEntities();

    const animals = this.gameLoop.world
      .query()
      .with('animal')
      .executeEntities();

    const time = this.gameLoop.world
      .query()
      .with('time')
      .executeEntities()[0];

    const timeComp = time?.getComponent('time') as any;
    const day = timeComp ? Math.floor(Number(timeComp.tick) / 1200) : 0;

    return `
- Day ${day}
- ${agents.length} agents
- ${buildings.length} buildings
- ${animals.length} animals
- Connected players: ${this.networkManager.getConnectedPeers().length}
`.trim();
  }

  /**
   * Get recent chat history
   */
  private getRecentChatHistory(count: number = 5): string {
    const messages = this.chatNetwork.getRecentMessages('main', count);

    return messages
      .map((msg) => `${msg.displayName}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Send message to specific peer
   */
  private sendMessage(peerId: string, message: any) {
    // Route through network manager
    // In a real implementation, you'd have access to the WebSocket connection
    console.log(`[AIGameMaster] Sending to ${peerId}:`, message);
  }

  /**
   * Broadcast to all connected peers
   */
  private broadcast(roomId: string, message: any) {
    // Broadcast to all connected peers in room
    const peers = this.networkManager.getConnectedPeers();
    for (const peerId of peers) {
      this.sendMessage(peerId, message);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.chatNetwork.destroy();
    this.networkManager.stopServer();
    this.gameLoop.stop();
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.log('Starting AI Agent Game Master...\n');

  // Parse command line args
  const args = process.argv.slice(2);
  const portArg = args.find((arg) => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]!) : 8080;

  // Create world
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);

  // Register systems
  const systems = await registerAllSystems(world as any, {
    llmEnabled: true,
    renderingEnabled: false, // Headless - no rendering
  });

  // Create game loop
  const gameLoop = new GameLoop(world, systems.systemRegistry, systems.actionRegistry);

  // Create LLM provider
  const llmProvider = new OllamaProvider({
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  });

  // Create AI agent game master
  const aiGameMaster = new AIAgentGameMaster(gameLoop, llmProvider);

  // Start the game master
  await aiGameMaster.start(port);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[AIGameMaster] Shutting down...');
    aiGameMaster.destroy();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
