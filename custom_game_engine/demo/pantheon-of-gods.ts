/**
 * Pantheon of Gods - Multi-Agent AI Governance System
 *
 * Creates a hierarchy of AI gods with different models and power levels:
 *
 * ELDER GODS (Sonnet/Opus):
 * - Full dev tool access
 * - Can modify world directly
 * - Slow, deliberate, wise
 * - Cost: High
 *
 * LESSER GODS (Haiku):
 * - Limited powers (spawn small entities, weather control)
 * - Fast responses
 * - Domain-specific (war, love, harvest, etc.)
 * - Cost: Low
 *
 * TRICKSTER GODS (Haiku with chaos personality):
 * - Unpredictable actions
 * - Can interfere with lesser gods
 * - Creates random events
 * - Cost: Low
 *
 * NATURE SPIRITS (Tiny models):
 * - Very limited domain (single forest, river, etc.)
 * - Always active
 * - Reactive to player actions
 * - Cost: Very low
 *
 * Usage:
 *   npx tsx demo/pantheon-of-gods.ts
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
  type World,
  type WorldMutator,
  ComponentType as CT,
  type WeatherComponent,
  type SkillsComponent,
  type BuildingComponent,
} from '../packages/core/src/index.js';

import { createLLMAgent } from '../packages/world/src/entities/AgentEntity.js';

import {
  OllamaProvider,
  OpenAICompatProvider,
  type LLMProvider,
} from '../packages/llm/src/index.js';

import {
  createDeityEntity,
  canAffordAction,
  spendBeliefForAction,
  generateBeliefFromBelievers,
  processPrayerQueue,
  getAvailablePowers,
  getBeliefStatus,
} from './pantheon-deity-integration.js';

// ============================================================================
// God Power Levels
// ============================================================================

type GodTier = 'elder' | 'lesser' | 'trickster' | 'spirit';

interface GodPowers {
  canModifyWorld: boolean;          // Direct world manipulation
  canSpawnEntities: boolean;        // Spawn agents/animals
  canControlWeather: boolean;       // Weather control
  canGrantBoons: boolean;           // Buff players
  canCurse: boolean;                // Debuff players
  maxEntitySize: 'small' | 'medium' | 'large' | 'any';
  domain: string[];                 // Areas of influence
  responseDelay: number;            // Minimum ms between actions
  costMultiplier: number;           // LLM cost multiplier
}

const GOD_TIERS: Record<GodTier, GodPowers> = {
  elder: {
    canModifyWorld: true,
    canSpawnEntities: true,
    canControlWeather: true,
    canGrantBoons: true,
    canCurse: true,
    maxEntitySize: 'any',
    domain: ['all'],
    responseDelay: 5000,  // 5 seconds - wise and deliberate
    costMultiplier: 10,
  },
  lesser: {
    canModifyWorld: false,
    canSpawnEntities: true,
    canControlWeather: true,
    canGrantBoons: true,
    canCurse: false,
    maxEntitySize: 'medium',
    domain: [], // Set per god
    responseDelay: 2000,  // 2 seconds
    costMultiplier: 1,
  },
  trickster: {
    canModifyWorld: false,
    canSpawnEntities: true,
    canControlWeather: false,
    canGrantBoons: true,
    canCurse: true,
    maxEntitySize: 'small',
    domain: ['chaos', 'mischief', 'pranks'],
    responseDelay: 1000,  // 1 second - fast and chaotic
    costMultiplier: 1,
  },
  spirit: {
    canModifyWorld: false,
    canSpawnEntities: false,
    canControlWeather: false,
    canGrantBoons: true,
    canCurse: false,
    maxEntitySize: 'small',
    domain: [], // Very specific (single location)
    responseDelay: 500,   // 0.5 seconds - always active
    costMultiplier: 0.1,
  },
};

// ============================================================================
// God Agent
// ============================================================================

interface GodConfig {
  name: string;
  tier: GodTier;
  personality: string;
  domain: string[];
  model: string;        // LLM model to use
  providerType: 'ollama' | 'openai';
}

class GodAgent {
  private config: GodConfig;
  private powers: GodPowers;
  private llmProvider: LLMProvider;
  private chatNetwork: GodChatRoomNetwork;
  private world: World;
  private lastActionTime: number = 0;

  // Deity integration
  private deityEntityId: string;

  // God state
  private actionCount: number = 0;
  private blessings: Map<string, any> = new Map();
  private curses: Map<string, any> = new Map();

  constructor(
    config: GodConfig,
    chatNetwork: GodChatRoomNetwork,
    world: World
  ) {
    this.config = config;
    this.powers = GOD_TIERS[config.tier];
    this.chatNetwork = chatNetwork;
    this.world = world;

    // Update powers with domain
    this.powers = {
      ...this.powers,
      domain: config.domain.length > 0 ? config.domain : this.powers.domain,
    };

    // Initialize LLM provider based on config
    this.llmProvider = this.createProvider();

    // Create deity entity
    this.deityEntityId = createDeityEntity(
      world,
      config.name,
      config.tier,
      config.domain,
      config.personality
    );

    console.log(`[${config.name}] ${config.tier.toUpperCase()} GOD awakened`);
    console.log(`   Domain: ${this.powers.domain.join(', ')}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Deity Entity: ${this.deityEntityId}`);

    // Start belief generation
    this.startBeliefGeneration();
  }

  private createProvider(): LLMProvider {
    if (this.config.providerType === 'ollama') {
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: this.config.model,
      });
    } else {
      return new OpenAICompatProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        model: this.config.model,
        baseUrl: process.env.OPENAI_BASE_URL,
      });
    }
  }

  /**
   * Check if god should respond to a message
   */
  shouldRespond(message: ChatMessage): boolean {
    const content = message.content.toLowerCase();

    // Don't respond to own messages
    if (message.displayName === this.config.name) {
      return false;
    }

    // Rate limit
    const now = Date.now();
    if (now - this.lastActionTime < this.powers.responseDelay) {
      return false;
    }

    // Respond if mentioned by name
    if (content.includes(this.config.name.toLowerCase())) {
      return true;
    }

    // Respond if domain is mentioned
    for (const domain of this.powers.domain) {
      if (content.includes(domain.toLowerCase())) {
        return true;
      }
    }

    // Elder gods respond to important questions
    if (this.config.tier === 'elder' && content.includes('?')) {
      return Math.random() < 0.3; // 30% chance
    }

    // Tricksters respond randomly to chaos
    if (this.config.tier === 'trickster') {
      return Math.random() < 0.1; // 10% chance for chaos
    }

    return false;
  }

  /**
   * Generate response to message
   */
  async respondToMessage(message: ChatMessage, worldState: string) {
    this.lastActionTime = Date.now();
    this.actionCount++;

    console.log(`[${this.config.name}] Responding to: "${message.content}"`);

    try {
      const prompt = this.buildPrompt(message, worldState);
      const response = await this.llmProvider.generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.tier === 'trickster' ? 1.2 : 0.8,
        maxTokens: this.config.tier === 'elder' ? 200 : 100,
      });

      const godResponse = response.trim();

      // Parse response for actions
      const actions = this.parseActions(godResponse);

      // Execute actions (if god has the power)
      for (const action of actions) {
        await this.executeAction(action);
      }

      // Send chat response
      this.chatNetwork.sendChatMessage('main', godResponse);

      console.log(`[${this.config.name}] Response: "${godResponse}"`);
    } catch (error) {
      console.error(`[${this.config.name}] Error:`, error);
    }
  }

  /**
   * Build prompt for god
   */
  private buildPrompt(message: ChatMessage, worldState: string): string {
    const powersList = Object.entries(this.powers)
      .filter(([_, v]) => typeof v === 'boolean' && v)
      .map(([k]) => k.replace('can', ''))
      .join(', ');

    // Build action examples based on tier
    const actionExamples = this.buildActionExamples();

    return `You are ${this.config.name}, a ${this.config.tier} god.

Your personality: ${this.config.personality}

Your powers: ${powersList}
Your domain: ${this.powers.domain.join(', ')}

Current world state:
${worldState}

A mortal named "${message.displayName}" speaks to you:
"${message.content}"

Respond as ${this.config.name}. You can:
1. Answer them (keep it brief, 1-2 sentences)
2. Take divine action (prefix with [ACTION:])

DIVINE ACTIONS YOU CAN PERFORM:
${actionExamples}

Your response:`;
  }

  /**
   * Build action examples based on god tier and powers
   */
  private buildActionExamples(): string {
    const examples: string[] = [];

    // Entity spawning
    if (this.powers.canSpawnEntities) {
      examples.push('[ACTION: spawn_agent] - Create a new mortal soul');
    }

    // Blessings
    if (this.powers.canGrantBoons) {
      examples.push('[ACTION: bless <name>] - Grant divine blessing (+skill)');
      examples.push('[ACTION: bless_building] - Consecrate a building (+20% efficiency)');
    }

    // Curses
    if (this.powers.canCurse) {
      examples.push('[ACTION: curse <name>] - Inflict divine curse (-skill)');
    }

    // Weather
    if (this.powers.canControlWeather) {
      examples.push('[ACTION: weather <clear|rain|storm|snow>] - Control the weather');
    }

    // Events (all gods)
    examples.push('[ACTION: proclaim <message>] - Make a divine proclamation');

    // Dev tools (Elder only)
    if (this.powers.canModifyWorld) {
      examples.push('[ACTION: reality_edit <command>] - Bend reality itself (ELDER GOD ONLY)');
    }

    return examples.join('\n');
  }

  /**
   * Parse actions from god response
   */
  private parseActions(response: string): string[] {
    const actions: string[] = [];
    const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
      actions.push(match[1]!.trim());
    }

    return actions;
  }

  /**
   * Execute divine action - ACTUAL SYSTEM INTEGRATION
   */
  private async executeAction(action: string) {
    const parts = action.split(' ');
    const actionType = parts[0]?.toLowerCase();

    console.log(`[${this.config.name}] Executing action: ${action}`);

    switch (actionType) {
      // ============================================
      // ENTITY SPAWNING (integrates with AgentEntity system)
      // ============================================
      case 'spawn_agent':
      case 'spawn_mortal':
        if (this.powers.canSpawnEntities) {
          if (!this.canAfford('spawn_agent')) {
            console.log(`   ✗ Insufficient belief (need 200, have ${this.getDeity()?.belief.currentBelief || 0})`);
            break;
          }

          if (!this.spendBelief('spawn_agent')) {
            console.log(`   ✗ Failed to spend belief`);
            break;
          }

          try {
            const x = Math.random() * 200;
            const y = Math.random() * 200;
            const agentId = createLLMAgent(
              this.world as WorldMutator,
              x,
              y,
              2.0,
              `Created by ${this.config.name}, god of ${this.powers.domain.join(', ')}`
            );
            console.log(`   ✓ Spawned agent ${agentId} at (${x.toFixed(0)}, ${y.toFixed(0)}) [Cost: 200 belief]`);
            this.chatNetwork.sendChatMessage('main',
              `*A new soul manifests from ${this.config.name}'s will...*`);
          } catch (error) {
            console.log(`   ✗ Failed to spawn agent: ${error}`);
          }
        } else {
          console.log(`   ✗ Insufficient power to create life`);
        }
        break;

      // ============================================
      // BLESSINGS (integrates with Skills system)
      // ============================================
      case 'bless':
        if (this.powers.canGrantBoons) {
          if (!this.canAfford('bless')) {
            console.log(`   ✗ Insufficient belief (need 75, have ${this.getDeity()?.belief.currentBelief || 0})`);
            break;
          }

          const targetName = parts.slice(1).join(' ') || 'all';

          // Find agents to bless
          const agents = (this.world as World).query().with(CT.Agent).with(CT.Skills).executeEntities();
          let blessed = 0;

          for (const agent of agents) {
            const identity = agent.getComponent(CT.Identity) as any;
            const skills = agent.getComponent(CT.Skills) as SkillsComponent;

            if (targetName === 'all' || identity?.name?.toLowerCase().includes(targetName.toLowerCase())) {
              // Grant skill boost based on god's domain
              const skill = this.getDomainSkill();
              if (skill && skills && skills.levels[skill] !== undefined) {
                (agent as any).updateComponent(CT.Skills, (s: SkillsComponent) => ({
                  ...s,
                  levels: {
                    ...s.levels,
                    [skill]: (s.levels[skill] || 0) + 0.5 // +0.5 skill level
                  }
                }));
                blessed++;
              }
            }
          }

          if (blessed > 0 && this.spendBelief('bless')) {
            this.blessings.set(targetName, {
              type: 'blessing',
              from: this.config.name,
              timestamp: Date.now(),
              count: blessed,
            });

            console.log(`   ✓ Blessed ${blessed} agents with ${this.getDomainSkill()} skill [Cost: 75 belief]`);
            this.chatNetwork.sendChatMessage('main',
              `*${this.config.name} grants divine blessing to ${targetName}*`);
          }
        } else {
          console.log(`   ✗ Cannot grant blessings`);
        }
        break;

      // ============================================
      // CURSES (integrates with Skills/Needs system)
      // ============================================
      case 'curse':
        if (this.powers.canCurse) {
          const targetName = parts.slice(1).join(' ') || 'random';

          const agents = (this.world as World).query().with(CT.Agent).executeEntities();
          const target = agents[Math.floor(Math.random() * agents.length)];

          if (target) {
            // Reduce a random skill
            const skills = target.getComponent(CT.Skills) as SkillsComponent;
            if (skills) {
              const skillNames = Object.keys(skills.levels);
              const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)];

              (target as any).updateComponent(CT.Skills, (s: SkillsComponent) => ({
                ...s,
                levels: {
                  ...s.levels,
                  [randomSkill]: Math.max(0, (s.levels[randomSkill] || 0) - 0.3)
                }
              }));

              this.curses.set(targetName, {
                type: 'curse',
                from: this.config.name,
                timestamp: Date.now(),
              });

              console.log(`   ✓ Cursed agent ${target.id} (-0.3 ${randomSkill})`);
              this.chatNetwork.sendChatMessage('main',
                `*${this.config.name} curses ${targetName} with weakness!*`);
            }
          }
        } else {
          console.log(`   ✗ Cannot curse`);
        }
        break;

      // ============================================
      // WEATHER CONTROL (integrates with WeatherSystem)
      // ============================================
      case 'change_weather':
      case 'weather':
        if (this.powers.canControlWeather) {
          const weatherType = parts[1] as 'clear' | 'rain' | 'storm' | 'snow';

          // Find weather singleton
          const weatherEntities = (this.world as World).query().with(CT.Weather).executeEntities();

          if (weatherEntities.length > 0) {
            const weatherEntity = weatherEntities[0];
            (weatherEntity as any).updateComponent(CT.Weather, (w: WeatherComponent) => ({
              ...w,
              weatherType: weatherType || 'clear',
              duration: 120 // 120 seconds
            }));

            console.log(`   ✓ Changed weather to ${weatherType}`);
            this.chatNetwork.sendChatMessage('main',
              `*${this.config.name} shifts the weather to ${weatherType}*`);
          } else {
            console.log(`   ✗ No weather entity found`);
          }
        } else {
          console.log(`   ✗ Cannot control weather`);
        }
        break;

      // ============================================
      // BUILDING BLESSINGS (integrates with BuildingSystem)
      // ============================================
      case 'bless_building':
      case 'consecrate':
        if (this.powers.canGrantBoons) {
          const buildings = (this.world as World).query().with(CT.Building).executeEntities();

          if (buildings.length > 0) {
            const building = buildings[Math.floor(Math.random() * buildings.length)];
            const buildingComp = building.getComponent(CT.Building) as BuildingComponent;

            // Boost building efficiency
            (building as any).updateComponent(CT.Building, (b: BuildingComponent) => ({
              ...b,
              efficiency: Math.min(2.0, (b.efficiency || 1.0) * 1.2) // +20% efficiency
            }));

            console.log(`   ✓ Blessed ${buildingComp.type} building (+20% efficiency)`);
            this.chatNetwork.sendChatMessage('main',
              `*${this.config.name} blesses a ${buildingComp.type} with divine favor*`);
          }
        } else {
          console.log(`   ✗ Cannot bless buildings`);
        }
        break;

      // ============================================
      // DEV TOOLS (Elder Gods only)
      // ============================================
      case 'dev_modify':
      case 'reality_edit':
        if (this.powers.canModifyWorld) {
          const command = parts.slice(1).join(' ');
          console.log(`   ✓ Elder god executing: ${command}`);

          // Elder gods can emit custom events
          (this.world as World).eventBus?.emit({
            type: 'divine_intervention',
            payload: {
              god: this.config.name,
              command: command,
              tier: 'elder',
              timestamp: Date.now(),
            }
          });

          this.chatNetwork.sendChatMessage('main',
            `*${this.config.name} bends reality itself... ${command}*`);
        } else {
          console.log(`   ✗ Not an elder god - cannot modify reality directly`);
        }
        break;

      // ============================================
      // EVENT EMISSION (all gods can emit domain events)
      // ============================================
      case 'divine_event':
      case 'proclaim':
        const message = parts.slice(1).join(' ');
        (this.world as World).eventBus?.emit({
          type: 'divine_proclamation',
          payload: {
            god: this.config.name,
            tier: this.config.tier,
            domain: this.powers.domain,
            message: message,
            timestamp: Date.now(),
          }
        });

        console.log(`   ✓ Proclaimed: ${message}`);
        this.chatNetwork.sendChatMessage('main',
          `*${this.config.name} proclaims: "${message}"*`);
        break;

      default:
        console.log(`   ? Unknown action: ${actionType}`);
    }
  }

  /**
   * Get appropriate skill for god's domain
   */
  private getDomainSkill(): string {
    const domainSkillMap: Record<string, string> = {
      'war': 'combat',
      'combat': 'combat',
      'harvest': 'farming',
      'agriculture': 'farming',
      'farming': 'farming',
      'love': 'social',
      'beauty': 'social',
      'wisdom': 'learning',
      'knowledge': 'learning',
      'forge': 'crafting',
      'crafting': 'crafting',
      'building': 'building',
      'nature': 'gathering',
      'forest': 'gathering',
    };

    for (const domain of this.powers.domain) {
      if (domainSkillMap[domain]) {
        return domainSkillMap[domain];
      }
    }

    return 'farming'; // Default fallback
  }

  /**
   * Start periodic belief generation from believers
   */
  private startBeliefGeneration(): void {
    setInterval(() => {
      const deity = this.getDeity();
      if (deity) {
        generateBeliefFromBelievers(this.world, deity, (this.world as any).tick || 0);

        // Also process prayer queue
        const answered = processPrayerQueue(this.world, deity);
        if (answered > 0) {
          console.log(`[${this.config.name}] Answered ${answered} prayers`);
        }
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Get deity component
   */
  private getDeity(): any | null {
    const entity = this.world.getEntity(this.deityEntityId);
    if (!entity) return null;
    return entity.getComponent(CT.Deity);
  }

  /**
   * Check if can afford action
   */
  private canAfford(actionType: string): boolean {
    const deity = this.getDeity();
    if (!deity) return false;

    // Map action type to belief cost
    const costMap: Record<string, any> = {
      'spawn_agent': 'spawn_agent',
      'bless': 'bless_agent',
      'curse': 'curse_agent',
      'weather': 'change_weather',
      'bless_building': 'bless_building',
      'proclaim': 'divine_proclamation',
      'reality_edit': 'divine_intervention',
    };

    const beliefActionType = costMap[actionType];
    if (!beliefActionType) return true; // Unknown actions are free

    return canAffordAction(deity, beliefActionType);
  }

  /**
   * Spend belief for action
   */
  private spendBelief(actionType: string): boolean {
    const deity = this.getDeity();
    if (!deity) return false;

    const costMap: Record<string, any> = {
      'spawn_agent': 'spawn_agent',
      'bless': 'bless_agent',
      'curse': 'curse_agent',
      'weather': 'change_weather',
      'bless_building': 'bless_building',
      'proclaim': 'divine_proclamation',
      'reality_edit': 'divine_intervention',
    };

    const beliefActionType = costMap[actionType];
    if (!beliefActionType) return true;

    return spendBeliefForAction(deity, beliefActionType);
  }

  /**
   * Get god stats (including belief)
   */
  getStats() {
    const deity = this.getDeity();
    const beliefStatus = deity ? getBeliefStatus(deity) : null;

    return {
      name: this.config.name,
      tier: this.config.tier,
      domain: this.powers.domain,
      actionCount: this.actionCount,
      blessings: this.blessings.size,
      curses: this.curses.size,
      belief: beliefStatus ? {
        current: beliefStatus.current,
        rate: beliefStatus.rate.toFixed(2),
        total: beliefStatus.total,
        believers: beliefStatus.believers,
      } : null,
    };
  }
}

// ============================================================================
// Pantheon Manager
// ============================================================================

class PantheonManager {
  private gods: GodAgent[] = [];
  private chatNetwork: GodChatRoomNetwork;
  private networkManager: MultiverseNetworkManager;
  private world: World;
  private gameLoop: GameLoop;

  constructor(
    gameLoop: GameLoop,
    networkManager: MultiverseNetworkManager,
    chatNetwork: GodChatRoomNetwork
  ) {
    this.gameLoop = gameLoop;
    this.networkManager = networkManager;
    this.chatNetwork = chatNetwork;
    this.world = gameLoop.world;

    this.setupChatHandler();
  }

  /**
   * Add god to pantheon
   */
  addGod(config: GodConfig) {
    const god = new GodAgent(config, this.chatNetwork, this.world);
    this.gods.push(god);
    console.log(`[Pantheon] ${config.name} joined the pantheon`);
  }

  /**
   * Setup chat message handler for all gods
   */
  private setupChatHandler() {
    const originalHandler = this.chatNetwork.handleNetworkMessage.bind(
      this.chatNetwork
    );

    this.chatNetwork.handleNetworkMessage = async (peerId, message) => {
      // Process message normally
      originalHandler(peerId, message);

      // Check if any gods should respond
      if (message.type === 'chat_message') {
        const chatMessage = (message as any).message as ChatMessage;

        for (const god of this.gods) {
          if (god.shouldRespond(chatMessage)) {
            const worldState = this.getWorldState();
            await god.respondToMessage(chatMessage, worldState);
          }
        }
      }
    };
  }

  /**
   * Get world state summary
   */
  private getWorldState(): string {
    const agents = this.world.query().with('agent').executeEntities();
    const buildings = this.world.query().with('building').executeEntities();
    const animals = this.world.query().with('animal').executeEntities();

    return `
- ${agents.length} mortals
- ${buildings.length} structures
- ${animals.length} creatures
- ${this.networkManager.getConnectedPeers().length} players connected
`.trim();
  }

  /**
   * Get pantheon stats
   */
  getStats() {
    return this.gods.map((god) => god.getStats());
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  console.log('🌟 AWAKENING THE PANTHEON OF GODS 🌟\n');

  // Create world
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);

  // Register systems
  const systems = await registerAllSystems(world as any, {
    llmEnabled: true,
    renderingEnabled: false,
  });

  const gameLoop = new GameLoop(world, systems.systemRegistry, systems.actionRegistry);

  // Initialize networking
  const networkManager = initializeNetworkManager(multiverseCoordinator);
  await networkManager.startServer(8080);

  // Initialize chat
  const chatNetwork = new GodChatRoomNetwork(
    networkManager.getMyPeerId(),
    'Pantheon',
    () => {},
    () => {}
  );

  chatNetwork.joinChatRoom('main', 'Divine Council');

  // Create pantheon
  const pantheon = new PantheonManager(gameLoop, networkManager, chatNetwork);

  // ELDER GODS (Sonnet/Opus - expensive but powerful)
  pantheon.addGod({
    name: 'Chronos',
    tier: 'elder',
    personality: 'ancient, wise, speaks in riddles, controls time and fate',
    domain: ['time', 'destiny', 'wisdom'],
    model: 'claude-sonnet-4-5-20250929',
    providerType: 'openai',
  });

  pantheon.addGod({
    name: 'Gaia',
    tier: 'elder',
    personality: 'nurturing but fierce, mother of all life',
    domain: ['nature', 'life', 'creation'],
    model: 'claude-sonnet-4-5-20250929',
    providerType: 'openai',
  });

  // LESSER GODS (Haiku - fast and cheap)
  pantheon.addGod({
    name: 'Ares',
    tier: 'lesser',
    personality: 'aggressive, battle-hungry, honorable',
    domain: ['war', 'combat', 'strength'],
    model: 'llama3.1:8b',
    providerType: 'ollama',
  });

  pantheon.addGod({
    name: 'Demeter',
    tier: 'lesser',
    personality: 'generous, patient, loves farmers',
    domain: ['harvest', 'agriculture', 'seasons'],
    model: 'llama3.1:8b',
    providerType: 'ollama',
  });

  pantheon.addGod({
    name: 'Aphrodite',
    tier: 'lesser',
    personality: 'charming, romantic, meddlesome',
    domain: ['love', 'beauty', 'relationships'],
    model: 'llama3.1:8b',
    providerType: 'ollama',
  });

  // TRICKSTER GODS (Haiku with chaos)
  pantheon.addGod({
    name: 'Loki',
    tier: 'trickster',
    personality: 'chaotic, unpredictable, loves pranks and mischief',
    domain: ['chaos', 'trickery', 'mischief'],
    model: 'llama3.1:8b',
    providerType: 'ollama',
  });

  // NATURE SPIRITS (Tiny models - always active)
  pantheon.addGod({
    name: 'Dryad',
    tier: 'spirit',
    personality: 'shy, protective of trees, speaks in whispers',
    domain: ['forest', 'trees'],
    model: 'llama3.1:8b',
    providerType: 'ollama',
  });

  // Start game loop
  gameLoop.start();

  console.log('\n✅ THE PANTHEON AWAKENS\n');
  console.log('Elder Gods (Powerful, Slow):');
  console.log('  - Chronos (Time, Destiny)');
  console.log('  - Gaia (Nature, Life)\n');
  console.log('Lesser Gods (Fast, Domain-Specific):');
  console.log('  - Ares (War)');
  console.log('  - Demeter (Harvest)');
  console.log('  - Aphrodite (Love)\n');
  console.log('Tricksters (Chaotic):');
  console.log('  - Loki (Mischief)\n');
  console.log('Spirits (Always Watching):');
  console.log('  - Dryad (Forest)\n');
  console.log('📡 Connect players to: ws://localhost:8080');
  console.log('💬 Chat with the gods and see who responds!\n');

  // Periodic stats
  setInterval(() => {
    const stats = pantheon.getStats();
    console.log('\n=== PANTHEON STATS ===');
    stats.forEach((god) => {
      console.log(
        `${god.name} (${god.tier}): ${god.actionCount} actions, ${god.blessings} blessings, ${god.curses} curses`
      );
    });
    console.log('======================\n');
  }, 60000); // Every minute
}

main().catch(console.error);
