import type { Entity, Component } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type SkillsComponent,
  type SkillLevel,
  type NeedsComponent,
  type VisionComponent,
  type InventoryComponent,
  type InventorySlot,
  type TemperatureComponent,
  type ConversationComponent,
  type MemoryComponent,
  type IdentityComponent,
  type PositionComponent,
  type AgentComponent,
  getFoodStorageInfo,
  getVillageInfo,
  isEntityVisibleWithSkill,
  ALL_SKILL_IDS,
} from '@ai-village/core';
import type { BuildingComponent } from '@ai-village/core';
import { HarmonyContextBuilder } from './HarmonyContextBuilder.js';
import { promptCache } from '../PromptCacheManager.js';

// Chunk spatial query injection for O(1) building lookups
let chunkSpatialQuery: any | null = null;

export function injectChunkSpatialQueryToWorldContextBuilder(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
  console.log('[WorldContextBuilder] ChunkSpatialQuery injected for O(1) campfire detection');
}

/**
 * Builds world context sections for agent prompts.
 * Extracted from StructuredPromptBuilder for better separation of concerns.
 */
export class WorldContextBuilder {
  private harmonyBuilder = new HarmonyContextBuilder();

  /**
   * Build world context from current situation.
   * Per progressive-skill-reveal-spec.md: Information depth scales with skill level.
   */
  buildWorldContext(
    needs: NeedsComponent | undefined,
    vision: VisionComponent | undefined,
    inventory: InventoryComponent | undefined,
    world: World,
    temperature?: TemperatureComponent,
    memory?: MemoryComponent,
    conversation?: ConversationComponent,
    entity?: Entity
  ): string {
    const skills = entity?.components.get('skills') as SkillsComponent | undefined;
    const cookingSkill = (skills?.levels.cooking ?? 0) as SkillLevel;
    const buildingSkill = (skills?.levels.building ?? 0) as SkillLevel;
    const architectureSkill = (skills?.levels.architecture ?? skills?.levels.building ?? 0) as SkillLevel;

    // Get agent position for aerial harmony
    const position = entity?.components.get('position') as PositionComponent | undefined;

    let context = 'Current Situation:\n';

    // PRIORITY: Show active conversation history first
    context += this.buildConversationContext(conversation, world);

    // Needs (NeedsComponent uses 0-1 scale, convert to 0-100 for display)
    context += this.buildNeedsContext(needs);

    // Temperature
    context += this.buildTemperatureContext(temperature);

    // Inventory
    context += this.buildInventoryContext(inventory);

    // Storage/Stockpile levels
    const storageInfo = this.getStorageInfo(world, cookingSkill);
    if (storageInfo) {
      context += storageInfo;
    }

    // Vision - buildings, agents, resources, plants
    context += this.buildVisionContext(vision, world, skills, buildingSkill);

    // Aerial harmony for flying creatures (z > 0)
    if (position && position.z > 0 && architectureSkill >= 2) {
      const currentTick = world.tick ?? 0;
      const aerialContext = this.harmonyBuilder.buildAerialHarmonyContext(
        world,
        { x: position.x, y: position.y, z: position.z },
        architectureSkill,
        currentTick
      );
      if (aerialContext) {
        context += aerialContext;
      }

      // Flight path hints for higher skill levels
      const flightHints = this.harmonyBuilder.buildFlightPathHints(
        world,
        { x: position.x, y: position.y, z: position.z },
        architectureSkill,
        currentTick
      );
      if (flightHints) {
        context += flightHints;
      }
    }

    // Memory - known resource locations
    if (memory) {
      const resourceMemories = this.getKnownResourceLocations(memory);
      if (resourceMemories) {
        context += resourceMemories;
      }
    }

    // Building recommendations based on needs
    if (needs || temperature) {
      context += this.suggestBuildings(needs, temperature, inventory, world, entity);
    }

    // Terrain features
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
   * Build conversation context section.
   */
  private buildConversationContext(conversation: ConversationComponent | undefined, world: World): string {
    if (!conversation?.isActive || !conversation?.messages || conversation.messages.length === 0) {
      return '';
    }

    let context = '\n--- ACTIVE CONVERSATION ---\n';

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
    return context;
  }

  /**
   * Build needs context section.
   */
  private buildNeedsContext(needs: NeedsComponent | undefined): string {
    if (!needs) return '';

    let context = '';
    const hunger = Math.round(needs.hunger * 100);
    const energy = Math.round(needs.energy * 100);

    context += `- Hunger: ${hunger}% (${hunger < 30 ? 'very hungry' : hunger < 60 ? 'could eat' : 'satisfied'})\n`;
    context += `- Energy: ${energy}% (${energy < 10 ? 'exhausted' : energy < 30 ? 'tired' : 'rested'})\n`;

    return context;
  }

  /**
   * Build temperature context section.
   */
  private buildTemperatureContext(temperature: TemperatureComponent | undefined): string {
    if (!temperature) return '';

    const temp = Math.round(temperature.currentTemp);
    let tempDesc = 'comfortable';
    if (temperature.state === 'dangerously_cold') tempDesc = 'dangerously cold';
    else if (temperature.state === 'cold') tempDesc = 'cold';
    else if (temperature.state === 'dangerously_hot') tempDesc = 'dangerously hot';
    else if (temperature.state === 'hot') tempDesc = 'hot';

    return `- Temperature: ${temp}°C (${tempDesc})\n`;
  }

  /**
   * Build inventory context section.
   */
  private buildInventoryContext(inventory: InventoryComponent | undefined): string {
    if (!inventory) return '';

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
      return `- Inventory: ${items}\n`;
    }
    return '- Inventory: empty (you have no resources)\n';
  }

