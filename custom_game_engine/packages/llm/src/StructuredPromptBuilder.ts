import type { Entity, Component } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  type GoalsComponent,
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  type IdentityComponent,
  type PersonalityComponent,
  type NeedsComponent,
  type VisionComponent,
  type InventoryComponent,
  type InventorySlot,
  type TemperatureComponent,
  type ConversationComponent,
  type MemoryComponent,
  type BuildingComponent,
  type ResourceCost,
  type AgentComponent,
  getFoodStorageInfo,
  getVillageInfo,
  formatGoalsForPrompt,
  getAvailableBuildings,
  isEntityVisibleWithSkill,
  ALL_SKILL_IDS,
} from '@ai-village/core';

/**
 * Structured prompt following agent-system/spec.md REQ-AGT-002
 */
export interface AgentPrompt {
  systemPrompt: string;       // Role, personality
  skills?: string;             // Skill levels (optional)
  priorities?: string;         // Current strategic priorities (optional)
  goals?: string;              // Personal goals (optional)
  memories: string;            // Relevant memories
  worldContext: string;        // Current situation
  villageStatus?: string;      // Village coordination context (optional)
  buildings: string;           // Buildings they can construct
  availableActions: string[];  // What they can do
  instruction: string;         // What to decide
}

/**
 * Builds structured prompts for LLM decision making.
 * Follows agent-system/spec.md REQ-AGT-002
 */
export class StructuredPromptBuilder {
  /**
   * Build a complete structured prompt for an agent.
   */
  buildPrompt(agent: Entity, world: World): string {
    const identity = agent.components.get('identity') as IdentityComponent | undefined;
    const personality = agent.components.get('personality') as PersonalityComponent | undefined;
    const needs = agent.components.get('needs') as NeedsComponent | undefined;
    const vision = agent.components.get('vision') as VisionComponent | undefined;
    const episodicMemory = agent.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const legacyMemory = agent.components.get('memory') as MemoryComponent | undefined;
    const inventory = agent.components.get('inventory') as InventoryComponent | undefined;
    const temperature = agent.components.get('temperature') as TemperatureComponent | undefined;
    const conversation = agent.components.get('conversation') as ConversationComponent | undefined;
    const skills = agent.components.get('skills') as SkillsComponent | undefined;

    // System Prompt: Role and personality (who you are)
    const systemPrompt = this.buildSystemPrompt(identity?.name || 'Agent', personality);

    // Skills: What you're good at
    const skillsText = this.buildSkillsSection(skills);

    // Priorities: What you're focusing on
    const prioritiesText = this.buildPrioritiesSection(agent);

    // Personal Goals (what you want)
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const goalsText = goals ? formatGoalsForPrompt(goals) : undefined;

    // Memories: Relevant recent memories (what you remember)
    const memoriesText = this.buildEpisodicMemories(episodicMemory, world);

    // World Context: Current situation (what's happening now)
    const worldContext = this.buildWorldContext(needs, vision, inventory, world, temperature, legacyMemory, conversation, agent);

    // Village Status: What others are doing, village needs (coordination context)
    const villageStatus = this.buildVillageStatus(world, agent.id);

    // Buildings: What you can construct (comes before actions)
    const buildingsText = this.buildBuildingsKnowledge(world, inventory, skills);

    // Available Actions (what you can do)
    const actions = this.getAvailableActions(vision, world, agent);

    // Instruction - simple and direct for function calling
    // Build instruction with context-aware motivation
    // Per progressive-skill-reveal-spec.md: Only suggest domain actions to skilled agents
    let instruction = this.buildSkillAwareInstruction(agent, world, skills, needs, temperature, inventory, conversation, vision);

    // PRIORITY: If in an active conversation, prompt for response
    if (conversation?.isActive && conversation?.partnerId) {
      let partnerName = 'them';
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
      if (partnerIdentity?.name) {
        partnerName = partnerIdentity.name;
      }

      instruction = `You're in a conversation with ${partnerName}. Read the conversation history above and respond naturally. What do you want to say?`;
    }
    // PRIORITY 2: Building motivation (when agent has resources + needs)
    else if (inventory) {
      const woodQty = inventory.slots.filter((s: InventorySlot) => s.itemId === 'wood').reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
      const stoneQty = inventory.slots.filter((s: InventorySlot) => s.itemId === 'stone').reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
      const clothQty = inventory.slots.filter((s: InventorySlot) => s.itemId === 'cloth').reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
      const fiberQty = inventory.slots.filter((s: InventorySlot) => s.itemId === 'plant_fiber').reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);

      // Check actual requirements for specific buildings
      const canBuildCampfire = stoneQty >= 10 && woodQty >= 5;
      const canBuildTent = clothQty >= 10 && woodQty >= 5;
      const canBuildBed = woodQty >= 10 && fiberQty >= 15;

      const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
      const isExhausted = needs?.energy !== undefined && needs.energy < 0.1; // ENERGY_CRITICAL: < 10%
      const isTired = needs?.energy !== undefined && needs.energy < 0.3 && needs.energy >= 0.1; // ENERGY_LOW: 10-30%

      // STRONGEST PRIORITY: Agent has ALL required resources + urgent need
      if ((canBuildCampfire || canBuildTent) && isCold) {
        if (canBuildCampfire && canBuildTent) {
          instruction = `YOU ARE COLD and you have materials for warmth! URGENT: build a campfire (10 stone + 5 wood) or tent (10 cloth + 5 wood) NOW to avoid freezing! What will you build?`;
        } else if (canBuildCampfire) {
          instruction = `YOU ARE COLD! You have materials for a campfire (10 stone + 5 wood). Build it NOW to avoid freezing! What will you build?`;
        } else {
          instruction = `YOU ARE COLD! You have materials for a tent (10 cloth + 5 wood). Build it NOW to avoid freezing! What will you build?`;
        }
      }
      else if (canBuildBed && (isExhausted || isTired)) {
        const energyDesc = isExhausted ? 'exhausted' : 'tired';
        instruction = `You're ${energyDesc} and have materials for a bed (10 wood + 15 fiber). Building it will help you recover faster. What will you build?`;
      }
      // For all other cases: use skill-aware instruction (already computed above)
      // This ensures builders get building suggestions, cooks get food suggestions, etc.
      // The skill-aware instruction was already set at line 85
    }

