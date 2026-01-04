/**
 * ProfessionTemplates - Template library for profession output generation
 *
 * This library provides rich, varied content templates for different professions.
 * Used by ProfessionWorkSimulationSystem to generate profession outputs without LLM calls.
 *
 * Templates are organized by:
 * - Profession role (reporter, actor, DJ, etc.)
 * - Output type (articles, shows, broadcasts)
 * - Quality tier (excellent, good, adequate, poor)
 *
 * Usage:
 *   const template = selectTemplate('newspaper_reporter', 'article', quality);
 *   const content = fillTemplate(template, context);
 */

import type { ProfessionRole } from '../components/ProfessionComponent.js';

/**
 * Template with placeholders for variable substitution.
 */
export interface ContentTemplate {
  /** Template string with {{placeholder}} markers */
  template: string;
  /** Required context keys for this template */
  requiredContext: string[];
  /** Quality tier (0.0-1.0 range this template is appropriate for) */
  qualityRange: { min: number; max: number };
}

/**
 * Template context - variables to fill into templates.
 */
export interface TemplateContext {
  agentName?: string;
  cityName?: string;
  date?: string;
  time?: string;
  weather?: string;
  population?: number;
  randomName?: string;
  randomNumber?: number;
  randomPlace?: string;
  [key: string]: string | number | undefined;
}

// ============================================================================
// NEWSPAPER ARTICLE TEMPLATES
// ============================================================================