  /**
   * Build vision context section with tiered awareness.
   *
   * Tiered Vision (1 tile = 1 meter):
   * - Close range (~10m): Full detail for nearby entities
   * - Area range (~50m): Summarized counts
   * - Distant range (~200m): Landmarks only
   */
  private buildVisionContext(
    vision: VisionComponent | undefined,
    world: World,
    skills: SkillsComponent | undefined,
    buildingSkill: SkillLevel
  ): string {
    if (!vision) return '';

    let context = '';

    // Buildings (use seenBuildings for backward compat)
    if (vision.seenBuildings && vision.seenBuildings.length > 0) {
      const buildingInfo = this.getSeenBuildingsInfo(world, vision.seenBuildings, buildingSkill);
      if (buildingInfo) {
        context += buildingInfo;
      }

      // Add harmony context for architecture-skilled agents
      const architectureSkill = (skills?.levels.architecture ?? skills?.levels.building ?? 0) as SkillLevel;
      if (architectureSkill >= 2) {
        const harmonyContext = this.harmonyBuilder.buildHarmonyContext(
          world,
          vision.seenBuildings,
          architectureSkill
        );
        if (harmonyContext) {
          context += harmonyContext;
        }

        const placementHints = this.harmonyBuilder.buildPlacementHints(
          world,
          vision.seenBuildings,
          architectureSkill
        );
        if (placementHints) {
          context += placementHints;
        }
      }
    }

    // TIERED AGENT AWARENESS
    // Close range: detailed info about nearby agents
    const nearbyAgents = vision.nearbyAgents ?? [];
    const areaAgents = vision.seenAgents ?? [];

    if (nearbyAgents.length > 0) {
      // Detailed info for close-range agents
      const nearbyInfo = this.getSeenAgentsInfo(world, nearbyAgents);
      if (nearbyInfo) {
        context += nearbyInfo;
      }
    }

    // Area range: just mention count of more distant agents
    const distantAgentCount = areaAgents.length - nearbyAgents.length;
    if (distantAgentCount > 0) {
      context += `- You notice ${distantAgentCount} more villager${distantAgentCount > 1 ? 's' : ''} in the distance\n`;
    }

    // If no nearby but some in area, show summary
    if (nearbyAgents.length === 0 && areaAgents.length > 0) {
      context += `- You see ${areaAgents.length} villager${areaAgents.length > 1 ? 's' : ''} nearby\n`;
    }

    // TIERED RESOURCE AWARENESS
    const nearbyResources = vision.nearbyResources ?? [];
    const areaResources = vision.seenResources ?? [];

    if (nearbyResources.length > 0) {
      // Detailed for close resources
      context += this.buildResourceContext(nearbyResources, world);
    }

    // Summarize distant resources
    const distantResourceCount = areaResources.length - nearbyResources.length;
    if (distantResourceCount > 0) {
      context += `- More resources visible in the area (${distantResourceCount} sources)\n`;
    }

    // TIERED PLANT AWARENESS
    const seenPlants = vision.seenPlants ?? [];
    if (seenPlants.length > 0) {
      context += this.buildPlantContext(seenPlants, world, skills);
    }

    // DISTANT LANDMARKS (for navigation)
    const landmarks = vision.distantLandmarks ?? [];
    if (landmarks.length > 0) {
      const landmarkDescriptions = landmarks.slice(0, 5).map((l: string) => {
        const parts = l.split('_');
        const type = parts[0];
        return type;
      });
      const uniqueTypes = [...new Set(landmarkDescriptions)];
      if (uniqueTypes.length > 0) {
        context += `- Landmarks visible: ${uniqueTypes.join(', ')} in the distance\n`;
      }
    }

    // Empty area
    const totalVisible = areaAgents.length + areaResources.length + seenPlants.length;
    if (totalVisible === 0) {
      context += '- The area around you is empty\n';
    }

    // Hearing
    if (vision.heardSpeech && vision.heardSpeech.length > 0) {
      context += this.buildHearingContext(vision.heardSpeech);
    }

    return context;
  }

