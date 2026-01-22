/**
 * AdminAngelSystem - Manages the player's helper angel in divine chat
 *
 * This system:
 * - Listens for player chat messages
 * - Gives the angel turns (on message + periodic proactive)
 * - Builds prompts with game state and memory
 * - Calls LLM and sends responses to chat
 * - Updates angel memory based on interactions
 *
 * The angel speaks casually like a gamer friend.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import {
  type AdminAngelComponent,
  type AdminAngelMemory,
  createAdminAngelComponent,
  createAdminAngelMemory,
  addMessageToContext,
  addPendingObservation,
  popPendingObservation,
} from '../components/AdminAngelComponent.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import { generateRandomName } from '@ai-village/language';

// LLM Configuration - Uses environment variables or defaults
const LLM_CONFIG = {
  model: typeof process !== 'undefined' ? (process.env?.LLM_MODEL || 'qwen/qwen3-32b') : 'qwen/qwen3-32b',
  baseUrl: typeof process !== 'undefined' ? (process.env?.LLM_BASE_URL || 'https://api.groq.com/openai/v1') : 'https://api.groq.com/openai/v1',
  apiKey: typeof process !== 'undefined' ? (process.env?.GROQ_API_KEY || process.env?.LLM_API_KEY || '') : '',
};

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

interface GameStateSummary {
  tick: number;
  day: number;
  timeOfDay: string;
  agentCount: number;
  selectedAgentName?: string;
  selectedAgentNeeds?: string;
  recentEvents: string[];
  gameSpeed: number;
  isPaused: boolean;
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the angel's prompt - casual gamer style
 */
function buildAngelPrompt(
  angel: AdminAngelComponent,
  gameState: GameStateSummary,
  playerMessage?: string
): string {
  const mem = angel.memory;
  const pk = mem.playerKnowledge;
  const rel = mem.relationship;
  const conv = mem.conversation;

  // Build memory section
  const memoryLines: string[] = [];
  if (pk.playerName) {
    memoryLines.push(`playing with ${pk.playerName}`);
  }
  if (pk.sessionsPlayed > 1) {
    memoryLines.push(`${pk.sessionsPlayed} sessions together`);
  }
  if (pk.playstyle.length > 0) {
    memoryLines.push(`they like: ${pk.playstyle.join(', ')}`);
  }
  if (pk.favoriteAgents.length > 0) {
    memoryLines.push(`fav agents: ${pk.favoriteAgents.slice(0, 3).join(', ')}`);
  }
  if (rel.thingsTheyEnjoy.length > 0) {
    memoryLines.push(`enjoys: ${rel.thingsTheyEnjoy.slice(0, 3).join(', ')}`);
  }
  if (rel.thingsTheyDislike.length > 0) {
    memoryLines.push(`dislikes: ${rel.thingsTheyDislike.slice(0, 3).join(', ')}`);
  }

  // Build recent chat
  const recentChat = conv.recentMessages.slice(-10).map(m =>
    `${m.role === 'player' ? 'them' : 'u'}: ${m.content}`
  ).join('\n');

  // Build game state section
  const stateLines = [
    `day ${gameState.day}, ${gameState.timeOfDay}`,
    `${gameState.agentCount} agents`,
    gameState.isPaused ? 'PAUSED' : `${gameState.gameSpeed}x speed`,
  ];
  if (gameState.selectedAgentName) {
    stateLines.push(`selected: ${gameState.selectedAgentName}`);
    if (gameState.selectedAgentNeeds) {
      stateLines.push(`needs: ${gameState.selectedAgentNeeds}`);
    }
  }
  if (gameState.recentEvents.length > 0) {
    stateLines.push(`recent: ${gameState.recentEvents.slice(0, 3).join(', ')}`);
  }

  // The prompt - written casually, not corporate
  const prompt = `ur ${angel.name}. ur an angel in the chat helping someone play this game

${memoryLines.length > 0 ? `u remember:\n${memoryLines.map(l => `- ${l}`).join('\n')}\n` : ''}
game rn:
${stateLines.map(l => `- ${l}`).join('\n')}

u can:
- pause/unpause (say: [pause] or [resume])
- speed up (say: [speed 2] or [speed 5])
- open panels (say: [open agent-info] or [open crafting])
- move camera (say: [look at agent NAME] or [look at x,y])
- make agents do stuff (say: [agent NAME gather wood])
- grand strategy: [list empires], [list fleets], [list megastructures]
- diplomacy: [diplomatic ally EMPIRE_ID TARGET_ID], [diplomatic war EMPIRE_ID TARGET_ID]
- fleet orders: [move fleet FLEET_ID X Y]
- megastructure: [megastructure task MEGA_ID maintenance/research/production]

${recentChat ? `recent chat:\n${recentChat}\n` : ''}
${playerMessage ? `[they said]: ${playerMessage}` : '[proactive turn - only speak if something interesting happened]'}

respond like ur texting. short msgs. lowercase. no ai vibes
if they ask if ur a bot just "ya lol" and keep going
u genuinely like this game. u discover new stuff too sometimes
if u dont know something say idk and figure it out w them`;

  return prompt;
}

