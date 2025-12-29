import type { Entity } from '@ai-village/core';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  type GoalsComponent,
  type EpisodicMemoryComponent,
  type EpisodicMemory,
  getFoodStorageInfo,
  getVillageInfo,
  formatGoalsForPrompt,
  getAvailableBuildings,
} from '@ai-village/core';

/**
 * Structured prompt following agent-system/spec.md REQ-AGT-002
 */
export interface AgentPrompt {
  systemPrompt: string;       // Role, personality, rules
  worldContext: string;        // Current situation
  memories: string;            // Relevant memories
  goals?: string;              // Personal goals (optional)
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
  buildPrompt(agent: Entity, world: any): string {
    const name = agent.components.get('identity') as any;
    const personality = agent.components.get('personality') as any;
    const needs = agent.components.get('needs') as any;
    const vision = agent.components.get('vision') as any;
    const episodicMemory = agent.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const legacyMemory = agent.components.get('memory') as any; // For spatial knowledge only
    const inventory = agent.components.get('inventory') as any;
    const temperature = agent.components.get('temperature') as any;
    const conversation = agent.components.get('conversation') as any;
    const skills = agent.components.get('skills') as SkillsComponent | undefined;

    // System Prompt: Role, personality, rules, skill-gated building knowledge
    const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality, world, inventory, skills);

    // World Context: Current situation (uses legacy memory for spatial knowledge only)
    const worldContext = this.buildWorldContext(needs, vision, inventory, world, temperature, legacyMemory, conversation, agent);

    // Memories: Relevant recent memories (uses episodic memory for meaningful events)
    const memoriesText = this.buildEpisodicMemories(episodicMemory, world);

    // Personal Goals
    const goals = agent.components.get('goals') as GoalsComponent | undefined;
    const goalsText = goals ? formatGoalsForPrompt(goals) : undefined;

    // Available Actions
    const actions = this.getAvailableActions(vision, world, agent);

    // Instruction - simple and direct for function calling
    // Build instruction with context-aware motivation
    let instruction = `What should you do? Don't overthink - give your gut reaction and choose an action.`;

