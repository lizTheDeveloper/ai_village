/**
 * NotificationHelpers - Common notification patterns for game events
 *
 * Provides pre-configured notification templates for common game events.
 */

import type { NotificationContent } from './NotificationModal.js';

/**
 * Helper functions to create common notification types
 */
export class NotificationHelpers {
  /**
   * Show a discovery notification (new plant, spell, item, etc.)
   */
  static discovery(
    title: string,
    description: string,
    details?: Record<string, string>,
    imageSrc?: string
  ): NotificationContent {
    return {
      type: 'discovery',
      title,
      subtitle: 'New Discovery!',
      sections: [
        {
          content: description,
          style: 'default',
        },
        ...(details
          ? [
              {
                title: 'Details',
                content: details,
                style: 'highlighted' as const,
              },
            ]
          : []),
      ],
      image: imageSrc
        ? {
            src: imageSrc,
            alt: title,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0, // No auto-dismiss - user must click
    };
  }

  /**
   * Show an achievement notification
   */
  static achievement(
    title: string,
    description: string,
    reward?: string,
    imageSrc?: string
  ): NotificationContent {
    return {
      type: 'achievement',
      title,
      subtitle: 'Achievement Unlocked!',
      sections: [
        {
          content: description,
          style: 'success',
        },
        ...(reward
          ? [
              {
                title: 'Reward',
                content: reward,
                style: 'highlighted' as const,
                icon: '🎁',
              },
            ]
          : []),
      ],
      image: imageSrc
        ? {
            src: imageSrc,
            alt: title,
            size: 'large' as const,
          }
        : undefined,
      autoDismiss: 8000, // 8 seconds
    };
  }

  /**
   * Show an event notification (births, deaths, marriages, etc.)
   */
  static event(
    title: string,
    subtitle: string,
    details: Record<string, string>,
    imageSrc?: string
  ): NotificationContent {
    return {
      type: 'event',
      title,
      subtitle,
      sections: [
        {
          content: details,
          style: 'default',
        },
      ],
      image: imageSrc
        ? {
            src: imageSrc,
            alt: title,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0, // Let user dismiss
    };
  }

  /**
   * Show a warning notification
   */
  static warning(title: string, message: string, actions?: Array<{ text: string; action: () => void }>): NotificationContent {
    return {
      type: 'warning',
      title,
      sections: [
        {
          content: message,
          style: 'warning',
        },
      ],
      buttons: actions?.map((a) => ({
        text: a.text,
        style: a.text.toLowerCase().includes('cancel') ? 'secondary' as const : 'primary' as const,
        action: a.action,
      })),
      autoDismiss: 0,
    };
  }

  /**
   * Show an error notification
   */
  static error(title: string, message: string, technicalDetails?: string): NotificationContent {
    return {
      type: 'error',
      title,
      sections: [
        {
          content: message,
          style: 'warning',
        },
        ...(technicalDetails
          ? [
              {
                title: 'Technical Details',
                content: technicalDetails,
                style: 'default' as const,
              },
            ]
          : []),
      ],
      autoDismiss: 0,
    };
  }

  /**
   * Show a success notification
   */
  static success(title: string, message: string, autoDismiss: number = 5000): NotificationContent {
    return {
      type: 'success',
      title,
      sections: [
        {
          content: message,
          style: 'success',
        },
      ],
      autoDismiss,
    };
  }

  /**
   * Show an info notification
   */
  static info(title: string, message: string, autoDismiss: number = 5000): NotificationContent {
    return {
      type: 'info',
      title,
      sections: [
        {
          content: message,
          style: 'info',
        },
      ],
      autoDismiss,
    };
  }

  /**
   * Show a plant discovery notification
   */
  static plantDiscovery(
    plantName: string,
    properties: string[],
    uses: string[],
    imageSrc?: string
  ): NotificationContent {
    return {
      type: 'discovery',
      title: `${plantName} Discovered!`,
      subtitle: 'New Plant Species',
      icon: '🌿',
      sections: [
        {
          title: 'Properties',
          content: properties,
          style: 'highlighted',
          icon: '📋',
        },
        {
          title: 'Potential Uses',
          content: uses,
          style: 'info',
          icon: '⚗️',
        },
      ],
      image: imageSrc
        ? {
            src: imageSrc,
            alt: plantName,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0,
    };
  }

  /**
   * Show a spell discovery notification
   */
  static spellDiscovery(
    spellName: string,
    description: string,
    stats: Record<string, string>,
    imageSrc?: string
  ): NotificationContent {
    return {
      type: 'discovery',
      title: `${spellName} Discovered!`,
      subtitle: 'New Spell Unlocked',
      icon: '✨',
      sections: [
        {
          content: description,
          style: 'default',
        },
        {
          title: 'Stats',
          content: stats,
          style: 'highlighted',
        },
      ],
      image: imageSrc
        ? {
            src: imageSrc,
            alt: spellName,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0,
    };
  }

  /**
   * Show an agent birth notification
   */
  static birth(
    agentName: string,
    species: string,
    parents: string[],
    spriteSrc?: string
  ): NotificationContent {
    return {
      type: 'event',
      title: `${agentName} is Born!`,
      subtitle: 'New Life in the Village',
      icon: '👶',
      sections: [
        {
          content: {
            Species: species,
            Parents: parents.join(' and '),
          },
          style: 'success',
        },
      ],
      image: spriteSrc
        ? {
            src: spriteSrc,
            alt: agentName,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0,
    };
  }

  /**
   * Show an agent death notification
   */
  static death(
    agentName: string,
    cause: string,
    age: number,
    spriteSrc?: string
  ): NotificationContent {
    return {
      type: 'event',
      title: `${agentName} Has Passed`,
      subtitle: 'A Soul Returns to the Cycle',
      icon: '🕊️',
      sections: [
        {
          content: {
            Age: `${age} years`,
            Cause: cause,
          },
          style: 'warning',
        },
        {
          content: 'Their soul will be reborn when the time is right.',
          style: 'info',
        },
      ],
      image: spriteSrc
        ? {
            src: spriteSrc,
            alt: agentName,
            size: 'medium' as const,
          }
        : undefined,
      autoDismiss: 0,
    };
  }

  /**
   * Show a skill level up notification
   */
  static skillLevelUp(
    agentName: string,
    skillName: string,
    newLevel: number,
    spriteSrc?: string
  ): NotificationContent {
    const levelNames = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'];
    const levelName = levelNames[newLevel - 1] || 'Master';

    return {
      type: 'achievement',
      title: `Skill Level Up!`,
      subtitle: `${agentName} has improved`,
      icon: '📈',
      sections: [
        {
          content: {
            Agent: agentName,
            Skill: skillName,
            'New Level': `${levelName} (${newLevel})`,
          },
          style: 'success',
        },
      ],
      image: spriteSrc
        ? {
            src: spriteSrc,
            alt: agentName,
            size: 'small' as const,
          }
        : undefined,
      autoDismiss: 5000,
    };
  }

  /**
   * Show a deity emergence notification
   */
  static deityEmergence(
    deityName: string,
    domain: string,
    believers: number
  ): NotificationContent {
    return {
      type: 'achievement',
      title: 'A God Has Emerged!',
      subtitle: deityName,
      icon: '⚡',
      sections: [
        {
          content: {
            Domain: domain,
            Believers: believers.toString(),
          },
          style: 'highlighted',
        },
        {
          content: 'Divine power flows through the world...',
          style: 'info',
        },
      ],
      autoDismiss: 0,
    };
  }
}
