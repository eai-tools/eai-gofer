/**
 * Memory and Learning System - Shared Validation Utilities
 *
 * Provides common validation functions for UUID, schema validation, and data integrity checks.
 * Used across all components (Memory, Hints, Dependencies, Compaction).
 */

/**
 * Validates a UUID v4 string.
 *
 * @param uuid - String to validate
 * @returns True if valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}

/**
 * Validates a timestamp (Unix milliseconds).
 *
 * @param timestamp - Timestamp to validate
 * @returns True if valid timestamp
 */
export function isValidTimestamp(timestamp: number): boolean {
  return Number.isInteger(timestamp) && timestamp > 0 && timestamp <= Date.now() + 86400000; // Allow up to 1 day in future for clock skew
}

/**
 * Validates a string is within length bounds.
 *
 * @param str - String to validate
 * @param minLength - Minimum length (inclusive)
 * @param maxLength - Maximum length (inclusive)
 * @returns True if within bounds
 */
export function isValidLength(str: string, minLength: number, maxLength: number): boolean {
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * Validates a tag starts with # and contains valid characters.
 *
 * @param tag - Tag to validate
 * @returns True if valid tag format
 */
export function isValidTag(tag: string): boolean {
  const tagRegex = /^#[a-z0-9_-]+$/i;
  return tagRegex.test(tag);
}

/**
 * Validates a category contains only valid characters.
 *
 * @param category - Category to validate
 * @returns True if valid category format
 */
export function isValidCategory(category: string): boolean {
  const categoryRegex = /^[a-z0-9_-]+$/i;
  return categoryRegex.test(category) && category.length > 0;
}

/**
 * Validates a spec ID format (e.g., "005-authentication").
 *
 * @param specId - Spec ID to validate
 * @returns True if valid spec ID format
 */
export function isValidSpecId(specId: string): boolean {
  const specIdRegex = /^\d{3}-[a-z0-9-]+$/i;
  return specIdRegex.test(specId);
}

/**
 * Validates a file path is absolute.
 *
 * @param filePath - File path to validate
 * @returns True if absolute path
 */
export function isAbsolutePath(filePath: string): boolean {
  return (
    filePath.startsWith('/') ||
    /^[a-z]:\\/i.test(filePath) || // Windows: C:\
    filePath.startsWith('\\\\')
  ); // Windows: UNC path
}

/**
 * Sanitizes user input by removing potentially dangerous characters.
 *
 * @param input - User input to sanitize
 * @returns Sanitized string
 */
export function sanitizeUserInput(input: string): string {
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Validates an array contains only unique values.
 *
 * @param arr - Array to validate
 * @returns True if all values are unique
 */
export function hasUniqueValues<T>(arr: T[]): boolean {
  return new Set(arr).size === arr.length;
}

/**
 * Validates a priority value (1-10).
 *
 * @param priority - Priority to validate
 * @returns True if valid priority
 */
export function isValidPriority(priority: number): boolean {
  return Number.isInteger(priority) && priority >= 1 && priority <= 10;
}

/**
 * Validates a scope value.
 *
 * @param scope - Scope to validate
 * @returns True if valid scope
 */
export function isValidScope(scope: string): scope is 'local' | 'global' | 'both' {
  return scope === 'local' || scope === 'global' || scope === 'both';
}

/**
 * Validates a dependency type.
 *
 * @param type - Dependency type to validate
 * @returns True if valid dependency type
 */
export function isValidDependencyType(
  type: string
): type is 'required_by' | 'uses_api_from' | 'blocks' {
  return type === 'required_by' || type === 'uses_api_from' || type === 'blocks';
}

/**
 * Validates a status value.
 *
 * @param status - Status to validate
 * @returns True if valid status
 */
export function isValidStatus(
  status: string
): status is 'pending' | 'in_progress' | 'completed' | 'blocked' {
  return (
    status === 'pending' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'blocked'
  );
}

/**
 * Validation error class.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Throws a ValidationError if condition is false.
 *
 * @param condition - Condition to assert
 * @param field - Field name that failed validation
 * @param value - Value that failed validation
 * @param message - Error message
 */
export function assert(
  condition: boolean,
  field: string,
  value: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new ValidationError(message, field, value);
  }
}