    // Combine into single prompt
    return this.formatPrompt({
      systemPrompt,
      skills: skillsText,
      priorities: prioritiesText,
      goals: goalsText,
      memories: memoriesText,
      worldContext,
      villageStatus,
      buildings: buildingsText,
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with role and personality.
   * Just identity and personality traits - who you are at your core.
   */
  private buildSystemPrompt(name: string, personality: PersonalityComponent | undefined): string {
    // Base prompt - identity first
    let prompt = `You are ${name}, a villager in a forest village.\n\n`;

    // Personality comes next - this is core to who you are
    if (personality) {
      prompt += 'Your Personality:\n';

    // Describe personality based on Big Five
    if (personality.openness > 0.7) {
      prompt += '- You are curious and adventurous\n';
    } else if (personality.openness < 0.3) {
      prompt += '- You are cautious and traditional\n';
    }

    if (personality.extraversion > 0.7) {
      prompt += '- You are outgoing and social\n';
    } else if (personality.extraversion < 0.3) {
      prompt += '- You are quiet and introspective\n';
    }

    if (personality.agreeableness > 0.7) {
      prompt += '- You love helping others\n';
    } else if (personality.agreeableness < 0.3) {
      prompt += '- You prefer to focus on your own goals\n';
    }

    if (personality.workEthic > 0.7) {
      prompt += '- You are hardworking and dedicated\n';
    } else if (personality.workEthic < 0.3) {
      prompt += '- You prefer to take life easy\n';
    }

    if (personality.leadership > 0.7) {
      prompt += '- You have a natural gift for bringing people together\n';
      prompt += '- You care about understanding who your fellow villagers are - their skills, interests, and needs\n';
      prompt += '- You enjoy helping people coordinate by connecting the right people to the right tasks\n';
      prompt += '- You notice when someone needs help and when the village needs something done\n';
      prompt += '- You lead through relationships, not commands\n';
    } else if (personality.leadership < 0.3) {
      prompt += '- You prefer to follow others and take direction\n';
    }

      prompt += '\n';
    }

    return prompt;
  }

  /**
   * Build priorities section showing agent's current strategic focus.
   * Helps agents understand what they should be prioritizing.
   */
  private buildPrioritiesSection(agent: Entity): string {
    const agentComp = agent.components.get('agent') as AgentComponent | undefined;
    if (!agentComp?.priorities) {
      return '';
    }

    const priorities = agentComp.priorities;
    const sortedPriorities = Object.entries(priorities)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2); // Show top 2 priorities

    if (sortedPriorities.length === 0) {
      return '';
    }

    const priorityDescriptions = sortedPriorities.map(([category, value]) => {
      const percentage = Math.round(value * 100);
      return `${category} (${percentage}%)`;
    });

    return `Your Current Focus:\nYou're prioritizing ${priorityDescriptions.join(' and ')} right now.\n`;
  }

  /**
   * Build skills section showing agent's current skill levels.
   * Helps agents understand their capabilities and specialize appropriately.
   */
  private buildSkillsSection(skills: SkillsComponent | undefined): string {
    if (!skills) {
      return '';
    }

    const skillDescriptions: string[] = [];
    const levelNames = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'];

    for (const [skillId, level] of Object.entries(skills.levels)) {
      if (level > 0 && level <= 5) {
        const levelName = levelNames[level - 1] || 'Novice';
        const skillName = skillId.replace(/_/g, ' ');
        skillDescriptions.push(`- ${skillName}: ${levelName} (level ${level})`);
      }
    }

    if (skillDescriptions.length === 0) {
      return '';
    }

    return 'Your Skills:\n' + skillDescriptions.join('\n') + '\n';
  }

  /**
   * Build the buildings knowledge section.
   * Shows what buildings the agent knows how to construct with costs.
   */
  private buildBuildingsKnowledge(world: World, inventory: InventoryComponent | undefined, skills?: SkillsComponent): string {
    // Check for buildingRegistry (extended World interface)
    const worldWithRegistry = world as World & { buildingRegistry?: { getUnlocked(): Array<{ name: string; description: string; resourceCost: ResourceCost[] }> } };
    if (!world || !worldWithRegistry.buildingRegistry) {
      return '';
    }

    const registry = worldWithRegistry.buildingRegistry;

    // Filter buildings based on skill levels if skills provided
    let buildings;
    if (skills) {
      const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
      for (const skillId of Object.keys(skills.levels) as SkillId[]) {
        skillLevels[skillId] = skills.levels[skillId];
      }
      buildings = getAvailableBuildings(registry, skillLevels);
    } else {
      // Fallback: show all unlocked buildings if no skills component
      buildings = registry.getUnlocked();
    }

    if (!buildings || buildings.length === 0) {
      return '';
    }

    // Get existing buildings to filter out ones we already have
    const existingBuildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
    const existingBuildingTypes = new Set<string>();
    const existingBuildingCounts: Record<string, number> = {};

    for (const buildingEntity of existingBuildings) {
      const building = buildingEntity.components.get('building') as BuildingComponent | undefined;
      if (building?.isComplete) {
        const buildingType = building.buildingType;
        existingBuildingTypes.add(buildingType);
        existingBuildingCounts[buildingType] = (existingBuildingCounts[buildingType] || 0) + 1;
      }
    }

    // Filter out buildings we already have (unless they're capacity buildings like storage)
    const capacityBuildings = new Set(['storage-chest', 'storage-box', 'tent', 'bed', 'bedroll']);
    const filteredBuildings = buildings.filter((building) => {
      const buildingType = building.name;

      // If it's a capacity building (can have multiples), always show it
      if (capacityBuildings.has(buildingType)) {
        return true;
      }

      // Otherwise, only show if we don't have one already
      return !existingBuildingTypes.has(buildingType);
    });

    if (filteredBuildings.length === 0) {
      return '';
    }

    let result = 'Buildings You Can Construct (use plan_build):\n';

    for (const building of filteredBuildings) {
      const costs = building.resourceCost
        .map((c: ResourceCost) => `${c.amountRequired} ${c.resourceId}`)
        .join(' + ');

      // Check if agent has materials in stock for this building
      let stockStatus = '';
      if (inventory && inventory.slots) {
        const hasAllResources = building.resourceCost.every((cost: ResourceCost) => {
          const total = inventory.slots
            .filter((s: InventorySlot) => s.itemId === cost.resourceId)
            .reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
          return total >= cost.amountRequired;
        });
        stockStatus = hasAllResources ? ' ✅ READY' : '';
      }

      result += `- ${building.name} (${costs})${stockStatus}: ${building.description}\n`;
    }

    return result;
  }

  /**
   * Build world context from current situation.
   * Per progressive-skill-reveal-spec.md: Information depth scales with skill level.
   */
  private buildWorldContext(
    needs: NeedsComponent | undefined,
    vision: VisionComponent | undefined,
    inventory: InventoryComponent | undefined,
    world: World,
    temperature?: TemperatureComponent,
    memory?: MemoryComponent,
    conversation?: ConversationComponent,
    entity?: Entity
  ): string {
    // Get agent's skill levels for skill-gated information
    const skills = entity?.components.get('skills') as SkillsComponent | undefined;
    const cookingSkill = (skills?.levels.cooking ?? 0) as SkillLevel;
    const buildingSkill = (skills?.levels.building ?? 0) as SkillLevel;

    let context = 'Current Situation:\n';

    // PRIORITY: Show active conversation history first
    if (conversation?.isActive && conversation?.messages && conversation.messages.length > 0) {
      context += '\n--- ACTIVE CONVERSATION ---\n';

      // Get partner name
      let partnerName = 'someone';
      if (conversation.partnerId && world) {
        const partner = world.getEntity(conversation.partnerId);
        const partnerIdentity = partner?.components.get('identity') as IdentityComponent | undefined;
        if (partnerIdentity?.name) {
          partnerName = partnerIdentity.name;
        }
      }

      context += `You are currently talking with ${partnerName}.\n\nConversation history:\n`;

      // Show last 5 messages for context
      const recentMessages = conversation.messages.slice(-5);
      for (const msg of recentMessages) {
        // Look up speaker name
        let speakerName = 'Unknown';
        if (msg.speakerId && world) {
          const speaker = world.getEntity(msg.speakerId);
          const speakerIdentity = speaker?.components.get('identity') as IdentityComponent | undefined;
          if (speakerIdentity?.name) {
            speakerName = speakerIdentity.name;
          }
        }

        context += `- ${speakerName}: "${msg.message}"\n`;
      }

      context += '\n';
    }

    // Needs (NeedsComponent uses 0-1 scale, convert to 0-100 for display)
    if (needs) {
      const hunger = Math.round(needs.hunger * 100);
      const energy = Math.round(needs.energy * 100);

      context += `- Hunger: ${hunger}% (${hunger < 30 ? 'very hungry' : hunger < 60 ? 'could eat' : 'satisfied'})\n`;
      context += `- Energy: ${energy}% (${energy < 10 ? 'exhausted' : energy < 30 ? 'tired' : 'rested'})\n`;
    }

    // Temperature
    if (temperature) {
      const temp = Math.round(temperature.currentTemp);
      let tempDesc = 'comfortable';
      if (temperature.state === 'dangerously_cold') tempDesc = 'dangerously cold';
      else if (temperature.state === 'cold') tempDesc = 'cold';
      else if (temperature.state === 'dangerously_hot') tempDesc = 'dangerously hot';
      else if (temperature.state === 'hot') tempDesc = 'hot';

      context += `- Temperature: ${temp}°C (${tempDesc})\n`;
    }

    // Inventory
    if (inventory) {
      const resources: Record<string, number> = {};
      for (const slot of inventory.slots) {
        if (slot.itemId && slot.quantity > 0) {
          resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.quantity;
        }
      }

      if (Object.keys(resources).length > 0) {
        const items = Object.entries(resources)
          .map(([item, qty]) => `${qty} ${item}`)
          .join(', ');
        context += `- Inventory: ${items}\n`;
      } else {
        context += '- Inventory: empty (you have no resources)\n';
      }
    }

    // Storage/Stockpile levels - check all storage buildings
    // Per progressive-skill-reveal-spec.md: Food information depth scales with cooking skill
    const storageInfo = this.getStorageInfo(world, cookingSkill);
    if (storageInfo) {
      context += storageInfo;
    }

    // Vision - buildings
    if (vision) {
      // Show recently seen buildings with types and locations
      // Per progressive-skill-reveal-spec.md: Building information depth scales with building skill
      if (vision.seenBuildings && vision.seenBuildings.length > 0) {
        const buildingInfo = this.getSeenBuildingsInfo(world, vision.seenBuildings, buildingSkill);
        if (buildingInfo) {
          context += buildingInfo;
        }
      }

      const agentCount = vision.seenAgents?.length || 0;
      const resourceCount = vision.seenResources?.length || 0;

      if (agentCount > 0) {
        // Show detailed information about nearby agents
        const agentInfo = this.getSeenAgentsInfo(world, vision.seenAgents);
        if (agentInfo) {
          context += agentInfo;
        } else {
          // Fallback if we can't get details
          context += `- You see ${agentCount} other villager${agentCount > 1 ? 's' : ''} nearby\n`;
        }
      }

      if (resourceCount > 0) {
        // Describe what types of resources are visible
        const resourceTypes: Record<string, number> = {};
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (resource) {
            const resourceComp = resource.components.get('resource') as (Component & { resourceType: string }) | undefined;
            if (resourceComp) {
              const type = resourceComp.resourceType;
              resourceTypes[type] = (resourceTypes[type] || 0) + 1;
            }
          }
        }

        const descriptions: string[] = [];

        // Always show food first if visible (highest priority)
        if (resourceTypes.food) {
          descriptions.push(`${resourceTypes.food} food source${resourceTypes.food > 1 ? 's' : ''} 🍎`);
        }

        // Show wood (essential for early building)
        if (resourceTypes.wood) {
          descriptions.push(`${resourceTypes.wood} tree${resourceTypes.wood > 1 ? 's' : ''}`);
        }

        // De-emphasize stone by only mentioning if there are few stones (< 5)
        // This prevents "20 rocks nearby" from dominating the context
        if (resourceTypes.stone && resourceTypes.stone < 5) {
          descriptions.push(`${resourceTypes.stone} rock${resourceTypes.stone > 1 ? 's' : ''}`);
        } else if (resourceTypes.stone) {
          descriptions.push('some rocks');
        }

        if (descriptions.length > 0) {
          context += `- You see ${descriptions.join(', ')} nearby`;

          // Emphasize food gathering if food sources are visible
          if (resourceTypes.food) {
            context += ` (food is essential for survival!)`;
          } else if (resourceTypes.wood) {
            context += ` (wood is essential for building)`;
          }
          context += `\n`;
        }
      }

      // Show plant information
      const plantCount = vision.seenPlants?.length || 0;
      if (plantCount > 0) {
        // Map plant species to gatherable food resource types
        const speciesResourceMap: Record<string, string> = {
          'berry-bush': 'berry',
          'berry_bush': 'berry',
          'apple': 'apple',
          'apple-tree': 'apple',
          'carrot': 'carrot',
          'wheat': 'wheat',
        };

        // Track gatherable food sources and other plants separately
        const gatherableFoods: string[] = []; // Resource names the agent can pick
        const plantsBySpecies: Record<string, { total: number; withSeeds: number; withFruit: number; stages: string[] }> = {};

        for (const plantId of vision.seenPlants || []) {
          const plant = world.getEntity(plantId);
          if (plant) {
            const plantComp = plant.components.get('plant') as (Component & { speciesId: string; seedsProduced: number; fruitCount?: number; stage: string }) | undefined;
            if (plantComp) {
              const species = plantComp.speciesId;

              // Check if agent can see this plant species based on their skills
              let canSee = false;
              for (const skillId of ALL_SKILL_IDS) {
                const level = skills?.levels[skillId] ?? 0;
                if (isEntityVisibleWithSkill(species, skillId, level)) {
                  canSee = true;
                  break;
                }
              }

              // Skip this plant if agent's skills aren't high enough
              if (!canSee) {
                continue;
              }

              if (!plantsBySpecies[species]) {
                plantsBySpecies[species] = { total: 0, withSeeds: 0, withFruit: 0, stages: [] };
              }
              plantsBySpecies[species].total += 1;
              if (plantComp.seedsProduced > 0) {
                plantsBySpecies[species].withSeeds += 1;
              }
              if ((plantComp.fruitCount || 0) > 0) {
                plantsBySpecies[species].withFruit += 1;

                // Add gatherable food resource name
                const resourceName = speciesResourceMap[species] || 'fruit';
                gatherableFoods.push(resourceName);
              }
              if (!plantsBySpecies[species].stages.includes(plantComp.stage)) {
                plantsBySpecies[species].stages.push(plantComp.stage);
              }
            }
          }
        }

        // Show gatherable foods first (most important for LLM decision-making)
        if (gatherableFoods.length > 0) {
          context += `- Food sources available to pick: ${gatherableFoods.join(', ')}\n`;
        }

        // Then show plant summary for context
        const plantDescriptions: string[] = [];
        for (const [species, info] of Object.entries(plantsBySpecies)) {
          const speciesName = species.replace(/-/g, ' ');
          let desc = `${info.total} ${speciesName}${info.total > 1 ? 's' : ''}`;

          const details: string[] = [];
          if (info.withSeeds > 0) {
            details.push(`${info.withSeeds} with seeds ready to gather`);
          }
          if (info.withFruit > 0) {
            details.push(`${info.withFruit} with fruit`);
          }

          if (details.length > 0) {
            desc += ` (${details.join(', ')})`;
          }

          plantDescriptions.push(desc);
        }

        if (plantDescriptions.length > 0) {
          context += `- You see: ${plantDescriptions.join(', ')}\n`;
        }
      }

      if (agentCount === 0 && resourceCount === 0 && plantCount === 0) {
        context += '- The area around you is empty\n';
      }

      // Hearing - group conversation nearby (within 50 tiles)
      if (vision.heardSpeech && vision.heardSpeech.length > 0) {
        const speakerCount = vision.heardSpeech.length;

        if (speakerCount === 1) {
          const firstSpeech = vision.heardSpeech[0];
          if (firstSpeech) {
            context += '\nWhat you hear:\n';
            context += `- ${firstSpeech.speaker} says: "${firstSpeech.text}"\n`;
          }
        } else {
          // Multiple people talking - frame as group conversation
          context += `\n--- GROUP CONVERSATION (${speakerCount} people talking nearby) ---\n`;
          vision.heardSpeech.forEach((speech: { speaker: string, text: string }) => {
            context += `${speech.speaker}: "${speech.text}"\n`;
          });
          context += `\nYou can join this conversation by choosing the 'talk' action.\n`;
        }
      }
    }

    // Memory - known resource locations (heat, food, water sources)
    if (memory) {
      const resourceMemories = this.getKnownResourceLocations(memory, world);
      if (resourceMemories) {
        context += resourceMemories;
      }
    }

    // Add building recommendations based on needs
    if (needs || temperature) {
      context += this.suggestBuildings(needs, temperature, inventory);
    }

    // VILLAGE RESOURCES: Skilled agents as affordances
    // Per progressive-skill-reveal-spec.md: Show skilled agents as resources you can access
    const villageResources = this.getVillageResources(world, entity);
    if (villageResources) {
      context += '\n\n' + villageResources;
    }

    // VILLAGE BUILDINGS: Existing buildings with ownership
    // Per progressive-skill-reveal-spec.md: Show existing buildings with ownership status
    const villageBuildings = this.getVillageBuildings(world, entity);
    if (villageBuildings) {
      context += '\n\n' + villageBuildings;
    }

    // TERRAIN FEATURES: Nearby landmarks (peaks, cliffs, lakes, valleys)
    // Based on geomorphometry research for natural spatial awareness
    // Only show if terrain is actually remarkable (not generic/unremarkable)
    if (vision?.terrainDescription &&
        vision.terrainDescription.trim() &&
        !vision.terrainDescription.toLowerCase().includes('unremarkable') &&
        !vision.terrainDescription.toLowerCase().includes('empty') &&
        vision.terrainDescription.trim() !== 'You are in unremarkable terrain') {
      context += `\n- Terrain ahead: ${vision.terrainDescription}`;
    }

    return context;
  }

