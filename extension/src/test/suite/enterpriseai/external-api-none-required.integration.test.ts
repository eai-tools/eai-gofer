import * as assert from 'assert';
import {
  assertNoExternalApiEndpoints,
  buildNoExternalApiPostureResponse,
} from '../../../services/enterpriseai/contracts/ExternalApiPosture';

suite('enterpriseai external API none-required posture (extension integration)', () => {
  test('validates EXT-001 no-external-endpoint request and response posture', () => {
    const validation = assertNoExternalApiEndpoints({
      featureId: '029-enterpriseai-student-vertical-builder',
      requestedAt: new Date().toISOString(),
      scope: 'internal-gofer-pipeline-only',
      publicConsumers: [],
    });

    assert.strictEqual(validation.valid, true);
    assert.deepStrictEqual(validation.errors, []);

    const response = buildNoExternalApiPostureResponse();
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.decision, 'no_external_api_endpoints');
    assert.strictEqual(response.externalEndpointCount, 0);
    assert.deepStrictEqual(response.contracts, ['internal-api.md', 'events.md']);
  });

  test('rejects EXT-001 posture when request implies external consumers', () => {
    const validation = assertNoExternalApiEndpoints({
      featureId: '029-enterpriseai-student-vertical-builder',
      requestedAt: new Date().toISOString(),
      scope: 'public-http-surface',
      publicConsumers: ['external-partner'],
    });

    assert.strictEqual(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });
});
