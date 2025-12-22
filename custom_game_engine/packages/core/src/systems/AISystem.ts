import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent, AgentBehavior } from '../components/AgentComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { isHungry } from '../components/NeedsComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';
import { addMemory, getMemoriesByType } from '../components/MemoryComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import { startConversation, addMessage, isInConversation } from '../components/ConversationComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import { updateRelationship, shareMemory } from '../components/RelationshipComponent.js';
import { parseAction, actionToBehavior } from '../actions/AgentAction.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import { addToInventory } from '../components/InventoryComponent.js';
import { type BuildingType } from '../components/BuildingComponent.js';

interface BehaviorHandler {
  (entity: EntityImpl, world: World): void;
}

export class AISystem implements System {
  public readonly id: SystemId = 'ai';
  public readonly priority: number = 10; // Run before movement (priority 20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    'agent',
    'position',
    'movement',
  ];

  private behaviors: Map<string, BehaviorHandler> = new Map();
  private llmDecisionQueue: any | null = null; // LLM decision queue (optional)
  private promptBuilder: any | null = null; // Structured prompt builder (optional)

  constructor(llmDecisionQueue?: any, promptBuilder?: any) {
    this.registerBehavior('wander', this.wanderBehavior.bind(this));
    this.registerBehavior('idle', this.idleBehavior.bind(this));
    this.registerBehavior('seek_food', this.seekFoodBehavior.bind(this));
    this.registerBehavior('follow_agent', this.followAgentBehavior.bind(this));
    this.registerBehavior('talk', this.talkBehavior.bind(this));
    this.registerBehavior('gather', this.gatherBehavior.bind(this));
    this.registerBehavior('build', this.buildBehavior.bind(this));
    this.registerBehavior('seek_sleep', this._seekSleepBehavior.bind(this));
    this.registerBehavior('forced_sleep', this._forcedSleepBehavior.bind(this));

    this.llmDecisionQueue = llmDecisionQueue || null;
    this.promptBuilder = promptBuilder || null;
  }

  registerBehavior(name: string, handler: BehaviorHandler): void {
    this.behaviors.set(name, handler);
  }

  update(world: World, entities: ReadonlyArray<Entity>): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const agent = impl.getComponent<AgentComponent>('agent')!;

      // Check if it's time to think
      const ticksSinceLastThink = world.tick - agent.lastThinkTick;
      if (ticksSinceLastThink < agent.thinkInterval) {
        continue;
      }

      // Update last think time
      impl.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        lastThinkTick: world.tick,
      }));

      // Detect nearby agents and resources (if has vision)
      this.processVision(impl, world);

      // Collect nearby speech (hearing)
      this.processHearing(impl, world);

      // LAYER 1: AUTONOMIC SYSTEM (Fast, survival reflexes)
      // Check critical needs that override executive decisions
      const agentNeeds = impl.getComponent<NeedsComponent>('needs');
      const circadian = impl.getComponent('circadian') as any;
      const autonomicOverride = agentNeeds ? this.checkAutonomicSystem(agentNeeds, circadian) : null;

      if (autonomicOverride) {
        // Autonomic system takes control - skip executive layer
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: autonomicOverride,
          behaviorState: {},
        }));

        // Execute autonomic behavior
        const handler = this.behaviors.get(autonomicOverride);
        if (handler) {
          handler(impl, world);
        }
        continue;
      }

      // LAYER 2: EXECUTIVE SYSTEM (Slow, LLM-based planning)
      // LLM-based decision making (if enabled)
      if (agent.useLLM && this.llmDecisionQueue && this.promptBuilder) {
        // Decrement cooldown
        if (agent.llmCooldown > 0) {
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            llmCooldown: Math.max(0, current.llmCooldown - 1),
          }));
        }

        // Check if we have a ready decision
        const decision = this.llmDecisionQueue.getDecision(entity.id);
        if (decision) {
          // Try to parse as JSON first (structured response with thinking/speaking/action)
          let parsedResponse: any = null;
          try {
            parsedResponse = JSON.parse(decision);
          } catch {
            // Not JSON, use legacy parsing
          }

          let behavior: any;
          let speaking: string | undefined;

          if (parsedResponse && parsedResponse.action) {
            // Structured response
            behavior = parsedResponse.action;
            speaking = parsedResponse.speaking || undefined;

            console.log('[AISystem] Parsed structured LLM decision:', {
              entityId: entity.id,
              thinking: parsedResponse.thinking?.slice(0, 60) + '...',
              speaking: speaking || '(silent)',
              action: behavior,
            });
          } else {
            // Legacy text parsing
            const action = parseAction(decision);
            if (action) {
              behavior = actionToBehavior(action);

              // Build behaviorState based on action type
              let behaviorState: Record<string, any> = {};

              if (action.type === 'chop') {
                behaviorState.resourceType = 'wood';
              } else if (action.type === 'mine') {
                behaviorState.resourceType = 'stone';
              } else if (action.type === 'build' && 'buildingType' in action) {
                behaviorState.buildingType = action.buildingType;
              } else if (action.type === 'follow' && 'targetId' in action) {
                behaviorState.targetId = action.targetId;
              }

              console.log('[AISystem] Parsed legacy LLM decision:', {
                entityId: entity.id,
                rawResponse: decision,
                parsedAction: action,
                behavior,
                behaviorState,
              });

              // Store for later use
              (impl as any).__pendingBehaviorState = behaviorState;
            }
          }

          if (behavior) {
            // Log behavior changes for debugging
            console.log(`[AISystem] Agent ${entity.id} changing behavior to: ${behavior}`, {
              previousBehavior: agent.behavior,
              speaking: speaking || '(silent)',
              behaviorState: (impl as any).__pendingBehaviorState,
            });

            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior,
              behaviorState: (impl as any).__pendingBehaviorState || {},
              llmCooldown: 1200, // 1 minute cooldown at 20 TPS
              recentSpeech: speaking, // Store speech for nearby agents to hear
            }));

            // Clear pending state
            delete (impl as any).__pendingBehaviorState;
          }
        } else if (agent.llmCooldown === 0) {
          // Request new decision using structured prompt
          const prompt = this.promptBuilder.buildPrompt(entity, world);
          this.llmDecisionQueue.requestDecision(entity.id, prompt).catch((err: Error) => {
            console.error(`[AISystem] LLM decision failed for ${entity.id}:`, err);

            // On LLM failure, temporarily fall back to scripted behavior
            // Set cooldown to prevent spam and let scripted logic take over briefly
            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              llmCooldown: 60, // 3 second cooldown before retry (at 20 TPS)
            }));
          });
        }

        // Execute current behavior
        const handler = this.behaviors.get(agent.behavior);
        if (handler) {
          handler(impl, world);
        }

        // If LLM agent is stuck in wander/idle due to LLM failures, apply basic scripted logic
        if (agent.llmCooldown > 0 && (agent.behavior === 'wander' || agent.behavior === 'idle')) {
          const inventory = impl.getComponent<InventoryComponent>('inventory');

          // Check if agent should gather resources
          if (inventory && Math.random() < 0.2) {
            const hasWood = inventory.slots.some(s => s.itemId === 'wood' && s.quantity >= 10);
            const hasStone = inventory.slots.some(s => s.itemId === 'stone' && s.quantity >= 10);

            if (!hasWood || !hasStone) {
              const preferredType = !hasWood ? 'wood' : 'stone';
              impl.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'gather',
                behaviorState: { resourceType: preferredType },
              }));
              console.log(`[AISystem] LLM agent ${entity.id} falling back to scripted gather behavior (${preferredType})`);
            }
          }
        }

        continue;
      }

      // Decide behavior based on needs (scripted agents only)
      const needs = impl.getComponent<NeedsComponent>('needs');
      const currentBehavior = agent.behavior;
      const inventory = impl.getComponent<InventoryComponent>('inventory');

      if (needs && isHungry(needs) && currentBehavior !== 'seek_food') {
        // Switch to seeking food when hungry
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'seek_food',
          behaviorState: {},
        }));
      } else if (needs && !isHungry(needs) && currentBehavior === 'seek_food') {
        // Switch back to wandering when satisfied
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'wander',
          behaviorState: {},
        }));
      } else if (currentBehavior === 'wander' && inventory && Math.random() < 0.15) {
        // 15% chance to gather resources when wandering (if inventory is light)
        const hasWood = inventory.slots.some(s => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some(s => s.itemId === 'stone' && s.quantity >= 10);

        if (!hasWood || !hasStone) {
          // Switch to gathering
          const preferredType = !hasWood ? 'wood' : 'stone';
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'gather',
            behaviorState: { resourceType: preferredType },
          }));
        }
      } else if (currentBehavior === 'gather' && inventory && Math.random() < 0.05) {
        // 5% chance to stop gathering if we have enough materials
        const hasWood = inventory.slots.some(s => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some(s => s.itemId === 'stone' && s.quantity >= 10);

        if (hasWood && hasStone) {
          // We have enough, switch to wandering
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'wander',
            behaviorState: {},
          }));
        }
      } else if (currentBehavior === 'wander' && Math.random() < 0.1) {
        // 10% chance to switch to following another agent (social behavior)
        const nearbyAgents = this.getNearbyAgents(impl, world, 15);
        if (nearbyAgents.length > 0) {
          const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'follow_agent',
            behaviorState: { targetId: targetAgent!.id },
          }));
        }
      } else if (currentBehavior === 'follow_agent' && Math.random() < 0.05) {
        // 5% chance to stop following and wander
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'wander',
          behaviorState: {},
        }));
      } else if (currentBehavior === 'wander' && Math.random() < 0.08) {
        // 8% chance to initiate conversation with nearby agent
        const conversation = impl.getComponent<ConversationComponent>('conversation');
        if (conversation && !isInConversation(conversation)) {
          const nearbyAgents = this.getNearbyAgents(impl, world, 3); // Must be close (3 tiles)
          if (nearbyAgents.length > 0) {
            const targetAgent = nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)];
            if (!targetAgent) continue;

            const targetImpl = targetAgent as EntityImpl;
            const targetConversation = targetImpl.getComponent<ConversationComponent>('conversation');

            // Only start conversation if target is not already talking
            if (targetConversation && !isInConversation(targetConversation)) {
              // Start conversation for both agents
              impl.updateComponent<ConversationComponent>('conversation', (current) =>
                startConversation(current, targetAgent.id, world.tick)
              );
              targetImpl.updateComponent<ConversationComponent>('conversation', (current) =>
                startConversation(current, entity.id, world.tick)
              );

              // Switch both to talk behavior
              impl.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'talk',
                behaviorState: { partnerId: targetAgent.id },
              }));
              targetImpl.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'talk',
                behaviorState: { partnerId: entity.id },
              }));

              // Emit conversation started event
              world.eventBus.emit({
                type: 'conversation:started',
                source: entity.id,
                data: {
                  agent1: entity.id,
                  agent2: targetAgent.id,
                },
              });
            }
          }
        }
      } else if (currentBehavior === 'talk' && Math.random() < 0.03) {
        // 3% chance per think to end conversation
        const conversation = impl.getComponent<ConversationComponent>('conversation');
        if (conversation && conversation.partnerId) {
          const partner = world.getEntity(conversation.partnerId);
          if (partner) {
            const partnerImpl = partner as EntityImpl;

            // End conversation for both
            impl.updateComponent<ConversationComponent>('conversation', (current) => ({
              ...current,
              isActive: false,
              partnerId: null,
            }));
            partnerImpl.updateComponent<ConversationComponent>('conversation', (current) => ({
              ...current,
              isActive: false,
              partnerId: null,
            }));

            // Switch both back to wandering
            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior: 'wander',
              behaviorState: {},
            }));
            partnerImpl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior: 'wander',
              behaviorState: {},
            }));
          }
        }
      }

      // Execute current behavior
      const handler = this.behaviors.get(agent.behavior);
      if (handler) {
        handler(impl, world);
      }
    }
  }

  /**
   * AUTONOMIC SYSTEM: Fast survival reflexes that override executive (LLM) decisions
   * Based on needs.md spec - Tier 1 (survival) needs can interrupt almost anything
   */
  private checkAutonomicSystem(needs: NeedsComponent, circadian?: any): AgentBehavior | null {
    // Critical physical needs interrupt with high priority (spec: interruptPriority 0.85-0.95)

    // Hunger critical threshold: 20 (spec says 15, but we use 20 for earlier intervention)
    if (needs.hunger < 20) {
      return 'seek_food';
    }

    // Critical exhaustion threshold: 10 energy = forced sleep
    // Per work order: "energy < 10: will sleep anywhere"
    if (needs.energy < 10) {
      console.log('[AISystem] Autonomic override: FORCED_SLEEP (energy < 10:', needs.energy, ')');
      return 'forced_sleep'; // Collapse and sleep immediately
    }

    // Critical sleep drive: > 95 = forced micro-sleep (can fall asleep mid-action)
    if (circadian && circadian.sleepDrive > 95) {
      console.log('[AISystem] Autonomic override: FORCED_SLEEP (sleepDrive > 95:', circadian.sleepDrive, ')');
      return 'forced_sleep';
    }

    // High sleep drive + low energy: strongly prioritize sleep
    // Per work order: "sleepDrive > 80: will sleep anywhere"
    if (circadian && (circadian.sleepDrive > 80 || (circadian.sleepDrive > 60 && needs.energy < 30))) {
      console.log('[AISystem] Autonomic override: SEEK_SLEEP (sleepDrive:', circadian.sleepDrive, ', energy:', needs.energy, ')');
      return 'seek_sleep';
    }

    // No autonomic override needed - executive system can decide
    return null;
  }

  private processVision(entity: EntityImpl, world: World): void {
    const vision = entity.getComponent<VisionComponent>('vision');
    const memory = entity.getComponent<MemoryComponent>('memory');
    if (!vision || !memory) return;

    const position = entity.getComponent<PositionComponent>('position')!;

    const seenResourceIds: string[] = [];
    const seenAgentIds: string[] = [];

    // Detect nearby resources
    if (vision.canSeeResources) {
      const resources = world.query().with('resource').with('position').executeEntities();

      for (const resource of resources) {
        const resourceImpl = resource as EntityImpl;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;

        const distance = Math.sqrt(
          Math.pow(resourcePos.x - position.x, 2) +
          Math.pow(resourcePos.y - position.y, 2)
        );

        if (distance <= vision.range && resourceComp.amount > 0) {
          // Track this resource in vision
          seenResourceIds.push(resource.id);

          // Remember this resource location
          const updatedMemory = addMemory(
            memory,
            {
              type: 'resource_location',
              x: resourcePos.x,
              y: resourcePos.y,
              entityId: resource.id,
              metadata: { resourceType: resourceComp.resourceType },
            },
            world.tick,
            80
          );

          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }
      }
    }

    // Detect nearby agents
    if (vision.canSeeAgents) {
      const agents = world.query().with('agent').with('position').executeEntities();

      for (const otherAgent of agents) {
        if (otherAgent.id === entity.id) continue;

        const otherPos = (otherAgent as EntityImpl).getComponent<PositionComponent>('position')!;
        const distance = Math.sqrt(
          Math.pow(otherPos.x - position.x, 2) +
          Math.pow(otherPos.y - position.y, 2)
        );

        if (distance <= vision.range) {
          // Track this agent in vision
          seenAgentIds.push(otherAgent.id);

          const updatedMemory = addMemory(
            memory,
            {
              type: 'agent_seen',
              x: otherPos.x,
              y: otherPos.y,
              entityId: otherAgent.id,
            },
            world.tick,
            60
          );

          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }
      }
    }

    // Update vision component with currently seen entities
    entity.updateComponent<VisionComponent>('vision', (current) => ({
      ...current,
      seenAgents: seenAgentIds,
      seenResources: seenResourceIds,
    }));
  }

  private processHearing(entity: EntityImpl, world: World): void {
    const vision = entity.getComponent<VisionComponent>('vision');
    if (!vision) return;

    const position = entity.getComponent<PositionComponent>('position')!;
    const agents = world.query().with('agent').with('position').executeEntities();

    // Collect speech from nearby agents
    const heardSpeech: Array<{ speaker: string, text: string }> = [];

    for (const otherAgent of agents) {
      if (otherAgent.id === entity.id) continue;

      const otherImpl = otherAgent as EntityImpl;
      const otherPos = otherImpl.getComponent<PositionComponent>('position')!;
      const otherAgentComp = otherImpl.getComponent<AgentComponent>('agent');

      const distance = Math.sqrt(
        Math.pow(otherPos.x - position.x, 2) +
        Math.pow(otherPos.y - position.y, 2)
      );

      // Within hearing range (same as vision range)
      if (distance <= vision.range && otherAgentComp?.recentSpeech) {
        const identity = otherImpl.getComponent('identity') as any;
        const speakerName = identity?.name || 'Someone';

        heardSpeech.push({
          speaker: speakerName,
          text: otherAgentComp.recentSpeech
        });
      }
    }

    // Update vision component with heard speech
    entity.updateComponent<VisionComponent>('vision', (current) => ({
      ...current,
      heardSpeech,
    }));
  }

  private getNearbyAgents(entity: EntityImpl, world: World, range: number): Entity[] {
    const position = entity.getComponent<PositionComponent>('position')!;
    const agents = world.query().with('agent').with('position').executeEntities();

    return agents.filter((other) => {
      if (other.id === entity.id) return false;

      const otherPos = (other as EntityImpl).getComponent<PositionComponent>('position')!;
      const distance = Math.sqrt(
        Math.pow(otherPos.x - position.x, 2) +
        Math.pow(otherPos.y - position.y, 2)
      );

      return distance <= range;
    });
  }

  private wanderBehavior(entity: EntityImpl): void {
    const movement = entity.getComponent<MovementComponent>('movement')!;

    // Choose a random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = movement.speed;

    const velocityX = Math.cos(angle) * speed;
    const velocityY = Math.sin(angle) * speed;

    // Update movement velocity
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX,
      velocityY,
    }));
  }

  private idleBehavior(entity: EntityImpl): void {
    // Do nothing - just stop moving
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));
  }

  private seekFoodBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const memory = entity.getComponent<MemoryComponent>('memory');

    let targetFood: Entity | null = null;
    let targetPos: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    // First, check memories for known food locations
    if (memory) {
      const foodMemories = getMemoriesByType(memory, 'resource_location');
      for (const mem of foodMemories) {
        if (mem.metadata?.resourceType !== 'food') continue;

        const distance = Math.sqrt(
          Math.pow(mem.x - position.x, 2) +
          Math.pow(mem.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          // Try to get the actual entity
          if (mem.entityId) {
            const resource = world.getEntity(mem.entityId);
            if (resource) {
              const resourceImpl = resource as EntityImpl;
              const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource');
              if (resourceComp && resourceComp.amount > 0) {
                targetFood = resource;
                nearestDistance = distance;
              }
            }
          } else {
            // Just use memory position
            targetPos = { x: mem.x, y: mem.y };
            nearestDistance = distance;
          }
        }
      }
    }

    // If no memory or memory is stale, search for food
    if (!targetFood && !targetPos) {
      const foodResources = world
        .query()
        .with('resource')
        .with('position')
        .executeEntities();

      for (const resource of foodResources) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

        if (resourceComp.resourceType === 'food' && resourceComp.amount > 0) {
          const distance = Math.sqrt(
            Math.pow(resourcePos.x - position.x, 2) +
            Math.pow(resourcePos.y - position.y, 2)
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            targetFood = resource;
          }
        }
      }
    }

    if (!targetFood && !targetPos) {
      // No food found, wander
      this.wanderBehavior(entity);
      return;
    }

    // Get target position
    if (targetFood) {
      const targetFoodImpl = targetFood as EntityImpl;
      const pos = targetFoodImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    }

    if (!targetPos) return;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5 && targetFood) {
      // Harvest the food
      const targetFoodImpl = targetFood as EntityImpl;
      const resourceComp = targetFoodImpl.getComponent<ResourceComponent>('resource')!;
      const harvestAmount = Math.min(20, resourceComp.amount);

      // Update resource
      targetFoodImpl.updateComponent<ResourceComponent>('resource', (current) => ({
        ...current,
        amount: Math.max(0, current.amount - harvestAmount),
      }));

      // Update agent's hunger
      const needs = entity.getComponent<NeedsComponent>('needs');
      if (needs) {
        entity.updateComponent<NeedsComponent>('needs', (current) => ({
          ...current,
          hunger: Math.min(100, current.hunger + harvestAmount),
        }));
      }

      // Reinforce memory of this food location
      if (memory) {
        const updatedMemory = addMemory(
          memory,
          {
            type: 'resource_location',
            x: targetPos.x,
            y: targetPos.y,
            entityId: targetFood.id,
            metadata: { resourceType: 'food' },
          },
          world.tick,
          100
        );
        entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
      }

      // Stop moving while harvesting
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));

      // Emit harvest event
      world.eventBus.emit({
        type: 'agent:harvested',
        source: entity.id,
        data: {
          agentId: entity.id,
          resourceId: targetFood.id,
          amount: harvestAmount,
        },
      });
    } else {
      // Move towards the target
      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  private followAgentBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const agent = entity.getComponent<AgentComponent>('agent')!;

    const targetId = agent.behaviorState?.targetId as string | undefined;
    if (!targetId) {
      // No target, switch to wandering
      this.wanderBehavior(entity);
      return;
    }

    const targetEntity = world.getEntity(targetId);
    if (!targetEntity) {
      // Target no longer exists, switch to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const targetImpl = targetEntity as EntityImpl;
    const targetPos = targetImpl.getComponent<PositionComponent>('position');
    if (!targetPos) return;

    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Keep some distance (3-5 tiles)
    if (distance < 3) {
      // Too close, slow down or stop
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else if (distance > 5) {
      // Too far, speed up to catch up
      const velocityX = (dx / distance) * movement.speed * 1.2;
      const velocityY = (dy / distance) * movement.speed * 1.2;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    } else {
      // Just right, match speed and follow
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  private talkBehavior(entity: EntityImpl, world: World): void {
    const conversation = entity.getComponent<ConversationComponent>('conversation');
    const relationship = entity.getComponent<RelationshipComponent>('relationship');
    const memory = entity.getComponent<MemoryComponent>('memory');

    if (!conversation || !isInConversation(conversation)) {
      // Not in conversation, switch to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const partnerId = conversation.partnerId;
    if (!partnerId) return;

    const partner = world.getEntity(partnerId);
    if (!partner) {
      // Partner no longer exists, end conversation
      entity.updateComponent<ConversationComponent>('conversation', (current) => ({
        ...current,
        isActive: false,
        partnerId: null,
      }));
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Stop moving while talking
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Update relationship (get to know each other better)
    if (relationship) {
      entity.updateComponent<RelationshipComponent>('relationship', (current) =>
        updateRelationship(current, partnerId, world.tick, 2)
      );
    }

    // 30% chance to add a message to conversation
    if (Math.random() < 0.3) {
      const messages = [
        'Hello!',
        'How are you?',
        'Nice weather today.',
        'Have you seen any food around?',
        'I was just wandering.',
      ];
      const message = messages[Math.floor(Math.random() * messages.length)] || 'Hello!';

      entity.updateComponent<ConversationComponent>('conversation', (current) =>
        addMessage(current, entity.id, message, world.tick)
      );

      // Partner also adds conversation to their component
      const partnerImpl = partner as EntityImpl;
      partnerImpl.updateComponent<ConversationComponent>('conversation', (current) =>
        addMessage(current, entity.id, message, world.tick)
      );
    }

    // 15% chance to share a memory about food location
    if (Math.random() < 0.15 && memory && relationship) {
      const foodMemories = getMemoriesByType(memory, 'resource_location').filter(
        (m) => m.metadata?.resourceType === 'food' && m.strength > 50
      );

      if (foodMemories.length > 0) {
        const sharedMemory = foodMemories[0];
        if (!sharedMemory) return;

        // Add this memory to partner's memory
        const partnerImpl = partner as EntityImpl;
        const partnerMemory = partnerImpl.getComponent<MemoryComponent>('memory');

        if (partnerMemory) {
          partnerImpl.updateComponent<MemoryComponent>('memory', (current) =>
            addMemory(
              current,
              {
                type: 'resource_location',
                x: sharedMemory.x,
                y: sharedMemory.y,
                entityId: sharedMemory.entityId,
                metadata: sharedMemory.metadata,
              },
              world.tick,
              70 // Shared memories start with less strength
            )
          );

          // Track that information was shared
          entity.updateComponent<RelationshipComponent>('relationship', (current) =>
            shareMemory(current, partnerId)
          );

          // Emit information shared event
          world.eventBus.emit({
            type: 'information:shared',
            source: entity.id,
            data: {
              from: entity.id,
              to: partnerId,
              memoryType: 'resource_location',
              location: { x: sharedMemory.x, y: sharedMemory.y },
            },
          });
        }
      }
    }
  }

  /**
   * Gather behavior: Find and harvest wood or stone resources.
   * Similar to seek_food but stores in inventory instead of consuming.
   */
  private gatherBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const memory = entity.getComponent<MemoryComponent>('memory');
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    const agent = entity.getComponent<AgentComponent>('agent')!;

    if (!inventory) {
      // No inventory component, can't gather
      this.wanderBehavior(entity);
      return;
    }

    // Determine preferred resource type from behaviorState
    const preferredType = agent.behaviorState?.resourceType as string | undefined;

    let targetResource: Entity | null = null;
    let targetPos: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;

    // First, check memories for known resource locations
    if (memory) {
      const resourceMemories = getMemoriesByType(memory, 'resource_location');
      for (const mem of resourceMemories) {
        const memResourceType = mem.metadata?.resourceType as string;

        // If preferred type specified, only consider that type
        if (preferredType && memResourceType !== preferredType) continue;

        // Skip food (that's for seek_food behavior)
        if (memResourceType === 'food') continue;

        const distance = Math.sqrt(
          Math.pow(mem.x - position.x, 2) +
          Math.pow(mem.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          // Try to get the actual entity
          if (mem.entityId) {
            const resource = world.getEntity(mem.entityId);
            if (resource) {
              const resourceImpl = resource as EntityImpl;
              const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource');
              if (resourceComp && resourceComp.amount > 0 && resourceComp.harvestable) {
                targetResource = resource;
                nearestDistance = distance;
              }
            }
          } else {
            // Just use memory position
            targetPos = { x: mem.x, y: mem.y };
            nearestDistance = distance;
          }
        }
      }
    }

    // If no memory or memory is stale, search for resources
    if (!targetResource && !targetPos) {
      const resources = world
        .query()
        .with('resource')
        .with('position')
        .executeEntities();

      for (const resource of resources) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

        // Skip food and non-harvestable resources
        if (resourceComp.resourceType === 'food' || !resourceComp.harvestable) continue;
        if (resourceComp.amount <= 0) continue;

        // If preferred type specified, only consider that type
        if (preferredType && resourceComp.resourceType !== preferredType) continue;

        const distance = Math.sqrt(
          Math.pow(resourcePos.x - position.x, 2) +
          Math.pow(resourcePos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          targetResource = resource;
        }
      }
    }

    if (!targetResource && !targetPos) {
      // No resources found, wander
      this.wanderBehavior(entity);
      return;
    }

    // Get target position
    if (targetResource) {
      const targetResourceImpl = targetResource as EntityImpl;
      const pos = targetResourceImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    }

    if (!targetPos) return;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5 && targetResource) {
      // Calculate work speed penalty based on energy
      const needs = entity.getComponent<NeedsComponent>('needs');
      let workSpeedMultiplier = 1.0;

      if (needs) {
        const energy = needs.energy;

        // Per work order:
        // Energy 100-70: No penalty
        // Energy 70-50: -10% work speed
        // Energy 50-30: -25% work speed
        // Energy 30-10: -50% work speed
        // Energy 10-0: Cannot work (return early)

        if (energy < 10) {
          // Too exhausted to work - just stand there
          entity.updateComponent<MovementComponent>('movement', (current: MovementComponent) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
          return; // Cannot gather resources
        } else if (energy < 30) {
          workSpeedMultiplier = 0.5; // -50% work speed
        } else if (energy < 50) {
          workSpeedMultiplier = 0.75; // -25% work speed
        } else if (energy < 70) {
          workSpeedMultiplier = 0.9; // -10% work speed
        }
        // else: no penalty (100%)
      }

      // Harvest the resource
      const targetResourceImpl = targetResource as EntityImpl;
      const resourceComp = targetResourceImpl.getComponent<ResourceComponent>('resource')!;
      const baseHarvestAmount = 10;
      const harvestAmount = Math.min(
        Math.floor(baseHarvestAmount * workSpeedMultiplier),
        resourceComp.amount
      );

      // If work speed penalty reduces harvest to 0, agent is too tired
      if (harvestAmount === 0) {
        entity.updateComponent<MovementComponent>('movement', (current: MovementComponent) => ({
          ...current,
          velocityX: 0,
          velocityY: 0,
        }));
        return;
      }

      console.log(`[AISystem.gatherBehavior] Agent ${entity.id} harvesting ${harvestAmount} ${resourceComp.resourceType} from ${targetResource.id} (work speed: ${(workSpeedMultiplier * 100).toFixed(0)}%)`);

      // Update resource
      targetResourceImpl.updateComponent<ResourceComponent>('resource', (current) => ({
        ...current,
        amount: Math.max(0, current.amount - harvestAmount),
      }));

      // Add to inventory
      try {
        const result = addToInventory(inventory, resourceComp.resourceType, harvestAmount);
        entity.updateComponent<InventoryComponent>('inventory', () => result.inventory);

        // Emit resource gathered event
        world.eventBus.emit({
          type: 'resource:gathered',
          source: entity.id,
          data: {
            agentId: entity.id,
            resourceType: resourceComp.resourceType,
            amount: result.amountAdded,
            sourceEntityId: targetResource.id,
          },
        });

        // Reinforce memory of this resource location
        if (memory) {
          const updatedMemory = addMemory(
            memory,
            {
              type: 'resource_location',
              x: targetPos.x,
              y: targetPos.y,
              entityId: targetResource.id,
              metadata: { resourceType: resourceComp.resourceType },
            },
            world.tick,
            100
          );
          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }

        // Check if resource depleted
        if (resourceComp.amount - harvestAmount <= 0) {
          world.eventBus.emit({
            type: 'resource:depleted',
            source: targetResource.id,
            data: {
              resourceType: resourceComp.resourceType,
              position: targetPos,
            },
          });
        }
      } catch (error) {
        // Inventory full or weight limit exceeded
        world.eventBus.emit({
          type: 'inventory:full',
          source: entity.id,
          data: {
            agentId: entity.id,
            reason: (error as Error).message,
          },
        });

        // Switch to idle behavior
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'idle',
          behaviorState: {},
        }));
      }

      // Stop moving while harvesting
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else {
      // Move towards the target
      const dx = targetPos.x - position.x;
      const dy = targetPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  /**
   * Build behavior: Create a building at the agent's current location.
   * Checks inventory for required resources and deducts them.
   * Per CLAUDE.md: No silent fallbacks - emits construction:failed event if insufficient resources.
   */
  private buildBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const inventory = entity.getComponent<InventoryComponent>('inventory');

    // Stop moving while building
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Get building type from behavior state (from LLM decision)
    let buildingType: BuildingType = agent.behaviorState?.buildingType as BuildingType || 'lean-to';

    // Validate building type
    const validTypes: BuildingType[] = ['workbench', 'storage-chest', 'campfire', 'tent', 'well', 'lean-to', 'storage-box'];
    if (!validTypes.includes(buildingType)) {
      buildingType = 'lean-to'; // Default to lean-to for shelter
    }

    // Build position (round to tile coordinates)
    const buildX = Math.floor(position.x);
    const buildY = Math.floor(position.y);

    if (!inventory) {
      // No inventory - cannot build
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          builderId: entity.id,
          buildingType,
          position: { x: buildX, y: buildY },
          reason: 'Agent missing InventoryComponent',
        },
      });

      console.log(`[AISystem] Agent ${entity.id} cannot build - no inventory`);

      // Switch back to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Convert inventory to resource record format
    const inventoryRecord: Record<string, number> = {};
    for (const slot of inventory.slots) {
      if (slot.itemId) {
        inventoryRecord[slot.itemId] = (inventoryRecord[slot.itemId] || 0) + slot.quantity;
      }
    }

    // Try to initiate construction (this will validate resources)
    try {
      world.initiateConstruction(
        { x: buildX, y: buildY },
        buildingType,
        inventoryRecord
      );

      // Update agent's inventory with deducted resources
      const updatedSlots = inventory.slots.map(slot => {
        if (slot.itemId && inventoryRecord[slot.itemId] !== undefined) {
          const newQuantity = inventoryRecord[slot.itemId]!;
          if (newQuantity === 0) {
            return { itemId: null, quantity: 0 };
          }
          const amountToDeduct = slot.quantity - newQuantity;
          return {
            ...slot,
            quantity: Math.max(0, slot.quantity - amountToDeduct)
          };
        }
        return slot;
      }).filter(slot => slot.quantity > 0 || slot.itemId === null);

      // Recalculate weight
      let newWeight = 0;
      const resourceWeights: Record<string, number> = { wood: 2, stone: 3, food: 1, water: 1, leaves: 0.5 };
      for (const slot of updatedSlots) {
        if (slot.itemId) {
          const weight = resourceWeights[slot.itemId] || 1;
          newWeight += slot.quantity * weight;
        }
      }

      entity.updateComponent<InventoryComponent>('inventory', () => ({
        ...inventory,
        slots: updatedSlots,
        currentWeight: newWeight,
      }));

      console.log(`[AISystem] Agent ${entity.id} started construction of ${buildingType} at (${buildX}, ${buildY})`);

      // Switch back to wandering after initiating construction
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    } catch (error) {
      // Construction failed (insufficient resources or validation error)
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          builderId: entity.id,
          buildingType,
          position: { x: buildX, y: buildY },
          reason: (error as Error).message,
        },
      });

      console.log(`[AISystem] Agent ${entity.id} construction failed: ${(error as Error).message}`);

      // Switch back to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }
  }

  /**
   * Seek sleep behavior: Find a bed/bedroll or good sleeping location
   */
  private _seekSleepBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const circadian = entity.getComponent('circadian') as any;

    if (!circadian) {
      // No circadian component, just idle
      this.idleBehavior(entity);
      return;
    }

    // If already sleeping, do nothing (SleepSystem handles wake conditions)
    if (circadian.isSleeping) {
      this.idleBehavior(entity);
      return;
    }

    // Search for a bed or bedroll
    const beds = world.query().with('building').with('position').executeEntities();
    let bestSleepLocation: Entity | null = null;
    let nearestDistance = Infinity;

    for (const bed of beds) {
      const bedImpl = bed as EntityImpl;
      const building = bedImpl.getComponent('building') as any;
      const bedPos = bedImpl.getComponent<PositionComponent>('position');

      if (!building || !bedPos) continue;

      // Check if it's a bed or bedroll
      if (building.buildingType === 'bed' || building.buildingType === 'bedroll') {
        const distance = Math.sqrt(
          Math.pow(bedPos.x - position.x, 2) +
          Math.pow(bedPos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          bestSleepLocation = bed;
        }
      }
    }

    // If we found a bed and are close enough, start sleeping
    if (bestSleepLocation && nearestDistance < 1.5) {
      const quality = this._calculateSleepQuality(entity, bestSleepLocation);

      // Start sleeping - update circadian component directly
      entity.updateComponent('circadian', (current: any) => ({
        ...current,
        isSleeping: true,
        sleepStartTime: world.tick,
        sleepLocation: bestSleepLocation,
        sleepQuality: quality,
        sleepDurationHours: 0, // Reset sleep duration counter
      }));

      // Emit sleep event
      world.eventBus.emit({
        type: 'agent:sleeping',
        source: entity.id,
        data: {
          entityId: entity.id,
          location: 'bed',
          quality: quality,
        },
      });

      console.log(`[AISystem] Agent ${entity.id} is sleeping in a bed (quality: ${quality.toFixed(2)})`);

      // Stop moving
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else if (bestSleepLocation) {
      // Move towards the bed
      const bedImpl = bestSleepLocation as EntityImpl;
      const bedPos = bedImpl.getComponent<PositionComponent>('position')!;

      const dx = bedPos.x - position.x;
      const dy = bedPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    } else {
      // No bed found, sleep on ground
      const quality = this._calculateSleepQuality(entity, null);

      entity.updateComponent('circadian', (current: any) => ({
        ...current,
        isSleeping: true,
        sleepStartTime: world.tick,
        sleepLocation: null,
        sleepQuality: quality,
        sleepDurationHours: 0, // Reset sleep duration counter
      }));

      world.eventBus.emit({
        type: 'agent:sleeping',
        source: entity.id,
        data: {
          entityId: entity.id,
          location: 'ground',
          quality: quality,
        },
      });

      console.log(`[AISystem] Agent ${entity.id} is sleeping on the ground (quality: ${quality.toFixed(2)})`);

      // Stop moving
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    }
  }

  /**
   * Forced sleep behavior: Collapse and sleep immediately (critical exhaustion)
   */
  private _forcedSleepBehavior(entity: EntityImpl, world: World): void {
    const circadian = entity.getComponent('circadian') as any;

    if (!circadian) {
      // No circadian component, just idle
      this.idleBehavior(entity);
      return;
    }

    // If not already sleeping, start now (collapse where standing)
    if (!circadian.isSleeping) {
      const quality = 0.5; // Poor sleep quality when collapsed on ground

      // Update circadian component directly
      entity.updateComponent('circadian', (current: any) => ({
        ...current,
        isSleeping: true,
        sleepStartTime: world.tick,
        sleepLocation: null,
        sleepQuality: quality,
        sleepDurationHours: 0, // Reset sleep duration counter
      }));

      world.eventBus.emit({
        type: 'agent:collapsed',
        source: entity.id,
        data: {
          entityId: entity.id,
          reason: 'exhaustion',
        },
      });

      console.log(`[AISystem] Agent ${entity.id} collapsed from exhaustion`);
    }

    // Stop moving
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));
  }

  /**
   * Calculate sleep quality based on location and environmental conditions
   */
  private _calculateSleepQuality(_entity: EntityImpl, location: Entity | null): number {
    let quality = 0.5; // Base quality (ground)

    // Location bonuses
    if (location) {
      const locationImpl = location as EntityImpl;
      const building = locationImpl.getComponent('building') as any;

      if (building) {
        if (building.buildingType === 'bed') {
          quality += 0.4; // Bed: 0.9 total
        } else if (building.buildingType === 'bedroll') {
          quality += 0.2; // Bedroll: 0.7 total
        } else {
          quality += 0.1; // Other building: 0.6 total
        }
      }
    }

    // Environmental penalties (temperature, if available)
    // TODO: Integrate with TemperatureSystem when temperature component is available

    // Clamp to valid range (0.1 to 1.0)
    return Math.max(0.1, Math.min(1.0, quality));
  }
}
