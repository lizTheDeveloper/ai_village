/**
 * Voice Mode Implementations
 *
 * Each voice mode transforms entity/action data into prose with a distinct style.
 * - Live: Present tense, immediate, factual
 * - Chronicle: Past tense, historical, formal
 * - Bardic: Epic/poetic, embellished, dramatic
 * - Reporter: News-style, objective, third person
 */

import type { VoiceMode, EntityDescriptionContext } from './types.js';

// ============================================================================
// Voice Mode Interface
// ============================================================================

/**
 * A voice mode transformer converts raw data into styled prose.
 */
export interface VoiceTransformer {
  /** Transform entity description */
  describeEntity(ctx: EntityDescriptionContext): string;

  /** Transform action/event */
  describeAction(actor: string, action: string, target?: string): string;

  /** Generate scene opening */
  openScene(location: string, timeDesc?: string): string;

  /** Transform terrain description */
  describeTerrain(rawTerrain: string): string;

  /** Transform weather/ambience */
  describeAmbience(weather?: string, timeOfDay?: number, season?: string): string;

  /** Describe distance/direction */
  describeLocation(direction: string | null, distance: string): string;
}

// ============================================================================
// Live Mode (Present Tense, Factual)
// ============================================================================

export const LiveVoice: VoiceTransformer = {
  describeEntity(ctx: EntityDescriptionContext): string {
    const { name, entityType, behavior, buildingType, isComplete, progress, resourceType, species, growthStage, animalSpecies, animalState, recentSpeech } = ctx;

    switch (entityType) {
      case 'agent': {
        let desc = name;
        if (behavior) {
          desc += ` (${formatBehaviorLive(behavior)})`;
        }
        if (recentSpeech) {
          desc += ` - says: "${recentSpeech}"`;
        }
        return desc;
      }

      case 'building': {
        const type = buildingType || 'structure';
        if (isComplete) {
          return `a ${type}`;
        }
        const pct = progress ? Math.round(progress * 100) : 0;
        return `a ${type} (under construction, ${pct}%)`;
      }

      case 'resource': {
        return resourceType || 'resource';
      }

      case 'plant': {
        const plantName = species?.replace(/-/g, ' ') || 'plant';
        if (growthStage && growthStage !== 'mature') {
          return `${plantName} (${growthStage})`;
        }
        return plantName;
      }

      case 'animal': {
        const animal = animalSpecies || 'animal';
        if (animalState) {
          return `${animal} (${animalState})`;
        }
        return animal;
      }

      default:
        return name || 'something';
    }
  },

  describeAction(actor: string, action: string, target?: string): string {
    const verb = formatActionVerbLive(action);
    if (target) {
      return `${actor} ${verb} ${target}`;
    }
    return `${actor} ${verb}`;
  },

  openScene(location: string, timeDesc?: string): string {
    if (timeDesc) {
      return `${timeDesc}. You are in ${location}.`;
    }
    return `You are in ${location}.`;
  },

  describeTerrain(rawTerrain: string): string {
    // Raw terrain from TerrainFeatureAnalyzer is already formatted
    // Just clean it up for live mode
    if (!rawTerrain || rawTerrain.toLowerCase().includes('unremarkable')) {
      return '';
    }
    return rawTerrain;
  },

  describeAmbience(weather?: string, timeOfDay?: number, season?: string): string {
    const parts: string[] = [];

    if (timeOfDay !== undefined) {
      parts.push(getTimeOfDayDescription(timeOfDay));
    }

    if (weather) {
      parts.push(weather);
    }

    if (season) {
      parts.push(`It is ${season}`);
    }

    return parts.join('. ');
  },

  describeLocation(direction: string | null, distance: string): string {
    if (direction) {
      return `to the ${direction}`;
    }
    switch (distance) {
      case 'immediate': return 'right here';
      case 'close': return 'nearby';
      case 'area': return 'in the area';
      case 'distant': return 'in the distance';
      default: return 'nearby';
    }
  },
};

// ============================================================================
// Chronicle Mode (Past Tense, Historical)
// ============================================================================