  /**
   * Get information about known resource locations from memory.
   * Shows heat sources, food sources, and water sources.
   */
  private getKnownResourceLocations(memory: MemoryComponent | undefined, _world: World): string | null {
    if (!memory?.memories || memory.memories.length === 0) {
      return null;
    }

    const heatSources: string[] = [];
    const foodSources: string[] = [];
    const waterSources: string[] = [];

    // Look through memories for resource locations
    // Note: Memory types may include custom extensions beyond MemoryType
    for (const mem of memory.memories.slice(-10)) { // Last 10 memories
      const memType = mem.type as string;
      if (memType === 'building_seen' && mem.metadata) {
        const buildingType = mem.metadata.buildingType;
        const memX = mem.x ?? mem.location?.x ?? 0;
        const memY = mem.y ?? mem.location?.y ?? 0;
        if (buildingType === 'campfire') {
          heatSources.push(`campfire at (${Math.floor(memX)}, ${Math.floor(memY)})`);
        } else if (buildingType === 'well') {
          waterSources.push(`well at (${Math.floor(memX)}, ${Math.floor(memY)})`);
        }
      } else if (memType === 'resource_location' && mem.metadata) {
        const memX = mem.x ?? mem.location?.x ?? 0;
        const memY = mem.y ?? mem.location?.y ?? 0;
        if (mem.metadata.resourceType === 'food') {
          foodSources.push(`food at (${Math.floor(memX)}, ${Math.floor(memY)})`);
        }
      }
    }

    const lines: string[] = [];
    if (heatSources.length > 0) {
      lines.push(`- Known heat sources: ${heatSources.slice(0, 3).join(', ')}`);
    }
    if (foodSources.length > 0) {
      lines.push(`- Known food sources: ${foodSources.slice(0, 3).join(', ')}`);
    }
    if (waterSources.length > 0) {
      lines.push(`- Known water sources: ${waterSources.slice(0, 3).join(', ')}`);
    }

    if (lines.length === 0) {
      return null;
    }

    return '\n' + lines.join('\n') + '\n';
  }

  /**
   * Suggest buildings based on agent's current needs.
   * Context-aware - only shows relevant buildings.
   */
  private suggestBuildings(
    needs: NeedsComponent | undefined,
    temperature: TemperatureComponent | undefined,
    inventory: InventoryComponent | undefined
  ): string {
    const suggestions: string[] = [];

    // Helper to check if agent has required resources
    const hasResources = (items: Record<string, number>): boolean => {
      return Object.entries(items).every(([itemId, qty]) => {
        const slots = inventory?.slots || [];
        const totalQty = slots
          .filter((s: InventorySlot) => s.itemId === itemId)
          .reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
        return totalQty >= qty;
      });
    };

    // Check if cold → suggest warmth buildings
    if (temperature?.state === 'cold' || temperature?.state === 'dangerously_cold') {
      if (hasResources({ stone: 10, wood: 5 })) {
        suggestions.push('campfire (10 stone + 5 wood) - provides warmth in 3-tile radius');
      } else {
        suggestions.push('campfire (10 stone + 5 wood) - provides warmth [NEED: more resources]');
      }

      if (hasResources({ cloth: 10, wood: 5 })) {
        suggestions.push('tent (10 cloth + 5 wood) - shelter with insulation');
      } else if (hasResources({ wood: 10, leaves: 5 })) {
        suggestions.push('lean-to (10 wood + 5 leaves) - basic shelter');
      }
    }

    // Check if inventory full → suggest storage
    const fullSlots = inventory?.slots.filter((s: InventorySlot) => s.itemId).length || 0;
    if (fullSlots >= 8) {
      if (hasResources({ wood: 10 })) {
        suggestions.push('storage-chest (10 wood) - 20 item slots');
      } else {
        suggestions.push('storage-chest (10 wood) - 20 item slots [NEED: 10 wood]');
      }
    }

    // Check if tired → suggest sleeping structures (0-1 scale)
    if (needs?.energy !== undefined && needs.energy < 0.5) {
      if (hasResources({ wood: 10, plant_fiber: 15 })) {
        suggestions.push('bed (10 wood + 15 fiber) - best sleep quality (+50% recovery)');
      }
      if (hasResources({ plant_fiber: 20, leather: 5 })) {
        suggestions.push('bedroll (20 fiber + 5 leather) - portable sleep (+30% recovery)');
      }
    }

    if (suggestions.length > 0) {
      return `\n\nBuildings you could build:\n${suggestions.map((s) => `- ${s}`).join('\n')}`;
    }
    return '';
  }

