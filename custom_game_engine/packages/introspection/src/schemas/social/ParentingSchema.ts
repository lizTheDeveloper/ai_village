/**
 * Parenting Component Schema
 *
 * Tracks an agent's parenting responsibilities and drives.
 * Creates a biological/psychological drive to care for offspring.
 * Child health and wellbeing impacts parent social standing.
 *
 * Phase 4+, Tier 10 - Social/Community Components
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Parenting component type
 */
export interface ParentingComponent extends Component {
  type: 'parenting';
  version: 1;

  responsibilities: Array<{
    childId: string;
    isPrimaryCaregiver: boolean;
    otherParents: string[];
    startedAt: number;
    endsAt: number | null;
    careType: string;
    lastCheckIn: number;
    childWellbeingAssessment: number;
    neglectWarnings: number;
    notes?: string;
  }>;
  parentingDrive: number;
  driveLevel: 'none' | 'low' | 'moderate' | 'high' | 'urgent';
  timeSinceLastCare: number;
  parentingSkill: number;
  reputation: {
    parentingSkill: number;
    reputationModifier: number;
    notableEvents: Array<{
      type: 'achievement' | 'failure';
      description: string;
      tick: number;
      socialImpact: number;
    }>;
  };
  desiresChildren: boolean;
  desiredChildCount: number;
  parentingStyle: {
    protectiveness: number;
    teachingOrientation: number;
    emotionalExpressiveness: number;
    discipline: number;
  };
  careProvider: string;
  notes?: string;
}

/**
 * Parenting component schema
 */