export const ChronicleVoice: VoiceTransformer = {
  describeEntity(ctx: EntityDescriptionContext): string {
    const { name, entityType, behavior, buildingType, isComplete, resourceType, species, animalSpecies, animalState } = ctx;

    switch (entityType) {
      case 'agent': {
        let desc = name;
        if (behavior) {
          desc += `, who ${formatBehaviorChronicle(behavior)}`;
        }
        return desc;
      }

      case 'building': {
        const type = buildingType || 'structure';
        if (isComplete) {
          return `a ${type} that stood`;
        }
        return `an unfinished ${type}`;
      }

      case 'resource': {
        return `stores of ${resourceType || 'resources'}`;
      }

      case 'plant': {
        const plantName = species?.replace(/-/g, ' ') || 'vegetation';
        return `${plantName} that grew there`;
      }

      case 'animal': {
        const animal = animalSpecies || 'creature';
        if (animalState === 'grazing') {
          return `a ${animal} that grazed peacefully`;
        }
        return `a ${animal}`;
      }

      default:
        return name || 'something';
    }
  },

  describeAction(actor: string, action: string, target?: string): string {
    const verb = formatActionVerbChronicle(action);
    if (target) {
      return `${actor} ${verb} ${target}`;
    }
    return `${actor} ${verb}`;
  },

  openScene(location: string, timeDesc?: string): string {
    if (timeDesc) {
      return `It was ${timeDesc} in ${location}.`;
    }
    return `In ${location}, the day unfolded.`;
  },

  describeTerrain(rawTerrain: string): string {
    if (!rawTerrain || rawTerrain.toLowerCase().includes('unremarkable')) {
      return 'The land was unremarkable.';
    }
    // Transform to past tense descriptive
    return `The terrain revealed ${rawTerrain.toLowerCase()}.`;
  },

  describeAmbience(weather?: string, timeOfDay?: number, season?: string): string {
    const parts: string[] = [];

    if (season) {
      parts.push(`It was ${season}`);
    }

    if (timeOfDay !== undefined) {
      parts.push(getTimeOfDayDescriptionChronicle(timeOfDay));
    }

    if (weather) {
      parts.push(`The weather was ${weather.toLowerCase()}`);
    }

    return parts.join('. ');
  },

  describeLocation(direction: string | null, distance: string): string {
    if (direction) {
      return `to the ${direction}`;
    }
    switch (distance) {
      case 'immediate': return 'at hand';
      case 'close': return 'nearby';
      case 'area': return 'in the vicinity';
      case 'distant': return 'on the horizon';
      default: return 'nearby';
    }
  },
};

// ============================================================================
// Bardic Mode (Epic, Poetic)
// ============================================================================

export const BardicVoice: VoiceTransformer = {
  describeEntity(ctx: EntityDescriptionContext): string {
    const { name, entityType, behavior, buildingType, isComplete, resourceType, species, animalSpecies, animalState, health } = ctx;

    switch (entityType) {
      case 'agent': {
        const epithet = getBardicEpithet(name);
        let desc = epithet;
        if (behavior) {
          desc += `, ${formatBehaviorBardic(behavior)}`;
        }
        if (health !== undefined && health < 0.3) {
          desc += ', wounded yet unbowed';
        }
        return desc;
      }

      case 'building': {
        const type = buildingType || 'edifice';
        if (isComplete) {
          return `the mighty ${type}`;
        }
        return `a ${type} rising from the earth`;
      }

      case 'resource': {
        const resource = resourceType || 'bounty';
        return `nature's ${resource}`;
      }

      case 'plant': {
        const plantName = species?.replace(/-/g, ' ') || 'flora';
        return `the ${plantName}, gift of the earth`;
      }

      case 'animal': {
        const animal = animalSpecies || 'beast';
        if (animalState === 'hunting') {
          return `the fierce ${animal}, on the prowl`;
        }
        return `a wild ${animal}`;
      }

      default:
        return name || 'a mystery';
    }
  },

  describeAction(actor: string, action: string, target?: string): string {
    const verb = formatActionVerbBardic(action);
    if (target) {
      return `${actor} did ${verb} ${target}`;
    }
    return `${actor} did ${verb}`;
  },

  openScene(location: string, timeDesc?: string): string {
    if (timeDesc) {
      return `Hear now! ${timeDesc}, in the realm of ${location}...`;
    }
    return `Gather 'round, and hear tell of ${location}!`;
  },

  describeTerrain(rawTerrain: string): string {
    if (!rawTerrain || rawTerrain.toLowerCase().includes('unremarkable')) {
      return 'The land stretched forth, humble yet proud.';
    }
    return `The earth revealed her secrets: ${rawTerrain.toLowerCase()}.`;
  },

  describeAmbience(weather?: string, timeOfDay?: number, season?: string): string {
    const parts: string[] = [];

    if (season) {
      parts.push(`'Twas the season of ${season}`);
    }

    if (timeOfDay !== undefined) {
      parts.push(getTimeOfDayDescriptionBardic(timeOfDay));
    }

    if (weather) {
      parts.push(`The heavens bestowed ${weather.toLowerCase()}`);
    }

    return parts.join('. ');
  },

  describeLocation(direction: string | null, distance: string): string {
    if (direction) {
      return `toward the ${direction}`;
    }
    switch (distance) {
      case 'immediate': return 'within arm\'s reach';
      case 'close': return 'a stone\'s throw hence';
      case 'area': return 'in the surrounding lands';
      case 'distant': return 'upon the far horizon';
      default: return 'nearby';
    }
  },
};

