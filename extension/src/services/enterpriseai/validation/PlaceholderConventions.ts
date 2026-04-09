const RUNTIME_PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/g;
const ALL_DOUBLE_BRACE_PLACEHOLDERS_PATTERN = /\{\{[^}]+\}\}/g;

const LEGACY_RUNTIME_PLACEHOLDER_PATTERNS: ReadonlyArray<RegExp> = [
  /\[FEATURE(?: NAME)?\]/g,
  /\[###-feature-name\]/g,
  /\[###-feature\]/g,
  /\[DATE\]/g,
  /\$ARGUMENTS/g,
];

export interface PlaceholderConventionValidationResult {
  valid: boolean;
  placeholders: readonly string[];
  invalidPlaceholders: readonly string[];
  errors: readonly string[];
}

export function normalizeRuntimePlaceholder(name: string): string {
  const normalizedName = name
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return `{{${normalizedName}}}`;
}

export function extractRuntimePlaceholders(content: string): string[] {
  return content.match(RUNTIME_PLACEHOLDER_PATTERN) ?? [];
}

export function validatePlaceholderConventions(
  content: string
): PlaceholderConventionValidationResult {
  const placeholders = extractRuntimePlaceholders(content);
  const invalidPlaceholders: string[] = [];
  const errors: string[] = [];

  const allBracePlaceholders = content.match(ALL_DOUBLE_BRACE_PLACEHOLDERS_PATTERN) ?? [];
  for (const placeholder of allBracePlaceholders) {
    if (!/^\{\{[A-Z0-9_]+\}\}$/.test(placeholder)) {
      invalidPlaceholders.push(placeholder);
      errors.push(`Invalid runtime placeholder format: ${placeholder}`);
    }
  }

  for (const legacyPattern of LEGACY_RUNTIME_PLACEHOLDER_PATTERNS) {
    const matches = content.match(legacyPattern) ?? [];
    for (const match of matches) {
      invalidPlaceholders.push(match);
      errors.push(`Legacy runtime placeholder detected: ${match}`);
    }
  }

  return {
    valid: errors.length === 0,
    placeholders,
    invalidPlaceholders,
    errors,
  };
}