export const ParentingSchema = autoRegister(
  defineComponent<ParentingComponent>({
    type: 'parenting',
    version: 1,
    category: 'social',

    fields: {
      responsibilities: {
        type: 'array',
        required: true,
        default: [],
        description: 'Active parenting responsibilities',
        displayName: 'Responsibilities',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'children',
          order: 1,
          icon: '👶',
        },
        mutable: true,
        itemType: 'object',
      },

      parentingDrive: {
        type: 'number',
        required: true,
        default: 0,
        range: [0, 1] as const,
        description: 'How strongly does this agent feel the parenting drive?',
        displayName: 'Parenting Drive',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'drive',
          order: 1,
          icon: '❤️',
        },
        mutable: true,
      },

      driveLevel: {
        type: 'string',
        required: true,
        default: 'none',
        description: 'Current parenting drive level',
        displayName: 'Drive Level',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'dropdown',
          group: 'drive',
          order: 2,
        },
        mutable: true,
        enumValues: ['none', 'low', 'moderate', 'high', 'urgent'],
      },

      timeSinceLastCare: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Time since last parenting check (for drive calculation)',
        displayName: 'Time Since Last Care',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'tracking',
          order: 1,
        },
        mutable: false,
      },

      parentingSkill: {
        type: 'number',
        required: true,
        default: 0.3,
        range: [0, 1] as const,
        description: 'Parenting skill (improved through practice)',
        displayName: 'Parenting Skill',
        visibility: { player: false, llm: false, agent: true, user: false, dev: true },
        ui: {
          widget: 'slider',
          group: 'skill',
          order: 1,
        },
        mutable: true,
      },

      reputation: {
        type: 'object',
        required: true,
        default: {
          parentingSkill: 0.3,
          reputationModifier: 0,
          notableEvents: [],
        },
        description: 'Social reputation from parenting',
        displayName: 'Reputation',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'reputation',
          order: 1,
        },
        mutable: false,
      },

      desiresChildren: {
        type: 'boolean',
        required: true,
        default: true,
        description: 'Does this agent want children?',
        displayName: 'Desires Children',
        visibility: { player: false, llm: 'summarized', agent: true, user: false, dev: true },
        ui: {
          widget: 'checkbox',
          group: 'desires',
          order: 1,
          icon: '👪',
        },
        mutable: true,
      },

      desiredChildCount: {
        type: 'number',
        required: true,
        default: 2,
        description: 'Ideal number of children this agent wants',
        displayName: 'Desired Child Count',
        visibility: { player: false, llm: false, agent: true, user: false, dev: true },
        ui: {
          widget: 'readonly',
          group: 'desires',
          order: 2,
        },
        mutable: true,
      },

      parentingStyle: {
        type: 'object',
        required: true,
        default: {
          protectiveness: 0.5,
          teachingOrientation: 0.5,
          emotionalExpressiveness: 0.5,
          discipline: 0.5,
        },
        description: 'Parenting style preferences (0-1 scales)',
        displayName: 'Parenting Style',
        visibility: { player: false, llm: false, agent: true, user: false, dev: true },
        ui: {
          widget: 'json',
          group: 'style',
          order: 1,
        },
        mutable: true,
      },

      careProvider: {
        type: 'string',
        required: true,
        default: 'both_parents',
        description: 'Species-specific parenting paradigm',
        displayName: 'Care Provider',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'config',
          order: 1,
        },
        mutable: false,
      },

      notes: {
        type: 'string',
        required: false,
        description: 'Notes about parenting approach and philosophy',
        displayName: 'Notes',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: {
          widget: 'text',
          group: 'notes',
          order: 1,
        },
        mutable: true,
      },
    },

    ui: {
      icon: '👶',
      color: '#FFB6C1',
      priority: 9,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'parenting',
      priority: 9,
      summarize: (data) => {
        if (data.responsibilities.length === 0) {
          if (data.desiresChildren) {
            return `wants ${data.desiredChildCount} children`;
          }
          return '';
        }

        const childCount = data.responsibilities.length;
        const driveLevelDesc: Record<string, string> = {
          none: '',
          low: 'low parenting drive',
          moderate: 'moderate parenting drive',
          high: 'strong parenting drive',
          urgent: 'URGENT parenting need',
        };

        let summary = `caring for ${childCount} ${childCount === 1 ? 'child' : 'children'}`;

        if (data.driveLevel !== 'none') {
          summary += ` (${driveLevelDesc[data.driveLevel]})`;
        }

        // Add urgent children info
        const urgentChildren = data.responsibilities.filter(r => r.childWellbeingAssessment < 0.3);
        if (urgentChildren.length > 0) {
          summary += ` | ${urgentChildren.length} ${urgentChildren.length === 1 ? 'child needs' : 'children need'} urgent attention`;
        }

        return summary;
      },
    },

    validate: (data): data is ParentingComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const p = data as any;

      return (
        p.type === 'parenting' &&
        Array.isArray(p.responsibilities) &&
        typeof p.parentingDrive === 'number' &&
        p.parentingDrive >= 0 &&
        p.parentingDrive <= 1 &&
        typeof p.driveLevel === 'string' &&
        typeof p.timeSinceLastCare === 'number' &&
        typeof p.parentingSkill === 'number' &&
        p.parentingSkill >= 0 &&
        p.parentingSkill <= 1 &&
        typeof p.reputation === 'object' &&
        typeof p.desiresChildren === 'boolean' &&
        typeof p.desiredChildCount === 'number' &&
        typeof p.parentingStyle === 'object' &&
        typeof p.careProvider === 'string'
      );
    },

    createDefault: () => ({
      type: 'parenting',
      version: 1,
      responsibilities: [],
      parentingDrive: 0,
      driveLevel: 'none',
      timeSinceLastCare: 0,
      parentingSkill: 0.3,
      reputation: {
        parentingSkill: 0.3,
        reputationModifier: 0,
        notableEvents: [],
      },
      desiresChildren: true,
      desiredChildCount: 2,
      parentingStyle: {
        protectiveness: 0.5,
        teachingOrientation: 0.5,
        emotionalExpressiveness: 0.5,
        discipline: 0.5,
      },
      careProvider: 'both_parents',
    }),
  })
);
