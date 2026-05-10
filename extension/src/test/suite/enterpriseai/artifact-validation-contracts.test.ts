import * as assert from 'assert';
import {
  validateMarketAnalysisArtifact,
  validateRunCompletionGates,
} from '../../../services/enterpriseai/validation/ArtifactSchemas';
import { validatePlaceholderConventions } from '../../../services/enterpriseai/validation/PlaceholderConventions';
import { validateSecretSafety } from '../../../services/enterpriseai/validation/SecretSafetyValidator';
import { type ArtifactRecord } from '../../../services/enterpriseai/models/Artifacts';

suite('enterpriseai artifact validation contracts', () => {
  test('accepts market-analysis payload with required gates', () => {
    const result = validateMarketAnalysisArtifact({
      runId: 'run_001',
      workflowProfile: 'enterpriseai',
      alternativeCount: 3,
      alternatives: ['option-a', 'option-b', 'option-c'],
      referencedInSpec: true,
      referencedInPlan: true,
      generatedAt: new Date().toISOString(),
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('rejects market-analysis payload that does not satisfy run-completion gates', () => {
    const result = validateMarketAnalysisArtifact({
      runId: 'run_001',
      workflowProfile: 'enterpriseai',
      alternativeCount: 2,
      alternatives: ['option-a', 'option-b'],
      referencedInSpec: false,
      referencedInPlan: false,
      generatedAt: new Date().toISOString(),
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((error) => error.includes('alternativeCount')));
    assert.ok(result.errors.some((error) => error.includes('referencedInSpec')));
    assert.ok(result.errors.some((error) => error.includes('referencedInPlan')));
  });

  test('enforces run completion gates from ArtifactRecord metadata', () => {
    const artifacts: readonly ArtifactRecord[] = [
      {
        artifactId: 'artifact_001',
        runId: 'run_001',
        stage: 'research',
        artifactType: 'market-analysis',
        filePath: '.specify/specs/029-enterpriseai-student-vertical-builder/market-analysis.md',
        profileContext: 'enterpriseai',
        generationStatus: 'validated',
        includesFallbackNotice: false,
        alternativeCount: 3,
        referencedInSpec: true,
        referencedInPlan: true,
        sourceReferenceIds: ['ref_001'],
        createdAt: new Date().toISOString(),
      },
    ];

    const result = validateRunCompletionGates(artifacts);
    assert.strictEqual(result.valid, true);
  });

  test('flags legacy placeholder formats and accepts standard runtime placeholders', () => {
    const invalidContent = '# Plan for [FEATURE]\\nInput: $ARGUMENTS\\n';
    const validContent = '# Plan for {{FEATURE_NAME}}\\nInput: {{USER_INPUT}}\\n';

    const invalidResult = validatePlaceholderConventions(invalidContent);
    const validResult = validatePlaceholderConventions(validContent);

    assert.strictEqual(invalidResult.valid, false);
    assert.strictEqual(validResult.valid, true);
  });

  test('flags secret-like content in generated artifacts', () => {
    const artifactContent = 'api_key=sk-live-super-secret\\nPASSWORD=supersecret123';
    const validation = validateSecretSafety(artifactContent);

    assert.strictEqual(validation.valid, false);
    assert.ok(validation.violations.length >= 1);
  });
});