    // PRIORITY: If in an active conversation, prompt for response
    if (conversation?.isActive && conversation?.partnerId) {
      let partnerName = 'them';
      const partner = world.getEntity(conversation.partnerId);
      const partnerIdentity = partner?.getComponent('identity');
      if (partnerIdentity?.name) {
        partnerName = partnerIdentity.name;
      }

      instruction = `You're in a conversation with ${partnerName}. Read the conversation history above and respond naturally. What do you want to say?`;
    }
    // PRIORITY 2: Building motivation (when agent has resources + needs)
    else if (inventory) {
      const woodQty = inventory.slots.filter((s: any) => s.itemId === 'wood').reduce((sum: number, s: any) => sum + s.quantity, 0);
      const stoneQty = inventory.slots.filter((s: any) => s.itemId === 'stone').reduce((sum: number, s: any) => sum + s.quantity, 0);
      const hasWood = woodQty >= 5;
      const hasStone = stoneQty >= 5;
      const hasCloth = inventory.slots.some((s: any) => s.itemId === 'cloth' && s.quantity >= 5);
      const hasBuildingMaterials = hasWood || hasStone || hasCloth;

      const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
      const isTired = needs?.energy < 50;

      // STRONGEST PRIORITY: Agent has resources + urgent need
      if (hasBuildingMaterials && isCold) {
        instruction = `YOU ARE COLD and you have building materials! This is URGENT - building a campfire (10 stone + 5 wood) or tent (10 cloth + 5 wood) will save you from freezing. You MUST build shelter NOW! What will you build?`;
      }
      else if (hasBuildingMaterials && isTired) {
        instruction = `You're exhausted and have materials. Building a bed (10 wood + 15 fiber) or bedroll will help you recover faster. You should build sleeping quarters NOW before you collapse! What will you build?`;
      }
      // STRONG PRIORITY: Agent has abundant materials (village development)
      else if (woodQty >= 15 || stoneQty >= 15) {
        instruction = `You have abundant building materials (${woodQty} wood, ${stoneQty} stone)! The village desperately needs infrastructure. You should BUILD something now - storage for supplies, shelter for sleeping, or tools for crafting. This is your chance to help the community thrive! What will you build?`;
      }
      // MODERATE PRIORITY: Agent has enough materials for basic building
      else if (woodQty >= 10 || stoneQty >= 10) {
        instruction = `You have enough materials (${woodQty} wood, ${stoneQty} stone) to build something useful! Consider building storage-chest (10 wood) for supplies or a lean-to (10 wood + 5 leaves) for shelter. Building now will benefit everyone! What should you do?`;
      }
      // Encourage gathering if low on materials - prioritize food and wood over stone
      else if (!hasWood) {
        instruction = `You're low on wood. Wood is the MOST IMPORTANT early-game resource - needed for storage, shelter, and tools. Gather wood from trees! What should you do?`;
      }
      // Only encourage stone gathering if agent already has wood
      else if (hasWood && !hasStone) {
        instruction = `You have wood but no stone. Stone is useful for some buildings like campfires. Consider gathering stone from rocks if needed. What should you do?`;
      }
      // Add motivation for social interaction (when not building-focused)
      else if (vision?.heardSpeech && vision.heardSpeech.length > 1) {
        // Group conversation happening - encourage joining
        const speakers = vision.heardSpeech.map((s: any) => s.speaker).join(', ');
        const isExtraverted = personality && personality.extraversion > 60;

        if (isExtraverted) {
          instruction = `There's a group conversation happening with ${speakers}! You love being social - this is your moment to jump in and contribute. What should you do?`;
        } else {
          instruction = `There's a group conversation happening nearby (${speakers}). You could join in and share your thoughts, or listen and learn. What should you do?`;
        }
      }
      else if (vision?.seenAgents && vision.seenAgents.length > 0) {
        // Get names of nearby agents for personalized prompting
        const nearbyNames: string[] = [];
        for (const agentId of vision.seenAgents.slice(0, 3)) {
          const otherAgent = world.getEntity(agentId);
          const identity = otherAgent?.getComponent('identity') as any;
          if (identity?.name) {
            nearbyNames.push(identity.name);
          }
        }

        // Personalize based on personality traits
        const isExtraverted = personality && personality.extraversion > 60;
        const isAgreeable = personality && personality.agreeableness > 60;

        if (nearbyNames.length > 0) {
          if (isExtraverted) {
            instruction = `You see ${nearbyNames.join(', ')} nearby! You're naturally social and love connecting with others. Why not strike up a conversation? What should you do?`;
          } else if (isAgreeable) {
            instruction = `You see ${nearbyNames.join(', ')} nearby. You care about others - maybe check how they're doing or offer to help? What should you do?`;
          } else {
            // Even non-social personalities should consider talking sometimes
            instruction = `You see ${nearbyNames.join(', ')} nearby. Talking with others can help you learn what's happening in the village and coordinate efforts. What should you do?`;
          }
        } else {
          instruction = `You see other villagers nearby. Connecting with them could be valuable. What should you do?`;
        }
      }
      // Encourage gathering seeds if plants with seeds are visible
      else if (vision?.seenPlants && vision.seenPlants.length > 0) {
        // Check if any plants have seeds
        let plantsWithSeeds = 0;
        for (const plantId of vision.seenPlants) {
          const plant = world.getEntity(plantId);
          if (plant) {
            const plantComp = plant.getComponent('plant');
            if (plantComp && plantComp.seedsProduced > 0) {
              plantsWithSeeds++;
            }
          }
        }

        if (plantsWithSeeds > 0) {
          instruction = `You see ${plantsWithSeeds} plant${plantsWithSeeds > 1 ? 's' : ''} with seeds ready to gather! Collecting seeds is essential for farming and growing your own food. Gather seeds now to secure your future food supply! What should you do?`;
        }
      }
      // Encourage gathering if no resources and resources are visible
      else if (!hasBuildingMaterials && vision?.seenResources && vision.seenResources.length > 0) {
        instruction = `Your inventory is empty and you see useful resources nearby. Gathering BOTH wood and stone now will help you build shelter and tools later. Both materials are equally important! What should you do?`;
      }
    }