  /**
   * Build resource context from visible resources.
   */
  private buildResourceContext(seenResources: string[], world: World): string {
    const resourceTypes: Record<string, number> = {};
    for (const resourceId of seenResources) {
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

    if (resourceTypes.food) {
      descriptions.push(`${resourceTypes.food} food source${resourceTypes.food > 1 ? 's' : ''} `);
    }
    if (resourceTypes.wood) {
      descriptions.push(`${resourceTypes.wood} tree${resourceTypes.wood > 1 ? 's' : ''}`);
    }
    if (resourceTypes.stone && resourceTypes.stone < 5) {
      descriptions.push(`${resourceTypes.stone} rock${resourceTypes.stone > 1 ? 's' : ''}`);
    } else if (resourceTypes.stone) {
      descriptions.push('some rocks');
    }

    if (descriptions.length === 0) return '';

    let result = `- You see ${descriptions.join(', ')} nearby`;
    if (resourceTypes.food) {
      result += ` (food is essential for survival!)`;
    } else if (resourceTypes.wood) {
      result += ` (wood is essential for building)`;
    }
    return result + `\n`;
  }

  /**
   * Build plant context from visible plants.
   */
  private buildPlantContext(
    seenPlants: string[],
    world: World,
    skills: SkillsComponent | undefined
  ): string {
    const speciesResourceMap: Record<string, string> = {
      'blueberry-bush': 'berry',
      'raspberry-bush': 'berry',
      'blackberry-bush': 'berry',
      'berry_bush': 'berry',
      'apple': 'apple',
      'apple-tree': 'apple',
      'carrot': 'carrot',
      'wheat': 'wheat',
    };

    const gatherableFoods: string[] = [];
    const plantsBySpecies: Record<string, { total: number; withSeeds: number; withFruit: number; stages: string[] }> = {};

    for (const plantId of seenPlants) {
      const plant = world.getEntity(plantId);
      if (!plant) continue;

      const plantComp = plant.components.get('plant') as (Component & { speciesId: string; seedsProduced: number; fruitCount?: number; stage: string }) | undefined;
      if (!plantComp) continue;

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

      if (!canSee) continue;

      if (!plantsBySpecies[species]) {
        plantsBySpecies[species] = { total: 0, withSeeds: 0, withFruit: 0, stages: [] };
      }
      plantsBySpecies[species].total += 1;
      if (plantComp.seedsProduced > 0) {
        plantsBySpecies[species].withSeeds += 1;
      }
      if ((plantComp.fruitCount || 0) > 0) {
        plantsBySpecies[species].withFruit += 1;
        const resourceName = speciesResourceMap[species] || 'fruit';
        gatherableFoods.push(resourceName);
      }
      if (!plantsBySpecies[species].stages.includes(plantComp.stage)) {
        plantsBySpecies[species].stages.push(plantComp.stage);
      }
    }

    let context = '';

    if (gatherableFoods.length > 0) {
      context += `- Food sources available to pick: ${gatherableFoods.join(', ')}\n`;
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

    return context;
  }

  /**
   * Build hearing context from heard speech.
   */
  private buildHearingContext(heardSpeech: Array<{ speaker: string; text: string }>): string {
    const speakerCount = heardSpeech.length;

    if (speakerCount === 1) {
      const firstSpeech = heardSpeech[0];
      if (firstSpeech) {
        return `\nWhat you hear:\n- ${firstSpeech.speaker} says: "${firstSpeech.text}"\n`;
      }
    }

    // Multiple people talking
    let context = `\n--- GROUP CONVERSATION (${speakerCount} people talking nearby) ---\n`;
    heardSpeech.forEach((speech) => {
      context += `${speech.speaker}: "${speech.text}"\n`;
    });
    context += `\nYou can join this conversation by choosing the 'talk' action.\n`;
    return context;
  }

  /**
   * Get information about known resource locations from memory.
   */
  getKnownResourceLocations(memory: MemoryComponent | undefined): string | null {
    if (!memory?.memories || memory.memories.length === 0) {
      return null;
    }

    const heatSources: string[] = [];
    const foodSources: string[] = [];
    const waterSources: string[] = [];

    for (const mem of memory.memories.slice(-10)) {
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
   * Check if there's a campfire in the agent's current chunk.
   * Returns true if a campfire (complete or in-progress) exists in the same chunk.
   *
   * Uses O(1) chunk cache lookup when ChunkSpatialQuery is available (fast path),
   * falls back to entity scanning if not (compatibility mode).
   *
   * IMPORTANT: Checks both completed buildings AND agents currently building campfires
   * to prevent simultaneous duplicate construction.
   */
  private hasCampfireInChunk(agent: Entity, world: World): boolean {
    const agentPos = agent.components.get('position') as { x: number; y: number } | undefined;
    if (!agentPos) return false;

    // FAST PATH: O(1) lookup using ChunkSpatialQuery
    if (chunkSpatialQuery) {
      return chunkSpatialQuery.hasBuildingNearPosition(agentPos.x, agentPos.y, 'campfire');
    }

    // FALLBACK: Scan entities (for compatibility/tests)
    // Safety check: getChunkManager might not exist in test mocks
    if (typeof world.getChunkManager !== 'function') return false;

    const chunkManager = world.getChunkManager();
    if (!chunkManager) return false;

    // Convert world coordinates to chunk coordinates
    const CHUNK_SIZE = 32; // From packages/world/src/chunks/Chunk.ts
    const chunkX = Math.floor(agentPos.x / CHUNK_SIZE);
    const chunkY = Math.floor(agentPos.y / CHUNK_SIZE);

    const chunk = chunkManager.getChunk(chunkX, chunkY);
    if (!chunk || !chunk.entities) return false;

    // Check if any entity in the chunk is a campfire OR an agent building a campfire
    for (const entityId of chunk.entities) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      // Check for completed campfire buildings
      const building = entity.components.get('building') as BuildingComponent | undefined;
      if (building?.buildingType === 'campfire') {
        return true;
      }

      // Check for agents currently building campfires (prevents duplicate simultaneous builds)
      const agentComp = entity.components.get('agent') as AgentComponent | undefined;
      if (
        agentComp?.behavior === 'build' &&
        agentComp.behaviorState &&
        typeof agentComp.behaviorState === 'object' &&
        'buildingType' in agentComp.behaviorState &&
        agentComp.behaviorState.buildingType === 'campfire'
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Suggest buildings based on agent's current needs.
   */
  suggestBuildings(
    needs: NeedsComponent | undefined,
    temperature: TemperatureComponent | undefined,
    inventory: InventoryComponent | undefined,
    world: World,
    entity?: Entity
  ): string {
    const suggestions: string[] = [];

    const hasResources = (items: Record<string, number>): boolean => {
      return Object.entries(items).every(([itemId, qty]) => {
        const slots = inventory?.slots || [];
        const totalQty = slots
          .filter((s: InventorySlot) => s.itemId === itemId)
          .reduce((sum: number, s: InventorySlot) => sum + s.quantity, 0);
        return totalQty >= qty;
      });
    };

    // Check if campfire exists in agent's chunk
    const hasCampfireInChunk = entity ? this.hasCampfireInChunk(entity, world) : false;

    // Check if cold
    if (temperature?.state === 'cold' || temperature?.state === 'dangerously_cold') {
      // Only show campfire option if none exist in chunk (behavior queue will handle seeking warmth)
      if (!hasCampfireInChunk) {
        if (hasResources({ stone: 10, wood: 5 })) {
          suggestions.push('campfire (10 stone + 5 wood) - provides warmth in 3-tile radius');
        } else {
          suggestions.push('campfire (10 stone + 5 wood) - provides warmth [NEED: more resources]');
        }
      }

      if (hasResources({ cloth: 10, wood: 5 })) {
        suggestions.push('tent (10 cloth + 5 wood) - shelter with insulation');
      } else if (hasResources({ wood: 10, leaves: 5 })) {
        suggestions.push('lean-to (10 wood + 5 leaves) - basic shelter');
      }
    }

    // Check if inventory full
    const fullSlots = inventory?.slots.filter((s: InventorySlot) => s.itemId).length || 0;
    if (fullSlots >= 8) {
      if (hasResources({ wood: 10 })) {
        suggestions.push('storage-chest (10 wood) - 20 item slots');
      } else {
        suggestions.push('storage-chest (10 wood) - 20 item slots [NEED: 10 wood]');
      }
    }

    // Check if tired
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
   * Get storage information from all storage buildings.
   */
  getStorageInfo(world: World, cookingSkill: SkillLevel): string | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const storageBuildings = world.query()
      .with('building')
      .with('inventory')
      .executeEntities();

    if (storageBuildings.length === 0) {
      return null;
    }

    const totalStorage: Record<string, number> = {};

    for (const storage of storageBuildings) {
      const building = storage.components.get('building') as BuildingComponent | undefined;
      const inventory = storage.components.get('inventory') as InventoryComponent | undefined;

      if (!building?.isComplete) continue;
      // NOTE: Large warehouses now use TileBasedBlueprintRegistry
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') continue;

      if (inventory?.slots) {
        for (const slot of inventory.slots) {
          if (slot.itemId && slot.quantity > 0) {
            totalStorage[slot.itemId] = (totalStorage[slot.itemId] || 0) + slot.quantity;
          }
        }
      }
    }

    const agentCount = world.query().with('agent').executeEntities().length;
    const consumptionRate = agentCount * 2.5;

    const foodInfo = getFoodStorageInfo({
      items: totalStorage,
      villageSize: agentCount,
      consumptionRate,
    }, cookingSkill);

    return `- Village Storage: ${foodInfo}\n`;
  }

  /**
   * Get information about nearby agents from vision.
   * Shows detailed task information including what they're working on.
   */
  getSeenAgentsInfo(world: World, seenAgentIds: string[] | undefined): string | null {
    if (!world || !seenAgentIds || seenAgentIds.length === 0) {
      return null;
    }

    const agentDescriptions: string[] = [];

    for (const agentId of seenAgentIds) {
      const agent = world.getEntity(agentId);
      if (!agent) continue;

      const identity = agent.components.get('identity') as IdentityComponent | undefined;
      const agentComp = agent.components.get('agent') as (Component & {
        behavior?: string;
        behaviorState?: Record<string, unknown>;
        behaviorQueue?: Array<{ behavior: string; behaviorState?: Record<string, unknown>; label?: string }>;
        currentQueueIndex?: number;
        plannedBuilds?: Array<{ buildingType: string; priority: string }>;
        recentSpeech?: string;
      }) | undefined;

      if (!identity) continue;

      const name = identity.name;
      let description = name;

      // Get detailed activity description
      const activity = this.getAgentActivityDescription(agentComp);
      if (activity) {
        description += ` (${activity})`;
      }

      // Add recent speech
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
   * Get detailed activity description for an agent.
   * Shows current task, planned builds, and queue status.
   */
  private getAgentActivityDescription(agentComp: {
    behavior?: string;
    behaviorState?: Record<string, unknown>;
    behaviorQueue?: Array<{ behavior: string; behaviorState?: Record<string, unknown>; label?: string }>;
    currentQueueIndex?: number;
    plannedBuilds?: Array<{ buildingType: string; priority: string }>;
  } | undefined): string {
    if (!agentComp?.behavior) {
      return '';
    }

    const behavior = agentComp.behavior;
    const state = agentComp.behaviorState || {};

    // Check if there's a current queued task with a label
    let taskLabel: string | undefined;
    if (agentComp.behaviorQueue && agentComp.behaviorQueue.length > 0) {
      const currentIndex = agentComp.currentQueueIndex ?? 0;
      const currentTask = agentComp.behaviorQueue[currentIndex];
      if (currentTask?.label) {
        taskLabel = currentTask.label;
      }
    }

    // If we have a task label from the queue, use it
    if (taskLabel) {
      return taskLabel;
    }

    // Otherwise, build description from behavior and state
    let action = '';

    if (behavior === 'wander') {
      action = 'wandering around';
    } else if (behavior === 'idle') {
      action = 'resting';
    } else if (behavior === 'gather' || behavior === 'pick') {
      const resourceType = state.resourceType as string | undefined;
      const targetAmount = state.targetAmount as number | undefined;
      const forBuild = state.forBuild as string | undefined;
      if (targetAmount && resourceType) {
        action = `Gathering ${targetAmount} ${resourceType}`;
      } else if (resourceType) {
        action = `Gathering ${resourceType}`;
      } else {
        action = 'gathering resources';
      }
      if (forBuild) {
        action += ` (for ${forBuild})`;
      }
    } else if (behavior === 'seek_food') {
      action = 'looking for food';
    } else if (behavior === 'talk') {
      action = 'talking';
    } else if (behavior === 'follow_agent') {
      action = 'following someone';
    } else if (behavior === 'build') {
      const buildingType = state.buildingType as string | undefined;
      if (buildingType) {
        action = `Building ${buildingType}`;
      } else {
        action = 'building something';
      }
    } else if (behavior === 'plant') {
      const seedType = state.seedType as string | undefined;
      if (seedType) {
        action = `Planting ${seedType}`;
      } else {
        action = 'planting seeds';
      }
    } else if (behavior === 'till') {
      action = 'tilling soil';
    } else if (behavior === 'water') {
      action = 'watering plants';
    } else if (behavior === 'deposit_items') {
      action = 'storing items';
    } else if (behavior === 'craft') {
      const recipeId = state.recipeId as string | undefined;
      if (recipeId) {
        action = `Crafting ${recipeId}`;
      } else {
        action = 'crafting items';
      }
    } else if (behavior === 'seek_sleep' || behavior === 'forced_sleep') {
      action = 'sleeping';
    } else if (behavior === 'navigate') {
      const reason = state.reason as string | undefined;
      if (reason) {
        action = reason;
      } else {
        action = 'traveling';
      }
    } else {
      action = behavior.replace(/_/g, ' ');
    }

    // Add planned builds if any
    if (agentComp.plannedBuilds && agentComp.plannedBuilds.length > 0) {
      const builds = agentComp.plannedBuilds
        .map(b => b.buildingType)
        .join(', ');
      action += ` | Plans to build: ${builds}`;
    }

    return action;
  }

  /**
   * Get information about buildings the agent can see.
   */
  getSeenBuildingsInfo(world: World, seenBuildingIds: string[], buildingSkill: SkillLevel): string | null {
    if (!world) {
      return null;
    }

    const allBuildings = world.query()
      .with('building')
      .executeEntities();

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

    const villageInfo = getVillageInfo({ buildings: buildingData }, buildingSkill);

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
}
