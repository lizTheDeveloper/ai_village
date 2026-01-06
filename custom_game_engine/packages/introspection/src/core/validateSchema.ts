import type { ComponentSchema, Component } from '../types/ComponentSchema.js';
import type { FieldSchema } from '../types/FieldSchema.js';

/**
 * Validation result for schema validation
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a schema is well-formed
 *
 * @param schema - The schema to validate
 * @returns Validation result with errors if any
 */
export function validateSchema<T extends Component>(
  schema: ComponentSchema<T>
): SchemaValidationResult {
  const errors: string[] = [];

  // Check required top-level fields
  if (!schema.type || typeof schema.type !== 'string') {
    errors.push('Schema must have a string type');
  }

  if (typeof schema.version !== 'number' || schema.version < 1) {
    errors.push('Schema version must be a positive number');
  }

  if (!schema.category) {
    errors.push('Schema must have a category');
  }

  if (!schema.fields || typeof schema.fields !== 'object') {
    errors.push('Schema must have fields object');
  } else {
    // Validate each field
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      validateField(fieldName, fieldSchema, errors);
    }
  }

  if (typeof schema.validate !== 'function') {
    errors.push('Schema must have a validate function');
  }

  if (typeof schema.createDefault !== 'function') {
    errors.push('Schema must have a createDefault function');
  }

  // Validate mutators if present
  if (schema.mutators) {
    for (const [mutatorName, mutatorFn] of Object.entries(schema.mutators)) {
      if (typeof mutatorFn !== 'function') {
        errors.push(`Mutator '${mutatorName}' must be a function`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single field schema
 */
function validateField(
  fieldName: string,
  field: FieldSchema,
  errors: string[]
): void {
  const prefix = `Field '${fieldName}'`;

  if (!field.type) {
    errors.push(`${prefix}: missing type`);
  }

  if (typeof field.required !== 'boolean') {
    errors.push(`${prefix}: 'required' must be a boolean`);
  }

  if (!field.description) {
    errors.push(`${prefix}: missing description`);
  }

  if (!field.visibility || typeof field.visibility !== 'object') {
    errors.push(`${prefix}: missing visibility configuration`);
  }

  // Validate type-specific constraints
  if (field.type === 'enum' && !field.enumValues) {
    errors.push(`${prefix}: enum type must have enumValues`);
  }

  if (field.type === 'array' || field.type === 'map') {
    if (!field.itemType) {
      errors.push(`${prefix}: ${field.type} type must have itemType`);
    }
  }

  if (field.range) {
    if (!Array.isArray(field.range) || field.range.length !== 2) {
      errors.push(`${prefix}: range must be a tuple [min, max]`);
    } else if (field.range[0] > field.range[1]) {
      errors.push(`${prefix}: range min must be <= max`);
    }
  }

  if (field.maxLength !== undefined && field.maxLength < 0) {
    errors.push(`${prefix}: maxLength must be non-negative`);
  }
}

/**
 * Throws an error if schema is invalid
 */
export function assertValidSchema<T extends Component>(
  schema: ComponentSchema<T>
): void {
  const result = validateSchema(schema);
  if (!result.valid) {
    throw new Error(
      `Invalid schema for '${schema.type}':\n${result.errors.join('\n')}`
    );
  }
}
