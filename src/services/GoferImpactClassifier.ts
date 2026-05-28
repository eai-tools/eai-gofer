import type { RepositoryAtlas } from './RepositoryAtlas.js';

export type GoferExecutionDepth = 'fast' | 'standard' | 'full';

export type GoferRiskLabel =
  | 'docs-only'
  | 'single-repo-code'
  | 'api-contract'
  | 'auth-security'
  | 'data-model'
  | 'infra-config'
  | 'release-critical'
  | 'unknown';

export interface GoferImpactClassification {
  depth: GoferExecutionDepth;
  confidence: 'low' | 'medium' | 'high';
  labels: GoferRiskLabel[];
  rationale: string[];
  recommendedArtifacts: string[];
}

const LABEL_RULES: Array<[GoferRiskLabel, RegExp]> = [
  ['docs-only', /\b(readme|docs?|documentation|copy|markdown|typo|changelog)\b/i],
  [
    'api-contract',
    /\b(api|endpoint|route|contract|schema|request|response|webhook|graphql|openapi)\b/i,
  ],
  [
    'auth-security',
    /\b(auth|login|permission|role|security|token|session|secret|tenant|policy)\b/i,
  ],
  ['data-model', /\b(database|migration|model|entity|table|collection|field|schema|seed)\b/i],
  ['infra-config', /\b(infra|terraform|bicep|cloud|deploy|pipeline|ci|cd|config|environment)\b/i],
  ['release-critical', /\b(release|rollback|flag|migration|backward compatible|breaking)\b/i],
  ['single-repo-code', /\b(component|function|class|service|helper|bug|feature|implementation)\b/i],
];

export function classifyGoferImpact(
  featurePrompt: string,
  atlas?: Pick<RepositoryAtlas, 'languages' | 'frameworks' | 'testCommands'>
): GoferImpactClassification {
  const prompt = featurePrompt.trim();
  const labels = new Set<GoferRiskLabel>();
  const rationale: string[] = [];

  for (const [label, pattern] of LABEL_RULES) {
    if (pattern.test(prompt)) {
      labels.add(label);
      rationale.push(`Prompt matched ${label} indicators.`);
    }
  }

  if (!labels.size) {
    labels.add('unknown');
    rationale.push('No strong repository surface indicators were found.');
  }

  if (labels.has('docs-only') && labels.size > 1) {
    labels.delete('docs-only');
  }

  const fullLabels: GoferRiskLabel[] = [
    'api-contract',
    'auth-security',
    'data-model',
    'infra-config',
    'release-critical',
    'unknown',
  ];

  const depth: GoferExecutionDepth =
    labels.size === 1 && labels.has('docs-only')
      ? 'fast'
      : [...labels].some((label) => fullLabels.includes(label))
        ? 'full'
        : 'standard';

  const recommendedArtifacts = ['research.md', 'proposal-review.md', 'spec.md'];
  if (depth !== 'fast') {
    recommendedArtifacts.push('plan.md', 'tasks.md', 'traceability.md');
  }
  if (depth === 'full') {
    recommendedArtifacts.push('blast-radius-report.md', 'validation-report.md');
  }
  if (atlas?.testCommands?.length) {
    recommendedArtifacts.push('test-evidence.md');
  }

  return {
    depth,
    confidence: labels.has('unknown') ? 'low' : labels.size > 1 ? 'medium' : 'high',
    labels: [...labels],
    rationale,
    recommendedArtifacts,
  };
}