  /**
   * Get village resources including skilled agents as affordances.
   * Per progressive-skill-reveal-spec.md:
   * - Skilled agents appear as resources (like buildings)
   * - Social skill gates knowledge about others' skills
   */
  private getVillageResources(world: World, entity?: Entity): string | null {
    if (!world || !entity) {
      return null;
    }

    // Get observer's social skill for skill perception
    const observerSkills = entity.components.get('skills') as SkillsComponent | undefined;
    const socialSkill = (observerSkills?.levels.social ?? 0) as SkillLevel;

    // Find all agents in the world
    const allAgents = world.query()?.with?.('agent')?.executeEntities?.() ?? [];
    const resources: string[] = [];

    for (const agent of allAgents) {
      // Don't list yourself as a resource
      if (agent.id === entity.id) {
        continue;
      }

      const skills = agent.components.get('skills') as SkillsComponent | undefined;
      const identity = agent.components.get('identity') as IdentityComponent | undefined;

      if (!identity?.name || !skills) {
        continue;
      }

      // Find agent's highest skill
      let highestSkill: SkillId | null = null;
      let highestLevel: SkillLevel = 0;
      for (const [skillId, level] of Object.entries(skills.levels)) {
        if (level >= 2 && level > highestLevel) {
          highestLevel = level as SkillLevel;
          highestSkill = skillId as SkillId;
        }
      }

      // Only show agents with skill 2+ as resources
      if (!highestSkill || highestLevel < 2) {
        continue;
      }

      // Format based on social skill level
      const name = identity.name;
      if (socialSkill === 0) {
        // No perception of skills
        continue;
      } else if (socialSkill === 1) {
        // Vague impression
        const impression = this.getSkillImpression(highestSkill);
        resources.push(`${name} - ${impression}`);
      } else if (socialSkill === 2) {
        // General skill
        const skillName = highestSkill.replace(/_/g, ' ');
        resources.push(`${name} - skilled at ${skillName}`);
      } else {
        // Social 3+: Specific level + examples of what they can do
        const skillName = highestSkill.replace(/_/g, ' ');
        const examples = this.getSkillExamples(highestSkill);
        resources.push(`${name} - ${skillName} expert (level ${highestLevel})${examples ? `: ${examples}` : ''}`);
      }
    }

    if (resources.length === 0) {
      return null;
    }

    return `VILLAGE RESOURCES:\n${resources.map(r => `- ${r}`).join('\n')}`;
  }

  /**
   * Get village buildings with ownership information.
   * Per progressive-skill-reveal-spec.md:
   * - Shows all complete buildings in the village
   * - Displays ownership status (communal/personal/shared)
   * - Shows building purposes and functions
   */
  private getVillageBuildings(world: World, entity?: Entity): string | null {
    if (!world || !entity) {
      return null;
    }

    // Find all complete buildings in the village
    const allBuildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
    const completeBuildings = allBuildings.filter((b: Entity) => {
      const building = b.components.get('building') as BuildingComponent | undefined;
      return building?.isComplete;
    });

    if (completeBuildings.length === 0) {
      return null; // No buildings yet
    }

    // Count buildings by type instead of listing duplicates
    const buildingCounts: Record<string, number> = {};
    for (const buildingEntity of completeBuildings) {
      const building = buildingEntity.components.get('building') as BuildingComponent | undefined;
      if (!building) continue;

      const buildingType = building.buildingType || 'unknown';
      buildingCounts[buildingType] = (buildingCounts[buildingType] || 0) + 1;
    }

    const buildingDescriptions: string[] = [];

    for (const [buildingType, count] of Object.entries(buildingCounts)) {
      let description = buildingType;

      // Add count if more than one
      if (count > 1) {
        description += ` x${count}`;
      }

      // Add ownership information
      const ownership = 'communal';
      description += ` (${ownership})`;

      // Add purpose/function based on building type
      const purpose = this.getBuildingPurpose(buildingType);
      if (purpose) {
        description += ` - ${purpose}`;
      }

      buildingDescriptions.push(description);
    }

    if (buildingDescriptions.length === 0) {
      return null;
    }

    return `VILLAGE BUILDINGS:\n${buildingDescriptions.map(d => `- ${d}`).join('\n')}`;
  }

  /**
   * Get the purpose/function of a building type.
   */
  private getBuildingPurpose(buildingType: string): string {
    const purposes: Record<string, string> = {
      'campfire': 'warmth, cooking',
      'storage-chest': 'item storage (20 slots)',
      'storage-box': 'item storage (10 slots)',
      'workbench': 'basic crafting',
      'tent': 'shelter, sleeping',
      'bed': 'sleeping (best quality)',
      'bedroll': 'portable sleeping',
      'lean-to': 'basic shelter',
      'well': 'water source',
      'garden_fence': 'decoration',
      'forge': 'metalworking',
      'farm_shed': 'farming storage',
      'market_stall': 'trading',
      'windmill': 'grain processing',
      'library': 'research',
      'warehouse': 'large storage',
      'town_hall': 'governance',
      'census_bureau': 'demographics',
      'weather_station': 'weather monitoring',
      'health_clinic': 'medical care',
      'meeting_hall': 'social gatherings',
      'watchtower': 'threat detection',
      'labor_guild': 'workforce management',
      'archive': 'historical records',
    };
    return purposes[buildingType] || '';
  }

  /**
   * Get vague impression of a skill for social skill level 1.
   */
  private getSkillImpression(skillId: SkillId): string {
    const impressions: Record<SkillId, string> = {
      building: 'seems handy with tools',
      cooking: 'seems interested in food',
      farming: 'seems to like working with plants',
      crafting: 'seems good at making things',
      gathering: 'seems to know where to find resources',
      social: 'seems friendly and talkative',
      exploration: 'seems adventurous',
      combat: 'seems capable in a fight',
      animal_handling: 'seems good with animals',
      medicine: 'seems knowledgeable about healing',
    };
    return impressions[skillId] || 'seems skilled at something';
  }

  /**
   * Get examples of what a skilled agent can do.
   */
  private getSkillExamples(skillId: SkillId): string {
    const examples: Record<SkillId, string> = {
      building: 'can construct complex buildings',
      cooking: 'can prepare preserved food',
      farming: 'can grow high-quality crops',
      crafting: 'can create advanced items',
      gathering: 'knows where to find rare resources',
      social: 'can coordinate village efforts',
      exploration: 'can scout distant areas',
      combat: 'can defend the village',
      animal_handling: 'can tame and care for animals',
      medicine: 'can treat injuries and illnesses',
    };
    return examples[skillId] || '';
  }

  /**
   * Get information about nearby agents (from vision).
   * Shows agent names and what they're currently doing.
   */
  private getSeenAgentsInfo(world: World, seenAgentIds: string[]): string | null {
    if (!world || !seenAgentIds || seenAgentIds.length === 0) {
      return null;
    }

    const agentDescriptions: string[] = [];

    for (const agentId of seenAgentIds) {
      const agent = world.getEntity(agentId);
      if (!agent) continue;

      const identity = agent.components.get('identity') as IdentityComponent | undefined;
      const agentComp = agent.components.get('agent') as AgentComponent | undefined;

      if (!identity) continue;

      const name = identity.name;
      let description = name;

      // Add what they're currently doing if available
      if (agentComp?.behavior) {
        const behavior = agentComp.behavior;
        // Translate behavior to readable text
        let action = '';
        if (behavior === 'wander') action = 'wandering around';
        else if (behavior === 'idle') action = 'resting';
        else if (behavior === 'gather') action = 'gathering resources';
        else if (behavior === 'seek_food') action = 'looking for food';
        else if (behavior === 'talk') action = 'talking';
        else if (behavior === 'follow_agent') action = 'following someone';
        else if (behavior === 'build') action = 'building something';
        else if (behavior === 'deposit_items') action = 'storing items';
        else if (behavior === 'seek_sleep' || behavior === 'forced_sleep') action = 'sleeping';
        else action = behavior.replace(/_/g, ' ');

        description += ` (${action})`;
      }

      // Add their speech if they recently said something
      if (agentComp?.recentSpeech) {
        description += ` - said: "${agentComp.recentSpeech}"`;
      }

      agentDescriptions.push(description);
    }

    if (agentDescriptions.length === 0) {
      return null;
    }

    return `- You see nearby: ${agentDescriptions.join(', ')}\n`;
  }

