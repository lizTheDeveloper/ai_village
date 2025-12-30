import { Entity } from '../../ecs/Entity.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';

/**
 * Test agent trait presets
 */

export interface AgentTraits {
  needs?: {
    hunger?: number;
    energy?: number;
    health?: number;
    thirst?: number;
    warmth?: number;
  };
  circadian?: {
    sleepDrive?: number;
    isSleeping?: boolean;
    sleepQuality?: number;
  };
  agent?: {
    behavior?: string;
    useLLM?: boolean;
    thinkInterval?: number;
  };
}

/**
 * Apply agent traits to an entity
 */
export function applyAgentTraits(entity: Entity, traits: AgentTraits): void {
  // Add needs component
  const needsConfig = traits.needs || {};
  const needs = new NeedsComponent({
    hunger: (needsConfig.hunger ?? 100) / 100,
    energy: (needsConfig.energy ?? 100) / 100,
    health: (needsConfig.health ?? 100) / 100,
    thirst: (needsConfig.thirst ?? 100) / 100,
    temperature: (needsConfig.warmth ?? 100) / 100,
  });
  entity.addComponent(needs);

  // Add circadian component
  const circadianConfig = traits.circadian || {};
  const circadian = createCircadianComponent();
  if (circadianConfig.sleepDrive !== undefined) {
    (circadian as any).sleepDrive = circadianConfig.sleepDrive;
  }
  if (circadianConfig.isSleeping !== undefined) {
    (circadian as any).isSleeping = circadianConfig.isSleeping;
  }
  if (circadianConfig.sleepQuality !== undefined) {
    (circadian as any).sleepQuality = circadianConfig.sleepQuality;
  }
  entity.addComponent(circadian);

  // Add agent component
  const agentConfig = traits.agent || {};
  const agent = createAgentComponent(
    agentConfig.behavior || 'wander',
    agentConfig.useLLM || false,
    agentConfig.thinkInterval || 20
  );
  entity.addComponent(agent);
}

/**
 * Preset: Well-rested agent with full needs
 */
export const WELL_RESTED_AGENT: AgentTraits = {
  needs: {
    hunger: 100,
    energy: 100,
    health: 100,
    thirst: 100,
    warmth: 100,
  },
  circadian: {
    sleepDrive: 0,
    isSleeping: false,
  },
  agent: {
    behavior: 'wander',
    useLLM: false,
  },
};

/**
 * Preset: Tired agent needing sleep
 */
export const TIRED_AGENT: AgentTraits = {
  needs: {
    hunger: 80,
    energy: 30,
    health: 100,
    thirst: 70,
    warmth: 100,
  },
  circadian: {
    sleepDrive: 95,
    isSleeping: false,
  },
  agent: {
    behavior: 'wander',
    useLLM: false,
  },
};

/**
 * Preset: Hungry agent needing food
 */
export const HUNGRY_AGENT: AgentTraits = {
  needs: {
    hunger: 20,
    energy: 80,
    health: 100,
    thirst: 90,
    warmth: 100,
  },
  circadian: {
    sleepDrive: 30,
    isSleeping: false,
  },
  agent: {
    behavior: 'wander',
    useLLM: false,
  },
};

/**
 * Preset: Sleeping agent recovering
 */
export const SLEEPING_AGENT: AgentTraits = {
  needs: {
    hunger: 90,
    energy: 40,
    health: 100,
    thirst: 85,
    warmth: 100,
  },
  circadian: {
    sleepDrive: 80,
    isSleeping: true,
    sleepQuality: 0.5,
  },
  agent: {
    behavior: 'sleep',
    useLLM: false,
  },
};

/**
 * Preset: Critical condition agent (low on everything)
 */
export const CRITICAL_AGENT: AgentTraits = {
  needs: {
    hunger: 10,
    energy: 15,
    health: 50,
    thirst: 10,
    warmth: 60,
  },
  circadian: {
    sleepDrive: 100,
    isSleeping: false,
  },
  agent: {
    behavior: 'wander',
    useLLM: false,
  },
};
