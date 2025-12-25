import type { Entity } from '@ai-village/core';

/**
 * Structured prompt following agent-system/spec.md REQ-AGT-002
 */
export interface AgentPrompt {
  systemPrompt: string;       // Role, personality, rules
  worldContext: string;        // Current situation
  memories: string;            // Relevant memories
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
    const memory = agent.components.get('memory') as any;
    const inventory = agent.components.get('inventory') as any;
    const temperature = agent.components.get('temperature') as any;
    const conversation = agent.components.get('conversation') as any;

    // System Prompt: Role, personality, rules
    const systemPrompt = this.buildSystemPrompt(name?.name || 'Agent', personality);

    // World Context: Current situation
    const worldContext = this.buildWorldContext(needs, vision, inventory, world, temperature, memory, conversation);

    // Memories: Relevant recent memories
    const memoriesText = this.buildMemories(memory);

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
        console.log(`[StructuredPromptBuilder] 🏗️ CRITICAL BUILDING INSTRUCTION - cold + materials (wood=${woodQty}, stone=${stoneQty})`);
      }
      else if (hasBuildingMaterials && isTired) {
        instruction = `You're exhausted and have materials. Building a bed (10 wood + 15 fiber) or bedroll will help you recover faster. You should build sleeping quarters NOW before you collapse! What will you build?`;
        console.log(`[StructuredPromptBuilder] 🏗️ URGENT BUILDING INSTRUCTION - tired + materials (wood=${woodQty}, stone=${stoneQty})`);
      }
      // STRONG PRIORITY: Agent has abundant materials (village development)
      else if (woodQty >= 15 || stoneQty >= 15) {
        instruction = `You have abundant building materials (${woodQty} wood, ${stoneQty} stone)! The village desperately needs infrastructure. You should BUILD something now - storage for supplies, shelter for sleeping, or tools for crafting. This is your chance to help the community thrive! What will you build?`;
        console.log(`[StructuredPromptBuilder] 🏗️ STRONG BUILDING INSTRUCTION - abundant materials (wood=${woodQty}, stone=${stoneQty})`);
      }
      // MODERATE PRIORITY: Agent has enough materials for basic building
      else if (woodQty >= 10 || stoneQty >= 10) {
        instruction = `You have enough materials (${woodQty} wood, ${stoneQty} stone) to build something useful! Consider building storage-chest (10 wood) for supplies or a lean-to (10 wood + 5 leaves) for shelter. Building now will benefit everyone! What should you do?`;
        console.log(`[StructuredPromptBuilder] 🏗️ BUILDING SUGGESTION - sufficient materials (wood=${woodQty}, stone=${stoneQty})`);
      }
      // Encourage gathering if low on materials
      else if (!hasWood || !hasStone) {
        const missing = [];
        if (!hasWood) missing.push('wood (from trees)');
        if (!hasStone) missing.push('stone (from rocks)');
        instruction = `You're low on ${missing.join(' and ')}. Gathering ${missing.length > 1 ? 'both materials' : 'this material'} is important for construction. What should you do?`;
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
      availableActions: actions,
      instruction,
    });
  }

  /**
   * Build system prompt with role and personality.
   */
  private buildSystemPrompt(name: string, personality: any): string {
    if (!personality) {
      return `You are ${name}, a villager in a forest village.`;
    }

    let prompt = `You are ${name}, a villager in a forest village.\n\nPersonality:\n`;

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
   */
  private buildWorldContext(needs: any, vision: any, inventory: any, world: any, temperature?: any, memory?: any, conversation?: any): string {
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
    const storageInfo = this.getStorageInfo(world);
    if (storageInfo) {
      context += storageInfo;
    }

    // Vision - buildings
    if (vision) {
      // Show recently seen buildings with types and locations
      if (vision.seenBuildings && vision.seenBuildings.length > 0) {
        const buildingInfo = this.getSeenBuildingsInfo(world, vision.seenBuildings);
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
        if (resourceTypes.wood) {
          descriptions.push(`${resourceTypes.wood} tree${resourceTypes.wood > 1 ? 's' : ''}`);
        }
        if (resourceTypes.stone) {
          descriptions.push(`${resourceTypes.stone} rock${resourceTypes.stone > 1 ? 's' : ''}`);
        }
        if (resourceTypes.food) {
          descriptions.push(`${resourceTypes.food} food source${resourceTypes.food > 1 ? 's' : ''}`);
        }

        if (descriptions.length > 0) {
          context += `- You see ${descriptions.join(', ')} nearby`;

          // Add gathering hint if trees or rocks are visible
          if (resourceTypes.wood || resourceTypes.stone) {
            context += ` (you can gather these for materials)`;
          }
          context += `\n`;
        }
      }

      if (agentCount === 0 && resourceCount === 0) {
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
  private getSeenBuildingsInfo(world: any, seenBuildingIds: string[]): string | null {
    if (!world || !seenBuildingIds || seenBuildingIds.length === 0) {
      return null;
    }

    const buildingDescriptions: string[] = [];
    const buildingTypes: Record<string, number> = {};

    // Collect building info (limit to 5 most recent)
    const recentBuildings = seenBuildingIds.slice(-5);

    for (const buildingId of recentBuildings) {
      const building = world.getEntity(buildingId);
      if (!building) continue;

      const buildingComp = building.getComponent('building');
      const posComp = building.getComponent('position');

      if (!buildingComp || !posComp) continue;

      const type = buildingComp.buildingType;
      buildingTypes[type] = (buildingTypes[type] || 0) + 1;

      // Add functional description
      const distance = 'nearby'; // Could calculate actual distance if needed
      let description = '';

      if (type === 'campfire') {
        description = `${type} (${distance}) - provides warmth`;
      } else if (type === 'storage-chest' || type === 'storage-box') {
        description = `${type} (${distance}) - stores items`;
      } else if (type === 'tent' || type === 'lean-to' || type === 'bed' || type === 'bedroll') {
        description = `${type} (${distance}) - for sleeping`;
      } else if (type === 'well') {
        description = `${type} (${distance}) - provides water`;
      } else if (type === 'workbench') {
        description = `${type} (${distance}) - for crafting`;
      } else {
        description = `${type} (${distance})`;
      }

      buildingDescriptions.push(description);
    }

    if (buildingDescriptions.length === 0) {
      return null;
    }

    return `- Buildings you see: ${buildingDescriptions.join(', ')}\n`;
  }

  /**
   * Get storage/stockpile information from all storage buildings in the world.
   * Shows total available resources across all storage.
   */
  private getStorageInfo(world: any): string | null {
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
    let hasAnyItems = false;

    for (const storage of storageBuildings) {
      const building = storage.getComponent('building');
      const inventory = storage.getComponent('inventory');

      // Only count complete storage buildings
      if (!building?.isComplete) continue;
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      if (inventory?.slots) {
        for (const slot of inventory.slots) {
          if (slot.itemId && slot.quantity > 0) {
            totalStorage[slot.itemId] = (totalStorage[slot.itemId] || 0) + slot.quantity;
            hasAnyItems = true;
          }
        }
      }
    }

    // Always show storage status, even if empty
    if (!hasAnyItems) {
      return `- Village Storage: empty (no food or resources in stockpile)\n`;
    }

    const items = Object.entries(totalStorage)
      .map(([item, qty]) => `${qty} ${item}`)
      .join(', ');

    // Highlight if storage has food
    const hasFood = (totalStorage.food ?? 0) > 0;
    const foodNote = hasFood ? ' [food available!]' : '';

    return `- Village Storage: ${items}${foodNote}\n`;
  }

  /**
   * Build memories section with meaningful details.
   */
  private buildMemories(memory: any): string {
    if (!memory?.memories || memory.memories.length === 0) {
      return 'You have no significant recent memories.';
    }

    const recentMemories = memory.memories.slice(-5);
    let text = 'Recent Memories:\n';

    recentMemories.forEach((m: any, i: number) => {
      let description = '';

      // Create meaningful descriptions based on memory type
      if (m.type === 'resource_gathered') {
        description = `You gathered ${m.metadata?.resourceType || 'resources'}`;
      } else if (m.type === 'conversation') {
        const speaker = m.metadata?.speaker || 'someone';
        const topic = m.metadata?.topic || 'something';
        description = `You talked with ${speaker} about ${topic}`;
      } else if (m.type === 'building_seen') {
        const buildingType = m.metadata?.buildingType || 'a building';
        description = `You saw a ${buildingType}`;
      } else if (m.type === 'agent_interaction') {
        const agent = m.metadata?.agentName || 'someone';
        description = `You interacted with ${agent}`;
      } else if (m.type === 'ate_food') {
        description = `You ate some food`;
      } else if (m.type === 'slept') {
        description = `You slept and recovered energy`;
      } else if (m.type === 'built_structure') {
        const structure = m.metadata?.buildingType || 'something';
        description = `You built a ${structure}`;
      } else if (m.type === 'deposited_items') {
        description = `You stored items in storage`;
      } else {
        // Fallback to type name if no specific handler
        description = m.type.replace(/_/g, ' ');
      }

      text += `${i + 1}. ${description}\n`;
    });

    return text;
  }

  /**
   * Get available actions based on context.
   * These MUST match the valid behaviors in ResponseParser.
   */
  private getAvailableActions(vision: any, world: any, entity?: any): string[] {
    const actions = [
      'wander - Explore the area',
      'idle - Do nothing, rest and recover',
    ];

    // Get agent context for contextual actions
    const needs = entity?.components.get('needs');
    const temperature = entity?.components.get('temperature');
    const inventory = entity?.components.get('inventory');

    // Calculate if agent has building-relevant needs or resources
    const isCold = temperature?.state === 'cold' || temperature?.state === 'dangerously_cold';
    const isTired = needs?.energy < 50;
    const hasResources = inventory?.slots?.some((slot: any) =>
      (slot.itemId === 'wood' || slot.itemId === 'stone' || slot.itemId === 'cloth') && slot.quantity >= 5
    );

    // Debug logging to understand vision state
    if (vision) {
      console.log('[StructuredPromptBuilder] Vision state:', {
        seenResources: vision.seenResources,
        seenResourcesCount: vision.seenResources?.length || 0,
        seenAgents: vision.seenAgents,
        seenAgentsCount: vision.seenAgents?.length || 0,
        canSeeResources: vision.canSeeResources,
      });
    }

    // PRIORITY 1: Building actions (when contextually relevant)
    // Show building EARLY in the list when agent has materials
    if (hasResources) {
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

      actions.splice(1, 0, buildDesc); // Insert as SECOND action (after wander)
      console.log(`[StructuredPromptBuilder] 🏗️ BUILD ACTION PROMOTED to position 2 - hasResources=${hasResources}, isCold=${isCold}, isTired=${isTired}`);
    }

    // Add contextual actions - use exact behavior names from ResponseParser
    if (vision?.seenResources && vision.seenResources.length > 0) {
      actions.push('seek_food - Find and eat food');

      // Make gather action more specific based on what's visible
      let hasWood = false;
      let hasStone = false;

      if (world) {
        for (const resourceId of vision.seenResources) {
          const resource = world.getEntity(resourceId);
          if (resource) {
            const resourceComp = resource.getComponent('resource');
            if (resourceComp) {
              if (resourceComp.resourceType === 'wood') hasWood = true;
              if (resourceComp.resourceType === 'stone') hasStone = true;
            }
          }
        }
      }

      if (hasWood || hasStone) {
        // Make the gather action more explicit with clear examples
        const gatherExamples = [];
        if (hasWood) gatherExamples.push('"chop" or "gather wood"');
        if (hasStone) gatherExamples.push('"mine" or "gather stone"');
        actions.push(`gather - Collect resources for building (say ${gatherExamples.join(' or ')})`);
      }
    }

    // FARMING ACTIONS - always available (agents can farm anywhere with grass/dirt)
    // Check if agent is near grass/dirt tiles that could be tilled
    // For now, make farming actions available if agent has seeds OR sees untilled soil
    const hasSeeds = inventory?.slots?.some((slot: any) =>
      slot.itemId && slot.itemId.includes('seed')
    );

    // Always show farming actions to encourage autonomous farming behavior
    // The actual validation happens when the action is executed
    actions.push('till - Prepare soil for planting (say "till" or "prepare soil")');

    if (hasSeeds) {
      actions.push('plant - Plant seeds in tilled soil (say "plant <seedType>")');
    }

    // Add harvest action if agent sees mature plants (TODO: vision check)
    actions.push('harvest - Harvest mature crops');

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
    // Add at end if not contextually relevant (no materials)
    if (!actions.some(a => a.includes('BUILD') || a.startsWith('build'))) {
      actions.push('build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)');
    }

    // Navigation & Exploration actions (Phase 4.5)
    actions.push('navigate - Navigate to specific coordinates (say "navigate to x,y" or "go to 10,20")');
    actions.push('explore_frontier - Explore the edges of known territory systematically');
    actions.push('explore_spiral - Spiral outward from home base to explore new areas');

    // Only add follow_gradient if agent has SocialGradient component with gradients
    if (entity && entity.components.has('SocialGradient')) {
      const socialGradient = entity.components.get('SocialGradient') as any;
      if (socialGradient && socialGradient.allGradients && socialGradient.allGradients.length > 0) {
        actions.push('follow_gradient - Follow social hints to find resources others have mentioned');
      }
    }

    // Debug log final actions list
    console.log('[StructuredPromptBuilder] Final available actions:', actions.map(a => a.split(' - ')[0]));

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

    if (prompt.availableActions && prompt.availableActions.length > 0) {
      sections.push('Available Actions:\n' + prompt.availableActions.map(a => `- ${a}`).join('\n'));
    }

    sections.push(prompt.instruction);

    return sections.join('\n\n') + '\n\nYour response:';
  }
}
