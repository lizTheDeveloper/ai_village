# Notification System

Generalized modal notification system based on the SoulCeremonyModal design.

## Features

- ✨ Beautiful, dismissible modals with consistent styling
- 🎨 7 notification types with themed colors
- ⏱️ Auto-dismiss with configurable timeout
- 📋 Queue system for multiple notifications
- 🖼️ Optional images with pixelated rendering
- 🔘 Customizable buttons with actions
- ⌨️ ESC key and click-outside to dismiss
- 📱 Responsive and scrollable content

## Quick Start

### 1. Create the notification modal (once per app)

```typescript
import { NotificationModal } from '@ai-village/renderer';

const notificationModal = new NotificationModal();
```

### 2. Show notifications

#### Using Helpers (Recommended)

```typescript
import { NotificationHelpers } from '@ai-village/renderer';

// Discovery
notificationModal.show(
  NotificationHelpers.plantDiscovery(
    'Moonflower',
    ['Glows at night', 'Rare', 'Magical properties'],
    ['Alchemy', 'Healing potions', 'Light source'],
    '/assets/plants/moonflower.png'
  )
);

// Achievement
notificationModal.show(
  NotificationHelpers.achievement(
    'Master Builder',
    'You have constructed 100 buildings!',
    '500 Gold, Builder\'s Crown',
    '/assets/achievements/master-builder.png'
  )
);

// Event
notificationModal.show(
  NotificationHelpers.birth(
    'Elara Moonwhisper',
    'Elf',
    ['Theron', 'Lirael'],
    '/assets/sprites/pixellab/elf_001/rotations/south.png'
  )
);

// Simple success message
notificationModal.show(
  NotificationHelpers.success('Village Saved!', 'The dragon has been defeated!')
);
```

#### Custom Notifications

```typescript
notificationModal.show({
  type: 'warning',
  title: 'Low Resources',
  subtitle: 'Village needs attention',
  sections: [
    {
      title: 'Critical Resources',
      content: {
        Food: '12 remaining',
        Wood: '5 remaining',
        Water: '8 remaining',
      },
      style: 'warning',
      icon: '⚠️',
    },
    {
      content: 'Assign agents to gather resources immediately.',
      style: 'default',
    },
  ],
  buttons: [
    {
      text: 'Open Resource Panel',
      style: 'primary',
      action: () => {
        // Open resource panel
      },
    },
    {
      text: 'Dismiss',
      style: 'secondary',
      action: () => {},
    },
  ],
  autoDismiss: 0, // No auto-dismiss
});
```

## Notification Types

### 1. `info` (Blue)
- General information
- Tutorial hints
- Status updates

### 2. `success` (Green)
- Achievements unlocked
- Goals completed
- Operations succeeded

### 3. `warning` (Gold)
- Resource shortages
- Attention needed
- Non-critical issues

### 4. `error` (Red)
- Failed operations
- Critical errors
- System issues

### 5. `event` (Purple)
- Births, deaths, marriages
- Seasonal changes
- Story events

### 6. `discovery` (Orange)
- New plants, spells, items
- Research completed
- Secrets found

### 7. `achievement` (Gold with trophy)
- Milestones reached
- Skill level ups
- Special accomplishments

## Helper Methods

### NotificationHelpers

```typescript
// Discovery
NotificationHelpers.discovery(title, description, details?, imageSrc?)
NotificationHelpers.plantDiscovery(name, properties, uses, imageSrc?)
NotificationHelpers.spellDiscovery(name, description, stats, imageSrc?)

// Events
NotificationHelpers.event(title, subtitle, details, imageSrc?)
NotificationHelpers.birth(name, species, parents, spriteSrc?)
NotificationHelpers.death(name, cause, age, spriteSrc?)
NotificationHelpers.deityEmergence(name, domain, believers)

// Achievements
NotificationHelpers.achievement(title, description, reward?, imageSrc?)
NotificationHelpers.skillLevelUp(agentName, skillName, newLevel, spriteSrc?)

// Simple messages
NotificationHelpers.success(title, message, autoDismiss?)
NotificationHelpers.info(title, message, autoDismiss?)
NotificationHelpers.warning(title, message, actions?)
NotificationHelpers.error(title, message, technicalDetails?)
```

## Section Styles

