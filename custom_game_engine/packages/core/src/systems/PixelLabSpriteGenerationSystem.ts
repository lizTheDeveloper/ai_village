/**
 * PixelLabSpriteGenerationSystem
 *
 * Automatically generates PixelLab sprites for newly created souls.
 * Listens for soul:ceremony_complete events and enqueues sprite generation jobs.
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';

interface PendingSpriteJob {
  agentId: string;
  characterId: string; // Base ID for the character
  directionJobs: Map<string, string>; // direction -> job_id (only for generated directions)
  completedDirections: Set<string>; // All 8 directions when complete
  generatedDirections: Set<string>; // Only the 5 generated ones
  startTime: number;
  name: string;
  description: string; // Character description for prompts
  size: number; // Sprite size
}

// Directions that need to be generated via API (reserved for future use)
// const GENERATE_DIRECTIONS = ['south', 'east', 'north', 'north-east', 'south-east'] as const;

// Directions created by mirroring (reserved for future use)
// const MIRROR_MAP: Record<string, string> = {
//   'west': 'east',           // West = flip East
//   'north-west': 'north-east', // North-West = flip North-East
//   'south-west': 'south-east', // South-West = flip South-East
// };

export class PixelLabSpriteGenerationSystem implements System {
  readonly id: SystemId = 'pixellab_sprite_generation';
  readonly priority = 900; // Run late, after other systems
  readonly requiredComponents = [] as const; // Event-driven

  private pendingJobs: Map<string, PendingSpriteJob> = new Map();
  private readonly POLL_INTERVAL = 60; // Check job status every 60 ticks (3 seconds at 20 TPS)
  private lastPollTick = 0;

  onInit(world: World): void {
    // Subscribe to soul creation events
    world.eventBus.subscribe('soul:ceremony_complete', (event: any) => {
      this.enqueueSpriteGeneration(world, event.data);
    });
  }

  private async enqueueSpriteGeneration(_world: World, soulData: any): Promise<void> {
    const { agentId, name, archetype, purpose, species, interests } = soulData;

    console.log(`[PixelLabSprite] Starting 8-direction sprite generation for ${name} (${species}, ${archetype})`);

    try {
      // Build character description based on soul attributes
      const description = this.buildCharacterDescription(species, archetype, purpose, interests);

      // Determine character size based on species
      const { size } = this.getSpeciesConfig(species);

      const characterId = `${species}_${agentId.slice(0, 8)}`;
      const directionJobs = new Map<string, string>();

      // Step 1: Generate SOUTH (base direction, no reference image)
      const southPrompt = `${description}, facing south, ${size}x${size} pixel art, top-down view`;

      const response = await this.callPixelLabAPI({
        prompt: southPrompt,
        width: size,
        height: size,
        steps: 20,
        guidance_scale: 7.5,
      });

      if (response.job_id) {
        directionJobs.set('south', response.job_id);
        console.log(`[PixelLabSprite] ✓ Queued south for ${name}: ${response.job_id}`);
      }

      // Track the job with all info needed for sequential generation
      this.pendingJobs.set(agentId, {
        agentId,
        characterId,
        directionJobs,
        completedDirections: new Set(),
        generatedDirections: new Set(),
        startTime: Date.now(),
        name,
        description,
        size,
      });

      console.log(`[PixelLabSprite] Started sprite generation for ${name} (1/8 directions queued)`);
    } catch (error) {
      console.error(`[PixelLabSprite] Failed to start sprite generation for ${name}:`, error);
    }
  }

  private buildCharacterDescription(
    species: string,
    archetype: string,
    purpose: string,
    _interests: string[]
  ): string {
    // Build a detailed character description based on soul attributes
    const speciesMap: Record<string, string> = {
      human: 'human',
      elf: 'elf with pointed ears and graceful features',
      dwarf: 'dwarf with stocky build and beard',
      orc: 'orc with green skin and tusks',
      thrakeen: 'reptilian humanoid with scales',
      celestial: 'angelic being with ethereal glow',
      aquatic: 'aquatic humanoid with fish-like features',
      // Animals (quadrupeds)
      cow: 'Realistic cow as a quadruped animal on all four legs, natural animal pose',
      pig: 'Realistic pig as a quadruped animal on all four legs, natural animal pose',
      sheep: 'Realistic sheep as a quadruped animal on all four legs, natural animal pose',
      chicken: 'Realistic chicken as a bird, natural bird pose',
      horse: 'Realistic horse as a quadruped animal on all four legs, natural animal pose',
      donkey: 'Realistic donkey as a quadruped animal on all four legs, natural animal pose',
      cat: 'Realistic cat as a quadruped animal on all four legs, natural animal pose',
      dog: 'Realistic dog as a quadruped animal on all four legs, natural animal pose',
      rabbit: 'Realistic rabbit as a quadruped animal on all four legs, natural animal pose',
      deer: 'Realistic deer as a quadruped animal on all four legs, natural animal pose',
      wolf: 'Realistic wolf as a quadruped animal on all four legs, natural animal pose',
      bear: 'Realistic bear as a quadruped animal on all four legs, natural animal pose',
      fox: 'Realistic fox as a quadruped animal on all four legs, natural animal pose',
    };

    const baseSpecies = speciesMap[species.toLowerCase()] || species;

    // Add archetype-based details
    const archetypeDetails: Record<string, string> = {
      warrior: 'wearing armor and carrying weapons',
      mage: 'wearing robes and mystical attire',
      scholar: 'wearing academic robes with books',
      artisan: 'wearing work clothes and carrying tools',
      merchant: 'wearing fine clothes with trade goods',
      farmer: 'wearing simple work clothes',
      healer: 'wearing healer robes with medicine bag',
      explorer: 'wearing travel gear and carrying supplies',
      noble: 'wearing elegant noble attire',
      priest: 'wearing religious robes with symbols',
    };

    const archetypeDetail = archetypeDetails[archetype.toLowerCase()] || '';

    // Combine into final description
    if (baseSpecies.includes('quadruped') || baseSpecies.includes('bird')) {
      // Animals - keep description simple and focused on the animal
      return `${baseSpecies}, top-down view`;
    } else {
      // Humanoids - add archetype and purpose details
      return `${baseSpecies} ${archetypeDetail}, ${purpose}, pixel art character, top-down view`;
    }
  }

  private getSpeciesConfig(species: string): { size: number; proportions: any; view: string } {
    const speciesLower = species.toLowerCase();

    // Animal species get different configs
    const animalSpecies = ['cow', 'pig', 'sheep', 'chicken', 'horse', 'donkey', 'cat', 'dog', 'rabbit', 'deer', 'wolf', 'bear', 'fox'];

    if (animalSpecies.includes(speciesLower)) {
      return {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'high top-down', // Better for quadrupeds
      };
    }

    // Humanoid species
    const speciesConfigs: Record<string, { size: number; proportions: any; view: string }> = {
      human: {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'low top-down',
      },
      elf: {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'low top-down',
      },
      dwarf: {
        size: 48,
        proportions: { type: 'preset', name: 'chibi' },
        view: 'low top-down',
      },
      orc: {
        size: 48,
        proportions: { type: 'preset', name: 'heroic' },
        view: 'low top-down',
      },
      thrakeen: {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'low top-down',
      },
      celestial: {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'low top-down',
      },
      aquatic: {
        size: 48,
        proportions: { type: 'preset', name: 'default' },
        view: 'low top-down',
      },
    };

    return speciesConfigs[speciesLower] || {
      size: 48,
      proportions: { type: 'preset', name: 'default' },
      view: 'low top-down',
    };
  }

  private async callPixelLabAPI(params: any): Promise<any> {
    const apiKey = process.env.PIXELLAB_API_KEY;

    if (!apiKey) {
      throw new Error('PIXELLAB_API_KEY not found in environment');
    }

    const response = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PixelLab API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  update(world: World): void {
    // Poll job statuses periodically
    if (world.tick - this.lastPollTick < this.POLL_INTERVAL) {
      return;
    }

    this.lastPollTick = world.tick;

    if (this.pendingJobs.size === 0) {
      return;
    }

    // Check status of all pending jobs
    for (const [, job] of this.pendingJobs.entries()) {
      this.checkJobStatus(world, job).catch(error => {
        console.error(`[PixelLabSprite] Error checking job ${job.characterId}:`, error);
      });
    }
  }

  private async checkJobStatus(world: World, job: PendingSpriteJob): Promise<void> {
    try {
      // Check each direction's job status
      for (const [direction, jobId] of job.directionJobs.entries()) {
        if (job.completedDirections.has(direction)) {
          continue; // Already completed
        }

        const response = await this.getJobStatus(jobId);

        if (response.status === 'completed') {
          job.completedDirections.add(direction);
          console.log(`[PixelLabSprite] ✅ ${direction} completed for ${job.name} (${job.completedDirections.size}/${job.directionJobs.size})`);

          // Download and save the image for this direction
          if (response.image_url) {
            await this.downloadDirectionImage(response.image_url, job.characterId, direction);
          }

        } else if (response.status === 'failed') {
          console.error(`[PixelLabSprite] ❌ ${direction} failed for ${job.name}`);
          job.directionJobs.delete(direction);
        }
      }

      // Check if all queued directions are complete
      if (job.completedDirections.size === job.directionJobs.size) {
        console.log(`[PixelLabSprite] ✅ All directions completed for ${job.name} (${job.completedDirections.size}/${job.directionJobs.size})`);

        // Update the agent's appearance component with the new sprite folder
        const agent = world.getEntity(job.agentId);
        if (agent) {
          const appearance = agent.components.get('appearance') as any;
          if (appearance) {
            appearance.spriteFolder = job.characterId;
            console.log(`[PixelLabSprite] Updated ${job.name}'s sprite to ${job.characterId}`);
          }
        }

        // Remove from pending jobs
        this.pendingJobs.delete(job.agentId);

        // Emit event for UI updates
        (world.eventBus as any).emit({
          type: 'pixellab:sprite_complete',
          source: job.agentId,
          data: {
            agentId: job.agentId,
            characterId: job.characterId,
            name: job.name,
          },
        });
      }

    } catch (error) {
      console.error(`[PixelLabSprite] Error checking status for ${job.name}:`, error);
    }
  }

  private async getJobStatus(jobId: string): Promise<any> {
    const apiKey = process.env.PIXELLAB_API_KEY;

    if (!apiKey) {
      throw new Error('PIXELLAB_API_KEY not found in environment');
    }

    const response = await fetch(`https://api.pixellab.ai/v1/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PixelLab API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private async downloadDirectionImage(
    imageUrl: string,
    characterId: string,
    direction: string
  ): Promise<void> {
    try {
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();

      // Determine save path (relative to project root)
      // Save to packages/renderer/assets/sprites/pixellab/{characterId}/rotations/{direction}.png
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      // Get the project root by going up from the core package
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const projectRoot = path.resolve(__dirname, '../../../../..');

      const spritesDir = path.join(
        projectRoot,
        'packages/renderer/assets/sprites/pixellab',
        characterId,
        'rotations'
      );

      // Create directory if it doesn't exist
      fs.mkdirSync(spritesDir, { recursive: true });

      // Save the image
      const filePath = path.join(spritesDir, `${direction}.png`);
      fs.writeFileSync(filePath, Buffer.from(imageBuffer));

      console.log(`[PixelLabSprite] 💾 Saved ${direction}.png for ${characterId}`);
    } catch (error) {
      console.error(`[PixelLabSprite] Failed to download ${direction} image:`, error);
      throw error;
    }
  }
}
