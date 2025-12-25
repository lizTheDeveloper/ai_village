import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AgentComponent, AgentBehavior } from '../components/AgentComponent.js';
import {
  hasBehaviorQueue,
  getCurrentQueuedBehavior,
  advanceBehaviorQueue,
  hasQueuedBehaviorTimedOut,
} from '../components/AgentComponent.js';
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
import { addToInventory, removeFromInventory, getResourceWeight, isResourceType } from '../components/InventoryComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import { type BuildingType } from '../components/BuildingComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { ResourceCost } from '../buildings/BuildingBlueprintRegistry.js';
import { createMeetingComponent, updateMeetingStatus, hasMeetingEnded, addMeetingAttendee } from '../components/MeetingComponent.js';

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
  private lastLLMRequestTick: number = 0; // Rate limiting semaphore to prevent thundering herd
  private readonly llmRequestCooldown: number = 60; // 3 seconds at 20 TPS between LLM requests

  constructor(llmDecisionQueue?: any, promptBuilder?: any) {
    this.registerBehavior('wander', this.wanderBehavior.bind(this));
    this.registerBehavior('idle', this.idleBehavior.bind(this));
    this.registerBehavior('follow_agent', this.followAgentBehavior.bind(this));
    this.registerBehavior('talk', this.talkBehavior.bind(this));

    // PICK - Unified collection behavior (replaces gather/harvest/gather_seeds/seek_food)
    this.registerBehavior('pick', this.gatherBehavior.bind(this));

    // Legacy behaviors - all route to gather for backward compatibility
    this.registerBehavior('gather', this.gatherBehavior.bind(this));
    this.registerBehavior('harvest', this.gatherBehavior.bind(this));
    this.registerBehavior('gather_seeds', this.gatherBehavior.bind(this));
    this.registerBehavior('seek_food', this.gatherBehavior.bind(this));

    this.registerBehavior('build', this.buildBehavior.bind(this));
    this.registerBehavior('seek_sleep', this._seekSleepBehavior.bind(this));
    this.registerBehavior('forced_sleep', this._forcedSleepBehavior.bind(this));
    this.registerBehavior('deposit_items', this._depositItemsBehavior.bind(this));
    this.registerBehavior('seek_warmth', this._seekWarmthBehavior.bind(this));
    this.registerBehavior('call_meeting', this._callMeetingBehavior.bind(this));
    this.registerBehavior('attend_meeting', this._attendMeetingBehavior.bind(this));
    this.registerBehavior('farm', this.farmBehavior.bind(this));
    this.registerBehavior('till', this.tillBehavior.bind(this));
    // Navigation & Exploration behaviors
    this.registerBehavior('navigate', this.navigateBehavior.bind(this));
    this.registerBehavior('explore_frontier', this.exploreFrontierBehavior.bind(this));
    this.registerBehavior('explore_spiral', this.exploreSpiralBehavior.bind(this));
    this.registerBehavior('follow_gradient', this.followGradientBehavior.bind(this));

    // console.log(`[AISystem] Registered ${this.behaviors.size} behaviors including: deposit_items, gather, seek_warmth, farm`);

    this.llmDecisionQueue = llmDecisionQueue || null;
    this.promptBuilder = promptBuilder || null;
  }

  registerBehavior(name: string, handler: BehaviorHandler): void {
    this.behaviors.set(name, handler);
    // console.log(`[AISystem] Registered behavior: ${name}`);
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const agent = impl.getComponent<AgentComponent>('agent');

      // Skip entities without agent component
      if (!agent) {
        continue;
      }

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

      // Check for meeting calls and decide whether to attend
      this.processMeetingCalls(impl, world);

      // LAYER 1: AUTONOMIC SYSTEM (Fast, survival reflexes)
      // Check critical needs that override executive decisions
      const agentNeeds = impl.getComponent<NeedsComponent>('needs');
      const circadian = impl.getComponent('circadian') as any;
      const temperature = impl.getComponent('temperature') as any;

      const autonomicResult = agentNeeds ? this.checkAutonomicSystem(agentNeeds, circadian, temperature) : null;

      // Debug logging for queue interruption
      if (hasBehaviorQueue(agent)) {
        console.log('[AISystem] Queue processing - autonomicResult:', autonomicResult, 'queuePaused:', agent.queuePaused, 'hunger:', agentNeeds?.hunger, 'energy:', agentNeeds?.energy);
      }

      // If queue was paused and no longer needs interruption, resume it
      if (agent.queuePaused && !autonomicResult) {
        impl.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          queuePaused: false,
          queueInterruptedBy: undefined,
        }));

        world.eventBus.emit({
          type: 'agent:queue:resumed',
          source: entity.id,
          data: {
            agentId: entity.id,
            resumedAt: agent.currentQueueIndex,
          },
        });
      }

      if (autonomicResult) {
        // If autonomic behavior is the same as current behavior, just continue
        if (autonomicResult.behavior === agent.behavior) {
          // Already doing what autonomic system wants - continue executing
          const handler = this.behaviors.get(agent.behavior);
          if (handler) {
            handler(impl, world);
          }
          continue;
        }

        // Get priority of autonomic need and current behavior
        const autonomicPriority = this.getBehaviorPriority(autonomicResult.behavior, temperature);
        const currentPriority = this.getBehaviorPriority(agent.behavior, temperature);

        // Interrupt if autonomic need has higher priority
        if (autonomicPriority > currentPriority) {
          // console.log(`[AISystem] Agent ${entity.id}: ${autonomicResult.behavior} (priority ${autonomicPriority}) interrupting ${agent.behavior} (priority ${currentPriority})`);

          // If agent has an active queue, pause it for interruption
          const hasQueue = hasBehaviorQueue(agent) && !agent.queuePaused;
          console.log('[AISystem] Autonomic interrupt - hasQueue:', hasQueue, 'hasBehaviorQueue:', hasBehaviorQueue(agent), 'queuePaused:', agent.queuePaused);

          if (hasQueue) {
            world.eventBus.emit({
              type: 'agent:queue:interrupted',
              source: entity.id,
              data: {
                agentId: entity.id,
                reason: 'autonomic_override',
                interruptedBy: autonomicResult.behavior,
              },
            });
          }

          // Autonomic system takes control (pause queue if present)
          impl.updateComponent<AgentComponent>('agent', (current) => {
            const updated = {
              ...current,
              behavior: autonomicResult.behavior,
              behaviorState: {},
              ...(hasQueue ? {
                queuePaused: true,
                queueInterruptedBy: autonomicResult.behavior,
              } : {}),
            };
            console.log('[AISystem] After update - queuePaused:', updated.queuePaused, 'queueInterruptedBy:', updated.queueInterruptedBy);
            return updated;
          });

          // Execute autonomic behavior
          const handler = this.behaviors.get(autonomicResult.behavior);
          if (handler) {
            handler(impl, world);
          }
          continue;
        } else {
          // Current behavior has higher priority - delay the autonomic need
          // console.log(`[AISystem] Agent ${entity.id}: delaying ${autonomicResult.behavior} (priority ${autonomicPriority}) to finish ${agent.behavior} (priority ${currentPriority})`);

          // Execute current behavior (don't freeze!)
          const handler = this.behaviors.get(agent.behavior);
          if (handler) {
            handler(impl, world);
          }
          continue;
        }
      }

      // BEHAVIOR QUEUE PROCESSING
      // Process queued behaviors before LLM/scripted decision making
      if (hasBehaviorQueue(agent)) {
        const currentQueued = getCurrentQueuedBehavior(agent);

        if (!currentQueued) {
          // Queue is invalid, clear it
          impl.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behaviorQueue: undefined,
            currentQueueIndex: undefined,
            queuePaused: undefined,
          }));
        } else {
          // Queue interruption/resume is now handled by autonomic system above
          // Process queue if not paused
          if (!agent.queuePaused) {
            // Check if current queued behavior completed
            if (agent.behaviorCompleted) {
              // Advance queue
              const updatedAgent = advanceBehaviorQueue(agent, world.tick);

              impl.updateComponent<AgentComponent>('agent', () => updatedAgent);

              // Check if queue finished
              if (!hasBehaviorQueue(updatedAgent)) {
                world.eventBus.emit({
                  type: 'agent:queue:completed',
                  source: entity.id,
                  data: {
                    agentId: entity.id,
                  },
                });

                // Fall through to normal decision making
              } else {
                // Move to next queued behavior
                const nextQueued = getCurrentQueuedBehavior(updatedAgent);
                if (nextQueued) {
                  // Set startedAt timestamp for timeout tracking
                  const queueIndex = updatedAgent.currentQueueIndex ?? 0;
                  const updatedQueue = [...(updatedAgent.behaviorQueue || [])];
                  updatedQueue[queueIndex] = {
                    ...nextQueued,
                    startedAt: world.tick,
                  };

                  impl.updateComponent<AgentComponent>('agent', (current) => ({
                    ...current,
                    behavior: nextQueued.behavior,
                    behaviorState: nextQueued.behaviorState || {},
                    behaviorCompleted: false,
                    behaviorQueue: updatedQueue,
                  }));

                  // Execute next queued behavior
                  const handler = this.behaviors.get(nextQueued.behavior);
                  if (handler) {
                    handler(impl, world);
                  }
                  continue;
                }
              }
            } else {
              // Check for timeout
              if (hasQueuedBehaviorTimedOut(agent, world.tick)) {
                console.warn(`[AISystem] Queued behavior timed out for agent ${entity.id.substring(0, 8)}:`, {
                  behavior: currentQueued.behavior,
                  label: currentQueued.label,
                  ticksElapsed: world.tick - (currentQueued.startedAt || 0),
                });

                // Force advance queue on timeout
                const updatedAgent = advanceBehaviorQueue(agent, world.tick);
                impl.updateComponent<AgentComponent>('agent', () => updatedAgent);

                if (!hasBehaviorQueue(updatedAgent)) {
                  // Queue finished, fall through to normal decision making
                } else {
                  continue;
                }
              } else {
                // Continue executing current queued behavior
                if (agent.behavior !== currentQueued.behavior) {
                  // Switch to queued behavior (first time)
                  impl.updateComponent<AgentComponent>('agent', (current) => ({
                    ...current,
                    behavior: currentQueued.behavior,
                    behaviorState: currentQueued.behaviorState || {},
                  }));
                }

                const handler = this.behaviors.get(currentQueued.behavior);
                if (handler) {
                  handler(impl, world);
                }
                continue;
              }
            }
          }
        }
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
          let thinking: string | undefined;

          if (parsedResponse && parsedResponse.action) {
            // Structured response
            behavior = parsedResponse.action;
            speaking = parsedResponse.speaking || undefined;
            thinking = parsedResponse.thinking || undefined;

            // Handle goal-setting actions (don't change behavior, just update goals)
            if (typeof behavior === 'object' && behavior !== null && 'type' in behavior) {
              if (behavior.type === 'set_personal_goal' && 'goal' in behavior) {
                impl.updateComponent<AgentComponent>('agent', (current) => ({
                  ...current,
                  personalGoal: behavior.goal as string,
                }));
                behavior = null; // Don't change actual behavior
              } else if (behavior.type === 'set_medium_term_goal' && 'goal' in behavior) {
                impl.updateComponent<AgentComponent>('agent', (current) => ({
                  ...current,
                  mediumTermGoal: behavior.goal as string,
                }));
                behavior = null; // Don't change actual behavior
              } else if (behavior.type === 'set_group_goal' && 'goal' in behavior) {
                impl.updateComponent<AgentComponent>('agent', (current) => ({
                  ...current,
                  groupGoal: behavior.goal as string,
                }));
                behavior = null; // Don't change actual behavior
              }
            }

            // Log LLM decisions (especially build actions)
            if (behavior === 'build' || (typeof behavior === 'string' && behavior.startsWith('build'))) {
              console.log(`[AISystem] 🏗️ LLM CHOSE BUILD! Agent ${entity.id.substring(0, 8)} decision:`, {
                thinking: thinking?.slice(0, 80),
                speaking: speaking || '(silent)',
                action: behavior,
              });
            }
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
                // Resolve 'nearest' to actual agent ID
                if (action.targetId === 'nearest') {
                  const nearbyAgents = this.getNearbyAgents(impl, world, 10);
                  if (nearbyAgents.length > 0) {
                    behaviorState.targetId = nearbyAgents[0]!.id;
                  } else {
                    // No nearby agents, don't set follow behavior
                    behavior = 'wander';
                  }
                } else {
                  behaviorState.targetId = action.targetId;
                }
              }

              // Log legacy LLM decisions (especially build actions)
              if (action.type === 'build' || behavior === 'build') {
                console.log(`[AISystem] 🏗️ LLM CHOSE BUILD! Agent ${entity.id.substring(0, 8)} decision:`, {
                  rawResponse: decision,
                  parsedAction: action,
                  behavior,
                  behaviorState,
                });
              }

              // Store for later use
              (impl as any).__pendingBehaviorState = behaviorState;
            }
          }

          if (behavior) {
            // Log behavior changes for debugging
            // console.log(`[AISystem] Agent ${entity.id.substring(0, 8)} changing behavior to: ${behavior}`, {
            //   previousBehavior: agent.behavior,
            //   speaking: speaking || '(silent)',
            //   behaviorState: (impl as any).__pendingBehaviorState,
            // });

            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior,
              behaviorState: (impl as any).__pendingBehaviorState || {},
              llmCooldown: 1200, // 1 minute cooldown at 20 TPS
              recentSpeech: speaking, // Store speech for nearby agents to hear
              lastThought: thinking, // Store thinking for UI display
            }));

            // Clear pending state
            delete (impl as any).__pendingBehaviorState;
          }
        } else if (agent.llmCooldown === 0) {
          // Check rate limiting semaphore to prevent thundering herd (all agents requesting at once)
          const ticksSinceLastRequest = world.tick - this.lastLLMRequestTick;
          if (ticksSinceLastRequest >= this.llmRequestCooldown) {
            // Request new decision using structured prompt (rebuilt fresh with latest context)
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

            // Update rate limiting semaphore
            this.lastLLMRequestTick = world.tick;
          }
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
              // console.log(`[AISystem] LLM agent ${entity.id} falling back to scripted gather behavior (${preferredType})`);
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
      } else if (currentBehavior === 'wander' && inventory) {
        // Autonomic resource gathering: switch to gather when resources are visible and needed
        const hasWood = inventory.slots.some(s => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some(s => s.itemId === 'stone' && s.quantity >= 10);
        const hasFood = inventory.slots.some(s => s.itemId === 'food' && s.quantity >= 5);

        if (!hasWood || !hasStone || !hasFood) {
          // Check for nearby resources within detection range
          const position = impl.getComponent<PositionComponent>('position')!;
          const detectionRange = 15; // tiles
          const resources = world
            .query()
            .with('resource')
            .with('position')
            .executeEntities();

          // Track nearest resource of each type
          let nearestFood: { type: string; distance: number } | null = null;
          let nearestWood: { type: string; distance: number } | null = null;
          let nearestStone: { type: string; distance: number } | null = null;

          for (const resource of resources) {
            const resourceImpl = resource as EntityImpl;
            const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
            const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

            // Skip non-harvestable resources
            if (!resourceComp.harvestable) continue;
            if (resourceComp.amount <= 0) continue;

            // Only consider resources we need
            if (resourceComp.resourceType === 'wood' && hasWood) continue;
            if (resourceComp.resourceType === 'stone' && hasStone) continue;
            if (resourceComp.resourceType === 'food' && hasFood) continue;

            const distance = Math.sqrt(
              Math.pow(resourcePos.x - position.x, 2) +
              Math.pow(resourcePos.y - position.y, 2)
            );

            if (distance <= detectionRange) {
              // Track nearest of each type
              if (resourceComp.resourceType === 'food' && (!nearestFood || distance < nearestFood.distance)) {
                nearestFood = { type: 'food', distance };
              } else if (resourceComp.resourceType === 'wood' && (!nearestWood || distance < nearestWood.distance)) {
                nearestWood = { type: 'wood', distance };
              } else if (resourceComp.resourceType === 'stone' && (!nearestStone || distance < nearestStone.distance)) {
                nearestStone = { type: 'stone', distance };
              }
            }
          }

          // PRIORITY ORDER: food > wood > stone
          // Always gather food first if available and needed
          let targetResource: { type: string; distance: number } | null = null;
          if (nearestFood && !hasFood) {
            targetResource = nearestFood;
          } else if (nearestWood && !hasWood) {
            targetResource = nearestWood;
          } else if (nearestStone && !hasStone) {
            // Only gather stone if we already have food and wood
            targetResource = nearestStone;
          }

          // If found nearby resource, immediately switch to gathering
          if (targetResource) {
            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior: 'gather',
              behaviorState: { resourceType: targetResource.type },
            }));
          }
        }
      } else if (currentBehavior === 'gather' && inventory) {
        // Autonomic: stop gathering when we have enough materials
        const hasWood = inventory.slots.some(s => s.itemId === 'wood' && s.quantity >= 10);
        const hasStone = inventory.slots.some(s => s.itemId === 'stone' && s.quantity >= 10);
        const hasFood = inventory.slots.some(s => s.itemId === 'food' && s.quantity >= 5);

        if (hasWood && hasStone && hasFood) {
          // We have enough basic resources, switch to wandering
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
                  participants: [entity.id, targetAgent.id],
                  initiator: entity.id,
                  agent1: entity.id,
                  agent2: targetAgent.id,
                },
              });
            }
          }
        }
      } else if (currentBehavior === 'wander' && inventory && Math.random() < 0.35) {
        // 35% chance to gather seeds from nearby plants when wandering (increased for testing)
        const position = impl.getComponent<PositionComponent>('position');
        if (position) {
          // Find nearby plants with seeds
          const plantsWithSeeds = world
            .query()
            .with('plant')
            .with('position')
            .executeEntities()
            .filter((plantEntity) => {
              const plantImpl = plantEntity as EntityImpl;
              const plant = plantImpl.getComponent<PlantComponent>('plant');
              const plantPos = plantImpl.getComponent<PositionComponent>('position');

              if (!plant || !plantPos) return false;

              // Check if plant has seeds and is at a valid stage
              const validStages = ['mature', 'seeding', 'senescence'];
              if (!validStages.includes(plant.stage)) return false;
              if (plant.seedsProduced <= 0) return false;

              // Check distance (within 15 tiles)
              const dx = plantPos.x - position.x;
              const dy = plantPos.y - position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance <= 15;
            });

          if (plantsWithSeeds.length > 0) {
            // Choose a random plant to gather from
            const targetPlant = plantsWithSeeds[Math.floor(Math.random() * plantsWithSeeds.length)]!;
            const targetPlantComp = (targetPlant as EntityImpl).getComponent<PlantComponent>('plant');

            console.log(`[AISystem] Agent ${entity.id.slice(0,8)} requesting gather_seeds from ${targetPlantComp?.speciesId || 'unknown'} plant ${targetPlant.id.slice(0,8)} (${plantsWithSeeds.length} candidates)`);

            // Emit gather_seeds action request
            const posComp = (targetPlant as EntityImpl).getComponent<PositionComponent>('position');
            world.eventBus.emit({
              type: 'action:gather_seeds',
              source: entity.id,
              data: {
                actionId: `gather_seeds_${Date.now()}`,
                actorId: entity.id,
                agentId: entity.id,
                plantId: targetPlant.id,
                speciesId: targetPlantComp?.speciesId || 'unknown',
                seedsGathered: 0,
                position: posComp ? { x: posComp.x, y: posComp.y } : { x: 0, y: 0 },
              },
            });

            // Switch to a gather_seeds behavior (using 'farm' behavior as a waiting state)
            impl.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior: 'farm',
              behaviorState: { targetPlantId: targetPlant.id },
            }));
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
   * Get priority for a behavior. Higher number = higher priority.
   * Priority scale:
   * 100+ : Critical survival (collapse, flee from predator)
   * 80-99: Danger (dangerously cold/hot, critical hunger)
   * 50-79: Important tasks (deposit_items, build)
   * 20-49: Moderate needs (cold, hungry, tired)
   * 0-19 : Low priority (wander, idle, social)
   */
  private getBehaviorPriority(behavior: AgentBehavior, temperature?: any): number {
    switch (behavior) {
      // Critical survival (100+)
      case 'forced_sleep': return 100;
      case 'flee_danger':
      case 'flee': return 95;

      // Danger level (80-99)
      case 'seek_warmth':
        // Check if dangerously cold/hot vs just uncomfortable
        if (temperature?.state === 'dangerously_cold' || temperature?.state === 'dangerously_hot') {
          return 90;
        }
        return 35; // Just cold/hot
      case 'seek_food': return 40; // Moderate hunger
      case 'seek_water': return 38;
      case 'seek_shelter': return 36;

      // Important tasks (50-79)
      case 'deposit_items': return 60;
      case 'build': return 55;
      case 'farm': return 50; // Farming actions (till, plant, harvest)
      case 'seek_sleep': return 30; // Normal tiredness

      // Low priority (0-19)
      case 'gather': return 15;
      case 'work': return 15;
      case 'talk': return 10;
      case 'follow_agent': return 10;
      case 'wander': return 5;
      case 'idle': return 0;

      // Default for unknown behaviors
      default: return 10;
    }
  }

  /**
   * AUTONOMIC SYSTEM: Fast survival reflexes that override executive (LLM) decisions
   * Based on needs.md spec - Tier 1 (survival) needs can interrupt almost anything
   */
  private checkAutonomicSystem(needs: NeedsComponent, circadian?: any, temperature?: any): { behavior: AgentBehavior } | null {
    // Critical physical needs interrupt with high priority (spec: interruptPriority 0.85-0.95)

    // SLEEP TAKES PRIORITY OVER FOOD when critically exhausted
    // Per CLAUDE.md: agents need to recover energy to survive, can't work or eat without energy

    // Critical exhaustion threshold: 0 energy = forced sleep (collapse)
    // Agents will collapse and sleep immediately when energy is depleted
    if (needs.energy <= 0) {
      // console.log('[AISystem] Autonomic override: FORCED_SLEEP (energy <= 0:', needs.energy.toFixed(1), ')');
      return { behavior: 'forced_sleep' };
    }

    // Critical sleep drive: > 85 = forced micro-sleep (can fall asleep mid-action)
    // Lowered from 90 to trigger more reliably
    if (circadian && circadian.sleepDrive > 85) {
      // console.log('[AISystem] Autonomic override: FORCED_SLEEP (sleepDrive > 85:', circadian.sleepDrive.toFixed(1), ')');
      return { behavior: 'forced_sleep' };
    }

    // Dangerously cold/hot: seek warmth/shelter urgently (high priority survival need)
    if (temperature) {
      if (temperature.state === 'dangerously_cold') {
        // console.log('[AISystem] Autonomic override: SEEK_WARMTH (dangerously_cold:', temperature.currentTemp.toFixed(1), '°C)');
        return { behavior: 'seek_warmth' };
      }
      // For 'cold' state, only seek warmth if agent has been cold for a while
      // This provides hysteresis so agents can leave fire to gather berries
      if (temperature.state === 'cold' && temperature.currentTemp < temperature.comfortMin - 3) {
        // console.log('[AISystem] Autonomic override: SEEK_WARMTH (cold:', temperature.currentTemp.toFixed(1), '°C)');
        return { behavior: 'seek_warmth' };
      }
    }

    // Hunger critical threshold: 10 (very hungry, but can still function)
    // Only interrupt if NOT critically exhausted (energy > 0)
    if (needs.hunger < 10 && needs.energy > 0) {
      return { behavior: 'seek_food' };
    }

    // High sleep drive: seek sleep only at high threshold (95+)
    // This ensures agents only sleep when truly tired, not prematurely
    // Energy-based sleep triggers are separate (forced_sleep at critical exhaustion)
    if (circadian) {
      // Only trigger seek_sleep at very high sleep drive (95+)
      // This gives agents a full "day" before needing sleep
      if (circadian.sleepDrive >= 95) {
        // console.log('[AISystem] Autonomic override: SEEK_SLEEP (sleepDrive >= 95:', circadian.sleepDrive.toFixed(1), ')');
        return { behavior: 'seek_sleep' };
      }
    }

    // Note: energy-based sleep is handled above via FORCED_SLEEP at energy <= 0

    // Moderate hunger: seek food (but not urgent enough to interrupt sleep)
    // TEMP: Lower threshold to 60 for testing berry gathering
    if (needs.hunger < 60) {
      return { behavior: 'seek_food' };
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
    const seenPlantIds: string[] = [];

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

    // Detect nearby plants
    const plants = world.query().with('plant').with('position').executeEntities();
    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>('position')!;
      const plant = plantImpl.getComponent<PlantComponent>('plant')!;

      const distance = Math.sqrt(
        Math.pow(plantPos.x - position.x, 2) +
        Math.pow(plantPos.y - position.y, 2)
      );

      if (distance <= vision.range) {
        // Track this plant in vision
        seenPlantIds.push(plantEntity.id);

        // Remember this plant location
        const updatedMemory = addMemory(
          memory,
          {
            type: 'plant_location',
            x: plantPos.x,
            y: plantPos.y,
            entityId: plantEntity.id,
            metadata: {
              speciesId: plant.speciesId,
              stage: plant.stage,
              hasSeeds: plant.seedsProduced > 0,
              hasFruit: (plant.fruitCount || 0) > 0
            },
          },
          world.tick,
          80
        );

        entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
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
      seenPlants: seenPlantIds,
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

      // Within hearing range (extended for group conversations - 50 tiles)
      const HEARING_RANGE = 50;
      if (distance <= HEARING_RANGE && otherAgentComp?.recentSpeech) {
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

  /**
   * Check for meeting calls and decide whether to attend based on relationship.
   */
  private processMeetingCalls(entity: EntityImpl, world: World): void {
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const vision = entity.getComponent<VisionComponent>('vision');
    const relationship = entity.getComponent<RelationshipComponent>('relationship');

    // Don't interrupt critical behaviors
    if (agent.behavior === 'forced_sleep' || agent.behavior === 'seek_sleep' ||
        agent.behavior === 'call_meeting' || agent.behavior === 'attend_meeting') {
      return;
    }

    if (!vision?.heardSpeech) return;

    // Check if we heard a meeting call
    for (const speech of vision.heardSpeech) {
      const text = speech.text.toLowerCase();

      // Detect meeting call phrases
      if (text.includes('calling a meeting') || text.includes('gather around')) {
        // Find the agent who called the meeting
        const agents = world.query().with('agent').with('position').executeEntities();

        for (const otherAgent of agents) {
          if (otherAgent.id === entity.id) continue;

          const otherImpl = otherAgent as EntityImpl;
          const identity = otherImpl.getComponent('identity') as any;
          const meeting = otherImpl.getComponent('meeting') as any;

          // Check if this agent has a meeting and their name matches the speaker
          if (meeting && identity?.name === speech.speaker) {
            // Decide whether to attend based on relationship
            const shouldAttend = this.shouldAttendMeeting(entity, otherAgent.id, relationship || null);

            if (shouldAttend) {
              const myIdentity = entity.getComponent('identity') as any;
              const myName = myIdentity?.name || 'Someone';

              console.log(`[Meeting] ${myName} heard ${speech.speaker}'s meeting call and is heading there!`);

              // Switch to attend_meeting behavior
              entity.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'attend_meeting',
                behaviorState: {
                  meetingCallerId: otherAgent.id,
                },
                lastThought: `I should attend ${speech.speaker}'s meeting`,
              }));
            } else {
              const myIdentity = entity.getComponent('identity') as any;
              const myName = myIdentity?.name || 'Someone';

              console.log(`[Meeting] ${myName} heard ${speech.speaker}'s meeting call but decided not to attend (low relationship)`);
            }

            return;
          }
        }
      }
    }
  }

  /**
   * Decide whether an agent should attend a meeting based on relationship with caller.
   */
  private shouldAttendMeeting(
    _entity: EntityImpl,
    callerId: string,
    relationship: RelationshipComponent | null
  ): boolean {
    if (!relationship) {
      // No relationship data - 50% chance to attend
      return Math.random() > 0.5;
    }

    // Get familiarity with the caller
    const callerRelation = relationship.relationships.get(callerId);
    const familiarity = callerRelation?.familiarity || 0;

    // Higher familiarity = more likely to attend
    // 0 familiarity = 30% chance
    // 50 familiarity = 65% chance
    // 100 familiarity = 100% chance
    const attendChance = 0.3 + (familiarity / 100) * 0.7;

    return Math.random() < attendChance;
  }

  private wanderBehavior(entity: EntityImpl): void {
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const position = entity.getComponent<PositionComponent>('position')!;

    // Re-enable steering system for wander behavior
    if (entity.hasComponent('steering')) {
      entity.updateComponent('steering', (current: any) => ({ ...current, behavior: 'wander' }));
    }

    // Check distance from origin (0, 0) - camp/spawn area
    const distanceFromHome = Math.sqrt(position.x * position.x + position.y * position.y);
    const maxWanderDistance = 12; // Maximum tiles from home before biasing back (tighter range)
    const criticalDistance = 20; // Beyond this, strongly pull back to home

    // Coherent wander: maintain direction with slight random jitter
    // Get or initialize wander angle from behavior state
    let wanderAngle = agent.behaviorState?.wanderAngle as number | undefined;
    if (wanderAngle === undefined) {
      // Initialize with random direction
      wanderAngle = Math.random() * Math.PI * 2;
    }

    // Progressive home bias based on distance
    if (distanceFromHome > criticalDistance) {
      // Very far - strongly pull back to home (90% bias)
      const angleToHome = Math.atan2(-position.y, -position.x);
      const angleDiff = angleToHome - wanderAngle;
      wanderAngle += angleDiff * 0.9; // Strong pull home
    } else if (distanceFromHome > maxWanderDistance) {
      // Moderately far - bias toward home (60% bias)
      const angleToHome = Math.atan2(-position.y, -position.x);
      const angleDiff = angleToHome - wanderAngle;
      wanderAngle += angleDiff * 0.6; // Moderate pull home
    } else {
      // Close to home - random wander with smaller jitter
      const jitterAmount = (Math.random() - 0.5) * (Math.PI / 12); // ±15° range (tighter spiral)
      wanderAngle += jitterAmount;
    }

    // Normalize angle to 0-2π range
    wanderAngle = wanderAngle % (Math.PI * 2);
    if (wanderAngle < 0) wanderAngle += Math.PI * 2;

    // Calculate velocity from angle
    const speed = movement.speed;
    const velocityX = Math.cos(wanderAngle) * speed;
    const velocityY = Math.sin(wanderAngle) * speed;

    // Update movement velocity
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX,
      velocityY,
    }));

    // Save wander angle for next tick
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        wanderAngle,
      },
    }));
  }

  private idleBehavior(entity: EntityImpl, world?: World): void {
    // Do nothing - just stop moving
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Emit idle event for journaling system (25% probability to avoid spam)
    if (world && Math.random() < 0.25) {
      world.eventBus.emit({
        type: 'agent:idle',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * Farm behavior - agent is performing farming actions.
   *
   * This behavior is triggered when agents autonomously decide to farm
   * or when farming actions (till, plant, harvest) are queued via ActionQueue.
   *
   * The agent stops moving and waits for queued farming actions to complete.
   * Actual tilling/planting/harvesting is handled by ActionQueue and action handlers.
   */
  private farmBehavior(entity: EntityImpl, _world: World): void {
    // Stop moving - agent is working on farming task
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // The actual farming actions (till, plant, water, harvest) are handled by:
    // 1. ActionQueue processes queued actions each tick
    // 2. TillActionHandler, PlantActionHandler, etc. validate and execute
    // 3. Agent remains in 'farm' behavior until action completes
    //
    // When action completes, AI system should switch behavior back to 'wander' or next goal
  }

  /**
   * Till behavior - agent prepares soil for farming by tilling nearby grass.
   *
   * This behavior finds untilled grass tiles within range and emits a 'till:requested'
   * event that the demo/main.ts can listen for to submit a till action to the ActionQueue.
   *
   * Agents with seeds will autonomously till nearby grass to prepare farmland.
   */
  private tillBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const inventory = entity.getComponent<InventoryComponent>('inventory');

    // Stop moving while deciding where to till
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Check if agent has seeds (motivation to till)
    const hasSeeds = inventory?.slots?.some((slot: any) =>
      slot.itemId && (slot.itemId.includes('seed') || slot.itemId === 'wheat_seed' || slot.itemId === 'carrot_seed')
    );

    if (!hasSeeds) {
      // No seeds - switch back to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        currentBehavior: 'wander',
      }));
      return;
    }

    // Find nearest untilled grass tile within range
    const searchRadius = 10; // Search within 10 tiles
    let nearestGrassTile: { x: number; y: number; distance: number } | null = null;

    const worldWithTiles = world as any;
    if (typeof worldWithTiles.getTileAt !== 'function') {
      console.warn('[AISystem:tillBehavior] World does not have getTileAt - cannot find tiles to till');
      return;
    }

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const checkX = Math.floor(position.x) + dx;
        const checkY = Math.floor(position.y) + dy;

        const tile = worldWithTiles.getTileAt(checkX, checkY);
        if (!tile) continue;

        // Check if this is untilled grass
        if ((tile.terrain === 'grass' || tile.terrain === 'dirt') && !tile.tilled) {
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (!nearestGrassTile || distance < nearestGrassTile.distance) {
            nearestGrassTile = { x: checkX, y: checkY, distance };
          }
        }
      }
    }

    if (!nearestGrassTile) {
      console.log(`[AISystem:tillBehavior] Agent ${entity.id.slice(0, 8)} found no untilled grass nearby - switching to wander`);
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        currentBehavior: 'wander',
      }));
      return;
    }

    // Check if agent is adjacent to the target tile (distance <= √2)
    const dx = nearestGrassTile.x - position.x;
    const dy = nearestGrassTile.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_TILL_DISTANCE = Math.sqrt(2); // Must be adjacent (including diagonal)

    if (distance > MAX_TILL_DISTANCE) {
      // Agent is too far - pathfind to adjacent position first
      console.log(`[AISystem:tillBehavior] Agent ${entity.id.slice(0, 8)} moving to tile (${nearestGrassTile.x}, ${nearestGrassTile.y}) for tilling`);

      // Normalize direction vector to get speed=1.0
      const speed = 1.0;
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      // Continuously update velocity toward target (handles obstacle avoidance recovery)
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        targetX: nearestGrassTile.x,
        targetY: nearestGrassTile.y,
        velocityX,
        velocityY,
      }));

      // Stay in till behavior - will retry next tick when closer
      return;
    }

    // Agent is adjacent - emit event requesting tilling
    // The demo/main.ts listens for this and submits the action to ActionQueue
    console.log(`[AISystem:tillBehavior] Agent ${entity.id.slice(0, 8)} requesting till at (${nearestGrassTile.x}, ${nearestGrassTile.y}), distance=${distance.toFixed(2)}`);

    world.eventBus.emit({
      type: 'action:till',
      source: entity.id,
      data: {
        x: nearestGrassTile.x,
        y: nearestGrassTile.y,
        agentId: entity.id,
      },
    });

    // Switch to farm behavior to wait for action completion
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      currentBehavior: 'farm',
      behaviorCompleted: true, // Signal completion after tilling action is queued
    }));
  }

  // @ts-expect-error - Unused behavior method kept for future use
  private _seekFoodBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const memory = entity.getComponent<MemoryComponent>('memory');

    let targetFood: Entity | null = null;
    let targetPos: { x: number; y: number } | null = null;
    let nearestDistance = Infinity;
    let isPlantTarget = false; // Track if target is a plant (vs resource)
    let isStorageTarget = false; // Track if target is storage building

    // Known edible plant species (speciesId values)
    const EDIBLE_SPECIES = ['berry-bush'];

    // FIRST PRIORITY: Check storage buildings for food
    // This ensures agents use stockpiled food before foraging
    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .with('position')
      .executeEntities();

    for (const storage of storageBuildings) {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>('building');
      const storageInv = storageImpl.getComponent<InventoryComponent>('inventory');
      const storagePos = storageImpl.getComponent<PositionComponent>('position');

      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      // Check if storage has food
      const hasFood = storageInv?.slots.some(slot => slot.itemId === 'food' && slot.quantity > 0);

      if (hasFood && storagePos) {
        const distance = Math.sqrt(
          Math.pow(storagePos.x - position.x, 2) +
          Math.pow(storagePos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          targetFood = storage;
          targetPos = { x: storagePos.x, y: storagePos.y };
          isStorageTarget = true;
          isPlantTarget = false;
        }
      }
    }

    // Second, check memories for known food locations
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
                isPlantTarget = false;
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

    // If no memory or memory is stale, search for food resources
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
            isPlantTarget = false;
          }
        }
      }
    }

    // Also search for edible plants (berry bushes) with fruit
    const plants = world
      .query()
      .with('plant')
      .with('position')
      .executeEntities();

    for (const plant of plants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>('plant');
      const plantPos = plantImpl.getComponent<PositionComponent>('position')!;

      if (!plantComp) continue;

      // Check if this is an edible plant with fruit to harvest
      const isEdible = EDIBLE_SPECIES.includes(plantComp.speciesId);
      const hasFruit = plantComp.fruitCount > 0;
      const isHarvestableStage = ['fruiting', 'mature', 'seeding'].includes(plantComp.stage);

      if (isEdible && hasFruit && isHarvestableStage) {
        const distance = Math.sqrt(
          Math.pow(plantPos.x - position.x, 2) +
          Math.pow(plantPos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          targetFood = plant;
          targetPos = { x: plantPos.x, y: plantPos.y };
          isPlantTarget = true;
        }
      }
    }

    if (!targetFood && !targetPos) {
      // No food found, wander
      this.wanderBehavior(entity);
      return;
    }

    // Get target position
    if (targetFood && !targetPos) {
      const targetFoodImpl = targetFood as EntityImpl;
      const pos = targetFoodImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    }

    if (!targetPos) return;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5 && targetFood) {
      const targetFoodImpl = targetFood as EntityImpl;

      if (isStorageTarget) {
        // Take food from storage building
        // Find food in storage and take it
        let foodTaken = 0;
        targetFoodImpl.updateComponent<InventoryComponent>('inventory', (current) => {
          const updatedSlots = current.slots.map(slot => {
            if (slot.itemId === 'food' && slot.quantity > 0 && foodTaken === 0) {
              const takeAmount = Math.min(20, slot.quantity);
              foodTaken = takeAmount;
              return { ...slot, quantity: slot.quantity - takeAmount };
            }
            return slot;
          });
          return { ...current, slots: updatedSlots };
        });

        if (foodTaken > 0) {
          // Update agent's hunger
          const needs = entity.getComponent<NeedsComponent>('needs');
          if (needs) {
            entity.updateComponent<NeedsComponent>('needs', (current) => ({
              ...current,
              hunger: Math.min(100, current.hunger + foodTaken),
            }));
          }

          // Emit event
          world.eventBus.emit({
            type: 'agent:ate',
            source: entity.id,
            data: {
              agentId: entity.id,
              foodType: 'forage',
              hungerRestored: foodTaken,
              amount: foodTaken,
              storageId: targetFood.id,
              fromStorage: true,
            },
          });
        }
      } else if (isPlantTarget) {
        // Harvest food from edible plant using harvest action
        const plantComp = targetFoodImpl.getComponent<PlantComponent>('plant')!;

        console.log(`[AISystem] Agent ${entity.id.slice(0,8)} requesting harvest of ${plantComp.speciesId} plant ${targetFood.id.slice(0,8)} (fruitCount: ${plantComp.fruitCount})`);

        // Emit harvest action request (will be handled by ActionQueue)
        const plantPos = targetFoodImpl.getComponent<PositionComponent>('position');
        world.eventBus.emit({
          type: 'action:harvest',
          source: entity.id,
          data: {
            actionId: `harvest_${Date.now()}`,
            actorId: entity.id,
            agentId: entity.id,
            plantId: targetFood.id,
            speciesId: plantComp.speciesId,
            harvested: [],
            position: plantPos ? { x: plantPos.x, y: plantPos.y } : { x: 0, y: 0 },
          },
        });

        // Switch to a harvest behavior (using 'farm' behavior as a waiting state)
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'farm',
          behaviorState: { targetPlantId: targetFood.id, action: 'harvest' },
        }));

        // Reinforce memory of this food location
        if (memory) {
          const updatedMemory = addMemory(
            memory,
            {
              type: 'resource_location',
              x: targetPos.x,
              y: targetPos.y,
              entityId: targetFood.id,
              metadata: { resourceType: 'food', plantSpecies: plantComp.speciesId },
            },
            world.tick,
            100
          );
          entity.updateComponent<MemoryComponent>('memory', () => updatedMemory);
        }
      } else {
        // Harvest from resource (original behavior)
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

        // Emit harvest event
        world.eventBus.emit({
          type: 'agent:harvested',
          source: entity.id,
          data: {
            agentId: entity.id,
            plantId: targetFood.id,
            speciesId: resourceComp.type || 'unknown',
            position: { x: targetPos.x, y: targetPos.y },
            harvested: [{ itemId: resourceComp.type || 'forage', amount: harvestAmount }],
            resourceId: targetFood.id,
          },
        });
      }

      // Stop moving while harvesting/eating
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));

      // Check if behavior completed (hunger satisfied)
      const needs = entity.getComponent<NeedsComponent>('needs');
      if (needs && needs.hunger > 40) {
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behaviorCompleted: true,
        }));
      }
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

      // Emit conversation:utterance event for episodic memory formation
      world.eventBus.emit({
        type: 'conversation:utterance',
        source: entity.id,
        data: {
          conversationId: `${entity.id}-${partnerId}`,
          speaker: entity.id,
          speakerId: entity.id,
          listenerId: partnerId,
          message: message,
        },
      });
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
              informationType: 'resource_location',
              content: { x: sharedMemory.x, y: sharedMemory.y, entityId: sharedMemory.entityId },
              memoryType: 'resource_location',
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

    // Disable steering system so it doesn't override our gather movement
    if (entity.hasComponent('steering')) {
      entity.updateComponent('steering', (current: any) => ({ ...current, behavior: 'none' }));
    }

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

    // Search for visible resources (always search, don't rely on stale memories)
    // IMPORTANT: Only search within reasonable range to prevent agents from wandering across the entire map
    const maxGatherRange = 50; // tiles - agents won't navigate further than this to gather resources
    const homeRadius = 15; // Prefer resources within this radius of home (0, 0)

    // Always search visible resources first (fresh data is better than memory)
    const resources = world
      .query()
      .with('resource')
      .with('position')
      .executeEntities();

    let bestScore = Infinity;

    for (const resource of resources) {
        const resourceImpl = resource as EntityImpl;
        const resourceComp = resourceImpl.getComponent<ResourceComponent>('resource')!;
        const resourcePos = resourceImpl.getComponent<PositionComponent>('position')!;

        // Skip non-harvestable resources
        if (!resourceComp.harvestable) continue;
        if (resourceComp.amount <= 0) continue;

        // If preferred type specified, only consider that type
        if (preferredType && resourceComp.resourceType !== preferredType) continue;

        // Distance from agent to resource
        const distanceToAgent = Math.sqrt(
          Math.pow(resourcePos.x - position.x, 2) +
          Math.pow(resourcePos.y - position.y, 2)
        );

        // Only consider resources within max gather range
        if (distanceToAgent > maxGatherRange) continue;

        // Distance from resource to home (0, 0)
        const distanceToHome = Math.sqrt(
          resourcePos.x * resourcePos.x +
          resourcePos.y * resourcePos.y
        );

        // Scoring: prefer resources near home AND near agent
        // If resource is within home radius, heavily favor it
        let score = distanceToAgent;
        if (distanceToHome > homeRadius) {
          // Penalize resources far from home (add 2x the excess distance)
          score += (distanceToHome - homeRadius) * 2.0;
        }

        if (score < bestScore) {
          bestScore = score;
          nearestDistance = distanceToAgent;
          targetResource = resource;
        }
      }

    // Also search for plants with seeds (farming-system/spec.md lines 296-343)
    // Agents can gather seeds from wild plants at mature/seeding/senescence stages
    // ALWAYS search for seed-producing plants, even when gathering resources
    let targetPlant: Entity | null = null;
    let isPlantTarget = false;
    let plantDistance = Infinity;

    const plants = world
      .query()
      .with('plant')
      .with('position')
      .executeEntities();

    for (const plant of plants) {
      const plantImpl = plant as EntityImpl;
      const plantComp = plantImpl.getComponent<PlantComponent>('plant');
      const plantPos = plantImpl.getComponent<PositionComponent>('position')!;

      if (!plantComp) continue;

      // Check if plant has seeds available for gathering
      const validStages = ['mature', 'seeding', 'senescence'];
      const hasSeeds = plantComp.seedsProduced > 0;
      const isValidStage = validStages.includes(plantComp.stage);

      if (hasSeeds && isValidStage) {
        const distance = Math.sqrt(
          Math.pow(plantPos.x - position.x, 2) +
          Math.pow(plantPos.y - position.y, 2)
        );

        if (distance < plantDistance) {
          plantDistance = distance;
          targetPlant = plant;
          isPlantTarget = true;
        }
      }
    }

    // Prioritize seeds over resources if:
    // 1. No resource found, OR
    // 2. Plant is significantly closer (2x), OR
    // 3. Agent has enough wood/stone already (10+ of the preferred type)
    if (targetPlant && targetResource) {
      const hasEnoughPreferred = preferredType
        ? inventory.slots.some(s => s.itemId === preferredType && s.quantity >= 10)
        : false;

      if (plantDistance * 2 < nearestDistance || hasEnoughPreferred) {
        // Prefer plant over resource
        targetResource = null;
        targetPos = null;
      } else {
        // Prefer resource over plant
        targetPlant = null;
        isPlantTarget = false;
      }
    }

    // Update targetPos for plant if it's the chosen target
    if (targetPlant && isPlantTarget && !targetResource) {
      const targetPlantImpl = targetPlant as EntityImpl;
      const plantPos = targetPlantImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: plantPos.x, y: plantPos.y };
    }

    if (!targetResource && !targetPlant && !targetPos) {
      // No resources or seed-producing plants found, wander
      // console.log(`[AISystem] Agent ${entity.id} in gather behavior but found no resources (preferredType: ${preferredType}), wandering`);
      this.wanderBehavior(entity);
      return;
    }

    // Get target position
    if (targetResource) {
      const targetResourceImpl = targetResource as EntityImpl;
      const pos = targetResourceImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    } else if (targetPlant) {
      const targetPlantImpl = targetPlant as EntityImpl;
      const pos = targetPlantImpl.getComponent<PositionComponent>('position')!;
      targetPos = { x: pos.x, y: pos.y };
    }

    if (!targetPos) return;

    // Check if adjacent (within 1.5 tiles)
    if (nearestDistance < 1.5 && (targetResource || targetPlant)) {
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
          // Too exhausted to work - stop completely
          // Per CLAUDE.md: no silent fallbacks - agents MUST rest when critically exhausted
          entity.updateComponent<MovementComponent>('movement', (current: MovementComponent) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));

          // Force agent to stop gathering and rest
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'idle', // Stop working entirely
            behaviorState: {},
          }));

          // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} too exhausted to work (energy: ${energy.toFixed(1)}), forcing idle`);
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

      // Harvest resource or gather seeds from plant
      if (targetResource) {
        // Harvesting from resource node (wood, stone, etc.)
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

        // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} harvesting ${harvestAmount} ${resourceComp.resourceType} from ${targetResource.id} (work speed: ${(workSpeedMultiplier * 100).toFixed(0)}%)`);

        // Update resource
        targetResourceImpl.updateComponent<ResourceComponent>('resource', (current) => ({
          ...current,
          amount: Math.max(0, current.amount - harvestAmount),
        }));

        // Add to inventory
        try {
          const result = addToInventory(inventory, resourceComp.resourceType, harvestAmount);
          entity.updateComponent<InventoryComponent>('inventory', () => result.inventory);

          // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} added ${result.amountAdded} ${resourceComp.resourceType} to inventory (weight: ${result.inventory.currentWeight}/${inventory.maxWeight}, slots: ${result.inventory.slots.filter(s => s.itemId).length}/${inventory.maxSlots})`);

          // Check if inventory is now full or nearly full
          if (result.inventory.currentWeight >= result.inventory.maxWeight) {
          // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} inventory full after gathering (${result.inventory.currentWeight}/${result.inventory.maxWeight})`);

          world.eventBus.emit({
            type: 'inventory:full',
            source: entity.id,
            data: {
              entityId: entity.id,
              agentId: entity.id,
            },
          });

          // Switch to deposit_items behavior
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'deposit_items',
            behaviorState: {
              previousBehavior: 'gather',
              previousState: current.behaviorState,
            },
            behaviorCompleted: true, // Signal completion when inventory is full
          }));

          // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} switching to deposit_items behavior`);
          return;
        }

        // Check if we're gathering for a building
        if (agent.behaviorState?.returnToBuild) {
          const buildingType = agent.behaviorState.returnToBuild as BuildingType;
          const blueprint = (world as any).buildingRegistry?.tryGet(buildingType);

          if (blueprint) {
            const stillMissing = this.getMissingResources(result.inventory, blueprint.resourceCost);

            if (stillMissing.length === 0) {
              // We have everything! Switch to build
              // console.log(`[AISystem] Agent ${entity.id} gathered all resources, switching to build ${buildingType}`);

              entity.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'build',
                behaviorState: { buildingType },
              }));

              return;
            } else if (stillMissing.length > 0) {
              // Still missing something, keep gathering
              const nextMissing = stillMissing[0]!; // Safe: we checked length > 0
              // console.log(`[AISystem] Agent ${entity.id} still needs ${nextMissing.amountRequired} ${nextMissing.resourceId}, continuing to gather`);

              entity.updateComponent<AgentComponent>('agent', (current) => ({
                ...current,
                behavior: 'gather',
                behaviorState: {
                  resourceType: nextMissing.resourceId,
                  targetAmount: nextMissing.amountRequired,
                  returnToBuild: buildingType,
                },
              }));

              return;
            }
          }
        }

        // Emit resource gathered event
        const resourcePos = targetResourceImpl.getComponent<PositionComponent>('position');
        world.eventBus.emit({
          type: 'resource:gathered',
          source: entity.id,
          data: {
            agentId: entity.id,
            resourceType: resourceComp.resourceType,
            amount: result.amountAdded,
            position: resourcePos ? { x: resourcePos.x, y: resourcePos.y } : { x: 0, y: 0 },
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
              resourceId: targetResource.id,
              resourceType: resourceComp.resourceType,
              agentId: entity.id,
            },
          });
        }
      } catch (error) {
        // Inventory full or weight limit exceeded
        // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} inventory full: ${(error as Error).message} (weight: ${inventory.currentWeight}/${inventory.maxWeight})`);

        world.eventBus.emit({
          type: 'inventory:full',
          source: entity.id,
          data: {
            entityId: entity.id,
            agentId: entity.id,
          },
        });

        // Switch to deposit_items behavior, saving previous behavior to return to
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'deposit_items',
          behaviorState: {
            previousBehavior: 'gather',
            previousState: current.behaviorState,
          },
        }));

        // console.log(`[AISystem.gatherBehavior] Agent ${entity.id} switching to deposit_items behavior`);
      }
    } else if (targetPlant && isPlantTarget) {
        // Gathering seeds from plant (farming-system/spec.md lines 296-343)
        const targetPlantImpl = targetPlant as EntityImpl;
        const plantComp = targetPlantImpl.getComponent<PlantComponent>('plant');

        if (!plantComp) {
          // Plant component missing, can't gather
          return;
        }

        // Calculate seed yield based on plant health and agent skill
        // Formula from spec: baseSeedCount * (health/100) * stageMod * skillMod
        const baseSeedCount = 5; // Base seeds for gathering (vs 10 for harvest action)
        const healthMod = plantComp.health / 100;
        const stageMod = plantComp.stage === 'seeding' ? 1.5 : 1.0;
        const farmingSkill = 50; // Default skill (TODO: get from agent skills when implemented)
        const skillMod = 0.5 + (farmingSkill / 100);

        const seedYield = Math.floor(baseSeedCount * healthMod * stageMod * skillMod * workSpeedMultiplier);
        const seedsToGather = Math.min(seedYield, plantComp.seedsProduced);

        if (seedsToGather <= 0) {
          // No seeds to gather
          return;
        }

        // Create seed item ID for inventory (e.g., "seed-wheat", "seed-berry-bush")
        const seedItemId = `seed-${plantComp.speciesId}`;

        try {
          const result = addToInventory(inventory, seedItemId, seedsToGather);
          entity.updateComponent<InventoryComponent>('inventory', () => result.inventory);

          console.log(`[AISystem.gatherBehavior] Agent ${entity.id} gathered ${result.amountAdded} ${seedItemId} from ${targetPlant.id}`);

          // Update plant - reduce seedsProduced
          targetPlantImpl.updateComponent<PlantComponent>('plant', (current) => {
            const updated = Object.create(Object.getPrototypeOf(current));
            Object.assign(updated, current);
            updated.seedsProduced = Math.max(0, current.seedsProduced - result.amountAdded);
            return updated;
          });

          // Emit seed:gathered event
          world.eventBus.emit({
            type: 'seed:gathered',
            source: entity.id,
            data: {
              agentId: entity.id,
              plantId: targetPlant.id,
              speciesId: plantComp.speciesId,
              seedCount: result.amountAdded,
              sourceType: 'wild' as const,
              position: targetPos,
            },
          });

          // Check if inventory is now full
          if (result.inventory.currentWeight >= result.inventory.maxWeight) {
            world.eventBus.emit({
              type: 'inventory:full',
              source: entity.id,
              data: {
                entityId: entity.id,
                agentId: entity.id,
              },
            });

            entity.updateComponent<AgentComponent>('agent', (current) => ({
              ...current,
              behavior: 'deposit_items',
              behaviorState: {
                previousBehavior: 'gather',
                previousState: current.behaviorState,
              },
              behaviorCompleted: true,
            }));

            return;
          }
        } catch (error) {
          // Inventory full
          console.log(`[AISystem.gatherBehavior] Agent ${entity.id} inventory full: ${(error as Error).message}`);

          world.eventBus.emit({
            type: 'inventory:full',
            source: entity.id,
            data: {
              entityId: entity.id,
              agentId: entity.id,
            },
          });

          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'deposit_items',
            behaviorState: {
              previousBehavior: 'gather',
              previousState: current.behaviorState,
            },
          }));
        }
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

      // Update both movement and velocity components (MovementSystem syncs velocity→movement)
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));

      // Also update velocity component so MovementSystem doesn't override with old steering values
      if (entity.hasComponent('velocity')) {
        entity.updateComponent('velocity', (current: any) => ({
          ...current,
          vx: velocityX,
          vy: velocityY,
        }));
      }
    }
  }

  /**
   * Check what resources are missing for a building.
   * Returns array of missing resources with amounts needed.
   */
  private getMissingResources(
    inventory: InventoryComponent,
    costs: ResourceCost[]
  ): ResourceCost[] {
    const missing: ResourceCost[] = [];

    for (const cost of costs) {
      const available = inventory.slots
        .filter((s: any) => s.itemId === cost.resourceId)
        .reduce((sum: number, s: any) => sum + s.quantity, 0);

      if (available < cost.amountRequired) {
        missing.push({
          resourceId: cost.resourceId,
          amountRequired: cost.amountRequired - available,
        });
      }
    }

    return missing;
  }

  /**
   * Find a valid spot to place a building near the agent.
   * Searches in expanding radius around agent's position.
   */
  private findValidBuildSpot(
    world: World,
    agentPos: PositionComponent,
    _width: number,
    _height: number
  ): { x: number; y: number } | null {
    // Try positions in expanding radius around agent
    for (let radius = 0; radius <= 2; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const testX = Math.floor(agentPos.x) + dx;
          const testY = Math.floor(agentPos.y) + dy;

          // Check if this spot is valid (not in water, no buildings, etc.)
          const terrain = (world as any).getTerrainAt?.(testX, testY);
          if (terrain && (terrain === 'grass' || terrain === 'dirt' || terrain === 'sand')) {
            // Check no existing buildings
            const buildings = world.query().with('building').with('position').executeEntities();
            let blocked = false;

            for (const building of buildings) {
              const bPos = (building as any).getComponent('position');
              if (bPos && Math.abs(bPos.x - testX) < 2 && Math.abs(bPos.y - testY) < 2) {
                blocked = true;
                break;
              }
            }

            if (!blocked) {
              return { x: testX, y: testY };
            }
          }
        }
      }
    }

    return null; // No valid spot found
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

    console.log(`[BUILD] Agent ${entity.id.slice(0,8)} attempting to build ${buildingType}`);

    // Validate building type
    const validTypes: BuildingType[] = ['workbench', 'storage-chest', 'campfire', 'tent', 'well', 'lean-to', 'storage-box', 'bed', 'bedroll'];
    if (!validTypes.includes(buildingType)) {
      buildingType = 'lean-to'; // Default to lean-to for shelter
    }

    if (!inventory) {
      // No inventory - cannot build
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: 'Agent missing InventoryComponent',
          builderId: entity.id,
        },
      });

      // Switch back to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Get blueprint to check resource requirements
    const blueprint = (world as any).buildingRegistry?.tryGet(buildingType);
    if (!blueprint) {
      console.error(`[AISystem] Unknown building type: ${buildingType}`);
      // Fall back to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Check what resources we're missing
    const missing = this.getMissingResources(inventory, blueprint.resourceCost);

    if (missing.length > 0) {
      // Switch to gathering the first missing resource
      const firstMissing = missing[0]!; // Safe: we checked length > 0
      console.log(`[BUILD] Agent ${entity.id.slice(0,8)} missing ${firstMissing.amountRequired} ${firstMissing.resourceId}, switching to gather`);

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType: firstMissing.resourceId,
          targetAmount: firstMissing.amountRequired,
          returnToBuild: buildingType, // Remember what we're gathering for
        },
      }));

      world.eventBus.emit({
        type: 'construction:gathering_resources',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          agentId: entity.id,
          builderId: entity.id,
        },
      });

      return;
    }

    // Find valid build spot near agent
    const buildSpot = this.findValidBuildSpot(
      world,
      position,
      blueprint.width || 1,
      blueprint.height || 1
    );

    if (!buildSpot) {
      // No valid spot found nearby
      // console.log(`[AISystem] Agent ${entity.id} cannot find valid spot to build ${buildingType}`);

      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: 'No valid placement location found',
          builderId: entity.id,
        },
      });

      // Switch back to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const buildX = buildSpot.x;
    const buildY = buildSpot.y;

    // Convert agent inventory to resource record format
    const agentInventoryRecord: Record<string, number> = {};
    for (const slot of inventory.slots) {
      if (slot.itemId) {
        agentInventoryRecord[slot.itemId] = (agentInventoryRecord[slot.itemId] || 0) + slot.quantity;
      }
    }

    // Aggregate resources from agent + all storage buildings
    const totalResources = this.aggregateAvailableResources(world, agentInventoryRecord);

    // Try to initiate construction (this validates resources and deducts them from totalResources)
    try {
      world.initiateConstruction(
        { x: buildX, y: buildY },
        buildingType,
        totalResources
      );

      // Note: world.initiateConstruction() mutates totalResources to deduct consumed items.
      // Resource deduction is handled by world.initiateConstruction() which validates and
      // deducts from the totalResources record. For MVP, the resource tracking is sufficient.
      // Future: Implement sync back to actual storage inventories if needed for accuracy.

      console.log(`[BUILD] ✓ Agent ${entity.id.slice(0,8)} started building ${buildingType} at (${buildX}, ${buildY})`);

      // Switch back to wandering after initiating construction
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    } catch (error) {
      // Construction failed (insufficient resources or validation error)
      console.log(`[BUILD] ✗ Agent ${entity.id.slice(0,8)} construction failed: ${(error as Error).message}`);

      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: (error as Error).message,
          builderId: entity.id,
        },
      });

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
      this.idleBehavior(entity, world);
      return;
    }

    // If already sleeping, do nothing (SleepSystem handles wake conditions)
    if (circadian.isSleeping) {
      this.idleBehavior(entity, world);
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
      // Per CLAUDE.md: Must preserve class methods when updating
      entity.updateComponent('circadian', (current: any) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.isSleeping = true;
        updated.sleepStartTime = world.tick;
        updated.sleepLocation = bestSleepLocation;
        updated.sleepQuality = quality;
        updated.sleepDurationHours = 0; // Reset sleep duration counter
        return updated;
      });

      // Emit sleep events
      world.eventBus.emit({
        type: 'agent:sleeping',
        source: entity.id,
        data: {
          agentId: entity.id,
          entityId: entity.id,
          location: { x: position.x, y: position.y },
          timestamp: world.tick,
        },
      });

      // Emit sleep_start event for reflection/consolidation systems
      world.eventBus.emit({
        type: 'agent:sleep_start',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: world.tick,
        },
      });

      // console.log(`[AISystem] Agent ${entity.id} is sleeping in a bed (quality: ${quality.toFixed(2)})`);

      // Stop moving
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));

      // Behavior completed when sleeping starts
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behaviorCompleted: true,
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

      // Per CLAUDE.md: Must preserve class methods when updating
      entity.updateComponent('circadian', (current: any) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.isSleeping = true;
        updated.sleepStartTime = world.tick;
        updated.sleepLocation = null;
        updated.sleepQuality = quality;
        updated.sleepDurationHours = 0; // Reset sleep duration counter
        return updated;
      });

      world.eventBus.emit({
        type: 'agent:sleeping',
        source: entity.id,
        data: {
          agentId: entity.id,
          entityId: entity.id,
          timestamp: world.tick,
          location: { x: position.x, y: position.y },
        },
      });

      // Emit sleep_start event for reflection/consolidation systems
      world.eventBus.emit({
        type: 'agent:sleep_start',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: world.tick,
        },
      });

      // console.log(`[AISystem] Agent ${entity.id} is sleeping on the ground (quality: ${quality.toFixed(2)})`);

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
      this.idleBehavior(entity, world);
      return;
    }

    // If not already sleeping, start now (collapse where standing)
    if (!circadian.isSleeping) {
      const quality = 0.5; // Poor sleep quality when collapsed on ground

      // Update circadian component directly
      // Per CLAUDE.md: Must preserve class methods when updating
      entity.updateComponent('circadian', (current: any) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.isSleeping = true;
        updated.sleepStartTime = world.tick;
        updated.sleepLocation = null;
        updated.sleepQuality = quality;
        updated.sleepDurationHours = 0; // Reset sleep duration counter
        return updated;
      });

      world.eventBus.emit({
        type: 'agent:collapsed',
        source: entity.id,
        data: {
          agentId: entity.id,
          reason: 'exhaustion',
          entityId: entity.id,
        },
      });

      // Emit sleep_start event for reflection/consolidation systems
      world.eventBus.emit({
        type: 'agent:sleep_start',
        source: entity.id,
        data: {
          agentId: entity.id,
          timestamp: world.tick,
        },
      });

      // console.log(`[AISystem] Agent ${entity.id} collapsed from exhaustion`);
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

  /**
   * Deposit items behavior: Find storage building and deposit inventory items.
   * Triggered when agent inventory is full during gathering.
   */
  private _depositItemsBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    const agent = entity.getComponent<AgentComponent>('agent')!;

    if (!inventory) {
      // No inventory, nothing to deposit - switch to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Check if we have items to deposit
    const hasItems = inventory.slots.some(slot => slot.itemId && slot.quantity > 0);
    if (!hasItems) {
      // console.log(`[AISystem] Agent ${entity.id} has no items to deposit, returning to previous behavior`);

      // Restore previous behavior if stored, otherwise wander
      const previousBehavior = agent.behaviorState?.previousBehavior as AgentBehavior | undefined;
      const previousState = agent.behaviorState?.previousState as Record<string, unknown> | undefined;

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: previousBehavior || 'wander',
        behaviorState: previousState || {},
      }));
      return;
    }

    // Find storage buildings with inventory components
    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .with('position')
      .executeEntities();

    // Filter for storage-chest and storage-box types
    const validStorage = storageBuildings.filter(storage => {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>('building');
      if (!building) return false;

      return (
        (building.buildingType === 'storage-chest' || building.buildingType === 'storage-box') &&
        building.isComplete // Only deposit to completed buildings
      );
    });

    if (validStorage.length === 0) {
      // No storage available
      // console.log(`[AISystem] Agent ${entity.id} found no storage buildings, switching to wander`);

      world.eventBus.emit({
        type: 'storage:not_found',
        source: entity.id,
        data: { agentId: entity.id },
      });

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Find nearest storage with available capacity
    let nearestStorage: Entity | null = null;
    let nearestDistance = Infinity;
    const lastStorageId = agent.behaviorState?.lastStorageId as string | undefined;

    for (const storage of validStorage) {
      const storageImpl = storage as EntityImpl;
      const storagePos = storageImpl.getComponent<PositionComponent>('position')!;
      const storageInventory = storageImpl.getComponent<InventoryComponent>('inventory')!;

      // Skip storage we just used (to avoid infinite loop)
      if (lastStorageId && storage.id === lastStorageId) {
        continue;
      }

      // Check if storage has capacity
      if (storageInventory.currentWeight >= storageInventory.maxWeight) {
        continue; // Storage is full
      }

      const distance = Math.sqrt(
        Math.pow(storagePos.x - position.x, 2) +
        Math.pow(storagePos.y - position.y, 2)
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestStorage = storage;
      }
    }

    if (!nearestStorage) {
      // No storage available (all full or we're skipping the last one used)
      world.eventBus.emit({
        type: 'storage:full',
        source: entity.id,
        data: {
          storageId: 'all-storage-full',
          agentId: entity.id
        },
      });

      // Build more storage instead of giving up
      // Switch to build behavior - auto-gather will kick in if resources are missing
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'build',
        behaviorState: {
          buildingType: 'storage-chest',
          previousBehavior: current.behaviorState?.previousBehavior,
          previousState: current.behaviorState?.previousState,
        },
      }));
      return;
    }

    const nearestStorageImpl = nearestStorage as EntityImpl;
    const storagePos = nearestStorageImpl.getComponent<PositionComponent>('position')!;

    // Check if adjacent to storage (within 1.5 tiles)
    if (nearestDistance < 1.5) {
      // Perform deposit
      const storageInventory = nearestStorageImpl.getComponent<InventoryComponent>('inventory')!;
      const itemsDeposited: Array<{ itemId: string; amount: number }> = [];

      // Create mutable copies of inventories
      let agentInv = { ...inventory, slots: [...inventory.slots.map(s => ({ ...s }))] };
      let storageInv = { ...storageInventory, slots: [...storageInventory.slots.map(s => ({ ...s }))] };

      // Transfer items from agent to storage
      for (const slot of agentInv.slots) {
        if (!slot.itemId || slot.quantity === 0) continue;

        const itemId = slot.itemId;
        const quantityToTransfer = slot.quantity;

        // Check if it's a resource type
        if (!isResourceType(itemId)) continue;

        // Calculate how much can fit in storage
        const unitWeight = getResourceWeight(itemId as any);
        const availableWeight = storageInv.maxWeight - storageInv.currentWeight;
        const maxByWeight = Math.floor(availableWeight / unitWeight);
        const amountToTransfer = Math.min(quantityToTransfer, maxByWeight);

        if (amountToTransfer === 0) {
          continue; // Storage full for this item type
        }

        try {
          // Remove from agent inventory
          const removeResult = removeFromInventory(agentInv, itemId, amountToTransfer);
          agentInv = removeResult.inventory;

          // Add to storage inventory
          const addResult = addToInventory(storageInv, itemId, amountToTransfer);
          storageInv = addResult.inventory;

          itemsDeposited.push({
            itemId: itemId,
            amount: amountToTransfer,
          });

          // console.log(`[AISystem] Agent ${entity.id} deposited ${amountToTransfer} ${itemId} into storage ${nearestStorage.id}`);
        } catch (error) {
          // Storage became full during transfer
          // console.log(`[AISystem] Storage transfer interrupted: ${(error as Error).message}`);
          break;
        }
      }

      // Update both entities with new inventories
      entity.updateComponent<InventoryComponent>('inventory', () => agentInv);
      nearestStorageImpl.updateComponent<InventoryComponent>('inventory', () => storageInv);

      // Emit deposit event
      if (itemsDeposited.length > 0) {
        world.eventBus.emit({
          type: 'items:deposited',
          source: entity.id,
          data: {
            agentId: entity.id,
            storageId: nearestStorage.id,
            items: itemsDeposited.map(item => ({
              itemId: item.itemId,
              amount: item.amount,
            })),
          },
        });
      }

      // Check if agent still has items
      const stillHasItems = agentInv.slots.some(slot => slot.itemId && slot.quantity > 0);

      if (stillHasItems) {
        // Check if we deposited anything
        if (itemsDeposited.length === 0) {
          // Storage was completely full, couldn't deposit anything
          // console.log(`[AISystem] Agent ${entity.id} found storage full, cannot deposit`);

          world.eventBus.emit({
            type: 'storage:full',
            source: entity.id,
            data: {
              storageId: nearestStorage.id,
              agentId: entity.id
            },
          });

          // Switch to wander since storage is full
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'wander',
            behaviorState: {},
          }));

          // Stop moving
          entity.updateComponent<MovementComponent>('movement', (current) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
        } else {
          // Deposited some but not all - need to find another storage
          // Mark the current storage as recently used so we don't immediately try it again
          // console.log(`[AISystem] Agent ${entity.id} deposited some items but still has more, looking for another storage`);

          // Update behavior state to remember this storage and avoid it next tick
          entity.updateComponent<AgentComponent>('agent', (current) => ({
            ...current,
            behavior: 'deposit_items',
            behaviorState: {
              ...current.behaviorState,
              lastStorageId: nearestStorage.id, // Remember which storage we just used
            },
          }));

          // Move away from current storage to search for another
          entity.updateComponent<MovementComponent>('movement', (current) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
        }
      } else {
        // All items deposited, return to previous behavior
        const previousBehavior = agent.behaviorState?.previousBehavior as AgentBehavior | undefined;
        const previousState = agent.behaviorState?.previousState as Record<string, unknown> | undefined;

        // console.log(`[AISystem] Agent ${entity.id} finished depositing, returning to ${previousBehavior || 'wander'} with state:`, previousState);

        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: previousBehavior || 'wander',
          behaviorState: previousState || {},
          behaviorCompleted: true, // Signal completion when inventory is empty
        }));

        // Stop moving after deposit is complete
        entity.updateComponent<MovementComponent>('movement', (current) => ({
          ...current,
          velocityX: 0,
          velocityY: 0,
        }));
      }
    } else {
      // Move towards the storage using arrive behavior to prevent jitter
      const dx = storagePos.x - position.x;
      const dy = storagePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply slowing radius for smooth deceleration as we approach
      const slowingRadius = 5.0;
      const arrivalTolerance = 1.5; // Match the deposit distance check
      let targetSpeed = movement.speed;

      // Slow down when approaching the storage
      if (distance < slowingRadius) {
        // Quadratic slow-down for smoother approach
        const slowFactor = distance / slowingRadius;
        targetSpeed = movement.speed * slowFactor * slowFactor;

        // Extra damping when very close to prevent oscillation
        if (distance < arrivalTolerance * 1.5) {
          targetSpeed *= 0.5;
        }

        // Stop completely when at arrival distance
        if (distance < arrivalTolerance) {
          targetSpeed = 0;
        }
      }

      const velocityX = targetSpeed > 0 ? (dx / distance) * targetSpeed : 0;
      const velocityY = targetSpeed > 0 ? (dy / distance) * targetSpeed : 0;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  /**
   * Aggregate available resources from agent inventory + all storage buildings
   */
  private aggregateAvailableResources(
    world: World,
    agentInventory: Record<string, number>
  ): Record<string, number> {
    // Start with agent's inventory
    const totalResources = { ...agentInventory };

    // Find all storage buildings with inventory
    const storageBuildings = world.query().with('building').with('inventory').executeEntities();

    for (const storage of storageBuildings) {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>('building');
      const storageInv = storageImpl.getComponent<InventoryComponent>('inventory');

      if (!building || !storageInv || !building.isComplete) continue;

      // Only count storage buildings (not agents or other entities)
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') {
        continue;
      }

      // Add storage inventory to total
      for (const slot of storageInv.slots) {
        if (slot.itemId && slot.quantity > 0) {
          totalResources[slot.itemId] = (totalResources[slot.itemId] || 0) + slot.quantity;
        }
      }
    }

    return totalResources;
  }

  // TODO: Implement deductResourcesFromInventories and deductFromStorage
  // These methods were incomplete and causing build errors
  // They should be implemented when building resource deduction is needed

  /**
   * Seek warmth behavior: Find a campfire or warm building to warm up
   * Triggered when agent is cold or dangerously cold
   */
  private _seekWarmthBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const temperature = entity.getComponent('temperature') as any;

    if (!temperature) {
      // No temperature component, switch to wandering
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Check if we're already warm enough - if so, return to previous behavior
    if (temperature.state === 'comfortable' ||
        (temperature.state === 'cold' && temperature.currentTemp >= temperature.comfortMin - 1)) {
      // console.log(`[AISystem] Agent ${entity.id} is now warm (${temperature.currentTemp.toFixed(1)}°C), returning to wander`);
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Find heat sources (campfires and warm buildings)
    const buildings = world.query().with('building').with('position').executeEntities();
    let bestHeatSource: Entity | null = null;
    let nearestDistance = Infinity;

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>('building');
      const buildingPos = buildingImpl.getComponent<PositionComponent>('position');

      if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

      // Check if building provides heat (campfire) or has warm interior
      const providesWarmth = buildingComp.providesHeat ||
                             (buildingComp.interior && buildingComp.baseTemperature > 0);

      if (providesWarmth) {
        const distance = Math.sqrt(
          Math.pow(buildingPos.x - position.x, 2) +
          Math.pow(buildingPos.y - position.y, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          bestHeatSource = building;
        }
      }
    }

    if (!bestHeatSource) {
      // No heat source found, wander (maybe build a campfire?)
      // console.log(`[AISystem] Agent ${entity.id} is cold but found no heat source, wandering`);
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const heatSourceImpl = bestHeatSource as EntityImpl;
    const heatSourcePos = heatSourceImpl.getComponent<PositionComponent>('position')!;
    const heatSourceComp = heatSourceImpl.getComponent<BuildingComponent>('building')!;

    // If we're in heat range, stay here and warm up
    const inHeatRange = heatSourceComp.providesHeat && nearestDistance <= heatSourceComp.heatRadius;
    const inWarmInterior = heatSourceComp.interior && nearestDistance <= heatSourceComp.interiorRadius;

    if (inHeatRange || inWarmInterior) {
      // Stay near the heat source
      // console.log(`[AISystem] Agent ${entity.id} warming up at ${heatSourceComp.buildingType} (temp: ${temperature.currentTemp.toFixed(1)}°C)`);

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else {
      // Move towards the heat source
      const dx = heatSourcePos.x - position.x;
      const dy = heatSourcePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      // console.log(`[AISystem] Agent ${entity.id} seeking warmth at ${heatSourceComp.buildingType} (${distance.toFixed(1)} tiles away, temp: ${temperature.currentTemp.toFixed(1)}°C)`);

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  /**
   * Call a meeting - agent announces a meeting and waits for others to gather.
   */
  private _callMeetingBehavior(entity: EntityImpl, world: World): void {
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const position = entity.getComponent<PositionComponent>('position')!;
    const identity = entity.getComponent('identity') as any;

    // Check if we already have a meeting component
    let meeting = entity.getComponent('meeting') as any;

    if (!meeting) {
      // Create new meeting
      const topic = agent.behaviorState.topic as string || 'village gathering';

      meeting = createMeetingComponent(
        entity.id,
        topic,
        { x: position.x, y: position.y },
        world.tick,
        400 // Meeting lasts ~20 seconds
      );

      entity.addComponent(meeting);

      // Announce the meeting through speech
      const callerName = identity?.name || 'Someone';
      const announcement = `${callerName} is calling a meeting about ${topic}! Everyone gather around!`;

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        recentSpeech: announcement,
        lastThought: `I'm calling a meeting to discuss ${topic}`,
      }));

      console.log(`[Meeting] ${callerName} called a meeting about "${topic}" at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
    } else {
      // Update existing meeting
      meeting = updateMeetingStatus(meeting, world.tick);

      entity.updateComponent('meeting', () => meeting);

      // Check if meeting has ended
      if (hasMeetingEnded(meeting, world.tick)) {
        console.log(`[Meeting] Meeting about "${meeting.topic}" has ended with ${meeting.attendees.length} attendees`);

        // Remove meeting component
        entity.removeComponent('meeting');

        // Go back to wandering
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'wander',
          behaviorState: {},
          recentSpeech: 'Thank you all for coming to the meeting!',
        }));
        return;
      }

      // Stay in place during meeting
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));

      // Periodically remind people
      if (meeting.status === 'calling' && world.tick % 100 === 0) {
        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          recentSpeech: `The meeting is starting! Please come join us!`,
        }));
      }
    }
  }

  /**
   * Attend a meeting - agent moves to meeting location and joins.
   */
  private _attendMeetingBehavior(entity: EntityImpl, world: World): void {
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const position = entity.getComponent<PositionComponent>('position')!;
    const movement = entity.getComponent<MovementComponent>('movement')!;
    const identity = entity.getComponent('identity') as any;

    // Get meeting ID from behavior state
    const meetingCallerId = agent.behaviorState.meetingCallerId as string;
    if (!meetingCallerId) {
      // No meeting to attend, wander instead
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Find the meeting caller
    const caller = world.getEntity(meetingCallerId);
    if (!caller) {
      // Caller doesn't exist anymore
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const callerImpl = caller as EntityImpl;
    const meeting = callerImpl.getComponent('meeting') as any;

    if (!meeting || meeting.status === 'ended') {
      // Meeting doesn't exist or has ended
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    // Move towards meeting location
    const dx = meeting.location.x - position.x;
    const dy = meeting.location.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const ARRIVAL_THRESHOLD = 2.0; // Within 2 tiles is "at the meeting"

    if (distance <= ARRIVAL_THRESHOLD) {
      // We've arrived! Join the meeting
      if (!meeting.attendees.includes(entity.id)) {
        const updatedMeeting = addMeetingAttendee(meeting, entity.id);
        callerImpl.updateComponent('meeting', () => updatedMeeting);

        const attendeeName = identity?.name || 'Someone';
        console.log(`[Meeting] ${attendeeName} joined the meeting about "${meeting.topic}" (${updatedMeeting.attendees.length} attendees)`);

        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          lastThought: `I've joined the meeting about ${meeting.topic}`,
        }));
      }

      // Stay at the meeting location
      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
      }));
    } else {
      // Move towards the meeting
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
   * Navigate behavior - Move to specific (x, y) coordinates using steering
   * Expects behaviorState.target = { x, y }
   */
  private navigateBehavior(entity: EntityImpl, world: World): void {
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const position = entity.getComponent<PositionComponent>('position')!;

    // Check if we have a target
    if (!agent.behaviorState || !agent.behaviorState.target) {
      // No target - switch to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const target = agent.behaviorState.target as { x: number; y: number };

    // Update steering component if it exists
    if (entity.hasComponent('steering')) {
      entity.updateComponent('steering', (steering: any) => ({
        ...steering,
        behavior: 'arrive',
        target: target,
      }));
    } else {
      // Fallback: simple movement toward target
      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2.0) {
        // Arrived - emit event and switch to idle
        world.eventBus?.emit({
          type: 'navigation:arrived',
          source: 'ai',
          data: {
            agentId: entity.id,
            entityId: entity.id,
            destination: target,
          },
        });

        entity.updateComponent<AgentComponent>('agent', (current) => ({
          ...current,
          behavior: 'idle',
          behaviorState: {},
          lastThought: `I arrived at my destination (${Math.floor(target.x)}, ${Math.floor(target.y)})`,
        }));
        return;
      }

      // Move toward target
      const movement = entity.getComponent<MovementComponent>('movement')!;
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
   * Explore frontier behavior - Explore edges of known territory
   * Uses ExplorationSystem to identify frontier sectors
   */
  private exploreFrontierBehavior(entity: EntityImpl, _world: World): void {
    // ExplorationSystem handles the heavy lifting
    // Just ensure ExplorationState is set to frontier mode
    if (entity.hasComponent('exploration_state')) {
      entity.updateComponent('exploration_state', (state: any) => ({
        ...state,
        mode: 'frontier',
      }));
    } else {
      // No exploration component - fall back to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }
  }

  /**
   * Explore spiral behavior - Spiral outward from home base
   * Uses ExplorationSystem to calculate spiral pattern
   */
  private exploreSpiralBehavior(entity: EntityImpl, _world: World): void {
    // ExplorationSystem handles the heavy lifting
    // Just ensure ExplorationState is set to spiral mode
    if (entity.hasComponent('exploration_state')) {
      entity.updateComponent('exploration_state', (state: any) => ({
        ...state,
        mode: 'spiral',
      }));
    } else {
      // No exploration component - fall back to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }
  }

  /**
   * Follow gradient behavior - Follow social gradients to resources
   * Uses SocialGradient component to determine direction
   */
  private followGradientBehavior(entity: EntityImpl, _world: World): void {
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const position = entity.getComponent<PositionComponent>('position')!;

    // Check if we have social gradient component
    if (!entity.hasComponent('social_gradient')) {
      // No gradients - switch to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
      return;
    }

    const socialGradient = entity.getComponent('social_gradient') as any;

    // Get resource type from behaviorState or use default
    const resourceType = agent.behaviorState?.resourceType || 'wood';

    // Get gradient for resource type
    const gradient = socialGradient.getGradient?.(resourceType);

    if (!gradient || !gradient.direction) {
      // No gradient available - switch to explore
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'explore_frontier',
        behaviorState: {},
        lastThought: `I don't know where to find ${resourceType}, I'll explore`,
      }));
      return;
    }

    // Calculate target position from gradient
    const distance = gradient.distance || 20; // Default 20 tiles if not specified
    const bearing = gradient.direction; // In degrees

    const targetX = position.x + Math.cos(bearing * Math.PI / 180) * distance;
    const targetY = position.y + Math.sin(bearing * Math.PI / 180) * distance;

    // Use steering to move toward gradient
    if (entity.hasComponent('steering')) {
      entity.updateComponent('steering', (steering: any) => ({
        ...steering,
        behavior: 'seek',
        target: { x: targetX, y: targetY },
      }));
    } else {
      // Fallback: simple movement
      const movement = entity.getComponent<MovementComponent>('movement')!;
      const velocityX = Math.cos(bearing * Math.PI / 180) * movement.speed;
      const velocityY = Math.sin(bearing * Math.PI / 180) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  /**
   * Gather seeds behavior - agent gathers seeds from nearby mature plants.
   *
   * This behavior finds mature/seeding plants within range and submits a gather_seeds
   * action to the ActionQueue.
   *
   * The GatherSeedsActionHandler validates and executes the action.
   */
  // @ts-expect-error - Unused behavior method kept for future use
  private _gatherSeedsBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const vision = entity.getComponent<VisionComponent>('vision');

    // Stop moving while deciding which plant to gather from
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Find nearest mature plant with seeds
    let nearestPlant: { entity: EntityImpl; distance: number } | null = null;

    // Search all entities in vision range (plants might not be in seenAgents or seenResources)
    for (const seenEntity of world.entities.values()) {
      const seenImpl = seenEntity as EntityImpl;
      const plant = seenImpl.getComponent<PlantComponent>('plant');
      if (!plant) continue;

      // Check if plant is at valid stage and has seeds
      const validStages = ['mature', 'seeding', 'senescence'];
      if (!validStages.includes(plant.stage) || plant.seedsProduced <= 0) {
        continue;
      }

      const plantPos = seenImpl.getComponent<PositionComponent>('position');
      if (!plantPos) continue;

      // Check if plant is within vision range
      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (vision && distance > vision.range) continue;

      if (!nearestPlant || distance < nearestPlant.distance) {
        nearestPlant = { entity: seenImpl, distance };
      }
    }

    if (!nearestPlant) {
      // No plants found - switch to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        currentBehavior: 'wander',
      }));
      return;
    }

    // Check if agent is adjacent to the plant
    const MAX_GATHER_DISTANCE = Math.sqrt(2); // Allow diagonal

    if (nearestPlant.distance > MAX_GATHER_DISTANCE) {
      // Move toward plant
      const plantPos = nearestPlant.entity.getComponent<PositionComponent>('position')!;
      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = nearestPlant.distance;

      const movement = entity.getComponent<MovementComponent>('movement')!;
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        targetX: plantPos.x,
        targetY: plantPos.y,
        velocityX,
        velocityY,
      }));
      return;
    }

    // Agent is adjacent - emit gather_seeds request
    const plantPos = nearestPlant.entity.getComponent<PositionComponent>('position')!;
    world.eventBus.emit({
      type: 'action:requested' as any,
      source: entity.id,
      data: {
        eventType: 'gather_seeds:requested',
        actorId: entity.id,
        plantId: nearestPlant.entity.id,
        position: { x: plantPos.x, y: plantPos.y },
      },
    });

    console.log(`[AISystem:gatherSeedsBehavior] Agent ${entity.id.slice(0, 8)} requesting seed gathering from plant ${nearestPlant.entity.id.slice(0, 8)}`);

    // Switch to idle while action is being processed
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      currentBehavior: 'idle',
    }));
  }

  /**
   * Harvest behavior - agent harvests nearby mature plants for fruit/seeds.
   *
   * This behavior finds harvestable plants within range and submits a harvest
   * action to the ActionQueue.
   *
   * The HarvestActionHandler validates and executes the action.
   */
  // @ts-expect-error - Unused behavior method kept for future use
  private _harvestBehavior(entity: EntityImpl, world: World): void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const vision = entity.getComponent<VisionComponent>('vision');

    // Stop moving while deciding which plant to harvest
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));

    // Find nearest harvestable plant
    let nearestPlant: { entity: EntityImpl; distance: number } | null = null;

    // Search all entities in vision range
    for (const seenEntity of world.entities.values()) {
      const seenImpl = seenEntity as EntityImpl;
      const plant = seenImpl.getComponent<PlantComponent>('plant');
      if (!plant) continue;

      // Check if plant is at valid stage for harvesting
      const validStages = ['mature', 'seeding'];
      if (!validStages.includes(plant.stage)) {
        continue;
      }

      const plantPos = seenImpl.getComponent<PositionComponent>('position');
      if (!plantPos) continue;

      // Check if plant is within vision range
      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (vision && distance > vision.range) continue;

      if (!nearestPlant || distance < nearestPlant.distance) {
        nearestPlant = { entity: seenImpl, distance };
      }
    }

    if (!nearestPlant) {
      // No plants found - switch to wander
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        currentBehavior: 'wander',
      }));
      return;
    }

    // Check if agent is adjacent to the plant
    const MAX_HARVEST_DISTANCE = Math.sqrt(2); // Allow diagonal

    if (nearestPlant.distance > MAX_HARVEST_DISTANCE) {
      // Move toward plant
      const plantPos = nearestPlant.entity.getComponent<PositionComponent>('position')!;
      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = nearestPlant.distance;

      const movement = entity.getComponent<MovementComponent>('movement')!;
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>('movement', (current) => ({
        ...current,
        targetX: plantPos.x,
        targetY: plantPos.y,
        velocityX,
        velocityY,
      }));
      return;
    }

    // Agent is adjacent - emit harvest request
    const plantPos = nearestPlant.entity.getComponent<PositionComponent>('position')!;
    world.eventBus.emit({
      type: 'action:requested' as any,
      source: entity.id,
      data: {
        eventType: 'harvest:requested',
        actorId: entity.id,
        plantId: nearestPlant.entity.id,
        position: { x: plantPos.x, y: plantPos.y },
      },
    });

    console.log(`[AISystem:harvestBehavior] Agent ${entity.id.slice(0, 8)} requesting harvest of plant ${nearestPlant.entity.id.slice(0, 8)}`);

    // Switch to idle while action is being processed
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      currentBehavior: 'idle',
    }));
  }
}
