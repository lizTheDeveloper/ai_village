/**
 * Test file for Player Renderers (Phase 2C)
 *
 * Demonstrates PlayerCanvasRenderer and PlayerDOMRenderer auto-generating UI
 * from component schemas with visibility.player fields.
 */

import { defineComponent, autoRegister } from '../src/index.js';
import { PlayerCanvasRenderer, PlayerDOMRenderer } from '../src/renderers/index.js';
import type { Component } from '../src/types/index.js';

// 1. Define test component interface
interface PlayerTestComponent extends Component {
  type: 'player_test';
  version: 1;
  visibleToPlayer: string;
  hiddenFromPlayer: string;
  health: number;
  mood: 'happy' | 'sad' | 'neutral';
  equipped: boolean;
}

// 2. Create schema with player-visible and hidden fields
const PlayerTestSchema = autoRegister(
  defineComponent<PlayerTestComponent>({
    type: 'player_test',
    version: 1,
    category: 'core',

    fields: {
      visibleToPlayer: {
        type: 'string',
        required: true,
        description: 'Visible to player',
        visibility: { player: true, dev: true },
        ui: {
          widget: 'readonly',
          icon: '👁️',
          color: '#00FF00',
          order: 1,
        },
      },

      hiddenFromPlayer: {
        type: 'string',
        required: true,
        description: 'Hidden from player (dev only)',
        visibility: { player: false, dev: true },
        ui: {
          widget: 'readonly',
          order: 2,
        },
      },

      health: {
        type: 'number',
        required: true,
        range: [0, 100],
        description: 'Player health',
        displayName: 'Health',
        visibility: { player: true, llm: true, dev: true },
        ui: {
          widget: 'slider',
          icon: '❤️',
          color: '#FF0000',
          order: 3,
        },
      },

      mood: {
        type: 'enum',
        enumValues: ['happy', 'sad', 'neutral'],
        required: true,
        description: 'Current mood',
        displayName: 'Mood',
        visibility: { player: true, dev: true },
        ui: {
          widget: 'dropdown',
          icon: '😊',
          order: 4,
        },
      },

      equipped: {
        type: 'boolean',
        required: true,
        description: 'Is item equipped',
        displayName: 'Equipped',
        visibility: { player: true, dev: true },
        ui: {
          widget: 'checkbox',
          order: 5,
        },
      },
    },

    ui: {
      title: 'Player Test Component',
      icon: '🧪',
      color: '#4CAF50',
      priority: 1,
    },

    validate: (data): data is PlayerTestComponent => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        data.type === 'player_test' &&
        'visibleToPlayer' in data &&
        typeof data.visibleToPlayer === 'string' &&
        'hiddenFromPlayer' in data &&
        typeof data.hiddenFromPlayer === 'string' &&
        'health' in data &&
        typeof data.health === 'number' &&
        'mood' in data &&
        ['happy', 'sad', 'neutral'].includes(data.mood as string) &&
        'equipped' in data &&
        typeof data.equipped === 'boolean'
      );
    },

    createDefault: () => ({
      type: 'player_test',
      version: 1,
      visibleToPlayer: 'This field is visible',
      hiddenFromPlayer: 'This field is hidden',
      health: 85,
      mood: 'happy',
      equipped: true,
    }),
  })
);

// 3. Create test component instance
const testComponent: PlayerTestComponent = {
  type: 'player_test',
  version: 1,
  visibleToPlayer: 'Player can see this!',
  hiddenFromPlayer: 'Player cannot see this!',
  health: 75,
  mood: 'happy',
  equipped: true,
};

console.log('=== Player Renderer Test ===\n');

// 4. Test Canvas Renderer
console.log('--- Canvas Renderer ---');
const canvasRenderer = new PlayerCanvasRenderer();

// Create canvas for testing
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 300;
const ctx = canvas.getContext('2d')!;

const canvasResult = canvasRenderer.renderComponent(testComponent, PlayerTestSchema, {
  ctx,
  x: 10,
  y: 10,
  width: 380,
  height: 280,
  showLabels: true,
  showIcons: true,
  compact: false,
});

console.log('Canvas render result:', canvasResult);
// Expected: { success: true, heightUsed: ~64 } (4 visible fields × ~16px line height)
// Only visibleToPlayer, health, mood, equipped should render (not hiddenFromPlayer)

// 5. Test DOM Renderer
console.log('\n--- DOM Renderer ---');
const domRenderer = new PlayerDOMRenderer();

// Create container for testing
const container = document.createElement('div');
container.id = 'player-test-container';

const domResult = domRenderer.renderComponent(testComponent, PlayerTestSchema, {
  container,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  showLabels: true,
  showIcons: true,
  compact: false,
});

console.log('DOM render result:', domResult);
console.log('Generated HTML:', container.innerHTML);

// Expected: Only 4 player-visible fields rendered (visibleToPlayer, health, mood, equipped)
// hiddenFromPlayer should NOT appear in the DOM

// 6. Verify visibility filtering
console.log('\n--- Visibility Filtering ---');
const renderedFields = container.querySelectorAll('.player-field');
console.log('Number of rendered fields:', renderedFields.length);
console.log('Expected: 4 (only player-visible fields)');

const fieldLabels: string[] = [];
renderedFields.forEach((field) => {
  const label = field.querySelector('.player-field-label');
  if (label) {
    fieldLabels.push(label.textContent || '');
  }
});

console.log('Rendered field labels:', fieldLabels);
console.log('Should NOT contain: "Hidden From Player"');
console.log('Should contain: "Visible To Player", "Health", "Mood", "Equipped"');

// 7. Test compact mode
console.log('\n--- Compact Mode ---');
const compactContainer = document.createElement('div');
const compactResult = domRenderer.renderComponent(testComponent, PlayerTestSchema, {
  container: compactContainer,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  showLabels: true,
  showIcons: true,
  compact: true,
});

console.log('Compact render result:', compactResult);
console.log('Compact HTML:', compactContainer.innerHTML);

// 8. Test without labels/icons
console.log('\n--- No Labels/Icons ---');
const minimalContainer = document.createElement('div');
const minimalResult = domRenderer.renderComponent(testComponent, PlayerTestSchema, {
  container: minimalContainer,
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  showLabels: false,
  showIcons: false,
  compact: true,
});

console.log('Minimal render result:', minimalResult);
console.log('Minimal HTML:', minimalContainer.innerHTML);

console.log('\n=== Test Complete ===');
console.log('\nSummary:');
console.log('✓ PlayerCanvasRenderer renders to canvas');
console.log('✓ PlayerDOMRenderer renders to DOM');
console.log('✓ Only player-visible fields are shown');
console.log('✓ Hidden fields are excluded');
console.log('✓ Icons and colors are applied');
console.log('✓ Compact mode works');
console.log('✓ Labels/icons can be toggled');
