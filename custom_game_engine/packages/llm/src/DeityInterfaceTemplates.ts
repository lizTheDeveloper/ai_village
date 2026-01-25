/**
 * Deity Interface Templates
 *
 * Playful AI god communication interfaces - how emergent deities interact with mortals.
 * Blends Cosmic Pragmatist + Baroque Encyclopedist + Humane Satirist.
 *
 * Each deity gets a unique "interface" - think of it as their divine UI/UX for mortal interaction.
 */

import deityTemplatesData from '../data/deity-interface-templates.json';

export interface DeityInterfaceConfig {
  benevolence: number;
  interventionism: number;
  mysteriousness: number;
  wrathfulness: number;
  voiceStyle: string;
  verbosity: string;
  formality: string;
}

interface InterfaceTemplate {
  primaryInterface: string;
  quirks: string[];
  errorHandling: string;
  successPattern: string;
}

/**
 * Type definition for the deity-interface-templates.json structure
 */
interface DeityTemplatesData {
  interfaces: {
    cosmic_help_desk: InterfaceTemplate;
    inscrutable_oracle: InterfaceTemplate;
    wrathful_firewall: InterfaceTemplate;
    chaos_randomizer: InterfaceTemplate;
    distant_observer: InterfaceTemplate;
    bureaucratic_administrator: InterfaceTemplate;
    glitchy_beta: InterfaceTemplate;
  };
  voiceStyles: Record<string, string>;
  verbosityLevels: Record<string, string>;
  formalityLevels: Record<string, string>;
}

/**
 * Generate a playful deity interface description.
 * This describes HOW the god communicates, not just WHAT they say.
 * Loaded from ../data/deity-interface-templates.json
 */
export function generateDeityInterface(config: DeityInterfaceConfig): string {
  const interfaces = getInterfaceTemplates(config);

  let description = `\n## Your Divine Interface\n\n`;
  description += `The cosmos didn't come with a user manual for godhood. You've had to improvise your own divine UI/UX, with predictably interesting results.\n\n`;

  // Core interface style
  description += interfaces.primaryInterface + '\n\n';

  // Communication quirks
  if (interfaces.quirks.length > 0) {
    description += `**Interface Quirks:**\n`;
    interfaces.quirks.forEach(quirk => {
      description += `- ${quirk}\n`;
    });
    description += '\n';
  }

  // Error messages (what happens when things go wrong)
  description += `**When Things Go Wrong:**\n${interfaces.errorHandling}\n\n`;

  // Success messages (what happens when prayers work)
  description += `**When Things Go Right:**\n${interfaces.successPattern}\n\n`;

  return description;
}

function getInterfaceTemplates(config: DeityInterfaceConfig): InterfaceTemplate {
  const { benevolence, interventionism, mysteriousness, wrathfulness } = config;
  const data = (deityTemplatesData as DeityTemplatesData).interfaces;

  // THE COSMIC HELP DESK (high interventionism + high benevolence)
  if (interventionism > 0.5 && benevolence > 0.5) {
    return data.cosmic_help_desk;
  }

  // THE INSCRUTABLE ORACLE (high mysteriousness + low interventionism)
  if (mysteriousness > 0.7 && interventionism < 0) {
    return data.inscrutable_oracle;
  }

  // THE WRATHFUL FIREWALL (high wrathfulness + low benevolence)
  if (wrathfulness > 0.7 && benevolence < 0) {
    return data.wrathful_firewall;
  }

  // THE CHAOS RANDOMIZER (low consistency + high interventionism)
  if (benevolence < 0.3 && interventionism > 0.5) {
    return data.chaos_randomizer;
  }

  // THE DISTANT OBSERVER (low interventionism + moderate benevolence)
  if (interventionism < -0.5 && benevolence > -0.3) {
    return data.distant_observer;
  }

  // THE BUREAUCRATIC ADMINISTRATOR (moderate all traits)
  if (Math.abs(benevolence) < 0.3 && Math.abs(interventionism) < 0.3) {
    return data.bureaucratic_administrator;
  }

  // DEFAULT: THE GLITCHY BETA (new god, still figuring it out)
  return data.glitchy_beta;
}

/**
 * Generate deity voice characteristics based on interface.
 * This describes the "tone" of divine communication.
 * Loaded from ../data/deity-interface-templates.json
 */
export function generateVoiceCharacterization(config: DeityInterfaceConfig): string {
  const { voiceStyle, verbosity, formality } = config;
  const data = deityTemplatesData as DeityTemplatesData;

  const styleDescriptions: Record<string, string> = data.voiceStyles;
  const verbosityDescriptions: Record<string, string> = data.verbosityLevels;
  const formalityDescriptions: Record<string, string> = data.formalityLevels;

  let description = `\n## Your Voice\n\n`;
  description += `**Style:** ${styleDescriptions[voiceStyle] || styleDescriptions.direct}\n\n`;
  description += `**Verbosity:** ${verbosityDescriptions[verbosity] || verbosityDescriptions.moderate}\n\n`;
  description += `**Formality:** ${formalityDescriptions[formality] || formalityDescriptions.formal}\n\n`;
  description += `When you speak to mortals, these characteristics blend into your unique divine voice. Think of it as your brand—the linguistic fingerprint that makes your pronouncements distinctly yours.\n`;

  return description;
}