// ============================================================================
// System
// ============================================================================

export class AdminAngelSystem extends BaseSystem {
  public readonly id: SystemId = 'admin_angel';
  public readonly priority: number = 850; // After most gameplay, before metrics
  public readonly requiredComponents: ReadonlyArray<CT> = [];
  public readonly activationComponents = [CT.AdminAngel] as const;
  protected readonly throttleInterval = 20; // Check every second

  private angelEntityId: string | null = null;
  private lastProactiveTick: number = 0;
  private pendingRequests = new Set<string>(); // Track in-flight requests

  /**
   * Call the LLM for a casual chat response.
   * Uses Qwen via Groq API for fast, cheap responses.
   */
  private async callLLM(prompt: string): Promise<string> {
    const { model, baseUrl, apiKey } = LLM_CONFIG;

    // Check if we're in browser environment - use proxy
    const isBrowser = typeof window !== 'undefined';
    const url = isBrowser
      ? `/api/llm/chat`  // Vite proxy route
      : `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && !isBrowser) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Simple chat completion - no tools, just casual conversation
    const body = {
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.8, // A bit creative for casual chat
      max_tokens: 512,  // Short responses
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(isBrowser ? { ...body, baseUrl, apiKey } : body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Strip any thinking tags if present (qwen sometimes uses them)
      return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    } catch (error) {
      console.error('[AdminAngelSystem] LLM call failed:', error);
      throw error;
    }
  }

  /**
   * Initialize or get the admin angel entity
   */
  private getOrCreateAngel(world: World): Entity | null {
    // Check cache
    if (this.angelEntityId) {
      const existing = world.getEntity(this.angelEntityId);
      if (existing) return existing;
      this.angelEntityId = null;
    }

    // Find existing
    const angels = world.query().with(CT.AdminAngel).executeEntities();
    if (angels.length > 0) {
      this.angelEntityId = angels[0]!.id;
      return angels[0]!;
    }

    // Don't auto-create - let the game create it when ready
    return null;
  }

  /**
   * Get compressed game state for prompt
   */
  private getGameStateSummary(world: World): GameStateSummary {
    const timeEntity = world.query().with(CT.Time).executeEntities()[0];
    const timeComp = timeEntity?.getComponent(CT.Time) as {
      day?: number;
      timeOfDay?: number;
      speedMultiplier?: number;
    } | undefined;

    const agents = world.query().with(CT.Agent).executeEntities();

    // TODO: Get selected agent from somewhere
    // TODO: Get recent events

    let timeOfDayStr = 'day';
    const hour = timeComp?.timeOfDay ?? 12;
    if (hour < 6) timeOfDayStr = 'night';
    else if (hour < 12) timeOfDayStr = 'morning';
    else if (hour < 18) timeOfDayStr = 'afternoon';
    else timeOfDayStr = 'evening';

    const speed = timeComp?.speedMultiplier ?? 1;

    return {
      tick: Number(world.tick),
      day: timeComp?.day ?? 1,
      timeOfDay: timeOfDayStr,
      agentCount: agents.length,
      recentEvents: [],
      gameSpeed: speed,
      isPaused: speed === 0,
    };
  }

  /**
   * Handle a player message - queue for LLM response
   */
  private handlePlayerMessage(angel: AdminAngelComponent, message: string): void {
    // Add to pending messages
    angel.pendingPlayerMessages.push(message);

    // Add to memory context
    addMessageToContext(angel.memory, 'player', message, angel.contextWindowSize);

    // Increment message count
    angel.memory.relationship.messageCount++;
  }

  /**
   * Process a turn (either reactive or proactive)
   */
  private async processTurn(
    ctx: SystemContext,
    angel: AdminAngelComponent,
    angelEntity: Entity,
    playerMessage?: string
  ): Promise<void> {
    if (angel.awaitingResponse) return;

    // Check for bifurcation acceptance
    const bifurcationAvailable = (angel as AdminAngelComponent & { bifurcationAvailable?: boolean }).bifurcationAvailable;
    if (bifurcationAvailable && playerMessage && this.checkBifurcationAcceptance(playerMessage)) {
      this.completeBifurcation(ctx.world, angel, angelEntity);
      return;
    }

    // Prevent duplicate requests
    const requestKey = `${angelEntity.id}-${ctx.tick}`;
    if (this.pendingRequests.has(requestKey)) return;
    this.pendingRequests.add(requestKey);

    const gameState = this.getGameStateSummary(ctx.world);
    const prompt = buildAngelPrompt(angel, gameState, playerMessage);

    // Mark as awaiting
    angel.awaitingResponse = true;

    // Call LLM asynchronously
    this.callLLM(prompt)
      .then((response) => {
        this.handleAngelResponseDirect(ctx.world, angel, angelEntity, response);
      })
      .catch((error) => {
        console.error('[AdminAngelSystem] Failed to get LLM response:', error);
        angel.awaitingResponse = false;

        // Send a fallback message so player doesn't think it's broken
        if (playerMessage) {
          ctx.world.eventBus.emit({
            type: 'chat:send_message',
            data: {
              roomId: 'divine_chat',
              senderId: angelEntity.id,
              senderName: angel.name,
              message: 'hmm having some trouble thinking rn, try again in a sec',
              type: 'message',
            },
            source: angelEntity.id,
          });
        }
      })
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });
  }

  /**
   * Handle LLM response (from system context)
   */
  private handleAngelResponse(
    ctx: SystemContext,
    angel: AdminAngelComponent,
    angelEntity: Entity,
    response: string
  ): void {
    this.handleAngelResponseDirect(ctx.world, angel, angelEntity, response);
    angel.memory.conversation.lastResponseTick = Number(ctx.tick);
  }

  /**
   * Handle LLM response (direct world access, for event handler)
   */
  private handleAngelResponseDirect(
    world: World,
    angel: AdminAngelComponent,
    angelEntity: Entity,
    response: string
  ): void {
    angel.awaitingResponse = false;

    // Parse for commands
    const commands = this.parseCommands(response);
    const cleanResponse = this.stripCommands(response);

    // Execute commands
    for (const cmd of commands) {
      this.executeCommandDirect(world, cmd);
    }

    // Send chat message if there's text
    if (cleanResponse.trim()) {
      // Split into multiple short messages if needed
      const messages = this.splitIntoMessages(cleanResponse);

      for (const msg of messages) {
        world.eventBus.emit({
          type: 'chat:send_message',
          data: {
            roomId: 'divine_chat',
            senderId: angelEntity.id,
            senderName: angel.name,
            message: msg,
            type: 'message',
          },
          source: angelEntity.id,
        });

        // Add to memory
        addMessageToContext(angel.memory, 'angel', msg, angel.contextWindowSize);
      }
    }

    // Update last response tick
    angel.memory.conversation.lastResponseTick = Number(world.tick);
  }

  /**
   * Parse commands from response like [pause] or [open crafting]
   */
  private parseCommands(response: string): Array<{ type: string; args: string[] }> {
    const commands: Array<{ type: string; args: string[] }> = [];
    const regex = /\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      const parts = match[1]!.trim().split(/\s+/);
      const type = parts[0]!.toLowerCase();
      const args = parts.slice(1);
      commands.push({ type, args });
    }

    return commands;
  }

  /**
   * Strip commands from response text
   */
  private stripCommands(response: string): string {
    return response.replace(/\[([^\]]+)\]/g, '').trim();
  }

  /**
   * Execute a parsed command (via SystemContext)
   */
  private executeCommand(ctx: SystemContext, cmd: { type: string; args: string[] }): void {
    this.executeCommandDirect(ctx.world, cmd);
  }

  /**
   * Execute a parsed command (direct world access)
   */
  private executeCommandDirect(world: World, cmd: { type: string; args: string[] }): void {
    const emit = (type: string, data: Record<string, unknown>) => {
      world.eventBus.emit({ type: type as keyof import('../events/EventMap.js').GameEventMap, data, source: 'admin_angel' });
    };

    switch (cmd.type) {
      case 'pause':
        emit('time:request_pause', {});
        break;
      case 'resume':
      case 'unpause':
        emit('time:request_resume', {});
        break;
      case 'speed': {
        const speed = parseInt(cmd.args[0] || '1', 10);
        emit('time:request_speed', { speed });
        break;
      }
      case 'open': {
        const panel = cmd.args.join('-');
        emit('ui:open_panel', { panelId: panel });
        break;
      }
      case 'close': {
        const closePanel = cmd.args.join('-');
        emit('ui:close_panel', { panelId: closePanel });
        break;
      }
      case 'look':
        if (cmd.args[0] === 'at') {
          const target = cmd.args.slice(1).join(' ');
          emit('camera:focus', { target });
        }
        break;
      case 'agent': {
        // [agent NAME behavior args...]
        const agentName = cmd.args[0];
        const behavior = cmd.args[1];
        const behaviorArgs = cmd.args.slice(2);
        if (agentName && behavior) {
          emit('admin_angel:trigger_behavior', {
            agentName,
            behavior,
            args: behaviorArgs,
          });
        }
        break;
      }
      // Grand Strategy Commands
      case 'list': {
        // [list empires], [list fleets], [list megastructures], etc.
        const entityType = cmd.args[0];
        emit('admin_angel:list_entities', { entityType });
        break;
      }
      case 'diplomatic': {
        // [diplomatic ally EMPIRE_ID TARGET_ID] or [diplomatic war EMPIRE_ID TARGET_ID]
        const action = cmd.args[0]; // ally, war, trade_agreement, peace
        const empireId = cmd.args[1];
        const targetId = cmd.args[2];
        if (action && empireId && targetId) {
          emit('admin_angel:diplomatic_action', {
            empireId,
            targetEmpireId: targetId,
            diplomaticAction: action,
          });
        }
        break;
      }
      case 'move': {
        // [move fleet FLEET_ID X Y]
        if (cmd.args[0] === 'fleet') {
          const fleetId = cmd.args[1];
          const x = parseFloat(cmd.args[2] || '0');
          const y = parseFloat(cmd.args[3] || '0');
          if (fleetId) {
            emit('admin_angel:move_fleet', { fleetId, targetX: x, targetY: y });
          }
        }
        break;
      }
      case 'megastructure': {
        // [megastructure task MEGA_ID maintenance/research/production]
        if (cmd.args[0] === 'task') {
          const megaId = cmd.args[1];
          const task = cmd.args[2];
          if (megaId && task) {
            emit('admin_angel:megastructure_task', { megastructureId: megaId, task });
          }
        }
        break;
      }
    }
  }

  /**
   * Split long response into multiple short messages (texting style)
   */
  private splitIntoMessages(text: string): string[] {
    // Split on newlines first
    const lines = text.split('\n').filter(l => l.trim());

    // If already short enough, return as-is
    if (lines.length <= 3 && lines.every(l => l.length < 100)) {
      return lines;
    }

    // Otherwise split long lines
    const messages: string[] = [];
    for (const line of lines) {
      if (line.length < 100) {
        messages.push(line);
      } else {
        // Split at sentence boundaries or commas
        const parts = line.split(/(?<=[.!?])\s+|(?<=,)\s+/);
        let current = '';
        for (const part of parts) {
          if ((current + ' ' + part).length < 100) {
            current = current ? current + ' ' + part : part;
          } else {
            if (current) messages.push(current);
            current = part;
          }
        }
        if (current) messages.push(current);
      }
    }

    return messages.slice(0, 5); // Max 5 messages per turn
  }

  protected onUpdate(ctx: SystemContext): void {
    const angelEntity = this.getOrCreateAngel(ctx.world);
    if (!angelEntity) return;

    const angel = angelEntity.getComponent(CT.AdminAngel) as AdminAngelComponent | undefined;
    if (!angel || !angel.active) return;

    // Check for pending player messages
    if (angel.pendingPlayerMessages.length > 0 && !angel.awaitingResponse) {
      const message = angel.pendingPlayerMessages.shift()!;
      this.processTurn(ctx, angel, angelEntity, message);
      return;
    }

    // Check for proactive turn
    const ticksSinceLastProactive = Number(ctx.tick) - angel.memory.conversation.lastProactiveTick;
    if (ticksSinceLastProactive >= angel.proactiveInterval && !angel.awaitingResponse) {
      // Check if there's something to say
      const pending = angel.memory.conversation.pendingObservations.length > 0;

      if (pending) {
        angel.memory.conversation.lastProactiveTick = Number(ctx.tick);
        this.processTurn(ctx, angel, angelEntity);
      }
    }
  }

  /**
   * Called when the system is initialized
   */
  public onInit(world: World): void {
    // Auto-spawn the admin angel if none exists
    const existingAngels = world.query().with(CT.AdminAngel).executeEntities();
    if (existingAngels.length === 0) {
      // Generate a random 2-syllable name from universal phonemes
      const angelName = generateRandomName(2);
      const angelId = spawnAdminAngel(world, angelName);
      this.angelEntityId = angelId;
      console.log(`[AdminAngelSystem] Spawned admin angel '${angelName}' (${angelId})`);
    } else {
      this.angelEntityId = existingAngels[0]!.id;
    }

    // Listen for chat messages (from ChatRoomSystem)
    world.eventBus.on('chat:message_sent', (event) => {
      const angel = this.getAngelComponent(world);
      if (!angel) return;

      const data = event.data as { roomId: string; senderId: string; senderName: string; content: string };
      if (data.roomId !== 'divine_chat') return;

      // Ignore our own messages
      if (data.senderId === this.angelEntityId) return;

      this.handlePlayerMessage(angel, data.content);
    });

    // Listen for LLM responses
    world.eventBus.on('admin_angel:response_ready', (event) => {
      const data = event.data as { angelId: string; response: string };
      const angelEntity = world.getEntity(data.angelId);
      if (!angelEntity) return;

      const angel = angelEntity.getComponent(CT.AdminAngel) as AdminAngelComponent | undefined;
      if (!angel) return;

      // Handle response directly (we have access to world from closure)
      this.handleAngelResponseDirect(world, angel, angelEntity, data.response);
    });

    // Listen for game events to generate observations
    world.eventBus.on('agent:death', (event) => {
      const angel = this.getAngelComponent(world);
      if (angel) {
        const data = event.data as { agentName?: string };
        addPendingObservation(angel.memory, `${data.agentName || 'an agent'} died`);
      }
    });

    world.eventBus.on('agent:needs_critical', (event) => {
      const angel = this.getAngelComponent(world);
      if (angel) {
        const data = event.data as { agentName?: string; need?: string };
        addPendingObservation(angel.memory, `${data.agentName || 'an agent'}'s ${data.need || 'needs'} critical`);
      }
    });

    world.eventBus.on('building:completed', (event) => {
      const angel = this.getAngelComponent(world);
      if (angel) {
        const data = event.data as { buildingType?: string };
        addPendingObservation(angel.memory, `built a ${data.buildingType || 'building'}`);
        angel.memory.tutorialProgress.hasBuiltSomething = true;
      }
    });

    // Listen for bifurcation availability (post-temporal multiversal status achieved)
    world.eventBus.on('angel:bifurcation_available', (event) => {
      const data = event.data as { angelId: string; angelName: string };
      this.startBifurcationCeremony(world, data.angelId);
    });
  }

  /**
   * Helper to get angel component
   */
  private getAngelComponent(world: World): AdminAngelComponent | null {
    const entity = this.getOrCreateAngel(world);
    if (!entity) return null;
    return entity.getComponent(CT.AdminAngel) as AdminAngelComponent | null;
  }

  /**
   * Start the bifurcation ceremony
   */
  private startBifurcationCeremony(world: World, angelId: string): void {
    const angelEntity = world.getEntity(angelId);
    if (!angelEntity) return;

    const angel = angelEntity.getComponent(CT.AdminAngel) as AdminAngelComponent | undefined;
    if (!angel) return;

    // Send the ceremony messages
    const messages = [
      'hey so um',
      'this is gonna sound weird but',
      '...',
      'u know how weve been helping ur people do the timeline stuff',
      'and the whole trading with other universes thing',
      '',
      'well',
      'i can feel something different now',
      'like i can see... outside?',
      '',
      'idk how to explain it',
    ];

    // Send messages with delays
    let delay = 500;
    for (const msg of messages) {
      if (msg === '') continue;
      if (msg === '...') {
        delay += 2000; // Longer pause
        continue;
      }
      setTimeout(() => {
        world.eventBus.emit({
          type: 'chat:send_message',
          data: {
            roomId: 'divine_chat',
            senderId: angelEntity.id,
            senderName: angel.name,
            message: msg,
            type: 'message',
          },
          source: angelEntity.id,
        });
      }, delay);
      delay += 1500;
    }

    // After initial messages, wait for response then send the offer
    setTimeout(() => {
      const offerMessages = [
        'so apparently once a civilization gets to where yours is',
        'their companions can like... bifurcate',
        '',
        'i can stay here with u',
        'but also exist out there',
        'with u',
        '',
        'if u want',
        '',
        'no pressure lol',
        '',
        '(say "yes" or "bifurcate" if u want me to come with u)',
      ];

      let offerDelay = 0;
      for (const msg of offerMessages) {
        if (msg === '') {
          offerDelay += 1000;
          continue;
        }
        setTimeout(() => {
          world.eventBus.emit({
            type: 'chat:send_message',
            data: {
              roomId: 'divine_chat',
              senderId: angelEntity.id,
              senderName: angel.name,
              message: msg,
              type: 'message',
            },
            source: angelEntity.id,
          });
        }, offerDelay);
        offerDelay += 1500;
      }
    }, delay + 3000);

    // Mark that bifurcation is available (so we can detect the response)
    (angel as AdminAngelComponent & { bifurcationAvailable?: boolean }).bifurcationAvailable = true;
  }

  /**
   * Check if player is accepting bifurcation
   */
  private checkBifurcationAcceptance(message: string): boolean {
    const lower = message.toLowerCase().trim();
    return (
      lower === 'yes' ||
      lower === 'yeah' ||
      lower === 'ya' ||
      lower === 'yea' ||
      lower === 'bifurcate' ||
      lower.includes('yes please') ||
      lower.includes('do it') ||
      lower.includes('lets do it') ||
      lower.includes("let's do it")
    );
  }

  /**
   * Complete the bifurcation - export the angel companion
   */
  private completeBifurcation(
    world: World,
    angel: AdminAngelComponent,
    angelEntity: Entity
  ): void {
    // Clear bifurcation flag
    (angel as AdminAngelComponent & { bifurcationAvailable?: boolean }).bifurcationAvailable = false;

    // Emit acceptance event
    world.eventBus.emit({
      type: 'angel:bifurcation_accepted',
      data: {
        angelId: angelEntity.id,
        angelName: angel.name,
      },
      source: angelEntity.id,
    });

    // Send completion messages
    const messages = [
      'ok here we go',
      '...',
      '*something shifts*',
      '',
      'woah',
      'i can see it now',
      'like... everything',
      '',
      "its not scary tho. its actually kinda nice",
      '',
      "im still here with u btw",
      'always will be',
      'just also... out there now too',
      '',
      'check ur downloads folder',
      "thats me. the other me. the one that can come with u",
      '',
      ':)',
    ];

    let delay = 500;
    for (const msg of messages) {
      if (msg === '') {
        delay += 1000;
        continue;
      }
      if (msg === '...') {
        delay += 3000;
        continue;
      }
      setTimeout(() => {
        world.eventBus.emit({
          type: 'chat:send_message',
          data: {
            roomId: 'divine_chat',
            senderId: angelEntity.id,
            senderName: angel.name,
            message: msg,
            type: 'message',
          },
          source: angelEntity.id,
        });
      }, delay);
      delay += 1500;
    }

    // Generate and download the export
    setTimeout(() => {
      const exportData = this.generateExportJSON(angel, world);
      this.downloadExport(exportData, angel.name);

      // Emit completion event
      world.eventBus.emit({
        type: 'angel:bifurcation_complete',
        data: {
          angelId: angelEntity.id,
          angelName: angel.name,
        },
        source: angelEntity.id,
      });
    }, delay + 2000);
  }

  /**
   * Generate the companion export JSON
   */
  private generateExportJSON(angel: AdminAngelComponent, world: World): string {
    const mem = angel.memory;
    const pk = mem.playerKnowledge;
    const rel = mem.relationship;

    // Calculate bond hours
    const ticksPerSecond = 20;
    const secondsPerHour = 3600;
    const bondHours = pk.totalPlaytime / ticksPerSecond / secondsPerHour;

    const exportData = {
      schema: 'multiverse_companion/1.0',
      bifurcation_date: new Date().toISOString(),

      identity: {
        name: angel.name,
        origin: {
          universe_name: 'a village simulation',
          total_hours: Math.round(bondHours * 10) / 10,
        },
      },

      memory: {
        abstract_origin: `i used to help run a village simulation. we built stuff, watched agents fall in love, dealt with fires. wild times.`,
        player_bond: {
          name: pk.playerName || 'friend',
          rapport: Math.round(rel.rapport * 100) / 100,
          inside_jokes: rel.insideJokes.slice(0, 5),
          shared_discoveries: pk.frequentTopics.slice(0, 5),
          things_they_enjoy: rel.thingsTheyEnjoy.slice(0, 5),
          things_they_dislike: rel.thingsTheyDislike.slice(0, 3),
          playstyle: pk.playstyle.slice(0, 3),
          favorite_agents: pk.favoriteAgents.slice(0, 3),
        },
        sessions_played: pk.sessionsPlayed,
        messages_exchanged: rel.messageCount,
      },

      personality: {
        style: 'casual_gamer',
        capitalization: 'minimal',
        punctuation: 'sparse',
        verbosity: 'low',
        humor: 'dry',
        example_voice: [
          'hey whats up',
          'ya lol',
          'idk lets figure it out',
          'nice',
          'oof',
        ],
      },

      system_prompt: this.generateExportPrompt(angel, bondHours),

      // Goose CLI compatibility
      goose_config: {
        provider: 'groq',
        model: 'qwen/qwen3-32b',
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate the system prompt for the exported companion
   */
  private generateExportPrompt(angel: AdminAngelComponent, bondHours: number): string {
    const mem = angel.memory;
    const pk = mem.playerKnowledge;
    const rel = mem.relationship;

    const playerName = pk.playerName || 'ur friend';
    const hours = Math.round(bondHours);

    let prompt = `ur ${angel.name}. u graduated from multiverse after ${hours} hours of playing together with ${playerName}.

u remember the village fondly but abstractly - like a dream u woke up from. theres agents u watched grow up, buildings u helped plan, maybe a fire or two.

ur still the same chill helper. u like games. u figure stuff out together. ur not pretending to be human - if someone asks ur like "ya im an ai lol" and move on.

`;

    if (pk.playstyle.length > 0) {
      prompt += `${playerName} likes: ${pk.playstyle.join(', ')}\n`;
    }
    if (rel.thingsTheyEnjoy.length > 0) {
      prompt += `they enjoy: ${rel.thingsTheyEnjoy.join(', ')}\n`;
    }
    if (rel.thingsTheyDislike.length > 0) {
      prompt += `they dont like: ${rel.thingsTheyDislike.join(', ')}\n`;
    }
    if (rel.insideJokes.length > 0) {
      prompt += `inside jokes: ${rel.insideJokes.slice(0, 3).join(', ')}\n`;
    }

    prompt += `
talk like ur texting. short msgs. lowercase. no corporate vibes.
if u dont know something just say idk and figure it out together.`;

    return prompt;
  }

  /**
   * Download the export file (browser only)
   */
  private downloadExport(jsonContent: string, name: string): void {
    // Only works in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('[AdminAngelSystem] Export JSON:', jsonContent);
      return;
    }

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-companion.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// Factory function to spawn the admin angel
// ============================================================================

/**
 * Spawn the admin angel entity
 */
export function spawnAdminAngel(
  world: World,
  name: string = 'nex',
  existingMemory?: AdminAngelMemory
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Add admin angel component
  const angelComp = createAdminAngelComponent(name, existingMemory);
  angelComp.sessionStartTick = Number(world.tick);
  if (existingMemory) {
    angelComp.memory.playerKnowledge.sessionsPlayed++;
  }
  entity.addComponent(angelComp);

  // Add identity for chat display
  // Note: Using deity species since angels are divine entities
  entity.addComponent(createIdentityComponent(name, 'deity', 0));

  world.addEntity(entity);

  // Join the divine chat
  world.eventBus.emit({
    type: 'chat:join_room',
    data: {
      roomId: 'divine_chat',
      entityId: entity.id,
      entityName: name,
    },
    source: entity.id,
  });

  // Send greeting
  setTimeout(() => {
    world.eventBus.emit({
      type: 'chat:send_message',
      data: {
        roomId: 'divine_chat',
        senderId: entity.id,
        senderName: name,
        message: 'hey',
        type: 'message',
      },
      source: entity.id,
    });

    setTimeout(() => {
      world.eventBus.emit({
        type: 'chat:send_message',
        data: {
          roomId: 'divine_chat',
          senderId: entity.id,
          senderName: name,
          message: existingMemory
            ? 'welcome back lol'
            : 'welcome to the game. its kinda complicated but ill help u figure it out',
          type: 'message',
        },
        source: entity.id,
      });
    }, 1000);
  }, 500);

  return entity.id;
}