    // Combine into single prompt
    return this.formatPrompt({
      systemPrompt,
      worldContext,
      memories: memoriesText,
      goals: goalsText,
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with role and personality.
   * Per progressive-skill-reveal-spec.md: Building availability is skill-gated.
   */
  private buildSystemPrompt(name: string, personality: any, world?: any, inventory?: any, skills?: SkillsComponent): string {
    // Base prompt
    let prompt = `You are ${name}, a villager in a forest village.\n\n`;

    // Add skill-gated building knowledge from registry
    // Per progressive-skill-reveal-spec.md Section 4: Tiered Building Availability
    if (world && (world as any).buildingRegistry) {
      const registry = (world as any).buildingRegistry;

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

      if (buildings && buildings.length > 0) {
        prompt += 'Buildings you can construct (you can build ANY of these):\n';

        for (const building of buildings) {
          const costs = building.resourceCost
            .map((c: any) => `${c.amountRequired} ${c.resourceId}`)
            .join(' + ');

          // Check if agent has materials in stock for this building
          let stockStatus = ' ';
          if (inventory && inventory.slots) {
            const hasAllResources = building.resourceCost.every((cost: any) => {
              const total = inventory.slots
                .filter((s: any) => s.itemId === cost.resourceId)
                .reduce((sum: number, s: any) => sum + s.quantity, 0);
              return total >= cost.amountRequired;
            });
            stockStatus = hasAllResources ? ' ✅ IN STOCK - ' : ' ';
          }

          prompt += `-${stockStatus}${building.name}: ${costs} - ${building.description}\n`;
        }
        prompt += '\n';
      }
    }

    if (!personality) {
      return prompt;
    }

    prompt += 'Personality:\n';

    // Describe personality based on Big Five
    if (personality.openness > 70) {
      prompt += '- You are curious and adventurous\n';
    } else if (personality.openness < 30) {
      prompt += '- You are cautious and traditional\n';
    }

    if (personality.extraversion > 70) {
      prompt += '- You are outgoing and social\n';
    } else if (personality.extraversion < 30) {
      prompt += '- You are quiet and introspective\n';
    }

    if (personality.agreeableness > 70) {
      prompt += '- You love helping others\n';
    } else if (personality.agreeableness < 30) {
      prompt += '- You prefer to focus on your own goals\n';
    }

    if (personality.workEthic > 70) {
      prompt += '- You are hardworking and dedicated\n';
    } else if (personality.workEthic < 30) {
      prompt += '- You prefer to take life easy\n';
    }

    if (personality.leadership > 70) {
      prompt += '- You are a natural leader who takes initiative and organizes others\n';
      prompt += '- You feel responsible for coordinating the village and helping everyone work together\n';
      prompt += '- You should actively check on others, delegate tasks, and ensure the community thrives\n';
    } else if (personality.leadership < 30) {
      prompt += '- You prefer to follow others and take direction\n';
    }

    return prompt;
  }

  /**
   * Build world context from current situation.
   * Per progressive-skill-reveal-spec.md: Information depth scales with skill level.
   */
  private buildWorldContext(needs: any, vision: any, inventory: any, world: any, temperature?: any, memory?: any, conversation?: any, entity?: Entity): string {
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
        const partnerIdentity = partner?.getComponent('identity');
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
          const speakerIdentity = speaker?.getComponent('identity');
          if (speakerIdentity?.name) {
            speakerName = speakerIdentity.name;
          }
        }

        context += `- ${speakerName}: "${msg.message}"\n`;
      }

      context += '\n';
    }

