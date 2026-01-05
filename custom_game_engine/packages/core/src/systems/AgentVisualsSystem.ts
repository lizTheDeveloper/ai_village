import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { Entity } from '../ecs/Entity.js';
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
export class AgentVisualsSystem implements System {
  id = 'agent_visuals' as const;
  name = 'agent_visuals';
  priority = 300;
  requiredComponents = ['agent', 'renderable'] as const;

  update(world: World, entities: readonly Entity[], _deltaTime: number): void {
    for (const entity of entities) {
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
