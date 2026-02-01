/**
 * DevPanel Constants - Colors, sizes, and action definitions
 */

import type { ActionButton } from './DevPanelTypes.js';

// ============================================================================
// Colors
// ============================================================================

export const COLORS = {
  background: 'rgba(10, 10, 15, 0.98)',
  headerBg: 'rgba(40, 20, 20, 0.95)',
  sectionBg: 'rgba(25, 25, 35, 0.9)',
  inputBg: 'rgba(30, 30, 40, 0.8)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  dev: '#FF6666',
  warning: '#FFAA00',
  success: '#66FF66',
  magic: '#9966FF',
  divinity: '#FFD700',
  slider: '#4488FF',
  sliderBg: 'rgba(50, 50, 70, 0.5)',
  button: 'rgba(80, 60, 100, 0.7)',
  buttonDanger: 'rgba(120, 40, 40, 0.7)',
  border: 'rgba(100, 100, 140, 0.5)',
};

// ============================================================================
// Sizes
// ============================================================================

export const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 44,
  tabHeight: 32,
  sectionHeaderHeight: 28,
  sliderHeight: 40,
  buttonHeight: 28,
  toggleHeight: 32,
  rowHeight: 36,
};

// ============================================================================
// Quick Actions
// ============================================================================

export const DEV_ACTIONS: ActionButton[] = [
  { id: 'unlock_all_spells', label: 'Unlock All Spells', description: 'Unlock every spell in all paradigms', section: 'magic' },
  { id: 'max_mana', label: 'Max All Mana', description: 'Restore all mana/resources to maximum', section: 'magic' },
  { id: 'reset_cooldowns', label: 'Reset Cooldowns', description: 'Clear all spell cooldowns', section: 'magic' },
  { id: 'grant_belief', label: '+1000 Belief', description: 'Add 1000 belief points', section: 'divinity' },
  { id: 'max_faith', label: 'Max All Faith', description: 'Set all believer faith to 100%', section: 'divinity' },
  { id: 'spawn_angel', label: 'Spawn Angel', description: 'Create a new angelic servant', section: 'divinity' },
  { id: 'answer_prayers', label: 'Answer All Prayers', description: 'Automatically answer all pending prayers', section: 'divinity' },
  { id: 'grant_xp_all', label: '+500 XP (All Trees)', description: 'Grant 500 XP to all skill trees', section: 'skills' },
  { id: 'unlock_all_nodes', label: 'Unlock All Nodes', description: 'Unlock every skill tree node', section: 'skills', dangerous: true },
  { id: 'trigger_eclipse', label: 'Trigger Eclipse', description: 'Force an eclipse event', section: 'events' },
  { id: 'trigger_miracle', label: 'Random Miracle', description: 'Trigger a random miracle effect', section: 'events' },
  { id: 'reset_all', label: 'RESET ALL', description: 'Reset all magic and divinity state to defaults', section: 'state', dangerous: true },
];
