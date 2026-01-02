/**
 * SpiritComponent - ECS component for animist spirits (kami, nature spirits, ancestors)
 *
 * Spirits differ fundamentally from deities:
 * - Location/object bound rather than domain-based
 * - Non-anthropomorphic (often invisible or manifest as nature)
 * - Relationship-based rather than worship-based
 * - Require offerings and respect rather than belief/prayer
 * - Sensitive to pollution and improper behavior
 *
 * Based on the Spirit interface from divinity/AnimistTypes.ts
 */

import { ComponentBase } from '../ecs/Component.js';
import type {
  SpiritCategory,
  SpiritMagnitude,
  SpiritDisposition,
  DwellingType,
  SpiritObjectType,
  PhenomenonType,
  SpiritRange,
  InfluenceSphere,
  OfferingType,
  OfferingCategory,
} from '../divinity/AnimistTypes.js';

/**
 * Spirit naming information
 */
export interface SpiritNaming {
  /** Descriptive name based on location/object (e.g., "Spirit of the Old Oak") */
  descriptiveName: string;

  /** Given name if one was bestowed by mortals */
  givenName?: string;

  /** Title/honorific (e.g., "-sama", "-dono", "Great") */
  honorific?: string;

  /** Alternative names */
  alternateNames: string[];

  /** Is the true name known? (Knowing it grants power) */
  trueNameKnown: boolean;
  trueName?: string;
}

/**
 * Visual/perceptual manifestation of spirit
 */
export interface SpiritManifestation {
  /** How the spirit typically appears (if at all) */
  primaryForm: 'invisible' | 'natural_phenomenon' | 'animal' | 'humanoid' | 'hybrid' | 'abstract' | 'dwelling_animated' | 'orb' | 'shadow' | 'reflection';

  /** Can the spirit be seen by ordinary mortals? */
  visibilityLevel: 'invisible' | 'glimpsed' | 'visible' | 'obvious';

  /** Description of appearance when manifested */
  description: string;

  /** Signs of presence (rustling leaves, cold spots, etc.) */
  presenceSigns: string[];

  /** Can take animal form? */
  animalForms: string[];

  /** Sounds associated with spirit */
  soundSigns: string[];

  /** Size relative to natural dwelling */
  manifestedSize: 'tiny' | 'small' | 'natural' | 'large' | 'immense';
}

/**
 * Spirit offering preferences
 */
export interface SpiritOfferingPreferences {
  /** Preferred offering types */
  preferred: OfferingType[];

  /** Acceptable offerings */
  acceptable: OfferingType[];

  /** Offensive offerings (never give these) */
  forbidden: OfferingType[];

  /** Special offerings that greatly please spirit */
  special: OfferingType[];

  /** Value multiplier for different offering categories */
  valueMultipliers: Record<OfferingCategory, number>;
}

/**
 * What a spirit can affect
 */
export interface SpiritInfluence {
  /** Primary sphere of influence */
  primaryInfluence: InfluenceSphere;

  /** Secondary influences */
  secondaryInfluences: InfluenceSphere[];

  /** Geographic range of influence */
  range: SpiritRange;
}

/**
 * Disposition factors - how spirit feels toward mortals
 */
export interface SpiritDispositionState {
  /** Base disposition (innate nature) */
  baseDisposition: SpiritDisposition;

  /** Current disposition (can differ from base) */
  currentDisposition: SpiritDisposition;

  /** Accumulated respect from offerings (can be negative) */
  respectLevel: number;

  /** Has their dwelling been damaged? */
  dwellingDamaged: boolean;

  /** Has their area been polluted? */
  pollutionLevel: number;

  /** Have proper rituals been performed? */
  ritualDebt: number;

  /** Time since last acknowledgment */
  neglectDuration: number;
}

/**
 * SpiritComponent - ECS component for spirit entities
 *
 * Represents animist spirits (kami, nature spirits, ancestors) in the ECS.
 * Spirits are bound to locations/objects and require offerings rather than belief.
 */
export class SpiritComponent extends ComponentBase {
  public readonly type = 'spirit';

  // ========================================
  // Classification
  // ========================================
  public category: SpiritCategory;
  public magnitude: SpiritMagnitude;

  // ========================================
  // Identity
  // ========================================
  public naming: SpiritNaming;
  public manifestation: SpiritManifestation;

  // ========================================
  // Dwelling
  // ========================================
  /** Type of dwelling (if place/object spirit) */
  public dwellingType?: DwellingType;
  public objectType?: SpiritObjectType;
  public phenomenonType?: PhenomenonType;

  /** Location ID where spirit dwells */
  public dwellingLocationId?: string;

  /** Entity ID of object housing spirit */
  public dwellingObjectId?: string;

  /** Can spirit move from dwelling? */
  public mobile: boolean;

  /** Range spirit can travel from dwelling */
  public travelRange: SpiritRange;

  // ========================================
  // Disposition
  // ========================================
  public disposition: SpiritDispositionState;

  // ========================================
  // Influence
  // ========================================
  public influence: SpiritInfluence;

  // ========================================
  // Offerings
  // ========================================
  public offeringPreferences: SpiritOfferingPreferences;

  // ========================================
  // Relationships
  // ========================================
  /** IDs of entities with relationships to this spirit */
  public relationshipIds: string[];

  // ========================================
  // State
  // ========================================
  /** Accumulated respect (main "power" currency) */
  public totalRespect: number;

  /** Is spirit currently active/awake? */
  public isActive: boolean;

