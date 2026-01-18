/**
 * CheckpointNamingService - LLM-generated poetic names for checkpoints
 *
 * Listens for checkpoint:name_request events and generates evocative names
 * based on the current world state. Names should capture the essence of
 * that moment in time.
 *
 * Examples:
 * - "The Dawn of Copper" (first metalworking)
 * - "When Trees Spoke" (first conversation with dryad)
 * - "The First Harvest" (agriculture milestone)
 * - "The Silent Winter" (harsh conditions)
 * - "The Council Forms" (governance established)
 */

import type { World } from '../ecs/World.js';
import type { Checkpoint } from './AutoSaveSystem.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';

// LLM Provider interface (to avoid cross-package import)
interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface LLMResponse {
  text: string;
  stopReason?: string;
  tokensUsed?: number;
}

interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
}

export class CheckpointNamingService {
  private llmProvider: LLMProvider | null = null;
  private namingQueue: Checkpoint[] = [];
  private isProcessing: boolean = false;

  constructor(llmProvider?: LLMProvider) {
    if (llmProvider) {
      this.llmProvider = llmProvider;
    }
  }

  /**
   * Set the LLM provider to use for name generation.
   */
  setProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Request a poetic name for a checkpoint.
   */
  async generateName(checkpoint: Checkpoint, world: World): Promise<string> {
    if (!this.llmProvider) {
      console.warn('[CheckpointNaming] No LLM provider configured, using default name');
      return `Day ${checkpoint.day}`;
    }

    try {
      // Gather world state context
      const context = this.gatherWorldContext(world);

      // Build prompt for LLM
      const prompt = this.buildNamingPrompt(checkpoint, context);

      // Generate name
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.9,  // High temperature for creativity
        maxTokens: 20,     // Short names only
        stopSequences: ['\n', '.', ','],
      });

      // Clean up the generated name
      const name = this.cleanupName(response.text);

      return name;
    } catch (error) {
      console.error('[CheckpointNaming] Failed to generate name:', error);
      return `Day ${checkpoint.day}`;
    }
  }

  /**
   * Gather relevant world state for context.
   */
  private gatherWorldContext(world: World): WorldContext {
    const context: WorldContext = {
      population: 0,
      buildings: [],
      resources: [],
      recentEvents: [],
      technologies: [],
      relationships: [],
    };

    // Count population
    const agents = world.query().with(CT.Agent).executeEntities();
    context.population = agents.length;

    // Get buildings
    const buildings = world.query().with(CT.Building).executeEntities();
    context.buildings = buildings.slice(0, 5).map(b => {
      const comp = b.getComponent<BuildingComponent>(CT.Building);
      return comp?.buildingType || 'structure';
    });

    // Get recent events from event bus (if accessible)
    // For now, we'll keep this simple and expand later

    return context;
  }

  /**
   * Build the LLM prompt for checkpoint naming.
   */
  private buildNamingPrompt(checkpoint: Checkpoint, context: WorldContext): string {
    return `You are naming a moment in time in a village simulation game. Generate a short, poetic name (3-5 words) that captures the essence of this moment.

World State:
- Day: ${checkpoint.day}
- Population: ${context.population} villagers
- Buildings: ${context.buildings.join(', ') || 'none yet'}
- Universe: ${checkpoint.universeId}

Guidelines:
- Use evocative, memorable language
- Reference significant events or states
- Examples: "The Dawn of Copper", "When Trees Spoke", "The First Harvest", "The Silent Winter", "The Council Forms"
- Be concise (3-5 words maximum)
- No punctuation at the end

Checkpoint Name:`;
  }

  /**
   * Clean up the generated name.
   */
  private cleanupName(rawText: string): string {
    let name = rawText.trim();

    // Remove quotes if present
    name = name.replace(/^["']|["']$/g, '');

    // Remove trailing punctuation
    name = name.replace(/[.,!?;:]$/g, '');

    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, c => c.toUpperCase());

    // Limit length
    if (name.length > 50) {
      name = name.substring(0, 47) + '...';
    }

    return name || 'Unnamed Moment';
  }

  /**
   * Queue a checkpoint for naming (async processing).
   */
  queueNaming(checkpoint: Checkpoint, world: World): void {
    this.namingQueue.push(checkpoint);

    if (!this.isProcessing) {
      this.processQueue(world);
    }
  }

  /**
   * Process queued naming requests.
   */
  private async processQueue(world: World): Promise<void> {
    if (this.isProcessing || this.namingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.namingQueue.length > 0) {
      const checkpoint = this.namingQueue.shift();
      if (!checkpoint) continue;

      try {
        const name = await this.generateName(checkpoint, world);

        // Emit event with generated name
        world.eventBus.emit({
          type: 'checkpoint:named' as const,
          source: 'naming_service',
          data: {
            checkpointKey: checkpoint.key,
            oldName: checkpoint.name,
            newName: name,
          },
        });

        // Update checkpoint name (would need access to AutoSaveSystem)
        checkpoint.name = name;
      } catch (error) {
        console.error('[CheckpointNaming] Error processing queue:', error);
      }
    }

    this.isProcessing = false;
  }
}

interface WorldContext {
  population: number;
  buildings: string[];
  resources: string[];
  recentEvents: string[];
  technologies: string[];
  relationships: string[];
}

// Singleton instance
export const checkpointNamingService = new CheckpointNamingService();