// ============================================================================
// Reporter Mode (News Style, Objective)
// ============================================================================

export const ReporterVoice: VoiceTransformer = {
  describeEntity(ctx: EntityDescriptionContext): string {
    const { name, entityType, behavior, buildingType, isComplete, progress, resourceType, species, animalSpecies, animalState } = ctx;

    switch (entityType) {
      case 'agent': {
        let desc = `Resident ${name}`;
        if (behavior) {
          desc += ` was observed ${formatBehaviorReporter(behavior)}`;
        }
        return desc;
      }

      case 'building': {
        const type = buildingType || 'structure';
        if (isComplete) {
          return `${type} (operational)`;
        }
        const pct = progress ? Math.round(progress * 100) : 0;
        return `${type} (${pct}% complete)`;
      }

      case 'resource': {
        return `${resourceType || 'resource'} deposit`;
      }

      case 'plant': {
        const plantName = species?.replace(/-/g, ' ') || 'vegetation';
        return `${plantName} growth`;
      }

      case 'animal': {
        const animal = animalSpecies || 'wildlife';
        if (animalState) {
          return `${animal} (${animalState})`;
        }
        return `${animal} sighting`;
      }

      default:
        return name || 'unidentified object';
    }
  },

  describeAction(actor: string, action: string, target?: string): string {
    const verb = formatActionVerbReporter(action);
    if (target) {
      return `${actor} ${verb} ${target}`;
    }
    return `${actor} ${verb}`;
  },

  openScene(location: string, timeDesc?: string): string {
    if (timeDesc) {
      return `${timeDesc} - Reporting from ${location}:`;
    }
    return `Location: ${location}. Status report follows.`;
  },

  describeTerrain(rawTerrain: string): string {
    if (!rawTerrain || rawTerrain.toLowerCase().includes('unremarkable')) {
      return 'Terrain: Standard.';
    }
    return `Terrain analysis: ${rawTerrain}.`;
  },

  describeAmbience(weather?: string, timeOfDay?: number, season?: string): string {
    const parts: string[] = [];

    if (season) {
      parts.push(`Season: ${season}`);
    }

    if (timeOfDay !== undefined) {
      parts.push(`Time: ${getTimeOfDayDescriptionReporter(timeOfDay)}`);
    }

    if (weather) {
      parts.push(`Weather: ${weather}`);
    }

    return parts.join('. ');
  },

  describeLocation(direction: string | null, distance: string): string {
    if (direction) {
      return `${direction} sector`;
    }
    switch (distance) {
      case 'immediate': return 'immediate vicinity';
      case 'close': return 'close proximity';
      case 'area': return 'general area';
      case 'distant': return 'far perimeter';
      default: return 'nearby';
    }
  },
};

// ============================================================================
// Voice Mode Registry
// ============================================================================

export const VOICE_TRANSFORMERS: Record<VoiceMode, VoiceTransformer> = {
  live: LiveVoice,
  chronicle: ChronicleVoice,
  bardic: BardicVoice,
  reporter: ReporterVoice,
};

export function getVoiceTransformer(mode: VoiceMode): VoiceTransformer {
  return VOICE_TRANSFORMERS[mode];
}

// ============================================================================
// Helper Functions - Behavior Formatting
// ============================================================================

