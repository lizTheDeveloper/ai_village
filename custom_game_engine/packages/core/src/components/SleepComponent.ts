import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * Entity sleep state for event-driven entity awakening.
 *
 * Inspired by Factorio's sleeping inserters - entities sleep until triggered.
 *
 * **States:**
 * - `active`: Processing every tick
 * - `scheduled`: Sleeping until wake_tick
 * - `waiting`: Sleeping until event fires
 * - `passive`: Never auto-wakes (query only)
 *
 * **Use cases:**
 * - Plants: Sleep until next growth tick (once per day)
 * - Sleeping agents: Sleep until wake time or dream interval
 * - Buildings: Sleep until inventory changes or damage
 * - Idle inserters: Sleep until belt has items
 *
 * **Performance impact:**
 * - Without sleep: 1000 plants = 1000 updates/tick
 * - With sleep: 1000 plants = ~1 update/tick average (24000 tick sleep cycle)
 *
 * See: /openspec/specs/EVENT_DRIVEN_ENTITIES.md
 */
export interface SleepComponent extends Component {
  type: 'sleep';

  /** Current state */
  state: 'active' | 'scheduled' | 'waiting' | 'passive';

  /** For scheduled: tick to wake */
  wake_tick?: number;

  /** For waiting: events that wake this entity */
  wake_events?: string[];

  /** Last tick this entity was processed */
  last_processed_tick: number;

  /** Accumulated delta since last process (for catch-up) */
  accumulated_delta: number;
}

/**
 * Create a sleep component.
 * Entities start in active state.
 */
export function createSleepComponent(currentTick: number): SleepComponent {
  return {
    type: 'sleep',
    version: 1,
    state: 'active',
    last_processed_tick: currentTick,
    accumulated_delta: 0,
  };
}

/**
 * Sleep component schema for validation.
 */
export const SleepComponentSchema: ComponentSchema<SleepComponent> = {
  type: 'sleep',
  version: 1,
  fields: [
    { name: 'state', type: 'string', required: true },
    { name: 'wake_tick', type: 'number', required: false },
    { name: 'wake_events', type: 'stringArray', required: false },
    { name: 'last_processed_tick', type: 'number', required: true },
    { name: 'accumulated_delta', type: 'number', required: true },
  ],
  validate: (data: unknown): data is SleepComponent => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const d = data as Record<string, unknown>;
    const validState = d.state === 'active' || d.state === 'scheduled' || d.state === 'waiting' || d.state === 'passive';

    return (
      d.type === 'sleep' &&
      validState &&
      typeof d.last_processed_tick === 'number' &&
      typeof d.accumulated_delta === 'number' &&
      (d.wake_tick === undefined || typeof d.wake_tick === 'number') &&
      (d.wake_events === undefined || Array.isArray(d.wake_events))
    );
  },
  createDefault: () => createSleepComponent(0),
};
