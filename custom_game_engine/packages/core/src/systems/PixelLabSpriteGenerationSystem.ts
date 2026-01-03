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
  jobId: string;
  characterId: string;
  startTime: number;
  name: string;
}

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

    console.log(`[PixelLabSprite] Generating sprite for ${name} (${species}, ${archetype})`);

    try {
      // Build character description based on soul attributes
      const description = this.buildCharacterDescription(species, archetype, purpose, interests);

      // Determine character size and proportions based on species
      const { size, proportions, view } = this.getSpeciesConfig(species);

      // Call PixelLab API via environment (this will be replaced with actual MCP call)
      const response = await this.callPixelLabAPI({
        name: `${species}_${agentId.slice(0, 8)}`,
        description,
        n_directions: 8,
        size,
        view,
        outline: 'single color black outline',
        shading: 'basic shading',
        detail: 'medium detail',
        proportions,
        ai_freedom: 750,
      });

      if (response.character_id) {
        // Track the job
        this.pendingJobs.set(agentId, {
          agentId,
          jobId: response.job_id,
          characterId: response.character_id,
          startTime: Date.now(),
          name,
        });

        console.log(`[PixelLabSprite] Job queued for ${name}: ${response.character_id}`);
      }
    } catch (error) {
      console.error(`[PixelLabSprite] Failed to enqueue sprite for ${name}:`, error);
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

    const response = await fetch('https://api.pixellab.ai/v1/characters', {
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
      const response = await this.getCharacterStatus(job.characterId);

      if (response.status === 'completed') {
        console.log(`[PixelLabSprite] ✅ Sprite completed for ${job.name}: ${job.characterId}`);

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

      } else if (response.status === 'failed') {
        console.error(`[PixelLabSprite] ❌ Sprite generation failed for ${job.name}`);
        this.pendingJobs.delete(job.agentId);

      } else {
        // Still processing - log progress if ETA available
        if (response.eta_seconds) {
          const elapsed = Math.floor((Date.now() - job.startTime) / 1000);
          console.log(`[PixelLabSprite] ⏳ ${job.name}: ${response.status} (${elapsed}s elapsed, ${response.eta_seconds}s remaining)`);
        }
      }

    } catch (error) {
      console.error(`[PixelLabSprite] Error checking status for ${job.name}:`, error);
    }
  }

  private async getCharacterStatus(characterId: string): Promise<any> {
    const apiKey = process.env.PIXELLAB_API_KEY;

    if (!apiKey) {
      throw new Error('PIXELLAB_API_KEY not found in environment');
    }

    const response = await fetch(`https://api.pixellab.ai/v1/characters/${characterId}`, {
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
}
