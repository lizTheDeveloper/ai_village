import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';
import type { Component } from '../ecs/Component.js';

/**
 * Health component interface - used for alpha calculation
 */
interface HealthComponent extends Component {
  current: number;
  max: number;
}

/**
 * AgentVisualsSystem - Computes visual metadata for agents
 *
 * Updates renderable.sizeMultiplier and renderable.alpha based on:
 * - Age (smaller for children, calculated from birthTick)
 * - Health state (fade when injured/dying)
 *
 * Priority: 300 (runs before rendering, alongside PlantVisualsSystem)
 */
export class AgentVisualsSystem extends BaseSystem {
  readonly id = 'agent_visuals' as const;
  readonly priority = 300;
  readonly requiredComponents = ['agent', 'renderable'] as const;
  // Lazy activation: Skip entire system when no agent exists
  public readonly activationComponents = ['agent'] as const;
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const agent = entity.getComponent<AgentComponent>('agent');
      const renderable = entity.getComponent<RenderableComponent>('renderable');

      if (!agent || !renderable) continue;

      // Age-based sizing: Calculate age from birthTick
      // Child (0-12 years): 0.6x size
      // Teen (13-19 years): 0.8x size
      // Adult (20+ years): 1.0x size
      let sizeMultiplier = 1.0;
      if (agent.birthTick !== undefined) {
        const ageInTicks = ctx.tick - agent.birthTick;
        // Assuming 20 TPS and 1 game tick = 1 real second
        // 1 game year = 1 real hour = 3600 seconds = 72000 ticks
        const TICKS_PER_YEAR = 72000;
        const ageInYears = ageInTicks / TICKS_PER_YEAR;

        if (ageInYears < 13) {
          // Child: 0.6x size
          sizeMultiplier = 0.6;
        } else if (ageInYears < 20) {
          // Teen: 0.8x size
          sizeMultiplier = 0.8;
        }
        // Adult: 1.0x (default)
      }

      // Health-based alpha: Reduce alpha when injured
      // Full health (100%): alpha = 1.0
      // Half health (50%): alpha = 0.85
      // Critical (25%): alpha = 0.7
      // Near death (10%): alpha = 0.5
      let alpha = 1.0;
      const health = entity.getComponent<HealthComponent>('health');
      if (health && health.current !== undefined && health.max !== undefined && health.max > 0) {
        const healthPercent = health.current / health.max;
        // Linear interpolation: 1.0 at 100% health, 0.5 at 0% health
        alpha = 0.5 + (healthPercent * 0.5);
      }

      renderable.sizeMultiplier = sizeMultiplier;
      renderable.alpha = alpha;
    }
  }
}
