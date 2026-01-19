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
 * Templates are now loaded from JSON data files to separate
 * content from code structure.
 *
 * Usage:
 *   const template = selectTemplate('newspaper_reporter', 'article', quality);
 *   const content = fillTemplate(template, context);
 */

import type { ProfessionRole } from '../components/ProfessionComponent.js';
import professionTemplatesData from '../../data/profession-templates.json';

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
// Template Data Loading
// ============================================================================

const data = professionTemplatesData as {
  newspaper_article_templates: ContentTemplate[];
  tv_episode_templates: ContentTemplate[];
  radio_broadcast_templates: ContentTemplate[];
  service_templates: ContentTemplate[];
};

const NEWSPAPER_ARTICLE_TEMPLATES: ContentTemplate[] = data.newspaper_article_templates;
const TV_EPISODE_TEMPLATES: ContentTemplate[] = data.tv_episode_templates;
const RADIO_BROADCAST_TEMPLATES: ContentTemplate[] = data.radio_broadcast_templates;
const SERVICE_TEMPLATES: ContentTemplate[] = data.service_templates;

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
