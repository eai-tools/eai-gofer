const SECRET_PATTERNS: ReadonlyArray<{ ruleId: string; regex: RegExp; description: string }> = [
  {
    ruleId: 'generic-secret-assignment',
    regex:
      /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|credential)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{8,}/i,
    description: 'Potential credential or token assignment detected.',
  },
  {
    ruleId: 'aws-access-key',
    regex: /AKIA[0-9A-Z]{16}/,
    description: 'Potential AWS access key detected.',
  },
  {
    ruleId: 'private-key-block',
    regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/,
    description: 'Potential private key block detected.',
  },
];

const SAFE_PLACEHOLDER_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

export interface SecretSafetyViolation {
  line: number;
  ruleId: string;
  description: string;
  excerpt: string;
}

export interface SecretSafetyValidationResult {
  valid: boolean;
  violations: readonly SecretSafetyViolation[];
}

function containsOnlyPlaceholder(line: string): boolean {
  return (
    SAFE_PLACEHOLDER_PATTERN.test(line) &&
    !/[A-Za-z0-9]{12,}/.test(line.replace(SAFE_PLACEHOLDER_PATTERN, ''))
  );
}

export function findSecretSafetyViolations(content: string): SecretSafetyViolation[] {
  const violations: SecretSafetyViolation[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (containsOnlyPlaceholder(line)) {
      return;
    }

    for (const rule of SECRET_PATTERNS) {
      if (rule.regex.test(line)) {
        violations.push({
          line: index + 1,
          ruleId: rule.ruleId,
          description: rule.description,
          excerpt: line.trim().slice(0, 160),
        });
      }
    }
  });

  return violations;
}

export function validateSecretSafety(content: string): SecretSafetyValidationResult {
  const violations = findSecretSafetyViolations(content);

  return {
    valid: violations.length === 0,
    violations,
  };
}