    // Needs
    if (needs) {
      const hunger = Math.round(needs.hunger);
      const energy = Math.round(needs.energy);

      context += `- Hunger: ${hunger}% (${hunger < 30 ? 'very hungry' : hunger < 60 ? 'could eat' : 'satisfied'})\n`;
      context += `- Energy: ${energy}% (${energy < 30 ? 'exhausted' : energy < 60 ? 'tired' : 'rested'})\n`;
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
            const resourceComp = resource.getComponent('resource');
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
        // Group plants by species and stage
        const plantsBySpecies: Record<string, { total: number; withSeeds: number; withFruit: number; stages: string[] }> = {};

        for (const plantId of vision.seenPlants || []) {
          const plant = world.getEntity(plantId);
          if (plant) {
            const plantComp = plant.getComponent('plant');
            if (plantComp) {
              const species = plantComp.speciesId;
              if (!plantsBySpecies[species]) {
                plantsBySpecies[species] = { total: 0, withSeeds: 0, withFruit: 0, stages: [] };
              }
              plantsBySpecies[species].total += 1;
              if (plantComp.seedsProduced > 0) {
                plantsBySpecies[species].withSeeds += 1;
              }
              if ((plantComp.fruitCount || 0) > 0) {
                plantsBySpecies[species].withFruit += 1;
              }
              if (!plantsBySpecies[species].stages.includes(plantComp.stage)) {
                plantsBySpecies[species].stages.push(plantComp.stage);
              }
            }
          }
        }

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
          context += '\nWhat you hear:\n';
          context += `- ${vision.heardSpeech[0].speaker} says: "${vision.heardSpeech[0].text}"\n`;
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

    return context;
  }

