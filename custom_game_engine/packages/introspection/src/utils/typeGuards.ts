/**
 * Runtime type checking utilities
 */

/**
 * Type guard for string values
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for number values
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for boolean values
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for arrays
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for objects (non-null, non-array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for Maps
 */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map;
}

/**
 * Type guard for entity IDs (non-empty strings)
 */
export function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard for arrays of entity IDs
 */
export function isEntityIdArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isEntityId);
}

/**
 * Type guard for string arrays
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/**
 * Type guard for number arrays
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

/**
 * Checks if a value is in a range
 */
export function isInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Checks if a value is one of the enum values
 */
export function isEnum<T extends readonly string[]>(
  value: unknown,
  enumValues: T
): value is T[number] {
  return isString(value) && enumValues.includes(value);
}

/**
 * Checks if a string length is within bounds
 */
export function isValidStringLength(
  value: unknown,
  maxLength?: number
): value is string {
  if (!isString(value)) return false;
  if (maxLength === undefined) return true;
  return value.length <= maxLength;
}

/**
 * Checks if an array length is within bounds
 */
export function isValidArrayLength(
  value: unknown,
  maxLength?: number
): value is unknown[] {
  if (!isArray(value)) return false;
  if (maxLength === undefined) return true;
  return value.length <= maxLength;
}

/**
 * Validates a field value against its schema
 */
export function validateFieldValue(
  value: unknown,
  fieldType: string,
  constraints?: {
    required?: boolean;
    range?: readonly [number, number];
    maxLength?: number;
    enumValues?: readonly string[];
    itemType?: string;
  }
): boolean {
  // Check required
  if (constraints?.required && (value === undefined || value === null)) {
    return false;
  }

  // Allow undefined/null for optional fields
  if (!constraints?.required && (value === undefined || value === null)) {
    return true;
  }

  // Type-specific validation
  switch (fieldType) {
    case 'string':
      return (
        isString(value) &&
        isValidStringLength(value, constraints?.maxLength)
      );

    case 'number':
      if (!isNumber(value)) return false;
      if (constraints?.range) {
        return isInRange(value, constraints.range[0], constraints.range[1]);
      }
      return true;

    case 'boolean':
      return isBoolean(value);

    case 'array':
      if (!isArray(value)) return false;
      if (constraints?.maxLength && value.length > constraints.maxLength) {
        return false;
      }
      // Validate item types if itemType is specified
      if (constraints?.itemType) {
        return value.every((item) =>
          validateFieldValue(item, constraints.itemType!)
        );
      }
      return true;

    case 'map':
      return isMap(value);

    case 'enum':
      if (!constraints?.enumValues) return false;
      return isEnum(value, constraints.enumValues);

    case 'object':
      return isObject(value);

    case 'entityId':
      return isEntityId(value);

    case 'entityIdArray':
      return isEntityIdArray(value);

    default:
      // Unknown type - can't validate
      return true;
  }
}
