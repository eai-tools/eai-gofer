export interface ExternalApiPostureRequest {
  featureId: string;
  requestedAt: string;
  scope: string;
  publicConsumers: readonly string[];
}

export interface ExternalApiPostureResponse {
  statusCode: 200;
  decision: 'no_external_api_endpoints';
  externalEndpointCount: 0;
  contracts: readonly ['internal-api.md', 'events.md'];
}

export interface ExternalApiPostureValidationResult {
  valid: boolean;
  errors: string[];
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function assertNoExternalApiEndpoints(
  request: ExternalApiPostureRequest
): ExternalApiPostureValidationResult {
  const errors: string[] = [];

  if (!request.featureId.trim()) {
    errors.push('featureId is required.');
  }

  if (!isIsoTimestamp(request.requestedAt)) {
    errors.push('requestedAt must be an ISO8601 timestamp.');
  }

  if (request.scope !== 'internal-gofer-pipeline-only') {
    errors.push('scope must be internal-gofer-pipeline-only.');
  }

  if (!Array.isArray(request.publicConsumers)) {
    errors.push('publicConsumers must be an array.');
  } else if (request.publicConsumers.length > 0) {
    errors.push('publicConsumers must be empty for EXT-001 posture.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildNoExternalApiPostureResponse(): ExternalApiPostureResponse {
  return {
    statusCode: 200,
    decision: 'no_external_api_endpoints',
    externalEndpointCount: 0,
    contracts: ['internal-api.md', 'events.md'],
  };
}
