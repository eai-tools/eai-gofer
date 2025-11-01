/**
 * Memory and Learning System - JSON Schema Validator
 *
 * Configures and provides ajv JSON schema validation for Memory objects and other data structures.
 * Uses strict mode with additional security and validation rules.
 */

import Ajv from 'ajv';
import type { ValidateFunction, ErrorObject } from 'ajv';
import { type Memory } from './memory';

/**
 * Configured ajv instance with strict validation rules.
 */
const ajv = new Ajv({
  allErrors: true, // Report all validation errors
  strictSchema: true, // Strict mode - catch schema errors
  validateFormats: true, // Validate format keywords
  removeAdditional: false, // Don't remove additional properties (explicit validation)
  useDefaults: false, // Don't apply default values (explicit initialization)
  coerceTypes: false, // Don't coerce types (strict type checking)
});

// ============================================================================
// Memory Schema
// ============================================================================

/**
 * JSON Schema for Memory entity.
 *
 * Validates all required fields and constraints from data-model.md.
 */
export const memorySchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', // UUID v4
    },
    category: {
      type: 'string',
      pattern: '^[a-z0-9_-]+$',
      minLength: 1,
      maxLength: 100,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^#[a-z0-9_-]+$',
      },
      uniqueItems: true,
      minItems: 0,
      maxItems: 20,
    },
    scope: {
      type: 'string',
      enum: ['local', 'global'],
    },
    content: {
      type: 'string',
      minLength: 1,
      maxLength: 10000,
    },
    created: {
      type: 'number',
      minimum: 0,
    },
    lastUsed: {
      type: 'number',
      minimum: 0,
    },
    usedCount: {
      type: 'number',
      minimum: 0,
    },
    learnedFrom: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
    },
  },
  required: [
    'id',
    'category',
    'tags',
    'scope',
    'content',
    'created',
    'lastUsed',
    'usedCount',
    'learnedFrom',
  ],
  additionalProperties: false,
};

/**
 * Compiled validator for Memory objects.
 */
export const validateMemory: ValidateFunction = ajv.compile(memorySchema);

// ============================================================================
// StoredMemories Schema
// ============================================================================

/**
 * JSON Schema for StoredMemories format.
 */
export const storedMemoriesSchema = {
  type: 'object',
  properties: {
    version: {
      type: 'number',
      minimum: 1,
    },
    memories: {
      type: 'array',
      items: memorySchema,
    },
  },
  required: ['version', 'memories'],
  additionalProperties: false,
} as const;

/**
 * Compiled validator for StoredMemories.
 */
export const validateStoredMemories = ajv.compile(storedMemoriesSchema);

// ============================================================================
// DependencyGraphData Schema
// ============================================================================

/**
 * JSON Schema for DependencyGraphData.
 */
export const dependencyGraphDataSchema = {
  type: 'object',
  properties: {
    version: {
      type: 'number',
      minimum: 1,
    },
    lastModified: {
      type: 'number',
      minimum: 0,
    },
    nodes: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          specId: {
            type: 'string',
            pattern: '^\\d{3}-[a-z0-9-]+$',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'blocked'],
          },
          metadata: {
            type: 'object',
            nullable: true,
          },
        },
        required: ['specId', 'status'],
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fromSpecId: {
            type: 'string',
            pattern: '^\\d{3}-[a-z0-9-]+$',
          },
          toSpecId: {
            type: 'string',
            pattern: '^\\d{3}-[a-z0-9-]+$',
          },
          dependencyType: {
            type: 'string',
            enum: ['required_by', 'uses_api_from', 'blocks'],
          },
          declared: {
            type: 'boolean',
          },
          metadata: {
            type: 'object',
            nullable: true,
          },
        },
        required: ['fromSpecId', 'toSpecId', 'dependencyType', 'declared'],
      },
    },
  },
  required: ['version', 'lastModified', 'nodes', 'edges'],
  additionalProperties: false,
} as const;

/**
 * Compiled validator for DependencyGraphData.
 */
export const validateDependencyGraphData = ajv.compile(dependencyGraphDataSchema);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats validation errors into a readable string.
 *
 * @param errors - Array of ajv validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return 'Unknown validation error';
  }

  return errors
    .map((err) => {
      const path = (err as any).instancePath || (err as any).dataPath || 'root';
      const message = err.message || 'validation failed';
      return `${path}: ${message}`;
    })
    .join('; ');
}

/**
 * Validates data and throws if invalid.
 *
 * @param validator - Compiled ajv validator function
 * @param data - Data to validate
 * @param typeName - Name of the type being validated (for error messages)
 * @throws Error if validation fails
 */
export function validateOrThrow<T>(
  validator: ValidateFunction,
  data: unknown,
  typeName: string
): asserts data is T {
  if (!validator(data)) {
    const errorMsg = formatValidationErrors(validator.errors);
    throw new Error(`Invalid ${typeName}: ${errorMsg}`);
  }
}