function formatBehaviorLive(behavior: string): string {
  switch (behavior) {
    case 'wander': return 'wandering';
    case 'idle': return 'resting';
    case 'gather': return 'gathering resources';
    case 'seek_food': return 'looking for food';
    case 'talk': return 'talking';
    case 'follow_agent': return 'following someone';
    case 'build': return 'building';
    case 'deposit_items': return 'storing items';
    case 'seek_sleep':
    case 'forced_sleep': return 'sleeping';
    case 'hunt': return 'hunting';
    case 'flee': return 'fleeing';
    case 'craft': return 'crafting';
    case 'eat': return 'eating';
    default: return behavior.replace(/_/g, ' ');
  }
}

function formatBehaviorChronicle(behavior: string): string {
  switch (behavior) {
    case 'wander': return 'wandered the land';
    case 'idle': return 'took rest';
    case 'gather': return 'gathered provisions';
    case 'seek_food': return 'sought sustenance';
    case 'talk': return 'conversed';
    case 'follow_agent': return 'followed a companion';
    case 'build': return 'labored in construction';
    case 'deposit_items': return 'stored supplies';
    case 'seek_sleep':
    case 'forced_sleep': return 'slumbered';
    case 'hunt': return 'hunted prey';
    case 'flee': return 'fled in haste';
    case 'craft': return 'practiced their craft';
    case 'eat': return 'partook of food';
    default: return `engaged in ${behavior.replace(/_/g, ' ')}`;
  }
}

function formatBehaviorBardic(behavior: string): string {
  switch (behavior) {
    case 'wander': return 'whose feet knew every path';
    case 'idle': return 'at peace with the world';
    case 'gather': return 'harvesting nature\'s bounty';
    case 'seek_food': return 'in pursuit of sustenance';
    case 'talk': return 'sharing words of wisdom';
    case 'follow_agent': return 'loyal companion true';
    case 'build': return 'raising monuments to labor';
    case 'deposit_items': return 'securing the village\'s wealth';
    case 'seek_sleep':
    case 'forced_sleep': return 'surrendered to dreams';
    case 'hunt': return 'stalking prey with cunning';
    case 'flee': return 'swift as the wind in retreat';
    case 'craft': return 'weaving wonders with skilled hands';
    case 'eat': return 'savoring life\'s simple gifts';
    default: return behavior.replace(/_/g, ' ');
  }
}

function formatBehaviorReporter(behavior: string): string {
  switch (behavior) {
    case 'wander': return 'patrolling the area';
    case 'idle': return 'on standby';
    case 'gather': return 'collecting resources';
    case 'seek_food': return 'foraging';
    case 'talk': return 'in communication';
    case 'follow_agent': return 'in escort formation';
    case 'build': return 'engaged in construction';
    case 'deposit_items': return 'conducting inventory transfer';
    case 'seek_sleep':
    case 'forced_sleep': return 'in rest state';
    case 'hunt': return 'conducting hunting operation';
    case 'flee': return 'executing tactical retreat';
    case 'craft': return 'in production mode';
    case 'eat': return 'consuming rations';
    default: return behavior.replace(/_/g, ' ');
  }
}

// ============================================================================
// Helper Functions - Action Verbs
// ============================================================================

function formatActionVerbLive(action: string): string {
  switch (action) {
    case 'pick': return 'picks';
    case 'gather': return 'gathers';
    case 'build': return 'builds';
    case 'place': return 'places';
    case 'eat': return 'eats';
    case 'talk': return 'speaks to';
    case 'craft': return 'crafts';
    case 'store': return 'stores';
    case 'attack': return 'attacks';
    case 'heal': return 'heals';
    default: return action.replace(/_/g, ' ') + 's';
  }
}

function formatActionVerbChronicle(action: string): string {
  switch (action) {
    case 'pick': return 'picked';
    case 'gather': return 'gathered';
    case 'build': return 'constructed';
    case 'place': return 'placed';
    case 'eat': return 'consumed';
    case 'talk': return 'spoke to';
    case 'craft': return 'crafted';
    case 'store': return 'stored';
    case 'attack': return 'struck';
    case 'heal': return 'mended';
    default: return action.replace(/_/g, ' ') + 'ed';
  }
}