  /**
   * Get information about recently seen buildings (from vision).
   * Shows building types and their functions.
   */
  /**
   * Get information about buildings the agent can see.
   * Per progressive-skill-reveal-spec.md: Information depth scales with building skill.
   */
  private getSeenBuildingsInfo(world: World, seenBuildingIds: string[], buildingSkill: SkillLevel): string | null {
    if (!world) {
      return null;
    }

    // Collect ALL buildings in the village - agents should know what exists
    // This prevents duplicate building (e.g., building campfire when one already exists)
    const allBuildings = world.query()
      .with('building')
      .executeEntities();

    // Transform building data for skill-gated info function
    const buildingData = allBuildings.map((b: Entity) => {
      const building = b.components.get('building') as BuildingComponent | undefined;
      const identity = b.components.get('identity') as IdentityComponent | undefined;
      return {
        id: b.id,
        name: building?.buildingType || 'unknown',
        status: building?.isComplete ? 'complete' : 'in-progress',
        purpose: identity?.name,
      };
    });

    // Use skill-gated village info from SkillsComponent
    const villageInfo = getVillageInfo({ buildings: buildingData }, buildingSkill);

    // Also show visible nearby buildings (only if agent has seen some)
    const buildingDescriptions: string[] = [];
    if (seenBuildingIds && seenBuildingIds.length > 0) {
      const recentBuildings = seenBuildingIds.slice(-5);

      for (const buildingId of recentBuildings) {
        const building = world.getEntity(buildingId);
        if (!building) continue;

        const buildingComp = building.components.get('building') as BuildingComponent | undefined;
        if (!buildingComp) continue;

        const type = buildingComp.buildingType;
        const status = buildingComp.isComplete ? '' : ' (under construction)';

        buildingDescriptions.push(`${type}${status}`);
      }
    }

    if (buildingDescriptions.length === 0 && !villageInfo) {
      return null;
    }

    let result = '';
    if (buildingDescriptions.length > 0) {
      result += `- Buildings you see: ${buildingDescriptions.join(', ')}\n`;
    }
    if (villageInfo) {
      result += `- ${villageInfo}\n`;
    }

    return result;
  }

  /**
   * Get storage/stockpile information from all storage buildings in the world.
   * Per progressive-skill-reveal-spec.md: Information depth scales with cooking skill.
   */
  private getStorageInfo(world: World, cookingSkill: SkillLevel): string | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    // Find all storage buildings
    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .executeEntities();

    if (storageBuildings.length === 0) {
      return null; // No storage buildings exist yet
    }

    // Aggregate all items in storage
    const totalStorage: Record<string, number> = {};

    for (const storage of storageBuildings) {
      const building = storage.components.get('building') as BuildingComponent | undefined;
      const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

      // Only count complete storage buildings
      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box' && building.buildingType !== 'warehouse') continue;

      if (inventory?.slots) {
        for (const slot of inventory.slots) {
          if (slot.itemId && slot.quantity > 0) {
            totalStorage[slot.itemId] = (totalStorage[slot.itemId] || 0) + slot.quantity;
          }
        }
      }
    }

    const agentCount = world.query().with('agent').executeEntities().length;
    const consumptionRate = agentCount * 2.5; // 2.5 food per agent per day

    // Use skill-gated food info from SkillsComponent
    const foodInfo = getFoodStorageInfo({
      items: totalStorage,
      villageSize: agentCount,
      consumptionRate,
    }, cookingSkill);

