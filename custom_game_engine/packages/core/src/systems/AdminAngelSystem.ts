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

    const gameState = this.getGameStateSummary(ctx.world);
    const prompt = buildAngelPrompt(angel, gameState, playerMessage);

    // Mark as awaiting
    angel.awaitingResponse = true;

    // TODO: Actually call LLM
    // For now, emit an event that the LLM system can pick up
    ctx.emit('admin_angel:request_response', {
      angelId: angelEntity.id,
      prompt,
      isProactive: !playerMessage,
    }, angelEntity.id);

    // The response will come back via event
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
  }

  /**
   * Helper to get angel component
   */
  private getAngelComponent(world: World): AdminAngelComponent | null {
    const entity = this.getOrCreateAngel(world);
    if (!entity) return null;
    return entity.getComponent(CT.AdminAngel) as AdminAngelComponent | null;
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
