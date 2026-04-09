import { describe, expect, it } from 'vitest';
import {
  assertNoExternalApiEndpoints,
  buildNoExternalApiPostureResponse,
} from '../../../extension/src/services/enterpriseai/contracts/ExternalApiPosture';

describe('enterpriseai external API none-required posture (root integration)', () => {
  it('validates EXT-001 no-external-endpoint request and response posture', () => {
    const validation = assertNoExternalApiEndpoints({
      featureId: '029-enterpriseai-student-vertical-builder',
      requestedAt: new Date().toISOString(),
      scope: 'internal-gofer-pipeline-only',
      publicConsumers: [],
    });

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    const response = buildNoExternalApiPostureResponse();
    expect(response.statusCode).toBe(200);
    expect(response.decision).toBe('no_external_api_endpoints');
    expect(response.externalEndpointCount).toBe(0);
    expect(response.contracts).toEqual(['internal-api.md', 'events.md']);
  });

  it('rejects EXT-001 posture when request implies external consumers', () => {
    const validation = assertNoExternalApiEndpoints({
      featureId: '029-enterpriseai-student-vertical-builder',
      requestedAt: new Date().toISOString(),
      scope: 'public-http-surface',
      publicConsumers: ['external-partner'],
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
