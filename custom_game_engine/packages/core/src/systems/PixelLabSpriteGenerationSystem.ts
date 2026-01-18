/**
 * PixelLabSpriteGenerationSystem
 *
 * Automatically generates PixelLab sprites for newly created souls.
 * Listens for soul:created events and enqueues sprite generation jobs.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { AppearanceComponent } from '../components/AppearanceComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { GameEvent } from '../events/EventBus.js';
import { ANIMAL_SPECIES } from '../data/animalSpecies.js';

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

// Directions created by mirroring
const MIRROR_MAP: Record<string, string> = {
  'west': 'east',           // West = flip East
  'north-west': 'north-east', // North-West = flip North-East
  'south-west': 'south-east', // South-West = flip South-East
};

export class PixelLabSpriteGenerationSystem extends BaseSystem {
  readonly id: SystemId = 'pixellab_sprite_generation';
  readonly priority = 900; // Run late, after other systems
  readonly requiredComponents = [] as const; // Event-driven

  protected readonly throttleInterval = 60; // Check job status every 60 ticks (3 seconds at 20 TPS)

  private pendingJobs: Map<string, PendingSpriteJob> = new Map();

  protected onInitialize(world: World): void {
    // Subscribe to agent birth events
    world.eventBus.subscribe<'agent:birth'>('agent:birth', (event: GameEvent<'agent:birth'>) => {
      this.enqueueSpriteGeneration(world, event.data);
    });
  }

  private async enqueueSpriteGeneration(
    world: World,
    birthData: { agentId: string; name: string; useLLM: boolean; generation: number; parents: [string, string] | null; initialStats: { health: number; hunger: number; energy: number } }
  ): Promise<void> {
    const { agentId, name } = birthData;

    // Get the agent entity to extract species and soul attributes
    const agent = world.getEntity(agentId);
    if (!agent) {
      console.error(`[PixelLabSprite] Agent ${agentId} not found`);
      return;
    }

    // Extract species from appearance component
    const appearance = agent.getComponent<AppearanceComponent>('appearance');
    const species = appearance?.species || 'human';

    // Extract soul attributes (archetype, purpose, interests)
    const soulIdentity = agent.getComponent<SoulIdentityComponent>('soul_identity');
    const archetype = soulIdentity?.archetype || 'wanderer';
    const purpose = soulIdentity?.purpose || 'To find their place in the world';
    const interests = soulIdentity?.coreInterests || [];


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

    // Animal species get different configs - query from registry instead of hardcoding
    const animalSpeciesIds = Object.keys(ANIMAL_SPECIES);

    if (animalSpeciesIds.includes(speciesLower)) {
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

  private async callPixelLabAPIWithReference(params: any & { reference_image_path: string }): Promise<any> {
    const apiKey = process.env.PIXELLAB_API_KEY;

    if (!apiKey) {
      throw new Error('PIXELLAB_API_KEY not found in environment');
    }

    // Read the reference image and convert to base64
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(params.reference_image_path);
    const base64Image = imageBuffer.toString('base64');

    // Remove the path from params and add the base64 image
    const { reference_image_path, ...apiParams } = params;
    const requestBody = {
      ...apiParams,
      init_image: base64Image, // Correct parameter name for Pixflux API
      init_image_strength: 75, // Lower value = more freedom to turn while maintaining style (1-999, default 300)
    };

    const response = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PixelLab API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private getDirectionImagePath(characterId: string, direction: string): string {
    const path = require('path');
    const { fileURLToPath } = require('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '../../../../..');

    return path.join(
      projectRoot,
      'packages/renderer/assets/sprites/pixellab',
      characterId,
      'rotations',
      `${direction}.png`
    );
  }

  private async mirrorDirectionImage(
    characterId: string,
    sourceDirection: string,
    targetDirection: string
  ): Promise<void> {
    try {
      const fs = await import('fs');

      // Use a simple image library or canvas to flip the image
      // For now, we'll use sharp if available, otherwise fall back to a simpler method
      const sourcePath = this.getDirectionImagePath(characterId, sourceDirection);
      const targetPath = this.getDirectionImagePath(characterId, targetDirection);

      // Read the source image
      const sourceBuffer = fs.readFileSync(sourcePath);

      // Try to use sharp for image flipping (it should be installed)
      try {
        const sharp = (await import('sharp')).default;
        await sharp(sourceBuffer)
          .flop() // Flip horizontally
          .toFile(targetPath);
      } catch (sharpError) {
        // If sharp is not available, just copy the file for now
        // TODO: Implement proper mirroring without sharp
        console.warn(`[PixelLabSprite] Sharp not available, copying image instead of mirroring`);
        fs.writeFileSync(targetPath, sourceBuffer);
      }

    } catch (error) {
      console.error(`[PixelLabSprite] Failed to mirror ${sourceDirection} to ${targetDirection}:`, error);
      throw error;
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    if (this.pendingJobs.size === 0) {
      return;
    }

    // Check status of all pending jobs
    for (const [, job] of this.pendingJobs.entries()) {
      this.checkJobStatus(ctx.world, job).catch(error => {
        console.error(`[PixelLabSprite] Error checking job ${job.characterId}:`, error);
      });
    }
  }

  private async checkJobStatus(world: World, job: PendingSpriteJob): Promise<void> {
    try {
      // Step 1: Check pending generation jobs
      for (const [direction, jobId] of job.directionJobs.entries()) {
        if (job.generatedDirections.has(direction)) {
          continue; // Already downloaded
        }

        const response = await this.getJobStatus(jobId);

        if (response.status === 'completed') {
          // Download and save the generated image
          if (response.image_url) {
            await this.downloadDirectionImage(response.image_url, job.characterId, direction);
            job.generatedDirections.add(direction);
            job.completedDirections.add(direction);

            // Step 2: Queue next directions based on what just completed
            await this.queueNextDirections(job, direction);
          }
        } else if (response.status === 'failed') {
          console.error(`[PixelLabSprite] ❌ ${direction} failed for ${job.name}`);
          job.directionJobs.delete(direction);
        }
      }

      // Step 3: Once all 5 generated directions are complete, create mirrored versions
      if (job.generatedDirections.size === 5 && job.completedDirections.size < 8) {
        await this.createMirroredDirections(job);
      }

      // Step 4: When all 8 directions are complete, update agent
      if (job.completedDirections.size === 8) {

        // Update the agent's appearance component with the new sprite folder
        const agent = world.getEntity(job.agentId);
        if (agent) {
          const appearance = agent.getComponent<AppearanceComponent>('appearance');
          if (appearance) {
            appearance.spriteFolderId = job.characterId;
          }
        }

        // Remove from pending jobs
        this.pendingJobs.delete(job.agentId);

        // Emit event for UI updates
        world.eventBus.emit<'pixellab:sprite_complete'>({
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

  private async queueNextDirections(job: PendingSpriteJob, completedDirection: string): Promise<void> {
    const { description, size, characterId } = job;

    try {
      if (completedDirection === 'south') {
        // South complete → queue East (using south as reference)
        const southPath = this.getDirectionImagePath(characterId, 'south');
        const eastPrompt = `${description}, facing east, ${size}x${size} pixel art, top-down view`;

        const response = await this.callPixelLabAPIWithReference({
          prompt: eastPrompt,
          width: size,
          height: size,
          steps: 20,
          guidance_scale: 7.5,
          reference_image_path: southPath,
        });

        if (response.job_id) {
          job.directionJobs.set('east', response.job_id);
        }

      } else if (completedDirection === 'east') {
        // East complete → queue North, North-East, South-East (all using east as reference)
        const eastPath = this.getDirectionImagePath(characterId, 'east');

        const directionsToQueue = [
          { dir: 'north', prompt: `${description}, facing north, ${size}x${size} pixel art, top-down view` },
          { dir: 'north-east', prompt: `${description}, facing north-east, ${size}x${size} pixel art, top-down view` },
          { dir: 'south-east', prompt: `${description}, facing south-east, ${size}x${size} pixel art, top-down view` },
        ];

        for (const { dir, prompt } of directionsToQueue) {
          const response = await this.callPixelLabAPIWithReference({
            prompt,
            width: size,
            height: size,
            steps: 20,
            guidance_scale: 7.5,
            reference_image_path: eastPath,
          });

          if (response.job_id) {
            job.directionJobs.set(dir, response.job_id);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error(`[PixelLabSprite] Failed to queue next directions after ${completedDirection}:`, error);
    }
  }

  private async createMirroredDirections(job: PendingSpriteJob): Promise<void> {
    const { characterId } = job;


    for (const [mirrorDir, sourceDir] of Object.entries(MIRROR_MAP)) {
      if (!job.completedDirections.has(mirrorDir)) {
        await this.mirrorDirectionImage(characterId, sourceDir, mirrorDir);
        job.completedDirections.add(mirrorDir);
      }
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

    } catch (error) {
      console.error(`[PixelLabSprite] Failed to download ${direction} image:`, error);
      throw error;
    }
  }
}