function formatActionVerbBardic(action: string): string {
  switch (action) {
    case 'pick': return 'harvest';
    case 'gather': return 'claim';
    case 'build': return 'raise';
    case 'place': return 'set forth';
    case 'eat': return 'partake of';
    case 'talk': return 'share words with';
    case 'craft': return 'forge';
    case 'store': return 'secure';
    case 'attack': return 'smite';
    case 'heal': return 'mend the wounds of';
    default: return action.replace(/_/g, ' ');
  }
}

function formatActionVerbReporter(action: string): string {
  switch (action) {
    case 'pick': return 'harvested';
    case 'gather': return 'collected';
    case 'build': return 'constructed';
    case 'place': return 'deployed';
    case 'eat': return 'consumed';
    case 'talk': return 'communicated with';
    case 'craft': return 'produced';
    case 'store': return 'transferred to storage';
    case 'attack': return 'engaged';
    case 'heal': return 'administered aid to';
    default: return action.replace(/_/g, ' ');
  }
}

// ============================================================================
// Helper Functions - Time of Day
// ============================================================================

function getTimeOfDayDescription(timeOfDay: number): string {
  if (timeOfDay < 0.2) return 'It is night';
  if (timeOfDay < 0.3) return 'Dawn breaks';
  if (timeOfDay < 0.4) return 'It is early morning';
  if (timeOfDay < 0.5) return 'It is late morning';
  if (timeOfDay < 0.6) return 'It is midday';
  if (timeOfDay < 0.7) return 'It is afternoon';
  if (timeOfDay < 0.8) return 'It is late afternoon';
  if (timeOfDay < 0.9) return 'Dusk falls';
  return 'It is night';
}

function getTimeOfDayDescriptionChronicle(timeOfDay: number): string {
  if (timeOfDay < 0.2) return 'The night was dark';
  if (timeOfDay < 0.3) return 'As dawn broke';
  if (timeOfDay < 0.4) return 'In the early morn';
  if (timeOfDay < 0.5) return 'As morning wore on';
  if (timeOfDay < 0.6) return 'At the height of day';
  if (timeOfDay < 0.7) return 'In the afternoon';
  if (timeOfDay < 0.8) return 'As day waned';
  if (timeOfDay < 0.9) return 'As dusk fell';
  return 'When night descended';
}

function getTimeOfDayDescriptionBardic(timeOfDay: number): string {
  if (timeOfDay < 0.2) return 'When darkness held dominion';
  if (timeOfDay < 0.3) return 'When rosy-fingered dawn awakened';
  if (timeOfDay < 0.4) return 'As the young sun climbed';
  if (timeOfDay < 0.5) return 'Ere the sun reached its zenith';
  if (timeOfDay < 0.6) return 'When Sol rode highest';
  if (timeOfDay < 0.7) return 'As shadows began to stretch';
  if (timeOfDay < 0.8) return 'In the golden hour';
  if (timeOfDay < 0.9) return 'When twilight painted the sky';
  return 'Under the stars\' ancient watch';
}

function getTimeOfDayDescriptionReporter(timeOfDay: number): string {
  if (timeOfDay < 0.2) return 'Night hours (00:00-04:00)';
  if (timeOfDay < 0.3) return 'Dawn (04:00-06:00)';
  if (timeOfDay < 0.4) return 'Early morning (06:00-09:00)';
  if (timeOfDay < 0.5) return 'Morning (09:00-12:00)';
  if (timeOfDay < 0.6) return 'Midday (12:00-14:00)';
  if (timeOfDay < 0.7) return 'Afternoon (14:00-17:00)';
  if (timeOfDay < 0.8) return 'Late afternoon (17:00-19:00)';
  if (timeOfDay < 0.9) return 'Dusk (19:00-21:00)';
  return 'Night (21:00-00:00)';
}

// ============================================================================
// Helper Functions - Bardic Epithets
// ============================================================================

const BARDIC_EPITHETS: string[] = [
  'the Bold',
  'the Wise',
  'the Swift',
  'the Steadfast',
  'the Cunning',
  'the Brave',
  'the True',
  'the Fair',
  'the Keen',
  'the Valiant',
];

function getBardicEpithet(name: string): string {
  // Use name hash to consistently assign epithet
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % BARDIC_EPITHETS.length;
  return `${name} ${BARDIC_EPITHETS[index]}`;
}
