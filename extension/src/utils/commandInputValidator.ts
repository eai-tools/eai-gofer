/**
 * Command Input Validator
 *
 * Validates and sanitizes user input for commands to prevent:
 * - Command injection
 * - Script injection
 * - SQL injection (if applicable)
 * - XSS (cross-site scripting)
 * - Other malicious input patterns
 *
 * Engineering Remediation Phase 5 - T041 (US8 - Security)
 */

/**
 * Input validation result
 */
export interface InputValidationResult {
  valid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  allowEmpty?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  blockedPatterns?: RegExp[];
}

/**
 * Sanitize command input string
 *
 * Removes or escapes dangerous characters that could be used for injection attacks.
 *
 * @param input - Raw user input
 * @param options - Validation options
 * @returns Sanitized string or null if invalid
 */
export function sanitizeCommandInput(
  input: string,
  options: ValidationOptions = {}
): string | null {
  const result = validateCommandInput(input, options);
  return result.valid ? result.sanitized : null;
}

/**
 * Validate command input with detailed error information
 *
 * @param input - Raw user input
 * @param options - Validation options
 * @returns Validation result with error details
 */
export function validateCommandInput(
  input: string,
  options: ValidationOptions = {}
): InputValidationResult {
  const {
    allowEmpty = false,
    maxLength = 1000,
    minLength = 0,
    pattern,
    blockedPatterns = [],
  } = options;

  // Check for null/undefined
  if (input === null || input === undefined) {
    return {
      valid: false,
      sanitized: '',
      error: 'Input is null or undefined',
    };
  }

  // Convert to string if not already
  const inputStr = String(input);

  // Check empty
  if (!allowEmpty && inputStr.trim().length === 0) {
    return {
      valid: false,
      sanitized: '',
      error: 'Input cannot be empty',
    };
  }

  // Check length
  if (inputStr.length > maxLength) {
    return {
      valid: false,
      sanitized: '',
      error: `Input exceeds maximum length of ${maxLength}`,
    };
  }

  if (inputStr.length < minLength) {
    return {
      valid: false,
      sanitized: '',
      error: `Input must be at least ${minLength} characters`,
    };
  }

  // Check for dangerous patterns
  const dangerousResult = checkDangerousPatterns(inputStr);
  if (!dangerousResult.safe) {
    return {
      valid: false,
      sanitized: '',
      error: dangerousResult.error,
    };
  }

  // Check custom blocked patterns
  for (const blockedPattern of blockedPatterns) {
    if (blockedPattern.test(inputStr)) {
      return {
        valid: false,
        sanitized: '',
        error: `Input matches blocked pattern: ${blockedPattern.source}`,
      };
    }
  }

  // Check custom pattern (if provided)
  if (pattern && !pattern.test(inputStr)) {
    return {
      valid: false,
      sanitized: '',
      error: `Input does not match required pattern: ${pattern.source}`,
    };
  }

  // Sanitize by escaping special characters
  const sanitized = escapeSpecialCharacters(inputStr);

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Check for dangerous command injection patterns
 *
 * @param input - User input string
 * @returns Safety check result
 */
function checkDangerousPatterns(input: string): { safe: boolean; error?: string } {
  // Command injection patterns
  const commandInjectionPatterns = [
    { pattern: /[;&|`$(){}[\]<>]/g, description: 'shell metacharacters' },
    { pattern: /\n|\r/g, description: 'newline characters' },
    { pattern: /\0/g, description: 'null bytes' },
  ];

  for (const { pattern, description } of commandInjectionPatterns) {
    if (pattern.test(input)) {
      return {
        safe: false,
        error: `Input contains ${description}`,
      };
    }
  }

  // Script injection patterns (for markdown/HTML contexts)
  const scriptInjectionPatterns = [
    { pattern: /<script[^>]*>/gi, description: 'script tags' },
    { pattern: /javascript:/gi, description: 'javascript: protocol' },
    { pattern: /on\w+\s*=/gi, description: 'event handlers (onclick, onload, etc.)' },
  ];

  for (const { pattern, description } of scriptInjectionPatterns) {
    if (pattern.test(input)) {
      return {
        safe: false,
        error: `Input contains ${description}`,
      };
    }
  }

  // SQL injection patterns (basic check)
  const sqlInjectionPatterns = [
    { pattern: /'\s*(OR|AND)\s*'?\d/gi, description: 'SQL injection (OR/AND)' },
    { pattern: /--/g, description: 'SQL comment' },
    { pattern: /;\s*DROP/gi, description: 'SQL DROP command' },
  ];

  for (const { pattern, description } of sqlInjectionPatterns) {
    if (pattern.test(input)) {
      return {
        safe: false,
        error: `Input contains ${description}`,
      };
    }
  }

  return { safe: true };
}

/**
 * Escape special characters for safe use
 *
 * @param input - Input string
 * @returns Escaped string
 */
function escapeSpecialCharacters(input: string): string {
  // HTML/XML special characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate feature name (alphanumeric, hyphens, underscores only)
 *
 * @param featureName - Feature name from user
 * @returns Validation result
 */
export function validateFeatureName(featureName: string): InputValidationResult {
  return validateCommandInput(featureName, {
    allowEmpty: false,
    maxLength: 100,
    minLength: 1,
    pattern: /^[a-zA-Z0-9_-]+$/,
  });
}

/**
 * Validate branch name (Git-safe branch names)
 *
 * @param branchName - Branch name from user
 * @returns Validation result
 */
export function validateBranchName(branchName: string): InputValidationResult {
  // Git branch naming rules
  const gitBranchPattern = /^[a-zA-Z0-9/_-]+$/;

  const blockedPatterns = [
    /^\./,      // Cannot start with .
    /\.\./, // Cannot contain ..
    /\/\//,     // Cannot contain //
    /@\{/,      // Cannot contain @{
    /\/$/,      // Cannot end with /
  ];

  return validateCommandInput(branchName, {
    allowEmpty: false,
    maxLength: 200,
    minLength: 1,
    pattern: gitBranchPattern,
    blockedPatterns,
  });
}

/**
 * Validate commit message
 *
 * @param message - Commit message from user
 * @returns Validation result
 */
export function validateCommitMessage(message: string): InputValidationResult {
  return validateCommandInput(message, {
    allowEmpty: false,
    maxLength: 500,
    minLength: 1,
  });
}

/**
 * Validate API key format
 *
 * @param apiKey - API key from user
 * @returns Validation result
 */
export function validateApiKey(apiKey: string): InputValidationResult {
  // API keys are typically base64 or hex strings
  const apiKeyPattern = /^[a-zA-Z0-9_-]+$/;

  return validateCommandInput(apiKey, {
    allowEmpty: false,
    maxLength: 256,
    minLength: 8,
    pattern: apiKeyPattern,
  });
}

/**
 * Validate spec ID format
 *
 * @param specId - Spec ID from user
 * @returns Validation result
 */
export function validateSpecId(specId: string): InputValidationResult {
  // Spec IDs: 001-feature-name
  const specIdPattern = /^\d{3}-[a-zA-Z0-9_-]+$/;

  return validateCommandInput(specId, {
    allowEmpty: false,
    maxLength: 100,
    minLength: 5,
    pattern: specIdPattern,
  });
}

/**
 * Sanitize for shell execution (when absolutely necessary)
 *
 * WARNING: This is NOT a complete solution. Prefer using child_process
 * with argument arrays instead of shell strings.
 *
 * @param input - User input for shell
 * @returns Escaped string safe for shell
 */
export function sanitizeForShell(input: string): string | null {
  // Block any shell metacharacters
  if (/[;&|`$(){}[\]<>\n\r\0\\]/.test(input)) {
    return null;
  }

  // Escape single quotes for bash
  return input.replace(/'/g, "'\\''");
}

/**
 * Validate and sanitize array of inputs
 *
 * @param inputs - Array of user inputs
 * @param options - Validation options
 * @returns Array of sanitized inputs (invalid inputs filtered out)
 */
export function sanitizeInputs(
  inputs: string[],
  options: ValidationOptions = {}
): string[] {
  return inputs
    .map((input) => sanitizeCommandInput(input, options))
    .filter((input): input is string => input !== null);
}

/**
 * Sanitize input or throw error
 *
 * @param input - User input
 * @param options - Validation options
 * @returns Sanitized input
 * @throws Error if input is invalid
 */
export function sanitizeInputOrThrow(
  input: string,
  options: ValidationOptions = {}
): string {
  const result = validateCommandInput(input, options);

  if (!result.valid) {
    throw new Error(`Invalid input: ${result.error}`);
  }

  return result.sanitized;
}
