#!/usr/bin/env tsx
/**
 * Spell Validator
 *
 * Validates magic spell definitions for:
 * - Required fields
 * - Valid spell types and schools
 * - Consistent costs and effects
 * - Component requirements
 */

export interface ValidationError {
  file: string;
  spellId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class SpellValidator {
  private errors: ValidationError[] = [];

  validate(spell: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(spell, fileName, 'id');
    this.validateRequired(spell, fileName, 'name');
    this.validateRequired(spell, fileName, 'school');
    this.validateRequired(spell, fileName, 'tier');

    // School validation
    const validSchools = [
      'elemental', 'life', 'mind', 'spirit', 'transformation',
      'divination', 'protection', 'entropy', 'nature', 'shadow', 'light'
    ];
    if (spell.school && !validSchools.includes(spell.school)) {
      this.addError(fileName, spell.id, 'school',
        `Invalid school: ${spell.school}`, 'error');
    }

    // Tier validation
    if (spell.tier !== undefined) {
      if (typeof spell.tier !== 'number' || spell.tier < 1 || spell.tier > 10) {
        this.addError(fileName, spell.id, 'tier',
          `Invalid tier: ${spell.tier} (must be 1-10)`, 'error');
      }
    }

    // Cost validation
    if (spell.manaCost !== undefined) {
      if (typeof spell.manaCost !== 'number' || spell.manaCost < 0) {
        this.addError(fileName, spell.id, 'manaCost',
          `Invalid manaCost: ${spell.manaCost}`, 'error');
      }
    }

    if (spell.castTime !== undefined) {
      if (typeof spell.castTime !== 'number' || spell.castTime < 0) {
        this.addError(fileName, spell.id, 'castTime',
          `Invalid castTime: ${spell.castTime}`, 'error');
      }
    }

    if (spell.cooldown !== undefined) {
      if (typeof spell.cooldown !== 'number' || spell.cooldown < 0) {
        this.addError(fileName, spell.id, 'cooldown',
          `Invalid cooldown: ${spell.cooldown}`, 'error');
      }
    }

    // Range validation
    if (spell.range !== undefined) {
      if (typeof spell.range !== 'number' || spell.range < 0) {
        this.addError(fileName, spell.id, 'range',
          `Invalid range: ${spell.range}`, 'error');
      }
    }

    // Components validation
    if (spell.components) {
      this.validateComponents(spell, fileName);
    }

    // Effects validation
    if (spell.effects && Array.isArray(spell.effects)) {
      for (const effect of spell.effects) {
        this.validateEffect(effect, spell, fileName);
      }
    } else if (!spell.effects) {
      this.addError(fileName, spell.id, 'effects',
        'Spell should specify at least one effect', 'warning');
    }

    // Universe types validation for magical spells
    if (spell.universeTypes) {
      if (!Array.isArray(spell.universeTypes) || spell.universeTypes.length === 0) {
        this.addError(fileName, spell.id, 'universeTypes',
          'universeTypes must be a non-empty array', 'error');
      }
    }

    return this.errors;
  }

  private validateComponents(spell: any, fileName: string) {
    if (!Array.isArray(spell.components)) {
      this.addError(fileName, spell.id, 'components',
        'components must be an array', 'error');
      return;
    }

    for (const component of spell.components) {
      if (!component.item) {
        this.addError(fileName, spell.id, 'components',
          'Component must specify item', 'error');
      }
      if (component.consumed === undefined) {
        this.addError(fileName, spell.id, 'components',
          `Component ${component.item} should specify consumed property`, 'warning');
      }
      if (component.quantity !== undefined && (typeof component.quantity !== 'number' || component.quantity < 1)) {
        this.addError(fileName, spell.id, 'components',
          `Invalid quantity for component ${component.item}`, 'error');
      }
    }
  }

  private validateEffect(effect: any, spell: any, fileName: string) {
    if (!effect.type) {
      this.addError(fileName, spell.id, 'effects',
        'Effect must specify type', 'error');
    }

    if (effect.magnitude !== undefined && typeof effect.magnitude !== 'number') {
      this.addError(fileName, spell.id, 'effects',
        `Invalid magnitude for effect ${effect.type}`, 'error');
    }

    if (effect.duration !== undefined && (typeof effect.duration !== 'number' || effect.duration < 0)) {
      this.addError(fileName, spell.id, 'effects',
        `Invalid duration for effect ${effect.type}`, 'error');
    }

    if (effect.radius !== undefined && (typeof effect.radius !== 'number' || effect.radius < 0)) {
      this.addError(fileName, spell.id, 'effects',
        `Invalid radius for effect ${effect.type}`, 'error');
    }
  }

  private validateRequired(spell: any, fileName: string, field: string) {
    if (!spell[field] && spell[field] !== 0) {
      this.addError(fileName, spell.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, spellId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, spellId, field, message, severity });
  }
}

export function validateSpell(spell: any, fileName: string): ValidationError[] {
  const validator = new SpellValidator();
  return validator.validate(spell, fileName);
}