Sections can have different visual styles:

- `default` - Standard dark background
- `highlighted` - Gold border and background
- `warning` - Red border and background
- `success` - Green border and background
- `info` - Blue border and background

```typescript
{
  sections: [
    {
      title: 'Important',
      content: 'This is highlighted',
      style: 'highlighted',
      icon: '⭐',
    },
  ];
}
```

## Content Types

### String Content
```typescript
{
  content: 'This is a simple text message.';
}
```

### Array Content (Bullet Points)
```typescript
{
  content: ['First item', 'Second item', 'Third item'];
}
```

### Object Content (Key-Value Pairs)
```typescript
{
  content: {
    Name: 'Elara',
    Age: '1000 years',
    Species: 'Elf',
  };
}
```

## Images

```typescript
{
  image: {
    src: '/assets/sprites/agent.png',
    alt: 'Agent sprite',
    size: 'medium', // 'small' (64px) | 'medium' (96px) | 'large' (128px)
  };
}
```

Images are automatically rendered with:
- Pixelated/crisp-edges style (perfect for pixel art)
- Border matching notification theme
- Centered layout
- Fallback hiding if image fails to load

## Auto-Dismiss

```typescript
autoDismiss: 5000; // Dismiss after 5 seconds
autoDismiss: 0; // No auto-dismiss (user must click)
```

## Buttons

```typescript
{
  buttons: [
    {
      text: 'Accept',
      style: 'primary', // Gold/theme color
      action: () => {
        /* handle action */
      },
    },
    {
      text: 'Cancel',
      style: 'secondary', // Gray
      action: () => {
        /* handle cancel */
      },
    },
    {
      text: 'Delete',
      style: 'danger', // Red
      action: () => {
        /* handle delete */
      },
    },
  ];
}
```

- Buttons automatically dismiss the modal after action
- Hover effects included
- If no buttons provided, shows "Press ESC or click outside to dismiss"

## Queue System

Multiple notifications are automatically queued:

```typescript
notificationModal.show(notification1); // Shows immediately
notificationModal.show(notification2); // Queued
notificationModal.show(notification3); // Queued

// After notification1 is dismissed, notification2 shows
// After notification2 is dismissed, notification3 shows
```

Clear queue:

```typescript
notificationModal.clearQueue();
```

## Callbacks

```typescript
{
  onDismiss: () => {
    console.log('Notification was dismissed');
  };
}
```

## Complete Example: Plant Discovery System

```typescript
import { NotificationModal, NotificationHelpers } from '@ai-village/renderer';

class PlantDiscoverySystem {
  private notificationModal: NotificationModal;

  constructor() {
    this.notificationModal = new NotificationModal();
  }

  onPlantDiscovered(plant: Plant): void {
    this.notificationModal.show(
      NotificationHelpers.plantDiscovery(
        plant.name,
        plant.properties,
        plant.uses,
        `/assets/plants/${plant.id}.png`
      )
    );
  }
}
```

## Integration with Game Events

```typescript
// In main game loop or event system
gameLoop.eventBus.on('plant_discovered', (plant) => {
  notificationModal.show(
    NotificationHelpers.plantDiscovery(
      plant.name,
      plant.properties,
      plant.uses,
      plant.imagePath
    )
  );
});

gameLoop.eventBus.on('agent_born', (agent) => {
  notificationModal.show(
    NotificationHelpers.birth(agent.name, agent.species, agent.parents, agent.spritePath)
  );
});

gameLoop.eventBus.on('achievement_unlocked', (achievement) => {
  notificationModal.show(
    NotificationHelpers.achievement(
      achievement.title,
      achievement.description,
      achievement.reward,
      achievement.iconPath
    )
  );
});

gameLoop.eventBus.on('skill_level_up', ({ agent, skill, newLevel }) => {
  notificationModal.show(
    NotificationHelpers.skillLevelUp(agent.name, skill, newLevel, agent.spritePath)
  );
});
```

## Styling

The notification modal uses the same beautiful aesthetic as the Soul Ceremony Modal:

- Full-screen overlay with backdrop blur
- Centered content area with max 85vh height
- Scrollable content for long notifications
- Gradient borders and glowing effects
- Smooth slide-in animation
- Theme-specific colors for each notification type

All styling is handled internally - no CSS files needed!