    return `- Village Storage: ${foodInfo}\n`;
  }

  /**
   * Build village status section - provides coordination context.
   * Shows what the village needs, what others are doing, and priorities.
   */
  private buildVillageStatus(world: World, currentAgentId: string): string {
    if (!world || typeof world.query !== 'function') {
      return '';
    }

    let status = '\nVillage Status:\n';

    // Get all agents
    const allAgents = world.query().with('agent').with('identity').executeEntities();
    const otherAgents = allAgents.filter(a => a.id !== currentAgentId);

    if (otherAgents.length > 0) {
      status += `- ${otherAgents.length} other villager${otherAgents.length > 1 ? 's are' : ' is'} in the village\n`;

      // Show a few names for context
      const names = otherAgents.slice(0, 3).map(a => {
        const identity = a.components.get('identity') as IdentityComponent | undefined;
        return identity?.name || 'Unknown';
      });

      if (names.length > 0) {
        status += `- Villagers present: ${names.join(', ')}`;
        if (otherAgents.length > 3) {
          status += ` and ${otherAgents.length - 3} more`;
        }
        status += '\n';
      }
    }

    // Check for critical buildings
    const allBuildings = world.query().with('building').executeEntities();
    const buildingTypes = new Set<string>();
    const incomplete: string[] = [];

    for (const b of allBuildings) {
      const building = b.components.get('building') as BuildingComponent | undefined;
      if (building) {
        if (building.isComplete) {
          buildingTypes.add(building.buildingType);
        } else {
          incomplete.push(building.buildingType);
        }
      }
    }

    const criticalMissing: string[] = [];
    if (!buildingTypes.has('campfire')) criticalMissing.push('campfire (warmth)');
    if (!buildingTypes.has('storage-chest') && !buildingTypes.has('storage-box')) {
      criticalMissing.push('storage (items)');
    }
    if (!buildingTypes.has('tent') && !buildingTypes.has('bed')) {
      criticalMissing.push('shelter (sleep)');
    }

    if (criticalMissing.length > 0) {
      status += `- MISSING critical buildings: ${criticalMissing.join(', ')}\n`;
    }

    if (incomplete.length > 0) {
      status += `- Under construction (resources COMMITTED): ${incomplete.join(', ')} - materials are already allocated, don't gather more!\n`;
    }

    return status;
  }

  /**
   * Build memories section from episodic memories.
   * Only includes truly memorable events - things worth remembering.
   * Routine tasks (harvesting, gathering, etc.) are handled by the autonomic system.
   */
  private buildEpisodicMemories(episodicMemory: EpisodicMemoryComponent | undefined, world?: World): string {
    if (!episodicMemory) {
      return 'You have no significant recent memories.';
    }

    const allMemories = episodicMemory.episodicMemories;
    if (!allMemories || allMemories.length === 0) {
      return 'You have no significant recent memories.';
    }

    // Only include truly memorable events - not routine operational tasks
    // Agents don't consciously remember every harvest, that's autonomic
    const memorableEventTypes = new Set([
      // Social - meeting people, conversations
      'conversation:utterance',
      'conversation:started',
      'conversation:ended',
      'social:conflict',
      'social:interaction',
      'information:shared',
      // Major accomplishments
      'construction:started',  // Starting to build something significant
      'harvest:first',         // First harvest of a crop type (milestone)
      // Survival events - emotionally impactful
      'need:critical',
      'agent:starved',
      'agent:collapsed',
      'survival:close_call',
      // Dreams and reflection
      'agent:dreamed',
      // Novel experiences
      'event:novel',
    ]);

    // Only exclude pure noise events that never have emotional weight
    // Everything else flows through to the emotional weight check
    // (e.g., finding a diamond has emotional weight, routine wood gathering doesn't)
    const noiseEventTypes = new Set([
      'discovery:location',    // Spatial navigation noise
      'action:walk',           // Movement noise
      'agent:idle',            // Doing nothing
      'plant:stageChanged',    // Passive plant growth
    ]);

    const meaningfulMemories = allMemories.filter((m: EpisodicMemory) => {
      // Exclude pure noise events
      if (noiseEventTypes.has(m.eventType)) {
        return false;
      }

      // Always include explicitly memorable event types
      if (memorableEventTypes.has(m.eventType)) {
        return true;
      }

      // Include recent activities regardless of importance (last 5 minutes of game time)
      // This helps agents remember what they were just doing
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes in milliseconds
      if (m.timestamp && m.timestamp > fiveMinutesAgo) {
        return true;
      }

      // Include if sufficient emotional weight to consolidate into long-term memory
      if (m.emotionalIntensity > 0.3) {
        return true;
      }

      // Include if important
      if (m.importance > 0.5) {
        return true;
      }

      // Include conversation/dialogue memories
      if (m.dialogueText) {
        return true;
      }

      return false;
    });

    if (meaningfulMemories.length === 0) {
      return 'You have no significant recent memories.';
    }

    // Take last 5 meaningful memories, most recent first
    const recentMemories = meaningfulMemories.slice(-5).reverse();
    let text = 'Recent Memories:\n';

    recentMemories.forEach((m: EpisodicMemory, i: number) => {
      // Use the summary from episodic memory (already human-readable)
      let description = m.summary;

      // Add emotional context for significant memories
      if (m.emotionalIntensity > 0.5) {
        const emotion = m.emotionalValence > 0 ? '😊' : m.emotionalValence < 0 ? '😢' : '';
        if (emotion) {
          description = `${emotion} ${description}`;
        }
      }

      // For conversation memories, show dialogue if available
      if (m.dialogueText && !description.includes(m.dialogueText)) {
        description = `${description}: "${m.dialogueText}"`;
      }

      // Resolve participant names if world is available
      if (m.participants && m.participants.length > 0 && world) {
        const participantNames = m.participants.map((id: string) => {
          const entity = world.getEntity(id);
          if (entity) {
            const identity = entity.components.get('identity') as IdentityComponent | undefined;
            return identity?.name || id.slice(0, 8);
          }
          return id.slice(0, 8);
        });
        const firstName = participantNames[0];
        if (firstName && !description.includes(firstName)) {
          description += ` (with ${participantNames.join(', ')})`;
        }
      }

      text += `${i + 1}. ${description}\n`;
    });

    return text;
  }

  /**
   * Get available actions based on context and skills.
   * Uses ActionDefinitions as the single source of truth.
   * Per progressive-skill-reveal-spec.md: Filter actions by skill level.
   *
   * NOTE: Autonomic behaviors (wander, rest, idle, seek_sleep, seek_warmth)
   * are NOT included. These are fallback behaviors handled by AutonomicSystem,
   * not executive decisions for the LLM to make.
   */
  private getAvailableActions(vision: VisionComponent | undefined, _world: World, entity?: Entity): string[] {
    // Group actions by category for better organization
    const gathering: string[] = [];
    const building: string[] = [];
    const farming: string[] = [];
    const social: string[] = [];
    const exploration: string[] = [];
    const priority: string[] = [];

    // Get agent context for contextual actions
    const needs = entity?.components.get('needs') as NeedsComponent | undefined;
    const temperature = entity?.components.get('temperature') as TemperatureComponent | undefined;
    const inventory = entity?.components.get('inventory') as InventoryComponent | undefined;
    const skills = entity?.components.get('skills') as SkillsComponent | undefined;

    // Get skill-filtered actions if agent has skills component
    const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
    if (skills) {
      for (const skillId of Object.keys(skills.levels)) {
        skillLevels[skillId as SkillId] = skills.levels[skillId as SkillId];
      }
    }

    // Calculate if agent has building-relevant needs (0-1 scale)
    const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
    const isTired = needs?.energy !== undefined && needs.energy < 0.5;

    // Check if agent has required skills for skill-gated actions
    const farmingSkill = skillLevels.farming ?? 0;
    const craftingSkill = skillLevels.crafting ?? 0;
    const cookingSkill = skillLevels.cooking ?? 0;
    const animalHandlingSkill = skillLevels.animal_handling ?? 0;
    const medicineSkill = skillLevels.medicine ?? 0;

    // PRIORITY 1: Urgent building hints (when agent has pressing needs)
    // These are just hints - the actual action is plan_build (shown later)
    if (isCold && isTired) {
      priority.push('🏗️ URGENT! You need shelter - use plan_build for campfire or tent!');
    } else if (isCold) {
      priority.push('🏗️ You\'re freezing! Use plan_build for campfire or tent!');
    } else if (isTired) {
      priority.push('🏗️ You need rest! Use plan_build for bed or bedroll!');
    }

    // PICK - Single item pickup (quick grab nearby)
    gathering.push('pick - Grab a single item nearby (say "pick wood" or "pick berries")');

    // GATHER - Stockpile resources with auto-deposit to storage
    // This is for when you want to collect a lot of something
    gathering.push('gather - Stockpile resources: collect a specified amount and automatically store in a chest (say "gather 20 wood" or "gather 50 stone")');

    // Check if mature plants are visible for seed gathering
    const hasSeenMaturePlants = vision?.seenPlants && vision.seenPlants.length > 0 && _world && vision.seenPlants.some((plantId: string) => {
      const plant = _world.getEntity(plantId);
      if (!plant) return false;
      const plantComp = plant.components.get('plant') as (Component & { stage: string; seedsProduced: number }) | undefined;
      if (!plantComp) return false;
      const validStages = ['mature', 'seeding', 'senescence'];
      return validStages.includes(plantComp.stage) && plantComp.seedsProduced > 0;
    });

    // Add explicit seed gathering hint if mature plants are visible
    if (hasSeenMaturePlants) {
      gathering.push('🌱 gather seeds - Mature plants nearby! Collect seeds for farming (say "gather seeds")');
    }

    // Add deposit_items if agent has items in inventory
    if (inventory && inventory.slots) {
      const hasItems = inventory.slots.some((slot: InventorySlot) => slot.itemId && slot.quantity > 0);
      if (hasItems) {
        gathering.push('deposit_items - Store items in a storage building (chest or box)');
      }
    }

    // FARMING ACTIONS - Per progressive-skill-reveal-spec.md: requires farming skill 1+
    const hasSeeds = inventory?.slots?.some((slot: InventorySlot) =>
      slot.itemId && slot.itemId.includes('seed')
    );

    if (farmingSkill >= 1) {
      farming.push('till - Prepare soil for planting (say "till" or "prepare soil")');

      if (hasSeeds) {
        farming.push('plant - Plant seeds in tilled soil (say "plant <seedType>")');
      }
    }

    // SOCIAL ACTIONS
    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      social.push('talk - Have a conversation');
      social.push('follow_agent - Follow someone');

      // Note: Leadership is now handled through relationship-focused instructions
      // in buildSkillAwareInstruction() and addLeadershipGuidance(), not through
      // special action hints. Let leadership emerge through social interaction.
    }

    // PLAN_BUILD - Queue a building project and auto-gather resources
    // This is the recommended way to build - available to ALL agents (no skill required)
    // The agent just decides what to build, the system handles getting resources
    building.push('plan_build - Plan a building project: queues the build and you\'ll automatically gather resources then construct it. Just say what building you want! (Examples: "plan_build storage-chest", "plan_build campfire", "plan_build tent")');

    // EXPLORATION
    exploration.push('explore - Systematically explore unknown areas to find new resources');
    exploration.push('navigate - Go to specific coordinates (say "navigate to x,y" or "go to 10,20")');

    // Advanced farming actions (when contextually relevant)
    // Per progressive-skill-reveal-spec.md: requires farming skill 1+
    if ((hasSeeds || (vision?.seenResources && vision.seenResources.length > 0)) && farmingSkill >= 1) {
      farming.push('water - Water plants to help them grow');
      farming.push('fertilize - Fertilize soil to improve growth');
    }

    // Crafting action - Per progressive-skill-reveal-spec.md: requires crafting skill 1+
    if (craftingSkill >= 1) {
      building.push('craft - Craft items at a workbench or crafting station');
    }

    // Cooking action - Per progressive-skill-reveal-spec.md: requires cooking skill 1+
    if (cookingSkill >= 1) {
      gathering.push('cook - Cook food at a campfire or oven');
    }

    // Animal handling actions - Per progressive-skill-reveal-spec.md: requires animal_handling skill 2+
    if (animalHandlingSkill >= 2) {
      social.push('tame - Tame a wild animal');
      social.push('house - Lead a tamed animal to housing');
    }

    // Medicine action - Per progressive-skill-reveal-spec.md: requires medicine skill 2+
    if (medicineSkill >= 2) {
      social.push('heal - Heal an injured agent');
    }

    // Combine all categories with headers
    const actions: string[] = [];

    if (priority.length > 0) {
      actions.push('URGENT:');
      actions.push(...priority.map(a => `  ${a}`));
    }

    if (gathering.length > 0) {
      actions.push('');
      actions.push('GATHERING & RESOURCES:');
      actions.push(...gathering.map(a => `  ${a}`));
    }

    if (farming.length > 0) {
      actions.push('');
      actions.push('FARMING:');
      actions.push(...farming.map(a => `  ${a}`));
    }

    if (building.length > 0) {
      actions.push('');
      actions.push('BUILDING & CRAFTING:');
      actions.push(...building.map(a => `  ${a}`));
    }

    if (social.length > 0) {
      actions.push('');
      actions.push('SOCIAL:');
      actions.push(...social.map(a => `  ${a}`));
    }

    if (exploration.length > 0) {
      actions.push('');
      actions.push('EXPLORATION & NAVIGATION:');
      actions.push(...exploration.map(a => `  ${a}`));
    }

    return actions;
  }

  /**
   * Build skill-aware instruction based on agent's skills and village state.
   * Per progressive-skill-reveal-spec.md:
   * - Only suggest domain actions to skilled agents
   * - Unskilled agents get basic survival instructions
   */
  private buildSkillAwareInstruction(
    _agent: Entity,
    world: World,
    skills: SkillsComponent | undefined,
    _needs: NeedsComponent | undefined,
    _temperature: TemperatureComponent | undefined,
    _inventory: InventoryComponent | undefined,
    _conversation: ConversationComponent | undefined,
    vision: VisionComponent | undefined
  ): string {
    // Check if agent is a leader - we'll add leadership guidance later
    const personality = _agent.components.get('personality') as PersonalityComponent | undefined;
    const isLeader = personality?.leadership && personality.leadership > 0.7;

    // Get skill levels
    const buildingSkill = skills?.levels.building ?? 0;
    const cookingSkill = skills?.levels.cooking ?? 0;
    const farmingSkill = skills?.levels.farming ?? 0;
    const socialSkill = skills?.levels.social ?? 0;
    const gatheringSkill = skills?.levels.gathering ?? 0;
    const explorationSkill = skills?.levels.exploration ?? 0;

    // Find agent's highest skill (their primary specialty)
    const skillLevels = [
      { skill: 'building', level: buildingSkill },
      { skill: 'cooking', level: cookingSkill },
      { skill: 'farming', level: farmingSkill },
      { skill: 'social', level: socialSkill },
      { skill: 'gathering', level: gatheringSkill },
      { skill: 'exploration', level: explorationSkill },
    ];
    skillLevels.sort((a, b) => b.level - a.level);
    const primarySkill = skillLevels[0];

    // Check village state for context-specific suggestions
    const allBuildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
    const storageBuildings = allBuildings.filter((b: Entity) => {
      const building = b.components.get('building') as BuildingComponent | undefined;
      return building?.buildingType === 'storage-chest' || building?.buildingType === 'storage-box';
    });
    const needsStorage = storageBuildings.length < 2;

    // Check food situation
    const allStorageInventories = allBuildings
      .filter((b: Entity) => {
        const building = b.components.get('building') as BuildingComponent | undefined;
        return building?.isComplete;
      })
      .map((b: Entity) => b.components.get('inventory') as InventoryComponent | undefined)
      .filter((inv): inv is InventoryComponent => inv !== undefined);

    let totalFood = 0;
    for (const inv of allStorageInventories) {
      const foodSlots = inv.slots?.filter((s: InventorySlot) =>
        s.itemId === 'berries' || s.itemId === 'meat' || s.itemId === 'cooked_meat'
      ) ?? [];
      for (const slot of foodSlots) {
        totalFood += slot.quantity ?? 0;
      }
    }

    const agentCount = world.query()?.with?.('agent')?.executeEntities?.()?.length ?? 1;
    const foodPerDay = agentCount * 2.5;
    const daysOfFood = totalFood / foodPerDay;
    const foodLow = daysOfFood < 2;

    // Build base instruction based on skills
    let baseInstruction: string;

    // Provide skill-specific suggestions based on primary skill (level 2+)
    if (primarySkill && primarySkill.level >= 2) {
      switch (primarySkill.skill) {
        case 'building':
          if (needsStorage) {
            baseInstruction = `As the village BUILDER, storage capacity is CRITICALLY needed! You MUST construct storage-chests NOW to organize resources and prevent loss. Use plan_build immediately! What will you build?`;
          } else {
            baseInstruction = `As the village BUILDER, you are responsible for infrastructure! Check what buildings are missing and construct them NOW. The village depends on your expertise. What will you build?`;
          }
          break;

        case 'cooking':
          if (foodLow) {
            baseInstruction = `FOOD EMERGENCY! As the village COOK, supplies are CRITICALLY LOW (${Math.floor(daysOfFood * 10) / 10} days left)! You MUST gather food sources immediately and cook them to prevent starvation. Act NOW!`;
          } else {
            baseInstruction = `As the village COOK, you MUST maintain food supplies! Gather ingredients and cook meals - cooked food is more nutritious and lasts longer. Keep the village fed!`;
          }
          break;

        case 'farming':
          if (foodLow) {
            baseInstruction = `FOOD CRISIS! As the village FARMER, you have only ${Math.floor(daysOfFood * 10) / 10} days of food remaining! You MUST gather food immediately and plant crops for long-term sustainability. The village survival depends on YOU!`;
          } else {
            baseInstruction = `As the village FARMER, you are responsible for food sustainability! Plant crops, gather seeds, and ensure long-term food production. The village needs your farming expertise NOW!`;
          }
          break;

        case 'social':
          if (vision?.seenAgents && vision.seenAgents.length > 0) {
            baseInstruction = `As the village COORDINATOR, you MUST organize efforts! Talk with nearby villagers to understand what they're doing and help direct the village's work. Coordinate NOW!`;
          } else {
            baseInstruction = `As the village COORDINATOR, you are responsible for organization! Connect with others, understand their needs, and help coordinate village efforts. Communication is key!`;
          }
          break;

        case 'gathering':
          baseInstruction = `As the village GATHERER, resources are ESSENTIAL for survival! You MUST collect wood, stone, food, and materials that the village needs. Gather aggressively!`;
          break;

        case 'exploration':
          baseInstruction = `As the village EXPLORER, you MUST scout for new resources and map unknown areas! Discovery is critical for village growth. Explore NOW!`;
          break;

        default:
          baseInstruction = `Focus on gathering basic resources and meeting your needs. What should you do?`;
      }
    }
    // Fallback for agents with skill level 1 (novice) - give generic guidance based on their skill
    else if (primarySkill && primarySkill.level === 1) {
      switch (primarySkill.skill) {
        case 'building':
          baseInstruction = `You have some building knowledge. Consider learning by constructing simple structures. What should you do?`;
          break;
        case 'cooking':
          baseInstruction = `You know a bit about cooking. Try preparing simple meals to practice your skills. What should you do?`;
          break;
        case 'farming':
          baseInstruction = `You have basic farming knowledge. Consider planting crops or gathering seeds. What should you do?`;
          break;
        case 'social':
          baseInstruction = `You're naturally friendly. Try talking with others and building relationships. What should you do?`;
          break;
        case 'gathering':
          baseInstruction = `You have an eye for resources. Focus on collecting materials for the village. What should you do?`;
          break;
        case 'exploration':
          baseInstruction = `You enjoy exploring. Consider scouting nearby areas for resources. What should you do?`;
          break;
        default:
          baseInstruction = `Focus on gathering basic resources and meeting your needs. What should you do?`;
      }
    } else {
      // Default: context-aware instruction for completely unskilled agents
      const suggestions: string[] = [];

      // Check what's visible and suggest based on that
      if (vision?.seenResources && vision.seenResources.length > 0) {
        suggestions.push('gather wood or stone to help the village');
      }

      if (needsStorage) {
        suggestions.push('help gather materials for storage');
      }

      if (vision?.seenAgents && vision.seenAgents.length > 0) {
        suggestions.push('talk to other villagers to learn what needs doing');
      }

      if (suggestions.length > 0) {
        baseInstruction = `As a new villager, you can: ${suggestions.join(', ')}. What will you do?`;
      } else {
        baseInstruction = `Focus on gathering basic resources and meeting your needs. What should you do?`;
      }
    }

    // Add leadership guidance as a supplement (not replacement) if agent is a leader
    if (isLeader) {
      baseInstruction = this.addLeadershipGuidance(baseInstruction, _agent, vision);
    }

    return baseInstruction;
  }

  /**
   * Add relationship-focused leadership guidance to an instruction.
   * Leadership is additive - leaders still do their specialist work, but also help coordinate.
   */
  private addLeadershipGuidance(
    baseInstruction: string,
    agent: Entity,
    vision: VisionComponent | undefined
  ): string {
    const relationships = agent.components.get('relationship') as (Component & { relationships: Map<string, any> }) | undefined;

    // Early game: Leaders should get to know people
    if (!relationships || relationships.relationships.size === 0) {
      return `${baseInstruction}\n\nAs someone with leadership qualities, also take time to get to know your fellow villagers. Talk to them to learn about their skills and what they enjoy doing.`;
    }

    // Mid/late game: Leaders have relationships and can coordinate
    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      return `${baseInstruction}\n\nWith your leadership qualities, also check in on nearby villagers - see if anyone needs help or if you can connect people to work that suits them.`;
    }

    return `${baseInstruction}\n\nYour leadership qualities mean you naturally notice when the village needs better coordination - help where you can.`;
  }

  /**
   * Format the structured prompt into a single string.
   * Intelligently collapses empty sections.
   */
  private formatPrompt(prompt: AgentPrompt): string {
    // Order designed for natural cognitive flow:
    // 1. Who am I? (identity, personality)
    // 2. What are my goals? (motivation)
    // 3. What do I remember? (context from past)
    // 4. What's happening now? (current situation)
    // 5. What can I do? (options)
    // 6. What should I do? (the decision)

    const sections: string[] = [prompt.systemPrompt];

    // Skills come early - knowing what you're good at helps frame decisions
    if (prompt.skills && prompt.skills.trim()) {
      sections.push(prompt.skills);
    }

    // Priorities - what you're currently focusing on
    if (prompt.priorities && prompt.priorities.trim()) {
      sections.push(prompt.priorities);
    }

    // Goals come early - they inform how you interpret everything else
    if (prompt.goals && prompt.goals.trim()) {
      sections.push('Your Goals:\n' + prompt.goals);
    }

    // Memories provide context for decision-making
    if (prompt.memories && !prompt.memories.includes('no significant recent memories')) {
      sections.push(prompt.memories);
    }

    // Current situation - what's happening right now
    if (prompt.worldContext && prompt.worldContext.trim()) {
      sections.push(prompt.worldContext);
    }

    // Village coordination - what others are doing, village needs
    if (prompt.villageStatus && prompt.villageStatus.trim()) {
      sections.push(prompt.villageStatus);
    }

    // Buildings you can construct (before actions, since plan_build references these)
    if (prompt.buildings && prompt.buildings.trim()) {
      sections.push(prompt.buildings);
    }
    // Available options
    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('What You Can Do:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    // The actual question
    sections.push(prompt.instruction);

    // Response format instructions - must be JSON
    // Note: No "thinking" field needed - model uses extended thinking internally
    const responseFormat = `RESPOND IN JSON ONLY. Use this exact format:
{
  "speaking": "what you say out loud (or empty string if silent)",
  "action": {
    "type": "action_name",
    "target": "optional target like 'wood' or agent name",
    "amount": optional_number,
    "building": "building type for plan_build"
  }
}

Example responses:
{"speaking": "", "action": {"type": "gather", "target": "wood", "amount": 20}}
{"speaking": "Hey Haven!", "action": {"type": "talk", "target": "Haven"}}
{"speaking": "", "action": {"type": "explore"}}
{"speaking": "I'm going to build us a storage chest!", "action": {"type": "plan_build", "building": "storage-chest"}}
{"speaking": "", "action": {"type": "plan_build", "building": "campfire"}}`;

    sections.push(responseFormat);

    return sections.join('\n\n');
  }
}