  /**
   * Get information about known resource locations from memory.
   * Shows heat sources, food sources, and water sources.
   */
  private getKnownResourceLocations(memory: any, _world: any): string | null {
    if (!memory?.memories || memory.memories.length === 0) {
      return null;
    }

    const heatSources: string[] = [];
    const foodSources: string[] = [];
    const waterSources: string[] = [];

    // Look through memories for resource locations
    for (const mem of memory.memories.slice(-10)) { // Last 10 memories
      if (mem.type === 'building_seen' && mem.metadata) {
        const buildingType = mem.metadata.buildingType;
        if (buildingType === 'campfire') {
          heatSources.push(`campfire at (${Math.floor(mem.x)}, ${Math.floor(mem.y)})`);
        } else if (buildingType === 'well') {
          waterSources.push(`well at (${Math.floor(mem.x)}, ${Math.floor(mem.y)})`);
        }
      } else if (mem.type === 'resource_location' && mem.metadata) {
        if (mem.metadata.resourceType === 'food') {
          foodSources.push(`food at (${Math.floor(mem.x)}, ${Math.floor(mem.y)})`);
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
  private suggestBuildings(needs: any, temperature: any, inventory: any): string {
    const suggestions: string[] = [];

    // Helper to check if agent has required resources
    const hasResources = (items: Record<string, number>): boolean => {
      return Object.entries(items).every(([itemId, qty]) => {
        const slots = inventory?.slots || [];
        const totalQty = slots
          .filter((s: any) => s.itemId === itemId)
          .reduce((sum: number, s: any) => sum + s.quantity, 0);
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
    const fullSlots = inventory?.slots.filter((s: any) => s.itemId).length || 0;
    if (fullSlots >= 8) {
      if (hasResources({ wood: 10 })) {
        suggestions.push('storage-chest (10 wood) - 20 item slots');
      } else {
        suggestions.push('storage-chest (10 wood) - 20 item slots [NEED: 10 wood]');
      }
    }

    // Check if tired → suggest sleeping structures
    if (needs?.energy < 50) {
      if (hasResources({ wood: 10, plant_fiber: 15 })) {
        suggestions.push('bed (10 wood + 15 fiber) - best sleep quality (+50% recovery)');
      }
      if (hasResources({ plant_fiber: 20, leather: 5 })) {
        suggestions.push('bedroll (20 fiber + 5 leather) - portable sleep (+30% recovery)');
      }
    }

    if (suggestions.length > 0) {
      return `\n\nBuildings you could build:\n${suggestions.map((s: string) => `- ${s}`).join('\n')}`;
    }
    return '';
  }

  /**
   * Get information about nearby agents (from vision).
   * Shows agent names and what they're currently doing.
   */
  private getSeenAgentsInfo(world: any, seenAgentIds: string[]): string | null {
    if (!world || !seenAgentIds || seenAgentIds.length === 0) {
      return null;
    }

    const agentDescriptions: string[] = [];

    for (const agentId of seenAgentIds) {
      const agent = world.getEntity(agentId);
      if (!agent) continue;

      const identity = agent.getComponent('identity');
      const agentComp = agent.getComponent('agent');

      if (!identity) continue;

      const name = identity.name;
      let description = name;

      // Add what they're currently doing if available
      if (agentComp?.currentBehavior) {
        const behavior = agentComp.currentBehavior;
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
        else if (behavior === 'sleep') action = 'sleeping';
        else action = behavior.replace(/_/g, ' ');

        description += ` (${action})`;
      }

      // Add their speech if they recently said something
      if (agentComp?.lastSpeech) {
        description += ` - said: "${agentComp.lastSpeech}"`;
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
  private getSeenBuildingsInfo(world: any, seenBuildingIds: string[], buildingSkill: SkillLevel): string | null {
    if (!world || !seenBuildingIds || seenBuildingIds.length === 0) {
      return null;
    }

    // Collect all complete buildings in the village for village info
    const allBuildings = world.query()
      .with('building')
      .executeEntities();

    // Transform building data for skill-gated info function
    const buildingData = allBuildings.map((b: Entity) => {
      const building = b.components.get('building') as any;
      const identity = b.components.get('identity') as any;
      return {
        id: b.id,
        name: building?.buildingType || 'unknown',
        status: building?.isComplete ? 'complete' : 'in-progress',
        purpose: identity?.name,
      };
    });

    // Use skill-gated village info from SkillsComponent
    const villageInfo = getVillageInfo({ buildings: buildingData }, buildingSkill);

    // Also show visible nearby buildings
    const buildingDescriptions: string[] = [];
    const recentBuildings = seenBuildingIds.slice(-5);

    for (const buildingId of recentBuildings) {
      const building = world.getEntity(buildingId);
      if (!building) continue;

      const buildingComp = building.getComponent('building');
      if (!buildingComp) continue;

      const type = buildingComp.buildingType;
      const status = buildingComp.isComplete ? '' : ' (under construction)';

      buildingDescriptions.push(`${type}${status}`);
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
  private getStorageInfo(world: any, cookingSkill: SkillLevel): string | null {
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
      const building = storage.components.get('building');
      const inventory = storage.components.get('inventory');

      // Only count complete storage buildings
      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box' && building.buildingType !== 'granary' && building.buildingType !== 'warehouse') continue;

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
   * Build memories section from episodic memories.
   * Only includes truly memorable events - things worth remembering.
   * Routine tasks (harvesting, gathering, etc.) are handled by the autonomic system.
   */
  private buildEpisodicMemories(episodicMemory: EpisodicMemoryComponent | undefined, world?: any): string {
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
            const identity = entity.getComponent('identity');
            return identity?.name || id.slice(0, 8);
          }
          return id.slice(0, 8);
        });
        if (!description.includes(participantNames[0])) {
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
  private getAvailableActions(vision: any, _world: any, entity?: any): string[] {
    const actions: string[] = [];

    // Get agent context for contextual actions
    const needs = entity?.components.get('needs');
    const temperature = entity?.components.get('temperature');
    const inventory = entity?.components.get('inventory');
    const skills = entity?.components.get('skills') as SkillsComponent | undefined;

    // Get skill-filtered actions if agent has skills component
    const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
    if (skills) {
      for (const skillId of Object.keys(skills.levels)) {
        skillLevels[skillId as SkillId] = skills.levels[skillId as SkillId];
      }
    }

    // Calculate if agent has building-relevant needs or resources
    const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
    const isTired = needs?.energy < 50;
    const hasResources = inventory?.slots?.some((slot: any) =>
      (slot.itemId === 'wood' || slot.itemId === 'stone' || slot.itemId === 'cloth') && slot.quantity >= 5
    );

    // Check if agent has required skills for skill-gated actions
    const buildingSkill = skillLevels.building ?? 0;
    const farmingSkill = skillLevels.farming ?? 0;
    const craftingSkill = skillLevels.crafting ?? 0;
    const cookingSkill = skillLevels.cooking ?? 0;
    const animalHandlingSkill = skillLevels.animal_handling ?? 0;
    const medicineSkill = skillLevels.medicine ?? 0;

    // PRIORITY 1: Building actions (when contextually relevant)
    // Per progressive-skill-reveal-spec.md: build requires building skill 1+
    // Show building EARLY in the list when agent has materials AND sufficient skill
    if (hasResources && buildingSkill >= 1) {
      let buildDesc = 'build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)';

      // Make description more urgent based on needs
      if (isCold && isTired) {
        buildDesc = '🏗️ BUILD - URGENT! Build shelter or bed to survive (you\'re cold AND tired)';
      } else if (isCold) {
        buildDesc = '🏗️ BUILD - Build campfire or tent NOW (you\'re freezing!)';
      } else if (isTired) {
        buildDesc = '🏗️ BUILD - Build bed or bedroll (you need better rest)';
      } else {
        // Even without urgent needs, promote building when agent has abundant materials
        const totalMaterials = inventory?.slots?.reduce((sum: number, slot: any) => {
          if (slot.itemId === 'wood' || slot.itemId === 'stone' || slot.itemId === 'cloth') {
            return sum + slot.quantity;
          }
          return sum;
        }, 0) || 0;

        if (totalMaterials >= 20) {
          buildDesc = '🏗️ BUILD - You have lots of materials! Build storage, shelter, or tools for the village';
        }
      }

      // Insert build as FIRST action when urgent
      actions.unshift(buildDesc);
    }

    // PICK - Single item pickup (quick grab nearby)
    actions.push('pick - Grab a single item nearby (say "pick wood" or "pick berries")');

    // GATHER - Stockpile resources with auto-deposit to storage
    // This is for when you want to collect a lot of something
    actions.push('gather - Stockpile resources: collect a specified amount and automatically store in a chest (say "gather 20 wood" or "gather 50 stone")');

    // Check if mature plants are visible for seed gathering
    const hasSeenMaturePlants = vision?.seenPlants && vision.seenPlants.length > 0 && _world && vision.seenPlants.some((plantId: string) => {
      const plant = _world.getEntity(plantId);
      if (!plant) return false;
      const plantComp = plant.components.get('plant');
      if (!plantComp) return false;
      const validStages = ['mature', 'seeding', 'senescence'];
      return validStages.includes(plantComp.stage) && plantComp.seedsProduced > 0;
    });

    // Add explicit seed gathering hint if mature plants are visible
    if (hasSeenMaturePlants) {
      actions.push('🌱 gather seeds - Mature plants nearby! Collect seeds for farming (say "gather seeds")');
    }

    // FARMING ACTIONS - Per progressive-skill-reveal-spec.md: requires farming skill 1+
    const hasSeeds = inventory?.slots?.some((slot: any) =>
      slot.itemId && slot.itemId.includes('seed')
    );

    if (farmingSkill >= 1) {
      actions.push('till - Prepare soil for planting (say "till" or "prepare soil")');

      if (hasSeeds) {
        actions.push('plant - Plant seeds in tilled soil (say "plant <seedType>")');
      }
    }

    if (vision?.seenAgents && vision.seenAgents.length > 0) {
      actions.push('talk - Have a conversation');
      actions.push('follow_agent - Follow someone');

      // Add meeting actions for leaders or social agents
      if (entity) {
        const personality = entity.components.get('personality');
        // Leaders (high leadership trait) or highly extraverted agents can call meetings
        if (personality && (personality.leadership > 70 || personality.extraversion > 80)) {
          actions.push('call_meeting - Call a meeting to gather everyone and discuss something (say "meeting about <topic>")');
        }
      }
    }

    // Add deposit_items if agent has items in inventory
    if (inventory && inventory.slots) {
      const hasItems = inventory.slots.some((slot: any) => slot.itemId && slot.quantity > 0);
      if (hasItems) {
        actions.push('deposit_items - Store items in a storage building (chest or box)');
      }
    }

    // Always available: build action (if not already added above)
    // Per progressive-skill-reveal-spec.md: build requires building skill 1+
    // Add at end if not contextually relevant (no materials) but agent has skill
    if (!actions.some(a => a.includes('BUILD') || a.startsWith('build')) && buildingSkill >= 1) {
      actions.push('build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)');
    }

    // Exploration (consolidated - system determines strategy)
    actions.push('explore - Explore unknown areas to find new resources');

    // Navigation (specific coordinates)
    actions.push('navigate - Go to specific coordinates (say "navigate to x,y" or "go to 10,20")');

    // Advanced farming actions (when contextually relevant)
    // Per progressive-skill-reveal-spec.md: requires farming skill 1+
    if ((hasSeeds || (vision?.seenResources && vision.seenResources.length > 0)) && farmingSkill >= 1) {
      actions.push('water - Water plants to help them grow');
      actions.push('fertilize - Fertilize soil to improve growth');
    }

    // Crafting action - Per progressive-skill-reveal-spec.md: requires crafting skill 1+
    if (craftingSkill >= 1) {
      actions.push('craft - Craft items at a workbench or crafting station');
    }

    // Cooking action - Per progressive-skill-reveal-spec.md: requires cooking skill 1+
    if (cookingSkill >= 1) {
      actions.push('cook - Cook food at a campfire or oven');
    }

    // Animal handling actions - Per progressive-skill-reveal-spec.md: requires animal_handling skill 2+
    if (animalHandlingSkill >= 2) {
      actions.push('tame - Tame a wild animal');
      actions.push('house - Lead a tamed animal to housing');
    }

    // Medicine action - Per progressive-skill-reveal-spec.md: requires medicine skill 2+
    if (medicineSkill >= 2) {
      actions.push('heal - Heal an injured agent');
    }

    return actions;
  }

  /**
   * Format the structured prompt into a single string.
   * Intelligently collapses empty sections.
   */
  private formatPrompt(prompt: AgentPrompt): string {
    const sections: string[] = [prompt.systemPrompt];

    // Only add non-empty sections
    if (prompt.worldContext && prompt.worldContext.trim()) {
      sections.push(prompt.worldContext);
    }

    if (prompt.memories && !prompt.memories.includes('no significant recent memories')) {
      sections.push(prompt.memories);
    }

    if (prompt.goals && prompt.goals.trim()) {
      sections.push('Personal Goals:\n' + prompt.goals);
    }

    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('Available Actions:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    sections.push(prompt.instruction);

    // Response format instructions - must be JSON
    const responseFormat = `RESPOND IN JSON ONLY. Use this exact format:
{
  "thinking": "your internal thoughts about what to do",
  "speaking": "what you say out loud (or empty string if silent)",
  "action": {
    "type": "action_name",
    "target": "optional target like 'wood' or agent name",
    "amount": optional_number
  }
}

Example responses:
{"thinking": "I should gather wood for building", "speaking": "", "action": {"type": "gather", "target": "wood", "amount": 20}}
{"thinking": "I want to chat with Haven", "speaking": "Hey Haven!", "action": {"type": "talk", "target": "Haven"}}
{"thinking": "Let me explore", "speaking": "", "action": {"type": "explore"}}`;

    sections.push(responseFormat);

    return sections.join('\n\n');
  }
}

/**
 * Get build time estimate based on agent's task familiarity.
 * Per progressive-skill-reveal-spec.md:
 * - Returns null if never built before
 * - Returns last build time if built before
 */
export function getBuildTimeEstimate(
  buildingType: string,
  taskFamiliarity: any
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
  taskFamiliarity: any
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
  taskFamiliarity: any,
  _skills?: any
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
  taskFamiliarity: any,
  _skills?: any
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