  /** Is spirit dormant? (long neglected) */
  public isDormant: boolean;

  /** Is spirit angry? */
  public isAngered: boolean;

  /** Is spirit fading from memory? */
  public isFading: boolean;

  /** When spirit came into being */
  public emergedAt: number;

  /** How spirit came to exist */
  public origin: 'primordial' | 'natural_formation' | 'mortal_death' | 'object_aging' | 'collective_belief' | 'divine_creation' | 'spirit_offspring' | 'event_echo';

  constructor(
    descriptiveName: string,
    category: SpiritCategory = 'place_spirit',
    magnitude: SpiritMagnitude = 'minor'
  ) {
    super();

    this.category = category;
    this.magnitude = magnitude;

    this.naming = {
      descriptiveName,
      alternateNames: [],
      trueNameKnown: false,
    };

    this.manifestation = {
      primaryForm: 'invisible',
      visibilityLevel: 'invisible',
      description: 'An unseen presence',
      presenceSigns: [],
      animalForms: [],
      soundSigns: [],
      manifestedSize: 'natural',
    };

    this.mobile = false;
    this.travelRange = 'immediate';

    this.disposition = {
      baseDisposition: 'indifferent',
      currentDisposition: 'indifferent',
      respectLevel: 0,
      dwellingDamaged: false,
      pollutionLevel: 0,
      ritualDebt: 0,
      neglectDuration: 0,
    };

    this.influence = {
      primaryInfluence: 'protection',
      secondaryInfluences: [],
      range: 'immediate',
    };

    this.offeringPreferences = {
      preferred: ['rice', 'sake', 'flowers'],
      acceptable: ['water', 'incense', 'fruit'],
      forbidden: [],
      special: [],
      valueMultipliers: {
        food: 1.0,
        drink: 1.0,
        material: 0.8,
        craft: 1.2,
        service: 1.5,
        performance: 1.3,
        living: 2.0,
      },
    };

    this.relationshipIds = [];
    this.totalRespect = 0;
    this.isActive = true;
    this.isDormant = false;
    this.isAngered = false;
    this.isFading = false;
    this.emergedAt = Date.now();
    this.origin = 'natural_formation';
  }
}

/**
 * Helper: Create a place spirit component
 */
export function createPlaceSpiritComponent(
  name: string,
  dwellingType: DwellingType,
  locationId: string
): SpiritComponent {
  const spirit = new SpiritComponent(name, 'place_spirit', 'minor');
  spirit.dwellingType = dwellingType;
  spirit.dwellingLocationId = locationId;
  spirit.mobile = false;
  spirit.travelRange = 'local';
  spirit.disposition.baseDisposition = 'territorial';
  spirit.disposition.currentDisposition = 'territorial';
  return spirit;
}

/**
 * Helper: Create an ancestor spirit component
 */
export function createAncestorSpiritComponent(
  deceasedName: string
): SpiritComponent {
  const spirit = new SpiritComponent(`Spirit of ${deceasedName}`, 'ancestor_spirit', 'minor');
  spirit.naming.givenName = deceasedName;
  spirit.naming.trueNameKnown = true;
  spirit.naming.trueName = deceasedName;
  spirit.mobile = true;
  spirit.travelRange = 'local';
  spirit.disposition.baseDisposition = 'benign';
  spirit.disposition.currentDisposition = 'benign';
  spirit.origin = 'mortal_death';
  spirit.manifestation = {
    primaryForm: 'invisible',
    visibilityLevel: 'glimpsed',
    description: 'A familiar presence',
    presenceSigns: ['feeling of being watched', 'familiar scent'],
    animalForms: [],
    soundSigns: ['whispered voice'],
    manifestedSize: 'natural',
  };
  spirit.influence.primaryInfluence = 'household_fortune';
  spirit.offeringPreferences = {
    preferred: ['prepared_food', 'sake', 'incense'],
    acceptable: ['rice', 'flowers', 'water'],
    forbidden: [],
    special: ['story'],
    valueMultipliers: {
      food: 1.5,
      drink: 1.2,
      material: 0.8,
      craft: 1.0,
      service: 1.0,
      performance: 1.5,
      living: 1.0,
    },
  };
  return spirit;
}

/**
 * Helper: Create an object spirit (tsukumogami) component
 */
export function createObjectSpiritComponent(
  objectType: SpiritObjectType,
  objectId: string,
  objectAge: number
): SpiritComponent {
  const spirit = new SpiritComponent(`Spirit of the ${objectType.replace('_', ' ')}`, 'object_spirit', 'minor');
  spirit.objectType = objectType;
  spirit.dwellingObjectId = objectId;
  spirit.mobile = false;
  spirit.travelRange = 'immediate';
  spirit.origin = 'object_aging';
  spirit.totalRespect = Math.floor(objectAge / 10); // Age grants starting respect

  // Older objects have more personality
  const disposition: SpiritDisposition =
    objectAge >= 100 ? 'playful' : objectAge >= 50 ? 'curious' : 'shy';
  spirit.disposition.baseDisposition = disposition;
  spirit.disposition.currentDisposition = disposition;

  spirit.manifestation = {
    primaryForm: 'dwelling_animated',
    visibilityLevel: 'glimpsed',
    description: 'The object seems to move on its own',
    presenceSigns: ['object shifts position', 'object makes sounds'],
    animalForms: [],
    soundSigns: ['creaking', 'tapping'],
    manifestedSize: 'natural',
  };

  return spirit;
}
