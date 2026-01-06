/**
 * Validation service for component mutations
 *
 * Validates mutation requests against component schemas before applying them.
 */

import type { ComponentSchema, FieldSchema } from '../types/index.js';
import { isString, isNumber, isBoolean, isArray, isObject } from '../utils/typeGuards.js';

/**
 * Result of a validation check
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Error message if validation failed */
  error?: string;
}

/**
 * Service for validating mutations against schemas
 */
export class ValidationService {
  /**
   * Validate a mutation request against a schema
   *
   * @param schema - The component schema to validate against
   * @param fieldName - Name of the field being mutated
   * @param value - The new value being set
   * @param isDev - Whether this is a dev-initiated mutation (bypasses some checks)
   * @returns Validation result with success status and error message if failed
   */
  static validate(
    schema: ComponentSchema,
    fieldName: string,
    value: unknown,
    isDev: boolean = false
  ): ValidationResult {
    // Check if field exists in schema
    const field = schema.fields[fieldName];
    if (!field) {
      return {
        valid: false,
        error: `Field '${fieldName}' does not exist in schema for component '${schema.type}'`,
      };
    }

    // Check mutability (unless dev override)
    if (!isDev && field.mutable !== true) {
      return {
        valid: false,
        error: `Field '${fieldName}' is not mutable`,
      };
    }

    // Check required (can't set to null/undefined)
    if (field.required && (value === null || value === undefined)) {
      return {
        valid: false,
        error: `Field '${fieldName}' is required and cannot be null or undefined`,
      };
    }

    // Check type
    const typeResult = this.validateType(field, value);
    if (!typeResult.valid) {
      return typeResult;
    }

    // Check range for numbers
    if (field.type === 'number' && field.range && typeof value === 'number') {
      const [min, max] = field.range;
      if (value < min || value > max) {
        return {
          valid: false,
          error: `Field '${fieldName}' must be between ${min} and ${max}, got ${value}`,
        };
      }
    }

    // Check enum values
    if (field.type === 'enum' && field.enumValues) {
      if (!field.enumValues.includes(value as string)) {
        return {
          valid: false,
          error: `Field '${fieldName}' must be one of [${field.enumValues.join(', ')}], got '${value}'`,
        };
      }
    }

    // Check max length for strings
    if (field.type === 'string' && field.maxLength && typeof value === 'string') {
      if (value.length > field.maxLength) {
        return {
          valid: false,
          error: `Field '${fieldName}' must be at most ${field.maxLength} characters, got ${value.length}`,
        };
      }
    }

    // Check max length for arrays
    if (field.type === 'array' && field.maxLength && Array.isArray(value)) {
      if (value.length > field.maxLength) {
        return {
          valid: false,
          error: `Field '${fieldName}' must have at most ${field.maxLength} items, got ${value.length}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate that a value matches the expected field type
   */
  private static validateType(field: FieldSchema, value: unknown): ValidationResult {
    // Special handling for enum - check type is string OR one of enum values
    if (field.type === 'enum') {
      if (!isString(value)) {
        return {
          valid: false,
          error: `Expected enum value (string), got ${typeof value}`,
        };
      }
      // Enum value check happens after this in validate()
      return { valid: true };
    }

    switch (field.type) {
      case 'string':
        if (!isString(value)) {
          return {
            valid: false,
            error: `Expected string, got ${typeof value}`,
          };
        }
        break;

      case 'number':
        if (!isNumber(value)) {
          return {
            valid: false,
            error: `Expected number, got ${typeof value}`,
          };
        }
        break;

      case 'boolean':
        if (!isBoolean(value)) {
          return {
            valid: false,
            error: `Expected boolean, got ${typeof value}`,
          };
        }
        break;

      case 'array':
        if (!isArray(value)) {
          return {
            valid: false,
            error: `Expected array, got ${typeof value}`,
          };
        }
        // TODO: Validate array item types if itemType is specified
        break;

      case 'object':
      case 'map':
        if (!isObject(value)) {
          return {
            valid: false,
            error: `Expected object, got ${typeof value}`,
          };
        }
        break;

      default:
        // Unknown type - allow it for now
        break;
    }

    return { valid: true };
  }
}