const NEWSPAPER_ARTICLE_TEMPLATES: ContentTemplate[] = [
  {
    template: '{{cityName}} Population Reaches {{population}} - Mayor Celebrates Growth',
    requiredContext: ['cityName', 'population'],
    qualityRange: { min: 0.6, max: 1.0 },
  },
  {
    template: 'Local Weather Forecast: {{weather}} Expected Through Week',
    requiredContext: ['weather'],
    qualityRange: { min: 0.4, max: 0.8 },
  },
  {
    template: 'Breaking: New Construction Project Announced in Downtown {{cityName}}',
    requiredContext: ['cityName'],
    qualityRange: { min: 0.7, max: 1.0 },
  },
  {
    template: 'City Council Debates Infrastructure Improvements',
    requiredContext: [],
    qualityRange: { min: 0.5, max: 0.9 },
  },
  {
    template: 'Local Business {{randomPlace}} Celebrates Grand Opening',
    requiredContext: ['randomPlace'],
    qualityRange: { min: 0.4, max: 0.7 },
  },
  {
    template: 'Opinion: Why {{cityName}} Needs Better Public Transit',
    requiredContext: ['cityName'],
    qualityRange: { min: 0.6, max: 0.9 },
  },
  {
    template: 'Community Spotlight: Meet {{randomName}}, Local Artisan',
    requiredContext: ['randomName'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
  {
    template: 'Market Report: Prices {{randomNumber}}% This Quarter',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.4, max: 0.7 },
  },
];

// ============================================================================
// TV SHOW EPISODE TEMPLATES
// ============================================================================

const TV_EPISODE_TEMPLATES: ContentTemplate[] = [
  {
    template: 'Episode: "The Mystery of {{randomPlace}}" - Drama unfolds in {{cityName}}',
    requiredContext: ['randomPlace', 'cityName'],
    qualityRange: { min: 0.7, max: 1.0 },
  },
  {
    template: 'Sitcom Special: "{{randomName}}\'s Big Day"',
    requiredContext: ['randomName'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
  {
    template: 'News Magazine: Investigating {{cityName}}\'s Growth',
    requiredContext: ['cityName'],
    qualityRange: { min: 0.6, max: 0.9 },
  },
  {
    template: 'Talk Show: Interview with {{randomName}}',
    requiredContext: ['randomName'],
    qualityRange: { min: 0.4, max: 0.7 },
  },
  {
    template: 'Documentary: Life in {{cityName}} - Population {{population}}',
    requiredContext: ['cityName', 'population'],
    qualityRange: { min: 0.7, max: 1.0 },
  },
];

// ============================================================================
// RADIO BROADCAST TEMPLATES
// ============================================================================

const RADIO_BROADCAST_TEMPLATES: ContentTemplate[] = [
  {
    template: 'Morning Show: {{agentName}} Plays Top Hits and Local News',
    requiredContext: ['agentName'],
    qualityRange: { min: 0.6, max: 0.9 },
  },
  {
    template: 'Drive Time: Traffic Report for {{cityName}} - {{weather}}',
    requiredContext: ['cityName', 'weather'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
  {
    template: 'Talk Radio: Callers Discuss {{cityName}}\'s Future',
    requiredContext: ['cityName'],
    qualityRange: { min: 0.4, max: 0.7 },
  },
  {
    template: 'Music Hour: {{agentName}} Spins Classic Tracks',
    requiredContext: ['agentName'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
  {
    template: 'News Update: {{population}} Residents Now Call {{cityName}} Home',
    requiredContext: ['population', 'cityName'],
    qualityRange: { min: 0.6, max: 0.9 },
  },
];

// ============================================================================
// SERVICE OUTPUT TEMPLATES
// ============================================================================

const SERVICE_TEMPLATES: ContentTemplate[] = [
  {
    template: 'Treated {{randomNumber}} patients with excellent care',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.7, max: 1.0 },
  },
  {
    template: 'Taught {{randomNumber}} students valuable lessons',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.6, max: 0.9 },
  },
  {
    template: 'Processed {{randomNumber}} administrative forms',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.4, max: 0.7 },
  },
  {
    template: 'Assisted {{randomNumber}} library patrons with research',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
  {
    template: 'Completed {{randomNumber}} shop transactions',
    requiredContext: ['randomNumber'],
    qualityRange: { min: 0.5, max: 0.8 },
  },
];

// ============================================================================
// TEMPLATE SELECTION
// ============================================================================

/**
 * Get templates for a profession role.
 */
export function getTemplatesForRole(role: ProfessionRole): ContentTemplate[] {
  switch (role) {
    case 'newspaper_reporter':
    case 'newspaper_editor':
      return NEWSPAPER_ARTICLE_TEMPLATES;

    case 'tv_actor':
    case 'tv_director':
    case 'tv_producer':
    case 'tv_writer':
      return TV_EPISODE_TEMPLATES;

    case 'radio_dj':
    case 'radio_producer':
      return RADIO_BROADCAST_TEMPLATES;

    case 'office_worker':
    case 'shopkeeper':
    case 'teacher':
    case 'librarian':
    case 'doctor':
    case 'nurse':
    case 'bureaucrat':
    case 'city_planner':
    case 'accountant':
    case 'generic_worker':
      return SERVICE_TEMPLATES;

    default:
      return SERVICE_TEMPLATES;
  }
}

/**
 * Select a random template appropriate for the quality level.
 */
export function selectTemplate(
  role: ProfessionRole,
  quality: number
): ContentTemplate | null {
  const templates = getTemplatesForRole(role);

  // Filter templates by quality range
  const suitable = templates.filter(
    (t) => quality >= t.qualityRange.min && quality <= t.qualityRange.max
  );

  if (suitable.length === 0) {
    // No suitable templates, pick any
    return templates[Math.floor(Math.random() * templates.length)] ?? null;
  }

  // Random from suitable templates
  return suitable[Math.floor(Math.random() * suitable.length)] ?? null;
}

/**
 * Fill template placeholders with context values.
 */
export function fillTemplate(
  template: ContentTemplate,
  context: TemplateContext
): string {
  let result = template.template;

  // Replace all {{placeholder}} with context values
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = context[key];
    if (value === undefined) {
      return `[missing:${key}]`; // Indicate missing context
    }
    return String(value);
  });

  return result;
}

/**
 * Generate random context values for common placeholders.
 */
export function generateRandomContext(partial: Partial<TemplateContext> = {}): TemplateContext {
  const randomNames = [
    'Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry',
    'Iris', 'Jack', 'Kate', 'Leo', 'Maya', 'Noah', 'Olivia', 'Peter',
  ];

  const randomPlaces = [
    'Market Square', 'Town Hall', 'Central Park', 'Main Street',
    'Riverside', 'Hilltop Plaza', 'Old Quarter', 'North District',
    'East End', 'Harbor Front', 'University Campus', 'Industrial Zone',
  ];

  const weatherOptions = [
    'Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Heavy Rain',
    'Clear Skies', 'Fog', 'Windy', 'Snow', 'Mild',
  ];

  return {
    randomName: randomNames[Math.floor(Math.random() * randomNames.length)],
    randomPlace: randomPlaces[Math.floor(Math.random() * randomPlaces.length)],
    weather: weatherOptions[Math.floor(Math.random() * weatherOptions.length)],
    randomNumber: Math.floor(Math.random() * 100) + 1,
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    ...partial, // Override with provided context
  };
}

/**
 * Generate content from template for a profession role and quality.
 */
export function generateProfessionContent(
  role: ProfessionRole,
  quality: number,
  context: Partial<TemplateContext> = {}
): string {
  const template = selectTemplate(role, quality);

  if (!template) {
    return `[No template available for ${role}]`;
  }

  const fullContext = generateRandomContext(context);
  return fillTemplate(template, fullContext);
}