/**
 * Task familiarity data for tracking build/craft times.
 */
export interface TaskFamiliarity {
  builds?: Record<string, { lastTime: number; count?: number }>;
  crafts?: Record<string, { lastTime: number; count?: number }>;
}

/**
 * Get build time estimate based on agent's task familiarity.
 * Per progressive-skill-reveal-spec.md:
 * - Returns null if never built before
 * - Returns last build time if built before
 */
export function getBuildTimeEstimate(
  buildingType: string,
  taskFamiliarity: TaskFamiliarity | undefined
): string | null {
  if (!taskFamiliarity || !taskFamiliarity.builds) {
    return null;
  }

  const buildData = taskFamiliarity.builds[buildingType];
  if (!buildData || !buildData.lastTime) {
    return null;
  }

  const seconds = buildData.lastTime;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `(last time: ${hours} hour${hours > 1 ? 's' : ''})`;
  } else if (minutes > 0) {
    return `(last time: ${minutes} min)`;
  } else {
    return `(last time: ${seconds}s)`;
  }
}

/**
 * Get craft time estimate based on agent's task familiarity.
 * Per progressive-skill-reveal-spec.md:
 * - Returns null if never crafted before
 * - Returns last craft time if crafted before
 */
export function getCraftTimeEstimate(
  recipeId: string,
  taskFamiliarity: TaskFamiliarity | undefined
): string | null {
  if (!taskFamiliarity || !taskFamiliarity.crafts) {
    return null;
  }

  const craftData = taskFamiliarity.crafts[recipeId];
  if (!craftData || !craftData.lastTime) {
    return null;
  }

  const seconds = craftData.lastTime;
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `(last time: ${minutes} min)`;
  } else {
    return `(last time: ${seconds}s)`;
  }
}

