#!/usr/bin/env tsx
/**
 * Summonable Entity Validator
 *
 * Validates summonable entity definitions for:
 * - Required fields
 * - Valid entity categories and ranks
 * - Personality validation
 * - Demand validation
 * - Service validation
 * - Contract validation
 * - Appearance validation
 */

export interface ValidationError {
  file: string;
  entityId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class SummonableEntityValidator {
  private errors: ValidationError[] = [];

  validate(entity: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(entity, fileName, 'id');
    this.validateRequired(entity, fileName, 'name');
    this.validateRequired(entity, fileName, 'category');
    this.validateRequired(entity, fileName, 'rank');
    this.validateRequired(entity, fileName, 'description');
    this.validateRequired(entity, fileName, 'personality');
    this.validateRequired(entity, fileName, 'demands');

    // Category validation
    const validCategories = [
      'demon', 'devil', 'angel', 'spirit', 'fey', 'djinn',
      'psychopomp', 'outsider', 'servitor'
    ];
    if (entity.category && !validCategories.includes(entity.category)) {
      this.addError(fileName, entity.id, 'category',
        `Invalid category: ${entity.category}`, 'error');
    }

    // Rank validation
    const validRanks = [
      'lesser', 'common', 'greater', 'noble', 'prince', 'archetype'
    ];
    if (entity.rank && !validRanks.includes(entity.rank)) {
      this.addError(fileName, entity.id, 'rank',
        `Invalid rank: ${entity.rank}`, 'error');
    }

    // Power level validation
    if (entity.powerLevel !== undefined) {
      if (typeof entity.powerLevel !== 'number' || entity.powerLevel < 0 || entity.powerLevel > 100) {
        this.addError(fileName, entity.id, 'powerLevel',
          `Invalid powerLevel: ${entity.powerLevel} (must be 0-100)`, 'error');
      }
    }

    // Personality validation
    if (entity.personality) {
      this.validatePersonality(entity, fileName);
    }

    // Demands validation
    if (entity.demands) {
      this.validateDemands(entity, fileName);
    }

    // Negotiation style validation
    if (entity.negotiationStyle) {
      this.validateNegotiationStyle(entity, fileName);
    }

    // Services validation
    if (entity.services) {
      this.validateServices(entity, fileName);
    } else {
      this.addError(fileName, entity.id, 'services',
        'Entity should specify at least one service', 'warning');
    }

    // Contract types validation
    if (entity.contractTypes) {
      this.validateContractTypes(entity, fileName);
    }

    // Appearance validation
    if (entity.appearance) {
      this.validateAppearance(entity, fileName);
    }

    // Summoning requirements validation
    if (entity.summoningRequirements) {
      this.validateSummoningRequirements(entity, fileName);
    }

    // Breach consequences validation
    if (entity.breachConsequences) {
      this.validateBreachConsequences(entity, fileName);
    }

    return this.errors;
  }

  private validatePersonality(entity: any, fileName: string) {
    const validMortalAttitudes = ['contemptuous', 'curious', 'predatory', 'protective', 'indifferent', 'envious'];
    const validHonesty = ['truthful', 'misleading', 'deceptive', 'literalist', 'compulsive_liar'];
    const validPatience = ['eternal', 'patient', 'impatient', 'volatile'];
    const validHumor = ['cruel', 'dark', 'whimsical', 'dry', 'none', 'inappropriate'];
    const validMotivation = ['power', 'knowledge', 'chaos', 'order', 'entertainment', 'freedom', 'revenge', 'duty'];
    const validVoice = ['formal', 'casual', 'archaic', 'cryptic', 'verbose', 'laconic', 'poetic'];

    if (entity.personality.mortalAttitude && !validMortalAttitudes.includes(entity.personality.mortalAttitude)) {
      this.addError(fileName, entity.id, 'personality.mortalAttitude',
        `Invalid mortalAttitude: ${entity.personality.mortalAttitude}`, 'error');
    }

    if (entity.personality.honesty && !validHonesty.includes(entity.personality.honesty)) {
      this.addError(fileName, entity.id, 'personality.honesty',
        `Invalid honesty: ${entity.personality.honesty}`, 'error');
    }

    if (entity.personality.patience && !validPatience.includes(entity.personality.patience)) {
      this.addError(fileName, entity.id, 'personality.patience',
        `Invalid patience: ${entity.personality.patience}`, 'error');
    }

    if (entity.personality.humor && !validHumor.includes(entity.personality.humor)) {
      this.addError(fileName, entity.id, 'personality.humor',
        `Invalid humor: ${entity.personality.humor}`, 'error');
    }

    if (entity.personality.motivation && !validMotivation.includes(entity.personality.motivation)) {
      this.addError(fileName, entity.id, 'personality.motivation',
        `Invalid motivation: ${entity.personality.motivation}`, 'error');
    }

    if (entity.personality.voice && !validVoice.includes(entity.personality.voice)) {
      this.addError(fileName, entity.id, 'personality.voice',
        `Invalid voice: ${entity.personality.voice}`, 'error');
    }
  }

  private validateDemands(entity: any, fileName: string) {
    if (!Array.isArray(entity.demands)) {
      this.addError(fileName, entity.id, 'demands',
        'demands must be an array', 'error');
      return;
    }

    const validDemandTypes = [
      'payment_blood', 'payment_souls', 'payment_memory', 'payment_sensation',
      'payment_time', 'payment_name', 'payment_treasure', 'payment_service',
      'payment_knowledge', 'payment_loyalty', 'offering_ritual', 'offering_location',
      'offering_timing', 'concession_moral', 'concession_freedom', 'concession_identity'
    ];

    const validSeverities = ['trivial', 'minor', 'significant', 'major', 'extreme'];

    for (const demand of entity.demands) {
      if (!demand.type) {
        this.addError(fileName, entity.id, 'demands',
          'Demand must specify type', 'error');
      } else if (!validDemandTypes.includes(demand.type)) {
        this.addError(fileName, entity.id, 'demands',
          `Invalid demand type: ${demand.type}`, 'error');
      }

      if (!demand.description) {
        this.addError(fileName, entity.id, 'demands',
          'Demand must specify description', 'error');
      }

      if (!demand.severity) {
        this.addError(fileName, entity.id, 'demands',
          'Demand must specify severity', 'error');
      } else if (!validSeverities.includes(demand.severity)) {
        this.addError(fileName, entity.id, 'demands',
          `Invalid severity: ${demand.severity}`, 'error');
      }

      if (demand.negotiable === undefined) {
        this.addError(fileName, entity.id, 'demands',
          'Demand must specify negotiable property', 'warning');
      }
    }
  }

  private validateNegotiationStyle(entity: any, fileName: string) {
    const validApproaches = ['aggressive', 'reasonable', 'generous', 'exploitative', 'playful', 'sadistic'];
    const validAnchoring = ['extreme', 'moderate', 'fair'];

    if (entity.negotiationStyle.approach && !validApproaches.includes(entity.negotiationStyle.approach)) {
      this.addError(fileName, entity.id, 'negotiationStyle.approach',
        `Invalid approach: ${entity.negotiationStyle.approach}`, 'error');
    }

    if (entity.negotiationStyle.anchoring && !validAnchoring.includes(entity.negotiationStyle.anchoring)) {
      this.addError(fileName, entity.id, 'negotiationStyle.anchoring',
        `Invalid anchoring: ${entity.negotiationStyle.anchoring}`, 'error');
    }

    if (entity.negotiationStyle.opensNegotiation !== undefined && typeof entity.negotiationStyle.opensNegotiation !== 'boolean') {
      this.addError(fileName, entity.id, 'negotiationStyle.opensNegotiation',
        'opensNegotiation must be boolean', 'error');
    }

    if (entity.negotiationStyle.respectsClever !== undefined && typeof entity.negotiationStyle.respectsClever !== 'boolean') {
      this.addError(fileName, entity.id, 'negotiationStyle.respectsClever',
        'respectsClever must be boolean', 'error');
    }
  }

  private validateServices(entity: any, fileName: string) {
    if (!Array.isArray(entity.services)) {
      this.addError(fileName, entity.id, 'services',
        'services must be an array', 'error');
      return;
    }

    const validCategories = [
      'combat', 'knowledge', 'crafting', 'transportation', 'transformation',
      'protection', 'curse', 'blessing'
    ];

    for (const service of entity.services) {
      if (!service.id) {
        this.addError(fileName, entity.id, 'services',
          'Service must specify id', 'error');
      }

      if (!service.name) {
        this.addError(fileName, entity.id, 'services',
          'Service must specify name', 'error');
      }

      if (!service.category) {
        this.addError(fileName, entity.id, 'services',
          'Service must specify category', 'error');
      } else if (!validCategories.includes(service.category)) {
        this.addError(fileName, entity.id, 'services',
          `Invalid service category: ${service.category}`, 'error');
      }

      if (service.powerCost !== undefined && (typeof service.powerCost !== 'number' || service.powerCost < 0)) {
        this.addError(fileName, entity.id, 'services',
          `Invalid powerCost for service ${service.id}: ${service.powerCost}`, 'error');
      }
    }
  }

  private validateContractTypes(entity: any, fileName: string) {
    if (!Array.isArray(entity.contractTypes)) {
      this.addError(fileName, entity.id, 'contractTypes',
        'contractTypes must be an array', 'error');
      return;
    }

    const validDurations = ['instant', 'short', 'long', 'permanent'];
    const validBindingForces = ['verbal', 'written', 'blood', 'soul', 'cosmic'];

    for (const contract of entity.contractTypes) {
      if (!contract.id) {
        this.addError(fileName, entity.id, 'contractTypes',
          'Contract must specify id', 'error');
      }

      if (contract.duration && !validDurations.includes(contract.duration)) {
        this.addError(fileName, entity.id, 'contractTypes',
          `Invalid duration: ${contract.duration}`, 'error');
      }

      if (contract.bindingForce && !validBindingForces.includes(contract.bindingForce)) {
        this.addError(fileName, entity.id, 'contractTypes',
          `Invalid bindingForce: ${contract.bindingForce}`, 'error');
      }
    }
  }

  private validateAppearance(entity: any, fileName: string) {
    if (!entity.appearance.baseForm) {
      this.addError(fileName, entity.id, 'appearance',
        'Appearance must specify baseForm', 'error');
    }

    const validSizes = ['tiny', 'small', 'human', 'large', 'huge', 'variable'];
    if (entity.appearance.size && !validSizes.includes(entity.appearance.size)) {
      this.addError(fileName, entity.id, 'appearance.size',
        `Invalid size: ${entity.appearance.size}`, 'error');
    }

    if (!entity.appearance.auraDescription) {
      this.addError(fileName, entity.id, 'appearance',
        'Appearance should specify auraDescription', 'warning');
    }

    if (!entity.appearance.soundsLike) {
      this.addError(fileName, entity.id, 'appearance',
        'Appearance should specify soundsLike', 'warning');
    }
  }

  private validateSummoningRequirements(entity: any, fileName: string) {
    if (!Array.isArray(entity.summoningRequirements)) {
      this.addError(fileName, entity.id, 'summoningRequirements',
        'summoningRequirements must be an array', 'error');
      return;
    }

    const validTypes = ['circle', 'offering', 'timing', 'location', 'knowledge', 'purity', 'corruption'];
    const validDifficulties = ['easy', 'moderate', 'hard', 'extreme'];

    for (const req of entity.summoningRequirements) {
      if (!req.type) {
        this.addError(fileName, entity.id, 'summoningRequirements',
          'Summoning requirement must specify type', 'error');
      } else if (!validTypes.includes(req.type)) {
        this.addError(fileName, entity.id, 'summoningRequirements',
          `Invalid requirement type: ${req.type}`, 'error');
      }

      if (!req.description) {
        this.addError(fileName, entity.id, 'summoningRequirements',
          'Summoning requirement must specify description', 'error');
      }

      if (req.difficulty && !validDifficulties.includes(req.difficulty)) {
        this.addError(fileName, entity.id, 'summoningRequirements',
          `Invalid difficulty: ${req.difficulty}`, 'error');
      }
    }
  }

  private validateBreachConsequences(entity: any, fileName: string) {
    if (!Array.isArray(entity.breachConsequences)) {
      this.addError(fileName, entity.id, 'breachConsequences',
        'breachConsequences must be an array', 'error');
      return;
    }

    const validSeverities = ['warning', 'penalty', 'severe', 'catastrophic'];
    const validTypes = ['immediate', 'delayed', 'cumulative'];

    for (const consequence of entity.breachConsequences) {
      if (consequence.severity && !validSeverities.includes(consequence.severity)) {
        this.addError(fileName, entity.id, 'breachConsequences',
          `Invalid severity: ${consequence.severity}`, 'error');
      }

      if (consequence.type && !validTypes.includes(consequence.type)) {
        this.addError(fileName, entity.id, 'breachConsequences',
          `Invalid type: ${consequence.type}`, 'error');
      }

      if (!consequence.effect) {
        this.addError(fileName, entity.id, 'breachConsequences',
          'Breach consequence must specify effect', 'error');
      }
    }
  }

  private validateRequired(entity: any, fileName: string, field: string) {
    if (!entity[field] && entity[field] !== false && entity[field] !== 0) {
      this.addError(fileName, entity.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, entityId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, entityId, field, message, severity });
  }
}

export function validateSummonableEntity(entity: any, fileName: string): ValidationError[] {
  const validator = new SummonableEntityValidator();
  return validator.validate(entity, fileName);
}
