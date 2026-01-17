import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';

/**
 * AgentVisualsSystem - Computes visual metadata for agents
 *
 * Updates renderable.sizeMultiplier and renderable.alpha based on:
 * - Default size (currently 1.0 for all agents)
 * - Health state (future: fade when injured/dying)
 * - Age (future: smaller for children, calculated from birthTick)
 *
 * Priority: 300 (runs before rendering, alongside PlantVisualsSystem)
 */
export class AgentVisualsSystem extends BaseSystem {
  readonly id = 'agent_visuals' as const;
  readonly priority = 300;
  readonly requiredComponents = ['agent', 'renderable'] as const;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const agent = entity.getComponent<AgentComponent>('agent');
      const renderable = entity.getComponent<RenderableComponent>('renderable');

      if (!agent || !renderable) continue;

      // Default size for all agents
      // TODO: Calculate from agent.birthTick for age-based sizing
      // TODO: Reduce alpha based on health/injury status
      renderable.sizeMultiplier = 1.0;
      renderable.alpha = 1.0;
    }
  }
}