/**
 * Build building section with time estimates and skill gates.
 * Per progressive-skill-reveal-spec.md:
 * - Shows only available buildings based on skill level
 * - Includes time estimates for previously built structures
 * - Does NOT suggest collaboration for simple structures
 */
export function buildBuildingSection(
  availableBuildings: string[],
  taskFamiliarity: TaskFamiliarity | undefined,
  _skills?: SkillsComponent
): string {
  if (availableBuildings.length === 0) {
    return 'No buildings available';
  }

  const buildingList = availableBuildings.map(buildingId => {
    const estimate = getBuildTimeEstimate(buildingId, taskFamiliarity);
    if (estimate) {
      return `${buildingId} ${estimate}`;
    }
    return buildingId;
  }).join(', ');

  return `Buildings: ${buildingList}`;
}

/**
 * Build crafting section with recipes.
 * Per progressive-skill-reveal-spec.md:
 * - Crafting is ALWAYS solo (no collaboration suggestions)
 */
export function buildCraftingSection(
  availableRecipes: string[],
  taskFamiliarity: TaskFamiliarity | undefined,
  _skills?: SkillsComponent
): string {
  if (availableRecipes.length === 0) {
    return 'No recipes available';
  }

  const recipeList = availableRecipes.map(recipeId => {
    const estimate = getCraftTimeEstimate(recipeId, taskFamiliarity);
    if (estimate) {
      return `${recipeId} ${estimate}`;
    }
    return recipeId;
  }).join(', ');

  return `Recipes: ${recipeList}`;
}

/**
 * Get strategic advice for in-progress buildings.
 * Per progressive-skill-reveal-spec.md:
 * - Should NOT suggest gathering more materials (materials already committed)
 * - Should indicate that materials are consumed
 */
export function getStrategicAdviceForInProgress(building: {
  type: string;
  isComplete: boolean;
  progress: number;
}): string {
  if (building.isComplete) {
    return '';
  }

  return `${building.type} is under construction (${Math.floor(building.progress * 100)}% complete). Materials already committed.`;
}

/**
 * Generate strategic instruction based on agent skills and village state.
 * Per progressive-skill-reveal-spec.md:
 * - Only suggest domain actions to skilled agents
 * - Unskilled agents get basic survival instructions
 */
export function generateStrategicInstruction(
  agent: { skills: { levels: Record<string, number> } },
  villageState: { needsStorage?: boolean; foodLow?: boolean }
): string {
  const skills = agent.skills.levels;
  const suggestions: string[] = [];

  // Building suggestions - only for builders (level 2+)
  if ((skills.building ?? 0) >= 2 && villageState.needsStorage) {
    suggestions.push('Village needs more storage capacity');
  }

  // Food suggestions - only for cooks/farmers (level 2+)
  if (((skills.cooking ?? 0) >= 2 || (skills.farming ?? 0) >= 2) && villageState.foodLow) {
    suggestions.push('food supplies are critically low');
  }

  // If no skilled suggestions, give basic survival instruction
  if (suggestions.length === 0) {
    return 'Focus on gathering resources and meeting your basic needs';
  }

  return suggestions.join('. ');
}

/**
 * Get skilled agents formatted as village resources.
 * Per progressive-skill-reveal-spec.md:
 * - Skilled agents appear as resources (like buildings)
 */
export function getSkilledAgentsAsResources(
  agents: Array<{
    id: string;
    name: string;
    skills: { levels: Record<string, number> };
  }>
): string {
  const resources: string[] = [];

  for (const agent of agents) {
    const skills = agent.skills.levels;
    const skillList: string[] = [];

    if ((skills.building ?? 0) >= 2) skillList.push('building');
    if ((skills.cooking ?? 0) >= 2) skillList.push('cook');
    if ((skills.farming ?? 0) >= 2) skillList.push('farming');
    if ((skills.crafting ?? 0) >= 2) skillList.push('crafting');

    if (skillList.length > 0) {
      resources.push(`${agent.name} (skilled ${skillList.join(', ')})`);
    }
  }

  return resources.join('\n');
}

/**
 * Get perceived agent skills based on observer's social skill.
 * Per progressive-skill-reveal-spec.md:
 * - Social 0: Nothing
 * - Social 1: Vague impression
 * - Social 2: General skill
 * - Social 3: Specific level
 */
export function getPerceivedAgentSkills(
  observer: { skills: { levels: Record<string, number> } },
  target: { name: string; skills: { levels: Record<string, number> } }
): string {
  const socialLevel = observer.skills.levels.social ?? 0;

  if (socialLevel === 0) {
    return '';
  }

  // Find target's highest skill
  const skills = target.skills.levels;
  let highestSkill = '';
  let highestLevel = 0;
  for (const [skillId, level] of Object.entries(skills)) {
    if (level > highestLevel) {
      highestLevel = level;
      highestSkill = skillId;
    }
  }

  if (highestLevel === 0) {
    return '';
  }

  if (socialLevel === 1) {
    // Vague impression
    if (highestSkill === 'building') return `${target.name} seems handy with tools`;
    if (highestSkill === 'cooking') return `${target.name} seems interested in food`;
    if (highestSkill === 'farming') return `${target.name} seems to like working with plants`;
    return `${target.name} seems skilled at something`;
  }

  if (socialLevel === 2) {
    // General skill
    return `${target.name} is good at ${highestSkill}`;
  }

  // Social 3+: Specific level
  return `${target.name}: skilled ${highestSkill} (level ${highestLevel})`;
}

/**
 * Get affordances available through relationships.
 * Per progressive-skill-reveal-spec.md:
 * - Stranger: Nothing
 * - Acquaintance: Can ask questions
 * - Friend: Can request help
 * - Close friend: Can delegate tasks
 */
export function getAffordancesThroughRelationships(
  agent: {
    relationships: Array<{
      targetId: string;
      targetName: string;
      relationshipLevel: string;
    }>;
  },
  otherAgents: Array<{
    id: string;
    name: string;
    skills: { levels: Record<string, number> };
  }>
): string {
  const affordances: string[] = [];

  for (const rel of agent.relationships) {
    if (rel.relationshipLevel === 'stranger') {
      continue; // No affordances
    }

    const targetAgent = otherAgents.find(a => a.id === rel.targetId);
    if (!targetAgent) continue;

    const skills = targetAgent.skills.levels;
    const skillList: string[] = [];
    const buildingExamples: string[] = [];

    if ((skills.building ?? 0) >= 2) {
      skillList.push('building');
      buildingExamples.push('forge', 'workshop', 'cabin');
    }
    if ((skills.cooking ?? 0) >= 2) {
      skillList.push('cooking');
    }
    if ((skills.farming ?? 0) >= 2) {
      skillList.push('farming');
    }

    if (skillList.length === 0) continue;

    if (rel.relationshipLevel === 'acquaintance') {
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can ask questions`);
    } else if (rel.relationshipLevel === 'friend') {
      const examples = buildingExamples.length > 0 ? ` (${buildingExamples.join(', ')})` : '';
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can request help with tasks${examples}`);
    } else if (rel.relationshipLevel === 'close_friend') {
      affordances.push(`${rel.targetName} (${skillList.join(', ')}) - can delegate tasks, teach/learn`);
    }
  }

  if (affordances.length === 0) {
    return '';
  }

  return `AVAILABLE THROUGH RELATIONSHIPS:\n${affordances.join('\n')}`;
}

/**
 * Get building access description based on ownership.
 * Per progressive-skill-reveal-spec.md:
 * - Communal: Available to all
 * - Personal: Owner only
 * - Shared: Owner + shared list
 */
export function getBuildingAccessDescription(building: {
  id: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  accessType: string;
  sharedWith?: string[];
}): string {
  if (building.accessType === 'communal') {
    return `${building.name} (communal)`;
  }

  if (building.accessType === 'personal') {
    return `${building.name} (${building.ownerName}'s)`;
  }

  if (building.accessType === 'shared') {
    return `${building.name} (shared: ${building.ownerName})`;
  }

  return building.name;
}
