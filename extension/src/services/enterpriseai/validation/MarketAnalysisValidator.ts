export interface MarketAnalysisSummary {
  alternativeCount: number;
  referencedInSpec: boolean;
  referencedInPlan: boolean;
}

export interface MarketAnalysisValidationOptions {
  minimumAlternativeCount?: number;
  requireSpecAndPlanReferences?: boolean;
}

export interface MarketAnalysisValidationResult {
  valid: boolean;
  errors: string[];
}

const BASE_MINIMUM_ALTERNATIVE_COUNT = 3;

function resolveMinimumAlternativeCount(minimumAlternativeCount: number | undefined): number {
  if (typeof minimumAlternativeCount !== 'number' || Number.isNaN(minimumAlternativeCount)) {
    return BASE_MINIMUM_ALTERNATIVE_COUNT;
  }

  return Math.max(BASE_MINIMUM_ALTERNATIVE_COUNT, Math.floor(minimumAlternativeCount));
}

export function validateMarketAnalysisSummary(
  summary: MarketAnalysisSummary,
  options: MarketAnalysisValidationOptions = {}
): MarketAnalysisValidationResult {
  const errors: string[] = [];
  const minimumAlternativeCount = resolveMinimumAlternativeCount(options.minimumAlternativeCount);

  if (
    !Number.isInteger(summary.alternativeCount) ||
    summary.alternativeCount < minimumAlternativeCount
  ) {
    errors.push(`alternativeCount must be >= ${minimumAlternativeCount}.`);
  }

  const requireSpecAndPlanReferences = options.requireSpecAndPlanReferences ?? true;
  if (requireSpecAndPlanReferences && summary.referencedInSpec !== true) {
    errors.push('referencedInSpec must be true.');
  }

  if (requireSpecAndPlanReferences && summary.referencedInPlan !== true) {
    errors.push('referencedInPlan must be true.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
