import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { AfterlifeComponent } from '@ai-village/core';

/**
 * AfterlifeSchema - Introspection schema for AfterlifeComponent
 *
 * Tier 9: Afterlife/Spiritual
 * Batch 5: Soul & Realms
 * Category: Cognitive/Afterlife
 */
export const AfterlifeSchema = autoRegister(
  defineComponent<AfterlifeComponent>({
    type: 'afterlife',
    version: 1,
    category: 'afterlife',

    fields: {
      coherence: {
        type: 'number',
        required: true,
        default: 1.0,
        description: 'Identity/memory integrity (0 = becomes shade)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'needs',
          order: 1,
        },
      },

      tether: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'Connection to mortal world (0 = passes on)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'needs',
          order: 2,
        },
      },

      peace: {
        type: 'number',
        required: true,
        default: 0.5,
        description: 'Acceptance of death (<0.2 = restless)',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'needs',
          order: 3,
        },
      },

      solitude: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Loneliness in realm of the dead',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'slider',
          group: 'needs',
          order: 4,
        },
      },

      causeOfDeath: {
        type: 'string',
        required: true,
        description: 'What killed them',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'death',
          order: 5,
        },
      },

      unfinishedGoals: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Incomplete goals from life',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'business',
          order: 6,
        },
      },

      unresolvedRelationships: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Important relationships unresolved',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'business',
          order: 7,
        },
      },

      descendants: {
        type: 'array',
        itemType: 'string',
        required: true,
        default: [],
        description: 'Living descendant entity IDs',
        visibility: {
          player: true,
          llm: 'summarized',
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'family',
          order: 8,
        },
      },

      isShade: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Lost identity, wanders aimlessly',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 9,
        },
      },

      hasPassedOn: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Peacefully departed',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 10,
        },
      },

      isRestless: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'May haunt, attempt escape',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 11,
        },
      },

      isAncestorKami: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Transformed into protective ancestor spirit',
        visibility: {
          player: true,
          llm: true,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'state',
          order: 12,
        },
      },

      wantsToReincarnate: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Does soul wish to be reincarnated?',
        visibility: {
          player: true,
          llm: true,
          agent: true,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'checkbox',
          group: 'reincarnation',
          order: 13,
        },
      },

      timesRemembered: {
        type: 'number',
        required: true,
        default: 0,
        description: 'How many times remembered (prayers, offerings)',
        visibility: {
          player: true,
          llm: false,
          agent: false,
          user: true,
          dev: true,
        },
        ui: {
          widget: 'readonly',
          group: 'tracking',
          order: 14,
        },
      },
    },

    ui: {
      icon: '💀',
      color: '#696969',
      priority: 8,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'Afterlife State',
      summarize: (data: AfterlifeComponent) => {
        const coherence = (data.coherence * 100).toFixed(0);
        const peace = (data.peace * 100).toFixed(0);
        const tether = (data.tether * 100).toFixed(0);
        let state = 'wandering';
        if (data.isShade) state = 'shade';
        else if (data.hasPassedOn) state = 'passed on';
        else if (data.isAncestorKami) state = 'ancestor kami';
        else if (data.isRestless) state = 'restless';
        return `${state}: coherence ${coherence}%, peace ${peace}%, tether ${tether}%`;
      },
    },

    validate: (data): data is AfterlifeComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const a = data as Record<string, unknown>;

      return (
        'type' in a &&
        a.type === 'afterlife' &&
        'coherence' in a &&
        typeof a.coherence === 'number' &&
        'tether' in a &&
        typeof a.tether === 'number' &&
        'peace' in a &&
        typeof a.peace === 'number' &&
        'solitude' in a &&
        typeof a.solitude === 'number' &&
        'causeOfDeath' in a &&
        typeof a.causeOfDeath === 'string' &&
        'deathTick' in a &&
        typeof a.deathTick === 'number' &&
        'deathLocation' in a &&
        typeof a.deathLocation === 'object' &&
        a.deathLocation !== null &&
        'unfinishedGoals' in a &&
        Array.isArray(a.unfinishedGoals) &&
        'unresolvedRelationships' in a &&
        Array.isArray(a.unresolvedRelationships) &&
        'descendants' in a &&
        Array.isArray(a.descendants) &&
        'isShade' in a &&
        typeof a.isShade === 'boolean' &&
        'hasPassedOn' in a &&
        typeof a.hasPassedOn === 'boolean' &&
        'isRestless' in a &&
        typeof a.isRestless === 'boolean' &&
        'isAncestorKami' in a &&
        typeof a.isAncestorKami === 'boolean' &&
        'wantsToReincarnate' in a &&
        typeof a.wantsToReincarnate === 'boolean' &&
        'timesRemembered' in a &&
        typeof a.timesRemembered === 'number' &&
        'lastRememberedTick' in a &&
        typeof a.lastRememberedTick === 'number' &&
        'visitsFromLiving' in a &&
        typeof a.visitsFromLiving === 'number' &&
        'offeringsReceived' in a &&
        typeof a.offeringsReceived === 'object' &&
        a.offeringsReceived !== null
      );
    },

    createDefault: (): AfterlifeComponent => ({
      type: 'afterlife',
      version: 1,
      coherence: 1.0,
      tether: 0.5,
      peace: 0.5,
      solitude: 0.0,
      causeOfDeath: 'unknown',
      deathTick: 0,
      deathLocation: { x: 0, y: 0 },
      unfinishedGoals: [],
      unresolvedRelationships: [],
      descendants: [],
      isShade: false,
      hasPassedOn: false,
      isRestless: false,
      isAncestorKami: false,
      wantsToReincarnate: true,
      timesRemembered: 0,
      lastRememberedTick: 0,
      visitsFromLiving: 0,
      offeringsReceived: {},
    }),
  })
);
