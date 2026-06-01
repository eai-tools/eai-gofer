/**
 * Configuration Validator
 *
 * Validates VSCode workspace configuration against JSON schema.
 * Provides graceful fallback to defaults on validation errors.
 *
 * Engineering Remediation Phase 5 - T039 (US8 - Security)
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import * as vscode from 'vscode';
import { Logger } from '../services/Logger';
import configSchema from '../schemas/config.schema.json';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * ConfigValidator
 *
 * Validates configuration against JSON schema to prevent:
 * - Invalid types (string instead of number)
 * - Out-of-range values (negative timeouts, excessive cache sizes)
 * - Missing required fields
 * - Malformed structures
 */
export class ConfigValidator {
  private readonly ajv: Ajv;
  private readonly validate: ValidateFunction;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.ajv = new Ajv({
      allErrors: true, // Collect all validation errors (not just first)
      verbose: true, // Include schema and data in errors
      strict: false, // Allow unknown keywords (VSCode may add properties)
    });

    // Compile schema once for performance
    this.validate = this.ajv.compile(configSchema);
  }

  /**
   * Validate workspace configuration
   *
   * @param config - VSCode workspace configuration
   * @returns Validation result with errors and warnings
   */
  public validateConfiguration(config: vscode.WorkspaceConfiguration): ValidationResult {
    const configObject = this.configToObject(config);

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate against schema
    const valid = this.validate(configObject);

    if (!valid && this.validate.errors) {
      result.valid = false;

      for (const error of this.validate.errors) {
        const errorMessage = this.formatError(error);

        // Categorize: missing optional fields are warnings, others are errors
        if (error.keyword === 'required') {
          result.warnings.push(errorMessage);
        } else {
          result.errors.push(errorMessage);
        }
      }
    }

    // Additional custom validations
    this.validateThresholdOrdering(configObject, result);

    return result;
  }

  /**
   * Validate and get configuration value with fallback
   *
   * @param config - VSCode workspace configuration
   * @param key - Configuration key
   * @param defaultValue - Fallback value if invalid
   * @returns Validated value or default
   */
  public getValidatedValue<T>(
    config: vscode.WorkspaceConfiguration,
    key: string,
    defaultValue: T
  ): T {
    const value = config.get<T>(key);

    if (value === undefined) {
      return defaultValue;
    }

    // Type check
    if (typeof value !== typeof defaultValue) {
      this.logger.warn('ConfigValidator', `Invalid type for ${key}, using default`, {
        key,
        expected: typeof defaultValue,
        actual: typeof value,
        default: defaultValue,
      });
      return defaultValue;
    }

    // Range check for numbers
    if (typeof defaultValue === 'number' && typeof value === 'number') {
      if (value < 0) {
        this.logger.warn('ConfigValidator', `Negative value for ${key}, using default`, {
          key,
          value,
          default: defaultValue,
        });
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Convert VSCode configuration to plain object for schema validation
   *
   * @param config - VSCode workspace configuration
   * @returns Plain object representation
   */
  private configToObject(config: vscode.WorkspaceConfiguration): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    // Extract gofer configuration section
    const goferConfig = config.get<Record<string, unknown>>('gofer');
    if (goferConfig) {
      obj.gofer = goferConfig;
    }

    return obj;
  }

  /**
   * Format AJV validation error for logging
   *
   * @param error - AJV validation error
   * @returns Formatted error message
   */
  private formatError(error: ErrorObject): string {
    const path = error.instancePath || 'root';
    const message = error.message || 'validation failed';
    const keyword = error.keyword;

    switch (keyword) {
      case 'type':
        return `${path}: ${message} (expected ${error.params.type})`;
      case 'minimum':
        return `${path}: must be >= ${error.params.limit} (was ${error.data})`;
      case 'maximum':
        return `${path}: must be <= ${error.params.limit} (was ${error.data})`;
      case 'required':
        return `${path}: missing required property '${error.params.missingProperty}'`;
      case 'enum':
        return `${path}: must be one of ${error.params.allowedValues.join(', ')}`;
      default:
        return `${path}: ${message}`;
    }
  }

  /**
   * Validate context threshold ordering (healthy < warning < critical)
   *
   * @param config - Configuration object
   * @param result - Validation result to update
   */
  private validateThresholdOrdering(
    config: Record<string, unknown>,
    result: ValidationResult
  ): void {
    const gofer = config.gofer as Record<string, unknown> | undefined;
    const context = gofer?.context as Record<string, unknown> | undefined;

    if (!context) {
      return;
    }

    const healthy = context.healthyThreshold as number | undefined;
    const warning = context.warningThreshold as number | undefined;
    const critical = context.criticalThreshold as number | undefined;

    if (healthy !== undefined && warning !== undefined && healthy >= warning) {
      result.errors.push(
        `context.healthyThreshold (${healthy}) must be < warningThreshold (${warning})`
      );
      result.valid = false;
    }

    if (warning !== undefined && critical !== undefined && warning >= critical) {
      result.errors.push(
        `context.warningThreshold (${warning}) must be < criticalThreshold (${critical})`
      );
      result.valid = false;
    }
  }

  /**
   * Log validation results
   *
   * @param result - Validation result
   * @param context - Context string for logging
   */
  public logValidationResult(result: ValidationResult, context: string): void {
    if (result.valid && result.warnings.length === 0) {
      this.logger.info('ConfigValidator', `Configuration valid: ${context}`);
      return;
    }

    if (result.warnings.length > 0) {
      this.logger.warn('ConfigValidator', `Configuration warnings: ${context}`, {
        warnings: result.warnings,
      });
    }

    if (!result.valid) {
      this.logger.error('ConfigValidator', new Error('Configuration validation failed'), {
        context,
        errors: result.errors,
      });
    }
  }

  /**
   * Show validation errors to user (for critical failures)
   *
   * @param result - Validation result
   */
  public async showValidationErrors(result: ValidationResult): Promise<void> {
    if (result.valid) {
      return;
    }

    const errorMessage = [
      'Gofer configuration validation failed:',
      '',
      ...result.errors.map((e) => `• ${e}`),
      '',
      'Using default values. Check settings to fix.',
    ].join('\n');

    await vscode.window.showErrorMessage(errorMessage, 'Open Settings').then((choice) => {
      if (choice === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'gofer');
      }
    });
  }
}
