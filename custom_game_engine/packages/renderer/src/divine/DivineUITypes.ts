/**
 * DivineUITypes - Types for the Divine Systems UI
 *
 * Defines types for prayers, angels, visions, sacred sites, and divine analytics.
 * See: specs/divine-systems-ui.md
 */

// ============================================================================
// Divine Resources
// ============================================================================

export interface DivineEnergy {
  current: number;
  max: number;
  regenRate: number;      // Per minute
  consumption: number;    // Per minute (from active angels)
}

// ============================================================================
// Prayer System
// ============================================================================

export type PrayerUrgency = 'critical' | 'urgent' | 'moderate' | 'gratitude';

export type PrayerDomain =
  | 'survival'    // Food, water, shelter
  | 'health'      // Injuries, illness
  | 'social'      // Relationships, conflicts
  | 'guidance'    // What to do, where to go
  | 'environment' // Weather, storms
  | 'gratitude'   // Thanks
  | 'other';

export interface Prayer {
  id: string;
  agentId: string;
  agentName: string;
  text: string;
  domain: PrayerDomain;
  urgency: PrayerUrgency;
  timestamp: number;
  answered: boolean;
  answeredBy?: 'player' | 'angel';
  angelId?: string;
}

export interface PrayerContext {
  agentRole: string;
  agentAge: number;
  location: { x: number; y: number };
  faith: number;           // 0-100
  faithLevel: 'skeptic' | 'curious' | 'believer' | 'devout';
  answeredCount: number;   // How many prayers answered
  totalPrayerCount: number;
  lastVisionDays?: number; // Days since last vision

  // Current agent state
  health: number;          // 0-100
  hunger: number;          // 0-100
  energy: number;          // 0-100

  // Recent memories
  recentMemories: string[];
}

// ============================================================================
// Vision System
// ============================================================================

export type VisionType = 'guidance' | 'warning' | 'prophecy' | 'revelation';

export type VisionDelivery = 'sleep' | 'meditation' | 'immediate';

export interface VisionDraft {
  type: VisionType;
  domain: PrayerDomain;
  message: string;
  clarity: number;         // 0-100, higher = easier to interpret
  delivery: VisionDelivery;
  symbolic: boolean;       // Harder to interpret but more mysterious
}

export interface VisionPreview {
  successChance: number;   // 0-100
  believability: number;   // 0-100
  faithImpact: {
    onSuccess: number;     // Delta to faith
    onFailure: number;     // Delta to faith
  };
  energyCost: number;
  predictedBehavior: string[];
}

// ============================================================================
// Angel System
// ============================================================================

export type AngelType = 'guardian' | 'specialist' | 'messenger' | 'watcher' | 'archangel';

export type AngelDomain =
  | 'survival'
  | 'healing'
  | 'social'
  | 'environment'
  | 'agriculture'
  | 'spiritual';

export type AngelStyle = 'gentle' | 'stern' | 'cryptic' | 'direct';

export type AngelAutonomy = 'supervised' | 'semi_autonomous' | 'fully_autonomous';

export type AngelStatus =
  | 'working'     // Currently handling a prayer
  | 'available'   // Idle, ready for assignment
  | 'depleted'    // Out of energy
  | 'overloaded'  // Too many assigned agents
  | 'resting'     // Intentionally paused
  | 'leveling'    // Gained XP for next level
  | 'corrupt';    // High corruption

export interface Angel {
  id: string;
  name: string;
  type: AngelType;
  domain: AngelDomain;

  // Level & energy
  level: number;
  xp: number;
  xpToNextLevel: number;
  energy: number;
  maxEnergy: number;
  energyConsumption: number;  // Per minute when active

  // Assigned agents
  assignedAgentIds: string[];
  maxAssignedAgents: number;

  // Performance
  successRate: number;        // 0-100
  satisfaction: number;       // 0-100
  efficiency: number;         // 0-100
  prayersHandled: number;

  // Personality
  style: AngelStyle;
  autonomy: AngelAutonomy;
  corruption: number;         // 0-100

  // Status
  status: AngelStatus;
  currentTask?: string;       // Description of current activity

  // Abilities (unlocked at levels)
  abilities: AngelAbility[];

  // Approval settings
  requireApproval: {
    routineVisions: boolean;
    miracles: boolean;
    prophecies: boolean;
    warnings: boolean;
  };
}

export interface AngelAbility {
  id: string;
  name: string;
  description: string;
  unlockedAtLevel: number;
  enabled: boolean;
}

export interface AngelCreationDraft {
  name: string;
  type: AngelType;
  domain: AngelDomain;
  style: AngelStyle;
  autonomy: AngelAutonomy;
}

// ============================================================================
// Sacred Sites
// ============================================================================

export type SacredSiteLevel = 1 | 2 | 3 | 4 | 5;

export interface SacredSite {
  id: string;
  name: string;
  location: { x: number; y: number };
  level: SacredSiteLevel;
  faithPower: number;        // 0-100

  // Origin
  originEvent: string;       // Description of how it became sacred
  originTimestamp: number;

  // Usage
  pilgrimCount: number;      // Total visitors
  ritualTypes: string[];     // Types of rituals performed here

  // Benefits
  prayerBonus: number;       // % bonus to prayer success
  visionClarityBonus: number; // % bonus to vision clarity
  faithRegenBonus: number;   // % bonus to faith regen in area

  // Guardian
  guardianAngelId?: string;
}

export const SACRED_SITE_NAMES: Record<SacredSiteLevel, string> = {
  1: 'Blessed Spot',
  2: 'Emerging Shrine',
  3: 'Sacred Site',
  4: 'Holy Ground',
  5: 'Divine Nexus',
};

export const SACRED_SITE_BENEFITS: Record<SacredSiteLevel, {
  prayerBonus: number;
  visionClarityBonus: number;
  faithRegenBonus: number;
}> = {
  1: { prayerBonus: 5, visionClarityBonus: 0, faithRegenBonus: 0 },
  2: { prayerBonus: 15, visionClarityBonus: 10, faithRegenBonus: 0 },
  3: { prayerBonus: 25, visionClarityBonus: 20, faithRegenBonus: 5 },
  4: { prayerBonus: 40, visionClarityBonus: 35, faithRegenBonus: 10 },
  5: { prayerBonus: 60, visionClarityBonus: 50, faithRegenBonus: 20 },
};

// ============================================================================
// Analytics
// ============================================================================

export interface FaithDistribution {
  skeptics: number;    // 0-30%
  curious: number;     // 30-50%
  believers: number;   // 50-80%
  devout: number;      // 80-100%
  average: number;
}

export interface PrayerStatistics {
  total: number;
  answered: number;
  unanswered: number;
  byDomain: Record<PrayerDomain, number>;
  averageResponseTime: number;  // In seconds
}

export type ProphecyStatus = 'pending' | 'fulfilled' | 'failed' | 'partial';

export interface Prophecy {
  id: string;
  message: string;
  recipientAgentId: string;
  recipientName: string;
  timestamp: number;
  deadline?: number;
  status: ProphecyStatus;
  faithImpact?: number;       // Delta after resolution
  affectedAgentCount?: number;
}

export interface DivineAnalytics {
  faithTrends: Array<{ timestamp: number; avgFaith: number }>;
  prayerStats: PrayerStatistics;
  faithDistribution: FaithDistribution;
  prophecies: Prophecy[];
  energyEconomy: {
    income: number;           // Per minute
    consumption: number;      // Per minute
    net: number;              // Per minute
  };
}

// ============================================================================
// UI State
// ============================================================================

export interface DivineUIState {
  // Resources
  energy: DivineEnergy;
  averageFaith: number;

  // Prayer inbox
  prayers: Prayer[];
  selectedPrayerId: string | null;
  prayerFilters: {
    domain: PrayerDomain | 'all';
    urgency: PrayerUrgency | 'all';
  };

  // Vision composer
  visionComposer: {
    isOpen: boolean;
    targetAgentId: string | null;
    draft: VisionDraft | null;
    preview: VisionPreview | null;
  };

  // Angels
  angels: Angel[];
  selectedAngelId: string | null;
  angelWizard: {
    isOpen: boolean;
    step: number;
    draft: AngelCreationDraft | null;
  };

  // Sacred sites
  sacredSites: SacredSite[];
  selectedSiteId: string | null;

  // Analytics
  analytics: DivineAnalytics;

  // Active tab
  activeTab: 'prayers' | 'angels' | 'sacred' | 'insights';
}

// ============================================================================
// Colors & Styling
// ============================================================================

export const DIVINE_COLORS = {
  // Divine/Spiritual
  primary: '#FFD700',       // Gold - divine energy, blessings
  secondary: '#E6E6FA',     // Lavender - visions, spirituality
  accent: '#87CEEB',        // Sky blue - heavenly realm
  sacred: '#F0E68C',        // Khaki - sacred sites

  // Functional
  success: '#90EE90',       // Light green
  warning: '#FFD700',       // Gold/yellow
  critical: '#FF6B6B',      // Soft red
  neutral: '#D3D3D3',       // Light gray

  // Faith levels
  faithHigh: '#FFD700',     // 80-100%
  faithMedium: '#87CEEB',   // 50-79%
  faithLow: '#F0E68C',      // 30-49%
  faithCritical: '#FF6B6B', // <30%
} as const;

export const URGENCY_COLORS: Record<PrayerUrgency, string> = {
  critical: '#FF6B6B',
  urgent: '#FFA500',
  moderate: '#FFD700',
  gratitude: '#90EE90',
};

export const URGENCY_ICONS: Record<PrayerUrgency, string> = {
  critical: '🔴',
  urgent: '🟠',
  moderate: '🟡',
  gratitude: '🟢',
};

export const ANGEL_STATUS_ICONS: Record<AngelStatus, string> = {
  working: '⚙️',
  available: '🟢',
  depleted: '🔴',
  overloaded: '⚠️',
  resting: '💤',
  leveling: '🌟',
  corrupt: '⚫',
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getFaithLevel(faith: number): 'skeptic' | 'curious' | 'believer' | 'devout' {
  if (faith < 30) return 'skeptic';
  if (faith < 50) return 'curious';
  if (faith < 80) return 'believer';
  return 'devout';
}

export function getFaithColor(faith: number): string {
  if (faith < 30) return DIVINE_COLORS.faithCritical;
  if (faith < 50) return DIVINE_COLORS.faithLow;
  if (faith < 80) return DIVINE_COLORS.faithMedium;
  return DIVINE_COLORS.faithHigh;
}

export function getVisionEnergyCost(type: VisionType, delivery: VisionDelivery): number {
  const baseCosts: Record<VisionType, number> = {
    guidance: 15,
    warning: 25,
    prophecy: 50,
    revelation: 100,
  };

  const deliveryMultipliers: Record<VisionDelivery, number> = {
    sleep: 1.0,
    meditation: 1.2,
    immediate: 1.5,
  };

  return Math.round(baseCosts[type] * deliveryMultipliers[delivery]);
}

export function getAngelCreationCost(type: AngelType): number {
  const costs: Record<AngelType, number> = {
    watcher: 50,
    messenger: 75,
    guardian: 100,
    specialist: 150,
    archangel: 300,
  };
  return costs[type];
}
